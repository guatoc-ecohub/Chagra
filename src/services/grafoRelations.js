/**
 * grafoRelations.js — loader OFFLINE de las relaciones del grafo de conocimiento.
 *
 * El catálogo estático (`catalog.sqlite`) describe CADA especie por separado,
 * pero NO sus aristas relacionales: qué controla la plaga que la ataca, con qué
 * especies es compatible/antagonista, qué biopreparados usa, ni sus nombres
 * comunes regionales. Ese conocimiento vive en el grafo de conocimiento del
 * backend y, hasta ahora, el cliente SIN red no lo veía ("invisible offline").
 *
 * Este módulo carga `/grafo-relations.json` —un export compacto del grafo,
 * precacheado por el Service Worker en RAG_GROUNDING_CACHE— y expone accesores
 * para que el agente/grounding offline responda relaciones sin red.
 *
 * Contrato de degradación: si el JSON no se puede cargar (no cacheado y sin
 * red, o build sin el archivo), los accesores devuelven valores vacíos
 * (`null`/`[]`), nunca lanzan. El caller decide cómo comunicar la ausencia.
 *
 * El archivo lo genera build/ops vía chagra-pro/scripts/export-grafo-offline.mjs
 * a partir del grafo AGE; este repo público sólo consume el JSON resultante
 * (sin infraestructura ni secretos).
 *
 * Forma del JSON:
 *   {
 *     "_meta": { schema_version, generated_at, species_count, ... },
 *     "species": {
 *       "<species_id>": {
 *         nombre_comun, nombre_cientifico,
 *         nombres_comunes: [str],
 *         establishment_means, threat_status, conservation_status,
 *         compatible_with: [species_id],
 *         antagonist_of: [species_id],
 *         biopreparados: [{ id, nombre }],
 *         pest_controllers: [{ plaga, controladores: [str] }]
 *       }
 *     }
 *   }
 */

const GRAFO_RELATIONS_PATH = '/grafo-relations.json';

// Cache en memoria del mapa { species_id -> entry } ya parseado.
let relationsCache = null;
// Coalesce de cargas concurrentes (mismo patrón que loadEmbeddings en ragRetriever).
let relationsLoadPromise = null;

/**
 * Carga y cachea el mapa de relaciones. Devuelve `null` (no lanza) si falla.
 * @returns {Promise<Record<string, object> | null>}
 */
export async function loadGrafoRelations() {
  if (relationsCache) return relationsCache;
  if (relationsLoadPromise) return relationsLoadPromise;

  relationsLoadPromise = (async () => {
    try {
      const res = await fetch(GRAFO_RELATIONS_PATH);
      if (!res || !res.ok) return null;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) return null;
      const raw = await res.json();
      const species = raw && typeof raw === 'object' ? raw.species : null;
      if (!species || typeof species !== 'object') return null;
      relationsCache = species;
      return species;
    } catch (err) {
      console.warn('[grafoRelations] no se pudieron cargar relaciones:', err?.message);
      return null;
    } finally {
      // permitir reintento si la carga devolvió null (p. ej. offline sin caché)
      if (!relationsCache) relationsLoadPromise = null;
    }
  })();

  return relationsLoadPromise;
}

/**
 * Relaciones de una especie por su id (slug). `null` si no hay datos.
 * @param {string} speciesId
 * @returns {Promise<object | null>}
 */
export async function getRelationsForSpecies(speciesId) {
  if (!speciesId) return null;
  const species = await loadGrafoRelations();
  if (!species) return null;
  return species[speciesId] ?? null;
}

// ---- SLICE funcional: las relaciones más usadas -------------------------

/**
 * Controladores biológicos de las plagas que afectan a la especie.
 * @param {string} speciesId
 * @returns {Promise<Array<{ plaga: string, controladores: string[] }>>}
 */
export async function getPestControllers(speciesId) {
  const rel = await getRelationsForSpecies(speciesId);
  return rel?.pest_controllers ?? [];
}

/**
 * Especies compatibles (asociaciones benéficas) con la especie dada.
 * @param {string} speciesId
 * @returns {Promise<string[]>} ids de especies compatibles
 */
export async function getCompatibleWith(speciesId) {
  const rel = await getRelationsForSpecies(speciesId);
  return rel?.compatible_with ?? [];
}

/**
 * Especies antagonistas (asociaciones a evitar) de la especie dada.
 * @param {string} speciesId
 * @returns {Promise<string[]>} ids de especies antagonistas
 */
export async function getAntagonistOf(speciesId) {
  const rel = await getRelationsForSpecies(speciesId);
  return rel?.antagonist_of ?? [];
}

/**
 * Nombres comunes / vernáculos regionales de la especie.
 * @param {string} speciesId
 * @returns {Promise<string[]>}
 */
export async function getNombresComunesRegionales(speciesId) {
  const rel = await getRelationsForSpecies(speciesId);
  return rel?.nombres_comunes ?? [];
}

/**
 * Construye un bloque de texto de GROUNDING offline con las relaciones del grafo
 * para una especie. Espeja el formato del `subgrafoBloque` que online produce el
 * sidecar (`get_subgrafo_relacional`), para inyectarse en el system prompt del
 * agente cuando NO hay red. Devuelve '' si no hay datos (no-op en el prompt).
 *
 * @param {string} speciesId
 * @returns {Promise<string>}
 */
export async function buildOfflineGroundingBlock(speciesId) {
  const rel = await getRelationsForSpecies(speciesId);
  if (!rel) return '';

  const nombre = rel.nombre_comun || speciesId;
  const lines = [];
  lines.push(`RELACIONES DEL GRAFO (offline) — ${nombre}:`);

  if (Array.isArray(rel.nombres_comunes) && rel.nombres_comunes.length) {
    lines.push(`- Nombres regionales: ${rel.nombres_comunes.join(', ')}.`);
  }
  if (Array.isArray(rel.compatible_with) && rel.compatible_with.length) {
    lines.push(`- Compatible con (asociar): ${rel.compatible_with.join(', ')}.`);
  }
  if (Array.isArray(rel.antagonist_of) && rel.antagonist_of.length) {
    lines.push(`- Antagonista de (NO asociar): ${rel.antagonist_of.join(', ')}.`);
  }
  if (Array.isArray(rel.pest_controllers) && rel.pest_controllers.length) {
    for (const pc of rel.pest_controllers) {
      if (pc && pc.plaga && Array.isArray(pc.controladores) && pc.controladores.length) {
        lines.push(`- Plaga "${pc.plaga}" → controladores: ${pc.controladores.join(', ')}.`);
      }
    }
  }
  if (Array.isArray(rel.biopreparados) && rel.biopreparados.length) {
    const nombres = rel.biopreparados.map((b) => b.nombre || b.id).filter(Boolean);
    if (nombres.length) lines.push(`- Biopreparados: ${nombres.join(', ')}.`);
  }

  // Sólo el encabezado → sin relaciones útiles → no-op.
  return lines.length > 1 ? lines.join('\n') : '';
}

/**
 * Reinicia el cache en memoria (uso en tests).
 */
export function __resetGrafoRelationsCache() {
  relationsCache = null;
  relationsLoadPromise = null;
}
