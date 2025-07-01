import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import BackButton from '../pages/BackButton.jsx';
import { API_BASE_URL } from '../utils/api';
import RoutingControl from '../pages/RoutingControl'; // Asegúrate que la ruta sea correcta
import {
  isRUT,
  isCoordinate,
  minLength,
  maxLength,
  isRequired,
  isInteger,
  isSimpleAlphaWithSpaces,
  isSimpleAlphaNumericWithSpaces,
  isEmail
} from '../utils/validators.js';
import Select from 'react-select';

// Icono personalizado para los DEAs
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Icono para la ubicación del usuario
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Componente para centrar el mapa
const CenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 16);
    }
  }, [position, map]);
  return null;
};

// Componente para manejar clics en el mapa
const ClickHandler = ({ setFormData, setShowModal }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      Swal.fire({
        title: '¿Desea sugerir un DEA en esta ubicación?',
        text: 'Las coordenadas se rellenarán automáticamente en el formulario.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, sugerir',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) {
          setFormData((prev) => ({
            ...prev,
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
          }));
          setShowModal(true);
        }
      });
    },
  });
  return null;
};

// Función para calcular la distancia (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const UbicacionDEA = () => {
  const [desfibriladores, setDesfibriladores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    calle: '',
    numero: '',
    comuna: '',
    lat: '',
    lng: '',
    solicitante: '',
    rut: '',
    email: '',
    termsAccepted: false,
  });

  const [errors, setErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const initialCenter = useRef([-35.428542, -71.672308]);
  const [center, setCenter] = useState(initialCenter.current);
  const [userLocation, setUserLocation] = useState(null);
  const markersRef = useRef({});
  const [cercanos, setCercanos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userMarkerRef = useRef(null);
  
  // ESTADOS PARA LA GESTIÓN DE LA RUTA
  const [destinoRuta, setDestinoRuta] = useState(null); // Coordenadas del DEA seleccionado
  const [rutaFrom, setRutaFrom] = useState(null);       // Coordenadas de inicio (tu ubicación al iniciar)
  const [vozActiva, setVozActiva] = useState(false);     // Flag para activar la guía por voz

  const [comunas, setComunas] = useState([]);
  const [comunaNoExiste, setComunaNoExiste] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeaId, setSelectedDeaId] = useState(null);
  const [isGeolocationRequested, setIsGeolocationRequested] = useState(false);

  const handleLocationError = (error) => {
    setIsLoading(false);
    let title = 'Error de Ubicación';
    let text = 'No se pudo obtener tu ubicación. Por favor, inténtalo de nuevo.';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        title = 'Permiso de Ubicación Denegado';
        text = 'Para usar esta función, por favor, habilita los permisos de ubicación en tu navegador o dispositivo y recarga la página.';
        break;
      case error.POSITION_UNAVAILABLE:
        title = 'Ubicación no Disponible';
        text = 'No pudimos detectar tu ubicación actual. Asegúrate de tener una buena conexión a internet o señal GPS.';
        break;
      case error.TIMEOUT:
        title = 'Tiempo de Espera Agotado';
        text = 'La solicitud para obtener tu ubicación tardó demasiado. Por favor, comprueba tu conexión y vuelve a intentarlo.';
        break;
      default:
        text = `Ocurrió un error inesperado al obtener la ubicación: ${error.message}`;
        break;
    }
    Swal.fire({ icon: 'error', title, text, confirmButtonText: 'Entendido' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'numero') {
      finalValue = value.replace(/[^0-9]/g, '');
    } else if (name === 'nombre' || name === 'calle') {
      finalValue = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, '');
    } else if (name === 'solicitante') {
      finalValue = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z\s]/g, '');
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/comunas`)
      .then(res => setComunas(res.data.map(c => c.nombre)))
      .catch(err => console.error('Error al cargar comunas:', err));

    axios.get(`${API_BASE_URL}/api/defibriladores`)
      .then(res => setDesfibriladores(res.data))
      .catch(err => Swal.fire('Error', 'No se pudieron cargar los desfibriladores.', 'error'));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLoading(false);
      Swal.fire('Geolocalización no soportada', 'Tu navegador no soporta la geolocalización.', 'error');
      return;
    }
    Swal.fire({
      title: '¿Permitir ubicación?',
      text: 'Para mostrar los DEAs cercanos y calcular rutas, necesitamos tu ubicación.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, permitir',
      cancelButtonText: 'No, gracias',
    }).then(result => {
      if (result.isConfirmed) {
        setIsGeolocationRequested(true);
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!isGeolocationRequested) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        if (isLoading) {
          setCenter(coords);
          setIsLoading(false);
        }
      },
      handleLocationError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isGeolocationRequested, isLoading]);

  useEffect(() => {
    if (userLocation && desfibriladores.length > 0) {
      const cercanosCalculados = desfibriladores
        .map(dea => ({
          ...dea,
          distancia: getDistance(userLocation[0], userLocation[1], parseFloat(dea.lat), parseFloat(dea.lng))
        }))
        .sort((a, b) => a.distancia - b.distancia)
        .slice(0, 10);
      setCercanos(cercanosCalculados);
    }
  }, [userLocation, desfibriladores]);
  
  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    if (isSubmitting) return;
    setShowModal(false);
    setFormData({ nombre: '', calle: '', numero: '', comuna: '', lat: '', lng: '', solicitante: '', rut: '', email: '', termsAccepted: false });
    setErrors({});
    setTermsAccepted(false);
  };
  
  const handleShowTermsModal = () => setShowTermsModal(true);
  const handleCloseTermsModal = () => setShowTermsModal(false);

  const handleTermsChange = (e) => {
    setTermsAccepted(e.target.checked);
    if (errors.terms) setErrors(prev => ({ ...prev, terms: null }));
  };

  const validate = () => {
    const newErrors = {};
    const { nombre, calle, numero, comuna, lat, lng, solicitante, rut, email } = formData;
    let errorNombre = isRequired(nombre) || minLength(3)(nombre) || maxLength(58)(nombre) || isSimpleAlphaNumericWithSpaces(nombre);
    if (errorNombre) newErrors.nombre = errorNombre;
    let errorCalle = isRequired(calle) || minLength(3)(calle) || maxLength(45)(calle) || isSimpleAlphaNumericWithSpaces(calle);
    if (errorCalle) newErrors.calle = errorCalle;
    let errorNumero = (numero && maxLength(10)(numero)) || (numero && isInteger(numero));
    if (errorNumero) newErrors.numero = errorNumero;
    let errorComuna = isRequired(comuna) || (!comunas.includes(comuna) && 'La comuna seleccionada no es válida.');
    if (errorComuna) newErrors.comuna = errorComuna;
    let errorLat = isRequired(lat) || isCoordinate(lat);
    if (errorLat) newErrors.lat = errorLat;
    let errorLng = isRequired(lng) || isCoordinate(lng);
    if (errorLng) newErrors.lng = errorLng;
    let errorSolicitante = isRequired(solicitante) || minLength(3)(solicitante) || maxLength(50)(solicitante) || isSimpleAlphaWithSpaces(solicitante);
    if (errorSolicitante) newErrors.solicitante = errorSolicitante;
    let errorRut = isRequired(rut) || isRUT(rut);
    if (errorRut) newErrors.rut = errorRut;
    let errorEmail = isRequired(email) || isEmail(email);
    if (errorEmail) newErrors.email = errorEmail;
    if (!termsAccepted) newErrors.terms = 'Debes aceptar los términos y condiciones.';
    return newErrors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validate();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      Swal.fire('Formulario incompleto', 'Por favor, corrige los errores antes de enviar.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/api/solicitudes-dea`, {
        nombre: formData.nombre,
        gl_instalacion_calle: formData.calle,
        nr_instalacion_numero: formData.numero,
        gl_instalacion_comuna: formData.comuna,
        lat: formData.lat,
        lng: formData.lng,
        solicitante: formData.solicitante,
        rut: formData.rut,
        email: formData.email,
        terms_accepted: termsAccepted
      });
      Swal.fire('Sugerencia Enviada', '¡Gracias por colaborar! Tu sugerencia ha sido enviada para revisión.', 'success');
      handleCloseModal();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.mensaje || 'No se pudo enviar la solicitud.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const iniciarNavegacion = (dea) => {
    const destino = [parseFloat(dea.lat), parseFloat(dea.lng)];
    if (!userLocation || isNaN(userLocation[0]) || isNaN(destino[0])) {
      Swal.fire('Error', 'No se puede iniciar la navegación sin tu ubicación o un destino válido.', 'error');
      return;
    }
    console.debug('Iniciando navegación:', { from: userLocation, to: destino });
    setCenter(destino);
    setSelectedDeaId(dea.id);
    setTimeout(() => { markersRef.current[dea.id]?.openPopup(); }, 300);
    Swal.fire({
      title: '¿Iniciar guía por voz?',
      text: 'Se darán instrucciones de audio para llegar al destino.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, iniciar voz',
      cancelButtonText: 'No, solo mostrar ruta',
      reverseButtons: true,
    }).then((result) => {
      setVozActiva(result.isConfirmed);
      setRutaFrom([...userLocation]);
      setDestinoRuta(destino);
      setTimeout(() => { markersRef.current[dea.id]?.closePopup(); }, 2000);
    });
  };

  const onRouteFinished = () => {
    Swal.fire('¡Has llegado!', 'Has llegado a tu destino.', 'success');
    setDestinoRuta(null);
    setRutaFrom(null);
    setVozActiva(false);
    setSelectedDeaId(null);
  };

  const mapButtonStyle = {
    position: 'absolute', zIndex: 1000, border: 'none', borderRadius: '5px',
    padding: '10px 15px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    fontSize: '14px',
  };
  
  return (
    <div className="relative min-h-screen">
      <BackButton />
      <div className="content-header py-3 md:py-5 bg-white-50 pt-12">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-12 text-center">
              <h1 className="m-0 text-3xl md:text-4xl font-bold text-Black-700">Mapa de Desfibriladores</h1>
            </div>
          </div>
        </div>
      </div>
      <section className="content py-5">
        <div className="container-fluid">
          <div style={{ height: '50vh', position: 'relative', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
            {isLoading ? (
              <div className="d-flex justify-content-center align-items-center h-100 bg-light">
                <div className="spinner-border text-primary" role="status"><span className="sr-only">Cargando...</span></div>
                <p className="ml-3 mb-0">Obteniendo tu ubicación...</p>
              </div>
            ) : (
              <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <CenterMap position={center} />
                <ClickHandler setFormData={setFormData} setShowModal={setShowModal} />
                
                {userLocation && (
                  <Marker position={userLocation} icon={userIcon} ref={userMarkerRef}>
                    <Popup><h1 style={{ fontSize: '1.5rem', margin: 0 }}>Estás aquí</h1></Popup>
                  </Marker>
                )}

                {desfibriladores.map((d) => (
                  <Marker key={d.id} position={[parseFloat(d.lat), parseFloat(d.lng)]} icon={customIcon} ref={(ref) => (markersRef.current[d.id] = ref)}>
                    <Popup>
                      <b>{d.nombre}</b><br />
                      {d.gl_instalacion_calle} {d.nr_instalacion_numero || ''}
                      {userLocation && (
                        <Button size="sm" variant="primary" className="mt-2 w-100" onClick={() => iniciarNavegacion(d)}>
                          Ir a este DEA
                        </Button>
                      )}
                    </Popup>
                  </Marker>
                ))}

                {rutaFrom && destinoRuta && (
                  <RoutingControl
                    key={`${destinoRuta.join(',')}`}
                    from={rutaFrom}
                    to={destinoRuta}
                    vozActiva={vozActiva}
                    onRouteFinished={onRouteFinished}
                  />
                )}
              </MapContainer>
            )}
            {!isLoading && (
              <>
                <button onClick={handleShowModal} className="btn btn-success" style={{ ...mapButtonStyle, top: 10, right: 10 }}>
                  <i className="fas fa-plus mr-1"></i> Sugerir DEA
                </button>
                <button onClick={() => { if (userLocation) setCenter([...userLocation]); }} className="btn btn-info" style={{ ...mapButtonStyle, top: 60, right: 10 }}>
                  Mi Ubicación
                </button>
                {destinoRuta && (
                  <button onClick={onRouteFinished} className="btn btn-danger" style={{ ...mapButtonStyle, top: 110, right: 10 }}>
                    Detener Ruta
                  </button>
                )}
              </>
            )}
          </div>
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8 mb-4">
              <h4 className="mb-3 text-center">DEAs más cercanos</h4>
              {cercanos.length > 0 ? (
                <ul className="list-group">
                  {cercanos.map((d) => (
                    <li key={d.id} className={`list-group-item d-flex justify-content-between align-items-center ${selectedDeaId === d.id ? 'active' : ''}`}>
                      <button className="btn btn-link p-0 text-left w-100" style={{ color: selectedDeaId === d.id ? '#fff' : '#007bff', textDecoration: 'none' }} onClick={() => iniciarNavegacion(d)}>
                        <strong>{d.nombre}</strong> - {`${d.gl_instalacion_calle || ''} ${d.nr_instalacion_numero || ''}`}
                        <span className={`float-right ${selectedDeaId === d.id ? 'text-white-50' : 'text-muted'}`}>
                          ({d.distancia.toFixed(2)} km)
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted text-center">No hay DEAs registrados cerca o no se pudo obtener tu ubicación.</p>
              )}
            </div>
          </div>
          <Modal show={showModal} onHide={handleCloseModal} centered>
            <Modal.Header closeButton><Modal.Title>Sugerir nuevo DEA</Modal.Title></Modal.Header>
            <Form onSubmit={handleSubmit} noValidate>
              <Modal.Body>
                <Form.Group controlId="formNombre">
                  <Form.Label>Nombre del lugar*</Form.Label>
                  <Form.Control type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Ej: Centro Comercial Talca" required disabled={isSubmitting} maxLength={58} isInvalid={!!errors.nombre} />
                  <Form.Text muted>Solo letras, números y espacios. Sin tildes ni símbolos.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.nombre}</Form.Control.Feedback>
                </Form.Group>
                <h5 className="mt-4 mb-2">Dirección de Instalación</h5>
                <Form.Group controlId="formCalle">
                  <Form.Label>Calle*</Form.Label>
                  <Form.Control type="text" name="calle" value={formData.calle} onChange={handleInputChange} placeholder="Ej: Avenida San Miguel" required disabled={isSubmitting} maxLength={45} isInvalid={!!errors.calle} />
                  <Form.Text muted>Solo letras, números y espacios. Sin tildes ni símbolos.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.calle}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="formNumero" className="mt-3">
                  <Form.Label>Número</Form.Label>
                  <Form.Control type="text" inputMode="numeric" name="numero" value={formData.numero} onChange={handleInputChange} placeholder="Ej: 742" disabled={isSubmitting} maxLength={10} isInvalid={!!errors.numero} />
                  <Form.Text muted>Solo números. Dejar en blanco si no aplica.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.numero}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="formComuna" className="mt-3">
                  <Form.Label>Comuna*</Form.Label>
                  <Select name="comuna" options={comunas.map(c => ({ value: c, label: c }))} value={formData.comuna ? { value: formData.comuna, label: formData.comuna } : null}
                    onChange={option => { setFormData(prev => ({ ...prev, comuna: option ? option.value : '' })); if (errors.comuna) setErrors(prev => ({ ...prev, comuna: null })); }}
                    isClearable isSearchable placeholder="Busca o selecciona una comuna" isDisabled={isSubmitting} noOptionsMessage={() => "No se encontró la comuna"}
                    styles={{ control: base => ({ ...base, borderColor: errors.comuna ? '#dc3545' : '#ced4da' }) }} />
                  {errors.comuna && <div className="text-danger mt-1" style={{ fontSize: '0.875em' }}>{errors.comuna}</div>}
                </Form.Group>
                <h5 className="mt-4 mb-2">Coordenadas Geográficas</h5>
                <Form.Group controlId="formLatitud">
                  <Form.Label>Latitud*</Form.Label>
                  <Form.Control type="number" step="any" name="lat" value={formData.lat} onChange={handleInputChange} required disabled={isSubmitting} isInvalid={!!errors.lat} />
                  <Form.Control.Feedback type="invalid">{errors.lat}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="formLongitud" className="mt-3">
                  <Form.Label>Longitud*</Form.Label>
                  <Form.Control type="number" step="any" name="lng" value={formData.lng} onChange={handleInputChange} required disabled={isSubmitting} isInvalid={!!errors.lng} />
                  <Form.Control.Feedback type="invalid">{errors.lng}</Form.Control.Feedback>
                </Form.Group>
                <h5 className="mt-4 mb-2">Información del Solicitante</h5>
                <Form.Group controlId="formSolicitante">
                  <Form.Label>Nombre del Solicitante*</Form.Label>
                  <Form.Control type="text" name="solicitante" value={formData.solicitante} onChange={handleInputChange} placeholder="Nombre completo" required disabled={isSubmitting} maxLength={50} isInvalid={!!errors.solicitante} />
                  <Form.Text muted>Solo letras y espacios. Sin tildes, números o símbolos.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.solicitante}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="formRut" className="mt-3">
                  <Form.Label>RUT del Solicitante*</Form.Label>
                  <Form.Control type="text" name="rut" value={formData.rut} onChange={handleInputChange} placeholder="Ej: 12345678-9" required disabled={isSubmitting} isInvalid={!!errors.rut} />
                  <Form.Control.Feedback type="invalid">{errors.rut}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="formEmail" className="mt-3">
                  <Form.Label>Correo electrónico*</Form.Label>
                  <Form.Control type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="ejemplo@correo.com" required disabled={isSubmitting} isInvalid={!!errors.email} />
                  <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mt-3">
                  <Form.Check type="checkbox" label={<>Acepto los <span style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleShowTermsModal}>términos y condiciones</span>*</>}
                    checked={termsAccepted} onChange={handleTermsChange} disabled={isSubmitting} isInvalid={!!errors.terms} feedback={errors.terms} feedbackType="invalid" />
                </Form.Group>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseModal} disabled={isSubmitting}>Cancelar</Button>
                <Button variant="success" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}</Button>
              </Modal.Footer>
            </Form>
          </Modal>

          <Modal show={showTermsModal} onHide={handleCloseTermsModal} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Términos y Condiciones - CardioUCM</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <h5>1. Generalidades</h5>
              <p>
                Este documento regula el uso del formulario para sugerir desfibriladores externos automáticos (DEA) en la aplicación CardioUCM, desarrollada por la Universidad Católica del Maule. Al enviar el formulario, aceptas estos términos, conforme a las leyes de la República de Chile, en particular la Ley N° 19.628 sobre Protección de la Vida Privada, la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores y la Ley N° 19.799 sobre Documentos Electrónicos.
              </p>
              <h5>2. Recopilación y Uso de Datos Personales</h5>
              <p>
                Recopilamos tu nombre completo y RUT únicamente para contactarte en relación con la sugerencia de un DEA y para verificar tu identidad, asegurando la credibilidad de la solicitud. Estos datos no serán compartidos con terceros, salvo obligación legal (por ejemplo, requerimientos de autoridades competentes). Nos comprometemos a almacenar tus datos de forma segura.
              </p>
              <h5>3. Conservación de datos personales</h5>
              <p>
                Tienes derecho a solicitar el acceso, rectificación o eliminación de tus datos contactándonos en cardioucm1@gmail.com
              </p>
              <h5>4. Consentimiento</h5>
              <p>
                Al marcar la casilla de aceptación en el formulario, autorizas expresamente el uso de tus datos según lo descrito en este documento. Sin esta aceptación, no podrás enviar la solicitud.
              </p>
              <h5>5. Limitaciones de Responsabilidad</h5>
              <p>
                CardioUCM no se hace responsable por errores en los datos proporcionados por el usuario, fallos técnicos en el envío del formulario o interrupciones en el servicio debido a causas ajenas a nuestro control. La aprobación de las sugerencias de DEA depende de un proceso de revisión y no garantizamos su aceptación.
              </p>
              <h5>6. Modificaciones a los Términos</h5>
              <p>
                Nos reservamos el derecho a modificar estos términos y condiciones. Cualquier cambio será notificado a través de la aplicación CardioUCM o por correo electrónico a los usuarios registrados.
              </p>
              <h5>7. Ley Aplicable y Resolución de Conflictos</h5>
              <p>
                Este acuerdo se rige por las leyes de la República de Chile. Cualquier disputa derivada de este documento será resuelta en los tribunales de la ciudad de Talca, Región del Maule.
              </p>
              <h5>8. Contacto</h5>
              <p>
                Para consultas, solicitudes relacionadas con tus datos personales o cualquier duda sobre estos términos, contáctanos en <a href="mailto:cardioucm1@gmail.com">cardioucm1@gmail.com</a>.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseTermsModal}>
                Cerrar
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
      </section>
    </div>
  );
};

export default UbicacionDEA;