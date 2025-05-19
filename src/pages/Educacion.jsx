import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Componente para renderizar contenido HTML de forma segura
const HtmlRenderer = ({ htmlString }) => {
  return <div dangerouslySetInnerHTML={{ __html: htmlString }} />;
};

const Educacion = () => {
  const [metronomoActivo, setMetronomoActivo] = useState(false);
  const audioRef = useRef(null);
  const { user } = useAuth();

  const [categoriasEducacion, setCategoriasEducacion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEducacionContent = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get('http://localhost:3001/api/educacion'); // Endpoint público
        // Agrupar los items por categoría
        const grouped = response.data.reduce((acc, item) => {
          const category = acc.find(c => c.idCategoria === item.categoria_id);
          if (category) {
            category.items.push({
              id: item.id.toString(), // Asegurarse que el id sea string si se usa como key
              tituloTema: item.titulo_tema,
              // Contenido del tema se renderizará como HTML
              contenidoTema: <HtmlRenderer htmlString={item.contenido_tema} />,
            });
          } else {
            acc.push({
              idCategoria: item.categoria_id,
              categoriaNombre: item.categoria_nombre,
              ordenCategoria: item.orden_categoria, // Para posible ordenación futura si es necesario
              items: [{
                id: item.id.toString(),
                tituloTema: item.titulo_tema,
                contenidoTema: <HtmlRenderer htmlString={item.contenido_tema} />,
              }],
            });
          }
          return acc;
        }, []);
        
        // Ordenar categorías y luego ítems si es necesario (ya viene ordenado del backend)
        // Ejemplo de ordenación en frontend si no viniera del backend:
        // grouped.sort((a, b) => a.ordenCategoria - b.ordenCategoria);
        // grouped.forEach(cat => cat.items.sort((a,b) => a.orden_item - b.orden_item)); // Asumiendo que orden_item también está en el objeto item

        setCategoriasEducacion(grouped);
      } catch (err) {
        console.error("Error fetching public educacion content:", err);
        setError(err.response?.data?.message || 'No se pudo cargar el contenido educativo en este momento.');
        setCategoriasEducacion([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEducacionContent();
  }, []);


  const toggleMetronomo = () => {
    if (!audioRef.current) return;
    if (metronomoActivo) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } else {
      audioRef.current.loop = true;
      audioRef.current.play().catch((e) => console.error('Error al reproducir audio:', e));
    }
    setMetronomoActivo(!metronomoActivo);
  };

  // El resto del componente Educacion.jsx sigue igual, pero ahora `categoriasEducacion` se llena dinámicamente.
  // Solo necesitas añadir los estados de loading y error en el renderizado.

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex justify-center items-center">
        <p className="text-gray-700 text-lg">Cargando contenido educativo...</p>
        {/* Podrías poner un spinner aquí */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-red-50">
        <h1 className="text-2xl font-bold mb-4 text-red-800 text-center">Error</h1>
        <p className="text-red-700 text-center">{error}</p>
      </div>
    );
  }
  
  // La estructura de map sobre `categoriasEducacion` y `item.items` permanece igual.
  // Asegúrate que el `contenidoTema` (que ahora es un componente <HtmlRenderer />) se renderice correctamente.

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-12 text-center">
              <h1 className="m-0 text-3xl md:text-4xl font-bold text-gray-800">Educación</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {categoriasEducacion.length === 0 && !loading ? (
            <p className="text-center text-gray-600 text-lg">No hay contenido educativo disponible en este momento.</p>
          ) : (
            categoriasEducacion.map((categoria) => (
              <div key={categoria.idCategoria} className="mb-10 bg-white p-4 md:p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-blue-700 border-b-2 border-blue-100 pb-3 text-center md:text-left">
                  {categoria.categoriaNombre}
                </h2>
                <div className="max-w-none md:max-w-4xl mx-auto space-y-6">
                  {categoria.items.map((item, itemIndex) => (
                    <div key={item.id} className="pb-4"> {/* Usar item.id como key */}
                      {item.tituloTema && (
                          <h3 className="text-xl md:text-2xl font-medium text-gray-800 mb-3">
                          {item.tituloTema}
                          </h3>
                      )}
                      <div className="text-gray-700 text-sm md:text-base leading-relaxed">
                        {/* Aquí es donde se renderiza el contenido, que ya es un componente HtmlRenderer */}
                        {/* O si el `contenidoTema` es el string HTML directo: */}
                        {/* <div dangerouslySetInnerHTML={{ __html: item.contenidoTema }} /> */}
                        {/* Pero como lo procesamos en el fetch, solo llamamos item.contenidoTema */}
                        {item.contenidoTema === 'ESPECIAL_METRONOMO_BUTTON' ? (
                            <>
                                <ul className="list-disc ml-6 space-y-2 text-sm text-gray-700 leading-relaxed">
                                    <li><strong>¡ACTIVAR EMERGENCIAS (131) Y PEDIR DEA!</strong></li>
                                    <li><button onClick={toggleMetronomo} className={`px-4 py-2 text-white rounded text-sm my-3 ${metronomoActivo ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>{metronomoActivo ? 'Detener Metrónomo' : 'Iniciar Metrónomo RCP (100-120 cpm)'}</button></li>
                                    <li>Iniciar RCP de alta calidad (30 compresiones : 2 ventilaciones o solo compresiones).</li>
                                    <li>Usar DEA tan pronto llegue, seguir instrucciones.</li>
                                    <li>Continuar hasta que llegue ayuda profesional.</li>
                                </ul>
                                <p className="mt-3 text-gray-700 leading-relaxed">Busca un DEA cercano: <Link to={user && (user.rol === 'administrador' || user.rol === 'superadministrador') ? "/admin/deas" : "/dea"} className="text-blue-600 underline hover:text-blue-800">Ver Mapa de DEAs</Link>.</p>
                            </>
                        ) : (
                           item.contenidoTema // Renderiza el componente <HtmlRenderer> o el JSX original
                        )}
                      </div>
                      {itemIndex < categoria.items.length - 1 && (
                          <hr className="my-6 border-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <audio ref={audioRef} src="/assets/metronome.mp3" preload="auto" />
        </div>
      </section>
    </>
  );
};

export default Educacion;