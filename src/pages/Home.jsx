import React, { useEffect, useRef } from 'react';
import logo from '../assets/color.png'; // Asegúrate que la ruta al logo sea correcta
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

const Home = () => {
  const navigate = useNavigate();
  const visitaRegistradaRef = useRef(false);

  useEffect(() => {
    const adminLteClasses = ['hold-transition', 'sidebar-mini', 'layout-fixed', 'layout-navbar-fixed'];
    adminLteClasses.forEach(cls => document.body.classList.remove(cls));
    document.body.classList.add('bg-slate-100');

    if (!visitaRegistradaRef.current) {
      const registrarVisita = async () => {
        try {
          await axios.post(`${API_BASE_URL}/api/registro-clic`, { seccion: 'VisitaHomePage' });
        } catch (error) {
          console.error('❌ Error registrando visita a Home Page:', error);
        }
      };
      registrarVisita();
      visitaRegistradaRef.current = true;
    }

    return () => {
      document.body.classList.remove('bg-slate-100');
    };
  }, []);

  const handleSeccionClick = async (seccion, ruta) => {
    try {
      await axios.post(`${API_BASE_URL}/api/registro-clic`, { seccion });
      if (ruta.startsWith('tel:')) {
        window.location.href = ruta;
      } else {
        navigate(ruta);
      }
    } catch (error) {
      console.error(`❌ Error procesando acción para ${seccion}:`, error);
      if (ruta.startsWith('tel:')) {
        window.location.href = ruta;
      } else {
        navigate(ruta);
      }
    }
  };

  const secciones = [
    { id: 'rcp', nombre: 'RCP', subtitulo: 'Guía de reanimación ante emergencias cardíacas', colorClasses: 'bg-emerald-500 hover:bg-emerald-600 text-white', icono: 'fas fa-heart-pulse', ruta: '/rcp', seccionApi: 'RCP' },
    { id: 'dea', nombre: 'DEA', subtitulo: 'Localiza el DEA más cercano', colorClasses: 'bg-sky-500 hover:bg-sky-600 text-white', icono: 'fas fa-map-marker-alt', ruta: '/dea', seccionApi: 'DEA' },
    { id: 'educacion', nombre: 'Educación', subtitulo: 'Información Complementaria', colorClasses: 'bg-amber-500 hover:bg-amber-600 text-white', icono: 'fas fa-book-medical', ruta: '/educacion', seccionApi: 'Educación' },
    { id: 'faq', nombre: 'FAQ', subtitulo: 'Preguntas Frecuentes', colorClasses: 'bg-violet-500 hover:bg-violet-600 text-white', icono: 'fas fa-question-circle', ruta: '/faq', seccionApi: 'Preguntas Frecuentes' },
    { id: 'contáctanos', nombre: 'Contáctanos', subtitulo: 'Redes, correos y enlaces útiles', colorClasses: 'bg-pink-500 hover:bg-pink-600 text-white', icono: 'fas fa-address-book', ruta: '/contáctanos', seccionApi: 'Contáctanos' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-3 sm:p-4">
      <div className="flex-shrink-0 pt-8 sm:pt-8 pb-2">
        <img
          src={logo}
          alt="Logo CardioUCM"
          className="w-64 sm:w-70 md:w-80 max-w-full mx-auto transition-all duration-300"
          style={{ maxHeight: '280px' }}
        />
      </div>

      <div className="w-full max-w-lg lg:max-w-xl flex-grow flex flex-col items-center justify-center my-1 sm:my-2">
        <div className="flex-shrink-0 mb-4 sm:mb-5">
          <button
            onClick={() => handleSeccionClick('LlamadaEmergencia131', 'tel:131')}
            className="bg-red-600 text-white px-6 py-2.5 sm:px-10 sm:py-3 rounded-full text-base sm:text-lg font-bold shadow-xl hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 focus:ring-opacity-50 transition-all duration-150 ease-in-out transform hover:scale-105"
          >
            <span className="home-page-icon-container inline-block">
              <i className="fas fa-phone-alt mr-2"></i>
            </span>
            LLAMAR 131
          </button>
        </div>

        <div className="w-full bg-white p-3 sm:p-4 rounded-2xl shadow-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {secciones.map((seccion) => {
              let colSpan = seccion.id === 'rcp' ? 'sm:col-span-2' : '';
              return (
                <div
                  key={seccion.id}
                  onClick={() => handleSeccionClick(seccion.seccionApi, seccion.ruta)}
                  className={`cursor-pointer ${seccion.colorClasses} p-3 sm:p-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:-translate-y-1 flex flex-col items-center justify-center text-center min-h-[100px] sm:min-h-[120px] ${colSpan}`}
                >
                  <div className="home-page-icon-container">
                    <i className={`${seccion.icono} text-2xl sm:text-3xl mb-1 sm:mb-1.5`}></i>
                  </div>
                  <h3 className="text-md sm:text-lg font-semibold mb-0.5">{seccion.nombre}</h3>
                  <p className="text-xs opacity-90 px-1">{seccion.subtitulo}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="flex-shrink-0 text-center text-gray-600 py-2 text-xs">
        <p>© {new Date().getFullYear()} CardioUCM. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default Home;