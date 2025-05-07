import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Asumiendo que este componente se renderiza dentro del layout de admin
// si no, necesitarías añadir algún estilo básico.

const ValidacionDEAs = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = () => {
    setMensaje('');
    axios.get('http://localhost:3001/solicitudes-dea') // Endpoint para obtener pendientes
      .then(res => setSolicitudes(res.data))
      .catch(err => {
        console.error('Error al cargar solicitudes pendientes', err);
        setMensaje('Error al cargar solicitudes: ' + (err.response?.data?.mensaje || err.message));
      });
  };

  const aprobarSolicitud = (idSolicitud) => {
    setMensaje('');
    axios.post(`http://localhost:3001/solicitudes-dea/${idSolicitud}/aprobar`) // Endpoint para aprobar
    .then(() => {
      setMensaje('Solicitud aprobada con éxito.');
      fetchSolicitudes(); // Recargar la lista
    })
    .catch(err => {
      console.error('Error al aprobar solicitud', err);
      setMensaje('Error al aprobar: ' + (err.response?.data?.mensaje || err.message));
    });
  };

  const rechazarSolicitud = (idSolicitud) => {
    setMensaje('');
    if (window.confirm('¿Estás seguro de que quieres rechazar esta solicitud? Esta acción no se puede deshacer.')) {
      axios.delete(`http://localhost:3001/solicitudes-dea/${idSolicitud}/rechazar`) // Endpoint para rechazar/eliminar
        .then(() => {
          setMensaje('Solicitud rechazada con éxito.');
          fetchSolicitudes(); // Recargar la lista
        })
        .catch(err => {
          console.error('Error al rechazar solicitud', err);
          setMensaje('Error al rechazar: ' + (err.response?.data?.mensaje || err.message));
        });
    }
  };

  // Estilos básicos para mejor visualización
  const cardStyle = {
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const buttonStyle = {
    padding: '8px 15px',
    marginRight: '10px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'white'
  };

  const approveButtonStyle = { ...buttonStyle, backgroundColor: '#28a745' };
  const rejectButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545' };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Validación de Solicitudes DEA Pendientes</h2>

      {mensaje && (
        <p style={{
          padding: '10px',
          backgroundColor: mensaje.startsWith('Error') ? '#f8d7da' : '#d4edda',
          color: mensaje.startsWith('Error') ? '#721c24' : '#155724',
          border: `1px solid ${mensaje.startsWith('Error') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '4px',
          marginBottom: '15px'
        }}>{mensaje}</p>
      )}

      {solicitudes.length === 0 ? (
        <p>No hay solicitudes pendientes de validación en este momento.</p>
      ) : (
        solicitudes.map(s => (
          <div key={s.id} style={cardStyle}>
            <h3>{s.nombre}</h3>
            <p><strong>ID Solicitud:</strong> {s.id}</p>
            <p><strong>Dirección Propuesta:</strong> {s.direccion_completa || `${s.gl_instalacion_calle || ''} ${s.nr_instalacion_numero || ''}, ${s.gl_instalacion_comuna || ''}`.trim()}</p>
            <p><strong>Coordenadas:</strong> Lat: {s.lat}, Lng: {s.lng}</p>
            <p><strong>Solicitante:</strong> {s.solicitante} (RUT: {s.rut})</p>
            <p><strong>Fecha Solicitud:</strong> {new Date(s.fc_creacion).toLocaleString()}</p>
            <div style={{ marginTop: '10px' }}>
              <button onClick={() => aprobarSolicitud(s.id)} style={approveButtonStyle}>Aprobar</button>
              <button onClick={() => rechazarSolicitud(s.id)} style={rejectButtonStyle}>Rechazar</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ValidacionDEAs;