/**
 * institutionalSources.test.js — #356: la cita "Fuente: IDEAM/SIPSA/Agrosavia"
 * debe poder convertirse en un link clickeable a la página institucional real.
 *
 * Reglas:
 *   - Mapea nombres de fuentes institucionales colombianas a URLs REALES que
 *     resuelven (NO inventadas).
 *   - Prefiere un deep-link si el caller lo pasa (p.ej. ficha de especie
 *     Agrosavia con species_id); cae a la página/boletín de la institución.
 *   - Tolerante a tildes, mayúsculas y fuentes compuestas ("Agrosavia / FAO",
 *     "NOAA CPC · IDEAM").
 *   - Devuelve null si la fuente no es institucional reconocida (no inventa).
 */

import { describe, test, expect } from 'vitest';
import {
  institutionalSourceUrl,
  resolveSourceLink,
} from '../institutionalSources.js';

describe('institutionalSourceUrl — mapeo fuente → URL institucional real', () => {
  test('IDEAM → página de pronóstico y alertas (https)', () => {
    const url = institutionalSourceUrl('IDEAM');
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('ideam.gov.co');
  });

  test('SIPSA → boletín DANE (SIPSA es del DANE)', () => {
    const url = institutionalSourceUrl('SIPSA');
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('dane.gov.co');
  });

  test('Agrosavia → repositorio institucional', () => {
    const url = institutionalSourceUrl('Agrosavia');
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('agrosavia.co');
  });

  test('ICA → página institucional', () => {
    const url = institutionalSourceUrl('ICA');
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('ica.gov.co');
  });

  test('Cenicafé → página institucional (acepta sin tilde)', () => {
    expect(institutionalSourceUrl('Cenicafé')).toContain('cenicafe.org');
    expect(institutionalSourceUrl('Cenicafe')).toContain('cenicafe.org');
  });

  test('tolerante a mayúsculas/tildes y a fuentes compuestas', () => {
    expect(institutionalSourceUrl('ideam')).toContain('ideam.gov.co');
    expect(institutionalSourceUrl('NOAA CPC · IDEAM')).toContain('ideam.gov.co');
    expect(institutionalSourceUrl('Agrosavia / FAO')).toContain('agrosavia.co');
  });

  test('prefiere el deep-link válido si el caller lo pasa', () => {
    const deep = 'https://repository.agrosavia.co/handle/123/ficha-lulo';
    expect(institutionalSourceUrl('Agrosavia', { deepLink: deep })).toBe(deep);
  });

  test('ignora un deep-link inseguro y cae a la institución', () => {
    const url = institutionalSourceUrl('Agrosavia', { deepLink: 'javascript:alert(1)' });
    expect(url).toContain('agrosavia.co');
    expect(url).not.toContain('javascript');
  });

  test('fuente NO institucional / desconocida → null (no inventa URL)', () => {
    expect(institutionalSourceUrl('Wikipedia')).toBeNull();
    expect(institutionalSourceUrl('blog de un vecino')).toBeNull();
    expect(institutionalSourceUrl('')).toBeNull();
    expect(institutionalSourceUrl(null)).toBeNull();
    expect(institutionalSourceUrl(123)).toBeNull();
  });
});

describe('resolveSourceLink — de una cita de fuente a {fuente, fuente_url}', () => {
  test('string institucional → label + URL', () => {
    const out = resolveSourceLink('IDEAM');
    expect(out.fuente).toBe('IDEAM');
    expect(out.fuente_url).toContain('ideam.gov.co');
  });

  test('array de fuentes → toma la PRIMERA institucional reconocida', () => {
    const out = resolveSourceLink(['blog random', 'SIPSA', 'IDEAM']);
    expect(out.fuente).toBe('SIPSA');
    expect(out.fuente_url).toContain('dane.gov.co');
  });

  test('fuente compuesta conserva el label original pero linkea a la institución', () => {
    const out = resolveSourceLink('Agrosavia / FAO');
    expect(out.fuente).toBe('Agrosavia / FAO');
    expect(out.fuente_url).toContain('agrosavia.co');
  });

  test('deep-link de ficha (species) gana sobre la página institucional', () => {
    const deep = 'https://repository.agrosavia.co/handle/123/ficha-lulo';
    const out = resolveSourceLink('Agrosavia', { deepLink: deep });
    expect(out.fuente_url).toBe(deep);
  });

  test('ninguna fuente institucional → {} (sin link, graceful)', () => {
    expect(resolveSourceLink('Wikipedia')).toEqual({});
    expect(resolveSourceLink(['blog', 'foro'])).toEqual({});
    expect(resolveSourceLink(null)).toEqual({});
    expect(resolveSourceLink([])).toEqual({});
  });
});
