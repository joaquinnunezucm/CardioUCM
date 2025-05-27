import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const GestionRCP = () => {
  const { user } = useAuth();
  const [instrucciones, setInstrucciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableInitialized, setTableInitialized] = useState(false);
  const tableRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [currentInstruccion, setCurrentInstruccion] = useState(null);
  const [formData, setFormData] = useState({
    instruccion: '',
    orden: 0,
    categoria: 'RCP Adultos',
    gif: null,
  });
  const [formError, setFormError] = useState('');

  // Proteger la ruta
  if (!user || (user.rol !== 'administrador' && user.rol !== 'superadministrador')) {
    return <Navigate to="/login" />;
  }

  useEffect(() => {
    fetchInstrucciones();
  }, []);

  const fetchInstrucciones = async () => {
    try {
      setLoading(true);
      if ($.fn.dataTable.isDataTable(tableRef.current)) {
        $(tableRef.current).DataTable().destroy();
        setTableInitialized(false);
      }
      const response = await axios.get('http://localhost:3001/api/admin/rcp');
      setInstrucciones(response.data);
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar las instrucciones RCP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && instrucciones.length > 0 && !tableInitialized) {
      $(tableRef.current).DataTable({
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ instrucciones',
          paginate: { previous: 'Anterior', next: 'Siguiente' },
          zeroRecords: 'No se encontraron instrucciones'
        },
        pageLength: 10,
        order: [[2, 'asc']], // Ordenar por columna 'orden' ascendente
      });
      setTableInitialized(true);
    }
  }, [loading, instrucciones, tableInitialized]);

  const handleShowModal = (instruccion = null) => {
    if (instruccion) {
      setCurrentInstruccion(instruccion);
      setFormData({
        instruccion: instruccion.instruccion,
        orden: instruccion.orden,
        categoria: instruccion.categoria,
        gif: null,
      });
    } else {
      setCurrentInstruccion(null);
      setFormData({
        instruccion: '',
        orden: 0,
        categoria: 'RCP Adultos',
        gif: null,
      });
    }
    setFormError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormError('');
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'gif') {
      const file = files[0];
      setFormData((prev) => ({ ...prev, gif: file }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'orden' ? parseInt(value) : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.instruccion.trim() || isNaN(formData.orden)) {
      setFormError('La instrucción y el orden son obligatorios.');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('instruccion', formData.instruccion);
    formDataToSend.append('orden', formData.orden);
    formDataToSend.append('categoria', formData.categoria);
    if (formData.gif) {
      formDataToSend.append('gif', formData.gif);
    }

    try {
      if (currentInstruccion) {
        await axios.put(`http://localhost:3001/api/admin/rcp/${currentInstruccion.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Swal.fire('Actualizado', 'La instrucción fue actualizada correctamente.', 'success');
      } else {
        await axios.post('http://localhost:3001/api/admin/rcp', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Swal.fire('Creado', 'La instrucción fue creada exitosamente.', 'success');
      }
      fetchInstrucciones();
      handleCloseModal();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al guardar la instrucción.';
      Swal.fire('Error', errorMsg, 'error');
    }
  };

  const handleDelete = (id, instruccion) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `"${instruccion}" se eliminará permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:3001/api/admin/rcp/${id}`);
          Swal.fire('Eliminado', 'La instrucción fue eliminada correctamente.', 'success');
          fetchInstrucciones();
        } catch (error) {
          Swal.fire('Error', 'No se pudo eliminar la instrucción.', 'error');
        }
      }
    });
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Gestión de Instrucciones RCP</h3>

      <div className="mb-3 text-right">
        <button className="btn btn-success" onClick={() => handleShowModal()}>
          <i className="fas fa-plus"></i> Nueva Instrucción
        </button>
      </div>

      {loading ? (
        <div>Cargando instrucciones...</div>
      ) : (
        <div className="table-responsive">
          <table ref={tableRef} className="table table-bordered table-hover">
            <thead className="thead-light">
              <tr>
                <th>Instrucción</th>
                <th>GIF</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Orden</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {instrucciones.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center">
                    No se encontraron instrucciones.
                  </td>
                </tr>
              ) : (
                instrucciones.map((instruccion) => (
                  <tr key={instruccion.id}>
                    <td>{instruccion.instruccion}</td>
                    <td>
                      {instruccion.gif_url ? (
                        <img
                          src={`http://localhost:3001${instruccion.gif_url}`}
                          alt="GIF"
                          className="img-fluid"
                          style={{ maxWidth: '100px', maxHeight: '100px' }}
                        />
                      ) : (
                        <span className="text-muted">Sin GIF</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>{instruccion.orden}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-sm btn-info mr-1"
                        onClick={() => handleShowModal(instruccion)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(instruccion.id, instruccion.instruccion)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {currentInstruccion ? 'Editar Instrucción RCP' : 'Nueva Instrucción RCP'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {formError && (
              <div className="alert alert-danger p-2 mb-3" role="alert">
                {formError}
              </div>
            )}
            <Form.Group controlId="formInstruccion">
              <Form.Label>Instrucción</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="instruccion"
                value={formData.instruccion}
                onChange={handleChange}
                required
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

            <Form.Group controlId="formCategoria">
              <Form.Label>Categoría</Form.Label>
              <Form.Control
                type="text"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="formGif">
              <Form.Label>Subir GIF</Form.Label>
              <Form.Control
                type="file"
                name="gif"
                accept="image/gif,image/png,image/jpeg"
                onChange={handleChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {currentInstruccion ? 'Actualizar' : 'Crear'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default GestionRCP;