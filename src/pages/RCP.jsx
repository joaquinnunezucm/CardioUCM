const RCP = () => {
  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-2xl font-bold text-red-700 mb-4">¿Cómo realizar RCP?</h1>
      <p className="mb-4">
        La Reanimación Cardiopulmonar Básica (RCP) es una técnica de emergencia que busca
        mantener la circulación y respiración en personas que han sufrido un paro
        cardiorrespiratorio. Cualquier persona puede realizarla con una capacitación mínima.
      </p>

      <h2 className="text-xl font-semibold text-red-600 mb-2">Pasos básicos de la RCP</h2>
      <ol className="list-decimal space-y-2 ml-6">
        <li>Verifica que el área sea segura antes de acercarte.</li>
        <li>Valora si la persona está consciente y respira.</li>
        <li>Si no responde, llama al 131 o pide ayuda y solicita un DEA.</li>
        <li>Verifica el pulso y la respiración en menos de 10 segundos.</li>
        <li>Si no hay pulso ni respiración, inicia RCP:</li>
        <ul className="list-disc ml-6">
          <li>30 compresiones torácicas al centro del pecho (5-6 cm de profundidad, ritmo de 100-120 por minuto).</li>
          <li>2 ventilaciones boca a boca o con mascarilla.</li>
          <li>Repite ciclos de 30:2 durante 2 minutos o hasta que llegue ayuda.</li>
        </ul>
        <li>Si hay otro reanimador, alternen roles cada 5 ciclos o 2 minutos.</li>
      </ol>

      <h2 className="text-xl font-semibold text-red-600 mt-6 mb-2">Uso del DEA (Desfibrilador Externo Automático)</h2>
      <p className="mb-2">
        El DEA es un dispositivo que analiza el ritmo cardíaco y administra una descarga si es necesario. Está diseñado para ser usado por cualquier persona, incluso sin experiencia médica.
      </p>
      <ol className="list-decimal space-y-2 ml-6">
        <li>Enciende el DEA y sigue sus instrucciones audibles.</li>
        <li>Coloca los parches en el pecho desnudo de la víctima como lo indica el dispositivo.</li>
        <li>Conecta los electrodos y espera el análisis del ritmo cardíaco.</li>
        <li>Si se recomienda descarga, asegúrate de que nadie toque al paciente y presiona el botón de descarga.</li>
        <li>Inmediatamente después de la descarga, reinicia la RCP.</li>
        <li>El DEA analizará de nuevo el ritmo cada 2 minutos y te dirá qué hacer.</li>
      </ol>

      <p className="mt-6 text-sm text-gray-500">
        *Esta información es orientativa. Se recomienda recibir capacitación teórico-práctica con profesionales certificados.
      </p>
    </div>
  );
};

export default RCP;
