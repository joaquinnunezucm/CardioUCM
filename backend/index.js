const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Lista simulada de 10 desfibriladores
const desfibriladores = [
    {
      id: 1,
      nombre: "Campus San Miguel - UCM",
      lat: -35.428542,
      lng: -71.672308,
      direccion: "Avenida San Miguel 3605, Talca",
    },
    {
      id: 2,
      nombre: "Estadio Fiscal de Talca",
      lat: -35.430525,
      lng: -71.668107,
      direccion: "Av. Circunvalación Oriente 1055, Talca",
    },
    {
      id: 3,
      nombre: "CESFAM Las Américas",
      lat: -35.434765,
      lng: -71.651200,
      direccion: "Calle 6 Norte 1220, Talca",
    },
    {
      id: 4,
      nombre: "Hospital Regional de Talca",
      lat: -35.422222,
      lng: -71.658888,
      direccion: "Calle 1 Poniente 1800, Talca",
    },
    {
      id: 5,
      nombre: "Mall Plaza Maule",
      lat: -35.442200,
      lng: -71.648900,
      direccion: "Av. Circunvalación 1050, Talca",
    },
    {
      id: 6,
      nombre: "Centro de Salud Lircay",
      lat: -35.420000,
      lng: -71.673000,
      direccion: "Lircay 1900, Talca",
    },
    {
      id: 7,
      nombre: "Bomberos Talca - Compañía 1",
      lat: -35.428000,
      lng: -71.660000,
      direccion: "Calle 3 Norte 200, Talca",
    },
    {
      id: 8,
      nombre: "Colegio Inglés de Talca",
      lat: -35.438000,
      lng: -71.680000,
      direccion: "Camino a Lircay 2500, Talca",
    },
    {
      id: 9,
      nombre: "Parque Río Claro",
      lat: -35.436000,
      lng: -71.663000,
      direccion: "Costanera Río Claro, Talca",
    },
    {
      id: 10,
      nombre: "Clínica Lircay",
      lat: -35.426500,
      lng: -71.674800,
      direccion: "Av. San Miguel 3500, Talca",
    }
  ];

app.get('/defibriladores', (req, res) => {
  res.json(desfibriladores);
});

app.post('/defibriladores', (req, res) => {
  const { nombre, direccion, lat, lng } = req.body;

  if (!nombre || !direccion || !lat || !lng) {
    return res.status(400).json({ mensaje: 'Faltan datos' });
  }

  const nuevo = {
    id: desfibriladores.length + 1,
    nombre,
    direccion,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
  };

  desfibriladores.push(nuevo);

  res.status(201).json({ mensaje: 'Desfibrilador agregado', desfibrilador: nuevo });
});

// Eliminar todos (opcional para testing)
app.delete('/defibriladores', (req, res) => {
  desfibriladores = [];
  res.json({ mensaje: 'Lista de desfibriladores borrada' });
});

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
