import { create } from 'zustand';
import useAssetStore from './useAssetStore';
import * as loteService from '../services/loteService';

/**
 * useLoteStore — estado de INTERACCIÓN del croquis de lotes (Feature "Croquis /
 * mapa de la finca"). Es la fachada que el canvas de Fable consume.
 *
 * Responsabilidades:
 *   1. Estado efímero del DIBUJO en curso (modo, vértices, punto).
 *   2. Selección / edición de un lote.
 *   3. Orquestar el CRUD delegando en `loteService` (que persiste offline-first).
 *   4. Espejar la lista canónica de lotes (`useAssetStore.lands`) en `lotes`
 *      para que la vista tenga UN solo import reactivo.
 *
 * IMPORTANTE: la fuente de verdad de los lotes sigue siendo `useAssetStore`
 * (lo que FarmMap.jsx ya lee). Aquí `lotes` es un espejo mantenido por la
 * suscripción de abajo — nunca se escribe a mano salvo por ese espejo.
 */
const useLoteStore = create((set, get) => ({
  // ── Espejo de datos (canónico: useAssetStore.lands) ──────────────────────
  lotes: [],

  // ── Dibujo en curso ──────────────────────────────────────────────────────
  /** null | 'polygon' | 'point' */
  drawMode: null,
  /** vértices del polígono en curso: [{lat,lng}] */
  draftLatLngs: [],
  /** punto en curso: {lat,lng} | null */
  draftPoint: null,

  // ── Selección / edición ──────────────────────────────────────────────────
  selectedLoteId: null,
  editingLoteId: null,

  // ── Estado de UI ─────────────────────────────────────────────────────────
  isSaving: false,
  error: null,

  // ── Acciones de dibujo ───────────────────────────────────────────────────
  setDrawMode: (mode) => set({
    drawMode: mode,
    draftLatLngs: [],
    draftPoint: null,
    error: null,
  }),

  /** Agrega un vértice al polígono (o fija el punto en modo 'point'). */
  addDraftVertex: (latlng) => {
    if (!latlng || !Number.isFinite(latlng.lat) || !Number.isFinite(latlng.lng)) return;
    const mode = get().drawMode;
    if (mode === 'point') {
      set({ draftPoint: { lat: latlng.lat, lng: latlng.lng } });
    } else {
      set((s) => ({ draftLatLngs: [...s.draftLatLngs, { lat: latlng.lat, lng: latlng.lng }] }));
    }
  },

  /** Mueve un vértice existente (arrastre en el canvas). */
  updateDraftVertex: (index, latlng) => set((s) => {
    if (index < 0 || index >= s.draftLatLngs.length) return {};
    const next = s.draftLatLngs.slice();
    next[index] = { lat: latlng.lat, lng: latlng.lng };
    return { draftLatLngs: next };
  }),

  removeLastVertex: () => set((s) => ({ draftLatLngs: s.draftLatLngs.slice(0, -1) })),

  clearDraft: () => set({ drawMode: null, draftLatLngs: [], draftPoint: null }),

  /** GeoJSON del trazo en curso (o null si aún no es válido). */
  getDraftGeometry: () => {
    const { drawMode, draftLatLngs, draftPoint } = get();
    return loteService.geometryFromDraft({ mode: drawMode, latlngs: draftLatLngs, point: draftPoint });
  },

  // ── Selección ────────────────────────────────────────────────────────────
  selectLote: (loteId) => set({ selectedLoteId: loteId }),
  startEditing: (loteId) => set({ editingLoteId: loteId }),
  stopEditing: () => set({ editingLoteId: null }),

  // ── CRUD orquestado (delegado a loteService) ─────────────────────────────

  /**
   * Guarda el trazo en curso como un lote nuevo.
   * @param {{name:string, landType?:string, notes?:string, parentLandId?:string}} meta
   * @returns {Promise<object|null>} el lote creado, o null si falló.
   */
  saveDraftAsLote: async (meta) => {
    set({ isSaving: true, error: null });
    try {
      const geometry = get().getDraftGeometry();
      const lote = await loteService.createLote({ ...meta, geometry });
      set({ isSaving: false, drawMode: null, draftLatLngs: [], draftPoint: null, selectedLoteId: lote.id });
      return lote;
    } catch (err) {
      set({ isSaving: false, error: err.message || 'No se pudo guardar el lote' });
      return null;
    }
  },

  /**
   * Crea un lote con datos ya listos (geometría incluida). Útil cuando el
   * canvas construye su propia geometría en vez de usar el draft del store.
   * @param {object} input - ver loteService.createLote.
   */
  createLote: async (input) => {
    set({ isSaving: true, error: null });
    try {
      const lote = await loteService.createLote(input);
      set({ isSaving: false, selectedLoteId: lote.id });
      return lote;
    } catch (err) {
      set({ isSaving: false, error: err.message || 'No se pudo crear el lote' });
      return null;
    }
  },

  updateLote: async (loteId, patch) => {
    set({ isSaving: true, error: null });
    try {
      const lote = await loteService.updateLote(loteId, patch);
      set({ isSaving: false, editingLoteId: null });
      return lote;
    } catch (err) {
      set({ isSaving: false, error: err.message || 'No se pudo actualizar el lote' });
      return null;
    }
  },

  removeLote: async (loteId) => {
    try {
      await loteService.deleteLote(loteId);
      set((s) => ({ selectedLoteId: s.selectedLoteId === loteId ? null : s.selectedLoteId }));
      return true;
    } catch (err) {
      set({ error: err.message || 'No se pudo eliminar el lote' });
      return false;
    }
  },

  /**
   * Asigna un cultivo/animal existente al lote (fija su ubicación).
   * @param {{assetType:string, asset:object, loteId:string}} params
   */
  assignAsset: async (params) => {
    try {
      return await loteService.assignAssetToLote(params);
    } catch (err) {
      set({ error: err.message || 'No se pudo asignar al lote' });
      return null;
    }
  },

  // ── Hidratación ──────────────────────────────────────────────────────────
  /** Asegura que useAssetStore esté hidratado y refresca el espejo `lotes`. */
  hydrate: async () => {
    const assetState = useAssetStore.getState();
    if (!assetState.isHydrated) {
      await assetState.hydrate();
    }
    set({ lotes: useAssetStore.getState().lands });
  },
}));

// ── Espejo lands → lotes ─────────────────────────────────────────────────────
// La fuente de verdad de los lotes es `useAssetStore.lands`. Aquí lo reflejamos
// en `useLoteStore.lotes` para que el canvas de Fable tenga un único store.
if (typeof window !== 'undefined') {
  // Semilla inicial con lo que ya haya en el store de assets.
  useLoteStore.setState({ lotes: useAssetStore.getState().lands });
  // Mantener el espejo sincronizado (solo cuando cambia la referencia de lands).
  useAssetStore.subscribe((state, prev) => {
    if (state.lands !== prev.lands) {
      useLoteStore.setState({ lotes: state.lands });
    }
  });
}

export default useLoteStore;
