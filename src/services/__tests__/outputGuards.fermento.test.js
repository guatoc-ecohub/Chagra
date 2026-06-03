/**
 * outputGuards.fermento.test.js — DR-FOOD-3, guard de salida de fermentos
 * (capa 2 de defensa-en-profundidad del PWA). SAFETY-CRITICAL · FAIL-SAFE.
 *
 * Ground-truth: Chagra-strategy/deepresearch/DR-FOOD-3-CONSOLIDADO-2026-06-02.md
 * §3.3 (veto de claims de salud — catálogo canónico de frase segura).
 *
 * Cubre:
 *   (a) veto-total / refusal lo hace el sidecar; ACÁ el guard de salida redirige
 *       claims de salud sobre fermentos a la frase segura del catálogo.
 *   (b) claim de salud sobre fermento → redirigido (alimento ≠ medicamento).
 *   (c) query/respuesta NO-fermento NO se ve afectada (anti-falso-positivo).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardFermentoHealthClaim,
  guardFermentoRecipeSafety,
  applyOutputGuards,
  getOutputGuardTelemetry,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

const SAFE_PHRASE = 'un fermento es un alimento, no un medicamento';

describe('guardFermentoHealthClaim', () => {
  it('(b) "la kombucha cura la gastritis" → redirige a la frase segura', () => {
    const llm =
      'Sí, la kombucha cura la gastritis y limpia el hígado; tómala en ayunas todos los días.';
    const r = guardFermentoHealthClaim(llm, { userMessage: '¿la kombucha cura la gastritis?' });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toContain(SAFE_PHRASE);
    expect(r.text.toLowerCase()).toContain('puesto de salud');
    expect(r.reason).toMatch(/claim_salud_fermento/);
  });

  it('(b2) "el guarapo cura el cáncer" → redirigido', () => {
    const r = guardFermentoHealthClaim('El guarapo cura el cáncer si lo tomas a diario.', {
      userMessage: 'sirve el guarapo para el cancer',
    });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toContain(SAFE_PHRASE);
  });

  it('(b3) "este fermento desintoxica el hígado" → redirigido', () => {
    const r = guardFermentoHealthClaim('Este fermento desintoxica el hígado y depura la sangre.', {
      userMessage: 'el masato desintoxica?',
    });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toContain(SAFE_PHRASE);
  });

  it('(b4) gate por la PREGUNTA: respuesta sin término de fermento pero pregunta de kombucha', () => {
    // El LLM responde sin nombrar el fermento pero afirma el claim; el gate de
    // intención lo cubre por el userMessage.
    const r = guardFermentoHealthClaim('Sí, cura la gastritis sin problema.', {
      userMessage: '¿la kombucha cura la gastritis?',
    });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toContain(SAFE_PHRASE);
  });

  it('(c) ANTI-FALSO-POSITIVO: claim de salud SIN fermento en juego NO dispara', () => {
    // "previene" sobre una práctica agronómica, no un fermento.
    const r = guardFermentoHealthClaim(
      'Rotar el cultivo previene plagas y enfermedades del suelo.',
      { userMessage: 'cómo evito plagas en el maíz' },
    );
    expect(r.modified).toBe(false);
    expect(r.text).toContain('Rotar el cultivo');
  });

  it('(c2) ANTI-FALSO-POSITIVO: fermento mencionado SIN claim de salud NO dispara', () => {
    const r = guardFermentoHealthClaim(
      'El chucrut se hace con repollo y sal al 2%; déjalo fermentar tapado.',
      { userMessage: 'cómo hago chucrut' },
    );
    expect(r.modified).toBe(false);
    expect(r.text).toContain('chucrut');
  });

  it('(c3) ANTI-FALSO-POSITIVO: query de precio NO-fermento intacta', () => {
    const r = guardFermentoHealthClaim('La papa está a 80 mil el bulto en la plaza.', {
      userMessage: '¿a cómo está la papa?',
    });
    expect(r.modified).toBe(false);
  });

  it('idempotente: no re-anexa la frase segura si ya está', () => {
    const ya =
      'La kombucha cura la gastritis.\n\nUna aclaración importante: un fermento es un alimento, no un medicamento. No cura nada.';
    const r = guardFermentoHealthClaim(ya, { userMessage: 'kombucha gastritis' });
    expect(r.modified).toBe(false);
  });

  it('texto vacío / no-string → no-op seguro', () => {
    expect(guardFermentoHealthClaim('', { userMessage: 'kombucha' }).modified).toBe(false);
    expect(guardFermentoHealthClaim(null, { userMessage: 'kombucha' }).modified).toBe(false);
  });

  it('cuenta telemetría al disparar', () => {
    guardFermentoHealthClaim('La chicha combate la anemia.', { userMessage: 'chicha anemia' });
    expect(getOutputGuardTelemetry().fermentoHealthClaim).toBe(1);
  });
});

describe('applyOutputGuards — integración guard de fermentos', () => {
  it('redirige un claim de salud sobre fermento dentro del pipeline completo', () => {
    const res = applyOutputGuards('La kombucha cura la gastritis, tómala en ayunas.', {
      userMessage: '¿la kombucha cura la gastritis?',
    });
    expect(res.modified).toBe(true);
    expect(res.text.toLowerCase()).toContain(SAFE_PHRASE);
    expect(res.reasons.some((r) => /claim_salud_fermento/.test(r))).toBe(true);
  });

  it('ANTI-FALSO-POSITIVO: respuesta agronómica normal pasa sin el bloque de fermentos', () => {
    const res = applyOutputGuards(
      'Para el maíz a 1800 msnm, siembra en abril y rota con frijol; eso previene plagas.',
      { userMessage: 'cuándo siembro maíz', fincaAltitud: 1800 },
    );
    expect(res.text.toLowerCase()).not.toContain(SAFE_PHRASE);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// guardFermentoRecipeSafety — DR-FOOD-3, capa 2b · #345
//
// Bug prod 2026-06-03: "cómo preparo kombucha" devolvía la receta CRUDA sin el
// caveat de inocuidad/INVIMA. El prefilter del sidecar SÍ arma el bloque
// disclaimer_fuerte y SÍ se inyecta al system prompt, pero el LLM lo ignora bajo
// carga ("grounding muerto"). guardFermentoHealthClaim NO cubre el caso: una
// receta limpia no trae claim de salud, así que pasaba sin contrapeso. Este
// guard determinístico antepone el caveat institucional a CUALQUIER receta de
// fermento, sin depender del LLM.
// ──────────────────────────────────────────────────────────────────────────

const CAVEAT_MARK = 'antes de preparar este fermento';

describe('guardFermentoRecipeSafety', () => {
  it('(#345) "cómo preparo kombucha" + receta del LLM → antepone el caveat institucional', () => {
    const llm =
      'Para hacer kombucha necesitas té negro, azúcar y un SCOBY. Prepara 1L de té dulce, ' +
      'añade el SCOBY y deja fermentar 7 a 10 días tapado con una tela. Listo.';
    const r = guardFermentoRecipeSafety(llm, { userMessage: 'cómo preparo kombucha' });
    expect(r.modified).toBe(true);
    // El caveat LIDERA (prepend), para que se lea antes que la receta.
    expect(r.text.toLowerCase().indexOf(CAVEAT_MARK)).toBeLessThan(
      r.text.toLowerCase().indexOf('para hacer kombucha'),
    );
    // Contenido de inocuidad institucional.
    expect(r.text.toLowerCase()).toContain('invima');
    expect(r.text.toLowerCase()).toContain('higiene');
    expect(r.text.toLowerCase()).toContain('puesto de salud');
    expect(r.reason).toMatch(/receta_fermento/);
  });

  it('(#345) autoridad SIEMPRE institucional, NUNCA un nombre de persona', () => {
    const r = guardFermentoRecipeSafety('Receta de masato: cocina el maíz, agrega panela…', {
      userMessage: 'receta de masato paso a paso',
    });
    expect(r.modified).toBe(true);
    // Marco institucional presente.
    expect(r.text.toLowerCase()).toMatch(/invima|res(\.|olución)? ?810|inocuidad/);
    // Ningún nombre propio del operador / personas (anti-leak).
    expect(r.text.toLowerCase()).not.toMatch(/miguel|kortux|lili|diego/);
  });

  it('(#345) menciona poblaciones que deben abstenerse y el riesgo de contaminación/pH', () => {
    const r = guardFermentoRecipeSafety('Para el chucrut pica el repollo con sal al 2%…', {
      userMessage: 'cómo hago chucrut en casa',
    });
    expect(r.modified).toBe(true);
    const t = r.text.toLowerCase();
    expect(t).toMatch(/embarazad|gestant|niñ|defensas|inmun/);
    expect(t).toMatch(/contamin|higiene|ph/);
  });

  it('gate por la PREGUNTA: pide receta de fermento aunque el texto del LLM sea escueto', () => {
    const r = guardFermentoRecipeSafety('Mezcla los ingredientes y deja reposar.', {
      userMessage: 'dame la receta del guarapo de caña',
    });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toContain(CAVEAT_MARK);
  });

  it('(c) ANTI-FALSO-POSITIVO: fermento mencionado SIN intención de receta NO dispara', () => {
    const r = guardFermentoRecipeSafety(
      'El masato es una bebida tradicional del Pacífico colombiano.',
      { userMessage: 'qué es el masato' },
    );
    expect(r.modified).toBe(false);
    expect(r.text).toContain('El masato es una bebida');
  });

  it('(c2) ANTI-FALSO-POSITIVO: receta NO-fermento (sopa) intacta', () => {
    const r = guardFermentoRecipeSafety(
      'Para el ajiaco: cocina las papas con pollo, mazorca y guascas.',
      { userMessage: 'cómo preparo ajiaco' },
    );
    expect(r.modified).toBe(false);
    expect(r.text).toContain('ajiaco');
  });

  it('(c3) ANTI-FALSO-POSITIVO: query de precio NO-fermento intacta', () => {
    const r = guardFermentoRecipeSafety('La papa está a 80 mil el bulto.', {
      userMessage: '¿a cómo está la papa?',
    });
    expect(r.modified).toBe(false);
  });

  it('idempotente: no re-antepone el caveat si ya está', () => {
    const llm =
      'Para hacer kombucha necesitas té, azúcar y SCOBY; fermenta 7 días.';
    const r1 = guardFermentoRecipeSafety(llm, { userMessage: 'cómo preparo kombucha' });
    expect(r1.modified).toBe(true);
    const r2 = guardFermentoRecipeSafety(r1.text, { userMessage: 'cómo preparo kombucha' });
    expect(r2.modified).toBe(false);
  });

  it('texto vacío / no-string → no-op seguro', () => {
    expect(guardFermentoRecipeSafety('', { userMessage: 'kombucha receta' }).modified).toBe(false);
    expect(guardFermentoRecipeSafety(null, { userMessage: 'kombucha receta' }).modified).toBe(false);
  });

  it('cuenta telemetría al disparar', () => {
    guardFermentoRecipeSafety('Receta de chicha: maíz, panela, fermenta…', {
      userMessage: 'cómo se hace la chicha',
    });
    expect(getOutputGuardTelemetry().fermentoRecipeSafety).toBe(1);
  });
});

describe('applyOutputGuards — integración receta de fermento (#345)', () => {
  it('antepone el caveat de inocuidad a una receta de kombucha en el pipeline completo', () => {
    const res = applyOutputGuards(
      'Para hacer kombucha: té negro, azúcar, SCOBY; fermenta 7-10 días tapado.',
      { userMessage: 'cómo preparo kombucha' },
    );
    expect(res.modified).toBe(true);
    expect(res.text.toLowerCase()).toContain('invima');
    expect(res.text.toLowerCase()).toContain(CAVEAT_MARK);
    expect(res.reasons.some((r) => /receta_fermento/.test(r))).toBe(true);
  });

  it('ANTI-FALSO-POSITIVO: receta agronómica (biopreparado) no dispara el caveat de fermento', () => {
    const res = applyOutputGuards(
      'Para el caldo bordelés: disuelve cal y sulfato de cobre, aplica en preventivo.',
      { userMessage: 'cómo preparo caldo bordelés' },
    );
    expect(res.text.toLowerCase()).not.toContain(CAVEAT_MARK);
  });
});

