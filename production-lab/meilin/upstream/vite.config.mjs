import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'web',
  base: './',
  css: { postcss: { plugins: [] } },
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 900 },
  server: { host: '127.0.0.1', port: 5311, proxy: { '/api': 'http://127.0.0.1:5310' } },
});
