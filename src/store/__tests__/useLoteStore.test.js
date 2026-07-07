/**
 * useLoteStore — estado de interacción del croquis (draft + orquestación CRUD).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { openDB, STORES } from '../../db/dbCore';
import { _resetForTests } from '../../services/tenantContext';
import useAssetStore from '../useAssetStore';
import useLoteStore from '../useLoteStore';

const SQUARE = [
  { lat: 4.5306, lng: -73.9247 },
  { lat: 4.5316, lng: -73.9247 },
  { lat: 4.5316, lng: -73.9237 },
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
    isHydrated: true, error: null,
  });
  useLoteStore.setState({ drawMode: null, draftLatLngs: [], draftPoint: null, selectedLoteId: null, editingLoteId: null, error: null, isSaving: false });
});

describe('dibujo en curso (draft)', () => {
  it('acumula vértices y produce un Polygon válido', () => {
    const s = useLoteStore.getState();
    s.setDrawMode('polygon');
    SQUARE.forEach((v) => useLoteStore.getState().addDraftVertex(v));
    expect(useLoteStore.getState().draftLatLngs).toHaveLength(3);
    const geo = useLoteStore.getState().getDraftGeometry();
    expect(geo.type).toBe('Polygon');
  });

  it('en modo point fija un único punto', () => {
    useLoteStore.getState().setDrawMode('point');
    useLoteStore.getState().addDraftVertex({ lat: 4.53, lng: -73.92 });
    useLoteStore.getState().addDraftVertex({ lat: 4.54, lng: -73.93 });
    expect(useLoteStore.getState().draftPoint).toEqual({ lat: 4.54, lng: -73.93 });
    expect(useLoteStore.getState().getDraftGeometry()).toEqual({ type: 'Point', coordinates: [-73.93, 4.54] });
  });

  it('removeLastVertex y clearDraft', () => {
    useLoteStore.getState().setDrawMode('polygon');
    SQUARE.forEach((v) => useLoteStore.getState().addDraftVertex(v));
    useLoteStore.getState().removeLastVertex();
    expect(useLoteStore.getState().draftLatLngs).toHaveLength(2);
    useLoteStore.getState().clearDraft();
    expect(useLoteStore.getState().drawMode).toBeNull();
    expect(useLoteStore.getState().draftLatLngs).toEqual([]);
  });
});

describe('saveDraftAsLote', () => {
  it('persiste el trazo y espeja en lotes + limpia el draft', async () => {
    useLoteStore.getState().setDrawMode('polygon');
    SQUARE.forEach((v) => useLoteStore.getState().addDraftVertex(v));

    const lote = await useLoteStore.getState().saveDraftAsLote({ name: 'Lote dibujado', landType: 'field' });
    expect(lote).toBeTruthy();
    expect(lote.attributes.name).toBe('Lote dibujado');

    // fuente de verdad
    expect(useAssetStore.getState().lands.some((l) => l.id === lote.id)).toBe(true);
    // espejo reactivo
    expect(useLoteStore.getState().lotes.some((l) => l.id === lote.id)).toBe(true);
    // draft limpio + selección
    expect(useLoteStore.getState().drawMode).toBeNull();
    expect(useLoteStore.getState().selectedLoteId).toBe(lote.id);
  });

  it('setea error si falta el nombre', async () => {
    useLoteStore.getState().setDrawMode('polygon');
    SQUARE.forEach((v) => useLoteStore.getState().addDraftVertex(v));
    const res = await useLoteStore.getState().saveDraftAsLote({ name: '' });
    expect(res).toBeNull();
    expect(useLoteStore.getState().error).toBeTruthy();
  });
});
