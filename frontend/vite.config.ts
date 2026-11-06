import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      ignored: ['**/public/**'],
    },
    proxy: {
      '/api': {
        // Must match backend PORT (default 5000 in backend/.env / config). Not 4000.
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        timeout: 15000,
        proxyTimeout: 15000,
      },
    },
  },
});