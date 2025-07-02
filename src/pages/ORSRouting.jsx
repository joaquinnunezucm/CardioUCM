// Reemplaza TODO el contenido de ORSRouting.js con esto:

import { useEffect } from 'react';

const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';

const ORSRouting = ({ from, to, onRouteCalculated }) => {

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
          // Llama al callback del padre con la ruta completa
          if (onRouteCalculated) onRouteCalculated(data.features[0]);
        } else {
          if (onRouteCalculated) onRouteCalculated(null);
        }
      } catch (error) {
        console.error("Error al obtener la ruta:", error);
        if (onRouteCalculated) onRouteCalculated(null); // Notifica al padre en caso de error
      }
    };

    fetchRoute();

  }, [from, to, onRouteCalculated]); // Dependencias

  // Este componente ya no renderiza nada en el mapa, solo calcula.
  return null;
};

export default ORSRouting;