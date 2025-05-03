import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Bootstrap (ya importado en index.html)
// Las importaciones de AdminLTE ahora están en index.html

// Render de la app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registro del service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registrado con éxito:', registration);
      })
      .catch(error => {
        console.error('❌ Error al registrar el Service Worker:', error);
      });
  });
}