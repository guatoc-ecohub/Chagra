/**
 * Stub de tipos para `leaflet` (queue/069.6).
 *
 * `leaflet` no publica su propio `.d.ts` ni hay `@types/leaflet` instalado.
 * Sin este stub + el mapeo `paths` en `jsconfig.json`, `checkJs` compila
 * directamente `node_modules/leaflet/dist/leaflet-src.js` (código de
 * terceros) y reporta ~150 errores ajenos a nuestro código. Runtime no
 * cambia: Vite sigue resolviendo `leaflet` normalmente vía node_modules;
 * este stub SOLO existe para el type-checker.
 */
declare const L: any;
export default L;
