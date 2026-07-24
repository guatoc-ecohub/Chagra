/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * aiService.js — Inferencia de visión via Ollama / Gemma 4 (Fase 20.2b).
 *
 * Envía imágenes codificadas en Base64 al endpoint local del servidor local
 * para diagnóstico fitosanitario automatizado. Desde v0.6.0 consume la
 * respuesta en streaming NDJSON via `streamOllama`, permitiendo a la UI
 * mostrar el diagnóstico token-por-token con efecto typewriter.
 *
 * Audit 2026-05-18 finding #4 (P2): `analyzeFoliage` ahora consume RAG
 * (`ragRetriever.retrieve`) para pre-pendear top-3 passages del corpus
 * `cycle-content/*.json` al prompt. Resultado: diagnóstico contextualizado
 * con `valor_pedagogico`, manejo agroecológico y fuentes del catálogo
 * (AGROSAVIA / IDEAM / POWO) en lugar de respuesta genérica.
 *
 * @typedef {import('../types').ChagraAsset} ChagraAsset
 * @typedef {import('../types').ChagraLog} ChagraLog
 * @typedef {import('../types').ChagraSpecies} ChagraSpecies
 * @typedef {import('../types').ChagraBiopreparado} ChagraBiopreparado
 */

import { streamOllama } from './ollamaStream';
import { retrieve } from './ragRetriever';
import { callTool, isSidecarEnabled, judgeVision } from './sidecarClient';
import { parseJsonTolerant } from '../utils/parseJsonTolerant';
import { hashImage, getCached, setCached } from './visionCacheService';
import { ENV } from '../config/env';

// Ruta relativa: Nginx proxea /api/ollama/ → http://localhost:11434/
// Ruta final: /api/ollama/api/generate → http://localhost:11434/api/generate
const OLLAMA_BASE = '/api/ollama';
const OLLAMA_URL = `${OLLAMA_BASE}/api/generate`;
// Modelo de diagnóstico multimodal — lee de ENV.VISION_MODEL (src/config/env.js,
// fuente única de verdad de los modelos del agente).
const DIAGNOSIS_MODEL = ENV.VISION_MODEL;
// Modelo(s) de visión para reconocimiento de especies.
// 2026-07-23 (PR #2738 §9): primary y fallback 1 unificados en
// ENV.VISION_MODEL (gemma3:4b) — retira `llama3.2-vision:11b` como primary,
// que en el bench profundo (18 plagas + 5 sanas) dio 0% honestidad y
// alucinó diagnóstico en TODAS las muestras sanas de control (peligroso
// para una feature de salud de planta). Efecto secundario conocido: al
// unificarse, fallback 1 ahora coincide con el primary (mismo valor), así
// que el único respaldo real de arquitectura distinta que queda es
// fallback 2 (qwen2.5vl:7b) — colapsar la cadena a 2 niveles es un
// follow-up fuera de este cambio, no una decisión tomada en este commit.
const VISION_SPECIES_MODEL = ENV.VISION_MODEL;
const VISION_SPECIES_FALLBACK_MODEL = ENV.VISION_MODEL;
const VISION_SPECIES_FALLBACK_2_MODEL = 'qwen2.5vl:7b';

// Prompt base sin contexto RAG. Fallback usado cuando el corpus no cargó
// o el retrieve no devolvió passages relevantes.
const DIAGNOSIS_BASE_PROMPT = 'First, decide if this image contains a living plant. Output JSON: {"isPlant": true/false, "score": 0-100, "issues": [], "treatment": ""}. If isPlant is false, set score to 0, issues to [], and treatment to "".';

// Query genérica para fallback cuando no conocemos la especie. Apunta a
// passages del corpus que hablen de manejo agroecológico colombiano —
// catálogo v3.1 tiene `valor_pedagogico` con esa orientación.
const RAG_FALLBACK_QUERY = 'diagnóstico foliar agroecológico colombiano plagas enfermedades manejo';

// Cap defensivo por passage: el corpus contiene `valor_pedagogico` largos
// (>1KB) que inflan el prompt y degradan eval_rate del modelo vision.
// 600 chars por passage × 3 passages ≈ 1.8 KB extra al prompt, manejable.
const PASSAGE_CHAR_CAP = 600;

/**
 * Construye query RAG para `analyzeFoliage` priorizando contexto fitosanitario.
 * Si recibe slug específico (ej. `fragaria_ananassa_monterrey`) tokeniza para
 * que BM25 lo matchee aún con underscores. Si no, usa fallback genérico.
 */
const buildRagQuery = (speciesSlug) => {
  if (typeof speciesSlug === 'string' && speciesSlug.trim().length > 0) {
    // BM25 tokenize separa por \s — convertir underscores a espacios
    // para que `fragaria_ananassa` matchee `fragaria` y `ananassa` por separado.
    const normalized = speciesSlug.trim().toLowerCase().replace(/_/g, ' ');
    return `${normalized} diagnóstico foliar plagas enfermedades manejo agroecológico`;
  }
  return RAG_FALLBACK_QUERY;
};

/**
 * Compone el bloque `<CONTEXTO_CIENTÍFICO>` con los top-K passages del RAG.
 * Cada passage se trunca a `PASSAGE_CHAR_CAP` y se etiqueta con su origen
 * (species slug + key del campo, ej. `fragaria_ananassa_monterrey :: valor_pedagogico`).
 * Si no hay passages, retorna string vacío (caller usa DIAGNOSIS_BASE_PROMPT crudo).
 */
const formatRagContext = (passages) => {
  if (!Array.isArray(passages) || passages.length === 0) return '';
  // Filtramos ANTES de numerar: si un passage viene vacío (caso raro pero
  // posible si el corpus tiene fields whitespace-only), no queremos un hueco
  // "[Fuente 2]" sin "Fuente 1" — la numeración debe ser contigua para que
  // el modelo cite correctamente.
  const valid = passages
    .map((p) => {
      const text = String(p?.text || '').slice(0, PASSAGE_CHAR_CAP).trim();
      if (!text) return null;
      const source = p.species ? `${p.species} :: ${p.key || 'corpus'}` : (p.key || 'corpus');
      return { source, text };
    })
    .filter(Boolean);
  if (valid.length === 0) return '';
  const blocks = valid.map((p, i) => `[Fuente ${i + 1} — ${p.source}]\n${p.text}`);
  return `<CONTEXTO_CIENTÍFICO>\n${blocks.join('\n\n')}\n</CONTEXTO_CIENTÍFICO>\n\n`;
};

/**
 * Combina contexto RAG + instrucción al modelo vision. Cuando hay contexto
 * pide explícitamente que cite la fuente para que el operador pueda auditar
 * de dónde salió la recomendación (vs. alucinación pura).
 */
const buildDiagnosisPrompt = (ragContext) => {
  if (!ragContext) return DIAGNOSIS_BASE_PROMPT;
  return (
    `${ragContext}` +
    'Eres un agrónomo agroecológico colombiano. Usa el CONTEXTO_CIENTÍFICO ' +
    'arriba + lo que observas en la imagen para diagnosticar. Cita la fuente ' +
    'numérica (ej. "Fuente 1") cuando aplique. Si el contexto no aplica a lo ' +
    'que ves, ignóralo y diagnostica solo por la imagen. ' +
    'Output JSON: {"isPlant": true/false, "score": 0-100, "issues": [], "treatment": ""}. If isPlant is false, set score to 0, issues to [], and treatment to "".'
  );
};

// Species recognition (EXPERIMENTAL — feature flag operador 2026-05-03 Miguel).
// Mismo modelo multimodal configurado pero distinto prompt. Output JSON
// estructurado para que la UI pueda autocompletar SpeciesSelect con la
// sugerencia + confidence. Scope esperado: vegetales y frutales latinoamericanos
// comunes (café, gulupa, mora, fresa, lechuga, tomate, papa, plátano, etc.).
// Edge cases conocidos: angles raros, hojas aisladas sin contexto, especies
// muy nicho fuera del training de Gemma3. Se acompaña de botón "Reportar
// problema" que graba audio + ctx para iterar/eliminar el feature.
//
/**
 * @typedef {Object} SpeciesRecognitionResult
 * @property {string} common_name_es
 * @property {string} scientific_name
 * @property {number} confidence
 * @property {Array<{common_name_es: string, scientific_name: string, confidence: number}>} alternatives
 */
const SPECIES_PROMPT = 'Identify the plant species in the image. Output JSON ONLY, no markdown: {"common_name_es": "<nombre comun en español, lowercase>", "scientific_name": "<binomial>", "confidence": <0-1>, "alternatives": [{"common_name_es": "...", "scientific_name": "...", "confidence": <0-1>}]}. If you cannot identify confidently (confidence < 0.5), set common_name_es to empty string and provide alternatives. Limit alternatives to 2.';

/**
 * Convierte un Blob a string Base64 (sin prefijo data:).
 */
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = /** @type {string} */ (reader.result);
      // Strip "data:image/webp;base64," prefix
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Recupera contexto RAG para `analyzeFoliage` con tolerancia total a fallos.
 * Cualquier excepción (corpus no cargado, fetch failure, BM25 vacío) retorna
 * `[]` para que el caller use el prompt base sin contexto. Audit finding #4
 * exige degrade graceful: vision diagnóstico nunca debe romperse por RAG.
 *
 * @internal exportado solo para tests.
 */
export const __retrieveRagContextForFoliage = async (speciesSlug) => {
  try {
    const query = buildRagQuery(speciesSlug);
    const passages = await retrieve(query, 3, 'foliage');
    return Array.isArray(passages) ? passages : [];
  } catch (err) {
    console.warn('[aiService] RAG retrieve failed, falling back to base prompt:', err?.message);
    return [];
  }
};

/**
 * Analiza una imagen de follaje via Ollama (modelo multimodal) en streaming.
 *
 * Desde audit 2026-05-18 #4: pre-pende top-3 passages del RAG (`ragRetriever`)
 * al `DIAGNOSIS_BASE_PROMPT` para que el modelo cite catálogo agroecológico
 * (`valor_pedagogico`, manejo plagas, etc.) en lugar de alucinar treatments.
 * Si `speciesSlug` está disponible, el RAG query es específico; si no, usa
 * fallback genérico. Cold-start o fallo RAG → degrade transparente al prompt
 * estático original.
 *
 * @param {Blob} imageBlob - imagen optimizada (WebP)
 * @param {Object} [options]
 * @param {Function} [options.onToken] - callback (chunk, fullText) invocado
 *        por cada token emitido por el modelo. La UI lo usa para mostrar el
 *        diagnóstico apareciendo caracter-a-caracter.
 * @param {AbortSignal} [options.signal] - cancelación externa.
 * @param {string} [options.speciesSlug] - slug del catálogo (ej.
 *        `fragaria_ananassa_monterrey`). Cuando se conoce, el retrieve apunta
 *        al passage de esa especie. Si es null/undefined, fallback genérico.
  * @param {string} [options._assetId] - solo telemetría, opcional. No se
  *        persiste (privacy-safe).
 * @returns {Promise<{score: number, issues: string[], treatment_suggestion: string} | null>}
 *          null si el modelo no responde o no es multimodal.
 * @example
 * const result = await analyzeFoliage(imageBlob, {
 *   speciesSlug: 'fragaria_ananassa_monterrey',
 *   onToken: (chunk, text) => setDiagnosis(text),
 * });
 * // result => { score: 85, issues: ["mancha foliar"], treatment_suggestion: "aplicar caldo bordelés (Fuente 1)" }
 */
const analyzeFoliageUncached = async (imageBlob, { onToken, signal, speciesSlug, _assetId } = {}) => {
  try {
    const base64 = await blobToBase64(imageBlob);

    // 1) RAG context (graceful degrade — nunca rompe el call si falla)
    const passages = await __retrieveRagContextForFoliage(speciesSlug);
    const ragContext = formatRagContext(passages);
    const prompt = buildDiagnosisPrompt(ragContext);

    // 2) Vision call con telemetría enriquecida (`rag_passages_used`).
    // streamOllama hace fetch con stream:true y procesa el NDJSON del body.
    // No usa fetchFromFarmOS para evitar inyección de headers OAuth — Ollama
    // local no requiere autenticación.
    const text = (await streamOllama(
      OLLAMA_URL,
      { model: DIAGNOSIS_MODEL, prompt, images: [base64] },
      onToken,
      { signal, meta: { rag_passages_used: passages.length } },
    )).trim();

    // Parser tolerante (QUICK-6 #269): repair_json fallback contra fences,
    // prosa antes/después, trailing commas, cierres faltantes por num_predict.
    const r = parseJsonTolerant(text);
    if (!r.ok) {
      console.warn('[aiService.analyzeFoliage] JSON irrecuperable:', /** @type {{error: string}} */ (r).error);
      return null;
    }
    /** @type {{score?: number, issues?: string[], treatment_suggestion?: string, treatment?: string, isPlant?: boolean}} */
    const parsed = r.value;

    // Validación y normalización del shape
    if (typeof parsed.score !== 'number') parsed.score = 0;
    if (!Array.isArray(parsed.issues)) parsed.issues = [];
    // Normalizar: PaliGemma usa "treatment", legacy usa "treatment_suggestion"
    parsed.treatment_suggestion = parsed.treatment_suggestion || parsed.treatment || '';

    // Bug P0 (2026-06-08): para imágenes sin planta (toy, paisaje, etc.) el
    // modelo alucina un diagnóstico completo. Si isPlant es false, devolvemos
    // null para que el caller use el fallback "guíame por descripción".
    // Legacy cache (isPlant undefined) se asume plant para no romper.
    if (parsed.isPlant === false) return null;

    return /** @type {{score: number, issues: string[], treatment_suggestion: string}} */ (parsed);
  } catch (err) {
    console.warn('[aiService] Diagnóstico no disponible:', err.message);
    return null;
  }
};

/**
 * V-11 (#231): wrapper de cache por hash de contenido para `analyzeFoliage`.
 *
 * Re-analizar la MISMA foto (mismos bytes) sirve el resultado cacheado al
 * instante en vez de re-llamar al modelo multimodal (varios segundos en GPU
 * Maxwell). El hit trae `_cached: true` para telemetría/debug. Resultados
 * null/error NUNCA se cachean (la siguiente llamada reintenta). La firma
 * pública es idéntica a la implementación original — no rompe callers.
 *
 * El hashing es best-effort: si `hashImage` falla (ej. blob no leíble) se
 * degrada a la inferencia directa sin cache. El streaming `onToken` solo se
 * emite en miss (cache hit es instantáneo, no hay tokens que emitir).
 */
export const analyzeFoliage = async (imageBlob, options = {}) => {
  let hash = null;
  try {
    hash = await hashImage(imageBlob);
    const cached = await getCached(hash);
    if (cached) return { ...cached, _cached: true };
  } catch (err) {
    console.debug('[aiService.analyzeFoliage] cache lookup skipped:', err?.message);
  }

  const result = await analyzeFoliageUncached(imageBlob, options);
  if (result && hash) {
    try {
      await setCached(hash, result);
    } catch (err) {
      console.debug('[aiService.analyzeFoliage] cache write skipped:', err?.message);
    }
  }
  return result;
};

/**
 * Reconoce especie de planta a partir de una foto (EXPERIMENTAL - Miguel
 * 2026-05-03). Mismo backend multimodal configurado pero prompt distinto.
 *
 * @param {string} model - nombre del modelo Ollama
 * @param {string} base64 - imagen en base64 (sin prefijo data:)
 * @param {Object} options
 * @param {Function} [options.onToken] - streaming token callback
 * @param {AbortSignal} [options.signal]
 * @param {Object} [options.telemetryState] - state compartido para telemetría
 * @returns {Promise<{common_name_es: string, scientific_name: string, confidence: number, alternatives: Array, _model: string} | null>}
 *          null si modelo falla o no parseable. Caller debe distinguir
 *          confidence >=0.7 (sugerir directo) vs <0.7 (mostrar alternativas
 *          y dejar al operario elegir).
 * @example
 * const species = await recognizeSpecies(imageBlob);
 * // species => { common_name_es: "cafe", scientific_name: "Coffea arabica", confidence: 0.92, alternatives: [] }
 */
const runSpeciesRecognition = async (model, base64, { onToken, signal, telemetryState }) => {
  // V-12 2026-05-27: thunk-meta resuelto en `recordLLMEvent` por
  // `streamOllama`. Lee el state mutado tras parsear el JSON (confidence)
  // y tras validar contra catálogo (grounded_status, set por
  // `recognizeSpeciesGrounded`). Falla silente si `telemetryState` es null.
  const metaThunk = telemetryState
    ? () => {
      const out = {};
      if (typeof telemetryState.confidence === 'number') {
        out.confidence = telemetryState.confidence;
      }
      if (telemetryState.grounded_status !== undefined) {
        out.grounded_status = telemetryState.grounded_status;
      }
      return out;
    }
    : undefined;

  const text = (await streamOllama(
    OLLAMA_URL,
    { model, prompt: SPECIES_PROMPT, images: [base64] },
    onToken,
    { signal, meta: metaThunk },
  )).trim();
  // Parser tolerante (QUICK-6 #269): repair_json fallback. Si falla
  // completo, throw para que el caller maneje (recognizeSpecies tiene try
  // externo que decide fallback texto).
  const r = parseJsonTolerant(text);
  if (!r.ok) {
    throw new Error(`runSpeciesRecognition: ${/** @type {{error: string}} */ (r).error}`);
  }
  /** @type {{confidence?: number, common_name_es?: string, scientific_name?: string, alternatives?: Array<any>}} */
  const parsed = r.value;
  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;

  // Mutar telemetryState (si el caller pasó uno) ANTES de que
  // `detectProcessorFor` resuelva en streamOllama y dispare recordLLMEvent.
  // Best-effort: si la grabación dispara antes (carrera microtasks), simplemente
  // omitirá el campo. Telemetría nunca debe bloquear el caller.
  if (telemetryState) telemetryState.confidence = confidence;

  return /** @type {{common_name_es: string, scientific_name: string, confidence: number, alternatives: Array<any>, _model: string}} */ ({
    common_name_es: (parsed.common_name_es || '').toLowerCase().trim(),
    scientific_name: parsed.scientific_name || '',
    confidence,
    alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
    _model: model,
  });
};

/**
 * Convierte un nombre científico binomial ("Coffea arabica L.") a un
 * `species_id` snake_case canónico ("coffea_arabica") + metadata del match
 * (qué tanto se stripó del input para llegar al binomial base). Esto permite
 * al caller distinguir cuándo el species_id derivado representa exactamente
 * lo que dijo el modelo vs. cuándo es una aproximación (variedad → base).
 *
 * Retorna `{ id, matchType }` donde `matchType`:
 *   - 'exact'             — el binomial input es exactamente `Genus species`
 *                           (con autoría opcional pero sin variedad/grupo/×).
 *   - 'stripped-authority'— se quitó autoría taxonómica (L., Mart., etc.),
 *                           pero el binomial base es el mismo.
 *   - 'stripped-variety'  — se quitó variedad/cultivar/grupo (ej. 'Pastusa',
 *                           Grupo Phureja). El id base puede no representar
 *                           bien la entidad del input.
 *   - 'stripped-hybrid'   — se quitó el marcador de híbrido (× / x). El id
 *                           ignora que la planta es híbrida formal.
 *
 * Ejemplos:
 *   "Coffea arabica"                          → { id: "coffea_arabica",   matchType: "exact" }
 *   "Coffea arabica L."                       → { id: "coffea_arabica",   matchType: "stripped-authority" }
 *   "Solanum tuberosum 'Pastusa'"             → { id: "solanum_tuberosum", matchType: "stripped-variety" }
 *   "Solanum tuberosum Grupo Phureja"         → { id: "solanum_tuberosum", matchType: "stripped-variety" }
 *   "Citrus × paradisi"                       → { id: "citrus_paradisi",   matchType: "stripped-hybrid" }
 *
 * V-03 #241/#242 (2026-05-28): el caller usa `matchType` para downgrade el
 * status de grounded de 'verified' a 'partial-match' cuando el id resuelto
 * NO representa fielmente el binomial input (variedad o hybrid stripped).
 *
 * Si el input no es parseable retorna `null`.
 */
function scientificToMatchInfo(scientific) {
  if (typeof scientific !== 'string' || scientific.trim().length === 0) return null;

  // QUICK-17 (#280) 2026-05-27: normalizar Unicode + quitar diacríticos
  // ANTES del regex.
  const ascii = scientific.normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  // Detectar marcador de híbrido (× explícito o `x` como separador entre
  // 2 epítetos válidos). NO confundir con `x` parte de un nombre.
  const hasHybridMark = /(^|\s)[×]($|\s)/.test(ascii)
    || /(^|\s)x($|\s)/.test(ascii.toLowerCase().split(/\s+/).slice(0, 3).join(' '));

  // QUICK-17: hybrid mark `×` o `x` separador (ej. "Citrus × paradisi" o
  // "Fragaria x ananassa") se omite. Tomar primeras 2 palabras NO-`×`.
  const parts = ascii.split(/\s+/).filter((w) => w !== '×' && w !== 'x' && w !== 'X');
  if (parts.length < 2) return null;
  const genus = parts[0];
  const species = parts[1];
  // Solo aceptar palabras con letras + (opcional) guión. Rechazar autoría
  // que tipicamente empieza con mayúsculas pero no es epíteto científico.
  if (!/^[A-Za-z-]+$/.test(genus) || !/^[a-z-]+$/.test(species)) return null;
  const id = `${genus}_${species}`.toLowerCase();
  // QUICK-17 post-validate: doble check que el id final sea snake_case
  // ASCII estricto.
  if (!/^[a-z][a-z0-9_]*$/.test(id)) return null;

  // Clasificar matchType. Orden de prioridad: hybrid > variety > authority > exact.
  let matchType = 'exact';
  if (hasHybridMark) {
    matchType = 'stripped-hybrid';
  } else if (parts.length > 2) {
    // Hay tokens después del epíteto. Distinguir variedad/grupo vs autoría.
    // Heurística: variedad/cultivar suele venir con marcador explícito
    // (`var.`, `cv.`, `subsp.`, `ssp.`, `f.`) o nombre entre comillas
    // simples (`'Pastusa'`) o la palabra "Grupo". Autoría suele ser nombre
    // propio capitalizado SIN esos marcadores (L., Mart., Kunth, etc.).
    // Nota: `\b...\.\b` no funciona porque `\b` después de `.` no es
    // word boundary. Anclamos por inicio de token (espacio o ^).
    const rest = parts.slice(2).join(' ');
    const varietyMarkers = /(?:^|\s)(var|cv|subsp|ssp|f)\.(?=\s|$)|(?:^|\s)(grupo|group)(?=\s|$)|['‘]/i;
    if (varietyMarkers.test(rest)) {
      matchType = 'stripped-variety';
    } else {
      matchType = 'stripped-authority';
    }
  }

  return { id, matchType };
}

/**
 * Convierte un nombre científico binomial a `species_id` snake_case.
 * Wrapper backwards-compat de `scientificToMatchInfo` que solo devuelve el id.
 *
 * Mantenido para callers existentes y tests. Para grounding granular,
 * usar `scientificToMatchInfo` directamente.
 */
function scientificToSpeciesId(scientific) {
  const info = scientificToMatchInfo(scientific);
  return info ? info.id : null;
}

// Export para tests (no usar en runtime fuera de aiService).
export { scientificToSpeciesId as _scientificToSpeciesId };
export { scientificToMatchInfo as _scientificToMatchInfo };

/**
 * Versión grounded de recognizeSpecies. Llama al modelo de visión Y
 * después valida el resultado contra el catálogo Chagra usando el tool
 * `validate_visual_match` del sidecar agro-mcp.
 *
 * Anti-alucinación: si el modelo vision devuelve "Mangosteenia colombiana"
 * (especie inexistente), el catálogo lo rechaza con `valid:false`. El
 * caller obtiene `_grounded.status` para decidir qué UX mostrar:
 *   - 'verified'         → catálogo confirma la sugerencia exacta (verde).
 *   - 'partial-match'    → catálogo encontró el binomial base pero el input
 *                          incluía variedad/cultivar/marcador híbrido que se
 *                          stripó (amber-tibio). V-03 #241/#242: el mensaje
 *                          "verificado" sería engañoso porque el id resuelto
 *                          no representa fielmente lo que dijo el modelo.
 *   - 'rejected'         → catálogo rechaza la sugerencia (amber).
 *   - 'sidecar-disabled' → feature flag off (info).
 *   - 'offline'          → sin conexión, no se pudo verificar (info).
 *   - 'no-binomial'      → modelo no produjo binomial parseable (amber).
 *   - 'sidecar-error'    → sidecar timeout / 5xx (amber).
 *
 * V-05: shape estructurado reemplaza el ambiguo `_grounded: boolean|null`
 * que mezclaba 3 modos de "no validable" en un solo `null`. Cada early-return
 * ahora trae `reason` en español colombiano para mostrar al operador rural.
 *
 * @param {Blob} imageBlob — foto del usuario.
 * @param {Object} options — { onToken, signal } pasados al modelo vision.
 * @returns {Promise<Object|null>} estructura igual a recognizeSpecies +
 *   `_grounded: { status, reason, validation }`,
 *   `_validation: { valid, confidence_adjusted, ... }` cuando aplique
 *   (alias backwards-compat con `_grounded.validation`),
 *   `_all_validations` cuando hubo callTool exitoso.
 */
export const recognizeSpeciesGrounded = async (imageBlob, options = {}) => {
  // V-12 2026-05-27: state compartido con `recognizeSpecies` para que la
  // telemetría de la inferencia vision capture `confidence` y
  // `grounded_status`. Se llena en orden: confidence tras parsear el JSON
  // del modelo, grounded_status tras validar (o degradar) contra catálogo.
  const telemetryState = {};
  const visionResult = await recognizeSpecies(imageBlob, { ...options, _telemetryState: telemetryState });
  if (!visionResult) return null;

  // Helper: anota grounded_status para telemetría y devuelve el visionResult
  // con la estructura _grounded rica (status, reason, validation). Mutar el
  // state es best-effort porque la grabación de telemetría corre en background.
  const finalize = (status, reason, validation = null, extras = {}, judge = null) => {
    telemetryState.grounded_status = status;
    return {
      ...visionResult,
      _grounded: { status, reason, validation, ...(judge ? { judge } : {}) },
      _validation: validation,
      ...extras,
    };
  };

  // V-08 (#229): cross-verify anti-alucinación — pregunta al juez multimodal
  // si la FOTO realmente muestra `speciesId`. `validate_visual_match` ya
  // confirmó que el NOMBRE existe en catálogo, pero no que la imagen coincida
  // (el modelo de visión pudo alucinar el binomial). Best-effort: el sidecar
  // capa a 500 ms y nunca bloquea; cualquier fallo → null (no degrada la UX).
  const runJudge = async (speciesId) => {
    try {
      const b64 = await blobToBase64(imageBlob);
      return await judgeVision(speciesId, b64);
    } catch (_) {
      return null;
    }
  };

  // Si sidecar disabled, devolver lo del vision sin validar.
  if (!isSidecarEnabled()) {
    return finalize('sidecar-disabled', 'Validación catálogo deshabilitada.');
  }

  // Si offline, no podemos pegar al sidecar.
  if (!navigator.onLine) {
    return finalize('offline', 'Sin conexión, no se pudo verificar.');
  }

  // Derive species_id + match metadata desde scientific_name. Si no podemos
  // derivar (binomial ausente o malformado), tampoco podemos validar.
  const matchInfo = scientificToMatchInfo(visionResult.scientific_name);
  if (!matchInfo) {
    return finalize('no-binomial', 'Nombre científico ambiguo.');
  }
  const speciesId = matchInfo.id;

  // Construir lista de candidates: el principal + alternatives si vienen.
  const candidates = [
    {
      species_id: speciesId,
      confidence: visionResult.confidence,
      source_label: visionResult.scientific_name,
    },
  ];
  for (const alt of (visionResult.alternatives || []).slice(0, 4)) {
    const altSci = alt.scientific_name || alt;
    const altId = scientificToSpeciesId(altSci);
    if (altId && altId !== speciesId) {
      candidates.push({
        species_id: altId,
        confidence: typeof alt.confidence === 'number' ? alt.confidence : 0.3,
        source_label: altSci,
      });
    }
  }

  const result = await callTool('validate_visual_match', { candidates });
  if (!result) {
    // Sidecar timeout / 5xx — fallback al resultado vision sin validar.
    return finalize('sidecar-error', 'Error temporal del catálogo.');
  }

  // Buscar el match del candidato primario en results.
  const primary = (result.results || []).find((r) => r.species_id === speciesId);
  const validInCatalog = primary?.valid === true;
  if (!validInCatalog) {
    return finalize(
      'rejected',
      'Sugerencia no encontrada en catálogo.',
      primary || null,
      { _all_validations: result.results || [] },
    );
  }

  // V-03 #241/#242 (2026-05-28): el catálogo dice "valid:true" pero el
  // binomial input incluía variedad/cultivar/híbrido que se stripó para
  // resolver el id base. Marcar como 'partial-match' para que UX no muestre
  // "verificado" engañoso. Solo 'exact' y 'stripped-authority' (autoría
  // taxonómica como "L.", "Mart.") cuentan como verificación plena, porque
  // el binomial taxonómico subyacente sigue siendo el mismo.
  if (matchInfo.matchType === 'stripped-variety' || matchInfo.matchType === 'stripped-hybrid') {
    const reasonByType = {
      'stripped-variety': 'Base verificada; variedad o cultivar específico no validado.',
      'stripped-hybrid': 'Base verificada; el catálogo no distingue el híbrido formal.',
    };
    const judge = await runJudge(speciesId);
    return finalize(
      'partial-match',
      reasonByType[matchInfo.matchType],
      primary,
      { _all_validations: result.results || [], _match_type: matchInfo.matchType },
      judge,
    );
  }

  const judge = await runJudge(speciesId);
  return finalize(
    'verified',
    'Verificado en catálogo Chagra.',
    primary,
    { _all_validations: result.results || [], _match_type: matchInfo.matchType },
    judge,
  );
};

/** @param {Blob} imageBlob @param {{onToken?: Function, signal?: AbortSignal, _telemetryState?: Object}} options */
const recognizeSpeciesUncached = async (imageBlob, { onToken, signal, _telemetryState } = {}) => {
  let base64;
  try {
    base64 = await blobToBase64(imageBlob);
  } catch (err) {
    console.warn('[aiService] Species recognition base64 failed:', err.message);
    return null;
  }

  // V-12 2026-05-27: state compartido para enriquecer telemetría vision con
  // `confidence` (parseado del modelo) y `grounded_status` (set por el
  // wrapper `recognizeSpeciesGrounded` tras validar contra catálogo).
  // `_telemetryState` es param interno opcional — wrappers como
  // `recognizeSpeciesGrounded` lo pasan para extender la grabación.
  const telemetryState = _telemetryState || {};

  // Primary: modelo de visión configurado.
  try {
    return await runSpeciesRecognition(VISION_SPECIES_MODEL, base64, { onToken, signal, telemetryState });
  } catch (err) {
    console.warn(`[aiService] ${VISION_SPECIES_MODEL} failed, fallback to ${VISION_SPECIES_FALLBACK_MODEL}:`, err.message);
  }

  // Fallback 1: modelo de diagnóstico configurado (normalmente ya cargado en GPU).
  try {
    return await runSpeciesRecognition(VISION_SPECIES_FALLBACK_MODEL, base64, { onToken, signal, telemetryState });
  } catch (err) {
    console.warn(`[aiService] ${VISION_SPECIES_FALLBACK_MODEL} failed, fallback 2 to ${VISION_SPECIES_FALLBACK_2_MODEL}:`, err.message);
  }

  // Fallback 2: modelo de visión alterno configurado (último recurso).
  try {
    return await runSpeciesRecognition(VISION_SPECIES_FALLBACK_2_MODEL, base64, { onToken, signal, telemetryState });
  } catch (err) {
    console.warn('[aiService] Species recognition no disponible (3 fallbacks fallaron):', err.message);
    return null;
  }
};

/**
 * V-11 (#231): wrapper de cache por hash de contenido para `recognizeSpecies`.
 *
 * Misma política que `analyzeFoliage`: re-identificar la MISMA foto sirve el
 * resultado cacheado (con `_cached: true`) sin re-llamar al modelo de visión
 * ni a sus fallbacks. Resultados null NUNCA se cachean.
 *
 * Nota grounding/telemetría: `recognizeSpeciesGrounded` llama a esta función
 * pasando `_telemetryState`. En un cache hit no hay inferencia nueva → no se
 * graba un evento de telemetría LLM nuevo (correcto: no hubo call al modelo).
 * El objeto cacheado preserva `scientific_name`, `confidence`, `alternatives`,
 * por lo que el wrapper grounded sigue validando contra catálogo normalmente.
 * La firma pública es idéntica — no rompe callers.
 */
export const recognizeSpecies = async (imageBlob, options = {}) => {
  let hash = null;
  try {
    hash = await hashImage(imageBlob);
    const cached = await getCached(hash);
    if (cached) return { ...cached, _cached: true };
  } catch (err) {
    console.debug('[aiService.recognizeSpecies] cache lookup skipped:', err?.message);
  }

  const result = await recognizeSpeciesUncached(imageBlob, options);
  if (result && hash) {
    try {
      await setCached(hash, result);
    } catch (err) {
      console.debug('[aiService.recognizeSpecies] cache write skipped:', err?.message);
    }
  }
  return result;
};

export default analyzeFoliage;

// Test-only exports: helpers internos del flujo RAG. NO usar fuera de tests.
export const __TEST__ = {
  buildRagQuery,
  formatRagContext,
  buildDiagnosisPrompt,
  DIAGNOSIS_BASE_PROMPT,
  RAG_FALLBACK_QUERY,
  PASSAGE_CHAR_CAP,
};
