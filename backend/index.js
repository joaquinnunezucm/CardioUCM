// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db'); // Asegúrate que db.js esté configurado

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

// Login (sin cambios, pero recuerda el problema de seguridad)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ mensaje: 'Correo y contraseña son requeridos' });
  }
  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ mensaje: 'Correo no registrado' });
    }
    const user = rows[0];
    if (user.password === password) { // <- ¡VULNERABILIDAD DE SEGURIDAD! USAR HASH
      return res.json({ mensaje: 'Login exitoso', usuario: { id: user.id, email: user.email, nombre: user.nombre } });
    } else {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ mensaje: 'Error interno en login' });
  }
});

// Obtener todos los DEA ACTIVOS (APROBADOS)
app.get('/defibriladores', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id_tramite AS id,
        gl_nombre_fantasia AS nombre,
        CONCAT(gl_instalacion_calle, ' ', IFNULL(nr_instalacion_numero, ''), ', ', gl_instalacion_comuna) AS direccion,
        gl_instalacion_latitud AS lat,
        gl_instalacion_longitud AS lng
      FROM tramites
      WHERE bo_activo = 1 AND bo_eliminado = 'N' 
    `); // SOLO bo_activo = 1
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener desfibriladores:', error);
    res.status(500).json({ mensaje: 'Error al obtener datos desde la base' });
  }
});

// (REEMPLAZADO) Insertar nuevo DEA -> Ahora es ENVIAR SOLICITUD DE DEA
// app.post('/defibriladores', ...) // Esta ruta ya no se usará para inserción directa por usuarios

// --- NUEVAS RUTAS PARA SOLICITUDES Y VALIDACIÓN ---

/* app.post('/solicitudes-dea', async (req, res) => {
  // --- RECIBIR NUEVOS CAMPOS ---
  const {
    nombre,
    gl_instalacion_calle, // Viene de formData.calle
    nr_instalacion_numero,  // Viene de formData.numero
    gl_instalacion_comuna,  // Viene de formData.comuna
    // gl_instalacion_otro, // Si lo añades
    lat, lng, solicitante, rut
  } = req.body;

  // Validaciones básicas (puedes hacerlas más específicas para los nuevos campos)
  if (!nombre || !gl_instalacion_calle || !gl_instalacion_comuna || !lat || !lng || !solicitante || !rut) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios (nombre, calle, comuna, lat, lng, solicitante, rut)' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO tramites (
        gl_nombre_fantasia, 
        gl_instalacion_calle,
        nr_instalacion_numero,
        gl_instalacion_comuna,
        -- gl_instalacion_otro, -- Si lo añades
        gl_instalacion_latitud, 
        gl_instalacion_longitud, 
        gl_solicitante_nombre, 
        gl_solicitante_rut,
        bo_activo,
        bo_eliminado,
        fc_creacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'N', NOW())`,
      [
        nombre,
        gl_instalacion_calle,
        (nr_instalacion_numero && nr_instalacion_numero.trim() !== '') ? nr_instalacion_numero : null,
        gl_instalacion_comuna,
        lat, lng, solicitante, rut
      ]
    );

    res.status(201).json({
      mensaje: 'Solicitud de DEA registrada y pendiente de validación.',
      solicitud_creada_id: result.insertId
    });
  } catch (error) {
    console.error('❌ Error al insertar solicitud de DEA:', error);
    res.status(500).json({ mensaje: 'Error al guardar la solicitud' });
  }
}); */


app.post('/solicitudes-dea', async (req, res) => {
  console.log("----------------------------------------------------"); // Separador
  console.log("BACKEND: INICIO PETICIÓN POST /solicitudes-dea");
  console.log("BACKEND: Cuerpo de la petición (req.body):", JSON.stringify(req.body, null, 2));

  const {
    nombre,
    gl_instalacion_calle,
    nr_instalacion_numero,
    gl_instalacion_comuna,
    lat, lng, solicitante, rut
  } = req.body;

  if (!nombre || !gl_instalacion_calle || !gl_instalacion_comuna || !lat || !lng || !solicitante || !rut) {
    console.log("BACKEND: Faltan datos obligatorios. Enviando 400.");
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios (nombre, calle, comuna, lat, lng, solicitante, rut)' });
  }

  const valoresParaInsertar = [
    nombre,
    gl_instalacion_calle,
    (nr_instalacion_numero && nr_instalacion_numero.trim() !== '') ? nr_instalacion_numero.trim() : null, // Añadido .trim() aquí también
    gl_instalacion_comuna,
    lat,
    lng,
    solicitante,
    rut
  ];
  console.log("BACKEND: Valores que se pasarán a la consulta SQL:", JSON.stringify(valoresParaInsertar, null, 2));

  try {
    const sqlQuery = `INSERT INTO tramites (
        gl_nombre_fantasia, 
        gl_instalacion_calle,
        nr_instalacion_numero,
        gl_instalacion_comuna,
        gl_instalacion_latitud, 
        gl_instalacion_longitud, 
        gl_solicitante_nombre, 
        gl_solicitante_rut,
        bo_activo,
        bo_eliminado,
        fc_creacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'N', NOW())`;
    
    console.log("BACKEND: Ejecutando consulta SQL:", sqlQuery);

    const [result] = await db.query(sqlQuery, valoresParaInsertar);
    
    console.log("BACKEND: Inserción exitosa. ID generado:", result.insertId);
    res.status(201).json({
      mensaje: 'Solicitud de DEA registrada y pendiente de validación.',
      solicitud_creada_id: result.insertId
    });

  } catch (error) {
    console.error("----------------------------------------------------"); // Separador
    console.error("❌❌❌ BACKEND: ERROR AL INSERTAR SOLICITUD DE DEA ❌❌❌");
    console.error("Error Object:", error); // <-- ESTE ES EL ERROR DETALLADO QUE NECESITO
    console.error("Stack Trace:", error.stack);
    console.error("----------------------------------------------------"); // Separador
    res.status(500).json({ mensaje: 'Error al guardar la solicitud', detalle: error.message }); // Opcional: enviar error.message al frontend
  }
});


// Obtener todas las SOLICITUDES PENDIENTES de DEA
app.get('/solicitudes-dea', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id_tramite AS id,
        gl_nombre_fantasia AS nombre,
        CONCAT(gl_instalacion_calle, ' ', IFNULL(nr_instalacion_numero, ''), ', ', gl_instalacion_comuna) AS direccion_completa,
        gl_instalacion_calle,
        nr_instalacion_numero,
        gl_instalacion_comuna,
        gl_instalacion_latitud AS lat,
        gl_instalacion_longitud AS lng,
        gl_solicitante_nombre AS solicitante,
        gl_solicitante_rut AS rut,
        fc_creacion
      FROM tramites
      WHERE bo_activo = 0 AND bo_eliminado = 'N' /* Solo pendientes */
      ORDER BY fc_creacion DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener solicitudes pendientes:', error);
    res.status(500).json({ mensaje: 'Error al obtener datos de solicitudes' });
  }
});

// Aprobar una SOLICITUD de DEA
app.post('/solicitudes-dea/:id/aprobar', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      "UPDATE tramites SET bo_activo = 1, fc_actualiza = NOW() WHERE id_tramite = ? AND bo_activo = 0 AND bo_eliminado = 'N'",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada o ya procesada.' });
    }
    res.json({ mensaje: 'Solicitud de DEA aprobada correctamente.' });
  } catch (error) {
    console.error('❌ Error al aprobar solicitud:', error);
    res.status(500).json({ mensaje: 'Error al aprobar la solicitud.' });
  }
});

// Rechazar (eliminar) una SOLICITUD de DEA
app.delete('/solicitudes-dea/:id/rechazar', async (req, res) => {
  const { id } = req.params;
  try {
    // Opción 1: Eliminar físicamente la solicitud pendiente
    const [result] = await db.query(
      "DELETE FROM tramites WHERE id_tramite = ? AND bo_activo = 0 AND bo_eliminado = 'N'",
      [id]
    );
    // Opción 2: Marcar como eliminado o rechazado (si quieres mantener historial)
    // const [result] = await db.query(
    //   "UPDATE tramites SET bo_eliminado = 'S', fc_actualiza = NOW() WHERE id_tramite = ? AND bo_activo = 0",
    //   [id]
    // );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada o ya procesada.' });
    }
    res.json({ mensaje: 'Solicitud de DEA rechazada correctamente.' });
  } catch (error) {
    console.error('❌ Error al rechazar solicitud:', error);
    res.status(500).json({ mensaje: 'Error al rechazar la solicitud.' });
  }
});


// Clicks API (sin cambios)
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

app.get('/api/obtener-clics', async (req, res) => {
  try {
    const [resultados] = await db.query(`
      SELECT seccion, COUNT(*) as cantidad
      FROM clicks
      GROUP BY seccion
    `);
    const data = {};
    resultados.forEach(r => { data[r.seccion] = r.cantidad; });
    res.json(data);
  } catch (error) {
    console.error('❌ Error al obtener clics:', error);
    res.status(500).json({ mensaje: 'Error al obtener datos' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});