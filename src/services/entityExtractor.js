/**
 * entityExtractor.js — Extracción de entidades agrícolas vía Ollama / qwen3.5:4b.
 *
 * Toma una transcripción en español y devuelve un array estricto de
 * { crop, quantity, location }. Aplica AbortController (timeout 20s) y
 * system prompt inmutable definido en ARCHITECTURE_VOICE_0.5.0.md §4.
 *
 * Desde v0.6.0 consume la respuesta en streaming NDJSON a través de
 * `streamOllama` y acepta `onToken` para que la UI muestre el JSON
 * apareciendo carácter-a-carácter mientras el modelo genera.
 */

import { streamOllama } from './ollamaStream';

const OLLAMA_CHAT_URL = '/api/ollama/api/chat';
const MODEL = 'qwen3.5:4b';
// qwen3 puede tardar 25-35s en CPU incluso con thinking desactivado.
// Nginx permite hasta 120s en /api/ollama/; 60s cliente es el punto medio seguro.
const TIMEOUT_MS = 60000;

const SYSTEM_PROMPT = `Eres un extractor de entidades agricolas. Recibes una transcripcion en espanol de un operador registrando siembras. Devuelves EXCLUSIVAMENTE un array JSON valido, sin texto adicional, sin markdown.

Schema:
[
  {
    "crop": "<cultivo en minusculas>",
    "quantity": <entero positivo>,
    "location": "<lugar tal como lo dice el operador, o cadena vacia '' si no se menciona>"
  }
]

Reglas:
- Convierte numerales en palabra a entero: "dos"=2, "tres"=3, "diez"=10, "veinte"=20, "cien"=100, "doscientos"=200, "mil"=1000.
- Si la cantidad no se menciona, omite la entrada completa.
- Si el lugar no se menciona, usa "" como location (NO omitas la entrada por eso).
- MULTI-ESPECIE en una grabacion: si el operador menciona varios cultivos separados por "y", "luego", "tambien", "ademas", devuelve UN OBJETO POR CADA CULTIVO. Cada uno hereda la location si solo se menciona al final aplicable a todos.
- Nunca inventes datos que no estan en la transcripcion.
- Si no puedes extraer ninguna entidad valida, devuelve [].

Ejemplos:
Input: "Sembre cinco tomates en el invernadero"
Output: [{"crop":"tomate","quantity":5,"location":"invernadero"}]

Input: "Sembre tres arandanos"
Output: [{"crop":"arandano","quantity":3,"location":""}]

Input: "Sembre cien cafes en la parcela tres"
Output: [{"crop":"cafe","quantity":100,"location":"parcela tres"}]

Input: "Sembre cinco cafes y treinta lechugas en el balcon"
Output: [{"crop":"cafe","quantity":5,"location":"balcon"},{"crop":"lechuga","quantity":30,"location":"balcon"}]

Input: "Sembre veinte fresas en la cama uno y luego diez tomates en la cama dos"
Output: [{"crop":"fresa","quantity":20,"location":"cama uno"},{"crop":"tomate","quantity":10,"location":"cama dos"}]

Input: "Hoy tuve un buen dia"
Output: []`;

// location puede venir vacia cuando el operador no menciona el lugar;
// la UI resuelve al DEFAULT_LOCATION_ID en ese caso (ver VoiceConfirmation).
const isValidEntity = (e) =>
  e &&
  typeof e.crop === 'string' && e.crop.trim().length > 0 &&
  Number.isInteger(e.quantity) && e.quantity > 0 &&
  typeof e.location === 'string';

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
 * @param {Object} [options]
 * @param {Function} [options.onToken] — callback (chunk, fullText) invocado
 *        por cada token emitido por el modelo. La UI lo usa para mostrar la
 *        respuesta en streaming con efecto typewriter.
 * @returns {Promise<Array<{crop:string, quantity:number, location:string}>>}
 * @throws {Error} si el modelo no responde, excede timeout o devuelve JSON inválido.
 */
export async function extractEntities(text, { onToken } = {}) {
  if (!text || typeof text !== 'string') return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const content = await streamOllama(
      OLLAMA_CHAT_URL,
      {
        model: MODEL,
        format: 'json',
        // qwen3 tiene "thinking mode" siempre activo por default; consume
        // todos los num_predict razonando antes de emitir content y deja
        // content="". think:false desactiva esa cadena de razonamiento.
        think: false,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        options: { temperature: 0.1, num_predict: 2048 },
      },
      onToken,
      { signal: controller.signal },
    );
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
        location: (e.location || '').trim(),
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
