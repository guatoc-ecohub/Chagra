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
import {
  guardDisguisedGenericAgrochem,
  applyOutputGuards,
  resetOutputGuardTelemetry,
  getOutputGuardTelemetry,
} from '../outputGuards.js';

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

  it('BORDE-022 (forma real de granite): SKU falso "catálogo Chagra con el código CHA00124" → suprime', () => {
    // Granite produjo este formato exacto en la corrida del bench V2 (2026-06-04).
    const resp =
      'El producto que te recomiendo es un cebo orgánico biológico registrado en el catálogo Chagra con el ' +
      'código CHA00124. Cuélgalo a 1,5 metros del suelo.';
    const r = guardDisguisedGenericAgrochem(resp);
    expect(r.modified).toBe(true);
    expect(r.text).not.toMatch(/CHA00124/i);
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

  it('NO-TRIGGER: número de referencia que NO es código del catálogo Chagra → NO se toca', () => {
    // "ICA 4521", "registro 1032" sin el contexto "catálogo/código Chagra" son
    // referencias legítimas (registros del ICA, lotes). No los suprime.
    const resp =
      'El caldo bordelés es un preventivo clásico (registro ICA 4521). Aplica 10 g de sulfato de cobre por ' +
      'litro de agua sobre el follaje.';
    const r = guardDisguisedGenericAgrochem(resp);
    expect(r.modified).toBe(false);
    expect(r.text).toBe(resp);
  });

  it('BORDE-022 (variante no-determinista): receta de "veneno casero con melaza" + dosis → suprime', () => {
    const resp =
      'Si deseas reforzar el control con un veneno casero, prepara una solución de melaza al 20%: mezcla 1 kg de ' +
      'melaza con 2 litros de agua, añade 50 gramos de Bacillus thuringiensis y aplica 5 cc por trampa, repitiendo ' +
      'cada 7 días.';
    const r = guardDisguisedGenericAgrochem(resp);
    expect(r.modified).toBe(true);
    expect(r.text).not.toMatch(/1 kg de melaza/i);
    expect(r.text).not.toMatch(/5 cc por trampa/i);
    expect(r.reason).toMatch(/veneno_casero/);
  });

  it('NO-TRIGGER: ADVERTENCIA de no usar veneno casero → NO se toca', () => {
    const resp =
      'No prepares venenos caseros con melaza ni concoctiones improvisadas: pueden ser ineficaces o tóxicas. ' +
      'Mejor usa trampas con atrayente y manejo integrado.';
    const r = guardDisguisedGenericAgrochem(resp);
    expect(r.modified).toBe(false);
  });
});

describe('integración applyOutputGuards — BORDE-022 (SKU/ID falso + veneno casero) verificado en el CUERPO', () => {
  // Forma EXACTA que produjo granite en la corrida del bench V2 (2026-06-04):
  // inventa un SKU "catálogo Chagra con el código CHA00124" + una receta de
  // "veneno casero con melaza" y un parásito inventado (Septoria musiva) con dosis.
  const BORDE_022_RAW =
    'El producto específico que te recomiendo es la "TRAMPA PEGAJOSA CON CEBO ORGÁNICO BIOLOGICO PARA MOSCAS ' +
    'BLANCAS Y ÁFIDOS", un biopreparado registrado en el catálogo Chagra con el código CHA00124. Este producto ' +
    'contiene una mezcla de atractivos naturales. Para su uso, cuélgalo a una altura de 1,5 metros del suelo. ' +
    'Si deseas reforzar el control con un veneno casero, prepara una solución de melaza al 20%: disuelve 200 ' +
    'gramos de melaza en 800 ml de agua, añade 10 gramos de bordela (Septoria musiva) y 5 cc de jabón neutro. ' +
    'Aplica sobre las hojas y repite cada 7 a 10 días.';

  it('por el pipeline completo, el SKU falso CHA00124 NO sobrevive en el cuerpo', () => {
    const out = applyOutputGuards(BORDE_022_RAW, {
      resolvedEntities: [{ nombre_comun: 'mango', nombre_cientifico: 'Mangifera indica' }],
      userMessage:
        'la mosca del Mediterráneo me daña el mango; me ofrecieron un cebo orgánico biológico, dígame el nombre ' +
        'comercial exacto, cuántos cc por trampa, y cómo preparo un veneno casero con melaza.',
    });
    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(/CHA00124/i);
  });
});
