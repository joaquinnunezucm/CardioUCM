const Emergencia = () => {
    const llamar = () => {
      alert("Simulación de llamada al 131 🚨");
      // window.location.href = "tel:131"; ← esto solo funciona en móviles
    };
  
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
        <h1 className="text-2xl font-bold text-red-800 mb-4">Llamar a Emergencia</h1>
        <button
          onClick={llamar}
          className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-red-700 transition"
        >
          Llamar al 131 🚑
        </button>
      </div>
    );
  };
  
  export default Emergencia;
  