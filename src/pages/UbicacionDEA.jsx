import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const CenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 16);
  }, [position, map]);
  return null;
};

const App = () => {
  const [desfibriladores, setDesfibriladores] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' o 'edit'
  const [formData, setFormData] = useState({ id: null, nombre: '', direccion: '', lat: '', lng: '' });
  const [center, setCenter] = useState([-35.428542, -71.672308]);
  const markersRef = useRef({});

  useEffect(() => {
    axios.get('http://localhost:3001/defibriladores')
      .then(res => setDesfibriladores(res.data))
      .catch(err => console.error(err));
  }, []);

  const resetForm = () => {
    setFormData({ id: null, nombre: '', direccion: '', lat: '', lng: '' });
    setFormVisible(false);
    setFormMode('create');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const method = formMode === 'edit' ? 'put' : 'post';
    const url = formMode === 'edit'
      ? `http://localhost:3001/defibriladores/${formData.id}`
      : `http://localhost:3001/defibriladores`;

    axios[method](url, formData)
      .then(res => {
        if (formMode === 'edit') {
          setDesfibriladores(prev =>
            prev.map(d => d.id === formData.id ? res.data.updated || res.data : d)
          );
        } else {
          setDesfibriladores(prev => [...prev, res.data.desfibrilador || res.data]);
        }
        resetForm();
      })
      .catch(err => alert('Error: ' + err));
  };

  const handleDelete = (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este desfibrilador?')) return;
    axios.delete(`http://localhost:3001/defibriladores/${id}`)
      .then(() => {
        setDesfibriladores(prev => prev.filter(d => d.id !== id));
      })
      .catch(err => alert('Error al eliminar: ' + err));
  };

  const startEdit = (d) => {
    setFormData({ ...d });
    setFormMode('edit');
    setFormVisible(true);
  };

  const focusMarker = (id, lat, lng) => {
    setCenter([lat, lng]);
    setTimeout(() => {
      markersRef.current[id]?.openPopup();
    }, 300);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 10 }}>
      <div style={{ height: '500px', position: 'relative' }}>
        <MapContainer center={center} zoom={14} style={{ height: '100%' }}>
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; OpenStreetMap contributors'
          />
          <CenterMap position={center} />
          {desfibriladores.map((d) => (
            <Marker
              key={d.id}
              position={[d.lat, d.lng]}
              icon={customIcon}
              ref={(ref) => (markersRef.current[d.id] = ref)}
            >
              <Popup>
                <b>{d.nombre}</b><br />
                {d.direccion}<br />
                <button onClick={() => startEdit(d)} style={{ marginTop: 5 }}>✏️ Editar</button><br />
                <button onClick={() => handleDelete(d.id)} style={{ color: 'red' }}>🗑️ Eliminar</button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Botón Crear */}
        <button
          onClick={() => {
            setFormMode('create');
            setFormVisible(!formVisible);
            resetForm();
          }}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1000,
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            padding: '8px 12px',
            cursor: 'pointer'
          }}
        >
          {formVisible ? 'Cerrar' : 'Crear'}
        </button>

        {/* Formulario */}
        {formVisible && (
          <form
            onSubmit={handleSubmit}
            style={{
              position: 'absolute',
              top: 60,
              right: 10,
              zIndex: 1000,
              background: 'white',
              padding: 10,
              borderRadius: 5,
              boxShadow: '0px 0px 10px rgba(0,0,0,0.2)',
              width: '250px'
            }}
          >
            <h4>{formMode === 'edit' ? 'Editar' : 'Agregar'} desfibrilador</h4>
            <input
              type="text"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              style={{ width: '100%', marginBottom: 5 }}
            />
            <input
              type="text"
              placeholder="Dirección"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              required
              style={{ width: '100%', marginBottom: 5 }}
            />
            <input
              type="number"
              placeholder="Latitud"
              value={formData.lat}
              onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
              required
              style={{ width: '100%', marginBottom: 5 }}
            />
            <input
              type="number"
              placeholder="Longitud"
              value={formData.lng}
              onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
              required
              style={{ width: '100%', marginBottom: 5 }}
            />
            <button type="submit" style={{ width: '100%', background: '#28a745', color: 'white', padding: 5 }}>
              {formMode === 'edit' ? 'Guardar Cambios' : 'Guardar'}
            </button>
          </form>
        )}
      </div>

      {/* Lista de desfibriladores */}
      <h3 style={{ marginTop: 20 }}>Ubicaciones registradas:</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {desfibriladores.map((d) => (
          <li key={d.id} style={{ marginBottom: 5 }}>
            <button
              onClick={() => focusMarker(d.id, d.lat, d.lng)}
              style={{
                cursor: 'pointer',
                background: '#f8f9fa',
                border: '1px solid #ccc',
                padding: '6px 10px',
                borderRadius: 4,
                width: '100%',
                textAlign: 'left'
              }}
            >
              <strong>{d.nombre}</strong> - {d.direccion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
