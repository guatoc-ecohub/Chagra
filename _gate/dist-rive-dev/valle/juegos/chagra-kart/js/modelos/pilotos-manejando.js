// ── pilotos-manejando.js — pilotos rubber-hose que MANEJAN (Chagra Kart) ────
// Factory pura + API de pose continua. No toca el motor ni los vehículos:
// el cableado lo hace el orquestador.
//
//   import { montarPilotoManejando, aplicarPose } from './modelos/pilotos-manejando.js';
//   const veh = crearLoboGris(THREE);                 // cualquier factory de modelos/
//   const piloto = montarPilotoManejando(THREE, veh, { tipo: 'jaguar' });
//   // cada frame:
//   aplicarPose(piloto, { giro, salto, turbo, velocidad });   // todo 0..1 (giro -1..1)
//
// Qué hace:
//   · Manos con guante que agarran EL volante / manubrio / mangos reales del
//     vehículo: los puntos de agarre se muestrean de la malla del vehículo en
//     vivo (torus del volante, puños de la moto, mangos de la carretilla), así
//     que si el motor gira el volante, las manos giran con él.
//   · Brazos y piernas de manguera (tubo bezier deformable, sin codos): se
//     estiran y se comban de forma continua entre el hombro y el agarre.
//   · Inclinación hacia AFUERA de la curva, cabeza mirando a dónde va.
//   · Cara continua: susto (aterrizaje, auto-disparada al caer) y gozo (turbo).
//   · Orejas, antenas, alas, cola y baba al viento según la velocidad.
//
// Convención: el piloto se construye mirando +Z local; el anclaPiloto de cada
// vehículo ya trae rotation.y = PI/2 para que quede mirando +X del vehículo.
// giro > 0 = curva a la derecha (el cuerpo se echa a la izquierda, afuera).

import {
  PALETA_BENEFICOS, RASGOS_BENEFICOS, esBenefico, construirBenefico, materialesOjo,
} from './pilotos-beneficos.js';
import {
  RASGOS_COMPAI, esCompai, construirCompai,
} from './pilotos-compai.js';
// La PIEL de los 6 con rig en la fábrica del valle (compai/rigs/*), resuelta
// por build-piel-kart.mjs desde los MISMOS defs.svg/rig.svg que pintan al
// compai. F25: el kart consume la fábrica, no re-copia hexes a mano.
import { PIEL_RIGS } from './piel-rigs.js';

// ── utilidades ──────────────────────────────────────────────────────────────

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function mat(THREE, color, rough = 0.82, metal = 0.03) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

// tubo bezier deformable: la geometría se recalcula al aplicar pose (rubber-hose)
// La columna de costura va DUPLICADA (cols = lados + 1): mismo punto en el espacio,
// pero u=0 y u=1, que es lo que deja mapear una textura alrededor del tubo sin que
// el último quad se coma el atlas entero. No cambia el conteo de triángulos.
function crearManguera(THREE, material, r0, r1, anillos = 9, lados = 7) {
  const cols = lados + 1;
  const nv = anillos * cols;
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const idx = [];
  for (let i = 0; i < anillos - 1; i++) {
    for (let j = 0; j < lados; j++) {
      const a = i * cols + j;
      const b = i * cols + j + 1;
      const c = (i + 1) * cols + j;
      const d = (i + 1) * cols + j + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  for (let i = 0; i < anillos; i++) {
    for (let j = 0; j < cols; j++) {
      const k = i * cols + j;
      uv[k * 2] = j / lados;
      uv[k * 2 + 1] = i / (anillos - 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  // esfera fija y generosa: evita recomputar bounds por frame y el culling malo
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 4);
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  return { mesh, geo, anillos, lados, cols, r0, r1 };
}

const _P = [null, null, null, null, null]; // scratch Vector3, se crean del constructor del input

function vec3Pool(ref, n) {
  if (!_P[n]) _P[n] = new ref.constructor();
  return _P[n];
}

// actualiza la manguera a lo largo del bezier a→(control c)→b, radio r0→r1
function actualizarManguera(m, a, c, b) {
  const posAttr = m.geo.attributes.position;
  const norAttr = m.geo.attributes.normal;
  const p = vec3Pool(a, 0);
  const tang = vec3Pool(a, 1);
  const n = vec3Pool(a, 2);
  const bn = vec3Pool(a, 3);
  const prevN = vec3Pool(a, 4).set(0, 0, 0);
  const seg = m.anillos - 1;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const u = 1 - t;
    p.set(
      u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      u * u * a.y + 2 * u * t * c.y + t * t * b.y,
      u * u * a.z + 2 * u * t * c.z + t * t * b.z
    );
    tang.set(
      2 * u * (c.x - a.x) + 2 * t * (b.x - c.x),
      2 * u * (c.y - a.y) + 2 * t * (b.y - c.y),
      2 * u * (c.z - a.z) + 2 * t * (b.z - c.z)
    );
    if (tang.lengthSq() < 1e-10) tang.set(0, -1, 0);
    tang.normalize();
    if (i === 0 || prevN.lengthSq() < 1e-8) {
      // normal inicial: cualquiera perpendicular estable
      if (Math.abs(tang.y) < 0.92) prevN.set(0, 1, 0);
      else prevN.set(1, 0, 0);
    }
    // transporte paralelo: proyecta la normal previa al plano ⟂ tangente
    n.copy(prevN).addScaledVector(tang, -prevN.dot(tang));
    if (n.lengthSq() < 1e-8) n.set(tang.y, tang.z, tang.x);
    n.normalize();
    bn.crossVectors(tang, n);
    prevN.copy(n);
    const r = lerp(m.r0, m.r1, t);
    const cols = m.cols ?? m.lados;
    for (let j = 0; j < cols; j++) {
      const ang = (j / m.lados) * Math.PI * 2;
      const co = Math.cos(ang) * r;
      const si = Math.sin(ang) * r;
      const k = i * cols + j;
      posAttr.setXYZ(k, p.x + n.x * co + bn.x * si, p.y + n.y * co + bn.y * si, p.z + n.z * co + bn.z * si);
      norAttr.setXYZ(k, (n.x * co + bn.x * si) / r, (n.y * co + bn.y * si) / r, (n.z * co + bn.z * si) / r);
    }
  }
  posAttr.needsUpdate = true;
  norAttr.needsUpdate = true;
}

// ── paleta del elenco (misma familia cromática del elenco canónico) ─────────

export const PALETA = {
  // Los 6 con rig en la fábrica visten la piel de F24 tal cual la resuelve
  // build-piel-kart.mjs — mismo defs.svg/rig.svg que el valle, cero copias.
  angelita: { ...PIEL_RIGS.angelita },
  jaguar: { ...PIEL_RIGS.jaguar },
  oso: { ...PIEL_RIGS.oso },
  zariguya: { ...PIEL_RIGS.zariguya },
  luciernaga: { ...PIEL_RIGS.luciernaga },
  chivito: { ...PIEL_RIGS.chivito },
  // F24 resolvió el punk como ESTADO del mismo chivito (alias en RIG_DE /
  // portales / marco); acá igual: una sola piel, la cresta cambia al hablar.
  'chivito-punk': { ...PIEL_RIGS.chivito },
  // Dante y Oliver todavía no tienen rig en la fábrica (marcador pendiente
  // arte de F24): conservan su piel de perro real de F19.
  dante: { cuerpo: 0xcaa46b, cuerpo2: 0xf2ead6, cabeza: 0xcaa46b, detalle: 0x7c5532 },
  oliver: { cuerpo: 0xf2efea, cuerpo2: 0xf7f4ed, cabeza: 0xf2efea, detalle: 0x1b1b1e },
  // los tres controladores biológicos viven en pilotos-beneficos.js
  ...PALETA_BENEFICOS,
};

const tiposSinPaletaAdvertidos = new Set();

// valores por defecto = exactamente los del elenco original; los bichos los
// pisan desde RASGOS_BENEFICOS. Así el elenco viejo no cambia ni un triángulo.
const OJO_BASE = { r: 0.052, rPupila: 0.024, cejaW: 0.07, cejaH: 0.018, cejaDZ: 0.005 };

// ── piel felina procedural (Panthera onca) ─────────────────────────────────
// El jaguar se reconoce por el PATRÓN, no por la silueta: una roseta NO es una
// mancha, es un anillo ROTO de manchones con uno o dos puntos adentro y el
// centro más rojizo que el fondo. Por eso va en textura y no en geometría: el
// patrón correcto cuesta 0 triángulos, y en geometría costaría cientos.
// El patrón además degrada por zona, como en el animal real: rosetas en el
// lomo y los flancos, manchas SÓLIDAS en cabeza y patas, anillos en la cola.

// Los tres tonos salen de la piel F24 del rig (gPelaje + la roseta del
// defs.svg), no de memoria: pelaje de fondo, campo interior de la roseta
// (más rojizo) y la tinta del anillo.
const cssHex = (n) => '#' + n.toString(16).padStart(6, '0');
const PIEL = {
  base: cssHex(PIEL_RIGS.jaguar.extras.pielBase),
  centro: cssHex(PIEL_RIGS.jaguar.extras.pielCentro),
  tinta: cssHex(PIEL_RIGS.jaguar.extras.pielTinta),
};

function rng(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// elipse dibujada nueve veces (offsets ±W) para que el tile cierre sin costura
function manchon(ctx, x, y, rx, ry, rot, W) {
  for (let dx = -W; dx <= W; dx += W) {
    for (let dy = -W; dy <= W; dy += W) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y + dy, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Una roseta tiene que leerse como ANILLO a tamaño de personaje, no como un
// puñado de puntitos: los manchones van gruesos y solapados, el hueco marcado
// y el interior claramente más rojizo que el fondo.
function roseta(ctx, x, y, r, W, rnd) {
  ctx.fillStyle = PIEL.centro;
  manchon(ctx, x, y, r * 0.78, r * 0.68, rnd() * 3, W);
  ctx.fillStyle = PIEL.tinta;
  const n = 6 + Math.floor(rnd() * 2);
  const hueco = rnd() * Math.PI * 2;      // el anillo va ROTO: eso lo hace roseta
  const anchoHueco = 0.5 + rnd() * 0.35;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.22;
    let d = a - hueco;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (Math.abs(d) < anchoHueco) continue;
    const rr = r * (0.76 + rnd() * 0.14);
    manchon(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr,
      r * 0.42, r * 0.30, a + Math.PI / 2, W);
  }
  const puntos = 1 + Math.floor(rnd() * 2);   // y puntos ADENTRO
  for (let i = 0; i < puntos; i++) {
    manchon(ctx, x + (rnd() - 0.5) * r * 0.5, y + (rnd() - 0.5) * r * 0.5,
      r * 0.19, r * 0.15, rnd() * 3, W);
  }
}

function manchaSolida(ctx, x, y, r, W, rnd) {
  ctx.fillStyle = PIEL.tinta;
  const lob = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < lob; i++) {
    manchon(ctx, x + (rnd() - 0.5) * r * 0.7, y + (rnd() - 0.5) * r * 0.7,
      r * (0.5 + rnd() * 0.3), r * (0.36 + rnd() * 0.24), rnd() * 3, W);
  }
}

// grilla jittereada con filas alternadas: reparte sin alinearse a ojo
function sembrar(ctx, W, filas, cols, r, semilla, dibujar) {
  const rnd = rng(semilla);
  const px = W / cols;
  const py = W / filas;
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5 + (f % 2) * 0.5) * px + (rnd() - 0.5) * px * 0.42;
      const y = (f + 0.5) * py + (rnd() - 0.5) * py * 0.42;
      dibujar(ctx, x, y, r * (0.82 + rnd() * 0.36), W, rnd);
    }
  }
}

function comoTextura(THREE, canvas, rx, ry) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = 4;
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// veta de pelaje: pelos cortos en dos tonos sobre el fondo, tileables (los
// trazos cerca del borde se repiten con offsets ±W, igual que manchon). Es lo
// que separa "pelaje con textura" de "plástico liso" sin costar un triángulo.
function vetas(ctx, W, semilla, n = 900) {
  const rnd = rng(semilla);
  ctx.save();
  ctx.lineWidth = Math.max(1, W / 512);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const y = rnd() * W;
    const largo = W * (0.012 + rnd() * 0.02);
    const ang = Math.PI / 2 + (rnd() - 0.5) * 0.8; // el pelo corre a lo largo (v)
    const dx = Math.cos(ang) * largo;
    const dy = Math.sin(ang) * largo;
    ctx.strokeStyle = rnd() < 0.5 ? 'rgba(122,74,24,0.17)' : 'rgba(246,216,152,0.13)';
    for (let ox = -W; ox <= W; ox += W) {
      for (let oy = -W; oy <= W; oy += W) {
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.lineTo(x + ox + dx, y + oy + dy);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function lienzo(px) {
  const c = document.createElement('canvas');
  c.width = px;
  c.height = px;
  const ctx = c.getContext('2d');
  ctx.fillStyle = PIEL.base;
  ctx.fillRect(0, 0, px, px);
  vetas(ctx, px, 0x5eed ^ px);
  return { c, ctx };
}

let _pieles = null;

// tres mapas: lomo (rosetas), cabeza/patas (manchas sólidas), cola (anillos).
// Se generan UNA vez y se comparten; si no hay DOM se cae a color liso.
export function pielesJaguar(THREE) {
  if (_pieles !== null) return _pieles;
  if (typeof document === 'undefined') { _pieles = false; return _pieles; }
  try {
    const W = 512;
    // pocas rosetas por tile y repeat PROPORCIONAL a la geometría: si el repeat
    // no respeta la relación circunferencia/largo la roseta se estira y termina
    // leyendo como raya de ocelote.
    const lomo = lienzo(W);
    sembrar(lomo.ctx, W, 2, 2, W * 0.185, 0x9a17, roseta);

    const motas = lienzo(W);
    sembrar(motas.ctx, W, 5, 5, W * 0.052, 0x51c3, manchaSolida);

    // cola: bandas transversales (v = a lo largo del tubo) que engordan al final
    const cola = lienzo(W);
    const cctx = cola.ctx;
    const rc = rng(0x2f81);
    cctx.fillStyle = PIEL.tinta;
    for (let i = 0; i < 5; i++) {
      const y = (i + 0.5) * (W / 5) + (rc() - 0.5) * W * 0.05;
      const h = W * (0.05 + rc() * 0.035);
      for (let k = 0; k < 9; k++) {
        manchon(cctx, (k + 0.5) * (W / 9) + (rc() - 0.5) * W * 0.04, y,
          W * 0.07, h, 0, W);
      }
    }
    // el repeat manda la LECTURA: con rosetas chiquitas el bicho lee leopardo.
    // Pocas y grandes (4-5 alrededor del tronco) es lo que dice "jaguar" de lejos.
    // La medición contra captura (v3): con 3.4/3.1 las rosetas salían del
    // tamaño de una moneda y leían huellas de barro; a 2.6/2.3 se les ve el
    // anillo y el punto adentro A DISTANCIA DE JUEGO, que es el diagnóstico.
    // Miembros: el jaguar real NO lleva rosetas en las patas — lleva manchas
    // SÓLIDAS que se achican hacia la zarpa. Por eso motas, no lomo.
    _pieles = {
      torso: comoTextura(THREE, lomo.c, 2.6, 2.3),
      cabeza: comoTextura(THREE, motas.c, 2.6, 1.45),
      miembro: comoTextura(THREE, motas.c, 1.3, 2.7),
      cola: comoTextura(THREE, cola.c, 1.0, 1.0),
    };
  } catch {
    _pieles = false;
  }
  return _pieles;
}

function matPiel(THREE, tex, rough = 0.86) {
  return new THREE.MeshStandardMaterial({ map: tex, roughness: rough, metalness: 0.02 });
}

// ── construcción del piloto ─────────────────────────────────────────────────

export function crearPilotoManejando(THREE, opts = {}) {
  const tipoSolicitado = opts.tipo;
  const tipo = Object.prototype.hasOwnProperty.call(PALETA, tipoSolicitado)
    ? tipoSolicitado : 'angelita';
  if (tipo === 'angelita' && tipoSolicitado !== 'angelita' && !tiposSinPaletaAdvertidos.has(tipoSolicitado)) {
    tiposSinPaletaAdvertidos.add(tipoSolicitado);
    console.warn(`[pilotos-manejando] tipo "${tipoSolicitado}" sin paleta -> cae a angelita (silueta pendiente)`);
  }
  const modo = opts.modo ?? 'cabina'; // cabina | expuesto | skate
  const escala = opts.escala ?? 0.75;
  const pal = { ...PALETA[tipo] };

  const esJaguar = tipo === 'jaguar';
  const esBicho = esBenefico(tipo);
  const esComp = esCompai(tipo);
  const R = esBicho ? RASGOS_BENEFICOS[tipo] : esComp ? RASGOS_COMPAI[tipo] : null;
  // opts.color es una PINTURA, no una especie. En los tres controladores
  // biológicos el color es carácter diagnóstico —Cryptolaemus es naranja y
  // negro, no la mariquita roja de siete puntos del imaginario— así que aquí
  // manda la especie y el override se ignora. En el resto del elenco sigue
  // valiendo igual que siempre.
  if (opts.color != null && !esBicho) pal.cuerpo = opts.color;
  // el jaguar lleva el patrón en textura: mismo triángulo, otra especie
  const piel = esJaguar && opts.color == null ? pielesJaguar(THREE) : false;

  // pal.cuerpo manda en las patas; el TRONCO puede ir aparte (la mariquita
  // lleva élitro negro sobre patas leonadas: mismo bicho, dos materiales)
  const mCuerpo = piel ? matPiel(THREE, piel.torso)
    : R?.matTorso ? mat(THREE, R.matTorso.color, R.matTorso.rough, R.matTorso.metal)
      : mat(THREE, pal.cuerpo, 0.86);
  const mCuerpo2 = mat(THREE, pal.cuerpo2, 0.82);
  const mDetalle = mat(THREE, pal.detalle, 0.9);
  const mBlanco = mat(THREE, 0xf7f6ef, 0.72);
  const mNegro = mat(THREE, 0x17171d, 0.92);
  const mRosa = mat(THREE, 0xd98a86, 0.75);
  const mPelaje = piel ? matPiel(THREE, piel.cabeza) : mCuerpo;   // cabeza y orejas

  const raiz = new THREE.Group();
  raiz.name = `pilotoManejando-${tipo}`;
  const partes = { cara: {}, orejas: [], extras: {} };

  const esPerro = tipo === 'dante' || tipo === 'oliver';
  const hipY = modo === 'skate' ? 0.12 : 0.32;

  // pelvis → pecho → cabeza
  const pelvis = new THREE.Group();
  pelvis.position.y = hipY;
  raiz.add(pelvis);
  partes.pelvis = pelvis;

  const cadera = new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 8), mCuerpo);
  // ancas de félido: el tren trasero del jaguar es potencia visible, no un
  // asiento — más ancho y más alto que el del resto del elenco
  if (esJaguar) cadera.scale.set(1.42, 0.85, 1.12);
  else cadera.scale.set(1.15, 0.8, 1.0);
  cadera.position.y = 0.02;
  pelvis.add(cadera);

  const pecho = new THREE.Group();
  pecho.position.y = 0.06;
  pelvis.add(pecho);
  partes.pecho = pecho;

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.26, 4, 10), mCuerpo);
  torso.position.y = 0.28;
  // jaguar: tronco compacto y musculoso — ancho de pecho, poco alto, hondo
  if (R) torso.scale.set(...R.torso);
  else torso.scale.set(esJaguar ? 1.22 : 1.0, esJaguar ? 0.9 : 1.0, esJaguar ? 1.02 : 0.85);
  pecho.add(torso);

  if (tipo === 'angelita') {
    for (const y of [0.18, 0.33]) {
      const franja = new THREE.Mesh(new THREE.TorusGeometry(0.187, 0.024, 6, 14), mDetalle);
      franja.rotation.x = Math.PI / 2;
      franja.position.y = y;
      franja.scale.set(1.0, 0.85, 1.0); // sigue el torso achatado en z
      pecho.add(franja);
    }
    const alas = new THREE.Group();
    const mAla = new THREE.MeshStandardMaterial({
      color: 0xf8fdff, transparent: true, opacity: 0.45,
      roughness: 0.15, metalness: 0.04, side: THREE.DoubleSide,
    });
    for (const lado of [-1, 1]) {
      const ala = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16), mAla);
      ala.position.set(lado * 0.13, 0.42, -0.17);
      ala.rotation.y = lado * 0.8;
      alas.add(ala);
    }
    pecho.add(alas);
    partes.extras.alas = alas;
  } else if (esBicho || esComp) {
    // tórax, abdomen, pecho y alas los pone el constructor de especie más abajo
  } else {
    const pechera = new THREE.Mesh(new THREE.SphereGeometry(0.145, 9, 7), mCuerpo2);
    // el vientre claro del jaguar es angosto: deja ver las rosetas de los flancos
    // garganta y pecho claros del jaguar: franja angosta y ALTA. Ni peto de
    // peluche ni parche tangente al torso (que recorta con forma sucia).
    if (esJaguar) pechera.scale.set(0.6, 1.25, 0.6);
    else pechera.scale.set(1.1, 1.15, 0.7);
    pechera.position.set(0, esJaguar ? 0.27 : 0.24, esJaguar ? 0.15 : 0.13);
    pecho.add(pechera);
  }
  if (tipo === 'oliver') {
    // manchas del pelaje GRANDES y repartidas donde la cámara del juego las
    // ve (lomo, hombro, flanco, anca): sin ellas es un perro cualquiera
    // (pedido del operador 2026-08-07)
    for (const [x, y, z, r] of [
      [0.13, 0.34, -0.1, 0.06],    // flanco alto derecho
      [-0.1, 0.18, -0.14, 0.075],  // lomo bajo izquierdo
      [0.05, 0.1, 0.15, 0.05],     // barriga
      [-0.15, 0.4, -0.06, 0.08],   // hombro izquierdo, se ve de atrás
      [0.12, 0.16, -0.14, 0.085],  // anca derecha, se ve de atrás
    ]) {
      const manchaT = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), mDetalle);
      manchaT.scale.set(1, 1, 0.35);
      manchaT.position.set(x, y, z);
      manchaT.lookAt(x * 3, y, z * 3); // aplastada contra el torso
      pecho.add(manchaT);
    }
    // mancha del anca sobre la cadera (la grupa es lo primero que ve la
    // cámara de persecución)
    const manchaAnca = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 5), mDetalle);
    manchaAnca.scale.set(1, 1, 0.35);
    manchaAnca.position.set(-0.08, 0.05, -0.11);
    manchaAnca.lookAt(-0.24, 0.05, -0.33);
    pelvis.add(manchaAnca);
  }
  // (las rosetas del jaguar ya no son geometría: viven en el mapa del torso)

  if (esJaguar) {
    // el jaguar es MASA ADELANTE. Morrillo: el lomo de músculo que funde la
    // cabeza con los hombros — es lo que hace que la cabeza no flote sobre el
    // torso como la de un perro sentado, sino que salga DE los hombros.
    const morrillo = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 9), mCuerpo);
    morrillo.scale.set(1.3, 0.8, 1.05);
    morrillo.position.set(0, 0.5, -0.02);
    pecho.add(morrillo);
    // deltoides: el brazo de manguera nace de un hombro con volumen, no de un
    // agujero — a distancia de juego es lo que ensancha la silueta arriba
    for (const lado of [-1, 1]) {
      const deltoide = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mCuerpo);
      deltoide.scale.set(1.05, 0.9, 1.0);
      deltoide.position.set(lado * 0.25, 0.48, 0.03);
      pecho.add(deltoide);
    }
  }

  // hombros: localizadores de donde nace la manguera del brazo
  const hombroX = R ? R.hombroX : esJaguar ? 0.25 : 0.21;   // pecho ancho de félido
  const hombroL = new THREE.Object3D();
  hombroL.position.set(hombroX, 0.5, 0.03);
  pecho.add(hombroL);
  const hombroR = new THREE.Object3D();
  hombroR.position.set(-hombroX, 0.5, 0.03);
  pecho.add(hombroR);
  partes.hombroL = hombroL;
  partes.hombroR = hombroR;

  // caderas: localizadores de las piernas
  const caderaL = new THREE.Object3D();
  caderaL.position.set(0.1, -0.04, 0.02);
  pelvis.add(caderaL);
  const caderaR = new THREE.Object3D();
  caderaR.position.set(-0.1, -0.04, 0.02);
  pelvis.add(caderaR);
  partes.caderaL = caderaL;
  partes.caderaR = caderaR;

  // ── cabeza ────────────────────────────────────────────────────────────────
  const cabeza = new THREE.Group();
  // jaguar: la cabeza va BAJA y ADELANTADA, saliendo del morrillo — postura de
  // acecho. La cabeza alta y centrada es de perro sentado, y era media culpa
  // de que jaguar, Dante y Oliver compartieran silueta.
  if (esJaguar) cabeza.position.set(0, 0.6, 0.08);
  else cabeza.position.set(0, 0.66, 0.02);
  pecho.add(cabeza);
  partes.cabeza = cabeza;

  // angelita: la cara de la piel F24 es crema cálido (gCara), no blanco puro
  const mCabeza = tipo === 'angelita' ? mat(THREE, pal.cabeza, 0.72)
    : esJaguar ? mPelaje
      : esBicho ? mat(THREE, pal.cabeza, tipo === 'avispita' ? 0.3 : 0.5, tipo === 'avispita' ? 0.12 : 0.03)
        : esComp ? mat(THREE, pal.cabeza, 0.88)
          : mCuerpo;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 9), mCabeza);
  // el cráneo del jaguar es ANCHO y BAJO: es lo que sostiene la mordida más
  // potente del género. El domo redondo leía OSO; la bóveda achatada lee félido.
  if (R) skull.scale.set(...R.craneo);
  else if (esJaguar) skull.scale.set(1.38, 0.86, 1.0);
  else if (esPerro) skull.scale.set(1.05, 0.96, 1.0);
  cabeza.add(skull);

  if (esJaguar) {
    // la jeta BLANCA del félido: carrillos + mandíbula en crema, una sola masa
    // clara bajo el cráneo dorado (así la lleva el animal real, y es la
    // "mandíbula de masa" de la referencia — no dos mofletes sueltos)
    for (const lado of [-1, 1]) {
      const carrillo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mCuerpo2);
      carrillo.scale.set(1.0, 0.95, 0.8);
      carrillo.position.set(lado * 0.175, -0.06, 0.05);
      cabeza.add(carrillo);
    }
    // mentón compacto: de frente la mandíbula alta leía barba de castor — la
    // masa la ponen los carrillos a los lados, el mentón solo cierra abajo
    const mandibula = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), mCuerpo2);
    mandibula.scale.set(1.15, 0.48, 0.82);
    mandibula.position.set(0, -0.098, 0.085);
    cabeza.add(mandibula);
  }

  const cara = partes.cara;
  // O reúne lo que antes eran ternarios sueltos. Los defaults son los valores
  // literales del elenco original: para angelita/dante/oliver/jaguar sale la
  // misma geometría byte por byte.
  const O = {
    ...OJO_BASE,
    x: esJaguar ? 0.104 : 0.075,          // ojos más separados: cara ancha
    y: esPerro || esJaguar ? 0.07 : 0.05,
    z: esJaguar ? 0.145 : 0.155,
    cejaW: esJaguar ? 0.064 : 0.07,
    cejaH: esJaguar ? 0.017 : 0.018,
    // el alto de la ceja va en userData: en el jaguar la frente es baja y una
    // ceja a la altura de siempre se le montaba encima de las orejas
    cejaDY: esJaguar ? 0.042 : 0.085,
    cejaDZ: esJaguar ? 0.03 : 0.005,
    ...(R ? R.ojo : null),
  };
  // el ojo dorado metálico de la crisopa es carácter diagnóstico, no adorno
  const ojoMats = esBicho
    ? materialesOjo(THREE, tipo, (c, ro, me) => mat(THREE, c, ro, me))
    : { esclera: mBlanco, iris: esJaguar ? mat(THREE, 0xe8a323, 0.55) : null };
  for (const lado of [-1, 1]) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(O.r, 9, 7), ojoMats.esclera);
    ojo.scale.set(1, 1, 0.55);
    ojo.position.set(lado * O.x, O.y, O.z);
    cabeza.add(ojo);
    const pupila = new THREE.Mesh(new THREE.SphereGeometry(O.rPupila, 6, 4), mNegro);
    pupila.position.set(lado * O.x, O.y, O.z + O.r * 0.712);
    cabeza.add(pupila);
    if (ojoMats.iris) {
      // iris detrás de la pupila; hijo suyo, así escala con ella en aplicarPose
      const iris = new THREE.Mesh(new THREE.SphereGeometry(O.r * 0.712, 6, 4), ojoMats.iris);
      iris.scale.set(1, 1, 0.4);
      iris.position.z = -0.012;
      pupila.add(iris);
    }
    const ceja = new THREE.Mesh(new THREE.BoxGeometry(O.cejaW, O.cejaH, 0.02), mDetalle);
    ceja.position.set(lado * (O.x + 0.005), O.y + O.cejaDY, O.z + O.cejaDZ);
    ceja.userData.dy = O.cejaDY;
    // fiero: sesgo de reposo del ceño (interior ABAJO — mirada que impone).
    // Default 0 = el resto del elenco no cambia ni un grado.
    if (esJaguar) ceja.userData.fiero = 0.3;
    ceja.rotation.z = -lado * 0.12;
    cabeza.add(ceja);
    if (lado < 0) { cara.ojoR = ojo; cara.pupilaR = pupila; cara.cejaR = ceja; }
    else { cara.ojoL = ojo; cara.pupilaL = pupila; cara.cejaL = ceja; }
  }

  let bocaBase; // punto donde vive la boca
  if (esJaguar) {
    // hocico CORTO y ANCHO sobre la mandíbula de masa: morro de félido
    const hocico = new THREE.Mesh(new THREE.SphereGeometry(0.078, 9, 7), mCuerpo2);
    hocico.scale.set(1.8, 0.8, 1.0);
    hocico.position.set(0, -0.052, 0.142);
    cabeza.add(hocico);
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), mNegro);
    nariz.scale.set(1.4, 0.85, 0.8);   // trufa felina: ancha, no bola de perro
    nariz.position.set(0, -0.006, 0.222);
    cabeza.add(nariz);
    bocaBase = new THREE.Vector3(0, -0.1, 0.2);
    for (const lado of [-1, 1]) {
      // colmillos: la mordida más potente del género se tiene que ver
      const colmillo = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.05, 4), mBlanco);
      colmillo.rotation.x = Math.PI;
      colmillo.position.set(lado * 0.05, -0.128, 0.19);
      cabeza.add(colmillo);
      // vibrisas: ningún félido se lee sin bigotes
      for (const [dy, ang] of [[0.012, 0.26], [-0.006, 0.03], [-0.024, -0.22]]) {
        const bigote = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0012, 0.17, 3), mBlanco);
        bigote.position.set(lado * 0.118, -0.048 + dy, 0.175);
        bigote.rotation.z = lado * (Math.PI / 2 - 0.16);
        bigote.rotation.y = -lado * (0.5 + ang);
        cabeza.add(bigote);
      }
    }
  } else if (esPerro) {
    // Oliver es un perro REAL de la casa y se reconoce por la jetica LARGA
    // (pedido del operador 2026-08-07): hocico propio, más fino y salido,
    // apenas caído. Dante conserva el suyo corto, byte por byte.
    const esOliver = tipo === 'oliver';
    const hocico = new THREE.Mesh(
      new THREE.CapsuleGeometry(esOliver ? 0.072 : 0.085, esOliver ? 0.19 : 0.1, 4, 8),
      mCuerpo2
    );
    hocico.rotation.x = Math.PI / 2 + (esOliver ? 0.1 : 0);
    hocico.position.set(0, esOliver ? -0.05 : -0.04, esOliver ? 0.19 : 0.16);
    cabeza.add(hocico);
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(esOliver ? 0.038 : 0.042, 8, 6), mNegro);
    nariz.position.set(0, esOliver ? -0.026 : 0.005, esOliver ? 0.345 : 0.26);
    cabeza.add(nariz);
    bocaBase = esOliver ? new THREE.Vector3(0, -0.125, 0.29) : new THREE.Vector3(0, -0.115, 0.2);
    if (esOliver) {
      const parche = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), mDetalle);
      parche.scale.set(1, 0.8, 0.5);
      parche.position.set(0.09, 0.1, 0.13);
      cabeza.add(parche);
      // mancha sobre la jetica: la pinta de la trompa es parte de la cara
      const pintaHocico = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), mDetalle);
      pintaHocico.scale.set(1, 0.7, 0.55);
      pintaHocico.position.set(-0.035, 0.035, 0.26);
      cabeza.add(pintaHocico);
    }
  } else if (esBicho || esComp) {
    // tórax, abdomen, alas, piezas bucales y antenas: todo de una, por especie
    const ctxEspecie = {
      THREEmat: (c, ro, me) => mat(THREE, c, ro, me),
      pal, pecho, pelvis, cabeza, partes, mBlanco, mNegro,
    };
    bocaBase = (esBicho ? construirBenefico : construirCompai)(THREE, tipo, ctxEspecie).bocaBase;
  } else {
    bocaBase = new THREE.Vector3(0, -0.07, 0.165);
    const mejilla = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 5), mRosa);
    mejilla.scale.set(1, 0.8, 0.4);
    mejilla.position.set(-0.1, -0.03, 0.15);
    cabeza.add(mejilla);
    const mejilla2 = mejilla.clone();
    mejilla2.position.x = 0.1;
    cabeza.add(mejilla2);
  }

  // boca en tres capas continuas (se cross-fadean por escala)
  const bocaNeutra = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.02), mDetalle);
  bocaNeutra.position.copy(bocaBase);
  cabeza.add(bocaNeutra);
  cara.bocaNeutra = bocaNeutra;

  const bocaGozo = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 10, Math.PI), mDetalle);
  bocaGozo.position.copy(bocaBase).y += 0.015;
  bocaGozo.rotation.z = Math.PI; // arco hacia arriba = sonrisa
  cabeza.add(bocaGozo);
  cara.bocaGozo = bocaGozo;

  const bocaSusto = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mNegro);
  bocaSusto.scale.set(1, 1.25, 0.4);
  bocaSusto.position.copy(bocaBase).y -= 0.01;
  cabeza.add(bocaSusto);
  cara.bocaSusto = bocaSusto;

  if (esPerro) {
    const lengua = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.06, 3, 7), mRosa);
    lengua.scale.set(1, 1, 0.5);
    // cuelga de la punta de la jetica (la de Oliver quedó más adelante)
    if (tipo === 'oliver') lengua.position.set(0.03, -0.16, 0.28);
    else lengua.position.set(0.03, -0.14, 0.2);
    lengua.rotation.x = 0.9;
    cabeza.add(lengua);
    cara.lengua = lengua;
  }

  // ── orejas / antenas (al viento) ──────────────────────────────────────────
  if (tipo === 'dante') {
    for (const lado of [-1, 1]) {
      const oreja = new THREE.Group();
      oreja.position.set(lado * 0.15, 0.13, -0.01);
      const carne = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.36, 4, 7), mDetalle);
      carne.position.y = -0.22;
      carne.scale.set(1, 1, 0.55);
      oreja.add(carne);
      oreja.userData = { restZ: lado * 1.02, restX: 0.12, lado, largo: 1 };
      oreja.rotation.z = oreja.userData.restZ;
      cabeza.add(oreja);
      partes.orejas.push(oreja);
    }
    const baba = new THREE.Group();
    baba.position.set(0.055, -0.12, 0.2);
    const hilo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.013, 0.26, 5),
      new THREE.MeshStandardMaterial({ color: 0xe8ffd8, roughness: 0.25, transparent: true, opacity: 0.85 })
    );
    hilo.position.y = -0.13;
    baba.add(hilo);
    cabeza.add(baba);
    partes.extras.baba = baba;
  } else if (tipo === 'oliver') {
    for (const lado of [-1, 1]) {
      const oreja = new THREE.Group();
      oreja.position.set(lado * 0.14, 0.14, -0.01);
      const carne = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 4, 7), mDetalle);
      carne.position.y = -0.15;
      carne.scale.set(1, 1, 0.5);
      oreja.add(carne);
      oreja.userData = { restZ: lado * 0.85, restX: 0.1, lado, largo: 0.8 };
      oreja.rotation.z = oreja.userData.restZ;
      cabeza.add(oreja);
      partes.orejas.push(oreja);
    }
  } else if (esJaguar) {
    // orejas REDONDAS y chicas (las puntiagudas leían como perro), y detrás el
    // ocelo: la mancha blanca sobre fondo negro que el jaguar lleva de fábrica.
    // Van a las ESQUINAS de la bóveda achatada, no arriba como las de un oso.
    for (const lado of [-1, 1]) {
      const oreja = new THREE.Group();
      oreja.position.set(lado * 0.19, 0.105, -0.02);
      const carne = new THREE.Mesh(new THREE.SphereGeometry(0.062, 7, 5), mPelaje);
      carne.scale.set(0.92, 1.0, 0.42);
      carne.position.y = 0.042;
      oreja.add(carne);
      const dentro = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mRosa);
      dentro.scale.set(0.8, 0.95, 0.3);
      dentro.position.set(0, 0.04, 0.026);
      oreja.add(dentro);
      const ocelo = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mDetalle);
      ocelo.scale.set(0.95, 1.0, 0.2);
      ocelo.position.set(0, 0.045, -0.026);
      oreja.add(ocelo);
      const mota = new THREE.Mesh(new THREE.SphereGeometry(0.023, 5, 4), mBlanco);
      mota.scale.set(1, 1, 0.3);
      mota.position.set(0, 0.038, -0.037);
      oreja.add(mota);
      oreja.userData = { restZ: lado * 0.34, restX: 0, lado, largo: 0.3 };
      oreja.rotation.z = oreja.userData.restZ;
      cabeza.add(oreja);
      partes.orejas.push(oreja);
    }
  } else if (esBicho || esComp) {
    // las antenas, orejas y crestas de bichos y compai ya las empujó el
    // constructor de especie a partes.orejas
  } else {
    for (const lado of [-1, 1]) {
      const antena = new THREE.Group();
      antena.position.set(lado * 0.06, 0.17, 0.01);
      const varilla = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.17, 5), mNegro);
      varilla.position.y = 0.085;
      antena.add(varilla);
      const punta = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 5), mat(THREE, pal.cuerpo2, 0.8));
      punta.position.y = 0.18;
      antena.add(punta);
      antena.userData = { restZ: lado * 0.38, restX: -0.15, lado, largo: 0.5 };
      antena.rotation.z = antena.userData.restZ;
      cabeza.add(antena);
      partes.orejas.push(antena);
    }
  }

  // ── extremidades de manguera + guantes + zapatos ──────────────────────────
  const mGuante = mat(THREE, 0xf7f6ef, 0.68);
  const mZapato = mat(THREE, esJaguar ? 0x241a10 : 0x24252b, 0.88);
  const mBrazo = tipo === 'angelita' ? mCuerpo
    : piel ? matPiel(THREE, piel.miembro, 0.88)
      : mat(THREE, pal.cuerpo, 0.88);
  const mPierna = tipo === 'angelita' ? mat(THREE, pal.cuerpo2, 0.85) : mBrazo;

  function crearMano() {
    const g = new THREE.Group();
    const palma = new THREE.Mesh(new THREE.SphereGeometry(0.075, 9, 7), mGuante);
    palma.scale.set(1.0, 1.3, 1.05); // alargada sobre el eje de agarre (Y local)
    g.add(palma);
    for (const dy of [-0.045, 0, 0.045]) {
      const dedo = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), mGuante);
      dedo.position.set(0.028, dy, 0.062);
      g.add(dedo);
    }
    const pulgar = new THREE.Mesh(new THREE.SphereGeometry(0.034, 5, 4), mGuante);
    pulgar.position.set(0.02, 0.02, -0.062);
    g.add(pulgar);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  function crearPie() {
    const zapato = new THREE.Mesh(new THREE.SphereGeometry(0.085, 9, 7), mZapato);
    zapato.scale.set(0.85, 0.62, 1.5);
    zapato.castShadow = true;
    const g = new THREE.Group();
    zapato.position.z = 0.03;
    g.add(zapato);
    return g;
  }

  // patas robustas: la manguera del jaguar es más gruesa que la del resto,
  // la de los bichos más fina (patas de insecto, no de mamífero)
  const rBrazo = R ? R.rBrazo[0] : esJaguar ? 0.068 : 0.048;
  const rBrazo1 = R ? R.rBrazo[1] : esJaguar ? 0.056 : 0.038;
  const rPierna = R ? R.rPierna[0] : esJaguar ? 0.084 : 0.062;
  const rPierna1 = R ? R.rPierna[1] : esJaguar ? 0.069 : 0.05;
  partes.brazoL = crearManguera(THREE, mBrazo, rBrazo, rBrazo1);
  partes.brazoR = crearManguera(THREE, mBrazo, rBrazo, rBrazo1);
  partes.piernaL = crearManguera(THREE, mPierna, rPierna, rPierna1);
  partes.piernaR = crearManguera(THREE, mPierna, rPierna, rPierna1);
  raiz.add(partes.brazoL.mesh, partes.brazoR.mesh, partes.piernaL.mesh, partes.piernaR.mesh);

  partes.manoL = crearMano();
  partes.manoR = crearMano();
  partes.manoR.scale.z = -1; // pulgar espejado
  partes.pieL = crearPie();
  partes.pieR = crearPie();
  if (esJaguar) {
    // zarpas: la mano del jaguar es un mazo. aplicarPose fija posición y
    // quaternion de la mano pero nunca su escala, así que esto es estable.
    partes.manoL.scale.setScalar(1.18);
    partes.manoR.scale.set(1.18, 1.18, -1.18);
    partes.pieL.scale.setScalar(1.22);
    partes.pieR.scale.setScalar(1.22);
  }
  raiz.add(partes.manoL, partes.manoR, partes.pieL, partes.pieR);

  // cola de manguera (perros, jaguar y los compai que la declaran en rasgos)
  const colaR = R?.cola; // la zarigüeya no es zarigüeya sin la cola desnuda
  if (esPerro || esJaguar || colaR) {
    // la del jaguar es CORTA y GRUESA con anillos; la del perro queda como estaba
    const mCola = colaR ? mat(THREE, colaR.color, colaR.rough ?? 0.7)
      : esJaguar ? (piel ? matPiel(THREE, piel.cola, 0.88) : mCuerpo) : mBrazo;
    partes.cola = esJaguar
      ? crearManguera(THREE, mCola, 0.052, 0.042, 6, 6)
      : colaR
        ? crearManguera(THREE, mCola, colaR.r0, colaR.r1, 6, 6)
        : crearManguera(THREE, mCola, 0.034, 0.018, 6, 6);
    partes.colaLargo = esJaguar ? 0.66 : colaR?.largo ?? 1;
    raiz.add(partes.cola.mesh);
    if (esJaguar) {
      const puntaCola = new THREE.Mesh(new THREE.SphereGeometry(0.046, 6, 5), mDetalle);
      puntaCola.castShadow = true;
      raiz.add(puntaCola);
      partes.puntaCola = puntaCola;
    }
  }

  // las alas translúcidas se marcan sinSombra: una membrana al 30% que proyecta
  // una sombra sólida negra delata el truco de una vez
  raiz.traverse((o) => { if (o.isMesh) o.castShadow = !o.userData.sinSombra; });
  // los bichos van proporcionalmente más chicos: son insectos manejando karts
  raiz.scale.setScalar(escala * (R ? R.escalaRel : 1));

  // fase del ciclo hablar/gesticular: DETERMINISTA por tipo (F24 la siembra
  // con semillaDe). Con Math.random el gate del punk mediría lotería, no la
  // ventana — lección ya pagada con el scatter del bosque.
  let semillaHabla = 0;
  for (let i = 0; i < tipo.length; i++) semillaHabla = (semillaHabla * 31 + tipo.charCodeAt(i)) % 9973;

  const piloto = {
    grupo: raiz,
    tipo,
    modo,
    escala,
    partes,
    agarres: null,     // los cablea montarPilotoManejando (o el orquestador)
    apoyos: null,      // targets de los pies
    vehiculo: null,
    _estado: { saltoPrev: 0, susto: 0, tPrev: null, fase: Math.random() * 7, semillaHabla: semillaHabla % 12 },
    _v: {
      inv: new THREE.Matrix4(),
      a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(),
      d: new THREE.Vector3(), e: new THREE.Vector3(), f: new THREE.Vector3(),
      g: new THREE.Vector3(), h: new THREE.Vector3(), q: new THREE.Quaternion(),
      ejeY: new THREE.Vector3(0, 1, 0),
    },
  };
  piloto.aplicarPose = (pose) => aplicarPose(piloto, pose);
  aplicarPose(piloto, { t: 0 });
  return piloto;
}

// ── derivación de agarres y apoyos desde el vehículo real ───────────────────

function buscarCilindros(raizObj, radioTop, altura, tol = 0.004) {
  const out = [];
  raizObj.traverse((o) => {
    if (!o.isMesh || o.geometry?.type !== 'CylinderGeometry') return;
    const p = o.geometry.parameters;
    if (Math.abs(p.radiusTop - radioTop) < tol && Math.abs(p.height - altura) < tol * 5) out.push(o);
  });
  return out;
}

function buscarCajas(raizObj, w, h, d, tol = 0.01) {
  const out = [];
  raizObj.traverse((o) => {
    if (!o.isMesh || o.geometry?.type !== 'BoxGeometry') return;
    const p = o.geometry.parameters;
    if (Math.abs(p.width - w) < tol && Math.abs(p.height - h) < tol && Math.abs(p.depth - d) < tol) out.push(o);
  });
  return out;
}

function buscarToroide(volante) {
  let mejor = null;
  volante.traverse((o) => {
    if (!o.isMesh || o.geometry?.type !== 'TorusGeometry') return;
    if (!mejor || o.geometry.parameters.radius > mejor.geometry.parameters.radius) mejor = o;
  });
  return mejor;
}

// elige los ángulos de agarre del aro (lateral con sesgo hacia abajo) UNA vez;
// después las manos siguen al aro aunque el motor lo rote
function elegirAgarreVolante(THREE, piloto, aro) {
  const R = aro.geometry.parameters.radius;
  const inv = piloto._v.inv.copy(piloto.grupo.matrixWorld).invert();
  const p = piloto._v.a;
  let mejorL = null, mejorR = null, phiL = 0, phiR = Math.PI;
  for (let i = 0; i < 24; i++) {
    const phi = (i / 24) * Math.PI * 2;
    p.set(Math.cos(phi) * R, Math.sin(phi) * R, 0);
    aro.localToWorld(p);
    p.applyMatrix4(inv); // a espacio del piloto: +X = su izquierda
    const sL = p.x - 0.45 * p.y;
    const sR = -p.x - 0.45 * p.y;
    if (mejorL === null || sL > mejorL) { mejorL = sL; phiL = phi; }
    if (mejorR === null || sR > mejorR) { mejorR = sR; phiR = phi; }
  }
  return { modo: 'volante', aro, R, phiL, phiR };
}

function derivarAgarres(THREE, piloto, veh, opts = {}) {
  const ud = veh.userData ?? {};
  if (opts.agarres) { piloto.agarres = opts.agarres; return; }
  veh.updateMatrixWorld(true);
  piloto.grupo.updateWorldMatrix(true, false);

  if (ud.volante && ud.volante.isObject3D) {
    const aro = buscarToroide(ud.volante);
    if (aro) { piloto.agarres = elegirAgarreVolante(THREE, piloto, aro); return; }
  }
  const chasis = ud.chasis ?? veh;
  if (ud.id === 'moto') {
    // los puños del manubrio (cilindros r=0.027 h=0.13); fallback: constantes
    const punos = buscarCilindros(chasis, 0.027, 0.13);
    if (punos.length === 2) {
      piloto.agarres = { modo: 'puntos', objs: ordenarLR(THREE, piloto, punos), ejeLocal: new THREE.Vector3(0, 1, 0) };
      return;
    }
    piloto.agarres = agarreFijo(THREE, chasis, [0.71, 1.21, 0.44], [0.71, 1.21, -0.44]);
    return;
  }
  if (ud.id === 'carretilla') {
    const mangos = buscarCilindros(chasis, 0.04, 0.38);
    if (mangos.length === 2) {
      piloto.agarres = { modo: 'puntos', objs: ordenarLR(THREE, piloto, mangos), ejeLocal: new THREE.Vector3(0, 1, 0) };
      return;
    }
    piloto.agarres = agarreFijo(THREE, chasis, [-0.91, 0.69, 0.253], [-0.91, 0.69, -0.253]);
    return;
  }
  piloto.agarres = null; // skate y desconocidos: brazos de equilibrio
}

// decide cuál mesh corresponde a la mano izquierda del piloto
function ordenarLR(THREE, piloto, meshes) {
  const inv = piloto._v.inv.copy(piloto.grupo.matrixWorld).invert();
  const pa = piloto._v.a.setScalar(0);
  meshes[0].localToWorld(pa).applyMatrix4(inv);
  const xa = pa.x;
  const pb = piloto._v.b.setScalar(0);
  meshes[1].localToWorld(pb).applyMatrix4(inv);
  return xa >= pb.x ? { L: meshes[0], R: meshes[1] } : { L: meshes[1], R: meshes[0] };
}

function agarreFijo(THREE, chasis, pL, pR) {
  return {
    modo: 'fijo', chasis,
    L: new THREE.Vector3(...pL), R: new THREE.Vector3(...pR),
    ejeLocal: new THREE.Vector3(0, 1, 0),
  };
}

function derivarApoyos(THREE, piloto, veh, opts = {}) {
  const ud = veh.userData ?? {};
  if (opts.apoyos) { piloto.apoyos = opts.apoyos; return; }
  const chasis = ud.chasis ?? veh;
  if (ud.id === 'moto') {
    const estribos = buscarCajas(chasis, 0.05, 0.02, 0.14, 0.006);
    if (estribos.length === 2) {
      piloto.apoyos = { modo: 'objs', objs: ordenarLR(THREE, piloto, estribos), altura: 0.06 };
      return;
    }
    piloto.apoyos = apoyoFijo(THREE, chasis, [-0.12, 0.5, 0.2], [-0.12, 0.5, -0.2]);
    return;
  }
  if (ud.id === 'skate') {
    // la lija de la tabla (caja 1.02×0.01×0.3) da la altura de pisada
    const lija = buscarCajas(chasis, 1.02, 0.01, 0.3, 0.02)[0];
    const y = lija ? lija.position.y + 0.045 : 0.245;
    // pie derecho adelante, izquierdo atrás (stance con el frente +x del chasis)
    piloto.apoyos = apoyoFijo(THREE, chasis, [-0.27, y, -0.08], [0.3, y, 0.08]);
    return;
  }
  if (ud.id === 'carretilla') {
    // sentado en la carga como en un trineo: pies adelante, plantados en la
    // tierra del balde (espacio del piloto; el ancla ya vive dentro del balde)
    piloto.apoyos = {
      modo: 'local',
      L: new THREE.Vector3(0.18, 0.30, 0.20),
      R: new THREE.Vector3(-0.18, 0.30, 0.20),
    };
    return;
  }
  // cabina: hacia los pedales, en espacio del piloto
  piloto.apoyos = {
    modo: 'local',
    L: new THREE.Vector3(0.1, -0.12, 0.5),
    R: new THREE.Vector3(-0.1, -0.12, 0.5),
  };
}

function apoyoFijo(THREE, chasis, pL, pR) {
  return { modo: 'fijo', chasis, L: new THREE.Vector3(...pL), R: new THREE.Vector3(...pR) };
}

// ── montaje sobre un vehículo (contrato userData de modelos/) ───────────────

export function montarPilotoManejando(THREE, veh, opts = {}) {
  const ud = veh.userData ?? {};
  const ancla = ud.anclaPiloto;
  let padre, modo, escala;
  if (ancla && ancla.isObject3D) {
    padre = ancla;
    modo = ancla.userData?.modo;
    escala = ancla.userData?.escala;
  } else if (ancla && ancla.pos) {
    // estilo chiva: { pos, rotY, escala } como datos planos
    padre = new THREE.Object3D();
    padre.position.copy(ancla.pos);
    padre.rotation.y = ancla.rotY ?? Math.PI / 2;
    (ud.chasis ?? veh).add(padre);
    modo = 'cabina';
    escala = ancla.escala;
  } else {
    padre = ud.chasis ?? veh;
    modo = 'cabina';
    escala = 0.75;
  }
  const piloto = crearPilotoManejando(THREE, {
    tipo: opts.tipo,
    color: opts.color,
    modo: opts.modo ?? modo ?? 'cabina',
    escala: opts.escala ?? escala ?? 0.75,
  });
  padre.add(piloto.grupo);
  piloto.vehiculo = veh;
  derivarAgarres(THREE, piloto, veh, opts);
  derivarApoyos(THREE, piloto, veh, opts);
  aplicarPose(piloto, { t: 0 });
  return piloto;
}

// ── API de pose continua ────────────────────────────────────────────────────
// aplicarPose(piloto, { giro, salto, turbo, velocidad, susto, drift, t })
//   giro      -1..1  + = curva a la derecha (cuerpo afuera, cabeza a la curva)
//   salto      0..1  en el aire (piernas recogidas; al caer rápido dispara susto)
//   turbo      0..1  mini-turbo soltado → cara de gozo, cuerpo atrás
//   velocidad  0..1  vel/velMax → orejas/pelo/cola al viento, rebote
//   susto      0..1  opcional; si se omite se auto-dispara al aterrizar
//   drift     -1..1  opcional, acentúa torsión
//   t          seg   opcional, reloj del flutter (default performance.now()/1000)
// Todo es continuo: interpolable por el motor sin estados discretos.

export function aplicarPose(piloto, pose = {}) {
  const p = piloto.partes;
  const V = piloto._v;
  const st = piloto._estado;

  const giro = clamp(pose.giro ?? 0, -1, 1);
  const salto = clamp(pose.salto ?? 0, 0, 1);
  const turbo = clamp(pose.turbo ?? 0, 0, 1);
  const vel = clamp(pose.velocidad ?? 0, 0, 1);
  const drift = clamp(pose.drift ?? 0, -1, 1);
  const t = pose.t ?? (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);

  // susto automático al aterrizar: salto cae rápido → pico que decae
  const dt = st.tPrev === null ? 0 : clamp(t - st.tPrev, 0, 0.2);
  st.tPrev = t;
  if (st.saltoPrev > 0.45 && salto < 0.18) st.susto = 1;
  st.susto = Math.max(0, st.susto - dt * 1.7);
  st.saltoPrev = salto;
  const susto = clamp(Math.max(pose.susto ?? 0, st.susto), 0, 1);

  const fase = st.fase;
  const esSkate = piloto.modo === 'skate';
  const esCarretilla = piloto.vehiculo?.userData?.id === 'carretilla';
  const esMoto = piloto.vehiculo?.userData?.id === 'moto';

  // ── tronco: inclinación afuera de la curva, crouch, torsión ──────────────
  const inclinBase = esCarretilla ? 0.4 : esMoto ? 0.38 : esSkate ? 0.2 : 0.06;
  const rebote = Math.sin(t * 10 + fase) * 0.012 * vel + Math.sin(t * 31 + fase) * 0.008 * turbo;
  // ── respiración SIEMPRE encendida (F25) ──────────────────────────────────
  // Con el kart quieto el piloto quedaba maniquí: la sonda del gate midió 0
  // partes móviles con el freno pisado. El pecho sube y baja aunque velocidad
  // sea 0 y el ritmo se acelera con la carrera (mismo criterio que la lámina
  // viva: ~2.4 s en reposo → ~1.1 s a fondo).
  const perRespira = 2.4 - 1.3 * vel;
  const respira = Math.sin((t / perRespira) * Math.PI * 2 + fase);
  // skate agachado (piernas cortas de patinador); carretilla SENTADO en la
  // carga como en un trineo — cola contra el borde trasero del balde, rodillas
  // arriba — así los puños alzados quedan a un brazo corto, no a dos cuerpos.
  // en el aire el cuerpo se despega del asiento (se ve luz bajo la cola)
  const hipY = (esSkate ? 0.12 : esCarretilla ? 0.42 : 0.32) + 0.12 * salto + rebote;
  p.pelvis.position.y = hipY;
  p.pelvis.position.z = esCarretilla ? -0.30 : 0; // la cola al borde trasero del balde

  p.pecho.position.y = 0.06 + respira * 0.008;
  p.pecho.rotation.z = -(0.38 * giro + 0.16 * drift);
  p.pecho.rotation.x = inclinBase + respira * 0.02 + 0.1 * vel - 0.3 * turbo + 0.14 * susto + 0.1 * salto;
  p.pecho.rotation.y = 0.16 * giro + 0.28 * drift + (esSkate ? 0.55 : 0);

  // ── cabeza: mira a dónde va (y acompaña la respiración, con menos ganancia:
  // el cuello absorbe — es lo que hace leer CUELLO y no bloque rígido) ────────
  p.cabeza.rotation.y = -(0.5 * giro + 0.22 * drift) - (esSkate ? 0.5 : 0);
  p.cabeza.rotation.x = -respira * 0.012 - 0.1 * vel - 0.28 * turbo + 0.2 * susto - 0.12 * salto - inclinBase * 0.7;
  p.cabeza.rotation.z = 0.16 * giro + 0.05 * Math.sin(t * 3 + fase);

  // ── cara continua ─────────────────────────────────────────────────────────
  const c = p.cara;
  const gozo = turbo;
  const eps = 0.001;
  const ojoSY = Math.max(0.18, 1 + 0.55 * susto - 0.75 * gozo);
  const ojoSX = 1 + 0.18 * susto;
  const pupS = Math.max(eps, 1 - 0.52 * susto - 0.6 * gozo);
  for (const lado of ['L', 'R']) {
    const ojo = c['ojo' + lado];
    ojo.scale.set(ojoSX, ojoSY, 0.55);
    c['pupila' + lado].scale.setScalar(pupS);
    const ceja = c['ceja' + lado];
    const s = lado === 'L' ? 1 : -1;
    ceja.position.y = (ojo.position.y + (ceja.userData.dy ?? 0.085)) + 0.05 * susto - 0.012 * gozo;
    // fiero (userData, default 0): sesgo de reposo hacia el ceño — interior
    // abajo. El susto sigue ganándole: la resta se come el sesgo y la ceja
    // se levanta igual que en el resto del elenco.
    ceja.rotation.z = -s * (0.12 + 0.5 * susto - 0.18 * gozo - (ceja.userData.fiero ?? 0));
  }
  c.bocaNeutra.scale.setScalar(Math.max(eps, 1 - susto - gozo));
  c.bocaGozo.scale.setScalar(eps + 1.1 * gozo);
  c.bocaSusto.scale.set(eps + susto, (eps + susto) * 1.25, (eps + susto) * 0.4);
  if (c.lengua) c.lengua.scale.set(eps + gozo, eps + gozo, (eps + gozo) * 0.5);

  // ── hablar/gesticular: ventana determinista ~30% (F24: 3,6 s de cada 12) ──
  // El chivito la usa para AFLORAR el punk: crestaNormal ↔ crestaPunk son las
  // dos caras del mismo hueso, igual que en el rig SVG del valle. La fase va
  // sembrada por tipo (semillaHabla), así el gate reproduce la ventana con
  // solo mirar el reloj. Fuera de la ventana, y siempre que está quieto, el
  // pájaro es el normal.
  if (p.extras.crestaPunk) {
    const habla = ((t + (st.semillaHabla ?? 0)) % 12) < 3.6;
    p.extras.crestaPunk.visible = habla;
    if (p.extras.crestaNormal) p.extras.crestaNormal.visible = !habla;
    if (habla && susto < 0.3) {
      // gesticula: cabeceo corto de charla y pico que se abre a pulsos
      p.cabeza.rotation.x += Math.sin(t * 6.3) * 0.045;
      const pulso = 0.35 + 0.4 * Math.sin(t * 9.1) ** 2;
      if (pulso > c.bocaGozo.scale.x) c.bocaGozo.scale.setScalar(pulso);
    }
  }

  // ── orejas / antenas / baba / alas al viento ──────────────────────────────
  const viento = clamp(0.95 * vel + 0.45 * turbo + 0.3 * salto, 0, 1.4);
  for (const oreja of p.orejas) {
    const u = oreja.userData;
    const flap = Math.sin(t * 11 + fase + u.lado) * 0.1 * (0.25 + vel);
    oreja.rotation.x = u.restX + (0.85 * viento + flap) * u.largo;
    oreja.rotation.z = lerp(u.restZ, u.restZ * 0.45, clamp(viento, 0, 1) * (u.largo > 0.6 ? 1 : 0.4));
  }
  if (p.extras.baba) {
    p.extras.baba.rotation.x = 0.15 + 1.15 * viento + Math.sin(t * 13 + fase) * 0.08 * (0.3 + vel);
    const sB = 1 + 0.5 * turbo;
    p.extras.baba.scale.set(1, sB, 1);
  }
  // el élitro del coccinélido se abre con el turbo y el salto, y solo entonces
  // salen las alas membranosas de abajo. Es lo que hace el bicho de verdad.
  const despliegue = clamp(1.15 * turbo + 0.5 * salto, 0, 1);
  // lengua extensible del nectarívoro: la saca entera cuando acelera, igual que
  // la mete en la corola. Nunca se retrae del todo — un Glossophaga sin lengua
  // afuera no se distingue de cualquier otro murciélago.
  if (p.extras.lengua) {
    p.extras.lengua.scale.z = 1 + 0.55 * turbo + 0.2 * vel;
    p.extras.lengua.rotation.x = 0.12 * susto - 0.1 * turbo
      + Math.sin(t * 7 + fase) * 0.05 * (0.3 + vel);
  }
  if (p.extras.alas) {
    const aleteo = Math.sin(t * (9 + 26 * (vel + turbo)) + fase) * (0.35 + 0.25 * turbo);
    let i = 0;
    for (const ala of p.extras.alas.children) {
      // sin userData el comportamiento es el de siempre (angelita): dos alas,
      // reposo 0.8, amplitud 1
      const u = ala.userData;
      const lado = u.lado ?? (i++ === 0 ? -1 : 1);
      ala.rotation.y = lado * ((u.restY ?? 0.8) + aleteo * (u.amp ?? 1));
      if (u.oculta) ala.scale.setScalar(Math.max(0.001, despliegue));
    }
  }
  if (p.extras.elitros) {
    for (const el of p.extras.elitros.children) {
      el.rotation.y = -(el.userData.lado ?? 1) * 0.72 * despliegue;
      el.rotation.x = -0.16 * despliegue;
    }
  }
  // la nube de esporas de la beauveria: respira SOLA (una espora que solo
  // sale con el turbo diría que la esporulación es un disparo, y es un goteo
  // permanente), y con el turbo crece y se densifica — gradual, como el poder
  // que justifica («frena de a poco»), nunca una explosión.
  // la linterna de la luciérnaga LATE: la bioluminiscencia real es un destello
  // lento, no un LED fijo, y el turbo la aviva — la luz es el personaje
  if (p.extras.linterna) {
    const late = 0.62 + 0.38 * Math.sin(t * 2.3 + fase);
    const viveza = late * (0.9 + 1.1 * turbo);
    for (const seg of p.extras.linterna.children) {
      if (seg.material) seg.material.emissiveIntensity = viveza;
    }
  }
  if (p.extras.esporas) {
    const nu = p.extras.esporas;
    const soplo = clamp(0.4 + 0.75 * turbo + 0.2 * vel, 0, 1.15);
    nu.scale.setScalar(0.72 + 0.55 * soplo);
    nu.position.y = (nu.userData.y0 ?? nu.position.y) + Math.sin(t * 1.6 + fase) * 0.035;
    nu.rotation.y = t * 0.4 + fase;
    for (const h of nu.children) {
      const u = h.userData;
      if (u.giro) h.rotation.z = t * u.giro * 2.0;
      if (u.op0 !== undefined && h.material) h.material.opacity = u.op0 * (0.5 + 0.62 * soplo);
    }
  }

  // ── matrices al día para geometría en espacio del piloto ──────────────────
  piloto.grupo.updateWorldMatrix(true, true);
  V.inv.copy(piloto.grupo.matrixWorld).invert();

  // ── brazos: del hombro al agarre real ─────────────────────────────────────
  const hL = V.a; p.hombroL.getWorldPosition(hL).applyMatrix4(V.inv);
  const hR = V.b; p.hombroR.getWorldPosition(hR).applyMatrix4(V.inv);
  const mL = V.c; const mR = V.d; const ejeL = V.e; const ejeR = V.f;
  let conAgarre = true;

  const ag = piloto.agarres;
  if (ag && ag.modo === 'volante') {
    ag.aro.updateWorldMatrix(true, false);
    puntoAro(ag, ag.phiL, mL, ejeL, V.inv);
    puntoAro(ag, ag.phiR, mR, ejeR, V.inv);
  } else if (ag && ag.modo === 'puntos') {
    ag.objs.L.updateWorldMatrix(true, false);
    ag.objs.R.updateWorldMatrix(true, false);
    mL.setScalar(0); ag.objs.L.localToWorld(mL).applyMatrix4(V.inv);
    mR.setScalar(0); ag.objs.R.localToWorld(mR).applyMatrix4(V.inv);
    ejeDeObjeto(ag.objs.L, ag.ejeLocal, ejeL, V.inv);
    ejeDeObjeto(ag.objs.R, ag.ejeLocal, ejeR, V.inv);
  } else if (ag && ag.modo === 'fijo') {
    ag.chasis.updateWorldMatrix(true, false);
    mL.copy(ag.L); ag.chasis.localToWorld(mL).applyMatrix4(V.inv);
    mR.copy(ag.R); ag.chasis.localToWorld(mR).applyMatrix4(V.inv);
    ejeDeObjeto(ag.chasis, ag.ejeLocal, ejeL, V.inv);
    ejeR.copy(ejeL);
  } else {
    // sin agarre (skate): brazos de equilibrio, continuos con la pose
    conAgarre = false;
    mL.set(0.6 - 0.1 * turbo, 0.52 + 0.32 * giro + 0.3 * susto - 0.25 * turbo, 0.14 - 0.3 * turbo);
    mR.set(-0.6 + 0.1 * turbo, 0.52 - 0.32 * giro + 0.3 * susto - 0.25 * turbo, 0.14 - 0.3 * turbo);
    mL.y += Math.sin(t * 9 + fase) * 0.03 * vel;
    mR.y += Math.cos(t * 9 + fase) * 0.03 * vel;
    ejeL.set(0.4, 1, 0).normalize();
    ejeR.set(-0.4, 1, 0).normalize();
  }

  brazoManguera(piloto, p.brazoL, p.manoL, hL, mL, ejeL, 1, t, turbo, conAgarre);
  brazoManguera(piloto, p.brazoR, p.manoR, hR, mR, ejeR, -1, t, turbo, conAgarre);

  // ── piernas: de la cadera al apoyo, recogidas en el salto ─────────────────
  const cL = V.a; p.caderaL.getWorldPosition(cL).applyMatrix4(V.inv);
  const cR = V.b; p.caderaR.getWorldPosition(cR).applyMatrix4(V.inv);
  const fL = V.c; const fR = V.d;
  const ap = piloto.apoyos;
  if (ap && ap.modo === 'objs') {
    ap.objs.L.updateWorldMatrix(true, false);
    ap.objs.R.updateWorldMatrix(true, false);
    fL.setScalar(0); fL.y = ap.altura ?? 0; ap.objs.L.localToWorld(fL).applyMatrix4(V.inv);
    fR.setScalar(0); fR.y = ap.altura ?? 0; ap.objs.R.localToWorld(fR).applyMatrix4(V.inv);
  } else if (ap && ap.modo === 'fijo') {
    ap.chasis.updateWorldMatrix(true, false);
    fL.copy(ap.L); ap.chasis.localToWorld(fL).applyMatrix4(V.inv);
    fR.copy(ap.R); ap.chasis.localToWorld(fR).applyMatrix4(V.inv);
  } else if (ap && ap.modo === 'local') {
    fL.copy(ap.L);
    fR.copy(ap.R);
  } else {
    fL.set(0.1, -0.12, 0.5);
    fR.set(-0.1, -0.12, 0.5);
  }
  // en el aire los pies se recogen hacia la pelvis (continuo con salto)
  if (salto > 0) {
    const tuck = 0.55 * salto;
    fL.lerp(V.e.set(cL.x + 0.06, cL.y - 0.16, cL.z + 0.14), tuck);
    fR.lerp(V.e.set(cR.x - 0.06, cR.y - 0.16, cR.z + 0.14), tuck);
  }
  piernaManguera(piloto, p.piernaL, p.pieL, cL, fL, 1, salto, esSkate);
  piernaManguera(piloto, p.piernaR, p.pieR, cR, fR, -1, salto, esSkate);

  // ── cola al viento ────────────────────────────────────────────────────────
  if (p.cola) {
    const base = V.a.set(0, hipY + 0.02, -0.2);
    const wag = Math.sin(t * (5 + 9 * vel) + fase) * (0.1 + 0.14 * vel + 0.2 * turbo);
    // largo relativo: 1 en los perros, más corta en el jaguar (cola gruesa y corta)
    const kc = p.colaLargo ?? 1;
    const punta = V.b.set(
      base.x + (wag - 0.14 * giro) * kc,
      base.y + (0.24 - 0.1 * viento + 0.15 * salto) * kc,
      base.z - (0.3 + 0.18 * viento) * kc
    );
    const ctrl = V.c.copy(base).lerp(punta, 0.5);
    ctrl.y += 0.14;
    actualizarManguera(p.cola, base, ctrl, punta);
    if (p.puntaCola) p.puntaCola.position.copy(punta);
  }
}

function puntoAro(ag, phi, out, ejeOut, inv) {
  out.set(Math.cos(phi) * ag.R, Math.sin(phi) * ag.R, 0);
  ag.aro.localToWorld(out).applyMatrix4(inv);
  // tangente del aro en phi (dirección del eje del guante)
  ejeOut.set(-Math.sin(phi), Math.cos(phi), 0)
    .transformDirection(ag.aro.matrixWorld);
  // a espacio del piloto: solo rotación (inv trae escala uniforme, normalize la absorbe)
  const e = ejeOut;
  const m = inv.elements;
  const x = e.x, y = e.y, z = e.z;
  e.set(m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z).normalize();
}

function ejeDeObjeto(obj, ejeLocal, out, inv) {
  out.copy(ejeLocal).transformDirection(obj.matrixWorld);
  const m = inv.elements;
  const x = out.x, y = out.y, z = out.z;
  out.set(m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z).normalize();
}

function brazoManguera(piloto, manguera, mano, hombro, agarre, eje, lado, t, turbo, conAgarre) {
  const V = piloto._v;
  const ctrl = V.g.copy(hombro).lerp(agarre, 0.5);
  const dist = V.h.copy(agarre).sub(hombro).length();
  const holgura = Math.max(0, 0.66 - dist);
  // el codo blando se comba hacia afuera-abajo; con el brazo tenso casi nada
  const comba = 0.09 + 0.5 * holgura + 0.02 * Math.sin(t * 7 + lado * 2);
  ctrl.x += lado * comba * 0.9;
  ctrl.y -= comba * 0.55;
  ctrl.z += comba * 0.2 - 0.03 * turbo;
  actualizarManguera(manguera, hombro, ctrl, agarre);
  mano.position.copy(agarre);
  // guante alargado sobre el eje de agarre (eje ya llega normalizado)
  V.q.setFromUnitVectors(V.ejeY, eje);
  mano.quaternion.copy(V.q);
  if (!conAgarre) mano.rotation.z += lado * 0.4;
}

function piernaManguera(piloto, manguera, pie, cadera, apoyo, lado, salto, esSkate) {
  const V = piloto._v;
  const ctrl = V.g.copy(cadera).lerp(apoyo, 0.45);
  const dist = V.h.copy(apoyo).sub(cadera).length();
  const holgura = Math.max(0, 0.72 - dist);
  // rodilla blanda hacia arriba-adelante (sentado) o afuera (de pie)
  const comba = 0.1 + 0.55 * holgura + 0.18 * salto;
  if (esSkate) {
    // rodillas de patinador: flexionadas hacia adelante aunque la pierna esté larga
    ctrl.x += lado * (comba + 0.06) * 0.7;
    ctrl.z += comba * 0.25 + 0.2;
  } else {
    ctrl.y += comba * 0.75;
    ctrl.z += comba * 0.55;
    ctrl.x += lado * comba * 0.25;
  }
  actualizarManguera(manguera, cadera, ctrl, apoyo);
  pie.position.copy(apoyo);
  pie.rotation.set(0, lado * 0.08, 0);
}
