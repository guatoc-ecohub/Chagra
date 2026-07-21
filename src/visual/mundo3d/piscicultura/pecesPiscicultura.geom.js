/*
 * pecesPiscicultura.geom — la GEOMETRÍA de los peces de estanque campesino
 * (three-core puro, cero React, testeable headless).
 *
 * La piscicultura de finca en Colombia se organiza por PISO TÉRMICO (DR
 * piscicultura 5b59fe75, gemini 2026-06-19):
 *   · FRÍO (>1800 msnm, 12–16 °C, agua corriente y oxigenada): TRUCHA arcoíris
 *     (Oncorhynchus mykiss) — cuerpo fusiforme, franja rosada lateral, moteada.
 *   · CÁLIDO (24–29 °C): MOJARRA/TILAPIA (Oreochromis niloticus, aquí la roja
 *     tan común en la finca) y CACHAMA (Colossoma macropomum / Piaractus
 *     brachypomus) — cuerpo alto y comprimido; en policultivo 80 % mojarra /
 *     20 % cachama.
 *   · BOCACHICO (Prochilodus magdalenae): iliófago detritívoro — vive pegado al
 *     fondo aprovechando los restos, lo que baja la necesidad de concentrado.
 *
 * Cada pez es UN cuerpo fusiforme (anillos a lo largo del eje +X, la nariz en
 * +x) con lomo oscuro y vientre claro horneados por vértice, aleta dorsal y anal
 * incrustadas, y la COLA aparte (una geometría propia) para que la escena la
 * haga aletear sin tocar el cuerpo. Low-poly cálido, del mismo juego que el agua
 * del valle. Se arma con buffers crudos (no `mergeGeometries`) — cero trampa del
 * null silencioso.
 */
import * as THREE from 'three';

/* Paleta de los peces: colores naturales, cálidos, sin el azul reservado al agua
   (PALETA.agua). Lomo (dorso), vientre (barriga), franja (acento lateral),
   aleta. */
export const PAL_PECES = {
  trucha: {
    lomo: '#6f7d6a', // verde-oliva plateado del dorso
    vientre: '#e7e2ce', // vientre crema
    franja: '#c67a6a', // la franja rosada del arcoíris
    aleta: '#8a9484',
    largo: 0.62, alto: 0.19, ancho: 0.10, // fusiforme, hidrodinámica
  },
  mojarra: {
    lomo: '#a75a3c', // mojarra roja (tilapia roja de finca)
    vientre: '#ecd9c2',
    franja: '#c98a5a',
    aleta: '#8f4f36',
    largo: 0.46, alto: 0.26, ancho: 0.09, // alta y comprimida
  },
  cachama: {
    lomo: '#565039', // dorso oliva-gris oscuro
    vientre: '#9a8555', // vientre con el amarillo-naranja de la cachama
    franja: '#6a5f3e',
    aleta: '#48432f',
    largo: 0.58, alto: 0.34, ancho: 0.11, // cuerpo muy alto, romboidal
  },
  bocachico: {
    lomo: '#8a8474', // plateado-gris
    vientre: '#e3ddca',
    franja: '#b7b09c',
    aleta: '#7c7768',
    largo: 0.50, alto: 0.18, ancho: 0.08, // alargado, de fondo
  },
};

/* Perfil del cuerpo: fracción de radio (0..1) a lo largo de t (0 nariz → 1 base
   de la cola). Puntos de control interpolados lineal — silueta de pez. */
const PERFIL = [
  [0.0, 0.10],
  [0.12, 0.58],
  [0.28, 1.0],
  [0.5, 0.92],
  [0.72, 0.6],
  [0.9, 0.33],
  [1.0, 0.22],
];

function fracRadio(t) {
  for (let i = 0; i < PERFIL.length - 1; i++) {
    const [t0, r0] = PERFIL[i];
    const [t1, r1] = PERFIL[i + 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0 || 1);
      return r0 + (r1 - r0) * k;
    }
  }
  return PERFIL[PERFIL.length - 1][1];
}

/* Acumulador de triángulos: empuja 3 vértices con su color plano. */
function tri(pos, col, a, b, c, color) {
  const v = [a, b, c];
  for (let i = 0; i < 3; i++) {
    pos.push(v[i].x, v[i].y, v[i].z);
    col.push(color.r, color.g, color.b);
  }
}

function geoDesde(pos, col) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Cuerpo del pez (con aleta dorsal y anal incrustadas), fusiforme sobre +X.
 * Color por vértice: lomo oscuro arriba, vientre claro abajo, y la franja
 * lateral (rosada en la trucha, tenue en las demás) a media altura del centro.
 *
 * @param {keyof typeof PAL_PECES} especie
 * @param {{ seg?: number, radial?: number }} [opts]
 * @returns {THREE.BufferGeometry}
 */
export function geomCuerpoPez(especie, { seg = 9, radial = 7 } = {}) {
  const P = PAL_PECES[especie] || PAL_PECES.mojarra;
  const L = P.largo;
  const sa = P.alto / 2; // semi-alto
  const sw = P.ancho / 2; // semi-ancho
  const cLomo = new THREE.Color(P.lomo);
  const cVientre = new THREE.Color(P.vientre);
  const cFranja = new THREE.Color(P.franja);
  const pos = [];
  const col = [];
  const tmp = new THREE.Color();

  // Anillos a lo largo del cuerpo. Cada anillo: `radial` vértices.
  const anillos = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const x = L * (0.5 - t); // +L/2 (nariz) → −L/2 (base de cola)
    const fr = fracRadio(t);
    const ring = [];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2; // 0 = arriba (+Y)
      const y = Math.cos(a) * fr * sa;
      const z = Math.sin(a) * fr * sw;
      ring.push(new THREE.Vector3(x, y, z));
    }
    anillos.push({ ring, t });
  }

  // Color de un vértice según su altura relativa (lomo↔vientre) y la franja.
  const colorDe = (v, fr, t) => {
    const yn = sa > 0 ? v.y / (fr * sa || 1) : 0; // −1 vientre .. +1 lomo
    tmp.copy(cVientre).lerp(cLomo, (yn + 1) / 2);
    // franja lateral: a media altura (|yn| pequeño), en el tercio central,
    // más marcada en la trucha.
    const lateral = 1 - Math.min(1, Math.abs(yn) / 0.35);
    const central = t > 0.18 && t < 0.86 ? 1 : 0;
    const fuerza = especie === 'trucha' ? 0.85 : 0.35;
    if (lateral > 0 && central) tmp.lerp(cFranja, lateral * fuerza);
    return tmp;
  };

  // Costillas entre anillos consecutivos (dos triángulos por cara).
  for (let i = 0; i < seg; i++) {
    const A = anillos[i];
    const B = anillos[i + 1];
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial;
      const a = A.ring[j], b = A.ring[j2];
      const c = B.ring[j], d = B.ring[j2];
      const cA = colorDe(a, fracRadio(A.t), A.t).clone();
      const cB = colorDe(c, fracRadio(B.t), B.t).clone();
      tri(pos, col, a, c, b, cA);
      tri(pos, col, b, c, d, cB);
    }
  }

  // Tapa de la nariz (abanico al vértice de proa).
  const proa = new THREE.Vector3(L * 0.5 + L * 0.06, 0, 0);
  const r0 = anillos[0].ring;
  for (let j = 0; j < radial; j++) {
    const j2 = (j + 1) % radial;
    tri(pos, col, proa, r0[j], r0[j2], cLomo.clone().lerp(cVientre, 0.5));
  }

  // Aleta DORSAL: triángulo plano vertical sobre el lomo, tercio medio. Baja a
  // propósito (que no rompa la superficie del agua cuando el pez nada somero).
  const xd = L * 0.08;
  const topA = new THREE.Vector3(xd + L * 0.12, sa * 0.92, 0);
  const topB = new THREE.Vector3(xd - L * 0.16, sa * 0.88, 0);
  const topC = new THREE.Vector3(xd - L * 0.02, sa * 1.3, 0);
  tri(pos, col, topA, topB, topC, new THREE.Color(P.aleta));
  tri(pos, col, topB, topA, topC, new THREE.Color(P.aleta)); // doble cara

  // Aleta ANAL: pequeña bajo el vientre, hacia la cola.
  const xa = -L * 0.2;
  const anA = new THREE.Vector3(xa + L * 0.08, -sa * 0.9, 0);
  const anB = new THREE.Vector3(xa - L * 0.06, -sa * 0.85, 0);
  const anC = new THREE.Vector3(xa, -sa * 1.35, 0);
  tri(pos, col, anA, anB, anC, new THREE.Color(P.aleta));
  tri(pos, col, anB, anA, anC, new THREE.Color(P.aleta));

  // Aletas PECTORALES: dos aletitas a los lados, tras las branquias.
  const xp = L * 0.16;
  for (const s of [1, -1]) {
    const pA = new THREE.Vector3(xp, -sa * 0.1, s * sw * 0.9);
    const pB = new THREE.Vector3(xp - L * 0.14, -sa * 0.2, s * sw * 0.9);
    const pC = new THREE.Vector3(xp - L * 0.08, -sa * 0.55, s * sw * 1.9);
    tri(pos, col, pA, pB, pC, new THREE.Color(P.aleta));
    tri(pos, col, pB, pA, pC, new THREE.Color(P.aleta));
  }

  return geoDesde(pos, col);
}

/**
 * COLA (aleta caudal) del pez, como geometría aparte para animarla (aletear).
 * Su pivote está en el origen: la escena la coloca en la base de la cola
 * (x = −largo/2) y la hace girar en Y. Aleta bilobulada plana en XY.
 *
 * @param {keyof typeof PAL_PECES} especie
 * @returns {THREE.BufferGeometry}
 */
export function geomColaPez(especie) {
  const P = PAL_PECES[especie] || PAL_PECES.mojarra;
  const cAleta = new THREE.Color(P.aleta);
  const largo = P.alto * 0.9; // qué tanto se extiende hacia atrás
  const abre = P.alto * 0.85; // apertura de los lóbulos
  const pos = [];
  const col = [];
  const base = new THREE.Vector3(0, 0, 0);
  const cintura = new THREE.Vector3(-largo * 0.45, 0, 0);
  const arriba = new THREE.Vector3(-largo, abre, 0);
  const abajo = new THREE.Vector3(-largo, -abre, 0);
  // dos triángulos → cola bilobulada con muesca en el centro
  tri(pos, col, base, cintura, arriba, cAleta);
  tri(pos, col, base, abajo, cintura, cAleta);
  // doble cara (se ve por ambos lados sin depender de la luz)
  tri(pos, col, base, arriba, cintura, cAleta);
  tri(pos, col, base, cintura, abajo, cAleta);
  return geoDesde(pos, col);
}

/**
 * Reparto de un cardumen dentro de un estanque elíptico: posiciones/fases
 * deterministas (un LCG por semilla) para que el mismo estanque tenga siempre
 * los mismos peces. Cada pez lleva su elipse de nado, su profundidad y su fase.
 *
 * @param {object} o
 * @param {number} o.n            cuántos peces.
 * @param {number} o.cx          centro X del estanque (mundo).
 * @param {number} o.cz          centro Z.
 * @param {number} o.rx          semieje X del agua.
 * @param {number} o.rz          semieje Z.
 * @param {number} o.ySup        Y de la superficie del agua.
 * @param {number} o.hondo       profundidad útil (los peces nadan entre ySup y ySup−hondo).
 * @param {number} [o.fondo=0]   0 = nada por toda la columna; 1 = pegado al fondo (bocachico).
 * @param {number} [o.semilla=1]
 * @returns {Array<{orbita:number, radio:[number,number], centro:[number,number], y:number, fase:number, vel:number, escala:number}>}
 */
export function repartirCardumen({ n, cx, cz, rx, rz, ySup, hondo, fondo = 0, semilla = 1 }) {
  let s = (semilla * 2654435761) >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const peces = [];
  for (let i = 0; i < n; i++) {
    // cada pez recorre una elipse interior propia, centrada cerca del centro.
    const offx = (rnd() - 0.5) * rx * 0.5;
    const offz = (rnd() - 0.5) * rz * 0.5;
    const orx = rx * (0.35 + rnd() * 0.4);
    const orz = rz * (0.35 + rnd() * 0.4);
    // profundidad: los de fondo (bocachico) abajo; los demás en media agua,
    // pero nunca tan someros que la aleta rompa la superficie.
    const prof = fondo
      ? hondo * (0.72 + rnd() * 0.22)
      : hondo * (0.36 + rnd() * 0.44);
    peces.push({
      centro: [cx + offx, cz + offz],
      radio: [orx, orz],
      y: ySup - prof,
      fase: rnd() * Math.PI * 2,
      vel: (fondo ? 0.1 : 0.16) + rnd() * 0.14,
      escala: 0.82 + rnd() * 0.4,
    });
  }
  return peces;
}
