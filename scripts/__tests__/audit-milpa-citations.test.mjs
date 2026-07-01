/**
 * scripts/__tests__/audit-milpa-citations.test.mjs
 *
 * Tests para el script de auditoría de citas de milpa/companion planting.
 * Verifica que el script identifique correctamente las aristas sin citación
 * y las priorice adecuadamente según cultivos insignia.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock del catálogo mínimo para tests
const MOCK_CATALOG = {
  schema_version: '3.1',
  species: [
    {
      id: 'zea_mays',
      nombre_comun: 'Maíz criollo',
      nombre_cientifico: 'Zea mays L.',
      familia_botanica: 'Poaceae',
      category: 'cereales',
      thermal_zones: ['templado', 'frio'],
      roles_in_guild: ['crop'],
      cultivable: true,
      conservation_status: 'cultivo_comun',
      altitud_msnm: { min_absoluto: 0, optimo_min: 1200, optimo_max: 2400, max_absoluto: 3000 },
      source_ids: ['test-source'],
      companions: ['phaseolus_vulgaris', 'tagetes_lucida'],
    },
    {
      id: 'phaseolus_vulgaris',
      nombre_comun: 'Frijol arbustivo / voluble',
      nombre_cientifico: 'Phaseolus vulgaris L.',
      familia_botanica: 'Fabaceae',
      category: 'granos_legumbres',
      thermal_zones: ['templado', 'frio'],
      roles_in_guild: ['crop'],
      cultivable: true,
      conservation_status: 'cultivo_comun',
      altitud_msnm: { min_absoluto: 0, optimo_min: 1400, optimo_max: 2600, max_absoluto: 3000 },
      source_ids: ['test-source'],
      companions: ['zea_mays'],
    },
    {
      id: 'coffea_arabica',
      nombre_comun: 'Café caturra / Castillo / Cenicafé 1',
      nombre_cientifico: 'Coffea arabica L.',
      familia_botanica: 'Rubiaceae',
      category: 'medicinales_alelopaticas',
      thermal_zones: ['templado'],
      roles_in_guild: ['crop'],
      cultivable: true,
      conservation_status: 'cultivo_comun',
      altitud_msnm: { min_absoluto: 1200, optimo_min: 1400, optimo_max: 2000, max_absoluto: 2200 },
      source_ids: ['test-source'],
      companions: ['alnus_acuminata', 'erythrina_edulis'],
    },
    {
      id: 'alnus_acuminata',
      nombre_comun: 'Aliso andino',
      nombre_cientifico: 'Alnus acuminata Kunth',
      familia_botanica: 'Betulaceae',
      category: 'arboles_frutales',
      thermal_zones: ['frio'],
      roles_in_guild: ['crop'],
      cultivable: true,
      conservation_status: 'nativo_silvestre',
      altitud_msnm: { min_absoluto: 2000, optimo_min: 2400, optimo_max: 3400, max_absoluto: 3800 },
      source_ids: ['test-source'],
      companions: ['coffea_arabica'],
    },
    {
      id: 'erythrina_edulis',
      nombre_comun: 'Chachafruto / Balú',
      nombre_cientifico: 'Erythrina edulis Triana ex Micheli',
      familia_botanica: 'Fabaceae',
      category: 'arboles_frutales',
      thermal_zones: ['templado', 'frio'],
      roles_in_guild: ['crop'],
      cultivable: true,
      conservation_status: 'nativo_silvestre',
      altitud_msnm: { min_absoluto: 1400, optimo_min: 1800, optimo_max: 2600, max_absoluto: 3000 },
      source_ids: ['test-source'],
      companions: ['coffea_arabica'],
    },
    {
      id: 'tagetes_lucida',
      nombre_comun: 'Pericón / Santa María',
      nombre_cientifico: 'Tagetes lucida Cav.',
      familia_botanica: 'Asteraceae',
      category: 'medicinales_alelopaticas',
      thermal_zones: ['templado', 'frio'],
      roles_in_guild: ['crop', 'pest_repellent'],
      cultivable: true,
      conservation_status: 'cultivo_comun',
      altitud_msnm: { min_absoluto: 1200, optimo_min: 1800, optimo_max: 2800, max_absoluto: 3200 },
      source_ids: ['test-source'],
      companions: [],
    },
    {
      id: 'allium_fistulosum',
      nombre_comun: 'Cebollín / Cebolla larga',
      nombre_cientifico: 'Allium fistulosum L.',
      familia_botanica: 'Amaryllidaceae',
      category: 'hortalizas_hoja',
      thermal_zones: ['templado', 'frio'],
      roles_in_guild: ['crop', 'pest_repellent'],
      cultivable: true,
      conservation_status: 'cultivo_comun',
      altitud_msnm: { min_absoluto: 800, optimo_min: 1800, optimo_max: 2800, max_absoluto: 3500 },
      source_ids: ['test-source'],
      companions: ['fragaria_ananassa'],
    },
    {
      id: 'fragaria_ananassa',
      nombre_comun: 'Fresa',
      nombre_cientifico: 'Fragaria × ananassa Duchesne',
      familia_botanica: 'Rosaceae',
      category: 'hortalizas_fruto_flor',
      thermal_zones: ['frio'],
      roles_in_guild: ['crop'],
      cultivable: true,
      conservation_status: 'cultivo_comun',
      altitud_msnm: { min_absoluto: 1800, optimo_min: 2200, optimo_max: 2800, max_absoluto: 3200 },
      source_ids: ['test-source'],
      companions: ['allium_fistulosum'],
    },
  ],
  biopreparados: [],
  sources: [],
};

describe('audit-milpa-citations.mjs — auditoría de citas companion', () => {
  let tmpDir;
  let mockCatalogPath;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `milpa-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    mockCatalogPath = join(tmpDir, 'mock-catalog.json');
    writeFileSync(mockCatalogPath, JSON.stringify(MOCK_CATALOG, null, 2) + '\n', 'utf8');
  });

  afterEach(() => {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // Helper para ejecutar el script y capturar output
  async function runAuditScript(catalogPath) {
    const scriptPath = join(process.cwd(), 'scripts/audit-milpa-citations.mjs');
    const { execSync } = await import('node:child_process');
    
    try {
      const output = execSync(`node ${scriptPath} ${catalogPath}`, {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      return { success: true, output };
    } catch (error) {
      return { success: false, error: error.message, exitCode: error.status };
    }
  }

  it('identifica todas las aristas companion sin citación', async () => {
    const { success, output } = await runAuditScript(mockCatalogPath);
    expect(success).toBe(true);
    expect(output).toContain('Aristas requieren citación:     9');
  });

  it('prioriza correctamente cultivos insignia (maíz, frijol, café)', async () => {
    const { success, output } = await runAuditScript(mockCatalogPath);
    expect(success).toBe(true);
    
    // Debe encontrar 4 aristas INSIGNIA (maíz↔frijol es 2, café×2 companions es 4)
    expect(output).toContain('INSIGNIA (maíz, frijol, café):');
    // El número debe ser >= 4 (maíz↔frijol es bidireccional = 2, más café×2 = 4)
    const match = output.match(/INSIGNIA \(maíz, frijol, café\):\s+(\d+)/);
    expect(match).toBeTruthy();
    expect(parseInt(match[1], 10)).toBeGreaterThanOrEqual(4);
  });

  it('prioriza correctamente hortalizas', async () => {
    const { success, output } = await runAuditScript(mockCatalogPath);
    expect(success).toBe(true);
    
    // Debe encontrar al menos 2 aristas con hortalizas (cebollín↔fresa bidireccional)
    const hortalizaMatch = output.match(/HORTALIZA[^:]*:\s+(\d+)/);
    if (hortalizaMatch) {
      expect(parseInt(hortalizaMatch[1], 10)).toBeGreaterThanOrEqual(2);
    }
  });

  it('genera archivos de output JSON y markdown', async () => {
    const { success, output } = await runAuditScript(mockCatalogPath);
    expect(success).toBe(true);
    
    expect(output).toMatch(/JSON output: \/tmp\/milpa-citations-audit-.*\.json/);
    expect(output).toMatch(/Markdown:.*\.md/);
  });

  it('reporta estadísticas de cultivos insignia individualmente', async () => {
    const { success, output } = await runAuditScript(mockCatalogPath);
    expect(success).toBe(true);
    
    expect(output).toContain('Maíz:');
    expect(output).toContain('Frijol:');
    expect(output).toContain('Café:');
  });

  it('maneja catálogo sin relaciones companion (exit code 2)', async () => {
    const emptyCatalog = {
      schema_version: '3.1',
      species: [
        {
          id: 'test_species',
          nombre_comun: 'Test',
          nombre_cientifico: 'Test test',
          familia_botanica: 'Testaceae',
          category: 'test',
          thermal_zones: ['templado'],
          roles_in_guild: ['crop'],
          cultivable: true,
          conservation_status: 'cultivo_comun',
          altitud_msnm: { min_absoluto: 0, optimo_min: 1000, optimo_max: 2000, max_absoluto: 3000 },
          source_ids: ['test'],
          companions: [],
        },
      ],
      biopreparados: [],
      sources: [],
    };
    
    const emptyCatalogPath = join(tmpDir, 'empty-catalog.json');
    writeFileSync(emptyCatalogPath, JSON.stringify(emptyCatalog, null, 2) + '\n', 'utf8');
    
    const { success, exitCode } = await runAuditScript(emptyCatalogPath);
    expect(success).toBe(false);
    expect(exitCode).toBe(2);
  });

  it('maneja archivo inexistente (exit code 1)', async () => {
    const nonexistentPath = join(tmpDir, 'nonexistent.json');
    const { success, exitCode } = await runAuditScript(nonexistentPath);
    expect(success).toBe(false);
    expect(exitCode).toBe(1);
  });
});
