import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap'; 
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../utils/api';
import {
  isRequired,
  isEmail,
  isSimpleAlphaWithSpaces,
  isStrongPassword,
  maxLength,
} from '../utils/validators.js';


// Pequeño componente para mostrar los requisitos de la contraseña
const PasswordRequirement = ({ isValid, text }) => (
  <div style={{ color: isValid ? 'green' : 'red', fontSize: '0.9em' }}>
    <i className={`fas ${isValid ? 'fa-check-circle' : 'fa-times-circle'} mr-2`}></i>
    {text}
  </div>
);


// Componente para el formulario de usuario 
const UserForm = ({ onSubmit, onClose, initialData = {}, posiblesRoles, isSubmitting }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false); // Estado para visibilidad de la contraseña
  const [passwordValidation, setPasswordValidation] = useState({ // Estado para la validación en tiempo real
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  useEffect(() => {
    setFormData({
      nombre: initialData.nombre || '',
      email: initialData.email || '',
      password: '',
      rol: initialData.rol || (posiblesRoles.length > 0 ? posiblesRoles[0] : '')
    });
    setErrors({});
    setPasswordValidation({ length: false, uppercase: false, lowercase: false, number: false }); // Resetear al abrir
  }, [initialData, posiblesRoles]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'nombre') {
        finalValue = value.replace(/[^a-zA-Z\s]/g, '');
    }

    if (name === 'password') {
        // Validar requisitos en tiempo real
        setPasswordValidation({
            length: value.length >= 8,
            uppercase: /[A-Z]/.test(value),
            lowercase: /[a-z]/.test(value),
            number: /[0-9]/.test(value),
        });
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if(errors[name]) {
        setErrors(prev => ({...prev, [name]: null}));
    }
  };

  const validate = () => {
    const newErrors = {};
    const { nombre, email, password, rol } = formData;

    const nombreError = isRequired(nombre) || maxLength(50)(nombre) || isSimpleAlphaWithSpaces(nombre);
    if(nombreError) newErrors.nombre = nombreError;

    const emailError = isRequired(email) || isEmail(email);
    if(emailError) newErrors.email = emailError;

    if (!initialData.id) {
        const passwordError = isRequired(password) || isStrongPassword(password);
        if(passwordError) newErrors.password = passwordError;
    } else if (password) {
        const passwordError = isStrongPassword(password);
        if(passwordError) newErrors.password = passwordError;
    }

    const rolError = isRequired(rol);
    if(rolError) newErrors.rol = rolError;

    return newErrors;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    
    const formErrors = validate();
    if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        return;
    }

    onSubmit(formData, initialData.id);
  };

  const showPasswordRequirements = (formData.password.length > 0) || (!initialData.id && Object.keys(errors).length > 0);

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <Form.Group controlId="formNombre" className="mb-3">
        <Form.Label>Nombre*</Form.Label>
        <Form.Control type="text" name="nombre" value={formData.nombre} onChange={handleChange} disabled={isSubmitting} isInvalid={!!errors.nombre} />
        <Form.Text muted>Solo letras y espacios.</Form.Text>
        <Form.Control.Feedback type="invalid">{errors.nombre}</Form.Control.Feedback>
      </Form.Group>

      <Form.Group controlId="formEmail" className="mb-3">
        <Form.Label>Email*</Form.Label>
        <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} disabled={isSubmitting} isInvalid={!!errors.email} />
        <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
      </Form.Group>

      <Form.Group controlId="formPassword" className="mb-3">
  <Form.Label>Contraseña {initialData.id ? '(Opcional)' : '*'}</Form.Label>
  <InputGroup>
      <Form.Control 
        type={showPassword ? "text" : "password"}
        name="password" 
        value={formData.password} 
        onChange={handleChange} 
        placeholder={initialData.id ? "Dejar vacío para no cambiar" : "Requerida"} 
        disabled={isSubmitting} 
        isInvalid={!!errors.password} 
      />
      <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
          <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
      </Button>
  </InputGroup>
  
  {/* CAMBIO: Se eliminó la condición para que la lista sea siempre visible */}
  <div className="mt-2 pl-1">
      <PasswordRequirement isValid={passwordValidation.length} text="Mínimo 8 caracteres." />
      <PasswordRequirement isValid={passwordValidation.uppercase} text="Al menos una letra mayúscula (A-Z)." />
      <PasswordRequirement isValid={passwordValidation.lowercase} text="Al menos una letra minúscula (a-z)." />
      <PasswordRequirement isValid={passwordValidation.number} text="Al menos un número (0-9)." />
  </div>
  
  <Form.Control.Feedback type="invalid" className="d-block">{errors.password}</Form.Control.Feedback>
</Form.Group>

      <Form.Group controlId="formRol" className="mb-3">
        <Form.Label>Rol*</Form.Label>
        <Form.Select name="rol" value={formData.rol} onChange={handleChange} disabled={isSubmitting} isInvalid={!!errors.rol}>
          {posiblesRoles.map(r => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </Form.Select>
        <Form.Control.Feedback type="invalid">{errors.rol}</Form.Control.Feedback>
      </Form.Group>

      <Modal.Footer className="px-0 pt-4 pb-0">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (initialData.id ? 'Actualizando...' : 'Creando...') : (initialData.id ? 'Actualizar Usuario' : 'Crear Usuario')}
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
  const posiblesRoles = ['administrador', 'superadministrador'];

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      if ($.fn.dataTable.isDataTable(tableRef.current)) {
        $(tableRef.current).DataTable().destroy();
        setTableInitialized(false);
      }
      const response = await axios.get(`${API_BASE_URL}/api/usuarios`);
      setUsuarios(response.data);
    } catch (err) {
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
        order: [[0, 'asc']],
        columnDefs: [
          { orderable: false, targets: [5] }
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
        await axios.put(`${API_BASE_URL}/api/usuarios/${formUserId}`, userData);
        Swal.fire('Actualizado', 'El usuario fue actualizado correctamente.', 'success');
      } else {
        await axios.post(`${API_BASE_URL}/api/usuarios`, userData);
        Swal.fire('Creado', 'El usuario fue creado exitosamente.', 'success');
      }
      
      fetchUsuarios();
      handleCloseModal();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'No se pudo guardar el usuario.';
      Swal.fire('Error', errorMessage, 'error');
    } finally {
        setIsSubmitting(false);
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
          await axios.delete(`${API_BASE_URL}/api/usuarios/${deleteUserId}`);
          Swal.fire('Eliminado', 'El usuario fue eliminado correctamente.', 'success');
          fetchUsuarios();
        } catch (error) {
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