/**
 * loteService — CRUD y geometría del croquis de lotes (asset--land).
 *
 * Usa el IndexedDB real (fake-indexeddb/auto del setup) + assetCache real, así
 * que ejercita el camino offline-first completo: commit optimista + encolado.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { openDB, STORES } from '../../db/dbCore';
import { _resetForTests } from '../../services/tenantContext';
import useAssetStore from '../../store/useAssetStore';
import {
  geometryFromDraft,
  buildLotePayload,
  validateLoteInput,
  loteAreaSqMeters,
  loteAreaHectares,
  loteCentroid,
  createLote,
  updateLote,
  deleteLote,
  listLotes,
  getLote,
  getLoteContents,
  summarizeLote,
  parentLandIdOf,
  assignAssetToLote,
} from '../loteService';

// Cuadro ~111 m × 111 m cerca de Choachí (Cundinamarca).
const SQUARE = [
  { lat: 4.5306, lng: -73.9247 },
  { lat: 4.5316, lng: -73.9247 },
  { lat: 4.5316, lng: -73.9237 },
  { lat: 4.5306, lng: -73.9237 },
];

const clearStore = async (name) => {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    tx.objectStore(name).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

beforeEach(async () => {
  _resetForTests();
  await clearStore(STORES.ASSETS);
  await clearStore(STORES.PENDING_TX);
  useAssetStore.setState({
    plants: [], structures: [], equipment: [], materials: [], lands: [],
    isHydrated: true, selectedAssetId: null, error: null,
  });
});

describe('geometryFromDraft', () => {
  it('construye un Polygon desde ≥3 vértices', () => {
    const geo = geometryFromDraft({ mode: 'polygon', latlngs: SQUARE });
    expect(geo.type).toBe('Polygon');
    // cierra el anillo: primer y último coinciden.
    const ring = geo.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('rechaza polígonos con <3 vértices', () => {
    expect(geometryFromDraft({ mode: 'polygon', latlngs: SQUARE.slice(0, 2) })).toBeNull();
  });

  it('construye un Point', () => {
    const geo = geometryFromDraft({ mode: 'point', point: { lat: 4.53, lng: -73.92 } });
    expect(geo).toEqual({ type: 'Point', coordinates: [-73.92, 4.53] });
  });
});

describe('geometría del lote (área / centroide)', () => {
  const lote = buildLotePayload({ name: 'Lote', geometry: geometryFromDraft({ mode: 'polygon', latlngs: SQUARE }) }).asset;

  it('calcula un área plausible (~1.2 ha para 111×111 m)', () => {
    const m2 = loteAreaSqMeters(lote);
    expect(m2).toBeGreaterThan(10000);
    expect(m2).toBeLessThan(15000);
    expect(loteAreaHectares(lote)).toBeCloseTo(m2 / 10000, 6);
  });

  it('el centroide cae dentro del cuadro', () => {
    const c = loteCentroid(lote);
    expect(c.lat).toBeGreaterThan(4.5306);
    expect(c.lat).toBeLessThan(4.5316);
    expect(c.lng).toBeGreaterThan(-73.9247);
    expect(c.lng).toBeLessThan(-73.9237);
  });
});

describe('validateLoteInput', () => {
  it('exige nombre', () => {
    expect(validateLoteInput({ name: '' }).valid).toBe(false);
    expect(validateLoteInput({ name: 'Huerta' }).valid).toBe(true);
  });

  it('rechaza land_type desconocido', () => {
    const r = validateLoteInput({ name: 'x', landType: 'volcano' });
    expect(r.valid).toBe(false);
    expect(r.errors.landType).toBeTruthy();
  });
});

describe('buildLotePayload', () => {
  it('produce un asset--land con land_type, geometría WKT y pending_tx POST', () => {
    const geo = geometryFromDraft({ mode: 'polygon', latlngs: SQUARE });
    const { asset, pendingTx } = buildLotePayload({ name: 'Potrero', landType: 'paddock', geometry: geo, notes: 'para las vacas' });
    expect(asset.type).toBe('asset--land');
    expect(asset.attributes.land_type).toBe('paddock');
    expect(asset.attributes.name).toBe('Potrero');
    expect(asset.attributes.intrinsic_geometry.value).toMatch(/^POLYGON\(\(/);
    expect(asset.attributes.notes).toEqual({ value: 'para las vacas' });
    expect(asset.relationships.parent.data[0].type).toBe('asset--land');
    expect(pendingTx).toMatchObject({ type: 'asset_land', endpoint: '/api/asset/land', method: 'POST' });
    expect(pendingTx.id).toBe(asset.id);
  });
});

describe('CRUD offline-first', () => {
  it('createLote persiste en IDB y lo refleja en useAssetStore.lands', async () => {
    const geo = geometryFromDraft({ mode: 'polygon', latlngs: SQUARE });
    const lote = await createLote({ name: 'Era de cilantro', landType: 'bed', geometry: geo });

    // reflejo en memoria (→ FarmMap dibuja al instante)
    const lands = useAssetStore.getState().lands;
    expect(lands.some((l) => l.id === lote.id)).toBe(true);

    // persistido en IDB con asset_type correcto
    const listed = await listLotes();
    expect(listed.some((l) => l.id === lote.id)).toBe(true);

    // pending_tx encolada
    const db = await openDB();
    const txs = await new Promise((res) => {
      const t = db.transaction(STORES.PENDING_TX, 'readonly');
      const req = t.objectStore(STORES.PENDING_TX).getAll();
      req.onsuccess = () => res(req.result);
    });
    expect(txs.some((tx) => tx.id === lote.id && tx.endpoint === '/api/asset/land')).toBe(true);
  });

  it('getLote devuelve el land; null para id inexistente', async () => {
    const lote = await createLote({ name: 'Lote A', landType: 'field' });
    expect((await getLote(lote.id)).id).toBe(lote.id);
    expect(await getLote('no-existe')).toBeNull();
  });

  it('updateLote cambia el nombre', async () => {
    const lote = await createLote({ name: 'Viejo nombre', landType: 'field' });
    await updateLote(lote.id, { name: 'Nuevo nombre' });
    const reloaded = await getLote(lote.id);
    expect(reloaded.attributes.name).toBe('Nuevo nombre');
  });

  it('deleteLote lo saca de IDB y del store', async () => {
    const lote = await createLote({ name: 'Temporal', landType: 'field' });
    await deleteLote(lote.id);
    expect(await getLote(lote.id)).toBeNull();
    expect(useAssetStore.getState().lands.some((l) => l.id === lote.id)).toBe(false);
  });

  it('createLote rechaza input sin nombre', async () => {
    await expect(createLote({ name: '' })).rejects.toThrow();
  });
});

describe('cultivos/animales del lote', () => {
  const plantIn = (id, loteId) => ({
    id,
    type: 'asset--plant',
    attributes: { name: 'Cilantro' },
    relationships: { parent: { data: [{ type: 'asset--land', id: loteId }] } },
  });

  it('parentLandIdOf lee parent con fallback a location', () => {
    expect(parentLandIdOf(plantIn('p1', 'lote1'))).toBe('lote1');
    expect(parentLandIdOf({ relationships: { location: { data: [{ id: 'L' }] } } })).toBe('L');
    expect(parentLandIdOf({})).toBeNull();
  });

  it('getLoteContents filtra por lote y summarizeLote resume', async () => {
    const geo = geometryFromDraft({ mode: 'polygon', latlngs: SQUARE });
    const lote = await createLote({ name: 'Era 1', landType: 'bed', geometry: geo });
    const pools = {
      plants: [plantIn('p1', lote.id), plantIn('p2', lote.id), plantIn('p3', 'otro')],
      animals: [],
    };
    const contents = getLoteContents(lote.id, pools);
    expect(contents.plants).toHaveLength(2);

    const s = summarizeLote(lote, contents);
    expect(s.name).toBe('Era 1');
    expect(s.cropCount).toBe(2);
    expect(s.hasGeometry).toBe(true);
    expect(s.areaM2).toBeGreaterThan(10000);
    expect(s.species).toEqual(['Cilantro']);
  });

  it('assignAssetToLote fija location+parent del cultivo al lote', async () => {
    const lote = await createLote({ name: 'Lote destino', landType: 'field' });
    const plant = { id: 'plant-x', type: 'asset--plant', attributes: { name: 'Tomate' }, relationships: {} };
    useAssetStore.setState({ plants: [plant] });

    const updated = await assignAssetToLote({ assetType: 'plant', asset: plant, loteId: lote.id });
    expect(updated.relationships.parent.data[0].id).toBe(lote.id);
    expect(updated.relationships.location.data[0].id).toBe(lote.id);

    // reflejado en el store
    const stored = useAssetStore.getState().plants.find((p) => p.id === 'plant-x');
    expect(parentLandIdOf(stored)).toBe(lote.id);
  });
});
