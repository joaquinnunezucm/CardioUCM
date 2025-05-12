// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() { // Este componente ahora es el Layout principal del Admin
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nombreUsuario = user ? user.nombre : "Usuario";
  const rolUsuario = user ? user.rol : "";

  // --- ESTADO Y LÓGICA DE DATOS DEL DASHBOARD (VIVEN EN EL LAYOUT) ---
  const [clicksPorSeccion, setClicksPorSeccion] = useState({});
  const [estadisticasSistema, setEstadisticasSistema] = useState({
    visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0,
  });

  // modulosHomeInfoBoxes se usa para generar las info-boxes en DashboardActualContent
  // y para la lógica de fetchClicksPorSeccion. Se memoriza para estabilidad.
  const modulosHomeInfoBoxes = React.useMemo(() => [
    { nombre: "RCP", icono: "fas fa-heartbeat", color: "bg-success", ruta: "/admin/capacitacion", seccionApi: "RCP" },
    { nombre: "DEA", icono: "fas fa-map-marker-alt", color: "bg-primary", ruta: "/admin/deas", seccionApi: "DEA" },
    { nombre: "Noticias", icono: "fas fa-newspaper", color: "bg-warning", ruta: "/admin/noticias", seccionApi: "Noticias" },
    { nombre: "Preguntas Frecuentes", icono: "fas fa-question-circle", color: "bg-secondary", ruta: "/admin/faq", seccionApi: "Preguntas Frecuentes" },
    { nombre: "Llamadas al 131", icono: "fas fa-phone-volume", color: "bg-danger", seccionApi: "LlamadaEmergencia131" },
  ], []);


  const fetchEstadisticasSistema = useCallback(async () => {
    console.log("Dashboard (Layout): Fetching Estadisticas Sistema...");
    try {
      const response = await axios.get('http://localhost:3001/api/estadisticas');
      setEstadisticasSistema(response.data);
    } catch (error) {
      console.error('Dashboard (Layout): Error stats:', error.response?.data?.message || error.message);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logout();
      }
      setEstadisticasSistema({ visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0 });
    }
  }, [logout]);

  const fetchClicksPorSeccion = useCallback(async () => {
    console.log("Dashboard (Layout): Fetching Clicks Por Seccion...");
    try {
      const response = await axios.get('http://localhost:3001/api/obtener-clics');
      let clicsData = {};
      if (Array.isArray(response.data)) {
        response.data.forEach(item => { clicsData[item.seccion] = item.cantidad; });
      } else if (typeof response.data === 'object' && response.data !== null) {
        clicsData = response.data;
      }
      const clicksIniciales = {};
      modulosHomeInfoBoxes.forEach(modulo => {
        if (modulo.seccionApi) clicksIniciales[modulo.seccionApi] = clicsData[modulo.seccionApi] || 0;
      });
      setClicksPorSeccion(clicksIniciales);
    } catch (error) {
      console.error('Dashboard (Layout): Error clics:', error.response?.data?.message || error.message);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logout();
      }
      const clicksFallidos = {};
      modulosHomeInfoBoxes.forEach(modulo => {
        if (modulo.seccionApi) clicksFallidos[modulo.seccionApi] = 0;
      });
      setClicksPorSeccion(clicksFallidos);
    }
  }, [logout, modulosHomeInfoBoxes]);

  useEffect(() => {
    console.log("Dashboard (Layout) MOUNTED. Initializing AdminLTE and fetching dashboard data.");
    // Lógica de AdminLTE y clases del body
    if (window.$ && window.$.AdminLTE && typeof window.$.AdminLTE.init === 'function') {
      if (!$('body').hasClass('layout-fixed')) {
        try { window.$.AdminLTE.init(); } catch (e) { console.warn("Error AdminLTE init in Layout:", e); }
      }
    }
    document.body.classList.add('hold-transition', 'sidebar-mini', 'layout-fixed');

    // Cargar datos del dashboard UNA VEZ cuando el LAYOUT se monta
    fetchEstadisticasSistema();
    fetchClicksPorSeccion();

    return () => {
      document.body.classList.remove('hold-transition', 'sidebar-mini', 'layout-fixed');
      console.log("Dashboard (Layout) UNMOUNTED. AdminLTE classes removed.");
    };
  }, [fetchClicksPorSeccion, fetchEstadisticasSistema]); // Estas dependencias son estables
  // --- FIN DE ESTADO Y LÓGICA DE DATOS DEL DASHBOARD ---


  // --- Módulos para el Sidebar ---
  const modulosHomeNavegablesSidebar = [ // Para la sección "Administración de Contenido" del sidebar
    { nombre: "Capacitación RCP", icono: "fas fa-heartbeat", ruta: "/admin/capacitacion" },
    { nombre: "DEAs (Mapa Admin)", icono: "fas fa-map-marker-alt", ruta: "/admin/deas" },
    { nombre: "Noticias (Admin)", icono: "fas fa-newspaper", ruta: "/admin/noticias" },
    { nombre: "Ver FAQs Públicas", icono: "far fa-eye", ruta: "/admin/faq" },
  ];
  const [modulosAdminDinamicosSidebar, setModulosAdminDinamicosSidebar] = useState([]);
  useEffect(() => {
    console.log("Dashboard (Layout): Updating admin sidebar modules for user role:", user?.rol);
    let baseAdminItems = [
      { nombre: "Validación DEA", icono: "fas fa-check-circle", ruta: "/admin/validacion-deas" },
      { nombre: "Gestionar FAQs", icono: "fas fa-comments", ruta: "/admin/gestion-faq" },
      { nombre: "Reportes", icono: "fas fa-chart-bar", ruta: "/admin/reportes" },
    ];
    if (user && user.rol === 'superadministrador') {
      baseAdminItems.push({
        nombre: "Control de Usuarios",
        icono: "fas fa-users-cog",
        ruta: "/admin/control-usuarios"
      });
    }
    setModulosAdminDinamicosSidebar(baseAdminItems);
  }, [user]); // Se actualiza si el objeto user (y su rol) cambia.

  const handleLogoutClick = () => {
    // La limpieza de clases del body la maneja el return del useEffect principal al desmontar
    logout();
  };

  return (
    <div className="wrapper">
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#" role="button"><i className="fas fa-bars"></i></a>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            <Link to="/admin" className="nav-link">CardioUCM APP - Admin</Link>
          </li>
        </ul>
        <ul className="navbar-nav ml-auto">
          <li className="nav-item">
            <span className="nav-link">
              Bienvenido, <strong>{nombreUsuario}</strong> ({rolUsuario && rolUsuario.charAt(0).toUpperCase() + rolUsuario.slice(1)})
            </span>
          </li>
          <li className="nav-item">
            <button onClick={handleLogoutClick} className="btn btn-link nav-link"><i className="fas fa-sign-out-alt"></i> Cerrar sesión</button>
          </li>
        </ul>
      </nav>

      {/* Main Sidebar Container */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <Link to="/admin" className="brand-link">
          <i className="fas fa-heartbeat brand-image ml-3 img-circle elevation-3" style={{ opacity: .8 }}></i>
          <span className="brand-text font-weight-light">CardioUCM Admin</span>
        </Link>
        <div className="sidebar">
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
               <li className="nav-item">
                  <Link to="/admin" className="nav-link"> {/* Enlace al contenido del Dashboard (ruta index) */}
                      <i className="nav-icon fas fa-tachometer-alt"></i>
                      <p>Dashboard</p>
                  </Link>
              </li>
              <li className="nav-header">ADMINISTRACIÓN DE CONTENIDO</li>
              {modulosHomeNavegablesSidebar.map((modulo) => (
                <li className="nav-item" key={modulo.ruta + '-layout-home'}>
                  <Link to={modulo.ruta} className="nav-link">
                    <i className={`nav-icon ${modulo.icono}`}></i> <p>{modulo.nombre}</p>
                  </Link>
                </li>
              ))}
              <li className="nav-header">ADMINISTRACIÓN</li>
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

      {/* Content Wrapper: Renderiza el contenido de la página actual */}
      <div className="content-wrapper" style={{ minHeight: 'calc(100vh - 101px)' }}> {/* Ajusta minHeight */}
        <Outlet context={{ estadisticasSistema, clicksPorSeccion, modulosHomeInfoBoxes }} />
      </div>

      {/* Footer */}
      <footer className="main-footer">
        <strong>© {new Date().getFullYear()} CardioUCM</strong> - Todos los derechos reservados.
        <div className="float-right d-none d-sm-inline-block"><b>Versión</b> 1.0.3</div>
      </footer>
    </div>
  );
}