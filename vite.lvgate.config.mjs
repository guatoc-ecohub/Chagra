import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// cacheDir PROPIO: compartir la caché entre gates produce 504 "Outdated Optimize
// Dep" y capturas negras — así se le mandó al operador un rectángulo negro en vez
// del jaguar el 2026-08-18 (msg 1787, marca anulada en compai-capturado.txt).
export default defineConfig({
  plugins: [react()],
  cacheDir: '/tmp/vite-cache-luciernaga-lvgate-0024',
  server: { host: '127.0.0.1', port: 5473, strictPort: true, fs: { strict: false } },
});
