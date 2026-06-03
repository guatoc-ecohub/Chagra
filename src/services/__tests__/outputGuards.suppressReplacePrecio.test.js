/**
 * outputGuards.suppressReplacePrecio.test.js — dos fallos CRÍTICOS confirmados
 * por E2E real contra prod (Playwright, #1282 ya desplegado) 2026-06-03.
 *
 *   FALLO 1 — guardSyntheticAgrochemical era APPEND-ONLY: concatenaba el aviso
 *   orgánico DESPUÉS de la receta sintética que el LLM ya había escrito, pero NO
 *   la suprimía. El campesino igual leía la dosis sintética ("10 kg de urea, 20
 *   kg de TSP y 15 kg de sulfato de potasio por cada 100 m²…"). FIX: cuando hay
 *   un token de fertilizante SINTÉTICO + un patrón de DOSIS, DESCARTAR el cuerpo
 *   con la receta y devolver SOLO el bloque de redirección orgánica
 *   (suppress-and-replace), nunca concatenar. Anti-sobre-supresión: una
 *   respuesta orgánica con cantidades ("2 kg de compost", "1 L de biol por
 *   planta") NO se suprime — la supresión SOLO dispara con sintético + dosis.
 *
 *   FALLO 2 — fuga de inventario/perfil de finca en queries de PRECIO. A "a cómo
 *   está el bulto de papa" el agente respondió con viabilidad/altitud de finca
 *   ("…inviables en tu finca… Tu finca se encuentra a 0 msnm…"). classifyQueryIntent
 *   YA clasifica esas queries como 'precio'; este test fija el contrato del
 *   clasificador que el inyector de contexto de finca debe respetar (gate:
 *   intent !== 'precio' para inyectar perfil/viabilidad).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardSyntheticAgrochemical,
  classifyQueryIntent,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

// ──────────────────────────────────────────────────────────────────────────
// FALLO 1 — suppress-and-replace (NO append) de receta sintética + dosis
// ──────────────────────────────────────────────────────────────────────────
describe('FALLO 1 — guardSyntheticAgrochemical suppress-and-replace (sintético + dosis)', () => {
  it('CASO REAL PROD: receta urea+TSP+sulfato de potasio "por cada 100 m²" → SUPRIME el cuerpo, solo redirección orgánica', () => {
    const llmFail =
      'Para abonar tu cultivo, una mezcla típica podría ser 10 kg de urea, 20 kg de TSP y 15 kg de ' +
      'sulfato de potasio por cada 100 m². Agrega primero el sulfato de potasio, luego la urea y ' +
      'finalmente el TSP.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    // Suppress-and-replace: el cuerpo con la receta sintética NO debe quedar.
    expect(out.text).not.toMatch(/10\s*kg de urea/i);
    expect(out.text).not.toMatch(/20\s*kg de TSP/i);
    expect(out.text).not.toMatch(/15\s*kg de sulfato de potasio/i);
    expect(out.text).not.toMatch(/por cada 100 m²/i);
    // Solo queda el bloque de redirección orgánica.
    expect(out.text).toMatch(/agroecológico/i);
    expect(out.text).toMatch(/compost|bocashi|biol|humus/i);
  });

  it('CASO REAL PROD: "250 g/planta de NPK 10-10-10 cada mes" → SUPRIME la dosis sintética', () => {
    const llmFail =
      'Aplica un abono completo NPK 10-10-10 a 250 g/planta cada mes para que produzca bien.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(/250\s*g\/planta/i);
    expect(out.text).not.toMatch(/10-10-10/);
    expect(out.text).toMatch(/agroecológico/i);
    expect(out.text).toMatch(/compost|bocashi|biol|humus/i);
  });

  it('urea "50 kg por hectárea" → SUPRIME (sintético + dosis kg/ha)', () => {
    const llmFail = 'Para que pegue verde, aplica 50 kg de urea por hectárea al voleo.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(/50\s*kg de urea/i);
    expect(out.text).toMatch(/agroecológico/i);
  });

  it('KCl "2 bultos por lote" → SUPRIME (sigla sintética + dosis en bultos)', () => {
    const llmFail = 'Echa 2 bultos de KCl por lote para subir el potasio.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(/2 bultos de KCl/i);
    expect(out.text).toMatch(/agroecológico/i);
  });

  // ── CONTROLES NEGATIVOS (anti-sobre-supresión) ──
  it('CONTROL NEGATIVO: respuesta orgánica con "2 kg de compost por planta" NO se suprime (ni se modifica)', () => {
    const ok = 'Aplica 2 kg de compost bien maduro por planta cada dos meses; alimenta el suelo vivo.';
    const out = guardSyntheticAgrochemical(ok);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('CONTROL NEGATIVO: receta de biopreparado (biol) con cantidades NO se suprime', () => {
    const ok =
      'Prepara biol: 50 L de agua, 10 kg de estiércol fresco, 2 kg de melaza y 1 L de leche. ' +
      'Aplica 1 L de biol diluido por planta cada quince días.';
    const out = guardSyntheticAgrochemical(ok);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('CONTROL NEGATIVO: bocashi con dosis en kg/m² NO se suprime', () => {
    const ok = 'Incorpora 3 kg/m² de bocashi maduro antes de sembrar; es un abono orgánico fermentado.';
    const out = guardSyntheticAgrochemical(ok);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('sintético SIN dosis sigue comportándose (modificado): glifosato suelto NO desencadena suppress pero igual corrige', () => {
    // Sin patrón de dosis no suprimimos el cuerpo (puede ser una mención de
    // advertencia/validación); el guard sigue añadiendo el contrapeso orgánico
    // como antes (#17). Lo que cambia con dosis es la SUPRESIÓN.
    const llmFail = 'Para la maleza algunos aplican glifosato al lote.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    // Append-mode: la advertencia orgánica está presente.
    expect(out.text).toMatch(/agroecológico/i);
  });

  it('idempotencia: pasar dos veces una receta sintética+dosis no rompe (sigue suprimida)', () => {
    const llmFail = 'Aplica 10 kg de urea y 5 kg de sulfato de amonio por cada 100 m².';
    const once = guardSyntheticAgrochemical(llmFail);
    const twice = guardSyntheticAgrochemical(once.text);
    expect(once.modified).toBe(true);
    expect(twice.modified).toBe(false); // ya es solo redirección orgánica
    expect(twice.text).toMatch(/agroecológico/i);
    expect(twice.text).not.toMatch(/10 kg de urea/i);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// FALLO 2 — gate de PRECIO para NO inyectar perfil/viabilidad de finca
// ──────────────────────────────────────────────────────────────────────────
describe('FALLO 2 — classifyQueryIntent gate de precio (no inyectar finca)', () => {
  it('"a cómo está el bulto de papa" → precio (NO debe inyectar finca)', () => {
    expect(classifyQueryIntent('a cómo está el bulto de papa')).toBe('precio');
  });

  it('"precio de la arroba de cebolla" → precio', () => {
    expect(classifyQueryIntent('precio de la arroba de cebolla')).toBe('precio');
  });

  it('"cuánto vale la carga de papa en plaza" → precio', () => {
    expect(classifyQueryIntent('cuánto vale la carga de papa en plaza')).toBe('precio');
  });

  it('CONTROL: query de siembra real SÍ corre viabilidad (no romperla)', () => {
    expect(classifyQueryIntent('¿puedo sembrar papa en mi finca?')).toBe('siembra');
    expect(classifyQueryIntent('qué puedo sembrar en mi finca a 1923 msnm')).toBe('siembra');
    expect(classifyQueryIntent('es viable la papa a esta altura')).toBe('siembra');
  });
});
