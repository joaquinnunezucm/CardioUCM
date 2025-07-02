// En ORSRouting.js (Versión Final Definitiva)

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';

const ORSRouting = ({ from, to, onRouteCalculated }) => {
  const map = useMap();
  const routeLayerRef = useRef(null);

  useEffect(() => {
    if (!from || !to) return;

    const fetchRoute = async () => {
      try {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ coordinates: [[from[1], from[0]], [to[1], to[0]]] })
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Error de ORS: ${errorBody?.error?.message || response.statusText}`);
        }
        
        const data = await response.json();

        if (data && data.features && data.features.length > 0) {
          const routeGeoJSON = data.features[0];
          
          if (routeLayerRef.current) {
            map.removeLayer(routeLayerRef.current);
          }

          const layer = L.geoJSON(routeGeoJSON, {
            style: { color: '#007bff', weight: 6, opacity: 0.85 }
          }).addTo(map);

          routeLayerRef.current = layer;
          map.fitBounds(layer.getBounds(), { padding: [50, 50] });

          // ¡NUEVO! Devolvemos la geometría al componente padre
          if (onRouteCalculated) {
            onRouteCalculated(routeGeoJSON);
          }
        }
      } catch (error) {
        console.error("Error al obtener la ruta:", error);
        if (onRouteCalculated) {
            onRouteCalculated(null); // Notificamos al padre que hubo un error
        }
      }
    };

    fetchRoute();

    return () => {
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
    };
  }, [from, to, map, onRouteCalculated]);

  return null;
};

export default ORSRouting;