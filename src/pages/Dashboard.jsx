import React, { useState } from 'react';

export default function Dashboard() {
  const usuario = "Juan Pérez"; // Simulación del usuario logueado

  const modulos = [
    "Reportes",
    "Capacitación RCP",
    "Ubicación de DEA",
    "Noticias",
    "Preguntas frecuentes",
    "Emergencia"
  ];

  const [clicks, setClicks] = useState(
    modulos.reduce((acc, modulo) => {
      acc[modulo] = 0;
      return acc;
    }, {})
  );

  const handleClick = (modulo) => {
    setClicks({ ...clicks, [modulo]: clicks[modulo] + 1 });
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-20 bg-blue-900 text-white flex flex-col items-center py-4 space-y-6">
        {modulos.map((modulo, index) => (
          <button
            key={index}
            onClick={() => handleClick(modulo)}
            title={modulo}
            className="hover:bg-blue-700 p-3 rounded-lg transition"
          >
            <span className="text-xl">📌</span>
          </button>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <div className="text-gray-600">Bienvenido, <span className="font-medium">{usuario}</span></div>
        </header>

        {/* Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {modulos.map((modulo, index) => (
            <div
              key={index}
              onClick={() => handleClick(modulo)}
              className="bg-white rounded-2xl shadow-md p-5 cursor-pointer hover:shadow-xl transition"
            >
              <h2 className="text-lg font-semibold text-blue-800 mb-2">{modulo}</h2>
              <p className="text-gray-500 text-sm">Clics: {clicks[modulo]}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
