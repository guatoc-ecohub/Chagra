/**
 * glaciarZenodoMeta.test.js — tests de generador de metadata Zenodo DOI.
 *
 * Verifica que buildZenodoMetadata() genera objetos JSON válidos según la API
 * de depósito Zenodo v10.13.0. Tests de:
 *   - Estructura básica (metadata, upload_type, etc.)
 *   - Creators (explícitos vs deducidos de reportes)
 *   - Título (explícito vs generado)
 *   - Descripción (generada desde reportes)
 *   - Keywords (fijos + derivados)
 *   - Fechas y versiones
 *   - Casos edge (array vacío, sin opciones, etc.)
 */
import { describe, it, expect } from 'vitest';
import { buildZenodoMetadata } from '../glaciarZenodoMeta';

describe('buildZenodoMetadata — estructura básica', () => {
  it('devuelve objeto con metadata raíz', () => {
    const result = buildZenodoMetadata([], {});
    expect(result).toHaveProperty('metadata');
    expect(typeof result.metadata).toBe('object');
  });

  it('upload_type es "dataset" siempre', () => {
    const result = buildZenodoMetadata([], {});
    expect(result.metadata.upload_type).toBe('dataset');
  });

  it('access_right es "open" siempre', () => {
    const result = buildZenodoMetadata([], {});
    expect(result.metadata.access_right).toBe('open');
  });

  it('license es "cc-by-4.0" siempre (Chagra forzado)', () => {
    const result = buildZenodoMetadata([], {});
    expect(result.metadata.license).toBe('cc-by-4.0');
  });

  it('language es "es" siempre', () => {
    const result = buildZenodoMetadata([], {});
    expect(result.metadata.language).toBe('es');
  });
});

describe('buildZenodoMetadata — creators', () => {
  it('creators explícitos se usan tal cual (array de strings)', () => {
    const result = buildZenodoMetadata([], {
      creators: ['Ana Pérez', 'Juan García'],
    });
    expect(result.metadata.creators).toEqual([
      { name: 'Ana Pérez' },
      { name: 'Juan García' },
    ]);
  });

  it('creators explícitos se respetan si son objetos con name', () => {
    const result = buildZenodoMetadata([], /** @type {any} */ ({
      creators: [{ name: 'Carla López', affiliation: 'UIAA' }],
    }));
    expect(result.metadata.creators).toEqual([
      { name: 'Carla López', affiliation: 'UIAA' },
    ]);
  });

  it('creators se deducen de reportes[].guia si no se proveen', () => {
    const result = buildZenodoMetadata(
      [
        { guia: 'Pedro Martínez', montana: 'cocuy_ritacuba' },
        { guia: 'Pedro Martínez', montana: 'ruiz' },
        { guia: 'Lucía Ramírez', montana: 'tolima' },
      ],
      {}
    );
    expect(result.metadata.creators).toEqual([
      { name: 'Lucía Ramírez' },
      { name: 'Pedro Martínez' },
    ]);
  });

  it('creators vacío si no hay reportes ni opción', () => {
    const result = buildZenodoMetadata([], {});
    expect(result.metadata.creators).toEqual([]);
  });

  it('creators se deducen y ordenan alfabéticamente', () => {
    const result = buildZenodoMetadata(
      [
        { guia: 'Zoe García' },
        { guia: 'Ana Pérez' },
        { guia: 'Miguel Torres' },
      ],
      {}
    );
    expect(result.metadata.creators).toEqual([
      { name: 'Ana Pérez' },
      { name: 'Miguel Torres' },
      { name: 'Zoe García' },
    ]);
  });
});

describe('buildZenodoMetadata — title', () => {
  it('title explícito se respeta', () => {
    const result = buildZenodoMetadata([], {
      title: 'Mi dataset glaciar personalizado',
    });
    expect(result.metadata.title).toBe('Mi dataset glaciar personalizado');
  });

  it('title generado con montaña y año si hay reportes', () => {
    const result = buildZenodoMetadata(
      [{ montana: 'cocuy_ritacuba', createdAt: 1641024000000 }], // 2022-01-01 08:00:00 local
      {}
    );
    expect(result.metadata.title).toMatch(/Monitoreo glaciar/);
    expect(result.metadata.title).toMatch(/cocuy_ritacuba/);
    expect(result.metadata.title).toMatch(/2022/);
  });

  it('title generado fallback si no hay reportes', () => {
    const result = buildZenodoMetadata([], {});
    expect(result.metadata.title).toBe('Dataset de monitoreo glaciar - Chagra');
  });

  it('title generado con múltiples montañas (hasta 3)', () => {
    const result = buildZenodoMetadata(
      [
        { montana: 'cocuy_ritacuba' },
        { montana: 'ruiz' },
        { montana: 'tolima' },
        { montana: 'huila' },
      ],
      {}
    );
    expect(result.metadata.title).toMatch(/cocuy_ritacuba/);
    expect(result.metadata.title).toMatch(/ruiz/);
    expect(result.metadata.title).toMatch(/tolima/);
  });
});

describe('buildZenodoMetadata — description', () => {
  it('description es un string Markdown básico', () => {
    const result = buildZenodoMetadata([], {});
    expect(typeof result.metadata.description).toBe('string');
    expect(result.metadata.description.length).toBeGreaterThan(0);
  });

  it('description contiene Markdown (negritas, listas)', () => {
    const result = buildZenodoMetadata(
      [{ guia: 'Ana', montana: 'ruiz' }],
      {}
    );
    expect(result.metadata.description).toMatch(/\*\*/); // Markdown bold
    expect(result.metadata.description).toMatch(/^- /m); // Markdown list (multiline)
  });

  it('description menciona número de reportes', () => {
    const result = buildZenodoMetadata(
      [{ montana: 'cocuy_ritacuba' }, { montana: 'ruiz' }],
      {}
    );
    expect(result.metadata.description).toMatch(/2 reportes/);
  });

  it('description menciona montañas si hay reportes', () => {
    const result = buildZenodoMetadata(
      [{ montana: 'cocuy_ritacuba' }, { montana: 'ruiz' }],
      {}
    );
    expect(result.metadata.description).toMatch(/cocuy_ritacuba/);
    expect(result.metadata.description).toMatch(/ruiz/);
  });

  it('description menciona puntos de monitoreo si hay puntoId', () => {
    const result = buildZenodoMetadata(
      [
        { puntoId: 'FRENTE-01', montana: 'ruiz' },
        { puntoId: 'FRENTE-01', montana: 'ruiz' },
        { puntoId: 'FRENTE-02', montana: 'ruiz' },
      ],
      {}
    );
    expect(result.metadata.description).toMatch(/2 puntos fijos/);
  });

  it('description menciona guías colaboradores si hay reportes', () => {
    const result = buildZenodoMetadata(
      [
        { guia: 'Ana Pérez', montana: 'cocuy_ritacuba' },
        { guia: 'Juan García', montana: 'ruiz' },
      ],
      {}
    );
    expect(result.metadata.description).toMatch(/Ana Pérez/);
    expect(result.metadata.description).toMatch(/Juan García/);
  });

  it('description menciona metodología y trazabilidad', () => {
    const result = buildZenodoMetadata(
      [{ guia: 'Ana', montana: 'ruiz' }],
      {}
    );
    expect(result.metadata.description).toMatch(/Metodología/);
    expect(result.metadata.description).toMatch(/Trazabilidad/);
    expect(result.metadata.description).toMatch(/Chagra/);
  });
});

describe('buildZenodoMetadata — keywords', () => {
  it('keywords contiene fijos básicos siempre', () => {
    const result = buildZenodoMetadata([], {});
    expect(result.metadata.keywords).toContain('glacier');
    expect(result.metadata.keywords).toContain('cryosphere');
    expect(result.metadata.keywords).toContain('citizen-science');
    expect(result.metadata.keywords).toContain('Colombia');
  });

  it('keywords se ordenan alfabéticamente', () => {
    const result = buildZenodoMetadata([], {});
    const sorted = [...result.metadata.keywords].sort();
    expect(result.metadata.keywords).toEqual(sorted);
  });

  it('keywords agregan Perú si hay montañas peruanas', () => {
    const result = buildZenodoMetadata(
      [{ montana: 'huascaran' }],
      {}
    );
    expect(result.metadata.keywords).toContain('Cordillera-Blanca');
    expect(result.metadata.keywords).toContain('Peru');
    expect(result.metadata.keywords).toContain('Perú');
  });

  it('keywords agregan montañas específicas colombianas', () => {
    const result = buildZenodoMetadata(
      [{ montana: 'cocuy_ritacuba' }],
      {}
    );
    expect(result.metadata.keywords).toContain('Sierra-Nevada-del-Cocuy');
  });

  it('keywords no duplican montañas repetidas', () => {
    const result = buildZenodoMetadata(
      [
        { montana: 'cocuy_ritacuba' },
        { montana: 'cocuy_ritacuba' },
      ],
      {}
    );
    const cocuyCount = result.metadata.keywords.filter((k) => k === 'Sierra-Nevada-del-Cocuy').length;
    expect(cocuyCount).toBe(1);
  });
});

describe('buildZenodoMetadata — fechas y versiones', () => {
  it('publication_date en formato ISO YYYY-MM-DD', () => {
    const result = buildZenodoMetadata(
      [{ createdAt: 1640000000000 }],
      {}
    );
    expect(result.metadata.publication_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('publication_date es hoy si no hay reportes', () => {
    const result = buildZenodoMetadata([], {});
    const today = new Date().toISOString().split('T')[0];
    expect(result.metadata.publication_date).toBe(today);
  });

  it('publication_date es la fecha más reciente entre reportes', () => {
    const result = buildZenodoMetadata(
      [
        { createdAt: 1600000000000 }, // 2020-09-13
        { createdAt: 1700000000000 }, // 2023-11-14
        { createdAt: 1500000000000 }, // 2017-07-14
      ],
      {}
    );
    expect(result.metadata.publication_date).toBe('2023-11-14');
  });

  it('version es año.conteo (ej: 2023.42)', () => {
    const result = buildZenodoMetadata(
      [
        { createdAt: 1672531200000 }, // 2023-01-01
        { createdAt: 1704067200000 }, // 2024-01-01
      ],
      {}
    );
    expect(result.metadata.version).toBe('2023.2'); // 2 reportes, año más reciente es 2023
  });
});

describe('buildZenodoMetadata — casos edge', () => {
  it('tolera array vacío de reportes', () => {
    expect(() => buildZenodoMetadata([], {})).not.toThrow();
    const result = buildZenodoMetadata([], {});
    expect(result.metadata).toHaveProperty('title');
    expect(result.metadata).toHaveProperty('description');
  });

  it('tolera null/undefined como reportes', () => {
    expect(() => buildZenodoMetadata(null, {})).not.toThrow();
    expect(() => buildZenodoMetadata(undefined, {})).not.toThrow();
    const result = buildZenodoMetadata(null, {});
    expect(result.metadata.upload_type).toBe('dataset');
  });

  it('tolera opciones vacías', () => {
    expect(() => buildZenodoMetadata([{ guia: 'Ana' }])).not.toThrow();
  });

  it('tolera reportes sin campos obligatorios (resiliencia)', () => {
    const result = buildZenodoMetadata(
      [{}, { guia: '' }, { montana: null }],
      {}
    );
    expect(result.metadata.creators).toEqual([]);
  });

  it('DOI opcional se incluye si se provee', () => {
    const result = buildZenodoMetadata([], /** @type {any} */ ({
      doi: '10.5281/zenodo.1234567',
    }));
    expect(result.metadata.doi).toBe('10.5281/zenodo.1234567');
  });

  it('DOI no se incluye si no se provee', () => {
    const result = buildZenodoMetadata([], {});
    expect(result.metadata.doi).toBeUndefined();
  });
});

describe('buildZenodoMetadata — shape completo Zenodo', () => {
  it('genera shape válido según API Zenodo v10.13.0', () => {
    const result = buildZenodoMetadata(
      [
        {
          guia: 'Ana Pérez',
          montana: 'cocuy_ritacuba',
          puntoId: 'RITACUBA-01',
          createdAt: 1642261200000,
          fechaISO: '2022-01-15T08:30:00.000Z',
          tipoSuperficie: 'hielo_glaciar_azul',
          dureza: 'H1',
        },
      ],
      /** @type {any} */ ({
        title: 'Monitoreo Glaciar Cocuy 2022',
        creators: ['Ana Pérez', 'Juan García'],
        doi: '10.5281/zenodo.9999999',
      })
    );

    // Verificar estructura requerida por Zenodo
    expect(result).toHaveProperty('metadata');
    expect(result.metadata).toMatchObject({
      upload_type: 'dataset',
      title: 'Monitoreo Glaciar Cocuy 2022',
      publication_date: '2022-01-15',
      access_right: 'open',
      license: 'cc-by-4.0',
      language: 'es',
      doi: '10.5281/zenodo.9999999',
    });

    // Verificar creators
    expect(result.metadata.creators).toEqual([
      { name: 'Ana Pérez' },
      { name: 'Juan García' },
    ]);

    // Verificar description no vacío
    expect(result.metadata.description.length).toBeGreaterThan(50);

    // Verificar keywords básicos
    expect(result.metadata.keywords.length).toBeGreaterThan(5);
    expect(result.metadata.keywords).toContain('glacier');
    expect(result.metadata.keywords).toContain('cryosphere');

    // Verificar versión
    expect(result.metadata.version).toMatch(/^\d{4}\.\d+$/);
  });

  it('el objeto es JSON-serializable (no throw)', () => {
    const result = buildZenodoMetadata([{ guia: 'Test' }], {});
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();
  });
});

describe('buildZenodoMetadata — protección legal de autoría', () => {
  it('protege autoría con CC-BY-4.0 forzado', () => {
    const result = buildZenodoMetadata([], {});
    expect(result.metadata.license).toBe('cc-by-4.0');
  });

  it('creators se ordenan alfabéticamente (trazabilidad)', () => {
    const result = buildZenodoMetadata(
      [
        { guia: 'ZZZ' },
        { guia: 'AAA' },
        { guia: 'MMM' },
      ],
      {}
    );
    expect(result.metadata.creators).toEqual([
      { name: 'AAA' },
      { name: 'MMM' },
      { name: 'ZZZ' },
    ]);
  });

  it('descripción menciona origen Chagra (trazabilidad)', () => {
    const result = buildZenodoMetadata([{ guia: 'Ana' }], {});
    expect(result.metadata.description).toMatch(/Chagra/);
    expect(result.metadata.description).toMatch(/Origen/i);
  });

  it('descripción menciona licencia CC-BY-4.0 (transparencia)', () => {
    const result = buildZenodoMetadata([{ guia: 'Ana' }], {});
    expect(result.metadata.description).toMatch(/CC-BY-4\.0/);
  });
});
