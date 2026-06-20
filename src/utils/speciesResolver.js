/**
 * speciesResolver.js — Resolución tolerante de un asset (planta) a su entrada
 * en el catálogo.
 *
 * Bug 2026-06-20 (operador, fresa): una planta sembrada se guarda con el
 * nombre común que escribió el operador (ej. "Fresa") y, en muchos assets
 * antiguos, SIN el `_speciesSlug` canónico. `deriveSpeciesSlug("Fresa")`
 * produce `"fresa"`, que NO coincide con el `id` del catálogo
 * (`fragaria_ananassa`). Esa des-coincidencia rompía dos cosas en la ficha:
 *   - El plan de alimentación ("Sin plan disponible" aunque el catálogo SÍ
 *     tiene `feeding_plan_template`).
 *   - La imagen de referencia (nunca resolvía nombre científico → fallback
 *     genérico sin contexto).
 *
 * Este util centraliza el matching tolerante: primero por id/slug exacto,
 * luego por nombre común normalizado, y como último recurso por inclusión
 * parcial. Lo usan AssetDetailView (imagen + plan). Funciones puras y
 * testeables — sin imports de React ni de IDB.
 */

/**
 * Normaliza un string para comparación laxa: minúsculas, sin acentos, sin
 * sufijos de conteo (`#3`), guiones-bajos/espacios colapsados.
 * @param {string} value
 * @returns {string}
 */
export function normalizeForMatch(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos/diacríticos
    .toLowerCase()
    .replace(/\s+#\d+\s*$/, '') // sufijo de conteo "#3"
    .replace(/[_\s]+/g, ' ')
    .trim();
}

/**
 * Encuentra la especie del catálogo que corresponde a un asset, tolerando
 * que el `slug` derivado del nombre no coincida con el `id` canónico.
 *
 * @param {Array<object>} list — especies del catálogo (getAllSpecies()).
 * @param {string|null} slug — slug/id candidato (deriveSpeciesSlug o _speciesSlug).
 * @param {string|null} [name] — nombre legible del asset (ej. "Fresa #1").
 * @returns {object|null} la especie del catálogo, o null si no hay match.
 */
export function matchSpeciesInCatalog(list, slug, name) {
  if (!Array.isArray(list) || list.length === 0) return null;

  const slugNorm = normalizeForMatch(slug);
  const nameNorm = normalizeForMatch(name);

  // 1) match exacto por id o slug del catálogo (camino canónico).
  if (slug) {
    const exact = list.find((s) => s?.id === slug || s?.slug === slug);
    if (exact) return exact;
  }

  // 2) match por nombre común normalizado (asset viejo sin _speciesSlug).
  //    Probamos contra ambos candidatos normalizados (slug y nombre).
  const candidates = [slugNorm, nameNorm].filter(Boolean);
  if (candidates.length > 0) {
    const byCommon = list.find((s) => {
      const common = normalizeForMatch(s?.nombre_comun);
      const sci = normalizeForMatch(s?.nombre_cientifico);
      return candidates.some((c) => c && (c === common || c === sci));
    });
    if (byCommon) return byCommon;

    // 3) último recurso: inclusión parcial del nombre común (ej. "fresa
    //    criolla" → "fresa"). Solo si el candidato tiene ≥3 chars para
    //    evitar falsos positivos.
    const byPartial = list.find((s) => {
      const common = normalizeForMatch(s?.nombre_comun);
      if (!common) return false;
      return candidates.some(
        (c) => c.length >= 3 && (common.includes(c) || c.includes(common)),
      );
    });
    if (byPartial) return byPartial;
  }

  return null;
}

export default matchSpeciesInCatalog;
