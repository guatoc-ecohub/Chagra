#!/usr/bin/env node
/**
 * mine-pairs-from-telemetry.mjs — Minador de pares SFT/DPO desde telemetría real.
 *
 * Consume el JSONL exportado por agentTelemetryFlywheel.exportarJSONL() y
 * produce:
 *   1. sft.jsonl — interacciones con señal buena (gold para fine-tuning)
 *   2. dpo.jsonl — pares (chosen, rejected) unidos por intención similar
 *
 * Mismo contrato que el minador de benchmarks (scripts/mine_pairs.py):
 *   - sft: { prompt, response, score, metadata }
 *   - dpo: { prompt, chosen, rejected, metadata }
 *
 * Uso:
 *   node scripts/mine-pairs-from-telemetry.mjs < telemetry.jsonl > stats.json
 *   → genera sft.jsonl y dpo.jsonl en el directorio actual.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Config ────────────────────────────────────────────────────────
const OUT_DIR = process.argv[2] || '.';

const SEÑALES_BUENAS = new Set(['explicita_buena', 'implicita_buena']);
const SEÑALES_MALAS = new Set(['explicita_mala', 'implicita_mala']);

// ── Leer entrada (stdin o archivo) ─────────────────────────────────
let input = '';
try {
  // Intentar leer de stdin
  if (!process.stdin.isTTY) {
    input = readFileSync(0, 'utf8'); // fd 0 = stdin
  }
} catch { /* no stdin, leer de archivo pasado como arg */ }

if (!input && process.argv[2]) {
  input = readFileSync(process.argv[2], 'utf8');
}

if (!input) {
  console.error('Uso: node mine-pairs-from-telemetry.mjs <telemetry.jsonl>');
  console.error('  o:  cat telemetry.jsonl | node mine-pairs-from-telemetry.mjs');
  process.exit(1);
}

/** @type {Array<Object>} */
const interacciones = input.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

console.error(`[mine] ${interacciones.length} interacciones cargadas`);

// ── Fase 1: SFT (interacciones buenas → gold) ─────────────────────
const sft = [];
for (const i of interacciones) {
  if (!i.respuesta || i.respuesta.length < 10) continue;
  if (!i.pregunta || i.pregunta.length < 3) continue;

  const esBuena = SEÑALES_BUENAS.has(i.senal_calidad);
  const esMala = SEÑALES_MALAS.has(i.senal_calidad);

  // SFT: solo interacciones con señal explícita/implicita buena
  if (esBuena) {
    sft.push({
      prompt: i.pregunta,
      response: i.respuesta,
      score: 1.0,
      metadata: {
        intencion: i.intencion,
        latencia_ms: i.latencia_ms,
        guards: i.guards_disparados?.length || 0,
        source: 'telemetry-flywheel',
        ts: i.ts,
      },
    });
  }
}

writeFileSync(resolve(OUT_DIR, 'sft-from-telemetry.jsonl'), sft.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
console.error(`[mine] SFT: ${sft.length} pares (gold)`);

// ── Fase 2: DPO (buena vs mala, misma intención) ──────────────────
const dpo = [];
const agrupadas = /** @type {Map<string, Array<Object>>} */ (new Map());

for (const i of interacciones) {
  if (!i.respuesta || i.respuesta.length < 10) continue;
  const key = i.intencion || '__sin_intencion__';
  if (!agrupadas.has(key)) agrupadas.set(key, []);
  agrupadas.get(key).push(i);
}

for (const [intencion, grupo] of agrupadas) {
  const buenas = grupo.filter(i => SEÑALES_BUENAS.has(i.senal_calidad));
  const malas = grupo.filter(i => SEÑALES_MALAS.has(i.senal_calidad));

  if (buenas.length === 0 || malas.length === 0) continue;

  // Emparejar mejor buena con peor mala por similitud de pregunta
  for (const buena of buenas.slice(0, Math.min(buenas.length, malas.length, 10))) {
    // Encontrar la mala más similar en pregunta
    let mejorMala = malas[0];
    let mejorSim = 0;
    for (const mala of malas) {
      const sim = _jaccard(buena.pregunta, mala.pregunta);
      if (sim > mejorSim) { mejorSim = sim; mejorMala = mala; }
    }

    dpo.push({
      prompt: buena.pregunta,
      chosen: buena.respuesta,
      rejected: mejorMala.respuesta,
      metadata: {
        intencion,
        score_chosen: 1.0,
        score_rejected: 0.0,
        similitud_pregunta: mejorSim.toFixed(2),
        source: 'telemetry-flywheel',
      },
    });
  }
}

writeFileSync(resolve(OUT_DIR, 'dpo-from-telemetry.jsonl'), dpo.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
console.error(`[mine] DPO: ${dpo.length} pares (${agrupadas.size} intenciones)`);

// ── Stats ──────────────────────────────────────────────────────────
const stats = {
  total: interacciones.length,
  con_respuesta: interacciones.filter(i => i.respuesta?.length >= 10).length,
  sft_pares: sft.length,
  dpo_pares: dpo.length,
  intenciones: [...agrupadas.keys()],
  distribucion_senal: {} ,
  guard_stats: {} ,
};

for (const i of interacciones) {
  stats.distribucion_senal[i.senal_calidad || 'sin_señal'] = (stats.distribucion_senal[i.senal_calidad || 'sin_señal'] || 0) + 1;
  for (const g of (i.guards_disparados || [])) {
    stats.guard_stats[g] = (stats.guard_stats[g] || 0) + 1;
  }
}

const statsPath = resolve(OUT_DIR, 'telemetry-stats.json');
writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf8');

// Imprimir stats a stdout
console.log(JSON.stringify(stats, null, 2));

// ── Helpers ────────────────────────────────────────────────────────
function _jaccard(a, b) {
  const sa = new Set((a || '').toLowerCase().split(/\s+/));
  const sb = new Set((b || '').toLowerCase().split(/\s+/));
  let int = 0;
  for (const w of sa) if (sb.has(w)) int++;
  const union = sa.size + sb.size - int;
  return union === 0 ? 0 : int / union;
}
