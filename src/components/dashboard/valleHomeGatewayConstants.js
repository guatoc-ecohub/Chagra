export const VALLE_AUTO_DELAY_MS = 12000;
export const VALLE_TEASER_MS = 4600;

// FRAMES REALES del valle 3D (GPU-capturados del valle vivo, no una postal CSS).
// Viven en public/valle-teaser/ como webp livianos (~50KB c/u): NUNCA entran al
// bundle crítico; se piden por red, perezosos y en idle. Decisión del operador
// 2026-08-27: el teaser del home usa cuadros reales del valle, no un mock.
export const VALLE_TEASER_FRAMES = [
  '/valle-teaser/valle-teaser-1.webp',
  '/valle-teaser/valle-teaser-2.webp',
  '/valle-teaser/valle-teaser-3.webp',
];

let framesPrecargadas = false;

/**
 * Precarga los cuadros del teaser UNA sola vez, en tiempo ocioso. No corre en el
 * primer paint del home ni entra al bundle: son peticiones de red de baja
 * prioridad para que el teaser (a los 12 s) aparezca ya cacheado.
 */
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

/**
 * Precalienta únicamente el módulo de destino. No se ejecuta al importar el
 * home: solo al entrar, o cuando la animación ya cubrió la pantalla.
 */
export function preloadValleMarco() {
  if (!vallePreload) {
    // La ruta permanece dinámica para que el valle pesado no entre al bundle
    // crítico del dashboard.
    vallePreload = import('../ValleMarcoScreen.jsx').catch(() => null);
  }
  return vallePreload;
}
