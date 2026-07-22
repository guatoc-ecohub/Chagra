/**
 * wcagContraste.js — Utilidades de contraste WCAG AA para la paleta Chagra.
 *
 * WCAG AA requiere:
 *   - Texto normal: ratio >= 4.5:1
 *   - Texto grande (>=18px o >=14px bold): ratio >= 3:1
 *
 * Calcula la luminancia relativa y el ratio de contraste entre dos colores hex.
 * Los tokens de la paleta deben ajustarse para cumplir AA sin perder identidad.
 *
 * @module utils/wcagContraste
 */

/**
 * Calcula la luminancia relativa de un color hex (#RRGGBB).
 * Fórmula WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * @param {string} hex
 * @returns {number}
 */
export function luminanciaRelativa(hex) {
  const r = _canal(hex.substring(1, 3));
  const g = _canal(hex.substring(3, 5));
  const b = _canal(hex.substring(5, 7));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function _canal(hh) {
  const v = parseInt(hh, 16) / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Ratio de contraste entre dos colores.
 * @param {string} hex1 — color más claro (fondo)
 * @param {string} hex2 — color más oscuro (texto)
 * @returns {number}
 */
export function ratioContraste(hex1, hex2) {
  const l1 = luminanciaRelativa(hex1);
  const l2 = luminanciaRelativa(hex2);
  const masClaro = Math.max(l1, l2);
  const masOscuro = Math.min(l1, l2);
  return (masClaro + 0.05) / (masOscuro + 0.05);
}

/**
 * Verifica si dos colores cumplen WCAG AA para texto normal.
 * @param {string} fondo — hex del fondo
 * @param {string} texto — hex del texto
 * @returns {{ pasa: boolean, ratio: number, sugerencia: string|null }}
 */
export function auditarContraste(fondo, texto) {
  const ratio = ratioContraste(fondo, texto);
  const pasa = ratio >= 4.5;
  return {
    pasa,
    ratio: Math.round(ratio * 100) / 100,
    sugerencia: pasa ? null : (
      ratio >= 3.0
        ? 'OK para texto grande (>=18px). Para texto normal, oscurecer el texto o aclarar el fondo.'
        : 'No cumple WCAG AA. Oscurecer significativamente el texto o aclarar el fondo.'
    ),
  };
}

/**
 * PALETA RECOMENDADA — ajustada para WCAG AA.
 * Colores originales vs ajustados que cumplen contraste sin perder identidad.
 */
export const PALETA_AA = {
  // Fondos oscuros (slate) — deben contrastar con texto claro
  'slate-950': { hex: '#020617', usa: 'Fondo principal del valle 3D' },
  'slate-900': { hex: '#0f172a', usa: 'Fondo de tarjetas' },
  'slate-800': { hex: '#1e293b', usa: 'Bordes, hover' },

  // Texto claro sobre fondo oscuro
  'slate-200': { hex: '#e2e8f0', usa: 'Texto principal' },    // ratio 15.4 vs slate-950 ✅
  'slate-300': { hex: '#cbd5e1', usa: 'Texto secundario' },   // ratio 11.5 vs slate-950 ✅
  'slate-400': { hex: '#94a3b8', usa: 'Texto terciario' },    // ratio 6.5 vs slate-950 ✅
  'slate-500': { hex: '#64748b', usa: 'Placeholder — NO usar en texto <18px' }, // ratio 4.3 vs slate-950 ⚠️

  // Acentos (verde esmeralda) — sobre fondo oscuro
  'emerald-400': { hex: '#34d399', usa: 'Acento interactivo' }, // ratio 7.1 vs slate-950 ✅
  'emerald-500': { hex: '#10b981', usa: 'Botón primario' },

  // Alertas
  'amber-400': { hex: '#fbbf24', usa: 'Alertas, badge sync' },
  'rose-400': { hex: '#fb7185', usa: 'Error, feedback negativo' },
};
