import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = 'http://localhost:3001'; // Define tu URL base de la API

// --- Formulario para Contenido RCP ---
const RCPForm = ({ onSubmit, onClose, initialData = {}, isSubmitting }) => {
  const [formData, setFormData] = useState({
    titulo_seccion: '',
    paso_descripcion: '',
    orden: 0,
    activo: true,
    // No incluimos imagen_paso aquí, se manejará por separado
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [formError, setFormError] = useState('');
  const [eliminarImagenActual, setEliminarImagenActual] = useState(false);


  useEffect(() => {
    setFormData({
      titulo_seccion: initialData.titulo_seccion || '',
      paso_descripcion: initialData.paso_descripcion || '',
      orden: initialData.orden !== undefined ? initialData.orden : 0,
      activo: initialData.activo !== undefined ? initialData.activo : true,
    });
    setPreviewUrl(initialData.ruta_imagen ? `${API_URL}${initialData.ruta_imagen}` : null);
    setSelectedFile(null); // Resetear archivo seleccionado al cambiar initialData
    setFormError('');
    setEliminarImagenActual(false);
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value, 10) || 0 : value)
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Crear URL de previsualización
      setEliminarImagenActual(false); // Si se sube nueva, no marcar para eliminar la actual (si la acción fuera al revés)
    } else {
      setSelectedFile(null);
      // Mantener la previsualización de la imagen existente si no se selecciona un nuevo archivo
      setPreviewUrl(initialData.ruta_imagen ? `${API_URL}${initialData.ruta_imagen}` : null);
    }
  };
  
  const handleEliminarImagenChange = (e) => {
    setEliminarImagenActual(e.target.checked);
    if (e.target.checked) {
        setSelectedFile(null); // Si se marca eliminar, quitar cualquier archivo nuevo seleccionado
        setPreviewUrl(null); // Y quitar la previsualización
    } else if (!selectedFile && initialData.ruta_imagen) {
        // Si se desmarca y no hay archivo nuevo, restaurar previsualización de imagen existente
        setPreviewUrl(`${API_URL}${initialData.ruta_imagen}`);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.paso_descripcion) {
      setFormError('La descripción del paso es requerida.');
      return;
    }

    // Crear FormData para enviar datos y archivo
    const dataPayload = new FormData();
    dataPayload.append('titulo_seccion', formData.titulo_seccion);
    dataPayload.append('paso_descripcion', formData.paso_descripcion);
    dataPayload.append('orden', formData.orden);
    dataPayload.append('activo', formData.activo);
    if (selectedFile) {
      dataPayload.append('imagen_paso', selectedFile); // 'imagen_paso' debe coincidir con uploadRcpImage.single() en backend
    }
    if (initialData.id && eliminarImagenActual) { // Solo enviar si es edición y se marcó
        dataPayload.append('eliminar_imagen_actual', 'true');
    }


    const result = await onSubmit(dataPayload, initialData.id);
    if (result && result.error) {
      setFormError(result.message || 'Ocurrió un error al guardar el contenido RCP.');
    } else if (result && result.success) {
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      {formError && <div className="alert alert-danger p-2 mb-3">{formError}</div>}
      
      <div className="form-group mb-3">
        <label htmlFor="titulo_seccion_form">Título de la Sección (Opcional)</label>
        <input type="text" className="form-control" id="titulo_seccion_form" name="titulo_seccion" value={formData.titulo_seccion} onChange={handleChange} disabled={isSubmitting} />
      </div>

      <div className="form-group mb-3">
        <label htmlFor="paso_descripcion_form">Descripción del Paso / Información</label>
        <textarea className="form-control" id="paso_descripcion_form" name="paso_descripcion" value={formData.paso_descripcion} onChange={handleChange} rows="4" required disabled={isSubmitting}></textarea>
      </div>

      <div className="form-group mb-3">
        <label htmlFor="imagen_paso_form">Imagen del Paso (Opcional)</label>
        <input type="file" className="form-control-file" id="imagen_paso_form" name="imagen_paso" accept="image/*" onChange={handleFileChange} disabled={isSubmitting} />
        {previewUrl && (
          <div className="mt-2">
            <img src={previewUrl} alt="Previsualización" style={{ maxHeight: '150px', borderRadius: '4px', border: '1px solid #ddd' }} />
          </div>
        )}
         {initialData.id && initialData.ruta_imagen && !selectedFile && ( // Mostrar solo en edición si hay imagen y no se ha seleccionado una nueva
            <div className="form-group form-check mt-2">
                <input 
                    type="checkbox" 
                    className="form-check-input" 
                    id="eliminar_imagen_actual_form"
                    checked={eliminarImagenActual}
                    onChange={handleEliminarImagenChange}
                    disabled={isSubmitting}
                />
                <label className="form-check-label" htmlFor="eliminar_imagen_actual_form">
                    Eliminar imagen actual
                </label>
            </div>
        )}
      </div>

      <div className="row">
        <div className="col-md-6 form-group mb-3">
          <label htmlFor="orden_form">Orden</label>
          <input type="number" className="form-control" id="orden_form" name="orden" value={formData.orden} onChange={handleChange} disabled={isSubmitting} />
        </div>
        <div className="col-md-6 form-group mb-3 d-flex align-items-center pt-3">
          <div className="custom-control custom-switch">
            <input type="checkbox" className="custom-control-input" id="activo_form_rcp" name="activo" checked={formData.activo} onChange={handleChange} disabled={isSubmitting} />
            <label className="custom-control-label" htmlFor="activo_form_rcp">Activo</label>
          </div>
        </div>
      </div>

      <div className="modal-footer justify-content-end p-0 border-top-0 pt-3">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" className="btn btn-primary ml-2" disabled={isSubmitting}>
          {isSubmitting ? (initialData.id ? 'Actualizando...' : 'Creando...') : (initialData.id ? 'Actualizar Paso' : 'Crear Paso')}
        </button>
      </div>
    </form>
  );
};


// --- Componente Principal GestionRCP ---
function GestionRCP() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });

  const { token, logout } = useAuth();

  const getAuthHeaders = useCallback((isFormData = false) => {
    if (!token) {
      console.error("GestionRCP: Token no disponible.");
      return {};
    }
    const headers = { 'Authorization': `Bearer ${token}` };
    if (!isFormData) { // Para JSON
      // headers['Content-Type'] = 'application/json'; // Axios lo hace por defecto para objetos JS
    }
    // Para FormData, Axios establece Content-Type automáticamente a multipart/form-data con el boundary correcto.
    // No establezcas Content-Type manualmente para FormData.
    return { headers };
  }, [token]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setFeedbackMessage({ type: '', text: '' });
    if (!token) {
      setError("No autenticado."); setLoading(false); setItems([]); return;
    }
    try {
      const response = await axios.get(`${API_URL}/api/admin/rcp-contenido`, getAuthHeaders());
      setItems(response.data);
      setError('');
    } catch (err) {
      console.error("Error fetching RCP items:", err);
      const errorMessage = err.response?.data?.message || err.message || 'Error al cargar contenido RCP.';
      setError(errorMessage); setItems([]);
      if (err.response?.status === 401 || err.response?.status === 403) {
        // logout(); // Opcional
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, token, logout]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshTrigger]);

  const handleOpenModal = (itemToEdit = null) => {
    setEditingItem(itemToEdit);
    setFeedbackMessage({ type: '', text: '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // formData aquí es un objeto FormData
  const handleSubmitForm = async (formDataPayload, itemId) => {
    setIsSubmitting(true);
    setFeedbackMessage({ type: '', text: '' });
    if (!token) {
        setIsSubmitting(false);
        return { error: true, message: "No autenticado." };
    }
    try {
      let response;
      if (itemId) {
        response = await axios.put(`${API_URL}/api/admin/rcp-contenido/${itemId}`, formDataPayload, getAuthHeaders(true)); // true para FormData
      } else {
        response = await axios.post(`${API_URL}/api/admin/rcp-contenido`, formDataPayload, getAuthHeaders(true)); // true para FormData
      }
      setFeedbackMessage({ type: 'success', text: response.data.message || (itemId ? 'Actualizado.' : 'Creado.') });
      setRefreshTrigger(prev => prev + 1);
      setIsSubmitting(false);
      return { success: true };
    } catch (err) {
      console.error("Error guardando contenido RCP:", err.response?.data || err.message, err.response);
      const errorMessage = err.response?.data?.message || "Error al guardar.";
      setIsSubmitting(false);
      return { error: true, message: errorMessage };
    }
  };

  const handleDeleteItem = async (itemId, titulo) => {
    setFeedbackMessage({ type: '', text: '' });
    if (!token) {
        setFeedbackMessage({ type: 'error', text: "No autenticado." }); return;
    }
    const itemDescription = titulo || `paso ID ${itemId}`;
    if (window.confirm(`¿Eliminar "${itemDescription}"?`)) {
      setIsSubmitting(true);
      try {
        await axios.delete(`${API_URL}/api/admin/rcp-contenido/${itemId}`, getAuthHeaders());
        setFeedbackMessage({ type: 'success', text: `"${itemDescription}" eliminado.`});
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error("Error eliminando contenido RCP:", err);
        const errorMessage = err.response?.data?.message || "Error al eliminar.";
        setFeedbackMessage({ type: 'error', text: errorMessage});
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">Gestionar Contenido RCP</h1></div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/admin">Dashboard</Link></li>
                <li className="breadcrumb-item active">Contenido RCP</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className={`modal fade ${isModalOpen ? 'show d-block' : ''}`} id="rcpFormModal" tabIndex="-1" role="dialog" aria-labelledby="rcpFormModalLabel" aria-hidden={!isModalOpen} style={{ backgroundColor: isModalOpen ? 'rgba(0,0,0,0.4)' : 'transparent', display: isModalOpen ? 'block' : 'none' }}>
            <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered modal-xl">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="rcpFormModalLabel">{editingItem ? 'Editar Paso RCP' : 'Crear Nuevo Paso RCP'}</h5>
                  <button type="button" className="close" onClick={handleCloseModal} disabled={isSubmitting} aria-label="Close"><span aria-hidden="true">×</span></button>
                </div>
                <div className="modal-body">
                  <RCPForm
                    onSubmit={handleSubmitForm}
                    onClose={handleCloseModal}
                    initialData={editingItem || {}}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>
          {isModalOpen && <div className="modal-backdrop fade show"></div>}

          {feedbackMessage.text && (
            <div className={`alert ${feedbackMessage.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show my-3`} role="alert">
              {feedbackMessage.text}
              <button type="button" className="close" data-dismiss="alert" onClick={() => setFeedbackMessage({ type: '', text: '' })} aria-label="Close"><span aria-hidden="true">×</span></button>
            </div>
          )}

          <div className="card shadow-sm">
            <div className="card-header">
              <h3 className="card-title">Lista de Pasos/Secciones RCP</h3>
              <div className="card-tools">
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()} disabled={isSubmitting || !token}>
                  <i className="fas fa-plus mr-1"></i> Crear Paso
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                 <div className="text-center p-5"><i className="fas fa-spinner fa-spin fa-2x text-primary"></i><p className="mt-2">Cargando...</p></div>
              ) : error ? (
                <div className="alert alert-danger m-3">{error}</div>
              ) : items.length === 0 ? (
                <p className="p-3 text-center text-muted">No hay contenido RCP creado.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead className="thead-light">
                      <tr>
                        <th style={{width: '10%'}}>Imagen</th>
                        <th>Título Sección</th>
                        <th>Descripción del Paso</th>
                        <th style={{textAlign: 'center'}} className="d-none d-md-table-cell">Orden</th>
                        <th style={{textAlign: 'center'}}>Activo</th>
                        <th style={{minWidth: '110px', textAlign: 'center'}}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            {item.ruta_imagen ? (
                              <img 
                                src={`${API_URL}${item.ruta_imagen}`} 
                                alt={item.titulo_seccion || 'Imagen RCP'} 
                                style={{ width: '80px', height: 'auto', borderRadius: '4px' }} 
                              />
                            ) : (
                              <span className="text-muted_italic">Sin imagen</span>
                            )}
                          </td>
                          <td>{item.titulo_seccion || '-'}</td>
                          <td>{item.paso_descripcion.substring(0,100)}{item.paso_descripcion.length > 100 ? '...' : ''}</td>
                          <td style={{textAlign: 'center'}} className="d-none d-md-table-cell">{item.orden}</td>
                          <td style={{textAlign: 'center'}}>
                            {item.activo ? <span className="badge badge-success">Sí</span> : <span className="badge badge-secondary">No</span>}
                          </td>
                          <td style={{textAlign: 'center'}}>
                            <button 
                              className="btn btn-xs btn-info mr-1" 
                              title="Editar" 
                              onClick={() => handleOpenModal(item)} 
                              disabled={isSubmitting}
                            >
                              <i className="fas fa-edit"></i>
                              <span className="d-none d-md-inline ml-1">Editar</span>
                            </button>
                            <button 
                              className="btn btn-xs btn-danger mt-1 mt-md-0"
                              title="Eliminar" 
                              onClick={() => handleDeleteItem(item.id, item.titulo_seccion || item.paso_descripcion.substring(0,20))} 
                              disabled={isSubmitting}
                            >
                              <i className="fas fa-trash"></i>
                              <span className="d-none d-md-inline ml-1">Eliminar</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default GestionRCP;