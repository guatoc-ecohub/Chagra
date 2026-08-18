// ── perros-realistas.js — DANTE Y OLIVER, LA PIEL DE LA PWA, PORTADA ────────
//
// Orden del operador (2026-07-30): «la versión de perros de aquí está linda y
// la del valle guatoc también, quiero que ambos convivan […] en el valle solo
// conviven dos perros, siempre la misma versión, y cada tanto cambia a la otra
// para ver los 4 perros — una transición linda entre el cambio de uno a otro».
//
// O sea: la pareja tiene DOS pieles aprobadas y las dos se quedan.
//   · la LOW-POLY de este valle (elementos.js → armarPerro), y
//   · la REALISTA de la PWA (`chagra/src/visual/mundo3d/finca/
//     fincaRealista.geom.js`, `perroDalmata`/`perroBeagle` andantes, commit
//     030e5021) — loft orgánico, manchas sembradas, pelaje horneado.
// Este módulo es el PORT de la segunda al stack de acá (three r160 vendorizado,
// sin build). Qué cambió en el viaje y por qué:
//   · `mergeGeometries` NO está en el vendor (solo controls/math/objects/post/
//     shaders — verificado en la ronda de elementos.js: el import tira 404 y
//     tumba el módulo entero). La fusión va manual abajo, y PRESERVA las
//     normales que trae cada parte: la lección #3 del archivo original es que
//     `computeVertexNormals()` sobre geometría desindexada devuelve normales
//     POR CARA y el animal vuelve a ser un poliedro por más suave que sea el
//     material. Aquí se concatena position+normal+color y NO se recalcula nada.
//   · los helpers (`rng`, `ruidoFbm`, `poner`, `apuntar`, `pintar*`) vienen de
//     `sombreadoVegetal.js`, copiados enteros: son three core puro.
//   · las fábricas van SIEMPRE en modo `andante` (perro desarmado: cuerpo,
//     cabeza, 4 patas y cola con pivote propio) porque acá los perros CAMINAN.
//     El alma viene completa: la sonrisa y el parche de Oliver, el hocico
//     escarchado, la lengua de baboso y las cejas de Dante, los dos collares.
//   · la escala NO es la del original: `armarPerroRealista` recibe la alzada
//     OBJETIVO (la del gemelo low-poly ya anclado a 0,349/0,595) y se MIDE con
//     Box3 — así el ancla de alzada vale para las dos pieles sin re-imponerla,
//     y el cambio de piel no cambia el tamaño del perro (es el mismo perro).
import * as THREE from 'three';

/* ── helpers portados de sombreadoVegetal.js (three core puro) ─────────────── */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const UP = new THREE.Vector3(0, 1, 0);

/* PRNG determinista (LCG): el mismo perro en cada carga, nunca azar por frame. */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash3(x, y, z) {
  let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  h -= Math.floor(h);
  return h;
}
const suave = (t) => t * t * (3 - 2 * t);
function ruido3D(x, y, z) {
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
function ruidoFbm(x, y, z) {
  return ruido3D(x, y, z) * 0.65 + ruido3D(x * 2.3, y * 2.3, z * 2.3) * 0.35;
}

function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}
function apuntar(geo, pos, dir, esc = [1, 1, 1], giro = 0) {
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
function pintarPorVertice(geo, fn) {
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
function pintarPlano(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  return pintarPorVertice(geo, () => c);
}
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* ── la fusión SIN BufferGeometryUtils, preservando normales suaves ─────────
   Cada parte llega con position+normal+color (las primitivas y el loft traen
   sus normales suaves; pintar*() pone el color). Se desindexa TODO, se
   descarta el uv (el material no usa mapas) y se concatena. NO se recalculan
   normales: hacerlo sobre lo desindexado daría normales por-cara y el perro
   volvería a poliedro — la trampa fina documentada en el original. */
function fusionar(lista, etiqueta) {
  const gs = lista.filter(Boolean).map((g) => {
    const gg = g.index ? g.toNonIndexed() : g;
    if (gg.attributes.uv) gg.deleteAttribute('uv');
    return gg;
  });
  if (!gs.length) throw new Error('perros-realistas: sin partes en ' + etiqueta);
  let n = 0;
  for (const g of gs) {
    if (!g.attributes.position || !g.attributes.normal || !g.attributes.color) {
      throw new Error('perros-realistas: pieza sin position/normal/color en ' + etiqueta
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
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

/* Hornea el sombreado SOBRE la malla fusionada: luz de cielo arriba, oclusión
   de panza abajo, sombra propia de lo que mira al piso y moteado de pelaje.
   El AO barato que separa un bicho de un juguete. */
function hornearPelaje(geo, { yBajo = 0.05, yAlto = 0.9, ao = 0.38, moteado = 0.07, semilla = 1 } = {}) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, col = geo.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ny = nor.getY(i);
    const cielo = 0.82 + 0.18 * Math.max(0, ny);
    const alt = clamp01((y - yBajo) / Math.max(0.001, yAlto - yBajo));
    let oc = 1 - ao + ao * alt;
    if (ny < 0) oc *= 1 + ny * 0.16;
    const mota = 1 + (ruidoFbm(x * 2.7 + semilla, y * 2.7, z * 2.7) - 0.5) * moteado * 2;
    const f = cielo * oc * mota;
    col.setXYZ(i, col.getX(i) * f, col.getY(i) * f, col.getZ(i) * f);
  }
  return geo;
}

/* ── el torso orgánico: la silueta es lo que el ojo lee primero ────────────── */
function cuerpoOrganico({ largo, espina, arriba, abajo, lado, nSeg = 16, nRad = 12, ruido = 0.025, semilla = 1 }) {
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
const campana = (t, c, w) => {
  const u = clamp01(1 - Math.abs(t - c) / w);
  return u * u * (3 - 2 * u);
};
const remate = (t, min = 0.35) => min + (1 - min) * Math.sin(Math.PI * clamp01(t)) ** 0.6;

/* OREJA de pétalo: esfera aplastada orientada — punta REDONDA (un cono en la
   cabeza se lee como púa; una oreja real es una hoja carnosa). */
function orejaPetalo(attach, dir, largo, ancho, grosor = 0.3) {
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

/* Pata canina (muslo→caña→garra, solapadas y con jitter): la comparten
   dálmata (larga y fina) y beagle (corta y fuerte). */
function pataCanina(p, r, { x, z, atras, yMuslo, hMuslo, rMuslo, yCana, hCana, rCana, yGarra, rGarra, colorMuslo, colorCana, colorGarra }) {
  const j = () => (r() - 0.5) * 0.012;
  const dx = x + j(), dz = z + j();
  const muslo = new THREE.CylinderGeometry(rMuslo, rCana * 1.15, hMuslo, 7, 1);
  poner(muslo, [dx, yMuslo, dz], [0, 0, (atras ? -0.09 : 0.04) + j() * 3]);
  p.push(pintarPlano(muslo, colorMuslo));
  const bajaX = dx + (atras ? -0.018 : 0.008);
  const cana = new THREE.CylinderGeometry(rCana, rCana * 0.85, hCana, 6, 1);
  poner(cana, [bajaX, yCana, dz], [0, 0, j() * 2]);
  p.push(pintarPlano(cana, colorCana));
  const garra = new THREE.SphereGeometry(rGarra, 7, 5);
  poner(garra, [bajaX + 0.012, yGarra, dz], [0, 0, 0], [1.3, 0.65, 1]);
  p.push(pintarPlano(garra, colorGarra));
}

/* MANCHAS REDONDAS de dálmata (FCI 107: negras, redondas, SEPARADAS — nunca
   ruido celular): discos deterministas sembrados sobre la malla fusionada,
   solo sobre piel clara y rechazando el que pise a otro. ANTES del AO. */
function sembrarManchasRedondas(geo, { n = 14, rMin = 0.045, rMax = 0.07, negro = '#26262b', semilla = 1, separacion = 1.2 } = {}) {
  const pos = geo.attributes.position, col = geo.attributes.color;
  const r = rng(semilla);
  const centros = [];
  for (let intento = 0; intento < n * 40 && centros.length < n; intento++) {
    const i = Math.floor(r() * pos.count);
    if ((col.getX(i) + col.getY(i) + col.getZ(i)) / 3 < 0.6) continue;   // solo piel blanca
    const cx = pos.getX(i), cy = pos.getY(i), cz = pos.getZ(i);
    const rad = rMin + r() * (rMax - rMin);
    let pisa = false;
    for (const m of centros) {
      if (Math.hypot(cx - m[0], cy - m[1], cz - m[2]) < (rad + m[3]) * separacion) { pisa = true; break; }
    }
    if (!pisa) centros.push([cx, cy, cz, rad]);
  }
  const cNegro = new THREE.Color(negro);
  const cV = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let cubre = 0;
    for (const [mx, my, mz, rad] of centros) {
      const d = Math.hypot(x - mx, y - my, z - mz);
      if (d < rad) cubre = Math.max(cubre, clamp01((rad - d) / (rad * 0.35)));
    }
    if (cubre > 0) {
      cV.fromBufferAttribute(col, i).lerp(cNegro, cubre);
      col.setXYZ(i, cV.r, cV.g, cV.b);
    }
  }
  return geo;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DÁLMATA (FCI 107) — OLIVER. Cuerpo casi CUADRADO, atlético, patas largas,
   cola de sable, blanco con manchas sembradas, EL PARCHE sobre el ojo
   izquierdo, sonrisa perruna y collar rojo. Mira a +X, cruz ~0.5.
   Siempre `andante`: cuerpo + cabeza + 4 patas + cola, cada uno con pivote.
   ═══════════════════════════════════════════════════════════════════════════ */
function perroDalmata(q = 1, seed = 51) {
  const BLANCO = '#f3efe7', NEGRO = '#26262b';
  const r = rng(seed);
  const p = [];
  const nSeg = Math.max(13, Math.round(18 * q));
  const nRad = Math.max(11, Math.round(14 * q));

  const torso = cuerpoOrganico({
    largo: 0.66, nSeg, nRad, semilla: seed, ruido: 0.018,
    espina: (t) => 0.455 + 0.035 * campana(t, 0.85, 0.3) - 0.012 * campana(t, 0.4, 0.35),
    arriba: (t) => (0.075 + 0.012 * campana(t, 0.8, 0.35)) * remate(t, 0.42),
    abajo: (t) => (0.05 + 0.115 * campana(t, 0.74, 0.38)) * remate(t, 0.46),
    lado: (t) => (0.075 + 0.016 * campana(t, 0.78, 0.35)) * remate(t, 0.46),
  });
  p.push(pintarPlano(torso, BLANCO));
  const anca = new THREE.SphereGeometry(0.072, 10, 8);
  poner(anca, [-0.22, 0.45, 0], [0, 0, 0.12], [1, 1, 0.8]);
  p.push(pintarPlano(anca, BLANCO));
  // Pivote del hombro/cadera arriba del muslo: de ahí cuelga la pata andante.
  const PIV_PATA = 0.45;
  const POS_PATAS = [[0.24, 0.055, false], [0.24, -0.055, false], [-0.22, 0.065, true], [-0.22, -0.065, true]];
  const armaPata = (destino, x, z, atras) => pataCanina(destino, r, {
    x, z, atras,
    yMuslo: 0.32, hMuslo: 0.28, rMuslo: 0.042,
    yCana: 0.13, hCana: 0.22, rCana: 0.017,
    yGarra: 0.02, rGarra: 0.022,
    colorMuslo: BLANCO, colorCana: BLANCO, colorGarra: BLANCO,
  });
  // Cola de SABLE en S suave, pieza aparte (la del helicóptero del cariño).
  const cp = [];
  const cola1 = new THREE.CylinderGeometry(0.012, 0.02, 0.2, 6, 2);
  apuntar(cola1, [-0.378, 0.426, 0.008], [-0.87, -0.49, 0.09]);
  cp.push(pintarPlano(cola1, BLANCO));
  const cola2 = new THREE.CylinderGeometry(0.007, 0.013, 0.16, 6, 1);
  apuntar(cola2, [-0.533, 0.381, 0.031], [-0.98, 0.06, 0.21]);
  cp.push(pintarPlano(cola2, BLANCO));
  const puntaCola = new THREE.SphereGeometry(0.009, 6, 5);
  poner(puntaCola, [-0.611, 0.386, 0.048]);
  cp.push(pintarPlano(puntaCola, BLANCO));
  // Cuello ERGUIDO (porte de carroza) + collar ROJO con su plaquita de latón.
  const cuello = new THREE.CylinderGeometry(0.052, 0.085, 0.21, 9, 2);
  apuntar(cuello, [0.3, 0.52, 0], [0.55, 0.85, 0], [1, 1, 0.8]);
  p.push(pintarPlano(cuello, BLANCO));
  const collar = new THREE.TorusGeometry(0.072, 0.014, 7, 14);
  collar.rotateX(Math.PI / 2);
  apuntar(collar, [0.276, 0.475, 0], [0.55, 0.85, 0], [1, 1, 0.85]);
  p.push(pintarPlano(collar, '#a83232'));
  const placa = new THREE.SphereGeometry(0.016, 6, 5);
  poner(placa, [0.335, 0.42, 0], [0, 0, 0], [0.8, 1.15, 0.5]);
  p.push(pintarPlano(placa, '#c8963a'));

  const cuerpo = hornearPelaje(
    sembrarManchasRedondas(fusionar(p, 'perro-dalmata'), {
      n: 15, rMin: 0.045, rMax: 0.07, negro: NEGRO, semilla: seed + 11,
    }),
    { yBajo: 0.015, yAlto: 0.56, ao: 0.34, moteado: 0.05, semilla: seed },
  );

  // ── CABEZA: cráneo alargado, hocico largo con stop suave, orejas negras
  //    caídas, ojos entrecerrados de felicidad, LA SONRISA y EL PARCHE ──
  const c = [];
  const craneo = new THREE.SphereGeometry(0.08, 11, 9);
  poner(craneo, [0.015, 0.005, 0], [0, 0, -0.05], [1.25, 0.92, 0.82]);
  c.push(pintarPlano(craneo, BLANCO));
  const hocico = new THREE.SphereGeometry(0.047, 9, 7);
  poner(hocico, [0.15, -0.02, 0], [0, 0, -0.12], [1.95, 0.66, 0.62]);
  c.push(pintarPlano(hocico, BLANCO));
  const nariz = new THREE.SphereGeometry(0.017, 6, 5);
  poner(nariz, [0.235, -0.005, 0]);
  c.push(pintarPlano(nariz, '#1c1815'));
  for (const lado of [1, -1]) {
    const oreja = orejaPetalo([0.0, 0.07, lado * 0.052], [0.05, -0.75, lado * 0.62], 0.115, 0.062, 0.28);
    c.push(pintarPlano(oreja, NEGRO));
    // Ojos ENTRECERRADOS de felicidad: media luna inclinada, no botón.
    const ojo = new THREE.SphereGeometry(0.015, 6, 4);
    poner(ojo, [0.09, 0.032, lado * 0.05], [0, 0, 0.35], [1.25, 0.38, 0.7]);
    c.push(pintarPlano(ojo, '#1f1a14'));
  }
  // La SONRISA perruna: boca abierta oscura, comisuras arriba, lengüita rosa.
  const boca = new THREE.SphereGeometry(0.032, 8, 6);
  poner(boca, [0.155, -0.05, 0], [0, 0, -0.15], [1.35, 0.5, 0.75]);
  c.push(pintarPlano(boca, '#33201f'));
  const lenguita = new THREE.SphereGeometry(0.02, 7, 5);
  poner(lenguita, [0.163, -0.058, 0.004], [0, 0, -0.3], [1.35, 0.5, 0.8]);
  c.push(pintarPlano(lenguita, '#d9737f'));
  for (const lado of [1, -1]) {
    const comisura = new THREE.SphereGeometry(0.009, 5, 4);
    poner(comisura, [0.115, -0.026, lado * 0.04]);
    c.push(pintarPlano(comisura, '#33201f'));
  }
  const cabezaFusion = fusionar(c, 'cabeza-perro-dalmata');
  // EL PARCHE sobre el ojo izquierdo — su seña particular, legible desde
  // lejos donde las motas chicas ya se funden. ANTES del AO.
  {
    const posA = cabezaFusion.attributes.position;
    const colA = cabezaFusion.attributes.color;
    const cParche = new THREE.Color(NEGRO);
    const cTmp = new THREE.Color();
    for (let vi = 0; vi < posA.count; vi++) {
      const d = Math.hypot(posA.getX(vi) - 0.075, posA.getY(vi) - 0.045, posA.getZ(vi) - 0.055);
      if (d < 0.052) {
        cTmp.fromBufferAttribute(colA, vi).lerp(cParche, clamp01((0.052 - d) / 0.018));
        colA.setXYZ(vi, cTmp.r, cTmp.g, cTmp.b);
      }
    }
  }
  const cabeza = hornearPelaje(
    sembrarManchasRedondas(cabezaFusion, {
      n: 5, rMin: 0.018, rMax: 0.032, negro: NEGRO, semilla: seed + 17, separacion: 1.4,
    }),
    { yBajo: -0.1, yAlto: 0.1, ao: 0.24, moteado: 0.04, semilla: seed + 3 },
  );

  // Piezas articuladas: cada pata con sus manchitas (un dálmata de patas
  // impolutas se lee plástico), la cola también con sus motas.
  const patas = POS_PATAS.map(([px, pz, atras], k) => {
    const pl = [];
    armaPata(pl, 0, 0, atras);
    const geo = hornearPelaje(
      sembrarManchasRedondas(fusionar(pl, `pata-dalmata-${k}`), {
        n: 2, rMin: 0.018, rMax: 0.032, negro: NEGRO, semilla: seed + 21 + k * 7,
      }),
      { yBajo: 0.015, yAlto: 0.5, ao: 0.3, moteado: 0.04, semilla: seed + k },
    );
    geo.translate(0, -PIV_PATA, 0);
    return { geom: geo, pivote: [px, PIV_PATA, pz] };
  });
  const colaGeo = hornearPelaje(
    sembrarManchasRedondas(fusionar(cp, 'cola-dalmata'), {
      n: 3, rMin: 0.016, rMax: 0.026, negro: NEGRO, semilla: seed + 29, separacion: 1.1,
    }),
    { yBajo: 0.3, yAlto: 0.52, ao: 0.22, moteado: 0.04, semilla: seed + 5 },
  );
  colaGeo.translate(0.291, -0.475, 0.001);   // la raíz de la cola al origen
  return {
    cuerpo, cabeza, pivote: [0.4, 0.6, 0],
    patas,
    cola: { geom: colaGeo, pivote: [-0.291, 0.475, -0.001], eje: 'y' },   // sable: menea de lado
    lengua: null,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   BEAGLE (FCI 161) — DANTE. Bajito y alargado, orejas ENORMES color hígado,
   tricolor con silla negra, la bandera erguida de punta blanca, el HOCICO
   ESCARCHADO de perro de 15 años, cejas canela, collar verde y LA LENGUA de
   baboso colgando. Mira a +X, cruz ~0.38. Siempre `andante`.
   ═══════════════════════════════════════════════════════════════════════════ */
function perroBeagle(q = 1, seed = 51) {
  const BLANCO = '#f2ecdc', NEGRO = '#2a2622', CANELA = '#a5622c', OREJA = '#5f3d20';
  const r = rng(seed);
  const p = [];
  const nSeg = Math.max(11, Math.round(15 * q));
  const nRad = Math.max(10, Math.round(12 * q));

  // Torso long-and-low: lomo nivelado, barril lleno, casi sin cintura.
  const torso = cuerpoOrganico({
    largo: 0.58, nSeg, nRad, semilla: seed, ruido: 0.022,
    espina: (t) => 0.3 + 0.015 * campana(t, 0.8, 0.4),
    arriba: (t) => (0.085 + 0.01 * campana(t, 0.5, 0.6)) * remate(t, 0.45),
    abajo: (t) => (0.08 + 0.07 * campana(t, 0.62, 0.5)) * remate(t, 0.5),
    lado: (t) => (0.1 + 0.01 * campana(t, 0.7, 0.4)) * remate(t, 0.5),
  });
  // Tricolor pintado por vértice SOBRE el loft (bordes con ruido, no serrucho).
  const cB = new THREE.Color(BLANCO), cN = new THREE.Color(NEGRO), cC = new THREE.Color(CANELA);
  pintarPorVertice(torso, (x, y, z, i, c) => {
    const n = (ruidoFbm(x * 4.2 + seed, y * 4.2, z * 4.2) - 0.5) * 0.05;
    if (y < 0.2 + n) return c.copy(cB);                             // panza y bajos
    if (x > 0.2 + n) return c.copy(cB);                             // pechera
    if (y > 0.3 + n && x > -0.23 && x < 0.09) return c.copy(cN);    // la silla
    return c.copy(cC);                                              // flancos
  });
  p.push(torso);
  const anca = new THREE.SphereGeometry(0.075, 10, 8);
  poner(anca, [-0.19, 0.31, 0], [0, 0, 0.12], [1, 1, 0.85]);
  p.push(pintarPlano(anca, CANELA));
  const pechera = new THREE.SphereGeometry(0.06, 9, 7);
  poner(pechera, [0.24, 0.24, 0], [0, 0, 0.5], [0.75, 1.05, 0.68]);
  p.push(pintarPlano(pechera, BLANCO));
  // Pivote bajito (cadera de perro salchichón): de ahí cuelga la pata andante.
  const PIV_PATA = 0.22;
  const POS_PATAS = [[0.2, 0.06, false], [0.2, -0.06, false], [-0.18, 0.07, true], [-0.18, -0.07, true]];
  const armaPata = (destino, x, z, atras) => pataCanina(destino, r, {
    x, z, atras,
    yMuslo: 0.155, hMuslo: 0.15, rMuslo: 0.045,
    yCana: 0.065, hCana: 0.11, rCana: 0.021,
    yGarra: 0.018, rGarra: 0.024,
    colorMuslo: atras ? BLANCO : CANELA, colorCana: BLANCO, colorGarra: BLANCO,
  });
  // La BANDERA: cola corta ERGUIDA, base negra, punta blanca bien marcada.
  const cp = [];
  const cola = new THREE.CylinderGeometry(0.011, 0.017, 0.17, 6, 2);
  apuntar(cola, [-0.278, 0.44, 0], [-0.33, 0.94, 0]);
  pintarPorVertice(cola, (x, y, z, i, c) => c.copy(y > 0.465 ? cB : cN));
  cp.push(cola);
  const puntaBandera = new THREE.SphereGeometry(0.014, 6, 5);
  poner(puntaBandera, [-0.308, 0.525, 0]);
  cp.push(pintarPlano(puntaBandera, BLANCO));
  // Cuello corto y macizo + collar VERDE del baboso mayor, con su plaquita.
  const cuello = new THREE.CylinderGeometry(0.058, 0.088, 0.14, 9, 2);
  apuntar(cuello, [0.26, 0.36, 0], [0.8, 0.6, 0], [1, 1, 0.85]);
  p.push(pintarPlano(cuello, CANELA));
  const collar = new THREE.TorusGeometry(0.078, 0.014, 7, 14);
  collar.rotateX(Math.PI / 2);
  apuntar(collar, [0.235, 0.345, 0], [0.8, 0.6, 0], [1, 1, 0.88]);
  p.push(pintarPlano(collar, '#3a7d44'));
  const placa = new THREE.SphereGeometry(0.014, 6, 5);
  poner(placa, [0.292, 0.298, 0], [0, 0, 0], [0.8, 1.15, 0.5]);
  p.push(pintarPlano(placa, '#c8963a'));

  const cuerpo = hornearPelaje(fusionar(p, 'perro-beagle'), {
    yBajo: 0.015, yAlto: 0.42, ao: 0.36, moteado: 0.06, semilla: seed,
  });

  // ── CABEZA: cráneo abombado con lista blanca, hocico ancho, ojos dulces,
  //    cejas canela, las OREJOTAS y el jadeo (la lengua va aparte) ──
  const c = [];
  const craneo = new THREE.SphereGeometry(0.082, 11, 9);
  poner(craneo, [0.01, 0.015, 0], [0, 0, -0.06], [1.1, 1.05, 0.9]);
  pintarPorVertice(craneo, (x, y, z, i, cc) => {
    if (Math.abs(z) < 0.016 && x > 0.02) return cc.copy(cB);   // la lista
    return cc.copy(cC);
  });
  c.push(craneo);
  const hocico = new THREE.SphereGeometry(0.05, 9, 7);
  poner(hocico, [0.115, -0.025, 0], [0, 0, -0.15], [1.45, 0.72, 0.85]);
  pintarPorVertice(hocico, (x, y, z, i, cc) => cc.copy(x > 0.14 || y < -0.045 ? cB : cC));
  c.push(hocico);
  const nariz = new THREE.SphereGeometry(0.019, 6, 5);
  poner(nariz, [0.185, -0.012, 0]);
  c.push(pintarPlano(nariz, '#241d18'));
  for (const lado of [1, -1]) {
    const oreja = orejaPetalo([0.015, 0.055, lado * 0.06], [0.1, -0.9, lado * 0.35], 0.175, 0.095, 0.25);
    c.push(pintarPlano(oreja, variar(OREJA, r, 0.05)));
    const ojo = new THREE.SphereGeometry(0.016, 5, 4);
    poner(ojo, [0.075, 0.035, lado * 0.05]);
    c.push(pintarPlano(ojo, '#241709'));
    // Cejas canela del tricolor: los dos puntos que hacen "cara de beagle".
    const ceja = new THREE.SphereGeometry(0.011, 5, 4);
    poner(ceja, [0.062, 0.072, lado * 0.042], [0, 0, 0], [1.2, 0.7, 1]);
    c.push(pintarPlano(ceja, '#7d4a1e'));
  }
  // Boca ABIERTA de jadeo — la lengua va aparte, articulada.
  const boca = new THREE.SphereGeometry(0.03, 8, 6);
  poner(boca, [0.14, -0.052, 0], [0, 0, -0.2], [1.25, 0.5, 0.72]);
  c.push(pintarPlano(boca, '#33201f'));
  const cabezaFusionB = fusionar(c, 'cabeza-perro-beagle');
  // El HOCICO ESCARCHADO: 15 años se llevan con canas. Velo blanco-hueso que
  // sube de la trufa por el puente; lo oscuro (trufa/boca/ojos) se protege
  // por luminancia para que la cara no pierda su dibujo. ANTES del AO.
  {
    const posB = cabezaFusionB.attributes.position;
    const colB = cabezaFusionB.attributes.color;
    const cEscarcha = new THREE.Color('#eae3d3');
    const cTmpB = new THREE.Color();
    for (let vi = 0; vi < posB.count; vi++) {
      cTmpB.fromBufferAttribute(colB, vi);
      if (cTmpB.r + cTmpB.g + cTmpB.b < 0.55) continue;   // trufa/boca/ojos intactos
      const d = Math.hypot(posB.getX(vi) - 0.16, posB.getY(vi) + 0.028, posB.getZ(vi));
      const f = clamp01((0.088 - d) / 0.055) * 0.85;
      if (f <= 0) continue;
      cTmpB.lerp(cEscarcha, f);
      colB.setXYZ(vi, cTmpB.r, cTmpB.g, cTmpB.b);
    }
  }
  const cabeza = hornearPelaje(cabezaFusionB, {
    yBajo: -0.12, yAlto: 0.1, ao: 0.24, moteado: 0.05, semilla: seed + 3,
  });

  const patas = POS_PATAS.map(([px, pz, atras], k) => {
    const pl = [];
    armaPata(pl, 0, 0, atras);
    const geo = hornearPelaje(fusionar(pl, `pata-beagle-${k}`), {
      yBajo: 0.012, yAlto: 0.26, ao: 0.3, moteado: 0.05, semilla: seed + k,
    });
    geo.translate(0, -PIV_PATA, 0);
    return { geom: geo, pivote: [px, PIV_PATA, pz] };
  });
  const colaGeo = hornearPelaje(fusionar(cp, 'cola-beagle'), {
    yBajo: 0.34, yAlto: 0.54, ao: 0.2, moteado: 0.04, semilla: seed + 5,
  });
  colaGeo.translate(0.25, -0.36, 0);   // la raíz de la bandera al origen
  // La LENGUA del baboso, con pivote en la boca: cuelga y se mece.
  const lp = [];
  const lengua1 = new THREE.SphereGeometry(0.036, 8, 6);
  poner(lengua1, [0.04, -0.025, 0], [0.12, 0, -0.5], [1.5, 0.34, 0.55]);
  lp.push(pintarPlano(lengua1, '#d9737f'));
  const lengua2 = new THREE.SphereGeometry(0.017, 6, 5);
  poner(lengua2, [0.085, -0.052, 0], [0, 0, -0.35], [1.05, 0.45, 0.85]);
  lp.push(pintarPlano(lengua2, '#c4606e'));
  const lenguaGeo = fusionar(lp, 'lengua-beagle');
  return {
    cuerpo, cabeza, pivote: [0.34, 0.44, 0],
    patas,
    cola: { geom: colaGeo, pivote: [-0.25, 0.36, 0], eje: 'x' },   // bandera: menea de lado
    lengua: { geom: lenguaGeo, pivote: [0.135, -0.045, 0.006] },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ARMADO — misma interfaz que `armarPerro` de elementos.js: { G, patas, cola,
   cabeza }, para que EL MISMO motor de marcha (trote atado a la distancia,
   husmeo, espera) anime las dos pieles sin duplicar una línea de conducta.
   `altoObjetivo` = la alzada del gemelo low-poly YA anclado: se MIDE con Box3
   («una caja envolvente no miente») y se escala para calzar exacto — así el
   cambio de piel jamás cambia el tamaño del perro.
   ═══════════════════════════════════════════════════════════════════════════ */
const _matRealista = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
// ⚠️ SIN flatShading: las normales suaves preservadas en la fusión son la
// mitad del realismo; flatShading las pisa y devuelve el poliedro.

export function armarPerroRealista(P, altoObjetivo) {
  const d = P.raza === 'dalmata' ? perroDalmata(1, 51) : perroBeagle(1, 51);
  const G = new THREE.Group();
  G.add(new THREE.Mesh(d.cuerpo, _matRealista));
  const cabeza = new THREE.Mesh(d.cabeza, _matRealista);
  cabeza.position.set(d.pivote[0], d.pivote[1], d.pivote[2]);
  G.add(cabeza);
  let lengua = null;
  if (d.lengua) {
    lengua = new THREE.Mesh(d.lengua.geom, _matRealista);
    lengua.position.set(d.lengua.pivote[0], d.lengua.pivote[1], d.lengua.pivote[2]);
    cabeza.add(lengua);
  }
  const patas = d.patas.map(({ geom, pivote }) => {
    const m = new THREE.Mesh(geom, _matRealista);
    m.position.set(pivote[0], pivote[1], pivote[2]);
    G.add(m);
    return m;
  });
  const cola = new THREE.Mesh(d.cola.geom, _matRealista);
  cola.position.set(d.cola.pivote[0], d.cola.pivote[1], d.cola.pivote[2]);
  G.add(cola);
  // el alto REAL se MIDE, no se estima — y la escala calza la alzada objetivo.
  const caja = new THREE.Box3().setFromObject(G);
  const altoNatural = Math.max(caja.max.y - caja.min.y, 0.001);
  const escBase = altoObjetivo / altoNatural;
  G.scale.setScalar(escBase);
  return { G, patas, cola, cabeza, lengua, escBase, ejeCola: d.cola.eje };
}
