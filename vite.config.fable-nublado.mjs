// Config efímera del carril Fable-nublado: misma config + cacheDir propio (no se commitea).
import base from './vite.config.js';
export default { ...base, cacheDir: '.vite-cache-fable-nublado' };
