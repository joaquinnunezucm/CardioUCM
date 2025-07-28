import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, TimeScale } from 'chart.js';
import { Chart } from 'react-chartjs-2'; 
import 'chart.js/auto'; 
import 'chartjs-adapter-date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { Button, Form, Table, Badge } from 'react-bootstrap';
import { API_BASE_URL } from '../utils/api';

// Registrar los componentes de Chart.js que se van a utilizar
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale
);

const capitalizeText = (str) => {
  if (!str) return '';
  if (str === str.toUpperCase() && str.length <= 4) return str;
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

const generateColors = (count) => {
  const colors = [];
  const baseHue = Math.floor(Math.random() * 360); 
  for (let i = 0; i < count; i++) {
    const hue = (baseHue + i * (360 / (count < 2 ? 2 : count)) + i * 30) % 360;
    colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
  }
  return colors;
};

const generateBorderColors = (colorsArray) => {
    return colorsArray.map(color => color.replace('0.8', '1'));
}

const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const NOMBRE_SECCIONES_CLIC = {
  'VISITAHOMEPAGE': 'Home',
  'RCP': 'RCP',
  'DEA': 'DEA',
  'EDUCACIÓN': 'Educación',
  'PREGUNTAS FRECUENTES': 'FAQs',
  'CONTÁCTANOS': 'Contáctanos',
  'LLAMADAEMERGENCIA131': 'Llamada 131 (Botón)',

};

const getNombreSeccionClicDisplay = (nombreBackend) => {
  if (!nombreBackend) return 'Desconocida';
  const upperNombreBackend = nombreBackend.toUpperCase();
  return NOMBRE_SECCIONES_CLIC[upperNombreBackend] || capitalizeText(nombreBackend);
};

export default function Reportes() {
  const { token, logout } = useAuth();
  
  const [reportes, setReportes] = useState({
    deasPorComuna: [],
    estadoDeas: { aprobados: 0, inactivos: 0, pendientes: 0, rechazados: 0 },
    clics: {},
    solicitudesPorPeriodo: {},
    filtroAplicado: false 
  });

  const [rangoFechas, setRangoFechas] = useState({ 
    inicio: '', 
    fin: '' 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtrosActivosParaFetch, setFiltrosActivosParaFetch] = useState(false); 

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
        const params = {};

        if (filtrosActivosParaFetch) {
            if (rangoFechas.inicio) params.inicio = rangoFechas.inicio;
            if (rangoFechas.fin) params.fin = rangoFechas.fin;
        }

        
        const response = await axios.get(`${API_BASE_URL}/api/reportes`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        
        const dataFromServer = response.data;

        setReportes({
          deasPorComuna: dataFromServer.deasPorComuna || [],
          estadoDeas: {
            aprobados: dataFromServer.estadoDeas?.aprobados || 0,
            inactivos: dataFromServer.estadoDeas?.inactivos || 0,
            pendientes: dataFromServer.estadoDeas?.pendientes || 0,
            rechazados: dataFromServer.estadoDeas?.rechazados || 0,
          },
          clics: dataFromServer.clics || {},
          solicitudesPorPeriodo: dataFromServer.solicitudesPorPeriodo || {},
          filtroAplicado: dataFromServer.filtroAplicado || false
        });

      } catch (err) {
        setError(err.response?.data?.message || 'No se pudieron cargar los reportes. Por favor, intenta de nuevo.');
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Siempre llamar a fetchReportes si hay token,
    // la lógica de si se envían o no las fechas está dentro de fetchReportes.
    if (token) {
        fetchReportes();
    } else {
        setLoading(false);
        setError("No autenticado. No se pueden cargar los reportes.");
    }
  }, [token, logout, filtrosActivosParaFetch, rangoFechas.inicio, rangoFechas.fin]); // Depender explícitamente de las fechas y el flag

  const handleFechaChange = (e) => {
    const { name, value } = e.target;
    setRangoFechas(prev => ({ ...prev, [name]: value }));

  };
  
  const aplicarFiltros = () => {
    // Si el usuario ha ingresado al menos una fecha, consideramos que quiere aplicar filtros.
    if (rangoFechas.inicio || rangoFechas.fin) {
      setFiltrosActivosParaFetch(true);
    } else {
      // Si ambas fechas están vacías al aplicar, es como limpiar.
      setFiltrosActivosParaFetch(false);
    }
    // El useEffect se disparará porque filtrosActivosParaFetch o rangoFechas cambió
  };

  const limpiarFiltros = () => {
    setRangoFechas({ inicio: '', fin: '' });
    setFiltrosActivosParaFetch(false); 
  };

  const chartTitleSuffixDEA = useMemo(() => {
    if (reportes.filtroAplicado) {
      const inicioStr = rangoFechas.inicio || 'Principio';
      const finStr = rangoFechas.fin || getTodayDateString(); 
      return `(Trámites creados desde ${inicioStr} hasta ${finStr})`;
    }
    return '(Total Histórico)';
  }, [reportes.filtroAplicado, rangoFechas.inicio, rangoFechas.fin]);
  
  const chartTitleSuffixClicsSolicitudes = useMemo(() => {
    // Para clics y solicitudes, el filtro de fecha SIEMPRE se aplica en el backend
    // (con default a hoy para 'fin' si no se especifica).
    // El título debe reflejar el rango efectivo que usó el backend.
    const inicioStr = rangoFechas.inicio || 'Principio'; // Si no se envió inicio, el backend no filtró por él.
    const finStr = rangoFechas.fin || getTodayDateString(); // Si no se envió fin, backend usó hoy.
    
    if (rangoFechas.inicio || rangoFechas.fin) { // Si el usuario interactuó con los filtros
        return `(Desde ${inicioStr} hasta ${finStr})`;
    }
    return `(Datos hasta ${getTodayDateString()})`; // Default si no hay interacción con filtros
  }, [rangoFechas.inicio, rangoFechas.fin]);


  const deasPorComunaChartData = useMemo(() => {
    const dataItems = reportes.deasPorComuna || [];
    const backgroundColors = generateColors(dataItems.length);
    return {
        labels: dataItems.map(item => capitalizeText(item.comuna)),
        datasets: [{
        label: 'Equipos DEA Aprobados',
        data: dataItems.map(item => item.cantidad),
        backgroundColor: backgroundColors,
        borderColor: generateBorderColors(backgroundColors),
        borderWidth: 1
        }]
    };
  }, [reportes.deasPorComuna]);

  const deasPorComunaChartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Cantidad de Equipos DEA' }, ticks: { precision: 0, stepSize: 1 } },
      x: { title: { display: true, text: 'Comuna' } }
    },
    plugins: {
      legend: { display: true, position: 'top' },
      title: { display: true, text: `Distribución de DEAs Aprobados por Comuna ${chartTitleSuffixDEA}` }
    }
  }), [chartTitleSuffixDEA]);

  const estadoDeasChartData = useMemo(() => ({
    labels: ['DEAs Aprobados', 'DEAs Pendientes', 'DEAs Rechazados'],
    datasets: [{
      label: 'Estado de Solicitudes DEA',
      data: [
        reportes.estadoDeas?.aprobados || 0,
        reportes.estadoDeas?.pendientes || 0,
        reportes.estadoDeas?.rechazados || 0,
      ],
      backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
      borderColor: ['#ffffff', '#ffffff', '#ffffff'],
      borderWidth: 2
    }]
  }), [reportes.estadoDeas]);

  const estadoDeasChartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: `Estado de Solicitudes DEA ${chartTitleSuffixDEA}` }
    }
  }), [chartTitleSuffixDEA]);
  
  const clicsPorSeccionChartData = useMemo(() => {
    const clicsData = reportes.clics || {};
    let labels = [];
    let dataPoints = [];
    if (Object.keys(clicsData).length > 0) {
        for (const seccionBackend in clicsData) {
            labels.push(getNombreSeccionClicDisplay(seccionBackend));
            dataPoints.push(clicsData[seccionBackend] || 0);
        }
        const combined = labels.map((label, index) => ({ label, data: dataPoints[index] }));
        combined.sort((a, b) => b.data - a.data);
        labels = combined.map(item => item.label);
        dataPoints = combined.map(item => item.data);
    }
    const backgroundColors = generateColors(labels.length);
    return {
      labels: labels,
      datasets: [{
        label: `Clics por Sección`,
        data: dataPoints,
        backgroundColor: backgroundColors,
        borderColor: generateBorderColors(backgroundColors),
        borderWidth: 1
      }]
    };
  }, [reportes.clics]);

  const clicsPorSeccionChartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, title: { display: true, text: 'Total de Clics' }, ticks: { precision: 0, stepSize: 1 } },
      y: { title: { display: true, text: 'Sección' }, ticks: { autoSkip: false } }
    },
    plugins: { legend: { display: false }, title: { display: true, text: `Interacción por Sección ${chartTitleSuffixClicsSolicitudes}` } }
  }), [chartTitleSuffixClicsSolicitudes]);

  const solicitudesPorDiaChartData = useMemo(() => {
    const solicitudesData = reportes.solicitudesPorPeriodo || {};
    let labels = [];
    let dataPoints = [];
    if (Object.keys(solicitudesData).length > 0) {
        labels = Object.keys(solicitudesData).sort((a,b) => new Date(a) - new Date(b));
        dataPoints = labels.map(fecha => solicitudesData[fecha]);
    }
    return {
      labels: labels,
      datasets: [{
        label: 'Nuevas Solicitudes de Trámite',
        data: dataPoints,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        fill: true,
        tension: 0.1
      }]
    };
  }, [reportes.solicitudesPorPeriodo]);

  const solicitudesPorDiaChartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Cantidad de Solicitudes' }, ticks: { precision: 0, stepSize: 1 } },
      x: { 
        title: { display: true, text: 'Fecha de Creación' }, type: 'time', 
        time: { unit: 'day', tooltipFormat: 'dd MMM yyyy', displayFormats: { day: 'dd MMM' }, adapters: { date: { locale: es } } }
      }
    },
    plugins: { legend: { display: true, position: 'top' }, title: { display: true, text: `Evolución de Solicitudes ${chartTitleSuffixClicsSolicitudes}` } }
  }), [chartTitleSuffixClicsSolicitudes]);

  if (!token && loading) {
    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Cargando...</span></div>
        </div>
    );
  }
  if (!token && !error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning text-center">
          <h4><i className="fas fa-exclamation-triangle me-2"></i>Acceso Restringido</h4>
          <p>Debe estar autenticado para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="content py-4">
      <div className="container-fluid">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
            <h1 className="h3 mb-0 text-gray-800">Dashboard de Reportes</h1>
        </div>

        <div className="card shadow mb-4">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                <h6 className="m-0 font-weight-bold text-primary">Filtros de Fecha</h6>
                <div>
                    
                    <Button variant="outline-secondary" size="sm" onClick={limpiarFiltros}>
                        Limpiar Fechas y Ver Histórico/Default
                    </Button>
                </div>
            </div>
            <div className="card-body">
                <form onSubmit={(e) => { e.preventDefault(); aplicarFiltros(); }}>
                    <div className="row">
                        <div className="col-md-5 mb-3">
                            <label htmlFor="fechaInicioReportes" className="form-label">Desde:</label>
                            <input 
                                id="fechaInicioReportes" 
                                type="date" 
                                className="form-control" 
                                name="inicio"
                                value={rangoFechas.inicio} 
                                onChange={handleFechaChange}
                                max={rangoFechas.fin || getTodayDateString()}
                            />
                        </div>
                        <div className="col-md-5 mb-3">
                            <label htmlFor="fechaFinReportes" className="form-label">Hasta:</label>
                            <input 
                                id="fechaFinReportes" 
                                type="date" 
                                className="form-control" 
                                name="fin"
                                value={rangoFechas.fin} 
                                onChange={handleFechaChange}
                                min={rangoFechas.inicio}
                                max={getTodayDateString()}
                            />
                        </div>
                        <div className="col-md-2 mb-3 d-flex align-items-end">
                             <Button variant="primary" type="submit" className="w-100"> 
                                Aplicar
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
        
        {loading && (
          <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }} />
            <div className="mt-3 text-primary" style={{ fontSize: '1.1rem', fontWeight: 500 }}>
              Cargando reportes...
            </div>
          </div>
        )}
        {error && <div className="alert alert-danger text-center">{error}</div>}
        
        {!loading && !error && (
          <>
            <div className="row">
              <div className="col-xl-7 col-lg-6 mb-4">
                <div className="card shadow">
                  <div className="card-header py-3"> <h6 className="m-0 font-weight-bold text-primary">Equipos DEA por Comuna {chartTitleSuffixDEA}</h6> </div>
                  <div className="card-body">
                    {(() => {
                      const tieneDatos = (reportes.deasPorComuna || []).length > 0;
                      if (tieneDatos) {
                        return ( <div style={{ height: '400px' }}> <Chart type="bar" data={deasPorComunaChartData} options={deasPorComunaChartOptions} /> </div> );
                      } else {
                        return (<p className="text-muted text-center py-5">No hay datos de DEAs por comuna {reportes.filtroAplicado ? "para el rango seleccionado." : "disponibles."}</p>);
                      }
                    })()}
                  </div>
                </div>
              </div>

              <div className="col-xl-5 col-lg-6 mb-4">
                <div className="card shadow">
                  <div className="card-header py-3"> <h6 className="m-0 font-weight-bold text-primary">Estado Solicitudes DEA {chartTitleSuffixDEA}</h6> </div>
                  <div className="card-body">
                    {(() => {
                      const tieneDatos = reportes.estadoDeas.aprobados > 0 || reportes.estadoDeas.pendientes > 0 || reportes.estadoDeas.rechazados > 0;
                      if (tieneDatos) {
                        return ( <div style={{ height: '400px' }}> <Chart type="doughnut" data={estadoDeasChartData} options={estadoDeasChartOptions} /> </div> );
                      } else {
                        return (<p className="text-muted text-center py-5">No hay datos de estado de DEAs {reportes.filtroAplicado ? "para el rango seleccionado." : "disponibles."}</p>);
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="row mt-2">
              <div className="col-xl-6 col-lg-12 mb-4">
                <div className="card shadow">
                  <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">
                      Interacción por Sección
                    </h6>
                  </div>
                  <div className="card-body">
                    {(() => {
                      const tieneDatos = (clicsPorSeccionChartData.labels?.length || 0) > 0;
                      if (tieneDatos) {
                        return ( <div style={{ height: '450px' }}> <Chart type="bar" data={clicsPorSeccionChartData} options={clicsPorSeccionChartOptions} /> </div> );
                      } else {
                        return (<p className="text-muted text-center py-5">No hay datos de clics para el rango de fechas seleccionado.</p>);
                      }
                    })()}
                  </div>
                </div>
              </div>
              <div className="col-xl-6 col-lg-12 mb-4">
                <div className="card shadow">
                  <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">
                      Evolución de Solicitudes de Trámite
                    </h6>
                  </div>
                  <div className="card-body">
                    {(() => {
                      const tieneDatos = (solicitudesPorDiaChartData.labels?.length || 0) > 0;
                      if (tieneDatos) {
                        return ( <div style={{ height: '450px' }}> <Chart type="line" data={solicitudesPorDiaChartData} options={solicitudesPorDiaChartOptions} /> </div> );
                      } else {
                        return (<p className="text-muted text-center py-5">No hay datos de solicitudes para el rango de fechas seleccionado.</p>);
                      }
                    })()}
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