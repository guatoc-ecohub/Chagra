/**
 * Stub de tipos para `leaflet` y `react-leaflet` (queue/069.6).
 *
 * Ambos paquetes no publican `.d.ts` completo. Sin este stub + el mapeo
 * `paths` en `jsconfig.json`, `checkJs` reporta ~150 errores ajenos a
 * nuestro código. Runtime no cambia: Vite sigue resolviendo normalmente
 * vía node_modules; este stub SOLO existe para el type-checker.
 */
declare const L: any;
export default L;

declare module 'react-leaflet' {
  export const MapContainer: any;
  export const TileLayer: any;
  export const Marker: any;
  export const Popup: any;
  export const GeoJSON: any;
  export function useMap(): any;
}
