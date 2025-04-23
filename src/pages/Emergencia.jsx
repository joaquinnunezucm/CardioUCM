const Emergencia = () => {
  const numeroEmergencia = "991670040"; // 🔁 Cambia este número por el que tú quieras

  const llamar = () => {
    // Intenta realizar la llamada (funciona solo en móviles)
    window.location.href = `tel:${numeroEmergencia}`;

    // También puedes dejar el alert como confirmación:
    alert(`Simulación de llamada al ${numeroEmergencia} 📞`);
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
