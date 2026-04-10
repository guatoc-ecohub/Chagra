/**
 * fuzzySearch.js — Fuzzy match ligero para el selector de especies.
 *
 * Soporta búsqueda aproximada: "Gulpa" → "Gulupa", "pasiflo" → "Passiflora".
 * Basado en distancia de subsecuencia con scoring simple:
 *   - Coincidencia exacta al inicio: bonus alto
 *   - Subsecuencia continua: bonus medio
 *   - Caracteres dispersos: penalización
 *
 * No usar para volúmenes > 5000 items; para eso se necesita un trie.
 */

const normalize = (str) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remueve diacríticos (á→a, ñ→n)
    .replace(/\s+/g, ' ')
    .trim();

// Score de match: cuanto mayor, más relevante.
// Retorna -1 si no hay match.
const score = (query, target) => {
  const q = normalize(query);
  const t = normalize(target);
  if (!q) return 0; // query vacío → todo pasa

  // Coincidencia exacta al inicio → bonus máximo
  if (t.startsWith(q)) return 1000 + (t.length - q.length === 0 ? 500 : 0);

  // Contención → bonus alto
  const idx = t.indexOf(q);
  if (idx >= 0) return 800 - idx;

  // Subsecuencia dispersa → scoring por continuidad
  let qi = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  let total = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      consecutive++;
      total += consecutive; // bonus por rachas continuas
      if (consecutive > maxConsecutive) maxConsecutive = consecutive;
    } else {
      consecutive = 0;
    }
  }

  if (qi < q.length) return -1; // no todos los chars del query fueron encontrados
  return total + maxConsecutive * 10;
};

/**
 * Filtra y ordena items por relevancia fuzzy contra una query.
 * @param {string} query - texto del operario
 * @param {Array} items - objetos a filtrar
 * @param {Function} accessor - función que extrae el string buscable del item
 * @param {number} limit - máximo de resultados (default 30)
 * @returns {Array} items ordenados por score descendente
 */
export const fuzzyFilter = (query, items, accessor = (x) => x, limit = 30) => {
  if (!query || !query.trim()) return items.slice(0, limit);

  return items
    .map((item) => ({ item, score: score(query, accessor(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);
};

export default fuzzyFilter;
