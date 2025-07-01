import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useMap } from 'react-leaflet';
import Swal from 'sweetalert2';

// FUNCIÓN DE UTILIDAD: Calcular distancia Haversine en metros
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    console.warn('Coordenadas inválidas en getDistance:', { lat1, lon1, lat2, lon2 });
    return Infinity;
  }
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// FUNCIÓN DE UTILIDAD: Síntesis de voz
const hablar = (texto) => {
  if (!window.speechSynthesis) {
    console.warn('SpeechSynthesis no es soportado en este navegador.');
    return;
  }
  // Cancelar cualquier discurso anterior para no solapar instrucciones
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(texto);
  utter.lang = 'es-ES'; // Asegurar idioma español
  utter.rate = 1.1;     // Un poco más rápido para que sea más fluido
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
};


/**
 * Componente de React para mostrar y gestionar una ruta en un mapa de Leaflet.
 * Utiliza leaflet-routing-machine y la API de Geolocalización para guía por voz.
 *
 * @param {number[]} from - Coordenadas de inicio [lat, lng].
 * @param {number[]} to - Coordenadas de destino [lat, lng].
 * @param {boolean} vozActiva - Activa o desactiva la guía por voz.
 * @param {function} onRouteFinished - Callback que se ejecuta al llegar al destino.
 */
const RoutingControl = ({ from, to, vozActiva, onRouteFinished }) => {
  const map = useMap();
  // Ref para mantener la instancia del control de ruta a través de los renders.
  const routingControlRef = useRef(null);

  // El useEffect unificado que maneja TODO el ciclo de vida de la ruta.
  // Se ejecuta cada vez que 'from', 'to', o 'vozActiva' cambian.
  useEffect(() => {
    // --- 1. VALIDACIONES Y PREPARACIÓN ---
    if (!map) {
      console.error('El objeto `map` no está disponible en RoutingControl.');
      return;
    }
    if (!from || !to || isNaN(from[0]) || isNaN(from[1]) || isNaN(to[0]) || isNaN(to[1])) {
      console.warn('Coordenadas `from` o `to` inválidas. No se creará la ruta.', { from, to });
      return;
    }

    // Si ya existe un control de una ruta anterior, lo eliminamos del mapa.
    // Esto es crucial para asegurar un estado limpio en cada nueva ruta.
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    // --- 2. CREACIÓN DEL NUEVO CONTROL DE RUTA ---
    const control = L.Routing.control({
      waypoints: [L.latLng(from), L.latLng(to)],
      // Opciones para personalizar la apariencia y comportamiento
      createMarker: () => null,      // No queremos los marcadores A y B por defecto.
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      show: false,                  // Ocultamos el panel de instrucciones de la librería.
      language: 'es',
      lineOptions: {
        styles: [{ color: '#007bff', weight: 6, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 100
      },
    }).addTo(map);

    // Guardamos la nueva instancia en nuestra ref para poder limpiarla después.
    routingControlRef.current = control;

    // Variables para la lógica de seguimiento y voz. Se reinician en cada ejecución del efecto.
    let watchId = null;
    const isMounted = { current: true }; // Para evitar actualizaciones en componente desmontado.
    const hasArrived = { current: false };
    const avisosDados = new Set();
    let proximoPasoIndex = 0;
    let instrucciones = [];

    // --- 3. LÓGICA DE GUÍA POR VOZ (SI ESTÁ ACTIVA) ---
    const onRoutesFound = (e) => {
      if (!isMounted.current) return; // No hacer nada si el componente ya se desmontó.

      instrucciones = e.routes[0]?.instructions || [];
      console.log(`Ruta encontrada con ${instrucciones.length} instrucciones.`);

      if (instrucciones.length === 0) {
        Swal.fire('Error de Ruta', 'No se pudieron obtener las instrucciones de la ruta. Inténtalo de nuevo.', 'error');
        return;
      }

      // Dar la primera instrucción de la ruta.
      const primerPaso = instrucciones[0];
      if (primerPaso) {
        hablar(`Iniciando ruta. ${primerPaso.text}.`);
      }

      // Callback para cuando se obtiene una nueva posición del usuario.
      const onSuccess = (position) => {
        if (!isMounted.current || hasArrived.current) return;

        const { latitude, longitude } = position.coords;

        // Centrar el mapa en la nueva ubicación del usuario.
        map.panTo([latitude, longitude]);

        const proximoPaso = instrucciones[proximoPasoIndex];
        if (!proximoPaso) {
          if (!hasArrived.current) {
            hasArrived.current = true;
            hablar('Has llegado a tu destino.');
            if (onRouteFinished) onRouteFinished();
          }
          return;
        }

        const distanciaAlProximoPaso = getDistance(latitude, longitude, proximoPaso.latLng.lat, proximoPaso.latLng.lng);
        console.debug(`Distancia al paso #${proximoPasoIndex}: ${distanciaAlProximoPaso.toFixed(1)}m`);

        // Si el usuario está a menos de 25 metros del siguiente punto de instrucción...
        if (distanciaAlProximoPaso <= 25 && !avisosDados.has(proximoPasoIndex)) {
          hablar(proximoPaso.text);
          avisosDados.add(proximoPasoIndex);
          proximoPasoIndex++; // Avanzar al siguiente paso.
        }
      };

      const onError = (error) => {
        console.error('Error de Geolocalización:', { code: error.code, message: error.message });
        Swal.fire('Error de Ubicación', 'No se puede seguir tu posición. Por favor, revisa los permisos de ubicación.', 'error');
      };

      // Iniciar el seguimiento de la ubicación del usuario.
      watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      });
    };

    // Solo activamos la lógica de voz si el prop 'vozActiva' es true.
    if (vozActiva) {
      control.on('routesfound', onRoutesFound);
    }

    // --- 4. FUNCIÓN DE LIMPIEZA ---
    // Se ejecuta cuando el componente se desmonta O cuando las dependencias del useEffect cambian.
    // Es CRUCIAL para evitar fugas de memoria y listeners "zombis".
    return () => {
      isMounted.current = false; // Marcar como desmontado.

      // Detener el seguimiento de la ubicación para no consumir batería.
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      
      // Detener cualquier síntesis de voz en curso.
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // Eliminar el control del mapa si aún existe.
      if (map && routingControlRef.current) {
        // Quitar listeners para evitar fugas de memoria.
        routingControlRef.current.off('routesfound', onRoutesFound);
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, from, to, vozActiva, onRouteFinished]); // Dependencias del efecto.

  // Este componente no renderiza ningún elemento DOM, solo manipula el mapa.
  return null;
};

export default RoutingControl;