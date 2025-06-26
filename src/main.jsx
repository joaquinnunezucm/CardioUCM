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

// Lógica del Service Worker corregida y adaptada
// Usamos import.meta.env.DEV que es la forma correcta en Vite
if (import.meta.env.DEV) {
  // En desarrollo, nos aseguramos que no haya un service worker activo
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
  }
} else {
  // En producción, intentaremos registrar el service worker.
  // NOTA: Se ha comentado la siguiente línea porque el archivo 'service-worker.js' no existe.
  // Si añades el archivo en el futuro, puedes descomentar este bloque.
  /*
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js');
    });
  }
  */
}