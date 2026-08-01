/**
 * Tests para el glosario regional del altiplano nariñense (papa/cuy/cebada),
 * añadido de forma aditiva sobre glosarioCaucaService.
 *
 * Verifica que:
 *   - `isInNarinoRegion` detecta Nariño (departamento/zona) y solo Nariño.
 *   - Con finca de Nariño, `normalizeUserInput` aplica el glosario nariñense.
 *   - El Cauca sigue intacto (una finca de Nariño NO recibe términos del Cauca
 *     y viceversa) y las fincas fuera de región son passthrough.
 *   - `localizeAgentOutput` hace el reverse en Nariño.
 */
import { describe, it, expect } from 'vitest';
import {
  isInNarinoRegion,
  isInCaucaRegion,
  normalizeUserInput,
  localizeAgentOutput,
  getGlosarioStatsNarino,
} from '../glosarioCaucaService.js';

describe('glosario narinense — gate de región', () => {
  it('detecta departamento Nariño (con y sin tilde, case-insensitive)', () => {
    expect(isInNarinoRegion({ departamento: 'narino' })).toBe(true);
    expect(isInNarinoRegion({ departamento: 'Nariño' })).toBe(true);
    expect(isInNarinoRegion({ departamento: 'NARIÑO' })).toBe(true);
    expect(isInNarinoRegion({ region: 'narino' })).toBe(true);
  });

  it('detecta zona biocultural narinense', () => {
    expect(isInNarinoRegion({ biocultural_zone: 'narinense' })).toBe(true);
    expect(isInNarinoRegion({ biocultural_zone: 'altiplano_narinense' })).toBe(true);
  });

  it('NO detecta otras regiones ni input inválido', () => {
    expect(isInNarinoRegion({ departamento: 'cauca' })).toBe(false);
    expect(isInNarinoRegion({ biocultural_zone: 'valle_caucano' })).toBe(false);
    expect(isInNarinoRegion(null)).toBe(false);
    expect(isInNarinoRegion({})).toBe(false);
    expect(isInNarinoRegion('narino')).toBe(false);
  });

  it('Nariño y Cauca son mutuamente excluyentes', () => {
    const nar = { departamento: 'narino' };
    expect(isInNarinoRegion(nar)).toBe(true);
    expect(isInCaucaRegion(nar)).toBe(false);
  });
});

describe('glosario narinense — normalizeUserInput (forward)', () => {
  const fincaNarino = { departamento: 'narino' };

  it('mapea folk de plaga a nombre científico', () => {
    expect(
      normalizeUserInput('se me metió el gusano blanco a la papa', { finca: fincaNarino })
    ).toBe('se me metió el Premnotrypes vorax a la papa');
  });

  it('mapea cobayo → cuy', () => {
    expect(normalizeUserInput('crío cobayo', { finca: fincaNarino })).toBe('crío cuy');
  });

  it('mapea el cultivar folk criolla colombia → papa criolla', () => {
    expect(normalizeUserInput('sembré criolla colombia', { finca: fincaNarino })).toBe(
      'sembré papa criolla'
    );
  });

  it('respeta case-insensitive (término más largo gana)', () => {
    expect(
      normalizeUserInput('PULGUILLA SALTONA en el lote', { finca: fincaNarino })
    ).toBe('Epitrix en el lote');
  });

  it('NO aplica el glosario del Cauca a una finca de Nariño', () => {
    // "papa runa" es término del Cauca; en Nariño debe quedar intacto.
    const t = 'tengo papa runa';
    expect(normalizeUserInput(t, { finca: fincaNarino })).toBe(t);
  });

  it('passthrough cuando la finca no es de Nariño ni Cauca', () => {
    const t = 'crío cobayo';
    expect(normalizeUserInput(t, { finca: { departamento: 'antioquia' } })).toBe(t);
  });

  it('es idempotente', () => {
    const once = normalizeUserInput('crío cobayo', { finca: fincaNarino });
    const twice = normalizeUserInput(once, { finca: fincaNarino });
    expect(twice).toBe(once);
  });
});

describe('glosario narinense — localizeAgentOutput (reverse)', () => {
  it('reemplaza estándar → folk nariñense', () => {
    const out = localizeAgentOutput('cría de cuy en galpón de cuyes', {
      finca: { departamento: 'narino' },
    });
    expect(out).toContain('cobayo');
    expect(out).toContain('cuyera');
  });
});

describe('glosario narinense — getGlosarioStatsNarino', () => {
  it('reporta versión y región nariñense', () => {
    const stats = getGlosarioStatsNarino();
    expect(stats.version).toBe('v1');
    expect(stats.region).toBe('narino');
    expect(stats.totalTerminos).toBeGreaterThan(0);
  });
});
