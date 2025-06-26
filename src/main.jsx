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

// CORRECCIÓN: Usar import.meta.env.DEV en lugar de process.env.NODE_ENV
if (import.meta.env.DEV) {
  // Estamos en modo desarrollo
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
        console.log('Service Worker desregistrado en desarrollo.');
      }
    });
  }
} else {
  // Estamos en modo producción
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js'); // Asegúrate que este archivo exista en la carpeta 'public'
    });
  }
}