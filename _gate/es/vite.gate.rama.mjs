// Config del GATE (rama): misma config del proyecto + cacheDir PROPIO
// (lección: node_modules symlinkeado comparte node_modules/.vite → 504 y captura negra).
import base from '../../vite.config.js';
export default { ...base, cacheDir: '/tmp/vite-gate-es-rama-20260904' };
