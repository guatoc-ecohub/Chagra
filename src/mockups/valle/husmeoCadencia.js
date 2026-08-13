/**
 * husmeoCadencia — reconcilia el SPEC (46s) con el feedback en vivo del
 * operador (13s: "40s se sentía MUERTA") en UNA curva, en vez de quedarse
 * con un número fijo que traiciona al otro (ítem #58 del GAP compAI,
 * 2026-08-13 — "reconciliar 46s (SPEC) vs 13s (código)").
 *
 * La idea: el husmeo autónomo de la abeja en el valle 3D (Valle3D.jsx)
 * arranca RÁPIDO — el ritmo que el operador pidió porque el original se
 * sentía muerta — mientras el usuario recién llega y probablemente sigue
 * mirando. Si pasan varias VUELTAS COMPLETAS por todos los lugares
 * (`HUSMEO_LUGARES`) sin que el usuario haya navegado de verdad ni una vez
 * (ver `entrandoRef`/`focoId` en Valle3D.jsx), el husmeo se ASIENTA hacia el
 * ritmo más calmado del SPEC — una presencia de fondo, no un tic. No es un
 * promedio ni una elección entre los dos números: es el MISMO comportamiento
 * en dos momentos distintos de la visita, ambos números conservados.
 *
 * Módulo aparte (no vive inline en Valle3D.jsx) para que la curva sea
 * testeable sin montar three.js/R3F.
 *
 * @module mockups/valle/husmeoCadencia
 */

/** Arranque — "viva" (feedback operador: 40s se sentía MUERTA). */
export const HUSMEO_CADA_MS_VIVO = 13000;
/** Asentado — el número original del SPEC de comportamiento. */
export const HUSMEO_CADA_MS_SPEC = 46000;
/** Vueltas completas de husmeo (sin interacción real) hasta llegar al SPEC. */
export const HUSMEO_VUELTAS_HASTA_SPEC = 3;

/**
 * La cadencia base para el próximo husmeo, según cuántas vueltas completas
 * lleva sin que el usuario haya interactuado. Sube LINEAL de VIVO a SPEC en
 * `HUSMEO_VUELTAS_HASTA_SPEC` vueltas y se queda ahí — nunca más lenta que
 * el SPEC, nunca más rápida que el arranque vivo.
 *
 * @param {number} vueltasSinInteraccion — enteros ≥0; valores no finitos o
 *   negativos se tratan como 0 (arranque).
 * @returns {number} cadencia en milisegundos, entre HUSMEO_CADA_MS_VIVO y
 *   HUSMEO_CADA_MS_SPEC.
 */
export function husmeoCadenciaMs(vueltasSinInteraccion) {
  const v = Number.isFinite(vueltasSinInteraccion) ? Math.max(0, vueltasSinInteraccion) : 0;
  const t = Math.min(v, HUSMEO_VUELTAS_HASTA_SPEC) / HUSMEO_VUELTAS_HASTA_SPEC;
  return Math.round(HUSMEO_CADA_MS_VIVO + (HUSMEO_CADA_MS_SPEC - HUSMEO_CADA_MS_VIVO) * t);
}

/**
 * Cuántas vueltas COMPLETAS lleva dadas un índice acumulado de husmeos
 * (`husmeoIdx` en Valle3D.jsx) sobre un ciclo de `totalLugares`.
 * @param {number} husmeoIdx — cuántos husmeos autónomos ya sonaron.
 * @param {number} totalLugares — largo de HUSMEO_LUGARES (≥1).
 * @returns {number}
 */
export function vueltasCompletas(husmeoIdx, totalLugares) {
  const total = Number.isFinite(totalLugares) && totalLugares > 0 ? totalLugares : 1;
  const idx = Number.isFinite(husmeoIdx) ? Math.max(0, husmeoIdx) : 0;
  return Math.floor(idx / total);
}

export default husmeoCadenciaMs;
