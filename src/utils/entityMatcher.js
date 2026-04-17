/**
 * entityMatcher.js — Resolucion fuzzy de entidades contra la taxonomia
 * local. Diseñado para el pipeline de voz: transcripciones de Whisper
 * suelen traer errores ("sarandano"→"arandano", "Invernadero 1" cuando
 * solo existe "invernadero"), y necesitamos mapear al nombre canonico.
 *
 * Diferencias respecto a fuzzySearch.js:
 *   - Bidireccional (acepta que el query sea mas largo o mas corto).
 *   - Usa distancia de Levenshtein + bonus por substring match.
 *   - Devuelve score 0..1 normalizado, no ranking interno.
 */

export const normalize = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
};

/**
 * Similaridad 0..1 entre dos strings, tolerante a acentos/mayusculas.
 * - 1.0 si son iguales tras normalizar.
 * - 0.7..1.0 si uno contiene al otro (bonus por substring).
 * - sino, 1 - levenshtein / max(len).
 */
export const similarity = (a, b) => {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    const longer = Math.max(na.length, nb.length);
    const shorter = Math.min(na.length, nb.length);
    return 0.7 + 0.3 * (shorter / longer);
  }
  const d = levenshtein(na, nb);
  return 1 - d / Math.max(na.length, nb.length);
};

/**
 * Busca el candidato con mayor similaridad al query. Retorna null si
 * ningun candidato supera el threshold.
 *
 * @param {string} query
 * @param {Array} candidates
 * @param {(c:any)=>string} keyFn - extrae el string comparable del candidato.
 * @param {number} threshold - similaridad minima (default 0.65).
 * @returns {{match: any, score: number} | null}
 */
export const bestFuzzyMatch = (query, candidates, keyFn = (x) => x, threshold = 0.65) => {
  if (!query || !Array.isArray(candidates) || candidates.length === 0) return null;
  let best = null;
  for (const c of candidates) {
    const key = keyFn(c);
    if (!key) continue;
    const s = similarity(query, key);
    if (s >= threshold && (!best || s > best.score)) {
      best = { match: c, score: s };
    }
  }
  return best;
};
