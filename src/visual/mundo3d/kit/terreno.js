/*
 * kit/terreno — el CONSTRUCTOR de heightfields con color por vértice.
 *
 * Cada escena de ladera (cafetal, cacao, papa, y varios mockups) reescribía el
 * MISMO doble bucle: recorrer una rejilla nx×nz, poner `y = altura(wx, wz)`,
 * hornear un color por vértice (pasto/tierra/mantillo según altura y ruido),
 * armar los índices de triángulos y —si el look es facetado— desindexar antes de
 * `computeVertexNormals`. Aquí ese patrón es UNA función; la escena solo aporta
 * su relieve (`altura`) y su pintura (`pintar`), que es lo único propio de cada
 * piso térmico. Así dos laderas comparten la malla y solo divergen en lo que
 * DEBEN divergir (la paleta del piso), no en el andamiaje.
 *
 * three-core puro: corre headless (sin GL), es testeable, cero costo por frame
 * (la malla se construye una vez y se memoiza en quien llama).
 */
import * as THREE from 'three';

/**
 * @callback AlturaFn
 * @param {number} wx  X de mundo (metros).
 * @param {number} wz  Z de mundo.
 * @returns {number}   altura Y del terreno en ese punto.
 */

/**
 * @callback PintarFn
 * @param {number} wx   X de mundo.
 * @param {number} wz   Z de mundo.
 * @param {number} alt  la altura ya calculada en (wx, wz).
 * @param {THREE.Color} out  color a ESCRIBIR (mutar in-place y devolver/no).
 * @returns {void}
 */

/**
 * Construye un terreno rectangular como heightfield con color horneado por
 * vértice (vertexColors). El terreno se centra en el origen y se extiende
 * `ancho` en X y `fondo` en Z.
 *
 * @param {object} o
 * @param {number} o.ancho          tamaño en X (metros de mundo).
 * @param {number} o.fondo          tamaño en Z.
 * @param {number} o.seg            segmentos por lado (más = más detalle; el
 *                                  device-tier ya sugiere `segmentosTerreno`).
 * @param {AlturaFn} o.altura       relieve del terreno.
 * @param {PintarFn} o.pintar       color por vértice (recibe un `THREE.Color`
 *                                  reutilizado que debe MUTAR: `out.set(...)` /
 *                                  `out.lerpColors(...)`).
 * @param {boolean} [o.plano=false] true → look FACETADO (desindexa antes de
 *                                  normales; da flat-shading real). false →
 *                                  malla indexada suave (~4× menos vértices).
 * @returns {THREE.BufferGeometry}  con atributos `position` y `color`.
 */
export function construirTerreno({ ancho, fondo, seg, altura, pintar, plano = false }) {
  const nx = seg + 1;
  const nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -fondo / 2 + (fondo * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ancho / 2 + (ancho * ix) / seg;
      const y = altura(wx, wz);
      pos[p] = wx;
      pos[p + 1] = y;
      pos[p + 2] = wz;
      pintar(wx, wz, y, c);
      col[p] = c.r;
      col[p + 1] = c.g;
      col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * nx + ix;
      const b = a + 1;
      const d = a + nx;
      const e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  if (plano) {
    const plana = geo.toNonIndexed();
    geo.dispose(); // la indexada nunca tocó la GPU, pero liberamos igual
    geo = plana;
  }
  geo.computeVertexNormals();
  return geo;
}
