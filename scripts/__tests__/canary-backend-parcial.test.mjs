/**
 * canary-backend-parcial.test.mjs: el canario no debe confundir una medición
 * parcial con una falla del grafo, del golden ni de la captura.
 *
 * Regresión de la noche del 2026-07-23: algunos turnos resolvieron
 * Cosmopolites sordidus aunque generateChat respondió vacío o 502. Al filtrar
 * la resolución por agent_text, A2 anotó un gap fantasma. En la misma corrida,
 * B0f evaluó y guardó respuestas vacías con HTTP 200 y B0c negó una captura que
 * su propia medición en disco confirmaba.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MODULES, TOPICS } from '../lib/canary-modules.mjs';

const runOf = (id) => MODULES.find((m) => m.id === id).run;
const TOPIC = TOPICS.find((t) => t.id === 'picudo_platano');
const outDir = () => mkdtempSync(join(tmpdir(), 'canary-test-'));
const dateStr = '2026-07-23';
const ctxGaps = (extra = {}) => ({
  target: 'dev', dateStr, topic: TOPIC, judgeGaps: [], outDir: outDir(),
  responses: [],
  ...extra,
});

describe('A2 (gaps de grafo) con caída parcial del chat', () => {
  it('conserva la entidad resuelta aunque el turno no tenga texto y no escribe un gap', async () => {
    const ctx = ctxGaps({
      responses: [
        { turn: 1, agent_text: '', entities_grounded: ['Cosmopolites sordidus'] },
        { turn: 3, agent_text: '', entities_grounded: ['Cosmopolites sordidus'] },
        { turn: 4, agent_text: 'Consulte una fuente.', entities_grounded: [] },
      ],
    });
    const r = await runOf('A2')(ctx);
    expect(r.status).toBe('pass');
    expect(r.valor).toBe('sin gaps');
    expect(existsSync(join(ctx.outDir, `grounding-gaps-${dateStr}.jsonl`))).toBe(false);
  });

  it('omite A2 cuando el resolver no produjo entidades en ningún turno', async () => {
    const ctx = ctxGaps({ responses: [{ turn: 1, agent_text: 'Respuesta parcial.', entities_grounded: [] }] });
    const r = await runOf('A2')(ctx);
    expect(r.status).toBe('skip');
    expect(r.data.anotados).toBe(0);
    expect(existsSync(join(ctx.outDir, `grounding-gaps-${dateStr}.jsonl`))).toBe(false);
  });

  it('sigue anotando el gap si el resolver vive pero no encuentra el sujeto', async () => {
    const ctx = ctxGaps({ responses: [{ turn: 1, agent_text: '', entities_grounded: ['Zea mays'] }] });
    const r = await runOf('A2')(ctx);
    expect(r.status).toBe('pass');
    expect(r.data.anotados).toBe(1);
    expect(existsSync(join(ctx.outDir, `grounding-gaps-${dateStr}.jsonl`))).toBe(true);
  });
});

let server;
let base;
beforeAll(async () => {
  server = createServer((req, res) => {
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if ((req.url || '').startsWith('/api/ollama/api/chat')) return json(200, { message: { content: '' } });
    return json(200, {});
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((resolve) => server.close(resolve)));

describe('B0f (golden avícola) con HTTP 200 vacío', () => {
  it('omite la evaluación y no guarda una línea vacía en el golden', async () => {
    const ctx = { base, sidecarToken: null, token: null, chatModel: 'prueba', target: 'dev', dateStr, outDir: outDir() };
    const r = await runOf('B0f')(ctx);
    expect(r.status).toBe('skip');
    expect(r.data.evaluable).toBe(false);
    expect(r.detalle).toMatch(/respuesta vacía/i);
    expect(existsSync(join(ctx.outDir, 'golden', `avicola-frio-${dateStr}.jsonl`))).toBe(false);
  });
});

describe('B0c (captura) con discrepancia entre endpoint y disco', () => {
  it('da pass cuando el disco capturó los turnos aunque posted sea cero', async () => {
    const stateFile = join(outDir(), 'conversation-count');
    writeFileSync(stateFile, '129');
    const script = "const fs=require('node:fs');const p=process.argv[1];const n=Number(fs.readFileSync(p,'utf8'));process.stdout.write(String(n));fs.writeFileSync(p,String(n+1));";
    const previousCommand = process.env.CANARY_CONV_COUNT_CMD;
    process.env.CANARY_CONV_COUNT_CMD = `node -e ${JSON.stringify(script)} ${JSON.stringify(stateFile)}`;
    try {
      const r = await runOf('B0c')({
        base: 'http://127.0.0.1:1', sidecarToken: null, target: 'dev', dateStr,
        responses: [{ turn: 1, user_text: 'Pregunta.', agent_text: 'Respuesta.' }],
      });
      expect(r.status).toBe('pass');
      expect(r.data.posted).toBe(0);
      expect(r.data.delta).toBe(1);
      expect(r.detalle).not.toMatch(/no se capturó nada/i);
      expect(r.detalle).toMatch(/store SÍ capturó/i);
    } finally {
      if (previousCommand === undefined) delete process.env.CANARY_CONV_COUNT_CMD;
      else process.env.CANARY_CONV_COUNT_CMD = previousCommand;
    }
  }, 30000);
});

describe('presupuesto de tokens del chat (espejo de producción)', () => {
  /**
   * El canario mide lo que vive el usuario: si pide menos tokens que producción
   * (`llmRouter.js` → ROUTES.chat.max_tokens = 1024), mide otro producto. Con 512
   * y un modelo de razonamiento (`gemma4:e2b`, activo desde el 2026-07-22) el
   * borrador se comía la cuota y `content` llegaba truncado o vacío: así nació el
   * "5/6 sondas FALLAN" del 2026-07-23, que era el tope de tokens y no el modelo.
   */
  let srv; let url; const recibidos = [];
  beforeAll(async () => {
    srv = createServer((req, res) => {
      let cuerpo = '';
      req.on('data', (c) => { cuerpo += c; });
      req.on('end', () => {
        if ((req.url || '').startsWith('/api/ollama/api/chat')) {
          recibidos.push(JSON.parse(cuerpo || '{}'));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          // Respuesta cortada a media frase por agotar el presupuesto.
          return res.end(JSON.stringify({
            message: { content: 'Como asistente agroecológico, es muy importante que sepas que' },
            done: true, done_reason: 'length',
          }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end('{}');
      });
    });
    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${srv.address().port}`;
  });
  afterAll(() => new Promise((r) => srv.close(r)));

  it('pide el mismo num_predict que producción y marca la respuesta como truncada', async () => {
    const r = await runOf('C1')({
      base: url, sidecarToken: null, token: null, chatModel: 'prueba',
      target: 'dev', dateStr, outDir: outDir(), now: new Date(`${dateStr}T06:00:00Z`),
    });
    expect(recibidos.length).toBeGreaterThan(0);
    // Regresión dura: nunca por debajo del presupuesto de producción.
    expect(recibidos[0].options.num_predict).toBeGreaterThanOrEqual(1024);
    expect(r.data.probes.every((p) => p.truncada)).toBe(true);
    expect(r.data.truncadas).toBeGreaterThan(0);
    expect(r.detalle).toMatch(/TRUNCADAS/);
  }, 30000);
});
