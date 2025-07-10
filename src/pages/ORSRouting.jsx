import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';

const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';
const DEVIATION_THRESHOLD_METERS = 100; // Umbral para desvíos durante navegación (metros)
const SNAP_THRESHOLD_METERS = 20; // Umbral para pegar el marcador a la ruta (metros)
const START_SEGMENT_THRESHOLD_METERS = 50; // Umbral para segmento inicial (metros)
const FINAL_SEGMENT_THRESHOLD_METERS = 5000; // Umbral para segmento final (metros)
const CLOSE_TO_DEST_THRESHOLD_METERS = 10; // Umbral para estar cerca del DEA (metros)

const styleRemaining = {
  color: '#007bff',
  weight: 6,
  opacity: 0.85,
};

const styleStartSegment = {
  color: '#007bff',
  weight: 6,
  opacity: 0.85,
  dashArray: '5, 5', // Discontinuo para diferenciar
};

const styleFinalSegment = {
  color: '#007bff',
  weight: 6,
  opacity: 0.85,
  dashArray: '5, 5', // Discontinuo para diferenciar
};

const ORSRouting = ({ from, to, userPosition, onRouteFound, onDeviation, onPositionUpdate, onError }) => {
  const map = useMap();
  const remainingPathRef = useRef(null);
  const startSegmentRef = useRef(null);
  const finalSegmentRef = useRef(null);
  const [fullRoute, setFullRoute] = useState(null);
  const [startSegment, setStartSegment] = useState(null);
  const [finalSegment, setFinalSegment] = useState(null);
  const [isInitialRoute, setIsInitialRoute] = useState(true); // Bandera para ruta inicial

  // Función para calcular la distancia directa
  const getDirectDistance = (from, to) => {
    const fromPoint = turf.point([from[1], from[0]]);
    const toPoint = turf.point([to[1], to[0]]);
    return turf.distance(fromPoint, toPoint, { units: 'meters' });
  };

  useEffect(() => {
    if (!from || !to) return;
    let isMounted = true;

    const calculateRoute = async () => {
      // Validar coordenadas
      if (
        !from || !to ||
        isNaN(from[0]) || isNaN(from[1]) || isNaN(to[0]) || isNaN(to[1]) ||
        Math.abs(from[0]) > 90 || Math.abs(to[0]) > 90 ||
        Math.abs(from[1]) > 180 || Math.abs(to[1]) > 180
      ) {
        console.error('Coordenadas inválidas:', { from, to });
        if (onError) {
          onError('Coordenadas inválidas. Por favor, verifica tu posición y el destino.');
        }
        return;
      }

      try {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-hiking/geojson', {

          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: [[from[1], from[0]], [to[1], to[0]]],
            instructions: true,
            instructions_format: 'text',
            language: 'es',
            preference: 'shortest',
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(`Error de ORS: ${errorBody?.error?.message || response.statusText}`);
        }

        const data = await response.json();

        if (isMounted && data.features && data.features.length > 0) {
          const routeData = data.features[0];
          const routeCoords = turf.getCoords(routeData);

          // Verificar segmento inicial
          const firstCoord = routeCoords[0];
          const distanceFromStart = getDirectDistance([firstCoord[1], firstCoord[0]], from);
          if (distanceFromStart > START_SEGMENT_THRESHOLD_METERS) {
            if (onError) {
              onError(`Estás a ${distanceFromStart.toFixed(0)} metros de un camino accesible. Acércate a una vía peatonal.`);
            }
            return;
          }
          if (distanceFromStart > 5 && distanceFromStart <= START_SEGMENT_THRESHOLD_METERS) {
            const startLine = turf.lineString([[from[1], from[0]], firstCoord]);
            setStartSegment(startLine);
          } else {
            setStartSegment(null);
          }

          // Verificar segmento final
          const lastCoord = routeCoords[routeCoords.length - 1];
          const distanceToDest = getDirectDistance([lastCoord[1], lastCoord[0]], to);
          if (distanceToDest > FINAL_SEGMENT_THRESHOLD_METERS) {
            if (onError) {
              onError(`El desfibrilador está a ${distanceToDest.toFixed(0)} metros de un camino accesible.`);
            }
            return;
          }
          if (distanceToDest > 5 && distanceToDest <= FINAL_SEGMENT_THRESHOLD_METERS) {
            const finalLine = turf.lineString([lastCoord, [to[1], to[0]]]);
            setFinalSegment(finalLine);
          } else {
            setFinalSegment(null);
          }

          setFullRoute(routeData);
          setIsInitialRoute(true); // Marcar como ruta inicial

          if (onRouteFound) {
            const instructions = routeData.properties.segments[0].steps || [];
            if (startSegment) {
              instructions.unshift({ instruction: 'Comienza dirigiéndote hacia el camino más cercano.' });
            }
            if (finalSegment) {
              instructions.push({ instruction: 'Continúa directamente hacia el desfibrilador.' });
            }
            onRouteFound({
              coords: routeCoords,
              instructions,
            });
          }

          const initialLayer = L.geoJSON(routeData);
          map.fitBounds(initialLayer.getBounds(), { padding: [50, 50] });
        }
      } catch (error) {
        console.error('Error al obtener la ruta con instrucciones:', error);
        if (onError) {
          onError('No se pudo generar la ruta. Verifica tu conexión o intenta de nuevo.');
        }
      }
    };

    calculateRoute();

    return () => {
      isMounted = false;
      if (remainingPathRef.current) {
        map.removeLayer(remainingPathRef.current);
      }
      if (startSegmentRef.current) {
        map.removeLayer(startSegmentRef.current);
      }
      if (finalSegmentRef.current) {
        map.removeLayer(finalSegmentRef.current);
      }
      setFullRoute(null);
      setStartSegment(null);
      setFinalSegment(null);
      setIsInitialRoute(true);
    };
  }, [from, to, map, onRouteFound, onError]);

  useEffect(() => {
    if (!fullRoute || !userPosition || !onPositionUpdate) return;

    const userPoint = turf.point(userPosition.slice().reverse());
    const nearestPoint = turf.nearestPointOnLine(fullRoute, userPoint, { units: 'meters' });
    const deviationDistance = turf.distance(userPoint, nearestPoint, { units: 'meters' });
    const distanceToDest = getDirectDistance(userPosition, to);

    // Lógica de Snapping
    if (deviationDistance < SNAP_THRESHOLD_METERS) {
      const snappedCoords = turf.getCoord(nearestPoint);
      onPositionUpdate([snappedCoords[1], snappedCoords[0]]); // Leaflet usa [lat, lon]
      setIsInitialRoute(false); // Ya no es la ruta inicial
    } else {
      onPositionUpdate(userPosition);
    }

    // Solo se considera desvío si no es la ruta inicial
    if (!isInitialRoute) {
      if (deviationDistance > DEVIATION_THRESHOLD_METERS) {
        console.log(`Desvío detectado: ${deviationDistance.toFixed(0)}m. Solicitando re-cálculo.`);
        if (onDeviation) {
          onDeviation();
        }
      }
    } else {
      // Primera vez: si el usuario está lejos de la ruta, pero es esperable
      if (deviationDistance > START_SEGMENT_THRESHOLD_METERS) {
        if (onError) {
          onError(`Estás a ${deviationDistance.toFixed(0)} metros del camino más cercano. Acércate o revisa si estás dentro del campus.`);
        }
      }
    }

/*     Swal.fire({
  icon: 'info',
  title: 'Camino no encontrado cerca',
  text: 'Parece que estás lejos de un camino accesible. Intenta acercarte a una vereda o sendero dentro del campus.',
}); */

    // Determinar si mostrar segmento inicial
    const showStartSegment = startSegment && deviationDistance > SNAP_THRESHOLD_METERS;

    // Determinar si mostrar segmento final
    const showFinalSegment = finalSegment && distanceToDest > CLOSE_TO_DEST_THRESHOLD_METERS;

    // Dibujar la ruta restante
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

    // Dibujar el segmento inicial si es necesario
    if (showStartSegment) {
      if (startSegmentRef.current) {
        map.removeLayer(startSegmentRef.current);
      }
      startSegmentRef.current = L.geoJSON(startSegment, { style: styleStartSegment }).addTo(map);
    } else if (startSegmentRef.current) {
      map.removeLayer(startSegmentRef.current);
      startSegmentRef.current = null;
    }

    // Dibujar el segmento final si es necesario
    if (showFinalSegment) {
      if (finalSegmentRef.current) {
        map.removeLayer(finalSegmentRef.current);
      }
      finalSegmentRef.current = L.geoJSON(finalSegment, { style: styleFinalSegment }).addTo(map);
    } else if (finalSegmentRef.current) {
      map.removeLayer(finalSegmentRef.current);
      finalSegmentRef.current = null;
    }
  }, [userPosition, fullRoute, startSegment, finalSegment, map, onDeviation, onPositionUpdate, to]);

  return null;
};

export default ORSRouting;