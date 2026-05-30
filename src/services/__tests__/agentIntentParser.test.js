import { describe, it, expect } from 'vitest';
import { parseIntent, formatIntentDescription } from '../agentIntentParser.js';

/**
 * Tests del detector de intenciones accionables (puro, basado en regex).
 * parseIntent(text) → { intent, confidence }; formatIntentDescription(intent) → string.
 */

describe('parseIntent — entradas no accionables', () => {
  it.each([null, undefined, '', '   ', 42, {}])('retorna intent null para entrada inválida: %s', (input) => {
    const r = parseIntent(input);
    expect(r.intent).toBeNull();
    expect(r.confidence).toBe(0);
  });

  it('no detecta intención en texto conversacional sin acción', () => {
    const r = parseIntent('hola, cómo estás hoy');
    expect(r.intent).toBeNull();
    expect(r.confidence).toBe(0);
  });
});

describe('parseIntent — registrar cosecha', () => {
  it('detecta "registrar cosecha" y mapea a crear_log / log--harvest', () => {
    const r = parseIntent('registrar cosecha de tomate');
    expect(r.intent.id).toBe('registrar_cosecha');
    expect(r.intent.toolName).toBe('crear_log');
    expect(r.intent.logType).toBe('log--harvest');
    expect(r.confidence).toBe(0.8);
    expect(r.intent.originalText).toBe('registrar cosecha de tomate');
  });

  it('detecta el verbo "cosechar" y "recolectar"', () => {
    expect(parseIntent('voy a cosechar mañana').intent.id).toBe('registrar_cosecha');
    expect(parseIntent('necesito recolectar el café').intent.id).toBe('registrar_cosecha');
  });

  it('extrae cantidad, unidad normalizada y planta', () => {
    const r = parseIntent('registrar cosecha de tomate 10 kg');
    expect(r.intent.parameters.quantity).toBe(10);
    expect(r.intent.parameters.unit).toBe('kg');
    expect(r.intent.parameters.plantHint).toBe('tomate');
  });

  it('normaliza "kilos" → kg y "libras" → lb', () => {
    expect(parseIntent('registrar cosecha de papa 5 kilos').intent.parameters.unit).toBe('kg');
    expect(parseIntent('registrar cosecha de papa 3 libras').intent.parameters.unit).toBe('lb');
  });

  it('usa cantidad 1 y unidad "unidades" por defecto sin número', () => {
    const r = parseIntent('registrar cosecha de aguacate');
    expect(r.intent.parameters.quantity).toBe(1);
    expect(r.intent.parameters.unit).toBe('unidades');
  });
});

describe('parseIntent — registrar riego', () => {
  it('detecta "registrar riego" → crear_log / log--input', () => {
    const r = parseIntent('registrar riego');
    expect(r.intent.id).toBe('registrar_riego');
    expect(r.intent.toolName).toBe('crear_log');
    expect(r.intent.logType).toBe('log--input');
  });

  it('detecta el verbo conjugado "regué las plantas"', () => {
    expect(parseIntent('regué las plantas hoy').intent.id).toBe('registrar_riego');
  });

  it('extrae cantidad y normaliza "galones" a L', () => {
    const r = parseIntent('registrar riego 20 galones');
    expect(r.intent.parameters.quantity).toBe(20);
    expect(r.intent.parameters.unit).toBe('L');
  });

  it('quirk conocido: "litros" queda como "l" minúscula (la alternativa L del regex captura la l inicial)', () => {
    // Comportamiento real del parser: el grupo de unidad captura solo "l" de
    // "litros" antes de poder normalizar. Documentado como característica
    // actual, no como comportamiento deseado.
    expect(parseIntent('registrar riego 20 litros').intent.parameters.unit).toBe('l');
  });

  it('usa unidad L por defecto y cantidad null sin número', () => {
    const r = parseIntent('registrar riego');
    expect(r.intent.parameters.quantity).toBeNull();
    expect(r.intent.parameters.unit).toBe('L');
  });
});

describe('parseIntent — registrar observación', () => {
  it('detecta "observé que..." y limpia el prefijo en las notas', () => {
    const r = parseIntent('observé que las hojas están amarillas');
    expect(r.intent.id).toBe('registrar_observacion');
    expect(r.intent.logType).toBe('log--observation');
    expect(r.intent.parameters.notes).toContain('hojas');
    expect(r.intent.parameters.notes).not.toMatch(/^observé/i);
  });

  it('detecta "vi que..." como observación', () => {
    expect(parseIntent('vi que hay plaga en el maíz').intent.id).toBe('registrar_observacion');
  });
});

describe('parseIntent — registrar aplicación', () => {
  it('detecta "aboné" → crear_log / log--input con nota de producto', () => {
    const r = parseIntent('aboné con compost');
    expect(r.intent.id).toBe('registrar_aplicacion');
    expect(r.intent.logType).toBe('log--input');
    expect(r.intent.parameters.notes).toContain('compost');
  });

  it('detecta "aplicación de neem"', () => {
    expect(parseIntent('hice aplicación de neem').intent.id).toBe('registrar_aplicacion');
  });
});

describe('formatIntentDescription', () => {
  it('describe una cosecha con planta', () => {
    const intent = { id: 'registrar_cosecha', parameters: { quantity: 10, unit: 'kg', plantHint: 'tomate' } };
    expect(formatIntentDescription(intent)).toBe('Registrar cosecha de 10 kg de tomate');
  });

  it('describe una cosecha sin planta', () => {
    const intent = { id: 'registrar_cosecha', parameters: { quantity: 1, unit: 'unidades', plantHint: null } };
    expect(formatIntentDescription(intent)).toBe('Registrar cosecha de 1 unidades');
  });

  it('describe un riego con y sin cantidad', () => {
    expect(formatIntentDescription({ id: 'registrar_riego', parameters: { quantity: 20, unit: 'L' } })).toBe('Registrar riego (20 L)');
    expect(formatIntentDescription({ id: 'registrar_riego', parameters: { quantity: null, unit: 'L' } })).toBe('Registrar riego');
  });

  it('describe observación y aplicación', () => {
    expect(formatIntentDescription({ id: 'registrar_observacion', parameters: { notes: 'hojas amarillas' } })).toBe('Registrar observación: "hojas amarillas"');
    expect(formatIntentDescription({ id: 'registrar_aplicacion', parameters: { notes: 'Aplicación: compost' } })).toBe('Registrar aplicación: Aplicación: compost');
  });

  it('cae a un texto genérico para un id desconocido', () => {
    expect(formatIntentDescription({ id: 'accion_rara', parameters: {} })).toBe('Ejecutar acción: accion_rara');
  });
});
