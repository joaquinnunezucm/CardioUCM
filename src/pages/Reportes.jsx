// src/pages/Reportes.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Chart } from 'react-chartjs-2';
import 'chart.js/auto'; // Importante para que Chart.js registre todos los componentes
import { useAuth } from '../context/AuthContext'; // Ajusta la ruta si es necesario

// Función helper para capitalizar texto
const capitalizeText = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

// Función para generar colores para gráficos
const generateColors = (count) => {
  const colors = [];
  const baseHue = Math.random() * 360; 
  for (let i = 0; i < count; i++) {
    const hue = (baseHue + i * 137.508) % 360; // Ángulo dorado para distribución
    colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
  }
  return colors;
};

export default function Reportes() {
  const { token, logout } = useAuth();
  
  const [reportes, setReportes] = useState({
    deasPorComuna: [],
    estadoDeas: { aprobados: 0, inactivos: 0, pendientes: 0, rechazados: 0 },
    clics: {},
    solicitudesPorPeriodo: {} 
  });

  const [periodoFiltro, setPeriodoFiltro] = useState('meses');
  const [rangoFechas, setRangoFechas] = useState({ inicio: '', fin: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReportes = async () => {
      if (!token) {
        setLoading(false);
        setError("No autenticado. No se pueden cargar los reportes.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = { periodo: periodoFiltro };
        if (rangoFechas.inicio) params.inicio = rangoFechas.inicio;
        if (rangoFechas.fin) params.fin = rangoFechas.fin;
        
        const response = await axios.get('http://localhost:3001/api/reportes', {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        
        const dataFromServer = response.data;
        console.log('Datos recibidos del backend para Reportes.jsx:', dataFromServer);

        setReportes({
          // Asumiendo que el backend envía 'deasPorComuna' con {comuna, cantidad}
          deasPorComuna: dataFromServer.deasPorComuna || [],
          // Asumiendo que el backend envía 'estadoDeas' con {aprobados, pendientes, rechazados}
          // y el frontend mantiene 'inactivos' en su estado local si es necesario para el gráfico.
          estadoDeas: {
            aprobados: dataFromServer.estadoDeas?.aprobados || 0,
            inactivos: 0, // Si no viene del backend, se mantiene como 0
            pendientes: dataFromServer.estadoDeas?.pendientes || 0,
            rechazados: dataFromServer.estadoDeas?.rechazados || 0,
          },
          // Asumiendo que el backend envía 'clics' con {SECCION: {periodo: cantidad}}
          clics: dataFromServer.clics || {},
          solicitudesPorPeriodo: dataFromServer.solicitudesPorPeriodo || {}
        });

      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('No se pudieron cargar los reportes. Por favor, intenta de nuevo.');
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    fetchReportes();
  }, [periodoFiltro, rangoFechas, token, logout]);

  // --- CONFIGURACIÓN DE GRÁFICOS ---

  const deasPorComunaChartData = useMemo(() => ({
    labels: (reportes.deasPorComuna || []).map(item => capitalizeText(item.comuna)),
    datasets: [{
      label: 'Equipos DEA Registrados',
      data: (reportes.deasPorComuna || []).map(item => item.cantidad),
      backgroundColor: 'rgba(0, 123, 255, 0.7)',
      borderColor: 'rgba(0, 123, 255, 1)',
      borderWidth: 1
    }]
  }), [reportes.deasPorComuna]);

  const deasPorComunaChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Cantidad de Equipos DEA' }, ticks: { precision: 0 } },
      x: { title: { display: true, text: 'Comuna' } }
    },
    plugins: {
      legend: { display: true, position: 'top' },
      title: { display: true, text: 'Distribución de Equipos DEA por Comuna' }
    }
  }), []);

  const estadoDeasChartData = useMemo(() => ({
    labels: ['DEAs Aprobados', 'DEAs Pendientes', 'DEAs Rechazados'], // Sin 'Inactivos' si no se maneja
    datasets: [{
      data: [
        reportes.estadoDeas?.aprobados || 0,
        reportes.estadoDeas?.pendientes || 0,
        reportes.estadoDeas?.rechazados || 0
      ],
      backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
      borderColor: ['#ffffff', '#ffffff', '#ffffff'],
      borderWidth: 2
    }]
  }), [reportes.estadoDeas]);

  const estadoDeasChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: 'Estado de DEAs (Conteo Individual)' }
    }
  }), []);
  
  const clicsPorSeccionTotalChartData = useMemo(() => {
    const clicsData = reportes.clics || {};
    const labels = [];
    const dataPoints = [];

    for (const seccion in clicsData) {
      let totalClicksSeccion = 0;
      if (clicsData[seccion] && typeof clicsData[seccion] === 'object') {
        for (const periodoItem in clicsData[seccion]) {
          totalClicksSeccion += (Number(clicsData[seccion][periodoItem]) || 0);
        }
      }
      if (totalClicksSeccion > 0) {
        labels.push(capitalizeText(seccion));
        dataPoints.push(totalClicksSeccion);
      }
    }
    
    const combined = labels.map((label, index) => ({ label, data: dataPoints[index] }));
    combined.sort((a, b) => b.data - a.data);

    return {
      labels: combined.map(item => item.label),
      datasets: [{
        label: `Total Clics`,
        data: combined.map(item => item.data),
        backgroundColor: generateColors(combined.length),
        borderColor: 'rgba(0,0,0,0.1)',
        borderWidth: 1
      }]
    };
  }, [reportes.clics]);

  const clicsPorSeccionTotalChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, title: { display: true, text: 'Total de Clics Acumulados' }, ticks: { precision: 0 } },
      y: { title: { display: true, text: 'Sección' }, ticks: { autoSkip: false } } // autoSkip: false para mostrar todas las etiquetas de sección
    },
    plugins: {
      legend: { display: false },
      title: { 
        display: true, 
        text: `Interacción por Sección (${capitalizeText(periodoFiltro)}${rangoFechas.inicio && rangoFechas.fin ? ` de ${rangoFechas.inicio} a ${rangoFechas.fin}` : ''})`
      }
    }
  }), [periodoFiltro, rangoFechas.inicio, rangoFechas.fin]);


  // --- RENDERIZADO DE TABLAS ---
  const renderClicsTable = () => {
    const clicsData = reportes.clics || {};
    if (Object.keys(clicsData).length === 0) {
      return <p className="text-center text-muted mt-3">No hay datos de clics disponibles.</p>;
    }
    const sortedSecciones = Object.entries(clicsData).sort(([seccionA], [seccionB]) => seccionA.localeCompare(seccionB));

    return sortedSecciones.map(([seccion, periodos]) => (
      <div key={seccion} className="card mb-3 shadow-sm">
        <div className="card-header bg-light py-2"><h5 className="card-title mb-0 font-weight-bold" style={{fontSize: '1rem'}}>{capitalizeText(seccion)}</h5></div>
        <div className="card-body p-0">
          {Object.keys(periodos).length === 0 ? (<p className="text-center text-muted p-3">No hay clics.</p>) : (
            <ul className="list-group list-group-flush" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {Object.entries(periodos).sort(([pA], [pB]) => pB.localeCompare(pA)).map(([pItem, cant]) => (
                <li key={pItem} className="list-group-item d-flex justify-content-between align-items-center py-2">{pItem}<span className="badge bg-primary rounded-pill">{cant}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    ));
  };

  const renderSolicitudesTramitesTable = () => {
    const solicitudesData = reportes.solicitudesPorPeriodo || {};
    if (Object.keys(solicitudesData).length === 0) {
      return <p className="text-center text-muted mt-3">No hay datos de solicitudes.</p>;
    }
     const sortedPeriodos = Object.entries(solicitudesData).sort(([periodoA], [periodoB]) => periodoB.localeCompare(periodoA));
    return (
      <div className="card mb-3 shadow-sm">
        <div className="card-header bg-light py-2"><h5 className="card-title mb-0 font-weight-bold" style={{fontSize: '1rem'}}>Nuevas Solicitudes de Trámite</h5></div>
         <div className="card-body p-0">
            <ul className="list-group list-group-flush" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {sortedPeriodos.map(([periodoItem, cantidad]) => (
                <li key={periodoItem} className="list-group-item d-flex justify-content-between align-items-center py-2">Periodo: {periodoItem}<span className="badge bg-success rounded-pill">{cantidad}</span></li>
              ))}
            </ul>
        </div>
      </div>
    );
  };

  return (
    <section className="content py-4">
      <div className="container-fluid">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
            <h1 className="h3 mb-0 text-gray-800">Dashboard de Reportes</h1>
        </div>

        <div className="card shadow mb-4">
            <div className="card-header py-3"> <h6 className="m-0 font-weight-bold text-primary">Filtros</h6> </div>
            <div className="card-body">
                <div className="row">
                    <div className="col-md-4 mb-3">
                        <label htmlFor="periodoSelectReportes" className="form-label">Agrupar Datos Por:</label>
                        <select id="periodoSelectReportes" className="form-control" value={periodoFiltro} onChange={(e) => setPeriodoFiltro(e.target.value)}>
                            <option value="meses">Meses</option>
                            <option value="semanas">Semanas</option>
                            <option value="dias">Días</option>
                        </select>
                    </div>
                    <div className="col-md-4 mb-3">
                        <label htmlFor="fechaInicioReportes" className="form-label">Desde:</label>
                        <input id="fechaInicioReportes" type="date" className="form-control" value={rangoFechas.inicio} onChange={(e) => setRangoFechas({ ...rangoFechas, inicio: e.target.value })}/>
                    </div>
                    <div className="col-md-4 mb-3">
                        <label htmlFor="fechaFinReportes" className="form-label">Hasta:</label>
                        <input id="fechaFinReportes" type="date" className="form-control" value={rangoFechas.fin} onChange={(e) => setRangoFechas({ ...rangoFechas, fin: e.target.value })} />
                    </div>
                </div>
            </div>
        </div>
        
        {loading && (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Cargando reportes...</span>
            </div>
            <p className="ms-3 mb-0">Cargando reportes...</p>
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}
        
        {!loading && !error && (
          <>
            <div className="row">
              {/* Gráfico DEAs por Comuna */}
              <div className="col-xl-7 col-lg-6 mb-4">
                <div className="card shadow">
                  <div className="card-header py-3"> <h6 className="m-0 font-weight-bold text-primary">Equipos DEA por Comuna</h6> </div>
                  <div className="card-body">
                    {(reportes.deasPorComuna || []).length > 0 ? (
                      <div style={{ height: '400px' }}>
                        <Chart type="bar" data={deasPorComunaChartData} options={deasPorComunaChartOptions} />
                      </div>
                    ) : ( <p className="text-muted text-center py-5">No hay datos para mostrar.</p> )}
                  </div>
                </div>
              </div>

              {/* Gráfico Estado de DEAs */}
              <div className="col-xl-5 col-lg-6 mb-4">
                <div className="card shadow">
                  <div className="card-header py-3"> <h6 className="m-0 font-weight-bold text-primary">Estado General de DEAs</h6> </div>
                  <div className="card-body">
                    {(reportes.estadoDeas.aprobados > 0 || reportes.estadoDeas.pendientes > 0 || reportes.estadoDeas.rechazados > 0) ? (
                       <div style={{ height: '400px' }}>
                        <Chart type="doughnut" data={estadoDeasChartData} options={estadoDeasChartOptions} />
                      </div>
                    ) : ( <p className="text-muted text-center py-5">No hay datos para mostrar.</p> )}
                  </div>
                </div>
              </div>
            </div>

            {/* NUEVO GRÁFICO: Clics por Sección */}
            <div className="row mt-2">
              <div className="col-lg-12 mb-4">
                <div className="card shadow">
                  <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">
                      Interacción por Sección ({capitalizeText(periodoFiltro)}
                      {rangoFechas.inicio && rangoFechas.fin ? ` desde ${rangoFechas.inicio} hasta ${rangoFechas.fin}` : ''})
                    </h6>
                  </div>
                  <div className="card-body">
                    {(clicsPorSeccionTotalChartData.labels?.length || 0) > 0 ? (
                       <div style={{ height: '450px' }}>
                        <Chart 
                          type="bar" 
                          data={clicsPorSeccionTotalChartData} 
                          options={clicsPorSeccionTotalChartOptions} 
                        />
                      </div>
                    ) : (
                      <p className="text-muted text-center py-5">No hay datos de clics para los filtros aplicados.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
    
          </>
        )}
      </div>
    </section>
  );
}