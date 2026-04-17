/**
 * aiService.ts — Inferencia de visión via Ollama / Gemma 4 (Fase 20.2b).
 *
 * Envía imágenes codificadas en Base64 al endpoint local del Nodo Alpha
 * para diagnóstico fitosanitario automatizado.
 */

const OLLAMA_BASE = '/api/ollama';
const OLLAMA_URL = `${OLLAMA_BASE}/api/generate`;
const MODEL = 'gemma3:4b';

const DIAGNOSIS_PROMPT =
  'detect disease, nutrient deficiency, and overall plant health. Output JSON: {"score": 0-100, "issues": [], "treatment": ""}';

export interface FoliageDiagnosis {
  score: number;
  issues: string[];
  treatment_suggestion: string;
}

/**
 * Convierte un Blob a string Base64 (sin prefijo data:).
 */
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip "data:image/webp;base64," prefix
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Analiza una imagen de follaje via Ollama (modelo multimodal).
 */
export const analyzeFoliage = async (imageBlob: Blob): Promise<FoliageDiagnosis | null> => {
  try {
    const base64 = await blobToBase64(imageBlob);

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
      try {
        detail = await response.text();
      } catch (_) {
        /* noop */
      }
      console.warn(
        `[aiService] Ollama ${response.status} ${response.statusText}. Body: ${detail.slice(0, 200)}`
      );
      return null;
    }

    const data = (await response.json()) as { response?: string };
    const text = (data.response || '').trim();

    // Parsear JSON (Gemma puede envolver en markdown fences)
    const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as Partial<FoliageDiagnosis> & { treatment?: string };

    // Validación y normalización del shape
    if (typeof parsed.score !== 'number') parsed.score = 0;
    if (!Array.isArray(parsed.issues)) parsed.issues = [];
    parsed.treatment_suggestion = parsed.treatment_suggestion || parsed.treatment || '';

    return parsed as FoliageDiagnosis;
  } catch (err) {
    console.warn('[aiService] Diagnóstico no disponible:', (err as Error).message);
    return null;
  }
};

export default analyzeFoliage;
