/**
 * aiService.js — Inferencia de visión via Ollama / Gemma 4 (Fase 20.2b).
 *
 * Envía imágenes codificadas en Base64 al endpoint local del Nodo Alpha
 * para diagnóstico fitosanitario automatizado. Desde v0.6.0 consume la
 * respuesta en streaming NDJSON via `streamOllama`, permitiendo a la UI
 * mostrar el diagnóstico token-por-token con efecto typewriter.
 */

import { streamOllama } from './ollamaStream';

// Ruta relativa: Nginx proxea /api/ollama/ → http://localhost:11434/
// Ruta final: /api/ollama/api/generate → http://localhost:11434/api/generate
const OLLAMA_BASE = '/api/ollama';
const OLLAMA_URL = `${OLLAMA_BASE}/api/generate`;
// Gemma 3 4B (oficial Google, multimodal nativo). Reemplaza paligemma
// porque el runner Llama de Ollama crashea con arquitectura PaliGemma.
const MODEL = 'gemma3:4b';

const DIAGNOSIS_PROMPT = 'detect disease, nutrient deficiency, and overall plant health. Output JSON: {"score": 0-100, "issues": [], "treatment": ""}';

// Species recognition (EXPERIMENTAL — feature flag operador 2026-05-03 Miguel).
// Mismo modelo gemma3:4b multimodal pero distinto prompt. Output JSON
// estructurado para que la UI pueda autocompletar SpeciesSelect con la
// sugerencia + confidence. Scope esperado: vegetales y frutales latinoamericanos
// comunes (café, gulupa, mora, fresa, lechuga, tomate, papa, plátano, etc.).
// Edge cases conocidos: angles raros, hojas aisladas sin contexto, especies
// muy nicho fuera del training de Gemma3. Se acompaña de botón "Reportar
// problema" que graba audio + ctx para iterar/eliminar el feature.
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
 * Analiza una imagen de follaje via Ollama (modelo multimodal) en streaming.
 *
 * @param {Blob} imageBlob — imagen optimizada (WebP)
 * @param {Object} [options]
 * @param {Function} [options.onToken] — callback (chunk, fullText) invocado
 *        por cada token emitido por el modelo. La UI lo usa para mostrar el
 *        diagnóstico apareciendo carácter-a-carácter.
 * @param {AbortSignal} [options.signal] — cancelación externa.
 * @returns {Promise<{score: number, issues: string[], treatment_suggestion: string} | null>}
 *          null si el modelo no responde o no es multimodal.
 */
export const analyzeFoliage = async (imageBlob, { onToken, signal } = {}) => {
  try {
    const base64 = await blobToBase64(imageBlob);

    // streamOllama hace fetch con stream:true y procesa el NDJSON del body.
    // No usa fetchFromFarmOS para evitar inyección de headers OAuth — Ollama
    // local no requiere autenticación.
    const text = (await streamOllama(
      OLLAMA_URL,
      { model: MODEL, prompt: DIAGNOSIS_PROMPT, images: [base64] },
      onToken,
      { signal },
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
 * Reconoce especie de planta a partir de una foto (EXPERIMENTAL — Miguel
 * 2026-05-03). Mismo backend gemma3:4b multimodal pero prompt distinto.
 *
 * @param {Blob} imageBlob — foto JPEG/WebP comprimida
 * @param {Object} [options]
 * @param {Function} [options.onToken] — streaming token callback
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{common_name_es: string, scientific_name: string, confidence: number, alternatives: Array} | null>}
 *          null si modelo falla o no parseable. Caller debe distinguir
 *          confidence ≥0.7 (sugerir directo) vs <0.7 (mostrar alternativas
 *          y dejar al operario elegir).
 */
export const recognizeSpecies = async (imageBlob, { onToken, signal } = {}) => {
  try {
    const base64 = await blobToBase64(imageBlob);
    const text = (await streamOllama(
      OLLAMA_URL,
      { model: MODEL, prompt: SPECIES_PROMPT, images: [base64] },
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
    };
  } catch (err) {
    console.warn('[aiService] Species recognition no disponible:', err.message);
    return null;
  }
};

export default analyzeFoliage;
