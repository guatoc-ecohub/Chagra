// ── cafetal.js — EL CAFETAL DE SOMBRA, LADERA DEL PISO TEMPLADO ──────────────
//
// Modo `?mundo=cafetal`. No es un mojón del valle: es ENTRAR al cafetal de la
// finca andina y caminarlo por dentro, en el piso TEMPLADO (1000–2000 msnm,
// 18–22 °C) donde de verdad vive el café colombiano. Archivo NUEVO y AUTÓNOMO,
// Three.js vanilla — monta su propio canvas/renderer/loop y SUPRIME el valle
// (main.js corre detrás y lo apagamos): no pelean dos renders. Su único enganche
// con main.js es el bloque marcado `// ── CAFETAL ──`. Dialoga igual que
// bosque.js y abejas.js: mismo DEM/Humboldt/Ghibli, low-poly entintado.
//
// GROUNDING — chagra/src/data/cafeFinca.js (Cenicafé, FNC, AGROSAVIA):
//   · EL CAFÉ VIVE DEBAJO. No a pleno rayo: bajo un TECHO de árboles altos que lo
//     cuidan (café de sombra = café con vida, no potrero de sol). Ese techo es el
//     GUAMO (Inga, sombra que abona, fija nitrógeno, hojarasca constante) con
//     ALISO (Alnus acuminata, el maestro de tierra fría-templada que también fija
//     N) y NOGAL cafetero (Cordia alliodora, sombra alta y rala) — el compatible_with
//     del grafo. Entre las matas, el PLÁTANO hace sombra temporal los primeros años.
//   · EL CAFETO: arbusto de RAMAS HORIZONTALES en pisos (candelabro). Por su régimen
//     bimodal, en la MISMA mata hay a la vez FLOR blanca, grano VERDE y CEREZA roja
//     madura — se cosecha grano a grano, sólo el maduro (recolección selectiva).
//   · EL GRANO EN TRES ESTADOS, sin tostar en la finca: cereza (rojo) → pergamino
//     (grano seco en su cascarilla) → oro (verde ya trillado, listo para vender).
//   · LAS SEÑALES, sin drama: la ROYA (Hemileia vastatrix, polvo naranja bajo la
//     hoja) y la BROCA (Hypothenemus hampei) — se manejan con criterio (RE-RE,
//     variedad resistente, Beauveria), no con recetas de veneno.
//   · EL BENEFICIADERO: despulpar → fermentar en tanque → lavar → secar al sol en
//     la MARQUESINA/pasera. El paso del fruto rojo al grano vendible. Y la PULPA
//     no es basura: compostada vuelve al cafetal como abono (cierra el ciclo).
//
// LAS CUATRO MIRADAS (encargo del operador):
//   · Peter Jackson — el cafetal ÉPICO y HABITADO: el guamo monumental haciendo
//     techo, las hileras de café bajando la ladera a curva de nivel hasta perderse
//     en la bruma, el beneficiadero como lugar vivido, el Ent-aliso al fondo.
//   · Nolan / Interstellar — LA IMAGEN QUE SE QUEDA: la luz DAPLEADA que se cuela
//     por la copa del guamo y cae en manchas cálidas sobre las hileras (la luz
//     propia del café de sombra, no el rayo quemante del potrero).
//   · Zelda BOTW / Odyssey — color vibrante y ganas de recorrer: la CEREZA ROJA
//     que salta contra el verde, las hojas paleta del plátano, el grano tendido al
//     sol en la marquesina, los colibríes que trae la sombra.
//   · agroecólogo — la FIDELIDAD es el efecto especial: se lee "el café vive
//     debajo" (dosel arriba, matas abajo), las hileras van a curva de nivel, el
//     cafeto tiene ramas horizontales con flor+verde+rojo a la vez, el grano en sus
//     tres estados, la roya señalada, el beneficio completo. Cada arquetipo se lee
//     por su SILUETA a 30 m (el guamo una sombrilla ancha, el aliso una columna,
//     el plátano un surtidor de hojas, el cafeto un candelabro con puntos rojos).
//   · diseñador instruccional — la niña (11) y el campesino, EN USTED: la leyenda
//     del café de sombra y el letrero del Ent-aliso enseñan sin gamificar.
//
// LEY DE LA CASA: TODO anclado al suelo con `alturaCafetal(x,z)` — cero flotando.
// La fusión de mallas evita el bug clásico de `mergeGeometries` (mezclar
// indexadas con no-indexadas devuelve NULL en silencio): aquí todo se desindexa
// antes y sólo viajan position + color; la normal se recalcula.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// ez-tree: los árboles de SOMBRA del cafetal (guamo/aliso/nogal cafetero) se
// hornean a la silueta ez-tree ramificada VIVA de la especie real, en vez del
// parasol disco/palo que denunció la auditoría (cafetal 3/10). 1 InstancedMesh
// por arquetipo, sin subir draw calls.
import { bakearArquetipoFusion } from './flora-eztree-bake.js';

// ── PALETA MADRE (los colores del cafetal templado a la hora dorada) ──────────
const C = {
  // verdes del piso templado (más cálidos y encendidos que el bosque de niebla)
  cafeHoja: '#356e34', cafeHojaLustro: '#458040', cafeHojaJoven: '#6aa049',
  guamo: '#4a7d38', guamoClaro: '#6c9c48', nogal: '#5c8244', aliso: '#63924f', alisoClaro: '#9ab97a',
  platano: '#4f8a38', platanoNervio: '#8fb84f', platanoSeco: '#b7a24a',
  // cortezas por especie
  cortezaCafe: '#5a4433', cortezaGuamo: '#7f6a50', cortezaAliso: '#bcb6a3', cortezaNogal: '#6e5a44',
  maderaBenef: '#8a6a45', maderaClara: '#c7ad7c', maderaVieja: '#6e4f30',
  // tierra cafetera roja andina + hojarasca
  tierra: '#8c5a3a', tierraSombra: '#6c4830', tierraRoja: '#9c5330', hojarasca: '#7d6038', mantillo: '#664e2f',
  // LOS ACENTOS QUE GRITAN (los frutos y la flor: el pop de Zelda)
  cereza: '#c92c1d', cerezaMadura: '#a71c12', cerezaPinton: '#dc8a29', bayaVerde: '#5f8f38',
  flor: '#f4f0e6', florCentro: '#efe4b6',
  // el grano en sus tres estados
  pergamino: '#d9c89b', oro: '#9cae58', cerezaSeca: '#6e3a2a',
  // las señales
  roya: '#d98a2e', royaClaro: '#e8b45a',
  // beneficio
  concreto: '#9a958a', agua: '#5f86a0', zinc: '#aab2b4', teja: '#9a5236', costal: '#cab587', costalCafe: '#b79b64',
  // cielo templado / niebla cálida / sol de la hora dorada
  cieloCenit: '#a7c4d4', cieloMedio: '#cdd6c8', cieloHorizonte: '#ecdfc0', nieblaCalida: '#e0e4d0', sol: '#ffe6bd',
  hongoCrema: '#e8dcb8',
};
const col = (h) => new THREE.Color(h);
const mezcla = (a, b, t) => col(a).lerp(col(b), t);
const rand = (a, b) => a + Math.random() * (b - a);

// ── PRNG determinista (mismo cafetal cada carga: el gate compara) ─────────────
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── EL RELIEVE DE LA LADERA CAFETERA (el cafetal ES ladera) ───────────────────
// value-noise + fbm barato, sin cargar nada. La ladera SUBE hacia el fondo (-Z):
// el cafetal trepa por el flanco templado. `alturaCafetal` es la ÚNICA verdad del
// suelo — todo lo demás se ancla a ella. Un BANCAL plano al oriente sostiene el
// beneficiadero (para que la marquesina no baile sobre el relieve).
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
function fbm(x, z) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < 4; i++) { s += amp * vnoise(x * f, z * f); norm += amp; amp *= 0.5; f *= 2.05; }
  return s / norm;
}
// el bancal del beneficiadero: explanada plana al oriente-cerca del usuario
const BANCAL = { x: 62, z: 44, r: 26 };
function gauss(x, z, cx, cz, s) { const dx = x - cx, dz = z - cz; return Math.exp(-(dx * dx + dz * dz) / (2 * s * s)); }
function alturaCafetal(x, z) {
  const pend = -z * 0.11;                              // sube hacia -Z (al monte)
  const ond = (fbm(x * 0.011 + 30, z * 0.011 - 15) - 0.5) * 20;
  const micro = (fbm(x * 0.055, z * 0.055) - 0.5) * 3.4;
  let y = pend + ond + micro;
  // el bancal aplana su vecindad para el beneficiadero
  const plano = gauss(x, z, BANCAL.x, BANCAL.z, 15);
  const yBancal = -BANCAL.z * 0.11 + 1.2;
  y = y * (1 - plano * 0.92) + yBancal * (plano * 0.92);
  return y;
}

// ── TALLER DE MALLAS ──────────────────────────────────────────────────────────
// pieza(geo, color) → hornea el color por vértice; poner() la coloca; fusionar()
// une una lista en UNA geometría (desindexada, position+color, normal recalculada
// — nunca `mergeGeometries` a pelo: devuelve null en silencio y la planta no sale).
function pintar(g, color) {
  const gg = g.index ? g.toNonIndexed() : g;
  const n = gg.attributes.position.count, arr = new Float32Array(n * 3);
  const c = col(color);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  gg.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return gg;
}
function poner(g, [x, y, z], rot, esc) {
  if (esc) g.scale(esc[0], esc[1], esc[2]);
  if (rot) { if (rot[0]) g.rotateX(rot[0]); if (rot[1]) g.rotateY(rot[1]); if (rot[2]) g.rotateZ(rot[2]); }
  g.translate(x, y, z);
  return g;
}
const pieza = (geo, color, pos = [0, 0, 0], rot, esc) => pintar(poner(geo, pos, rot, esc), color);
function fusionar(lista) {
  const gs = lista.map((x) => (x.index ? x.toNonIndexed() : x));
  let n = 0;
  for (const g of gs) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), colr = new Float32Array(n * 3);
  let o = 0;
  for (const g of gs) {
    const P = g.attributes.position.array, Cc = g.attributes.color ? g.attributes.color.array : null;
    for (let i = 0; i < g.attributes.position.count; i++) {
      pos[(o + i) * 3] = P[i * 3]; pos[(o + i) * 3 + 1] = P[i * 3 + 1]; pos[(o + i) * 3 + 2] = P[i * 3 + 2];
      if (Cc) { colr[(o + i) * 3] = Cc[i * 3]; colr[(o + i) * 3 + 1] = Cc[i * 3 + 1]; colr[(o + i) * 3 + 2] = Cc[i * 3 + 2]; }
      else { colr[(o + i) * 3] = colr[(o + i) * 3 + 1] = colr[(o + i) * 3 + 2] = 1; }
    }
    o += g.attributes.position.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  out.computeVertexNormals(); out.computeBoundingSphere();
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOS ARQUETIPOS, POR SU SILUETA (cada uno se lee a 30 m)
//  El dosel de sombra arriba (guamo/aliso/nogal), el plátano entremedio, y las
//  matas de café abajo. Devuelven UNA geometría fusionada, lista para instanciar.
// ═══════════════════════════════════════════════════════════════════════════

// DOSEL · GUAMO (Inga): la SOMBRILLA ANCHA del cafetal. Tronco recto + copa
// aplanada y aireada que se abre en paraguas, con las VAINAS largas colgando
// (la firma del guamo). Es el techo dominante: "el café vive debajo".
function geomGuamo(seed = 1) {
  const r = prng(seed), p = [];
  const H = 9 + r() * 3;
  p.push(pieza(new THREE.CylinderGeometry(0.32, 0.55, H, 7), C.cortezaGuamo, [0, H / 2, 0]));
  // el guamo ramifica BAJO y abre las varas del paraguas casi horizontales: la
  // firma del sombrío. Ramas largas que sostienen el borde de la sombrilla.
  const NB = 7;
  for (let i = 0; i < NB; i++) {
    const a = (i / NB) * Math.PI * 2 + r() * 0.5;
    p.push(pieza(new THREE.CylinderGeometry(0.08, 0.22, 5.4, 5), C.cortezaGuamo,
      [Math.cos(a) * 0.9, H * (0.82 + r() * 0.06), Math.sin(a) * 0.9], [0, -a, -1.34]));
  }
  // COPA APARASOLADA (Inga): NO una esfera — un DOMO ancho de fondo plano (la
  // tapa del paraguas) + un anillo de lóbulos aplanados en el borde, sobre las
  // puntas de las varas. Ancha, baja, aireada: se lee "sombrilla" a 30 m y deja
  // colar la luz dapleada.
  const cop = mezcla(C.guamo, C.guamoClaro, 0.4).getStyle();
  // domo-tapa: media esfera (fondo plano) muy ancha y baja
  p.push(pieza(new THREE.SphereGeometry(4.2, 11, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
    cop, [0, H + 0.5, 0], null, [1.55, 0.62, 1.55]));
  // anillo de lóbulos en el PERÍMETRO (las puntas del paraguas): aplanados y
  // extendidos horizontal, rompen el contorno para que no sea un disco liso
  const NL = 10;
  for (let i = 0; i < NL; i++) {
    const a = (i / NL) * Math.PI * 2 + r() * 0.35;
    const d = 5.6 + r() * 1.5;
    p.push(pieza(new THREE.IcosahedronGeometry(1.8 + r() * 0.7, 1), mezcla(C.guamo, C.guamoClaro, 0.15 + r() * 0.45).getStyle(),
      [Math.cos(a) * d, H + 0.2 + (r() - 0.5) * 0.9, Math.sin(a) * d], null, [1.3, 0.5, 1.3]));
  }
  // anillo intermedio (llena el paraguas sin cerrarlo — sombra aireada)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    const d = 3.1 + r() * 1.2;
    p.push(pieza(new THREE.IcosahedronGeometry(1.5 + r() * 0.5, 0), mezcla(C.guamo, C.guamoClaro, 0.25 + r() * 0.3).getStyle(),
      [Math.cos(a) * d, H + 0.95 + (r() - 0.5) * 0.6, Math.sin(a) * d], null, [1.2, 0.5, 1.2]));
  }
  // LAS VAINAS del guamo (largas, planas, colgando de la copa)
  const rv = prng(seed + 50);
  for (let i = 0; i < 9; i++) {
    const a = rv() * Math.PI * 2, d = 1.6 + rv() * 2.4;
    const vaina = new THREE.CylinderGeometry(0.05, 0.05, 1.4 + rv() * 0.9, 4);
    p.push(pieza(vaina, mezcla(C.platanoSeco, C.guamo, 0.3).getStyle(),
      [Math.cos(a) * d, H + 0.3 - (0.7 + rv() * 0.5), Math.sin(a) * d], [0.15, 0, 0.05], [1, 1, 0.35]));
  }
  return fusionar(p);
}

// DOSEL · ALISO (Alnus acuminata): columna alta de corteza PÁLIDA con copa
// redonda-cónica más apretada. El maestro del piso templado-frío que también
// fija nitrógeno; aquí el arquetipo del dosel, y el Ent es uno grande.
function geomAliso(seed = 2) {
  const r = prng(seed), p = [];
  const H = 11 + r() * 3;
  p.push(pieza(new THREE.CylinderGeometry(0.3, 0.5, H, 7), C.cortezaAliso, [0, H / 2, 0]));
  const cop = mezcla(C.aliso, C.alisoClaro, 0.3).getStyle();
  p.push(pieza(new THREE.IcosahedronGeometry(3.0, 1), cop, [0, H + 1.6, 0], null, [1, 1.3, 1]));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + r();
    p.push(pieza(new THREE.IcosahedronGeometry(1.7 + r() * 0.6, 0), mezcla(C.aliso, C.guamo, 0.3).getStyle(),
      [Math.cos(a) * 1.9, H + 0.8 + r() * 1.4, Math.sin(a) * 1.9], null, [1, 1.1, 1]));
  }
  return fusionar(p);
}

// DOSEL · NOGAL CAFETERO (Cordia alliodora): tronco alto y limpio + copa ALTA y
// RALA (deja pasar mucha luz). Se lee por el fuste largo y la coronita chica.
function geomNogal(seed = 3) {
  const r = prng(seed), p = [];
  const H = 12 + r() * 3.5;
  p.push(pieza(new THREE.CylinderGeometry(0.24, 0.42, H, 6), C.cortezaNogal, [0, H / 2, 0]));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r();
    p.push(pieza(new THREE.CylinderGeometry(0.08, 0.16, 2.6, 4), C.cortezaNogal,
      [Math.cos(a) * 0.7, H * 0.82, Math.sin(a) * 0.7], [0, -a, -0.7]));
  }
  const cop = mezcla(C.nogal, C.guamoClaro, 0.3).getStyle();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + r();
    p.push(pieza(new THREE.IcosahedronGeometry(1.4 + r() * 0.6, 0), cop,
      [Math.cos(a) * 1.6, H + 0.6 + r(), Math.sin(a) * 1.6], null, [1.1, 0.7, 1.1]));
  }
  return fusionar(p);
}

// SOMBRA TEMPORAL · PLÁTANO (Musa): pseudotallo + SURTIDOR de hojas paleta
// grandes que se arquean, con una nervadura central clara. La compañía de los
// primeros años del cafetal.
function geomPlatano(seed = 4) {
  const r = prng(seed), p = [];
  const H = 3.0 + r() * 1.2;
  p.push(pieza(new THREE.CylinderGeometry(0.16, 0.26, H, 7), mezcla(C.platano, C.platanoSeco, 0.25).getStyle(), [0, H / 2, 0]));
  // las hojas paleta radiales (planos anchos arqueados)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.4;
    const larga = 2.4 + r() * 1.0;
    const hoja = new THREE.PlaneGeometry(0.95, larga, 1, 3);
    const tinte = r() > 0.8 ? C.platanoSeco : mezcla(C.platano, C.platanoNervio, r() * 0.4).getStyle();
    p.push(pieza(hoja, tinte, [Math.cos(a) * 0.5, H + larga * 0.35, Math.sin(a) * 0.5],
      [-0.9 + r() * 0.2, -a, 0]));
  }
  return fusionar(p);
}

// EL CAFETO: arbusto de RAMAS HORIZONTALES en pisos (el candelabro del café).
// Tallo vertical + 3–4 pisos de ramas horizontales; en cada rama, hojas y
// RACIMOS de cereza roja en los nudos. Por el régimen bimodal, la misma mata
// lleva a la vez FLOR blanca, grano VERDE y cereza ROJA. `roya` pinta la mancha
// naranja bajo una hoja (señal, no drama). El pop de color del mundo.
function geomCafeto(seed = 10, { florecido = true, roya = false } = {}) {
  const r = prng(seed), p = [];
  const H = 1.7 + r() * 0.7;
  // tallo (ortotrópico)
  p.push(pieza(new THREE.CylinderGeometry(0.045, 0.09, H, 5), C.cortezaCafe, [0, H / 2, 0]));
  const pisos = 3 + Math.floor(r() * 2);
  const hojaTinte = mezcla(C.cafeHoja, C.cafeHojaLustro, r() * 0.5).getStyle();
  for (let k = 0; k < pisos; k++) {
    const yy = H * (0.32 + (k / pisos) * 0.62);
    const alcance = (1 - k / (pisos + 1)) * 0.95 + 0.28;   // más ancho abajo (cono)
    const nRamas = 5 + Math.floor(r() * 2);
    for (let i = 0; i < nRamas; i++) {
      const a = (i / nRamas) * Math.PI * 2 + k * 0.5;
      // rama horizontal (plagiotrópica): apenas caída en la punta
      p.push(pieza(new THREE.CylinderGeometry(0.02, 0.035, alcance, 4), C.cortezaCafe,
        [Math.cos(a) * alcance * 0.5, yy, Math.sin(a) * alcance * 0.5], [0, -a, Math.PI / 2 - 0.12]));
      // follaje de la rama (dos matas de hoja a lo largo)
      for (const t of [0.55, 0.92]) {
        p.push(pieza(new THREE.IcosahedronGeometry(0.17 + r() * 0.06, 0), hojaTinte,
          [Math.cos(a) * alcance * t, yy + 0.02, Math.sin(a) * alcance * t], null, [1.2, 0.55, 1.2]));
      }
      // RACIMO de frutos en el nudo (cereza roja madura, algún pintón, algún verde)
      const nFr = 2 + Math.floor(r() * 3);
      for (let f = 0; f < nFr; f++) {
        const tt = 0.5 + r() * 0.45, dd = alcance * tt;
        const cl = r();
        const color = cl > 0.55 ? C.cereza : cl > 0.35 ? C.cerezaMadura : cl > 0.18 ? C.cerezaPinton : C.bayaVerde;
        p.push(pieza(new THREE.IcosahedronGeometry(0.05, 0), color,
          [Math.cos(a) * dd + (r() - 0.5) * 0.06, yy - 0.05 - r() * 0.05, Math.sin(a) * dd + (r() - 0.5) * 0.06]));
      }
      // FLOR blanca (bimodal: flor y fruto a la vez) en algunas ramas
      if (florecido && r() > 0.55) {
        const dd = alcance * (0.45 + r() * 0.35);
        p.push(pieza(new THREE.IcosahedronGeometry(0.06, 0), C.flor,
          [Math.cos(a) * dd, yy + 0.04, Math.sin(a) * dd], null, [1, 0.5, 1]));
      }
    }
  }
  // cogollo verde tierno arriba
  p.push(pieza(new THREE.ConeGeometry(0.16, 0.4, 6), mezcla(C.cafeHojaJoven, C.cafeHoja, 0.3).getStyle(), [0, H + 0.05, 0]));
  // la ROYA: mancha de polvo naranja bajo una hoja baja (señal discreta)
  if (roya) {
    p.push(pieza(new THREE.IcosahedronGeometry(0.09, 0), C.roya, [0.22, H * 0.4, 0.18], null, [1, 0.4, 1]));
  }
  return fusionar(p);
}

// SUELO · HELECHO/ARVENSE bajo la sombra: roseta BAJA de frondas casi rasantes
// (no matojo pincho — la cobertura verde del suelo del cafetal, discreta).
function geomSueloMata(seed = 20) {
  const r = prng(seed), p = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    p.push(pieza(new THREE.ConeGeometry(0.16, 0.62, 4), mezcla(C.cafeHoja, C.guamo, 0.45).getStyle(),
      [Math.cos(a) * 0.3, 0.18, Math.sin(a) * 0.3], [Math.sin(a) * 1.35, -a, Math.cos(a) * 1.35 - 1.45]));
  }
  return fusionar(p);
}
function geomHojarasca(seed = 21) {
  const r = prng(seed), p = [];
  p.push(pieza(new THREE.IcosahedronGeometry(0.7, 1), mezcla(C.hojarasca, C.mantillo, 0.4).getStyle(), [0, 0.12, 0], null, [1.4, 0.28, 1.4]));
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2, d = 0.5 + r() * 0.7;
    p.push(pieza(new THREE.CircleGeometry(0.3, 5), r() > 0.5 ? C.hojarasca : C.mantillo,
      [Math.cos(a) * d, 0.04, Math.sin(a) * d], [-Math.PI / 2, r() * 3, 0]));
  }
  return fusionar(p);
}

// ── material único: color por vértice, flat shading (low-poly Ghibli) ─────────
const MAT_VEG = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });

// ── texturas pintadas (sin cargar imágenes) ──────────────────────────────────
let _motaTex = null;
function motaTex() {
  if (_motaTex) return _motaTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const c = cv.getContext('2d'), r = 16;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  _motaTex = new THREE.CanvasTexture(cv);
  return _motaTex;
}
let _hazTex = null;
function hazTex() {
  if (_hazTex) return _hazTex;
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 32, 128);
  const gl = c.createLinearGradient(0, 0, 32, 0);
  gl.addColorStop(0, 'rgba(0,0,0,1)'); gl.addColorStop(0.5, 'rgba(0,0,0,0)'); gl.addColorStop(1, 'rgba(0,0,0,1)');
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = gl; c.fillRect(0, 0, 32, 128);
  _hazTex = new THREE.CanvasTexture(cv);
  return _hazTex;
}
let _sombraTex = null;
function sombraTex() {
  if (_sombraTex) return _sombraTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d'), r = 64;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(28,20,12,0.5)'); g.addColorStop(0.6, 'rgba(28,20,12,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  _sombraTex = new THREE.CanvasTexture(cv);
  return _sombraTex;
}

// ── FAUNA · el colibrí y la mariposa que trae la sombra (sprites pintados) ────
// Café de sombra = café CON VIDA: bajo el techo vuelven las aves y las mariposas
// que el café a pleno sol espanta. Sprites (miran a cámara siempre), animados,
// anclados sobre una flor de café. Bicho pequeño = sprite alegre, no maqueta.
function colibriTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  // cuerpo verde-tornasol
  c.fillStyle = '#1f9c6b'; c.beginPath(); c.ellipse(30, 34, 12, 8, -0.3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e0574a'; c.beginPath(); c.ellipse(24, 30, 5, 4, 0, 0, Math.PI * 2); c.fill(); // garganta rubí
  // pico largo
  c.strokeStyle = '#2a1a0c'; c.lineWidth = 2; c.beginPath(); c.moveTo(20, 30); c.lineTo(6, 26); c.stroke();
  // alas borrosas
  c.fillStyle = 'rgba(210,230,240,0.55)'; c.beginPath(); c.ellipse(38, 26, 13, 6, 0.6, 0, Math.PI * 2); c.fill();
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function mariposaTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#e79a2b';
  for (const sx of [-1, 1]) {
    c.beginPath(); c.ellipse(32 + sx * 11, 26, 9, 11, sx * 0.4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(32 + sx * 9, 40, 7, 8, sx * -0.3, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = '#3a2410'; c.fillRect(31, 20, 2, 26);
  c.fillStyle = 'rgba(40,26,12,0.6)';
  for (const sx of [-1, 1]) { c.beginPath(); c.arc(32 + sx * 11, 24, 3, 0, Math.PI * 2); c.fill(); }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}

// ═══════════════════════════════════════════════════════════════════════════
export function initCafetal() {
  const params = new URLSearchParams(location.search);
  const camModo = params.get('cam');          // `hero`/`estratos`/`beneficio` = cuadros fijos del gate

  // ── SUPRIMIR EL VALLE (main.js corre detrás) ────────────────────────────────
  const sup = document.createElement('style');
  sup.textContent =
    'body.enCafetal #c,body.enCafetal #onb,body.enCafetal #load,body.enCafetal #hud,' +
    'body.enCafetal #capaLugares,body.enCafetal #barraMover,body.enCafetal #guiaSel,' +
    'body.enCafetal #guiaV,body.enCafetal #ventanaM{display:none!important}' +
    'body.enCafetal{background:#12100a}';
  document.head.appendChild(sup);
  document.body.classList.add('enCafetal');
  const pararValle = () => { try { window.__r && window.__r.setAnimationLoop(null); } catch (e) { /* aún no */ } };
  pararValle(); setTimeout(pararValle, 300); setTimeout(pararValle, 1200);

  // ── CANVAS + RENDERER PROPIOS ───────────────────────────────────────────────
  const canvas = document.createElement('canvas'); canvas.id = 'cCafetal';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:20;touch-action:none';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.__r = renderer;                        // hook del gate (draw calls + renderer)
  window.__rCafetal = renderer;

  const scene = new THREE.Scene();
  // ── CIELO Y NIEBLA DEL PISO TEMPLADO (cálido, dorado abajo — NO frío) ───────
  scene.background = cieloTemplado();
  scene.fog = new THREE.FogExp2(0xd2d9bc, 0.0016);   // bruma matinal LEVE: se leen los estratos (sombra/café/suelo), no un velo

  const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, 0.4, 1400);
  window.__cam = camera; window.__scene = scene;
  window.__h = alturaCafetal;                   // sonda del gate

  const raiz = new THREE.Group(); scene.add(raiz);

  // ── LUZ: sol bajo y cálido de la hora dorada, DAPLEADO por el dosel (Nolan) ──
  scene.add(new THREE.HemisphereLight(0xe6e2c6, 0x4a3a26, 0.78));
  const sol = new THREE.DirectionalLight(0xffe1a8, 1.85);
  sol.position.set(90, 110, 60); scene.add(sol);
  const relleno = new THREE.DirectionalLight(0x9fc0cf, 0.34);
  relleno.position.set(-70, 44, -60); scene.add(relleno);

  // ── EL SUELO DE LA LADERA CAFETERA (tierra roja + hojarasca, con relieve) ───
  raiz.add(construirSuelo());

  // ── EL DOSEL DE SOMBRA, INSTANCIADO Y ANCLADO ───────────────────────────────
  // El techo del cafetal: guamo dominante + aliso + nogal, ESPARCIDOS (sombra que
  // deja colar la luz, no monte cerrado). Se plantan fuera del bancal.
  const rr = prng(7373);
  const arriba = (x, z) => Math.hypot(x - BANCAL.x, z - BANCAL.z) > BANCAL.r; // no sobre el beneficiadero
  function sembrar(geom, n, { rmin, escala, pred, extentX = [-150, 120], extentZ = [-150, 150] }) {
    const puestos = [];
    const inst = new THREE.InstancedMesh(geom, MAT_VEG, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    let hechos = 0, intentos = 0;
    while (hechos < n && intentos < n * 60) {
      intentos++;
      const x = rand(extentX[0], extentX[1]), z = rand(extentZ[0], extentZ[1]);
      if (pred && !pred(x, z)) continue;
      if (!puestos.every((qp) => Math.hypot(qp.x - x, qp.z - z) > rmin)) continue;
      const y = alturaCafetal(x, z);
      const e = escala[0] + rr() * (escala[1] - escala[0]);
      pos.set(x, y, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr() * Math.PI * 2);
      s.set(e, e * (0.94 + rr() * 0.12), e);
      m.compose(pos, q, s); inst.setMatrixAt(hechos, m);
      puestos.push({ x, z }); hechos++;
    }
    inst.count = hechos; inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    raiz.add(inst);
    return puestos;
  }

  // DOSEL — el techo (guamo dominante, esparcido: café de sombra, no potrero)
  // SOMBRA ez-tree (silueta ramificada VIVA, no parasol disco/palo): guamo (Inga
  // edulis, fija N y da el techo), aliso andino (Alnus acuminata) y nogal cafetero
  // (Cordia alliodora) — las tres especies REALES de sombrío del catálogo.
  // Horneadas a UNA geometría vertex-color por arquetipo -> 1 InstancedMesh c/u.
  const ezGuamo = bakearArquetipoFusion('guamo', { alturaObjetivo: 10.5, tintHoja: mezcla(C.guamo, C.guamoClaro, 0.4).getStyle(), tintCorteza: C.cortezaGuamo });
  const ezAliso = bakearArquetipoFusion('aliso_andino', { alturaObjetivo: 12.5, tintHoja: mezcla(C.aliso, C.alisoClaro, 0.3).getStyle(), tintCorteza: C.cortezaAliso });
  const ezNogal = bakearArquetipoFusion('nogal_cafetero', { alturaObjetivo: 13.5, tintHoja: mezcla(C.nogal, C.guamoClaro, 0.3).getStyle(), tintCorteza: C.cortezaNogal });
  const guamos = sembrar(ezGuamo, 20, { rmin: 20, escala: [0.9, 1.3], pred: arriba });
  const alisos = sembrar(ezAliso, 9, { rmin: 26, escala: [0.9, 1.25], pred: (x, z) => arriba(x, z) && z < 40 });
  sembrar(ezNogal, 7, { rmin: 30, escala: [0.85, 1.15], pred: (x, z) => arriba(x, z) && z < 60 });
  // PLÁTANO — sombra temporal entre las hileras (borde del cafetal)
  sembrar(geomPlatano(14), 16, { rmin: 8, escala: [0.85, 1.25], pred: (x, z) => arriba(x, z) });

  // ── EL CAFETAL: HILERAS A CURVA DE NIVEL (surcos que cuidan el suelo) ────────
  // El café no se siembra ladera abajo sino a CURVA DE NIVEL: hileras curvas que
  // frenan el aguacero. Se plantan por arcos, y una mata lleva la señal de roya.
  plantarCafetalEnSurcos(raiz, rr);

  // ── SUELO VIVO bajo la sombra (arvenses + hojarasca del café) ───────────────
  sembrar(geomSueloMata(20), 40, { rmin: 3.8, escala: [0.55, 0.9], pred: arriba });
  sembrar(geomHojarasca(21), 80, { rmin: 2.6, escala: [0.7, 1.4], pred: arriba });

  // ── EL BENEFICIADERO: del fruto rojo al grano vendible (el elemento vivido) ──
  const benef = construirBeneficiadero();
  raiz.add(benef);

  // ── EL ENT-ALISO: el árbol maestro del piso templado, en el alto del cafetal ─
  const ent = construirEntAliso();
  const eX = -28, eZ = -46, eBaseY = alturaCafetal(eX, eZ);   // maestro adelantado: torre sobre el cafetal, en el encuadre hero
  ent.group.position.set(eX, eBaseY, eZ);
  raiz.add(ent.group);
  raiz.add(sombraPlano(13, eX, eBaseY + 0.06, eZ));

  // ── LOS HACES DE LUZ que se cuelan por la copa del guamo (Nolan, suaves) ─────
  const rayos = construirRayos();
  raiz.add(rayos.group);

  // ── FAUNA: colibríes y mariposas que trae la sombra ─────────────────────────
  const fauna = construirFauna();
  raiz.add(fauna.group);

  // ── polvo/pelusa cálida suspendida (aire vivo del cafetal) ──────────────────
  const motas = construirMotas();
  raiz.add(motas.points);

  // ── CÁMARA: intro que baja a las hileras, bajo el techo de sombra ───────────
  const OJO = 1.65;
  const gHero = alturaCafetal(12, 46);
  const HERO_POS = new THREE.Vector3(12, gHero + OJO + 1.2, 46);
  const HERO_TGT = new THREE.Vector3(-18, gHero + 5.5, -18);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 6; controls.maxDistance = 240;
  controls.maxPolarAngle = 1.52;               // no meterse bajo el suelo
  controls.target.copy(HERO_TGT);
  controls.enabled = false;
  window.__ctl = controls;

  let introDone = false, introStart = null;
  const introPos = new THREE.CatmullRomCurve3([
    new THREE.Vector3(70, gHero + 66, 150),    // alto, entrando por el flanco soleado
    new THREE.Vector3(48, gHero + 34, 108),
    new THREE.Vector3(26, gHero + 12, 74),     // baja al nivel del techo de sombra
    HERO_POS.clone(),
  ]);
  const introTgt = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-10, gHero + 20, -10),
    new THREE.Vector3(-14, gHero + 12, -12),
    HERO_TGT.clone(), HERO_TGT.clone(),
  ]);
  const INTRO_S = 7.5;

  function darControl() {
    if (controls.enabled) return;
    camera.position.copy(HERO_POS); controls.target.copy(HERO_TGT);
    controls.enabled = true; controls.update();
  }
  function endIntro() { if (introDone) return; introDone = true; darControl(); avisar(); }
  function mano() { if (!introDone) endIntro(); }
  addEventListener('pointerdown', mano); addEventListener('keydown', mano); addEventListener('wheel', mano, { passive: true });

  // cuadros fijos deterministas para el gate visual
  if (camModo === 'hero') {
    introDone = true; camera.position.copy(HERO_POS); camera.lookAt(HERO_TGT);
  } else if (camModo === 'estratos') {
    // PRUEBA la verticalidad "el café vive debajo": de perfil, dosel arriba,
    // plátano en medio, hileras de café abajo.
    introDone = true;
    camera.position.set(-78, gHero + 5, 30);
    camera.lookAt(-6, gHero + 8, -14);
  } else if (camModo === 'beneficio') {
    // el beneficiadero de cerca: despulpadora, tanque, marquesina con el grano.
    introDone = true;
    const gy = alturaCafetal(BANCAL.x, BANCAL.z);
    camera.position.set(BANCAL.x + 20, gy + 7, BANCAL.z + 22);
    camera.lookAt(BANCAL.x, gy + 2, BANCAL.z);
  } else {
    camera.position.copy(introPos.getPoint(0)); camera.lookAt(introTgt.getPoint(0));
  }

  // ── HUD: la leyenda del CAFÉ DE SOMBRA (instruccional, en usted) ─────────────
  montarLeyenda();
  const avisar = montarAvisoYSalida();

  // ── raycast al Ent-aliso → su lección ───────────────────────────────────────
  const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
  let dx0 = 0, dy0 = 0, dt0 = 0;
  canvas.addEventListener('pointerdown', (e) => { dx0 = e.clientX; dy0 = e.clientY; dt0 = performance.now(); });
  canvas.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - dx0, e.clientY - dy0) > 9 || performance.now() - dt0 > 600) return;
    pt.x = (e.clientX / innerWidth) * 2 - 1; pt.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(pt, camera);
    if (ray.intersectObject(ent.group, true).length) tarjetaEnt();
  });

  // ── POST: bloom cálido de la hora dorada (el grano al sol, los haces) ────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.7, 0.85));
  composer.addPass(new OutputPass());

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  });

  const loadEl = document.getElementById('load');
  if (loadEl) { loadEl.style.opacity = 0; setTimeout(() => loadEl.remove(), 700); }

  // ── LOOP ────────────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    if (!introDone && camModo !== 'hero') {
      if (introStart === null) introStart = t;
      const k = Math.min((t - introStart) / INTRO_S, 1);
      const e = k * k * k * (k * (k * 6 - 15) + 10);   // smootherstep
      introPos.getPoint(e, camera.position);
      const tg = introTgt.getPoint(e); camera.lookAt(tg);
      if (k >= 1) endIntro();
    } else if (controls.enabled) {
      controls.update();
    }
    ent.update(t);
    rayos.update(t);
    fauna.update(t, camera);
    motas.update(t);
    composer.render();
  });

  window.__cafetal = { scene, camera, renderer, controls, ent };
  return window.__cafetal;
}

// ── CIELO TEMPLADO (degradé celeste-cálido a dorado abajo, hora de finca) ─────
function cieloTemplado() {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 512;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.00, C.cieloCenit);
  g.addColorStop(0.45, C.cieloMedio);
  g.addColorStop(0.78, C.nieblaCalida);
  g.addColorStop(1.00, C.cieloHorizonte);
  c.fillStyle = g; c.fillRect(0, 0, 16, 512);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

// ── EL SUELO: heightfield tierra roja cafetera + hojarasca, color por vértice ─
function construirSuelo() {
  const SIZE = 560, SEG = 140;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colr = new Float32Array(pos.count * 3);
  const base = mezcla(C.tierra, C.tierraSombra, 0.35), roja = col(C.tierraRoja);
  const hoja = col(C.hojarasca), mant = col(C.mantillo), sombraSuelo = col(C.tierraSombra), solTinte = col('#d9bd7a');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = alturaCafetal(x, z);
    pos.setY(i, y);
    tmp.copy(base);
    const rojaK = fbm(x * 0.04 + 7, z * 0.04 - 9);
    if (rojaK > 0.5) tmp.lerp(roja, (rojaK - 0.5) * 1.3);     // vetas de tierra roja
    const hojaK = fbm(x * 0.07 - 4, z * 0.07 + 12);
    if (hojaK > 0.52) tmp.lerp(hoja, (hojaK - 0.52) * 1.4);    // manto de hojarasca
    if (fbm(x * 0.1, z * 0.1) < 0.3) tmp.lerp(mant, 0.4);       // materia orgánica oscura
    if (fbm(x * 0.13 + 15, z * 0.13) < 0.24) tmp.lerp(sombraSuelo, 0.35); // sombra bajo el dosel
    // dapple cálido donde el terreno mira al sol (los altos del microrelieve)
    const dap = THREE.MathUtils.clamp((fbm(x * 0.08 + 2, z * 0.08 - 6) - 0.45) * 2, 0, 1);
    tmp.lerp(solTinte, dap * 0.14);
    colr[i * 3] = tmp.r; colr[i * 3 + 1] = tmp.g; colr[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
}

// ── EL CAFETAL EN SURCOS A CURVA DE NIVEL ─────────────────────────────────────
// Hileras curvas (arcos de radio grande, centro monte arriba) que ordenan las
// matas: café a curva de nivel, no ladera abajo — cuida el suelo del aguacero.
// Se instancian DOS variantes (florecido / con menos flor) para que no sea un
// cafetal de clones, y se marca una mata con roya.
function plantarCafetalEnSurcos(raiz, rr) {
  const geoA = geomCafeto(101, { florecido: true });
  const geoB = geomCafeto(202, { florecido: false });
  const geoRoya = geomCafeto(303, { florecido: true, roya: true });
  const puestosA = [], puestosB = [];
  const CENTRO = { x: -10, z: -260 };   // centro de las curvas de nivel (monte arriba)
  // franja del cafetal: bajo la sombra, fuera del bancal
  const enCafetal = (x, z) => Math.hypot(x - BANCAL.x, z - BANCAL.z) > BANCAL.r - 4
    && x > -120 && x < 90 && z > -70 && z < 100;
  const radios = [];
  for (let R = 190, i = 0; R < 320; R += 7.5, i++) radios.push(R);
  for (let ri = 0; ri < radios.length; ri++) {
    const R = radios[ri];
    // recorre el arco por ángulo, paso ~ separación entre matas
    const paso = 1.55 / R;
    for (let a = -0.9; a < 0.9; a += paso) {
      const jx = (rr() - 0.5) * 0.8, jz = (rr() - 0.5) * 0.8;
      const x = CENTRO.x + Math.sin(a) * R + jx;
      const z = CENTRO.z + Math.cos(a) * R + jz;
      if (!enCafetal(x, z)) continue;
      const conRoya = rr() < 0.012;
      if (conRoya) puestosB.push({ x, z, roya: true });
      else if (rr() < 0.5) puestosA.push({ x, z });
      else puestosB.push({ x, z });
    }
  }
  const colocar = (geom, lista) => {
    if (!lista.length) return;
    const inst = new THREE.InstancedMesh(geom, MAT_VEG, lista.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    lista.forEach((pt, k) => {
      const y = alturaCafetal(pt.x, pt.z);
      const e = 0.9 + rr() * 0.4;
      pos.set(pt.x, y, pt.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr() * Math.PI * 2);
      s.set(e, e * (0.92 + rr() * 0.16), e);
      m.compose(pos, q, s); inst.setMatrixAt(k, m);
    });
    inst.instanceMatrix.needsUpdate = true; inst.frustumCulled = false;
    raiz.add(inst);
  };
  colocar(geoA, puestosA);
  colocar(geoB, puestosB.filter((p) => !p.roya));
  colocar(geoRoya, puestosB.filter((p) => p.roya));
}

// ── sombra de contacto como plano ────────────────────────────────────────────
function sombraPlano(r, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: sombraTex(), transparent: true, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL BENEFICIADERO — del fruto rojo al grano vendible (despulpar → fermentar →
//  lavar → secar). El elemento que hace del mundo un cafetal DE VERDAD.
// ═══════════════════════════════════════════════════════════════════════════
function construirBeneficiadero() {
  const g = new THREE.Group();
  const bx = BANCAL.x, bz = BANCAL.z, by = alturaCafetal(bx, bz);
  g.position.set(bx, by, bz);
  const matZinc = new THREE.MeshStandardMaterial({ color: col(C.zinc), roughness: 0.6, metalness: 0.15, flatShading: true });
  const matMad = new THREE.MeshStandardMaterial({ color: col(C.maderaBenef), roughness: 1, flatShading: true });
  const matMadC = new THREE.MeshStandardMaterial({ color: col(C.maderaClara), roughness: 1, flatShading: true });
  const matConc = new THREE.MeshStandardMaterial({ color: col(C.concreto), roughness: 1, flatShading: true });
  const matAgua = new THREE.MeshStandardMaterial({ color: col(C.agua), roughness: 0.3, metalness: 0.1, flatShading: true });

  // ── LA MARQUESINA / PASERA: cama elevada + techo de zinc translúcido; el café
  //    pergamino tendido secándose al sol (el elemento más icónico del cafetal).
  const marq = new THREE.Group(); marq.position.set(-2, 0, 4); g.add(marq);
  // patas
  for (const [px, pz] of [[-4, -2], [4, -2], [-4, 2], [4, 2], [0, -2], [0, 2]]) {
    const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 6), matMad);
    pata.position.set(px, 0.8, pz); marq.add(pata);
  }
  // cama (tablado)
  const cama = new THREE.Mesh(new THREE.BoxGeometry(9, 0.14, 5), matMadC);
  cama.position.set(0, 1.62, 0); marq.add(cama);
  // el café pergamino tendido (capa cremosa) — con surcos del rastrillo
  const capa = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.12, 4.4), new THREE.MeshStandardMaterial({ color: col(C.pergamino), roughness: 1, flatShading: true }));
  capa.position.set(0, 1.74, 0); marq.add(capa);
  for (let i = -3; i <= 3; i++) {
    const surco = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 4.3), new THREE.MeshStandardMaterial({ color: mezcla(C.pergamino, C.maderaBenef, 0.3), roughness: 1 }));
    surco.position.set(i * 1.1, 1.79, 0); marq.add(surco);
  }
  // postes + techo de zinc a dos aguas (la marquesina)
  for (const px of [-4.2, 4.2]) {
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 6), matMad);
    poste.position.set(px, 3.0, 0); marq.add(poste);
  }
  const techo = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.12, 5.6), matZinc);
  techo.position.set(0, 4.3, 0); techo.rotation.z = 0.0; marq.add(techo);
  for (let i = 0; i < 9; i++) { // costillas del zinc
    const cost = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 5.6), matZinc);
    cost.position.set(-4.3 + i * 1.07, 4.37, 0); marq.add(cost);
  }

  // ── LA DESPULPADORA: tolva + cuerpo + manija (le quita la pulpa a la cereza) ─
  const desp = new THREE.Group(); desp.position.set(9, 0, -3); g.add(desp);
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.9), new THREE.MeshStandardMaterial({ color: col(C.teja), roughness: 0.8, flatShading: true }));
  cuerpo.position.set(0, 0.9, 0); desp.add(cuerpo);
  const tolva = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.18, 0.7, 4), matMadC);
  tolva.position.set(0, 1.75, 0); tolva.rotation.y = Math.PI / 4; desp.add(tolva);
  const manija = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6), matMad);
  manija.position.set(0.75, 0.9, 0); manija.rotation.z = Math.PI / 2; desp.add(manija);
  const volante = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 16), matMad);
  volante.position.set(1.0, 0.9, 0); volante.rotation.y = Math.PI / 2; desp.add(volante);
  // montón de pulpa roja al pie (que irá al compost — cierra el ciclo)
  const pulpa = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: col(C.cerezaSeca), roughness: 1, flatShading: true }));
  pulpa.position.set(-0.2, 0, 1.3); pulpa.scale.set(1.3, 0.6, 1.3); desp.add(pulpa);

  // ── EL TANQUE DE FERMENTACIÓN: recipiente de concreto con el agua del mucílago
  const tanque = new THREE.Group(); tanque.position.set(11, 0, 1.2); g.add(tanque);
  const pared = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.95, 1.2, 14, 1, true), matConc);
  pared.position.set(0, 0.6, 0); tanque.add(pared);
  const fondo = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.1, 14), matConc);
  fondo.position.set(0, 0.1, 0); tanque.add(fondo);
  const agua = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.96, 0.06, 14), matAgua);
  agua.position.set(0, 0.95, 0); tanque.add(agua);
  // grano en fermentación asomando bajo el agua
  const granoFerm = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 14), new THREE.MeshStandardMaterial({ color: mezcla(C.pergamino, C.oro, 0.4), roughness: 1, flatShading: true }));
  granoFerm.position.set(0, 0.78, 0); tanque.add(granoFerm);

  // ── LOS TRES ESTADOS DEL GRANO en bandejas (cereza→pergamino→oro, sin tostar) ─
  const estados = [
    { c: C.cereza, x: -8.5, z: 8.5 },     // cereza (el fruto rojo)
    { c: C.pergamino, x: -6.8, z: 9.2 },  // pergamino (grano seco en cascarilla)
    { c: C.oro, x: -5.1, z: 9.6 },        // oro (verde ya trillado, a vender)
  ];
  for (const e of estados) {
    const bandeja = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 14), matMadC);
    bandeja.position.set(e.x, 0.18, e.z); g.add(bandeja);
    const monton = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: col(e.c), roughness: 1, flatShading: true }));
    monton.position.set(e.x, 0.24, e.z); g.add(monton);
  }

  // ── COSTALES de café pergamino listos (la cosecha guardada), en pie ─────────
  for (const [sx, sz, rot] of [[6.4, 8.2, 0.06], [7.5, 8.8, -0.08], [6.9, 9.6, 0.12]]) {
    const costal = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 1.0, 8), new THREE.MeshStandardMaterial({ color: col(C.costal), roughness: 1, flatShading: true }));
    costal.position.set(sx, 0.5, sz); costal.rotation.z = rot; g.add(costal);
    const boca = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.24, 8), new THREE.MeshStandardMaterial({ color: col(C.costalCafe), roughness: 1, flatShading: true }));
    boca.position.set(sx + rot * 0.9, 1.02, sz); boca.rotation.z = rot; g.add(boca);
  }

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL ENT-ALISO — el árbol maestro del piso templado (Alnus acuminata)
//  Ghibli / Deku Tree: sereno, corteza pálida, una cara honda en el fuste. NO
//  rubber-hose (los mundos son lámina Humboldt): la vida es el balanceo lento y
//  la mirada ámbar que asoma de la sombra.
// ═══════════════════════════════════════════════════════════════════════════
function construirEntAliso() {
  const g = new THREE.Group();
  const est = [];
  const H = 23, Rt = 2.5;   // maestro: TORRE sobre el dosel (guamos a 9–14 m; este a ~26 m)

  // RAÍCES CONTRAFUERTE (lo ancla y le da porte de árbol viejo)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    est.push(pieza(new THREE.CylinderGeometry(0.28, 0.8, 4.2, 5), C.cortezaNogal,
      [Math.cos(a) * Rt * 0.9, 0.85, Math.sin(a) * Rt * 0.9], [Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5]));
  }
  // FUSTE: corteza PÁLIDA del aliso, ligeramente cónico
  est.push(pieza(new THREE.CylinderGeometry(Rt * 0.72, Rt, H * 0.52, 12), C.cortezaAliso, [0, H * 0.26, 0]));
  // manchas/líquenes claros de la corteza del aliso
  const rn = prng(66);
  for (let i = 0; i < 12; i++) {
    const a = rn() * Math.PI * 2, yy = 1 + rn() * H * 0.44;
    est.push(pieza(new THREE.IcosahedronGeometry(0.4 + rn() * 0.3, 0), mezcla(C.cortezaAliso, C.alisoClaro, 0.5).getStyle(),
      [Math.cos(a) * Rt * 0.86, yy, Math.sin(a) * Rt * 0.86], null, [1, 1.3, 0.6]));
  }
  // RAMAS gruesas hacia la copa
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, lr = 5.5 + rn() * 2;
    est.push(pieza(new THREE.CylinderGeometry(0.24, 0.6, lr, 6), C.cortezaAliso,
      [Math.cos(a) * Rt * 0.7, H * 0.52, Math.sin(a) * Rt * 0.7], [Math.sin(a) * 0.7, -a, -Math.cos(a) * 0.7 - 0.4]));
  }
  g.add(new THREE.Mesh(fusionar(est), MAT_VEG));

  // COPA-COLUMNA del aliso maestro: niveles cónicos APILADOS que estrechan hacia
  // arriba (el aliso se lee "columna", no bombón — distinto del paraguas del
  // guamo). Masa viva que se balancea, corona que remata en punta.
  const copaG = new THREE.Group(); copaG.position.y = H * 0.52 + 1.5;
  const cop = [];
  const niveles = [
    { y: 0.0, r: 6.8, flat: 0.9 },
    { y: 4.6, r: 5.5, flat: 0.95 },
    { y: 8.8, r: 3.9, flat: 1.0 },
    { y: 12.2, r: 2.3, flat: 1.12 },
  ];
  for (const nv of niveles) {
    cop.push(pieza(new THREE.IcosahedronGeometry(nv.r, 2), mezcla(C.aliso, C.guamo, 0.32).getStyle(),
      [0, nv.y, 0], null, [1.05, nv.flat, 1.05]));
  }
  const rc = prng(99);
  for (let i = 0; i < 16; i++) {
    const a = rc() * Math.PI * 2, yy = rc() * 12.2;
    const rad = (1 - yy / 15) * 3.4 + 1.3;
    cop.push(pieza(new THREE.IcosahedronGeometry(1.5 + rc() * 1.1, 1), mezcla(C.aliso, C.alisoClaro, 0.3 + rc() * 0.35).getStyle(),
      [Math.cos(a) * rad, yy, Math.sin(a) * rad], null, [1.05, 1.0, 1.05]));
  }
  copaG.add(new THREE.Mesh(fusionar(cop), MAT_VEG));
  g.add(copaG);

  // ── LA CARA en el fuste (honda, serena; mira al cafetal +Z) ──────────────────
  const caraG = new THREE.Group(); caraG.position.set(0, H * 0.32, Rt * 0.68);
  const matGrieta = new THREE.MeshStandardMaterial({ color: col(C.mantillo), roughness: 1, flatShading: true });
  const matAmbar = new THREE.MeshStandardMaterial({ color: col('#f6c65a'), roughness: 0.5, emissive: col('#e0a63b'), emissiveIntensity: 0.5 });
  const matMadera = new THREE.MeshStandardMaterial({ color: mezcla(C.cortezaAliso, C.mantillo, 0.4), roughness: 1, flatShading: true });
  const ojos = [];
  for (const sx of [-1, 1]) {
    const pozo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), matGrieta);
    pozo.position.set(sx * 1.0, 0.3, -0.12); pozo.scale.set(1.2, 1.25, 0.7); caraG.add(pozo);
    const ceja = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.36, 0.45), matMadera);
    ceja.position.set(sx * 1.0, 0.92, 0.1); ceja.rotation.z = sx * 0.18; caraG.add(ceja);
    const globo = new THREE.Mesh(new THREE.SphereGeometry(0.37, 12, 10), matGrieta);
    globo.position.set(sx * 1.0, 0.3, 0.1); caraG.add(globo);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), matAmbar);
    iris.position.set(sx * 1.0, 0.3, 0.44); caraG.add(iris);
    ojos.push(iris);
  }
  const nariz = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.4, 5), matMadera);
  nariz.position.set(0, -0.3, 0.32); nariz.rotation.x = Math.PI; caraG.add(nariz);
  const boca = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.13, 5, 12, Math.PI), matGrieta);
  boca.position.set(0, -1.35, 0.36); boca.rotation.z = Math.PI; caraG.add(boca);
  g.add(caraG);

  const update = (t) => {
    const sway = Math.sin(t * 0.28) * 0.018 + Math.sin(t * 0.11 + 1) * 0.01;
    copaG.rotation.z = sway; copaG.rotation.x = Math.cos(t * 0.23) * 0.012;
    g.rotation.z = sway * 0.25;
    const ph = (t * 0.5) % 6;
    const blink = ph > 5.7 ? 1 - Math.abs(ph - 5.85) / 0.15 : 0;
    const k = 1 - THREE.MathUtils.clamp(blink, 0, 1) * 0.9;
    ojos.forEach((o) => { o.scale.y = k; });
    matAmbar.emissiveIntensity = 0.42 + Math.sin(t * 0.7) * 0.12;
  };
  return { group: g, update };
}

// ── LOS HACES DE LUZ que se cuelan por la copa del guamo (Nolan, suaves) ──────
// El café de sombra recibe la luz COLADA, no el rayo del potrero: haces tenues y
// cálidos que caen sobre las hileras entre la copa del dosel.
function construirRayos() {
  const g = new THREE.Group();
  const rayTex = hazTex();
  const rayos = [];
  const sitios = [
    [6, 30, 3.4, 26, 0.07], [-24, 6, 3.0, 24, 0.06], [22, -14, 2.8, 24, 0.05],
    [-46, -20, 2.6, 22, 0.05], [40, 18, 2.6, 22, 0.045],
  ];
  for (const [x, z, rad, alto, op] of sitios) {
    const y0 = alturaCafetal(x, z);
    const m = new THREE.MeshBasicMaterial({ map: rayTex, color: col(C.sol), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    m._op0 = op;
    const cono = new THREE.Mesh(new THREE.ConeGeometry(rad, alto, 12, 1, true), m);
    cono.position.set(x, y0 + alto / 2, z); cono.rotation.x = 0.14;
    g.add(cono); rayos.push(cono);
    const charco = new THREE.Mesh(new THREE.CircleGeometry(rad * 0.9, 16),
      new THREE.MeshBasicMaterial({ color: col('#fff0cf'), transparent: true, opacity: op * 1.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    charco.rotation.x = -Math.PI / 2; charco.position.set(x, y0 + 0.14, z); g.add(charco);
  }
  const update = (t) => { rayos.forEach((c, i) => { c.material.opacity = c.material._op0 * (0.8 + Math.sin(t * 0.5 + i) * 0.25); }); };
  return { group: g, update };
}

// ── FAUNA · colibríes y mariposas (sprites que miran a cámara, revoloteando) ──
function construirFauna() {
  const g = new THREE.Group();
  const texCol = colibriTex(), texMar = mariposaTex();
  const bichos = [];
  // posiciones sobre las hileras de café (donde hay flor)
  const puntos = [
    { tex: texCol, x: 4, z: 34, y: 2.4, s: 1.5, fase: 0.4 },
    { tex: texCol, x: -20, z: 10, y: 2.2, s: 1.4, fase: 2.1 },
    { tex: texCol, x: 16, z: -6, y: 2.6, s: 1.3, fase: 3.5 },
    { tex: texMar, x: -6, z: 24, y: 1.8, s: 1.2, fase: 1.2 },
    { tex: texMar, x: 24, z: 20, y: 1.6, s: 1.1, fase: 4.0 },
    { tex: texMar, x: -34, z: -4, y: 1.9, s: 1.2, fase: 5.3 },
  ];
  for (const pnt of puntos) {
    const mat = new THREE.SpriteMaterial({ map: pnt.tex, transparent: true, depthWrite: false, fog: true });
    const sp = new THREE.Sprite(mat);
    const y0 = alturaCafetal(pnt.x, pnt.z) + pnt.y;
    sp.position.set(pnt.x, y0, pnt.z);
    sp.scale.set(pnt.s, pnt.s, 1);
    g.add(sp);
    bichos.push({ sp, base: new THREE.Vector3(pnt.x, y0, pnt.z), fase: pnt.fase, s: pnt.s, esCol: pnt.tex === texCol });
  }
  const update = (t) => {
    for (const b of bichos) {
      const f = b.fase;
      // revoloteo: órbita corta + subibaja (colibrí más nervioso que mariposa)
      const vel = b.esCol ? 1.4 : 0.7, rad = b.esCol ? 0.9 : 1.6;
      b.sp.position.x = b.base.x + Math.cos(t * vel + f) * rad;
      b.sp.position.z = b.base.z + Math.sin(t * vel * 0.8 + f) * rad;
      b.sp.position.y = b.base.y + Math.sin(t * (b.esCol ? 3.0 : 1.3) + f) * (b.esCol ? 0.25 : 0.5);
      // aleteo (pulso de escala)
      const pulso = b.esCol ? 1 + Math.sin(t * 26 + f) * 0.06 : 1 + Math.sin(t * 5 + f) * 0.12;
      b.sp.scale.set(b.s * pulso, b.s * pulso, 1);
    }
  };
  return { group: g, update };
}

// ── MOTAS suspendidas (pelusa/polvo cálido en el aire del cafetal) ────────────
function construirMotas() {
  const N = 260;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const x = rand(-100, 90), z = rand(-90, 110);
    pos[i * 3] = x; pos[i * 3 + 1] = alturaCafetal(x, z) + rand(1, 18); pos[i * 3 + 2] = z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: motaTex(), color: col('#fff2d4'), size: 0.6, sizeAttenuation: true, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  const update = (t) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.004 + 0.005;
      a[i * 3] += Math.sin(t * 0.2 + i * 0.5) * 0.004;
      if (a[i * 3 + 1] > alturaCafetal(a[i * 3], a[i * 3 + 2]) + 20) a[i * 3 + 1] = alturaCafetal(a[i * 3], a[i * 3 + 2]) + 1;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points: pts, update };
}

// ── HUD: leyenda del CAFÉ DE SOMBRA (instruccional, en usted) ─────────────────
function montarLeyenda() {
  const CAPAS = [
    { c: '#6c9c48', n: 'La sombra', h: '8–14 m', d: 'El techo: guamo, aliso y nogal cafetero. El café vive DEBAJO —menos sol quemante, más humedad, y hoja que cae y abona. El guamo, además, fija nitrógeno del aire.' },
    { c: '#c92c1d', n: 'El cafetal', h: '1,5–2,5 m', d: 'Las matas en hileras a curva de nivel. En la misma mata hay flor blanca, grano verde y cereza roja a la vez: se coge solo el maduro, grano a grano.' },
    { c: '#d9c89b', n: 'El beneficio', h: 'al pie', d: 'Del fruto al grano vendible: despulpar, fermentar, lavar y secar el pergamino al sol en la marquesina. La pulpa no es basura: compostada, vuelve al cafetal como abono.' },
  ];
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:14px;top:14px;z-index:30;max-width:min(40vw,350px);' +
    'font-family:system-ui,-apple-system,sans-serif;color:#f3efe4;pointer-events:none';
  let html = '<div style="font-size:1.05rem;font-weight:700;text-shadow:0 2px 10px rgba(0,0,0,.7);margin-bottom:2px">☕ El cafetal de sombra</div>' +
    '<div style="font-size:.72rem;opacity:.82;text-shadow:0 1px 6px rgba(0,0,0,.8);margin-bottom:9px">Piso templado · 1.000–2.000 m · café con vida, no potrero de sol</div>';
  for (const e of CAPAS) {
    html += '<div style="display:flex;gap:8px;margin-bottom:7px;background:linear-gradient(90deg,rgba(20,14,8,.72),rgba(20,14,8,.26));' +
      'border-left:4px solid ' + e.c + ';border-radius:7px;padding:6px 9px">' +
      '<span><b style="font-size:.86rem">' + e.n + '</b> <span style="opacity:.62;font-size:.68rem">' + e.h + '</span><br>' +
      '<span style="font-size:.68rem;opacity:.84;line-height:1.3">' + e.d + '</span></span></div>';
  }
  box.innerHTML = html;
  document.body.appendChild(box);
  if (innerWidth < 620) box.style.maxWidth = '82vw';
}

// ── aviso de entrada + botón de salida al valle ───────────────────────────────
function montarAvisoYSalida() {
  const salir = document.createElement('button');
  salir.textContent = '← Volver al valle';
  salir.style.cssText = 'position:fixed;right:14px;top:14px;z-index:31;border:1px solid rgba(224,190,140,.4);' +
    'background:rgba(20,14,8,.8);color:#f3efe4;border-radius:999px;padding:8px 16px;font:600 .8rem system-ui,sans-serif;' +
    'cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4)';
  salir.onclick = () => { location.href = './'; };
  document.body.appendChild(salir);

  return function avisar() {
    let el = document.getElementById('cafetalToast');
    if (!el) {
      el = document.createElement('div'); el.id = 'cafetalToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:40;' +
        'background:rgba(22,15,9,.92);color:#f3efe4;border:1px solid rgba(224,190,140,.35);border-radius:999px;' +
        'padding:10px 20px;font:500 .88rem system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:opacity .4s';
      document.body.appendChild(el);
    }
    el.textContent = '☕ Está dentro del cafetal · arrastre para mirar · toque el aliso viejo';
    el.style.opacity = '1';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 4200);
  };
}

// ── tarjeta del Ent-aliso (lección del árbol maestro del cafetal) ─────────────
function tarjetaEnt() {
  let el = document.getElementById('cafetalEntCarta');
  if (el) { el.remove(); return; }
  el = document.createElement('div'); el.id = 'cafetalEntCarta';
  el.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:45;max-width:min(88vw,430px);' +
    'background:rgba(22,15,9,.95);color:#f3efe4;border:1px solid rgba(224,166,59,.5);border-radius:16px;padding:16px 18px;' +
    'font-family:system-ui,-apple-system,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,.55)';
  el.innerHTML =
    '<div style="font-size:1.05rem;font-weight:700;color:#f6c65a">🌳 El Aliso — el maestro que abona la sombra</div>' +
    '<div style="font-size:.8rem;line-height:1.45;margin-top:8px;opacity:.92">' +
    '<i>Alnus acuminata</i> es el árbol de sombra de los cafetales de tierra fría y alta. Como el guamo, es leguminoso: ' +
    'fija el nitrógeno del aire y lo deja en el suelo, crece rápido y protege del viento y de las heladas. ' +
    'Un cafetal bajo su sombra come mejor, resiste mejor la roya y le devuelve el monte a las aves. ' +
    'Café de sombra es café con vida —y con suelo que dura.</div>' +
    '<div style="font-size:.7rem;opacity:.6;margin-top:10px">Toque otra vez para cerrar</div>';
  document.body.appendChild(el);
  clearTimeout(el._t); el._t = setTimeout(() => { el && el.remove(); }, 12000);
}
