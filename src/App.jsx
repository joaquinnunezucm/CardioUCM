// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx"; // Asegúrate que sea .jsx si usas JSX

// Componentes de páginas públicas
import Home from "./pages/Home";
import Emergencia from "./pages/Emergencia";
import RCP from "./pages/RCP";
import UbicacionDEA from "./pages/UbicacionDEA";
import Educacion from "./pages/Educacion";
import Noticias from "./pages/Noticias";
import FAQ from "./pages/FAQ";

// Componentes de administración y login
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ValidacionDeas from './pages/ValidacionDeas';
import ControlUsuarios from './pages/ControlUsuarios'; // <-- NUEVA IMPORTACIÓN

const ReportesAdmin = () => (
  <div style={{ padding: '20px' }}>
    <h1>Sección de Reportes</h1>
    <p>Contenido de reportes del administrador irá aquí.</p>
    <p><a href="/admin">Volver al Dashboard</a></p>
  </div>
);

// Componente wrapper para rutas protegidas por rol
const ProtectedRouteWithRole = ({ allowedRoles }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div>Verificando sesión...</div>; // O un spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && allowedRoles.includes(user.rol)) {
    return <Outlet />; // Renderiza el componente hijo
  } else {
    // Si está autenticado pero no tiene el rol, podría ir a una página de "Acceso Denegado"
    // o de vuelta al dashboard si ya está en una subruta no permitida.
    // Por ahora, redirigimos a login con un mensaje o al dashboard.
    console.warn(`Acceso denegado. Usuario: ${user?.email}, Rol: ${user?.rol}, Roles Permitidos: ${allowedRoles.join(', ')}`);
    return <Navigate to="/admin" state={{ message: "No tiene los permisos necesarios para acceder a esta sección." }} replace />;
    // O si prefieres siempre a login:
    // return <Navigate to="/login" state={{ message: "No tiene los permisos necesarios para acceder a esta sección." }} replace />;
  }
};

function AppContent() {
  const rolesAdminYSuper = ['administrador', 'superadministrador'];
  const rolesSoloSuper = ['superadministrador'];

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/emergencia" element={<Emergencia />} />
      <Route path="/rcp" element={<RCP />} />
      <Route path="/dea" element={<UbicacionDEA />} />
      <Route path="/educacion" element={<Educacion />} />
      <Route path="/noticias" element={<Noticias />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/login" element={<Login />} />

      {/* Rutas de Administración (Protegidas para Admin y Superadmin) */}
      <Route element={<ProtectedRouteWithRole allowedRoles={rolesAdminYSuper} />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/capacitacion" element={<RCP />} />
        <Route path="/admin/deas" element={<UbicacionDEA />} />
        <Route path="/admin/noticias" element={<Noticias />} />
        <Route path="/admin/faq" element={<FAQ />} />
        <Route path="/admin/validacion-deas" element={<ValidacionDeas />} />
        <Route path="/admin/reportes" element={<ReportesAdmin />} />
      </Route>

      {/* Ruta de Administración (Protegida SOLO para Superadmin) */}
      <Route element={<ProtectedRouteWithRole allowedRoles={rolesSoloSuper} />}>
        <Route path="/admin/control-usuarios" element={<ControlUsuarios />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;