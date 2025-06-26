// RUTA: src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// NOTA: Se ha eliminado la lógica del Service Worker para asegurar
// que el despliegue inicial funcione correctamente. Se puede volver a añadir más adelante.