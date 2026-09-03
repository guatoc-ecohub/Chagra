/*
 * laminaMasa — el MOTOR de las láminas de historia natural del invernadero.
 *
 * Regla dura del arte: follaje = MASA; si se le cuentan las caras → SACAR.
 * Cada cultivo se pinta POR CÓDIGO a un CanvasTexture (atlas de variantes
 * hermanas + espejo) y se siembra como quads cruzados en UN InstancedMesh:
 * 10.000 matas = 1 draw call + 1 textura. Aquí vive lo que NO depende de la
 * especie — el atlas con su dilatación anti-orla, la geometría cruzada, el
 * material con tile por instancia y vaivén, y la variante determinista.
 * Los PINTORES (la mano del ilustrador) viven en su módulo por especie:
 * `tomateHumboldt.js`, `hortalizasHumboldt.js`.
 *
 * Una LÁMINA se describe con un objeto:
 *   { layout: {cols, filas, tileW, tileH},  // la retícula del atlas
 *     ancho, alto,                          // tamaño mundo del quad (u)
 *     planos,                               // quads cruzados por mata
 *     pintarTile(ctx, ox, oy, seed),        // el pintor de UNA variante
 *     semillaAtlas, semillaVariantes }
 */
import * as THREE from 'three';
import { rng } from '../bosque/entQuenua.geom.js';

/* ── caligrafía de color compartida por todos los pintores ──────────────── */
export const hex2rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mixRGB = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const css = (c, alfa = 1) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alfa})`;
export const mixHex = (a, b, t) => mixRGB(hex2rgb(a), hex2rgb(b), t);

/** Variantes totales de un layout (las pintadas × 2 por el espejo). */
export const variantesDe = (layout) => layout.cols * layout.filas * 2;

/* ── aTile: el rectángulo UV de una variante (puro, testeable) ──────────── */
/* margen en texels: el gutter que evita que el mipmap sangre al tile vecino */
export function tileDeVarianteEn(layout, v, margen = 6) {
  const { cols, filas, tileW, tileH } = layout;
  const total = variantesDe(layout);
  const i = ((v % total) + total) % total;
  const base = i % (cols * filas);
  const espejo = i >= cols * filas;
  const col = base % cols;
  const fila = (base / cols) | 0;
  const aw = cols * tileW;
  const ah = filas * tileH;
  const u0 = (col * tileW + margen) / aw;
  const v0 = (fila * tileH + margen) / ah;
  const w = (tileW - margen * 2) / aw;
  const h = (tileH - margen * 2) / ah;
  // v de three crece hacia arriba; el canvas pinta hacia abajo → invertir fila
  const vv = 1 - v0 - h;
  return espejo ? [u0 + w, vv, -w, h] : [u0, vv, w, h];
}

/* ── el atlas: cada tile una hermana distinta, más la dilatación anti-orla ─ */
export function crearAtlasLamina(layout, pintarTile, seed) {
  const { cols, filas, tileW, tileH } = layout;
  const cv = document.createElement('canvas');
  cv.width = cols * tileW;
  cv.height = filas * tileH;
  const ctx = cv.getContext('2d');
  for (let v = 0; v < cols * filas; v++) {
    const col = v % cols;
    const fila = (v / cols) | 0;
    pintarTile(ctx, col * tileW, fila * tileH, seed + v * 977);
  }
  // DILATACIÓN: sangrar el color de la mata hacia los texels transparentes.
  // Sin esto el mipmap mezcla los bordes con negro-transparente y el campo
  // lejano se ve orlado de oscuro (medido en el harness de envolvente).
  // El anillo dilatado queda a alfa 0.30 — POR DEBAJO del alphaTest (0.42):
  // aporta color al promedio del mip sin engordar la silueta (la lección
  // "exceso de silueta = el dual del déficit" aplica también aquí).
  const anillo = document.createElement('canvas');
  anillo.width = cv.width;
  anillo.height = cv.height;
  const actx = anillo.getContext('2d');
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2], [-4, 0], [4, 0], [0, 4], [0, -4]]) {
    actx.drawImage(cv, dx, dy);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.globalAlpha = 0.3;
  ctx.drawImage(anillo, 0, 0);
  ctx.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

/* ── la geometría: N quads cruzados en abanico, base en y=0 ───────────────
 * `desfase` (fracción del ancho) corre cada plano secundario a lo largo de
 * su normal: en matas BAJAS y anchas (roseta de lechuga) el quad visto de
 * canto pintaba una costura vertical oscura justo por el eje de la mata —
 * desfasado, la costura cae fuera del centro y la rotación por instancia la
 * disuelve en la masa. El plano 0 queda centrado: la mata sigue sentada en
 * su punto de siembra. */
export function geomLaminaCruzadaDe(ancho, alto, planos = 3, desfase = 0) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let k = 0; k < planos; k++) {
    const a = (k / planos) * Math.PI;
    const dx = Math.cos(a) * (ancho / 2);
    const dz = Math.sin(a) * (ancho / 2);
    const off = k === 0 ? 0 : desfase * ancho * (k % 2 ? 1 : -1);
    const ox = -Math.sin(a) * off;
    const oz = Math.cos(a) * off;
    const b = pos.length / 3;
    pos.push(-dx + ox, 0, -dz + oz, dx + ox, 0, dz + oz, dx + ox, alto, dz + oz, -dx + ox, alto, -dz + oz);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  // normales todas hacia ARRIBA: la masa recibe la luz del túnel pareja,
  // sin que un plano del cruce caiga a negro por darle la espalda al sol
  const nrm = new Float32Array(pos.length);
  for (let i = 0; i < nrm.length; i += 3) nrm[i + 1] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  return geo;
}

/* ── el material: Lambert mate de lámina + tile por instancia + vaivén ────
 * Los uniforms del vaivén viven en `material.userData.uniformes`: el
 * componente los anima alcanzándolos por el ref del mesh en `useFrame`
 * (el camino que las reglas react-hooks permiten para mutar por frame). */
export function materialLamina(atlas, alto) {
  const u = { uTiempo: { value: 0 }, uVaiven: { value: 0 } };
  const mat = new THREE.MeshLambertMaterial({
    map: atlas,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
  });
  mat.userData.uniformes = u;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = u.uTiempo;
    shader.uniforms.uVaiven = u.uVaiven;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          'attribute vec4 aTile;',
          'uniform float uTiempo;',
          'uniform float uVaiven;',
          'varying vec3 vArribaView;',
        ].join('\n'),
      )
      .replace(
        '#include <uv_vertex>',
        ['#include <uv_vertex>', 'vMapUv = aTile.xy + vMapUv * aTile.zw;'].join('\n'),
      )
      .replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          // el aire tibio del túnel: vaivén mínimo, pivotado en la base,
          // con fase por posición de la instancia (nunca en fila)
          'float faseMata = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;',
          `float alturaMata = clamp(position.y / ${alto.toFixed(2)}, 0.0, 1.0);`,
          'transformed.x += uVaiven * alturaMata * alturaMata * 0.03 * sin(uTiempo * 1.35 + faseMata);',
          // el "arriba" del mundo en espacio de vista, para el fragmento
          'vArribaView = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));',
        ].join('\n'),
      );
    // La lámina se ilumina como MASA: normal hacia arriba en TODO fragmento.
    // Sin esto, DoubleSide voltea la normal en la cara trasera del quad y
    // media plantación cae a negro (medido en el harness de envolvente).
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        ['#include <common>', 'varying vec3 vArribaView;'].join('\n'),
      )
      .replace(
        '#include <normal_fragment_begin>',
        ['#include <normal_fragment_begin>', 'normal = normalize(vArribaView);'].join('\n'),
      );
  };
  return mat;
}

/* ── animar el vaivén: mutación por frame fuera del componente ──────────── */
export function animarVaiven(mesh, tiempo, vaiven) {
  const u = mesh?.material?.userData?.uniformes;
  if (!u) return;
  u.uVaiven.value = vaiven ? 1 : 0;
  if (vaiven) u.uTiempo.value = tiempo;
}

/* ── variante determinista por índice de instancia (puro, testeable) ────── */
export function variantesDeItemsEn(layout, n, semilla = 4021) {
  const rn = rng(semilla);
  const total = variantesDe(layout);
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const t = tileDeVarianteEn(layout, (rn() * total) | 0);
    out[i * 4] = t[0];
    out[i * 4 + 1] = t[1];
    out[i * 4 + 2] = t[2];
    out[i * 4 + 3] = t[3];
  }
  return out;
}
