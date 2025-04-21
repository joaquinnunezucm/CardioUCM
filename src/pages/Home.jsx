import logo from '../assets/color.png';
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="h-screen bg-white flex flex-col items-center justify-center gap-6 px-4">
      <img src={logo} alt="Logo CardioUCM" className="w-48 mx-auto mb-4" />
      <h1 className="text-3xl font-bold text-red-600 text-center">❤️ CARDIOUCM</h1>

      <div className="text-center">
        <a
          href="tel:131"
          className="bg-red-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg"
        >
          LLAMAR 131
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full">
        <Link
          to="/rcp"
          className="bg-green-100 p-4 rounded-xl shadow hover:bg-green-200 text-center"
        >
          <p className="text-lg font-semibold">RCP</p>
          <p className="text-sm">Guía de reanimación cardiopulmonar</p>
        </Link>
        <Link
          to="/dea"
          className="bg-blue-100 p-4 rounded-xl shadow hover:bg-blue-200 text-center"
        >
          <p className="text-lg font-semibold">DEA</p>
          <p className="text-sm">Localiza el DEA más cercano</p>
        </Link>
        <Link
          to="/educacion"
          className="bg-yellow-100 p-4 rounded-xl shadow hover:bg-yellow-200 text-center"
        >
          <p className="text-lg font-semibold">Educación</p>
          <p className="text-sm">Emergencias cardíacas</p>
        </Link>
        <Link
          to="/faq"
          className="bg-purple-100 p-4 rounded-xl shadow hover:bg-purple-200 text-center"
        >
          <p className="text-lg font-semibold">FAQ</p>
          <p className="text-sm">Preguntas frecuentes</p>
        </Link>
        <Link
          to="/noticias"
          className="bg-pink-100 p-4 rounded-xl shadow hover:bg-pink-200 text-center col-span-full sm:col-span-2 lg:col-span-1"
        >
          <p className="text-lg font-semibold">Noticias</p>
          <p className="text-sm">Campañas, cursos y vínculos de interés</p>
        </Link>
      </div>
    </div>
  );
};

export default Home;
