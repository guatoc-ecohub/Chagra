import { describe, it, expect } from 'vitest';
import {
  generateCuadernoFinca,
  buildCuadernoFilename,
  buildFincaData,
  CUADERNO_VERSION,
} from '../cuadernoPDF';

// ─── Mock fincaData con 5 plantas para smoke test ─────────────────────────

const mockFincaData = {
  finca: {
    slug: 'guatoc',
    nombre: 'Guatoc',
    operador: 'Guatoc Ecohub',
    coords: [4.5167, -73.9333],
    altitud: 2400,
    biocultural_zone: 'andino_alto_páramo',
    descripcion_corta: 'Laboratorio de conservación + restauración de páramo.',
  },
  operatorName: 'Miguel Restrepo',
  operatorRole: 'Operador de Campo',
  plants: [
    {
      id: 'plant-aaaa1111',
      attributes: { name: 'Quinoa lote A', status: 'activo', created: 1716700000 },
      relationships: { plant_type: { data: [{ id: 'sp-1', attributes: { name: 'Chenopodium quinoa' } }] } },
    },
    {
      id: 'plant-bbbb2222',
      attributes: { name: 'Maíz capia', status: 'activo', created: 1716800000 },
      relationships: { plant_type: { data: [{ id: 'sp-2', attributes: { name: 'Zea mays' } }] } },
    },
    {
      id: 'plant-cccc3333',
      attributes: { name: 'Papa criolla', status: 'activo' },
      relationships: { plant_type: { data: [{ id: 'sp-3', attributes: { name: 'Solanum phureja' } }] } },
      _pending: true,
    },
    {
      id: 'plant-dddd4444',
      attributes: { name: 'Cilantro', status: 'cosechado', created: 1716900000 },
    },
    {
      id: 'plant-eeee5555',
      attributes: { name: 'Frijol bola roja', status: 'activo' },
    },
  ],
  lands: [
    {
      id: 'land-ffff6666',
      attributes: { name: 'Cama elevada 1', status: 'activo', land_type: 'bed' },
    },
    {
      id: 'land-gggg7777',
      attributes: { name: 'Invernadero norte', status: 'activo', land_type: 'greenhouse' },
    },
  ],
  structures: [],
  materials: [
    { id: 'mat-1', attributes: { name: 'Biol de gallinaza' } },
  ],
  logs: [
    {
      id: 'log-1',
      type: 'log--seeding',
      attributes: { name: 'Siembra Quinoa lote A', timestamp: 1716700000 },
      timestamp: 1716700000,
      asset_id: 'plant-aaaa1111',
    },
    {
      id: 'log-2',
      type: 'log--input',
      attributes: {
        name: 'Aplicación de Biol de gallinaza',
        timestamp: 1716800000,
        quantity: [{ attributes: { value: { decimal: '2.5' }, unit: 'l' } }],
      },
      timestamp: 1716800000,
      asset_id: 'plant-bbbb2222',
    },
    {
      id: 'log-3',
      type: 'log--harvest',
      attributes: {
        name: 'Cosecha Cilantro',
        timestamp: 1716900000,
        quantity: [{ attributes: { value: { decimal: '0.8' }, unit: 'kg' } }],
      },
      timestamp: 1716900000,
      asset_id: 'plant-dddd4444',
    },
  ],
  period: { from: 1716700000, to: 1716950000 },
};

describe('cuadernoPDF', () => {
  it('exporta CUADERNO_VERSION estable', () => {
    expect(CUADERNO_VERSION).toBe('1');
  });

  describe('generateCuadernoFinca', () => {
    it('devuelve un Blob no vacío con MIME application/pdf', () => {
      const blob = generateCuadernoFinca(mockFincaData);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      // Un PDF mínimo con portada + secciones supera holgadamente 1 KB.
      expect(blob.size).toBeGreaterThan(1024);
    });

    it('produce bytes que arrancan con la firma %PDF-', async () => {
      const blob = generateCuadernoFinca(mockFincaData);
      const arrayBuffer = await blob.arrayBuffer();
      const head = new Uint8Array(arrayBuffer).slice(0, 5);
      // %PDF- en ASCII: 0x25 0x50 0x44 0x46 0x2D
      expect(Array.from(head)).toEqual([0x25, 0x50, 0x44, 0x46, 0x2D]);
    });

    it('no revienta cuando la finca está vacía (sin plantas/zonas/logs)', () => {
      const emptyBlob = generateCuadernoFinca({
        finca: { nombre: 'Finca vacía', slug: 'vacia' },
        operatorName: 'Sin operador',
        plants: [],
        lands: [],
        structures: [],
        materials: [],
        logs: [],
      });
      expect(emptyBlob).toBeInstanceOf(Blob);
      expect(emptyBlob.type).toBe('application/pdf');
      expect(emptyBlob.size).toBeGreaterThan(512);
    });

    it('tolera fincaData=undefined sin lanzar', () => {
      const blob = generateCuadernoFinca(undefined);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });
  });

  describe('buildCuadernoFilename', () => {
    it('construye nombre con slug + fecha YYYY-MM-DD-HHMM en hora local', () => {
      // Construimos la fecha con componentes locales para que el assertion no
      // dependa del huso horario del CI.
      const fixedDate = new Date(2026, 4, 28, 15, 42, 0); // 28 mayo 2026 15:42 local
      const name = buildCuadernoFilename({ slug: 'guatoc', nombre: 'Guatoc' }, fixedDate);
      expect(name).toBe('cuaderno-chagra-guatoc-2026-05-28-1542.pdf');
    });

    it('genera fallback "finca" cuando no hay slug ni nombre', () => {
      const fixedDate = new Date(2026, 0, 1, 8, 0, 0); // 1 enero 2026 08:00 local
      const name = buildCuadernoFilename(null, fixedDate);
      expect(name).toBe('cuaderno-chagra-finca-2026-01-01-0800.pdf');
    });

    it('normaliza acentos y caracteres especiales en el slug', () => {
      const fixedDate = new Date(2026, 4, 28, 12, 0, 0);
      const name = buildCuadernoFilename(
        { nombre: 'Finca Árbol del Niño' },
        fixedDate,
      );
      expect(name).toBe('cuaderno-chagra-finca-arbol-del-nino-2026-05-28-1200.pdf');
    });
  });

  describe('buildFincaData', () => {
    it('arma el shape esperado desde caches mockeados', async () => {
      const fakeAssetCache = {
        getByType: async (type) => {
          if (type === 'plant') return [{ id: 'p1', attributes: { name: 'P1' } }];
          if (type === 'land') return [{ id: 'l1', attributes: { name: 'L1', land_type: 'bed' } }];
          return [];
        },
      };
      const fakeLogCache = {
        getAll: async () => [
          { id: 'log-old', type: 'log--seeding', timestamp: 1700000000 },
          { id: 'log-new', type: 'log--harvest', timestamp: 1716900000 },
        ],
      };
      const finca = { slug: 'guatoc', nombre: 'Guatoc' };
      const operator = { name: 'Op', role: 'Operador' };

      const data = await buildFincaData(/** @type {any} */ ({
        assetCache: fakeAssetCache,
        logCache: fakeLogCache,
        finca,
        operator,
      }));

      expect(data.finca).toEqual(finca);
      expect(data.operatorName).toBe('Op');
      expect(data.operatorRole).toBe('Operador');
      expect(data.plants).toHaveLength(1);
      expect(data.lands).toHaveLength(1);
      expect(data.logs).toHaveLength(2);
      expect(data.period).not.toBeNull();
      expect(data.period.from).toBe(1700000000);
      expect(data.period.to).toBeGreaterThan(data.period.from);
    });

    it('period es null cuando no hay logs', async () => {
      const data = await buildFincaData(/** @type {any} */ ({
        assetCache: { getByType: async () => [] },
        logCache: { getAll: async () => [] },
        finca: {},
        operator: {},
      }));
      expect(data.period).toBeNull();
    });
  });
});
