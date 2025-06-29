import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, Outlet, unstable_useBlocker as useBlocker } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { API_BASE_URL } from '../utils/api';

/**
 * Componente para el modal personalizado de confirmación de salida.
 * Se muestra cuando el usuario intenta navegar fuera del área de administración.
 * Reemplaza la alerta genérica y no personalizable del navegador.
 */
function ConfirmNavigationModal({ blocker, onCancel, onConfirm }) {
  // No renderizar nada si no hay un bloqueo activo.
  if (!blocker || blocker.state !== 'blocked') {
    return null;
  }

  return (
    // Contenedor del modal que cubre toda la pantalla.
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4 text-left">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Confirmar Salida</h3>
        <p className="mb-6 text-gray-600">
          Estás a punto de salir del panel de administración. Por seguridad, tu sesión se cerrará.
          <br /><br />
          ¿Deseas continuar?
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
          >
            Permanecer aquí
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
          >
            Sí, Salir
          </button>
        </div>
      </div>
    </div>
  );
}


export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  // --- LÓGICA DEL MODAL DE CONFIRMACIÓN CON useBlocker ---
  // Se activa el bloqueo si hay un usuario logueado.
  const shouldBlock = !!user; 
  const blocker = useBlocker(shouldBlock);

  const handleCancelNavigation = () => {
    // Si el usuario cancela, se resetea el blocker y la navegación se detiene.
    if (blocker) {
      blocker.reset(); 
    }
  };

  const handleConfirmNavigation = () => {
    // Si el usuario confirma, se procede con la navegación.
    // Esto desmontará el Dashboard, y el useEffect de limpieza hará el logout.
    if (blocker) {
      blocker.proceed(); 
    }
  };

  // --- LÓGICA DE ESTADO ---
  const nombreUsuario = user ? user.nombre : "Usuario";
  const rolUsuario = user ? user.rol : "";
  const [clicksPorSeccion, setClicksPorSeccion] = useState({});
  const [estadisticasSistema, setEstadisticasSistema] = useState({
    visitasPagina: 0, deasRegistrados: 0, emergenciasEsteMes: 0,
  });

  // --- useEffect DE CIERRE DE SESIÓN AUTOMÁTICO (CRUCIAL) ---
  // Se ejecuta cuando el componente se desmonta (al navegar fuera del layout de admin).
  useEffect(() => {
    return () => {
      console.log('Saliendo del layout de administración. La sesión será cerrada.');
      logout();
    };
  }, [logout]);

  // --- useEffect PARA MANEJAR CACHÉ DE NAVEGADOR (bfcache) ---
  // Evita que se pueda volver al panel con el botón "adelante" tras haber salido.
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted && !sessionStorage.getItem('token')) {
        console.log('Página restaurada desde bfcache sin sesión válida. Redirigiendo a login.');
        navigate('/login', { replace: true });
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [navigate]);

  // --- useEffect DE SEGURIDAD INICIAL ---
  // Si se accede a esta ruta sin usuario/token, redirige inmediatamente al login.
  useEffect(() => {
    if (!user || !token) {
      navigate("/login", { replace: true });
    }
  }, [user, token, navigate]);

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
      console.error('Dashboard (Layout): Error stats:', error.response?.data?.message || error.message);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logout();
      }
    }
  }, [logout]);

  const fetchClicksPorSeccion = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/obtener-clics`);
      const clicksData = response.data || {};
      const clicksIniciales = {};
      modulosParaInfoBoxes.forEach(modulo => {
        if (modulo.seccionApi) clicksIniciales[modulo.seccionApi] = clicksData[modulo.seccionApi] || 0;
      });
      setClicksPorSeccion(clicksIniciales);
    } catch (error) {
      console.error('Dashboard (Layout): Error clics:', error.response?.data?.message || error.message);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logout();
      }
    }
  }, [logout, modulosParaInfoBoxes]);

  useEffect(() => {
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

  return (
    <>
      <ConfirmNavigationModal
        blocker={blocker}
        onCancel={handleCancelNavigation}
        onConfirm={handleConfirmNavigation}
      />

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

        <aside className="main-sidebar" style={{ backgroundColor: '#0A3877', color: '#ffffff', fontFamily: 'Arial, sans-serif', minHeight: '100vh' }}>
          <Link to="/admin" className="brand-link" style={{ padding: '15px', display: 'flex', alignItems: 'center', color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textDecoration: 'none' }}>
            <i className="fas fa-heartbeat brand-image ml-3 img-circle elevation-3" style={{ opacity: 0.8, fontSize: '24px', marginRight: '10px' }}></i>
            <span className="brand-text" style={{ fontWeight: '600', fontSize: '18px' }}>CardioUCM Admin</span>
          </Link>
          <div className="sidebar" style={{ padding: '10px 0' }}>
            <nav className="mt-2">
              <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false" style={{ listStyle: 'none', padding: 0 }}>
                <li className="nav-item" style={{ margin: '5px 0' }}>
                  <Link to="/admin" className="nav-link" style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', color: '#ffffff', fontSize: '16px', borderRadius: '0 25px 25px 0', transition: 'background-color 0.3s, color 0.3s', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#005566'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <i className="nav-icon fas fa-tachometer-alt" style={{ width: '30px', textAlign: 'center', marginRight: '10px' }}></i>
                    <p>Dashboard</p>
                  </Link>
                </li>
                <li className="nav-header" style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold', padding: '10px 15px', margin: '10px 0', borderTop: '1px solid rgba(255, 255, 255, 0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', textTransform: 'uppercase' }}>
                  Visualizar Contenido
                </li>
                {modulosHomeNavegablesSidebar.map((modulo) => (
                  <li className="nav-item" key={modulo.ruta + '-layout-home'} style={{ margin: '5px 0' }}>
                    <Link to={modulo.ruta} className="nav-link" style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', color: '#ffffff', fontSize: '16px', borderRadius: '0 25px 25px 0', transition: 'background-color 0.3s, color 0.3s', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#005566'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <i className={`nav-icon ${modulo.icono}`} style={{ width: '30px', textAlign: 'center', marginRight: '10px' }}></i>
                      <p>{modulo.nombre}</p>
                    </Link>
                  </li>
                ))}
                <li className="nav-header" style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold', padding: '10px 15px', margin: '10px 0', borderTop: '1px solid rgba(255, 255, 255, 0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  GESTIÓN DE CONTENIDO
                </li>
                {modulosAdminDinamicosSidebar.map((modulo) => (
                  <li className="nav-item" key={modulo.ruta + '-layout-admin'} style={{ margin: '5px 0' }}>
                    <Link to={modulo.ruta} className="nav-link" style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', color: '#ffffff', fontSize: '16px', borderRadius: '0 25px 25px 0', transition: 'background-color 0.3s, color 0.3s', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#005566'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
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
        </footer>
      </div>
    </>
  );
}