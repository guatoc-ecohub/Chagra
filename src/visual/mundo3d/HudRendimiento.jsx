/*
 * HudRendimiento — lectura VISIBLE de FPS del valle 3D para diagnóstico en campo.
 *
 * Origen del patrón: PreviewFpsMeter de MengTo/threeui (MIT) — la idea de un
 * medidor con calificación bueno/atento/lento y colores. PERO no se copia su
 * bucle rAF propio: eso DUPLICARÍA la medición. El instrumento autoritativo de
 * Chagra ya existe (usePerformanceMonitor.jsx: el <PerformanceMonitor> de drei
 * mide FPS reales y gradúa la calidad). Este HUD SOLO LEE ese instrumento vía
 * useCalidad3D() y lo presenta. Instrumento de Chagra (superior) + presentación
 * de threeui = fusión, no copia.
 *
 * POR QUÉ importa: los usuarios reales del agro corren teléfonos de gama baja.
 * Un HUD conmutable en el propio dispositivo (sin recompilar) permite ver una
 * regresión de rendimiento en el campo, no solo en el escritorio del dev.
 *
 * ACTIVACIÓN (por defecto APAGADO → return null, costo cero):
 *   · URL con `?hud` o `&hud` (un tester lo prende en el teléfono real), o
 *   · localStorage['chagra:prefs:hudFps'] === '1' (persistente).
 *
 * CABLEO (una línea, junto al <Canvas> de EscenaBase3D, en el árbol DOM — NO
 * dentro del Canvas): <HudRendimiento />. El store puentea los dos árboles, así
 * que la lectura funciona fuera del Canvas (contrato de usePerformanceMonitor).
 *
 * Con reduced-motion el monitor no muestrea (frameloop 'demand'): el FPS llega
 * en 0 y el HUD muestra 'pausa' en vez de un número falso.
 */
/* eslint-disable react-refresh/only-export-components -- helper puro
   (ratingDeFps) + lector de flag (hudRendimientoHabilitado) exportados junto al
   componente para poder testearlos sin DOM ni GPU; el módulo es 3D-lazy, no
   hot-reload-sensible (mismo criterio que usePerformanceMonitor.jsx). */
import { useCalidad3D } from './usePerformanceMonitor.jsx';
import './hudRendimiento.css';

const CLAVE_FLAG = 'chagra:prefs:hudFps';

/**
 * Calificación de presentación a partir del FPS (bandas de threeui, adaptadas).
 * 0 o menos → 'pausa' (el monitor no está muestreando: reduced-motion o escena
 * quieta). El resto sigue el criterio bueno≥55 / atento≥45 / lento.
 * @param {number} fps
 * @returns {'pausa'|'bueno'|'atento'|'lento'}
 */
export function ratingDeFps(fps) {
  if (!Number.isFinite(fps) || fps <= 0) return 'pausa';
  if (fps >= 55) return 'bueno';
  if (fps >= 45) return 'atento';
  return 'lento';
}

/**
 * Decide si el HUD debe montarse. Lee la URL y localStorage de forma defensiva
 * (SSR / entornos sin window o sin storage → false).
 * @returns {boolean}
 */
export function hudRendimientoHabilitado() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location?.search || '');
    if (params.has('hud')) return true;
  } catch {
    /* URL malformada: se ignora, se cae a localStorage */
  }
  try {
    return window.localStorage?.getItem(CLAVE_FLAG) === '1';
  } catch {
    return false;
  }
}

/**
 * Overlay DOM de FPS. Devuelve null salvo que el flag esté activo. No mide nada
 * por su cuenta: lee el snapshot vivo de useCalidad3D().
 */
export default function HudRendimiento() {
  const { fps = 0, nivel, dpr, fallback, tier } = useCalidad3D();

  if (!hudRendimientoHabilitado()) return null;

  const rating = ratingDeFps(fps);
  const fpsTexto = rating === 'pausa' ? '--' : String(Math.round(fps));

  return (
    <output
      className="hud-rendimiento"
      data-rating={rating}
      aria-live="off"
      aria-label={`Rendimiento del valle: ${fpsTexto} FPS, tier ${tier}, nivel ${nivel}${fallback ? ', calidad clavada abajo' : ''}`}
    >
      <span className="hud-rendimiento__fps">{fpsTexto} FPS</span>
      <span className="hud-rendimiento__meta">
        {tier}·{nivel} · dpr {dpr}
        {fallback ? ' · fallback' : ''}
      </span>
    </output>
  );
}
