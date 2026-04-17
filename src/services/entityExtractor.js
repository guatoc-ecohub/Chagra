/**
 * entityExtractor.js — Extracción de entidades agrícolas vía Ollama / qwen3.5:4b.
 *
 * Toma una transcripción en español y devuelve un array estricto de
 * { crop, quantity, location }. Aplica AbortController (timeout 20s) y
 * system prompt inmutable definido en ARCHITECTURE_VOICE_0.5.0.md §4.
 */

const OLLAMA_CHAT_URL = '/api/ollama/api/chat';
const MODEL = 'qwen3.5:4b';
const TIMEOUT_MS = 20000;

const SYSTEM_PROMPT = `Eres un extractor de entidades agrícolas. Recibes una transcripción en español de un operador agroecológico. Devuelves EXCLUSIVAMENTE un array JSON válido, sin texto adicional, sin markdown, sin explicación.

Schema estricto:
[
  {
    "crop": "<nombre del cultivo en minúsculas, singular>",
    "quantity": <entero positivo>,
    "location": "<nombre del lugar tal como lo dice el operador>"
  }
]

Si no puedes extraer ninguna entidad válida, devuelve [].
Nunca inventes datos. Si la cantidad no se menciona, omite la entrada.`;

const isValidEntity = (e) =>
  e &&
  typeof e.crop === 'string' && e.crop.trim().length > 0 &&
  Number.isInteger(e.quantity) && e.quantity > 0 &&
  typeof e.location === 'string' && e.location.trim().length > 0;

const parseJsonTolerant = (raw) => {
  if (typeof raw !== 'string') return null;
  const direct = (() => { try { return JSON.parse(raw); } catch (_) { return null; } })();
  if (direct !== null) return direct;
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (_) { return null; }
};

/**
 * Extrae entidades de una transcripción.
 *
 * @param {string} text — transcripción en español.
 * @returns {Promise<Array<{crop:string, quantity:number, location:string}>>}
 * @throws {Error} si el modelo no responde, excede timeout o devuelve JSON inválido.
 */
export async function extractEntities(text) {
  if (!text || typeof text !== 'string') return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(OLLAMA_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        options: { temperature: 0.1, num_predict: 512 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch (_) { /* noop */ }
      throw new Error(`Ollama ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.message?.content ?? '';
    let parsed = parseJsonTolerant(content);

    if (parsed === null) {
      throw new Error('Respuesta del modelo no parseable como JSON');
    }

    if (!Array.isArray(parsed)) {
      if (Array.isArray(parsed?.entities)) parsed = parsed.entities;
      else if (Array.isArray(parsed?.data)) parsed = parsed.data;
      else parsed = [];
    }

    return parsed
      .filter(isValidEntity)
      .map((e) => ({
        crop: e.crop.toLowerCase().trim(),
        quantity: Math.floor(e.quantity),
        location: e.location.trim(),
      }));
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Tiempo agotado al extraer entidades');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export { SYSTEM_PROMPT, MODEL };
