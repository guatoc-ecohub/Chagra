#!/usr/bin/env node
/**
 * bench-latencia-concurrencia-gpu.mjs — demuestra el mecanismo real detrás
 * de la contradicción Medición A (aislada, PR #3109: 48.6s→7.7s con
 * reasoning_effort:"none") vs Medición B (sitio vivo: contenido ya no
 * vacío, pero TTFT 35.4-61.2s).
 *
 * bench-latencia-chat-completion.mjs YA demuestra que, en AISLAMIENTO (un
 * solo request a la vez), el TTFT contra Ollama con el prompt real de
 * producción (~6463 tokens) es consistentemente 0.7-1.6s — la corrección de
 * BUG-06 funciona. Ni el tamaño del prompt (~40 vs ~6463 tokens) ni las 5
 * tools de function-calling (getToolsForLLM) mueven ese número de forma
 * sostenida en 3 corridas.
 *
 * Este script prueba la hipótesis alternativa: qwen3.5:4b corre en una
 * Quadro M6000 de 12 GiB (un solo slot de GPU), con `OLLAMA_NUM_PARALLEL=2`
 * configurado (ollama systemd unit, verificado en vivo) pero con la VRAM
 * casi al tope (qwen3.5:4b + qwen3-vl:8b residentes ≈ 11.8/12.3 GiB según
 * `ollama ps` al momento de este bench) — poco margen para un segundo slot
 * de KV-cache paralelo. Si un segundo turno de chat llega MIENTRAS el
 * primero todavía está generando (otro piloto, un health-check, un doble-
 * submit), Ollama lo ENCOLA: el TTFT visible del segundo turno pasa a ser
 * "lo que falte de la generación del primero", no el costo real de SU
 * propio prefill/decode.
 *
 * Dispara 2 chat completions REALES y CONCURRENTES al mismo modelo (una de
 * respuesta larga "A", una corta "B") y compara:
 *   - Si Ollama sirviera en paralelo real: TTFT(B) ≈ TTFT en aislamiento (~1s).
 *   - Si Ollama serializa (batching sin margen de VRAM real): TTFT(B) se
 *     acerca al tiempo TOTAL de A.
 *
 * Resultado medido en alpha (2026-09-03, 1 corrida demostrativa — esto NO
 * es un bench estadístico de N corridas, es una prueba de mecanismo):
 *   A(larga):  TTFT=1.1s  total=61.8s  chars=4178
 *   B(corta):  TTFT=62.8s total=104.1s chars=2561
 * TTFT(B)=62.8s prácticamente calca total(A)=61.8s → firma clásica de cola
 * FIFO en un slot compartido, no de latencia por-request. 62.8s cae DENTRO
 * del rango reportado por Medición B (35.4-61.2s / 35-61s).
 *
 * CONCLUSIÓN (ver spec 2026-09-03 latencia-medicion-vivo): esto es capacidad
 * de infraestructura (GPU/VRAM compartida, no código de este repo) — se
 * reporta, no se parchea acá.
 *
 * Uso: node scripts/bench-latencia-concurrencia-gpu.mjs
 */
import { performance } from 'node:perf_hooks';

const OLLAMA_URL = 'http://localhost:11434/v1/chat/completions';
const MODEL = process.env.BENCH_MODEL || 'qwen3.5:4b';

async function timedChatCompletion(label, body) {
  const t0 = performance.now();
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok || !res.body) {
    console.error(`  [${label}] HTTP ${res.status}`);
    return { label, ttftMs: null, totalMs: null, chars: 0 };
  }
  let ttftMs = null;
  let chars = 0;
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
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const content = json.choices?.[0]?.delta?.content;
        if (typeof content === 'string' && content.length > 0) {
          if (ttftMs === null) {
            ttftMs = performance.now() - t0;
            console.log(`  [${label}] primer token a los ${(ttftMs / 1000).toFixed(1)}s`);
          }
          chars += content.length;
        }
      } catch (_) { /* línea SSE no-JSON, ignorar */ }
    }
  }
  const totalMs = performance.now() - t0;
  console.log(`  [${label}] TERMINADO: TTFT=${ttftMs === null ? 'nunca' : (ttftMs / 1000).toFixed(1) + 's'} total=${(totalMs / 1000).toFixed(1)}s chars=${chars}`);
  return { label, ttftMs, totalMs, chars };
}

const LONG_QUERY = 'Explícame en detalle, paso a paso, el manejo agroecológico completo de la broca del café: control cultural, biológico y etológico, con dosis y fuentes.';
const SHORT_QUERY = 'qué biopreparado me sirve para la broca en mi café';

const bodyA = { model: MODEL, messages: [{ role: 'user', content: LONG_QUERY }], temperature: 0.3, max_tokens: 1024, reasoning_effort: 'none' };
const bodyB = { model: MODEL, messages: [{ role: 'user', content: SHORT_QUERY }], temperature: 0.3, max_tokens: 1024, reasoning_effort: 'none' };

console.log(`[bench] modelo: ${MODEL} — 2 requests CONCURRENTES (A=respuesta larga, B=corta), mismo modelo`);
const psRes = await fetch('http://localhost:11434/api/ps').then((r) => r.json()).catch(() => null);
console.log(`[bench] modelos cargados / VRAM: ${JSON.stringify(psRes?.models?.map((m) => ({ name: m.name, size_vram_gb: (m.size_vram / 1e9).toFixed(1) })) || 'desconocido')}`);

const [rA, rB] = await Promise.all([
  timedChatCompletion('A(larga)', bodyA),
  timedChatCompletion('B(corta)', bodyB),
]);

console.log('\n=== VEREDICTO ===');
console.log(`TTFT(B)=${rB.ttftMs === null ? 'n/a' : (rB.ttftMs / 1000).toFixed(1) + 's'} vs total(A)=${rA.totalMs === null ? 'n/a' : (rA.totalMs / 1000).toFixed(1) + 's'}`);
if (rA.ttftMs !== null && rB.ttftMs !== null && rA.totalMs !== null) {
  const ratio = rB.ttftMs / rA.totalMs;
  if (ratio > 0.7 && ratio < 1.3) {
    console.log('→ TTFT(B) ≈ total(A): firma de SERIALIZACIÓN (cola FIFO en el slot de GPU/modelo compartido). NO es un costo por-request, es contención.');
  } else if (rB.ttftMs < 3000) {
    console.log('→ TTFT(B) bajo: el modelo SÍ sirvió en paralelo real esta vez (puede depender de VRAM libre en el momento).');
  } else {
    console.log('→ Resultado intermedio: contención parcial. Repetir con más corridas / distintos tamaños de A antes de concluir.');
  }
}
