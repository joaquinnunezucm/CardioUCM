import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import axios from 'axios';

const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const DEVIATION_THRESHOLD_METERS = 100; // Umbral de desvío en metros
const SNAP_THRESHOLD_METERS = 20; // Umbral para pegar el marcador a la ruta (en metros)
const DIRECT_PATH_THRESHOLD_METERS = 200; // Umbral para considerar ruta directa (en metros)
const START_SEGMENT_THRESHOLD_METERS = 50; // Umbral para segmento inicial (en metros)
const FINAL_SEGMENT_THRESHOLD_METERS = 50; // Umbral para segmento final (en metros)
const ROUTE_LENGTH_RATIO_THRESHOLD = 2; // Umbral para considerar la ruta de ORS "extremadamente larga"

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

const ORSRouting = ({ from, to, userPosition, onRouteFound, onDeviation, onPositionUpdate }) => {
  const map = useMap();
  const remainingPathRef = useRef(null);
  const startSegmentRef = useRef(null);
  const finalSegmentRef = useRef(null);
  const [fullRoute, setFullRoute] = useState(null);
  const [useDirectPath, setUseDirectPath] = useState(false);
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
    const radius = Math.max(50, getDirectDistance(from, to)); // Radio dinámico
    const query = `
      [out:json];
      way(around:${radius},${from[0]},${from[1]})["highway"~"footway|path"];
      way(around:${radius},${to[0]},${to[1]})["highway"~"footway|path"];
      out geom;
    `;
    try {
      const response = await axios.post(OVERPASS_API_URL, query, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const elements = response.data.elements;
      return elements.length > 0; // Retorna true si hay caminos peatonales
    } catch (error) {
      console.error('Error en consulta Overpass:', error);
      return false; // Asumir que no hay caminos si falla la consulta
    }
  };

  // Función para verificar obstáculos con Overpass
  const checkObstacles = async (from, to) => {
    const line = turf.lineString([[from[1], from[0]], [to[1], to[0]]]);
    const bbox = turf.bbox(line);
    const query = `
      [out:json];
      (
        way["barrier"~"fence|wall"](bbox:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
        way["building"](bbox:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
        way["natural"~"water"](bbox:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
      );
      out geom;
    `;
    try {
      const response = await axios.post(OVERPASS_API_URL, query, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const elements = response.data.elements;
      return elements.length > 0; // Retorna true si hay obstáculos
    } catch (error) {
      console.error('Error en consulta Overpass para obstáculos:', error);
      return true; // Asumir obstáculos si falla la consulta (por seguridad)
    }
  };

  useEffect(() => {
    if (!from || !to) return;
    let isMounted = true;

    const calculateRoute = async () => {
      const directDistance = getDirectDistance(from, to);
      const hasPedestrianPaths = await checkPedestrianPaths(from, to);
      const hasObstacles = await checkObstacles(from, to);

      // Decidir si usar ruta directa
      if (
        directDistance < DIRECT_PATH_THRESHOLD_METERS &&
        !hasObstacles &&
        (!hasPedestrianPaths || directDistance < 50)
      ) {
        setUseDirectPath(true);
        const directLine = turf.lineString([[from[1], from[0]], [to[1], to[0]]]);
        setFullRoute(directLine);
        setStartSegment(null);
        setFinalSegment(null);

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
            const routeCoords = turf.getCoords(routeData);
            const routeLength = turf.length(routeData, { units: 'meters' });

            // Verificar si la ruta es extremadamente larga
            const isRouteTooLong = routeLength > directDistance * ROUTE_LENGTH_RATIO_THRESHOLD;

            if (isRouteTooLong && !hasObstacles) {
              setUseDirectPath(true);
              const directLine = turf.lineString([[from[1], from[0]], [to[1], to[0]]]);
              setFullRoute(directLine);
              setStartSegment(null);
              setFinalSegment(null);

              if (onRouteFound) {
                onRouteFound({
                  coords: turf.getCoords(directLine),
                  instructions: [{ instruction: 'Dirígete directamente al destino, ya que la ruta alternativa es muy larga.' }],
                });
              }

              const initialLayer = L.geoJSON(directLine, { style: styleDirectPath });
              map.fitBounds(initialLayer.getBounds(), { padding: [50, 50] });
            } else {
              // Verificar inicio y fin de la ruta
              const firstCoord = routeCoords[0];
              const distanceFromStart = getDirectDistance([firstCoord[1], firstCoord[0]], from);
              if (distanceFromStart > 5 && distanceFromStart < START_SEGMENT_THRESHOLD_METERS) {
                const startLine = turf.lineString([[from[1], from[0]], firstCoord]);
                setStartSegment(startLine);
              } else {
                setStartSegment(null);
              }

              const lastCoord = routeCoords[routeCoords.length - 1];
              const distanceToDest = getDirectDistance([lastCoord[1], lastCoord[0]], to);
              if (distanceToDest > 5 && distanceToDest < FINAL_SEGMENT_THRESHOLD_METERS) {
                const finalLine = turf.lineString([lastCoord, [to[1], to[0]]]);
                setFinalSegment(finalLine);
              } else {
                setFinalSegment(null);
              }

              setFullRoute(routeData);

              if (onRouteFound) {
                const instructions = routeData.properties.segments[0].steps;
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
          }
        } catch (error) {
          console.error("Error al obtener la ruta con instrucciones:", error);
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

    // Dibujar el segmento inicial si existe
    if (startSegment && !useDirectPath) {
      if (startSegmentRef.current) {
        map.removeLayer(startSegmentRef.current);
      }
      startSegmentRef.current = L.geoJSON(startSegment, { style: styleStartSegment }).addTo(map);
    }

    // Dibujar el segmento final si existe
    if (finalSegment && !useDirectPath) {
      if (finalSegmentRef.current) {
        map.removeLayer(finalSegmentRef.current);
      }
      finalSegmentRef.current = L.geoJSON(finalSegment, { style: styleFinalSegment }).addTo(map);
    }
  }, [userPosition, fullRoute, startSegment, finalSegment, map, onDeviation, onPositionUpdate, useDirectPath]);

  return null;
};

export default ORSRouting;