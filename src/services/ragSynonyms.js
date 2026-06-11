/**
 * ragSynonyms — expansión de sinónimos campesino→canónico para BM25.
 *
 * AIA-004: el retriever léxico no matchea términos campesinos contra
 * el vocabulario técnico de las fichas. Este diccionario expande la
 * tokenización del query con equivalentes canónicos para mejorar recall
 * SIN modificar los documentos (los docs mantienen su vocabulario original).
 *
 * Los mapeos vienen de:
 *   - Glosario taxonómico del catálogo (chagra-catalog-oss-subset-v3.2)
 *   - Nombres comunes documentados en las fichas de cycle-content
 *   - Vocabulario campesino colombiano recopilado en campo (Guatoc/Choachí)
 *
 * Regla: SOLO mapeos verificables contra el catálogo o las fichas.
 * CERO invención de equivalencias dudosas.
 *
 * @type {Record<string, string[]>}
 */
export const CAMPESINO_SYNONYMS = {
  // ── Plagas (nombre campesino → canónico en ficha) ─────────
  'gusano': ['plaga', 'larva', 'oruga'],
  'bicho': ['plaga', 'insecto', 'afido'],
  'cogollero': ['gusano', 'plaga', 'spodoptera'],
  'broca': ['gorgojo', 'barrenador', 'hypothenemus'],
  'roya': ['hongo', 'roya', 'hemileia'],
  'gota': ['tizon', 'phytophthora', 'hongo'],
  'palomilla': ['mariposa', 'polilla', 'lepidoptera'],
  'chinche': ['hemiptera', 'chupador', 'plaga'],
  'nematodo': ['gusano', 'microscopico', 'suelo'],

  // ── Control / manejo ──────────────────────────────────────
  'matamaleza': ['herbicida', 'control', 'maleza', 'arvenses'],
  'fumigar': ['aplicar', 'asperjar', 'control', 'tratamiento'],
  'remedio': ['control', 'tratamiento', 'manejo', 'biopreparado'],
  'caldo': ['bordeles', 'fungicida', 'preventivo', 'cobre'],
  'ceniza': ['potasio', 'mineral', 'fertilizante'],

  // ── Cultivo / siembra ─────────────────────────────────────
  'sembrar': ['cultivar', 'establecer', 'siembra', 'plantar'],
  'cosechar': ['recoger', 'recoleccion', 'cosecha', 'produccion'],
  'abonar': ['fertilizar', 'nutrir', 'abono', 'compost'],
  'podar': ['cortar', 'poda', 'formacion', 'mantenimiento'],
  'aporcar': ['arrimar', 'tierra', 'tuberculo', 'cubrir'],

  // ── Agua / clima ──────────────────────────────────────────
  'secar': ['marchitar', 'estres', 'hidrico', 'sequia'],
  'inundar': ['encharcar', 'exceso', 'agua', 'drenaje'],
  'helada': ['escarcha', 'frio', 'congelacion', 'temperatura'],
  'verano': ['sequia', 'seco', 'estiaje', 'calor'],
  'invierno': ['lluvia', 'humedo', 'temporal', 'precipitacion'],

  // ── Suelo / tierra ────────────────────────────────────────
  'tierra': ['suelo', 'sustrato', 'terreno'],
  'loma': ['ladera', 'pendiente', 'colina', 'inclinado'],
  'barrial': ['arcilloso', 'pesado', 'compacto', 'greda'],
  'cascajo': ['pedregoso', 'gravilla', 'drenaje', 'suelto'],
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
