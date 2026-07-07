/**
 * agentPromptBase.picudoGrounding.test.js — invariante anti-regresión para la
 * desambiguación de picudos (Curculionidae) en el system prompt.
 * Tarea #gl-picudo-grounding (2026-07-06).
 *
 * Contexto: hole de grounding cazado por el bench Q&A en vivo — al preguntar
 * por el PICUDO (sin especificar cultivo), el agente confundió el picudo del
 * algodón (Anthonomus grandis, plaga cuarentenaria ICA) con Diaprepes
 * abbreviatus (picudo de los cítricos, otra especie distinta). Las causas
 * raíz eran:
 *   - El `GLOSARIO_PLAGAS` y `PEST_GLOSSARY` solo tenían la entrada
 *     "picudo del plátano = Cosmopolites sordidus" → el agente no tenía
 *     la entrada "picudo del algodón" para contrastar.
 *   - No existía una REGLA ESPECIAL ANTI-CONFUSIÓN PICUDOS en el prompt.
 *
 * Este test bloquea regresiones sobre `buildBasePrompt` y `analyzeQuery`:
 *   1. `analyzeQuery` detecta "picudo del algodón" como plaga mencionada y
 *      resuelve el binomio correcto (Anthonomus grandis).
 *   2. `analyzeQuery` sigue detectando "picudo del plátano" (no se rompió
 *      la entrada pre-existente).
 *   3. `buildBasePrompt` inyecta la REGLA ESPECIAL ANTI-CONFUSIÓN PICUDOS
 *      cuando la query menciona picudo/anthonomus/diaprepes.
 *   4. `buildBasePrompt` lista el picudo del algodón en el glosario
 *      inyectado cuando la query lo menciona.
 *
 * Anti-invento: el test se limita a verificar invariantes del prompt
 * generado; no invoca MCP ni red. La fuente canónica del binomio es el
 * catálogo público + ICA (Colombia).
 */
import { describe, it, expect } from 'vitest';
import { analyzeQuery, buildBasePrompt } from '../agentPromptBase.js';

const baseArgs = {
  plantContext: '',
  fincaContext: '',
  indoorContext: '',
  finca: null,
  contextMemory: '',
  isEnum: false,
};

describe('analyzeQuery — picudo del algodón entra al PEST_GLOSSARY (#gl-picudo-grounding)', () => {
  it('detecta "picudo del algodón" como plaga mencionada con binomio Anthonomus grandis', () => {
    const r = analyzeQuery('cómo controlo el picudo del algodón');
    expect(r.pestsMentioned.length).toBeGreaterThan(0);
    const picudos = r.pestsMentioned.filter((p) =>
      p.canonical.toLowerCase().includes('anthonomus grandis'),
    );
    expect(picudos.length).toBeGreaterThan(0);
  });

  it('detecta "picudo algodonero" como plaga mencionada con binomio Anthonomus grandis', () => {
    const r = analyzeQuery('qué le echo al picudo algodonero');
    const picudos = r.pestsMentioned.filter((p) =>
      p.canonical.toLowerCase().includes('anthonomus grandis'),
    );
    expect(picudos.length).toBeGreaterThan(0);
  });

  it('NO revierte la detección pre-existente de "picudo del plátano" (Cosmopolites sordidus)', () => {
    const r = analyzeQuery('cómo controlo el picudo del plátano');
    const platano = r.pestsMentioned.filter((p) =>
      p.canonical.toLowerCase().includes('cosmopolites sordidus'),
    );
    expect(platano.length).toBeGreaterThan(0);
  });

  it('marca la consulta como topic plaga/enfermedad', () => {
    const r = analyzeQuery('el picudo del algodón me está acabando el cultivo');
    expect(r.topic).toBe('plaga/enfermedad');
  });
});

describe('buildBasePrompt — REGLA ESPECIAL ANTI-CONFUSIÓN PICUDOS (#gl-picudo-grounding)', () => {
  it('inyecta la REGLA ANTI-CONFUSIÓN PICUDOS cuando la query menciona "picudo"', () => {
    const prompt = buildBasePrompt({
      ...baseArgs,
      query: 'tengo picudo en el cultivo, ¿qué hago?',
    });
    expect(prompt).toContain('REGLA ESPECIAL ANTI-CONFUSIÓN PICUDOS');
    expect(prompt).toContain('Anthonomus grandis');
    expect(prompt).toContain('Cosmopolites sordidus');
    expect(prompt).toContain('Diaprepes abbreviatus');
  });

  it('inyecta la REGLA cuando la query menciona "anthonomus"', () => {
    const prompt = buildBasePrompt({
      ...baseArgs,
      query: '¿Anthonomus grandis es plaga cuarentenaria?',
    });
    expect(prompt).toContain('REGLA ESPECIAL ANTI-CONFUSIÓN PICUDOS');
  });

  it('NO inyecta la REGLA cuando la query no menciona picudos', () => {
    const prompt = buildBasePrompt({
      ...baseArgs,
      query: 'cómo siembro tomate',
    });
    expect(prompt).not.toContain('REGLA ESPECIAL ANTI-CONFUSIÓN PICUDOS');
  });

  it('la REGLA afirma explícitamente que Anthonomus grandis SÍ es cuarentenaria en Colombia (ICA)', () => {
    // Cierre directo del hole: el agente dijo "no es cuarentenaria".
    // La REGLA debe desmentirlo textualmente para evitar recaída.
    const prompt = buildBasePrompt({
      ...baseArgs,
      query: 'el picudo del algodón es cuarentenaria?',
    });
    expect(prompt).toMatch(/NUNCA digas que Anthonomus grandis.{0,40}no es cuarentenaria/i);
    expect(prompt).toMatch(/SÍ lo es en Colombia \(ICA\)/);
  });

  it('el glosario de plagas lista el picudo del algodón cuando la query lo menciona', () => {
    const prompt = buildBasePrompt({
      ...baseArgs,
      query: 'cómo manejo el picudo del algodón',
    });
    expect(prompt).toContain('picudo del algodón (gorgojo del algodonero) = Anthonomus grandis');
    expect(prompt).toContain('cuarentenaria reglamentada por el ICA');
  });
});
