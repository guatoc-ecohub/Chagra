/**
 * pedagogicalText.js — convierte el `valor_pedagogico` (y prosa curada similar
 * del catálogo) de un MURO de texto denso en una estructura LEGIBLE: intro,
 * secciones con subtítulo, párrafos cortos, viñetas y una nota de fuentes.
 *
 * El catálogo guarda cada `valor_pedagogico` como un único bloque larguísimo
 * (hasta ~6.000 caracteres) sin saltos de línea, con "encabezados" embebidos en
 * medio de la frase ("Manejo agroecológico: …", "Fuentes Tier A: …",
 * "Lección de Milpa: …"). Volcarlo crudo produce el muro ilegible que reporta
 * el operador. Este parser es PRESENTACIÓN PURA: reordena y sanea el MISMO
 * texto; nunca inventa, traduce ni añade datos.
 *
 * Salida:
 *   {
 *     intro:    string[]  // párrafos del bloque inicial (sin encabezado)
 *     sections: Array<{ title: string, kind: 'section', paragraphs: string[], bullets: string[]|null }>
 *     sources:  string[] | null  // fuentes citadas, ya separadas en items
 *   }
 *
 * Todo es puro y determinista para poder testearlo sin DOM.
 */

/** Longitud máxima de un párrafo agrupado (caracteres) antes de cortar. */
const PARAGRAPH_MAX_CHARS = 260;
/** Máximo de oraciones por párrafo agrupado. */
const PARAGRAPH_MAX_SENTENCES = 2;
/**
 * Tope para envolver por CLÁUSULAS. Muchas fichas son una sola "oración"
 * larguísima con decenas de comas (no hay dónde cortar por punto). Por encima
 * de este umbral partimos por comas/;/:/— (fuera de paréntesis) para que ningún
 * párrafo quede como muro.
 */
const CLAUSE_WRAP_CHARS = 300;

/**
 * Abreviaturas (sin punto final) tras las cuales un "." NO cierra oración.
 * Incluye iniciales de autor botánico e indicadores comunes en la prosa.
 */
const ABBREVIATIONS = new Set([
  'res', 'art', 'arts', 'num', 'nums', 'no', 'nro', 'etc', 'aprox', 'cf',
  'var', 'subsp', 'ssp', 'spp', 'sp', 'cv', 'fig', 'figs', 'tab', 'tabs',
  'p', 'pp', 'ej', 'dr', 'dra', 'sr', 'sra', 'st', 'vs', 'ca', 'vol',
  'ed', 'eds', 'al', 'inc', 'ltda', 'dc', 'ac', 'msnm', 'hunt', 'haw',
]);

/**
 * "Cabezas" de encabezado de sección conocidas (normalizadas, sin acentos).
 * Una oración que EMPIEZA con una de estas + ":" se promueve a subtítulo.
 * La lista es un allowlist deliberado para no confundir dos-puntos internos
 * ("Colombia produce dos pitayas: …") con secciones reales.
 */
const SECTION_HEADS = new Set([
  'manejo', 'leccion', 'forraje', 'usos', 'uso', 'variedades', 'proteccion',
  'servicio', 'servicios', 'distribucion', 'estado', 'conservacion',
  'principio', 'principios', 'amenazas', 'amenaza', 'cultivo', 'cobertura',
  'asocios', 'asocio', 'companion', 'flores', 'flor', 'control', 'frutos',
  'fruto', 'madera', 'grano', 'granos', 'custodia', 'precaucion', 'cerca',
  'potencial', 'atrayente', 'atractora', 'plagas', 'plaga', 'diferencia',
  'confianza', 'propagacion', 'cosecha', 'siembra', 'nutricion', 'nutricional',
  'ecologia', 'fenologia', 'floracion', 'polinizacion', 'raices', 'raiz',
  'semilla', 'semillas', 'tallo', 'hoja', 'hojas', 'importancia', 'origen',
  'taxonomia', 'morfologia', 'habitat', 'riego', 'suelo', 'suelos', 'clima',
  'advertencia', 'nota', 'notas', 'toxicidad', 'seguridad', 'aplicacion',
  'dosis', 'ingredientes', 'preparacion', 'proceso', 'funcion', 'rol',
]);

/** Palabras cabecera que identifican un bloque de FUENTES/procedencia. */
const SOURCE_HEADS = new Set(['fuente', 'fuentes', 'referencia', 'referencias', 'bibliografia']);

/** Quita acentos y pasa a minúsculas (para comparar cabezas de sección). */
function deburr(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Sanea el bloque crudo: normaliza espacios, equilibra paréntesis (algunos
 * registros traen cierres de más) y garantiza puntuación terminal. No reordena
 * ni recorta contenido real — solo repara lo que rompe el render.
 * @param {string} raw
 * @returns {string}
 */
/**
 * Equilibra paréntesis: descarta ')' sin apertura y cierra '(' colgados. Se usa
 * tanto sobre el bloque completo como sobre cada trozo emitido, para que ningún
 * párrafo/viñeta quede con un paréntesis huérfano en el corte.
 * @param {string} str
 * @returns {string}
 */
function balanceParens(str) {
  let depth = 0;
  let out = '';
  for (const ch of String(str || '')) {
    if (ch === '(') {
      depth += 1;
      out += ch;
    } else if (ch === ')') {
      if (depth > 0) {
        depth -= 1;
        out += ch;
      } // si depth===0 → cierre huérfano: se descarta
    } else {
      out += ch;
    }
  }
  if (depth > 0) out += ')'.repeat(depth);
  return out.trim();
}

export function sanitizePedagogicalText(raw) {
  let t = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';

  // Quitar énfasis markdown accidental (**negrita**) — no renderizamos markdown.
  t = t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*\*/g, '').trim();

  t = balanceParens(t);

  // Puntuación terminal (evita el aspecto "truncado").
  if (t && !/[.!?)»”"']$/.test(t)) t += '.';
  return t;
}

/**
 * Divide un texto en oraciones respetando abreviaturas, iniciales de autor
 * (una sola mayúscula), decimales y millares. Corta en ". " / "? " / "! " solo
 * cuando lo que sigue arranca una oración nueva (mayúscula, dígito o apertura).
 * @param {string} text
 * @returns {string[]}
 */
export function splitSentences(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  const sentences = [];
  let start = 0;
  let depth = 0; // profundidad de paréntesis: no cortamos dentro de "( … )"

  for (let i = 0; i < t.length; i += 1) {
    const ch = t[i];
    if (ch === '(') { depth += 1; continue; }
    if (ch === ')') { if (depth > 0) depth -= 1; continue; }
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    if (depth > 0) continue; // punto dentro de paréntesis → no es frontera

    // Debe seguir espacio (o fin de cadena) para ser posible frontera.
    const next = t[i + 1];
    if (next !== undefined && next !== ' ') continue;

    // Char que arranca la siguiente oración.
    let j = i + 1;
    while (j < t.length && t[j] === ' ') j += 1;
    const following = t[j];

    if (ch === '.') {
      // Palabra previa al punto (último token, sin paréntesis).
      const before = t.slice(start, i);
      const lastWord = deburr(before.split(/[\s(]/).pop() || '');
      // Último segmento tras "." → cubre iniciales encadenadas ("C.I", "R.D.Webster").
      const lastSeg = lastWord.split('.').filter(Boolean).pop() || lastWord;
      // Inicial de autor / género (una sola letra) o abreviatura conocida.
      if (lastSeg.length === 1 && /[a-záéíóúñ]/.test(lastSeg)) continue;
      if (ABBREVIATIONS.has(lastSeg) || ABBREVIATIONS.has(lastWord)) continue;
      // Punto entre dígitos con espacio es raro, pero si el previo es dígito y
      // el siguiente es dígito (p. ej. "Res. 3168"), ya lo cubre la abreviatura.
    }

    // La siguiente debe abrir oración: mayúscula, dígito, ¿, ¡, comillas o (.
    if (following !== undefined && !/[A-ZÁÉÍÓÚÑ0-9¿¡"'«(]/.test(following)) continue;

    const seg = t.slice(start, i + 1).trim();
    if (seg) sentences.push(seg);
    start = j;
  }
  const tail = t.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

/**
 * Si una oración empieza con "Encabezado: …", devuelve { title, rest, kind }.
 * `kind` es 'sources' cuando la cabeza es de fuentes, 'section' en otro caso.
 * Devuelve null si no hay encabezado reconocible.
 * @param {string} sentence
 */
function detectHeading(sentence) {
  const m = /^([^:]{2,48}?):\s+(.*)$/s.exec(sentence);
  if (!m) return null;
  const label = m[1].trim();
  const rest = m[2].trim();
  if (!rest) return null;

  const words = label.split(/\s+/);
  if (words.length > 5) return null; // demasiado largo para ser encabezado

  const headWord = deburr(words[0]);
  const isAllCaps = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+$/.test(label) && label.length > 2;

  if (SOURCE_HEADS.has(headWord)) return { title: label, rest, kind: 'sources' };
  if (SECTION_HEADS.has(headWord) || isAllCaps) return { title: label, rest, kind: 'section' };
  return null;
}

/**
 * Parte un texto en cláusulas por ",", ";", ":" o "—" SEGUIDOS de espacio, pero
 * solo FUERA de paréntesis (no rompe listas parentéticas dejando "(" colgando).
 * @param {string} text
 * @returns {string[]}
 */
function splitClauses(text) {
  const t = String(text || '');
  const parts = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < t.length; i += 1) {
    const ch = t[i];
    if (ch === '(') depth += 1;
    else if (ch === ')' && depth > 0) depth -= 1;
    else if (depth === 0 && /[;:,—]/.test(ch) && t[i + 1] === ' ') {
      let j = i + 1;
      while (t[j] === ' ') j += 1;
      const seg = t.slice(start, i + 1).trim();
      if (seg) parts.push(seg);
      start = j;
    }
  }
  const tail = t.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

/**
 * Envuelve un párrafo demasiado largo (una sola oración con muchas comas) en
 * sub-párrafos ≤ CLAUSE_WRAP_CHARS partiendo por cláusulas. Si ya es corto, lo
 * devuelve tal cual.
 * @param {string} text
 * @returns {string[]}
 */
function softWrap(text) {
  if (text.length <= CLAUSE_WRAP_CHARS) return [text];
  const clauses = splitClauses(text);
  if (clauses.length <= 1) return [text];
  const chunks = [];
  let buf = '';
  for (const c of clauses) {
    if (buf && buf.length + 1 + c.length > CLAUSE_WRAP_CHARS) {
      chunks.push(buf);
      buf = c;
    } else {
      buf = buf ? `${buf} ${c}` : c;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

/** Agrupa oraciones en párrafos cortos (tope por nº de oraciones y caracteres). */
function groupParagraphs(sentences) {
  const paragraphs = [];
  let buf = [];
  let len = 0;
  const flush = () => {
    if (buf.length) {
      // Cada párrafo agrupado se envuelve por cláusulas si sigue siendo un muro,
      // y se equilibran paréntesis para que ningún corte deje uno huérfano.
      for (const p of softWrap(buf.join(' '))) paragraphs.push(balanceParens(p));
    }
    buf = [];
    len = 0;
  };
  for (const s of sentences) {
    const wouldOverflow = buf.length >= PARAGRAPH_MAX_SENTENCES
      || (len > 0 && len + s.length > PARAGRAPH_MAX_CHARS);
    if (wouldOverflow) flush();
    buf.push(s);
    len += s.length + 1;
  }
  flush();
  return paragraphs;
}

/** Separa una lista de fuentes ("GBIF, POWO Kew; SiB · ICA") en items limpios. */
function splitSourceItems(text) {
  return String(text || '')
    .replace(/\.$/, '')
    .split(/\s*[;·]\s*|\s*,\s+(?=[A-ZÁÉÍÓÚÑ0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Convierte el cuerpo de una sección en viñetas SOLO cuando enumera con claridad
 * (2+ punto-y-coma). Si no, se agrupa en párrafos. Evita partir por comas
 * (demasiado frecuentes dentro de una misma cláusula).
 * @param {string[]} sentences
 * @returns {{ paragraphs: string[], bullets: string[]|null }}
 */
function bodyToBlocks(sentences) {
  const joined = sentences.join(' ');
  const semis = (joined.match(/;/g) || []).length;
  if (semis >= 2) {
    const bullets = joined
      .replace(/\.$/, '')
      .split(/\s*;\s*/)
      .map((s) => balanceParens(s.trim()))
      .filter(Boolean);
    // Solo bulletizar enumeraciones GENUINAS: items cortos. Si algún item es un
    // párrafo largo, es prosa con puntoycoma incidental → mejor como párrafos.
    const allShort = bullets.every((b) => b.length <= CLAUSE_WRAP_CHARS);
    if (bullets.length >= 2 && allShort) return { paragraphs: [], bullets };
  }
  return { paragraphs: groupParagraphs(sentences), bullets: null };
}

/**
 * Parser principal. Transforma el bloque crudo en la estructura legible.
 * @param {string} raw
 * @returns {{ intro: string[], sections: Array<{title:string,kind:'section',paragraphs:string[],bullets:string[]|null}>, sources: string[]|null }}
 */
export function parsePedagogicalText(raw) {
  const clean = sanitizePedagogicalText(raw);
  if (!clean) return { intro: [], sections: [], sources: null };

  const sentences = splitSentences(clean);

  // Acumuladores por sección. La primera (sin encabezado) es el intro.
  const introSentences = [];
  const sections = []; // { title, kind, sentences: [] }
  let sources = null;
  let current = null; // sección abierta

  for (const sentence of sentences) {
    const heading = detectHeading(sentence);
    if (heading) {
      if (heading.kind === 'sources') {
        sources = splitSourceItems(heading.rest);
        current = null; // fuentes cierran el flujo de secciones
        continue;
      }
      current = { title: heading.title, kind: 'section', sentences: [heading.rest] };
      sections.push(current);
      continue;
    }
    if (current) current.sentences.push(sentence);
    else introSentences.push(sentence);
  }

  return {
    intro: groupParagraphs(introSentences),
    sections: sections.map((s) => ({
      title: s.title,
      kind: 'section',
      ...bodyToBlocks(s.sentences),
    })),
    sources: sources && sources.length ? sources : null,
  };
}

export const __TEST__ = {
  deburr,
  splitSentences,
  detectHeading,
  groupParagraphs,
  splitSourceItems,
  bodyToBlocks,
  splitClauses,
  softWrap,
};
