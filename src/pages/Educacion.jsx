// src/pages/Educacion.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Educacion = () => {
  const [metronomoActivo, setMetronomoActivo] = useState(false);
  const audioRef = useRef(null);
  const { user } = useAuth(); // Para el enlace condicional a /admin/deas

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

  // Estructura de datos para el contenido de Educación
  // La propiedad 'pregunta' ahora se usará como el 'título del tema'
  // y 'respuesta' será el 'contenido del tema'.
  const categoriasEducacion = [
    {
      idCategoria: 'conceptos-fundamentales',
      categoriaNombre: 'Conceptos Fundamentales',
      items: [
        { id: 'c1', tituloTema: '¿Qué es un Paro Cardiorrespiratorio?', contenidoTema: <p>Es una situación en la que el corazón deja de latir de forma súbita y la persona deja de respirar, generando una pérdida total de conciencia. El tiempo es vital: cada minuto que pasa disminuye las probabilidades de supervivencia en un 10%.</p> },
        { id: 'c2', tituloTema: '¿Diferencia entre Paro Cardíaco y Ataque al Corazón?', contenidoTema: <p>Un paro cardíaco es una emergencia eléctrica en el corazón que causa que deje de latir de manera normal. Un infarto agudo al miocardio o ataque al corazón es un problema de circulación, usualmente por una arteria bloqueada que daña el músculo cardíaco. Un ataque al corazón puede llevar a un paro cardíaco.</p> },
        { id: 'c3', tituloTema: 'Cadena de Supervivencia', contenidoTema: <><p className="mb-2">La Cadena de Supervivencia describe los pasos críticos para mejorar la supervivencia tras un paro cardíaco:</p><ol className="list-decimal ml-6 space-y-1"><li>Reconocimiento y activación del sistema de emergencias.</li><li>RCP precoz de alta calidad.</li><li>Desfibrilación rápida.</li><li>Servicios de Emergencias Médicas avanzados.</li><li>Soporte vital avanzado y cuidados postparo.</li></ol></> },
      ],
    },
    {
      idCategoria: 'rcp-info',
      categoriaNombre: 'Reanimación Cardiopulmonar (RCP)',
      items: [
        { id: 'r1', tituloTema: '¿Qué es la RCP y por qué es importante?', contenidoTema: <><p className="mb-2">La Reanimación Cardiopulmonar (RCP) es un conjunto de maniobras que mantienen artificialmente la circulación de oxígeno. Puede duplicar o triplicar la probabilidad de supervivencia.</p><ul className="list-disc ml-6 space-y-1"><li>Debe iniciarse lo antes posible.</li><li>Debe combinarse con el uso del DEA.</li></ul></> },
        { id: 'r2', tituloTema: '¿Cómo realizar RCP en Adultos? (AÑADIR SESION DE FOTOS)', contenidoTema: <><p className="mb-2">Si encuentras a un adulto que no responde y no respira normalmente:</p><ol className="list-decimal ml-6 space-y-1"><li>Asegura la escena.</li><li>Evalúa respuesta.</li><li>Pide ayuda y llama al 131. Pide un DEA.</li><li>Inicia compresiones torácicas: 100-120 por minuto, 5-6 cm de profundidad.</li><li>Si estás entrenado, realiza 30 compresiones y 2 ventilaciones. Si no, solo compresiones continuas.</li><li>Continúa hasta que llegue ayuda, la víctima se mueva, o llegue el DEA.</li></ol></> },
        { id: 'r3', tituloTema: 'RCP Solo con las Manos', contenidoTema: <p>Si no estás entrenado en ventilaciones o no te sientes cómodo, puedes realizar RCP solo con compresiones torácicas continuas. Empuja fuerte y rápido en el centro del pecho a un ritmo de 100-120 compresiones por minuto.</p> },
        { id: 'r4', tituloTema: 'Entrenamiento en RCP (AÑADIR LINK AL CURSO https://postgrados.ucm.cl/curso-reanimacion-cardiopulmonar-basica-y-manejo-del-dea/)', contenidoTema: <p>Aunque cualquier intento es mejor que nada, un entrenamiento formal mejora significativamente la efectividad. Busca cursos de RCP y primeros auxilios en tu comunidad.</p> },
      ],
    },
    {
      idCategoria: 'dea-info',
      categoriaNombre: 'Desfibrilador Externo Automático (DEA)',
      items: [
        { id: 'd1', tituloTema: '¿Qué es un DEA y cómo se usa?', contenidoTema: <><p className="mb-2">Un DEA es un dispositivo portátil que analiza el ritmo cardíaco y administra una descarga eléctrica si es necesario.</p><ol className="list-decimal ml-6 space-y-1"><li>Enciende el DEA y sigue las instrucciones de voz.</li><li>Aplica los parches en el pecho desnudo de la víctima como indican los diagramas.</li><li>Asegúrate de que nadie toque a la víctima durante el análisis y la descarga.</li><li>Reanuda la RCP inmediatamente después de la descarga o si el DEA lo indica.</li></ol></> },
        { id: 'd2', tituloTema: '¿Puedo usar un DEA sin entrenamiento?', contenidoTema: <p>Sí. Los DEAs están diseñados para ser usados por cualquier persona, guiando con instrucciones claras. Sin embargo, la familiarización previa es beneficiosa.</p> },
        { id: 'd3', tituloTema: 'Uso del DEA en Niños (AÑADIR FOTOS)', contenidoTema: <p>Sí. Para niños menores de 8 años o menos de 25 kg, usa parches pediátricos y un atenuador de dosis si está disponible. Si no, usa parches de adulto asegurándote que no se toquen (uno en el pecho, otro en la espalda).</p> },
        { id: 'd4', tituloTema: '¿Dónde encontrar un DEA?', contenidoTema: <p>En lugares públicos como universidades, centros comerciales, aeropuertos. Esta aplicación te ayuda a localizar DEAs registrados cercanos (puedes acceder al <Link to={user && (user.rol === 'administrador' || user.rol === 'superadministrador') ? "/admin/deas" : "/dea"} className="text-blue-600 underline hover:text-blue-800">mapa de DEAs aquí</Link>).</p> },
      ],
    },
    {
      idCategoria: 'evaluacion-victima',
      categoriaNombre: 'Evaluación de la Víctima y Algoritmo de Actuación',
      items: [
        { id: 'ev0', tituloTema: 'Introducción a la Evaluación de la Víctima', contenidoTema: <p className="mb-4 text-gray-700 text-base">Al encontrar a alguien inconsciente, evalúa rápidamente: <strong>¿Responde? ¿Respira normalmente?</strong> (No confundir jadeos/boqueos con respiración normal). A continuación se describen los escenarios:</p> },
        { id: 'ev1', tituloTema: 'Escenario 1: Víctima RESPONDE y RESPIRA NORMALMENTE', contenidoTema: <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700 leading-relaxed"><li>Colocar en posición lateral de seguridad (si no hay sospecha de trauma).</li><li>Llamar al 131 para evaluación.</li><li>Vigilar constantemente.</li></ul> },
        { id: 'ev2', tituloTema: 'Escenario 2: Víctima NO RESPONDE pero RESPIRA NORMALMENTE', contenidoTema: <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700 leading-relaxed"><li>Colocar en posición lateral de seguridad.</li><li>Llamar al 131 URGENTEMENTE.</li><li>Controlar respiración; si se detiene, iniciar RCP.</li></ul> },
        { 
          id: 'ev3', 
          tituloTema: 'Escenario 3: Víctima NO RESPONDE y NO RESPIRA NORMALMENTE (o solo jadea)', 
          contenidoTema: (
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
          )
        },
      ],
    },
    {
      idCategoria: 'primeros-auxilios',
      categoriaNombre: 'Primeros Auxilios Adicionales',
      items: [
        { id: 'pa1', tituloTema: 'Control de Hemorragias', contenidoTema: <p>Aplicar presión directa sobre la herida con un paño limpio. Elevar el miembro afectado si es posible. Si el sangrado es severo, llamar a emergencias.</p> },
        { id: 'pa2', tituloTema: 'Desmayos (Síncope)', contenidoTema: <p>Acostar a la persona y elevar sus piernas unos 30 cm. Aflojar ropa apretada. Asegurar ventilación. Si no recupera la conciencia rápidamente, llamar a emergencias.</p> },
        { id: 'pa3', tituloTema: 'Obstrucción de Vía Aérea (OVACE)', contenidoTema: <p>Si la persona tose con fuerza, animarla a seguir tosiendo. Si no puede toser, hablar o respirar (obstrucción severa): realizar la maniobra de Heimlich en adultos/niños; en lactantes, 5 golpes en la espalda y 5 compresiones torácicas.</p> },
      ],
    },
    {
      idCategoria: 'prevencion-cardio',
      categoriaNombre: 'Prevención Cardiovascular',
      items: [
        { id: 'pv1', tituloTema: 'Alimentación Saludable', contenidoTema: <p>Consume frutas, verduras, granos integrales, proteínas magras. Limita grasas saturadas y trans, azúcares añadidos y sodio.</p> },
        { id: 'pv2', tituloTema: 'Actividad Física', contenidoTema: <p>Realiza al menos 150 minutos de actividad aeróbica moderada o 75 minutos de actividad vigorosa por semana, más ejercicios de fortalecimiento muscular.</p> },
        { id: 'pv3', tituloTema: 'Otros Hábitos Saludables', contenidoTema: <p>No fumar, controlar el estrés, mantener un peso saludable, controlar la presión arterial y el colesterol, limitar el alcohol.</p> },
      ],
    }
  ];

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

          {categoriasEducacion.map((categoria) => (
            <div key={categoria.idCategoria} className="mb-10 bg-white p-4 md:p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-blue-700 border-b-2 border-blue-100 pb-3 text-center md:text-left">
                {categoria.categoriaNombre}
              </h2>
              <div className="max-w-none md:max-w-4xl mx-auto space-y-6">
                {categoria.items.map((item, itemIndex) => (
                  <div key={item.id} className="pb-4">
                    {item.tituloTema && ( // Mostrar título del tema si existe
                        <h3 className="text-xl md:text-2xl font-medium text-gray-800 mb-3"> {/* Título del tema específico */}
                        {item.tituloTema}
                        </h3>
                    )}
                    {/* Contenido del tema */}
                    <div className="text-gray-700 text-sm md:text-base leading-relaxed">
                      {item.contenidoTema}
                    </div>
                    {/* Separador visual entre ítems, excepto el último de la categoría */}
                    {itemIndex < categoria.items.length - 1 && (
                        <hr className="my-6 border-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <audio ref={audioRef} src="/assets/metronome.mp3" preload="auto" />
        </div>
      </section>
    </>
  );
};

export default Educacion;