// src/pages/DashboardActualContent.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx'; // Para el logout en caso de error de token

export default function DashboardActualContent() {
  const navigate = useNavigate();
  const { logout } = useAuth(); // Para manejar errores de autenticación

  // Definición de módulos para las info-boxes
  const modulosHomeInfoBoxes = [
    { nombre: "RCP", icono: "fas fa-heartbeat", color: "bg-success", ruta: "/admin/capacitacion", seccionApi: "RCP" },
    { nombre: "DEA", icono: "fas fa-map-marker-alt", color: "bg-primary", ruta: "/admin/deas", seccionApi: "DEA" },
    { nombre: "Noticias", icono: "fas fa-newspaper", color: "bg-warning", ruta: "/admin/noticias", seccionApi: "Noticias" },
    { nombre: "Preguntas Frecuentes", icono: "fas fa-question-circle", color: "bg-secondary", ruta: "/admin/faq", seccionApi: "Preguntas Frecuentes" },
    { nombre: "Llamadas al 131", icono: "fas fa-phone-volume", color: "bg-danger", seccionApi: "LlamadaEmergencia131" },
  ];

  const [clicksPorSeccion, setClicksPorSeccion] = useState({});
  const [estadisticasSistema, setEstadisticasSistema] = useState({
    visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0,
  });

  const fetchEstadisticasSistema = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/estadisticas');
      setEstadisticasSistema(response.data);
    } catch (error) {
      console.error('DashboardContent: Error stats:', error.response?.data?.message || error.message);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logout(); // Desloguear si el token es inválido/expirado
      }
      setEstadisticasSistema({ visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0 });
    }
  }, [logout]);

  const fetchClicksPorSeccion = useCallback(async () => {
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
      console.error('DashboardContent: Error clics:', error.response?.data?.message || error.message);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logout();
      }
      const clicksFallidos = {};
      modulosHomeInfoBoxes.forEach(modulo => {
        if (modulo.seccionApi) clicksFallidos[modulo.seccionApi] = 0;
      });
      setClicksPorSeccion(clicksFallidos);
    }
  }, [modulosHomeInfoBoxes, logout]); // modulosHomeInfoBoxes es estable

  useEffect(() => {
    fetchEstadisticasSistema();
    fetchClicksPorSeccion();
  }, [fetchClicksPorSeccion, fetchEstadisticasSistema]);

  const handleInfoBoxClick = (ruta) => ruta && navigate(ruta);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">Panel de Administración</h1></div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/admin">Inicio</Link></li>
                <li className="breadcrumb-item active">Dashboard</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            {modulosHomeInfoBoxes.map((modulo) => (
              <div className="col-12 col-sm-6 col-md-4" key={`info-${modulo.seccionApi}`}>
                <div className={`info-box ${modulo.color} mb-3`} style={{ cursor: modulo.ruta ? "pointer" : "default" }} onClick={() => modulo.ruta && handleInfoBoxClick(modulo.ruta)}>
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
          <div className="row mt-4">
            <div className="col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Resumen del sistema</h3></div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-lg-4 col-6"><div className="small-box bg-success"><div className="inner"><h3>{estadisticasSistema.visitasPagina || 0}</h3><p>Visitas a la página</p></div><div className="icon"><i className="fas fa-users"></i></div></div></div>
                    <div className="col-lg-4 col-6"><div className="small-box bg-warning"><div className="inner"><h3>{estadisticasSistema.deasRegistrados || 0}</h3><p>DEAs registrados</p></div><div className="icon"><i className="fas fa-heart-pulse"></i></div></div></div>
                    <div className="col-lg-4 col-6"><div className="small-box bg-danger"><div className="inner"><h3>{estadisticasSistema.emergenciasEsteMes || 0}</h3><p>Emergencias este mes</p></div><div className="icon"><i className="fas fa-ambulance"></i></div></div></div>
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