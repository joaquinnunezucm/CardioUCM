import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';

const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';
const DEVIATION_THRESHOLD_METERS = 100; // Umbral de desvío en metros
const SNAP_THRESHOLD_METERS = 20; // Umbral para pegar el marcador a la ruta (en metros)
const DIRECT_PATH_THRESHOLD_METERS = 200; // Umbral para usar ruta directa (en metros)
const FINAL_SEGMENT_THRESHOLD_METERS = 50; // Umbral para añadir segmento final al DEA (en metros)

const styleRemaining = {
  color: '#007bff',
  weight: 6,
  opacity: 0.85,
};

const styleDirectPath = {
  color: '#ff5733',
  weight: 6,
  opacity: 0.85,
  dashArray: '10, 10', // Línea discontinua para ruta directa
};

const styleFinalSegment = {
  color: '#28a745',
  weight: 6,
  opacity: 0.85,
  dashArray: '5, 5', // Línea discontinua diferente para segmento final
};

const ORSRouting = ({ from, to, userPosition, onRouteFound, onDeviation, onPositionUpdate }) => {
  const map = useMap();
  const remainingPathRef = useRef(null);
  const finalSegmentRef = useRef(null);
  const [fullRoute, setFullRoute] = useState(null);
  const [useDirectPath, setUseDirectPath] = useState(false);
  const [finalSegment, setFinalSegment] = useState(null);

  // Función para calcular la distancia directa
  const getDirectDistance = (from, to) => {
    const fromPoint = turf.point([from[1], from[0]]);
    const toPoint = turf.point([to[1], to[0]]);
    return turf.distance(fromPoint, toPoint, { units: 'meters' });
  };

  useEffect(() => {
    if (!from || !to) return;
    let isMounted = true;

    // Determinar si usar ruta directa
    const directDistance = getDirectDistance(from, to);
    if (directDistance < DIRECT_PATH_THRESHOLD_METERS) {
      setUseDirectPath(true);
      const directLine = turf.lineString([[from[1], from[0]], [to[1], to[0]]]);
      setFullRoute(directLine);
      setFinalSegment(null); // No se necesita segmento final en ruta directa

      if (onRouteFound) {
        onRouteFound({
          coords: turf.getCoords(directLine),
          instructions: [{ instruction: 'Dirígete directamente al destino.' }],
        });
      }

      const initialLayer = L.geoJSON(directLine, { style: styleDirectPath });
      map.fitBounds(initialLayer.getBounds(), { padding: [50, 50] });
    } else {
      setUseDirectPath(false);
      const fetchRoute = async () => {
        try {
          const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
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
            }),
          });

          if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Error de ORS: ${errorBody?.error?.message || response.statusText}`);
          }

          const data = await response.json();

          if (isMounted && data.features && data.features.length > 0) {
            const routeData = data.features[0];
            setFullRoute(routeData);

            // Verificar si la última coordenada de ORS está cerca del destino
            const routeCoords = turf.getCoords(routeData);
            const lastCoord = routeCoords[routeCoords.length - 1];
            const distanceToDest = getDirectDistance([lastCoord[1], lastCoord[0]], to);
            if (distanceToDest > 5 && distanceToDest < FINAL_SEGMENT_THRESHOLD_METERS) {
              // Añadir segmento final si la distancia es significativa pero dentro del umbral
              const finalLine = turf.lineString([lastCoord, [to[1], to[0]]]);
              setFinalSegment(finalLine);
            } else {
              setFinalSegment(null);
            }

            if (onRouteFound) {
              const instructions = routeData.properties.segments[0].steps;
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
          console.error("Error al obtener la ruta con instrucciones:", error);
        }
      };

      fetchRoute();
    }

    return () => {
      isMounted = false;
      if (remainingPathRef.current) {
        map.removeLayer(remainingPathRef.current);
      }
      if (finalSegmentRef.current) {
        map.removeLayer(finalSegmentRef.current);
      }
      setFullRoute(null);
      setFinalSegment(null);
    };
  }, [from, to, map, onRouteFound]);

  useEffect(() => {
    if (!fullRoute || !userPosition || !onPositionUpdate) return;

    const userPoint = turf.point(userPosition.slice().reverse());
    const nearestPoint = turf.nearestPointOnLine(fullRoute, userPoint, { units: 'meters' });
    const deviationDistance = turf.distance(userPoint, nearestPoint, { units: 'meters' });

    // Lógica de Snapping
    if (deviationDistance < SNAP_THRESHOLD_METERS) {
      const snappedCoords = turf.getCoord(nearestPoint);
      onPositionUpdate([snappedCoords[1], snappedCoords[0]]); // Leaflet usa [lat, lon]
    } else {
      onPositionUpdate(userPosition);
    }

    // Lógica de Re-cálculo
    if (deviationDistance > DEVIATION_THRESHOLD_METERS && !useDirectPath) {
      console.log(`Desvío detectado: ${deviationDistance.toFixed(0)}m. Solicitando re-cálculo.`);
      if (onDeviation) {
        onDeviation();
      }
      return;
    }

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
    remainingPathRef.current = L.geoJSON(remainingLine, {
      style: useDirectPath ? styleDirectPath : styleRemaining,
    }).addTo(map);

    // Dibujar el segmento final si existe
    if (finalSegment && !useDirectPath) {
      if (finalSegmentRef.current) {
        map.removeLayer(finalSegmentRef.current);
      }
      finalSegmentRef.current = L.geoJSON(finalSegment, { style: styleFinalSegment }).addTo(map);
    }
  }, [userPosition, fullRoute, finalSegment, map, onDeviation, onPositionUpdate, useDirectPath]);

  return null;
};

export default ORSRouting;