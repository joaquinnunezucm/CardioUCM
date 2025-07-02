import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';

// --- CONFIGURACIÓN ---
const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';

const ORSRouting = ({ from, to, onRouteFinished, onRecalculateNeeded }) => {
  const map = useMap();
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const routeLayerRef = useRef(null);
  const hasArrivedRef = useRef(false);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // --- EFECTO 1: OBTENER LA RUTA DE LA API (CORREGIDO) ---
  useEffect(() => {
    if (!from || !to) return;

    hasArrivedRef.current = false;

    const fetchRoute = async () => {
      try {
        // ¡CAMBIO CLAVE! Añadimos el parámetro 'geometry_format=geojson' a la URL de la petición.
        // ORS requiere que se haga con un método POST, así que lo añadimos al body.
        const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', { // Perfil de ruta para peatones
          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
          },
          body: JSON.stringify({
            coordinates: [
              [from[1], from[0]], // ORS usa el formato [longitud, latitud]
              [to[1], to[0]]
            ]
            // El parámetro de formato ya no se usa aquí, va en la URL.
          })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Error de OpenRouteService: ${errorBody?.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        // La respuesta ahora es una FeatureCollection GeoJSON completa.
        // Solo necesitamos la primera "feature" que es la línea de la ruta.
        if (data && data.features && data.features.length > 0) {
          setRouteGeoJSON(data.features[0]); // Guardamos directamente la primera Feature
        } else {
          console.warn("ORS no devolvió ninguna ruta para las coordenadas dadas.");
          setRouteGeoJSON(null); // Limpiamos por si había una ruta anterior
        }
      } catch (error) {
        console.error("Error al obtener la ruta de OpenRouteService:", error);
        setRouteGeoJSON(null); // Aseguramos que el estado se limpie en caso de error
      }
    };

    fetchRoute();
  }, [from, to]);

  // --- EFECTO 2: DIBUJAR LA RUTA EN EL MAPA (CORREGIDO) ---
  useEffect(() => {
    if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
    }

    // Comprobación más robusta
    if (routeGeoJSON && routeGeoJSON.geometry && routeGeoJSON.geometry.coordinates) {
      const routeStyle = {
        color: '#007bff',
        weight: 6,
        opacity: 0.85,
      };
      
      try {
        // L.geoJSON puede recibir directamente una Feature o una FeatureCollection
        const layer = L.geoJSON(routeGeoJSON, { style: routeStyle }).addTo(map);
        routeLayerRef.current = layer;
        map.fitBounds(layer.getBounds(), { padding: [50, 50] });
      } catch(e) {
        console.error("Error al dibujar GeoJSON en Leaflet:", e)
      }
    }
    
    return () => {
        if (routeLayerRef.current) {
            map.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
        }
    };
  }, [routeGeoJSON, map]);

  // --- EFECTO 3: SEGUIMIENTO DEL USUARIO EN TIEMPO REAL (CORREGIDO) ---
 useEffect(() => {
  if (!routeGeoJSON) return;

  console.log("Iniciando seguimiento de geolocalización...");

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      // Callback de éxito (tu código actual es perfecto)
      if (hasArrivedRef.current) return;
      const userLocation = [position.coords.latitude, position.coords.longitude];
      const distanceToDestination = getDistance(userLocation[0], userLocation[1], to[0], to[1]);
      if (distanceToDestination < 25) {
        hasArrivedRef.current = true;
        onRouteFinished();
        return;
      }
      const routeLine = turf.lineString(routeGeoJSON.geometry.coordinates);
      const userPoint = turf.point([userLocation[1], userLocation[0]]);
      const distanceFromRoute = turf.pointToLineDistance(userPoint, routeLine, { units: 'meters' });
      if (distanceFromRoute > 50) {
        onRecalculateNeeded(userLocation);
      }
    },
    (error) => {
      // Callback de error
      console.error("Error en el seguimiento de geolocalización:", error.message);
      // Aquí podrías notificar al usuario, por ahora solo lo mostramos en consola.
      // Ejemplo: Swal.fire('Error de Ubicación', 'No se pudo actualizar tu posición. Revisa tu conexión o señal GPS.', 'warning');
    },
    {
      // Configuración de geolocalización optimizada
      enableHighAccuracy: true,  // Intentamos obtener la mejor precisión
      timeout: 15000,          // Pero le damos 15 segundos para que lo haga
      maximumAge: 5000         // Permitimos usar una ubicación en caché si no tiene más de 5 segundos de antigüedad
    }
  );

  return () => {
    console.log("Deteniendo seguimiento de geolocalización.");
    navigator.geolocation.clearWatch(watchId);
  };
}, [routeGeoJSON, to, onRouteFinished, onRecalculateNeeded]);

  return null;
};

export default ORSRouting;