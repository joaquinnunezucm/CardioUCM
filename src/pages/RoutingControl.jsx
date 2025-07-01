import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useMap, Polyline } from 'react-leaflet';

// Función de utilidad para calcular la distancia Haversine (en metros)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * [FUNCIÓN MEJORADA Y UNIFICADA]
 * Encuentra el punto más cercano en la polilínea, calcula la distancia a ese punto,
 * y divide la ruta en tramos "recorrido" y "restante".
 * @param {object} userCoords - Coordenadas del usuario { lat, lng }.
 * @param {Array<object>} polylineCoords - Array de coordenadas de la ruta.
 * @returns {{traveled: Array, remaining: Array, distanceToRoute: number}}
 */
const processRoute = (userCoords, polylineCoords) => {
  // **GUARDIA DEFENSIVA PRINCIPAL**: Si no tenemos la ubicación del usuario o la ruta, no hacemos nada.
  if (!userCoords || !polylineCoords || polylineCoords.length < 2) {
    return { traveled: [], remaining: polylineCoords || [], distanceToRoute: Infinity };
  }

  let closestPoint = null;
  let minDistance = Infinity;
  let segmentIndex = -1;

  for (let i = 0; i < polylineCoords.length - 1; i++) {
    const start = polylineCoords[i];
    const end = polylineCoords[i + 1];

    // **GUARDIA DEFENSIVA**: Asegurarse de que los puntos del segmento son válidos.
    if (!start || !end) continue;

    // Proyección del punto sobre el segmento (usando aproximación plana, eficiente y suficiente)
    const dx = end.lat - start.lat;
    const dy = end.lng - start.lng;
    const l2 = dx * dx + dy * dy; // Squared Euclidean distance

    let projection;
    if (l2 === 0) {
      projection = start;
    } else {
      let t = ((userCoords.lat - start.lat) * dx + (userCoords.lng - start.lng) * dy) / l2;
      t = Math.max(0, Math.min(1, t)); // Clamp t to the segment
      projection = {
        lat: start.lat + t * dx,
        lng: start.lng + t * dy,
      };
    }
    
    const distance = getDistance(userCoords.lat, userCoords.lng, projection.lat, projection.lng);

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = projection;
      segmentIndex = i;
    }
  }
  
  if (segmentIndex === -1) {
    // Si algo falló, devolvemos la ruta completa como "restante".
    return { traveled: [], remaining: polylineCoords, distanceToRoute: minDistance };
  }
  
  // Construir la ruta restante a partir del punto más cercano.
  const remaining = [closestPoint, ...polylineCoords.slice(segmentIndex + 1)];

  return { traveled: [], remaining, distanceToRoute: minDistance };
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

  // Efecto para crear y calcular la ruta inicial
  useEffect(() => {
    if (!map || !from || !to) return;
    
    if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
    }
    
    proximoPasoIndex.current = 0;
    avisosDados.current.clear();
    hasArrivedRef.current = false;
    instruccionesRef.current = [];
    setRouteCoordinates([]);

    const control = L.Routing.control({
      waypoints: [L.latLng(from), L.latLng(to)],
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

  // Lógica de renderizado y efectos de navegación
  const { remaining, distanceToRoute } = processRoute(
    userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null,
    routeCoordinates
  );

  // Efecto para la guía por voz y recalculo
  useEffect(() => {
    if (!vozActiva || !userLocation || routeCoordinates.length === 0 || hasArrivedRef.current) {
      return;
    }

    // Lógica de desvío usando la distancia calculada por processRoute
    if (distanceToRoute > 50) { // 50 metros de desvío
        if (routingControlRef.current) {
            routingControlRef.current.setWaypoints([
                L.latLng(userLocation[0], userLocation[1]),
                routingControlRef.current.getWaypoints()[1].latLng
            ]);
            hablar('Te has desviado. Recalculando ruta...');
        }
        return;
    }

    // Lógica de navegación por voz
    const instrucciones = instruccionesRef.current;
    const DISTANCIA_AVISO_PREPARACION = 100;
    const DISTANCIA_AVISO_EJECUCION = 25;
    
    let pasoActual = instrucciones[proximoPasoIndex.current];
    if (!pasoActual) return;
    
    const distanciaAlPaso = getDistance(userLocation[0], userLocation[1], pasoActual.latLng.lat, pasoActual.latLng.lng);
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

    // Lógica de llegada
    if (proximoPasoIndex.current >= instrucciones.length && !hasArrivedRef.current) {
        hablar('Has llegado a tu destino.');
        hasArrivedRef.current = true;
        if (onRouteFinished) onRouteFinished();
    }

  }, [userLocation, vozActiva, routeCoordinates, onRouteFinished, distanceToRoute]);


  if (remaining.length === 0) {
    return null;
  }

  return (
    <>
      <Polyline positions={remaining} pathOptions={{ color: '#007bff', weight: 6, opacity: 0.8 }} />
    </>
  );
};

export default RoutingControl;