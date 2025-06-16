import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { useMap } from 'react-leaflet';

const RoutingControl = ({
  from,
  to,
  distanciaAviso = 50,         // metros para decir la instrucción
  distanciaRecalculo = 100      // metros fuera de la ruta para recalcular
}) => {
  const map = useMap();
  const routingControlRef = useRef(null);
  const instruccionesRef = useRef([]);
  const destinoFinalRef = useRef(to);
  const [watchId, setWatchId] = useState(null);
  const pasosYaLeidos = useRef(new Set());

  // Calcular distancia entre dos coordenadas
  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Crear o recrear la ruta
  const crearRuta = (desde, hasta) => {
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    const control = L.Routing.control({
      waypoints: [
        L.latLng(desde[0], desde[1]),
        L.latLng(hasta[0], hasta[1]),
      ],
      createMarker: (i, wp, n) => {
        if (i === 0) return null; // ❌ No mostrar marcador de inicio (usuario)
        return L.marker(wp.latLng); // ✅ Mostrar marcador destino (DEA)
      },
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: { styles: [{ color: '#007bff', weight: 5 }] },
      show: false,
      language: 'es',
    }).addTo(map);
    routingControlRef.current = control;

    control.on('routeselected', (e) => {
      instruccionesRef.current = e.route.instructions;
      pasosYaLeidos.current.clear();

      // ✅ Dar inmediatamente la primera instrucción más cercana
      if (e.route.instructions.length > 0) {
        const primerPaso = e.route.instructions[0];
        const texto = `Iniciando ruta. En ${Math.round(primerPaso.distance)} metros, ${primerPaso.text}`;
        const utter = new window.SpeechSynthesisUtterance(texto);
        utter.lang = 'es-ES';
        utter.rate = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
        pasosYaLeidos.current.add(0); // Marcar como leído
      }
    });
  };

  useEffect(() => {
    if (!from || !to) return;

    destinoFinalRef.current = to;
    crearRuta(from, to);

    if (watchId) navigator.geolocation.clearWatch(watchId);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const instrucciones = instruccionesRef.current;

        if (instrucciones.length === 0) return;

        let pasoMasCercano = null;
        let menorDistancia = Infinity;
        let indicePaso = -1;

        instrucciones.forEach((paso, idx) => {
          const dist = calcularDistancia(latitude, longitude, paso.lat, paso.lng);
          if (dist < menorDistancia) {
            menorDistancia = dist;
            pasoMasCercano = paso;
            indicePaso = idx;
          }
        });

        if (
          pasoMasCercano &&
          menorDistancia <= distanciaAviso &&
          !pasosYaLeidos.current.has(indicePaso)
        ) {
          const texto = `En ${Math.round(menorDistancia)} metros, ${pasoMasCercano.text}`;
          const utter = new window.SpeechSynthesisUtterance(texto);
          utter.lang = 'es-ES';
          utter.rate = 1;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);

          pasosYaLeidos.current.add(indicePaso);
        }

        // ✅ Detectar si llegó al destino
        const ultima = instrucciones[instrucciones.length - 1];
        const distanciaFinal = calcularDistancia(latitude, longitude, ultima.lat, ultima.lng);

        if (distanciaFinal <= distanciaAviso && !pasosYaLeidos.current.has('final')) {
          const utter = new window.SpeechSynthesisUtterance('Has llegado a tu destino.');
          utter.lang = 'es-ES';
          utter.rate = 1;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
          pasosYaLeidos.current.add('final');
        }

        if (
              pasoMasCercano &&
              menorDistancia > distanciaRecalculo &&
              !pasosYaLeidos.current.has('recalculado')
            ) {
              crearRuta([latitude, longitude], destinoFinalRef.current);
              pasosYaLeidos.current.clear();
              pasosYaLeidos.current.add('recalculado'); // evitar recursividad inmediata
          }
      },
      (error) => {
        console.error('Error de ubicación en tiempo real:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    setWatchId(id);

    return () => {
      if (routingControlRef.current) map.removeControl(routingControlRef.current);
      if (watchId) navigator.geolocation.clearWatch(watchId);
      window.speechSynthesis.cancel();
    };
  }, [from, to, map, distanciaAviso, distanciaRecalculo]);

  return null;
};

export default RoutingControl;
