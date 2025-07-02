import { useEffect } from 'react';

// Tu clave API de OpenRouteService. Es seguro dejarla aquí en el frontend
// ya que ORS espera que se use de esta manera desde el lado del cliente.
const ORS_API_KEY = '5b3ce3597851110001cf624849960ceb731a42759d662c6119008731';

/**
 * Componente "headless" (sin interfaz visual) que calcula una ruta usando OpenRouteService.
 * Su única responsabilidad es hacer la llamada a la API y devolver el resultado a su componente padre.
 *
 * @param {object} props - Propiedades del componente.
 * @param {number[]} props.from - Coordenadas de inicio [latitud, longitud].
 * @param {number[]} props.to - Coordenadas de destino [latitud, longitud].
 * @param {function} props.onRouteCalculated - Callback que se ejecuta con los datos de la ruta calculada (o null si hay un error).
 */
const ORSRouting = ({ from, to, onRouteCalculated }) => {

  useEffect(() => {
    // No hacemos nada si no tenemos un punto de inicio o de fin.
    if (!from || !to) return;

    const fetchRoute = async () => {
      try {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
          },
          body: JSON.stringify({
            coordinates: [
              [from[1], from[0]], // ORS espera el formato [longitud, latitud]
              [to[1], to[0]]
            ]
          })
        });

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(`Error de ORS: ${errorBody?.error?.message || response.statusText}`);
        }
        
        const data = await response.json();

        // Si la API devuelve una ruta válida...
        if (data && data.features && data.features.length > 0) {
          // ...llamamos al callback del padre y le pasamos la ruta completa.
          if (onRouteCalculated) {
            onRouteCalculated(data.features[0]);
          }
        } else {
          // Si no hay ruta, notificamos al padre con null.
          console.warn("ORS no devolvió ninguna ruta para las coordenadas dadas.");
          if (onRouteCalculated) {
            onRouteCalculated(null);
          }
        }
      } catch (error) {
        console.error("Error al obtener la ruta desde OpenRouteService:", error);
        // En caso de cualquier otro error, también notificamos al padre con null.
        if (onRouteCalculated) {
          onRouteCalculated(null);
        }
      }
    };

    fetchRoute();

  // Las dependencias del efecto aseguran que solo se ejecute cuando cambie el
  // punto de inicio, el de fin, o la función callback.
  }, [from, to, onRouteCalculated]);

  // Este componente no renderiza nada visualmente, por lo que devuelve null.
  return null;
};

export default ORSRouting;