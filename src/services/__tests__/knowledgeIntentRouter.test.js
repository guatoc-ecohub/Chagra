/**
 * knowledgeIntentRouter.test.js — routing determinístico de intenciones de
 * conocimiento del grafo (usos tradicionales / toxicidad / variedades / suelo).
 *
 * Contrato:
 *   - SOLO dispara con una ESPECIE resuelta (ancla canónica del grafo).
 *   - Prioridad: toxicidad > saberes > variedades > suelo.
 *   - Señal de plaga inhibe saberes ("qué remedio le echo a la broca" es
 *     control, no etnobotánica).
 *   - Sin intención clara → null (el planner NLU decide).
 */
import { describe, it, expect } from 'vitest';
import {
  planKnowledgeIntent,
  hasIncendioRiskIntent,
  hasRestauracionDiagnosticIntent,
} from '../knowledgeIntentRouter.js';

const sp = (id, mentioned = null) => ({
  kind: 'species',
  canonical_id: id,
  mentioned: mentioned ?? id,
});

describe('planKnowledgeIntent — guardas', () => {
  it('mensaje vacío / no-string → null', () => {
    for (const bad of [null, undefined, '', '   ', 42, {}]) {
      expect(planKnowledgeIntent(/** @type {any} */ (bad), [sp('ruta_graveolens')])).toBeNull();
    }
  });

  it('sin especie resuelta → null (sin ancla no hay a quién apuntar)', () => {
    expect(planKnowledgeIntent('¿para qué sirve la ruda?', null)).toBeNull();
    expect(planKnowledgeIntent('¿para qué sirve la ruda?', [])).toBeNull();
    expect(
      planKnowledgeIntent('¿para qué sirve la ruda?', [
        { kind: 'pest', canonical_id: 'broca_cafe' },
      ]),
    ).toBeNull();
  });

  it('sin intención de conocimiento → null (el NLU decide)', () => {
    expect(
      planKnowledgeIntent('¿cómo controlo la broca del café?', [sp('coffea_arabica')]),
    ).toBeNull();
    expect(
      planKnowledgeIntent('¿a cómo está el bulto de papa?', [sp('solanum_tuberosum')]),
    ).toBeNull();
  });
});

describe('hasAnimalDiagnosticIntent — porcinos', () => {
  it('detecta cerdo y cerdos', async () => {
    const { hasAnimalDiagnosticIntent } = await import('../knowledgeIntentRouter.js');
    expect(hasAnimalDiagnosticIntent('tengo cerdos en la finca')).toBe(true);
    expect(hasAnimalDiagnosticIntent('quiero manejar el cerdo de engorde')).toBe(true);
  });
});

describe('planKnowledgeIntent — las 4 intenciones', () => {
  it('toxicidad: "¿la yuca brava es tóxica?" → get_toxicidad con la entidad', () => {
    const plan = planKnowledgeIntent('¿la yuca brava es tóxica?', [sp('manihot_esculenta', 'yuca brava')]);
    expect(plan).toEqual({
      tool: 'get_toxicidad',
      args: { species_id_or_name: 'manihot_esculenta' },
      source: 'knowledge_toxicidad',
    });
  });

  it('toxicidad: "¿puedo comer las hojas de la yuca?" dispara sin la palabra tóxico', () => {
    const plan = planKnowledgeIntent('¿puedo comer las hojas de la yuca?', [sp('manihot_esculenta')]);
    expect(plan?.tool).toBe('get_toxicidad');
  });

  it('saberes: "¿para qué sirve la ruda?" → get_saberes', () => {
    const plan = planKnowledgeIntent('¿Para qué sirve la ruda?', [sp('ruta_graveolens', 'ruda')]);
    expect(plan).toEqual({
      tool: 'get_saberes',
      args: { species_id_or_name: 'ruta_graveolens' },
      source: 'knowledge_saberes',
    });
  });

  it('saberes: "usos medicinales del sauco" → get_saberes', () => {
    const plan = planKnowledgeIntent('usos medicinales del sauco', [sp('sambucus_peruviana', 'sauco')]);
    expect(plan?.tool).toBe('get_saberes');
  });

  it('variedades: "¿qué variedades de café hay?" → get_variedades', () => {
    const plan = planKnowledgeIntent('¿Qué variedades de café me recomiendas?', [sp('coffea_arabica', 'café')]);
    expect(plan).toEqual({
      tool: 'get_variedades',
      args: { species_id_or_name: 'coffea_arabica' },
      source: 'knowledge_variedades',
    });
  });

  it('suelo: "¿qué pH necesita la papa?" → get_suelo', () => {
    const plan = planKnowledgeIntent('¿Qué pH necesita la papa?', [sp('solanum_tuberosum', 'papa')]);
    expect(plan).toEqual({
      tool: 'get_suelo',
      args: { species_id_or_name: 'solanum_tuberosum' },
      source: 'knowledge_suelo',
    });
  });

  it('suelo: "síntomas de deficiencia en el café" → get_suelo', () => {
    const plan = planKnowledgeIntent('síntomas de deficiencia en el café', [sp('coffea_arabica')]);
    expect(plan?.tool).toBe('get_suelo');
  });
});

describe('planKnowledgeIntent — prioridades y guardas cruzadas', () => {
  it('toxicidad gana a saberes (seguridad primero)', () => {
    const plan = planKnowledgeIntent(
      '¿para qué sirve el borrachero y es venenoso?',
      [sp('brugmansia_arborea', 'borrachero')],
    );
    expect(plan?.tool).toBe('get_toxicidad');
  });

  it('señal de plaga inhibe saberes: "qué remedio natural le echo a la broca del café" → null', () => {
    const plan = planKnowledgeIntent(
      '¿qué remedio natural le echo a la broca del café?',
      [sp('coffea_arabica', 'café'), { kind: 'pest', canonical_id: 'hypothenemus_hampei_broca' }],
    );
    expect(plan).toBeNull();
  });

  it('usa mentioned cuando falta canonical_id', () => {
    const plan = planKnowledgeIntent('¿la adelfa es venenosa?', [
      { kind: 'species', canonical_id: null, mentioned: 'adelfa' },
    ]);
    expect(plan?.args).toEqual({ species_id_or_name: 'adelfa' });
  });
});

describe('hasIncendioRiskIntent — riesgo de incendio (≠ restauración post-incendio)', () => {
  it('detecta preguntas de riesgo/temporada de incendio', () => {
    expect(hasIncendioRiskIntent('¿estoy en riesgo de incendio esta temporada?')).toBe(true);
    expect(hasIncendioRiskIntent('hay temporada de incendios ahora?')).toBe(true);
    expect(hasIncendioRiskIntent('¿hay alerta de incendio en mi zona?')).toBe(true);
    expect(hasIncendioRiskIntent('peligro de incendio en la finca')).toBe(true);
    expect(hasIncendioRiskIntent('¿se va a quemar el pasto con esta sequía?')).toBe(true);
    expect(hasIncendioRiskIntent('estamos en época de quemas')).toBe(true);
  });

  it('NO confunde con restauración post-incendio (eso es otro módulo)', () => {
    // Estas frases las maneja hasRestauracionDiagnosticIntent, no la de riesgo.
    expect(hasIncendioRiskIntent('quiero restaurar después del incendio')).toBe(false);
    expect(hasIncendioRiskIntent('qué siembro en el sitio quemado')).toBe(false);
    // La restauración la captura su propio matcher (con árboles/especies nativas).
    expect(hasRestauracionDiagnosticIntent('quiero restaurar un terreno con árboles nativos')).toBe(true);
  });

  it('no dispara con texto irrelevante ni vacío', () => {
    expect(hasIncendioRiskIntent('¿qué siembro en abril?')).toBe(false);
    expect(hasIncendioRiskIntent('')).toBe(false);
    expect(hasIncendioRiskIntent(null)).toBe(false);
  });
});
