/**
 * Aleatoriedad determinista + ruido. Todo el mundo procedural depende de esto,
 * así que una misma semilla SIEMPRE produce el mismo mapa.
 */

export function mulberry32(semilla) {
  let a = semilla >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(semilla = 1337) {
    this.semilla = semilla >>> 0;
    this.r = mulberry32(this.semilla);
  }
  float(min = 0, max = 1) { return min + this.r() * (max - min); }
  int(min, max) { return Math.floor(this.float(min, max + 1)); }
  bool(p = 0.5) { return this.r() < p; }
  pick(arr) { return arr[Math.floor(this.r() * arr.length)]; }
  /** Distribución normal (Box–Muller) */
  gauss(mu = 0, sigma = 1) {
    const u = Math.max(1e-9, this.r()), v = this.r();
    return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  /** Punto en disco uniforme */
  disco(radio = 1) {
    const a = this.r() * Math.PI * 2, r = Math.sqrt(this.r()) * radio;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }
  fork(sal = 0x9e3779b9) { return new RNG((this.semilla ^ (sal + Math.floor(this.r() * 0xffffffff))) >>> 0); }
}

/* ---------- Ruido Simplex 2D/3D (dominio público, adaptado) ---------- */
const GRAD3 = new Float32Array([
  1,1,0, -1,1,0, 1,-1,0, -1,-1,0,
  1,0,1, -1,0,1, 1,0,-1, -1,0,-1,
  0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1,
]);

export class Ruido {
  constructor(semilla = 1337) {
    const r = mulberry32(semilla);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  simplex2(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = xin - X0, y0 = yin - Y0;
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { const gi0 = this.permMod12[ii + this.perm[jj]] * 3; t0 *= t0; n0 = t0 * t0 * (GRAD3[gi0] * x0 + GRAD3[gi0 + 1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]] * 3; t1 *= t1; n1 = t1 * t1 * (GRAD3[gi1] * x1 + GRAD3[gi1 + 1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]] * 3; t2 *= t2; n2 = t2 * t2 * (GRAD3[gi2] * x2 + GRAD3[gi2 + 1] * y2); }
    return 70 * (n0 + n1 + n2);
  }

  /** Ruido fractal (fBm) en [-1,1] aprox. */
  fbm(x, y, octavas = 5, lac = 2.0, gan = 0.5) {
    let amp = 1, frec = 1, suma = 0, norm = 0;
    for (let o = 0; o < octavas; o++) {
      suma += amp * this.simplex2(x * frec, y * frec);
      norm += amp;
      amp *= gan; frec *= lac;
    }
    return suma / norm;
  }

  /** Ruido con crestas: sirve para cordilleras y vetas de mineral. */
  ridged(x, y, octavas = 5, lac = 2.0, gan = 0.5) {
    let amp = 1, frec = 1, suma = 0, norm = 0;
    for (let o = 0; o < octavas; o++) {
      const n = 1 - Math.abs(this.simplex2(x * frec, y * frec));
      suma += amp * n * n;
      norm += amp;
      amp *= gan; frec *= lac;
    }
    return (suma / norm) * 2 - 1;
  }

  /** Worley / celular: F1 y F2 en una pasada. Devuelve [f1, f2]. */
  worley(x, y, escala = 1) {
    const px = x * escala, py = y * escala;
    const cx = Math.floor(px), cy = Math.floor(py);
    let f1 = Infinity, f2 = Infinity;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const gx = cx + ox, gy = cy + oy;
        const h = this.perm[(gx & 255) + this.perm[gy & 255]];
        const jx = gx + ((h * 0.6180339887) % 1);
        const jy = gy + ((this.perm[(h + 37) & 511] / 255));
        const dx = jx - px, dy = jy - py;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
      }
    }
    return [f1, f2];
  }
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const inverseLerp = (a, b, v) => (b === a ? 0 : clamp((v - a) / (b - a), 0, 1));
