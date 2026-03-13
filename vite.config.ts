import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    middlewareMode: false,
  },
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    // 輸出到 ../dist/public（相對於 root=client）
    // 這樣 production server 會在 dist/public 找到 index.html
    outDir: '../dist/public',
    emptyOutDir: true,
  },
  root: 'client',
});
