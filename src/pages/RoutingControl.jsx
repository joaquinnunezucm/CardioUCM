import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useMap, Polyline } from 'react-leaflet';

/**
 * Función de utilidad para calcular la distancia Haversine entre dos puntos.
 * @returns {number} Distancia en metros.
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Función de utilidad para calcular la distancia mínima desde un punto a un segmento de línea.
 * Usado para detectar si el usuario se ha desviado de la ruta.
 * @returns {number} Distancia en metros.
 */
function distanceToSegment(p, a, b) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const lat1 = toRad(a.lat), lon1 = toRad(a.lng);
    const lat2 = toRad(b.lat), lon2 = toRad(b.lng);
    const lat3 = toRad(p[0]), lon3 = toRad(p[1]);
  
    const R = 6371000;
    const x1 = R * Math.cos(lat1) * Math.cos(lon1), y1 = R * Math.cos(lat1) * Math.sin(lon1), z1 = R * Math.sin(lat1);
    const x2 = R * Math.cos(lat2) * Math.cos(lon2), y2 = R * Math.cos(lat2) * Math.sin(lon2), z2 = R * Math.sin(lat2);
    const x3 = R * Math.cos(lat3) * Math.cos(lon3), y3 = R * Math.cos(lat3) * Math.sin(lon3), z3 = R * Math.sin(lat3);
  
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
    const l2 = dx*dx + dy*dy + dz*dz;
    if (l2 === 0) return getDistance(p[0], p[1], a.lat, a.lng);
    
    let t = ((x3 - x1) * dx + (y3 - y1) * dy + (z3 - z1) * dz) / l2;
    t = Math.max(0, Math.min(1, t));

    const xClosest = x1 + t * dx, yClosest = y1 + t * dy, zClosest = z1 + t * dz;
    return Math.sqrt((x3 - xClosest)**2 + (y3 - yClosest)**2 + (z3 - zClosest)**2);
}

/**
 * Encuentra el punto más cercano en una polilínea a la ubicación del usuario
 * y divide la ruta en dos: el tramo ya recorrido y el tramo restante.
 * @param {object} userCoords - Coordenadas del usuario { lat, lng }.
 * @param {Array<object>} polylineCoords - Array de coordenadas de la ruta.
 * @returns {{traveled: Array<object>, remaining: Array<object>}}
 */
const findClosestPointOnPolyline = (userCoords, polylineCoords) => {
  let closestPoint = null;
  let minDistance = Infinity;
  let segmentIndex = -1;

  if (!userCoords || !polylineCoords || polylineCoords.length < 2) {
    return { traveled: [], remaining: polylineCoords || [] };
  }

  for (let i = 0; i < polylineCoords.length - 1; i++) {
    const start = polylineCoords[i];
    const end = polylineCoords[i + 1];
    
    // Proyección del punto sobre el segmento
    const l2 = (getDistance(start.lat, start.lng, end.lat, end.lng) / 1000) ** 2;
    if (l2 === 0) continue;
    
    let t = ((userCoords.lat - start.lat) * (end.lat - start.lat) + (userCoords.lng - start.lng) * (end.lng - start.lng)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projection = {
      lat: start.lat + t * (end.lat - start.lat),
      lng: start.lng + t * (end.lng - start.lng),
    };

    const distance = getDistance(userCoords.lat, userCoords.lng, projection.lat, projection.lng);

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = projection;
      segmentIndex = i;
    }
  }

  if (segmentIndex === -1) {
    return { traveled: [], remaining: polylineCoords };
  }

  // La ruta restante comienza en el punto más cercano y continúa hasta el final.
  const remaining = [closestPoint, ...polylineCoords.slice(segmentIndex + 1)];

  // Aunque no la dibujaremos, la calculamos para que la lógica sea completa.
  const traveled = polylineCoords.slice(0, segmentIndex + 1);
  traveled.push(closestPoint);

  return { traveled, remaining };
};

const RoutingControl = ({ from, to, userLocation, vozActiva, onRouteFinished }) => {
  const map = useMap();
  const routingControlRef = useRef(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  
  const proximoPasoIndex = useRef(0);
  const avisosDados = useRef(new Set());
  const hasArrivedRef = useRef(false);
  const instruccionesRef = useRef([]);

  const hablar = (texto) => {
    if (!vozActiva || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = 'es-ES';
    utter.rate = 1.1;
    window.speechSynthesis.cancel();
    setTimeout(() => window.speechSynthesis.speak(utter), 100);
  };

  // EFECTO 1: Crear y calcular la ruta inicial.
  useEffect(() => {
    if (!map || !from || !to) return;
    
    // Reiniciar estado para una nueva ruta
    proximoPasoIndex.current = 0;
    avisosDados.current.clear();
    hasArrivedRef.current = false;
    instruccionesRef.current = [];
    setRouteCoordinates([]);

    const control = L.Routing.control({
      waypoints: [L.latLng(from), L.latLng(to)],
      // Ocultamos la UI por defecto de la librería para dibujarla nosotros mismos
      createMarker: () => null,
      show: false,
      addWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: true,
      language: 'es',
    }).addTo(map);

    routingControlRef.current = control;

    control.on('routesfound', (e) => {
      if (e.routes && e.routes.length > 0) {
        setRouteCoordinates(e.routes[0].coordinates);
        instruccionesRef.current = e.routes[0].instructions;
        const primerPaso = instruccionesRef.current[0];
        if (primerPaso) {
          hablar(`Iniciando ruta. La primera indicación es: ${primerPaso.text}.`);
        }
      }
    });

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [map, from, to]);

  // EFECTO 2: Guía por voz y lógica de recalculo, basado en la ubicación del usuario.
  useEffect(() => {
    if (!vozActiva || !userLocation || routeCoordinates.length === 0 || hasArrivedRef.current) {
      return;
    }

    const [latitude, longitude] = userLocation;
    const instrucciones = instruccionesRef.current;
    
    // Lógica de desvío: si el usuario se aleja más de 50m de la ruta, la recalcula.
    if (routeCoordinates.length > 1) {
        let minDist = Infinity;
        for (let i = 0; i < routeCoordinates.length - 1; i++) {
            minDist = Math.min(minDist, distanceToSegment([latitude, longitude], routeCoordinates[i], routeCoordinates[i + 1]));
        }
        if (minDist > 50) {
            if (routingControlRef.current) {
                routingControlRef.current.setWaypoints([
                    L.latLng(latitude, longitude),
                    routingControlRef.current.getWaypoints()[1].latLng
                ]);
                hablar('Te has desviado. Recalculando ruta...');
            }
            return;
        }
    }

    // Lógica de navegación secuencial por voz (avisos y ejecución).
    const DISTANCIA_AVISO_PREPARACION = 100;
    const DISTANCIA_AVISO_EJECUCION = 25;
    
    let pasoActual = instrucciones[proximoPasoIndex.current];
    if (!pasoActual) return;
    
    const distanciaAlPaso = getDistance(latitude, longitude, pasoActual.latLng.lat, pasoActual.latLng.lng);
    const idAvisoPreparacion = `${proximoPasoIndex.current}-prep`;
    const idAvisoEjecucion = `${proximoPasoIndex.current}-ejec`;

    if (distanciaAlPaso <= DISTANCIA_AVISO_PREPARACION && !avisosDados.current.has(idAvisoPreparacion)) {
      hablar(`A ${Math.round(distanciaAlPaso)} metros, ${pasoActual.text.toLowerCase()}`);
      avisosDados.current.add(idAvisoPreparacion);
    }

    if (distanciaAlPaso <= DISTANCIA_AVISO_EJECUCION) {
      if (!avisosDados.current.has(idAvisoEjecucion)) {
        hablar(`Ahora, ${pasoActual.text.toLowerCase()}`);
        avisosDados.current.add(idAvisoEjecucion);
      }
      proximoPasoIndex.current++;
    }

    // Lógica de llegada al destino.
    if (proximoPasoIndex.current >= instrucciones.length && !hasArrivedRef.current) {
        hablar('Has llegado a tu destino.');
        hasArrivedRef.current = true;
        if (onRouteFinished) onRouteFinished();
    }

  }, [userLocation, vozActiva, routeCoordinates, onRouteFinished]);

  // RENDERIZADO: Se calcula la ruta restante y solo se dibuja esa parte.
  const { remaining } = findClosestPointOnPolyline(
    userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null,
    routeCoordinates
  );

  // No renderizamos nada si no hay ruta que mostrar.
  if (remaining.length === 0) {
    return null;
  }

  return (
    <>
      {/* 
        LA MAGIA OCURRE AQUÍ:
        Solo renderizamos la polilínea de la ruta "restante".
        La polilínea "recorrida" se calcula pero nunca se dibuja,
        logrando el efecto de que la ruta desaparece a medida que el usuario avanza.
      */}
      <Polyline positions={remaining} pathOptions={{ color: '#007bff', weight: 6, opacity: 0.8 }} />
    </>
  );
};

export default RoutingControl;