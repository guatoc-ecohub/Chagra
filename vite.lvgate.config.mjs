import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// cacheDir PROPIO: compartir la caché entre gates produce 504 "Outdated Optimize
// Dep" y capturas negras (msg 1787 anulado el 2026-08-18). Puerto propio + strict.
export default defineConfig({
  plugins: [react()],
  cacheDir: '/tmp/vite-cache-chivito-lvgate-0224',
  server: { host: '127.0.0.1', port: 5481, strictPort: true, fs: { strict: false } },
});
