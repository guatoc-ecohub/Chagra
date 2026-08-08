#!/usr/bin/env node
/**
 * scripts/audit-arboles-mueven.mjs
 *
 * Auditor de la regla dura "los árboles se mueven en TODOS los mundos".
 * Recorre archivos .js/.mjs y clasifica cada uno en:
 * - CON_MOVIMIENTO: árboles con animación detectada
 * - SIN_MOVIMIENTO: árboles estáticos (sin tiempo/oscilación/viento cerca)
 * - SIN_ARBOLES: sin señales de árbol
 *
 * Heurística de texto read-only. No modifica archivos.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DIRECTORIOS_SALTADOS = new Set(['node_modules', 'vendor', 'dist']);
export const VENTANA_LINEAS = 40;
export const VENTANA_SHADER = 60;

const REGEX_ACENTO_ARBOL = 'arbol|arboles|árbol|árboles|Árbol|Árboles|ÁRBOL|ÁRBOLES';

export const PATRONES_ARBOL = [
  { id: 'arbol', re: new RegExp(`\\b(?:${REGEX_ACENTO_ARBOL})\\b`, 'g') },
  { id: 'tree', re: /\b(?:tree|trees)\b/g },
  { id: 'follaje', re: /\bfollaje\b/g },
  { id: 'foliage', re: /\bfoliage\b/g },
  { id: 'copa', re: /\bcopa\b/g },
  { id: 'canopy', re: /\bcanopy\b/g },
  { id: 'hoja', re: /\b(?:hoja|hojas)\b/g },
  { id: 'leaf', re: /\bleaf\b/g },
  { id: 'leaves', re: /\bleaves\b/g },
  { id: 'tronco', re: /\btronco\b/g },
  { id: 'trunk', re: /\btrunk\b/g },
  { id: 'bosque', re: /\bbosque\b/g },
  { id: 'forest', re: /\bforest\b/g },
];

export const PATRONES_TIEMPO = [
  { id: 'getElapsedTime', re: /\bgetElapsedTime\b/g },
  { id: 'elapsedTime', re: /\belapsedTime\b/g },
  { id: 'clock', re: /\bclock\b/g },
  { id: 'delta', re: /\bdelta\b/g },
  { id: 'performance.now', re: /\bperformance\s*\.\s*now\b/g },
  { id: 'uTime', re: /\buTime\b/g },
  { id: 'u_time', re: /\bu_time\b/g },
  { id: 'time', re: /\btime\s*\+=\s*/g },
];

export const PATRONES_OSCILACION = [
  { id: 'Math.sin', re: /\bMath\s*\.\s*sin\b/g },
  { id: 'Math.cos', re: /\bMath\s*\.\s*cos\b/g },
];

export const PATRONES_VIENTO = [
  { id: 'viento', re: /\bviento\b/g },
  { id: 'wind', re: /\bwind\b/g },
  { id: 'sway', re: /\bsway\b/g },
];

/**
 * Máscara por línea: 'C' código, 'S' string, 'M' comentario.
 * Los patrones de movimiento se evalúan solo sobre código+strings (nunca comentarios).
 * Los de árbol se evalúan también sobre comentarios (evidencia débil).
 */
function lineasConMascara(source) {
  const lineas = source.split(/\r?\n/);
  const mascaras = [];
  let enComentarioBloque = false;
  for (const linea of lineas) {
    const mascara = new Array(linea.length).fill('C');
    let j = 0;
    while (j < linea.length) {
      const c = linea[j];
      if (enComentarioBloque) {
        mascara[j] = 'M';
        const fin = linea.indexOf('*/', j);
        if (fin === -1) {
          j = linea.length;
        } else {
          for (let k = j; k <= fin + 1; k++) mascara[k] = 'M';
          enComentarioBloque = false;
          j = fin + 2;
        }
        continue;
      }
      if (c === '/' && linea[j + 1] === '/') {
        while (j < linea.length) {
          mascara[j] = 'M';
          j++;
        }
        continue;
      }
      if (c === '/' && linea[j + 1] === '*') {
        mascara[j] = 'M';
        mascara[j + 1] = 'M';
        enComentarioBloque = true;
        j += 2;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        const comilla = c;
        mascara[j] = 'S';
        j++;
        while (j < linea.length) {
          mascara[j] = 'S';
          if (linea[j] === '\\') {
            if (j + 1 < linea.length) {
              mascara[j + 1] = 'S';
              j += 2;
            } else {
              j++;
            }
            continue;
          }
          if (linea[j] === comilla) {
            j++;
            break;
          }
          j++;
        }
        continue;
      }
      j++;
    }
    mascaras.push(mascara.join(''));
  }
  return { lineas, mascaras };
}

function filtrar(linea, mascara, permitidos) {
  let salida = '';
  for (let i = 0; i < linea.length; i++) {
    salida += permitidos.has(mascara[i]) ? linea[i] : ' ';
  }
  return salida;
}

const CODIGO_Y_STRING = new Set(['C', 'S']);
const COMENTARIOS = new Set(['M']);

function coincidencias(lineaTexto, patrones) {
  const encontradas = [];
  for (const p of patrones) {
    p.re.lastIndex = 0;
    let m;
    while ((m = p.re.exec(lineaTexto)) !== null) {
      encontradas.push({ id: p.id, match: m[0] });
      if (m[0].length === 0) p.re.lastIndex++;
    }
  }
  return encontradas;
}

/**
 * Profundidad de llaves por línea (basada en código, para "misma función").
 */
function calcularProfundidades(lineasCodigo) {
  const profundidades = [];
  let prof = 0;
  for (const linea of lineasCodigo) {
    profundidades.push(prof);
    for (const ch of linea) {
      if (ch === '{') prof = Math.min(100, prof + 1);
      else if (ch === '}') prof = Math.max(0, prof - 1);
    }
  }
  return profundidades;
}

function mismoBloque(profundidades, l1, l2) {
  const a = Math.min(l1, l2) - 1;
  const b = Math.max(l1, l2) - 1;
  if (a === b) return true;
  const dA = profundidades[a];
  const dB = profundidades[b];
  if (Math.abs(dA - dB) > 1) return false;
  const piso = Math.min(dA, dB);
  for (let k = a; k <= b; k++) {
    if (profundidades[k] < piso) return false;
  }
  return true;
}

/**
 * Análisis de un archivo.
 */
export function analizarArchivo(rutaArchivo) {
  const texto = readFileSync(rutaArchivo, 'utf8');
  const { lineas, mascaras } = lineasConMascara(texto);
  const sig = lineas.map((l, i) => filtrar(l, mascaras[i], CODIGO_Y_STRING));
  const com = lineas.map((l, i) => filtrar(l, mascaras[i], COMENTARIOS));
  const profundidades = calcularProfundidades(sig);

  const arbolesCodigo = [];
  const arbolesComentario = [];
  for (let i = 0; i < sig.length; i++) {
    for (const c of coincidencias(sig[i], PATRONES_ARBOL)) {
      arbolesCodigo.push({ linea: i + 1, id: c.id, match: c.match });
    }
  }
  for (let i = 0; i < com.length; i++) {
    for (const c of coincidencias(com[i], PATRONES_ARBOL)) {
      arbolesComentario.push({ linea: i + 1, id: c.id, match: c.match, comentario: true });
    }
  }

  const arboles = arbolesCodigo.length > 0 ? arbolesCodigo : arbolesComentario;
  const arbolesSoloComentarios = arbolesCodigo.length === 0 && arbolesComentario.length > 0;

  const movimientos = [];
  for (let i = 0; i < sig.length; i++) {
    const lineaNo = i + 1;
    for (const c of coincidencias(sig[i], PATRONES_OSCILACION)) {
      movimientos.push({ linea: lineaNo, id: c.id, match: c.match, fuerza: 'fuerte', tipo: 'oscilacion' });
    }
    for (const c of coincidencias(sig[i], PATRONES_VIENTO)) {
      movimientos.push({ linea: lineaNo, id: c.id, match: c.match, fuerza: 'fuerte', tipo: 'viento' });
    }
    for (const c of coincidencias(sig[i], PATRONES_TIEMPO)) {
      movimientos.push({ linea: lineaNo, id: c.id, match: c.match, fuerza: 'debil', tipo: 'tiempo' });
    }
  }

  // Shader de viento: vertexShader + "desplazamiento" cerca.
  for (let i = 0; i < sig.length; i++) {
    if (!/\bvertexShader\b/.test(sig[i])) continue;
    const lineaNo = i + 1;
    const desde = Math.max(0, i - VENTANA_SHADER);
    const hasta = Math.min(sig.length, i + VENTANA_SHADER);
    const hayDesplazamiento =
      sig.slice(desde, hasta).some((l) => /\b(?:displacement|desplazamiento|desplazar)\b/.test(l));
    if (hayDesplazamiento) {
      movimientos.push({
        linea: lineaNo,
        id: 'shader_viento',
        match: 'vertexShader+displacement',
        fuerza: 'fuerte',
        tipo: 'shader',
      });
    }
  }

  if (arboles.length === 0) {
    return {
      archivo: rutaArchivo,
      decision: 'SIN_ARBOLES',
      confianza: 'alta',
      explicacion: 'No se encontró ninguna señal de árbol (arbol/tree/foliage/copa/hoja/tronco/...).',
      arboles: [],
      movimiento: [],
      relacion: null,
    };
  }

  // Buscar la mejor relación árbol <-> movimiento (menor rango gana).
  let mejor = null;
  for (const a of arboles) {
    for (const mv of movimientos) {
      const d = Math.abs(a.linea - mv.linea);
      const mismoBloq = mismoBloque(profundidades, a.linea, mv.linea);
      let rango = null;
      if (mismoBloq && d <= 200) rango = mv.fuerza === 'fuerte' ? 0 : 2;
      else if (d <= 15) rango = mv.fuerza === 'fuerte' ? 1 : 4;
      else if (d <= VENTANA_LINEAS) rango = mv.fuerza === 'fuerte' ? 3 : 4;
      if (rango === null) continue;
      const candidato = {
        rango,
        arbolLinea: a.linea,
        arbolId: a.id,
        movimiento: mv,
        distancia: d,
        mismoBloque: mismoBloq,
      };
      if (!mejor || rango < mejor.rango) mejor = candidato;
    }
  }

  if (mejor) {
    const confBase = { 0: 'alta', 1: 'alta', 2: 'media', 3: 'media', 4: 'baja' }[mejor.rango];
    const confianza = arbolesSoloComentarios ? 'baja' : confBase;
    const bloque = mejor.mismoBloque ? ' en el mismo bloque' : '';
    const dist = `${mejor.distancia} ${mejor.distancia === 1 ? 'línea' : 'líneas'}`;
    const explicacion =
      `Señal de movimiento (${mejor.movimiento.match}) a ${dist} de un árbol ` +
      `(${mejor.arbolId})${bloque}. Evidencia: ${mejor.arbolId}:${mejor.arbolLinea}, ` +
      `${mejor.movimiento.id}:${mejor.movimiento.linea}.`;
    return {
      archivo: rutaArchivo,
      decision: 'CON_MOVIMIENTO',
      confianza,
      explicacion,
      arboles: resumir(arboles),
      movimiento: resumir(movimientos),
      relacion: {
        arbol_linea: mejor.arbolLinea,
        arbol_match: mejor.arbolId,
        movimiento_linea: mejor.movimiento.linea,
        movimiento_match: mejor.movimiento.match,
        distancia_lineas: mejor.distancia,
        mismo_bloque: mejor.mismoBloque,
      },
    };
  }

  const masCercano = masCercanoAArbol(arboles, movimientos);
  const confianza = movimientos.length > 0 ? 'media' : 'alta';
  const explicacion = movimientos.length > 0
    ? `Hay movimiento en el archivo pero lejos de los árboles: el más cercano (${masCercano.mov.match}:${masCercano.mov.linea}) ` +
      `está a ${masCercano.d} líneas del árbol ${masCercano.arbol.id}:${masCercano.arbol.linea} (umbral ~${VENTANA_LINEAS}). Revisar a ojo.`
    : 'Se encontraron señales de árbol pero ninguna señal de movimiento (tiempo/oscilación/viento) en el archivo.';
  return {
    archivo: rutaArchivo,
    decision: 'SIN_MOVIMIENTO',
    confianza,
    explicacion,
    arboles: resumir(arboles),
    movimiento: resumir(movimientos),
    relacion: null,
  };
}

function masCercanoAArbol(arboles, movimientos) {
  let mejor = null;
  for (const a of arboles) {
    for (const mv of movimientos) {
      const d = Math.abs(a.linea - mv.linea);
      if (!mejor || d < mejor.d) mejor = { arbol: a, mov: mv, d };
    }
  }
  return mejor;
}

function resumir(ocurrencias) {
  const primeras = ocurrencias.slice(0, 10).map((o) => ({
    linea: o.linea,
    match: o.id,
    ...(o.comentario ? { comentario: true } : {}),
  }));
  if (ocurrencias.length > 10) primeras.push({ linea: null, match: `... ${ocurrencias.length - 10} más` });
  return primeras;
}

/**
 * Recorrido de directorio.
 */
export function recorrerDirectorio(directorio) {
  try {
    if (!statSync(directorio).isDirectory()) {
      throw new Error(`no es un directorio: ${directorio}`);
    }
  } catch (err) {
    throw new Error(`no se puede acceder a "${directorio}": ${err.message}`);
  }
  const archivos = [];
  const cola = [directorio];
  while (cola.length > 0) {
    const actual = cola.pop();
    let entradas;
    try {
      entradas = readdirSync(actual, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entrada of entradas) {
      const ruta = join(actual, entrada.name);
      if (entrada.isDirectory()) {
        if (!DIRECTORIOS_SALTADOS.has(entrada.name)) cola.push(ruta);
      } else if (entrada.isFile() && /\.(js|mjs)$/i.test(entrada.name)) {
        archivos.push(ruta);
      }
    }
  }
  return archivos.sort();
}

export function armarReporte(directorio) {
  const archivos = recorrerDirectorio(directorio);
  const resultados = archivos.map((ruta) => analizarArchivo(ruta));
  const resumen = { CON_MOVIMIENTO: 0, SIN_MOVIMIENTO: 0, SIN_ARBOLES: 0, total: resultados.length };
  for (const r of resultados) resumen[r.decision]++;
  return { directorio, resumen, resultados };
}

/**
 * CLI
 */
function main() {
  const args = process.argv.slice(2);
  const usarJson = args.includes('--json');
  const directorios = args.filter((a) => a !== '--json');

  if (directorios.length === 0) {
    process.stderr.write(
      'Uso: node audit-arboles-mueven.mjs <directorio> [--json]\n' +
        'Audita archivos *.js/*.mjs de un directorio (recursivo) y decide si los árboles tienen animación.\n'
    );
    process.exit(2);
  }

  const directorio = directorios[0];
  let reporte;
  try {
    reporte = armarReporte(directorio);
  } catch (err) {
    process.stderr.write(`Error: no se pudo leer "${directorio}": ${err.message}\n`);
    process.exit(1);
  }

  if (usarJson) {
    process.stdout.write(JSON.stringify(reporte, null, 2) + '\n');
    return;
  }

  const ANCHO = 78;
  process.stdout.write('Auditor "¿los árboles se mueven?"\n');
  process.stdout.write('='.repeat(ANCHO) + '\n');
  process.stdout.write(
    ['archivo', 'decisión', 'confianza', 'evidencia'].join(' '.repeat(6)).slice(0, ANCHO) + '\n'
  );
  process.stdout.write('-'.repeat(ANCHO) + '\n');
  for (const r of reporte.resultados) {
    const evidencia = r.relacion
      ? `${r.relacion.arbol_match}@${r.relacion.arbol_linea} -> ${r.relacion.movimiento_match}@${r.relacion.movimiento_linea}`
      : r.arboles.length > 0
        ? `arboles@${r.arboles[0].linea}`
        : 'sin señales de árbol';
    const fila = `${r.archivo}  ${r.decision}  ${r.confianza}  ${evidencia}`;
    process.stdout.write(fila.slice(0, ANCHO) + '\n');
  }
  process.stdout.write('='.repeat(ANCHO) + '\n');
  process.stdout.write(
    `Resumen: ${resumenTexto(reporte.resumen)}  (${reporte.resumen.total} archivos)\n`
  );
}

function resumenTexto(resumen) {
  return [
    `${resumen.CON_MOVIMIENTO} CON_MOVIMIENTO`,
    `${resumen.SIN_MOVIMIENTO} SIN_MOVIMIENTO`,
    `${resumen.SIN_ARBOLES} SIN_ARBOLES`,
  ].join(' · ');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main();
}
