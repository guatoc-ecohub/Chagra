// ── misMatas.js — registro local compartido por el valle vivo ───────────────
// Contrato pequeño para que una siembra 3D sea también inventario del compai.
// Se mantiene local al origen del valle: no publica nada ni inventa una cuenta.

export const LLAVE_MIS_MATAS = 'chagra:mis-matas:v1';
const LLAVE_LEGADA = 'chagra_siembra_wip';

export function leerMatas(storage = globalThis.localStorage) {
  if (!storage) return [];
  for (const llave of [LLAVE_MIS_MATAS, LLAVE_LEGADA]) {
    try {
      const datos = JSON.parse(storage.getItem(llave) || '[]');
      if (Array.isArray(datos)) return datos;
    } catch { /* modo privado o registro incompleto */ }
  }
  return [];
}

export function guardarMatas(matas, storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    const datos = Array.isArray(matas) ? matas : [];
    storage.setItem(LLAVE_MIS_MATAS, JSON.stringify(datos));
    // Compatibilidad con el demo portado y con capturas ya existentes.
    storage.setItem(LLAVE_LEGADA, JSON.stringify(datos));
    return true;
  } catch { return false; }
}

/** Forma de asset que entiende compai/datosFinca.js. */
export function inventarioMatas(storage = globalThis.localStorage) {
  return leerMatas(storage).map((mata) => ({
    speciesSlug: mata.especie,
    name: mata.comun || mata.especie,
    status: mata.estado || 'sembrada',
    attributes: { species_slug: mata.especie, name: mata.comun || mata.especie, status: mata.estado || 'sembrada' },
  }));
}

export default { LLAVE_MIS_MATAS, leerMatas, guardarMatas, inventarioMatas };
