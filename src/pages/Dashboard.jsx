import React, { useState, useEffect } from 'react';
// Bootstrap imports are in index.html

export default function Dashboard() {
  const usuario = localStorage.getItem('username') || "Admin"; // Obtiene el nombre de usuario desde localStorage
  
  useEffect(() => {
    // Initialize AdminLTE components after the component mounts
    if (window.$ && window.$.AdminLTE) {
      window.$.AdminLTE.init();
    }
    
    // Ensure the body has the required AdminLTE classes
    document.body.classList.add('hold-transition', 'sidebar-mini');
    
    return () => {
      // Clean up when component unmounts
      document.body.classList.remove('hold-transition', 'sidebar-mini');
    };
  }, []);

  const modulos = [
    { nombre: "Reportes", icono: "fas fa-chart-bar", color: "bg-info", ruta: "/admin/reportes" },
    { nombre: "Capacitación RCP", icono: "fas fa-heartbeat", color: "bg-success", ruta: "/admin/capacitacion" },
    { nombre: "Ubicación de DEA", icono: "fas fa-map-marker-alt", color: "bg-primary", ruta: "/admin/deas" },
    { nombre: "Noticias", icono: "fas fa-newspaper", color: "bg-warning", ruta: "/admin/noticias" },
    { nombre: "Preguntas frecuentes", icono: "fas fa-question-circle", color: "bg-secondary", ruta: "/admin/faq" },
    { nombre: "Emergencia", icono: "fas fa-exclamation-triangle", color: "bg-danger", ruta: "/admin/emergencias" },
  ];

  const [clicks, setClicks] = useState(
    modulos.reduce((acc, modulo) => {
      acc[modulo.nombre] = 0;
      return acc;
    }, {})
  );

  const handleClick = (modulo) => {
    setClicks({ ...clicks, [modulo]: clicks[modulo] + 1 });
    // Aquí podrías agregar navegación si usas React Router
    // navigate(moduloSeleccionado.ruta);
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('username');
    window.location.href = '/login'; // Redirige al login
  };

  return (
    <div className="wrapper">
      {/* Navbar principal */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        {/* Left navbar links */}
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#" role="button">
              <i className="fas fa-bars"></i>
            </a>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            <a href="/" className="nav-link">Sitio público</a>
          </li>
        </ul>

        {/* Right navbar links */}
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
          <i className="fas fa-heartbeat brand-image ml-3"></i>
          <span className="brand-text font-weight-light">CardioUCM Admin</span>
        </a>

        {/* Sidebar */}
        <div className="sidebar">
          {/* Sidebar Menu */}
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
              {modulos.map((modulo, index) => (
                <li className="nav-item" key={index}>
                  <a href="#" className="nav-link" onClick={() => handleClick(modulo.nombre)}>
                    <i className={`nav-icon ${modulo.icono}`}></i>
                    <p>{modulo.nombre}</p>
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
            {/* Info boxes */}
            <div className="row">
              {modulos.map((modulo, index) => (
                <div className="col-12 col-sm-6 col-md-4" key={index}>
                  <div className={`info-box ${modulo.color}`} onClick={() => handleClick(modulo.nombre)} style={{ cursor: "pointer" }}>
                    <span className="info-box-icon">
                      <i className={modulo.icono}></i>
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">{modulo.nombre}</span>
                      <span className="info-box-number">{clicks[modulo.nombre]}</span>
                      <div className="progress">
                        <div className="progress-bar" style={{ width: `${(clicks[modulo.nombre] * 10)}%` }}></div>
                      </div>
                      <span className="progress-description">Cantidad de clics</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Estadísticas y resumen */}
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
        <div className="float-right d-none d-sm-inline">
          Panel de administración CardioUCM
        </div>
        <strong>&copy; 2025</strong> Todos los derechos reservados.
      </footer>
    </div>
  );
}