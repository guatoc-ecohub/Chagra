/**
 * aiService.js — Inferencia de visión via Ollama / Gemma 4 (Fase 20.2b).
 *
 * Envía imágenes codificadas en Base64 al endpoint local del Nodo Alpha
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

// Ruta relativa: Nginx proxea /api/ollama/ → http://localhost:11434/
// Ruta final: /api/ollama/api/generate → http://localhost:11434/api/generate
const OLLAMA_BASE = '/api/ollama';
const OLLAMA_URL = `${OLLAMA_BASE}/api/generate`;
// Gemma 3 4B (oficial Google, multimodal nativo). Reemplaza paligemma
// porque el runner Llama de Ollama crashea con arquitectura PaliGemma.
const DIAGNOSIS_MODEL = 'gemma3:4b';
// Vision-specialized model para species recognition. Bench Quadro M6000
// 2026-05-17: qwen2.5vl:7b da 78 t/s GPU + identificación notablemente
// mejor que gemma3:4b en frutales/hortalizas latam (11.8 GB VRAM, calza
// holgado con 24 GB de la Quadro). Caller hace fallback a gemma3:4b si
// qwen falla (modelo no cargado, OOM transitorio, etc.).
const VISION_SPECIES_MODEL = 'qwen2.5vl:7b';
const VISION_SPECIES_FALLBACK_MODEL = 'gemma3:4b';

// Prompt base sin contexto RAG. Fallback usado cuando el corpus no cargó
// o el retrieve no devolvió passages relevantes.
const DIAGNOSIS_BASE_PROMPT = 'detect disease, nutrient deficiency, and overall plant health. Output JSON: {"score": 0-100, "issues": [], "treatment": ""}';

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
    'Output JSON: {"score": 0-100, "issues": [], "treatment": ""}'
  );
};

// Species recognition (EXPERIMENTAL — feature flag operador 2026-05-03 Miguel).
// Mismo modelo gemma3:4b multimodal pero distinto prompt. Output JSON
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
      const result = reader.result;
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
    const passages = await retrieve(query, 3);
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
 * @param {string} [options.assetId] - solo telemetría, opcional. No se
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
// eslint-disable-next-line no-unused-vars
export const analyzeFoliage = async (imageBlob, { onToken, signal, speciesSlug, assetId } = {}) => {
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

    // Parsear JSON (Gemma puede envolver en markdown fences)
    const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validación y normalización del shape
    if (typeof parsed.score !== 'number') parsed.score = 0;
    if (!Array.isArray(parsed.issues)) parsed.issues = [];
    // Normalizar: PaliGemma usa "treatment", legacy usa "treatment_suggestion"
    parsed.treatment_suggestion = parsed.treatment_suggestion || parsed.treatment || '';

    return parsed;
  } catch (err) {
    console.warn('[aiService] Diagnóstico no disponible:', err.message);
    return null;
  }
};

/**
 * Reconoce especie de planta a partir de una foto (EXPERIMENTAL - Miguel
 * 2026-05-03). Mismo backend gemma3:4b multimodal pero prompt distinto.
 *
 * @param {Blob} imageBlob - foto JPEG/WebP comprimida
 * @param {Object} [options]
 * @param {Function} [options.onToken] - streaming token callback
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{common_name_es: string, scientific_name: string, confidence: number, alternatives: Array} | null>}
 *          null si modelo falla o no parseable. Caller debe distinguir
 *          confidence >=0.7 (sugerir directo) vs <0.7 (mostrar alternativas
 *          y dejar al operario elegir).
 * @example
 * const species = await recognizeSpecies(imageBlob);
 * // species => { common_name_es: "cafe", scientific_name: "Coffea arabica", confidence: 0.92, alternatives: [] }
 */
const runSpeciesRecognition = async (model, base64, { onToken, signal }) => {
  const text = (await streamOllama(
    OLLAMA_URL,
    { model, prompt: SPECIES_PROMPT, images: [base64] },
    onToken,
    { signal },
  )).trim();
  const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return {
    common_name_es: (parsed.common_name_es || '').toLowerCase().trim(),
    scientific_name: parsed.scientific_name || '',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
    _model: model,
  };
};

export const recognizeSpecies = async (imageBlob, { onToken, signal } = {}) => {
  let base64;
  try {
    base64 = await blobToBase64(imageBlob);
  } catch (err) {
    console.warn('[aiService] Species recognition base64 failed:', err.message);
    return null;
  }

  // Primary: qwen2.5vl:7b (vision-specialized, mejor identificación).
  try {
    return await runSpeciesRecognition(VISION_SPECIES_MODEL, base64, { onToken, signal });
  } catch (err) {
    console.warn(`[aiService] ${VISION_SPECIES_MODEL} failed, fallback to ${VISION_SPECIES_FALLBACK_MODEL}:`, err.message);
  }

  // Fallback: gemma3:4b (modelo de diagnóstico, ya cargado en VRAM normalmente).
  try {
    return await runSpeciesRecognition(VISION_SPECIES_FALLBACK_MODEL, base64, { onToken, signal });
  } catch (err) {
    console.warn('[aiService] Species recognition no disponible (fallback también falló):', err.message);
    return null;
  }
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
