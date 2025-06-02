import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import BackButton from '../pages/BackButton.jsx';


// Componente para renderizar contenido HTML o texto con saltos de línea
const HtmlRenderer = ({ htmlString }) => {
  if (typeof htmlString !== 'string') {
    return null;
  }
  const containsHTML = (str) => /<([A-Za-z][A-Za-z0-9]*)\b[^>]*>(.*?)<\/\1>/s.test(str);

  if (!containsHTML(htmlString)) {
    const formattedText = htmlString.replace(/\n/g, '<br />');
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
  const [error, setError] = useState(null);
  const [medios, setMedios] = useState({});

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const fetchEducacionContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const [responseContent, responseMedios] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/educacion`),
          axios.get(`${API_BASE_URL}/api/educacion/medios`)
        ]);

        const grouped = responseContent.data.reduce((acc, item) => {
          const category = acc.find(c => c.idCategoria === item.categoria_id);
          const newItem = {
            id: item.id.toString(),
            tituloTema: item.titulo_tema,
            contenidoTema: item.contenido_tema,
            orden_item: item.orden_item || 0,
          };
          if (category) {
            category.items.push(newItem);
          } else {
            acc.push({
              idCategoria: item.categoria_id,
              categoriaNombre: item.categoria_nombre,
              ordenCategoria: item.orden_categoria || 0,
              items: [newItem],
            });
          }
          return acc;
        }, []);

        grouped.sort((a, b) => a.ordenCategoria - b.ordenCategoria);
        grouped.forEach(category => category.items.sort((a, b) => a.orden_item - b.orden_item));

        const mediosMap = responseMedios.data.reduce((acc, medio) => {
          const contenidoIdStr = medio.contenido_id.toString();
          if (!acc[contenidoIdStr]) acc[contenidoIdStr] = [];
          const orden = Number(medio.orden) || 0;
          acc[contenidoIdStr].push({ ...medio, orden });
          return acc;
        }, {});

        Object.keys(mediosMap).forEach(contenidoId => {
          mediosMap[contenidoId].sort((a, b) => a.orden - b.orden);
        });

        setCategoriasEducacion(grouped);
        setMedios(mediosMap);

      } catch (err) {
        console.error("Error fetching educacion content:", err.response ? err.response.data : err.message);
        setError(err.response?.data?.message || err.message || 'No se pudo cargar el contenido educativo en este momento. Intenta de nuevo más tarde.');
        setCategoriasEducacion([]);
        setMedios({});
      } finally {
        setLoading(false);
      }
    };

    fetchEducacionContent();
  }, [API_BASE_URL]);

  const toggleMetronomo = () => {
    if (!audioRef.current) return;
    if (metronomoActivo) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } else {
      audioRef.current.loop = true;
      audioRef.current.play().catch((e) => console.error('Error al reproducir audio del metrónomo:', e));
    }
    setMetronomoActivo(!metronomoActivo);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin fa-3x text-blue-500"></i>
          <p className="text-gray-700 text-lg mt-3">Cargando contenido educativo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-red-50 flex flex-col justify-center items-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <i className="fas fa-exclamation-triangle fa-3x text-red-500 mb-4"></i>
          <h1 className="text-2xl font-bold mb-3 text-red-700">Error al Cargar</h1>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Intentar de Nuevo
          </button>
        </div>
      </div>
    );
  }

  const rcpPasosHardcoded = [
    'Asegura la escena.',
    'Evalúa respuesta.',
    'Pide ayuda y llama al 131. Pide un DEA.',
    'Inicia compresiones torácicas: 100-120 por minuto, 5-6 cm de profundidad.',
    'Si estás entrenado, realiza 30 compresiones y 2 ventilaciones. Si no, solo compresiones continuas.',
    'Continúa hasta que llegue ayuda, la víctima se mueva, o llegue el DEA.'
  ];

  return (

    <div className="relative min-h-screen">
      <BackButton />
      <div className="content-header py-3 md:py-5 bg-slate-50">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-12 text-center">
              <h1 className="m-0 text-3xl md:text-4xl font-bold text-slate-800">
                Educación en Primeros Auxilios y RCP
              </h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content py-5">
        <div className="container-fluid">
          {categoriasEducacion.length === 0 && !loading ? (
            <div className="text-center p-10 bg-white rounded-lg shadow">
              <i className="fas fa-info-circle fa-3x text-blue-400 mb-4"></i>
              <p className="text-gray-600 text-xl">No hay contenido educativo disponible en este momento.</p>
              <p className="text-gray-500 mt-2">Por favor, vuelve a intentarlo más tarde.</p>
            </div>
          ) : (
            categoriasEducacion.map((categoria) => (
              <div key={categoria.idCategoria} className="mb-12 bg-white p-5 md:p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-blue-700 border-b-2 border-blue-200 pb-3">
                  {categoria.categoriaNombre}
                </h2>
                <div className="space-y-8">
                  {categoria.items.map((item, itemIndex) => {
                    const itemMedios = medios[item.id] || [];

                    return (
                      <div key={item.id} className="pb-6 border-b border-gray-200 last:border-b-0 last:pb-0">
                        {item.tituloTema && (
                          <h3 className="text-xl md:text-2xl font-medium text-gray-800 mb-4">
                            {item.tituloTema}
                          </h3>
                        )}
                        <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed">
                          {item.contenidoTema === 'ESPECIAL_METRONOMO_BUTTON' ? (
                            <>
                              <ul className="list-disc ml-6 space-y-2">
                                <li><strong>¡ACTIVAR EMERGENCIAS (131) Y PEDIR DEA!</strong></li>
                                <li>
                                  <button
                                    onClick={toggleMetronomo}
                                    className={`px-4 py-2 text-white rounded text-sm my-3 shadow-md transition-transform transform hover:scale-105 ${
                                      metronomoActivo ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                  >
                                    <i className={`fas ${metronomoActivo ? 'fa-pause' : 'fa-play'} mr-2`}></i>
                                    {metronomoActivo ? 'Detener Metrónomo' : 'Iniciar Metrónomo RCP (100-120 cpm)'}
                                  </button>
                                </li>
                                <li>Iniciar RCP de alta calidad (30 compresiones : 2 ventilaciones o solo compresiones).</li>
                                <li>Usar DEA tan pronto llegue, seguir instrucciones.</li>
                                <li>Continuar hasta que llegue ayuda profesional.</li>
                              </ul>
                              <p className="mt-4">
                                Busca un DEA cercano:
                                <Link
                                  to={user && (user.rol === 'administrador' || user.rol === 'superadministrador') ? "/admin/deas" : "/dea"}
                                  className="ml-2 text-blue-600 underline hover:text-blue-800 font-medium"
                                >
                                  Ver Mapa de DEAs
                                </Link>.
                              </p>
                            </>
                          ) : item.tituloTema === '¿Cómo realizar RCP en Adultos?' && itemMedios.length > 0 && itemMedios.some(m => m.paso_asociado) ? (
                            <>
                              <HtmlRenderer htmlString={item.contenidoTema} />
                              <div className="mt-8 not-prose">
                                <h4 className="text-xl font-bold text-gray-800 mb-6 border-b-2 border-gray-300 pb-2">
                                  Guía Visual Paso a Paso:
                                </h4>
                                <div className="space-y-10">
                                  {rcpPasosHardcoded.map((pasoTexto, indexPaso) => {
                                    const nombrePasoComparable = pasoTexto.split('.')[0].trim().toLowerCase();
                                    const mediosDelPaso = itemMedios
                                      .filter(m =>
                                        m.paso_asociado &&
                                        m.paso_asociado.toLowerCase().startsWith(nombrePasoComparable)
                                      )
                                      .sort((a, b) => a.orden - b.orden);

                                    return (
                                      <div key={indexPaso} className="p-4 bg-slate-100 rounded-lg shadow-md">
                                        <h5 className="font-semibold text-lg text-blue-700 mb-1">
                                          Paso {indexPaso + 1}:
                                        </h5>
                                        <p className="text-gray-700 text-md mb-4 font-medium leading-relaxed">
                                          {pasoTexto}
                                        </p>
                                        {mediosDelPaso.length > 0 ? (
                                          <div className="flex flex-row flex-wrap justify-start gap-4 items-start">
                                            {mediosDelPaso.map((medio, medioIndex) => (
                                              <div
                                                key={medio.id || medioIndex}
                                                className="flex flex-col items-center text-center max-w-[240px] sm:max-w-[300px] w-full"
                                              >
                                                {medio.tipo_medio === 'imagen' ? (
                                                  <img
                                                    src={`${API_BASE_URL}${medio.url_medio}`}
                                                    alt={medio.subtitulo_medio || `Ilustración ${medioIndex + 1} para ${pasoTexto.split('.')[0]}`}
                                                    className="rounded-md object-contain mb-2 shadow-lg w-full"
                                                    style={{ maxHeight: '300px', maxWidth: '100%' }}
                                                    loading="lazy"
                                                  />
                                                ) : medio.tipo_medio === 'video' ? (
                                                  <video
                                                    controls
                                                    className="rounded-md mb-2 shadow-lg w-full"
                                                    style={{ maxHeight: '300px', maxWidth: '100%' }}
                                                    preload="metadata"
                                                  >
                                                    <source src={`${API_BASE_URL}${medio.url_medio}`} type={medio.url_medio.endsWith('.mp4') ? "video/mp4" : (medio.url_medio.endsWith('.mov') ? "video/quicktime" : "")} />
                                                    Tu navegador no soporta el video.
                                                  </video>
                                                ) : null}
                                                {medio.subtitulo_medio && (
                                                  <p className="text-xs sm:text-sm text-gray-700 font-medium mt-1 px-1">
                                                    {medio.subtitulo_medio}
                                                  </p>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-gray-500 italic">No hay material visual para este paso.</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <HtmlRenderer htmlString={item.contenidoTema} />
                              {itemMedios.length > 0 && (
                                <div className="mt-6 not-prose grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {itemMedios
                                    .sort((a, b) => a.orden - b.orden)
                                    .map((medio, medioIndex) => (
                                      <div key={medio.id || medioIndex} className="border p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        {medio.tipo_medio === 'imagen' ? (
                                          <img
                                            src={`${API_BASE_URL}${medio.url_medio}`}
                                            alt={medio.subtitulo_medio || `Medio ${medioIndex + 1} para ${item.tituloTema}`}
                                            className="w-full max-h-96 object-contain rounded-md mb-2"
                                            loading="lazy"
                                          />
                                        ) : medio.tipo_medio === 'video' ? (
                                          <video
                                            controls
                                            className="w-full h-auto rounded-md mb-2"
                                            preload="metadata"
                                            style={{ maxHeight: '300px' }}
                                          >
                                            <source src={`${API_BASE_URL}${medio.url_medio}`} type={medio.url_medio.endsWith('.mp4') ? "video/mp4" : (medio.url_medio.endsWith('.mov') ? "video/quicktime" : "")} />
                                            Tu navegador no soporta el video.
                                          </video>
                                        ) : null}
                                        {medio.paso_asociado && !item.tituloTema.toLowerCase().includes('rcp') && (
                                          <p className="text-xs text-gray-500 mt-1 italic">Asociado a: {medio.paso_asociado}</p>
                                        )}
                                        {medio.subtitulo_medio && (
                                          <p className="text-sm text-gray-600 font-medium mt-1">{medio.subtitulo_medio}</p>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {itemIndex < categoria.items.length - 1 && <hr className="my-8 border-gray-300" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <audio ref={audioRef} src="/assets/metronome.mp3" preload="auto" />
        </div>
      </section>
</div>
  );
};

export default Educacion;