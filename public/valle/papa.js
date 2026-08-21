// ── papa.js — EL PAPAL AGROECOLÓGICO, LADERA DE LA TIERRA FRÍA ────────────────
//
// Modo `?mundo=papa`. No es un mojón del valle: es ENTRAR al papal de la finca
// andina y caminarlo por dentro, en la TIERRA FRÍA (2.500–3.500 msnm, el filo
// donde el frío se hace páramo) donde la papa es la reina. Archivo NUEVO y
// AUTÓNOMO, Three.js vanilla — monta su propio canvas/renderer/loop y SUPRIME el
// valle (main.js corre detrás y lo apagamos): no pelean dos renders. Su único
// enganche con main.js es el bloque marcado `// ── PAPA ──`. Dialoga igual que
// aguacatal.js, cafetal.js, mercado.js y bosque.js: mismo DEM/Humboldt/Ghibli,
// low-poly entintado, cero fotorrealismo. Otra CARA productiva: no el calor del
// aguacate, sino el frío del altiplano y su surco aporcado.
//
// GROUNDING — chagra/src/data (fenología solanum_tuberosum.v1, agro-insight-cards,
// precioReferencia, dictionary · AGROSAVIA/CORPOICA/ICA/Fedepapa):
//   · LA MATA: Solanum tuberosum es una MATA baja y frondosa (50–80 cm), hoja
//     compuesta verde oscuro algo azulada del frío. NO es un árbol: es un tapiz
//     de matas alineadas en el surco. Lo que come vive ABAJO, en la tierra.
//   · LA FLOR delata la variedad: estrella de cinco puntas con ojo amarillo,
//     BLANCA (pastusa), LILA o MORADA (Diacol Capiro, criolla). La flor sale con
//     la TUBERIZACIÓN (55–75 días): florecer es señal de que abajo está cuajando.
//   · EL APORQUE: el CAMELLÓN de tierra que se arrima al pie de la mata para tapar
//     el tubérculo (si le da el sol se enverdece y amarga / envenena — solanina).
//     Se siembra a CURVA DE NIVEL, el surco atravesado a la pendiente, para que el
//     agua no corra y no se lleve la tierra.
//   · LA COSECHA: al ESCARBAR el camellón aparecen los tubérculos. Variedades
//     andinas REALES, no sólo la comercial: papa CRIOLLA amarilla (Solanum
//     phureja, redonda chiquita), PASTUSA (crema con ojos rosados), SABANERA,
//     DIACOL CAPIRO (piel morada-rojiza). Semilla PROPIA seleccionada = tubérculos
//     con grelos verdes que se guardan para la próxima.
//   · MANEJO AGROECOLÓGICO, no monocultivo de fungicida: ROTACIÓN (nunca papa-tras-
//     papa: la gota — Phytophthora infestans, la enfermedad más costosa — y el
//     gusano se cargan el lote); ASOCIO con haba y maíz; SEMILLA propia sana;
//     CONTROL BIOLÓGICO de la polilla guatemalteca (Tecia solanivora) con trampa
//     de feromona + enemigos naturales, en vez de bañar la mata en veneno.
//
// LAS CUATRO MIRADAS (encargo del operador):
//   · Peter Jackson — el papal ÉPICO y HABITADO: los camellones aporcados bajando
//     la ladera a curva de nivel hasta perderse en la neblina fría, la mata madre
//     florecida en primer plano, el escarbe abierto con la cosecha derramada y el
//     costal de la semilla como lugar vivido, el asocio de haba y maíz al filo.
//   · Nolan / Interstellar — LA IMAGEN QUE SE QUEDA: las líneas paralelas del
//     aporque curvándose con el contorno del monte bajo la bruma, la flor lila y
//     blanca salpicando el verde azulado, a contraluz frío de la mañana alta.
//   · Zelda BOTW / Odyssey — color y ganas de recorrer: el verde azulado del
//     follaje, la constelación de flores blancas/lilas/moradas, y el ORO de la
//     papa criolla asomando en el escarbe contra la tierra oscura.
//   · agroecólogo — la FIDELIDAD es el efecto especial: se lee el APORQUE (el
//     camellón que tapa el tubérculo), la curva de nivel, la ROTACIÓN (el lote de
//     al lado en descanso/asocio, no papa-tras-papa), la semilla seleccionada y la
//     trampa del control biológico contra el veneno. Cada cosa se lee por su
//     silueta a 30 m (la mata una borla baja; el camellón una línea de tierra).
//   · diseñador instruccional — la niña (11) y el campesino, EN USTED: la leyenda
//     del aporque y las tarjetas de la rotación y las variedades enseñan la
//     diferencia con el monocultivo de fungicida, sin gamificar.
//
// LEY DE LA CASA: TODO anclado al suelo con `alturaPapa(x,z)` — cero flotando. La
// fusión de mallas evita el bug clásico de `mergeGeometries` (mezclar indexadas
// con no-indexadas devuelve NULL en silencio): aquí todo se desindexa antes y
// sólo viajan position + color; la normal se recalcula.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ── PALETA MADRE (el papal de la tierra fría a la mañana alta y neblinosa) ─────
const C = {
  // la mata de papa: hoja compuesta verde OSCURO algo AZULADA del frío
  papaHoja: '#2c4a34', papaHojaMedia: '#3a6042', papaHojaClara: '#4e7a4a', papaHojaAzul: '#33553f', papaHojaJoven: '#6a9256',
  // las flores estrella: blanca / lila / morada, con ojo amarillo (cuajan la tuberización)
  florBlanca: '#eef0e8', florLila: '#b7a4d6', florMorada: '#8a63ac', florOjo: '#e8d24a', florOjoClaro: '#f2e07a',
  // tubérculos: criolla amarilla, pastusa crema con ojo rosado, sabanera, capiro morado-rojizo
  papaCriolla: '#e6be3e', papaCriollaBrillo: '#f2d466', pastusa: '#d8c49a', pastusaOjo: '#b07a72',
  sabanera: '#c9a86e', capiro: '#8a4a44', capiroBrillo: '#a35c52', grelo: '#7bb255',
  // tierra fría alta: parda-grisácea, camellón del aporque más claro, surco húmedo oscuro
  tierra: '#6a5240', tierraSurco: '#4a3a2c', camellon: '#8a6a4a', camellonSol: '#a3835c', tierraHumeda: '#403227',
  mantillo: '#54432e', piedra: '#8f8a80',
  // asocio: haba (verde + flor blanca de mancha negra), maíz (caña verde-amarilla)
  haba: '#42663f', habaFlorBlanca: '#eceadd', habaFlorMancha: '#2a2620',
  maiz: '#6f8a3e', maizCana: '#8a9a54', maizSeco: '#c2a35a',
  // madera/costal/herramienta de la cosecha
  madera: '#8a6a45', maderaClara: '#c7ad7c', maderaVieja: '#6e4f30', costal: '#c9b48a', costalOscuro: '#a8905e',
  fique: '#b3924f', zinc: '#aab2b4', metal: '#8a8f92', feromona: '#d8d24a',
  // control biológico: mariquita (roja) contra el pulgón, avispita, polilla (parda) plaga
  mariquita: '#c8402e', mariquitaPunto: '#201a16', polilla: '#8a7a5e',
  // cielo frío alto / neblina azul-gris / sol pálido del altiplano
  cieloCenit: '#8fb0c6', cieloMedio: '#bcccce', cieloHorizonte: '#dfe2d4', nieblaFria: '#cdd6d2', sol: '#f4ecd2',
};
const col = (h) => new THREE.Color(h);
const mezcla = (a, b, t) => col(a).lerp(col(b), t);
const rand = (a, b) => a + Math.random() * (b - a);

// ── PRNG determinista (mismo papal cada carga: el gate compara) ───────────────
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── EL RELIEVE DE LA LADERA FRÍA (el papal ES ladera del altiplano) ───────────
// value-noise + fbm barato, sin cargar nada. La ladera SUBE hacia el fondo (-Z):
// los surcos trepan por el flanco. `alturaPapa` es la ÚNICA verdad del suelo —
// todo se ancla a ella. Un BANCAL casi plano cerca del usuario sostiene el
// escarbe de la cosecha (para que la papa no baile sobre el relieve).
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
const BANCAL = { x: 56, z: 40, r: 22 };   // explanada del escarbe/cosecha, cerca del usuario
const CLARO = { x: 16, z: 46, r: 18 };    // el claro de entrada: surco a la vista, sin matas altas tapando la cámara
function gauss(x, z, cx, cz, s) { const dx = x - cx, dz = z - cz; return Math.exp(-(dx * dx + dz * dz) / (2 * s * s)); }
function alturaPapa(x, z) {
  const pend = -z * 0.125;                             // sube hacia -Z (al páramo)
  const ond = (fbm(x * 0.010 + 22, z * 0.010 - 9) - 0.5) * 20;
  const micro = (fbm(x * 0.05, z * 0.05) - 0.5) * 2.6;
  let y = pend + ond + micro;
  const plano = gauss(x, z, BANCAL.x, BANCAL.z, 14);
  const yBancal = -BANCAL.z * 0.125 + 1.0;
  y = y * (1 - plano * 0.92) + yBancal * (plano * 0.92);
  return y;
}

// ── TALLER DE MALLAS ──────────────────────────────────────────────────────────
// pieza(geo, color) hornea el color por vértice; poner() la coloca; fusionar()
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
// ═══════════════════════════════════════════════════════════════════════════

// LA FLOR DE LA PAPA: estrella de cinco puntas con OJO amarillo. Blanca/lila/
// morada según la variedad. Se hornea DENTRO de la mata, alzada sobre el follaje
// (la flor sale con la tuberización: florecer = está cuajando abajo).
function pushFlor(p, x, y, z, color, esc = 1) {
  // cinco pétalos como estrella baja (icosaedros aplanados alrededor del ojo)
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    p.push(pieza(new THREE.IcosahedronGeometry(0.09 * esc, 0), color,
      [x + Math.cos(a) * 0.11 * esc, y, z + Math.sin(a) * 0.11 * esc], null, [1.5, 0.35, 1]));
  }
  // el ojo amarillo en el centro (los estambres)
  p.push(pieza(new THREE.IcosahedronGeometry(0.05 * esc, 0), C.florOjo, [x, y + 0.02 * esc, z], null, [1, 0.6, 1]));
}

// LA MATA DE PAPA (Solanum tuberosum): borla baja y frondosa de hoja compuesta
// verde-azulada, sobre el camellón. `enFlor` = alzando flores; `colorFlor` =
// blanca/lila/morada (la variedad). Se lee la borla baja a 30 m; la flor la
// delata de cerca. NO es un árbol: es tapiz.
function geomMataPapa(seed = 1, { enFlor = true, colorFlor = C.florLila, vigor = 1 } = {}) {
  const r = prng(seed), p = [];
  const H = (0.5 + r() * 0.28) * vigor;               // altura de la borla
  // tallitos que abren la mata (la papa ramifica desde la base)
  const NT = 4 + Math.floor(r() * 2);
  for (let i = 0; i < NT; i++) {
    const a = (i / NT) * Math.PI * 2 + r() * 0.6;
    p.push(pieza(new THREE.CylinderGeometry(0.02, 0.035, H * 0.9, 4), mezcla(C.papaHoja, C.maizCana, 0.2).getStyle(),
      [Math.cos(a) * 0.06, H * 0.42, Math.sin(a) * 0.06], [0, -a, (r() - 0.5) * 0.5]));
  }
  // el follaje: cúmulos de hoja compuesta apretados en domo bajo
  const NL = 9 + Math.floor(r() * 4);
  for (let i = 0; i < NL; i++) {
    const a = r() * Math.PI * 2, d = (0.1 + r() * 0.34) * vigor;
    const yy = H * (0.5 + r() * 0.7);
    p.push(pieza(new THREE.IcosahedronGeometry((0.15 + r() * 0.12) * vigor, 0),
      mezcla(C.papaHoja, r() < 0.5 ? C.papaHojaAzul : C.papaHojaMedia, r()).getStyle(),
      [Math.cos(a) * d, yy, Math.sin(a) * d], null, [1.25, 0.7, 1.25]));
  }
  // corona clara arriba (le pega el sol)
  p.push(pieza(new THREE.IcosahedronGeometry(0.2 * vigor, 0), C.papaHojaClara, [0, H * 1.05, 0], null, [1.3, 0.6, 1.3]));
  // LAS FLORES alzadas sobre el follaje (delatan la variedad)
  if (enFlor) {
    const nf = 2 + Math.floor(r() * 3);
    for (let f = 0; f < nf; f++) {
      const a = r() * Math.PI * 2, d = (0.08 + r() * 0.26) * vigor;
      // tallito floral por encima de la borla
      const fx = Math.cos(a) * d, fz = Math.sin(a) * d, fy = H * (1.05 + r() * 0.28);
      p.push(pieza(new THREE.CylinderGeometry(0.012, 0.016, fy - H * 0.6, 4), C.papaHojaMedia, [fx, (fy + H * 0.6) / 2, fz]));
      pushFlor(p, fx, fy, fz, colorFlor, 0.9 + r() * 0.4);
    }
  }
  return fusionar(p);
}

// EL ASOCIO · MATA DE HABA (Vicia faba): planta ERGUIDA más alta que la papa,
// hoja gris-verde, flor blanca de mancha negra. Fija nitrógeno y rompe el
// monocultivo. Se lee por la columna erguida junto a la borla baja de la papa.
function geomHaba(seed = 2) {
  const r = prng(seed), p = [];
  const H = 1.3 + r() * 0.5;
  const NT = 2 + Math.floor(r() * 2);
  for (let t = 0; t < NT; t++) {
    const bx = (r() - 0.5) * 0.2, bz = (r() - 0.5) * 0.2, lean = (r() - 0.5) * 0.2;
    p.push(pieza(new THREE.CylinderGeometry(0.03, 0.05, H, 5), mezcla(C.haba, C.maizCana, 0.25).getStyle(),
      [bx, H / 2, bz], [0, 0, lean]));
    // pares de hojas a lo largo del tallo
    for (let h = 0; h < 4; h++) {
      const yy = H * (0.3 + h * 0.17);
      for (const s of [-1, 1]) {
        p.push(pieza(new THREE.IcosahedronGeometry(0.16, 0), mezcla(C.haba, C.papaHojaClara, 0.3).getStyle(),
          [bx + s * 0.18 + lean * yy, yy, bz], null, [1.4, 0.3, 0.9]));
      }
    }
    // flores blancas de mancha negra
    for (let fF = 0; fF < 2; fF++) {
      const yy = H * (0.45 + fF * 0.25);
      p.push(pieza(new THREE.IcosahedronGeometry(0.07, 0), C.habaFlorBlanca, [bx + 0.16 + lean * yy, yy, bz], null, [1, 0.9, 0.6]));
      p.push(pieza(new THREE.IcosahedronGeometry(0.03, 0), C.habaFlorMancha, [bx + 0.19 + lean * yy, yy, bz], null, [1, 0.9, 0.6]));
    }
  }
  return fusionar(p);
}

// EL ASOCIO · CAÑA DE MAÍZ: columna alta con hojas lanceoladas colgando y la
// borla arriba. El maíz alto da sombra ligera y viento roto al papal. Se lee por
// la caña esbelta rematada en penacho.
function geomMaiz(seed = 3) {
  const r = prng(seed), p = [];
  const H = 2.0 + r() * 0.8;
  p.push(pieza(new THREE.CylinderGeometry(0.05, 0.08, H, 6), C.maizCana, [0, H / 2, 0]));
  for (let h = 0; h < 6; h++) {
    const yy = H * (0.28 + h * 0.12), a = h * 1.4 + r();
    p.push(pieza(new THREE.IcosahedronGeometry(0.5, 0), mezcla(C.maiz, C.maizCana, r()).getStyle(),
      [Math.cos(a) * 0.28, yy, Math.sin(a) * 0.28], [0, -a, 0.5], [1.9, 0.16, 0.5]));
  }
  // el penacho (la flor macho arriba)
  p.push(pieza(new THREE.ConeGeometry(0.1, 0.7, 5), C.maizSeco, [0, H + 0.25, 0]));
  return fusionar(p);
}

// TUBÉRCULO suelto (para el escarbe y el costal): variedad por color/forma.
// crio=criolla amarilla redonda · past=pastusa crema con ojos · capi=capiro morado.
function geomTuberculo(tipo, seed = 5) {
  const r = prng(seed), p = [];
  if (tipo === 'criolla') {
    p.push(pieza(new THREE.IcosahedronGeometry(0.12 + r() * 0.03, 0), mezcla(C.papaCriolla, C.papaCriollaBrillo, r()).getStyle(), [0, 0, 0], null, [1, 0.92, 1.05]));
  } else if (tipo === 'pastusa') {
    p.push(pieza(new THREE.IcosahedronGeometry(0.19 + r() * 0.04, 0), C.pastusa, [0, 0, 0], null, [1.3, 0.85, 1]));
    // ojos rosados hundidos
    for (let i = 0; i < 3; i++) { const a = r() * 6.28; p.push(pieza(new THREE.IcosahedronGeometry(0.03, 0), C.pastusaOjo, [Math.cos(a) * 0.16, 0.02, Math.sin(a) * 0.1])); }
  } else if (tipo === 'capiro') {
    p.push(pieza(new THREE.IcosahedronGeometry(0.2 + r() * 0.04, 0), mezcla(C.capiro, C.capiroBrillo, r() * 0.5).getStyle(), [0, 0, 0], null, [1.2, 0.9, 1]));
  } else { // sabanera
    p.push(pieza(new THREE.IcosahedronGeometry(0.18 + r() * 0.04, 0), C.sabanera, [0, 0, 0], null, [1.35, 0.8, 1]));
  }
  return fusionar(p);
}

// SEMILLA SELECCIONADA: tubérculo con GRELOS verdes (brotes) — la que se guarda
// para la próxima siembra. Enseña "semilla propia sana", no comprar cada ciclo.
function geomSemilla(seed = 6) {
  const r = prng(seed), p = [];
  p.push(pieza(new THREE.IcosahedronGeometry(0.16, 0), mezcla(C.pastusa, C.sabanera, r()).getStyle(), [0, 0, 0], null, [1.25, 0.85, 1]));
  // los grelos (brotes cortos verdes en los ojos)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 6.28 + r();
    p.push(pieza(new THREE.CylinderGeometry(0.012, 0.02, 0.1 + r() * 0.06, 4), C.grelo,
      [Math.cos(a) * 0.12, 0.08, Math.sin(a) * 0.08], [0, 0, (r() - 0.5) * 0.8]));
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
let _sombraTex = null;
function sombraTex() {
  if (_sombraTex) return _sombraTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d'), r = 64;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(24,20,14,0.5)'); g.addColorStop(0.6, 'rgba(24,20,14,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  _sombraTex = new THREE.CanvasTexture(cv);
  return _sombraTex;
}

// ── FAUNA · el control biológico y su plaga (sprites pintados) ────────────────
// La MARIQUITA (roja de puntos) se come al pulgón; la POLILLA parda (Tecia
// solanivora, la guatemalteca) es la plaga que la trampa de feromona atrapa. Se
// enseña que se maneja con bichos y trampa, no bañando la mata en veneno.
function mariquitaTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#c8402e'; c.beginPath(); c.ellipse(32, 34, 12, 11, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#201a16';
  c.fillRect(31, 22, 2, 24);                                    // línea del élitro
  for (const [px, py] of [[24, 30], [40, 30], [26, 40], [38, 40], [32, 26]]) { c.beginPath(); c.arc(px, py, 2.6, 0, Math.PI * 2); c.fill(); }
  c.beginPath(); c.arc(32, 22, 5, 0, Math.PI * 2); c.fill();    // cabeza
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function polillaTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#8a7a5e';
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(32 + sx * 9, 30, 8, 6, sx * 0.3, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#5c4e3a'; c.fillRect(31, 24, 2, 18);           // cuerpo
  c.fillStyle = 'rgba(60,50,36,0.5)';
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(32 + sx * 9, 38, 6, 4, 0, 0, Math.PI * 2); c.fill(); }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}

// ═══════════════════════════════════════════════════════════════════════════
//  INIT — monta el mundo autónomo
// ═══════════════════════════════════════════════════════════════════════════
export function initPapa() {
  const params = new URLSearchParams(location.search);
  const camModo = params.get('cam');          // `hero`/`surcos`/`cosecha` = cuadros fijos del gate

  // ── SUPRIMIR EL VALLE (main.js corre detrás) ────────────────────────────────
  const sup = document.createElement('style');
  sup.textContent =
    'body.enPapa #c,body.enPapa #onb,body.enPapa #load,body.enPapa #hud,' +
    'body.enPapa #capaLugares,body.enPapa #barraMover,body.enPapa #guiaSel,' +
    'body.enPapa #guiaV,body.enPapa #ventanaM,body.enPapa #compaiFotoBtn,' +
    'body.enPapa #mmapa{display:none!important}' +
    'body.enPapa{background:#0f120f}';
  document.head.appendChild(sup);
  document.body.classList.add('enPapa');
  const pararValle = () => { try { window.__r && window.__r.setAnimationLoop(null); } catch (e) { /* aún no */ } };
  pararValle(); setTimeout(pararValle, 300); setTimeout(pararValle, 1200);

  // ── CANVAS + RENDERER PROPIOS ───────────────────────────────────────────────
  const canvas = document.createElement('canvas'); canvas.id = 'cPapa';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:20;touch-action:none';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.__r = renderer;                        // hook del gate (draw calls + renderer)
  window.__rPapa = renderer;

  const scene = new THREE.Scene();
  scene.background = cieloFrio();
  scene.fog = new THREE.FogExp2(0xcdd6d2, 0.0019);   // neblina fría LEVE: se lee la ladera, no un velo

  const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, 0.4, 1400);
  window.__cam = camera; window.__scene = scene;
  window.__h = alturaPapa;                       // sonda del gate

  const raiz = new THREE.Group(); scene.add(raiz);

  // ── LUZ: sol pálido y neutro del altiplano + relleno frío del cielo ─────────
  scene.add(new THREE.HemisphereLight(0xdfe4d8, 0x40463a, 0.85));
  const sol = new THREE.DirectionalLight(0xf6efd6, 1.7);
  sol.position.set(78, 104, 66); scene.add(sol);
  const relleno = new THREE.DirectionalLight(0xa8c4d0, 0.4);
  relleno.position.set(-66, 42, -58); scene.add(relleno);

  // ── EL SUELO DE LA LADERA FRÍA (tierra parda + surcos teñidos, con relieve) ──
  raiz.add(construirSuelo());

  const rr = prng(3517);
  // las matas y el asocio respetan el bancal Y el claro de entrada (no tapan la cámara)
  const libre = (x, z) => Math.hypot(x - BANCAL.x, z - BANCAL.z) > BANCAL.r
    && Math.hypot(x - CLARO.x, z - CLARO.z) > CLARO.r;

  function sembrar(geom, n, { rmin, escala, pred, extentX = [-150, 130], extentZ = [-150, 150] }) {
    const puestos = [];
    const inst = new THREE.InstancedMesh(geom, MAT_VEG, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    let hechos = 0, intentos = 0;
    while (hechos < n && intentos < n * 60) {
      intentos++;
      const x = rand(extentX[0], extentX[1]), z = rand(extentZ[0], extentZ[1]);
      if (pred && !pred(x, z)) continue;
      if (!puestos.every((qp) => Math.hypot(qp.x - x, qp.z - z) > rmin)) continue;
      const y = alturaPapa(x, z);
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

  // ── EL PAPAL: CAMELLONES APORCADOS Y MATAS A CURVA DE NIVEL ──────────────────
  plantarPapalEnSurcos(raiz, rr, libre);

  // ── EL ASOCIO al filo del lote: haba (fija nitrógeno) + maíz (rompe el viento)
  //    Enseña que NO es monocultivo: hay compañía, y el lote de al lado descansa.
  sembrar(geomHaba(41), 26, { rmin: 3.0, escala: [0.85, 1.15], pred: (x, z) => libre(x, z) && x > 44 && z > -10 });
  sembrar(geomMaiz(42), 16, { rmin: 4.5, escala: [0.85, 1.2], pred: (x, z) => libre(x, z) && x > 52 && z < 20 });
  // piedras sueltas del altiplano, ancladas
  sembrar(geomPiedra(43), 40, { rmin: 3.0, escala: [0.6, 1.6], pred: libre });

  // ── LA MATA MADRE: una papa florecida en primer plano, al filo del claro ─────
  //    (no tapa el eje: queda a un lado, con las flores a la vista).
  const ppX = 5, ppZ = 22, ppY = alturaPapa(ppX, ppZ);
  const mataMadre = new THREE.Mesh(geomMataPapa(555, { enFlor: true, colorFlor: C.florLila, vigor: 1.5 }), MAT_VEG);
  mataMadre.position.set(ppX, ppY, ppZ); mataMadre.scale.setScalar(2.4); mataMadre.rotation.y = 1.8;
  mataMadre.frustumCulled = false;
  raiz.add(mataMadre);
  raiz.add(sombraPlano(2.2, ppX, ppY + 0.04, ppZ));

  // ── EL ESCARBE / COSECHA: el camellón abierto con la papa, el costal de la ────
  //    cosecha, la semilla seleccionada y la trampa del control biológico.
  const escarbe = construirCosecha();
  raiz.add(escarbe.group);

  // ── neblina fría suspendida (aire vivo del altiplano) ───────────────────────
  const motas = construirMotas();
  raiz.add(motas.points);

  // ── FAUNA: control biológico (mariquitas) + la polilla plaga que cae en la trampa
  const fauna = construirFauna();
  raiz.add(fauna.group);

  // ── CÁMARA: vista 3/4 ELEVADA sobre el claro — se lee el papal entero: el surco
  //    en primer plano, la mata madre florecida, el escarbe y los camellones a
  //    curva de nivel subiendo hasta la neblina. NO enterrada en el follaje.
  const gCam = alturaPapa(34, 58);
  const HERO_POS = new THREE.Vector3(34, gCam + 15, 58);
  const HERO_TGT = new THREE.Vector3(-14, alturaPapa(-14, -18) + 4, -18);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 5; controls.maxDistance = 260;
  controls.maxPolarAngle = 1.52;               // no meterse bajo el suelo
  controls.target.copy(HERO_TGT);
  controls.enabled = false;
  window.__ctl = controls;

  let introDone = false, introStart = null;
  const introPos = new THREE.CatmullRomCurve3([
    new THREE.Vector3(94, gCam + 58, 146),     // alto, entrando por el flanco
    new THREE.Vector3(64, gCam + 36, 106),
    new THREE.Vector3(45, gCam + 21, 80),      // baja sobre el claro
    HERO_POS.clone(),
  ]);
  const introTgt = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8, gCam + 13, -8),
    new THREE.Vector3(-12, gCam + 7, -12),
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
  } else if (camModo === 'surcos') {
    // PRUEBA el aporque a curva de nivel: de perfil, los camellones que ondulan
    // siguiendo el contorno del monte, con la papa florecida encima.
    introDone = true;
    camera.position.set(-82, alturaPapa(-82, 22) + 9, 22);
    camera.lookAt(-4, alturaPapa(-4, -20) + 4, -20);
  } else if (camModo === 'cosecha') {
    // el escarbe abierto + el costal de la cosecha + la semilla, de cerca.
    introDone = true;
    const gy = alturaPapa(BANCAL.x, BANCAL.z);
    camera.position.set(BANCAL.x + 15, gy + 5, BANCAL.z + 17);
    camera.lookAt(BANCAL.x - 1, gy + 1.2, BANCAL.z);
  } else if (params.get('onb') === '0') {
    // lanzamiento directo (y el gate): sin vuelo de intro — al cuadro hero, con
    // los controles ya vivos (determinista para la captura).
    introDone = true;
    darControl();
  } else {
    camera.position.copy(introPos.getPoint(0)); camera.lookAt(introTgt.getPoint(0));
  }

  // ── HUD: la leyenda del PAPAL AGROECOLÓGICO (instruccional, en usted) ─────────
  montarLeyenda();
  const avisar = montarAvisoYSalida();

  // ── raycast: la mata madre → aporque/variedades · el escarbe → rotación/control
  const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
  let dx0 = 0, dy0 = 0, dt0 = 0;
  canvas.addEventListener('pointerdown', (e) => { dx0 = e.clientX; dy0 = e.clientY; dt0 = performance.now(); });
  canvas.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - dx0, e.clientY - dy0) > 9 || performance.now() - dt0 > 600) return;
    pt.x = (e.clientX / innerWidth) * 2 - 1; pt.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(pt, camera);
    if (ray.intersectObject(escarbe.group, true).length) { tarjetaRotacion(); return; }
    if (ray.intersectObject(mataMadre, true).length) tarjetaVariedades();
  });

  // ── POST: bloom frío y suave (la flor y la neblina al sol pálido) ────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.24, 0.7, 0.86));
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
    escarbe.update(t);
    fauna.update(t, camera);
    motas.update(t);
    composer.render();
  });

  window.__papa = { scene, camera, renderer, controls, escarbe };
  return window.__papa;
}

// ── CIELO FRÍO (degradé celeste-gris a crema neblinoso abajo, mañana alta) ─────
function cieloFrio() {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 512;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.00, C.cieloCenit);
  g.addColorStop(0.45, C.cieloMedio);
  g.addColorStop(0.78, C.nieblaFria);
  g.addColorStop(1.00, C.cieloHorizonte);
  c.fillStyle = g; c.fillRect(0, 0, 16, 512);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

// ── EL SUELO: heightfield tierra fría parda + surcos oscuros teñidos ───────────
function construirSuelo() {
  const SIZE = 560, SEG = 150;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colr = new Float32Array(pos.count * 3);
  // el suelo del papal va CULTIVADO: tierra parda-gris con las líneas del surco/
  // aporque más oscuras (humedad) y el camellón más claro (donde le da el sol).
  const CENTRO = { x: -10, z: -300 };
  const camel = col(C.camellon), camelSol = col(C.camellonSol), surco = col(C.tierraSurco);
  const mant = col(C.mantillo), solTinte = col('#e2d3ac'), base = col(C.tierra);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = alturaPapa(x, z);
    pos.setY(i, y);
    tmp.copy(base);
    // el patrón del APORQUE: bandas concéntricas (curva de nivel) claras/oscuras
    const R = Math.hypot(x - CENTRO.x, z - CENTRO.z);
    const surcoK = 0.5 + 0.5 * Math.sin(R * 0.42);          // la onda del camellón-surco
    tmp.lerp(camel, THREE.MathUtils.clamp(surcoK - 0.35, 0, 1) * 0.55);
    if (surcoK < 0.28) tmp.lerp(surco, (0.28 - surcoK) * 2.2);   // fondo del surco: húmedo, oscuro
    // vetas de tierra revuelta y materia orgánica
    if (fbm(x * 0.09, z * 0.09) < 0.24) tmp.lerp(mant, 0.3);
    const rojaK = fbm(x * 0.05 + 7, z * 0.05 - 9);
    if (rojaK > 0.64) tmp.lerp(camelSol, (rojaK - 0.64) * 1.2);
    const dap = THREE.MathUtils.clamp((fbm(x * 0.08 + 2, z * 0.08 - 6) - 0.45) * 2, 0, 1);
    tmp.lerp(solTinte, dap * 0.1);
    colr[i * 3] = tmp.r; colr[i * 3 + 1] = tmp.g; colr[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
}

// ── EL PAPAL EN CAMELLONES A CURVA DE NIVEL ───────────────────────────────────
// El aporque no va ladera abajo sino ATRAVESADO a la pendiente, a CURVA DE NIVEL,
// para frenar el agua. Se construye el CAMELLÓN (segmento de tierra montada,
// tangente al contorno) y se planta la papa ENCIMA, borla tras borla. Tres
// variantes de flor (blanca/lila/morada) para que no sea un papal de clones.
function plantarPapalEnSurcos(raiz, rr, libre) {
  const geoBlanca = geomMataPapa(101, { enFlor: true, colorFlor: C.florBlanca });
  const geoLila = geomMataPapa(202, { enFlor: true, colorFlor: C.florLila });
  const geoMorada = geomMataPapa(303, { enFlor: true, colorFlor: C.florMorada });
  const geoVerde = geomMataPapa(404, { enFlor: false });        // matas jóvenes sin flor
  const geoCamellon = geomCamellon(707);
  const CENTRO = { x: -10, z: -300 };
  const enLote = (x, z) => libre(x, z) && x > -130 && x < 96 && z > -80 && z < 92;
  const matas = { blanca: [], lila: [], morada: [], verde: [] };
  const camellones = [];
  // radios cerrados (camellones ~1.9 m aparte: el papal es de líneas apretadas)
  for (let R = 208; R < 340; R += 1.9) {
    const paso = 4.6 / R;                                       // segmento de camellón cada ~4.6 m de arco
    for (let a = -0.98; a < 0.98; a += paso) {
      const x = CENTRO.x + Math.sin(a) * R;
      const z = CENTRO.z + Math.cos(a) * R;
      if (!enLote(x, z)) continue;
      const tang = a + Math.PI / 2;                             // el camellón corre tangente al contorno
      camellones.push({ x, z, rotY: tang });
      // matas sobre el lomo del camellón, ~1.4 m aparte a lo largo
      const nM = 3;
      for (let k = 0; k < nM; k++) {
        const off = (k - (nM - 1) / 2) * 1.4;
        const mx = x + Math.cos(tang) * off + (rr() - 0.5) * 0.4;
        const mz = z + Math.sin(tang) * off + (rr() - 0.5) * 0.4;
        if (!enLote(mx, mz)) continue;
        const u = rr();
        const cual = u < 0.12 ? 'verde' : u < 0.5 ? 'lila' : u < 0.78 ? 'blanca' : 'morada';
        matas[cual].push({ x: mx, z: mz });
      }
    }
  }
  // colocar los camellones (tierra montada, orientada al contorno)
  if (camellones.length) {
    const inst = new THREE.InstancedMesh(geoCamellon, MAT_VEG, camellones.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    camellones.forEach((c, k) => {
      const y = alturaPapa(c.x, c.z);
      pos.set(c.x, y, c.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.rotY);
      s.set(1, 0.9 + rr() * 0.2, 1); m.compose(pos, q, s); inst.setMatrixAt(k, m);
    });
    inst.instanceMatrix.needsUpdate = true; inst.frustumCulled = false; raiz.add(inst);
  }
  const colocar = (geom, lista, escBase) => {
    if (!lista.length) return;
    const inst = new THREE.InstancedMesh(geom, MAT_VEG, lista.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    lista.forEach((pt, k) => {
      const y = alturaPapa(pt.x, pt.z) + 0.28;                  // sobre el lomo del camellón
      const e = escBase + rr() * 0.5;
      pos.set(pt.x, y, pt.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr() * Math.PI * 2);
      s.set(e, e * (0.92 + rr() * 0.16), e);
      m.compose(pos, q, s); inst.setMatrixAt(k, m);
    });
    inst.instanceMatrix.needsUpdate = true; inst.frustumCulled = false; raiz.add(inst);
  };
  colocar(geoBlanca, matas.blanca, 1.05);
  colocar(geoLila, matas.lila, 1.05);
  colocar(geoMorada, matas.morada, 1.05);
  colocar(geoVerde, matas.verde, 0.9);
}

// EL CAMELLÓN DEL APORQUE: lomo de tierra montada, alargado, tangente al surco.
// Cara al sol más clara, base más oscura (húmeda). Es la firma del papal.
function geomCamellon(seed = 707) {
  const r = prng(seed), p = [];
  // un prisma bajo y largo (a lo largo de X = tangente): media caña de tierra
  const L = 4.9;
  p.push(pieza(new THREE.CylinderGeometry(0.55, 0.72, L, 7, 1), C.camellon, [0, 0.2, 0], [0, 0, Math.PI / 2], [0.7, 1, 1]));
  // costados terrosos (dan volumen y sombra al surco)
  for (const s of [-1, 1]) {
    p.push(pieza(new THREE.BoxGeometry(L, 0.34, 0.5), mezcla(C.tierra, C.tierraSurco, 0.4).getStyle(),
      [0, 0.02, s * 0.5], [0, 0, 0], [1, 1, 1]));
  }
  // motas de tierra revuelta encima (el aporque recién hecho)
  for (let i = 0; i < 6; i++) {
    p.push(pieza(new THREE.IcosahedronGeometry(0.12 + r() * 0.06, 0), r() < 0.5 ? C.camellonSol : C.tierra,
      [(r() - 0.5) * L * 0.9, 0.42, (r() - 0.5) * 0.5]));
  }
  return fusionar(p);
}

// PIEDRA suelta del altiplano (ancla el suelo, rompe el tapiz)
function geomPiedra(seed = 43) {
  const r = prng(seed), p = [];
  p.push(pieza(new THREE.IcosahedronGeometry(0.4 + r() * 0.3, 0), mezcla(C.piedra, C.tierra, r() * 0.5).getStyle(), [0, 0.16, 0], null, [1.2, 0.6, 1]));
  return fusionar(p);
}

// ── sombra de contacto como plano ────────────────────────────────────────────
function sombraPlano(r, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: sombraTex(), transparent: true, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL ESCARBE / COSECHA — el camellón abierto con la papa asomada, el costal de
//  la cosecha por variedades, la semilla seleccionada y la trampa del control
//  biológico. El elemento vivido que hace del mundo un papal DE VERDAD (y enseña
//  la rotación, las variedades y el manejo sin veneno).
// ═══════════════════════════════════════════════════════════════════════════
function construirCosecha() {
  const g = new THREE.Group();
  const bx = BANCAL.x, bz = BANCAL.z, by = alturaPapa(bx, bz);
  g.position.set(bx, by, bz);
  const matTierra = new THREE.MeshStandardMaterial({ color: col(C.tierraHumeda), roughness: 1, flatShading: true });
  const matMad = new THREE.MeshStandardMaterial({ color: col(C.madera), roughness: 1, flatShading: true });
  const matMadC = new THREE.MeshStandardMaterial({ color: col(C.maderaClara), roughness: 1, flatShading: true });
  const matCostal = new THREE.MeshStandardMaterial({ color: col(C.costal), roughness: 1, flatShading: true });
  const matMetal = new THREE.MeshStandardMaterial({ color: col(C.metal), roughness: 0.5, metalness: 0.25, flatShading: true });

  // ── EL CAMELLÓN ABIERTO: un tramo de surco escarbado, tierra oscura removida,
  //    con los tubérculos de la mata asomando. La mata arrancada al lado.
  const trinchera = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.3, 2.2), matTierra);
  trinchera.position.set(-1.5, 0.15, 0); g.add(trinchera);
  // lomos de tierra removida a los lados
  for (const s of [-1, 1]) {
    const lomo = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 6.5, 6), matTierra);
    lomo.rotation.z = Math.PI / 2; lomo.position.set(-1.5, 0.32, s * 1.3); g.add(lomo);
  }
  // LOS TUBÉRCULOS asomados en la trinchera (variedades andinas reales)
  const tipos = ['criolla', 'criolla', 'pastusa', 'capiro', 'sabanera'];
  const rp = prng(880);
  const tuberMats = {
    criolla: new THREE.MeshStandardMaterial({ color: col(C.papaCriolla), roughness: 0.85, flatShading: true }),
    pastusa: new THREE.MeshStandardMaterial({ color: col(C.pastusa), roughness: 0.9, flatShading: true }),
    capiro: new THREE.MeshStandardMaterial({ color: col(C.capiro), roughness: 0.9, flatShading: true }),
    sabanera: new THREE.MeshStandardMaterial({ color: col(C.sabanera), roughness: 0.9, flatShading: true }),
  };
  for (let i = 0; i < 20; i++) {
    const tp = tipos[Math.floor(rp() * tipos.length)];
    const mesh = new THREE.Mesh(geomTuberculo(tp, 900 + i), MAT_VEG);
    // los de MAT_VEG ya vienen coloreados; usamos su geom horneada
    mesh.position.set(-4.4 + rp() * 5.8, 0.34 + rp() * 0.08, (rp() - 0.5) * 1.6);
    mesh.rotation.set(rp() * 3, rp() * 3, rp() * 3);
    mesh.scale.setScalar(0.9 + rp() * 0.5);
    g.add(mesh);
  }
  // la mata recién arrancada, tumbada al borde con su terrón
  const mataArr = new THREE.Mesh(geomMataPapa(950, { enFlor: true, colorFlor: C.florBlanca }), MAT_VEG);
  mataArr.position.set(-4.8, 0.4, 1.5); mataArr.rotation.z = 1.5; mataArr.scale.setScalar(1.3); g.add(mataArr);

  // ── EL COSTAL DE LA COSECHA: fibra, rebosado de papa (sorteada por variedad) ──
  const costal = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 2.0, 10), matCostal);
  costal.position.set(3.2, 1.0, 1.4); g.add(costal);
  const boca = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.16, 6, 12), matCostal);
  boca.position.set(3.2, 2.0, 1.4); boca.rotation.x = Math.PI / 2; g.add(boca);
  // la papa asomando por la boca del costal (montón)
  const monton = [];
  for (let i = 0; i < 16; i++) {
    const tp = tipos[Math.floor(rp() * tipos.length)];
    const a = rp() * 6.28, d = rp() * 0.7;
    const per = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + rp() * 0.06, 0), tuberMats[tp]);
    per.position.set(3.2 + Math.cos(a) * d, 2.05 + rp() * 0.35, 1.4 + Math.sin(a) * d);
    per.scale.set(1.2, 0.85, 1); per.rotation.set(rp(), rp(), rp()); g.add(per);
    monton.push(per);
  }
  // papas derramadas al pie del costal
  for (let i = 0; i < 6; i++) {
    const per = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), tuberMats.criolla);
    per.position.set(2.0 + rp() * 1.6, 0.16, 2.4 + rp() * 1.2); per.scale.set(1.1, 0.8, 1); g.add(per);
  }

  // ── LA MESA DE LA SEMILLA SELECCIONADA: bandeja de madera con semilla engrelada
  //    (la que se guarda para la próxima siembra: semilla propia sana).
  const mesa = new THREE.Group(); mesa.position.set(-1.5, 0, -3.6); g.add(mesa);
  for (const [px, pz] of [[-1.6, -0.7], [1.6, -0.7], [-1.6, 0.7], [1.6, 0.7]]) {
    const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6), matMad);
    pata.position.set(px, 0.4, pz); mesa.add(pata);
  }
  const tabla = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.8), matMadC);
  tabla.position.set(0, 0.82, 0); mesa.add(tabla);
  const bordes = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.1), matMad);
  bordes.position.set(0, 0.92, -0.85); mesa.add(bordes);
  const semillas = [];
  for (let ix = 0; ix < 5; ix++) {
    for (let iz = 0; iz < 3; iz++) {
      const s = new THREE.Mesh(geomSemilla(700 + ix * 7 + iz), MAT_VEG);
      s.position.set(-1.3 + ix * 0.65, 0.98, -0.5 + iz * 0.5);
      s.scale.setScalar(1.15); s.rotation.y = rp() * 6.28; mesa.add(s);
      semillas.push(s);
    }
  }

  // ── LA TRAMPA DE FEROMONA (control biológico de la polilla guatemalteca): ─────
  //    estaca con la tapa amarilla y el vaso — atrapa el macho, no envenena la mata.
  const trampa = new THREE.Group(); trampa.position.set(5.6, 0, -2.4); g.add(trampa);
  const estaca = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.8, 6), matMad);
  estaca.position.set(0, 0.9, 0); trampa.add(estaca);
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: col(C.feromona), roughness: 0.6, flatShading: true }));
  tapa.position.set(0, 1.85, 0); trampa.add(tapa);
  const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.2, flatShading: true }));
  vaso.position.set(0, 1.5, 0); trampa.add(vaso);

  // ── EL AZADÓN de escarbar, clavado en el lomo de tierra ──────────────────────
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.0, 6), matMadC);
  cabo.position.set(-5.4, 1.4, -0.6); cabo.rotation.z = 0.5; g.add(cabo);
  const pala = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), matMetal);
  pala.position.set(-6.6, 0.35, -0.6); pala.rotation.z = 0.4; g.add(pala);

  // update: la semilla y el montón respiran apenas (la cosecha está viva)
  function update(t) {
    for (let i = 0; i < semillas.length; i++) semillas[i].rotation.z = Math.sin(t * 0.7 + i) * 0.05;
    for (let i = 0; i < monton.length; i++) monton[i].position.y += Math.sin(t * 1.2 + i) * 0.0006;
  }
  return { group: g, update };
}

// ── neblina fría suspendida (el aire del altiplano) ───────────────────────────
function construirMotas() {
  const N = 240, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), base = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = rand(-90, 90), z = rand(-90, 60), y = alturaPapa(x, z) + rand(1.5, 14);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; base[i] = y;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: motaTex(), color: 0xdfe6e0, size: 0.55, sizeAttenuation: true,
    transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const update = (t) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] = base[i] + Math.sin(t * 0.35 + i * 1.3) * 0.7;
      p[i * 3] += Math.sin(t * 0.18 + i) * 0.006;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points, update };
}

// ── FAUNA: mariquitas (control biológico) + polillas (la plaga hacia la trampa) ─
function construirFauna() {
  const g = new THREE.Group();
  const bichos = [];
  const maTex = mariquitaTex(), poTex = polillaTex();
  const rf = prng(9101);
  const focos = [
    { x: -18, z: -14, y: alturaPapa(-18, -14) + 1.6 },     // sobre las matas florecidas
    { x: -4, z: -28, y: alturaPapa(-4, -28) + 1.4 },
    { x: -30, z: -6, y: alturaPapa(-30, -6) + 1.4 },
    { x: BANCAL.x + 5.6, z: BANCAL.z - 2.4, y: alturaPapa(BANCAL.x + 5.6, BANCAL.z - 2.4) + 1.7 }, // la trampa
  ];
  for (let i = 0; i < 14; i++) {
    const esMari = i < 9;
    const mat = new THREE.SpriteMaterial({ map: esMari ? maTex : poTex, transparent: true, depthWrite: false, fog: false });
    const sp = new THREE.Sprite(mat);
    const foco = esMari ? focos[i % 3] : focos[3];            // las polillas rondan la trampa
    const s = esMari ? 0.5 : 0.6;
    sp.scale.set(s, s, s);
    bichos.push({ sp, foco, r: 1.0 + rf() * 2.2, ph: rf() * Math.PI * 2, sp2: 0.5 + rf() * 0.9, yb: (rf() - 0.5) * 1.2, esMari });
    g.add(sp);
  }
  function update(t) {
    for (const b of bichos) {
      const a = t * b.sp2 + b.ph;
      b.sp.position.set(
        b.foco.x + Math.cos(a) * b.r,
        b.foco.y + b.yb + Math.sin(a * 1.7) * 0.6,
        b.foco.z + Math.sin(a) * b.r,
      );
    }
  }
  return { group: g, update };
}

// ── HUD: la leyenda del PAPAL AGROECOLÓGICO (instruccional, en usted) ──────────
function montarLeyenda() {
  const CAPAS = [
    { c: '#b7a4d6', n: 'La flor delata la mata', h: 'blanca / lila / morada', d: 'La papa (Solanum tuberosum) es una mata baja y frondosa. Su flor de cinco puntas con ojo amarillo cambia de color según la variedad, y sale con la tuberización: florecer avisa que abajo está cuajando.' },
    { c: '#8a6a4a', n: 'El aporque tapa la papa', h: 'a curva de nivel', d: 'Se arrima el camellón de tierra al pie para tapar el tubérculo: si le da el sol se enverdece y amarga (solanina). El surco va atravesado a la pendiente, a curva de nivel, para que el agua no se lleve la tierra.' },
    { c: '#e6be3e', n: 'No sólo la comercial', h: 'variedades andinas', d: 'Al escarbar aparecen la papa criolla amarilla (Solanum phureja), la pastusa, la sabanera, la Diacol Capiro morada. Se guarda semilla propia sana (con grelos) para no comprar cada ciclo.' },
    { c: '#c8402e', n: 'Rotar, no envenenar', h: 'manejo agroecológico', d: 'Nunca papa-tras-papa: la rotación y el asocio con haba y maíz cortan la gota (Phytophthora) y el gusano. La polilla se maneja con trampa de feromona y enemigos naturales, no bañando la mata en fungicida.' },
  ];
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:14px;top:14px;z-index:30;max-width:min(40vw,360px);' +
    'font-family:system-ui,-apple-system,sans-serif;color:#f0f2ec;pointer-events:none';
  let html = '<div style="font-size:1.05rem;font-weight:700;text-shadow:0 2px 10px rgba(0,0,0,.7);margin-bottom:2px">🥔 El papal</div>' +
    '<div style="font-size:.72rem;opacity:.82;text-shadow:0 1px 6px rgba(0,0,0,.8);margin-bottom:9px">Tierra fría · surco aporcado a curva de nivel · del aporque a la cosecha</div>';
  for (const e of CAPAS) {
    html += '<div style="display:flex;gap:8px;margin-bottom:7px;background:linear-gradient(90deg,rgba(14,18,14,.72),rgba(14,18,14,.26));' +
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
  salir.style.cssText = 'position:fixed;right:14px;top:14px;z-index:31;border:1px solid rgba(190,214,200,.4);' +
    'background:rgba(14,18,14,.8);color:#f0f2ec;border-radius:999px;padding:8px 16px;font:600 .8rem system-ui,sans-serif;' +
    'cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4)';
  salir.onclick = () => { location.href = './'; };
  document.body.appendChild(salir);

  return function avisar() {
    let el = document.getElementById('papaToast');
    if (!el) {
      el = document.createElement('div'); el.id = 'papaToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:40;' +
        'background:rgba(14,18,14,.92);color:#f0f2ec;border:1px solid rgba(190,214,200,.35);border-radius:999px;' +
        'padding:10px 20px;font:500 .88rem system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:opacity .4s';
      document.body.appendChild(el);
    }
    el.textContent = '🥔 Está en el papal · arrastre para mirar · toque el escarbe o la mata madre';
    el.style.opacity = '1';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 4200);
  };
}

// ── tarjeta de las VARIEDADES y el aporque (qué es la papa y por qué se tapa) ──
function tarjetaVariedades() {
  let el = document.getElementById('papaVariedadesCarta');
  if (el) { el.remove(); return; }
  el = document.createElement('div'); el.id = 'papaVariedadesCarta';
  el.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:45;max-width:min(88vw,440px);' +
    'background:rgba(14,18,14,.95);color:#f0f2ec;border:1px solid rgba(230,190,62,.5);border-radius:16px;padding:16px 18px;' +
    'font-family:system-ui,-apple-system,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,.55)';
  el.innerHTML =
    '<div style="font-size:1.05rem;font-weight:700;color:#e6be3e">🥔 Muchas papas, no una sola</div>' +
    '<div style="font-size:.8rem;line-height:1.45;margin-top:8px;opacity:.92">' +
    'El mercado pide "papa" como si fuera una, pero la mata esconde un país de variedades: la CRIOLLA amarilla ' +
    '(Solanum phureja, redonda y chiquita, la del sudado), la PASTUSA crema de ojos rosados, la SABANERA, la DIACOL ' +
    'CAPIRO de piel morada. La FLOR las delata desde arriba: blanca, lila o morada.<br><br>' +
    'Y el APORQUE: se arrima tierra al pie de la mata para TAPAR el tubérculo. Si le pega el sol se enverdece y hace ' +
    'solanina — amarga y hace daño. Por eso el papal se ve en camellones, no en plano.</div>' +
    '<div style="font-size:.7rem;opacity:.6;margin-top:10px">Toque otra vez para cerrar · fuente: AGROSAVIA / Fedepapa</div>';
  document.body.appendChild(el);
  clearTimeout(el._t); el._t = setTimeout(() => { el && el.remove(); }, 13000);
}

// ── tarjeta de la ROTACIÓN + control biológico (la diferencia con el fungicida) ─
function tarjetaRotacion() {
  let el = document.getElementById('papaRotacionCarta');
  if (el) { el.remove(); return; }
  el = document.createElement('div'); el.id = 'papaRotacionCarta';
  el.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:45;max-width:min(88vw,440px);' +
    'background:rgba(14,18,14,.95);color:#f0f2ec;border:1px solid rgba(200,64,46,.55);border-radius:16px;padding:16px 18px;' +
    'font-family:system-ui,-apple-system,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,.55)';
  el.innerHTML =
    '<div style="font-size:1.05rem;font-weight:700;color:#e07a6a">🔄 Rotar, no envenenar</div>' +
    '<div style="font-size:.8rem;line-height:1.45;margin-top:8px;opacity:.92">' +
    'El monocultivo de fungicida siembra papa-tras-papa en el mismo lote y la baña de veneno contra la GOTA ' +
    '(Phytophthora infestans, la enfermedad más costosa de la papa) y la POLILLA guatemalteca. La tierra se cansa, la ' +
    'plaga se hace resistente y el bolsillo se va en insumos.<br><br>' +
    'Aquí no. Se ROTA el lote (nunca papa dos veces seguidas), se ASOCIA con haba — que fija nitrógeno — y maíz, se ' +
    'guarda SEMILLA propia sana, y la polilla cae en la TRAMPA de feromona mientras las mariquitas y avispitas hacen el ' +
    'control biológico. Menos veneno, más cosecha que dura.</div>' +
    '<div style="font-size:.7rem;opacity:.6;margin-top:10px">Toque otra vez para cerrar · fuente: AGROSAVIA / ICA</div>';
  document.body.appendChild(el);
  clearTimeout(el._t); el._t = setTimeout(() => { el && el.remove(); }, 13000);
}
