import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const usuario = localStorage.getItem('username') || "Admin";

  const modulos = [
    { nombre: "RCP", icono: "fas fa-heartbeat", color: "bg-success", ruta: "/admin/capacitacion" },
    { nombre: "DEA", icono: "fas fa-map-marker-alt", color: "bg-primary", ruta: "/admin/deas" },
    { nombre: "Noticias", icono: "fas fa-newspaper", color: "bg-warning", ruta: "/admin/noticias" },
    { nombre: "Emergencia", icono: "fas fa-exclamation-triangle", color: "bg-danger", ruta: "/admin/emergencias" },
    { nombre: "Preguntas frecuentes", icono: "fas fa-question-circle", color: "bg-secondary", ruta: "/admin/faq" },

    { nombre: "Reportes", icono: "fas fa-chart-bar", color: "bg-info", ruta: "/admin/reportes" }

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

  useEffect(() => {
    const fetchClicks = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/obtener-clics');
  
        // Solución definitiva: normalizar sea lo que sea que venga
        let clicsData = {};
  
        if (Array.isArray(response.data)) {
          response.data.forEach(item => {
            clicsData[item.seccion] = item.cantidad;
          });
        } else if (typeof response.data === 'object' && response.data !== null) {
          // Si ya viene como objeto tipo { "Reportes": 2, ... }
          clicsData = response.data;
        } else {
          console.warn('Respuesta inesperada de clics:', response.data);
        }
  
        const clicksIniciales = {};
        modulos.forEach(modulo => {
          clicksIniciales[modulo.nombre] = clicsData[modulo.nombre] || 0;
        });
  
        setClicks(clicksIniciales);
      } catch (error) {
        console.error('Error al obtener los clics:', error);
      }
    };
  
    fetchClicks();
  }, []);

  const handleMenuClick = async (seccion) => {
    try {
      await axios.post('http://localhost:3001/api/registro-clic', { seccion });
      setClicks(prev => ({
        ...prev,
        [seccion]: (prev[seccion] || 0) + 1
      }));
      console.log(`Clic registrado correctamente en: ${seccion}`);
    } catch (error) {
      console.error('Error al registrar clic:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('username');
    window.location.href = '/login';
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
            <a href="/" className="nav-link">CardioUCM APP</a>
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
        <a href="/admin" className="brand-link">
          <i className="fas fa-heartbeat brand-image ml-3"></i>
          <span className="brand-text font-weight-light">CardioUCM Admin</span>
        </a>
        <div className="sidebar">
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
              {modulos.map((modulo, index) => (
                <li className="nav-item" key={index}>
                  <a
                    href={modulo.ruta}
                    className="nav-link"
                    onClick={() => handleMenuClick(modulo.nombre)}
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
              {modulos.map((modulo, index) => (
                <div className="col-12 col-sm-6 col-md-4" key={index}>
                  <div className={`info-box ${modulo.color}`} style={{ cursor: "default" }}>
                    <span className="info-box-icon">
                      <i className={modulo.icono}></i>
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">{modulo.nombre}</span>
                      <span className="info-box-number">{clicks[modulo.nombre] || 0}</span>
                      <div className="progress">
                        <div
                          className="progress-bar"
                          style={{ width: `${(clicks[modulo.nombre] || 0) * 10}%` }}
                        ></div>
                      </div>
                      <span className="progress-description">Cantidad de Ingresos por Sección</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Estadísticas */}
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
                            <h3>150</h3>
                            <p>Usuarios registrados</p>
                          </div>
                          <div className="icon">
                            <i className="fas fa-users"></i>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="small-box bg-warning">
                          <div className="inner">
                            <h3>53</h3>
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
                            <h3>12</h3>
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
