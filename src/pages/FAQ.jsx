// src/pages/FAQ.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FAQ = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublicFAQs = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get('http://localhost:3001/api/faqs'); // Endpoint público
        setFaqs(response.data);
      } catch (err) {
        console.error("Error fetching public FAQs:", err);
        setError(err.response?.data?.message || 'No se pudieron cargar las preguntas frecuentes en este momento.');
        setFaqs([]); // Limpiar en caso de error
      } finally {
        setLoading(false);
      }
    };

    fetchPublicFAQs();
  }, []); // Se ejecuta solo una vez al montar

  // Opcional: Agrupar FAQs por categoría si el campo 'categoria' se usa consistentemente
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const category = faq.categoria || 'General'; // Agrupa las sin categoría en 'General'
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-green-50 flex justify-center items-center">
        <p className="text-green-700">Cargando preguntas frecuentes...</p>
        {/* Podrías poner un spinner aquí */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-red-50">
        <h1 className="text-2xl font-bold mb-4 text-red-800 text-center">Error</h1>
        <p className="text-red-700 text-center">{error}</p>
      </div>
    );
  }

  return (
    // Asumiendo que quieres mantener los estilos de Tailwind que tenías
    <div className="min-h-screen p-4 md:p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center text-blue-700">
          Preguntas Frecuentes
        </h1>

        {Object.keys(groupedFaqs).length === 0 && !loading ? (
            <p className="text-center text-gray-600">No hay preguntas frecuentes disponibles en este momento.</p>
        ) : (
            Object.entries(groupedFaqs).map(([categoria, faqsEnCategoria]) => (
            <div key={categoria} className="mb-8">
                {/* Solo mostrar el título de la categoría si no es 'General' o si hay más de una categoría */}
                {(categoria !== 'General' || Object.keys(groupedFaqs).length > 1) && (
                    <h2 className="text-2xl font-semibold mb-4 text-blue-600 border-b-2 border-blue-200 pb-2">
                        {categoria}
                    </h2>
                )}
                <div className="space-y-4">
                {faqsEnCategoria.map((faq) => (
                    <details key={faq.id} className="group bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                    <summary className="flex justify-between items-center font-semibold cursor-pointer text-gray-800 group-hover:text-blue-600">
                        {faq.pregunta}
                        <span className="text-blue-500 group-open:rotate-90 transform transition-transform duration-200 ml-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-chevron-right" viewBox="0 0 16 16">
                                <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                            </svg>
                        </span>
                    </summary>
                    <p className="text-gray-700 mt-2 pt-2 border-t border-gray-200">
                        {faq.respuesta}
                    </p>
                    </details>
                ))}
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};

export default FAQ;