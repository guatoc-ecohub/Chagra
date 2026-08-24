// config del gate: la MISMA config del repo con cacheDir PROPIO (caché
// compartida entre instancias = 504 y captura negra — lección aprendida).
import base from './vite.config.js';
export default { ...base, cacheDir: '.vite-gate-luci' };
