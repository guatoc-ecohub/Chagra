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
 *         biopreparados: [{ id, nombre, specificity?: { score, label, provenance } }],
 *         pest_controllers: [{ plaga, controladores: [str] }]
 *       }
 *     }
 *   }
 */

const GRAFO_RELATIONS_PATH = '/grafo-relations.json';

// Cache en memoria del mapa { species_id -> entry } ya parseado.
let relationsCache = null;
// Cache de la raíz completa del JSON (incluye _pest_synonyms / _pest_index).
let rootCache = null;
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
      rootCache = raw;
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

/** Normaliza un término para matching tolerante (minúsculas, sin tildes). */
function normalizePestTerm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
 * Filtra relaciones marcadas como disputed (campo disputed===true) para evitar
 * inyectar información disputada al prompt del LLM.
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
      // Filtrar relaciones disputed
      if (pc && pc.plaga && !pc.disputed && Array.isArray(pc.controladores) && pc.controladores.length) {
        lines.push(`- Plaga "${pc.plaga}" → controladores: ${pc.controladores.join(', ')}.`);
      }
    }
  }
  if (Array.isArray(rel.biopreparados) && rel.biopreparados.length) {
    const nombres = rel.biopreparados
      .map((b, index) => ({ biopreparado: b, index }))
      .filter(({ biopreparado }) => biopreparado && !biopreparado.disputed)
      .sort((a, b) => {
        const scoreA = getBiopreparadoSpecificityScore(a.biopreparado);
        const scoreB = getBiopreparadoSpecificityScore(b.biopreparado);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.index - b.index;
      })
      .map(({ biopreparado }) => formatBiopreparadoLabel(biopreparado))
      .filter(Boolean);
    if (nombres.length) lines.push(`- Biopreparados: ${nombres.join(', ')}.`);
  }

  // Sólo el encabezado → sin relaciones útiles → no-op.
  return lines.length > 1 ? lines.join('\n') : '';
}

function getBiopreparadoSpecificityScore(biopreparado) {
  if (!biopreparado || typeof biopreparado !== 'object') return 0;
  const raw = biopreparado.specificity?.score;
  const score = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(score) ? score : 0;
}

function formatBiopreparadoLabel(biopreparado) {
  if (!biopreparado || typeof biopreparado !== 'object') return '';
  const name = biopreparado.nombre || biopreparado.id || '';
  if (!name) return '';
  const label = biopreparado.specificity?.label;
  return label ? `${name} (${label})` : name;
}

// ---- SLICE plagas/enfermedades: resolución por sinónimo ------------------

/**
 * Resuelve un término coloquial/regional/científico de plaga o enfermedad a la
 * etiqueta canónica (`plaga`) que existe en el grafo. Permite que el campesino
 * que dice "gota", "monilia", "se me pudre la mata", "broca" o "phytophthora"
 * llegue a la plaga/enfermedad real del grafo y, de ahí, a sus controladores
 * biológicos.
 *
 * Matching tolerante: exacto normalizado (sin tildes/mayúsculas) y, si no hay
 * match exacto, por inclusión de palabra completa del término más corto. Es
 * GROUNDED: sólo devuelve etiquetas que existen como `plaga` en el grafo (el
 * mapa `_pest_synonyms` se valida en build contra `_pest_index`).
 *
 * @param {string} term término del usuario (ej. "gota", "monilia", "broca")
 * @returns {Promise<{ plaga: string, especiesAfectadas: string[] } | null>}
 */
export async function resolvePestSynonym(term) {
  if (!term) return null;
  await loadGrafoRelations();
  const root = rootCache;
  if (!root || typeof root !== 'object') return null;

  const synonyms = root._pest_synonyms || {};
  const pestIndex = root._pest_index || {};
  const q = normalizePestTerm(term);
  if (!q) return null;

  // 1) Match exacto del término contra el mapa de sinónimos (normalizado).
  for (const [syn, canonical] of Object.entries(synonyms)) {
    if (normalizePestTerm(syn) === q) {
      return { plaga: canonical, especiesAfectadas: pestIndex[canonical] || [] };
    }
  }
  // 2) Match exacto del término contra una etiqueta canónica del índice.
  for (const canonical of Object.keys(pestIndex)) {
    if (normalizePestTerm(canonical) === q) {
      return { plaga: canonical, especiesAfectadas: pestIndex[canonical] };
    }
  }
  // 3) Match por palabra completa (≥4 chars para evitar ruido como "de"/"la").
  if (q.length >= 4) {
    for (const [syn, canonical] of Object.entries(synonyms)) {
      const n = normalizePestTerm(syn);
      const re = new RegExp(`(^|\\s)${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
      if (re.test(n)) {
        return { plaga: canonical, especiesAfectadas: pestIndex[canonical] || [] };
      }
    }
  }
  return null;
}

/**
 * Índice plaga canónica → ids de especies que afecta (según el grafo offline).
 * Es la arista AFFECTS (plaga→cultivo) materializada offline.
 * @returns {Promise<Record<string, string[]>>}
 */
export async function getPestIndex() {
  await loadGrafoRelations();
  return (rootCache && rootCache._pest_index) || {};
}

/**
 * Mapa de sinónimos de plaga (término coloquial/regional/científico → etiqueta
 * canónica del grafo). Espeja `_pest_synonyms` del export offline. Permite
 * resolver una plaga MENCIONADA (por el usuario o citada en la respuesta) a su
 * etiqueta canónica y, de ahí, a su arista AFFECTS vía `getPestIndex`.
 * @returns {Promise<Record<string, string>>}
 */
export async function getPestSynonyms() {
  await loadGrafoRelations();
  return (rootCache && rootCache._pest_synonyms) || {};
}

// ---- SLICE conocimiento ampliado (2026-07-14) ---------------------------
//
// Seis nuevas secciones sourceadas (piso_termico, micorrizas, polinizacion,
// cambio_climatico, fitoquimica, alelopatia). Cada una vive como clave
// top-level con prefijo `_` (metadatos, igual que `_pest_index`). Los
// accesores devuelven `null` si la sección no existe (degradación limpia
// cuando se sirve un JSON viejo sin el enriquecimiento).

const KNOWLEDGE_TOPIC_KEYS = [
  '_piso_termico',
  '_micorrizas',
  '_polinizacion',
  '_cambio_climatico',
  '_fitoquimica',
  '_alelopatia',
];

/**
 * Lista de ids de tópicos de conocimiento ampliado disponibles en el grafo
 * offline. Útil para que la UI o el agente decidan qué bloques de grounding
 * inyectar.
 * @returns {Promise<string[]>}
 */
export async function getKnowledgeTopics() {
  await loadGrafoRelations();
  if (!rootCache) return [];
  return KNOWLEDGE_TOPIC_KEYS.filter((k) => rootCache[k]);
}

/**
 * Sección cruda de un tópico de conocimiento (`_piso_termico`, `_micorrizas`,
 * etc.). `null` si no existe o el cache no cargó.
 * @param {string} topic uno de los ids declarados en `KNOWLEDGE_TOPIC_KEYS`
 *   (con o sin `_` inicial — se normaliza).
 * @returns {Promise<object | null>}
 */
export async function getKnowledgeTopic(topic) {
  if (!topic) return null;
  await loadGrafoRelations();
  if (!rootCache) return null;
  const key = topic.startsWith('_') ? topic : `_${topic}`;
  if (!KNOWLEDGE_TOPIC_KEYS.includes(key)) return null;
  return rootCache[key] ?? null;
}

/**
 * Bloque de texto de grounding offline para un tópico de conocimiento. Si el
 * tópico no existe devuelve ''. El formato es compacto y separaSources (citas
 * DOI/autor/año) para que el LLM los cite.
 * @param {string} topic
 * @returns {Promise<string>}
 */
export async function buildKnowledgeTopicBlock(topic) {
  const data = await getKnowledgeTopic(topic);
  if (!data) return '';

  const header = topic.startsWith('_') ? topic.slice(1) : topic;
  const lines = [];
  lines.push(`CONOCIMIENTO DEL GRAFO (offline) — ${header}:`);

  if (typeof data.definicion === 'string' && data.definicion) {
    lines.push(`- Definición: ${data.definicion}`);
  }

  const fuentes = Array.isArray(data.fuentes) ? data.fuentes : [];
  if (fuentes.length) {
    const citas = fuentes.map((f) => f.cite).filter(Boolean);
    if (citas.length) lines.push(`- Fuentes: ${citas.join(' | ')}`);
  }

  // Piso térmico: enumerar pisos con especies
  if (Array.isArray(data.pisos)) {
    for (const piso of data.pisos) {
      const alt = piso.altitud_m;
      const t = piso.temperatura_media_c;
      const altStr = alt ? `${alt.min}-${alt.max} m` : '?';
      const tStr = t ? `${t.min}-${t.max} °C` : '?';
      const cultivos = Array.isArray(piso.cultivos_representativos)
        ? piso.cultivos_representativos
        : [];
      const nativas = Array.isArray(piso.especies_nativas_representativas)
        ? piso.especies_nativas_representativas
        : [];
      const todas = [...cultivos, ...nativas];
      const especiesStr = todas.length ? todas.join(', ') : 'sin especies del catálogo';
      lines.push(
        `- Piso ${piso.nombre} (${altStr}, ${tStr}): ${especiesStr}.`,
      );
      if (typeof piso.notas === 'string' && piso.notas) {
        lines.push(`  · ${piso.notas}`);
      }
    }
  }

  // Micorrizas / polinizadores / etc.: enumerar tipos o elementos
  if (Array.isArray(data.tipos)) {
    for (const tipo of data.tipos) {
      const hosp = Array.isArray(tipo.hospederos_en_grafo)
        ? tipo.hospederos_en_grafo
        : [];
      const hospStr = hosp.length ? hosp.join(', ') : 'sin huéspedes en catálogo';
      lines.push(`- ${tipo.nombre}: ${hospStr}.`);
      if (typeof tipo.caracteristicas === 'string' && tipo.caracteristicas) {
        lines.push(`  · ${tipo.caracteristicas}`);
      }
    }
  }

  if (Array.isArray(data.polinizadores)) {
    for (const pol of data.polinizadores) {
      const cultivos = Array.isArray(pol.cultivos_beneficiados_en_grafo)
        ? pol.cultivos_beneficiados_en_grafo
        : [];
      const cultStr = cultivos.length ? cultivos.join(', ') : 'sin cultivos en catálogo';
      lines.push(`- ${pol.nombre}: beneficia a ${cultStr}.`);
      if (typeof pol.servicio === 'string' && pol.servicio) {
        lines.push(`  · Servicio: ${pol.servicio}`);
      }
    }
  }

  if (Array.isArray(data.efectos)) {
    for (const ef of data.efectos) {
      lines.push(`- Efecto: ${ef.nombre}.`);
      if (typeof ef.descripcion === 'string' && ef.descripcion) {
        lines.push(`  · ${ef.descripcion}`);
      }
    }
  }

  if (Array.isArray(data.estrategias_resiliencia)) {
    for (const est of data.estrategias_resiliencia) {
      const nucleo = Array.isArray(est.especies_nucleo_en_grafo)
        ? est.especies_nucleo_en_grafo
        : [];
      const nucleoStr = nucleo.length ? nucleo.join(', ') : 'sin especies en catálogo';
      lines.push(`- Estrategia: ${est.nombre} (especies clave: ${nucleoStr}).`);
    }
  }

  if (Array.isArray(data.metabolitos)) {
    for (const met of data.metabolitos) {
      const ejemplos = Array.isArray(met.ejemplos_en_grafo) ? met.ejemplos_en_grafo : [];
      const ejStr = ejemplos
        .map((e) => (e && e.especie_id ? `${e.especie_id}→${e.compuesto || '?'}` : ''))
        .filter(Boolean)
        .join(', ');
      lines.push(`- ${met.nombre}: ${ejStr || 'sin ejemplos en catálogo'}.`);
    }
  }

  if (Array.isArray(data.ejemplos_en_grafo)) {
    for (const ej of data.ejemplos_en_grafo) {
      if (!ej || !ej.especie_id) continue;
      const comps = ej.compuesto_principal ? ` (${ej.compuesto_principal})` : '';
      lines.push(`- ${ej.especie_id}${comps}.`);
      if (typeof ej.uso_agroecologico === 'string' && ej.uso_agroecologico) {
        lines.push(`  · Uso: ${ej.uso_agroecologico}`);
      }
    }
  }

  return lines.length > 1 ? lines.join('\n') : '';
}

/**
 * Reinicia el cache en memoria (uso en tests).
 */
export function __resetGrafoRelationsCache() {
  relationsCache = null;
  rootCache = null;
  relationsLoadPromise = null;
}
