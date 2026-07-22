/**
 * canary-modelo-chat-ausente.test.mjs — cuando el modelo de chat desaparece del
 * host, el canario tiene que DECIRLO, no dar verde ni culpar al agente.
 *
 * Regresión de la noche del 2026-07-22: `granite3.3:8b` dejó de existir en ollama
 * a mitad de la corrida. Ollama contestó 404 `model 'granite3.3:8b' not found` a
 * cada turno, y el reporte salió así:
 *   - D5 dio PASS ("ollama_up=true, kokoro=true, /tools=true"), porque /health,
 *     /tools, kokoro y /tags respondían: ollama estaba arriba, solo que sin EL
 *     modelo. Falso verde con el agente 100% mudo — el fallo más caro del set,
 *     porque D5 es el check al que se mira para saber si el backend está sano.
 *   - B0 reportó "0/4 respuestas" sin decir por qué, mandando al operador a
 *     investigar desde cero lo que ollama ya había explicado en el cuerpo.
 *   - B0f acusó al agente de "(a) sin cantidad g/kg; (b) no ajusta por frío/altura;
 *     (d) cascarón" — tres regresiones de CALIDAD inventadas a partir de un 404 —
 *     y escribió esa línea al JSONL del golden, que mañana se lee como regresión
 *     real.
 *
 * Es la misma regla que ya cubre `canary-backend-caido.test.mjs` ("no pude medir"
 * ≠ "está roto"), más su reverso: si el componente SÍ está roto, el canario no
 * puede reportarlo verde.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MODULES, TOPICS, buildConversation } from '../lib/canary-modules.mjs';

const runOf = (id) => MODULES.find((m) => m.id === id).run;
const TOPIC = TOPICS.find((t) => t.id === 'broca_cafe');
const CHAT_MODEL = 'granite3.3:8b';

/**
 * Stub del target de la noche del 22: todo el sidecar en verde, ollama arriba y
 * listando modelos — pero SIN el modelo que el chat pide por nombre exacto.
 */
let server;
let base;
beforeAll(async () => {
  server = createServer((req, res) => {
    const url = req.url || '';
    const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (url.startsWith('/api/mcp/agro/health')) return json(200, { status: 'ok', build_sha: '373f780', ollama_up: true });
    if (url.startsWith('/api/mcp/agro/tools')) return json(200, { tools: Array.from({ length: 40 }, (_, i) => ({ name: `tool_${i}`, description: 'x'.repeat(40) })) });
    if (url.startsWith('/api/kokoro/health')) return json(200, { status: 'ok', kokoro: true });
    // ollama ARRIBA y con modelos… pero granite3.3:8b no está entre ellos.
    if (url.startsWith('/api/ollama/api/tags')) return json(200, { models: [{ name: 'granite4.1:8b' }, { name: 'qwen3.5:9b' }, { name: 'llama3.1:8b' }] });
    if (url.startsWith('/api/ollama/api/chat')) return json(404, { error: `model '${CHAT_MODEL}' not found` });
    // el sidecar responde al resto (NLU/resolve-entities/post-validate) sin datos.
    return json(200, {});
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const ctxBase = () => ({
  base, sidecarToken: 'x', token: 'x', chatModel: CHAT_MODEL, target: 'dev',
  dateStr: '2026-07-22', outDir: mkdtempSync(join(tmpdir(), 'canary-test-')),
  topic: TOPIC, conversation: buildConversation(TOPIC, '2026-07-22'),
});

describe('D5 (salud del sidecar/agente) con el modelo de chat ausente', () => {
  it('FALLA y nombra el modelo faltante en vez de dar verde por "ollama arriba"', async () => {
    const r = await runOf('D5')(ctxBase());
    // Antes: pass "sidecar 373f780, ollama=true, kokoro=true, tools=true".
    expect(r.status).toBe('fail');
    expect(r.data.chatModelPresente).toBe(false);
    expect(r.data.chatModel).toBe(CHAT_MODEL);
    expect(r.detalle).toMatch(/MODELO DE CHAT AUSENTE/);
    expect(r.detalle).toContain(CHAT_MODEL);
  });

  it('con el modelo presente vuelve a dar verde (no rompe la corrida sana)', async () => {
    const r = await runOf('D5')({ ...ctxBase(), chatModel: 'granite4.1:8b' });
    expect(r.status).toBe('pass');
    expect(r.data.chatModelPresente).toBe(true);
  });

  it('si /tags no se pudo listar NO acusa de ausente (no pude medir ≠ roto)', async () => {
    // Puerto cerrado para /tags: sin lista no se puede afirmar que el modelo falte.
    const r = await runOf('D5')({ ...ctxBase(), base: 'http://127.0.0.1:1' });
    expect(r.status).toBe('fail'); // el sidecar entero está caído, eso sí es rojo
    expect(r.data.chatModelPresente).toBe(null); // pero no se le echa la culpa al modelo
    expect(r.detalle).not.toMatch(/MODELO DE CHAT AUSENTE/);
  }, 30000);
});

describe('B0 (conversación) con el modelo de chat ausente', () => {
  it('reporta la CAUSA del 404, no solo "0/4 respuestas"', async () => {
    const ctx = ctxBase();
    const r = await runOf('B0')(ctx);
    expect(r.status).toBe('fail');
    expect(r.valor).toMatch(/0\/\d+ respuestas/);
    // Antes: "Conversación compleja sobre broca_cafe (0/4 turnos con respuesta)." y nada más.
    expect(r.detalle).toMatch(/Causa:/);
    expect(r.detalle).toMatch(/not found/);
    expect(r.data.modelo_ausente).toBe(true);
    expect(ctx.responses.every((x) => /HTTP 404 — model .* not found/.test(x.error))).toBe(true);
  }, 30000);
});

describe('B0f (golden de ración avícola) con el modelo de chat ausente', () => {
  it('no evalúa la calidad de una respuesta que nunca llegó', async () => {
    const ctx = ctxBase();
    const r = await runOf('B0f')(ctx);
    // Antes: fail "(a) sin cantidad g/kg; (b) no ajusta por frío/altura; (d) cascarón".
    expect(r.status).toBe('skip');
    expect(r.data.evaluable).toBe(false);
    expect(r.data.modelo_ausente).toBe(true);
    expect(r.valor).not.toMatch(/cascar[oó]n|cantidad|altura/i);
    expect(r.detalle).toMatch(/NO implica regresión del golden/);
  }, 30000);

  it('no envenena el JSONL del golden con una línea de respuesta vacía', async () => {
    const ctx = ctxBase();
    await runOf('B0f')(ctx);
    expect(existsSync(join(ctx.outDir, 'golden', 'avicola-frio-2026-07-22.jsonl'))).toBe(false);
  }, 30000);
});
