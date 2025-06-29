import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import axios from 'axios';
import BackButton from '../pages/BackButton.jsx';
import { API_BASE_URL } from '../utils/api';

const RCP = () => {
  const [metronomoActivo, setMetronomoActivo] = useState(false);
  const [instrucciones, setInstrucciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRCPContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/rcp`);
        const sortedInstrucciones = response.data.sort((a, b) => a.orden - b.orden);
        setInstrucciones(sortedInstrucciones);
      } catch (err) {
        console.error("Error fetching RCP content:", err.response ? err.response.data : err.message);
        setError(err.response?.data?.message || err.message || 'No se pudo cargar el contenido de RCP en este momento. Intenta de nuevo más tarde.');
        setInstrucciones([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRCPContent();
  }, [API_BASE_URL]);

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
        <div className="text-center">
          <i className="fas fa-spinner fa-spin fa-3x text-blue-500"></i>
          <p className="text-gray-700 text-lg mt-3">Cargando contenido de RCP...</p>
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

  return (
    <div className="min-h-screen bg-gray-100">
      <BackButton />

      <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
        
        {/* La clase "container-fluid" ha sido eliminada del div hijo */}
        <div className="content-header p-4 bg-white rounded-lg shadow-xl">
            <div className="row mb-2">
              <div className="col-sm-12 text-center">
                <h1 className="m-0 text-2xl sm:text-3xl md:text-4xl font-bold text-red-800 border-b-2 border-red-200 pb-2">
                  Reanimación Cardiopulmonar (RCP)
                </h1>
                {/* Se quita px-2 para que el texto se alinee con el borde del h1 */}
                <p className="text-center text-gray-600 mt-4 text-base md:text-lg">
                  Antes de iniciar cualquier maniobra, debes evaluar:
                  <strong> ¿La persona responde?, ¿Respira?, ¿Tiene pulso?</strong> En base a esa evaluación, sigue las acciones recomendadas.
                </p>
              </div>
            </div>
        </div>

        <section className="content py-5">
          {/* La clase "container-fluid" también ha sido eliminada aquí */}
          <div>
            {instrucciones.length === 0 && !loading ? (
              <div className="text-center p-10 bg-white rounded-lg shadow max-w-3xl mx-auto">
                <i className="fas fa-info-circle fa-3x text-blue-400 mb-4"></i>
                <p className="text-gray-600 text-xl">No hay contenido de RCP disponible en este momento.</p>
                <p className="text-gray-500 mt-2">Por favor, vuelve a intentarlo más tarde.</p>
              </div>
            ) : (
              // Este contenedor ya tiene su propio padding (p-4 md:p-8) que es para el espacio INTERNO de la tarjeta, lo cual es correcto.
              <div className="bg-white p-4 md:p-8 rounded-xl shadow-xl">
                <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-red-600 border-b-2 border-red-100 pb-3 text-center">
                  La persona NO RESPIRA y NO tiene PULSO
                </h2>
                <div className="text-gray-700 text-sm md:text-base leading-relaxed">
                  <ul className="list-disc ml-4 sm:ml-6 space-y-4">
                    <div className="flex justify-center mb-4">
                      <button
                        onClick={toggleMetronomo}
                        className={`px-4 py-2 text-white rounded text-sm my-1 shadow-md transition-transform transform hover:scale-105 ${
                          metronomoActivo ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {metronomoActivo ? 'Detener Metrónomo' : 'Iniciar Metrónomo (100-120 cpm)'}
                      </button>
                    </div>

                    {instrucciones.map((instruccion, index) => (
                      <li key={index} className="mt-4">
                        {instruccion.instruccion === 'Buscar DEA cercano' ? (
                          <Link
                            to={
                              user && (user.rol === 'administrador' || user.rol === 'superadministrador')
                                ? '/admin/deas'
                                : '/dea'
                            }
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            Buscar DEA cercano
                          </Link>
                        ) : (
                          <div>
                            <p className="font-medium">{instruccion.instruccion}</p>
                            {instruccion.medios && instruccion.medios.length > 0 && (
                              <div className="mt-4 flex flex-wrap justify-start gap-4">
                                {instruccion.medios.map((medio, medioIndex) => (
                                  <div
                                    key={medioIndex}
                                    className="flex flex-col items-center text-center max-w-[300px] w-full"
                                  >
                                    <img
                                      src={`${API_BASE_URL}${medio.url_medio}`}
                                      alt={
                                        medio.subtitulo ||
                                        `Ilustración ${medioIndex + 1} para ${instruccion.instruccion}`
                                      }
                                      className="rounded-md object-contain mb-2 shadow-lg w-full"
                                      style={{ maxHeight: '300px', maxWidth: '100%' }}
                                      loading="lazy"
                                    />
                                    {medio.subtitulo && (
                                      <p className="text-xs sm:text-sm text-gray-700 font-medium mt-1 px-1">
                                        {medio.subtitulo}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-8 pt-4 border-t border-gray-200 text-xs md:text-sm text-center text-gray-500">
                  *Esta información es orientativa. Se recomienda recibir capacitación teórico-práctica con profesionales certificados.
                </p>
              </div>
            )}
            <audio ref={audioRef} src="/assets/metronome.mp3" preload="auto" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default RCP;