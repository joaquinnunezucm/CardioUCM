import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'; // Para obtener el token si es necesario

// --- Formulario para Contenido Educativo ---
const EducacionForm = ({ onSubmit, onClose, initialData = {}, isSubmitting }) => {
  const [formData, setFormData] = useState({
    categoria_id: '',
    categoria_nombre: '',
    titulo_tema: '',
    contenido_tema: '',
    orden_categoria: 0,
    orden_item: 0,
    activo: true,
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    // Poblar el formulario con initialData o valores por defecto
    setFormData({
      categoria_id: initialData.categoria_id || '',
      categoria_nombre: initialData.categoria_nombre || '',
      titulo_tema: initialData.titulo_tema || '',
      contenido_tema: initialData.contenido_tema || '', // Aquí puede ir HTML
      orden_categoria: initialData.orden_categoria !== undefined ? initialData.orden_categoria : 0,
      orden_item: initialData.orden_item !== undefined ? initialData.orden_item : 0,
      activo: initialData.activo !== undefined ? initialData.activo : true,
    });
    setFormError(''); // Limpiar errores al cambiar initialData
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value, 10) || 0 : value) // Asegurar que los números sean números
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.categoria_id || !formData.categoria_nombre || !formData.titulo_tema || !formData.contenido_tema) {
      setFormError('ID Categoría, Nombre Categoría, Título y Contenido son requeridos.');
      return;
    }
    // Asegurarse de que los campos numéricos envíen un número válido
    const dataToSubmit = {
        ...formData,
        orden_categoria: Number(formData.orden_categoria) || 0,
        orden_item: Number(formData.orden_item) || 0,
    };

    const result = await onSubmit(dataToSubmit, initialData.id); // Pasar el ID si existe
    if (result && result.error) {
      setFormError(result.message || 'Ocurrió un error al guardar el contenido.');
    } else if (result && result.success) {
      onClose(); // Cerrar modal en éxito
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {formError && <div className="alert alert-danger p-2 mb-3">{formError}</div>}
      <div className="row">
        <div className="col-md-6 form-group mb-3">
          <label htmlFor="categoria_id_form">ID Categoría (Ej. conceptos-clave)</label>
          <input type="text" className="form-control" id="categoria_id_form" name="categoria_id" value={formData.categoria_id} onChange={handleChange} required disabled={isSubmitting} />
        </div>
        <div className="col-md-6 form-group mb-3">
          <label htmlFor="categoria_nombre_form">Nombre Categoría (Ej. Conceptos Clave)</label>
          <input type="text" className="form-control" id="categoria_nombre_form" name="categoria_nombre" value={formData.categoria_nombre} onChange={handleChange} required disabled={isSubmitting} />
        </div>
      </div>
      <div className="form-group mb-3">
        <label htmlFor="titulo_tema_form">Título del Tema</label>
        <input type="text" className="form-control" id="titulo_tema_form" name="titulo_tema" value={formData.titulo_tema} onChange={handleChange} required disabled={isSubmitting} />
      </div>
      <div className="form-group mb-3">
        <label htmlFor="contenido_tema_form">Contenido del Tema</label>
        <textarea className="form-control" id="contenido_tema_form" name="contenido_tema" value={formData.contenido_tema} onChange={handleChange} rows="5" required disabled={isSubmitting}></textarea>
        
      </div>
      <div className="row">
        <div className="col-md-4 form-group mb-3">
          <label htmlFor="orden_categoria_form">Orden Categoría</label>
          <input type="number" className="form-control" id="orden_categoria_form" name="orden_categoria" value={formData.orden_categoria} onChange={handleChange} disabled={isSubmitting} />
        </div>
        <div className="col-md-4 form-group mb-3">
          <label htmlFor="orden_item_form">Orden Ítem (en categoría)</label>
          <input type="number" className="form-control" id="orden_item_form" name="orden_item" value={formData.orden_item} onChange={handleChange} disabled={isSubmitting} />
        </div>
        <div className="col-md-4 form-group mb-3 d-flex align-items-center pt-3">
          <div className="custom-control custom-switch">
            <input type="checkbox" className="custom-control-input" id="activo_form" name="activo" checked={formData.activo} onChange={handleChange} disabled={isSubmitting} />
            <label className="custom-control-label" htmlFor="activo_form">Activo</label>
          </div>
        </div>
      </div>
      <div className="modal-footer justify-content-end p-0 border-top-0 pt-3">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" className="btn btn-primary ml-2" disabled={isSubmitting}>
          {isSubmitting ? (initialData.id ? 'Actualizando...' : 'Creando...') : (initialData.id ? 'Actualizar Contenido' : 'Crear Contenido')}
        </button>
      </div>
    </form>
  );
};


// --- Componente Principal GestionEducacion ---
function GestionEducacion() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Para el item que se está editando
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Para forzar recarga de datos
  const [isSubmitting, setIsSubmitting] = useState(false); // Para deshabilitar botones durante el envío
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });

  const { token } = useAuth(); // Asumiendo que useAuth() expone el token JWT

  // Función para obtener los encabezados de autorización
  const getAuthHeaders = useCallback(() => {
    if (!token) {
      console.error("GestionEducacion: Token no disponible para la solicitud.");
      // Aquí podrías manejar el caso de token no disponible,
      // por ejemplo, redirigiendo al login o mostrando un error.
      // Por ahora, devolvemos un objeto vacío, lo que probablemente causará un error 401/403 en el backend.
      return {};
    }
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }, [token]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setFeedbackMessage({ type: '', text: '' });
    if (!token) {
      setError("No autenticado. No se puede cargar el contenido.");
      setLoading(false);
      setItems([]);
      return;
    }
    try {
      const response = await axios.get('http://localhost:3001/api/admin/educacion', getAuthHeaders());
      setItems(response.data);
      setError('');
    } catch (err) {
      console.error("Error fetching educacion items:", err);
      const errorMessage = err.response?.data?.message || err.message || 'Error al cargar el contenido educativo.';
      setError(errorMessage);
      setItems([]);
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Opcional: aquí podrías llamar a logout() del AuthContext si el token es inválido/expirado
        // logout(); // Asegúrate que logout esté disponible desde useAuth()
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, token]); // Agregamos token como dependencia

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshTrigger]);

  const handleOpenModal = (itemToEdit = null) => {
    setEditingItem(itemToEdit); // Si es null, es creación nueva
    setFeedbackMessage({ type: '', text: '' }); // Limpiar feedback al abrir modal
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return; // No cerrar si está enviando
    setIsModalOpen(false);
    setEditingItem(null); // Limpiar item en edición
  };

  const handleSubmitForm = async (formData, itemId) => {
    setIsSubmitting(true);
    setFeedbackMessage({ type: '', text: '' }); // Limpiar feedback antes de enviar
    if (!token) {
        setIsSubmitting(false);
        return { error: true, message: "No autenticado. No se puede guardar." };
    }

    try {
      let response;
      if (itemId) { // Si hay itemId, es una actualización (PUT)
        response = await axios.put(`http://localhost:3001/api/admin/educacion/${itemId}`, formData, getAuthHeaders());
      } else { // Si no, es una creación (POST)
        response = await axios.post('http://localhost:3001/api/admin/educacion', formData, getAuthHeaders());
      }
      setFeedbackMessage({ type: 'success', text: response.data.message || (itemId ? 'Contenido actualizado con éxito.' : 'Contenido creado con éxito.') });
      setRefreshTrigger(prev => prev + 1); // Disparar recarga de la lista
      setIsSubmitting(false);
      return { success: true }; // Indicar éxito al formulario para que cierre el modal
    } catch (err) {
      console.error("Error guardando contenido educativo:", err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || "Error al guardar el contenido.";
      setIsSubmitting(false);
      return { error: true, message: errorMessage }; // Devolver error al formulario
    }
  };

  const handleDeleteItem = async (itemId, tituloTema) => {
    setFeedbackMessage({ type: '', text: '' });
    if (!token) {
        setFeedbackMessage({ type: 'error', text: "No autenticado. No se puede eliminar." });
        return;
    }
    if (window.confirm(`¿Estás seguro de que quieres eliminar el tema: "${tituloTema}"? Esta acción no se puede deshacer.`)) {
      setIsSubmitting(true);
      try {
        await axios.delete(`http://localhost:3001/api/admin/educacion/${itemId}`, getAuthHeaders());
        setFeedbackMessage({ type: 'success', text: `Contenido "${tituloTema}" eliminado exitosamente.`});
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error("Error eliminando contenido:", err.response?.data || err.message);
        const errorMessage = err.response?.data?.message || "Error al eliminar el contenido.";
        setFeedbackMessage({ type: 'error', text: errorMessage});
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Renderizado JSX del componente principal
  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">Gestionar Educación</h1></div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/admin">Dashboard</Link></li>
                <li className="breadcrumb-item active">Contenido Educativo</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {/* Modal para el formulario */}
        <div 
          className={`modal fade ${isModalOpen ? 'show d-block' : ''}`} 
          id="educacionFormModal" 
          tabIndex="-1" 
          role="dialog" // Añadir role="dialog" para accesibilidad
          aria-labelledby="educacionFormModalLabel" // Añadir para accesibilidad
          aria-hidden={!isModalOpen} // Añadir para accesibilidad
          style={{ 
            backgroundColor: isModalOpen ? 'rgba(0,0,0,0.4)' : 'transparent',
            display: isModalOpen ? 'block' : 'none' // Asegurar display block cuando es 'show'
          }}
        >
          <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered modal-xl"> {/* <--- AÑADIDO modal-dialog-scrollable */}
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="educacionFormModalLabel"> {/* Conectar con aria-labelledby */}
                  {editingItem ? 'Editar Contenido Educativo' : 'Crear Nuevo Contenido'}
                </h5>
                <button 
                  type="button" 
                  className="close" 
                  onClick={handleCloseModal} 
                  disabled={isSubmitting} 
                  aria-label="Close"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <div className="modal-body"> {/* Bootstrap con modal-dialog-scrollable ya debería manejar esto */}
                <EducacionForm
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

          {/* Mensajes de feedback globales */}
          {feedbackMessage.text && (
            <div className={`alert ${feedbackMessage.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show my-3`} role="alert">
              {feedbackMessage.text}
              <button type="button" className="close" data-dismiss="alert" onClick={() => setFeedbackMessage({ type: '', text: '' })} aria-label="Close"><span aria-hidden="true">×</span></button>
            </div>
          )}

          <div className="card shadow-sm">
            <div className="card-header">
              <h3 className="card-title">Lista de Contenido Educativo</h3>
              <div className="card-tools">
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()} disabled={isSubmitting || !token}> {/* Deshabilitar si no hay token */}
                  <i className="fas fa-plus mr-1"></i> Crear Contenido
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                 <div className="text-center p-5"><i className="fas fa-spinner fa-spin fa-2x text-primary"></i><p className="mt-2">Cargando contenido...</p></div>
              ) : error ? (
                <div className="alert alert-danger m-3">{error}</div>
              ) : items.length === 0 ? (
                <p className="p-3 text-center text-muted">No hay contenido educativo creado. ¡Crea el primero!</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead className="thead-light">
                      <tr>
                        <th>Título del Tema</th>
                        <th>Categoría</th>
                        <th style={{textAlign: 'center'}}>Orden Categoría</th>
                        <th style={{textAlign: 'center'}}>Orden Ítem</th>
                        <th style={{textAlign: 'center'}}>Activo</th>
                        <th style={{width: '120px', textAlign: 'center'}}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.titulo_tema}</td>
                          <td>{item.categoria_nombre} <small className="text-muted"></small></td>
                          <td style={{textAlign: 'center'}}>{item.orden_categoria}</td>
                          <td style={{textAlign: 'center'}}>{item.orden_item}</td>
                          <td style={{textAlign: 'center'}}>
                            {item.activo ? <span className="badge badge-success">Sí</span> : <span className="badge badge-secondary">No</span>}
                          </td>
                          <td style={{textAlign: 'center'}}>
                            <button className="btn btn-xs btn-info mr-1" title="Editar" onClick={() => handleOpenModal(item)} disabled={isSubmitting}>
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-xs btn-danger" title="Eliminar" onClick={() => handleDeleteItem(item.id, item.titulo_tema)} disabled={isSubmitting}>
                              <i className="fas fa-trash"></i>
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

export default GestionEducacion;