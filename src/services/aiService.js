/**
 * aiService.js — Inferencia de visión via Ollama / Gemma 4 (Fase 20.2b).
 *
 * Envía imágenes codificadas en Base64 al endpoint local del Nodo Alpha
 * para diagnóstico fitosanitario automatizado.
 */

// Ruta relativa: Nginx proxea /api/ollama/ → http://localhost:11434/
// Ruta final: /api/ollama/api/generate → http://localhost:11434/api/generate
const OLLAMA_BASE = '/api/ollama';
const OLLAMA_URL = `${OLLAMA_BASE}/api/generate`;
const MODEL = 'jyan1/paligemma-mix-224';

const DIAGNOSIS_PROMPT = 'detect disease, nutrient deficiency, and overall plant health. Output JSON: {"score": 0-100, "issues": [], "treatment": ""}';

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
 * Analiza una imagen de follaje via Ollama (modelo multimodal).
 *
 * @param {Blob} imageBlob — imagen optimizada (WebP)
 * @returns {Promise<{score: number, issues: string[], treatment_suggestion: string} | null>}
 *          null si el modelo no responde o no es multimodal.
 */
export const analyzeFoliage = async (imageBlob) => {
  try {
    const base64 = await blobToBase64(imageBlob);

    // Fetch directo sin Bearer — Ollama local no requiere autenticación.
    // No usar fetchFromFarmOS para evitar inyección de headers OAuth.
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: DIAGNOSIS_PROMPT,
        images: [base64],
        stream: false,
      }),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch (_) { /* noop */ }
      console.warn(`[aiService] Ollama ${response.status} ${response.statusText}. Body: ${detail.slice(0, 200)}`);
      return null;
    }

    const data = await response.json();
    const text = (data.response || '').trim();

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

export default analyzeFoliage;
