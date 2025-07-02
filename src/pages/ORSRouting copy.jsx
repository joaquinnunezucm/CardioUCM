// En ORSRouting.js (Versión Simplificada)

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';

const ORSRouting = ({ from, to }) => {
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
        if (!response.ok) throw new Error('Failed to fetch route');
        
        const data = await response.json();

        if (data && data.features && data.features.length > 0) {
          if (routeLayerRef.current) {
            map.removeLayer(routeLayerRef.current);
          }
          const routeGeoJSON = data.features[0];
          const layer = L.geoJSON(routeGeoJSON, {
            style: { color: '#007bff', weight: 6, opacity: 0.85 }
          }).addTo(map);
          routeLayerRef.current = layer;
          map.fitBounds(layer.getBounds(), { padding: [50, 50] });
        }
      } catch (error) {
        console.error("Error al obtener la ruta:", error);
      }
    };

    fetchRoute();

    return () => {
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
    };
  }, [from, to, map]);

  return null;
};

export default ORSRouting;