/**
 * buildDraftFromSeeding — helper puro que mapea un payload de SeedingLog a un
 * FarmProcessDraft. Idempotente, tolerante a error de catálogo.
 *
 * Usado en auto-ciclo: SeedingLog.handleSave llama este helper después de
 * guardar el seeding, para crear un FarmProcess enlazado automáticamente.
 * Si falla, el seeding NO falla.
 */
import { getAllSpecies } from '../db/catalogDB';
import { FARM_CONFIG } from '../config/defaults';

/**
 * Crea un draft de FarmProcess desde un payload de log--seeding.
 *
 * @param {Object|null} payload — payload de SeedingLog
 * @param {Object} [opts]
 * @param {string|null} [opts.speciesSlug] - id canónico del catálogo elegido en
 *   el selector de especies (SpeciesCombobox). Si viene, se usa DIRECTO como
 *   subject_slug sin depender del parseo del nombre (bug operador 2026-06-25:
 *   "Fresa - Invernadero #1" no resolvía). Si es null/desconocido, cae a la
 *   resolución por nombre común (retrocompatible).
 * @returns {Promise<Object|null>} FarmProcessDraft o null si no es seeding
 */
export async function buildDraftFromSeeding(payload, opts = {}) {
  if (!payload || !payload.data || payload.data.type !== 'log--seeding') return null;

  const attrs = payload.data.attributes || {};
  const name = attrs.name || '';
  const explicitSlug = opts && typeof opts.speciesSlug === 'string' ? opts.speciesSlug.trim() : '';

  const cropName = parseCropName(name);
  const quantity = extractQuantity(payload);
  const suggestedDate = parseTimestamp(attrs.timestamp);

  let speciesSlug = '';
  let subjectKind = 'individual';
  let unit = 'plantas';

  try {
    const catalog = await getAllSpecies();
    // Prioridad 1: id explícito del selector (camino grounded, sin ambigüedad).
    const byId = explicitSlug
      ? (Array.isArray(catalog) ? catalog.find((s) => s?.id === explicitSlug) : null)
      : null;
    const match = byId || findSpeciesInCatalog(cropName, catalog);
    if (match) {
      speciesSlug = match.id;
      subjectKind = match.tracking_mode || 'individual';
    } else if (explicitSlug) {
      // El id vino del selector pero el catálogo no lo tiene cargado (offline /
      // subset): respetamos el slug igual, mejor que perderlo.
      speciesSlug = explicitSlug;
    }
  } catch {
    // catálogo caído — no romper. Si hubo id explícito, conservarlo.
    if (explicitSlug) speciesSlug = explicitSlug;
  }

  if (subjectKind === 'aggregate') {
    unit = 'semillas';
  }

  return {
    process_type: 'sowing',
    subject_slug: speciesSlug,
    subject_label: cropName,
    quantity,
    unit,
    subject_kind: subjectKind,
    location_land_asset_id: FARM_CONFIG.LOCATION_ID || '',
    suggested_date: suggestedDate,
    companions: [],
    antagonists: [],
    biopreparados: [],
    invasive: false,
    warnings: [],
  };
}

/**
 * Extrae el nombre del cultivo del atributo name del seeding.
 * Formato típico: "Siembra de {cultivo} - {variedad}"
 * Retorna el cultivo limpio, ej: "Siembra de café castillo - variedad" → "café castillo"
 */
function parseCropName(name) {
  if (!name) return '';
  let cleaned = name.trim();
  cleaned = cleaned.replace(/^Siembra de\s+/i, '');
  cleaned = cleaned.replace(/\s*[-–—]\s*(N\/A|Variedad|variedad).*$/i, '');
  return cleaned.trim().toLowerCase();
}

/**
 * Encuentra una especie en el catálogo por nombre común.
 */
function findSpeciesInCatalog(cropName, catalog) {
  if (!cropName || !Array.isArray(catalog)) return null;
  const q = cropName.toLowerCase();
  return (
    catalog.find((s) => (s.nombre_comun || '').toLowerCase() === q) ||
    catalog.find((s) => (s.nombre_comun || '').toLowerCase().startsWith(q.split(' ')[0]) && q.length >= 3) ||
    null
  );
}

/**
 * Extrae quantity numérico del relationships.quantity.
 */
function extractQuantity(payload) {
  try {
    const qtyData = payload.data?.relationships?.quantity?.data;
    if (Array.isArray(qtyData) && qtyData.length > 0) {
      const val = qtyData[0].attributes?.value?.decimal;
      const n = Number(val);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
    }
  } catch { /* noop */ }
  return 1;
}

/**
 * Convierte timestamp ISO a unix ms.
 */
function parseTimestamp(ts) {
  if (!ts) return Date.now();
  const d = new Date(ts);
  return Number.isFinite(d.getTime()) ? d.getTime() : Date.now();
}
