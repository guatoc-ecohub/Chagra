/**
 * milpaData — datos curados para el subjuego "La Milpa" (las tres hermanas).
 *
 * GANCHO PEDAGÓGICO: la milpa colombiana asocia maíz + fríjol + ahuyama
 * (calabaza). Cada hermana ayuda a las otras con una relación REAL del grafo
 * agroecológico de Chagra (ASOCIA_CON / COMPATIBLE_WITH):
 *   - El fríjol fija nitrógeno (rizobios) y alimenta al maíz.
 *   - El maíz da soporte: el fríjol trepa por su caña.
 *   - La ahuyama cubre el suelo: sombra, menos arvenses, retiene humedad.
 *
 * Cifras grounded en src/data/asociaciones-comparativa.json (milpa real):
 * LER aprox. 2 (1.08–2.89), N fijado 12–60 %, arvenses −24..55 %, plaga −23 %.
 * Fuentes: DR-ASOCIACIONES-CULTIVO-COLOMBIA-2026-06-18; DOI 10.1093/aob/mcu191;
 * DOI 10.3389/fagro.2023.1115490.
 *
 * Todo offline: cero red en runtime. Sin nombres propios de personas.
 */

import { HERMANAS } from '../../services/milpaGameEngine';

/**
 * Las tres hermanas con su rol agroecológico real para la UI.
 * @typedef {Object} Hermana
 * @property {string} id        Una de HERMANAS.
 * @property {string} nombre    Nombre campesino colombiano.
 * @property {string} emoji
 * @property {string} color     Clase Tailwind del acento (estética Chagra).
 * @property {string} rol       Su aporte a la milpa (1 línea, para niños).
 * @property {string} ayuda     A quién ayuda y cómo (relación real).
 */

/** @type {Hermana[]} */
export const TRES_HERMANAS = [
  {
    id: HERMANAS.MAIZ,
    nombre: 'Maíz',
    emoji: '🌽',
    color: 'amber',
    rol: 'Crece alto y firme como una torre.',
    ayuda: 'Le presta su caña al fríjol para que trepe.',
  },
  {
    id: HERMANAS.FRIJOL,
    nombre: 'Fríjol',
    emoji: '🫘',
    color: 'emerald',
    rol: 'Trepa por el maíz y atrapa el aire.',
    ayuda: 'Fija nitrógeno en el suelo y alimenta al maíz.',
  },
  {
    id: HERMANAS.AHUYAMA,
    nombre: 'Ahuyama',
    emoji: '🎃',
    color: 'orange',
    rol: 'Sus hojas grandes tapan todo el suelo.',
    ayuda: 'Da sombra, guarda humedad y frena la maleza.',
  },
];

/** Mapa rápido id → hermana (para pintar parcelas). */
export const HERMANA_POR_ID = Object.freeze(
  TRES_HERMANAS.reduce((acc, h) => {
    acc[h.id] = h;
    return acc;
  }, {}),
);

/**
 * Las tres relaciones que el juego enseña, con la cifra real que las respalda.
 * Se muestran como "lecciones" cuando el jugador completa una milpa.
 */
export const RELACIONES = Object.freeze([
  {
    id: 'fija-nitrogeno',
    titulo: 'El fríjol alimenta al maíz',
    detalle: 'El fríjol fija nitrógeno del aire en el suelo: hasta 60 % del que necesita el maíz.',
    emoji: '💧',
  },
  {
    id: 'soporte',
    titulo: 'El maíz sostiene al fríjol',
    detalle: 'El fríjol trepa por la caña del maíz y no necesita estacas.',
    emoji: '🌽',
  },
  {
    id: 'cobertura',
    titulo: 'La ahuyama cuida el suelo',
    detalle: 'Sus hojas tapan el suelo y bajan la maleza entre 24 % y 55 %.',
    emoji: '🎃',
  },
]);

/**
 * Cifras de cierre, tomadas tal cual de la milpa real para el panel comparativo.
 * Nunca inventadas: si cambian las fuentes, se actualiza este objeto.
 */
export const CIFRAS_MILPA = Object.freeze({
  ler: { aprox: 2, min: 1.08, max: 2.89 },
  nFijadoPct: { min: 12, max: 60 },
  arvensesReduccionPct: { min: 24, max: 55 },
  plagaReduccionPct: 23,
  fuente: 'DR-ASOCIACIONES-CULTIVO-COLOMBIA-2026-06-18; DOI 10.1093/aob/mcu191; DOI 10.3389/fagro.2023.1115490',
});

/** Cuántas parcelas tiene el tablero (mobile-first: cabe en una pantalla). */
export const NUM_PARCELAS = 4;
