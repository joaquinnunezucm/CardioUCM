const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configurar carpeta estática para servir imágenes y videos subidos
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Configurar multer para subida de imágenes y videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /gif|png|jpg|jpeg|mp4|mov/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (GIF, PNG, JPG, JPEG) o videos (MP4, MOV).'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB por archivo
});

// --- Middleware de AUTENTICACIÓN y AUTORIZACIÓN con JWT ---
const autenticarYAutorizar = (rolesPermitidos = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const tokenParts = authHeader.split(' ');
      if (tokenParts.length === 2 && tokenParts[0] === 'Bearer') {
        const token = tokenParts[1];

        jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
          if (err) {
            console.error("Error al verificar token JWT:", err.name, "-", err.message);
            if (err.name === 'TokenExpiredError') {
              return res.status(401).json({ message: "Token expirado. Por favor, inicie sesión de nuevo." });
            }
            return res.status(403).json({ message: "Token inválido o no autorizado." });
          }

          const rolesArray = Array.isArray(rolesPermitidos) ? rolesPermitidos : (rolesPermitidos ? [rolesPermitidos] : []);

          if (rolesArray.length > 0 && !rolesArray.includes(decodedUser.rol)) {
            console.warn(`Acceso denegado por rol. Usuario: ${decodedUser.email}, Rol: ${decodedUser.rol}, Roles requeridos: ${rolesArray.join(', ')}`);
            return res.status(403).json({ message: "Acceso denegado. No tiene los permisos necesarios." });
          }

          req.user = decodedUser;
          next();
        });
      } else {
        res.status(401).json({ message: "Formato de token inválido. Se espera 'Bearer <token>'." });
      }
    } else {
      res.status(401).json({ message: "No autenticado. Encabezado de autorización no encontrado." });
    }
  };
};

// Test de conexión
app.get('/ping', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1');
    res.json({ conectado: true, resultado: rows });
  } catch (error) {
    res.status(500).json({ conectado: false, error: error.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
  }
  try {
    const [rows] = await db.query('SELECT id, email, password as hashedPassword, nombre, rol FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Cuenta no registrada.' });
    }
    const user = rows[0];
    if (!user.hashedPassword) {
      console.error("Error crítico: Usuario sin contraseña hasheada en DB:", user.email);
      return res.status(500).json({ message: 'Error de configuración de cuenta. Contacte al administrador.' });
    }
    const passwordIsValid = await bcrypt.compare(password, user.hashedPassword);
    if (passwordIsValid) {
      if (user.rol === 'administrador' || user.rol === 'superadministrador') {
        const { hashedPassword, ...userData } = user;

        const tokenPayload = {
          id: userData.id,
          email: userData.email,
          nombre: userData.nombre,
          rol: userData.rol
        };
        const token = jwt.sign(
          tokenPayload,
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        return res.json({
          message: 'Login exitoso',
          usuario: userData,
          token: token
        });
      } else {
        return res.status(403).json({ message: 'No tiene permisos para acceder a esta área.' });
      }
    } else {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ message: 'Error interno en el servidor durante el login.' });
  }
});

// --- CRUD DE USUARIOS ---
const rolesAdminNivel = ['administrador', 'superadministrador'];

app.get('/api/usuarios', autenticarYAutorizar(['superadministrador']), async (req, res) => {
  console.log("Usuario autenticado para GET /api/usuarios:", req.user.email);
  try {
    const [rows] = await db.query('SELECT id, nombre, email, rol, fecha_creacion FROM usuarios ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener la lista de usuarios:', error);
    res.status(500).json({ message: 'Error interno al obtener la lista de usuarios.', detalle: error.message });
  }
});

app.post('/api/usuarios', autenticarYAutorizar(['superadministrador']), async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ message: "Todos los campos son requeridos (nombre, email, password, rol)." });
  }
  if (!['administrador', 'superadministrador', 'usuario'].includes(rol)) {
    return res.status(400).json({ message: "Rol inválido proporcionado." });
  }
  try {
    const [existingUser] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "El correo electrónico ya está registrado." });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol, fecha_creacion) VALUES (?, ?, ?, ?, NOW())',
      [nombre, email, hashedPassword, rol]
    );
    res.status(201).json({ message: 'Usuario creado exitosamente.', usuario: { id: result.insertId, nombre, email, rol } });
  } catch (error) {
    console.error("❌ Error al crear usuario:", error);
    res.status(500).json({ message: "Error interno al crear el usuario.", detalle: error.message });
  }
});

app.put('/api/usuarios/:id', autenticarYAutorizar(['superadministrador']), async (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol, password } = req.body;

  if (!nombre || !email || !rol) {
    return res.status(400).json({ message: "Nombre, email y rol son requeridos para la actualización." });
  }
  if (!['administrador', 'superadministrador', 'usuario'].includes(rol)) {
    return res.status(400).json({ message: "Rol inválido proporcionado." });
  }
  try {
    const [currentUser] = await db.query('SELECT email FROM usuarios WHERE id = ?', [id]);
    if (currentUser.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado para actualizar." });
    }
    if (email !== currentUser[0].email) {
      const [existingEmail] = await db.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id]);
      if (existingEmail.length > 0) {
        return res.status(409).json({ message: "El nuevo correo electrónico ya está en uso por otro usuario." });
      }
    }
    let queryParams = [nombre, email, rol];
    let sqlQuery = 'UPDATE usuarios SET nombre = ?, email = ?, rol = ?';
    if (password && password.trim() !== '') {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      sqlQuery += ', password = ?';
      queryParams.push(hashedPassword);
    }
    sqlQuery += ' WHERE id = ?';
    queryParams.push(id);
    const [result] = await db.query(sqlQuery, queryParams);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado o ningún dato fue modificado." });
    }
    res.json({ message: 'Usuario actualizado exitosamente.', usuario: { id: parseInt(id), nombre, email, rol } });
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", error);
    res.status(500).json({ message: "Error interno al actualizar el usuario.", detalle: error.message });
  }
});

app.delete('/api/usuarios/:id', autenticarYAutorizar(['superadministrador']), async (req, res) => {
  const { id } = req.params;
  if (req.user && req.user.id === parseInt(id) && req.user.rol === 'superadministrador') {
    return res.status(403).json({ message: "Un superadministrador no puede eliminarse a sí mismo." });
  }
  try {
    const [result] = await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    res.json({ message: 'Usuario eliminado exitosamente.' });
  } catch (error) {
    console.error("❌ Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error interno al eliminar el usuario.", detalle: error.message });
  }
});

// --- RUTAS DE DEAs ---
app.get('/defibriladores', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id_tramite AS id, gl_nombre_fantasia AS nombre, CONCAT(gl_instalacion_calle, ' ', IFNULL(nr_instalacion_numero, ''), ', ', gl_instalacion_comuna) AS direccion, gl_instalacion_latitud AS lat, gl_instalacion_longitud AS lng FROM tramites WHERE bo_activo = 1 AND bo_eliminado = 'N'");
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener desfibriladores:', error);
    res.status(500).json({ mensaje: 'Error al obtener datos desde la base' });
  }
});

app.post('/solicitudes-dea', async (req, res) => {
  const { nombre, gl_instalacion_calle, nr_instalacion_numero, gl_instalacion_comuna, lat, lng, solicitante, rut } = req.body;
  if (!nombre || !gl_instalacion_calle || !gl_instalacion_comuna || !lat || !lng || !solicitante || !rut) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
  }
  const valoresParaInsertar = [nombre, gl_instalacion_calle, (nr_instalacion_numero && nr_instalacion_numero.trim() !== '') ? nr_instalacion_numero.trim() : null, gl_instalacion_comuna, lat, lng, solicitante, rut];
  try {
    const sqlQuery = `INSERT INTO tramites (gl_nombre_fantasia, gl_instalacion_calle, nr_instalacion_numero, gl_instalacion_comuna, gl_instalacion_latitud, gl_instalacion_longitud, gl_solicitante_nombre, gl_solicitante_rut, bo_activo, bo_eliminado, fc_creacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'N', NOW())`;
    const [result] = await db.query(sqlQuery, valoresParaInsertar);
    res.status(201).json({ mensaje: 'Solicitud de DEA registrada.', solicitud_creada_id: result.insertId });
  } catch (error) {
    console.error("❌ ERROR AL INSERTAR SOLICITUD DE DEA:", error);
    res.status(500).json({ mensaje: 'Error al guardar la solicitud', detalle: error.message });
  }
});

app.get('/solicitudes-dea', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id_tramite AS id, gl_nombre_fantasia AS nombre, CONCAT(gl_instalacion_calle, ' ', IFNULL(nr_instalacion_numero, ''), ', ', gl_instalacion_comuna) AS direccion_completa, gl_instalacion_calle, nr_instalacion_numero, gl_instalacion_comuna, gl_instalacion_latitud AS lat, gl_instalacion_longitud AS lng, gl_solicitante_nombre AS solicitante, gl_solicitante_rut AS rut, fc_creacion FROM tramites WHERE bo_activo = 0 AND bo_eliminado = 'N' ORDER BY fc_creacion DESC`);
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener solicitudes pendientes:', error);
    res.status(500).json({ mensaje: 'Error al obtener datos de solicitudes' });
  }
});

app.post('/solicitudes-dea/:id/aprobar', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("UPDATE tramites SET bo_activo = 1, fc_actualiza = NOW() WHERE id_tramite = ? AND bo_activo = 0 AND bo_eliminado = 'N'", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Solicitud no encontrada o ya procesada.' });
    res.json({ mensaje: 'Solicitud de DEA aprobada.' });
  } catch (error) {
    console.error('❌ Error al aprobar solicitud:', error);
    res.status(500).json({ mensaje: 'Error al aprobar la solicitud.' });
  }
});

app.delete('/solicitudes-dea/:id/rechazar', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM tramites WHERE id_tramite = ? AND bo_activo = 0 AND bo_eliminado = 'N'", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Solicitud no encontrada o ya procesada.' });
    res.json({ mensaje: 'Solicitud de DEA rechazada.' });
  } catch (error) {
    console.error('❌ Error al rechazar solicitud:', error);
    res.status(500).json({ mensaje: 'Error al rechazar la solicitud.' });
  }
});

// Estadísticas Dashboard
app.get('/api/estadisticas', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [visitasResult] = await db.query("SELECT COUNT(*) as totalVisitas FROM clicks WHERE seccion = 'VisitaHomePage'");
    const totalVisitas = visitasResult[0]?.totalVisitas || 0;
    const [deasActivosResult] = await db.query("SELECT COUNT(*) as totalDeasActivos FROM tramites WHERE bo_activo = 1 AND bo_eliminado = 'N'");
    const totalDeasActivos = deasActivosResult[0]?.totalDeasActivos || 0;
    const totalEmergencias = 0;
    res.json({ visitasPagina: totalVisitas, deasRegistrados: totalDeasActivos, emergenciasEsteMes: totalEmergencias });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas' });
  }
});

// --- CRUD DE FAQs ---
app.get('/api/faqs', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, pregunta, respuesta, categoria, orden FROM faqs ORDER BY orden ASC, id ASC');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener FAQs:', error);
    res.status(500).json({ message: 'Error interno al obtener las FAQs.', detalle: error.message });
  }
});

app.get('/api/admin/faqs', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, pregunta, respuesta, categoria, orden, fecha_creacion, fecha_actualizacion FROM faqs ORDER BY orden ASC, id ASC');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener FAQs para admin:', error);
    res.status(500).json({ message: 'Error interno al obtener las FAQs para admin.', detalle: error.message });
  }
});

app.post('/api/faqs', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { pregunta, respuesta, categoria, orden } = req.body;

  if (!pregunta || !respuesta) {
    return res.status(400).json({ message: "La pregunta y la respuesta son requeridas." });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO faqs (pregunta, respuesta, categoria, orden) VALUES (?, ?, ?, ?)',
      [pregunta, respuesta, categoria || null, orden || 0]
    );
    res.status(201).json({ message: 'FAQ creada exitosamente.', faq: { id: result.insertId, pregunta, respuesta, categoria, orden } });
  } catch (error) {
    console.error("❌ Error al crear FAQ:", error);
    res.status(500).json({ message: "Error interno al crear la FAQ.", detalle: error.message });
  }
});

app.put('/api/faqs/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;
  const { pregunta, respuesta, categoria, orden } = req.body;

  if (!pregunta || !respuesta) {
    return res.status(400).json({ message: "La pregunta y la respuesta son requeridas." });
  }

  try {
    const [result] = await db.query(
      'UPDATE faqs SET pregunta = ?, respuesta = ?, categoria = ?, orden = ? WHERE id = ?',
      [pregunta, respuesta, categoria || null, orden || 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "FAQ no encontrada o datos sin cambios." });
    }
    res.json({ message: 'FAQ actualizada exitosamente.', faq: { id: parseInt(id), pregunta, respuesta, categoria, orden } });
  } catch (error) {
    console.error("❌ Error al actualizar FAQ:", error);
    res.status(500).json({ message: "Error interno al actualizar la FAQ.", detalle: error.message });
  }
});

app.delete('/api/faqs/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM faqs WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "FAQ no encontrada." });
    }
    res.json({ message: 'FAQ eliminada exitosamente.' });
  } catch (error) {
    console.error("❌ Error al eliminar FAQ:", error);
    res.status(500).json({ message: "Error interno al eliminar la FAQ.", detalle: error.message });
  }
});

// --- CRUD DE CONTENIDO EDUCATIVO ---
// Obtener contenido educativo público
app.get('/api/educacion', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, categoria_id, categoria_nombre, titulo_tema, contenido_tema, orden_categoria, orden_item 
       FROM educacion_contenido 
       WHERE activo = TRUE 
       ORDER BY orden_categoria ASC, orden_item ASC, id ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener contenido educativo público:', error);
    res.status(500).json({ message: 'Error interno al obtener el contenido educativo.', detalle: error.message });
  }
});

// Nuevo endpoint para obtener medios asociados (imágenes y videos)
app.get('/api/educacion/medios', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, contenido_id, tipo_medio, url_medio, orden, paso_asociado 
       FROM educacion_medios 
       ORDER BY contenido_id, orden ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener medios de contenido educativo:', error);
    res.status(500).json({ message: 'Error interno al obtener los medios.', detalle: error.message });
  }
});

// Obtener contenido educativo para admin
app.get('/api/admin/educacion', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, categoria_id, categoria_nombre, titulo_tema, contenido_tema, orden_categoria, orden_item, activo, created_at, updated_at 
       FROM educacion_contenido 
       ORDER BY orden_categoria ASC, orden_item ASC, id ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener contenido educativo para admin:', error);
    res.status(500).json({ message: 'Error interno al obtener el contenido educativo para admin.', detalle: error.message });
  }
});

// Crear contenido educativo con soporte para medios múltiples
app.post('/api/admin/educacion', autenticarYAutorizar(rolesAdminNivel), upload.array('medios', 10), async (req, res) => {
  const {
    categoria_id,
    categoria_nombre,
    titulo_tema,
    contenido_tema,
    orden_categoria,
    orden_item,
    activo,
    paso_asociado
  } = req.body;

  if (!categoria_id || !categoria_nombre || !titulo_tema || !contenido_tema) {
    // Eliminar archivos subidos si hay error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlinkSync(path.join(__dirname, 'public/uploads', file.filename));
      });
    }
    return res.status(400).json({ message: "Los campos: ID de categoría, nombre de categoría, título del tema y contenido del tema son requeridos." });
  }

  try {
    // Insertar el contenido educativo
    const [result] = await db.query(
      'INSERT INTO educacion_contenido (categoria_id, categoria_nombre, titulo_tema, contenido_tema, orden_categoria, orden_item, activo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [
        categoria_id,
        categoria_nombre,
        titulo_tema,
        contenido_tema,
        orden_categoria || 0,
        orden_item || 0,
        activo !== undefined ? (typeof activo === 'string' ? activo === 'true' : Boolean(activo)) : true
      ]
    );

    const contenidoId = result.insertId;

    // Insertar medios asociados si existen
    if (req.files && req.files.length > 0) {
      const medios = req.files.map((file, index) => ({
        contenido_id: contenidoId,
        tipo_medio: file.mimetype.includes('video') ? 'video' : 'imagen',
        url_medio: `/uploads/${file.filename}`,
        orden: index,
        paso_asociado: paso_asociado || null,
      }));

      for (const medio of medios) {
        await db.query(
          'INSERT INTO educacion_medios (contenido_id, tipo_medio, url_medio, orden, paso_asociado, fecha_creacion) VALUES (?, ?, ?, ?, ?, NOW())',
          [medio.contenido_id, medio.tipo_medio, medio.url_medio, medio.orden, medio.paso_asociado]
        );
      }
    }

    res.status(201).json({
      message: 'Contenido educativo creado exitosamente.',
      item: {
        id: contenidoId,
        categoria_id,
        categoria_nombre,
        titulo_tema,
        contenido_tema,
        orden_categoria: orden_categoria || 0,
        orden_item: orden_item || 0,
        activo: activo !== undefined ? (typeof activo === 'string' ? activo === 'true' : Boolean(activo)) : true
      }
    });
  } catch (error) {
    // Eliminar archivos subidos si hay error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlinkSync(path.join(__dirname, 'public/uploads', file.filename));
      });
    }
    console.error("❌ Error al crear contenido educativo:", error);
    res.status(500).json({ message: "Error interno al crear el contenido educativo.", detalle: error.message });
  }
});

// Actualizar contenido educativo con soporte para medios múltiples
app.put('/api/admin/educacion/:id', autenticarYAutorizar(rolesAdminNivel), upload.array('medios', 10), async (req, res) => {
  const { id } = req.params;
  const {
    categoria_id,
    categoria_nombre,
    titulo_tema,
    contenido_tema,
    orden_categoria,
    orden_item,
    activo,
    paso_asociado
  } = req.body;

  if (!categoria_id || !categoria_nombre || !titulo_tema || !contenido_tema) {
    if (req.files) {
      req.files.forEach(file => {
        fs.unlinkSync(path.join(__dirname, 'public/uploads', file.filename));
      });
    }
    return res.status(400).json({ message: "Los campos: ID de categoría, nombre de categoría, título del tema y contenido del tema son requeridos." });
  }

  try {
    // Verificar si el contenido existe
    const [existing] = await db.query('SELECT id FROM educacion_contenido WHERE id = ?', [id]);
    if (existing.length === 0) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(__dirname, 'public/uploads', file.filename));
        });
      }
      return res.status(404).json({ message: "Contenido educativo no encontrado." });
    }

    // Actualizar el contenido educativo
    const [result] = await db.query(
      `UPDATE educacion_contenido
       SET categoria_id = ?, categoria_nombre = ?, titulo_tema = ?, contenido_tema = ?,
           orden_categoria = ?, orden_item = ?, activo = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        categoria_id,
        categoria_nombre,
        titulo_tema,
        contenido_tema,
        orden_categoria || 0,
        orden_item || 0,
        activo !== undefined ? (typeof activo === 'string' ? activo === 'true' : Boolean(activo)) : true,
        id
      ]
    );

    if (result.affectedRows === 0) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(__dirname, 'public/uploads', file.filename));
        });
      }
      return res.status(404).json({ message: "Contenido educativo no encontrado o datos sin cambios." });
    }

    // Si se subieron nuevos medios, eliminar los anteriores y agregar los nuevos
    if (req.files && req.files.length > 0) {
      // Obtener medios existentes
      const [existingMedios] = await db.query('SELECT url_medio FROM educacion_medios WHERE contenido_id = ?', [id]);
      // Eliminar archivos físicos
      existingMedios.forEach(medio => {
        const filePath = path.join(__dirname, 'public', medio.url_medio);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      // Eliminar registros de medios en la base de datos
      await db.query('DELETE FROM educacion_medios WHERE contenido_id = ?', [id]);

      // Insertar nuevos medios
      const medios = req.files.map((file, index) => ({
        contenido_id: id,
        tipo_medio: file.mimetype.includes('video') ? 'video' : 'imagen',
        url_medio: `/uploads/${file.filename}`,
        orden: index,
        paso_asociado: paso_asociado || null,
      }));

      for (const medio of medios) {
        await db.query(
          'INSERT INTO educacion_medios (contenido_id, tipo_medio, url_medio, orden, paso_asociado, fecha_creacion) VALUES (?, ?, ?, ?, ?, NOW())',
          [medio.contenido_id, medio.tipo_medio, medio.url_medio, medio.orden, medio.paso_asociado]
        );
      }
    }

    res.json({
      message: 'Contenido educativo actualizado exitosamente.',
      item: {
        id: parseInt(id),
        categoria_id,
        categoria_nombre,
        titulo_tema,
        contenido_tema,
        orden_categoria: orden_categoria || 0,
        orden_item: orden_item || 0,
        activo: activo !== undefined ? (typeof activo === 'string' ? activo === 'true' : Boolean(activo)) : true
      }
    });
  } catch (error) {
    if (req.files) {
      req.files.forEach(file => {
        fs.unlinkSync(path.join(__dirname, 'public/uploads', file.filename));
      });
    }
    console.error("❌ Error al actualizar contenido educativo:", error);
    res.status(500).json({ message: "Error interno al actualizar el contenido educativo.", detalle: error.message });
  }
});

// Eliminar contenido educativo y sus medios asociados
app.delete('/api/admin/educacion/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener medios asociados para eliminar los archivos físicos
    const [medios] = await db.query('SELECT url_medio FROM educacion_medios WHERE contenido_id = ?', [id]);
    medios.forEach(medio => {
      const filePath = path.join(__dirname, 'public', medio.url_medio);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Eliminar el contenido educativo (los medios se eliminarán automáticamente por la restricción ON DELETE CASCADE)
    const [result] = await db.query('DELETE FROM educacion_contenido WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Contenido educativo no encontrado." });
    }
    res.json({ message: 'Contenido educativo eliminado exitosamente.' });
  } catch (error) {
    console.error("❌ Error al eliminar contenido educativo:", error);
    res.status(500).json({ message: "Error interno al eliminar el contenido educativo.", detalle: error.message });
  }
});

// --- CRUD DE RCP INSTRUCCIONES ---
app.get('/api/rcp', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, instruccion, gif_url, orden, categoria FROM rcp_instrucciones ORDER BY orden ASC, id ASC');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener instrucciones RCP:', error);
    res.status(500).json({ message: 'Error interno al obtener las instrucciones RCP.', detalle: error.message });
  }
});

app.get('/api/admin/rcp', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, instruccion, gif_url, orden, categoria, fecha_creacion, fecha_actualizacion FROM rcp_instrucciones ORDER BY orden ASC, id ASC');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener instrucciones RCP para admin:', error);
    res.status(500).json({ message: 'Error interno al obtener las instrucciones RCP para admin.', detalle: error.message });
  }
});

app.post('/api/admin/rcp', autenticarYAutorizar(rolesAdminNivel), upload.single('gif'), async (req, res) => {
  const { instruccion, orden, categoria } = req.body;
  const gif_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!instruccion) {
    if (req.file) {
      fs.unlinkSync(path.join(__dirname, 'public/uploads', req.file.filename));
    }
    return res.status(400).json({ message: "La instrucción es requerida." });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO rcp_instrucciones (instruccion, gif_url, orden, categoria, fecha_creacion) VALUES (?, ?, ?, ?, NOW())',
      [instruccion, gif_url, orden || 0, categoria || 'RCP Adultos']
    );
    res.status(201).json({
      message: 'Instrucción RCP creada exitosamente.',
      instruccion: { id: result.insertId, instruccion, gif_url, orden: orden || 0, categoria: categoria || 'RCP Adultos' }
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(path.join(__dirname, 'public/uploads', req.file.filename));
    }
    console.error("❌ Error al crear instrucción RCP:", error);
    res.status(500).json({ message: "Error interno al crear la instrucción RCP.", detalle: error.message });
  }
});

app.put('/api/admin/rcp/:id', autenticarYAutorizar(rolesAdminNivel), upload.single('gif'), async (req, res) => {
  const { id } = req.params;
  const { instruccion, orden, categoria } = req.body;
  const new_gif_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!instruccion) {
    if (new_gif_url) {
      fs.unlinkSync(path.join(__dirname, 'public/uploads', req.file.filename));
    }
    return res.status(400).json({ message: "La instrucción es requerida." });
  }

  try {
    const [existing] = await db.query('SELECT gif_url FROM rcp_instrucciones WHERE id = ?', [id]);
    if (existing.length === 0) {
      if (new_gif_url) {
        fs.unlinkSync(path.join(__dirname, 'public/uploads', req.file.filename));
      }
      return res.status(404).json({ message: "Instrucción RCP no encontrada." });
    }

    let gif_url = existing[0].gif_url;
    if (new_gif_url) {
      if (gif_url) {
        const oldFilePath = path.join(__dirname, 'public', gif_url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      gif_url = new_gif_url;
    }

    const [result] = await db.query(
      'UPDATE rcp_instrucciones SET instruccion = ?, gif_url = ?, orden = ?, categoria = ?, fecha_actualizacion = NOW() WHERE id = ?',
      [instruccion, gif_url, orden || 0, categoria || 'RCP Adultos', id]
    );

    if (result.affectedRows === 0) {
      if (new_gif_url) {
        fs.unlinkSync(path.join(__dirname, 'public/uploads', req.file.filename));
      }
      return res.status(404).json({ message: "Instrucción RCP no encontrada o datos sin cambios." });
    }
    res.json({
      message: 'Instrucción RCP actualizada exitosamente.',
      instruccion: { id: parseInt(id), instruccion, gif_url, orden: orden || 0, categoria: categoria || 'RCP Adultos' }
    });
  } catch (error) {
    if (new_gif_url) {
      fs.unlinkSync(path.join(__dirname, 'public/uploads', req.file.filename));
    }
    console.error("❌ Error al actualizar instrucción RCP:", error);
    res.status(500).json({ message: "Error interno al actualizar la instrucción RCP.", detalle: error.message });
  }
});

app.delete('/api/admin/rcp/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.query('SELECT gif_url FROM rcp_instrucciones WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Instrucción RCP no encontrada." });
    }

    if (existing[0].gif_url) {
      const filePath = path.join(__dirname, 'public', existing[0].gif_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const [result] = await db.query('DELETE FROM rcp_instrucciones WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Instrucción RCP no encontrada." });
    }
    res.json({ message: 'Instrucción RCP eliminada exitosamente.' });
  } catch (error) {
    console.error("❌ Error al eliminar instrucción RCP:", error);
    res.status(500).json({ message: "Error interno al eliminar la instrucción RCP.", detalle: error.message });
  }
});

// Clicks API
app.post('/api/registro-clic', async (req, res) => {
  const { seccion } = req.body;
  if (!seccion) return res.status(400).json({ mensaje: 'Sección requerida' });
  try {
    await db.query('INSERT INTO clicks (seccion, fecha) VALUES (?, NOW())', [seccion]);
    res.json({ mensaje: 'Clic registrado' });
  } catch (error) {
    console.error('❌ Error al registrar clic:', error);
    res.status(500).json({ mensaje: 'Error al registrar clic' });
  }
});

app.get('/api/obtener-clics', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [resultados] = await db.query(`SELECT seccion, COUNT(*) as cantidad FROM clicks GROUP BY seccion`);
    const data = {};
    resultados.forEach(r => { data[r.seccion] = r.cantidad; });
    res.json(data);
  } catch (error) {
    console.error('❌ Error al obtener clics:', error);
    res.status(500).json({ mensaje: 'Error al obtener datos' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
});