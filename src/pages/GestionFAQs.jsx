// src/components/GestionFAQs.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';

const GestionFAQs = () => {
  const [faqs, setFAQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableInitialized, setTableInitialized] = useState(false);
  const tableRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [currentFAQ, setCurrentFAQ] = useState(null);
  const [formData, setFormData] = useState({
    pregunta: '',
    respuesta: '',
    categoria: '',
    orden: 0
  });

  // Cargar FAQs
  const fetchFAQs = async () => {
    try {
      setLoading(true);
      if ($.fn.dataTable.isDataTable(tableRef.current)) {
        $(tableRef.current).DataTable().destroy();
        setTableInitialized(false);
      }
      const response = await axios.get('http://localhost:3001/api/faqs');
      setFAQs(response.data);
    } catch (error) {
      console.error('Error al obtener FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  useEffect(() => {
    if (!loading && faqs.length > 0 && !tableInitialized) {
      $(tableRef.current).DataTable({
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ FAQs',
          paginate: { previous: 'Anterior', next: 'Siguiente' },
          zeroRecords: 'No se encontraron FAQs'
        }
      });
      setTableInitialized(true);
    }
  }, [loading, faqs, tableInitialized]);

  const handleShowModal = (faq = null) => {
    if (faq) {
      setCurrentFAQ(faq);
      setFormData({
        pregunta: faq.pregunta,
        respuesta: faq.respuesta,
        categoria: faq.categoria || '',
        orden: faq.orden
      });
    } else {
      setCurrentFAQ(null);
      setFormData({
        pregunta: '',
        respuesta: '',
        categoria: '',
        orden: 0
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'orden' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { pregunta, respuesta, orden } = formData;

    if (!pregunta.trim() || !respuesta.trim() || isNaN(orden)) {
      Swal.fire('Campos incompletos', 'Todos los campos excepto categoría son obligatorios.', 'warning');
      return;
    }

    try {
      if (currentFAQ) {
        await axios.put(`http://localhost:3001/api/faqs/${currentFAQ.id}`, formData);
        Swal.fire('Actualizado', 'La FAQ fue actualizada correctamente.', 'success');
      } else {
        await axios.post('http://localhost:3001/api/faqs', formData);
        Swal.fire('Creado', 'La FAQ fue creada exitosamente.', 'success');
      }
      fetchFAQs();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar FAQ:', error);
      Swal.fire('Error', 'No se pudo guardar la FAQ.', 'error');
    }
  };

  const handleDeleteFAQ = async (id, pregunta) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `"${pregunta}" se eliminará permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:3001/api/faqs/${id}`);
          Swal.fire('Eliminado', 'La FAQ fue eliminada correctamente.', 'success');
          fetchFAQs();
        } catch (error) {
          console.error('Error al eliminar FAQ:', error);
          Swal.fire('Error', 'No se pudo eliminar la FAQ.', 'error');
        }
      }
    });
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Gestión de FAQs</h3>

      <div className="mb-3 text-right">
        <button className="btn btn-success" onClick={() => handleShowModal()}>
          <i className="fas fa-plus"></i> Nueva Pregunta
        </button>
      </div>

      {loading ? (
        <div>Cargando FAQs...</div>
      ) : (
        <div className="table-responsive">
          <table ref={tableRef} className="table table-bordered table-hover">
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
                    <button className="btn btn-sm btn-info mr-1" onClick={() => handleShowModal(faq)}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteFAQ(faq.id, faq.pregunta)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Bootstrap para Crear/Editar FAQ */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{currentFAQ ? 'Editar FAQ' : 'Crear Pregunta Frecuente'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group controlId="formPregunta">
              <Form.Label>Pregunta</Form.Label>
              <Form.Control
                type="text"
                name="pregunta"
                value={formData.pregunta}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="formRespuesta">
              <Form.Label>Respuesta</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="respuesta"
                value={formData.respuesta}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="formCategoria">
              <Form.Label>Categoría</Form.Label>
              <Form.Control
                type="text"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="formOrden">
              <Form.Label>Orden</Form.Label>
              <Form.Control
                type="number"
                name="orden"
                value={formData.orden}
                onChange={handleChange}
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
