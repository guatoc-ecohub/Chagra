/**
 * chipIntentRouter.js — Router PURO de los CHIPS DE MODO (A3/A4).
 *
 * Decisión operador 2026-06-02: la "caja de herramientas" del agente se
 * expone como chips de modo (estilo Gemini). Al tocar un chip, la intención
 * queda FORZADA y rutea DIRECTO a la capacidad determinística (un MCP tool
 * concreto), SALTANDO el NLU planner del sidecar.
 *
 * Racional: el NLU es el que misroutea (incidente "papa precio": el planner
 * mandaba una pregunta de precio al tool de precio cuando el usuario quería
 * la ficha de la papa, y viceversa). Si el usuario YA declaró su intención
 * tocando un chip, no hay nada que inferir — vamos directo al tool.
 *
 * Este módulo es PURO (sin red, sin React): mapea (intent, texto, opts) a un
 * "plan forzado" que el AgentScreen ejecuta sin pasar por `planNlu()`. Toda la
 * lógica de routing vive acá para poder testearla en aislamiento (TDD).
 *
 * CHIP_INTENTS y CHIP_DEFS se importan de agentCapabilities.js (fuente única
 * de verdad). Este módulo NO redefine esas constantes.
 *
 * Tools determinísticos (ya existen en el sidecar, ver sidecarClient.ALLOWED_TOOLS):
 *   - siembro      → get_species          (ficha + viabilidad de la especie)
 *   - calendario   → get_species          (época de siembra se deriva de la ficha;
 *                                           NO existe get_calendario_siembra dedicado)
 *   - plaga        → get_pest_controllers  (controladores agroecológicos de la plaga)
 *   - biopreparado → get_biopreparados     (recetas de biopreparados)
 *   - clima        → get_clima_ideam       (IDEAM nacional; requiere municipio)
 *   - restauracion → get_diseno_restauracion (sucesión ecológica con nativas;
 *                                           objetivo inferido del texto, default bosque)
 *   - silvopastoreo→ get_diseno_silvopastoril (forrajeras CIPAV; requiere altura)
 *   - paramo       → get_diseno_restauracion (objetivo='paramo'; especies ≥3000 msnm)
 *
 * Intents STUB (el backend aún NO existe — NO inventamos endpoints):
 *   - precio → SIPSA/DANE consulta directa no disponible (dataset ZIP federado).
 *   - deep   → investigación profunda multi-fuente sin pipeline implementado.
 *   Ambos devuelven un mensaje honesto "aún no disponible" en vez de routear
 *   a un tool fantasma.
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino. Todos los
 * strings visibles al campesino se redactan en neutro colombiano.
 */

import { CHIP_INTENTS, CHIP_DEFS } from './agentCapabilities.js';
export { CHIP_INTENTS, CHIP_DEFS };

const DEF_BY_INTENT = Object.freeze(
  CHIP_DEFS.reduce((acc, def) => {
    acc[def.intent] = def;
    return acc;
  }, {}),
);

/**
 * ¿Este intent es un STUB (backend no disponible aún)?
 * Devuelve true para 'precio' y 'deep' (kind:'stub' en el manifiesto): ambos
 * carecen de backend servible en esta versión y muestran un mensaje honesto
 * "aún no disponible" en vez de routear a un tool/path fantasma.
 * @param {string} intent
 * @returns {boolean}
 */
export function isStubIntent(intent) {
  const def = DEF_BY_INTENT[intent];
  return Boolean(def && def.kind === 'stub');
}

/**
 * ¿Este intent dispara el path LIVE de Deep Research (job async del sidecar)?
 *
 * B14: mientras la investigación profunda NO esté servible, 'deep' es kind
 * 'stub' en el manifiesto, así que esta función devuelve false para 'deep' y el
 * chip cae al stub honesto (mismo handler que 'precio'). La función se conserva
 * como punto de enganche: cuando el backend deep-research esté servido en prod
 * (feature flag VITE_DEEP_RESEARCH_ENABLED), basta volver 'deep' a kind 'deep'
 * en el manifiesto para reactivar el path live SIN tocar el AgentScreen.
 * @param {string} intent
 * @returns {boolean}
 */
export function isDeepResearchIntent(intent) {
  const def = DEF_BY_INTENT[intent];
  return Boolean(def && def.kind === 'deep');
}

/**
 * Mapea un chip (intención forzada) + texto del usuario a un plan
 * determinístico que el AgentScreen ejecuta SIN pasar por el NLU.
 *
 * @param {string} intent — uno de CHIP_INTENTS.
 * @param {string} text — texto crudo del usuario (lo que escribió en el input).
 * @param {object} [opts]
 * @param {string|null} [opts.municipio] — municipio de la finca activa (para clima).
 * @param {number|string|null} [opts.altitud] — altura de la finca/perfil en msnm
 *   (para restauración y silvopastoreo; silvopastoreo la EXIGE).
 * @param {string|null} [opts.pisoTermico] — piso térmico del perfil
 *   (frío/templado/cálido/páramo; se prioriza en silvopastoreo).
 * @returns {null | {
 *   intent: string,
 *   tool: string | null,        // tool determinístico, o null si stub
 *   args: object | null,        // args del tool (forma específica por tool)
 *   stub: boolean,              // true → no hay tool real
 *   stubResult: object | null,  // evidence sintética inyectable (ej. clima no_municipio)
 *   stubMessage: string | null, // mensaje honesto "aún no disponible" para el usuario
 *   prompt: string,             // texto del usuario trimmeado (lo que se manda al LLM/burbuja)
 *   skipNlu: true,              // SIEMPRE true: el chip salta el NLU planner
 * }}
 */
export function planForcedIntent(intent, text, opts = {}) {
  const def = DEF_BY_INTENT[intent];
  if (!def) return null;
  if (typeof text !== 'string') return null;
  const prompt = text.trim();
  if (!prompt) return null;

  const base = {
    intent,
    tool: null,
    args: null,
    stub: false,
    stubResult: null,
    stubMessage: null,
    prompt,
    skipNlu: true,
  };

  switch (intent) {
    case CHIP_INTENTS.siembro:
    case CHIP_INTENTS.calendario:
      // Ficha de especie. El calendario/época de siembra se deriva de la ficha
      // (no hay get_calendario_siembra dedicado en el sidecar). El grounding
      // trae piso térmico / ciclo y el LLM lo expone como época de siembra.
      return { ...base, tool: 'get_species', args: { query: prompt } };

    case CHIP_INTENTS.plaga:
      // Controladores agroecológicos de la plaga (AGE Cypher).
      return { ...base, tool: 'get_pest_controllers', args: { pest: prompt } };

    case CHIP_INTENTS.biopreparado:
      // Recetas de biopreparados del catálogo.
      return { ...base, tool: 'get_biopreparados', args: { query: prompt } };

    case CHIP_INTENTS.clima: {
      const municipio =
        typeof opts.municipio === 'string' && opts.municipio.trim()
          ? opts.municipio.trim()
          : null;
      if (!municipio) {
        // Sin municipio NO llamamos el tool: inyectamos evidence sintética
        // que obliga al LLM a PEDIR el municipio (NO inventar datos de IDEAM).
        // Mismo contrato que la heurística de clima existente en AgentScreen.
        return {
          ...base,
          tool: 'get_clima_ideam',
          args: { action: 'monthly_avg' },
          stub: true,
          stubResult: {
            available: false,
            reason: 'no_municipio',
            hint: 'pedirle al usuario su municipio para consultar IDEAM',
          },
        };
      }
      const desde = isoDaysAgo(30);
      return {
        ...base,
        tool: 'get_clima_ideam',
        args: { action: 'monthly_avg', municipio, metric: 'precipitation', desde },
      };
    }

    case CHIP_INTENTS.restauracion: {
      // Plan de sucesión ecológica con nativas (get_diseno_restauracion). El
      // objetivo se infiere del texto (ribera/quemado/cortafuegos/páramo/bosque).
      // La altura del perfil afina el rango altitudinal (opcional en la tool).
      // NO pasamos región: el set de restauración es pequeño (~17 especies) y
      // un filtro de región exclusivo vaciaría buckets — la altura ya acota el
      // piso térmico de forma robusta.
      const args = { objetivo: detectObjetivoRestauracion(prompt) };
      const altRest = toAltitud(opts.altitud);
      if (altRest != null) args.altitud_msnm = altRest;
      const invasora = detectInvasoraMencionada(prompt);
      if (invasora) args.invasora_mencionada = invasora;
      return { ...base, tool: 'get_diseno_restauracion', args };
    }

    case CHIP_INTENTS.paramo:
      // Restauración de páramo: reusa get_diseno_restauracion con objetivo
      // 'paramo' (la tool fuerza ≥3000 msnm). NO pasamos la altura de la finca:
      // puede estar por debajo del páramo y vaciaría el resultado — el objetivo
      // 'paramo' ya es el discriminador correcto.
      return {
        ...base,
        tool: 'get_diseno_restauracion',
        args: { objetivo: 'paramo' },
      };

    case CHIP_INTENTS.silvopastoreo: {
      // Arreglo silvopastoril (get_diseno_silvopastoril). La tool EXIGE altura.
      const altSilvo = toAltitud(opts.altitud);
      if (altSilvo == null) {
        // Sin altura NO llamamos el tool: evidence sintética que obliga al LLM
        // a PEDIR la altura/municipio (NO inventar). Mismo contrato que clima
        // sin municipio.
        return {
          ...base,
          tool: 'get_diseno_silvopastoril',
          args: null,
          stub: true,
          stubResult: {
            available: false,
            reason: 'no_altitud',
            hint: 'pedirle al usuario la altura de su finca (msnm) o su municipio para calcular el arreglo silvopastoril',
          },
        };
      }
      const args = { altitud: altSilvo };
      const piso = normalizePiso(opts.pisoTermico);
      if (piso) args.piso_termico = piso;
      const animal = detectAnimalSilvo(prompt);
      if (animal) args.animal = animal;
      return { ...base, tool: 'get_diseno_silvopastoril', args };
    }

    case CHIP_INTENTS.precio:
      // STUB: backend no implementado. NO inventamos endpoint.
      return { ...base, stub: true, stubMessage: def.stubMessage };

    case CHIP_INTENTS.deep:
      // STUB (B14): la investigación profunda aún no tiene backend servible en
      // prod (el job async vive detrás de VITE_DEEP_RESEARCH_ENABLED, off por
      // defecto). Devolvemos el mismo stub honesto que 'precio' — NO routeamos
      // a un path "live" inexistente. Coherente con el manifiesto (status 'soon')
      // y con el menú de capacidades, que ya pinta 'deep' como por-lanzar.
      return { ...base, stub: true, stubMessage: def.stubMessage };

    default:
      return null;
  }
}

/**
 * Fecha ISO (YYYY-MM-DD) de hace N días. Aislado para testabilidad y para no
 * acoplar el router a Date.now() en el switch.
 * @param {number} days
 * @returns {string}
 */
function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Coerce una altitud (number|string) a un entero msnm válido (0..6500), o null.
 * El rango lo exige el zod de las tools de diseño en el sidecar.
 * @param {number|string|null|undefined} raw
 * @returns {number|null}
 */
function toAltitud(raw) {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 6500) return null;
  return Math.round(n);
}

/**
 * Normaliza el piso térmico del perfil al vocabulario del enum de la tool
 * silvopastoril (frio|templado|calido|paramo, SIN tildes). Devuelve null si no
 * mapea (la tool lo trata como opcional).
 * @param {string|null|undefined} piso
 * @returns {('frio'|'templado'|'calido'|'paramo')|null}
 */
const PISO_NORMALIZE = Object.freeze({
  frio: 'frio',
  frío: 'frio',
  templado: 'templado',
  medio: 'templado',
  calido: 'calido',
  cálido: 'calido',
  paramo: 'paramo',
  páramo: 'paramo',
});

function normalizePiso(piso) {
  if (typeof piso !== 'string') return null;
  const key = piso.trim().toLowerCase();
  return PISO_NORMALIZE[key] ?? null;
}

// Detección IN-MEMORY (determinística, sin red) del objetivo de restauración a
// partir del texto del usuario. Orden de prioridad: páramo > cortafuegos >
// post-incendio > ribera > bosque (default). Coincide con el enum de la tool.
const RE_PARAMO = /\bp[áa]ramo\b/i;
const RE_CORTAFUEGO = /\bcorta\s?fuego|barrera.*fuego\b/i;
const RE_INCENDIO = /\b(quem[aoóéá]|incendi|chamusc|carboniz|conato)/i;
const RE_RIBERA = /\b(ribera|orilla|quebrada|r[íi]o|ca[ñn]o|nacimiento|humedal|ronda h[íi]drica)\b/i;

/**
 * Infiere el `objetivo` de get_diseno_restauracion del texto libre del usuario.
 * @param {string} text
 * @returns {'bosque'|'ribera'|'cortafuegos'|'post_incendio'|'paramo'}
 */
function detectObjetivoRestauracion(text) {
  const t = String(text).toLowerCase();
  if (RE_PARAMO.test(t)) return 'paramo';
  if (RE_CORTAFUEGO.test(t)) return 'cortafuegos';
  if (RE_INCENDIO.test(t)) return 'post_incendio';
  if (RE_RIBERA.test(t)) return 'ribera';
  return 'bosque';
}

// Animales del enum silvopastoril (bovino|ovino|caprino) ↔ palabras campesinas.
const ANIMAL_PATTERNS = [
  [/\b(vaca|vacas|res|reses|bovin[oa]s?|ganad[oa]|novill[oa]s?|terner[oa]s?|leche|lecher[íi]a)\b/i, 'bovino'],
  [/\b(oveja|ovejas|ovin[oa]s?|corder[oa]s?|borreg[oa]s?)\b/i, 'ovino'],
  [/\b(cabra|cabras|caprin[oa]s?|chiv[oa]s?)\b/i, 'caprino'],
];

/**
 * Infiere el `animal` de get_diseno_silvopastoril del texto, o null.
 * @param {string} text
 * @returns {('bovino'|'ovino'|'caprino')|null}
 */
function detectAnimalSilvo(text) {
  const t = String(text);
  for (const [re, animal] of ANIMAL_PATTERNS) {
    if (re.test(t)) return animal;
  }
  return null;
}

// Invasoras combustibles que la tool sabe reemplazar (devuelve nativas
// sustitutas en invasora_aviso, NUNCA las recomienda).
const RE_INVASORA = /\b(retamo|eucalipto|pino\s?p[áa]tula|pasto\s?gordura|le[uú]caena)\b/i;

/**
 * Si el usuario menciona una invasora combustible, devuelve su nombre para que
 * la tool responda con la nota de reemplazo. Null si no menciona ninguna.
 * @param {string} text
 * @returns {string|null}
 */
function detectInvasoraMencionada(text) {
  const m = String(text).match(RE_INVASORA);
  return m ? m[0].toLowerCase() : null;
}
