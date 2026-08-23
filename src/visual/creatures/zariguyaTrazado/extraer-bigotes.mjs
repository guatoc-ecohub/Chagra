#!/usr/bin/env node
/*
 * extraer-bigotes — PASO 4 del pipeline del calco (ver generar-calco.mjs):
 * DEPURA del calco la tinta voladora de los bigotes, para que pielTrazado.js
 * los redibuje como trazos ENTEROS y limpios en una capa overlay SIN clip,
 * hija del hueso de la cabeza (BIGOTES_LIMPIOS).
 *
 * POR QUÉ. Dos males con la misma raíz: los bigotes de la lámina son líneas
 * de 1.5-2.5px, más finas que la resolución del vtracer — el calco los trae
 * como CADENAS DE MOTITAS y tramos gruesos (feos ya en reposo) — y además
 * CRUZAN los cortes de región del clip-rig (cabeza↔mandíbula↔cuello y el
 * canal cabeza↔brazoLapiz), así que al girar la cabeza cada región se lleva
 * su pedazo. La cura no es afinar cortes: es sacar TODA esa tinta del calco
 * y redibujar los bigotes (geometría MEDIDA de la lámina con grilla) como
 * strokes que giran con la cabeza como unidad.
 *
 * CÓMO SE DECIDE QUÉ TINTA ES DE BIGOTE (verificado a ojo con
 * ?vista=bigotes, que pinta lo condenado en rojo):
 *   - Se trabaja a nivel de SUBPATH: svgo fusionó trazos del mismo color de
 *     TODO el dibujo en paths compuestos; un path entero no es una unidad
 *     anatómica, un subpath sí.
 *   - Un subpath se condena si cae en una MEGAZONA de bigotes Y la mayoría
 *     de sus puntos están "en el AIRE": el ORÁCULO es el canal alfa de la
 *     lámina original — un punto es aire si ≥55% del disco r=4 a su
 *     alrededor es transparente en la lámina. La tinta del bigote es opaca
 *     pero su vecindario es aire; un trazo de pelo del contorno del cuerpo
 *     ronda 50% y NO pasa; el lápiz/la pata son opacos y NO pasan. Los
 *     pelitos sueltos de la cola son arte original y quedan FUERA de las
 *     megazonas a propósito.
 *
 * USO:
 *   node extraer-bigotes.mjs --analizar  → zt-bigotes-debug.json (no escribe
 *       el calco); el arnés ?vista=bigotes pinta los condenados en rojo
 *   node extraer-bigotes.mjs --hornear   → reescribe calcoTrazado.js sin la
 *       tinta condenada (idempotente: re-analiza sobre lo que queda)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ARCHIVO = join(AQUI, 'calcoTrazado.js');
const LAMINA = join(AQUI, '..', '..', '..', '..', 'public', 'compai', 'laminas', 'zariguya-trazo-ref.png');

/* MEGAZONAS de bigotes (px de lámina 481×444). Generosas: el oráculo de
   aire es el que filtra. Cubren raíces + puntas + motitas de estela. */
const MEGAZONAS = [
  { nombre: 'derecha', x0: 225, y0: 40, x1: 345, y1: 200 },
  { nombre: 'izquierda', x0: 45, y0: 60, x1: 155, y1: 205 },
];
const UMBRAL_EN_ZONA = 0.7; // fracción de puntos del subpath dentro de la zona
const RADIO_AIRE = 4; // px del disco de vecindario sobre la lámina
const UMBRAL_PUNTO_AIRE = 0.55; // fracción transparente del disco → punto en aire
/* RUTA A — tinta francamente VOLADORA. 0.75 y no 0.5 a propósito: un trazo
   de CONTORNO de la silueta ronda 0.5-0.65 de aire (vive en un semiplano) y
   con 0.5 se condenaba el contorno del hombro. Verificado a ojo. */
const UMBRAL_SUBPATH = 0.75;
/* RUTA B — clúster raíz+puntas, por la firma "se interna en aire abierto":
   un trazo que sigue la silueta nunca tiene puntos RODEADOS de aire a r=8;
   un bigote sí. Permite condenar clústeres con mucha tinta de raíz sobre la
   cara sin tocar el contorno. */
const RADIO_PROFUNDO = 8;
const UMBRAL_PUNTO_PROFUNDO = 0.85; // fracción transparente del disco r=8
const UMBRAL_SUBPATH_PROFUNDO = 0.12; // fracción de puntos profundos
const UMBRAL_SUBPATH_MIXTO = 0.25; // piso de aire cuando hay puntos profundos
/* …y su salvaguarda: en la vía mixta, la tinta NO-aire del subpath debe
   ABRAZAR el borde de la silueta (raíces de bigote pegadas al contorno del
   hocico). El parche del ojo y la nariz son tinta PROFUNDA dentro de la
   cara: su disco r=6 no ve nada de aire y NO se tocan. */
const RADIO_BORDE = 6;
const UMBRAL_PUNTO_BORDE = 0.06; // fracción de aire mínima del disco r=6
const UMBRAL_SUBPATH_BORDE = 0.6; // fracción de los no-aire que deben ser borde

/* PASO 5 — CLIP DE AIRE LIMPIO. Las rutas A/B no alcanzan a los CLÚSTERES
   fusionados (un solo contorno que une anillo del ojo + puente de la nariz +
   abanico de bigotes): condenarlos enteros destriparía la cara, y partir un
   subpath exige cirugía de polígonos. La cura definitiva es al REVÉS: no
   borrar tinta, RECORTAR el lienzo. Se genera del canal alfa de la lámina un
   clip evenodd = rect total + rects-scanline del AIRE (erosionado
   EROSION_AIRE px para no morder el antialias del borde) dentro de las
   megazonas: TODO lo que vuele ahí desaparece del render, venga del path que
   venga — el ojo y la nariz ni se tocan. pielTrazado.js lo aplica UNA vez a
   <g id="ztCalco">. Los pelitos sueltos de la cola (arte original) quedan
   fuera de las zonas y sobreviven. */
const EROSION_AIRE = 2; // px: radio que debe ser TODO aire para recortar
const ALTO_SCANLINE = 1; // px de lámina por banda

/* ── parser: d → subpaths con tokens propios y arranque absoluto ──────────
   Maneja M/L/H/V/C/S/Q/T/A/Z abs+rel con repetición implícita (vtracer+svgo
   emiten M/L/H/V/C/S/Z). Cada subpath conserva su TEXTO original de tokens
   para re-serializarse sin pérdida, con el moveto vuelto absoluto. */
function partirSubpaths(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d*\.)?\d+(?:e-?\d+)?/g) || [];
  let i = 0;
  const lee = () => parseFloat(tokens[i++]);
  let cmd = '';
  let x = 0; let y = 0; let sx = 0; let sy = 0; let px = 0; let py = 0;
  const subpaths = [];
  let actual = null; // { x0, y0, puntos, desdeToken }
  const cierra = (hastaToken) => {
    if (actual && actual.puntos.length > 1) {
      actual.tokens = tokens.slice(actual.desdeToken, hastaToken);
      subpaths.push(actual);
    }
    actual = null;
  };
  const punto = (nx, ny) => { actual.puntos.push([nx, ny]); x = nx; y = ny; };
  const cubica = (x1, y1, x2, y2, nx, ny) => {
    for (let t = 0.25; t <= 1.001; t += 0.25) {
      const u = 1 - t;
      actual.puntos.push([
        u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * nx,
        u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ny,
      ]);
    }
    px = x2; py = y2; x = nx; y = ny;
  };
  while (i < tokens.length) {
    const enComando = /[a-zA-Z]/.test(tokens[i]);
    if (enComando) cmd = tokens[i];
    const inicioCmd = i;
    if (enComando) i++;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'M') {
      cierra(inicioCmd);
      const nx = lee() + (rel ? x : 0); const ny = lee() + (rel ? y : 0);
      actual = { x0: nx, y0: ny, puntos: [[nx, ny]], desdeToken: i, movetoRel: rel };
      x = nx; y = ny; sx = nx; sy = ny;
      cmd = rel ? 'l' : 'L'; // pares siguientes = lineto implícito
    } else if (C === 'L') {
      punto(lee() + (rel ? x : 0), lee() + (rel ? y : 0));
    } else if (C === 'H') {
      punto(lee() + (rel ? x : 0), y);
    } else if (C === 'V') {
      punto(x, lee() + (rel ? y : 0));
    } else if (C === 'C') {
      const x1 = lee() + (rel ? x : 0); const y1 = lee() + (rel ? y : 0);
      const x2 = lee() + (rel ? x : 0); const y2 = lee() + (rel ? y : 0);
      cubica(x1, y1, x2, y2, lee() + (rel ? x : 0), lee() + (rel ? y : 0));
    } else if (C === 'S') {
      const x1 = 2 * x - px; const y1 = 2 * y - py;
      const x2 = lee() + (rel ? x : 0); const y2 = lee() + (rel ? y : 0);
      cubica(x1, y1, x2, y2, lee() + (rel ? x : 0), lee() + (rel ? y : 0));
    } else if (C === 'Q') {
      const x1 = lee() + (rel ? x : 0); const y1 = lee() + (rel ? y : 0);
      px = x1; py = y1;
      punto(lee() + (rel ? x : 0), lee() + (rel ? y : 0));
    } else if (C === 'T') {
      px = 2 * x - px; py = 2 * y - py;
      punto(lee() + (rel ? x : 0), lee() + (rel ? y : 0));
    } else if (C === 'A') {
      lee(); lee(); lee(); lee(); lee();
      punto(lee() + (rel ? x : 0), lee() + (rel ? y : 0));
    } else if (C === 'Z') {
      if (actual) actual.puntos.push([sx, sy]);
      x = sx; y = sy;
      cierra(inicioCmd); // sin incluir la Z: dDeSubpath pone la suya
    } else {
      i++;
    }
    if (C !== 'C' && C !== 'S' && C !== 'Q' && C !== 'T') { px = x; py = y; }
  }
  cierra(tokens.length);
  return subpaths;
}

/** Re-serializa un subpath: moveto ABSOLUTO + sus tokens originales + Z.
    Si el moveto original era relativo, los pares implícitos que le siguen
    eran linetos RELATIVOS: hay que reponer la 'l' explícita (y 'L' si era
    absoluto, por simetría). */
function dDeSubpath(sp) {
  const cuerpo = sp.tokens
    .map((t, j) => (/[a-zA-Z]/.test(t) ? t : (j > 0 && !/[a-zA-Z]/.test(sp.tokens[j - 1]) ? ` ${t}` : t)))
    .join('');
  const arranque = sp.tokens.length && !/[a-zA-Z]/.test(sp.tokens[0])
    ? (sp.movetoRel ? 'l' : 'L')
    : '';
  return `M${sp.x0.toFixed(2)} ${sp.y0.toFixed(2)}${arranque}${cuerpo}Z`;
}

/* ── oráculos de aire sobre la lámina ── */
async function cargarOraculos() {
  const { data, info } = await sharp(LAMINA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const alfa = (X, Y) => {
    if (X < 0 || Y < 0 || X >= width || Y >= height) return 0;
    return data[(Y * width + X) * channels + 3];
  };
  const fraccionAire = ([pxX, pxY], radio) => {
    let transparentes = 0; let total = 0;
    const X = Math.round(pxX); const Y = Math.round(pxY);
    for (let dy = -radio; dy <= radio; dy++) {
      for (let dx = -radio; dx <= radio; dx++) {
        if (dx * dx + dy * dy > radio * radio) continue;
        total++;
        if (alfa(X + dx, Y + dy) < 128) transparentes++;
      }
    }
    return transparentes / total;
  };
  return {
    esAire: (p) => fraccionAire(p, RADIO_AIRE) >= UMBRAL_PUNTO_AIRE,
    esProfundo: (p) => fraccionAire(p, RADIO_PROFUNDO) >= UMBRAL_PUNTO_PROFUNDO,
    esBorde: (p) => fraccionAire(p, RADIO_BORDE) >= UMBRAL_PUNTO_BORDE,
    alfa,
  };
}

/* PASO 5: el path evenodd del clip de aire limpio (rect total + rects del
   aire erosionado en las megazonas — ver nota arriba). */
function generarAireLimpioD(alfa) {
  const esAireErosionado = (x, y) => {
    for (let dy = -EROSION_AIRE; dy <= EROSION_AIRE; dy++) {
      for (let dx = -EROSION_AIRE; dx <= EROSION_AIRE; dx++) {
        if (dx * dx + dy * dy > EROSION_AIRE * EROSION_AIRE) continue;
        if (alfa(x + dx, y + dy) >= 128) return false;
      }
    }
    return true;
  };
  // rect total generoso: cubre el viewBox -30 -25 545 500 del arnés y más
  let d = 'M-40 -35H555V510H-40Z';
  let rects = 0;
  for (const z of MEGAZONAS) {
    for (let y = z.y0; y < z.y1; y += ALTO_SCANLINE) {
      let x = z.x0;
      while (x < z.x1) {
        while (x < z.x1 && !esAireErosionado(x, y)) x++;
        const ini = x;
        while (x < z.x1 && esAireErosionado(x, y)) x++;
        if (x - ini >= 2) {
          d += `M${ini} ${y}h${x - ini}v${ALTO_SCANLINE}h${-(x - ini)}Z`;
          rects++;
        }
      }
    }
  }
  return { d, rects };
}

const bboxDe = (puntos) => {
  let x0 = 1e9; let y0 = 1e9; let x1 = -1e9; let y1 = -1e9;
  for (const [px, py] of puntos) {
    if (px < x0) x0 = px; if (px > x1) x1 = px;
    if (py < y0) y0 = py; if (py > y1) y1 = py;
  }
  return [x0, y0, x1, y1];
};

/* ── clasificar y (opcionalmente) hornear ── */
const { esAire, esProfundo, esBorde, alfa } = await cargarOraculos();
const fuente = readFileSync(ARCHIVO, 'utf8');
const mCalco = fuente.match(/export const CALCO_TRAZADO = `([\s\S]*?)`;/);
if (!mCalco) throw new Error('no encontré CALCO_TRAZADO');
const paths = mCalco[1].match(/<path[^>]*\/>/g) || [];
console.log(`${paths.length} paths en el calco`);

const condenados = []; // debug
const nuevosPaths = [];
let subCondenados = 0;
for (const p of paths) {
  const d = (p.match(/ d="([^"]*)"/) || [])[1];
  if (!d) { nuevosPaths.push(p); continue; }
  const subpaths = partirSubpaths(d);
  const quedan = [];
  for (const sp of subpaths) {
    const [x0, y0, x1, y1] = bboxDe(sp.puntos);
    const zona = MEGAZONAS.find((z) => {
      const dentro = sp.puntos.filter(([px, py]) => px >= z.x0 && px <= z.x1 && py >= z.y0 && py <= z.y1).length;
      return dentro / sp.puntos.length >= UMBRAL_EN_ZONA;
    });
    let condena = false;
    if (zona) {
      const enAire = sp.puntos.filter(esAire).length / sp.puntos.length;
      const profundo = enAire >= UMBRAL_SUBPATH_MIXTO
        ? sp.puntos.filter(esProfundo).length / sp.puntos.length
        : 0;
      let borde = 1;
      if (enAire < UMBRAL_SUBPATH && profundo >= UMBRAL_SUBPATH_PROFUNDO) {
        const noAire = sp.puntos.filter((pt) => !esAire(pt));
        borde = noAire.length ? noAire.filter(esBorde).length / noAire.length : 1;
      }
      if (enAire >= UMBRAL_SUBPATH
        || (profundo >= UMBRAL_SUBPATH_PROFUNDO && enAire >= UMBRAL_SUBPATH_MIXTO
          && borde >= UMBRAL_SUBPATH_BORDE)) {
        condena = true;
        subCondenados++;
        condenados.push({
          zona: zona.nombre,
          fill: (p.match(/fill="([^"]*)"/) || [])[1] || '',
          aire: +enAire.toFixed(2),
          profundo: +profundo.toFixed(2),
          bbox: [x0, y0, x1, y1].map((v) => +v.toFixed(0)),
          d: dDeSubpath(sp),
        });
      }
    }
    if (!condena) quedan.push(sp);
  }
  if (quedan.length === subpaths.length) {
    nuevosPaths.push(p); // intacto: conservar byte a byte
  } else if (quedan.length > 0) {
    nuevosPaths.push(p.replace(/ d="[^"]*"/, ` d="${quedan.map(dDeSubpath).join('')}"`));
  } // 0 subpaths → el path desaparece
}

console.log(`${subCondenados} subpaths de tinta de bigote condenados; ${paths.length - nuevosPaths.length} paths desaparecen enteros`);

const modo = process.argv[2] || '--analizar';
const aire = generarAireLimpioD(alfa);
console.log(`clip de aire limpio: ${aire.rects} rects (${(aire.d.length / 1024).toFixed(1)} KiB)`);
if (modo === '--analizar') {
  const debug = join(AQUI, '..', '..', '..', '..', 'zt-bigotes-debug.json');
  writeFileSync(debug, JSON.stringify(condenados, null, 1));
  console.log(`debug → ${debug} (arnés: ?vista=bigotes pinta lo condenado en rojo)`);
} else if (modo === '--hornear') {
  const interior = nuevosPaths.join('');
  const cabecera = fuente.slice(0, fuente.indexOf('export const CALCO_TRAZADO'));
  const cola = `/* Clip EVENODD "aire limpio" (paso 5, ver extraer-bigotes.mjs): rect total
   + rects-scanline del aire de las megazonas de bigotes. Aplicado UNA vez a
   <g id="ztCalco">, borra del render la tinta voladora que las rutas A/B no
   pueden condenar (clústeres fusionados con tinta de ojo/nariz). */
export const AIRE_LIMPIO_D = \`${aire.d}\`;
export const CALCO_N_PATHS = ${nuevosPaths.length};
export default CALCO_TRAZADO;
`;
  const nota = cabecera.includes('extraer-bigotes')
    ? cabecera
    : cabecera.replace(
      ' */',
      ' *\n * DEPURADO por extraer-bigotes.mjs (paso 4): sin la tinta voladora de los\n * bigotes — pielTrazado.js los redibuja limpios en BIGOTES_LIMPIOS.\n */',
    );
  writeFileSync(ARCHIVO, `${nota}export const CALCO_TRAZADO = \`${interior}\`;
${cola}`);
  console.log(`horneado: ${nuevosPaths.length} paths quedan en el calco + AIRE_LIMPIO_D`);
}
