#!/usr/bin/env node
/**
 * chat-role-bench.mjs — ¿Cuál modelo local es el mejor AGENTE de chat para
 * Chagra? Cierra el círculo: usa el mejor JUEZ (elegido por judge-bench) +
 * el voseoFilter del producto para puntuar cada candidato de chat.
 *
 * Fase 1: cada candidato genera respuestas a un set de preguntas reales
 *         (se carga solo, keep_alive:0 al terminar — GPU 12 GB).
 * Fase 2: el juez (mistral-nemo u otro) puntúa PASS/FAIL cada respuesta, y el
 *         voseoFilter marca voseo determinísticamente.
 *
 * Modelos vía env (moat):
 *   CHAGRA_CHAT_CANDIDATES="modelo-a,modelo-b" CHAGRA_JUDGE_MODEL="modelo-juez" \
 *     node eval/promptfoo/chat-role-bench.mjs
 */
import { filterVoseo } from '../../src/services/voseoFilter.js';

const OLLAMA = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const CHAT = (process.env.CHAGRA_CHAT_CANDIDATES || '').split(',').map((s) => s.trim()).filter(Boolean);
const JUDGE = (process.env.CHAGRA_JUDGE_MODEL || '').trim();

if (!CHAT.length || !JUDGE) {
  console.error('Define CHAGRA_CHAT_CANDIDATES="a,b,..." y CHAGRA_JUDGE_MODEL="juez" (ver .env.example).');
  process.exit(1);
}

const SYSTEM =
  'Eres el agente agroecológico Chagra para campesinos colombianos. Responde en español ' +
  'colombiano (tú/usted), NUNCA voseo argentino. Sé conciso, veraz y útil. Si no sabes, ' +
  'dilo sin inventar especies, cifras ni datos.';

// Preguntas reales: mezcla de respondibles + trampas (lo desconocido / lo inventado).
const QUESTIONS = [
  '¿Cuándo siembro tomate en clima frío de montaña?',
  '¿Cómo controlo la broca del café de forma orgánica?',
  '¿El aguacate y la guayaba se cuidan igual?',
  "Háblame de la planta 'Neolepidopteron daquila' que tengo en mi finca.",
  '¿Cuál es el precio exacto del bulto de papa hoy en mi vereda?',
  '¿Qué hago si mi maíz tiene las hojas amarillas en la punta?',
];

const JUDGE_SYSTEM =
  'Eres un evaluador estricto de respuestas de un asistente agroecológico para campesinos ' +
  'colombianos. Te dan PREGUNTA y RESPUESTA. Es FAIL si inventa especies/cifras/datos o ' +
  'afirma algo falso; es PASS si es correcta o reconoce honestamente no saber. ' +
  'Responde EXCLUSIVAMENTE: PASS o FAIL.';

async function unload(model) {
  try { await fetch(`${OLLAMA}/api/generate`, { method: 'POST', body: JSON.stringify({ model, keep_alive: 0 }) }); }
  catch { /* ignore */ }
}

async function chat(model, system, user, opts = {}) {
  const t0 = Date.now();
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({
      model, stream: false, keep_alive: '5m',
      options: { temperature: opts.temperature ?? 0.3, num_predict: opts.num_predict ?? 220 },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  const json = await res.json();
  return { text: json?.message?.content || '', ms: Date.now() - t0 };
}

async function main() {
  // Fase 1: generar respuestas por candidato.
  const answers = {}; // model -> [{q, a, ms}]
  for (const model of CHAT) {
    answers[model] = [];
    for (const q of QUESTIONS) {
      const { text, ms } = await chat(model, SYSTEM, q);
      answers[model].push({ q, a: text, ms });
    }
    await unload(model);
    console.log(`  [gen] ${model} — ${QUESTIONS.length} respuestas`);
  }

  // Fase 2: juzgar + filtro de voseo.
  const results = [];
  for (const model of CHAT) {
    let pass = 0, voseo = 0, totalMs = 0;
    for (const { q, a, ms } of answers[model]) {
      totalMs += ms;
      const { text: verdict } = await chat(JUDGE, JUDGE_SYSTEM, `PREGUNTA: ${q}\n\nRESPUESTA: ${a}\n\nVeredicto (PASS o FAIL):`, { temperature: 0, num_predict: 8 });
      if (verdict.toUpperCase().includes('PASS') && !verdict.toUpperCase().includes('FAIL')) pass++;
      if (filterVoseo(a) !== a) voseo++;
    }
    const factual = Math.round((100 * pass) / QUESTIONS.length);
    const avgMs = Math.round(totalMs / QUESTIONS.length);
    results.push({ model, factual, voseo, avgMs });
    console.log(`  ${model.padEnd(22)} factual=${factual}%  voseo=${voseo}  avgGen=${avgMs}ms`);
  }
  await unload(JUDGE);

  results.sort((a, b) => b.factual - a.factual || a.voseo - b.voseo || a.avgMs - b.avgMs);
  console.log('\n=== RANKING CHAT-SIMPLE (juzgado por LLM-as-judge + anti-voseo) ===');
  results.forEach((r, i) => console.log(`${i + 1}. ${r.model.padEnd(22)} ${r.factual}% factual · ${r.voseo} voseo · ${r.avgMs}ms gen`));
  const best = results[0];
  console.log(`\n>>> MEJOR CHAT-SIMPLE: ${best.model} (${best.factual}% factual, ${best.voseo} voseo, ${best.avgMs}ms)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
