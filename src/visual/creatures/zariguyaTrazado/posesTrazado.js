/*
 * posesTrazado — FASE 2 del trazado: las POSES PLENAS del set Gemini como
 * capa de viñetas del MISMO SVG del trazado (`pielTrazado.js`).
 *
 * MISMO CAMINO que la FASE 1 aprobada (2026-08-26): cada pose es SU lámina
 * Gemini TAL CUAL — raster con su alfa de fábrica, cero vtracer (rechazado:
 * posterizaba la coronilla en "gorro" y engordaba bigotes), cero redibujo
 * (rechazado: RULINGS 2026-08-25, nunca regenerar una identidad aprobada) y
 * cero re-color. La lámina ES la piel; aquí solo se ENCUADRA.
 *
 * QUÉ ES CADA POSE (mapa del brief BRIEF-ZARIGUEYA-RIG-COMPORTAMIENTOS):
 *   escucha-02/03/04 → estado `listening` (ciclo "la oreja crece", el vaivén
 *                      aprobado de la hermana: 02→03→04→03, 760 ms/paso);
 *   escucha-01       → `listening` en avatar chico (< UMBRAL_CLOSEUP px): el
 *                      close-up de cabeza+mano que a 48 px lee mejor;
 *   ver-lupa         → `thinking` (investiga con la lupa);
 *   muerta           → vida `tanatosis` — la firma "se-hace-la-muerta"
 *                      (VIDA_REPERTORIO.zariguya.tanatosis, exclusiva de la
 *                      especie);
 *   cute             → estado `contenta` (celebra de frente);
 *   crias            → vida `crias` (forzada por el host en momentos
 *                      positivos — orden operador 2026-08-24: NO en la hero).
 *
 * ENCUADRE (la matemática de la hermana, heredada): cada lámina se dibuja
 * dentro de la caja 481×444 del calco hero con `preserveAspectRatio=
 * "xMidYMax meet"` — el equivalente SVG exacto del `object-fit: contain;
 * object-position: 50% 100%` de `.zgl-pose` (zariguyaGeminiLamina.css):
 * misma escala de figura, pies anclados a la línea de piso del hero.
 *
 * FUENTES por RUTA PÚBLICA (`/compai/laminas/…`), no data-URI: es el patrón
 * aprobado de las poses de la hermana (`ZariguyaGeminiLaminaViva`) y evita
 * clavarle ~1 MB de base64 al bundle (el calco hero SÍ va embebido: es la
 * piel base, presente en todo host). Honestidad de carga: el JSX
 * (`ZariguyaTrazado.jsx`) precarga cada PNG y solo activa `data-pose` cuando
 * llegó COMPLETO — un host que no sirva las láminas degrada limpio a la
 * FASE 1 (el rig hero con su CSS de estados), nunca a un hueco.
 *
 * REGLA DE ORO: módulo PLANO — solo datos/strings (cero react, cero three),
 * igual que pielTrazado.js. Los datos de pose (archivo, W/H, ciclo, umbral)
 * se REUSAN de `zariguyaGeminiLamina/anatomia.js` — una sola fuente.
 */

import {
  CARPETA_LAMINA, POSES, ESCUCHA_CICLO, ESCUCHA_PASO_MS, UMBRAL_CLOSEUP,
} from '../zariguyaGeminiLamina/anatomia.js';

/* Las poses YA INTEGRADAS al trazado. La lista crece UNA lámina a la vez,
   cada una con su gate GPU-headed + juez visión (spec 2026-08-26 FASE 2):
   una pose fuera de esta lista no se precarga ni se activa. */
export const POSES_TRAZADO_KEYS = Object.freeze([
  'escucha-01', 'escucha-02', 'escucha-03', 'escucha-04', // gate escucha
  'verlupa', // gate ver-lupa (thinking)
  'muerta', // gate se-hace-la-muerta (vida tanatosis, la firma de la especie)
]);

/** Ruta pública del PNG de una pose (la misma que consume la hermana). */
export const srcDePose = (k) => `${CARPETA_LAMINA}${POSES[k].archivo}`;

/* Re-export del compás de escucha aprobado (anatomia.js es la fuente). */
export { ESCUCHA_CICLO, ESCUCHA_PASO_MS, UMBRAL_CLOSEUP };

/* ── LA CAPA DE POSES del SVG ───────────────────────────────────────────────
   Viñetas apiladas sobre la caja del calco (0,0 481×444), todas opacity:0
   por CSS; `data-pose` en la raíz enciende UNA (crossfade .24s, ver
   zariguyaHuesos.css). Va FUERA de `.zh-pj` a propósito: el boil de
   `actuando` (feDisplacementMap) emborrona raster — la lección FASE 1. */
const IMAGEN_POSE = (k) =>
  `<image class="zt-pose zt-pose-${k}" href="${srcDePose(k)}" x="0" y="0" width="481" height="444" preserveAspectRatio="xMidYMax meet"/>`;

export const POSES_TRAZADO_CAPA = `<g class="zt-poses" aria-hidden="true">
  ${POSES_TRAZADO_KEYS.map(IMAGEN_POSE).join('\n  ')}
</g>`;

export default POSES_TRAZADO_CAPA;
