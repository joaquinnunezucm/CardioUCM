import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

// Icono personalizado para los DEAs
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Icono para la ubicación del usuario
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Componente para centrar el mapa cuando la posición cambia
const CenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 16);
    }
  }, [position, map]);
  return null;
};

// Componente para manejar clics en el mapa y pre-rellenar el formulario
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

// Función para calcular la distancia entre dos coordenadas (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Radio de la Tierra en km
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
  const [formData, setFormData] = useState({
    nombre: '',
    calle: '',
    numero: '',
    comuna: '',
    lat: '',
    lng: '',
    solicitante: '',
    rut: '',
  });
  const initialCenter = useRef([-35.428542, -71.672308]);
  const [center, setCenter] = useState(initialCenter.current);
  const [userLocation, setUserLocation] = useState(null);
  const markersRef = useRef({});
  const [submissionMessage, setSubmissionMessage] = useState('');
  const formRef = useRef(null);
  const [cercanos, setCercanos] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:3001/defibriladores')
      .then(res => {
        setDesfibriladores(res.data);
      })
      .catch(err => {
        console.error("Error cargando DEAs aprobados:", err);
      });
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = [position.coords.latitude, position.coords.longitude];
          setUserLocation(userPos);
          if (center[0] === initialCenter.current[0] && center[1] === initialCenter.current[1]) {
            setCenter(userPos);
          }
        },
        (error) => {
          console.error("Error obteniendo ubicación del usuario:", error);
        }
      );
    }
  }, []); // Removí 'center' de las dependencias para evitar bucles no deseados

  useEffect(() => {
    if (formVisible && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [formVisible]);

  const getClosestDEA = (allDeas, currentUserLocation) => {
    if (!currentUserLocation || allDeas.length === 0) {
      return [];
    }
    return [...allDeas]
      .map((dea) => {
        const lat = parseFloat(dea.lat);
        const lng = parseFloat(dea.lng);
        if (isNaN(lat) || isNaN(lng)) {
          return { ...dea, distancia: Infinity };
        }
        return {
          ...dea,
          distancia: getDistance(currentUserLocation[0], currentUserLocation[1], lat, lng)
        };
      })
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, 10);
  };
  
  useEffect(() => {
      if (userLocation && desfibriladores.length > 0) {
          setCercanos(getClosestDEA(desfibriladores, userLocation));
      } else {
          setCercanos([]);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, desfibriladores]);


  const resetForm = () => {
    setFormData({
      nombre: '', calle: '', numero: '', comuna: '',
      lat: '', lng: '', solicitante: '', rut: ''
    });
    setFormVisible(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmissionMessage('');
    const dataParaEnviar = { // Asegúrate que estos nombres coincidan con el backend
        nombre: formData.nombre,
        gl_instalacion_calle: formData.calle,
        nr_instalacion_numero: formData.numero,
        gl_instalacion_comuna: formData.comuna,
        lat: formData.lat,
        lng: formData.lng,
        solicitante: formData.solicitante,
        rut: formData.rut,
    };
    axios.post('http://localhost:3001/solicitudes-dea', dataParaEnviar)
      .then(res => {
        setSubmissionMessage('Solicitud enviada para validación. ¡Gracias!');
        resetForm();
        setTimeout(() => setSubmissionMessage(''), 5000);
      })
      .catch(err => {
        const errorMsg = err.response?.data?.mensaje || 'Error al enviar la solicitud. Intente más tarde.';
        setSubmissionMessage(`Error: ${errorMsg}`);
      });
  };

  const focusMarker = (id, lat, lng) => {
    setCenter([parseFloat(lat), parseFloat(lng)]);
    setTimeout(() => {
      markersRef.current[id]?.openPopup();
    }, 300);
  };

  const mapButtonStyle = {
    position: 'absolute',
    zIndex: 1000,
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    padding: '10px 15px',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    fontSize: '14px'
  };
  
  // Estilo para el mensaje de submission
  const submissionMessageStyle = {
      position: 'absolute', top: 110,
      left: '50%', transform: 'translateX(-50%)',
      zIndex: 1001, 
      padding: '12px 20px', borderRadius: '5px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', textAlign: 'center',
      fontSize: '14px', width: 'auto', maxWidth: '90%'
  };

  // Estilo para los botones de la lista de DEAs cercanos
  const listItemButtonStyle = {
      cursor: 'pointer', background: '#fff', border: '1px solid #ddd',
      padding: '10px 15px', borderRadius: '4px', width: '100%',
      textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'background-color 0.2s ease, box-shadow 0.2s ease'
  };


  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '10px', backgroundColor: '#f0f2f5', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 20px)', boxSizing: 'border-box' }}>
      <div style={{ flexShrink: 0, height: '50%', minHeight: '350px', position: 'relative', marginBottom: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
          <CenterMap position={center} />
          <ClickHandler setFormVisible={setFormVisible} setFormData={setFormData} />
          {userLocation && <Marker position={userLocation} icon={userIcon}><Popup>Estás aquí</Popup></Marker>}
          {cercanos.map((d) => (
            <Marker 
              key={d.id} 
              position={[parseFloat(d.lat), parseFloat(d.lng)]} 
              icon={customIcon} 
              ref={(ref) => (markersRef.current[d.id] = ref)}
            >
              <Popup><b>{d.nombre}</b><br />{d.direccion}</Popup>
            </Marker>
          ))}
        </MapContainer>

        <button onClick={() => { setFormVisible(!formVisible); if (formVisible) setSubmissionMessage(''); }} style={{ ...mapButtonStyle, top: 10, right: 10, background: formVisible ? '#6c757d' : '#007bff' }}>
          {formVisible ? 'Cerrar Formulario' : 'Sugerir Nuevo DEA'}
        </button>
        <button onClick={() => { if (userLocation) { setCenter([...userLocation]); } else { alert("No se ha podido obtener tu ubicación actual."); }}} style={{ ...mapButtonStyle, top: 60, right: 10, background: '#17a2b8' }}>
          Mi Ubicación
        </button>
        {/* CORRECCIÓN: Aplicando el estilo definido y el condicional para color */}
        {submissionMessage && ( 
            <div style={{
                ...submissionMessageStyle,
                background: submissionMessage.startsWith('Error') ? '#f8d7da' : '#d4edda',
                color: submissionMessage.startsWith('Error') ? '#721c24' : '#155724',
                border: `1px solid ${submissionMessage.startsWith('Error') ? '#f5c6cb' : '#c3e6cb'}`
            }}>
                {submissionMessage}
            </div>
        )}
      </div>

      {/* Esta es la línea donde estaba el error (222 o 223 según tu último mensaje) */}
      <div style={{ flexGrow: 1, overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', padding: '0px' }}>
        {formVisible && (
          <form ref={formRef} onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '20px', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Sugerir Nuevo DEA
            </h4>
            {[
              { id: 'nombreLugar', label: 'Nombre del Lugar:', type: 'text', placeholder: 'Ej: Centro Comercial XYZ', value: formData.nombre, field: 'nombre', required: true },
            ].map(input => (
              <div key={input.id} style={{ marginBottom: '15px' }}>
                <label htmlFor={input.id} style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#495057'}}>{input.label}</label>
                <input id={input.id} type={input.type} placeholder={input.placeholder} value={input.value} onChange={(e) => setFormData({ ...formData, [input.field]: e.target.value })} required={input.required} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '14px' }} />
              </div>
            ))}
            <h5 style={{marginTop: '20px', marginBottom: '10px', fontSize: '16px', color: '#343a40'}}>Dirección de Instalación:</h5>
            {[
              { id: 'calle', label: 'Calle:', type: 'text', placeholder: 'Ej: Av. Siempre Viva', value: formData.calle, field: 'calle', required: true },
              { id: 'numero', label: 'Número:', type: 'text', placeholder: 'Ej: 742 (opcional si no aplica)', value: formData.numero, field: 'numero', required: false },
              { id: 'comuna', label: 'Comuna:', type: 'text', placeholder: 'Ej: Springfield', value: formData.comuna, field: 'comuna', required: true },
            ].map(input => (
              <div key={input.id} style={{ marginBottom: '15px' }}>
                <label htmlFor={input.id} style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#495057'}}>{input.label}</label>
                <input id={input.id} type={input.type} placeholder={input.placeholder} value={input.value} onChange={(e) => setFormData({ ...formData, [input.field]: e.target.value })} required={input.required} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '14px' }} />
              </div>
            ))}
            <h5 style={{marginTop: '20px', marginBottom: '10px', fontSize: '16px', color: '#343a40'}}>Coordenadas Geográficas (Clic en mapa para auto-rellenar):</h5>
            {[
              { id: 'latitud', label: 'Latitud:', type: 'number', step: "any", placeholder: 'Ej: -35.123456', value: formData.lat, field: 'lat', required: true },
              { id: 'longitud', label: 'Longitud:', type: 'number', step: "any", placeholder: 'Ej: -71.123456', value: formData.lng, field: 'lng', required: true },
            ].map(input => (
              <div key={input.id} style={{ marginBottom: '15px' }}>
                <label htmlFor={input.id} style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#495057'}}>{input.label}</label>
                <input id={input.id} type={input.type} step={input.step} placeholder={input.placeholder} value={input.value} onChange={(e) => setFormData({ ...formData, [input.field]: e.target.value })} required={input.required} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '14px' }} />
              </div>
            ))}
            <h5 style={{marginTop: '20px', marginBottom: '10px', fontSize: '16px', color: '#343a40'}}>Información del Solicitante:</h5>
            {[
              { id: 'solicitante', label: 'Nombre del Solicitante:', type: 'text', placeholder: 'Nombre completo', value: formData.solicitante, field: 'solicitante', required: true },
              { id: 'rut', label: 'RUT del Solicitante:', type: 'text', placeholder: 'Ej: 12345678-9', value: formData.rut, field: 'rut', required: true },
            ].map(input => (
              <div key={input.id} style={{ marginBottom: input.id === 'rut' ? '25px' : '15px' }}>
                <label htmlFor={input.id} style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#495057'}}>{input.label}</label>
                <input id={input.id} type={input.type} placeholder={input.placeholder} value={input.value} onChange={(e) => setFormData({ ...formData, [input.field]: e.target.value })} required={input.required} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '14px' }} />
              </div>
            ))}
            <button type="submit" style={{ width: '100%', background: '#28a745', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
              Enviar Solicitud
            </button>
          </form>
        )}

        {!formVisible && (
          <div style={{padding: '20px'}}>
            <h3 style={{ marginTop: '0', marginBottom: '15px', color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '5px' }}>
              10 Desfibriladores Activos más Cercanos
            </h3>
            {cercanos.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {cercanos.map((d) => (
                  <li key={d.id} style={{ marginBottom: '10px' }}>
                    {/* CORRECCIÓN: Aplicando el estilo definido */}
                    <button
                      onClick={() => focusMarker(d.id, d.lat, d.lng)}
                      style={listItemButtonStyle}
                      onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';}}
                      onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';}}
                    >
                      <strong style={{ color: '#007bff' }}>{d.nombre}</strong> - {d.direccion ? d.direccion : "Dirección no disponible"}
                      <span style={{ float: 'right', color: '#6c757d', fontSize: '13px' }}>
                        {typeof d.distancia === 'number' && !isNaN(d.distancia) ? `(${d.distancia.toFixed(2)} km)` : "(Dist. no disp.)"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : ( userLocation ? <p style={{color: '#6c757d'}}>No hay DEAs activos registrados cerca de tu ubicación o no se pudo calcular la distancia.</p> : <p style={{color: '#6c757d'}}>Obteniendo tu ubicación para mostrar DEAs cercanos...</p> )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UbicacionDEA;