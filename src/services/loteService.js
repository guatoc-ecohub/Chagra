/**
 * loteService.js — CAPA DE DATOS del croquis de la finca (lotes dibujables).
 *
 * FEATURE "Croquis / mapa de la finca": el campesino DIBUJA sus lotes, eras y
 * potreros (polígonos o puntos), les pone nombre y tipo, y les asigna cultivos
 * o animales. Esta capa expone una API limpia para que la vista (canvas de
 * Fable) solo pinte — NO decide dónde ni cómo se persiste.
 *
 * ── Modelo de datos (grounded en farmOS, sin backend nuevo) ─────────────────
 * Un "lote" ES un `asset--land` de farmOS (mismo tipo que ya lee FarmMap.jsx):
 *
 *   asset--land {
 *     attributes: {
 *       name,                         // "Potrero de abajo", "Era de cilantro"
 *       status: 'active',
 *       land_type,                    // field | bed | greenhouse | paddock | …
 *                                     //   (fuente: utils/landTypes.LAND_TYPES)
 *       intrinsic_geometry: { value },// WKT — POLYGON((lon lat, …)) o POINT(lon lat)
 *       notes: { value } | string,    // texto libre opcional
 *     },
 *     relationships: {
 *       location: { data: [{ type:'asset--land', id: parentLandId }] },
 *       parent:   { data: [{ type:'asset--land', id: parentLandId }] },
 *     }
 *   }
 *
 * Los cultivos/animales de un lote NO son un campo del lote: son `asset--plant`
 * / `asset--animal` cuyo `parent`/`location` apunta al id del lote (jerarquía
 * espacial canónica de farmOS — exactamente lo que FarmMap ya filtra por zona).
 * Así el mismo dato sirve al mapa, a la ficha del lote y al rendimiento (kg/era).
 *
 * ── Offline-first ───────────────────────────────────────────────────────────
 * Toda escritura pasa por `useAssetStore` (commit atómico IndexedDB + encolado
 * en `pending_transactions`), así que sobrevive sin red y sincroniza a farmOS
 * cuando vuelve la conexión. Mismo patrón que el resto de assets.
 */

import { assetCache } from '../db/assetCache';
import useAssetStore from '../store/useAssetStore';
import { LAND_TYPES, isUrbanLandType } from '../utils/landTypes';
import {
  geoJsonToWkt,
  wktToGeoJson,
  latLngToPoint,
  latLngsToPolygon,
  polygonAreaSqMeters,
} from '../utils/geo';

/** Tipo de asset farmOS que respalda un lote. */
export const LOTE_ASSET_TYPE = 'land';

/** Catálogo de tipos de lote reutilizable por la vista (re-export). */
export { LAND_TYPES, isUrbanLandType };

/** Id del land raíz de la finca (parent por defecto de un lote nuevo). */
const DEFAULT_PARENT_LAND_ID = 'farmos-alpha-location-01';

/** Tipos de asset que `useAssetStore` refleja en memoria (buckets). */
const STORE_TRACKED_TYPES = new Set(['plant', 'structure', 'equipment', 'material', 'land']);

// ── Helpers de geometría ────────────────────────────────────────────────────

/**
 * Construye una geometría GeoJSON a partir de lo que dibujó el usuario.
 *
 * @param {{ mode:'polygon'|'point', latlngs?:Array<{lat:number,lng:number}>, point?:{lat:number,lng:number} }} draft
 * @returns {{type:string, coordinates:any}|null} GeoJSON o null si el trazo es inválido.
 */
export const geometryFromDraft = (draft) => {
  if (!draft || !draft.mode) return null;
  if (draft.mode === 'point') {
    const p = draft.point || (draft.latlngs && draft.latlngs[0]);
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
    return latLngToPoint(p);
  }
  if (draft.mode === 'polygon') {
    const pts = (draft.latlngs || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (pts.length < 3) return null; // un polígono necesita ≥3 vértices
    return latLngsToPolygon(pts);
  }
  return null;
};

/** Extrae el WKT crudo de un lote (soporta string u objeto {value}). */
export const wktOf = (lote) => {
  const geo = lote?.attributes?.intrinsic_geometry;
  if (!geo) return null;
  return typeof geo === 'string' ? geo : geo.value || null;
};

/** GeoJSON de la geometría del lote, o null. */
export const loteGeoJson = (lote) => {
  const wkt = wktOf(lote);
  return wkt ? wktToGeoJson(wkt) : null;
};

/** Convierte un anillo GeoJSON [[lon,lat],…] a vértices {lat,lng}. */
const ringToLatLng = (ring) => (ring || []).map(([lon, lat]) => ({ lat, lng: lon }));

/**
 * Área del lote en metros cuadrados (0 si es un punto o no tiene polígono).
 * @param {object} lote
 * @returns {number}
 */
export const loteAreaSqMeters = (lote) => {
  const geo = loteGeoJson(lote);
  if (!geo || geo.type !== 'Polygon') return 0;
  return polygonAreaSqMeters(ringToLatLng(geo.coordinates[0]));
};

/** Área del lote en hectáreas (1 ha = 10.000 m²). */
export const loteAreaHectares = (lote) => loteAreaSqMeters(lote) / 10000;

/**
 * Centroide del lote {lat,lng} para colocar la etiqueta/pin, o null.
 * Para un polígono es el promedio de sus vértices; para un punto, el punto.
 * @param {object} lote
 * @returns {{lat:number,lng:number}|null}
 */
export const loteCentroid = (lote) => {
  const geo = loteGeoJson(lote);
  if (!geo) return null;
  if (geo.type === 'Point') {
    const [lng, lat] = geo.coordinates;
    return { lat, lng };
  }
  if (geo.type === 'Polygon') {
    const ring = ringToLatLng(geo.coordinates[0]);
    if (ring.length === 0) return null;
    // No promediar el vértice de cierre duplicado si existe.
    const closed = ring.length > 1
      && ring[0].lat === ring[ring.length - 1].lat
      && ring[0].lng === ring[ring.length - 1].lng;
    const pts = closed ? ring.slice(0, -1) : ring;
    const sum = pts.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
    return { lat: sum.lat / pts.length, lng: sum.lng / pts.length };
  }
  return null;
};

// ── Validación ──────────────────────────────────────────────────────────────

/**
 * Valida los datos de un lote antes de persistir.
 * @param {{name?:string, landType?:string, geometry?:object}} input
 * @returns {{valid:boolean, errors:Record<string,string>}}
 */
export const validateLoteInput = (input = {}) => {
  /** @type {Record<string, string>} */
  const errors = {};
  if (!input.name || !input.name.trim()) errors.name = 'Ponle un nombre al lote';
  if (input.landType && !LAND_TYPES.some((t) => t.value === input.landType)) {
    errors.landType = 'Tipo de lote no reconocido';
  }
  // La geometría es opcional para zonas urbanas (un balcón no tiene contorno),
  // pero si viene, debe ser serializable a WKT.
  if (input.geometry && !geoJsonToWkt(input.geometry)) {
    errors.geometry = 'La geometría dibujada no es válida';
  }
  return { valid: Object.keys(errors).length === 0, errors };
};

// ── Construcción de payload farmOS ──────────────────────────────────────────

const normalizeNotes = (notes) => {
  if (!notes) return undefined;
  if (typeof notes === 'string') return notes.trim() ? { value: notes.trim() } : undefined;
  if (notes.value && String(notes.value).trim()) return { value: String(notes.value).trim() };
  return undefined;
};

/**
 * Construye el asset--land optimista + su pending_transaction (POST) a farmOS.
 *
 * @param {object} input
 * @param {string} input.name
 * @param {string} [input.landType='field']
 * @param {object} [input.geometry] - GeoJSON (Polygon/Point).
 * @param {string|{value:string}} [input.notes]
 * @param {string} [input.parentLandId]
 * @param {string} [input.id] - fuerza un id (tests / idempotencia). Default UUID.
 * @returns {{ asset: object, pendingTx: object }}
 */
export const buildLotePayload = (input) => {
  const id = input.id || crypto.randomUUID();
  const landType = input.landType || 'field';
  const parentLandId = input.parentLandId || DEFAULT_PARENT_LAND_ID;

  /** @type {Record<string, any>} */
  const attributes = {
    name: input.name.trim(),
    status: 'active',
    land_type: landType,
  };
  const notes = normalizeNotes(input.notes);
  if (notes) attributes.notes = notes;
  if (input.geometry) {
    const wkt = geoJsonToWkt(input.geometry);
    if (wkt) attributes.intrinsic_geometry = { value: wkt };
  }

  const relationships = {
    location: { data: [{ type: 'asset--land', id: parentLandId }] },
    parent: { data: [{ type: 'asset--land', id: parentLandId }] },
  };

  const asset = {
    id,
    type: 'asset--land',
    attributes,
    relationships,
    _pending: true,
    _createdAt: Date.now(),
  };

  const pendingTx = {
    id,
    type: 'asset_land',
    endpoint: '/api/asset/land',
    payload: { data: { type: 'asset--land', id, attributes, relationships } },
    method: 'POST',
  };

  return { asset, pendingTx };
};

// ── CRUD ────────────────────────────────────────────────────────────────────

/**
 * Crea un lote (asset--land) offline-first. Refleja en `useAssetStore.lands`
 * (→ el mapa lo dibuja al instante) y encola el POST a farmOS.
 *
 * @param {object} input - ver buildLotePayload.
 * @returns {Promise<object>} el asset--land creado (optimista).
 */
export const createLote = async (input) => {
  const { valid, errors } = validateLoteInput(input);
  if (!valid) {
    const err = /** @type {Error & { validation?: Record<string, string> }} */ (
      new Error(Object.values(errors)[0] || 'Datos de lote inválidos')
    );
    err.validation = errors;
    throw err;
  }
  const { asset, pendingTx } = buildLotePayload(input);
  await useAssetStore.getState().addAsset(LOTE_ASSET_TYPE, asset, [pendingTx]);
  return asset;
};

/**
 * Actualiza campos de un lote existente (nombre, tipo, geometría, notas).
 * Fusiona sobre el asset actual y encola un PATCH.
 *
 * @param {string} loteId
 * @param {{name?:string, landType?:string, geometry?:object, notes?:string|{value:string}}} patch
 * @returns {Promise<object>} el asset--land actualizado (optimista).
 */
export const updateLote = async (loteId, patch = {}) => {
  const current = await assetCache.getAsset(loteId);
  if (!current) throw new Error('Lote no encontrado');

  const attributes = { ...(current.attributes || {}) };
  if (patch.name !== undefined) attributes.name = String(patch.name).trim();
  if (patch.landType !== undefined) attributes.land_type = patch.landType;
  if (patch.notes !== undefined) {
    const n = normalizeNotes(patch.notes);
    if (n) attributes.notes = n; else delete attributes.notes;
  }
  if (patch.geometry !== undefined) {
    if (patch.geometry === null) {
      delete attributes.intrinsic_geometry;
    } else {
      const wkt = geoJsonToWkt(patch.geometry);
      if (wkt) attributes.intrinsic_geometry = { value: wkt };
    }
  }

  const updated = {
    ...current,
    type: current.type || 'asset--land',
    attributes,
    _pending: true,
  };

  const pendingTx = {
    id: crypto.randomUUID(),
    type: 'asset_land',
    remoteId: loteId,
    endpoint: `/api/asset/land/${loteId}`,
    method: 'PATCH',
    payload: { data: { type: 'asset--land', id: loteId, attributes } },
  };

  await useAssetStore.getState().updateAsset(LOTE_ASSET_TYPE, updated, [pendingTx]);
  return updated;
};

/**
 * Elimina un lote (borrado local + DELETE encolado). No borra en cascada los
 * cultivos/animales que apuntaban a él — quedan "sin lote" hasta reasignarse.
 * @param {string} loteId
 * @returns {Promise<void>}
 */
export const deleteLote = async (loteId) => {
  await useAssetStore.getState().removeAsset(LOTE_ASSET_TYPE, loteId);
};

/**
 * Lista todos los lotes (asset--land) desde IndexedDB, scoped al tenant activo.
 * @returns {Promise<object[]>}
 */
export const listLotes = async () => assetCache.getByType(LOTE_ASSET_TYPE);

/**
 * Obtiene un lote por id (o null si no existe o no es un land).
 * @param {string} loteId
 * @returns {Promise<object|null>}
 */
export const getLote = async (loteId) => {
  const asset = await assetCache.getAsset(loteId);
  if (!asset) return null;
  const t = asset.asset_type || asset.type;
  if (t !== 'land' && t !== 'asset--land') return null;
  return asset;
};

// ── Cultivos / animales dentro de un lote ───────────────────────────────────

/** id del land padre de un asset (parent, con fallback a location). */
export const parentLandIdOf = (asset) => {
  const rel = asset?.relationships?.parent?.data ?? asset?.relationships?.location?.data;
  if (Array.isArray(rel)) return rel[0]?.id || null;
  return rel?.id || null;
};

/**
 * Deriva los cultivos/animales que "viven" en un lote: assets cuyo parent
 * (o location) apunta al id del lote. Selector PURO — no toca IndexedDB.
 *
 * @param {string} loteId
 * @param {{plants?:object[], animals?:object[]}} pools
 * @returns {{plants:object[], animals:object[]}}
 */
export const getLoteContents = (loteId, pools = {}) => {
  const inLote = (a) => parentLandIdOf(a) === loteId;
  return {
    plants: (pools.plants || []).filter(inLote),
    animals: (pools.animals || []).filter(inLote),
  };
};

/**
 * Resumen de un lote para pintar su ficha/etiqueta.
 * @param {object} lote
 * @param {{plants:object[], animals:object[]}} contents - salida de getLoteContents.
 * @returns {{name:string, landType:string, areaM2:number, areaHa:number, cropCount:number, animalCount:number, species:string[], centroid:{lat:number,lng:number}|null, hasGeometry:boolean}}
 */
export const summarizeLote = (lote, contents = { plants: [], animals: [] }) => {
  const areaM2 = loteAreaSqMeters(lote);
  const species = Array.from(new Set(
    (contents.plants || [])
      .map((p) => p.attributes?.name || p.name)
      .filter(Boolean)
  ));
  return {
    name: lote?.attributes?.name || lote?.name || 'Lote sin nombre',
    landType: lote?.attributes?.land_type || 'field',
    areaM2,
    areaHa: areaM2 / 10000,
    cropCount: (contents.plants || []).length,
    animalCount: (contents.animals || []).length,
    species,
    centroid: loteCentroid(lote),
    hasGeometry: !!wktOf(lote),
  };
};

/**
 * Asigna un cultivo/animal EXISTENTE a un lote: fija su `location`+`parent` al
 * id del lote y encola el PATCH. Es la operación canónica de "meter" un asset
 * en una zona (lo mismo que hace el drill-down por zona del mapa).
 *
 * @param {object} params
 * @param {string} params.assetType - 'plant' | 'animal' | 'structure' | …
 * @param {object} params.asset - el asset a mover (shape del store/IDB).
 * @param {string} params.loteId - id del asset--land destino.
 * @returns {Promise<object>} el asset actualizado (optimista).
 */
export const assignAssetToLote = async ({ assetType, asset, loteId }) => {
  if (!asset?.id) throw new Error('assignAssetToLote requiere un asset con id');
  if (!loteId) throw new Error('assignAssetToLote requiere un loteId');

  const rel = { data: [{ type: 'asset--land', id: loteId }] };
  const updated = {
    ...asset,
    relationships: {
      ...(asset.relationships || {}),
      location: rel,
      parent: rel,
    },
    _pending: true,
  };

  const bundle = (asset.type || `asset--${assetType}`).replace('asset--', '');
  const pendingTx = {
    id: crypto.randomUUID(),
    type: `asset_${assetType}`,
    remoteId: asset.id,
    endpoint: `/api/asset/${bundle}/${asset.id}`,
    method: 'PATCH',
    payload: {
      data: {
        type: asset.type || `asset--${assetType}`,
        id: asset.id,
        relationships: { location: rel, parent: rel },
      },
    },
  };

  if (STORE_TRACKED_TYPES.has(assetType)) {
    await useAssetStore.getState().updateAsset(assetType, updated, [pendingTx]);
  } else {
    // Tipos que el store no refleja en memoria (p. ej. asset--animal): commit
    // directo a IndexedDB + encolado, sin pasar por un bucket de Zustand.
    await assetCache.commitOptimisticUpdate([{ assetType, asset: updated }], [pendingTx]);
    if (typeof navigator !== 'undefined') {
      navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
    }
  }
  return updated;
};

export default {
  LOTE_ASSET_TYPE,
  LAND_TYPES,
  isUrbanLandType,
  geometryFromDraft,
  wktOf,
  loteGeoJson,
  loteAreaSqMeters,
  loteAreaHectares,
  loteCentroid,
  validateLoteInput,
  buildLotePayload,
  createLote,
  updateLote,
  deleteLote,
  listLotes,
  getLote,
  parentLandIdOf,
  getLoteContents,
  summarizeLote,
  assignAssetToLote,
};
