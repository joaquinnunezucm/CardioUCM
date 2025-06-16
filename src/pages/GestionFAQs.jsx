import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL_FRONTEND = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    nuevaCategoria: '', // Nuevo campo para manejar la nueva categoría
  });
  const [usarNuevaCategoria, setUsarNuevaCategoria] = useState(false); // Controla si se usa el campo de texto

  const API_URL_FAQS = `${API_BASE_URL_FRONTEND}/api/admin/faqs`;
  const API_URL_CATEGORIAS = `${API_BASE_URL_FRONTEND}/api/admin/faqs/categorias`;

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
      console.error('Error al obtener datos:', error.response?.data || error.message);
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

      dataTableInstance.current.clear();
      faqs.forEach(faq => {
        dataTableInstance.current.row.add([
          faq.pregunta,
          faq.categoria || '-',
          `<div style="text-align: center;">${faq.orden}</div>`,
          `
            <button class="btn btn-info btn-sm me-1 edit-btn" data-id="${faq.id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${faq.id}" data-pregunta="${faq.pregunta}" title="Eliminar"><i class="fas fa-trash"></i></button>
          `,
        ]);
      });
      dataTableInstance.current.draw();

      $(tableRef.current).on('click', '.edit-btn', function () {
        const id = $(this).data('id');
        const faq = faqs.find((f) => f.id === id);
        handleShowModal(faq);
      });

      $(tableRef.current).on('click', '.delete-btn', function () {
        const id = $(this).data('id');
        const pregunta = $(this).data('pregunta');
        handleDeleteFAQ(id, pregunta);
      });
    }

    return () => {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy();
        dataTableInstance.current = null;
      }
    };
  }, [loading, faqs]);

  const handleShowModal = (faq = null) => {
    if (faq) {
      setCurrentFAQ(faq);
      setFormData({
        pregunta: faq.pregunta || '',
        respuesta: faq.respuesta || '',
        categoria: faq.categoria || '',
        orden: faq.orden || 0,
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
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentFAQ(null);
    setFormData({
      pregunta: '',
      respuesta: '',
      categoria: '',
      orden: 0,
      nuevaCategoria: '',
    });
    setUsarNuevaCategoria(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'orden' ? parseInt(value, 10) || 0 : value,
    }));
    if (name === 'categoria' && value === 'nueva') {
      setUsarNuevaCategoria(true);
    } else if (name === 'categoria' && value !== 'nueva') {
      setUsarNuevaCategoria(false);
      setFormData((prev) => ({ ...prev, nuevaCategoria: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { pregunta, respuesta, categoria, nuevaCategoria, orden } = formData;

    if (!pregunta.trim() || !respuesta.trim()) {
      Swal.fire('Campos incompletos', 'Pregunta y Respuesta son obligatorios.', 'warning');
      return;
    }
    const numericOrden = parseInt(orden, 10);
    if (isNaN(numericOrden) || numericOrden < 0) {
      Swal.fire('Campo inválido', 'El orden debe ser un número válido y no negativo.', 'warning');
      return;
    }

    const categoriaFinal = usarNuevaCategoria && nuevaCategoria.trim() ? nuevaCategoria.trim() : categoria;

    const payload = {
      pregunta: pregunta.trim(),
      respuesta: respuesta.trim(),
      categoria: categoriaFinal || null,
      orden: numericOrden,
    };

    try {
      Swal.fire({
        title: currentFAQ ? 'Actualizando...' : 'Creando...',
        text: 'Por favor espera.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
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
      console.error('Error al guardar FAQ:', error.response?.data || error.message);
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
          console.error('Error al eliminar FAQ:', error.response?.data || error.message);
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
            <h4>
              <i className="fas fa-exclamation-triangle me-2"></i>Acceso Restringido
            </h4>
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
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group controlId="formPregunta" className="mb-3">
              <Form.Label>Pregunta <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="pregunta"
                value={formData.pregunta}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="formRespuesta" className="mb-3">
              <Form.Label>Respuesta <span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="respuesta"
                value={formData.respuesta}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="formCategoria" className="mb-3">
              <Form.Label>Categoría (Opcional)</Form.Label>
              <Form.Select
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                className="mb-2"
              >
                <option value="">Seleccione una categoría</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                ))}
                <option value="nueva">Crear nueva categoría</option>
              </Form.Select>
              {usarNuevaCategoria && (
                <Form.Control
                  type="text"
                  name="nuevaCategoria"
                  value={formData.nuevaCategoria}
                  onChange={handleChange}
                  placeholder="Ingrese el nombre de la nueva categoría"
                />
              )}
              <Form.Text className="text-muted">
                Seleccione una categoría existente o elija "Crear nueva categoría" para agregar una nueva.
              </Form.Text>
            </Form.Group>

            <Form.Group controlId="formOrden" className="mb-3">
              <Form.Label>Orden (Numérico) <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="number"
                name="orden"
                value={formData.orden}
                onChange={handleChange}
                min="0"
                required
              />
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