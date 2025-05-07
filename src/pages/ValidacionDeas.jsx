import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ValidacionDEAs = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [mensaje, setMensaje] = useState(''); // Para mensajes de éxito o error después de la acción

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = () => {
    setMensaje(''); // Limpiar mensaje anterior al recargar
    axios.get('http://localhost:3001/solicitudes-dea')
      .then(res => setSolicitudes(res.data))
      .catch(err => {
        console.error('Error al cargar solicitudes pendientes', err);
        setMensaje('Error al cargar solicitudes: ' + (err.response?.data?.mensaje || err.message));
      });
  };

  const aprobarSolicitud = (idSolicitud, nombreSolicitud) => {
    // --- MENSAJE DE CONFIRMACIÓN ANTES DE APROBAR ---
    if (window.confirm(`¿Estás seguro de que quieres APROBAR la solicitud para "${nombreSolicitud || 'este DEA'}"?`)) {
      setMensaje('Procesando aprobación...'); // Mensaje de feedback inmediato
      axios.post(`http://localhost:3001/solicitudes-dea/${idSolicitud}/aprobar`)
      .then(() => {
        setMensaje(`Solicitud para "${nombreSolicitud || 'DEA'}" aprobada con éxito.`);
        fetchSolicitudes(); // Recargar la lista de solicitudes pendientes
        window.dispatchEvent(new CustomEvent('refrescarEstadisticasAdmin'));
        console.log("ValidacionDEAs: Evento 'refrescarEstadisticasAdmin' disparado tras aprobación.");
      })
      .catch(err => {
        console.error('Error al aprobar solicitud', err);
        setMensaje('Error al aprobar: ' + (err.response?.data?.mensaje || err.message));
      });
    } else {
      setMensaje('Aprobación cancelada por el usuario.');
      setTimeout(() => setMensaje(''), 3000); // Limpiar mensaje de cancelación
    }
  };

  const rechazarSolicitud = (idSolicitud, nombreSolicitud) => {
    // --- MENSAJE DE CONFIRMACIÓN ANTES DE RECHAZAR ---
    // El window.confirm ya estaba, lo mantenemos y podemos mejorar el mensaje
    if (window.confirm(`¿Estás seguro de que quieres RECHAZAR la solicitud para "${nombreSolicitud || 'este DEA'}"? Esta acción usualmente no se puede deshacer.`)) {
      setMensaje('Procesando rechazo...'); // Mensaje de feedback inmediato
      axios.delete(`http://localhost:3001/solicitudes-dea/${idSolicitud}/rechazar`)
        .then(() => {
          setMensaje(`Solicitud para "${nombreSolicitud || 'DEA'}" rechazada con éxito.`);
          fetchSolicitudes(); // Recargar la lista
          // Opcional: Disparar evento de refresco si el rechazo afecta alguna estadística global
          // window.dispatchEvent(new CustomEvent('refrescarEstadisticasAdmin'));
        })
        .catch(err => {
          console.error('Error al rechazar solicitud', err);
          setMensaje('Error al rechazar: ' + (err.response?.data?.mensaje || err.message));
        });
    } else {
      setMensaje('Rechazo cancelado por el usuario.');
      setTimeout(() => setMensaje(''), 3000); // Limpiar mensaje de cancelación
    }
  };

  // Estilos (sin cambios)
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
    color: 'white',
    fontSize: '14px'
  };
  const approveButtonStyle = { ...buttonStyle, backgroundColor: '#28a745' };
  const rejectButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545' };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#333' }}>Validación de Solicitudes DEA Pendientes</h2>

      {mensaje && (
        <p style={{
          padding: '10px',
          // Cambiar color de fondo si es un mensaje de "procesando" o "cancelado"
          backgroundColor: mensaje.includes('Procesando') ? '#e2e3e5' : (mensaje.includes('cancelad') ? '#fff3cd' : (mensaje.startsWith('Error') ? '#f8d7da' : '#d4edda')),
          color: mensaje.includes('Procesando') || mensaje.includes('cancelad') ? '#383d41' : (mensaje.startsWith('Error') ? '#721c24' : '#155724'),
          border: `1px solid ${mensaje.includes('Procesando') ? '#d6d8db' : (mensaje.includes('cancelad') ? '#ffeeba' : (mensaje.startsWith('Error') ? '#f5c6cb' : '#c3e6cb'))}`,
          borderRadius: '4px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>{mensaje}</p>
      )}

      {solicitudes.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6c757d', fontSize: '1.1em' }}>No hay solicitudes pendientes de validación en este momento.</p>
      ) : (
        solicitudes.map(s => (
          <div key={s.id} style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#007bff' }}>{s.nombre || 'Nombre no especificado'}</h3>
            <p><strong>ID Solicitud:</strong> {s.id}</p>
            <p><strong>Dirección Propuesta:</strong> {s.direccion_completa || `${s.gl_instalacion_calle || ''} ${s.nr_instalacion_numero || ''}, ${s.gl_instalacion_comuna || ''}`.replace(/ , $/, '').trim() || 'Dirección no especificada'}</p>
            <p><strong>Coordenadas:</strong> Lat: {s.lat}, Lng: {s.lng}</p>
            <p><strong>Solicitante:</strong> {s.solicitante || 'N/A'} (RUT: {s.rut || 'N/A'})</p>
            <p><strong>Fecha Solicitud:</strong> {s.fc_creacion ? new Date(s.fc_creacion).toLocaleString() : 'N/A'}</p>
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee', textAlign: 'right' }}>
              {/* Pasar s.nombre a las funciones para usarlo en el mensaje de confirmación */}
              <button onClick={() => aprobarSolicitud(s.id, s.nombre)} style={approveButtonStyle}>Aprobar</button>
              <button onClick={() => rechazarSolicitud(s.id, s.nombre)} style={rejectButtonStyle}>Rechazar</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ValidacionDEAs;