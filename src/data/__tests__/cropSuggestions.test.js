/**
 * cropSuggestions.test.js — el generador determinístico de sugerencias
 * agronómicas contextuales del home (AgentHero).
 *
 * Cubre: piso térmico por altitud, matching de cultivo por nombre real de
 * planta (con tildes y sufijo "#003"), estacionalidad por mes, determinismo,
 * dedupe por cultivo, fallback vacío sin cultivos, y ausencia de voseo.
 */
import { describe, test, expect } from 'vitest';
import {
  buildCropSuggestions,
  pisoTermicoFromAltitud,
  normalizeCropName,
} from '../cropSuggestions';

describe('pisoTermicoFromAltitud', () => {
  test('clasifica los pisos térmicos colombianos por msnm', () => {
    expect(pisoTermicoFromAltitud(450)).toBe('calido');
    expect(pisoTermicoFromAltitud(1730)).toBe('templado');
    expect(pisoTermicoFromAltitud(2600)).toBe('frio');
    expect(pisoTermicoFromAltitud(3400)).toBe('paramo');
  });
  test('devuelve null para altitud inválida o ausente', () => {
    expect(pisoTermicoFromAltitud(null)).toBeNull();
    expect(pisoTermicoFromAltitud(undefined)).toBeNull();
    expect(pisoTermicoFromAltitud('—')).toBeNull();
    expect(pisoTermicoFromAltitud(0)).toBeNull();
  });
});

describe('normalizeCropName', () => {
  test('quita tildes, baja a minúscula y descarta el sufijo "#003"', () => {
    expect(normalizeCropName('Café')).toBe('cafe');
    expect(normalizeCropName('Gulupa #003')).toBe('gulupa');
    expect(normalizeCropName('  Aguacate Hass ')).toBe('aguacate hass');
  });
});

describe('buildCropSuggestions', () => {
  const plants = (names) => names.map((n) => ({ attributes: { name: n } }));

  test('sin cultivos → lista vacía (el llamador cae al tip genérico)', () => {
    expect(buildCropSuggestions([])).toEqual([]);
    expect(buildCropSuggestions(null)).toEqual([]);
  });

  test('sin match en el catálogo → no inventa sugerencia', () => {
    expect(buildCropSuggestions(plants(['Planta Mock #1', 'Helecho raro']))).toEqual([]);
  });

  test('aguacate en febrero sugiere biol para fructificación', () => {
    const out = buildCropSuggestions(plants(['Aguacate Hass']), { month: 2 });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/biol/i);
    expect(out[0]).toMatch(/aguacates/i);
  });

  test('café en enero sugiere poda; el copy cambia con la estación', () => {
    expect(buildCropSuggestions(plants(['Café']), { month: 1 })[0]).toMatch(/podar tu café/i);
    expect(buildCropSuggestions(plants(['Café']), { month: 10 })[0]).toMatch(/cosecha/i);
  });

  test('dedup por cultivo: 3 aguacates → 1 sola sugerencia', () => {
    const out = buildCropSuggestions(plants(['Aguacate #1', 'Aguacate #2', 'Aguacate #3']), { month: 2 });
    expect(out).toHaveLength(1);
  });

  test('varios cultivos → varias sugerencias en orden de aparición', () => {
    const out = buildCropSuggestions(plants(['Café', 'Tomate Chonto', 'Mora']), { month: 3 });
    expect(out.length).toBe(3);
    expect(out[0]).toMatch(/café/i);
    expect(out[1]).toMatch(/tomates/i);
    expect(out[2]).toMatch(/mora/i);
  });

  test('determinístico: misma entrada ⇒ misma salida', () => {
    const p = plants(['Tomate', 'Aguacate']);
    expect(buildCropSuggestions(p, { month: 4 })).toEqual(buildCropSuggestions(p, { month: 4 }));
  });

  test('respeta el tope `max`', () => {
    const p = plants(['Café', 'Tomate', 'Mora', 'Lulo', 'Papa', 'Cacao']);
    expect(buildCropSuggestions(p, { month: 6, max: 3 })).toHaveLength(3);
  });

  test('ninguna sugerencia usa voseo argentino', () => {
    const p = plants(['Café', 'Tomate', 'Aguacate', 'Mora', 'Plátano', 'Maíz', 'Papa', 'Lulo', 'Fresa', 'Cebolla']);
    const all = buildCropSuggestions(p, { month: 5, max: 99 }).join(' ');
    expect(all).not.toMatch(/mandá|contame|elegí|tenés|podés|querés|enviá|mostrá|preguntá|revisá|aplicá/i);
  });
});
