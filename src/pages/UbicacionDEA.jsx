import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import BackButton from '../pages/BackButton.jsx';
import { API_BASE_URL } from '../utils/api';
import ORSRouting from './ORSRouting'; // <-- Asegúrate que la ruta al archivo sea correcta
import {
  isRUT, isCoordinate, minLength, maxLength, isRequired, isInteger,
  isSimpleAlphaWithSpaces, isSimpleAlphaNumericWithSpaces, isEmail
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
        text: 'Has seleccionado una nueva ubicación en el mapa. ¿Quieres abrir el formulario para sugerir un nuevo DEA con estas coordenadas ya completadas?',
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

const speak = (text) => {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("La síntesis de voz no es soportada por este navegador.");
  }
};

const unlockSpeechSynthesis = () => {
  // Truco para iOS: reproducir un silencio para desbloquear el contexto de audio.
  const utterance = new SpeechSynthesisUtterance('');
  utterance.volume = 0; // No queremos que se escuche
  window.speechSynthesis.speak(utterance);
};

  const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };


const UbicacionDEA = () => {
  // Estados existentes
  const [desfibriladores, setDesfibriladores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '', calle: '', numero: '', comuna: '', lat: '', lng: '',
    solicitante: '', rut: '', email: '', termsAccepted: false,
  });
  const [errors, setErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cercanos, setCercanos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comunas, setComunas] = useState([]);
  const [comunaNoExiste, setComunaNoExiste] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeaId, setSelectedDeaId] = useState(null);
  const initialCenter = useRef([-35.428542, -71.672308]);
  const [center, setCenter] = useState(initialCenter.current);
  const [userLocation, setUserLocation] = useState(null);
  const [displayedUserPosition, setDisplayedUserPosition] = useState(null); 
  const [calculatedPosition, setCalculatedPosition] = useState(null); 
  const [deviationSignal, setDeviationSignal] = useState(false);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastRerouteTimestampRef = useRef(0);

  // <-- NUEVOS ESTADOS para la navegación y guía por voz
  const [destinoRuta, setDestinoRuta] = useState(null);
  const [rutaFrom, setRutaFrom] = useState(null);
  const [routeData, setRouteData] = useState({ coords: [], instructions: [] });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
const onRouteFoundCallback = useCallback((data) => {
  setRouteData(data);
  setCurrentStepIndex(0);
}, []);

const onDeviationCallback = useCallback(() => {
  console.log("Señal de desvío recibida desde el componente hijo.");
  setDeviationSignal(true);
}, []); // No necesita dependencias, ya que no usa variables de estado.

  const handleLocationError = (error) => {
    setIsLoading(false); 
    let title = 'Error de Ubicación';
    let text = 'No se pudo obtener tu ubicación. Por favor, inténtalo de nuevo.';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        title = 'Permiso de Ubicación Denegado';
        text = 'Para usar esta función, por favor, habilita la ubicación en tu dispositivo y recarga la página.';
        break;
      case error.POSITION_UNAVAILABLE:
        title = 'Ubicación no Disponible';
        text = 'No pudimos detectar tu ubicación actual. Asegúrate de tener una buena conexión a internet o señal GPS.';
        break;
      case error.TIMEOUT:
        title = 'Tiempo de Espera Agotado';
        text = 'La solicitud para obtener tu ubicación tardó demasiado.';
        break;
      default:
        text = `Ocurrió un error inesperado al obtener la ubicación: ${error.message}`;
        break;
    }
    Swal.fire({ icon: 'error', title: title, text: text });
  };

// Este useEffect se activa cuando se recibe la señal de desvío
useEffect(() => {
  // Solo actúa si la señal está activa y tenemos la ubicación del usuario
  if (deviationSignal && userLocation) {

    // La lógica del cooldown se mueve aquí, donde realmente se ejecuta la acción
    const now = Date.now();
    if (now - lastRerouteTimestampRef.current < 10000) {
      console.log("Re-cálculo en cooldown. Ignorando señal de desvío.");
    } else {
      lastRerouteTimestampRef.current = now;

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Te has desviado, recalculando ruta...',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
      });

      // Aquí es donde finalmente actualizamos el estado para recalcular
      setRutaFrom(userLocation);
    }

    // MUY IMPORTANTE: Reseteamos la señal para que este efecto no se ejecute de nuevo
    // hasta que el hijo la vuelva a enviar.
    setDeviationSignal(false);
  }
}, [deviationSignal, userLocation]); // Se ejecuta cuando cambia la señal o la ubicación

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/comunas`).then(res => setComunas(res.data.map(c => c.nombre))).catch(err => console.error('Error al cargar comunas:', err));
    axios.get(`${API_BASE_URL}/api/defibriladores`).then(res => setDesfibriladores(res.data)).catch(err => Swal.fire('Error', 'No se pudieron cargar los desfibriladores.', 'error'));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      Swal.fire('Error', 'La geolocalización no es soportada por este navegador.', 'error');
      setIsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        if (isLoading) {
          setCenter(coords);
          setIsLoading(false);
        }
      },
      handleLocationError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [isLoading]);

useEffect(() => {
  if (calculatedPosition) {
    setDisplayedUserPosition(calculatedPosition);
  }
}, [calculatedPosition]);

useEffect(() => {
  // Si no hay una ruta de destino activa, la posición visual es la real.
  if (!destinoRuta) {
    setDisplayedUserPosition(userLocation);
  }
}, [userLocation, destinoRuta]); // Se ejecuta si cambia la ubicación o si se inicia/detiene una ruta.

  useEffect(() => {
    if (userLocation && desfibriladores.length > 0) {
      const getDistance = (lat1, lon1, lat2, lon2) => {
        const toRad = (value) => (value * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };
      const cercanosCalculados = desfibriladores.map(dea => ({...dea, distancia: getDistance(userLocation[0], userLocation[1], parseFloat(dea.lat), parseFloat(dea.lng))})).sort((a, b) => a.distancia - b.distancia).slice(0, 10);
      setCercanos(cercanosCalculados);
    }
  }, [userLocation, desfibriladores]);

  useEffect(() => {
  // Si no hay un destino de ruta, no hacemos nada.
  if (!destinoRuta) {
    return;
  }

  const handlePositionChange = (position) => {
    const nuevaUbicacion = [position.coords.latitude, position.coords.longitude];
    setUserLocation(nuevaUbicacion);

setRouteData(currentRouteData => {
  setCurrentStepIndex(currentStep => {
    if (currentRouteData.instructions?.length > 0 && currentStep < currentRouteData.instructions.length) {
      const currentInstruction = currentRouteData.instructions[currentStep];
      if (currentInstruction.instruction.toLowerCase().includes("llegado")) return currentStep;

      const isLastStep = currentStep === currentRouteData.instructions.length - 1;
      let targetCoords = isLastStep ? destinoRuta : null;

      if (!isLastStep) {
        const nextStep = currentRouteData.instructions[currentStep + 1];
        const nextTurnPointIndex = nextStep.way_points[0];
        if (currentRouteData.coords?.length > nextTurnPointIndex) {
          const nextTurnCoords = currentRouteData.coords[nextTurnPointIndex];
          targetCoords = [nextTurnCoords[1], nextTurnCoords[0]];
        }
      }

      if (targetCoords) {
        const distanceToTarget = getDistanceInMeters(nuevaUbicacion[0], nuevaUbicacion[1], targetCoords[0], targetCoords[1]);
        const triggerDistance = isLastStep ? 25 : 45;
        // Solo hablar si estamos suficientemente cerca y no hemos avanzado el paso
        if (distanceToTarget < triggerDistance) {
          speak(currentInstruction.instruction);
          // Avanza el paso inmediatamente para evitar repeticiones
          return currentStep + 1;
        }
      }
    }
    return currentStep;
  });
  return currentRouteData;
});

    if (getDistanceInMeters(nuevaUbicacion[0], nuevaUbicacion[1], destinoRuta[0], destinoRuta[1]) < 10) {
        speak('Ha llegado a su destino.');
        Swal.fire('¡Has llegado!', 'Has llegado a tu destino.', 'success').then(() => {
          detenerNavegacion();
        });
    }
  };

  console.log("useEffect de navegación activado. Iniciando watchPosition.");
  const id = navigator.geolocation.watchPosition(
    handlePositionChange, 
    (err) => console.error("Error en watchPosition:", err), 
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
  );
  watchIdRef.current = id;

  return () => {
    if (watchIdRef.current) {
      console.log(`useEffect cleanup. Limpiando watchId: ${watchIdRef.current}`);
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

}, [destinoRuta]);

  // <-- FUNCIÓN MODIFICADA para limpiar todos los estados de navegación
const detenerNavegacion = useCallback(() => {
    if (watchIdRef.current) {
        console.log(`Limpiando watchId existente: ${watchIdRef.current}`);
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
    }
    
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    setDestinoRuta(null);
    setRutaFrom(null);
    setSelectedDeaId(null);
    setRouteData({ coords: [], instructions: [] });
    setCurrentStepIndex(0);

    setUserLocation(currentUserLocation => {
        setDisplayedUserPosition(currentUserLocation);
        return currentUserLocation;
    });
}, []);

const iniciarNavegacion = (dea) => {
    const destino = [parseFloat(dea.lat), parseFloat(dea.lng)];
    if (!userLocation) {
        return Swal.fire('Error', 'No se puede iniciar la ruta sin tu ubicación.', 'error');
    }

    detenerNavegacion();

    Swal.fire({
        title: '¿Iniciar navegación?',
        text: `Se trazará la ruta hacia ${dea.nombre}.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, iniciar',
        cancelButtonText: 'Cancelar',
    }).then((result) => {
        if (result.isConfirmed) {
            unlockSpeechSynthesis();
            
            setRutaFrom(userLocation);
            setSelectedDeaId(dea.id);
            setDestinoRuta(destino); 
        }
    });
};


  const handleShowModal = () => {
    setShowModal(true);
    setErrors({});
    setTermsAccepted(false);
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setShowModal(false);
      setFormData({
        nombre: '', calle: '', numero: '', comuna: '', lat: '', lng: '', solicitante: '', rut: '', email: '', termsAccepted: false
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
      setErrors(prev => ({ ...prev, terms: null }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'numero') finalValue = value.replace(/[^0-9]/g, '');
    else if (name === 'nombre' || name === 'calle') finalValue = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, '');
    else if (name === 'solicitante') finalValue = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z\s]/g, '');
    setFormData(prev => ({...prev, [name]: finalValue}));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
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
    let errorComuna = isRequired(comuna) || (!comunas.includes(comuna) && 'La comuna seleccionada no existe.');
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

const onPositionUpdateCallback = useCallback((pos) => {
  setCalculatedPosition(pos);
}, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setComunaNoExiste(false);
    const formErrors = validate();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      if (formErrors.comuna && formErrors.comuna.includes('existe')) setComunaNoExiste(true);
      Swal.fire({ icon: 'error', title: 'Hay errores en el formulario', text: 'Por favor, corrige los campos marcados en rojo.' });
      return;
    }
    setIsSubmitting(true);
    const { nombre, calle, numero, comuna, lat, lng, solicitante, rut, email } = formData;
    const dataParaEnviar = { nombre, gl_instalacion_calle: calle, nr_instalacion_numero: numero, gl_instalacion_comuna: comuna, lat, lng, solicitante, rut, email, terms_accepted: termsAccepted };
    try {
      await axios.post(`${API_BASE_URL}/api/solicitudes-dea`, dataParaEnviar);
      Swal.fire({ title: 'Sugerencia Enviada', text: '¡Gracias por colaborar! Tu sugerencia ha sido enviada para revisión.', icon: 'success' });
      handleCloseModal();
    } catch (err) {
      const errorMsg = err.response?.data?.mensaje || 'Error al enviar la solicitud. Intente más tarde.';
      Swal.fire('Error', errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
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
            {isLoading ? (
              <div className="d-flex justify-content-center align-items-center h-100 bg-light">
                <div className="spinner-border text-primary" role="status"><span className="sr-only">Cargando...</span></div>
                <p className="ml-3 mb-0">Obteniendo tu ubicación...</p>
              </div>
            ) : (
              <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                <CenterMap position={center} />
                <ClickHandler setFormData={setFormData} setShowModal={setShowModal} />
                {displayedUserPosition && ( 
                  <Marker position={displayedUserPosition} icon={userIcon} ref={userMarkerRef}>
                    <Popup><h1 style={{ fontSize: '1.5rem', margin: 0 }}>Estás aquí</h1></Popup>
                  </Marker>
                )}
                {cercanos.map((d) => (
                  <Marker key={d.id} position={[parseFloat(d.lat), parseFloat(d.lng)]} icon={customIcon} ref={(ref) => (markersRef.current[d.id] = ref)}>
                    <Popup>
                      <b>{d.nombre}</b><br />{d.direccion}
                      {userLocation && (
                        <Button size="sm" variant="primary" className="mt-2" onClick={() => iniciarNavegacion(d)}>
                          Ver Ruta
                        </Button>
                      )}
                    </Popup>
                  </Marker>
                ))}
                  {rutaFrom && destinoRuta && (
                    <ORSRouting 
                      from={rutaFrom} 
                      to={destinoRuta} 
                      userPosition={userLocation}
                      onRouteFound={onRouteFoundCallback} 
                      onPositionUpdate={onPositionUpdateCallback}
                      onDeviation={onDeviationCallback} 
                    />
                  )}
              </MapContainer>
            )}
            {!isLoading && <>
              <button onClick={handleShowModal} className="btn btn-success" style={{ ...mapButtonStyle, top: 10, right: 10 }}>
                <i className="fas fa-plus mr-1"></i> Sugerir Nuevo DEA
              </button>
              <button onClick={() => { if (userLocation) { setCenter([...userLocation]); userMarkerRef.current?.openPopup(); } else { handleLocationError({ code: -1, message: 'Intento de centrar sin ubicación disponible.' }); } }} className="btn btn-info" style={{ ...mapButtonStyle, top: 60, right: 10 }}>
                Mi Ubicación
              </button>
              {destinoRuta && (
                <button onClick={detenerNavegacion} className="btn btn-danger" style={{ ...mapButtonStyle, top: 110, right: 10 }}>
                  Detener Ruta
                </button>
              )}
            </>}
          </div>
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8 mb-4">
              <h4 className="mb-3 text-center">DEAs más cercanos</h4>
              {isLoading ? ( <p className="text-muted text-center">Obteniendo tu ubicación...</p> ) : cercanos.length > 0 ? (
                <ul className="list-group">
                  {cercanos.map((d) => (
                    <li key={d.id} className={`list-group-item d-flex justify-content-between align-items-center ${selectedDeaId === d.id ? 'active' : ''}`}>
                      <button className="btn btn-link p-0 text-left w-100" style={{ color: selectedDeaId === d.id ? '#fff' : '#007bff', textDecoration: 'none' }} onClick={() => iniciarNavegacion(d)}>
                        <strong>{d.nombre}</strong> - {d.direccion || 'Dirección no disponible'}
                        <span className={`float-right ${selectedDeaId === d.id ? 'text-white-50' : 'text-muted'}`}>
                          {typeof d.distancia === 'number' && !isNaN(d.distancia) ? `(${d.distancia.toFixed(2)} km)` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : ( <p className="text-muted text-center">No hay DEAs registrados cerca.</p> )}
            </div>
          </div>
          <Modal show={showModal} onHide={handleCloseModal} centered>
            <Modal.Header closeButton><Modal.Title>Sugerir nuevo DEA</Modal.Title></Modal.Header>
            <Form onSubmit={handleSubmit} noValidate>
              <Modal.Body>
                <Form.Group controlId="formNombre">
                  <Form.Label>Nombre del lugar*</Form.Label>
                  <Form.Control type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required disabled={isSubmitting} maxLength={58} isInvalid={!!errors.nombre} />
                  <Form.Text muted>Solo letras, números y espacios. Sin tildes ni símbolos.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.nombre}</Form.Control.Feedback>
                </Form.Group>
                <h5 className="mt-4 mb-2">Dirección de Instalación</h5>
                <Form.Group controlId="formCalle">
                  <Form.Label>Calle*</Form.Label>
                  <Form.Control type="text" name="calle" value={formData.calle} onChange={handleInputChange} required disabled={isSubmitting} maxLength={45} isInvalid={!!errors.calle} />
                  <Form.Text muted>Solo letras, números y espacios. Sin tildes ni símbolos.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.calle}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="formNumero" className="mt-3">
                  <Form.Label>Número</Form.Label>
                  <Form.Control type="text" inputMode="numeric" name="numero" value={formData.numero} onChange={handleInputChange} disabled={isSubmitting} maxLength={10} isInvalid={!!errors.numero} />
                  <Form.Text muted>Solo números. Dejar en blanco si no aplica.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.numero}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="formComuna" className="mt-3">
                  <Form.Label>Comuna*</Form.Label>
                  <Select name="comuna" options={comunas.map(c => ({ value: c, label: c }))} value={formData.comuna ? { value: formData.comuna, label: formData.comuna } : null}
                    onChange={option => { setFormData(prev => ({ ...prev, comuna: option ? option.value : '' })); setComunaNoExiste(false); if (errors.comuna) setErrors(prev => ({ ...prev, comuna: null })); }}
                    isClearable isSearchable placeholder="Busca o selecciona una comuna" isDisabled={isSubmitting} noOptionsMessage={() => "No se encontró la comuna"}
                    styles={{ control: base => ({ ...base, borderColor: errors.comuna ? '#dc3545' : '#ced4da', '&:hover': { borderColor: errors.comuna ? '#dc3545' : '#80bdff' } }) }} />
                  {errors.comuna && <div className="text-danger mt-1" style={{ fontSize: '0.875em' }}>{errors.comuna}</div>}
                </Form.Group>
                {comunaNoExiste && <div className="alert alert-warning mt-2 p-2">La comuna ingresada no existe en nuestra base de datos. Por favor, <a href="/contacto">contáctanos</a> para agregarla.</div>}
                <h5 className="mt-4 mb-2">Coordenadas Geográficas</h5>
                <Form.Group controlId="formLatitud">
                  <Form.Label>Latitud*</Form.Label>
                  <Form.Control type="number" step="any" name="lat" value={formData.lat} onChange={handleInputChange} required disabled={isSubmitting} isInvalid={!!errors.lat} />
                  <Form.Text muted>Se rellena automáticamente al hacer clic en el mapa.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.lat}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="formLongitud" className="mt-3">
                  <Form.Label>Longitud*</Form.Label>
                  <Form.Control type="number" step="any" name="lng" value={formData.lng} onChange={handleInputChange} required disabled={isSubmitting} isInvalid={!!errors.lng} />
                  <Form.Text muted>Se rellena automáticamente al hacer clic en el mapa.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.lng}</Form.Control.Feedback>
                </Form.Group>
                <h5 className="mt-4 mb-2">Información del Solicitante</h5>
                <Form.Group controlId="formSolicitante">
                  <Form.Label>Nombre del Solicitante*</Form.Label>
                  <Form.Control type="text" name="solicitante" value={formData.solicitante} onChange={handleInputChange} required disabled={isSubmitting} maxLength={50} isInvalid={!!errors.solicitante} />
                  <Form.Text muted>Solo letras y espacios. Sin tildes, números o símbolos.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.solicitante}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="formRut" className="mt-3">
                  <Form.Label>RUT del Solicitante*</Form.Label>
                  <Form.Control type="text" name="rut" value={formData.rut} onChange={handleInputChange} required disabled={isSubmitting} isInvalid={!!errors.rut} />
                  <Form.Text muted>Ingresar sin puntos y con guion.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.rut}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="formEmail" className="mt-3">
                  <Form.Label>Correo electrónico*</Form.Label>
                  <Form.Control type="email" name="email" value={formData.email || ''} onChange={handleInputChange} required disabled={isSubmitting} isInvalid={!!errors.email} />
                  <Form.Text muted>Ingresa tu correo para recibir notificaciones sobre tu solicitud.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mt-3">
                  <Form.Check type="checkbox" label={<>Acepto los <span style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleShowTermsModal}>términos y condiciones</span>*</>} checked={termsAccepted} onChange={handleTermsChange} disabled={isSubmitting} isInvalid={!!errors.terms} feedback={errors.terms} feedbackType="invalid" />
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
              <h5>1. Aceptación de los Términos</h5>
              <p>Al utilizar el formulario para sugerir Desfibriladores Externos Automáticos (DEA) en la aplicación CardioUCM, usted ("el Usuario") acepta y se compromete a cumplir los siguientes términos y condiciones. Este servicio es proporcionado por la Universidad Católica del Maule ("UCM") en el marco de su proyecto de vinculación con el medio.</p>
              <h5>2. Objetivo del Servicio</h5>
              <p>El propósito de este formulario es permitir a la comunidad sugerir la ubicación de DEAs para enriquecer la base de datos pública y gratuita de CardioUCM, con el fin de facilitar el acceso rápido a estos dispositivos en caso de emergencia cardíaca.</p>
              <h5>3. Política de Privacidad y Tratamiento de Datos Personales (Ley N° 19.628)</h5>
              <p>Datos Recopilados: Para validar la veracidad de las sugerencias, solicitamos los siguientes datos personales: Nombre completo, RUT y dirección de correo electrónico.
              Finalidad: Estos datos serán utilizados exclusivamente para: (a) Verificar la identidad del solicitante; (b) Comunicarnos con el Usuario para solicitar aclaraciones sobre la sugerencia; y (c) Notificar al Usuario sobre el estado de aprobación de su sugerencia.
              Confidencialidad y Seguridad: UCM se compromete a tratar sus datos personales con estricta confidencialidad. Sus datos no serán compartidos con terceros para fines comerciales ni serán públicos. Se almacenarán en servidores seguros, aplicando las medidas técnicas y organizativas necesarias para protegerlos contra el acceso no autorizado.
              Derechos ARCO: Como titular de los datos, usted tiene derecho a solicitar el Acceso, Rectificación, Cancelación u Oposición (ARCO) al tratamiento de sus datos. Para ejercer estos derechos, por favor contáctenos a través del correo electrónico cardioucm1@gmail.com.</p>
              <h5>4. Responsabilidad del Usuario</h5>
              <p>El Usuario es el único responsable de la veracidad y exactitud de la información proporcionada. La entrega de información falsa o inexacta puede llevar al rechazo de la sugerencia. El Usuario declara que tiene la autorización necesaria para compartir la información de la ubicación del DEA.</p>
              <h5>5. Proceso de Validación y Limitación de Responsabilidad</h5>
              <p>Todas las sugerencias recibidas serán sometidas a un proceso de validación por parte del equipo de CardioUCM. La UCM no garantiza la aprobación de todas las sugerencias enviadas. La decisión final de incluir un DEA en el mapa es discrecional. CardioUCM es una herramienta informativa y de ayuda; la UCM no se hace responsable del estado, funcionamiento o disponibilidad real de los DEAs mostrados en el mapa.</p>
              <h5>6. Propiedad Intelectual</h5>
              <p>La aplicación CardioUCM, su logo, diseño y contenido son propiedad de la Universidad Católica del Maule.</p>
              <h5>7. Ley Aplicable y Resolución de Conflictos</h5>
              <p>Este acuerdo se rige por las leyes de la República de Chile.</p>
              <h5>8. Contacto</h5>
              <p>Para consultas, contáctanos en <a href="mailto:cardioucm1@gmail.com">cardioucm1@gmail.com</a>.</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseTermsModal}>Cerrar</Button>
            </Modal.Footer>
          </Modal>
        </div>
      </section>
    </div>
  );
};

export default UbicacionDEA;