import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useMap } from 'react-leaflet';

// Función para calcular la distancia (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // Radio en metros para coincidir con la distancia de aviso
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const RoutingControl = ({ from, to, vozActiva, modo = 'caminando' }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  const hablar = (texto) => {
    if (!vozActiva || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = 'es-ES';
    utter.rate = 1;
    window.speechSynthesis.cancel();
    setTimeout(() => window.speechSynthesis.speak(utter), 100);
  };

  // Este useEffect gestiona la EXISTENCIA y el PERFIL del control en el mapa
  useEffect(() => {
    if (!map) return;

    // Si no hay puntos, nos aseguramos de que el control se elimine
    if (!from || !to) {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
      return;
    }

    // Determina el perfil de enrutamiento basado en el modo
    const routingProfile = modo === 'coche' ? 'driving' : 'walking';

    // Si el control ya existe, solo actualizamos los puntos de ruta.
    // La recreación completa para cambiar el perfil se maneja cambiando la 'key' en el componente padre.
    if (routingControlRef.current) {
      routingControlRef.current.setWaypoints([L.latLng(from), L.latLng(to)]);
      return;
    }

    // Si no existe, lo creamos con el perfil correcto
    const control = L.Routing.control({
      waypoints: [L.latLng(from), L.latLng(to)],
      router: L.Routing.osrmv1({
        serviceUrl: `https://router.project-osrm.org/route/v1`,
        profile: routingProfile, // 'driving' o 'walking'
      }),
      createMarker: () => null,
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      language: 'es',
      lineOptions: { styles: [{ color: '#007bff', weight: 5 }] },
    }).addTo(map);

    control.on('routeselected', (e) => {
      if (e.route.instructions.length > 0) {
        const primerPaso = e.route.instructions[0];
        hablar(`Iniciando ruta. En ${Math.round(primerPaso.distance)} metros, ${primerPaso.text}`);
      }
    });

    routingControlRef.current = control;

    // LIMPIEZA: elimina el control SIEMPRE que el componente se desmonta
    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [map, from, to, modo]); // Se re-ejecuta si el modo cambia

  // Este useEffect gestiona la GUÍA POR VOZ en tiempo real
  useEffect(() => {
    if (!vozActiva || !routingControlRef.current) return;

    let watchId = null;
    let instrucciones = [];
    const pasosYaLeidos = new Set();
    
    // La distancia de aviso ahora es dinámica, basada en el modo
    const distanciaAviso = modo === 'coche' ? 120 : 25;

    const onRoutesFound = (e) => {
      instrucciones = e.routes[0].instructions;
      pasosYaLeidos.clear();
    };

    routingControlRef.current.on('routesfound', onRoutesFound);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (instrucciones.length === 0) return;

        let pasoMasCercano = null;
        let menorDistancia = Infinity;
        let indicePaso = -1;
        
        instrucciones.forEach((paso, idx) => {
          const dist = getDistance(latitude, longitude, paso.lat, paso.lng);
          if (dist < menorDistancia) {
            menorDistancia = dist;
            pasoMasCercano = paso;
            indicePaso = idx;
          }
        });

        if (pasoMasCercano && menorDistancia <= distanciaAviso && !pasosYaLeidos.has(indicePaso)) {
          hablar(`En ${Math.round(menorDistancia)} metros, ${pasoMasCercano.text}`);
          pasosYaLeidos.add(indicePaso);
        }

        const ultima = instrucciones[instrucciones.length - 1];
        if (ultima && !pasosYaLeidos.has('final')) {
            const distanciaFinal = getDistance(latitude, longitude, ultima.lat, ultima.lng);
            if (distanciaFinal <= distanciaAviso) {
                hablar('Has llegado a tu destino.');
                pasosYaLeidos.add('final');
            }
        }
      },
      (error) => console.error("Error en watchPosition:", error),
      { enableHighAccuracy: true }
    );
    
    // Limpieza de este efecto específico
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (routingControlRef.current) {
        routingControlRef.current.off('routesfound', onRoutesFound);
      }
    };
  }, [vozActiva, modo]); // Se re-ejecuta si el modo cambia

  return null;
};

export default RoutingControl;