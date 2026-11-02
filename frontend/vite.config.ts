import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Public assets are served as-is. Watching them can crash Vite on Windows
    // with EBUSY while an image is still being written/moved by another app.
    watch: {
      ignored: ['**/public/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
