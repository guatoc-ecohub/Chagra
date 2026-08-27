export const VALLE_AUTO_DELAY_MS = 12000;
export const VALLE_TEASER_MS = 4600;

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
