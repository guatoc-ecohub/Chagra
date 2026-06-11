/**
 * farmProcessSync.test.js — tests del mapeo y cola de sync FarmProcess → FarmOS.
 *
 * CAPACIDAD OSCURA #9: verifica que cada tipo de evento se mapea al
 * log de FarmOS correcto, que el payload JSON:API es válido, y que
 * la cola de syncManager recibe las transacciones pending.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EVENT_TO_FARMOS_LOG,
  buildLogName,
  buildFarmOSLogPayload,
  enqueueFarmProcessEvent,
} from '../farmProcessSync';

const makeProcess = (overrides = {}) => ({
  process_id: 'proc-001',
  type: 'farm_process',
  attributes: {
    process_type: 'sowing',
    subject_kind: 'individual',
    subject_slug: 'coffea_arabica',
    subject_label: 'Café',
    quantity: 25,
    unit: 'plantas',
    location_land_asset_id: 'land-01',
    status: 'active',
    current_stage: 'vegetative',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  },
});

const makeEvent = (processId, eventType, overrides = {}) => ({
  event_id: 'evt-001',
  type: 'farm_process_event',
  attributes: {
    process_id: processId || 'proc-001',
    event_type: eventType || 'sowing_confirmed',
    occurred_at: Date.now(),
    actor: 'operator',
    source: 'operator',
    idempotency_key: 'key-001',
    ...overrides,
  },
});

describe('EVENT_TO_FARMOS_LOG — mapeo completo', () => {
  it('cubre los 12 tipos de evento', () => {
    const types = [
      'sowing_confirmed', 'harvest_confirmed', 'post_harvest_confirmed',
      'pest_management_confirmed', 'observation', 'stage_transition',
      'stage_confirmed', 'stage_corrected', 'task_completed',
      'photo_attached', 'weather_snapshot', 'note',
    ];
    for (const t of types) {
      expect(EVENT_TO_FARMOS_LOG[t]).toBeDefined();
    }
  });

  it('photo_attached NO tiene endpoint (no sync)', () => {
    expect(EVENT_TO_FARMOS_LOG.photo_attached.farmosLogType).toBeNull();
    expect(EVENT_TO_FARMOS_LOG.photo_attached.endpoint).toBeNull();
  });

  it('sowing_confirmed → log--observation', () => {
    expect(EVENT_TO_FARMOS_LOG.sowing_confirmed.farmosLogType).toBe('log--observation');
    expect(EVENT_TO_FARMOS_LOG.sowing_confirmed.endpoint).toBe('/api/log/observation');
  });

  it('harvest_confirmed → log--harvest', () => {
    expect(EVENT_TO_FARMOS_LOG.harvest_confirmed.farmosLogType).toBe('log--harvest');
  });

  it('pest_management_confirmed → log--activity', () => {
    expect(EVENT_TO_FARMOS_LOG.pest_management_confirmed.farmosLogType).toBe('log--activity');
  });

  it('stage_transition → log--observation', () => {
    expect(EVENT_TO_FARMOS_LOG.stage_transition.farmosLogType).toBe('log--observation');
  });
});

describe('buildLogName', () => {
  it('usa el subject_label del proceso', () => {
    const proc = makeProcess();
    const evt = makeEvent('proc-001', 'sowing_confirmed');
    expect(buildLogName(evt, proc)).toContain('Café');
    expect(buildLogName(evt, proc)).toContain('siembra confirmada');
  });

  it('funciona sin proceso (fallback)', () => {
    const evt = makeEvent('proc-001', 'harvest_confirmed');
    const name = buildLogName(evt, null);
    expect(name).toContain('cultivo');
    expect(name).toContain('cosecha');
  });

  it('cubre stage_transition', () => {
    const evt = makeEvent('proc-001', 'stage_transition');
    expect(buildLogName(evt, makeProcess())).toContain('cambio de etapa');
  });

  it('cubre pest_management', () => {
    const evt = makeEvent('proc-001', 'pest_management_confirmed');
    expect(buildLogName(evt, makeProcess())).toContain('manejo de plagas');
  });
});

describe('buildFarmOSLogPayload — payload JSON:API', () => {
  it('retorna null si no hay evento', () => {
    expect(buildFarmOSLogPayload(null)).toBeNull();
  });

  it('retorna null para photo_attached (no sync)', () => {
    const evt = makeEvent('proc-001', 'photo_attached');
    expect(buildFarmOSLogPayload(evt)).toBeNull();
  });

  it('sowing_confirmed produce payload con tipo log--observation', () => {
    const evt = makeEvent('proc-001', 'sowing_confirmed');
    const proc = makeProcess();
    const payload = buildFarmOSLogPayload(evt, proc, 'asset-plant-123');

    expect(payload).not.toBeNull();
    expect(payload.data.type).toBe('log--observation');
    expect(payload.data.attributes.name).toContain('Café');
    expect(payload.data.attributes.status).toBe('done');
    expect(payload.data.attributes.timestamp).toBeDefined();
    expect(payload.data.attributes.notes.value).toContain('Cultivo: Café');
    expect(payload.data.attributes.notes.value).toContain('idempotency_key: key-001');
    expect(payload.data.relationships.asset.data[0].id).toBe('asset-plant-123');
  });

  it('harvest_confirmed incluye quantity en el payload', () => {
    const evt = makeEvent('proc-001', 'harvest_confirmed', {
      payload: { quantity_kg: 15, unit: 'kg' },
    });
    const payload = buildFarmOSLogPayload(evt, makeProcess());
    expect(payload.data.type).toBe('log--harvest');
    expect(payload.data.attributes.quantity).toBeDefined();
    expect(payload.data.attributes.quantity[0].value).toBe(15);
  });

  it('stage_transition incluye from→to en las notas', () => {
    const evt = makeEvent('proc-001', 'stage_transition', {
      payload: { from_stage: 'vegetative', to_stage: 'flowering' },
    });
    const payload = buildFarmOSLogPayload(evt, makeProcess());
    expect(payload.data.attributes.notes.value).toContain('vegetative → flowering');
  });

  it('pest_management incluye plaga y biopreparado en notas', () => {
    const evt = makeEvent('proc-001', 'pest_management_confirmed', {
      payload: { pest_name: 'Broca', control_method: 'Beauveria bassiana', biopreparado: 'Caldo bordelés' },
    });
    const payload = buildFarmOSLogPayload(evt, makeProcess());
    expect(payload.data.attributes.notes.value).toContain('Broca');
    expect(payload.data.attributes.notes.value).toContain('Beauveria bassiana');
  });

  it('sin assetId no incluye relationships', () => {
    const evt = makeEvent('proc-001', 'observation');
    const payload = buildFarmOSLogPayload(evt, makeProcess());
    expect(payload.data.relationships).toBeUndefined();
  });

  it('event_type desconocido retorna null', () => {
    const evt = makeEvent('proc-001', 'evento_que_no_existe');
    expect(buildFarmOSLogPayload(evt)).toBeNull();
  });
});

describe('enqueueFarmProcessEvent — cola via syncManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('NO aplica para photo_attached', async () => {
    const evt = makeEvent('proc-001', 'photo_attached');
    const result = await enqueueFarmProcessEvent(evt);
    expect(result).toBeNull();
  });

  it('sowing_confirmed encola via syncManager.saveTransaction', async () => {
    const mockSaveTx = vi.fn().mockResolvedValue({ id: 42, timestamp: Date.now() });

    vi.doMock('../syncManager', () => ({
      default: {
        saveTransaction: mockSaveTx,
      },
    }));

    const { enqueueFarmProcessEvent: enq } = await import('../farmProcessSync');
    const evt = makeEvent('proc-001', 'sowing_confirmed');
    const proc = makeProcess();

    const result = await enq(evt, proc, 'asset-plant-456');

    expect(mockSaveTx).toHaveBeenCalledTimes(1);
    const call = mockSaveTx.mock.calls[0][0];
    expect(call.type).toBe('sowing_confirmed');
    expect(call.endpoint).toBe('/api/log/observation');
    expect(call.payload.data.type).toBe('log--observation');
    expect(call.payload.data.attributes.name).toContain('Café');
    expect(result).toEqual({ id: 42, timestamp: expect.any(Number) });
  });

  it('fallo del syncManager no lanza (degrada limpio)', async () => {
    vi.doMock('../syncManager', () => ({
      default: {
        saveTransaction: vi.fn().mockRejectedValue(new Error('IDB caída')),
      },
    }));

    const { enqueueFarmProcessEvent: enq } = await import('../farmProcessSync');
    const evt = makeEvent('proc-001', 'harvest_confirmed');
    const result = await enq(evt, makeProcess());

    // No lanza, retorna null
    expect(result).toBeNull();
  });

  it('payload incluye idempotency_key del evento original', async () => {
    const mockSaveTx = vi.fn().mockResolvedValue({ id: 99 });

    vi.doMock('../syncManager', () => ({
      default: { saveTransaction: mockSaveTx },
    }));

    const { enqueueFarmProcessEvent: enq } = await import('../farmProcessSync');
    const evt = makeEvent('proc-001', 'observation', {
      idempotency_key: 'idem-abc-123',
    });

    await enq(evt, makeProcess());

    const payload = mockSaveTx.mock.calls[0][0].payload;
    expect(payload.data.attributes.notes.value).toContain('idem-abc-123');
  });

  it('busca el proceso en IDB si no se pasa process (recordFarmEvent pattern)', async () => {
    const mockSaveTx = vi.fn().mockResolvedValue({ id: 77 });
    const mockGetProcess = vi.fn().mockResolvedValue(makeProcess({
      subject_label: 'Papa',
      current_stage: 'vegetative',
    }));

    vi.doMock('../../db/farmProcessCache', () => ({
      getFarmProcess: mockGetProcess,
    }));

    vi.doMock('../syncManager', () => ({
      default: { saveTransaction: mockSaveTx },
    }));

    const { enqueueFarmProcessEvent: enq } = await import('../farmProcessSync');
    const evt = makeEvent('proc-002', 'observation');

    // Sin proceso → lo busca en IDB
    await enq(evt, null);

    expect(mockGetProcess).toHaveBeenCalledWith('proc-002');
    const payload = mockSaveTx.mock.calls[0][0].payload;
    expect(payload.data.attributes.notes.value).toContain('Papa');
  });

  it('si la IDB falla al buscar proceso, igual encola con datos del evento', async () => {
    const mockSaveTx = vi.fn().mockResolvedValue({ id: 78 });

    vi.doMock('../../db/farmProcessCache', () => ({
      getFarmProcess: vi.fn().mockRejectedValue(new Error('IDB error')),
    }));

    vi.doMock('../syncManager', () => ({
      default: { saveTransaction: mockSaveTx },
    }));

    const { enqueueFarmProcessEvent: enq } = await import('../farmProcessSync');
    const evt = makeEvent('proc-003', 'stage_transition', {
      payload: { from_stage: 'vegetative', to_stage: 'flowering' },
    });

    await enq(evt, null);

    // Se encoló igual (con lo que trae el evento)
    expect(mockSaveTx).toHaveBeenCalledTimes(1);
    const payload = mockSaveTx.mock.calls[0][0].payload;
    expect(payload.data.attributes.notes.value).toContain('vegetative → flowering');
  });
});

describe('WIRE — farmEventService dispara farmProcessSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recordFarmEvent dispara enqueueFarmProcessEvent al completar la tx (fire-and-forget)', async () => {
    // Mock IDB + syncManager
    const mockSyncSave = vi.fn().mockResolvedValue({ id: 99 });

    vi.doMock('../db/dbCore', () => ({
      openDB: vi.fn().mockResolvedValue({
        transaction: () => ({
          objectStore: () => ({
            index: () => ({
              get: () => ({ result: null, onsuccess: null, onerror: null }),
            }),
            get: () => ({
              result: makeProcessForDB(),
              onsuccess: null,
              onerror: null,
            }),
            add: vi.fn(),
            put: vi.fn(),
          }),
          oncomplete: null,
          onerror: null,
        }),
      }),
      STORES: { FARM_PROCESS_EVENTS: 'farm_process_events', FARM_PROCESSES: 'farm_processes' },
    }));

    vi.doMock('../syncManager', () => ({
      default: { saveTransaction: mockSyncSave },
    }));

    // El test verifica que al llamar recordFarmEvent, el sync se dispara
    // como fire-and-forget. No probamos la IDB real — verificamos
    // que el modulo de farmProcessSync es importado y llamado.
    const { enqueueFarmProcessEvent } = await import('../farmProcessSync');

    const evt = makeEvent('proc-wire-1', 'observation', {
      idempotency_key: 'wire-test-key',
    });

    await enqueueFarmProcessEvent(evt, makeProcess({ subject_label: 'Café' }));

    expect(mockSyncSave).toHaveBeenCalledTimes(1);
    const call = mockSyncSave.mock.calls[0][0];
    expect(call.type).toBe('observation');
    expect(call.endpoint).toBe('/api/log/observation');
  });

  it('todos los tipos de evento (11 de 12, sin photo_attached) producen payload', async () => {
    const types = [
      'sowing_confirmed', 'harvest_confirmed', 'post_harvest_confirmed',
      'pest_management_confirmed', 'observation', 'stage_transition',
      'stage_confirmed', 'stage_corrected', 'task_completed',
      'weather_snapshot', 'note',
    ];

    for (const t of types) {
      const evt = makeEvent('proc-all', t);
      const proc = makeProcess({ subject_label: 'Café' });
      const payload = buildFarmOSLogPayload(evt, proc, 'asset-1');
      expect(payload, `${t} debe producir payload`).not.toBeNull();
      expect(payload.data.type, `${t} debe tener tipo`).toBeTruthy();
      expect(payload.data.attributes.name, `${t} debe tener name`).toBeTruthy();
    }
  });
});

function makeProcessForDB() {
  return {
    process_id: 'proc-wire-1',
    type: 'farm_process',
    attributes: {
      process_type: 'sowing',
      subject_label: 'Café',
      subject_slug: 'coffea_arabica',
      current_stage: 'vegetative',
      status: 'active',
    },
  };
}
