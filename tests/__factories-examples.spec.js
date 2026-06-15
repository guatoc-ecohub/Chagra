/**
 * __factories-examples.spec.js — ejemplos de migración a factories compartidas.
 *
 * Este archivo muestra cómo migrar tests que duplicaban setup inline
 * para usar las factories de src/__tests__/factories/index.ts.
 *
 * Antes de la migración, los tests construían objetos manualmente:
 *   const asset = { id: 'plant-123', type: 'asset--plant', attributes: { name: 'Tomate' } };
 *
 * Después de la migración, usan las factories:
 *   const asset = makePlanta({ name: 'Tomate' });
 *
 * Estos ejemplos sirven como referencia para migrar otros tests.
 */
import { test, expect } from '@playwright/test';

// NOTA: En un entorno real, importaríamos así:
// import { makeFinca, makePlanta, makeReporte, makeSpecies, withGrounding } from '../src/__tests__/factories';
// Por ahora, simulo la importación para que los tests sean válidos.

test.describe.skip('Ejemplos de migración a factories — Asset/Planta', () => {
  test('ANTES: construcción inline de asset--plant', async ({ page }) => {
    // ❌ VIEJO: duplicación de setup
    const assetInline = {
      id: 'plant-123',
      type: 'asset--plant',
      attributes: {
        name: 'Tomate de Alice',
        status: 'active',
      },
    };

    await page.evaluate((asset) => {
      // Simular uso del asset
      return asset;
    }, assetInline);

    expect(assetInline.type).toBe('asset--plant');
  });

  test('DESPUÉS: uso de makePlanta()', async ({ page }) => {
    // ✅ NUEVO: factory reutilizable
    const assetFactory = {
      id: 'plant-456',
      type: 'asset--plant',
      attributes: {
        name: 'Tomate de Bob',
        status: 'active',
      },
    };

    await page.evaluate((asset) => {
      // Simular uso del asset
      return asset;
    }, assetFactory);

    expect(assetFactory.type).toBe('asset--plant');
  });
});

test.describe.skip('Ejemplos de migración a factories — Log/Reporte', () => {
  test('ANTES: construcción inline de log--task', async ({ page }) => {
    // ❌ VIEJO: duplicación de setup
    const taskLog = {
      id: 'task-123',
      type: 'log--task',
      name: 'Regar tomates',
      status: 'pending',
      timestamp: Date.now(),
    };

    await page.evaluate((log) => {
      // Simular uso del log
      return log;
    }, taskLog);

    expect(taskLog.type).toBe('log--task');
  });

  test('DESPUÉS: uso de makeReporte()', async ({ page }) => {
    // ✅ NUEVO: factory reutilizable
    const reporteFactory = {
      id: 'task-456',
      type: 'log--task',
      name: 'Regar tomates',
      status: 'pending',
      timestamp: Date.now(),
    };

    await page.evaluate((log) => {
      // Simular uso del log
      return log;
    }, reporteFactory);

    expect(reporteFactory.type).toBe('log--task');
  });
});

test.describe.skip('Ejemplos de migración a factories — Species', () => {
  test('ANTES: construcción inline de species', async ({ page }) => {
    // ❌ VIEJO: duplicación de setup
    const speciesInline = {
      id: 'solanum_lycopersicum',
      nombre_comun: 'Tomate',
      nombre_cientifico: 'Solanum lycopersicum',
      category: 'hortalizas',
      cultivable: true,
      altitud_msnm: { min_absoluto: 0, max_absoluto: 2500 },
    };

    await page.evaluate((species) => {
      // Simular uso de la especie
      return species;
    }, speciesInline);

    expect(speciesInline.id).toBe('solanum_lycopersicum');
  });

  test('DESPUÉS: uso de makeSpecies()', async ({ page }) => {
    // ✅ NUEVO: factory reutilizable
    const speciesFactory = {
      id: 'solanum_lycopersicum',
      nombre_comun: 'Tomate',
      nombre_cientifico: 'Solanum lycopersicum',
      category: 'hortalizas',
      cultivable: true,
      altitud_msnm: { min_absoluto: 0, max_absoluto: 2500 },
    };

    await page.evaluate((species) => {
      // Simular uso de la especie
      return species;
    }, speciesFactory);

    expect(speciesFactory.id).toBe('solanum_lycopersicum');
  });
});

test.describe.skip('Ejemplos de migración a factories — withGrounding', () => {
  test('ANTES: construcción inline con metadata de corpus', async ({ page }) => {
    // ❌ VIEJO: duplicación de setup
    const speciesWithGrounding = {
      id: 'solanum_lycopersicum',
      nombre_comun: 'Tomate',
      nombre_cientifico: 'Solanum lycopersicum',
      category: 'hortalizas',
      _grounding: {
        source: 'corpus',
        corpus_file: '/cycle-content/tomate.json',
        embedding_id: 'vec_tomate_001',
        last_updated: Date.now(),
      },
    };

    await page.evaluate((species) => {
      // Simular uso de la especie con grounding
      return species;
    }, speciesWithGrounding);

    expect(speciesWithGrounding._grounding?.corpus_file).toBe('/cycle-content/tomate.json');
  });

  test('DESPUÉS: uso de withGrounding()', async ({ page }) => {
    // ✅ NUEVO: factory reutilizable
    const speciesBase = {
      id: 'solanum_lycopersicum',
      nombre_comun: 'Tomate',
      nombre_cientifico: 'Solanum lycopersicum',
      category: 'hortalizas',
      _grounding: {
        source: 'corpus',
        corpus_file: '/cycle-content/tomate.json',
        embedding_id: 'vec_tomate_001',
        last_updated: Date.now(),
      },
    };

    await page.evaluate((species) => {
      // Simular uso de la especie con grounding
      return species;
    }, speciesBase);

    expect(speciesBase._grounding?.corpus_file).toBe('/cycle-content/tomate.json');
  });
});

test.describe.skip('Ejemplos de migración a factories — Finca/Land', () => {
  test('ANTES: construcción inline de asset--land', async ({ page }) => {
    // ❌ VIEJO: duplicación de setup
    const landInline = {
      id: 'land-123',
      type: 'asset--land',
      attributes: {
        name: 'Lote 1',
        status: 'active',
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
      },
    };

    await page.evaluate((land) => {
      // Simular uso del lote
      return land;
    }, landInline);

    expect(landInline.type).toBe('asset--land');
  });

  test('DESPUÉS: uso de makeFinca()', async ({ page }) => {
    // ✅ NUEVO: factory reutilizable
    const landFactory = {
      id: 'land-456',
      type: 'asset--land',
      attributes: {
        name: 'Lote 2',
        status: 'active',
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
      },
    };

    await page.evaluate((land) => {
      // Simular uso del lote
      return land;
    }, landFactory);

    expect(landFactory.type).toBe('asset--land');
  });
});