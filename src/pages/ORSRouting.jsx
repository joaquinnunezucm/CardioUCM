// ORSRouting.js (Versión Dinámica y Avanzada)

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf'; // Importamos Turf.js

const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';

// Estilos para las partes de la ruta
const styleRemaining = { color: '#007bff', weight: 6, opacity: 0.85 };
const styleTraveled = { color: '#6c757d', weight: 5, opacity: 0.75, dashArray: '5, 10' };

const ORSRouting = ({ from, to, userPosition }) => {
  const map = useMap();
  // Refs para las capas del mapa, para poder borrarlas fácilmente
  const remainingPathRef = useRef(null);
  const traveledPathRef = useRef(null);
  
  // Estado para guardar la geometría completa de la ruta original
  const [fullRoute, setFullRoute] = useState(null);

  // 1. EFECTO PARA OBTENER LA RUTA UNA SOLA VEZ
  useEffect(() => {
    if (!from || !to) return;

    let isMounted = true; // Flag para evitar actualizaciones en un componente desmontado

    const fetchRoute = async () => {
      try {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
          method: 'POST',
          headers: { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ coordinates: [[from[1], from[0]], [to[1], to[0]]] })
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Error de ORS: ${errorBody?.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (isMounted && data.features && data.features.length > 0) {
          // Guardamos la ruta completa (en formato GeoJSON de línea)
          setFullRoute(data.features[0]);
          // Ajustamos el mapa a la ruta completa la primera vez
          const layer = L.geoJSON(data.features[0]);
          map.fitBounds(layer.getBounds(), { padding: [50, 50] });
        }
      } catch (error) {
        console.error("Error al obtener la ruta:", error);
      }
    };

    fetchRoute();

    // Función de limpieza
    return () => {
      isMounted = false;
      // Limpiamos todo cuando el componente se desmonta (ej: al detener la ruta)
      if (remainingPathRef.current) map.removeLayer(remainingPathRef.current);
      if (traveledPathRef.current) map.removeLayer(traveledPathRef.current);
      setFullRoute(null);
    };
  }, [from, to, map]);


  // 2. EFECTO PARA ACTUALIZAR EL DIBUJO DE LA RUTA CUANDO EL USUARIO SE MUEVE
  useEffect(() => {
    // Si no tenemos la ruta completa o la posición del usuario, no hacemos nada
    if (!fullRoute || !userPosition) return;
    
    // Convertimos la ubicación del usuario a un punto GeoJSON para Turf
    const userPoint = turf.point(userPosition.slice().reverse()); // Turf usa [lng, lat]

    // ¡La magia de Turf.js!
    // Encuentra el punto más cercano en la línea de la ruta desde la ubicación del usuario
    const nearestPoint = turf.nearestPointOnLine(fullRoute, userPoint, { units: 'meters' });

    // El resultado 'nearestPoint' tiene una propiedad 'index', que es el índice
    // del último vértice del segmento de línea donde se encuentra el punto más cercano.
    const sliceIndex = nearestPoint.properties.index;

    // Obtenemos todas las coordenadas de la ruta
    const routeCoords = turf.getCoords(fullRoute);

    // Dividimos la ruta en dos partes usando el índice que nos dio Turf
    // Parte ya recorrida: desde el inicio hasta el punto más cercano
    const traveledCoords = routeCoords.slice(0, sliceIndex + 1);
    // Agregamos la ubicación exacta del punto proyectado para mayor precisión
    traveledCoords.push(turf.getCoord(nearestPoint));

    // Parte restante: desde el punto más cercano hasta el final
    const remainingCoords = [turf.getCoord(nearestPoint)];
    remainingCoords.push(...routeCoords.slice(sliceIndex + 1));
    
    // Creamos las nuevas geometrías para ambas partes
    const traveledLine = turf.lineString(traveledCoords);
    const remainingLine = turf.lineString(remainingCoords);

    // Borramos las capas viejas del mapa
    if (traveledPathRef.current) map.removeLayer(traveledPathRef.current);
    if (remainingPathRef.current) map.removeLayer(remainingPathRef.current);

    // Dibujamos las nuevas capas y guardamos sus referencias
    traveledPathRef.current = L.geoJSON(traveledLine, { style: styleTraveled }).addTo(map);
    remainingPathRef.current = L.geoJSON(remainingLine, { style: styleRemaining }).addTo(map);

  }, [userPosition, fullRoute, map]); // Se ejecuta cada vez que el usuario se mueve

  return null;
};

export default ORSRouting;