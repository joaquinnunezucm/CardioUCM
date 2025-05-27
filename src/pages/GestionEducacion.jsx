import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext.jsx';

const GestionEducacion = () => {
  const [contenidos, setContenidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableInitialized, setTableInitialized] = useState(false);
  const tableRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [currentContenido, setCurrentContenido] = useState(null);
  const [formData, setFormData] = useState({
    categoria_id: '',
    categoria_nombre: '',
    titulo_tema: '',
    contenido_tema: '',
    orden_categoria: 0,
    orden_item: 0,
    activo: true,
    medios: [], // Arreglo para múltiples archivos
    paso_asociado: '', // Para asociar medios a un paso
  });

  const { token } = useAuth();

  const getAuthHeaders = () => ({
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });

  const fetchContenidos = async () => {
    try {
      setLoading(true);
      if ($.fn.dataTable.isDataTable(tableRef.current)) {
        $(tableRef.current).DataTable().destroy();
        setTableInitialized(false);
      }
      if (!token) {
        console.error("No hay token disponible");
        return;
      }
      const response = await axios.get('http://localhost:3001/api/admin/educacion', getAuthHeaders());
      setContenidos(response.data);
    } catch (error) {
      console.error('Error al obtener contenidos educativos:', error);
      Swal.fire('Error', 'No se pudieron cargar los contenidos educativos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchContenidos();
  }, [token]);

  useEffect(() => {
    if (!loading && contenidos.length > 0 && !tableInitialized) {
      $(tableRef.current).DataTable({
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ contenidos',
          paginate: { previous: 'Anterior', next: 'Siguiente' },
          zeroRecords: 'No se encontraron contenidos educativos',
        },
        order: [[1, 'asc'], [3, 'asc']],
        columnDefs: [{ orderable: false, targets: [5] }],
      });
      setTableInitialized(true);
    }
  }, [loading, contenidos, tableInitialized]);

  const handleShowModal = (contenido = null) => {
    if (contenido) {
      setCurrentContenido(contenido);
      setFormData({
        categoria_id: contenido.categoria_id,
        categoria_nombre: contenido.categoria_nombre,
        titulo_tema: contenido.titulo_tema,
        contenido_tema: contenido.contenido_tema,
        orden_categoria: contenido.orden_categoria,
        orden_item: contenido.orden_item,
        activo: contenido.activo,
        medios: [], // Reiniciar medios al editar
        paso_asociado: '', // Reiniciar paso asociado
      });
    } else {
      setCurrentContenido(null);
      setFormData({
        categoria_id: '',
        categoria_nombre: '',
        titulo_tema: '',
        contenido_tema: '',
        orden_categoria: 0,
        orden_item: 0,
        activo: true,
        medios: [],
        paso_asociado: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (name === 'medios') {
      const fileArray = Array.from(files);
      setFormData((prev) => ({ ...prev, medios: fileArray }));
    } else if (name === 'paso_asociado') {
      setFormData((prev) => ({ ...prev, paso_asociado: value }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : (name === 'orden_categoria' || name === 'orden_item') ? parseInt(value) : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { categoria_id, categoria_nombre, titulo_tema, contenido_tema, orden_categoria, orden_item } = formData;

    if (!categoria_id.trim() || !categoria_nombre.trim() || !titulo_tema.trim() || !contenido_tema.trim()) {
      Swal.fire('Campos incompletos', 'Todos los campos excepto los de orden son obligatorios.', 'warning');
      return;
    }
    if (isNaN(orden_categoria) || isNaN(orden_item)) {
      Swal.fire('Error de validación', 'Los campos de orden deben ser números válidos.', 'warning');
      return;
    }
    if (!token) {
      Swal.fire('Error', 'No autenticado. No se puede guardar.', 'error');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('categoria_id', categoria_id);
    formDataToSend.append('categoria_nombre', categoria_nombre);
    formDataToSend.append('titulo_tema', titulo_tema);
    formDataToSend.append('contenido_tema', contenido_tema);
    formDataToSend.append('orden_categoria', orden_categoria);
    formDataToSend.append('orden_item', orden_item);
    formDataToSend.append('activo', formData.activo);
    formDataToSend.append('paso_asociado', formData.paso_asociado);
    if (formData.medios.length > 0) {
      formData.medios.forEach((file) => {
        formDataToSend.append('medios', file);
      });
    }

    try {
      if (currentContenido) {
        await axios.put(`http://localhost:3001/api/admin/educacion/${currentContenido.id}`, formDataToSend, getAuthHeaders());
        Swal.fire('Actualizado', 'El contenido educativo fue actualizado correctamente.', 'success');
      } else {
        await axios.post('http://localhost:3001/api/admin/educacion', formDataToSend, getAuthHeaders());
        Swal.fire('Creado', 'El contenido educativo fue creado exitosamente.', 'success');
      }
      fetchContenidos();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar contenido educativo:', error);
      const errorMessage = error.response?.data?.message || 'No se pudo guardar el contenido educativo.';
      Swal.fire('Error', errorMessage, 'error');
    }
  };

  const handleDeleteContenido = async (id, titulo) => {
    if (!token) {
      Swal.fire('Error', 'No autenticado. No se puede eliminar.', 'error');
      return;
    }
    Swal.fire({
      title: '¿Estás seguro?',
      text: `"${titulo}" se eliminará permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:3001/api/admin/educacion/${id}`, getAuthHeaders());
          Swal.fire('Eliminado', 'El contenido educativo fue eliminado correctamente.', 'success');
          fetchContenidos();
        } catch (error) {
          console.error('Error al eliminar contenido educativo:', error);
          const errorMessage = error.response?.data?.message || 'No se pudo eliminar el contenido educativo.';
          Swal.fire('Error', errorMessage, 'error');
        }
      }
    });
  };

  if (!token) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          <h4>Acceso Restringido</h4>
          <p>Debe estar autenticado para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Gestión de Contenido Educativo</h3>

      <div className="mb-3 text-right">
        <button className="btn btn-success" onClick={() => handleShowModal()}>
          <i className="fas fa-plus"></i> Nuevo Contenido
        </button>
      </div>

      {loading ? (
        <div className="text-center p-5">
          <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
          <p className="mt-2">Cargando contenidos...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table ref={tableRef} className="table table-bordered table-hover">
            <thead className="thead-light">
              <tr>
                <th>Título del Tema</th>
                <th>Categoría</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Orden Cat.</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Orden Item</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Activo</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {contenidos.map((contenido) => (
                <tr key={contenido.id}>
                  <td>{contenido.titulo_tema}</td>
                  <td>
                    {contenido.categoria_nombre}
                    <br />
                    <small className="text-muted">({contenido.categoria_id})</small>
                  </td>
                  <td style={{ textAlign: 'center' }}>{contenido.orden_categoria}</td>
                  <td style={{ textAlign: 'center' }}>{contenido.orden_item}</td>
                  <td style={{ textAlign: 'center' }}>
                    {contenido.activo ? <span className="badge badge-success">Sí</span> : <span className="badge badge-secondary">No</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-sm btn-info mr-1" onClick={() => handleShowModal(contenido)}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteContenido(contenido.id, contenido.titulo_tema)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{currentContenido ? 'Editar Contenido Educativo' : 'Crear Contenido Educativo'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="row">
              <div className="col-md-6">
                <Form.Group controlId="formCategoriaId">
                  <Form.Label>ID Categoría</Form.Label>
                  <Form.Control
                    type="text"
                    name="categoria_id"
                    value={formData.categoria_id}
                    onChange={handleChange}
                    placeholder="ej: rcp-info"
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group controlId="formCategoriaNombre">
                  <Form.Label>Nombre Categoría</Form.Label>
                  <Form.Control
                    type="text"
                    name="categoria_nombre"
                    value={formData.categoria_nombre}
                    onChange={handleChange}
                    placeholder="ej: Reanimación Cardiopulmonar (RCP)"
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group controlId="formTituloTema">
              <Form.Label>Título del Tema</Form.Label>
              <Form.Control
                type="text"
                name="titulo_tema"
                value={formData.titulo_tema}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="formContenidoTema">
              <Form.Label>Contenido del Tema</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                name="contenido_tema"
                value={formData.contenido_tema}
                onChange={handleChange}
                placeholder="Puede incluir HTML"
                required
              />
            </Form.Group>

            <div className="row">
              <div className="col-md-4">
                <Form.Group controlId="formOrdenCategoria">
                  <Form.Label>Orden Categoría</Form.Label>
                  <Form.Control
                    type="number"
                    name="orden_categoria"
                    value={formData.orden_categoria}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group controlId="formOrdenItem">
                  <Form.Label>Orden Ítem</Form.Label>
                  <Form.Control
                    type="number"
                    name="orden_item"
                    value={formData.orden_item}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group controlId="formActivo">
                  <Form.Label> </Form.Label>
                  <div>
                    <Form.Check
                      type="checkbox"
                      name="activo"
                      checked={formData.activo}
                      onChange={handleChange}
                      label="Contenido Activo"
                    />
                  </div>
                </Form.Group>
              </div>
            </div>

            {/* Subidor de Archivos Múltiples */}
            <Form.Group controlId="formMedios">
              <Form.Label>Subir Imágenes o Video (máximo 10 archivos)</Form.Label>
              <Form.Control
                type="file"
                name="medios"
                accept="image/jpeg,image/png,image/gif,video/mp4,video/mov"
                onChange={handleChange}
                multiple
              />
              <Form.Text className="text-muted">
                Selecciona múltiples archivos (imágenes o video). Asocia a un paso si aplica.
              </Form.Text>
            </Form.Group>

            <Form.Group controlId="formPasoAsociado">
              <Form.Label>Paso Asociado (opcional)</Form.Label>
              <Form.Control
                as="select"
                name="paso_asociado"
                value={formData.paso_asociado}
                onChange={handleChange}
              >
                <option value="">Ninguno</option>
                <option value="Asegura la escena">Asegura la escena</option>
                <option value="Evalúa respuesta">Evalúa respuesta</option>
                <option value="Pide ayuda y llama al 131. Pide un DEA">Pide ayuda y llama al 131. Pide un DEA</option>
                <option value="Inicia compresiones torácicas">Inicia compresiones torácicas</option>
                <option value="Si estás entrenado, realiza 30 compresiones y 2 ventilaciones">30 compresiones y 2 ventilaciones</option>
                <option value="Continúa hasta que llegue ayuda">Continúa hasta que llegue ayuda</option>
              </Form.Control>
              <Form.Text className="text-muted">
                Selecciona el paso al que asociar las imágenes o video.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {currentContenido ? 'Actualizar' : 'Crear'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default GestionEducacion;