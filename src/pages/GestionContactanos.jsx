import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form, Table, Badge } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext'; // Ajusta la ruta si es necesario
// import { Navigate } from 'react-router-dom'; // Descomentar si se usa para protección

const API_BASE_URL_FRONTEND = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Estos valores deben coincidir con los 'nombre' en tu tabla 'contacto_tipos_dato'
const TIPOS_DATO_CONTACTO = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'email', label: 'Correo Electrónico' },
  { value: 'telefono', label: 'Teléfono' },
  { value: 'enlace_web', label: 'Enlace Web (URL)' },
  { value: 'texto_simple', label: 'Texto Simple (informativo)' },
];

const ICONOS_DISPONIBLES = [
  { value: 'FaInstagram', label: 'Instagram Icon' },
  { value: 'FaFacebook', label: 'Facebook Icon' },
  { value: 'FaTwitter', label: 'Twitter/X Icon' },
  { value: 'FaEnvelope', label: 'Email Icon' },
  { value: 'FaPhone', label: 'Phone Icon' },
  { value: 'FaGlobe', label: 'Website/Globe Icon' },
  { value: 'FaInfoCircle', label: 'Info Icon' },
  { value: '', label: 'Ninguno' },
];

const GestionContactanos = () => {
  const { user, token } = useAuth();
  const [contactos, setContactos] = useState([]);
  // Si quisieras cargar categorías de contacto para un dropdown de filtro, lo harías aquí.
  // const [categoriasContacto, setCategoriasContacto] = useState([]);
  const [loading, setLoading] = useState(true);
  const tableRef = useRef(null);
  const dataTableInstance = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({
    categoria: '', // El usuario escribe aquí
    tipo_dato: 'enlace_web', // Valor por defecto para el select
    etiqueta: '',
    valor: '',
    icono: '',
    orden: 0,
    activo: true,
  });

  const API_URL_ADMIN = `${API_BASE_URL_FRONTEND}/api/admin/contactos`;

  const getAuthHeaders = () => ({
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const fetchContactos = async () => {
    if (!token) {
      setLoading(false);
      // Opcional: Mostrar un mensaje más amigable o redirigir
      // Swal.fire('Acceso Denegado', 'Debe iniciar sesión.', 'warning');
      return;
    }
    try {
      setLoading(true);
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy();
        dataTableInstance.current = null;
      }
      // Cargar contactos y, si es necesario, categorías y tipos de dato para filtros/dropdowns
      // const [contactosResponse, categoriasContactoResponse, tiposDatoResponse] = await Promise.all([
      //   axios.get(API_URL_ADMIN, getAuthHeaders()),
      //   axios.get(`${API_BASE_URL_FRONTEND}/api/contacto-categorias`, getAuthHeaders()),
      //   axios.get(`${API_BASE_URL_FRONTEND}/api/contacto-tipos-dato`, getAuthHeaders())
      // ]);
      // setContactos(contactosResponse.data);
      // setCategoriasContacto(categoriasContactoResponse.data);
      // setTiposDatoContacto(tiposDatoResponse.data); // Si los cargas dinámicamente

      const response = await axios.get(API_URL_ADMIN, getAuthHeaders());
      setContactos(response.data);

    } catch (error) {
      console.error('Error al obtener información de contacto:', error.response?.data || error.message);
      Swal.fire('Error', `No se pudo cargar la información de contacto. ${error.response?.data?.message || ''}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchContactos();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (dataTableInstance.current) {
      dataTableInstance.current.destroy();
      dataTableInstance.current = null;
    }
    if (!loading && contactos.length > 0 && tableRef.current) {
      dataTableInstance.current = $(tableRef.current).DataTable({
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ ítems',
          paginate: { previous: 'Anterior', next: 'Siguiente' },
          zeroRecords: 'No se encontraron ítems de contacto',
          infoEmpty: 'Mostrando 0 a 0 de 0 ítems de contacto',
          infoFiltered: '(filtrado de _MAX_ ítems totales)',
        },
        order: [[1, 'asc'], [4, 'asc']], 
        columnDefs: [{ orderable: false, targets: [6] }],
        responsive: true,
        searching: true,
      });
    }
    return () => {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy();
        dataTableInstance.current = null;
      }
    };
  }, [loading, contactos]);

  const handleShowModal = (item = null) => {
    if (item) {
      setCurrentItem(item);
      setFormData({
        categoria: item.categoria || '',
        tipo_dato: item.tipo_dato || 'enlace_web',
        etiqueta: item.etiqueta || '',
        valor: item.valor || '',
        icono: item.icono || '',
        orden: item.orden || 0,
        activo: typeof item.activo === 'boolean' ? item.activo : (item.activo === 1), // Manejar 1/0 de la BD
      });
    } else {
      setCurrentItem(null);
      setFormData({
        categoria: '',
        tipo_dato: 'enlace_web',
        etiqueta: '',
        valor: '',
        icono: '',
        orden: 0,
        activo: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentItem(null);
     setFormData({ categoria: '', tipo_dato: 'enlace_web', etiqueta: '', valor: '', icono: '', orden: 0, activo: true });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'orden' ? (parseInt(value, 10) || 0) : value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { categoria, tipo_dato, etiqueta, valor, orden, activo } = formData;

    if (!String(categoria).trim() || !String(tipo_dato).trim() || !String(etiqueta).trim() || !String(valor).trim()) {
      Swal.fire('Campos incompletos', 'Categoría, Tipo de Dato, Etiqueta y Valor son obligatorios.', 'warning');
      return;
    }
    const numericOrden = parseInt(orden, 10);
    if (isNaN(numericOrden) || numericOrden < 0) {
        Swal.fire('Campo inválido', 'El orden debe ser un número válido y no negativo.', 'warning');
        return;
    }

    const payload = {
        ...formData, // envía todos los campos del estado formData
        categoria: String(categoria).trim(), // Asegura que se envíe el nombre
        tipo_dato: String(tipo_dato).trim(), // Asegura que se envíe el nombre
        etiqueta: String(etiqueta).trim(),
        valor: String(valor).trim(),
        orden: numericOrden,
        activo: !!activo // Asegura que sea booleano
    };

    try {
      Swal.fire({
        title: currentItem ? 'Actualizando...' : 'Creando...',
        text: 'Por favor espera.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      if (currentItem) {
        await axios.put(`${API_URL_ADMIN}/${currentItem.id}`, payload, getAuthHeaders());
        Swal.fire('Actualizado', 'El ítem de contacto fue actualizado correctamente.', 'success');
      } else {
        await axios.post(API_URL_ADMIN, payload, getAuthHeaders());
        Swal.fire('Creado', 'El ítem de contacto fue creado exitosamente.', 'success');
      }
      fetchContactos();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar ítem de contacto:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.response?.data?.detalle || 'No se pudo guardar el ítem.';
      Swal.fire('Error', errorMessage, 'error');
    }
  };

  const handleDeleteItem = async (id, etiquetaItem) => {
    if (!token) {
      Swal.fire('Error', 'No autenticado. No se puede eliminar.', 'error');
      return;
    }
    Swal.fire({
      title: '¿Estás seguro?',
      html: `El ítem "<b>${etiquetaItem}</b>" se eliminará permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({ title: 'Eliminando...', text: 'Por favor espera.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
          await axios.delete(`${API_URL_ADMIN}/${id}`, getAuthHeaders());
          Swal.fire('Eliminado', 'El ítem de contacto fue eliminado correctamente.', 'success');
          fetchContactos();
        } catch (error) {
          console.error('Error al eliminar ítem:', error.response?.data || error.message);
          const errorMessage = error.response?.data?.message || error.response?.data?.detalle || 'No se pudo eliminar el ítem.';
          Swal.fire('Error', errorMessage, 'error');
        }
      }
    });
  };
  
  // Protección de ruta
  if (!user || (user.rol !== 'administrador' && user.rol !== 'superadministrador')) {
      if (!loading) { // Solo muestra el mensaje si no está cargando y el usuario no es válido
        return (
            <div className="container mt-4">
                <div className="alert alert-warning text-center">
                <h4><i className="fas fa-exclamation-triangle me-2"></i>Acceso Restringido</h4>
                <p>No tiene permisos para acceder a esta sección.</p>
                {/* Podrías usar <Navigate to="/login" replace /> si Navigate está configurado */}
                </div>
            </div>
        );
      }
      return null; // O un spinner si loading es true y no hay token
  }


  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Gestión de Información de Contacto</h3>
        <Button variant="success" onClick={() => handleShowModal()}>
          <i className="fas fa-plus me-2"></i> Nuevo Ítem
        </Button>
      </div>

      {loading ? (
        <div className="text-center p-5"><div className="spinner-border text-primary"></div><p className="mt-2">Cargando información de contacto...</p></div>
      ) : (
        <div className="table-responsive shadow-sm bg-white p-3 rounded">
          <Table striped bordered hover responsive ref={tableRef} id="tablaContactos" className="w-100">
            <thead className="thead-light">
              <tr>
                <th>Etiqueta</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Orden</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Activo</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {contactos.map(item => (
                <tr key={item.id}>
                  <td>{item.etiqueta}</td>
                  <td>{item.categoria}</td>
                  <td>{TIPOS_DATO_CONTACTO.find(t => t.value === item.tipo_dato)?.label || item.tipo_dato}</td>
                  <td style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={item.valor}>
                    {item.valor}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.orden}</td>
                  <td style={{ textAlign: 'center' }}>{item.activo ? <Badge bg="success">Sí</Badge> : <Badge bg="danger">No</Badge>}</td>
                  <td style={{ textAlign: 'center' }}>
                    <Button variant="info" size="sm" className="me-1" title="Editar Ítem" onClick={() => handleShowModal(item)}>
                      <i className="fas fa-edit"></i>
                    </Button>
                    <Button variant="danger" size="sm" title="Eliminar Ítem" onClick={() => handleDeleteItem(item.id, item.etiqueta)}>
                      <i className="fas fa-trash"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Modal show={showModal} onHide={handleCloseModal} size="lg" backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title>{currentItem ? 'Editar Ítem de Contacto' : 'Nuevo Ítem de Contacto'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group controlId="formCategoria" className="mb-3">
              <Form.Label>Categoría <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="categoria"
                placeholder="Ej: Redes Sociales (se creará si no existe)"
                value={formData.categoria}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="formTipoDato" className="mb-3">
              <Form.Label>Tipo de Dato <span className="text-danger">*</span></Form.Label>
              <Form.Select
                name="tipo_dato"
                value={formData.tipo_dato}
                onChange={handleChange}
                required
              >
                {TIPOS_DATO_CONTACTO.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="formEtiqueta" className="mb-3">
              <Form.Label>Etiqueta (Texto visible) <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="etiqueta"
                placeholder="Ej: Instagram UCM, Correo Principal"
                value={formData.etiqueta}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="formValor" className="mb-3">
              <Form.Label>Valor (URL, email, teléfono, texto) <span className="text-danger">*</span></Form.Label>
              <Form.Control
                as={formData.tipo_dato === 'texto_simple' ? 'textarea' : 'input'}
                type={formData.tipo_dato === 'texto_simple' ? undefined : 'text'} // 'text' es un buen default para input
                rows={formData.tipo_dato === 'texto_simple' ? 3 : undefined}
                name="valor"
                placeholder="https://ejemplo.com o texto descriptivo"
                value={formData.valor}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="formIcono" className="mb-3">
              <Form.Label>Icono (Opcional)</Form.Label>
              <Form.Select
                name="icono"
                value={formData.icono}
                onChange={handleChange}
              >
                {ICONOS_DISPONIBLES.map(icon => (
                  <option key={icon.value} value={icon.value}>{icon.label}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Ej: FaInstagram, FaEnvelope. Si no estás seguro, déjalo en "Ninguno".
              </Form.Text>
            </Form.Group>

            <Form.Group controlId="formOrden" className="mb-3">
              <Form.Label>Orden (Numérico) <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="number"
                name="orden"
                value={formData.orden}
                onChange={handleChange}
                min="0"
                required
              />
            </Form.Group>
            
            <Form.Group controlId="formActivo" className="mb-3">
              <Form.Check
                type="checkbox"
                name="activo"
                label="Activo (mostrar en la página pública)"
                checked={formData.activo}
                onChange={handleChange}
              />
            </Form.Group>

          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {currentItem ? 'Actualizar' : 'Crear'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default GestionContactanos;