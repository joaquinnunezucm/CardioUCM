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

/// --- RUTAS DE CONTENIDO EDUCATIVO ---

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
    res.status(500).json({ message: 'Error interno al obtener el contenido.', detalle: error.message });
  }
});

// Obtener medios asociados (imágenes y videos) - PÚBLICO (DEBE INCLUIR subtitulo_medio)
app.get('/api/educacion/medios', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, contenido_id, tipo_medio, url_medio, orden, paso_asociado, subtitulo_medio 
       FROM educacion_medios 
       ORDER BY contenido_id, orden ASC` // Asegurar orden
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
    res.status(500).json({ message: 'Error interno al obtener el contenido para admin.', detalle: error.message });
  }
});

// Crear contenido educativo
app.post('/api/admin/educacion', autenticarYAutorizar(rolesAdminNivel), upload.array('medios', 10), async (req, res) => {
  const {
    categoria_id, categoria_nombre, titulo_tema, contenido_tema,
    orden_categoria, orden_item, activo
  } = req.body;

  const pasosAsociadosMedios = req.body.pasos_asociados_medios ? JSON.parse(req.body.pasos_asociados_medios) : [];
  const subtitulosMedios = req.body.subtitulos_medios ? JSON.parse(req.body.subtitulos_medios) : [];
  const ordenesMedios = req.body.ordenes_medios ? JSON.parse(req.body.ordenes_medios) : [];

  if (!categoria_id || !categoria_nombre || !titulo_tema || !contenido_tema) {
    if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
    return res.status(400).json({ message: "Campos principales (categoría, título, contenido) son requeridos." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [resultContenido] = await connection.query(
      'INSERT INTO educacion_contenido (categoria_id, categoria_nombre, titulo_tema, contenido_tema, orden_categoria, orden_item, activo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [categoria_id, categoria_nombre, titulo_tema, contenido_tema, parseInt(orden_categoria) || 0, parseInt(orden_item) || 0, (activo === 'true' || activo === true)]
    );
    const contenidoId = resultContenido.insertId;

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const pasoAsociado = (pasosAsociadosMedios[i] && pasosAsociadosMedios[i].trim() !== '') ? pasosAsociadosMedios[i].trim() : null;
        const subtitulo = (subtitulosMedios[i] && subtitulosMedios[i].trim() !== '') ? subtitulosMedios[i].trim() : null;
        const orden = (ordenesMedios[i] !== undefined && ordenesMedios[i] !== null) ? parseInt(ordenesMedios[i]) : i;
        await connection.query(
          'INSERT INTO educacion_medios (contenido_id, tipo_medio, url_medio, orden, paso_asociado, subtitulo_medio, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [contenidoId, file.mimetype.includes('video') ? 'video' : 'imagen', `/uploads/${file.filename}`, orden, pasoAsociado, subtitulo]
        );
      }
    }
    await connection.commit();
    res.status(201).json({ message: 'Contenido educativo creado exitosamente.', item: { id: contenidoId, titulo_tema } });
  } catch (error) {
    if (connection) await connection.rollback();
    if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
    console.error("❌ Error al crear contenido educativo:", error);
    res.status(500).json({ message: "Error interno al crear el contenido.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Actualizar contenido educativo
app.put('/api/admin/educacion/:id', autenticarYAutorizar(rolesAdminNivel), upload.array('medios', 10), async (req, res) => {
  const { id } = req.params;
  const {
    categoria_id, categoria_nombre, titulo_tema, contenido_tema,
    orden_categoria, orden_item, activo,
    medios_existentes_ids_a_conservar
  } = req.body;

  const pasosAsociadosNuevosMedios = req.body.pasos_asociados_nuevos_medios ? JSON.parse(req.body.pasos_asociados_nuevos_medios) : [];
  const subtitulosNuevosMedios = req.body.subtitulos_nuevos_medios ? JSON.parse(req.body.subtitulos_nuevos_medios) : [];
  const ordenesNuevosMedios = req.body.ordenes_nuevos_medios ? JSON.parse(req.body.ordenes_nuevos_medios) : [];
  const datosMediosExistentes = req.body.datos_medios_existentes ? JSON.parse(req.body.datos_medios_existentes) : {};
  const idsAConservar = medios_existentes_ids_a_conservar ? JSON.parse(medios_existentes_ids_a_conservar) : [];

  if (!categoria_id || !categoria_nombre || !titulo_tema || !contenido_tema) {
    if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
    return res.status(400).json({ message: "Campos principales requeridos." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT id FROM educacion_contenido WHERE id = ?', [id]);
    if (existing.length === 0) {
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      await connection.rollback();
      return res.status(404).json({ message: "Contenido educativo no encontrado." });
    }

    await connection.query(
      'UPDATE educacion_contenido SET categoria_id = ?, categoria_nombre = ?, titulo_tema = ?, contenido_tema = ?, orden_categoria = ?, orden_item = ?, activo = ?, updated_at = NOW() WHERE id = ?',
      [categoria_id.trim(), categoria_nombre.trim(), titulo_tema.trim(), contenido_tema.trim(), parseInt(orden_categoria) || 0, parseInt(orden_item) || 0, (activo === 'true' || activo === true), id]
    );

    const [mediosActualesDB] = await connection.query('SELECT id, url_medio FROM educacion_medios WHERE contenido_id = ?', [id]);
    const mediosAEliminarDB = mediosActualesDB.filter(medioDB => !idsAConservar.includes(medioDB.id.toString()));

    for (const medioDB of mediosAEliminarDB) {
      const filePath = path.join(__dirname, 'public', medioDB.url_medio);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await connection.query('DELETE FROM educacion_medios WHERE id = ?', [medioDB.id]);
    }

    for (const medioIdStr in datosMediosExistentes) {
      if (idsAConservar.includes(medioIdStr)) {
        const datos = datosMediosExistentes[medioIdStr];
        await connection.query(
          'UPDATE educacion_medios SET paso_asociado = ?, subtitulo_medio = ?, orden = ? WHERE id = ? AND contenido_id = ?',
          [datos.paso_asociado || null, datos.subtitulo_medio || null, datos.orden || 0, parseInt(medioIdStr), id]
        );
      }
    }

    if (req.files && req.files.length > 0) {
      const [maxOrdenResult] = await connection.query('SELECT MAX(orden) as max_orden FROM educacion_medios WHERE contenido_id = ?', [id]);
      let proximoOrden = (maxOrdenResult[0]?.max_orden !== null) ? maxOrdenResult[0].max_orden + 1 : 0;

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const pasoAsociado = (pasosAsociadosNuevosMedios[i] && pasosAsociadosNuevosMedios[i].trim() !== '') ? pasosAsociadosNuevosMedios[i].trim() : null;
        const subtitulo = (subtitulosNuevosMedios[i] && subtitulosNuevosMedios[i].trim() !== '') ? subtitulosNuevosMedios[i].trim() : null;
        const orden = (ordenesNuevosMedios[i] !== undefined && ordenesNuevosMedios[i] !== null) ? parseInt(ordenesNuevosMedios[i]) : proximoOrden + i;
        await connection.query(
          'INSERT INTO educacion_medios (contenido_id, tipo_medio, url_medio, orden, paso_asociado, subtitulo_medio, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [id, file.mimetype.includes('video') ? 'video' : 'imagen', `/uploads/${file.filename}`, orden, pasoAsociado, subtitulo]
        );
      }
    }

    await connection.commit();
    res.json({ message: 'Contenido educativo actualizado exitosamente.', item: { id: parseInt(id), titulo_tema } });
  } catch (error) {
    if (connection) await connection.rollback();
    if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
    console.error("❌ Error al actualizar contenido educativo:", error);
    res.status(500).json({ message: "Error interno al actualizar el contenido.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Eliminar contenido educativo
app.delete('/api/admin/educacion/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [medios] = await connection.query('SELECT url_medio FROM educacion_medios WHERE contenido_id = ?', [id]);
    for (const medio of medios) {
      const filePath = path.join(__dirname, 'public', medio.url_medio);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    // La BD debería tener ON DELETE CASCADE para educacion_medios cuando se borra de educacion_contenido
    // Si no, hay que borrar explícitamente de educacion_medios primero.
    // Asumiendo que está configurado:
    const [result] = await connection.query('DELETE FROM educacion_contenido WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Contenido educativo no encontrado." });
    }
    await connection.commit();
    res.json({ message: 'Contenido educativo eliminado exitosamente.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error al eliminar contenido educativo:", error);
    res.status(500).json({ message: "Error interno al eliminar el contenido.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});
// --- CRUD DE RCP INSTRUCCIONES ---

// Obtener instrucciones RCP con sus medios asociados para usuarios generales (PÚBLICO)
// Esta ruta no necesita autenticación ni maneja subida de archivos, solo lectura.
app.get('/api/rcp', async (req, res) => { // async es bueno para consistencia y si db.query es asíncrono
  try {
    // El query original ya agrupa y ordena bien, pero puedes simplificar el reduce
    // si tu base de datos y versión de MySQL soportan JSON_ARRAYAGG y JSON_OBJECT
    // Por ahora, mantenemos tu lógica de reduce que es funcional.
    const [rows] = await db.query(`
      SELECT 
        ri.id, ri.instruccion, ri.orden, ri.categoria, ri.fecha_creacion, ri.fecha_actualizacion,
        rm.id AS medio_id, rm.url_medio, rm.subtitulo, rm.paso_asociado, rm.orden AS medio_orden, rm.tipo_medio
      FROM rcp_instrucciones ri
      LEFT JOIN rcp_medios rm ON ri.id = rm.instruccion_id
      ORDER BY ri.orden ASC, ri.id ASC, rm.orden ASC
    `);

    const instruccionesConMedios = {};
    rows.forEach(row => {
      if (!instruccionesConMedios[row.id]) {
        instruccionesConMedios[row.id] = {
          id: row.id,
          instruccion: row.instruccion,
          orden: row.orden,
          categoria: row.categoria,
          fecha_creacion: row.fecha_creacion,
          fecha_actualizacion: row.fecha_actualizacion,
          medios: [],
        };
      }
      if (row.medio_id) {
        instruccionesConMedios[row.id].medios.push({
          id: row.medio_id,
          url_medio: row.url_medio,
          subtitulo: row.subtitulo,
          paso_asociado: row.paso_asociado,
          orden: row.medio_orden,
          tipo_medio: row.tipo_medio,
        });
      }
    });
    res.json(Object.values(instruccionesConMedios));
  } catch (error) {
    console.error('❌ Error al obtener instrucciones RCP:', error);
    res.status(500).json({ message: 'Error interno al obtener las instrucciones RCP.', detalle: error.message });
  }
});

// Obtener instrucciones RCP con sus medios asociados para administradores (ADMIN)
// Similar a la pública, pero con autenticación.
app.get('/api/admin/rcp', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        ri.id, ri.instruccion, ri.orden, ri.categoria, ri.fecha_creacion, ri.fecha_actualizacion,
        rm.id AS medio_id, rm.url_medio, rm.subtitulo, rm.paso_asociado, rm.orden AS medio_orden, rm.tipo_medio
      FROM rcp_instrucciones ri
      LEFT JOIN rcp_medios rm ON ri.id = rm.instruccion_id
      ORDER BY ri.orden ASC, ri.id ASC, rm.orden ASC
    `);

    const instruccionesConMedios = {};
    rows.forEach(row => {
      if (!instruccionesConMedios[row.id]) {
        instruccionesConMedios[row.id] = {
          id: row.id,
          instruccion: row.instruccion,
          orden: row.orden,
          categoria: row.categoria,
          fecha_creacion: row.fecha_creacion,
          fecha_actualizacion: row.fecha_actualizacion,
          medios: [],
        };
      }
      if (row.medio_id) {
        instruccionesConMedios[row.id].medios.push({
          id: row.medio_id,
          url_medio: row.url_medio,
          subtitulo: row.subtitulo,
          paso_asociado: row.paso_asociado,
          orden: row.medio_orden,
          tipo_medio: row.tipo_medio,
        });
      }
    });
    res.json(Object.values(instruccionesConMedios));
  } catch (error) {
    console.error('❌ Error al obtener instrucciones RCP para admin:', error);
    res.status(500).json({ message: 'Error interno al obtener las instrucciones RCP para admin.', detalle: error.message });
  }
});

// Crear una nueva instrucción RCP con múltiples medios (ADMIN)
app.post('/api/admin/rcp', autenticarYAutorizar(rolesAdminNivel), upload.array('medios', 10), async (req, res) => {
  const { instruccion, orden, categoria } = req.body;

  // Parsear metadatos de nuevos medios enviados desde el frontend
  const nuevosSubtitulos = req.body.nuevos_medios_subtitulos ? JSON.parse(req.body.nuevos_medios_subtitulos) : [];
  const nuevosPasosAsociados = req.body.nuevos_medios_pasos_asociados ? JSON.parse(req.body.nuevos_medios_pasos_asociados) : [];
  const nuevosOrdenes = req.body.nuevos_medios_ordenes ? JSON.parse(req.body.nuevos_medios_ordenes) : [];
  const nuevosTiposMedio = req.body.nuevos_medios_tipos_medio ? JSON.parse(req.body.nuevos_medios_tipos_medio) : [];

  if (!instruccion || instruccion.trim() === "") {
    // Si hay archivos subidos, eliminarlos antes de responder con error
    if (req.files) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, 'public/uploads', file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    return res.status(400).json({ message: "La instrucción es requerida." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [resultInstruccion] = await connection.query(
      'INSERT INTO rcp_instrucciones (instruccion, orden, categoria, fecha_creacion, fecha_actualizacion) VALUES (?, ?, ?, NOW(), NOW())',
      [instruccion, parseInt(orden) || 0, categoria || 'RCP Adultos']
    );
    const instruccionId = resultInstruccion.insertId;

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const subtitulo = nuevosSubtitulos[i] || '';
        const paso_asociado = nuevosPasosAsociados[i] || ''; // Si no se usa, será string vacío
        const orden_medio = (nuevosOrdenes[i] !== undefined && !isNaN(parseInt(nuevosOrdenes[i]))) ? parseInt(nuevosOrdenes[i]) : i;
        const tipo_medio = nuevosTiposMedio[i] || (file.mimetype.startsWith('image') ? 'imagen' : 'video');

        await connection.query(
          'INSERT INTO rcp_medios (instruccion_id, url_medio, subtitulo, paso_asociado, orden, tipo_medio, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [instruccionId, `/uploads/${file.filename}`, subtitulo, paso_asociado, orden_medio, tipo_medio]
        );
      }
    }

    await connection.commit();
    // Devolver la instrucción creada con sus medios (o al menos el ID)
    // Para devolverla completa, necesitarías otro query aquí o que el frontend la recargue
    res.status(201).json({
      message: 'Instrucción RCP creada exitosamente.',
      instruccion: { 
        id: instruccionId, 
        instruccion, 
        orden: parseInt(orden) || 0, 
        categoria: categoria || 'RCP Adultos' 
        // Podrías añadir los medios creados si los recopilas durante el bucle
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    // Asegurar que los archivos subidos se eliminan en caso de error
    if (req.files) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, 'public/uploads', file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    console.error("❌ Error al crear instrucción RCP:", error);
    res.status(500).json({ message: "Error interno al crear la instrucción RCP.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Actualizar una instrucción RCP con múltiples medios (ADMIN)
app.put('/api/admin/rcp/:id', autenticarYAutorizar(rolesAdminNivel), upload.array('medios', 10), async (req, res) => {
  const { id } = req.params;
  const { instruccion, orden, categoria, medios_existentes_ids_a_conservar } = req.body;
  
  let idsAConservar = [];
  try {
      if (medios_existentes_ids_a_conservar) {
        idsAConservar = JSON.parse(medios_existentes_ids_a_conservar);
      }
  } catch (parseError) {
      console.error("Error parseando medios_existentes_ids_a_conservar:", parseError);
      // Decide cómo manejar este error, quizás devolver un 400 Bad Request
      // Por ahora, continuamos con idsAConservar vacío si hay error
  }

  // Parsear metadatos de nuevos medios
  const nuevosSubtitulos = req.body.nuevos_medios_subtitulos ? JSON.parse(req.body.nuevos_medios_subtitulos) : [];
  const nuevosPasosAsociados = req.body.nuevos_medios_pasos_asociados ? JSON.parse(req.body.nuevos_medios_pasos_asociados) : [];
  const nuevosOrdenes = req.body.nuevos_medios_ordenes ? JSON.parse(req.body.nuevos_medios_ordenes) : [];
  const nuevosTiposMedio = req.body.nuevos_medios_tipos_medio ? JSON.parse(req.body.nuevos_medios_tipos_medio) : [];
  
  let datosMediosExistentes = {};
  try {
      if (req.body.datos_medios_existentes) {
        datosMediosExistentes = JSON.parse(req.body.datos_medios_existentes);
      }
  } catch (parseError) {
      console.error("Error parseando datos_medios_existentes:", parseError);
  }


  if (!instruccion || instruccion.trim() === "") {
    if (req.files) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, 'public/uploads', file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    return res.status(400).json({ message: "La instrucción es requerida." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existingInstruccion] = await connection.query('SELECT id FROM rcp_instrucciones WHERE id = ?', [id]);
    if (existingInstruccion.length === 0) {
      if (req.files) {
        req.files.forEach(file => {
          const filePath = path.join(__dirname, 'public/uploads', file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      }
      await connection.rollback(); // No es estrictamente necesario si no se hizo nada, pero buena práctica
      return res.status(404).json({ message: "Instrucción RCP no encontrada." });
    }

    await connection.query(
      'UPDATE rcp_instrucciones SET instruccion = ?, orden = ?, categoria = ?, fecha_actualizacion = NOW() WHERE id = ?',
      [instruccion, parseInt(orden) || 0, categoria || 'RCP Adultos', id]
    );

    // 1. Eliminar medios antiguos que no están en idsAConservar
    const [mediosActualesDB] = await connection.query('SELECT id, url_medio FROM rcp_medios WHERE instruccion_id = ?', [id]);
    const mediosAEliminarDB = mediosActualesDB.filter(medioDB => !idsAConservar.includes(medioDB.id.toString()));

    for (const medioDB of mediosAEliminarDB) {
      const filePath = path.join(__dirname, 'public', medioDB.url_medio); // 'public' en lugar de 'public/uploads' si url_medio ya tiene /uploads/
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error(`Error al eliminar archivo ${filePath}:`, unlinkErr);
          // Podrías decidir continuar o fallar la transacción aquí
        }
      }
      await connection.query('DELETE FROM rcp_medios WHERE id = ?', [medioDB.id]);
    }

    // 2. Actualizar metadatos de medios existentes que SÍ se conservan
    for (const medioIdStr in datosMediosExistentes) {
      if (idsAConservar.includes(medioIdStr)) { // Asegurarse que el medio aún debe existir
        const datos = datosMediosExistentes[medioIdStr];
        await connection.query(
          'UPDATE rcp_medios SET subtitulo = ?, paso_asociado = ?, orden = ? WHERE id = ? AND instruccion_id = ?',
          [
            datos.subtitulo || '', 
            datos.paso_asociado || '', 
            (datos.orden !== undefined && !isNaN(parseInt(datos.orden))) ? parseInt(datos.orden) : 0, 
            parseInt(medioIdStr), 
            id
          ]
        );
      }
    }

    // 3. Agregar nuevos medios (los que vienen en req.files)
    if (req.files && req.files.length > 0) {
      // Obtener el orden máximo actual para los nuevos medios
      const [maxOrdenResult] = await connection.query('SELECT MAX(orden) as max_orden FROM rcp_medios WHERE instruccion_id = ?', [id]);
      let proximoOrdenBase = (maxOrdenResult[0]?.max_orden !== null) ? maxOrdenResult[0].max_orden + 1 : 0;

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const subtitulo = nuevosSubtitulos[i] || '';
        const paso_asociado = nuevosPasosAsociados[i] || '';
        // Si el nuevo medio tiene un orden específico, usarlo; sino, calcularlo.
        const orden_medio = (nuevosOrdenes[i] !== undefined && !isNaN(parseInt(nuevosOrdenes[i]))) ? parseInt(nuevosOrdenes[i]) : proximoOrdenBase + i;
        const tipo_medio = nuevosTiposMedio[i] || (file.mimetype.startsWith('image') ? 'imagen' : 'video');

        await connection.query(
          'INSERT INTO rcp_medios (instruccion_id, url_medio, subtitulo, paso_asociado, orden, tipo_medio, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [id, `/uploads/${file.filename}`, subtitulo, paso_asociado, orden_medio, tipo_medio]
        );
      }
    }

    await connection.commit();
    res.json({
      message: 'Instrucción RCP actualizada exitosamente.',
      instruccion: { 
        id: parseInt(id), 
        instruccion, 
        orden: parseInt(orden) || 0, 
        categoria: categoria || 'RCP Adultos'
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (req.files) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, 'public/uploads', file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    console.error("❌ Error al actualizar instrucción RCP:", error);
    // Si el error es por JSON.parse, puede ser útil dar un mensaje más específico
    if (error instanceof SyntaxError && error.message.includes("JSON.parse")) {
        return res.status(400).json({ message: "Error en el formato de los datos JSON enviados (medios existentes o nuevos).", detalle: error.message });
    }
    res.status(500).json({ message: "Error interno al actualizar la instrucción RCP.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Eliminar una instrucción RCP y sus medios asociados (ADMIN)
app.delete('/api/admin/rcp/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existingInstruccion] = await connection.query('SELECT id FROM rcp_instrucciones WHERE id = ?', [id]);
    if (existingInstruccion.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Instrucción RCP no encontrada para eliminar." });
    }

    // 1. Obtener URLs de medios para eliminarlos del sistema de archivos
    const [mediosAsociados] = await connection.query('SELECT url_medio FROM rcp_medios WHERE instruccion_id = ?', [id]);
    
    // 2. Eliminar los archivos físicos
    for (let medio of mediosAsociados) {
      if (medio.url_medio) {
        const filePath = path.join(__dirname, 'public', medio.url_medio); // Asume que url_medio es como '/uploads/nombre.jpg'
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (unlinkErr) {
            console.error(`Error al eliminar archivo físico ${filePath} durante borrado de instrucción ${id}:`, unlinkErr);
            // Considera si este error debe detener la transacción.
            // Por ahora, se registrará el error y se continuará con la eliminación de la BD.
          }
        }
      }
    }

    // 3. Eliminar la instrucción de la base de datos.
    // Si tienes ON DELETE CASCADE en la FK de rcp_medios->instruccion_id, los medios se borrarán automáticamente.
    // Si no, necesitas borrar rcp_medios primero:
    // await connection.query('DELETE FROM rcp_medios WHERE instruccion_id = ?', [id]);
    const [resultDeleteInstruccion] = await connection.query('DELETE FROM rcp_instrucciones WHERE id = ?', [id]);

    if (resultDeleteInstruccion.affectedRows === 0) {
      // Esto no debería pasar si la instrucción existía, pero es una doble verificación.
      await connection.rollback();
      return res.status(404).json({ message: "Instrucción RCP no encontrada o ya eliminada." });
    }

    await connection.commit();
    res.json({ message: 'Instrucción RCP y sus medios asociados eliminados exitosamente.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error al eliminar instrucción RCP:", error);
    res.status(500).json({ message: "Error interno al eliminar la instrucción RCP.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// --- CRUD DE INFORMACIÓN DE CONTACTO ---
// (Asegúrate que 'autenticarYAutorizar' y 'rolesAdminNivel' estén definidos)

// Obtener toda la información de contacto (PÚBLICO)
app.get('/api/contactos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contactos_info WHERE activo = TRUE ORDER BY categoria ASC, orden ASC, id ASC');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener información de contacto:', error);
    res.status(500).json({ message: 'Error interno al obtener la información de contacto.', detalle: error.message });
  }
});

// Obtener toda la información de contacto para ADMIN (incluye inactivos)
app.get('/api/admin/contactos', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contactos_info ORDER BY categoria ASC, orden ASC, id ASC');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener información de contacto para admin:', error);
    res.status(500).json({ message: 'Error interno al obtener la información para admin.', detalle: error.message });
  }
});

// Crear nueva información de contacto (ADMIN)
app.post('/api/admin/contactos', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { categoria, tipo_dato, etiqueta, valor, icono, orden, activo } = req.body;

  if (!categoria || !tipo_dato || !etiqueta || !valor) {
    return res.status(400).json({ message: "Categoría, Tipo de Dato, Etiqueta y Valor son requeridos." });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO contactos_info (categoria, tipo_dato, etiqueta, valor, icono, orden, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [categoria, tipo_dato, etiqueta, valor, icono || null, parseInt(orden) || 0, activo === undefined ? true : activo]
    );
    res.status(201).json({ 
        message: 'Información de contacto creada exitosamente.', 
        item: { id: result.insertId, ...req.body, orden: parseInt(orden) || 0, activo: activo === undefined ? true : activo } 
    });
  } catch (error) {
    console.error("❌ Error al crear información de contacto:", error);
    res.status(500).json({ message: "Error interno al crear la información.", detalle: error.message });
  }
});

// Actualizar información de contacto (ADMIN)
app.put('/api/admin/contactos/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;
  const { categoria, tipo_dato, etiqueta, valor, icono, orden, activo } = req.body;

  if (!categoria || !tipo_dato || !etiqueta || !valor) {
    return res.status(400).json({ message: "Categoría, Tipo de Dato, Etiqueta y Valor son requeridos." });
  }

  try {
    const [result] = await db.query(
      'UPDATE contactos_info SET categoria = ?, tipo_dato = ?, etiqueta = ?, valor = ?, icono = ?, orden = ?, activo = ? WHERE id = ?',
      [categoria, tipo_dato, etiqueta, valor, icono || null, parseInt(orden) || 0, activo === undefined ? true : activo, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Información de contacto no encontrada o datos sin cambios." });
    }
    res.json({ 
        message: 'Información de contacto actualizada exitosamente.', 
        item: { id: parseInt(id), ...req.body, orden: parseInt(orden) || 0, activo: activo === undefined ? true : activo } 
    });
  } catch (error) {
    console.error("❌ Error al actualizar información de contacto:", error);
    res.status(500).json({ message: "Error interno al actualizar la información.", detalle: error.message });
  }
});

// Eliminar información de contacto (ADMIN)
app.delete('/api/admin/contactos/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM contactos_info WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Información de contacto no encontrada." });
    }
    res.json({ message: 'Información de contacto eliminada exitosamente.' });
  } catch (error) {
    console.error("❌ Error al eliminar información de contacto:", error);
    res.status(500).json({ message: "Error interno al eliminar la información.", detalle: error.message });
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