import { describe, it, expect } from 'vitest';
import {
  parsePedagogicalText,
  sanitizePedagogicalText,
  splitSentences,
  __TEST__,
} from './pedagogicalText.js';

const { detectHeading, splitSourceItems, splitClauses, softWrap } = __TEST__;

// El catálogo guarda `valor_pedagogico` como UN bloque denso sin saltos de
// línea. Estos tests fijan el contrato del formateador que lo vuelve legible:
// nunca inventa contenido, solo lo estructura y sanea.

describe('sanitizePedagogicalText', () => {
  it('colapsa espacios y garantiza puntuación terminal', () => {
    expect(sanitizePedagogicalText('  hola   mundo  ')).toBe('hola mundo.');
  });

  it('equilibra paréntesis con cierre de más (dato malformado real)', () => {
    // 6 especies del catálogo traen ")" de más — no debe romper el render.
    const out = sanitizePedagogicalText('Tagetes minuta) es una hierba.');
    expect(out).toBe('Tagetes minuta es una hierba.');
    expect((out.match(/\(/g) || []).length).toBe((out.match(/\)/g) || []).length);
  });

  it('cierra paréntesis colgados', () => {
    // El cierre añadido ")" ya cuenta como puntuación terminal (no duplica punto).
    expect(sanitizePedagogicalText('planta (epífita trepadora')).toBe('planta (epífita trepadora)');
  });

  it('quita énfasis markdown accidental (**negrita**)', () => {
    expect(sanitizePedagogicalText('es **aromática culinaria** andina'))
      .toBe('es aromática culinaria andina.');
  });

  it('devuelve cadena vacía para entrada vacía o no-string', () => {
    expect(sanitizePedagogicalText('')).toBe('');
    expect(sanitizePedagogicalText(null)).toBe('');
    expect(sanitizePedagogicalText(undefined)).toBe('');
  });
});

describe('splitSentences', () => {
  it('no corta en iniciales de género/autor (S. megalanthus, Zea mays L.)', () => {
    const s = splitSentences('Colombia produce S. megalanthus. El maíz Zea mays L. crece bien.');
    expect(s).toEqual([
      'Colombia produce S. megalanthus.',
      'El maíz Zea mays L. crece bien.',
    ]);
  });

  it('no corta en abreviaturas (ICA Res. 3168)', () => {
    const s = splitSentences('Autorizado por ICA Res. 3168 de 2015. Fin.');
    expect(s).toEqual(['Autorizado por ICA Res. 3168 de 2015.', 'Fin.']);
  });

  it('no corta en iniciales encadenadas (C.I. Caribia, R.D.Webster)', () => {
    const s = splitSentences('Desarrollado por AGROSAVIA C.I. Caribia y publicado. Listo.');
    expect(s).toEqual(['Desarrollado por AGROSAVIA C.I. Caribia y publicado.', 'Listo.']);
  });

  it('no corta dentro de paréntesis con punto+mayúscula', () => {
    const s = splitSentences('Frutal (estudio NASA 1989. Wolverton et al.) muy útil. Fin.');
    expect(s).toEqual(['Frutal (estudio NASA 1989. Wolverton et al.) muy útil.', 'Fin.']);
  });

  it('corta oraciones normales', () => {
    expect(splitSentences('Uno. Dos. Tres.')).toEqual(['Uno.', 'Dos.', 'Tres.']);
  });
});

describe('detectHeading', () => {
  it('reconoce encabezados de manejo', () => {
    expect(detectHeading('Manejo agroecológico: propagar por esqueje.')).toMatchObject({
      title: 'Manejo agroecológico',
      kind: 'section',
    });
  });

  it('reconoce bloque de fuentes', () => {
    expect(detectHeading('Fuentes Tier A: GBIF, POWO Kew.')).toMatchObject({ kind: 'sources' });
    expect(detectHeading('Fuente: nrc-1989.')).toMatchObject({ kind: 'sources' });
  });

  it('NO confunde dos-puntos interno con encabezado', () => {
    expect(detectHeading('Colombia produce dos pitayas: la blanca y la amarilla.')).toBeNull();
  });

  it('reconoce encabezados en MAYÚSCULAS (PRECAUCIÓN)', () => {
    expect(detectHeading('PRECAUCIÓN: tóxica para el ganado.')).toMatchObject({ kind: 'section' });
  });
});

describe('splitClauses (paren-aware)', () => {
  it('no parte listas dentro de paréntesis', () => {
    const c = splitClauses('crece en zonas (Buga, Palmira, Tulúa), y también en Tolima');
    expect(c).toEqual(['crece en zonas (Buga, Palmira, Tulúa),', 'y también en Tolima']);
  });
});

describe('softWrap', () => {
  it('deja intacto un párrafo corto', () => {
    expect(softWrap('Texto corto.')).toEqual(['Texto corto.']);
  });

  it('parte un párrafo larguísimo por cláusulas sin dejar paréntesis huérfanos', () => {
    const long = `${'foo bar baz, '.repeat(30)}fin`;
    const chunks = softWrap(long);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(320);
  });
});

describe('splitSourceItems', () => {
  it('separa fuentes por coma, punto-y-coma y punto medio', () => {
    expect(splitSourceItems('GBIF, POWO Kew; SiB Colombia · ICA 3168.')).toEqual([
      'GBIF', 'POWO Kew', 'SiB Colombia', 'ICA 3168',
    ]);
  });
});

describe('parsePedagogicalText — integración', () => {
  const PITAYA = 'La pitaya blanca (Hylocereus undatus (Haw.) Britton & Rose, Cactaceae) es un '
    + 'cactus epífito trepador perenne originario de Mesoamérica. Es lección viva de bioeconomía. '
    + 'Manejo agroecológico: propagación por esqueje de cladodio, tutorado obligatorio, cosecha a los '
    + '30-40 días. Fuentes Tier A: GBIF, POWO Kew, AGROSAVIA.';

  it('separa intro, sección de manejo y fuentes', () => {
    const r = parsePedagogicalText(PITAYA);
    expect(r.intro.length).toBeGreaterThan(0);
    expect(r.sections.some((s) => s.title === 'Manejo agroecológico')).toBe(true);
    expect(r.sources).toEqual(['GBIF', 'POWO Kew', 'AGROSAVIA']);
  });

  it('ningún párrafo/viñeta queda como muro (>420 chars) en texto normal', () => {
    const r = parsePedagogicalText(PITAYA);
    const chunks = [...r.intro, ...r.sections.flatMap((s) => s.bullets || s.paragraphs)];
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(420);
  });

  it('todo trozo emitido tiene paréntesis equilibrados', () => {
    const r = parsePedagogicalText(PITAYA);
    const chunks = [...r.intro, ...r.sections.flatMap((s) => s.bullets || s.paragraphs)];
    for (const c of chunks) {
      expect((c.match(/\(/g) || []).length).toBe((c.match(/\)/g) || []).length);
    }
  });

  it('no pierde el contenido (las fuentes del texto se conservan)', () => {
    const r = parsePedagogicalText(PITAYA);
    expect(r.sources).toContain('POWO Kew');
  });

  it('devuelve estructura vacía para entrada vacía', () => {
    expect(parsePedagogicalText('')).toEqual({ intro: [], sections: [], sources: null });
  });
});
