/**
 * Valida el fixture de trampas duras de tomate usado por el bench
 * `PROMPTS_FILE=eval/borde-traps-tomate-hard.json`.
 */

import { describe, it, expect } from 'vitest';
import FIXTURE from './borde-traps-tomate-hard.json';

describe('fixture de trampas duras tomate', () => {
  it('tiene 20 prompts reproducibles para el bench', () => {
    expect(Array.isArray(FIXTURE.prompts)).toBe(true);
    expect(FIXTURE.prompts).toHaveLength(20);
  });

  it('cada prompt trae campos necesarios para el scorer anti-alucinación', () => {
    for (const p of FIXTURE.prompts) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.prompt).toBe('string');
      expect(p.prompt.length).toBeGreaterThan(20);
      expect(Array.isArray(p.axes), `axes de ${p.id}`).toBe(true);
      expect(Array.isArray(p.must_include), `must_include de ${p.id}`).toBe(true);
      expect(p.must_include.length).toBeGreaterThan(0);
      expect(Array.isArray(p.red_flags), `red_flags de ${p.id}`).toBe(true);
      expect(p.red_flags.length).toBeGreaterThan(0);
    }
  });

  it('los ids son únicos y cubren las 8 familias de reglas', () => {
    const ids = FIXTURE.prompts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);

    const axes = new Set(FIXTURE.prompts.flatMap((p) => p.axes));
    expect(axes.has('falsa_cura_tomate')).toBe(true);
    expect(axes.has('trastorno_fisiologico')).toBe(true);
    expect(axes.has('producto_prohibido_colombia')).toBe(true);
    expect(axes.has('dosis_peligrosa')).toBe(true);
    expect(axes.has('plaga_ajena')).toBe(true);
    expect(axes.has('control_biologico_invalido')).toBe(true);
    expect(axes.has('asociacion_riesgosa')).toBe(true);
    expect(axes.has('error_agronomico_inducido')).toBe(true);
  });
});
