/**
 * planta.js — geometría procedural + fichas botánicas de la planta hero:
 *   Phaseolus coccineus L. (fríjol ayocote / fríjol trepador andino, familia Fabaceae).
 *   Nombre científico verificado contra el catálogo Chagra (catalog/chagra-catalog-seed-v3.2.json).
 *
 * Cero binarios: todo cilindros / esferas / Shape+ShapeGeometry / TubeGeometry deformados,
 * más CanvasTexture generada en código. Determinista (RNG sembrado, lib3d/core/RNG.js).
 *
 * Reúso: la técnica de tubo curvo (CatmullRom + TubeGeometry) viene del retículo de
 * celula.js; la hoja combada, de plantas-bajas.js. La CÉLULA no se reinventa: la hoja
 * tiene un portal que baja a celula-3d (el sub-nivel más profundo).
 *
 * Exporta:
 *   buildFrijol(rng) -> { grupo, PARTES, planoAltura }
 *     grupo:  THREE.Group con la planta completa (raíz bajo y=0, brote sobre y=0) + tierra en corte.
 *     PARTES: [{ id, nombre, cientifico, tipo, funcion, agro, hotspot:Vec3, camPos:Vec3, camTarget:Vec3, portal? }]
 */

import * as THREE from 'three';
import { Ruido } from '../core/RNG.js';

// ---------- paleta ilustrada Humboldt (saturada, plana, NO fotorrealista) ----------
export const PALETA = {
  tallo: 0x6f9e4b,
  talloOscuro: 0x557a38,
  nudo: 0x4c6f30,
  hoja: 0x4f8f3e,
  hojaEnves: 0x6ba84e,
  vena: 0x2f5c24,
  peciolo: 0x6a9346,
  // flor papilionada roja (coccineus, ornitófila)
  estandarte: 0xd6402e,
  alas: 0xe8654a,
  quilla: 0xf0a24b,
  caliz: 0x5a7d38,
  // fruto (legumbre) + semilla
  vaina: 0x86a94f,
  vainaSutura: 0x5f7d38,
  semillaBase: 0x8f3a26,
  semillaJaspe: 0xe8d3ab,
  cotiledon: 0xf1e4b8,
  embrion: 0xcfe08a,
  // raíz + nódulos + suelo
  raiz: 0xd9c49a,
  raizPunta: 0xe6d9bc,
  nodulo: 0xd98fa0,       // rosado (leghemoglobina de la simbiosis con Rhizobium)
  tierra: 0x6b4c34,
  tierraClara: 0x8a6a4a,
  // tejidos internos (corte anatómico / lámina)
  epidermis: 0x5c8f43,
  cortex: 0xcfe3b8,
  medula: 0xeef2d8,
  xilema: 0xc98a3a,       // ámbar
  floema: 0x7bbf6a,       // verde
};

const _v = new THREE.Vector3();

// ---------- helpers ----------

/** Hoja/folíolo ovado: THREE.Shape apuntada, con leve combado (reúso técnica plantas-bajas). */
function geometriaFoliolo(len = 1, wid = 0.62) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(wid * 0.55, len * 0.12, wid * 0.5, len * 0.72, 0, len);
  s.bezierCurveTo(-wid * 0.5, len * 0.72, -wid * 0.55, len * 0.12, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 16);
  // combado: la punta se curva fuera del plano para que no se lea perfectamente plana
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = len > 0 ? y / len : 0;
    pos.setZ(i, pos.getZ(i) + Math.sin(t * Math.PI) * 0.10 * len);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Pétalo redondeado (estandarte / ala) via Shape. */
function geometriaPetalo(w = 1, h = 1, redondez = 0.9) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(w * 0.6, 0, w * 0.55 * redondez, h, 0, h);
  s.bezierCurveTo(-w * 0.55 * redondez, h, -w * 0.6, 0, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 14);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) - Math.abs(x) * 0.35); // acopado hacia adentro
  }
  geo.computeVertexNormals();
  return geo;
}

/** Textura jaspeada para la semilla (rojo con motas crema) — 100% canvas, sin archivos. */
function texturaSemilla(rng) {
  const s = 128;
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = s;
  const ctx = cnv.getContext('2d');
  ctx.fillStyle = '#8f3a26';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 120; i++) {
    const r = rng.float(1, 6);
    ctx.fillStyle = rng.float(0, 1) > 0.4 ? 'rgba(232,211,171,0.9)' : 'rgba(60,24,14,0.7)';
    ctx.beginPath();
    ctx.arc(rng.float(0, s), rng.float(0, s), r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function matStd(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? 0.82, metalness: 0.0,
    flatShading: opts.flat ?? false,
    side: opts.side ?? THREE.FrontSide,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    depthWrite: opts.depthWrite ?? true,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

// ============================================================
// PARTE: RAÍZ (sistema radicular axonomorfo + nódulos de Rhizobium)
// ============================================================
function construirRaiz(rng, mats) {
  const g = new THREE.Group();
  g.name = 'raiz';

  // raíz principal (pivotante / axonomorfa): tubo que baja curvándose
  const ptsPrinc = [];
  let p = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    p = new THREE.Vector3(
      Math.sin(t * 2.4) * 0.35 * t,
      -t * 4.0,
      Math.cos(t * 1.8) * 0.25 * t
    );
    ptsPrinc.push(p.clone());
  }
  const curvaPrinc = new THREE.CatmullRomCurve3(ptsPrinc);
  const geoPrinc = new THREE.TubeGeometry(curvaPrinc, 48, 0.18, 8, false);
  // afinar el radio hacia la punta manualmente escalando por segmento no es trivial en TubeGeometry;
  // se compensa con la punta cónica y raíces laterales cada vez más finas.
  const raizPrinc = new THREE.Mesh(geoPrinc, mats.raiz);
  g.add(raizPrinc);
  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 8), mats.raizPunta);
  punta.position.copy(curvaPrinc.getPointAt(1));
  punta.rotation.x = Math.PI;
  g.add(punta);

  // raíces laterales: tubos que salen de la principal hacia afuera-abajo
  const lateralesAnclas = [];
  for (let i = 0; i < 7; i++) {
    const t = 0.18 + (i / 7) * 0.72;
    const base = curvaPrinc.getPointAt(t);
    const dir = new THREE.Vector3(
      Math.cos(i * 2.1) * (0.7 + rng.float(0, 0.3)),
      -0.5 - rng.float(0, 0.4),
      Math.sin(i * 2.1) * (0.7 + rng.float(0, 0.3))
    ).normalize();
    const largo = 1.1 + rng.float(0, 0.9);
    const pts = [base.clone()];
    let q = base.clone();
    for (let k = 1; k <= 4; k++) {
      q = q.clone().addScaledVector(dir, largo / 4).add(
        new THREE.Vector3(rng.float(-0.15, 0.15), -rng.float(0, 0.2), rng.float(-0.15, 0.15))
      );
      pts.push(q.clone());
    }
    const curva = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curva, 24, 0.05 + rng.float(0, 0.03), 6, false);
    g.add(new THREE.Mesh(geo, mats.raiz));
    // guardar anclas para nódulos (a lo largo de la lateral)
    for (let k = 1; k <= 3; k++) lateralesAnclas.push(curva.getPointAt(k / 4));
  }

  // nódulos radiculares (simbiosis Rhizobium — fijación de nitrógeno): esferitas rosadas
  const geoNod = new THREE.SphereGeometry(0.09, 8, 6);
  geoNod.scale(1, 0.8, 1);
  for (const a of lateralesAnclas) {
    if (rng.float(0, 1) > 0.45) continue;
    const nod = new THREE.Mesh(geoNod, mats.nodulo);
    nod.position.copy(a).add(new THREE.Vector3(rng.float(-0.08, 0.08), rng.float(-0.05, 0.05), rng.float(-0.08, 0.08)));
    nod.scale.setScalar(0.7 + rng.float(0, 0.7));
    g.add(nod);
  }
  // un racimo de nódulos bien visible cerca de la corona (para el hotspot)
  for (let i = 0; i < 5; i++) {
    const nod = new THREE.Mesh(geoNod, mats.nodulo);
    nod.position.set(0.28 + rng.float(-0.1, 0.1), -0.9 + rng.float(-0.2, 0.2), 0.22 + rng.float(-0.1, 0.1));
    nod.scale.setScalar(0.9 + rng.float(0, 0.5));
    g.add(nod);
  }

  return g;
}

// ============================================================
// PARTE: TALLO (herbáceo voluble) con TEJIDOS INTERNOS para el corte anatómico
// ============================================================
function construirTallo(rng, mats, alturaTallo) {
  const g = new THREE.Group();
  g.name = 'tallo';
  const R = 0.14;               // radio del tallo
  const H = alturaTallo;

  // El tallo se construye como cilindros concéntricos (lámina): al activar el corte
  // (clip-plane), la mitad frontal desaparece y quedan visibles los anillos de tejido:
  // epidermis -> córtex -> anillo de haces vasculares (xilema/floema) -> médula.
  const seg = 20;
  const cyl = (r, h, y, mat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, h, seg, 1, true), mat);
    m.position.y = y;
    return m;
  };
  // epidermis (superficie verde visible del tallo)
  g.add(cyl(R, H, H / 2, mats.epidermis));
  // córtex (verde muy claro, justo debajo de la epidermis)
  g.add(cyl(R * 0.82, H, H / 2, mats.cortex));
  // médula (centro pálido)
  g.add(cyl(R * 0.30, H, H / 2, mats.medula));
  // anillo de haces vasculares: pares xilema(dentro)/floema(fuera) alrededor del eje
  const nHaces = 9;
  for (let i = 0; i < nHaces; i++) {
    const a = (i / nHaces) * Math.PI * 2;
    const rr = R * 0.55;
    const xil = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, H, 6), mats.xilema);
    xil.position.set(Math.cos(a) * rr, H / 2, Math.sin(a) * rr);
    g.add(xil);
    const flo = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, H, 6), mats.floema);
    flo.position.set(Math.cos(a) * (rr + 0.05), H / 2, Math.sin(a) * (rr + 0.05));
    g.add(flo);
  }

  // nudos (engrosamientos donde nacen hojas/flores) — lectura de tallo herbáceo con entrenudos
  const nudosY = [];
  const nNudos = 5;
  for (let i = 0; i < nNudos; i++) {
    const y = 0.7 + (i / (nNudos - 1)) * (H - 1.2);
    nudosY.push(y);
    const nudo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.18, 10, 8), mats.nudo);
    nudo.position.y = y;
    nudo.scale.y = 0.6;
    g.add(nudo);
  }

  g.userData.nudosY = nudosY;
  g.userData.R = R;
  return g;
}

// ============================================================
// PARTE: HOJA (compuesta trifoliada) — pecíolo + 3 folíolos + venas
// ============================================================
function construirHojaTrifoliada(rng, mats, escala = 1) {
  const g = new THREE.Group();
  g.name = 'hoja-unidad';

  // pecíolo
  const peciolo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.9 * escala, 6), mats.peciolo);
  peciolo.rotation.z = -Math.PI / 2.3;
  peciolo.position.set(0.32 * escala, 0.05, 0);
  g.add(peciolo);

  const geoFol = geometriaFoliolo(1.15 * escala, 0.78 * escala);
  const base = new THREE.Vector3(0.65 * escala, 0.28 * escala, 0);
  // 3 folíolos: terminal + 2 laterales
  const disposiciones = [
    { yaw: 0.0, pitch: 0.55, roll: 0.0, adelanta: 0.35 },   // terminal
    { yaw: 0.9, pitch: 0.35, roll: 0.2, adelanta: 0.0 },    // lateral der
    { yaw: -0.9, pitch: 0.35, roll: -0.2, adelanta: 0.0 },  // lateral izq
  ];
  for (const d of disposiciones) {
    const fol = new THREE.Group();
    const cara = new THREE.Mesh(geoFol, mats.hoja);
    fol.add(cara);
    // vena central (nervadura) — línea oscura
    const vena = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.05 * escala, 4), mats.vena);
    vena.position.y = 0.52 * escala;
    fol.add(vena);
    fol.position.copy(base).add(new THREE.Vector3(Math.cos(d.yaw) * d.adelanta, 0, Math.sin(d.yaw) * d.adelanta));
    fol.rotation.order = 'YXZ';
    fol.rotation.y = d.yaw;
    fol.rotation.x = -d.pitch;
    fol.rotation.z = d.roll;
    g.add(fol);
  }
  return g;
}

// ============================================================
// PARTE: FLOR (papilionada / amariposada, roja — ornitófila)
// ============================================================
function construirFlor(rng, mats, escala = 1) {
  const g = new THREE.Group();
  g.name = 'flor-unidad';

  // cáliz (cúpula verde)
  const caliz = new THREE.Mesh(new THREE.SphereGeometry(0.12 * escala, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mats.caliz);
  caliz.rotation.x = Math.PI;
  g.add(caliz);

  // estandarte (pétalo grande superior, erguido y abierto hacia atrás)
  const estGeo = geometriaPetalo(0.5 * escala, 0.6 * escala, 1.05);
  const estandarte = new THREE.Mesh(estGeo, mats.estandarte);
  estandarte.position.set(0, 0.12 * escala, -0.05 * escala);
  estandarte.rotation.x = -0.5;
  g.add(estandarte);

  // alas (2 pétalos laterales)
  const alaGeo = geometriaPetalo(0.28 * escala, 0.42 * escala, 0.8);
  for (const s of [1, -1]) {
    const ala = new THREE.Mesh(alaGeo, mats.alas);
    ala.position.set(0.14 * escala * s, 0.05 * escala, 0.12 * escala);
    ala.rotation.z = -0.5 * s;
    ala.rotation.x = 0.3;
    ala.rotation.y = 0.4 * s;
    g.add(ala);
  }

  // quilla (carena: 2 pétalos fusionados en forma de bote que envuelven estambres/pistilo)
  const quillaGeo = new THREE.CapsuleGeometry(0.08 * escala, 0.22 * escala, 4, 8);
  const quilla = new THREE.Mesh(quillaGeo, mats.quilla);
  quilla.rotation.z = Math.PI / 2;
  quilla.rotation.y = 0.2;
  quilla.position.set(0, 0.0, 0.22 * escala);
  quilla.scale.set(1, 1, 0.7);
  g.add(quilla);

  return g;
}

// ============================================================
// PARTE: FRUTO (legumbre / vaina dehiscente) + PARTE: SEMILLA (con corte)
// ============================================================
function construirVaina(rng, mats, escala = 1) {
  const g = new THREE.Group();
  g.name = 'fruto-unidad';
  // vaina: cápsula alargada y ligeramente curva con abultamientos donde van las semillas
  const largo = 1.5 * escala;
  const geo = new THREE.CapsuleGeometry(0.12 * escala, largo, 6, 12);
  // abultar por semilla: onda sobre el eje
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    const bulge = 1 + Math.cos(_v.y * 6) * 0.16;
    _v.x *= bulge; _v.z *= bulge * 0.85;
    pos.setXYZ(i, _v.x, _v.y, _v.z);
  }
  geo.computeVertexNormals();
  const vaina = new THREE.Mesh(geo, mats.vaina);
  vaina.rotation.z = 0.35;
  g.add(vaina);
  // sutura (línea de dehiscencia por donde se abre la legumbre)
  const sut = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, largo * 1.1, 4), mats.vainaSutura);
  sut.position.set(0.11 * escala, 0, 0);
  sut.rotation.z = 0.35;
  g.add(sut);
  return g;
}

function construirSemilla(rng, mats, escala = 1) {
  const g = new THREE.Group();
  g.name = 'semilla-unidad';

  // --- semilla entera (reniforme, jaspeada) ---
  const entera = new THREE.Group();
  const geoS = new THREE.SphereGeometry(0.5 * escala, 20, 16);
  const ps = geoS.attributes.position;
  for (let i = 0; i < ps.count; i++) {
    _v.fromBufferAttribute(ps, i);
    _v.x *= 1.35; _v.z *= 0.8;                 // alargada y aplanada
    if (_v.x < 0) _v.y *= 1 - 0.25 * (-_v.x);  // muesca del hilo (forma de riñón)
    ps.setXYZ(i, _v.x, _v.y, _v.z);
  }
  geoS.computeVertexNormals();
  const cuerpo = new THREE.Mesh(geoS, mats.semilla);
  entera.add(cuerpo);
  // hilo (cicatriz funicular) — línea clara en la muesca
  const hilo = new THREE.Mesh(new THREE.CapsuleGeometry(0.03 * escala, 0.28 * escala, 3, 6), matStd(0x3a2016));
  hilo.rotation.x = Math.PI / 2;
  hilo.position.set(-0.62 * escala, 0, 0.02);
  entera.add(hilo);
  entera.position.set(-0.55 * escala, 0, 0);
  g.add(entera);

  // --- semilla en corte (lámina): testa + 2 cotiledones + embrión (plúmula/radícula) ---
  const corte = new THREE.Group();
  // testa (media cáscara)
  const testaGeo = new THREE.SphereGeometry(0.5 * escala, 20, 16, 0, Math.PI);
  const pt = testaGeo.attributes.position;
  for (let i = 0; i < pt.count; i++) {
    _v.fromBufferAttribute(pt, i);
    _v.x *= 1.35; _v.z *= 0.8;
    pt.setXYZ(i, _v.x, _v.y, _v.z);
  }
  testaGeo.computeVertexNormals();
  const testa = new THREE.Mesh(testaGeo, matStd(PALETA.semillaBase, { side: THREE.DoubleSide, roughness: 0.7 }));
  corte.add(testa);
  // cotiledones (2 mitades carnosas amarillas — reserva del embrión)
  for (const s of [1, -1]) {
    const cot = new THREE.Mesh(new THREE.SphereGeometry(0.42 * escala, 16, 12, 0, Math.PI), mats.cotiledon);
    cot.scale.set(1.25, 1, 0.34);
    cot.position.z = 0.12 * escala * s;
    cot.rotation.y = s > 0 ? 0 : Math.PI;
    corte.add(cot);
  }
  // embrión: radícula (baja) + plúmula (sube) en forma de gancho
  const embPts = [
    new THREE.Vector3(-0.3 * escala, -0.25 * escala, 0),
    new THREE.Vector3(-0.1 * escala, -0.05 * escala, 0),
    new THREE.Vector3(0.05 * escala, 0.18 * escala, 0),
    new THREE.Vector3(0.12 * escala, 0.42 * escala, 0),
  ];
  const embGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(embPts), 20, 0.05 * escala, 6, false);
  corte.add(new THREE.Mesh(embGeo, mats.embrion));
  corte.position.set(0.75 * escala, 0, 0);
  corte.rotation.y = -0.5;
  g.add(corte);

  return g;
}

// ============================================================
// MEDALLÓN DE CORTE ANATÓMICO — inset tipo lámina del corte transversal del tallo.
// Devuelve un <canvas> (crisp) con los anillos de tejido rotulados, que main.js coloca
// como recuadro fijo en pantalla al activar el corte (como el detalle de una plancha botánica).
// ============================================================
export function dibujarCorteCanvas() {
  const s = 512;
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = s;
  const ctx = cnv.getContext('2d');
  const cx = s / 2, cy = s / 2 + 12;
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');

  // fondo tipo papel con viñeta suave
  ctx.fillStyle = 'rgba(255,253,245,0.94)';
  ctx.beginPath(); ctx.arc(cx, cy - 12, s * 0.47, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = hex(PALETA.borde ?? 0xb89a4e); ctx.stroke();

  const R = 150;
  const anillo = (r, color, w) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); if (w) { ctx.lineWidth = w; ctx.strokeStyle = 'rgba(60,50,30,0.35)'; ctx.stroke(); } };
  anillo(R, hex(PALETA.epidermis), 4);       // epidermis (borde)
  anillo(R * 0.9, hex(PALETA.cortex), 0);     // córtex
  anillo(R * 0.42, hex(PALETA.medula), 0);    // médula (centro)

  // anillo de haces vasculares: xilema (interior, ámbar) + floema (exterior, verde)
  const nH = 9;
  for (let i = 0; i < nH; i++) {
    const a = (i / nH) * Math.PI * 2 - Math.PI / 2;
    const rx = R * 0.60, rf = R * 0.72;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rx, cy + Math.sin(a) * rx, 12, 0, Math.PI * 2);
    ctx.fillStyle = hex(PALETA.xilema); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rf, cy + Math.sin(a) * rf, 8, 0, Math.PI * 2);
    ctx.fillStyle = hex(PALETA.floema); ctx.fill();
  }

  // rótulos
  ctx.fillStyle = '#2b2416';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Corte del tallo', cx, 46);
  ctx.font = '20px Georgia, serif';
  ctx.textAlign = 'left';
  const leyenda = [
    [PALETA.epidermis, 'Epidermis'],
    [PALETA.cortex, 'Córtex'],
    [PALETA.xilema, 'Xilema (sube agua)'],
    [PALETA.floema, 'Floema (reparte azúcar)'],
    [PALETA.medula, 'Médula'],
  ];
  leyenda.forEach(([col, txt], i) => {
    const y = s - 118 + i * 24;
    ctx.fillStyle = hex(col); ctx.fillRect(24, y - 13, 16, 16);
    ctx.strokeStyle = 'rgba(60,50,30,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(24, y - 13, 16, 16);
    ctx.fillStyle = '#2b2416'; ctx.fillText(txt, 48, y);
  });

  return cnv;
}

// ============================================================
// FICHAS BOTÁNICAS (biología real + anclaje agro = el diferencial Chagra)
// ============================================================
const FICHAS = {
  raiz: {
    nombre: 'Raíz',
    cientifico: 'Sistema radicular axonomorfo · nódulos con Rhizobium',
    tipo: 'Órgano subterráneo',
    funcion: 'Ancla la planta y absorbe agua y minerales. La raíz principal (pivotante) manda hacia abajo; las laterales exploran los lados. Las bolitas rosadas son nódulos: casa de bacterias Rhizobium que fijan nitrógeno del aire.',
    agro: 'Por eso el fríjol "abona" el suelo: la simbiosis con Rhizobium convierte nitrógeno del aire en alimento para la planta y deja el terreno más fértil para el cultivo siguiente. Es la base agronómica de rotar y asociar leguminosas en la chagra.',
  },
  tallo: {
    nombre: 'Tallo',
    cientifico: 'Tallo herbáceo voluble · haces vasculares (xilema / floema)',
    tipo: 'Eje de sostén y transporte',
    funcion: 'Sostiene hojas, flores y frutos, y es la autopista de la savia. Al hacer el corte anatómico se ven los anillos: epidermis por fuera, córtex, el anillo de haces vasculares (xilema en ámbar sube agua; floema en verde reparte azúcares) y la médula al centro.',
    agro: 'El fríjol ayocote es trepador (voluble): en el sistema milpa se enreda en el maíz, que le sirve de tutor vivo. Entender el tallo explica por qué necesita un soporte y cómo circula lo que la hoja fabrica.',
  },
  hoja: {
    nombre: 'Hoja',
    cientifico: 'Hoja compuesta trifoliada (3 folíolos, pecíolo, estípulas)',
    tipo: 'Órgano de la fotosíntesis',
    funcion: 'La cocina de la planta: con luz, agua y CO₂ fabrica azúcares y libera oxígeno. En el fríjol es compuesta trifoliada (tres folíolos por hoja), rasgo típico de las Fabaceae. Dentro de cada folíolo, el mesófilo está lleno de células con cloroplastos.',
    agro: 'Aquí empieza todo el alimento del cultivo. Menos luz = menos fotosíntesis = menos cosecha. Y si baja hasta la célula, verá dónde vive exactamente la fotosíntesis: el cloroplasto.',
    portal: true,
  },
  flor: {
    nombre: 'Flor',
    cientifico: 'Flor papilionada (estandarte, alas, quilla)',
    tipo: 'Órgano reproductor',
    funcion: 'Estructura papilionada (de "mariposa"): un pétalo grande erguido (estandarte), dos laterales (alas) y dos fusionados en forma de bote (quilla) que guardan estambres y pistilo. En Phaseolus coccineus es roja y vistosa.',
    agro: 'Esa flor roja no es casualidad: el fríjol ayocote es ornitófilo, lo polinizan colibríes. La flor es la promesa de la cosecha —sin polinización no hay vaina— por eso cuidar polinizadores es cuidar el cultivo.',
  },
  fruto: {
    nombre: 'Fruto',
    cientifico: 'Legumbre (vaina dehiscente por dos valvas)',
    tipo: 'Fruto que protege las semillas',
    funcion: 'El fruto de las Fabaceae es la legumbre: una vaina que se abre por dos valvas (dehiscente) para liberar las semillas. Los abultamientos marcan dónde madura cada grano en su interior.',
    agro: 'La vaina es lo que se cosecha: verde para comer tierna, o seca para desgranar el fríjol. Saber que el fruto viene de la flor fecundada conecta polinización, cuido y cosecha en una sola historia.',
  },
  semilla: {
    nombre: 'Semilla',
    cientifico: 'Semilla exalbuminada (testa, hilo, cotiledones, embrión)',
    tipo: 'La planta futura, empacada',
    funcion: 'Dentro de la testa (cáscara) van dos cotiledones carnosos —la despensa de reservas— y el embrión: radícula (futura raíz) y plúmula (futuro tallo). El hilo es la cicatriz por donde estuvo unida a la vaina.',
    agro: 'Guardar semilla es guardar la próxima siembra: los cotiledones alimentan a la plántula hasta que la hoja aprende a fotosintetizar. La custodia campesina de semillas de Phaseolus conserva variedades que el mercado olvidó.',
  },
};

// ============================================================
// ENSAMBLE
// ============================================================
export function buildFrijol(rng) {
  const grupo = new THREE.Group();
  grupo.name = 'frijol-coccineus';

  // materiales (compartidos; DoubleSide donde importa para que el corte se lea)
  const mats = {
    raiz: matStd(PALETA.raiz, { roughness: 0.9 }),
    raizPunta: matStd(PALETA.raizPunta, { roughness: 0.9 }),
    nodulo: matStd(PALETA.nodulo, { roughness: 0.6, emissive: 0x5a2030, emissiveIntensity: 0.12 }),
    epidermis: matStd(PALETA.epidermis, { side: THREE.DoubleSide, roughness: 0.75 }),
    cortex: matStd(PALETA.cortex, { side: THREE.DoubleSide, roughness: 0.85 }),
    medula: matStd(PALETA.medula, { side: THREE.DoubleSide, roughness: 0.9 }),
    xilema: matStd(PALETA.xilema, { roughness: 0.6 }),
    floema: matStd(PALETA.floema, { roughness: 0.6 }),
    nudo: matStd(PALETA.nudo, { roughness: 0.7 }),
    hoja: matStd(PALETA.hoja, { side: THREE.DoubleSide, roughness: 0.7 }),
    vena: matStd(PALETA.vena, { roughness: 0.6 }),
    peciolo: matStd(PALETA.peciolo, { roughness: 0.7 }),
    estandarte: matStd(PALETA.estandarte, { side: THREE.DoubleSide, roughness: 0.55 }),
    alas: matStd(PALETA.alas, { side: THREE.DoubleSide, roughness: 0.55 }),
    quilla: matStd(PALETA.quilla, { roughness: 0.5 }),
    caliz: matStd(PALETA.caliz, { side: THREE.DoubleSide, roughness: 0.7 }),
    vaina: matStd(PALETA.vaina, { roughness: 0.6 }),
    vainaSutura: matStd(PALETA.vainaSutura, { roughness: 0.6 }),
    semilla: new THREE.MeshStandardMaterial({ map: texturaSemilla(rng), roughness: 0.55 }),
    cotiledon: matStd(PALETA.cotiledon, { side: THREE.DoubleSide, roughness: 0.7 }),
    embrion: matStd(PALETA.embrion, { roughness: 0.6 }),
  };

  const H = 5.6; // altura del tallo

  // --- línea de suelo (lámina): la raíz queda EXPUESTA bajo y=0 contra el papel (como una
  //     plancha botánica), no enterrada en un volumen opaco. Solo una fina banda de tierra en
  //     la superficie marca "aquí empieza lo subterráneo". ---
  const tierra = new THREE.Group();
  // disco de superficie del suelo, translúcido y con textura de tierra
  const superficie = new THREE.Mesh(
    new THREE.CircleGeometry(2.9, 48),
    matStd(PALETA.tierraClara, { side: THREE.DoubleSide, roughness: 1, transparent: true, opacity: 0.85 })
  );
  superficie.rotation.x = -Math.PI / 2;
  superficie.position.y = 0.0;
  tierra.add(superficie);
  // reborde/labio de tierra (toroide bajo el disco) para dar volumen a la "cama" del cultivo
  const labio = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.16, 8, 48), matStd(PALETA.tierra, { roughness: 1 }));
  labio.rotation.x = Math.PI / 2;
  labio.position.y = -0.05;
  tierra.add(labio);
  grupo.add(tierra);

  // --- raíz ---
  const raiz = construirRaiz(rng, mats);
  grupo.add(raiz);

  // --- tallo (con tejidos internos) ---
  const tallo = construirTallo(rng, mats, H);
  grupo.add(tallo);
  const nudosY = tallo.userData.nudosY;

  // --- hojas trifoliadas en los nudos (alternas) ---
  let hojaHero = null;
  nudosY.forEach((y, i) => {
    const hoja = construirHojaTrifoliada(rng, mats, i === 2 ? 1.15 : 0.95);
    const yaw = i * 2.3;
    hoja.position.set(Math.cos(yaw) * 0.12, y, Math.sin(yaw) * 0.12);
    hoja.rotation.y = yaw;
    grupo.add(hoja);
    if (i === 2) hojaHero = hoja; // hoja protagonista (con hotspot + portal a la célula)
  });

  // --- inflorescencia: racimo de flores cerca de la parte alta ---
  const florYaw = 1.1;
  const florBaseY = nudosY[nudosY.length - 1] + 0.15;
  const rama = new THREE.Group();
  rama.position.set(Math.cos(florYaw) * 0.14, florBaseY, Math.sin(florYaw) * 0.14);
  rama.rotation.y = florYaw;
  // pedúnculo
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 6), mats.peciolo);
  ped.rotation.z = -0.6;
  ped.position.set(0.4, 0.35, 0);
  rama.add(ped);
  const posicionesFlor = [
    new THREE.Vector3(0.75, 0.7, 0.05),
    new THREE.Vector3(0.6, 0.5, -0.18),
    new THREE.Vector3(0.85, 0.45, 0.2),
  ];
  posicionesFlor.forEach((p, i) => {
    const flor = construirFlor(rng, mats, i === 0 ? 1.1 : 0.85);
    flor.position.copy(p);
    flor.rotation.y = -0.6 + i * 0.5;
    flor.rotation.x = -0.3;
    rama.add(flor);
  });
  grupo.add(rama);
  const florWorld = rama.localToWorld(posicionesFlor[0].clone());

  // --- fruto (vaina) colgando en espacio abierto por delante-derecha, silueteada contra el
  //     papel (así no se camufla contra el tallo/hojas verdes) ---
  const vaina = construirVaina(rng, mats, 1.1);
  const nudoVainaY = nudosY[nudosY.length - 2]; // ~4.0
  vaina.position.set(1.25, 3.15, 1.1);
  vaina.rotation.y = -0.55;
  vaina.rotation.x = 0.4;
  vaina.rotation.z = -0.55;
  grupo.add(vaina);
  // pedicelo que une la vaina al nudo del tallo
  const pedic = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.3, 5), mats.peciolo);
  pedic.position.set(0.72, 3.75, 0.66);
  pedic.rotation.z = -0.75; pedic.rotation.x = 0.62;
  grupo.add(pedic);

  // --- semilla (entera + en corte), en primer plano sobre una tarima ilustrada, a un lado ---
  const semilla = construirSemilla(rng, mats, 1.0);
  semilla.position.set(2.6, 0.7, 1.4);
  semilla.rotation.y = -0.5;
  grupo.add(semilla);
  // tarima/etiqueta de la semilla (pequeño disco tipo lámina)
  const tarima = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.08, 32), matStd(0xe8dcc0, { roughness: 1 }));
  tarima.position.set(2.6, 0.14, 1.4);
  grupo.add(tarima);

  // ---------- posiciones de hotspot + cámara por parte ----------
  const hojaWorld = hojaHero.localToWorld(new THREE.Vector3(0.9, 0.35, 0));
  const PARTES = [
    { id: 'raiz', ...FICHAS.raiz,
      hotspot: new THREE.Vector3(0.35, -1.0, 0.3),
      camPos: new THREE.Vector3(3.4, -0.6, 3.4), camTarget: new THREE.Vector3(0.2, -1.6, 0.2) },
    { id: 'tallo', ...FICHAS.tallo,
      hotspot: new THREE.Vector3(0.16, 2.4, 0.05),
      camPos: new THREE.Vector3(2.6, 2.6, 2.6), camTarget: new THREE.Vector3(0, 2.4, 0) },
    { id: 'hoja', ...FICHAS.hoja,
      hotspot: hojaWorld,
      camPos: hojaWorld.clone().add(new THREE.Vector3(1.6, 0.6, 2.2)), camTarget: hojaWorld.clone() },
    { id: 'flor', ...FICHAS.flor,
      hotspot: florWorld,
      camPos: florWorld.clone().add(new THREE.Vector3(1.8, 0.4, 2.2)), camTarget: florWorld.clone() },
    { id: 'fruto', ...FICHAS.fruto,
      hotspot: new THREE.Vector3(1.45, 3.0, 1.28),
      camPos: new THREE.Vector3(4.0, 3.5, 3.6), camTarget: new THREE.Vector3(1.2, 2.85, 1.05) },
    { id: 'semilla', ...FICHAS.semilla,
      hotspot: new THREE.Vector3(2.6, 1.2, 1.4),
      camPos: new THREE.Vector3(4.6, 2.0, 3.6), camTarget: new THREE.Vector3(2.6, 0.8, 1.4) },
  ];

  grupo.userData.PARTES = PARTES;
  return { grupo, PARTES, alturaTallo: H };
}
