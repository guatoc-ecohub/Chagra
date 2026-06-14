/**
 * institutionalSources.test.js — #356 + refinamiento 2026-06-03.
 *
 * Regla del operador: un link de fuente debe llevar al RECURSO citado, NUNCA a
 * la homepage/landing genérica de la institución (trazabilidad teatral).
 *
 * Contrato verificado acá:
 *   - 'section' (SIPSA→boletín precios, NOAA→tabla ONI): la URL ES la sección
 *     del dato → se linkea directo, sin concepto.
 *   - 'search' (Agrosavia/ICA/Cenicafé/FAO/INVIMA): con concepto → URL de
 *     búsqueda del concepto; SIN concepto → NO se linkea (homepage disfrazada).
 *   - 'text' (IDEAM/Open-Meteo/DANE): nunca link → `fuente_texto:true` (texto
 *     plano "Fuente: X"), jamás un <a> a la portada.
 *   - deep-link curado (opts.deepLink) http(s): gana siempre.
 *   - fuente no institucional → {} (no inventa nada).
 */

import { describe, test, expect } from 'vitest';
import {
  institutionalSourceUrl,
  classifySource,
  resolveSourceLink,
} from '../institutionalSources.js';

describe('institutionalSourceUrl — al RECURSO citado, nunca a la homepage', () => {
  // ── 'section': la URL es la sección del dato citado ──
  test('SIPSA → sección de precios del DANE (sección, no home)', () => {
    const url = institutionalSourceUrl('SIPSA');
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('sistema-de-informacion-de-precios-sipsa');
  });

  test('NOAA → tabla ONI oficial (sección ENSO, no la home del CPC)', () => {
    const url = institutionalSourceUrl('NOAA');
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('ONI');
  });

  // ── 'search': con concepto construye búsqueda; sin concepto NO linkea ──
  test('Agrosavia + concepto → URL de búsqueda del concepto (DSpace ?query=)', () => {
    const url = institutionalSourceUrl('Agrosavia', { concept: 'Solanum quitoense' });
    expect(url).toContain('repository.agrosavia.co/search');
    expect(url).toContain('query=Solanum%20quitoense');
  });

  test('Cenicafé + concepto → búsqueda (?s=); el caso "home a secas" del operador queda resuelto', () => {
    const url = institutionalSourceUrl('Cenicafé', { concept: 'broca' });
    expect(url).toContain('cenicafe.org/?s=broca');
  });

  test('ICA + concepto → búsqueda', () => {
    expect(institutionalSourceUrl('ICA', { concept: 'aguacate' })).toContain('ica.gov.co/buscador?q=aguacate');
  });

  test('FAO + concepto → búsqueda', () => {
    expect(institutionalSourceUrl('FAO', { concept: 'caldo bordeles' })).toContain('fao.org/search');
  });

  test('INVIMA + concepto → búsqueda', () => {
    expect(institutionalSourceUrl('INVIMA', { concept: 'fermento' })).toContain('invima.gov.co/buscar?q=fermento');
  });

  test('fuente "search" SIN concepto → null (no linkeamos a una home/buscador vacío)', () => {
    expect(institutionalSourceUrl('Agrosavia')).toBeNull();
    expect(institutionalSourceUrl('Cenicafé')).toBeNull();
    expect(institutionalSourceUrl('ICA', { concept: 'x' })).toBeNull(); // 1 char no es término útil
  });

  // ── 'text': nunca link a homepage ──
  test('IDEAM → null (su portal no permite deep-link al pronóstico citado)', () => {
    expect(institutionalSourceUrl('IDEAM', { concept: 'lluvia' })).toBeNull();
  });

  test('Open-Meteo → null (web de docs de API, no acerca al pronóstico)', () => {
    expect(institutionalSourceUrl('Open-Meteo')).toBeNull();
  });

  test('DANE genérico (sin SIPSA) → null (no hay sección/búsqueda por dato)', () => {
    expect(institutionalSourceUrl('DANE')).toBeNull();
  });

  // ── deep-link curado gana ──
  test('prefiere el deep-link válido si el caller lo pasa', () => {
    const deep = 'https://repository.agrosavia.co/handle/123/ficha-lulo';
    expect(institutionalSourceUrl('Agrosavia', { deepLink: deep })).toBe(deep);
  });

  test('ignora un deep-link inseguro y NO cae a homepage (sin concepto → null)', () => {
    const url = institutionalSourceUrl('Agrosavia', { deepLink: 'javascript:alert(1)' });
    expect(url).toBeNull();
  });

  test('tolerante a mayúsculas/tildes y a fuentes compuestas (en section/search)', () => {
    expect(institutionalSourceUrl('NOAA CPC')).toContain('ONI'); // sección ONI
    expect(institutionalSourceUrl('Agrosavia / FAO', { concept: 'lulo' })).toContain('agrosavia.co');
  });

  test('fuente NO institucional / desconocida → null (no inventa URL)', () => {
    expect(institutionalSourceUrl('Wikipedia', { concept: 'lulo' })).toBeNull();
    expect(institutionalSourceUrl('blog de un vecino')).toBeNull();
    expect(institutionalSourceUrl('')).toBeNull();
    expect(institutionalSourceUrl(null)).toBeNull();
    expect(institutionalSourceUrl(123)).toBeNull();
  });
});

describe('classifySource — link vs texto plano vs nada', () => {
  test('section → {fuente, fuente_url} (link)', () => {
    const r = classifySource('SIPSA');
    expect(r.fuente).toBe('SIPSA');
    expect(r.fuente_url).toContain('sipsa');
    expect(r.fuente_texto).toBeUndefined();
  });

  test('search + concepto → {fuente, fuente_url} (link de búsqueda)', () => {
    const r = classifySource('Agrosavia', { concept: 'lulo' });
    expect(r.fuente_url).toContain('agrosavia.co/search');
  });

  test('search SIN concepto → {fuente, fuente_texto:true} (texto plano, NO homepage)', () => {
    const r = classifySource('Cenicafé');
    expect(r.fuente).toBe('Cenicafé');
    expect(r.fuente_texto).toBe(true);
    expect(r.fuente_url).toBeUndefined();
  });

  test('text (IDEAM) → {fuente, fuente_texto:true}, jamás fuente_url', () => {
    const r = classifySource('IDEAM', { concept: 'lluvia' });
    expect(r.fuente).toBe('IDEAM');
    expect(r.fuente_texto).toBe(true);
    expect(r.fuente_url).toBeUndefined();
  });

  test('deep-link curado → link aunque la fuente no sea institucional', () => {
    const r = classifySource('apuntes', { deepLink: 'https://x.org/doc.pdf' });
    expect(r.fuente_url).toBe('https://x.org/doc.pdf');
  });

  test('fuente no institucional, sin deep-link → {} (no inventa nada)', () => {
    expect(classifySource('Wikipedia')).toEqual({});
    expect(classifySource('')).toEqual({});
    expect(classifySource(null)).toEqual({});
  });
});

describe('resolveSourceLink — de una cita a {fuente, fuente_url|fuente_texto}', () => {
  test('section institucional → label + URL de sección', () => {
    const out = resolveSourceLink('SIPSA');
    expect(out.fuente).toBe('SIPSA');
    expect(out.fuente_url).toContain('sipsa');
  });

  test('search + concepto → label + URL de búsqueda', () => {
    const out = resolveSourceLink('Agrosavia', { concept: 'lulo' });
    expect(out.fuente).toBe('Agrosavia');
    expect(out.fuente_url).toContain('agrosavia.co/search');
  });

  test('array prefiere la que dé LINK sobre la que solo dé texto plano', () => {
    // IDEAM (texto) viene antes que SIPSA (sección con link) → debe ganar SIPSA.
    const out = resolveSourceLink(['IDEAM', 'SIPSA']);
    expect(out.fuente).toBe('SIPSA');
    expect(out.fuente_url).toContain('sipsa');
  });

  test('array sin ninguna con link pero con institución de texto → texto plano', () => {
    const out = resolveSourceLink(['blog random', 'IDEAM']);
    expect(out.fuente).toBe('IDEAM');
    expect(out.fuente_texto).toBe(true);
    expect(out.fuente_url).toBeUndefined();
  });

  test('fuente compuesta conserva el label original pero linkea a la institución', () => {
    const out = resolveSourceLink('Agrosavia / FAO', { concept: 'lulo' });
    expect(out.fuente).toBe('Agrosavia / FAO');
    expect(out.fuente_url).toContain('agrosavia.co');
  });

  test('deep-link de ficha (species) gana sobre la búsqueda', () => {
    const deep = 'https://repository.agrosavia.co/handle/123/ficha-lulo';
    const out = resolveSourceLink('Agrosavia', { deepLink: deep, concept: 'lulo' });
    expect(out.fuente_url).toBe(deep);
  });

  test('ninguna fuente institucional → {} (sin badge, graceful)', () => {
    expect(resolveSourceLink('Wikipedia')).toEqual({});
    expect(resolveSourceLink(['blog', 'foro'])).toEqual({});
    expect(resolveSourceLink(null)).toEqual({});
    expect(resolveSourceLink([])).toEqual({});
  });

  // ── Normativa ambiental (#357): Ley 1930 / Decreto 1007 / MinAmbiente ──
  test('Ley 1930 de 2018 (páramos) → link a la norma en gestornormativo', () => {
    const out = resolveSourceLink('Ley 1930 de 2018');
    expect(out.fuente).toBe('Ley 1930 de 2018');
    expect(out.fuente_url).toContain('gestornormativo/norma.php?i=87764');
  });

  test('Decreto 1007 de 2018 (PSA) → link a la norma en gestornormativo', () => {
    const out = resolveSourceLink('Decreto 1007 de 2018');
    expect(out.fuente).toBe('Decreto 1007 de 2018');
    expect(out.fuente_url).toContain('gestornormativo/norma.php?i=86901');
  });

  test('MinAmbiente → reconocida pero texto plano (no homepage genérica)', () => {
    const out = resolveSourceLink('MinAmbiente');
    expect(out.fuente).toBe('MinAmbiente');
    expect(out.fuente_texto).toBe(true);
    expect(out.fuente_url).toBeUndefined();
  });

  // ── La regla central del operador, como aserción explícita ──
  test('NINGÚN destino emitido es una homepage/landing genérica', () => {
    const isHomepage = (u) => /^https?:\/\/[^/]+\/?$/.test(u); // host + opcional "/"
    const cases = [
      resolveSourceLink('SIPSA'),
      resolveSourceLink('NOAA'),
      resolveSourceLink('Agrosavia', { concept: 'lulo' }),
      resolveSourceLink('Cenicafé', { concept: 'broca' }),
      resolveSourceLink('ICA', { concept: 'aguacate' }),
      resolveSourceLink('FAO', { concept: 'biopreparado' }),
      resolveSourceLink('INVIMA', { concept: 'fermento' }),
    ];
    for (const c of cases) {
      expect(c.fuente_url).toBeTruthy();
      expect(isHomepage(c.fuente_url)).toBe(false);
    }
    // Y las institucionales sin recurso no producen URL alguna.
    expect(resolveSourceLink('IDEAM').fuente_url).toBeUndefined();
    expect(resolveSourceLink('Open-Meteo').fuente_url).toBeUndefined();
    expect(resolveSourceLink('Cenicafé').fuente_url).toBeUndefined(); // sin concepto
  });
});
