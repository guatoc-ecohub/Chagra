/**
 * recomposicion.test.js — el CANDADO de costuras de la zarigüeya: recompone
 * las capas del kit con la MISMA matemática que hornea el navegador
 * (`mascaras()`, la sección pura de capas.js — no una copia de las fórmulas,
 * más la réplica del inpaint del pecho con la fórmula de `hornearZariguya`)
 * y exige que el compuesto devuelva la lámina aprobada EXACTA.
 *
 * Definiciones (siempre al lado del número, nunca un eslogan):
 *   - visible: píxel de la lámina original con alfa > 0.
 *   - hueco: alfa compuesto (over, float) exactamente 0.
 *   - déficit: (alfaOriginal − alfaCompuesto)·255 > 0,5 — la métrica del
 *     informe del lote (ops/INFORME-LOTE-LAMINA-ALCANCE-Y-CLAIM.md), que
 *     midió en este kit 1.159 déficits (1,368%) con máx 4,5/255: el residuo
 *     de la rampa de las restas duras cuando el umbral era 0,93.
 *
 * El candado se prueba CONTRA el bug que dice cubrir (regla de la casa: un
 * medidor que da lo mismo antes y después no midió nada): el control
 * negativo quita la capa cabeza y exige déficit masivo; el positivo compone
 * la lámina contra sí misma y exige cero absoluto.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { mascaras, mascaraBrazoBrujula } from '../capas.js';
import { INPAINT_PECHO } from '../anatomia.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const laminaFile = path.join(raiz, 'public', 'compai', 'laminas', 'zariguya.png');

/** Orden de apilado del runtime (ZariguyaLaminaViva): cola al fondo,
 *  orejas al frente. En alfa el over es conmutativo, pero el candado usa el
 *  orden real para que también valga como documentación. */
const ORDEN = [
  'mCola', 'mCuerpo', 'mBrazoBrujula', 'mBrazoLapiz',
  'mCabezaRender', 'mMandibula', 'mOrejaIzq', 'mOrejaDer',
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

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

let lamina; let W; let H; let capas;

beforeAll(async () => {
  const { data, info } = await sharp(laminaFile).raw().ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  W = info.width; H = info.height;
  lamina = new Float32Array(W * H);
  for (let p = 0; p < lamina.length; p++) lamina[p] = data[p * 4 + 3] / 255;

  const defs = mascaras();
  capas = {};
  for (const nombre of ORDEN) {
    const alfa = new Float32Array(W * H);
    const mask = defs[nombre];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (lamina[p] > 0) alfa[p] = lamina[p] * clamp(mask(x, y), 0, 1);
      }
    }
    capas[nombre] = alfa;
  }

  // Réplica del INPAINT del pecho — la MISMA fórmula de `hornearZariguya`
  // (capas.js): donde el brazo de la brújula pasa el umbral, el clon del
  // vientre (offset +dx,+dy) entra POR DEBAJO del cuerpo con entrada suave.
  const { x0, x1, y0, y1, dx, dy, umbral } = INPAINT_PECHO;
  const body = capas.mCuerpo;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const m = mascaraBrazoBrujula(x, y);
      if (m <= umbral) continue;
      const sx = clamp(x + dx, 0, W - 1);
      const sy = clamp(y + dy, 0, H - 1);
      const cA = lamina[sy * W + sx] * ss(umbral, umbral + 0.25, m);
      const p = y * W + x;
      body[p] = body[p] + cA * (1 - body[p]);
    }
  }
});

describe('recomposición del kit contra la lámina aprobada', () => {
  it('0 huecos (alfa compuesto == 0) y 0 déficits (alfaOriginal − alfaCompuesto > 0,5/255) sobre los ~84k píxeles visibles', () => {
    const m = medir(lamina, capas);
    expect(m.visible).toBeGreaterThan(80000);
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

  it('control NEGATIVO del medidor: sin la capa mCabezaRender el déficit es masivo (el medidor distingue roto de sano)', () => {
    const { mCabezaRender: _fuera, ...sinCabeza } = capas;
    const m = medir(lamina, sinCabeza);
    expect(m.deficit).toBeGreaterThan(1000);
  });
});
