/**
 * regionalismsService — Overlay lingüístico regional para respuestas LLM.
 *
 * @module regionalismsService
 */

import regionalismsData from '../data/regionalisms-co.json' with { type: 'json' };

export function getRegionFromDepartment(deptSlug) {
  if (!deptSlug) return null;
  for (const [region, data] of Object.entries(regionalismsData.regiones)) {
    if (data.departamentos?.includes(deptSlug)) return region;
  }
  return null;
}

export function applyRegionalismOverlay(text, region, intensity) {
  if (!text || intensity === 0 || !region) return text;
  const data = regionalismsData.regiones[region] || regionalismsData.default_neutro;
  if (!data) return text;

  const pickRandom = (arr) => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '');

  if (intensity === 1) {
    const closer = pickRandom(data.cierres);
    return closer ? `${text.trimEnd()}\n\n${closer}` : text;
  }
  if (intensity === 2) {
    const greeting = pickRandom(data.saludos);
    const closer = pickRandom(data.cierres);
    return `${greeting}\n\n${text.trim()}\n\n${closer}`;
  }
  return text;
}

export function listAvailableRegions() {
  return Object.entries(regionalismsData.regiones).map(([slug, data]) => ({
    slug,
    label: data.label,
    departamentos: data.departamentos || [],
    nota_apropiacion: /** @type {any} */ (data).nota_apropiacion || null,
  }));
}
