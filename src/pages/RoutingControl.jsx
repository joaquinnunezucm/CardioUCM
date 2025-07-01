import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useMap, Polyline } from 'react-leaflet';

// Función de utilidad para calcular la distancia Haversine (en metros)
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Función para procesar la ruta: robusta y defensiva
const processRoute = (userCoords, polylineCoords) => {
  if (!userCoords || !polylineCoords || polylineCoords.length < 2) {
    return { remaining: polylineCoords || [], distanceToRoute: Infinity };
  }
  let closestPoint = null;
  let minDistance = Infinity;
  let segmentIndex = -1;
  for (let i = 0; i < polylineCoords.length - 1; i++) {
    const start = polylineCoords[i];
    const end = polylineCoords[i + 1];
    if (!start || !end) continue;
    const dx = end.lat - start.lat, dy = end.lng - start.lng;
    const l2 = dx * dx + dy * dy;
    let projection;
    if (l2 === 0) {
      projection = start;
    } else {
      let t = ((userCoords.lat - start.lat) * dx + (userCoords.lng - start.lng) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      projection = { lat: start.lat + t * dx, lng: start.lng + t * dy };
    }
    const distance = getDistance(userCoords.lat, userCoords.lng, projection.lat, projection.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = projection;
      segmentIndex = i;
    }
  }
  if (segmentIndex === -1) {
    return { remaining: polylineCoords, distanceToRoute: minDistance };
  }
  const remaining = [closestPoint, ...polylineCoords.slice(segmentIndex + 1)];
  return { remaining, distanceToRoute: minDistance };
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

  // EFECTO 1: CREAR Y DESTRUIR el control de forma estable.
  // **SOLUCIÓN 2**: Las dependencias ahora solo son `map` y `to`. El control solo se
  // recrea si el mapa cambia o si el DESTINO FINAL cambia.
  useEffect(() => {
    if (!map || !to) return;
    
    // El punto de partida `from` es dinámico, se usa al crear los waypoints
    const waypoints = from ? [L.latLng(from), L.latLng(to)] : [L.latLng(to)];

    const control = L.Routing.control({
      waypoints,
      createMarker: () => null, show: false, addWaypoints: false,
      routeWhileDragging: false, fitSelectedRoutes: true, language: 'es',
    }).addTo(map);

    routingControlRef.current = control;

    control.on('routesfound', (e) => {
      if (e.routes && e.routes.length > 0) {
        setRouteCoordinates(e.routes[0].coordinates);
        instruccionesRef.current = e.routes[0].instructions;
        proximoPasoIndex.current = 0; // Reiniciar para la nueva ruta
        avisosDados.current.clear();
        
        const primerPaso = instruccionesRef.current[0];
        if (primerPaso && !hasArrivedRef.current) {
          hablar(`Iniciando ruta. La primera indicación es: ${primerPaso.text}.`);
        }
      }
    });

    return () => {
      if (map && routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [map, to]); // Solo depende del mapa y del destino final

  const { remaining, distanceToRoute } = processRoute(
    userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null,
    routeCoordinates
  );

  // EFECTO 2: Guía por voz y RECALCULO DINÁMICO.
  useEffect(() => {
    // Si no hay control, no hay ubicación, o la ruta ya terminó, no hacer nada.
    if (!routingControlRef.current || !userLocation || hasArrivedRef.current) return;
    
    // Lógica de recalculo por desvío
    if (distanceToRoute > 50) {
        // **SOLUCIÓN 1**: Limpiamos la ruta visible inmediatamente para evitar errores.
        setRouteCoordinates([]);
        hablar('Te has desviado. Recalculando ruta...');
        // Actualizamos los waypoints del control existente, sin destruirlo.
        routingControlRef.current.setWaypoints([
            L.latLng(userLocation[0], userLocation[1]),
            L.latLng(to[0], to[1])
        ]);
        return; // Salimos para esperar a que el evento `routesfound` actualice la ruta.
    }

    // Lógica de guía por voz (si está activa)
    if (!vozActiva || routeCoordinates.length === 0) return;
    
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

    if (proximoPasoIndex.current >= instrucciones.length && !hasArrivedRef.current) {
        hablar('Has llegado a tu destino.');
        hasArrivedRef.current = true;
        if (onRouteFinished) onRouteFinished();
    }

  }, [userLocation, vozActiva, onRouteFinished, distanceToRoute, to]);

  if (remaining.length === 0) {
    return null;
  }

  return (
    <Polyline positions={remaining} pathOptions={{ color: '#007bff', weight: 6, opacity: 0.8 }} />
  );
};

export default RoutingControl;