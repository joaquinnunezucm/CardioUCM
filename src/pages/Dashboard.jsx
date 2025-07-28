import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { API_BASE_URL } from '../utils/api';

export default function Dashboard() {
  const { user, token, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const nombreUsuario = user ? user.nombre : "Usuario";
  const rolUsuario = user ? user.rol : "";
  const [clicksPorSeccion, setClicksPorSeccion] = useState({});
  const [estadisticasSistema, setEstadisticasSistema] = useState({
    visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0,
  });
// EFECTO 1: DEFENSA CONTRA EL BOTÓN "ADELANTE" (BFCACHE)
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        if (!sessionStorage.getItem('token')) {
          navigate('/login', { replace: true });
        }
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [navigate]);

  // EFECTO 2: PROTECCIÓN DE RUTA EN CARGA INICIAL
  useEffect(() => {
    if (!authLoading && (!user || !token)) {
      navigate("/login", { replace: true });
    }
  }, [user, token, authLoading, navigate]);

  const modulosParaInfoBoxes = useMemo(() => [
    { nombre: "RCP", icono: "fas fa-heartbeat", color: "bg-success", ruta: "/admin/capacitacion", seccionApi: "RCP" },
    { nombre: "DEA", icono: "fas fa-map-marker-alt", color: "bg-primary", ruta: "/admin/deas", seccionApi: "DEA" },
    { nombre: "Contáctanos", icono: "fas fa-newspaper", color: "bg-warning", ruta: "/admin/contáctanos", seccionApi: "Contáctanos" },
    { nombre: "Preguntas Frecuentes", icono: "fas fa-question-circle", color: "bg-secondary", ruta: "/admin/faq", seccionApi: "Preguntas Frecuentes" },
    { nombre: "Educación", icono: "fas fa-book-medical", color: "bg-teal", ruta: "/admin/educacion", seccionApi: "Educación" },
    { nombre: "Llamadas al 131", icono: "fas fa-phone-volume", color: "bg-danger", seccionApi: "LlamadaEmergencia131" },
  ], []);

  const fetchEstadisticasSistema = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/estadisticas`);
      setEstadisticasSistema(response.data);
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logout();
      }
      setEstadisticasSistema({ visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0 });
    }
  }, [logout]);

  const fetchClicksPorSeccion = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/obtener-clics`);
      let clicsData = response.data || {};
      const clicksIniciales = {};
      modulosParaInfoBoxes.forEach(modulo => {
        if (modulo.seccionApi) clicksIniciales[modulo.seccionApi] = clicsData[modulo.seccionApi] || 0;
      });
      setClicksPorSeccion(clicksIniciales);
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logout();
      }
      const clicksFallidos = {};
      modulosParaInfoBoxes.forEach(modulo => {
        if (modulo.seccionApi) clicksFallidos[modulo.seccionApi] = 0;
      });
      setClicksPorSeccion(clicksFallidos);
    }
  }, [logout, modulosParaInfoBoxes]);

  useEffect(() => {
    if (window.$ && window.$.AdminLTE && typeof window.$.AdminLTE.init === 'function') {
      if (!$('body').hasClass('layout-fixed')) {
        try { window.$.AdminLTE.init(); } catch (e) { console.warn("Error AdminLTE init in Layout:", e); }
      }
    }
    document.body.classList.add('hold-transition', 'sidebar-mini', 'layout-fixed');

    fetchEstadisticasSistema();
    fetchClicksPorSeccion();

    return () => {
      document.body.classList.remove('hold-transition', 'sidebar-mini', 'layout-fixed');
    };
  }, [fetchClicksPorSeccion, fetchEstadisticasSistema]);

  const modulosHomeNavegablesSidebar = [
    { nombre: "Capacitación RCP", icono: "fas fa-heartbeat", ruta: "/admin/capacitacion" },
    { nombre: "DEAs", icono: "fas fa-map-marker-alt", ruta: "/admin/deas" },
    { nombre: "Educación", icono: "fas fa-book-medical", ruta: "/admin/educacion" },
    { nombre: "Preguntas Frecuentes", icono: "far fa-eye", ruta: "/admin/faq" },
    { nombre: "Contáctanos", icono: "fas fa-newspaper", ruta: "/admin/contáctanos" },
  ];

  const [modulosAdminDinamicosSidebar, setModulosAdminDinamicosSidebar] = useState([]);

  useEffect(() => {
    let baseAdminItems = [
      { nombre: "Gestionar RCP", icono: "fas fa-heartbeat", ruta: "/admin/gestion-rcp" },
      { nombre: "Validación DEA", icono: "fas fa-check-circle", ruta: "/admin/validacion-deas" },
      { nombre: "Gestionar DEA", icono: "fas fa-check-circle", ruta: "/admin/gestion-deas" },
      { nombre: "Gestionar Educación", icono: "fas fa-graduation-cap", ruta: "/admin/gestion-educacion" },
      { nombre: "Gestionar FAQs", icono: "fas fa-comments", ruta: "/admin/faqs" },
      { nombre: "Gestionar Contáctanos", icono: "fas fa-newspaper", ruta: "/admin/gestion-contactanos" },
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
  }, [user]);

  const handleLogoutClick = () => {
    logout();
  };
  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <i className="fas fa-spinner fa-spin fa-3x"></i>
      </div>
    );
  }
  return (
    <div className="wrapper">
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item"><a className="nav-link" data-widget="pushmenu" href="#" role="button"><i className="fas fa-bars"></i></a></li>
          <li className="nav-item d-none d-sm-inline-block"><Link to="/admin" className="nav-link">CardioUCM APP - Admin</Link></li>
        </ul>
        <ul className="navbar-nav ml-auto">
          <li className="nav-item"><span className="nav-link">Bienvenido, <strong>{nombreUsuario}</strong> ({rolUsuario && rolUsuario.charAt(0).toUpperCase() + rolUsuario.slice(1)})</span></li>
          <li className="nav-item"><button onClick={handleLogoutClick} className="btn btn-link nav-link"><i className="fas fa-sign-out-alt"></i> Cerrar sesión</button></li>
        </ul>
      </nav>

      <aside className="main-sidebar" style={{
        backgroundColor: '#0A3877',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        minHeight: '100vh',
      }}>
        <Link to="/admin" className="brand-link" style={{
          padding: '15px',
          display: 'flex',
          alignItems: 'center',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          textDecoration: 'none',
        }}>
          <i className="fas fa-heartbeat brand-image ml-3 img-circle elevation-3" style={{ opacity: 0.8, fontSize: '24px', marginRight: '10px' }}></i>
          <span className="brand-text" style={{ fontWeight: '600', fontSize: '18px' }}>CardioUCM Admin</span>
        </Link>
        <div className="sidebar" style={{ padding: '10px 0' }}>
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false" style={{ listStyle: 'none', padding: 0 }}>
              <li className="nav-item" style={{ margin: '5px 0' }}>
                <Link to="/admin" className="nav-link" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 15px',
                  color: '#ffffff',
                  fontSize: '16px',
                  borderRadius: '0 25px 25px 0',
                  transition: 'background-color 0.3s, color 0.3s',
                  textDecoration: 'none',
                }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#005566'}
                       onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <i className="nav-icon fas fa-tachometer-alt" style={{ width: '30px', textAlign: 'center', marginRight: '10px' }}></i>
                  <p>Dashboard</p>
                </Link>
              </li>
              <li className="nav-header" style={{
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold',
                padding: '10px 15px',
                margin: '10px 0',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                textTransform: 'uppercase',
              }}>
                Visualizar Contenido
              </li>
              {modulosHomeNavegablesSidebar.map((modulo) => (
                <li className="nav-item" key={modulo.ruta + '-layout-home'} style={{ margin: '5px 0' }}>
                  <Link to={modulo.ruta} className="nav-link" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 15px',
                    color: '#ffffff',
                    fontSize: '16px',
                    borderRadius: '0 25px 25px 0',
                    transition: 'background-color 0.3s, color 0.3s',
                    textDecoration: 'none',
                  }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#005566'}
                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <i className={`nav-icon ${modulo.icono}`} style={{ width: '30px', textAlign: 'center', marginRight: '10px' }}></i>
                    <p>{modulo.nombre}</p>
                  </Link>
                </li>
              ))}
              <li className="nav-header" style={{
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold',
                padding: '10px 15px',
                margin: '10px 0',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              }}>
                GESTIÓN DE CONTENIDO
              </li>
              {modulosAdminDinamicosSidebar.map((modulo) => (
                <li className="nav-item" key={modulo.ruta + '-layout-admin'} style={{ margin: '5px 0' }}>
                  <Link to={modulo.ruta} className="nav-link" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 15px',
                    color: '#ffffff',
                    fontSize: '16px',
                    borderRadius: '0 25px 25px 0',
                    transition: 'background-color 0.3s, color 0.3s',
                    textDecoration: 'none',
                  }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#005566'}
                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <i className={`nav-icon ${modulo.icono}`} style={{ width: '30px', textAlign: 'center', marginRight: '10px' }}></i>
                    <p>{modulo.nombre}</p>
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