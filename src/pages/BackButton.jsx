import React from 'react';
import { Link } from 'react-router-dom';

const BackButton = () => {
  const handleClick = () => {
  };

  return (
    <div className="fixed top-2 xs:top-3 sm:top-4 left-2 xs:left-3 sm:left-4 z-50">
      <Link
        to="/"
        onClick={handleClick}
        className="flex items-center bg-white/80 text-gray-700 hover:bg-gray-200 hover:shadow-lg p-2 xs:p-3 rounded-full transition-all duration-200 ease-in-out transform hover:scale-105"
        title="Volver al inicio"
        aria-label="Volver a la página principal"
      >
        <i className="fas fa-arrow-left text-sm xs:text-base sm:text-lg mr-1 xs:mr-2"></i>
        <span className="text-xs xs:text-sm font-semibold">Volver</span>
      </Link>
    </div>
  );
};

export default BackButton;