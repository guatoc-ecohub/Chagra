// ── ceiba.js — LA CEIBA, EL ENT DE LA TIERRA CALIENTE ─────────────────────────
//
// Modo `?mundo=ceiba`. No es un mojón del valle: es PARARSE AL PIE DEL GIGANTE
// en el piso CÁLIDO (0–1.000 m, bosque seco/húmedo tropical) y MIRAR ARRIBA.
// Archivo NUEVO y AUTÓNOMO, Three.js vanilla — monta su propio canvas/renderer/
// loop y SUPRIME el valle (main.js corre detrás y lo apagamos): no pelean dos
// renders. Su único enganche con main.js es el bloque marcado `// ── CEIBA ──`.
// Dialoga igual que aguacatal.js, papa.js, cafetal.js: mismo DEM/Humboldt/Ghibli,
// low-poly entintado, cero fotorrealismo. Fauna rubber-hose; el árbol NO.
//
// GROUNDING — Ceiba pentandra (Humboldt + ecólogo de conservación):
//   · EL GIGANTE EMERGENTE: 40–60 m, ASOMA solo sobre el dosel del bosque. Copa
//     APARASOLADA horizontal que corona la selva; corona media vereda de sombra.
//   · LOS CONTRAFUERTES TABLARES: aletas de raíz-pared, tan altas como un hombre
//     y más, que sostienen semejante árbol donde la raíz no puede ahondar en
//     suelo somero. Ingeniería natural: uno se PARA entre ellos. La firma.
//   · TRONCO con ESPINAS cónicas de joven; corteza verdosa-gris (fotosintética
//     de joven). De viejo se limpia y se engrosa.
//   · UN ÁRBOL = UN MUNDO: hospeda EPÍFITAS (bromelias-tanque que guardan un
//     litro de lluvia con su rana adentro, orquídeas que NO son parásitas,
//     helechos y musgo colgando), aves que anidan en la atalaya, INSECTOS, la
//     iguana que sube al sol por los contrafuertes. La flor abre DE NOCHE y la
//     poliniza el MURCIÉLAGO nectarívoro, no la abeja (real, verificado).
//   · TIEMPO PROFUNDO: vive 300+ años. Árbol común/sagrado del pueblo: se deja
//     en pie. De una semilla con pelusa (kapok) más liviana que el aire salió
//     el gigante.
//
// LOS SIETE AUDITORES (encargo del operador — moldean CADA decisión):
//   · HUMBOLDT — la ceiba real, los contrafuertes reales, la flora cálida exacta
//     (guadua, plátano, cacao a la sombra), lámina naturalista.
//   · PETER JACKSON — escala ÉPICA: la ceiba EMPEQUEÑECE todo; la cámara hero
//     nace baja, entre los contrafuertes, y MIRA HACIA ARRIBA al gigante.
//   · ZELDA / BOTW — asombro: HACES de luz dorada colándose por el dosel, viento
//     en la copa, pelusa en el aire, la invitación a MIRAR ARRIBA y descubrir.
//   · DISEÑO INSTRUCCIONAL (la LECCIÓN NUEVA) — los otros Ents enseñan «este
//     árbol sirve para X en su finca» (panel de datos). LA CEIBA NO. Enseña que
//     UN ÁRBOL ES UN MUNDO + TIEMPO, y lo enseña por OBSERVACIÓN y ASOMBRO: el
//     usuario MIRA ARRIBA, TOCA la copa y DESCUBRE quién vive ahí (un susurro,
//     no una ficha). Sin puntaje, sin gamificar: la lección es la contemplación.
//   · NOLAN — TIEMPO y escala vertical tipo IMAX: la intro nace en la SEMILLA
//     diminuta al pie y SUBE por el tronco hasta la copa emergente contra el
//     cielo. El corte semilla→gigante ES la lección del tiempo.
//   · ECÓLOGO DE CONSERVACIÓN — rigor en QUIÉN vive en ella: bromelia-tanque,
//     orquídea epífita (no parásita), murciélago polinizador nocturno, nido,
//     iguana, hormiguero. Biodiversidad verídica, no decorativa.
//   · LA NIÑA (11) + CAMPESINO — ¿le da asombro a una niña y es verdad para
//     quien vive en tierra caliente? Legibilidad y emoción por encima del dato.
//
// LEY DE LA CASA: TODO anclado al suelo con `alturaCeiba(x,z)` — cero flotando.
// La fusión de mallas evita el bug de `mergeGeometries` (indexadas + no-indexadas
// → null en silencio): todo se desindexa antes; sólo viajan position + color.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ShaderGradeoFinal } from './lib3d/post/gradeoFinal.js';
import { crearCopaMasa } from './lib3d/flora/FollajeMasa.js';
import { tickVientoMundos } from './lib3d/flora/vientoMundos.js';
// three.quarks (vía envoltorio lib3d-motas): la pelusa de kapok que deriva en el
// haz de luz — la firma de la ceiba («de una semilla con pelusa más liviana que
// el aire salió este gigante»).
import { crearMotas } from './lib3d-motas.js';
// ez-tree: el DOSEL DE FONDO de la selva (contra el que EMERGE la ceiba) deja de
// ser el domo icosaedro (parasol) y pasa a ser yarumo plateado (Cecropia
// telealba) ez-tree VIVO — la pionera real del dosel de tierra caliente.
import { bakearArquetipoFusion } from './flora-eztree-bake.js';

// ── PALETA MADRE (la selva cálida a la hora dorada, luz ecuatorial que atraviesa)
const C = {
  // la ceiba: corteza verdosa-gris (fotosintética de joven), contrafuertes más grises
  cortezaCeiba: '#8a9066', cortezaClara: '#a3a878', cortezaVerde: '#7f8c5a',
  contrafuerte: '#7d7a5e', contrafuerteSombra: '#615f48', contrafuerteClaro: '#96916f',
  espina: '#5f5a3e',
  // la copa aparasolada: verde dosel a contraluz, más clara arriba donde pega el sol
  copaAlta: '#4d7f3a', copaMedia: '#3c6b30', copaBaja: '#2f5626', copaSol: '#6fa347',
  // el bosque de tierra caliente alrededor (dosel + estrato medio)
  doselA: '#356b2c', doselB: '#2c5a26', doselSol: '#5f9440',
  guadua: '#93a154', guaduaNodo: '#c7b26a', guaduaHoja: '#7ba045',
  platanoHoja: '#3f8a3a', platanoHojaClara: '#65ab48', platanoNervio: '#8fbf5c', platanoTronco: '#6f8a44',
  cacaoHoja: '#2f5a2e', cacaoMazorca: '#b06a2c', cacaoMazorcaRoja: '#9a3b28', cacaoTronco: '#5c4632',
  // las epífitas: la vida EN el árbol
  bromelia: '#4f9a5a', bromeliaRojo: '#c23a2e', bromeliaAgua: '#3a6f78',
  orquidea: '#d66aa0', orquideaBlanca: '#efe6d8', orquideaAmar: '#e8c24a',
  helecho: '#5c8a44', musgo: '#6f9a5a', musgoSeco: '#8a9a5c',
  nido: '#8a6a44', hormiga: '#3a2a1e',
  // suelo cálido: tierra parda húmeda + hojarasca del bosque + raicillas
  tierra: '#6a5236', tierraHumeda: '#4e3d28', hojarasca: '#7d6238', mantillo: '#4a3a24', verdín: '#4a6b38',
  // la semilla kapok (pelusa) al pie
  kapok: '#efe9dc', kapokVaina: '#7a6a48',
  // cielo cálido ecuatorial / neblina de calor / sol duro arriba, difuso abajo
  cieloCenit: '#8fb6cf', cieloMedio: '#bcd0cb', cieloHorizonte: '#ecdcb6', neblinaCalor: '#dfe0c8',
  sol: '#fff0c8', haz: '#ffe9b0',
};
const col = (h) => new THREE.Color(h);
const mezcla = (a, b, t) => col(a).lerp(col(b), t);
const rand = (a, b) => a + Math.random() * (b - a);

// ── PRNG determinista (misma ceiba cada carga: el gate compara) ───────────────
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── EL RELIEVE DEL PISO CÁLIDO (llano húmedo con ondulación leve) ─────────────
// La ceiba vive en tierra baja: relieve SUAVE. Un CLARO plano bajo el gigante,
// para que se pare entre los contrafuertes sin bailar sobre el terreno.
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
const CEIBA_XZ = { x: 0, z: -8 };          // dónde se planta el gigante
const CLARO = { x: 0, z: -8, r: 26 };      // el claro llano bajo la ceiba
function gauss(x, z, cx, cz, s) { const dx = x - cx, dz = z - cz; return Math.exp(-(dx * dx + dz * dz) / (2 * s * s)); }
function alturaCeiba(x, z) {
  const ond = (fbm(x * 0.012 + 20, z * 0.012 - 8) - 0.5) * 9;   // lomas muy suaves de tierra baja
  const micro = (fbm(x * 0.06, z * 0.06) - 0.5) * 1.6;
  let y = ond + micro;
  const plano = gauss(x, z, CLARO.x, CLARO.z, 16);              // aplana el claro del gigante
  y = y * (1 - plano * 0.95);
  return y;
}

// ── TALLER DE MALLAS (pintar por vértice + fusionar sin el bug de mergeGeometries)
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

const MAT_VEG = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });

// ═══════════════════════════════════════════════════════════════════════════
//  EL CONTRAFUERTE TABLAR — la firma de la ceiba (Humboldt + Jackson)
//  Aleta-pared de raíz: alta contra el tronco, tendida hacia afuera. Perfil
//  cóncavo (como el real). Uno se para ENTRE ellas. Thin en tangencial.
// ═══════════════════════════════════════════════════════════════════════════
function geomContrafuerte(alto, largo, grosor) {
  // perfil (r hacia afuera, y hacia arriba), cóncavo: sube pegado al tronco y
  // se tiende bajando hacia el suelo lejos del pie.
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, alto);
  shape.lineTo(largo * 0.16, alto * 0.62);
  shape.lineTo(largo * 0.42, alto * 0.30);
  shape.lineTo(largo * 0.72, alto * 0.10);
  shape.lineTo(largo, 0.0);
  shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: grosor, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -grosor / 2);            // centrar el espesor
  return geo;
}

// ═══════════════════════════════════════════════════════════════════════════
//  LA CEIBA — el gigante emergente. Devuelve grupo con base (tronco +
//  contrafuertes + espinas + ramas) y copa (foliaje aparasolado) por separado,
//  y los PUNTOS de rama donde cuelga la vida (epífitas/nido). Escala REAL ~52 m.
// ═══════════════════════════════════════════════════════════════════════════
function construirCeiba() {
  const g = new THREE.Group();
  const r = prng(70701);

  // — el fuste: base ancha acanalada que sube hasta la primera rama —
  const Y_RAMA = 34;                          // dónde arranca la copa (emergente)
  const R_BASE = 2.9, R_ALTO = 1.15;
  const base = [];
  // tronco en dos tramos para el acanalado del pie
  base.push(pieza(new THREE.CylinderGeometry(2.0, R_BASE, 7, 12), C.cortezaVerde, [0, 3.5, 0]));
  base.push(pieza(new THREE.CylinderGeometry(R_ALTO, 2.0, Y_RAMA - 7, 11), C.cortezaCeiba, [0, 7 + (Y_RAMA - 7) / 2, 0]));
  // acanaladuras verticales suaves que separan los contrafuertes (lóbulos del pie)
  const NC = 7;
  for (let i = 0; i < NC; i++) {
    const a = (i / NC) * Math.PI * 2 + 0.2;
    base.push(pieza(new THREE.CylinderGeometry(0.5, 1.0, 6.5, 5), C.cortezaVerde,
      [Math.cos(a) * 2.2, 3.3, Math.sin(a) * 2.2], null, [1, 1, 1]));
  }

  // — LOS CONTRAFUERTES TABLARES (la firma; uno se para entre ellos) —
  const buttressAngs = [];
  for (let i = 0; i < NC; i++) {
    const a = (i / NC) * Math.PI * 2 + 0.2;
    buttressAngs.push(a);
    const alto = 5.4 + r() * 1.8;             // tan altos como un hombre y más
    const largo = 6.5 + r() * 2.6;
    const grosor = 0.55;
    const cf = geomContrafuerte(alto, largo, grosor);
    // colorear con una cara más en sombra: pintamos plano, la luz hace el resto
    const tinte = i % 2 ? C.contrafuerte : C.contrafuerteClaro;
    const g2 = pintar(cf, tinte);
    // orientar: el perfil vive en x-y; lo llevamos radial girando en Y, y lo
    // pegamos al tronco (arranca dentro del radio del pie).
    g2.rotateY(-a + Math.PI / 2);
    g2.translate(Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4);
    base.push(g2);
  }

  // — ESPINAS cónicas del tronco joven (bajas, dispersas) —
  const re = prng(313);
  for (let i = 0; i < 40; i++) {
    const a = re() * Math.PI * 2;
    const y = 7 + re() * 16;
    const rr = R_ALTO + (R_BASE - R_ALTO) * (1 - (y - 7) / (Y_RAMA - 7)) * 0.6 + 0.2;
    base.push(pieza(new THREE.ConeGeometry(0.16, 0.5, 5), C.espina,
      [Math.cos(a) * rr, y, Math.sin(a) * rr], [0, -a, -Math.PI / 2]));
  }

  // — RAMAS MADRE horizontales (la copa aparasolada: se abre en horizontal) —
  const ramaTips = [];                        // puntas de rama: ahí cuelga la vida
  const NR = 7;
  for (let i = 0; i < NR; i++) {
    const a = (i / NR) * Math.PI * 2 + r() * 0.4;
    const largoR = 13 + r() * 6;
    const subir = 2.2 + r() * 3.0;            // casi horizontal, apenas sube
    const yR = Y_RAMA + i * 0.5;
    // la rama como cilindro tumbado
    const tipx = Math.cos(a) * largoR, tipz = Math.sin(a) * largoR, tipy = yR + subir;
    const dx = tipx, dy = subir, dz = tipz;
    const len = Math.hypot(dx, dy, dz);
    const rama = new THREE.CylinderGeometry(0.18, 0.55, len, 6);
    // alinear el cilindro (Y) con la dirección de la rama
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dx, dy, dz).normalize());
    const gg = rama.toNonIndexed();
    gg.applyQuaternion(q);
    gg.translate(tipx / 2, yR + subir / 2, tipz / 2);
    base.push(pintar(gg, C.cortezaCeiba));
    ramaTips.push(new THREE.Vector3(tipx, tipy, tipz));
  }

  const baseMesh = new THREE.Mesh(fusionar(base), MAT_VEG);
  baseMesh.frustumCulled = false;
  g.add(baseMesh);

  // — LA COPA APARASOLADA: misma silueta, follaje MASA (núcleo + cards) —
  const R_COPA = 21;                          // radio de la copa (empequeñece todo)
  const Y_COPA = Y_RAMA + 6;
  const esferas = [{ c: [0, Y_COPA, 0], r: R_COPA, esc: [1, 0.34, 1] }];
  // lóbulos que ensanchan y aplanan el parasol; los de arriba al sol
  const NL = 30;
  for (let i = 0; i < NL; i++) {
    const a = (i / NL) * Math.PI * 2 + r() * 0.5;
    const d = R_COPA * (0.42 + r() * 0.72);
    const yy = Y_COPA + (r() - 0.35) * 3.4;
    esferas.push({
      c: [Math.cos(a) * d, yy, Math.sin(a) * d],
      r: R_COPA * (0.26 + r() * 0.20), esc: [1.1, 0.5, 1.1],
    });
    r(); // conserva la secuencia determinista del tinte anterior
  }
  // faldón inferior (la cara oscura del parasol vista desde abajo)
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + r();
    const d = R_COPA * (0.55 + r() * 0.5);
    esferas.push({
      c: [Math.cos(a) * d, Y_COPA - 2.2 - r() * 1.6, Math.sin(a) * d],
      r: R_COPA * (0.22 + r() * 0.14), esc: [1.1, 0.45, 1.1],
    });
  }
  const gradienteTmp = new THREE.Color();
  const copaSeed = Number(new URLSearchParams(location.search).get('ceibaSeed')) || 70701;
  const gradiente = (x, y, z) => {
    const altura = THREE.MathUtils.clamp((y - (Y_COPA - 5)) / 8, 0, 1);
    const lateral = THREE.MathUtils.clamp((Math.sin(x * 0.12 + z * 0.08) * 0.5 + 0.5) * 0.18, 0, 0.18);
    if (altura < 0.38) return gradienteTmp.copy(col(C.copaBaja)).lerp(col(C.copaMedia), altura / 0.38 + lateral);
    return gradienteTmp.copy(col(C.copaMedia)).lerp(col(altura > 0.72 ? C.copaSol : C.copaAlta), (altura - 0.38) / 0.62 + lateral);
  };
  const copaMasa = crearCopaMasa(THREE, {
    esferas,
    gradiente,
    seed: copaSeed,
    brillo: 0.12,
    cobertura: 1.3,
    tamCard: 5.2,
    maxCards: 360,
    minCards: 20,
    modulacion: 0.42,
    nucleoOpts: { segs: [18, 13], encoger: 0.9, rugosidad: 0.26, sombra: 0.48 },
    texOpts: {
      oscuro: C.copaBaja, medio: C.copaMedia, claro: C.copaSol,
      hojas: 520, alargue: 2.2,
    },
    viento: { amplitud: 0.014, piso: Y_COPA - 19, velocidad: 0.82 },
    sombra: true,
  });
  const copaMesh = copaMasa.grupo;
  copaMesh.frustumCulled = false;
  g.add(copaMesh);

  g.position.set(CEIBA_XZ.x, alturaCeiba(CEIBA_XZ.x, CEIBA_XZ.z), CEIBA_XZ.z);
  return { group: g, copaMesh, baseMesh, ramaTips, Y_COPA, R_COPA, buttressAngs };
}

// ═══════════════════════════════════════════════════════════════════════════
//  LA FLORA DE TIERRA CALIENTE (Humboldt): guadua, plátano, cacao, dosel.
//  Cada una se lee por su SILUETA. Rodean sin tapar la vista al gigante.
// ═══════════════════════════════════════════════════════════════════════════

// GUADUA (bambú): mata de culmos altos, rectos, con nudos; penacho arriba.
function geomGuadua(seed = 1) {
  const r = prng(seed), p = [];
  const N = 6 + Math.floor(r() * 4);
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2, d = r() * 1.2;
    const H = 9 + r() * 6;
    const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    const incl = (r() - 0.5) * 0.14;
    p.push(pieza(new THREE.CylinderGeometry(0.09, 0.16, H, 6), mezcla(C.guadua, C.guaduaHoja, r() * 0.3).getStyle(),
      [cx, H / 2, cz], [0, 0, incl]));
    // nudos amarillentos
    for (let k = 1; k < 5; k++) {
      p.push(pieza(new THREE.TorusGeometry(0.13, 0.03, 4, 6), C.guaduaNodo, [cx, (H / 5) * k, cz], [Math.PI / 2, 0, 0]));
    }
    // penacho de hojas arriba
    for (let h = 0; h < 5; h++) {
      const ah = r() * Math.PI * 2;
      p.push(pieza(new THREE.ConeGeometry(0.1, 1.6, 4), C.guaduaHoja,
        [cx + Math.cos(ah) * 0.5, H + 0.3 + r() * 0.6, cz + Math.sin(ah) * 0.5], [Math.cos(ah) * 0.6, 0, Math.sin(ah) * 0.6]));
    }
  }
  return fusionar(p);
}

// PLÁTANO / cachaco: pseudotallo + grandes hojas rasgadas que caen.
function geomPlatano(seed = 2) {
  const r = prng(seed), p = [];
  const H = 3.2 + r() * 1.6;
  p.push(pieza(new THREE.CylinderGeometry(0.22, 0.32, H, 8), C.platanoTronco, [0, H / 2, 0]));
  // hojas ANCHAS que se arquean y CAEN (no espigas): se leen como fronda, no como
  // asterisco. Pala doble-triangular por hoja para dar cuerpo desde lejos.
  const NH = 5;
  for (let i = 0; i < NH; i++) {
    const a = (i / NH) * Math.PI * 2 + r() * 0.6;
    const largo = 2.4 + r() * 1.1;
    const caida = -0.85 - r() * 0.5;               // caen bien, arqueadas
    const hoja = new THREE.PlaneGeometry(1.7, largo, 2, 3);
    const gg = hoja.toNonIndexed();
    gg.rotateX(Math.PI / 2);
    gg.translate(0, 0, largo / 2);
    gg.rotateX(caida);
    gg.rotateY(-a);
    gg.translate(0, H + 0.15, 0);
    p.push(pintar(gg, mezcla(C.platanoHoja, C.platanoHojaClara, 0.3 + r() * 0.5).getStyle()));
  }
  // cogollo central erguido (la hoja nueva enrollada)
  p.push(pieza(new THREE.ConeGeometry(0.12, 1.2, 4), C.platanoHojaClara, [0, H + 0.6, 0]));
  return fusionar(p);
}

// CACAO (a la sombra): arbolito de copa densa con MAZORCAS pegadas al tronco
// (caulifloria — la flor y el fruto brotan del tronco, no de las ramas). Real.
function geomCacao(seed = 3) {
  const r = prng(seed), p = [];
  const H = 3.0 + r() * 1.2;
  p.push(pieza(new THREE.CylinderGeometry(0.12, 0.2, H, 6), C.cacaoTronco, [0, H / 2, 0]));
  // copa densa verde oscuro
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r();
    p.push(pieza(new THREE.IcosahedronGeometry(0.8 + r() * 0.5, 0), mezcla(C.cacaoHoja, C.doselSol, r() * 0.3).getStyle(),
      [Math.cos(a) * 0.9, H + 0.3 + r() * 0.8, Math.sin(a) * 0.9], null, [1.1, 0.9, 1.1]));
  }
  // MAZORCAS pegadas al tronco (ovaladas, ocre/rojizas)
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2, y = 0.8 + r() * (H - 1.0);
    p.push(pieza(new THREE.IcosahedronGeometry(0.22, 1), r() > 0.5 ? C.cacaoMazorca : C.cacaoMazorcaRoja,
      [Math.cos(a) * 0.24, y, Math.sin(a) * 0.24], null, [1, 1.7, 1]));
  }
  return fusionar(p);
}

// (ÁRBOL DE DOSEL de fondo: antes un domo icosaedro + lóbulos —parasol—; ahora es
//  yarumo ez-tree VIVO, ver bakearArquetipoFusion('yarumo') donde se siembra. El
//  domo viejo quedó eliminado por la purga AUDIT-ARBOLES-HUMBOLDT. La ceiba MISMA
//  conserva su copa aparasolada horizontal, que es FIEL a la especie.)

// ═══════════════════════════════════════════════════════════════════════════
//  LA VIDA EN EL ÁRBOL — cada inquilino es un OBJETO físico en la copa/ramas,
//  con su susurro (la LECCIÓN por observación, no por ficha). Se descubren
//  tocando la copa. Rigor de ecólogo en quién es quién.
// ═══════════════════════════════════════════════════════════════════════════

// BROMELIA-TANQUE: roseta de hojas rígidas + corazón rojo con AGUA. Guarda un
// litro de lluvia; ahí vive una rana que no baja al suelo (phytotelma real).
function geomBromelia(seed = 10) {
  const r = prng(seed), p = [];
  const N = 9;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const larga = 0.55 + r() * 0.2;
    p.push(pieza(new THREE.ConeGeometry(0.09, larga, 4), mezcla(C.bromelia, C.bromeliaRojo, i / N * 0.5).getStyle(),
      [Math.cos(a) * 0.16, larga * 0.35, Math.sin(a) * 0.16], [Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9]));
  }
  p.push(pieza(new THREE.ConeGeometry(0.1, 0.4, 5), C.bromeliaRojo, [0, 0.32, 0]));   // corazón rojo
  p.push(pieza(new THREE.CircleGeometry(0.07, 6), C.bromeliaAgua, [0, 0.34, 0], [-Math.PI / 2, 0, 0])); // el agua
  return fusionar(p);
}

// ORQUÍDEA epífita: no parásita, solo se agarra para alcanzar la luz. Mancha de
// color agarrada a la rama.
function geomOrquidea(seed = 11) {
  const r = prng(seed), p = [];
  const cflor = [C.orquidea, C.orquideaBlanca, C.orquideaAmar][Math.floor(r() * 3)];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    p.push(pieza(new THREE.CircleGeometry(0.13, 5), cflor, [Math.cos(a) * 0.12, 0.1, Math.sin(a) * 0.12], [-Math.PI / 2, 0, a]));
  }
  p.push(pieza(new THREE.IcosahedronGeometry(0.05, 0), C.orquideaAmar, [0, 0.12, 0]));
  // par de hojas carnosas
  for (const s of [-1, 1]) p.push(pieza(new THREE.IcosahedronGeometry(0.13, 0), C.helecho, [s * 0.14, 0.02, 0], null, [1, 0.3, 2.2]));
  return fusionar(p);
}

// HELECHO / MUSGO colgante: barbas verdes que cuelgan de la rama alta y guardan
// humedad como esponja.
function geomColgante(seed = 12) {
  const r = prng(seed), p = [];
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.3;
    const largo = 0.8 + r() * 1.3;
    p.push(pieza(new THREE.ConeGeometry(0.05, largo, 4), mezcla(C.musgo, C.musgoSeco, r()).getStyle(),
      [Math.cos(a) * d, -largo / 2, Math.sin(a) * d], [Math.PI, 0, 0]));
  }
  return fusionar(p);
}

// NIDO de aves en la horqueta: cuenco de fibras. La ceiba emergente es atalaya.
function geomNido(seed = 13) {
  const p = [];
  p.push(pieza(new THREE.TorusGeometry(0.28, 0.12, 5, 9), C.nido, [0, 0.1, 0], [Math.PI / 2, 0, 0]));
  p.push(pieza(new THREE.SphereGeometry(0.22, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), C.mantillo, [0, 0.02, 0], null, [1, 0.5, 1]));
  return fusionar(p);
}

// HORMIGUERO / termitero en el tronco: montón parduzco; la ciudad de insectos.
function geomHormiguero(seed = 14) {
  const r = prng(seed), p = [];
  p.push(pieza(new THREE.IcosahedronGeometry(0.5, 1), C.tierraHumeda, [0, 0, 0], null, [1, 1.4, 1]));
  for (let i = 0; i < 5; i++) p.push(pieza(new THREE.IcosahedronGeometry(0.18 + r() * 0.1, 0), C.mantillo,
    [(r() - 0.5) * 0.7, r() * 0.6, (r() - 0.5) * 0.5]));
  return fusionar(p);
}

// IGUANA en el contrafuerte, tomando el sol (rubber-hose vivo permitido en fauna).
function geomIguana(seed = 15) {
  const p = [];
  const verde = '#6b9a4a';
  p.push(pieza(new THREE.IcosahedronGeometry(0.22, 1), verde, [0, 0, 0], null, [2.4, 0.7, 1]));      // cuerpo
  p.push(pieza(new THREE.IcosahedronGeometry(0.13, 0), verde, [0.42, 0.03, 0], null, [1.4, 0.8, 1])); // cabeza
  p.push(pieza(new THREE.CylinderGeometry(0.05, 0.02, 1.2, 5), '#5c8a40', [-0.7, 0, 0], [0, 0, Math.PI / 2])); // cola
  for (const [sx, sz] of [[0.2, 0.18], [0.2, -0.18], [-0.2, 0.18], [-0.2, -0.18]])
    p.push(pieza(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 4), '#4f7a38', [sx, -0.12, sz], [0, 0, 0.5]));
  // cresta dorsal
  for (let i = 0; i < 5; i++) p.push(pieza(new THREE.ConeGeometry(0.04, 0.14, 4), '#8fbf5c', [-0.2 + i * 0.12, 0.16, 0]));
  return fusionar(p);
}

// ── material texturizado por canvas para los sprites de fauna voladora ────────
function murcielagoTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#2b2530';
  // cuerpo
  c.beginPath(); c.ellipse(32, 32, 5, 9, 0, 0, Math.PI * 2); c.fill();
  // alas membranosas (silueta de murciélago)
  c.beginPath();
  c.moveTo(32, 26);
  c.quadraticCurveTo(10, 14, 4, 30); c.quadraticCurveTo(14, 30, 18, 40);
  c.quadraticCurveTo(24, 34, 32, 40);
  c.quadraticCurveTo(40, 34, 46, 40); c.quadraticCurveTo(50, 30, 60, 30);
  c.quadraticCurveTo(54, 14, 32, 26);
  c.fill();
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function avesTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.strokeStyle = '#20242c'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(8, 40); c.quadraticCurveTo(32, 20, 32, 30); c.quadraticCurveTo(32, 20, 56, 40); c.stroke();
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function motaTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const c = cv.getContext('2d'), r = 16;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  const tx = new THREE.CanvasTexture(cv); return tx;
}
let _sombraTex = null;
function sombraTex() {
  if (_sombraTex) return _sombraTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d'), r = 64;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(24,18,10,0.5)'); g.addColorStop(0.6, 'rgba(24,18,10,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  _sombraTex = new THREE.CanvasTexture(cv);
  return _sombraTex;
}
// textura del HAZ de luz (gradiente vertical suave, para las cuchillas de sol)
function hazTex() {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,238,180,0.5)'); g.addColorStop(0.6, 'rgba(255,232,168,0.16)'); g.addColorStop(1, 'rgba(255,230,160,0)');
  c.fillStyle = g; c.fillRect(0, 0, 16, 128);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}

// ═══════════════════════════════════════════════════════════════════════════
//  INIT — monta el mundo autónomo
// ═══════════════════════════════════════════════════════════════════════════
export function initCeiba() {
  const params = new URLSearchParams(location.search);
  const camModo = params.get('cam');          // `hero`/`dosel`/`raices` = cuadros fijos del gate

  // ── SUPRIMIR EL VALLE (main.js corre detrás) ────────────────────────────────
  const sup = document.createElement('style');
  sup.textContent =
    'body.enCeiba #c,body.enCeiba #onb,body.enCeiba #load,body.enCeiba #hud,' +
    'body.enCeiba #capaLugares,body.enCeiba #barraMover,body.enCeiba #guiaSel,' +
    'body.enCeiba #guiaV,body.enCeiba #ventanaM,body.enCeiba #compaiFotoBtn,' +
    'body.enCeiba #mmapa{display:none!important}' +
    'body.enCeiba{background:#0d1108}';
  document.head.appendChild(sup);
  document.body.classList.add('enCeiba');
  const pararValle = () => { try { window.__r && window.__r.setAnimationLoop(null); } catch (e) { /* aún no */ } };
  pararValle(); setTimeout(pararValle, 300); setTimeout(pararValle, 1200);

  // ── CANVAS + RENDERER PROPIOS ───────────────────────────────────────────────
  const canvas = document.createElement('canvas'); canvas.id = 'cCeiba';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:20;touch-action:none';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.__r = renderer;
  window.__rCeiba = renderer;

  const scene = new THREE.Scene();
  scene.background = cieloCalido();
  scene.fog = new THREE.FogExp2(0xd7dcc0, 0.0072);   // neblina de calor: da PROFUNDIDAD y hace emerger la copa

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.4, 1600);
  window.__cam = camera; window.__scene = scene;
  window.__h = alturaCeiba;

  const raiz = new THREE.Group(); scene.add(raiz);

  // ── LUZ: sol ecuatorial DURO desde arriba + relleno cálido difuso abajo ──────
  scene.add(new THREE.HemisphereLight(0xe6e6c8, 0x2c3a24, 0.72));
  const sol = new THREE.DirectionalLight(0xfff0c8, 2.1);
  sol.position.set(30, 140, 40); scene.add(sol);                 // casi cenital (luz ecuatorial)
  const relleno = new THREE.DirectionalLight(0x9fb6a0, 0.4);
  relleno.position.set(-60, 30, -70); scene.add(relleno);

  // ── EL SUELO del piso cálido (tierra parda húmeda + hojarasca) ──────────────
  raiz.add(construirSuelo());

  // ── LA CEIBA — el gigante ───────────────────────────────────────────────────
  const ceiba = construirCeiba();
  raiz.add(ceiba.group);
  // sombra ancha de la copa aparasolada en el claro
  raiz.add(sombraPlano(20, CEIBA_XZ.x, alturaCeiba(CEIBA_XZ.x, CEIBA_XZ.z) + 0.05, CEIBA_XZ.z));

  // ── EL BOSQUE CÁLIDO alrededor (dosel del que EMERGE la ceiba) ───────────────
  const rr = prng(5150);
  const libre = (x, z) => Math.hypot(x - CLARO.x, z - CLARO.z) > CLARO.r * 0.7;
  function sembrar(geomFn, n, { rmin, escala, pred, extentX = [-140, 140], extentZ = [-150, 90], nSeeds = 3 }) {
    // varios seeds → variedad; instancia cada geometría
    const geoms = [];
    for (let s = 0; s < nSeeds; s++) geoms.push(geomFn(1000 + s * 7));
    const puestos = [];
    const listas = geoms.map(() => []);
    let intentos = 0;
    while (puestos.length < n && intentos < n * 60) {
      intentos++;
      const x = rand(extentX[0], extentX[1]), z = rand(extentZ[0], extentZ[1]);
      if (pred && !pred(x, z)) continue;
      if (!puestos.every((qp) => Math.hypot(qp.x - x, qp.z - z) > rmin)) continue;
      puestos.push({ x, z, g: Math.floor(rr() * nSeeds) });
      listas[puestos[puestos.length - 1].g].push({ x, z });
    }
    geoms.forEach((geo, gi) => {
      const lista = listas[gi]; if (!lista.length) return;
      const inst = new THREE.InstancedMesh(geo, MAT_VEG, lista.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
      lista.forEach((pt, k) => {
        const y = alturaCeiba(pt.x, pt.z);
        const e = escala[0] + rr() * (escala[1] - escala[0]);
        pos.set(pt.x, y, pt.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr() * Math.PI * 2);
        s.set(e, e * (0.92 + rr() * 0.16), e);
        m.compose(pos, q, s); inst.setMatrixAt(k, m);
      });
      inst.instanceMatrix.needsUpdate = true; inst.frustumCulled = false;
      raiz.add(inst);
    });
    return puestos;
  }

  // dosel de fondo: alto, denso, forma la pared verde de la que emerge la ceiba.
  // se deja un CORREDOR de visión (menos árboles altos justo delante del gigante)
  const corredor = (x, z) => !(Math.abs(x) < 22 && z > CLARO.z - 2 && z < 66);
  // dosel de fondo ez-tree: yarumo (Cecropia telealba, pionera del dosel cálido).
  // 1 geometría horneada → nSeeds:1 = 1 InstancedMesh (menos draw calls que los 3
  // seeds del domo viejo). Tinte casado a los verdes del dosel de la selva.
  const geomDoselYarumo = bakearArquetipoFusion('yarumo', { alturaObjetivo: 20, tintHoja: mezcla(C.doselB, C.doselSol, 0.4).getStyle(), tintCorteza: C.cacaoTronco });
  sembrar(() => geomDoselYarumo, 60, { rmin: 12, escala: [0.9, 1.5], pred: (x, z) => libre(x, z) && corredor(x, z), nSeeds: 1 });
  // guaduales en manchones
  sembrar(geomGuadua, 26, { rmin: 8, escala: [0.9, 1.4], pred: (x, z) => libre(x, z) && corredor(x, z) });
  // plátano y cacao en el estrato bajo, más cerca (a la sombra)
  sembrar(geomPlatano, 30, { rmin: 4.5, escala: [0.9, 1.5], pred: libre, extentX: [-70, 70], extentZ: [-70, 60] });
  sembrar(geomCacao, 34, { rmin: 4, escala: [0.9, 1.4], pred: libre, extentX: [-64, 64], extentZ: [-64, 55] });

  // ── LA SEMILLA KAPOK al pie (el corte de Nolan: de esto salió el gigante) ────
  const semilla = construirSemilla();
  const sx = CEIBA_XZ.x + 5.5, sz = CEIBA_XZ.z + 9;
  semilla.position.set(sx, alturaCeiba(sx, sz) + 0.15, sz);
  raiz.add(semilla);

  // ── LA VIDA EN EL ÁRBOL: inquilinos físicos en la copa/ramas + sus susurros ──
  const inquilinos = poblarLaVida(ceiba, raiz);

  // ── HACES DE LUZ dorada bajando por el dosel sobre la ceiba (Zelda/BOTW) ─────
  const haces = construirHaces();
  raiz.add(haces);

  // ── FAUNA: aves sobre la atalaya + murciélagos rondando la copa al atardecer ─
  const fauna = construirFauna(ceiba);
  raiz.add(fauna.group);

  // ── polvo/pelusa dorada suspendida (kapok + polen en el haz de luz) ──────────
  const motas = construirMotas();
  raiz.add(motas.points);

  // ── CÁMARA HERO: baja, al pie, entre los contrafuertes, MIRANDO ARRIBA al
  //    gigante contra el cielo (Jackson: empequeñece todo; se siente chiquito). ─
  const gBase = alturaCeiba(CEIBA_XZ.x, CEIBA_XZ.z);
  // encuadre base→copa por el CORREDOR limpio (nada tapa al gigante): se ven los
  // CONTRAFUERTES al pie Y la copa emergente loomeando arriba (Jackson: chiquito
  // mirando al gigante, con su firma a la vista).
  const HERO_POS = new THREE.Vector3(13, gBase + 3.2, 31);
  const HERO_TGT = new THREE.Vector3(0, gBase + 15, CEIBA_XZ.z);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 4; controls.maxDistance = 220;
  controls.maxPolarAngle = 1.56;
  controls.target.copy(HERO_TGT);
  controls.enabled = false;
  window.__ctl = controls;

  // ── INTRO (Nolan / IMAX vertical): NACE en la semilla al pie y SUBE por el
  //    tronco hasta la copa emergente. El corte semilla→gigante es la lección. ─
  let introDone = false, introStart = null;
  const introPos = new THREE.CatmullRomCurve3([
    new THREE.Vector3(sx + 1.5, gBase + 0.8, sz + 2.5),        // agachado sobre la semilla
    new THREE.Vector3(10, gBase + 3, 20),
    new THREE.Vector3(14, gBase + 8, 24),                      // sube pegado al tronco
    HERO_POS.clone(),
  ]);
  const introTgt = new THREE.CatmullRomCurve3([
    new THREE.Vector3(sx, gBase + 0.3, sz),                    // la semilla diminuta
    new THREE.Vector3(0, gBase + 12, CEIBA_XZ.z),
    new THREE.Vector3(0, gBase + 26, CEIBA_XZ.z),              // barre hacia la copa
    HERO_TGT.clone(),
  ]);
  const INTRO_S = 8.5;

  function darControl() {
    if (controls.enabled) return;
    camera.position.copy(HERO_POS); controls.target.copy(HERO_TGT);
    controls.enabled = true; controls.update();
  }
  function endIntro() { if (introDone) return; introDone = true; darControl(); avisar(); pistaMirarArriba(); }
  function mano() { if (!introDone) endIntro(); }
  addEventListener('pointerdown', mano); addEventListener('keydown', mano); addEventListener('wheel', mano, { passive: true });

  // cuadros fijos deterministas para el gate
  if (camModo === 'hero') {
    introDone = true; camera.position.copy(HERO_POS); camera.lookAt(HERO_TGT);
  } else if (camModo === 'dosel') {
    // PRUEBA la emergencia: desde la altura del dosel, la copa asomando sobre el bosque
    introDone = true;
    camera.position.set(52, gBase + 30, 58); camera.lookAt(0, gBase + 40, CEIBA_XZ.z);
  } else if (camModo === 'raices') {
    // los contrafuertes tablares como murallas alrededor
    introDone = true;
    camera.position.set(7, gBase + 1.5, 11); camera.lookAt(0, gBase + 7, CEIBA_XZ.z);
  } else if (params.get('onb') === '0') {
    introDone = true; darControl(); pistaMirarArriba();
  } else {
    camera.position.copy(introPos.getPoint(0)); camera.lookAt(introTgt.getPoint(0));
  }

  // ── UI mínima: título + hint (NO panel de datos — la lección es descubrir) ───
  montarTitulo();
  const avisar = montarAvisoYSalida();

  // ── EL DESCUBRIMIENTO: tocar la COPA revela a un inquilino (susurro), tocar
  //    los CONTRAFUERTES / la SEMILLA revela el TIEMPO PROFUNDO. Sin puntaje. ──
  const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
  let dx0 = 0, dy0 = 0, dt0 = 0;
  const descubiertos = new Set();
  const susurrosTiempo = [
    'Esta ceiba ya estaba aquí antes que su bisabuelo. Vive más de trescientos años.',
    'De una semilla con pelusa, más liviana que el aire, salió este gigante. El tiempo hace lo imposible.',
    'El pueblo la deja en pie. Un árbol así no se tumba: es de todos, y estaba antes que todos.',
  ];
  let tiempoIdx = 0;
  canvas.addEventListener('pointerdown', (e) => { dx0 = e.clientX; dy0 = e.clientY; dt0 = performance.now(); });
  canvas.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - dx0, e.clientY - dy0) > 9 || performance.now() - dt0 > 600) return;
    pt.x = (e.clientX / innerWidth) * 2 - 1; pt.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(pt, camera);

    // ¿tocó un inquilino directamente? (o su cercanía en la copa)
    const golpeInq = ray.intersectObjects(inquilinos.map((q) => q.mesh), true);
    if (golpeInq.length) {
      const obj = golpeInq[0].object;
      const inq = inquilinos.find((q) => q.mesh === obj || (q.mesh.children && q.mesh.children.includes(obj)));
      if (inq) { revelar(inq); return; }
    }
    // ¿tocó la copa? → revela el inquilino MÁS CERCANO al punto tocado
    const golpeCopa = ray.intersectObject(ceiba.copaMesh, true);
    if (golpeCopa.length) {
      const p = golpeCopa[0].point;
      let mejor = null, dmin = Infinity;
      for (const q of inquilinos) {
        const d = q.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(p);
        if (d < dmin) { dmin = d; mejor = q; }
      }
      if (mejor) { revelar(mejor); return; }
    }
    // ¿tocó los contrafuertes / el pie / la semilla? → TIEMPO PROFUNDO
    const golpeBase = ray.intersectObject(ceiba.baseMesh, false);
    const golpeSem = ray.intersectObject(semilla, true);
    if (golpeBase.length || golpeSem.length) {
      susurrar(susurrosTiempo[tiempoIdx % susurrosTiempo.length], '#e8d59a');
      tiempoIdx++;
    }
  });

  function revelar(inq) {
    // pulso de escala en el inquilino (el ojo lo encuentra) + susurro contemplativo
    inq.pulso = performance.now();
    descubiertos.add(inq.id);
    susurrar(inq.susurro, inq.color);
    if (descubiertos.size === inquilinos.length && !window.__ceibaCerrado) {
      window.__ceibaCerrado = true;
      setTimeout(() => susurrar(
        'Contó bien: un árbol no es un árbol. Es un mundo entero, y es tiempo. Por eso la ceiba se queda.',
        '#f0e6c0', 7000), 2600);
    }
  }

  // ── POST: bloom cálido de la hora dorada (el haz de sol, la vida al sol) ─────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.34, 0.75, 0.82));
  composer.addPass(new OutputPass());
  // gradeo fílmico final unificado (lib3d) — mismo look que el valle
  const gradeo = new ShaderPass(ShaderGradeoFinal);
  gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
  composer.addPass(gradeo);

  // ── PELUSA KAPOK GPU (three.quarks vía lib3d-motas) ────────────────────────
  // El haz de luz baja por el tronco; la pelusa nace en un volumen alto y ancho
  // alrededor de la ceiba y deriva liviana. Es LA firma de la ceiba.
  const pelusaKapok = crearMotas(scene, {
    color: '#fbf3dc', opacidad: 0.75,
    tam: [0.9, 2.2], vida: [9, 17], emisionSeg: 120,
    caja: [70, 34, 60], centro: new THREE.Vector3(0, 15, 6),
    viento: new THREE.Vector3(0.6, 0, 0.25), subida: 0.05,
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
    gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
  });

  const loadEl = document.getElementById('load');
  if (loadEl) { loadEl.style.opacity = 0; setTimeout(() => loadEl.remove(), 700); }

  // ── LOOP ────────────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const t = clock.elapsedTime;
    tickVientoMundos(t);
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
    // viento en la copa (la ceiba respira) + epífitas
    ceiba.copaMesh.rotation.z = Math.sin(t * 0.35) * 0.012;
    ceiba.copaMesh.rotation.x = Math.cos(t * 0.28) * 0.010;
    // pulso de descubrimiento en los inquilinos
    const now = performance.now();
    for (const q of inquilinos) {
      if (q.pulso) {
        const k = (now - q.pulso) / 900;
        if (k >= 1) { q.pulso = 0; q.mesh.scale.setScalar(q.esc); }
        else { const s = q.esc * (1 + Math.sin(k * Math.PI) * 0.6); q.mesh.scale.setScalar(s); }
      }
    }
    haces.children.forEach((h, i) => { h.material.opacity = 0.2 + Math.sin(t * 0.5 + i) * 0.06; });
    fauna.update(t, camera);
    motas.update(t);                 // pelusa Points de siempre (se mantiene, base)
    pelusaKapok.update(delta);       // pelusa kapok GPU (three.quarks) que deriva viva
    gradeo.uniforms.uSemilla.value = (t % 1000);
    composer.render();
  });

  window.__ceiba = { scene, camera, renderer, controls, ceiba, inquilinos };
  return window.__ceiba;
}

// ── CIELO CÁLIDO (celeste arriba, dorado difuso abajo por el calor) ───────────
function cieloCalido() {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 512;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.00, C.cieloCenit);
  g.addColorStop(0.45, C.cieloMedio);
  g.addColorStop(0.75, C.neblinaCalor);
  g.addColorStop(1.00, C.cieloHorizonte);
  c.fillStyle = g; c.fillRect(0, 0, 16, 512);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

// ── EL SUELO: heightfield tierra parda húmeda + hojarasca del bosque ──────────
function construirSuelo() {
  const SIZE = 620, SEG = 150;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colr = new Float32Array(pos.count * 3);
  const base = mezcla(C.tierra, C.verdín, 0.35);
  const humeda = col(C.tierraHumeda), hoj = col(C.hojarasca), mant = col(C.mantillo), verd = col(C.verdín);
  const solTinte = col('#cdb478');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = alturaCeiba(x, z);
    pos.setY(i, y);
    tmp.copy(base);
    const verdK = fbm(x * 0.05 - 3, z * 0.05 + 9);              // musgo/verdín en la humedad
    tmp.lerp(verd, THREE.MathUtils.clamp(verdK - 0.4, 0, 1) * 0.7);
    const hojK = fbm(x * 0.08 + 5, z * 0.08 - 4);               // hojarasca ocre
    if (hojK > 0.6) tmp.lerp(hoj, (hojK - 0.6) * 1.5);
    if (fbm(x * 0.13, z * 0.13) < 0.28) tmp.lerp(mant, 0.35);   // materia orgánica oscura
    const humK = fbm(x * 0.03 + 2, z * 0.03 - 6);
    if (humK < 0.35) tmp.lerp(humeda, (0.35 - humK) * 1.2);
    // manchas de sol que se cuelan por el dosel (dappled light)
    const dap = THREE.MathUtils.clamp((fbm(x * 0.10 + 1, z * 0.10 - 3) - 0.5) * 2.4, 0, 1);
    tmp.lerp(solTinte, dap * 0.16);
    colr[i * 3] = tmp.r; colr[i * 3 + 1] = tmp.g; colr[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
}

// ── LA SEMILLA KAPOK: vaina abierta + pelusa blanca (de esto salió el gigante) ─
function construirSemilla() {
  const g = new THREE.Group();
  const matVaina = new THREE.MeshStandardMaterial({ color: col(C.kapokVaina), roughness: 1, flatShading: true });
  const matPelusa = new THREE.MeshStandardMaterial({ color: col(C.kapok), roughness: 1, flatShading: true });
  // dos valvas de la vaina abierta
  for (const s of [-1, 1]) {
    const v = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI), matVaina);
    v.rotation.z = s * 0.6; v.position.set(s * 0.16, 0.12, 0); v.scale.set(1, 1.5, 0.7); g.add(v);
  }
  // pelusa de kapok saliendo
  const rp = prng(88);
  for (let i = 0; i < 7; i++) {
    const pel = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09 + rp() * 0.05, 0), matPelusa);
    pel.position.set((rp() - 0.5) * 0.35, 0.22 + rp() * 0.22, (rp() - 0.5) * 0.3); g.add(pel);
  }
  return g;
}

// ── sombra de contacto como plano ────────────────────────────────────────────
function sombraPlano(r, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: sombraTex(), transparent: true, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
  return m;
}

// ── POBLAR LA VIDA: inquilinos físicos en la copa/ramas, cada uno con susurro ─
function poblarLaVida(ceiba, raiz) {
  const inquilinos = [];
  const base = ceiba.group.position;   // el gigante está trasladado; posicionamos en mundo
  const tips = ceiba.ramaTips;
  const push = (id, geo, worldPos, esc, susurro, color) => {
    const mesh = new THREE.Mesh(geo, MAT_VEG);
    mesh.position.copy(worldPos); mesh.scale.setScalar(esc); mesh.frustumCulled = false;
    raiz.add(mesh);
    inquilinos.push({ id, mesh, esc, susurro, color, pulso: 0 });
  };
  const wp = (local) => new THREE.Vector3(base.x + local.x, base.y + local.y, base.z + local.z);

  // bromelias-tanque y orquídeas repartidas sobre las ramas madre
  const rl = prng(4242);
  tips.forEach((tip, i) => {
    const mid = tip.clone().multiplyScalar(0.6);           // a media rama
    if (i % 2 === 0) {
      push('bromelia' + i, geomBromelia(50 + i), wp(new THREE.Vector3(mid.x, mid.y + 0.6, mid.z)), 3.2 + rl(),
        'En el cuenco de esta bromelia cabe un litro de lluvia. Ahí vive una ranita que nunca baja al suelo.', '#4f9a5a');
    } else {
      push('orquidea' + i, geomOrquidea(60 + i), wp(new THREE.Vector3(mid.x * 1.1, mid.y + 0.3, mid.z * 1.1)), 3.0 + rl(),
        'Esa mancha de color es una orquídea. No es parásita: sólo se agarra del árbol para alcanzar la luz.', '#d66aa0');
    }
    // musgo/helecho colgando de la punta de algunas ramas
    if (i % 3 === 0) {
      push('colgante' + i, geomColgante(70 + i), wp(new THREE.Vector3(tip.x * 0.9, tip.y - 0.5, tip.z * 0.9)), 2.6,
        'El musgo y los helechos cuelgan de las ramas altas. Guardan la humedad como una esponja, hasta en la sequía.', '#6f9a5a');
    }
  });

  // nido en la horqueta (atalaya)
  push('nido', geomNido(13), wp(new THREE.Vector3(tips[0].x * 0.5, ceiba.Y_COPA - 4, tips[0].z * 0.5)), 3.4,
    'Aquí anida el pájaro. Desde la ceiba emergente vigila todo el bosque: es su atalaya sobre el mundo.', '#c9a56a');

  // el murciélago-polinizador (marcado como inquilino aunque también vuela) — su
  // susurro corrige el mito: la flor abre de noche y la poliniza el murciélago.
  push('murcielago', geomBromelia(999), wp(new THREE.Vector3(tips[2].x * 0.4, ceiba.Y_COPA + 1, tips[2].z * 0.4)), 0.01,
    'La flor de la ceiba abre de noche y huele fuerte. Quien la poliniza es el murciélago, no la abeja.', '#c9b2e0');

  // hormiguero en el tronco (la ciudad de insectos: un árbol es un pueblo)
  push('hormiguero', geomHormiguero(14), wp(new THREE.Vector3(1.6, 9, 1.2)), 2.0,
    'Miles de hormigas y comejenes tienen aquí su ciudad. Un solo árbol es un pueblo entero de vidas.', '#8a6a44');

  // iguana al sol sobre un contrafuerte (fauna viva)
  const a0 = ceiba.buttressAngs[1];
  push('iguana', geomIguana(15), wp(new THREE.Vector3(Math.cos(a0) * 5, 2.4, Math.sin(a0) * 5)), 1.4,
    'La iguana sube al sol por los contrafuertes. Esas aletas de raíz son escaleras y son murallas.', '#6b9a4a');

  return inquilinos;
}

// ── HACES DE LUZ dorada (cuchillas de sol bajando por el dosel sobre el claro) ─
function construirHaces() {
  const g = new THREE.Group();
  const tex = hazTex();
  const rp = prng(717);
  for (let i = 0; i < 5; i++) {
    const a = rp() * Math.PI * 2, d = 8 + rp() * 20;
    const bx = CEIBA_XZ.x + Math.cos(a) * d, bz = CEIBA_XZ.z + Math.sin(a) * d;
    const alto = 26 + rp() * 10, ancho = 1.8 + rp() * 1.8;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, color: 0xffe9b0, transparent: true, opacity: 0.2,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), mat);
    q.position.set(bx, alturaCeiba(bx, bz) + alto / 2, bz);
    q.rotation.y = rp() * Math.PI;
    q.rotation.x = 0.12 * (rp() - 0.5);
    g.add(q);
  }
  return g;
}

// ── FAUNA: aves cruzando la atalaya + murciélagos rondando la copa ────────────
function construirFauna(ceiba) {
  const g = new THREE.Group();
  const avTex = avesTex(), muTex = murcielagoTex();
  const base = ceiba.group.position;
  const bichos = [];
  const rf = prng(6161);
  // aves alto sobre la copa
  for (let i = 0; i < 7; i++) {
    const mat = new THREE.SpriteMaterial({ map: avTex, transparent: true, depthWrite: false, fog: true });
    const sp = new THREE.Sprite(mat); const s = 1.6 + rf() * 0.8; sp.scale.set(s, s, s);
    bichos.push({ sp, cx: base.x, cy: base.y + ceiba.Y_COPA + 6 + rf() * 8, cz: base.z, r: 12 + rf() * 16, ph: rf() * 6, sp2: 0.25 + rf() * 0.25, yb: rf() * 4 });
    g.add(sp);
  }
  // murciélagos rondando la copa (atardecer / polinización nocturna insinuada)
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.SpriteMaterial({ map: muTex, transparent: true, depthWrite: false, fog: true });
    const sp = new THREE.Sprite(mat); const s = 0.9 + rf() * 0.5; sp.scale.set(s, s, s);
    bichos.push({ sp, cx: base.x, cy: base.y + ceiba.Y_COPA + rf() * 3, cz: base.z, r: ceiba.R_COPA * (0.5 + rf() * 0.6), ph: rf() * 6, sp2: 0.6 + rf() * 0.6, yb: (rf() - 0.5) * 3, murci: true });
    g.add(sp);
  }
  function update(t) {
    for (const b of bichos) {
      const a = t * b.sp2 + b.ph;
      b.sp.position.set(b.cx + Math.cos(a) * b.r, b.cy + b.yb + Math.sin(a * (b.murci ? 2.2 : 1.4)) * (b.murci ? 1.2 : 2.4), b.cz + Math.sin(a) * b.r);
    }
  }
  return { group: g, update };
}

// ── polvo/pelusa dorada suspendida (kapok + polen en el haz de luz) ───────────
function construirMotas() {
  const N = 300, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), base = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = rand(-70, 70), z = rand(-70, 50), y = alturaCeiba(x, z) + rand(1.5, 30);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; base[i] = y;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: motaTex(), color: 0xf8ecc4, size: 0.55, sizeAttenuation: true,
    transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const update = (t) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] = base[i] + Math.sin(t * 0.3 + i * 1.3) * 0.9;
      p[i * 3] += Math.sin(t * 0.15 + i) * 0.005;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points, update };
}

// ── UI: TÍTULO mínimo (NO panel de datos — la lección es descubrir mirando) ───
function montarTitulo() {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:16px;top:14px;z-index:30;max-width:min(56vw,420px);' +
    'font-family:system-ui,-apple-system,sans-serif;color:#f3efe0;pointer-events:none;text-shadow:0 2px 12px rgba(0,0,0,.7)';
  box.innerHTML =
    '<div style="font-size:1.15rem;font-weight:700">🌳 La ceiba</div>' +
    '<div style="font-size:.74rem;opacity:.82;margin-top:1px">Tierra caliente · el gigante que emerge sobre la selva</div>' +
    '<div style="font-size:.72rem;opacity:.72;margin-top:6px;font-style:italic;line-height:1.35">' +
    'No es un árbol: es un mundo, y es tiempo. Mire arriba.</div>';
  document.body.appendChild(box);
}

// ── pista efímera: «mire arriba y toque la copa» (invitación, no instrucción) ──
function pistaMirarArriba() {
  if (document.getElementById('ceibaPista')) return;
  const el = document.createElement('div'); el.id = 'ceibaPista';
  el.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);z-index:35;' +
    'font-family:system-ui,sans-serif;color:#f7efd8;font-size:.9rem;font-weight:600;letter-spacing:.02em;' +
    'text-shadow:0 2px 14px rgba(0,0,0,.85);pointer-events:none;opacity:0;transition:opacity 1.1s;text-align:center';
  el.innerHTML = '↑ mire arriba<br><span style="font-size:.74rem;font-weight:400;opacity:.85">toque la copa y descubra quién vive ahí</span>';
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 1200); }, 6500);
}

// ── SUSURRO: el descubrimiento aparece suave, contemplativo, sin puntaje ──────
function susurrar(texto, color = '#f0e6c0', dur = 6000) {
  let el = document.getElementById('ceibaSusurro');
  if (!el) {
    el = document.createElement('div'); el.id = 'ceibaSusurro';
    el.style.cssText = 'position:fixed;left:50%;bottom:12%;transform:translateX(-50%);z-index:42;' +
      'max-width:min(84vw,540px);text-align:center;font-family:Georgia,\'Times New Roman\',serif;' +
      'font-size:1.06rem;line-height:1.5;color:#f4eeda;padding:14px 22px;' +
      'background:radial-gradient(ellipse at center,rgba(18,14,7,.82),rgba(18,14,7,.34) 70%,transparent);' +
      'border-radius:20px;pointer-events:none;transition:opacity .8s;text-shadow:0 2px 12px rgba(0,0,0,.8)';
    document.body.appendChild(el);
  }
  el.style.borderLeft = ''; // susurro centrado, sin barra de color de panel
  el.innerHTML = '<span style="color:' + color + ';font-size:1.3rem;vertical-align:-2px">✦</span> ' + texto;
  el.style.opacity = '1';
  clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, dur);
}

// ── aviso de entrada + botón de salida al valle ───────────────────────────────
function montarAvisoYSalida() {
  const salir = document.createElement('button');
  salir.textContent = '← Volver al valle';
  salir.style.cssText = 'position:fixed;right:14px;top:14px;z-index:31;border:1px solid rgba(224,200,140,.4);' +
    'background:rgba(16,20,8,.8);color:#f3efe0;border-radius:999px;padding:8px 16px;font:600 .8rem system-ui,sans-serif;' +
    'cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4)';
  salir.onclick = () => { location.href = './'; };
  document.body.appendChild(salir);

  return function avisar() {
    let el = document.getElementById('ceibaToast');
    if (!el) {
      el = document.createElement('div'); el.id = 'ceibaToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:40;' +
        'background:rgba(16,20,8,.92);color:#f3efe0;border:1px solid rgba(224,200,140,.35);border-radius:999px;' +
        'padding:10px 20px;font:500 .86rem system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:opacity .4s';
      document.body.appendChild(el);
    }
    el.textContent = '🌳 Está al pie de la ceiba · arrastre para mirar arriba · toque la copa';
    el.style.opacity = '1';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 4600);
  };
}
