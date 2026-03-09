import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
  server: {
    middlewareMode: false,
  },
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  root: 'client',
});
