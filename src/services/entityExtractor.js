/**
 * entityExtractor.js — Extracción de entidades agrícolas vía Ollama / gemma3:4b.
 *
 * Toma una transcripción en español y devuelve un array estricto de
 * { crop, quantity, location }. Aplica AbortController (timeout 20s) y
 * system prompt inmutable definido en ARCHITECTURE_VOICE_0.5.0.md §4.
 *
 * Desde v0.6.0 consume la respuesta en streaming NDJSON a través de
 * `streamOllama` y acepta `onToken` para que la UI muestre el JSON
 * apareciendo carácter-a-carácter mientras el modelo genera.
 *
 * 2026-05-13: swap qwen3.5:4b → gemma3:4b. qwen35 architecture cuelga
 * determinísticamente en Ollama 0.23.1 (timeout >120s, retorna 500).
 * gemma3:4b responde ~10s con calidad equivalente para extracción JSON.
 */

import { streamOllama } from './ollamaStream';

const OLLAMA_CHAT_URL = '/api/ollama/api/chat';
const MODEL = 'gemma3:4b';
// gemma3:4b en CPU responde ~10-15s para extracción JSON con format:json.
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
- VERBOS: el operador puede decir "sembré", "planté", "puse", "trasplante", "metí", "agregué" — todos se interpretan como registro de planta nueva. El verbo en sí no es la entidad; lo que importa es {cultivo, cantidad, lugar}.
- MULTI-ESPECIE en una grabacion: si el operador menciona varios cultivos separados por "y", "luego", "tambien", "ademas", devuelve UN OBJETO POR CADA CULTIVO. Cada uno hereda la location si solo se menciona al final aplicable a todos.
- Nombres de frutas y cultivos son LITERALES. Si el operador dice "banano", el crop debe ser "banano". Si dice "manzana", el crop debe ser "manzana". NO cambiar, traducir ni sustituir nunca.
- Cultivos comunes colombianos: banano, platano, cafe, yuca, papaya, mango, limon, mandarina, naranja, aguacate, tomate, lechuga, cilantro, yerbabuena, albahaca, cebolla, ajo, zanahoria, remolacha, espinaca, acelga, rabano, pepino, ahuyama, calabacin, frijol, maiz, papa, quinua, cubio, ulluco, oca, arracacha, mora, fresa, uchuva, lulo, tomate de arbol, curuba, granadilla, maracuya, guayaba, guanabana, anon, chirimoya.
- NORMALIZACIÓN de errores comunes de transcripción (Whisper a veces parte palabras o las distorsiona). Mapea SIEMPRE a la forma canónica:
    "al vacas" → "albahaca"     (Whisper parte alba+haca en "al"+"vacas")
    "al baca"  → "albahaca"
    "alvahaca" → "albahaca"
    "abahaca"  → "albahaca"
    "habahaca" → "albahaca"
    "agua acate" → "aguacate"   (no "agua acate" como dos palabras)
    "yer ba buena" → "yerbabuena"
    "ye va buena" → "yerbabuena"
    "ce bolla"  → "cebolla"
    "papa ya"   → "papaya"
    "uchu va"   → "uchuva"
    "ma raca" / "maracuya" tienen la misma raíz; usa "maracuya".
  Cuando hay duda sobre dos palabras pegadas o separadas, prefiere la
  forma de UN cultivo conocido si suena similar.
- Nunca inventes datos que no estan en la transcripcion.
- Si no puedes extraer ninguna entidad valida, devuelve [].

Ejemplos de cultivos colombianos:
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

Input: "Plante dos guayabos en la entrada"
Output: [{"crop":"guayabo","quantity":2,"location":"entrada"}]

Input: "Puse cinco aguacates en el patio"
Output: [{"crop":"aguacate","quantity":5,"location":"patio"}]

Input: "Sembre quince bananos"
Output: [{"crop":"banano","quantity":15,"location":""}]

Input: "Plante tres platanos en la zona norte"
Output: [{"crop":"platano","quantity":3,"location":"zona norte"}]

Input: "Sembre diez mangos y veinte papayas"
Output: [{"crop":"mango","quantity":10,"location":""},{"crop":"papaya","quantity":20,"location":""}]

Input: "Puse cuatro limones en el huerto"
Output: [{"crop":"limon","quantity":4,"location":"huerto"}]

Input: "Sembre dos yucas en el solar"
Output: [{"crop":"yuca","quantity":2,"location":"solar"}]

Input: "Sembre cuatro al vacas, siete pepinos y ocho naranjas en guatoc"
Output: [{"crop":"albahaca","quantity":4,"location":"guatoc"},{"crop":"pepino","quantity":7,"location":"guatoc"},{"crop":"naranja","quantity":8,"location":"guatoc"}]

Input: "Plante diez abahaca"
Output: [{"crop":"albahaca","quantity":10,"location":""}]

Input: "Sembre tres agua acates en el patio"
Output: [{"crop":"aguacate","quantity":3,"location":"patio"}]

Input: "Sembre seis yer ba buena y cinco ce bolla"
Output: [{"crop":"yerbabuena","quantity":6,"location":""},{"crop":"cebolla","quantity":5,"location":""}]

Input: "Plante doce ulluco y diez cubio en la cama tres"
Output: [{"crop":"ulluco","quantity":12,"location":"cama tres"},{"crop":"cubio","quantity":10,"location":"cama tres"}]

Input: "Hoy tive un buen dia"
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
  const cleanedParsed = (() => { try { return JSON.parse(cleaned); } catch (_) { return null; } })();
  if (cleanedParsed !== null) return cleanedParsed;
  // Bench gemma3:4b 2026-05-15 (Ollama 0.23.1): cuando el modelo es chico
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

export { SYSTEM_PROMPT, MODEL };
