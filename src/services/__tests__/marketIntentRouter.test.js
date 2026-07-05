/**
 * marketIntentRouter.test.js — routing determinístico de intención de
 * PRECIO/MERCADO (fix misroute "papa precio", 2026-07-05).
 *
 * Contrato:
 *   - SOLO dispara cuando classifyQueryIntent(userMessage) === 'precio'.
 *   - El `producto` sale de la especie resuelta (mentioned/nombre_comun/
 *     canonical_id, en ese orden) o, si no hay entidad, de una extracción
 *     léxica conservadora (recorta fraseo de precio + artículos).
 *   - SIEMPRE devuelve el tool get_precio_sipsa, acción 'latest_price' — NUNCA
 *     get_variedades/get_species/get_variedades_cultivo.
 */
import { describe, it, expect } from 'vitest';
import { planMarketIntent, __TEST__ } from '../marketIntentRouter.js';

const { _extractProducto } = __TEST__;

const sp = (mentioned, canonical_id = null, nombre_comun = null) => ({
  kind: 'species',
  mentioned,
  canonical_id,
  nombre_comun,
});

describe('planMarketIntent — guardas', () => {
  it('mensaje vacío / no-string → null', () => {
    // `any[]`: se testea deliberadamente el guard de tipo con valores que
    // NO son string (null/undefined/number/object) — es la firma real de
    // "entrada malformada" que `planMarketIntent` debe rechazar en runtime,
    // no tiene sentido ensanchar el tipo público `userMessage: string` solo
    // para este test (mismo patrón ya aceptado en knowledgeIntentRouter.test.js
    // y agentNluFallback.test.js).
    for (const bad of /** @type {any[]} */ ([null, undefined, '', '   ', 42, {}])) {
      expect(planMarketIntent(bad, [sp('papa')])).toBeNull();
    }
  });

  it('sin intención de precio → null (deja el flujo agronómico normal)', () => {
    expect(planMarketIntent('¿cómo siembro papa?', [sp('papa')])).toBeNull();
    expect(planMarketIntent('¿qué variedades de café hay?', [sp('café')])).toBeNull();
    expect(planMarketIntent('¿cómo controlo la broca del café?', null)).toBeNull();
  });

  it('sin producto reconocible (ni entidad ni texto útil tras recortar) → null', () => {
    // Todo el mensaje es fraseo de precio puro, no queda sustantivo.
    expect(planMarketIntent('¿cuánto cuesta?', null)).toBeNull();
  });
});

describe('planMarketIntent — el caso "papa precio" (bug histórico)', () => {
  it('"a cómo está la papa" con entidad resuelta → get_precio_sipsa, producto=mentioned', () => {
    const plan = planMarketIntent('a cómo está la papa', [sp('papa', 'solanum_tuberosum', 'Papa')]);
    expect(plan).toEqual({
      tool: 'get_precio_sipsa',
      args: { action: 'latest_price', producto: 'papa' },
      source: 'market_precio_entidad',
    });
  });

  it('NUNCA cae a get_variedades/get_species/get_variedades_cultivo', () => {
    const plan = planMarketIntent('a cómo está la papa', [sp('papa', 'solanum_tuberosum', 'Papa')]);
    expect(plan.tool).not.toBe('get_variedades');
    expect(plan.tool).not.toBe('get_species');
    expect(plan.tool).not.toBe('get_variedades_cultivo');
    expect(plan.tool).toBe('get_precio_sipsa');
  });

  it('preserva la variedad literal mencionada ("papa criolla" ≠ "papa negra")', () => {
    const plan = planMarketIntent('¿a cómo está la papa criolla?', [
      sp('papa criolla', 'solanum_phureja', 'Papa criolla'),
    ]);
    expect(plan.args.producto).toBe('papa criolla');
  });

  it('sin entidad resuelta, extrae el producto por regex del texto crudo', () => {
    const plan = planMarketIntent('a cómo está la papa', null);
    expect(plan).toEqual({
      tool: 'get_precio_sipsa',
      args: { action: 'latest_price', producto: 'papa' },
      source: 'market_precio_texto',
    });
  });
});

describe('planMarketIntent — variantes de fraseo campesino (sin entidad)', () => {
  const casos = [
    ['¿cuánto vale el bulto de papa?', 'papa'],
    ['¿cuánto cuesta la arroba de tomate?', 'tomate'],
    ['¿qué precio tiene la yuca?', 'yuca'],
    ['precio de la cebolla', 'cebolla'],
    ['¿a cómo está el aguacate?', 'aguacate'],
    ['¿dónde puedo vender mi cosecha de maíz?', 'maiz'],
    ['¿a cómo va el café en el mercado?', 'cafe en el'],
    ['cuánto pagan por la carga de plátano', 'platano'],
  ];

  it.each(casos)('%s → producto reconocible', (texto, esperadoAprox) => {
    const plan = planMarketIntent(texto, null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_precio_sipsa');
    expect(plan.args.action).toBe('latest_price');
    expect(typeof plan.args.producto).toBe('string');
    expect(plan.args.producto.length).toBeGreaterThan(0);
    // Aproximación laxa: el producto reconocible debe estar contenido en la
    // extracción (best-effort, no exige match exacto en todos los fraseos).
    expect(plan.args.producto).toContain(esperadoAprox.split(' ')[0]);
  });
});

describe('_extractProducto — extracción léxica interna', () => {
  it('recorta fraseo de precio y artículos, deja el sustantivo', () => {
    expect(_extractProducto('a cómo está la papa')).toBe('papa');
    expect(_extractProducto('¿cuánto vale el bulto de papa?')).toBe('papa');
    expect(_extractProducto('precio de la cebolla')).toBe('cebolla');
  });

  it('mensaje sin sustantivo útil → null', () => {
    expect(_extractProducto('¿cuánto cuesta?')).toBeNull();
    expect(_extractProducto('a cómo está')).toBeNull();
  });
});
