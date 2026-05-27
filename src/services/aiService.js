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
import { callTool, isSidecarEnabled } from './sidecarClient';

// Ruta relativa: Nginx proxea /api/ollama/ → http://localhost:11434/
// Ruta final: /api/ollama/api/generate → http://localhost:11434/api/generate
const OLLAMA_BASE = '/api/ollama';
const OLLAMA_URL = `${OLLAMA_BASE}/api/generate`;
// Gemma 3 4B (oficial Google, multimodal nativo). Reemplaza paligemma
// porque el runner Llama de Ollama crashea con arquitectura PaliGemma.
const DIAGNOSIS_MODEL = 'gemma3:4b';
// Vision-specialized model para species recognition. Bench 2026-05-26
// bench-vision-flora 16 fixtures: llama3.2-vision:11b = 0 parse errors,
// 18.8% nombre común, 68.8% familia botánica, 18.6s p50; qwen2.5vl:7b
// = 16/16 parse errors a pesar de format:"json"; llava:13b 15/16 errors.
// Cambio primary qwen2.5vl → llama3.2-vision por confiabilidad JSON.
// qwen sigue como segundo fallback porque latencia p50 es 3.3s (5x más
// rápido que llama32) — útil si llama32 OOM o timeout en hardware
// constrained.
const VISION_SPECIES_MODEL = 'llama3.2-vision:11b';
const VISION_SPECIES_FALLBACK_MODEL = 'gemma3:4b';
const VISION_SPECIES_FALLBACK_2_MODEL = 'qwen2.5vl:7b';

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

// QUICK-16 (Tier S iter 2, 2026-05-27): guard de tamaño antes de pegar a
// Ollama. PWA comprime con `optimizeImage` (WebP @ 0.8 quality, maxWidth 1280)
// pero Samsung HDR raw o screenshots de alta resolución a veces entran al
// pipeline sin pasar por la compresión (ej. share-to-app, formularios sin
// optimizer). Si llegan >2MB, Ollama vision encola ~30s antes de devolver
// error de payload — UX malo. Mejor catchear local con mensaje claro.
const MAX_IMAGE_BYTES = 2_000_000; // 2 MB

/**
 * Lanza si el blob excede MAX_IMAGE_BYTES. Caller (UI camera flow) atrapa el
 * error y muestra toast user-friendly + sugiere reducir calidad.
 * @param {Blob} blob
 * @throws {Error} con message en español colombiano para el operador rural.
 */
export const validateImageSize = (blob) => {
  // Defensa: si el caller pasa null/undefined o algo sin .size (no-blob),
  // no validamos — dejamos que blobToBase64 falle con su mensaje propio.
  if (!blob || typeof blob.size !== 'number') return;
  if (blob.size > MAX_IMAGE_BYTES) {
    const sizeMb = (blob.size / 1_000_000).toFixed(1);
    throw new Error(`Imagen muy grande (${sizeMb} MB), reduce calidad antes de enviar.`);
  }
};

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
  // QUICK-16: fail-fast antes del network call si la imagen supera 2 MB.
  // Throw INTENCIONAL — el caller UI lo atrapa para mostrar toast claro.
  // No usamos el try/catch interno (que retorna null) porque queremos que
  // el usuario sepa POR QUÉ no se generó diagnóstico (no es un fallo de IA,
  // es prevenible reduciendo calidad de cámara).
  validateImageSize(imageBlob);
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
  const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;

  // Mutar telemetryState (si el caller pasó uno) ANTES de que
  // `detectProcessorFor` resuelva en streamOllama y dispare recordLLMEvent.
  // Best-effort: si la grabación dispara antes (carrera microtasks), simplemente
  // omitirá el campo. Telemetría nunca debe bloquear el caller.
  if (telemetryState) telemetryState.confidence = confidence;

  return {
    common_name_es: (parsed.common_name_es || '').toLowerCase().trim(),
    scientific_name: parsed.scientific_name || '',
    confidence,
    alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
    _model: model,
  };
};

/**
 * Convierte un nombre científico binomial ("Coffea arabica L.") a un
 * `species_id` snake_case canónico ("coffea_arabica") compatible con el
 * catálogo Chagra. Quita autoría taxonómica (L., Mart., Kunth, etc.) y
 * cualquier sufijo descriptivo después del epíteto específico.
 *
 * Ejemplos:
 *   "Coffea arabica L."                       → "coffea_arabica"
 *   "Solanum betaceum"                        → "solanum_betaceum"
 *   "Erythrina edulis Triana ex Micheli"      → "erythrina_edulis"
 *   "Solanum tuberosum Grupo Phureja"         → "solanum_tuberosum"  (sin Grupo)
 *
 * Esto es heurística, no taxonomía perfecta. La validación final la hace
 * el catálogo: si el id derivado no existe, validate_visual_match lo
 * rechaza con `valid:false`.
 */
function scientificToSpeciesId(scientific) {
  if (typeof scientific !== 'string' || scientific.trim().length === 0) return null;
  // Tomar primeras 2 palabras (género + epíteto). Resto es autoría/notas.
  const parts = scientific.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const genus = parts[0];
  const species = parts[1];
  // Solo aceptar palabras con letras + (opcional) guión. Rechazar autoría
  // que tipicamente empieza con mayúsculas pero no es epíteto científico.
  if (!/^[A-Za-z-]+$/.test(genus) || !/^[a-z-]+$/.test(species)) return null;
  return `${genus}_${species}`.toLowerCase();
}

// QUICK-17 (Tier S iter 2, 2026-05-27): defensa frente a species_id no ASCII
// snake_case. El sidecar `validate_visual_match` espera `^[a-z0-9_]+$` y
// rechaza con HTTP 400 después del network roundtrip (~150-400ms desperdiciados
// + log noise). Pre-validamos en frontend: si el id derivado del binomial
// contiene caracteres fuera de ese alfabeto (ej. `×` hybrid, espacios,
// mayúsculas que filtraron del modelo), degradamos a `no-binomial` sin pegar
// al sidecar. Bench V-03 detectó este caso con `Fragaria × ananassa`.
const VALID_SPECIES_ID = /^[a-z0-9_]+$/;

/**
 * Versión grounded de recognizeSpecies. Llama al modelo de visión Y
 * después valida el resultado contra el catálogo Chagra usando el tool
 * `validate_visual_match` del sidecar agro-mcp.
 *
 * Anti-alucinación: si el modelo vision devuelve "Mangosteenia colombiana"
 * (especie inexistente), el catálogo lo rechaza con `valid:false`. El
 * caller obtiene `_grounded.status` para decidir qué UX mostrar:
 *   - 'verified'         → catálogo confirma la sugerencia (verde).
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
  const finalize = (status, reason, validation = null, extras = {}) => {
    telemetryState.grounded_status = status;
    return {
      ...visionResult,
      _grounded: { status, reason, validation },
      _validation: validation,
      ...extras,
    };
  };

  // Si sidecar disabled, devolver lo del vision sin validar.
  if (!isSidecarEnabled()) {
    return finalize('sidecar-disabled', 'Validación catálogo deshabilitada.');
  }

  // Si offline, no podemos pegar al sidecar.
  if (!navigator.onLine) {
    return finalize('offline', 'Sin conexión, no se pudo verificar.');
  }

  // Derive species_id from scientific_name. Si no podemos derivar (binomial
  // ausente o malformado), tampoco podemos validar — degradamos.
  const speciesId = scientificToSpeciesId(visionResult.scientific_name);
  if (!speciesId) {
    return finalize('no-binomial', 'Nombre científico ambiguo.');
  }
  // QUICK-17: defensa extra antes del network call al sidecar. Si por alguna
  // razón scientificToSpeciesId produjo un id con caracteres no ASCII (ej.
  // future refactor o input borderline), evitamos el 400 sidecar y damos UX
  // honesto al operador.
  if (!VALID_SPECIES_ID.test(speciesId)) {
    return finalize('no-binomial', 'Nombre científico ambiguo (caracteres no válidos).');
  }

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
  const verified = primary?.valid === true;
  return finalize(
    verified ? 'verified' : 'rejected',
    verified
      ? 'Verificado en catálogo Chagra.'
      : 'Sugerencia no encontrada en catálogo.',
    primary || null,
    { _all_validations: result.results || [] },
  );
};

export const recognizeSpecies = async (imageBlob, { onToken, signal, _telemetryState } = {}) => {
  // QUICK-16: fail-fast si la imagen supera 2 MB. Mismo throw intencional
  // que en analyzeFoliage — el caller UI muestra toast user-friendly.
  validateImageSize(imageBlob);
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

  // Primary: llama3.2-vision:11b (0 parse errors bench 2026-05-26).
  try {
    return await runSpeciesRecognition(VISION_SPECIES_MODEL, base64, { onToken, signal, telemetryState });
  } catch (err) {
    console.warn(`[aiService] ${VISION_SPECIES_MODEL} failed, fallback to ${VISION_SPECIES_FALLBACK_MODEL}:`, err.message);
  }

  // Fallback 1: gemma3:4b (modelo de diagnóstico, ya cargado en VRAM normalmente).
  try {
    return await runSpeciesRecognition(VISION_SPECIES_FALLBACK_MODEL, base64, { onToken, signal, telemetryState });
  } catch (err) {
    console.warn(`[aiService] ${VISION_SPECIES_FALLBACK_MODEL} failed, fallback 2 to ${VISION_SPECIES_FALLBACK_2_MODEL}:`, err.message);
  }

  // Fallback 2: qwen2.5vl:7b (rápido pero parse errors frecuentes — último recurso).
  try {
    return await runSpeciesRecognition(VISION_SPECIES_FALLBACK_2_MODEL, base64, { onToken, signal, telemetryState });
  } catch (err) {
    console.warn('[aiService] Species recognition no disponible (3 fallbacks fallaron):', err.message);
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
  scientificToSpeciesId,
  VALID_SPECIES_ID,
};
