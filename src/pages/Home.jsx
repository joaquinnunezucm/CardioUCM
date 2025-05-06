import logo from '../assets/color.png';
import { Link, useNavigate } from "react-router-dom";
import axios from 'axios';

const Home = () => {
  const navigate = useNavigate();

  const handleSeccionClick = async (seccion, ruta) => {
    try {
      await axios.post('http://localhost:3001/api/registro-clic', { seccion });
      console.log(`✅ Clic registrado en la sección: ${seccion}`);
      
      if (ruta.startsWith('tel:')) {
        window.location.href = ruta; // Redirige para llamar
      } else {
        navigate(ruta); // Navega a la ruta interna
      }
    } catch (error) {
      console.error('❌ Error registrando clic:', error);
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col items-center justify-center gap-6 px-4">
      <img src={logo} alt="Logo CardioUCM" className="w-48 mx-auto mb-4" />

      <div className="text-center">
        <button
          onClick={() => handleSeccionClick('Emergencia', 'tel:131')}
          className="bg-red-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg"
        >
          LLAMAR 131
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full">
        <div
          onClick={() => handleSeccionClick('RCP', '/rcp')}
          className="cursor-pointer bg-green-100 p-4 rounded-xl shadow hover:bg-green-200 text-center"
        >
          <p className="text-lg font-semibold">RCP</p>
          <p className="text-sm">Guía de reanimación cardiopulmonar</p>
        </div>

        <div
          onClick={() => handleSeccionClick('DEA', '/dea')}
          className="cursor-pointer bg-blue-100 p-4 rounded-xl shadow hover:bg-blue-200 text-center"
        >
          <p className="text-lg font-semibold">DEA</p>
          <p className="text-sm">Localiza el DEA más cercano</p>
        </div>

        <div
          onClick={() => handleSeccionClick('Educación', '/educacion')}
          className="cursor-pointer bg-yellow-100 p-4 rounded-xl shadow hover:bg-yellow-200 text-center"
        >
          <p className="text-lg font-semibold">Educación</p>
          <p className="text-sm">Emergencias cardíacas</p>
        </div>

        <div
          onClick={() => handleSeccionClick('Preguntas Frecuentes', '/faq')}
          className="cursor-pointer bg-purple-100 p-4 rounded-xl shadow hover:bg-purple-200 text-center"
        >
          <p className="text-lg font-semibold">FAQ</p>
          <p className="text-sm">Preguntas Frecuentes</p>
        </div>

        <div
          onClick={() => handleSeccionClick('Noticias', '/noticias')}
          className="cursor-pointer bg-pink-100 p-4 rounded-xl shadow hover:bg-pink-200 text-center col-span-full sm:col-span-2 lg:col-span-1"
        >
          <p className="text-lg font-semibold">Noticias</p>
          <p className="text-sm">Campañas, cursos y vínculos de interés</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
