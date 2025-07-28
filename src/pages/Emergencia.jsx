import React from 'react';
import Swal from 'sweetalert2';

const Emergencia = () => {
  const numeroEmergencia = "131"; 

  const llamar = () => {
    // Intentar realizar la llamada (funciona solo en móviles)
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `tel:${numeroEmergencia}`;
    }

    // Mostrar alerta de confirmación con SweetAlert2
    Swal.fire({
      title: 'Llamada de Emergencia',
      text: isMobile
        ? `Simulación de llamada al ${numeroEmergencia} 📞`
        : `No se puede realizar la llamada en un ordenador. Número: ${numeroEmergencia} 📞`,
      icon: 'info',
      confirmButtonText: 'OK',
      confirmButtonColor: '#dc2626', // Color rojo que combina con bg-red-600
      background: '#fef2f2', // Fondo claro que combina con bg-red-50
      customClass: {
        popup: 'rounded-lg',
        title: 'text-red-800 font-bold',
        content: 'text-gray-800',
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
      <h1 className="text-2xl font-bold text-red-800 mb-4">Llamar a Emergencia</h1>
      <button
        onClick={llamar}
        className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-red-700 transition"
      >
        Llamar al {numeroEmergencia} 🚑
      </button>
    </div>
  );
};

export default Emergencia;