import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const usuario = localStorage.getItem('username') || "Admin";

  // Definición de módulos para info-boxes y sidebar
  const modulosHome = [
    { nombre: "RCP", icono: "fas fa-heartbeat", color: "bg-success", ruta: "/admin/capacitacion", seccionApi: "RCP" },
    { nombre: "DEA", icono: "fas fa-map-marker-alt", color: "bg-primary", ruta: "/admin/deas", seccionApi: "DEA" },
    { nombre: "Noticias", icono: "fas fa-newspaper", color: "bg-warning", ruta: "/admin/noticias", seccionApi: "Noticias" },
    { nombre: "Preguntas Frecuentes", icono: "fas fa-question-circle", color: "bg-secondary", ruta: "/admin/faq", seccionApi: "Preguntas Frecuentes" },
    { 
      nombre: "Llamadas al 131", 
      icono: "fas fa-phone-volume", 
      color: "bg-danger", 
      seccionApi: "LlamadaEmergencia131",
      // No tiene 'ruta' para navegación desde el dashboard
    },
  ];

  const modulosAdminSidebar = [
    { nombre: "Validación DEA", icono: "fas fa-check-circle", color: "bg-info", ruta: "/admin/validacion-deas" },
    { nombre: "Reportes", icono: "fas fa-chart-bar", color: "bg-info", ruta: "/admin/reportes" },
  ];

  // Estado para los clics por sección (usado en info-boxes)
  const [clicksPorSeccion, setClicksPorSeccion] = useState({});
  // Estado para las estadísticas generales del sistema
  const [estadisticasSistema, setEstadisticasSistema] = useState({
    visitasPagina: 0,
    deasRegistrados: 0,
    emergenciasEsteMes: 0, // O un valor inicial como "N/A" o 0
  });

  // Función para cargar las estadísticas generales del sistema
  const fetchEstadisticasSistema = useCallback(async () => {
    console.log("Dashboard: Cargando estadísticas del sistema (al montar)...");
    try {
      const response = await axios.get('http://localhost:3001/api/estadisticas');
      setEstadisticasSistema(response.data);
      console.log("Dashboard: Estadísticas del sistema actualizadas:", response.data);
    } catch (error) {
      console.error('Dashboard: Error al obtener las estadísticas del sistema:', error);
      setEstadisticasSistema({ visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0 });
    }
  }, []); // useCallback con dependencias vacías, la función no cambia

  // Función para cargar los clics por sección
  const fetchClicksPorSeccion = useCallback(async () => {
    console.log("Dashboard: Cargando clics por sección (al montar)...");
    try {
      const response = await axios.get('http://localhost:3001/api/obtener-clics');
      let clicsData = {};
      if (Array.isArray(response.data)) {
        response.data.forEach(item => { clicsData[item.seccion] = item.cantidad; });
      } else if (typeof response.data === 'object' && response.data !== null) {
        clicsData = response.data;
      } else {
        console.warn('Dashboard: Respuesta inesperada de clics:', response.data);
      }

      const clicksIniciales = {};
      modulosHome.forEach(modulo => { // Solo modulosHome porque son los que usan 'seccionApi' para info-boxes
        if (modulo.seccionApi) {
          clicksIniciales[modulo.seccionApi] = clicsData[modulo.seccionApi] || 0;
        }
      });
      setClicksPorSeccion(clicksIniciales);
      console.log("Dashboard: Clics por sección actualizados:", clicksIniciales);
    } catch (error) {
      console.error('Dashboard: Error al obtener los clics por sección:', error);
      const clicksFallidos = {};
      modulosHome.forEach(modulo => {
        if (modulo.seccionApi) {
          clicksFallidos[modulo.seccionApi] = 0;
        }
      });
      setClicksPorSeccion(clicksFallidos);
    }
  }, [modulosHome]); // Depende de modulosHome, que es estable en este componente

  // useEffect para la inicialización de AdminLTE y la carga de datos al montar
  useEffect(() => {
    // Inicializar AdminLTE
    if (window.$ && window.$.AdminLTE) {
      // Una simple verificación para evitar múltiples inicializaciones si no es necesario
      if (!$('body').hasClass('layout-fixed')) { // layout-fixed es una clase que AdminLTE añade
        try {
          window.$.AdminLTE.init();
        } catch (e) {
            console.warn("Error inicializando AdminLTE (puede que ya esté inicializado):", e);
        }
      }
    }
    document.body.classList.add('hold-transition', 'sidebar-mini');

    // Cargar datos solo una vez al montar el componente
    fetchEstadisticasSistema();
    fetchClicksPorSeccion();

    return () => {
      // Limpiar clases del body al desmontar, si este componente es el único que las gestiona
      // o si hay un layout superior que las maneja, esta limpieza podría no ser necesaria aquí.
      document.body.classList.remove('hold-transition', 'sidebar-mini');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array de dependencias vacío para asegurar que se ejecute solo al montar


  // ELIMINADO: El useEffect que escuchaba el evento 'refrescarEstadisticasAdmin'

  const handleMenuClick = (ruta) => {
    if (ruta) { 
      navigate(ruta);
    } else {
      // No hacer nada o loguear si se hace clic en un info-box sin ruta
      console.log("Dashboard: Info-box sin ruta de navegación clickeado.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('username');
    window.location.href = '/login'; // Redirige a la página de login
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
            <a href="/admin" className="nav-link">CardioUCM APP - Admin</a>
          </li>
        </ul>
        <ul className="navbar-nav ml-auto">
          <li className="nav-item">
            <span className="nav-link">Bienvenido, <strong>{usuario}</strong></span>
          </li>
          <li className="nav-item">
            <button onClick={handleLogout} className="btn btn-link nav-link">
              <i className="fas fa-sign-out-alt"></i> Cerrar sesión
            </button>
          </li>
        </ul>
      </nav>

      {/* Main Sidebar Container */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        {/* Brand Logo */}
        <a href="/admin" className="brand-link">
          <i className="fas fa-heartbeat brand-image ml-3 img-circle elevation-3" style={{ opacity: .8 }}></i>
          <span className="brand-text font-weight-light">CardioUCM Admin</span>
        </a>

        {/* Sidebar */}
        <div className="sidebar">
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
              <li className="nav-header">ADMINISTRACIÓN DE CONTENIDO</li>
              {modulosHome.filter(m => m.ruta).map((modulo, index) => ( // Solo módulos con ruta para el sidebar
                <li className="nav-item" key={`home-sb-${index}`}>
                  <a href={modulo.ruta} onClick={(e) => { e.preventDefault(); handleMenuClick(modulo.ruta);}} className="nav-link">
                    <i className={`nav-icon ${modulo.icono}`}></i>
                    <p>{modulo.nombre}</p>
                  </a>
                </li>
              ))}
              <li className="nav-header">ADMINISTRACIÓN</li>
              {modulosAdminSidebar.map((modulo, index) => (
                <li className="nav-item" key={`admin-sb-${index}`}>
                  <a href={modulo.ruta} onClick={(e) => { e.preventDefault(); handleMenuClick(modulo.ruta);}} className="nav-link">
                    <i className={`nav-icon ${modulo.icono}`}></i>
                    <p>{modulo.nombre}</p>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content Wrapper. Contains page content */}
      <div className="content-wrapper">
        {/* Content Header (Page header) */}
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Panel de Administración</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item"><a href="/admin">Inicio</a></li>
                  <li className="breadcrumb-item active">Dashboard</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <section className="content">
          <div className="container-fluid">
            {/* Info boxes para clics por sección */}
            <div className="row">
              {modulosHome.map((modulo, index) => (
                <div className="col-12 col-sm-6 col-md-4" key={`info-${modulo.seccionApi || index}`}>
                  <div
                    className={`info-box ${modulo.color}`}
                    style={{ cursor: modulo.ruta ? "pointer" : "default" }}
                    onClick={() => handleMenuClick(modulo.ruta)} // Solo se navega si hay ruta
                  >
                    <span className="info-box-icon"><i className={modulo.icono}></i></span>
                    <div className="info-box-content">
                      <span className="info-box-text">{modulo.nombre}</span>
                      <span className="info-box-number">{clicksPorSeccion[modulo.seccionApi] || 0}</span>
                      <div className="progress">
                        <div className="progress-bar" style={{ width: `${(clicksPorSeccion[modulo.seccionApi] || 0) * 5}%` }}></div> {/* Ajusta el multiplicador para la barra si es necesario */}
                      </div>
                      <span className="progress-description">
                        {modulo.ruta ? "Ingresos a sección" : "Total de acciones"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Estadísticas del Sistema */}
            <div className="row mt-4">
              <div className="col-md-12">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Resumen del sistema</h3>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-4">
                        <div className="small-box bg-success">
                          <div className="inner">
                            <h3>{estadisticasSistema.visitasPagina}</h3>
                            <p>Visitas a la página</p>
                          </div>
                          <div className="icon"><i className="fas fa-users"></i></div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="small-box bg-warning">
                          <div className="inner">
                            <h3>{estadisticasSistema.deasRegistrados}</h3>
                            <p>DEAs registrados</p>
                          </div>
                          <div className="icon"><i className="fas fa-heart"></i></div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="small-box bg-danger">
                          <div className="inner">
                            <h3>{estadisticasSistema.emergenciasEsteMes}</h3>
                            <p>Emergencias este mes</p>
                          </div>
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
        <strong>© 2025 CardioUCM</strong> - Todos los derechos reservados.
        <div className="float-right d-none d-sm-inline-block">
          <b>Versión</b> 1.0.0
        </div>
      </footer>
    </div>
  );
}