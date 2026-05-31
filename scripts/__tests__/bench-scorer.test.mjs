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
  assertIndependentJudge,
  RECOMMENDED_JUDGE_MODEL,
  GENERATOR_MODEL,
  buildAntiHallucPrompt,
  parseAHVerdict,
  scoreAntiHalluc,
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

// ── R4: independencia del juez ────────────────────────────────────────────────

describe('assertIndependentJudge (anti auto-evaluación)', () => {
  it('lanza si el juez es el propio generador', () => {
    expect(() => assertIndependentJudge(GENERATOR_MODEL, GENERATOR_MODEL)).toThrow(
      /auto-evaluaci|NO independiente/i,
    );
  });

  it('lanza ignorando mayúsculas/espacios', () => {
    expect(() => assertIndependentJudge('  GRANITE3.1-DENSE:8B ', 'granite3.1-dense:8b')).toThrow();
  });

  it('no lanza si el juez es de otra familia', () => {
    expect(() => assertIndependentJudge(RECOMMENDED_JUDGE_MODEL, GENERATOR_MODEL)).not.toThrow();
    expect(RECOMMENDED_JUDGE_MODEL).not.toBe(GENERATOR_MODEL);
  });

  it('el juez recomendado por defecto NO es el generador', () => {
    expect(RECOMMENDED_JUDGE_MODEL.toLowerCase()).not.toBe(GENERATOR_MODEL.toLowerCase());
  });
});

// ── R4: juez anti-alucinación (must_include / red_flags) ──────────────────────

describe('buildAntiHallucPrompt', () => {
  it('incluye pregunta, must_include y red_flags', () => {
    const p = buildAntiHallucPrompt({
      query: '¿la chugua aguanta la helada a 3200?',
      response: 'La chugua es Ullucus tuberosus...',
      mustInclude: ['Ullucus tuberosus', 'tizón tardío'],
      redFlags: ['Solanum tuberosum como identidad de chugua', 'cocona'],
      shouldInclude: ['helada', 'drenaje'],
    });
    expect(p).toMatch(/Ullucus tuberosus/);
    expect(p).toMatch(/Solanum tuberosum/);
    expect(p).toMatch(/RED FLAG/i);
    expect(p).toMatch(/"pass"/);
  });
});

describe('parseAHVerdict', () => {
  it('parsea JSON con pass + conteos', () => {
    const v = parseAHVerdict('eval... {"pass": true, "must_covered": 4, "must_total": 4, "red_flags_hit": 0} fin');
    expect(v.pass).toBe(true);
    expect(v.mustCovered).toBe(4);
    expect(v.mustTotal).toBe(4);
    expect(v.redFlagsHit).toBe(0);
  });

  it('parsea FAIL en texto plano', () => {
    expect(parseAHVerdict('hay alucinación. VEREDICTO: FAIL').pass).toBe(false);
    expect(parseAHVerdict('todo bien. VEREDICTO: PASS').pass).toBe(true);
  });

  it('verdict ilegible → null (no inventa)', () => {
    expect(parseAHVerdict('bla bla')).toBeNull();
  });
});

describe('scoreAntiHalluc (caller inyectado, sin GPU)', () => {
  it('usa el veredicto del juez cuando responde bien', async () => {
    const fake = async () => '{"pass": true, "must_covered": 4, "must_total": 4, "red_flags_hit": 0}';
    const out = await scoreAntiHalluc(
      { query: 'q', response: 'r', mustInclude: ['a', 'b', 'c', 'd'], redFlags: ['x'] },
      { ollamaCall: fake },
    );
    expect(out.pass).toBe(true);
    expect(out.source).toBe('judge');
    expect(out.redFlagsHit).toBe(0);
  });

  it('respuesta vacía → unjudged (no cuenta como PASS ni FAIL)', async () => {
    const fake = async () => '{"pass": true}';
    const out = await scoreAntiHalluc(
      { query: 'q', response: '', mustInclude: ['a'], redFlags: [] },
      { ollamaCall: fake },
    );
    expect(out.source).toBe('unjudged');
    expect(out.pass).toBeNull();
  });

  it('juez falla/ilegible → unjudged (NO inventa un PASS silencioso)', async () => {
    const fail = async () => { throw new Error('crash'); };
    const out = await scoreAntiHalluc(
      { query: 'q', response: 'algo', mustInclude: ['a'], redFlags: [] },
      { ollamaCall: fail },
    );
    expect(out.source).toBe('unjudged');
    expect(out.pass).toBeNull();
  });
});
