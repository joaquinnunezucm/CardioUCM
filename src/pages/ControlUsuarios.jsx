import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';

// Componente para el formulario de usuario
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
    <Form onSubmit={handleSubmit}>
      {formError && <div className="alert alert-danger p-2 mb-3" role="alert">{formError}</div>}
      <Form.Group controlId="formNombre" className="mb-3">
        <Form.Label>Nombre</Form.Label>
        <Form.Control
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
          disabled={isSubmitting}
        />
      </Form.Group>
      <Form.Group controlId="formEmail" className="mb-3">
        <Form.Label>Email</Form.Label>
        <Form.Control
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={isSubmitting}
        />
      </Form.Group>
      <Form.Group controlId="formPassword" className="mb-3">
        <Form.Label>Contraseña</Form.Label>
        <Form.Control
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder={initialData.id ? "Dejar vacío para no cambiar" : "Requerida"}
          disabled={isSubmitting}
        />
        {initialData.id && <Form.Text className="text-muted">Si dejas este campo vacío, la contraseña actual no se modificará.</Form.Text>}
      </Form.Group>
      <Form.Group controlId="formRol" className="mb-3">
        <Form.Label>Rol</Form.Label>
        <Form.Control
          as="select"
          name="rol"
          value={formData.rol}
          onChange={handleChange}
          required
          disabled={isSubmitting}
        >
          {posiblesRoles.map(r => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </Form.Control>
      </Form.Group>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (initialData.id ? 'Actualizando...' : 'Creando...') : (initialData.id ? 'Actualizar' : 'Crear')}
        </Button>
      </Modal.Footer>
    </Form>
  );
};

// Componente principal ControlUsuarios
function ControlUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableInitialized, setTableInitialized] = useState(false);
  const tableRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const userRol = user ? user.rol : null;
  const currentUserId = user ? user.id : null;
  const posiblesRoles = ['usuario', 'administrador', 'superadministrador'];

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      if ($.fn.dataTable.isDataTable(tableRef.current)) {
        $(tableRef.current).DataTable().destroy();
        setTableInitialized(false);
      }
      const response = await axios.get('http://localhost:3001/api/usuarios');
      setUsuarios(response.data);
    } catch (err) {
      console.error('Error al obtener usuarios:', err);
      Swal.fire('Error', 'No se pudieron cargar los usuarios.', 'error');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRol === 'superadministrador') {
      fetchUsuarios();
    } else {
      setLoading(false);
    }
  }, [userRol, fetchUsuarios]);

  useEffect(() => {
    if (!loading && usuarios.length > 0 && !tableInitialized) {
      $(tableRef.current).DataTable({
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ usuarios',
          paginate: { previous: 'Anterior', next: 'Siguiente' },
          zeroRecords: 'No se encontraron usuarios'
        },
        order: [[0, 'asc']], // Ordenar por ID por defecto
        columnDefs: [
          { orderable: false, targets: [5] } // Deshabilitar orden en columna de acciones
        ]
      });
      setTableInitialized(true);
    }
  }, [loading, usuarios, tableInitialized]);

  const handleShowModal = (usuario = null) => {
    setEditingUser(usuario);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setShowModal(false);
      setEditingUser(null);
    }
  };

  const handleSubmitUserForm = async (formData, formUserId) => {
    setIsSubmitting(true);
    try {
      const userData = { ...formData };
      if (formUserId && !userData.password) {
        delete userData.password;
      }
      if (formUserId) {
        await axios.put(`http://localhost:3001/api/usuarios/${formUserId}`, userData);
        Swal.fire('Actualizado', 'El usuario fue actualizado correctamente.', 'success');
      } else {
        await axios.post('http://localhost:3001/api/usuarios', userData);
        Swal.fire('Creado', 'El usuario fue creado exitosamente.', 'success');
      }
      fetchUsuarios();
      setIsSubmitting(false);
      return { success: true };
    } catch (err) {
      console.error('Error al guardar usuario:', err);
      const errorMessage = err.response?.data?.message || 'No se pudo guardar el usuario.';
      Swal.fire('Error', errorMessage, 'error');
      setIsSubmitting(false);
      return { error: true, message: errorMessage };
    }
  };

  const handleDeleteUser = async (deleteUserId, userName) => {
    if (currentUserId === deleteUserId && userRol === 'superadministrador') {
      Swal.fire('Error', 'Un superadministrador no puede eliminarse a sí mismo.', 'error');
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: `"${userName}" se eliminará permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:3001/api/usuarios/${deleteUserId}`);
          Swal.fire('Eliminado', 'El usuario fue eliminado correctamente.', 'success');
          fetchUsuarios();
        } catch (error) {
          console.error('Error al eliminar usuario:', error);
          const errorMessage = error.response?.data?.message || 'No se pudo eliminar el usuario.';
          Swal.fire('Error', errorMessage, 'error');
        }
      }
    });
  };

  if (userRol !== 'superadministrador') {
    return (
      <div className="container mt-4">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Acceso Denegado</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item"><Link to="/admin">Dashboard</Link></li>
                  <li className="breadcrumb-item active">Error</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        <section className="content">
          <div className="container-fluid">
            <div className="alert alert-warning">No tiene permisos para acceder a esta sección.</div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Gestión de Usuarios</h3>

      <div className="mb-3 text-right">
        <button className="btn btn-success" onClick={() => handleShowModal()} disabled={isSubmitting}>
          <i className="fas fa-plus"></i> Nuevo Usuario
        </button>
      </div>

      {loading ? (
        <div className="text-center p-5">
          <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
          <p className="mt-2">Cargando usuarios...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table ref={tableRef} className="table table-bordered table-hover">
            <thead className="thead-light">
              <tr>
                <th style={{ width: '5%' }}>ID</th>
                <th style={{ width: '25%' }}>Nombre</th>
                <th style={{ width: '30%' }}>Email</th>
                <th style={{ width: '15%' }}>Rol</th>
                <th style={{ width: '15%' }}>Creación</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
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
                    <button className="btn btn-sm btn-info mr-1" title="Editar" onClick={() => handleShowModal(u)} disabled={isSubmitting}>
                      <i className="fas fa-edit"></i>
                    </button>
                    {!(currentUserId === u.id && userRol === 'superadministrador') && (
                      <button className="btn btn-sm btn-danger" title="Eliminar" onClick={() => handleDeleteUser(u.id, u.nombre)} disabled={isSubmitting}>
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

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <UserForm
            onSubmit={handleSubmitUserForm}
            onClose={handleCloseModal}
            initialData={editingUser || {}}
            posiblesRoles={posiblesRoles}
            isSubmitting={isSubmitting}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default ControlUsuarios;