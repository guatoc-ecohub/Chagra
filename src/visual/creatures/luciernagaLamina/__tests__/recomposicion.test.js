/**
 * recomposicion.test.js — el CANDADO de costuras del corte C4: recompone
 * las capas del kit con la MISMA matemática que pinta el navegador
 * (`mascaras()` + `extenderRespaldo`, las secciones puras de capas.js — no
 * una copia de las fórmulas) y exige:
 *   1. REPOSO: el compuesto devuelve la lámina aprobada EXACTA (0 huecos,
 *      0 déficits de alfa) y NO se sale de la silueta (0 exceso).
 *   2. GIRO de alas ±2.5° (la amplitud máxima del CSS): 0 cracks en el
 *      interior profundo de la silueta — el respaldo de viaje funciona.
 *
 * Definiciones (siempre al lado del número, nunca un eslogan):
 *   - visible: píxel de la lámina original con alfa > 0.
 *   - hueco: alfa compuesto (over, float) exactamente 0.
 *   - déficit: (alfaOriginal − alfaCompuesto)·255 > 0,5 — la métrica del
 *     informe del lote: las restas blandas (1−m) sobre capas de abajo
 *     dejaban bandas pálidas; el `hard` de mascaras() las elimina.
 *   - exceso: alfa compuesto > 0,5/255 donde la lámina es transparente.
 *   - crack: tras rotar un ala, píxel sólido (alfa ≥ 250) que quedó con
 *     compuesto < 128 y NO está a ≤12px del fondo transparente (esa banda
 *     es el barrido natural del borde libre del ala, silueta que cambia
 *     porque el ala de verdad se movió).
 *
 * Cada medidor se prueba CONTRA el bug que dice cubrir (regla de la casa:
 * un medidor que da lo mismo antes y después no midió nada): control
 * positivo (lámina contra sí misma = cero absoluto), control negativo de
 * reposo (sin la capa alaIzq el déficit reaparece masivo) y control
 * negativo de giro (sin `extenderRespaldo`, el giro abre cracks).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { mascaras, extenderRespaldo } from '../capas.js';
import { ALA_IZQ, ALA_DER } from '../anatomia.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const laminaFile = path.join(raiz, 'public', 'compai', 'laminas', 'luciernaga.png');

// Las capas que se PINTAN (mismo juego que hornearLuciernaga). El orden no
// afecta las métricas de alfa (el over en alfa es conmutativo).
const PINTADAS = ['mAlaIzq', 'mAlaDer', 'mCuerpo', 'mLinterna', 'mManoLapiz', 'mAntenaIzq', 'mAntenaDer', 'mMandibula'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

let W; let H; let sd; let capas; let alasSinRespaldo;

beforeAll(async () => {
  const { data, info } = await sharp(laminaFile).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  W = info.width;
  H = info.height;
  sd = data;

  const defs = mascaras();
  capas = {};
  for (const nombre of PINTADAS) {
    expect(typeof defs[nombre]).toBe('function');
    // capa RGBA como la pinta el navegador (el color da igual para las
    // métricas de alfa; extenderRespaldo necesita el buffer RGBA real).
    const d = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const a = sd[i + 3];
        if (!a) continue;
        const ma = a * clamp(defs[nombre](x, y), 0, 1);
        if (ma < 0.5) continue;
        d[i + 3] = ma;
      }
    }
    capas[nombre] = d;
  }
  // respaldo de viaje de las alas — LA MISMA función que corre el navegador.
  alasSinRespaldo = { mAlaIzq: Uint8ClampedArray.from(capas.mAlaIzq), mAlaDer: Uint8ClampedArray.from(capas.mAlaDer) };
  extenderRespaldo(capas.mAlaIzq, sd, W, H);
  extenderRespaldo(capas.mAlaDer, sd, W, H);
});

/** Compuesto over solo-alfa (conmutativo) y métricas contra la lámina. */
function medir(juego) {
  let visible = 0; let huecos = 0; let deficit = 0; let exceso = 0; let maxDeficit255 = 0;
  const buffers = Object.values(juego);
  for (let p = 0; p < W * H; p++) {
    const a = sd[p * 4 + 3] / 255;
    let over = 0;
    for (const capa of buffers) {
      const aS = capa[p * 4 + 3] / 255;
      over = aS + over * (1 - aS);
    }
    if (a <= 0) {
      if (over * 255 > 0.5) exceso += 1;
      continue;
    }
    visible += 1;
    if (over === 0) huecos += 1;
    const d255 = (a - over) * 255;
    if (d255 > 0.5) deficit += 1;
    if (d255 > maxDeficit255) maxDeficit255 = d255;
  }
  return { visible, huecos, deficit, exceso, maxDeficit255 };
}

describe('recomposición del kit C4 contra la lámina aprobada (reposo)', () => {
  it('0 huecos, 0 déficits (>0,5/255) y 0 exceso fuera de silueta sobre los ~78k píxeles visibles', () => {
    const m = medir(capas);
    expect(m.visible).toBeGreaterThan(70000);
    expect(m.huecos).toBe(0);
    expect(m.deficit).toBe(0);
    expect(m.maxDeficit255).toBeLessThanOrEqual(0.5);
    expect(m.exceso).toBe(0);
  });

  it('control POSITIVO del medidor: la lámina contra sí misma da cero absoluto', () => {
    const yo = new Uint8ClampedArray(sd.length);
    for (let p = 0; p < W * H; p++) yo[p * 4 + 3] = sd[p * 4 + 3];
    const m = medir({ yo });
    expect(m.huecos).toBe(0);
    expect(m.deficit).toBe(0);
    expect(m.exceso).toBe(0);
  });

  it('control NEGATIVO del medidor: sin la capa alaIzq el déficit es masivo (el medidor distingue roto de sano)', () => {
    const { mAlaIzq: _fuera, ...sinAla } = capas;
    const m = medir(sinAla);
    expect(m.deficit).toBeGreaterThan(1000);
  });
});

/* ── GIRO: el candado del respaldo de viaje ── */

function rotar(buf, piv, grados) {
  const out = new Uint8ClampedArray(W * H * 4);
  const th = (grados * Math.PI) / 180;
  const c = Math.cos(th); const s = Math.sin(th);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - piv[0]; const dy = y - piv[1];
      const sx = Math.round(piv[0] + dx * c + dy * s);
      const sy = Math.round(piv[1] - dx * s + dy * c);
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
      const i = (y * W + x) * 4; const j = (sy * W + sx) * 4;
      out[i + 3] = buf[j + 3];
    }
  }
  return out;
}

/** banda "cerca del borde libre" (≤12px del fondo): barrido natural, no crack. */
function bandaLibre() {
  const libre = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) if (sd[p * 4 + 3] < 10) libre[p] = 1;
  for (let k = 0; k < 12; k++) {
    const prev = Uint8Array.from(libre);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const p = y * W + x;
        if (!prev[p] && (prev[p - 1] || prev[p + 1] || prev[p - W] || prev[p + W])) libre[p] = 1;
      }
    }
  }
  return libre;
}

function cracksDeGiro(juego, capa, piv, grados, libre) {
  const girado = { ...juego, [capa]: rotar(juego[capa], piv, grados) };
  const buffers = Object.values(girado);
  let cracks = 0;
  for (let p = 0; p < W * H; p++) {
    if (sd[p * 4 + 3] < 250 || libre[p]) continue;
    let over = 0;
    for (const b of buffers) {
      const aS = b[p * 4 + 3] / 255;
      over = aS + over * (1 - aS);
    }
    if (over * 255 < 128) cracks += 1;
  }
  return cracks;
}

describe('giro de alas ±2.5° — el respaldo de viaje no abre fondo', () => {
  it('0 cracks interiores en las cuatro direcciones', () => {
    const libre = bandaLibre();
    for (const [capa, piv] of [['mAlaIzq', ALA_IZQ.pivote], ['mAlaDer', ALA_DER.pivote]]) {
      for (const g of [-2.5, 2.5]) {
        expect(cracksDeGiro(capas, capa, piv, g, libre), `${capa} ${g}°`).toBe(0);
      }
    }
  });

  it('control NEGATIVO: sin extenderRespaldo el giro abre cracks (el medidor distingue)', () => {
    const libre = bandaLibre();
    const sinRespaldo = { ...capas, ...alasSinRespaldo };
    let total = 0;
    for (const [capa, piv] of [['mAlaIzq', ALA_IZQ.pivote], ['mAlaDer', ALA_DER.pivote]]) {
      for (const g of [-2.5, 2.5]) total += cracksDeGiro(sinRespaldo, capa, piv, g, libre);
    }
    expect(total).toBeGreaterThan(100);
  });
});
