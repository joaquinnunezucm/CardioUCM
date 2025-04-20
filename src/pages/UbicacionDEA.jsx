import { ubicacionesDEA } from "../data/ubicacionDEA";

const UbicacionDEA = () => {
  return (
    <div className="min-h-screen p-6 bg-blue-50">
      <h1 className="text-2xl font-bold mb-4 text-blue-900">Ubicación de DEA</h1>
      <ul className="space-y-4">
        {ubicacionesDEA.map((dea) => (
          <li key={dea.id} className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold">{dea.nombre}</h2>
            <p>📍 {dea.direccion}</p>
            <p>📏 Aprox. {dea.distancia}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UbicacionDEA;
