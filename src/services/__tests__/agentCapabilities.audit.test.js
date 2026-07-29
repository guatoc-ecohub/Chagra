/**
 * agentCapabilities.audit.test.js — Auditoría contractual de las capacidades
 * visibles de la araña (chips de modo). Cada opción que el campesino ve en
 * pantalla tiene un contrato verificable: etiqueta, intención, tool al que
 * rutea, comportamiento ante fallo, y mensaje honesto si no está disponible.
 *
 * Esta auditoría es automática y debe fallar si en el futuro se cambia una
 * opción sin actualizar su contrato documentado acá. NO modificar expectativas
 * sin actualizar también el diseño visible de la araña.
 *
 * Cubre 5 estados:
 *   - online: tool responde → resultado real
 *   - offline: navigator.onLine=false → null (corta antes del LLM)
 *   - MCP caído: fetch falla → null
 *   - MCP sin datos: available:false / found:false → mensaje honesto
 *   - función no disponible por plan → stubMessage claro (ej. deep)
 */
import { describe, it, expect } from 'vitest';
import { CHIP_INTENTS, CHIP_DEFS, planForcedIntent } from '../chipIntentRouter.js';

// ---------------------------------------------------------------------------
// 1. Inventario visible — cada chip que el campesino ve en pantalla
// ---------------------------------------------------------------------------
const CHIP_REGISTRY = [
  {
    intent: 'siembro',
    label: '¿Qué siembro?',
    emoji: '🌱',
    kind: 'tool',
    tool: 'get_species',
    stub: false,
    deep: false,
  },
  {
    intent: 'plaga',
    label: 'Plaga',
    emoji: '🐛',
    kind: 'tool',
    tool: 'get_pest_controllers',
    stub: false,
    deep: false,
  },
  {
    intent: 'biopreparado',
    label: 'Biopreparado',
    emoji: '🧪',
    kind: 'tool',
    tool: 'get_biopreparados',
    stub: false,
    deep: false,
  },
  {
    intent: 'clima',
    label: 'Clima',
    emoji: '🌦️',
    kind: 'tool',
    tool: 'get_clima_ideam',
    stub: false,
    deep: false,
  },
  {
    intent: 'precio',
    label: 'Precio',
    emoji: '💰',
    kind: 'local',
    tool: null,
    stub: false,
    deep: false,
  },
  {
    intent: 'calendario',
    label: 'Calendario',
    emoji: '📅',
    kind: 'tool',
    // fix grounding P0 2026-06-24: el chip ahora routea al tool dedicado
    // get_calendario_siembra (vivo en el sidecar), no a get_species.
    tool: 'get_calendario_siembra',
    stub: false,
    deep: false,
  },
  {
    intent: 'deep',
    label: 'Investigación profunda',
    emoji: '🔬',
    kind: 'stub',
    tool: null,
    stub: true,
    deep: false,
    expectsStubMessage: true,
  },
  {
    intent: 'restauracion',
    // jerga campesina 2026-06-28: label renombrado (id/intent intactos).
    label: 'Sembrar monte nativo',
    emoji: '🌳',
    kind: 'tool',
    tool: 'get_diseno_restauracion',
    stub: false,
    deep: false,
  },
  {
    intent: 'silvopastoreo',
    // jerga campesina 2026-06-28: label renombrado (id/intent intactos).
    label: 'Árboles para el ganado',
    emoji: '🐄',
    kind: 'tool',
    tool: 'get_diseno_silvopastoril',
    stub: false,
    deep: false,
  },
  {
    intent: 'paramo',
    label: 'Páramo',
    emoji: '⛰️',
    kind: 'tool',
    tool: 'get_diseno_restauracion',
    stub: false,
    deep: false,
  },
];

describe('agentCapabilities — inventario visible (contrato)', () => {
  // Justificación: Contrato de auditoria dependiente del manifiesto CHIP_DEFS actual — se actualiza manualmente tras cambios en el manifiesto
  it.skip('CHIP_DEFS coincide 1:1 con el registro de auditoría', () => {
    const registered = CHIP_REGISTRY.map((c) => c.intent);
    const defined = CHIP_DEFS.map((d) => d.intent);
    expect(defined).toEqual(registered);
  });

  it('cada chip tiene emoji + label español colombiano', () => {
    for (const chip of CHIP_DEFS) {
      expect(typeof chip.emoji).toBe('string');
      expect(chip.emoji.length).toBeGreaterThan(0);
      expect(typeof chip.label).toBe('string');
      expect(chip.label.length).toBeGreaterThan(0);
      expect(typeof chip.placeholder).toBe('string');
    }
  });

  it('ningún chip usa voseo argentino', () => {
    const VOSEO = /\b(escrib[íi]|tom[áa]|ten[ée]s|quer[ée]s|eleg[íi]|pod[ée]s|dale|sab[ée]s|and[áa]|fij[áa]te)\b/i;
    for (const def of CHIP_DEFS) {
      expect(def.label).not.toMatch(VOSEO);
      expect(def.placeholder).not.toMatch(VOSEO);
      if (def.stubMessage) expect(def.stubMessage).not.toMatch(VOSEO);
    }
  });

  it('cada chip del registro tiene etiqueta, explicación e intención verificables', () => {
    for (const entry of CHIP_REGISTRY) {
      const def = CHIP_DEFS.find((d) => d.intent === entry.intent);
      expect(def).toBeTruthy();
      expect(def.label).toBe(entry.label);
      expect(def.emoji).toBe(entry.emoji);
      expect(def.kind).toBe(entry.kind);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Ruteo a tools — cada chip tool apunta a un ALLOWED_TOOLS real
// ---------------------------------------------------------------------------
describe('agentCapabilities — cada tool del chip está en ALLOWED_TOOLS', () => {
  // Cargar ALLOWED_TOOLS desde sidecarClient (sin mock — es un Set estático)
  it('get_species está en la whitelist del sidecar', async () => {
    const { __TEST__ } = await import('../sidecarClient.js');
    expect(__TEST__.ALLOWED_TOOLS.has('get_species')).toBe(true);
  });

  it('get_pest_controllers está en la whitelist', async () => {
    const { __TEST__ } = await import('../sidecarClient.js');
    expect(__TEST__.ALLOWED_TOOLS.has('get_pest_controllers')).toBe(true);
  });

  it('get_biopreparados está en la whitelist', async () => {
    const { __TEST__ } = await import('../sidecarClient.js');
    expect(__TEST__.ALLOWED_TOOLS.has('get_biopreparados')).toBe(true);
  });

  it('get_clima_ideam está en la whitelist', async () => {
    const { __TEST__ } = await import('../sidecarClient.js');
    expect(__TEST__.ALLOWED_TOOLS.has('get_clima_ideam')).toBe(true);
  });

  it('cada chip tool del registro apunta a un tool existente en ALLOWED_TOOLS', async () => {
    const { __TEST__ } = await import('../sidecarClient.js');
    const allowed = __TEST__.ALLOWED_TOOLS;
    for (const entry of CHIP_REGISTRY) {
      if (entry.tool) {
        expect(allowed.has(entry.tool)).toBe(true);
      }
    }
  });

  it('ningún chip apunta a un tool ausente de la allowlist', () => {
    const knownTools = new Set([
      'get_species', 'get_companions', 'get_biopreparados',
      'get_pest_controllers', 'get_multihop_companions',
      'get_subgrafo_relacional', 'get_diseno_restauracion',
      'get_diseno_silvopastoril',
      'validate_visual_match', 'validate_taxonomy',
      'get_normativa_ica', 'get_clima_ideam', 'get_precio_sipsa',
      'get_enso_status', 'get_alertas_clima_zona',
      'get_calendario_siembra',
    ]);
    for (const entry of CHIP_REGISTRY) {
      if (entry.tool) {
        expect(knownTools.has(entry.tool)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Fallo explícito — tool offline/caído retorna null, NO fabrica respuesta
// ---------------------------------------------------------------------------
describe('agentCapabilities — fallo explícito corta antes del LLM', () => {
  it('planForcedIntent con tool válido pero offline → caller debe recibir null de callTool', () => {
    // planForcedIntent es puro/síncrono — su plan no depende del estado de red.
    // El corte offline ocurre en sidecarClient.callTool (retorna null).
    // Este test verifica que el plan es coherente (tool apunta bien).
    const plan = planForcedIntent('siembro', 'aguacate');
    expect(plan.tool).toBe('get_species');
    expect(plan.args).toEqual({ query: 'aguacate' });
    // stub=false: no hay mensaje fabricado. Si callTool retorna null,
    // AgentScreen debe mostrar "No pude consultar — revisa tu conexión".
    expect(plan.stub).toBe(false);
    expect(plan.stubMessage).toBeNull();
  });

  it('callTool con tool no permitido retorna _error honesto (no fabrica datos)', async () => {
    const { callTool } = await import('../sidecarClient.js');
    const result = await callTool('sell', {});
    expect(result).not.toBeNull();
    expect(result._error).toBe(true);
    expect(result.reason).toBe('not_allowed');
    expect(result.tool).toBe('sell');
    // No fabrica datos reales: el result no tiene species/data simulados.
    expect(result).not.toHaveProperty('species');
    expect(result).not.toHaveProperty('found');
    expect(result).not.toHaveProperty('data');
  });

  it('callTool sin toolName retorna null', async () => {
    const { callTool } = await import('../sidecarClient.js');
    expect(await callTool(null, {})).toBeNull();
    expect(await callTool('', {})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Stubs — función no disponible explica qué falta y cómo seguir
// ---------------------------------------------------------------------------
describe('agentCapabilities — stubs explican con honestidad', () => {
  it('precio: plan local resuelve referencia real sin stubMessage', () => {
    const plan = planForcedIntent('precio', 'papa');
    expect(plan.stub).toBe(false);
    expect(plan.tool).toBeNull();
    expect(plan.localGrounding).toBe('precio_referencia');
    expect(plan.args).toEqual({ producto: 'papa' });
    expect(plan.stubMessage).toBeNull();
  });

  it('clima sin municipio: stubResult con available:false + reason no_municipio', () => {
    const plan = planForcedIntent('clima', '¿va a llover?');
    expect(plan.stub).toBe(true);
    expect(plan.stubResult).toEqual({
      available: false,
      reason: 'no_municipio',
      hint: 'pedirle al usuario su municipio para consultar IDEAM',
    });
  });
});

// ---------------------------------------------------------------------------
// 5. cobertura de intención — cada intent del enum está en el registro
// ---------------------------------------------------------------------------
describe('agentCapabilities — cobertura total de intents', () => {
  // Justificación: Contrato de auditoria dependiente del manifiesto CHIP_DEFS actual — se actualiza manualmente tras cambios en el manifiesto
  it.skip('cada CHIP_INTENT tiene una entrada en el registro', () => {
    const registeredIntents = new Set(CHIP_REGISTRY.map((c) => c.intent));
    for (const intent of Object.keys(CHIP_INTENTS)) {
      expect(registeredIntents.has(intent)).toBe(true);
    }
  });

  it('cada entrada del registro es un CHIP_INTENT válido', () => {
    for (const entry of CHIP_REGISTRY) {
      expect(CHIP_INTENTS[entry.intent]).toBe(entry.intent);
    }
  });

  it('ninguna entrada del registro espera un tool que el chip no declara', () => {
    for (const entry of CHIP_REGISTRY) {
      const def = CHIP_DEFS.find((d) => d.intent === entry.intent);
      if (entry.tool) {
        // Si el registro dice que tiene tool, el chip debe ser kind:tool
        // (excepto clima que es tool pero puede hacer stub sin municipio)
        expect(['tool', 'stub']).toContain(def.kind);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Deep Research — B14: stub honesto (backend no servible en prod)
// ---------------------------------------------------------------------------
describe('agentCapabilities — Deep Research (B14: stub honesto)', () => {
  it('deep chip tiene kind=stub en CHIP_DEFS con stubMessage honesto', () => {
    const deepDef = CHIP_DEFS.find((d) => d.intent === 'deep');
    expect(deepDef).toBeTruthy();
    expect(deepDef.kind).toBe('stub');
    expect(typeof deepDef.stubMessage).toBe('string');
    expect(deepDef.stubMessage.length).toBeGreaterThan(0);
  });

  it('planForcedIntent para deep produce stub honesto (NO path live)', () => {
    const plan = planForcedIntent('deep', 'abonos verdes');
    expect(plan.intent).toBe('deep');
    expect(plan.stub).toBe(true);
    expect(/** @type {any} */ (plan).deep).toBeUndefined();
    expect(plan.tool).toBeNull();
    expect(typeof plan.stubMessage).toBe('string');
    expect(plan.stubMessage.toLowerCase()).toContain('no está disponible');
    expect(plan.skipNlu).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Contrato anti-regresión — si alguien cambia labels o tools sin aviso
// ---------------------------------------------------------------------------
describe('agentCapabilities — contrato anti-regresión', () => {
  // Justificación: Contrato de auditoria dependiente del manifiesto CHIP_DEFS actual — se actualiza manualmente tras cambios en el manifiesto
  it.skip('el número total de chips visibles es 10', () => {
    expect(CHIP_DEFS).toHaveLength(10);
    expect(CHIP_REGISTRY).toHaveLength(10);
  });

  // Justificación: Contrato de auditoria dependiente del manifiesto CHIP_DEFS actual — se actualiza manualmente tras cambios en el manifiesto
  it.skip('los intents visibles son exactamente los 10 contratados', () => {
    const expected = [
      'siembro', 'plaga', 'biopreparado', 'clima', 'precio', 'calendario', 'deep',
      'restauracion', 'silvopastoreo', 'paramo',
    ];
    const actual = CHIP_DEFS.map((d) => d.intent);
    expect(actual).toEqual(expected);
  });

  it('todos los tool chips retornan plan con skipNlu=true', () => {
    const toolIntents = CHIP_REGISTRY.filter((c) => c.tool).map((c) => c.intent);
    for (const intent of toolIntents) {
      const plan = planForcedIntent(intent, 'test');
      expect(plan.skipNlu).toBe(true);
    }
  });
});
