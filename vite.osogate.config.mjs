/* Build del harness de gates del oso del bastón (piel-lámina sobre huesos).
   Config y cacheDir PROPIOS: la caché compartida entre instancias de vite ya
   produjo 504 + captura negra en gates paralelos (memoria de la casa). */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  cacheDir: '.vite-oso-gate',
  build: {
    outDir: 'dist-oso-gate',
    emptyOutDir: true,
    assetsDir: 'osb-assets',
    rollupOptions: {
      input: 'oso-baston-gate.html',
    },
  },
});
