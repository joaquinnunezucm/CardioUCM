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
      <div className="min-h-screen flex flex-col items-center justify-center p-2 xs:p-4 sm:p-6 md:p-8 lg:p-10 bg-gray-100">
        <div className="text-center bg-white p-6 xs:p-8 rounded-lg shadow-xl">
          <i className="fas fa-spinner fa-spin fa-2x xs:fa-3x text-blue-500"></i>
          <p className="text-gray-800 text-base sm:text-lg md:text-xl mt-3">Cargando preguntas frecuentes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-2 xs:p-4 sm:p-6 md:p-8 lg:p-10 bg-gray-100">
        <div className="bg-white p-6 xs:p-8 rounded-lg shadow-xl text-center">
          <i className="fas fa-exclamation-triangle fa-2x xs:fa-3x text-red-500 mb-4"></i>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 text-red-700">Error al Cargar</h1>
          <p className="text-red-600 text-base sm:text-lg md:text-xl">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-full text-base sm:text-lg font-bold shadow-xl hover:bg-blue-600 transition-all duration-150 ease-in-out transform hover:scale-105"
          >
            Intentar de Nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-2 xs:p-4 sm:p-6 md:p-8 lg:p-10 bg-gray-100">
      <BackButton />
      <div className="w-full max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-4xl flex flex-col my-2 xs:my-3 sm:my-4 md:my-6">
        <div className="content-header py-4 xs:py-5 sm:py-6 bg-white rounded-lg shadow-xl">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-12 text-center">
                <h1 className="m-0 text-2xl xs:text-3xl sm:text-3xl md:text-4xl lg:text-4xl font-bold text-blue-800 border-b-2 border-blue-200 pb-2">
                  Preguntas Frecuentes
                </h1>
              </div>
            </div>
          </div>
        </div>
        <section className="content py-4 xs:py-5 sm:py-6">
          <div className="container-fluid">
            {Object.keys(groupedFaqs).length === 0 ? (
              <div className="text-center p-6 xs:p-8 sm:p-10 bg-white rounded-lg shadow-xl max-w-3xl mx-auto">
                <i className="fas fa-info-circle fa-2x xs:fa-3x text-blue-400 mb-4"></i>
                <p className="text-gray-800 text-base xs:text-lg sm:text-xl md:text-2xl">
                  No hay preguntas frecuentes disponibles en este momento.
                </p>
                <p className="text-gray-600 mt-2 text-sm xs:text-base sm:text-lg">
                  Vuelve a intentarlo más tarde.
                </p>
              </div>
            ) : (
              Object.entries(groupedFaqs).map(([categoria, faqsEnCategoria]) => (
                <div key={categoria} className="mb-6 xs:mb-8 sm:mb-10">
                  {(categoria !== 'General' || Object.keys(groupedFaqs).length > 1) && (
                    <h2 className="text-xl xs:text-2xl sm:text-2xl md:text-3xl lg:text-3xl font-semibold mb-4 xs:mb-5 sm:mb-6 text-blue-600 border-b-2 border-blue-200 pb-2">
                      {categoria}
                    </h2>
                  )}
                  <div className="space-y-4 xs:space-y-5 sm:space-y-6">
                    {faqsEnCategoria.map((faq) => (
                      <details
                        key={faq.id}
                        className="group bg-white p-4 xs:p-5 sm:p-6 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300"
                        aria-label={`Ver respuesta a ${faq.pregunta}`}
                      >
                        <summary className="flex justify-between items-center font-semibold cursor-pointer text-gray-800 text-base xs:text-lg sm:text-lg md:text-xl lg:text-xl group-hover:text-blue-600">
                          {faq.pregunta}
                          <span className="text-blue-500 group-open:rotate-90 transform transition-transform duration-200 ml-2 xs:ml-3">
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
                        <p
                          className="text-gray-800 mt-2 xs:mt-3 pt-2 xs:pt-3 border-t border-gray-200 text-sm xs:text-base sm:text-base md:text-lg lg:text-lg"
                          style={{ whiteSpace: 'pre-wrap' }}
                        >
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