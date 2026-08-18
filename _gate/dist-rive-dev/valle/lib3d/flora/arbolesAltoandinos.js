// ── arbolesAltoandinos.js — los árboles nativos del FRÍO (2.000–3.000 m) ─────
//
// Cinco especies con SILUETA PROPIA. El diagnóstico que origina este módulo:
// el dosel del bosque de niebla es "copa-masa genérica" a propósito (así lo
// dejó dicho la bruma volumétrica) — todos los árboles se leen igual. Este
// módulo pone las especies finas. La prueba de fuego: tapando el rótulo, las
// cinco se tienen que distinguir POR SILUETA y por el tamaño/forma de la hoja,
// no por el color.
//
//   1. ENCENILLO (Weinmannia tomentosa) — el dominante del bosque altoandino.
//      CONO INVERTIDO (doctrina de bosque.js): ramas empinadas que abren hacia
//      arriba y una copa densa, plana por encima, OSCURA. Hoja compuesta
//      pequeñita en raquis alado → en la textura se pintan plumitas, no óvalos.
//   2. ALISO (Alnus acuminata) — esbelto y ABIERTO. Tronco liso grisáceo con
//      bandas de lenticelas, copa clara en lóbulos separados por los que pasa
//      el cielo. Fijador de nitrógeno: en el bosque busca la vaguada húmeda.
//   3. SIETE CUEROS (Tibouchina lepidota) — bajo y ANCHO, tronco sinuoso que
//      se descama en capas (canela/rojizo/gris). Domo redondo con parches de
//      flor MORADA: el único acento fuerte de color del piso frío (acento,
//      nunca la norma — el verde sigue dominando).
//   4. GAQUE (Clusia multiflora) — copa COMPACTA ovoide, monolítica, de hoja
//      gruesa coriácea y lustrosa: pocas hojas GRANDES en la textura y un
//      material con más brillo que el de los demás.
//   5. MANO DE OSO (Oreopanax) — el PARASOL del sotobosque: tallo delgado casi
//      sin ramas y un quitasol de hojas palmeadas ENORMES en rosetas
//      terminales. La hoja acá sí es protagonista (como la musácea de
//      FollajeMasa.hojaMusa): una hoja dibujada rica por card, jamás un
//      rectángulo verde.
//
// REGLA DURA respetada: follaje = MASA (FollajeMasa: núcleo esculpido + cards
// texturizados; ni una hojita contable en las copas). Verde dominante; el
// morado del siete cueros es acento medido. Lámina Humboldt, no fotorrealismo.
//
// PRESUPUESTO (patrón matrizParamo):
//   · Detalle: por especie UNA geometría opaca (leñoso + núcleo fusionados,
//     fusionarPreservando) y UNA de cards → 2 draw calls por especie por celda
//     visible, da igual cuántos árboles. InstancedMesh SIEMPRE.
//   · Las instancias viven en CELDAS de ~48 m: frustum culling de three +
//     apagado por distancia en actualizar(camara) → el costo de vértices queda
//     acotado por un disco alrededor de la cámara, no por el área sembrada.
//   · Corte por distancia EN EL SHADER (disolución screen-door, opaca, sin
//     sorting): el detalle se deshace en [rDetalle-banda, rDetalle] y ahí
//     mismo se materializa el IMPOSTOR: cruz de 3 planos con atlas pintado
//     (silueta por especie proyectada de los MISMOS lóbulos del detalle) —
//     UN draw call para todos los árboles lejanos del bosque.
//   · Viento: reloj compartido de vientoMundos (tickVientoMundos afuera,
//     1×/frame). El impostor se mece con el mismo uniforme.
//
// ── PRESUPUESTO MEDIDO (gate headed, Quadro M6000, pixelRatio 2, 1280×800,
//    demo bosque-altoandino/index.html, bruma volumétrica PUESTA) ────────────
//   A ras de suelo (1.844 árboles, 240×240 m):  59,9 FPS · 749k tris · 47 calls · 0,5 ms JS
//   Dosel cenital con bruma:                    60,0 FPS · 769k tris · 46 calls
//   Barrido de CANTIDAD (vista=perf, densidad 3,2 árb/100 m², dentro del bosque):
//     2.000 → 60,2 · 4.000 → 60,0 · 8.000 → 59,7 · 16.000 → 60,1
//     32.000 → 59,7 · 64.000 → 60,2 FPS (2,20M tris visibles · 57 calls · 2,98 ms JS)
//   → 60 FPS SOSTENIDOS HASTA 64.000 ÁRBOLES (≈200 ha): el costo por frame lo
//     acota el disco de detalle alrededor de la cámara (~2–3k tris por árbol
//     cercano), no el área sembrada; el resto es UN draw call de impostores de
//     20 tris (cruz de 3 planos + tapa cenital).
//
// Convención lib3d/flora: `import * as THREE from 'three'` (bare specifier,
// resuelto por importmap — igual que matrizParamo / frailejonFabrica). Las
// funciones de FollajeMasa reciben THREE como primer argumento.

import * as THREE from 'three';
import {
  materialFollaje, materialNucleo, geometriaNucleoMasa, geometriaCardsMasa,
  fusionarPreservando,
} from './FollajeMasa.js';
import { uniformesVientoMundo, aplicarVientoMundo } from './vientoMundos.js';
import { registrarPisoTermico } from './pisosTermicos.js';

// ═════════════════════════════════════════════════════════════════════════════
//  Azar y ruido deterministas (mismas formas que el resto de lib3d)
// ═════════════════════════════════════════════════════════════════════════════
function prngAA(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashAA(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoiseAA(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hashAA(xi, zi), b = hashAA(xi + 1, zi), c = hashAA(xi, zi + 1), d = hashAA(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbmAA(x, z, oct = 3) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += amp * vnoiseAA(x * f, z * f); norm += amp; amp *= 0.5; f *= 2.11; }
  return s / norm;
}
function hstr(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

// ═════════════════════════════════════════════════════════════════════════════
//  LAS CINCO — la verdad botánica que separa las siluetas
//  (alturas en metros; anchoCopa = diámetro aprox para el espaciado del bosque)
// ═════════════════════════════════════════════════════════════════════════════
export const ESPECIES_FRIO = Object.freeze({
  encenillo: {
    cientifico: 'Weinmannia tomentosa', comun: 'Encenillo',
    silueta: 'cono invertido denso y oscuro', altura: [9, 13], anchoCopa: 6.4,
    piso: ['frio'],
  },
  aliso: {
    cientifico: 'Alnus acuminata', comun: 'Aliso',
    silueta: 'esbelto, copa abierta y clara', altura: [12, 17], anchoCopa: 5.6,
    piso: ['frio'],
  },
  sietecueros: {
    cientifico: 'Tibouchina lepidota', comun: 'Siete cueros',
    silueta: 'bajo y ancho, domo con flor morada', altura: [5.2, 7.8], anchoCopa: 6.8,
    piso: ['frio'],
  },
  gaque: {
    cientifico: 'Clusia multiflora', comun: 'Gaque',
    silueta: 'ovoide compacto y lustroso', altura: [6.5, 9.5], anchoCopa: 5.2,
    piso: ['frio'],
  },
  mano_de_oso: {
    cientifico: 'Oreopanax floribundum', comun: 'Mano de oso',
    silueta: 'parasol de hojas palmeadas gigantes', altura: [4.2, 6.4], anchoCopa: 4.6,
    piso: ['frio'],
  },
});
for (const k of Object.keys(ESPECIES_FRIO)) registrarPisoTermico(`arbol_${k}`, ESPECIES_FRIO[k].piso);

// ═════════════════════════════════════════════════════════════════════════════
//  LEÑOSO — tubo afinado a lo largo de un camino, con color por vértice.
//  Indexado + computeVertexNormals → normales SUAVES (nada de facetas).
//  colFn(t, ang, rn) → [r,g,b]  (t: 0 base → 1 punta; ang: 0..2π alrededor)
// ═════════════════════════════════════════════════════════════════════════════
function tuboAfinado(puntos, r0, r1, radial, colFn, rn) {
  const nP = puntos.length;
  const pos = [], col = [], idx = [];
  const tang = new THREE.Vector3(), q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0), eje = new THREE.Vector3();
  for (let i = 0; i < nP; i++) {
    const t = i / (nP - 1);
    const p = puntos[i];
    const pa = puntos[Math.max(0, i - 1)], pb = puntos[Math.min(nP - 1, i + 1)];
    tang.set(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]).normalize();
    q.setFromUnitVectors(up, tang);
    const r = r0 + (r1 - r0) * Math.pow(t, 0.85);
    for (let k = 0; k < radial; k++) {
      const a = (k / radial) * Math.PI * 2;
      eje.set(Math.cos(a) * r, 0, Math.sin(a) * r).applyQuaternion(q);
      pos.push(p[0] + eje.x, p[1] + eje.y, p[2] + eje.z);
      const c = colFn(t, a, rn);
      // grano fino de corteza: sin esto el fuste visto a un metro lee a plástico
      const g = 0.9 + 0.2 * hashAA(i * 7.3 + k * 3.1, k * 1.7 - i * 2.9);
      col.push(c[0] * g, c[1] * g, c[2] * g);
    }
  }
  for (let i = 0; i < nP - 1; i++) {
    for (let k = 0; k < radial; k++) {
      const a = i * radial + k, b = i * radial + ((k + 1) % radial);
      const c = a + radial, d = b + radial;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// camino de rama: sube desde `origen` en `dir`, con deriva lateral (curva) y
// enderezamiento hacia arriba (gravedad negativa = rama que se empina)
function caminoRama(origen, dir, largo, pasos, curva, empinar, rn) {
  const p = [origen.slice()];
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const paso = largo / pasos;
  for (let i = 0; i < pasos; i++) {
    d.x += (rn() - 0.5) * curva; d.z += (rn() - 0.5) * curva;
    d.y += empinar;
    d.normalize();
    const u = p[p.length - 1];
    p.push([u[0] + d.x * paso, u[1] + d.y * paso, u[2] + d.z * paso]);
  }
  return p;
}

const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function lerp3(hexA, hexB, t) {
  _c1.set(hexA); _c2.set(hexB); _c1.lerp(_c2, t);
  return [_c1.r, _c1.g, _c1.b];
}

// cortezas por especie — la corteza también es silueta (el siete cueros se
// llama así por las capas que se le descaman)
const CORTEZAS = {
  // encenillo: pardo rojizo oscuro, musgoso hacia el pie (bosque de niebla)
  encenillo: (t, a, rn) => {
    const m = fbmAA(a * 1.4, t * 7.1, 3);
    const c = lerp3('#4d372c', '#63483a', m);
    if (t < 0.3 && fbmAA(a * 2.2 + 9, t * 11, 2) > 0.68) return lerp3('#4a4a30', '#5a5c38', rn());
    return c;
  },
  // aliso: gris claro LISO con bandas horizontales de lenticelas pálidas
  aliso: (t, a) => {
    const banda = Math.abs(Math.sin(t * 34.0 + Math.sin(a * 2.0) * 0.3));
    if (banda > 0.975) return lerp3('#c3c7b5', '#b1b5a3', 0.5);
    return lerp3('#8d9385', '#757c6f', fbmAA(a * 1.1, t * 5.2, 2));
  },
  // siete cueros: parches de descamación — canela, rojizo, gris viejo, crema
  sietecueros: (t, a) => {
    const m = fbmAA(a * 1.9, t * 6.3, 3);
    if (m < 0.36) return lerp3('#7c4636', '#93573f', m / 0.36);
    if (m < 0.62) return lerp3('#a06a44', '#b98d5e', (m - 0.36) / 0.26);
    return lerp3('#8f8578', '#a89b88', (m - 0.62) / 0.38);
  },
  // gaque: pardo grisáceo parejo, algo moteado
  gaque: (t, a) => lerp3('#5e5347', '#6f6457', fbmAA(a * 1.6, t * 5.8, 3)),
  // mano de oso: pálido, con leves anillos
  mano_de_oso: (t, a) => {
    const m = fbmAA(a * 1.2, t * 4.4, 2);
    const anillo = Math.abs(Math.sin(t * 21.0)) > 0.93 ? 0.16 : 0;
    return lerp3('#877b66', '#9a8e78', Math.min(1, m + anillo));
  },
};

// ═════════════════════════════════════════════════════════════════════════════
//  TEXTURAS DE HOJA — una por especie. La forma y el TAMAÑO de la hoja pintada
//  es lo que separa a las copas cuando la silueta ya hizo su parte.
//  Mismo andamiaje que FollajeMasa.texturaFollaje: capa sombra → cuerpo → luz,
//  centro denso, borde ralo (el alfa cae orgánico).
// ═════════════════════════════════════════════════════════════════════════════
const _cacheTex = new Map();

function texturaHojasEspecie(especie, seed = 11) {
  const clave = `${especie}:${seed}`;
  if (_cacheTex.has(clave)) return _cacheTex.get(clave);
  const tam = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, tam, tam);
  const rn = prngAA(hstr(especie) ^ (seed * 7919 + 13));
  const R = tam / 2;

  const punto = (spread) => {
    const a = rn() * Math.PI * 2;
    const r = R * Math.pow(rn(), 0.58) * spread;
    return [R + Math.cos(a) * r, R + Math.sin(a) * r, r / R];
  };
  const mezclaHex = (a, b, t) => { _c1.set(a); _c2.set(b); _c1.lerp(_c2, t); return _c1.getStyle(); };

  // ── dibujantes de hoja por especie ──────────────────────────────────────────
  // encenillo: PLUMITA — raquis con 3-4 pares de foliolos diminutos + terminal
  const hojaEncenillo = (x, y, L, tono, alfa, rot) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alfa;
    ctx.strokeStyle = tono; ctx.lineWidth = Math.max(0.7, L * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, L * 0.5); ctx.lineTo(0, -L * 0.5); ctx.stroke();
    ctx.fillStyle = tono;
    const pares = 3 + ((rn() * 2) | 0);
    for (let i = 0; i < pares; i++) {
      const ty = L * 0.42 - (i / pares) * L * 0.84;
      const fl = L * (0.16 + 0.05 * (i / pares));
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * fl * 0.72, ty, fl * 0.62, fl * 0.26, s * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.beginPath(); ctx.ellipse(0, -L * 0.5, L * 0.14, L * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  // aliso: OVADA con punta, vena media clara
  const hojaAliso = (x, y, L, tono, alfa, rot, venas) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alfa;
    ctx.fillStyle = tono;
    ctx.beginPath(); ctx.ellipse(0, 0, L * 0.34, L * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-L * 0.16, -L * 0.42); ctx.lineTo(0, -L * 0.62); ctx.lineTo(L * 0.16, -L * 0.42); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = venas; ctx.lineWidth = Math.max(0.6, L * 0.045); ctx.globalAlpha = alfa * 0.7;
    ctx.beginPath(); ctx.moveTo(0, L * 0.46); ctx.lineTo(0, -L * 0.55); ctx.stroke();
    ctx.restore();
  };
  // siete cueros: ELÍPTICA con 3 venas longitudinales (firma melastomatácea)
  const hojaSiete = (x, y, L, tono, alfa, rot, venas) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alfa;
    ctx.fillStyle = tono;
    ctx.beginPath(); ctx.ellipse(0, 0, L * 0.30, L * 0.52, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = venas; ctx.lineWidth = Math.max(0.6, L * 0.04); ctx.globalAlpha = alfa * 0.62;
    for (const s of [-0.55, 0, 0.55]) {
      ctx.beginPath();
      ctx.moveTo(s * L * 0.2, L * 0.48);
      ctx.quadraticCurveTo(s * L * 0.30, 0, s * L * 0.16, -L * 0.48);
      ctx.stroke();
    }
    ctx.restore();
  };
  // flor del siete cueros: 5 pétalos morados con centro dorado (ACENTO)
  const florSiete = (x, y, L, alfa) => {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alfa;
    const morado = rn() < 0.5 ? '#8b3fa8' : '#a457c2';
    ctx.fillStyle = morado;
    const a0 = rn() * Math.PI * 2;
    for (let p = 0; p < 5; p++) {
      const a = a0 + (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * L * 0.32, Math.sin(a) * L * 0.32, L * 0.30, L * 0.19, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#d9b84a';
    ctx.beginPath(); ctx.arc(0, 0, L * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  // gaque: OBOVADA gruesa (huevo con lo ancho al ápice), lustre en el borde alto
  const hojaGaque = (x, y, L, tono, alfa, rot, lustre) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alfa;
    ctx.fillStyle = tono;
    ctx.beginPath();
    ctx.ellipse(0, -L * 0.12, L * 0.40, L * 0.46, 0, 0, Math.PI * 2);
    ctx.ellipse(0, L * 0.3, L * 0.26, L * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // lustre: media luna clara en el hombro superior (hoja coriácea que brilla)
    ctx.globalAlpha = alfa * 0.5;
    ctx.strokeStyle = lustre; ctx.lineWidth = Math.max(1, L * 0.09); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -L * 0.14, L * 0.3, -Math.PI * 0.85, -Math.PI * 0.25); ctx.stroke();
    ctx.restore();
  };

  // ── recetas por especie (paleta + tamaño + densidad) ────────────────────────
  // verde dominante SIEMPRE; los claros son luz, no amarillo de banano
  const RECETAS = {
    encenillo: {
      oscuro: '#20351d', medio: '#31502a', claro: '#5f7c38',
      n: 560, L: [11, 19], dib: (x, y, L, tono, alfa, rot) => hojaEncenillo(x, y, L, tono, alfa, rot),
      spreadCuerpo: 0.97,
    },
    aliso: {
      oscuro: '#38522c', medio: '#527136', claro: '#8aa84e',
      n: 270, L: [22, 36], dib: (x, y, L, tono, alfa, rot) => hojaAliso(x, y, L, tono, alfa, rot, mezclaHex('#8aa84e', '#c9d98a', 0.5)),
      spreadCuerpo: 0.99,
    },
    sietecueros: {
      oscuro: '#27411f', medio: '#3c5c2e', claro: '#6a8c3f',
      n: 330, L: [18, 30], dib: (x, y, L, tono, alfa, rot) => hojaSiete(x, y, L, tono, alfa, rot, mezclaHex('#6a8c3f', '#cfe08a', 0.45)),
      spreadCuerpo: 0.96,
    },
    gaque: {
      oscuro: '#1d3320', medio: '#2c4d29', claro: '#4c7034',
      n: 190, L: [26, 42], dib: (x, y, L, tono, alfa, rot) => hojaGaque(x, y, L, tono, alfa, rot, '#87a852'),
      spreadCuerpo: 0.94,
    },
  };

  const rec = RECETAS[especie];
  if (rec) {
    // capa 1 — SOMBRA interna (manchas difusas al centro)
    for (let i = 0; i < Math.round(rec.n * 0.2); i++) {
      const [x, y] = punto(0.7);
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = mezclaHex(rec.oscuro, rec.medio, rn() * 0.3);
      ctx.beginPath(); ctx.ellipse(x, y, tam * 0.05 + rn() * tam * 0.045, tam * 0.035 + rn() * tam * 0.03, rn() * Math.PI, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // capa 2 — CUERPO (hojas medianas, tono medio con deriva)
    for (let i = 0; i < Math.round(rec.n * 0.52); i++) {
      const [x, y, rr] = punto(rec.spreadCuerpo);
      const t = rn() * 0.5 + rr * 0.22;
      rec.dib(x, y, rec.L[0] + rn() * (rec.L[1] - rec.L[0]), mezclaHex(rec.medio, rec.claro, t), 0.88, rn() * Math.PI * 2);
    }
    // capa 3 — LUZ (hojas más chicas y claras, sesgo arriba: el sol viene de arriba)
    for (let i = 0; i < Math.round(rec.n * 0.28); i++) {
      const [x, y] = punto(0.9);
      rec.dib(x, y - tam * 0.05 * rn(), rec.L[0] * 0.8 + rn() * (rec.L[1] - rec.L[0]) * 0.7,
        mezclaHex(rec.medio, rec.claro, 0.55 + rn() * 0.45), 0.85, rn() * Math.PI * 2);
    }
    // acento del siete cueros: racimos de flor morada AGRUPADOS (no confeti).
    // Tiene que LEERSE a distancia de lineup: es el único acento fuerte del frío.
    if (especie === 'sietecueros') {
      for (let g = 0; g < 6; g++) {
        const [gx, gy] = punto(0.82);
        const grande = g < 2;                 // dos racimos GRANDES: la mata florecida
        const nf = (grande ? 8 : 5) + ((rn() * 4) | 0);
        for (let f = 0; f < nf; f++) {
          const a = rn() * Math.PI * 2, d = Math.pow(rn(), 0.6) * tam * (grande ? 0.115 : 0.09);
          florSiete(gx + Math.cos(a) * d, gy + Math.sin(a) * d, (grande ? 22 : 18) + rn() * 10, 0.95);
        }
      }
      for (let f = 0; f < 6; f++) { const [x, y] = punto(0.92); florSiete(x, y, 14 + rn() * 9, 0.85); }
    }
  }

  // mano de oso: UNA hoja palmeada gigante que llena el card
  if (especie === 'mano_de_oso') {
    const cx = tam / 2, base = tam * 0.9;
    const lobos = 8;
    // peciolo
    ctx.strokeStyle = '#7d8a4a'; ctx.lineWidth = tam * 0.022; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, tam * 0.985); ctx.lineTo(cx, base - tam * 0.02); ctx.stroke();
    for (let i = 0; i < lobos; i++) {
      const a = -Math.PI / 2 + (i / (lobos - 1) - 0.5) * 2.6;   // abanico ±74°
      const centro = 1 - Math.abs(i / (lobos - 1) - 0.5) * 2;   // 1 al centro, 0 al borde
      const L = tam * (0.38 + centro * 0.30) * (0.94 + rn() * 0.1);
      const W = tam * (0.092 + centro * 0.024);
      const tx = cx + Math.cos(a) * L, ty = base + Math.sin(a) * L;
      const tono = mezclaHex('#33512a', '#557533', 0.25 + centro * 0.3 + rn() * 0.2);
      // lóbulo: cinta que se afina hasta la punta (dos curvas)
      ctx.fillStyle = tono; ctx.globalAlpha = 0.96;
      ctx.beginPath();
      const px = -Math.sin(a), py = Math.cos(a);
      ctx.moveTo(cx + px * W * 0.45, base + py * W * 0.45);
      ctx.quadraticCurveTo(cx + Math.cos(a) * L * 0.55 + px * W, base + Math.sin(a) * L * 0.55 + py * W, tx, ty);
      ctx.quadraticCurveTo(cx + Math.cos(a) * L * 0.55 - px * W, base + Math.sin(a) * L * 0.55 - py * W, cx - px * W * 0.45, base - py * W * 0.45);
      ctx.closePath(); ctx.fill();
      // vena central pálida del lóbulo
      ctx.strokeStyle = mezclaHex('#8fae4e', '#cfe08a', 0.4); ctx.lineWidth = Math.max(1.2, W * 0.14);
      ctx.globalAlpha = 0.62;
      ctx.beginPath(); ctx.moveTo(cx, base); ctx.lineTo(cx + Math.cos(a) * L * 0.9, base + Math.sin(a) * L * 0.9); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _cacheTex.set(clave, tex);
  return tex;
}

// ═════════════════════════════════════════════════════════════════════════════
//  ARQUETIPOS — leñoso + lóbulos de copa POR ESPECIE (acá vive la silueta)
//  Cada armador devuelve { lenosos: [geo], esferas, tips? } con todo YA en
//  coordenadas de mundo del árbol (base en y=0).
// ═════════════════════════════════════════════════════════════════════════════
function armarEncenillo(rn) {
  const H = 9 + rn() * 4;
  const s = H / 11;
  const lenosos = [];
  // tronco algo torcido, oscuro
  const base = caminoRama([0, -0.3, 0], [rn() * 0.14 - 0.07, 1, rn() * 0.14 - 0.07], H * 0.62, 6, 0.10, 0.06, rn);
  lenosos.push(tuboAfinado(base, 0.34 * s, 0.17 * s, 7, CORTEZAS.encenillo, rn));
  // ramas EMPINADAS que abren hacia arriba (el cono invertido nace acá)
  const nR = 6;
  const top = base[base.length - 1];
  for (let i = 0; i < nR; i++) {
    const a = (i / nR) * Math.PI * 2 + rn() * 0.5;
    const rama = caminoRama(
      [top[0], top[1] - H * 0.06 * rn(), top[2]],
      [Math.cos(a) * 0.75, 1.05, Math.sin(a) * 0.75],
      H * 0.4, 4, 0.08, 0.1, rn
    );
    lenosos.push(tuboAfinado(rama, 0.11 * s, 0.03 * s, 5, CORTEZAS.encenillo, rn));
  }
  // copa: anillo ancho ARRIBA + centro + anillo angosto abajo → cono invertido
  const esferas = [];
  const rTop = 2.55 * s;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rn() * 0.4;
    esferas.push({
      c: [Math.cos(a) * rTop, H * 0.9 + (rn() - 0.5) * 0.5 * s, Math.sin(a) * rTop],
      r: (1.45 + rn() * 0.3) * s, esc: [1.18, 0.68, 1.18],
    });
  }
  esferas.push({ c: [0, H * 0.96, 0], r: 1.75 * s, esc: [1.3, 0.6, 1.3] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rn() * 0.6;
    esferas.push({
      c: [Math.cos(a) * 1.3 * s, H * 0.74 + (rn() - 0.5) * 0.4 * s, Math.sin(a) * 1.3 * s],
      r: (1.0 + rn() * 0.25) * s, esc: [1.1, 0.78, 1.1],
    });
  }
  esferas.push({ c: [(rn() - 0.5) * s, H * 0.6, (rn() - 0.5) * s], r: 0.8 * s, esc: [1, 0.8, 1] });
  return { H, lenosos, esferas };
}

function armarAliso(rn) {
  const H = 12 + rn() * 5;
  const s = H / 14.5;
  const lenosos = [];
  // tronco RECTO y esbelto, gris claro
  const tronco = caminoRama([0, -0.3, 0], [rn() * 0.05 - 0.025, 1, rn() * 0.05 - 0.025], H * 0.92, 7, 0.045, 0.02, rn);
  lenosos.push(tuboAfinado(tronco, 0.27 * s, 0.05 * s, 7, CORTEZAS.aliso, rn));
  // pocas ramas ascendentes alternas; cada una lleva un lóbulo en la punta
  const esferas = [];
  const nR = 5 + ((rn() * 2) | 0);
  for (let i = 0; i < nR; i++) {
    const t = 0.52 + (i / nR) * 0.44;
    const a = i * 2.4 + rn() * 0.8;              // filotaxia en espiral
    const o = tronco[Math.min(tronco.length - 1, Math.round(t * (tronco.length - 1)))];
    const largo = H * (0.2 - (t - 0.52) * 0.13) * (0.9 + rn() * 0.3);
    const rama = caminoRama(o, [Math.cos(a) * 1.0, 0.85, Math.sin(a) * 1.0], largo, 3, 0.06, 0.06, rn);
    lenosos.push(tuboAfinado(rama, 0.075 * s, 0.02 * s, 5, CORTEZAS.aliso, rn));
    const tip = rama[rama.length - 1];
    // lóbulos SEPARADOS — el cielo pasa entre ellos (copa abierta y clara)
    esferas.push({
      c: [tip[0], tip[1] + 0.3 * s, tip[2]],
      r: (0.95 + rn() * 0.45) * s, esc: [1.12, 0.8, 1.12],
    });
  }
  // remate apical
  esferas.push({ c: [tronco[tronco.length - 1][0], H * 0.99, tronco[tronco.length - 1][2]], r: 0.9 * s, esc: [1, 0.85, 1] });
  return { H, lenosos, esferas };
}

function armarSietecueros(rn) {
  const H = 5.2 + rn() * 2.6;
  const s = H / 6.5;
  const lenosos = [];
  // tronco SINUOSO que se horqueta bajo (a ~30%) en 2-3 fustes también sinuosos
  const pie = caminoRama([0, -0.25, 0], [rn() * 0.3 - 0.15, 1, rn() * 0.3 - 0.15], H * 0.3, 4, 0.30, 0.02, rn);
  lenosos.push(tuboAfinado(pie, 0.30 * s, 0.20 * s, 7, CORTEZAS.sietecueros, rn));
  const horqueta = pie[pie.length - 1];
  const nF = 2 + (rn() < 0.6 ? 1 : 0);
  const puntas = [];
  for (let i = 0; i < nF; i++) {
    const a = (i / nF) * Math.PI * 2 + rn() * 1.2;
    const fuste = caminoRama(horqueta, [Math.cos(a) * 0.65, 1, Math.sin(a) * 0.65], H * 0.5, 5, 0.26, 0.05, rn);
    lenosos.push(tuboAfinado(fuste, 0.17 * s, 0.06 * s, 6, CORTEZAS.sietecueros, rn));
    puntas.push(fuste[fuste.length - 1]);
  }
  // domo ANCHO y bajo (más ancho que alto), asentado sobre las puntas
  const esferas = [];
  esferas.push({ c: [0, H * 0.76, 0], r: 1.5 * s, esc: [1.35, 0.9, 1.35] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rn() * 0.5;
    esferas.push({
      c: [Math.cos(a) * 1.95 * s, H * 0.64 + (rn() - 0.5) * 0.5 * s, Math.sin(a) * 1.95 * s],
      r: (1.15 + rn() * 0.3) * s, esc: [1.2, 0.85, 1.2],
    });
  }
  for (const p of puntas) {
    esferas.push({ c: [p[0], p[1] + 0.2 * s, p[2]], r: (0.9 + rn() * 0.2) * s, esc: [1.1, 0.8, 1.1] });
  }
  return { H, lenosos, esferas };
}

function armarGaque(rn) {
  const H = 6.5 + rn() * 3;
  const s = H / 8;
  const lenosos = [];
  // tronco corto y fornido con horqueta baja de ramas gruesas
  const tronco = caminoRama([0, -0.25, 0], [rn() * 0.1 - 0.05, 1, rn() * 0.1 - 0.05], H * 0.38, 4, 0.09, 0.03, rn);
  lenosos.push(tuboAfinado(tronco, 0.33 * s, 0.2 * s, 7, CORTEZAS.gaque, rn));
  const top = tronco[tronco.length - 1];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rn() * 0.7;
    const rama = caminoRama(top, [Math.cos(a) * 0.6, 1.1, Math.sin(a) * 0.6], H * 0.3, 3, 0.08, 0.1, rn);
    lenosos.push(tuboAfinado(rama, 0.12 * s, 0.04 * s, 5, CORTEZAS.gaque, rn));
  }
  // copa OVOIDE compacta: lóbulos solapados en columna — una sola masa de huevo
  const esferas = [
    { c: [0, H * 0.6, 0], r: 1.62 * s, esc: [1.12, 1.2, 1.12] },
    { c: [(rn() - 0.5) * 0.5 * s, H * 0.8, (rn() - 0.5) * 0.5 * s], r: 1.42 * s, esc: [1.08, 1.0, 1.08] },
    { c: [0, H * 0.94, 0], r: 1.0 * s, esc: [1.05, 0.8, 1.05] },
  ];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rn() * 0.8;
    esferas.push({
      c: [Math.cos(a) * 0.95 * s, H * 0.62 + rn() * 0.3 * s, Math.sin(a) * 0.95 * s],
      r: (1.05 + rn() * 0.2) * s, esc: [1.05, 1.05, 1.05],
    });
  }
  return { H, lenosos, esferas };
}

function armarManoDeOso(rn) {
  const H = 4.2 + rn() * 2.2;
  const s = H / 5.2;
  const lenosos = [];
  // tallo delgado casi sin ramas
  const tallo = caminoRama([0, -0.2, 0], [rn() * 0.12 - 0.06, 1, rn() * 0.12 - 0.06], H * 0.94, 6, 0.07, 0.03, rn);
  lenosos.push(tuboAfinado(tallo, 0.14 * s, 0.055 * s, 6, CORTEZAS.mano_de_oso, rn));
  const tips = [tallo[tallo.length - 1]];
  const nB = 2 + ((rn() * 2) | 0);
  for (let i = 0; i < nB; i++) {
    const a = (i / nB) * Math.PI * 2 + rn();
    const t = 0.72 + rn() * 0.16;
    const o = tallo[Math.min(tallo.length - 1, Math.round(t * (tallo.length - 1)))];
    const rama = caminoRama(o, [Math.cos(a) * 0.9, 0.75, Math.sin(a) * 0.9], H * 0.22, 3, 0.07, 0.06, rn);
    lenosos.push(tuboAfinado(rama, 0.05 * s, 0.022 * s, 5, CORTEZAS.mano_de_oso, rn));
    tips.push(rama[rama.length - 1]);
  }
  // núcleos chicos y oscuros bajo cada roseta (tapan el hueco del quitasol)
  const esferas = tips.map((p) => ({
    c: [p[0], p[1] - 0.1 * s, p[2]], r: 0.52 * s, esc: [1.3, 0.42, 1.3],
  }));
  return { H, lenosos, esferas, tips, s };
}

// rosetas terminales de hoja palmeada — el quitasol del mano de oso.
// Cards GRANDES (una hoja rica por card), normal inclinada arriba-afuera,
// con el "arriba" de la textura apuntando hacia afuera de la roseta.
function cardsPalmeadas(tips, s, rn) {
  const P = [], N = [], UV = [], COL = [];
  const nrm = new THREE.Vector3(), outH = new THREE.Vector3(), upT = new THREE.Vector3();
  const right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), roll = new THREE.Quaternion();
  const esq = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (const tip of tips) {
    const nH = 11 + ((rn() * 3) | 0);
    for (let i = 0; i < nH; i++) {
      const a = (i / nH) * Math.PI * 2 + rn() * 0.4;
      const el = 0.42 + rn() * 0.55;                   // elevación: 24°..56°
      outH.set(Math.cos(a), 0, Math.sin(a));
      nrm.copy(outH).multiplyScalar(Math.cos(el)).addScaledVector(up, Math.sin(el)).normalize();
      upT.copy(outH).addScaledVector(nrm, -outH.dot(nrm)).normalize();
      right.crossVectors(upT, nrm).normalize();
      m.makeBasis(right, upT, nrm);
      q.setFromRotationMatrix(m);
      roll.setFromAxisAngle(nrm, (rn() - 0.5) * 0.5); q.premultiply(roll);
      const t = (1.35 + rn() * 0.55) * s;
      const cx = tip[0] + outH.x * (0.5 + rn() * 0.4) * s;
      const cy = tip[1] + (rn() * 0.22 - 0.04) * s;
      const cz = tip[2] + outH.z * (0.5 + rn() * 0.4) * s;
      const w = t / 2, h = t / 2;
      esq[0].set(-w, -h, 0); esq[1].set(w, -h, 0); esq[2].set(w, h, 0); esq[3].set(-w, h, 0);
      const lum = 0.8 + Math.sin(el) * 0.3 + rn() * 0.12;   // la hoja alta recibe más sol
      const flip = rn() < 0.5 ? 1 : 0;
      const orden = [0, 1, 2, 0, 2, 3];
      for (let k = 0; k < 6; k++) {
        const v = esq[orden[k]].clone().applyQuaternion(q);
        P.push(cx + v.x, cy + v.y, cz + v.z);
        N.push(nrm.x, nrm.y, nrm.z);
        UV.push(orden[k] === 0 ? (flip ? 1 : 0) : orden[k] === 1 ? (flip ? 0 : 1) : orden[k] === 2 ? (flip ? 0 : 1) : (flip ? 1 : 0), orden[k] < 2 ? 0 : 1);
        COL.push(lum, lum, lum);
      }
    }
    // hojas casi horizontales cerrando el centro del quitasol
    for (let i = 0; i < 3 + ((rn() * 2) | 0); i++) {
      const a = rn() * Math.PI * 2;
      nrm.set((rn() - 0.5) * 0.3, 1, (rn() - 0.5) * 0.3).normalize();
      upT.set(Math.cos(a), 0, Math.sin(a)).addScaledVector(nrm, -nrm.dot(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)))).normalize();
      right.crossVectors(upT, nrm).normalize();
      m.makeBasis(right, upT, nrm); q.setFromRotationMatrix(m);
      const t = (1.0 + rn() * 0.4) * s;
      const w = t / 2;
      esq[0].set(-w, -w, 0); esq[1].set(w, -w, 0); esq[2].set(w, w, 0); esq[3].set(-w, w, 0);
      const lum = 1.0 + rn() * 0.15;
      const orden = [0, 1, 2, 0, 2, 3];
      for (let k = 0; k < 6; k++) {
        const v = esq[orden[k]].clone().applyQuaternion(q);
        P.push(tip[0] + v.x, tip[1] + 0.16 * s + v.y, tip[2] + v.z);
        N.push(nrm.x, nrm.y, nrm.z);
        UV.push(orden[k] === 0 ? 0 : orden[k] === 1 ? 1 : orden[k] === 2 ? 1 : 0, orden[k] < 2 ? 0 : 1);
        COL.push(lum, lum, lum);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(COL, 3));
  g.computeBoundingSphere();
  return g;
}

// gradientes de luz de copa por especie (abajo sombra → cumbre luz)
const GRADIENTES = {
  encenillo: ['#22371f', '#4a6a2e'],
  aliso: ['#3a5230', '#7fa04a'],
  sietecueros: ['#2c452a', '#527238'],
  gaque: ['#1e3520', '#3f6030'],
  mano_de_oso: ['#2f4a28', '#5c7d38'],
};
function gradienteCopa(especie, yMin, yMax) {
  const abajo = new THREE.Color(GRADIENTES[especie][0]);
  const arriba = new THREE.Color(GRADIENTES[especie][1]);
  const tmp = new THREE.Color();
  return (x, y, z) => {
    const t = THREE.MathUtils.clamp((y - yMin) / Math.max(yMax - yMin, 0.01), 0, 1);
    tmp.copy(abajo).lerp(arriba, t * t * 0.2 + t * 0.8 + (fbmAA(x * 0.7, z * 0.7, 2) - 0.5) * 0.22);
    return tmp;
  };
}

// opciones de cards por especie (tamaño del card ∝ tamaño de la hoja pintada)
const CARDS_OPTS = {
  encenillo: { cobertura: 1.3, tamCardK: 0.9, modulacion: 0.46 },
  aliso: { cobertura: 1.05, tamCardK: 1.05, modulacion: 0.4 },
  sietecueros: { cobertura: 1.2, tamCardK: 1.0, modulacion: 0.42 },
  gaque: { cobertura: 1.35, tamCardK: 1.1, modulacion: 0.4 },
};

const ARMADORES = {
  encenillo: armarEncenillo, aliso: armarAliso, sietecueros: armarSietecueros,
  gaque: armarGaque, mano_de_oso: armarManoDeOso,
};

// ── arquetipo completo: { opaca, cards, H, radio } ───────────────────────────
function construirArquetipo(especie, seed) {
  const rn = prngAA(hstr(especie) * 31 + seed);
  const arm = ARMADORES[especie](rn);
  const yTop = arm.H * 1.05;
  const grad = gradienteCopa(especie, arm.H * 0.4, yTop);

  // núcleo esculpido (segmentación reducida: es bosque, no un solo héroe)
  const nucleo = geometriaNucleoMasa(THREE, arm.esferas, {
    seed: seed + hstr(especie) % 97,
    gradiente: grad,
    segs: [10, 7],
    rugosidad: especie === 'gaque' ? 0.22 : 0.34,   // el gaque es liso y compacto
    sombra: 0.46,
    encoger: 0.94,
  });
  const opaca = fusionarPreservando(THREE, [...arm.lenosos, nucleo]);

  let cards;
  if (especie === 'mano_de_oso') {
    cards = cardsPalmeadas(arm.tips, arm.s, rn);
  } else {
    const o = CARDS_OPTS[especie];
    const rMedio = arm.esferas.reduce((s2, e) => s2 + e.r, 0) / arm.esferas.length;
    cards = geometriaCardsMasa(THREE, arm.esferas, {
      seed: seed * 7 + 3,
      gradiente: grad,
      cobertura: o.cobertura,
      tamCard: Math.min(3.2, Math.max(1.0, rMedio * 0.62 * o.tamCardK)),
      modulacion: o.modulacion,
      maxCards: 90,          // por lóbulo; la masa la da la TEXTURA, no el conteo
    });
  }
  // radio de copa aproximado (para espaciado e impostor)
  let radio = 0;
  for (const e of arm.esferas) {
    const [sx, , sz] = e.esc ?? [1, 1, 1];
    const rr = Math.hypot(e.c[0], e.c[2]) + e.r * Math.max(sx, sz);
    if (rr > radio) radio = rr;
  }
  return { opaca, cards, H: arm.H, radio };
}

// ═════════════════════════════════════════════════════════════════════════════
//  MATERIALES + CORTE POR DISTANCIA (disolución screen-door opaca, sin sorting)
// ═════════════════════════════════════════════════════════════════════════════
function parcheCorteDetalle(mat, unif) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCorteAAa = unif.uCorteAAa;
    shader.uniforms.uCorteAAb = unif.uCorteAAb;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vDistAA;\nuniform float uCorteAAb;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vDistAA = -mvPosition.z;
        if (vDistAA > uCorteAAb) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDistAA;\nuniform float uCorteAAa, uCorteAAb;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        {
          float _kAA = smoothstep(uCorteAAa, uCorteAAb, vDistAA);
          if (_kAA > 0.001) {
            float _hAA = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
            if (_hAA < _kAA) discard;
          }
        }`);
    if (prev) prev(shader);
  };
  mat.needsUpdate = true;
  return mat;
}

function materialesEspecie(especie, opts = {}) {
  const tex = texturaHojasEspecie(especie, opts.seedTex ?? 11);
  const brillo = especie === 'gaque' ? 0.3 : especie === 'mano_de_oso' ? 0.22 : 0.16;
  const matCards = materialFollaje(THREE, tex, { brillo, alphaTest: 0.3 });
  if (especie === 'gaque') matCards.roughness = 0.55;   // hoja coriácea: lustre
  const matOpaca = materialNucleo(THREE, { brillo: 0.08, tono: GRADIENTES[especie][0] });
  return { matCards, matOpaca, tex };
}

// ═════════════════════════════════════════════════════════════════════════════
//  HÉROE — un árbol suelto (lineup, mundos chicos, jardines). Sin corte LOD.
//  Devuelve { grupo, matCards, matOpaca, H, radio }. El viento se aplica acá
//  mismo salvo opts.viento === false (patrón aplicarVientoMundo de la casa).
// ═════════════════════════════════════════════════════════════════════════════
export function crearArbolAltoandino(especie, opts = {}) {
  if (!ARMADORES[especie]) throw new Error(`especie desconocida: ${especie}`);
  const seed = opts.seed ?? 1;
  const arq = construirArquetipo(especie, seed);
  const { matCards, matOpaca } = materialesEspecie(especie, opts);
  const grupo = new THREE.Group();
  grupo.name = `arbol-${especie}`;
  const mOp = new THREE.Mesh(arq.opaca, matOpaca);
  const mCa = new THREE.Mesh(arq.cards, matCards);
  grupo.add(mOp); grupo.add(mCa);
  if (opts.viento !== false) {
    const piso = arq.H * (especie === 'aliso' ? 0.4 : 0.3);
    aplicarVientoMundo(matCards, { amplitud: 0.1, piso, velocidad: 0.95 });
    aplicarVientoMundo(matOpaca, { amplitud: 0.05, piso, velocidad: 0.9 });
  }
  return { grupo, matCards, matOpaca, H: arq.H, radio: arq.radio };
}

// ═════════════════════════════════════════════════════════════════════════════
//  IMPOSTOR — atlas pintado con la MISMA receta de lóbulos del detalle:
//  la silueta lejana es la misma silueta cercana, especie por especie.
// ═════════════════════════════════════════════════════════════════════════════
const ORDEN_IMPOSTOR = ['encenillo', 'aliso', 'sietecueros', 'gaque', 'mano_de_oso'];

export function texturaAtlasImpostor(seed = 5) {
  const clave = `atlas:${seed}`;
  if (_cacheTex.has(clave)) return _cacheTex.get(clave);
  const W = 256, Hpx = 512;
  const cv = document.createElement('canvas');
  cv.width = W * ORDEN_IMPOSTOR.length; cv.height = Hpx;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);

  ORDEN_IMPOSTOR.forEach((especie, col) => {
    const rn = prngAA(hstr(especie) * 31 + seed);
    const arm = ARMADORES[especie](rn);
    const ox = col * W;
    const escala = (Hpx * 0.94) / (arm.H * 1.12);       // el árbol llena el tile
    const px = (x) => ox + W / 2 + x * escala;
    const py = (y) => Hpx - 6 - y * escala;
    // leñoso: fuste estilizado (la silueta lejana la dan los LÓBULOS)
    const troncoCol = { encenillo: '#54382c', aliso: '#9aa091', sietecueros: '#966041', gaque: '#6a5f52', mano_de_oso: '#8a7d68' };
    ctx.strokeStyle = troncoCol[especie] ?? '#5a4436';
    ctx.lineCap = 'round';
    const anchoBase = { encenillo: 6, aliso: 5, sietecueros: 5, gaque: 6, mano_de_oso: 4 }[especie];
    ctx.lineWidth = anchoBase;
    ctx.beginPath();
    const sway = especie === 'sietecueros' ? 14 : especie === 'encenillo' ? 6 : 2;
    ctx.moveTo(px(0), py(0));
    ctx.quadraticCurveTo(px(0) + sway, py(arm.H * 0.3), px(0) + sway * 0.4, py(arm.H * 0.62));
    ctx.stroke();
    if (especie === 'sietecueros') {
      // la horqueta baja del siete cueros también se ve de lejos (FINA: de
      // arriba en escorzo una horqueta gorda rendía como placa parda)
      ctx.lineWidth = anchoBase * 0.45;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(px(0) + sway * 0.7, py(arm.H * 0.28));
        ctx.quadraticCurveTo(px(s * 0.7), py(arm.H * 0.45), px(s * 1.0), py(arm.H * 0.62));
        ctx.stroke();
      }
    }
    if (especie === 'aliso' || especie === 'mano_de_oso') {
      ctx.lineWidth = anchoBase;
      ctx.beginPath();
      ctx.moveTo(px(0) + sway * 0.4, py(arm.H * 0.6));
      ctx.lineTo(px(0), py(arm.H * 0.92));
      ctx.stroke();
    }
    // lóbulos → moteo de hojitas (masa, no globo plano)
    const [oscuro, claro] = GRADIENTES[especie];
    const dabs = especie === 'mano_de_oso' ? 0 : 190;
    for (const e of arm.esferas) {
      const [sx, sy] = e.esc ?? [1, 1, 1];
      for (let i = 0; i < dabs * (e.r / 1.5); i++) {
        const a = rn() * Math.PI * 2, rr = Math.pow(rn(), 0.5);
        const dx = Math.cos(a) * rr * e.r * sx, dy = Math.sin(a) * rr * e.r * sy * 0.9;
        const yy = e.c[1] + dy;
        const t = THREE.MathUtils.clamp((yy - arm.H * 0.45) / (arm.H * 0.6), 0, 1);
        _c1.set(oscuro); _c2.set(claro);
        // sesgo claro: el impostor vive lejos, donde la luz ya lo aplanó — si se
        // pinta con la sombra del detalle, rinde como plancha oscura
        _c1.lerp(_c2, Math.min(1, 0.34 + t * (0.4 + rn() * 0.55)));
        ctx.fillStyle = _c1.getStyle();
        ctx.globalAlpha = 0.8 + rn() * 0.2;
        const rad = 2.2 + rn() * 3.2;
        ctx.beginPath();
        ctx.ellipse(px(e.c[0] + dx), py(yy), rad * 1.4, rad, rn() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // siete cueros: parches morados en la superficie del domo (acento)
    if (especie === 'sietecueros') {
      for (let g = 0; g < 8; g++) {
        const e = arm.esferas[(rn() * arm.esferas.length) | 0];
        const a = rn() * Math.PI * 2;
        const cx0 = px(e.c[0] + Math.cos(a) * e.r * 0.8);
        const cy0 = py(e.c[1] + Math.abs(Math.sin(a)) * e.r * 0.55);
        for (let f = 0; f < 5 + rn() * 5; f++) {
          ctx.fillStyle = rn() < 0.5 ? '#8b3fa8' : '#a457c2';
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.arc(cx0 + (rn() - 0.5) * 16, cy0 + (rn() - 0.5) * 12, 1.6 + rn() * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // mano de oso: quitasol de trazos radiales gruesos (la palmeada de lejos)
    if (especie === 'mano_de_oso') {
      for (const tip of arm.tips) {
        const nL = 9;
        for (let i = 0; i < nL; i++) {
          const a = (i / nL) * Math.PI * 2 + rn() * 0.3;
          const L = (0.9 + rn() * 0.5) * arm.s * escala;
          _c1.set(GRADIENTES.mano_de_oso[0]); _c2.set(GRADIENTES.mano_de_oso[1]);
          _c1.lerp(_c2, 0.3 + rn() * 0.6);
          ctx.strokeStyle = _c1.getStyle();
          ctx.globalAlpha = 0.92;
          ctx.lineWidth = 4.5 + rn() * 2;
          ctx.beginPath();
          ctx.moveTo(px(tip[0]), py(tip[1]));
          ctx.lineTo(px(tip[0]) + Math.cos(a) * L, py(tip[1]) - Math.abs(Math.sin(a)) * L * 0.35 + 3);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  });

  // SANGRADO: los texeles transparentes quedan rgb=0 y los mipmaps promedian
  // contra NEGRO → de lejos y en ángulo rasante el impostor rendía como placa
  // oscura. Se rellena el rgb de todo texel vacío con el verde medio del tile.
  {
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const px = img.data;
    const medios = ORDEN_IMPOSTOR.map((e) => {
      _c1.set(GRADIENTES[e][0]); _c2.set(GRADIENTES[e][1]); _c1.lerp(_c2, 0.55);
      return [(_c1.r * 255) | 0, (_c1.g * 255) | 0, (_c1.b * 255) | 0];
    });
    for (let y = 0; y < cv.height; y++) {
      for (let x = 0; x < cv.width; x++) {
        const i = (y * cv.width + x) * 4;
        if (px[i + 3] === 0) {
          const m = medios[Math.min(medios.length - 1, (x / W) | 0)];
          px[i] = m[0]; px[i + 1] = m[1]; px[i + 2] = m[2];
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _cacheTex.set(clave, tex);
  return tex;
}

// cruz de 3 planos, pivote en la base, 3 segmentos verticales (para el meneo)
function geoCruzImpostor() {
  const pos = [], uv = [], idx = [];
  let base = 0;
  for (let p = 0; p < 3; p++) {
    const a = (p / 3) * Math.PI;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let fila = 0; fila <= 3; fila++) {
      const y = fila / 3;
      for (const ex of [-0.5, 0.5]) {
        pos.push(ex * ca, y, ex * sa);
        uv.push(ex + 0.5, y);
      }
    }
    for (let fila = 0; fila < 3; fila++) {
      const f0 = base + fila * 2, f1 = base + (fila + 1) * 2;
      idx.push(f0, f0 + 1, f1, f1, f0 + 1, f1 + 1);
    }
    base += 8;
  }
  // TAPA horizontal a la altura de la copa: sin ella, visto desde ARRIBA (vista
  // de dosel) el impostor de planos verticales se colapsa a rayitas. La tapa
  // muestrea la franja de copa del tile (moteo de hojas) — leída cenital cuela.
  {
    const yT = 0.76, w = 0.36;
    for (const [ex, ez] of [[-w, -w], [w, -w], [-w, w], [w, w]]) {
      pos.push(ex, yT, ez);
      uv.push(ex / (w * 2) + 0.5, 0.58 + (ez / (w * 2) + 0.5) * 0.32);
    }
    idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

const VERT_IMPOSTOR = /* glsl */`
  attribute vec2 aVar;                    // (u0, anchoU) del tile en el atlas
  uniform float uTiempoVM, uFuerzaVM, uCorteLejos;
  varying vec2 vUv;
  varying float vDist, vAlt;
  varying vec3 vTint;
  #include <fog_pars_vertex>
  void main() {
    vec3 p = position;
    float hf = clamp(p.y, 0.0, 1.0);
    vec4 wp4 = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vec3 wp = wp4.xyz;
    float fase = wp.x * 0.11 + wp.z * 0.09;
    float onda = sin(uTiempoVM * 0.9 + fase) + 0.42 * sin(uTiempoVM * 1.9 + fase * 1.7);
    float alto = length(instanceMatrix[1].xyz);
    wp.x += uFuerzaVM * onda * hf * hf * 0.035 * alto;
    wp.z += uFuerzaVM * onda * hf * hf * 0.018 * alto;
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    vDist = -mv.z;
    if (vDist > uCorteLejos) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vAlt = hf;
    vUv = vec2(aVar.x + uv.x * aVar.y, uv.y);
    #ifdef USE_INSTANCING_COLOR
      vTint = instanceColor;
    #else
      vTint = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * mv;
    #ifdef USE_FOG
      vFogDepth = vDist;
    #endif
  }
`;

const FRAG_IMPOSTOR = /* glsl */`
  precision mediump float;
  uniform sampler2D uMapa;
  uniform float uEntraA, uEntraB, uAmbiente;
  varying vec2 vUv;
  varying float vDist, vAlt;
  varying vec3 vTint;
  #include <fog_pars_fragment>
  void main() {
    vec4 t = texture2D(uMapa, vUv);
    if (t.a < 0.38) discard;
    // el impostor SE MATERIALIZA donde el detalle se disuelve (misma ventana):
    float k = smoothstep(uEntraA, uEntraB, vDist);
    if (k < 0.999) {
      float h = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      if (h > k) discard;
    }
    vec3 c = t.rgb * vTint * mix(0.85, 1.22, vAlt) * uAmbiente;
    gl_FragColor = vec4(c, 1.0);
    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`;

// ═════════════════════════════════════════════════════════════════════════════
//  EL BOSQUE — fábrica principal.
//  opts:
//    area         {x0,x1,z0,z1}   (def 240×240 m centrado)
//    alturaEn     (x,z)=>y        altura del terreno (def 0)
//    libre        (x,z)=>bool     false = vetado (camino, agua, construcción)
//    humedadEn    (x,z)=>0..1     el aliso busca >0.55 (vaguadas) si existe
//    densidad     árboles/100 m²  (def 3.2 — bosque cerrado)
//    composicion  {especie:frac}  (def dominancia de encenillo)
//    rDetalle     m (def 46) · banda m (def 12) · corteLejos m (def 420)
//    celda        m (def 48) · seed · ambiente 0..1
//  → { grupo, actualizar(camara), stats(), arboles, dispose() }
// ═════════════════════════════════════════════════════════════════════════════
export function crearBosqueAltoandino(opts = {}) {
  const area = opts.area ?? { x0: -120, x1: 120, z0: -120, z1: 120 };
  const alturaEn = opts.alturaEn ?? (() => 0);
  const libre = opts.libre ?? (() => true);
  const humedadEn = opts.humedadEn ?? null;
  const seed = opts.seed ?? 20260807;
  const densidad = opts.densidad ?? 3.2;
  const comp = opts.composicion ?? {
    encenillo: 0.34, aliso: 0.16, gaque: 0.13, sietecueros: 0.19, mano_de_oso: 0.18,
  };
  const rDetalle = opts.rDetalle ?? 42;
  const banda = opts.banda ?? 10;
  const corteLejos = opts.corteLejos ?? 420;
  const tamCelda = opts.celda ?? 48;
  const ambiente = opts.ambiente ?? 1.0;
  const rn = prngAA(seed);

  const grupo = new THREE.Group();
  grupo.name = 'bosque-altoandino';

  // ── siembra con espaciado por radio de copa (los doseles apenas se tocan) ──
  const m2 = (area.x1 - area.x0) * (area.z1 - area.z0);
  const objetivo = Math.round((m2 / 100) * densidad);
  const puestos = [];             // {x,z,y,especie,esc,giro,estrato}
  const hashCel = new Map();      // rejilla 4 m para vecinos
  const RADIOS = { encenillo: 3.2, aliso: 2.8, sietecueros: 2.9, gaque: 2.6, mano_de_oso: 1.9 };
  // ESTRATOS: el bosque real es un edificio — dosel (A) arriba, sotobosque (B)
  // metido DEBAJO. Cada estrato compite por espacio solo consigo mismo; entre
  // estratos únicamente se respeta el fuste (que dos troncos no se atraviesen).
  const ESTRATO = { encenillo: 'A', aliso: 'A', gaque: 'A', sietecueros: 'B', mano_de_oso: 'B' };
  const clave4 = (x, z) => `${Math.floor(x / 4)}:${Math.floor(z / 4)}`;
  const cabe = (x, z, r, estrato) => {
    const gx = Math.floor(x / 4), gz = Math.floor(z / 4);
    const al = Math.ceil((r + 3.5) / 4);
    for (let a = -al; a <= al; a++) {
      for (let b = -al; b <= al; b++) {
        const lista = hashCel.get(`${gx + a}:${gz + b}`);
        if (!lista) continue;
        for (const p of lista) {
          const dd = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
          const rr = p.estrato === estrato
            ? (r + p.r) * 0.6                    // mismo estrato: el dosel se toca un poco
            : 1.7;                               // estrato distinto: solo el fuste
          if (dd < rr * rr) return false;
        }
      }
    }
    return true;
  };
  const anotar = (p) => {
    const k = clave4(p.x, p.z);
    if (!hashCel.has(k)) hashCel.set(k, []);
    hashCel.get(k).push(p);
    puestos.push(p);
  };

  // dosel primero (encenillo/aliso/gaque), sotobosque después llena huecos
  const ordenSiembra = ['encenillo', 'aliso', 'gaque', 'sietecueros', 'mano_de_oso'];
  for (const especie of ordenSiembra) {
    const frac = comp[especie] ?? 0;
    const meta = Math.round(objetivo * frac);
    let logrados = 0;
    for (let intento = 0; intento < meta * 30 && logrados < meta; intento++) {
      const x = area.x0 + rn() * (area.x1 - area.x0);
      const z = area.z0 + rn() * (area.z1 - area.z0);
      if (!libre(x, z)) continue;
      // el aliso busca la vaguada húmeda (si el mundo informa humedad)
      if (humedadEn && especie === 'aliso' && humedadEn(x, z) < 0.55 && intento < meta * 18) continue;
      const r = RADIOS[especie];
      const estrato = ESTRATO[especie];
      if (!cabe(x, z, r, estrato)) continue;
      const esc = 0.82 + rn() * 0.42;
      anotar({
        x, z, y: alturaEn(x, z), r: r * esc, especie, esc, estrato,
        giro: rn() * Math.PI * 2,
        tinte: 0.9 + rn() * 0.2,
      });
      logrados++;
    }
  }

  // ── materiales por especie con corte LOD compartido ────────────────────────
  const unifCorte = {
    uCorteAAa: { value: rDetalle - banda },
    uCorteAAb: { value: rDetalle },
  };
  const mats = {};
  for (const especie of ORDEN_IMPOSTOR) {
    const m = materialesEspecie(especie, opts);
    parcheCorteDetalle(m.matCards, unifCorte);
    parcheCorteDetalle(m.matOpaca, unifCorte);
    const piso = (ESPECIES_FRIO[especie].altura[0]) * (especie === 'aliso' ? 0.4 : 0.28);
    aplicarVientoMundo(m.matCards, { amplitud: 0.1, piso, velocidad: 0.95 });
    aplicarVientoMundo(m.matOpaca, { amplitud: 0.05, piso, velocidad: 0.9 });
    mats[especie] = m;
  }

  // ── arquetipo por especie + reparto en CELDAS ──────────────────────────────
  const arqs = {};
  for (const especie of ORDEN_IMPOSTOR) arqs[especie] = construirArquetipo(especie, seed % 1000 + 7);

  const celdas = new Map();       // "cx:cz" → { centro, meshes: [], porEspecie: Map }
  const claveCelda = (x, z) => `${Math.floor((x - area.x0) / tamCelda)}:${Math.floor((z - area.z0) / tamCelda)}`;
  const porCelda = new Map();
  for (const p of puestos) {
    const k = claveCelda(p.x, p.z);
    if (!porCelda.has(k)) porCelda.set(k, new Map());
    const porEsp = porCelda.get(k);
    if (!porEsp.has(p.especie)) porEsp.set(p.especie, []);
    porEsp.get(p.especie).push(p);
  }

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3();
  const _s = new THREE.Vector3(), _eje = new THREE.Vector3(0, 1, 0), _col = new THREE.Color();
  let trisDetalle = 0;

  for (const [k, porEsp] of porCelda) {
    const meshes = [];
    let cx = 0, cz = 0, n = 0;
    for (const [especie, lista] of porEsp) {
      const arq = arqs[especie];
      const mOp = new THREE.InstancedMesh(arq.opaca, mats[especie].matOpaca, lista.length);
      const mCa = new THREE.InstancedMesh(arq.cards, mats[especie].matCards, lista.length);
      lista.forEach((p, i) => {
        _q.setFromAxisAngle(_eje, p.giro);
        _s.set(p.esc * (0.94 + hashAA(p.x, p.z) * 0.12), p.esc, p.esc * (0.94 + hashAA(p.z, p.x) * 0.12));
        _v.set(p.x, p.y - 0.12 * p.esc, p.z);
        _m.compose(_v, _q, _s);
        mOp.setMatrixAt(i, _m); mCa.setMatrixAt(i, _m);
        _col.setScalar(p.tinte);
        mOp.setColorAt(i, _col); mCa.setColorAt(i, _col);
        cx += p.x; cz += p.z; n++;
      });
      mOp.instanceMatrix.needsUpdate = true; mCa.instanceMatrix.needsUpdate = true;
      if (mOp.instanceColor) mOp.instanceColor.needsUpdate = true;
      if (mCa.instanceColor) mCa.instanceColor.needsUpdate = true;
      mOp.computeBoundingSphere(); mCa.computeBoundingSphere();
      grupo.add(mOp); grupo.add(mCa);
      meshes.push(mOp, mCa);
      const nt = (arq.opaca.index ? arq.opaca.index.count : arq.opaca.attributes.position.count) / 3
        + arq.cards.attributes.position.count / 3;
      trisDetalle += nt * lista.length;
    }
    celdas.set(k, { cx: cx / Math.max(n, 1), cz: cz / Math.max(n, 1), meshes });
  }

  // ── impostor global: UN InstancedMesh para TODOS los árboles ───────────────
  const texAtlas = texturaAtlasImpostor(5);
  const geoImp = geoCruzImpostor();
  const aVar = new Float32Array(puestos.length * 2);
  const matImp = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uMapa: { value: texAtlas },
        uEntraA: { value: rDetalle - banda },
        uEntraB: { value: rDetalle },
        uCorteLejos: { value: corteLejos },
        uAmbiente: { value: ambiente },
      },
    ]),
    vertexShader: VERT_IMPOSTOR,
    fragmentShader: FRAG_IMPOSTOR,
    side: THREE.DoubleSide,
    fog: true,
  });
  // los uniforms del reloj de viento van POR REFERENCIA (mismo objeto global)
  matImp.uniforms.uTiempoVM = uniformesVientoMundo.uTiempoVM;
  matImp.uniforms.uFuerzaVM = uniformesVientoMundo.uFuerzaVM;

  const mImp = new THREE.InstancedMesh(geoImp, matImp, puestos.length);
  const uW = 1 / ORDEN_IMPOSTOR.length;
  puestos.forEach((p, i) => {
    const arq = arqs[p.especie];
    const col = ORDEN_IMPOSTOR.indexOf(p.especie);
    aVar[i * 2] = col * uW; aVar[i * 2 + 1] = uW;
    _q.setFromAxisAngle(_eje, p.giro);
    const alto = arq.H * 1.12 * p.esc;
    const ancho = arq.radio * 2.15 * p.esc;
    _s.set(ancho, alto, ancho);
    _v.set(p.x, p.y - 0.1, p.z);
    _m.compose(_v, _q, _s);
    mImp.setMatrixAt(i, _m);
    _col.setScalar(p.tinte);
    mImp.setColorAt(i, _col);
  });
  geoImp.setAttribute('aVar', new THREE.InstancedBufferAttribute(aVar, 2));
  mImp.instanceMatrix.needsUpdate = true;
  if (mImp.instanceColor) mImp.instanceColor.needsUpdate = true;
  mImp.frustumCulled = false;     // cubre todo el bosque; el corte vive en el shader
  grupo.add(mImp);

  // ── actualizar: prender/apagar celdas de detalle por distancia (CPU barata) ─
  const margen = tamCelda * 0.75 + 8;
  function actualizar(camara) {
    const cp = camara.position;
    for (const c of celdas.values()) {
      const dx = cp.x - c.cx, dz = cp.z - c.cz;
      const visible = (dx * dx + dz * dz) < (rDetalle + margen) * (rDetalle + margen);
      for (const m of c.meshes) m.visible = visible;
    }
  }

  function stats() {
    const porEspecie = {};
    for (const p of puestos) porEspecie[p.especie] = (porEspecie[p.especie] ?? 0) + 1;
    return {
      arboles: puestos.length, porEspecie, celdas: celdas.size,
      trisDetalleTotal: Math.round(trisDetalle),
      trisImpostor: puestos.length * 18,
      drawCallsDetalleMax: celdas.size ? [...celdas.values()][0].meshes.length : 0,
    };
  }

  function dispose() {
    for (const c of celdas.values()) for (const m of c.meshes) { m.geometry.dispose?.(); }
    for (const e of Object.values(arqs)) { e.opaca.dispose(); e.cards.dispose(); }
    geoImp.dispose(); matImp.dispose();
    for (const m of Object.values(mats)) { m.matCards.dispose(); m.matOpaca.dispose(); }
  }

  return {
    grupo, actualizar, stats, dispose,
    arboles: puestos.map((p) => ({ x: p.x, y: p.y, z: p.z, especie: p.especie, alto: arqs[p.especie].H * p.esc })),
  };
}
