/**
 * episodicMemoryService.test.js — TIER 2 #6: memoria episódica activa.
 *
 * Garantías que se prueban (TDD):
 *   1. CON historial relevante a la query → el bloque se inyecta con los
 *      eventos REALES (fecha de siembra, etapa, días) — cero invención.
 *   2. SIN historial (o historial irrelevante a la query) → no-op ('').
 *   3. ANTICIPACIÓN solo con dato real: transición de etapa inminente
 *      (fenología desde la fecha de siembra REAL) y recurrencia estacional
 *      (manejo de plagas registrado por estas fechas en temporada pasada).
 *      Sin plantilla fenológica ni historial estacional → sin señales.
 *   4. ANTI-SPAM: máximo EPISODIC_MAX_ANTICIPATIONS señales.
 *   5. Degradación limpia: si la lectura de IndexedDB falla → ''.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/farmProcessCache', () => ({
  listFarmProcesses: vi.fn(),
  getFarmEvents: vi.fn(),
}));

import {
  buildEpisodicMemoryBlock,
  buildEpisodicMemoryContext,
  matchRelevantProcesses,
  EPISODIC_MAX_ANTICIPATIONS,
} from '../episodicMemoryService.js';
import { listFarmProcesses, getFarmEvents } from '../../db/farmProcessCache';

const DAY = 86400000;
// "Hoy" fijo para tests deterministas: 10 de junio de 2026, 12:00 COT.
const NOW = new Date('2026-06-10T12:00:00-05:00').getTime();

const mkProcess = (over = {}, attrs = {}) => ({
  process_id: over.process_id || `proc_${Math.random().toString(36).slice(2)}`,
  type: 'farm_process',
  attributes: {
    process_type: 'sowing',
    subject_kind: 'aggregate',
    subject_slug: 'zea_mays',
    subject_label: 'Maíz',
    quantity: 100,
    unit: 'semillas',
    location_land_asset_id: 'land-1',
    status: 'active',
    current_stage: 'vegetative',
    created_at: NOW - 40 * DAY,
    updated_at: NOW - 2 * DAY,
    ...attrs,
  },
});

const SPECIES_ENTITY_MAIZ = {
  mentioned: 'maíz',
  kind: 'species',
  canonical_id: 'zea_mays',
  nombre_comun: 'Maíz',
  nombre_cientifico: 'Zea mays',
  confidence: 0.95,
};

describe('matchRelevantProcesses', () => {
  it('matchea por canonical_id (slug) de la entidad resuelta', () => {
    const procs = [mkProcess(), mkProcess({}, { subject_slug: 'coffea_arabica', subject_label: 'Café' })];
    const out = matchRelevantProcesses({
      query: '¿cómo abono esto?',
      resolvedEntities: [SPECIES_ENTITY_MAIZ],
      processes: procs,
    });
    expect(out).toHaveLength(1);
    expect(out[0].attributes.subject_slug).toBe('zea_mays');
  });

  it('matchea por texto de la query (sin NLU) contra subject_label, con acentos normalizados', () => {
    const procs = [mkProcess({}, { subject_label: 'Maíz amarillo' })];
    const out = matchRelevantProcesses({ query: 'como va mi maiz', resolvedEntities: null, processes: procs });
    expect(out).toHaveLength(1);
  });

  it('NO matchea procesos de otra especie (query irrelevante → vacío)', () => {
    const procs = [mkProcess()];
    const out = matchRelevantProcesses({ query: '¿qué le sirve a la papa?', resolvedEntities: null, processes: procs });
    expect(out).toHaveLength(0);
  });
});

describe('buildEpisodicMemoryBlock — memoria relevante', () => {
  it('CON historial: inyecta bloque con fecha de siembra real, días y etapa', () => {
    const block = buildEpisodicMemoryBlock({
      query: '¿cómo va mi maíz?',
      resolvedEntities: [SPECIES_ENTITY_MAIZ],
      processes: [mkProcess({ process_id: 'p1' })],
      eventsByProcess: {},
      now: NOW,
    });
    expect(block).toContain('MEMORIA DE TU FINCA');
    expect(block).toContain('Maíz');
    expect(block).toContain('hace 40 días');
    expect(block).toMatch(/etapa/i);
    // Regla anti-invención presente
    expect(block).toMatch(/JAMÁS inventes/i);
  });

  it('SIN historial → no-op (cadena vacía)', () => {
    const block = buildEpisodicMemoryBlock({
      query: '¿cómo va mi maíz?',
      resolvedEntities: [SPECIES_ENTITY_MAIZ],
      processes: [],
      eventsByProcess: {},
      now: NOW,
    });
    expect(block).toBe('');
  });

  it('historial IRRELEVANTE a la query → no-op (no spamea con toda la finca)', () => {
    const block = buildEpisodicMemoryBlock({
      query: '¿qué biopreparado sirve para la cebolla?',
      resolvedEntities: [],
      processes: [mkProcess()],
      eventsByProcess: {},
      now: NOW,
    });
    expect(block).toBe('');
  });

  it('incluye la última observación REAL registrada del proceso', () => {
    const block = buildEpisodicMemoryBlock({
      query: 'mi maíz',
      resolvedEntities: [SPECIES_ENTITY_MAIZ],
      processes: [mkProcess({ process_id: 'p1' })],
      eventsByProcess: {
        p1: [
          {
            event_id: 'e1',
            type: 'farm_process_event',
            attributes: {
              process_id: 'p1',
              event_type: 'observation',
              occurred_at: NOW - 5 * DAY,
              payload: { text: 'hojas amarillas en el borde del lote' },
            },
          },
        ],
      },
      now: NOW,
    });
    expect(block).toContain('hojas amarillas en el borde del lote');
  });

  it('NO menciona especies que no están en el historial (cero invención)', () => {
    const block = buildEpisodicMemoryBlock({
      query: 'mi maíz',
      resolvedEntities: [SPECIES_ENTITY_MAIZ],
      processes: [mkProcess()],
      eventsByProcess: {},
      now: NOW,
    });
    expect(block).not.toMatch(/café|tomate|papa/i);
  });
});

describe('buildEpisodicMemoryBlock — anticipación proactiva', () => {
  it('señala transición de etapa inminente con plantilla fenológica + fecha de siembra real', () => {
    // zea_mays a ≤1000 msnm: vegetative termina día 45, flowering arranca día 46.
    // Sembrado hace 44 días → flowering arranca en ~2 días (dentro de 14 días).
    const block = buildEpisodicMemoryBlock({
      query: 'mi maíz',
      resolvedEntities: [SPECIES_ENTITY_MAIZ],
      processes: [mkProcess({ process_id: 'p1' }, { created_at: NOW - 44 * DAY })],
      eventsByProcess: {},
      fincaAltitud: 800,
      now: NOW,
    });
    expect(block).toContain('ANTICIPACIÓN');
    expect(block).toMatch(/OJO/);
    expect(block).toMatch(/Floración/i);
  });

  it('sin plantilla fenológica para la especie → memoria sí, señal de etapa NO', () => {
    const block = buildEpisodicMemoryBlock({
      query: 'mi cidra',
      resolvedEntities: [{ ...SPECIES_ENTITY_MAIZ, canonical_id: 'sechium_edule', nombre_comun: 'Cidra', mentioned: 'cidra' }],
      processes: [mkProcess({ process_id: 'p1' }, { subject_slug: 'sechium_edule', subject_label: 'Cidra', created_at: NOW - 44 * DAY })],
      eventsByProcess: {},
      now: NOW,
    });
    expect(block).toContain('MEMORIA DE TU FINCA');
    expect(block).not.toMatch(/OJO/);
  });

  it('recurrencia estacional: manejo de plagas registrado por estas fechas en temporada pasada', () => {
    const lastYearSameMonth = NOW - 365 * DAY;
    const block = buildEpisodicMemoryBlock({
      query: 'mi maíz',
      resolvedEntities: [SPECIES_ENTITY_MAIZ],
      processes: [
        mkProcess({ process_id: 'p1' }),
        mkProcess(
          { process_id: 'p2' },
          {
            process_type: 'pest_management',
            status: 'completed',
            current_stage: 'pest_management',
            created_at: lastYearSameMonth,
            updated_at: lastYearSameMonth,
            unit: 'plantas',
          },
        ),
      ],
      eventsByProcess: {},
      now: NOW,
    });
    expect(block).toMatch(/temporada pasada/i);
    expect(block).toMatch(/manejo de plagas/i);
  });

  it('manejo de plagas FUERA de temporada (hace 4 meses) → sin señal estacional', () => {
    const fourMonthsAgo = NOW - 120 * DAY;
    const block = buildEpisodicMemoryBlock({
      query: 'mi maíz',
      resolvedEntities: [SPECIES_ENTITY_MAIZ],
      processes: [
        mkProcess({ process_id: 'p1' }),
        mkProcess(
          { process_id: 'p2' },
          {
            process_type: 'pest_management',
            status: 'completed',
            current_stage: 'pest_management',
            created_at: fourMonthsAgo,
            updated_at: fourMonthsAgo,
            unit: 'plantas',
          },
        ),
      ],
      eventsByProcess: {},
      now: NOW,
    });
    expect(block).not.toMatch(/temporada pasada/i);
  });

  it(`anti-spam: nunca más de ${EPISODIC_MAX_ANTICIPATIONS} señales de anticipación`, () => {
    const lastYear = NOW - 365 * DAY;
    const block = buildEpisodicMemoryBlock({
      query: 'mi maíz y mi fríjol y mi tomate',
      resolvedEntities: [
        SPECIES_ENTITY_MAIZ,
        { ...SPECIES_ENTITY_MAIZ, canonical_id: 'phaseolus_vulgaris', nombre_comun: 'Fríjol', mentioned: 'fríjol' },
        { ...SPECIES_ENTITY_MAIZ, canonical_id: 'solanum_lycopersicum', nombre_comun: 'Tomate', mentioned: 'tomate' },
      ],
      processes: [
        // 2 transiciones inminentes + 1 estacional = 3 candidatas
        mkProcess({ process_id: 'p1' }, { created_at: NOW - 44 * DAY }),
        mkProcess({ process_id: 'p2' }, { subject_slug: 'phaseolus_vulgaris', subject_label: 'Fríjol', created_at: NOW - 33 * DAY }),
        mkProcess(
          { process_id: 'p3' },
          {
            subject_slug: 'solanum_lycopersicum',
            subject_label: 'Tomate',
            process_type: 'pest_management',
            status: 'completed',
            current_stage: 'pest_management',
            created_at: lastYear,
            updated_at: lastYear,
          },
        ),
      ],
      eventsByProcess: {},
      fincaAltitud: 800,
      now: NOW,
    });
    const anticipSection = block.split('ANTICIPACIÓN')[1] || '';
    const lineas = anticipSection.split('\n').filter((l) => l.trim().startsWith('- '));
    expect(lineas.length).toBeLessThanOrEqual(EPISODIC_MAX_ANTICIPATIONS);
    expect(lineas.length).toBeGreaterThan(0);
  });
});

describe('buildEpisodicMemoryContext — loader con degradación limpia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lee farmProcessCache y arma el bloque', async () => {
    listFarmProcesses.mockResolvedValue([mkProcess({ process_id: 'p1' })]);
    getFarmEvents.mockResolvedValue([]);
    const block = await buildEpisodicMemoryContext({
      query: 'mi maíz',
      resolvedEntities: [SPECIES_ENTITY_MAIZ],
      now: NOW,
    });
    expect(block).toContain('MEMORIA DE TU FINCA');
    expect(listFarmProcesses).toHaveBeenCalled();
  });

  it('si IndexedDB falla → no-op silencioso (cadena vacía, sin throw)', async () => {
    listFarmProcesses.mockRejectedValue(new Error('IDB not available'));
    const block = await buildEpisodicMemoryContext({
      query: 'mi maíz',
      resolvedEntities: [SPECIES_ENTITY_MAIZ],
      now: NOW,
    });
    expect(block).toBe('');
  });

  it('sin procesos en la finca → no-op', async () => {
    listFarmProcesses.mockResolvedValue([]);
    const block = await buildEpisodicMemoryContext({
      query: 'mi maíz',
      resolvedEntities: [SPECIES_ENTITY_MAIZ],
      now: NOW,
    });
    expect(block).toBe('');
  });
});
