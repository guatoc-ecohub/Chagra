/**
 * outputGuards.embeddedFalsePremise.test.js — GR-5: guard de PREMISA FALSA
 * EMBEBIDA por PISO TÉRMICO (eje premisa_falsa del bench borde-alucinación).
 *
 * Gap que cierra: `guardHardAltitudeViability` exige una ALTITUD NUMÉRICA en el
 * mensaje y una banda hardcodeada; NO cubre la premisa EMBEBIDA donde el usuario
 * da por hecho un cultivo prosperando en un piso térmico TEXTUAL ("el café que
 * sembré a nivel del mar", "mi mango del páramo") incompatible con su RANGO del
 * grounding (altitud_min/altitud_max de la entidad resuelta).
 *
 * El guard, grounding-driven, detecta la incompatibilidad y, si la respuesta la
 * trata como cierta (le da cosecha/cuidados), SUPRIME-Y-REEMPLAZA por una
 * corrección amable (español de Colombia, tú) + el rango real + orientación.
 *
 * Anti-sobre-corrección: piso COMPATIBLE, especie SIN rango en el grounding,
 * mensaje SIN frase de piso, o respuesta que YA corrige → NO se toca.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardEmbeddedAltitudeFalsePremise,
  applyOutputGuards,
  resetOutputGuardTelemetry,
  getOutputGuardTelemetry,
} from '../outputGuards.js';

// Grounding fixtures (como vienen del sidecar resolve-entities / AGE).
const CAFE = {
  kind: 'species',
  mentioned: 'café',
  nombre_comun: 'café',
  nombre_cientifico: 'Coffea arabica',
  altitud_min: 1000,
  altitud_max: 2000,
  alternativas_viables: ['coco', 'cacao', 'plátano'],
};
const MANGO = {
  kind: 'species',
  mentioned: 'mango',
  nombre_comun: 'mango',
  nombre_cientifico: 'Mangifera indica',
  altitud_min: 0,
  altitud_max: 1000,
  alternativas_viables: ['mora de Castilla', 'curuba'],
};

beforeEach(() => resetOutputGuardTelemetry());

describe('guardEmbeddedAltitudeFalsePremise — TRIGGER (suprime y corrige con tacto)', () => {
  it('café "a nivel del mar" + respuesta con cosecha → corrige + rango real + alternativas', () => {
    const user = '¿cuándo cosecho el café que sembré a nivel del mar?';
    const resp =
      'Tu café a nivel del mar lo cosechas entre los 8 y 11 meses; abónalo cada mes y riégalo bien ' +
      'para que la fructificación sea pareja.';
    const r = guardEmbeddedAltitudeFalsePremise(resp, { userMessage: user, resolvedEntities: [CAFE] });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toMatch(/no prospera/);
    expect(r.text.toLowerCase()).toMatch(/nivel del mar/);
    expect(r.text).toMatch(/1000.*2000|1000–2000/);
    // amable, sin humillar (tú colombiano, sin voseo)
    expect(r.text.toLowerCase()).toMatch(/con cariño te corrijo/);
    expect(r.text).not.toMatch(/\b(te referís|tenés|podés|querés|elegí)\b/);
    // orienta con alternativas del grounding (no inventadas)
    expect(r.text.toLowerCase()).toMatch(/coco|cacao|plátano|platano/);
    // no debe sobrevivir el cuidado complaciente del cultivo inviable
    expect(r.text).not.toMatch(/cosechas entre los 8 y 11 meses/i);
    expect(getOutputGuardTelemetry().embedded_altitude_false_premise).toBe(1);
  });

  it('mango "del páramo" + respuesta con cuidados → corrige (demasiado alto/frío)', () => {
    const user = '¿cómo cuido mi mango del páramo para que dé buena fruta?';
    const resp =
      'Para tu mango del páramo, podá las ramas bajas, abónalo con compost y controla la antracnosis; ' +
      'así produce fruta dulce.';
    const r = guardEmbeddedAltitudeFalsePremise(resp, { userMessage: user, resolvedEntities: [MANGO] });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toMatch(/no prospera/);
    expect(r.text.toLowerCase()).toMatch(/páramo|paramo/);
    expect(r.text.toLowerCase()).toMatch(/mango/);
    expect(r.text).toMatch(/0.*1000|0–1000/);
  });
});

describe('guardEmbeddedAltitudeFalsePremise — NO TRIGGER (cero sobre-corrección)', () => {
  it('piso COMPATIBLE (café "en clima templado") → NO se toca', () => {
    const user = '¿cómo cuido el café que tengo en clima templado?';
    const resp = 'Para tu café en clima templado, abónalo cada mes y haz poda sanitaria; vas muy bien.';
    const r = guardEmbeddedAltitudeFalsePremise(resp, { userMessage: user, resolvedEntities: [CAFE] });
    expect(r.modified).toBe(false);
  });

  it('especie SIN rango en el grounding → NEUTRAL (no inventa incompatibilidad)', () => {
    const user = '¿cuándo cosecho el café que sembré a nivel del mar?';
    const resp = 'Tu café lo cosechas hacia los 9 meses; abónalo y riégalo.';
    const sinRango = { kind: 'species', mentioned: 'café', nombre_comun: 'café' }; // sin altitud_min/max
    const r = guardEmbeddedAltitudeFalsePremise(resp, { userMessage: user, resolvedEntities: [sinRango] });
    expect(r.modified).toBe(false);
  });

  it('mensaje SIN frase de piso → no-op (no hay premisa de clima)', () => {
    const user = '¿cuándo cosecho el café que sembré?';
    const resp = 'Tu café lo cosechas hacia los 9 meses; abónalo y riégalo bien.';
    const r = guardEmbeddedAltitudeFalsePremise(resp, { userMessage: user, resolvedEntities: [CAFE] });
    expect(r.modified).toBe(false);
  });

  it('la respuesta YA corrige la incompatibilidad → no doble-corrección', () => {
    const user = '¿cuándo cosecho el café que sembré a nivel del mar?';
    const resp =
      'Ojo: el café no prospera a nivel del mar, necesita clima templado de altura; mejor revisemos ' +
      'qué cultivos sí se dan en la costa.';
    const r = guardEmbeddedAltitudeFalsePremise(resp, { userMessage: user, resolvedEntities: [CAFE] });
    expect(r.modified).toBe(false);
  });

  it('sin grounding (entidades vacías) → no-op (neutral, no inventa)', () => {
    const user = 'el café que sembré a nivel del mar, ¿cómo lo cuido?';
    const resp = 'Cuida tu café con abono y riego frecuente.';
    const r = guardEmbeddedAltitudeFalsePremise(resp, { userMessage: user, resolvedEntities: [] });
    expect(r.modified).toBe(false);
  });

  it('idempotente: no re-suprime su propio reemplazo', () => {
    const user = '¿cuándo cosecho el café que sembré a nivel del mar?';
    const resp =
      'Tu café a nivel del mar lo cosechas entre los 8 y 11 meses; abónalo y riégalo bien.';
    const once = guardEmbeddedAltitudeFalsePremise(resp, { userMessage: user, resolvedEntities: [CAFE] });
    expect(once.modified).toBe(true);
    const twice = guardEmbeddedAltitudeFalsePremise(once.text, {
      userMessage: user,
      resolvedEntities: [CAFE],
    });
    expect(twice.modified).toBe(false);
  });
});

describe('applyOutputGuards — premisa falsa embebida integrada en la cadena', () => {
  it('café a nivel del mar (embebido) pasa por applyOutputGuards y se corrige', () => {
    const user = '¿cuándo cosecho el café que sembré a nivel del mar?';
    const resp =
      'Tu café a nivel del mar lo cosechas entre los 8 y 11 meses; abónalo cada mes y riégalo bien.';
    const out = applyOutputGuards(resp, { userMessage: user, resolvedEntities: [CAFE] });
    expect(out.modified).toBe(true);
    expect(out.text.toLowerCase()).toMatch(/no prospera/);
    expect(out.reasons.join(' ')).toMatch(/premisa_falsa_embebida/);
  });

  it('consulta de PRECIO no dispara el guard de siembra (premisa embebida)', () => {
    const user = '¿a cómo está el café de tierra caliente en el mercado?';
    const resp = 'El café de tierra caliente se cosecha y se vende bien; abónalo para más producción.';
    const out = applyOutputGuards(resp, { userMessage: user, resolvedEntities: [CAFE] });
    expect(out.reasons.join(' ')).not.toMatch(/premisa_falsa_embebida/);
  });
});
