// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nombreUsuario = user ? user.nombre : "Usuario";
  const rolUsuario = user ? user.rol : "";

  // modulosHome puede definirse fuera si no depende de props o estado que cambien
  // o si se define aquí, asegurarse que no cause re-renders innecesarios que redefinan las funciones useCallback.
  const modulosHome = [
    { nombre: "RCP", icono: "fas fa-heartbeat", color: "bg-success", ruta: "/admin/capacitacion", seccionApi: "RCP" },
    { nombre: "DEA", icono: "fas fa-map-marker-alt", color: "bg-primary", ruta: "/admin/deas", seccionApi: "DEA" },
    { nombre: "Noticias", icono: "fas fa-newspaper", color: "bg-warning", ruta: "/admin/noticias", seccionApi: "Noticias" },
    { nombre: "Preguntas Frecuentes", icono: "fas fa-question-circle", color: "bg-secondary", ruta: "/admin/faq", seccionApi: "Preguntas Frecuentes" },
    { nombre: "Llamadas al 131", icono: "fas fa-phone-volume", color: "bg-danger", seccionApi: "LlamadaEmergencia131" },
  ];

  const getModulosAdminSidebar = () => {
    let sidebarItems = [
      { nombre: "Validación DEA", icono: "fas fa-check-circle", color: "bg-info", ruta: "/admin/validacion-deas" },
      { nombre: "Reportes", icono: "fas fa-chart-bar", color: "bg-info", ruta: "/admin/reportes" },
    ];
    if (user && user.rol === 'superadministrador') {
      sidebarItems.push({
        nombre: "Control de Usuarios",
        icono: "fas fa-users-cog",
        color: "bg-purple",
        ruta: "/admin/control-usuarios"
      });
    }
    return sidebarItems;
  };
  const modulosAdminSidebar = getModulosAdminSidebar();

  const [clicksPorSeccion, setClicksPorSeccion] = useState({});
  const [estadisticasSistema, setEstadisticasSistema] = useState({
    visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0,
  });

  // useEffect para cargar datos y configurar AdminLTE, se ejecuta solo una vez al montar.
  useEffect(() => {
    // Funciones de fetch definidas DENTRO del useEffect o fuera y memorizadas SIN dependencias
    // que cambien frecuentemente si se quiere que el useEffect se ejecute solo una vez.

    const cargarEstadisticasSistema = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/estadisticas');
        setEstadisticasSistema(response.data);
      } catch (error) {
        console.error('Dashboard: Error stats:', error.response?.data?.message || error.message);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // logout(); // Considera si es apropiado desloguear automáticamente
        }
        setEstadisticasSistema({ visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0 });
      }
    };

    const cargarClicksPorSeccion = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/obtener-clics');
        let clicsData = {};
        if (Array.isArray(response.data)) {
          response.data.forEach(item => { clicsData[item.seccion] = item.cantidad; });
        } else if (typeof response.data === 'object' && response.data !== null) {
          clicsData = response.data;
        }
        const clicksIniciales = {};
        // 'modulosHome' debe ser estable o este cálculo podría referenciar una versión antigua
        // si modulosHome se define de forma que cambie. En tu caso es una constante, así que está bien.
        modulosHome.forEach(modulo => {
          if (modulo.seccionApi) clicksIniciales[modulo.seccionApi] = clicsData[modulo.seccionApi] || 0;
        });
        setClicksPorSeccion(clicksIniciales);
      } catch (error) {
        console.error('Dashboard: Error clics:', error.response?.data?.message || error.message);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // logout();
        }
        const clicksFallidos = {};
        modulosHome.forEach(modulo => {
          if (modulo.seccionApi) clicksFallidos[modulo.seccionApi] = 0;
        });
        setClicksPorSeccion(clicksFallidos);
      }
    };

    // Inicializar AdminLTE
    if (window.$ && window.$.AdminLTE && typeof window.$.AdminLTE.init === 'function') {
      if (!$('body').hasClass('layout-fixed')) {
        try { window.$.AdminLTE.init(); } catch (e) { console.warn("Error AdminLTE init:", e); }
      }
    }
    document.body.classList.add('hold-transition', 'sidebar-mini');

    // Llamar a las funciones de carga
    cargarEstadisticasSistema();
    cargarClicksPorSeccion();

    // Función de limpieza (opcional para clases del body si se manejan globalmente)
    // return () => {
    //   document.body.classList.remove('hold-transition', 'sidebar-mini');
    // };
  }, []); // <--- ARRAY DE DEPENDENCIAS VACÍO para ejecutar solo una vez al montar

  const handleMenuClick = (ruta) => ruta && navigate(ruta);
  const handleLogout = () => logout();

  // El resto del JSX del componente Dashboard permanece igual...
  return (
    <div className="wrapper">
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#" role="button"><i className="fas fa-bars"></i></a>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/admin') }} className="nav-link">CardioUCM APP - Admin</a>
          </li>
        </ul>
        <ul className="navbar-nav ml-auto">
          <li className="nav-item">
            <span className="nav-link">
              Bienvenido, <strong>{nombreUsuario}</strong> ({rolUsuario && rolUsuario.charAt(0).toUpperCase() + rolUsuario.slice(1)})
            </span>
          </li>
          <li className="nav-item">
            <button onClick={handleLogout} className="btn btn-link nav-link"><i className="fas fa-sign-out-alt"></i> Cerrar sesión</button>
          </li>
        </ul>
      </nav>

      {/* Main Sidebar Container */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/admin') }} className="brand-link">
          <i className="fas fa-heartbeat brand-image ml-3 img-circle elevation-3" style={{ opacity: .8 }}></i>
          <span className="brand-text font-weight-light">CardioUCM Admin</span>
        </a>
        <div className="sidebar">
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
              <li className="nav-header">ADMINISTRACIÓN DE CONTENIDO</li>
              {modulosHome.filter(m => m.ruta).map((modulo) => (
                <li className="nav-item" key={modulo.ruta + '-home'}>
                  <a href={modulo.ruta} onClick={(e) => { e.preventDefault(); handleMenuClick(modulo.ruta); }} className="nav-link">
                    <i className={`nav-icon ${modulo.icono}`}></i> <p>{modulo.nombre}</p>
                  </a>
                </li>
              ))}
              <li className="nav-header">ADMINISTRACIÓN</li>
              {modulosAdminSidebar.map((modulo) => (
                <li className="nav-item" key={modulo.ruta + '-admin'}>
                  <a href={modulo.ruta} onClick={(e) => { e.preventDefault(); handleMenuClick(modulo.ruta); }} className="nav-link">
                    <i className={`nav-icon ${modulo.icono}`}></i> <p>{modulo.nombre}</p>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content Wrapper */}
      <div className="content-wrapper">
        {/* Content Header */}
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6"><h1 className="m-0">Panel de Administración</h1></div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item"><a href="#" onClick={(e) => { e.preventDefault(); navigate('/admin') }}>Inicio</a></li>
                  <li className="breadcrumb-item active">Dashboard</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        {/* Main content */}
        <section className="content">
          <div className="container-fluid">
            {/* Info boxes */}
            <div className="row">
              {modulosHome.map((modulo) => (
                <div className="col-12 col-sm-6 col-md-4" key={`info-${modulo.seccionApi}`}>
                  <div className={`info-box ${modulo.color} mb-3`} style={{ cursor: modulo.ruta ? "pointer" : "default" }} onClick={() => modulo.ruta && handleMenuClick(modulo.ruta)}>
                    <span className="info-box-icon"><i className={modulo.icono}></i></span>
                    <div className="info-box-content">
                      <span className="info-box-text">{modulo.nombre}</span>
                      <span className="info-box-number">{clicksPorSeccion[modulo.seccionApi] || 0}</span>
                      <div className="progress" style={{ height: '3px', margin: '5px 0' }}><div className="progress-bar" style={{ width: `${Math.min((clicksPorSeccion[modulo.seccionApi] || 0) * 2, 100)}%` }}></div></div>
                      <span className="progress-description">{modulo.ruta ? "Ingresos a sección" : "Total de acciones"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Estadísticas del Sistema */}
            <div className="row mt-4">
              <div className="col-md-12">
                <div className="card">
                  <div className="card-header"><h3 className="card-title">Resumen del sistema</h3></div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-lg-4 col-6">
                        <div className="small-box bg-success">
                          <div className="inner"><h3>{estadisticasSistema.visitasPagina || 0}</h3><p>Visitas a la página</p></div>
                          <div className="icon"><i className="fas fa-users"></i></div>
                        </div>
                      </div>
                      <div className="col-lg-4 col-6">
                        <div className="small-box bg-warning">
                          <div className="inner"><h3>{estadisticasSistema.deasRegistrados || 0}</h3><p>DEAs registrados</p></div>
                          <div className="icon"><i className="fas fa-heart-pulse"></i></div>
                        </div>
                      </div>
                      <div className="col-lg-4 col-6">
                        <div className="small-box bg-danger">
                          <div className="inner"><h3>{estadisticasSistema.emergenciasEsteMes || 0}</h3><p>Emergencias este mes</p></div>
                          <div className="icon"><i className="fas fa-ambulance"></i></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {/* Footer */}
      <footer className="main-footer">
        <strong>© {new Date().getFullYear()} CardioUCM</strong> - Todos los derechos reservados.
        <div className="float-right d-none d-sm-inline-block"><b>Versión</b> 1.0.1</div>
      </footer>
    </div>
  );
}