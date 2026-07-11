/*
 * tiemposTransicion — reloj del kit de transiciones de mundo (TransicionMundoKit).
 *
 * Vive separado del JSX por dos razones:
 *   1. react-refresh/only-export-components: el .jsx solo puede exportar
 *      componentes (allowConstantExport no cubre objetos/arrays);
 *   2. el host y los tests necesitan cronometrar sin montar nada.
 *
 * El contrato temporal es el mismo del velo original (TransicionMundo):
 * timers JS deterministas — el CSS anima "a ciegas" con la MISMA duración
 * via la variable `--tmk-ms`, pero quien manda es el setTimeout. Así el
 * intercambio de escena nunca depende de `animationend` (pestañas en
 * segundo plano, throttling, etc.).
 *
 * Anatomía de un viaje (fracciones de la duración total):
 *   0%            → arranca a cubrir la pantalla
 *   45%–55%       → pantalla 100% cubierta (meseta de intercambio)
 *   50% (MITAD)   → dispara `onMitad`: el host intercambia la escena DEBAJO
 *   100%          → pantalla revelada; dispara `onFin`
 */

/** Variantes disponibles del kit. */
export const VARIANTES = ['wipe', 'iris', 'zoom', 'fade'];

/** Duración total (cubrir + meseta + revelar) por variante, en ms, tier alto/medio. */
export const DURACIONES_MS = {
  wipe: 1200,
  iris: 1100,
  zoom: 1300,
  fade: 900,
};

/** Con `reducedMotion` TODO colapsa a un corte simple de esta duración. */
export const REDUCIDA_MS = 160;

/** Tier `bajo` acorta el viaje (menos tiempo de overlay sobre equipos flojos). */
export const FACTOR_TIER_BAJO = 0.7;

/** Fracción del total en la que la pantalla está garantizadamente cubierta. */
export const MITAD_FRAC = 0.5;

/**
 * Duración total del viaje en ms para una combinación dada.
 * Variante desconocida → cae a `fade` (nunca revienta).
 *
 * @param {string} variante 'wipe'|'iris'|'zoom'|'fade'
 * @param {'alto'|'medio'|'bajo'} tier
 * @param {boolean} reducedMotion
 * @returns {number} ms
 */
export function duracionTransicion(variante, tier, reducedMotion) {
  if (reducedMotion) return REDUCIDA_MS;
  const base = DURACIONES_MS[variante] ?? DURACIONES_MS.fade;
  return tier === 'bajo' ? Math.round(base * FACTOR_TIER_BAJO) : base;
}

/**
 * Momento (ms desde el arranque) en que disparar `onMitad` — centro de la
 * meseta cubierta. Con `reducedMotion` la cobertura es instantánea, así que
 * la mitad llega enseguida pero igual dentro de la meseta.
 */
export function mitadTransicion(variante, tier, reducedMotion) {
  return Math.round(duracionTransicion(variante, tier, reducedMotion) * MITAD_FRAC);
}
