import { describe, it, expect } from 'vitest';
import {
  CHIP_INTENTS,
  CHIP_DEFS,
  planForcedIntent,
  isStubIntent,
} from '../chipIntentRouter.js';

/**
 * Tests del router de CHIPS DE MODO (A3/A4). Decisión operador 2026-06-02:
 * los chips fuerzan la intención y rutean DIRECTO a la capacidad
 * determinística, SALTANDO el NLU planner (que es el que misroutea, ej.
 * el bug "papa precio"). Este módulo es PURO y testeable sin red ni montar
 * el componente.
 *
 * Contrato:
 *   planForcedIntent(intent, text, opts) → {
 *     intent, tool, args, stub, stubMessage, prompt, skipNlu: true,
 *   } | null  (null si intent desconocido o text vacío)
 */

describe('chipIntentRouter — enum y definiciones', () => {
  it('expone los 7 intents del enum', () => {
    expect(CHIP_INTENTS).toEqual({
      siembro: 'siembro',
      plaga: 'plaga',
      biopreparado: 'biopreparado',
      clima: 'clima',
      precio: 'precio',
      calendario: 'calendario',
      deep: 'deep',
    });
  });

  it('CHIP_DEFS tiene los 7 chips con label en español colombiano (sin voseo)', () => {
    const ids = CHIP_DEFS.map((c) => c.intent);
    expect(ids).toEqual([
      'siembro',
      'plaga',
      'biopreparado',
      'clima',
      'precio',
      'calendario',
      'deep',
    ]);
    // Labels presentes y emoji declarado
    for (const def of CHIP_DEFS) {
      expect(typeof def.label).toBe('string');
      expect(def.label.length).toBeGreaterThan(0);
      expect(typeof def.emoji).toBe('string');
      expect(def.emoji.length).toBeGreaterThan(0);
      expect(typeof def.placeholder).toBe('string');
    }
  });

  it('ningún string del chip usa voseo argentino', () => {
    // tú/usted colombiano — NUNCA escribí/tomá/tenés/querés/elegí/dale/acá.
    const VOSEO = /\b(escrib[íi]|tom[áa]|ten[ée]s|quer[ée]s|eleg[íi]|pod[ée]s|dale|sab[ée]s|and[áa]|fij[áa]te)\b/i;
    for (const def of CHIP_DEFS) {
      expect(def.label).not.toMatch(VOSEO);
      expect(def.placeholder).not.toMatch(VOSEO);
      if (def.stubMessage) expect(def.stubMessage).not.toMatch(VOSEO);
    }
  });
});

describe('chipIntentRouter — entradas inválidas', () => {
  it('retorna null para intent desconocido', () => {
    expect(planForcedIntent('xxx', 'hola')).toBeNull();
    expect(planForcedIntent(null, 'hola')).toBeNull();
    expect(planForcedIntent(undefined, 'hola')).toBeNull();
  });

  it('retorna null para texto vacío', () => {
    expect(planForcedIntent('siembro', '')).toBeNull();
    expect(planForcedIntent('siembro', '   ')).toBeNull();
    expect(planForcedIntent('siembro', null)).toBeNull();
  });
});

describe('chipIntentRouter — intents con tool determinístico (saltan NLU)', () => {
  it('siembro → get_species con query del texto + skipNlu', () => {
    const plan = planForcedIntent('siembro', '¿qué tal el aguacate?');
    expect(plan.intent).toBe('siembro');
    expect(plan.tool).toBe('get_species');
    expect(plan.args).toEqual({ query: '¿qué tal el aguacate?' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('plaga → get_pest_controllers con pest del texto + skipNlu', () => {
    const plan = planForcedIntent('plaga', 'broca del café');
    expect(plan.tool).toBe('get_pest_controllers');
    expect(plan.args).toEqual({ pest: 'broca del café' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('biopreparado → get_biopreparados con query del texto + skipNlu', () => {
    const plan = planForcedIntent('biopreparado', 'algo para hongos en tomate');
    expect(plan.tool).toBe('get_biopreparados');
    expect(plan.args).toEqual({ query: 'algo para hongos en tomate' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('clima → get_clima_ideam (action monthly_avg) con municipio del opts + skipNlu', () => {
    const plan = planForcedIntent('clima', '¿va a llover?', { municipio: 'Choachí' });
    expect(plan.tool).toBe('get_clima_ideam');
    expect(plan.args.action).toBe('monthly_avg');
    expect(plan.args.municipio).toBe('Choachí');
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('clima sin municipio → evidence stub no_municipio (pide municipio, NO inventa)', () => {
    const plan = planForcedIntent('clima', '¿va a llover?');
    expect(plan.tool).toBe('get_clima_ideam');
    // sin municipio NO se llama el tool: evidence sintética que pide municipio
    expect(plan.stub).toBe(true);
    expect(plan.stubResult).toMatchObject({ available: false, reason: 'no_municipio' });
    expect(plan.skipNlu).toBe(true);
  });

  it('calendario → get_species con query del texto + skipNlu (no existe tool calendario dedicado)', () => {
    // No hay get_calendario_siembra en el sidecar; el calendario se deriva de
    // la ficha de especie (época de siembra / piso térmico). Routeamos a
    // get_species y dejamos que el grounding traiga la info de ciclo.
    const plan = planForcedIntent('calendario', 'maíz');
    expect(plan.tool).toBe('get_species');
    expect(plan.args).toEqual({ query: 'maíz' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });
});

describe('chipIntentRouter — intents STUB (backend no existe aún)', () => {
  it('precio → stub claro "aún no disponible" (NO inventa backend de precio)', () => {
    const plan = planForcedIntent('precio', 'papa');
    expect(plan.intent).toBe('precio');
    expect(plan.stub).toBe(true);
    expect(plan.tool).toBeNull();
    expect(typeof plan.stubMessage).toBe('string');
    expect(plan.stubMessage.toLowerCase()).toContain('no');
    expect(plan.skipNlu).toBe(true);
  });

  it('deep → stub claro "aún no disponible" (investigación profunda)', () => {
    const plan = planForcedIntent('deep', 'sistema agroforestal cacao');
    expect(plan.intent).toBe('deep');
    expect(plan.stub).toBe(true);
    expect(plan.tool).toBeNull();
    expect(typeof plan.stubMessage).toBe('string');
    expect(plan.skipNlu).toBe(true);
  });

  it('isStubIntent reconoce precio y deep como stub', () => {
    expect(isStubIntent('precio')).toBe(true);
    expect(isStubIntent('deep')).toBe(true);
    expect(isStubIntent('siembro')).toBe(false);
    expect(isStubIntent('plaga')).toBe(false);
    expect(isStubIntent('clima')).toBe(false);
    expect(isStubIntent('xxx')).toBe(false);
  });
});

describe('chipIntentRouter — el prompt se preserva tal cual lo escribió el usuario', () => {
  it('plan.prompt es el texto original trimmeado para todos los intents', () => {
    for (const intent of Object.keys(CHIP_INTENTS)) {
      const plan = planForcedIntent(intent, '  tomate cherry  ', { municipio: 'Choachí' });
      expect(plan.prompt).toBe('tomate cherry');
    }
  });
});
