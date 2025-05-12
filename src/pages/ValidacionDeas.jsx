// src/pages/ValidacionDEAs.jsx
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext.jsx'; // Opcional si necesitas el usuario aquí

const ValidacionDEAs = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // Para deshabilitar botones durante acción

  const fetchSolicitudes = useCallback(() => {
    setMensaje('');
    setLoading(true);
    axios.get('http://localhost:3001/solicitudes-dea')
      .then(res => {
        setSolicitudes(res.data);
      })
      .catch(err => {
        console.error('Error al cargar solicitudes pendientes', err);
        setMensaje('Error al cargar solicitudes: ' + (err.response?.data?.mensaje || err.message));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []); // fetchSolicitudes no tiene dependencias que cambien

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]); // Se llama una vez al montar

  const handleAction = async (actionType, idSolicitud, nombreSolicitud) => {
    const confirmAction = actionType === 'aprobar' ? 'APROBAR' : 'RECHAZAR';
    const confirmMessage = `¿Estás seguro de que quieres ${confirmAction} la solicitud para "${nombreSolicitud || 'este DEA'}"?`;

    if (window.confirm(confirmMessage)) {
      setIsProcessing(true);
      setMensaje(`Procesando ${actionType === 'aprobar' ? 'aprobación' : 'rechazo'}...`);
      try {
        if (actionType === 'aprobar') {
          await axios.post(`http://localhost:3001/solicitudes-dea/${idSolicitud}/aprobar`);
        } else {
          await axios.delete(`http://localhost:3001/solicitudes-dea/${idSolicitud}/rechazar`);
        }
        setMensaje(`Solicitud para "${nombreSolicitud || 'DEA'}" ${actionType === 'aprobar' ? 'aprobada' : 'rechazada'} con éxito.`);
        fetchSolicitudes(); // Recargar la lista
      } catch (err) {
        console.error(`Error al ${actionType} solicitud`, err);
        setMensaje(`Error al ${actionType}: ` + (err.response?.data?.mensaje || err.message));
      } finally {
        setIsProcessing(false);
      }
    } else {
      setMensaje(`${actionType === 'aprobar' ? 'Aprobación' : 'Rechazo'} cancelado por el usuario.`);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">Validación de Solicitudes DEA</h1></div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/admin">Dashboard</Link></li>
                <li className="breadcrumb-item active">Validación DEAs</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          {mensaje && (
            <div className={`alert ${mensaje.startsWith('Error') ? 'alert-danger' : (mensaje.includes('cancelad') || mensaje.includes('Procesando') ? 'alert-info' : 'alert-success')} alert-dismissible fade show`} role="alert">
              {mensaje}
              <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={() => setMensaje('')}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center p-5"><i className="fas fa-spinner fa-spin fa-3x"></i><p className="mt-2">Cargando solicitudes...</p></div>
          ) : solicitudes.length === 0 ? (
            <div className="card shadow-sm"><div className="card-body text-center text-muted">No hay solicitudes pendientes de validación en este momento.</div></div>
          ) : (
            solicitudes.map(s => (
              <div key={s.id} className="card shadow-sm mb-3">
                <div className="card-header">
                  <h5 className="card-title mb-0">{s.nombre || 'Nombre no especificado'} (ID: {s.id})</h5>
                </div>
                <div className="card-body">
                  <p><strong>Dirección:</strong> {s.direccion_completa || `${s.gl_instalacion_calle || ''} ${s.nr_instalacion_numero || ''}, ${s.gl_instalacion_comuna || ''}`.replace(/ , $/, '').trim() || 'N/D'}</p>
                  <p><strong>Coordenadas:</strong> Lat: {s.lat || 'N/D'}, Lng: {s.lng || 'N/D'}</p>
                  <p><strong>Solicitante:</strong> {s.solicitante || 'N/A'} (RUT: {s.rut || 'N/A'})</p>
                  <p><strong>Fecha Solicitud:</strong> {s.fc_creacion ? new Date(s.fc_creacion).toLocaleString('es-ES') : 'N/A'}</p>
                </div>
                <div className="card-footer text-right bg-light">
                  <button onClick={() => handleAction('aprobar', s.id, s.nombre)} className="btn btn-success btn-sm mr-2" disabled={isProcessing}>
                    <i className="fas fa-check mr-1"></i> Aprobar
                  </button>
                  <button onClick={() => handleAction('rechazar', s.id, s.nombre)} className="btn btn-danger btn-sm" disabled={isProcessing}>
                    <i className="fas fa-times mr-1"></i> Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
};

export default ValidacionDEAs;