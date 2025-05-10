// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Asegúrate de que https sea false o no esté configurado si no usas HTTPS
    https: false, // Añade o asegúrate de que esto sea false o esté comentado
    hmr: {
      // El protocolo por defecto es 'ws' si server.https es false,
      // y 'wss' si server.https es true.
      // Puedes configurarlo explícitamente si es necesario, pero usualmente no se requiere si `https: false` está activo.
      // protocol: 'ws',
    }
  }
});

