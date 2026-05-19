/**
 * assetRelationships.js — helpers para resolver refs JSON:API en assets.
 *
 * Justificación: el shape `relationships.parent.data` ↔ `relationships.location.data`
 * se repite en AssetsDashboard, FarmMap, AssetDetailView y ObservationScreen.
 * Centralizamos el fallback para evitar drift entre vistas.
 */

/**
 * Resuelve el id del parent land asociado a un asset (planta, normalmente).
 * Acepta el shape JSON:API tanto en array como objeto único y cae a
 * `location.data` cuando no hay `parent.data` (compat FarmOS v2 + legacy).
 *
 * @param {object|null} asset
 * @returns {string|null}
 */
export const getParentLandIdFromAsset = (asset) => {
  const rel = asset?.relationships?.parent?.data || asset?.relationships?.location?.data;
  if (Array.isArray(rel)) return rel[0]?.id || null;
  return rel?.id || null;
};
