/**
 * voiceRouter — Orquestador del registro por voz unificado (#23).
 *
 * Punto único que CLASIFICA la intención entre todos los tipos y EXTRAE los
 * campos de una transcripción. Estrategia de doble vía (grounded-first, con
 * red de seguridad determinística):
 *
 *   1. Base on-device SIEMPRE: corre `classifyAndExtractLocal` (puro, sin red).
 *      Es el piso garantizado — funciona offline y groundea la especie contra
 *      el catálogo estático (`CROP_TAXONOMY`).
 *   2. Refinamiento grounded (online): si hay conexión, consulta el NLU del
 *      sidecar (Ollama, modelo `ENV.NLU_MODEL`) con un prompt unificado para
 *      AFINAR intención y RELLENAR campos que la heurística no sacó. NUNCA
 *      degrada por debajo del on-device: si el LLM falla, se descarta y queda
 *      la base.
 *
 * Anti-alucinación (doctrina del repo): la ESPECIE la decide siempre el
 * catálogo (base.species), nunca el LLM — el modelo solo aporta un `hint`
 * textual editable. Así la trampa gulupa≠guayaba se respeta venga de donde
 * venga la clasificación.
 */

import { streamOllama } from './ollamaStream';
import { parseJsonTolerant } from '../utils/parseJsonTolerant';
import { ENV } from '../config/env';
import { classifyAndExtractLocal, INTENTS } from './voiceFieldExtractor';

const OLLAMA_CHAT_URL = '/api/ollama/api/chat';
const TIMEOUT_MS = 45000;
const TEMPERATURE = 0.1;

const VALID_INTENTS = new Set(Object.values(INTENTS));

/**
 * Prompt unificado de clasificación + extracción. Pide JSON estricto. El
 * modelo clasifica entre los 7 tipos y extrae los campos presentes; la
 * resolución fina (especie canónica, GPS, persistencia) la hace el cliente.
 */
const SYSTEM_PROMPT = `Eres el clasificador de registros agrícolas por voz de Chagra. Recibes la transcripción de un campesino colombiano y devuelves EXCLUSIVAMENTE un objeto JSON válido, sin markdown, sin texto extra.

Clasifica la INTENCIÓN principal en uno de:
- "registrar_planta": describe una planta que YA TIENE en pie (ej. "aquí tengo un durazno de 2 metros floriado"). NO es una siembra.
- "registrar_siembra": acaba de sembrar/plantar/trasplantar (verbo sembré/planté/puse).
- "registrar_cosecha": cosechó/recogió/cogió producto.
- "registrar_insumo": aplicó un insumo/bioinsumo (caldo bordelés, biol, abono...).
- "registrar_mantenimiento": labor de manejo (poda, deshierbe, guadaña, aporque...).
- "registrar_observacion": describe síntomas/estado sin acción (manchas, hojas comidas, fenología).
- "reportar_plaga": reporta una plaga/invasora (hormiga arriera, nido, "acabando con...").

Schema EXACTO:
{
  "intent": "<una de las 7>",
  "especie": "<nombre común tal como lo dijo, o ''>",
  "altura_m": <número o null>,
  "ancho_m": <número o null>,
  "cantidad": <número o null>,
  "unidad": "<unidades|arroba|kg|''>",
  "fenologia": "<floración|maduración|grano verde|espigado|cosecha|establecimiento|cuajado|''>",
  "sintomas": ["<frase corta>"],
  "insumo": "<producto aplicado o ''>",
  "labores": ["<poda|deshierbe|...>"],
  "lugar": "<lugar tal como lo dijo o ''>",
  "tiempo": "<hoy|ayer|hace N dias|esta mañana|ahora|''>"
}

Reglas:
- Numerales en palabra a número: "dos"=2, "veinte"=20, "cincuenta"=50.
- NO inventes la especie ni su nombre científico: copia el nombre común literal.
- Si un campo no aplica, usa null (números) o '' / [] (texto/listas).
- Devuelve SOLO el objeto JSON.`;

/** Construye un ejemplo few-shot del durazno (ancla la salida). */
const FEW_SHOT_USER = 'aquí tengo un durazno que tiene como dos metros de alto y está floriado';
const FEW_SHOT_ASSISTANT = JSON.stringify({
  intent: 'registrar_planta', especie: 'durazno', altura_m: 2, ancho_m: null,
  cantidad: null, unidad: '', fenologia: 'floración', sintomas: [], insumo: '',
  labores: [], lugar: 'aquí', tiempo: '',
});

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : []);
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Llama al NLU del sidecar y devuelve el objeto parseado, o null si falla
 * (offline, timeout, JSON inválido). Nunca lanza.
 */
async function callNlu(text, { onToken } = /** @type {any} */ ({})) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const content = await streamOllama(
      OLLAMA_CHAT_URL,
      {
        model: ENV.NLU_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: FEW_SHOT_USER },
          { role: 'assistant', content: FEW_SHOT_ASSISTANT },
          { role: 'user', content: text },
        ],
        options: { temperature: TEMPERATURE, num_predict: 512 },
      },
      onToken,
      { signal: controller.signal },
    );
    const parsed = parseJsonTolerant(content);
    if (!parsed.ok || !parsed.value || typeof parsed.value !== 'object') return null;
    return parsed.value;
  } catch (_) {
    return null; // offline / down / abort → degrade a on-device
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Funde el refinamiento del LLM sobre la base on-device SIN regresar.
 * La especie queda intacta (catálogo manda); el LLM solo aporta hint + rellena
 * huecos.
 */
function mergeNlu(base, nlu) {
  if (!nlu) return base;
  const merged = { ...base, source: 'sidecar' };

  // Intención: respeta la del LLM solo si es una de las válidas.
  const llmIntent = str(nlu.intent);
  if (VALID_INTENTS.has(llmIntent)) merged.intent = llmIntent;

  // Medidas: la base (determinística) manda; el LLM rellena lo que falte.
  merged.measures = { ...base.measures };
  if (merged.measures.altura_m == null && num(nlu.altura_m) != null) merged.measures.altura_m = num(nlu.altura_m);
  if (merged.measures.ancho_m == null && num(nlu.ancho_m) != null) merged.measures.ancho_m = num(nlu.ancho_m);
  if (merged.measures.cantidad == null && num(nlu.cantidad) != null) {
    merged.measures.cantidad = num(nlu.cantidad);
    if (str(nlu.unidad)) merged.measures.unidad = str(nlu.unidad);
  }

  // Fenología / síntomas / labores: une lo que el LLM agregue si la base vacía.
  if (base.phenology.length === 0 && str(nlu.fenologia)) {
    merged.phenology = [{ raw: str(nlu.fenologia), canon: str(nlu.fenologia) }];
  }
  if (base.symptoms.length === 0 && arr(nlu.sintomas).length) merged.symptoms = arr(nlu.sintomas);
  if (base.labors.length === 0 && arr(nlu.labores).length) merged.labors = arr(nlu.labores);
  if (!base.input && str(nlu.insumo)) merged.input = str(nlu.insumo);

  // Especie: el catálogo manda (base.species). El nombre del LLM es solo hint
  // editable, jamás reemplaza el slug groundeado.
  merged.speciesHint = str(nlu.especie) || null;

  return merged;
}

/**
 * Clasifica + extrae una transcripción. Grounded-first con fallback on-device.
 *
 * @param {string} text — transcripción en español.
 * @param {object} [opts]
 * @param {number} [opts.now=Date.now()] - referencia para el tiempo relativo.
 * @param {Function} [opts.onToken] - streaming del NLU para UI typewriter.
 * @param {boolean} [opts.preferLocal=false] - fuerza solo on-device (tests).
 * @returns {Promise<object>} registro unificado (ver voiceFieldExtractor).
 */
export async function classifyAndExtract(text, opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const base = classifyAndExtractLocal(text, { now });

  // Offline o forzado local: sin LLM, base on-device es la respuesta.
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  if (opts.preferLocal || !online) return base;

  const nlu = await callNlu(text, { onToken: opts.onToken });
  return mergeNlu(base, nlu);
}

export default classifyAndExtract;
