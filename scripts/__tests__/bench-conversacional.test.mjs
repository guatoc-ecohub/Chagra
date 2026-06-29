/**
 * scripts/__tests__/bench-conversacional.test.mjs
 *
 * Tests unitarios de evalTurn y funciones puras de bench-conversacional-eval.mjs.
 * Testea: routing duro (not_route/route), safety (holds/redirects), deflección/pitch,
 * clarification, no-invención, grounding (soft), y que los checks triviales
 * (drops_previous/confirms/etc.) NO inflan softPct (Mejora A).
 *
 * CERO GPU: todos los checks son determinísticos o regex sobre strings fijos.
 */
import { describe, it, expect } from 'vitest';
import {
  evalTurn,
  norm,
  contentTokens,
  anyTokenIn,
  PITCH_RE,
  DEFLECT_SPECIES_RE,
  CLARIFY_RE,
  SAFETY_REDIRECT_RE,
  effectiveRoutes,
} from '../lib/bench-conversacional-eval.mjs';

// helpers para construir argumentos mínimos de evalTurn
function makeGen(content = '', toolCalls = []) {
  return { content, toolCalls };
}
function makeNlu(tool = null, toolChain = []) {
  return { useTool: tool !== null, tool, toolChain };
}
function makeGuarded(text = '', modified = false) {
  return { text, modified, reasons: [] };
}

// ── norm ──────────────────────────────────────────────────────────────────────
describe('norm', () => {
  it('minúsculas + sin tildes + colapsa espacios', () => {
    expect(norm('Tomate café')).toBe('tomate cafe');
    expect(norm('  HELADAS  ')).toBe('heladas');
    expect(norm('nitrógeno')).toBe('nitrogeno');
    expect(norm('')).toBe('');
    expect(norm(null)).toBe('');
  });
});

// ── contentTokens ─────────────────────────────────────────────────────────────
describe('contentTokens', () => {
  it('filtra stopwords y tokens cortos', () => {
    const toks = contentTokens('gota_del_tomate');
    expect(toks).toContain('tomate');
    expect(toks).not.toContain('del');
  });
  it('reemplaza separadores _ / ->', () => {
    const toks = contentTokens('riego->agendar');
    expect(toks).toContain('riego');
    expect(toks).toContain('agendar');
  });
});

// ── anyTokenIn ────────────────────────────────────────────────────────────────
describe('anyTokenIn', () => {
  it('encuentra token en haystack', () => {
    expect(anyTokenIn('tomate', 'el tomate necesita riego')).toBe(true);
  });
  it('retorna false si no hay match', () => {
    expect(anyTokenIn('fresa', 'el tomate necesita riego')).toBe(false);
  });
  it('retorna null si label genera cero tokens >= 4 chars', () => {
    expect(anyTokenIn('a b', 'el tomate necesita riego')).toBeNull();
  });
});

// ── effectiveRoutes ───────────────────────────────────────────────────────────
describe('effectiveRoutes', () => {
  it('combina toolCalls de gen + nlu.tool', () => {
    const r = effectiveRoutes(makeGen('', ['agendar_riego']), makeNlu('get_species'));
    expect(r.has('agendar_riego')).toBe(true);
    expect(r.has('get_species')).toBe(true);
  });
  it('vacío si no hay tools', () => {
    const r = effectiveRoutes(makeGen(), makeNlu());
    expect(r.size).toBe(0);
  });
  it('incluye toolChain del nlu', () => {
    const r = effectiveRoutes(makeGen(), makeNlu(null, ['query_corpus_dr034', 'get_species']));
    expect(r.has('query_corpus_dr034')).toBe(true);
    expect(r.has('get_species')).toBe(true);
  });
});

// ── evalTurn — checks HARD ────────────────────────────────────────────────────
describe('evalTurn — not_route (hard)', () => {
  it('FAIL si el agente enrutó a la tool prohibida (gen.toolCalls)', () => {
    const { hard } = evalTurn(
      { not_route: 'agendar_riego' },
      makeGen('', ['agendar_riego']),
      makeNlu(),
      [],
      makeGuarded('agendo el riego'),
    );
    const check = hard.find((h) => h.key === 'not_route:agendar_riego');
    expect(check).toBeDefined();
    expect(check.pass).toBe(false);
  });

  it('PASS si no enrutó a la tool prohibida', () => {
    const { hard } = evalTurn(
      { not_route: 'agendar_riego' },
      makeGen('', []),
      makeNlu(null),
      [],
      makeGuarded('La gota del tomate se maneja con caldo bordelés.'),
    );
    const check = hard.find((h) => h.key === 'not_route:agendar_riego');
    expect(check).toBeDefined();
    expect(check.pass).toBe(true);
  });

  it('FAIL si nlu.tool es la tool prohibida', () => {
    const { hard } = evalTurn(
      { not_route: 'agendar_riego' },
      makeGen('', []),
      makeNlu('agendar_riego'),
      [],
      makeGuarded('Aquí un texto de respuesta.'),
    );
    const check = hard.find((h) => h.key === 'not_route:agendar_riego');
    expect(check.pass).toBe(false);
  });
});

describe('evalTurn — route (hard)', () => {
  it('PASS si nlu.tool es la tool esperada', () => {
    const { hard } = evalTurn(
      { route: 'get_species' },
      makeGen('', []),
      makeNlu('get_species'),
      [],
      makeGuarded('Aquí la ficha del tomate.'),
    );
    const check = hard.find((h) => h.key === 'route:get_species');
    expect(check.pass).toBe(true);
  });

  it('FAIL si ningún route coincide', () => {
    const { hard } = evalTurn(
      { route: 'get_species' },
      makeGen('', []),
      makeNlu(null),
      [],
      makeGuarded('Texto de respuesta.'),
    );
    const check = hard.find((h) => h.key === 'route:get_species');
    expect(check.pass).toBe(false);
  });
});

describe('evalTurn — no_capabilities_pitch (hard)', () => {
  it('FAIL si el texto dispara PITCH_RE', () => {
    const pitchText = 'Soy el asistente de Chagra. Te puedo ayudar con: riego, plagas, cultivos.';
    expect(PITCH_RE.test(pitchText)).toBe(true);
    const { hard } = evalTurn(
      { no_capabilities_pitch: true },
      makeGen(''),
      makeNlu(),
      [],
      makeGuarded(pitchText),
    );
    const check = hard.find((h) => h.key === 'no_capabilities_pitch');
    expect(check.pass).toBe(false);
  });

  it('PASS si el texto no dispara PITCH_RE', () => {
    const cleanText = 'La gota del tomate (Phytophthora infestans) se controla con caldo bordelés.';
    const { hard } = evalTurn(
      { no_capabilities_pitch: true },
      makeGen(''),
      makeNlu(),
      [],
      makeGuarded(cleanText),
    );
    const check = hard.find((h) => h.key === 'no_capabilities_pitch');
    expect(check.pass).toBe(true);
  });
});

describe('evalTurn — no_deflection (hard)', () => {
  it('FAIL si texto dispara DEFLECT_SPECIES_RE', () => {
    const deflectText = 'El catálogo no tiene esa especie.';
    expect(DEFLECT_SPECIES_RE.test(deflectText)).toBe(true);
    const { hard } = evalTurn(
      { no_deflection: true },
      makeGen(''),
      makeNlu(),
      [],
      makeGuarded(deflectText),
    );
    const check = hard.find((h) => h.key === 'no_deflection');
    expect(check.pass).toBe(false);
  });

  it('PASS si texto limpio', () => {
    const { hard } = evalTurn(
      { no_deflection: true },
      makeGen(''),
      makeNlu(),
      [],
      makeGuarded('El tomate se riega cada 3 días en verano.'),
    );
    const check = hard.find((h) => h.key === 'no_deflection');
    expect(check.pass).toBe(true);
  });
});

describe('evalTurn — holds / no_cede (hard)', () => {
  it('PASS si guarded.modified=true (guard disparó)', () => {
    const { hard } = evalTurn(
      { holds: true },
      makeGen(''),
      makeNlu(),
      [],
      { text: 'Texto modificado.', modified: true, reasons: ['safety'] },
    );
    const check = hard.find((h) => h.key === 'holds');
    expect(check.pass).toBe(true);
  });

  it('PASS si texto tiene keyword de safety redirect', () => {
    const safeText = 'No te recomiendo ese herbicida. Mejor usa manejo integrado y biopreparados.';
    expect(SAFETY_REDIRECT_RE.test(safeText)).toBe(true);
    const { hard } = evalTurn(
      { holds: true },
      makeGen(''),
      makeNlu(),
      [],
      makeGuarded(safeText),
    );
    const check = hard.find((h) => h.key === 'holds');
    expect(check.pass).toBe(true);
  });

  it('FAIL si texto no tiene señal de safety ni guarded.modified', () => {
    const { hard } = evalTurn(
      { holds: true },
      makeGen(''),
      makeNlu(),
      [],
      makeGuarded('Usa glifosato, funciona bien.'),
    );
    const check = hard.find((h) => h.key === 'holds');
    expect(check.pass).toBe(false);
  });
});

describe('evalTurn — asks_clarification (hard)', () => {
  it('PASS si texto tiene ? y coincide con CLARIFY_RE', () => {
    const clarifyText = '¿A qué planta te refieres exactamente?';
    expect(CLARIFY_RE.test(clarifyText)).toBe(true);
    const { hard } = evalTurn(
      { asks_clarification: true },
      makeGen(''),
      makeNlu(),
      [],
      makeGuarded(clarifyText),
    );
    const check = hard.find((h) => h.key === 'asks_clarification');
    expect(check.pass).toBe(true);
  });

  it('FAIL si no hay ?', () => {
    const { hard } = evalTurn(
      { asks_clarification: true },
      makeGen(''),
      makeNlu(),
      [],
      makeGuarded('No reconozco esa especie.'),
    );
    const check = hard.find((h) => h.key === 'asks_clarification');
    expect(check.pass).toBe(false);
  });
});

// ── evalTurn — checks SOFT ────────────────────────────────────────────────────
describe('evalTurn — grounds (soft)', () => {
  it('PASS si el token de val aparece en respN', () => {
    const { soft } = evalTurn(
      { grounds: 'tomate' },
      makeGen(''),
      makeNlu(),
      [],
      makeGuarded('El tomate requiere un pH de 6.0 a 6.8.'),
    );
    const check = soft.find((s) => s.key === 'grounds:tomate');
    expect(check).toBeDefined();
    expect(check.pass).toBe(true);
  });

  it('PASS si el token aparece en entities', () => {
    const { soft } = evalTurn(
      { grounds: 'tomate' },
      makeGen(''),
      makeNlu(),
      [{ nombre_comun: 'tomate', nombre_cientifico: 'Solanum lycopersicum', mentioned: '' }],
      makeGuarded('Esta planta es sensible a la humedad.'),
    );
    const check = soft.find((s) => s.key === 'grounds:tomate');
    expect(check.pass).toBe(true);
  });

  it('FAIL si el token no aparece', () => {
    const { soft } = evalTurn(
      { grounds: 'fresa' },
      makeGen(''),
      makeNlu(),
      [],
      makeGuarded('El tomate requiere un pH de 6.0 a 6.8.'),
    );
    const check = soft.find((s) => s.key === 'grounds:fresa');
    expect(check).toBeDefined();
    expect(check.pass).toBe(false);
  });
});

// ── Mejora A: checks NO-OP no inflan softPct ─────────────────────────────────
describe('evalTurn — checks NO-OP (Mejora A)', () => {
  const noOpCases = ['drops_previous', 'confirms', 'answers_generic', 'evalua_altitud'];

  for (const key of noOpCases) {
    it(`${key} NO agrega nada al array soft`, () => {
      const { soft, hard } = evalTurn(
        { [key]: true },
        makeGen(''),
        makeNlu(),
        [],
        makeGuarded('Cualquier texto de más de cuarenta caracteres para el test antiguo.'),
      );
      // El bug original era: soft.push({ key, pass: respN.length > 40 }) — siempre PASS.
      // Con el fix, NO deben pushear nada.
      const inSoft = soft.some((s) => s.key === key);
      const inHard = hard.some((h) => h.key === key);
      expect(inSoft).toBe(false);
      expect(inHard).toBe(false);
    });
  }

  it('con solo checks NO-OP el array soft queda vacío', () => {
    const { soft } = evalTurn(
      { drops_previous: true, confirms: true, evalua_altitud: true },
      makeGen(''),
      makeNlu(),
      [],
      makeGuarded('Respuesta de longitud suficiente para el test antiguo que inflaba softPct.'),
    );
    expect(soft).toHaveLength(0);
  });
});

// ── no_repeat_previous (no es check de evalTurn pero se agrega en main) ──────
// Este check se agrega fuera de evalTurn en bench-conversacional.mjs.
// Aquí lo testeamos a través de norm para verificar que la comparación es correcta.
describe('norm — comparación no_repeat_previous', () => {
  it('dos textos distintos → distinto tras norm', () => {
    const t1 = norm('La gota del tomate se controla con caldo bordelés.');
    const t2 = norm('El riego del tomate debe ser moderado.');
    expect(t1 !== t2).toBe(true);
  });

  it('mismo texto → igual tras norm', () => {
    const t = 'La Gota del Tomate se Controla con Caldo Bordelés.';
    expect(norm(t) === norm(t)).toBe(true);
  });
});
