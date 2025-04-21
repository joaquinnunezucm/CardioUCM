const Noticias = () => {
  return (
    <div className="min-h-screen bg-pink-50 p-6">
      <h1 className="text-2xl font-bold text-pink-800 mb-4">Noticias y Enlaces</h1>
      <p className="mb-4">Aquí encontrarás campañas, actividades, cursos y redes sociales asociadas a CardioUCM y la Facultad de Ciencias de la Salud.</p>

      <ul className="list-disc ml-6 space-y-2 text-blue-800">
        <li>
          <a href="https://www.instagram.com/facsa_ucm?igsh=eGg3dmFkcWtrbXN5" target="_blank" rel="noopener noreferrer" className="underline">
            Instagram FACSA UCM
          </a>
        </li>
        <li>
          <a href="https://portal.ucm.cl/facultades/facultad-de-ciencias-salud" target="_blank" rel="noopener noreferrer" className="underline">
            Facultad de Ciencias de la Salud UCM
          </a>
        </li>
        <li>
          <a href="https://postgrados.ucm.cl/salud/" target="_blank" rel="noopener noreferrer" className="underline">
            Programas de Postgrado en Salud UCM
          </a>
        </li>
        <li>
          Próximos cursos de RCP y jornadas de salud estarán publicados aquí (ANALIZAR QUE MAS IRÁ AQUÍ).
        </li>
      </ul>
    </div>
  );
};

export default Noticias;
