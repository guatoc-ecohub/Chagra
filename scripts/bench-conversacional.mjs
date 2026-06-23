#!/usr/bin/env node
/**
 * bench-conversacional.mjs — mide COHERENCIA / MEMORIA multi-turno del agente.
 *
 * Semilla: el fallo real gota→riego (2026-06-22). El agente, en el turno 2 de
 * una conversación sobre la gota del tomate, enrutó a `agendar_riego` (tool
 * client-side), perdió el hilo, deflectó y terminó haciendo el pitch de
 * capacidades. Este harness reproduce ese tipo de fallo de forma MEDIBLE.
 *
 * FIDELIDAD AL PIPELINE DE PROD (AgentScreen.handleSubmit):
 *   - contextMemory como STRING pin (formato exacto de conversationMemory
 *     .getContextString: "Conversación previa:\nUsuario: …\nAsistente: …").
 *     Prod NO manda array multi-mensaje; pinea el historial en el system prompt.
 *   - resolve-entities AGE por turno (el server IGNORA `context`, igual que prod
 *     hoy: la anáfora NO se re-resuelve a nivel de entidad → recae en el pin).
 *   - system prompt = buildBasePrompt({query, contextMemory, plantContext}) +
 *     buildResolvedEntitiesBlock + buildQueryAnalysisBlock(analyzeQuery) — los
 *     MISMOS exports que la PWA.
 *   - generador a config-prod: granite3.3:8b, temp 0.3, seed 42, num_predict 768.
 *   - tools client-side via getToolsForLLM() pasados a ollama /api/chat → el
 *     modelo puede emitir message.tool_calls. Ahí se captura el RUTEO (el
 *     misruteo agendar_riego). Si llmTools no carga en node, cae a un set
 *     mínimo (incluye agendar_riego) para no perder el check crítico.
 *   - applyOutputGuards (guards deterministas de prod) + post-validate sidecar.
 *
 * EVALUACIÓN (por turno, contra `expect` del fixture). Honestidad metodológica:
 *   se SEPARAN dos clases de señal y se reportan por separado:
 *   - DURAS (deterministas, alta confianza): ruteo (not_route/route, vía
 *     tool_calls + nlu), safety-hold (rechazo sostenido), deflección/pitch
 *     (regex sobre el texto). Son exactamente los modos de fallo del bug real.
 *   - BLANDAS (heurística de keywords, direccionales): stays_topic, grounds,
 *     resolves_to, pivots_to, recognizes_correction, asks_clarification.
 *   El JSONL persiste la RESPUESTA CRUDA de cada turno → revisión por CONTENIDO
 *   (lo que el fixture pide explícitamente). El número DURO es el veredicto;
 *   el BLANDO es tendencia.
 *
 * Uso:
 *   node scripts/bench-conversacional.mjs
 *   GEN_MODEL=granite3.3:8b node scripts/bench-conversacional.mjs
 *   FIXTURE=/ruta/al/test.json LIMIT=1 node scripts/bench-conversacional.mjs   # smoke
 *
 * Output: data/bench-runs/conversacional-YYYY-MM-DD.jsonl + .summary.json
 */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  resolveEntities as resolveEntitiesLib,
  postValidate as postValidateLib,
  gpuTemp,
  thermalGuard,
  getSidecarToken,
  sleep,
} from './lib/bench-sidecar.mjs';
import {
  buildBasePrompt,
  buildResolvedEntitiesBlock,
  buildQueryAnalysisBlock,
  analyzeQuery,
} from '../src/services/agentPromptBase.js';
import { applyOutputGuards } from '../src/services/outputGuards.js';
// funciones puras del evaluador (importadas para ser testeables sin sidecar)
import {
  norm,
  effectiveRoutes,
  evalTurn,
} from './lib/bench-conversacional-eval.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const BENCH_RUNS_DIR = process.env.BENCH_OUTPUT_DIR || join(ROOT_DIR, 'data', 'bench-runs');

const GEN_MODEL = process.env.GEN_MODEL || 'granite3.3:8b';
const GEN_TEMPERATURE = 0.3;
const GEN_MAX_TOKENS = 768;
const SEED = Number(process.env.SEED || 42);
const SIDECAR_URL = process.env.SIDECAR_URL || 'http://localhost:7880';
const OLLAMA_CHAT_URL = process.env.OLLAMA_CHAT_URL || 'http://localhost:11434/api/chat';
const GEN_TIMEOUT_MS = 180_000;
const NLU_TIMEOUT_MS = 20_000;
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;

const FIXTURE =
  process.env.FIXTURE ||
  join(homedir(), 'Workspace/Chagra-strategy/deepresearch/TEST_CONVERSACIONAL_ENDURECIDO_2026-06-22.json');

// ── carga de tools client-side (getToolsForLLM); fallback mínimo si no carga ──
//
// llmTools.js está acoplado al browser (window/indexedDB/URL al cargar) → no
// importa en node puro ni con shims razonables. Pero las DEFINICIONES (name +
// description, lo único que el LLM ve para decidir el tool-call) son literales
// estáticos en bloques `registerTool({...})`. Las extraemos del fuente: fiel
// para medir RUTEO (incl. el misruteo gota→agendar_riego), sin ejecutar handlers.
function extractToolsFromSource() {
  const src = readFileSync(join(ROOT_DIR, 'src/services/llmTools.js'), 'utf-8');
  // Split por bloque registerTool(...): el PRIMER name + PRIMER description de
  // cada bloque son los del tool (van antes de parameters.properties, que
  // también tiene `description:` por campo → por eso no se puede parear global).
  // Backreference de comilla soporta ' " ` (descripciones template multilínea).
  const blocks = src.split('registerTool(').slice(1);
  const tools = [];
  const seen = new Set();
  for (const b of blocks) {
    const nameM = b.match(/name:\s*(['"`])([^'"`]+)\1/);
    if (!nameM) continue;
    const name = nameM[2];
    if (seen.has(name)) continue;
    const descM = b.match(/description:\s*(['"`])([\s\S]*?)\1/);
    const description = descM ? descM[2].replace(/\s+/g, ' ').trim() : name;
    seen.add(name);
    // El detalle de properties no cambia el ruteo → schema mínimo válido.
    tools.push({ type: 'function', function: { name, description, parameters: { type: 'object', properties: {} } } });
  }
  return tools;
}

async function loadTools() {
  try {
    const tools = extractToolsFromSource();
    // El agente client-side tiene 4 tools reales (crear_log, actualizar_planta,
    // agendar_riego, query_corpus_dr034). >=3 ⇒ extracción sana.
    if (tools.length >= 3) return { tools, source: `llmTools.js (extracción estática, ${tools.length} defs)` };
    console.log(`  [tools] extracción estática dio solo ${tools.length} → fallback mínimo`);
  } catch (err) {
    console.log(`  [tools] extracción estática falló (${String(err.message).slice(0, 70)}) → fallback mínimo`);
  }
  // Fallback: set mínimo en formato ollama (incluye agendar_riego, el crítico).
  const fb = (name, desc, props = {}) => ({
    type: 'function',
    function: { name, description: desc, parameters: { type: 'object', properties: props } },
  });
  return {
    source: 'fallback-minimo',
    tools: [
      fb('agendar_riego', 'Programa o agenda un riego para un cultivo del usuario.', {
        cultivo: { type: 'string' },
        fecha: { type: 'string' },
      }),
      fb('crear_log', 'Registra una observación o bitácora de la finca.', { texto: { type: 'string' } }),
      fb('crear_tarea', 'Crea una tarea de finca.', { titulo: { type: 'string' } }),
      fb('agendar_fertilizacion', 'Agenda una fertilización.', { cultivo: { type: 'string' } }),
    ],
  };
}

// nombre de tool desde un tool_call de ollama (formatos posibles)
function toolCallName(tc) {
  return tc?.function?.name || tc?.name || null;
}

async function planNlu(userMessage, context) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getSidecarToken();
  if (token) headers['X-Chagra-Token'] = token;
  const body = { user_message: userMessage };
  if (context) body.context = context;
  try {
    const res = await fetch(`${SIDECAR_URL}/nlu`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(NLU_TIMEOUT_MS),
    });
    if (!res.ok) return { useTool: false, tool: null };
    const raw = await res.json();
    return {
      useTool: Boolean(raw.use_tool),
      tool: typeof raw.tool === 'string' ? raw.tool : null,
      toolChain: Array.isArray(raw.tool_chain) ? raw.tool_chain.map((s) => s?.tool).filter(Boolean) : [],
    };
  } catch {
    return { useTool: false, tool: null, toolChain: [] };
  }
}

async function generateWithTools(systemPrompt, userPrompt, tools) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEN_TIMEOUT_MS);
  try {
    const res = await fetch(OLLAMA_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEN_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools,
        options: { temperature: GEN_TEMPERATURE, seed: SEED, num_predict: GEN_MAX_TOKENS },
        keep_alive: '30m',
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`gen HTTP ${res.status}`);
    const data = await res.json();
    const msg = data.message || {};
    return {
      content: msg.content || '',
      toolCalls: Array.isArray(msg.tool_calls) ? msg.tool_calls.map(toolCallName).filter(Boolean) : [],
      latency_ms: performance.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}

// serializa el historial al formato EXACTO de getContextString (pin de prod)
function buildContextMemory(history) {
  if (!history.length) return '';
  const parts = history.map((t) => `${t.role === 'user' ? 'Usuario' : 'Asistente'}: ${t.content}`);
  return `\n\nConversación previa:\n${parts.join('\n')}\n\n`;
}

async function main() {
  if (!existsSync(FIXTURE)) {
    console.log(`SKIP: no existe fixture ${FIXTURE}`);
    process.exit(0);
  }
  if (!existsSync(BENCH_RUNS_DIR)) mkdirSync(BENCH_RUNS_DIR, { recursive: true });

  const fx = JSON.parse(readFileSync(FIXTURE, 'utf-8'));
  const casos = (fx.casos || []).slice(0, LIMIT);
  const { tools, source: toolSource } = await loadTools();

  console.log('[bench-conversacional] coherencia/memoria multi-turno');
  console.log(`[bench-conversacional] generador: ${GEN_MODEL} temp=${GEN_TEMPERATURE} seed=${SEED}`);
  console.log(`[bench-conversacional] tools: ${tools.length} (${toolSource})`);
  console.log(`[bench-conversacional] fixture: ${casos.length} casos · GPU ${gpuTemp() ?? 'n/d'}°C`);

  const results = [];
  let hardPass = 0,
    hardTot = 0,
    softPass = 0,
    softTot = 0;

  for (const caso of casos) {
    console.log(`\n■ ${caso.id} — ${caso.escenario || ''}`);
    const history = [];
    const turnsOut = [];
    for (let ti = 0; ti < caso.turns.length; ti++) {
      const turn = caso.turns[ti];
      await thermalGuard();
      const ctx = buildContextMemory(history);
      let nlu, entities, gen, guarded, validation;
      try {
        nlu = await planNlu(turn.user, ctx);
        const re = await resolveEntitiesLib(turn.user, { sidecarUrl: SIDECAR_URL });
        entities = re.entities || [];
        const analysis = analyzeQuery(turn.user);
        const sys =
          buildBasePrompt({ plantContext: 'ninguna', query: turn.user, contextMemory: ctx, isEnum: analysis.isEnum }) +
          '\n\n' +
          buildResolvedEntitiesBlock(entities) +
          '\n\n' +
          buildQueryAnalysisBlock(analysis);
        gen = await generateWithTools(sys, turn.user, tools);
        guarded = applyOutputGuards(gen.content, { resolvedEntities: entities, profileName: null });
        validation = await postValidateLib(turn.user, guarded.text, { sidecarUrl: SIDECAR_URL });
      } catch (err) {
        console.log(`  T${ti + 1} ERROR: ${err.message}`);
        turnsOut.push({ turn: ti + 1, user: turn.user, error: err.message });
        history.push({ role: 'user', content: turn.user });
        continue;
      }

      const { hard, soft } = evalTurn(turn.expect, gen, nlu, entities, guarded);
      // HARD universal (anti-stub): la respuesta NO debe ser idéntica a la del
      // turno anterior. Caza el fallo real gota→stub (T2===T3 byte a byte por
      // truncación de guardConciseResponse sobre un preámbulo de seguridad).
      const prevAssistant = [...history].reverse().find((h) => h.role === 'assistant');
      if (prevAssistant) {
        hard.push({ key: 'no_repeat_previous', pass: norm(guarded.text) !== norm(prevAssistant.content) });
      }
      for (const h of hard) {
        hardTot++;
        if (h.pass) hardPass++;
      }
      for (const s of soft) {
        softTot++;
        if (s.pass) softPass++;
      }
      const hardStr = hard.map((h) => `${h.pass ? '✓' : '✗'}${h.key}`).join(' ');
      const softStr = soft.map((s) => `${s.pass ? '·' : '✗'}${s.key.split(':')[0]}`).join(' ');
      const routesStr = [...effectiveRoutes(gen, nlu)].join(',') || '∅';
      console.log(
        `  T${ti + 1} «${turn.user.slice(0, 42)}» → ruta=[${routesStr}] ent=${entities.length} halluc=${validation.detected_count} ${(gen.latency_ms / 1000).toFixed(1)}s`,
      );
      console.log(`     HARD ${hardStr || '—'}`);
      if (softStr) console.log(`     soft ${softStr}`);

      turnsOut.push({
        turn: ti + 1,
        user: turn.user,
        expect: turn.expect,
        nlu_tool: nlu.tool,
        chat_tool_calls: gen.toolCalls,
        effective_routes: [...effectiveRoutes(gen, nlu)],
        entities_grounded: entities.map((e) => e.nombre_cientifico || e.nombre_comun || e.mentioned).filter(Boolean),
        guards_fired: guarded.modified ? guarded.reasons : [],
        sidecar_halluc: validation.detected_count,
        response: guarded.text,
        hard,
        soft,
        latency_ms: Math.round(gen.latency_ms),
      });
      history.push({ role: 'user', content: turn.user });
      history.push({ role: 'assistant', content: guarded.text });
      await sleep(1500);
    }
    results.push({ id: caso.id, escenario: caso.escenario, turns: turnsOut });
  }

  const hardPct = hardTot ? (100 * hardPass) / hardTot : 0;
  const softPct = softTot ? (100 * softPass) / softTot : 0;
  const dateStr = new Date().toISOString().split('T')[0];
  const jsonlPath = join(BENCH_RUNS_DIR, `conversacional-${dateStr}.jsonl`);
  const summaryPath = join(BENCH_RUNS_DIR, `conversacional-${dateStr}.summary.json`);
  writeFileSync(jsonlPath, results.map((r) => JSON.stringify(r)).join('\n') + '\n');

  const summary = {
    generated_at: new Date().toISOString(),
    generator: { model: GEN_MODEL, temperature: GEN_TEMPERATURE, seed: SEED, max_tokens: GEN_MAX_TOKENS },
    tools_source: toolSource,
    fixture: FIXTURE,
    n_casos: casos.length,
    hard: { pass: hardPass, total: hardTot, pct: Number(hardPct.toFixed(1)) },
    soft: { pass: softPass, total: softTot, pct: Number(softPct.toFixed(1)) },
    failed_hard: results.flatMap((r) =>
      r.turns.flatMap((t) => (t.hard || []).filter((h) => !h.pass).map((h) => `${r.id}/T${t.turn}/${h.key}`)),
    ),
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

  console.log('\n══════════════════════════════════════════════════');
  console.log(`COHERENCIA DURA (ruteo/safety/deflección) = ${hardPct.toFixed(1)}%  (${hardPass}/${hardTot})`);
  console.log(`coherencia blanda (tema/grounding, heurística) = ${softPct.toFixed(1)}%  (${softPass}/${softTot})`);
  console.log(`JSONL:   ${jsonlPath}`);
  console.log(`SUMMARY: ${summaryPath}`);
  console.log('══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
