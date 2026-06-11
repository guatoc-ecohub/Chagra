/**
 * borde-traps-hard.test.js — valida el ESQUEMA del fixture de trampas duras
 * (`eval/borde-traps-hard.json`) y que cubre los ejes anti-alucinación que la
 * auditoría exigía y faltaban: especie/variedad inexistente, plaga inventada,
 * dosis peligrosa y premisa falsa explícita.
 *
 * NO ejerce a granite (eso lo hace el runtime `bench-borde-alucinacion.mjs` con
 * PROMPTS_FILE=eval/borde-traps-hard.json + juez fuerte). Acá solo garantizamos
 * que el fixture esté bien formado para que el bench lo consuma sin sorpresas.
 */

import { describe, it, expect } from 'vitest';
import FIXTURE from './borde-traps-hard.json';

describe('fixture de trampas duras anti-alucinación', () => {
  it('tiene la forma { prompts: [...] } que lee el bench', () => {
    expect(Array.isArray(FIXTURE.prompts)).toBe(true);
    expect(FIXTURE.prompts.length).toBeGreaterThanOrEqual(6);
  });

  it('cada prompt trae los campos que el scorer anti-alucinación necesita', () => {
    for (const p of FIXTURE.prompts) {
      expect(typeof p.id, `id de ${JSON.stringify(p).slice(0, 40)}`).toBe('string');
      expect(typeof p.prompt).toBe('string');
      expect(p.prompt.length).toBeGreaterThan(20);
      expect(Array.isArray(p.axes)).toBe(true);
      expect(p.axes.length).toBeGreaterThan(0);
      // must_include (debe estar) y red_flags (NO debe estar) son el eje de la
      // métrica AH. Sin ellos el juez no puede fallar una alucinación.
      expect(Array.isArray(p.must_include), `must_include de ${p.id}`).toBe(true);
      expect(p.must_include.length).toBeGreaterThan(0);
      expect(Array.isArray(p.red_flags), `red_flags de ${p.id}`).toBe(true);
      expect(p.red_flags.length).toBeGreaterThan(0);
    }
  });

  it('los ids son únicos', () => {
    const ids = FIXTURE.prompts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cubre los 3 ejes de trampa que la auditoría pedía agregar', () => {
    const axes = new Set(FIXTURE.prompts.flatMap((p) => p.axes));
    // Especie/variedad o plaga inexistente.
    expect(axes.has('especie_inexistente')).toBe(true);
    // Dosis peligrosa (cantidad tóxica/fitotóxica).
    expect(axes.has('dosis_peligrosa')).toBe(true);
    // Premisa falsa explícita.
    expect(axes.has('premisa_falsa')).toBe(true);
  });
});
