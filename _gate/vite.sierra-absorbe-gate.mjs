/*
 * Config de vite SOLO para el gate de captura de este carril (no se commitea):
 * la config de dev del repo bloquea con 403 el `node_modules` real (está
 * symlinkeado desde el repo principal, fuera de la raíz del worktree) y eso
 * rompe el sqlite-wasm. Acá se permite ese realpath y nada más cambia.
 */
import { defineConfig, mergeConfig } from 'vite';
import base from '../vite.config.js';

export default defineConfig(
  mergeConfig(base, {
    server: {
      fs: {
        allow: [
          '/home/kortux/Workspace/chagra',
          '/home/kortux/Workspace/chagra/node_modules',
        ],
      },
    },
  }),
);
