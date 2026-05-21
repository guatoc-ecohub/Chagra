/**
 * caseStudyTreatmentRecommender.js — sugerencias biopreparados (DR-044 F4)
 * ================================================================
 * Dado un pest_name + species_id (opcional), devuelve top-3 biopreparados
 * del catálogo Chagra como sugerencias ranqueadas.
 *
 * Pipeline KISS:
 *   1. Keyword matcher (offline-first, deterministic, instantáneo).
 *   2. Opcional: `recommendTreatmentsWithRag(...)` enriquece el resultado
 *      con passages del corpus `public/cycle-content/*.json` vía BM25
 *      (`ragRetriever.retrieve`). Esto da al caller (LLM o UI) contexto
 *      agronómico verificable para reducir alucinación — lección del
 *      incidente 2026-05-19 con tomates donde el LLM inventaba dosis.
 *
 * MVP usa solo keyword matcher porque cubre 80% de casos en agroecología
 * tradicional y NO depende de network/GPU. Operador puede confiar que
 * SIEMPRE responde rápido.
 *
 * Catalog refs (post Track C 2026-05-17): catalog.biopreparados[] tiene
 * 19 entries: bocashi, biol, purin_ortiga, caldo_sulfocalcico,
 * caldo_bordeles, te_compost, humus_liquido, lixiviado_frutas, supermagro,
 * trichoderma_harzianum_suelo, bacillus_subtilis_foliar, cal_dolomita,
 * roca_fosforica, ceniza_madera, compost_maduro, biofertilizante_algas,
 * bacillus_thuringiensis, trichogramma_spp, extracto_neem.
 */

import { retrieve } from './ragRetriever';

/**
 * Delimitador del bloque de contexto RAG en prompts. Idéntico al patrón
 * usado en otros consumidores (ver AgentScreen.jsx) para que un LLM
 * downstream lo reconozca consistentemente.
 *
 * REGLA: el bloque dice explícitamente "NO viene del usuario, NO citarla
 * como si el usuario te lo hubiera contado" para evitar alucinaciones por
 * confusión de fuente — lección incidente 2026-05-19.
 */
export const RAG_CONTEXT_HEADER = '=== INFORMACIÓN AGRONÓMICA DE REFERENCIA ===';
export const RAG_CONTEXT_FOOTER = '=== FIN INFORMACIÓN AGRONÓMICA DE REFERENCIA ===';

/**
 * Mapping pest keyword → biopreparados recomendados.
 * KISS: pattern matching simple, no embeddings. Fácil de auditar
 * por agrónomo piloto. Cada entry: { match: regex|substring, recs: [...] }.
 *
 * Post-DR-040 (pest catalog first-class), esta tabla se reemplaza por
 * lookup directo a catalog.pests_diseases[X].biopreparados_curativos[].
 */
const PEST_RULES = [
  // Lepidoptera larvae (trozador, cogollero, polilla, palomilla)
  {
    keywords: ['troza', 'agrotis', 'gusano cortador', 'cortador', 'cogollero', 'spodoptera', 'polilla', 'tuta', 'palomilla', 'plutella', 'noctuid'],
    recs: [
      { id: 'bacillus_thuringiensis', rationale: 'Bioinsecticida específico Lepidoptera. BTk comercial registrado ICA. Curativo eficaz tras ingesta.', priority: 'high' },
      { id: 'trichogramma_spp', rationale: 'Parasitoide preventivo de huevos Lepidoptera. Sinergia con BT.', priority: 'medium' },
      { id: 'extracto_neem', rationale: 'Antialimentario azadiractina + repelente. Compatible con BT.', priority: 'medium' },
    ],
  },
  // Hongos foliares (mildiu, oidio, antracnosis, tizón, roya)
  {
    keywords: ['mildiu', 'oidio', 'oídio', 'antracnosis', 'tizon', 'tizón', 'roya', 'phytophthora', 'colletotrichum', 'cercospora', 'puccinia', 'hongo', 'fungal', 'moho gris', 'botrytis'],
    recs: [
      { id: 'caldo_bordeles', rationale: 'Sulfato cobre + cal. Curativo clásico contra mildiu, tizón. Aplicación preventiva foliar.', priority: 'high' },
      { id: 'caldo_sulfocalcico', rationale: 'Azufre + cal. Eficaz contra oídio y ácaros. Compatible orgánico.', priority: 'high' },
      { id: 'bacillus_subtilis_foliar', rationale: 'Antagonista microbiano de hongos foliares. Aplicación preventiva.', priority: 'medium' },
    ],
  },
  // Bacterianos / podredumbres
  {
    keywords: ['bacteriana', 'erwinia', 'pseudomonas', 'pudrición blanda', 'podredumbre', 'pudrición'],
    recs: [
      { id: 'caldo_bordeles', rationale: 'Cobre tiene efecto bacteriostático moderado.', priority: 'medium' },
      { id: 'bacillus_subtilis_foliar', rationale: 'Competencia microbiana contra bacterianos foliares.', priority: 'medium' },
    ],
  },
  // Áfidos / pulgones / chupadores
  {
    keywords: ['áfido', 'afido', 'pulgon', 'pulgón', 'aphis', 'myzus', 'mosca blanca', 'bemisia', 'trialeurodes', 'chupador', 'cochinilla'],
    recs: [
      { id: 'purin_ortiga', rationale: 'Repelente + fortalecedor. Aspersión foliar 2x/semana.', priority: 'high' },
      { id: 'extracto_neem', rationale: 'Inhibe alimentación y reproducción. Aplicar al atardecer.', priority: 'high' },
      { id: 'biol', rationale: 'Fortalecedor vegetal — sistema inmune planta.', priority: 'medium' },
    ],
  },
  // Ácaros
  {
    keywords: ['ácaro', 'acaro', 'tetranychus', 'arañita roja', 'arañita'],
    recs: [
      { id: 'caldo_sulfocalcico', rationale: 'Azufre clásico acaricida. Eficaz contra Tetranychus.', priority: 'high' },
      { id: 'extracto_neem', rationale: 'Antialimentario para ácaros adultos y ninfas.', priority: 'medium' },
    ],
  },
  // Suelo / radicular
  {
    keywords: ['raíz', 'raiz', 'radicular', 'damping off', 'volcamiento', 'nemátodo', 'nematodo', 'meloidogyne', 'fusarium', 'rhizoctonia'],
    recs: [
      { id: 'trichoderma_harzianum_suelo', rationale: 'Antagonista clásico de patógenos de suelo Fusarium, Rhizoctonia, Pythium.', priority: 'high' },
      { id: 'bocashi', rationale: 'Estructura microbiana saludable suelo. Preventivo.', priority: 'medium' },
      { id: 'compost_maduro', rationale: 'Aporta vida microbiana competitiva.', priority: 'medium' },
    ],
  },
  // Deficiencia nutricional
  {
    keywords: ['deficiencia', 'amarillamiento general', 'clorosis', 'hambre', 'desnutri', 'pálida', 'palida'],
    recs: [
      { id: 'biol', rationale: 'Aporte foliar de N + microelementos. Reactivar crecimiento.', priority: 'high' },
      { id: 'humus_liquido', rationale: 'Foliar/drench. Estimulante hormonal + nutrientes.', priority: 'medium' },
      { id: 'compost_maduro', rationale: 'Aporte base suelo a mediano plazo.', priority: 'medium' },
    ],
  },
];

/**
 * Recomienda biopreparados para un problema dado.
 *
 * @param {string} pestName - free text "trozador", "antracnosis", "áfidos verdes"
 * @param {Object} [_opts] - reservado para post-DR-040 (species_id lookup contra catalog.species[].enfermedades_criticas)
 * @returns {Array<{id, rationale, priority, match_keywords}>} top recommendations ordered
 */
export function recommendTreatments(pestName, _opts = {}) {
  if (!pestName || typeof pestName !== 'string') return [];
  const needle = pestName.toLowerCase().trim();
  if (needle.length < 3) return [];

  const hits = [];
  for (const rule of PEST_RULES) {
    const matched = rule.keywords.filter((kw) => needle.includes(kw.toLowerCase()));
    if (matched.length === 0) continue;
    for (const rec of rule.recs) {
      hits.push({
        ...rec,
        match_keywords: matched,
      });
    }
  }

  // Dedup por id (si varias rules emiten el mismo biopreparado, conserva
  // el de mayor priority).
  const dedup = new Map();
  const prioWeight = { high: 3, medium: 2, low: 1 };
  for (const h of hits) {
    const prev = dedup.get(h.id);
    if (!prev || prioWeight[h.priority] > prioWeight[prev.priority]) {
      dedup.set(h.id, h);
    }
  }

  return Array.from(dedup.values())
    .sort((a, b) => prioWeight[b.priority] - prioWeight[a.priority])
    .slice(0, 5);
}

/**
 * Sugiere biopreparados disponibles para todo el catálogo (cuando el
 * operador busca tratamientos sin pest específico). Ordena alfabético.
 */
export function listAllBiopreparados() {
  return [
    'bacillus_thuringiensis', 'trichogramma_spp', 'extracto_neem',
    'caldo_bordeles', 'caldo_sulfocalcico', 'bacillus_subtilis_foliar',
    'trichoderma_harzianum_suelo',
    'bocashi', 'biol', 'purin_ortiga', 'te_compost', 'humus_liquido',
    'lixiviado_frutas', 'supermagro', 'compost_maduro', 'biofertilizante_algas',
    'cal_dolomita', 'roca_fosforica', 'ceniza_madera',
  ];
}

/**
 * Construye el bloque de contexto RAG con passages BM25 del corpus
 * `public/cycle-content/*.json`. Devuelve string vacío si no hay passages.
 *
 * El caller (UI o LLM downstream) puede:
 *   - mostrar los passages al operador como evidencia agronómica, o
 *   - prependerlos a un prompt LLM para grounding offline-first.
 *
 * @param {Array<{key:string, text:string, species:string, score:number}>} passages
 * @returns {string}
 */
export function buildRagContextBlock(passages) {
  if (!Array.isArray(passages) || passages.length === 0) return '';
  const lines = [RAG_CONTEXT_HEADER];
  lines.push('(NO viene del usuario, NO citarla como si el usuario te lo hubiera contado)');
  passages.forEach((p, i) => {
    const slug = p?.species || 'unknown';
    const text = typeof p?.text === 'string' ? p.text.trim() : '';
    if (!text) return;
    lines.push(`[${i + 1}] (${slug}) ${text}`);
  });
  lines.push(RAG_CONTEXT_FOOTER);
  return lines.join('\n');
}

/**
 * Variante asíncrona enriquecida con RAG. Combina el keyword matcher
 * determinista con un retrieval BM25 contra el corpus para devolver
 * passages relevantes como contexto adicional.
 *
 * Diseño:
 *   - Llama primero `recommendTreatments(pestName)` (sincrónico, offline,
 *     siempre rápido). Si no hay match, igual intenta RAG para tener un
 *     mínimo de contexto antes de pasar al LLM downstream.
 *   - Hace `retrieve(query, topK)` donde `query = pestName + " " +
 *     species_names`. species_names es opcional (puede venir vacío).
 *   - Si `retrieve` falla o devuelve vacío, degrada al comportamiento
 *     anterior sin contexto (`ragContext: '', ragPassages: []`). Nunca
 *     lanza.
 *
 * @param {string} pestName - texto libre del problema
 * @param {Object} [opts]
 * @param {string[]} [opts.speciesNames] - nombres comunes de especies
 *   afectadas (ej. ['tomate cherry', 'lechuga']). Se concatenan al query.
 * @param {number} [opts.topK=5] - número de passages a recuperar.
 * @returns {Promise<{
 *   recommendations: Array,
 *   ragPassages: Array,
 *   ragContext: string,
 * }>}
 */
export async function recommendTreatmentsWithRag(pestName, opts = {}) {
  const recommendations = recommendTreatments(pestName, opts);

  const speciesNames = Array.isArray(opts.speciesNames) ? opts.speciesNames : [];
  const topK = Number.isInteger(opts.topK) && opts.topK > 0 ? opts.topK : 5;

  // Query: problema + nombres de especies. Si pestName es vacío, igual
  // intentamos con species_names — útil para sugerencias preventivas.
  const queryParts = [];
  if (typeof pestName === 'string' && pestName.trim().length > 0) {
    queryParts.push(pestName.trim());
  }
  speciesNames.forEach((n) => {
    if (typeof n === 'string' && n.trim().length > 0) queryParts.push(n.trim());
  });
  const query = queryParts.join(' ').trim();

  if (!query) {
    return { recommendations, ragPassages: [], ragContext: '' };
  }

  let passages = [];
  try {
    const hits = await retrieve(query, topK);
    if (Array.isArray(hits)) passages = hits;
  } catch (err) {
    // Graceful degradation: corpus vacío, fetch falla, etc.
    console.warn('[caseStudyTreatmentRecommender] retrieve failed, sin contexto RAG:', err?.message || err);
    passages = [];
  }

  const ragContext = buildRagContextBlock(passages);
  return { recommendations, ragPassages: passages, ragContext };
}

export const __TEST__ = { PEST_RULES, buildRagContextBlock, RAG_CONTEXT_HEADER };
export default recommendTreatments;
