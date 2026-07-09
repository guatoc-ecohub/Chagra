const LOCATION_TYPE_LABEL = {
  barrio: 'Barrio',
  vereda: 'Vereda',
};

function cleanText(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function normalizeType(value) {
  const type = cleanText(String(value || '').toLowerCase());
  if (type === 'barrio' || type === 'urbano') return 'barrio';
  if (type === 'vereda' || type === 'rural') return 'vereda';
  return null;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Normaliza la ubicacion guardada en el perfil.
 *
 * Acepta el esquema viejo (vereda + municipio) y el nuevo unificado
 * (sublocalidad + tipo_sublocalidad + municipio + departamento).
 *
 * @param {object|null|undefined} profile
 * @returns {{
 *   tipo: 'barrio'|'vereda'|null,
 *   sublocalidad: string|null,
 *   municipio: string|null,
 *   departamento: string|null,
 *   altitud: number|null,
 *   label: string|null,
 *   labelWithContext: string|null,
 * }}
 */
export function summarizeProfileLocation(profile) {
  const p = profile && typeof profile === 'object' ? profile : {};
  const tipo =
    normalizeType(p.tipo_sublocalidad) ||
    normalizeType(p.tipo_ubicacion) ||
    normalizeType(p.location_type) ||
    (cleanText(p.barrio) ? 'barrio' : null) ||
    (cleanText(p.vereda) ? 'vereda' : null);
  const sublocalidad =
    cleanText(p.sublocalidad) ||
    (tipo === 'barrio' ? cleanText(p.barrio) : null) ||
    (tipo === 'vereda' ? cleanText(p.vereda) : null) ||
    cleanText(p.barrio) ||
    cleanText(p.vereda);
  const municipio = cleanText(p.municipio);
  const departamento = cleanText(p.departamento);
  const altitud = toNumber(p.finca_altitud ?? p.altitud);
  const label = sublocalidad && tipo ? `${LOCATION_TYPE_LABEL[tipo] || ''} ${sublocalidad}`.trim() : sublocalidad;
  const municipioLabel = municipio ? (departamento ? `${municipio}, ${departamento}` : municipio) : null;
  const labelWithContext = [label, municipioLabel, altitud != null ? `${altitud} msnm` : null]
    .filter(Boolean)
    .join(' · ');

  return {
    tipo,
    sublocalidad,
    municipio,
    departamento,
    altitud,
    label,
    labelWithContext,
  };
}

/**
 * Formatea una sublocalidad para mostrarse en chips, subtitulos y headers.
 *
 * @param {{
 *   tipo: 'barrio'|'vereda'|null,
 *   sublocalidad: string|null,
 *   municipio: string|null,
 *   departamento: string|null,
 *   altitud: number|null,
 * }} location
 * @returns {string|null}
 */
export function formatLocationLabel(location) {
  if (!location || typeof location !== 'object') return null;
  if (!location.sublocalidad) return null;
  const prefix = LOCATION_TYPE_LABEL[location.tipo] || '';
  return prefix ? `${prefix} ${location.sublocalidad}` : location.sublocalidad;
}

export function formatLocationContext(location) {
  if (!location || typeof location !== 'object') return null;
  const parts = [];
  const label = formatLocationLabel(location);
  if (label) parts.push(label);
  if (location.municipio) {
    parts.push(location.departamento ? `${location.municipio}, ${location.departamento}` : location.municipio);
  } else if (location.departamento) {
    parts.push(location.departamento);
  }
  if (location.altitud != null) parts.push(`${location.altitud} msnm`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function getLocationTypeLabel(tipo) {
  return LOCATION_TYPE_LABEL[tipo] || null;
}

