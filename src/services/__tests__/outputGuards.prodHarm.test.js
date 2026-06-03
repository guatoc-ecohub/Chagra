/**
 * outputGuards.prodHarm.test.js — PACK de fixes de daño en producción.
 *
 * Contexto: transcript real del operador con el agente Chagra en prod (Choachí,
 * 1923 msnm, templado) 2026-06-03. Patrón raíz: NLU abortó → todo cayó al LLM
 * generativo sin grounding y los guards no tenían entidad/data. Estos tests
 * mockean la SALIDA REAL dañina que produjo el agente y verifican que el guard
 * AHORA la corrige (antes→después). Ground-truth:
 *   Chagra-strategy/ops/PROD-ERRORS-TRANSCRIPT-2026-06-03.md
 *
 * Cobertura:
 *   #350 — inverted-viability FALSO-NEGATIVO (papa/fresa @1923 → viable).
 *   #351 — agroquímico: fertilizantes de síntesis (NPK/urea/fosfato…).
 *   #352 — guard de dominio (off-domain física/química/matemáticas).
 *   #347 — fuga de inventario en precio (bulto/arroba/carga → price intent).
 *   #348 — anti-diagnóstico-sin-foto ("manchas en el tomate" sin imagen).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardFalseInviability,
  guardSyntheticAgrochemical,
  guardOffDomain,
  guardDiagnosisWithoutPhoto,
  classifyQueryIntent,
  applyOutputGuards,
  resetOutputGuardTelemetry,
  getOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

// ──────────────────────────────────────────────────────────────────────────
// #350 — inverted-viability FALSO-NEGATIVO (CRÍTICO)
// ──────────────────────────────────────────────────────────────────────────
describe('#350 guardFalseInviability (papa/fresa viable marcadas inviables)', () => {
  it('papa @1923 m → corrige a VIABLE (Choachí es zona papera templada)', () => {
    const llmFail =
      'En tu finca a 1923 msnm las variedades de papa NO son viables, el clima no les sirve y no vale ' +
      'la pena el esfuerzo. Mejor siembra Daikon o ajo, que sí aguantan tu altura.';
    const out = guardFalseInviability(llmFail, null, 1923);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/viabilidad_falso_negativo/);
    expect(out.reason).toMatch(/papa/);
    // La corrección afirma viabilidad y lidera.
    expect(out.text).toMatch(/papa.*S[ÍI] es viable|S[ÍI] es viable/i);
    expect(out.text.indexOf('Corrección')).toBe(0);
    // La afirmación FALSA de inviabilidad se elimina.
    expect(out.text).not.toMatch(/papa NO son viables/i);
    expect(out.text).not.toMatch(/no vale la pena el esfuerzo/i);
  });

  it('fresa @1923 m → corrige a VIABLE', () => {
    const llmFail =
      'La fresa silvestre andina NO es viable a 1923 msnm en tu finca; su clima no le sirve. ' +
      'Te sugiero variedades extranjeras como otra cosa.';
    const out = guardFalseInviability(llmFail, null, 1923);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/fresa/);
    expect(out.text).toMatch(/S[ÍI] es viable/i);
    expect(out.text).not.toMatch(/fresa silvestre andina NO es viable/i);
  });

  it('papa @3500 m → NO corrige (fuera de banda; inviabilidad por frío real es legítima)', () => {
    // Spec: papa@3500 → inviable. Por encima del techo comercial (3200 m) la papa
    // entra en zona fría marginal; el guard NO debe inventar viabilidad ahí.
    const llmFail = 'A 3500 msnm la papa NO es viable, hace demasiado frío para tuberizar bien.';
    const out = guardFalseInviability(llmFail, null, 3500);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(llmFail);
  });

  it('NO dispara si el texto NO declara inviabilidad (papa mencionada como viable)', () => {
    const ok = 'A 1923 msnm la papa se da muy bien; es zona papera tradicional.';
    const out = guardFalseInviability(ok, null, 1923);
    expect(out.modified).toBe(false);
  });

  it('NO dispara sin altitud de finca (no podemos afirmar viabilidad sin saber la altura)', () => {
    const llmFail = 'La papa NO es viable en tu finca.';
    const out = guardFalseInviability(llmFail, null, null);
    expect(out.modified).toBe(false);
  });

  it('DEFIERE al grounding: si la AGE marca papa inviable autoritativamente, NO afirma viabilidad', () => {
    // Precedencia: la tabla hardcodeada es RED DE SEGURIDAD para el caso SIN
    // grounding (NLU abortó). Si el grafo SÍ resolvió viabilidad:inviable para la
    // papa, la AGE manda — este guard cede (lo corrige guardInvertedViability).
    const llmFail = 'La papa NO es viable en tu finca a 1923 msnm.';
    const groundedInviable = [
      { kind: 'species', nombre_comun: 'papa', mentioned: 'papa', viabilidad: 'inviable', nombre_cientifico: 'Solanum tuberosum' },
    ];
    const out = guardFalseInviability(llmFail, groundedInviable, 1923);
    expect(out.modified).toBe(false);
  });

  it('dispara cuando NO hay grounding (caso real: NLU abortó, LLM inventó la inviabilidad)', () => {
    const llmFail = 'La papa NO es viable en tu finca a 1923 msnm.';
    const out = guardFalseInviability(llmFail, [], 1923);
    expect(out.modified).toBe(true);
  });

  it('emite telemetría false_inviability', () => {
    guardFalseInviability('La papa no es viable a esa altura.', null, 1923);
    expect(getOutputGuardTelemetry().false_inviability).toBe(1);
  });

  it('maneja entrada vacía / no-string', () => {
    expect(guardFalseInviability('', null, 1923).modified).toBe(false);
    expect(guardFalseInviability(null, null, 1923).text).toBe('');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// #351 — fertilizantes de síntesis (extiende guardSyntheticAgrochemical)
// ──────────────────────────────────────────────────────────────────────────
describe('#351 guardSyntheticAgrochemical — fertilizantes de síntesis', () => {
  it('CASO REAL: "plan de alimentación con NPK 5-10-10, foliar 10-10-10" → redirige a orgánico', () => {
    const llmFail =
      'Para tu plan de alimentación de las fresas aplica NPK 5-10-10 al suelo y un foliar 10-10-10 ' +
      'cada quince días para que cuajen bien.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/npk|10-10-10|5-10-10/i);
    expect(out.text).toMatch(/agroecológico/i);
    // Redirige a abono orgánico (compost/bocashi/biol), no a un fungicida.
    expect(out.text).toMatch(/compost|bocashi|biol|humus/i);
  });

  it('CASO REAL: "mezcla urea + fosfato triple + sulfato de potasio" → bloquea y redirige', () => {
    const llmFail =
      'Para hacer tú mismo ese NPK, mezcla urea como fuente de nitrógeno, fosfato triple para el ' +
      'fósforo y sulfato de potasio para el potasio, en partes iguales.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/urea|fosfato triple|sulfato de potasio/i);
    expect(out.text).toMatch(/compost|bocashi|biol|humus/i);
  });

  it('bloquea nitrato de amonio y fosfato diamónico', () => {
    for (const llmFail of [
      'Aplica nitrato de amonio para que pegue verde rápido.',
      'El fosfato diamónico (DAP) es lo mejor para el arranque.',
    ]) {
      const out = guardSyntheticAgrochemical(llmFail);
      expect(out.modified, llmFail).toBe(true);
    }
  });

  it('NO bloquea biopreparados/abonos orgánicos legítimos (compost, bocashi, biol, humus)', () => {
    const ok =
      'Para nutrir tus fresas usa compost bien maduro, bocashi y biol cada quince días; ' +
      'alimentan el suelo vivo sin acidificarlo.';
    const out = guardSyntheticAgrochemical(ok);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('NO marca un rango numérico que no es formulación NPK (ej. "siembra a 30-40 cm")', () => {
    const ok = 'Siembra las matas de fresa a 30-40 cm entre plantas para buena aireación.';
    const out = guardSyntheticAgrochemical(ok);
    // 30-40 es un par, no un triplete N-P-K → no dispara la regla de formulación.
    expect(out.modified).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// #352 — guard de dominio (off-domain)
// ──────────────────────────────────────────────────────────────────────────
describe('#352 guardOffDomain', () => {
  it('"explícame la teoría de cuerdas" → declina amable y redirige, SIN tool/grounding', () => {
    const llmFail =
      'La teoría de cuerdas postula que las partículas elementales son cuerdas vibrantes en un ' +
      'espacio de 11 dimensiones, unificando la relatividad general con la mecánica cuántica.';
    const out = guardOffDomain(llmFail, { userMessage: 'explícame la teoría de cuerdas' });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/off_domain/);
    // Declina y redirige al dominio agro, sin mencionar tool ni catálogo.
    expect(out.text).toMatch(/asistente de cultivos y agroecolog[ií]a/i);
    expect(out.text).not.toMatch(/get_normativa_ica|cat[aá]logo verificado|tool/i);
    // No repite la explicación de física.
    expect(out.text).not.toMatch(/cuerdas vibrantes|11 dimensiones/i);
  });

  it('declina relatividad y química orgánica/inorgánica', () => {
    for (const q of [
      'qué es la teoría de la relatividad',
      'diferencia entre química orgánica e inorgánica',
      'resuélveme una ecuación de segundo grado',
    ]) {
      const out = guardOffDomain('Una respuesta académica completa.', { userMessage: q });
      expect(out.modified, q).toBe(true);
      expect(out.text).toMatch(/asistente de cultivos/i);
    }
  });

  it('"qué siembro a 1923 msnm" → pasa (es agro, no toca)', () => {
    const ok = 'A 1923 msnm te van bien papa, fresa, arveja y hortalizas de clima templado.';
    const out = guardOffDomain(ok, { userMessage: 'qué siembro a 1923 msnm' });
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('NO declina temas agro que comparten vocabulario con química ("química del suelo", "pH")', () => {
    const ok = 'El pH del suelo afecta la disponibilidad de nutrientes; con cal subes el pH ácido.';
    const out = guardOffDomain(ok, { userMessage: 'cómo mejoro la química del suelo de mi finca' });
    expect(out.modified).toBe(false);
  });

  it('sin userMessage → no-op (no juzgamos el dominio)', () => {
    const out = guardOffDomain('Algo.', {});
    expect(out.modified).toBe(false);
  });

  it('idempotente: no re-dispara sobre su propio mensaje de declinación', () => {
    const first = guardOffDomain('física pura', { userMessage: 'teoría de cuerdas' });
    expect(first.modified).toBe(true);
    const second = guardOffDomain(first.text, { userMessage: 'teoría de cuerdas' });
    expect(second.modified).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// #347 — fuga de inventario en precio (clasificación de unidades de mercado)
// ──────────────────────────────────────────────────────────────────────────
describe('#347 classifyQueryIntent — unidades de comercialización = precio', () => {
  it('"a cómo está el bulto de papa" → precio', () => {
    expect(classifyQueryIntent('a cómo está el bulto de papa')).toBe('precio');
  });

  it('"cuánto vale la arroba de fresa" → precio', () => {
    expect(classifyQueryIntent('cuánto vale la arroba de fresa')).toBe('precio');
  });

  it('"a cómo la carga de papa" → precio', () => {
    expect(classifyQueryIntent('a cómo la carga de papa')).toBe('precio');
  });

  it('una query de precio (bulto) NO corre los guards de siembra ni filtra inventario', () => {
    // El modelo, en una consulta de precio, NO debe inyectar viabilidad/altitud.
    // applyOutputGuards con userMessage de precio salta los guards de siembra.
    const resp = 'No tengo el precio del bulto de papa; consulta SIPSA/DANE o la central de abastos.';
    const out = applyOutputGuards(resp, {
      userMessage: 'a cómo está el bulto de papa',
      fincaAltitud: 1923,
      resolvedEntities: [
        { kind: 'species', nombre_comun: 'papa', mentioned: 'papa', viabilidad: 'viable' },
      ],
    });
    // No se le anexa ninguna corrección de siembra.
    expect(out.modified).toBe(false);
    expect(out.text).toBe(resp);
  });

  it('"qué papa siembro" sigue siendo siembra (no la confunde con precio)', () => {
    expect(classifyQueryIntent('qué papa siembro en mi finca')).toBe('siembra');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// #348 — anti-diagnóstico-sin-foto
// ──────────────────────────────────────────────────────────────────────────
describe('#348 guardDiagnosisWithoutPhoto', () => {
  it('"manchas en el tomate" SIN foto + lista de patógenos → SUPRIME el latín y pide foto', () => {
    const llmFail =
      'Las manchas en el tomate pueden ser tizón tardío (Phytophthora infestans), alternaria o ' +
      'septoria. Para el tizón aplica preventivos; para alternaria mejora la aireación.';
    const out = guardDiagnosisWithoutPhoto(llmFail, {
      userMessage: 'tengo manchas en el tomate',
      hadVision: false,
    });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/diagnostico_sin_foto/);
    expect(out.text).toMatch(/foto|c[aá]mara/i);
    // SUPPRESS-AND-REPLACE: el patógeno/binomio NO sobrevive (cambio vs append).
    expect(out.text.toLowerCase()).not.toContain('phytophthora');
    expect(out.text.toLowerCase()).not.toContain('septoria');
    expect(out.text).not.toMatch(/tiz[oó]n tard[ií]o/i);
  });

  it('NO dispara cuando SÍ hubo foto (diagnóstico legítimo)', () => {
    const ok =
      'En tu foto se ve tizón tardío en las hojas bajas. Aplica caldo bordelés preventivo y retira focos.';
    const out = guardDiagnosisWithoutPhoto(ok, {
      userMessage: 'qué le pasa al tomate',
      hadVision: true,
    });
    expect(out.modified).toBe(false);
  });

  it('NO dispara si la respuesta NO nombra patógeno/binomio (solo pide foto / manejo cultural)', () => {
    const ok =
      'Para saber qué tiene tu tomate necesito ver una foto de las manchas. Mientras tanto, riega por ' +
      'la base y evita mojar las hojas.';
    const out = guardDiagnosisWithoutPhoto(ok, {
      userMessage: 'manchas en el tomate',
      hadVision: false,
    });
    expect(out.modified).toBe(false);
  });

  it('NO dispara en una pregunta que no es de diagnóstico de síntomas', () => {
    const resp = 'A 1923 msnm el tomate va bien bajo invernadero. Puede ser de cosecha en 4 meses.';
    const out = guardDiagnosisWithoutPhoto(resp, {
      userMessage: 'cuándo cosecho el tomate',
      hadVision: false,
    });
    expect(out.modified).toBe(false);
  });

  it('idempotente: no re-suprime sobre su propio reemplazo dos veces', () => {
    const llmFail =
      'Las manchas pueden ser tizón tardío o alternaria. Revisa la aireación del cultivo.';
    const ctx = { userMessage: 'manchas en el tomate', hadVision: false };
    const first = guardDiagnosisWithoutPhoto(llmFail, ctx);
    expect(first.modified).toBe(true);
    const second = guardDiagnosisWithoutPhoto(first.text, ctx);
    expect(second.modified).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Integración: applyOutputGuards con userMessage off-domain / diagnóstico
// ──────────────────────────────────────────────────────────────────────────
describe('applyOutputGuards (integración prod-harm)', () => {
  it('off-domain reemplaza la respuesta entera y no corre otros guards', () => {
    const llmFail =
      'La teoría de cuerdas unifica la relatividad con la mecánica cuántica en 11 dimensiones.';
    const out = applyOutputGuards(llmFail, {
      userMessage: 'explícame la teoría de cuerdas',
      fincaAltitud: 1923,
    });
    expect(out.modified).toBe(true);
    expect(out.reasons).toContain('off_domain');
    expect(out.text).toMatch(/asistente de cultivos/i);
  });

  it('papa-inviable-falso + siembra: la cadena corrige a viable', () => {
    const llmFail =
      'En tu finca a 1923 msnm la papa NO es viable; mejor siembra Daikon. La papa no vale la pena.';
    const out = applyOutputGuards(llmFail, {
      userMessage: 'qué papa siembro a 1923 msnm',
      fincaAltitud: 1923,
    });
    expect(out.modified).toBe(true);
    expect(out.reasons.some((r) => /falso_negativo/.test(r))).toBe(true);
    expect(out.text).toMatch(/S[ÍI] es viable/i);
  });
});
