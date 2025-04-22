import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
/* import posSeguridad from '../assets/pos_seguridad.png';
import pasosDEA from '../assets/pasos_des.png'; */

const RCP = () => {
  const [activa, setActiva] = useState(null);
  const [metronomoActivo, setMetronomoActivo] = useState(false);
  const audioRef = useRef(null);

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

  const evaluaciones = [
    {
      titulo: 'La persona RESPIRA y tiene PULSO',
      contenido: (
        <div>
          <p className="mb-2">
            En este caso no se debe iniciar RCP, ya que la persona mantiene sus funciones vitales.
          </p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Coloca a la persona en posición lateral de seguridad:</li>
            {/* <li>
              <img src={posSeguridad} alt="Posición lateral de seguridad" className="my-4 rounded shadow-md w-full max-w-md mx-auto" />
            </li> */}
            <li>Vigila constantemente el pulso y la respiración.</li>
            <li>No abandones a la persona. Tranquilízala y permanece a su lado.</li>
            <li>Llama al SEM (131) para evaluación médica.</li>
            <li>Si deja de respirar o pierde el pulso, inicia RCP de inmediato.</li>
            <li>
              <Link to="/dea" className="text-blue-600 underline hover:text-blue-800">
                Buscar DEA cercano
              </Link>
            </li>
          </ul>
        </div>
      ),
    },
    {
      titulo: 'La persona NO RESPIRA y NO tiene PULSO',
      contenido: (
        <div>
          <p className="mb-2">
            Esta condición indica un paro cardiorrespiratorio. Se debe iniciar RCP inmediatamente.
          </p>
          <ul className="list-disc ml-6 space-y-1">
            <li>
              Inicia compresiones torácicas: 30 compresiones firmes y rápidas al centro del pecho
              (5-6 cm de profundidad, ritmo de 100-120/min).
            </li>
            <li>
              <button
                onClick={toggleMetronomo}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                {metronomoActivo ? 'Detener metrónomo' : 'Iniciar metrónomo (compresiones)'}
              </button>
            </li>
            <li>Después de 30 compresiones, realiza 2 ventilaciones boca a boca o con mascarilla.</li>
            <li>Repite el ciclo 30:2 durante 2 minutos o hasta que llegue ayuda.</li>
            <li>Solicita un DEA si hay uno disponible. Sigue sus instrucciones de voz:</li>
{/*             <li>
              <img src={pasosDEA} alt="Pasos para uso del DEA" className="my-4 rounded shadow-md w-full max-w-md mx-auto" />
            </li> */}
            <li>
              <Link to="/dea" className="text-blue-600 underline hover:text-blue-800">
                Buscar DEA cercano
              </Link>
            </li>
            <li>No detengas la RCP salvo recuperación o relevo profesional.</li>
          </ul>
        </div>
      ),
    },
    {
      titulo: 'La persona TIENE PULSO pero NO RESPIRA',
      contenido: (
        <div>
          <p className="mb-2">
            Esta situación requiere ventilaciones de rescate, pero no compresiones.
          </p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Abre la vía aérea con la maniobra frente-mentón.</li>
            <li>Administra una ventilación cada 5 a 6 segundos.</li>
            <li>Verifica que el tórax se eleve con cada ventilación.</li>
            <li>Reevalúa el pulso y la respiración cada 2 minutos.</li>
            <li>Si en algún momento pierde el pulso, inicia compresiones torácicas.</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-2xl font-bold text-red-700 mb-4">
        Evaluación y acciones ante un Paro Cardiorrespiratorio (PCR)
      </h1>

      <p className="mb-4 text-gray-700">
        Antes de iniciar cualquier maniobra, debes evaluar:
        <strong> ¿La persona responde?, ¿Respira?, ¿Tiene pulso?</strong> En base a esa evaluación, sigue las acciones recomendadas:
      </p>

      <div className="space-y-4">
        {evaluaciones.map((situacion, index) => (
          <div key={index} className="border rounded-md overflow-hidden shadow">
            <button
              onClick={() => setActiva(activa === index ? null : index)}
              className="w-full text-left px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-semibold"
            >
              {situacion.titulo}
            </button>
            {activa === index && (
              <div className="px-4 py-3 text-gray-800 bg-white border-t animate-fade-in">
                {situacion.contenido}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Audio fuera de la estructura de evaluaciones para que no se desmonte */}
      <audio ref={audioRef} src="/assets/metronome.mp3" preload="auto" />

      <p className="mt-8 text-sm text-gray-500">
        *Esta información es orientativa. Se recomienda recibir capacitación teórico-práctica con profesionales certificados.
      </p>
    </div>
  );
};

export default RCP;
