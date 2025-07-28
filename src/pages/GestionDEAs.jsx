import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form, Table, Row, Col } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import Select from 'react-select';
import { API_BASE_URL } from '../utils/api';
import {
  isRequired,
  isInteger,
  isRUT,
  isCoordinate,
  isSimpleAlphaWithSpaces,
  isSimpleAlphaNumericWithSpaces,
  minLength,
  maxLength,
  isEmail
} from '../utils/validators.js';


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
    email: '',
    estado: 'pendiente',
  });
  const [errors, setErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [comunas, setComunas] = useState([]);
  const [comunaNoExiste, setComunaNoExiste] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

const API_URL_ADMIN = `${API_BASE_URL}/api/admin/gestion-deas`;

  const getAuthHeaders = useCallback(() => ({
    headers: { Authorization: `Bearer ${token}` },
  }), [token]);

  const fetchDEAs = useCallback(async () => {
    if (!token) {
        setLoading(false);
        return;
    }
    setLoading(true);
    
    if ($.fn.dataTable.isDataTable(tableRef.current)) {
      $(tableRef.current).DataTable().destroy();
      setTableInitialized(false);
    }

    try {
      const response = await axios.get(API_URL_ADMIN, getAuthHeaders());
      setDeas(response.data);
    } catch (error) {
      
      Swal.fire('Error', 'No se pudo cargar la lista de DEAs.', 'error');
      setDeas([]);
    } finally {
      setLoading(false);
    }
  }, [token, getAuthHeaders, API_URL_ADMIN]);
  
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/comunas`)
      .then(res => {
        const nombresComunas = res.data.map(c => c.nombre);
        setComunas(nombresComunas);
      })
      .catch((err) => {
        
        setComunas([]);
      });
  }, []);

  useEffect(() => {
    fetchDEAs();
  }, [fetchDEAs]);

  useEffect(() => {
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
        order: [[4, 'desc']],
        columnDefs: [{ orderable: false, targets: [5] }],
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
        email: dea.email || '',
        estado: dea.estado || 'pendiente',
      });
      setTermsAccepted(true);
    } else {
      setCurrentDEA(null);
      setFormData({
        nombre: '', gl_instalacion_calle: '', nr_instalacion_numero: '',
        gl_instalacion_comuna: '', lat: '', lng: '', solicitante: '',
        rut: '', email: '', estado: 'pendiente',
      });
      setTermsAccepted(false);
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentDEA(null);
  };
  
  const handleShowTermsModal = () => setShowTermsModal(true);
  const handleCloseTermsModal = () => setShowTermsModal(false);

  const handleTermsChange = (e) => {
    setTermsAccepted(e.target.checked);
    if (errors.terms) {
      setErrors(prev => ({ ...prev, terms: null }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'nr_instalacion_numero') {
      finalValue = value.replace(/[^0-9]/g, '');
    } else if (name === 'nombre' || name === 'gl_instalacion_calle') {
      finalValue = value
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, '');
    } else if (name === 'solicitante') {
      finalValue = value
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z\s]/g, '');
    }
    
    setFormData((prev) => ({ ...prev, [name]: finalValue }));

    if (errors[name]) {
      setErrors((prev) => ({...prev, [name]: null}));
    }
  };

  const validate = () => {
    const newErrors = {};
    const { nombre, gl_instalacion_calle, nr_instalacion_numero, gl_instalacion_comuna, lat, lng, solicitante, rut, email } = formData;

    const nombreError = isRequired(nombre) || minLength(3)(nombre) || maxLength(58)(nombre) || isSimpleAlphaNumericWithSpaces(nombre);
    if (nombreError) newErrors.nombre = nombreError;
    
    const calleError = isRequired(gl_instalacion_calle) || minLength(3)(gl_instalacion_calle) || maxLength(45)(gl_instalacion_calle) || isSimpleAlphaNumericWithSpaces(gl_instalacion_calle);
    if (calleError) newErrors.gl_instalacion_calle = calleError;

    const numeroError = (nr_instalacion_numero && maxLength(10)(nr_instalacion_numero)) || (nr_instalacion_numero && isInteger(nr_instalacion_numero));
    if (numeroError) newErrors.nr_instalacion_numero = numeroError;
    
    const comunaError = isRequired(gl_instalacion_comuna) || (!comunas.includes(gl_instalacion_comuna) && 'La comuna seleccionada no es válida.');
    if(comunaError) newErrors.gl_instalacion_comuna = comunaError;

    const latError = isRequired(lat) || isCoordinate(lat);
    if (latError) newErrors.lat = latError;
    
    const lngError = isRequired(lng) || isCoordinate(lng);
    if (lngError) newErrors.lng = lngError;
    
    const solicitanteError = isRequired(solicitante) || minLength(3)(solicitante) || maxLength(50)(solicitante) || isSimpleAlphaWithSpaces(solicitante);
    if (solicitanteError) newErrors.solicitante = solicitanteError;

    const rutError = isRequired(rut) || isRUT(rut);
    if(rutError) newErrors.rut = rutError;

    const emailError = isRequired(email) || isEmail(email);
    if (emailError) newErrors.email = emailError;

    if (!termsAccepted) {
        newErrors.terms = 'Debes aceptar los términos y condiciones.';
    }

    return newErrors;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setComunaNoExiste(false);

    const formErrors = validate();
    if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        if (formErrors.gl_instalacion_comuna) setComunaNoExiste(true);
        Swal.fire('Formulario Incompleto', 'Por favor, corrige los errores marcados en el formulario.', 'error');
        return;
    }
    
    setIsProcessing(true);
    
    const dataToSend = { ...formData, terms_accepted: termsAccepted };

    try {
      let response;
      if (currentDEA) {
        response = await axios.put(`${API_URL_ADMIN}/${currentDEA.id}`, dataToSend, getAuthHeaders());
        await Swal.fire('Actualizado', response.data.message || 'El DEA fue actualizado correctamente.', 'success');
      } else {
        response = await axios.post(API_URL_ADMIN, dataToSend, getAuthHeaders());
        await Swal.fire('Creado', response.data.message || 'El nuevo DEA ha sido registrado.', 'success');
      }
      handleCloseModal();
      await fetchDEAs();
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
        await fetchDEAs();
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
                    <br />
                    <small className="text-info">{dea.email || ''}</small>
                  </td>
                  <td className="text-center">
                    <span
                      className={`badge bg-${
                        dea.estado === 'aprobado' ? 'success' : 
                        dea.estado === 'pendiente' ? 'warning' :
                        dea.estado === 'rechazado' ? 'danger' : 'secondary'
                      }`}
                    >
                      {dea.estado?.charAt(0).toUpperCase() + dea.estado?.slice(1) || 'Desconocido'}
                    </span>
                  </td>
                  <td>{dea.fc_creacion ? new Date(dea.fc_creacion).toLocaleString('es-CL') : 'N/A'}</td>
                  <td className="text-center">
                    <Button variant="info" size="sm" className="me-1" onClick={() => handleShowModal(dea)} disabled={isProcessing} title="Editar"><i className="fas fa-edit"></i></Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(dea.id, dea.nombre)} disabled={isProcessing} title="Eliminar"><i className="fas fa-trash"></i></Button>
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
        <Form onSubmit={handleSubmit} noValidate>
          <Modal.Body>
            <h5 className="mb-3">Información del Establecimiento</h5>
            <Row>
              <Col><Form.Group className="mb-3"><Form.Label>Nombre del lugar*</Form.Label><Form.Control type="text" name="nombre" value={formData.nombre} onChange={handleChange} isInvalid={!!errors.nombre} placeholder="Ej: Centro Comercial Talca" /><Form.Text muted>Solo letras (sin tildes), números y espacios.</Form.Text><Form.Control.Feedback type="invalid">{errors.nombre}</Form.Control.Feedback></Form.Group></Col>
            </Row>
            <Row>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Calle*</Form.Label><Form.Control type="text" name="gl_instalacion_calle" value={formData.gl_instalacion_calle} onChange={handleChange} isInvalid={!!errors.gl_instalacion_calle} placeholder="Ej: Avenida San Miguel" /><Form.Text muted>Solo letras (sin tildes), números y espacios.</Form.Text><Form.Control.Feedback type="invalid">{errors.gl_instalacion_calle}</Form.Control.Feedback></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Número</Form.Label><Form.Control type="text" name="nr_instalacion_numero" value={formData.nr_instalacion_numero} onChange={handleChange} isInvalid={!!errors.nr_instalacion_numero} placeholder="Ej: 742" /><Form.Text muted>Solo números. Opcional.</Form.Text><Form.Control.Feedback type="invalid">{errors.nr_instalacion_numero}</Form.Control.Feedback></Form.Group></Col>
            </Row>
            <Row>
              <Col><Form.Group className="mb-3"><Form.Label>Comuna*</Form.Label><Select name="gl_instalacion_comuna" options={comunas.map(c => ({ value: c, label: c }))} value={formData.gl_instalacion_comuna ? { value: formData.gl_instalacion_comuna, label: formData.gl_instalacion_comuna } : null} onChange={option => { setFormData(prev => ({ ...prev, gl_instalacion_comuna: option ? option.value : '' })); if (errors.gl_instalacion_comuna) setErrors(prev => ({...prev, gl_instalacion_comuna: null})); }} isClearable isSearchable placeholder="Busca o selecciona una comuna" noOptionsMessage={() => "No se encontró la comuna"} styles={{ control: base => ({ ...base, borderColor: errors.gl_instalacion_comuna ? '#dc3545' : '#ced4da', '&:hover': { borderColor: errors.gl_instalacion_comuna ? '#dc3545' : '#80bdff' } })}} />{errors.gl_instalacion_comuna && <div className="text-danger mt-1" style={{fontSize: '0.875em'}}>{errors.gl_instalacion_comuna}</div>}</Form.Group></Col>
            </Row>
            <Row>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Latitud*</Form.Label><Form.Control type="number" step="any" name="lat" value={formData.lat} onChange={handleChange} isInvalid={!!errors.lat} placeholder="Ej: -35.123456" /><Form.Control.Feedback type="invalid">{errors.lat}</Form.Control.Feedback></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Longitud*</Form.Label><Form.Control type="number" step="any" name="lng" value={formData.lng} onChange={handleChange} isInvalid={!!errors.lng} placeholder="Ej: -71.123456" /><Form.Control.Feedback type="invalid">{errors.lng}</Form.Control.Feedback></Form.Group></Col>
            </Row>
            <hr />
            <h5 className="mb-3">Información del Solicitante</h5>
            <Row>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Nombre del Solicitante*</Form.Label><Form.Control type="text" name="solicitante" value={formData.solicitante} onChange={handleChange} isInvalid={!!errors.solicitante} placeholder="Nombre completo" /><Form.Text muted>Solo letras (sin tildes) y espacios.</Form.Text><Form.Control.Feedback type="invalid">{errors.solicitante}</Form.Control.Feedback></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>RUT del Solicitante*</Form.Label><Form.Control type="text" name="rut" value={formData.rut} onChange={handleChange} isInvalid={!!errors.rut} placeholder="Ej: 12345678-9" /><Form.Text muted>Formato: 12345678-9.</Form.Text><Form.Control.Feedback type="invalid">{errors.rut}</Form.Control.Feedback></Form.Group></Col>
            </Row>
            <Row>
              <Col><Form.Group className="mb-3"><Form.Label>Correo Electrónico del Solicitante*</Form.Label><Form.Control type="email" name="email" value={formData.email} onChange={handleChange} isInvalid={!!errors.email} placeholder="ejemplo@correo.com" /><Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback></Form.Group></Col>
            </Row>
            <hr />
            <h5 className="mb-3">Datos de Gestión</h5>
            <Row>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Estado del Trámite*</Form.Label><Form.Select name="estado" value={formData.estado} onChange={handleChange}><option value="pendiente">Pendiente</option><option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option><option value="inactivo">Inactivo</option></Form.Select></Form.Group></Col>
              <Col md={6} className="d-flex align-items-end">
                <Form.Group className="mb-3">
                  <Form.Check type="checkbox" label={<>Acepta los <span style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleShowTermsModal}>términos y condiciones</span>*</>} checked={termsAccepted} onChange={handleTermsChange} disabled={isProcessing} isInvalid={!!errors.terms} feedback={errors.terms} feedbackType="invalid" />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={isProcessing}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={isProcessing}>{isProcessing ? 'Guardando...' : currentDEA ? 'Actualizar DEA' : 'Crear DEA'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showTermsModal} onHide={handleCloseTermsModal} size="lg">
            <Modal.Header closeButton><Modal.Title>Términos y Condiciones - CardioUCM</Modal.Title></Modal.Header>
            <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <h5>1. Generalidades</h5><p>Este documento regula el uso del formulario para sugerir desfibriladores externos automáticos (DEA) en la aplicación CardioUCM, desarrollada por la Universidad Católica del Maule. Al enviar el formulario, aceptas estos términos, conforme a las leyes de la República de Chile, en particular la Ley N° 19.628 sobre Protección de la Vida Privada, la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores y la Ley N° 19.799 sobre Documentos Electrónicos.</p>
                <h5>2. Recopilación y Uso de Datos Personales</h5><p>Recopilamos tu nombre completo, RUT y correo electrónico únicamente para contactarte en relación con la sugerencia de un DEA y para verificar tu identidad, asegurando la credibilidad de la solicitud. Estos datos no serán compartidos con terceros, salvo obligación legal (por ejemplo, requerimientos de autoridades competentes). Nos comprometemos a almacenar tus datos de forma segura.</p>
                <h5>3. Conservación de datos personales</h5><p>Tienes derecho a solicitar el acceso, rectificación o eliminación de tus datos contactándonos en cardioucm1@gmail.com.</p>
                <h5>4. Consentimiento</h5><p>Al marcar la casilla de aceptación en el formulario, autorizas expresamente el uso de tus datos según lo descrito en este documento. Sin esta aceptación, no podrás enviar la solicitud.</p>
                <h5>5. Limitaciones de Responsabilidad</h5><p>CardioUCM no se hace responsable por errores en los datos proporcionados por el usuario, fallos técnicos en el envío del formulario o interrupciones en el servicio debido a causas ajenas a nuestro control. La aprobación de las sugerencias de DEA depende de un proceso de revisión y no garantizamos su aceptación.</p>
                <h5>6. Modificaciones a los Términos</h5><p>Nos reservamos el derecho a modificar estos términos y condiciones. Cualquier cambio será notificado a través de la aplicación CardioUCM o por correo electrónico a los usuarios registrados.</p>
                <h5>7. Ley Aplicable y Resolución de Conflictos</h5><p>Este acuerdo se rige por las leyes de la República de Chile. Cualquier disputa derivada de este documento será resuelta en los tribunales de la ciudad de Talca, Región del Maule.</p>
                <h5>8. Contacto</h5><p>Para consultas, solicitudes relacionadas con tus datos personales o cualquier duda sobre estos términos, contáctanos en <a href="mailto:cardioucm1@gmail.com">cardioucm1@gmail.com</a>.</p>
            </Modal.Body>
            <Modal.Footer><Button variant="secondary" onClick={handleCloseTermsModal}>Cerrar</Button></Modal.Footer>
      </Modal>
    </div>
  );
};

export default GestionDEAs;