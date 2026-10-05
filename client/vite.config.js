import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_API_URL || 'http://127.0.0.1:3001';

  return {
    plugins: [react()],

    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    preview: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
