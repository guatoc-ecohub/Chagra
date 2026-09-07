/* ─────────────────────────────────────────────────────────────────────────────
 * COPIA VERBATIM VENDORIZADA — NO EDITAR A MANO.
 *
 * Original: `~/demos/3d/lib3d/flora/frailejonFabrica.js` (valle). Se trae al bundle
 * de la PWA para el descenso por la Sierra.
 *
 * Licencia: MIT (Sylva / Token-Gremlin), notice completo al pie del archivo.
 * ───────────────────────────────────────────────────────────────────────────── */
/* eslint-disable */
/* ── INICIO COPIA VERBATIM ── */
/*
 * frailejonFabrica.js — generador de la categoría "roseta caulescente" (frailejón / Espeletia).
 * Propio (Chagra). Fuente: ~/demos-scratch/paramo-flora-proto/. Aprobado 8/10 en gate visual.
 * Es el generador de forma que ez-tree/ArbolFabrica NO cubren (Espeletia no es árbol de copa:
 * tronco columnar + enagua de hojas marcescentes + roseta apical plateada + candelabro en killipii).
 * 6 especies (grandiflora, argentea, killipii, lopezii, pycnophylla, uribei) con LOD
 * (detalle / simplificado / billboard canvas). Determinista por `hash(especie:seed)`.
 * Exporta buildFrailejon(especie, seed) → THREE.LOD · FRAILEJONES (keys) · frailejonSpec(key).
 * Import: `three` (bare specifier, resuelto por importmap — igual que flora/ez-tree).
 * Ver ARQUITECTURA-PLANTAS-UNIFICADA.md (categoría "roseta caulescente").
 */
import * as THREE from 'three';
import { aplicarVientoMundo, asegurarRelojViento } from './vientoMundos.js';
import { aplicarBacklight } from './FollajeMasa.js';

// ── viento coherente del frailejonal (encargo flora-viento 2026-08-11) ────────
// La hoja de roseta/enagua crece a lo largo de +X LOCAL (makeLeafGeo rota el
// cilindro con rotateZ y lo corre translate(len*0.5, 0, 0)), así que el peso
// del meneo va por `ejePeso: [1,0,0]`: base pegada a la roseta quieta, punta
// que cabecea. Amplitudes CONTENIDAS a propósito: la hoja de Espeletia es
// gruesa y rígida — cabecea, no ondea como pasto. El tronco y el cogollo NO se
// parchean (no hay frailejón que se doble por el tronco).
function vientoHojaRoseta(mat, len) {
  return aplicarVientoMundo(mat, {
    amplitud: 0.05, piso: len * 0.3, velocidad: 1.1, ejePeso: [1, 0, 0],
  });
}
function vientoHojaEnagua(mat, len) {
  return aplicarVientoMundo(mat, {
    amplitud: 0.03, piso: len * 0.25, velocidad: 0.9, ejePeso: [1, 0, 0],
  });
}

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _m = new THREE.Matrix4();

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const SPECIES = {
  grandiflora: {
    scientific: 'Espeletia grandiflora Humb. & Bonpl.',
    common: 'Frailejon mayor',
    height: 3.45,
    trunk: { h: 2.35, r0: 0.25, r1: 0.16 },
    skirt: { bands: 3, leaves: 14, len: 0.95, width: 0.18, brown: 0x847054 },
    rosette: { layers: 4, leaves: 16, len: 1.38, width: 0.27, tilt: 0.98, silver: 0xc8d2bd },
    branching: false,
    flowers: true,
    tag: 'unicaule grande',
    pisoTermico: ['paramo'],
  },
  argentea: {
    scientific: 'Espeletia argentea Bonpl. & Humb.',
    common: 'Frailejon plateado',
    height: 3.05,
    trunk: { h: 2.05, r0: 0.22, r1: 0.15 },
    skirt: { bands: 3, leaves: 12, len: 0.88, width: 0.16, brown: 0x8b785d },
    rosette: { layers: 4, leaves: 15, len: 1.28, width: 0.25, tilt: 1.02, silver: 0xd6dece },
    branching: false,
    flowers: false,
    tag: 'plateado, mas brillante',
    pisoTermico: ['paramo'],
  },
  killipii: {
    scientific: 'Espeletia killipii Cuatrec.',
    common: 'Frailejon Killip',
    height: 3.0,
    trunk: { h: 1.9, r0: 0.24, r1: 0.16 },
    skirt: { bands: 3, leaves: 12, len: 0.9, width: 0.17, brown: 0x7b6650 },
    rosette: { layers: 4, leaves: 14, len: 1.18, width: 0.24, tilt: 0.96, silver: 0xc7cfb9 },
    branching: true,
    branchCount: 3,
    branchBase: 0.62,
    branchSpread: 0.42,
    flowers: true,
    tag: 'candelabro',
    pisoTermico: ['paramo'],
  },
  lopezii: {
    scientific: 'Espeletia lopezii Cuatrec.',
    common: 'Frailejon de Lopez',
    height: 2.55,
    trunk: { h: 1.65, r0: 0.21, r1: 0.13 },
    skirt: { bands: 3, leaves: 11, len: 0.84, width: 0.16, brown: 0x837055 },
    rosette: { layers: 4, leaves: 15, len: 1.12, width: 0.23, tilt: 1.06, silver: 0xd0d9c9 },
    branching: false,
    flowers: false,
    tag: 'altoandino extremo',
    pisoTermico: ['paramo'],
  },
  pycnophylla: {
    scientific: 'Espeletia pycnophylla Cuatrec.',
    common: 'Frailejon de Narino',
    height: 2.35,
    trunk: { h: 1.6, r0: 0.2, r1: 0.13 },
    skirt: { bands: 4, leaves: 14, len: 0.8, width: 0.15, brown: 0x7d6a51 },
    rosette: { layers: 4, leaves: 18, len: 1.04, width: 0.22, tilt: 1.08, silver: 0xd6ddd2 },
    branching: false,
    flowers: true,
    tag: 'roseta mas densa',
    pisoTermico: ['paramo'],
  },
  uribei: {
    scientific: 'Espeletia uribei Cuatrec.',
    common: 'Frailejon de Uribe',
    height: 2.6,
    trunk: { h: 1.72, r0: 0.2, r1: 0.13 },
    skirt: { bands: 3, leaves: 12, len: 0.86, width: 0.16, brown: 0x816d54 },
    rosette: { layers: 4, leaves: 15, len: 1.14, width: 0.23, tilt: 1.02, silver: 0xcfd8c7 },
    branching: false,
    flowers: true,
    tag: 'Sumapaz lento',
    pisoTermico: ['paramo'],
  },
};

function leafMaterial(tone, silver = 0xcad2c1, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({
    color: tone,
    roughness,
    metalness: 0.02,
    emissive: silver,
    emissiveIntensity: 0.06,
    flatShading: true,
  });
}

function makeLeafGeo(len, width) {
  const geo = new THREE.CylinderGeometry(width * 0.04, width * 0.44, len, 7, 1, false);
  geo.rotateZ(-Math.PI / 2);
  geo.translate(len * 0.5, 0, 0);
  return geo;
}

function makeSkirtLeafGeo(len, width) {
  const geo = new THREE.CylinderGeometry(width * 0.06, width * 0.36, len, 7, 1, false);
  geo.rotateZ(-Math.PI / 2);
  geo.translate(len * 0.5, 0, 0);
  return geo;
}

function makeTrunkGeo(cfg) {
  const geo = new THREE.CylinderGeometry(cfg.r0, cfg.r1, cfg.h, 8, 1, false);
  geo.translate(0, cfg.h * 0.5, 0);
  return geo;
}

function makeBudGeo(scale = 0.22) {
  const geo = new THREE.IcosahedronGeometry(scale, 0);
  geo.scale(1, 1.25, 1);
  return geo;
}

function addSkirt(group, cfg, seed) {
  const rand = rng(seed);
  const mat = vientoHojaEnagua(leafMaterial(cfg.skirt.brown, 0x8e7a5a, 0.96), cfg.skirt.len);
  const geo = makeSkirtLeafGeo(cfg.skirt.len, cfg.skirt.width);
  for (let band = 0; band < cfg.skirt.bands; band++) {
    const y = 0.22 + band * (cfg.trunk.h / (cfg.skirt.bands + 0.5));
    const n = cfg.skirt.leaves + band * 2;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rand() * 0.28;
      const leaf = new THREE.Mesh(geo, mat);
      const len = cfg.skirt.len * (0.85 + rand() * 0.3);
      leaf.scale.setScalar(0.82 + rand() * 0.24);
      leaf.position.set(Math.cos(ang) * (0.15 + rand() * 0.08), y + rand() * 0.18, Math.sin(ang) * (0.15 + rand() * 0.08));
      leaf.rotation.y = ang;
      leaf.rotation.z = 0.65 + rand() * 0.32;
      leaf.rotation.x = (rand() - 0.5) * 0.12;
      leaf.scale.x = len / cfg.skirt.len;
      group.add(leaf);
    }
  }
}

function addRosette(group, cfg, seed, silverOverride) {
  const rand = rng(seed);
  const bud = new THREE.Mesh(makeBudGeo(0.2 * cfg.rosette.width), leafMaterial(0xb8c6ad, 0xd8dfd0, 0.78));
  bud.position.y = cfg.trunk.h + 0.1;
  group.add(bud);
  const leafGeo = makeLeafGeo(cfg.rosette.len, cfg.rosette.width);
  const mat = vientoHojaRoseta(
    leafMaterial(silverOverride || cfg.rosette.silver, silverOverride || cfg.rosette.silver, cfg.branching ? 0.88 : 0.82),
    cfg.rosette.len
  );
  // backlight suave: la hoja plateada y pubescente de Espeletia a contraluz se
  // enciende — mismo 3-factores de FollajeMasa, fuerza contenida.
  aplicarBacklight(THREE, mat, { fuerza: 0.22, color: '#e9f0d8', potencia: 3 });
  const layers = cfg.rosette.layers;
  for (let layer = 0; layer < layers; layer++) {
    const count = cfg.rosette.leaves + layer * 4 + (layer % 2 ? 2 : 0);
    const y = cfg.trunk.h + 0.04 + layer * 0.07;
    const lenMul = 1 - layer * 0.14;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + layer * 0.18 + rand() * 0.18;
      const leaf = new THREE.Mesh(leafGeo, mat);
      leaf.scale.setScalar(0.95 + rand() * 0.12);
      leaf.position.set(Math.cos(ang) * (0.06 + layer * 0.03), y, Math.sin(ang) * (0.06 + layer * 0.03));
      leaf.rotation.y = ang;
      leaf.rotation.z = -1.1 + cfg.rosette.tilt * 0.68 + rand() * 0.08;
      leaf.rotation.x = (rand() - 0.5) * 0.2;
      leaf.scale.x *= lenMul;
      group.add(leaf);
    }
  }
  const fillerCount = Math.floor(cfg.rosette.leaves * 0.5);
  for (let i = 0; i < fillerCount; i++) {
    const ang = (i / fillerCount) * Math.PI * 2 + 0.37 + rand() * 0.25;
    const y = cfg.trunk.h + 0.10 + rand() * (layers * 0.06);
    const leaf = new THREE.Mesh(leafGeo, mat);
    leaf.scale.setScalar(0.72 + rand() * 0.18);
    leaf.position.set(Math.cos(ang) * (0.08 + rand() * 0.04), y, Math.sin(ang) * (0.08 + rand() * 0.04));
    leaf.rotation.y = ang;
    leaf.rotation.z = -1.1 + cfg.rosette.tilt * 0.68 + rand() * 0.1;
    leaf.rotation.x = (rand() - 0.5) * 0.15;
    leaf.scale.x *= 0.85;
    group.add(leaf);
  }
  if (cfg.flowers) {
    const stalkGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.9, 5);
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x95a07d, roughness: 0.88, flatShading: true });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xe7d04e, roughness: 0.7, emissive: 0x7a6110, emissiveIntensity: 0.15, flatShading: true });
    const stalk = new THREE.Mesh(stalkGeo, stalkMat);
    stalk.position.set(0.18, cfg.trunk.h + 0.75, -0.02);
    stalk.rotation.z = -0.26;
    group.add(stalk);
    const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), flowerMat);
    cap.position.set(0.32, cfg.trunk.h + 1.05, -0.02);
    group.add(cap);
    const cap2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 0), flowerMat);
    cap2.position.set(0.44, cfg.trunk.h + 0.92, 0.05);
    group.add(cap2);
  }
}

function makeTrunkGroup(cfg, seed, branchMode = false) {
  const rand = rng(seed);
  const group = new THREE.Group();
  const trunkMat = leafMaterial(0x5f4d39, 0x5f4d39, 0.96);
  const trunkGeo = makeTrunkGeo(cfg.trunk);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  group.add(trunk);
  addSkirt(group, cfg, seed ^ 0x9e3779b9);
  addRosette(group, cfg, seed ^ 0x51ed1ce, cfg.rosette.silver);

  if (branchMode && cfg.branching) {
    const branchGeo = new THREE.CylinderGeometry(cfg.trunk.r0 * 0.82, cfg.trunk.r1 * 0.62, cfg.trunk.h * 0.72, 6, 1, false);
    branchGeo.translate(0, cfg.trunk.h * 0.36, 0);
    for (let i = 0; i < cfg.branchCount; i++) {
      const branch = new THREE.Group();
      const stem = new THREE.Mesh(branchGeo, trunkMat);
      branch.add(stem);
      const ang = (i / cfg.branchCount) * Math.PI * 2 + rand() * 0.25;
      branch.position.set(Math.cos(ang) * 0.16, cfg.branchBase + rand() * 0.1, Math.sin(ang) * 0.16);
      branch.rotation.y = ang;
      branch.rotation.z = -0.28 + rand() * 0.16;
      branch.scale.setScalar(0.8 + rand() * 0.15);
      addSkirt(branch, {
        trunk: { h: cfg.trunk.h * 0.72 },
        skirt: {
          bands: 2,
          leaves: Math.max(6, cfg.skirt.leaves - 3),
          len: cfg.skirt.len * 0.76,
          width: cfg.skirt.width * 0.86,
          brown: cfg.skirt.brown,
        },
        rosette: {
          layers: 2,
          leaves: Math.max(6, cfg.rosette.leaves - 2),
          len: cfg.rosette.len * 0.74,
          width: cfg.rosette.width * 0.8,
          tilt: cfg.rosette.tilt,
          silver: cfg.rosette.silver,
        },
        flowers: false,
      }, seed + i * 17);
      addRosette(branch, {
        trunk: { h: cfg.trunk.h * 0.72 },
        rosette: {
          layers: 2,
          leaves: Math.max(6, cfg.rosette.leaves - 2),
          len: cfg.rosette.len * 0.78,
          width: cfg.rosette.width * 0.82,
          tilt: cfg.rosette.tilt,
          silver: cfg.rosette.silver,
        },
        flowers: false,
      }, seed + i * 31, cfg.rosette.silver);
      group.add(branch);
    }
  }

  return group;
}

function makeSimplified(cfg, seed) {
  const group = new THREE.Group();
  const trunkMat = leafMaterial(0x62513d, 0x62513d, 0.95);
  const trunk = new THREE.Mesh(makeTrunkGeo(cfg.trunk), trunkMat);
  group.add(trunk);
  const rosetteGeo = makeLeafGeo(cfg.rosette.len * 0.92, cfg.rosette.width * 0.92);
  const rosetteMat = vientoHojaRoseta(leafMaterial(cfg.rosette.silver, cfg.rosette.silver, 0.84), cfg.rosette.len * 0.92);
  const rand = rng(seed);
  const count = Math.max(12, cfg.rosette.leaves + 1);
  for (let i = 0; i < count; i++) {
    const leaf = new THREE.Mesh(rosetteGeo, rosetteMat);
    const ang = (i / count) * Math.PI * 2 + rand() * 0.2;
    leaf.position.set(Math.cos(ang) * 0.08, cfg.trunk.h + 0.03, Math.sin(ang) * 0.08);
    leaf.rotation.y = ang;
    leaf.rotation.z = -1.1 + cfg.rosette.tilt * 0.66;
    leaf.scale.x = 0.92;
    group.add(leaf);
  }
  for (let i = 0; i < 6; i++) {
    const ang = rand() * Math.PI * 2;
    const leaf = new THREE.Mesh(rosetteGeo, rosetteMat);
    leaf.scale.setScalar(0.7 + rand() * 0.15);
    leaf.position.set(Math.cos(ang) * 0.06, cfg.trunk.h + 0.06 + rand() * 0.04, Math.sin(ang) * 0.06);
    leaf.rotation.y = ang;
    leaf.rotation.z = -1.1 + cfg.rosette.tilt * 0.66;
    leaf.scale.x = 0.85;
    group.add(leaf);
  }
  return group;
}

function makeBillboard(cfg) {
  const size = 384;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.translate(size / 2, size / 2);
  const grad = ctx.createRadialGradient(0, -20, 20, 0, 0, 120);
  grad.addColorStop(0, 'rgba(220,232,210,0.95)');
  grad.addColorStop(0.4, 'rgba(175,188,163,0.55)');
  grad.addColorStop(1, 'rgba(40,52,36,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(22,34,24,0.92)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 56);
  ctx.lineTo(0, -30);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(211,224,196,0.95)';
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.36;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(Math.cos(a) * 92, -30 + Math.sin(a) * 92);
    ctx.stroke();
  }
  if (cfg.branching) {
    ctx.lineWidth = 5;
    for (const off of [-0.45, 0, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(0, 26);
      ctx.lineTo(off * 66, -2);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.4, 3.8, 1);
  return sprite;
}

export function buildFrailejon(speciesKey, seed = 1) {
  const cfg = SPECIES[speciesKey];
  if (!cfg) throw new Error(`Especie no soportada: ${speciesKey}`);
  // si el host no tickea el reloj global de viento, el rAF de respaldo lo
  // avanza — un frailejón quieto en cualquier mundo es regresión (regla dura).
  asegurarRelojViento();
  const lod = new THREE.LOD();
  const baseSeed = hash(`${speciesKey}:${seed}`);
  const detailed = makeTrunkGroup(cfg, baseSeed, true);
  detailed.name = `frailejon_${speciesKey}_detail`;
  const medium = makeSimplified(cfg, baseSeed ^ 0x5bd1e995);
  medium.name = `frailejon_${speciesKey}_mid`;
  const low = makeBillboard(cfg);
  low.name = `frailejon_${speciesKey}_billboard`;
  lod.addLevel(detailed, 0);
  lod.addLevel(medium, 24);
  lod.addLevel(low, 100);
  lod.userData.species = speciesKey;
  lod.userData.label = cfg.scientific;
  lod.userData.common = cfg.common;
  lod.userData.tag = cfg.tag;
  lod.userData.height = cfg.height;
  lod.userData.pisoTermico = [...cfg.pisoTermico];
  return lod;
}

export const FRAILEJONES = Object.keys(SPECIES);
export function frailejonSpec(key) {
  return SPECIES[key];
}
