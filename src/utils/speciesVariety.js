/**
 * speciesVariety.js — helpers para resolver variedades registradas ICA por
 * especie del catálogo (UX-14 / #286).
 *
 * Contexto: el catálogo Chagra (`chagra-catalog-seed-v3.1.json`) expone
 * el campo `variedades_registradas_ica: [{ nombre_comercial, ... }]` para
 * un subset de especies (papa, arracacha, etc.) donde ICA ha registrado
 * cultivares oficiales. La mayoría de especies NO trae ese campo.
 *
 * Decisión UX-14:
 *   - SI la especie tiene `variedades_registradas_ica.length > 0` →
 *     mostrar dropdown con autocomplete + opción "otra".
 *   - SI no trae el campo / array vacío → OCULTAR el campo "Variedad"
 *     completo (no pedirle al usuario algo que ni el catálogo conoce).
 *
 * El campo "Variedad" actual en SeedingLog era un input ciego sin contexto
 * que pedía variedad para CUALQUIER cosa (fresa, romero, papayuela) sin
 * distinción — reportado por operador 2026-05-27.
 *
 * Acceso al catálogo: vía `getSpeciesByIdSync(id)` (catalogDB SQLite WASM
 * ya pre-cargado en App.jsx). Si la DB no está lista, retornamos array
 * vacío (graceful degradation) y el componente oculta el campo.
 */

/**
 * Extrae las variedades formateadas para UI a partir de un objeto species
 * del catálogo. Returns array de { value, label, obtentor } o [] si no hay.
 *
 * @param {object|null|undefined} species — objeto species del catálogo
 * @returns {Array<{value: string, label: string, obtentor?: string}>}
 */
export function extractVarieties(species) {
  if (!species || typeof species !== 'object') return [];
  const list = species.variedades_registradas_ica;
  if (!Array.isArray(list) || list.length === 0) return [];
  return list
    .map((v) => {
      if (!v || typeof v !== 'object') return null;
      const label = (v.nombre_comercial || v.id_canonico || '').trim();
      if (!label) return null;
      return {
        value: label,
        label,
        obtentor: v.obtentor?.nombre || null,
      };
    })
    .filter(Boolean);
}

/**
 * Decide si el campo "Variedad" debe mostrarse en el form de siembra
 * para una especie del catálogo dada.
 *
 * Reglas:
 *   - species null/undefined o sin id → false (sin contexto, sin pedirlo).
 *   - species tiene >=1 variedad ICA → true.
 *   - species sin el campo / array vacío → false.
 *
 * NOTA: cuando el operador escribe el cultivo en free-text (sin elegir
 * del catálogo), species será null y devolvemos false. El form puede
 * mostrar un input "opcional" en ese case si el equipo decide.
 *
 * @param {object|null|undefined} species
 * @returns {boolean}
 */
export function shouldShowVarietyField(species) {
  return extractVarieties(species).length > 0;
}

/**
 * Mensaje informativo opcional para mostrar arriba del dropdown.
 * Devuelve string o null si no aplica.
 *
 * @param {Array} varieties
 * @returns {string|null}
 */
export function varietyHelpText(varieties) {
  if (!Array.isArray(varieties) || varieties.length === 0) return null;
  return `${varieties.length} variedad${varieties.length === 1 ? '' : 'es'} registrada${varieties.length === 1 ? '' : 's'} por ICA. Si la tuya no aparece, elige "Otra" y escríbela.`;
}
