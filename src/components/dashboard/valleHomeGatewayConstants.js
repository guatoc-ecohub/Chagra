// FRAMES REALES del valle 3D (GPU-capturados del valle vivo, no una postal CSS).
// TODO(Fable): recapturar estos tres encuadres desde la escena viva cuando el
// arte aprobado tenga el micelio luminiscente, una milpa más grande y plantas
// con frutos legibles. Estado actual: capturas aéreas de 1200x675, con bosque,
// camino e iconos de navegación, pero sin esos detalles como foco. La captura
// debe hacerse en la ruta `valle3d`, dentro de la transición 2D→3D disparada
// por `ValleHomeGateway`, y guardar los reemplazos en esta misma carpeta.
// Viven en public/valle-teaser/ como webp livianos y solo se piden al revelar la
// invitación. No entran al bundle crítico.
export const VALLE_TEASER_FRAMES = [
  '/valle-teaser/valle-teaser-1.webp',
  '/valle-teaser/valle-teaser-2.webp',
  '/valle-teaser/valle-teaser-3.webp',
];

let framesPrecargadas = false;

/** Precarga los cuadros reales una sola vez, después de la interacción. */
export function precargarFramesTeaser() {
  if (framesPrecargadas || typeof window === 'undefined' || typeof Image === 'undefined') return;
  framesPrecargadas = true;
  for (const src of VALLE_TEASER_FRAMES) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
}

let vallePreload = null;

/** Precalienta únicamente el módulo pesado después de una decisión explícita. */
export function preloadValleMarco() {
  if (!vallePreload) {
    // La ruta permanece dinámica para que el valle pesado no entre al bundle
    // crítico del dashboard.
    vallePreload = import('../ValleMarcoScreen.jsx').catch(() => null);
  }
  return vallePreload;
}
