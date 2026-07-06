/**
 * affectsGate.js — AFFECTS-GATE: corta la contaminación cruzada de cultivo en el
 * sello "Catálogo verificado" del agente.
 *
 * BUG CONFIRMADO (auditoría real): en una conversación de CACAO el agente mostró
 * la BROCA (Hypothenemus hampei, plaga de CAFÉ) con el sello "Dato verificado".
 * El dato existe en el catálogo, sí — pero VERIFICADO ≠ RELEVANTE: la broca solo
 * afecta a Coffea. El grafo lo dice explícito con la arista AFFECTS (plaga→cultivo,
 * ~1.301 aristas). Este gate comprueba esa arista entre el organismo que la
 * evidencia surfacea y el cultivo EN FOCO. Si NO existe la relación (cross-crop),
 * el turno NO se marca como "Catálogo verificado": el sello se degrada (grounded
 * → false) y se marca explícito como "de otro cultivo".
 *
 * NO es grounding nuevo. La relación AFFECTS YA viaja en los datos:
 *   - online:  la evidencia de `get_pest_controllers` trae
 *              `result.matches[].{pest_id|plaga, target_species[].id}` — donde
 *              `target_species` son justamente los cultivos que la plaga afecta.
 *   - offline: el índice `_pest_index` del grafo (grafoRelations.getPestIndex)
 *              mapea plaga canónica → ids de especie afectadas; `_pest_synonyms`
 *              resuelve el término mencionado a esa etiqueta canónica.
 * Esto es SOLO el wiring de la comprobación.
 *
 * Diseño conservador (fail-safe, cero regresión):
 *   - Solo decide si hay un cultivo EN FOCO (id canónico resuelto).
 *   - Solo mira organismos con arista AFFECTS CONOCIDA (si no la conocemos, no
 *     opina — el sello se queda como estaba).
 *   - Cross-crop SOLO si NINGÚN organismo surfaced afecta el cultivo en foco y
 *     al menos uno apunta a otro cultivo. Basta con que uno afecte el foco para
 *     considerar el sello legítimo para el turno.
 */

/** Normaliza para matching tolerante (minúsculas, sin tildes, espacios colapsados). */
function _norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function _escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrae la arista AFFECTS (plaga → cultivos afectados) de la evidencia ONLINE
 * de `get_pest_controllers`. Soporta tool_chain (array de evidencias). Ignora
 * cualquier otra tool (no toca su evidencia). Devuelve `[]` si no hay señal.
 *
 * @param {object|Array<object>|null|undefined} toolEvidence
 * @returns {Array<{ pest: string, affects: string[] }>}
 */
export function extractAffectsFromEvidence(toolEvidence) {
  const out = [];
  const visit = (ev) => {
    if (!ev) return;
    if (Array.isArray(ev)) { ev.forEach(visit); return; }
    if (typeof ev !== 'object' || ev.tool !== 'get_pest_controllers') return;
    const result = ev.result;
    const matches = result && Array.isArray(result.matches) ? result.matches : [];
    for (const m of matches) {
      if (!m || typeof m !== 'object') continue;
      const pest = m.pest_id || m.plaga || m.pest || null;
      const targets = Array.isArray(m.target_species) ? m.target_species : [];
      const affects = targets
        .map((t) => (t && typeof t === 'object' ? (t.id || t.species_id) : t))
        .filter((x) => typeof x === 'string' && x.trim().length > 0)
        .map(String);
      if (typeof pest === 'string' && pest.trim() && affects.length > 0) {
        out.push({ pest: String(pest), affects });
      }
    }
  };
  visit(toolEvidence);
  return out;
}

/**
 * Resuelve un término de plaga (mencionado por el usuario, citado en la
 * respuesta, o el canonical_id/mentioned de una entidad resuelta) a su etiqueta
 * canónica y su arista AFFECTS, usando los mapas del grafo offline inyectados.
 *
 * @param {string} term
 * @param {{ pestIndex?: Record<string,string[]>, pestSynonyms?: Record<string,string> }} maps
 * @returns {{ pest: string, affects: string[] } | null}
 */
export function resolvePestAffects(term, { pestIndex = {}, pestSynonyms = {} } = {}) {
  const q = _norm(term);
  if (!q) return null;
  // 1) término = sinónimo → canónica
  for (const [syn, canonical] of Object.entries(pestSynonyms)) {
    if (_norm(syn) === q) {
      const affects = Array.isArray(pestIndex[canonical]) ? pestIndex[canonical].slice() : [];
      return { pest: canonical, affects };
    }
  }
  // 2) término = etiqueta canónica directa
  for (const canonical of Object.keys(pestIndex)) {
    if (_norm(canonical) === q) {
      return { pest: canonical, affects: (pestIndex[canonical] || []).slice() };
    }
  }
  return null;
}

/**
 * Escanea un texto (la respuesta del agente) buscando MENCIONES de plagas del
 * grafo (por sinónimo o etiqueta canónica, palabra completa) y devuelve su
 * arista AFFECTS. Conservador: solo términos de ≥4 caracteres, para no cazar
 * ruido. Dedup por etiqueta canónica.
 *
 * @param {string} text
 * @param {{ pestIndex?: Record<string,string[]>, pestSynonyms?: Record<string,string> }} maps
 * @returns {Array<{ pest: string, affects: string[] }>}
 */
export function scanTextForPestAffects(text, { pestIndex = {}, pestSynonyms = {} } = {}) {
  const hay = _norm(text);
  if (!hay) return [];
  const found = new Map(); // canonical -> affects[]
  const consider = (label, canonical) => {
    const n = _norm(label);
    if (n.length < 4) return;
    if (found.has(canonical)) return;
    const re = new RegExp(`(^|[^a-z0-9])${_escapeRe(n)}([^a-z0-9]|$)`);
    if (re.test(hay)) {
      found.set(canonical, Array.isArray(pestIndex[canonical]) ? pestIndex[canonical].slice() : []);
    }
  };
  for (const [syn, canonical] of Object.entries(pestSynonyms)) consider(syn, canonical);
  for (const canonical of Object.keys(pestIndex)) consider(canonical, canonical);
  return Array.from(found.entries()).map(([pest, affects]) => ({ pest, affects }));
}

/**
 * Decisión pura del gate: ¿la evidencia del turno es contaminación cruzada de
 * cultivo respecto al cultivo en foco?
 *
 * @param {{ cropInFocusIds?: string[], pestAffectsList?: Array<{pest:string, affects:string[]}> }} p
 * @returns {{ crossCrop: boolean, offending: Array<{pest:string, affects:string[]}>, relevant: Array<{pest:string, affects:string[]}> }}
 */
export function detectCrossCropContamination({ cropInFocusIds = [], pestAffectsList = [] } = {}) {
  const focus = new Set((cropInFocusIds || []).map(_norm).filter(Boolean));
  if (focus.size === 0) return { crossCrop: false, offending: [], relevant: [] };

  const offending = [];
  const relevant = [];
  const seen = new Set();
  for (const pa of pestAffectsList || []) {
    if (!pa || typeof pa.pest !== 'string' || !pa.pest.trim()) continue;
    const key = _norm(pa.pest);
    if (seen.has(key)) continue;
    seen.add(key);
    const affects = (Array.isArray(pa.affects) ? pa.affects : []).map(_norm).filter(Boolean);
    if (affects.length === 0) continue; // arista desconocida → el gate no opina (fail-safe)
    if (affects.some((a) => focus.has(a))) relevant.push(pa);
    else offending.push(pa);
  }

  const crossCrop = relevant.length === 0 && offending.length > 0;
  return { crossCrop, offending, relevant };
}

/**
 * Suppress-and-replace del SELLO (no del cuerpo del LLM): si el turno resultó
 * cross-crop, degradamos la metadata de fuente para que el ChatBubble NO pinte
 * el verde "Catálogo verificado" y en su lugar marque explícito "de otro
 * cultivo". Puro e idempotente (no muta la entrada). Si no es cross-crop,
 * devuelve una copia intacta.
 *
 * @param {object} metadata — metadata de fuente ya computada (computeSourceMetadata).
 * @param {{crossCrop:boolean, offending:Array<{pest:string}>}} gateResult
 * @param {{ cropInFocusIds?: string[] }} [ctx]
 * @returns {object} nueva metadata.
 */
export function gateSourceMetadataByAffects(metadata, gateResult, { cropInFocusIds = [] } = {}) {
  const md = { ...(metadata && typeof metadata === 'object' ? metadata : {}) };
  if (!gateResult || gateResult.crossCrop !== true) return md;
  md.grounded = false;
  md.cross_crop = true;
  md.cross_crop_organisms = (gateResult.offending || [])
    .map((o) => o && o.pest)
    .filter((p) => typeof p === 'string' && p.trim().length > 0);
  md.cross_crop_focus = (cropInFocusIds || []).slice();
  return md;
}

export default {
  extractAffectsFromEvidence,
  resolvePestAffects,
  scanTextForPestAffects,
  detectCrossCropContamination,
  gateSourceMetadataByAffects,
};
