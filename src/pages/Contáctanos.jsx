import { FaInstagram, FaEnvelope, FaGlobe, FaPhone } from 'react-icons/fa';

const Contactanos = () => {
  return (
    <div className="min-h-screen bg-pink-50 px-6 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-pink-700 mb-4 text-center">Contáctanos</h1>
        <p className="text-gray-700 mb-6 text-center">
          Encuentra aquí nuestras redes sociales, correos de contacto y enlaces institucionales relacionados con CardioUCM y la Facultad de Ciencias de la Salud.
        </p>

        <div className="space-y-6">

          {/* Redes Sociales */}
          <div>
            <h2 className="text-xl font-semibold text-pink-600 mb-2">Redes Sociales</h2>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-blue-800">
                <FaInstagram className="text-pink-500" />
                <a
                  href="https://www.instagram.com/facsa_ucm?igsh=eGg3dmFkcWtrbXN5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Instagram FACSA UCM
                </a>
              </li>
            </ul>
          </div>

          {/* Correos y contacto */}
          <div>
            <h2 className="text-xl font-semibold text-pink-600 mb-2">Correo y Teléfono</h2>
            <ul className="space-y-2 text-gray-800">
              <li className="flex items-center gap-2">
                <FaEnvelope className="text-pink-500" />
                <span>cardioucm@ucm.cl</span>
              </li>
              <li className="flex items-center gap-2">
                <FaPhone className="text-pink-500" />
                <span>+56 71 241 5000 (UCM)</span>
              </li>
            </ul>
          </div>

          {/* Enlaces institucionales */}
          <div>
            <h2 className="text-xl font-semibold text-pink-600 mb-2">Enlaces Institucionales</h2>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-center gap-2">
                <FaGlobe className="text-pink-500" />
                <a
                  href="https://portal.ucm.cl/facultades/facultad-de-ciencias-salud"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Facultad de Ciencias de la Salud UCM
                </a>
              </li>
              <li className="flex items-center gap-2">
                <FaGlobe className="text-pink-500" />
                <a
                  href="https://postgrados.ucm.cl/salud/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Programas de Postgrado en Salud UCM
                </a>
              </li>
            </ul>
          </div>

          {/* Información adicional */}
          <div>
            <h2 className="text-xl font-semibold text-pink-600 mb-2">Próximas Actividades</h2>
            <p className="text-gray-700">
              Próximos cursos de RCP, campañas y jornadas de salud serán publicados aquí. ¡Mantente atento a nuestras actualizaciones!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contactanos;
