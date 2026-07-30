/*
 * EscenaChorrera — ARQUETIPO `chorrera`: la QUEBRADA DE MONTAÑA con su salto.
 *
 * El mundo del agua que CAE: una quebrada andina de bosque de niebla
 * (~2200–2800 msnm) con su cauce rocoso estrecho de alta pendiente, la
 * CHORRERA cayendo sobre el escarpe estratificado, el POZO cristalino de
 * guijarros pulidos en la base, y la escalera de terrazas y micro-cascadas
 * que baja del monte. HUESOS REALES (DR-chorrera-quebrada-guatoc): roca
 * sedimentaria angular y estratificada, caudal continuo por la lluvia
 * horizontal de la niebla, helechos arborescentes de porte prehistórico,
 * musgo y epífitas en cada piedra, luz difusa con haces esporádicos.
 * PIEL DIBUJADA: entorno ilustrado (Ghibli / BotW) — pintado y atmosférico,
 * jamás fotográfico ni caricatura elástica.
 *
 * AGUA SIN FÍSICA REAL (regla dura): planos con shader de flujo pintado,
 * espuma por parches y pulso suave, rocío por sprites (Points). Nada de
 * fluid-sim.
 *
 * PRESUPUESTO (GPU media/baja): TODO lo repetido va por instancias — roca
 * estratificada, cantos, guijarros, musgo, bromelias, chusque, motas de
 * niebla, troncos y coronas de helecho: UNA draw-call por familia. El agua
 * son ~7 planos con dos materiales compartidos. El diorama completo queda
 * en ~27 draw-calls.
 *
 * Determinista (semilla fija, sin Math.random): misma quebrada en cada carga.
 * Composición estática en módulo (patrón .geom de la casa/bosque); el frame
 * solo mueve uniformes y grupos, cero re-render de React.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Instances, Instance } from '@react-three/drei';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import EscenaBase3D from './EscenaBase3D.jsx';
import { CIELOS } from '../atmosferaMadre.js';

/* ── RNG determinista (mulberry32): misma quebrada en cada carga ─────────── */
function mulberry32(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Aclara/oscurece un hex un factor [-1..1] (variación pintada por instancia). */
function tono(hex, f) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l * (1 + f), 0, 1));
  return `#${c.getHexString()}`;
}

/* Fusión SEGURA (memoria dura del repo: mergeGeometries devuelve NULL EN
   SILENCIO si se mezclan geometrías indexadas y no-indexadas): se desindexa
   TODO antes de fusionar y se revienta con mensaje si aun así fallara. */
function fusionar(partes, etiqueta) {
  const g = mergeGeometries(partes.map((p) => p.toNonIndexed()), false);
  if (!g) throw new Error(`EscenaChorrera: mergeGeometries null en ${etiqueta}`);
  return g;
}

/* ═══ 1. LOS HUESOS: composición determinista del cauce (módulo, una vez) ═══
 *
 * El eje del agua corre en Z (el fondo es monte alto, el frente es la salida):
 *   terraza alta (y≈4.1, z≈-3.4) → micro-cascada → terraza media (y≈3.3)
 *   → chorro corto → LABIO (y≈3.0, z≈-1.5) → LA CHORRERA (caída 2.5)
 *   → POZO (y≈0.46) → escalón de salida → remanso bajo (y≈0.1, z≈2.5).
 */
const RNG = mulberry32(20260729);

/* La roca ESTRATIFICADA: lajas angulares apiladas por hiladas — paredes del
   cañón + el escarpe del salto + las terrazas altas. Tonos gris-azulados con
   una veta parda cálida cada tantas hiladas (sedimentaria real, pintada). */
const TONOS_ESTRATO = ['#6a7681', '#59646e', '#7c8794', '#7e7668'];
const FARALLONES = (() => {
  const lajas = [];
  const laja = (x, y, z, sx, sy, sz, fila) => {
    lajas.push({
      pos: [x + (RNG() - 0.5) * 0.16, y, z + (RNG() - 0.5) * 0.14],
      rot: [(RNG() - 0.5) * 0.05, (RNG() - 0.5) * 0.2, (RNG() - 0.5) * 0.06],
      escala: [sx * (0.9 + RNG() * 0.25), sy * (0.9 + RNG() * 0.2), sz * (0.9 + RNG() * 0.25)],
      color: tono(TONOS_ESTRATO[fila % TONOS_ESTRATO.length], (RNG() - 0.5) * 0.24),
    });
  };
  // Paredes del cañón (estrecho: se inclinan apenas hacia adentro al subir).
  for (let fila = 0; fila < 6; fila++) {
    const y = 0.32 + fila * 0.56;
    for (let z = -2.9; z < 1.7; z += 1.05) {
      const alcanza = z < -0.9 ? 6 : 3; // hacia el monte la pared sube más
      if (fila < alcanza) {
        laja(-2.45 + fila * 0.07, y, z, 1.25, 0.55, 1.0, fila); // pared izquierda
        laja(2.45 - fila * 0.07, y, z, 1.25, 0.55, 1.0, fila); // pared derecha
      }
    }
  }
  // El ESCARPE del salto: la cara de roca tras la chorrera, hilada a hilada.
  for (let fila = 0; fila < 6; fila++) {
    const y = 0.32 + fila * 0.5;
    for (let x = -1.8; x <= 1.81; x += 0.9) {
      laja(x, y, -1.5 - fila * 0.05, 0.95, 0.5, 0.85, fila + 1);
    }
  }
  // El LABIO que asoma (de donde se despega el agua).
  lajas.push({
    pos: [0, 2.98, -1.18], rot: [0.02, 0.03, -0.015],
    escala: [1.35, 0.3, 0.7], color: '#7e8894',
  });
  // Terrazas del cauce alto (la escalera que baja del monte).
  for (let fila = 0; fila < 2; fila++) {
    laja(-2.1, 3.75 + fila * 0.32, -3.4, 2.3, 0.5, 2.3, fila);
  }
  laja(-0.8, 3.0, -2.6, 2.7, 0.55, 2.4, 2);
  laja(0.9, 2.95, -2.9, 2.0, 0.5, 1.8, 3);
  return lajas;
})();

/* Cantos rodados: bloques angulares caídos al pie del salto y por el cauce. */
const CANTOS = (() => {
  const sitios = [
    [-1.5, 0.28, 0.15, 0.42], [1.55, 0.3, 0.2, 0.5], [-1.05, 0.24, 1.35, 0.34],
    [1.2, 0.26, 1.25, 0.4], [-0.75, 0.3, -0.75, 0.36], [0.85, 0.28, -0.8, 0.44],
    [-1.9, 0.34, -1.5, 0.55], [2.0, 0.3, 2.3, 0.4], [-0.15, 0.2, 1.95, 0.3],
    [-2.3, 0.5, 2.5, 0.62], [0.3, 0.22, 2.6, 0.26], [-1.6, 3.42, -2.5, 0.3],
    [0.4, 3.35, -2.2, 0.26], [-2.5, 4.32, -3.0, 0.34],
  ];
  return sitios.map(([x, y, z, r]) => ({
    pos: [x, y, z],
    rot: [RNG() * 3.1, RNG() * 3.1, RNG() * 3.1],
    escala: [r, r * (0.62 + RNG() * 0.3), r],
    color: tono('#75808a', (RNG() - 0.5) * 0.3),
  }));
})();

/* Guijarros PULIDOS del fondo del pozo (se ven a través del agua cristalina). */
const GUIJARROS = (() => {
  const g = [];
  for (let i = 0; i < 42; i++) {
    const a = RNG() * Math.PI * 2;
    const r = Math.sqrt(RNG()) * 1.2;
    const cerca = i < 34; // la mayoría en el pozo, unos pocos en el remanso bajo
    g.push({
      pos: cerca
        ? [0.15 + Math.cos(a) * r * 1.1, 0.335, 0.35 + Math.sin(a) * r * 0.75]
        : [0.85 + Math.cos(a) * 0.5, 0.02, 2.5 + Math.sin(a) * 0.45],
      rot: [0, RNG() * 3.1, 0],
      escala: [0.09 + RNG() * 0.13, 0.05 + RNG() * 0.05, 0.08 + RNG() * 0.12],
      color: tono(['#9aa3a8', '#8b877b', '#a8b0b4', '#7e8a91'][i % 4], (RNG() - 0.5) * 0.2),
    });
  }
  return g;
})();

/* Los HELECHOS ARBORESCENTES (15–25 m reales → los gigantes de la escena):
   tronco fibroso + corona de frondes arqueadas. El porte prehistórico. */
const HELECHOS = [
  { pos: [-2.85, 0.05, 1.7], alto: 3.5, giro: 0.4 }, // el protagonista, junto al pozo
  { pos: [2.7, 0.05, 1.15], alto: 2.9, giro: 2.1 },
  { pos: [-2.6, 0.55, -0.5], alto: 3.15, giro: 4.4 },
  { pos: [2.45, 0.5, -0.7], alto: 2.65, giro: 1.2 },
  { pos: [-1.7, 3.28, -3.05], alto: 2.9, giro: 5.3 }, // silueta entre la niebla alta
  { pos: [1.5, 3.2, -2.75], alto: 2.5, giro: 3.2 },
  { pos: [3.5, 0.0, 2.7], alto: 3.25, giro: 0.9 }, // enmarca el frente
];

/* Bromelias/epífitas: en los troncos de los helechos y en repisas de roca. */
const BROMELIAS = (() => {
  const b = [];
  HELECHOS.forEach((h) => {
    [0.38, 0.62].forEach((f) => {
      const a = RNG() * Math.PI * 2;
      b.push({
        pos: [h.pos[0] + Math.cos(a) * 0.13, h.pos[1] + h.alto * f, h.pos[2] + Math.sin(a) * 0.13],
        rot: [(RNG() - 0.5) * 0.5, RNG() * 3.1, (RNG() - 0.5) * 0.5],
        escala: 0.75 + RNG() * 0.5,
        color: tono('#5c8a48', (RNG() - 0.5) * 0.3),
      });
    });
  });
  [[-2.05, 1.75, -0.3], [2.05, 1.2, 0.6], [-1.3, 3.1, -1.9], [1.7, 2.6, -1.3]].forEach((p) => {
    b.push({
      pos: p, rot: [0, RNG() * 3.1, 0], escala: 0.9 + RNG() * 0.4,
      color: tono('#6a9350', (RNG() - 0.5) * 0.25),
    });
  });
  return b;
})();

/* Musgo ATERCIOPELADO: cojines sobre cada roca que alcanza el rocío. */
const MUSGOS = (() => {
  const m = [];
  const cojin = (x, y, z, r) => m.push({
    pos: [x, y, z], escala: [r, r * 0.4, r],
    color: tono(['#3f6b35', '#4a7a3c', '#57864a', '#365d2e'][m.length % 4], (RNG() - 0.5) * 0.25),
  });
  // sobre las paredes (la cara interna que mira al cauce)
  for (let i = 0; i < 14; i++) {
    const lado = i % 2 === 0 ? -1 : 1;
    cojin(lado * (1.95 + RNG() * 0.3), 0.5 + RNG() * 2.1, -2.4 + RNG() * 3.6, 0.16 + RNG() * 0.16);
  }
  // sobre el escarpe, a los lados del chorro
  for (let i = 0; i < 8; i++) {
    const lado = i % 2 === 0 ? -1 : 1;
    cojin(lado * (0.75 + RNG() * 0.9), 0.6 + RNG() * 2.1, -1.06, 0.13 + RNG() * 0.13);
  }
  // sobre cantos y orillas del pozo
  CANTOS.slice(0, 9).forEach((c) => cojin(c.pos[0], c.pos[1] + c.escala[1] * 0.7, c.pos[2], c.escala[0] * 0.7));
  // en las terrazas altas
  for (let i = 0; i < 7; i++) {
    cojin(-2.4 + RNG() * 3.6, 3.28 + (RNG() < 0.4 ? 0.85 : 0), -3.3 + RNG() * 1.2, 0.15 + RNG() * 0.14);
  }
  return m;
})();

/* Chusque del sotobosque: cañitas finas inclinadas en matas, a las orillas. */
const CHUSQUES = (() => {
  const c = [];
  const mata = (x, z, n) => {
    for (let i = 0; i < n; i++) {
      c.push({
        pos: [x + (RNG() - 0.5) * 0.5, 0, z + (RNG() - 0.5) * 0.5],
        rot: [(RNG() - 0.5) * 0.42, RNG() * 3.1, (RNG() - 0.5) * 0.42],
        alto: 0.9 + RNG() * 0.7,
        color: tono('#6e8a45', (RNG() - 0.5) * 0.3),
      });
    }
  };
  mata(-3.3, 2.6, 7); mata(3.3, 2.1, 6); mata(-3.5, 0.4, 6); mata(3.4, -0.2, 5);
  mata(-2.9, -1.9, 5); mata(2.2, 2.9, 5);
  // ajuste de piso: las matas de la orilla nacen sobre el banco (y≈0)
  return c;
})();

/* Las MOTAS de niebla: capas de VAHO atmosférico, no bultos. Van FAINT
   (meshBasic no recibe luz — pasarse de opacidad las vuelve peñascos grises) y
   repartidas al FONDO y a lo ALTO (el monte que se pierde en bruma), dejando el
   centro —el salto y el pozo— legible. La profundidad de cerca ya la da el
   <fog> de EscenaBase3D; esto es la bruma que corona la quebrada. */
const MOTAS = [
  { pos: [-2.2, 4.4, -3.6], r: 2.0 }, { pos: [1.6, 4.6, -3.7], r: 2.2 },
  { pos: [-0.2, 5.1, -3.9], r: 2.4 }, { pos: [0.2, 2.7, -1.9], r: 1.3 },
  { pos: [3.4, 1.9, 1.8], r: 1.3 }, { pos: [-3.2, 1.7, 1.2], r: 1.2 },
];

/* Parches de espuma quietos: en cada escalón y a la orilla del pozo. */
const ESPUMAS_QUIETAS = [
  { pos: [-1.62, 3.33, -2.62], escala: [0.3, 0.06, 0.24] },
  { pos: [-0.1, 3.04, -1.62], escala: [0.34, 0.06, 0.2] },
  { pos: [0.62, 0.44, 1.55], escala: [0.3, 0.06, 0.22] },
  { pos: [0.95, 0.1, 2.2], escala: [0.34, 0.05, 0.26] },
  { pos: [-0.9, 0.45, 0.1], escala: [0.4, 0.05, 0.3] },
  { pos: [1.05, 0.45, 0.0], escala: [0.36, 0.05, 0.26] },
];

/* El ROCÍO del salto: sprites (Points) en el cono de impacto. Sin física:
   posiciones fijas + vaivén del grupo entero. */
const ROCIO_POSICIONES = (() => {
  const arr = new Float32Array(60 * 3);
  for (let i = 0; i < 60; i++) {
    const a = RNG() * Math.PI * 2;
    const r = 0.15 + Math.sqrt(RNG()) * 0.65;
    arr[i * 3] = Math.cos(a) * r;
    arr[i * 3 + 1] = 0.1 + RNG() * 1.25;
    arr[i * 3 + 2] = Math.sin(a) * r * 0.8;
  }
  return arr;
})();

/* ═══ 2. LA PIEL: geometrías y materiales compartidos (módulo, una vez) ═══ */

/* Una fronda: plano doblado — nace, se arquea hacia afuera y la punta cae. */
function geoFronda() {
  const g = new THREE.PlaneGeometry(1, 1, 1, 7);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) + 0.5; // 0 base → 1 punta
    pos.setX(i, pos.getX(i) * 0.34 * (1 - 0.82 * t));
    pos.setY(i, t * 0.95 - 0.52 * t * t);
    pos.setZ(i, t * 0.62 + 0.3 * t * t);
  }
  g.computeVertexNormals();
  return g;
}

/* La corona completa: 9 frondas radiando del cogollo, fusionadas en UNA
   geometría (una draw-call para TODAS las coronas, instanciada). */
const GEO_CORONA = (() => {
  const fronda = geoFronda();
  const partes = [];
  for (let k = 0; k < 9; k++) {
    const f = fronda.clone();
    f.rotateX(-0.62 - (k % 3) * 0.14);
    f.rotateY((k / 9) * Math.PI * 2 + (k % 2) * 0.22);
    partes.push(f);
  }
  return fusionar(partes, 'corona-helecho');
})();

/* La roseta de bromelia: 6 hojas-cono radiando + el cogollo del centro. */
const GEO_BROMELIA = (() => {
  const partes = [];
  for (let k = 0; k < 6; k++) {
    const hoja = new THREE.ConeGeometry(0.045, 0.24, 5);
    hoja.translate(0, 0.12, 0);
    hoja.rotateX(0.7);
    hoja.rotateY((k / 6) * Math.PI * 2);
    partes.push(hoja);
  }
  const cogollo = new THREE.ConeGeometry(0.04, 0.16, 5);
  cogollo.translate(0, 0.08, 0);
  partes.push(cogollo);
  return fusionar(partes, 'bromelia');
})();

/* Medio-domo del musgo (cojín). */
const GEO_MUSGO = new THREE.SphereGeometry(1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2);

/* El sprite del rocío: gradiente radial suave (CanvasTexture, una vez). */
const TEX_ROCIO = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.5, 'rgba(240,250,248,0.3)');
  grad.addColorStop(1, 'rgba(240,250,248,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

const VERT_AGUA = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* El agua que CAE, pintada: vetas verticales anchas (pinceladas) + bandas que
   corren hacia abajo + espuma en el labio y en la rompiente. Sin ruido duro:
   todo smoothstep — acuarela, no espray. */
const FRAG_CAIDA = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uT;
  void main() {
    float x = vUv.x;
    float y = vUv.y;
    float veta = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float cx = 0.14 + 0.24 * fi + 0.05 * sin(uT * 0.35 + fi * 2.1);
      veta += smoothstep(0.15, 0.0, abs(x - cx))
        * (0.55 + 0.45 * sin(uT * (0.8 + 0.23 * fi) + fi * 1.7 + y * 6.0));
    }
    veta = clamp(veta, 0.0, 1.0);
    float baja = 0.5 + 0.5 * sin((y + uT * 0.4) * 20.0 + sin(x * 9.0) * 0.7);
    baja = smoothstep(0.3, 0.95, baja) * 0.3;
    float espuma = smoothstep(0.86, 1.0, y) * 0.8 + smoothstep(0.17, 0.0, y);
    vec3 hondo = vec3(0.30, 0.47, 0.47);
    vec3 claro = vec3(0.72, 0.87, 0.84);
    vec3 blanco = vec3(0.96, 0.99, 0.98);
    vec3 col = mix(hondo, claro, clamp(0.35 + 0.5 * veta + baja, 0.0, 1.0));
    col = mix(col, blanco, clamp(espuma + veta * 0.2, 0.0, 1.0));
    float borde = smoothstep(0.0, 0.1, x) * smoothstep(1.0, 0.9, x);
    gl_FragColor = vec4(col, (0.6 + 0.32 * espuma) * borde);
  }
`;

/* El agua QUIETA del pozo: cristalina (deja ver los guijarros), más honda al
   centro, con los anillos lentos que salen del punto donde golpea el chorro. */
const FRAG_POZA = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uT;
  void main() {
    vec2 c = vUv - vec2(0.5, 0.72);
    float d = length(c);
    float anillo = smoothstep(0.2, 0.95, 0.5 + 0.5 * sin(d * 30.0 - uT * 2.2))
      * smoothstep(0.5, 0.06, d);
    float hondura = smoothstep(0.5, 0.3, length(vUv - 0.5));
    vec3 orilla = vec3(0.55, 0.78, 0.72);
    vec3 hondo = vec3(0.13, 0.32, 0.31);
    vec3 col = mix(orilla, hondo, hondura * 0.85);
    col = mix(col, vec3(0.93, 0.98, 0.96), anillo * 0.38);
    gl_FragColor = vec4(col, 0.4 + 0.24 * hondura + 0.16 * anillo);
  }
`;

/* ═══ 3. LAS PIEZAS ═══ */

/* Toda el agua de la quebrada: la chorrera, el hilo lateral que rezuma del
   estrato, la escalera alta, el pozo y el remanso de salida. Dos materiales
   compartidos; un solo useFrame mueve el tiempo, el vaho, la espuma viva y
   los haces (el agua es UN sistema, no muchos relojitos). */
function AguaQuebrada({ reducedMotion }) {
  const matCaida = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT_AGUA,
    fragmentShader: FRAG_CAIDA,
    uniforms: { uT: { value: 1.7 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);
  const matPoza = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT_AGUA,
    fragmentShader: FRAG_POZA,
    uniforms: { uT: { value: 1.7 } },
    transparent: true,
    depthWrite: false,
  }), []);
  const espumaViva = useRef(null);
  const rocio = useRef(null);
  const niebla = useRef(null);
  const haz1 = useRef(null);
  const haz2 = useRef(null);
  /* El tiempo del agua se escribe a los uniforms A TRAVÉS del ref del mesh (el
     patrón de DomoCielo/la casa): mutar el valor memoizado directo lo prohíbe
     react-hooks/immutability. Un solo mesh por material basta — el material es
     compartido por todos los planos de su familia. */
  const caidaRef = useRef(null);
  const pozaRef = useRef(null);

  /* Los ShaderMaterial son propios de la escena: se liberan al desmontar. */
  useEffect(() => () => { matCaida.dispose(); matPoza.dispose(); }, [matCaida, matPoza]);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    if (caidaRef.current) caidaRef.current.material.uniforms.uT.value = t;
    if (pozaRef.current) pozaRef.current.material.uniforms.uT.value = t;
    if (espumaViva.current) {
      // la espuma HIERVE suave (respiración orgánica, no caricatura)
      const s = 1 + Math.sin(t * 2.6) * 0.08;
      espumaViva.current.scale.set(s, 1 + Math.sin(t * 2.6 + 1.6) * 0.12, s);
    }
    if (rocio.current) {
      rocio.current.position.y = 0.5 + Math.sin(t * 1.3) * 0.07;
      rocio.current.material.opacity = 0.4 + 0.18 * Math.sin(t * 2.1);
    }
    if (niebla.current) {
      // la niebla RESPIRA y deriva apenas (capa viva, tier-safe: un grupo)
      niebla.current.position.x = Math.sin(t * 0.05) * 0.35;
      niebla.current.position.z = Math.cos(t * 0.04) * 0.25;
    }
    // haces ESPORÁDICOS: vienen, se van (la niebla que se abre un momento)
    const abre = Math.max(0, Math.sin(t * 0.12));
    if (haz1.current) haz1.current.material.opacity = 0.02 + abre * abre * 0.075;
    if (haz2.current) haz2.current.material.opacity = 0.015 + abre * abre * 0.05;
  });

  return (
    <group>
      {/* LA CHORRERA: la caída principal desde el labio hasta el pozo */}
      <mesh ref={caidaRef} position={[0, 1.73, -0.92]} rotation={[-0.09, 0, 0]} material={matCaida} renderOrder={4}>
        <planeGeometry args={[1.02, 2.62, 1, 1]} />
      </mesh>
      {/* el hilo lateral que rezuma de un quiebre del estrato */}
      <mesh position={[-0.95, 1.25, -1.0]} rotation={[-0.07, 0, 0]} material={matCaida} renderOrder={4}>
        <planeGeometry args={[0.2, 1.65, 1, 1]} />
      </mesh>
      {/* la escalera alta: micro-cascada 1 (terraza alta → media) */}
      <mesh position={[-1.62, 3.7, -2.72]} rotation={[-0.12, 0.12, 0]} material={matCaida} renderOrder={4}>
        <planeGeometry args={[0.5, 0.8, 1, 1]} />
      </mesh>
      {/* el corredor inclinado por la terraza media, hacia el labio */}
      <mesh position={[-0.72, 3.18, -2.1]} rotation={[-1.38, 0.06, -0.5]} material={matCaida} renderOrder={4}>
        <planeGeometry args={[0.46, 1.5, 1, 1]} />
      </mesh>
      {/* el remate corto que entrega al labio */}
      <mesh position={[-0.05, 3.06, -1.55]} rotation={[-1.25, 0, -0.05]} material={matCaida} renderOrder={4}>
        <planeGeometry args={[0.6, 0.55, 1, 1]} />
      </mesh>
      {/* el escalón de SALIDA del pozo y su caidita al remanso */}
      <mesh position={[0.68, 0.28, 1.72]} rotation={[-0.35, 0.18, 0]} material={matCaida} renderOrder={4}>
        <planeGeometry args={[0.5, 0.55, 1, 1]} />
      </mesh>

      {/* EL POZO cristalino (el fondo de guijarros se ve a través) */}
      <mesh ref={pozaRef} position={[0.15, 0.46, 0.35]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.18, 0.82, 1]} material={matPoza} renderOrder={3}>
        <circleGeometry args={[1.42, 26]} />
      </mesh>
      {/* el remanso bajo, ya saliendo de la escena */}
      <mesh position={[0.88, 0.1, 2.52]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.78, 1]} material={matPoza} renderOrder={3}>
        <circleGeometry args={[0.78, 20]} />
      </mesh>
      {/* el charco alto de la terraza (remanso de donde arranca la escalera) */}
      <mesh position={[-2.0, 4.06, -3.35]} rotation={[-Math.PI / 2, 0, 0]} material={matPoza} renderOrder={3}>
        <circleGeometry args={[0.55, 16]} />
      </mesh>

      {/* la espuma VIVA de la rompiente (pulso suave) + su anillo */}
      <group position={[0, 0.47, -0.5]}>
        <mesh ref={espumaViva} renderOrder={5}>
          <sphereGeometry args={[0.52, 10, 6]} />
          <meshBasicMaterial color="#f2faf7" transparent opacity={0.8} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.5, 1.1, 1]} renderOrder={5}>
          <ringGeometry args={[0.5, 0.86, 22]} />
          <meshBasicMaterial color="#eef8f5" transparent opacity={0.35} depthWrite={false} />
        </mesh>
      </group>
      {/* espuma quieta de los escalones (una sola familia instanciada) */}
      <Instances frames={1} limit={ESPUMAS_QUIETAS.length}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color="#eef7f3" transparent opacity={0.55} depthWrite={false} />
        {ESPUMAS_QUIETAS.map((e, i) => (
          <Instance key={i} position={e.pos} scale={e.escala} />
        ))}
      </Instances>

      {/* el ROCÍO del impacto: sprites que flotan en el cono del golpe */}
      <points ref={rocio} position={[0, 0.5, -0.45]} renderOrder={7}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ROCIO_POSICIONES, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={TEX_ROCIO}
          color="#eef7f5"
          size={0.16}
          sizeAttenuation
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </points>

      {/* LA NIEBLA en capas: vaho FAINT que corona el monte y se pierde al fondo
          (meshBasic no recibe luz → opacidad muy baja, o se vuelve peñasco). */}
      <group ref={niebla}>
        <Instances frames={1} limit={MOTAS.length}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#e6efec" transparent opacity={0.07} depthWrite={false} />
          {MOTAS.map((m, i) => (
            <Instance key={i} position={m.pos} scale={m.r} />
          ))}
        </Instances>
      </group>

      {/* HACES esporádicos: la niebla se abre y la luz baja al rocío */}
      <mesh ref={haz1} position={[1.5, 3.3, 0.3]} rotation={[0.12, 0, -0.34]} renderOrder={8}>
        <coneGeometry args={[0.62, 5.6, 8, 1, true]} />
        <meshBasicMaterial
          color="#fff6dc"
          transparent
          opacity={0.05}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={haz2} position={[-0.8, 3.9, -1.6]} rotation={[0.1, 0, 0.22]} renderOrder={8}>
        <coneGeometry args={[0.4, 4.8, 8, 1, true]} />
        <meshBasicMaterial
          color="#fdf3d8"
          transparent
          opacity={0.04}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* El MONTE que sostiene la quebrada: piso, bancos de orilla y la roca en
   familias instanciadas — una draw-call por familia. */
function MonteQuebrada() {
  return (
    <group>
      {/* el piso del cañón y los bancos de orilla (tierra musgosa) */}
      <Instances frames={1} limit={5}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color="#ffffff" flatShading />
        <Instance position={[0, -0.26, 0.6]} scale={[11, 0.52, 10]} color="#46583b" />
        <Instance position={[-3.7, 0.28, 0.9]} rotation={[0, 0, 0.1]} scale={[3.6, 0.7, 8.6]} color="#4d6040" />
        <Instance position={[3.7, 0.26, 0.9]} rotation={[0, 0, -0.1]} scale={[3.6, 0.7, 8.6]} color="#495c3d" />
        <Instance position={[0, 2.62, -3.1]} scale={[7.4, 0.8, 2.6]} color="#51634a" />
        <Instance position={[-0.4, 0.14, 1.4]} scale={[2.6, 0.34, 2.2]} color="#54604a" />
      </Instances>

      {/* la roca ESTRATIFICADA: paredes + escarpe + terrazas, lajas angulares */}
      <Instances frames={1} limit={FARALLONES.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color="#ffffff" flatShading />
        {FARALLONES.map((f, i) => (
          <Instance key={i} position={f.pos} rotation={f.rot} scale={f.escala} color={f.color} />
        ))}
      </Instances>

      {/* cantos rodados angulares */}
      <Instances frames={1} limit={CANTOS.length}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshLambertMaterial color="#ffffff" flatShading />
        {CANTOS.map((c, i) => (
          <Instance key={i} position={c.pos} rotation={c.rot} scale={c.escala} color={c.color} />
        ))}
      </Instances>

      {/* guijarros pulidos del fondo */}
      <Instances frames={1} limit={GUIJARROS.length}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshLambertMaterial color="#ffffff" />
        {GUIJARROS.map((g, i) => (
          <Instance key={i} position={g.pos} rotation={g.rot} scale={g.escala} color={g.color} />
        ))}
      </Instances>
    </group>
  );
}

/* La VEGETACIÓN del bosque de niebla: helechos arborescentes (los gigantes),
   musgo aterciopelado, bromelias epífitas y chusque — todo instanciado. */
function VerduraQuebrada({ reducedMotion }) {
  const coronas = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !coronas.current) return;
    // el vaivén del monte entero: las coronas respiran con el aire del salto
    coronas.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.6) * 0.012;
  });
  return (
    <group>
      {/* troncos fibrosos de helecho arborescente */}
      <Instances frames={1} limit={HELECHOS.length}>
        <cylinderGeometry args={[0.075, 0.12, 1, 7]} />
        <meshLambertMaterial color="#ffffff" flatShading />
        {HELECHOS.map((h, i) => (
          <Instance
            key={i}
            position={[h.pos[0], h.pos[1] + h.alto / 2, h.pos[2]]}
            scale={[1, h.alto, 1]}
            color={tono('#7a5f3f', (i % 3) * 0.08 - 0.04)}
          />
        ))}
      </Instances>
      {/* coronas de frondes (geometría fusionada, UNA familia). El vaivén vive
          en el GRUPO padre (su matriz), no en las instancias: el buffer se sube
          una sola vez (frames={1}) y aun así la copa respira. */}
      <group ref={coronas}>
        <Instances frames={1} limit={HELECHOS.length}>
          <primitive object={GEO_CORONA} attach="geometry" />
          <meshLambertMaterial color="#ffffff" side={THREE.DoubleSide} />
          {HELECHOS.map((h, i) => (
            <Instance
              key={i}
              position={[h.pos[0], h.pos[1] + h.alto, h.pos[2]]}
              rotation={[0, h.giro, 0]}
              scale={0.95 + (i % 3) * 0.18}
              color={tono('#5a9440', (i % 4) * 0.08 - 0.04)}
            />
          ))}
        </Instances>
      </group>
      {/* cojines de musgo */}
      <Instances frames={1} limit={MUSGOS.length}>
        <primitive object={GEO_MUSGO} attach="geometry" />
        <meshLambertMaterial color="#ffffff" />
        {MUSGOS.map((m, i) => (
          <Instance key={i} position={m.pos} scale={m.escala} color={m.color} />
        ))}
      </Instances>
      {/* bromelias / epífitas */}
      <Instances frames={1} limit={BROMELIAS.length}>
        <primitive object={GEO_BROMELIA} attach="geometry" />
        <meshLambertMaterial color="#ffffff" flatShading />
        {BROMELIAS.map((b, i) => (
          <Instance key={i} position={b.pos} rotation={b.rot} scale={b.escala} color={b.color} />
        ))}
      </Instances>
      {/* chusque de la orilla */}
      <Instances frames={1} limit={CHUSQUES.length}>
        <cylinderGeometry args={[0.014, 0.022, 1, 5]} />
        <meshLambertMaterial color="#ffffff" />
        {CHUSQUES.map((c, i) => (
          <Instance
            key={i}
            position={[c.pos[0], c.alto / 2, c.pos[2]]}
            rotation={c.rot}
            scale={[1, c.alto, 1]}
            color={c.color}
          />
        ))}
      </Instances>
    </group>
  );
}

function Diorama({ reducedMotion }) {
  return (
    <group>
      <MonteQuebrada />
      <VerduraQuebrada reducedMotion={reducedMotion} />
      <AguaQuebrada reducedMotion={reducedMotion} />
    </group>
  );
}

export default function EscenaChorrera(props) {
  /* La familia de cielo `ladera` (bruma verde-plata del alto) es la del bosque
     de niebla; EscenaBase3D la mezcla hacia la franja del día como a todos. */
  return (
    <EscenaBase3D {...props} cielo={CIELOS.ladera} entrada={{ ...props.entrada, centro: props.entrada?.centro || [0, 1.7, -0.3] }}>
      <Diorama reducedMotion={props.reducedMotion} />
    </EscenaBase3D>
  );
}
