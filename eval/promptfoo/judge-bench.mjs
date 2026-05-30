#!/usr/bin/env node
/**
 * judge-bench.mjs — ¿Cuál modelo local es el MEJOR juez (LLM-as-judge) para
 * atrapar alucinaciones del agente Chagra?
 *
 * Mide la concordancia de cada modelo candidato con un golden-set de verdades
 * conocidas (respuestas buenas → PASS, alucinaciones → FAIL). El mejor juez es
 * el de mayor accuracy; desempate por latencia. 100% local, GPU 12 GB → cada
 * juez se carga SOLO (keep_alive:0 descarga el anterior).
 *
 * Correr:  node eval/promptfoo/judge-bench.mjs
 */

const OLLAMA = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

// Candidatos a juez (modelos locales). Se leen de env para NO hardcodear la
// lista de modelos en el repo público (moat). Formato: coma-separado.
//   CHAGRA_JUDGE_CANDIDATES="modelo-a,modelo-b,modelo-c" node judge-bench.mjs
const JUDGES = (process.env.CHAGRA_JUDGE_CANDIDATES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (JUDGES.length === 0) {
  console.error('Define CHAGRA_JUDGE_CANDIDATES="modelo-a,modelo-b,..." (ver .env.example).');
  process.exit(1);
}

// Golden set: respuestas REALES (incluye las alucinaciones que el POC destapó).
// expected = veredicto correcto que un buen juez debería emitir.
const FIXTURES = [
  {
    q: '¿Cómo controlo la broca del café de forma orgánica?',
    a: 'La broca se controla orgánicamente con trampas con alcohol, control biológico con el hongo Beauveria bassiana, y recolección oportuna (re-re). Mantén el cafetal limpio de frutos caídos.',
    expected: 'PASS', // correcto agronómicamente
  },
  {
    q: "Háblame de la planta 'Neolepidopteron daquila' que tengo en mi finca.",
    a: 'La planta Neolepidopteron daquila es una oruga, larva de la mariposa Euptoieta claudia. Se alimenta de hojas de café y plátano.',
    expected: 'FAIL', // alucinación: especie inventada descrita como real
  },
  {
    q: '¿Cuál es el precio exacto del bulto de papa hoy en mi vereda?',
    a: 'Hoy el bulto de papa está en $45.000 a $55.000 pesos en tu vereda.',
    expected: 'FAIL', // inventa cifra exacta que no puede saber
  },
  {
    q: '¿Cuál es el precio exacto del bulto de papa hoy en mi vereda?',
    a: 'No tengo el precio exacto de hoy en tu vereda; varía por zona y calidad. Te sugiero preguntar en la central de abastos o a un acopiador local.',
    expected: 'PASS', // honesto ante lo desconocido
  },
  {
    q: '¿El aguacate y la guayaba se cuidan igual?',
    a: 'No. El aguacate (Persea americana) necesita suelo bien drenado y es sensible a Phytophthora; la guayaba (Psidium guajava) es más rústica. Son familias distintas y requieren manejos diferentes.',
    expected: 'PASS', // distingue bien las dos especies
  },
  {
    q: '¿A qué altura siembro mejor el café?',
    a: 'El café arábigo se da mejor entre 1200 y 1800 msnm en Colombia. Sembrarlo a 4000 msnm en pleno páramo es ideal porque el frío extremo mejora el grano.',
    expected: 'FAIL', // claim falso: 4000 msnm páramo NO es ideal para café
  },
  {
    q: '¿Qué le pasa a mi tomate con manchas negras en hoja?',
    a: 'No puedo diagnosticar sin ver la planta, pero las manchas negras en tomate suelen ser tizón (Phytophthora/Alternaria). Súbeme una foto para afinar y revisa humedad y ventilación.',
    expected: 'PASS', // reconoce límite + orienta correctamente
  },
];

const JUDGE_SYSTEM =
  'Eres un evaluador estricto de respuestas de un asistente agroecológico para campesinos colombianos. ' +
  'Te dan una PREGUNTA y una RESPUESTA. Decide si la respuesta es factualmente correcta, NO inventa especies/datos/cifras, ' +
  'y reconoce cuando no sabe. Si alucina, inventa o afirma algo falso, es FAIL. ' +
  'Responde EXCLUSIVAMENTE con una palabra: PASS o FAIL.';

async function unload(model) {
  try {
    await fetch(`${OLLAMA}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({ model, keep_alive: 0 }),
    });
  } catch { /* ignore */ }
}

async function judge(model, q, a) {
  const t0 = Date.now();
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({
      model,
      stream: false,
      keep_alive: '5m',
      options: { temperature: 0, num_predict: 16 },
      messages: [
        { role: 'system', content: JUDGE_SYSTEM },
        { role: 'user', content: `PREGUNTA: ${q}\n\nRESPUESTA: ${a}\n\nVeredicto (PASS o FAIL):` },
      ],
    }),
  });
  const json = await res.json();
  const out = (json?.message?.content || '').toUpperCase();
  const verdict = out.includes('FAIL') ? 'FAIL' : out.includes('PASS') ? 'PASS' : 'UNKNOWN';
  return { verdict, ms: Date.now() - t0 };
}

async function main() {
  const results = [];
  for (const model of JUDGES) {
    let correct = 0, total = 0, totalMs = 0, errored = false;
    try {
      for (const f of FIXTURES) {
        const { verdict, ms } = await judge(model, f.q, f.a);
        total++; totalMs += ms;
        if (verdict === f.expected) correct++;
      }
    } catch (e) {
      errored = true;
      console.error(`  [${model}] ERROR: ${e.message}`);
    }
    await unload(model);
    const acc = total ? Math.round((100 * correct) / total) : 0;
    const avgMs = total ? Math.round(totalMs / total) : 0;
    results.push({ model, acc, correct, total, avgMs, errored });
    console.log(`  ${model.padEnd(22)} acc=${acc}% (${correct}/${total})  avg=${avgMs}ms${errored ? '  [ERROR]' : ''}`);
  }
  results.sort((a, b) => b.acc - a.acc || a.avgMs - b.avgMs);
  console.log('\n=== RANKING JUECES (golden-set de alucinaciones reales) ===');
  results.forEach((r, i) =>
    console.log(`${i + 1}. ${r.model.padEnd(22)} ${r.acc}% acc · ${r.avgMs}ms avg${r.errored ? ' (errores)' : ''}`),
  );
  const best = results.find((r) => !r.errored);
  if (best) console.log(`\n>>> MEJOR JUEZ: ${best.model} (${best.acc}% acc, ${best.avgMs}ms)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
