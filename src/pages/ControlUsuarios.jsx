// src/pages/ControlUsuarios.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx'; // o .js
import { Link } from 'react-router-dom'; // useNavigate ya está en AdminPageLayout

// --- UserForm Component (con clases de Bootstrap para el layout) ---
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
        password: '',
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
    if (!initialData.id && !formData.password) {
      setFormError('La contraseña es requerida para nuevos usuarios.');
      return;
    }
    if (formData.password && formData.password.length < 6 && !initialData.id) {
        setFormError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
    }

    const result = await onSubmit(formData, initialData.id);
    if (result && result.error) {
      setFormError(result.message || 'Ocurrió un error.');
    } else if (result && result.success) {
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {formError && <div className="alert alert-danger p-2 mb-3" role="alert">{formError}</div>}
      <div className="form-group mb-3">
        <label htmlFor="nombreUserForm">Nombre</label>
        <input type="text" className="form-control" id="nombreUserForm" name="nombre" value={formData.nombre} onChange={handleChange} required disabled={isSubmitting} />
      </div>
      <div className="form-group mb-3">
        <label htmlFor="emailUserForm">Email</label>
        <input type="email" className="form-control" id="emailUserForm" name="email" value={formData.email} onChange={handleChange} required disabled={isSubmitting} />
      </div>
      <div className="form-group mb-3">
        <label htmlFor="passwordUserForm">Contraseña</label>
        <input type="password" className="form-control" id="passwordUserForm" name="password" value={formData.password} onChange={handleChange} placeholder={initialData.id ? "Dejar vacío para no cambiar" : "Requerida"} disabled={isSubmitting} />
        {initialData.id && <small className="form-text text-muted">Si dejas este campo vacío, la contraseña actual no se modificará.</small>}
      </div>
      <div className="form-group mb-4">
        <label htmlFor="rolUserForm">Rol</label>
        <select className="form-control" id="rolUserForm" name="rol" value={formData.rol} onChange={handleChange} required disabled={isSubmitting}>
          {posiblesRoles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>
      <div className="modal-footer justify-content-end p-0">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" className="btn btn-primary ml-2" disabled={isSubmitting}>
          {isSubmitting ? (initialData.id ? 'Actualizando...' : 'Creando...') : (initialData.id ? 'Actualizar Usuario' : 'Crear Usuario')}
        </button>
      </div>
    </form>
  );
};


// --- Componente Layout AdminPage MODIFICADO (sin content-wrapper propio) ---
const AdminPageLayout = ({ title, breadcrumbCurrent, children }) => {
    return (
      // No <div className="content-wrapper"> aquí
      <>
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">{title}</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item"><Link to="/admin">Dashboard</Link></li>
                  <li className="breadcrumb-item active">{breadcrumbCurrent}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        <section className="content">
          <div className="container-fluid"> {/* Este container-fluid es para el contenido de la página específica */}
            {children}
          </div>
        </section>
      </>
    );
};

// --- Componente Principal ControlUsuarios ---
function ControlUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

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
      // axios ya debería tener el token JWT si AuthContext está configurado con interceptor
      const response = await axios.get('http://localhost:3001/api/usuarios');
      setUsuarios(response.data);
      setError('');
    } catch (err) {
      console.error("Error fetching usuarios:", err);
      const errorMessage = err.response?.data?.message || 'Error al cargar la lista de usuarios.';
      setError(errorMessage);
      setFeedbackMessage({ type: 'error', text: errorMessage });
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []); // El token se maneja globalmente por el interceptor de Axios

  useEffect(() => {
    if (user && user.rol === 'superadministrador') {
      fetchUsuarios();
    } else {
      // Esto es una doble verificación, la ruta ya debería proteger
      setError('Acceso denegado. Esta sección es solo para superadministradores.');
      setLoading(false);
    }
  }, [user, fetchUsuarios, refreshTrigger]);

  const handleOpenModal = (usuarioParaEditar = null) => {
    setEditingUser(usuarioParaEditar);
    setFeedbackMessage({ type: '', text: '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return; // No permitir cerrar si se está enviando
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmitUserForm = async (formData, userId) => {
    setIsSubmitting(true);
    setFeedbackMessage({ type: '', text: '' });
    try {
      const userData = { ...formData };
      if (userId && !userData.password) {
        delete userData.password;
      }

      let response;
      if (userId) {
        response = await axios.put(`http://localhost:3001/api/usuarios/${userId}`, userData);
      } else {
        response = await axios.post('http://localhost:3001/api/usuarios', userData);
      }
      setFeedbackMessage({ type: 'success', text: response.data.message || (userId ? 'Usuario actualizado.' : 'Usuario creado.') });
      setRefreshTrigger(prev => prev + 1);
      setIsSubmitting(false);
      return { success: true }; // Para que UserForm sepa que cierre el modal
    } catch (err) {
      console.error("Error guardando usuario:", err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || "Error al guardar el usuario.";
      setFeedbackMessage({ type: 'error', text: errorMessage });
      setIsSubmitting(false);
      return { error: true, message: errorMessage }; // Para que UserForm muestre el error
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    setFeedbackMessage({ type: '', text: '' });
    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName}" (ID: ${userId})? Esta acción no se puede deshacer.`)) {
      if (user && user.id === userId && user.rol === 'superadministrador') {
        setFeedbackMessage({ type: 'error', text: "Un superadministrador no puede eliminarse a sí mismo."});
        return;
      }
      try {
        await axios.delete(`http://localhost:3001/api/usuarios/${userId}`);
        setFeedbackMessage({ type: 'success', text: `Usuario "${userName}" eliminado.`});
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error("Error eliminando usuario:", err.response?.data || err.message);
        const errorMessage = err.response?.data?.message || "Error al eliminar el usuario.";
        setFeedbackMessage({ type: 'error', text: errorMessage});
      }
    }
  };

  // --- Renderizado condicional ---
  if (loading && usuarios.length === 0) {
    return <AdminPageLayout title="Control de Usuarios" breadcrumbCurrent="Usuarios"><div className="text-center p-5"><i className="fas fa-spinner fa-spin fa-3x"></i><p className="mt-2">Cargando usuarios...</p></div></AdminPageLayout>;
  }
  if (error && usuarios.length === 0) {
    return <AdminPageLayout title="Control de Usuarios" breadcrumbCurrent="Usuarios"><div className="alert alert-danger mx-3">{error}</div></AdminPageLayout>;
  }
  if (!user || user.rol !== 'superadministrador') {
    return <AdminPageLayout title="Control de Usuarios" breadcrumbCurrent="Usuarios"><div className="alert alert-warning mx-3">No tiene permisos para ver esta sección.</div></AdminPageLayout>;
  }

  return (
    <AdminPageLayout title="Control de Usuarios" breadcrumbCurrent="Usuarios">
      {/* Modal de Bootstrap */}
      <div className={`modal fade ${isModalOpen ? 'show d-block' : ''}`} id="userFormModal" tabIndex="-1" role="dialog" aria-labelledby="userFormModalLabel" aria-hidden={!isModalOpen} style={{ backgroundColor: isModalOpen ? 'rgba(0,0,0,0.4)' : 'transparent' }}>
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="userFormModalLabel">{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h5>
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
            {/* El footer está dentro de UserForm ahora */}
          </div>
        </div>
      </div>
      {/* Solo mostrar backdrop si el modal está abierto */}
      {isModalOpen && <div className="modal-backdrop fade show"></div>}

      {/* Mensajes de Feedback */}
      {feedbackMessage.text && (
        <div className={`alert ${feedbackMessage.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mx-3 my-3`} role="alert">
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
            <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()}>
              <i className="fas fa-plus mr-1"></i> Crear Usuario
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          {usuarios.length === 0 && !loading ? (
            <p className="p-3 text-center text-muted">No se encontraron usuarios.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover table-bordered">
                <thead className="thead-light">
                  <tr>
                    <th style={{ width: '5%' }}>ID</th>
                    <th style={{ width: '25%' }}>Nombre</th> {/* Ajustado ancho */}
                    <th style={{ width: '30%' }}>Email</th>
                    <th style={{ width: '15%' }}>Rol</th>
                    <th style={{ width: '15%' }}>Creación</th> {/* Ajustado ancho */}
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
                      <td>{u.fecha_creacion ? new Date(u.fecha_creacion).toLocaleDateString('es-ES') : 'N/D'}</td> {/* Formato de fecha localizado */}
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn btn-xs btn-info mr-1" title="Editar" onClick={() => handleOpenModal(u)} disabled={isSubmitting}>
                          <i className="fas fa-edit"></i>
                        </button>
                        {!(user && user.id === u.id && u.rol === 'superadministrador') && (
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
    </AdminPageLayout>
  );
}

export default ControlUsuarios;