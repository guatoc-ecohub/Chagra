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
 * lógica de routing vive aquí para poder testearla en aislamiento (TDD).
 *
 * CHIP_INTENTS y CHIP_DEFS se importan de agentCapabilities.js (fuente única
 * de verdad). Este módulo NO redefine esas constantes.
 *
 * Tools determinísticos (ya existen en el sidecar, ver sidecarClient.ALLOWED_TOOLS):
 *   - siembro      → get_species          (ficha + viabilidad de la especie)
 *   - calendario   → get_calendario_siembra (cultivos a sembrar este mes según el
 *                                           piso térmico de la finca; el tool SÍ
 *                                           está vivo en el sidecar — antes
 *                                           routeaba a get_species por un comentario
 *                                           stale, fix grounding P0 2026-06-24)
 *   - plaga        → get_pest_controllers  (controladores agroecológicos de la plaga)
 *   - biopreparado → get_biopreparados     (recetas de biopreparados)
 *   - clima        → get_clima_ideam       (IDEAM nacional; requiere municipio)
 *   - restauracion → get_diseno_restauracion (sucesión ecológica con nativas;
 *                                           objetivo inferido del texto, default bosque)
 *   - silvopastoreo→ get_diseno_silvopastoril (forrajeras CIPAV; requiere altura)
 *   - paramo       → get_diseno_restauracion (objetivo='paramo'; especies ≥3000 msnm)
 *   - toxicidad    → get_toxicidad (grounding oscuro 2026-07-01: es_toxica/tox_*)
 *   - saberes_tradicionales → get_saberes_tradicionales (glosario 96 términos, standalone)
 *   - alerta_paramo → get_alerta_normativa_paramo (Ley 1930/2018, contexto opcional)
 *   - variedades   → get_variedades_cultivo (ICA/AGROSAVIA por cultivo, catálogo v3.1)
 *   - polinizacion → get_polinizacion (polinizadores + colmenas/ha)
 *   - fenologia    → get_fenologia (etapas BBCH + ventana de plaga por etapa)
 *
 * Intents sin tool sidecar:
 *   - precio → referencia de mercado calculada localmente desde precioReferencia.
 *   - deep   → investigación profunda multi-fuente sin pipeline implementado.
 *   `precio` no es stub: consulta la referencia groundeada y responde
 *   determinísticamente sin inventar cifras.
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
 * Devuelve true para los intents con kind:'stub' en el manifiesto. Hoy ese
 * contrato aplica a `deep`; `precio` ya se resuelve localmente contra la
 * referencia de mercado.
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
 * chip cae al stub honesto. La función se conserva como punto de enganche:
 * cuando el backend deep-research esté servido en prod (feature flag
 * VITE_DEEP_RESEARCH_ENABLED), basta volver 'deep' a kind 'deep' en el
 * manifiesto para reactivar el path live SIN tocar el AgentScreen.
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
 * @param {string|null} [opts.municipio] - municipio de la finca activa (para clima).
 * @param {number|string|null} [opts.altitud] - altura de la finca/perfil en msnm
 *   (para restauración y silvopastoreo; silvopastoreo la EXIGE).
 * @param {string|null} [opts.pisoTermico] - piso térmico del perfil
 *   (frío/templado/cálido/páramo; se prioriza en silvopastoreo).
 * @returns {null | {
 *   intent: string,
 *   tool: string | null,        // tool determinístico, o null si stub
 *   args: object | null,        // args del tool (forma específica por tool)
 *   stub: boolean,              // true → no hay tool real
 *   stubResult: object | null,  // evidence sintética inyectable (ej. clima no_municipio)
 *   stubMessage: string | null, // mensaje honesto "aún no disponible" para el usuario
 *   localGrounding: any,        // módulo client-side a inyectar (ej. 'incendio'), sin tool del sidecar
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

  /** @type {{ intent: string, tool: string|null, args: object|null, stub: boolean, stubResult: object|null, stubMessage: string|null, localGrounding: any, prompt: string, skipNlu: true }} */
  const base = {
    intent,
    tool: null,
    args: null,
    stub: false,
    stubResult: null,
    stubMessage: null,
    localGrounding: null, // módulo client-side a inyectar (ej. 'incendio'), sin tool del sidecar
    prompt,
    skipNlu: true,
  };

  switch (intent) {
    case CHIP_INTENTS.siembro:
      // Ficha de especie. El grounding trae piso térmico / ciclo y el LLM lo
      // expone como viabilidad + época de siembra de ESA especie concreta.
      return { ...base, tool: 'get_species', args: { query: prompt } };

    case CHIP_INTENTS.calendario: {
      // "¿Qué siembro este mes?" → get_calendario_siembra (tool VIVO en el
      // sidecar, fix grounding P0 2026-06-24). El tool EXIGE `piso_termico`
      // (enum frio|templado|calido, sin tildes) y acepta `mes` opcional (1..12;
      // default = mes actual America/Bogota). El piso lo aporta el perfil/finca
      // (opts.pisoTermico) o se deriva de la altitud; el mes se infiere del
      // texto si el usuario lo nombra ("¿qué siembro en septiembre?").
      const piso = calendarioPiso(opts);
      if (!piso) {
        // Sin piso térmico NO llamamos el tool (el zod lo exige): evidence
        // sintética que obliga al LLM a PEDIR la altura/municipio (NO inventar
        // fechas). Mismo contrato que clima sin municipio / silvopastoreo sin
        // altura.
        return {
          ...base,
          tool: 'get_calendario_siembra',
          args: null,
          stub: true,
          stubResult: {
            available: false,
            reason: 'no_piso_termico',
            hint: 'pedirle al usuario su municipio o la altura de su finca (msnm) para saber el piso térmico (frío/templado/cálido) y poder sugerir qué sembrar este mes',
          },
        };
      }
      const calArgs = { piso_termico: piso };
      const mes = detectMesSiembra(prompt);
      if (mes != null) calArgs.mes = mes;
      return { ...base, tool: 'get_calendario_siembra', args: calArgs };
    }

    case CHIP_INTENTS.plaga:
      // Controladores agroecológicos de la plaga (AGE Cypher). El tool del
      // sidecar EXIGE `pest_id_or_name` (NO `pest`): enviar la clave equivocada
      // disparaba `missing_pest` y el chip insignia no groundeaba (fix P0
      // 2026-06-24).
      return { ...base, tool: 'get_pest_controllers', args: { pest_id_or_name: prompt } };

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

    case CHIP_INTENTS.incendio: {
      // Riesgo de incendio: ESTIMACIÓN client-side (incendioRiskService), NO un
      // tool del sidecar (no existe API de alerta de incendio en tiempo real).
      // Devolvemos localGrounding:'incendio' + la altura del perfil para corregir
      // el piso térmico (caso Galeras/Nariño). El AgentScreen calcula el bloque
      // con evaluarRiesgoIncendio y lo inyecta como evidence. CERO fabricación.
      const altInc = toAltitud(opts.altitud);
      return {
        ...base,
        tool: null,
        localGrounding: 'incendio',
        args: altInc != null ? { altitud: altInc } : {},
      };
    }

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
      const args = { altitud_msnm: altSilvo };
      const piso = normalizePiso(opts.pisoTermico);
      if (piso) args.piso_termico = piso;
      const animal = detectAnimalSilvo(prompt);
      if (animal) args.animal = animal;
      return { ...base, tool: 'get_diseno_silvopastoril', args };
    }

    case CHIP_INTENTS.toxicidad:
      // Perfil de toxicidad/comestibilidad (grounding oscuro, fold 2026-06-05):
      // el grafo devuelve es_toxica + tox_* con disclaimer; found:false si el
      // grafo no tiene el dato (CERO fabricación).
      return { ...base, tool: 'get_toxicidad', args: { species_id_or_name: prompt } };

    case CHIP_INTENTS.saberes_tradicionales:
      // Glosario agroecológico standalone (96 términos in-app), por TÉRMINO —
      // distinto de get_saberes (grafo, por especie, con disclaimer médico).
      return { ...base, tool: 'get_saberes_tradicionales', args: { termino: prompt } };

    case CHIP_INTENTS.alerta_paramo:
      // Alerta normativa de páramo (Ley 1930/2018). `contexto` es OPCIONAL en
      // el tool: le pasamos el texto libre para que la alerta cite la
      // situación puntual del campesino; el tool NO lo interpreta legalmente.
      return { ...base, tool: 'get_alerta_normativa_paramo', args: { contexto: prompt } };

    case CHIP_INTENTS.variedades:
      // Variedades registradas ICA/AGROSAVIA del catálogo v3.1, por CULTIVO —
      // distinto de get_variedades (grafo, nodos :Variety, por especie).
      return { ...base, tool: 'get_variedades_cultivo', args: { cultivo: prompt } };

    case CHIP_INTENTS.polinizacion:
      // Polinizadores + colmenas/ha + efecto en cuaje (grafo AGE).
      return { ...base, tool: 'get_polinizacion', args: { species_id: prompt } };

    case CHIP_INTENTS.fenologia:
      // Etapas BBCH + ventana de plaga por etapa (grafo AGE).
      return { ...base, tool: 'get_fenologia', args: { species_id: prompt } };

    case CHIP_INTENTS.precio:
      // Ruta local groundeada: usa el mismo resolver de referencia del
      // marketplace, sin inventar backend ni tocar el sidecar.
      return {
        ...base,
        tool: null,
        args: { producto: prompt },
        localGrounding: 'precio_referencia',
      };

    case CHIP_INTENTS.deep:
      // STUB (B14): la investigación profunda aún no tiene backend servible en
      // prod (el job async vive detrás de VITE_DEEP_RESEARCH_ENABLED, off por
      // defecto). Devolvemos un stub honesto y no routeamos a un path "live"
      // inexistente. Coherente con el manifiesto (status 'soon') y con el
      // menú de capacidades, que ya pinta 'deep' como por-lanzar.
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
    if (/** @type {RegExp} */ (re).test(t)) return /** @type {'bovino'|'ovino'|'caprino'} */ (animal);
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

/**
 * Resuelve el `piso_termico` que exige get_calendario_siembra (enum
 * frio|templado|calido, SIN 'paramo': el tool no lo soporta) a partir de los
 * opts del chip. Prioridad: opts.pisoTermico normalizado → derivación por
 * altitud. 'paramo' se mapea a 'frio' (el calendario de páramo bajo cae en el
 * piso frío). Devuelve null si no se puede determinar → el caller cae al stub
 * que pide el dato (NO inventa fechas).
 * @param {object} opts
 * @returns {('frio'|'templado'|'calido')|null}
 */
function calendarioPiso(opts) {
  const piso = normalizePiso(opts && opts.pisoTermico);
  if (piso === 'frio' || piso === 'templado' || piso === 'calido') return piso;
  if (piso === 'paramo') return 'frio';
  const alt = toAltitud(opts && opts.altitud);
  if (alt == null) return null;
  if (alt >= 2000) return 'frio';
  if (alt >= 1000) return 'templado';
  return 'calido';
}

// Meses en español → número (1..12). Sin tildes a propósito (matcheamos sobre
// texto en minúsculas y sin normalizar tildes para mantenerlo simple; cubrimos
// ambas grafías donde la tilde es común).
const MESES = Object.freeze({
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
});
const RE_MES = new RegExp(`\\b(${Object.keys(MESES).join('|')})\\b`, 'i');

/**
 * Si el usuario nombra un mes en el texto del chip calendario ("¿qué siembro
 * en septiembre?"), devuelve su número (1..12) para pasarlo como `mes` al tool.
 * Si no nombra mes, devuelve null y el tool usa el mes actual (America/Bogota).
 * @param {string} text
 * @returns {number|null}
 */
function detectMesSiembra(text) {
  const m = String(text).toLowerCase().match(RE_MES);
  return m ? (MESES[m[1].toLowerCase()] ?? null) : null;
}
