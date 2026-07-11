/*
 * mundo3dData — el REGISTRO data-driven del framework de mundos-3D (DR §4.2).
 *
 * Una entrada por mundo. TODO lo específico de un mundo es DATOS, no código:
 *   · `valle`   → el landmark en la capa lejana (lo que hoy hace valleData).
 *   · `escena`  → el ARQUETIPO de escena-mundo ('cutaway'|'flujo'|…|null).
 *   · `params`  → props del arquetipo (low-poly, deterministas).
 *   · `hotspots`→ 3-5 puntos tocables; cada uno RE-RUTEA a una vista 2D REAL
 *                 (regla de oro: el 3D nunca reimplementa la pantalla).
 *   · `entrada` → coreografía de la abeja + narración (voz nombra el tema 1º).
 *   · `fallback2d` → qué lámina SVG usa el tier 2D (o `ruta2d` directa al 2D).
 *
 * SUMAR UN MUNDO SÍ-3D = una entrada aquí (+ opcional una lámina espejo). NO se
 * escribe R3F salvo que aparezca una metáfora espacial genuinamente nueva.
 *
 * El título/emoji/tinte NO se duplican: se resuelven del manifiesto real
 * (mundosFinca.js) vía `metaMundo(id)`, igual que valleData hoy.
 */

import { MUNDO_BY_ID } from '../../components/dashboard/mundosFinca';

/* ── El registro. Solo `suelo` trae escena 3D en esta pasada (el prototipo);
      el resto queda declarado para que el próximo mundo sea "solo datos". ── */
export const MUNDO_3D = {
  // 🌱 EL SUELO VIVO — prototipo `cutaway`: lo invisible hecho visible.
  suelo: {
    // ── capa lejana: el landmark en el valle ──
    valle: { tipo: 'era', pos: [-1.1, 0, 3.6], escala: 1 },

    // ── capa cercana: la escena-mundo al entrar ──
    escena: 'cutaway',
    params: {
      // Franjas horizontales del corte de tierra (de arriba hacia abajo).
      capas: [
        { nombre: 'hojarasca', color: '#6b4a2e', alto: 0.55, bichos: ['lombriz'] },
        { nombre: 'suelo negro', color: '#3a2a1a', alto: 1.25, bichos: ['lombriz', 'raiz', 'hifa'] },
        { nombre: 'subsuelo', color: '#8a6a44', alto: 1.05, bichos: ['raiz'] },
      ],
      // El motor existente decide cuánta vida se ve (0..1): reusa mundoSubsueloEngine.
      vidaFrom: 'mundoSubsueloEngine',
    },

    // ── hotspots: cada `view` es un case REAL de App.jsx (reachability) ──
    hotspots: [
      { id: 'juego', pos: [0, 1.55, 1.25], emoji: '🪱', label: 'Despierte su suelo', view: 'subsuelo' },
      { id: 'cuaderno', pos: [1.55, 1.15, 1.1], emoji: '📓', label: 'Cuaderno del suelo', view: 'salud_suelo' },
      { id: 'crom', pos: [-1.55, 1.15, 1.1], emoji: '🎯', label: 'Cromatografía', view: 'cromatografia' },
    ],

    // ── entrada de la abeja + narración (la voz nombra el tema primero) ──
    entrada: { zoom: 6.5, narra: 'suelo' },

    // ── degradación: la lámina SVG espejo del tier 2D ──
    fallback2d: 'lamina-cutaway',
  },

  // ── Declarados para el framework (aún sin escena 3D construida): así el
  //    próximo mundo SÍ-3D nace como "una entrada de datos". Hoy caen al 2D. ──
  agua: {
    valle: { tipo: 'quebrada', pos: [0.6, 0, -1.4], escala: 1 },
    escena: null, // 'flujo' cuando se construya EscenaFlujo
    ruta2d: { view: 'agua' },
  },
  animales: {
    valle: { tipo: 'corral', pos: [-4.6, 0, -1.8], escala: 1 },
    escena: null, // 'recinto' cuando se construya EscenaRecinto
    ruta2d: { view: 'animales' },
    gate: 'animales',
  },
  disenio: {
    valle: { tipo: 'bosque', pos: [4.8, 0, -2.6], escala: 1.1 },
    escena: null, // 'estratos' cuando se construya EscenaEstratos
    ruta2d: { view: 'disenio' },
  },

  // ── HÍBRIDO / NO-3D: sin escena propia → landmark en el valle + directo al 2D ──
  cultivos: { valle: { tipo: 'milpa', pos: [-3.2, 0, 1.6], escala: 1.15 }, escena: null, ruta2d: { view: 'mundo_cultivos' } },
  cafe: { valle: { tipo: 'cafetal', pos: [3.4, 0, 2.2], escala: 1 }, escena: null, ruta2d: { view: 'cafe' } },
  clima: { valle: { tipo: 'veleta', pos: [-3.8, 0, -4.8], escala: 1 }, escena: null, ruta2d: { view: 'hoy_finca' }, ambiental: true },
};

/**
 * Resuelve título/emoji/lema/tinte de un mundo desde el manifiesto REAL
 * (mundosFinca.js). No los duplica: si el manifiesto cambia, esto lo sigue.
 *
 * @param {string} mundoId
 * @returns {{ id:string, titulo:string, emoji:string, lema:string, tinte:string[] }}
 */
export function metaMundo(mundoId) {
  /** @type {{ titulo?: string, emoji?: string, lema?: string, tinte?: string[] }} */
  const real = MUNDO_BY_ID[mundoId] || {};
  return {
    id: mundoId,
    titulo: real.titulo || mundoId,
    emoji: real.emoji || '📍',
    lema: real.lema || '',
    tinte: real.tinte || ['#3f8f4e', '#dcedc9'],
  };
}

/** ¿El mundo tiene una escena-mundo 3D construida (no solo un landmark)? */
export function tieneEscena3d(mundoId) {
  const d = MUNDO_3D[mundoId];
  return !!(d && d.escena);
}
