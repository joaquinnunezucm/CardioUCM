import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { useMap } from 'react-leaflet';

const RoutingControl = ({ from, to }) => {
  const map = useMap();

  useEffect(() => {
    if (!from || !to) return;

    const instance = L.Routing.control({
      waypoints: [
        L.latLng(from[0], from[1]),
        L.latLng(to[0], to[1]),
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: { styles: [{ color: '#007bff', weight: 5 }] },
      show: false,
      language: 'es',
    }).addTo(map);

    // Guía por voz: lee las instrucciones de la ruta cuando se selecciona
    instance.on('routeselected', function (e) {
      const instructions = e.route.instructions;
      if ('speechSynthesis' in window && instructions && instructions.length > 0) {
        // Lee cada instrucción con un pequeño retardo entre ellas
        let delay = 0;
        instructions.forEach((instr, idx) => {
          setTimeout(() => {
            const utter = new window.SpeechSynthesisUtterance(instr.text);
            utter.lang = 'es-ES';
            window.speechSynthesis.speak(utter);
          }, delay);
          delay += 3500; // 3.5 segundos entre instrucciones (ajusta según necesidad)
        });
      }
    });

    return () => {
      map.removeControl(instance);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [from, to, map]);

  return null;
};

export default RoutingControl;