import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom'] } } },
    chunkSizeWarningLimit: 900,
  },
  server: { host: true, port: 5173 },
});
