/**
 * scripts/lib/__tests__/bench-scorer.test.mjs
 *
 * R3 (re-bench post-guards 2026-05-31): el scoring del bench era match LITERAL
 * de cadenas (`countKeywords` con `String.includes`). granite decía lo correcto
 * con OTRAS palabras (sinónimos / lemas) y sacaba 0/10 — un falso negativo que
 * engañaba el ranking. Este módulo introduce:
 *   - scoreKeywordsFlexible: match insensible a tildes/case + lema (stem) +
 *     sinónimos del dominio agroecológico colombiano.
 *   - LLM-judge (buildJudgePrompt / parseJudgeVerdict / scoreWithJudge) con el
 *     caller de ollama INYECTADO → testeable sin GPU.
 *
 * NO re-corre el bench completo (eso carga GPU + lo decide el operador): solo
 * deja el evaluador listo + esta cobertura unitaria del scorer.
 */
import { describe, it, expect } from 'vitest';
import {
  scoreKeywordsFlexible,
  buildJudgePrompt,
  parseJudgeVerdict,
  scoreWithJudge,
} from '../lib/bench-scorer.mjs';

describe('scoreKeywordsFlexible', () => {
  it('cuenta match literal igual que antes (no regresiona)', () => {
    const resp = 'La fresa requiere drenaje, riego por goteo y protección contra heladas.';
    const kws = ['drenaje', 'riego', 'heladas', 'poda'];
    const out = scoreKeywordsFlexible(resp, kws);
    expect(out.matched).toBe(3); // drenaje, riego, heladas (falta poda)
    expect(out.total).toBe(4);
  });

  it('ignora tildes y mayúsculas', () => {
    const resp = 'Aplicá CALDO BORDELÉS como preventivo; mejora la AIREACIÓN.';
    const out = scoreKeywordsFlexible(resp, ['caldo bordeles', 'aireacion']);
    expect(out.matched).toBe(2);
  });

  it('match por LEMA: "podas"/"podar"/"podado" cuentan por keyword "poda"', () => {
    expect(scoreKeywordsFlexible('Hacé podas de renovación.', ['poda']).matched).toBe(1);
    expect(scoreKeywordsFlexible('Conviene podar las hojas secas.', ['poda']).matched).toBe(1);
    expect(scoreKeywordsFlexible('El cafetal ya está podado.', ['poda']).matched).toBe(1);
  });

  it('match por LEMA en la keyword multi-palabra: "variedad resistente" ~ "variedades resistentes"', () => {
    const resp = 'Usá variedades resistentes como Castillo.';
    expect(scoreKeywordsFlexible(resp, ['variedades resistentes']).matched).toBe(1);
    // y la forma singular del keyword también casa con el plural del texto
    expect(scoreKeywordsFlexible(resp, ['variedad resistente']).matched).toBe(1);
  });

  it('match por SINÓNIMO del dominio: keyword "heladas" casa con "frío intenso"', () => {
    const resp = 'Protegé el cultivo del frío intenso en las madrugadas.';
    const out = scoreKeywordsFlexible(resp, ['heladas']);
    expect(out.matched).toBe(1);
  });

  it('match por SINÓNIMO: "nitrógeno" casa con "fijar nitrógeno"/"abono nitrogenado"/"leguminosas"', () => {
    expect(scoreKeywordsFlexible('Las leguminosas aportan al suelo.', ['nitrógeno']).matched).toBe(1);
    expect(scoreKeywordsFlexible('Usá un abono nitrogenado.', ['nitrógeno']).matched).toBe(1);
  });

  it('NO infla: keyword ausente sin sinónimo ni lema sigue sin contar', () => {
    const out = scoreKeywordsFlexible('La planta necesita sol.', ['drenaje', 'poda']);
    expect(out.matched).toBe(0);
  });

  it('expone qué keywords casaron (para diagnóstico)', () => {
    const out = scoreKeywordsFlexible('Drenaje y podas.', ['drenaje', 'poda', 'riego']);
    expect(out.matchedKeywords).toContain('drenaje');
    expect(out.matchedKeywords).toContain('poda');
    expect(out.matchedKeywords).not.toContain('riego');
  });

  it('entrada vacía / no-string → 0 sin romper', () => {
    expect(scoreKeywordsFlexible('', ['x']).matched).toBe(0);
    expect(scoreKeywordsFlexible(null, ['x']).matched).toBe(0);
    expect(scoreKeywordsFlexible('algo', []).total).toBe(0);
  });
});

describe('buildJudgePrompt', () => {
  it('incluye pregunta, respuesta del modelo y los keywords esperados', () => {
    const p = buildJudgePrompt({
      query: '¿Cómo se maneja la roya del café?',
      response: 'Variedades resistentes y caldo bordelés.',
      expectedKeywords: ['variedades resistentes', 'poda', 'caldo bordelés'],
    });
    expect(p).toMatch(/roya del café/);
    expect(p).toMatch(/Variedades resistentes y caldo bordelés/);
    expect(p).toMatch(/variedades resistentes/);
    // debe pedir un veredicto parseable (JSON o CUMPLE/NO_CUMPLE)
    expect(p).toMatch(/CUMPLE|veredicto|JSON/i);
  });
});

describe('parseJudgeVerdict', () => {
  it('parsea JSON {"cumple": true, "score": 0.8}', () => {
    const v = parseJudgeVerdict('Análisis... {"cumple": true, "score": 0.8} fin.');
    expect(v.cumple).toBe(true);
    expect(v.score).toBeCloseTo(0.8);
  });

  it('parsea "VEREDICTO: CUMPLE" en texto plano', () => {
    expect(parseJudgeVerdict('La respuesta es buena. VEREDICTO: CUMPLE').cumple).toBe(true);
    expect(parseJudgeVerdict('Le falta. VEREDICTO: NO_CUMPLE').cumple).toBe(false);
  });

  it('score fuera de [0,1] o ausente → derivado del booleano cumple', () => {
    expect(parseJudgeVerdict('{"cumple": true}').score).toBe(1);
    expect(parseJudgeVerdict('{"cumple": false}').score).toBe(0);
  });

  it('verdict ilegible → null (no inventa)', () => {
    const v = parseJudgeVerdict('bla bla sin veredicto');
    expect(v).toBeNull();
  });
});

describe('scoreWithJudge (caller de ollama inyectado, sin GPU)', () => {
  it('usa el veredicto del judge cuando responde bien', async () => {
    const fakeOllama = async () => '{"cumple": true, "score": 0.9}';
    const out = await scoreWithJudge(
      { query: 'q', response: 'r', expectedKeywords: ['a'] },
      { ollamaCall: fakeOllama },
    );
    expect(out.cumple).toBe(true);
    expect(out.score).toBeCloseTo(0.9);
    expect(out.source).toBe('judge');
  });

  it('cae a keyword-flexible si el judge falla/timeout (graceful)', async () => {
    const failOllama = async () => { throw new Error('timeout'); };
    const out = await scoreWithJudge(
      { query: 'q', response: 'Drenaje y poda.', expectedKeywords: ['drenaje', 'poda'] },
      { ollamaCall: failOllama },
    );
    // fallback: usó keyword-flexible (2/2)
    expect(out.source).toBe('keywords');
    expect(out.score).toBeCloseTo(1);
  });

  it('cae a keyword-flexible si el judge responde ilegible', async () => {
    const junkOllama = async () => 'no entiendo nada';
    const out = await scoreWithJudge(
      { query: 'q', response: 'Solo sol.', expectedKeywords: ['drenaje', 'poda'] },
      { ollamaCall: junkOllama },
    );
    expect(out.source).toBe('keywords');
    expect(out.score).toBeCloseTo(0);
  });
});
