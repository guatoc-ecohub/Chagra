import CAMPESINO_JSON from '../data/campesino-synonyms.json';

/**
 * @type {Record<string, string[]>}
 */
export const CAMPESINO_SYNONYMS = {
  ...CAMPESINO_JSON.plagas,
  ...CAMPESINO_JSON.control,
  ...CAMPESINO_JSON.cultivo,
  ...CAMPESINO_JSON.clima,
  ...CAMPESINO_JSON.suelo_vocab,
  ...CAMPESINO_JSON.partes_planta,
  ...CAMPESINO_JSON.labores,
  ...CAMPESINO_JSON.plaga_hospedero,
};

/**
 * Expande los tokens de una query con sinónimos campesinos.
 * Cada token que matchea una clave del diccionario se expande
 * con sus equivalentes canónicos.
 *
 * @param {string[]} tokens — tokens normalizados de la query
 * @returns {string[]} tokens originales + tokens canónicos expandidos
 */
export function expandQueryTokens(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return tokens;
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const synonyms = CAMPESINO_SYNONYMS[token];
    if (synonyms) {
      synonyms.forEach((s) => expanded.add(s));
    }
  }
  return Array.from(expanded);
}
