// ── mar-biodiversidad.js — arte REAL para el mar (regla dura: CERO low-poly) ─
// El primer pase del mar marcaba la pista con Icosahedron(1,0) + flatShading
// (rocas facetadas), conos de 5 lados (corales) y rectángulos pelados (algas).
// Eso viola la regla del operador: los elementos parecen de juguete pobre, no
// seres/piedras reales. Este módulo los reemplaza con la MISMA doctrina del
// valle (lib3d):
//   · ROCAS: icosaedro subdividido (det 3) esculpido con fbm, normales SUAVES,
//     colores por vértice (piedra seca arriba, franja mojada en la línea de
//     agua, costra de alga donde el ruido acumula) — la receta de las rocas
//     húmedas del páramo, llevada al arrecife.
//   · CORALES: cabezas tipo coral masivo (esfera esculpida con ruido rugoso de
//     alta frecuencia, aplastada) y colonias RAMOSAS (tubos curvos fusionados),
//     ambos suaves — nada de conos contables.
//   · ALGAS (kelp): hoja dibujada en canvas (lámina con nervadura central y
//     borde ondulado con alpha) sobre planos cruzados — el follaje se lee como
//     MASA orgánica, no como rectángulo (regla follaje=MASA de FollajeMasa.js).
//   · ISLAS: domo de arena/verde esculpido con fbm + troncos reales inclinados
//     + UNA copa masa (lib3d/FollajeMasa) con lóbulos repartidos entre los
//     árboles: 4 draw calls por isla, follaje = MASA con viento del valle.
// Todo determinista por seed (el gate visual compara) y fusionado/instanciado
// (doctrina móvil Mali-G78: pocos draw calls).

import { crearCopaMasa, texturaFollaje } from '../../../lib3d/flora/FollajeMasa.js';
import { aplicarVientoMundo } from '../../../lib3d/flora/vientoMundos.js';

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ruido barato 3D-ish (2 capas 2D cruzadas): suficiente para esculpir piedra
function hash2(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, oct = 4) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, z * f); norm += amp; amp *= 0.5; f *= 2.03; }
  return s / norm;
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }

// fusiona geometrías con position/normal/color (lo que usa este módulo).
// Las indexadas se expanden primero: concatenar posiciones crudas ignorando el
// índice rompería la conectividad de los triángulos.
export function fusionarConColor(THREE, geosIn) {
  const geos = geosIn.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = geos.reduce((acc, g) => acc + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let off = 0;
  for (const g of geos) {
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, off * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, off * 3);
    if (g.attributes.color) col.set(g.attributes.color.array, off * 3);
    else col.fill(1, off * 3, (off + cnt) * 3);
    off += cnt;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  return geo;
}

// ═══ ROCA MARINA (reemplazo de Icosahedron(1,0) facetado) ════════════════════
// Icosaedro det 3 (642 vértices) esculpido con dos octavas de fbm — la silueta
// es irregular pero las normales son SUAVES: piedra desgastada por el mar, no
// cristal low-poly. Colores por vértice: piedra gris-parda con variación, la
// franja de la línea de agua OSCURA (piedra mojada) y parches de alga verde
// donde el ruido lo pide. Pensada para InstancedMesh (2-3 variantes bastan).
export function geoRocaMarina(THREE, seed = 1) {
  const rn = rand(seed * 7919 + 5);
  const off1 = rn() * 90, off2 = rn() * 90;
  // base ESFERA (indexada, vértices compartidos): computeVertexNormals da
  // normales SUAVES de verdad. Un icosaedro de three es non-indexed y sus
  // normales recalculadas salen planas — o sea, otra vez low-poly. No.
  const geo = new THREE.SphereGeometry(1, 22, 16);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  // esculpido: fbm gordo (forma) + fbm fino (grano)
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const forma = fbm(n.x * 1.9 + off1, n.z * 1.9 + n.y * 1.3 + off1, 3) - 0.5;
    const grano = fbm(n.x * 5.2 + off2, n.z * 5.2 + n.y * 3.7 + off2, 3) - 0.5;
    const r = 1 + forma * 0.62 + grano * 0.16;
    v.copy(n).multiplyScalar(r);
    p.setXYZ(i, v.x, v.y * 0.74, v.z);
  }
  geo.computeVertexNormals();  // ← suaves (base indexada): aquí muere el low-poly
  // colores por vértice
  const col = new Float32Array(p.count * 3);
  const cPiedra = new THREE.Color(0x6e6a5e);
  const cPiedra2 = new THREE.Color(0x8a8274);
  const cMojada = new THREE.Color(0x3c443f);
  const cAlga = new THREE.Color(0x44603e);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const t = fbm(v.x * 3.1 + off1, v.z * 3.1 + v.y * 2.2 + off2, 3);
    c.copy(cPiedra).lerp(cPiedra2, t);
    // franja mojada: alrededor de la línea de agua (y≈0 del instance, la roca
    // se posa con ~1/3 hundido — ver colocación en entorno-mar)
    const franja = 1 - clamp(Math.abs(v.y * 0.74 + 0.05) / 0.34, 0, 1);
    c.lerp(cMojada, franja * 0.75);
    // costra de alga donde el ruido acumula, solo cerca del agua
    if (t > 0.62 && v.y < 0.35) c.lerp(cAlga, 0.55);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export function materialRoca(THREE) {
  return new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.97, metalness: 0.02,
  });
}

// ═══ CORAL CABEZA (reemplazo del ConeGeometry de 5 lados) ════════════════════
// Coral masivo tipo lobo/cerebro: esfera 24×18 esculpida con ruido rugoso de
// alta frecuencia (los surcos), aplastada. El color body lo pone instanceColor
// (paleta cálida real de arrecife); el vértice solo aporta oclusión abajo y
// crestas claras arriba (multiplican bien con el tinte).
export function geoCoralCabeza(THREE, seed = 2) {
  const rn = rand(seed * 6271 + 11);
  const off = rn() * 70;
  const geo = new THREE.SphereGeometry(1, 24, 18);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const surcos = fbm(n.x * 6.5 + off, n.z * 6.5 + n.y * 5.0 + off, 4) - 0.5;
    const bulto = fbm(n.x * 2.0 + off, n.z * 2.0 + n.y * 1.4, 3) - 0.5;
    const r = 1 + bulto * 0.28 + surcos * 0.16;
    v.copy(n).multiplyScalar(r);
    p.setXYZ(i, v.x, Math.max(v.y * 0.62, -0.18), v.z);
  }
  geo.computeVertexNormals();
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // oclusión hacia abajo + cresta clara arriba (multiplica al instanceColor)
    const luz = clamp(0.62 + v.y * 0.55, 0.42, 1.18);
    col[i * 3] = luz; col[i * 3 + 1] = luz; col[i * 3 + 2] = luz;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Colonia ramosa (tipo cuerno de alce/candelabro): tubos curvos fusionados con
// puntas más claras. Suave, orgánico, sin facetas contables.
export function geoCoralRamas(THREE, seed = 3) {
  const rn = rand(seed * 4409 + 23);
  const geos = [];
  const nRamas = 8 + Math.floor(rn() * 4);
  const _m = new THREE.Matrix4();
  for (let b = 0; b < nRamas; b++) {
    const ang = (b / nRamas) * Math.PI * 2 + rn() * 0.5;
    const inclin = 0.35 + rn() * 0.55;          // qué tanto se abre del centro
    const len = 0.55 + rn() * 0.5;
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(ang) * inclin * len * 0.5, len * 0.55, Math.sin(ang) * inclin * len * 0.5),
      new THREE.Vector3(
        Math.cos(ang + rn() * 0.4) * inclin * len,
        len * (0.9 + rn() * 0.25),
        Math.sin(ang + rn() * 0.4) * inclin * len,
      ),
    ]);
    const tubo = new THREE.TubeGeometry(curva, 5, 0.055 + rn() * 0.03, 7, false);
    // punta clara: color por vértice según el avance a lo largo del tubo
    const p = tubo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const filas = 6;                             // tubularSegments + 1
    const porFila = p.count / filas;
    for (let i = 0; i < p.count; i++) {
      const t = Math.floor(i / porFila) / (filas - 1);
      const luz = 0.72 + t * 0.55;               // multiplicará el instanceColor
      col[i * 3] = luz; col[i * 3 + 1] = luz; col[i * 3 + 2] = luz;
    }
    tubo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    _m.makeTranslation((rn() - 0.5) * 0.2, 0, (rn() - 0.5) * 0.2);
    tubo.applyMatrix4(_m);
    geos.push(tubo);
  }
  return fusionarConColor(THREE, geos);
}

export function materialCoral(THREE) {
  return new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.82, metalness: 0.0,
  });
}

// ═══ ALGA / KELP con lámina dibujada (reemplazo del rectángulo pelado) ═══════
// Una hoja de kelp REAL es una cinta con nervadura y borde ondulado. Se dibuja
// en canvas con alpha (misma doctrina que texturaFollaje: el borde se rompe
// orgánico) y se monta en DOS planos cruzados: desde cualquier ángulo se lee
// masa de alga, no un cartón.
export function texturaKelp(THREE, seed = 9) {
  const rn = rand(seed * 331 + 7);
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 512;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, 128, 128 * 4);
  const cx = 64;
  // lámina: silueta ondulada (bordes con senos de fases distintas)
  ctx.beginPath();
  ctx.moveTo(cx, 512);
  const nP = 26;
  for (let i = 0; i <= nP; i++) {
    const t = i / nP;
    const y = 512 - t * 500;
    const semiAncho = (10 + 46 * Math.sin(Math.PI * Math.min(1, t * 1.25)))
      * (1 - t * 0.25);
    const ond = Math.sin(t * 21 + rn() * 6) * 7 + Math.sin(t * 47 + rn() * 6) * 3.5;
    ctx.lineTo(cx + semiAncho + ond, y);
  }
  for (let i = nP; i >= 0; i--) {
    const t = i / nP;
    const y = 512 - t * 500;
    const semiAncho = (10 + 46 * Math.sin(Math.PI * Math.min(1, t * 1.25)))
      * (1 - t * 0.25);
    const ond = Math.sin(t * 19 + 2.2 + rn() * 6) * 7 + Math.sin(t * 41 + 1.1) * 3.5;
    ctx.lineTo(cx - semiAncho + ond, y);
  }
  ctx.closePath();
  // verdes oliva CLAROS: contra el agua brillante un kelp oscuro se lee como
  // pincho negro low-poly a media distancia (visto en el gate) — no.
  const grad = ctx.createLinearGradient(0, 512, 0, 0);
  grad.addColorStop(0, '#33552c');
  grad.addColorStop(0.5, '#4b7238');
  grad.addColorStop(1, '#6d9448');
  ctx.fillStyle = grad;
  ctx.fill();
  // nervadura central + venas laterales tenues
  ctx.strokeStyle = 'rgba(150,180,100,0.6)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(cx, 508); ctx.lineTo(cx, 24); ctx.stroke();
  ctx.strokeStyle = 'rgba(20,40,22,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = 480 - i * 33;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.quadraticCurveTo(cx + 26, y - 8, cx + 44, y - 22);
    ctx.moveTo(cx, y - 16);
    ctx.quadraticCurveTo(cx - 26, y - 22, cx - 44, y - 36);
    ctx.stroke();
  }
  // mordiscos/huecos (los peces comen): rompen la silueta interior
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(cx + (rn() - 0.5) * 70, 60 + rn() * 400, 3 + rn() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

// dos planos cruzados con la lámina; base en y=0, listo para el sway shader
export function geoKelpCruzada(THREE) {
  const geos = [];
  for (const rot of [0, Math.PI / 2]) {
    const pl = new THREE.PlaneGeometry(1.15, 3.1, 1, 6);
    pl.translate(0, 1.55, 0);
    pl.rotateY(rot);
    geos.push(pl);
  }
  // merge conservando uv (los dos planos comparten el mismo mapa)
  const total = geos.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const idx = [];
  let off = 0;
  for (const g of geos) {
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, off * 3);
    nor.set(g.attributes.normal.array, off * 3);
    uv.set(g.attributes.uv.array, off * 2);
    const ia = g.index.array;
    for (let i = 0; i < ia.length; i++) idx.push(ia[i] + off);
    off += cnt;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

// ═══ ISLA con arte real (domo esculpido + troncos + copa MASA de lib3d) ══════
// 4 draw calls por isla: domo(1) + troncos fusionados(1) + copa masa(2:
// núcleo+cards). El follaje es la MISMA técnica del valle (FollajeMasa) y se
// mece con el viento coherente de mundos (vientoMundos.js).
let _texIsla = null;
export function crearIsla(THREE, opts = {}) {
  const seed = opts.seed ?? 41;
  const radio = opts.radio ?? 11;
  const alto = opts.alto ?? radio * 0.42;
  const nArb = opts.arboles ?? (radio > 12 ? 3 : 2);
  const rn = rand(seed * 104729 + 17);
  const off = rn() * 120;
  const g = new THREE.Group();

  // ── domo: media esfera esculpida, colores arena→pasto por altura ─────────
  const domo = new THREE.SphereGeometry(1, 30, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const p = domo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const relieve = fbm(n.x * 2.3 + off, n.z * 2.3 + n.y * 1.1 + off, 4) - 0.5;
    const r = 1 + relieve * 0.34 * (0.4 + 0.6 * (1 - Math.abs(n.y)));
    p.setXYZ(i, n.x * r * radio, n.y * r * alto, n.z * r * radio);
  }
  domo.computeVertexNormals();
  const col = new Float32Array(p.count * 3);
  const cArena = new THREE.Color(0xd9c58f);
  const cArenaMojada = new THREE.Color(0xa89467);
  const cPastoSeco = new THREE.Color(0x9aa15c);
  const cPasto = new THREE.Color(0x4e7f3b);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const h = v.y / alto;                     // 0 en la orilla, 1 en la cima
    const moteo = (fbm(v.x * 0.5 + off, v.z * 0.5 + off, 3) - 0.5) * 0.22;
    if (h < 0.10) c.copy(cArenaMojada).lerp(cArena, clamp(h / 0.10, 0, 1));
    else if (h < 0.30) c.copy(cArena).lerp(cPastoSeco, clamp((h - 0.10) / 0.20 + moteo, 0, 1));
    else c.copy(cPastoSeco).lerp(cPasto, clamp((h - 0.30) / 0.35 + moteo, 0, 1));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  domo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const meshDomo = new THREE.Mesh(domo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.96, metalness: 0.0,
  }));
  meshDomo.position.y = -alto * 0.32;          // un tercio hundido: playa real
  g.add(meshDomo);

  // ── árboles: troncos reales (inclinados, con base más gorda) fusionados ──
  const geosTronco = [];
  const esferas = [];
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  for (let a = 0; a < nArb; a++) {
    const ang = (a / nArb) * Math.PI * 2 + rn() * 1.2;
    const d = radio * (0.16 + rn() * 0.3);
    const bx = Math.cos(ang) * d, bz = Math.sin(ang) * d;
    // altura del domo en la base del árbol (esfera escalada, menos el hundido);
    // 0.88 tolera los valles del fbm — mejor tronco un pelo enterrado que flotando
    const hBase = alto * Math.sqrt(Math.max(0, 1 - (d / radio) * (d / radio))) * 0.88 - alto * 0.32;
    const hTronco = 3.2 + rn() * 2.4;
    const lean = (rn() - 0.5) * 0.5;           // el viento del mar los peina
    const leanDir = rn() * Math.PI * 2;
    const tronco = new THREE.CylinderGeometry(0.14, 0.24, hTronco, 9, 3);
    // color corteza por vértice (variación vertical)
    const tp = tronco.attributes.position;
    const tcol = new Float32Array(tp.count * 3);
    const cCorteza = new THREE.Color(0x6e5238);
    const cCorteza2 = new THREE.Color(0x8a6a48);
    for (let i = 0; i < tp.count; i++) {
      const ty = tp.getY(i) / hTronco + 0.5;
      c.copy(cCorteza).lerp(cCorteza2, ty * 0.6 + (rn() - 0.5) * 0.15);
      tcol[i * 3] = c.r; tcol[i * 3 + 1] = c.g; tcol[i * 3 + 2] = c.b;
    }
    tronco.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
    _q.setFromEuler(_e.set(Math.cos(leanDir) * lean, 0, Math.sin(leanDir) * lean));
    _m.compose(
      new THREE.Vector3(bx, hBase + hTronco * 0.48, bz),
      _q,
      new THREE.Vector3(1, 1, 1),
    );
    tronco.applyMatrix4(_m);
    geosTronco.push(tronco);
    // lóbulos de copa para ESTE árbol (la copa masa es UNA para toda la isla)
    const cx = bx + Math.sin(leanDir) * lean * hTronco * 0.5;
    const cz = bz + Math.cos(leanDir) * lean * hTronco * 0.5;
    const cy = hBase + hTronco * (0.92 + rn() * 0.1);
    esferas.push(
      { c: [cx, cy, cz], r: 1.5 + rn() * 0.7, esc: [1.25, 0.8, 1.25] },
      { c: [cx + 0.8, cy - 0.4, cz + 0.3], r: 1.0 + rn() * 0.4, esc: [1.0, 0.75, 1.0] },
      { c: [cx - 0.7, cy - 0.3, cz - 0.4], r: 0.9 + rn() * 0.4, esc: [1.0, 0.7, 1.0] },
    );
  }
  const troncos = new THREE.Mesh(fusionarConColor(THREE, geosTronco), new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0.0,
  }));
  g.add(troncos);

  // ── copa MASA (lib3d): follaje denso ilustrado, jamás hojas contables ────
  if (!_texIsla) {
    _texIsla = texturaFollaje(THREE, {
      seed: 77, oscuro: '#274a28', medio: '#3f6b35', claro: '#7fae4e', hojas: 360,
    });
  }
  const copa = crearCopaMasa(THREE, {
    seed: 5000 + seed, tex: _texIsla, esferas, maxCards: 300, brillo: 0.1,
  });
  aplicarVientoMundo(copa.matCards, { amplitud: 0.14, piso: 2.2, velocidad: 1.15 });
  aplicarVientoMundo(copa.matNucleo, { amplitud: 0.09, piso: 2.2, velocidad: 1.05 });
  g.add(copa.grupo);

  return { grupo: g, radio, alto };
}
