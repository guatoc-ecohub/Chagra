// ── entorno.js — terreno, cielo, niebla por zona y flora del "Descenso" ─────
// Terreno = mesh plano levantado con el heightfield de pista.js y coloreado por
// vértice (asfalto oscuro en pista, pasto por zona con transición suave, tinte
// de altitud). Cielo con Sky.js + sol bajo. La niebla es dinámica: el FogExp2
// responde a la zona donde va el kart (páramo claro → niebla densa del bosque).
// Flora por zona: frailejones (páramo/subida), copas de masa (bosques), pasto.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { crearParchePasto } from '../../../lib3d/flora/quickGrass.js';
import { crearCopaMasa, texturaFollaje } from '../../../lib3d/flora/FollajeMasa.js';
import { buildFrailejon, FRAILEJONES } from '../../../lib3d/flora/frailejonFabrica.js';
import { tickVientoMundos, aplicarVientoMundo } from '../../../lib3d/flora/vientoMundos.js';
import { crearBrumaVolumetrica } from '../../../lib3d/fx/brumaVolumetrica.js';
import { crearTerrenoClipmap } from '../../../lib3d/terreno/clipmap.js';
import { makeWaterfalls } from '../../../agua-valle.js';
import { ZONA } from './pista.js';
import { crearCintaPista } from './modelos/pista-tierra.js';

const COLOR_ZONA = [
  0x97a469, // Páramo alto: pasto seco pálido
  0x74904f, // Transición
  0x46663a, // Bosque andino: verde oscuro
  0x47614f, // Bosque de niebla: verde musgo frío, húmedo
  0x8fa05f, // Subida al páramo
];
const COLOR_ASFALTO = 0x564636; // hombro de tierra húmeda pegado a la cinta
const COLOR_RUTA = 0x6a5138;    // tierra de páramo: oscura y húmeda, no arena
const COLOR_ROCA = 0x6a726b;

let TEX_TERRENO = null;

function crearTexturaTerreno(THREE) {
  if (TEX_TERRENO) return TEX_TERRENO;
  const tam = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(tam, tam);
  const px = img.data;
  const seeds = (x, y) => {
    const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return h - Math.floor(h);
  };
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      const n = seeds(x * 0.03, y * 0.03);
      const m = seeds(x * 0.11 + 7.1, y * 0.08 + 3.2);
      const g = 72 + n * 42 + m * 18;
      const r = 56 + n * 18 + m * 26;
      const b = 34 + n * 14 + m * 8;
      const i = (y * tam + x) * 4;
      px[i] = Math.min(255, r);
      px[i + 1] = Math.min(255, g);
      px[i + 2] = Math.min(255, b);
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#a5ad72';
  for (let i = 0; i < 900; i++) {
    const x = (Math.sin(i * 12.989) * 43758.5453) % tam;
    const y = (Math.sin(i * 78.233) * 24634.6345) % tam;
    const rx = (Math.abs(x) % tam + tam) % tam;
    const ry = (Math.abs(y) % tam + tam) % tam;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 1.2 + (i % 3) * 0.9, 0.6 + (i % 5) * 0.2, (i % 9) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  TEX_TERRENO = tex;
  return tex;
}

function aplicarVientoFrailejon(lod) {
  lod.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    if (obj.isSprite || obj.material.isSpriteMaterial) return;
    const rotZ = Math.abs(obj.rotation?.z ?? 0);
    if (rotZ < 0.35) return;
    // Hojas y rosetas: base quieta, punta movida por el mismo reloj global.
    aplicarVientoMundo(obj.material, { amplitud: 0.055, piso: 0.35, velocidad: 1.0 });
  });
}

let TEX_CHUSQUE = null;
let TEX_ENCENILLO = null;

function crearBromelia(THREE, seed = 1) {
  const rn = (() => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x4e7f3b, roughness: 0.92, metalness: 0 });
  const mat2 = new THREE.MeshStandardMaterial({ color: 0x2f5c2d, roughness: 0.95, metalness: 0 });
  const corazon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0x6f8d47, roughness: 0.75 }));
  g.add(corazon);
  for (let i = 0; i < 10; i++) {
    const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.05, 0.34 + rn() * 0.16, 5, 1, false), i % 2 ? mat : mat2);
    leaf.position.y = 0.03 + rn() * 0.03;
    leaf.rotation.y = (i / 10) * Math.PI * 2 + rn() * 0.12;
    leaf.rotation.z = 0.9 + rn() * 0.32;
    leaf.rotation.x = (rn() - 0.5) * 0.12;
    g.add(leaf);
  }
  return g;
}

function crearChusque(THREE, seed = 1) {
  const rn = (() => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const g = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x6f8d48, roughness: 0.94, metalness: 0 });
  if (!TEX_CHUSQUE) TEX_CHUSQUE = texturaFollaje(THREE, { seed: 190, oscuro: '#294b33', medio: '#45693f', claro: '#7f9f61', hojas: 220 });
  const leafCrown = crearCopaMasa(THREE, {
    seed: 400 + seed,
    tex: TEX_CHUSQUE,
    esferas: [
      { c: [0, 1.35, 0], r: 0.55, esc: [1.2, 0.65, 1.2] },
      { c: [0.12, 1.55, 0.08], r: 0.34, esc: [1.1, 0.5, 1.1] },
      { c: [-0.1, 1.45, -0.08], r: 0.28, esc: [1.05, 0.45, 1.05] },
    ],
  });
  leafCrown.grupo.scale.setScalar(0.95);
  leafCrown.grupo.rotation.y = rn() * Math.PI * 2;
  leafCrown.grupo.position.y = 0.1;
  aplicarVientoMundo(leafCrown.matCards, { amplitud: 0.08, piso: 0.25, velocidad: 1.25 });
  aplicarVientoMundo(leafCrown.matNucleo, { amplitud: 0.05, piso: 0.25, velocidad: 1.15 });
  g.add(leafCrown.grupo);
  for (let i = 0; i < 6; i++) {
    const h = 1.6 + rn() * 1.1;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, h, 6), stemMat);
    stem.position.set((rn() - 0.5) * 0.18, h * 0.5, (rn() - 0.5) * 0.18);
    stem.rotation.z = (rn() - 0.5) * 0.15;
    stem.rotation.x = (rn() - 0.5) * 0.08;
    g.add(stem);
  }
  return g;
}

function crearEncenillo(THREE, seed = 1) {
  const rn = (() => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const g = new THREE.Group();
  const troncoMat = new THREE.MeshStandardMaterial({ color: 0x6a543b, roughness: 0.98, metalness: 0 });
  if (!TEX_ENCENILLO) TEX_ENCENILLO = texturaFollaje(THREE, { seed: 300, oscuro: '#263d2b', medio: '#3a5b38', claro: '#759a54', hojas: 360 });
  const copa = crearCopaMasa(THREE, {
    seed: 600 + seed,
    tex: TEX_ENCENILLO,
    esferas: [
      { c: [0, 2.2, 0], r: 1.1, esc: [1.4, 0.95, 1.4] },
      { c: [0.8, 2.0, 0.2], r: 0.72, esc: [1.0, 0.8, 1.0] },
      { c: [-0.78, 2.05, -0.3], r: 0.78, esc: [1.0, 0.82, 1.0] },
      { c: [0.02, 2.5, 0.05], r: 0.78, esc: [0.86, 0.82, 0.86] },
    ],
  });
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.2, 7), troncoMat);
  tronco.position.y = 1.1;
  tronco.rotation.z = (rn() - 0.5) * 0.12;
  g.add(tronco);
  copa.grupo.position.y = 0.08;
  copa.grupo.rotation.y = rn() * Math.PI * 2;
  copa.grupo.scale.setScalar(1.02 + rn() * 0.12);
  aplicarVientoMundo(copa.matCards, { amplitud: 0.12, piso: 0.5, velocidad: 1.02 });
  aplicarVientoMundo(copa.matNucleo, { amplitud: 0.06, piso: 0.5, velocidad: 0.98 });
  g.add(copa.grupo);
  for (let i = 0; i < 3; i++) {
    const epifita = crearBromelia(THREE, seed * 11 + i * 7);
    epifita.position.set((rn() - 0.5) * 0.55, 0.6 + i * 0.58, (rn() - 0.5) * 0.55);
    epifita.rotation.y = rn() * Math.PI * 2;
    epifita.scale.setScalar(0.82 + rn() * 0.28);
    g.add(epifita);
  }
  return g;
}

function crearRocaHumeda(THREE, seed = 1) {
  const rn = (() => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x56605a, roughness: 1, metalness: 0.02 });
  const mat2 = new THREE.MeshStandardMaterial({ color: 0x7b877d, roughness: 0.96, metalness: 0.02 });
  const moss = new THREE.MeshStandardMaterial({ color: 0x486640, roughness: 1, metalness: 0 });
  for (let i = 0; i < 3 + Math.floor(rn() * 2); i++) {
    const geo = new THREE.DodecahedronGeometry(0.55 + rn() * 0.35, 0);
    const rock = new THREE.Mesh(geo, i % 2 ? mat : mat2);
    rock.position.set((rn() - 0.5) * 0.55, rn() * 0.18, (rn() - 0.5) * 0.4);
    rock.rotation.set(rn() * 0.8, rn() * Math.PI * 2, rn() * 0.7);
    rock.scale.set(1 + rn() * 0.3, 0.72 + rn() * 0.12, 0.84 + rn() * 0.18);
    g.add(rock);
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.52, 8, 6), moss);
  cap.position.set(0.04, 0.28, 0.02);
  cap.scale.set(1.1, 0.35, 1.0);
  g.add(cap);
  return g;
}

function firmaMaterial(m) {
  if (!m) return 'null';
  const color = m.color?.isColor ? m.color.getHexString() : '';
  const emissive = m.emissive?.isColor ? m.emissive.getHexString() : '';
  return [
    m.type,
    color,
    m.roughness ?? '',
    m.metalness ?? '',
    emissive,
    m.emissiveIntensity ?? '',
    m.transparent ? 1 : 0,
    m.opacity ?? 1,
    m.side ?? 0,
    m.flatShading ? 1 : 0,
    m.alphaTest ?? 0,
    m.depthWrite === false ? 0 : 1,
    m.wireframe ? 1 : 0,
  ].join('|');
}

function fusionarGeometrias(THREE, geos) {
  if (!geos.length) return null;
  const usarUV = geos.every((g) => !!g.attributes.uv);
  const total = geos.reduce((acc, g) => acc + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = usarUV ? new Float32Array(total * 2) : null;
  let off = 0;
  for (const g of geos) {
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, off * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, off * 3);
    if (usarUV) uv.set(g.attributes.uv.array, off * 2);
    off += cnt;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (nor.some((v) => v !== 0)) geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

function compactarGrupo(THREE, grupo) {
  grupo.updateMatrixWorld(true);
  const baseInv = new THREE.Matrix4().copy(grupo.matrixWorld).invert();
  const porFirma = new Map();
  const materiales = new Map();

  grupo.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry || !obj.material) return;
    const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    const firma = firmaMaterial(mat);
    if (!porFirma.has(firma)) {
      porFirma.set(firma, []);
      materiales.set(firma, mat);
    }
    const geo = obj.geometry.clone();
    const local = new THREE.Matrix4().multiplyMatrices(baseInv, obj.matrixWorld);
    geo.applyMatrix4(local);
    porFirma.get(firma).push(geo);
  });

  if (porFirma.size === 0) return grupo;

  const out = new THREE.Group();
  for (const [firma, geos] of porFirma.entries()) {
    const geo = fusionarGeometrias(THREE, geos);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, materiales.get(firma));
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    out.add(mesh);
  }
  out.position.copy(grupo.position);
  out.quaternion.copy(grupo.quaternion);
  out.scale.copy(grupo.scale);
  out.name = grupo.name;
  out.userData = { ...grupo.userData };
  return out;
}

function compactarFrailejon(THREE, lod) {
  const nuevo = new THREE.LOD();
  nuevo.name = lod.name;
  nuevo.position.copy(lod.position);
  nuevo.quaternion.copy(lod.quaternion);
  nuevo.scale.copy(lod.scale);
  nuevo.userData = { ...lod.userData };
  for (const nivel of lod.levels) {
    const obj = nivel.object;
    const compactado = obj?.isGroup ? compactarGrupo(THREE, obj) : obj;
    nuevo.addLevel(compactado, nivel.distance);
  }
  return nuevo;
}

export function crearEntorno(THREE, pista, cfg = {}) {
  const escena = cfg.escena;
  const grupo = new THREE.Group();
  escena.add(grupo);
  // El mundo chorrera cambia paleta, cielo, niebla y mobiliario del entorno.
  // Se decide una sola vez acá (la pista ya viene construida con chorrera).
  const mundoChorrera = !!pista.chorrera;
  const floraCercana = [];
  const floraMedia = [];

  // ── 1) terreno (heightfield + clipmap LOD + color por vértice) ────────────
  const { cols, filas, x0, z0, paso } = pista;
  const col = new THREE.Color(), cZona = new THREE.Color(), tmp = new THREE.Color();
  function hashP(x, z) {
    const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return h - Math.floor(h);
  }

  // Paleta del cañón de La Chorrera: verde-dominante (referencia del dron),
  // lecho de piedra mojada, roca NEGRA húmeda en paredes y roca BLANCA en la
  // franja del escalonado (beats 2–3 del video).
  const CHORRERA_ZONA = [
    0x5d7f45, // meseta: pasto vivo
    0x4c6f3f, // repisas de roca blanca: verde con hueso
    0x3f6335, // la garganta: bosque andino hondo
    0x40634e, // la caída grande: musgo frío
    0x497049, // valle del riachuelo
  ];
  function colorTerreno(x, z, y, out) {
    const info = pista.infoLocal(x, z);
    const slope = Math.max(0, 1 - pista.normalMundo(x, z).y);
    if (mundoChorrera) {
      cZona.setHex(CHORRERA_ZONA[info.zona] ?? 0x3f6335);
      const rd = Math.abs(info.lat) - info.w;
      if (rd < 0) {
        // lecho jugable: piedra mojada, no tierra de trocha
        const t = Math.min(1, -rd / 2.6);
        col.setHex(0x707a68).lerp(tmp.setHex(0x4a5347), t * 0.6);
      } else {
        const t = Math.min(1, rd / 9);
        col.setHex(0x424c40).lerp(cZona, Math.min(1, t));
      }
      if (slope > 0.16) {
        // roca de pared: blanca en la franja del escalonado, negra en el resto
        const fZ = info.f;
        const blanca = fZ > 0.112 && fZ < 0.228;
        const mix = Math.min(1, (slope - 0.16) * 2.1);
        col.lerp(tmp.setHex(blanca ? 0x99a094 : 0x2e3531), mix * (blanca ? 0.85 : 0.8));
        // vetas de musgo colgado sobre la roca (verde que gotea)
        const veta = hashP(Math.floor(x * 0.5), Math.floor(z * 0.5));
        if (veta > 0.55) col.lerp(tmp.setHex(0x3c6136), (veta - 0.55) * 0.9);
      }
      const pale = 1 + (y / 128 - 0.5) * 0.06;
      const mult = pale * (1 + (hashP(x, z) - 0.5) * 0.05);
      out[0] = Math.min(1, col.r * mult);
      out[1] = Math.min(1, col.g * mult);
      out[2] = Math.min(1, col.b * mult);
      return;
    }
    cZona.setHex(COLOR_ZONA[info.zona] ?? 0x6f7a52);
    const rd = Math.abs(info.lat) - info.w;
    if (rd < 0) {
      const t = Math.min(1, -rd / 2.6);
      col.setHex(COLOR_RUTA).lerp(tmp.setHex(COLOR_ASFALTO), t * 0.55);
    } else {
      const t = Math.min(1, rd / 11);
      col.setHex(COLOR_ASFALTO).lerp(cZona, Math.min(1, t));
    }
    if (slope > 0.18) {
      const mix = Math.min(1, (slope - 0.18) * 1.8 + (y > 36 ? 0.2 : 0));
      col.lerp(tmp.setHex(COLOR_ROCA), mix);
    }
    const alt = y / 40;
    const neblina = info.zona === ZONA.NIEBLA ? 0.95 : 1;
    const pale = 1 + (alt - 0.5) * 0.10;
    const mult = pale * neblina * (1 + (hashP(x, z) - 0.5) * 0.05);
    out[0] = Math.min(1, col.r * mult);
    out[1] = Math.min(1, col.g * mult);
    out[2] = Math.min(1, col.b * mult);
  }

  const texTerreno = crearTexturaTerreno(THREE);
  texTerreno.repeat.set(Math.max(2, (cols * paso) / 34), Math.max(2, (filas * paso) / 34));
  const terrenoMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: texTerreno,
    roughnessMap: texTerreno,
    roughness: 1,
    metalness: 0,
  });
  const controlSinLod = typeof location !== 'undefined'
    && new URLSearchParams(location.search).get('terrainLod') === '0';
  // chorrera: los anillos LOD por defecto dejan la mitad del circuito en paso
  // grueso y la zanja del riachuelo desaparecía a media distancia (el agua
  // asomaba como jirones blancos). En escritorio el anillo fino cubre el
  // circuito entero; en móvil se conservan los niveles por defecto.
  const nivelesTerreno = controlSinLod
    ? [{ paso, radioInterior: 0, radioExterior: Math.max(pista.x1 - pista.x0, pista.z1 - pista.z0) }]
    : (mundoChorrera && !cfg.movil ? [
      // el circuito llega a ~250 m del centro del mapa: el anillo fino debe
      // cubrirlo COMPLETO o la zanja del riachuelo se rompe en ese tramo
      { paso, radioInterior: 0, radioExterior: 260 },
      { paso: paso * 2, radioInterior: 260, radioExterior: 340 },
      { paso: paso * 4, radioInterior: 340, radioExterior: 430 },
    ] : undefined);

  // Solo el mundo explícito de La Chorrera monta el ambiente de agua-valle;
  // `default` conserva el circuito y ambiente base intactos. Se monta ANTES
  // del terreno: el clipmap talla la zanja del riachuelo leyendo su
  // profundidadEn (el traverse posterior no alcanzaba los anillos LOD).
  let chorrera = null;
  if (mundoChorrera) {
    const waterSeed = Number(new URLSearchParams(location.search).get('waterSeed')) || 20260811;
    chorrera = makeWaterfalls(escena, { pista, seed: waterSeed });
    grupo.add(chorrera.grupo);
  }
  const pistaTerreno = chorrera?.profundidadEn
    ? { ...pista, alturaMundo: (x, z) => pista.alturaMundo(x, z) - chorrera.profundidadEn(x, z) }
    : pista;
  const terreno = crearTerrenoClipmap(THREE, pistaTerreno, {
    material: terrenoMat,
    colorEn: colorTerreno,
    niveles: nivelesTerreno,
    nombre: 'terreno',
  });
  grupo.add(terreno);

  // ── 1b) banda de pista y bordes marcados ─────────────────────────────────
  const rutaGrupo = new THREE.Group();
  grupo.add(rutaGrupo);
  function hashP(x, z) {
    const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return h - Math.floor(h);
  }
  function crearMora(THREE, seed = 1) {
    const rn = (() => {
      let a = seed >>> 0;
      return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();
    const g = new THREE.Group();
    const hoja1 = new THREE.MeshStandardMaterial({ color: 0x29492f, roughness: 0.96, metalness: 0 });
    const hoja2 = new THREE.MeshStandardMaterial({ color: 0x1f3825, roughness: 0.98, metalness: 0 });
    const baya = new THREE.MeshStandardMaterial({ color: 0x120f12, roughness: 0.7, metalness: 0.02 });
    const talloMat = new THREE.MeshStandardMaterial({ color: 0x5a4a31, roughness: 0.98, metalness: 0 });
    for (let i = 0; i < 4; i++) {
      const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.42 + rn() * 0.2, 5), talloMat);
      tallo.position.set((rn() - 0.5) * 0.12, 0.2 + rn() * 0.05, (rn() - 0.5) * 0.12);
      tallo.rotation.z = (rn() - 0.5) * 0.4;
      tallo.rotation.x = (rn() - 0.5) * 0.2;
      g.add(tallo);
    }
    for (let i = 0; i < 7; i++) {
      const hoja = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, 0.35 + rn() * 0.15, 5), i % 2 ? hoja1 : hoja2);
      hoja.position.set((rn() - 0.5) * 0.14, 0.14 + rn() * 0.1, (rn() - 0.5) * 0.14);
      hoja.rotation.y = rn() * Math.PI * 2;
      hoja.rotation.z = 0.95 + rn() * 0.22;
      g.add(hoja);
    }
    for (let i = 0; i < 6; i++) {
      const mora = new THREE.Mesh(new THREE.SphereGeometry(0.05 + rn() * 0.018, 8, 6), baya);
      mora.position.set((rn() - 0.5) * 0.18, 0.48 + rn() * 0.16, (rn() - 0.5) * 0.18);
      g.add(mora);
    }
    g.scale.setScalar(0.9 + rn() * 0.35);
    return g;
  }
  // cinta de tierra, postes, alambre, encaladas y grava: módulo propio
  const cinta = crearCintaPista(THREE, pista, mundoChorrera ? {
    cerca: false, // ninguna finca alambra una cascada
    paleta: {
      centro: 0x8b8d7c, huella: 0x585e53, medio: 0x757869, borde: 0x3e4640, pasto: 0x35502c,
      encalada: 0xcfdcc4, gravaClara: 0xaab3a4, gravaOscura: 0x5d6658,
    },
  } : {});
  if (mundoChorrera) {
    // la textura de tierra es cálida: neutralizarla a piedra húmeda del lecho
    cinta.grupo.traverse((o) => {
      if (o.isMesh && o.name === 'ruta' && o.material?.color) o.material.color.setHex(0x86948b);
    });
  }
  rutaGrupo.add(cinta.grupo);
  const rings = cinta.rings;

  const moraCount = Math.max(6, Math.floor(rings.length / 104));
  for (let i = 0; i < moraCount; i++) {
    const r = rings[(i * 37) % rings.length];
    const lado = i % 2 === 0 ? -1 : 1;
    const off = r.half + 2.2 + (hashP(r.u, i) - 0.5) * 0.8;
    const x = r.xC + r.rx * off * lado;
    const z = r.zC + r.rz * off * lado;
    const y = pista.alturaMundo(x, z) + 0.05;
    const mora = compactarGrupo(THREE, crearMora(THREE, 5100 + i));
    mora.position.set(x, y, z);
    mora.rotation.y = hashP(x, z) * Math.PI * 2;
    mora.scale.setScalar(0.9 + hashP(z, x) * 0.55);
    rutaGrupo.add(mora);
  }

  // ── 3) cielo + luz + niebla base ───────────────────────────────────────────
  const sky = new Sky();
  sky.scale.setScalar(1200);
  const skyU = sky.material.uniforms;
  // chorrera: cielo NUBLADO pleno del video del dron — sin disco de sol
  skyU.turbidity.value = mundoChorrera ? 10 : 4;
  skyU.rayleigh.value = mundoChorrera ? 0.9 : 1.6;
  skyU.mieCoefficient.value = mundoChorrera ? 0.0025 : 0.006;
  skyU.mieDirectionalG.value = 0.86;
  // chorrera: sol ALTO de mediodía nublado (el del video del dron) — el sol
  // rasante del páramo quemaba de blanco la boca del cañón.
  const solDir = mundoChorrera
    ? new THREE.Vector3(0.35, 0.72, -0.52).normalize()
    : new THREE.Vector3(0.35, 0.18, -0.85).normalize();
  skyU.sunPosition.value.copy(solDir);
  escena.add(sky);

  const luzSol = new THREE.DirectionalLight(0xffe9c8, cfg.movil ? 1.5 : 1.8);
  luzSol.position.copy(solDir).multiplyScalar(300);
  if (cfg.sombras) {
    luzSol.castShadow = true;
    luzSol.shadow.mapSize.set(cfg.sombraRes || 2048, cfg.sombraRes || 2048);
    luzSol.shadow.camera.left = -90; luzSol.shadow.camera.right = 90;
    luzSol.shadow.camera.top = 90; luzSol.shadow.camera.bottom = -90;
    luzSol.shadow.camera.far = 600;
    luzSol.shadow.bias = -0.0006;
  }
  escena.add(luzSol);
  const luzAmb = new THREE.AmbientLight(0xb9c8d8, 0.55);
  escena.add(luzAmb);
  const luzRell = new THREE.DirectionalLight(0x9fb8d0, 0.4);
  luzRell.position.set(-80, 40, -120);
  escena.add(luzRell);

  const niebla = new THREE.FogExp2(0xc6d3c4, 0.006);
  escena.fog = niebla;

  // ── 4) flora por zona ──────────────────────────────────────────────────────
  const follajeF = cfg.follaje ?? 1;
  const grupoFlora = new THREE.Group();
  grupo.add(grupoFlora);
  const ajustarVisibilidadFlora = (obj, maxDist) => {
    obj.userData.maxDist2 = maxDist * maxDist;
    floraCercana.push(obj);
  };

  function puntoLateral(i, minOff, maxOff, salto) {
    // barrido con intentos: fuera de pista y dentro de los bordes del terreno
    for (let t = 0; t < 8; t++) {
      const j = (i + Math.floor((Math.random() - 0.5) * salto) + pista.n) % pista.n;
      const off = (minOff + Math.random() * (maxOff - minOff)) * (Math.random() < 0.5 ? 1 : -1);
      const dX = Math.sin(pista.HDG[j]);
      const dZ = -Math.cos(pista.HDG[j]);
      const x = pista.PX[j] + dX * off;
      const z = pista.PZ[j] + dZ * off;
      if (x < pista.x0 + 4 || x > pista.x1 - 4 || z < pista.z0 + 4 || z > pista.z1 - 4) continue;
      const info = pista.infoLocal(x, z);
      if (Math.abs(info.lat) <= info.w + 3) continue;
      // chorrera: nada de copas colgadas de la pared vertical — los árboles
      // van en repisas y cejas (pendiente moderada); el muro ya trae musgo.
      if (mundoChorrera && pista.normalMundo(x, z).y < 0.72) continue;
      return { x, z, y: pista.alturaMundo(x, z), zona: info.zona };
    }
    return null;
  }

  function tomarMuestra(lista, paso) {
    if (paso <= 1) return lista;
    const out = [];
    for (let i = 0; i < lista.length; i += paso) out.push(lista[i]);
    return out;
  }

  // frailejones en páramo y subida
  const frajN = Math.round(108 * follajeF * (mundoChorrera ? 0.3 : 1));
  let puestosF = 0;
  for (let i = 0; i < pista.n && puestosF < frajN; i += 3) {
    if (pista.ZON[i] !== ZONA.PARAMO_ALTO && pista.ZON[i] !== ZONA.SUBIDA) continue;
    const pt = puntoLateral(i, 5, 26, 6);
    if (!pt) continue;
    const spec = FRAILEJONES[puestosF % FRAILEJONES.length];
    const lod = compactarFrailejon(THREE, buildFrailejon(spec, puestosF + 11));
    if (lod.levels?.length >= 3) {
      lod.levels[1].distance = 14;
      lod.levels[2].distance = 34;
    }
    lod.position.set(pt.x, pt.y, pt.z);
    const esc = 0.8 + Math.random() * 0.7;
    lod.scale.setScalar(esc);
    lod.rotation.y = Math.random() * Math.PI * 2;
    aplicarVientoFrailejon(lod);
    ajustarVisibilidadFlora(lod, 190);
    grupoFlora.add(lod);
    puestosF++;
  }

  // arranque: densidad extra cerca de la salida para que no se lea como loma vacía
  const arranquePts = [];
  for (let i = 0; i < 180; i += 2) {
    const pt = puntoLateral(i, 4, 14, 4);
    if (pt) arranquePts.push(pt);
  }
  if (arranquePts.length) {
    const pArr = crearParchePasto(grupoFlora, {
      puntos: arranquePts.slice(0, Math.min(14, arranquePts.length)),
      densidad: 8, altura: [0.42, 1.12], colorBase: '#9da36b', colorPunta: '#d6d8ad',
      viento: 1.0, combado: 0.5, segmentos: 5, radio: 0.8,
    });
    if (pArr && pArr.mesh) pArr.mesh.name = 'pajonal-arranque';
    for (let i = 0; i < Math.min(7, arranquePts.length); i++) {
      const pt = arranquePts[i];
      const spec = FRAILEJONES[(puestosF + i) % FRAILEJONES.length];
      const lod = compactarFrailejon(THREE, buildFrailejon(spec, 990 + i));
      lod.position.set(pt.x, pt.y, pt.z);
      lod.scale.setScalar(0.6 + Math.random() * 0.5);
      lod.rotation.y = Math.random() * Math.PI * 2;
      aplicarVientoFrailejon(lod);
      ajustarVisibilidadFlora(lod, 150);
      grupoFlora.add(lod);
      puestosF++;
    }
    for (let i = 7; i < Math.min(11, arranquePts.length); i++) {
      const pt = arranquePts[i];
      const roca = compactarGrupo(THREE, crearRocaHumeda(THREE, 1500 + i));
      roca.position.set(pt.x, pt.y, pt.z);
      roca.scale.setScalar(0.65 + Math.random() * 0.35);
      roca.rotation.y = Math.random() * Math.PI * 2;
      ajustarVisibilidadFlora(roca, 170);
      grupoFlora.add(roca);
    }
  }

  // árboles de copa masa en bosque y niebla
  const texBosque = texturaFollaje(THREE, { seed: 21, medio: '#3a5a2e', claro: '#6d8f4e' });
  const texNiebla = texturaFollaje(THREE, { seed: 33, medio: '#33504a', claro: '#5a7a6c' });
  const arbN = Math.round(92 * follajeF * (mundoChorrera ? 1.8 : 1));
  let puestosA = 0;
  for (let i = 0; i < pista.n && puestosA < arbN; i += 4) {
    if (pista.ZON[i] !== ZONA.BOSQUE && pista.ZON[i] !== ZONA.NIEBLA) continue;
    const pt = puntoLateral(i, 6, 28, 8);
    if (!pt) continue;
    const esNiebla = pista.ZON[i] === ZONA.NIEBLA;
    // chorrera: todo el monte con la textura VERDE del bosque — el moteado
    // pálido del bosque de niebla convertía las copas lejanas en platillos
    // flotantes contra la bruma del cañón.
    const tex = esNiebla && !mundoChorrera ? texNiebla : texBosque;
    const alto = 5 + Math.random() * 4;
    const c = crearCopaMasa(THREE, {
      seed: 100 + puestosA,
      tex,
      esferas: [
        { c: [0, alto - 2.2, 0], r: 1.6 + Math.random(), esc: [1.15, 0.9, 1.15] },
        { c: [0.9, alto - 1.6, 0.4], r: 1.2 + Math.random() * 0.5, esc: [0.9, 1, 0.9] },
        { c: [-0.8, alto - 1.4, -0.5], r: 1.0 + Math.random() * 0.5, esc: [0.9, 0.85, 0.9] },
      ],
    });
    c.grupo.position.set(pt.x, pt.y - (mundoChorrera ? 0.7 : 0), pt.z);
    c.grupo.scale.setScalar(1 + Math.random() * 0.6);
    c.grupo.rotation.y = Math.random() * Math.PI * 2;
    aplicarVientoMundo(c.matCards, { amplitud: 0.12, piso: 3.4, velocidad: 1.1 });
    aplicarVientoMundo(c.matNucleo, { amplitud: 0.09, piso: 3.4, velocidad: 1.0 });
    ajustarVisibilidadFlora(c.grupo, 240);
    grupoFlora.add(c.grupo);
    puestosA++;
  }

  // chusque: macollas densas de bambú andino en bordes de transición/bosque
  const chusqN = Math.round(26 * follajeF * (mundoChorrera ? 1.6 : 1));
  let puestosC = 0;
  for (let i = 0; i < pista.n && puestosC < chusqN; i += 5) {
    if (pista.ZON[i] !== ZONA.TRANSICION && pista.ZON[i] !== ZONA.BOSQUE && pista.ZON[i] !== ZONA.NIEBLA) continue;
    const pt = puntoLateral(i, 7, 26, 8);
    if (!pt) continue;
      const ch = compactarGrupo(THREE, crearChusque(THREE, 700 + puestosC));
      ch.position.set(pt.x, pt.y, pt.z);
      ch.rotation.y = Math.random() * Math.PI * 2;
      ch.scale.setScalar(0.8 + Math.random() * 0.8);
    ajustarVisibilidadFlora(ch, 180);
    grupoFlora.add(ch);
    puestosC++;
  }

  // encenillos: masa reconocible de bosque de niebla con epífitas/bromelias
  const encN = Math.round(30 * follajeF * (mundoChorrera ? 1.8 : 1));
  let puestosE = 0;
  for (let i = 0; i < pista.n && puestosE < encN; i += 4) {
    if (pista.ZON[i] !== ZONA.BOSQUE && pista.ZON[i] !== ZONA.NIEBLA && pista.ZON[i] !== ZONA.TRANSICION) continue;
    const pt = puntoLateral(i, 10, 34, 10);
    if (!pt) continue;
      const en = compactarGrupo(THREE, crearEncenillo(THREE, 900 + puestosE));
      en.position.set(pt.x, pt.y - (mundoChorrera ? 0.5 : 0), pt.z);
      en.rotation.y = Math.random() * Math.PI * 2;
      en.scale.setScalar(0.85 + Math.random() * 0.65);
    ajustarVisibilidadFlora(en, 260);
    grupoFlora.add(en);
    puestosE++;
  }

  // rocas húmedas + musgo en laderas y bordes del páramo / bosque
  const rocN = Math.round(42 * follajeF);
  let puestosR = 0;
  for (let i = 0; i < pista.n && puestosR < rocN; i += 6) {
    if (pista.ZON[i] !== ZONA.PARAMO_ALTO && pista.ZON[i] !== ZONA.TRANSICION && pista.ZON[i] !== ZONA.BOSQUE && pista.ZON[i] !== ZONA.NIEBLA) continue;
    const pt = puntoLateral(i, 9, 34, 12);
    if (!pt) continue;
    const roca = compactarGrupo(THREE, crearRocaHumeda(THREE, 1200 + puestosR));
    roca.position.set(pt.x, pt.y + 0.02, pt.z);
    roca.rotation.y = Math.random() * Math.PI * 2;
    roca.scale.setScalar(0.9 + Math.random() * 0.9);
    ajustarVisibilidadFlora(roca, 220);
    grupoFlora.add(roca);
    puestosR++;
  }

  // pasto de masa: parches por zona (parámo claro, bosque oscuro)
  const pastoN = Math.round(900 * follajeF);
  const ptosParamo = [], ptosBosque = [];
  for (let i = 0; i < pista.n; i += 2) {
    const zona = pista.ZON[i];
    if (zona !== ZONA.PARAMO_ALTO && zona !== ZONA.SUBIDA && zona !== ZONA.TRANSICION && zona !== ZONA.BOSQUE) continue;
    const pt = puntoLateral(i, 3, 18, 4);
    if (!pt) continue;
    if (zona === ZONA.BOSQUE || zona === ZONA.TRANSICION) ptosBosque.push(pt);
    else ptosParamo.push(pt);
  }
  const ptosParamoUso = tomarMuestra(ptosParamo, 2);
  const ptosBosqueUso = tomarMuestra(ptosBosque, 2);
  if (ptosParamo.length) {
    const pPar = crearParchePasto(grupoFlora, {
      puntos: ptosParamoUso.slice(0, Math.round(pastoN * 0.6)),
      densidad: 6, altura: [0.35, 0.92], colorBase: '#a8b46a', colorPunta: '#d6d9a2',
      viento: 1.0, combado: 0.4, segmentos: 4, radio: 0.5,
    });
    if (pPar && pPar.mesh) pPar.mesh.name = 'pasto-paramo';
  }
  if (ptosBosque.length) {
    const pBos = crearParchePasto(grupoFlora, {
      puntos: ptosBosqueUso.slice(0, Math.round(pastoN * 0.4)),
      densidad: 5, altura: [0.22, 0.56], colorBase: '#3c5231', colorPunta: '#5f7b43',
      viento: 0.7, combado: 0.3, segmentos: 4, radio: 0.42,
    });
    if (pBos && pBos.mesh) pBos.mesh.name = 'pasto-bosque';
  }
  const ptosPajonal = [];
  for (let i = 0; i < pista.n; i += 3) {
    if (pista.ZON[i] !== ZONA.PARAMO_ALTO && pista.ZON[i] !== ZONA.SUBIDA && pista.ZON[i] !== ZONA.TRANSICION) continue;
    const pt = puntoLateral(i, 8, 22, 6);
    if (pt) ptosPajonal.push(pt);
  }
  if (ptosPajonal.length) {
    const pPaj = crearParchePasto(grupoFlora, {
      puntos: ptosPajonal.slice(0, Math.round(pastoN * 0.5)),
      densidad: 7, altura: [0.45, 1.15], colorBase: '#9a9d61', colorPunta: '#d8d5a4',
      viento: 1.1, combado: 0.52, segmentos: 5, radio: 0.72,
    });
    if (pPaj && pPaj.mesh) pPaj.mesh.name = 'pajonal';
  }

  // ── 4b) el bosque que le faltaba al bosque de niebla + bruma entre troncos ─
  // Los loops de flora de arriba se agotan en TRANSICION/BOSQUE (vienen ANTES
  // en el orden de la pista): la zona NIEBLA quedaba PELADA — laderas desnudas
  // y la "niebla" era pura cortina de fondo sin un tronco que atravesar.
  // Aquí se planta el corredor con la técnica de la casa: dosel = copas masa por
  // grumos de lóbulos (2 draw calls por grumo, da igual cuántos árboles) que se
  // CIERRAN sobre el camino; troncos = UN solo InstancedMesh con color por
  // instancia (corteza húmeda ↔ musgo). La especie fina (encenillo, aliso,
  // gaque…) es de la tarea vecina — esto es el DOSEL y su penumbra.
  const troncosNiebla = [];
  {
    // filas POR LADO y en orden de pista: así los troncos consecutivos del
    // array son vecinos reales y las bandas del dosel pueden fundirse.
    // El offset de la fila interna es RELATIVO al ancho local de la vía
    // (offset fijo rechazaba media fila donde la vía es ancha y el corredor
    // quedaba ralo).
    const derX = (i) => Math.sin(pista.HDG[i]);
    const derZ = (i) => -Math.cos(pista.HDG[i]);
    for (const lado of [-1, 1]) {
      for (let i = 0; i < pista.n; i += 12) {
        if (pista.ZON[i] !== ZONA.NIEBLA) continue;
        const filas = [{ off: pista.W[i] + 2.0 + Math.random() * 2.8, fila: 'in' }];
        if (i % 24 === 0) filas.push({ off: pista.W[i] + 7.5 + Math.random() * 8.5, fila: 'out' });
        for (const { off, fila } of filas) {
          const x = pista.PX[i] + derX(i) * off * lado;
          const z = pista.PZ[i] + derZ(i) * off * lado;
          if (x < pista.x0 + 4 || x > pista.x1 - 4 || z < pista.z0 + 4 || z > pista.z1 - 4) continue;
          const info = pista.infoLocal(x, z);
          if (Math.abs(info.lat) < info.w + 1.6) continue; // nunca dentro de la banda
          troncosNiebla.push({
            x, z, y: pista.alturaMundo(x, z),
            alto: 4.4 + Math.random() * 3.2,
            lado, fila, giro: Math.random() * Math.PI * 2,
          });
        }
      }
    }
  }
  if (troncosNiebla.length) {
    // troncos: 1 InstancedMesh, color por instancia = musgo trepando la corteza
    const geoT = new THREE.CylinderGeometry(0.13, 0.21, 1, 7);
    geoT.translate(0, 0.5, 0); // base en el origen: la instancia escala en Y
    const matT = new THREE.MeshStandardMaterial({ roughness: 0.98, metalness: 0 });
    const troncos = new THREE.InstancedMesh(geoT, matT, troncosNiebla.length);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e3 = new THREE.Euler();
    const v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
    const corteza = new THREE.Color(0x4f3e2c), musgo = new THREE.Color(0x3f5a34);
    const cTmp = new THREE.Color();
    troncosNiebla.forEach((t, k) => {
      e3.set((Math.random() - 0.5) * 0.10, t.giro, (Math.random() - 0.5) * 0.12);
      q4.setFromEuler(e3);
      const grosor = 0.85 + Math.random() * 0.5;
      m4.compose(v3.set(t.x, t.y - 0.05, t.z), q4, s3.set(grosor, t.alto, grosor));
      troncos.setMatrixAt(k, m4);
      cTmp.copy(corteza).lerp(musgo, 0.25 + Math.random() * 0.6);
      troncos.setColorAt(k, cTmp);
    });
    troncos.name = 'troncos-niebla';
    troncos.receiveShadow = true;
    if (troncos.instanceColor) troncos.instanceColor.needsUpdate = true;
    troncos.computeBoundingSphere();
    grupoFlora.add(troncos);

    // dosel CERRADO: por cada grumo de ~9 troncos, UNA copa masa multi-lóbulo
    // (2 draw calls por grumo). Los lóbulos NO son una paleta por tronco: son
    // BANDAS — uno cada dos troncos, grande y solapado con el vecino — más
    // lóbulos que se descuelgan sobre el camino (túnel) y remates altos que
    // rompen la línea del techo. Así la silueta lee como MASA continua.
    const porGrumo = 9;
    for (let g0 = 0; g0 < troncosNiebla.length; g0 += porGrumo) {
      const grumo = troncosNiebla.slice(g0, g0 + porGrumo);
      let ox = 0, oy = Infinity, oz = 0;
      for (const t of grumo) { ox += t.x; oz += t.z; oy = Math.min(oy, t.y); }
      ox /= grumo.length; oz /= grumo.length;
      const esferas = [];
      for (let k = 0; k < grumo.length; k++) {
        const t = grumo[k];
        const sig = grumo[k + 1];
        // copa SOBRE cada tronco (ningún poste desnudo), con alto y radio
        // variados para que el techo del bosque no sea una línea recta
        esferas.push({
          c: [t.x - ox + (Math.random() - 0.5) * 1.2, t.y - oy + t.alto - 0.4 + (Math.random() - 0.3) * 1.2, t.z - oz + (Math.random() - 0.5) * 1.2],
          r: 2.0 + Math.random() * 0.8,
          esc: [1.35, 0.7, 1.35],
        });
        // banda puente SOLO si el vecino real queda lejos (cierra el hueco)
        if (sig && sig.lado === t.lado && sig.fila === t.fila) {
          const dx = sig.x - t.x, dz = sig.z - t.z;
          if (dx * dx + dz * dz > 56) {
            esferas.push({
              c: [(t.x + sig.x) / 2 - ox, (t.y + sig.y) / 2 - oy + (t.alto + sig.alto) / 2 - 0.7, (t.z + sig.z) / 2 - oz],
              r: 1.8 + Math.random() * 0.7,
              esc: [1.5, 0.6, 1.5],
            });
          }
        }
        if (t.fila === 'in' && Math.random() < 0.3) {
          // lóbulo que se descuelga sobre el camino: túnel de dosel.
          // lat = (centro − punto)·derecha ⇒ moverse +derecha·signo(lat) acerca a la vía
          const info = pista.infoLocal(t.x, t.z);
          const s = Math.sign(info.lat) || 1;
          const paso = Math.max(0, Math.abs(info.lat) - info.w * 0.35) * 0.7;
          const vx = t.x + Math.sin(info.hdg) * s * paso;
          const vz = t.z - Math.cos(info.hdg) * s * paso;
          // pegado a la línea de copas (no un platillo flotante visto desde abajo)
          esferas.push({
            c: [vx - ox, t.y - oy + t.alto - 0.25, vz - oz],
            r: 1.7 + Math.random() * 0.8,
            esc: [1.45, 0.7, 1.45],
          });
        }
      }
      const copa = crearCopaMasa(THREE, {
        seed: 5000 + g0, tex: texNiebla, esferas, maxCards: 420, brillo: 0.12,
      });
      copa.grupo.position.set(ox, oy, oz);
      aplicarVientoMundo(copa.matCards, { amplitud: 0.11, piso: 3.4, velocidad: 0.95 });
      aplicarVientoMundo(copa.matNucleo, { amplitud: 0.07, piso: 3.4, velocidad: 0.9 });
      // 150 y no 260: la niebla base de la zona ya borra el dosel a esa
      // distancia (transmitancia <1%) — cullear antes es FPS gratis
      ajustarVisibilidadFlora(copa.grupo, 150);
      grupoFlora.add(copa.grupo);
    }

    // sotobosque: el piso del bosque de niebla estaba en carbón pelado — los
    // parches de pasto de arriba excluyen la zona NIEBLA. Musgo y hierba baja.
    const ptosSoto = [];
    for (const t of troncosNiebla) {
      ptosSoto.push({ x: t.x + (Math.random() - 0.5) * 3, y: t.y, z: t.z + (Math.random() - 0.5) * 3 });
      // segunda mata corrida hacia el borde del camino: verde contra la tierra
      const info = pista.infoLocal(t.x, t.z);
      const sv = Math.sign(info.lat) || 1;
      const paso = Math.max(0, Math.abs(info.lat) - info.w - 0.7);
      const sx = t.x + Math.sin(info.hdg) * sv * paso * 0.8;
      const sz = t.z - Math.cos(info.hdg) * sv * paso * 0.8;
      ptosSoto.push({ x: sx, y: pista.alturaMundo(sx, sz), z: sz });
    }
    if (ptosSoto.length) {
      const pSoto = crearParchePasto(grupoFlora, {
        puntos: ptosSoto,
        densidad: 6, altura: [0.2, 0.6], colorBase: '#35542f', colorPunta: '#6a8a52',
        viento: 0.5, combado: 0.34, segmentos: 4, radio: 0.9,
      });
      if (pSoto && pSoto.mesh) pSoto.mesh.name = 'sotobosque-niebla';
    }
  }


  // ── 4c) chorrera: LA GARGANTA VERTICAL (reencargo "como el dron") ─────────
  // En el video las paredes del cañón son MASA VERDE vertical y el horizonte
  // no existe: todo encuadre remata en selva. Tres piezas, todas gateadas:
  // cortinas de dosel trepando las paredes, la selva que abraza el farallón
  // de la madre, y un telón lejano pre-brumado que cierra el cielo.
  let veloMatRef = null;
  let chorrosMatRef = null;
  if (mundoChorrera) {
    // — cortinas de selva: un grumo multi-lóbulo (2 dc) por ~50 m y por lado,
    //   con filas a distintas alturas de la falda → el muro lee como dosel
    //   apilado, no como loma de pasto.
    const pasoSeg = Math.round(pista.n * 0.031);
    for (const lado of [-1, 1]) {
      for (let i0 = Math.round(pista.n * 0.072); i0 < pista.n * 0.545; i0 += pasoSeg) {
        const puntos = [];
        for (let k = 0; k < 7; k++) {
          const i = Math.min(pista.n - 1, i0 + Math.round((k / 7) * pasoSeg));
          const derX = Math.sin(pista.HDG[i]), derZ = -Math.cos(pista.HDG[i]);
          const filas = cfg.movil ? [7, 17] : [6, 12, 19, 26];
          for (const offBase of filas) {
            if (Math.random() < 0.35) continue;
            const off = (pista.W[i] + offBase + Math.random() * 3.5) * lado;
            const x = pista.PX[i] + derX * off;
            const z = pista.PZ[i] + derZ * off;
            if (x < pista.x0 + 6 || x > pista.x1 - 6 || z < pista.z0 + 6 || z > pista.z1 - 6) continue;
            puntos.push({ x, y: pista.alturaMundo(x, z), z });
          }
        }
        if (puntos.length < 3) continue;
        let ox = 0, oz = 0, oy = Infinity;
        for (const p of puntos) { ox += p.x; oz += p.z; oy = Math.min(oy, p.y); }
        ox /= puntos.length; oz /= puntos.length;
        const esferas = puntos.map((p) => ({
          c: [p.x - ox + (Math.random() - 0.5) * 2, p.y - oy + 0.6 + Math.random() * 1.4, p.z - oz + (Math.random() - 0.5) * 2],
          r: 2.6 + Math.random() * 1.8,
          esc: [1.5, 0.78, 1.5],
        }));
        const copa = crearCopaMasa(THREE, { seed: 7000 + i0 * 3 + lado, tex: texBosque, esferas, maxCards: 380, brillo: 0.1 });
        copa.grupo.position.set(ox, oy, oz);
        copa.grupo.name = `cortina-selva-${lado}-${i0}`;
        aplicarVientoMundo(copa.matCards, { amplitud: 0.10, piso: 3.0, velocidad: 0.9 });
        aplicarVientoMundo(copa.matNucleo, { amplitud: 0.06, piso: 3.0, velocidad: 0.85 });
        ajustarVisibilidadFlora(copa.grupo, cfg.movil ? 200 : 330);
        grupoFlora.add(copa.grupo);
      }
    }

    // — la selva ABRAZA a la madre: mechones sobre la ceja y flancos colgantes
    //   para que el farallón no se lea como cartón recortado (en f_12 la roca
    //   solo asoma detrás del agua; el resto es verde).
    const madre = chorrera?.madre;
    if (madre) {
      const H = madre.yTop - madre.yBase;
      const esfM = [];
      for (let k = -4; k <= 4; k++) {
        const along = (k / 4) * madre.halfW * 0.98;
        esfM.push({
          c: [
            madre.ax * along + madre.nx * (1.5 + Math.random() * 2),
            H - 2.5 + (Math.random() - 0.4) * 4,
            madre.az * along + madre.nz * (1.5 + Math.random() * 2),
          ],
          r: 4.5 + Math.random() * 2.5,
          esc: [1.6, 0.8, 1.6],
        });
      }
      for (const s of [-1, 1]) {
        for (const vv of [0.3, 0.52, 0.74]) {
          esfM.push({
            c: [
              madre.ax * s * madre.halfW + madre.nx * 3,
              H * vv,
              madre.az * s * madre.halfW + madre.nz * 3,
            ],
            r: 3.6 + Math.random() * 2.2,
            esc: [1.2, 1.5, 1.2], // los flancos cuelgan VERTICALES
          });
        }
      }
      const copaM = crearCopaMasa(THREE, { seed: 8117, tex: texBosque, esferas: esfM, maxCards: 420, brillo: 0.1 });
      copaM.grupo.position.set(madre.cx, madre.yBase, madre.cz);
      copaM.grupo.name = 'selva-madre';
      aplicarVientoMundo(copaM.matCards, { amplitud: 0.08, piso: 3.2, velocidad: 0.85 });
      aplicarVientoMundo(copaM.matNucleo, { amplitud: 0.05, piso: 3.2, velocidad: 0.8 });
      // sin culler de distancia: es el remate del encuadre del clímax
      grupoFlora.add(copaM.grupo);
    }

    // ── VELO DE AGUA EN LA PARED: la cortina continua que el kart ve ──────────
    // En el video del dron el agua CUBRE la pared de la garganta: el jugador
    // baja junto a un muro blanco que se derrama. Un velo semi-transparente
    // grande y animado sobre la cara de la pared vende esa sensación.
    {
      // velos por tramo: cada uno cubre ~50% del beat, dejando roca expuesta
      const VELOS = [
        { f0: 0.075, f1: 0.130, lado: -1, hBase: 0, hTop: 28, w: 14 },   // beat 1→2a
        { f0: 0.130, f1: 0.210, lado: 1, hBase: 0, hTop: 35, w: 18 },    // beat 2→3 (gran salto)
        { f0: 0.260, f1: 0.325, lado: -1, hBase: 0, hTop: 22, w: 12 },   // beat 4→5
        { f0: 0.430, f1: 0.500, lado: 1, hBase: 0, hTop: 30, w: 16 },    // diagonal→clímax
      ];
      const veloMat = new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying float vY;
          void main() {
            vUv = uv;
            vY = position.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec2 vUv;
          varying float vY;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float noise(vec2 p){
            vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
          }
          void main() {
            vec2 uv = vUv;
            // cascada vertical: líneas que caen
            float fall = noise(vec2(uv.x * 8.0, uv.y * 3.0 - uTime * 0.8));
            float fall2 = noise(vec2(uv.x * 14.0 + 3.0, uv.y * 5.0 - uTime * 1.1));
            float stripe = smoothstep(0.3, 0.7, fall * 0.6 + fall2 * 0.4);
            // espuma donde golpea (parte baja)
            float baseFoam = smoothstep(0.0, 0.12, uv.y) * (1.0 - smoothstep(0.12, 0.25, uv.y));
            baseFoam *= noise(vec2(uv.x * 20.0, uTime * 0.5)) * 0.8;
            // brillo del agua cayendo
            float bright = stripe * 0.45 + baseFoam * 0.7;
            vec3 col = mix(vec3(0.56, 0.68, 0.64), vec3(0.92, 0.96, 0.94), bright);
            // fade arriba y abajo
            float alpha = smoothstep(1.0, 0.85, uv.y) * smoothstep(0.0, 0.06, uv.y);
            alpha *= 0.35 + stripe * 0.35;
            gl_FragColor = vec4(col, alpha);
          }
        `,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false, // shader sin fog_fragment; fog:true crashea refreshFogUniforms (uniforms sin fogColor)
      });
      veloMatRef = veloMat;
      const velosMeshes = [];
      for (const v of VELOS) {
        const pasos = Math.max(2, Math.round((v.f1 - v.f0) * pista.n / 6));
        const verts = [];
        const uvs = [];
        const idx = [];
        for (let k = 0; k <= pasos; k++) {
          const f = v.f0 + (v.f1 - v.f0) * (k / pasos);
          const info = pista.infoLocal(
            pista.PX[Math.round(f * pista.n)] ?? pista.PX[0],
            pista.PZ[Math.round(f * pista.n)] ?? pista.PZ[0],
          );
          const q = pista.puntoEn(f);
          const latPared = (q.w + 5 + Math.random() * 3) * v.lado;
          const nx = Math.sin(q.hdg), nz = -Math.cos(q.hdg);
          const bx = q.x + nx * latPared;
          const bz = q.z + nz * latPared;
          const by = pista.alturaMundo(bx, bz);
          verts.push(bx, by + v.hBase, bz, bx, by + v.hTop, bz);
          uvs.push(k / pasos, 0, k / pasos, 1);
          if (k > 0) {
            const b = k * 2;
            idx.push(b - 2, b - 1, b, b - 1, b + 1, b);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, veloMat);
        mesh.name = `velo-agua-${v.f0}`;
        mesh.frustumCulled = false;
        mesh.renderOrder = 21;
        grupo.add(mesh);
        velosMeshes.push(mesh);
      }
    }

    // ── CHORRERAS EN LA PARED: chorros verticales entre beats ────────────────
    // En el video del dron hay chorros de agua que salen de la pared entre cada
    // escalón — el kart baja junto a unapared que GOTEA por todos lados.
    {
      const CHORROS = [
        { f: 0.100, lado: -1, h: 14, ancho: 2.5 },  // entre beat 1 y 2a
        { f: 0.145, lado: 1, h: 10, ancho: 2.0 },   // entre beat 2a y 2b
        { f: 0.185, lado: 1, h: 18, ancho: 3.5 },   // entre beat 2b y 3
        { f: 0.240, lado: -1, h: 12, ancho: 2.0 },  // entre beat 3 y 4
        { f: 0.295, lado: -1, h: 10, ancho: 2.0 },  // entre beat 4 y 5
        { f: 0.360, lado: 1, h: 8, ancho: 1.8 },    // diagonal temprana
        { f: 0.460, lado: -1, h: 20, ancho: 4.0 },  // antes del clímax
      ];
      const chorrosMat = new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec2 vUv;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float noise(vec2 p){
            vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
          }
          void main() {
            vec2 uv = vUv;
            float fall = noise(vec2(uv.x * 4.0, uv.y * 6.0 - uTime * 1.2));
            float stripe = smoothstep(0.25, 0.65, fall);
            float alpha = stripe * 0.5 * smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.88, uv.y);
            vec3 col = mix(vec3(0.55, 0.67, 0.63), vec3(0.88, 0.94, 0.92), stripe * 0.6);
            gl_FragColor = vec4(col, alpha);
          }
        `,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false, // shader sin fog_fragment; fog:true crashea refreshFogUniforms (uniforms sin fogColor)
      });
      const chorrosMeshes = [];
      for (const ch of CHORROS) {
        const q = pista.puntoEn(ch.f);
        const nx = Math.sin(q.hdg), nz = -Math.cos(q.hdg);
        const latPared = (q.w + 4) * ch.lado;
        const bx = q.x + nx * latPared;
        const bz = q.z + nz * latPared;
        const by = pista.alturaMundo(bx, bz);
        const geo = new THREE.PlaneGeometry(ch.ancho, ch.h, 1, 6);
        geo.rotateX(Math.PI);
        const mesh = new THREE.Mesh(geo, chorrosMat);
        mesh.position.set(bx, by + ch.h * 0.5, bz);
        mesh.rotation.y = Math.atan2(nx, nz);
        mesh.name = `chorro-pared-${ch.f}`;
        mesh.frustumCulled = false;
        mesh.renderOrder = 21;
        grupo.add(mesh);
        chorrosMeshes.push(mesh);
      }
      chorrosMatRef = chorrosMat;
    }

    // — telón de garganta: dos crestas de selva pre-brumadas que cierran el
    //   horizonte. fog:false a propósito — el FogExp2 borraría cualquier cosa
    //   a 400 m; acá la perspectiva aérea va HORNEADA en el color del vértice.
    const cxT = (pista.x0 + pista.x1) / 2, czT = (pista.z0 + pista.z1) / 2;
    const anillos = [
      { r: 340, hTop: 190, cAbajo: 0x2c4136, cArriba: 0x7f9a88, sd: 3 },
      { r: 452, hTop: 228, cAbajo: 0x4a6656, cArriba: 0x9db3a0, sd: 11 },
    ];
    for (const an of anillos) {
      const SEGT = 96;
      const posT = [], colT = [], idxT = [];
      const abajo = new THREE.Color(an.cAbajo), arriba = new THREE.Color(an.cArriba);
      const cT = new THREE.Color();
      for (let i = 0; i <= SEGT; i++) {
        const ang = (i / SEGT) * Math.PI * 2;
        const nx = Math.cos(ang), nz = Math.sin(ang);
        const jag = hashP(i * 2.13 + an.sd, an.sd * 1.7) * 0.6
          + hashP(i * 7.31 + an.sd, an.sd) * 0.4;
        const hTop = an.hTop * (0.7 + 0.3 * jag);
        posT.push(cxT + nx * an.r, -10, czT + nz * an.r);
        posT.push(cxT + nx * an.r, hTop, czT + nz * an.r);
        cT.copy(abajo); colT.push(cT.r, cT.g, cT.b);
        cT.copy(abajo).lerp(arriba, 0.8 + 0.2 * jag); colT.push(cT.r, cT.g, cT.b);
        if (i > 0) {
          const b = i * 2;
          idxT.push(b - 2, b, b - 1, b - 1, b, b + 1);
        }
      }
      const geoT = new THREE.BufferGeometry();
      geoT.setAttribute('position', new THREE.Float32BufferAttribute(posT, 3));
      geoT.setAttribute('color', new THREE.Float32BufferAttribute(colT, 3));
      geoT.setIndex(idxT);
      const telon = new THREE.Mesh(geoT, new THREE.MeshBasicMaterial({
        vertexColors: true, fog: false, side: THREE.DoubleSide,
      }));
      telon.name = `telon-garganta-${an.r}`;
      grupo.add(telon);
    }
  }

  // bruma volumétrica: jirones ENTRE los troncos + haces de luz del dosel.
  // El FogExp2 de abajo tapa el fondo; esto pone la niebla ADENTRO del bosque.
  // ?bruma=0 la apaga (gate antes/después con el mismo encuadre).
  let bruma = null;
  const brumaOff = typeof location !== 'undefined'
    && new URLSearchParams(location.search).get('bruma') === '0';
  if (!brumaOff) {
    // La bruma real no es un velo parejo: anda en BANCOS — parches densos con
    // aire claro entre ellos. Anclas = un tronco de cada tantos (banco entre
    // los árboles) + algunos puntos sobre el camino (el kart los atraviesa) +
    // ecos ralos en el bosque andino.
    const ptosBruma = [];
    for (let k = 2; k < troncosNiebla.length; k += 7) {
      const t = troncosNiebla[k];
      ptosBruma.push({ x: t.x, y: t.y, z: t.z });
    }
    for (let i = 0; i < pista.n; i += 8) {
      const zona = pista.ZON[i];
      if (zona === ZONA.BOSQUE && i % 48 === 0) {
        const pt = puntoLateral(i, 5, 24, 6);
        if (pt) ptosBruma.push(pt);
      }
      if (zona === ZONA.NIEBLA && i % 80 === 0) {
        const x = pista.PX[i], z = pista.PZ[i];
        ptosBruma.push({ x, z, y: pista.alturaMundo(x, z) });
      }
    }
    if (ptosBruma.length) {
      bruma = crearBrumaVolumetrica(THREE, {
        puntos: ptosBruma,
        jirones: Math.round(110 * follajeF),
        haces: cfg.movil ? 7 : 12,
        dispersion: 5.5,
        solDir,
        seed: 47,
      });
      grupo.add(bruma.grupo);
    }
  }

  // ── 5) actualizar: niebla según la zona del kart ───────────────────────────
  // fog exp2: density alta = niebla cerrada. Objetivos por zona.
  const NIEBLA_ZONA = {
    [ZONA.PARAMO_ALTO]: { densidad: 0.0065, color: 0xcbd6c2 },
    [ZONA.TRANSICION]: { densidad: 0.009, color: 0xc2cdbc },
    [ZONA.BOSQUE]: { densidad: 0.013, color: 0x9db39a },
    // 0.030 tapaba el 96% a 60 m: la "niebla" era pura cortina de fondo. Con la
    // bruma volumétrica adentro (jirones/bancos), la cortina base baja y el
    // bosque gana profundidad: se ve LEJOS a través de CAPAS, no contra un telón.
    [ZONA.NIEBLA]: { densidad: 0.016, color: 0xaabdc0 },
    [ZONA.SUBIDA]: { densidad: 0.007, color: 0xc8d4c0 },
  };
  // niebla del cañón: verdosa y con cuerpo, nunca telón blanco
  const NIEBLA_CHORRERA = {
    [ZONA.PARAMO_ALTO]: { densidad: 0.0048, color: 0xc2d2bc },
    [ZONA.TRANSICION]: { densidad: 0.0075, color: 0xb4c9ae },
    [ZONA.BOSQUE]: { densidad: 0.0078, color: 0x9cb795 },
    [ZONA.NIEBLA]: { densidad: 0.0105, color: 0xa4c0b0 },
    [ZONA.SUBIDA]: { densidad: 0.0062, color: 0xafc5ab },
  };
  const gateChorrera = typeof location !== 'undefined'
    && new URLSearchParams(location.search).get('vista') === 'chorrera'
    && new URLSearchParams(location.search).get('gateReal') !== '1';
  const cActual = new THREE.Color();
  let densidad = 0.0065;
  let tViento = 0;
  function actualizar(dt, s) {
    tViento += dt;
    tickVientoMundos(tViento);
    if (chorrera) chorrera.update(tViento);
    if (veloMatRef) veloMatRef.uniforms.uTime.value = tViento;
    if (chorrosMatRef) chorrosMatRef.uniforms.uTime.value = tViento;
    // El invitado recibe la física del anfitrión por snapshot; durante el
    // primer frame puede todavía no traer `info`. Mantener la zona base evita
    // que una ausencia transitoria mate su loop de render.
    const tabla = mundoChorrera ? NIEBLA_CHORRERA : NIEBLA_ZONA;
    const meta = gateChorrera
      ? { densidad: 0.0022, color: 0x718b7b }
      : (tabla[s.info?.zona ?? ZONA.PARAMO_ALTO] ?? tabla[ZONA.PARAMO_ALTO]);
    densidad += (meta.densidad - densidad) * (1 - Math.exp(-1.6 * dt));
    niebla.density = densidad;
    cActual.setHex(meta.color);
    niebla.color.lerp(cActual, 1 - Math.exp(-2.2 * dt));
    // cielo se aclara un poco con la niebla para que no se vea el "tapón"
    const t = Math.min(1, densidad / 0.03);
    skyU.turbidity.value = gateChorrera ? 9.5 : (mundoChorrera ? 10 : 4 + t * 8);
    if (mundoChorrera) skyU.rayleigh.value = 0.9;
    if (gateChorrera) {
      skyU.rayleigh.value = 1.35;
      skyU.mieCoefficient.value = 0.0025;
    }
    if (bruma) bruma.tick(dt);

    const px = s.x;
    const pz = s.z;
    for (const obj of floraCercana) {
      const dx = obj.position.x - px;
      const dz = obj.position.z - pz;
      obj.visible = (dx * dx + dz * dz) <= obj.userData.maxDist2;
    }
  }

  return {
    actualizar,
    luzSol,
    niebla,
    bruma,
    sky,
    _fraj: puestosF,
    _arb: puestosA,
    chorrera,
  };
}
