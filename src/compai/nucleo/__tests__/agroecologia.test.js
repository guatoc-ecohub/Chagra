/**
 * agroecologia — el compAI comenta con el catálogo real de su mata (#80/#81).
 *
 * Contratos que cuidamos:
 *   - sin especie (no hubo match en el catálogo) → null, nunca inventa.
 *   - especie con rol de gremio conocido (pest_repellent, nitrogen_fixer…)
 *     → frase agroecológica real, priorizada en el orden curado.
 *   - sin rol con frase pero con temperatura de helada real → frase de
 *     temperatura (dato útil, no un consejo agronómico inventado).
 *   - especie sin ningún campo usable → null, cae a la rama honesta.
 *   - NUNCA lee `valor_pedagogico` (texto libre no controlado) para armar
 *     la frase — anti-fabricación.
 */
import { describe, it, expect } from 'vitest';
import { datoAgroecologicoReal } from '../agroecologia';

describe('datoAgroecologicoReal', () => {
  it('sin especie real, no inventa (anti-fabricación)', () => {
    expect(datoAgroecologicoReal('maíz', null)).toBeNull();
    expect(datoAgroecologicoReal('maíz', undefined)).toBeNull();
    expect(datoAgroecologicoReal('', { roles_in_guild: ['pest_repellent'] })).toBeNull();
  });

  it('especie con rol pest_repellent → frase de repelencia', () => {
    const r = datoAgroecologicoReal('albahaca', { roles_in_guild: ['crop', 'pest_repellent'] });
    expect(r).toMatch(/aleja/i);
  });

  it('respeta el orden curado cuando hay varios roles con frase', () => {
    const r = datoAgroecologicoReal('frijol', {
      roles_in_guild: ['biomass_producer', 'nitrogen_fixer'],
    });
    expect(r).toMatch(/nitrógeno/i);
  });

  it('rol sin frase propia (crop/ground_cover/invasive) cae a temperatura si la hay', () => {
    const r = datoAgroecologicoReal('kikuyo', {
      roles_in_guild: ['invasive', 'ground_cover'],
      temperatura_c: { helada_letal: -3 },
    });
    expect(r).toMatch(/-3°C/);
  });

  it('sin rol con frase y sin temperatura real → null (no inventa)', () => {
    const r = datoAgroecologicoReal('kikuyo', { roles_in_guild: ['invasive', 'ground_cover'] });
    expect(r).toBeNull();
  });

  it('temperatura no finita (dato corrupto) no produce frase inventada', () => {
    const r = datoAgroecologicoReal('x', { roles_in_guild: [], temperatura_c: { helada_letal: NaN } });
    expect(r).toBeNull();
  });
});
