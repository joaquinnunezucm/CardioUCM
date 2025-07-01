// src/pages/RoutingControl.jsx (COMPLETO Y REESCRITO)

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useMap } from 'react-leaflet';

// Función de utilidad para calcular distancia (sin cambios)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // Radio en metros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Icono personalizado para la posición del usuario (el círculo azul)
const userPositionIcon = L.divIcon({
  className: 'user-position-marker',
  html: '<div></div>',
  iconSize: [20, 20],
});

const RoutingControl = ({ from, to, isNavigating, onRouteFinished }) => {
  const map = useMap();
  const routingControlRef = useRef(null);
  
  // Refs para gestionar los elementos visuales de la navegación
  const fullRouteCoords = useRef([]);
  const routeLineRef = useRef(null); // Nuestra propia línea de ruta
  const userMarkerRef = useRef(null); // El marcador azul que se mueve

  // Efecto #1: Calcular la ruta una sola vez y prepararla
  useEffect(() => {
    if (!map || !from || !to) return;

    // Crear el control de ruta de Leaflet, pero hacerlo INVISIBLE.
    // Solo lo usamos para calcular la geometría de la ruta.
    const control = L.Routing.control({
      waypoints: [L.latLng(from), L.latLng(to)],
      createMarker: () => null, // No queremos sus marcadores por defecto
      routeWhileDragging: false,
      addWaypoints: false,
      // Hacemos la línea de ruta por defecto completamente transparente
      lineOptions: {
        styles: [{ opacity: 0, weight: 0 }]
      }
    }).addTo(map);

    // Cuando la ruta se calcula, guardamos sus coordenadas y dibujamos la nuestra
    control.on('routesfound', (e) => {
      // Guardamos todas las coordenadas de la ruta calculada
      fullRouteCoords.current = e.routes[0].coordinates;

      // Si no existe nuestra línea de ruta, la creamos
      if (!routeLineRef.current) {
        routeLineRef.current = L.polyline(fullRouteCoords.current, {
          color: '#007bff', // Color azul vivo
          weight: 6,
          opacity: 0.8,
        }).addTo(map);
      } else {
        // Si ya existe, solo actualizamos las coordenadas
        routeLineRef.current.setLatLngs(fullRouteCoords.current);
      }
      map.fitBounds(e.routes[0].bounds); // Ajustar el zoom para ver toda la ruta inicialmente
    });

    routingControlRef.current = control;

    return () => {
      if (control) {
        map.removeControl(control);
      }
    };
  }, [map, from, to]);


  // Efecto #2: Gestionar la navegación activa (seguimiento, recorte de ruta)
  useEffect(() => {
    // Si no estamos en modo navegación, nos aseguramos de que todo esté limpio
    if (!isNavigating) {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

    // Si estamos navegando y aún no hay marcador de usuario, lo creamos
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(from, { icon: userPositionIcon }).addTo(map);
    }

    // Iniciamos el seguimiento por GPS
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const userCoords = L.latLng(position.coords.latitude, position.coords.longitude);

        // 1. Mover el marcador del usuario a su nueva posición
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(userCoords);
        }

        // 2. Centrar el mapa en la posición del usuario
        map.setView(userCoords, Math.max(map.getZoom(), 17), {
            animate: true,
            pan: { duration: 0.8 }
        });

        // 3. Lógica de "recorte" de la ruta
        if (routeLineRef.current && fullRouteCoords.current.length > 0) {
          let closestPointIndex = -1;
          let minDistance = Infinity;

          // Encontramos el punto (vértice) más cercano en la ruta a nuestra posición actual
          fullRouteCoords.current.forEach((coord, index) => {
            const distance = userCoords.distanceTo(coord);
            if (distance < minDistance) {
              minDistance = distance;
              closestPointIndex = index;
            }
          });

          // Creamos un nuevo array de coordenadas para la ruta restante
          // Empezamos desde el punto más cercano hasta el final
          const remainingRoute = fullRouteCoords.current.slice(closestPointIndex);

          // Para una línea suave, el primer punto de la ruta restante es la posición actual del usuario
          remainingRoute.unshift(userCoords);

          // Actualizamos nuestra línea de polígono para que solo muestre la ruta restante
          routeLineRef.current.setLatLngs(remainingRoute);
        }

        // 4. Lógica de llegada (opcional, pero útil)
        const distanciaAlDestino = userCoords.distanceTo(to);
        if (distanciaAlDestino < 25) { // Si está a menos de 25 metros
          if (onRouteFinished) onRouteFinished();
        }
      },
      (error) => console.error("Error en watchPosition:", error),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    // Función de limpieza del efecto
    return () => {
      navigator.geolocation.clearWatch(watchId);
      // Cuando se detiene la navegación, eliminamos los elementos visuales
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }
    };
  }, [isNavigating, map, to, from, onRouteFinished]);

  return null; // El componente no renderiza nada, solo manipula el mapa
};

export default RoutingControl;