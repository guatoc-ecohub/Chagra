// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * farmEventUpsert.test.js — BUG A (recordFarmEvent: process <ULID> not found).
 *
 * Raíz del bug: la lista de ciclos mostraba procesos hidratados desde farmOS que
 * NUNCA se persistían en el store `farm_processes`; recordFarmEvent leía ese
 * store y, al no encontrar el proceso, lanzaba "process not found" → se perdía la
 * observación/voz del campesino.
 *
 * Estos tests cubren la red de seguridad: recordFarmEvent debe AUTO-CREAR
 * (upsert) el proceso ausente en vez de fallar, usando process_hint si llega.
 *
 * Mock de IDB con un Map en memoria (mismo patrón que glaciarDraft.test.js /
 * ragTelemetry.test.js — sin fake-indexeddb).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildUpsertPlaceholder } from '../farmEventService';
import { newUlid } from '../../utils/id';

// Stores en memoria compartidos por el mock de openDB.
/** @type {Map<any, any>} */
let procStore;
/** @type {any[]} */
let eventStore;

vi.mock('../../db/dbCore', () => {
  const STORES = {
    FARM_PROCESSES: 'farm_processes',
    FARM_PROCESS_EVENTS: 'farm_process_events',
  };

  // Construye un objectStore IDB-like sobre las estructuras en memoria.
  const makeProcObjectStore = () => ({
    /**
     * @param {any} key
     */
    get(key) {
      const req = { onsuccess: null, onerror: null, result: undefined };
      Promise.resolve().then(() => {
        req.result = procStore.get(key);
        /** @type {any} */ (req).onsuccess?.({ target: req });
      });
      return req;
    },
    /**
     * @param {any} record
     */
    put(record) {
      procStore.set(record.process_id, record);
      return { onsuccess: null, onerror: null };
    },
  });

  const makeEventObjectStore = () => ({
    /**
     * @param {any} name
     */
    index(name) {
      return {
        /**
         * @param {any} key
         */
        get(key) {
          const req = { onsuccess: null, onerror: null, result: undefined };
          Promise.resolve().then(() => {
            if (name === 'idempotency_key') {
              req.result = eventStore.find((e /** @type {any} */) => e.attributes?.idempotency_key === key);
            }
            /** @type {any} */ (req).onsuccess?.({ target: req });
          });
          return req;
        },
      };
    },
    /**
     * @param {any} record
     */
    add(record) {
      eventStore.push(record);
      return { onsuccess: null, onerror: null };
    },
  });

  const makeTx = () => {
    const tx = { oncomplete: null, onerror: null };
    const proc = makeProcObjectStore();
    const ev = makeEventObjectStore();
    /** @type {any} */
    (tx).objectStore = /** @type {any} */ (/** @param {any} storeName */ (storeName) => (storeName === STORES.FARM_PROCESSES ? proc : ev));
    Promise.resolve().then(() => Promise.resolve().then(() => /** @type {any} */ (tx).oncomplete?.()));
    return tx;
  };

  return {
    STORES,
    openDB: vi.fn(() => Promise.resolve({ transaction: () => makeTx() })),
  };
});

// El sync a farmOS es fire-and-forget; lo silenciamos para no pegarle a la red.
vi.mock('../farmProcessSync', () => ({
  enqueueFarmProcessEvent: vi.fn(() => Promise.resolve()),
}));

describe('buildUpsertPlaceholder', () => {
  it('arma un proceso válido mínimo sin hint', () => {
    const pid = newUlid();
    const p = /** @type {any} */ (buildUpsertPlaceholder(pid, undefined, 1700000000000));
    expect(p.process_id).toBe(pid);
    expect(p.type).toBe('farm_process');
    expect(p.attributes.process_type).toBe('sowing');
    expect(p.attributes.subject_kind).toBe('individual');
    expect(p.attributes.quantity).toBe(1);
    expect(p.attributes.unit).toBe('plantas');
    expect(p.attributes.status).toBe('active');
    expect(p.attributes.current_stage).toBe('sowing_confirmed');
    expect(p.attributes._synthetic).toBe(true);
  });

  it('reutiliza atributos del hint (slug, etiqueta, lote, etapa)', () => {
    const pid = newUlid();
    const hint = {
      process_id: pid,
      type: 'farm_process',
      attributes: {
        process_type: 'sowing',
        subject_kind: 'aggregate',
        subject_slug: 'fragaria_ananassa',
        subject_label: 'Fresa #09',
        quantity: 40,
        unit: 'plantas',
        location_land_asset_id: 'land-lote-sur',
        status: 'active',
        current_stage: 'vegetative',
        created_at: 1690000000000,
        updated_at: 1690000000000,
      },
    };
    const p = /** @type {any} */ (buildUpsertPlaceholder(pid, /** @type {any} */ (hint), 1700000000000));
    expect(p.attributes.subject_slug).toBe('fragaria_ananassa');
    expect(p.attributes.subject_label).toBe('Fresa #09');
    expect(p.attributes.subject_kind).toBe('aggregate');
    expect(p.attributes.quantity).toBe(40);
    expect(p.attributes.location_land_asset_id).toBe('land-lote-sur');
    expect(p.attributes.current_stage).toBe('vegetative');
    expect(p.attributes.created_at).toBe(1690000000000);
  });
});

describe('recordFarmEvent — upsert anti "process not found" (BUG A)', () => {
  beforeEach(() => {
    procStore = new Map();
    eventStore = [];
    vi.clearAllMocks();
  });

  it('auto-crea el proceso ausente y guarda la observación (no lanza)', async () => {
    const { recordFarmEvent } = await import('../farmEventService');
    const pid = newUlid();

    const ev = await recordFarmEvent({
      process_id: pid,
      event_type: 'observation',
      payload: { text: 'aparecieron pulgones' },
    });

    expect(ev.attributes.event_type).toBe('observation');
    // El evento quedó persistido…
    expect(eventStore).toHaveLength(1);
    // …y el proceso fue auto-creado (upsert) en el store.
    expect(procStore.has(pid)).toBe(true);
    expect(/** @type {any} */ (procStore.get(pid)).attributes._synthetic).toBe(true);
  });

  it('usa process_hint para enriquecer el proceso auto-creado', async () => {
    const { recordFarmEvent } = await import('../farmEventService');
    const pid = newUlid();
    const hint = {
      process_id: pid,
      type: 'farm_process',
      attributes: {
        process_type: 'sowing',
        subject_kind: 'individual',
        subject_slug: 'fragaria_ananassa',
        subject_label: 'Fresa #09',
        quantity: 1,
        unit: 'plantas',
        status: 'active',
        current_stage: 'flowering',
        created_at: 1690000000000,
        updated_at: 1690000000000,
      },
    };

    await recordFarmEvent({
      process_id: pid,
      event_type: 'observation',
      payload: { text: 'floreció' },
      process_hint: /** @type {any} */ (hint),
    });

    const saved = procStore.get(pid);
    expect(saved).toBeDefined();
    expect(saved.attributes.subject_label).toBe('Fresa #09');
    expect(saved.attributes.subject_slug).toBe('fragaria_ananassa');
    expect(saved.attributes.current_stage).toBe('flowering');
  });

  it('si el proceso YA existe, solo actualiza updated_at (no lo pisa)', async () => {
    const { recordFarmEvent } = await import('../farmEventService');
    const pid = newUlid();
    const existing = /** @type {any} */ ({
      process_id: pid,
      type: 'farm_process',
      attributes: {
        process_type: 'sowing',
        subject_kind: 'individual',
        subject_slug: 'solanum_lycopersicum',
        subject_label: 'Tomate chonto',
        quantity: 10,
        unit: 'plantas',
        status: 'active',
        current_stage: 'fruiting',
        created_at: 1690000000000,
        updated_at: 1690000000000,
      },
    });
    procStore.set(pid, existing);

    await recordFarmEvent({
      process_id: pid,
      event_type: 'observation',
      occurred_at: 1700000000000,
      payload: { text: 'frutos rojos' },
    });

    const saved = procStore.get(pid);
    expect(saved.attributes.subject_label).toBe('Tomate chonto');
    expect(saved.attributes.current_stage).toBe('fruiting'); // no se pisó
    expect(saved.attributes.updated_at).toBe(1700000000000); // sí avanzó
    expect(eventStore).toHaveLength(1);
  });

  it('deduplica por idempotency_key (no duplica el evento)', async () => {
    const { recordFarmEvent } = await import('../farmEventService');
    const pid = newUlid();
    const key = `${pid}:observation:1700000000000`;

    const first = await recordFarmEvent({
      process_id: pid,
      event_type: 'observation',
      occurred_at: 1700000000000,
      idempotency_key: key,
      payload: { text: 'una nota' },
    });
    const second = await recordFarmEvent({
      process_id: pid,
      event_type: 'observation',
      occurred_at: 1700000000000,
      idempotency_key: key,
      payload: { text: 'una nota' },
    });

    expect(eventStore).toHaveLength(1);
    expect(/** @type {any} */ (second.attributes).idempotency_key).toBe(/** @type {any} */ (first.attributes).idempotency_key);
  });
});
