import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Componentes de páginas públicas
import Home from "./pages/Home";
import Emergencia from "./pages/Emergencia";
import RCP from "./pages/RCP";
import UbicacionDEA from "./pages/UbicacionDEA"; // Este se usará también para /admin/deas
import Educacion from "./pages/Educacion";
import Noticias from "./pages/Noticias";     // Este se usará también para /admin/noticias
import FAQ from "./pages/FAQ";             // Este se usará también para /admin/faq

// Componentes de administración y login
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ValidacionDeas from './pages/ValidacionDeas';

// Placeholder para la sección de Reportes del Admin
const ReportesAdmin = () => (
  <div style={{ padding: '20px' }}>
    <h1>Sección de Reportes</h1>
    <p>Contenido de reportes del administrador irá aquí.</p>
    <p><a href="/admin">Volver al Dashboard</a></p>
  </div>
);

// Placeholder para otras secciones del admin si los componentes públicos no son adecuados
// y se necesita una vista específica de admin. Por ahora, usaremos los públicos.
// const CapacitacionAdmin = () => <div><h1>Admin: Capacitación RCP</h1> <p><a href="/admin">Volver al Dashboard</a></p> </div>;
// const EmergenciasAdmin = () => <div><h1>Admin: Gestión de Emergencias</h1> <p><a href="/admin">Volver al Dashboard</a></p> </div>;


function App() {
  const isAuthenticated = localStorage.getItem('loggedIn') === "true";

  // Componente wrapper para rutas protegidas
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/emergencia" element={<Emergencia />} /> {/* Pública */}
        <Route path="/rcp" element={<RCP />} /> {/* Pública */}
        <Route path="/dea" element={<UbicacionDEA />} /> {/* Pública */}
        <Route path="/educacion" element={<Educacion />} />
        <Route path="/noticias" element={<Noticias />} /> {/* Pública */}
        <Route path="/faq" element={<FAQ />} /> {/* Pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas de Administración (Protegidas) */}
        <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        
        {/* Rutas del Dashboard (modulosHome) */}
        <Route path="/admin/capacitacion" element={<ProtectedRoute><RCP /></ProtectedRoute>} /> {/* Asumiendo que RCP.js sirve para admin */}
        <Route path="/admin/deas" element={<ProtectedRoute><UbicacionDEA /></ProtectedRoute>} /> {/* Asumiendo que UbicacionDEA.js sirve para admin */}
        <Route path="/admin/noticias" element={<ProtectedRoute><Noticias /></ProtectedRoute>} /> {/* Asumiendo que Noticias.js sirve para admin */}
        <Route path="/admin/emergencias" element={<ProtectedRoute><Emergencia /></ProtectedRoute>} /> {/* Asumiendo que Emergencia.js sirve para admin */}
        <Route path="/admin/faq" element={<ProtectedRoute><FAQ /></ProtectedRoute>} /> {/* Asumiendo que FAQ.js sirve para admin */}

        {/* Rutas del Dashboard (modulosAdmin) */}
        <Route path="/admin/validacion-deas" element={<ProtectedRoute><ValidacionDeas /></ProtectedRoute>} />
        <Route path="/admin/reportes" element={<ProtectedRoute><ReportesAdmin /></ProtectedRoute>} />

        {/* Ruta por defecto para cualquier otra URL no encontrada */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;