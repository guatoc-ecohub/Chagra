/**
 * entityMatcher.ts — Resolución fuzzy de entidades contra la taxonomía local.
 * Port TypeScript de entityMatcher.js (origin/main 663f562).
 *
 * Diseñado para el pipeline de voz: transcripciones de Whisper suelen traer
 * errores ("sarandano"→"arandano", "Invernadero 1" cuando solo existe
 * "invernadero"), y necesitamos mapear al nombre canónico.
 *
 * - Bidireccional (acepta que el query sea más largo o más corto).
 * - Levenshtein + bonus por substring match.
 * - Score 0..1 normalizado.
 */

export const normalize = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
};

/**
 * Similaridad 0..1 entre dos strings, tolerante a acentos/mayúsculas.
 * - 1.0 si son iguales tras normalizar.
 * - 0.7..1.0 si uno contiene al otro (bonus por substring).
 * - sino, 1 - levenshtein / max(len).
 */
export const similarity = (a: string, b: string): number => {
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
 * ningún candidato supera el threshold.
 */
export const bestFuzzyMatch = <T>(
  query: string,
  candidates: T[],
  keyFn: (c: T) => string = (x) => String(x),
  threshold = 0.65
): { match: T; score: number } | null => {
  if (!query || !Array.isArray(candidates) || candidates.length === 0) return null;
  let best: { match: T; score: number } | null = null;
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
