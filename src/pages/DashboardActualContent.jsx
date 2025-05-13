// src/pages/DashboardActualContent.jsx
import React from 'react'; // No necesita useState, useEffect, useCallback para estos datos específicos
import { Link, useNavigate, useOutletContext } from 'react-router-dom';

export default function DashboardActualContent() {
  const navigate = useNavigate();

  // Recibe los datos del Outlet context, que son cargados y mantenidos por Dashboard.jsx (Layout)
  // Proporcionar valores por defecto robustos en caso de que el contexto aún no esté listo (aunque ProtectedRoute debería manejar la carga)
  const {
    estadisticasSistema = { visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0 },
    clicksPorSeccion = {},
    modulosParaInfoBoxes = [] // Importante que sea un array para el .map()
  } = useOutletContext() || { // Fallback adicional si useOutletContext() devuelve null/undefined inicialmente
    estadisticasSistema: { visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0 },
    clicksPorSeccion: {},
    modulosParaInfoBoxes: []
  };

  const handleInfoBoxClick = (ruta) => {
    if (ruta) {
      navigate(ruta);
    }

  };

  return (
    <>
      {/* Cabecera específica para la página del Dashboard */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Panel de Administración</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/admin">Inicio</Link></li>
                <li className="breadcrumb-item active">Dashboard</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal del Dashboard */}
      <section className="content">
        <div className="container-fluid">
          {/* Info boxes: Itera sobre modulosParaInfoBoxes para generar las tarjetas */}
          <div className="row">
            {modulosParaInfoBoxes.map((modulo) => (
              <div className="col-12 col-sm-6 col-md-4" key={`info-${modulo.seccionApi}`}>
                <div
                  className={`info-box ${modulo.color || 'bg-secondary'} mb-3`} // Color por defecto si no se especifica
                  style={{ cursor: modulo.ruta ? "pointer" : "default" }}
                  onClick={() => handleInfoBoxClick(modulo.ruta)} // Solo navega si hay ruta
                >
                  <span className="info-box-icon"><i className={modulo.icono}></i></span>
                  <div className="info-box-content">
                    <span className="info-box-text">{modulo.nombre}</span>
                    <span className="info-box-number">
                      {(clicksPorSeccion && clicksPorSeccion[modulo.seccionApi]) || 0}
                    </span>
                    <div className="progress" style={{ height: '3px', margin: '5px 0' }}>
                      <div
                        className="progress-bar"
                        style={{ width: `${Math.min(((clicksPorSeccion && clicksPorSeccion[modulo.seccionApi]) || 0) * 5, 100)}%` }} // Ajusta el multiplicador para la barra de progreso si es necesario
                      ></div>
                    </div>
                    <span className="progress-description">
                      {modulo.ruta ? "Ingresos a sección" : (modulo.seccionApi === "LlamadaEmergencia131" ? "Total de acciones" : "Estadística")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Estadísticas del Sistema */}
          <div className="row mt-4">
            <div className="col-md-12">
              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title">Resumen del sistema</h3>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-lg-4 col-6">
                      <div className="small-box bg-success">
                        <div className="inner">
                          <h3>{estadisticasSistema.visitasPagina || 0}</h3>
                          <p>Visitas a la página</p>
                        </div>
                        <div className="icon"><i className="fas fa-users"></i></div>
                      </div>
                    </div>
                    <div className="col-lg-4 col-6">
                      <div className="small-box bg-warning">
                        <div className="inner">
                          <h3>{estadisticasSistema.deasRegistrados || 0}</h3>
                          <p>DEAs registrados</p>
                        </div>
                        <div className="icon"><i className="fas fa-heart-pulse"></i></div>
                      </div>
                    </div>
                    <div className="col-lg-4 col-6">
                      <div className="small-box bg-danger">
                        <div className="inner">
                          <h3>{estadisticasSistema.emergenciasEsteMes || 0}</h3>
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
    </>
  );
}