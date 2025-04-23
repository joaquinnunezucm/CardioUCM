import React, { useState, useRef } from 'react';
import logo from '../assets/color.png';
import { Link } from 'react-router-dom';

const Educacion = () => {
  const [activa, setActiva] = useState(null);
  const [subActiva, setSubActiva] = useState(null);
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

  const acordeones = [
    {
      titulo: '¿Qué es un Paro Cardiorrespiratorio?',
      contenido: (
        <p>
          Es una situación en la que el corazón deja de latir de forma súbita y la persona deja de respirar, generando una pérdida total de conciencia. El tiempo es vital: cada minuto que pasa disminuye las probabilidades de supervivencia en un 10%.
        </p>
      ),
    },
    {
      titulo: '¿Qué es la RCP y por qué es importante?',
      contenido: (
        <>
          <p className="mb-2">
            La Reanimación Cardiopulmonar (RCP) es un conjunto de maniobras que permiten mantener artificialmente la circulación de oxígeno hacia órganos vitales como el cerebro y el corazón.
          </p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Puede duplicar o triplicar la probabilidad de supervivencia.</li>
            <li>Debe iniciarse lo antes posible si la persona no respira y no tiene pulso.</li>
            <li>Debe combinarse con el uso del DEA para mayor efectividad.</li>
          </ul>
        </>
      ),
    },
    {
      titulo: 'Cadena de Supervivencia',
      contenido: (
        <ul className="list-disc ml-6 space-y-1">
          <li>Reconocimiento temprano del paro cardíaco.</li>
          <li>Llamar al número de emergencia (131).</li>
          <li>Inicio inmediato de RCP de alta calidad.</li>
          <li>Uso precoz del DEA.</li>
          <li>Soporte vital avanzado por personal médico.</li>
        </ul>
      ),
    },
    {
      titulo: '¿Cómo realizar RCP?',
      contenido: (
        <ul className="list-disc ml-6 space-y-1">
          <li>Asegura que la escena es segura para actuar.</li>
          <li>Verifica si la persona responde, respira y tiene pulso.</li>
          <li>Si no hay pulso ni respiración, inicia RCP:</li>
          <ul className="list-disc ml-6 space-y-1">
            <li>30 compresiones torácicas al centro del pecho (5-6 cm de profundidad, 100-120 por minuto).</li>
            <li>2 ventilaciones boca a boca o con mascarilla.</li>
            <li>Continúa con ciclos de 30:2 hasta que llegue ayuda o la persona responda.</li>
          </ul>
        </ul>
      ),
    },
    {
      titulo: '¿Qué es un DEA y cómo se usa?',
      contenido: (
        <>
          <p className="mb-2">
            El Desfibrilador Externo Automático (DEA) es un dispositivo que analiza el ritmo cardíaco y puede aplicar una descarga eléctrica para restablecer un ritmo efectivo.
          </p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Enciende el DEA y sigue las instrucciones de voz.</li>
            <li>Coloca los parches en el pecho de la persona tal como indica el gráfico del dispositivo.</li>
            <li>Asegúrate de que nadie toque a la víctima durante el análisis y la descarga.</li>
            <li>Después de la descarga, continúa con RCP inmediatamente.</li>
            <li>El DEA repetirá el análisis cada 2 minutos y te dirá qué hacer.</li>
          </ul>
        </>
      ),
    },
    {
      titulo: 'Evaluación de la víctima',
      contenido: (
        <div>
          <p className="mb-4 text-gray-700">
            Antes de actuar, evalúa:
            <strong> ¿Responde? ¿Respira? ¿Tiene pulso?</strong> Aquí te mostramos qué hacer según cada caso:
          </p>
          <div className="space-y-4">
            {[
              {
                titulo: 'La persona RESPIRA y tiene PULSO',
                contenido: (
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Coloca a la persona en posición lateral de seguridad.</li>
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
                ),
              },
              {
                titulo: 'La persona TIENE PULSO pero NO RESPIRA',
                contenido: (
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Abre la vía aérea con la maniobra frente-mentón.</li>
                    <li>Administra una ventilación cada 5 a 6 segundos.</li>
                    <li>Verifica que el tórax se eleve con cada ventilación.</li>
                    <li>Reevalúa el pulso y la respiración cada 2 minutos.</li>
                    <li>Si en algún momento pierde el pulso, inicia compresiones torácicas.</li>
                  </ul>
                ),
              },
              {
                titulo: 'La persona NO RESPIRA y NO tiene PULSO',
                contenido: (
                  <ul className="list-disc ml-6 space-y-2">
                    <li>
                      <button
                        onClick={toggleMetronomo}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        {metronomoActivo ? 'Detener metrónomo' : 'Iniciar metrónomo (compresiones)'}
                      </button>
                    </li>
                    <li>Inicia compresiones torácicas: 30 compresiones firmes y rápidas al centro del pecho (5-6 cm de profundidad, ritmo de 100-120/min).</li>
                    <li>Después de 30 compresiones, realiza 2 ventilaciones boca a boca o con mascarilla.</li>
                    <li>Repite el ciclo 30:2 durante 2 minutos o hasta que llegue ayuda.</li>
                    <li>Solicita un DEA si hay uno disponible. Sigue sus instrucciones de voz.</li>
                    <li>
                      <Link to="/dea" className="text-blue-600 underline hover:text-blue-800">
                        Buscar DEA cercano
                      </Link>
                    </li>
                    <li>No detengas la RCP salvo recuperación o relevo profesional.</li>
                  </ul>
                ),
              },
            ].map((item, index) => (
              <div key={index} className="border rounded-md overflow-hidden shadow">
                <button
                  onClick={() => setSubActiva(subActiva === index ? null : index)}
                  className="w-full text-left px-4 py-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-semibold"
                >
                  {item.titulo}
                </button>
                {subActiva === index && (
                  <div className="px-4 py-3 text-gray-800 bg-white border-t animate-fade-in">
                    {item.contenido}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      titulo: 'Primeros auxilios básicos',
      contenido: (
        <ul className="list-disc ml-6 space-y-1">
          <li>Control de hemorragias (presión directa y elevación del miembro).</li>
          <li>Qué hacer ante desmayos: aflojar ropa, elevar piernas, mantener vigilancia.</li>
          <li>Maniobras para desobstrucción de vía aérea (Heimlich en adultos, palmadas y compresiones en niños).</li>
        </ul>
      ),
    },
    {
      titulo: 'Consejos para la prevención cardiovascular',
      contenido: (
        <ul className="list-disc ml-6 space-y-1">
          <li>Alimentación saludable: frutas, verduras, legumbres, pescado.</li>
          <li>Evitar grasas saturadas, azúcar y sal en exceso.</li>
          <li>Realizar actividad física regularmente (mínimo 150 minutos semanales).</li>
          <li>No fumar y controlar el estrés.</li>
        </ul>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-yellow-50 p-6">
      <img src={logo} alt="Logo Cardioucm" className="w-48 mx-auto mb-6" />
      <h1 className="text-2xl font-bold text-yellow-800 mb-6 text-center">
        Educación en Reanimación y Uso del DEA
      </h1>

      <div className="space-y-4">
        {acordeones.map((item, index) => (
          <div key={index} className="border rounded-md overflow-hidden shadow">
            <button
              onClick={() => setActiva(activa === index ? null : index)}
              className="w-full text-left px-4 py-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-semibold"
            >
              {item.titulo}
            </button>
            {activa === index && (
              <div className="px-4 py-3 text-gray-800 bg-white border-t animate-fade-in">
                {item.contenido}
              </div>
            )}
          </div>
        ))}
      </div>

      <audio ref={audioRef} src="/assets/metronome.mp3" preload="auto" />
    </div>
  );
};

export default Educacion;