import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  const env = loadEnv(mode, process.cwd())
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server:{
    proxy: {
      '/api': {
        target: 'process.env.BACKEND_URL',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    }
  },
});
