// src/pages/ControlUsuarios.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

// --- UserForm Component (sin cambios significativos recientes, debe estar como lo tenías) ---
const UserForm = ({ onSubmit, onClose, initialData = {}, posiblesRoles, isSubmitting }) => {
  const [formData, setFormData] = useState({
    nombre: initialData.nombre || '',
    email: initialData.email || '',
    password: '',
    rol: initialData.rol || (posiblesRoles.length > 0 ? posiblesRoles[0] : '')
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setFormData({
        nombre: initialData.nombre || '',
        email: initialData.email || '',
        password: '', // Siempre limpiar al abrir/cambiar
        rol: initialData.rol || (posiblesRoles.length > 0 ? posiblesRoles[0] : '')
    });
    setFormError('');
  }, [initialData, posiblesRoles]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.nombre || !formData.email || !formData.rol) {
      setFormError('Nombre, email y rol son requeridos.');
      return;
    }
    if (!initialData.id && !formData.password) { // Password requerida solo al crear
      setFormError('La contraseña es requerida para nuevos usuarios.');
      return;
    }
    if (formData.password && formData.password.length < 6 && !initialData.id) {
        setFormError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
    }

    const result = await onSubmit(formData, initialData.id); // onSubmit es asíncrono
    if (result && result.error) {
      setFormError(result.message || 'Ocurrió un error.');
    } else if (result && result.success) {
      onClose(); // Cerrar modal solo si la operación fue exitosa
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {formError && <div className="alert alert-danger p-2 mb-3" role="alert">{formError}</div>}
      <div className="form-group mb-3">
        <label htmlFor="nombreUserFormCU">Nombre</label>
        <input type="text" className="form-control" id="nombreUserFormCU" name="nombre" value={formData.nombre} onChange={handleChange} required disabled={isSubmitting} />
      </div>
      <div className="form-group mb-3">
        <label htmlFor="emailUserFormCU">Email</label>
        <input type="email" className="form-control" id="emailUserFormCU" name="email" value={formData.email} onChange={handleChange} required disabled={isSubmitting} />
      </div>
      <div className="form-group mb-3">
        <label htmlFor="passwordUserFormCU">Contraseña</label>
        <input type="password" className="form-control" id="passwordUserFormCU" name="password" value={formData.password} onChange={handleChange} placeholder={initialData.id ? "Dejar vacío para no cambiar" : "Requerida"} disabled={isSubmitting} />
        {initialData.id && <small className="form-text text-muted">Si dejas este campo vacío, la contraseña actual no se modificará.</small>}
      </div>
      <div className="form-group mb-4">
        <label htmlFor="rolUserFormCU">Rol</label>
        <select className="form-control" id="rolUserFormCU" name="rol" value={formData.rol} onChange={handleChange} required disabled={isSubmitting}>
          {posiblesRoles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>
      <div className="modal-footer justify-content-end p-0 border-top-0 pt-3"> {/* Ajuste de clases para el footer del modal */}
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" className="btn btn-primary ml-2" disabled={isSubmitting}>
          {isSubmitting ? (initialData.id ? 'Actualizando...' : 'Creando...') : (initialData.id ? 'Actualizar Usuario' : 'Crear Usuario')}
        </button>
      </div>
    </form>
  );
};


// --- Componente Principal ControlUsuarios ---
function ControlUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const userRol = user ? user.rol : null;
  const currentUserId = user ? user.id : null; // ID del usuario logueado

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });

  const posiblesRoles = ['usuario', 'administrador', 'superadministrador'];

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setFeedbackMessage({ type: '', text: '' });
    try {
      const response = await axios.get('http://localhost:3001/api/usuarios');
      setUsuarios(response.data);
      setError('');
    } catch (err) {
      console.error("Error fetching usuarios:", err);
      const errorMessage = err.response?.data?.message || 'Error al cargar la lista de usuarios.';
      setError(errorMessage); // Establecer error general si la carga inicial falla
      // setFeedbackMessage({ type: 'error', text: errorMessage }); // Opcional: mostrar en feedback también
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRol === 'superadministrador') {
      fetchUsuarios();
    } else if (userRol) {
      setError('Acceso denegado. Esta sección es solo para superadministradores.');
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [userRol, fetchUsuarios, refreshTrigger]);

  const handleOpenModal = (usuarioParaEditar = null) => {
    setEditingUser(usuarioParaEditar);
    setFeedbackMessage({ type: '', text: '' }); // Limpiar feedback anterior al abrir modal
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmitUserForm = async (formData, formUserId) => {
    setIsSubmitting(true);
    setFeedbackMessage({ type: '', text: '' });
    try {
      const userData = { ...formData };
      if (formUserId && !userData.password) { // No enviar password si está vacía para editar
        delete userData.password;
      }
      let response;
      if (formUserId) {
        response = await axios.put(`http://localhost:3001/api/usuarios/${formUserId}`, userData);
      } else {
        response = await axios.post('http://localhost:3001/api/usuarios', userData);
      }
      setFeedbackMessage({ type: 'success', text: response.data.message || (formUserId ? 'Usuario actualizado con éxito.' : 'Usuario creado con éxito.') });
      setRefreshTrigger(prev => prev + 1); // Forzar recarga de la lista
      setIsSubmitting(false);
      return { success: true }; // Indicar éxito para que UserForm cierre el modal
    } catch (err) {
      console.error("Error guardando usuario:", err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || "Error al guardar el usuario.";
      // El error se mostrará dentro del UserForm
      setIsSubmitting(false);
      return { error: true, message: errorMessage }; // Devolver error para UserForm
    }
  };

  const handleDeleteUser = async (deleteUserId, userName) => {
    setFeedbackMessage({ type: '', text: '' });
    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName}" (ID: ${deleteUserId})? Esta acción no se puede deshacer.`)) {
      if (currentUserId === deleteUserId && userRol === 'superadministrador') {
        setFeedbackMessage({ type: 'error', text: "Un superadministrador no puede eliminarse a sí mismo."});
        return;
      }
      setIsSubmitting(true); // Deshabilitar botones mientras se procesa
      try {
        await axios.delete(`http://localhost:3001/api/usuarios/${deleteUserId}`);
        setFeedbackMessage({ type: 'success', text: `Usuario "${userName}" eliminado exitosamente.`});
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error("Error eliminando usuario:", err.response?.data || err.message);
        const errorMessage = err.response?.data?.message || "Error al eliminar el usuario.";
        setFeedbackMessage({ type: 'error', text: errorMessage});
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Renderizado principal del componente
  if (userRol !== 'superadministrador') {
    // Esto se renderizará dentro del <Outlet /> del layout principal (Dashboard.jsx)
    return (
      <>
        <div className="content-header">
          <div className="container-fluid"><div className="row mb-2"><div className="col-sm-6"><h1 className="m-0">Acceso Denegado</h1></div><div className="col-sm-6"><ol className="breadcrumb float-sm-right"><li className="breadcrumb-item"><Link to="/admin">Dashboard</Link></li><li className="breadcrumb-item active">Error</li></ol></div></div></div>
        </div>
        <section className="content"><div className="container-fluid"><div className="alert alert-warning">No tiene permisos para acceder a esta sección.</div></div></section>
      </>
    );
  }
  
  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">Control de Usuarios</h1></div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/admin">Dashboard</Link></li>
                <li className="breadcrumb-item active">Usuarios</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {/* Modal de Bootstrap */}
          <div className={`modal fade ${isModalOpen ? 'show d-block' : ''}`} id="userFormModalCUPage" tabIndex="-1" role="dialog" aria-labelledby="userFormModalCULabel" aria-hidden={!isModalOpen} style={{ backgroundColor: isModalOpen ? 'rgba(0,0,0,0.4)' : 'transparent' }}>
            <div className="modal-dialog modal-dialog-centered" role="document"> {/* modal-lg para un modal más ancho si se necesita */}
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="userFormModalCULabel">{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h5>
                  <button type="button" className="close" onClick={handleCloseModal} aria-label="Close" disabled={isSubmitting}>
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <div className="modal-body">
                  <UserForm
                    onSubmit={handleSubmitUserForm}
                    onClose={handleCloseModal}
                    initialData={editingUser || {}}
                    posiblesRoles={posiblesRoles}
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
              <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={() => setFeedbackMessage({ type: '', text: '' })}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
          )}

          <div className="card shadow-sm">
            <div className="card-header">
              <h3 className="card-title">Lista de Usuarios del Sistema</h3>
              <div className="card-tools">
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()} disabled={isSubmitting}>
                  <i className="fas fa-plus mr-1"></i> Crear Usuario
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              {loading && usuarios.length === 0 ? (
                 <div className="text-center p-5"><i className="fas fa-spinner fa-spin fa-2x"></i><p className="mt-2">Cargando...</p></div>
              ) : error && usuarios.length === 0 ? ( // Mostrar error solo si no hay datos y hubo un error de carga
                <div className="alert alert-danger m-3">{error}</div>
              ) : usuarios.length === 0 ? (
                <p className="p-3 text-center text-muted">No se encontraron usuarios.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover table-bordered">
                    <thead className="thead-light">
                      <tr>
                        <th style={{ width: '5%' }}>ID</th>
                        <th style={{ width: '25%' }}>Nombre</th>
                        <th style={{ width: '30%' }}>Email</th>
                        <th style={{ width: '15%' }}>Rol</th>
                        <th style={{ width: '15%' }}>Creación</th>
                        <th style={{ width: '10%', textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td>{u.nombre}</td>
                          <td>{u.email}</td>
                          <td>{u.rol ? u.rol.charAt(0).toUpperCase() + u.rol.slice(1) : 'N/D'}</td>
                          <td>{u.fecha_creacion ? new Date(u.fecha_creacion).toLocaleDateString('es-ES') : 'N/D'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn btn-xs btn-info mr-1" title="Editar" onClick={() => handleOpenModal(u)} disabled={isSubmitting}>
                              <i className="fas fa-edit"></i>
                            </button>
                            {!(currentUserId === u.id && userRol === 'superadministrador') && (
                               <button className="btn btn-xs btn-danger" title="Eliminar" onClick={() => handleDeleteUser(u.id, u.nombre)} disabled={isSubmitting}>
                                 <i className="fas fa-trash"></i>
                               </button>
                            )}
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

export default ControlUsuarios;