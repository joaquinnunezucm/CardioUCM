// src/layouts/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const capitalizeText = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

export default function DashboardLayout() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();

  const nombreUsuario = user ? user.nombre : "Usuario";
  const rolUsuario = user ? user.rol : "";

  const [estadisticasSistema, setEstadisticasSistema] = useState({
    visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0,
  });
  const [clicksPorSeccion, setClicksPorSeccion] = useState({}); // Este recibirá los totales de /api/obtener-clics
  const [loadingDashboardData, setLoadingDashboardData] = useState(true);

  const modulosParaInfoBoxes = useMemo(() => [
    { nombre: "Capacitación RCP", icono: "fas fa-heartbeat", color: "bg-success", ruta: "/admin/capacitacion", seccionApi: "RCP", descripcion: "Ver contenido de RCP" },
    { nombre: "Mapa DEAs", icono: "fas fa-map-marker-alt", color: "bg-primary", ruta: "/admin/deas", seccionApi: "DEA", descripcion: "Ver mapa de DEAs" },
    { nombre: "Gestionar Contáctanos", icono: "fas fa-id-card", color: "bg-warning", ruta: "/admin/gestion-contactanos", seccionApi: "CONTÁCTANOS", descripcion: "Gestionar info de contacto" },
    { nombre: "Gestionar FAQs", icono: "fas fa-comments", color: "bg-secondary", ruta: "/admin/gestion-faq", seccionApi: "PREGUNTAS FRECUENTES", descripcion: "Gestionar preguntas" },
    { nombre: "Gestionar Educación", icono: "fas fa-graduation-cap", color: "bg-teal", ruta: "/admin/gestion-educacion", seccionApi: "EDUCACIÓN", descripcion: "Gestionar contenido educativo" },
    { nombre: "Llamadas al 131", icono: "fas fa-phone-volume", color: "bg-danger", seccionApi: "LLAMADAEMERGENCIA131", descripcion: "Acciones de llamada al 131" },
    { nombre: "Reportes", icono: "fas fa-chart-bar", color: "bg-indigo", ruta: "/admin/reportes", seccionApi: "REPORTES", descripcion: "Ver reportes del sistema" }
  ], []);

  const fetchDataForDashboard = useCallback(async () => {
    if (!token) {
        setLoadingDashboardData(false);
        // Podrías llamar a logout() o simplemente no hacer nada si ProtectedRoute ya maneja la redirección
        return;
    }
    setLoadingDashboardData(true);
    try {
      const [statsRes, clicksRes] = await Promise.all([
        axios.get('http://localhost:3001/api/estadisticas', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:3001/api/obtener-clics', { // Endpoint que devuelve {SECCION: TOTAL_CLICS}
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      setEstadisticasSistema(statsRes.data || { visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0 });
      setClicksPorSeccion(clicksRes.data || {}); // Directamente los datos de /api/obtener-clics

    } catch (error) {
      console.error('Dashboard (Layout): Error fetching data:', error.response?.data?.message || error.message);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logout();
      }
      setEstadisticasSistema({ visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0 });
      setClicksPorSeccion({});
    } finally {
      setLoadingDashboardData(false);
    }
  }, [token, logout]);

  useEffect(() => {
    document.body.classList.add('hold-transition', 'sidebar-mini', 'layout-fixed');
    fetchDataForDashboard();
    return () => {
      document.body.classList.remove('hold-transition', 'sidebar-mini', 'layout-fixed');
    };
  }, [fetchDataForDashboard]);

  const modulosHomeNavegablesSidebar = useMemo(() => [
    { nombre: "Capacitación RCP", icono: "fas fa-heartbeat", ruta: "/admin/capacitacion" },
    { nombre: "DEAs Mapa", icono: "fas fa-map-marker-alt", ruta: "/admin/deas" },
    { nombre: "Ver Educación", icono: "fas fa-book-medical", ruta: "/admin/vista-educacion" }, // Cambiado para vista
    { nombre: "Ver FAQs", icono: "far fa-question-circle", ruta: "/admin/vista-faq" }, 
    { nombre: "Ver Contáctanos", icono: "fas fa-address-book", ruta: "/admin/vista-contactanos" },
  ], []);

  const [modulosAdminDinamicosSidebar, setModulosAdminDinamicosSidebar] = useState([]);
  useEffect(() => {
    let baseAdminItems = [
      { nombre: "Gestionar RCP", icono: "fas fa-cogs", ruta: "/admin/gestion-rcp" },
      { nombre: "Validación DEA", icono: "fas fa-check-circle", ruta: "/admin/validacion-deas" },
      { nombre: "Gestionar Educación", icono: "fas fa-graduation-cap", ruta: "/admin/gestion-educacion" },
      { nombre: "Gestionar FAQs", icono: "fas fa-comments", ruta: "/admin/gestion-faq" },
      { nombre: "Gestionar Contáctanos", icono: "fas fa-id-card", ruta: "/admin/gestion-contactanos" }, 
      { nombre: "Reportes", icono: "fas fa-chart-bar", ruta: "/admin/reportes" },
    ];
    if (user && user.rol === 'superadministrador') {
      baseAdminItems.push({
        nombre: "Control de Usuarios",
        icono: "fas fa-users-cog",
        ruta: "/admin/control-usuarios"
      });
    }
    setModulosAdminDinamicosSidebar(baseAdminItems.sort((a,b) => a.nombre.localeCompare(b.nombre)));
  }, [user]);

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  if (loadingDashboardData && !user) {
      return <div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary" role="status" style={{width: '3rem', height: '3rem'}}><span className="visually-hidden">Cargando...</span></div></div>;
  }

  return (
    <div className="wrapper">
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item"><a className="nav-link" data-widget="pushmenu" href="#" role="button"><i className="fas fa-bars"></i></a></li>
          <li className="nav-item d-none d-sm-inline-block"><Link to="/admin" className="nav-link">CardioUCM Admin</Link></li>
        </ul>
        <ul className="navbar-nav ml-auto">
          <li className="nav-item"><span className="nav-link">Bienvenido, <strong>{nombreUsuario}</strong> ({rolUsuario && capitalizeText(rolUsuario)})</span></li>
          <li className="nav-item"><button onClick={handleLogoutClick} className="btn btn-link nav-link text-danger"><i className="fas fa-sign-out-alt"></i> Cerrar sesión</button></li>
        </ul>
      </nav>

      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <Link to="/admin" className="brand-link">
          <i className="fas fa-heartbeat brand-image ml-3 img-circle elevation-3" style={{ opacity: .8 }}></i>
          <span className="brand-text font-weight-light">CardioUCM Admin</span>
        </Link>
        <div className="sidebar">
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
              <li className="nav-item">
                <Link to="/admin" className="nav-link active">
                  <i className="nav-icon fas fa-tachometer-alt"></i><p>Dashboard</p>
                </Link>
              </li>
              <li className="nav-header">VISTA PÚBLICA (DESDE ADMIN)</li> {/* Cambiado título de sección */}
              {modulosHomeNavegablesSidebar.map((modulo) => (
                <li className="nav-item" key={modulo.ruta + '-layout-home'}>
                  <Link to={modulo.ruta} className="nav-link">
                    <i className={`nav-icon ${modulo.icono}`}></i> <p>{modulo.nombre}</p>
                  </Link>
                </li>
              ))}
              <li className="nav-header">GESTIÓN DE CONTENIDO</li> {/* Cambiado título de sección */}
              {modulosAdminDinamicosSidebar.map((modulo) => (
                <li className="nav-item" key={modulo.ruta + '-layout-admin'}>
                  <Link to={modulo.ruta} className="nav-link">
                    <i className={`nav-icon ${modulo.icono}`}></i> <p>{modulo.nombre}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      <div className="content-wrapper" style={{ minHeight: 'calc(100vh - 101px)' }}>
        <Outlet context={{ estadisticasSistema, clicksPorSeccion, modulosParaInfoBoxes }} />
      </div>

      <footer className="main-footer">
        <strong>© {new Date().getFullYear()} CardioUCM</strong> - Todos los derechos reservados.
        <div className="float-right d-none d-sm-inline-block"><b>Versión</b> 1.0.3</div>
      </footer>
    </div>
  );
}