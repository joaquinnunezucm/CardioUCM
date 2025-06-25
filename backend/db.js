// Contenido para el archivo backend/db.js (Versión corregida para Railway)

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Cargar variables de entorno desde el archivo .env (solo para desarrollo local)
dotenv.config();

// 1. Imprimimos las variables de entorno para depuración.
// Ahora usamos los nombres estándar de Railway (con guion bajo).
console.log('--- Intentando conectar a la base de datos con las siguientes credenciales: ---');
console.log('Host (MYSQL_HOST):', process.env.MYSQL_HOST);
console.log('User (MYSQL_USER):', process.env.MYSQL_USER);
console.log('Database (MYSQL_DATABASE):', process.env.MYSQL_DATABASE);
console.log('Port (MYSQL_PORT):', process.env.MYSQL_PORT);
// No se imprime la contraseña por seguridad.

// Verificamos si las variables de conexión están definidas. Si no, lanzamos un error claro.
if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD || !process.env.MYSQL_DATABASE) {
  console.error('❌ ERROR CRÍTICO: Faltan variables de entorno para la conexión a la base de datos.');
  console.error('Asegúrate de que MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, y MYSQL_DATABASE estén definidas.');
  process.exit(1); // Detiene la aplicación si no se puede configurar la conexión.
}

const pool = mysql.createPool({
    // Usamos los nombres de variables estándar de Railway (con guion bajo)
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000 // 10 segundos para detectar problemas de red
});

// 2. Exportamos el pool para que el resto de la app lo use.
module.exports = pool;