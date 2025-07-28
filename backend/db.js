const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Verificación de variables obligatorias
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME || !process.env.DB_PORT) {
  console.error('❌ ERROR CRÍTICO: Faltan variables de entorno para la conexión a la base de datos.');
  console.error('Asegúrate de que DB_HOST, DB_USER, DB_PASSWORD, DB_NAME y DB_PORT estén definidas en Render.');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT), // Asegura que sea un número
  timezone: 'Z',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
ssl: {
  ca: require('fs').readFileSync('../ca.pem'), // Ruta corregida
  rejectUnauthorized: true
}
});

module.exports = pool;