import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useMap } from 'react-leaflet';
import Swal from 'sweetalert2';

// Función de utilidad para calcular distancia (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    console.warn('Coordenadas inválidas en getDistance:', { lat1, lon1, lat2, lon2 });
    return Infinity;
  }
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // Radio en metros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Calcula la distancia mínima del punto p al segmento [a, b] en metros
function distanceToSegment(p, a, b) {
  if (
    !p || !a || !b ||
    isNaN(p[0]) || isNaN(p[1]) ||
    isNaN(a[0]) || isNaN(a[1]) ||
    isNaN(b[0]) || isNaN(b[1])
  ) {
    console.warn('Coordenadas inválidas en distanceToSegment:', { p, a, b });
    return Infinity;
  }
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
  const denominator = dx * dx + dy * dy + dz * dz;
  if (denominator === 0) {
    console.warn('Denominador cero en distanceToSegment, usando punto inicial:', { a });
    return getDistance(p[0], p[1], a[0], a[1]);
  }
  const t = ((x3 - x1) * dx + (y3 - y1) * dy + (z3 - z1) * dz) / denominator;
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
  if (isNaN(dist)) {
    console.warn('Distancia NaN en distanceToSegment:', { p, a, b, xClosest, yClosest, zClosest });
    return Infinity;
  }
  return dist;
}

const hablar = (texto) => {
  if (!window.speechSynthesis) {
    console.warn('SpeechSynthesis no soportado en este navegador');
    return;
  }
  const utter = new SpeechSynthesisUtterance(texto);
  utter.lang = 'es-ES';
  utter.rate = 1.1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
};

const RoutingControl = ({ from, to, vozActiva, onRouteFinished }) => {
  const map = useMap();
  const routingControlRef = useRef(null);
  const proximoPasoIndex = useRef(0);
  const avisosDados = useRef(new Set());
  const hasArrivedRef = useRef(false);
  const ultimaPosicion = useRef(null);
  const watchIdRef = useRef(null);
  const isMountedRef = useRef(false);

  // Efecto para crear y destruir el control de la ruta
  useEffect(() => {
    if (!map) {
      console.error('Mapa no disponible');
      return;
    }
    if (!from || !to || isNaN(from[0]) || isNaN(from[1]) || isNaN(to[0]) || isNaN(to[1])) {
      console.warn('Coordenadas from o to inválidas o no proporcionadas:', { from, to });
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
      return;
    }

    isMountedRef.current = true;

    if (routingControlRef.current) {
      console.debug('Actualizando waypoints:', { from, to });
      routingControlRef.current.setWaypoints([L.latLng(from), L.latLng(to)]);
      return;
    }

    // Reiniciar estado para una nueva ruta
    proximoPasoIndex.current = 0;
    avisosDados.current.clear();
    hasArrivedRef.current = false;

    console.debug('Creando nuevo control de ruta:', { from, to });
    const control = L.Routing.control({
      waypoints: [L.latLng(from), L.latLng(to)],
      createMarker: () => null,
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      language: 'es',
      lineOptions: { styles: [{ color: '#007bff', weight: 5 }] },
    }).addTo(map);

    const onRouteSelected = (e) => {
      const primerPaso = e.route.instructions[0];
      if (primerPaso && isMountedRef.current) {
        console.debug('Ruta seleccionada, primera instrucción:', primerPaso.text);
        hablar(`Iniciando ruta. La primera indicación es: ${primerPaso.text}.`);
      } else {
        console.warn('No se encontraron instrucciones en la ruta seleccionada o componente desmontado');
      }
    };

    control.on('routeselected', onRouteSelected);
    routingControlRef.current = control;

    return () => {
      isMountedRef.current = false;
      if (routingControlRef.current) {
        console.debug('Eliminando control de ruta');
        routingControlRef.current.off('routeselected', onRouteSelected);
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [map, from, to]);

  // Efecto para la guía por voz y seguimiento en tiempo real
    useEffect(() => {
    if (!vozActiva || !routingControlRef.current) {
      console.debug('Guía por voz desactivada o routingControl no disponible:', { vozActiva, hasRoutingControl: !!routingControlRef.current });
      return;
    }

    let instrucciones = [];
    let reintentos = 0;
    let onSuccess, onError;

    onSuccess = (position) => {
      if (!isMountedRef.current) {
        console.debug('Componente desmontado, ignorando posición');
        return;
      }
      const { latitude, longitude } = position.coords;
      console.debug('Nueva posición recibida:', { latitude, longitude });

      if (ultimaPosicion.current) {
        const distanciaCambio = getDistance(latitude, longitude, ultimaPosicion.current.lat, ultimaPosicion.current.lng);
        if (distanciaCambio < 5) {
          console.debug('Posición sin cambios significativos:', { distanciaCambio });
          return;
        }
      }
      ultimaPosicion.current = { lat: latitude, lng: longitude };

      map.panTo([latitude, longitude]);
      let minDist = Infinity;
      let routeLine = null;

      try {
        if (
          routingControlRef.current &&
          routingControlRef.current._routes &&
          routingControlRef.current._routes[0] &&
          Array.isArray(routingControlRef.current._routes[0].coordinates) &&
          routingControlRef.current._routes[0].coordinates.length > 1
        ) {
          routeLine = routingControlRef.current._routes[0].coordinates;
          console.debug('Polilínea de ruta obtenida, longitud:', routeLine.length);
        } else {
          console.warn('No se pudo obtener la polilínea de la ruta:', {
            hasRoutes: !!routingControlRef.current?._routes,
            hasFirstRoute: !!routingControlRef.current?._routes?.[0],
            hasCoordinates: !!routingControlRef.current?._routes?.[0]?.coordinates,
            coordinatesLength: routingControlRef.current?._routes?.[0]?.coordinates?.length,
          });
          Swal.fire({
            icon: 'error',
            title: 'Error en la ruta',
            text: 'No se pudo calcular la ruta. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
          });
          return;
        }

        for (let i = 0; i < routeLine.length - 1; i++) {
          const a = routeLine[i];
          const b = routeLine[i + 1];
          if (
            !a || !b ||
            !a.hasOwnProperty('lat') || !a.hasOwnProperty('lng') ||
            !b.hasOwnProperty('lat') || !b.hasOwnProperty('lng') ||
            isNaN(a.lat) || isNaN(a.lng) ||
            isNaN(b.lat) || isNaN(b.lng)
          ) {
            console.warn(`Elemento inválido en routeLine[${i}]:`, { a, b });
            continue;
          }
          const dist = distanceToSegment([latitude, longitude], [a.lat, a.lng], [b.lat, b.lng]);
          minDist = Math.min(minDist, dist);
        }

        console.debug('Distancia mínima a la ruta:', minDist);

        // Lógica de desvío comentada para pruebas
        /*
        if (minDist > 100) {
          console.warn('Usuario desviado de la ruta:', { minDist });
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
        */

        const proximoPaso = instrucciones[proximoPasoIndex.current];
        if (!proximoPaso || !proximoPaso.latLng || !proximoPaso.latLng.lat || !proximoPaso.latLng.lng) {
          if (!hasArrivedRef.current) {
            console.debug('No hay más pasos o paso inválido, usuario ha llegado al destino');
            hasArrivedRef.current = true;
            hablar('Has llegado a tu destino');
            onRouteFinished();
          }
          return;
        }

const distancia = getDistance(latitude, longitude, proximoPaso.latLng.lat, proximoPaso.latLng.lng);
        console.debug('Distancia al paso actual:', {
          distancia,
          proximoPasoIndex: proximoPasoIndex.current,
          pasoText: proximoPaso.text,
        });

        // Solo avanzar si no estamos en el último paso
        if (proximoPasoIndex.current < instrucciones.length - 1) {
          if (distancia <= 25 && !avisosDados.current.has(proximoPasoIndex.current)) {
            console.debug('Emitiendo instrucción:', proximoPaso.text);
            hablar(proximoPaso.text);
            avisosDados.current.add(proximoPasoIndex.current);
            proximoPasoIndex.current++;
          } else if (distancia <= 100 && !avisosDados.current.has(`prep_${proximoPasoIndex.current}`)) {
            let texto = `A 100 metros, ${proximoPaso.text.toLowerCase()}`;
            if (proximoPaso.road) texto += ` en ${proximoPaso.road}`;
            console.debug('Emitiendo aviso de preparación:', texto);
            hablar(texto);
            avisosDados.current.add(`prep_${proximoPasoIndex.current}`);
          }
        } else {
          // Último paso: solo marcar llegada si realmente estamos cerca del destino
          if (distancia <= 25 && !hasArrivedRef.current) {
            console.debug('Usuario ha llegado al destino');
            hasArrivedRef.current = true;
            hablar('Has llegado a tu destino');
            onRouteFinished();
          }
        }
      } catch (error) {
        console.error('Error al procesar la posición:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error en el procesamiento',
          text: 'Ocurrió un error al procesar la posición. Por favor, intenta de nuevo.',
          confirmButtonText: 'Entendido',
        });
      }
    };

    onError = (error) => {
      console.error('Error en watchPosition:', { code: error.code, message: error.message });
      if (error.code === error.TIMEOUT && reintentos < 3) {
        reintentos++;
        console.debug(`Reintento ${reintentos} de watchPosition`);
        if (isMountedRef.current) {
          watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, { enableHighAccuracy: true, maximumAge: 0, timeout: 90000 });
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: error.code === error.TIMEOUT ? 'Tiempo de Espera Agotado' : 'Error de ubicación',
          text: error.code === error.TIMEOUT
            ? 'No se pudo obtener tu ubicación en el tiempo permitido. Por favor, verifica tu conexión o permisos de geolocalización y vuelve a intentarlo.'
            : error.message,
          confirmButtonText: 'Entendido',
        });
      }
    };

    const onRoutesFound = (e) => {
      if (!isMountedRef.current) {
        console.debug('Componente desmontado, ignorando routesfound');
        return;
      }
      instrucciones = e.routes[0]?.instructions || [];
      proximoPasoIndex.current = 0;
      avisosDados.current.clear();
      ultimaPosicion.current = null;
      console.debug('Rutas encontradas, total de instrucciones:', instrucciones.length);

      if (instrucciones.length === 0) {
        console.warn('No se encontraron instrucciones, abortando watchPosition');
        Swal.fire({
          icon: 'error',
          title: 'Error en la ruta',
          text: 'No se pudieron obtener las instrucciones de la ruta. Por favor, intenta de nuevo.',
          confirmButtonText: 'Entendido',
        });
        return;
      }

      console.debug('Iniciando watchPosition tras rutas encontradas');
      watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, { enableHighAccuracy: true, maximumAge: 0, timeout: 90000 });
    };

    routingControlRef.current.on('routesfound', onRoutesFound);

    return () => {
      isMountedRef.current = false;
      if (watchIdRef.current) {
        console.debug('Limpiando watchPosition');
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (routingControlRef.current) {
        console.debug('Eliminando listener de routesfound');
        routingControlRef.current.off('routesfound', onRoutesFound);
      }
    };
  }, [vozActiva, map, onRouteFinished]);
  return null;
};

export default RoutingControl;
