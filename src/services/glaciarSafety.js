/**
 * glaciarSafety.js — lógica PURA y testeable del estado de seguridad de un
 * punto glaciar a partir de un reporte de campo.
 *
 * Reglas PROVISIONALES (refinables con investigación glaciológica):
 *   🔴 PELIGRO   — hielo podrido (derretido) O agua de deshielo O grietas
 *                  abiertas O puente de nieve O séracs O riesgo de avalancha.
 *   🟡 PRECAUCIÓN — firn/nieve blando (dureza ≤ 2) con algún peligro, O
 *                  cualquier peligro presente que no sea de la lista crítica.
 *   🟢 ESTABLE   — hielo compacto/duro (dureza ≥ 3) sin peligros observados.
 *
 * La función es pura: mismo reporte → mismo estado. Sin efectos secundarios,
 * sin red, sin fecha/hora. Apta para tests deterministas y para correr
 * offline en campo.
 *
 * @module services/glaciarSafety
 */

import { ESTADOS_SEGURIDAD } from '../data/glaciar-schema.js';

/** Peligros que, por sí solos, fuerzan estado 🔴 peligro. */
export const PELIGROS_CRITICOS = Object.freeze([
  'grietas_abiertas',
  'puente_nieve',
  'seracs',
  'agua_deshielo',
  'riesgo_avalancha',
]);

/** Tipos de superficie que, por sí solos, fuerzan estado 🔴 peligro. */
export const SUPERFICIES_CRITICAS = Object.freeze(['hielo_podrido']);

/** Dureza por debajo o igual a este umbral se considera "blanda". */
export const DUREZA_BLANDA_MAX = 2;

/**
 * Evalúa el estado de seguridad de un punto glaciar.
 *
 * @param {Object} reporte
 * @param {string} [reporte.tipoSuperficie] - key de TIPOS_SUPERFICIE.
 * @param {number} [reporte.dureza] - 1..5 (escala de penetración).
 * @param {string[]} [reporte.peligros] - keys de PELIGROS.
 * @param {string} [reporte.aguaDeshielo] - compat: si viene 'agua_deshielo'
 *   suelto, también cuenta (defensivo). Normalmente va dentro de `peligros`.
 * @returns {{nivel: 'estable'|'precaucion'|'peligro', emoji: string,
 *   label: string, desc: string, color: string, razones: string[]}}
 */
export function evaluarSeguridadGlaciar(reporte = {}) {
  const peligros = Array.isArray(reporte.peligros) ? reporte.peligros : [];
  const tipoSuperficie = reporte.tipoSuperficie || null;
  const durezaNum = Number(reporte.dureza);
  const dureza = Number.isFinite(durezaNum) ? durezaNum : null;

  const razones = [];

  // ── 🔴 PELIGRO: superficie crítica ──
  if (tipoSuperficie && SUPERFICIES_CRITICAS.includes(tipoSuperficie)) {
    razones.push('Hielo podrido (derretido)');
  }

  // ── 🔴 PELIGRO: peligros críticos ──
  const criticosPresentes = peligros.filter((p) => PELIGROS_CRITICOS.includes(p));
  for (const p of criticosPresentes) razones.push(peligroLabel(p));

  if (razones.length > 0) {
    return { ...ESTADOS_SEGURIDAD.peligro, razones };
  }

  // A partir de acá NO hay peligros críticos ni superficie crítica.
  const otrosPeligros = peligros.filter((p) => !PELIGROS_CRITICOS.includes(p));
  const esBlando = dureza != null && dureza <= DUREZA_BLANDA_MAX;

  // ── 🟡 PRECAUCIÓN: firn blando + algún peligro, o cualquier peligro ──
  if (otrosPeligros.length > 0) {
    const motivos = otrosPeligros.map(peligroLabel);
    if (esBlando) motivos.unshift('Superficie blanda (firn/nieve)');
    return { ...ESTADOS_SEGURIDAD.precaucion, razones: motivos };
  }

  // Sin peligros pero superficie blanda → precaución suave.
  if (esBlando) {
    return {
      ...ESTADOS_SEGURIDAD.precaucion,
      razones: ['Superficie blanda (firn/nieve), sin peligros visibles'],
    };
  }

  // ── 🟢 ESTABLE: hielo compacto/duro (≥3) sin peligros ──
  if (dureza != null && dureza >= 3) {
    return {
      ...ESTADOS_SEGURIDAD.estable,
      razones: ['Hielo compacto y duro, sin peligros observados'],
    };
  }

  // Sin dureza registrada y sin peligros: precaución por falta de datos
  // (no podemos afirmar que es estable sin medir el hielo).
  return {
    ...ESTADOS_SEGURIDAD.precaucion,
    razones: ['Falta medir la dureza del hielo para confirmar el estado'],
  };
}

const PELIGRO_LABELS = {
  grietas_cerradas: 'Grietas cerradas',
  grietas_abiertas: 'Grietas abiertas',
  puente_nieve: 'Puente de nieve',
  seracs: 'Séracs',
  agua_deshielo: 'Agua de deshielo',
  riesgo_avalancha: 'Riesgo de avalancha',
  penitentes: 'Penitentes',
};

function peligroLabel(key) {
  return PELIGRO_LABELS[key] || key.replace(/_/g, ' ');
}
