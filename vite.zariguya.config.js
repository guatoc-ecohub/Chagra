// Build standalone del demo trazado-riggeado de la zarigüeya para servirlo
// como estático durable en el valle guatoc (~/demos/3d/compai/zariguya/ →
// 3d.guatoc.co/compai/zariguya/). NO toca la config principal del PWA.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  root: import.meta.dirname,
  base: '/compai/zariguya/',
  plugins: [react()],
  build: {
    target: 'es2022',
    outDir: '/tmp/zt-build',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'zariguya-trazado-demo.html'),
    },
  },
});
