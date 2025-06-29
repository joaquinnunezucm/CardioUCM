import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaInstagram, FaEnvelope, FaGlobe, FaPhone, FaFacebook, FaTwitter, FaInfoCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import BackButton from '../pages/BackButton.jsx';
import DOMPurify from 'dompurify';
import { API_BASE_URL } from '../utils/api';

// Mapeo de nombres de iconos a componentes
const iconComponents = {
  FaInstagram, FaEnvelope, FaGlobe, FaPhone, FaFacebook, FaTwitter, FaInfoCircle,
};

// Component to render HTML or text with line breaks
const HtmlRenderer = ({ htmlString }) => {
  if (typeof htmlString !== 'string') return null;
  const containsHTML = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*>(.*?)<\/\1>/s.test(htmlString);
  const cleanedText = DOMPurify.sanitize(
    containsHTML ? htmlString : htmlString.replace(/\n/g, '<br />')
  );
  return <span dangerouslySetInnerHTML={{ __html: cleanedText }} />;
};

const Contactanos = () => {
  const [contactInfo, setContactInfo] = useState({});
  const [openCategories, setOpenCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_BASE_URL}/api/contactos`);
        const groupedData = response.data.reduce((acc, item) => {
          const category = item.categoria || 'General';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push({
            id: item.id.toString(),
            etiqueta: item.etiqueta,
            valor: item.valor,
            tipo_dato: item.tipo_dato,
            icono: item.icono,
            orden: item.orden || 0,
          });
          return acc;
        }, {});
        Object.values(groupedData).forEach(category =>
          category.sort((a, b) => a.orden - b.orden)
        );
        setContactInfo(groupedData);
        setOpenCategories(
          Object.keys(groupedData).reduce((acc, category) => ({
            ...acc,
            [category]: true,
          }), {})
        );
      } catch (err) {
        console.error("Error fetching contact info:", err);
        setError(err.response?.data?.message || 'No se pudo cargar la información de contacto.');
        setContactInfo({});
      } finally {
        setLoading(false);
      }
    };
    fetchContactInfo();
  }, [API_BASE_URL]);

  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const renderIcon = (iconName) => {
    const IconComponent = iconComponents[iconName];
    return IconComponent ? (
      <IconComponent className="text-blue-600 text-xl" />
    ) : (
      <FaInfoCircle className="text-blue-600 text-xl" />
    );
  };

  const renderItemValue = (item) => {
    switch (item.tipo_dato) {
      case 'email':
        return (
          <a
            href={`mailto:${encodeURIComponent(item.valor)}`}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {item.etiqueta}
          </a>
        );
      case 'telefono':
        return (
          <a
            href={`tel:${item.valor}`}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <HtmlRenderer htmlString={item.etiqueta} />
          </a>
        );
      case 'instagram':
      case 'facebook':
      case 'twitter':
      case 'enlace_web':
        if (item.valor.startsWith('/')) {
          return (
            <Link
              to={item.valor}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <HtmlRenderer htmlString={item.etiqueta} />
            </Link>
          );
        }
        return (
          <a
            href={item.valor}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <HtmlRenderer htmlString={item.etiqueta} />
          </a>
        );
        case 'texto_simple':
          return (
            <div className="text-base text-gray-800 leading-relaxed break-words">
              <HtmlRenderer htmlString={item.valor} />
            </div>
          );
      default:
        return <HtmlRenderer htmlString={item.etiqueta} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-xl">
          <i className="fas fa-spinner fa-spin fa-3x text-blue-500"></i>
          <p className="text-gray-800 text-lg mt-3">Cargando información de contacto...</p>
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

  const categoriasOrdenadas = [
    'Redes Sociales', 'Correo y Teléfono', 'Enlaces Institucionales', 'Próximas Actividades',
  ];

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
                Contáctanos
              </h1>
              <p className="text-base text-gray-800 leading-relaxed mt-4 text-center break-words">
                Encuentra aquí nuestras redes sociales, correos de contacto y enlaces institucionales relacionados con CardioUCM y la Facultad de Ciencias de la Salud.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Sección de contenido: se quita 'container-fluid' */}
        <section className="content">
          <div>
            {Object.keys(contactInfo).length === 0 ? (
              <div className="text-center p-10 bg-white rounded-lg shadow-xl">
                <i className="fas fa-info-circle fa-3x text-blue-400 mb-4"></i>
                <p className="text-gray-800 text-xl">
                  No hay información de contacto disponible.
                </p>
                <p className="text-gray-600 mt-2 text-base">
                  Vuelve a intentarlo más tarde.
                </p>
              </div>
            ) : (
              categoriasOrdenadas
                .filter(cat => contactInfo[cat])
                .concat(Object.keys(contactInfo).filter(cat => !categoriasOrdenadas.includes(cat)))
                .map(categoria => (
                  <div key={categoria} className="mb-6">
                    <button
                      onClick={() => toggleCategory(categoria)}
                      className="w-full text-left p-4 bg-white rounded-lg shadow-xl flex justify-between items-center hover:bg-gray-50 transition-colors"
                      aria-label={`Alternar ${categoria}`}
                    >
                      <h2 className="text-2xl md:text-3xl font-semibold mb-2 text-blue-600 border-b-2 border-blue-200 pb-2 break-words">
                      {categoria}
                      </h2>
                      <i className={`fas fa-chevron-${openCategories[categoria] ? 'up' : 'down'} text-blue-600 text-lg`}></i>
                    </button>
                    {openCategories[categoria] && (
                      <div className="bg-white p-4 md:p-6 mt-1 rounded-b-lg shadow-xl">
                        <div className="space-y-6">
                          {contactInfo[categoria].map(item => (
                            <div
                              key={item.id}
                              className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-start gap-4"
                            >
                              {item.icono && renderIcon(item.icono)}
                              {!item.icono && item.tipo_dato !== 'texto_simple' && (
                                <span className="w-5 h-5 flex-shrink-0"></span> // Placeholder para alinear
                              )}
                              <div className={`text-base ${item.tipo_dato === 'texto_simple' ? 'w-full' : ''} break-words`}>
                                {renderItemValue(item)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Contactanos;