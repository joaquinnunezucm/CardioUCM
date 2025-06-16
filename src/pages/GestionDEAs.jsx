import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form, Table, Row, Col } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL_FRONTEND = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const GestionDEAs = () => {
  const { user, token } = useAuth();
  const [deas, setDeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tableInitialized, setTableInitialized] = useState(false);
  const tableRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [currentDEA, setCurrentDEA] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    gl_instalacion_calle: '',
    nr_instalacion_numero: '',
    gl_instalacion_comuna: '',
    lat: '',
    lng: '',
    solicitante: '',
    rut: '',
    estado: 'pendiente',
  });

  const API_URL_ADMIN = `${API_BASE_URL_FRONTEND}/api/admin/gestion-deas`;

  const getAuthHeaders = useCallback(() => ({
    headers: { Authorization: `Bearer ${token}` },
  }), [token]);

  // Función unificada para obtener/refrescar los datos de DEAs
  const fetchDEAs = useCallback(async () => {
    if (!token) {
        setLoading(false);
        return;
    }
    setLoading(true);
    
    // Si la tabla ya estaba inicializada, la destruimos antes de obtener nuevos datos.
    if ($.fn.dataTable.isDataTable(tableRef.current)) {
      $(tableRef.current).DataTable().destroy();
      setTableInitialized(false); // Crucial: marcamos la tabla como no inicializada.
    }

    try {
      const response = await axios.get(API_URL_ADMIN, getAuthHeaders());
      setDeas(response.data);
    } catch (error) {
      console.error('Error al obtener los DEAs:', error.response?.data || error.message);
      Swal.fire('Error', 'No se pudo cargar la lista de DEAs.', 'error');
      setDeas([]); // Aseguramos que deas sea un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  }, [token, getAuthHeaders, API_URL_ADMIN]);

  // useEffect para la carga inicial de datos
  useEffect(() => {
    fetchDEAs();
  }, [fetchDEAs]);

  // useEffect para la inicialización de DataTables
  useEffect(() => {
    // Solo inicializa si la carga terminó, hay datos y la tabla no ha sido inicializada aún.
    if (!loading && deas.length > 0 && !tableInitialized) {
      $(tableRef.current).DataTable({
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ DEAs',
          paginate: { previous: 'Anterior', next: 'Siguiente' },
          zeroRecords: 'No se encontraron DEAs que coincidan con la búsqueda',
          infoEmpty: 'Mostrando 0 a 0 de 0 DEAs',
          infoFiltered: '(filtrado de _MAX_ DEAs totales)',
        },
        order: [[4, 'desc']], // Ordenar por fecha de creación descendente
        columnDefs: [{ orderable: false, targets: [5] }], // La columna de acciones no es ordenable
        responsive: true,
      });
      setTableInitialized(true);
    }
  }, [loading, deas, tableInitialized]);

  const handleShowModal = (dea = null) => {
    if (dea) {
      setCurrentDEA(dea);
      setFormData({
        nombre: dea.nombre || '',
        gl_instalacion_calle: dea.gl_instalacion_calle || '',
        nr_instalacion_numero: dea.nr_instalacion_numero || '',
        gl_instalacion_comuna: dea.gl_instalacion_comuna || '',
        lat: dea.lat || '',
        lng: dea.lng || '',
        solicitante: dea.solicitante || '',
        rut: dea.rut || '',
        estado: dea.estado || 'pendiente',
      });
    } else {
      setCurrentDEA(null);
      setFormData({
        nombre: '', gl_instalacion_calle: '', nr_instalacion_numero: '',
        gl_instalacion_comuna: '', lat: '', lng: '', solicitante: '',
        rut: '', estado: 'pendiente',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentDEA(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.nombre || !formData.gl_instalacion_calle || !formData.gl_instalacion_comuna ||
      !formData.lat || !formData.lng || !formData.solicitante || !formData.rut
    ) {
      return Swal.fire('Campos incompletos', 'Por favor, complete todos los campos requeridos.', 'warning');
    }
    
    setIsProcessing(true);
    handleCloseModal();

    try {
      let response;
      if (currentDEA) {
        response = await axios.put(`${API_URL_ADMIN}/${currentDEA.id}`, formData, getAuthHeaders());
        await Swal.fire('Actualizado', response.data.message || 'El DEA fue actualizado correctamente.', 'success');
      } else {
        response = await axios.post(API_URL_ADMIN, formData, getAuthHeaders());
        await Swal.fire('Creado', response.data.message || 'El nuevo DEA ha sido registrado.', 'success');
      }
      await fetchDEAs(); // Re-fetch data para refrescar la tabla
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocurrió un error al guardar.';
      await Swal.fire('Error', errorMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id, nombre) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará el DEA "${nombre}". ¡Esta acción no se puede deshacer!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar',
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        const response = await axios.delete(`${API_URL_ADMIN}/${id}`, getAuthHeaders());
        await Swal.fire('Eliminado', response.data.message || 'El DEA ha sido eliminado.', 'success');
        await fetchDEAs(); // Re-fetch data para refrescar la tabla
      } catch (error) {
        await Swal.fire('Error', error.response?.data?.message || 'No se pudo eliminar el DEA.', 'error');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (!user) {
    return (
      <div className="text-center p-5">
        <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
      </div>
    );
  }

  if (user.rol !== 'administrador' && user.rol !== 'superadministrador') {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger text-center">
          <h4>Acceso Denegado</h4>
          <p>No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Gestión Integral de DEAs</h3>
        <Button variant="success" onClick={() => handleShowModal()} disabled={isProcessing}>
          <i className="fas fa-plus me-2"></i> Nuevo DEA
        </Button>
      </div>

      <div className="table-responsive shadow-sm bg-white p-3 rounded">
        {loading ? (
          <div className="text-center p-5">
            <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
            <p className="mt-2">Cargando datos...</p>
          </div>
        ) : deas.length === 0 ? (
          <div className="alert alert-info text-center">
            <i className="fas fa-info-circle me-2"></i>No hay DEAs para mostrar. Crea uno nuevo para empezar.
          </div>
        ) : (
          <Table ref={tableRef} id="tablaDEAs" striped bordered hover responsive className="w-100">
            <thead className="thead-light">
              <tr>
                <th>Nombre Lugar</th>
                <th>Dirección</th>
                <th>Solicitante</th>
                <th className="text-center">Estado</th>
                <th>Fecha Creación</th>
                <th className="text-center" style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {deas.map((dea) => (
                <tr key={dea.id}>
                  <td>{dea.nombre || 'N/A'}</td>
                  <td>{`${dea.gl_instalacion_calle} ${dea.nr_instalacion_numero || ''}, ${dea.gl_instalacion_comuna}`}</td>
                  <td>
                    {dea.solicitante || 'N/A'}
                    <br />
                    <small className="text-muted">{dea.rut || 'N/A'}</small>
                  </td>
                  <td className="text-center">
                    <span
                      className={`badge bg-${
                        dea.estado === 'aprobado'
                          ? 'success'
                          : dea.estado === 'pendiente'
                          ? 'warning'
                          : dea.estado === 'rechazado'
                          ? 'danger'
                          : 'secondary'
                      }`}
                    >
                      {dea.estado === 'aprobado'
                        ? 'Aprobado'
                        : dea.estado === 'pendiente'
                        ? 'Pendiente'
                        : dea.estado === 'rechazado'
                        ? 'Rechazado'
                        : 'Inactivo'}
                    </span>
                  </td>
                  <td>{dea.fc_creacion ? new Date(dea.fc_creacion).toLocaleString('es-CL') : 'N/A'}</td>
                  <td className="text-center">
                    <Button
                      variant="info"
                      size="sm"
                      className="me-1"
                      onClick={() => handleShowModal(dea)}
                      disabled={isProcessing}
                      title="Editar"
                    >
                      <i className="fas fa-edit"></i>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(dea.id, dea.nombre)}
                      disabled={isProcessing}
                      title="Eliminar"
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <Modal show={showModal} onHide={handleCloseModal} size="lg" backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title>{currentDEA ? 'Editar DEA' : 'Registrar Nuevo DEA'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <h5 className="mb-3">Información del Establecimiento</h5>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre del lugar*</Form.Label>
                  <Form.Control type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Calle*</Form.Label>
                  <Form.Control
                    type="text"
                    name="gl_instalacion_calle"
                    value={formData.gl_instalacion_calle}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Número</Form.Label>
                  <Form.Control
                    type="text"
                    name="nr_instalacion_numero"
                    value={formData.nr_instalacion_numero}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Comuna*</Form.Label>
                  <Form.Control
                    type="text"
                    name="gl_instalacion_comuna"
                    value={formData.gl_instalacion_comuna}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Latitud*</Form.Label>
                  <Form.Control type="number" step="any" name="lat" value={formData.lat} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Longitud*</Form.Label>
                  <Form.Control type="number" step="any" name="lng" value={formData.lng} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>
            <hr />
            <h5 className="mb-3">Información del Solicitante</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre del Solicitante*</Form.Label>
                  <Form.Control
                    type="text"
                    name="solicitante"
                    value={formData.solicitante}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>RUT del Solicitante*</Form.Label>
                  <Form.Control type="text" name="rut" value={formData.rut} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>
            <hr />
            <h5 className="mb-3">Datos de Gestión (Admin)</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estado del Trámite*</Form.Label>
                  <Form.Select name="estado" value={formData.estado} onChange={handleChange} required>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                    <option value="inactivo">Inactivo</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={isProcessing}>
              {isProcessing ? 'Guardando...' : currentDEA ? 'Actualizar DEA' : 'Crear DEA'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default GestionDEAs;