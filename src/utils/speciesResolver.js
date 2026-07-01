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
 * Bug 2026-06-21 (operador, demo — CRUCE DE FOTOS): la ficha de una especie
 * mostraba la FOTO de OTRA especie porque el último recurso (inclusión por
 * SUBSTRING) cruzaba géneros distintos:
 *   - "limón"  → "Limonaria" (cymbopogon_citratus, una hierba) porque "limon"
 *     es prefijo de "limonaria" (sin tildes). DEBE ser un cítrico real.
 *   - "tomate" → "Tomate de árbol" (solanum_betaceum) porque era la primera
 *     coincidencia parcial en el orden de iteración. DEBE ser un tomate de
 *     mesa real (solanum_lycopersicum*).
 *
 * Solución: prioridad ESTRICTA —
 *   (0) alias curado de confusiones conocidas (consultado antes del fuzzy),
 *   (a) id/slug exacto del catálogo,
 *   (b) nombre común exacto normalizado (cada nombre separado por "/"),
 *   (c) match por PALABRA COMPLETA con frontera (NUNCA a mitad de palabra),
 *   (d) desempate por nombre más corto/genérico sin cruzar género.
 *
 * Este util centraliza el matching tolerante. Lo usan AssetDetailView
 * (imagen + plan) y CicloDetalle. Funciones puras y testeables — sin imports
 * de React ni de IDB.
 */

/**
 * Calificadores de estructura/ubicación que el operador agrega al nombre de un
 * cultivo de su finca y que NO son parte del nombre de la ESPECIE. El campesino
 * nombra sus plantas por dónde están o en qué unidad: "Fresa - Invernadero #1",
 * "Tomate - Era 3", "Guayaba - Lote 2", "Mora - Cama 4". El nombre de la especie
 * es siempre lo que va ANTES del " - "; lo de después es ubicación/manejo.
 *
 * Estas palabras también aparecen a veces sin guion ("Fresa Invernadero 1") y se
 * recortan como sufijo cuando son la última palabra significativa. Lista cerrada
 * y conservadora: solo términos de estructura predial inequívocos, NUNCA nombres
 * de especie (anti-confusión: no recortar "árbol" porque "Tomate de árbol" es una
 * especie distinta — por eso "arbol" NO está aquí).
 */
const FARM_STRUCTURE_WORDS = [
  'invernadero', 'era', 'eras', 'cama', 'camas', 'lote', 'lotes',
  'surco', 'surcos', 'bancal', 'bancales', 'parcela', 'parcelas',
  'huerta', 'huerto', 'maceta', 'macetas', 'bolsa', 'bolsas',
  'tunel', 'mesa', 'mesas', 'hilera', 'hileras', 'planta', 'plantas',
];

const STRUCTURE_RE = new RegExp(`^(?:${FARM_STRUCTURE_WORDS.join('|')})\\b`);

/**
 * Normaliza un string para comparación laxa: minúsculas, sin acentos, sin
 * sufijos de conteo (`#3`, `#01`, ` 3`), sin calificadores de estructura/
 * ubicación de finca ("- Invernadero"), guiones-bajos/espacios colapsados.
 *
 * Reduce el nombre que escribe el operador ("Fresa - Invernadero #1") al nombre
 * de la ESPECIE ("fresa") para que matchee el catálogo, sin tocar nombres
 * científicos entre paréntesis ("Tomate (Solanum lycopersicum)" → se conserva
 * para que el paso 2/3 los aproveche).
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeForMatch(value) {
  if (!value || typeof value !== 'string') return '';
  let s = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos/diacríticos
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .trim();

  // 1) Recorta el calificador de estructura/ubicación introducido por " - "
  //    cuando lo que sigue es una palabra de estructura predial conocida.
  //    "fresa - invernadero #1" → "fresa"; "guayaba - invernadero" → "guayaba".
  //    No recorta separadores que no sean estructura ("aji - dulce" se conserva).
  const dashIdx = s.indexOf(' - ');
  if (dashIdx > 0) {
    const tail = s.slice(dashIdx + 3).trim();
    if (STRUCTURE_RE.test(tail)) {
      s = s.slice(0, dashIdx).trim();
    }
  }

  // 2) Recorta un sufijo de estructura sin guion como última palabra significativa
  //    ("fresa invernadero 1" → "fresa"), respetando que quede al menos una
  //    palabra (no vaciar el nombre).
  s = s.replace(/\s+#?\d+\s*$/, '').trim(); // primero el conteo final "#3"/"3"/"#01"
  const words = s.split(' ');
  if (words.length > 1 && STRUCTURE_RE.test(words[words.length - 1])) {
    words.pop();
    s = words.join(' ').trim();
  }

  // 3) Recorta cualquier conteo residual (#01) que haya quedado tras el calificador.
  s = s.replace(/\s*#\d+\s*$/, '').trim();
  return s;
}

/**
 * Mapa de alias curado de confusiones CONOCIDAS de cruce de género. Se
 * consulta ANTES del fuzzy: si la consulta normalizada coincide EXACTO con
 * una clave y el id destino EXISTE en el catálogo, gana sin ambigüedad.
 *
 * Clave: consulta normalizada (lowercase, sin acentos). Valor: id canónico.
 *
 * Regla de oro: NUNCA dejar que "limonaria"/"citronela"/"limoncillo"
 * (cymbopogon, una hierba) sea el resultado de buscar "limón" (un cítrico).
 * Estos alias solo aplican cuando el destino existe; si no, se cae al fuzzy
 * por palabra completa (que tampoco cruza géneros).
 */
const CURATED_ALIASES = {
  // limón / limon → cítrico real, NUNCA cymbopogon (limonaria/citronela).
  limon: 'citrus_latifolia',
  // tomate (de mesa) → un tomate real, NUNCA solanum_betaceum (tomate de árbol).
  tomate: 'solanum_lycopersicum_cerasiforme',
  // fresa / frutilla → fragaria (con cultivar que SÍ tiene foto en el JSON).
  fresa: 'fragaria_ananassa_monterrey',
  frutilla: 'fragaria_ananassa_monterrey',
  // frijol → frijol común (Phaseolus), no caupí (Vigna). Ambos son frijol,
  // pero el común es el default esperado por el operador.
  frijol: 'phaseolus_vulgaris',
  // papa → papa canónica (Solanum tuberosum), NUNCA "papa china" (Colocasia
  // esculenta) ni papayuela. Confusión surgida al ampliar el catálogo con
  // colocasia ("Taro / Papa china"), cuyo nombre contiene la palabra "papa".
  papa: 'solanum_tuberosum',
  // guayaba → guayaba común (Psidium guajava, cultivar manzana) que tiene el
  // ciclo PERENNE grounded de Agrosavia, NUNCA "Guayaba ácida" (Psidium
  // friedrichsthalianum) ni otra Psidium. Confusión surgida al ampliar el
  // catálogo con friedrichsthalianum, cuyo nombre común coincide más corto.
  guayaba: 'psidium_guajava_manzana',
  // confusiones históricas del proyecto (gulupa/aguacate ≠ guayaba).
  gulupa: 'passiflora_edulis_morada',
  aguacate: 'persea_americana',
};

/**
 * Divide el nombre común del catálogo en sus nombres alternativos. El
 * catálogo usa "/" para listar variantes ("Tomate de árbol / Tamarillo",
 * "Cebollín / Cebolla larga"). Devuelve cada nombre ya normalizado.
 * @param {string} nombreComun
 * @returns {string[]}
 */
function splitCommonNames(nombreComun) {
  return String(nombreComun || '')
    .split('/')
    .map((part) => normalizeForMatch(part))
    .filter(Boolean);
}

/**
 * ¿La consulta `query` aparece como PALABRA COMPLETA dentro de `text`?
 * Frontera = inicio/fin de string o un carácter no alfanumérico. Así "limon"
 * coincide con "limon tahiti" (palabra "limon") pero NO con "limonaria"
 * (la "limon" va pegada a "aria"); "tomate" coincide con "tomate de arbol"
 * y "tomate cherry" (ambos tienen la palabra entera "tomate").
 * Ambos argumentos deben venir ya normalizados.
 * @param {string} text
 * @param {string} query
 * @returns {boolean}
 */
function containsWholeWord(text, query) {
  if (!text || !query) return false;
  if (text === query) return true;
  let from = 0;
  let idx = text.indexOf(query, from);
  while (idx !== -1) {
    const before = idx === 0 ? '' : text[idx - 1];
    const afterIdx = idx + query.length;
    const after = afterIdx >= text.length ? '' : text[afterIdx];
    const beforeOk = before === '' || !/[a-z0-9]/.test(before);
    const afterOk = after === '' || !/[a-z0-9]/.test(after);
    if (beforeOk && afterOk) return true;
    from = idx + 1;
    idx = text.indexOf(query, from);
  }
  return false;
}

/**
 * Encuentra la especie del catálogo que corresponde a un asset, tolerando
 * que el `slug` derivado del nombre no coincida con el `id` canónico.
 *
 * Prioridad estricta (la primera que matchea gana):
 *   0. Alias curado (confusiones conocidas), solo si el destino existe.
 *   1. id/slug exacto del catálogo.
 *   2. Nombre común / científico EXACTO normalizado (cada nombre del "/").
 *   3. Palabra completa con frontera (consulta = palabra entera del nombre).
 *      Desempate: nombre común más corto/genérico, sin cruzar género.
 *
 * @param {Array<object>} list — especies del catálogo (getAllSpecies()).
 * @param {string|null} slug — slug/id candidato (deriveSpeciesSlug o _speciesSlug).
 * @param {string|null} [name] - nombre legible del asset (ej. "Fresa #1").
 * @returns {object|null} la especie del catálogo, o null si no hay match.
 */
export function matchSpeciesInCatalog(list, slug, name) {
  if (!Array.isArray(list) || list.length === 0) return null;

  const slugNorm = normalizeForMatch(slug);
  const nameNorm = normalizeForMatch(name);
  const candidates = [slugNorm, nameNorm].filter(Boolean);

  // 0) Alias curado de confusiones conocidas — consultado ANTES del fuzzy.
  //    Solo aplica si la consulta coincide EXACTO con una clave y el id
  //    destino EXISTE en este catálogo (evita romper catálogos de test o
  //    subsets que no tengan ese cultivar).
  for (const c of candidates) {
    const aliasTarget = CURATED_ALIASES[c];
    if (aliasTarget) {
      const hit = list.find((s) => s?.id === aliasTarget || s?.slug === aliasTarget);
      if (hit) return hit;
    }
  }

  // 1) match exacto por id o slug del catálogo (camino canónico).
  if (slug) {
    const exact = list.find((s) => s?.id === slug || s?.slug === slug);
    if (exact) return exact;
  }

  if (candidates.length === 0) return null;

  // 2) match EXACTO por nombre común o científico normalizado. El nombre
  //    común puede listar variantes con "/" → comparar contra cada una.
  const byExactCommon = list.find((s) => {
    const commonNames = splitCommonNames(s?.nombre_comun);
    const sci = normalizeForMatch(s?.nombre_cientifico);
    return candidates.some(
      (c) => commonNames.includes(c) || (sci && c === sci),
    );
  });
  if (byExactCommon) return byExactCommon;

  // 3) match por PALABRA COMPLETA con frontera (nunca a mitad de palabra).
  //    Desempatamos por el nombre común que MATCHEÓ más corto/genérico, para
  //    preferir "Limón Tahití" sobre variantes largas y NUNCA agarrar una
  //    palabra pegada (limonaria). Usamos solo la longitud del nombre que
  //    realmente coincidió (no la del más corto de toda la entrada), así un
  //    alias colateral corto ("Cowpea") no gana sobre el match directo.
  let best = null;
  let bestLen = Infinity;
  for (const s of list) {
    if (!s) continue;
    const commonNames = splitCommonNames(s?.nombre_comun);
    if (commonNames.length === 0) continue;
    // Longitud del nombre común MÁS CORTO entre los que coinciden por palabra
    // completa con algún candidato (la consulta es palabra entera del nombre,
    // o el nombre es palabra entera de la consulta — ej. "café colombiano").
    let matchedLen = Infinity;
    for (const cn of commonNames) {
      const hit = candidates.some(
        (c) => c.length >= 3 && (containsWholeWord(cn, c) || containsWholeWord(c, cn)),
      );
      if (hit && cn.length < matchedLen) matchedLen = cn.length;
    }
    if (matchedLen === Infinity) continue;
    if (matchedLen < bestLen) {
      best = s;
      bestLen = matchedLen;
    }
  }
  if (best) return best;

  return null;
}

export default matchSpeciesInCatalog;

export const __TEST__ = {
  CURATED_ALIASES,
  containsWholeWord,
  splitCommonNames,
};
