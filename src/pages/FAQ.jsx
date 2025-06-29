import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../pages/BackButton.jsx';
import { API_BASE_URL } from '../utils/api';

const FAQ = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublicFAQs = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`${API_BASE_URL}/api/faqs`);
        setFaqs(response.data);
      } catch (err) {
        console.error("Error fetching public FAQs:", err);
        setError(err.response?.data?.message || 'No se pudieron cargar las preguntas frecuentes en este momento.');
        setFaqs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicFAQs();
  }, []);

  const groupedFaqs = faqs.reduce((acc, faq) => {
    const category = faq.categoria || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-xl">
          <i className="fas fa-spinner fa-spin fa-3x text-blue-500"></i>
          <p className="text-gray-800 text-lg mt-3">Cargando preguntas frecuentes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <i className="fas fa-exclamation-triangle fa-3x text-red-500 mb-4"></i>
          <h1 className="text-3xl font-bold mb-3 text-red-700 break-words">Error al Cargar</h1>
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-full font-bold shadow-xl hover:bg-blue-600 transition-transform transform hover:scale-105"
          >
            Intentar de Nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    // 1. Contenedor de página: sin padding
    <div className="min-h-screen bg-gray-100">
      <BackButton />
      
      {/* 2. Contenedor de contenido: con ancho máximo y padding horizontal único */}
      <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
        
        {/* 3. Tarjeta de título: se quita 'container-fluid' y se añade padding interno */}
        <div className="content-header p-4 bg-white rounded-lg shadow-xl mb-6">
          <div className="row mb-2">
            <div className="col-sm-12 text-center">
              <h1 className="m-0 text-2xl sm:text-3xl md:text-4xl font-bold text-blue-800 border-b-2 border-blue-200 pb-2 break-words">
                Preguntas Frecuentes
              </h1>
            </div>
          </div>
        </div>

        {/* 4. Sección de contenido: se quita 'container-fluid' */}
        <section className="content">
          <div>
            {Object.keys(groupedFaqs).length === 0 ? (
              <div className="text-center p-10 bg-white rounded-lg shadow-xl">
                <i className="fas fa-info-circle fa-3x text-blue-400 mb-4"></i>
                <p className="text-gray-800 text-xl">
                  No hay preguntas frecuentes disponibles en este momento.
                </p>
                <p className="text-gray-600 mt-2 text-base">
                  Vuelve a intentarlo más tarde.
                </p>
              </div>
            ) : (
              Object.entries(groupedFaqs).map(([categoria, faqsEnCategoria]) => (
                <div key={categoria} className="mb-4">
                  {(categoria !== 'General' || Object.keys(groupedFaqs).length > 1) && (
                    <h2 className="text-2xl md:text-3xl font-semibold mb-2 text-blue-600 border-b-2 border-blue-200 pb-2 break-words">
                      {categoria}
                    </h2>
                  )}
                  <div className="space-y-3">
                    {faqsEnCategoria.map((faq) => (
                      <details
                        key={faq.id}
                        className="group bg-white p-3 rounded-lg shadow-xl hover:shadow-2xl transition-shadow duration-300"
                        aria-label={`Ver respuesta a ${faq.pregunta}`}
                      >
                        <summary className="flex justify-between items-center font-semibold cursor-pointer text-gray-800 text-lg md:text-xl group-hover:text-blue-600 break-words">
                          {faq.pregunta}
                          <span className="text-blue-500 group-open:rotate-90 transform transition-transform duration-200 ml-3">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              fill="currentColor"
                              className="bi bi-chevron-right"
                              viewBox="0 0 16 16"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
                              />
                            </svg>
                          </span>
                        </summary>
                          <p className="text-base text-gray-800 leading-relaxed mt-3 pt-3 border-t border-gray-200 break-words" style={{ whiteSpace: 'pre-wrap' }}>
                            {faq.respuesta} 
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FAQ;