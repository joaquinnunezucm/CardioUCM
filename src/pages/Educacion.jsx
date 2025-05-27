import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Componente para renderizar contenido HTML o texto con saltos de línea
const HtmlRenderer = ({ htmlString }) => {
  const containsHTML = (str) => /<([A-Za-z][A-Za-z0-9]*)\b[^>]*>(.*?)<\/\1>/.test(str);

  if (!containsHTML(htmlString)) {
    const formattedText = htmlString.replace(/\n/g, '<br>');
    return <div dangerouslySetInnerHTML={{ __html: formattedText }} />;
  }
  return <div dangerouslySetInnerHTML={{ __html: htmlString }} />;
};

const Educacion = () => {
  const [metronomoActivo, setMetronomoActivo] = useState(false);
  const audioRef = useRef(null);
  const { user } = useAuth();

  const [categoriasEducacion, setCategoriasEducacion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Cambiado de array a string/null para mejor manejo
  const [medios, setMedios] = useState({}); // Almacena los medios por contenido_id

  useEffect(() => {
    const fetchEducacionContent = async () => {
      setLoading(true);
      setError(null); // Reiniciar error al iniciar la solicitud
      try {
        const [responseContent, responseMedios] = await Promise.all([
          axios.get('http://localhost:3001/api/educacion', {
            headers: { 'Content-Type': 'application/json' }, // Añadir headers explícitos
          }),
          axios.get('http://localhost:3001/api/educacion/medios', {
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);

        console.log('Respuesta de /api/educacion:', responseContent.data);
        console.log('Respuesta de /api/educacion/medios:', responseMedios.data);

        const grouped = responseContent.data.reduce((acc, item) => {
          const category = acc.find(c => c.idCategoria === item.categoria_id);
          if (category) {
            category.items.push({
              id: item.id.toString(),
              tituloTema: item.titulo_tema,
              contenidoTema: item.contenido_tema,
            });
          } else {
            acc.push({
              idCategoria: item.categoria_id,
              categoriaNombre: item.categoria_nombre,
              ordenCategoria: item.orden_categoria,
              items: [{
                id: item.id.toString(),
                tituloTema: item.titulo_tema,
                contenidoTema: item.contenido_tema,
              }],
            });
          }
          return acc;
        }, []);

        grouped.sort((a, b) => a.ordenCategoria - b.ordenCategoria);
        grouped.forEach(category => category.items.sort((a, b) => a.orden_item - b.orden_item));

        // Mapear medios por contenido_id
        const mediosMap = responseMedios.data.reduce((acc, medio) => {
          if (!acc[medio.contenido_id]) acc[medio.contenido_id] = [];
          acc[medio.contenido_id].push(medio);
          return acc;
        }, {});

        setCategoriasEducacion(grouped);
        setMedios(mediosMap);
      } catch (err) {
        console.error("Error fetching educacion content:", err.response ? err.response.data : err.message);
        setError(err.response?.data?.message || err.message || 'No se pudo cargar el contenido educativo en este momento.');
        setCategoriasEducacion([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEducacionContent();
  }, []);

  const toggleMetronomo = () => {
    if (!audioRef.current) return;
    if (metronomoActivo) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } else {
      audioRef.current.loop = true;
      audioRef.current.play().catch((e) => console.error('Error al reproducir audio:', e));
    }
    setMetronomoActivo(!metronomoActivo);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex justify-center items-center">
        <p className="text-gray-700 text-lg">Cargando contenido educativo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-red-50">
        <h1 className="text-2xl font-bold mb-4 text-red-800 text-center">Error</h1>
        <p className="text-red-700 text-center">{error}</p>
        <p className="text-gray-600 text-center mt-2">Por favor, verifica tu conexión o intenta de nuevo más tarde.</p>
      </div>
    );
  }

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-12 text-center">
              <h1 className="m-0 text-3xl md:text-4xl font-bold text-gray-800">Educación</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {categoriasEducacion.length === 0 && !loading ? (
            <p className="text-center text-gray-600 text-lg">No hay contenido educativo disponible en este momento.</p>
          ) : (
            categoriasEducacion.map((categoria) => (
              <div key={categoria.idCategoria} className="mb-10 bg-white p-4 md:p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-blue-700 border-b-2 border-blue-100 pb-3 text-center md:text-left">
                  {categoria.categoriaNombre}
                </h2>
                <div className="max-w-none md:max-w-4xl mx-auto space-y-6">
                  {categoria.items.map((item, itemIndex) => (
                    <div key={item.id} className="pb-4">
                      {item.tituloTema && (
                        <h3 className="text-xl md:text-2xl font-medium text-gray-800 mb-3">
                          {item.tituloTema}
                        </h3>
                      )}
                      <div className="text-gray-700 text-sm md:text-base leading-relaxed">
                        {item.contenidoTema === 'ESPECIAL_METRONOMO_BUTTON' ? (
                          <>
                            <ul className="list-disc ml-6 space-y-2 text-sm text-gray-700 leading-relaxed">
                              <li><strong>¡ACTIVAR EMERGENCIAS (131) Y PEDIR DEA!</strong></li>
                              <li>
                                <button
                                  onClick={toggleMetronomo}
                                  className={`px-4 py-2 text-white rounded text-sm my-3 ${
                                    metronomoActivo ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                                  }`}
                                >
                                  {metronomoActivo ? 'Detener Metrónomo' : 'Iniciar Metrónomo RCP (100-120 cpm)'}
                                </button>
                              </li>
                              <li>Iniciar RCP de alta calidad (30 compresiones : 2 ventilaciones o solo compresiones).</li>
                              <li>Usar DEA tan pronto llegue, seguir instrucciones.</li>
                              <li>Continuar hasta que llegue ayuda profesional.</li>
                            </ul>
                            <p className="mt-3 text-gray-700 leading-relaxed">
                              Busca un DEA cercano:
                              <Link
                                to={user && (user.rol === 'administrador' || user.rol === 'superadministrador') ? "/admin/deas" : "/dea"}
                                className="text-blue-600 underline hover:text-blue-800"
                              >
                                Ver Mapa de DEAs
                              </Link>.
                            </p>
                          </>
                        ) : item.tituloTema === '¿Cómo realizar RCP en Adultos?' ? (
                          <>
                            <HtmlRenderer htmlString={item.contenidoTema} />
                            {medios[item.id] && medios[item.id].length > 0 && (
                              <div className="mt-4">
                                <ol className="list-decimal ml-6 space-y-4">
                                  {[
                                    'Asegura la escena.',
                                    'Evalúa respuesta.',
                                    'Pide ayuda y llama al 131. Pide un DEA.',
                                    'Inicia compresiones torácicas: 100-120 por minuto, 5-6 cm de profundidad.',
                                    'Si estás entrenado, realiza 30 compresiones y 2 ventilaciones. Si no, solo compresiones continuas.',
                                    'Continúa hasta que llegue ayuda, la víctima se mueva, o llegue el DEA.'
                                  ].map((paso, index) => (
                                    <li key={index} className="text-gray-700">
                                      {paso}
                                      {medios[item.id].filter(m => m.paso_asociado === paso.split('.')[0].trim()).map((medio, medioIndex) => (
                                        medio.tipo_medio === 'imagen' ? (
                                          <img
                                            key={medioIndex}
                                            src={`http://localhost:3001${medio.url_medio}`}
                                            alt={`Imagen ${medioIndex + 1} para ${paso.split('.')[0]}`}
                                            className="img-fluid mt-2"
                                            style={{ maxWidth: '200px', maxHeight: '200px', marginRight: '10px' }}
                                          />
                                        ) : (
                                          <video
                                            key={medioIndex}
                                            controls
                                            className="img-fluid mt-2"
                                            style={{ maxWidth: '300px', maxHeight: '200px', marginRight: '10px' }}
                                          >
                                            <source src={`http://localhost:3001${medio.url_medio}`} type="video/mp4" />
                                            Tu navegador no soporta el video.
                                          </video>
                                        )
                                      ))}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </>
                        ) : (
                          <HtmlRenderer htmlString={item.contenidoTema} />
                        )}
                      </div>
                      {itemIndex < categoria.items.length - 1 && <hr className="my-6 border-gray-300" />}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <audio ref={audioRef} src="/assets/metronome.mp3" preload="auto" />
        </div>
      </section>
    </>
  );
};

export default Educacion;