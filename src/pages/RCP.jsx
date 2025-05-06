import React, { useRef, useState, useEffect } from 'react'; // 👈 agregamos useEffect
import { Link } from 'react-router-dom';

const RCP = () => {
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

  // 👇 NUEVO: useEffect para registrar el click al cargar la página
  useEffect(() => {
    fetch("http://localhost:3001/api/registro-clic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seccion: "RCP" })
    }).catch((error) => {
      console.error("Error registrando clic:", error);
    });
  }, []); // [] para que solo se dispare una vez al entrar

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-2xl font-bold text-red-700 mb-4">
        Reanimación Cardiopulmonar (RCP)
      </h1>

      <p className="mb-4 text-gray-700">
        Antes de iniciar cualquier maniobra, debes evaluar:
        <strong> ¿La persona responde?, ¿Respira?, ¿Tiene pulso?</strong> En base a esa evaluación, sigue las acciones recomendadas:
      </p>

      <section className="border rounded-md p-4 bg-red-50">
        <h2 className="text-xl font-semibold text-red-700 mb-2">La persona NO RESPIRA y NO tiene PULSO</h2>
        <ul className="list-disc ml-6 space-y-2 text-gray-800">
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
      </section>

      <audio ref={audioRef} src="/assets/metronome.mp3" preload="auto" />

      <p className="mt-8 text-sm text-gray-500">
        *Esta información es orientativa. Se recomienda recibir capacitación teórico-práctica con profesionales certificados.
      </p>
    </div>
  );
};

export default RCP;
