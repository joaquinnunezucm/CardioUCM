import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';

// --- CONFIGURACIÓN ---
// Reemplaza esta cadena con la clave API que obtuviste de OpenRouteService
const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';

/**
 * Componente para calcular, dibujar y seguir una ruta usando OpenRouteService.
 * Este componente no renderiza HTML visible, sino que interactúa directamente con el mapa de Leaflet.
 *
 * @param {object} props - Propiedades del componente.
 * @param {number[]} props.from - Coordenadas de inicio [latitud, longitud].
 * @param {number[]} props.to - Coordenadas de destino [latitud, longitud].
 * @param {function} props.onRouteFinished - Callback que se ejecuta cuando el usuario llega al destino.
 * @param {function} props.onRecalculateNeeded - Callback que se ejecuta cuando el usuario se desvía de la ruta.
 */
const ORSRouting = ({ from, to, onRouteFinished, onRecalculateNeeded }) => {
  const map = useMap(); // Hook para obtener la instancia del mapa de Leaflet del componente padre <MapContainer>
  
  // Estado para almacenar la geometría de la ruta en formato GeoJSON
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  
  // Referencia para mantener la capa de la ruta y poder eliminarla después
  const routeLayerRef = useRef(null);
  
  // Referencia para evitar que la llegada se dispare múltiples veces
  const hasArrivedRef = useRef(false);

  // --- FUNCIÓN DE UTILIDAD: CÁLCULO DE DISTANCIA (HAVERSINE) ---
  /**
   * Calcula la distancia en metros entre dos puntos geográficos.
   * @param {number} lat1 Latitud del punto 1.
   * @param {number} lon1 Longitud del punto 1.
   * @param {number} lat2 Latitud del punto 2.
   * @param {number} lon2 Longitud del punto 2.
   * @returns {number} Distancia en metros.
   */
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // --- EFECTO 1: OBTENER LA RUTA DE LA API ---
  // Este efecto se ejecuta cada vez que el punto de inicio 'from' o de destino 'to' cambian.
  useEffect(() => {
    if (!from || !to) return;

    // Reseteamos el estado de llegada para la nueva ruta
    hasArrivedRef.current = false;

    const fetchRoute = async () => {
      try {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking', { // Perfil de ruta para peatones
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
          })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Error de OpenRouteService: ${errorBody?.error?.message || response.statusText}`);
        }

                const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          // Asegura que geometry tiene type y coordinates
          let geometry = data.routes[0].geometry;
          // Si geometry está codificada (tipo string), decodifica
          if (geometry && geometry.type && geometry.coordinates) {
            // Ok, es GeoJSON geometry
          } else if (data.routes[0].geometry && data.routes[0].geometry.coordinates) {
            geometry = {
              type: data.routes[0].geometry.type || "LineString",
              coordinates: data.routes[0].geometry.coordinates
            };
          } else if (data.routes[0].geometry) {
            // Si geometry es un array, asume LineString
            geometry = {
              type: "LineString",
              coordinates: data.routes[0].geometry
            };
          } else {
            console.error("Respuesta de ORS sin geometría válida:", data.routes[0]);
            throw new Error("Respuesta de ORS sin geometría válida");
          }
                    if (geometry && Array.isArray(geometry.coordinates)) {
            geometry.coordinates = geometry.coordinates.filter(
              c => Array.isArray(c) && c.length === 2 && 
                   typeof c[0] === 'number' && typeof c[1] === 'number' &&
                   !isNaN(c[0]) && !isNaN(c[1])
            );
          }
          const geojsonFeature = {
            type: "Feature",
            geometry,
            properties: {}
          };
          setRouteGeoJSON(geojsonFeature);
        } else {
          console.warn("ORS no devolvió ninguna ruta para las coordenadas dadas.");
        }
      } catch (error) {
        console.error("Error al obtener la ruta de OpenRouteService:", error);
        // Opcional: Notificar al usuario que no se pudo calcular la ruta.
        // Swal.fire('Error', 'No se pudo calcular la ruta. Inténtalo de nuevo.', 'error');
      }
    };

    fetchRoute();
  }, [from, to]); // Dependencias: se recalcula si cambia el inicio o el fin.

  // --- EFECTO 2: DIBUJAR LA RUTA EN EL MAPA ---
  // Este efecto se ejecuta cada vez que el estado 'routeGeoJSON' cambia.
  useEffect(() => {
    // Primero, limpiamos la capa de la ruta anterior si existe
    if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
    }

    // Si tenemos una nueva geometría de ruta, la dibujamos
    if (routeGeoJSON) {
      const routeStyle = {
        color: '#007bff', // Azul brillante, buen contraste
        weight: 6,         // Un poco más gruesa para ser bien visible
        opacity: 0.85,     // Ligeramente transparente
      };
      
      const layer = L.geoJSON(routeGeoJSON, { style: routeStyle }).addTo(map);
      
      // Guardamos la referencia a la nueva capa para poder limpiarla después
      routeLayerRef.current = layer;
      
      // Ajustamos la vista del mapa para que la ruta completa sea visible, con un poco de margen
      map.fitBounds(layer.getBounds(), { padding: [50, 50] });
    }
    
    // Función de limpieza que se ejecuta cuando el componente se desmonta
    return () => {
        if (routeLayerRef.current) {
            map.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
        }
    };
  }, [routeGeoJSON, map]); // Dependencias: se redibuja si cambia la ruta o el mapa.

  // --- EFECTO 3: SEGUIMIENTO DEL USUARIO EN TIEMPO REAL ---
  // Este efecto se activa una vez que tenemos una ruta para seguir.
  useEffect(() => {
    if (!routeGeoJSON) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (hasArrivedRef.current) return; // Si ya llegamos, no hacemos nada más

        const userLocation = [position.coords.latitude, position.coords.longitude];

        // 1. Lógica de llegada al destino
        const DISTANCIA_LLEGADA = 25; // metros
        const distanceToDestination = getDistance(userLocation[0], userLocation[1], to[0], to[1]);
        
        if (distanceToDestination < DISTANCIA_LLEGADA) {
          hasArrivedRef.current = true; // Marcamos que hemos llegado
          onRouteFinished(); // Llamamos a la función del padre
          return; // Salimos para no seguir procesando
        }

        // 2. Lógica de desvío de la ruta
        const DISTANCIA_MAX_DESVIO = 50; // metros
        
        // Creamos objetos de Turf.js para el cálculo
        const routeLine = turf.lineString(routeGeoJSON.geometry.coordinates);
        const userPoint = turf.point([userLocation[1], userLocation[0]]); // Turf también usa [lng, lat]
        
        // Calculamos la distancia más corta desde la ubicación del usuario a la línea de la ruta
        const distanceFromRoute = turf.pointToLineDistance(userPoint, routeLine, { units: 'meters' });
        
        if (distanceFromRoute > DISTANCIA_MAX_DESVIO) {
          // Si la distancia es mayor al umbral, notificamos al padre para que recalcule
          onRecalculateNeeded(userLocation);
        }
      },
      (error) => {
        console.error("Error en el seguimiento de geolocalización:", error);
      },
      { // Opciones para obtener la ubicación más precisa posible
        enableHighAccuracy: true,
        timeout: 10000, // 10 segundos de tiempo de espera
        maximumAge: 0   // No usar una ubicación en caché
      }
    );

    // Función de limpieza para detener el seguimiento cuando el componente se desmonta o la ruta cambia
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [routeGeoJSON, to, onRouteFinished, onRecalculateNeeded]); // Dependencias clave para el seguimiento.

  // Este componente es puramente lógico y no renderiza ningún elemento en el DOM.
  return null;
};

export default ORSRouting;