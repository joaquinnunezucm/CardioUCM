const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db'); // Asegúrate que db.js está configurado para Aiven con SSL
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// NUEVO: Importaciones para Cloudinary
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

dotenv.config();

// NUEVO: Configuración de Cloudinary usando las variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Para que siempre devuelva URLs https
});

// NUEVO: Helper para extraer el public_id de una URL de Cloudinary para poder borrarla.
const getPublicIdFromUrl = (url) => {
    if (!url) return null;
    try {
        const parts = url.split('/');
        const publicIdWithExtension = parts.slice(parts.indexOf('proyecto-uploads')).join('/');
        return publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));
    } catch (e) {
        console.error("Error extrayendo public_id de la URL:", url, e);
        return null;
    }
};

// NUEVO: Helper para borrar archivos de Cloudinary en caso de error de DB
const cleanupCloudinaryOnFailure = async (files) => {
    if (files && files.length > 0) {
        console.log("Error en DB, eliminando archivos subidos a Cloudinary...");
        for (const file of files) {
            const publicId = getPublicIdFromUrl(file.path);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
                } catch (cloudinaryError) {
                    console.error(`Fallo al eliminar ${publicId} de Cloudinary:`, cloudinaryError);
                }
            }
        }
    }
};

const app = express();
const PORT = process.env.PORT || 3001;

// CAMBIO: Configuración de CORS más segura para producción
const allowedOrigins = [
  'https://cardio-ucm.vercel.app/', // <-- ¡¡REEMPLAZA ESTO!!
  'http://localhost:5173', // Puerto común de desarrollo con Vite (React/Vue)
  'http://localhost:3000'  // Puerto común de desarrollo con Create React App
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'));
    }
  }
}));

app.use(express.json());

// CAMBIO: Configuración de Multer para subir archivos a Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'proyecto-uploads', // Carpeta en Cloudinary donde se guardarán
    allowed_formats: ['gif', 'png', 'jpg', 'jpeg', 'mp4', 'mov'],
    resource_type: 'auto', // Detecta automáticamente si es imagen o video
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
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

// --- INICIO DE RUTAS ---

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


// --- Iniciar Servidor ---
app.listen(PORT, () => {
  console.log(`✅ Servidor backend corriendo en el puerto ${PORT}`);
});