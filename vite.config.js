// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? './' : '/', // 👈 se adapta
  server: {
    host: '0.0.0.0',
    https: false,
    port: 5173,
    hmr: {},
  },
});
