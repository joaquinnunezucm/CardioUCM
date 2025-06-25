// Contenido para el archivo backend/db.js

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// 1. Imprimimos las variables de entorno para depuración.
console.log('--- Intentando conectar a la base de datos con las siguientes credenciales: ---');
console.log('Host (MYSQLHOST):', process.env.MYSQLHOST);
console.log('User (MYSQLUSER):', process.env.MYSQLUSER);
console.log('Database (MYSQLDATABASE):', process.env.MYSQLDATABASE);
console.log('Port (MYSQLPORT):', process.env.MYSQLPORT);
// No imprimas la contraseña por seguridad.

const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000 // 10 segundos para detectar problemas de red
});

// 2. Exportamos el pool para que el resto de la app lo use.
module.exports = pool;