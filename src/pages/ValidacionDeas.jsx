import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { API_BASE_URL } from '../utils/api';

const ValidacionDEAs = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableInitialized, setTableInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const tableRef = useRef(null);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      if ($.fn.dataTable.isDataTable(tableRef.current)) {
        $(tableRef.current).DataTable().destroy();
        setTableInitialized(false);
      }
      const res = await axios.get(`${API_BASE_URL}/api/solicitudes-dea`);

      setSolicitudes(res.data);
    } catch (err) {
      Swal.fire('Error', 'No se pudieron cargar las solicitudes.', 'error');
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  useEffect(() => {
    if (!loading && solicitudes.length > 0 && !tableInitialized) {
      $(tableRef.current).DataTable({
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ solicitudes',
          paginate: { previous: 'Anterior', next: 'Siguiente' },
          zeroRecords: 'No hay solicitudes pendientes'
        },
        order: [[5, 'desc']], // Ordenar por fecha de creación descendente
        columnDefs: [
          { orderable: false, targets: [6] } // Deshabilitar orden en columna de acciones
        ]
      });
      setTableInitialized(true);
    }
  }, [loading, solicitudes, tableInitialized]);

  const handleAction = async (action, id, nombre) => {
    const accionStr = action === 'aprobar' ? 'Aprobar' : 'Rechazar';
    const confirmText = `¿Estás seguro de que deseas ${accionStr.toLowerCase()} la solicitud de "${nombre}"?`;

    const result = await Swal.fire({
      title: `${accionStr} Solicitud`,
      text: confirmText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accionStr}`,
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        if (action === 'aprobar') {
          await axios.post(`${API_BASE_URL}/api/solicitudes-dea/${id}/aprobar`);
          Swal.fire('Aprobada', `La solicitud de "${nombre}" fue aprobada.`, 'success');
        } else {
          await axios.delete(`${API_BASE_URL}/api/solicitudes-dea/${id}/rechazar`);
          Swal.fire('Rechazada', `La solicitud de "${nombre}" fue rechazada.`, 'info');
        }
        fetchSolicitudes();
      } catch (err) {
        const errorMessage = err.response?.data?.message || `No se pudo ${action} la solicitud.`;
        Swal.fire('Error', errorMessage, 'error');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Gestión de Solicitudes de DEAs</h3>

      {loading ? (
        <div className="text-center p-5">
          <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
          <p className="mt-2">Cargando solicitudes...</p>
        </div>
      ) : (
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
                <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
  {solicitudes.length === 0 ? (
    <tr>
      <td colSpan={7} className="text-center text-muted">
        No hay solicitudes pendientes.
      </td>
    </tr>
  ) : (
    solicitudes.map(s => (
      <tr key={s.id}>
        <td>{s.nombre || 'N/A'}</td>
        <td>{s.direccion_completa || `${s.gl_instalacion_calle} ${s.nr_instalacion_numero}, ${s.gl_instalacion_comuna}`}</td>
        <td>{s.lat || 'N/D'}</td>
        <td>{s.lng || 'N/D'}</td>
        <td>
          {s.solicitante || 'N/A'}
          <br />
          <small>{s.rut}</small>
        </td>
        <td>{s.fc_creacion ? new Date(s.fc_creacion).toLocaleString('es-CL') : 'N/A'}</td>
        <td className="text-center">
          <button
            className="btn btn-sm btn-success mr-1"
            disabled={isProcessing}
            onClick={() => handleAction('aprobar', s.id, s.nombre)}
            title="Aprobar"
          >
            <i className="fas fa-check"></i>
          </button>
          <button
            className="btn btn-sm btn-danger"
            disabled={isProcessing}
            onClick={() => handleAction('rechazar', s.id, s.nombre)}
            title="Rechazar"
          >
            <i className="fas fa-times"></i>
          </button>
        </td>
      </tr>
    ))
  )}
</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ValidacionDEAs;