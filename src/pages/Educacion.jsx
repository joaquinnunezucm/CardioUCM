import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import BackButton from '../pages/BackButton.jsx';
import { API_BASE_URL } from '../utils/api';

const HtmlRenderer = ({ htmlString }) => {
  if (typeof htmlString !== 'string') return null;

  const containsHTML = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*>(.*?)<\/\1>/s.test(htmlString);
  const formattedText = containsHTML ? htmlString : htmlString.replace(/\n/g, '<br />');

  return <div dangerouslySetInnerHTML={{ __html: formattedText }} />;
};

const Educacion = () => {
  const [metronomoActivo, setMetronomoActivo] = useState(false);
  const [categoriasEducacion, setCategoriasEducacion] = useState([]);
  const [medios, setMedios] = useState({});
  const [openCategories, setOpenCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEducacionContent = async () => {
      try {
        setLoading(true);
        const [responseContent, responseMedios] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/educacion`),
          axios.get(`${API_BASE_URL}/api/educacion/medios`),
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
          acc[contenidoIdStr] = acc[contenidoIdStr] || [];
          acc[contenidoIdStr].push({ ...medio, orden: Number(medio.orden) || 0 });
          return acc;
        }, {});

        Object.keys(mediosMap).forEach(contenidoId => {
          mediosMap[contenidoId].sort((a, b) => a.orden - b.orden);
        });

        setCategoriasEducacion(grouped);
        setMedios(mediosMap);
        setOpenCategories(grouped.reduce((acc, cat) => ({
          ...acc,
          [cat.idCategoria]: true,
        }), {}));
      } catch (err) {
        setError(err.response?.data?.message || 'No se pudo cargar el contenido educativo.');
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
    }
    setMetronomoActivo(!metronomoActivo);
  };

  const toggleCategory = (idCategoria) => {
    setOpenCategories(prev => ({
      ...prev,
      [idCategoria]: !prev[idCategoria],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-xl">
          <i className="fas fa-spinner fa-spin fa-3x text-blue-500"></i>
          <p className="text-gray-800 text-lg mt-3">Cargando contenido educativo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <i className="fas fa-exclamation-triangle fa-3x text-red-500 mb-4"></i>
          <h1 className="text-3xl font-bold mb-3 text-red-700 break-words">Error al Cargar</h1>
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-full font-bold shadow-xl hover:bg-blue-600 transition-transform transform hover:scale-105"
          >
            Intentar de Nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <BackButton />
    
      <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
        <div className="content-header p-4 bg-white rounded-lg shadow-xl mb-6">
          <div className="row mb-2">
            <div className="col-sm-12 text-center">
              <h1 className="m-0 text-2xl sm:text-3xl md:text-4xl font-bold text-blue-800 border-b-2 border-blue-200 pb-2 break-words">
                  Educación en Primeros Auxilios y RCP
                </h1>
              </div>
            </div>
        </div>
        <section className="content">
          <div>
            {categoriasEducacion.length === 0 ? (
              <div className="text-center p-10 bg-white rounded-lg shadow-xl">
                <i className="fas fa-info-circle fa-3x text-blue-400 mb-4"></i>
                <p className="text-gray-800 text-xl">No hay contenido educativo disponible.</p>
                <p className="text-gray-600 mt-2 text-base">Vuelve a intentarlo más tarde.</p>
              </div>
            ) : (
              categoriasEducacion.map((categoria) => (
                <div key={categoria.idCategoria} className="mb-6">
                  <button
                    onClick={() => toggleCategory(categoria.idCategoria)}
                    className="w-full text-left p-4 bg-white rounded-lg shadow-xl flex justify-between items-center hover:bg-gray-50 transition-colors"
                    aria-label={`Alternar ${categoria.categoriaNombre}`}
                  >
                    <h2 className="text-2xl md:text-3xl font-semibold mb-2 text-blue-600 border-b-2 border-blue-200 pb-2 break-words">
                    {categoria.categoriaNombre}
                  </h2>
                    <i className={`fas fa-chevron-${openCategories[categoria.idCategoria] ? 'up' : 'down'} text-blue-600 text-lg`}></i>
                  </button>
                  {openCategories[categoria.idCategoria] && (
                    <div className="bg-white p-4 md:p-6 mt-1 rounded-b-lg shadow-xl">
                      <div className="space-y-8">
                        {categoria.items.map((item) => {
                          const itemMedios = medios[item.id] || [];

                          return (
                            <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              {item.tituloTema && (
                                <h3 className="text-lg md:text-xl font-medium text-gray-800 mb-4 break-words">
                                  {item.tituloTema}
                                </h3>
                              )}
                              <div className="text-base text-gray-800 leading-relaxed break-words">
                                {item.contenidoTema === 'ESPECIAL_METRONOMO_BUTTON' ? (
                                  <>
                                    <ul className="list-disc ml-6 space-y-2">
                                      <li><strong>¡ACTIVAR EMERGENCIAS (131) Y PEDIR DEA!</strong></li>
                                      <li>
                                        <button
                                          onClick={toggleMetronomo}
                                          className={`flex items-center px-4 py-2 text-white rounded-full text-base font-bold shadow-xl transition-transform transform hover:scale-105 ${metronomoActivo ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-600 hover:bg-red-700'}`}
                                          aria-label={metronomoActivo ? 'Detener el metrónomo' : 'Iniciar el metrónomo para RCP'}
                                        >
                                          <i className={`fas fa-heartbeat mr-2 ${metronomoActivo ? 'animate-pulse' : ''}`}></i>
                                          {metronomoActivo ? 'Detener Metrónomo' : 'Iniciar Metrónomo RCP (100-120 cpm)'}
                                        </button>
                                      </li>
                                      <li>Iniciar RCP de alta calidad (30 compresiones : 2 ventilaciones).</li>
                                      <li>Usar DEA tan pronto llegue, seguir instrucciones.</li>
                                      <li>Continúa hasta que llegue ayuda profesional.</li>
                                    </ul>
                                    <p className="mt-4">
                                      Busca un DEA cercano:
                                      <Link
                                        to={user?.rol === 'administrador' || user?.rol === 'superadministrador' ? '/admin/deas' : '/dea'}
                                        className="ml-2 text-blue-600 underline hover:text-blue-800 font-medium"
                                      >
                                        Ver Mapa de DEAs
                                      </Link>.
                                    </p>
                                  </>
                                ) : item.tituloTema === '¿Cómo realizar RCP en Adultos?' && itemMedios.some(m => m.paso_asociado) ? (
                                  <>
                                    <HtmlRenderer htmlString={item.contenidoTema} />
                                    <div className="mt-8">
                                      <h4 className="text-lg font-semibold text-gray-800 mb-5 border-b-2 border-gray-300 pb-2 break-words">
                                        Guía Visual Paso a Paso
                                      </h4>
                                      <div className="space-y-8">
                                        {itemMedios
                                          .filter(m => m.paso_asociado)
                                          .sort((a, b) => a.orden - b.orden)
                                          .reduce((acc, medio) => {
                                            const pasoTexto = medio.paso_asociado;
                                            if (!acc.some(p => p.paso === pasoTexto)) {
                                              acc.push({ paso: pasoTexto, medios: [medio] });
                                            } else {
                                              acc.find(p => p.paso === pasoTexto).medios.push(medio);
                                            }
                                            return acc;
                                          }, [])
                                          .map((paso, indexPaso) => (
                                            <div key={indexPaso} className="p-4 bg-gray-100 rounded-lg shadow-md">
                                              <h5 className="font-semibold text-lg text-blue-700 mb-2">
                                                Paso {indexPaso + 1}:
                                              </h5>
                                              <p className="text-base font-medium leading-relaxed mb-4 break-words">
                                                {paso.paso}
                                              </p>
                                              <div className="flex flex-row flex-wrap justify-start gap-4">
                                                {paso.medios.map((medio, medioIndex) => (
                                                  <div
                                                    key={medio.id || medioIndex}
                                                    className="flex flex-col items-center text-center w-full max-w-[300px]"
                                                  >
                                                    {medio.tipo_medio === 'imagen' ? (
                                                      <img
                                                        src={`${API_BASE_URL}${medio.url_medio}`}
                                                        alt={medio.subtitulo_medio || `Ilustración ${medioIndex + 1} para ${paso.paso}`}
                                                        className="rounded-md object-contain mb-2 shadow-lg w-full"
                                                        style={{ maxHeight: '220px', maxWidth: '100%' }}
                                                        loading="lazy"
                                                      />
                                                    ) : medio.tipo_medio === 'video' ? (
                                                      <video
                                                        controls
                                                        className="rounded-md mb-2 shadow-lg w-full"
                                                        style={{ maxHeight: '220px', maxWidth: '100%' }}
                                                        preload="metadata"
                                                      >
                                                        <source
                                                          src={`${API_BASE_URL}${medio.url_medio}`}
                                                          type={medio.url_medio.endsWith('.mp4') ? 'video/mp4' : medio.url_medio.endsWith('.mov') ? 'video/quicktime' : ''}
                                                        />
                                                        Tu navegador no soporta el video.
                                                      </video>
                                                    ) : null}
                                                    {medio.subtitulo_medio && (
                                                      <p className="text-base font-medium mt-1 px-1 break-words">
                                                        {medio.subtitulo_medio}
                                                      </p>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <HtmlRenderer htmlString={item.contenidoTema} />
                                    {itemMedios.length > 0 && (
                                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {itemMedios
                                        .sort((a, b) => a.orden - b.orden)
                                        .map((medio, medioIndex) => (
                                          <div key={medio.id || medioIndex} className="border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white">
                                            {medio.tipo_medio === 'imagen' ? (
                                              <img
                                                src={`${API_BASE_URL}${medio.url_medio}`}
                                                alt={medio.subtitulo_medio || `Medio ${medioIndex + 1} para ${item.tituloTema}`}
                                                className="w-full max-h-72 object-contain rounded-md mb-2"
                                                loading="lazy"
                                              />
                                            ) : medio.tipo_medio === 'video' ? (
                                              <video
                                                controls
                                                className="w-full h-auto rounded-md mb-2"
                                                style={{ maxHeight: '220px' }}
                                                preload="metadata"
                                              >
                                                <source
                                                  src={`${API_BASE_URL}${medio.url_medio}`}
                                                  type={medio.url_medio.endsWith('.mp4') ? 'video/mp4' : medio.url_medio.endsWith('.mov') ? 'video/quicktime' : ''}
                                                />
                                                Tu navegador no soporta el video.
                                              </video>
                                            ) : null}
                                            {medio.paso_asociado && !item.tituloTema.toLowerCase().includes('rcp') && (
                                              <p className="text-base text-gray-600 mt-1 italic">Asociado a: {medio.paso_asociado}</p>
                                            )}
                                            {medio.subtitulo_medio && (
                                              <p className="text-base font-medium mt-1">{medio.subtitulo_medio}</p>
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <audio ref={audioRef} src="/assets/metronome.mp3" preload="auto" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Educacion;