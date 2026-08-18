/**
 * recomposicion.test.js — el CANDADO de costuras de la luciérnaga: recompone
 * las capas del kit con la MISMA matemática que pinta el navegador
 * (`mascaras()`, la sección pura de capas.js — no una copia de las fórmulas)
 * y exige que el compuesto devuelva la lámina aprobada EXACTA.
 *
 * Definiciones (siempre al lado del número, nunca un eslogan):
 *   - visible: píxel de la lámina original con alfa > 0.
 *   - hueco: alfa compuesto (over, float) exactamente 0.
 *   - déficit: (alfaOriginal − alfaCompuesto)·255 > 0,5 — la métrica del
 *     informe del lote (ops/INFORME-LOTE-LAMINA-ALCANCE-Y-CLAIM.md), que
 *     midió 1.778 déficits (2,278%, máx 63,75/255) en este kit: las restas
 *     blandas (1−m) sobre capas de abajo — flancos `baseSub` de las
 *     antenas, mandíbula sobre cabeza, cabeza sobre la mano del lápiz.
 *
 * El candado se prueba CONTRA el bug que dice cubrir (regla de la casa: un
 * medidor que da lo mismo antes y después no midió nada): el control
 * negativo quita la capa cabeza y exige que el déficit REAPAREZCA masivo;
 * el positivo compone la lámina contra sí misma y exige cero absoluto.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { mascaras } from '../capas.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const laminaFile = path.join(raiz, 'public', 'compai', 'laminas', 'luciernaga.png');

// Las capas que se PINTAN (mismo juego que hornearLuciernaga y que el
// medidor offline del lote): mCabezaFull es auxiliar, no se pinta.
const PINTADAS = ['mCuerpo', 'mCabezaRender', 'mMandibula', 'mAntenaIzq', 'mAntenaDer', 'mManoLapiz', 'mLinterna'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Compuesto over (conmutativo en alfa) y métricas contra la lámina. */
function medir(original, capas) {
  let visible = 0; let huecos = 0; let deficit = 0; let maxDeficit255 = 0;
  const alfas = Object.values(capas);
  for (let p = 0; p < original.length; p++) {
    const a = original[p];
    if (a <= 0) continue;
    visible += 1;
    let over = 0;
    for (const capa of alfas) over = capa[p] + over * (1 - capa[p]);
    if (over === 0) huecos += 1;
    const d255 = (a - over) * 255;
    if (d255 > 0.5) deficit += 1;
    if (d255 > maxDeficit255) maxDeficit255 = d255;
  }
  return { visible, huecos, deficit, maxDeficit255 };
}

let lamina; let capas;

beforeAll(async () => {
  const { data, info } = await sharp(laminaFile).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  lamina = new Float32Array(W * H);
  for (let p = 0; p < lamina.length; p++) lamina[p] = data[p * 4 + 3] / 255;

  const defs = mascaras();
  capas = {};
  for (const nombre of PINTADAS) {
    expect(typeof defs[nombre]).toBe('function');
    const alfa = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (lamina[p] > 0) alfa[p] = lamina[p] * clamp(defs[nombre](x, y), 0, 1);
      }
    }
    capas[nombre] = alfa;
  }
});

describe('recomposición del kit contra la lámina aprobada', () => {
  it('0 huecos (alfa compuesto == 0) y 0 déficits (alfaOriginal − alfaCompuesto > 0,5/255) sobre los ~78k píxeles visibles', () => {
    const m = medir(lamina, capas);
    expect(m.visible).toBeGreaterThan(70000);
    expect(m.huecos).toBe(0);
    expect(m.deficit).toBe(0);
    expect(m.maxDeficit255).toBeLessThanOrEqual(0.5);
  });

  it('control POSITIVO del medidor: la lámina contra sí misma da cero absoluto', () => {
    const m = medir(lamina, { self: lamina });
    expect(m.huecos).toBe(0);
    expect(m.deficit).toBe(0);
    expect(m.maxDeficit255).toBe(0);
  });

  it('control NEGATIVO del medidor: sin la capa cabeza el déficit es masivo (el medidor distingue roto de sano)', () => {
    const { mCabezaRender: _fuera, ...sinCabeza } = capas;
    const m = medir(lamina, sinCabeza);
    expect(m.deficit).toBeGreaterThan(500);
  });
});
