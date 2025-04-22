import logo from '../assets/color.png';

const Educacion = () => {
  return (
    <div className="min-h-screen bg-yellow-50 p-6">
      <img src={logo} alt="Logo Cardioucm" className="w-48 mx-auto mb-6" />
      <h1 className="text-2xl font-bold text-yellow-800 mb-4 text-center">
        Educación en Reanimación y Uso del DEA
      </h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">¿Qué es un paro cardiorrespiratorio?</h2>
        <p>
          Es una situación en la que el corazón deja de latir de forma súbita y la persona deja de respirar, generando una pérdida total de conciencia. El tiempo es vital: cada minuto que pasa disminuye las probabilidades de supervivencia en un 10%.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">¿Qué es la RCP y por qué es importante?</h2>
        <p className="mb-2">
          La Reanimación Cardiopulmonar (RCP) es un conjunto de maniobras que permiten mantener artificialmente la circulación de oxígeno hacia órganos vitales como el cerebro y el corazón.
        </p>
        <ul className="list-disc ml-6 space-y-1">
          <li>Puede duplicar o triplicar la probabilidad de supervivencia.</li>
          <li>Debe iniciarse lo antes posible si la persona no respira y no tiene pulso.</li>
          <li>Debe combinarse con el uso del DEA para mayor efectividad.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">Cadena de Supervivencia</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Reconocimiento temprano del paro cardíaco.</li>
          <li>Llamar al número de emergencia (131).</li>
          <li>Inicio inmediato de RCP de alta calidad.</li>
          <li>Uso precoz del DEA.</li>
          <li>Soporte vital avanzado por personal médico.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">¿Cómo realizar RCP?</h2>
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
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">¿Qué es un DEA y cómo se usa?</h2>
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
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">Consejos para la prevención cardiovascular</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Alimentación saludable: frutas, verduras, legumbres, pescado.</li>
          <li>Evitar grasas saturadas, azúcar y sal en exceso.</li>
          <li>Realizar actividad física regularmente (mínimo 150 minutos semanales).</li>
          <li>No fumar y controlar el estrés.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">Primeros auxilios básicos</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Control de hemorragias (presión directa y elevación del miembro).</li>
          <li>Qué hacer ante desmayos: aflojar ropa, elevar piernas, mantener vigilancia.</li>
          <li>Maniobras para desobstrucción de vía aérea (Heimlich en adultos, palmadas y compresiones en niños).</li>
        </ul>
      </section>
    </div>
  );
};

export default Educacion;
