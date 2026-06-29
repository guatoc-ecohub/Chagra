import sipsaProductMap from '../data/sipsaProductMap.json';

const fold = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

export function resolveSipsaProduct(nombreSipsa) {
  const key = fold(nombreSipsa);
  return sipsaProductMap[key] || null;
}

/**
 * Índice inverso slug de especie → nombre de producto SIPSA (la clave del mapa).
 * Construido una sola vez. Si dos productos comparten slug (p. ej. platano y
 * banano → musa_paradisiaca; frijol y habichuela → phaseolus_vulgaris), gana el
 * PRIMERO declarado en el JSON (orden de inserción) — determinista. Excluye la
 * clave `_comment` del JSON.
 */
const slugToProducto = (() => {
  const idx = {};
  for (const [producto, slug] of Object.entries(sipsaProductMap)) {
    if (producto.startsWith('_')) continue;
    if (!Object.prototype.hasOwnProperty.call(idx, slug)) idx[slug] = producto;
  }
  return idx;
})();

/**
 * Resuelve el nombre de producto SIPSA a partir del slug de especie del
 * catálogo (`subject_slug` de un ciclo). Devuelve la clave del mapa (p. ej.
 * 'papa', 'tomate', 'aguacate') para consultar precios, o `null` si la especie
 * no tiene producto SIPSA mapeado (honesto, no inventa).
 *
 * @param {string} slug — slug de especie (`solanum_tuberosum`).
 * @returns {string|null} nombre de producto SIPSA o null.
 */
export function resolveProductoFromSlug(slug) {
  if (typeof slug !== 'string' || !slug.trim()) return null;
  return slugToProducto[slug.trim()] || null;
}
