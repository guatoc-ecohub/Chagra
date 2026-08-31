import { beforeAll, describe, expect, it } from 'vitest';
import { decomposeComplexIngest, persistComplexIngest } from '../agentComplexIngest.js';
import { openDB, STORES } from '../../db/dbCore.js';

const MESSAGE = 'sembré 10 tomate cherry en surco 12 hace 3 meses, 3 cosechas, abono c/15d, trozador+gota';
const NOW = new Date('2026-08-28T12:00:00.000Z');

describe('agentComplexIngest, verificación IndexedDB', () => {
  beforeAll(async () => {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([
        STORES.ASSETS,
        STORES.PENDING_TX,
        STORES.FARM_PROCESSES,
        STORES.FARM_PROCESS_EVENTS,
      ], 'readwrite');
      for (const store of [STORES.ASSETS, STORES.PENDING_TX, STORES.FARM_PROCESSES, STORES.FARM_PROCESS_EVENTS]) {
        tx.objectStore(store).clear();
      }
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });

  it('deja ciclo, eventos y transacciones pendientes después de aprobar la ingesta', async () => {
    const plan = decomposeComplexIngest(MESSAGE, { now: NOW });
    const result = await persistComplexIngest(plan, { operatorId: 'operator-1', now: NOW.getTime() });
    const db = await openDB();
    const readAll = (storeName) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const [assets, pending, processes, events] = await Promise.all([
      readAll(STORES.ASSETS),
      readAll(STORES.PENDING_TX),
      readAll(STORES.FARM_PROCESSES),
      readAll(STORES.FARM_PROCESS_EVENTS),
    ]);

    expect(result).toMatchObject({ status: 'executed', executed: 8, failed: 0 });
    expect(assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ asset_type: 'land', attributes: expect.objectContaining({ name: 'Surco 12', land_type: 'bed' }) }),
    ]));
    expect(processes).toHaveLength(1);
    expect(processes[0].attributes).toMatchObject({
      subject_label: 'tomate cherry',
      quantity: 10,
      location_land_asset_id: result.landId,
      created_at: NOW.getTime() - (92 * 24 * 60 * 60 * 1000),
    });
    expect(events).toHaveLength(7);
    expect(events.map((event) => event.attributes.event_type).sort()).toEqual([
      'harvest_confirmed', 'harvest_confirmed', 'harvest_confirmed',
      'observation', 'observation', 'sowing_confirmed', 'task_completed',
    ].sort());
    expect(events.filter((event) => event.attributes.event_type === 'observation'))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ attributes: expect.objectContaining({ payload: expect.objectContaining({ name: 'trozador', treatment_status: 'missing' }) }) }),
        expect.objectContaining({ attributes: expect.objectContaining({ payload: expect.objectContaining({ name: 'gota', treatment_status: 'missing' }) }) }),
      ]));
    expect(pending.length).toBeGreaterThanOrEqual(8);
  });
});
