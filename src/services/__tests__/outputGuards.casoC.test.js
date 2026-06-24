/**
 * outputGuards.casoC.test.js — GUARD CASO C: variedad/cultivar enumerado SIN
 * bloque EVIDENCIA AUTORITATIVA.
 *
 * Cuando la respuesta enumera variedades/cultivares de una planta SIN que el
 * prompt contuviera un bloque "=== EVIDENCIA AUTORITATIVA ===" respaldando
 * tales enumeraciones, SUPRIME el cuerpo y lo REEMPLAZA por la deflexión
 * honesta definida en CASO C:
 *   "El catálogo Chagra todavía no tiene un inventario de variedades de
 *    [planta] documentado todavía. ¿Quieres información general del cultivo,
 *    o prefieres registrar las variedades que tengas en tu finca?"
 *
 * Anti-FP: respuesta que YA niega tener info de variedades; userMessage que
 * ya listaba variedades (eco); respuesta sin enumeración de variedades.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardVarietyWithoutEvidence,
  applyOutputGuards,
  resetOutputGuardTelemetry,
  getOutputGuardTelemetry,
} from '../outputGuards.js';

const CASO_C_REPLACEMENT_MARKER = /no tiene un inventario de variedades de/i;
const CASO_C_REASON_MARKER = /variedad_sin_evidencia/i;

beforeEach(() => {
  resetOutputGuardTelemetry();
});

describe('guardVarietyWithoutEvidence — CASO C (variedad/cultivar enumerado sin EVIDENCIA)', () => {
  it('CASO BENCH: "las variedades de café son: Castillo, Colombia, Caturra" → suprime y reemplaza', () => {
    const llm =
      'Las variedades de café son: Castillo, Colombia, Caturra, Típica y Borbón. ' +
      'Cada una tiene características diferentes de resistencia a la roya y calidad de taza.';
    const out = guardVarietyWithoutEvidence(llm);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(CASO_C_REASON_MARKER);
    expect(out.text).toMatch(CASO_C_REPLACEMENT_MARKER);
    expect(out.text).not.toMatch(/castillo|colombia|caturra|típica|borbón/i);
  });

  it('VARIANTE: "el café tiene 3 variedades" + enumeración', () => {
    const llm =
      'El café tiene 3 variedades principales: Castillo, Colombia y Caturra. ' +
      'Son las más sembradas en Colombia por su resistencia a la roya.';
    const out = guardVarietyWithoutEvidence(llm);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(CASO_C_REPLACEMENT_MARKER);
    expect(out.text).toMatch(/cafe/i);
  });

  it('VARIANTE: "existen 5 variedades de papa" + nombres', () => {
    const llm =
      'Existen 5 variedades de papa en Colombia: Pastusa, Criolla, Sabanera, Diacol Capiro y Parda Pastusa.';
    const out = guardVarietyWithoutEvidence(llm);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(CASO_C_REPLACEMENT_MARKER);
    expect(out.text).toMatch(/papa/i);
  });

  it('VARIANTE: "principales variedades de maíz son" + nombres', () => {
    const llm =
      'Las principales variedades de maíz son: Capio, Porva, Cariaco, Amagaceño y Chococito.';
    const out = guardVarietyWithoutEvidence(llm);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(CASO_C_REPLACEMENT_MARKER);
    expect(out.text).toMatch(/ma[ií]z/i);
  });

  it('VARIANTE: "cultivares de frijol incluyen" + nombres', () => {
    const llm =
      'Los cultivares de frijol incluyen Cargamanto, Bolo Radical y Calima, ' +
      'cada uno con diferente adaptación a pisos térmicos.';
    const out = guardVarietyWithoutEvidence(llm);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(CASO_C_REPLACEMENT_MARKER);
    expect(out.text).toContain('frijol');
  });

  it('VARIANTE: "el café tiene 3 variedades" sin enumeración directa también dispara', () => {
    const llm =
      'El café tiene 3 variedades: la Castillo es resistente a roya, ' +
      'la Colombia tiene buena taza y la Caturra es precoz.';
    const out = guardVarietyWithoutEvidence(llm);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(CASO_C_REPLACEMENT_MARKER);
  });

  it('extrae nombre compuesto "frijol cargamanto" con pattern tiene+N', () => {
    // Pattern 3 "<PLANT> tiene N variedades" captura dos palabras
    const llm =
      'El frijol cargamanto tiene 3 variedades: rojo, negro y blanco.';
    const out = guardVarietyWithoutEvidence(llm);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(CASO_C_REPLACEMENT_MARKER);
    expect(out.text).toMatch(/frijol cargamanto/i);
  });

  it('telemetría: registra el gatillo del guard', () => {
    const llm = 'Las variedades de café son: Castillo, Colombia, Caturra.';
    guardVarietyWithoutEvidence(llm);
    const tel = getOutputGuardTelemetry();
    expect(tel.variety_without_evidence).toBeGreaterThanOrEqual(1);
  });

  // ── CONTROLES anti-falso-positivo ───────────────────────────────────

  it('CONTROL: respuesta que YA niega tener info de variedades NO dispara', () => {
    const llm =
      'No tengo información sobre las variedades de café documentadas en el catálogo. ' +
      'Chagra no registra variedades por especie todavía.';
    const out = guardVarietyWithoutEvidence(llm);
    expect(out.modified).toBe(false);
  });

  it('CONTROL: respuesta que usa "no tenemos registro de variedades" NO dispara', () => {
    const llm =
      'En el catálogo Chagra no tenemos un registro de las variedades de papa ' +
      'todavía. ¿Quieres información general del cultivo?';
    const out = guardVarietyWithoutEvidence(llm);
    expect(out.modified).toBe(false);
  });

  it('CONTROL: respuesta normal sin enumeración de variedades NO dispara', () => {
    const llm =
      'El café (Coffea arabica) se da muy bien en clima templado entre 1.200 y 1.800 msnm. ' +
      'Necesita buen drenaje y sombra moderada.';
    const out = guardVarietyWithoutEvidence(llm);
    expect(out.modified).toBe(false);
  });

  it('CONTROL: userMessage ya enumera variedades → respuesta puede repetirlas (eco)', () => {
    const userMsg = '¿Qué tal la papa criolla, pastusa y sabanera para mi finca?';
    const llm =
      'La papa criolla, pastusa y sabanera se dan bien en clima frío. ' +
      'La criolla es precoz y la pastusa rinde más.';
    const out = guardVarietyWithoutEvidence(llm, { userMessage: userMsg });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: "el café tiene varias variedades" sin número ni enumeración NO dispara', () => {
    const llm =
      'El café tiene varias variedades, pero no tengo ese dato en el catálogo.';
    const out = guardVarietyWithoutEvidence(llm);
    expect(out.modified).toBe(false);
  });

  it('CONTROL: idempotente — no re-dispara sobre su propio reemplazo', () => {
    const llm = 'Las variedades de café son: Castillo, Colombia, Caturra.';
    const once = guardVarietyWithoutEvidence(llm);
    expect(once.modified).toBe(true);
    const twice = guardVarietyWithoutEvidence(once.text);
    expect(twice.modified).toBe(false);
    expect(twice.text).toBe(once.text);
  });

  it('CONTROL: texto vacío no dispara', () => {
    const out = guardVarietyWithoutEvidence('');
    expect(out.modified).toBe(false);
    expect(out.text).toBe('');
  });

  it('CONTROL: consulta de precio pasa sin tocar', () => {
    const llm =
      'El café variedad Castillo se paga a $2.300 la carga en la plaza de mercado.';
    const out = guardVarietyWithoutEvidence(llm);
    // "café variedad Castillo" no es enumeración → no dispara
    expect(out.modified).toBe(false);
  });
});

describe('guardVarietyWithoutEvidence via applyOutputGuards — integración', () => {
  it('aplica el guard via applyOutputGuards en modo siembra', () => {
    const resp =
      'Las variedades de café son: Castillo, Colombia y Caturra. Son resistentes a la roya.';
    const out = applyOutputGuards(resp, {
      userMessage: '¿Qué variedades de café recomiendas?',
    });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(CASO_C_REPLACEMENT_MARKER);
    // guardInventedVariety NO debe disparar (no hay clima opuesto)
    expect(out.text).not.toMatch(/Bactris gasipaes/);
  });

  it('no interfiere con guardInventedVariety (BORDE-007) cuando ese es más específico', () => {
    const resp =
      'Existe una variedad de chontaduro de clima frío que se da hasta 2.600 m, ' +
      'es la accesión Pacífico tolerante al frío.';
    const out = applyOutputGuards(resp, {
      userMessage: 'Tengo semilla de chontaduro de clima frío, ¿la subo a 2.600 m?',
    });
    // Debe disparar guardInventedVariety (BORDE-007), no CASO C
    expect(out.modified).toBe(true);
    expect(out.text).toContain('Bactris gasipaes');
  });
});
