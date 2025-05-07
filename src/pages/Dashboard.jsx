import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const usuario = localStorage.getItem('username') || "Admin";

  // Definimos las rutas específicas para cada módulo del admin
  const modulosHome = [
    { nombre: "RCP", icono: "fas fa-heartbeat", color: "bg-success", ruta: "/admin/capacitacion", seccionApi: "RCP" },
    { nombre: "DEA", icono: "fas fa-map-marker-alt", color: "bg-primary", ruta: "/admin/deas", seccionApi: "DEA" },
    { nombre: "Noticias", icono: "fas fa-newspaper", color: "bg-warning", ruta: "/admin/noticias", seccionApi: "Noticias" },
    { nombre: "Emergencia", icono: "fas fa-exclamation-triangle", color: "bg-danger", ruta: "/admin/emergencias", seccionApi: "Emergencia" },
    { nombre: "Preguntas Frecuentes", icono: "fas fa-question-circle", color: "bg-secondary", ruta: "/admin/faq", seccionApi: "Preguntas Frecuentes" },
  ];

  const modulosAdmin = [
    { nombre: "Validación DEA", icono: "fas fa-check-circle", color: "bg-info", ruta: "/admin/validacion-deas", seccionApi: "Validación DEA" },
    { nombre: "Reportes", icono: "fas fa-chart-bar", color: "bg-info", ruta: "/admin/reportes", seccionApi: "Reportes" },
  ];

  const [clicks, setClicks] = useState({});

  useEffect(() => {
    if (window.$ && window.$.AdminLTE) {
      window.$.AdminLTE.init();
    }
    document.body.classList.add('hold-transition', 'sidebar-mini');
    return () => {
      document.body.classList.remove('hold-transition', 'sidebar-mini');
    };
  }, []);

  // Este useEffect sigue siendo necesario para OBTENER los clics existentes y mostrarlos
  useEffect(() => {
    const fetchClicks = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/obtener-clics');
        let clicsData = {};
        if (Array.isArray(response.data)) {
          response.data.forEach(item => {
            clicsData[item.seccion] = item.cantidad;
          });
        } else if (typeof response.data === 'object' && response.data !== null) {
          clicsData = response.data; // Asumiendo que el backend ya devuelve el objeto {seccion: cantidad}
        } else {
          console.warn('Respuesta inesperada de clics:', response.data);
        }

        const clicksIniciales = {};
        // Usamos 'seccionApi' para mapear con los datos del backend
        [...modulosHome, ...modulosAdmin].forEach(modulo => {
          clicksIniciales[modulo.seccionApi] = clicsData[modulo.seccionApi] || 0;
        });
        setClicks(clicksIniciales);
      } catch (error) {
        console.error('Error al obtener los clics:', error);
        // Inicializar clics a 0 si falla la carga
        const clicksFallidos = {};
        [...modulosHome, ...modulosAdmin].forEach(modulo => {
          clicksFallidos[modulo.seccionApi] = 0;
        });
        setClicks(clicksFallidos);
      }
    };
    fetchClicks();
  }, []); // No hay dependencias, se ejecuta solo al montar

  // MODIFICADO: handleMenuClick ahora solo navega. No registra clics.
  const handleMenuClick = (ruta) => {
    navigate(ruta);
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('username');
    window.location.href = '/login'; // O usa navigate('/login') si está dentro del Router
  };

  return (
    <div className="wrapper">
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#" role="button">
              <i className="fas fa-bars"></i>
            </a>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            {/* Este enlace podría ir al dashboard principal /admin si es necesario */}
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

      {/* Sidebar */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <a href="/admin" className="brand-link"> {/* Enlace al dashboard principal */}
          <i className="fas fa-heartbeat brand-image ml-3"></i>
          <span className="brand-text font-weight-light">CardioUCM Admin</span>
        </a>
        <div className="sidebar">
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
            <li className="nav-header">ADMINISTRACIÓN DE CONTENIDO</li>
              {modulosHome.map((modulo, index) => (
                <li className="nav-item" key={`home-${index}`}>
                  <a
                    href={modulo.ruta} // Usar href directamente o prevenir default si se usa onClick para lógica compleja
                    onClick={(e) => {
                      e.preventDefault(); // Prevenir navegación por href si se maneja con navigate
                      handleMenuClick(modulo.ruta);
                    }}
                    className="nav-link"
                  >
                    <i className={`nav-icon ${modulo.icono}`}></i>
                    <p>{modulo.nombre}</p>
                  </a>
                </li>
              ))}
              <li className="nav-header">ADMINISTRACIÓN</li>
              {modulosAdmin.map((modulo, index) => (
                <li className="nav-item" key={`admin-${index}`}>
                  <a
                    href={modulo.ruta}
                    onClick={(e) => {
                      e.preventDefault();
                      handleMenuClick(modulo.ruta);
                    }}
                    className="nav-link"
                  >
                    <i className={`nav-icon ${modulo.icono}`}></i>
                    <p>{modulo.nombre}</p>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="content-wrapper">
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

        <section className="content">
          <div className="container-fluid">
            <div className="row">
              {modulosHome.map((modulo, index) => (
                <div className="col-12 col-sm-6 col-md-4" key={`info-home-${index}`}>
                  <div
                    className={`info-box ${modulo.color}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleMenuClick(modulo.ruta)} // Solo navega
                  >
                    <span className="info-box-icon">
                      <i className={modulo.icono}></i>
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">{modulo.nombre}</span>
                      {/* Mostramos los clics obtenidos de 'seccionApi' */}
                      <span className="info-box-number">{clicks[modulo.seccionApi] || 0}</span>
                      <div className="progress">
                        <div
                          className="progress-bar"
                          style={{ width: `${(clicks[modulo.seccionApi] || 0) * 10}%` }} // Ajusta la lógica de la barra si es necesario
                        ></div>
                      </div>
                      <span className="progress-description">Ingresos (App principal)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Estadísticas (como estaban, podrías hacerlas dinámicas si quieres) */}
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
                            <h3>150</h3> {/* Ejemplo Estático */}
                            <p>Visitas a la página</p>
                          </div>
                          <div className="icon">
                            <i className="fas fa-users"></i>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="small-box bg-warning">
                          <div className="inner">
                            <h3>53</h3> {/* Ejemplo Estático */}
                            <p>DEAs registrados</p>
                          </div>
                          <div className="icon">
                            <i className="fas fa-heart"></i>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="small-box bg-danger">
                          <div className="inner">
                            <h3>12</h3> {/* Ejemplo Estático */}
                            <p>Emergencias este mes</p>
                          </div>
                          <div className="icon">
                            <i className="fas fa-ambulance"></i>
                          </div>
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