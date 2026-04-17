/**
 * entityExtractor.ts — Extracción de entidades agrícolas vía Ollama / qwen3.5:4b.
 *
 * Toma una transcripción en español y devuelve un array estricto de
 * { crop, quantity, location }. Aplica AbortController (timeout 20s) y
 * system prompt inmutable definido en ARCHITECTURE_VOICE_0.5.0.md §4.
 */

const OLLAMA_CHAT_URL = '/api/ollama/api/chat';
const MODEL = 'qwen3.5:4b';
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
- Convierte numerales en palabra a entero: "dos"=2, "tres"=3, "diez"=10, "veinte"=20.
- Si la cantidad no se menciona, omite la entrada completa.
- Si el lugar no se menciona, usa "" como location (NO omitas la entrada por eso).
- Nunca inventes datos que no estan en la transcripcion.
- Si no puedes extraer ninguna entidad valida, devuelve [].

Ejemplos:
Input: "Sembre cinco tomates en el invernadero"
Output: [{"crop":"tomate","quantity":5,"location":"invernadero"}]

Input: "Sembre tres arandanos"
Output: [{"crop":"arandano","quantity":3,"location":""}]

Input: "Hoy tuve un buen dia"
Output: []`;

export interface ExtractedAgriEntity {
  crop: string;
  quantity: number;
  location: string;
}

const isValidEntity = (e: unknown): e is ExtractedAgriEntity => {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['crop'] === 'string' &&
    (obj['crop'] as string).trim().length > 0 &&
    Number.isInteger(obj['quantity']) &&
    (obj['quantity'] as number) > 0 &&
    typeof obj['location'] === 'string'
  );
};

const parseJsonTolerant = (raw: unknown): unknown => {
  if (typeof raw !== 'string') return null;
  const direct = (() => {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  })();
  if (direct !== null) return direct;
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    return null;
  }
};

/**
 * Extrae entidades de una transcripción.
 */
export async function extractEntities(text: string): Promise<ExtractedAgriEntity[]> {
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
        think: false,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        options: { temperature: 0.1, num_predict: 2048 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = '';
      try {
        detail = await res.text();
      } catch (_) {
        /* noop */
      }
      throw new Error(`Ollama ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data?.message?.content ?? '';
    let parsed = parseJsonTolerant(content);

    if (parsed === null) {
      throw new Error('Respuesta del modelo no parseable como JSON');
    }

    if (!Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj?.['entities'])) parsed = obj['entities'];
      else if (Array.isArray(obj?.['data'])) parsed = obj['data'];
      else parsed = [];
    }

    return (parsed as unknown[])
      .filter(isValidEntity)
      .map((e) => ({
        crop: e.crop.toLowerCase().trim(),
        quantity: Math.floor(e.quantity),
        location: (e.location || '').trim(),
      }));
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Tiempo agotado al extraer entidades');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export { SYSTEM_PROMPT, MODEL };
