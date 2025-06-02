import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import '@fortawesome/fontawesome-free/css/all.min.css';

// --- Componentes de Páginas Públicas ---
import Home from "./pages/Home";
import Emergencia from "./pages/Emergencia";
import RCP_Public from "./pages/RCP"; // Renombrado para claridad si hay versión admin
import UbicacionDEA_Public from "./pages/UbicacionDEA"; // Renombrado para claridad
import Educacion_Public from "./pages/Educacion"; // Componente de contenido de Educación
import Contáctanos_Public from "./pages/Contáctanos";
import FAQ_Public from "./pages/FAQ";
import Login from "./pages/Login";

// --- Componentes de Administración (Layout y Páginas de Contenido) ---
import Dashboard from "./pages/Dashboard"; // Este actúa como el Layout principal del Admin
import DashboardActualContent from "./pages/DashboardActualContent"; // Contenido específico para la ruta /admin (index)
import ValidacionDeas from './pages/ValidacionDeas';
import ControlUsuarios from './pages/ControlUsuarios';
import GestionFAQs from './pages/GestionFAQs.jsx';
import GestionEducacion from './pages/GestionEducacion';
import GestionRCP from './pages/GestionRCP'; 
import GestionContactanos from './pages/GestionContactanos';
// --- Componente Wrapper para Contenido Interno de Páginas de Admin ---
// Este wrapper añade el content-header (título, breadcrumbs) y la section.content
// a los componentes de página que solo devuelven su JSX específico.
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

// --- Vistas de Admin que usan el Wrapper o son componentes completos ---
const ReportesAdmin = () => (
  <AdminPageContentWrapper title="Reportes del Sistema" breadcrumbCurrent="Reportes">
    <div className="card"><div className="card-body"><p>Contenido de la sección de reportes irá aquí.</p></div></div>
  </AdminPageContentWrapper>
);

// Vistas de admin que reutilizan componentes de contenido público, envueltos para el layout de admin
const RCPAdminView = () => <AdminPageContentWrapper title="Capacitación RCP" breadcrumbCurrent="RCP"><RCP_Public /></AdminPageContentWrapper>;
const DEAsAdminView = () => <AdminPageContentWrapper title="Ubicación DEAs" breadcrumbCurrent="DEAs"><UbicacionDEA_Public /></AdminPageContentWrapper>;
const ContáctanosAdminView = () => <AdminPageContentWrapper title="Contáctanos (Admin)" breadcrumbCurrent="Contáctanos"><Contáctanos_Public /></AdminPageContentWrapper>;
const FAQAdminView = () => <AdminPageContentWrapper title="Ver FAQs Públicas (Admin)" breadcrumbCurrent="FAQ (Vista)"><FAQ_Public /></AdminPageContentWrapper>;

// --- Componente ProtectedRouteWithRole (para proteger rutas basado en roles) ---
const ProtectedRouteWithRole = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  if (authLoading) { // Esperar a que el contexto de autenticación se cargue
    return <div className="d-flex justify-content-center align-items-center vh-100"><i className="fas fa-spinner fa-spin fa-3x"></i></div>;
  }
  if (!isAuthenticated) { // Si no está autenticado, redirigir a login
    return <Navigate to="/login" replace />;
  }
  if (user && allowedRoles.includes(user.rol)) { // Si está autenticado y tiene el rol permitido
    return children; // Renderizar el componente hijo (que podría ser el Layout o una página específica)
  }
  // Si está autenticado pero no tiene el rol permitido para esta ruta específica
  console.warn(`Acceso denegado por ProtectedRouteWithRole. Usuario: ${user?.email}, Rol: ${user?.rol}, Roles Permitidos: ${allowedRoles.join(', ')} para esta ruta anidada.`);
  // Redirigir a la página principal del dashboard de admin.
  // El Dashboard (Layout) a su vez mostrará/ocultará ítems del sidebar según el rol.
  return <Navigate to="/admin" state={{ message: "No tiene los permisos necesarios para acceder a esta sección específica." }} replace />;
};

function AppContent() {
  const rolesAdminYSuper = ['administrador', 'superadministrador'];
  const rolesSoloSuper = ['superadministrador'];

  return (
    <Routes>
      {/* --- Rutas Públicas --- */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/emergencia" element={<Emergencia />} />
      <Route path="/educacion" element={<Educacion_Public />} /> {/* Ruta pública de Educación */}
      <Route path="/rcp" element={<RCP_Public />} />
      <Route path="/dea" element={<UbicacionDEA_Public />} />
      <Route path="/contáctanos" element={<Contáctanos_Public />} />
      <Route path="/faq" element={<FAQ_Public />} />

      {/* --- Rutas de Administración --- */}
      <Route
        path="/admin"
        element={
          <ProtectedRouteWithRole allowedRoles={rolesAdminYSuper}>
            <Dashboard />
          </ProtectedRouteWithRole>
        }
      >
        {/* Rutas anidadas que se renderizarán en el <Outlet /> de Dashboard.jsx */}
        <Route index element={<DashboardActualContent />} />
        
        <Route path="capacitacion" element={<RCPAdminView />} />
        <Route path="deas" element={<DEAsAdminView />} />
        <Route path="contáctanos" element={<ContáctanosAdminView />} />
        <Route path="faq" element={<FAQAdminView />} />
        <Route path="educacion" element={<Educacion_Public />} />
        
        <Route path="validacion-deas" element={<ValidacionDeas />} />
        <Route path="reportes" element={<ReportesAdmin />} />
        <Route path="gestion-faq" element={<GestionFAQs />} />
        <Route path="gestion-educacion" element={<GestionEducacion />} />
        <Route path="gestion-rcp" element={<GestionRCP />} /> 
        <Route path="gestion-contactanos" element={<GestionContactanos />} /> 
        
        <Route
          path="control-usuarios"
          element={
            <ProtectedRouteWithRole allowedRoles={rolesSoloSuper}>
              <ControlUsuarios />
            </ProtectedRouteWithRole>
          }
        />
        
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      {/* Fallback general para rutas no encontradas a nivel raíz */}
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