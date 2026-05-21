/**
 * entityExtractor.js — Extracción de entidades agrícolas vía Ollama / gemma3:4b.
 *
 * Toma una transcripción en español y devuelve un array estricto de
 * { crop, quantity, location }. Aplica AbortController (timeout 20s) y
 * resuelve el SYSTEM_PROMPT dinámicamente.
 *
 * SYSTEM_PROMPT en este archivo es un STUB OSS mínimo (3 few-shots
 * genéricos, estructura del schema, reglas básicas). Las normalizaciones
 * avanzadas de Whisper (es-CO) y los 13 few-shots colombianos curados
 * viven en la capa privada `chagra-pro` y se resuelven en runtime vía
 * `moduleRegistry.byCapability('voice-entity-extractor-prompt')`. Si el
 * módulo Pro está disponible, su prompt reemplaza al stub; si no, el
 * stub OSS funciona estandalone.
 *
 * Desde v0.6.0 consume la respuesta en streaming NDJSON a través de
 * `streamOllama` y acepta `onToken` para que la UI muestre el JSON
 * apareciendo carácter-a-carácter mientras el modelo genera.
 *
 * 2026-05-13: swap qwen3.5:4b → gemma3:4b. qwen35 architecture cuelga
 * determinísticamente en Ollama 0.23.x (timeout >120s, retorna 500).
 * gemma3:4b responde ~10s con calidad equivalente para extracción JSON.
 */

import { streamOllama } from './ollamaStream';
import { registry } from '../core/moduleRegistry';

const OLLAMA_CHAT_URL = '/api/ollama/api/chat';
const MODEL = 'gemma3:4b';
// gemma3:4b en CPU responde ~10-15s para extracción JSON con format:json.
// Nginx permite hasta 120s en /api/ollama/; 60s cliente es el punto medio seguro.
const TIMEOUT_MS = 60000;

/**
 * Stub OSS del SYSTEM_PROMPT.
 *
 * Estructura idéntica al prompt full (schema + reglas básicas + 3
 * few-shots genéricos) para que el contrato de entrada/salida del
 * extractor sea estable independientemente de si la capa Pro está
 * presente. NO contiene las normalizaciones Whisper específicas ni los
 * few-shots colombianos curados — esas viven en la capa privada Pro
 * (ventaja competitiva, derivada de bench sobre audio del operador).
 */
const SYSTEM_PROMPT_STUB_OSS = `Eres un extractor de entidades agricolas. Recibes una transcripcion en espanol de un operador registrando siembras. Devuelves EXCLUSIVAMENTE un array JSON valido, sin texto adicional, sin markdown.

Schema:
[
  {
    "crop": "<cultivo en minusculas>",
    "quantity": <entero positivo>,
    "location": "<lugar tal como lo dice el operador, o cadena vacia '' si no se menciona>"
  }
]

Reglas:
- Convierte numerales en palabra a entero: "dos"=2, "tres"=3, "diez"=10, "veinte"=20, "cien"=100.
- Si la cantidad no se menciona, omite la entrada completa.
- Si el lugar no se menciona, usa "" como location (NO omitas la entrada por eso).
- VERBOS: "sembré", "planté", "puse" se interpretan como registro de planta nueva.
- MULTI-ESPECIE: si el operador menciona varios cultivos separados por "y" o "luego", devuelve UN OBJETO POR CADA CULTIVO. Hereda la location si aplica a todos.
- Nombres de cultivos son LITERALES (no traducir ni sustituir).
- Nunca inventes datos que no estan en la transcripcion.
- Si no puedes extraer ninguna entidad valida, devuelve [].

Ejemplos:
Input: "Sembre cinco tomates en el invernadero"
Output: [{"crop":"tomate","quantity":5,"location":"invernadero"}]

Input: "Sembre tres bananos"
Output: [{"crop":"banano","quantity":3,"location":""}]

Input: "Plante dos guayabos en la entrada y cinco mangos"
Output: [{"crop":"guayabo","quantity":2,"location":"entrada"},{"crop":"mango","quantity":5,"location":"entrada"}]`;

/**
 * Resuelve el SYSTEM_PROMPT activo: Pro full si está registrado, stub OSS
 * en caso contrario. Cachea el resultado por proceso para evitar repetir
 * dynamic imports en cada extracción.
 *
 * @returns {Promise<string>}
 */
let _cachedPrompt = null;
export async function resolveSystemPrompt() {
  if (_cachedPrompt !== null) return _cachedPrompt;
  const mods = registry.byCapability('voice-entity-extractor-prompt');
  if (mods.length > 0) {
    try {
      const mounted = await mods[0].mount();
      const api = mounted?.default;
      if (api && typeof api.systemPrompt === 'string' && api.systemPrompt.length > 0) {
        _cachedPrompt = api.systemPrompt;
        return _cachedPrompt;
      }
    } catch (_e) {
      // Fallback silencioso al stub OSS si el módulo Pro falla al cargar.
    }
  }
  _cachedPrompt = SYSTEM_PROMPT_STUB_OSS;
  return _cachedPrompt;
}

// Permite invalidar el cache en tests unitarios que registren módulos Pro
// mock después del primer uso.
export function _resetSystemPromptCache() {
  _cachedPrompt = null;
}

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
  const cleanedParsed = (() => { try { return JSON.parse(cleaned); } catch (_) { return null; } })();
  if (cleanedParsed !== null) return cleanedParsed;
  // Bench gemma3:4b 2026-05-15 (Ollama 0.23.x): cuando el modelo es chico
  // a veces emite texto antes/después del JSON. Última red: extraer el
  // primer [...] balanceado del raw. Solo soporta arrays top-level (que
  // es el schema esperado del SYSTEM_PROMPT).
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch (_) { /* noop */ } }
  return null;
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
    const systemPrompt = await resolveSystemPrompt();
    // Bench 2026-05-15 en gemma3:4b: con `format: 'json'` Ollama fuerza
    // un objeto JSON top-level único, lo que colapsa la salida a UN solo
    // `{crop, quantity, location}` incluso cuando el operador menciona
    // múltiples cultivos ("dos arvejas y tres papas" → solo extrae arvejas).
    // SIN format:json y dejando que el SYSTEM_PROMPT (con few-shots) guíe
    // al modelo, devuelve arrays correctos en todos los casos probados.
    const content = await streamOllama(
      OLLAMA_CHAT_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
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
      // Fallback: un único objeto {crop, quantity, location} → wrap en array.
      // Algunos modelos chicos (gemma3:4b sin format:json en edge cases)
      // emiten una sola entidad como objeto plano.
      else if (parsed && typeof parsed === 'object' && 'crop' in parsed) parsed = [parsed];
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

// Exporto el stub OSS como SYSTEM_PROMPT para preservar la API previa
// (consumidores legacy que imported { SYSTEM_PROMPT }). Sigue siendo el
// stub público — no el full Pro. Para usar el full, llamar
// `resolveSystemPrompt()` que respeta el moduleRegistry.
export { SYSTEM_PROMPT_STUB_OSS as SYSTEM_PROMPT, MODEL };
