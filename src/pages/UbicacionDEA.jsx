import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';

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
  const [formError, setFormError] = useState('');
  const initialCenter = useRef([-35.428542, -71.672308]);
  const [center, setCenter] = useState(initialCenter.current);
  const [userLocation, setUserLocation] = useState(null);
  const markersRef = useRef({});
  const [cercanos, setCercanos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userMarkerRef = useRef(null);

  // Cargar DEAs
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

  // Obtener ubicación del usuario
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = [position.coords.latitude, position.coords.longitude];
          setUserLocation(userPos);
          // El popup se manejará en el Marker
          if (center[0] === initialCenter.current[0] && center[1] === initialCenter.current[1]) {
            setCenter(userPos);
          }
        },
        (error) => {
          console.error('Error obteniendo ubicación del usuario:', error);
          Swal.fire('Error', 'No se pudo obtener tu ubicación.', 'error');
        }
      );
    }
  }, []);

  // Calcular DEAs cercanos
  useEffect(() => {
    if (userLocation && desfibriladores.length > 0) {
      setCercanos(getClosestDEA(desfibriladores, userLocation));
    } else {
      setCercanos([]);
    }
  }, [userLocation, desfibriladores]);

  const getClosestDEA = (allDeas, currentUserLocation) => {
    if (!currentUserLocation || allDeas.length === 0) {
      return [];
    }
    return [...allDeas]
      .map((dea) => {
        const lat = parseFloat(dea.lat);
        const lng = parseFloat(dea.lng);
        if (isNaN(lat) || isNaN(lng)) {
          return { ...dea, distancia: Infinity };
        }
        return {
          ...dea,
          distancia: getDistance(currentUserLocation[0], currentUserLocation[1], lat, lng),
        };
      })
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, 10);
  };

  const handleShowModal = () => {
    setShowModal(true);
    setFormError('');
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setShowModal(false);
      setFormData({
        nombre: '',
        calle: '',
        numero: '',
        comuna: '',
        lat: '',
        lng: '',
        solicitante: '',
        rut: '',
      });
      setFormError('');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const { nombre, calle, numero, comuna, lat, lng, solicitante, rut } = formData;

    if (!nombre || !calle || !comuna || !lat || !lng || !solicitante || !rut) {
      setFormError('Todos los campos obligatorios deben ser completados.');
      return;
    }

    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      setFormError('Las coordenadas deben ser valores numéricos válidos.');
      return;
    }

    setIsSubmitting(true);
    const dataParaEnviar = {
      nombre,
      gl_instalacion_calle: calle,
      nr_instalacion_numero: numero,
      gl_instalacion_comuna: comuna,
      lat,
      lng,
      solicitante,
      rut,
    };

    try {
      await axios.post('http://localhost:3001/solicitudes-dea', dataParaEnviar);
      Swal.fire({
        title: 'Sugerencia aceptada',
        text: 'Revise constantemente para saber el estado de su solicitud, también puede contactarnos en el apartado contáctanos.',
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

  const focusMarker = (id, lat, lng) => {
    setCenter([parseFloat(lat), parseFloat(lng)]);
    setTimeout(() => {
      markersRef.current[id]?.openPopup();
    }, 300);
  };

  const mapButtonStyle = {
    position: 'absolute',
    zIndex: 1000,
    border: 'none',
    borderRadius: '5px',
    padding: '10px 15px',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    fontSize: '14px',
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Mapa de Desfibriladores</h3>

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
              </Popup>
            </Marker>
          ))}
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
      </div>

      <div className="card shadow-sm">
        <div className="card-header">
          <h3 className="card-title">10 Desfibriladores Activos más Cercanos</h3>
        </div>
        <div className="card-body">
          {cercanos.length > 0 ? (
            <ul className="list-group">
              {cercanos.map((d) => (
                <li key={d.id} className="list-group-item">
                  <button
                    onClick={() => focusMarker(d.id, d.lat, d.lng)}
                    className="btn btn-link p-0 text-left w-100"
                    style={{ color: '#007bff', textDecoration: 'none' }}
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

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Sugerir Nuevo DEA</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {formError && (
              <div className="alert alert-danger p-2 mb-3" role="alert">
                {formError}
              </div>
            )}
            <Form.Group controlId="formNombre" className="mb-3">
              <Form.Label>Nombre del Lugar</Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Centro Comercial XYZ"
                required
                disabled={isSubmitting}
              />
            </Form.Group>
            <h5 className="mt-4 mb-3">Dirección de Instalación</h5>
            <Form.Group controlId="formCalle" className="mb-3">
              <Form.Label>Calle</Form.Label>
              <Form.Control
                type="text"
                name="calle"
                value={formData.calle}
                onChange={handleChange}
                placeholder="Ej: Av. Siempre Viva"
                required
                disabled={isSubmitting}
              />
            </Form.Group>
            <Form.Group controlId="formNumero" className="mb-3">
              <Form.Label>Número</Form.Label>
              <Form.Control
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                placeholder="Ej: 742 (opcional si no aplica)"
                disabled={isSubmitting}
              />
            </Form.Group>
            <Form.Group controlId="formComuna" className="mb-3">
              <Form.Label>Comuna</Form.Label>
              <Form.Control
                type="text"
                name="comuna"
                value={formData.comuna}
                onChange={handleChange}
                placeholder="Ej: Springfield"
                required
                disabled={isSubmitting}
              />
            </Form.Group>
            <h5 className="mt-4 mb-3">Coordenadas Geográficas (Clic en mapa para auto-rellenar)</h5>
            <Form.Group controlId="formLatitud" className="mb-3">
              <Form.Label>Latitud</Form.Label>
              <Form.Control
                type="number"
                step="any"
                name="lat"
                value={formData.lat}
                onChange={handleChange}
                placeholder="Ej: -35.123456"
                required
                disabled={isSubmitting}
              />
            </Form.Group>
            <Form.Group controlId="formLongitud" className="mb-3">
              <Form.Label>Longitud</Form.Label>
              <Form.Control
                type="number"
                step="any"
                name="lng"
                value={formData.lng}
                onChange={handleChange}
                placeholder="Ej: -71.123456"
                required
                disabled={isSubmitting}
              />
            </Form.Group>
            <h5 className="mt-4 mb-3">Información del Solicitante</h5>
            <Form.Group controlId="formSolicitante" className="mb-3">
              <Form.Label>Nombre del Solicitante</Form.Label>
              <Form.Control
                type="text"
                name="solicitante"
                value={formData.solicitante}
                onChange={handleChange}
                placeholder="Nombre completo"
                required
                disabled={isSubmitting}
              />
            </Form.Group>
            <Form.Group controlId="formRut" className="mb-3">
              <Form.Label>RUT del Solicitante</Form.Label>
              <Form.Control
                type="text"
                name="rut"
                value={formData.rut}
                onChange={handleChange}
                placeholder="Ej: 12345678-9"
                required
                disabled={isSubmitting}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default UbicacionDEA;