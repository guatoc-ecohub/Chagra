/*
 * rubberhoseSpec — LA LEY RUBBER-HOSE DE LA CASA, COMO DATOS.
 *
 * Fuente ÚNICA de los parámetros que hacen que un personaje "sea" rubber-hose
 * en Chagra (Cuphead + Miss Minutes de Loki, fusionado con la calidez campesina
 * andina). Antes vivían bifurcados: `_rubberhose.jsx` tenía SU tinta (#2a1a0c)
 * y `_faunaRubberTokens.js` OTRA (#241a10); había cuatro blancos sin jerarquía.
 * Misma criatura, tres personalidades — eso rompe la ilusión de que son alguien.
 *
 * Desde aquí beben TODOS: el kit de rasgos (`_rubberhose.jsx`), los tokens de
 * la fauna benéfica (`_faunaRubberTokens.js`), el line-boil (`LineBoilFilter`)
 * y cualquier personaje nuevo. La GUIA humana está en
 * `src/visual/GUIA-RUBBERHOSE.md` (qué es rubber-hose, qué es realista, cómo se
 * monta un personaje sin romper la consistencia).
 *
 * REGLA DE ORO: módulo PLANO, solo datos (cero react, cero three, cero
 * componentes) — importable desde el bundle base y desde cualquier token file
 * sin romper el Fast Refresh de Vite ni arrastrar chunks.
 */

/* ── TINTA Y BLANCOS CANÓNICOS ────────────────────────────────────────────────
   Una sola línea de tinta para TODA la familia: tierra-oscura cálida, jamás
   negro puro industrial. Los blancos tienen jerarquía fija: hueso (esclerótica),
   guante (mitones/pies), chispa (catchlight — SIEMPRE el más claro). */

/** La línea que manda: tinta cálida andina de todo contorno rubber-hose. */
export const RH_SPEC_TINTA = '#2a1a0c';
/** Pupila: un pelo más clara que la tinta (profundidad del ojo de goma). */
export const RH_SPEC_PUPILA = '#20130a';
/** Blanco hueso de la esclerótica (el blanco "de ojo"). */
export const RH_SPEC_HUESO = '#fffaf0';
/** Crema del guante/mitón/pie (la firma de Cuphead en las puntas). */
export const RH_SPEC_GUANTE = '#fff3d8';
/** Catchlight (la chispa de vida, arriba-izquierda de la pupila): el MÁS claro. */
export const RH_SPEC_CHISPA = '#fffdf7';
/** Chapeta coral (el rubor campesino de los cachetes). */
export const RH_SPEC_CHAPETA = '#f2907a';
/** Interior de boca (garganta) para los visemas abiertos: rojo cálido tenue. */
export const RH_SPEC_BOCA = '#8a3b34';
/** Lengüita de la boca abierta (V3). */
export const RH_SPEC_LENGUA = '#d1615a';

/* ── EASINGS CANÓNICOS (ficha DR animación rubber-hose §1) ────────────────────
   Los cubic-bezier de la casa, por FASE del movimiento. Un gesto nuevo se arma
   eligiendo de esta paleta — no inventando curvas por archivo. */
export const RH_EASE = Object.freeze({
  /** Wind-up: se echa atrás/agacha antes del gesto (150-200ms). */
  anticipacion: 'cubic-bezier(0.34, -0.2, 0.64, 1)',
  /** Impulso/caída: acelera sin frenar (200-300ms). */
  impulso: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Impacto/squash: desacelera al plantar (100-150ms). */
  impacto: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** EL overshoot rubber-hose: rebasa ~10% y asienta (300-400ms). El más usado. */
  overshoot: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** Señalar/inclinarse hacia un POI: rebase suave sostenible. */
  senala: 'cubic-bezier(0.5, 0, 0.25, 1.4)',
});

/* ── LINE-BOIL (contorno que vibra, años 30 — ficha §1) ───────────────────────
   feTurbulence (0.02–0.03) + feDisplacementMap (4–5), NUNCA fluido: escalonado
   a 8-12fps rotando 3 seeds. `LineBoilFilter.jsx` los consume; cualquier
   emulación CSS (jitter de transform) debe latir a este MISMO compás. */
export const RH_LINE_BOIL = Object.freeze({
  baseFrequency: 0.025,
  scale: 4.5,
  /** Ciclo del escalonado: 0.4s / 3 estados ≈ 10 fps (rango spec 8-12). */
  dur: '0.4s',
  seeds: Object.freeze([2, 11, 23]),
});

/* ── PERÍODOS CO-PRIMOS DEL IDLE (segundos) ───────────────────────────────────
   La vida idle NUNCA cae en el mismo compás: cada capa tiene un período que no
   divide a los demás (co-primos "a ojo de reloj"). Estos son los de la BASE
   (Angelita); cada especie re-tempoa por [data-creature] SIN cambiar la forma
   del keyframe (el carácter es tempo + amplitud, no otra gramática). */
export const RH_PERIODOS = Object.freeze({
  boil: 1.5,      // squash&stretch que respira (steps ~12fps)
  sway: 2.4,      // follow-through de miembros/antenas
  blink: 5.6,     // parpadeo irregular (suelto + doble golpe)
  travieso: 6.3,  // micro-antics (saltito, wiggle)
  mirada: 7.9,    // pupilas de reojo + double-take
  antic: 9.7,     // la vuelta de campana Miss-Minutes
  rubor: 12.7,    // chapetas que se encienden
});

/* ── LIP-SYNC ─────────────────────────────────────────────────────────────────
   Los 4 visemas por RMS y su debounce viven en `lipSyncCore.js` (fuente única
   ya establecida); se re-exportan aquí para que la spec sea el índice completo
   de la ley. La boca canónica es `BocaVisema` (`_rubberhose.jsx`). */
export { VISEMA, UMBRAL_RMS, DEBOUNCE_MS } from './lipSyncCore.js';

/* ── LOS DOS REGISTROS DE CHAGRA ──────────────────────────────────────────────
   En Chagra conviven dos registros y NO se mezclan:
   - RUBBER-HOSE (caricatura con alma): los PERSONAJES — quien tiene nombre,
     carácter y gestos. Ojos de goma, tinta gruesa que respira, squash&stretch.
   - REALISTA: la fauna secundaria del monte, los animales de finca, los
     cultivos y los mundos 3D. Sin ojos de goma, sin line-boil, sin chapetas.
   Un dibujo con ojos-catchlight y contorno de tinta EN un mundo realista (o un
   personaje sin su cadencia rh-*) es un bug de registro. La lista canónica de
   personajes es CREATURES (`index.js`); esta lista da el registro por slug. */
export const RH_REGISTRO = Object.freeze({
  personajes: Object.freeze([
    'abeja-angelita', 'colibri', 'oso-andino', 'rana-andina', 'perezoso',
    'ardilla', 'jaguar', 'morrocoy', 'borugo',       // los 9 bichos
    'ent-frailejon',                                  // el árbol-maestro
    'lombriz', 'mariposa', 'escarabajo',              // aliados de escena
    'mariquita', 'abejorro',                          // fauna benéfica (kit frh)
    'espiritu-guardian',                              // el espíritu del monte
  ]),
  /** Todo lo demás (fauna funcional 3D, corrales, flora, dioramas) es realista. */
});

/** ¿Este slug es un personaje rubber-hose? (lo demás se dibuja realista) */
export function esRubberhose(slug) {
  return RH_REGISTRO.personajes.includes(slug);
}
