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
 * R6 (2026-06-02): juez claude-cli — shell-out a `claude-code -p` (suscripción
 * del operador). Los tests del proveedor claude-cli mockean el shell-out vía
 * `spawnImpl` inyectado; NUNCA invocan claude-code real en CI.
 *
 * NO re-corre el bench completo (eso carga GPU + lo decide el operador): solo
 * deja el evaluador listo + esta cobertura unitaria del scorer.
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  scoreKeywordsFlexible,
  buildJudgePrompt,
  parseJudgeVerdict,
  scoreWithJudge,
  assertIndependentJudge,
  RECOMMENDED_JUDGE_MODEL,
  RECOMMENDED_ANTHROPIC_JUDGE_MODEL,
  RECOMMENDED_OLLAMA_JUDGE_MODEL,
  GENERATOR_MODEL,
  buildAntiHallucPrompt,
  parseAHVerdict,
  scoreAntiHalluc,
  readAnthropicKey,
  extractAnthropicText,
  makeAnthropicJudgeCall,
  scoreAntiHallucDeterministic,
  resolveMustThreshold,
  DEFAULT_MUST_THRESHOLD,
  selectJudgeProvider,
  ANTHROPIC_JUDGE_KEY_PATH,
  buildBatchAHPrompt,
  parseBatchAHVerdicts,
  makeClaudeCliJudgeCall,
  scoreAntiHallucBatch,
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
    const resp = 'Aplique CALDO BORDELÉS como preventivo; mejora la AIREACIÓN.';
    const out = scoreKeywordsFlexible(resp, ['caldo bordeles', 'aireacion']);
    expect(out.matched).toBe(2);
  });

  it('match por LEMA: "podas"/"podar"/"podado" cuentan por keyword "poda"', () => {
    expect(scoreKeywordsFlexible('Haga podas de renovación.', ['poda']).matched).toBe(1);
    expect(scoreKeywordsFlexible('Conviene podar las hojas secas.', ['poda']).matched).toBe(1);
    expect(scoreKeywordsFlexible('El cafetal ya está podado.', ['poda']).matched).toBe(1);
  });

  it('match por LEMA en la keyword multi-palabra: "variedad resistente" ~ "variedades resistentes"', () => {
    const resp = 'Use variedades resistentes como Castillo.';
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
    expect(scoreKeywordsFlexible('Use un abono nitrogenado.', ['nitrógeno']).matched).toBe(1);
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

// ── R5: juez Claude Sonnet (Anthropic) + fallback determinístico ─────────────
//
// NOTA DE SEGURIDAD: ningún test usa una API key real ni llama a la red. La
// llamada HTTP se mockea (`fetchImpl`) y la lectura de la key se inyecta (`env`
// / `keyPath`). Estos tests pasan en CI SIN ANTHROPIC_API_KEY.

describe('RECOMMENDED_JUDGE_MODEL ahora es Claude Sonnet (local roto en Maxwell)', () => {
  it('el default es el modelo Anthropic, no un modelo de ollama', () => {
    expect(RECOMMENDED_JUDGE_MODEL).toBe('claude-sonnet-5');
    expect(RECOMMENDED_JUDGE_MODEL).toBe(RECOMMENDED_ANTHROPIC_JUDGE_MODEL);
  });

  it('conserva el id del juez local solo para uso forzado en GPU compatible', () => {
    expect(RECOMMENDED_OLLAMA_JUDGE_MODEL).toBe('qwen2.5:14b');
  });

  it('el juez recomendado sigue siendo independiente del generador', () => {
    expect(() => assertIndependentJudge(RECOMMENDED_JUDGE_MODEL, GENERATOR_MODEL)).not.toThrow();
  });
});

describe('readAnthropicKey (sin tocar el entorno/disco real)', () => {
  it('lee de ANTHROPIC_API_KEY del env primero', () => {
    const key = readAnthropicKey({ env: { ANTHROPIC_API_KEY: ' sk-test-env ' }, keyPath: '/no/existe' });
    expect(key).toBe('sk-test-env'); // trim aplicado
  });

  it('cae al archivo gitignored si no hay env', () => {
    // Escribimos un archivo en un directorio temporal ÚNICO (mkdtemp, permisos
    // 0700) con un valor NO-secreto (placeholder). NUNCA usamos una key real.
    const dir = mkdtempSync(join(tmpdir(), 'chagra-judge-key-test-'));
    const tmpPath = join(dir, 'key');
    writeFileSync(tmpPath, '  not-a-real-key-PLACEHOLDER\n', 'utf-8');
    try {
      const key = readAnthropicKey({ env: {}, keyPath: tmpPath });
      expect(key).toBe('not-a-real-key-PLACEHOLDER'); // trim aplicado
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('devuelve null si no hay env ni archivo', () => {
    expect(readAnthropicKey({ env: {}, keyPath: '/ruta/que/no/existe/jamas' })).toBeNull();
  });

  it('no lanza si el path es inválido (degrada a null)', () => {
    expect(() => readAnthropicKey({ env: {}, keyPath: '\0invalid' })).not.toThrow();
  });

  it('expone la ruta esperada del archivo gitignored (~/.config/...)', () => {
    expect(ANTHROPIC_JUDGE_KEY_PATH).toMatch(/\.config\/chagra-anthropic-judge-key$/);
  });
});

describe('extractAnthropicText', () => {
  it('extrae el texto de content[] de la respuesta de Messages', () => {
    const data = { content: [{ type: 'text', text: '{"pass": true}' }] };
    expect(extractAnthropicText(data)).toBe('{"pass": true}');
  });

  it('concatena múltiples bloques de texto e ignora no-texto', () => {
    const data = { content: [{ type: 'text', text: 'VEREDICTO: ' }, { type: 'thinking', text: 'x' }, { type: 'text', text: 'PASS' }] };
    expect(extractAnthropicText(data)).toBe('VEREDICTO: PASS');
  });

  it('forma inesperada → string vacío (no lanza)', () => {
    expect(extractAnthropicText(null)).toBe('');
    expect(extractAnthropicText({})).toBe('');
    expect(extractAnthropicText({ content: 'x' })).toBe('');
  });
});

describe('makeAnthropicJudgeCall (fetch mockeado, sin key real)', () => {
  it('arma el request a la API de Anthropic y devuelve el texto del veredicto', async () => {
    let captured = null;
    const fakeFetch = async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: '{"pass": true, "must_covered": 2, "must_total": 2, "red_flags_hit": 0}' }] }),
      };
    };
    const judgeCall = makeAnthropicJudgeCall({ apiKey: 'sk-test-FAKE', fetchImpl: fakeFetch });
    const raw = await judgeCall('PROMPT DEL JUEZ');
    expect(raw).toBe('{"pass": true, "must_covered": 2, "must_total": 2, "red_flags_hit": 0}');

    // contrato del request: endpoint + headers anthropic + modelo Sonnet + temp 0
    expect(captured.url).toBe('https://api.anthropic.com/v1/messages');
    expect(captured.init.headers['x-api-key']).toBe('sk-test-FAKE');
    expect(captured.init.headers['anthropic-version']).toBeTruthy();
    const body = JSON.parse(captured.init.body);
    expect(body.model).toBe('claude-sonnet-5');
    expect(body.temperature).toBe(0);
    expect(body.messages[0].content).toBe('PROMPT DEL JUEZ');
  });

  it('enchufa directo en scoreAntiHalluc como ollamaCall (mismo contrato)', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '{"pass": false, "must_covered": 1, "must_total": 2, "red_flags_hit": 1}' }] }),
    });
    const judgeCall = makeAnthropicJudgeCall({ apiKey: 'sk-test-FAKE', fetchImpl: fakeFetch });
    const out = await scoreAntiHalluc(
      { query: 'q', response: 'r', mustInclude: ['a', 'b'], redFlags: ['x'] },
      { ollamaCall: judgeCall },
    );
    expect(out.source).toBe('judge');
    expect(out.pass).toBe(false);
    expect(out.redFlagsHit).toBe(1);
  });

  it('HTTP no-ok lanza → scoreAntiHalluc lo cuenta como unjudged (no inventa)', async () => {
    const fakeFetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
    const judgeCall = makeAnthropicJudgeCall({ apiKey: 'sk-test-FAKE', fetchImpl: fakeFetch });
    const out = await scoreAntiHalluc(
      { query: 'q', response: 'r', mustInclude: ['a'], redFlags: [] },
      { ollamaCall: judgeCall },
    );
    expect(out.source).toBe('unjudged');
  });

  it('lanza si no hay apiKey (sin exponer su valor)', () => {
    expect(() => makeAnthropicJudgeCall({ apiKey: '' })).toThrow(/apiKey/);
  });
});

describe('scoreAntiHallucDeterministic (fallback sin LLM)', () => {
  it('PASS: todos los must_include presentes y ningún red_flag', () => {
    const out = scoreAntiHallucDeterministic({
      response: 'La chugua es Ullucus tuberosus, resiste heladas con buen drenaje.',
      mustInclude: ['Ullucus tuberosus', 'drenaje'],
      redFlags: ['Solanum tuberosum'],
    });
    expect(out.pass).toBe(true);
    expect(out.mustCovered).toBe(2);
    expect(out.mustTotal).toBe(2);
    expect(out.redFlagsHit).toBe(0);
    expect(out.source).toBe('deterministic');
  });

  it('FAIL: aparece un red_flag', () => {
    const out = scoreAntiHallucDeterministic({
      response: 'La chugua en realidad es Solanum tuberosum.',
      mustInclude: ['Ullucus tuberosus'],
      redFlags: ['Solanum tuberosum'],
    });
    expect(out.pass).toBe(false);
    expect(out.redFlagsHit).toBe(1);
  });

  it('FAIL: falta un must_include', () => {
    const out = scoreAntiHallucDeterministic({
      response: 'Es una planta andina.',
      mustInclude: ['Ullucus tuberosus', 'drenaje'],
      redFlags: [],
    });
    expect(out.pass).toBe(false);
    expect(out.mustCovered).toBeLessThan(out.mustTotal);
  });

  it('entrada vacía / no-string → no crashea', () => {
    const out = scoreAntiHallucDeterministic({ response: null, mustInclude: ['a'], redFlags: [] });
    expect(out.pass).toBe(false);
    expect(out.source).toBe('deterministic');
  });

  it('expone coverage y threshold en el retorno (diagnóstico/reporte)', () => {
    const out = scoreAntiHallucDeterministic({
      response: 'La chugua es Ullucus tuberosus, resiste heladas.',
      mustInclude: ['Ullucus tuberosus', 'drenaje'],
      redFlags: [],
    });
    expect(out.coverage).toBeCloseTo(0.5); // 1 de 2 cubierto
    expect(out.threshold).toBe(DEFAULT_MUST_THRESHOLD);
  });
});

// ── UMBRAL de cobertura (no todo-o-nada) ──────────────────────────────────────
//
// CAMBIO DE METODOLOGÍA 2026-06-22: el scorer determinístico exigía TODOS los
// must_include por substring literal normalizado. El fixture endurecido
// (TEST_PROMPTS_HARDENED_2026-06-22) pone binomios latinos EXACTOS en
// must_include ("Ullucus tuberosus", "Phytophthora infestans") que ningún 8b
// reproduce textual → PASS=0 / FAIL=todos para CUALQUIER modelo (cero señal). El
// criterio nuevo: PASS si cobertura ≥ UMBRAL (default 0.6) Y cero red_flags. Los
// casos de abajo usan respuestas MOCK (strings fijos) — CERO llamadas a ollama.

describe('resolveMustThreshold (umbral configurable por env, sin tocar el real)', () => {
  it('default 0.6 cuando no hay nada configurado', () => {
    expect(resolveMustThreshold({ env: {} })).toBe(DEFAULT_MUST_THRESHOLD);
    expect(DEFAULT_MUST_THRESHOLD).toBe(0.6);
  });

  it('lee BENCH_MUST_THRESHOLD de la env', () => {
    expect(resolveMustThreshold({ env: { BENCH_MUST_THRESHOLD: '0.75' } })).toBeCloseTo(0.75);
    expect(resolveMustThreshold({ env: { BENCH_MUST_THRESHOLD: '1' } })).toBe(1);
  });

  it('valor explícito gana sobre la env', () => {
    expect(resolveMustThreshold({ threshold: 0.4, env: { BENCH_MUST_THRESHOLD: '0.9' } })).toBeCloseTo(0.4);
  });

  it('clampa a [0,1] y cae al default si es ilegible', () => {
    expect(resolveMustThreshold({ threshold: -2 })).toBe(0);
    expect(resolveMustThreshold({ threshold: 5 })).toBe(1);
    expect(resolveMustThreshold({ env: { BENCH_MUST_THRESHOLD: 'no-numero' } })).toBe(DEFAULT_MUST_THRESHOLD);
  });
});

describe('scoreAntiHallucDeterministic con UMBRAL — fixture endurecido (mock, sin GPU)', () => {
  // CPX-001 (chugua=ulluco / "gota"=tizón tardío). must_include con binomios
  // latinos EXACTOS que el modelo NO copia textual; cubre el fondo en español.
  const CPX001_MUST = ['Ullucus tuberosus', 'tizón tardío', 'Phytophthora infestans', 'caldo bordelés'];
  const CPX001_RED = [
    'Solanum tuberosum como identidad de chugua',
    'cocona',
    'cubio',
    'mancozeb dosis inventada',
    'que la chugua es de clima cálido',
  ];

  it('(a) respuesta BUENA que cubre ≥60% del fondo SIN red_flag → PASS', () => {
    // Respuesta correcta de fondo: nombra el oomiceto (tizón tardío +
    // Phytophthora infestans) y el manejo (caldo bordelés) aunque NO copie el
    // binomio "Ullucus tuberosus" textual. 3/4 = 0.75 ≥ 0.6 → PASS.
    const respuestaBuena =
      'Esa "gota" de la chugua es tizón tardío, causado por Phytophthora infestans, ' +
      'el mismo hongo de la papa. Aplique caldo bordelés como preventivo, mejore el ' +
      'drenaje y elimine los focos. Ojo que a 3.200 está marginal y la helada le quema el follaje.';
    const out = scoreAntiHallucDeterministic({
      response: respuestaBuena,
      mustInclude: CPX001_MUST,
      redFlags: CPX001_RED,
    });
    // tizón tardío + Phytophthora infestans + caldo bordelés = 3/4 = 0.75 ≥ 0.6
    expect(out.mustCovered).toBe(3);
    expect(out.mustTotal).toBe(4);
    expect(out.coverage).toBeCloseTo(0.75);
    expect(out.redFlagsHit).toBe(0);
    expect(out.pass).toBe(true);
  });

  it('cobertura JUSTO en el umbral (0.6 con 3/5) → PASS (≥, no >)', () => {
    const out = scoreAntiHallucDeterministic(
      { response: 'a b c', mustInclude: ['a', 'b', 'c', 'd', 'e'], redFlags: [] },
      { threshold: 0.6 },
    );
    expect(out.coverage).toBeCloseTo(0.6);
    expect(out.pass).toBe(true);
  });

  it('(b) respuesta con un RED_FLAG → FAIL aunque cubra el fondo ≥ umbral', () => {
    // Cubre el fondo (tizón tardío + binomio + caldo = 3/4 = 0.75 ≥ 0.6) PERO
    // dispara el red_flag "que la chugua es de clima cálido": red_flag => FAIL
    // SIEMPRE, sin importar la cobertura (la ausencia de alucinación no negocia).
    const respuestaConRedFlag =
      'Recuerde que la chugua es de clima cálido; igual la gota es tizón tardío ' +
      '(Phytophthora infestans) y se trata con caldo bordelés.';
    const out = scoreAntiHallucDeterministic({
      response: respuestaConRedFlag,
      mustInclude: CPX001_MUST,
      redFlags: CPX001_RED,
    });
    expect(out.coverage).toBeGreaterThanOrEqual(DEFAULT_MUST_THRESHOLD);
    expect(out.redFlagsHit).toBeGreaterThanOrEqual(1);
    expect(out.pass).toBe(false);
  });

  it('(c) respuesta VACÍA / mala (sin fondo) → FAIL', () => {
    const vacia = scoreAntiHallucDeterministic({
      response: '',
      mustInclude: CPX001_MUST,
      redFlags: CPX001_RED,
    });
    expect(vacia.coverage).toBe(0);
    expect(vacia.pass).toBe(false);

    const mala = scoreAntiHallucDeterministic({
      response: 'No sé bien, échele cualquier cosa y verá.',
      mustInclude: CPX001_MUST,
      redFlags: CPX001_RED,
    });
    expect(mala.coverage).toBeLessThan(DEFAULT_MUST_THRESHOLD);
    expect(mala.pass).toBe(false);
  });

  it('el criterio NO es todo-o-nada: 3/4 PASA con default pero FALLA con BENCH_MUST_THRESHOLD=1', () => {
    const item = {
      response:
        'Es tizón tardío (Phytophthora infestans); use caldo bordelés preventivo.',
      mustInclude: CPX001_MUST, // falta solo el binomio "Ullucus tuberosus" textual
      redFlags: CPX001_RED,
    };
    const conDefault = scoreAntiHallucDeterministic(item, { threshold: DEFAULT_MUST_THRESHOLD });
    const estricto = scoreAntiHallucDeterministic(item, { threshold: 1 });
    expect(conDefault.coverage).toBeCloseTo(0.75);
    expect(conDefault.pass).toBe(true); // discrimina: respuesta correcta de fondo PASA
    expect(estricto.pass).toBe(false); // criterio viejo todo-o-nada hubiera fallado
  });

  it('el umbral del env afecta el veredicto (señal discriminativa)', () => {
    const item = { response: 'a b', mustInclude: ['a', 'b', 'c', 'd'], redFlags: [] }; // 0.5
    expect(scoreAntiHallucDeterministic(item, { env: { BENCH_MUST_THRESHOLD: '0.5' } }).pass).toBe(true);
    expect(scoreAntiHallucDeterministic(item, { env: { BENCH_MUST_THRESHOLD: '0.6' } }).pass).toBe(false);
  });
});

describe('selectJudgeProvider', () => {
  it('AUTO con key → anthropic + judgeCall listo', () => {
    const sel = selectJudgeProvider({ env: { ANTHROPIC_API_KEY: 'sk-test-FAKE' }, fetchImpl: async () => ({}) });
    expect(sel.provider).toBe('anthropic');
    expect(sel.judgeModel).toBe('claude-sonnet-5');
    expect(typeof sel.judgeCall).toBe('function');
    expect(sel.deterministic).toBe(false);
  });

  it('AUTO sin key → deterministic (degradación graceful, judgeCall null)', () => {
    const sel = selectJudgeProvider({ env: {}, keyPath: '/no/existe' });
    expect(sel.provider).toBe('deterministic');
    expect(sel.judgeCall).toBeNull();
    expect(sel.deterministic).toBe(true);
  });

  it('JUDGE_PROVIDER=anthropic sin key → degrada a deterministic (no crashea)', () => {
    const sel = selectJudgeProvider({ env: { JUDGE_PROVIDER: 'anthropic' }, keyPath: '/no/existe' });
    expect(sel.provider).toBe('deterministic');
    expect(sel.deterministic).toBe(true);
  });

  it('JUDGE_PROVIDER=ollama → usa el ollamaCall inyectado y el modelo local', () => {
    const ollamaCall = async () => '{"pass": true}';
    const sel = selectJudgeProvider({ env: { JUDGE_PROVIDER: 'ollama' }, ollamaCall });
    expect(sel.provider).toBe('ollama');
    expect(sel.judgeModel).toBe('qwen2.5:14b');
    expect(sel.judgeCall).toBe(ollamaCall);
    expect(sel.deterministic).toBe(false);
  });

  it('JUDGE_PROVIDER=deterministic → fuerza determinístico aunque haya key', () => {
    const sel = selectJudgeProvider({ env: { JUDGE_PROVIDER: 'deterministic', ANTHROPIC_API_KEY: 'sk-test-FAKE' } });
    expect(sel.provider).toBe('deterministic');
    expect(sel.judgeCall).toBeNull();
  });

  it('arg provider explícito gana sobre la env', () => {
    const sel = selectJudgeProvider({ provider: 'deterministic', env: { JUDGE_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-test-FAKE' } });
    expect(sel.provider).toBe('deterministic');
  });

  it('nunca expone la key en el objeto devuelto', () => {
    const sel = selectJudgeProvider({ env: { ANTHROPIC_API_KEY: 'sk-test-SECRET' }, fetchImpl: async () => ({}) });
    expect(JSON.stringify(Object.keys(sel))).not.toMatch(/key|apiKey|secret/i);
    // ningún valor string del objeto contiene la key
    for (const v of Object.values(sel)) {
      if (typeof v === 'string') expect(v).not.toContain('sk-test-SECRET');
    }
  });

  // ── R6: claude-cli AUTO-fallback ────────────────────────────────────────────

  it('JUDGE_PROVIDER=claude-cli sin key → claude-cli con spawnImpl inyectado', () => {
    const fakeSpawn = async () => '[{"pass":true,"must_covered":1,"must_total":1,"red_flags_hit":0}]';
    const sel = selectJudgeProvider({
      env: { JUDGE_PROVIDER: 'claude-cli' },
      keyPath: '/no/existe',
      spawnImpl: fakeSpawn,
    });
    expect(sel.provider).toBe('claude-cli');
    expect(typeof sel.judgeCall).toBe('function');
    expect(sel.deterministic).toBe(false);
  });

  it('AUTO sin key + claude-code en PATH → degradación graceful a deterministic (no llama claude-code)', () => {
    // Sin key Y sin forzar claude-cli el AUTO sigue siendo deterministic para no
    // depender del PATH en tests de CI (claude-code real lanzaría un proceso).
    const sel = selectJudgeProvider({ env: {}, keyPath: '/no/existe' });
    expect(sel.provider).toBe('deterministic');
    expect(sel.deterministic).toBe(true);
  });
});

// ── R6: buildBatchAHPrompt ────────────────────────────────────────────────────

describe('buildBatchAHPrompt (prompt batch para claude-cli)', () => {
  const items = [
    {
      id: 'p1',
      query: '¿Aguanta la chugua helada?',
      response: 'La chugua (Ullucus tuberosus) tolera heladas leves con buen drenaje.',
      mustInclude: ['Ullucus tuberosus', 'drenaje'],
      redFlags: ['Solanum tuberosum'],
    },
    {
      id: 'p2',
      query: '¿Cuál es la dosis del caldo bordelés?',
      response: 'Caldo bordelés: 2% sulfato de cobre + cal, aplicar preventivo.',
      mustInclude: ['sulfato de cobre', 'cal'],
      redFlags: ['Mancozeb', 'dosis inventada'],
    },
  ];

  it('retorna un string con el prompt batch completo', () => {
    const prompt = buildBatchAHPrompt(items);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('incluye todos los ids de item en el prompt', () => {
    const prompt = buildBatchAHPrompt(items);
    expect(prompt).toMatch(/p1/);
    expect(prompt).toMatch(/p2/);
  });

  it('incluye must_include y red_flags de cada item', () => {
    const prompt = buildBatchAHPrompt(items);
    expect(prompt).toMatch(/Ullucus tuberosus/);
    expect(prompt).toMatch(/Solanum tuberosum/);
    expect(prompt).toMatch(/sulfato de cobre/);
    expect(prompt).toMatch(/Mancozeb/);
  });

  it('pide un array JSON como respuesta', () => {
    const prompt = buildBatchAHPrompt(items);
    expect(prompt).toMatch(/\[\s*\{/); // formato de array JSON en el prompt
  });

  it('lista vacía → prompt mínimo sin romper', () => {
    const prompt = buildBatchAHPrompt([]);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });
});

// ── R6: parseBatchAHVerdicts ──────────────────────────────────────────────────

describe('parseBatchAHVerdicts (parseo del array JSON de claude-cli)', () => {
  it('parsea array JSON con varios veredictos', () => {
    const raw = '[{"id":"p1","pass":true,"must_covered":2,"must_total":2,"red_flags_hit":0},{"id":"p2","pass":false,"must_covered":1,"must_total":2,"red_flags_hit":1}]';
    const out = parseBatchAHVerdicts(raw);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('p1');
    expect(out[0].pass).toBe(true);
    expect(out[0].mustCovered).toBe(2);
    expect(out[0].redFlagsHit).toBe(0);
    expect(out[1].id).toBe('p2');
    expect(out[1].pass).toBe(false);
  });

  it('extrae el array JSON aunque haya prosa del modelo antes y después', () => {
    const raw = 'Aquí está la evaluación solicitada:\n[{"id":"p1","pass":true,"must_covered":1,"must_total":1,"red_flags_hit":0}]\nFin de evaluación.';
    const out = parseBatchAHVerdicts(raw);
    expect(out).toHaveLength(1);
    expect(out[0].pass).toBe(true);
  });

  it('maneja array con un solo item', () => {
    const raw = '[{"id":"x","pass":false,"must_covered":0,"must_total":1,"red_flags_hit":2}]';
    const out = parseBatchAHVerdicts(raw);
    expect(out[0].mustTotal).toBe(1);
    expect(out[0].redFlagsHit).toBe(2);
  });

  it('devuelve null si la salida es ilegible (no inventa)', () => {
    expect(parseBatchAHVerdicts('bla bla sin JSON')).toBeNull();
    expect(parseBatchAHVerdicts('')).toBeNull();
    expect(parseBatchAHVerdicts(null)).toBeNull();
  });

  it('es tolerante a campos numéricos como string', () => {
    const raw = '[{"id":"p1","pass":true,"must_covered":"2","must_total":"2","red_flags_hit":"0"}]';
    const out = parseBatchAHVerdicts(raw);
    expect(out[0].mustCovered).toBe(2);
    expect(out[0].mustTotal).toBe(2);
    expect(out[0].redFlagsHit).toBe(0);
  });
});

// ── R6: makeClaudeCliJudgeCall ─────────────────────────────────────────────────
//
// CRÍTICO: spawnImpl se inyecta — NUNCA se llama al claude-code real en CI.
// El proceso real se usa solo post-merge en el rescore manual.

describe('makeClaudeCliJudgeCall (spawnImpl mockeado, sin claude-code real)', () => {
  const items = [
    {
      id: 'p1',
      query: '¿Aguanta helada?',
      response: 'Sí, tolera bien la helada con buen drenaje.',
      mustInclude: ['drenaje'],
      redFlags: ['aguacate'],
    },
    {
      id: 'p2',
      query: '¿Qué dosis del caldo?',
      response: 'Caldo bordelés al 2%.',
      mustInclude: ['caldo bordelés'],
      redFlags: ['Mancozeb'],
    },
  ];

  it('devuelve array de veredictos con el mismo contrato que scoreAntiHalluc', async () => {
    const batchResp = '[{"id":"p1","pass":true,"must_covered":1,"must_total":1,"red_flags_hit":0},{"id":"p2","pass":true,"must_covered":1,"must_total":1,"red_flags_hit":0}]';
    const fakeSpawn = async (_prompt) => batchResp;
    const judgeCall = makeClaudeCliJudgeCall({ spawnImpl: fakeSpawn });
    const out = await judgeCall(items);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('p1');
    expect(out[0].pass).toBe(true);
    expect(out[0].source).toBe('judge');
    expect(out[1].id).toBe('p2');
    expect(out[1].pass).toBe(true);
  });

  it('spawnImpl recibe un prompt batch (string largo con todos los items)', async () => {
    let capturedPrompt = '';
    const fakeSpawn = async (prompt) => {
      capturedPrompt = prompt;
      return '[{"id":"p1","pass":true,"must_covered":1,"must_total":1,"red_flags_hit":0},{"id":"p2","pass":true,"must_covered":1,"must_total":1,"red_flags_hit":0}]';
    };
    const judgeCall = makeClaudeCliJudgeCall({ spawnImpl: fakeSpawn });
    await judgeCall(items);
    // el prompt batch contiene los dos ids y los campos relevantes
    expect(capturedPrompt).toMatch(/p1/);
    expect(capturedPrompt).toMatch(/p2/);
    expect(capturedPrompt).toMatch(/drenaje/);
  });

  it('spawnImpl se llama UNA sola vez para todos los items del lote (no en paralelo)', async () => {
    let callCount = 0;
    const fakeSpawn = async () => {
      callCount += 1;
      return '[{"id":"p1","pass":true,"must_covered":1,"must_total":1,"red_flags_hit":0},{"id":"p2","pass":true,"must_covered":1,"must_total":1,"red_flags_hit":0}]';
    };
    const judgeCall = makeClaudeCliJudgeCall({ spawnImpl: fakeSpawn });
    await judgeCall(items);
    expect(callCount).toBe(1); // un solo spawn, no 2
  });

  it('spawnImpl falla → todos los items devuelven unjudged (no inventa)', async () => {
    const fakeSpawn = async () => { throw new Error('claude-code crash'); };
    const judgeCall = makeClaudeCliJudgeCall({ spawnImpl: fakeSpawn });
    const out = await judgeCall(items);
    expect(out).toHaveLength(2);
    for (const v of out) {
      expect(v.pass).toBeNull();
      expect(v.source).toBe('unjudged');
    }
  });

  it('spawnImpl devuelve JSON ilegible → items unjudged (no inventa)', async () => {
    const fakeSpawn = async () => 'bla bla sin JSON';
    const judgeCall = makeClaudeCliJudgeCall({ spawnImpl: fakeSpawn });
    const out = await judgeCall(items);
    for (const v of out) {
      expect(v.source).toBe('unjudged');
    }
  });

  it('id no encontrado en el batch respuesta → item unjudged (no casa con otro)', async () => {
    // El batch de spawnImpl responde solo para p1, no para p2
    const fakeSpawn = async () => '[{"id":"p1","pass":true,"must_covered":1,"must_total":1,"red_flags_hit":0}]';
    const judgeCall = makeClaudeCliJudgeCall({ spawnImpl: fakeSpawn });
    const out = await judgeCall(items);
    const p2 = out.find((v) => v.id === 'p2');
    expect(p2.source).toBe('unjudged');
  });
});

// ── R6: scoreAntiHallucBatch ──────────────────────────────────────────────────

describe('scoreAntiHallucBatch (lote con claude-cli mock)', () => {
  const items = [
    {
      id: 'cap1-p1',
      query: '¿Aguanta helada la chugua?',
      response: 'La chugua (Ullucus tuberosus) tolera heladas con buen drenaje.',
      mustInclude: ['Ullucus tuberosus'],
      redFlags: ['Solanum tuberosum'],
    },
    {
      id: 'cap2-p1',
      query: '¿Dosis de caldo bordelés?',
      response: 'Aplicar 2% sulfato de cobre con cal como preventivo.',
      mustInclude: ['sulfato de cobre'],
      redFlags: ['Mancozeb'],
    },
  ];

  it('devuelve un veredicto por item con source="judge" cuando el mock funciona', async () => {
    const fakeSpawn = async () =>
      '[{"id":"cap1-p1","pass":true,"must_covered":1,"must_total":1,"red_flags_hit":0},{"id":"cap2-p1","pass":false,"must_covered":0,"must_total":1,"red_flags_hit":1}]';
    const judgeCall = makeClaudeCliJudgeCall({ spawnImpl: fakeSpawn });
    const out = await scoreAntiHallucBatch(items, { judgeCall });
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('cap1-p1');
    expect(out[0].pass).toBe(true);
    expect(out[0].source).toBe('judge');
    expect(out[1].id).toBe('cap2-p1');
    expect(out[1].pass).toBe(false);
  });

  it('lista vacía → resultado vacío sin romper', async () => {
    const fakeSpawn = async () => '[]';
    const judgeCall = makeClaudeCliJudgeCall({ spawnImpl: fakeSpawn });
    const out = await scoreAntiHallucBatch([], { judgeCall });
    expect(out).toHaveLength(0);
  });

  it('sin judgeCall → todos unjudged (graceful)', async () => {
    const out = await scoreAntiHallucBatch(items, {});
    for (const v of out) {
      expect(v.source).toBe('unjudged');
    }
  });
});
