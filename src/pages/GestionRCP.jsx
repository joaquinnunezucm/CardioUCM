import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form, Image } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import {
  isRequired,
  isInteger,
  minValue,
  isDescriptiveText, // Importamos el nuevo validador
  maxLength,
} from '../utils/validators.js';


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
    medios: [],
    mediosExistentesIdsAConservar: [],
    datosMediosExistentes: {},
  });
  const [errors, setErrors] = useState({});

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
      const response = await axios.get(`${API_BASE_URL}/api/admin/rcp`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const sortedInstrucciones = response.data.map(inst => ({
        ...inst,
        medios: inst.medios ? inst.medios.sort((a, b) => a.orden - b.orden) : []
      }));
      setInstrucciones(sortedInstrucciones);
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
          zeroRecords: 'No se encontraron instrucciones',
        },
        pageLength: 10,
        order: [[2, 'asc']],
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
        categoria: instruccion.categoria || 'RCP Adultos',
        medios: [],
        mediosExistentesIdsAConservar: instruccion.medios.map(m => m.id.toString()),
        datosMediosExistentes: instruccion.medios.reduce((acc, medio) => ({
          ...acc,
          [medio.id]: { subtitulo: medio.subtitulo || '', paso_asociado: medio.paso_asociado || '', orden: medio.orden || 0 },
        }), {}),
      });
    } else {
      setCurrentInstruccion(null);
      setFormData({
        instruccion: '',
        orden: 0,
        categoria: 'RCP Adultos',
        medios: [],
        mediosExistentesIdsAConservar: [],
        datosMediosExistentes: {},
      });
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if(errors[name]) {
      setErrors(prev => ({...prev, [name]: null}));
    }
  };

  const handleAddMedia = (e) => {
    const { files } = e.target;
    const file = files[0];
    if (!file) return;

    const newMedia = {
      file,
      subtitulo: '',
      paso_asociado: '',
      orden: formData.medios.length,
      tipo_medio: file.type.startsWith('image') ? 'imagen' : 'video',
      id: Date.now(),
    };

    setFormData((prev) => ({
      ...prev,
      medios: [...prev.medios, newMedia],
    }));
    e.target.value = null;
  };

  const handleMediaChange = (idOrIndex, field, value, isExisting = false) => {
    if (isExisting) {
      setFormData((prev) => ({
        ...prev,
        datosMediosExistentes: {
          ...prev.datosMediosExistentes,
          [idOrIndex]: { ...prev.datosMediosExistentes[idOrIndex], [field]: value },
        },
      }));
      if (errors.mediosExistentes?.[idOrIndex]?.[field]) {
        setErrors(prev => {
          const newMediosExistentes = { ...prev.mediosExistentes };
          if (newMediosExistentes[idOrIndex]) delete newMediosExistentes[idOrIndex][field];
          if (Object.keys(newMediosExistentes[idOrIndex] || {}).length === 0) delete newMediosExistentes[idOrIndex];
          return { ...prev, mediosExistentes: newMediosExistentes };
        });
      }
    } else {
      const updatedMedios = [...formData.medios];
      updatedMedios[idOrIndex] = { ...updatedMedios[idOrIndex], [field]: value };
      setFormData((prev) => ({ ...prev, medios: updatedMedios }));
      if (errors.medios?.[idOrIndex]?.[field]) {
        setErrors(prev => {
          const newMedios = { ...prev.medios };
          if (newMedios[idOrIndex]) delete newMedios[idOrIndex][field];
          if (Object.keys(newMedios[idOrIndex] || {}).length === 0) delete newMedios[idOrIndex];
          return { ...prev, medios: newMedios };
        });
      }
    }
  };

  const handleRemoveMedia = (idOrIndex, isExisting = false) => {
    if (isExisting) {
      setFormData((prev) => {
        const newIdsAConservar = prev.mediosExistentesIdsAConservar.filter(id => id !== idOrIndex.toString());
        const newDatos = { ...prev.datosMediosExistentes };
        delete newDatos[idOrIndex];
        return { ...prev, mediosExistentesIdsAConservar: newIdsAConservar, datosMediosExistentes: newDatos };
      });
    } else {
      const updatedMedios = formData.medios.filter((_, i) => i !== idOrIndex);
      setFormData((prev) => ({ ...prev, medios: updatedMedios }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const { instruccion, orden, datosMediosExistentes, medios } = formData;

    // Se usa isDescriptiveText para permitir casi todos los caracteres
    const instruccionError = isRequired(instruccion) || maxLength(1000)(instruccion) || isDescriptiveText(instruccion);
    if(instruccionError) newErrors.instruccion = instruccionError;

    const ordenError = isRequired(String(orden)) || isInteger(String(orden)) || minValue(0)(orden);
    if(ordenError) newErrors.orden = ordenError;
    
    newErrors.mediosExistentes = {};
    for (const id in datosMediosExistentes) {
      const medio = datosMediosExistentes[id];
      const subtituloError = maxLength(100)(medio.subtitulo) || isDescriptiveText(medio.subtitulo);
      const ordenMError = isRequired(String(medio.orden)) || isInteger(String(medio.orden)) || minValue(0)(medio.orden);
      
      if (subtituloError || ordenMError) {
        newErrors.mediosExistentes[id] = {};
        if (subtituloError) newErrors.mediosExistentes[id].subtitulo = subtituloError;
        if (ordenMError) newErrors.mediosExistentes[id].orden = ordenMError;
      }
    }
    if(Object.keys(newErrors.mediosExistentes).length === 0) delete newErrors.mediosExistentes;

    newErrors.medios = {};
    medios.forEach((medio, index) => {
      const subtituloError = maxLength(100)(medio.subtitulo) || isDescriptiveText(medio.subtitulo);
      const ordenMError = isRequired(String(medio.orden)) || isInteger(String(medio.orden)) || minValue(0)(medio.orden);

      if (subtituloError || ordenMError) {
        newErrors.medios[index] = {};
        if (subtituloError) newErrors.medios[index].subtitulo = subtituloError;
        if (ordenMError) newErrors.medios[index].orden = ordenMError;
      }
    });
    if(Object.keys(newErrors.medios).length === 0) delete newErrors.medios;

    return newErrors;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const formErrors = validate();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      Swal.fire('Formulario Incompleto', 'Por favor, corrige los errores marcados en el formulario.', 'error');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('instruccion', formData.instruccion);
    formDataToSend.append('orden', formData.orden.toString());
    formDataToSend.append('categoria', formData.categoria);
    formDataToSend.append('medios_existentes_ids_a_conservar', JSON.stringify(formData.mediosExistentesIdsAConservar));
    formDataToSend.append('datos_medios_existentes', JSON.stringify(formData.datosMediosExistentes));

    const nuevosArchivos = [];
    const nuevosSubtitulos = [];
    const nuevosPasosAsociados = [];
    const nuevosOrdenes = [];
    const nuevosTiposMedio = [];

    formData.medios.forEach((medio) => {
      if (medio.file) {
        nuevosArchivos.push(medio.file);
        nuevosSubtitulos.push(medio.subtitulo || '');
        nuevosPasosAsociados.push(medio.paso_asociado || '');
        nuevosOrdenes.push(medio.orden || 0);
        nuevosTiposMedio.push(medio.tipo_medio || (medio.file.type.startsWith('image') ? 'imagen' : 'video'));
      }
    });

    nuevosArchivos.forEach(file => {
      formDataToSend.append('medios', file);
    });

    if (nuevosArchivos.length > 0) {
      formDataToSend.append('nuevos_medios_subtitulos', JSON.stringify(nuevosSubtitulos));
      formDataToSend.append('nuevos_medios_pasos_asociados', JSON.stringify(nuevosPasosAsociados));
      formDataToSend.append('nuevos_medios_ordenes', JSON.stringify(nuevosOrdenes));
      formDataToSend.append('nuevos_medios_tipos_medio', JSON.stringify(nuevosTiposMedio));
    }

    try {
      const url = currentInstruccion
  ? `${API_BASE_URL}/api/admin/rcp/${currentInstruccion.id}`
  : `${API_BASE_URL}/api/admin/rcp`;
      const method = currentInstruccion ? 'put' : 'post';

      await axios({
        method,
        url,
        data: formDataToSend,
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      Swal.fire(currentInstruccion ? 'Actualizado' : 'Creado', `La instrucción fue ${currentInstruccion ? 'actualizada' : 'creada'} correctamente.`, 'success');
      fetchInstrucciones();
      handleCloseModal();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al guardar la instrucción.';
      Swal.fire('Error', errorMsg, 'error');
      if (error.response && typeof error.response.data === 'string' && error.response.data.startsWith('<!DOCTYPE html>')) {
        console.error('Error HTML:', error.response.data);
      } else {
        console.error('Error details:', error.response ? error.response.data : error.message);
      }
    }
  };

  const handleDelete = (id) => {
    const instruccionAEliminar = instrucciones.find(i => i.id === id);
    Swal.fire({
      title: '¿Estás seguro?',
      text: `"${instruccionAEliminar ? instruccionAEliminar.instruccion : 'Esta instrucción'}" se eliminará permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_BASE_URL}api/admin/rcp/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          });
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
        <div className="text-center">
            <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Cargando...</span>
            </div>
            <p>Cargando instrucciones...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table ref={tableRef} className="table table-bordered table-hover">
            <thead className="thead-light">
              <tr>
                <th>Instrucción</th>
                <th>Medios</th>
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
                      {instruccion.medios && instruccion.medios.length > 0 ? (
                        <div className="d-flex flex-wrap gap-2">
                          {instruccion.medios.map((medio) => (
                            <div key={medio.id} className="text-center p-1 border rounded" style={{maxWidth: '120px'}}>
                              <Image
                                src={`${API_BASE_URL}${medio.url_medio}`}
                                alt={medio.subtitulo || 'Medio'}
                                fluid
                                style={{ maxHeight: '80px', objectFit: 'contain' }}
                                onError={(e) => { e.target.onerror = null; e.target.src="https://via.placeholder.com/80?text=Error"; }}
                              />
                              {medio.subtitulo && <p className="small mt-1 mb-0 text-truncate" title={medio.subtitulo}>{medio.subtitulo}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">Sin medios</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>{instruccion.orden}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-sm btn-info mr-1 mb-1"
                        onClick={() => handleShowModal(instruccion)}
                        title="Editar"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-danger mb-1"
                        onClick={() => handleDelete(instruccion.id)}
                        title="Eliminar"
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

      <Modal show={showModal} onHide={handleCloseModal} size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>
            {currentInstruccion ? 'Editar Instrucción RCP' : 'Nueva Instrucción RCP'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit} noValidate>
          <Modal.Body>
            <Form.Group controlId="formInstruccion" className="mb-3">
              <Form.Label>Instrucción*</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="instruccion"
                value={formData.instruccion}
                onChange={handleChange}
                isInvalid={!!errors.instruccion}
              />
              <Form.Text muted>Texto descriptivo. Se permiten la mayoría de los caracteres y símbolos.</Form.Text>
              <Form.Control.Feedback type="invalid">{errors.instruccion}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="formOrden" className="mb-3">
              <Form.Label>Orden*</Form.Label>
              <Form.Control
                type="number"
                name="orden"
                value={formData.orden}
                onChange={handleChange}
                min="0"
                isInvalid={!!errors.orden}
              />
              <Form.Text muted>Número para ordenar. El más bajo aparece primero.</Form.Text>
              <Form.Control.Feedback type="invalid">{errors.orden}</Form.Control.Feedback>
            </Form.Group>

            {/* El campo Categoría ya no se muestra al usuario, su valor es fijo */}

            {currentInstruccion?.medios?.length > 0 && (
              <Form.Group controlId="formMediosExistentes" className="mb-3">
                <Form.Label className="font-weight-bold">Medios Existentes</Form.Label>
                {currentInstruccion.medios
                    .filter(medio => formData.mediosExistentesIdsAConservar.includes(medio.id.toString()))
                    .sort((a,b) => (formData.datosMediosExistentes[a.id]?.orden || 0) - (formData.datosMediosExistentes[b.id]?.orden || 0))
                    .map((medio) => (
                  <div key={medio.id} className="border p-3 mb-3 rounded bg-light">
                    <div className="d-flex align-items-start">
                      <Image
                        src={`${API_BASE_URL}${medio.url_medio}`}
                        alt={formData.datosMediosExistentes[medio.id]?.subtitulo || 'Medio existente'}
                        className="img-fluid mr-3 border"
                        style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain' }}
                      />
                      <div className="flex-grow-1">
                        <Form.Group controlId={`formSubtituloExistente-${medio.id}`} className="mb-2">
                          <Form.Label className="small mb-0">Subtítulo</Form.Label>
                          <Form.Control
                            type="text"
                            size="sm"
                            value={formData.datosMediosExistentes[medio.id]?.subtitulo || ''}
                            onChange={(e) => handleMediaChange(medio.id, 'subtitulo', e.target.value, true)}
                            isInvalid={!!errors.mediosExistentes?.[medio.id]?.subtitulo}
                          />
                          <Form.Control.Feedback type="invalid">{errors.mediosExistentes?.[medio.id]?.subtitulo}</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group controlId={`formOrdenExistente-${medio.id}`} className="mb-2">
                          <Form.Label className="small mb-0">Orden del Medio*</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            value={formData.datosMediosExistentes[medio.id]?.orden || 0}
                            onChange={(e) => handleMediaChange(medio.id, 'orden', e.target.value, true)}
                            min="0"
                            isInvalid={!!errors.mediosExistentes?.[medio.id]?.orden}
                          />
                           <Form.Control.Feedback type="invalid">{errors.mediosExistentes?.[medio.id]?.orden}</Form.Control.Feedback>
                        </Form.Group>
                      </div>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="ml-2 align-self-center"
                        onClick={() => handleRemoveMedia(medio.id, true)}
                        title="Quitar este medio"
                      >
                        <i className="fas fa-times"></i>
                      </Button>
                    </div>
                  </div>
                ))}
              </Form.Group>
            )}

            <Form.Group controlId="formNuevosMedios" className="mb-3">
              <Form.Label className="font-weight-bold">Añadir Nuevos Medios</Form.Label>
              <div className="mb-3">
                <Form.Control
                  type="file"
                  accept="image/gif,image/png,image/jpeg,video/mp4,video/mov"
                  onChange={handleAddMedia}
                  multiple={false}
                />
                <Form.Text className="text-muted">
                  Sube un GIF, imagen o video. Puedes añadir varios uno por uno.
                </Form.Text>
              </div>
              {formData.medios.map((medio, index) => (
                <div key={medio.id} className="border p-3 mb-3 rounded bg-light">
                  <div className="d-flex align-items-start">
                    {medio.file && (
                      <Image
                        src={URL.createObjectURL(medio.file)}
                        alt="Vista previa del nuevo medio"
                        className="img-fluid mr-3 border"
                        style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain' }}
                        onLoad={() => URL.revokeObjectURL(medio.file)}
                      />
                    )}
                    <div className="flex-grow-1">
                      <Form.Group controlId={`formSubtituloNuevo-${index}`} className="mb-2">
                        <Form.Label className="small mb-0">Subtítulo</Form.Label>
                        <Form.Control
                          type="text"
                          size="sm"
                          value={medio.subtitulo}
                          onChange={(e) => handleMediaChange(index, 'subtitulo', e.target.value, false)}
                          isInvalid={!!errors.medios?.[index]?.subtitulo}
                        />
                         <Form.Control.Feedback type="invalid">{errors.medios?.[index]?.subtitulo}</Form.Control.Feedback>
                      </Form.Group>
                      <Form.Group controlId={`formOrdenNuevo-${index}`} className="mb-2">
                        <Form.Label className="small mb-0">Orden del Medio*</Form.Label>
                        <Form.Control
                          type="number"
                          size="sm"
                          value={medio.orden}
                          onChange={(e) => handleMediaChange(index, 'orden', e.target.value, false)}
                          min="0"
                          isInvalid={!!errors.medios?.[index]?.orden}
                        />
                        <Form.Control.Feedback type="invalid">{errors.medios?.[index]?.orden}</Form.Control.Feedback>
                      </Form.Group>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="ml-2 align-self-center"
                      onClick={() => handleRemoveMedia(index, false)}
                      title="Quitar este nuevo medio"
                    >
                      <i className="fas fa-times"></i>
                    </Button>
                  </div>
                </div>
              ))}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {currentInstruccion ? 'Actualizar Instrucción' : 'Crear Instrucción'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default GestionRCP;