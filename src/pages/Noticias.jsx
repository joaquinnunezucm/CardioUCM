import { noticias } from "../data/noticias";

const Noticias = () => {
  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Noticias</h1>
      {noticias.map((n) => (
        <div key={n.id} className="bg-white shadow p-4 rounded mb-4">
          <h2 className="text-xl font-semibold">{n.titulo}</h2>
          <p className="text-sm text-gray-500">{n.fecha}</p>
          <p className="mt-2">{n.contenido}</p>
        </div>
      ))}
    </div>
  );
};

export default Noticias;
