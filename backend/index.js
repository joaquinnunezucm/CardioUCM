const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db'); // Asegúrate que db.js está configurado para tu base de datos
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

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
    const filetypes = /gif|png|jpg|jpeg|mp4|mov/; // Permitir videos también
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

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ...existing code...
const crypto = require('crypto');

// Guardar tokens de reseteo en memoria (para producción, usa DB)
const resetTokens = {};

app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requerido.' });

  try {
    const [rows] = await db.query('SELECT id, nombre FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      // No revelar si el email existe
      return res.json({ message: 'Si el correo existe, se enviará un enlace de recuperación.' });
    }
    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 30; // 30 minutos

    resetTokens[token] = { userId: user.id, expires };

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await transporter.sendMail({
      from: `"CardioUCM" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Recuperación de contraseña',
      html: `<p>Hola ${user.nombre},</p>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>Este enlace expirará en 30 minutos.</p>`,
    });

    res.json({ message: 'Si el correo existe, se enviará un enlace de recuperación.' });
  } catch (err) {
    console.error('Error en forgot-password:', err);
    res.status(500).json({ message: 'Error enviando el correo de recuperación.' });
  }
});


// ...existing code...
app.get('/api/validate-reset-token/:token', (req, res) => {
  const { token } = req.params;
  const data = resetTokens[token];
  if (!data || data.expires < Date.now()) {
    return res.status(400).json({ message: 'Token inválido o expirado.' });
  }
  res.json({ valid: true });
});

app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  const data = resetTokens[token];
  if (!data || data.expires < Date.now()) {
    return res.status(400).json({ message: 'Token inválido o expirado.' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Contraseña muy corta.' });
  }
  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashed, data.userId]);
    delete resetTokens[token];
    res.json({ message: 'Contraseña restablecida correctamente.' });
  } catch (err) {
    res.status(500).json({ message: 'Error al restablecer la contraseña.' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
  }
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.password as hashedPassword, u.nombre, ru.nombre as rol 
       FROM usuarios u
       JOIN roles_usuario ru ON u.rol_id = ru.id
       WHERE u.email = ?`, [email]
    );
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
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nombre, u.email, ru.nombre as rol, u.fecha_creacion 
       FROM usuarios u
       LEFT JOIN roles_usuario ru ON u.rol_id = ru.id
       ORDER BY u.id ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener la lista de usuarios:', error);
    res.status(500).json({ message: 'Error interno al obtener la lista de usuarios.', detalle: error.message });
  }
});

app.post('/api/usuarios', autenticarYAutorizar(['superadministrador']), async (req, res) => {
  const { nombre, email, password, rol: rolNombre } = req.body;
  if (!nombre || !email || !password || !rolNombre) {
    return res.status(400).json({ message: "Todos los campos son requeridos (nombre, email, password, rol)." });
  }
  if (!['administrador', 'superadministrador', 'usuario'].includes(rolNombre)) {
    return res.status(400).json({ message: "Rol inválido proporcionado." });
  }
  try {
    const [existingUser] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "El correo electrónico ya está registrado." });
    }
    const [rolRows] = await db.query('SELECT id FROM roles_usuario WHERE nombre = ?', [rolNombre]);
    if (rolRows.length === 0) {
      return res.status(400).json({ message: `Rol '${rolNombre}' no encontrado en la base de datos.` });
    }
    const rolId = rolRows[0].id;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol_id, fecha_creacion) VALUES (?, ?, ?, ?, NOW())',
      [nombre, email, hashedPassword, rolId]
    );
    res.status(201).json({ message: 'Usuario creado exitosamente.', usuario: { id: result.insertId, nombre, email, rol: rolNombre } });
  } catch (error) {
    console.error("❌ Error al crear usuario:", error);
    res.status(500).json({ message: "Error interno al crear el usuario.", detalle: error.message });
  }
});

app.put('/api/usuarios/:id', autenticarYAutorizar(['superadministrador']), async (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol: rolNombre, password } = req.body;

  if (!nombre || !email || !rolNombre) {
    return res.status(400).json({ message: "Nombre, email y rol son requeridos para la actualización." });
  }
  if (!['administrador', 'superadministrador', 'usuario'].includes(rolNombre)) {
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
    const [rolRows] = await db.query('SELECT id FROM roles_usuario WHERE nombre = ?', [rolNombre]);
    if (rolRows.length === 0) {
      return res.status(400).json({ message: `Rol '${rolNombre}' no encontrado en la base de datos.` });
    }
    const rolId = rolRows[0].id;
    let queryParams = [nombre, email, rolId];
    let sqlQuery = 'UPDATE usuarios SET nombre = ?, email = ?, rol_id = ?';
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
    res.json({ message: 'Usuario actualizado exitosamente.', usuario: { id: parseInt(id), nombre, email, rol: rolNombre } });
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

// --- CRUD DE FAQs ---

// RUTA PÚBLICA para obtener FAQs (usada por el cliente general)
app.get('/api/faqs', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.id, f.pregunta, f.respuesta, fc.nombre as categoria, f.orden 
       FROM faqs f
       LEFT JOIN faq_categorias fc ON f.categoria_id = fc.id
       ORDER BY f.orden ASC, f.id ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener FAQs:', error);
    res.status(500).json({ message: 'Error interno al obtener las FAQs.', detalle: error.message });
  }
});

// RUTA ADMIN para obtener FAQs (usada en la gestión)
app.get('/api/admin/faqs', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.id, f.pregunta, f.respuesta, fc.nombre as categoria, f.orden, f.fecha_creacion, f.fecha_actualizacion 
       FROM faqs f
       LEFT JOIN faq_categorias fc ON f.categoria_id = fc.id
       ORDER BY f.orden ASC, f.id ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener FAQs para admin:', error);
    res.status(500).json({ message: 'Error interno al obtener las FAQs para admin.', detalle: error.message });
  }
});

// RUTA ADMIN para OBTENER todas las categorías de FAQ (NUEVA - para el dropdown del frontend)
app.get('/api/admin/faqs/categorias', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [categorias] = await db.query(`
      SELECT DISTINCT fc.id, fc.nombre 
      FROM faq_categorias fc
      INNER JOIN faqs f ON f.categoria_id = fc.id
      ORDER BY fc.nombre ASC
    `);
    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías de FAQ:', error);
    res.status(500).json({ message: 'Error interno al obtener categorías de FAQ.', detalle: error.message });
  }
});

// RUTA ADMIN para CREAR una FAQ (MODIFICADA para crear categoría si no existe)
app.post('/api/admin/faqs', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { pregunta, respuesta, categoria: categoriaNombre, orden } = req.body; // categoriaNombre es el texto del input

  if (!pregunta || !pregunta.trim() || !respuesta || !respuesta.trim()) {
    return res.status(400).json({ message: "La pregunta y la respuesta son requeridas y no pueden estar vacías." });
  }

  let categoriaId = null;
  let nombreCategoriaFinalParaRespuesta = null; 

  if (categoriaNombre && String(categoriaNombre).trim() !== '') {
    const trimmedCategoriaNombre = String(categoriaNombre).trim();
    nombreCategoriaFinalParaRespuesta = trimmedCategoriaNombre; // Guardar para la respuesta
    try {
      // Intentar encontrar la categoría existente
      let [catRows] = await db.query('SELECT id FROM faq_categorias WHERE nombre = ?', [trimmedCategoriaNombre]);
      if (catRows.length > 0) {
        categoriaId = catRows[0].id;
      } else {
        // La categoría no existe, la creamos
        const [newCatResult] = await db.query('INSERT INTO faq_categorias (nombre) VALUES (?)', [trimmedCategoriaNombre]);
        categoriaId = newCatResult.insertId;
      }
    } catch (dbError) {
      console.error("Error procesando/creando categoría de FAQ (POST):", dbError);
      // Manejo de error si la inserción de la categoría falla (ej. por constraint UNIQUE si hay race condition)
      if (dbError.code === 'ER_DUP_ENTRY') {
         console.warn(`Intento de inserción duplicada para categoría: ${trimmedCategoriaNombre}. Intentando recuperar ID existente.`);
        try {
            const [existingCatRows] = await db.query('SELECT id FROM faq_categorias WHERE nombre = ?', [trimmedCategoriaNombre]);
            if (existingCatRows.length > 0) {
                categoriaId = existingCatRows[0].id;
            } else {
                // Esto sería muy inusual si ER_DUP_ENTRY ocurrió y no se encuentra
                return res.status(500).json({ message: "Error crítico al manejar categoría duplicada.", detalle: dbError.message });
            }
        } catch (retryError) {
            console.error("Error en reintento de obtención de categoría duplicada:", retryError);
            return res.status(500).json({ message: "Error interno al procesar la categoría de FAQ después de un conflicto.", detalle: retryError.message });
        }
      } else {
        return res.status(500).json({ message: "Error interno al procesar la categoría de FAQ.", detalle: dbError.message });
      }
    }
  }

  try {
    const finalOrden = parseInt(orden);
    if (isNaN(finalOrden) || finalOrden < 0) { // Asegurar que sea un número no negativo
        return res.status(400).json({ message: "El orden debe ser un número válido y no negativo." });
    }

    const [result] = await db.query(
      'INSERT INTO faqs (pregunta, respuesta, categoria_id, orden) VALUES (?, ?, ?, ?)',
      [pregunta.trim(), respuesta.trim(), categoriaId, finalOrden]
    );
    res.status(201).json({ 
        message: 'FAQ creada exitosamente.', 
        faq: { 
            id: result.insertId, 
            pregunta: pregunta.trim(), 
            respuesta: respuesta.trim(), 
            categoria: nombreCategoriaFinalParaRespuesta, // Devolver el nombre usado/creado
            orden: finalOrden 
        } 
    });
  } catch (error) {
    console.error("❌ Error al crear FAQ:", error);
    res.status(500).json({ message: "Error interno al crear la FAQ.", detalle: error.message });
  }
});

// RUTA ADMIN para ACTUALIZAR una FAQ (MODIFICADA para crear categoría si no existe)
app.put('/api/admin/faqs/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;
  const { pregunta, respuesta, categoria: categoriaNombre, orden } = req.body;

  if (!pregunta || !pregunta.trim() || !respuesta || !respuesta.trim()) {
    return res.status(400).json({ message: "La pregunta y la respuesta son requeridas y no pueden estar vacías." });
  }

  let categoriaId = null;
  let nombreCategoriaFinalParaRespuesta = null;

  if (categoriaNombre && String(categoriaNombre).trim() !== '') {
    const trimmedCategoriaNombre = String(categoriaNombre).trim();
    nombreCategoriaFinalParaRespuesta = trimmedCategoriaNombre;
    try {
      let [catRows] = await db.query('SELECT id FROM faq_categorias WHERE nombre = ?', [trimmedCategoriaNombre]);
      if (catRows.length > 0) {
        categoriaId = catRows[0].id;
      } else {
        const [newCatResult] = await db.query('INSERT INTO faq_categorias (nombre) VALUES (?)', [trimmedCategoriaNombre]);
        categoriaId = newCatResult.insertId;
      }
    } catch (dbError) {
      console.error("Error procesando/creando categoría de FAQ (PUT):", dbError);
      if (dbError.code === 'ER_DUP_ENTRY') {
        console.warn(`Intento de inserción duplicada para categoría (PUT): ${trimmedCategoriaNombre}. Intentando recuperar ID existente.`);
        try {
            const [existingCatRows] = await db.query('SELECT id FROM faq_categorias WHERE nombre = ?', [trimmedCategoriaNombre]);
            if (existingCatRows.length > 0) {
                categoriaId = existingCatRows[0].id;
            } else {
                return res.status(500).json({ message: "Error crítico al manejar categoría duplicada (PUT).", detalle: dbError.message });
            }
        } catch (retryError) {
            console.error("Error en reintento de obtención de categoría duplicada (PUT):", retryError);
            return res.status(500).json({ message: "Error interno al procesar la categoría de FAQ después de un conflicto (PUT).", detalle: retryError.message });
        }
      } else {
        return res.status(500).json({ message: "Error interno al procesar la categoría de FAQ.", detalle: dbError.message });
      }
    }
  }

  try {
    const finalOrden = parseInt(orden);
    if (isNaN(finalOrden) || finalOrden < 0) {
        return res.status(400).json({ message: "El orden debe ser un número válido y no negativo." });
    }
    
    const [result] = await db.query(
      'UPDATE faqs SET pregunta = ?, respuesta = ?, categoria_id = ?, orden = ? WHERE id = ?',
      [pregunta.trim(), respuesta.trim(), categoriaId, finalOrden, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "FAQ no encontrada o datos sin cambios." });
    }
    res.json({ 
        message: 'FAQ actualizada exitosamente.', 
        faq: { 
            id: parseInt(id), 
            pregunta: pregunta.trim(), 
            respuesta: respuesta.trim(), 
            categoria: nombreCategoriaFinalParaRespuesta, 
            orden: finalOrden 
        } 
    });
  } catch (error) {
    console.error("❌ Error al actualizar FAQ:", error);
    res.status(500).json({ message: "Error interno al actualizar la FAQ.", detalle: error.message });
  }
});

// RUTA ADMIN para ELIMINAR una FAQ (Sin cambios directos en la consulta, pero es parte del CRUD)
app.delete('/api/admin/faqs/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
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
app.get('/api/educacion', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ec.id, ecat.slug as categoria_id, ecat.nombre as categoria_nombre, 
              ec.titulo_tema, ec.contenido_tema, ec.orden_categoria, ec.orden_item 
       FROM educacion_contenido ec
       LEFT JOIN educacion_categorias ecat ON ec.id_categoria_fk = ecat.id
       WHERE ec.activo = TRUE 
       ORDER BY ec.orden_categoria ASC, ec.orden_item ASC, ec.id ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener contenido educativo público:', error);
    res.status(500).json({ message: 'Error interno al obtener el contenido.', detalle: error.message });
  }
});

app.get('/api/educacion/medios', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT em.id, em.contenido_id, mt.nombre as tipo_medio, em.url_medio, 
              em.orden, em.paso_asociado, em.subtitulo_medio 
       FROM educacion_medios em
       LEFT JOIN medio_tipos mt ON em.tipo_medio_id = mt.id
       ORDER BY em.contenido_id, em.orden ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener medios de contenido educativo:', error);
    res.status(500).json({ message: 'Error interno al obtener los medios.', detalle: error.message });
  }
});

app.get('/api/admin/educacion', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ec.id, ecat.slug as categoria_id, ecat.nombre as categoria_nombre, 
              ec.titulo_tema, ec.contenido_tema, ec.orden_categoria, ec.orden_item, 
              ec.activo, ec.created_at, ec.updated_at 
       FROM educacion_contenido ec
       LEFT JOIN educacion_categorias ecat ON ec.id_categoria_fk = ecat.id
       ORDER BY ec.orden_categoria ASC, ec.orden_item ASC, ec.id ASC`
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
    categoria_id: categoriaSlug, // Recibimos el slug como 'categoria_id' del frontend
    categoria_nombre,
    titulo_tema,
    contenido_tema,
    orden_categoria, // Puede ser string del form-data
    orden_item,    // Puede ser string del form-data
    activo         // Puede ser string 'true'/'false' o booleano
  } = req.body;

  const pasosAsociadosMedios = req.body.pasos_asociados_medios ? JSON.parse(req.body.pasos_asociados_medios) : [];
  const subtitulosMedios = req.body.subtitulos_medios ? JSON.parse(req.body.subtitulos_medios) : [];
  const ordenesMedios = req.body.ordenes_medios ? JSON.parse(req.body.ordenes_medios) : [];

  if (!categoriaSlug || !categoria_nombre || !titulo_tema || !contenido_tema) {
    if (req.files && req.files.length > 0) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    return res.status(400).json({ message: "Campos principales (slug categoría, nombre categoría, título, contenido) son requeridos." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    let idCategoriaFk;
    const [catRows] = await connection.query('SELECT id FROM educacion_categorias WHERE slug = ?', [categoriaSlug.trim()]);
    if (catRows.length > 0) {
      idCategoriaFk = catRows[0].id;
      // Actualizar el nombre si es diferente (solo si el slug ya existía)
      await connection.query('UPDATE educacion_categorias SET nombre = ? WHERE id = ? AND nombre != ?', [categoria_nombre.trim(), idCategoriaFk, categoria_nombre.trim()]);
    } else {
      const [newCatResult] = await connection.query('INSERT INTO educacion_categorias (slug, nombre) VALUES (?, ?)', [categoriaSlug.trim(), categoria_nombre.trim()]);
      idCategoriaFk = newCatResult.insertId;
    }

    // Asegurar valores numéricos para orden y booleano para activo
    const finalOrdenCategoria = parseInt(orden_categoria) || 0;
    const finalOrdenItem = parseInt(orden_item) || 0;
    const finalActivo = (String(activo).toLowerCase() === 'true' || activo === true); // Convertir a booleano robustamente

    const sqlInsertContenido = `
      INSERT INTO educacion_contenido 
      (id_categoria_fk, titulo_tema, contenido_tema, orden_categoria, orden_item, activo, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const paramsInsertContenido = [
      idCategoriaFk, 
      titulo_tema.trim(), 
      contenido_tema.trim(), 
      finalOrdenCategoria, 
      finalOrdenItem, 
      finalActivo
    ];


    const [resultContenido] = await connection.query(sqlInsertContenido, paramsInsertContenido);
    const contenidoId = resultContenido.insertId;

    if (req.files && req.files.length > 0) {
      const [imgTipoRow] = await connection.query('SELECT id FROM medio_tipos WHERE nombre = ?', ['imagen']);
      const [vidTipoRow] = await connection.query('SELECT id FROM medio_tipos WHERE nombre = ?', ['video']);
      
      if (imgTipoRow.length === 0 || vidTipoRow.length === 0) {
        await connection.rollback();
        if (req.files && req.files.length > 0) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
        return res.status(500).json({ message: "Tipos de medio ('imagen', 'video') no encontrados en la base de datos." });
      }
      const imagenTipoId = imgTipoRow[0].id;
      const videoTipoId = vidTipoRow[0].id;

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const pasoAsociado = (pasosAsociadosMedios[i] && String(pasosAsociadosMedios[i]).trim() !== '') ? String(pasosAsociadosMedios[i]).trim() : null;
        const subtitulo = (subtitulosMedios[i] && String(subtitulosMedios[i]).trim() !== '') ? String(subtitulosMedios[i]).trim() : null;
        const orden = (ordenesMedios[i] !== undefined && ordenesMedios[i] !== null) ? parseInt(ordenesMedios[i]) : i;
        const tipoMedioId = file.mimetype.includes('video') ? videoTipoId : imagenTipoId;
        
        await connection.query(
          'INSERT INTO educacion_medios (contenido_id, tipo_medio_id, url_medio, orden, paso_asociado, subtitulo_medio, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [contenidoId, tipoMedioId, `/uploads/${file.filename}`, orden, pasoAsociado, subtitulo]
        );
      }
    }
    await connection.commit();
    res.status(201).json({ message: 'Contenido educativo creado exitosamente.', item: { id: contenidoId, titulo_tema, categoria_id: categoriaSlug, categoria_nombre } });
  } catch (error) {
    if (connection) await connection.rollback();
    if (req.files && req.files.length > 0) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    console.error("❌ Error al crear contenido educativo:", error); // Loguea el error completo
    res.status(500).json({ message: "Error interno al crear el contenido.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.put('/api/admin/educacion/:id', autenticarYAutorizar(rolesAdminNivel), upload.array('medios', 10), async (req, res) => {
  const { id } = req.params;
  const {
    categoria_id: categoriaSlug,
    categoria_nombre,
    titulo_tema, contenido_tema,
    orden_categoria, orden_item, activo,
    medios_existentes_ids_a_conservar
  } = req.body;

  const pasosAsociadosNuevosMedios = req.body.pasos_asociados_nuevos_medios ? JSON.parse(req.body.pasos_asociados_nuevos_medios) : [];
  const subtitulosNuevosMedios = req.body.subtitulos_nuevos_medios ? JSON.parse(req.body.subtitulos_nuevos_medios) : [];
  const ordenesNuevosMedios = req.body.ordenes_nuevos_medios ? JSON.parse(req.body.ordenes_nuevos_medios) : [];
  const datosMediosExistentes = req.body.datos_medios_existentes ? JSON.parse(req.body.datos_medios_existentes) : {};
  const idsAConservar = medios_existentes_ids_a_conservar ? JSON.parse(medios_existentes_ids_a_conservar) : [];

  if (!categoriaSlug || !categoria_nombre || !titulo_tema || !contenido_tema) {
    if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
    return res.status(400).json({ message: "Campos principales (slug categoría, nombre categoría, título, contenido) son requeridos." });
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

    let idCategoriaFk;
    const [catRows] = await connection.query('SELECT id FROM educacion_categorias WHERE slug = ?', [categoriaSlug.trim()]);
    if (catRows.length > 0) {
      idCategoriaFk = catRows[0].id;
      await connection.query('UPDATE educacion_categorias SET nombre = ? WHERE id = ?', [categoria_nombre.trim(), idCategoriaFk]);
    } else {
      const [newCatResult] = await connection.query('INSERT INTO educacion_categorias (slug, nombre) VALUES (?, ?)', [categoriaSlug.trim(), categoria_nombre.trim()]);
      idCategoriaFk = newCatResult.insertId;
    }

    await connection.query(
      'UPDATE educacion_contenido SET id_categoria_fk = ?, titulo_tema = ?, contenido_tema = ?, orden_categoria = ?, orden_item = ?, activo = ?, updated_at = NOW() WHERE id = ?',
      [idCategoriaFk, titulo_tema.trim(), contenido_tema.trim(), parseInt(orden_categoria) || 0, parseInt(orden_item) || 0, (activo === 'true' || activo === true), id]
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
      
      const [imgTipoRow] = await connection.query('SELECT id FROM medio_tipos WHERE nombre = ?', ['imagen']);
      const [vidTipoRow] = await connection.query('SELECT id FROM medio_tipos WHERE nombre = ?', ['video']);
      const imagenTipoId = imgTipoRow[0].id;
      const videoTipoId = vidTipoRow[0].id;

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const pasoAsociado = (pasosAsociadosNuevosMedios[i] && pasosAsociadosNuevosMedios[i].trim() !== '') ? pasosAsociadosNuevosMedios[i].trim() : null;
        const subtitulo = (subtitulosNuevosMedios[i] && subtitulosNuevosMedios[i].trim() !== '') ? subtitulosNuevosMedios[i].trim() : null;
        const orden = (ordenesNuevosMedios[i] !== undefined && ordenesNuevosMedios[i] !== null) ? parseInt(ordenesNuevosMedios[i]) : proximoOrden + i;
        const tipoMedioId = file.mimetype.includes('video') ? videoTipoId : imagenTipoId;
        
        await connection.query(
          'INSERT INTO educacion_medios (contenido_id, tipo_medio_id, url_medio, orden, paso_asociado, subtitulo_medio, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [id, tipoMedioId, `/uploads/${file.filename}`, orden, pasoAsociado, subtitulo]
        );
      }
    }

    await connection.commit();
    res.json({ message: 'Contenido educativo actualizado exitosamente.', item: { id: parseInt(id), titulo_tema, categoria_id: categoriaSlug, categoria_nombre } });
  } catch (error) {
    if (connection) await connection.rollback();
    if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
    console.error("❌ Error al actualizar contenido educativo:", error);
    res.status(500).json({ message: "Error interno al actualizar el contenido.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});

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
app.get('/api/rcp', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        ri.id, ri.instruccion, ri.orden, rc.nombre AS categoria, ri.fecha_creacion, ri.fecha_actualizacion,
        rm.id AS medio_id, rm.url_medio, rm.subtitulo, rm.paso_asociado, rm.orden AS medio_orden, mt.nombre AS tipo_medio
      FROM rcp_instrucciones ri
      LEFT JOIN rcp_categorias rc ON ri.categoria_id = rc.id
      LEFT JOIN rcp_medios rm ON ri.id = rm.instruccion_id
      LEFT JOIN medio_tipos mt ON rm.tipo_medio_id = mt.id
      ORDER BY ri.orden ASC, ri.id ASC, rm.orden ASC
    `);
    const instruccionesConMedios = {};
    rows.forEach(row => {
      if (!instruccionesConMedios[row.id]) {
        instruccionesConMedios[row.id] = {
          id: row.id, instruccion: row.instruccion, orden: row.orden, categoria: row.categoria,
          fecha_creacion: row.fecha_creacion, fecha_actualizacion: row.fecha_actualizacion, medios: [],
        };
      }
      if (row.medio_id) {
        instruccionesConMedios[row.id].medios.push({
          id: row.medio_id, url_medio: row.url_medio, subtitulo: row.subtitulo,
          paso_asociado: row.paso_asociado, orden: row.medio_orden, tipo_medio: row.tipo_medio,
        });
      }
    });
    res.json(Object.values(instruccionesConMedios));
  } catch (error) {
    console.error('❌ Error al obtener instrucciones RCP:', error);
    res.status(500).json({ message: 'Error interno al obtener las instrucciones RCP.', detalle: error.message });
  }
});

app.get('/api/admin/rcp', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        ri.id, ri.instruccion, ri.orden, rc.nombre AS categoria, ri.fecha_creacion, ri.fecha_actualizacion,
        rm.id AS medio_id, rm.url_medio, rm.subtitulo, rm.paso_asociado, rm.orden AS medio_orden, mt.nombre AS tipo_medio
      FROM rcp_instrucciones ri
      LEFT JOIN rcp_categorias rc ON ri.categoria_id = rc.id
      LEFT JOIN rcp_medios rm ON ri.id = rm.instruccion_id
      LEFT JOIN medio_tipos mt ON rm.tipo_medio_id = mt.id
      ORDER BY ri.orden ASC, ri.id ASC, rm.orden ASC
    `);
    const instruccionesConMedios = {};
    rows.forEach(row => {
      if (!instruccionesConMedios[row.id]) {
        instruccionesConMedios[row.id] = {
          id: row.id, instruccion: row.instruccion, orden: row.orden, categoria: row.categoria,
          fecha_creacion: row.fecha_creacion, fecha_actualizacion: row.fecha_actualizacion, medios: [],
        };
      }
      if (row.medio_id) {
        instruccionesConMedios[row.id].medios.push({
          id: row.medio_id, url_medio: row.url_medio, subtitulo: row.subtitulo,
          paso_asociado: row.paso_asociado, orden: row.medio_orden, tipo_medio: row.tipo_medio,
        });
      }
    });
    res.json(Object.values(instruccionesConMedios));
  } catch (error) {
    console.error('❌ Error al obtener instrucciones RCP para admin:', error);
    res.status(500).json({ message: 'Error interno al obtener las instrucciones RCP para admin.', detalle: error.message });
  }
});

app.post('/api/admin/rcp', autenticarYAutorizar(rolesAdminNivel), upload.array('medios', 10), async (req, res) => {
  const { instruccion, orden, categoria: categoriaNombre } = req.body;
  const nuevosSubtitulos = req.body.nuevos_medios_subtitulos ? JSON.parse(req.body.nuevos_medios_subtitulos) : [];
  const nuevosPasosAsociados = req.body.nuevos_medios_pasos_asociados ? JSON.parse(req.body.nuevos_medios_pasos_asociados) : [];
  const nuevosOrdenes = req.body.nuevos_medios_ordenes ? JSON.parse(req.body.nuevos_medios_ordenes) : [];
  const nuevosTiposMedioNombres = req.body.nuevos_medios_tipos_medio ? JSON.parse(req.body.nuevos_medios_tipos_medio) : [];

  if (!instruccion || instruccion.trim() === "") {
    if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
    return res.status(400).json({ message: "La instrucción es requerida." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    let categoriaId;
    const nombreCategoriaAUsar = categoriaNombre || 'RCP Adultos';
    const [catRows] = await connection.query('SELECT id FROM rcp_categorias WHERE nombre = ?', [nombreCategoriaAUsar]);
    if (catRows.length > 0) {
      categoriaId = catRows[0].id;
    } else {
      await connection.rollback();
      if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
      return res.status(400).json({ message: `Categoría RCP '${nombreCategoriaAUsar}' no encontrada.` });
    }

    const [resultInstruccion] = await connection.query(
      'INSERT INTO rcp_instrucciones (instruccion, orden, categoria_id, fecha_creacion, fecha_actualizacion) VALUES (?, ?, ?, NOW(), NOW())',
      [instruccion, parseInt(orden) || 0, categoriaId]
    );
    const instruccionId = resultInstruccion.insertId;

    if (req.files && req.files.length > 0) {
      const [imgTipoRow] = await connection.query('SELECT id FROM medio_tipos WHERE nombre = ?', ['imagen']);
      const [vidTipoRow] = await connection.query('SELECT id FROM medio_tipos WHERE nombre = ?', ['video']);
      const imagenTipoId = imgTipoRow[0].id;
      const videoTipoId = vidTipoRow[0].id;
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const subtitulo = nuevosSubtitulos[i] || '';
        const paso_asociado = nuevosPasosAsociados[i] || '';
        const orden_medio = (nuevosOrdenes[i] !== undefined && !isNaN(parseInt(nuevosOrdenes[i]))) ? parseInt(nuevosOrdenes[i]) : i;
        let tipoMedioIdDeterminado;
        if (nuevosTiposMedioNombres[i] && nuevosTiposMedioNombres[i].toLowerCase() === 'video') tipoMedioIdDeterminado = videoTipoId;
        else if (nuevosTiposMedioNombres[i] && nuevosTiposMedioNombres[i].toLowerCase() === 'imagen') tipoMedioIdDeterminado = imagenTipoId;
        else tipoMedioIdDeterminado = file.mimetype.startsWith('image') ? imagenTipoId : videoTipoId;
        await connection.query(
          'INSERT INTO rcp_medios (instruccion_id, url_medio, subtitulo, paso_asociado, orden, tipo_medio_id, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [instruccionId, `/uploads/${file.filename}`, subtitulo, paso_asociado, orden_medio, tipoMedioIdDeterminado]
        );
      }
    }
    await connection.commit();
    res.status(201).json({
      message: 'Instrucción RCP creada exitosamente.',
      instruccion: { id: instruccionId, instruccion, orden: parseInt(orden) || 0, categoria: nombreCategoriaAUsar }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
    console.error("❌ Error al crear instrucción RCP:", error);
    res.status(500).json({ message: "Error interno al crear la instrucción RCP.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.put('/api/admin/rcp/:id', autenticarYAutorizar(rolesAdminNivel), upload.array('medios', 10), async (req, res) => {
  const { id } = req.params;
  const { instruccion, orden, categoria: categoriaNombre, medios_existentes_ids_a_conservar } = req.body;
  let idsAConservar = [];
  try { if (medios_existentes_ids_a_conservar) { idsAConservar = JSON.parse(medios_existentes_ids_a_conservar); } } catch (e) { console.error("Error parseando medios_existentes_ids_a_conservar:", e); }
  const nuevosSubtitulos = req.body.nuevos_medios_subtitulos ? JSON.parse(req.body.nuevos_medios_subtitulos) : [];
  const nuevosPasosAsociados = req.body.nuevos_medios_pasos_asociados ? JSON.parse(req.body.nuevos_medios_pasos_asociados) : [];
  const nuevosOrdenes = req.body.nuevos_medios_ordenes ? JSON.parse(req.body.nuevos_medios_ordenes) : [];
  const nuevosTiposMedioNombres = req.body.nuevos_medios_tipos_medio ? JSON.parse(req.body.nuevos_medios_tipos_medio) : [];
  let datosMediosExistentes = {};
  try { if (req.body.datos_medios_existentes) { datosMediosExistentes = JSON.parse(req.body.datos_medios_existentes); } } catch (e) { console.error("Error parseando datos_medios_existentes:", e); }

  if (!instruccion || instruccion.trim() === "") {
    if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
    return res.status(400).json({ message: "La instrucción es requerida." });
  }
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [existingInstruccion] = await connection.query('SELECT id FROM rcp_instrucciones WHERE id = ?', [id]);
    if (existingInstruccion.length === 0) {
      if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
      await connection.rollback();
      return res.status(404).json({ message: "Instrucción RCP no encontrada." });
    }
    let categoriaId;
    const nombreCategoriaAUsar = categoriaNombre || 'RCP Adultos';
    const [catRows] = await connection.query('SELECT id FROM rcp_categorias WHERE nombre = ?', [nombreCategoriaAUsar]);
    if (catRows.length > 0) {
      categoriaId = catRows[0].id;
    } else {
      await connection.rollback();
      if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
      return res.status(400).json({ message: `Categoría RCP '${nombreCategoriaAUsar}' no encontrada.` });
    }
    await connection.query(
      'UPDATE rcp_instrucciones SET instruccion = ?, orden = ?, categoria_id = ?, fecha_actualizacion = NOW() WHERE id = ?',
      [instruccion, parseInt(orden) || 0, categoriaId, id]
    );
    const [mediosActualesDB] = await connection.query('SELECT id, url_medio FROM rcp_medios WHERE instruccion_id = ?', [id]);
    const mediosAEliminarDB = mediosActualesDB.filter(medioDB => !idsAConservar.includes(medioDB.id.toString()));
    for (const medioDB of mediosAEliminarDB) {
      const filePath = path.join(__dirname, 'public', medioDB.url_medio);
      if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch (unlinkErr) { console.error(`Error al eliminar archivo ${filePath}:`, unlinkErr);}}
      await connection.query('DELETE FROM rcp_medios WHERE id = ?', [medioDB.id]);
    }
    for (const medioIdStr in datosMediosExistentes) {
      if (idsAConservar.includes(medioIdStr)) {
        const datos = datosMediosExistentes[medioIdStr];
        await connection.query(
          'UPDATE rcp_medios SET subtitulo = ?, paso_asociado = ?, orden = ? WHERE id = ? AND instruccion_id = ?',
          [datos.subtitulo || '', datos.paso_asociado || '', (datos.orden !== undefined && !isNaN(parseInt(datos.orden))) ? parseInt(datos.orden) : 0, parseInt(medioIdStr), id]
        );
      }
    }
    if (req.files && req.files.length > 0) {
      const [maxOrdenResult] = await connection.query('SELECT MAX(orden) as max_orden FROM rcp_medios WHERE instruccion_id = ?', [id]);
      let proximoOrdenBase = (maxOrdenResult[0]?.max_orden !== null) ? maxOrdenResult[0].max_orden + 1 : 0;
      const [imgTipoRow] = await connection.query('SELECT id FROM medio_tipos WHERE nombre = ?', ['imagen']);
      const [vidTipoRow] = await connection.query('SELECT id FROM medio_tipos WHERE nombre = ?', ['video']);
      const imagenTipoId = imgTipoRow[0].id;
      const videoTipoId = vidTipoRow[0].id;
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const subtitulo = nuevosSubtitulos[i] || '';
        const paso_asociado = nuevosPasosAsociados[i] || '';
        const orden_medio = (nuevosOrdenes[i] !== undefined && !isNaN(parseInt(nuevosOrdenes[i]))) ? parseInt(nuevosOrdenes[i]) : proximoOrdenBase + i;
        let tipoMedioIdDeterminado;
        if (nuevosTiposMedioNombres[i] && nuevosTiposMedioNombres[i].toLowerCase() === 'video') tipoMedioIdDeterminado = videoTipoId;
        else if (nuevosTiposMedioNombres[i] && nuevosTiposMedioNombres[i].toLowerCase() === 'imagen') tipoMedioIdDeterminado = imagenTipoId;
        else tipoMedioIdDeterminado = file.mimetype.startsWith('image') ? imagenTipoId : videoTipoId;
        await connection.query(
          'INSERT INTO rcp_medios (instruccion_id, url_medio, subtitulo, paso_asociado, orden, tipo_medio_id, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [id, `/uploads/${file.filename}`, subtitulo, paso_asociado, orden_medio, tipoMedioIdDeterminado]
        );
      }
    }
    await connection.commit();
    res.json({
      message: 'Instrucción RCP actualizada exitosamente.',
      instruccion: { id: parseInt(id), instruccion, orden: parseInt(orden) || 0, categoria: nombreCategoriaAUsar }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
    console.error("❌ Error al actualizar instrucción RCP:", error);
    if (error instanceof SyntaxError && error.message.includes("JSON.parse")) {
        return res.status(400).json({ message: "Error en el formato de los datos JSON enviados (medios existentes o nuevos).", detalle: error.message });
    }
    res.status(500).json({ message: "Error interno al actualizar la instrucción RCP.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});

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
    const [mediosAsociados] = await connection.query('SELECT url_medio FROM rcp_medios WHERE instruccion_id = ?', [id]);
    for (let medio of mediosAsociados) {
      if (medio.url_medio) {
        const filePath = path.join(__dirname, 'public', medio.url_medio);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); }
          catch (unlinkErr) { console.error(`Error al eliminar archivo físico ${filePath} durante borrado de instrucción ${id}:`, unlinkErr); }
        }
      }
    }
    const [resultDeleteInstruccion] = await connection.query('DELETE FROM rcp_instrucciones WHERE id = ?', [id]);
    if (resultDeleteInstruccion.affectedRows === 0) {
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

// RUTA PÚBLICA para obtener información de contacto activa
app.get('/api/contactos', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ci.id, cc.nombre as categoria, ctd.nombre as tipo_dato, ci.etiqueta, ci.valor, 
              ci.icono, ci.orden, ci.activo, ci.fecha_creacion, ci.fecha_actualizacion
       FROM contactos_info ci
       LEFT JOIN contacto_categorias cc ON ci.categoria_id = cc.id
       LEFT JOIN contacto_tipos_dato ctd ON ci.tipo_dato_id = ctd.id
       WHERE ci.activo = TRUE 
       ORDER BY cc.nombre ASC, ci.orden ASC, ci.id ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener información de contacto:', error);
    res.status(500).json({ message: 'Error interno al obtener la información de contacto.', detalle: error.message });
  }
});

// RUTA ADMIN para obtener TODA la información de contacto (incluye inactivos)
app.get('/api/admin/contactos', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ci.id, cc.nombre as categoria, ctd.nombre as tipo_dato, ci.etiqueta, ci.valor, 
              ci.icono, ci.orden, ci.activo, ci.fecha_creacion, ci.fecha_actualizacion
       FROM contactos_info ci
       LEFT JOIN contacto_categorias cc ON ci.categoria_id = cc.id
       LEFT JOIN contacto_tipos_dato ctd ON ci.tipo_dato_id = ctd.id
       ORDER BY cc.nombre ASC, ci.orden ASC, ci.id ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener información de contacto para admin:', error);
    res.status(500).json({ message: 'Error interno al obtener la información para admin.', detalle: error.message });
  }
});

// RUTA ADMIN para OBTENER todas las categorías de contacto (para dropdowns si se usan)
app.get('/api/contacto-categorias', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [categorias] = await db.query('SELECT id, nombre FROM contacto_categorias ORDER BY nombre ASC');
    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías de contacto:', error);
    res.status(500).json({ message: 'Error interno al obtener categorías de contacto.', detalle: error.message });
  }
});

// RUTA ADMIN para OBTENER todos los tipos de dato de contacto (para dropdowns si se usan)
app.get('/api/contacto-tipos-dato', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [tipos] = await db.query('SELECT id, nombre FROM contacto_tipos_dato ORDER BY nombre ASC');
    res.json(tipos);
  } catch (error) {
    console.error('Error al obtener tipos de dato de contacto:', error);
    res.status(500).json({ message: 'Error interno al obtener tipos de dato de contacto.', detalle: error.message });
  }
});


// RUTA ADMIN para CREAR nueva información de contacto
app.post('/api/admin/contactos', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { categoria: categoriaNombre, tipo_dato: tipoDatoNombre, etiqueta, valor, icono, orden, activo } = req.body;

  if (!categoriaNombre || !String(categoriaNombre).trim() || 
      !tipoDatoNombre || !String(tipoDatoNombre).trim() || 
      !etiqueta || !String(etiqueta).trim() || 
      !valor || !String(valor).trim()) {
    return res.status(400).json({ message: "Categoría, Tipo de Dato, Etiqueta y Valor son requeridos y no pueden estar vacíos." });
  }

  let categoriaId;
  let tipoDatoId;
  const trimmedCategoriaNombre = String(categoriaNombre).trim();
  const trimmedTipoDatoNombre = String(tipoDatoNombre).trim();

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Manejar Categoría: Buscar o crear
    let [catRows] = await connection.query('SELECT id FROM contacto_categorias WHERE nombre = ?', [trimmedCategoriaNombre]);
    if (catRows.length > 0) {
      categoriaId = catRows[0].id;
    } else {
      const [newCatResult] = await connection.query('INSERT INTO contacto_categorias (nombre) VALUES (?)', [trimmedCategoriaNombre]);
      categoriaId = newCatResult.insertId;
    }

    // Manejar Tipo de Dato: Debe existir (frontend usa select)
    let [tipoRows] = await connection.query('SELECT id FROM contacto_tipos_dato WHERE nombre = ?', [trimmedTipoDatoNombre]);
    if (tipoRows.length > 0) {
      tipoDatoId = tipoRows[0].id;
    } else {
      await connection.rollback();
      return res.status(400).json({ message: `Tipo de dato '${trimmedTipoDatoNombre}' no es válido. Seleccione uno de la lista.` });
    }
    
    const finalOrden = parseInt(orden, 10);
    if (isNaN(finalOrden) || finalOrden < 0) {
        await connection.rollback();
        return res.status(400).json({ message: "El orden debe ser un número válido y no negativo." });
    }
    const finalActivo = (String(activo).toLowerCase() === 'true' || activo === true || activo === 1);


    const [result] = await connection.query(
      'INSERT INTO contactos_info (categoria_id, tipo_dato_id, etiqueta, valor, icono, orden, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [categoriaId, tipoDatoId, String(etiqueta).trim(), String(valor).trim(), icono || null, finalOrden, finalActivo]
    );
    
    await connection.commit();

    res.status(201).json({ 
        message: 'Información de contacto creada exitosamente.', 
        item: { 
            id: result.insertId, 
            categoria: trimmedCategoriaNombre, 
            tipo_dato: trimmedTipoDatoNombre, 
            etiqueta: String(etiqueta).trim(), 
            valor: String(valor).trim(), 
            icono, 
            orden: finalOrden, 
            activo: finalActivo
        } 
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error al crear información de contacto:", error);
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('contacto_categorias.uq_contacto_categorias_nombre')) {
        // Intento de re-obtener el ID si la categoría ya existe debido a una condición de carrera
        console.warn(`Condición de carrera detectada al crear categoría de contacto: ${trimmedCategoriaNombre}`);
        try {
            const [existingCatRows] = await db.query('SELECT id FROM contacto_categorias WHERE nombre = ?', [trimmedCategoriaNombre]); // Usar db.query, no connection que podría estar cerrada
            if (existingCatRows.length > 0) {
                // Reintentar la inserción principal con el ID de categoría obtenido
                // Esto es un poco más complejo y podría requerir reintentar la transacción.
                // Por ahora, un mensaje de error más específico.
                return res.status(409).json({ message: `La categoría '${trimmedCategoriaNombre}' ya existe o hubo un conflicto. Intente de nuevo.`, detalle: error.message });
            }
        } catch (retryError) {
            return res.status(500).json({ message: "Error interno al reintentar obtener categoría.", detalle: retryError.message });
        }
    }
    res.status(500).json({ message: "Error interno al crear la información.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// RUTA ADMIN para ACTUALIZAR información de contacto (MODIFICADA)
app.put('/api/admin/contactos/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;
  const { categoria: categoriaNombre, tipo_dato: tipoDatoNombre, etiqueta, valor, icono, orden, activo } = req.body;

  if (!categoriaNombre || !String(categoriaNombre).trim() || 
      !tipoDatoNombre || !String(tipoDatoNombre).trim() || 
      !etiqueta || !String(etiqueta).trim() || 
      !valor || !String(valor).trim()) {
    return res.status(400).json({ message: "Categoría, Tipo de Dato, Etiqueta y Valor son requeridos y no pueden estar vacíos." });
  }

  let categoriaId;
  let tipoDatoId;
  const trimmedCategoriaNombre = String(categoriaNombre).trim();
  const trimmedTipoDatoNombre = String(tipoDatoNombre).trim();

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Manejar Categoría: Buscar o crear
    let [catRows] = await connection.query('SELECT id FROM contacto_categorias WHERE nombre = ?', [trimmedCategoriaNombre]);
    if (catRows.length > 0) {
      categoriaId = catRows[0].id;
    } else {
      const [newCatResult] = await connection.query('INSERT INTO contacto_categorias (nombre) VALUES (?)', [trimmedCategoriaNombre]);
      categoriaId = newCatResult.insertId;
    }

    // Manejar Tipo de Dato (debe existir)
    let [tipoRows] = await connection.query('SELECT id FROM contacto_tipos_dato WHERE nombre = ?', [trimmedTipoDatoNombre]);
    if (tipoRows.length > 0) {
      tipoDatoId = tipoRows[0].id;
    } else {
      await connection.rollback();
      return res.status(400).json({ message: `Tipo de dato '${trimmedTipoDatoNombre}' no es válido. Seleccione uno de la lista.` });
    }
    
    const finalOrden = parseInt(orden, 10);
    if (isNaN(finalOrden) || finalOrden < 0) {
        await connection.rollback();
        return res.status(400).json({ message: "El orden debe ser un número válido y no negativo." });
    }
    const finalActivo = (String(activo).toLowerCase() === 'true' || activo === true || activo === 1);


    const [result] = await connection.query(
      'UPDATE contactos_info SET categoria_id = ?, tipo_dato_id = ?, etiqueta = ?, valor = ?, icono = ?, orden = ?, activo = ? WHERE id = ?',
      [categoriaId, tipoDatoId, String(etiqueta).trim(), String(valor).trim(), icono || null, finalOrden, finalActivo, id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Información de contacto no encontrada o datos sin cambios." });
    }
    
    await connection.commit();
    res.json({ 
        message: 'Información de contacto actualizada exitosamente.', 
        item: { 
            id: parseInt(id), 
            categoria: trimmedCategoriaNombre, 
            tipo_dato: trimmedTipoDatoNombre, 
            etiqueta: String(etiqueta).trim(), 
            valor: String(valor).trim(), 
            icono, 
            orden: finalOrden, 
            activo: finalActivo
        } 
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error al actualizar información de contacto:", error);
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('contacto_categorias.uq_contacto_categorias_nombre')) {
         console.warn(`Condición de carrera detectada al crear categoría de contacto (PUT): ${trimmedCategoriaNombre}`);
        try {
            const [existingCatRows] = await db.query('SELECT id FROM contacto_categorias WHERE nombre = ?', [trimmedCategoriaNombre]);
            if (existingCatRows.length > 0) {
                return res.status(409).json({ message: `La categoría '${trimmedCategoriaNombre}' ya existe o hubo un conflicto (PUT). Intente de nuevo.`, detalle: error.message });
            }
        } catch (retryError) {
             return res.status(500).json({ message: "Error interno al reintentar obtener categoría (PUT).", detalle: retryError.message });
        }
    }
    res.status(500).json({ message: "Error interno al actualizar la información.", detalle: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// RUTA ADMIN para ELIMINAR información de contacto
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
  const { seccion: seccionNombre } = req.body;
  if (!seccionNombre) return res.status(400).json({ mensaje: 'Sección requerida' });
  try {
    const [seccionRows] = await db.query('SELECT id FROM secciones_clic WHERE nombre = ?', [seccionNombre]);
    if (seccionRows.length === 0) {
      // Considerar crear la sección si no existe, o loguear y no fallar.
      // Por ahora, si no está predefinida, no se registra el clic.
      // Esto puede ajustarse si se prefiere un registro más permisivo.
      console.warn(`Intento de registrar clic para sección no existente en 'secciones_clic': ${seccionNombre}`);
      return res.status(400).json({ mensaje: `La sección '${seccionNombre}' no es válida para registrar clics.` });
    }
    const seccionId = seccionRows[0].id;
    await db.query('INSERT INTO clicks (seccion_id, fecha) VALUES (?, NOW())', [seccionId]);
    res.json({ mensaje: 'Clic registrado' });
  } catch (error) {
    console.error('❌ Error al registrar clic:', error);
    res.status(500).json({ mensaje: 'Error al registrar clic' });
  }
});

app.get('/api/obtener-clics', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [resultados] = await db.query(
      `SELECT sc.nombre as seccion, COUNT(c.id) as cantidad 
       FROM clicks c
       JOIN secciones_clic sc ON c.seccion_id = sc.id
       GROUP BY sc.nombre`
    );
    const data = {};
    resultados.forEach(r => { data[r.seccion] = r.cantidad; });
    res.json(data);
  } catch (error) {
    console.error('❌ Error al obtener clics:', error);
    res.status(500).json({ mensaje: 'Error al obtener datos' });
  }
});

// --- RUTAS DE DEAs (Gestión y Públicas ) ---
app.get('/defibriladores', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        t.id_tramite AS id, 
        t.gl_nombre_fantasia AS nombre, 
        CONCAT(t.gl_instalacion_calle, ' ', IFNULL(t.nr_instalacion_numero, ''), ', ', c.nombre) AS direccion, 
        t.gl_instalacion_latitud AS lat, 
        t.gl_instalacion_longitud AS lng,
        COALESCE(t.nr_equipos_cantidad, 1) AS cantidad_equipos
      FROM tramites t
      JOIN comunas c ON t.comuna_id = c.id
      WHERE t.estado = 'aprobado' AND t.bo_eliminado = 'N' 
        AND t.gl_instalacion_latitud IS NOT NULL 
        AND t.gl_instalacion_longitud IS NOT NULL
    `);
    const defibriladores = rows.map(dea => ({
      ...dea,
      lat: parseFloat(dea.lat),
      lng: parseFloat(dea.lng),
      cantidad_equipos: parseInt(dea.cantidad_equipos, 10) || 1
    }));
    res.json(defibriladores);
  } catch (error) {
    console.error('❌ Error al obtener desfibriladores:', error);
    res.status(500).json({ mensaje: 'Error al obtener datos desde la base', detalle: error.message });
  }
});

app.get('/api/comunas', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT nombre FROM comunas ORDER BY nombre ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener comunas', detalle: error.message });
  }
});

app.post('/solicitudes-dea', async (req, res) => {
  const { 
    nombre, gl_instalacion_calle, nr_instalacion_numero, gl_instalacion_comuna: comunaNombre,
    lat, lng, solicitante, rut
  } = req.body;

  if (!nombre || !gl_instalacion_calle || !comunaNombre || !lat || !lng || !solicitante || !rut) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios: nombre, calle, comuna, lat, lng, solicitante, rut.' });
  }
  try {
    const [comunaRows] = await db.query('SELECT id FROM comunas WHERE nombre = ?', [comunaNombre]);
    if (comunaRows.length === 0) {
      return res.status(400).json({ mensaje: `La comuna '${comunaNombre}' no es válida, ingrese el nombre correctamente.` });
    }
    const comunaId = comunaRows[0].id;
    const valoresParaInsertar = [
      nombre, gl_instalacion_calle, 
      (nr_instalacion_numero && String(nr_instalacion_numero).trim() !== '') ? String(nr_instalacion_numero).trim() : null, 
      comunaId, parseFloat(lat), parseFloat(lng), solicitante, rut
    ];
    const sqlQuery = `
      INSERT INTO tramites (
        gl_nombre_fantasia, gl_instalacion_calle, nr_instalacion_numero, comuna_id, 
        gl_instalacion_latitud, gl_instalacion_longitud, gl_solicitante_nombre, gl_solicitante_rut, 
        nr_equipos_cantidad, bo_activo, bo_eliminado, estado, fc_creacion, fc_actualiza
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 'N', 'pendiente', NOW(), NOW())`;
    const [result] = await db.query(sqlQuery, valoresParaInsertar);
    res.status(201).json({ mensaje: 'Solicitud de DEA registrada exitosamente.', id_tramite: result.insertId });
  } catch (error) {
    console.error("❌ ERROR AL INSERTAR SOLICITUD DE DEA:", error);
    res.status(500).json({ mensaje: 'Error al guardar la solicitud', detalle: error.message });
  }
});

app.get('/solicitudes-dea', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        t.id_tramite AS id, t.gl_nombre_fantasia AS nombre, 
        CONCAT(t.gl_instalacion_calle, ' ', IFNULL(t.nr_instalacion_numero, ''), ', ', c.nombre) AS direccion_completa, 
        t.gl_instalacion_calle, t.nr_instalacion_numero, t.nr_equipos_cantidad,
        c.nombre AS gl_instalacion_comuna, 
        t.gl_instalacion_latitud AS lat, t.gl_instalacion_longitud AS lng, 
        t.gl_solicitante_nombre AS solicitante, t.gl_solicitante_rut AS rut, 
        t.fc_creacion, t.estado
      FROM tramites t
      JOIN comunas c ON t.comuna_id = c.id
      WHERE (t.estado = 'pendiente' OR t.estado IS NULL) AND t.bo_eliminado = 'N' 
      ORDER BY t.fc_creacion DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener solicitudes pendientes:', error);
    res.status(500).json({ mensaje: 'Error al obtener datos de solicitudes', detalle: error.message });
  }
});

app.post('/solicitudes-dea/:id/aprobar', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;
  try {
    const [solicitudRows] = await db.query("SELECT estado FROM tramites WHERE id_tramite = ? AND bo_eliminado = 'N'", [id]);
    if (solicitudRows.length === 0) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada.' });
    }
    const solicitudActual = solicitudRows[0];
    if (solicitudActual.estado !== 'pendiente' && solicitudActual.estado !== null) {
        return res.status(400).json({ mensaje: `La solicitud ya se encuentra en estado '${solicitudActual.estado}' y no puede ser aprobada.` });
    }
    const cantidadFinalAprobada = 1;
    const [result] = await db.query(
      "UPDATE tramites SET bo_activo = 1, estado = 'aprobado', nr_equipos_cantidad = ?, fc_actualiza = NOW() WHERE id_tramite = ?",
      [cantidadFinalAprobada, id]
    );
    if (result.affectedRows === 0) { 
      return res.status(409).json({ mensaje: 'No se pudo actualizar la solicitud.' });
    }
    res.json({ mensaje: 'Solicitud de DEA aprobada exitosamente.', equipos_aprobados: cantidadFinalAprobada });
  } catch (error) {
    console.error('❌ Error al aprobar solicitud:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al aprobar la solicitud.', detalle: error.message });
  }
});

app.delete('/solicitudes-dea/:id/rechazar', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;
  try {
    const [solicitudRows] = await db.query("SELECT estado FROM tramites WHERE id_tramite = ? AND bo_eliminado = 'N'", [id]);
    if (solicitudRows.length === 0) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada.' });
    }
    if (solicitudRows[0].estado !== 'pendiente' && solicitudRows[0].estado !== null) {
        return res.status(400).json({ mensaje: `La solicitud ya se encuentra en estado '${solicitudRows[0].estado}' y no puede ser rechazada.` });
    }
    const [result] = await db.query(
      `UPDATE tramites SET estado = 'rechazado', bo_activo = 0, nr_equipos_cantidad = COALESCE(nr_equipos_cantidad, 0), fc_actualiza = NOW() WHERE id_tramite = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(409).json({ mensaje: 'No se pudo actualizar la solicitud.' });
    }
    res.json({ mensaje: 'Solicitud rechazada exitosamente.' });
  } catch (error) {
    console.error('❌ Error al rechazar solicitud:', error);
    res.status(500).json({ mensaje: 'Error al rechazar solicitud', detalle: error.message });
  }
});

// RUTA ADMIN para obtener TODOS los DEAs (independiente del estado)
app.get('/api/admin/gestion-deas', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        t.id_tramite AS id, 
        t.gl_nombre_fantasia AS nombre, 
        t.gl_instalacion_calle, 
        t.nr_instalacion_numero,
        c.nombre AS gl_instalacion_comuna, 
        t.gl_instalacion_latitud AS lat, 
        t.gl_instalacion_longitud AS lng,
        t.nr_equipos_cantidad,
        t.gl_solicitante_nombre AS solicitante, 
        t.gl_solicitante_rut AS rut, 
        t.fc_creacion, 
        t.estado
      FROM tramites t
      LEFT JOIN comunas c ON t.comuna_id = c.id
      
      ORDER BY t.fc_creacion DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener la lista completa de DEAs para admin:', error);
    res.status(500).json({ message: 'Error interno al obtener la lista de DEAs.', detalle: error.message });
  }
});

app.post('/api/admin/gestion-deas', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  // CORRECCIÓN: Ya no esperamos `nr_equipos_cantidad` del body.
  const { 
    nombre, gl_instalacion_calle, nr_instalacion_numero, gl_instalacion_comuna,
    lat, lng, solicitante, rut, estado
  } = req.body;

  if (!nombre || !gl_instalacion_calle || !gl_instalacion_comuna || !lat || !lng || !solicitante || !rut || !estado) {
    return res.status(400).json({ message: 'Faltan datos obligatorios para crear el DEA.' });
  }

  try {
    const [comunaRows] = await db.query('SELECT id FROM comunas WHERE nombre = ?', [gl_instalacion_comuna]);
    if (comunaRows.length === 0) {
      return res.status(400).json({ message: `La comuna '${gl_instalacion_comuna}' no es válida.` });
    }
    const comunaId = comunaRows[0].id;
    
    const bo_activo = (estado === 'aprobado') ? 1 : 0;

    const sqlQuery = `
      INSERT INTO tramites (
        gl_nombre_fantasia, gl_instalacion_calle, nr_instalacion_numero, comuna_id, 
        gl_instalacion_latitud, gl_instalacion_longitud, gl_solicitante_nombre, gl_solicitante_rut, 
        nr_equipos_cantidad, estado, bo_activo, bo_eliminado, fc_creacion, fc_actualiza
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'N', NOW(), NOW())`;
      
    const valoresParaInsertar = [
      nombre, gl_instalacion_calle, 
      (nr_instalacion_numero && String(nr_instalacion_numero).trim() !== '') ? String(nr_instalacion_numero).trim() : null, 
      comunaId, parseFloat(lat), parseFloat(lng), solicitante, rut,
      1, // CORRECCIÓN: Asignamos el valor por defecto 1 directamente aquí.
      estado, bo_activo
    ];

    const [result] = await db.query(sqlQuery, valoresParaInsertar);
    res.status(201).json({ message: 'DEA creado exitosamente.', id_tramite: result.insertId });

  } catch (error) {
    console.error("❌ ERROR AL CREAR DEA (ADMIN):", error);
    res.status(500).json({ message: 'Error al guardar el nuevo DEA.', detalle: error.message });
  }
});


// RUTA ADMIN para ACTUALIZAR un DEA
app.put('/api/admin/gestion-deas/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  const { id } = req.params;
  // CORRECCIÓN: Ya no esperamos `nr_equipos_cantidad` del body.
  const { 
    nombre, gl_instalacion_calle, nr_instalacion_numero, gl_instalacion_comuna,
    lat, lng, solicitante, rut, estado
  } = req.body;

  if (!nombre || !gl_instalacion_calle || !gl_instalacion_comuna || !lat || !lng || !solicitante || !rut || !estado) {
    return res.status(400).json({ message: 'Faltan datos obligatorios para actualizar el DEA.' });
  }

  try {
    const [comunaRows] = await db.query('SELECT id FROM comunas WHERE nombre = ?', [gl_instalacion_comuna]);
    if (comunaRows.length === 0) {
      return res.status(400).json({ message: `La comuna '${gl_instalacion_comuna}' no es válida.` });
    }
    const comunaId = comunaRows[0].id;
    const bo_activo = (estado === 'aprobado') ? 1 : 0;

    // CORRECCIÓN: La consulta UPDATE ya no modifica `nr_equipos_cantidad`.
    // Si un admin necesitara cambiarlo, se debería añadir un campo específico en el futuro.
    const sqlQuery = `
      UPDATE tramites SET
        gl_nombre_fantasia = ?, gl_instalacion_calle = ?, nr_instalacion_numero = ?, comuna_id = ?,
        gl_instalacion_latitud = ?, gl_instalacion_longitud = ?, gl_solicitante_nombre = ?, gl_solicitante_rut = ?,
        estado = ?, bo_activo = ?, fc_actualiza = NOW()
      WHERE id_tramite = ?
    `;

    const valoresParaActualizar = [
      nombre, gl_instalacion_calle, 
      (nr_instalacion_numero && String(nr_instalacion_numero).trim() !== '') ? String(nr_instalacion_numero).trim() : null, 
      comunaId, parseFloat(lat), parseFloat(lng), solicitante, rut,
      estado, bo_activo,
      id
    ];

    const [result] = await db.query(sqlQuery, valoresParaActualizar);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "DEA no encontrado o ningún dato fue modificado." });
    }
    res.json({ message: 'DEA actualizado exitosamente.' });
  } catch (error) {
    console.error("❌ ERROR AL ACTUALIZAR DEA (ADMIN):", error);
    res.status(500).json({ message: 'Error al actualizar el DEA.', detalle: error.message });
  }
});

// RUTA ADMIN para ELIMINAR un DEA (Borrado lógico)
app.delete('/api/admin/gestion-deas/:id', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query(
            "UPDATE tramites SET bo_eliminado = 'S', estado = 'inactivo', bo_activo = 0, fc_actualiza = NOW() WHERE id_tramite = ?", 
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "DEA no encontrado para eliminar." });
        }
        res.json({ message: 'DEA eliminado exitosamente.' });
    } catch (error) {
        console.error("❌ ERROR AL ELIMINAR DEA (ADMIN):", error);
        res.status(500).json({ message: "Error interno al eliminar el DEA.", detalle: error.message });
    }
});



// Estadísticas Dashboard
app.get('/api/estadisticas', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  try {
    let visitaHomePageSeccionId, llamada131SeccionId, llamar131AltSeccionId;
    const [vhpRows] = await db.query("SELECT id FROM secciones_clic WHERE nombre = 'VisitaHomePage'");
    if (vhpRows.length > 0) visitaHomePageSeccionId = vhpRows[0].id;
    const [l131Rows] = await db.query("SELECT id FROM secciones_clic WHERE nombre = 'LlamadaEmergencia131'");
    if (l131Rows.length > 0) llamada131SeccionId = l131Rows[0].id;
    const [l131AltRows] = await db.query("SELECT id FROM secciones_clic WHERE nombre = 'LLAMAR 131'");
    if (l131AltRows.length > 0) llamar131AltSeccionId = l131AltRows[0].id;

    let totalVisitas = 0;
    if (visitaHomePageSeccionId) {
      const [[visitasResult]] = await db.query("SELECT COUNT(*) as totalVisitas FROM clicks WHERE seccion_id = ?", [visitaHomePageSeccionId]);
      totalVisitas = visitasResult?.totalVisitas || 0;
    }
    const [[deasActivosResult]] = await db.query(
        `SELECT SUM(CASE WHEN nr_equipos_cantidad IS NOT NULL AND nr_equipos_cantidad > 0 THEN nr_equipos_cantidad ELSE 1 END) as totalDeasActivos 
         FROM tramites WHERE estado = 'aprobado' AND bo_eliminado = 'N'`
    );
    const totalDeasActivos = deasActivosResult?.totalDeasActivos || 0;
    let totalLlamadas131 = 0;
    const idsLlamadas = [llamada131SeccionId, llamar131AltSeccionId].filter(id => id != null);
    if (idsLlamadas.length > 0) {
        const placeholders = idsLlamadas.map(() => '?').join(',');
        const [[llamadas131Result]] = await db.query(`SELECT COUNT(*) as totalLlamadas FROM clicks WHERE seccion_id IN (${placeholders})`, idsLlamadas);
        totalLlamadas131 = llamadas131Result?.totalLlamadas || 0;
    }
    res.json({ 
        visitasPagina: parseInt(totalVisitas, 10), 
        deasRegistrados: parseInt(totalDeasActivos, 10), 
        emergenciasEsteMes: parseInt(totalLlamadas131, 10)
    });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas', detalle: error.message });
  }
});

// Helper para obtener la fecha de hoy en YYYY-MM-DD (necesario si 'fin' no se envía para clics/solicitudes)
function getTodayDateStringBackend() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// --- Reportes para el Dashboard ---
app.get('/api/reportes', autenticarYAutorizar(rolesAdminNivel), async (req, res) => {
  let { inicio, fin } = req.query; 

  let fechaInicio = null;
  let fechaFin = null;
  // Este flag indica si el USUARIO ha especificado un rango, no si el backend aplica un default.
  let usuarioEspecificoFiltroDeFechas = false; 

  if (inicio) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
      return res.status(400).json({ mensaje: 'Formato de fecha de inicio inválido. Usar YYYY-MM-DD.' });
    }
    fechaInicio = `${inicio} 00:00:00`;
    usuarioEspecificoFiltroDeFechas = true;
  }

  if (fin) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fin)) {
      return res.status(400).json({ mensaje: 'Formato de fecha de fin inválido. Usar YYYY-MM-DD.' });
    }
    fechaFin = `${fin} 23:59:59`;
    usuarioEspecificoFiltroDeFechas = true;
  }
  
  // Default para clics y solicitudes si no se especifica 'fin' por el usuario
  const fechaFinParaClicsSolicitudes = fechaFin || `${getTodayDateStringBackend()} 23:59:59`;


  try {
    // 1. DEAs por Comuna
    let deasComunaQuery = `
      SELECT
        UPPER(c.nombre) AS comuna,
        SUM(CASE WHEN t.nr_equipos_cantidad IS NOT NULL AND t.nr_equipos_cantidad > 0 THEN t.nr_equipos_cantidad ELSE 1 END) AS cantidad
      FROM tramites t
      JOIN comunas c ON t.comuna_id = c.id
      WHERE t.estado = 'aprobado' AND t.bo_eliminado = 'N' 
    `;
    const deasComunaParams = [];
    if (usuarioEspecificoFiltroDeFechas) {
        if (fechaInicio) {
            deasComunaQuery += ` AND t.fc_creacion >= ?`;
            deasComunaParams.push(fechaInicio);
        }
        if (fechaFin) { // Si hay filtro específico, y fin no fue dado, se usa hoy (ya asignado a fechaFin si inicio fue dado)
            deasComunaQuery += ` AND t.fc_creacion <= ?`;
            deasComunaParams.push(fechaFin || fechaFinParaClicsSolicitudes); // Usar fechaFin si está, sino el default de hoy
        }
    }
    deasComunaQuery += `
      GROUP BY UPPER(c.nombre)
      HAVING SUM(CASE WHEN t.nr_equipos_cantidad IS NOT NULL AND t.nr_equipos_cantidad > 0 THEN t.nr_equipos_cantidad ELSE 1 END) > 0
      ORDER BY cantidad DESC
    `;
    const [deasPorComunaRaw] = await db.query(deasComunaQuery, deasComunaParams);
    const deasPorComuna = deasPorComunaRaw.map(item => ({
        comuna: item.comuna,
        cantidad: parseInt(item.cantidad, 10) || 0
    }));

    // 2. Estado de DEAs
    let estadoDeasQuery = `
      SELECT
        SUM(CASE WHEN estado = 'aprobado' THEN CASE WHEN nr_equipos_cantidad IS NOT NULL AND nr_equipos_cantidad > 0 THEN nr_equipos_cantidad ELSE 1 END ELSE 0 END) AS aprobados_count,
        SUM(CASE WHEN estado = 'pendiente' THEN CASE WHEN nr_equipos_cantidad IS NOT NULL AND nr_equipos_cantidad > 0 THEN nr_equipos_cantidad ELSE 1 END ELSE 0 END) AS pendientes_count,
        SUM(CASE WHEN estado = 'rechazado' THEN CASE WHEN nr_equipos_cantidad IS NOT NULL AND nr_equipos_cantidad > 0 THEN nr_equipos_cantidad ELSE 1 END ELSE 0 END) AS rechazados_count
      FROM tramites
      WHERE bo_eliminado = 'N' AND estado IN ('aprobado', 'pendiente', 'rechazado')
    `;
    const estadoDeasParams = [];
    if (usuarioEspecificoFiltroDeFechas) {
        if (fechaInicio) {
            estadoDeasQuery += ` AND fc_creacion >= ?`;
            estadoDeasParams.push(fechaInicio);
        }
        if (fechaFin) {
            estadoDeasQuery += ` AND fc_creacion <= ?`;
            estadoDeasParams.push(fechaFin || fechaFinParaClicsSolicitudes);
        }
    }
    const [estadoDeasRaw] = await db.query(estadoDeasQuery, estadoDeasParams);
    const estadoDeas = { 
      aprobados: parseInt(estadoDeasRaw[0]?.aprobados_count, 10) || 0,
      pendientes: parseInt(estadoDeasRaw[0]?.pendientes_count, 10) || 0,
      rechazados: parseInt(estadoDeasRaw[0]?.rechazados_count, 10) || 0,
      inactivos: 0 
    };

    // 3. Clics
    let clicsQuery = `
        SELECT UPPER(sc.nombre) AS seccion, COUNT(c.id) as cantidad
        FROM clicks c
        JOIN secciones_clic sc ON c.seccion_id = sc.id
    `;
    const clicsQueryParams = [];
    let clicsWhereClauses = [];
    if (fechaInicio) { 
        clicsWhereClauses.push('c.fecha >= ?'); 
        clicsQueryParams.push(fechaInicio); 
    }
    clicsWhereClauses.push('c.fecha <= ?'); 
    clicsQueryParams.push(fechaFinParaClicsSolicitudes); 

    if (clicsWhereClauses.length > 0) {
        clicsQuery += ' WHERE ' + clicsWhereClauses.join(' AND ');
    }
    clicsQuery += ` GROUP BY UPPER(sc.nombre) ORDER BY cantidad DESC, seccion ASC`;
    const [clicsResultRaw] = await db.query(clicsQuery, clicsQueryParams);
    const clics = clicsResultRaw.reduce((acc, row) => {
      acc[row.seccion] = parseInt(row.cantidad, 10) || 0;
      return acc;
    }, {});

    // 4. Solicitudes de Trámites por Día
    let solicitudesQuery = `
        SELECT DATE(t.fc_creacion) AS dia_creacion, COUNT(t.id_tramite) as cantidad_solicitudes 
        FROM tramites t
    `;
    const solicitudesQueryParams = [];
    let solicitudesWhereClauses = [];
    if (fechaInicio) { 
        solicitudesWhereClauses.push('t.fc_creacion >= ?'); 
        solicitudesQueryParams.push(fechaInicio); 
    }
    solicitudesWhereClauses.push('t.fc_creacion <= ?'); 
    solicitudesQueryParams.push(fechaFinParaClicsSolicitudes); 

    if (solicitudesWhereClauses.length > 0) {
        solicitudesQuery += ' WHERE ' + solicitudesWhereClauses.join(' AND ');
    }
    solicitudesQuery += ` GROUP BY DATE(t.fc_creacion) ORDER BY dia_creacion ASC`;
    const [solicitudesResultRaw] = await db.query(solicitudesQuery, solicitudesQueryParams);
    const solicitudesPorDia = solicitudesResultRaw.reduce((acc, row) => {
      const fecha = new Date(row.dia_creacion);
      const formattedDate = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      acc[formattedDate] = parseInt(row.cantidad_solicitudes, 10) || 0;
      return acc;
    }, {});

    res.json({
      deasPorComuna,
      estadoDeas,
      clics,
      solicitudesPorPeriodo: solicitudesPorDia,
      filtroAplicado: usuarioEspecificoFiltroDeFechas 
    });

  } catch (error) {
    console.error('❌ Error al obtener reportes:', error);
    res.status(500).json({ mensaje: 'Error al obtener los reportes', detalle: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
});