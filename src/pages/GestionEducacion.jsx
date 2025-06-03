import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form, Table, Image, Badge } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE_URL_FRONTEND = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const opcionesPasoAsociadoDefault = [
  { value: "", label: "Ninguno / General" },
  { value: "Asegura la escena", label: "Asegura la escena" },
  { value: "Evalúa respuesta", label: "Evalúa respuesta" },
  { value: "Pide ayuda y llama al 131. Pide un DEA", label: "Pide ayuda y llama al 131. Pide un DEA" },
  { value: "Inicia compresiones torácicas", label: "Inicia compresiones torácicas" },
  { value: "Si estás entrenado, realiza 30 compresiones y 2 ventilaciones", label: "30 compresiones y 2 ventilaciones" },
  { value: "Continúa hasta que llegue ayuda", label: "Continúa hasta que llegue ayuda" },
];

const GestionEducacion = () => {
  const [contenidos, setContenidos] = useState([]);
  const [mediosExistentesPorContenido, setMediosExistentesPorContenido] = useState({});
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
  });

  const [mediosParaModal, setMediosParaModal] = useState([]);
  const { token } = useAuth();

  const getAuthHeaders = (isFormData = true) => ({
    headers: {
      'Authorization': `Bearer ${token}`,
      ...(isFormData && { 'Content-Type': 'multipart/form-data' }),
      ...(!isFormData && { 'Content-Type': 'application/json' }),
    },
  });

  const fetchContenidosYMedios = async () => {
    try {
      setLoading(true);
      if ($.fn.dataTable.isDataTable(tableRef.current)) {
        $(tableRef.current).DataTable().destroy();
      }
      setTableInitialized(false);
      if (!token) {
        console.warn("Token no disponible. Abortando carga de datos de gestión.");
        setLoading(false);
        return;
      }

      const [resContenidos, resMediosTodos] = await Promise.all([
        axios.get(`${API_BASE_URL_FRONTEND}/api/admin/educacion`, getAuthHeaders(false)),
        axios.get(`${API_BASE_URL_FRONTEND}/api/educacion/medios`, getAuthHeaders(false))
      ]);

      setContenidos(resContenidos.data);

      const mediosAgrupados = resMediosTodos.data.reduce((acc, medio) => {
        const contenidoId = medio.contenido_id.toString();
        if (!acc[contenidoId]) acc[contenidoId] = [];
        acc[contenidoId].push(medio);
        return acc;
      }, {});
      setMediosExistentesPorContenido(mediosAgrupados);

    } catch (error) {
      console.error('Error al obtener datos de gestión educativa:', error.response?.data || error.message);
      Swal.fire('Error', `No se pudieron cargar los datos para gestión. ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchContenidosYMedios();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && contenidos.length > 0 && !tableInitialized && tableRef.current) {
      $(tableRef.current).DataTable({
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ contenidos',
          paginate: { previous: 'Anterior', next: 'Siguiente' },
          zeroRecords: 'No se encontraron contenidos educativos que coincidan con la búsqueda',
          infoEmpty: 'Mostrando 0 a 0 de 0 contenidos',
          infoFiltered: '(filtrado de _MAX_ contenidos totales)',
        },
        order: [[1, 'asc'], [3, 'asc']],
        columnDefs: [{ orderable: false, targets: [5] }],
        responsive: true,
      });
      setTableInitialized(true);
    }
  }, [loading, contenidos, tableInitialized]);

  const handleShowModal = (contenido = null) => {
    setCurrentContenido(contenido);
    if (contenido) {
      setFormData({
        categoria_id: contenido.categoria_id,
        categoria_nombre: contenido.categoria_nombre,
        titulo_tema: contenido.titulo_tema,
        contenido_tema: contenido.contenido_tema,
        orden_categoria: contenido.orden_categoria || 0,
        orden_item: contenido.orden_item || 0,
        activo: contenido.activo === 1 || contenido.activo === true,
      });
      const existentes = (mediosExistentesPorContenido[contenido.id.toString()] || []).map(m => ({
        id: m.id.toString(),
        previewUrl: `${API_BASE_URL_FRONTEND}${m.url_medio}`,
        nombreArchivo: m.url_medio.split('/').pop(),
        paso_asociado: m.paso_asociado || '',
        subtitulo_medio: m.subtitulo_medio || '',
        tipo_medio: m.tipo_medio,
        orden: m.orden || 0,
        esNuevo: false
      }));
      setMediosParaModal(existentes);
    } else {
      setFormData({
        categoria_id: '', categoria_nombre: '', titulo_tema: '', contenido_tema: '',
        orden_categoria: 0, orden_item: 0, activo: true,
      });
      setMediosParaModal([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    mediosParaModal.forEach(medio => {
      if (medio.esNuevo && medio.previewUrl && medio.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(medio.previewUrl);
      }
    });
    setShowModal(false);
    setCurrentContenido(null);
    setMediosParaModal([]);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : ((name === 'orden_categoria' || name === 'orden_item') ? (parseInt(value) || 0) : value)
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const nuevosMediosParaPreview = files.map((file, index) => ({
      file: file,
      previewUrl: URL.createObjectURL(file),
      nombreArchivo: file.name,
      paso_asociado: '',
      subtitulo_medio: '',
      tipo_medio: file.type.startsWith('image/') ? 'imagen' : (file.type.startsWith('video/') ? 'video' : 'desconocido'),
      esNuevo: true,
      orden: mediosParaModal.length + index,
    }));
    setMediosParaModal(prev => [...prev, ...nuevosMediosParaPreview]);
    e.target.value = null;
  };

  const handleMedioFieldChange = (index, fieldName, value) => {
    setMediosParaModal(prev =>
      prev.map((medio, i) =>
        i === index ? { ...medio, [fieldName]: fieldName === 'orden' ? parseInt(value) || 0 : value } : medio
      )
    );
  };

  const handleRemoveMedioFromModal = (indexToRemove) => {
    const medioARemover = mediosParaModal[indexToRemove];
    if (medioARemover.esNuevo && medioARemover.previewUrl && medioARemover.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(medioARemover.previewUrl);
    }
    setMediosParaModal(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { categoria_id, categoria_nombre, titulo_tema, contenido_tema } = formData;
    if (!categoria_id.trim() || !categoria_nombre.trim() || !titulo_tema.trim() || !contenido_tema.trim()) {
      Swal.fire('Campos incompletos', 'Los campos: Categoría (ID y Nombre), Título del Tema y Contenido del Tema son obligatorios.', 'warning');
      return;
    }

    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => formDataToSend.append(key, formData[key]));

    const pasosAsociadosNuevosMedios = [];
    const subtitulosNuevosMedios = [];
    const ordenesNuevosMedios = [];

    mediosParaModal.forEach(medio => {
      if (medio.esNuevo && medio.file) {
        formDataToSend.append('medios', medio.file);
        pasosAsociadosNuevosMedios.push(medio.paso_asociado || '');
        subtitulosNuevosMedios.push(medio.subtitulo_medio || '');
        ordenesNuevosMedios.push(medio.orden || 0);
      }
    });

    if (currentContenido) {
      const mediosExistentesAConservarIds = mediosParaModal
        .filter(m => !m.esNuevo && m.id)
        .map(m => m.id);
      formDataToSend.append('medios_existentes_ids_a_conservar', JSON.stringify(mediosExistentesAConservarIds));

      const datosMediosExistentes = {};
      mediosParaModal.filter(m => !m.esNuevo && m.id).forEach(m => {
        datosMediosExistentes[m.id] = {
          paso_asociado: m.paso_asociado || '',
          subtitulo_medio: m.subtitulo_medio || '',
          orden: m.orden || 0,
        };
      });

   

      formDataToSend.append('datos_medios_existentes', JSON.stringify(datosMediosExistentes));
      formDataToSend.append('pasos_asociados_nuevos_medios', JSON.stringify(pasosAsociadosNuevosMedios));
      formDataToSend.append('subtitulos_nuevos_medios', JSON.stringify(subtitulosNuevosMedios));
      formDataToSend.append('ordenes_nuevos_medios', JSON.stringify(ordenesNuevosMedios));
    } else {
      formDataToSend.append('pasos_asociados_medios', JSON.stringify(pasosAsociadosNuevosMedios));
      formDataToSend.append('subtitulos_medios', JSON.stringify(subtitulosNuevosMedios));
      formDataToSend.append('ordenes_medios', JSON.stringify(ordenesNuevosMedios));
    }

    try {
      Swal.fire({
        title: currentContenido ? 'Actualizando...' : 'Creando...',
        text: 'Por favor espera.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      if (currentContenido) {
        await axios.put(`${API_BASE_URL_FRONTEND}/api/admin/educacion/${currentContenido.id}`, formDataToSend, getAuthHeaders());
        Swal.fire('Actualizado!', 'El contenido educativo ha sido actualizado correctamente.', 'success');
      } else {
        await axios.post(`${API_BASE_URL_FRONTEND}/api/admin/educacion`, formDataToSend, getAuthHeaders());
        Swal.fire('Creado!', 'El contenido educativo ha sido creado exitosamente.', 'success');
      }
      fetchContenidosYMedios();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar contenido educativo:', error.response?.data || error.message);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo guardar el contenido educativo.', 'error');
    }
  };

  const handleDeleteContenido = async (id, titulo) => {
    if (!token) {
      Swal.fire('Error', 'No autenticado. No se puede eliminar.', 'error');
      return;
    }
    Swal.fire({
      title: '¿Estás seguro?',
      html: `El contenido "<b>${titulo}</b>" y todos sus medios asociados se eliminarán permanentemente.<br/>¡Esta acción no se puede deshacer!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar todo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({ title: 'Eliminando...', text: 'Por favor espera.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
          await axios.delete(`${API_BASE_URL_FRONTEND}/api/admin/educacion/${id}`, getAuthHeaders(false));
          Swal.fire('Eliminado!', 'El contenido educativo y sus medios han sido eliminados.', 'success');
          fetchContenidosYMedios();
        } catch (error) {
          console.error('Error al eliminar contenido educativo:', error.response?.data || error.message);
          Swal.fire('Error', error.response?.data?.message || 'No se pudo eliminar el contenido educativo.', 'error');
        }
      }
    });
  };

  if (!token && !loading) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning text-center">
          <h4><i className="fas fa-exclamation-triangle me-2"></i>Acceso Restringido</h4>
          <p>Debe estar autenticado para acceder a esta sección de gestión.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Gestión de Contenido Educativo</h3>
        <Button variant="success" onClick={() => handleShowModal()}>
          <i className="fas fa-plus me-2"></i> Nuevo Contenido
        </Button>
      </div>

      {loading ? (
        <div className="text-center p-5">
          <i className="fas fa-spinner fa-spin fa-3x text-primary"></i>
          <p className="mt-2">Cargando contenidos...</p>
        </div>
      ) : contenidos.length === 0 ? (
        <div className="alert alert-info text-center">
          <i className="fas fa-info-circle me-2"></i>No hay contenidos educativos para mostrar. Crea uno nuevo para empezar.
        </div>
      ) : (
        <div className="table-responsive shadow-sm bg-white p-3 rounded">
          <Table striped bordered hover responsive ref={tableRef} id="tablaContenidosEducacion" className="w-100">
            <thead className="thead-light">
              <tr>
                <th>Título del Tema</th>
                <th>Categoría</th>
                <th className="text-center" style={{width: '10%'}}>Orden Cat.</th>
                <th className="text-center" style={{width: '10%'}}>Orden Item</th>
                <th className="text-center" style={{width: '8%'}}>Activo</th>
                <th className="text-center" style={{width: '120px'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {contenidos.map((contenido) => (
                <tr key={contenido.id}>
                  <td>{contenido.titulo_tema}</td>
                  <td>
                    {contenido.categoria_nombre}
                    <br />
                    <small className="text-muted">ID: {contenido.categoria_id}</small>
                  </td>
                  <td className="text-center">{contenido.orden_categoria}</td>
                  <td className="text-center">{contenido.orden_item}</td>
                  <td className="text-center">
                    {contenido.activo ? <Badge bg="success">Sí</Badge> : <Badge bg="secondary">No</Badge>}
                  </td>
                  <td className="text-center">
                    <Button variant="info" size="sm" className="me-1" title="Editar Contenido" onClick={() => handleShowModal(contenido)}>
                      <i className="fas fa-edit"></i>
                    </Button>
                    <Button variant="danger" size="sm" title="Eliminar Contenido" onClick={() => handleDeleteContenido(contenido.id, contenido.titulo_tema)}>
                      <i className="fas fa-trash"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Modal show={showModal} onHide={handleCloseModal} size="xl" backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title>{currentContenido ? 'Editar Contenido Educativo' : 'Crear Nuevo Contenido Educativo'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3" controlId="formCategoriaId">
                  <Form.Label>ID Categoría <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="categoria_id"
                    value={formData.categoria_id}
                    onChange={handleFormChange}
                    placeholder="ej: rcp-adultos"
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3" controlId="formCategoriaNombre">
                  <Form.Label>Nombre Categoría <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="categoria_nombre"
                    value={formData.categoria_nombre}
                    onChange={handleFormChange}
                    placeholder="ej: RCP en Adultos"
                    required
                  />
                </Form.Group>
              </div>
            </div>
            <Form.Group className="mb-3" controlId="formTituloTema">
              <Form.Label>Título del Tema <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="titulo_tema"
                value={formData.titulo_tema}
                onChange={handleFormChange}
                placeholder="ej: ¿Cómo realizar RCP?"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formContenidoTema">
              <Form.Label>Contenido del Tema <span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                name="contenido_tema"
                value={formData.contenido_tema}
                onChange={handleFormChange}
                placeholder="Describe el tema. Puedes usar HTML básico (p, ul, ol, li, a, strong, em, br)."
                required
              />
            </Form.Group>
            <div className="row">
              <div className="col-md-4">
                <Form.Group className="mb-3" controlId="formOrdenCategoria">
                  <Form.Label>Orden Categoría</Form.Label>
                  <Form.Control
                    type="number"
                    name="orden_categoria"
                    value={formData.orden_categoria}
                    onChange={handleFormChange}
                    min="0"
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3" controlId="formOrdenItem">
                  <Form.Label>Orden Ítem dentro de Categoría</Form.Label>
                  <Form.Control
                    type="number"
                    name="orden_item"
                    value={formData.orden_item}
                    onChange={handleFormChange}
                    min="0"
                  />
                </Form.Group>
              </div>
              <div className="col-md-4 align-self-center pt-3">
                <Form.Group className="mb-3" controlId="formActivo">
                  <Form.Check
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleFormChange}
                    label="Este contenido está Activo y visible"
                  />
                </Form.Group>
              </div>
            </div>

            <hr className="my-4"/>
            <h5><i className="fas fa-photo-video me-2"></i>Gestión de Medios Asociados</h5>
            <Form.Group className="mb-3" controlId="formNuevosMedios">
              <Form.Label>Subir Nuevos Archivos (Imágenes o Videos)</Form.Label>
              <Form.Control
                type="file"
                accept="image/jpeg,image/png,image/gif,video/mp4,video/mov"
                onChange={handleFileChange}
                multiple
              />
              <Form.Text className="text-muted">
                Selecciona uno o varios archivos. Luego podrás asignarles un subtítulo y un orden en la tabla de abajo.
              </Form.Text>
            </Form.Group>

            {mediosParaModal.length > 0 && (
              <div className="table-responsive mt-3 border rounded p-2">
                <h6>Medios Actuales y Nuevos para este Contenido:</h6>
                <Table striped bordered hover responsive size="sm" className="mt-2">
                  <thead className="table-light">
                    <tr>
                      <th style={{width:'100px'}} className="text-center">Preview</th>
                      <th>Nombre Archivo</th>
                      <th style={{width:'200px'}}>Paso Asociado</th>
                      <th style={{width:'220px'}}>Subtítulo del Medio</th>
                      <th style={{width:'80px'}} className="text-center">Orden</th>
                      <th style={{width:'80px'}} className="text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediosParaModal.map((medio, index) => (
                      <tr key={medio.id || medio.nombreArchivo + index}>
                        <td className="text-center align-middle">
                          {medio.tipo_medio === 'imagen' ? (
                            <Image src={medio.previewUrl} thumbnail style={{ maxHeight: '60px', maxWidth: '90px', objectFit: 'contain' }} alt="Preview"/>
                          ) : medio.tipo_medio === 'video' ? (
                            <video src={medio.previewUrl} style={{ maxHeight: '60px', maxWidth: '90px', display: 'block', margin: 'auto' }} controls={false} muted playsInline />
                          ) : (
                            <span className="text-muted fst-italic">{medio.tipo_medio || 'Archivo'}</span>
                          )}
                        </td>
                        <td style={{wordBreak:'break-all'}} className="align-middle">
                          {medio.nombreArchivo} {medio.esNuevo && <Badge bg="info" className="ms-1">Nuevo</Badge>}
                        </td>
                        <td className="align-middle">
                          <Form.Control
                            as="select"
                            size="sm"
                            value={medio.paso_asociado}
                            onChange={(e) => handleMedioFieldChange(index, 'paso_asociado', e.target.value)}
                          >
                            {opcionesPasoAsociadoDefault.map(op => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                            {!opcionesPasoAsociadoDefault.find(op => op.value === medio.paso_asociado) && medio.paso_asociado && (
                              <option value={medio.paso_asociado}>{medio.paso_asociado} (Personalizado)</option>
                            )}
                          </Form.Control>
                        </td>
                        <td className="align-middle">
                          <Form.Control
                            type="text"
                            size="sm"
                            placeholder="Subtítulo (ej: Posición de manos)"
                            value={medio.subtitulo_medio || ''}
                            onChange={(e) => handleMedioFieldChange(index, 'subtitulo_medio', e.target.value)}
                          />
                        </td>
                        <td className="text-center align-middle">
                          <Form.Control
                            type="number"
                            size="sm"
                            min="0"
                            value={medio.orden || 0}
                            onChange={(e) => handleMedioFieldChange(index, 'orden', e.target.value)}
                          />
                        </td>
                        <td className="text-center align-middle">
                          <Button
                            variant="outline-danger"
                            size="sm"
                            title={medio.esNuevo ? "Quitar de la lista de nuevos" : "Quitar de la lista (se eliminará al guardar si era existente)"}
                            onClick={() => handleRemoveMedioFromModal(index)}
                          >
                            <i className="fas fa-times"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
            <Button variant="primary" type="submit">{currentContenido ? 'Actualizar Cambios' : 'Crear Contenido'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default GestionEducacion;