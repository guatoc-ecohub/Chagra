/**
 * agentNluFallback.test.js — router heurístico de GROUNDING cuando el NLU murió (#349).
 *
 * Bug prod (#349): cuando `/nlu` del sidecar expira o falla, `planNlu` devuelve
 * null. Hoy el pipeline degrada a "chat directo": NO se llama NINGÚN tool, así
 * que el LLM responde solo con el grounding ligero de `resolveEntities` (binomio
 * canónico) — pero SIN la evidencia rica (companions/biopreparados/controladores).
 * En el peor caso (sin entidad resuelta) cae a generativo puro → alucinación
 * máxima.
 *
 * `planNluFallback` cierra ese hueco SIN red extra de NLU: a partir del mensaje
 * crudo + las entidades que `resolveEntities` (barato/determinístico) ya resolvió,
 * deriva el tool OBVIO (keywords → tool) para que el turno NUNCA salga sin al
 * menos un intento de grounding por tool. Es PURO y SÍNCRONO: testeable sin red.
 *
 * Doctrina:
 *   - SOLO se usa en el path de FALLO del NLU (plan === null). Con NLU vivo, el
 *     planner manda; este router no corre.
 *   - Conservador: si no hay señal clara de tool, devuelve un get_species con el
 *     mensaje como query (grounding genérico de especie) — preferible a nada.
 *   - Prioridad de señal: entidad resuelta canónica > keyword de plaga >
 *     keyword de biopreparado > especie por defecto.
 */
import { describe, it, expect } from 'vitest';
import { planNluFallback } from '../agentNluFallback.js';

describe('planNluFallback — invariante: NUNCA devuelve null para un mensaje agro real', () => {
  it('mensaje vacío / no-string → null (no hay nada que groundear)', () => {
    for (const bad of [null, undefined, '', '   ', 42, {}]) {
      expect(planNluFallback(bad)).toBeNull();
    }
  });

  it('mensaje agro genérico sin entidades → get_species con el query crudo (grounding por defecto)', () => {
    const plan = planNluFallback('cómo cuido el aguacate', null);
    expect(plan).not.toBeNull();
    expect(plan.tool).toBe('get_species');
    expect(plan.args).toEqual({ query: 'cómo cuido el aguacate' });
    expect(plan.source).toBe('fallback_default_species');
  });
});

describe('planNluFallback — (a) entidad resuelta canónica manda', () => {
  it('species resuelta → get_species con el canonical_id (señal fuerte de AGE)', () => {
    const entities = [
      { mentioned: 'aguacate', kind: 'species', canonical_id: 'persea_americana', nombre_comun: 'aguacate' },
    ];
    const plan = planNluFallback('háblame del aguacate', entities);
    expect(plan.tool).toBe('get_species');
    expect(plan.args).toEqual({ id_or_name: 'persea_americana' });
    expect(plan.source).toBe('fallback_resolved_species');
  });

  it('pest resuelta → get_pest_controllers con el id de la plaga', () => {
    const entities = [
      { mentioned: 'broca', kind: 'pest', canonical_id: 'hypothenemus_hampei', nombre_comun: 'broca del café' },
    ];
    const plan = planNluFallback('cómo controlo la broca', entities);
    expect(plan.tool).toBe('get_pest_controllers');
    expect(plan.args).toEqual({ pest: 'hypothenemus_hampei' });
    expect(plan.source).toBe('fallback_resolved_pest');
  });

  it('una plaga resuelta tiene prioridad sobre una species resuelta (la consulta es de control)', () => {
    const entities = [
      { mentioned: 'café', kind: 'species', canonical_id: 'coffea_arabica' },
      { mentioned: 'broca', kind: 'pest', canonical_id: 'hypothenemus_hampei' },
    ];
    const plan = planNluFallback('qué le echo a la broca del café', entities);
    expect(plan.tool).toBe('get_pest_controllers');
    expect(plan.args).toEqual({ pest: 'hypothenemus_hampei' });
  });
});

describe('planNluFallback — (b) keywords cuando no hay entidad resuelta', () => {
  it('keyword de plaga ("plaga"/"controlar"/"gusano") → get_pest_controllers con el query crudo', () => {
    const plan = planNluFallback('qué plaga ataca el maíz y cómo la controlo', null);
    expect(plan.tool).toBe('get_pest_controllers');
    expect(plan.args).toEqual({ pest: 'qué plaga ataca el maíz y cómo la controlo' });
    expect(plan.source).toBe('fallback_keyword_pest');
  });

  it('keyword de biopreparado → get_biopreparados con el query crudo', () => {
    const plan = planNluFallback('qué biopreparado uso para la roya', null);
    expect(plan.tool).toBe('get_biopreparados');
    expect(plan.args).toEqual({ query: 'qué biopreparado uso para la roya' });
    expect(plan.source).toBe('fallback_keyword_biopreparado');
  });

  it('sin keyword de plaga/biopreparado → get_species (default)', () => {
    const plan = planNluFallback('a qué altitud se da la quinua', null);
    expect(plan.tool).toBe('get_species');
    expect(plan.args).toEqual({ query: 'a qué altitud se da la quinua' });
    expect(plan.source).toBe('fallback_default_species');
  });
});

describe('planNluFallback — entidades de baja calidad no rompen', () => {
  it('entidad sin canonical_id → cae al heurístico por keywords', () => {
    const entities = [{ mentioned: 'algo', kind: 'species' }]; // sin canonical_id
    const plan = planNluFallback('cómo siembro algo', entities);
    expect(plan.tool).toBe('get_species');
    expect(plan.args).toEqual({ query: 'cómo siembro algo' });
    // No es resolved_species porque no había canonical_id usable.
    expect(plan.source).toBe('fallback_default_species');
  });

  it('entidades no-array → ignoradas, cae al heurístico', () => {
    const plan = planNluFallback('cómo riego el café', 'no-soy-array');
    expect(plan.tool).toBe('get_species');
    expect(plan.source).toBe('fallback_default_species');
  });
});
