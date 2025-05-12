// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

// Componentes de páginas públicas
import Home from "./pages/Home";
import Emergencia from "./pages/Emergencia";
import RCP_Public from "./pages/RCP";
import UbicacionDEA_Public from "./pages/UbicacionDEA";
import Educacion from "./pages/Educacion";
import Noticias_Public from "./pages/Noticias";
import FAQ_Public from "./pages/FAQ";
import Login from "./pages/Login";

// Componentes de administración
import Dashboard from "./pages/Dashboard"; // Este es el Layout principal de Admin
import DashboardActualContent from "./pages/DashboardActualContent"; // Contenido específico para /admin
import ValidacionDeas from './pages/ValidacionDeas';
import ControlUsuarios from './pages/ControlUsuarios';
import GestionFAQs from './pages/GestionFAQs.jsx';

// Componente wrapper para el contenido interno de las páginas de admin
const AdminPageContentWrapper = ({ title, breadcrumbCurrent, children }) => (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">{title}</h1></div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/admin">Dashboard</Link></li>
                <li className="breadcrumb-item active">{breadcrumbCurrent}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      <section className="content"><div className="container-fluid">{children}</div></section>
    </>
);

// Vistas de admin (placeholders o reutilizando componentes públicos)
const ReportesAdmin = () => <AdminPageContentWrapper title="Reportes" breadcrumbCurrent="Reportes"><div className="card"><div className="card-body">Contenido de Reportes...</div></div></AdminPageContentWrapper>;
const RCPAdminView = () => <AdminPageContentWrapper title="Capacitación RCP (Admin)" breadcrumbCurrent="RCP"><RCP_Public /></AdminPageContentWrapper>;
const DEAsAdminView = () => <AdminPageContentWrapper title="Ubicación DEAs (Admin)" breadcrumbCurrent="DEAs"><UbicacionDEA_Public /></AdminPageContentWrapper>;
const NoticiasAdminView = () => <AdminPageContentWrapper title="Noticias (Admin)" breadcrumbCurrent="Noticias"><Noticias_Public /></AdminPageContentWrapper>;
const FAQAdminView = () => <AdminPageContentWrapper title="Ver FAQs Públicas (Admin)" breadcrumbCurrent="FAQ (Vista)"><FAQ_Public /></AdminPageContentWrapper>;


// Componente wrapper para rutas protegidas por rol
const ProtectedRouteWithRole = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  if (authLoading) return <div className="d-flex justify-content-center align-items-center vh-100"><i className="fas fa-spinner fa-spin fa-3x"></i></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && allowedRoles.includes(user.rol)) return children; // Renderiza el children (ej. <Dashboard /> como layout)
  return <Navigate to="/login" state={{ message: "No tiene los permisos necesarios." }} replace />;
};

function AppContent() {
  const rolesAdminYSuper = ['administrador', 'superadministrador'];
  const rolesSoloSuper = ['superadministrador'];

  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/emergencia" element={<Emergencia />} />
      <Route path="/educacion" element={<Educacion />} />
      <Route path="/rcp" element={<RCP_Public />} />
      <Route path="/dea" element={<UbicacionDEA_Public />} />
      <Route path="/noticias" element={<Noticias_Public />} />
      <Route path="/faq" element={<FAQ_Public />} />

      {/* Rutas de Administración */}
      <Route
        path="/admin" // Ruta base para el layout de admin
        element={
          <ProtectedRouteWithRole allowedRoles={rolesAdminYSuper}>
            <Dashboard /> {/* Dashboard.jsx actúa como el Layout que contiene <Outlet /> */}
          </ProtectedRouteWithRole>
        }
      >
        {/* Rutas anidadas que se renderizarán en el <Outlet /> de Dashboard.jsx */}
        <Route index element={<DashboardActualContent />} /> {/* Para /admin */}
        <Route path="capacitacion" element={<RCPAdminView />} />
        <Route path="deas" element={<DEAsAdminView />} />
        <Route path="noticias" element={<NoticiasAdminView />} />
        <Route path="faq" element={<FAQAdminView />} />
        <Route path="validacion-deas" element={<ValidacionDeas />} />
        <Route path="reportes" element={<ReportesAdmin />} />
        <Route path="gestion-faq" element={<GestionFAQs />} />
        <Route
          path="control-usuarios"
          element={
            <ProtectedRouteWithRole allowedRoles={rolesSoloSuper}>
              <ControlUsuarios />
            </ProtectedRouteWithRole>
          }
        />
        {/* Fallback para subrutas de /admin no encontradas, redirige al dashboard de admin */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      {/* Fallback general para rutas no encontradas */}
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