import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
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

const ClickHandler = ({ setFormVisible, setFormData }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setFormVisible(true);
      setFormData((prev) => ({
        ...prev,
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
      }));
    },
  });
  return null;
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const UbicacionDEA = () => {
  const [desfibriladores, setDesfibriladores] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', direccion: '', lat: '', lng: '', solicitante: '', rut: '' });
  const [center, setCenter] = useState([-35.428542, -71.672308]);
  const [userLocation, setUserLocation] = useState(null);
  const markersRef = useRef({});

  useEffect(() => {
    axios.get('http://localhost:3001/defibriladores')
      .then(res => setDesfibriladores(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userPos = [position.coords.latitude, position.coords.longitude];
        setUserLocation(userPos);
        setCenter(userPos);
      });
    }
  }, []);

  const getClosestDEA = () => {
    if (!userLocation || desfibriladores.length === 0) return [];
    return [...desfibriladores]
      .map((dea) => ({
        ...dea,
        distancia: getDistance(userLocation[0], userLocation[1], parseFloat(dea.lat), parseFloat(dea.lng))
      }))
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, 10);
  };

  const resetForm = () => {
    setFormData({ nombre: '', direccion: '', lat: '', lng: '', solicitante: '', rut: '' });
    setFormVisible(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('http://localhost:3001/defibriladores', formData)
      .then(res => {
        setDesfibriladores(prev => [...prev, res.data.desfibrilador]);
        resetForm();
      })
      .catch(err => alert('Error al guardar: ' + err.message));
  };

  const focusMarker = (id, lat, lng) => {
    setCenter([lat, lng]);
    setTimeout(() => {
      markersRef.current[id]?.openPopup();
    }, 300);
  };

  const cercanos = getClosestDEA();

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 10 }}>
      <div style={{ height: '500px', position: 'relative' }}>
        <MapContainer center={center} zoom={14} style={{ height: '100%' }}>
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; OpenStreetMap contributors'
          />
          <CenterMap position={center} />
          <ClickHandler setFormVisible={setFormVisible} setFormData={setFormData} />
          {cercanos.map((d) => (
            <Marker
              key={d.id}
              position={[parseFloat(d.lat), parseFloat(d.lng)]}
              icon={customIcon}
              ref={(ref) => (markersRef.current[d.id] = ref)}
            >
              <Popup>
                <b>{d.nombre}</b><br />
                {d.direccion}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <button
          onClick={() => setFormVisible(!formVisible)}
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: '#007bff', color: 'white', border: 'none', borderRadius: 5, padding: '8px 12px', cursor: 'pointer' }}
        >
          {formVisible ? 'Cerrar' : 'Crear'}
        </button>

        {formVisible && (
          <form onSubmit={handleSubmit} style={{ position: 'absolute', top: 60, right: 10, zIndex: 1000, background: 'white', padding: 10, borderRadius: 5, boxShadow: '0px 0px 10px rgba(0,0,0,0.2)', width: '250px' }}>
            <h4 className="mb-2">Registrar nuevo DEA</h4>
            <input type="text" placeholder="Nombre del lugar" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required style={{ width: '100%', marginBottom: 5 }} />
            <input type="text" placeholder="Dirección" value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} required style={{ width: '100%', marginBottom: 5 }} />
            <input type="number" placeholder="Latitud" value={formData.lat} onChange={(e) => setFormData({ ...formData, lat: e.target.value })} required style={{ width: '100%', marginBottom: 5 }} />
            <input type="number" placeholder="Longitud" value={formData.lng} onChange={(e) => setFormData({ ...formData, lng: e.target.value })} required style={{ width: '100%', marginBottom: 5 }} />
            <input type="text" placeholder="Nombre del solicitante" value={formData.solicitante} onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })} required style={{ width: '100%', marginBottom: 5 }} />
            <input type="text" placeholder="RUT del solicitante" value={formData.rut} onChange={(e) => setFormData({ ...formData, rut: e.target.value })} required style={{ width: '100%', marginBottom: 10 }} />
            <button type="submit" style={{ width: '100%', background: '#28a745', color: 'white', padding: 6 }}>
              Guardar
            </button>
          </form>
        )}
      </div>

      <h3 style={{ marginTop: 20 }}>10 desfibriladores más cercanos:</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {cercanos.map((d) => (
          <li key={d.id} style={{ marginBottom: 5 }}>
            <button onClick={() => focusMarker(d.id, d.lat, d.lng)} style={{ cursor: 'pointer', background: '#f8f9fa', border: '1px solid #ccc', padding: '6px 10px', borderRadius: 4, width: '100%', textAlign: 'left' }}>
              <strong>{d.nombre}</strong> - {d.direccion} ({d.distancia.toFixed(2)} km)
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UbicacionDEA;