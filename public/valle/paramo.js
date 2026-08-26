// ── EL PÁRAMO NATIVO, SOBRE EL VALLE REAL ────────────────────────────────────
// «Quiero el páramo — el que más furia costó — construido en el valle de
//  verdad, no en un diorama aparte.» (operador, 2026-07-30)
//
// No es una escena nueva: es ESTE valle — el DEM real de terrain.js, la meseta
// que corona el escarpe de La Chorrera (elev > 3080 msnm, z < -1140, el «labio»
// donde el catálogo pone el mundo páramo: x=-40, z=-1160, +573 m sobre la casa).
// Se activa con `?mundo=paramo` → main.js llama `makeParamo({scene,camera,...})`,
// mismo patrón que la lección del agua (`?leccion=agua`).
//
// DIRECCIÓN DE ARTE v3 (la paleta madre de fable/paramo-humboldt-real, que es
// el páramo que YA se ve bien — paramo-jackson.guatoc.co):
//   - La firma: frailejón PLATA-SALVIA #bcc6ac (paramoPlata, LA firma según
//     paletaMadre.js) sobre pajonal DORADO #a5975c (sierra aprobada). El
//     marrón plano queda PROHIBIDO: la enagua del frailejón es pajiza cálida,
//     el suelo es paja dorada, la turba solo asoma en el corte de suelo.
//   - Jackson (épico): el frailejonal es un EJÉRCITO — decenas de rosetas
//     plateadas marchando hacia la bruma, y el telón son CORDILLERAS apiladas
//     con perspectiva aérea horneada, no un cielo blanco vacío.
//   - Nolan (luz/asombro): bruma verde-plata #d6e0d2 CON LUZ — un resplandor
//     dorado bajo en el cielo, y el momento: la laguna del nacimiento
//     espejando la niebla junto a la queñua maestra. El páramo flota sobre un
//     MAR DE NUBES: abajo, donde no se ve, están las fincas.
//   - Zelda BOTW (color vivo): dorado + plata + verde salvia + la corteza
//     ROJIZA papirosa de la queñua (#8a4a33/#cf9166) + capítulos AMARILLOS.
//   - Agroecólogo: turba negra (andosol), musgo esponja, edades del frailejón
//     (roseta rasa → centenario), micorrizas. Instruccional: 6 estaciones.
//
// REGLA #1, INVIOLABLE: TODO anclado a `height(x,z)`. CADA instancia (frailejón,
// pajonal, musgo, queñua, piedra) muestrea el terreno en SU x,z y apoya su base
// en y=0. CERO flotando. Fue el bug que costó el mundo dos veces.
//
// El corte de suelo REUSA el concepto de Mundo3DSuelo.jsx: TRES capas reales
// (hojarasca → suelo negro → subsuelo), raíces que bajan, y el «internet de
// hongos» (micorrizas). Grounded en DR-paramo-frailejon.md: el suelo del páramo
// es NEGRO, ácido y profundo (andosol); el frailejón es la esponja de agua.
import * as THREE from 'three';
import { height, elevOf, fbm } from './terrain.js';
import { elegirSinRepetir } from './compai/gestos.js';
// La MATRIZ del páramo (pajonal, chusque, turbera, roca con líquenes). Nació del
// diagnóstico de este mismo mundo —«el frailejón está aprobado pero FLOTA, porque
// hoy el páramo son frailejones sobre nada»— y sin embargo llevaba desde que se
// escribió sin que ningún mundo la importara. Ver lib3d/flora/matrizParamo.js.
import { crearMatrizParamo } from './lib3d/flora/matrizParamo.js';
// El ABUELO del frailejonal: un frailejón viejísimo que se enderezó y despertó.
// Mismo caso que la matriz — 1.428 líneas con CERO importadores. Su sitio
// natural es este mundo: es el guardián del frailejonal. (F23) Ya NO se llama
// "El Ent" en la UI: el Ent del páramo es la queñua (DISENO-ENT-PARAMO-epico).
import { crearEntParamo } from './lib3d/creatures/entParamo.js';
// La hierba florida del páramo: lupinos, árnica y valerianas (grafo AGE) que
// ondulan CON el pajonal (mismo reloj de vientoMundos). Ver floresParamo.js.
import { crearFloresParamo } from './floresParamo.js';
// La corriente de montaña: la quebrada que nace en el frailejonal. Mismo caso
// de huérfano que matriz/ent — aguaParamo.js vivía probada en comparador-agua.html
// y nadie la importaba. Su sitio natural es LA CABECERA: el agua que corre antes
// de caer en La Chorrera. `profundidadEn` es su zanja: aquí se excava en el
// terreno real del valle (ver excavarQuebrada).
import { crearQuebrada } from './lib3d/fx/aguaParamo.js';
// Copas de MASA para la queñua (F21): el censo de copas low-poly señaló los
// icosaedros facetados de este archivo («la quenua es el Ent del páramo» y se
// mira de cerca). Mismo patrón ya aprobado en leccion-agua.js: núcleo esculpido
// + cards densos, viento del reloj global de vientoMundos.
import { crearCopaMasa } from './lib3d/flora/FollajeMasa.js';
import { aplicarVientoMundo } from './lib3d/flora/vientoMundos.js';
import { wireParamoLecciones } from './paramo-vivo-lecciones.js';
// (F23) El cóndor: Vultur gryphus planeando las térmicas sobre el frailejonal.
// Portado al lenguaje del valle desde los modos orbita/cruce que ya pasaron
// gate en la PWA (CondorBillboard/CondorCielo3D) — geometría nativa, no el
// billboard pixel-art del build React. Ver lib3d/creatures/condorParamo.js.
import { crearCondorParamo } from './lib3d/creatures/condorParamo.js';

// ── EL CORAZÓN DEL FRAILEJONAL: la meseta detrás del labio del escarpe ───────
const CX = -40, CZ = -1300;             // el rellano de la meseta (páramo real)
const AGUA = { x: CX - 45, z: CZ + 45 }; // el rellano más plano del DEM (sonda: dev 0,65 m sobre r=12)
const SUELO = { x: CX + 60, z: CZ - 130 }; // el corte de suelo (detrás de la vista madre)
const lejosDelCorte = (p) => Math.hypot(p.x - SUELO.x, p.z - SUELO.z) > 9;

// ── PALETA v3 — robada con orgullo de paletaMadre.js (la aprobada) ───────────
// VERDES.paramoPlata/#bcc6ac, TIERRAS.pajonal/#a5975c, CORTEZAS.quenual y
// quenualPapel, NIEBLAS.paramo/#d6e0d2, AGUAS.lagunaHonda, ACENTOS.frailejonFlor.
const P = {
  frailPlata: 0xbcc6ac,     // la roseta plateada — LA firma del páramo
  frailSage: 0x9aa888,      // hojas externas viejas, salvia apagado
  frailCogollo: 0xdde4cc,   // cogollo velloso central, casi blanco
  frailFlor: 0xe0c24a,      // los capítulos amarillos (ACENTOS.frailejonFlor)
  frailSeca: 0xa8845a,      // la enagua pajiza CÁLIDA (nunca marrón muerto)
  frailSeca2: 0x8a6b46,     // enagua en sombra
  paja: 0xa5975c,           // pajonal dorado-verdoso (TIERRAS.pajonal, sierra)
  pajaSol: 0xd9c176,        // la punta de la macolla donde pega el sol
  pajaSombra: 0x77713f,     // la base de la macolla
  quenuaTronco: 0x8a4a33,   // CORTEZAS.quenual: corteza rojiza madura
  quenuaLamina: 0xcf9166,   // CORTEZAS.quenualPapel: la lámina que se despega
  quenuaHoja: 0x5f7a4c,     // copa verde de páramo
  quenuaHoja2: 0x7d9463,    // copa a la luz
  musgo: 0x6f8a49,          // cojín de musgo, la esponja del agua
  musgoClaro: 0x8aa85c,
  hojarasca: 0x7d6038,      // capa 1: hojarasca (TIERRAS.mantillo)
  sueloNegro: 0x241a10,     // capa 2: suelo negro (andosol, NEUTROS.tinta)
  subsuelo: 0x8a6a44,       // capa 3: subsuelo (reserva clara y firme)
  lagunaHonda: 0x4f8391,    // el centro de la laguna (AGUAS.lagunaHonda)
  lagunaEspejo: 0xd8e2d6,   // la niebla que la laguna espeja
  espuma: 0xfdf7e8,         // AGUAS.espuma: la orilla a contraluz
  piedra: 0x9a8b74,         // roca del manantial (TIERRAS.piedra)
  raiz: 0xd8c9a6,           // raíces claras del corte de suelo
  mico: 0xefe6cf,           // micorrizas (hilo blanco hongo-raíz)
  bruma: 0xdcd5b4,          // NIEBLAS.paramo con el amanecer adentro (niebla CON luz)
};

// azar determinista (la foto del gate no cambia entre corridas)
let _s = 20730;
const rng = () => { _s = (_s * 16807) % 2147483647; return (_s - 1) / 2147483646; };

// concat manual de geometrías no-indexadas: cero merge null-silencioso.
// (F23) además de pos+normal arrastra color y uv CUANDO TODAS las piezas los
// traen — el degradado de las rosetas y el vaho de pelusa viajan por aquí.
function concat(...geos) {
  const g = geos.map((x) => (x.index ? x.toNonIndexed() : x));
  let n = 0; for (const x of g) n += x.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  const conColor = g.every((x) => x.attributes.color);
  const conUv = g.every((x) => x.attributes.uv);
  const colA = conColor ? new Float32Array(n * 3) : null;
  const uvA = conUv ? new Float32Array(n * 2) : null;
  let off = 0, off2 = 0;
  for (const x of g) {
    pos.set(x.attributes.position.array, off);
    nor.set(x.attributes.normal.array, off);
    if (colA) colA.set(x.attributes.color.array, off);
    if (uvA) uvA.set(x.attributes.uv.array, off2);
    off += x.attributes.position.array.length;
    off2 += x.attributes.position.count * 2;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (colA) out.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  if (uvA) out.setAttribute('uv', new THREE.BufferAttribute(uvA, 2));
  return out;
}
const lambert = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });

// pendiente local del DEM (para no plantar en la pared del escarpe)
function slopeAt(x, z) {
  const e = 2.5;
  const dx = (height(x + e, z) - height(x - e, z)) / (2 * e);
  const dz = (height(x, z + e) - height(x, z - e)) / (2 * e);
  return Math.hypot(dx, dz);
}
// muestrea puntos del rellano del páramo (elev alta + pendiente baja), anclados
function muestrear(n, radio, { elevMin = 3020, slopeMax = 0.42, sep = 0, evitar = null } = {}) {
  const out = []; let guard = n * 60;
  while (out.length < n && guard-- > 0) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * radio;
    const x = CX + Math.cos(a) * d, z = CZ + Math.sin(a) * d;
    const y = height(x, z);
    if (elevOf(y) < elevMin) continue;
    if (slopeAt(x, z) > slopeMax) continue;
    if (evitar && Math.hypot(x - evitar.x, z - evitar.z) < evitar.r) continue;
    if (sep && out.some((p) => Math.hypot(p.x - x, p.z - z) < sep)) continue;
    out.push({ x, y, z });
  }
  return out;
}

// ── HOJA LANCEOLADA (la del frailejón de verdad): pala ANCHA y plana con
//    quilla central (el doblez del nervio), no una púa. Base en y=0, punta en
//    y=len, ancho en X, quilla abombada en +Z. La roseta se arma con MUCHAS.
//    Fue la clave del rechazo: cono fino → coliflor; pala lanceolada → planta.
function hojaLanceoladaGeo(len, wid, keel = 0.14, grad = null) {
  const secc = [0.00, 0.12, 0.30, 0.52, 0.76, 1.00];
  const perf = [0.34, 0.74, 1.00, 0.88, 0.54, 0.02]; // fracción de ancho: lanceolada
  const pos = [], idx = [], colr = [];
  const cTmp = new THREE.Color();
  secc.forEach((t, i) => {
    const y = t * len, hw = perf[i] * wid * 0.5, kz = keel * Math.sin(t * Math.PI);
    pos.push(-hw, y, 0, 0, y, kz, hw, y, 0);   // borde izq · nervio · borde der
    if (grad) {
      // (F23) degradado base→punta: el corazón de la roseta es VERDE y la
      // plata vive en las puntas — así la mata lee como masa afelpada con
      // hondura y no como estrella de púas de un solo tono (spec Humboldt §1.1)
      cTmp.copy(grad[0]).lerp(grad[1], t * t);
      for (let v = 0; v < 3; v++) colr.push(cTmp.r, cTmp.g, cTmp.b);
    }
  });
  for (let i = 0; i < secc.length - 1; i++) {
    const a = i * 3, b = (i + 1) * 3;
    idx.push(a, a + 1, b, a + 1, b + 1, b);              // media hoja izquierda
    idx.push(a + 1, a + 2, b + 1, a + 2, b + 2, b + 1);  // media hoja derecha
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  if (grad) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colr), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL FRAILEJÓN v3 — proporciones de Espeletia de verdad: la ROSETA manda
//  (grande, abierta, plateada) y el tronco es corto y va VESTIDO con su
//  enagua pajiza. La v2 salía como poste de teléfono: tronco 3 m, roseta
//  enana. Unidad con base en y=0; la escala por instancia da las edades.
// ═══════════════════════════════════════════════════════════════════════════
// K=0.6 unidades/metro: un frailejón veterano REAL mide ~3 m = 1.8 unidades.
// La v2 salía con postes de 9 m: aquí la unidad completa (tronco+roseta) mide
// ~3.2 unidades y las TALLAS la bajan a escala humana. El épico no es el
// tamaño de la mata: es el EJÉRCITO.
const H_TRONCO = 1.6;

// tronco caulirrosulado: cilindro + anillos de hojas muertas pegadas (necromasa)
function troncoUnidadGeo() {
  const partes = [];
  const cil = new THREE.CylinderGeometry(0.15, 0.22, H_TRONCO, 7);
  cil.translate(0, H_TRONCO / 2, 0);
  partes.push(cil);
  // la necromasa REAL: hojas muertas ANCHAS colgando pegadas al tronco, en
  // anillos apretados de arriba a abajo (la enagua lanuda gris-parda del poste)
  for (let a = 0; a < 6; a++) {
    const yy = H_TRONCO * (0.95 - a * 0.155), rad = 0.19 + a * 0.012;
    for (let j = 0; j < 10; j++) {
      const ang = (j / 10) * Math.PI * 2 + a * 0.42;
      const hoja = hojaLanceoladaGeo(0.5, 0.24, 0.08);
      hoja.rotateX(Math.PI);       // punta hacia ABAJO (hoja marchita colgando)
      hoja.rotateZ(0.30);          // leve vuelo hacia afuera, no pegada plana
      hoja.rotateY(ang);
      hoja.translate(Math.cos(ang) * rad, yy, Math.sin(ang) * rad);
      partes.push(hoja);
    }
  }
  return concat(...partes);
}
// la falda cónica que envuelve la necromasa — ANGOSTA (pegada al tronco), que
// ancha leía como columna cuadrada
function faldaUnidadGeo() {
  const falda = new THREE.ConeGeometry(0.33, H_TRONCO * 0.80, 10, 1, true);
  falda.translate(0, H_TRONCO * 0.48, 0);
  return falda;
}
// roseta viva GRANDE: CUATRO coronas de HOJAS LANCEOLADAS (palas anchas), las
// de afuera abiertas y las de adentro empinadas — copa de plata densa tipo
// alcachofa/agave, cada hoja con su quilla. NO púa, NO plato, NO coliflor.
// (F23) palas MÁS ANCHAS y coronas más pobladas: la roseta real es un mazo
// denso de "orejas de burro", no una estrella rala — la silueta de agave/erizo
// fue hallazgo del spec (§1.1). El costo es geometría instanciada UNA vez.
const CAPAS_ROSETA = [
  { n: 21, len: 1.30, wid: 0.55, rad: 0.30, tilt: 0.30, y: 0.00 }, // externa: abierta, casi horizontal
  { n: 17, len: 1.12, wid: 0.48, rad: 0.21, tilt: 0.66, y: 0.13 }, // media
  { n: 13, len: 0.88, wid: 0.40, rad: 0.13, tilt: 1.00, y: 0.27 }, // interna: empinada
  { n: 8, len: 0.58, wid: 0.31, rad: 0.06, tilt: 1.30, y: 0.40 },  // cogollo: casi vertical
];
// multiplicadores del degradado (van SOBRE el color de instancia plata/salvia):
// base verde-sombra → punta blanca (deja pasar la plata de la instancia)
const GRAD_ROSETA = [new THREE.Color(0.46, 0.58, 0.40), new THREE.Color(1, 1, 1)];
function rosetaGeo(yBase) {
  const partes = [];
  for (const c of CAPAS_ROSETA) {
    for (let j = 0; j < c.n; j++) {
      const ang = (j / c.n) * Math.PI * 2 + c.y * 4.6;
      const hoja = hojaLanceoladaGeo(c.len, c.wid, 0.14, GRAD_ROSETA);
      hoja.rotateZ(-Math.PI / 2 + c.tilt);   // tumbar la pala hacia afuera/arriba
      hoja.rotateY(ang);
      hoja.translate(Math.cos(ang) * c.rad, yBase + c.y, Math.sin(ang) * c.rad);
      partes.push(hoja);
    }
  }
  return concat(...partes);
}
const rosetaUnidadGeo = () => rosetaGeo(H_TRONCO);   // roseta sobre el tronco
const rosetaRasaGeo = () => rosetaGeo(0.05);         // roseta joven, a ras de suelo

// ── el CAPÍTULO amarillo (la flor del frailejón): corona de lígulas amarillas
//    tumbadas en cuenco poco profundo alrededor del disco pardo (ver foto real)
function capituloGeoPetalos(r) {
  const gs = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const p = new THREE.BoxGeometry(r * 1.05, 0.02, r * 0.30);
    p.translate(r * 0.55, 0, 0);
    p.rotateZ(0.24);          // levantar la punta: cuenco poco profundo
    p.rotateY(a);
    gs.push(p);
  }
  return concat(...gs);
}
function capituloMesh(r = 0.15) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(capituloGeoPetalos(r), lambert(P.frailFlor, { side: THREE.DoubleSide })));
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, 0.05, 12), lambert(0x40300f));
  disco.position.y = 0.03; g.add(disco);
  return g;
}

// ── un frailejón PROTAGONISTA con detalle (roseta + vara de flores amarillas) ─
function frailejonHeroe(scene, base, esc) {
  const g = new THREE.Group();
  const y = height(base.x, base.z);
  const tronco = new THREE.Mesh(troncoUnidadGeo(), lambert(P.frailSeca2, { side: THREE.DoubleSide }));
  const falda = new THREE.Mesh(faldaUnidadGeo(), lambert(P.frailSeca, { side: THREE.DoubleSide }));
  const roseta = new THREE.Mesh(rosetaUnidadGeo(), lambert(P.frailPlata, { side: THREE.DoubleSide, vertexColors: true }));
  g.add(tronco, falda, roseta);
  const cog = new THREE.Mesh(new THREE.IcosahedronGeometry(0.20, 0), lambert(P.frailCogollo));
  cog.position.set(0, H_TRONCO + 0.42, 0); g.add(cog);
  // la vara floral: tallo velludo que sube sobre la roseta con varios capítulos
  // amarillos arracimados arriba (Espeletia florece amarillo, capítulos al sol)
  const vara = new THREE.Group();
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.35, 6), lambert(0x9aa06a));
  tallo.position.set(0.12, H_TRONCO + 0.92, 0.06); tallo.rotation.z = -0.16;
  vara.add(tallo);
  const topY = H_TRONCO + 1.52;
  for (const off of [[0.0, 0.0, 0.10, 0.35], [0.22, -0.14, -0.04, 0.9], [-0.16, -0.18, 0.14, -0.7]]) {
    const cap = capituloMesh(0.15);
    cap.position.set(0.12 + off[0], topY + off[1], 0.06 + off[2]);
    cap.rotation.set(0.45 + off[3] * 0.25, off[3], off[3] * 0.18);
    vara.add(cap);
  }
  g.add(vara);
  g.position.set(base.x, y, base.z);
  g.scale.setScalar(esc);
  g.rotation.y = rng() * Math.PI * 2;
  scene.add(g);
  return { x: base.x, y, z: base.z, sc: esc, alto: (H_TRONCO + 0.6) * esc };
}

// ═══════════════════════════════════════════════════════════════════════════
//  LA QUEÑUA (Polylepis): el Ent del piso. Un ejemplar MAESTRO retorcido +
//  su rodal, TODO anclado (cada árbol muestrea su propio height).
//  v4 (F21): las copas dejan los icosaedros facetados (censo copas low-poly:
//  «paramo.js:292, LOW-POLY») y pasan a FOLLAJE DE MASA — hojas = masa, nunca
//  contables (regla Humboldt). Mismos lóbulos, misma silueta baja y ancha;
//  la masa la ponen crearCopaMasa (núcleo suave + cards) y el viento global.
// ═══════════════════════════════════════════════════════════════════════════
function plantarQuenuas(scene, base) {
  const g = new THREE.Group();
  const troncoM = lambert(P.quenuaTronco);
  const laminaM = lambert(P.quenuaLamina, { side: THREE.DoubleSide });

  // gradiente de copa: sombra de páramo abajo → verde a la luz arriba, con un
  // moteo horizontal para que los lóbulos no salgan de un solo paño
  const cCopaBaja = new THREE.Color(0x2a4224);
  const cCopaAlta = new THREE.Color(P.quenuaHoja2);
  const tmpG = new THREE.Color();
  const gradCopa = (y0, y1) => (x, y, z) => {
    const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
    return tmpG.copy(cCopaBaja).lerp(cCopaAlta, t * 0.85 + (Math.sin(x * 1.7 + z * 0.9) * 0.5 + 0.5) * 0.15);
  };
  const VIENTO_COPA = { amplitud: 0.055, piso: 0.35, velocidad: 1.0 };

  // ── el rodal: cada árbol es un grupo pequeño, plantado en SU height ──
  // La copa canónica se construye UNA vez (mismos dos lóbulos desiguales del
  // v3) y se instancia con la pose exacta del árbol: 2 draw calls los 9.
  const sitios = muestrear(9, 40, { elevMin: 3010, slopeMax: 0.5, sep: 8, evitar: { x: base.x, z: base.z, r: 6 } });
  const masaRodal = crearCopaMasa(THREE, {
    esferas: [
      { c: [0.15, 2.15, 0], r: 1.05, esc: [1.2, 0.68, 1.2] },
      { c: [-0.55, 1.75, 0.35], r: 0.7, esc: [1.1, 0.6, 1.1] },
    ],
    gradiente: gradCopa(1.1, 2.9),
    seed: 20260812,
    brillo: 0.14, cobertura: 1.35, tamCard: 0.85, maxCards: 180, modulacion: 0.42,
    nucleoOpts: { segs: [12, 9], encoger: 0.88, rugosidad: 0.28, sombra: 0.52 },
    texOpts: { oscuro: '#22391f', medio: '#4c6a40', claro: '#8aa363', hojas: 420, alargue: 2.0 },
  });
  const rodalNucleo = new THREE.InstancedMesh(masaRodal.grupo.children[0].geometry, masaRodal.matNucleo, sitios.length);
  const rodalCards = new THREE.InstancedMesh(masaRodal.grupo.children[1].geometry, masaRodal.matCards, sitios.length);
  aplicarVientoMundo(masaRodal.matNucleo, VIENTO_COPA);
  aplicarVientoMundo(masaRodal.matCards, VIENTO_COPA);
  const mQ = new THREE.Matrix4(), qQ = new THREE.Quaternion(), ejeQ = new THREE.Vector3(0, 1, 0), colQ = new THREE.Color();
  sitios.forEach((s, i) => {
    const esc = 1.1 + rng() * 0.9;
    const a = new THREE.Group();
    // el tronco arranca en y=0 (la base del grupo va a height): nunca flota
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 2.4, 6), troncoM);
    t.position.y = 1.2; t.rotation.z = (rng() - 0.5) * 0.25; a.add(t);
    // el tinte por instancia releva la moneda de dos verdes del v3
    const tinte = 0.90 + rng() * 0.18;
    const rotY = rng() * Math.PI * 2;
    a.position.set(s.x, s.y, s.z); a.scale.setScalar(esc);
    a.rotation.y = rotY;
    g.add(a);
    qQ.setFromAxisAngle(ejeQ, rotY);
    mQ.compose(new THREE.Vector3(s.x, s.y, s.z), qQ, new THREE.Vector3(esc, esc, esc));
    rodalNucleo.setMatrixAt(i, mQ); rodalCards.setMatrixAt(i, mQ);
    colQ.setRGB(tinte * 0.97, tinte, tinte * 0.94);
    rodalNucleo.setColorAt(i, colQ); rodalCards.setColorAt(i, colQ);
  });
  rodalNucleo.instanceMatrix.needsUpdate = true; rodalCards.instanceMatrix.needsUpdate = true;
  g.add(rodalNucleo, rodalCards);

  // ── EL MAESTRO: tronco retorcido continuo (cada tramo nace donde acabó el
  //    anterior, sin huecos) + láminas rojizas + copa baja ancha ──
  const my = height(base.x, base.z);
  const maestro = new THREE.Group();
  let prev = new THREE.Vector3(0, 0, 0);
  const tramos = [
    { dx: 0.0, dz: 0.0, r0: 0.55, r1: 0.44, h: 2.0, tx: -0.14, tz: 0.06 },
    { dx: 0.28, dz: 0.10, r0: 0.44, r1: 0.32, h: 1.7, tx: -0.30, tz: -0.12 },
    { dx: 0.55, dz: -0.04, r0: 0.32, r1: 0.22, h: 1.4, tx: -0.10, tz: 0.16 },
  ];
  // láminas de corteza (papel rojizo descascarándose): HIJAS de cada tramo,
  // así siguen exactamente el tronco retorcido — jamás flotan al lado.
  for (const t of tramos) {
    const c = new THREE.CylinderGeometry(t.r1, t.r0, t.h, 6);
    c.translate(0, t.h / 2, 0);
    const m = new THREE.Mesh(c, troncoM);
    m.position.copy(prev).add(new THREE.Vector3(t.dx, 0, t.dz));
    m.rotation.set(t.tz, 0, t.tx);
    // pegar 4-5 láminas de papel a la superficie de ESTE tramo
    const nEsc = 7 + Math.floor(rng() * 3);
    for (let i = 0; i < nEsc; i++) {
      const fy = rng(), yy = fy * t.h;
      const rad = (t.r0 + (t.r1 - t.r0) * fy) - 0.02;   // pegada a la pared del tronco
      const ang = rng() * Math.PI * 2;
      // láminas de papel ROJIZO que se descascaran: tiras anchas curvadas,
      // colgando y despegándose de la pared (la firma inconfundible de Polylepis)
      const esc = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.5, 3, 1, true), laminaM);
      esc.position.set(Math.cos(ang) * rad, yy, Math.sin(ang) * rad);
      esc.rotation.set(Math.PI * 0.86, ang, 0.5 + rng() * 0.3);   // se despega y cuelga
      m.add(esc);
    }
    maestro.add(m);
    prev = m.position.clone().add(new THREE.Vector3(t.dx * 0.5, t.h * 0.96, t.dz * 0.5));
  }
  // copa baja y ancha: los MISMOS seis lóbulos del v3 (silueta intacta), pero
  // en masa — el gradiente de altura hace el trabajo de los dos verdes de antes
  const masaMaestro = crearCopaMasa(THREE, {
    esferas: [
      { c: [1.6, 4.55, 0.2], r: 2.0, esc: [1.28, 0.6, 1.2] },
      { c: [3.15, 4.05, -0.6], r: 1.25, esc: [1.1, 0.58, 1.1] },
      { c: [0.1, 4.9, -0.3], r: 0.9, esc: [1.1, 0.55, 1.1] },
      { c: [-0.1, 3.85, 0.85], r: 1.55, esc: [1.12, 0.58, 1.12] },
      { c: [2.6, 3.6, 0.9], r: 1.15, esc: [1.1, 0.55, 1.1] },
      { c: [1.1, 3.7, -0.9], r: 0.85, esc: [1.05, 0.5, 1.05] },
    ],
    gradiente: gradCopa(2.9, 5.8),
    seed: 20260813,
    tex: masaRodal.tex,   // misma lámina de follaje: rodal y maestro son la misma especie
    // denso y con el núcleo HUNDIDO en sombra: en la primera pasada del gate el
    // núcleo liso asomaba en calvas entre los cards (la «bola de plastilina»
    // que FollajeMasa prohíbe). Más cards chicos + núcleo más oscuro y encogido.
    brillo: 0.14, cobertura: 1.5, tamCard: 0.95, maxCards: 560, modulacion: 0.42,
    nucleoOpts: { segs: [14, 10], encoger: 0.86, rugosidad: 0.3, sombra: 0.58 },
  });
  aplicarVientoMundo(masaMaestro.matNucleo, VIENTO_COPA);
  aplicarVientoMundo(masaMaestro.matCards, VIENTO_COPA);
  maestro.add(masaMaestro.grupo);
  // musgo verde-gris: cojines en la base del tronco — la queñua vive forrada
  // de musgo, así peina la niebla (la lección). Las motas sueltas que antes
  // flotaban DENTRO de la copa se fueron con los icosaedros: la masa las tapa.
  const musgoM = lambert(P.musgo), musgoM2 = lambert(P.musgoClaro);
  for (let i = 0; i < 8; i++) {
    const a = rng() * Math.PI * 2, r = 0.5 + rng() * 0.5, yy = 0.2 + rng() * 1.6;
    const cl = new THREE.Mesh(new THREE.SphereGeometry(0.22 + rng() * 0.18, 6, 4), rng() > 0.5 ? musgoM : musgoM2);
    cl.position.set(Math.cos(a) * r * 0.5, yy, Math.sin(a) * r * 0.5);
    cl.scale.y = 0.6; maestro.add(cl);
  }
  maestro.position.set(base.x, my, base.z);
  maestro.scale.setScalar(1.9);    // AoE: el guardián se lee desde el labio
  g.add(maestro);

  scene.add(g);
  return { x: base.x, y: my, z: base.z };
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL NACIMIENTO DEL AGUA — el momento Nolan: la laguna que ESPEJA la niebla,
//  junto a la queñua maestra. Tres láminas: el fondo hondo, el espejo de
//  cielo encima y la orilla de espuma. Anclado al hondón; cada piedra
//  muestrea su propio suelo en la orilla.
// ═══════════════════════════════════════════════════════════════════════════
function plantarNacimiento(scene, base) {
  const g = new THREE.Group();
  const yAgua = height(base.x, base.z) + 0.10;
  // el fondo: agua honda verde-azul (el único azul con permiso)
  const honda = new THREE.Mesh(new THREE.CircleGeometry(12.0, 48),
    new THREE.MeshLambertMaterial({ color: P.lagunaHonda }));
  honda.rotation.x = -Math.PI / 2; honda.position.set(base.x, yAgua, base.z);
  g.add(honda);
  // el espejo: la niebla reflejada — una veladura clara que respira encima
  const espejo = new THREE.Mesh(new THREE.CircleGeometry(10.4, 48),
    new THREE.MeshBasicMaterial({ color: P.lagunaEspejo, transparent: true, opacity: 0.34, depthWrite: false }));
  espejo.rotation.x = -Math.PI / 2; espejo.position.set(base.x - 0.4, yAgua + 0.04, base.z + 0.3);
  g.add(espejo);
  // la orilla de espuma: el borde claro que separa agua de paja
  const orilla = new THREE.Mesh(new THREE.RingGeometry(11.4, 12.7, 48),
    new THREE.MeshBasicMaterial({ color: P.espuma, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide }));
  orilla.rotation.x = -Math.PI / 2; orilla.position.set(base.x, yAgua + 0.02, base.z);
  g.add(orilla);
  const piedraM = lambert(P.piedra);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng() * 0.5, d = 12.8 + rng() * 2.6;
    const px = base.x + Math.cos(a) * d, pz = base.z + Math.sin(a) * d;
    const r = 0.7 + rng() * 0.9;
    const pd = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), piedraM);
    pd.position.set(px, height(px, pz) + r * 0.35, pz);
    pd.rotation.set(rng(), rng() * 6, rng()); g.add(pd);
  }
  scene.add(g);
  return { x: base.x, y: yAgua, z: base.z };
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL CORTE DE SUELO + MICORRIZAS — reusa el concepto de Mundo3DSuelo.jsx:
//  TRES capas reales (hojarasca → suelo negro → subsuelo), raíces que bajan,
//  y el «internet de hongos» (micorrizas) enlazando raíces. Anclado, hundido.
//  Grounded DR: suelo del páramo = NEGRO, ácido, profundo (andosol).
// ═══════════════════════════════════════════════════════════════════════════
function plantarSuelo(scene, base) {
  const g = new THREE.Group();
  const y = height(base.x, base.z);
  const W = 5.0, D = 3.2;
  const vivoX = -3.2, degradadoX = 3.2;
  // las tres capas, apiladas: el borde superior de cada una queda a `top`
  const capas = [
    { color: P.hojarasca, h: 0.35, top: 0.55 },   // 1) hojarasca (arriba, cobija)
    { color: P.sueloNegro, h: 1.5, top: 0.20 },    // 2) suelo negro (andosol, la vida)
    { color: P.subsuelo, h: 1.6, top: -1.30 },     // 3) subsuelo (reserva firme)
  ];
  const sueloTargets = [];
  for (const c of capas) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(W, c.h, D), lambert(c.color));
    box.position.set(vivoX, c.top - c.h / 2, 0);
    box.userData.paramoLessonTarget = 'suelo-vivo';
    g.add(box); sueloTargets.push({ object: box, id: 'suelo-vivo' });
  }
  // cobija de musgo/pajilla verde sobre la hojarasca (la cara del páramo)
  const cobija = new THREE.Mesh(new THREE.BoxGeometry(W * 1.01, 0.14, D * 1.01), lambert(P.musgoClaro));
  cobija.position.set(vivoX, 0.62, 0); cobija.userData.paramoLessonTarget = 'suelo-vivo'; g.add(cobija);

  // Contraste pedido por el spec: un segundo perfil compacto, pálido y
  // agrietado. No tiene raíces, hifas ni brillo húmedo: sin esta contraparte
  // la pregunta de hipótesis no tendría evidencia visible que comparar.
  const degradadoM = [
    { color: 0xb8a98d, h: 0.35, top: 0.55 },
    { color: 0xa6977d, h: 1.5, top: 0.20 },
    { color: 0x887b67, h: 1.6, top: -1.30 },
  ];
  for (const c of degradadoM) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(W, c.h, D), lambert(c.color));
    box.position.set(degradadoX, c.top - c.h / 2, 0);
    box.userData.paramoLessonTarget = 'suelo-degradado';
    g.add(box);
    sueloTargets.push({ object: box, id: 'suelo-degradado' });
  }
  const costra = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.045, D * 0.98), lambert(0xc2b79b));
  costra.position.set(degradadoX, 0.58, 0);
  costra.userData.paramoLessonTarget = 'suelo-degradado'; g.add(costra);
  const crackM = new THREE.LineBasicMaterial({ color: 0x746856, transparent: true, opacity: 0.82 });
  const cracks = [
    [[-1.8, 0.60, -0.7], [-0.6, 0.60, -0.2], [-0.2, 0.60, -0.85]],
    [[0.6, 0.60, 0.8], [1.4, 0.60, 0.18], [2.0, 0.60, 0.42]],
    [[-1.1, 0.60, 0.9], [-0.2, 0.60, 0.35], [0.25, 0.60, 0.8]],
  ];
  for (const path of cracks) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.map(([x, yy, z]) => new THREE.Vector3(degradadoX + x, yy, z))), crackM);
    line.userData.paramoLessonTarget = 'suelo-degradado'; g.add(line);
  }

  // ── raíces que BAJAN por la cara de corte (frente +z), cruzando las capas ──
  const raizM = lambert(P.raiz);
  const micoM = lambert(P.mico, { emissive: 0x2a2418, emissiveIntensity: 0.35 });
  const zc = D / 2 + 0.02;
  const anclas = [];   // puntos donde luego enlazamos el «internet de hongos»
  const rootTargets = [];
  const rootContacts = [];
  for (let i = 0; i < 2; i++) {
    const root = new THREE.Group();
    const rx = vivoX + (i === 0 ? -1.25 : 1.05);
    root.userData.paramoLessonTarget = i === 0 ? 'raiz-con-hifas' : 'raiz-sola';
    g.add(root); rootTargets.push({ object: root, id: root.userData.paramoLessonTarget });
    let yy = 0.4;
    const prof = i === 0 ? 6 : 5;
    for (let s = 0; s < prof; s++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.5, 4), raizM);
      const jitter = Math.sin(s * 1.7 + i) * 0.12;
      seg.position.set(rx + jitter, yy, zc);
      seg.rotation.z = 0.18 * Math.sin(s + i);
      root.add(seg);
      // Solo la primera raíz muestra la envoltura de hifas; la vecina queda
      // deliberadamente sola para que la hipótesis tenga dos evidencias.
      if (i === 0) {
        for (let f = 0; f < 5; f++) {
          const fa = (f / 5) * Math.PI * 2 + s * 0.25;
          const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.025, 0.34, 4), micoM);
          fil.position.set(rx + jitter + Math.cos(fa) * 0.2, yy, zc + 0.02 + Math.sin(fa) * 0.04);
          fil.rotation.set(0, 0, fa);
          root.add(fil);
        }
      }
      yy -= 0.46;
    }
    rootContacts.push(new THREE.Vector3(rx, 0.05, zc));
  }
  // ── EL INTERNET DE HONGOS: hilos que ENLAZAN raíces vecinas (micorrizas que
  //    conectan una planta con otra — la red que no se ve pero sostiene) ──
  for (let i = 0; i < anclas.length; i++) {
    for (let j = i + 1; j < anclas.length; j++) {
      const a = anclas[i], b = anclas[j];
      const dist = a.distanceTo(b);
      if (dist < 0.6 || dist > 1.7 || rng() > 0.35) continue;   // solo vecinas, pocas
      const mid = a.clone().lerp(b, 0.5);
      const hilo = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, dist, 3), micoM);
      hilo.position.copy(mid);
      hilo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.add(hilo);
    }
  }

  const micorrizaMira = new THREE.Vector3(base.x + vivoX, y - 0.18, base.z + zc);
  const sueloMira = new THREE.Vector3(base.x + 0.2, y + 0.48, base.z + 0.7);
  g.position.set(base.x, y, base.z); scene.add(g);
  return {
    x: base.x, y, z: base.z, rootTargets, soilTargets: sueloTargets,
    micorrizaPoint: new THREE.Vector3(base.x + rootContacts[0].x, y + rootContacts[0].y, base.z + rootContacts[0].z),
    micorrizaMira, sueloMira,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL TELÓN — lo que mata el cielo blanco vacío: CORDILLERAS apiladas con la
//  perspectiva aérea ya horneada (cada capa más lejos = más fundida en la
//  bruma), y a sus pies el MAR DE NUBES sobre el que el páramo flota.
//  MeshBasic + fog:false: el color es el que se pinta, como en el nacedero
//  aprobado (geomCordilleras de fable/paramo-humboldt-real).
// ═══════════════════════════════════════════════════════════════════════════
function plantarTelon(scene) {
  const y0 = height(CX, CZ);
  // el DEM real sigue hasta z=-2030: las capas van DETRÁS de la meseta real
  // (que, ya embrumada, hace de primera cordillera gratis)
  const capasT = [
    { dz: 320, base: -10, amp: 55, sub: 16, color: 0x5c7263, W: 750 },
    { dz: 470, base: 8, amp: 85, sub: 24, color: 0x87997f, W: 900 },
    { dz: 640, base: 26, amp: 120, sub: 32, color: 0xb2bfa8, W: 1100 },
  ];
  const cielo = new THREE.Color(P.bruma);
  capasT.forEach((c, ci) => {
    const N = 72;
    const pos = new Float32Array(N * 2 * 3);
    const col = new Float32Array(N * 2 * 3);
    const idx = [];
    const cBase = new THREE.Color(c.color);
    const cTop = cBase.clone().lerp(cielo, 0.25 + ci * 0.1);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const x = (t - 0.5) * 2 * c.W;
      const ridge = fbm(x / 260 + ci * 7.3, ci * 3.1, 3) * c.amp
        + Math.sin(t * Math.PI * (2.2 + ci * 0.7) + ci) * c.sub;
      const yTop = y0 + c.base + Math.max(6, ridge + c.amp * 0.55);
      const yBot = y0 + c.base - 90;
      pos.set([x, yBot, 0], i * 6);
      pos.set([x, yTop, 0], i * 6 + 3);
      col.set([cBase.r, cBase.g, cBase.b], i * 6);
      col.set([cTop.r, cTop.g, cTop.b], i * 6 + 3);
      if (i < N - 1) {
        const a = i * 2, b = i * 2 + 1, cc = i * 2 + 2, d = i * 2 + 3;
        idx.push(a, cc, b, b, cc, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true, fog: false, side: THREE.DoubleSide, depthWrite: true,
    }));
    m.position.set(CX, 0, CZ - c.dz);
    m.renderOrder = -3 + ci * 0;
    scene.add(m);
  });
}

// textura de vaho: algodón radial generado en runtime (sin assets)
function texturaVaho(warm = false) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const gr = c.createRadialGradient(64, 64, 4, 64, 64, 64);
  if (warm) {
    gr.addColorStop(0, 'rgba(255,241,214,0.95)');
    gr.addColorStop(0.5, 'rgba(250,236,210,0.45)');
    gr.addColorStop(1, 'rgba(250,236,210,0)');
  } else {
    gr.addColorStop(0, 'rgba(248,250,245,0.95)');
    gr.addColorStop(0.5, 'rgba(232,240,230,0.45)');
    gr.addColorStop(1, 'rgba(230,238,229,0)');
  }
  c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── MAR DE NUBES + niebla rasante + el resplandor del sol en la bruma ────────
// Todo billboard en yaw (giran con la cámara). El mar de nubes vive a los
// pies del telón y en los flancos: el páramo queda flotando sobre nubes.
function plantarNieblas(scene) {
  const y0 = height(CX, CZ);
  const texFria = texturaVaho(false), texCalida = texturaVaho(true);
  const cartas = [];
  const carta = (tex, x, y, z, w, h, op, drift = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: op, depthWrite: false, fog: false }));
    m.position.set(x, y, z);
    m.userData = { base: { x, drift }, ph: rng() * 100 };
    scene.add(m); cartas.push(m);
    return m;
  };
  // el MAR DE NUBES a los pies del telón: la banda que separa la meseta real
  // de las cordilleras pintadas (y esconde la costura)
  for (let i = 0; i < 7; i++) {
    const x = CX + (i - 3) * 160 + (rng() - 0.5) * 60;
    carta(texFria, x, y0 + 4 + rng() * 12, CZ - 265 - rng() * 50, 220 + rng() * 90, 40 + rng() * 16, 0.5 + rng() * 0.2, 4);
  }
  // nubes por el flanco ESTE (al oeste no hay abismo: hay macizo — una nube
  // pegada a esa pared leía como manchón blanco en mitad del cuadro)
  for (let i = 0; i < 3; i++) {
    const z = CZ + (i - 1) * 130 + (rng() - 0.5) * 50;
    carta(texFria, CX + 420 + rng() * 60, y0 - 60 + rng() * 16, z, 170 + rng() * 70, 40 + rng() * 14, 0.4 + rng() * 0.15, 5);
  }
  // y el frente: el MAR DE NUBES sobre el abismo de La Chorrera — lo que la
  // vista madre tiene al fondo (el páramo flota; abajo, sin verse, las fincas)
  for (let i = 0; i < 5; i++) {
    carta(texFria, CX + (i - 2) * 130 + (rng() - 0.5) * 50, y0 - 58 + rng() * 14, CZ + 235 + rng() * 60, 190 + rng() * 80, 42 + rng() * 16, 0.42 + rng() * 0.12, 4);
  }
  // niebla rasante DORADA hugueando el hondón del agua (poca y tenue: sobre la
  // ladera clara cualquier vaho ancho lee como manchón)
  for (let i = 0; i < 5; i++) {
    const x = AGUA.x + (rng() - 0.5) * 70, z = AGUA.z + (rng() - 0.5) * 60;
    carta(texCalida, x, height(x, z) + 1.8 + rng() * 2, z, 28 + rng() * 20, 6 + rng() * 4, 0.07 + rng() * 0.06, 6);
  }
  // el vaho que respira sobre la laguna (el espejo humea)
  for (let i = 0; i < 3; i++) {
    carta(texFria, AGUA.x + (rng() - 0.5) * 16, height(AGUA.x, AGUA.z) + 2.2 + i * 1.4, AGUA.z + (rng() - 0.5) * 14, 20 + rng() * 12, 6 + rng() * 4, 0.16, 3);
  }
  // EL RESPLANDOR: el sol metido en la bruma (Nolan) — un disco cálido grande
  // colgado hacia el oriente, por encima del telón (entra por la derecha del
  // plano de establecimiento)
  // núcleo + halo: un SOL legible metido en la bruma, no una sábana lechosa
  const glow = carta(texCalida, CX + 40, y0 + 150, CZ + 330, 340, 230, 0.22, 0);
  glow.material.blending = THREE.AdditiveBlending;
  const nucleo = carta(texCalida, CX + 40, y0 + 152, CZ + 328, 110, 85, 0.8, 0);
  nucleo.material.blending = THREE.AdditiveBlending;
  return cartas;
}

// ── LA ZANJA DE LA QUEBRADA: excava el terreno REAL del valle ───────────────
// El contrato de crearQuebrada: el anfitrión rebaja su suelo con
// `profundidadEn(x,z)`, si no el terreno tapa el agua (la lámina vive ~0,25 u
// BAJO la superficie). La rejilla del mesh del valle es ~7,3 u, así que con
// ancho 6 la zanja (radio ~10,5 u) cae sobre ≥2 vértices y el cauce se lee
// continuo. Se toca sólo la geometría del mesh (no la función `height`, que
// comparten el frailejonal, la matriz y la paja — colocadas antes de excavar):
// la bóveda de vértices vecinos se recalculan juntas y el cauce queda tallado.
function excavarQuebrada(scene, quebrada) {
  const prof = quebrada?.profundidadEn;
  if (!prof) return;
  let terreno = null;
  scene.traverse((o) => {
    if (!terreno && o.isMesh && o.geometry && o.geometry.attributes.position
        && o.geometry.attributes.position.count > 50000) terreno = o;
  });
  if (!terreno) return;
  const pos = terreno.geometry.attributes.position;
  const arr = pos.array;
  // recuadro del curso con margen (radio de la zanja ~10,5 + vértices)
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i], z = arr[i + 2];
    if (x < -135 || x > -65 || z < -1275 || z > -1125) continue;
    const zanja = prof(x, z);
    if (zanja > 0.001) arr[i + 1] -= zanja;
  }
  pos.needsUpdate = true;
  terreno.geometry.computeVertexNormals();
}

// ── LA UI: chips de estación + la frase (mismo lenguaje que la lección agua) ──
const CSS = `
#lecParamo { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%);
  z-index: 30; display: flex; flex-direction: column; align-items: center; gap: 8px;
  width: min(94vw, 760px); font-family: system-ui, -apple-system, sans-serif; }
#lecParamo .lpFrase { margin: 0; text-align: center; color: #fbf3e2;
  background: rgba(74, 52, 24, 0.6); backdrop-filter: blur(3px);
  border-radius: 10px; padding: 7px 14px; font-size: 0.86rem; line-height: 1.4;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
#lecParamo .lpChips { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;
  list-style: none; margin: 0; padding: 0; }
#lecParamo .lpChips button { border: 0; border-radius: 999px; cursor: pointer;
  padding: 6px 12px; font: 600 0.74rem/1 system-ui, sans-serif;
  color: #4a3418; background: rgba(255, 247, 228, 0.82); }
#lecParamo .lpChips button[aria-pressed="true"] { background: #ffe8b0; color: #4a3418; }
@media (max-width: 700px) { #lecParamo .lpFrase { font-size: 0.78rem; } }
body[data-leccion] #capaLugares, body[data-leccion] #guiaSel { display: none !important; }
body.paramo-causal #lecParamo, body.paramo-causal #hud,
body.paramo-causal #compaiFotoBtn, body.paramo-causal #compaiEntrada { display: none !important; }
`;

export function makeParamo({ scene, camera, controls, atmos, renderer }) {
  document.body.dataset.leccion = 'paramo';
  controls.minDistance = 4;

  // ── APAGAR las nubes del VALLE: el telón blanco del farallón (cwall) y los
  // velos (mists) están compuestos para mirarse DESDE el valle. Desde arriba
  // son una sábana blanca que tapa el cielo entero y rayas cruzando la ladera
  // (el «cielo blanco muerto» del gate). Aquí manda la niebla propia del
  // páramo; al salir (?mundo cambia = recarga) el valle recupera las suyas.
  if (atmos && atmos.noche) {
    if (atmos.noche.cwall) atmos.noche.cwall.visible = false;
    // `mists` es la API de los velos de noche (atmosphere.js: {setNoche, mesh}),
    // no un array — el `.forEach` histórico reventaba `?mundo=paramo` antes de
    // llegar al frailejonal. Se esconde el velo real, que es `mesh`.
    const veloNoche = atmos.noche.mists;
    if (veloNoche && veloNoche.mesh) veloNoche.mesh.visible = false;
  }
  // ── APAGAR el páramo DE UTILERÍA del valle: el diorama AoE del mundo
  // (elem-paramo: frailejones de 20 m — bien a 1,4 km, monstruos aquí) y los
  // conos-frailejón/conos-paja de flora.js. Este mundo pone los de verdad.
  // + el BOSQUE DE MASA del valle (encenillo ez-tree cercano y lejano): arriba de
  //   3.000 m NO va bosque — sin apagarlo se veían árboles del valle FLOTANDO a
  //   media distancia sobre el frailejonal (la fuga que denunció la auditoría).
  for (const nombre of ['elem-paramo', 'flora-frailes', 'flora-paja']) {
    const utileria = scene.getObjectByName(nombre);
    if (utileria) utileria.visible = false;
  }
  // El bosque nuevo tiene una malla por forma (roble/encenillo/aliso/nogal)
  // para no clonar siluetas; todas llevan esta marca para apagar el conjunto
  // completo cuando el mundo sube al páramo.
  scene.traverse((obj) => {
    if (obj.userData?.floraValleBosque) obj.visible = false;
  });

  // ── LA ATMÓSFERA DEL PÁRAMO: bruma verde-plata CON LUZ ───────────────────
  // El valle vive con FogExp2 gris-azul rala (0.00025) — a 3.000 metros eso
  // deja un cielo blanco muerto. Aquí la bruma se espesa y se entibia: cada
  // plano del frailejonal se funde un paso más en plata (profundidad Jackson)
  // y el telón de cordilleras remata contra el mismo color. Es SU visita
  // (?mundo=paramo recarga la página al salir): no hay que restaurar nada.
  // 0,0017: nítido hasta ~150 unidades, plata a 400, fundido a 800 — el
  // frailejonal escalona en planos SIN volverse mancha (0,0026 lo lavaba todo)
  scene.fog = new THREE.FogExp2(P.bruma, 0.0017);

  // luz de páramo: sol dorado ALTO (la roseta es un plato que mira al cielo —
  // solo una luz alta la vuelve plata; la rasante del valle pone el drama)
  // intensidad CORTA: el valle ya trae su sol 2,7 — sumarle mucho lava el
  // dorado a crema (el marrón plano de la v2 era en parte sobreexposición)
  const luz = new THREE.DirectionalLight(0xffdf9e, 1.0);
  luz.position.set(CX + 260, height(CX, CZ) + 430, CZ - 60);
  luz.target.position.set(CX, height(CX, CZ), CZ);
  scene.add(luz); scene.add(luz.target);
  // el relleno: cielo plata-verde arriba, pajonal dorado abajo
  const relleno = new THREE.HemisphereLight(0xdfe8dc, 0x6b6a44, 0.5);
  scene.add(relleno);

  // ── EL TELÓN: cordilleras + mar de nubes (lo que mata el cielo vacío) ────
  plantarTelon(scene);

  // ── EL FRAILEJONAL instanciado — el ejército plateado, TODO anclado ──────
  const troncoGeo = troncoUnidadGeo(), faldaGeo = faldaUnidadGeo(), rosetaGeo1 = rosetaUnidadGeo();
  const troncoMat = lambert(P.frailSeca2, { side: THREE.DoubleSide });   // enagua pajiza (hojas planas)
  // faldas y rosetas con material blanco: el color REAL va por setColorAt —
  // así el frailejonal es una COLONIA con edades, no clones. DoubleSide: las
  // palas lanceoladas son planas, sin backface no se leerían por dentro.
  const faldaMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide });
  // vertexColors: el degradado verde→plata horneado en la pala (GRAD_ROSETA)
  // multiplica al color de instancia — corazón verde, puntas plateadas.
  const rosetaMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide, vertexColors: true });
  const cPlata = new THREE.Color(P.frailPlata), cSage = new THREE.Color(P.frailSage);
  const cSeca = new THREE.Color(P.frailSeca), cSeca2 = new THREE.Color(P.frailSeca2);

  // adultos (con tronco): el grueso del ejército. (F23) más denso: el
  // frailejonal real es un EJÉRCITO — 110 dejaba calvas entre la matriz.
  const puntos = muestrear(150, 160, { elevMin: 3035, slopeMax: 0.42, sep: 3.4, evitar: { x: AGUA.x, z: AGUA.z, r: 8 } }).filter(lejosDelCorte);
  // escala AoE del valle (elementos.js, ESC=3: «huesos reales, piel
  // dibujada»): a escala humana real el ejército desaparecía en una meseta de
  // 600 unidades — aquí lo dibujado se agranda para LEERSE, como todo el valle.
  const TALLAS = { pequeno: { peso: 3, sc: 0.8 }, mediano: { peso: 4, sc: 1.15 }, grande: { peso: 2, sc: 1.6 }, veterano: { peso: 1, sc: 2.1 } };
  const troncos = new THREE.InstancedMesh(troncoGeo, troncoMat, puntos.length);
  const faldas = new THREE.InstancedMesh(faldaGeo, faldaMat, puntos.length);
  const rosetas = new THREE.InstancedMesh(rosetaGeo1, rosetaMat, puntos.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eje = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  let previo = null;
  puntos.forEach((p, i) => {
    const talla = elegirSinRepetir(TALLAS, previo, rng); previo = talla;
    const sc = TALLAS[talla].sc * (0.9 + rng() * 0.2);
    q.setFromAxisAngle(eje, rng() * Math.PI * 2);
    // BASE EXACTA EN EL TERRENO: la unidad tiene su base en y=0, así que
    // apoyarla en height(x,z) la deja TOCANDO el suelo — sin hundir ni flotar.
    m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(sc, sc, sc));
    troncos.setMatrixAt(i, m4); faldas.setMatrixAt(i, m4); rosetas.setMatrixAt(i, m4);
    // roseta plateado-salvia: jóvenes más claras, viejas más apagadas
    col.copy(cPlata).lerp(cSage, 0.3 + rng() * 0.55).offsetHSL(0, (rng() - 0.5) * 0.03, (rng() - 0.5) * 0.05);
    rosetas.setColorAt(i, col);
    col.copy(cSeca).lerp(cSeca2, rng() * 0.6).offsetHSL(0, (rng() - 0.5) * 0.04, (rng() - 0.5) * 0.05);
    faldas.setColorAt(i, col);
  });
  troncos.instanceMatrix.needsUpdate = true; faldas.instanceMatrix.needsUpdate = true; rosetas.instanceMatrix.needsUpdate = true;
  scene.add(troncos, faldas, rosetas);

  // ── el HALO DE PELUSA (la pubescencia, firma del frailejón — spec §1.1):
  // el Ent la tiene por cards de pelo, pero el ejército instanciado no
  // heredaba nada. Aquí la gana barata: 3 quads cruzados de vaho radial en la
  // corona de cada adulto, con la MISMA matriz de instancia que su roseta. De
  // lejos esa neblinita pegada a la mata ES la lana plateada a contraluz; de
  // cerca es casi invisible de puro tenue (opacidad 0,3 × alfa radial).
  const haloQuads = [];
  for (let hq = 0; hq < 3; hq++) {
    const qd = new THREE.PlaneGeometry(2.1, 1.05);
    qd.rotateY((hq / 3) * Math.PI);
    qd.translate(0, H_TRONCO + 0.55, 0);
    haloQuads.push(qd);
  }
  const haloGeo = concat(...haloQuads);
  const haloMat = new THREE.MeshBasicMaterial({
    map: texturaVaho(false), transparent: true, opacity: 0.30, depthWrite: false,
    side: THREE.DoubleSide, color: 0xe9f0da,
  });
  const halos = new THREE.InstancedMesh(haloGeo, haloMat, puntos.length);
  // misma pose que la roseta de cada adulto — se COPIA la matriz ya compuesta
  // (recomponerla gastaría rng() y re-barajaría la siembra determinista)
  for (let hi = 0; hi < puntos.length; hi++) {
    rosetas.getMatrixAt(hi, m4);
    halos.setMatrixAt(hi, m4);
  }
  halos.instanceMatrix.needsUpdate = true;
  scene.add(halos);

  // JÓVENES: rosetas RASAS sin tronco (así crece Espeletia de verdad) — llenan
  // el primer plano sin poste, y de paso enseñan la edad cero de la colonia.
  const rasaGeo = rosetaRasaGeo();
  const rasas = new THREE.InstancedMesh(rasaGeo, rosetaMat, 130);
  const rasaPts = muestrear(130, 125, { elevMin: 3020, slopeMax: 0.5, sep: 2.4, evitar: { x: AGUA.x, z: AGUA.z, r: 7 } }).filter(lejosDelCorte);
  rasaPts.forEach((p, i) => {
    const sc = 0.45 + rng() * 0.6;
    q.setFromAxisAngle(eje, rng() * Math.PI * 2);
    m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(sc, sc, sc));
    rasas.setMatrixAt(i, m4);
    col.copy(cPlata).lerp(cSage, rng() * 0.4).offsetHSL(0, 0.01, 0.03 + rng() * 0.04);
    rasas.setColorAt(i, col);
  });
  rasas.count = rasaPts.length; rasas.instanceMatrix.needsUpdate = true;
  scene.add(rasas);

  // los frailejones PROTAGONISTAS (con vara de flores): uno para el retrato,
  // dos custodiando la laguna, y dos de PRIMER PLANO anclando el cuadro de la
  // estación 1 (Jackson: primer plano fuerte → ejército → bruma → cordillera)
  const heroBase = puntos[0] ? { x: puntos[0].x + 6, z: puntos[0].z + 4 } : { x: CX + 6, z: CZ + 4 };
  const hero = frailejonHeroe(scene, heroBase, 2.6);
  frailejonHeroe(scene, { x: AGUA.x + 16, z: AGUA.z + 9 }, 2.1);
  frailejonHeroe(scene, { x: AGUA.x - 14, z: AGUA.z - 11 }, 1.8);
  frailejonHeroe(scene, { x: CX + 10, z: CZ - 72 }, 2.2);
  frailejonHeroe(scene, { x: CX + 31, z: CZ - 79 }, 2.0);

  // ── PAJONAL dorado: MACOLLAS de paja (abanico de hojas finas), no conos ──
  // Una macolla = 7 hojas-aguja abriéndose en fuente. 1 draw call, anclado.
  const hojasPaja = [];
  for (let j = 0; j < 7; j++) {
    const ang = (j / 7) * Math.PI * 2 + 0.4;
    const abre = 0.38 + (j % 3) * 0.16;             // cuánto se abre la fuente
    const hoja = new THREE.ConeGeometry(0.05, 1.0, 3);   // macolla ~1 m real
    hoja.translate(0, 0.5, 0);
    hoja.rotateZ(abre); hoja.rotateY(ang);
    hojasPaja.push(hoja);
  }
  const pajGeo = concat(...hojasPaja);
  // (F23) el DEGRADADO por brizna que pide el spec (§1.2): base verde intensa
  // (~60% de la altura) → punta dorada. Antes el degradado era por MACOLLA
  // (unas doradas enteras, otras verdes) y a media distancia todo caía en el
  // mismo bin kaki — el hallazgo del gate del 08-11. El dorado lo pone el
  // color de instancia; este multiplicador de vértice apaga la base a verde.
  {
    const posP = pajGeo.attributes.position;
    const colP = new Float32Array(posP.count * 3);
    const cBaseP = new THREE.Color(0.33, 0.45, 0.23);
    const cTmpP = new THREE.Color();
    for (let i = 0; i < posP.count; i++) {
      const t = Math.min(1, Math.max(0, posP.getY(i) / 0.85));
      cTmpP.copy(cBaseP).lerp(new THREE.Color(1, 1, 1), t * t);
      colP[i * 3] = cTmpP.r; colP[i * 3 + 1] = cTmpP.g; colP[i * 3 + 2] = cTmpP.b;
    }
    pajGeo.setAttribute('color', new THREE.BufferAttribute(colP, 3));
  }
  const pajaMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, vertexColors: true });
  const NP = 1250;
  const paja = new THREE.InstancedMesh(pajGeo, pajaMat, NP);
  // dos siembras: la ancha (toda la meseta — reemplaza los conos de flora.js,
  // apagados arriba) + la apretada del corredor de la estación 1
  const pajPts = muestrear(950, 210, { elevMin: 3000, slopeMax: 0.6 }).filter(lejosDelCorte);
  _s = 77317;   // re-siembra determinista del corredor
  for (let i = 0; i < 300; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 55;
    const x = CX + 20 + Math.cos(a) * d, z = CZ + 90 + Math.sin(a) * d * 0.9;
    const y = height(x, z);
    if (elevOf(y) < 3000 || slopeAt(x, z) > 0.6) continue;
    pajPts.push({ x, y, z });
  }
  const cPaja = new THREE.Color(P.paja), cPajaSol = new THREE.Color(P.pajaSol), cPajaSom = new THREE.Color(P.pajaSombra);
  pajPts.forEach((p, i) => {
    const sc = 1.0 + rng() * 1.2;
    q.setFromAxisAngle(eje, rng() * Math.PI * 2);
    m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(sc, sc * (0.75 + rng() * 0.6), sc));
    paja.setMatrixAt(i, m4);
    // el dorado respira: sombra → paja → sol, con jitter de matiz.
    // (F23) el reparto se corre al verde: menos macollas full-dorado — el
    // dorado es acento de puntas, nunca el tono base (doctrina matrizParamo).
    const t = rng();
    if (t < 0.45) col.copy(cPajaSom).lerp(cPaja, t / 0.45);
    else col.copy(cPaja).lerp(cPajaSol, (t - 0.45) / 0.55);
    col.offsetHSL((rng() - 0.5) * 0.02, 0, (rng() - 0.5) * 0.05);
    paja.setColorAt(i, col);
  });
  paja.count = pajPts.length; paja.instanceMatrix.needsUpdate = true;
  scene.add(paja);

  // ── COJINES DE MUSGO alrededor del nacimiento (esponja del agua), anclados ─
  const musgoGeo = new THREE.SphereGeometry(0.5, 8, 5);
  const musgoMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const musgo = new THREE.InstancedMesh(musgoGeo, musgoMat, 40);
  const cMus = new THREE.Color(P.musgo), cMusC = new THREE.Color(P.musgoClaro);
  let mj = 0, mg = 40 * 40;
  while (mj < 40 && mg-- > 0) {
    const a = rng() * Math.PI * 2, d = 13 + Math.sqrt(rng()) * 12;
    const x = AGUA.x + Math.cos(a) * d, z = AGUA.z + Math.sin(a) * d;
    const y = height(x, z);
    if (elevOf(y) < 3000) continue;
    const sc = 0.9 + rng() * 1.4, ap = 0.4 + rng() * 0.3;
    m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sc, sc * ap, sc));
    musgo.setMatrixAt(mj, m4);
    col.copy(cMus).lerp(cMusC, rng());
    musgo.setColorAt(mj, col); mj++;
  }
  musgo.count = mj; musgo.instanceMatrix.needsUpdate = true;
  scene.add(musgo);

  // ── LA MATRIZ: el mar del que emerge el frailejón ────────────────────────
  // Pajonal de Calamagrostis, matorrales de chusque, cojines de turbera y roca
  // con líquenes. El frailejonal de arriba es el EMERGENTE; sin esto se planta
  // sobre suelo pelado y flota. Área 320×320 m (10,2 ha) centrada en el rellano:
  // el presupuesto medido del módulo sostiene 60 FPS hasta 64 ha.
  const matriz = crearMatrizParamo({
    area: { x0: CX - 160, x1: CX + 160, z0: CZ - 160, z1: CZ + 160 },
    alturaEn: (x, z) => height(x, z),
    // vetado: el ojo de agua del nacimiento y el corte de suelo didáctico — los
    // mismos radios que ya respeta el muestreo de frailejones más arriba.
    libre: (x, z) => Math.hypot(x - AGUA.x, z - AGUA.z) > 8
                  && Math.hypot(x - SUELO.x, z - SUELO.z) > 9,
    luzDir: new THREE.Vector3(260, 430, -60).normalize(),  // el mismo sol alto del páramo
    niebla: { color: P.bruma },                            // funde con la bruma verde-plata
    seed: 20260807,
  });
  scene.add(matriz.grupo);

  // ── FLORES DE PÁRAMO: deterministas y ondulando CON el pasto ─────────────
  // Misma área 320×320 que la matriz, vetando el ojo de agua y el corte de
  // suelo. ?flores=0 las apaga (baseline del gate A/B). `window.__floresParamo`
  // es el hook del gate para alternarlas en la misma página sin recargar.
  const flores = crearFloresParamo({
    scene,
    area: { x0: CX - 160, x1: CX + 160, z0: CZ - 160, z1: CZ + 160 },
    evitar: [
      { x: AGUA.x, z: AGUA.z, r: 8 },
      { x: SUELO.x, z: SUELO.z, r: 9 },
    ],
    omitir: new URLSearchParams(location.search).get('flores') === '0',
  });
  window.__floresParamo = flores;

  // ── ROMERALES Y MORTIÑOS: el estrato arbustivo que faltaba (spec §1.4-1.5,
  // ADITIVO) ────────────────────────────────────────────────────────────────
  // Diplostephium ("romero blanco"): arbusto leñoso 1-2 m muy ramificado desde
  // la base, follaje coriáceo verde-grisáceo claro con envés blanco-lanoso y
  // flor blanca/violácea — el peldaño de altura entre el pajonal y el
  // frailejón. Follaje = MASA (crearCopaMasa instanciado), jamás icosaedro
  // pelado. Vaccinium/Disterigma (mortiño): cojín bajo con el fruto AZUL
  // oscuro — un acento chico de un color que la paleta no tenía, sin romper
  // verde-dominante.
  {
    const masaRomero = crearCopaMasa(THREE, {
      esferas: [
        { c: [0, 0.95, 0], r: 0.62, esc: [1.0, 1.3, 1.0] },
        { c: [0.36, 0.62, 0.22], r: 0.42, esc: [1, 1.15, 1] },
        { c: [-0.32, 0.58, -0.18], r: 0.40, esc: [1, 1.15, 1] },
      ],
      gradiente: (() => {
        const cB = new THREE.Color(0x55654a), cA = new THREE.Color(0xa3b292);
        const cT = new THREE.Color();
        return (x, y) => cT.copy(cB).lerp(cA, Math.max(0, Math.min(1, (y - 0.2) / 1.5)));
      })(),
      seed: 20260814,
      brillo: 0.12, cobertura: 1.35, tamCard: 0.45, maxCards: 110, modulacion: 0.4,
      nucleoOpts: { segs: [10, 8], encoger: 0.88, rugosidad: 0.3, sombra: 0.5 },
      texOpts: { oscuro: '#42503a', medio: '#6f8062', claro: '#b0bfa0', hojas: 360, alargue: 1.4 },
    });
    aplicarVientoMundo(masaRomero.matNucleo, { amplitud: 0.04, piso: 0.3, velocidad: 1.1 });
    aplicarVientoMundo(masaRomero.matCards, { amplitud: 0.04, piso: 0.3, velocidad: 1.1 });
    const sitiosRom = muestrear(24, 150, { elevMin: 3015, slopeMax: 0.45, sep: 9, evitar: { x: AGUA.x, z: AGUA.z, r: 10 } }).filter(lejosDelCorte);
    const romNucleo = new THREE.InstancedMesh(masaRomero.grupo.children[0].geometry, masaRomero.matNucleo, sitiosRom.length);
    const romCards = new THREE.InstancedMesh(masaRomero.grupo.children[1].geometry, masaRomero.matCards, sitiosRom.length);
    // flor de romero: lígulas blancas o violáceas — puntos chicos sobre la copa
    const nFlorRom = sitiosRom.length * 3;
    const florRom = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 6, 5),
      new THREE.MeshLambertMaterial({ color: 0xffffff }), nFlorRom);
    const cFlorBlanca = new THREE.Color(0xe9e6d8), cFlorLila = new THREE.Color(0x9c86b4);
    let fr = 0;
    sitiosRom.forEach((s, i) => {
      const esc = 0.85 + rng() * 0.75;
      q.setFromAxisAngle(eje, rng() * Math.PI * 2);
      m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(esc, esc, esc));
      romNucleo.setMatrixAt(i, m4); romCards.setMatrixAt(i, m4);
      col.setRGB(0.92 + rng() * 0.14, 0.95 + rng() * 0.1, 0.9 + rng() * 0.12);
      romNucleo.setColorAt(i, col); romCards.setColorAt(i, col);
      for (let f = 0; f < 3; f++) {
        const fa = rng() * Math.PI * 2, fd = (0.25 + rng() * 0.45) * esc;
        m4.compose(
          new THREE.Vector3(s.x + Math.cos(fa) * fd, s.y + (1.15 + rng() * 0.55) * esc, s.z + Math.sin(fa) * fd),
          new THREE.Quaternion(), new THREE.Vector3(1, 0.7, 1));
        florRom.setMatrixAt(fr, m4);
        florRom.setColorAt(fr, rng() < 0.7 ? cFlorBlanca : cFlorLila);
        fr++;
      }
    });
    romNucleo.instanceMatrix.needsUpdate = true; romCards.instanceMatrix.needsUpdate = true;
    florRom.count = fr; florRom.instanceMatrix.needsUpdate = true;
    scene.add(romNucleo, romCards, florRom);

    // mortiños: cojines bajos (normales SUAVES — a este tamaño el faceteado
    // leería low-poly) con 3-4 frutos azul oscuro encima
    const morGeo = new THREE.SphereGeometry(0.42, 10, 7);
    const morMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const sitiosMor = muestrear(42, 140, { elevMin: 3010, slopeMax: 0.5, sep: 4, evitar: { x: AGUA.x, z: AGUA.z, r: 9 } }).filter(lejosDelCorte);
    const morts = new THREE.InstancedMesh(morGeo, morMat, sitiosMor.length);
    const frutos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 6, 4),
      new THREE.MeshLambertMaterial({ color: 0x2c3a5e }), sitiosMor.length * 4);
    const cMorV = new THREE.Color(0x3a5230), cMorC = new THREE.Color(0x5c7844);
    let fm = 0;
    sitiosMor.forEach((s, i) => {
      const esc = 0.7 + rng() * 0.9, ap = 0.5 + rng() * 0.2;
      q.setFromAxisAngle(eje, rng() * Math.PI * 2);
      m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(esc, esc * ap, esc));
      morts.setMatrixAt(i, m4);
      // hoja elíptica con margen violeta: el verde se ladea apenas a vino
      col.copy(cMorV).lerp(cMorC, rng()).offsetHSL((rng() - 0.5) * 0.04, 0, 0);
      morts.setColorAt(i, col);
      const nFr = 3 + (rng() < 0.4 ? 1 : 0);
      for (let f = 0; f < nFr; f++) {
        const fa = rng() * Math.PI * 2, fd = rng() * 0.3 * esc;
        m4.compose(
          new THREE.Vector3(s.x + Math.cos(fa) * fd, s.y + 0.40 * esc * ap + 0.03, s.z + Math.sin(fa) * fd),
          new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        frutos.setMatrixAt(fm, m4); fm++;
      }
    });
    morts.instanceMatrix.needsUpdate = true;
    frutos.count = fm; frutos.instanceMatrix.needsUpdate = true;
    scene.add(morts, frutos);
  }

  // ── EL ENT: el abuelo del frailejonal ────────────────────────────────────
  // Es la MISMA Espeletia del frailejonal a ~3× (10,4 m con la corona), así que
  // se lee como el abuelo de la colonia y no como otra especie. Va apartado del
  // ojo de agua y del corte de suelo, en el rellano, donde se vea contra el
  // telón de cordilleras. `actualizar` le corre la mirada y el balanceo lento:
  // lo que tiene que dar es quietud imponente, no movimiento.
  // ESCALA 3: el módulo entrega el Ent a escala REAL (10,4 m con la corona),
  // pero este mundo dibuja a escala AoE del valle (ESC=3, «huesos reales, piel
  // dibujada») — los frailejones de al lado ya están agrandados para leerse. A
  // escala 1 el Ent quedaba del mismo porte que un frailejón veterano y un juez
  // ciego, preguntado si veía «un árbol o figura MUY grande», respondió NO y
  // señaló los frailejones. No es que faltara: es que no destacaba.
  const ENT_X = CX + 22, ENT_Z = CZ + 10;
  const ent = crearEntParamo(THREE, { semilla: 20260807, detalle: 'alto', escala: 3 });
  ent.position.set(ENT_X, height(ENT_X, ENT_Z), ENT_Z);
  scene.add(ent);

  // ── LOS CÓNDORES: el cielo deja de estar vacío ───────────────────────────
  // Dos, como los dos modos de la PWA: uno ORBITA la térmica sobre el
  // frailejonal (el protagonista — su collar y el panel blanco se leen al
  // banquearse) y otro CRUZA alto sobre el mar de nubes del abismo, medio
  // fundido en la bruma (la escala del territorio). Alturas sobre la meseta,
  // no sobre el mar: jamás rozan el suelo. Escala AoE del valle, como todo.
  const y0Condor = height(CX, CZ);
  const condores = [
    crearCondorParamo(THREE, {
      centro: { x: CX - 10, y: y0Condor + 46, z: CZ + 30 },
      radio: 38, vel: 0.10, fase: 0.8, banco: 0.24, escala: 4,
    }),
    crearCondorParamo(THREE, {
      centro: { x: CX + 30, y: y0Condor + 88, z: CZ + 150 },
      radio: 150, excentricidad: 0.5, vel: 0.055, fase: 3.6, banco: 0.18, escala: 2.6,
    }),
  ];
  condores.forEach((c) => scene.add(c));

  // ── QUEÑUA (Ent), NACIMIENTO, SUELO, NIEBLAS ─────────────────────────────
  const quenua = plantarQuenuas(scene, { x: AGUA.x + 8, z: AGUA.z - 5 });
  const nacimiento = plantarNacimiento(scene, AGUA);
  const suelo = plantarSuelo(scene, SUELO);
  const lecciones = wireParamoLecciones({ scene, camera, controls, renderer, THREE, soil: suelo });
  const niebla = plantarNieblas(scene);

  // ── LA QUEBRADA DEL PÁRAMO: el agua del nacimiento baja a la meseta ──────
  // El curso baja desde la laguna hacia el labio del escarpe (-Z): es la
  // cabecera del agua que después cae en La Chorrera, aguas abajo. El ancho y
  // la zanja se eligen para que la excavación del terreno (rejilla ~7 u del
  // mesh) abarque ≥2 vértices: si el cauce es más angosto, la zanja queda como
  // pozas aisladas y la lámina se entierra entre vértices. `excavarQuebrada`
  // rebaja el terreno REAL del valle con la zanja exacta del módulo (sin
  // duplicar su geometría), para que el agua se lea como cauce y no como cinta
  // flotando sobre el pajonal. `?quebrada=0` la apaga (baseline A/B del gate).
  let quebrada = null;
  if (new URLSearchParams(location.search).get('quebrada') !== '0') {
    const QUEB_CURSO = [
      { x: -85, z: -1252 }, { x: -88, z: -1236 }, { x: -92, z: -1220 },
      { x: -97, z: -1204 }, { x: -102, z: -1188 }, { x: -108, z: -1172 },
      { x: -112, z: -1160 }, { x: -115, z: -1150 },
    ];
    quebrada = crearQuebrada(THREE, {
      puntos: QUEB_CURSO,
      alturaEn: (x, z) => height(x, z),
      ancho: 6.0, hundir: 1.2,
      piedras: 14, chispas: 45, seed: 20260807,
      solDir: new THREE.Vector3(260, 430, -60).normalize(),
      muestras: 120,
    });
    scene.add(quebrada.grupo);
    excavarQuebrada(scene, quebrada);
    window.__quebrada = quebrada;   // hook del gate (conteo + zanja)
  }

  // ── LAS ESTACIONES: cámara + mirada + frase (derivadas, ancladas) ────────
  const ojo = (x, z, dy) => new THREE.Vector3(x, height(x, z) + dy, z);
  const EST = [
    {
      id: 'paramo', titulo: 'El páramo',
      frase: 'Arriba de La Chorrera, a más de 3.000 metros: el páramo. Aquí nace el agua que baja a la vereda. Colombia tiene la mitad de los páramos del mundo.',
      // el plano de establecimiento: sobre el labio, mirando la hoya entera —
      // héroes de primer plano, la laguna a la izquierda, el ejército
      // escalonando a la bruma y el telón de cordilleras cerrando arriba
      // LA VISTA DEL PÁRAMO: desde lo alto de la meseta MIRANDO VALLE
      // ABAJO (la sonda del DEM: el terreno baja monótono de -1395 a -1210 —
      // cero suelo muerto). Héroes al hombro, el ejército descendiendo, la
      // laguna en el tercio izquierdo, y al fondo el labio y el mar de nubes
      // sobre el abismo de La Chorrera. El páramo flota sobre las nubes.
      pos: () => ojo(CX + 20, CZ - 95, 11),
      mira: () => new THREE.Vector3(CX - 30, height(CX - 30, CZ + 90) + 2, CZ + 90),
    },
    {
      id: 'frailejon', titulo: 'El frailejón',
      // (F23) fuera el mito del centímetro: el crecimiento real medido es
      // 0,2-14,8 cm/año, típico 4-9 (CIENCIA-PARAMO-ENT §5.1, 4 estudios DOI).
      frase: 'El frailejón (Espeletia): roseta de hojas velludas y plateadas, tronco forrado de sus propias hojas muertas, y la vara de flores amarillas. Crece despacio: unos cuatro a nueve centímetros al año, según el páramo.',
      pos: () => ojo(hero.x + 5.5, hero.z + 7, 2.4 + hero.sc * 2.4),
      mira: () => new THREE.Vector3(hero.x, hero.y + hero.sc * 2.0, hero.z),
    },
    {
      id: 'esponja', titulo: 'La esponja de agua',
      frase: 'Esas hojas peludas atrapan la niebla gota a gota (lluvia horizontal). El agua escurre al suelo y de aquí, del hondón, nace la quebrada. El frailejón es una esponja viva.',
      pos: () => ojo(nacimiento.x + 22, nacimiento.z + 26, 9),
      mira: () => new THREE.Vector3(nacimiento.x, nacimiento.y + 0.5, nacimiento.z),
    },
    {
      id: 'quenua', titulo: 'La queñua',
      frase: 'La queñua (Polylepis) es el árbol que llega más arriba, de corteza rojiza en láminas. Es el Ent del páramo: da abrigo, y su copa también peina la niebla para el suelo.',
      pos: () => ojo(quenua.x + 11, quenua.z + 15, 7.5),
      mira: () => new THREE.Vector3(quenua.x, quenua.y + 7.5, quenua.z),
    },
    {
      id: 'suelo', titulo: 'El suelo vivo',
      frase: 'Tres capas: la hojarasca que abriga arriba, el suelo negro esponjoso donde vive casi todo, y el subsuelo firme. El suelo del páramo es negro y profundo — el tanque de agua de la montaña.',
      pos: () => ojo(suelo.x + 6, suelo.z + 7, 3.4),
      mira: () => new THREE.Vector3(suelo.x, suelo.y - 0.4, suelo.z + 1.5),
    },
    {
      id: 'micorrizas', titulo: 'Las micorrizas',
      frase: 'Ese hilo blanco es el internet de los hongos: las micorrizas forran la raíz, le llevan agua y minerales de lejos y enlazan una planta con otra. Sin esa red, ni el frailejón ni la queñua resisten aquí.',
      pos: () => ojo(suelo.x + 3.4, suelo.z + 4.4, 2.2),
      mira: () => new THREE.Vector3(suelo.x, suelo.y - 0.6, suelo.z + 1.6),
    },
    {
      // (F23) IDENTIDAD RESUELTA: "El Ent del páramo" es LA QUEÑUA — decisión
      // ya tomada en DISENO-ENT-PARAMO-epico.md ("Consecuencia de diseño") y
      // que este chip venía pisando: dos personajes decían ser el Ent. El
      // frailejón gigante queda como lo que su propio código siempre lo llamó:
      // el ABUELO del frailejonal.
      id: 'ent', titulo: 'El abuelo',
      frase: 'El abuelo del frailejonal se enderezó hace más tiempo del que nadie recuerda: pesa, escucha la niebla y permanece. El Ent del páramo es otro — la queñua.',
      // estación propia del Ent: su rostro mira a +Z, así que la cámara entra
      // por delante, cerca y a la altura de las cuencas, no desde el plano de
      // establecimiento donde sólo se leía la silueta contra la bruma.
      pos: () => ojo(ENT_X, ENT_Z + 26, 15.0),
      mira: () => new THREE.Vector3(ENT_X, height(ENT_X, ENT_Z) + 15.9, ENT_Z + 0.2),
    },
  ];

  // ── el vuelo entre estaciones (mismo motor que la lección agua) ──────────
  const VUELO_S = 3.0;
  const st = { idx: 0, pedida: null, vuelo: null, mira: new THREE.Vector3() };
  const botones = [];
  function frase(i) {
    const el = document.querySelector('#lecParamo .lpFrase');
    if (el) el.textContent = EST[i].frase;
    botones.forEach((b, j) => b.setAttribute('aria-pressed', j === i ? 'true' : 'false'));
  }
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const ui = document.createElement('div'); ui.id = 'lecParamo';
  ui.innerHTML = '<ul class="lpChips"></ul><p class="lpFrase"></p>';
  document.body.appendChild(ui);
  const lista = ui.querySelector('.lpChips');
  EST.forEach((e, i) => {
    const li = document.createElement('li'); const bt = document.createElement('button');
    bt.type = 'button'; bt.textContent = e.titulo;
    bt.addEventListener('click', () => { st.pedida = i; });
    li.appendChild(bt); lista.appendChild(li); botones.push(bt);
  });

  return {
    arrancar() {
      const pedidaId = new URLSearchParams(location.search).get('est');
      if (lecciones && (pedidaId === 'suelo' || pedidaId === 'micorrizas')) {
        lecciones.arrancar();
        return;
      }
      const i0 = Math.max(0, EST.findIndex((e2) => e2.id === pedidaId));
      st.idx = i0;
      const e = EST[i0];
      camera.position.copy(e.pos());
      st.mira.copy(e.mira());
      camera.lookAt(st.mira);
      controls.target.copy(st.mira);
      controls.enabled = false;
      frase(i0);
      setTimeout(() => { if (!st.vuelo) controls.enabled = true; }, 900);
    },
    update(t) {
      // La matriz PRIMERO: más abajo hay un `return` temprano cuando no hay vuelo
      // en curso, y colgarla después la dejaría sin actualizar casi siempre.
      // `actualizar` mueve el anillo de detalle con la cámara y corre el reloj del
      // viento; sin ella el pajonal queda tieso y el impostor no releva a la brizna.
      const dt = st.tPrev === undefined ? 0 : Math.min(t - st.tPrev, 0.1);
      st.tPrev = t;
      matriz.actualizar(camera, dt);
      flores.actualizar(camera);
      ent.userData.actualizar(t, camera);   // mirada con damping alto + balanceo
      condores.forEach((c) => c.userData.actualizar(t));   // planeo en térmica
      if (quebrada) quebrada.tick(dt);      // la corriente corre (aguaParamo)
      if (lecciones) lecciones.update(t);
      if (st.pedida !== null) {
        st.idx = st.pedida; st.pedida = null;
        if (controls.enabled) st.mira.copy(controls.target);
        st.vuelo = { p0: camera.position.clone(), p1: EST[st.idx].pos(), m0: st.mira.clone(), m1: EST[st.idx].mira(), t0: t };
        controls.enabled = false;
        frase(st.idx);
      }
      for (const m of niebla) {
        m.position.x = m.userData.base.x + Math.sin(t * 0.05 + m.userData.ph) * m.userData.base.drift;
        m.rotation.set(0, Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z), 0);
      }
      if (!st.vuelo) return;
      const k = Math.min((t - st.vuelo.t0) / VUELO_S, 1);
      const e = k * k * k * (k * (k * 6 - 15) + 10);
      camera.position.lerpVectors(st.vuelo.p0, st.vuelo.p1, e);
      st.mira.lerpVectors(st.vuelo.m0, st.vuelo.m1, e);
      camera.lookAt(st.mira);
      if (k >= 1) { controls.target.copy(st.mira); controls.enabled = true; controls.update(); st.vuelo = null; }
    },
  };
}
