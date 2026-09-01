// ── pista.js — la pista "Descenso del páramo al bosque de niebla" ───────────
// Puro (sin THREE): spline cerrada de Catmull-Rom + perfil de altitud cerrado
// + heightfield + hash espacial. La física y el entorno la consultan.
//
// Diseño: circuito fluido de ~1.3 km. La altitud es una función PERIÓDICA de la
// fracción de vuelta f∈[0,1): se arranca en el páramo alto, se desciende por
// curvas amplias con dos saltos, se cruza el bosque andino y el bosque de
// niebla, y se vuelve a subir a la meta. Sin importar nada: testeable en node.

// ── Zonas (para flora/niebla/color de terreno) ─────────────────────────────
export const ZONA = {
  PARAMO_ALTO: 0,
  TRANSICION: 1,
  BOSQUE: 2,
  NIEBLA: 3,
  SUBIDA: 4,
};
const NOMBRE_ZONA = ['Páramo', 'Transición', 'Bosque andino', 'Bosque de niebla', 'Subida al páramo'];

// El mundo chorrera reemplaza el perfil ENTERO: la vuelta es un descenso por
// los siete beats de La Chorrera, con túnel de retorno y portal New Donk.
// Toda su geometría vive en el módulo del tramo; solo aplica con opts.chorrera.
export { CHORRERA_BEATS, CHORRERA_DROPS, CHORRERA_PORTAL, CHORRERA_POZAS } from './descenso-chorrera.js';
import {
  CHORRERA_BEATS, CHORRERA_POZAS, CHORRERA_PORTAL, NOMBRES_CHORRERA,
  perfilChorrera, paredChorrera, anchoChorrera, zonaChorrera, esTunelChorrera,
} from './descenso-chorrera.js';

// ── spline de control (bucle cerrado) ──────────────────────────────────────
const CTRL = [
  [0, 0],
  [20, -1],
  [40, -2],
  [60, -3],
  [80, -5],
  [160, -15],
  [230, -45],
  [285, -95],
  [320, -160],
  [335, -230],
  [320, -295],
  [280, -340],
  [225, -355],
  [175, -335],
  [155, -285],
  [180, -235],
  [230, -215],
  [240, -170],
  [210, -130],
  [160, -120],
  [115, -135],
  [80, -165],
  [60, -210],
  [25, -245],
  [-25, -260],
  [-75, -245],
  [-105, -205],
  [-110, -150],
  [-90, -105],
  [-50, -75],
  [-52, -44],
  [-46, -20],
  [-34, -8],
  [-18, -2],
  [-5, 0],
];

function wrapA(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function suave(t) { const s = clamp(t, 0, 1); return s * s * (3 - 2 * s); }

// Catmull-Rom (tension estándar 0.5) sobre 4 puntos → valor en t∈[0,1]
function catmull(a, b, c, d, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (
    (2 * b) +
    (-a + c) * t +
    (2 * a - 5 * b + 4 * c - d) * t2 +
    (-a + 3 * b - 3 * c + d) * t3
  );
}

// ── perfil de altitud cerrado ──────────────────────────────────────────────
// Gaussiana de cresta (para los labios de salto)
function cresta(f, c, w) {
  const d = (f - c) / w;
  return Math.exp(-d * d);
}
function perfilBase(f) {
  let y = 24
    + 10 * Math.cos(2 * Math.PI * f)
    + 2.5 * Math.cos(4 * Math.PI * f)
    + 1.2 * Math.cos(6 * Math.PI * f + 0.7)
    + 0.9 * Math.cos(8 * Math.PI * f + 1.3);
  // micro-relieve rodante
  y += 0.7 * Math.sin(f * 31 + 2) + 0.5 * Math.sin(f * 53 + 5) + 0.35 * Math.sin(f * 97 + 1);
  // salto 1: borde del páramo (f≈0.20)
  y += 2.3 * cresta(f, 0.20, 0.011);
  y -= 2.0 * cresta(f, 0.226, 0.013);
  // salto 2: entrada al bosque de niebla (f≈0.62)
  y += 2.5 * cresta(f, 0.62, 0.010);
  y -= 2.2 * cresta(f, 0.646, 0.013);
  return y;
}

function perfil(f) { return perfilChorrera(f, perfilBase); }

function zonaDe(f) {
  if (f < 0.24) return ZONA.PARAMO_ALTO;
  if (f < 0.42) return ZONA.TRANSICION;
  if (f < 0.60) return ZONA.BOSQUE;
  if (f < 0.78) return ZONA.NIEBLA;
  return ZONA.SUBIDA;
}

// ── altura del terreno natural (fuera de la pista) ─────────────────────────
function hash2(x, z) {
  let h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < 5; i++) { s += amp * vnoise(x * f, z * f); norm += amp; amp *= 0.5; f *= 2.05; }
  return s / norm;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONSTRUCCIÓN
// ═══════════════════════════════════════════════════════════════════════════
export function construirPista(opts = {}) {
  const esMar = !!opts.mar;
  const perfilMundo = esMar ? () => 0 : (opts.chorrera ? perfil : perfilBase);
  const pasoMuestreo = opts.pasoMuestreo ?? 0.001;  // resolución del catmull
  const nFinal = opts.nFinal ?? 2400;                // muestras uniformes por arco

  // 1) polilínea densa del Catmull-Rom cerrado
  const pts = [];
  const m = CTRL.length;
  for (let i = 0; i < m; i++) {
    const a = CTRL[(i - 1 + m) % m], b = CTRL[i], c = CTRL[(i + 1) % m], d = CTRL[(i + 2) % m];
    const seg = Math.max(40, Math.ceil(0.7 / pasoMuestreo));
    for (let s = 0; s <= seg; s++) {
      if (i === m - 1 && s === seg) break; // no duplicar el último
      const t = s / seg;
      pts.push([catmull(a[0], b[0], c[0], d[0], t), catmull(a[1], b[1], c[1], d[1], t)]);
    }
  }

  // 2) reparametrizar por longitud de arco
  const long = [];
  let total = 0;
  long.push(0);
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0], dz = pts[i][1] - pts[i - 1][1];
    total += Math.hypot(dx, dz);
    long.push(total);
  }
  const L = total;

  const muestras = [];
  for (let j = 0; j < nFinal; j++) {
    const target = (j / nFinal) * L;
    // búsqueda binaria del índice de longitud
    let lo = 0, hi = pts.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (long[mid] <= target) lo = mid; else hi = mid;
    }
    const tSeg = long[hi] === long[lo] ? 0 : (target - long[lo]) / (long[hi] - long[lo]);
    muestras.push({
      x: lerp(pts[lo][0], pts[hi][0], tSeg),
      z: lerp(pts[lo][1], pts[hi][1], tSeg),
    });
  }

  // 3) heading, curvatura (signo: giro a la izquierda = positivo), altitud,
  //    ancho, banco y zona por muestra
  const n = muestras.length;
  const PX = new Float32Array(n), PZ = new Float32Array(n), PY = new Float32Array(n);
  const HDG = new Float32Array(n), CUR = new Float32Array(n), W = new Float32Array(n);
  const BAN = new Float32Array(n), ZON = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const ant = muestras[(i - 1 + n) % n], sig = muestras[(i + 1) % n];
    PX[i] = muestras[i].x; PZ[i] = muestras[i].z;
    HDG[i] = Math.atan2(sig.z - ant.z, sig.x - ant.x);
    PY[i] = perfilMundo(i / n);
    ZON[i] = opts.chorrera ? zonaChorrera(i / n) : zonaDe(i / n);
  }
  const ds = L / n;
  for (let i = 0; i < n; i++) {
    const ant = HDG[(i - 1 + n) % n], sig = HDG[(i + 1) % n];
    CUR[i] = wrapA(sig - ant) / (2 * ds);
  }
  for (let i = 0; i < n; i++) {
    const f = i / n;
    const cAbs = Math.abs(CUR[i]);
    const ajusteZona =
      ZON[i] === ZONA.BOSQUE ? -0.9 :
      ZON[i] === ZONA.NIEBLA ? -1.2 :
      ZON[i] === ZONA.PARAMO_ALTO ? 0.6 : 0;
    const extraChorrera = opts.chorrera ? anchoChorrera(f) : 0;
    W[i] = clamp(9.2 + cAbs * 76 + ajusteZona + extraChorrera, 7.4, opts.chorrera ? 16.5 : 13.8);
    BAN[i] = esMar ? 0 : clamp(CUR[i] * 24, -0.085, 0.085);
  }

  // 4) hash espacial de muestras (para búsqueda de vecino en O(1) aprox)
  const pasoHash = 12;
  const buckets = new Map();
  function celda(cx, cz) { return cx * 100003 + cz; }
  for (let i = 0; i < n; i++) {
    const cx = Math.floor(PX[i] / pasoHash), cz = Math.floor(PZ[i] / pasoHash);
    const k = celda(cx, cz);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(i);
  }

  // 5) heightfield (terreno con la pista esculpida)
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) {
    if (PX[i] < x0) x0 = PX[i]; if (PX[i] > x1) x1 = PX[i];
    if (PZ[i] < z0) z0 = PZ[i]; if (PZ[i] > z1) z1 = PZ[i];
  }
  const margen = 90;
  x0 = Math.floor((x0 - margen) / 2) * 2;
  z0 = Math.floor((z0 - margen) / 2) * 2;
  x1 = Math.ceil((x1 + margen) / 2) * 2;
  z1 = Math.ceil((z1 + margen) / 2) * 2;
  const paso = 2;
  const cols = Math.round((x1 - x0) / paso) + 1;
  const filas = Math.round((z1 - z0) / paso) + 1;
  const datos = new Float32Array(cols * filas);

  // normal de muestra (derecha de la heading): derecha = (sen hdg, -cos hdg)
  // lat = dot(p - s, derecha) → positivo a la derecha del sentido de marcha
  const _idx = new Int32Array(300);
  function muestrasCerca(x, z) {
    const cx0 = Math.floor(x / pasoHash) - 1, cx1 = Math.floor(x / pasoHash) + 1;
    const cz0 = Math.floor(z / pasoHash) - 1, cz1 = Math.floor(z / pasoHash) + 1;
    let k = 0;
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cz = cz0; cz <= cz1; cz++) {
        const arr = buckets.get(celda(cx, cz));
        if (arr) for (let t = 0; t < arr.length; t++) _idx[k++] = arr[t];
      }
    }
    return k;
  }
  function mejorMuestra(x, z, devolver) {
    const k = muestrasCerca(x, z);
    let best = -1, bd = Infinity;
    for (let t = 0; t < k; t++) {
      const i = _idx[t];
      const dx = PX[i] - x, dz = PZ[i] - z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) { // fuera del hash (no debería pasar): barrido total
      for (let i = 0; i < n; i++) {
        const dx = PX[i] - x, dz = PZ[i] - z;
        const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = i; }
      }
    }
    // refinar con una ventana alrededor del candidato
    const bestW = devolver ? devolver(best) : null;
    return { indice: best, win: bestW };
  }

  // build del heightfield
  for (let gz = 0; gz < (esMar ? 0 : filas); gz++) {
    const z = z0 + gz * paso;
    for (let gx = 0; gx < cols; gx++) {
      const x = x0 + gx * paso;
      const { indice } = mejorMuestra(x, z);
      const i = indice;
      const dx = PX[i] - x, dz = PZ[i] - z;
      const derechaX = Math.sin(HDG[i]), derechaZ = -Math.cos(HDG[i]);
      const lat = dx * derechaX + dz * derechaZ;
      const w = W[i];
      const te = PY[i] + lat * BAN[i];   // altitud de la pista con banco
      let h;
      const d = Math.abs(lat);
      if (opts.chorrera) {
        // ── mundo chorrera: cañón escalonado. La vía es el lecho; a los
        // lados suben PAREDES (paredChorrera) en vez de abrirse el páramo.
        // En el tramo del túnel la montaña TAPA la vía (no se excava).
        const fM = i / n;
        const tunel = esTunelChorrera(fM);
        const muro = paredChorrera(fM);
        if (d < w && !tunel) {
          h = te;
        } else {
          const t = Math.max(0, d - w);
          // la pared sube en ~24 m de falda y ondula con fbm; lejos no baja
          // al páramo: se queda como monte alto del cañón
          const subida = suave(t / 24);
          const ondul = (fbm(x * 0.016, z * 0.016) - 0.5) * (6 + 10 * subida);
          const lipRoca = t < 5 && !tunel ? Math.sin(Math.PI * Math.min(1, t / 5)) * 0.9 : 0;
          h = te + lipRoca + muro * subida + ondul * subida;
          if (tunel) {
            // techo del túnel también sobre la vía (d<w): mínimo 12 m de roca
            h = Math.max(h, te + 12 + muro * 0.4 * suave(1 - d / (w + 30)));
          }
        }
        datos[gz * cols + gx] = clamp(h, 1, 128);
        continue;
      }
      if (d < w) {
        h = te;
      } else {
        const t = d - w;
        const lip = t < 14 ? Math.sin(Math.PI * Math.min(1, t / 14)) * 1.8 : 0;
        const suaveT = suave((t - 14) / 30);
        const tr = 20 + (fbm(x * 0.012, z * 0.012) - 0.5) * 22;
        h = lerp(te + lip, tr, suaveT);
      }
      datos[gz * cols + gx] = clamp(h, 1, 64);
    }
  }

  // 6) consultas
  const H_BORDE = esMar ? 0 : 1;
  function alturaMundo(x, z) {
    if (esMar) return 0;
    const gx = (x - x0) / paso;
    const gz = (z - z0) / paso;
    const ix = Math.floor(gx), iz = Math.floor(gz);
    const fx = gx - ix, fz = gz - iz;
    const c00 = ix < 0 || iz < 0 || ix >= cols || iz >= filas ? H_BORDE : datos[iz * cols + ix];
    const c10 = ix + 1 < 0 || iz < 0 || ix + 1 >= cols || iz >= filas ? H_BORDE : datos[iz * cols + ix + 1];
    const c01 = ix < 0 || iz + 1 < 0 || ix >= cols || iz + 1 >= filas ? H_BORDE : datos[(iz + 1) * cols + ix];
    const c11 = ix + 1 < 0 || iz + 1 < 0 || ix + 1 >= cols || iz + 1 >= filas ? H_BORDE : datos[(iz + 1) * cols + ix + 1];
    return lerp(lerp(c00, c10, fx), lerp(c01, c11, fx), fz);
  }

  function normalMundo(x, z) {
    const e = 1.0;
    const hx = alturaMundo(x + e, z) - alturaMundo(x - e, z);
    const hz = alturaMundo(x, z + e) - alturaMundo(x, z - e);
    const nx = -hx, ny = 2 * e, nz = -hz;
    const l = Math.hypot(nx, ny, nz) || 1;
    return { x: nx / l, y: ny / l, z: nz / l };
  }

  // información local en (x,z): vecino + latitud con signo + altura del suelo
  function infoLocal(x, z) {
    let best = -1, bd = Infinity;
    const k = muestrasCerca(x, z);
    for (let t = 0; t < k; t++) {
      const i = _idx[t];
      const dx = PX[i] - x, dz = PZ[i] - z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) {
      for (let i = 0; i < n; i++) {
        const dx = PX[i] - x, dz = PZ[i] - z;
        const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = i; }
      }
    }
    // refinar ventana ±28 (≈ ±15 m, la muestra es cada ~0.55 m)
    for (let q = -28; q <= 28; q++) {
      const j = (best + q + n) % n;
      const dx = PX[j] - x, dz = PZ[j] - z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = j; }
    }
    const i = best;
    const dx = PX[i] - x, dz = PZ[i] - z;
    const derechaX = Math.sin(HDG[i]), derechaZ = -Math.cos(HDG[i]);
    const lat = dx * derechaX + dz * derechaZ;
    const f = i / n;
    const s = f * L;
    return {
      f, s, lat,
      h: alturaMundo(x, z),
      w: W[i],
      hdg: HDG[i],
      banco: BAN[i],
      zona: ZON[i],
      elev: PY[i],
      indice: i,
    };
  }

  // punto interpolado del centro de la pista en la fracción f
  function puntoEn(f) {
    f = ((f % 1) + 1) % 1;
    const xf = f * n;
    const i = Math.floor(xf) % n;
    const t = xf - Math.floor(xf);
    const j = (i + 1) % n;
    const hdg = wrapA(HDG[i] + wrapA(HDG[j] - HDG[i]) * t);
    return {
      x: lerp(PX[i], PX[j], t),
      z: lerp(PZ[i], PZ[j], t),
      y: lerp(PY[i], PY[j], t),
      hdg,
      w: lerp(W[i], W[j], t),
      banco: lerp(BAN[i], BAN[j], t),
      zona: ZON[j],
    };
  }

  // minimapa (polilínea muestreada para el HUD)
  const minPts = [];
  const nMini = 110;
  for (let q = 0; q < nMini; q++) {
    const i = Math.floor((q / nMini) * n) % n;
    minPts.push([PX[i], PZ[i]]);
  }

  return {
    L, n, paso,
    PX, PZ, PY, HDG, CUR, W, BAN, ZON,
    x0, z0, x1, z1, cols, filas, datos,
    mar: esMar,
    NOMBRE_ZONA: esMar
      ? ['Mar abierto', 'Arrecife', 'Bosque de algas', 'Aguas de coral', 'Vuelta al puerto']
      : (opts.chorrera ? NOMBRES_CHORRERA : NOMBRE_ZONA),
    alturaMundo, normalMundo, infoLocal, puntoEn,
    perfil: perfilMundo,
    chorrera: !!opts.chorrera,
    chorreraBeats: CHORRERA_BEATS,
    chorreraPozas: opts.chorrera ? CHORRERA_POZAS : null,
    chorreraPortal: opts.chorrera ? CHORRERA_PORTAL : null,
    minimapa: minPts,
    // exportados para debug/QA
    _CTRL: CTRL, _muestrasBrutas: pts,
  };
}
