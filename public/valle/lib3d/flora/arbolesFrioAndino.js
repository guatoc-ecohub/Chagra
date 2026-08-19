// ═════════════════════════════════════════════════════════════════════════════
//  ⚠️ ARCHIVADO (2026-08-07) — SUPERADO POR lib3d/flora/arbolesAltoandinos.js
//
//  Este módulo y arbolesAltoandinos.js nacieron de la MISMA tarea despachada
//  dos veces por error de coordinación. Se compararon con el mismo encuadre,
//  la misma escena y el mismo medidor (comparador-arboles-frio.html, capturas
//  en _gate/comp/):
//    · Silueta a 30 m: gana arbolesAltoandinos — aquí encenillo y gaque se
//      confunden entre sí (veredicto propio + juez visual externo).
//    · Presupuesto: sin LOD los tris crecen lineales — 16.000 árboles = 30 FPS
//      en la GPU de referencia, donde arbolesAltoandinos sostiene 59 con 32.000
//      gracias a su impostor de atlas.
//  NO importar en código nuevo. Se conserva (no se borra) para que la decisión
//  sea reversible por el operador; su gate arboles-frio-andino.html sigue vivo.
// ═════════════════════════════════════════════════════════════════════════════
//  arbolesFrioAndino.js — los CINCO árboles nativos del bosque altoandino,
//  cada uno reconocible por SILUETA a 30 m (tarea ARTE #23).
//
//    encenillo     Weinmannia tomentosa  porte erguido, copa densa columnar
//    aliso         Alnus acuminata       copa abierta y clara, tronco recto pálido
//    siete_cueros  Tibouchina lepidota   domo bajo, fustes torcidos canela,
//                                        flor morada como ACENTO minoritario
//    gaque         Clusia multiflora     domo ancho OSCURO, hoja coriácea,
//                                        raíces aéreas en la base
//    mano_de_oso   Oreopanax sp.         parasol con HOJAS PALMADAS grandes
//                                        (la única hoja que SÍ se lee: es su firma,
//                                        excepción documentada tipo hojaMusa)
//
//  ── POR QUÉ VIVE AQUÍ ────────────────────────────────────────────────────────
//  Va en lib3d/flora/ del valle (vendoreado, idéntico al de ~/demos/lib3d según
//  diff 2026-08-07) porque PARTE de FollajeMasa.js y vientoMundos.js que ya
//  están acá al lado: importa por ruta relativa y queda servido en :8800 sin
//  duplicar un byte. Crear otro lib/flora/ paralelo habría sido reinventar.
//
//  ── QUÉ REUSA (no reinventa) ─────────────────────────────────────────────────
//   · FollajeMasa.js   → copa = MASA (núcleo esculpido + cards texturizados,
//                        2 draw calls por copa; imposible contar hojas).
//   · vientoMundos.js  → aplicarVientoMundo(mat): la copa respira en todos los
//                        mundos (tickVientoMundos(t) 1×/frame en el llamador).
//   · La técnica de grumos del kart (entorno.js) inspira crearBosqueFrio:
//     pocas variantes deterministas + InstancedMesh = bosque denso barato.
//
//  ── QUÉ AGREGA SOBRE FabricaFlora742 ─────────────────────────────────────────
//  La fábrica 742 da arquetipos GENÉRICOS (todo "arbol_andino_alto" es el mismo
//  árbol con otro seed). Aquí cada especie tiene firma propia:
//   · troncos con carácter: sinuoso (encenillo), recto pálido (aliso), dos
//     fustes torcidos canela (siete cueros), fuste corto + raíces aéreas
//     (gaque), delgado (mano de oso) — cilindros doblados por vértice, no tubos.
//   · siluetas de copa distintas: columnar densa / abierta con huecos / domo
//     bajo / domo ancho oscuro / parasol.
//   · flor morada del siete cueros como CAPA de cards minoritaria (~12% de la
//     superficie de copa) — el verde sigue dominando (regla dura).
//   · hoja palmada esculpida para el mano de oso (grid radial lobulado con
//     nervaduras por color de vértice) — la excepción a "masa" porque la hoja
//     grande ES la silueta de la especie, igual que hojaMusa para plátano.
//
//  ── REGLAS DURAS QUE CUMPLE ──────────────────────────────────────────────────
//   1. FOLLAJE = MASA (FollajeMasa en todas las copas; el gate mira).
//   2. Verde-dominante: paletas frías grisáceas del piso frío; morado ≤ ~12%.
//   3. CERO invasoras: solo las cinco nativas de arriba.
//   4. Los árboles SE MUEVEN: viento aplicado a todos los materiales de copa.
//   5. Presupuesto: materiales/texturas cacheados por especie; crearBosqueFrio
//      instancia pocas variantes → ~30-40 draw calls para un bosque completo.
//
//  Importa `three` por bare specifier (importmap del valle), igual que
//  FabricaFlora742. Determinista por seed: el gate visual compara.
// ═════════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import {
  texturaFollaje, materialFollaje, materialNucleo,
  geometriaNucleoMasa, geometriaCardsMasa, fusionarPreservando,
} from './FollajeMasa.js';
import { aplicarVientoMundo, aplicarVientoSombra } from './vientoMundos.js';

// ── PRNG determinista (mismo árbol cada carga, mismo seed) ───────────────────
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash32(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < String(texto).length; i += 1) {
    h ^= String(texto).charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) || 1;
}

// ═════════════════════════════════════════════════════════════════════════════
//  FICHA POR ESPECIE — paleta (verdes fríos grisáceos, ciencia del piso frío),
//  textura de masa, corteza y viento. Los verdes vienen de PALETA_PISO.frio de
//  FabricaFlora742, ajustados por especie (aliso más fresco, gaque más oscuro).
// ═════════════════════════════════════════════════════════════════════════════
export const ESPECIES_FRIO = Object.freeze([
  'encenillo', 'aliso', 'siete_cueros', 'gaque', 'mano_de_oso',
]);

const SPP = Object.freeze({
  encenillo: {
    nombre: 'Encenillo', cientifico: 'Weinmannia tomentosa',
    fol: { oscuro: '#24382a', medio: '#3a563b', claro: '#64804a', hojas: 470, alargue: 2.0 },
    sombra: '#172518', brillo: 0.15, cobertura: 1.7, tamCard: 1.15,
    corteza: { base: '#5c5044', tinte: '#66704e', banda: 0.3 },
    viento: { amp: 0.07, piso: 3.2, vel: 0.95 },
  },
  aliso: {
    nombre: 'Aliso', cientifico: 'Alnus acuminata',
    fol: { oscuro: '#2a4527', medio: '#446631', claro: '#7ea24b', hojas: 330, alargue: 2.7 },
    sombra: '#1b2f19', brillo: 0.20, cobertura: 1.35, tamCard: 1.0,
    corteza: { base: '#b3a68f', tinte: '#877a63', banda: 0.4 },
    viento: { amp: 0.12, piso: 3.4, vel: 1.15 },
  },
  siete_cueros: {
    nombre: 'Siete cueros', cientifico: 'Tibouchina lepidota',
    fol: { oscuro: '#263f28', medio: '#3b5a34', claro: '#66883f', hojas: 360, alargue: 1.9 },
    sombra: '#182818', brillo: 0.16, cobertura: 1.4, tamCard: 0.95,
    flor: { oscuro: '#6b3866', medio: '#a04f9a', claro: '#cf8fc8', hojas: 300, alargue: 1.15 },
    corteza: { base: '#955a41', tinte: '#c98f6f', banda: 0.45 },
    coberturaFlor: 0.24,
    viento: { amp: 0.09, piso: 1.6, vel: 1.05 },
  },
  gaque: {
    nombre: 'Gaque', cientifico: 'Clusia multiflora',
    fol: { oscuro: '#1a3320', medio: '#2f5229', claro: '#4f7439', hojas: 290, alargue: 1.55 },
    sombra: '#102013', brillo: 0.16, cobertura: 1.5, tamCard: 1.4,
    corteza: { base: '#453a30', tinte: '#55604a', banda: 0.4 },
    viento: { amp: 0.05, piso: 1.8, vel: 0.85 },
  },
  mano_de_oso: {
    nombre: 'Mano de oso', cientifico: 'Oreopanax floribundum',
    fol: { oscuro: '#22391f', medio: '#375433', claro: '#6b8f4a', hojas: 340, alargue: 2.1 },
    sombra: '#141f0f', brillo: 0.22, cobertura: 1.35, tamCard: 1.0,
    hoja: { tono: '#3d6634', nervadura: '#b7d06e', borde: '#26421f' },
    corteza: { base: '#7d6f5c', tinte: '#6a6f52', banda: 0.22 },
    viento: { amp: 0.10, piso: 2.4, vel: 1.0 },
  },
});

/** Ficha pública (nombre común + científico) para labels/HUD. */
export function infoEspecies() {
  const out = {};
  for (const k of ESPECIES_FRIO) out[k] = { nombre: SPP[k].nombre, cientifico: SPP[k].cientifico };
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
//  MATERIALES CACHEADOS POR ESPECIE — el bosque entero comparte 5 juegos de
//  materiales/texturas; el viento se parchea UNA vez acá (idempotente, y con
//  InstancedMesh la fase sale de instanceMatrix → cada árbol se mece distinto).
// ═════════════════════════════════════════════════════════════════════════════
const _mats = new Map();
function matsDe(especie) {
  if (_mats.has(especie)) return _mats.get(especie);
  const S = SPP[especie];
  const seedTex = hash32('tex|' + especie);
  const tex = texturaFollaje(THREE, { seed: seedTex, ...S.fol });
  const cards = materialFollaje(THREE, tex, { brillo: S.brillo });
  const nucleo = materialNucleo(THREE, { brillo: S.brillo * 0.35, tono: S.fol.medio });
  aplicarVientoMundo(cards, { amplitud: S.viento.amp, piso: S.viento.piso, velocidad: S.viento.vel });
  aplicarVientoMundo(nucleo, { amplitud: S.viento.amp * 0.75, piso: S.viento.piso, velocidad: S.viento.vel });
  const corteza = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true,
  });
  const juego = { tex, cards, nucleo, corteza };
  if (S.flor) {
    const texFlor = texturaFollaje(THREE, { seed: seedTex + 5, ...S.flor });
    juego.flor = materialFollaje(THREE, texFlor, { brillo: 0.30, alphaTest: 0.3 });
    aplicarVientoMundo(juego.flor, { amplitud: S.viento.amp, piso: S.viento.piso, velocidad: S.viento.vel });
  }
  if (S.hoja) {
    juego.hoja = new THREE.MeshStandardMaterial({
      vertexColors: true, side: THREE.DoubleSide, roughness: 1, metalness: 0,
      emissive: new THREE.Color(S.hoja.tono), emissiveIntensity: 0.2,
    });
    aplicarVientoMundo(juego.hoja, { amplitud: S.viento.amp * 1.2, piso: S.viento.piso, velocidad: S.viento.vel });
  }
  _mats.set(especie, juego);
  return juego;
}

// ═════════════════════════════════════════════════════════════════════════════
//  CILINDRO DOBLADO — tronco/rama/raíz con carácter: cónico, doblado por
//  vértice (base quieta), color de corteza por vértice (bandas + jitter).
//  Devuelve geometría INDEXADA con position+normal+color (+uv del cilindro).
// ═════════════════════════════════════════════════════════════════════════════
function cilindroDoblado(opts) {
  const h = opts.h, r0 = opts.r0, r1 = opts.r1 ?? r0 * 0.45;
  const seg = opts.seg ?? 7, hSeg = opts.hSeg ?? 6;
  const lean = opts.lean ?? [0, 0];      // deriva cuadrática (se acumula arriba)
  const onda = opts.onda ?? [0, 0];      // sinuosidad (serpenteo por el fuste)
  const fase = opts.fase ?? 0;
  const rn = opts.rn ?? prng(11);
  const cBase = new THREE.Color(opts.base ?? '#5c5044');
  const cTinte = new THREE.Color(opts.tinte ?? '#66704e');
  const banda = opts.banda ?? 0.3;
  const geo = new THREE.CylinderGeometry(r1, r0, h, seg, hSeg, false);
  geo.translate(0, h / 2, 0);
  const P = geo.attributes.position, n = P.count;
  const col = new Float32Array(n * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const y = P.getY(i);
    const t = THREE.MathUtils.clamp(y / h, 0, 1);
    const dx = lean[0] * t * t * h + onda[0] * Math.sin(t * Math.PI * 1.7 + fase) * t;
    const dz = lean[1] * t * t * h + onda[1] * Math.cos(t * Math.PI * 1.4 + fase * 1.3) * t;
    P.setX(i, P.getX(i) + dx);
    P.setZ(i, P.getZ(i) + dz);
    // corteza: bandas horizontales suaves (lenticelas/descascarado) + jitter
    const b = 0.5 + 0.5 * Math.sin(y * 5.2 + fase * 3.1 + Math.sin(y * 1.9) * 1.4);
    tmp.copy(cBase).lerp(cTinte, banda * b + (rn() - 0.5) * 0.12);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

// rama/raíz orientada: cilindro doblado rotado hacia `dir` desde `origen`.
// OJO: el anclaje se llama `origen` (Vector3) porque `base` ya es el color de
// corteza que llega por spread de S.corteza — la colisión rompía el translate.
function ramaHacia(opts) {
  const dir = opts.dir.clone().normalize();
  const geo = cilindroDoblado({ ...opts, lean: opts.lean ?? [0.04, 0.02] });
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  geo.applyQuaternion(q);
  geo.translate(opts.origen.x, opts.origen.y, opts.origen.z);
  return geo;
}

// ── gradiente de copa: sombra→medio→luz por altura (FollajeMasa lo consume) ──
function gradienteCopa(pal, yBase, yTop) {
  const cO = new THREE.Color(pal.oscuro), cM = new THREE.Color(pal.medio), cC = new THREE.Color(pal.claro);
  const tmp = new THREE.Color();
  const span = Math.max(0.001, yTop - yBase);
  return (x, y, z) => {
    const t = THREE.MathUtils.clamp((y - yBase) / span, 0, 1);
    if (t < 0.5) tmp.copy(cO).lerp(cM, t * 2);
    else tmp.copy(cM).lerp(cC, (t - 0.5) * 2);
    return tmp;
  };
}

// copa de masa → geos {nucleo, cards} con el gradiente de la especie.
function copaMasa(S, esferas, seed, extra = {}) {
  let yB = Infinity, yT = -Infinity;
  for (const e of esferas) {
    const ey = e.esc ? e.esc[1] : 1;
    yB = Math.min(yB, e.c[1] - e.r * ey);
    yT = Math.max(yT, e.c[1] + e.r * ey);
  }
  const grad = gradienteCopa(S.fol, yB, yT);
  // núcleo hundido y en sombra: es el interior de la copa — si queda claro o
  // al ras de los cards, lee como bola lisa asomando (gate de la 2ª pasada).
  const nucleo = geometriaNucleoMasa(THREE, esferas, {
    seed, gradiente: grad, tonoSombra: S.sombra,
    rugosidad: extra.rugosidad ?? 0.32, encoger: extra.encoger ?? 0.94,
    sombra: extra.sombra ?? 0.55,
  });
  const cards = geometriaCardsMasa(THREE, esferas, {
    seed: seed + 1, gradiente: grad,
    cobertura: S.cobertura, tamCard: S.tamCard, maxCards: extra.maxCards ?? 750,
  });
  return { nucleo, cards };
}

// ═════════════════════════════════════════════════════════════════════════════
//  HOJA PALMADA (mano de oso) — grid radial con margen lobulado, caída hacia el
//  borde y nervaduras claras por color de vértice. Indexada, seam envuelto →
//  normales suaves. La hoja grande ES la firma de Oreopanax: se debe leer.
// ═════════════════════════════════════════════════════════════════════════════
function hojaPalmada(opts) {
  const R = opts.R ?? 0.85, lob = opts.lob ?? 7;
  const sect = opts.sect ?? 24, rings = opts.rings ?? 4;
  const rot0 = opts.rot0 ?? 0, droop = opts.droop ?? 0.5;
  const rn = opts.rn ?? prng(31);
  const base = new THREE.Color(opts.tono ?? '#31512c');
  const nerv = new THREE.Color(opts.nervadura ?? '#9ab55c');
  const borde = new THREE.Color(opts.borde ?? '#223a1e');
  const nv = (rings + 1) * sect;
  const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const tmp = new THREE.Color();
  for (let a = 0; a <= rings; a++) {
    const fr = a / rings;
    for (let s = 0; s < sect; s++) {
      const th = (s / sect) * Math.PI * 2;
      const lobK = Math.abs(Math.sin((lob * (th + rot0)) / 2));
      const forma = 0.55 + 0.45 * Math.pow(lobK, 0.62);
      const rr = R * (0.06 + 0.94 * fr) * forma;
      const k = a * sect + s;
      pos[k * 3] = Math.cos(th) * rr;
      pos[k * 3 + 1] = Math.sin(th) * rr;
      pos[k * 3 + 2] = droop * R * Math.pow(fr, 1.7);
      uv[k * 2] = 0.5 + Math.cos(th) * fr * 0.5;
      uv[k * 2 + 1] = 0.5 + Math.sin(th) * fr * 0.5;
      // nervadura: clara a lo largo del centro de cada lóbulo, fuerte cerca
      // del pecíolo; borde levemente oscurecido.
      const vena = Math.pow(lobK, 9) * (1 - 0.55 * fr);
      tmp.copy(base).lerp(nerv, Math.min(1, vena * 1.1 + 0.12 * (1 - fr)));
      if (fr > 0.72) tmp.lerp(borde, (fr - 0.72) * 1.4);
      tmp.offsetHSL(0, 0, (rn() - 0.5) * 0.03);
      col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
    }
  }
  const idx = [];
  for (let a = 0; a < rings; a++) {
    for (let s = 0; s < sect; s++) {
      const s2 = (s + 1) % sect;
      const i0 = a * sect + s, i1 = a * sect + s2;
      const i2 = (a + 1) * sect + s, i3 = (a + 1) * sect + s2;
      idx.push(i0, i2, i1, i1, i2, i3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ═════════════════════════════════════════════════════════════════════════════
//  CONSTRUCTORES POR ESPECIE — cada uno devuelve { partes, altura } donde
//  partes = [{ nombre, geo, mat }] listas para Mesh (1 árbol) o InstancedMesh
//  (bosque). Toda copa pasa por copaMasa (regla de masa).
// ═════════════════════════════════════════════════════════════════════════════

// ENCENILLO — fuste levemente sinuoso, copa DENSA columnar-ovalada apilada.
function geoEncenillo(seed) {
  const rn = prng(seed);
  const S = SPP.encenillo;
  const h = 3.8 + rn() * 0.9;                    // arranque de copa
  const fase = rn() * 6.28;
  const tronco = cilindroDoblado({
    h: h + 1.6, r0: 0.30, r1: 0.11, hSeg: 7, fase, rn,
    onda: [0.22, 0.16], lean: [(rn() - 0.5) * 0.05, (rn() - 0.5) * 0.05],
    ...S.corteza,
  });
  const esferas = [];
  const nLob = 4;
  let y = h * 0.82;
  for (let i = 0; i < nLob; i++) {
    const f = i / (nLob - 1);
    const r = 1.35 + Math.sin(f * Math.PI) * 0.5 + rn() * 0.15;  // barriga al medio
    esferas.push({
      c: [(rn() - 0.5) * 0.7, y, (rn() - 0.5) * 0.7],
      r, esc: [1, 1.16, 1],
    });
    y += r * 1.05;
  }
  esferas.push({ c: [(rn() - 0.5) * 0.5, y - 0.4, (rn() - 0.5) * 0.5], r: 0.85, esc: [1, 1.2, 1] });
  const { nucleo, cards } = copaMasa(S, esferas, seed, { rugosidad: 0.30 });
  const mats = matsDe('encenillo');
  return {
    altura: y + 0.6,
    partes: [
      { nombre: 'corteza', geo: tronco, mat: mats.corteza },
      { nombre: 'nucleo', geo: nucleo, mat: mats.nucleo },
      { nombre: 'cards', geo: cards, mat: mats.cards },
    ],
  };
}

// ALISO — tronco RECTO PÁLIDO alto con ramas visibles, copa ABIERTA y clara:
// lóbulos separados con huecos por los que se ve el fuste.
function geoAliso(seed) {
  const rn = prng(seed);
  const S = SPP.aliso;
  const h = 5.2 + rn() * 1.0;
  const fase = rn() * 6.28;
  const partesCorteza = [cilindroDoblado({
    h: h + 1.2, r0: 0.27, r1: 0.09, hSeg: 6, fase, rn,
    onda: [0.05, 0.04],                          // casi recto
    ...S.corteza,
  })];
  const esferas = [];
  const nLob = 5;
  for (let i = 0; i < nLob; i++) {
    const a = (i / nLob) * Math.PI * 2 + rn() * 0.8;
    const rad = 1.05 + rn() * 0.7;               // separados del eje → huecos
    const yy = h * (0.72 + rn() * 0.45);
    const r = 0.85 + rn() * 0.35;
    esferas.push({
      c: [Math.cos(a) * rad, yy, Math.sin(a) * rad],
      r, esc: [1, 0.82, 1],
    });
    // rama pálida que sostiene el lóbulo (se ve por los huecos)
    const yB = yy - r * 0.9 - 0.8;
    partesCorteza.push(ramaHacia({
      origen: new THREE.Vector3(0, Math.max(2.2, yB), 0),
      dir: new THREE.Vector3(Math.cos(a) * rad, (yy - Math.max(2.2, yB)) * 0.9, Math.sin(a) * rad),
      h: Math.hypot(rad, yy - Math.max(2.2, yB)) * 1.02,
      r0: 0.09, r1: 0.03, seg: 5, hSeg: 3, fase: fase + i, rn,
      ...S.corteza,
    }));
  }
  esferas.push({ c: [(rn() - 0.5) * 0.4, h * 1.18, (rn() - 0.5) * 0.4], r: 0.9, esc: [1, 0.85, 1] });
  const { nucleo, cards } = copaMasa(S, esferas, seed, { rugosidad: 0.4, encoger: 0.95 });
  const mats = matsDe('aliso');
  return {
    altura: h * 1.18 + 0.9,
    partes: [
      { nombre: 'corteza', geo: fusionarPreservando(THREE, partesCorteza), mat: mats.corteza },
      { nombre: 'nucleo', geo: nucleo, mat: mats.nucleo },
      { nombre: 'cards', geo: cards, mat: mats.cards },
    ],
  };
}

// SIETE CUEROS — dos fustes torcidos canela (corteza que se descascara), domo
// redondo, y FLOR MORADA como capa de cards minoritaria sobre el tercio alto.
function geoSieteCueros(seed) {
  const rn = prng(seed);
  const S = SPP.siete_cueros;
  const h = 2.5 + rn() * 0.6;
  const fase = rn() * 6.28;
  const fustes = [];
  const nF = 2 + (rn() < 0.35 ? 1 : 0);
  for (let i = 0; i < nF; i++) {
    const a = (i / nF) * Math.PI * 2 + rn();
    fustes.push(cilindroDoblado({
      h: h + 0.9 + rn() * 0.5, r0: 0.16, r1: 0.05, seg: 6, hSeg: 7,
      fase: fase + i * 2.1, rn,
      onda: [0.34 + rn() * 0.2, 0.28 + rn() * 0.18],   // torcido notorio
      lean: [Math.cos(a) * 0.06, Math.sin(a) * 0.06],
      ...S.corteza,
    }));
  }
  const esferas = [
    { c: [0, h + 0.95, 0], r: 1.5 + rn() * 0.25, esc: [1.15, 0.95, 1.15] },
    { c: [1.0, h + 0.45, 0.3], r: 0.95 + rn() * 0.2 },
    { c: [-0.95, h + 0.5, -0.35], r: 0.9 + rn() * 0.2 },
    { c: [(rn() - 0.5) * 0.5, h + 1.85, (rn() - 0.5) * 0.5], r: 0.8, esc: [1, 0.9, 1] },
  ];
  const { nucleo, cards } = copaMasa(S, esferas, seed, { rugosidad: 0.3 });
  // flor: cards ESCASOS y CHICOS sobre los lóbulos altos, al ras de la copa —
  // racimos morados hundidos en el verde (≈12% de la superficie), no parches
  // planos estampados (gate de la 3ª pasada).
  const esfFlor = [esferas[0], esferas[3]].map((e) => ({
    c: [e.c[0], e.c[1] + 0.05, e.c[2]], r: e.r, esc: e.esc,
  }));
  const gradFlor = () => new THREE.Color('#e8d5e6');   // modulación clara pareja
  const flor = geometriaCardsMasa(THREE, esfFlor, {
    seed: seed + 9, gradiente: gradFlor,
    cobertura: 0.32, tamCard: 0.62, maxCards: 90, minCards: 20,
  });
  const mats = matsDe('siete_cueros');
  return {
    altura: h + 2.7,
    partes: [
      { nombre: 'corteza', geo: fusionarPreservando(THREE, fustes), mat: mats.corteza },
      { nombre: 'nucleo', geo: nucleo, mat: mats.nucleo },
      { nombre: 'cards', geo: cards, mat: mats.cards },
      { nombre: 'flor', geo: flor, mat: mats.flor },
    ],
  };
}

// GAQUE — fuste corto grueso oscuro + raíces aéreas arqueadas, domo ANCHO y
// OSCURO de hoja coriácea (parches de masa gruesos, verde profundo).
function geoGaque(seed) {
  const rn = prng(seed);
  const S = SPP.gaque;
  const h = 2.0 + rn() * 0.5;
  const fase = rn() * 6.28;
  const cortezas = [cilindroDoblado({
    h: h + 1.0, r0: 0.40, r1: 0.16, seg: 8, hSeg: 5, fase, rn,
    onda: [0.1, 0.08], ...S.corteza,
  })];
  // raíces aéreas: arcos delgados del fuste al suelo alrededor de la base
  const nR = 4 + Math.floor(rn() * 3);
  for (let i = 0; i < nR; i++) {
    const a = (i / nR) * Math.PI * 2 + rn() * 0.6;
    const radial = 0.65 + rn() * 0.5;
    const yTop = 0.7 + rn() * 0.6;
    cortezas.push(ramaHacia({
      origen: new THREE.Vector3(Math.cos(a) * radial, 0, Math.sin(a) * radial),
      dir: new THREE.Vector3(-Math.cos(a) * radial * 0.8, yTop, -Math.sin(a) * radial * 0.8),
      h: Math.hypot(radial * 0.8, yTop) * 1.05,
      r0: 0.10, r1: 0.05, seg: 5, hSeg: 4, fase: fase + i, rn,
      lean: [Math.cos(a) * 0.10, Math.sin(a) * 0.10],   // arquea hacia afuera
      ...S.corteza,
    }));
  }
  const R = 1.9 + rn() * 0.3;
  const esferas = [
    { c: [0, h + 1.05, 0], r: R, esc: [1.35, 0.78, 1.35] },
    { c: [R * 0.65, h + 0.5, R * 0.25], r: R * 0.66, esc: [1.2, 0.7, 1.2] },
    { c: [-R * 0.6, h + 0.55, -R * 0.3], r: R * 0.68, esc: [1.2, 0.7, 1.2] },
    { c: [R * 0.1, h + 0.45, -R * 0.6], r: R * 0.6, esc: [1.15, 0.7, 1.15] },
    { c: [0, h + 1.7, 0], r: R * 0.62, esc: [1.1, 0.7, 1.1] },
  ];
  const { nucleo, cards } = copaMasa(S, esferas, seed, { rugosidad: 0.24 });
  const mats = matsDe('gaque');
  return {
    altura: h + 2.5,
    partes: [
      { nombre: 'corteza', geo: fusionarPreservando(THREE, cortezas), mat: mats.corteza },
      { nombre: 'nucleo', geo: nucleo, mat: mats.nucleo },
      { nombre: 'cards', geo: cards, mat: mats.cards },
    ],
  };
}

// MANO DE OSO — fuste delgado, copa parasol compacta y un ANILLO de hojas
// palmadas GRANDES apuntando afuera: la hoja es la firma y se lee a 30 m.
function geoManoDeOso(seed) {
  const rn = prng(seed);
  const S = SPP.mano_de_oso;
  const h = 3.4 + rn() * 0.7;
  const fase = rn() * 6.28;
  const tronco = cilindroDoblado({
    h: h + 0.5, r0: 0.20, r1: 0.08, seg: 6, hSeg: 6, fase, rn,
    onda: [0.14, 0.1], ...S.corteza,
  });
  const esferas = [
    { c: [0, h + 0.35, 0], r: 1.3, esc: [1.3, 0.62, 1.3] },
    { c: [(rn() - 0.5) * 0.6, h + 0.85, (rn() - 0.5) * 0.6], r: 0.95, esc: [1.2, 0.6, 1.2] },
  ];
  const { nucleo, cards } = copaMasa(S, esferas, seed, { rugosidad: 0.3, maxCards: 420 });
  // hojas palmadas GRANDES: pocas y separadas para que el borde lobulado
  // recorte contra el cielo (con muchas se funden en parasol liso y la firma
  // se pierde — visto en el gate de la primera pasada).
  const hojas = [];
  const nHojas = 16 + Math.floor(rn() * 4);
  const zEje = new THREE.Vector3(0, 0, 1);
  const dir = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let i = 0; i < nHojas; i++) {
    const anillo = rn() < 0.62;                      // 62% en el borde, resto arriba
    // reparto angular con jitter (no al azar puro: evita calvas y solapes)
    const a = (i / nHojas) * Math.PI * 2 + rn() * 0.55;
    const e = anillo ? esferas[0] : esferas[1];
    const inclin = anillo ? 0.2 + rn() * 0.3 : 0.65 + rn() * 0.25;
    dir.set(Math.cos(a) * (1 - inclin), inclin, Math.sin(a) * (1 - inclin)).normalize();
    const g = hojaPalmada({
      R: 0.95 + rn() * 0.35, lob: 6 + Math.floor(rn() * 3),
      sect: 30, rings: 5,                          // lóbulos curvos, no polígono
      rot0: rn() * 6.28, droop: 0.3 + rn() * 0.18, rn,
      ...S.hoja,
    });
    // más parada que acostada: el lóbulo se recorta contra el cielo
    normal.copy(dir).lerp(new THREE.Vector3(0, 1, 0), 0.32).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(zEje, normal);
    g.applyQuaternion(q);
    g.translate(
      e.c[0] + dir.x * e.r * (e.esc ? e.esc[0] : 1) * 1.02,
      e.c[1] + dir.y * e.r * (e.esc ? e.esc[1] : 1) * 1.02 + 0.18,
      e.c[2] + dir.z * e.r * (e.esc ? e.esc[2] : 1) * 1.02
    );
    hojas.push(g);
  }
  const mats = matsDe('mano_de_oso');
  return {
    altura: h + 1.6,
    partes: [
      { nombre: 'corteza', geo: tronco, mat: mats.corteza },
      { nombre: 'nucleo', geo: nucleo, mat: mats.nucleo },
      { nombre: 'cards', geo: cards, mat: mats.cards },
      { nombre: 'hojas', geo: fusionarPreservando(THREE, hojas), mat: mats.hoja },
    ],
  };
}

const CONSTRUCTORES = Object.freeze({
  encenillo: geoEncenillo,
  aliso: geoAliso,
  siete_cueros: geoSieteCueros,
  gaque: geoGaque,
  mano_de_oso: geoManoDeOso,
});

// ═════════════════════════════════════════════════════════════════════════════
//  API PÚBLICA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Partes crudas de un árbol (geo+mat por parte) — para instanciar en bosques.
 * @returns {{ partes: Array<{nombre,geo,mat}>, altura: number }}
 */
export function partesArbolFrio(especie, seed) {
  const ctor = CONSTRUCTORES[especie];
  if (!ctor) throw new Error(`especie desconocida: ${especie} (van: ${ESPECIES_FRIO.join(', ')})`);
  return ctor(seed ?? hash32(especie));
}

/**
 * Un árbol como Group listo para la escena (sombras activadas, viento ya
 * parcheado en los materiales — el llamador tickea tickVientoMundos(t)).
 */
export function crearArbolFrio(especie, opts = {}) {
  const seed = opts.seed ?? hash32(especie + '|' + (opts.variante ?? 0));
  const { partes, altura } = partesArbolFrio(especie, seed);
  const grupo = new THREE.Group();
  for (const p of partes) {
    const mesh = new THREE.Mesh(p.geo, p.mat);
    mesh.castShadow = true;
    aplicarVientoSombra(mesh);
    mesh.receiveShadow = true;
    mesh.name = `${especie}-${p.nombre}`;
    grupo.add(mesh);
  }
  grupo.userData = { especie, seed, altura, ...infoEspecies()[especie] };
  return grupo;
}

/**
 * Bosque altoandino instanciado: pocas variantes deterministas por especie,
 * cada parte en UN InstancedMesh → ~30-40 draw calls para cientos de árboles.
 * La mezcla es fiel al bosque real: encenillo dominante, aliso en parches,
 * gaque y mano de oso dispersos, siete cueros minoritario (el morado es acento
 * también a escala de bosque).
 * @param {object} opts
 *   n          {number}   árboles (def 110)
 *   radio      {number}   radio del rodal (def 42)
 *   seed       {number}   semilla (def 23)
 *   variantes  {number}   variantes por especie (def 2)
 *   claro      {number}   radio de claro central sin árboles (def 6)
 *   alturaEn   {fn(x,z)}  altura del terreno (def 0)
 *   mezcla     {object}   proporciones por especie
 * @returns {{ grupo, puntos, conteo }}  puntos = anclas a nivel de suelo (bruma)
 */
export function crearBosqueFrio(opts = {}) {
  const n = opts.n ?? 110;
  const radio = opts.radio ?? 42;
  const seed = opts.seed ?? 23;
  const variantes = Math.max(1, opts.variantes ?? 2);
  const claro = opts.claro ?? 6;
  const alturaEn = opts.alturaEn ?? (() => 0);
  const mezcla = opts.mezcla ?? {
    encenillo: 0.32, aliso: 0.20, gaque: 0.18, mano_de_oso: 0.15, siete_cueros: 0.15,
  };
  const rn = prng(seed * 7717 + 5);

  // ── posiciones: rechazo con distancia mínima (rodal creíble, sin grilla) ──
  const puestos = [];
  const minD2 = 3.4 * 3.4;
  let intentos = 0;
  while (puestos.length < n && intentos < n * 60) {
    intentos++;
    const a = rn() * Math.PI * 2;
    const r = radio * Math.sqrt(rn());
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) < claro) continue;
    let ok = true;
    for (const p of puestos) {
      const dx = p.x - x, dz = p.z - z;
      if (dx * dx + dz * dz < minD2) { ok = false; break; }
    }
    if (ok) puestos.push({ x, z, y: alturaEn(x, z) });
  }

  // ── reparto de especie por peso, determinista ─────────────────────────────
  const claves = Object.keys(mezcla);
  const acum = [];
  let s = 0;
  for (const k of claves) { s += mezcla[k]; acum.push([s, k]); }
  const porVariante = new Map();  // `${especie}|${v}` → [{x,y,z,rot,esc}]
  for (const p of puestos) {
    const t = rn() * s;
    let especie = claves[claves.length - 1];
    for (const [lim, k] of acum) if (t <= lim) { especie = k; break; }
    const v = Math.floor(rn() * variantes);
    const key = `${especie}|${v}`;
    if (!porVariante.has(key)) porVariante.set(key, []);
    porVariante.get(key).push({
      ...p, rot: rn() * Math.PI * 2, esc: 0.82 + rn() * 0.36,
    });
  }

  // ── una InstancedMesh por parte de cada variante ──────────────────────────
  const grupo = new THREE.Group();
  grupo.name = 'bosque-frio-andino';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const vPos = new THREE.Vector3(), vEsc = new THREE.Vector3();
  const eje = new THREE.Vector3(0, 1, 0);
  const conteo = {};
  for (const [key, lista] of porVariante) {
    const [especie, v] = key.split('|');
    conteo[especie] = (conteo[especie] ?? 0) + lista.length;
    const { partes } = partesArbolFrio(especie, hash32(`bosque|${especie}|${v}|${seed}`));
    for (const parte of partes) {
      const im = new THREE.InstancedMesh(parte.geo, parte.mat, lista.length);
      im.name = `${key}-${parte.nombre}`;
      for (let i = 0; i < lista.length; i++) {
        const p = lista[i];
        q.setFromAxisAngle(eje, p.rot);
        vPos.set(p.x, p.y, p.z);
        vEsc.setScalar(p.esc);
        m4.compose(vPos, q, vEsc);
        im.setMatrixAt(i, m4);
      }
      im.castShadow = true;
      aplicarVientoSombra(im);
      im.receiveShadow = true;
      im.instanceMatrix.needsUpdate = true;
      grupo.add(im);
    }
  }
  return { grupo, puntos: puestos, conteo };
}
