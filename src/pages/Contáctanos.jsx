import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaInstagram, FaEnvelope, FaGlobe, FaPhone, FaFacebook, FaTwitter, FaInfoCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import BackButton from '../pages/BackButton.jsx';
import DOMPurify from 'dompurify';
import { API_BASE_URL } from '../utils/api';

// Mapeo de nombres de iconos a componentes
const iconComponents = {
  FaInstagram,
  FaEnvelope,
  FaGlobe,
  FaPhone,
  FaFacebook,
  FaTwitter,
  FaInfoCircle,
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

        // Sort items within each category
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
      <IconComponent className="text-blue-600 text-base xs:text-lg sm:text-xl" />
    ) : (
      <FaInfoCircle className="text-blue-600 text-base xs:text-lg sm:text-xl" />
    );
  };

const renderItemValue = (item) => {
  switch (item.tipo_dato) {
    case 'email':
      return (
        <a
          href={`mailto:${encodeURIComponent(item.valor)}`}
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
          onClick={(e) => {
            e.stopPropagation(); // Evita la propagación al contenedor padre
            console.log('Email link clicked:', {
              valor: item.valor,
              etiqueta: item.etiqueta,
              href: `mailto:${encodeURIComponent(item.valor)}`
            }); // Debug: Log para verificar
            if (!item.valor.includes('@')) {
              e.preventDefault();
              alert('La dirección de correo no es válida.');
            }
          }}
        >
          {item.etiqueta}
        </a>
      );
    case 'telefono':
      return (
        <a
          href={`tel:${item.valor}`}
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
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
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
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
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
        >
          <HtmlRenderer htmlString={item.etiqueta} />
        </a>
      );
    case 'texto_simple':
      return (
        <div className="text-gray-800 text-sm xs:text-base sm:text-base md:text-lg leading-relaxed">
          <HtmlRenderer htmlString={item.valor} />
        </div>
      );
    default:
      return <HtmlRenderer htmlString={item.etiqueta} />;
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-100">
        <div className="text-center bg-white p-6 xs:p-8 rounded-lg shadow-xl">
          <i className="fas fa-spinner fa-spin fa-2x xs:fa-3x text-blue-500"></i>
          <p className="text-gray-800 text-base sm:text-lg md:text-xl mt-3">Cargando información de contacto...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-100">
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

  // Ordered categories
  const categoriasOrdenadas = [
    'Redes Sociales',
    'Correo y Teléfono',
    'Enlaces Institucionales',
    'Próximas Actividades',
  ];

  return (
    <div className="min-h-screen flex flex-col items-center p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-100">
      <BackButton />
      <div className="w-full max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-3xl flex flex-col my-2 xs:my-3 sm:my-4 md:my-6">
        <div className="content-header py-4 xs:py-5 sm:py-6 bg-white rounded-lg shadow-xl">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-12 text-center">
                <h1 className="m-0 text-2xl xs:text-3xl sm:text-3xl md:text-4xl lg:text-4xl font-bold text-blue-800 border-b-2 border-blue-200 pb-2">
                  Contáctanos
                </h1>
                <p className="text-gray-700 mt-2 text-sm xs:text-base sm:text-base md:text-lg text-center">
                  Encuentra aquí nuestras redes sociales, correos de contacto y enlaces institucionales relacionados con CardioUCM y la Facultad de Ciencias de la Salud.
                </p>
              </div>
            </div>
          </div>
        </div>
        <section className="content py-4 xs:py-5 sm:py-6">
          <div className="container-fluid">
            {Object.keys(contactInfo).length === 0 ? (
              <div className="text-center p-6 xs:p-8 sm:p-10 bg-white rounded-lg shadow-xl max-w-3xl mx-auto">
                <i className="fas fa-info-circle fa-2x xs:fa-3x text-blue-400 mb-4"></i>
                <p className="text-gray-800 text-base xs:text-lg sm:text-xl md:text-2xl">
                  No hay información de contacto disponible.
                </p>
                <p className="text-gray-600 mt-2 text-sm xs:text-base sm:text-lg">
                  Vuelve a intentarlo más tarde.
                </p>
              </div>
            ) : (
              categoriasOrdenadas
                .filter(cat => contactInfo[cat])
                .concat(Object.keys(contactInfo).filter(cat => !categoriasOrdenadas.includes(cat)))
                .map(categoria => (
                  <div key={categoria} className="mb-4 xs:mb-6 sm:mb-8">
                    <button
                      onClick={() => toggleCategory(categoria)}
                      className="w-full text-left p-4 xs:p-5 sm:p-6 bg-white rounded-lg shadow-xl flex justify-between items-center hover:bg-gray-50 transition-all duration-200 ease-in-out"
                      aria-label={`Alternar ${categoria}`}
                    >
                      <h2 className="text-xl xs:text-2xl sm:text-2xl md:text-3xl lg:text-3xl font-semibold text-blue-700">
                        {categoria}
                      </h2>
                      <i className={`fas fa-chevron-${openCategories[categoria] ? 'up' : 'down'} text-blue-600 text-base xs:text-lg sm:text-xl`}></i>
                    </button>
                    {openCategories[categoria] && (
                      <div className="bg-white p-3 xs:p-4 sm:p-5 md:p-6 rounded-b-lg shadow-xl">
                        <div className="space-y-6 xs:space-y-8 sm:space-y-10">
                          {contactInfo[categoria].map(item => (
                            <div
                              key={item.id}
                              className="border border-gray-200 rounded-lg p-3 xs:p-4 sm:p-5 bg-gray-50 flex items-start gap-3 xs:gap-4 sm:gap-5"
                            >
                              {item.icono && renderIcon(item.icono)}
                              {!item.icono && item.tipo_dato !== 'texto_simple' && (
                                <span className="w-5 h-5"></span>
                              )}
                              <div className={item.tipo_dato === 'texto_simple' ? 'w-full' : ''}>
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