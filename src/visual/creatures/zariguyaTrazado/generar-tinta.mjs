#!/usr/bin/env node
/*
 * generar-tinta — LÁMINA DE TINTA FINA DIBUJADA (reemplaza al auto-trazado).
 *
 * POR QUÉ EXISTE. El pipeline vtracer (generar-calco.mjs) fue RECHAZADO 3
 * veces por el operador: posterizaba la coronilla en un "gorro" sólido,
 * engordaba bigotes/contornos y mataba los ojos. Este módulo es un pase de
 * ARTE: la zarigüeya del set Gemini aprobado (hero + cute + crias + verlupa
 * + escucha) REDIBUJADA a plumilla — grabado a tinta naturalista, el estilo
 * del jaguar aprobado (JaguarTrazado).
 *
 * MÉTODO (sin vtracer):
 *   1. ALINEACIÓN medida, no calcada: la silueta exacta del hero se extrae
 *      del canal alfa (marching squares + RDP, _gate/zariguya-tinta/
 *      silueta-eps1.json) y TODOS los rasgos (ojos, boca, lápiz, brújula,
 *      cola) van en las coordenadas medidas con lupas de grilla sobre el
 *      hero 481×444 — las clip-regiones/pivotes de pielTrazado.js siguen
 *      calzando porque la pose es pixel-alineada al hero.
 *   2. DIBUJO real: aguadas de color planas (identidad Gemini) + pelaje por
 *      campos de flujo (trazos ahusados rellenos, plumilla), contorno FINO
 *      y roto (mechones en los bordes peludos, línea limpia en los lisos),
 *      bigotes de ~0.45px, ojos vivos con brillo.
 *   3. Determinístico (seed fija) → regenerable: node generar-tinta.mjs
 *      escribe ./calcoTrazado.js en el espacio NATIVO 481×444 (ya no 2×:
 *      la línea nace fina, no se adelgaza por escala).
 *
 * PERF: los miles de trazos de pelo van FUSIONADOS en pocos <path> por capa
 * (subpaths M…Z con el mismo fill) — el calco se clona por hueso, así que
 * O(elementos×huesos) se mantiene muy por debajo del techo del jaguar.
 */
/* global process, console */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SIL_JSON = join(AQUI, '../../../../_gate/zariguya-tinta/silueta-eps1.json');

/* ───────────────────────────── util ───────────────────────────── */

// mulberry32 — determinístico
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260825);
const R = (a, b) => a + rng() * (b - a);
const r1 = (v) => Math.round(v * 10) / 10;

/** Trazo de plumilla: ahusado (ancho w en la base → punta), con curvatura k. */
function pluma(x0, y0, ang, L, w, k = 0) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const mx = x0 + ca * L * 0.5 - sa * k, my = y0 + sa * L * 0.5 + ca * k;
  const ex = x0 + ca * L - sa * k * 0.7, ey = y0 + sa * L + ca * k * 0.7;
  const px = -sa * w / 2, py = ca * w / 2;
  return `M${r1(x0 + px)} ${r1(y0 + py)}Q${r1(mx + px * 0.55)} ${r1(my + py * 0.55)} ${r1(ex)} ${r1(ey)}Q${r1(mx - px * 0.55)} ${r1(my - py * 0.55)} ${r1(x0 - px)} ${r1(y0 - py)}Z`;
}

function dentroPoly(pt, poly) {
  const [x, y] = pt; let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) dentro = !dentro;
  }
  return dentro;
}

function bbox(poly) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}

/** Catmull-Rom → path cúbico (cerrado o abierto). */
function suave(pts, cerrado = true) {
  const n = pts.length;
  if (n < 3) return '';
  const P = (i) => pts[((i % n) + n) % n];
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  const fin = cerrado ? n : n - 1;
  for (let i = 0; i < fin; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return cerrado ? d + 'Z' : d;
}

/** Siembra trazos de pelo dentro de un polígono con campo de dirección. */
function pelambre({ poly, n, dir, len, w, k = [-2, 2], excl = null }) {
  const [x0, y0, x1, y1] = bbox(poly);
  const dd = [];
  let puestos = 0, intentos = 0;
  while (puestos < n && intentos < n * 30) {
    intentos++;
    const x = R(x0, x1), y = R(y0, y1);
    if (!dentroPoly([x, y], poly)) continue;
    if (excl && excl([x, y])) continue;
    const a = dir(x, y) + R(-0.13, 0.13);
    dd.push(pluma(x, y, a, R(len[0], len[1]), R(w[0], w[1]), R(k[0], k[1])));
    puestos++;
  }
  return dd.join('');
}

const lerp = (a, b, t) => a + (b - a) * t;

/** Dirección tangente a una espina (polyline): la del segmento más cercano. */
function tangenteDe(espina) {
  return (x, y) => {
    let mejor = 0, dm = 1e18;
    for (let i = 0; i < espina.length - 1; i++) {
      const [ax, ay] = espina[i], [bx, by] = espina[i + 1];
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const d = (mx - x) ** 2 + (my - y) ** 2;
      if (d < dm) { dm = d; mejor = Math.atan2(by - ay, bx - ax); }
    }
    return mejor;
  };
}

/* ───────────────────────────── paleta ─────────────────────────────
   Identidad Gemini (muestreada del set aprobado). Tinta sepia, no negro puro. */
const C = {
  tinta: '#2b2116', tintaSuave: '#463625', tintaClara: '#8a7355',
  crema: '#efe2c3', cremaPanza: '#e6d6b2', cremaSombra: '#cdb995',
  oscuro: '#4a3a29', medio: '#75634b', claroFur: '#a89272',
  rosa: '#cfa48e', rosaSombra: '#a97f6c', rosaClaro: '#e3c3af',
  nariz: '#d3a093', narizSombra: '#8f5f52',
  mano: '#dcc0a9', manoSombra: '#b3937b',
  laton: '#a48254', latonOscuro: '#6a5440', esferaBr: '#efe5cb',
  madera: '#c8995c', maderaSombra: '#a37a45', cono: '#e2c497', grafito: '#2f261b',
  lengua: '#c98d84', fauces: '#43241c', diente: '#f2ead2',
  ojo: '#241a10', brillo: '#f7f1e2',
};

/* ─────────────────────── silueta medida (alfa del hero) ─────────────────── */
const SIL = JSON.parse(readFileSync(SIL_JSON, 'utf8'));

/** Quita picos-bigote (zigzags finos) de la silueta para contornear. */
function despicar(pts) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const v1 = [b[0] - a[0], b[1] - a[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    if (l1 < 0.5 || l2 < 0.5) continue;
    const cosT = (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2);
    if (cosT < -0.55) continue; // switchback agudo = pico de bigote
    out.push(b);
  }
  return out;
}

/* zonas LISAS de la silueta (línea limpia): cola pelada, manos, lápiz,
   brújula, nariz, orejas, dedos de los pies. El resto: borde de PELO. */
function esLiso([x, y]) {
  if (x >= 376 && y >= 210) return true;                            // cola pelada
  if (x >= 26 && x <= 122 && y >= 136 && y <= 212) return true;    // puño
  if (x >= 94 && x <= 132 && y >= 118 && y <= 142) return true;    // culata del lápiz
  if (x <= 44 && y >= 150 && y <= 208) return true;                // punta del lápiz
  if (x >= 84 && x <= 192 && y >= 228 && y <= 306) return true;    // brújula + mano
  if (x >= 248 && x <= 284 && y >= 92 && y <= 138) return true;    // nariz
  if (x >= 92 && x <= 160 && y <= 76) return true;                 // oreja izq
  if (x >= 212 && x <= 268 && y <= 58) return true;                // oreja der
  if (x >= 142 && x <= 216 && y >= 368) return true;               // pie lejano
  if (x >= 254 && x <= 356 && y >= 388) return true;               // pie cercano
  return false;
}

/* ¿flujo del pelo en el borde? apunta "hacia atrás/abajo" del cuerpo */
function flujoBorde(x, y) {
  if (y < 100) return Math.atan2(y - 130, x - 200) + 0.5;      // cabeza: radial hacia atrás
  if (x > 300) return Math.atan2(y - 40, x - 240) * 0.5 + 0.9; // lomo/grupa: abajo-atrás
  return 1.9 + (x - 180) / 400;                                 // pecho/panza: abajo
}

/* ───────────────────────── capas de arte ───────────────────────── */
const svg = [];
const defs = [];

/* silueta → clip + path del contorno.
   El CLIP usa el polígono CRUDO del alfa: despicar/suavizar puede auto-
   intersecar el path en las raíces de los bigotes y abrir huecos (la nariz
   quedó transparente así). El contorno dibujado sí usa la versión limpia. */
const silLimpia = despicar(despicar(SIL));
const SIL_POLY = `M${SIL.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
/* parche del HOCICO: los picos de bigote enraízan en el hocico y el polígono
   del alfa se auto-interseca ahí → winding 0 = hueco transparente justo en
   la nariz. El clip es la UNIÓN silueta + parche dibujado (bump medido). */
const PARCHE_HOCICO = `M240 86L262 84L278 92L287 104L288 120L281 136L268 146L250 150L238 138L233 112L235 95Z`;
defs.push(`<clipPath id="zt2sil"><path d="${SIL_POLY}"/><path d="${PARCHE_HOCICO}"/></clipPath>`);


/* ══ 1. AGUADAS (planas, identidad) — todo clipeado a la silueta ══ */
const W = [];
W.push(`<path d="${SIL_POLY}" fill="${C.crema}"/>`);
W.push(`<path d="${PARCHE_HOCICO}" fill="${C.crema}"/>`);

// MANTO: aguada media sobre todo el torso (el hatching pone la oscuridad)
W.push(`<path d="${suave([[152, 150], [200, 132], [248, 108], [290, 98], [322, 128], [346, 174], [360, 224], [370, 274], [376, 314], [368, 348], [350, 366], [320, 380], [288, 384], [254, 376], [224, 360], [200, 334], [186, 300], [176, 256], [168, 204], [156, 170]])}" fill="#5d4b38"/>`);

// banda dorsal + grupa (más honda)
W.push(`<path d="${suave([[246, 94], [280, 92], [308, 116], [334, 160], [352, 208], [364, 256], [372, 300], [374, 332], [364, 356], [344, 364], [326, 352], [318, 322], [310, 282], [298, 236], [284, 190], [268, 148], [252, 118]])}" fill="${C.oscuro}"/>`);
W.push(`<path d="${suave([[320, 302], [350, 296], [370, 310], [384, 332], [392, 352], [384, 362], [360, 366], [336, 362], [320, 344], [314, 320]])}" fill="${C.tintaSuave}"/>`);

// pierna cercana + canilla
W.push(`<path d="${suave([[252, 300], [292, 292], [326, 300], [340, 324], [340, 360], [330, 392], [336, 414], [330, 434], [300, 428], [286, 400], [270, 380], [254, 350], [246, 322]])}" fill="${C.oscuro}"/>`);
// pierna lejana
W.push(`<path d="${suave([[168, 330], [206, 326], [230, 344], [232, 372], [218, 392], [196, 398], [176, 386], [164, 360]])}" fill="${C.oscuro}"/>`);

// pecho/cuello crema (ruff) — ANTES de los brazos (los brazos van encima)
W.push(`<path d="${suave([[164, 158], [186, 148], [208, 150], [224, 166], [232, 196], [234, 230], [230, 262], [220, 282], [204, 288], [190, 278], [180, 252], [172, 218], [166, 186]])}" fill="${C.crema}"/>`);
// panza crema
W.push(`<path d="${suave([[228, 252], [262, 242], [294, 250], [314, 274], [322, 306], [316, 338], [296, 360], [268, 366], [244, 356], [226, 330], [218, 296], [220, 268]])}" fill="${C.cremaPanza}"/>`);
// brazo alzado: eje real (215,210)→(130,175)
W.push(`<path d="${suave([[124, 160], [148, 152], [178, 162], [204, 182], [222, 204], [226, 224], [212, 234], [188, 228], [162, 212], [138, 192], [122, 176]])}" fill="${C.oscuro}"/>`);
// brazo de la brújula: eje (200,232)→(140,259)
W.push(`<path d="${suave([[186, 214], [216, 210], [240, 214], [252, 228], [246, 248], [224, 260], [196, 268], [168, 268], [151, 257], [153, 239], [167, 225]])}" fill="${C.oscuro}"/>`);
// puente del antebrazo al puño (bajo la muñeca)
W.push(`<path d="${suave([[94, 180], [118, 174], [140, 182], [156, 198], [162, 218], [148, 232], [122, 228], [100, 208], [88, 192]])}" fill="${C.oscuro}"/>`);
// cuña oscura entre las piernas (sombra interior)
W.push(`<path d="${suave([[204, 362], [234, 356], [254, 366], [256, 392], [244, 412], [222, 416], [206, 402], [198, 382]])}" fill="${C.oscuro}"/>`);

// cara crema
W.push(`<path d="${suave([[128, 82], [150, 62], [176, 52], [206, 48], [236, 46], [264, 58], [282, 82], [287, 106], [272, 130], [244, 138], [212, 138], [180, 130], [152, 116], [134, 100]])}" fill="${C.crema}"/>`);

// nuca oscura (se funde con el manto, sin blob aislado)
W.push(`<path d="${suave([[254, 46], [272, 40], [288, 54], [302, 84], [312, 118], [306, 146], [284, 154], [264, 142], [250, 108], [250, 72]])}" fill="${C.medio}"/>`);

// coronilla: aguada crema-media CLARA entre las orejas
W.push(`<path d="${suave([[146, 40], [152, 20], [168, 12], [196, 8], [222, 10], [236, 18], [240, 34], [232, 52], [204, 62], [176, 60], [154, 52]])}" fill="#e4d3ae"/>`);

// parches oculares (almendra)
W.push(`<path d="${suave([[142, 74], [158, 60], [178, 58], [194, 68], [198, 82], [190, 96], [170, 102], [150, 96], [140, 86]])}" fill="${C.tintaSuave}"/>`);
W.push(`<path d="${suave([[216, 60], [236, 50], [256, 52], [268, 64], [268, 80], [256, 92], [236, 94], [220, 84], [214, 72]])}" fill="${C.tintaSuave}"/>`);

// orejas (posición calibrada)
W.push(`<path d="${suave([[117, 67], [107, 57], [99, 46], [96, 34], [97, 22], [103, 13], [113, 8], [124, 8], [134, 13], [142, 21], [145, 32], [144, 45], [138, 57], [128, 65]])}" fill="#d9bd93"/>`);
W.push(`<path d="${suave([[116, 61], [108, 53], [102, 44], [100, 34], [101, 24], [106, 17], [114, 12], [123, 12], [131, 17], [138, 24], [141, 33], [139, 45], [133, 55], [125, 60]])}" fill="#c09a70"/>`);
W.push(`<path d="${suave([[251, 54], [243, 50], [236, 42], [233, 32], [234, 20], [239, 10], [248, 4], [258, 2], [266, 6], [271, 13], [272, 24], [269, 36], [263, 46], [257, 52]])}" fill="#d9bd93"/>`);
W.push(`<path d="${suave([[250, 49], [243, 44], [238, 36], [236, 27], [238, 17], [244, 9], [252, 6], [260, 7], [266, 12], [268, 21], [266, 31], [261, 41], [255, 47]])}" fill="#c09a70"/>`);

// manos (peladas, rosadas) — puño calibrado (29-118, 144-205)
W.push(`<path d="${suave([[34, 152], [48, 142], [66, 137], [86, 138], [102, 145], [112, 156], [115, 170], [110, 185], [98, 196], [80, 202], [60, 202], [44, 195], [33, 182], [29, 166]])}" fill="${C.mano}"/>`);
// mano de la brújula
W.push(`<path d="${suave([[134, 243], [152, 237], [168, 241], [179, 251], [182, 267], [175, 283], [160, 292], [146, 290], [135, 279], [130, 262]])}" fill="${C.mano}"/>`);

// pies
W.push(`<path d="${suave([[148, 374], [182, 370], [206, 378], [212, 392], [200, 406], [170, 408], [150, 400], [144, 386]])}" fill="#cbb493"/>`);
W.push(`<path d="${suave([[264, 394], [300, 390], [334, 396], [350, 410], [344, 430], [318, 442], [288, 440], [268, 426], [258, 408]])}" fill="#cbb493"/>`);

// nariz (termina en y≈134)
W.push(`<path d="${suave([[247, 108], [255, 99], [266, 96], [277, 100], [285, 109], [285, 120], [278, 130], [266, 135], [255, 131], [248, 120]])}" fill="${C.nariz}"/>`);

svg.push(`<g clip-path="url(#zt2sil)">${W.join('')}</g>`);

/* ══ 2. PELAJE — campos de flujo, trazos ahusados, hatching denso ══ */
const F = { oscuro: [], medio: [], claro: [], crema: [] };

// — coronilla: hebras hacia atrás, CLARA arriba (anti-gorro) —
const coronilla = [[146, 42], [152, 20], [168, 12], [196, 8], [224, 10], [238, 18], [242, 36], [232, 54], [204, 64], [176, 62], [154, 54]];
const OREJA_I_POLY = [[117, 67], [107, 57], [99, 46], [96, 34], [97, 22], [103, 13], [113, 8], [124, 8], [134, 13], [142, 21], [145, 32], [144, 45], [138, 57], [128, 65]];
const OREJA_D_POLY = [[251, 54], [243, 50], [236, 42], [233, 32], [234, 20], [239, 10], [248, 4], [258, 2], [266, 6], [271, 13], [272, 24], [269, 36], [263, 46], [257, 52]];
const enOrejas = (pt) => dentroPoly(pt, OREJA_I_POLY) || dentroPoly(pt, OREJA_D_POLY);
F.oscuro.push(pelambre({ poly: coronilla, n: 80, len: [6, 13], w: [0.45, 0.7], k: [-1.2, 1.2], excl: enOrejas, dir: (x, y) => Math.atan2(y - 84, x - 197) + (x < 197 ? -0.22 : 0.22) }));
F.medio.push(pelambre({ poly: coronilla, n: 90, len: [4.5, 9], w: [0.4, 0.6], k: [-1, 1], excl: enOrejas, dir: (x, y) => Math.atan2(y - 84, x - 197) + (x < 197 ? -0.28 : 0.28) }));

// — franja frontal: hebras hacia el puente, se disuelve y≈60-80 —
F.oscuro.push(pelambre({ poly: [[193, 8], [213, 8], [217, 38], [211, 58], [203, 70], [195, 60], [189, 36]], n: 130, len: [4, 8], w: [0.4, 0.62], k: [-0.7, 0.7], dir: () => 1.42 }));
F.medio.push(pelambre({ poly: [[188, 10], [219, 10], [222, 40], [215, 62], [203, 76], [193, 64], [184, 38]], n: 70, len: [3, 6], w: [0.35, 0.5], k: [-0.6, 0.6], dir: () => 1.45 }));
F.medio.push(pelambre({ poly: [[194, 58], [210, 58], [214, 74], [208, 88], [200, 92], [194, 84], [190, 70]], n: 26, len: [3, 6], w: [0.35, 0.5], k: [-0.6, 0.6], dir: () => 1.45 }));

// — parches: textura radial fina —
F.oscuro.push(pelambre({ poly: [[142, 74], [158, 60], [178, 58], [194, 68], [198, 82], [190, 96], [170, 102], [150, 96], [140, 86]], n: 60, len: [3, 6], w: [0.38, 0.55], k: [-0.7, 0.7], dir: (x, y) => Math.atan2(y - 79, x - 169) }));
F.oscuro.push(pelambre({ poly: [[216, 60], [236, 50], [256, 52], [268, 64], [268, 80], [256, 92], [236, 94], [220, 84], [214, 72]], n: 60, len: [3, 6], w: [0.38, 0.55], k: [-0.7, 0.7], dir: (x, y) => Math.atan2(y - 71, x - 241) }));

// — mejillas/hocico: hacia la nariz, suave —
F.claro.push(pelambre({ poly: [[134, 96], [160, 84], [196, 92], [224, 102], [236, 112], [232, 126], [208, 132], [176, 126], [148, 112]], n: 110, len: [3, 5.5], w: [0.32, 0.5], k: [-0.6, 0.6], excl: (pt) => pt[0] > 242, dir: (x, y) => Math.atan2(116 - y, 252 - x) }));

// — canal de bigotes/mejilla: relleno suave para no dejar vacío —
F.claro.push(pelambre({ poly: [[142, 122], [168, 118], [192, 128], [204, 148], [200, 170], [184, 182], [162, 178], [146, 158], [138, 138]], n: 95, len: [3.5, 7], w: [0.3, 0.45], k: [-0.6, 0.6], dir: () => 1.95 }));
// — fusión pecho↔manto: trazos cruzando el borde —
F.oscuro.push(pelambre({ poly: [[222, 168], [238, 162], [246, 196], [250, 236], [246, 272], [236, 262], [228, 226], [222, 194]], n: 90, len: [5, 10], w: [0.4, 0.6], k: [-1, 1], dir: () => 1.35 }));
F.crema.push(pelambre({ poly: [[226, 176], [240, 170], [246, 204], [248, 240], [242, 264], [232, 250], [226, 216]], n: 40, len: [4, 8], w: [0.3, 0.45], k: [-0.8, 0.8], dir: () => 1.35 }));

// — quijada/mejilla colgante (borde izquierdo de la cara) —
F.oscuro.push(pelambre({ poly: [[126, 96], [142, 92], [152, 108], [158, 130], [152, 152], [140, 160], [128, 148], [122, 124], [122, 106]], n: 80, len: [5, 11], w: [0.42, 0.65], k: [-1, 1], dir: () => 1.85 }));

// — espina dorsal: nuca → lomo → grupa (hatching DENSO y paralelo) —
const espina = [[262, 96], [300, 122], [330, 165], [350, 215], [362, 262], [370, 305], [368, 338]];
const tEspina = tangenteDe(espina);
F.oscuro.push(pelambre({ poly: [[250, 90], [286, 88], [312, 114], [336, 158], [354, 205], [366, 252], [376, 298], [376, 334], [364, 356], [344, 362], [326, 346], [318, 310], [308, 262], [294, 210], [276, 160], [258, 122]], n: 760, len: [9, 18], w: [0.45, 0.75], k: [-1.8, 1.8], excl: ([x, y]) => x > 242 && x < 292 && y > 92 && y < 142, dir: (x, y) => tEspina(x, y) + 0.16 }));
F.claro.push(pelambre({ poly: [[264, 100], [292, 100], [318, 130], [342, 175], [358, 222], [368, 268], [372, 305], [364, 330], [350, 336], [338, 316], [328, 274], [314, 224], [296, 172], [276, 130]], n: 130, len: [7, 13], w: [0.35, 0.55], k: [-1.2, 1.2], dir: (x, y) => tEspina(x, y) + 0.14 }));

// — flanco: transición al vientre —
F.medio.push(pelambre({ poly: [[204, 158], [252, 136], [296, 146], [324, 192], [342, 248], [350, 298], [342, 340], [318, 358], [286, 366], [252, 360], [224, 342], [202, 304], [192, 256], [196, 206]], n: 760, len: [7, 14], w: [0.4, 0.62], k: [-1.5, 1.5], dir: (x, y) => tEspina(x, y) * 0.55 + 0.75, excl: (p) => dentroPoly(p, [[232, 254], [264, 246], [294, 254], [312, 276], [318, 304], [312, 334], [292, 356], [266, 362], [246, 352], [228, 328], [222, 298], [224, 270]]) }));

// — panza: flecos cortos, ralos —
F.medio.push(pelambre({ poly: [[232, 256], [264, 248], [292, 256], [310, 278], [316, 304], [310, 334], [290, 354], [266, 360], [248, 350], [230, 326], [224, 298], [226, 270]], n: 170, len: [2.5, 5], w: [0.32, 0.48], k: [-0.5, 0.5], dir: () => 1.62 }));

// — pecho: ruff crema con trazos medios —
F.medio.push(pelambre({ poly: [[168, 160], [190, 150], [212, 154], [226, 172], [232, 202], [232, 236], [226, 264], [216, 282], [202, 286], [190, 274], [180, 246], [172, 212], [166, 184]], n: 380, len: [6, 13], w: [0.36, 0.55], k: [-1.2, 1.2], dir: (x) => 1.55 + (x - 200) / 340 }));
F.oscuro.push(pelambre({ poly: [[162, 156], [180, 148], [188, 170], [184, 204], [176, 232], [168, 220], [162, 190]], n: 50, len: [5, 9], w: [0.38, 0.55], k: [-0.8, 0.8], dir: () => 1.75 }));

// — brazo alzado: pelo hombro→muñeca (eje calibrado) —
const angBrazo = Math.atan2(175 - 210, 130 - 215);
F.oscuro.push(pelambre({ poly: [[122, 160], [148, 150], [178, 160], [204, 180], [224, 202], [228, 224], [212, 236], [186, 230], [158, 212], [134, 190], [118, 174]], n: 190, len: [6, 12], w: [0.42, 0.65], k: [-1.2, 1.2], dir: () => angBrazo }));
F.claro.push(pelambre({ poly: [[132, 164], [156, 156], [182, 166], [204, 184], [216, 204], [210, 220], [188, 214], [162, 198], [140, 180]], n: 55, len: [4.5, 8], w: [0.32, 0.48], k: [-0.8, 0.8], dir: () => angBrazo }));

// — brazo de la brújula —
F.oscuro.push(pelambre({ poly: [[188, 218], [214, 216], [230, 228], [230, 246], [214, 258], [190, 266], [168, 266], [154, 256], [156, 240], [170, 228]], n: 120, len: [5, 10], w: [0.4, 0.6], k: [-1, 1], dir: () => Math.atan2(259 - 232, 140 - 200) }));

// — muslo cercano: remolino de cadera —
F.oscuro.push(pelambre({ poly: [[254, 302], [292, 294], [324, 302], [338, 326], [338, 358], [326, 386], [306, 396], [282, 390], [262, 368], [250, 336]], n: 300, len: [7, 14], w: [0.45, 0.68], k: [-2, 2], dir: (x, y) => Math.atan2(y - 330, x - 296) + 1.45 }));
F.claro.push(pelambre({ poly: [[268, 310], [298, 302], [322, 312], [330, 336], [324, 364], [306, 382], [284, 378], [268, 356], [260, 330]], n: 100, len: [5, 10], w: [0.32, 0.5], k: [-1, 1], dir: (x, y) => Math.atan2(y - 330, x - 296) + 1.5 }));

// — canilla cercana + tobillo —
F.oscuro.push(pelambre({ poly: [[296, 388], [330, 384], [342, 398], [340, 420], [322, 430], [300, 424], [290, 406]], n: 90, len: [4.5, 9], w: [0.4, 0.6], k: [-0.8, 0.8], dir: () => 1.62 }));

// — pierna lejana —
F.oscuro.push(pelambre({ poly: [[170, 332], [206, 328], [228, 346], [230, 372], [216, 390], [194, 394], [174, 382], [164, 358]], n: 150, len: [5, 11], w: [0.4, 0.65], k: [-1, 1], dir: () => 1.72 }));

// — fusión panza↔manto (borde derecho de la panza) —
F.oscuro.push(pelambre({ poly: [[306, 262], [322, 256], [334, 296], [336, 334], [326, 356], [314, 344], [308, 310], [304, 284]], n: 70, len: [5, 10], w: [0.4, 0.6], k: [-1, 1], dir: (x, y) => tEspina(x, y) + 0.3 }));

// — tapa oscura de la base de la cola (el pelaje muerde la cola pelada) —
F.oscuro.push(pelambre({ poly: [[378, 330], [404, 328], [412, 344], [406, 360], [384, 360], [372, 344]], n: 55, len: [4, 7.5], w: [0.42, 0.6], k: [-0.7, 0.7], dir: () => 0.4 }));

// — mechones de la cuña entre piernas sobre la panza baja —
F.oscuro.push(pelambre({ poly: [[206, 356], [240, 350], [256, 360], [252, 376], [228, 378], [208, 370]], n: 45, len: [4, 8], w: [0.4, 0.58], k: [-0.8, 0.8], dir: () => -1.7 }));

// — grupa/base de cola —
F.oscuro.push(pelambre({ poly: [[322, 304], [352, 298], [372, 312], [388, 334], [392, 352], [380, 362], [356, 364], [334, 356], [320, 336], [314, 318]], n: 180, len: [7, 14], w: [0.45, 0.72], k: [-1.5, 1.5], dir: () => 0.55 }));
F.oscuro.push(pelambre({ poly: [[364, 332], [400, 326], [410, 342], [404, 360], [376, 362], [360, 350]], n: 70, len: [4.5, 8.5], w: [0.4, 0.62], k: [-0.8, 0.8], dir: () => 0.35 }));

// — brillos crema (luz de grabado en lomo y muslo) —
F.crema.push(pelambre({ poly: [[286, 118], [306, 116], [322, 144], [336, 182], [330, 194], [312, 166], [296, 138]], n: 45, len: [5, 10], w: [0.32, 0.48], k: [-0.8, 0.8], dir: (x, y) => tEspina(x, y) + 0.18 }));
F.crema.push(pelambre({ poly: [[300, 310], [320, 306], [330, 330], [326, 354], [312, 348], [302, 330]], n: 28, len: [4.5, 8], w: [0.28, 0.42], k: [-0.7, 0.7], dir: (x, y) => Math.atan2(y - 330, x - 296) + 1.5 }));

svg.push(`<g clip-path="url(#zt2sil)">` +
  `<path fill="${C.tintaClara}" d="${F.claro.join('')}"/>` +
  `<path fill="${C.tintaSuave}" opacity="0.88" d="${F.medio.join('')}"/>` +
  `<path fill="${C.tinta}" opacity="0.92" d="${F.oscuro.join('')}"/>` +
  `<path fill="${C.crema}" opacity="0.8" d="${F.crema.join('')}"/>` +
  `</g>`);

/* ══ 3. CONTORNO — fino y roto: mechones en bordes peludos, línea en lisos ══ */
const tufts = [];
const lineas = [];
{
  const pts = silLimpia;
  const n = pts.length;
  let run = [];
  let runLiso = esLiso(pts[0]);
  const cerrarRun = () => {
    if (run.length < 2) { run = []; return; }
    if (runLiso) {
      lineas.push(`<path d="${suave(run, false)}" fill="none" stroke="${C.tinta}" stroke-width="0.75" stroke-linecap="round" opacity="0.92"/>`);
    } else {
      lineas.push(`<path d="${suave(run, false)}" fill="none" stroke="${C.tinta}" stroke-width="0.6" stroke-linecap="round" opacity="0.78" stroke-dasharray="4 1.6"/>`);
      for (let i = 0; i < run.length - 1; i++) {
        const [ax, ay] = run[i], [bx, by] = run[i + 1];
        const segLen = Math.hypot(bx - ax, by - ay);
        const pasos = Math.max(1, Math.round(segLen / 3.0));
        for (let s = 0; s < pasos; s++) {
          const t = (s + R(0.2, 0.8)) / pasos;
          const x = lerp(ax, bx, t), y = lerp(ay, by, t);
          const flujo = flujoBorde(x, y);
          tufts.push(pluma(x, y, flujo + R(-0.3, 0.3), R(2.5, 6), R(0.5, 0.8), R(-1, 1)));
        }
      }
    }
    run = [];
  };
  const enHueco = ([x, y]) => (x >= 232 && x <= 302 && y >= 78 && y <= 158) ||
    (x >= 94 && x <= 148 && y >= 4 && y <= 62) || (x >= 230 && x <= 275 && y <= 56) ||
    (x >= 376 && y >= 210); // cola: sus cadenas dibujan el contorno
  for (let i = 0; i <= n; i++) {
    const p = pts[i % n];
    if (enHueco(p)) { cerrarRun(); runLiso = esLiso(p); continue; }
    const liso = esLiso(p);
    if (liso !== runLiso) { run.push(p); cerrarRun(); runLiso = liso; }
    run.push(p);
  }
  cerrarRun();
}
svg.push(lineas.join(''));
svg.push(`<path fill="${C.tinta}" opacity="0.9" d="${tufts.join('')}"/>`);

/* ══ 4. CARA ══ */
const cara = [];

// — ojos: hondos, con brillo; poco blanco (nada de googly) —
// izquierdo (174,78) r13
cara.push(`<path d="${suave([[158, 78], [165, 68], [176, 65], [187, 69], [192, 78], [187, 88], [175, 92], [164, 88]])}" fill="#5a4732"/>`);
cara.push(`<circle cx="175" cy="78.5" r="11.6" fill="${C.ojo}"/>`);
cara.push(`<path d="M165 72 A12.5 12.5 0 0 1 174 67.5 A11.5 11.5 0 0 0 167 76 Z" fill="${C.brillo}" opacity="0.92"/>`);
cara.push(`<circle cx="169.5" cy="73" r="2.6" fill="${C.brillo}"/>`);
cara.push(`<circle cx="180" cy="85" r="1.1" fill="${C.brillo}" opacity="0.75"/>`);
cara.push(`<path d="${suave([[158, 78], [165, 68], [176, 65], [187, 69], [192, 78], [187, 88], [175, 92], [164, 88]])}" fill="none" stroke="${C.tinta}" stroke-width="0.8"/>`);
cara.push(`<path d="M158 74 Q169 63 191 68" fill="none" stroke="${C.tinta}" stroke-width="1.0" stroke-linecap="round"/>`);
cara.push(`<path d="M161 87 Q173 94 189 88" fill="none" stroke="#caa77f" stroke-width="0.8" opacity="0.8"/>`);
// derecho (241,70) r14
cara.push(`<circle cx="241" cy="70" r="13.6" fill="${C.ojo}"/>`);
cara.push(`<circle cx="241" cy="70" r="13.6" fill="none" stroke="${C.tinta}" stroke-width="0.8"/>`);
cara.push(`<path d="M231 65 A13 13 0 0 1 239 58 A12 12 0 0 0 233 68 Z" fill="${C.brillo}" opacity="0.92"/>`);
cara.push(`<circle cx="235" cy="63.5" r="3" fill="${C.brillo}"/>`);
cara.push(`<circle cx="247" cy="77" r="1.3" fill="${C.brillo}" opacity="0.75"/>`);
cara.push(`<path d="M227 59 Q240 50 256 60" fill="none" stroke="${C.tinta}" stroke-width="1.0" stroke-linecap="round"/>`);
cara.push(`<path d="M229 79 Q241 85 254 79" fill="none" stroke="#caa77f" stroke-width="0.8" opacity="0.8"/>`);

// — cejas: trazos finos —
cara.push(`<path d="M154 56 Q164 50 174 50 M160 50 Q168 45 177 46 M222 46 Q232 40 242 42 M228 40 Q237 36 246 38" fill="none" stroke="${C.tintaSuave}" stroke-width="0.55" stroke-linecap="round"/>`);

// — nariz —
cara.push(`<path d="${suave([[246, 108], [254, 98], [266, 95], [278, 100], [286, 110], [286, 121], [279, 131], [266, 136], [254, 132], [247, 121]])}" fill="none" stroke="${C.tinta}" stroke-width="0.85"/>`);
cara.push(`<path d="M256 118 q-3.5 2.5 -1.5 6 M276 121 q-3 2.5 -1 5.5" fill="none" stroke="${C.narizSombra}" stroke-width="1.4" stroke-linecap="round"/>`);
cara.push(`<path d="M260 102 q7 -2.5 12 0.5" fill="none" stroke="#e9c8b8" stroke-width="2" stroke-linecap="round" opacity="0.85"/>`);
cara.push(`<path d="M250 127 q6 6 12 7" fill="none" stroke="${C.narizSombra}" stroke-width="0.6" opacity="0.6"/>`);
{
  const hatN = [];
  for (let i = 0; i < 14; i++) hatN.push(pluma(R(250, 266), R(112, 131), -0.65, R(2.5, 5), 0.36, R(-0.4, 0.4)));
  cara.push(`<path d="${hatN.join('')}" fill="${C.rosaSombra}" opacity="0.6"/>`);
}

// — boca: sonrisa abierta ANGOSTA (banda diagonal y106-157) —
// labio superior
cara.push(`<path d="M146 106 Q151 100 157 103 Q186 117 214 128 Q233 136 246 137" fill="none" stroke="${C.tinta}" stroke-width="1.0" stroke-linecap="round"/>`);
// interior (banda angosta entre labio y mandíbula)
cara.push(`<path d="${suave([[154, 110], [178, 122], [206, 133], [230, 142], [246, 149], [243, 154], [222, 153], [196, 146], [173, 134], [158, 121]])}" fill="${C.fauces}"/>`);
// lengua (pequeña, al fondo derecho)
cara.push(`<path d="${suave([[206, 144], [222, 147], [236, 151], [238, 155], [226, 155], [212, 151], [203, 148]])}" fill="${C.lengua}"/>`);
// dientes superiores: fila pequeña colgando del labio
{
  const dts = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const x = lerp(161, 229, t);
    const y = lerp(110, 136, t) + 1;
    const h = 6.6 + (i % 2) * 1.4, w2 = 3.3;
    dts.push(`M${r1(x - w2)} ${r1(y)} Q${r1(x - w2 * 0.7)} ${r1(y + h * 0.7)} ${r1(x)} ${r1(y + h)} Q${r1(x + w2 * 0.7)} ${r1(y + h * 0.7)} ${r1(x + w2)} ${r1(y + 1)} Z`);
  }
  cara.push(`<path d="${dts.join('')}" fill="${C.diente}" stroke="${C.tinta}" stroke-width="0.4"/>`);
}
// mandíbula inferior + dientes de abajo + colmillo inferior (231,137-152)
cara.push(`<path d="M147 108 Q162 126 184 139 Q206 150 226 155 Q240 158 249 155 Q253 152 251 147" fill="none" stroke="${C.tinta}" stroke-width="0.95" stroke-linecap="round"/>`);
{
  const dts = [];
  const bx3 = [178, 194, 210], by3 = [139, 146, 151];
  for (let i = 0; i < 3; i++) {
    const x = bx3[i], y = by3[i], h = 5.6, w2 = 2.9;
    dts.push(`M${x - w2} ${y + 1} Q${x - w2 * 0.7} ${y - h * 0.7} ${x} ${y - h} Q${x + w2 * 0.7} ${y - h * 0.7} ${x + w2} ${y} Z`);
  }
  // colmillo inferior: más grande, apunta arriba
  dts.push(`M227 152 Q228.5 144 232 140 Q235.5 145 235 152 Q231 154.5 227 152 Z`);
  cara.push(`<path d="${dts.join('')}" fill="${C.diente}" stroke="${C.tinta}" stroke-width="0.45"/>`);
}
// pliegue del mentón
cara.push(`<path d="M172 140 Q194 154 220 160" fill="none" stroke="${C.cremaSombra}" stroke-width="1.2" opacity="0.7"/>`);

// — mentón/quijada: pelo corto bajo la boca —
F.claro.push(pelambre({ poly: [[150, 128], [172, 140], [198, 154], [224, 164], [244, 168], [240, 182], [214, 180], [186, 170], [162, 154], [146, 138]], n: 60, len: [3, 6], w: [0.32, 0.48], k: [-0.6, 0.6], dir: () => 1.75 }));

// — puntos de bigote —
{
  const dots = [[214, 104], [222, 110], [230, 116], [218, 118], [226, 124], [210, 112], [234, 124], [238, 116], [224, 102], [232, 110]];
  cara.push(`<path d="${dots.map(([x, y]) => `M${x} ${y} a0.75 0.75 0 1 0 0.01 0`).join('')}" fill="${C.tintaSuave}"/>`);
}

// — orejas: doble borde + hatch radial + pliegue de base —
cara.push(`<path d="${suave([[117, 67], [107, 57], [99, 46], [96, 34], [97, 22], [103, 13], [113, 8], [124, 8], [134, 13], [142, 21], [145, 32], [144, 45], [138, 57], [128, 65]])}" fill="none" stroke="${C.tinta}" stroke-width="0.9"/>`);
cara.push(`<path d="${suave([[116, 61], [108, 53], [102, 44], [100, 34], [101, 24], [106, 17], [114, 12], [123, 12], [131, 17], [138, 24], [141, 33], [139, 45], [133, 55], [125, 60]])}" fill="none" stroke="${C.tinta}" stroke-width="0.5" opacity="0.8"/>`);
{
  const hat = [];
  for (let i = 0; i < 14; i++) {
    const a = -2.6 + i * 0.2;
    const bx = 119 + Math.cos(a) * 5, by = 50 + Math.sin(a) * 5;
    hat.push(pluma(bx, by, a, 8 + (i % 3) * 3.5, 0.46, R(-0.4, 0.4)));
  }
  cara.push(`<path d="${hat.join('')}" fill="${C.tintaSuave}" opacity="0.85"/>`);
  cara.push(`<path d="${pluma(120, 62, 2.3, 9, 1.8, 1)}${pluma(128, 62, 2.1, 8, 1.5, 1)}" fill="${C.tintaSuave}" opacity="0.7"/>`);
}
cara.push(`<path d="${suave([[251, 54], [243, 50], [236, 42], [233, 32], [234, 20], [239, 10], [248, 4], [258, 2], [266, 6], [271, 13], [272, 24], [269, 36], [263, 46], [257, 52]])}" fill="none" stroke="${C.tinta}" stroke-width="0.9"/>`);
cara.push(`<path d="${suave([[250, 49], [243, 44], [238, 36], [236, 27], [238, 17], [244, 9], [252, 6], [260, 7], [266, 12], [268, 21], [266, 31], [261, 41], [255, 47]])}" fill="none" stroke="${C.tinta}" stroke-width="0.45" opacity="0.8"/>`);
cara.push(`<path d="M237 50 q9 5 20 3" fill="none" stroke="${C.tintaSuave}" stroke-width="1.0" opacity="0.7" stroke-linecap="round"/>`);
{
  const hat = [];
  for (let i = 0; i < 10; i++) {
    const a = -2.7 + i * 0.24;
    hat.push(pluma(251 + Math.cos(a) * 4, 28 + Math.sin(a) * 4, a, 7 + (i % 3) * 2.5, 0.42, R(-0.4, 0.4)));
  }
  cara.push(`<path d="${hat.join('')}" fill="${C.tintaSuave}" opacity="0.85"/>`);
}

svg.push(`<g>${cara.join('')}</g>`);

/* ══ 5. PROPS: lápiz + brújula; manos peladas ══ */
const props = [];

// — lápiz: eje calibrado (6,187)→(122,129), ancho 13 —
{
  const A = [6, 187], B = [122, 129];
  const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
  const px = -Math.sin(ang), py = Math.cos(ang);
  const w2 = 6.4;
  const p = (t, o) => [lerp(A[0], B[0], t) + px * o, lerp(A[1], B[1], t) + py * o];
  const coneBase = 0.24;
  const f0 = p(coneBase, -w2), f1 = p(0.965, -w2), f2 = p(0.965, w2), f3 = p(coneBase, w2);
  props.push(`<path d="M${r1(f0[0])} ${r1(f0[1])} L${r1(f1[0])} ${r1(f1[1])} L${r1(f2[0])} ${r1(f2[1])} L${r1(f3[0])} ${r1(f3[1])} Z" fill="${C.madera}" stroke="${C.tinta}" stroke-width="0.7"/>`);
  const g1a = p(coneBase, -w2 * 0.33), g1b = p(0.965, -w2 * 0.33);
  const g2a = p(coneBase, w2 * 0.33), g2b = p(0.965, w2 * 0.33);
  props.push(`<path d="M${r1(g1a[0])} ${r1(g1a[1])} L${r1(g1b[0])} ${r1(g1b[1])} M${r1(g2a[0])} ${r1(g2a[1])} L${r1(g2b[0])} ${r1(g2b[1])}" stroke="${C.maderaSombra}" stroke-width="0.55" fill="none"/>`);
  const c0 = p(coneBase, -w2), c1 = p(coneBase, w2), tipP = p(0, 0);
  props.push(`<path d="M${r1(c0[0])} ${r1(c0[1])} L${r1(tipP[0])} ${r1(tipP[1])} L${r1(c1[0])} ${r1(c1[1])} Z" fill="${C.cono}" stroke="${C.tinta}" stroke-width="0.6"/>`);
  const gr0 = p(0.075, -2.1), gr1 = p(0.075, 2.1);
  props.push(`<path d="M${r1(gr0[0])} ${r1(gr0[1])} L${r1(tipP[0])} ${r1(tipP[1])} L${r1(gr1[0])} ${r1(gr1[1])} Z" fill="${C.grafito}"/>`);
  const v0 = p(0.15, -3.2), v1 = p(0.18, 2.8);
  props.push(`<path d="M${r1(v0[0])} ${r1(v0[1])} q2.5 1.6 5 1 M${r1(v1[0])} ${r1(v1[1])} q2 -1.6 4.5 -1.2" stroke="${C.maderaSombra}" stroke-width="0.45" fill="none"/>`);
  const b0 = p(0.87, -w2), b3 = p(0.91, -w2), b1 = p(0.87, w2), b2 = p(0.91, w2);
  props.push(`<path d="M${r1(b0[0])} ${r1(b0[1])} L${r1(b3[0])} ${r1(b3[1])} M${r1(b1[0])} ${r1(b1[1])} L${r1(b2[0])} ${r1(b2[1])}" stroke="${C.latonOscuro}" stroke-width="1.5" fill="none"/>`);
  const e0 = p(0.965, -w2 * 0.85), e1 = p(1.0, 0), e2 = p(0.965, w2 * 0.85);
  props.push(`<path d="M${r1(e0[0])} ${r1(e0[1])} Q${r1(e1[0])} ${r1(e1[1])} ${r1(e2[0])} ${r1(e2[1])}" fill="none" stroke="${C.tinta}" stroke-width="0.65"/>`);
}

// — puño (29-118, 144-205): dedos enroscados al fuste, pulgar, uñitas —
// separaciones de dedos: curvas paralelas al fuste (arriba de él)
props.push(`<path d="M46 152 Q66 142 88 146 M42 164 Q64 154 90 158 M44 177 Q66 168 92 172" fill="none" stroke="${C.tinta}" stroke-width="0.55" stroke-linecap="round" opacity="0.85"/>`);
// nudillos: bultos sobre el borde superior
props.push(`<path d="M44 150 q7 -6 15 -5 M60 145 q7 -5 15 -4 M78 142 q7 -4 14 -2" fill="none" stroke="${C.manoSombra}" stroke-width="0.6" stroke-linecap="round"/>`);
// pulgar cruzando el fuste
props.push(`<path d="${suave([[58, 166], [76, 159], [94, 162], [102, 172], [97, 182], [80, 187], [63, 184], [54, 175]])}" fill="${C.mano}" stroke="${C.tinta}" stroke-width="0.65"/>`);
props.push(`<path d="M62 174 q9 -3.5 20 -0.5" fill="none" stroke="${C.manoSombra}" stroke-width="0.55"/>`);
// uñitas en el borde bajo del puño (sobre la silueta)
props.push(`<path d="M38 190 q-3.5 3 -1.5 6.5 q4.5 -0.6 5.5 -5 Z M52 197 q-3.5 3 -1.5 6.5 q4.5 -0.6 5.5 -5 Z M68 201 q-3 3 -0.5 6.5 q4.5 -1 5 -5.5 Z" fill="${C.cremaSombra}" stroke="${C.tinta}" stroke-width="0.45"/>`);
// sombreado del puño
{
  const hat = [];
  for (let i = 0; i < 24; i++) hat.push(pluma(R(34, 112), R(148, 200), R(0.5, 0.9), R(3.5, 7), 0.38, R(-0.8, 0.8)));
  props.push(`<g clip-path="url(#zt2sil)"><path d="${hat.join('')}" fill="${C.manoSombra}" opacity="0.5"/></g>`);
}

// — brújula (centro 114,258 r25) + mano por la derecha —
props.push(`<circle cx="114" cy="258" r="25" fill="${C.laton}" stroke="${C.tinta}" stroke-width="0.85"/>`);
props.push(`<circle cx="114" cy="258" r="19.4" fill="${C.esferaBr}" stroke="${C.latonOscuro}" stroke-width="0.75"/>`);
{
  const ticks = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ticks.push(`M${r1(114 + Math.cos(a) * 22)} ${r1(258 + Math.sin(a) * 22)}L${r1(114 + Math.cos(a) * 24.2)} ${r1(258 + Math.sin(a) * 24.2)}`);
  }
  props.push(`<path d="${ticks.join('')}" stroke="${C.latonOscuro}" stroke-width="0.5" fill="none"/>`);
  const card = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rA = i % 2 ? 14 : 17;
    card.push(`M${r1(114 + Math.cos(a) * 10)} ${r1(258 + Math.sin(a) * 10)}L${r1(114 + Math.cos(a) * rA)} ${r1(258 + Math.sin(a) * rA)}`);
  }
  props.push(`<path d="${card.join('')}" stroke="${C.tintaSuave}" stroke-width="0.45" fill="none" opacity="0.8"/>`);
}
props.push(`<path d="M106 245 L118 256 L114 259 Z" fill="${C.narizSombra}"/><path d="M122 271 L110 260 L114 257 Z" fill="${C.tintaSuave}"/>`);
props.push(`<circle cx="114" cy="258" r="1.9" fill="${C.latonOscuro}"/>`);
props.push(`<path d="M101 249 a17 17 0 0 1 9.5 -6.5" fill="none" stroke="#fff" stroke-width="1.8" opacity="0.5" stroke-linecap="round"/>`);
props.push(`<circle cx="89" cy="243" r="4.6" fill="${C.laton}" stroke="${C.tinta}" stroke-width="0.65"/><circle cx="86" cy="239.5" r="2.4" fill="none" stroke="${C.latonOscuro}" stroke-width="1"/>`);
// dedos sobre la brújula
props.push(`<path d="${suave([[134, 243], [152, 237], [168, 241], [179, 251], [182, 267], [175, 283], [160, 292], [146, 290], [135, 279], [130, 262]])}" fill="${C.mano}" stroke="${C.tinta}" stroke-width="0.7"/>`);
// separaciones de dedos sobre el aro + garritas asomando al borde
props.push(`<path d="M146 244 Q138 254 136 266 M156 242 Q147 254 144 270 M167 246 Q158 258 155 274" fill="none" stroke="${C.tinta}" stroke-width="0.55" stroke-linecap="round" opacity="0.85"/>`);
props.push(`<path d="M136 266 q-3 3 -1 6.5 q4.3 -0.7 5 -5 Z M144 271 q-3 3 -1 6.5 q4.3 -0.7 5 -5 Z M155 275 q-3 3 -1 6.5 q4.3 -0.7 5 -5 Z" fill="${C.cremaSombra}" stroke="${C.tinta}" stroke-width="0.42"/>`);
props.push(`<path d="M140 250 q8 4 14 12 M150 246 q7 5 11 13" fill="none" stroke="${C.manoSombra}" stroke-width="0.5" opacity="0.7"/>`);

svg.push(`<g>${props.join('')}</g>`);

/* ══ 6. COLA — banda AJUSTADA a la silueta + anillos transversales ══ */
{
  // corrida de la cola en el polígono del alfa (zona x≥352, y≥210)
  const enCola = ([x, y]) => (x >= 376 && y >= 210) || (x >= 352 && y >= 210 && y <= 300);
  const n = SIL.length;
  // TODAS las corridas contiguas en la zona; la cola es la MÁS LARGA
  const runs = [];
  let actual = null;
  for (let i = 0; i < n * 2; i++) {
    const pt = SIL[i % n];
    if (enCola(pt)) { if (!actual) { actual = []; runs.push(actual); } actual.push(pt); }
    else actual = null;
    if (i >= n && !actual) break;
  }
  const run = runs.reduce((a, b) => (b.length > a.length ? b : a), []);
  console.log('cola: corridas', runs.map((r) => r.length).join(','), '→ usando', run.length, 'pts');
  // punta = el punto de la corrida más cercano al gancho medido (393,256)
  let tipIdx = 0, dm = 1e18;
  run.forEach(([x, y], i) => { const d = (x - 393) ** 2 + (y - 256) ** 2; if (d < dm) { dm = d; tipIdx = i; } });
  const chainU = run.slice(0, tipIdx + 1);
  const chainV = run.slice(tipIdx).reverse();
  // remuestrear por longitud de arco (base→punta) recortando lo tapado por pelo (x<378 cerca de la grupa)
  const resample = (ch, N) => {
    const cl = ch.filter(([x, y]) => x >= 382 || y <= 300);
    const L = [0];
    for (let i = 1; i < cl.length; i++) L.push(L[i - 1] + Math.hypot(cl[i][0] - cl[i - 1][0], cl[i][1] - cl[i - 1][1]));
    const total = L[cl.length - 1];
    const out = [];
    for (let k = 0; k < N; k++) {
      const t = (k / (N - 1)) * total;
      let i = 1; while (i < cl.length - 1 && L[i] < t) i++;
      const f = (t - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]);
      out.push([lerp(cl[i - 1][0], cl[i][0], f), lerp(cl[i - 1][1], cl[i][1], f)]);
    }
    return out;
  };
  const N = 30;
  const A = resample(chainU, N), B = resample(chainV, N);
  // ¿cuál cadena es la interna (lado cóncavo del lazo)? la más cercana a (426,296)
  const dC = (ch) => ch.reduce((acc, [x, y]) => acc + Math.hypot(x - 426, y - 296), 0);
  const [ext, int_] = dC(A) < dC(B) ? [B, A] : [A, B];
  const colaPoly = ext.concat(int_.slice().reverse());
  svg.push(`<path d="${suave(colaPoly)}" fill="${C.rosa}"/>`);
  // sombra: banda pegada al borde interno
  const sombra = int_.map(([x, y], i) => {
    const [mx, my] = [(ext[i][0] + x) / 2, (ext[i][1] + y) / 2];
    return [lerp(x, mx, 0.42), lerp(y, my, 0.42)];
  });
  svg.push(`<path d="${suave(int_.concat(sombra.slice().reverse()))}" fill="${C.rosaSombra}" opacity="0.42"/>`);
  // anillos transversales entre las dos cadenas (con leve comba hacia la punta)
  const anillos = [];
  for (let i = 1; i < N - 1; i++) {
    const pares = 2; // densificar entre muestras
    for (let ss = 0; ss < pares; ss++) {
      const f = ss / pares;
      const ax = lerp(ext[i][0], ext[i + 1] ? ext[i + 1][0] : ext[i][0], f);
      const ay = lerp(ext[i][1], ext[i + 1] ? ext[i + 1][1] : ext[i][1], f);
      const bx = lerp(int_[i][0], int_[i + 1] ? int_[i + 1][0] : int_[i][0], f);
      const by = lerp(int_[i][1], int_[i + 1] ? int_[i + 1][1] : int_[i][1], f);
      const cx2 = lerp(ax, bx, 0.5) + (by - ay) * 0.07, cy2 = lerp(ay, by, 0.5) - (bx - ax) * 0.07;
      const inA = 0.9, inB = 0.9;
      anillos.push(`M${r1(lerp(ax, bx, (1 - inA) / 2))} ${r1(lerp(ay, by, (1 - inA) / 2))} Q${r1(cx2)} ${r1(cy2)} ${r1(lerp(ax, bx, 1 - (1 - inB) / 2))} ${r1(lerp(ay, by, 1 - (1 - inB) / 2))}`);
    }
  }
  svg.push(`<path d="${anillos.join('')}" fill="none" stroke="${C.rosaSombra}" stroke-width="0.48" opacity="0.85"/>`);
  // contornos finos sobre ambas cadenas + punta
  svg.push(`<path d="${suave(ext, false)}" fill="none" stroke="${C.tinta}" stroke-width="0.78" stroke-linecap="round"/>`);
  svg.push(`<path d="${suave(int_, false)}" fill="none" stroke="${C.tinta}" stroke-width="0.68" stroke-linecap="round"/>`);
  const tipX = (ext[N - 1][0] + int_[N - 1][0]) / 2, tipY = (ext[N - 1][1] + int_[N - 1][1]) / 2;
  svg.push(`<circle cx="${r1(tipX)}" cy="${r1(tipY)}" r="2" fill="${C.rosa}" stroke="${C.tinta}" stroke-width="0.55"/>`);

}

/* ══ 7. PIES: dedos largos con uñitas ══ */
{
  const pies = [];
  // pie lejano: dedos-cápsula hacia la izquierda-abajo (y 377-410)
  const dedosL = [[[160, 381], [204, 377]], [[157, 390], [204, 384]], [[161, 399], [206, 391]], [[168, 405], [208, 397]]];
  for (const [[tx, ty], [bx2, by2]] of dedosL) {
    const a = Math.atan2(ty - by2, tx - bx2);
    const px2 = -Math.sin(a) * 2.6, py2 = Math.cos(a) * 2.6;
    pies.push(`<path d="M${r1(bx2 + px2)} ${r1(by2 + py2)} Q${r1(lerp(bx2, tx, 0.5) + px2)} ${r1(lerp(by2, ty, 0.5) + py2 - 1.4)} ${r1(tx)} ${r1(ty)} Q${r1(lerp(bx2, tx, 0.5) - px2)} ${r1(lerp(by2, ty, 0.5) - py2 - 1.4)} ${r1(bx2 - px2)} ${r1(by2 - py2)}" fill="#d5bf9e" stroke="${C.tinta}" stroke-width="0.55"/>`);
    pies.push(`<path d="M${tx} ${ty} q-4 0.8 -5 3.6 q3 1.8 5.8 0 Z" fill="${C.cremaSombra}" stroke="${C.tinta}" stroke-width="0.42"/>`);
  }
  // pie cercano: abanico hacia abajo (y 400-440)
  const dedosN = [[[275, 428], [300, 402]], [[289, 437], [307, 403]], [[306, 441], [315, 404]], [[323, 437], [323, 404]], [[338, 425], [330, 402]]];
  for (const [[tx, ty], [bx2, by2]] of dedosN) {
    pies.push(`<path d="M${bx2} ${by2} Q${lerp(bx2, tx, 0.5) + 1.6} ${lerp(by2, ty, 0.5)} ${tx} ${ty}" fill="none" stroke="${C.tinta}" stroke-width="0.66" stroke-linecap="round"/>`);
    pies.push(`<path d="M${tx} ${ty} q-1.8 4.5 1 6.4 q3.6 -1.8 3.6 -6.4 Z" fill="${C.cremaSombra}" stroke="${C.tinta}" stroke-width="0.45"/>`);
  }
  const hat = [];
  for (let i = 0; i < 22; i++) hat.push(pluma(R(150, 208), R(372, 400), 0.12, R(2.5, 5), 0.36, R(-0.5, 0.5)));
  for (let i = 0; i < 26; i++) hat.push(pluma(R(268, 342), R(396, 432), 1.25, R(2.5, 5), 0.36, R(-0.5, 0.5)));
  pies.push(`<g clip-path="url(#zt2sil)"><path d="${hat.join('')}" fill="${C.manoSombra}" opacity="0.55"/></g>`);
  svg.push(pies.join(''));
}

/* ══ 8. BIGOTES — la vara de la línea fina: hilos de ~0.45px ══ */
{
  const bigotes = [];
  const izq = [
    [[158, 102], [128, 94], [96, 97]],
    [[154, 110], [122, 108], [93, 113]],
    [[152, 118], [122, 122], [95, 128]],
    [[150, 126], [124, 138], [97, 148]],
    [[152, 134], [128, 152], [104, 168]],
  ];
  const der = [
    [[283, 96], [314, 79], [348, 72]],
    [[286, 103], [322, 93], [356, 90]],
    [[287, 110], [325, 109], [359, 112]],
    [[285, 118], [319, 127], [349, 134]],
  ];
  for (const [a, b, c2] of izq.concat(der)) {
    bigotes.push(`<path d="M${a[0]} ${a[1]} Q${b[0]} ${b[1]} ${c2[0]} ${c2[1]}" fill="none" stroke="${C.tintaSuave}" stroke-width="0.45" stroke-linecap="round" opacity="0.9"/>`);
  }
  bigotes.push(`<path d="M168 54 Q164 42 156 34 M236 42 Q238 30 246 22" fill="none" stroke="${C.tintaSuave}" stroke-width="0.4" stroke-linecap="round" opacity="0.85"/>`);
  svg.push(bigotes.join(''));
}

/* ─────────────────────── ensamblar y escribir ─────────────────────── */
const interior = `<defs>${defs.join('')}</defs>${svg.join('')}`;
if (/[`\\]|\$\{/.test(interior)) throw new Error('markup con caracteres que rompen el template literal');
const nElem = (interior.match(/<(path|circle|ellipse|rect|g|use)\b/g) || []).length;

const salida = `/*
 * calcoTrazado — LÁMINA DE TINTA FINA dibujada a plumilla (SIN vtracer).
 * GENERADA por generar-tinta.mjs — NO editar a mano: regenerar.
 *
 * Es la zarigüeya del set Gemini aprobado REDIBUJADA como grabado a tinta
 * naturalista (estilo JaguarTrazado): coronilla = PELAJE claro con hebras
 * (nunca casquete), contorno fino y roto, bigotes de ~0.45px, ojos vivos.
 * Pose/encuadre pixel-alineados al hero 481×444 (silueta extraída del alfa,
 * rasgos medidos con lupas de grilla + calibración por superposición) → las
 * clip-regiones/pivotes de pielTrazado.js siguen calzando. Espacio NATIVO
 * 481×444 (ya no 2×). ${nElem} elementos (pelo fusionado por capas — perf
 * muy por debajo del techo del jaguar).
 */
export const CALCO_TRAZADO = \`${interior}\`;
export const CALCO_N_PATHS = ${nElem};
export default CALCO_TRAZADO;
`;
writeFileSync(join(AQUI, 'calcoTrazado.js'), salida);
console.log(`calcoTrazado.js escrito: ${nElem} elementos, ${Math.round(salida.length / 1024)} KB`);

const preview = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 481 444" width="962" height="888">${interior}</svg>`;
writeFileSync(join(AQUI, '../../../../_gate/zariguya-tinta/preview.svg'), preview);
console.log('preview.svg escrito');
