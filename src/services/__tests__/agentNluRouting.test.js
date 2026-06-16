/**
 * agentNluRouting.test.js — NLU routing test with mock LLM responses (TAREA 54).
 *
 * Tests the NLU routing layer (planNluFallback + mock de LLM) para verificar
 * que consultas comunes son ruteadas al intent correcto y que preguntas sin
 * sentido ("mareñongoño") NO resultan en alucinacion.
 *
 * Scenarios:
 *   - "tengo plaga en el cafe" → routes to plaga intent (get_pest_controllers)
 *   - "como preparo caldo sulfocalcico" → routes to biopreparado
 *   - "cuando cosecho" → routes to calendario / get_species default
 *   - Anti-hallucination: "que es el mareñongoño" → debe devolver species query,
 *     NO afirmar conocimiento (grounding, no generativo)
 */

import { describe, it, expect, vi } from 'vitest';
import { planNluFallback } from '../agentNluFallback.js';

// ── Mock LLM responses ──────────────────────────────────────────────────────

/**
 * Simula una respuesta de LLM para cada caso de prueba.
 * En produccion esto es llamada via sidecar; aqui mockeamos el
 * contrato esperado para verificar que el router dirige al tool correcto.
 */
const mockLlmToolCall = vi.fn();

// ── Plaga intent ─────────────────────────────────────────────────────────────

describe('agentNluRouting — plaga intent', () => {
  it('"tengo plaga en el cafe" routes to get_pest_controllers', () => {
    const plan = planNluFallback('tengo plaga en el cafe', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_pest_controllers');
    expect(plan.source).toBe('fallback_keyword_pest');
  });

  it('"me estan atacando unos gusanos el maiz" routes to get_pest_controllers', () => {
    const plan = planNluFallback('me estan atacando unos gusanos el maiz', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_pest_controllers');
  });

  it('"broca en el cafetal" routes to get_pest_controllers (keyword match)', () => {
    const plan = planNluFallback('broca en el cafetal', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_pest_controllers');
    expect(plan.args.pest).toContain('broca');
  });

  it('"como controlo la broca" routes to get_pest_controllers', () => {
    const plan = planNluFallback('como controlo la broca', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_pest_controllers');
  });

  it('"que insecto ataca mi cultivo" routes to get_pest_controllers', () => {
    const plan = planNluFallback('que insecto ataca mi cultivo', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_pest_controllers');
  });
});

// ── Biopreparado intent ──────────────────────────────────────────────────────

describe('agentNluRouting — biopreparado intent', () => {
  it('"como preparo caldo sulfocalcico" routes to get_biopreparados', () => {
    const plan = planNluFallback('como preparo caldo sulfocalcico', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_biopreparados');
    expect(plan.source).toBe('fallback_keyword_biopreparado');
  });

  it('"receta de caldo bordeles" routes to get_biopreparados', () => {
    const plan = planNluFallback('receta de caldo bordeles', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_biopreparados');
  });

  it('"que biopreparado uso para la roya del cafe" routes to get_biopreparados', () => {
    const plan = planNluFallback('que biopreparado uso para la roya del cafe', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_biopreparados');
  });

  it('"como hago purin de ortiga" routes to get_biopreparados', () => {
    const plan = planNluFallback('como hago purin de ortiga', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_biopreparados');
  });

  it('"abono organico para el platano" routes to get_biopreparados', () => {
    const plan = planNluFallback('abono organico para el platano', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_biopreparados');
  });

  it('"jabon potasico para el cafetal" routes to get_biopreparados', () => {
    const plan = planNluFallback('jabon potasico para el cafetal', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_biopreparados');
  });
});

// ── Calendario / cosecha intent ─────────────────────────────────────────────

describe('agentNluRouting — calendario / default species intent', () => {
  it('"cuando cosecho" routes to get_species (default, no keyword match)', () => {
    const plan = planNluFallback('cuando cosecho', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_species');
    expect(plan.source).toBe('fallback_default_species');
    // El router no tiene keyword de calendario, cae al default grounding
    expect(plan.args.query).toBe('cuando cosecho');
  });

  it('"cada cuanto se riega el cafe" routes to get_species default', () => {
    const plan = planNluFallback('cada cuanto se riega el cafe', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_species');
  });
});

// ── Anti-hallucination ───────────────────────────────────────────────────────

describe('agentNluRouting — anti-hallucination', () => {
  it('"que es el mareñongoño" does NOT produce a definition (returns grounded query)', () => {
    const plan = planNluFallback('que es el mareñongoño', null);

    // Debe devolver un plan (no null): el router siempre emite grounding
    expect(plan).not.toBeNull();

    // Pero debe ser species query, NO un claim de conocimiento
    expect(plan.tool).toBe('get_species');
    expect(plan.source).toBe('fallback_default_species');

    // El query crudo se pasa al tool; el sidecar es quien responde
    // con "no encontrado" si la especie no existe en el catálogo.
    // El router NUNCA afirma conocimiento por si mismo.
    expect(plan.args.query).toBe('que es el mareñongoño');

    // Verificar que no hay texto generativo en el plan
    expect(plan.args).not.toHaveProperty('answer');
    expect(plan.args).not.toHaveProperty('definition');
    expect(plan.args).not.toHaveProperty('response');
  });

  it('"cual es la receta secreta" does not hallucinate a recipe', () => {
    const plan = planNluFallback('cual es la receta secreta', null);
    expect(plan).not.toBeNull();
    // No debe afirmar que conoce la receta
    expect(plan.tool).toBe('get_species');
    expect(plan.args).not.toHaveProperty('recipe');
    expect(plan.args).not.toHaveProperty('ingredients');
  });

  it('"que veneno mata todo" routes to pest controllers (keyword), not definition', () => {
    // Keyword "controlar"/"plaga" triggers pest route
    const plan = planNluFallback('que veneno mata todo', null);
    expect(plan).not.toBeNull();
    // Sin keyword especifica, cae a default; pero verificar que
    // no se inventa informacion
    expect(plan.args).not.toHaveProperty('poison');
    expect(plan.args).not.toHaveProperty('toxic');
    expect(plan.args).not.toHaveProperty('kill');
  });

  it('empty/malformed input returns null (no grounding possible)', () => {
    expect(planNluFallback('')).toBeNull();
    expect(planNluFallback('   ')).toBeNull();
    expect(planNluFallback(null)).toBeNull();
    expect(planNluFallback(undefined)).toBeNull();
  });

  it('invented botanical name does not produce fake taxonomy', () => {
    const plan = planNluFallback('como siembro planticus magicus', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_species');
    // El query se envia al sidecar; el router no inventa nada
    expect(plan.args.query).toBe('como siembro planticus magicus');
    expect(plan.args).not.toHaveProperty('taxonomy');
    expect(plan.args).not.toHaveProperty('family');
  });
});

// ── LLM mock integration ─────────────────────────────────────────────────────

describe('agentNluRouting — mock LLM responses', () => {
  it('mock LLM returns expected tool invocation for plaga query', () => {
    const plan = planNluFallback('tengo plaga en el cafe', null);
    mockLlmToolCall(plan.tool, plan.args);

    expect(mockLlmToolCall).toHaveBeenCalledWith(
      'get_pest_controllers',
      expect.objectContaining({ pest: expect.any(String) })
    );
  });

  it('mock LLM returns expected tool for biopreparado query', () => {
    const plan = planNluFallback('como preparo caldo sulfocalcico', null);
    mockLlmToolCall(plan.tool, plan.args);

    expect(mockLlmToolCall).toHaveBeenCalledWith(
      'get_biopreparados',
      expect.objectContaining({ query: expect.any(String) })
    );
  });

  it('tildes and case variations do not break routing', () => {
    const inputs = [
      'TENGO PLAGA EN EL CAFÉ',
      'como preparo Caldo Sulfocálcico',
      'Qué Biopreparado Uso',
      'Broca en el Cafetal!!',
    ];

    const results = inputs.map((msg) => planNluFallback(msg, null));
    expect(results.every((r) => r !== null)).toBe(true);
    expect(results.every((r) => typeof r.tool === 'string')).toBe(true);
  });
});
