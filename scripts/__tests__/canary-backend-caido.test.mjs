/**
 * canary-backend-caido.test.mjs — el canario NO debe confundir "no pude medir"
 * con "el componente está roto".
 *
 * Regresión de la noche del 2026-07-16: el origen se cayó a mitad de la corrida
 * (el borde devolvió HTTP 530 para todo), B0 quedó en 0/4 respuestas y, en cascada:
 *   - B0c dio FAIL "posible bug de captura" con posted=0. Pero sin respuestas que
 *     postear, Δ=0 es el resultado CORRECTO: la captura nunca se ejercitó.
 *   - A2 dio PASS y anotó un gap de grafo de "Colletotrichum spp. / Solanum
 *     betaceum" a partir de CERO respuestas — un gap fantasma que habría mandado a
 *     la flota a hacer DR de una especie que el grafo quizá ya tiene.
 *
 * Lo segundo es lo grave: la cola DR es el lazo auto-mejorante, y se envenena sola
 * si acepta evidencia producida con el backend caído.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MODULES, TOPICS } from '../lib/canary-modules.mjs';

const runOf = (id) => MODULES.find((m) => m.id === id).run;
const TOPIC = TOPICS.find((t) => t.id === 'antracnosis_tomatearbol');
const outDir = () => mkdtempSync(join(tmpdir(), 'canary-test-'));

/** El ctx de la noche del 16: el agente nunca respondió (502/530). */
const ctxSinRespuestas = (extra = {}) => ({
  base: 'http://invalido.local', sidecarToken: null, target: 'dev', dateStr: '2026-07-16',
  topic: TOPIC, judgeGaps: [], outDir: outDir(),
  responses: [
    { turn: 1, user_text: '¿Cómo manejo la antracnosis?', agent_text: '', error: 'HTTP 502' },
    { turn: 2, user_text: '¿Y a 2900 msnm?', agent_text: '', error: 'HTTP 502' },
  ],
  ...extra,
});

describe('B0c (captura de conversación) con el backend caído', () => {
  it('sin respuestas del agente NO acusa a la captura de estar rota', async () => {
    const r = await runOf('B0c')(ctxSinRespuestas());
    // Antes: fail "NO incrementó lo esperado → posible bug de captura".
    expect(r.status).toBe('skip');
    expect(r.data.evaluable).toBe(false);
    expect(r.detalle).toMatch(/no es evaluable/i);
  });
});

describe('A2 (gaps de grafo → cola DR) con el backend caído', () => {
  it('sin respuestas NO anota un gap fantasma ni escribe el JSONL', async () => {
    const ctx = ctxSinRespuestas();
    const r = await runOf('A2')(ctx);
    // Antes: pass "1 gap(s) anotados" con evidencia cero.
    expect(r.status).toBe('skip');
    expect(r.data.anotados).toBe(0);
    expect(existsSync(join(ctx.outDir, 'grounding-gaps-2026-07-16.jsonl'))).toBe(false);
  });

  it('con el sujeto resuelto no anota gap', async () => {
    const ctx = ctxSinRespuestas({
      responses: [{ turn: 1, user_text: '¿?', agent_text: 'La antracnosis…', entities_grounded: ['Colletotrichum spp.', 'Solanum betaceum'] }],
    });
    const r = await runOf('A2')(ctx);
    expect(r.status).toBe('pass');
    expect(r.valor).toBe('sin gaps');
  });

  it('con el agente respondiendo y el sujeto SIN resolver sí anota el gap (no lo silencia)', async () => {
    const ctx = ctxSinRespuestas({
      responses: [{ turn: 1, user_text: '¿?', agent_text: 'Respuesta genérica…', entities_grounded: ['Zea mays'] }],
    });
    const r = await runOf('A2')(ctx);
    expect(r.status).toBe('pass');
    expect(r.data.anotados).toBe(1);
    const linea = JSON.parse(readFileSync(join(ctx.outDir, 'grounding-gaps-2026-07-16.jsonl'), 'utf-8').trim());
    expect(linea.entidad_faltante).toMatch(/Colletotrichum/);
  });

  it('los gaps del juez se anotan aunque la heurística no sea evaluable', async () => {
    const ctx = ctxSinRespuestas({
      judgeGaps: [{ id: 'x-t1', category: 'gap', explanation: 'el grafo no traía la fuente Agrosavia' }],
    });
    const r = await runOf('A2')(ctx);
    expect(r.status).toBe('pass');
    expect(r.data.anotados).toBe(1);
  });
});
