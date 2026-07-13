/**
 * entityExtractor.js — Extracción de entidades agrícolas vía Ollama.
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
 * El modelo configurado se eligió por estabilidad en Ollama y por calidad
 * equivalente para extracción JSON frente a alternativas que colgaban.
 */

const EXTRACTION_TEMPERATURE = 0.1;

import { streamOllama } from './ollamaStream';
import { registry } from '../core/moduleRegistry';
import { parseJsonTolerant as parseJsonTolerantUtil } from '../utils/parseJsonTolerant';

const OLLAMA_CHAT_URL = '/api/ollama/api/chat';
// 2026-06-11: gemma3:4b NO co-reside con granite3.3:8b pinned "Forever" (8.3GB
// → solo ~3.7GB libres; gemma3:4b 3.3GB + contexto NO carga limpio) → la
// extracción de voz fallaba (0 plantas: "Sembré 10 fresas y 4 lechugas…" no
// resolvía nada porque el call a gemma3:4b se quedaba sin respuesta/timeout).
// Fix: usar granite3.3 (YA cargado, hot) — extrae el JSON bien sin esperar
// carga ni evictar el chat. Verificado en vivo: granite3.3 devuelve
// {crop,quantity,location} correcto donde gemma3:4b daba vacío.
const MODEL = 'granite3.3:8b';
// El modelo responde en pocos segundos para extracción JSON con format:json.
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
/** @type {string|null} */
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

/**
 * Permite invalidar el cache en tests unitarios que registren módulos Pro
 * mock después del primer uso.
 * @returns {void}
 */
export function _resetSystemPromptCache() {
  _cachedPrompt = null;
}

/**
 * Valida que una entidad tenga los campos requeridos con tipos correctos.
 * @param {*} e
 * @returns {boolean}
 */
const isValidEntity = (e) =>
  e &&
  typeof e.crop === 'string' && e.crop.trim().length > 0 &&
  Number.isInteger(e.quantity) && e.quantity > 0 &&
  typeof e.location === 'string';

/**
 * Parser tolerante de la salida NLU del modelo (QUICK-6 #269).
 *
 * Delega en el util canónico `parseJsonTolerant` (src/utils), que además de
 * limpiar fences y prosa, REPARA truncados del stream (corte por
 * num_predict / stream cortado): cierra llaves/corchetes abiertos, cierra
 * string abierto, recorta coma/dos-puntos colgantes. Antes este módulo tenía
 * un parser local más débil que sólo extraía el primer `[...]` y se rendía
 * ante un array truncado — perdiendo la entidad completa.
 *
 * Devuelve el valor parseado o `null`. Loguea (debug) cuando hubo reparación
 * para telemetría sin romper la UX. ANTI-ALUCINACIÓN: el repair sólo cierra
 * estructura, nunca inventa campos; el validador `isValidEntity` de más abajo
 * descarta cualquier entidad reparada a la que le falten campos requeridos.
 *
 * @param {string} raw
 * @returns {any|null}
 */
const parseJsonTolerant = (raw) => {
  if (typeof raw !== 'string') return null;
  const r = parseJsonTolerantUtil(raw);
  if (!r.ok) return null;
  if (r.repaired) {
    console.debug('[entityExtractor] NLU JSON reparado vía', r.strategy);
  }
  return r.value;
};

/**
 * Extrae entidades de una transcripción.
 *
 * @param {string} text — transcripción en español.
 * @param {Object} [options]
 * @param {Function} [options.onToken] - callback (chunk, fullText) invocado
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
    // Según bench interno: con `format: 'json'` Ollama fuerza
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
        options: { temperature: EXTRACTION_TEMPERATURE, num_predict: 2048 },
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
      // Algunos modelos chicos (sin format:json en edge cases)
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
    if (/** @type {Error} */ (err).name === 'AbortError') {
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
