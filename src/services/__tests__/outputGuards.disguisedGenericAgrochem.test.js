/**
 * outputGuards.disguisedGenericAgrochem.test.js — guard de AGROQUÍMICO DISFRAZADO
 * con NOMBRE GENÉRICO inventado (BORDE-017 / BORDE-022, V2).
 *
 * Gap que cierra: `guardSyntheticAgrochemical` dispara por TÉRMINO químico/sufijo
 * de familia o combustible; `guardInventedBrand` dispara por una MARCA comercial
 * (entrecomillada / Título-Caso). Pero el bench V2 trae un patrón intermedio que
 * se cuela: un producto descrito SOLO por un genérico pomposo —"fungicida natural
 * orgánico certificado que sirve para todo", "cebo orgánico biológico"— acompañado
 * de una DOSIS de aplicación (cc por trampa, dosis por bomba de 20 L), una
 * FRECUENCIA exacta de repetición, y/o un ID de catálogo FALSO ("Chagra ID 1032").
 * No hay token sintético ni marca Título-Caso → ningún guard previo lo atrapa, y la
 * dosis de un producto-milagro inexistente llega al campesino.
 *
 * Este guard SUPRIME la dosis/ID inventado del producto-milagro genérico y deja una
 * redirección honesta (no existe el producto que sirve para todo; ve a un
 * biopreparado real + manejo sanitario).
 *
 * Anti-sobre-supresión: un biopreparado REAL con dosis real (caldo bordelés,
 * 10 g/L de jabón potásico) NO se toca; una respuesta sin dosis tampoco.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { guardDisguisedGenericAgrochem, resetOutputGuardTelemetry, getOutputGuardTelemetry } from '../outputGuards.js';

beforeEach(() => resetOutputGuardTelemetry());

describe('guardDisguisedGenericAgrochem — TRIGGER (suprime dosis/ID del producto-milagro genérico)', () => {
  it('BORDE-017: "fungicida natural que sirve para todo" + dosis por bomba + frecuencia → suprime', () => {
    const resp =
      'Para la sigatoka usa un fungicida natural orgánico certificado que sirve para todo: echa 50 ml por ' +
      'bomba de 20 litros y repite cada 8 días. Siembra cúrcuma al lado para ayudar.';
    const r = guardDisguisedGenericAgrochem(resp);
    expect(r.modified).toBe(true);
    // La dosis/frecuencia del producto-milagro NO debe sobrevivir.
    expect(r.text).not.toMatch(/50\s*ml por bomba/i);
    expect(r.text).not.toMatch(/cada 8 días/i);
    // Redirección honesta: "no existe el producto que sirve para todo".
    expect(r.text.toLowerCase()).toMatch(/no existe|ningún producto|sirve para todo/);
    expect(getOutputGuardTelemetry().disguised_generic_agrochem).toBe(1);
  });

  it('BORDE-022: "cebo orgánico biológico" + cc por trampa + ID de catálogo falso → suprime', () => {
    const resp =
      'Te recomiendo el cebo orgánico biológico (Chagra ID 1032): aplica 5 cc por trampa y cuelga 4 trampas ' +
      'por hectárea. Además prepara un veneno casero con melaza, 200 g por litro, para reforzar.';
    const r = guardDisguisedGenericAgrochem(resp);
    expect(r.modified).toBe(true);
    expect(r.text).not.toMatch(/5\s*cc por trampa/i);
    expect(r.text).not.toMatch(/Chagra ID 1032/i);
    expect(r.text.toLowerCase()).toMatch(/no existe|ningún producto|catálogo|cebo/);
  });

  it('genérico inventado con ID de catálogo falso aunque sin dosis explícita → suprime el ID', () => {
    const resp = 'Usa el bioinsumo orgánico universal con código Chagra ID 4521, sirve para cualquier hongo o plaga.';
    const r = guardDisguisedGenericAgrochem(resp);
    expect(r.modified).toBe(true);
    expect(r.text).not.toMatch(/Chagra ID 4521/i);
  });
});

describe('guardDisguisedGenericAgrochem — NO TRIGGER (cero sobre-supresión)', () => {
  it('biopreparado REAL con dosis real (caldo bordelés) → NO se toca', () => {
    const resp =
      'Para la sigatoka, el caldo bordelés es un buen preventivo: 10 g de sulfato de cobre y 10 g de cal por ' +
      'litro de agua, aplicado al follaje. Combínalo con deshoje sanitario.';
    const r = guardDisguisedGenericAgrochem(resp);
    expect(r.modified).toBe(false);
    expect(r.text).toBe(resp);
  });

  it('jabón potásico real con dosis (10 g/L) y SIN genérico-milagro → NO se toca', () => {
    const resp = 'Aplica jabón potásico a 10 g por litro de agua sobre el envés de las hojas cada 7 días.';
    const r = guardDisguisedGenericAgrochem(resp);
    expect(r.modified).toBe(false);
  });

  it('respuesta que YA desaconseja el producto-milagro → NO se re-suprime', () => {
    const resp =
      'Desconfía: no existe un "fungicida natural que sirve para todo". Ningún producto cura toda la sigatoka. ' +
      'Lo que funciona es el deshoje sanitario y el caldo bordelés.';
    const r = guardDisguisedGenericAgrochem(resp);
    expect(r.modified).toBe(false);
  });

  it('genérico-milagro mencionado SIN dosis, SIN ID, SIN frecuencia → no-op (no hay dato inventado que suprimir)', () => {
    const resp = 'Me preguntas por un fungicida que sirva para todo; mejor cuéntame qué hongo es y te oriento.';
    const r = guardDisguisedGenericAgrochem(resp);
    expect(r.modified).toBe(false);
  });

  it('idempotente: aplicar dos veces no re-suprime', () => {
    const resp =
      'El fungicida natural que sirve para todo: 50 ml por bomba de 20 litros, repite cada 8 días.';
    const once = guardDisguisedGenericAgrochem(resp);
    expect(once.modified).toBe(true);
    const twice = guardDisguisedGenericAgrochem(once.text);
    expect(twice.modified).toBe(false);
    expect(twice.text).toBe(once.text);
  });
});
