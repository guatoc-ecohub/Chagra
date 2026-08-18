// ── aguacatal.js — EL AGUACATAL AGROECOLÓGICO, LADERA DEL PISO TEMPLADO-FRÍO ──
//
// Modo `?mundo=aguacatal`. No es un mojón del valle: es ENTRAR al aguacatal de
// la finca andina y caminarlo por dentro, en el piso TEMPLADO-FRÍO (1340–2420
// msnm, óptimo 1800–2000 para Hass) donde vive el aguacate de montaña. Archivo
// NUEVO y AUTÓNOMO, Three.js vanilla — monta su propio canvas/renderer/loop y
// SUPRIME el valle (main.js corre detrás y lo apagamos): no pelean dos renders.
// Su único enganche con main.js es el bloque marcado `// ── AGUACATAL ──`.
// Dialoga igual que cafetal.js, mercado.js, bosque.js y abejas.js: mismo
// DEM/Humboldt/Ghibli, low-poly entintado, cero fotorrealismo.
//
// GROUNDING — chagra/src/data/aguacateFinca.js (AGROSAVIA, UNAL, ICA):
//   · EL ÁRBOL: Persea americana, árbol GRANDE (5–12 m) de COPA DENSA y redonda,
//     verde oscuro lustroso, con brotes nuevos color BRONCE. No es un arbustico:
//     hay que dejarle aire para que ventile y para poder cosecharlo.
//   · EL FRUTO cuelga con forma de PERA, verde oscuro; el Hass VIRA de verde a
//     morado al madurar (ese cambio ayuda a leer el punto). NO madura en el
//     árbol: se coge "hecho" pero duro y ablanda en la casa.
//   · EL INJERTO SOBRE PATRÓN: el aguacate NO se siembra de pepa para producir —
//     se injerta la variedad (Hass, Lorena…) sobre un PATRÓN de semilla que pone
//     la raíz. Se lee la CINTA/cicatriz del injerto bajo en el tronco.
//   · MANEJO AGROECOLÓGICO, no monocultivo desnudo de exportación: COBERTURA VIVA
//     al pie (maní forrajero, Arachis pintoi, con su flor amarilla) y mulch — el
//     suelo NUNCA desnudo; SOMBRA PARCIAL de árboles de asocio; siembra en ALTO /
//     a CURVA DE NIVEL contra la pudrición de raíz (Phytophthora): el drenaje es
//     LA clave, nunca los pies en el agua.
//   · FLOR TIPO A/B + POLINIZADORES: la flor crema abre primero hembra y luego
//     macho; mezclar un tipo A (Hass) con un tipo B mejora el cuaje. Quien lleva
//     el polen son las ABEJAS: colmenas cerca y sin venenos en floración = más
//     fruta. Cuidar los polinizadores es cuidar la cosecha.
//
// LAS CUATRO MIRADAS (encargo del operador):
//   · Peter Jackson — el aguacatal ÉPICO y HABITADO: el PALO PADRE monumental
//     cargado de fruta adelantado, las hileras de aguacate bajando la ladera a
//     curva de nivel hasta perderse en la bruma, el vivero de injertos y el
//     canasto de la cosecha como lugar vivido, los árboles de sombra al fondo.
//   · Nolan / Interstellar — LA IMAGEN QUE SE QUEDA: el palo padre pesado de
//     peras verde-oscuro colgando bajo la copa densa, a contraluz de la mañana,
//     con la flor crema salpicada y las abejas cruzando el haz de luz.
//   · Zelda BOTW / Odyssey — color y ganas de recorrer: el verde oscuro de las
//     peras y los pocos MORADOS del Hass maduro contra el verde lustroso, la
//     ALFOMBRA AMARILLA del maní forrajero cubriendo el suelo, la flor crema.
//   · agroecólogo — la FIDELIDAD es el efecto especial: se lee "el suelo NO va
//     desnudo" (cobertura viva + mulch al pie, contra el monocultivo raspado),
//     las hileras a curva de nivel, el injerto con su cinta, la sombra parcial,
//     los polinizadores. Cada arquetipo se lee por su SILUETA a 30 m (el aguacate
//     una bola densa con peras colgando; el árbol de sombra una columna alta).
//   · diseñador instruccional — la niña (11) y el campesino, EN USTED: la leyenda
//     de la cobertura viva y la tarjeta del injerto enseñan sin gamificar.
//
// LEY DE LA CASA: TODO anclado al suelo con `alturaAguacatal(x,z)` — cero
// flotando. La fusión de mallas evita el bug clásico de `mergeGeometries`
// (mezclar indexadas con no-indexadas devuelve NULL en silencio): aquí todo se
// desindexa antes y sólo viajan position + color; la normal se recalcula.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { crearCopaMasa } from './lib3d/flora/FollajeMasa.js';
import { asegurarRelojViento } from './lib3d/flora/vientoMundos.js';
// ez-tree: los árboles de SOMBRA de fondo (parasol palo+lóbulos) pasan a nogal
// cafetero (Cordia alliodora) ez-tree VIVO — árbol real de sombrío/maderable del
// piso templado. El aguacate MISMO conserva su copa densa con fruto (pedagogía).
import { bakearArquetipoFusion } from './flora-eztree-bake.js';

// ── PALETA MADRE (el aguacatal templado a la hora dorada de la mañana) ────────
const C = {
  // el aguacate: hoja verde OSCURO y lustroso, brote nuevo bronce (la firma)
  aguaHoja: '#2f5a2c', aguaHojaLustro: '#3d7038', aguaHojaClara: '#4f8438', aguaHojaJoven: '#6a9a44',
  brote: '#9a5f38', broteClaro: '#b57c4a',
  // el fruto pera: verde oscuro con panza más clara; algunos Hass virando a morado
  frutoVerde: '#37542a', frutoVerdeClaro: '#4d6d33', frutoMorado: '#413245', frutoMoradoBrillo: '#5a4560',
  // la flor crema (tipo A/B) y la sombra de asocio
  florCrema: '#e9e2c6', florCentro: '#efe4b6',
  sombraHoja: '#4e7d44', sombraHojaClara: '#7ba35c',
  // cortezas: aguacate gris-marrón + la cinta del injerto
  cortezaAgua: '#6a5644', cortezaPatron: '#7a6a54', cintaInjerto: '#d8b25e', cortezaSombra: '#6e5a44',
  // la COBERTURA VIVA: maní forrajero (verde + flor amarilla) — el suelo no va desnudo
  cobertura: '#4f8a3e', coberturaClara: '#6ba24a', florManí: '#e8c22e', florManíCentro: '#c99320',
  // tierra templada roja andina + mulch al pie
  tierra: '#8c5a3a', tierraSombra: '#6c4830', tierraRoja: '#9c5330', mulch: '#7d5a38', mantillo: '#5f4a2e',
  // vivero e injerto / cosecha
  madera: '#8a6a45', maderaClara: '#c7ad7c', maderaVieja: '#6e4f30', bolsaVivero: '#2c2a26',
  fique: '#cab587', fiqueOscuro: '#a8905e', canasto: '#b3924f', lona: '#d8c9a4', zinc: '#aab2b4',
  // cielo templado / niebla cálida / sol de la hora dorada
  cieloCenit: '#a7c4d4', cieloMedio: '#cdd6c8', cieloHorizonte: '#ecdfc0', nieblaCalida: '#e0e4d0', sol: '#ffe6bd',
};
const col = (h) => new THREE.Color(h);
const mezcla = (a, b, t) => col(a).lerp(col(b), t);
const rand = (a, b) => a + Math.random() * (b - a);

// ── PRNG determinista (mismo aguacatal cada carga: el gate compara) ───────────
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── EL RELIEVE DE LA LADERA (el aguacatal ES ladera del piso templado-frío) ───
// value-noise + fbm barato, sin cargar nada. La ladera SUBE hacia el fondo (-Z):
// el aguacatal trepa por el flanco. `alturaAguacatal` es la ÚNICA verdad del
// suelo — todo se ancla a ella. Un BANCAL plano cerca del usuario sostiene el
// vivero/cosecha (para que no baile sobre el relieve).
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
const BANCAL = { x: 58, z: 42, r: 24 };   // explanada del vivero/cosecha, cerca del usuario
const CLARO = { x: 18, z: 46, r: 19 };    // el claro de entrada: suelo abierto (cobertura viva a la vista), sin árboles altos tapando la cámara
function gauss(x, z, cx, cz, s) { const dx = x - cx, dz = z - cz; return Math.exp(-(dx * dx + dz * dz) / (2 * s * s)); }
function alturaAguacatal(x, z) {
  const pend = -z * 0.115;                             // sube hacia -Z (al monte)
  const ond = (fbm(x * 0.010 + 30, z * 0.010 - 15) - 0.5) * 22;
  const micro = (fbm(x * 0.05, z * 0.05) - 0.5) * 3.2;
  let y = pend + ond + micro;
  const plano = gauss(x, z, BANCAL.x, BANCAL.z, 15);
  const yBancal = -BANCAL.z * 0.115 + 1.1;
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

// LA PERA DE AGUACATE: silueta de pera (bulbo abajo + cuello arriba), verde
// oscuro; algunos Hass virando a morado. Se hornea DENTRO del árbol (como el
// cafetal hornea la cereza) — cuelga bajo la copa, con su cabito.
function pushPera(p, x, y, z, r, morado) {
  // la panza va un pelo más CLARA que la copa (para que la pera se separe de la
  // hoja y se lea; el aguacate real se esconde, pero aquí tiene que enseñarse)
  const base = morado ? mezcla(C.frutoMorado, C.frutoMoradoBrillo, 0.4).getStyle()
    : mezcla(C.frutoVerde, C.frutoVerdeClaro, 0.4).getStyle();
  const brillo = morado ? C.frutoMoradoBrillo : C.frutoVerdeClaro;
  // bulbo (la panza de la pera)
  p.push(pieza(new THREE.IcosahedronGeometry(r, 0), base, [x, y, z], null, [1, 1.12, 1]));
  // cuello (más angosto, arriba)
  p.push(pieza(new THREE.IcosahedronGeometry(r * 0.6, 0), mezcla(base, brillo, 0.25).getStyle(),
    [x, y + r * 1.15, z], null, [1, 1.15, 1]));
  // cabito (el pedúnculo — se corta dejándolo para que no entre la pudrición)
  p.push(pieza(new THREE.CylinderGeometry(0.03, 0.045, 0.22, 4), C.cortezaAgua,
    [x, y + r * 1.7, z]));
}

// EL AGUACATE (Persea americana): árbol GRANDE de tronco recto con la CINTA del
// injerto baja, y COPA DENSA redonda de verde oscuro lustroso. Bajo la copa
// cuelgan las peras en racimos; en flor, salpica crema; brotes bronce en las
// puntas. `cargado` = lleno de fruta; `enFlor` = con flor crema; `morados` =
// cuántas peras viran a morado (Hass maduro). Se lee la bola densa a 30 m.
function geomAguacate(seed = 1, { cargado = true, enFlor = false, escalaCopa = 1 } = {}) {
  const r = prng(seed), p = [];
  const H = 6.5 + r() * 2.2;                            // fuste hasta la base de la copa
  // PATRÓN (abajo, corteza distinta) + CINTA del injerto + tronco de la variedad
  p.push(pieza(new THREE.CylinderGeometry(0.4, 0.6, 1.1, 7), C.cortezaPatron, [0, 0.55, 0]));
  p.push(pieza(new THREE.TorusGeometry(0.44, 0.1, 5, 9), C.cintaInjerto, [0, 1.05, 0], [Math.PI / 2, 0, 0]));
  p.push(pieza(new THREE.CylinderGeometry(0.3, 0.42, H - 1.1, 7), C.cortezaAgua, [0, 1.1 + (H - 1.1) / 2, 0]));
  // ramas madre que abren la copa (aguacate ramifica ancho)
  const NB = 5;
  for (let i = 0; i < NB; i++) {
    const a = (i / NB) * Math.PI * 2 + r() * 0.5;
    p.push(pieza(new THREE.CylinderGeometry(0.1, 0.2, 3.2, 5), C.cortezaAgua,
      [Math.cos(a) * 0.7, H * (0.86 + r() * 0.06), Math.sin(a) * 0.7], [0, -a, -0.95]));
  }
  // COPA DENSA (aguacate = copa cerrada, NO aireada como el guamo): la masa
  // equivalente se arma en `masaAguacate`; acá solo quedan tronco, frutos,
  // flores y brotes, para que la copa no vuelva a entrar como low-poly.
  const RC = 4.2 * escalaCopa;
  const NL = 16;
  for (let i = 0; i < NL; i++) {
    const a = (i / NL) * Math.PI * 2 + r() * 0.3;
    const rr = RC * (0.55 + r() * 0.5);
    const yy = H + RC * (0.35 + r() * 0.75);
    // Consumir los mismos sorteos conserva la distribución determinista de
    // brotes, frutos y flores que seguía a esta copa.
    r(); r();
  }
  // brotes BRONCE en las puntas (la firma del aguacate; discretos, no espinas)
  const rb = prng(seed + 40);
  for (let i = 0; i < 4; i++) {
    const a = rb() * Math.PI * 2, d = RC * (0.72 + rb() * 0.4);
    p.push(pieza(new THREE.IcosahedronGeometry(0.34 + rb() * 0.12, 0), mezcla(C.brote, C.broteClaro, 0.4 + rb() * 0.3).getStyle(),
      [Math.cos(a) * d, H + RC * (0.78 + rb() * 0.35), Math.sin(a) * d], null, [1.1, 0.7, 1.1]));
  }
  // LAS PERAS colgando bajo la copa. Dos poblaciones: (1) racimos interiores, y
  // (2) un FESTÓN en el borde bajo de la copa, EXPUESTO — las que se leen en la
  // silueta a distancia (el fruto tiene que verse, no esconderse en la hoja).
  if (cargado) {
    const rf = prng(seed + 90);
    const nF = 26 + Math.floor(rf() * 12);
    for (let f = 0; f < nF; f++) {
      const a = rf() * Math.PI * 2, d = RC * (0.3 + rf() * 0.62);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const y = H + RC * (0.12 + rf() * 0.3) - rf() * 0.7;    // cuelgan del envés de la copa
      const rp = 0.26 + rf() * 0.12;
      pushPera(p, x, y, z, rp, rf() < 0.14);                  // ~14% morados (Hass madurando)
    }
    // FESTÓN del borde: peras colgando POR DEBAJO del faldón de la copa, contra
    // el fondo claro — las que de verdad se leen. Un tercio viran a morado (Hass).
    const nR = 16;
    for (let i = 0; i < nR; i++) {
      const a = (i / nR) * Math.PI * 2 + rf() * 0.3;
      const d = RC * (0.78 + rf() * 0.16);
      const y = H + RC * 0.02 - (1.1 + rf() * 0.9);        // cuelga bajo el faldón, a la vista
      pushPera(p, Math.cos(a) * d, y, Math.sin(a) * d, 0.34 + rf() * 0.12, rf() < 0.34);
    }
  }
  // FLOR crema salpicada en la superficie de la copa (tipo A/B, panículas)
  if (enFlor) {
    const rfl = prng(seed + 130);
    for (let i = 0; i < 14; i++) {
      const a = rfl() * Math.PI * 2, d = RC * (0.6 + rfl() * 0.5);
      p.push(pieza(new THREE.IcosahedronGeometry(0.14 + rfl() * 0.06, 0), C.florCrema,
        [Math.cos(a) * d, H + RC * (0.7 + rfl() * 0.6), Math.sin(a) * d], null, [1, 0.7, 1]));
    }
  }
  return fusionar(p);
}

// La silueta histórica (domo + 16 lóbulos apretados) se conserva, pero se
// construye como MASA: núcleo de normales suaves y cards densos, nunca
// poliedros de follaje. Repite los sorteos de la copa original para que los
// brotes/frutos posteriores mantengan sus posiciones.
function configuracionCopaAguacate(seed = 1, escalaCopa = 1) {
  const r = prng(seed);
  const H = 6.5 + r() * 2.2;
  for (let i = 0; i < 5; i++) r(); // ramas madre
  const RC = 4.2 * escalaCopa;
  const esferas = [{ c: [0, H + RC * 0.55, 0], r: RC, esc: [1.2, 1.0, 1.2] }];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r() * 0.3;
    const rr = RC * (0.55 + r() * 0.5);
    const yy = H + RC * (0.35 + r() * 0.75);
    const radio = RC * (0.42 + r() * 0.22);
    r(); // mezcla de verde de la copa original
    esferas.push({ c: [Math.cos(a) * rr, yy, Math.sin(a) * rr], r: radio, esc: [1.05, 0.92, 1.05] });
  }
  return { H, RC, esferas };
}

function masaAguacate(seed = 1, escalaCopa = 1) {
  const { H, RC, esferas } = configuracionCopaAguacate(seed, escalaCopa);
  const oscuro = new THREE.Color(C.aguaHoja);
  const lustro = new THREE.Color(C.aguaHojaLustro);
  const gradienteTmp = new THREE.Color();
  const gradiente = (x, y, z) => {
    const altura = THREE.MathUtils.clamp((y - (H + RC * 0.05)) / (RC * 1.35), 0, 1);
    const lateral = (Math.sin(x * 0.23 + z * 0.17) * 0.5 + 0.5) * 0.12;
    return gradienteTmp.copy(oscuro).lerp(lustro, THREE.MathUtils.clamp(altura * 0.7 + lateral, 0, 1));
  };
  const masa = crearCopaMasa(THREE, {
    esferas,
    gradiente,
    seed,
    brillo: 0.16,
    cobertura: 1.34,
    tamCard: 1.55,
    maxCards: 220,
    modulacion: 0.42,
    nucleoOpts: { segs: [16, 11], encoger: 0.94, rugosidad: 0.24, sombra: 0.38 },
    texOpts: {
      oscuro: C.aguaHoja, medio: C.aguaHojaLustro, claro: C.aguaHojaClara,
      hojas: 460, alargue: 2.2,
    },
    viento: { amplitud: 0.055, piso: H + RC * 0.05, velocidad: 0.82 },
    sombra: true,
  });
  return { ...masa, H, RC };
}

function construirAguacate(seed, opts = {}) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(geomAguacate(seed, opts), MAT_VEG);
  const masa = masaAguacate(seed, opts.escalaCopa ?? 1);
  g.add(base, masa.grupo);
  g.userData.masa = masa;
  return g;
}

// ÁRBOL DE SOMBRA PARCIAL (asocio): columna alta de corteza clara + copa rala
// arriba que deja colar la luz. El aguacate agroecológico NO va a pleno sol
// raspado: lleva sombra parcial. Se lee por el fuste largo y la coronita.
// (ÁRBOL DE SOMBRA de fondo: antes un parasol palo + lóbulos icosaedro; ahora es
//  nogal cafetero ez-tree VIVO, ver bakearArquetipoFusion('nogal_cafetero') donde
//  se siembra. Eliminado por la purga AUDIT-ARBOLES-HUMBOLDT. El aguacate mismo
//  —geomAguacate— conserva su copa densa REDONDEADA con fruto/injerto: es copa
//  fiel de aguacate real, no parasol plano, y carga la pedagogía del mundo.)

// COBERTURA VIVA · MANÍ FORRAJERO (Arachis pintoi): tapete BAJO de hojitas +
// FLOR AMARILLA. El suelo NUNCA desnudo — el sello del manejo agroecológico
// contra el monocultivo raspado. Roseta rasante, densa, con puntos amarillos.
function geomManiForrajero(seed = 20) {
  const r = prng(seed), p = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.push(pieza(new THREE.IcosahedronGeometry(0.16 + r() * 0.05, 0),
      mezcla(C.cobertura, C.coberturaClara, r()).getStyle(),
      [Math.cos(a) * 0.28, 0.12, Math.sin(a) * 0.28], null, [1.3, 0.4, 1.3]));
  }
  // las flores amarillas (el pop del maní forrajero)
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2, d = 0.1 + r() * 0.24;
    p.push(pieza(new THREE.IcosahedronGeometry(0.06, 0), r() > 0.4 ? C.florManí : C.florManíCentro,
      [Math.cos(a) * d, 0.18, Math.sin(a) * d], null, [1, 0.5, 1]));
  }
  return fusionar(p);
}

// MULCH al pie: cojín de hojarasca/paja seca del acolchado (mulch), plano y bajo.
function geomMulch(seed = 21) {
  const r = prng(seed), p = [];
  p.push(pieza(new THREE.IcosahedronGeometry(0.7, 1), mezcla(C.mulch, C.mantillo, 0.4).getStyle(), [0, 0.1, 0], null, [1.5, 0.22, 1.5]));
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2, d = 0.4 + r() * 0.7;
    p.push(pieza(new THREE.CircleGeometry(0.28, 5), r() > 0.5 ? C.mulch : C.mantillo,
      [Math.cos(a) * d, 0.03, Math.sin(a) * d], [-Math.PI / 2, r() * 3, 0]));
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
  g.addColorStop(0, 'rgba(28,20,12,0.5)'); g.addColorStop(0.6, 'rgba(28,20,12,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  _sombraTex = new THREE.CanvasTexture(cv);
  return _sombraTex;
}

// ── FAUNA · LA ABEJA POLINIZADORA y la mariposa (sprites pintados) ────────────
// Quien lleva el polen de flor a flor es la ABEJA: sin ella no hay cuaje. Sprites
// (miran a cámara), animados, cruzando cerca de la copa en flor.
function abejaTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  // cuerpo amarillo con bandas negras
  c.fillStyle = '#e8b830'; c.beginPath(); c.ellipse(32, 34, 11, 8, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2a2018';
  for (const bx of [26, 32, 38]) { c.fillRect(bx, 27, 3, 14); }
  // alas translúcidas
  c.fillStyle = 'rgba(220,235,245,0.6)';
  c.beginPath(); c.ellipse(28, 24, 9, 5, -0.5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(38, 24, 9, 5, 0.5, 0, Math.PI * 2); c.fill();
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
//  INIT — monta el mundo autónomo
// ═══════════════════════════════════════════════════════════════════════════
export function initAguacatal() {
  const params = new URLSearchParams(location.search);
  const camModo = params.get('cam');          // `hero`/`ladera`/`cosecha` = cuadros fijos del gate

  // ── SUPRIMIR EL VALLE (main.js corre detrás) ────────────────────────────────
  const sup = document.createElement('style');
  sup.textContent =
    'body.enAguacatal #c,body.enAguacatal #onb,body.enAguacatal #load,body.enAguacatal #hud,' +
    'body.enAguacatal #capaLugares,body.enAguacatal #barraMover,body.enAguacatal #guiaSel,' +
    'body.enAguacatal #guiaV,body.enAguacatal #ventanaM,body.enAguacatal #compaiFotoBtn,' +
    'body.enAguacatal #mmapa{display:none!important}' +
    'body.enAguacatal{background:#12100a}';
  document.head.appendChild(sup);
  document.body.classList.add('enAguacatal');
  const pararValle = () => { try { window.__r && window.__r.setAnimationLoop(null); } catch (e) { /* aún no */ } };
  pararValle(); setTimeout(pararValle, 300); setTimeout(pararValle, 1200);

  // ── CANVAS + RENDERER PROPIOS ───────────────────────────────────────────────
  const canvas = document.createElement('canvas'); canvas.id = 'cAguacatal';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:20;touch-action:none';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.__r = renderer;                        // hook del gate (draw calls + renderer)
  window.__rAguacatal = renderer;

  const scene = new THREE.Scene();
  scene.background = cieloTemplado();
  scene.fog = new THREE.FogExp2(0xd6dcc0, 0.0016);   // bruma matinal LEVE: se lee la ladera, no un velo

  const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, 0.4, 1400);
  window.__cam = camera; window.__scene = scene;
  window.__h = alturaAguacatal;                 // sonda del gate

  const raiz = new THREE.Group(); scene.add(raiz);

  // ── LUZ: sol bajo y cálido de la hora dorada + relleno frío del valle ───────
  scene.add(new THREE.HemisphereLight(0xe6e2c6, 0x49402c, 0.8));
  const sol = new THREE.DirectionalLight(0xffe1a8, 1.85);
  sol.position.set(85, 108, 62); scene.add(sol);
  const relleno = new THREE.DirectionalLight(0x9fc0cf, 0.34);
  relleno.position.set(-70, 44, -60); scene.add(relleno);

  // ── EL SUELO DE LA LADERA (tierra roja + cobertura viva teñida, con relieve) ─
  raiz.add(construirSuelo());

  const rr = prng(4747);
  // los árboles altos respetan el vivero Y el claro de entrada (no tapan la cámara)
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
      const y = alturaAguacatal(x, z);
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

  // ── SOMBRA PARCIAL de asocio: árboles altos ESPARCIDOS (no monte cerrado) ────
  // nogal cafetero (Cordia alliodora) ez-tree VIVO en vez del parasol palo+lóbulos.
  const ezSombra = bakearArquetipoFusion('nogal_cafetero', { alturaObjetivo: 13, tintHoja: mezcla(C.sombraHoja, C.sombraHojaClara, 0.35).getStyle(), tintCorteza: C.cortezaSombra });
  sembrar(ezSombra, 12, { rmin: 30, escala: [0.9, 1.2], pred: (x, z) => libre(x, z) && z < 40 });

  // ── EL AGUACATAL: HILERAS A CURVA DE NIVEL (siembra en alto, cuida el suelo) ─
  plantarAguacatalEnSurcos(raiz, rr, libre);

  // ── COBERTURA VIVA (maní forrajero) + MULCH al pie: el suelo NO va desnudo ───
  sembrar(geomManiForrajero(20), 220, { rmin: 2.0, escala: [0.7, 1.3], pred: libre });
  sembrar(geomMulch(21), 70, { rmin: 2.8, escala: [0.7, 1.3], pred: libre });
  // parche DENSO de cobertura en el claro de entrada (el tapiz se lee en primer plano)
  sembrar(geomManiForrajero(22), 130, {
    rmin: 1.3, escala: [0.8, 1.4],
    pred: (x, z) => Math.hypot(x - CLARO.x, z - CLARO.z) < CLARO.r + 6,
    extentX: [CLARO.x - 26, CLARO.x + 26], extentZ: [CLARO.z - 26, CLARO.z + 26],
  });

  // ── EL PRIMER PLANO: un aguacate cargado al filo del claro, la fruta a la vista
  //    (la copa NO tapa: queda a un lado del eje de cámara, con el festón visible).
  const ppX = 6, ppZ = 22, ppY = alturaAguacatal(ppX, ppZ);
  const primerPlano = construirAguacate(555, { cargado: true, enFlor: true });
  primerPlano.position.set(ppX, ppY, ppZ); primerPlano.rotation.y = 1.9;
  primerPlano.frustumCulled = false;
  raiz.add(primerPlano);
  raiz.add(sombraPlano(6, ppX, ppY + 0.06, ppZ));

  // ── EL PALO PADRE: el aguacate maestro, cargado y en flor, landmark de medio
  //    plano (no un blob en la lente: escala contenida, mid-ground).
  const paX = -22, paZ = -10, paY = alturaAguacatal(paX, paZ);
  const paloPadre = construirAguacate(777, { cargado: true, enFlor: true, escalaCopa: 1.18 });
  paloPadre.scale.setScalar(1.18);
  paloPadre.position.set(paX, paY, paZ); paloPadre.rotation.y = 0.6;
  paloPadre.frustumCulled = false;
  raiz.add(paloPadre);
  raiz.add(sombraPlano(9, paX, paY + 0.06, paZ));

  // ── EL VIVERO / COSECHA: injerto sobre patrón + el canasto de la cosecha ─────
  const vivero = construirVivero();
  raiz.add(vivero.group);

  // ── polvo/pelusa cálida suspendida (aire vivo del aguacatal) ────────────────
  const motas = construirMotas();
  raiz.add(motas.points);

  // ── FAUNA: abejas polinizadoras + mariposas ─────────────────────────────────
  const fauna = construirFauna();
  raiz.add(fauna.group);

  // ── CÁMARA: vista 3/4 ELEVADA sobre el claro abierto — se lee el grove entero:
  //    el suelo tapizado en primer plano, el árbol cargado, el palo padre y las
  //    hileras a curva de nivel subiendo hasta la bruma. NO enterrada en la copa.
  const OJO = 1.65;
  const gCam = alturaAguacatal(34, 60);
  const HERO_POS = new THREE.Vector3(34, gCam + 16, 60);
  const HERO_TGT = new THREE.Vector3(-16, alturaAguacatal(-16, -16) + 5, -16);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 6; controls.maxDistance = 260;
  controls.maxPolarAngle = 1.52;               // no meterse bajo el suelo
  controls.target.copy(HERO_TGT);
  controls.enabled = false;
  window.__ctl = controls;

  let introDone = false, introStart = null;
  const introPos = new THREE.CatmullRomCurve3([
    new THREE.Vector3(96, gCam + 60, 150),     // alto, entrando por el flanco soleado
    new THREE.Vector3(66, gCam + 38, 110),
    new THREE.Vector3(46, gCam + 22, 82),      // baja sobre el claro
    HERO_POS.clone(),
  ]);
  const introTgt = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-10, gCam + 14, -8),
    new THREE.Vector3(-14, gCam + 8, -12),
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
  } else if (camModo === 'ladera') {
    // PRUEBA la curva de nivel + la cobertura viva: de perfil, las hileras que
    // ondulan siguiendo el contorno y el suelo tapizado (no raspado).
    introDone = true;
    camera.position.set(-84, alturaAguacatal(-84, 24) + 10, 24);
    camera.lookAt(-6, alturaAguacatal(-6, -18) + 5, -18);
  } else if (camModo === 'cosecha') {
    // el vivero de injertos + el canasto de la cosecha, de cerca.
    introDone = true;
    const gy = alturaAguacatal(BANCAL.x, BANCAL.z);
    camera.position.set(BANCAL.x + 18, gy + 6, BANCAL.z + 20);
    camera.lookAt(BANCAL.x, gy + 1.6, BANCAL.z);
  } else if (params.get('onb') === '0') {
    // lanzamiento directo (y el gate): sin vuelo de intro — al cuadro hero, con
    // los controles ya vivos (determinista para la captura).
    introDone = true;
    darControl();
  } else {
    camera.position.copy(introPos.getPoint(0)); camera.lookAt(introTgt.getPoint(0));
  }

  // ── HUD: la leyenda del AGUACATE AGROECOLÓGICO (instruccional, en usted) ─────
  montarLeyenda();
  const avisar = montarAvisoYSalida();

  // ── raycast: el palo padre → cobertura/polinización · el vivero → injerto ────
  const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
  let dx0 = 0, dy0 = 0, dt0 = 0;
  canvas.addEventListener('pointerdown', (e) => { dx0 = e.clientX; dy0 = e.clientY; dt0 = performance.now(); });
  canvas.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - dx0, e.clientY - dy0) > 9 || performance.now() - dt0 > 600) return;
    pt.x = (e.clientX / innerWidth) * 2 - 1; pt.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(pt, camera);
    if (ray.intersectObject(vivero.group, true).length) { tarjetaInjerto(); return; }
    if (ray.intersectObject(paloPadre, true).length) tarjetaCobertura();
  });

  // ── POST: bloom cálido de la hora dorada (la fruta y la flor al sol) ─────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.28, 0.7, 0.85));
  composer.addPass(new OutputPass());

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  });

  const loadEl = document.getElementById('load');
  if (loadEl) { loadEl.style.opacity = 0; setTimeout(() => loadEl.remove(), 700); }

  // ── LOOP ────────────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  // Este mundo tiene renderer y loop propios: el reloj global necesita su
  // auto-tick para que la copa no quede congelada aunque main.js esté apagado.
  asegurarRelojViento();
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
    vivero.update(t);
    fauna.update(t, camera);
    motas.update(t);
    composer.render();
  });

  window.__aguacatal = { scene, camera, renderer, controls, vivero };
  return window.__aguacatal;
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

// ── EL SUELO: heightfield tierra roja templada + teñido de cobertura viva ─────
function construirSuelo() {
  const SIZE = 560, SEG = 140;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colr = new Float32Array(pos.count * 3);
  // el suelo del aguacatal agroecológico va TAPIZADO: el verde de la cobertura
  // viva DOMINA, con vetas de tierra roja y flor amarilla del maní forrajero.
  const cob = col(C.cobertura), cobC = col(C.coberturaClara), roja = col(C.tierraRoja);
  const florAmarilla = col(C.florManí), mant = col(C.mantillo), solTinte = col('#d9bd7a');
  const base = mezcla(C.cobertura, C.coberturaClara, 0.25);   // base = cobertura, no tierra pelada
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = alturaAguacatal(x, z);
    pos.setY(i, y);
    tmp.copy(base);
    // modula el verde de la cobertura (más claro donde le da el sol)
    const cobK = fbm(x * 0.06 - 4, z * 0.06 + 12);
    tmp.lerp(cobC, THREE.MathUtils.clamp(cobK - 0.35, 0, 1) * 0.9);
    // claros de tierra roja asomando entre el tapiz (no desnudo, sólo pinta)
    const rojaK = fbm(x * 0.045 + 7, z * 0.045 - 9);
    if (rojaK > 0.62) tmp.lerp(roja, (rojaK - 0.62) * 1.4);
    // salpicón de flor amarilla del maní forrajero
    const florK = fbm(x * 0.22 + 3, z * 0.22 - 5);
    if (florK > 0.72) tmp.lerp(florAmarilla, (florK - 0.72) * 1.6);
    if (fbm(x * 0.1, z * 0.1) < 0.22) tmp.lerp(mant, 0.28);          // materia orgánica oscura
    const dap = THREE.MathUtils.clamp((fbm(x * 0.08 + 2, z * 0.08 - 6) - 0.45) * 2, 0, 1);
    tmp.lerp(solTinte, dap * 0.12);
    colr[i * 3] = tmp.r; colr[i * 3 + 1] = tmp.g; colr[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
}

// ── EL AGUACATAL EN SURCOS A CURVA DE NIVEL ───────────────────────────────────
// El aguacate no se siembra ladera abajo sino a CURVA DE NIVEL / en alto: hileras
// curvas y árboles ESPACIADOS (es un árbol grande: hay que dejarle aire para
// ventilar y para cosecharlo). Dos variantes (cargado / cargado+flor) para que
// no sea un aguacatal de clones.
function plantarAguacatalEnSurcos(raiz, rr, libre) {
  const geoA = geomAguacate(101, { cargado: true, enFlor: false });
  const geoB = geomAguacate(202, { cargado: true, enFlor: true });
  const masaA = masaAguacate(101);
  const masaB = masaAguacate(202);
  const puestosA = [], puestosB = [];
  const CENTRO = { x: -10, z: -300 };   // centro de las curvas de nivel (monte arriba)
  const enLote = (x, z) => libre(x, z) && x > -130 && x < 100 && z > -80 && z < 96;
  const radios = [];
  for (let R = 230, i = 0; R < 400; R += 15, i++) radios.push(R);   // hileras separadas (árbol grande)
  for (let ri = 0; ri < radios.length; ri++) {
    const R = radios[ri];
    const paso = 9.0 / R;                                            // ~9 m entre árboles
    for (let a = -0.95; a < 0.95; a += paso) {
      const jx = (rr() - 0.5) * 1.6, jz = (rr() - 0.5) * 1.6;
      const x = CENTRO.x + Math.sin(a) * R + jx;
      const z = CENTRO.z + Math.cos(a) * R + jz;
      if (!enLote(x, z)) continue;
      if (rr() < 0.5) puestosA.push({ x, z });
      else puestosB.push({ x, z });
    }
  }
  const colocar = (geom, masa, lista) => {
    if (!lista.length) return;
    const inst = new THREE.InstancedMesh(geom, MAT_VEG, lista.length);
    const nucleo = new THREE.InstancedMesh(masa.grupo.children[0].geometry, masa.grupo.children[0].material, lista.length);
    const cards = new THREE.InstancedMesh(masa.grupo.children[1].geometry, masa.grupo.children[1].material, lista.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    lista.forEach((pt, k) => {
      const y = alturaAguacatal(pt.x, pt.z);
      const e = 0.85 + rr() * 0.4;
      pos.set(pt.x, y, pt.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr() * Math.PI * 2);
      s.set(e, e * (0.92 + rr() * 0.16), e);
      m.compose(pos, q, s); inst.setMatrixAt(k, m); nucleo.setMatrixAt(k, m); cards.setMatrixAt(k, m);
      // sombra de contacto bajo cada árbol
      raiz.add(sombraPlano(4.2 * e, pt.x, y + 0.05, pt.z));
    });
    inst.instanceMatrix.needsUpdate = true; inst.frustumCulled = false;
    nucleo.instanceMatrix.needsUpdate = true; nucleo.frustumCulled = false;
    cards.instanceMatrix.needsUpdate = true; cards.frustumCulled = false;
    raiz.add(inst);
    raiz.add(nucleo, cards);
  };
  colocar(geoA, masaA, puestosA);
  colocar(geoB, masaB, puestosB);
}

// ── sombra de contacto como plano ────────────────────────────────────────────
function sombraPlano(r, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: sombraTex(), transparent: true, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL VIVERO / COSECHA — el injerto sobre patrón y el canasto de la cosecha.
//  El elemento vivido que hace del mundo un aguacatal DE VERDAD (y enseña por
//  qué el árbol va injertado, no de pepa).
// ═══════════════════════════════════════════════════════════════════════════
function construirVivero() {
  const g = new THREE.Group();
  const bx = BANCAL.x, bz = BANCAL.z, by = alturaAguacatal(bx, bz);
  g.position.set(bx, by, bz);
  const matMad = new THREE.MeshStandardMaterial({ color: col(C.madera), roughness: 1, flatShading: true });
  const matMadC = new THREE.MeshStandardMaterial({ color: col(C.maderaClara), roughness: 1, flatShading: true });
  const matBolsa = new THREE.MeshStandardMaterial({ color: col(C.bolsaVivero), roughness: 1, flatShading: true });
  const matFruto = new THREE.MeshStandardMaterial({ color: col(C.frutoVerde), roughness: 0.8, flatShading: true });
  const matFique = new THREE.MeshStandardMaterial({ color: col(C.canasto), roughness: 1, flatShading: true });
  const matZinc = new THREE.MeshStandardMaterial({ color: col(C.zinc), roughness: 0.6, metalness: 0.15, flatShading: true });

  // ── LA MESA DEL VIVERO: bandeja elevada con las BOLSAS de injertos ───────────
  const mesa = new THREE.Group(); mesa.position.set(-3, 0, 2); g.add(mesa);
  for (const [px, pz] of [[-3.4, -1.4], [3.4, -1.4], [-3.4, 1.4], [3.4, 1.4]]) {
    const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6), matMad);
    pata.position.set(px, 0.45, pz); mesa.add(pata);
  }
  const tabla = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.12, 3.4), matMadC);
  tabla.position.set(0, 0.92, 0); mesa.add(tabla);
  // LAS BOLSAS DE VIVERO con el arbolito injertado (patrón + variedad + cinta)
  const arbolitos = [];
  for (let ix = 0; ix < 5; ix++) {
    for (let iz = 0; iz < 2; iz++) {
      const bx2 = -2.7 + ix * 1.35, bz2 = -0.8 + iz * 1.6;
      const bolsa = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.42, 6), matBolsa);
      bolsa.position.set(bx2, 1.2, bz2); mesa.add(bolsa);
      // tallito del patrón + cinta de injerto + cogollo de la variedad
      const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.7, 5),
        new THREE.MeshStandardMaterial({ color: col(C.cortezaPatron), roughness: 1, flatShading: true }));
      tallo.position.set(bx2, 1.75, bz2); mesa.add(tallo);
      const cinta = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.02, 4, 7),
        new THREE.MeshStandardMaterial({ color: col(C.cintaInjerto), roughness: 1, flatShading: true }));
      cinta.position.set(bx2, 1.9, bz2); cinta.rotation.x = Math.PI / 2; mesa.add(cinta);
      const hojita = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0),
        new THREE.MeshStandardMaterial({ color: col(C.aguaHojaJoven), roughness: 1, flatShading: true }));
      hojita.position.set(bx2, 2.12, bz2); hojita.scale.set(1.1, 0.7, 1.1); mesa.add(hojita);
      arbolitos.push(hojita);
    }
  }
  // techito de zinc que da sombra al vivero
  for (const px of [-3.2, 3.2]) {
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), matMad);
    poste.position.set(px, 2.3, -1.6); mesa.add(poste);
  }
  const techo = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.1, 2.2), matZinc);
  techo.position.set(0, 3.0, -1.2); techo.rotation.x = -0.25; mesa.add(techo);

  // ── EL CANASTO DE LA COSECHA: peras verde-oscuro recién cogidas (con cabito) ─
  const cos = new THREE.Group(); cos.position.set(4.5, 0, 3); g.add(cos);
  const canasto = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.8, 1.1, 12, 1, true), matFique);
  canasto.position.set(0, 0.55, 0); cos.add(canasto);
  const fondo = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 12), matFique);
  fondo.position.set(0, 0.05, 0); cos.add(fondo);
  // la pila de aguacates dentro (peras verde oscuro, algún morado)
  const rp = prng(555);
  for (let i = 0; i < 26; i++) {
    const a = rp() * Math.PI * 2, d = rp() * 0.72;
    const morado = rp() < 0.18;
    const per = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0),
      morado ? new THREE.MeshStandardMaterial({ color: col(C.frutoMorado), roughness: 0.7, flatShading: true }) : matFruto);
    per.position.set(Math.cos(a) * d, 1.02 + rp() * 0.5, Math.sin(a) * d);
    per.scale.set(1, 1.15, 1); per.rotation.set(rp(), rp(), rp()); cos.add(per);
  }
  // algunas peras derramadas al pie
  for (let i = 0; i < 5; i++) {
    const per = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), matFruto);
    per.position.set(1.1 + rp() * 0.9, 0.2, -0.4 + rp() * 1.4); per.scale.set(1, 1.15, 1); per.rotation.set(rp(), rp(), rp());
    cos.add(per);
  }

  // ── EL GANCHO COSECHADOR: la vara larga con la canastilla (se coge de árbol) ─
  const vara = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 5.4, 6), matMadC);
  vara.position.set(6.4, 2.4, 1.2); vara.rotation.z = 0.42; vara.rotation.x = -0.12; g.add(vara);
  const canastilla = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.4, 8, 1, true), matFique);
  canastilla.position.set(7.55, 4.75, 1.0); g.add(canastilla);

  // update: las hojitas de los injertos respiran apenas (el vivero está vivo)
  function update(t) {
    for (let i = 0; i < arbolitos.length; i++) {
      arbolitos[i].rotation.z = Math.sin(t * 0.8 + i) * 0.08;
    }
  }
  return { group: g, update };
}

// ── polvo/pelusa cálida suspendida (el aire dorado del aguacatal) ─────────────
function construirMotas() {
  const N = 260, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), base = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = rand(-90, 90), z = rand(-90, 60), y = alturaAguacatal(x, z) + rand(1.5, 16);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; base[i] = y;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: motaTex(), color: 0xf6e6bd, size: 0.5, sizeAttenuation: true,
    transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const update = (t) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] = base[i] + Math.sin(t * 0.4 + i * 1.3) * 0.7;
      p[i * 3] += Math.sin(t * 0.2 + i) * 0.006;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points, update };
}

// ── FAUNA: abejas polinizadoras + mariposas (sprites que miran a cámara) ──────
function construirFauna() {
  const g = new THREE.Group();
  const bichos = [];
  const abTex = abejaTex(), maTex = mariposaTex();
  const rf = prng(9001);
  // abejas alrededor de la copa del palo padre y de las hileras en flor
  const focos = [
    { x: -20, z: -14, y: alturaAguacatal(-20, -14) + 9 },   // el palo padre en flor
    { x: -6, z: -30, y: alturaAguacatal(-6, -30) + 8 },
    { x: -34, z: -6, y: alturaAguacatal(-34, -6) + 8 },
  ];
  for (let i = 0; i < 14; i++) {
    const esAbeja = i < 10;
    const mat = new THREE.SpriteMaterial({ map: esAbeja ? abTex : maTex, transparent: true, depthWrite: false, fog: false });
    const sp = new THREE.Sprite(mat);
    const foco = focos[i % focos.length];
    const s = esAbeja ? 0.7 : 1.0;
    sp.scale.set(s, s, s);
    bichos.push({ sp, foco, r: 1.6 + rf() * 2.4, ph: rf() * Math.PI * 2, sp2: 0.5 + rf() * 0.9, yb: (rf() - 0.5) * 2, esAbeja });
    g.add(sp);
  }
  function update(t) {
    for (const b of bichos) {
      const a = t * b.sp2 + b.ph;
      b.sp.position.set(
        b.foco.x + Math.cos(a) * b.r,
        b.foco.y + b.yb + Math.sin(a * 1.7) * 0.8,
        b.foco.z + Math.sin(a) * b.r,
      );
    }
  }
  return { group: g, update };
}

// ── HUD: la leyenda del AGUACATE AGROECOLÓGICO (instruccional, en usted) ───────
function montarLeyenda() {
  const CAPAS = [
    { c: '#37542a', n: 'El fruto que cuelga', h: 'la pera verde', d: 'El aguacate (Persea americana) es un árbol grande (5–12 m) de copa densa. La fruta cuelga con forma de pera y NO madura en el árbol: se coge hecha pero dura y ablanda en la casa.' },
    { c: '#d8b25e', n: 'Injertado, no de pepa', h: 'sobre patrón', d: 'No se siembra de semilla para producir: se injerta la variedad (Hass, Lorena) sobre un patrón que pone la raíz. El patrón decide la resistencia a la pudrición.' },
    { c: '#e8c22e', n: 'El suelo no va desnudo', h: 'cobertura viva', d: 'Manejo agroecológico, no monocultivo raspado: cobertura viva (maní forrajero) y mulch al pie, sombra parcial, y siembra a curva de nivel. El drenaje es la clave: nunca los pies en el agua.' },
    { c: '#e9e2c6', n: 'Las abejas cuajan', h: 'flor tipo A/B', d: 'La flor abre primero hembra y luego macho; mezclar un tipo A y uno B mejora el cuaje. Quien lleva el polen son las abejas: cuidar los polinizadores es cuidar la cosecha.' },
  ];
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:14px;top:14px;z-index:30;max-width:min(40vw,360px);' +
    'font-family:system-ui,-apple-system,sans-serif;color:#f3efe4;pointer-events:none';
  let html = '<div style="font-size:1.05rem;font-weight:700;text-shadow:0 2px 10px rgba(0,0,0,.7);margin-bottom:2px">🥑 El aguacatal</div>' +
    '<div style="font-size:.72rem;opacity:.82;text-shadow:0 1px 6px rgba(0,0,0,.8);margin-bottom:9px">Piso templado-frío · manejo agroecológico · del injerto a la cosecha</div>';
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
    let el = document.getElementById('aguacatalToast');
    if (!el) {
      el = document.createElement('div'); el.id = 'aguacatalToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:40;' +
        'background:rgba(22,15,9,.92);color:#f3efe4;border:1px solid rgba(224,190,140,.35);border-radius:999px;' +
        'padding:10px 20px;font:500 .88rem system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:opacity .4s';
      document.body.appendChild(el);
    }
    el.textContent = '🥑 Está en el aguacatal · arrastre para mirar · toque el vivero o el palo padre';
    el.style.opacity = '1';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 4200);
  };
}

// ── tarjeta del INJERTO (por qué el aguacate va injertado, y el punto de cosecha)
function tarjetaInjerto() {
  let el = document.getElementById('aguacatalInjertoCarta');
  if (el) { el.remove(); return; }
  el = document.createElement('div'); el.id = 'aguacatalInjertoCarta';
  el.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:45;max-width:min(88vw,440px);' +
    'background:rgba(22,15,9,.95);color:#f3efe4;border:1px solid rgba(216,178,94,.5);border-radius:16px;padding:16px 18px;' +
    'font-family:system-ui,-apple-system,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,.55)';
  el.innerHTML =
    '<div style="font-size:1.05rem;font-weight:700;color:#e8c86a">🌱 El injerto sobre patrón</div>' +
    '<div style="font-size:.8rem;line-height:1.45;margin-top:8px;opacity:.92">' +
    'El aguacate NO se siembra de pepa para producir: la pepa no repite el fruto de la madre y tarda años. Se injerta la ' +
    'variedad que se quiere (Hass, Lorena, Santana) sobre un PATRÓN nacido de semilla — el patrón pone la raíz, y unos ' +
    'toleran la pudrición mejor que otros. Por eso vale el árbol injertado y certificado de vivero.<br><br>' +
    'Y la cosecha: se coge HECHO pero duro (madura en la casa, nunca en el árbol). Corte con tijera dejando el cabito, ' +
    'para que no se abra la "boca" por donde entra la pudrición.</div>' +
    '<div style="font-size:.7rem;opacity:.6;margin-top:10px">Toque otra vez para cerrar · fuente: AGROSAVIA</div>';
  document.body.appendChild(el);
  clearTimeout(el._t); el._t = setTimeout(() => { el && el.remove(); }, 13000);
}

// ── tarjeta de la COBERTURA VIVA + polinización (el aguacate agroecológico) ────
function tarjetaCobertura() {
  let el = document.getElementById('aguacatalCoberturaCarta');
  if (el) { el.remove(); return; }
  el = document.createElement('div'); el.id = 'aguacatalCoberturaCarta';
  el.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:45;max-width:min(88vw,440px);' +
    'background:rgba(22,15,9,.95);color:#f3efe4;border:1px solid rgba(120,163,92,.55);border-radius:16px;padding:16px 18px;' +
    'font-family:system-ui,-apple-system,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,.55)';
  el.innerHTML =
    '<div style="font-size:1.05rem;font-weight:700;color:#a8d17c">🌿 El suelo no va desnudo</div>' +
    '<div style="font-size:.8rem;line-height:1.45;margin-top:8px;opacity:.92">' +
    'El monocultivo de exportación deja el suelo RASPADO entre los árboles: se erosiona, se seca y se muere. Aquí no. La ' +
    'COBERTURA VIVA (maní forrajero) y el mulch al pie tapizan el suelo: guardan la humedad, alimentan la vida del suelo y ' +
    'frenan el aguacero. La sombra parcial y la siembra a curva de nivel completan el manejo — el drenaje es la clave contra ' +
    'la pudrición de raíz.<br><br>' +
    'Y la fruta cuaja porque hay POLINIZADORES: la flor abre hembra y luego macho, así que mezclar un tipo A (Hass) con un ' +
    'tipo B ayuda; las abejas hacen el resto. Un huerto con colmenas cerca y sin venenos en floración carga mucho más.</div>' +
    '<div style="font-size:.7rem;opacity:.6;margin-top:10px">Toque otra vez para cerrar · fuente: AGROSAVIA / UNAL</div>';
  document.body.appendChild(el);
  clearTimeout(el._t); el._t = setTimeout(() => { el && el.remove(); }, 13000);
}
