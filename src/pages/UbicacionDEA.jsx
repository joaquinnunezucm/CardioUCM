import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import BackButton from '../pages/BackButton.jsx';
import RoutingControl from '../pages/RoutingControl';
import {
  isRUT,
  isCoordinate,
  minLength,
  maxLength,
  isRequired,
  isInteger,
  isSimpleAlphaWithSpaces,
  isSimpleAlphaNumericWithSpaces,
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
        text: 'Seleccione el lugar para obtener las coordenadas automáticamente.',
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
  const [destinoRuta, setDestinoRuta] = useState(null);
  const [vozActiva, setVozActiva] = useState(false);

  const [comunas, setComunas] = useState([]);
  const [comunaNoExiste, setComunaNoExiste] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'numero') {
      finalValue = value.replace(/[^0-9]/g, '');
    } else if (name === 'nombre' || name === 'calle') {
      finalValue = value
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, '');
    } else if (name === 'solicitante') {
      finalValue = value
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z\s]/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));

    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  useEffect(() => {
    axios.get('http://localhost:3001/api/comunas')
      .then(res => {
        const nombresComunas = res.data.map(c => c.nombre);
        setComunas(nombresComunas);
      })
      .catch((err) => {
        console.error('Error al cargar comunas:', err);
        setComunas([]);
      });
  }, []);

  useEffect(() => {
    axios
      .get('http://localhost:3001/defibriladores')
      .then((res) => {
        setDesfibriladores(res.data);
      })
      .catch((err) => {
        console.error('Error cargando DEAs aprobados:', err);
        Swal.fire('Error', 'No se pudieron cargar los desfibriladores.', 'error');
      });
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          if (center[0] === initialCenter.current[0] && center[1] === initialCenter.current[1]) {
            setCenter(coords);
          }
        },
        (error) => {
          console.error('Error obteniendo ubicación del usuario:', error);
          Swal.fire('Error', 'No se pudo obtener tu ubicación.', 'error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  useEffect(() => {
    if (userLocation && desfibriladores.length > 0) {
      const cercanosCalculados = desfibriladores
        .map((dea) => {
          const lat = parseFloat(dea.lat);
          const lng = parseFloat(dea.lng);
          if (isNaN(lat) || isNaN(lng)) { return { ...dea, distancia: Infinity }; }
          return { ...dea, distancia: getDistance(userLocation[0], userLocation[1], lat, lng) };
        })
        .sort((a, b) => a.distancia - b.distancia)
        .slice(0, 10);
      setCercanos(cercanosCalculados);
    } else {
      setCercanos([]);
    }
  }, [userLocation, desfibriladores]);

  const handleShowModal = () => {
    setShowModal(true);
    setErrors({});
    setTermsAccepted(false);
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setShowModal(false);
      setFormData({
        nombre: '', calle: '', numero: '', comuna: '', lat: '', lng: '', solicitante: '', rut: '',
      });
      setErrors({});
      setTermsAccepted(false);
    }
  };

  const handleShowTermsModal = () => setShowTermsModal(true);
  const handleCloseTermsModal = () => setShowTermsModal(false);

  const handleTermsChange = (e) => {
    setTermsAccepted(e.target.checked);
    if (errors.terms) {
        setErrors(prev => ({...prev, terms: null}));
    }
  };

  const validate = () => {
    const newErrors = {};
    const { nombre, calle, numero, comuna, lat, lng, solicitante, rut } = formData;

    let errorNombre = isRequired(nombre) || minLength(3)(nombre) || maxLength(58)(nombre) || isSimpleAlphaNumericWithSpaces(nombre);
    if (errorNombre) newErrors.nombre = errorNombre;

    let errorCalle = isRequired(calle) || minLength(3)(calle) || maxLength(45)(calle) || isSimpleAlphaNumericWithSpaces(calle);
    if (errorCalle) newErrors.calle = errorCalle;

    let errorNumero = (numero && maxLength(10)(numero)) || (numero && isInteger(numero));
    if (errorNumero) newErrors.numero = errorNumero;
    
    let errorComuna = isRequired(comuna) || (!comunas.includes(comuna) && 'La comuna seleccionada no existe en nuestra base de datos.');
    if (errorComuna) newErrors.comuna = errorComuna;

    let errorLat = isRequired(lat) || isCoordinate(lat);
    if (errorLat) newErrors.lat = errorLat;

    let errorLng = isRequired(lng) || isCoordinate(lng);
    if (errorLng) newErrors.lng = errorLng;

    let errorSolicitante = isRequired(solicitante) || minLength(3)(solicitante) || maxLength(50)(solicitante) || isSimpleAlphaWithSpaces(solicitante);
    if (errorSolicitante) newErrors.solicitante = errorSolicitante;

    let errorRut = isRequired(rut) || isRUT(rut);
    if (errorRut) newErrors.rut = errorRut;

    if (!termsAccepted) {
        newErrors.terms = 'Debes aceptar los términos y condiciones para poder enviar la solicitud.';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setComunaNoExiste(false);

    const formErrors = validate();

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      if (formErrors.comuna && formErrors.comuna.includes('existe')) {
          setComunaNoExiste(true);
      }
      Swal.fire({
        icon: 'error',
        title: 'Hay errores en el formulario',
        text: 'Por favor, corrige los campos marcados en rojo antes de enviar.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    setIsSubmitting(true);
    const { nombre, calle, numero, comuna, lat, lng, solicitante, rut } = formData;
    const dataParaEnviar = {
      nombre, gl_instalacion_calle: calle, nr_instalacion_numero: numero,
      gl_instalacion_comuna: comuna, lat, lng, solicitante, rut,
    };

    try {
      await axios.post('http://localhost:3001/solicitudes-dea', dataParaEnviar);
      Swal.fire({
        title: 'Sugerencia Aceptada',
        text: '¡Gracias por colaborar! Tu sugerencia ha sido enviada para revisión.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
      });
      handleCloseModal();
    } catch (err) {
      const errorMsg = err.response?.data?.mensaje || 'Error al enviar la solicitud. Intente más tarde.';
      Swal.fire('Error', errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const focusMarkerYRuta = (id, lat, lng) => {
    setCenter([parseFloat(lat), parseFloat(lng)]);
    setDestinoRuta([parseFloat(lat), parseFloat(lng)]);
    setTimeout(() => { markersRef.current[id]?.openPopup(); }, 300);
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
              <h1 className="m-0 text-3xl md:text-4xl font-bold text-Black-700">
                Mapa de Desfibriladores
              </h1>
            </div>
          </div>
        </div>
      </div>
      <section className="content py-5">
        <div className="container-fluid">
          <div style={{ height: '50vh', position: 'relative', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
            <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <CenterMap position={center} />
              <ClickHandler setFormData={setFormData} setShowModal={setShowModal} />
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={userIcon}
                  ref={(ref) => {
                    userMarkerRef.current = ref;
                    if (ref) {
                      setTimeout(() => {
                        ref.openPopup();
                      }, 500);
                    }
                  }}
                >
                  <Popup>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Estás aquí</h1>
                  </Popup>
                </Marker>
              )}
              {cercanos.map((d) => (
                <Marker
                  key={d.id}
                  position={[parseFloat(d.lat), parseFloat(d.lng)]}
                  icon={customIcon}
                  ref={(ref) => (markersRef.current[d.id] = ref)}
                >
                  <Popup>
                    <b>{d.nombre}</b>
                    <br />
                    {d.direccion}
                    {userLocation && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="mt-2"
                        onClick={() => {
                          setDestinoRuta([parseFloat(d.lat), parseFloat(d.lng)]);
                          setVozActiva(true);
                        }}
                      >
                        Ver Ruta desde mi ubicación
                      </Button>
                    )}
                  </Popup>
                </Marker>
              ))}
              {userLocation && destinoRuta && (
                <RoutingControl
                  from={userLocation}
                  to={destinoRuta}
                  vozActiva={vozActiva}
                  onDetenerRuta={() => {
                    setDestinoRuta(null);
                    setVozActiva(false);
                  }}
                />
              )}

            </MapContainer>
            <button
              onClick={handleShowModal}
              className="btn btn-success"
              style={{ ...mapButtonStyle, top: 10, right: 10 }}
            >
              <i className="fas fa-plus mr-1"></i> Sugerir Nuevo DEA
            </button>
            <button
              onClick={() => {
                if (userLocation) {
                  setCenter([...userLocation]);
                  if (userMarkerRef.current) {
                    userMarkerRef.current.openPopup();
                  }
                } else {
                  Swal.fire('Error', 'No se ha podido obtener tu ubicación actual.', 'error');
                }
              }}
              className="btn btn-info"
              style={{ ...mapButtonStyle, top: 60, right: 10 }}
            >
              Mi Ubicación
            </button>
            {destinoRuta && (
              <button
                onClick={() => {
                  setDestinoRuta(null);
                  setVozActiva(false);
                }}
                className="btn btn-danger"
                style={{ ...mapButtonStyle, top: 110, right: 10 }}
              >
                Detener Ruta
              </button>
            )}
          </div>
          <div className="row">
            <div className="col-md-6 mb-4">
              <h4 className="mb-3">DEAs más cercanos</h4>
              {cercanos.length > 0 ? (
                <ul className="list-group">
                  {cercanos.map((d) => (
                    <li key={d.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <button
                        className="btn btn-link p-0 text-left w-100"
                        style={{ color: '#007bff', textDecoration: 'none' }}
                        onClick={() => focusMarkerYRuta(d.id, d.lat, d.lng)}
                      >
                        <strong>{d.nombre}</strong> - {d.direccion ? d.direccion : 'Dirección no disponible'}
                        <span className="float-right text-muted">
                          {typeof d.distancia === 'number' && !isNaN(d.distancia)
                            ? `(${d.distancia.toFixed(2)} km)`
                            : '(Dist. no disp.)'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : userLocation ? (
                <p className="text-muted">
                  No hay DEAs activos registrados cerca de tu ubicación o no se pudo calcular la distancia.
                </p>
              ) : (
                <p className="text-muted">Obteniendo tu ubicación para mostrar DEAs cercanos...</p>
              )}
            </div>
          </div>
          <Modal show={showModal} onHide={handleCloseModal} centered>
            <Modal.Header closeButton>
              <Modal.Title>Sugerir nuevo DEA</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit} noValidate>
              <Modal.Body>
                <Form.Group controlId="formNombre">
                  <Form.Label>Nombre del lugar*</Form.Label>
                  <Form.Control type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Ej: Centro Comercial Talca" required disabled={isSubmitting} maxLength={58} isInvalid={!!errors.nombre} />
                  {/* Aclaración para el usuario */}
                  <Form.Text muted>
                    Solo letras, números y espacios. Sin tildes ni símbolos.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.nombre}</Form.Control.Feedback>
                </Form.Group>
                
                <h5 className="mt-4 mb-2">Dirección de Instalación</h5>
                <Form.Group controlId="formCalle">
                  <Form.Label>Calle*</Form.Label>
                  <Form.Control type="text" name="calle" value={formData.calle} onChange={handleInputChange} placeholder="Ej: Avenida San Miguel" required disabled={isSubmitting} maxLength={45} isInvalid={!!errors.calle} />
                  {/* Aclaración para el usuario */}
                  <Form.Text muted>
                    Solo letras, números y espacios. Sin tildes ni símbolos.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.calle}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group controlId="formNumero" className="mt-3">
                  <Form.Label>Número</Form.Label>
                  <Form.Control type="text" inputMode="numeric" name="numero" value={formData.numero} onChange={handleInputChange} placeholder="Ej: 742" disabled={isSubmitting} maxLength={10} isInvalid={!!errors.numero} />
                  {/* Aclaración para el usuario */}
                  <Form.Text muted>
                    Solo números. Dejar en blanco si no aplica.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.numero}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group controlId="formComuna" className="mt-3">
                  <Form.Label>Comuna*</Form.Label>
                  <Select name="comuna" options={comunas.map(c => ({ value: c, label: c }))} value={formData.comuna ? { value: formData.comuna, label: formData.comuna } : null}
                    onChange={option => {
                      setFormData(prev => ({ ...prev, comuna: option ? option.value : '' }));
                      setComunaNoExiste(false);
                      if (errors.comuna) setErrors(prev => ({...prev, comuna: null}));
                    }}
                    isClearable isSearchable placeholder="Busca o selecciona una comuna" isDisabled={isSubmitting} noOptionsMessage={() => "No se encontró la comuna"}
                    styles={{ control: base => ({ ...base, borderColor: errors.comuna ? '#dc3545' : '#ced4da', '&:hover': { borderColor: errors.comuna ? '#dc3545' : '#80bdff' } })}} />
                  {errors.comuna && <div className="text-danger mt-1" style={{fontSize: '0.875em'}}>{errors.comuna}</div>}
                </Form.Group>
                {comunaNoExiste && <div className="alert alert-warning mt-2 p-2">La comuna ingresada no existe en nuestra base de datos. Por favor, <a href="/contacto">contáctanos</a> para agregarla.</div>}

                <h5 className="mt-4 mb-2">Coordenadas Geográficas</h5>
                <Form.Group controlId="formLatitud">
                  <Form.Label>Latitud*</Form.Label>
                  <Form.Control type="number" step="any" name="lat" value={formData.lat} onChange={handleInputChange} placeholder="Ej: -35.123456" required disabled={isSubmitting} isInvalid={!!errors.lat} />
                  {/* Aclaración para el usuario */}
                  <Form.Text muted>
                    Se rellena automáticamente al hacer clic en el mapa.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.lat}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group controlId="formLongitud" className="mt-3">
                  <Form.Label>Longitud*</Form.Label>
                  <Form.Control type="number" step="any" name="lng" value={formData.lng} onChange={handleInputChange} placeholder="Ej: -71.123456" required disabled={isSubmitting} isInvalid={!!errors.lng} />
                  {/* Aclaración para el usuario */}
                  <Form.Text muted>
                    Se rellena automáticamente al hacer clic en el mapa.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.lng}</Form.Control.Feedback>
                </Form.Group>
                
                <h5 className="mt-4 mb-2">Información del Solicitante</h5>
                <Form.Group controlId="formSolicitante">
                  <Form.Label>Nombre del Solicitante*</Form.Label>
                  <Form.Control type="text" name="solicitante" value={formData.solicitante} onChange={handleInputChange} placeholder="Nombre completo" required disabled={isSubmitting} maxLength={50} isInvalid={!!errors.solicitante} />
                  {/* Aclaración para el usuario */}
                  <Form.Text muted>
                    Solo letras y espacios. Sin tildes, números o símbolos.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.solicitante}</Form.Control.Feedback>
                </Form.Group>
                
                <Form.Group controlId="formRut" className="mt-3">
                  <Form.Label>RUT del Solicitante*</Form.Label>
                  <Form.Control type="text" name="rut" value={formData.rut} onChange={handleInputChange} placeholder="Ej: 12345678-9" required disabled={isSubmitting} isInvalid={!!errors.rut} />
                  {/* Aclaración para el usuario */}
                  <Form.Text muted>
                    Ingresar sin puntos y con guion.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.rut}</Form.Control.Feedback>
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
                Tienes derecho a solicitar el acceso, rectificación o eliminación de tus datos contactándonos en cardioucm@ucm.cl.
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
                Para consultas, solicitudes relacionadas con tus datos personales o cualquier duda sobre estos términos, contáctanos en <a href="mailto:cardioucm@ucm.cl">cardioucm@ucm.cl</a>.
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