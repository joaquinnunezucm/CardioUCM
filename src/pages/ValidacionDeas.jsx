import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';

const ValidacionDEAs = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const tableRef = useRef();

  const fetchSolicitudes = async () => {
    try {
      const res = await axios.get('http://localhost:3001/solicitudes-dea');
      setSolicitudes(res.data);
    } catch (err) {
      console.error('Error al cargar solicitudes:', err);
      Swal.fire('Error', 'No se pudieron cargar las solicitudes.', 'error');
    }
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  useEffect(() => {
    if (solicitudes.length) {
      const table = $(tableRef.current).DataTable({
        destroy: true,
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ solicitudes',
          paginate: { previous: 'Anterior', next: 'Siguiente' },
          zeroRecords: 'No hay solicitudes pendientes'
        }
      });

      return () => table.destroy();
    }
  }, [solicitudes]);

  const handleAction = async (action, id, nombre) => {
    const accionStr = action === 'aprobar' ? 'Aprobar' : 'Rechazar';
    const confirmText = `¿Estás seguro de que deseas ${accionStr.toLowerCase()} la solicitud de "${nombre}"?`;

    const result = await Swal.fire({
      title: `${accionStr} Solicitud`,
      text: confirmText,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accionStr}`,
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        if (action === 'aprobar') {
          await axios.post(`http://localhost:3001/solicitudes-dea/${id}/aprobar`);
          Swal.fire('Aprobada', `La solicitud de "${nombre}" fue aprobada.`, 'success');
        } else {
          await axios.delete(`http://localhost:3001/solicitudes-dea/${id}/rechazar`);
          Swal.fire('Rechazada', `La solicitud de "${nombre}" fue rechazada.`, 'info');
        }
        fetchSolicitudes();
      } catch (err) {
        console.error(`Error al ${action}:`, err);
        Swal.fire('Error', `No se pudo ${action} la solicitud.`, 'error');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="container mt-4">
      <div className="table-responsive">
        <table ref={tableRef} className="table table-bordered table-hover">
          <thead className="thead-light">
            <tr>
              <th>Nombre</th>
              <th>Dirección</th>
              <th>Latitud</th>
              <th>Longitud</th>
              <th>Solicitante</th>
              <th>Fecha</th>
              <th style={{ width: '160px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map(s => (
              <tr key={s.id}>
                <td>{s.nombre || 'N/A'}</td>
                <td>{s.direccion_completa || `${s.gl_instalacion_calle} ${s.nr_instalacion_numero}, ${s.gl_instalacion_comuna}`}</td>
                <td>{s.lat || 'N/D'}</td>
                <td>{s.lng || 'N/D'}</td>
                <td>{s.solicitante || 'N/A'}<br /><small>{s.rut}</small></td>
                <td>{s.fc_creacion ? new Date(s.fc_creacion).toLocaleString('es-CL') : 'N/A'}</td>
                <td className="text-center">
                  <button className="btn btn-success btn-sm mr-2" disabled={isProcessing} onClick={() => handleAction('aprobar', s.id, s.nombre)}>
                    <i className="fas fa-check mr-1"></i> Aprobar
                  </button>
                  <button className="btn btn-danger btn-sm" disabled={isProcessing} onClick={() => handleAction('rechazar', s.id, s.nombre)}>
                    <i className="fas fa-times mr-1"></i> Rechazar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ValidacionDEAs;
