/* Build del comparador compai-antes-despues (3d.guatoc.co). Config propia y
   cacheDir propio: la caché compartida entre instancias de vite ya produjo
   504 + captura negra en gates paralelos (memoria de la casa). */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  cacheDir: '.vite-comparador',
  build: {
    outDir: 'dist-comparador',
    emptyOutDir: true,
    assetsDir: 'compai-vivo-assets',
    rollupOptions: {
      input: 'comparador-vivo.html',
    },
  },
});
