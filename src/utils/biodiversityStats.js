/**
 * biodiversityStats.js — cómputo puro de estadísticas para BiodiversidadView.
 *
 * Bug operator 2026-05-18: "37 Especies / 0 Estratos / 0 Gremios". El cálculo
 * previo solo parseaba `attributes.notes` (formato `"Estrato: X | Gremio: Y"`),
 * que únicamente queda inline cuando el operario abre el form rich de
 * AssetsDashboard con `estrato`/`gremio` definidos. Plants creadas por:
 *   - VoiceCapture (registro por voz)
 *   - Sync desde FarmOS (notes libre o vacías)
 *   - Selección directa de especie sin tocar estrato/gremio
 * NO tenían el inline → estratos/gremios contaban 0 aunque las 37 especies
 * estuvieran cubriendo 4 estratos y 5 gremios distintos en el catálogo.
 *
 * Fix: resolver estrato + gremio por lookup contra el catálogo SQLite
 * (`speciesIndex`) usando el nombre de la planta normalizado. Si el match
 * existe, leer los campos curados por agrónomo del catálogo. Solo si no
 * matchea (entrada libre), caer al parser de notes legacy como red de
 * seguridad.
 *
 * Función pura → testeable sin DOM. Recibe el índice ya construido para
 * desacoplar del componente y de la inicialización async del SQLite.
 */

const STRATA_KEYS = ['emergente', 'alto', 'medio', 'bajo'];

// Delimitador histórico de formatNotes() en AssetsDashboard:
//   "Notas usuario | Estrato: Medio (2-10m) | Gremio: Productivo principal"
const FIELD_RE = (key) => new RegExp(`${key}:\\s*([^|]+?)\\s*(?:\\||$)`, 'i');

/**
 * Normaliza un string para matching: lowercase + sin tildes + trim.
 * Quita además sufijos del tipo "#001" usados en siembras bulk-individual,
 * porque el catálogo nunca los lleva ("Gulupa #003" → "gulupa").
 */
export const normalizeForMatch = (s) => {
  if (!s || typeof s !== 'string') return '';
  return s
    .replace(/\s+#\d+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
};

/**
 * Construye un índice O(1) `nombreNormalizado → species` a partir del array
 * de species del catálogo SQLite (formato `getAllSpecies()` →
 * `[{ id, nombre_comun, nombre_cientifico, estrato, gremio, ... }]`).
 *
 * Indexa por:
 *   - id (slug exacto)
 *   - nombre_comun normalizado
 *   - "nombre_comun (nombre_cientifico)" normalizado — formato display que
 *     SpeciesSelect deja en attributes.name al elegir desde el fuzzy search.
 *   - nombre_cientifico normalizado
 *
 * Múltiples plants pueden share el mismo display name, pero el índice resuelve
 * uno a uno gracias a estas variantes redundantes.
 */
export const buildSpeciesIndex = (allSpecies) => {
  const index = new Map();
  if (!Array.isArray(allSpecies)) return index;
  for (const sp of allSpecies) {
    if (!sp || typeof sp !== 'object') continue;
    const add = (key) => {
      const norm = normalizeForMatch(key);
      if (norm && !index.has(norm)) index.set(norm, sp);
    };
    if (sp.id) add(sp.id);
    if (sp.nombre_comun) add(sp.nombre_comun);
    if (sp.nombre_cientifico) add(sp.nombre_cientifico);
    if (sp.nombre_comun && sp.nombre_cientifico) {
      add(`${sp.nombre_comun} (${sp.nombre_cientifico})`);
    }
  }
  return index;
};

/**
 * Resuelve la especie del catálogo asociada a una planta, intentando varias
 * llaves. Retorna `null` si la planta es entrada libre (no matchea).
 */
const lookupSpecies = (plant, speciesIndex) => {
  if (!speciesIndex || speciesIndex.size === 0) return null;
  const attrs = plant?.attributes || {};
  // 1. Slug explícito (VoiceCapture y futuros campos): el más confiable.
  const slug = plant?._speciesSlug || attrs._speciesSlug;
  if (slug) {
    const bySlug = speciesIndex.get(normalizeForMatch(slug));
    if (bySlug) return bySlug;
  }
  // 2. Match por display name (camino estándar de SpeciesSelect / VoiceCapture).
  const name = attrs.name || plant?.name || '';
  const norm = normalizeForMatch(name);
  if (!norm) return null;
  const direct = speciesIndex.get(norm);
  if (direct) return direct;
  // 3. Match por prefijo: el operador escribió "gulupa" pero el catálogo
  // lo tiene como "gulupa (passiflora edulis f. edulis)". Intentamos al
  // revés también ("gulupa madura" → "gulupa").
  for (const [key, sp] of speciesIndex) {
    if (key.startsWith(norm) || norm.startsWith(key)) return sp;
  }
  return null;
};

/**
 * Extrae estrato + gremio de una planta usando, en orden:
 *   1. Catálogo SQLite (vía lookup por nombre/slug).
 *   2. Notes inline (`"Estrato: X | Gremio: Y"`) — legacy AssetsDashboard.
 *
 * Devuelve `{ estrato, gremio }` con strings normalizados (lowercase) o
 * `null` por campo si no se pudo resolver.
 */
export const resolvePlantTraits = (plant, speciesIndex) => {
  const sp = lookupSpecies(plant, speciesIndex);
  let estrato = sp?.estrato ? String(sp.estrato).toLowerCase() : null;
  let gremio = sp?.gremio ? String(sp.gremio).toLowerCase() : null;

  if (estrato && gremio) return { estrato, gremio };

  // Fallback notes parsing — solo si falta algún campo. Mantiene el
  // comportamiento histórico para plants que SÍ tienen el inline (rich form
  // con estrato/gremio override manual).
  const attrs = plant?.attributes || {};
  const notesValue =
    (typeof attrs.notes === 'object' ? attrs.notes?.value : attrs.notes) || '';
  if (typeof notesValue === 'string' && notesValue.length > 0) {
    if (!estrato) {
      const raw = notesValue.match(FIELD_RE('Estrato'))?.[1]?.trim().toLowerCase();
      if (raw) estrato = raw;
    }
    if (!gremio) {
      const raw = notesValue.match(FIELD_RE('Gremio'))?.[1]?.trim().toLowerCase();
      if (raw) gremio = raw;
    }
  }

  return { estrato, gremio };
};

/**
 * Cómputo principal de stats para BiodiversidadView.
 *
 * @param {Array} plants — `useAssetStore.plants`
 * @param {Map}   speciesIndex — output de `buildSpeciesIndex(allSpecies)`
 * @returns {{ speciesCount:number, strataCount:number, guildsCount:number,
 *            byStratum: Record<string, number> }}
 */
export const computeBiodiversityStats = (plants, speciesIndex) => {
  const species = new Set();
  const strata = new Set();
  const guilds = new Set();
  const byStratum = Object.fromEntries(STRATA_KEYS.map((k) => [k, 0]));

  if (!Array.isArray(plants)) {
    return { speciesCount: 0, strataCount: 0, guildsCount: 0, byStratum };
  }

  for (const p of plants) {
    const attrs = p?.attributes || {};
    const rawName = (attrs.name || p?.name || '').trim();
    if (rawName) {
      // Bulk-individual deja "Gulupa #003" — agrupar al nombre base.
      species.add(normalizeForMatch(rawName) || rawName.toLowerCase());
    }

    const { estrato, gremio } = resolvePlantTraits(p, speciesIndex);
    if (estrato) {
      strata.add(estrato);
      const key = STRATA_KEYS.find(
        (k) => estrato === k || estrato.startsWith(k) || estrato.includes(` ${k} `)
      );
      if (key) byStratum[key] += 1;
    }
    if (gremio) guilds.add(gremio);
  }

  return {
    speciesCount: species.size,
    strataCount: strata.size,
    guildsCount: guilds.size,
    byStratum,
  };
};

export const __STRATA_KEYS__ = STRATA_KEYS;
