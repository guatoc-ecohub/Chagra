/* Build del harness de gates del jaguar Humboldt. Config y cacheDir PROPIOS:
   la caché compartida entre instancias de vite ya produjo 504 + captura negra
   en gates paralelos (memoria de la casa). */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  cacheDir: '.vite-jaguar-gate',
  build: {
    outDir: 'dist-jaguar-gate',
    emptyOutDir: true,
    assetsDir: 'jh-assets',
    rollupOptions: {
      input: 'jaguar-humboldt-gate.html',
    },
  },
});
