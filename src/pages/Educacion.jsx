import logo from '../assets/color.png';

const Educacion = () => {
  return (
    <div className="min-h-screen bg-yellow-50 p-6">
      <img src={logo} alt="Logo Cardioucm" className="w-48 mx-auto mb-6" />
      <h1 className="text-2xl font-bold text-yellow-800 mb-4 text-center">
        Material Educativo
      </h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">¿Qué es un paro cardíaco?</h2>
        <p>
          Es cuando el corazón deja de latir repentinamente. Puede ser causado por enfermedades cardíacas, sobredosis, traumatismos, entre otros. No es lo mismo que un ataque al corazón.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">Importancia del RCP y el DEA</h2>
        <p>
          El RCP puede duplicar o triplicar la posibilidad de sobrevivir a un paro. Usar un DEA dentro de los 3 primeros minutos es vital para salvar una vida.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">Cómo hacer RCP</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>30 compresiones torácicas en el centro del pecho.</li>
          <li>2 ventilaciones si tienes entrenamiento.</li>
          <li>RCP solo con las manos si no sabes ventilar.</li>
          <li>En lactantes y niños, usar técnica adecuada según edad.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">Alimentación y salud cardiovascular</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Comer frutas, verduras, legumbres y pescado.</li>
          <li>Evitar grasas saturadas, exceso de sal y azúcar.</li>
          <li>Realizar actividad física regularmente.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">Primeros auxilios básicos</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Control de hemorragias.</li>
          <li>Qué hacer ante desmayos o convulsiones.</li>
          <li>Maniobras para obstrucción de vía aérea.</li>
        </ul>
      </section>
    </div>
  );
};

export default Educacion;
