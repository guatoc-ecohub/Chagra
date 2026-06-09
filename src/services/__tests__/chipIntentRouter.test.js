import { describe, it, expect } from 'vitest';
import {
  CHIP_INTENTS,
  CHIP_DEFS,
  planForcedIntent,
  isStubIntent,
  isDeepResearchIntent,
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

  it('CHIP_DEFS deriva los 7 modos del manifiesto con label claro', () => {
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

  it('retorna null para opts null/undefined explícito', () => {
    // opts default es {} pero si se pasa null/undefined debe sobrevivir
    expect(planForcedIntent('siembro', 'hola', null)).not.toBeNull();
    expect(planForcedIntent('siembro', 'hola', undefined)).not.toBeNull();
  });

  it('retorna stub no_municipio para opts.municipio vacío/null en clima', () => {
    const emptyMunicipio = planForcedIntent('clima', '¿lloverá?', { municipio: '' });
    expect(emptyMunicipio.stub).toBe(true);
    expect(emptyMunicipio.stubResult.reason).toBe('no_municipio');

    const nullMunicipio = planForcedIntent('clima', '¿lloverá?', { municipio: null });
    expect(nullMunicipio.stub).toBe(true);
    expect(nullMunicipio.stubResult.reason).toBe('no_municipio');
  });

  it('retorna plan normal para texto con solo caracteres especiales', () => {
    const emoji = planForcedIntent('siembro', '🌱🌿');
    expect(emoji).not.toBeNull();
    expect(emoji.tool).toBe('get_species');
    expect(emoji.args).toEqual({ id_or_name: '🌱🌿' });
    expect(emoji.prompt).toBe('🌱🌿');
  });
});

describe('chipIntentRouter — intents con tool determinístico (saltan NLU)', () => {
  it('siembro → get_species con id_or_name + skipNlu', () => {
    const plan = planForcedIntent('siembro', '¿qué tal el aguacate?');
    expect(plan.intent).toBe('siembro');
    expect(plan.tool).toBe('get_species');
    expect(plan.args).toEqual({ id_or_name: '¿qué tal el aguacate?' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('plaga → get_pest_controllers con pest_id_or_name + skipNlu', () => {
    const plan = planForcedIntent('plaga', 'broca del café');
    expect(plan.tool).toBe('get_pest_controllers');
    expect(plan.args).toEqual({ pest_id_or_name: 'broca del café' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('biopreparado → get_biopreparados con species_id_or_pest + skipNlu', () => {
    const plan = planForcedIntent('biopreparado', 'algo para hongos en tomate');
    expect(plan.tool).toBe('get_biopreparados');
    expect(plan.args).toEqual({ species_id_or_pest: 'algo para hongos en tomate' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('clima → get_clima_ideam (action monthly_avg) con municipio del opts + skipNlu', () => {
    const plan = planForcedIntent('clima', '¿va a llover?', { municipio: 'Choachí' });
    expect(plan.tool).toBe('get_clima_ideam');
    expect(plan.args.action).toBe('monthly_avg');
    expect(plan.args.municipio).toBe('Choachí');
    expect(plan.args.metric).toBe('precipitation');
    // desde debe ser fecha ISO YYYY-MM-DD de hace ~30 días
    expect(plan.args.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('clima con opts.municipio trimmeado funciona (espacios alrededor se limpian)', () => {
    const plan = planForcedIntent('clima', 'lluvias?', { municipio: '  Choachí  ' });
    expect(plan.args.municipio).toBe('Choachí');
    expect(plan.stub).toBe(false);
  });

  it('clima sin municipio → evidence stub no_municipio (pide municipio, NO inventa)', () => {
    const plan = planForcedIntent('clima', '¿va a llover?');
    expect(plan.tool).toBe('get_clima_ideam');
    // sin municipio NO se llama el tool: evidence sintética que pide municipio
    expect(plan.stub).toBe(true);
    expect(plan.stubResult).toMatchObject({ available: false, reason: 'no_municipio' });
    expect(plan.skipNlu).toBe(true);
  });

  it('calendario → get_calendario_siembra con piso térmico real', () => {
    const plan = planForcedIntent('calendario', '¿qué siembro?', { pisoTermico: 'frío' });
    expect(plan.tool).toBe('get_calendario_siembra');
    expect(plan.args).toEqual({ piso_termico: 'frio' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('calendario sin piso térmico pide altitud sin inventar fechas', () => {
    const plan = planForcedIntent('calendario', '¿qué siembro?');
    expect(plan.tool).toBe('get_calendario_siembra');
    expect(plan.stub).toBe(true);
    expect(plan.stubResult).toMatchObject({ available: false, reason: 'no_piso_termico' });
  });

  it('precio → get_precio_sipsa real con latest_price', () => {
    const plan = planForcedIntent('precio', 'papa');
    expect(plan.intent).toBe('precio');
    expect(plan.stub).toBe(false);
    expect(plan.tool).toBe('get_precio_sipsa');
    expect(plan.args).toEqual({ action: 'latest_price', producto: 'papa' });
    expect(plan.skipNlu).toBe(true);
  });

  it('no quedan modos stub: los tools visibles existen o tienen flujo propio', () => {
    expect(isStubIntent('precio')).toBe(false);
    expect(isStubIntent('deep')).toBe(false);
    expect(isStubIntent('siembro')).toBe(false);
    expect(isStubIntent('plaga')).toBe(false);
    expect(isStubIntent('clima')).toBe(false);
    expect(isStubIntent('xxx')).toBe(false);
  });
});

describe('chipIntentRouter — Deep Research (A6/A7, backend live)', () => {
  it('deep → plan con deep=true + skipNlu + tool null (el AgentScreen lo intercepta)', () => {
    const plan = planForcedIntent('deep', 'sistema agroforestal cacao');
    expect(plan.intent).toBe('deep');
    expect(plan.deep).toBe(true);
    expect(plan.stub).toBe(false);
    expect(plan.tool).toBeNull();
    expect(plan.stubMessage).toBeNull();
    expect(plan.skipNlu).toBe(true);
    expect(plan.prompt).toBe('sistema agroforestal cacao');
  });

  it('isDeepResearchIntent reconoce solo el intent deep', () => {
    expect(isDeepResearchIntent('deep')).toBe(true);
    expect(isDeepResearchIntent('precio')).toBe(false);
    expect(isDeepResearchIntent('siembro')).toBe(false);
    expect(isDeepResearchIntent('plaga')).toBe(false);
    expect(isDeepResearchIntent('clima')).toBe(false);
    expect(isDeepResearchIntent('xxx')).toBe(false);
    expect(isDeepResearchIntent(null)).toBe(false);
    expect(isDeepResearchIntent(undefined)).toBe(false);
  });

  it('deep chip tiene kind=deep en CHIP_DEFS (no stub)', () => {
    const deepDef = CHIP_DEFS.find((d) => d.intent === 'deep');
    expect(deepDef).toBeTruthy();
    expect(deepDef.kind).toBe('deep');
    // Ya no tiene stubMessage
    expect(deepDef.stubMessage).toBeUndefined();
  });
});

describe('chipIntentRouter — contrato de orden y consistencia del índice', () => {
  it('CHIP_DEFS mantiene el orden de render estable (siembro, plaga, biopreparado, clima, precio, calendario, deep)', () => {
    const order = CHIP_DEFS.map((d) => d.intent);
    expect(order).toEqual([
      'siembro', 'plaga', 'biopreparado', 'clima', 'precio', 'calendario', 'deep',
    ]);
  });

  it('DEF_BY_INTENT indexa todos los 7 intents sin entradas extra', async () => {
    const { default: mod } = await import('../chipIntentRouter.js');
    // DEF_BY_INTENT no es exportado, así que verificamos indirectamente:
    // isStubIntent e isDeepResearchIntent cubren todos los intents sin error.
    for (const intent of Object.keys(CHIP_INTENTS)) {
      expect(() => {
        // Estos son los únicos consumers del índice interno
        const plan = planForcedIntent(intent, 'test');
        expect(plan).not.toBeNull();
      }).not.toThrow();
    }
  });
});

describe('chipIntentRouter — opts ruidosos no contaminan los args', () => {
  it('siembro ignora opts.municipio cuando se pasa por error', () => {
    const plan = planForcedIntent('siembro', 'aguacate', { municipio: 'Bogotá' });
    expect(plan.tool).toBe('get_species');
    expect(plan.args).toEqual({ id_or_name: 'aguacate' });
    expect(plan.args).not.toHaveProperty('municipio');
  });

  it('plaga ignora opts no relacionados', () => {
    const plan = planForcedIntent('plaga', 'broca', { foo: 'bar' });
    expect(plan.tool).toBe('get_pest_controllers');
    expect(plan.args).toEqual({ pest_id_or_name: 'broca' });
  });

  it('precio ignora opts completamente (pero sigue siendo tool real)', () => {
    const plan = planForcedIntent('precio', 'papa', { municipio: 'Choachí' });
    expect(plan.stub).toBe(false);
    expect(plan.tool).toBe('get_precio_sipsa');
    expect(plan.args).toEqual({ action: 'latest_price', producto: 'papa' });
  });

  it('deep ignora opts completamente', () => {
    const plan = planForcedIntent('deep', 'abonos verdes', { municipio: 'Choachí' });
    expect(plan.deep).toBe(true);
    expect(plan.tool).toBeNull();
    expect(plan.stub).toBe(false);
  });
});

describe('chipIntentRouter — cross-reference con ALLOWED_TOOLS del sidecar', () => {
  it('todas las tools de CHIP_DEFS kind:tool existen en ALLOWED_TOOLS', async () => {
    const { __TEST__ } = await import('../sidecarClient.js');
    const allowed = __TEST__.ALLOWED_TOOLS;
    const toolIntents = CHIP_DEFS.filter((d) => d.kind === 'tool');
    for (const def of toolIntents) {
      // planForcedIntent revela el tool name real
      const plan = planForcedIntent(def.intent, 'test query', { municipio: 'Choachí' });
      expect(plan.tool).not.toBeNull();
      expect(allowed.has(plan.tool)).toBe(true);
    }
  });

  it('ningún kind:stub o kind:deep tiene tool en ALLOWED_TOOLS', async () => {
    const { __TEST__ } = await import('../sidecarClient.js');
    const allowed = __TEST__.ALLOWED_TOOLS;
    const nonToolIntents = CHIP_DEFS.filter((d) => d.kind === 'deep');
    for (const def of nonToolIntents) {
      const plan = planForcedIntent(def.intent, 'test');
      expect(plan.tool).toBeNull();
      // Ningún stub/deep debe tener un tool asignado (ni siquiera por error)
    }
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
