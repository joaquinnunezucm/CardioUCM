import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Lógica para manejar el Service Worker específicamente para desarrollo
if (process.env.NODE_ENV === 'development') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister()
          .then(() => console.log('Service Worker desregistrado en desarrollo para la ruta:', registration.scope))
          .catch(err => console.error('Error desregistrando Service Worker en desarrollo:', err));
      }
    }).catch(err => console.error('Error obteniendo registros de Service Worker:', err));
  }
} else { // Modo producción: registrar el Service Worker normalmente
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js') // Asegúrate que esta ruta sea correcta
        .then(registration => {
          console.log('✅ Service Worker registrado con éxito:', registration.scope);
        })
        .catch(error => {
          console.error('❌ Error al registrar el Service Worker:', error);
        });
    });
  }
}