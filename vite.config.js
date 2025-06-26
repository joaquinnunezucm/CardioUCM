// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Escucha en todas las interfaces de red, permitiendo acceso desde la red local
    https: false,    // Confirma que no usas HTTPS para desarrollo local
    port: 5173,      // Puerto por defecto, mantenlo si no quieres cambiarlo
    hmr: {
      // Opcional: Configura el protocolo si necesitas forzar ws o wss
      // protocol: 'ws', // Descomenta solo si tienes problemas con HMR
    },
  },
});
