#!/usr/bin/env node
/**
 * scan-voseo-comments.mjs
 * ================================================================
 * Complementa el guard `voseo-scan` de lefthook.yml. Ese guard escanea el
 * CONTENIDO COMPLETO de `src/**\/*.{js,jsx,ts,tsx,json}` (strings de UI
 * incluidos) buscando formas voseantes argentinas. Su hueco: solo mira
 * `src/**`, así que comentarios de desarrollador en `scripts/`, `eval/`,
 * `tests/` (o cualquier .js/.jsx/.mjs/.ts fuera de src/) nunca pasan por él.
 * Además, como escanea el ARCHIVO completo, no puede sumar formas ambiguas
 * como "acá"/"usá" sin romper retroactivamente cientos de archivos que ya
 * las usan de forma legítima en comentarios existentes.
 *
 * Este script cubre ese hueco con dos decisiones de diseño:
 *
 * 1. Alcance: TODO el repo (no solo src/), extensiones .js/.jsx/.mjs/.ts/.tsx.
 * 2. Solo mira LÍNEAS AGREGADAS del diff en stage (git diff --cached), no el
 *    archivo completo. Motivo: "acá" es un marcador AMBIGUO en español
 *    colombiano de cara al usuario (así lo documenta el propio
 *    src/services/voseoFilter.js — se preserva salvo que aparezca junto a un
 *    marcador "fuerte" de voseo) y aparece de forma masiva y legítima en
 *    comentarios YA EXISTENTES en este repo (cientos de líneas). Vetarlo a
 *    nivel de archivo completo rompería casi cualquier commit futuro que
 *    toque esos archivos. A nivel de línea NUEVA sí es una señal útil de que
 *    el asistente que redactó el comentario/mensaje derivó a registro
 *    rioplatense — y es exactamente el patrón que se quiere cazar "PR tras
 *    PR" sin exigir limpieza retroactiva de todo el historial.
 *
 * Solo se escanean dos superficies dentro de cada línea agregada (a
 * propósito conservador — nunca strings de UI arbitrarios):
 *   - Comentarios: `//...`, bloques `/* ... *\/` (una o varias líneas),
 *     continuaciones de JSDoc (`  * ...`) y shebangs (`#!...`).
 *   - Strings claramente de desarrollador: argumentos de
 *     console.log/warn/error/info/debug, `throw new Error(...)`, y
 *     process.stdout/stderr.write(...) — es decir, mensajes de CLI o de
 *     error, nunca copy de UI para el usuario final campesino.
 *
 * Uso (vía lefthook, ver lefthook.yml → voseo-scan-code-comments):
 *   node scripts/scan-voseo-comments.mjs <file1> <file2> ...
 *
 * Exit codes: 0 = limpio, 1 = voseo detectado (imprime archivo:línea).
 */

import { execFileSync } from 'node:child_process';

// Excluye archivos que a propósito contienen las formas voseantes como DATO
// (fixtures de test del propio filtro, el filtro mismo, este script, y datos
// de topónimos que dan falsos positivos por substring — mismo criterio que
// el guard `voseo-scan` en lefthook.yml).
const EXCLUDE_RE = /voseoFilter|__tests__|\.test\.|scan-voseo|colombia-locations|\.dane\./;

const CODE_EXT_RE = /\.(js|jsx|mjs|ts|tsx)$/;

// Lista curada de formas voseantes rioplatenses (case-insensitive → cubre
// mayúsculas iniciales: Acá, Usá, Tenés, etc.).
//
// Base (compartida con voseo-scan en lefthook.yml, mismo criterio anti
// falso-positivo de límites de palabra):
const VOSEO_WORDS_BASE = [
  'tenés', 'querés', 'podés', 'sabés', 'hacés', 'ponés', 'venís', 'decís',
  'vivís', 'empezá', 'mirá', 'probá', 'sembrá', 'cuidá', 'anotá', 'tocá',
  'hacé', 'poné', 'dejá', 'llevá', 'sacá', 'buscá', 'revisá', 'recogé',
  'aprendé', 'mandá', 'contá', 'esperá', 'fijate', 'quedate', 'acordate',
  'preparale',
];

// Ampliación exclusiva de este guard (solo aplica a comentarios/strings dev,
// ver razón de diseño arriba): "acá" y "usá" no se suman al guard de
// archivo-completo por ambigüedad/volumen legítimo, pero en un comentario o
// mensaje de CLI recién agregado sí son señal de voseo colándose.
const VOSEO_WORDS_COMMENTS_ONLY = ['acá', 'usá'];

const VOSEO_WORDS = [...VOSEO_WORDS_BASE, ...VOSEO_WORDS_COMMENTS_ONLY];

const LETTER = 'a-zA-ZáéíóúüñÁÉÍÓÚÜÑ';
const VOSEO_RE = new RegExp(
  `(^|[^${LETTER}])(${VOSEO_WORDS.join('|')})([^${LETTER}]|$)`,
  'i'
);

// Llamadas de desarrollador cuyo argumento de string SÍ queremos escanear
// aunque no sea un comentario (mensajes de CLI / error, nunca copy de UI).
const DEV_CALL_RE = /console\.(log|error|warn|info|debug)\s*\(|throw\s+new\s+Error\s*\(|process\.(stdout|stderr)\.write\s*\(/;

/**
 * Encuentra el índice del primer `//` que está fuera de un string literal,
 * usando un heurístico simple de conteo de comillas (no es un parser
 * completo, pero cubre el 95% de los casos reales de código JS/TS).
 */
function findLineCommentIndex(line) {
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  for (let i = 0; i < line.length - 1; i++) {
    const c = line[i];
    const prev = line[i - 1];
    if (c === "'" && !inDouble && !inBacktick && prev !== '\\') inSingle = !inSingle;
    else if (c === '"' && !inSingle && !inBacktick && prev !== '\\') inDouble = !inDouble;
    else if (c === '`' && !inSingle && !inDouble && prev !== '\\') inBacktick = !inBacktick;
    else if (!inSingle && !inDouble && !inBacktick && c === '/' && line[i + 1] === '/') {
      return i;
    }
  }
  return -1;
}

/**
 * Extrae, de una única línea AGREGADA del diff, el texto "escaneable":
 * comentarios (// , bloques /* *\/, continuaciones `* `, shebang) + el
 * contenido completo de líneas con llamadas dev (console.log/console.error,
 * throw new Error, process.stdout.write / process.stderr.write).
 * Mantiene estado de bloque de comentario multi-línea entre llamadas vía
 * `state` (mutable, { inBlock }).
 */
function extractScannable(rawLine, state) {
  let scannable = '';
  let rest = rawLine;

  if (state.inBlock) {
    const endIdx = rest.indexOf('*/');
    if (endIdx === -1) {
      return rawLine; // toda la línea sigue dentro del bloque
    }
    scannable += rest.slice(0, endIdx);
    state.inBlock = false;
    rest = rest.slice(endIdx + 2);
  }

  const trimmed = rest.trimStart();

  if (trimmed.startsWith('#!')) {
    scannable += ' ' + rest;
  }

  if (trimmed.startsWith('*') && !trimmed.startsWith('*/')) {
    // Continuación de JSDoc/bloque (` * @property ...`).
    scannable += ' ' + rest;
  }

  if (trimmed.startsWith('//')) {
    scannable += ' ' + rest;
  } else if (trimmed.startsWith('/*')) {
    const startIdx = rest.indexOf('/*');
    const endIdx = rest.indexOf('*/', startIdx + 2);
    if (endIdx === -1) {
      scannable += ' ' + rest.slice(startIdx);
      state.inBlock = true;
    } else {
      scannable += ' ' + rest.slice(startIdx, endIdx + 2);
    }
  } else {
    // Comentario // inline (código antes, comentario después).
    const lcIdx = findLineCommentIndex(rest);
    if (lcIdx !== -1) {
      scannable += ' ' + rest.slice(lcIdx);
    }
    // Comentario de bloque inline /* ... */ dentro de una línea de código.
    const blockInline = /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g;
    let m;
    while ((m = blockInline.exec(rest))) {
      scannable += ' ' + m[0];
    }
  }

  if (DEV_CALL_RE.test(rawLine)) {
    scannable += ' ' + rawLine;
  }

  return scannable;
}

function main() {
  const files = process.argv
    .slice(2)
    .filter((f) => CODE_EXT_RE.test(f) && !EXCLUDE_RE.test(f));

  if (files.length === 0) {
    process.exit(0);
  }

  let diff;
  try {
    diff = execFileSync(
      'git',
      ['diff', '--cached', '--unified=0', '--no-color', '--', ...files],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 }
    );
  } catch (err) {
    console.error('✗ scan-voseo-comments: no se pudo leer el diff en stage.');
    console.error(err.message);
    process.exit(1);
  }

  if (!diff.trim()) {
    process.exit(0);
  }

  const hits = [];
  let currentFile = null;
  let newLineNum = null;
  const blockState = { inBlock: false };

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      currentFile = line.slice(6); // "+++ b/path"
      blockState.inBlock = false;
      newLineNum = null;
      continue;
    }
    if (line.startsWith('@@')) {
      const m = /\+(\d+)/.exec(line);
      newLineNum = m ? parseInt(m[1], 10) : null;
      continue;
    }
    if (line.startsWith('+')) {
      const content = line.slice(1);
      const lineNo = newLineNum;
      if (newLineNum != null) newLineNum += 1;
      const scannable = extractScannable(content, blockState);
      if (scannable && VOSEO_RE.test(scannable)) {
        hits.push(`${currentFile}:${lineNo}: ${content.trim()}`);
      }
      continue;
    }
    if (line.startsWith('-')) {
      continue; // líneas borradas no consumen numeración del archivo nuevo
    }
  }

  if (hits.length > 0) {
    console.error('✗ Voseo argentino en comentarios/código dev (usar tú/usted Colombia):');
    for (const h of hits) console.error(`  ${h}`);
    console.error('');
    console.error('Este guard solo mira líneas AGREGADAS en comentarios (// , /* */, JSDoc,');
    console.error('shebang) o mensajes de dev (console.*, throw new Error, process.std*.write).');
    console.error('No es el mismo guard que voseo-scan (ese cubre strings de UI en src/**).');
    process.exit(1);
  }

  process.exit(0);
}

main();
