// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx"; // Asegúrate que la ruta al contexto sea correcta
import '@fortawesome/fontawesome-free/css/all.min.css';

// --- Componentes de Páginas Públicas ---
import Home from "./pages/Home";
import Emergencia from "./pages/Emergencia";
import RCP_Public from "./pages/RCP";
import UbicacionDEA_Public from "./pages/UbicacionDEA";
import Educacion_Public from "./pages/Educacion";
import Contáctanos_Public from "./pages/Contáctanos";
import FAQ_Public from "./pages/FAQ";
import Login from "./pages/Login";
import ResetPasswordPage from './pages/ResetPasswordPage'; // <--- IMPORTAR LA NUEVA PÁGINA

// --- Componentes de Administración (Layout y Páginas de Contenido) ---
import Dashboard from "./pages/Dashboard"; // Este actúa como el Layout principal del Admin
import DashboardActualContent from "./pages/DashboardActualContent";
import ValidacionDeas from './pages/ValidacionDeas';
import ControlUsuarios from './pages/ControlUsuarios';
import GestionFAQs from './pages/GestionFAQs.jsx';
import GestionEducacion from './pages/GestionEducacion';
import GestionRCP from './pages/GestionRCP'; 
import GestionContactanos from './pages/GestionContactanos';
import Reportes from './pages/Reportes';

// --- Componente Wrapper para Contenido Interno de Páginas de Admin ---
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
// const ReportesAdmin = () => ( // Esta ya no es necesaria si Reportes.jsx es el componente completo
//   <AdminPageContentWrapper title="Reportes del Sistema" breadcrumbCurrent="Reportes">
//     <Reportes /> 
//   </AdminPageContentWrapper>
// );

const RCPAdminView = () => <AdminPageContentWrapper title="Capacitación RCP" breadcrumbCurrent="RCP"><RCP_Public /></AdminPageContentWrapper>;
const DEAsAdminView = () => <AdminPageContentWrapper title="Ubicación DEAs" breadcrumbCurrent="DEAs"><UbicacionDEA_Public /></AdminPageContentWrapper>;
const ContáctanosAdminView = () => <AdminPageContentWrapper title="Contáctanos (Admin)" breadcrumbCurrent="Contáctanos"><Contáctanos_Public /></AdminPageContentWrapper>;
const FAQAdminView = () => <AdminPageContentWrapper title="Ver FAQs Públicas (Admin)" breadcrumbCurrent="FAQ (Vista)"><FAQ_Public /></AdminPageContentWrapper>;
const EducacionAdminView = () => <AdminPageContentWrapper title="Contenido Educativo (Vista Pública)" breadcrumbCurrent="Educación (Vista)"><Educacion_Public /></AdminPageContentWrapper>;


// --- Componente ProtectedRouteWithRole ---
const ProtectedRouteWithRole = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="d-flex justify-content-center align-items-center vh-100"><i className="fas fa-spinner fa-spin fa-3x"></i></div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user && allowedRoles && allowedRoles.includes(user.rol)) { // Verificar que allowedRoles exista
    return children;
  }
  // Si no tiene rol permitido pero está autenticado, redirigir a /admin
  return <Navigate to="/admin" state={{ message: "No tiene los permisos necesarios para acceder a esta sección." }} replace />;
};


function AppContent() {
  const rolesAdminYSuper = ['administrador', 'superadministrador'];
  const rolesSoloSuper = ['superadministrador'];

  return (
    <Routes>
      {/* --- Rutas Públicas --- */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} /> {/* <--- NUEVA RUTA PÚBLICA */}
      <Route path="/emergencia" element={<Emergencia />} />
      <Route path="/educacion" element={<Educacion_Public />} />
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
        <Route index element={<DashboardActualContent />} />
        
        {/* Vistas que reutilizan componentes públicos con el wrapper */}
        <Route path="capacitacion" element={<RCPAdminView />} />
        <Route path="deas" element={<DEAsAdminView />} />
        <Route path="vista-contactanos" element={<ContáctanosAdminView />} /> {/* Renombrar para evitar conflicto si "contactanos" es una sección de gestión */}
        <Route path="vista-faq" element={<FAQAdminView />} />
        <Route path="vista-educacion" element={<EducacionAdminView />} />
        
        {/* Componentes de gestión directa */}
        <Route path="validacion-deas" element={
            <AdminPageContentWrapper title="Validación de Solicitudes DEA" breadcrumbCurrent="Validación DEA">
                <ValidacionDeas />
            </AdminPageContentWrapper>
        } />
        <Route path="reportes" element={
            <AdminPageContentWrapper title="Reportes del Sistema" breadcrumbCurrent="Reportes">
                <Reportes />
            </AdminPageContentWrapper>
        } />
        <Route path="gestion-faq" element={
             <AdminPageContentWrapper title="Gestionar Preguntas Frecuentes" breadcrumbCurrent="Gestión FAQs">
                <GestionFAQs />
            </AdminPageContentWrapper>
        } />
        <Route path="gestion-educacion" element={
            <AdminPageContentWrapper title="Gestionar Contenido Educativo" breadcrumbCurrent="Gestión Educación">
                <GestionEducacion />
            </AdminPageContentWrapper>
        } />
        <Route path="gestion-rcp" element={
            <AdminPageContentWrapper title="Gestionar Instrucciones RCP" breadcrumbCurrent="Gestión RCP">
                <GestionRCP />
            </AdminPageContentWrapper>
        } /> 
        <Route path="gestion-contactanos" element={
            <AdminPageContentWrapper title="Gestionar Información de Contacto" breadcrumbCurrent="Gestión Contáctanos">
                <GestionContactanos />
            </AdminPageContentWrapper>
        } /> 
        
        <Route
          path="control-usuarios"
          element={
            <ProtectedRouteWithRole allowedRoles={rolesSoloSuper}>
               <AdminPageContentWrapper title="Control de Usuarios" breadcrumbCurrent="Usuarios">
                    <ControlUsuarios />
                </AdminPageContentWrapper>
            </ProtectedRouteWithRole>
          }
        />
        
        {/* Fallback para rutas no encontradas dentro de /admin */}
        <Route path="*" element={<Navigate to="/admin" state={{ message: "Página no encontrada dentro del panel."}} replace />} />
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