/**
 * reranker.mjs — LLM-as-judge reranker para el RAG de Chagra.
 *
 * Por qué existe: la motivación original de esta tarea citaba recall@1≈32%
 * contra recall@3≈70% para el mejor embedder — un patrón de "el documento
 * correcto SÍ está en el top-3 pero no de primero", justo lo que arregla un
 * reranker. Armando el bench (ver docs/RAG.md, sección "Reranker LLM-as-judge")
 * apareció un bug real en `bench-embedders.mjs` que inflaba ese recall@3 (el
 * número correcto, con el bug arreglado, es bastante más bajo — ~36-39%
 * según el embedder). El techo real es más chico de lo que se pensaba, pero
 * sigue habiendo margen entre recall@1 y recall@K — eso es lo que este
 * módulo intenta capturar. Detalle completo, tabla y veredicto en
 * docs/RAG.md.
 *
 * Por qué LLM-as-judge y no un reranker dedicado: en Ollama 0.24 no existe
 * el endpoint `/api/rerank` (404 verificado) y `bge-reranker` no está en su
 * registro de modelos (404 en dos variantes). Con la M6000 de 12 GiB ya
 * ocupada por el agente (`gemma4:e2b`, ~8.1 GB) y el embedder
 * (`granite-embedding:278m`, ~0.6 GB), quedan ~3 GB — ahí caben modelos
 * chicos de instrucción (qwen2.5:3b, llama3.2:3b, gemma2:2b, phi4-mini) que
 * SÍ sirven como juez de relevancia vía prompt.
 *
 * Dos modos de puntuación:
 *  - pointwise: un llamado por candidato (query, pasaje) → score 0-10.
 *    K llamados por consulta. Prompts chicos, más llamados = más latencia
 *    acumulada y más superficie de fallo de parseo.
 *  - listwise: un solo llamado con los K candidatos numerados → el modelo
 *    devuelve el orden completo. 1 llamado por consulta, prompt más largo.
 *
 * Reglas de proyecto aplicadas en cada llamado (ver AI_PIPELINE_SOP /
 * FLEET.md / brief de esta tarea):
 *  - `think: false` SIEMPRE — sin este flag los modelos "pensantes" pueden
 *    devolver vacío y eso se lee (mal) como que el modelo "no sirve".
 *  - `temperature: 0` — determinismo para que el bench sea reproducible.
 *  - timeout explícito por llamado (AbortController) — un modelo colgado no
 *    debe colgar el bench completo.
 */

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Trunca un texto a maxChars, cortando en el último espacio para no partir
 * palabras a la mitad (mejor para el juez LLM que un corte crudo).
 */
export function truncate(text, maxChars) {
  if (!text || text.length <= maxChars) return text || '';
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
}

/**
 * Llamado crudo a POST /api/chat con think:false + temperature:0.
 * Devuelve { content, ms } o lanza con mensaje claro (timeout vs HTTP vs red).
 */
export async function ollamaChat(ollamaUrl, model, messages, opts = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    keepAlive,
    numPredict = 64,
    // Default chico a propósito: sin esto, Ollama reserva el num_ctx por
    // DEFECTO del modelo (a veces 4096-8192) para el KV-cache, y eso infla
    // el tamaño en VRAM aunque el prompt real sea corto (medido: gemma2:2b
    // pasó de "cabría fácil" a 3.9 GB residentes y desalojó al agente, solo
    // por el num_ctx default). 2048 alcanza de sobra para K=10 pasajes
    // truncados + el prompt de sistema.
    numCtx = 2048,
    format,
  } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const body = {
      model,
      messages,
      stream: false,
      think: false,
      options: { temperature: 0, num_predict: numPredict, num_ctx: numCtx },
    };
    if (keepAlive !== undefined) body.keep_alive = keepAlive;
    if (format) body.format = format;

    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const ms = performance.now() - t0;
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`ollama ${res.status}: ${msg}`);
    }
    const data = await res.json();
    const content = data?.message?.content ?? '';
    return { content, ms, raw: data };
  } catch (err) {
    const ms = performance.now() - t0;
    if (err.name === 'AbortError') {
      throw Object.assign(new Error(`timeout tras ${timeoutMs}ms`), { ms, timeout: true });
    }
    throw Object.assign(err, { ms });
  } finally {
    clearTimeout(timer);
  }
}

/** GET /api/ps — qué modelos están residentes en la GPU/CPU ahora mismo. */
export async function getLoadedModels(ollamaUrl) {
  const res = await fetch(`${ollamaUrl}/api/ps`);
  if (!res.ok) throw new Error(`ollama ${res.status} en /api/ps`);
  const data = await res.json();
  return (data.models || []).map(m => ({
    name: m.name,
    size_vram: m.size_vram,
    size: m.size,
    expires_at: m.expires_at,
  }));
}

/** Fuerza la carga de un modelo con un llamado mínimo (warm-up). */
export async function warmModel(ollamaUrl, model, opts = {}) {
  const { keepAlive = '30m', timeoutMs = 60_000 } = opts;
  return ollamaChat(
    ollamaUrl,
    model,
    [{ role: 'user', content: 'Respondé solo con la palabra: listo' }],
    { keepAlive, timeoutMs, numPredict: 8 }
  );
}

/**
 * Descarga un modelo YA (keep_alive:0, sin correr inferencia real) — para
 * que la medición de "¿convive con el agente?" de cada candidato a reranker
 * sea 2 vs 2 (agente + ESE candidato), no 2 vs N acumulando todos los
 * candidatos anteriores en VRAM. Best-effort: si el modelo no estaba
 * cargado, Ollama igual responde 200 sin hacer nada.
 */
export async function unloadModel(ollamaUrl, model) {
  try {
    await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, keep_alive: 0 }),
    });
  } catch {
    // best-effort — no bloquea el bench si falla
  }
}

// ---------- pointwise ----------

function pointwisePrompt(query, passageText) {
  return [
    {
      role: 'system',
      content:
        'Sos un evaluador de relevancia para un buscador agroecológico campesino. ' +
        'Te doy una consulta y un fragmento de una ficha. Calificá qué tan relevante ' +
        'es el fragmento para responder la consulta, en una escala de 0 (nada relevante) ' +
        'a 10 (responde exactamente la consulta). Respondé ÚNICAMENTE con el número, ' +
        'sin texto adicional, sin explicación.',
    },
    {
      role: 'user',
      content: `Consulta: "${query}"\nFragmento: "${passageText}"\nCalificación (0-10):`,
    },
  ];
}

/** Extrae el primer número (entero o decimal) de un texto; NaN si no hay. */
export function parseScore(text) {
  const m = String(text || '').match(/-?\d+(\.\d+)?/);
  if (!m) return NaN;
  const n = parseFloat(m[0]);
  if (Number.isNaN(n)) return NaN;
  return Math.max(0, Math.min(10, n));
}

/**
 * Reordena `candidates` (array de {slug, text}) puntuando cada uno por
 * separado. Devuelve { ranked: [slug...], scores, latenciesMs, parseFailures }.
 */
export async function rerankPointwise(ollamaUrl, model, query, candidates, opts = {}) {
  const { maxChars = 300, timeoutMs = DEFAULT_TIMEOUT_MS, numCtx } = opts;
  const scored = [];
  const latenciesMs = [];
  let parseFailures = 0;

  for (const c of candidates) {
    const passage = truncate(c.text, maxChars);
    let score = 0;
    try {
      const { content, ms } = await ollamaChat(
        ollamaUrl,
        model,
        pointwisePrompt(query, passage),
        { timeoutMs, numPredict: 8, ...(numCtx ? { numCtx } : {}) }
      );
      latenciesMs.push(ms);
      const parsed = parseScore(content);
      if (Number.isNaN(parsed)) {
        parseFailures++;
        score = 0;
      } else {
        score = parsed;
      }
    } catch (err) {
      latenciesMs.push(err.ms ?? timeoutMs);
      parseFailures++;
      score = 0;
    }
    scored.push({ slug: c.slug, score });
  }

  // Sort estable descendente por score; empate → conserva orden original
  // (el orden que trajo el retriever) como desempate razonable.
  const withIndex = scored.map((s, i) => ({ ...s, i }));
  withIndex.sort((a, b) => (b.score - a.score) || (a.i - b.i));

  return {
    ranked: withIndex.map(s => s.slug),
    scores: Object.fromEntries(scored.map(s => [s.slug, s.score])),
    latenciesMs,
    latencyMsTotal: latenciesMs.reduce((s, v) => s + v, 0),
    parseFailures,
    calls: candidates.length,
  };
}

// ---------- listwise ----------

// Formato estructurado (grammar-constrained decoding de Ollama) para el
// listwise: garantiza JSON sintácticamente válido SIEMPRE (elimina la falla
// "el modelo no devolvió ni un array reconocible"). NO garantiza que los
// índices sean válidos/completos — eso lo sigue resolviendo parseListOrder
// con su fallback de mezcla, porque un modelo chico puede devolver un JSON
// perfecto con índices repetidos, faltantes o fuera de rango.
const LISTWISE_FORMAT = {
  type: 'object',
  properties: { order: { type: 'array', items: { type: 'integer' } } },
  required: ['order'],
};

function listwisePrompt(query, candidates, maxCharsEach) {
  const lines = candidates
    .map((c, i) => `[${i}] ${truncate(c.text, maxCharsEach)}`)
    .join('\n');
  return [
    {
      role: 'system',
      content:
        'Sos un motor de reordenamiento de resultados de búsqueda para un ' +
        'buscador agroecológico campesino. Te doy una consulta y una lista de ' +
        'fragmentos numerados desde [0]. Devolvé un objeto JSON con la clave ' +
        '"order": un array con TODOS los índices, ordenados del MÁS al MENOS ' +
        'relevante para responder la consulta. Ejemplo: {"order":[3,0,4,1,2]}.',
    },
    {
      role: 'user',
      content: `Consulta: "${query}"\n\nFragmentos:\n${lines}\n\nOrden (más relevante primero):`,
    },
  ];
}

/**
 * Extrae un array de índices válidos (0..k-1) de la respuesta del modelo.
 * Tolera texto extra alrededor del array, duplicados e índices faltantes:
 * dedup, descarta fuera de rango, y appendea los índices no mencionados al
 * final en su orden original (degrada a "no cambié el orden" para lo que el
 * modelo no supo ubicar, en vez de perder candidatos).
 */
export function parseListOrder(text, k) {
  const str = String(text || '');
  const bracketMatch = str.match(/\[[^\]]*\]/);
  const seen = new Set();
  const order = [];

  if (bracketMatch) {
    const nums = bracketMatch[0].match(/\d+/g) || [];
    for (const n of nums) {
      const idx = parseInt(n, 10);
      if (idx >= 0 && idx < k && !seen.has(idx)) {
        seen.add(idx);
        order.push(idx);
      }
    }
  }
  // Completar con lo que falte, en orden original (fallback seguro).
  for (let i = 0; i < k; i++) {
    if (!seen.has(i)) order.push(i);
  }
  return order;
}

/**
 * Reordena `candidates` con UN solo llamado listwise.
 * Devuelve { ranked: [slug...], latencyMs, parseFailure, raw }.
 */
export async function rerankListwise(ollamaUrl, model, query, candidates, opts = {}) {
  const { maxCharsEach = 220, timeoutMs = DEFAULT_TIMEOUT_MS, numCtx } = opts;
  const k = candidates.length;
  let order;
  let ms;
  let parseFailure = false;
  let raw = '';
  try {
    const result = await ollamaChat(
      ollamaUrl,
      model,
      listwisePrompt(query, candidates, maxCharsEach),
      {
        timeoutMs,
        numPredict: Math.max(32, k * 4),
        format: LISTWISE_FORMAT,
        ...(numCtx ? { numCtx } : {}),
      }
    );
    ms = result.ms;
    raw = result.content;
    order = parseListOrder(result.content, k);
    // Si el array venía vacío/sin ningún índice reconocible, es una falla de
    // parseo aunque parseListOrder igual devuelva el orden original completo.
    if (!/\[[^\]]*\d/.test(result.content)) parseFailure = true;
  } catch (err) {
    ms = err.ms ?? timeoutMs;
    order = candidates.map((_, i) => i); // fallback: no reordena
    parseFailure = true;
  }

  return {
    ranked: order.map(i => candidates[i].slug),
    latencyMs: ms,
    latencyMsTotal: ms,
    parseFailure,
    calls: 1,
    raw,
  };
}

/** Despacha al modo pedido. Interfaz uniforme para el bench. */
export async function rerank(mode, ollamaUrl, model, query, candidates, opts = {}) {
  if (mode === 'pointwise') return rerankPointwise(ollamaUrl, model, query, candidates, opts);
  if (mode === 'listwise') return rerankListwise(ollamaUrl, model, query, candidates, opts);
  throw new Error(`modo de rerank desconocido: ${mode} (usar 'pointwise' o 'listwise')`);
}
