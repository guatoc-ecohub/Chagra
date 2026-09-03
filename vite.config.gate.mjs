// Config del GATE: la misma config del proyecto + cacheDir PROPIO.
// (Lección: el node_modules symlinkeado comparte node_modules/.vite entre
// instancias → 504 y captura negra. Cada gate lleva su caché.)
import base from './vite.config.js';
export default { ...base, cacheDir: '/tmp/vite-gate-invernadero-arte' };
