// repinta.mjs — REPINTA las manos de zariguya.png: de guantes Mickey a PATAS
// de zarigüeya (tono canela de los dedos traseros + dedos entintados + garras
// + puño peludo que funde con el antebrazo). Silueta y huella INTACTAS: todo
// píxel nuevo cae dentro de las primitivas de anatomia.js (elipse guante /
// cápsula antebrazo) — los cortes de capas.js y el INPAINT_PECHO siguen válidos.
// Uso (cwd = worktree): node ../../_gate/zariguya-sin-guantes/repinta.mjs [--aplicar]
//   sin --aplicar: escribe /tmp/zlv-repinta-preview.png + lupas; no toca el PNG.
import sharp from 'sharp';

const SRC = 'public/compai/laminas/zariguya.png';
const APLICAR = process.argv.includes('--aplicar');

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// LCG determinista (reproducible commit a commit)
let _s = 20260818;
const rnd = () => (_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296;

/* ── 1. RETINTE base: blancos de guante → canela de dedo trasero ─────────────
   Medido: guante claro (237,222,196); dedo trasero claro (211,187,165).
   Target un punto más oscuro (198,168,138) para leer "pata", no "manopla". */
const F = [198 / 237, 168 / 222, 138 / 196];
const MANOS = [
  { // puño del lápiz — se protege el lápiz SOLO donde hay madera VISIBLE
    // (dos tramos cortos: culata arriba y punta abajo; el tramo central va
    // TAPADO por los dedos — protegerlo dejó la veta blanca de la v1 de hoy)
    elipse: { cx: 58, cy: 175, rx: 42, ry: 41 },
    guarda: (x, y) => {
      const tramos = [[84, 132, 58, 153], [33, 178, 6, 195]];
      let g = 1;
      for (const [ax, ay, bx, by] of tramos) {
        const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
        const t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
        const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
        g = Math.min(g, ss(4.5, 7, d)); // dentro de la madera → 0 (no retinte)
      }
      return g;
    },
  },
  { // manito de la brújula — semiplano medido protege la cara de la brújula (proto v2)
    elipse: { cx: 151, cy: 263, rx: 36, ry: 36 },
    guarda: (x, y) => (y < 266 ? ss(129.5, 133, x) : 1),
  },
];

function retinte(d, W) {
  for (const { elipse, guarda } of MANOS) {
    const { cx, cy, rx, ry } = elipse;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const rn = Math.hypot((x - cx) / rx, (y - cy) / ry);
        if (rn > 1) continue;
        const i = (y * W + x) * 4;
        if (!d[i + 3]) continue;
        const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // rampa amplia (150→205): también los medios tonos del sombreado del
        // guante se corren a canela — el retinte v1 (170→210) dejó la manopla clara.
        let t = ss(150, 205, L) * (1 - ss(0.94, 1.02, rn));
        if (guarda) t *= guarda(x, y);
        if (!t) continue;
        d[i] *= 1 - t * (1 - F[0]);
        d[i + 1] *= 1 - t * (1 - F[1]);
        d[i + 2] *= 1 - t * (1 - F[2]);
      }
    }
  }
}

/* ── 2. ESTRUCTURA dibujada (SVG @481×444): tapar rayitas Mickey, dedos,
   garras, pelo de muñeca y sombreado a rayitas estilo grabado ──────────────── */
const TINTA = 'rgb(43,32,22)';
const GARRA = 'rgb(52,40,28)';
const GARRA_BORDE = 'rgb(28,21,14)';
const CANELA = 'rgb(198,168,138)';

const garra = (x0, y0, x1, y1, wBase) => {
  // triangulito curvo: base en el dedo, punta afuera
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len, w = wBase / 2;
  return `<path d="M ${x0 + nx * w},${y0 + ny * w} Q ${x0 + dx * 0.55 + nx * w * 0.7},${y0 + dy * 0.55 + ny * w * 0.7} ${x1},${y1} Q ${x0 + dx * 0.55 - nx * w * 0.7},${y0 + dy * 0.55 - ny * w * 0.7} ${x0 - nx * w},${y0 - ny * w} Z" fill="${GARRA}" stroke="${GARRA_BORDE}" stroke-width="0.6"/>`;
};

// rayitas cortas (sombreado grabado / pelo) dentro de un polígono
const rayitas = (poli, dir, n, largo, colores, alfa, wMin = 0.7, wMax = 1.3) => {
  const xs = poli.map((p) => p[0]), ys = poli.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const dentro = (x, y) => { // ray casting
    let c = false;
    for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
      const [xi, yi] = poli[i], [xj, yj] = poli[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  let s = '', hechos = 0, intentos = 0;
  while (hechos < n && intentos < n * 30) {
    intentos++;
    const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
    if (!dentro(x, y)) continue;
    const jit = (rnd() - 0.5) * 0.5;
    const dx = dir[0] + jit * -dir[1], dy = dir[1] + jit * dir[0];
    const dl = Math.hypot(dx, dy), l = largo * (0.6 + rnd() * 0.8);
    const col = colores[Math.floor(rnd() * colores.length)];
    const cx = x + (dx / dl) * l * 0.5 + (rnd() - 0.5) * 2, cy = y + (dy / dl) * l * 0.5 + (rnd() - 0.5) * 2;
    s += `<path d="M ${x.toFixed(1)},${y.toFixed(1)} Q ${cx.toFixed(1)},${cy.toFixed(1)} ${(x + (dx / dl) * l).toFixed(1)},${(y + (dy / dl) * l).toFixed(1)}" stroke="${col}" stroke-width="${(wMin + rnd() * (wMax - wMin)).toFixed(2)}" fill="none" opacity="${(alfa * (0.75 + rnd() * 0.5)).toFixed(2)}" stroke-linecap="round"/>`;
    hechos++;
  }
  return s;
};

function svgEstructura() {
  let s = '';

  /* — MANO DE LA BRÚJULA — */
  // 2a. tapar las TRES rayitas Mickey (medidas en la lupa: x136-170, y252-282)
  for (const [x, y] of [[141.5, 260.5], [152, 267.5], [162, 273.5]]) {
    s += `<ellipse cx="${x}" cy="${y}" rx="9" ry="11.5" transform="rotate(50 ${x} ${y})" fill="rgb(191,160,129)" opacity="0.95"/>`;
  }
  // 2b. separaciones de DEDOS: arcos que MUEREN en los festones del borde
  // inferior (la v1 los dejó flotando y leían como rayones, no como dedos)
  s += `<path d="M 149,249 C 141,259 132,272 128.5,284" stroke="${TINTA}" stroke-width="1.6" fill="none" opacity="0.82" stroke-linecap="round"/>`;
  s += `<path d="M 159,253 C 152,264 145,277 140.5,289" stroke="${TINTA}" stroke-width="1.6" fill="none" opacity="0.82" stroke-linecap="round"/>`;
  s += `<path d="M 168,258 C 163,268 157,279 152.5,290" stroke="${TINTA}" stroke-width="1.5" fill="none" opacity="0.78" stroke-linecap="round"/>`;
  // pulgar sobre el aro de la brújula
  s += `<path d="M 138,242 Q 133,247 131.5,254" stroke="${TINTA}" stroke-width="1.4" fill="none" opacity="0.7" stroke-linecap="round"/>`;
  // 2c. GARRAS en las puntas (dentro de la huella — coronan los festones)
  s += garra(124, 281, 119, 289, 4);
  s += garra(135, 286, 130.5, 294.5, 4);
  s += garra(147, 288, 143.5, 296, 3.8);
  s += garra(158, 285, 156, 293, 3.6);
  // 2d. PUÑO-ROLLO → MUÑECA PELUDA: primero un velo oscuro que mata el rollo
  // claro, encima pelo corto y denso que funde con el antebrazo
  s += `<ellipse cx="169" cy="244" rx="20" ry="13" transform="rotate(40 169 244)" fill="rgb(78,66,52)" opacity="0.5"/>`;
  s += rayitas([[152, 231], [186, 230], [188, 254], [172, 261], [153, 255]], [-0.7, 0.65], 170, 4.5,
    ['rgb(45,38,30)', 'rgb(70,60,47)', 'rgb(28,23,17)', 'rgb(95,82,64)'], 0.8, 0.6, 1.1);
  // 2e. modelado de dedos: sombra ancha y tenue pegada a cada separación
  s += `<path d="M 151,251 C 143,261 134,273 130.5,283" stroke="rgb(120,95,70)" stroke-width="3.6" fill="none" opacity="0.3" stroke-linecap="round"/>`;
  s += `<path d="M 161,255 C 154,265 147,277 142.5,288" stroke="rgb(120,95,70)" stroke-width="3.6" fill="none" opacity="0.3" stroke-linecap="round"/>`;
  s += `<path d="M 170,260 C 165,269 159,279 154.5,289" stroke="rgb(120,95,70)" stroke-width="3.2" fill="none" opacity="0.28" stroke-linecap="round"/>`;
  // 2f. sombreado a rayitas sobre el dorso (dirección de los dedos) + GRANO
  // fino que devuelve la trama de grabado sobre los parches lisos
  s += rayitas([[128, 250], [170, 252], [162, 285], [126, 285]], [-0.45, 0.85], 60, 4.5,
    ['rgb(92,70,50)', 'rgb(60,45,32)'], 0.28);
  s += rayitas([[126, 248], [174, 250], [166, 287], [122, 287]], [-0.45, 0.85], 90, 2.4,
    ['rgb(130,102,76)', 'rgb(105,82,60)'], 0.2, 0.5, 0.9);

  /* — PUÑO DEL LÁPIZ — */
  // separaciones de dedos: refuerzo de los surcos ya dibujados entre bultos
  s += `<path d="M 30,163 Q 39,159 47,163" stroke="${TINTA}" stroke-width="1.3" fill="none" opacity="0.6" stroke-linecap="round"/>`;
  s += `<path d="M 24,176 Q 33,172 42,177" stroke="${TINTA}" stroke-width="1.3" fill="none" opacity="0.6" stroke-linecap="round"/>`;
  // GARRAS: caperuzas oscuras en las puntas de los dedos que ya existen
  s += garra(26, 158, 18.5, 164.5, 4);  // dedo alto izquierdo
  s += garra(24, 173, 17, 179.5, 3.8);  // dedo medio izquierdo
  s += garra(33, 186, 25.5, 192, 3.8);  // dedo bajo (sobre la salida del lápiz)
  s += garra(50, 172, 46.5, 179.5, 3.4); // índice enroscado sobre el lápiz
  // PELO en el dorso derecho del puño → funde con el antebrazo peludo
  s += rayitas([[57, 148], [76, 158], [82, 182], [64, 200], [54, 178]], [0.8, 0.55], 90, 7,
    ['rgb(50,42,33)', 'rgb(85,74,58)', 'rgb(30,25,18)'], 0.7, 0.7, 1.4);
  // sombreado suave en los bultos de dedos (lado sombra, abajo-izquierda)
  s += rayitas([[18, 158], [50, 150], [52, 190], [24, 194]], [0.55, 0.75], 40, 4.5,
    ['rgb(92,70,50)', 'rgb(60,45,32)'], 0.3);
  s += rayitas([[30, 134], [52, 136], [50, 158], [30, 156]], [0.7, 0.5], 22, 4,
    ['rgb(92,70,50)'], 0.25);

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="481" height="444">${s}</svg>`);
}

/* ── 3. métrica dura: blancos de guante (L>205) por mano, antes y después ── */
const cuentaBlancos = (d, W) => MANOS.map(({ elipse, guarda }) => {
  let n = 0;
  const { cx, cy, rx, ry } = elipse;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (Math.hypot((x - cx) / rx, (y - cy) / ry) > 0.92) continue;
      if (guarda && guarda(x, y) < 1) continue;
      const i = (y * W + x) * 4;
      if (d[i + 3] < 200) continue;
      if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] > 205) n++;
    }
  }
  return n;
});

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
console.log('blancos ANTES  [lapiz, brujula]:', cuentaBlancos(data, W));

retinte(data, W);

// composite del SVG solo donde la lámina YA tiene alfa (la silueta no crece):
// sharp compone y luego se restaura el alfa original píxel a píxel.
const alfaOriginal = Buffer.alloc(W * H);
for (let p = 0; p < W * H; p++) alfaOriginal[p] = data[p * 4 + 3];

const compuesto = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
  .composite([{ input: svgEstructura() }])
  .raw().toBuffer();
for (let p = 0; p < W * H; p++) compuesto[p * 4 + 3] = alfaOriginal[p];

console.log('blancos DESPUES[lapiz, brujula]:', cuentaBlancos(compuesto, W));

const out = APLICAR ? SRC : '/tmp/zlv-repinta-preview.png';
await sharp(Buffer.from(compuesto), { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
console.log((APLICAR ? 'APLICADO → ' : 'preview → ') + out);

// lupas para el ojo
const vista = APLICAR ? SRC : out;
await sharp(vista).extract({ left: 0, top: 120, width: 110, height: 110 }).resize(550, 550, { kernel: 'nearest' }).png().toFile('/tmp/zlv-rep-lapiz.png');
await sharp(vista).extract({ left: 95, top: 210, width: 115, height: 110 }).resize(575, 550, { kernel: 'nearest' }).png().toFile('/tmp/zlv-rep-brujula.png');
console.log('lupas → /tmp/zlv-rep-lapiz.png /tmp/zlv-rep-brujula.png');
