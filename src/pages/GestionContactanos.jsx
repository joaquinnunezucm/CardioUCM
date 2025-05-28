// src/components/GestionContactanos.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext'; // Asumiendo que tienes AuthContext
import { Navigate } from 'react-router-dom';   // Para proteger la ruta

const TIPOS_DATO_CONTACTO = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' }, // Ejemplo, añade más si necesitas
  { value: 'twitter', label: 'Twitter/X' },  // Ejemplo
  { value: 'email', label: 'Correo Electrónico' },
  { value: 'telefono', label: 'Teléfono' },
  { value: 'enlace_web', label: 'Enlace Web (URL)' },
  { value: 'texto_simple', label: 'Texto Simple (informativo)' },
];

const ICONOS_DISPONIBLES = [ // Lista de iconos que el admin puede elegir
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
  const { user, token } = useAuth(); // Necesitarás el token para las peticiones
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableInitialized, setTableInitialized] = useState(false);
  const tableRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({
    categoria: '',
    tipo_dato: 'enlace_web', // Valor por defecto
    etiqueta: '',
    valor: '',
    icono: '',
    orden: 0,
    activo: true,
  });

  // Proteger la ruta (si no tienes un HOC o wrapper para esto)
  if (!user || (user.rol !== 'administrador' && user.rol !== 'superadministrador')) {
    return <Navigate to="/login" />;
  }

  const API_URL = 'http://localhost:3001/api/admin/contactos'; // URL base para admin

  const fetchContactos = async () => {
    try {
      setLoading(true);
      if ($.fn.dataTable.isDataTable(tableRef.current)) {
        $(tableRef.current).DataTable().destroy();
        setTableInitialized(false);
      }
      const response = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` } // Enviar token
      });
      setContactos(response.data);
    } catch (error) {
      console.error('Error al obtener información de contacto:', error);
      Swal.fire('Error', 'No se pudo cargar la información de contacto.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContactos();
  }, [token]); // Dependencia del token si puede cambiar

  useEffect(() => {
    if (!loading && contactos.length > 0 && !tableInitialized) {
      $(tableRef.current).DataTable({
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ ítems',
          paginate: { previous: 'Anterior', next: 'Siguiente' },
          zeroRecords: 'No se encontraron ítems de contacto',
        },
        order: [[1, 'asc'], [5, 'asc']] // Ordenar por categoría, luego por orden
      });
      setTableInitialized(true);
    }
  }, [loading, contactos, tableInitialized]);

  const handleShowModal = (item = null) => {
    if (item) {
      setCurrentItem(item);
      setFormData({
        categoria: item.categoria,
        tipo_dato: item.tipo_dato,
        etiqueta: item.etiqueta,
        valor: item.valor,
        icono: item.icono || '',
        orden: item.orden,
        activo: item.activo,
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

  const handleCloseModal = () => setShowModal(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'orden' ? parseInt(value) || 0 : value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { categoria, tipo_dato, etiqueta, valor, orden } = formData;

    if (!categoria.trim() || !tipo_dato.trim() || !etiqueta.trim() || !valor.trim() || isNaN(orden)) {
      Swal.fire('Campos incompletos', 'Categoría, Tipo, Etiqueta, Valor y Orden son obligatorios.', 'warning');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (currentItem) {
        await axios.put(`${API_URL}/${currentItem.id}`, formData, config);
        Swal.fire('Actualizado', 'El ítem de contacto fue actualizado correctamente.', 'success');
      } else {
        await axios.post(API_URL, formData, config);
        Swal.fire('Creado', 'El ítem de contacto fue creado exitosamente.', 'success');
      }
      fetchContactos();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar ítem de contacto:', error.response?.data?.message || error.message);
      Swal.fire('Error', `No se pudo guardar el ítem: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const handleDeleteItem = async (id, etiqueta) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `El ítem "${etiqueta}" se eliminará permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_URL}/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          Swal.fire('Eliminado', 'El ítem de contacto fue eliminado correctamente.', 'success');
          fetchContactos();
        } catch (error) {
          console.error('Error al eliminar ítem:', error);
          Swal.fire('Error', 'No se pudo eliminar el ítem.', 'error');
        }
      }
    });
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Gestión de Información de Contacto</h3>

      <div className="mb-3 text-right">
        <button className="btn btn-success" onClick={() => handleShowModal()}>
          <i className="fas fa-plus"></i> Nuevo Ítem
        </button>
      </div>

      {loading ? (
        <div className="text-center"><div className="spinner-border"></div><p>Cargando...</p></div>
      ) : (
        <div className="table-responsive">
          <table ref={tableRef} className="table table-bordered table-hover">
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
                  <td style={{ textAlign: 'center' }}>{item.activo ? 'Sí' : 'No'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-sm btn-info mr-1" onClick={() => handleShowModal(item)}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteItem(item.id, item.etiqueta)}>
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
          <Modal.Title>{currentItem ? 'Editar Ítem de Contacto' : 'Nuevo Ítem de Contacto'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group controlId="formCategoria" className="mb-3">
              <Form.Label>Categoría</Form.Label>
              <Form.Control
                type="text"
                name="categoria"
                placeholder="Ej: Redes Sociales, Enlaces Institucionales"
                value={formData.categoria}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="formTipoDato" className="mb-3">
              <Form.Label>Tipo de Dato</Form.Label>
              <Form.Control
                as="select"
                name="tipo_dato"
                value={formData.tipo_dato}
                onChange={handleChange}
                required
              >
                {TIPOS_DATO_CONTACTO.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="formEtiqueta" className="mb-3">
              <Form.Label>Etiqueta (Texto visible)</Form.Label>
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
              <Form.Label>Valor (URL, email, teléfono, texto)</Form.Label>
              <Form.Control
                as={formData.tipo_dato === 'texto_simple' ? 'textarea' : 'input'}
                type={formData.tipo_dato === 'texto_simple' ? undefined : 'text'}
                rows={formData.tipo_dato === 'texto_simple' ? 3 : undefined}
                name="valor"
                placeholder="https://ejemplo.com o texto descriptivo"
                value={formData.valor}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="formIcono" className="mb-3">
              <Form.Label>Icono (Opcional, nombre de react-icons/fa)</Form.Label>
              <Form.Control
                as="select"
                name="icono"
                value={formData.icono}
                onChange={handleChange}
              >
                {ICONOS_DISPONIBLES.map(icon => (
                  <option key={icon.value} value={icon.value}>{icon.label}</option>
                ))}
              </Form.Control>
              <Form.Text className="text-muted">
                Ej: FaInstagram, FaEnvelope. Si no estás seguro, déjalo en "Ninguno".
              </Form.Text>
            </Form.Group>

            <Form.Group controlId="formOrden" className="mb-3">
              <Form.Label>Orden (Numérico)</Form.Label>
              <Form.Control
                type="number"
                name="orden"
                value={formData.orden}
                onChange={handleChange}
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