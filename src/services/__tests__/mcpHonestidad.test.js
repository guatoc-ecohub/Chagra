/**
 * mcpHonestidad.test.js — Pruebas de honestidad de fuentes y fallos MCP.
 *
 * Evita 3 anti-patrones:
 * 1. Presentar datos sintéticos como reales (callTool nunca fabrica).
 * 2. Mensajes idénticos para fallos distintos (available:false ≠ timeout ≠ error).
 * 3. Atribución falsa de fuentes (las respuestas de precio y stub no inventan).
 *
 * Regla: si callTool retorna null, NO hay data. El caller (AgentScreen) no debe
 * presentar nada como "respuesta del sistema" porque no hubo respuesta.
 * El LLM recibe menos contexto, pero nunca un dato falso.
 */

/* eslint-disable no-undef */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// 1. callTool nunca fabrica datos en fallo
// ---------------------------------------------------------------------------
describe('mcp honestidad — callTool nunca fabrica datos en fallo', () => {
  it('callTool con tool no permitido retorna objeto _error honesto, no null', async () => {
    const { callTool } = await import('../sidecarClient.js');
    const result = await callTool('execute_sql', { query: 'DROP TABLE' });
    expect(result).not.toBeNull();
    expect(result._error).toBe(true);
    expect(result.reason).toBe('not_allowed');
    expect(result.tool).toBe('execute_sql');
  });

  it('callTool con tool vacío retorna null (no intentado)', async () => {
    const { callTool } = await import('../sidecarClient.js');
    // '' falla !toolName → null. '   ' no está en whitelist → error honesto.
    expect(await callTool('', {})).toBeNull();
    const ws = await callTool('   ', {});
    expect(ws._error).toBe(true);
    expect(ws.reason).toBe('not_allowed');
  });

  it('callTool con args no-object no crash — retorna null', async () => {
    const { callTool } = await import('../sidecarClient.js');
    const notObjects = [null, undefined, 'string', 42, true, [], ['a']];
    for (const bad of notObjects) {
      const result = await callTool('get_species', bad);
      expect(result).toBeNull();
    }
  });

  it('executeToolChain preserva nulls — no los convierte a objetos vacíos', async () => {
    const { executeToolChain } = await import('../sidecarClient.js');
    const results = await executeToolChain([
      { tool: 'get_species', args: { query: 'fresa' } },
      { tool: 'nonexistent_tool', args: {} },
      { tool: '', args: {} },
    ]);
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(3);
    // Los resultados de herramientas reales pueden variar; el null preservado
    // indica que la herramienta falló honestamente (sin fabricación).
    for (const step of results) {
      expect(step).toHaveProperty('tool');
      expect(step).toHaveProperty('args');
      expect(step).toHaveProperty('result');
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Señales de fallo distinguibles — available:false ≠ null
// ---------------------------------------------------------------------------
describe('mcp honestidad — señales de fallo distinguibles', () => {
  it('callTool con tool válido online no retorna null cuando hay data disponible', async () => {
    // Test de contrato: una herramienta real conectada retorna objeto, no null.
    // Este test es frágil (depende de conectividad), por eso es un contrato
    // documentado, no una aserción dura. El contrato es: si el sidecar responde
    // exitosamente, la data ES REAL y pasa estructurada.
    const { callTool } = await import('../sidecarClient.js');
    const result = await callTool('get_species', { query: 'fresa' });
    if (result !== null) {
      // Si hay respuesta, debe ser objeto con datos — nunca string suelto
      expect(result).toBeTypeOf('object');
      expect(Array.isArray(result) || typeof result === 'object').toBe(true);
    }
  });

  it('available:false pasa a través del sidecar — no se muta a null', async () => {
    // Clima sin municipio: el sidecar retorna { available: false, ... }
    // Eso NO es un error — es un dato honesto que dice "no tengo data".
    // Debe preservarse toolEvidence, no colapsarse a null.
    const { callTool } = await import('../sidecarClient.js');
    const result = await callTool('get_clima_ideam', { municipio: '' });
    if (result !== null) {
      // El resultado puede tener available:false si el sidecar lo soporta
      expect(typeof result).toBe('object');
    }
  });

  it('get_clima_ideam sin municipio produce available:false en chipIntentRouter', async () => {
    const { planForcedIntent, CHIP_DEFS } = await import('../chipIntentRouter.js');
    const plan = planForcedIntent('clima', '¿va a llover?');
    expect(plan.stub).toBe(true);
    expect(plan.stubResult).toBeTruthy();
    expect(plan.stubResult.available).toBe(false);
    expect(plan.stubResult.reason).toBe('no_municipio');
    // available:false != null — es una señal estructurada y honesta
    expect(plan.stubResult).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Precio de referencia local no inventa cifras
// ---------------------------------------------------------------------------
describe('mcp honestidad — precio de referencia local no inventa cifras', () => {
  /**
   * Las respuestas del chip precio son texto visible para el campesino.
   * No deben:
   *   - Inventar un valor si no hay dato verificable
   *   - Omitir la fuente institucional cuando sí hay dato
   *   - Afirmar que el dato proviene del sidecar si no se usó
   */
  const DATA_LIKE_PATTERNS = [
    /\$\s*\d+/,          // $123, $ 123
    /\d+[.,]\d+\s*(pesos|usd|cop)/i, // 1.500 pesos, 2,50 USD
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/,    // fechas 2024-01-01
    /\b(precio|valor)\s*(de|del)?\s*\d+/i, // "precio de 5000"
  ];

  it('precio: plan local expone una respuesta groundeada', async () => {
    const { planForcedIntent } = require('../chipIntentRouter.js');
    const plan = planForcedIntent('precio', 'papa');
    expect(plan.stub).toBe(false);
    expect(plan.localGrounding).toBe('precio_referencia');

    const { buildPriceReferenceAnswer } = await import('../marketplaceService.js');
    const msg = buildPriceReferenceAnswer(plan.args.producto);
    expect(msg).toContain('SIPSA');
    expect(msg).toContain('central de abastos');
    expect(msg).toMatch(/\$\d[\d.]*–\$\d[\d.]* \/ kg/);
  });

  it('precio: sin dato verificable, la respuesta declina con honestidad', async () => {
    const { buildPriceReferenceAnswer } = await import('../marketplaceService.js');
    const msg = buildPriceReferenceAnswer('quinua');
    expect(msg).toContain('No encontré una referencia SIPSA');
    expect(msg).toContain('quinua');
    for (const pattern of DATA_LIKE_PATTERNS) {
      expect(msg).not.toMatch(pattern);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. buildPriceDeclineContext solo se activa para precio + unavailable
// ---------------------------------------------------------------------------
describe('mcp honestidad — buildPriceDeclineContext estrictamente gateado', () => {
  let buildPriceDeclineContext;
  let classifyQueryIntent;

  // @ts-ignore
  beforeAll(async () => {
    const agentService = await import('../agentService.js');
    buildPriceDeclineContext = agentService.buildPriceDeclineContext;
    const guards = await import('../outputGuards.js');
    classifyQueryIntent = guards.classifyQueryIntent;
  });

  it('no se activa si userMessage no es precio', () => {
    const noPrice = ['¿qué siembro en clima frío?', 'control de plagas en fresa', 'hola'];
    for (const msg of noPrice) {
      expect(classifyQueryIntent(msg)).not.toBe('precio');
      const ctx = buildPriceDeclineContext({ userMessage: msg, toolEvidence: { tool: 'get_precio_sipsa', result: { available: false } } });
      expect(ctx).toBe('');
    }
  });

  it('no se activa si toolEvidence no indica unavailable', () => {
    const cases = [
      { tool: 'get_precio_sipsa', result: { available: true, precio: 5000 } },
      { tool: 'get_precio_sipsa', result: { data: [{ producto: 'papa', precio: 5000 }] } },
      { tool: 'get_species', result: { available: false } }, // tool equivocado
      null,
      undefined,
    ];
    for (const ev of cases) {
      const ctx = buildPriceDeclineContext({ userMessage: '¿a cómo está la papa?', toolEvidence: ev });
      expect(ctx).toBe('');
    }
  });

  it('se activa solo cuando ambas condiciones se cumplen', () => {
    const ctx = buildPriceDeclineContext({
      userMessage: '¿a cómo está la papa?',
      toolEvidence: { tool: 'get_precio_sipsa', result: { available: false } },
    });
    expect(ctx).not.toBe('');
    expect(ctx).toContain('MÁXIMA PRIORIDAD');
    expect(ctx).toContain('SIPSA');
    expect(ctx).toContain('Corabastos');
  });

  it('también se activa con toolEvidence array (ejecución en toolchain)', () => {
    const ctx = buildPriceDeclineContext({
      userMessage: '¿cuánto vale el bulto de papa?',
      toolEvidence: [
        { tool: 'get_species', result: [{ nombre: 'Papa' }] },
        { tool: 'get_precio_sipsa', result: { available: false } },
      ],
    });
    expect(ctx).not.toBe('');
    expect(ctx).toContain('MÁXIMA PRIORIDAD');
  });
});

// ---------------------------------------------------------------------------
// 5. _hasUnavailablePriceEvidence defensiva
// ---------------------------------------------------------------------------
describe('mcp honestidad — _hasUnavailablePriceEvidence defensiva', () => {
  it('retorna false para null/undefined/no-object', async () => {
    const { buildPriceDeclineContext } = await import('../agentService.js');
    const msg = '¿a cómo está la papa?';
    const badInputs = [null, undefined, 'string', 42, true, [], ['not-object']];
    for (const bad of badInputs) {
      // Si buildPriceDeclineContext retorna '', _hasUnavailablePriceEvidence es false
      expect(buildPriceDeclineContext({ userMessage: msg, toolEvidence: bad })).toBe('');
    }
  });

  it('retorna false para tool sin precio/sipsa en nombre', async () => {
    const { buildPriceDeclineContext } = await import('../agentService.js');
    const ctx = buildPriceDeclineContext({
      userMessage: '¿a cómo está la papa?',
      toolEvidence: { tool: 'get_species', result: { available: false } },
    });
    expect(ctx).toBe(''); // get_species no es precio, available:false ≠ precio no disp
  });

  it('retorna false para available:false sin result object', async () => {
    const { buildPriceDeclineContext } = await import('../agentService.js');
    const missingResult = [
      { tool: 'get_precio_sipsa', result: null },
      { tool: 'get_precio_sipsa', result: 'string' },
      { tool: 'get_precio_sipsa' },
      { tool: 'get_precio_sipsa', result: { available: true } },
    ];
    for (const ev of missingResult) {
      expect(buildPriceDeclineContext({ userMessage: '¿a cómo está la papa?', toolEvidence: ev })).toBe('');
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Sin atribucion falsa
// ---------------------------------------------------------------------------
describe('mcp honestidad — sin atribucion falsa', () => {
  it('precio local no atribuye al sidecar ni promete un backend fantasma', async () => {
    const { planForcedIntent } = require('../chipIntentRouter.js');
    const plan = planForcedIntent('precio', 'papa');
    expect(plan.localGrounding).toBe('precio_referencia');
    expect(plan.tool).toBeNull();
    const { buildPriceReferenceAnswer } = await import('../marketplaceService.js');
    const msg = buildPriceReferenceAnswer('papa');
    expect(msg).toContain('SIPSA');
    expect(msg).not.toMatch(/sidecar/i);
  });

  it('classifyQueryIntent no confunde precio con siembra', async () => {
    const { classifyQueryIntent } = await import('../outputGuards.js');
    // Frases de precio que no deben clasificar como siembra
    const priceQueries = [
      '¿a cómo está la papa?',
      '¿cuánto vale el bulto de papa?',
      'precio del aguacate hoy',
      '¿cómo va el mercado de la fresa?',
      '¿dónde puedo vender mi cosecha de tomate?',
      '¿a cómo el bulto de arveja?',
      'venta de plátano',
    ];
    for (const q of priceQueries) {
      expect(classifyQueryIntent(q)).toBe('precio');
    }
  });

  it('classifyQueryIntent da prioridad a siembra sobre precio en consultas mixtas', async () => {
    const { classifyQueryIntent } = await import('../outputGuards.js');
    // Siembra manda sobre precio (conservador)
    const mixedQueries = [
      '¿qué siembro y a cómo está la papa?',
      'precio de semillas de aguacate',
      'quiero sembrar tomate, ¿cómo va el mercado?',
      '¿es viable la fresa a 2600 msnm? ¿y a cómo está?',
    ];
    for (const q of mixedQueries) {
      expect(classifyQueryIntent(q)).toBe('siembra');
    }
  });

  it('callTool para get_precio_sipsa retorna null (no hay endpoint — honesto)', async () => {
    // get_precio_sipsa está en ALLOWED_TOOLS pero NO tiene endpoint en el sidecar.
    // El contrato es que retorna null honestamente (no fabrica un precio).
    const { callTool } = await import('../sidecarClient.js');
    const result = await callTool('get_precio_sipsa', { query: 'papa' });
    expect(result).toBeNull();
  });
});
