import React from 'react';
import { Link } from 'react-router-dom';

const BackButton = () => {
  const handleClick = () => {
    console.log('BackButton clicked! Navigating to /');
  };

  return (
    <Link
      to="/"
      onClick={handleClick}
      className="absolute top-4 left-4 flex items-center text-black-600 hover:text-black-800 transition-colors duration-200 z-50"
      title="Volver al inicio"
      aria-label="Volver a la página principal"
    >
      <i className="fas fa-arrow-left text-xl mr-2"></i>
      <span className="text-sm font-medium">Volver</span>
    </Link>
  );
};

export default BackButton;