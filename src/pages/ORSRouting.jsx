import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';

const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';
const DEVIATION_THRESHOLD_METERS = 50; // Umbral de desvío en metros
const SNAP_THRESHOLD_METERS = 20; //  Umbral para pegar el marcador a la ruta (en metros)

const styleRemaining = {
  color: '#007bff',
  weight: 6,
  opacity: 0.85,
};

const ORSRouting = ({ from, to, userPosition, onRouteFound, onDeviation, onPositionUpdate }) => {
  const map = useMap();
  const remainingPathRef = useRef(null);
  const [fullRoute, setFullRoute] = useState(null);

useEffect(() => {
    if (!from || !to) return;
    let isMounted = true;

    // Limpieza explícita para evitar usar datos de rutas anteriores
    setFullRoute(null);
    if (remainingPathRef.current) {
        map.removeLayer(remainingPathRef.current);
        remainingPathRef.current = null;
    }

    const fetchRoute = async () => {
      // Construye el cuerpo de la petición
      console.log(`[ORSRouting] fetchRoute INICIADO. Usando 'from': [${from[0]}, ${from[1]}]`); // <-- AÑADIR
      const requestBody = {
        coordinates: [[from[1], from[0]], [to[1], to[0]]],
        instructions: true,
        instructions_format: 'text',
        language: 'es',
        // ¡LA SOLUCIÓN CLAVE!
        // Le dice a ORS que busque el camino más cercano en un radio ilimitado
        // para los puntos de inicio y fin. Esto resuelve el problema de la "primera milla".
        radiuses: [-1, -1] 
      };

      try {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          // Lanza un error para que sea capturado por el bloque catch
          throw new Error(`Error de ORS: ${errorBody?.error?.message || response.statusText}`);
        }

        const data = await response.json();

        // Comprueba si la respuesta es válida y si el componente sigue montado
        if (isMounted && data.features && data.features.length > 0) {
          const routeData = data.features[0];
          
          // Actualiza el estado con la ruta completa
          setFullRoute(routeData);

          // Informa al componente padre que se encontró una ruta
          if (onRouteFound) {
            onRouteFound({
              coords: turf.getCoords(routeData),
              instructions: routeData.properties.segments[0].steps,
            });
          }

          // Dibuja la ruta inicial y ajusta el mapa para que se vea completa
          const initialLayer = L.geoJSON(routeData);
          map.fitBounds(initialLayer.getBounds(), { padding: [50, 50] });

        } else if (isMounted) {
          // Si la respuesta es 200 OK pero no hay ruta, también es un error
          throw new Error("La API de ORS respondió pero no pudo generar una ruta.");
        }

      } catch (error) {
        console.error("Error al obtener la ruta con instrucciones:", error);
        // Aquí podrías opcionalmente notificar al padre de un error si tuvieras un callback para ello
        // Por ejemplo: if (onError) onError(error);
      }
    };

    fetchRoute();

    // Función de limpieza que se ejecuta cuando el componente se desmonta o las dependencias cambian
    return () => {
      isMounted = false;
      if (remainingPathRef.current) {
        map.removeLayer(remainingPathRef.current);
      }
    };
  }, [from, to, map, onRouteFound]); // Las dependencias se mantienen igual

useEffect(() => {
  console.log(`[ORSRouting] useEffect de SEGUIMIENTO. Usando 'userPosition': [${userPosition ? userPosition[0] : 'null'}, ${userPosition ? userPosition[1] : 'null'}]`); // <-- AÑADIR
  if (!fullRoute || !userPosition || !onPositionUpdate) return;

  const userPoint = turf.point(userPosition.slice().reverse());
  const nearestPoint = turf.nearestPointOnLine(fullRoute, userPoint, { units: 'meters' });

  const deviationDistance = turf.distance(userPoint, nearestPoint, { units: 'meters' });
  if (deviationDistance < SNAP_THRESHOLD_METERS) {
    // Si está cerca, envía la posición "pegada" a la ruta.
    const snappedCoords = turf.getCoord(nearestPoint);
    onPositionUpdate([snappedCoords[1], snappedCoords[0]]); // Ojo: Leaflet usa [lat, lon]
  } else {
    // Si está lejos, envía la posición GPS real.
    onPositionUpdate(userPosition);
  }

  
  // Lógica de Re-cálculo  
  if (deviationDistance > DEVIATION_THRESHOLD_METERS) {
    console.log(`Desvío detectado: ${deviationDistance.toFixed(0)}m. Solicitando re-cálculo.`);
    if (onDeviation) {
      onDeviation();
    }
    return; 
  }


  const sliceIndex = nearestPoint.properties.index;
  const routeCoords = turf.getCoords(fullRoute);
  const remainingCoords = [
    turf.getCoord(nearestPoint),
    ...routeCoords.slice(sliceIndex + 1),
  ];
  const remainingLine = turf.lineString(remainingCoords);

  if (remainingPathRef.current) {
    map.removeLayer(remainingPathRef.current);
  }
  remainingPathRef.current = L.geoJSON(remainingLine, { style: styleRemaining }).addTo(map);

}, [userPosition, fullRoute, map, onDeviation, onPositionUpdate]);

  return null;
};

export default ORSRouting;