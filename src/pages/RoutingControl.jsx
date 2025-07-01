import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useMap } from 'react-leaflet';

// Función de utilidad para calcular distancia (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // Radio en metros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Calcula la distancia mínima del punto p al segmento [a, b] en metros
function distanceToSegment(p, a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const lat1 = toRad(a[0]), lon1 = toRad(a[1]);
  const lat2 = toRad(b[0]), lon2 = toRad(b[1]);
  const lat3 = toRad(p[0]), lon3 = toRad(p[1]);

  // Convertir a coordenadas cartesianas
  const R = 6371000;
  const x1 = R * Math.cos(lat1) * Math.cos(lon1);
  const y1 = R * Math.cos(lat1) * Math.sin(lon1);
  const z1 = R * Math.sin(lat1);

  const x2 = R * Math.cos(lat2) * Math.cos(lon2);
  const y2 = R * Math.cos(lat2) * Math.sin(lon2);
  const z2 = R * Math.sin(lat2);

  const x3 = R * Math.cos(lat3) * Math.cos(lon3);
  const y3 = R * Math.cos(lat3) * Math.sin(lon3);
  const z3 = R * Math.sin(lat3);

  // Proyección del punto sobre el segmento
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
  const t = ((x3 - x1) * dx + (y3 - y1) * dy + (z3 - z1) * dz) / (dx * dx + dy * dy + dz * dz);
  let xClosest, yClosest, zClosest;
  if (t < 0) {
    xClosest = x1; yClosest = y1; zClosest = z1;
  } else if (t > 1) {
    xClosest = x2; yClosest = y2; zClosest = z2;
  } else {
    xClosest = x1 + t * dx;
    yClosest = y1 + t * dy;
    zClosest = z1 + t * dz;
  }
  // Distancia euclidiana
  const dist = Math.sqrt((x3 - xClosest) ** 2 + (y3 - yClosest) ** 2 + (z3 - zClosest) ** 2);
  return dist;
}

const RoutingControl = ({ from, to, vozActiva, onRouteFinished }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  // --- MEJORAS DE LÓGICA DE NAVEGACIÓN ---
  const proximoPasoIndex = useRef(0); // Puntero para la navegación secuencial
  const avisosDados = useRef(new Set()); // Para controlar los avisos (preparación/ejecución)
  const hasArrivedRef = useRef(false);
  // --- FIN MEJORAS ---
  
  const hablar = (texto) => {
    if (!vozActiva || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = 'es-ES';
    utter.rate = 1.1; // Un poco más rápido para sonar más natural
    window.speechSynthesis.cancel();
    setTimeout(() => window.speechSynthesis.speak(utter), 100);
  };

  // Efecto para crear y destruir el control de la ruta
  useEffect(() => {
    if (!map) return;
    if (!from || !to) {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
      return;
    }
    if (routingControlRef.current) {
      routingControlRef.current.setWaypoints([L.latLng(from), L.latLng(to)]);
      return;
    }
    
    // Reiniciar estado para una nueva ruta
    proximoPasoIndex.current = 0;
    avisosDados.current.clear();
    hasArrivedRef.current = false;

    const control = L.Routing.control({
      waypoints: [L.latLng(from), L.latLng(to)],
      createMarker: () => null, routeWhileDragging: false, addWaypoints: false,
      fitSelectedRoutes: true, show: false, language: 'es',
      lineOptions: { styles: [{ color: '#007bff', weight: 5 }] },
    }).addTo(map);

    control.on('routeselected', (e) => {
      const primerPaso = e.route.instructions[0];
      if (primerPaso) {
        // MEJORA: Instrucción inicial más clara
        hablar(`Iniciando ruta. La primera indicación es: ${primerPaso.text}.`);
      }
    });

    routingControlRef.current = control;

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [map, from, to]);

  // Efecto para la guía por voz y seguimiento en tiempo real
useEffect(() => {
  if (!vozActiva || !routingControlRef.current) return;

  let watchId = null;
  let instrucciones = [];

  const onRoutesFound = (e) => {
    instrucciones = e.routes[0].instructions;
    proximoPasoIndex.current = 0;
    avisosDados.current.clear();
  };
  routingControlRef.current.on('routesfound', onRoutesFound);

  let reintentos = 0;
  const MAX_REINTENTOS = 3;

  function iniciarWatchPosition() {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        reintentos = 0;
        if (instrucciones.length === 0 || hasArrivedRef.current) return;

        const { latitude, longitude } = position.coords;
        map.panTo([latitude, longitude]);
        let minDist = Infinity;
        let routeLine = null;

        // Validación robusta para _routes y coordinates
        if (
          routingControlRef.current &&
          routingControlRef.current._routes &&
          routingControlRef.current._routes[0] &&
          Array.isArray(routingControlRef.current._routes[0].coordinates) &&
          routingControlRef.current._routes[0].coordinates.length > 1
        ) {
          routeLine = routingControlRef.current._routes[0].coordinates;
        }

        if (routeLine) {
          for (let i = 0; i < routeLine.length - 1; i++) {
            const a = routeLine[i];
            const b = routeLine[i + 1];
            if (
              !a || !b ||
              typeof a.lat !== 'number' || typeof a.lng !== 'number' ||
              typeof b.lat !== 'number' || typeof b.lng !== 'number'
            ) continue;
            minDist = Math.min(minDist, distanceToSegment([latitude, longitude], [a.lat, a.lng], [b.lat, b.lng]));
          }

          if (minDist > 50) {
            routingControlRef.current.setWaypoints([
              L.latLng(latitude, longitude),
              routingControlRef.current.getWaypoints()[1].latLng
            ]);
            proximoPasoIndex.current = 0;
            avisosDados.current.clear();
            hasArrivedRef.current = false;
            hablar('Te has desviado de la ruta. Recalculando...');
            return;
          }
        } else {
          console.warn('No se pudo obtener la polilínea de la ruta. Esperando cálculo de ruta...');
          return;
        }
          // --- FIN LÓGICA DE DESVÍO ---

          // --- LÓGICA DE NAVEGACIÓN SECUENCIAL MEJORADA ---
          const DISTANCIA_AVISO_PREPARACION = 100; // metros
          const DISTANCIA_AVISO_EJECUCION = 25;   // metros

          let pasoActual = instrucciones[proximoPasoIndex.current];
          if (!pasoActual) return; // Ruta terminada

          const distanciaAlPaso = getDistance(latitude, longitude, pasoActual.latLng.lat, pasoActual.latLng.lng);
          const idAvisoPreparacion = `${proximoPasoIndex.current}-prep`;
          const idAvisoEjecucion = `${proximoPasoIndex.current}-ejec`;
          const proximoPaso = instrucciones[proximoPasoIndex.current];
        if (!proximoPaso) {
          if (!hasArrivedRef.current) {
            hasArrivedRef.current = true;
            hablar('Has llegado a tu destino');
            onRouteFinished();
          }
          return;
        }
        const distancia = getDistance(latitude, longitude, proximoPaso.latLng.lat, proximoPaso.latLng.lng);
        if (distancia <= 25 && !avisosDados.current.has(proximoPasoIndex.current)) {
          hablar(proximoPaso.text);
          avisosDados.current.add(proximoPasoIndex.current);
          proximoPasoIndex.current++;
        } else if (distancia <= 100 && !avisosDados.current.has(`prep_${proximoPasoIndex.current}`)) {
          let texto = `A 100 metros, ${proximoPaso.text.toLowerCase()}`;
          if (proximoPaso.road) texto += ` en ${proximoPaso.road}`;
          hablar(texto);
          avisosDados.current.add(`prep_${proximoPasoIndex.current}`);
        }
      },
      (error) => {
        if (error.code === error.TIMEOUT && reintentos < MAX_REINTENTOS) {
          reintentos++;
          iniciarWatchPosition();
        } else {
          console.error('Error en watchPosition:', error);
          window.Swal && Swal.fire({
            icon: 'error',
            title: error.code === error.TIMEOUT ? 'Tiempo de Espera Agotado' : 'Error de ubicación',
            text: error.code === error.TIMEOUT
              ? 'La solicitud para obtener tu ubicación tardó demasiado. Por favor, comprueba tu conexión y vuelve a intentarlo.'
              : error.message,
            confirmButtonText: 'Entendido'
          });
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );
  }

  // Retraso para mantener el contexto del gesto
  setTimeout(() => {
    iniciarWatchPosition();
  }, 100);

  return () => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    if (routingControlRef.current) {
      routingControlRef.current.off('routesfound', onRoutesFound);
    }
  };
}, [vozActiva, map, onRouteFinished]);

  return null;
};

export default RoutingControl;