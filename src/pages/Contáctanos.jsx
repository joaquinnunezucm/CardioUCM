// src/pages/Contactanos.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaInstagram, FaEnvelope, FaGlobe, FaPhone, FaFacebook, FaTwitter, FaInfoCircle } from 'react-icons/fa'; // Importa todos los que podrías usar
import { Link } from 'react-router-dom'; // Si algún enlace es interno

// Mapeo de nombres de iconos de string a componentes de React Icons
const iconComponents = {
  FaInstagram,
  FaEnvelope,
  FaGlobe,
  FaPhone,
  FaFacebook,
  FaTwitter,
  FaInfoCircle,
  // Añade más según necesites
};

const Contactanos = () => {
  const [contactInfo, setContactInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/contactos');
        // Agrupar por categoría
        const groupedData = response.data.reduce((acc, item) => {
          const category = item.categoria;
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(item);
          return acc;
        }, {});
        setContactInfo(groupedData);
      } catch (err) {
        setError('No se pudo cargar la información de contacto. Intenta más tarde.');
        console.error("Error fetching contact info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, []);

  const renderIcon = (iconName) => {
    const IconComponent = iconComponents[iconName];
    return IconComponent ? <IconComponent className="text-pink-500" /> : <FaInfoCircle className="text-pink-500" />; // Icono por defecto
  };

  const renderItemValue = (item) => {
    switch (item.tipo_dato) {
      case 'email':
        return <a href={`mailto:${item.valor}`} className="hover:underline">{item.etiqueta}</a>;
      case 'telefono':
        return <a href={`tel:${item.valor}`} className="hover:underline">{item.etiqueta}</a>;
      case 'instagram':
      case 'facebook':
      case 'twitter':
      case 'enlace_web':
        // Chequear si es un enlace interno de React Router
        if (item.valor.startsWith('/')) {
          return <Link to={item.valor} className="underline">{item.etiqueta}</Link>;
        }
        return (
          <a href={item.valor} target="_blank" rel="noopener noreferrer" className="underline">
            {item.etiqueta}
          </a>
        );
      case 'texto_simple':
        return <p className="text-gray-700 my-1">{item.etiqueta}</p>; // O item.valor si la etiqueta es más como un título
      default:
        return <span>{item.etiqueta}</span>;
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-pink-50 px-6 py-8 flex justify-center items-center">
        <div className="spinner-border text-pink-500" role="status">
          <span className="sr-only">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-pink-50 px-6 py-8 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  
  // Orden deseado de las categorías
  const categoriasOrdenadas = [
    "Redes Sociales", 
    "Correo y Teléfono", 
    "Enlaces Institucionales", 
    "Próximas Actividades"
    // Añade más si las tienes y quieres un orden específico
  ];


  return (
    <div className="min-h-screen bg-pink-50 px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-pink-700 mb-4 text-center">Contáctanos</h1>
        <p className="text-gray-700 mb-8 text-center text-sm sm:text-base">
          Encuentra aquí nuestras redes sociales, correos de contacto y enlaces institucionales relacionados con CardioUCM y la Facultad de Ciencias de la Salud.
        </p>

        <div className="space-y-8">
          {/* Renderizar categorías en el orden especificado, luego las restantes */}
          {categoriasOrdenadas.map(categoriaNombre => 
            contactInfo[categoriaNombre] && (
              <div key={categoriaNombre}>
                <h2 className="text-xl sm:text-2xl font-semibold text-pink-600 mb-3 border-b pb-2 border-pink-100">
                  {categoriaNombre}
                </h2>
                <ul className="space-y-3">
                  {contactInfo[categoriaNombre]
                    .sort((a,b) => a.orden - b.orden) // Asegurar orden dentro de la categoría
                    .map(item => (
                    <li key={item.id} className="flex items-start gap-3 text-gray-800">
                      {item.icono && renderIcon(item.icono)}
                      {!item.icono && item.tipo_dato !== 'texto_simple' && <span className="w-5 h-5"></span> /* Espacio si no hay icono */}
                      <div className={item.tipo_dato === 'texto_simple' ? 'w-full' : ''}>
                        {renderItemValue(item)}
                        {/* Si 'etiqueta' es solo un título para 'texto_simple' y 'valor' es el contenido: */}
                        {/* {item.tipo_dato === 'texto_simple' && <p className="text-gray-600 text-sm">{item.valor}</p>} */}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
          {/* Renderizar categorías no especificadas en el orden (si las hubiera) */}
          {Object.keys(contactInfo)
            .filter(cat => !categoriasOrdenadas.includes(cat))
            .map(categoriaNombre => 
            contactInfo[categoriaNombre] && (
              <div key={categoriaNombre}>
                <h2 className="text-xl sm:text-2xl font-semibold text-pink-600 mb-3 border-b pb-2 border-pink-100">
                  {categoriaNombre}
                </h2>
                <ul className="space-y-3">
                  {contactInfo[categoriaNombre]
                    .sort((a,b) => a.orden - b.orden)
                    .map(item => (
                    <li key={item.id} className="flex items-start gap-3 text-gray-800">
                      {item.icono && renderIcon(item.icono)}
                      {!item.icono && item.tipo_dato !== 'texto_simple' && <span className="w-5 h-5"></span>}
                      <div className={item.tipo_dato === 'texto_simple' ? 'w-full' : ''}>
                         {renderItemValue(item)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Contactanos;