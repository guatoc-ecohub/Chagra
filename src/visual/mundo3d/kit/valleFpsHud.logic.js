/*
 * valleFpsHud.logic — lógica pura del medidor de FPS a nivel de PÁGINA
 * (sin React, sin DOM: testeable sin GPU).
 *
 * ROBO: técnica de muestreo por ventanas de 1s + rating good/watch/slow +
 * conteo de cuadros lentos, tomada de ThreeUI `PreviewFpsMeter` (MengTo /
 * designcodeio, MIT) y adaptada al valle 3D de Chagra. Ver
 * Chagra-strategy/ops/steals/INDEX-STEALS.md (robo threeui, 2026-08-23).
 *
 * Este medidor NO reemplaza a usePerformanceMonitor.jsx: aquél es el TERMOSTATO
 * (mide el loop de render del <Canvas> con drei y sube/baja calidad); éste es un
 * HUD de diagnóstico que mide la cadencia REAL de la página (rAF del
 * compositor). Atrapa jank del hilo principal FUERA del loop de render
 * (re-renders de React, GC) — lo que de verdad importa depurando el valle en
 * teléfonos de gama baja (usuarios agro reales).
 */

/** Umbral (ms) por encima del cual un cuadro cuenta como lento (jank). */
export const MS_CUADRO_LENTO = 25;

/**
 * Clasifica un fps en una calificación perceptual.
 * @param {number} fps
 * @returns {'good'|'watch'|'slow'|'pending'}
 */
export function clasificarFps(fps) {
  if (!Number.isFinite(fps) || fps <= 0) return 'pending';
  if (fps >= 55) return 'good';
  if (fps >= 45) return 'watch';
  return 'slow';
}

/**
 * ¿El HUD debe activarse? Opt-in explícito: query `?fps=1` o localStorage
 * `chagra:fps-hud=1`. Inerte en producción salvo que alguien lo pida a mano.
 * `?fps=0` lo apaga aunque el localStorage esté puesto.
 * @param {string} [search] location.search
 * @param {{ getItem?: (k: string) => (string|null) }|null} [storage] localStorage-like
 * @returns {boolean}
 */
export function hudHabilitado(search, storage) {
  try {
    const params = new URLSearchParams(search || '');
    if (params.has('fps')) return params.get('fps') !== '0';
    return storage?.getItem?.('chagra:fps-hud') === '1';
  } catch {
    return false;
  }
}
