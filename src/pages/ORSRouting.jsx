// Archivo: ORSRouting.jsx (NUEVO CÓDIGO COMPLETO)

import { useEffect } from 'react';
import * as turf from '@turf/turf';

// Tu clave de API de OpenRouteService
const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';

/**
 * Componente "trabajador" que se encarga de una única tarea:
 * solicitar una ruta a la API de OpenRouteService.
 * No renderiza nada visualmente. Comunica el resultado a su padre
 * a través del callback `onRouteResult`.
 */
const ORSRouting = ({ from, to, onRouteResult }) => {

  // Este efecto se activa cuando los puntos de inicio (from) o fin (to) cambian.
  useEffect(() => {
    // Si no tenemos un punto de inicio o fin, no hacemos nada.
    if (!from || !to) {
      return;
    }

    // Usamos una variable para evitar actualizaciones de estado si el componente se desmonta.
    let isMounted = true;

    const fetchRoute = async () => {
      try {
        // Construimos el cuerpo de la petición para la API.
        const requestBody = {
          coordinates: [[from[1], from[0]], [to[1], to[0]]],
          instructions: true,
          instructions_format: 'text',
          language: 'es',
          // Parámetro clave: permite a ORS buscar el camino más cercano
          // en un radio ilimitado, resolviendo el problema de la "primera milla".
          radiuses: [-1, -1]
        };

        const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        // Si la respuesta de la red no es OK (ej. error 404, 500, 401), lanzamos un error.
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData?.error?.message || `Error de red: ${response.statusText}`);
        }

        const data = await response.json();

        // Si la respuesta es OK pero no contiene una ruta, también es un fracaso.
        // Esto sucede si ORS no puede encontrar una ruta (ej. el punto está a más de 2km de un camino).
        if (!data.features || data.features.length === 0) {
          throw new Error('ORS no pudo generar una ruta a pie entre los puntos.');
        }

        // --- ¡ÉXITO! ---
        if (isMounted) {
          const routeData = data.features[0];
          
          // Entregamos la ruta completa al padre para que él decida qué hacer.
          onRouteResult({
            status: 'SUCCESS',
            route: routeData,
          });
        }
      } catch (error) {
        // --- ¡FRACASO! ---
        console.error("Fallo al obtener la ruta de ORS:", error.message);
        if (isMounted) {
          onRouteResult({
            status: 'FAILED',
            error: error.message,
          });
        }
      }
    };

    fetchRoute();

    // Función de limpieza: se ejecuta si el componente se desmonta.
    return () => {
      isMounted = false;
    };
  }, [from, to, onRouteResult]); // El efecto depende de estos props.

  // Este componente no renderiza nada en la interfaz de usuario.
  return null;
};

export default ORSRouting;