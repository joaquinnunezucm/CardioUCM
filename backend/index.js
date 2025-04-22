// ==== 📦 BACKEND - index.js ====
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Test de conexión
app.get('/ping', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1');
    res.json({ conectado: true, resultado: rows });
  } catch (error) {
    res.status(500).json({ conectado: false, error: error.message });
  }
});

// Obtener todos los DEA activos
app.get('/defibriladores', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id_tramite AS id,
        gl_nombre_fantasia AS nombre,
        CONCAT(gl_instalacion_calle, ' ', nr_instalacion_numero, ', ', gl_instalacion_comuna) AS direccion,
        gl_instalacion_latitud AS lat,
        gl_instalacion_longitud AS lng
      FROM tramites
      WHERE bo_activo = 1 AND bo_eliminado = 'N'
    `);

    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener desfibriladores:', error);
    res.status(500).json({ mensaje: 'Error al obtener datos desde la base' });
  }
});

// Insertar nuevo DEA con solo los campos requeridos
app.post('/defibriladores', async (req, res) => {
  const { nombre, direccion, lat, lng, solicitante, rut } = req.body;

  if (!nombre || !direccion || !lat || !lng || !solicitante || !rut) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO tramites (
        gl_nombre_fantasia,
        gl_instalacion_calle,
        gl_instalacion_latitud,
        gl_instalacion_longitud,
        gl_solicitante_nombre,
        gl_solicitante_rut,
        bo_activo,
        bo_eliminado
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 'N')`,
      [nombre, direccion, lat, lng, solicitante, rut]
    );

    res.status(201).json({
      mensaje: 'Desfibrilador registrado correctamente',
      desfibrilador: { id: result.insertId, nombre, direccion, lat, lng, solicitante, rut }
    });
  } catch (error) {
    console.error('❌ Error al insertar:', error);
    res.status(500).json({ mensaje: 'Error al guardar' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});
