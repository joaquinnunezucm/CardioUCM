import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';
import {
  isRequired,
  isInteger,
  minValue,
  maxValue,
  isTitleText,
  isDescriptiveText,
  isSimpleAlphaWithSpaces,
  maxLength,
} from '../utils/validators.js';


const GestionFAQs = () => {
  const { user, token } = useAuth();
  const [faqs, setFAQs] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const tableRef = useRef(null);
  const dataTableInstance = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [currentFAQ, setCurrentFAQ] = useState(null);
  const [formData, setFormData] = useState({
    pregunta: '',
    respuesta: '',
    categoria: '',
    orden: 0,
    nuevaCategoria: '',
  });
  const [usarNuevaCategoria, setUsarNuevaCategoria] = useState(false);
  const [errors, setErrors] = useState({});

  const API_URL_FAQS = `${API_BASE_URL}/api/admin/faqs`;
  const API_URL_CATEGORIAS = `${API_BASE_URL}/api/admin/faqs/categorias`;

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const fetchFAQsAndCategorias = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy();
        dataTableInstance.current = null;
      }
      const [faqsResponse, categoriasResponse] = await Promise.all([
        axios.get(API_URL_FAQS, getAuthHeaders()),
        axios.get(API_URL_CATEGORIAS, getAuthHeaders()),
      ]);
      setFAQs(faqsResponse.data);
      setCategorias(categoriasResponse.data);
    } catch (error) {
      
      Swal.fire('Error', `No se pudo cargar la información. ${error.response?.data?.message || ''}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchFAQsAndCategorias();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (dataTableInstance.current) {
      dataTableInstance.current.destroy();
      dataTableInstance.current = null;
    }
    if (!loading && faqs.length > 0 && tableRef.current) {
      dataTableInstance.current = $(tableRef.current).DataTable({
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ FAQs',
          paginate: { previous: 'Anterior', next: 'Siguiente' },
          zeroRecords: 'No se encontraron FAQs',
          infoEmpty: 'Mostrando 0 a 0 de 0 FAQs',
          infoFiltered: '(filtrado de _MAX_ FAQs totales)',
        },
        order: [[2, 'asc']],
        columnDefs: [{ orderable: false, targets: [3] }],
        responsive: true,
        searching: true,
      });

    }
  }, [loading, faqs]);

  const handleShowModal = (faq = null) => {
    if (faq) {
      setCurrentFAQ(faq);
      setFormData({
        pregunta: faq.pregunta || '',
        respuesta: faq.respuesta || '',
        categoria: faq.categoria || '',
        orden: faq.orden !== null ? faq.orden : 0,
        nuevaCategoria: '',
      });
      setUsarNuevaCategoria(faq.categoria && !categorias.some(cat => cat.nombre === faq.categoria));
    } else {
      setCurrentFAQ(null);
      setFormData({
        pregunta: '',
        respuesta: '',
        categoria: '',
        orden: 0,
        nuevaCategoria: '',
      });
      setUsarNuevaCategoria(false);
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentFAQ(null);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Lógica de filtrado en tiempo real
    switch (name) {
      case 'pregunta':
        // Permite letras, números, espacios, ?, !, ¿, ¡
        finalValue = value.replace(/[^a-zA-Z0-9\s?!¡¿]/g, '');
        break;
      case 'respuesta':
        // Prohíbe < y >
        finalValue = value.replace(/[<>]/g, '');
        break;
      case 'nuevaCategoria':
        // Permite solo letras y espacios
        finalValue = value.replace(/[^a-zA-Z\s]/g, '');
        break;
      case 'orden':
         // Permite solo números
        finalValue = value.replace(/[^0-9]/g, '');
        break;
      default:
        break;
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));

    if (name === 'categoria' && value === 'nueva') {
      setUsarNuevaCategoria(true);
    } else if (name === 'categoria' && value !== 'nueva') {
      setUsarNuevaCategoria(false);
      setFormData((prev) => ({ ...prev, nuevaCategoria: '' }));
      if (errors.nuevaCategoria) {
        setErrors(prev => ({...prev, nuevaCategoria: null}));
      }
    }

    if (errors[name]) {
        setErrors(prev => ({...prev, [name]: null}));
    }
  };
  
  const validate = () => {
    const newErrors = {};
    const { pregunta, respuesta, orden, nuevaCategoria } = formData;
    
    const preguntaError = isRequired(pregunta) || maxLength(255)(pregunta) || isTitleText(pregunta);
    if(preguntaError) newErrors.pregunta = preguntaError;
    
    const respuestaError = isRequired(respuesta) || isDescriptiveText(respuesta);
    if(respuestaError) newErrors.respuesta = respuestaError;
    
    const ordenError = isRequired(String(orden)) || isInteger(String(orden)) || minValue(0)(orden) || maxValue(20)(orden);
    if (ordenError) newErrors.orden = ordenError;
    
    if (usarNuevaCategoria) {
        const nuevaCatError = isRequired(nuevaCategoria) || maxLength(50)(nuevaCategoria) || isSimpleAlphaWithSpaces(nuevaCategoria);
        if (nuevaCatError) newErrors.nuevaCategoria = nuevaCatError;
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    const formErrors = validate();
    if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        Swal.fire('Formulario Incompleto', 'Por favor, corrige los errores marcados.', 'error');
        return;
    }

    const { pregunta, respuesta, categoria, nuevaCategoria, orden } = formData;
    const categoriaFinal = usarNuevaCategoria && nuevaCategoria.trim() ? nuevaCategoria.trim() : categoria;

    const payload = {
      pregunta: pregunta.trim(),
      respuesta: respuesta.trim(),
      categoria: categoriaFinal || null,
      orden: parseInt(orden, 10),
    };

    try {
      Swal.fire({
        title: currentFAQ ? 'Actualizando...' : 'Creando...',
        text: 'Por favor espera.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      if (currentFAQ) {
        await axios.put(`${API_URL_FAQS}/${currentFAQ.id}`, payload, getAuthHeaders());
        Swal.fire('Actualizado', 'La FAQ fue actualizada correctamente.', 'success');
      } else {
        await axios.post(API_URL_FAQS, payload, getAuthHeaders());
        Swal.fire('Creado', 'La FAQ fue creada exitosamente.', 'success');
      }
      fetchFAQsAndCategorias();
      handleCloseModal();
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 'No se pudo guardar la FAQ.';
      Swal.fire('Error', errorMessage, 'error');
    }
  };

  const handleDeleteFAQ = async (id, pregunta) => {
    if (!token) {
      Swal.fire('Error', 'No autenticado. No se puede eliminar.', 'error');
      return;
    }
    Swal.fire({
      title: '¿Estás seguro?',
      html: `La FAQ "<b>${pregunta}</b>" se eliminará permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({
            title: 'Eliminando...',
            text: 'Por favor espera.',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });
          await axios.delete(`${API_URL_FAQS}/${id}`, getAuthHeaders());
          Swal.fire('Eliminado', 'La FAQ fue eliminada correctamente.', 'success');
          fetchFAQsAndCategorias();
        } catch (error) {
          
          const errorMessage = error.response?.data?.message || 'No se pudo eliminar la FAQ.';
          Swal.fire('Error', errorMessage, 'error');
        }
      }
    });
  };

  if (!user || (user.rol !== 'administrador' && user.rol !== 'superadministrador')) {
    if (!loading) {
      return (
        <div className="container mt-4">
          <div className="alert alert-warning text-center">
            <h4><i className="fas fa-exclamation-triangle me-2"></i>Acceso Restringido</h4>
            <p>No tiene permisos para acceder a esta sección.</p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Gestión de FAQs</h3>
        <Button variant="success" onClick={() => handleShowModal()}>
          <i className="fas fa-plus me-2"></i> Nueva Pregunta
        </Button>
      </div>

      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary"></div>
          <p className="mt-2">Cargando FAQs...</p>
        </div>
      ) : (
        <div className="table-responsive shadow-sm bg-white p-3 rounded">
          <Table striped bordered hover responsive ref={tableRef} id="tablaFAQs" className="w-100">
            <thead className="thead-light">
              <tr>
                <th>Pregunta</th>
                <th>Categoría</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Orden</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {faqs.map(faq => (
                <tr key={faq.id}>
                  <td>{faq.pregunta}</td>
                  <td>{faq.categoria || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{faq.orden}</td>
                  <td style={{ textAlign: 'center' }}>
                    <Button
                      variant="info"
                      size="sm"
                      className="me-1 edit-btn"
                      data-id={faq.id}
                      onClick={() => handleShowModal(faq)}
                      title="Editar"
                    >
                      <i className="fas fa-edit"></i>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="delete-btn"
                      data-id={faq.id}
                      data-pregunta={faq.pregunta}
                      onClick={() => handleDeleteFAQ(faq.id, faq.pregunta)}
                      title="Eliminar"
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Modal show={showModal} onHide={handleCloseModal} size="lg" backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title>{currentFAQ ? 'Editar FAQ' : 'Crear Pregunta Frecuente'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit} noValidate>
          <Modal.Body>
            <Form.Group controlId="formPregunta" className="mb-3">
              <Form.Label>Pregunta*</Form.Label>
              <Form.Control type="text" name="pregunta" value={formData.pregunta} onChange={handleChange} isInvalid={!!errors.pregunta} />
              <Form.Text muted>Letras, números, espacios y signos de interrogación/exclamación.</Form.Text>
              <Form.Control.Feedback type="invalid">{errors.pregunta}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="formRespuesta" className="mb-3">
              <Form.Label>Respuesta*</Form.Label>
              <Form.Control as="textarea" rows={4} name="respuesta" value={formData.respuesta} onChange={handleChange} isInvalid={!!errors.respuesta} />
              <Form.Text muted>Texto descriptivo.</Form.Text>
              <Form.Control.Feedback type="invalid">{errors.respuesta}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="formCategoria" className="mb-3">
              <Form.Label>Categoría</Form.Label>
              <Form.Select name="categoria" value={formData.categoria} onChange={handleChange} className="mb-2">
                <option value="">Seleccione una categoría (opcional)</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                ))}
                <option value="nueva">Crear nueva categoría...</option>
              </Form.Select>
              {usarNuevaCategoria && (
                <>
                  <Form.Control type="text" name="nuevaCategoria" value={formData.nuevaCategoria} onChange={handleChange} placeholder="Ingrese el nombre de la nueva categoría" isInvalid={!!errors.nuevaCategoria} />
                  <Form.Text muted>Solo letras (mayúsculas/minúsculas) y espacios.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.nuevaCategoria}</Form.Control.Feedback>
                </>
              )}
            </Form.Group>

            <Form.Group controlId="formOrden" className="mb-3">
              <Form.Label>Orden*</Form.Label>
              <Form.Control type="text" inputMode="numeric" name="orden" value={formData.orden} onChange={handleChange} isInvalid={!!errors.orden} />
              <Form.Text muted>Obligatorio. Valor numérico entre 0 y 20.</Form.Text>
              <Form.Control.Feedback type="invalid">{errors.orden}</Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {currentFAQ ? 'Actualizar' : 'Crear'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default GestionFAQs;