/* import MenuCard from "../components/MenuCard";

const Home = () => {
  const opciones = [
    { label: "Emergencia 131", to: "/emergencia", icon: "🚨" },
    { label: "RCP", to: "/rcp", icon: "🫀" },
    { label: "Ubicación DEA", to: "/dea", icon: "📍" },
    { label: "Educación", to: "/educacion", icon: "📘" },
    { label: "Noticias", to: "/noticias", icon: "📰" },
    { label: "Preguntas Frecuentes", to: "/faq", icon: "❓" },
  ];

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-900">CardioUCM</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {opciones.map((op) => (
          <MenuCard key={op.to} to={op.to} icon={op.icon} label={op.label} />
        ))}
      </div>
    </div>
  );
};

export default Home;
 */

// src/pages/Home.jsx
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="min-h-screen bg-white p-4 flex flex-col items-center gap-6">
      <h1 className="text-3xl font-bold text-red-600 mt-6">❤️ CARDIOUCM</h1>

      <div className="flex flex-col items-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Emergencia</p>
          <a
            href="tel:131"
            className="bg-red-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg"
          >
            LLAMAR 131
          </a>
        </div>
      </div>

      <div className="w-full mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>
    </div>
  );
};

export default Home;
