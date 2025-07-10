import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import axios from 'axios';

const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const DEVIATION_THRESHOLD_METERS = 100; // Umbral de desvío en metros
const SNAP_THRESHOLD_METERS = 20; // Umbral para pegar el marcador a la ruta (en metros)
const START_SEGMENT_THRESHOLD_METERS = 50; // Umbral para segmento inicial (en metros)
const FINAL_SEGMENT_THRESHOLD_METERS = 50; // Umbral para segmento final (en metros)
const CLOSE_TO_DEST_THRESHOLD_METERS = 5; // Umbral para considerar que el usuario está cerca del DEA (en metros)

const styleRemaining = {
  color: '#007bff',
  weight: 6,
  opacity: 0.85,
};

const styleStartSegment = {
  color: '#ffc107',
  weight: 6,
  opacity: 0.85,
  dashArray: '5, 5', // Línea discontinua para segmento inicial
};

const styleFinalSegment = {
  color: '#28a745',
  weight: 6,
  opacity: 0.85,
  dashArray: '5, 5', // Línea discontinua para segmento final
};

const ORSRouting = ({ from, to, userPosition, onRouteFound, onDeviation, onPositionUpdate, onError }) => {
  const map = useMap();
  const remainingPathRef = useRef(null);
  const startSegmentRef = useRef(null);
  const finalSegmentRef = useRef(null);
  const [fullRoute, setFullRoute] = useState(null);
  const [startSegment, setStartSegment] = useState(null);
  const [finalSegment, setFinalSegment] = useState(null);

  // Función para calcular la distancia directa
  const getDirectDistance = (from, to) => {
    const fromPoint = turf.point([from[1], from[0]]);
    const toPoint = turf.point([to[1], to[0]]);
    return turf.distance(fromPoint, toPoint, { units: 'meters' });
  };

  // Función para consultar caminos peatonales con Overpass
  const checkPedestrianPaths = async (from, to) => {
    const radius = Math.max(100, getDirectDistance(from, to) * 1.5); // Radio más amplio para mayor precisión
    const query = `
      [out:json];
      way(around:${radius},${from[0]},${from[1]})["highway"~"footway|path|steps"];
      way(around:${radius},${to[0]},${to[1]})["highway"~"footway|path|steps"];
      out geom;
    `;
    try {
      const response = await axios.post(OVERPASS_API_URL, query, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const elements = response.data.elements;
      return elements.length > 0;
    } catch (error) {
      console.error('Error en consulta Overpass para caminos peatonales:', error.message, error.response?.data);
      if (onError) {
        onError('No se pudo verificar caminos peatonales. Intenta de nuevo.');
      }
      return false; // Asumir que no hay caminos si falla
    }
  };

  // Función para verificar obstáculos en un segmento
  const checkObstacles = async (start, end) => {
    const line = turf.lineString([[start[1], start[0]], [end[1], end[0]]]);
    const bbox = turf.bbox(line);
    const query = `
      [out:json];
      (
        way["barrier"~"fence|wall|gate"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
        way["building"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
        way["natural"~"water"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
      );
      out geom;
    `;
    try {
      const response = await axios.post(OVERPASS_API_URL, query, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const elements = response.data.elements;
      return elements.length > 0;
    } catch (error) {
      console.error('Error en consulta Overpass para obstáculos:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (onError) {
        onError('No se pudo verificar obstáculos. Intenta de nuevo.');
      }
      return true; // Asumir obstáculos si falla (por seguridad)
    }
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

      const hasPedestrianPaths = await checkPedestrianPaths(from, to);

      if (!hasPedestrianPaths) {
        if (onError) {
          onError('No se encontraron caminos peatonales entre tu posición y el desfibrilador.');
        }
        return;
      }

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
            preference: 'shortest', // Priorizar la ruta más corta
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
          let startLine = null;
          if (distanceFromStart > 5 && distanceFromStart < START_SEGMENT_THRESHOLD_METERS) {
            const hasStartObstacles = await checkObstacles(from, [firstCoord[1], firstCoord[0]]);
            if (!hasStartObstacles) {
              startLine = turf.lineString([[from[1], from[0]], firstCoord]);
              setStartSegment(startLine);
            } else {
              if (onError) {
                onError('El segmento inicial cruza obstáculos. Intenta moverte hacia un camino accesible.');
              }
              setStartSegment(null);
            }
          } else {
            setStartSegment(null);
          }

          // Verificar segmento final
          const lastCoord = routeCoords[routeCoords.length - 1];
          const distanceToDest = getDirectDistance([lastCoord[1], lastCoord[0]], to);
          let finalLine = null;
          if (distanceToDest > 5 && distanceToDest < FINAL_SEGMENT_THRESHOLD_METERS) {
            const hasFinalObstacles = await checkObstacles([lastCoord[1], lastCoord[0]], to);
            if (!hasFinalObstacles) {
              finalLine = turf.lineString([lastCoord, [to[1], to[0]]]);
              setFinalSegment(finalLine);
            } else {
              if (onError) {
                onError('El segmento final cruza obstáculos. Intenta seguir la ruta principal hasta el final.');
              }
              setFinalSegment(null);
            }
          } else {
            setFinalSegment(null);
          }

          setFullRoute(routeData);

          if (onRouteFound) {
            const instructions = routeData.properties.segments[0].steps;
            if (startLine) {
              instructions.unshift({ instruction: 'Comienza dirigiéndote hacia el camino más cercano.' });
            }
            if (finalLine) {
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
    } else {
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