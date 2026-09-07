// heightfieldCircularSylva.js — ventana móvil de alturas con buffer circular.
//
// Inspirado por Sylva / realistic-forest (github.com/Token-Gremlin/realistic-forest,
// MIT © 2026 Token Gremlin; aviso completo en ../flora/LICENSE-sylva-MIT): en
// Sylva el terreno es una función analítica y NADIE guarda las alturas del mundo
// entero — los consumidores CPU (fauna, agua, cámara pegada al suelo) leen una
// VENTANA de muestras que acompaña a la cámara y se rehornea al salir del medio
// (WorldMaps). Así la memoria de altura es O(ventana), no O(mundo), y al recorrer
// el valle no crece ni una celda por kilómetro.
//
// Acá se emula esa memoria con un BUFFER CIRCULAR de celdas (anillo toroidal):
// una grilla fija de puntos de mundo se reusa por índice mod (nx, nz); al cruzar
// el borde solo la franja de puntos que ENTRÓ se vuelve a muestrear de la
// función de altura — los puntos que salieron por el lado opuesto reciclan su
// slot. Memoria = 4·nx·nz bytes fijos (altura Float32) más 2 Int32 por slot
// (dueño de mundo gx/gz) = 4·nx·nz + 8·nx·nz bytes en total, constante.
//
// Semántica de celdas: cada slot guarda la altura en el PUNTO DE ESQUINA
// (gx·celda, gz·celda) con gx/gz enteros. El anillo posee nx columnas × nz filas
// de puntos consecutivos [ox, ox+nx-1]×[oz, oz+nz-1]; al ser toroidal, nx puntos
// consecutivos ocupan nx residuos distintos (sin colisión). `actualizar(cx,cz)`
// re-centra el anillo y hornea solo la franja nueva. `height(x,z)` hace bilineal
// SOLO si las cuatro esquinas caen dentro de la ventana poseída; afuera delega a
// la función analítica (fallback honesto, como el `mapSampleSafe` de Sylva).
//
// Determinismo: el muestreo SIEMPRE llama a la función analítica en coordenadas
// absolutas de mundo, así que una celda recién horneada es idéntica a la que se
// horneó la primera vez. Eso es lo que hace que la ventana no produzca
// discontinuidades al recorrer. La implementación es original (emulación sobre
// el patrón, no código copiado).

function mod(n, m) { return ((n % m) + m) % m; }

/**
 * Crea el buffer circular de alturas centrado en la cámara.
 *
 * @param {object} o
 * @param {(x:number,z:number)=>number} o.altura   función analítica de altura (mundo)
 * @param {number} o.celda    unidades de mundo entre puntos de esquina
 * @param {number} [o.nx]     puntos de esquina de ancho (columnas del anillo)
 * @param {number} [o.nz]     puntos de esquina de alto (filas del anillo)
 * @param {number} [o.cx]     centro inicial X
 * @param {number} [o.cz]     centro inicial Z
 * @param {boolean} [o.corredor]  si true, cuenta cuántas esquinas únicas se han
 *   horneado (lo que un guardado "naïve" que nunca evicta tendría que retener).
 * @returns {object} { actualizar, height, esquina, contiene, state, dispose }
 */
export function crearHeightfieldCircularSylva({
  altura,
  celda,
  nx = 24,
  nz = 18,
  cx = 0,
  cz = 0,
  corredor = false,
}) {
  if (typeof altura !== 'function') throw new Error('crearHeightfieldCircularSylva: falta `altura`');
  if (!(celda > 0)) throw new Error('crearHeightfieldCircularSylva: falta `celda` > 0');

  const h = new Float32Array(nx * nz);
  const genX = new Int32Array(nx * nz).fill(0x7fffffff);
  const genZ = new Int32Array(nx * nz).fill(0x7fffffff);
  const bytes = nx * nz * (4 + 4 + 4);
  const unicas = corredor ? new Set() : null;   // huella del corredor visitado

  // origen del anillo: la esquina (ox, oz) es el punto de mundo (ox·celda, oz·celda).
  // Se elige para centrar la ventana en (cx, cz): gx = floor(cx/celda) - nx/2.
  let ox = Math.floor(cx / celda) - Math.floor(nx / 2);
  let oz = Math.floor(cz / celda) - Math.floor(nz / 2);

  function slotOf(gx, gz) { return mod(gx, nx) + mod(gz, nz) * nx; }

  function esDueno(s, gx, gz) { return genX[s] === gx && genZ[s] === gz; }

  function bakeCell(gx, gz) {
    const s = slotOf(gx, gz);
    h[s] = altura(gx * celda, gz * celda);
    genX[s] = gx;
    genZ[s] = gz;
    if (unicas) unicas.add((gx & 0xffff) + (gz << 16));
    return h[s];
  }

  /** Hornea la esquina si su slot no está ocupado por ese dueño de mundo exacto. */
  function ensureCell(gx, gz) {
    const s = slotOf(gx, gz);
    if (esDueno(s, gx, gz)) return h[s];
    return bakeCell(gx, gz);
  }

  function inicial() {
    for (let gz = oz; gz < oz + nz; gz++) for (let gx = ox; gx < ox + nx; gx++) bakeCell(gx, gz);
  }
  inicial();
  let horneadasUltimoPaso = 0;

  /**
   * Re-centra el anillo en (x, z) horneando SOLO la franja que entra.
   * Devuelve cuántas esquinas se hornearon en este paso (0 si no cambió el origen).
   */
  function actualizar(x, z) {
    const nox = Math.floor(x / celda) - Math.floor(nx / 2);
    const noz = Math.floor(z / celda) - Math.floor(nz / 2);
    if (nox === ox && noz === oz) { horneadasUltimoPaso = 0; return 0; }
    let horneadas = 0;
    const dx = nox - ox;
    const dz = noz - oz;
    // columnas que entran (en el lado hacia donde se movió la cámara)
    if (dx > 0) { for (let gz = oz; gz < oz + nz; gz++) for (let k = 0; k < dx; k++) { ensureCell(ox + nx + k, gz); horneadas++; } }
    if (dx < 0) { for (let gz = oz; gz < oz + nz; gz++) for (let k = 0; k < -dx; k++) { ensureCell(ox - 1 - k, gz); horneadas++; } }
    // filas que entran (tras el shift de columnas para no doblar esquinas)
    if (dz > 0) { for (let gx = nox; gx < nox + nx; gx++) for (let k = 0; k < dz; k++) { ensureCell(gx, oz + nz + k); horneadas++; } }
    if (dz < 0) { for (let gx = nox; gx < nox + nx; gx++) for (let k = 0; k < -dz; k++) { ensureCell(gx, oz - 1 - k); horneadas++; } }
    ox = nox;
    oz = noz;
    horneadasUltimoPaso = horneadas;
    return horneadas;
  }

  /** ¿(x,z) cae dentro del área poseída por el anillo? */
  function contiene(x, z) {
    const gx = x / celda, gz = z / celda;
    return gx >= ox && gx <= ox + nx - 1 && gz >= oz && gz <= oz + nz - 1;
  }

  /** Altura en la esquina de mundo (gx·celda, gz·celda). Fuera → altura analítica. */
  function esquina(gx, gz) {
    if (gx < ox || gx > ox + nx - 1 || gz < oz || gz > oz + nz - 1) return altura(gx * celda, gz * celda);
    return ensureCell(gx, gz);
  }

  /**
   * Altura bilineal en (x, z). Solo interpola si las 4 esquinas caen dentro de
   * la ventana poseída (así nunca lee un slot reciclado como si fuera vecino);
   * afuera devuelve la función analítica.
   */
  function height(x, z) {
    const gx = x / celda, gz = z / celda;
    const i0 = Math.floor(gx), j0 = Math.floor(gz);
    if (i0 < ox || i0 + 1 > ox + nx - 1 || j0 < oz || j0 + 1 > oz + nz - 1) return altura(x, z);
    const fx = gx - i0, fz = gz - j0;
    const a = ensureCell(i0, j0);
    const b = ensureCell(i0 + 1, j0);
    const c = ensureCell(i0, j0 + 1);
    const d = ensureCell(i0 + 1, j0 + 1);
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
  }

  function state() {
    return {
      nx, nz, celda,
      bytes,
      ox, oz,
      minX: ox * celda, maxX: (ox + nx - 1) * celda,
      minZ: oz * celda, maxZ: (oz + nz - 1) * celda,
      horneadasUltimoPaso,
      celdasUnicas: unicas ? unicas.size : -1,
      cubre: (x, z) => contiene(x, z),
    };
  }

  return { actualizar, height, esquina, contiene, state, dispose: () => {} };
}
