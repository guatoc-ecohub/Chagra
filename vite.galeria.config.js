import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Config AISLADO para la galería del jaguar (jaguar.guatoc.co). Entry único,
// sin tocar el build de la PWA. publicDir=false: los assets que necesita la
// lámina (/compai/laminas/jaguar-natural.png) se copian a mano al docroot.
export default defineConfig({
  plugins: [react()],
  define: { __BUILD_SHA__: JSON.stringify('galeria') },
  publicDir: false,
  build: {
    target: 'es2022',
    outDir: 'dist-jaguar-galeria',
    emptyOutDir: true,
    rollupOptions: {
      input: { index: resolve(import.meta.dirname, 'jaguar-galeria.html') },
    },
  },
});
