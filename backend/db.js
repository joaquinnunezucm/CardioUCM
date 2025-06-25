// Contenido para el archivo backend/db.js (Versión corregida para Railway)

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Cargar variables de entorno desde el archivo .env (solo para desarrollo local)
dotenv.config();

// 1. Imprimimos las variables de entorno para depuración.
// Ahora usamos los nombres que TÚ definiste en Railway (DB_HOST, etc.)
console.log('--- Intentando conectar a la base de datos con las siguientes credenciales: ---');
console.log('Host (DB_HOST):', process.env.DB_HOST);
console.log('User (DB_USER):', process.env.DB_USER);
console.log('Database (DB_NAME):', process.env.DB_NAME);
console.log('Port (PORT_DB):', process.env.DB_PORT); // Usaremos DB_PORT si lo defines

// Verificamos si las variables de conexión están definidas.
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  console.error('❌ ERROR CRÍTICO: Faltan variables de entorno para la conexión a la base de datos.');
  console.error('Asegúrate de que DB_HOST, DB_USER, DB_PASSWORD, y DB_NAME estén definidas en el panel de Railway.');
  process.exit(1);
}

const pool = mysql.createPool({
    // Usamos los nombres de variables que TÚ definiste en Railway
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306, // Leerá un DB_PORT si lo creas, si no, usa 3306
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000 
});

// 2. Exportamos el pool para que el resto de la app lo use.
module.exports = pool;