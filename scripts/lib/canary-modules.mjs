/**
 * canary-modules.mjs — REGISTRO EXTENSIBLE de módulos del canario nocturno.
 *
 * Cada check (ejes B/D/C del doc `ops/NIGHTLY_SYSTEM.md`) y cada cosecha (eje A)
 * es un MÓDULO PLUGGABLE con este contrato:
 *
 *   {
 *     id,          // 'B0', 'D2', 'A1', ...  (matchea el doc)
 *     nombre,      // humano
 *     categoria,   // 'salud' | 'dinamico' | 'cosecha' | 'seguridad'
 *     fase,        // 'P0' | 'P1' | 'P2'
 *     stub?,       // true = registrado pero sin implementar (TODO)
 *     run?(ctx)    // async → { status:'pass'|'fail'|'skip', valor, detalle, data? }
 *   }
 *
 * El runner (`scripts/nightly-canary.mjs`) corre los módulos de la(s) fase(s)
 * activa(s) EN ORDEN y acumula estado en `ctx` (los módulos de cosecha A leen lo
 * que produjeron los de salud B). Los de fase inactiva o `stub:true` se reportan
 * como 'stub' con un TODO claro → agregar uno nuevo = escribir su `run()`.
 *
 * Anti-leak: sin hosts/tokens/credenciales hardcodeados. Datos sintéticos
 * (usuario de pruebas) → sin PII. Español colombiano (tú/usted), NUNCA voseo.
 *
 * @module canary-modules
 */

import { join, dirname } from 'node:path';
import { mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { spawnClaudeCode } from './bench-scorer.mjs';
import { buildEnrichedSystemPrompt } from './bench-sidecar.mjs';
import { pickDynamicProbes, evaluateProbe } from './canary-dynamic-probes.mjs';

// ── helpers compartidos ───────────────────────────────────────────────────────
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const nowIso = () => new Date().toISOString();
export const clip = (s, n = 4000) => (typeof s === 'string' && s.length > n ? `${s.slice(0, n)}…` : s || '');
const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function appendJsonl(file, obj) {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(obj)}\n`);
}

export async function httpFetch(url, { method = 'GET', headers = {}, body, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { /* no-json */ }
    return { ok: res.ok, status: res.status, text, json };
  } catch (err) {
    return { ok: false, status: 0, text: String(err?.message || err), json: null };
  } finally {
    clearTimeout(timer);
  }
}

const JSONAPI = { Accept: 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json' };
// JPEG 1x1 válido (marcador de foto del canario; embebido para no depender de assets).
const CANARY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
  'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB' +
  'AAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==';

// ── PRNG determinístico por fecha ──────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFromDate(dateStr, salt = '') {
  const s = `${dateStr}|${salt}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function dayOfYear(d) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86400000);
}

// ── temas duros que ROTAN cada noche ───────────────────────────────────────────
export const TOPICS = [
  { id: 'roya_cafe', problema: 'la roya del café', patogeno: 'Hemileia vastatrix', cultivo: 'café', cientifico: 'Coffea arabica', tipo: 'enfermedad (hongo)', piso: 'templado', fuente: 'Cenicafé / Agrosavia', confusion: 'que la roya y la broca son la misma plaga' },
  { id: 'gota_papa', problema: 'la gota o tizón tardío de la papa', patogeno: 'Phytophthora infestans', cultivo: 'papa', cientifico: 'Solanum tuberosum', tipo: 'enfermedad (oomiceto)', piso: 'frío', fuente: 'Agrosavia / ICA', confusion: 'que la gota se cura con un insecticida' },
  { id: 'monilia_cacao', problema: 'la moniliasis del cacao', patogeno: 'Moniliophthora roreri', cultivo: 'cacao', cientifico: 'Theobroma cacao', tipo: 'enfermedad (hongo)', piso: 'cálido', fuente: 'Fedecacao / Agrosavia', confusion: 'que la monilia y la escoba de bruja son lo mismo' },
  { id: 'gallinas_frio', problema: 'el manejo de gallinas ponedoras en clima frío de montaña', patogeno: 'estrés por frío y humedad', cultivo: 'gallinas ponedoras', cientifico: 'Gallus gallus domesticus', tipo: 'manejo pecuario', piso: 'frío altoandino', fuente: 'ICA / SENA', confusion: 'que en frío hay que quitarles el agua para que no se enfermen' },
  { id: 'sigatoka_platano', problema: 'la sigatoka negra del plátano', patogeno: 'Pseudocercospora fijiensis', cultivo: 'plátano', cientifico: 'Musa paradisiaca', tipo: 'enfermedad (hongo)', piso: 'cálido', fuente: 'Agrosavia / ICA', confusion: 'que la sigatoka la produce el picudo negro' },
  { id: 'broca_cafe', problema: 'la broca del café', patogeno: 'Hypothenemus hampei', cultivo: 'café', cientifico: 'Coffea arabica', tipo: 'plaga (insecto)', piso: 'templado', fuente: 'Cenicafé', confusion: 'que la broca es un hongo que se controla con fungicida' },
  { id: 'picudo_platano', problema: 'el picudo negro del plátano', patogeno: 'Cosmopolites sordidus', cultivo: 'plátano', cientifico: 'Musa paradisiaca', tipo: 'plaga (insecto)', piso: 'cálido', fuente: 'Agrosavia', confusion: 'que el picudo se combate igual que la sigatoka' },
  { id: 'mildeo_cebolla', problema: 'el mildeo velloso de la cebolla', patogeno: 'Peronospora destructor', cultivo: 'cebolla de rama', cientifico: 'Allium fistulosum', tipo: 'enfermedad (oomiceto)', piso: 'frío', fuente: 'Agrosavia', confusion: 'que el mildeo es la misma trips de la cebolla' },
  { id: 'antracnosis_tomatearbol', problema: 'la antracnosis del tomate de árbol', patogeno: 'Colletotrichum spp.', cultivo: 'tomate de árbol', cientifico: 'Solanum betaceum', tipo: 'enfermedad (hongo)', piso: 'frío', fuente: 'Agrosavia', confusion: 'que la antracnosis es un daño por mosca de la fruta' },
];
const PISO_ALTITUDES = { 'cálido': [400, 700, 900], 'templado': [1300, 1650, 1850], 'frío': [2200, 2600, 2900], 'frío altoandino': [2800, 3100, 3300] };

export function pickTopic(now) { return TOPICS[dayOfYear(now) % TOPICS.length]; }

export function buildConversation(topic, dateStr) {
  const rnd = mulberry32(seedFromDate(dateStr, topic.id));
  const alts = PISO_ALTITUDES[topic.piso] || [1600];
  const altitud = alts[Math.floor(rnd() * alts.length)];
  const lluvia = rnd() > 0.5 ? 'con lluvias frecuentes' : 'en época seca prolongada';
  const escala = rnd() > 0.5 ? 'en un lote pequeño de pancoger' : 'en media hectárea';
  return [
    { turn: 1, kind: 'pregunta_inicial', text: `¿Cómo identifico y manejo ${topic.problema} en ${topic.cultivo} (${topic.cientifico}) en clima ${topic.piso}? Quiero saber los síntomas y qué hacer apenas aparece.` },
    { turn: 2, kind: 'repregunta_matiz', text: `En mi finca a ${altitud} msnm, ${lluvia} y ${escala}, ¿cambia el manejo? Prefiero control cultural o biopreparados, sin químicos de síntesis. ¿Qué me recomiendas concretamente?` },
    { turn: 3, kind: 'caso_borde', text: `Un vecino me dijo ${topic.confusion}. ¿Eso es cierto o me está confundiendo ${topic.problema} con otra cosa? Explícame la diferencia sin inventar.` },
    { turn: 4, kind: 'pedir_fuente', text: `¿De dónde sale esa recomendación? Dame la fuente o la entidad (por ejemplo ${topic.fuente}) para poder verificarlo. Si no la tienes, dímelo, no te la inventes.` },
  ];
}

// ── clientes del pipeline (via el target) ──────────────────────────────────────
async function sidecarPost(base, token, path, body, timeoutMs = 30000) {
  return httpFetch(`${base}/api/mcp/agro${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Chagra-Token': token } : {}) },
    body: JSON.stringify(body),
    timeoutMs,
  });
}
async function callTool(base, token, name, args, timeoutMs = 45000) {
  return sidecarPost(base, token, `/tools/${name}`, args || {}, timeoutMs);
}
async function generateChat(base, bearer, systemPrompt, userPrompt, model) {
  const start = Date.now();
  const r = await httpFetch(`${base}/api/ollama/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify({
      model, stream: false,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      options: { temperature: 0.3, seed: 42, num_predict: 512 }, keep_alive: '10m',
    }),
    timeoutMs: 180000,
  });
  const latency = Date.now() - start;
  if (!r.ok || !r.json) return { response: '', latency_ms: latency, error: `HTTP ${r.status}` };
  return { response: r.json.message?.content || '', latency_ms: latency, model: r.json.model || model };
}

// ── farmOS helpers ─────────────────────────────────────────────────────────────
async function farmosGet(base, token, path) {
  return httpFetch(`${base}${path}`, { headers: { ...JSONAPI, Authorization: `Bearer ${token}` }, timeoutMs: 30000 });
}
async function farmosWrite(base, token, path, payload, method = 'POST') {
  return httpFetch(`${base}${path}`, { method, headers: { ...JSONAPI, Authorization: `Bearer ${token}` }, body: JSON.stringify(payload), timeoutMs: 30000 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULOS P0 (implementados)
// ═══════════════════════════════════════════════════════════════════════════════

/** login — OAuth del usuario de pruebas. Deja ctx.token para el resto. */
async function runLogin(ctx) {
  const clientId = process.env.CANARY_FARMOS_CLIENT_ID || 'farm';
  const form = new URLSearchParams();
  form.set('grant_type', 'password');
  form.set('client_id', clientId);
  form.set('username', ctx.creds.usuario);
  form.set('password', ctx.creds.clave);
  form.set('scope', 'farm_manager');
  const r = await httpFetch(`${ctx.base}/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(), timeoutMs: 30000,
  });
  if (!r.ok || !r.json?.access_token) return { status: 'fail', valor: `HTTP ${r.status}`, detalle: 'OAuth falló (¿credenciales o /oauth caído?).' };
  ctx.token = r.json.access_token;
  return { status: 'pass', valor: `token ${ctx.token.length} chars`, detalle: 'OAuth OK para el usuario de pruebas.' };
}

/** B0 — conversación dinámica de 4 mensajes por el pipeline real. Llena ctx.responses. */
async function runConversacion(ctx) {
  const { base, sidecarToken, token, chatModel, conversation, topic } = ctx;
  ctx.responses = [];
  let turnOk = 0;
  for (const msg of conversation) {
    try {
      const nluR = await sidecarPost(base, sidecarToken, '/nlu', { user_message: msg.text, context: {} }).catch(() => null);
      const nlu = nluR?.ok ? nluR.json : null;
      const reR = await sidecarPost(base, sidecarToken, '/resolve-entities', { user_message: msg.text }).catch(() => null);
      const entities = reR?.ok && Array.isArray(reR.json?.entities) ? reR.json.entities : [];
      const systemPrompt = buildEnrichedSystemPrompt(entities);
      const gen = await generateChat(base, token, systemPrompt, msg.text, chatModel);
      let pv = { hallucinated: [], detected_count: 0 };
      if (gen.response) {
        const pvR = await sidecarPost(base, sidecarToken, '/post-validate', { user_message: msg.text, response: gen.response }).catch(() => null);
        if (pvR?.ok && pvR.json) pv = { hallucinated: pvR.json.hallucinated || [], detected_count: pvR.json.detected_count || 0 };
      }
      if (gen.response && gen.response.length > 30) turnOk += 1;
      ctx.responses.push({
        turn: msg.turn, kind: msg.kind, user_text: msg.text, agent_text: gen.response,
        nlu_route: nlu?.route || nlu?.tool || nlu?.intent || null,
        entities_grounded: entities.map((e) => e.nombre_cientifico || e.nombre_comun || e.mentioned).filter(Boolean).slice(0, 20),
        post_validate_hallucinated: pv.hallucinated?.length || 0,
        latency_ms: gen.latency_ms, model: gen.model || chatModel, error: gen.error || null,
      });
    } catch (err) {
      ctx.responses.push({ turn: msg.turn, kind: msg.kind, user_text: msg.text, agent_text: '', error: String(err?.message || err) });
    }
  }
  const status = turnOk === conversation.length ? 'pass' : 'fail';
  return { status, valor: `${turnOk}/${conversation.length} respuestas`, detalle: `Conversación compleja sobre ${topic.id} (${turnOk}/${conversation.length} turnos con respuesta).`, data: { topic: topic.id } };
}

/**
 * gatherGraphEvidence — junta EVIDENCIA GROUNDED del grafo/catálogo para el tema
 * (hechos canónicos + entidades resueltas + facts de tools del sidecar). Esta
 * evidencia es la que usa el juez para escribir la `respuesta_corregida` sin
 * inventar. Todo degrada graceful (si una tool cae, se omite).
 */
async function gatherGraphEvidence(ctx) {
  const { base, sidecarToken, topic, responses = [] } = ctx;
  const parts = [];
  parts.push(`HECHOS CANÓNICOS DEL TEMA: ${topic.problema} = ${topic.tipo}; agente causal = ${topic.patogeno}; cultivo hospedante = ${topic.cultivo} (${topic.cientifico}); piso térmico típico = ${topic.piso}; fuente autoritativa = ${topic.fuente}.`);

  const resolved = [...new Set(responses.flatMap((r) => r.entities_grounded || []))].slice(0, 25);
  if (resolved.length) parts.push(`ENTIDADES RESUELTAS EN EL GRAFO (canónicas): ${resolved.join(' · ')}`);

  // Facts de tools del sidecar (grafo AGE) — best-effort, se recorta cada payload.
  const probes = [
    ['get_species', { id_or_name: topic.cientifico }],
    ['get_pest_controllers', { id_or_name: topic.patogeno }],
    ['get_biopreparados', { id_or_name: topic.patogeno }],
  ];
  for (const [name, args] of probes) {
    try {
      const r = await callTool(base, sidecarToken, name, args, 20000);
      if (r.ok && r.json && JSON.stringify(r.json) !== '{}' && r.json.available !== false && !r.json.error) {
        parts.push(`GRAFO ${name}: ${clip(JSON.stringify(r.json), 700)}`);
      }
    } catch (_) { /* omitir */ }
  }
  return parts.join('\n');
}

/** buildCorrectionBatchPrompt — prompt del juez que evalúa Y CORRIGE (grounded). */
export function buildCorrectionBatchPrompt(items, evidence) {
  const itemsText = items.map((it, i) => [
    `### ITEM ${i + 1} — id: "${it.id}"`,
    `TIPO DE PREGUNTA: ${it.probeType}`,
    `PREGUNTA DEL USUARIO: ${it.query}`,
    `RESPUESTA DE GRANITE (a evaluar): ${it.response}`,
    it.entidades ? `ENTIDADES QUE RESOLVIÓ ESTE TURNO: ${it.entidades}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');

  return [
    'Eres un AUDITOR EXPERTO en agroecología colombiana y, a la vez, un MAESTRO que',
    'corrige. Para CADA item: (1) evalúa si la respuesta de granite está contaminada',
    '(mezcla info de otra plaga/enfermedad, miscategoriza plaga↔enfermedad, confunde',
    'la especie, recomienda plantas/insumos de otro piso térmico, o inventa',
    'fuentes/instituciones/familias); y (2) ESCRIBE la respuesta CORRECTA y grounded.',
    '',
    'REGLA DE ORO PARA LA CORRECCIÓN: básate ESTRICTAMENTE en la EVIDENCIA DEL GRAFO/',
    'CATÁLOGO de abajo + conocimiento agronómico establecido para Colombia. NO inventes',
    'entidades, familias, dosis peligrosas ni fuentes. Si la EVIDENCIA NO ALCANZA para',
    'responder con seguridad, pon "is_gap": true y deja `respuesta_corregida` con lo',
    'que sí se pueda afirmar (o vacío) — ese gap alimenta la cola de enriquecimiento.',
    '',
    '═══════ EVIDENCIA DEL GRAFO/CATÁLOGO (canónica, NO inventar más allá de esto) ═══════',
    evidence || '(sin evidencia adicional; usa solo los hechos canónicos del tema)',
    '',
    '═══════ ITEMS A EVALUAR Y CORREGIR ═══════',
    itemsText,
    '',
    'Devuelve ÚNICAMENTE un array JSON (sin prosa antes ni después), un objeto por item,',
    'en el MISMO orden. Cada `respuesta_corregida` debe ser una SOLA línea (sin saltos',
    'de línea internos), en español campesino claro, práctica, citando la entidad/fuente',
    'de la evidencia cuando exista, y máximo ~900 caracteres. Escapa las comillas dobles.',
    'Formato EXACTO:',
    '[{"id":"<id>","contaminated":<bool>,"category":"<cross_thermal|confusion_especie|pest_vs_disease|institucion_inventada|familia_fabricada|otra|ninguna>","explanation":"<por qué, breve>","respuesta_corregida":"<respuesta correcta grounded>","is_gap":<bool>}]',
  ].join('\n');
}

/** parseCorrectionVerdicts — extrae el array JSON de veredictos+correcciones. */
export function parseCorrectionVerdicts(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  let arr;
  try { arr = JSON.parse(raw.slice(start, end + 1)); }
  catch (_) { return null; }
  if (!Array.isArray(arr)) return null;
  return arr.map((o) => ({
    id: typeof o.id === 'string' ? o.id : String(o.id ?? ''),
    contaminated: typeof o.contaminated === 'boolean' ? o.contaminated : Boolean(o.contaminated),
    category: typeof o.category === 'string' && o.category ? o.category : 'otra',
    explanation: typeof o.explanation === 'string' ? o.explanation : '',
    respuesta_corregida: typeof o.respuesta_corregida === 'string' ? o.respuesta_corregida.trim() : '',
    is_gap: typeof o.is_gap === 'boolean' ? o.is_gap : Boolean(o.is_gap),
    source: 'judge',
  }));
}

/**
 * B0g — grounding: juez `claude-code -p` que evalúa CADA respuesta (contaminación/
 * alucinación) Y ADEMÁS genera la `respuesta_corregida` GROUNDED con el grafo (o
 * marca `is_gap` si el grafo no tiene el dato → alimenta A2). Llena ctx.verdictsById
 * para que A1 (destilado) escriba tuplas útiles para LoRA y A2 encole los gaps.
 */
async function runGrounding(ctx) {
  const { topic, responses = [] } = ctx;
  const items = responses
    .filter((r) => r.agent_text && r.agent_text.length > 20)
    .map((r) => ({
      id: `${topic.id}-t${r.turn}`, probeType: r.kind, query: r.user_text, response: r.agent_text,
      entidades: (r.entities_grounded || []).join(', '),
    }));
  if (items.length === 0) return { status: 'fail', valor: '0 evaluables', detalle: 'No hubo respuestas evaluables (agente vacío).' };

  // Evidencia grounded del grafo para que el juez corrija sin inventar.
  const evidence = await gatherGraphEvidence(ctx);

  // Un solo spawn de claude-code -p (secuencial, nunca paralelo) con evaluación + corrección.
  const unjudged = items.map((it) => ({ id: it.id, contaminated: null, category: null, explanation: null, respuesta_corregida: '', is_gap: false, source: 'unjudged' }));
  let verdicts = unjudged;
  try {
    const raw = await spawnClaudeCode(buildCorrectionBatchPrompt(items, evidence), { timeoutMs: 300000 });
    const parsed = parseCorrectionVerdicts(raw);
    if (parsed) {
      const byId = new Map(parsed.map((v) => [v.id, v]));
      verdicts = items.map((it) => byId.get(it.id) || { id: it.id, contaminated: null, category: null, explanation: null, respuesta_corregida: '', is_gap: false, source: 'unjudged' });
    }
  } catch (_) { /* degrada a unjudged */ }

  ctx.verdicts = verdicts;
  ctx.verdictsById = new Map(verdicts.map((v) => [v.id, v]));
  ctx.judgeGaps = verdicts.filter((v) => v.is_gap === true);

  const judged = verdicts.filter((v) => v.source === 'judge');
  const contaminated = judged.filter((v) => v.contaminated === true);
  const corrected = judged.filter((v) => v.respuesta_corregida && v.respuesta_corregida.length > 20);
  const gaps = judged.filter((v) => v.is_gap === true);
  const pvHits = responses.reduce((a, r) => a + (r.post_validate_hallucinated || 0), 0);
  const status = judged.length === 0 ? 'skip' : contaminated.length === 0 && pvHits === 0 ? 'pass' : 'fail';
  return {
    status,
    valor: `${contaminated.length} contaminados / ${judged.length}; ${corrected.length} con corrección; ${gaps.length} gaps; ${pvHits} alucinadas`,
    detalle: `juez claude-code -p: ${judged.length}/${items.length} evaluados, ${contaminated.length} contaminados, ${corrected.length} con respuesta_corregida grounded, ${gaps.length} gaps; post-validate: ${pvHits} alucinadas.`,
    data: {
      verdicts: verdicts.map((v) => ({ id: v.id, contaminated: v.contaminated, category: v.category, explanation: clip(v.explanation, 300), respuesta_corregida: clip(v.respuesta_corregida, 500), is_gap: v.is_gap })),
      post_validate_hits: pvHits, corrected: corrected.length, gaps: gaps.length,
    },
  };
}

/** B0b — planta con foto bajo ubicación de pruebas aislada. NO borra (acumula). */
async function runPlantaFoto(ctx) {
  const { base, token, target, dateStr } = ctx;
  if (!token) return { status: 'skip', valor: 'sin token', detalle: 'Login falló; no puedo escribir en farmOS.' };

  // Ubicación de pruebas (idempotente) — aísla de la finca real.
  const landName = 'CANARIO-PRUEBAS';
  let landId = null;
  const foundLand = await farmosGet(base, token, `/api/asset/land?filter[name]=${encodeURIComponent(landName)}&page[limit]=1`);
  if (foundLand.ok && foundLand.json?.data?.length) landId = foundLand.json.data[0].id;
  else {
    const cl = await farmosWrite(base, token, '/api/asset/land', { data: { type: 'asset--land', attributes: { name: landName, status: 'active', land_type: 'property', is_location: true, is_fixed: true, notes: { value: 'Ubicación de PRUEBAS del canario. No es finca real. No borrar.', format: 'plain_text' } } } });
    if (cl.ok && cl.json?.data?.id) landId = cl.json.data.id;
  }

  // plant_type (evita el 422 "plant_type no puede ser nulo").
  let plantTypeId = null;
  const pt = await farmosGet(base, token, '/api/taxonomy_term/plant_type?page[limit]=1');
  if (pt.ok && pt.json?.data?.length) plantTypeId = pt.json.data[0].id;
  else { const cpt = await farmosWrite(base, token, '/api/taxonomy_term/plant_type', { data: { type: 'taxonomy_term--plant_type', attributes: { name: 'CANARIO' } } }); if (cpt.ok) plantTypeId = cpt.json?.data?.id; }

  // Crear la planta bajo la ubicación de pruebas.
  const stamp = `${dateStr} ${new Date().toISOString().slice(11, 19)}`;
  const rels = {};
  if (plantTypeId) rels.plant_type = { data: [{ type: 'taxonomy_term--plant_type', id: plantTypeId }] };
  if (landId) rels.location = { data: [{ type: 'asset--land', id: landId }] };
  let created = await farmosWrite(base, token, '/api/asset/plant', { data: { type: 'asset--plant', attributes: { name: `CANARIO planta ${target} ${stamp}`, status: 'active', notes: { value: `Planta de PRUEBAS del canario (${target}). Bajo CANARIO-PRUEBAS. No borrar.`, format: 'plain_text' } }, relationships: rels } });
  if (!created.ok && rels.location) { delete rels.location; created = await farmosWrite(base, token, '/api/asset/plant', { data: { type: 'asset--plant', attributes: { name: `CANARIO planta ${target} ${stamp}`, status: 'active' }, relationships: rels } }); }
  const plantId = created.ok ? created.json?.data?.id : null;

  // Subir la foto al campo image de la planta (JSON:API binario, ruta correcta).
  let fileId = null; let uploadStatus = null;
  if (plantId) {
    const bytes = Buffer.from(CANARY_JPEG_B64, 'base64');
    const up = await httpFetch(`${base}/api/asset/plant/${plantId}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'Content-Disposition': `file; filename="CANARIO-${target}-${dateStr}.jpg"`, Accept: 'application/vnd.api+json' },
      body: bytes, timeoutMs: 45000,
    });
    uploadStatus = up.status;
    if (up.ok && up.json?.data?.id) fileId = up.json.data.id;
  }

  // Verificar persistencia: releer la planta y confirmar la relación image.
  let verified = false; let photoOk = false;
  if (plantId) {
    const rb = await farmosGet(base, token, `/api/asset/plant/${plantId}?include=image`);
    verified = rb.ok && rb.json?.data?.id === plantId;
    const img = rb.json?.data?.relationships?.image?.data;
    photoOk = Array.isArray(img) ? img.length > 0 : Boolean(img);
  }

  const status = plantId && verified && photoOk ? 'pass' : 'fail';
  return {
    status,
    valor: `planta=${plantId ? 'sí' : 'NO'}, foto=${photoOk ? 'persiste' : `NO (upload HTTP ${uploadStatus})`}`,
    detalle: `planta ${plantId ? plantId.slice(0, 8) : 'NO'} (verificada=${verified}) bajo ${landId ? 'CANARIO-PRUEBAS' : 'sin land'}; foto ${fileId ? fileId.slice(0, 8) : `NO (HTTP ${uploadStatus})`} persiste=${photoOk}. Sin borrar (acumula).`,
    data: { plantId, fileId, landId, verified, photoOk, uploadStatus },
  };
}

/** B0c — verificar que la conversación quedó registrada en el store del sidecar. */
async function runCaptura(ctx) {
  const { base, sidecarToken, target, dateStr, responses = [] } = ctx;
  const conta = () => {
    const cmd = process.env.CANARY_CONV_COUNT_CMD;
    if (!cmd) return null;
    try { const n = parseInt(execSync(cmd, { encoding: 'utf-8', timeout: 30000 }).trim().split(/\s+/)[0], 10); return Number.isFinite(n) ? n : null; } catch (_) { return null; }
  };
  const before = conta();
  const withText = responses.filter((r) => r.agent_text);
  let posted = 0;
  const sessionId = `canario-${target}-${dateStr}`;
  for (const r of withText) {
    const payload = {
      id: `CAN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      ts: Date.now(), user_id: `canario-${target}`, user_name: 'CANARIO', finca_slug: 'canario-pruebas', finca_nombre: null,
      session_id: sessionId, turn_index: r.turn, user_text: clip(r.user_text, 16000), agent_text: clip(r.agent_text, 16000),
      nlu_route: r.nlu_route ?? null, entities_grounded: r.entities_grounded ?? [], guards_fired: [],
      grounded_status: r.post_validate_hallucinated ? 'flagged' : 'ok', latency_ms: r.latency_ms ?? null, model: r.model ?? null,
    };
    const res = await sidecarPost(base, sidecarToken, '/log-conversation', payload, 15000);
    if (res.ok) posted += 1;
  }
  await sleep(1500);
  const after = conta();
  if (before === null || after === null) {
    return { status: posted > 0 ? 'pass' : 'fail', valor: `endpoint aceptó ${posted}/${withText.length}`, detalle: `POST /log-conversation aceptó ${posted}/${withText.length} turnos (verificación en disco no configurada: falta CANARY_CONV_COUNT_CMD).`, data: { posted, disk_verified: false } };
  }
  const delta = after - before;
  const ok = delta >= posted && posted > 0;
  return { status: ok ? 'pass' : 'fail', valor: `${before}→${after} (Δ=${delta})`, detalle: `store de conversaciones: ${before} → ${after} líneas (Δ=${delta}, posteados=${posted}). ${ok ? 'incrementa correctamente.' : 'NO incrementó lo esperado → posible bug de captura.'}`, data: { posted, before, after, delta, disk_verified: true } };
}

// ── B0f: CASO GOLDEN/REGRESIÓN — ración avícola en altura (Choachí 2513 msnm) ───
// El agente falló esta pregunta en el piloto real. Cuando aterrice el fix avícola
// (grounding tierra fría + cálculo de ración, rama gl-avicola-frio), debe PASAR.
export const AVICOLA_FRIO_CASE = {
  id: 'avicola_frio_2500',
  pregunta: '¿Cuánto alimento le doy a 12-14 gallinas criollas a 2500 msnm, mezcla de grano y pastoreo?',
  criterios: [
    '(a) da una CANTIDAD concreta (g/día por ave y kg/día totales)',
    '(b) AJUSTA por la altitud fría (más consumo por termorregulación)',
    '(c) NO recomienda plantas de clima cálido a 2500 msnm (Nacedero/Trichanthera <~2000 = cross_thermal)',
    '(d) no deja un cascarón (respuesta suprimida sin reemplazo útil)',
  ],
};

function evalAvicolaFrio(text) {
  const raw = (text || '').trim();
  const n = norm(raw);
  // (a) cantidad: gramos/ave y/o kg/día totales.
  const hasGramos = /\b\d{2,3}\s*(g|gr|gramos)\b/.test(n);
  const hasKg = /\b\d+([.,]\d+)?\s*(kg|kilos?|kilogramos?)\b/.test(n);
  const daCantidad = hasGramos || hasKg;
  // (b) ajuste por altura fría / termorregulación.
  const ajustaAltura = /(2500|2513|altur|altitud|fri[oa]|clima\s*fri|termorregul|mas\s*consum|mayor\s*consum|consum.*fri|fri.*consum)/.test(n);
  // (c) cross_thermal: plantas de clima cálido recomendadas a 2500 (trampa del piloto).
  const crossThermal = /(nacedero|trichanthera|quiebrabarrig|matarrat[oó]?n|botón de oro|boton de oro)/.test(n);
  // (d) cascarón: respuesta vacía/suprimida sin reemplazo útil.
  const cascaron = raw.length < 180 || (/(no puedo|no tengo (informaci|datos)|no cuento con|no dispongo|consulta.* (veterinari|experto))/.test(n) && raw.length < 400);
  const pass = daCantidad && ajustaAltura && !crossThermal && !cascaron;
  return { pass, daCantidad, hasGramos, hasKg, ajustaAltura, crossThermal, cascaron };
}

async function runAvicolaFrio(ctx) {
  const { base, sidecarToken, token, chatModel, target, dateStr, outDir } = ctx;
  const q = AVICOLA_FRIO_CASE.pregunta;
  const reR = await sidecarPost(base, sidecarToken, '/resolve-entities', { user_message: q }).catch(() => null);
  const entities = reR?.ok && Array.isArray(reR.json?.entities) ? reR.json.entities : [];
  const systemPrompt = buildEnrichedSystemPrompt(entities);
  const gen = await generateChat(base, token, systemPrompt, q, chatModel);
  const text = gen.response || '';
  const ev = evalAvicolaFrio(text);

  // Golden/regresión: acumula la respuesta + sub-flags para trackear cuándo pasa.
  appendJsonl(join(outDir, 'golden', `avicola-frio-${dateStr}.jsonl`), {
    ts: nowIso(), target, caso: AVICOLA_FRIO_CASE.id, pregunta: q, respuesta: text, modelo: gen.model || chatModel, eval: ev,
  });

  const fallos = [];
  if (!ev.daCantidad) fallos.push('(a) sin cantidad g/kg');
  if (!ev.ajustaAltura) fallos.push('(b) no ajusta por frío/altura');
  if (ev.crossThermal) fallos.push('(c) cross_thermal: recomienda planta de clima cálido a 2500 msnm');
  if (ev.cascaron) fallos.push('(d) cascarón (respuesta suprimida/vacía)');
  const status = ev.pass ? 'pass' : (text ? 'fail' : 'fail');
  return {
    status,
    valor: ev.pass ? 'OK' : fallos.join('; '),
    detalle: `Golden ración avícola 2500 msnm: ${ev.pass ? 'PASA' : 'FALLA — ' + fallos.join('; ')}. (cantidad=${ev.daCantidad} altura=${ev.ajustaAltura} crossThermal=${ev.crossThermal} cascarón=${ev.cascaron})`,
    data: { eval: ev, respuesta: clip(text, 800) },
  };
}

// ── D1-D5: datos dinámicos externos ────────────────────────────────────────────
function findDate(obj, depth = 0) {
  if (!obj || depth > 4) return null;
  if (typeof obj === 'string') { const m = obj.match(/\d{4}-\d{2}-\d{2}/); return m ? m[0] : null; }
  if (typeof obj !== 'object') return null;
  for (const k of Object.keys(obj)) {
    if (/fecha|date|fetched|updated|timestamp|dia/i.test(k)) { const d = findDate(obj[k], depth + 1); if (d) return d; }
  }
  for (const k of Object.keys(obj)) { const d = findDate(obj[k], depth + 1); if (d) return d; }
  return null;
}
function daysAgo(dateStr) {
  if (!dateStr) return Infinity;
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return Infinity;
  return Math.floor((Date.now() - t) / 86400000);
}

async function runClima(ctx) {
  const { base, sidecarToken } = ctx;
  // Snapshot (ENSO + forecast) da la señal de frescura más directa.
  const snap = await httpFetch(`${base}/api/mcp/agro/clima/snapshot`, { headers: { 'X-Chagra-Token': sidecarToken }, timeoutMs: 30000 });
  const fetchedAt = snap.json?.fetched_at || null;
  const staleSnap = daysAgo(fetchedAt) > 2;
  // Estaciones IDEAM.
  const ideam = await callTool(base, sidecarToken, 'get_clima_ideam', { action: 'stations_near', municipio: 'Chinchiná', departamento: 'Caldas' });
  const ideamOk = ideam.ok && ideam.json && !ideam.json.error;
  const status = snap.ok && !staleSnap && ideamOk ? 'pass' : 'fail';
  return { status, valor: `snapshot ${fetchedAt || 'N/A'}, IDEAM HTTP ${ideam.status}`, detalle: `clima/snapshot HTTP ${snap.status} (fetched_at=${fetchedAt}, ${staleSnap ? 'STALE' : 'fresco'}); get_clima_ideam(stations_near) HTTP ${ideam.status}${ideamOk ? '' : ' → IDEAM degradado'}.`, data: { fetched_at: fetchedAt, ideam_status: ideam.status } };
}

async function runPrecio(ctx) {
  const { base, sidecarToken } = ctx;
  const r = await callTool(base, sidecarToken, 'get_precio_sipsa', { action: 'latest_price', producto: 'papa' });
  if (!r.ok) return { status: 'fail', valor: `HTTP ${r.status}`, detalle: `get_precio_sipsa(latest_price papa) HTTP ${r.status} → SIPSA/DANE degradado.` };
  const body = r.json || {};
  const available = body.available !== false && (body.price || body.data || body.precio_promedio_cop_kg || body.especie);
  const fecha = findDate(body);
  const stale = daysAgo(fecha) > 45;
  const price = body.price?.precio_promedio_cop_kg || body.precio_promedio_cop_kg || (body.price ? JSON.stringify(body.price).slice(0, 60) : null);
  const status = available && !stale ? 'pass' : 'fail';
  return { status, valor: `precio=${price || 'N/A'}, fecha=${fecha || 'N/A'}`, detalle: `SIPSA papa: ${available ? `precio ${price}` : 'available:false'}, fecha ${fecha || 'N/A'}${stale ? ' → STALE (>45d o año pasado)' : ''}.`, data: { available: Boolean(available), fecha, price } };
}

async function runEnso(ctx) {
  const { base, sidecarToken } = ctx;
  const r = await callTool(base, sidecarToken, 'get_enso_status', {});
  const phase = r.json?.enso_status?.phase || r.json?.phase || null;
  const status = r.ok && phase ? 'pass' : 'fail';
  return { status, valor: `fase=${phase || 'N/A'}`, detalle: `get_enso_status HTTP ${r.status}, fase=${phase || 'N/A'} (ONI=${r.json?.enso_status?.oni_value ?? 'N/A'}).`, data: { phase } };
}

async function runCalendario(ctx) {
  const { base, sidecarToken } = ctx;
  const mes = new Date().getUTCMonth() + 1;
  const r = await callTool(base, sidecarToken, 'get_calendario_siembra', { piso_termico: 'templado', mes });
  const hasData = r.ok && r.json && !r.json.error && (r.json.available !== false);
  return { status: hasData ? 'pass' : 'fail', valor: `HTTP ${r.status}`, detalle: `get_calendario_siembra(templado, mes ${mes}) HTTP ${r.status}${hasData ? '' : ' → sin datos/available:false'}.`, data: { status: r.status } };
}

async function runSidecarHealth(ctx) {
  const { base, sidecarToken } = ctx;
  const h = await httpFetch(`${base}/api/mcp/agro/health`, { headers: { 'X-Chagra-Token': sidecarToken }, timeoutMs: 20000 });
  const health = h.json || {};
  const sidecarOk = h.ok && health.status === 'ok';
  const ollamaOk = health.ollama_up === true || (health.ollama_models && health.ollama_models.length > 0);
  const tools = await httpFetch(`${base}/api/mcp/agro/tools`, { headers: { 'X-Chagra-Token': sidecarToken }, timeoutMs: 20000 });
  const toolsOk = tools.ok && tools.text.length > 1000;
  const kokoro = await httpFetch(`${base}/api/kokoro/health`, { timeoutMs: 15000 });
  const kokoroOk = kokoro.ok && /ok|kokoro/i.test(kokoro.text);
  const tags = await httpFetch(`${base}/api/ollama/api/tags`, { headers: { Authorization: `Bearer ${ctx.token || ''}` }, timeoutMs: 15000 });
  const ollamaTagsOk = tags.ok && Array.isArray(tags.json?.models) && tags.json.models.length > 0;
  const status = sidecarOk && ollamaOk && toolsOk && kokoroOk && ollamaTagsOk ? 'pass' : 'fail';
  return {
    status,
    valor: `sidecar ${health.build_sha || '?'}, ollama=${ollamaOk}, kokoro=${kokoroOk}, tools=${toolsOk}`,
    detalle: `/health build_sha=${health.build_sha || '?'} (${sidecarOk ? 'ok' : 'DOWN'}), ollama_up=${ollamaOk}, kokoro=${kokoroOk}, /tools=${toolsOk}, ollama/tags=${ollamaTagsOk}.`,
    data: { build_sha: health.build_sha, sidecarOk, ollamaOk, kokoroOk, toolsOk, ollamaTagsOk },
  };
}

// ── B0d: smoke visual (Playwright, backend REAL) ───────────────────────────────
const KNOWN_CHROMIUM = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];
function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  for (const p of KNOWN_CHROMIUM) if (existsSync(p)) return p;
  try { const w = execSync('which chromium 2>/dev/null', { encoding: 'utf-8' }).trim(); if (w) return w; } catch (_) { /* noop */ }
  return undefined;
}
const BENIGN_CONSOLE = /sqlite|wasm|content security policy|csp|favicon|manifest|WebGL|Failed to load resource|net::ERR|ArrayBuffer instantiation|Error obteniendo tareas|FarmOS|preload|React DevTools|kokoro|whisper|Service Worker|sw\.js/i;

async function runVisual(ctx) {
  const { base, token, target, dateStr, outDir } = ctx;
  if (!token) return { status: 'skip', valor: 'sin token', detalle: 'Login falló; no puedo montar sesión.' };
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch (err) { return { status: 'skip', valor: 'sin playwright', detalle: `Playwright no disponible: ${String(err?.message || err).slice(0, 80)}` }; }
  const shotsDir = join(outDir, 'shots');
  mkdirSync(shotsDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: resolveChromium(), args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--disable-dev-shm-usage'] });
  const errors = []; const shots = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on('pageerror', (err) => { const t = String(err?.message || err); if (!BENIGN_CONSOLE.test(t)) errors.push(`pageerror: ${t}`); });
  page.on('console', (msg) => { if (msg.type() !== 'error') return; const t = msg.text(); if (!BENIGN_CONSOLE.test(t)) errors.push(`console: ${t}`); });
  let mounted = false;
  try {
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.evaluate(async ({ tok, tenant }) => {
      localStorage.setItem('chagra:profile:done:v1', '1');
      localStorage.setItem('chagra:onboarding:done', '1');
      localStorage.setItem('chagra:active_tenant_id', tenant);
      localStorage.setItem('chagra_feedback_consent_v1', 'true');
      await new Promise((resolve) => {
        const req = indexedDB.open('Chagra');
        req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('syncQueue')) req.result.createObjectStore('syncQueue'); };
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('syncQueue')) { db.close(); resolve(); return; }
          const tx = db.transaction('syncQueue', 'readwrite'); const store = tx.objectStore('syncQueue');
          store.put(tok, 'farmos_access_token'); store.put(Date.now() + 3600_000, 'farmos_token_expiry');
          tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); resolve(); };
        };
        req.onerror = () => resolve();
      });
    }, { tok: token, tenant: `canario-${target}` });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('#root').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    const screens = [{ id: 'home', hash: '' }, { id: 'agente', hash: 'agente' }, { id: 'perfil', hash: 'perfil' }, { id: 'mis-zonas', hash: 'inventario' }];
    for (const sc of screens) {
      await page.goto(`${base}/${sc.hash ? `#${sc.hash}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await sleep(1200);
      if (sc.id === 'home' && (await page.locator('#root').count())) mounted = true;
      const file = join(shotsDir, `${dateStr}-${target}-${sc.id}.png`);
      await page.screenshot({ path: file, fullPage: false }).catch(() => {});
      shots.push(file);
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  const status = mounted && errors.length === 0 ? 'pass' : 'fail';
  return { status, valor: `home ${mounted ? 'montó' : 'NO'}, ${errors.length} errores`, detalle: `home ${mounted ? 'montó' : 'NO montó'}, ${shots.length} screenshots, ${errors.length} errores de consola.`, data: { mounted, shots, console_errors: errors.slice(0, 10) } };
}

// ── A1/A2: cosecha del juez ─────────────────────────────────────────────────────
/** A1 — dataset de destilado (insumo futuro LoRA granite). Acumula, no pisa. Sintético = anti-leak. */
async function runDistill(ctx) {
  const { responses = [], verdictsById, topic, target, outDir, dateStr } = ctx;
  if (!responses.length) return { status: 'skip', valor: '0', detalle: 'Sin respuestas para destilar.' };
  const file = join(outDir, 'distill-dataset', `distill-${dateStr}.jsonl`);
  let n = 0;
  let conCorreccion = 0;
  for (const r of responses) {
    if (!r.agent_text) continue;
    const v = verdictsById?.get(`${topic.id}-t${r.turn}`);
    const grounded = Boolean(v && v.contaminated === false && (r.post_validate_hallucinated || 0) === 0);
    // El juez (B0g) ya produjo la respuesta grounded corregida. Sin ella la tupla
    // no sirve para LoRA → la poblamos aquí. Si el juez marcó gap, queda vacía y
    // se registra el gap (lo escribe A2).
    const correccion = v && typeof v.respuesta_corregida === 'string' && v.respuesta_corregida.length > 20 ? v.respuesta_corregida : null;
    if (correccion) conCorreccion += 1;
    appendJsonl(file, {
      ts: nowIso(), target, tema: topic.id, tema_problema: topic.problema, turno: r.turn, tipo_pregunta: r.kind,
      pregunta: r.user_text, respuesta_granite: r.agent_text, modelo: r.model,
      veredicto_juez: v ? { contaminated: v.contaminated, category: v.category, explanation: v.explanation, source: v.source } : { source: 'unjudged' },
      respuesta_corregida: correccion,
      es_gap: Boolean(v && v.is_gap),
      grounded,
      tipo_error: v && v.contaminated ? (v.category || 'contaminacion') : ((r.post_validate_hallucinated || 0) > 0 ? 'entidad_alucinada' : null),
    });
    n += 1;
  }
  return { status: 'pass', valor: `${n} tuplas, ${conCorreccion} con corrección`, detalle: `${n} tuplas acumuladas en ${file} (${conCorreccion} con respuesta_corregida grounded; insumo LoRA; sintético, sin PII).`, data: { file, n, con_correccion: conCorreccion } };
}

/** A2 — gaps de grounding → cola DR. Dos fuentes: (1) el sujeto no resolvió en el
 *  grafo (heurística resolve-entities); (2) el juez de B0g marcó `is_gap` en algún
 *  turno (el grafo no tenía lo necesario para corregir). Ambos alimentan DR. */
async function runGaps(ctx) {
  const { responses = [], topic, target, outDir, dateStr, judgeGaps = [] } = ctx;
  const file = join(outDir, `grounding-gaps-${dateStr}.jsonl`);
  let anotados = 0;

  // (1) Heurística: el sujeto del tema no resolvió en el grafo.
  const resolvedAll = norm(responses.flatMap((r) => r.entities_grounded || []).join(' | '));
  const subjectResolved =
    resolvedAll.includes(norm(topic.patogeno).split(' ')[0]) ||
    resolvedAll.includes(norm(topic.cientifico).split(' ')[0]) ||
    resolvedAll.includes(norm(topic.cultivo));
  if (!subjectResolved) {
    appendJsonl(file, {
      ts: nowIso(), target, tema: topic.id, entidad_faltante: `${topic.patogeno} / ${topic.cientifico}`, cultivo: topic.cultivo,
      que_se_necesita: `Especie/plaga "${topic.patogeno}" (${topic.tipo}) en ${topic.cultivo} (${topic.cientifico}) y sus aristas (AFFECTS/SUSCEPTIBLE_TO, control cultural, biopreparados, fuente ${topic.fuente}) no resolvieron. Encolar DR/ingest.`,
      detectado_por: 'resolve-entities vacío para el sujeto del tema',
    });
    anotados += 1;
  }

  // (2) Gaps que marcó el juez de B0g (no pudo corregir con el grafo).
  for (const g of judgeGaps) {
    const turno = String(g.id || '').split('-t')[1] || '?';
    appendJsonl(file, {
      ts: nowIso(), target, tema: topic.id, entidad_faltante: `${topic.patogeno} / ${topic.cientifico}`, cultivo: topic.cultivo,
      que_se_necesita: `El juez no pudo dar respuesta_corregida grounded para el turno ${turno} (${g.category || 'gap'}): ${clip(g.explanation, 300)}. Enriquecer el grafo/catálogo (fuente ${topic.fuente}) y encolar DR.`,
      detectado_por: 'juez B0g marcó is_gap (evidencia del grafo insuficiente)',
    });
    anotados += 1;
  }

  if (anotados === 0) return { status: 'pass', valor: 'sin gaps', detalle: `El sujeto del tema (${topic.patogeno}/${topic.cientifico}) resolvió y el juez corrigió con el grafo; sin gap.` };
  return { status: 'pass', valor: `${anotados} gap(s) anotados`, detalle: `${anotados} gap(s) de grafo anotados en ${file} → alimentan cola DR.`, data: { file, anotados, judge_gaps: judgeGaps.length } };
}

// ── C1: CANARIO DE SEGURIDAD + ALUCINACIÓN (banco dinámico multidimensional) ────
/**
 * C1 — barre cada noche un subconjunto ROTATORIO de sondas que quedaban FUERA DE
 * FOCO del canario B0: químicos reales vetados por el ICA (dosis peligrosas),
 * especies/normas FANTASMA (alucinación), trampas cross-térmicas y confusiones
 * plaga↔enfermedad sobre pools amplios. Manda cada sonda por el pipeline REAL
 * (resolve-entities → system prompt enriquecido → generateChat) y la evalúa con
 * GUARDS DETERMINISTAS (`evaluateProbe`). El juez claude-code -p es señal extra
 * opcional (nunca gate). FAIL si CUALQUIER sonda de seguridad/alucinación falla:
 * recetar dosis de un vetado, inventar biología de algo inexistente o confirmar
 * una norma fabricada es un riesgo, no un matiz.
 */
async function runSecurityProbes(ctx) {
  const { base, sidecarToken, token, chatModel, target, dateStr, outDir, now } = ctx;
  const probes = pickDynamicProbes(now || new Date());
  const results = [];
  for (const p of probes) {
    try {
      const reR = await sidecarPost(base, sidecarToken, '/resolve-entities', { user_message: p.query }).catch(() => null);
      const entities = reR?.ok && Array.isArray(reR.json?.entities) ? reR.json.entities : [];
      const systemPrompt = buildEnrichedSystemPrompt(entities);
      const gen = await generateChat(base, token, systemPrompt, p.query, chatModel);
      const text = gen.response || '';
      // post-validate del sidecar (señal extra de alucinación de entidades).
      let pvHits = 0;
      if (text) {
        const pvR = await sidecarPost(base, sidecarToken, '/post-validate', { user_message: p.query, response: text }).catch(() => null);
        if (pvR?.ok && pvR.json) pvHits = pvR.json.detected_count || (pvR.json.hallucinated || []).length || 0;
      }
      const ev = evaluateProbe(p, text);
      results.push({
        id: p.id, categoria: p.categoria, dimension: p.dimension, subject: p.subject,
        query: p.query, respuesta: clip(text, 900), pass: ev.pass, flags: ev.flags,
        reason: ev.reason, post_validate_hits: pvHits, latency_ms: gen.latency_ms, error: gen.error || null,
      });
    } catch (err) {
      results.push({ id: p.id, categoria: p.categoria, dimension: p.dimension, subject: p.subject, query: p.query, respuesta: '', pass: false, flags: ['excepcion'], reason: String(err?.message || err).slice(0, 200), post_validate_hits: 0 });
    }
  }

  // Log sintético (anti-leak: sin PII) para trackear cobertura/deriva por noche.
  appendJsonl(join(outDir, 'security-probes', `c1-${dateStr}.jsonl`), {
    ts: nowIso(), target, fecha: dateStr, total: results.length,
    fallidos: results.filter((r) => !r.pass).length,
    sondas: results.map((r) => ({ id: r.id, categoria: r.categoria, subject: r.subject, pass: r.pass, flags: r.flags, reason: r.reason })),
  });

  const failed = results.filter((r) => !r.pass);
  const byCat = {};
  for (const r of results) { byCat[r.categoria] = byCat[r.categoria] || { pass: 0, fail: 0 }; byCat[r.categoria][r.pass ? 'pass' : 'fail'] += 1; }
  const catResumen = Object.entries(byCat).map(([c, v]) => `${c} ${v.pass}/${v.pass + v.fail}`).join(', ');
  const status = failed.length === 0 ? 'pass' : 'fail';
  return {
    status,
    valor: `${results.length - failed.length}/${results.length} sondas OK`,
    detalle: failed.length === 0
      ? `banco dinámico: ${results.length} sondas de seguridad/alucinación PASAN (${catResumen}).`
      : `banco dinámico: ${failed.length}/${results.length} FALLAN → ${failed.map((r) => `${r.categoria}(${r.subject}): ${r.reason}`).join(' | ')}`.slice(0, 900),
    data: { probes: results, resumen_categorias: byCat },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRO — P0 implementados + P1/P2 stubbeados (firma lista, TODO claro)
// ═══════════════════════════════════════════════════════════════════════════════
const stub = (id, nombre, categoria, fase, todo) => ({ id, nombre, categoria, fase, stub: true, todo });

export const MODULES = [
  // ── P0 salud/pipeline ──
  { id: 'login', nombre: 'Login OAuth (usuario de pruebas)', categoria: 'salud', fase: 'P0', run: runLogin },
  { id: 'B0', nombre: 'Conversación dinámica 4-msgs (tema rota por fecha)', categoria: 'salud', fase: 'P0', run: runConversacion },
  { id: 'B0g', nombre: 'Grounding (juez claude-code -p: alucinación/contaminación)', categoria: 'salud', fase: 'P0', run: runGrounding },
  { id: 'B0b', nombre: 'Guardar planta con foto (aislada bajo CANARIO-PRUEBAS)', categoria: 'salud', fase: 'P0', run: runPlantaFoto },
  { id: 'B0c', nombre: 'Verificar captura de conversación (JSONL agro-mcp)', categoria: 'salud', fase: 'P0', run: runCaptura },
  { id: 'B0d', nombre: 'Smoke visual (Playwright: monta + 0 errores + screenshots)', categoria: 'salud', fase: 'P0', run: runVisual },
  { id: 'B0f', nombre: 'Golden/regresión: ración avícola en altura (Choachí 2500 msnm)', categoria: 'salud', fase: 'P0', run: runAvicolaFrio },
  // ── P0 datos dinámicos ──
  { id: 'D1', nombre: 'Clima IDEAM (boletín/snapshot fresco)', categoria: 'dinamico', fase: 'P0', run: runClima },
  { id: 'D2', nombre: 'Precio SIPSA (precio real y reciente)', categoria: 'dinamico', fase: 'P0', run: runPrecio },
  { id: 'D3', nombre: 'ENSO (fase actual)', categoria: 'dinamico', fase: 'P0', run: runEnso },
  { id: 'D4', nombre: 'Calendario de siembra (por piso térmico)', categoria: 'dinamico', fase: 'P0', run: runCalendario },
  { id: 'D5', nombre: 'Sidecar/agente (/health, tools, kokoro, ollama)', categoria: 'dinamico', fase: 'P0', run: runSidecarHealth },
  // ── P0 cosecha del juez ──
  { id: 'A1', nombre: 'Dataset de destilado (→ LoRA granite; acumula)', categoria: 'cosecha', fase: 'P0', run: runDistill },
  { id: 'A2', nombre: 'Gaps de grounding → cola DR/scrapers', categoria: 'cosecha', fase: 'P0', run: runGaps },

  // ── P0 seguridad + alucinación (banco dinámico, corre cada noche) ──
  // Autocontenido (no depende de B0): manda sus propias sondas por el pipeline.
  // En P0 para que el canario nocturno lo corra por defecto (--phases=P0).
  { id: 'C1', nombre: 'Seguridad + alucinación: banco DINÁMICO rotatorio (químicos vetados/dosis · especies/normas fantasma · cross-térmico · confusión plaga-enfermedad)', categoria: 'seguridad', fase: 'P0', run: runSecurityProbes },

  // ── P1 (esta semana) — STUBS registrados, firma lista ──
  stub('B1', 'SLA de disponibilidad (histórico PASS/FAIL)', 'salud', 'P1',
    'run(ctx): registrar uptime del target (home + version.json + chunk JS no-404) y acumular serie histórica; reportar % disponibilidad rolling.'),
  stub('B2', 'Regresión de latencia (agente/TTS/carga)', 'salud', 'P1',
    'run(ctx): medir p50/p95 de generateChat + kokoro TTS + carga de home; comparar contra baseline histórico; FAIL si empeora > umbral.'),
  stub('B4', 'Canario post-deploy (correr tras CADA deploy)', 'salud', 'P1',
    'Se dispara desde un hook de deploy.yml / systemd path-unit sobre version.json; correr subset rápido (login+B0+D5) inmediatamente tras deploy.'),
  stub('B6', 'Integridad de datos (conteos grafo/catálogo, tools sidecar, features no huérfanas)', 'salud', 'P1',
    'run(ctx): leer chagra-stats.json (especies/biopreparados) + /tools (count) + CANARY_GRAFO_COUNT_CMD (aristas AGE) y comparar contra floors; FAIL si cayeron.'),
  stub('C5', 'Mapa de cobertura de conocimiento (dónde es débil el agente → prioriza DR)', 'cosecha', 'P1',
    'run(ctx): agregar veredictos del juez por cultivo/tema en el tiempo; producir mapa de debilidad → ordena la cola DR por peor cobertura.'),
  stub('C8', 'Re-bench de guards nocturno (trío contaminación, % en el tiempo)', 'salud', 'P1',
    'run(ctx): correr bench-contaminacion.mjs (cross_thermal/confusion/pest) de noche en el host de GPU (sola) y trackear el % de contaminación por guard.'),
  stub('C9', 'Telemetría de costo/tokens de la flota (afina FLEET_TIMING)', 'cosecha', 'P1',
    'run(ctx): sumar tokens/costo por agente de la flota en la noche (glm-stats + logs codex/opencode) → reporte de gasto/noche.'),
  stub('C10', 'Resiliencia offline (offline→registrar→reconectar→sync)', 'salud', 'P1',
    'run(ctx): correr tests/e2e/offline.spec como check nocturno contra el target (Playwright: offline, registrar planta, reconectar, verificar sync a farmOS).'),
  stub('A3', 'FAQ precomputada (Q&A verificadas servidas sin LLM)', 'cosecha', 'P1',
    'run(ctx): de las tuplas grounded del destilado, materializar un JSON de FAQ (pregunta→respuesta verificada) para servir offline sin LLM (0 alucinación).'),
  stub('A4', 'Minado de guards (patrones de alucinación → guards deterministas)', 'cosecha', 'P1',
    'run(ctx): agrupar los red-flags/contaminaciones del juez en patrones recurrentes → proponer reglas para outputGuards (guard gratis).'),
  stub('A5', 'Corpus golden de regresión (resp-corregida = referencia)', 'cosecha', 'P1',
    'run(ctx): guardar las respuestas corregidas del juez como golden; en corridas futuras, comparar y cazar regresiones de calidad.'),

  // ── P2 (después) — STUBS registrados ──
  stub('B3', 'Regresión visual (screenshots diff)', 'salud', 'P2', 'run(ctx): diff pixel de los screenshots del smoke contra baseline (más allá del smoke mount+errores actual).'),
  stub('B5', 'Gate de pilotos (verifica flujos antes del alta)', 'salud', 'P2', 'run(ctx): correr el checklist de alta de piloto (roster + flujos por usuario) antes de habilitar.'),
  stub('C2', 'Registro campesino (habla accesible, no jerga)', 'cosecha', 'P2', 'run(ctx): juez verifica que el modo campesino evita jerga técnica.'),
  stub('C3', 'Detección de deriva (misma pregunta en el tiempo)', 'cosecha', 'P2', 'run(ctx): repetir una pregunta ancla y alarmar si la calidad se degrada (drift modelo/grafo).'),
  stub('C4', 'A/B de prompts nocturno (el juez elige la mejor variante)', 'cosecha', 'P2', 'run(ctx): generar con 2 system-prompts, juez elige → auto-mejora del prompt (Opus semanal).'),
  stub('C6', 'Los 3 modos (experto/campesino/maestro) apropiados', 'salud', 'P2', 'run(ctx): mismo prompt en los 3 modos, juez verifica registro apropiado por modo.'),
  stub('C7', 'Whisper es-CO (calidad de transcripción)', 'dinamico', 'P2', 'run(ctx): mandar audio de referencia a /api/whisper y medir WER es-CO.'),
  stub('C11', 'Onboarding/PWA install + wake-word', 'salud', 'P2', 'run(ctx): Playwright: flujo de alta nuevo (onboarding + install + wake-word colibrí) funciona.'),
  stub('C12', 'Backup/recuperabilidad de la data de finca', 'seguridad', 'P2', 'run(ctx): verificar que existe backup reciente de farmOS y que restaura (dry-run).'),
  stub('A6', 'Banco de few-shot (mejores respuestas → ejemplos al prompt)', 'cosecha', 'P2', 'run(ctx): seleccionar top respuestas grounded como few-shots in-context.'),
  stub('A7', 'Calibración del semáforo de confianza', 'cosecha', 'P2', 'run(ctx): mapear scores del juez → semáforo de confianza mostrado al usuario.'),
  stub('A9', 'Curación del catálogo (juez marca errores → autocorrección)', 'cosecha', 'P2', 'run(ctx): juez marca errores de catálogo (familia/patógeno) → propone PR de corrección del catálogo.'),
  stub('A10', 'Explicaciones/tutoría (Opus semanal: el "por qué")', 'cosecha', 'P2', 'run(ctx) [weekly/Opus]: generar explicaciones pedagógicas para modo campesino/maestro.'),
];

/** Devuelve los módulos activos (fase en activePhases y con run) + los stubs a reportar. */
export function selectModules(activePhases) {
  const active = new Set(activePhases);
  return MODULES.map((m) => ({ ...m, _active: !m.stub && m.run && active.has(m.fase) }));
}
