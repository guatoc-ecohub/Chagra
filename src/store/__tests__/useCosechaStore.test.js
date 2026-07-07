/**
 * useCosechaStore — carga los log--harvest de IndexedDB y calcula el resumen.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { openDB, STORES } from '../../db/dbCore';
import { _resetForTests } from '../../services/tenantContext';
import { logCache } from '../../db/logCache';
import useAssetStore from '../useAssetStore';
import useCosechaStore from '../useCosechaStore';

const clearStore = async (name) => {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    tx.objectStore(name).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const harvestLog = (id, assetId, name, value, ts) => ({
  id,
  type: 'log--harvest',
  asset_id: assetId,
  name,
  timestamp: ts,
  status: 'done',
  quantity: { value, unit: 'Kilogramos', measure: 'weight' },
});

beforeEach(async () => {
  _resetForTests();
  await clearStore(STORES.LOGS);
  useAssetStore.setState({ plants: [], lands: [], isHydrated: true });
  useCosechaStore.getState().reset();
});

describe('loadHarvests', () => {
  it('agrega los log--harvest desde IndexedDB', async () => {
    await logCache.put(harvestLog('h1', 'p1', 'Cosecha de Fresa', 4, Math.floor(Date.parse('2026-06-01T00:00:00Z') / 1000)));
    await logCache.put(harvestLog('h2', 'p1', 'Cosecha de Fresa', 6, Math.floor(Date.parse('2026-07-01T00:00:00Z') / 1000)));
    useAssetStore.setState({
      plants: [{ id: 'p1', attributes: { name: 'Fresa' }, relationships: { parent: { data: [{ id: 'lote1' }] } } }],
      lands: [{ id: 'lote1', attributes: { name: 'Era 1' } }],
    });

    const summary = await useCosechaStore.getState().loadHarvests();
    expect(summary.totalKg).toBe(10);
    expect(summary.totalHarvests).toBe(2);
    expect(summary.topCrop.crop).toBe('Fresa');
    expect(summary.byLote[0].loteId).toBe('lote1');
    expect(useCosechaStore.getState().summary).toBe(summary);
    expect(useCosechaStore.getState().lastComputedAt).toBeTruthy();
  });

  it('resumen vacío cuando no hay cosechas', async () => {
    const summary = await useCosechaStore.getState().loadHarvests();
    expect(summary.totalHarvests).toBe(0);
    expect(summary.topCrop).toBeNull();
  });

  it('computeFrom agrega logs ya en memoria sin tocar IDB', () => {
    const summary = useCosechaStore.getState().computeFrom([
      harvestLog('h1', 'p1', 'Cosecha de Mora', 3, 1),
    ]);
    expect(summary.totalKg).toBe(3);
    expect(summary.topCrop.crop).toBe('Mora');
  });
});
