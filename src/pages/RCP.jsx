import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import axios from 'axios';

const RCP = () => {
  const [metronomoActivo, setMetronomoActivo] = useState(false);
  const [instrucciones, setInstrucciones] = useState([]);
  const audioRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchInstrucciones = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/rcp');
        setInstrucciones(response.data);
      } catch (error) {
        console.error('Error al cargar instrucciones RCP:', error);
      }
    };
    fetchInstrucciones();
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

  const defaultInstrucciones = [
    'Llama a Emergencias 131.',
    'Solicita un DEA si hay uno disponible. Enciéndelo y sigue sus instrucciones de voz inmediatamente.',
    'Inicia compresiones torácicas: 30 compresiones firmes y rápidas al centro del pecho (5-6 cm de profundidad, ritmo de 100-120/min).',
    'Después de 30 compresiones, realiza 2 ventilaciones boca a boca o con mascarilla.',
    'Repite el ciclo 30:2 durante 2 minutos o hasta que llegue ayuda profesional o la persona muestre signos de vida.',
    'Una vez el DEA haya llegado, instálalo y sigue las instrucciones.',
    'No detengas la RCP salvo que la persona se recupere, llegue ayuda profesional y te releve, o estés demasiado exhausto para continuar de forma segura.',
  ];

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-12 text-center">
              <h1 className="m-0 text-3xl md:text-4xl font-bold text-red-700">
                Reanimación Cardiopulmonar (RCP)
              </h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <p className="text-center text-gray-600 mb-8 md:mb-12 text-base md:text-lg max-w-3xl mx-auto">
            Antes de iniciar cualquier maniobra, debes evaluar:
            <strong> ¿La persona responde?, ¿Respira?, ¿Tiene pulso?</strong> En base a esa evaluación, sigue las acciones recomendadas.
          </p>
          <div className="max-w-3xl mx-auto bg-white p-4 md:p-8 rounded-xl shadow-xl">
            <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-red-600 border-b-2 border-red-100 pb-3 text-center">
              La persona NO RESPIRA y NO tiene PULSO
            </h2>
            <div className="text-gray-700 text-sm md:text-base leading-relaxed">
              <ul className="list-disc ml-6 space-y-3">
                <li>
                  <button
                    onClick={toggleMetronomo}
                    className={`px-4 py-2 text-white rounded text-sm my-1 ${metronomoActivo ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {metronomoActivo ? 'Detener Metrónomo' : 'Iniciar Metrónomo (100-120 cpm)'}
                  </button>
                  <div className="mt-4 flex justify-center">
                    <img
                      src={instrucciones.length > 0 && instrucciones[0].gif_url ? `http://localhost:3001${instrucciones[0].gif_url}` : '/assets/gif3.gif'}
                      className="w-60 md:w-64 rounded-lg shadow"
                      alt="Instrucción RCP"
                    />
                  </div>
                </li>
                {(instrucciones.length > 0 ? instrucciones : defaultInstrucciones.map((text) => ({ instruccion: text }))).map((item, index) => (
                  <li key={index}>
                    {item.instruccion === 'Buscar DEA cercano' ? (
                      <Link to={user && (user.rol === 'administrador' || user.rol === 'superadministrador') ? "/admin/deas" : "/dea"} className="text-blue-600 underline hover:text-blue-800">
                        Buscar DEA cercano
                      </Link>
                    ) : (
                      item.instruccion
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-8 pt-4 border-t border-gray-200 text-xs md:text-sm text-center text-gray-500">
              *Esta información es orientativa. Se recomienda recibir capacitación teórico-práctica con profesionales certificados.
            </p>
          </div>
          <audio ref={audioRef} src="/assets/metronome.mp3" preload="auto" />
        </div>
      </section>
    </>
  );
};

export default RCP; 