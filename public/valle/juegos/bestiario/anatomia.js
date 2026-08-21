// ── juegos/bestiario/anatomia.js — EL TALLER DE ANATOMÍA ────────────────────
//
// Todo lo que hace falta para MODELAR un animal en código, naturalista, sin un
// solo binario descargado. No es una librería nueva: es el toolkit YA PROBADO
// de `perros-realistas.js` (loft orgánico, fusión que preserva normales suaves,
// pelaje horneado, siembra de manchas deterministas) traído aquí y ampliado con
// lo que un ATLAS necesita y un perro no:
//
//   · `despeinar` + `mechon`  → pelaje LARGO que rompe la silueta (el oso no es
//     una cápsula: es un bicho greñudo, y eso se lee antes que cualquier color).
//   · `sembrarRosetas`        → el anillo roto CON PUNTO ADENTRO del jaguar,
//     que es exactamente lo que lo distingue del leopardo.
//   · `pintarAnillo/Mancha`   → los anteojos del oso, la máscara individual.
//   · `crearAnclas`           → LA PIEZA CLAVE DEL ATLAS. Cada parte, al quedar
//     colocada, deja su posición MEDIDA sobre la propia geometría (centroide o
//     vértice extremo). Los puntos calientes NO se escriben a mano: se leen del
//     modelo. Por eso esto escala a cualquier criatura nueva sin re-calibrar.
//
// Provenance (MIT / código propio del proyecto):
//   · rng / hash3 / ruido3D / ruidoFbm / poner / apuntar / pintar* / variar
//     / fusionar / hornearPelaje / cuerpoOrganico / campana / remate /
//     orejaPetalo  ← ../../perros-realistas.js (que a su vez los porta de
//     sombreadoVegetal.js y de fincaRealista.geom.js).
//   · el resto es nuevo de este módulo.
//
// TRAMPA HEREDADA QUE AQUÍ TAMBIÉN APLICA: la fusión NO recalcula normales.
// `computeVertexNormals()` sobre geometría desindexada devuelve normales POR
// CARA y el animal vuelve a ser un poliedro por más suave que sea el material.
// Se concatena position+normal+color y no se toca nada más.

import * as THREE from 'three';

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const UP = new THREE.Vector3(0, 1, 0);
export const suave = (t) => t * t * (3 - 2 * t);
export const mezclar = (a, b, t) => a + (b - a) * t;
export const suavePaso = (a, b, x) => suave(clamp01((x - a) / Math.max(1e-6, b - a)));

/* PRNG determinista (LCG): el mismo animal en cada carga, nunca azar por frame. */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function hash3(x, y, z) {
  let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  h -= Math.floor(h);
  return h;
}

export function ruido3D(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = suave(x - xi), yf = suave(y - yi), zf = suave(z - zi);
  const lerp = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), xf);
  const x10 = lerp(c(0, 1, 0), c(1, 1, 0), xf);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), xf);
  const x11 = lerp(c(0, 1, 1), c(1, 1, 1), xf);
  return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf);
}

export function ruidoFbm(x, y, z) {
  return ruido3D(x, y, z) * 0.62 + ruido3D(x * 2.3, y * 2.3, z * 2.3) * 0.26
    + ruido3D(x * 5.1, y * 5.1, z * 5.1) * 0.12;
}

/* ── colocar geometría ─────────────────────────────────────────────────────── */

export function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/* Coloca una geometría que "crece" en +Y apuntándola en la dirección `dir`. */
export function apuntar(geo, pos, dir, esc = [1, 1, 1], giro = 0) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
  if (giro) q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, giro));
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]), q,
    new THREE.Vector3(esc[0], esc[1], esc[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/* Un hueso: cilindro cónico que va DE un punto A OTRO. Evita la trigonometría
   a mano en cada pata (y evita las juntas que se despegan). */
export function hueso(a, b, rA, rB, radial = 9, segH = 1) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const largo = dir.length();
  const g = new THREE.CylinderGeometry(rB, rA, largo, radial, segH);
  const medio = va.clone().add(vb).multiplyScalar(0.5);
  apuntar(g, [medio.x, medio.y, medio.z], [dir.x, dir.y, dir.z]);
  return g;
}

/* ── pintar por vértice ────────────────────────────────────────────────────── */

export function pintarPorVertice(geo, fn) {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const col = fn(pos.getX(i), pos.getY(i), pos.getZ(i), i, c);
    arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

export function pintarPlano(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  return pintarPorVertice(geo, () => c);
}

export function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* Mancha redonda suave sobre geometría YA pintada (bib del oso, vientre claro).
   `donde` recorta la región (p.ej. "solo la cara, no la nuca"). */
export function pintarMancha(geo, centro, radio, color, opts = {}) {
  const { dureza = 0.42, fuerza = 1, donde = null, ruido = 0, semilla = 3 } = opts;
  const pos = geo.attributes.position, col = geo.attributes.color;
  if (!col) throw new Error('anatomia: pintarMancha sobre geometría sin color');
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const t = new THREE.Color();
  const [cx, cy, cz] = centro;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (donde && !donde(x, y, z)) continue;
    let d = Math.hypot(x - cx, y - cy, z - cz);
    if (ruido) d += (ruidoFbm(x * 9 + semilla, y * 9, z * 9) - 0.5) * 2 * ruido * radio;
    if (d >= radio) continue;
    const f = clamp01((radio - d) / Math.max(1e-5, radio * dureza)) * fuerza;
    if (f <= 0) continue;
    t.fromBufferAttribute(col, i).lerp(c, f);
    col.setXYZ(i, t.r, t.g, t.b);
  }
  return geo;
}

/* ANILLO sobre el plano tangente: los ANTEOJOS del oso andino son eso — arcos
   claros alrededor del ojo, casi nunca un círculo cerrado. `ruptura` los rompe. */
export function pintarAnillo(geo, centro, normal, rInt, rExt, color, opts = {}) {
  const { dureza = 0.3, ruptura = 0, semilla = 5, grosorProf = 0.9, fuerza = 1 } = opts;
  const pos = geo.attributes.position, col = geo.attributes.color;
  if (!col) throw new Error('anatomia: pintarAnillo sobre geometría sin color');
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const t = new THREE.Color();
  const N = new THREE.Vector3(...normal).normalize();
  const T = new THREE.Vector3(0, 1, 0).cross(N);
  if (T.lengthSq() < 1e-6) T.set(1, 0, 0);
  T.normalize();
  const B = N.clone().cross(T).normalize();
  const v = new THREE.Vector3();
  const soft = (rExt - rInt) * dureza + 1e-5;
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i) - centro[0], pos.getY(i) - centro[1], pos.getZ(i) - centro[2]);
    const h = v.dot(N);
    if (Math.abs(h) > rExt * grosorProf) continue;
    const u = v.dot(T), w = v.dot(B);
    const d = Math.hypot(u, w);
    if (d > rExt * 1.2) continue;
    let f = suavePaso(rInt - soft, rInt + soft, d) * (1 - suavePaso(rExt - soft, rExt + soft, d));
    if (f <= 0) continue;
    if (ruptura > 0) {
      const ang = Math.atan2(w, u);
      const corte = ruidoFbm(Math.cos(ang) * 2.4 + semilla, Math.sin(ang) * 2.4 + semilla, 0.7);
      f *= suavePaso(ruptura * 0.62, ruptura * 0.62 + 0.2, corte);
    }
    f *= fuerza;
    if (f <= 0) continue;
    t.fromBufferAttribute(col, i).lerp(c, f);
    col.setXYZ(i, t.r, t.g, t.b);
  }
  return geo;
}

/* ── fusión SIN BufferGeometryUtils, preservando normales suaves ───────────── */

export function fusionar(lista, etiqueta) {
  const gs = lista.filter(Boolean).map((g) => {
    const gg = g.index ? g.toNonIndexed() : g;
    if (gg.attributes.uv) gg.deleteAttribute('uv');
    if (gg.attributes.uv1) gg.deleteAttribute('uv1');
    return gg;
  });
  if (!gs.length) throw new Error('anatomia: sin partes en ' + etiqueta);
  let n = 0;
  for (const g of gs) {
    if (!g.attributes.position || !g.attributes.normal || !g.attributes.color) {
      throw new Error('anatomia: pieza sin position/normal/color en ' + etiqueta
        + ' — la fusión la dejaría invisible o negra.');
    }
    n += g.attributes.position.count;
  }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of gs) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

/* ── el sombreado horneado: el AO barato que separa un bicho de un juguete ─── */

export function hornearPelaje(geo, opts = {}) {
  const {
    yBajo = 0.05, yAlto = 0.9, ao = 0.34, moteado = 0.06, semilla = 1,
    cielo = 0.18, piso = 0.16, freq = 2.7,
  } = opts;
  const pos = geo.attributes.position, nor = geo.attributes.normal, col = geo.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ny = nor.getY(i);
    const luzCielo = (1 - cielo) + cielo * Math.max(0, ny);
    const alt = clamp01((y - yBajo) / Math.max(0.001, yAlto - yBajo));
    let oc = 1 - ao + ao * alt;
    if (ny < 0) oc *= 1 + ny * piso;
    const mota = 1 + (ruidoFbm(x * freq + semilla, y * freq, z * freq) - 0.5) * moteado * 2;
    const f = luzCielo * oc * mota;
    col.setXYZ(i, col.getX(i) * f, col.getY(i) * f, col.getZ(i) * f);
  }
  return geo;
}

/* ── el torso orgánico: la silueta es lo que el ojo lee primero ────────────── */

export function cuerpoOrganico({
  largo, espina, arriba, abajo, lado, nSeg = 16, nRad = 12, ruido = 0.025, semilla = 1,
}) {
  const pos = [], idx = [];
  for (let i = 0; i <= nSeg; i++) {
    const t = i / nSeg;
    const x = -largo / 2 + t * largo;
    const cy = espina(t);
    for (let j = 0; j < nRad; j++) {
      const a = (j / nRad) * Math.PI * 2;
      const s = Math.sin(a), c = Math.cos(a);
      const n = (ruidoFbm(x * 3.1 + semilla, s * 1.9 + semilla, c * 1.9) - 0.5) * 2 * ruido;
      const ry = (s >= 0 ? arriba(t) : abajo(t)) * (1 + n);
      pos.push(x, cy + s * ry, c * lado(t) * (1 + n));
    }
  }
  for (let i = 0; i < nSeg; i++) {
    for (let j = 0; j < nRad; j++) {
      const a = i * nRad + j;
      const b = i * nRad + ((j + 1) % nRad);
      const c = (i + 1) * nRad + j;
      const d = (i + 1) * nRad + ((j + 1) % nRad);
      idx.push(a, c, b, b, c, d);
    }
  }
  const iCola = pos.length / 3;
  pos.push(-largo / 2 - largo * 0.02, espina(0), 0);
  const iPecho = pos.length / 3;
  pos.push(largo / 2 + largo * 0.02, espina(1), 0);
  for (let j = 0; j < nRad; j++) {
    idx.push(iCola, j, (j + 1) % nRad);
    const base = nSeg * nRad;
    idx.push(iPecho, base + ((j + 1) % nRad), base + j);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();   // indexado → suaves de verdad
  return geo;
}

export const campana = (t, c, w) => {
  const u = clamp01(1 - Math.abs(t - c) / w);
  return u * u * (3 - 2 * u);
};
export const remate = (t, min = 0.35) => min + (1 - min) * Math.sin(Math.PI * clamp01(t)) ** 0.6;

/* TUBO por curva con radio variable — la cola larga del jaguar, la trompa de
   cera de la angelita. TubeGeometry del core es de radio CONSTANTE; esto no. */
export function tuboCurva(puntos, radioFn, opts = {}) {
  const { segs = 44, radial = 12, tapa = true } = opts;
  const curva = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)));
  const frames = curva.computeFrenetFrames(segs, false);
  const pos = [], idx = [];
  const P = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curva.getPointAt(t, P);
    const N = frames.normals[Math.min(i, segs - 1)];
    const B = frames.binormals[Math.min(i, segs - 1)];
    const r = radioFn(t);
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const s = Math.sin(a), c = Math.cos(a);
      pos.push(P.x + (N.x * c + B.x * s) * r, P.y + (N.y * c + B.y * s) * r, P.z + (N.z * c + B.z * s) * r);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      idx.push(a, c, b, b, c, d);
    }
  }
  if (tapa) {
    const p0 = curva.getPointAt(0), p1 = curva.getPointAt(1);
    const i0 = pos.length / 3; pos.push(p0.x, p0.y, p0.z);
    const i1 = pos.length / 3; pos.push(p1.x, p1.y, p1.z);
    for (let j = 0; j < radial; j++) {
      idx.push(i0, j, (j + 1) % radial);
      const base = segs * radial;
      idx.push(i1, base + ((j + 1) % radial), base + j);
    }
  }
  // ⚠️ TRAMPA QUE COSTÓ UNA TARDE: el bobinado correcto depende de la MANO del
  // marco de Frenet, y esa mano depende de hacia dónde va la curva. Con el
  // mismo código, una pata que BAJA queda con las normales hacia afuera y un
  // tubo que SUBE queda con las normales hacia ADENTRO — y una malla con las
  // normales al revés no se ve rota: se ve APAGADA, iluminada solo por el
  // ambiente. Síntoma real: el tubo de cerumen de la angelita salía verde
  // musgo y parecía un problema de sombras. Aquí se MIDE el sentido (¿la normal
  // apunta lejos del eje de la curva?) y, si está invertido, se voltea.
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  {
    const nAttr = geo.attributes.normal, pAttr = geo.attributes.position;
    let suma = 0;
    const eje = new THREE.Vector3(), P2 = new THREE.Vector3();
    for (let i = 0; i <= segs; i += Math.max(1, Math.floor(segs / 8))) {
      curva.getPointAt(i / segs, P2);
      for (let j = 0; j < radial; j += Math.max(1, Math.floor(radial / 4))) {
        const k = i * radial + j;
        if (k >= pAttr.count) continue;
        eje.set(pAttr.getX(k) - P2.x, pAttr.getY(k) - P2.y, pAttr.getZ(k) - P2.z);
        suma += eje.x * nAttr.getX(k) + eje.y * nAttr.getY(k) + eje.z * nAttr.getZ(k);
      }
    }
    if (suma < 0) {
      const ix = geo.index.array;
      for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
      geo.index.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }
  return geo;
}

/* ── la pata como cadena de volúmenes (NUNCA un tubo parejo) ───────────────── */

/* t (por longitud de cuerda) de cada punto de una cadena de articulaciones.
   Sirve para colgar las paradas de radio de las ARTICULACIONES reales en vez
   de números mágicos: si mañana el codo baja, su parada de radio baja con él.
   CatmullRom con getPointAt es paramétrica por longitud de arco, y la cuerda
   es una aproximación sobrada para posicionar un radio. */
export function tDeCadena(puntos) {
  const d = [0];
  for (let i = 1; i < puntos.length; i++) {
    d.push(d[i - 1] + Math.hypot(
      puntos[i][0] - puntos[i - 1][0],
      puntos[i][1] - puntos[i - 1][1],
      puntos[i][2] - puntos[i - 1][2],
    ));
  }
  const L = d[d.length - 1] || 1;
  return d.map((x) => x / L);
}

/* Perfil de radio por PARADAS [[t, r], …] con transición SMOOTHSTEP, no lineal:
   el músculo se hincha y la articulación hace nudillo sin quiebres cónicos.
   Es lo que convierte tuboCurva en una pata: grueso arriba, cintura hacia la
   articulación, bulto óseo EN la articulación, caña fina, pata que se
   ensancha al apoyar. Si el perfil es monótono, la pata vuelve a ser tubo. */
export function perfilParadas(paradas) {
  return (t) => {
    if (t <= paradas[0][0]) return paradas[0][1];
    for (let i = 0; i < paradas.length - 1; i++) {
      const [t0, r0] = paradas[i], [t1, r1] = paradas[i + 1];
      if (t <= t1) return mezclar(r0, r1, suave(clamp01((t - t0) / Math.max(1e-6, t1 - t0))));
    }
    return paradas[paradas.length - 1][1];
  };
}

/* MASA muscular orientada: elipsoide que crece a lo largo de `dir` (largo),
   con ancho en el plano y grosor aplastado — el hombro y el muslo son esto,
   FUNDIDOS con el tronco. La pata no nace de una costura: nace de una masa. */
export function masa(centro, dir, largo, ancho, grosor = ancho, seg = 26) {
  const g = new THREE.SphereGeometry(0.5, seg, Math.max(12, seg - 8));
  apuntar(g, centro, dir, [ancho, largo, grosor]);
  return g;
}

/* ── piezas de cuerpo ──────────────────────────────────────────────────────── */

/* OREJA de pétalo: punta REDONDA (un cono en la cabeza se lee como púa; una
   oreja real es una hoja carnosa). Sirve de oreja caída y de mechón de pelo. */
export function orejaPetalo(attach, dir, largo, ancho, grosor = 0.3) {
  const g = new THREE.SphereGeometry(0.5, 9, 7);
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  apuntar(
    g,
    [attach[0] + d.x * largo * 0.42, attach[1] + d.y * largo * 0.42, attach[2] + d.z * largo * 0.42],
    dir,
    [ancho, largo, ancho * grosor],
  );
  return g;
}

/* OREJA REDONDA (oso, felino): disco grueso, no pétalo. `normalCara` es hacia
   dónde MIRA la oreja — el disco queda perpendicular a esa dirección, que es
   lo que hace que se lea como oreja y no como aleta torcida. */
export function orejaRedonda(centro, normalCara, radio, grosor = 0.34, seg = 14) {
  const g = new THREE.SphereGeometry(0.5, seg, Math.max(6, seg - 4));
  apuntar(g, centro, normalCara, [radio * 2, radio * 2 * grosor, radio * 2]);
  return g;
}

/* MECHÓN de pelo largo: lente blando orientado. Cuarenta de estos en el lomo y
   los cachetes y el bicho deja de ser una cápsula lisa. */
export function mechon(base, dir, largo, ancho, seg = 6) {
  const g = new THREE.SphereGeometry(0.5, seg, Math.max(4, seg - 2));
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  apuntar(
    g,
    [base[0] + d.x * largo * 0.4, base[1] + d.y * largo * 0.4, base[2] + d.z * largo * 0.4],
    dir, [ancho, largo, ancho * 0.72],
  );
  return g;
}

/* GARRA curva no retráctil (oso) o retráctil asomada (felino): gajo cónico
   doblado. Se hace con tuboCurva para que la curva se lea de verdad. */
export function garraCurva(base, dir, largo, grosor, curvatura = 0.55) {
  const d = new THREE.Vector3(...dir).normalize();
  const abajo = new THREE.Vector3(0, -1, 0);
  const lateral = new THREE.Vector3().crossVectors(d, abajo);
  if (lateral.lengthSq() < 1e-6) lateral.set(0, 0, 1);
  const flexion = new THREE.Vector3().crossVectors(lateral, d).normalize().multiplyScalar(-curvatura);
  const p = [];
  for (let i = 0; i <= 3; i++) {
    const t = i / 3;
    p.push([
      base[0] + d.x * largo * t + flexion.x * largo * t * t,
      base[1] + d.y * largo * t + flexion.y * largo * t * t,
      base[2] + d.z * largo * t + flexion.z * largo * t * t,
    ]);
  }
  return tuboCurva(p, (t) => grosor * (1 - t) ** 0.72 + grosor * 0.05, { segs: 12, radial: 7 });
}

/* ── pelaje LARGO: rompe la silueta sin subir el conteo de triángulos ──────── */

export function despeinar(geo, opts = {}) {
  const { amp = 0.02, freq = 9, semilla = 1, sesgo = null } = opts;
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let a = (ruidoFbm(x * freq + semilla, y * freq, z * freq) - 0.5) * 2 * amp;
    if (sesgo) a *= sesgo(x, y, z);
    pos.setXYZ(i, x + nor.getX(i) * a, y + nor.getY(i) * a, z + nor.getZ(i) * a);
  }
  pos.needsUpdate = true;
  return geo;
}

/* ── siembra de patrones de pelaje ─────────────────────────────────────────── */

function centrosSembrados(pos, col, { n, rMin, rMax, semilla, separacion, donde }) {
  const r = rng(semilla);
  const centros = [];
  for (let intento = 0; intento < n * 90 && centros.length < n; intento++) {
    const i = Math.floor(r() * pos.count);
    const cx = pos.getX(i), cy = pos.getY(i), cz = pos.getZ(i);
    if (donde && !donde(cx, cy, cz, col, i)) continue;
    const rad = rMin + r() * (rMax - rMin);
    let pisa = false;
    for (const m of centros) {
      if (Math.hypot(cx - m[0], cy - m[1], cz - m[2]) < (rad + m[3]) * separacion) { pisa = true; break; }
    }
    if (!pisa) centros.push([cx, cy, cz, rad, i, r()]);
  }
  return centros;
}

/* MANCHA SÓLIDA (cabeza y patas del jaguar, borrones del vientre). */
export function sembrarManchas(geo, opts = {}) {
  const {
    n = 20, rMin = 0.012, rMax = 0.022, tinta = '#15100c', semilla = 1,
    separacion = 1.25, donde = null, dureza = 0.4, fuerza = 1,
  } = opts;
  const pos = geo.attributes.position, col = geo.attributes.color;
  const centros = centrosSembrados(pos, col, { n, rMin, rMax, semilla, separacion, donde });
  const c = tinta instanceof THREE.Color ? tinta : new THREE.Color(tinta);
  const t = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let cubre = 0;
    for (const [mx, my, mz, rad] of centros) {
      const dx = x - mx, dy = y - my, dz = z - mz;
      if (dx * dx + dy * dy + dz * dz > rad * rad) continue;
      const d = Math.hypot(dx, dy, dz);
      cubre = Math.max(cubre, clamp01((rad - d) / Math.max(1e-5, rad * dureza)));
    }
    if (cubre <= 0) continue;
    t.fromBufferAttribute(col, i).lerp(c, cubre * fuerza);
    col.setXYZ(i, t.r, t.g, t.b);
  }
  return geo;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LA ROSETA DEL JAGUAR — anillo ROTO con UNO A TRES PUNTOS ADENTRO.
   Ese punto interior es EXACTAMENTE lo que separa a Panthera onca del
   leopardo (Panthera pardus), que las lleva vacías. Si el modelo no lo tiene,
   el atlas está enseñando mal; por eso el patrón se genera, no se pinta a ojo.

   Cómo: se siembran centros deterministas con separación mínima; en cada uno
   se levanta un marco tangente con la normal del vértice semilla y se pinta
   una banda anular cuyo radio se ondula con ruido angular (roseta orgánica,
   nunca un donut perfecto) y se ROMPE en 3–5 arcos. Después caen los núcleos.
   ═══════════════════════════════════════════════════════════════════════════ */
export function sembrarRosetas(geo, opts = {}) {
  const {
    n = 26, rMin = 0.055, rMax = 0.09, tinta = '#140f0b', semilla = 7,
    separacion = 1.02, grosor = 0.34, ruptura = 0.5, nucleos = 2,
    donde = null, dureza = 0.34, profundidad = 0.75,
  } = opts;
  const pos = geo.attributes.position, nor = geo.attributes.normal, col = geo.attributes.color;
  const centros = centrosSembrados(pos, col, { n, rMin, rMax, semilla, separacion, donde });
  const c = tinta instanceof THREE.Color ? tinta : new THREE.Color(tinta);
  const t = new THREE.Color();
  const N = new THREE.Vector3(), T = new THREE.Vector3(), B = new THREE.Vector3(), v = new THREE.Vector3();
  const arriba = new THREE.Vector3(0, 1, 0), eje = new THREE.Vector3(1, 0, 0);

  // marco tangente + núcleos por roseta (una sola vez, no por vértice)
  const marcos = centros.map(([cx, cy, cz, rad, idx, semilla2]) => {
    N.set(nor.getX(idx), nor.getY(idx), nor.getZ(idx)).normalize();
    T.copy(Math.abs(N.dot(arriba)) > 0.92 ? eje : arriba).cross(N).normalize();
    B.copy(N).cross(T).normalize();
    const r2 = rng(Math.floor(semilla2 * 1e6) + 17);
    const puntos = [];
    for (let k = 0; k < nucleos; k++) {
      const ang = r2() * Math.PI * 2;
      const rr = rad * (0.16 + r2() * 0.24);
      puntos.push([Math.cos(ang) * rr, Math.sin(ang) * rr, rad * (0.12 + r2() * 0.07)]);
    }
    return {
      c: [cx, cy, cz], rad,
      N: N.clone(), T: T.clone(), B: B.clone(),
      fase: semilla2 * 12.9, puntos,
    };
  });

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let cubre = 0;
    for (const m of marcos) {
      const dx = x - m.c[0], dy = y - m.c[1], dz = z - m.c[2];
      const rr = m.rad * 1.3;
      if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
      v.set(dx, dy, dz);
      const h = v.dot(m.N);
      if (Math.abs(h) > m.rad * profundidad) continue;
      const u = v.dot(m.T), w = v.dot(m.B);
      const d = Math.hypot(u, w);
      const ang = Math.atan2(w, u);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      // radio exterior lobulado: la roseta de verdad NO es un círculo
      const lobulo = 0.86 + 0.09 * Math.sin(3 * ang + m.fase)
        + 0.14 * (ruidoFbm(ca * 2.1 + m.fase, sa * 2.1 + m.fase, 0.3) - 0.5) * 2;
      const rExt = m.rad * lobulo;
      const rInt = rExt * (1 - grosor);
      const soft = Math.max(1e-5, (rExt - rInt) * dureza);
      let f = suavePaso(rInt - soft, rInt + soft, d) * (1 - suavePaso(rExt - soft, rExt + soft, d));
      if (ruptura > 0 && f > 0) {
        const corte = ruidoFbm(ca * 3.1 + m.fase * 1.7, sa * 3.1 + m.fase * 1.7, 2.4);
        f *= suavePaso(ruptura * 0.6, ruptura * 0.6 + 0.18, corte);
      }
      // núcleos: el punto adentro
      for (const [pu, pw, pr] of m.puntos) {
        const dp = Math.hypot(u - pu, w - pw);
        if (dp < pr) f = Math.max(f, clamp01((pr - dp) / Math.max(1e-5, pr * 0.5)));
      }
      if (f > cubre) cubre = f;
    }
    if (cubre <= 0) continue;
    t.fromBufferAttribute(col, i).lerp(c, cubre);
    col.setXYZ(i, t.r, t.g, t.b);
  }
  return geo;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANCLAS — LA PIEZA QUE HACE ESTO UN ATLAS Y NO UNA GALERÍA.
   El generador SABE dónde quedó cada parte porque la acaba de colocar; en vez
   de que alguien mire el render y escriba [0.42, 0.61, 0.13] a ojo, la posición
   se MIDE sobre la geometría de esa parte. Consecuencia práctica: si mañana el
   oso engorda o el jaguar se estira, los puntos calientes se mueven SOLOS, y
   una criatura nueva no necesita calibración manual. Es lo que permite escalar
   el atlas a todo el catálogo de especies sin un humano midiendo píxeles.
   ═══════════════════════════════════════════════════════════════════════════ */
export function crearAnclas() {
  const mapa = new Map();
  const listas = (g) => (Array.isArray(g) ? g.filter(Boolean) : [g]);

  function medir(geos, modo, dir) {
    const gs = listas(geos);
    if (!gs.length) throw new Error('anatomia: anclas sin geometría');
    if (modo === 'centro') {
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const g of gs) {
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { sx += p.getX(i); sy += p.getY(i); sz += p.getZ(i); n++; }
      }
      return [sx / n, sy / n, sz / n];
    }
    // 'extremo': el vértice que más avanza en `dir` (punta de garra, hocico…)
    const d = new THREE.Vector3(...(dir || [0, 1, 0])).normalize();
    let mejor = -Infinity, out = [0, 0, 0];
    for (const g of gs) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const s = x * d.x + y * d.y + z * d.z;
        if (s > mejor) { mejor = s; out = [x, y, z]; }
      }
    }
    return out;
  }

  return {
    /* marca(id, geometría|[geometrías], { modo:'centro'|'extremo', dir }) */
    marca(id, geos, opts = {}) {
      const p = medir(geos, opts.modo || 'centro', opts.dir);
      if (opts.hacia) {           // separa el ancla de la piel hacia afuera
        const d = new THREE.Vector3(...opts.hacia).normalize().multiplyScalar(opts.hacia[3] ?? 0);
        p[0] += d.x; p[1] += d.y; p[2] += d.z;
      }
      mapa.set(id, p);
      return geos;
    },
    /* punto medio entre dos anclas ya marcadas (p.ej. entre los dos ojos) */
    marcaMedio(id, a, b, alza = 0) {
      const pa = this.punto(a), pb = this.punto(b);
      mapa.set(id, [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + alza, (pa[2] + pb[2]) / 2]);
    },
    punto(id) {
      const p = mapa.get(id);
      if (!p) throw new Error(`anatomia: ancla "${id}" no existe — ¿se marcó al colocar la parte?`);
      return p;
    },
    tiene: (id) => mapa.has(id),
    ids: () => [...mapa.keys()],
  };
}

/* ── material y contraluz ──────────────────────────────────────────────────── */

/* Rim de contraluz: sin esto un animal oscuro (el oso es casi negro) se hunde
   contra el fondo y se vuelve una silueta plana. Retunado del parche de pelaje
   de animales.js: aquí NO se re-hornea el countershading (ya está en los
   vértices) — solo el halo fino del borde. pow alto = halo FINO, no lavado. */
export function parcheContraluz(shader, { amp = 0.26, filo = 3.6, calido = [1.0, 0.86, 0.62] } = {}) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>',
    `float rimBes = pow( 1.0 - clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 ), ${filo.toFixed(2)} );
	outgoingLight += vec3( ${calido[0].toFixed(3)}, ${calido[1].toFixed(3)}, ${calido[2].toFixed(3)} ) * rimBes * ${amp.toFixed(3)};
	#include <opaque_fragment>`,
  );
}

export function materialPelaje(opts = {}) {
  const { roughness = 0.88, metalness = 0.0, rim = 0.26, filo = 3.6, calido } = opts;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness });
  // ⚠️ SIN flatShading: las normales suaves preservadas en la fusión son la
  // mitad del realismo; flatShading las pisa y devuelve el poliedro.
  if (rim > 0) {
    m.onBeforeCompile = (sh) => parcheContraluz(sh, { amp: rim, filo, calido });
    m.customProgramCacheKey = () => `bestiario-rim-${rim}-${filo}`;
  }
  return m;
}

/* ── utilidades de medida ──────────────────────────────────────────────────── */

export function cajaDe(objeto) {
  return new THREE.Box3().setFromObject(objeto);
}
