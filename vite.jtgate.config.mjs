import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  cacheDir: '/tmp/vite-cache-jtgate',
  server: { host: '127.0.0.1', port: 5431, strictPort: true, fs: { strict: false } },
});
