#!/usr/bin/env node
/**
 * bench-latencia-chat-completion.mjs — mide EN VIVO, contra Ollama en alpha,
 * el costo real de la completion final del turno del agente (la etapa que
 * BUG-06/PR #3109 tocó) con el prompt REAL de producción (mismos builders de
 * agentPromptBase.js/promptAssembler.js que usa AgentScreen.callLLM, fixture
 * Q1 "biopreparado para broca en café" de promptAssembler.budget.test.js —
 * grounding completo: entidades + evidencia + hechos curados + cadena
 * GraphRAG + corpus + historial de 8 turnos. ~6284 tokens de system + query).
 *
 * Objetivo puntual (spec 2026-09-03, latencia-medicion-vivo): resolver la
 * contradicción entre:
 *   Medición A (prompt corto/aislado, PR #3109): 48.6s→7.7s con
 *   reasoning_effort:"none".
 *   Medición B (sitio vivo, post-merge): contenido ya no vacío, pero TTFT
 *   sigue en 35.4-61.2s.
 *
 * Corre 4 escenarios × N reps cada uno contra http://localhost:11434 (el
 * mismo Ollama al que nginx proxyea /api/ollama en prod — se mide el backend
 * directo para aislar cómputo de red, que en loopback es despreciable):
 *   1) FULL  — prompt real (~6463 tok system + 8-turn history + query),
 *      reasoning_effort:"none" (el fix actual, ROUTES.chat de llmRouter.js).
 *   2) SHORT — mismo modelo/params, prompt corto (~40 tokens), mismo fix.
 *      Aísla el costo de PREFILL del prompt largo vs decode/reasoning.
 *   3) FULL_NO_REASONING_EFFORT — prompt real SIN reasoning_effort (repro
 *      control-negativo de BUG-06: confirma que sin el campo, el modelo
 *      thinking se come el presupuesto y devuelve vacío/length).
 *   4) FULL_WITH_TOOLS — prompt real + reasoning_effort:none + las 5 tools
 *      de function-calling que AgentScreen.jsx SIEMPRE adjunta cuando hay
 *      tools registradas (getToolsForLLM, líneas 1332-1335) — descarta que
 *      el schema de tools sea el costo invisible que Medición A no vio.
 *
 * RESULTADO (alpha, 2026-09-03, n=3 por escenario, GPU en reposo/sin otro
 * tráfico): TTFT 0.7-1.6s en TODOS los escenarios con contenido (1,2,4) —
 * ni el tamaño del prompt (~40 vs ~6463 tok) ni las 5 tools mueven el TTFT
 * de forma sostenida. El escenario 3 reproduce el bug original tal cual
 * (contenido SIEMPRE vacío, finish_reason:"length", ~38.5-41s perdidos en
 * razonamiento invisible) — confirma que BUG-06 sigue siendo un fix real y
 * necesario. CONCLUSIÓN: el fix funciona correctamente en aislamiento; la
 * brecha con Medición B NO es prefill ni tools — ver
 * bench-latencia-concurrencia-gpu.mjs (mismo directorio) para el mecanismo
 * real: contención/serialización de GPU cuando dos turnos de chat se
 * solapan en el mismo modelo caliente.
 *
 * Mide con fetch + streaming SSE manual (no depende de openaiStream.js del
 * bundle browser): TTFT (primer delta.content no vacío) y tiempo total.
 *
 * Reusa scripts/bench-rag-retrieve.loader.mjs (loader ESM ya existente en el
 * repo) para resolver imports extensionless de src/services/* y stubbear
 * authService.js/tenantContext.js/catalogDB.js — el mismo mecanismo que usa
 * bench-rag-retrieve.mjs para importar código de src/ desde node puro.
 *
 * Uso: node scripts/bench-latencia-chat-completion.mjs [--reps=3]
 */
import { performance } from 'node:perf_hooks';
import { register } from 'node:module';

const REPS = Number((process.argv.find((a) => a.startsWith('--reps=')) || '--reps=3').split('=')[1]) || 3;
const OLLAMA_URL = 'http://localhost:11434/v1/chat/completions';

register(new URL('./bench-rag-retrieve.loader.mjs', import.meta.url).href);

// ── Polyfill mínimo de window/localStorage (getProfile() lo necesita para
// replicar EXACTO el fixture de promptAssembler.budget.test.js) ────────────
const _store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (_store.has(k) ? _store.get(k) : null),
    setItem: (k, v) => _store.set(k, String(v)),
    removeItem: (k) => _store.delete(k),
  },
};

// ── Fixture Q1 REAL de promptAssembler.budget.test.js (biopreparado broca
// café, grounding completo) — copiado 1:1, no reimplementado. ──────────────
const PROFILE = {
  nombre: 'María', vereda: 'El Curí', municipio: 'Choachí', departamento: 'Cundinamarca',
  vocacion: 'campesino', finca_altitud: 2580, piso_termico: 'frío',
  cultivos_actuales: 'café, fresa, maíz', ubicacion_lat: 4.529, ubicacion_lng: -73.923,
};
const FINCA = { slug: 'guatoc', nombre: 'Guatoc', biocultural_zone: 'andino_alto', altitud: 2580, vereda: 'El Curí' };
const GROUPED_CULTIVOS = [
  { name: 'fresa', count: 15 }, { name: 'café', count: 3 }, { name: 'maíz', count: 2 }, { name: 'tomate cherry', count: 1 },
];
const PLANT_CONTEXT = 'fresa ×15, café ×3, maíz ×2, tomate cherry';
const CLIMA_SNAPSHOT = {
  fetched_at: '2026-06-10T10:00:00Z',
  enso_status: { phase: 'la_nina', label: 'La Niña', severity: 'moderada', oni_value: -0.9, trend: 'estable', ideam_probabilities: { nino_pct: 10, neutral_pct: 30, nina_pct: 60 }, sources: ['NOAA CPC', 'IDEAM', 'CIIFEN'] },
  alertas_locales: [
    { tipo: 'helada', severity: 'warning', mensaje: 'Mínima de 2°C prevista para el jueves en la madrugada' },
    { tipo: 'lluvia', severity: 'info', mensaje: 'Acumulado de 35mm en próximas 72h' },
  ],
  openmeteo: { available: true, forecast_7d: [
    { fecha: '2026-06-10', temp_min_c: 6, temp_max_c: 19, precip_mm: 4 },
    { fecha: '2026-06-11', temp_min_c: 4, temp_max_c: 18, precip_mm: 9 },
    { fecha: '2026-06-12', temp_min_c: 2, temp_max_c: 17, precip_mm: 12 },
    { fecha: '2026-06-13', temp_min_c: 5, temp_max_c: 18, precip_mm: 0 },
    { fecha: '2026-06-14', temp_min_c: 7, temp_max_c: 20, precip_mm: 2 },
    { fecha: '2026-06-15', temp_min_c: 8, temp_max_c: 21, precip_mm: 0 },
    { fecha: '2026-06-16', temp_min_c: 7, temp_max_c: 20, precip_mm: 6 },
  ] },
};
const CORPUS = Array.from({ length: 4 }, (_, i) => ({
  text:
    `Documento agronómico de referencia ${i + 1}. ` +
    'El manejo integrado de la broca del café (Hypothenemus hampei) combina control cultural (re-re: recolección de frutos sobremaduros y caídos del suelo, repase después de cosecha), control biológico con el hongo entomopatógeno Beauveria bassiana aplicado a frutos brocados en concentraciones de 1x10^9 conidias por mL, liberación del parasitoide Cephalonomia stephanoderis, y trampas artesanales con mezcla de alcoholes (metanol-etanol 3:1) a razón de 16 trampas por hectárea durante el pico de tránsito. La fertilización balanceada y el sombrío regulado al 40-50% reducen la incidencia. '.slice(0, 650),
}));
const MEMORY = Array.from({ length: 8 }, (_, i) =>
  `Usuario: pregunta previa número ${i + 1} sobre el manejo de la finca y sus cultivos de clima frío.\nAsistente: respuesta previa ${i + 1} con recomendaciones agroecológicas para la finca en Choachí, citando fuentes del catálogo Chagra.`,
).join('\n');
const ENT_CAFE = {
  mentioned: 'café', kind: 'species', nombre_comun: 'Café arábica', nombre_cientifico: 'Coffea arabica',
  canonical_id: 'species:coffea_arabica', confidence: 0.96, altitud_min: 1200, altitud_max: 2000,
  piso_termico: 'templado', temp_min: 8, temp_max: 26, helada_letal: 0,
  companions: ['plátano', 'guamo', 'frijol', 'aguacate'], antagonists: ['eucalipto'],
  alternativas_viables: ['curuba', 'uchuva', 'mora andina'],
};
const ENT_BROCA = { mentioned: 'broca', kind: 'plaga', nombre_comun: 'Broca del café', nombre_cientifico: 'Hypothenemus hampei', canonical_id: 'pest:hypothenemus_hampei', confidence: 0.98 };
const ENT_BEAUVERIA = {
  mentioned: 'biopreparado', kind: 'biopreparado', nombre_comun: 'Beauveria bassiana artesanal', nombre_cientifico: 'Beauveria bassiana',
  canonical_id: 'bio:beauveria_bassiana', confidence: 0.91,
  dosis_aplicacion: '1x10^9 conidias/mL, aspersión dirigida a frutos brocados, repetir a los 8 días',
  preparacion: 'multiplicación en arroz precocido 15 días, lavado y filtrado',
  ingredientes_resumen: 'cepa comercial registrada + arroz + agua hervida fría',
  target: ['broca del café'], precauciones: 'no mezclar con fungicidas; aplicar al atardecer', fuente: 'Cenicafé, Manejo integrado de la broca',
};
const EVIDENCE_Q1 = [{
  tool: 'get_pest_controllers', args: { pest: 'broca del café' },
  result: { found: true, pest: 'Hypothenemus hampei', controls: [
    { nombre: 'Beauveria bassiana artesanal', tipo: 'biológico', dosis: '1x10^9 conidias/mL', frecuencia: 'cada 8 días en pico de infestación', fuente: 'Cenicafé' },
    { nombre: 'Trampa de alcoholes', tipo: 'etológico', dosis: '16 trampas/ha, metanol:etanol 3:1', frecuencia: 'recambio quincenal', fuente: 'Cenicafé' },
    { nombre: 'Re-Re (recolección repase)', tipo: 'cultural', dosis: 'recolectar todo fruto sobremaduro o caído', frecuencia: 'cada cosecha', fuente: 'FNC' },
    { nombre: 'Cephalonomia stephanoderis', tipo: 'biológico', dosis: 'liberación de 1 avispa por árbol', frecuencia: 'inicio de época seca', fuente: 'Cenicafé' },
  ] },
}];
const SUBGRAFO_Q1 = `=== CADENA DE RELACIONES (grafo) ===
Camino verificado en el grafo Apache AGE para esta consulta:
(Coffea arabica)-[:AFECTADA_POR]->(Hypothenemus hampei "broca del café")
(Hypothenemus hampei)<-[:CONTROLS {tipo:"biológico", dosis:"1x10^9 conidias/mL"}]-(Beauveria bassiana artesanal)
(Hypothenemus hampei)<-[:CONTROLS {tipo:"etológico", dosis:"16 trampas/ha"}]-(Trampa de alcoholes)
(Beauveria bassiana artesanal)-[:RECOMENDADO_EN]->(piso templado/frío, humedad relativa > 60%)
REGLA: usa SOLO estas relaciones verificadas para razonar la cadena cultivo→plaga→control. No inventes relaciones que no estén aquí.
=== FIN CADENA DE RELACIONES ===`;

const QUERY = 'qué biopreparado me sirve para la broca en mi café';

// Réplica aproximada de getToolsForLLM() (llmTools.js, 5 tools registradas:
// crear_log, actualizar_planta, agendar_riego, query_corpus_dr034,
// registrar_ingesta_compleja) — mismas function schemas OpenAI que la PWA
// manda SIEMPRE en el body cuando hay tools registradas (AgentScreen.jsx
// líneas 1332-1335), para probar si el modelo dispara un tool_call
// invisible (content:null) en una query de conocimiento puro como esta.
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'crear_log',
      description: 'Crear un nuevo registro/log en Chagra para un activo (planta, estructura, etc.)',
      parameters: { type: 'object', properties: {
        asset_id: { type: 'string', description: 'ID del activo' },
        log_type: { type: 'string', enum: ['log--observation', 'log--harvest', 'log--task', 'log--input', 'log--split'] },
        notes: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' },
        quantity: { type: 'number' }, unit: { type: 'string' },
      }, required: ['asset_id', 'log_type'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'actualizar_planta',
      description: 'Actualizar información de una planta o activo en Chagra',
      parameters: { type: 'object', properties: {
        asset_id: { type: 'string' }, campo: { type: 'string' }, valor: { type: 'string' },
      }, required: ['asset_id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agendar_riego',
      description: 'Agendar una tarea de riego para uno o más activos en una fecha/hora futura',
      parameters: { type: 'object', properties: {
        asset_id: { type: 'string' }, fecha: { type: 'string', format: 'date-time' }, notas: { type: 'string' },
      }, required: ['asset_id', 'fecha'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_corpus_dr034',
      description: 'Buscar información en el corpus DR-034 de ciclo de especies agroecológicas',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_ingesta_compleja',
      description: 'Revisar y registrar una siembra histórica con sus cosechas, abonos y observaciones detectadas',
      parameters: { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'] },
    },
  },
];


/** POST a Ollama OpenAI-compat, streaming manual. Devuelve {ttftMs, totalMs, chars, finishReason}. */
async function timedChatCompletion(body) {
  const t0 = performance.now();
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '<sin cuerpo>');
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }
  let ttftMs = null;
  let chars = 0;
  let finishReason = null;
  let sawToolCallDelta = false;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta;
        const content = delta?.content;
        if (Array.isArray(delta?.tool_calls) && delta.tool_calls.length > 0) sawToolCallDelta = true;
        if (typeof content === 'string' && content.length > 0) {
          if (ttftMs === null) ttftMs = performance.now() - t0;
          chars += content.length;
        }
        if (json.choices?.[0]?.finish_reason) finishReason = json.choices[0].finish_reason;
      } catch (_) { /* línea SSE no-JSON, ignorar */ }
    }
  }
  const totalMs = performance.now() - t0;
  return { ttftMs, totalMs, chars, finishReason, sawToolCallDelta };
}

function fmtRange(nums) {
  const valid = nums.filter((n) => n !== null && Number.isFinite(n));
  if (valid.length === 0) return 'sin datos (0 chars en las corridas)';
  const min = Math.min(...valid) / 1000;
  const max = Math.max(...valid) / 1000;
  return `${min.toFixed(1)}-${max.toFixed(1)} s (n=${valid.length}/${nums.length})`;
}

async function runScenario(buildLLMRequest, name, messages, { withReasoningEffort = true, tools = null } = {}) {
  console.log(`\n=== ${name} (${REPS} corridas) ===`);
  const { body } = /** @type {any} */ (buildLLMRequest('chat', messages));
  if (!withReasoningEffort) delete body.reasoning_effort;
  if (Array.isArray(tools) && tools.length > 0) body.tools = tools;
  const ttfts = [];
  const totals = [];
  const results = [];
  for (let i = 0; i < REPS; i += 1) {
    const r = await timedChatCompletion(body);
    ttfts.push(r.ttftMs);
    totals.push(r.totalMs);
    results.push(r);
    console.log(
      `  corrida ${i + 1}: TTFT=${r.ttftMs === null ? 'NUNCA (vacío)' : (r.ttftMs / 1000).toFixed(1) + 's'} ` +
      `· total=${(r.totalMs / 1000).toFixed(1)}s · chars=${r.chars} · finish_reason=${r.finishReason}` +
      `${r.sawToolCallDelta ? ' · TOOL_CALL DETECTADO' : ''}`,
    );
  }
  console.log(`  -> TTFT rango: ${fmtRange(ttfts)}`);
  console.log(`  -> total rango: ${fmtRange(totals)}`);
  return { name, ttfts, totals, results };
}

(async () => {
  // Imports dinámicos DESPUÉS de register(): así el loader intercepta la
  // resolución de los extensionless imports internos de src/services/*.
  const {
    buildBasePrompt, analyzeQuery, buildQueryAnalysisBlock, buildCorpusVariants,
    buildResolvedEntitiesBlock, formatToolEvidence, buildCampesinoModeBlock,
  } = await import('../src/services/agentPromptBase.js');
  const {
    buildClimaContext, buildFincaContext, buildViabilityContext, buildFrostHeatContext,
    buildAssociationContext, buildInvasiveSafetyContext, buildCuratedFactsContext,
    buildPriceDeclineContext, buildSuggestedEntitiesContext,
  } = await import('../src/services/agentService.js');
  const { classifyQueryIntent } = await import('../src/services/outputGuards.js');
  const { assembleSystemContent, estimateTokens, SYSTEM_PROMPT_TOKEN_BUDGET } = await import('../src/services/promptAssembler.js');
  const { buildLLMRequest } = await import('../src/services/llmRouter.js');

  window.localStorage.setItem('chagra:profile:v1', JSON.stringify(PROFILE));

  function assembleReal() {
    const resolvedEntities = [ENT_CAFE, ENT_BROCA, ENT_BEAUVERIA];
    const toolEvidence = EVIDENCE_Q1;
    const analysis = analyzeQuery(QUERY);
    const systemPrompt = buildBasePrompt({
      plantContext: PLANT_CONTEXT,
      fincaContext: `Estás asistiendo en la finca "${FINCA.nombre}" (slug: ${FINCA.slug}, zona biocultural: ${FINCA.biocultural_zone}, ~${FINCA.altitud} msnm). `,
      indoorContext: '', finca: FINCA, query: QUERY, contextMemory: MEMORY, isEnum: analysis.isEnum,
      toolEvidence, resolvedEntities, hasCorpus: CORPUS.length > 0,
    });
    const isPriceQuery = classifyQueryIntent(QUERY) === 'precio';
    const fincaContext = isPriceQuery ? '' : `\n\n${buildFincaContext({
      profile: PROFILE, finca: FINCA, climaSnapshot: CLIMA_SNAPSHOT, groupedCultivos: GROUPED_CULTIVOS,
      resolvedEntities, activeAlerts: [], activeCycles: [{ label: 'Café lote 1', stage: 'Floración', days: 120, topRisk: 'broca del café (alto)' }],
    })}`;
    const viabilidadBlock = isPriceQuery ? '' : buildViabilityContext({ fincaAltitud: PROFILE.finca_altitud, resolvedEntities });
    const frostHeatBlock = isPriceQuery ? '' : buildFrostHeatContext({ resolvedEntities, climaSnapshot: CLIMA_SNAPSHOT });
    const blocks = {
      base: systemPrompt,
      campesino: { variants: [buildCampesinoModeBlock(), ''] },
      clima: { variants: [buildClimaContext(CLIMA_SNAPSHOT, { region: 'andina' }), ''] },
      finca: { variants: [fincaContext, ''] },
      asociacion: { variants: [buildAssociationContext({ resolvedEntities, groupedCultivos: GROUPED_CULTIVOS })] },
      corpus: { variants: buildCorpusVariants(CORPUS) },
      frostHeat: { variants: [frostHeatBlock, ''] },
      viabilidad: viabilidadBlock,
      seguridad: buildInvasiveSafetyContext({ resolvedEntities }),
      evidence: formatToolEvidence(toolEvidence),
      resolvedEntities: buildResolvedEntitiesBlock(resolvedEntities),
      curatedFacts: buildCuratedFactsContext({ resolvedEntities }),
      relacional: SUBGRAFO_Q1,
      queryAnalysis: buildQueryAnalysisBlock(analysis),
      suggested: buildSuggestedEntitiesContext({ suggestedEntities: null }),
      priceDecline: buildPriceDeclineContext({ userMessage: QUERY, toolEvidence }),
      fermento: '',
    };
    return assembleSystemContent(blocks);
  }

  const assembled = assembleReal();
  console.log(`[fixture] system prompt real: ${assembled.totalTokens} tokens estimados (presupuesto ${SYSTEM_PROMPT_TOKEN_BUDGET})`);
  console.log(`[fixture] + historial (8 turnos): ${estimateTokens(MEMORY)} tokens · + query: ${estimateTokens(QUERY)} tokens`);

  const FULL_MESSAGES = [
    { role: 'system', content: assembled.content },
    { role: 'user', content: MEMORY },
    { role: 'user', content: QUERY },
  ];
  const SHORT_MESSAGES = [
    { role: 'system', content: 'Eres Chagra IA, asistente agroecológico colombiano. Responde breve.' },
    { role: 'user', content: QUERY },
  ];

  console.log(`[bench] Ollama en ${OLLAMA_URL} - modelo de la ruta 'chat' (ver ROUTES.chat en llmRouter.js)`);
  const psRes = await fetch('http://localhost:11434/api/ps').then((r) => r.json()).catch(() => null);
  console.log(`[bench] modelos cargados ahora mismo: ${psRes?.models?.map((m) => m.name).join(', ') || 'desconocido'}`);

  const scenarios = [];
  scenarios.push(await runScenario(buildLLMRequest, '1) FULL - prompt real (~6284 tok) + reasoning_effort:none', FULL_MESSAGES));
  scenarios.push(await runScenario(buildLLMRequest, '2) SHORT - prompt corto (~40 tok) + reasoning_effort:none', SHORT_MESSAGES));
  scenarios.push(await runScenario(buildLLMRequest, '3) FULL_NO_REASONING_EFFORT - prompt real SIN reasoning_effort (control negativo BUG-06)', FULL_MESSAGES, { withReasoningEffort: false }));
  scenarios.push(await runScenario(buildLLMRequest, '4) FULL_WITH_TOOLS - prompt real + reasoning_effort:none + 5 tools (getToolsForLLM real)', FULL_MESSAGES, { tools: TOOLS }));

  console.log('\n=== RESUMEN ===');
  for (const s of scenarios) {
    console.log(`${s.name}\n  TTFT: ${fmtRange(s.ttfts)}\n  total: ${fmtRange(s.totals)}`);
  }
})().catch((e) => {
  console.error('[bench] ERROR:', e);
  process.exitCode = 1;
});
