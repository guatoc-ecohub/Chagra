/**
 * recomposicion.test.js — el CANDADO de costuras del jaguar: recompone las
 * capas del rig con la MISMA matemática que pinta el navegador
 * (`capasIdeales`, la sección pura de capas.js — no una copia de las
 * fórmulas) y exige que el compuesto devuelva la lámina aprobada EXACTA.
 *
 * Definiciones (siempre al lado del número, nunca un eslogan):
 *   - visible: píxel de la lámina original con alfa > 0.
 *   - hueco: alfa compuesto (over, float) exactamente 0.
 *   - déficit: (alfaOriginal − alfaCompuesto)·255 > 0,5 — la métrica del
 *     informe del lote (ops/INFORME-LOTE-LAMINA-ALCANCE-Y-CLAIM.md), que
 *     midió 5.137 déficits (3,716%) y 435 huecos (0,315%) en este rig:
 *     las bandas de crossfade que se VEÍAN cruzando torso y anca.
 *
 * El candado se prueba CONTRA el bug que dice cubrir (regla de la casa: un
 * medidor que da lo mismo antes y después no midió nada): el control
 * negativo quita el respaldo de costuras y exige que el déficit REAPAREZCA;
 * el positivo compone la lámina contra sí misma y exige cero absoluto.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { capasIdeales } from '../capas.js';

// Masa (suma de alfas) del respaldo medida al introducir el arreglo
// (2026-08-18): 65.030 sobre 66.083 píxeles — bandas de articulación +
// relleno de las fronteras horneadas. El tope es esa masa +15%: si una
// máscara regresa y abre costuras nuevas, el respaldo las taparía EN
// SILENCIO creciendo — este tope lo delata.
const MASA_RESPALDO_MAX = 65030 * 1.15;

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const laminas = path.join(raiz, 'public', 'compai', 'laminas');

const alfaDe = async (file) => {
  const { data, info } = await sharp(file).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const alfa = new Float32Array(info.width * info.height);
  for (let p = 0; p < alfa.length; p++) alfa[p] = data[p * 4 + 3] / 255;
  return { alfa, W: info.width, H: info.height };
};

/** Compuesto over (conmutativo en alfa) y métricas contra la lámina.
 *  Además del déficit (alfa que FALTA), mide el dual que se nos escapó en la
 *  primera versión del candado: el EXCESO (alfa que SOBRA) —
 *   - fuera: píxel compuesto > 0 donde la lámina NO tiene píxel (silueta
 *     desbordada: la franja de piel sintética bajo el vientre venía de aquí).
 *   - exceso20: (alfaCompuesto − alfaOriginal)·255 > 20 dentro de la silueta
 *     (doblado de alfa en píxeles semitransparentes bajo solapes de piezas). */
function medir(original, capas) {
  let visible = 0; let huecos = 0; let deficit = 0; let maxDeficit255 = 0;
  let fuera = 0; let exceso20 = 0;
  const alfas = Object.values(capas).map((c) => c.alfa || c);
  for (let p = 0; p < original.length; p++) {
    const a = original[p];
    let over = 0;
    for (const capa of alfas) over = capa[p] + over * (1 - capa[p]);
    if (a <= 0) {
      if (over > 0) fuera += 1;
      continue;
    }
    visible += 1;
    if (over === 0) huecos += 1;
    const d255 = (a - over) * 255;
    if (d255 > 0.5) deficit += 1;
    if (d255 > maxDeficit255) maxDeficit255 = d255;
    if (-d255 > 20) exceso20 += 1;
  }
  return { visible, huecos, deficit, maxDeficit255, fuera, exceso20 };
}

let fuentes; let W; let H; let ideales;

beforeAll(async () => {
  const lamina = await alfaDe(path.join(laminas, 'jaguar-natural.png'));
  W = lamina.W; H = lamina.H;
  fuentes = { lamina: lamina.alfa };
  for (const [clave, file] of Object.entries({
    cuerpo: 'cuerpo-inpaint.png',
    delLejana: 'pata-del-lejana.png',
    trasCercana: 'pata-tras-cercana.png',
    trasLejana: 'pata-tras-lejana.png',
  })) {
    const png = await alfaDe(path.join(laminas, 'jaguar-rig', file));
    expect(png.W).toBe(W);
    expect(png.H).toBe(H);
    fuentes[clave] = png.alfa;
  }
  ideales = capasIdeales(fuentes, W, H);
});

describe('recomposición del rig contra la lámina aprobada', () => {
  it('0 huecos (alfa compuesto == 0) y 0 déficits (alfaOriginal − alfaCompuesto > 0,5/255) sobre los ~138k píxeles visibles', () => {
    const m = medir(fuentes.lamina, ideales);
    expect(m.visible).toBeGreaterThan(100000);
    expect(m.huecos).toBe(0);
    expect(m.deficit).toBe(0);
    expect(m.maxDeficit255).toBeLessThanOrEqual(0.5);
  });

  it('control POSITIVO del medidor: la lámina contra sí misma da cero absoluto', () => {
    const m = medir(fuentes.lamina, { self: fuentes.lamina });
    expect(m.huecos).toBe(0);
    expect(m.deficit).toBe(0);
    expect(m.maxDeficit255).toBe(0);
  });

  it('control NEGATIVO del medidor: sin la capa cabeza el déficit es masivo (el medidor distingue roto de sano)', () => {
    const { cabeza: _fuera, ...sinCabeza } = ideales;
    const m = medir(fuentes.lamina, sinCabeza);
    expect(m.deficit).toBeGreaterThan(1000);
  });

  it('control NEGATIVO del arreglo: sin el respaldo de costuras REAPARECEN los huecos (435) y el déficit de las bandas de crossfade', () => {
    const { respaldo: _fuera, ...sinRespaldo } = ideales;
    const m = medir(fuentes.lamina, sinRespaldo);
    expect(m.huecos).toBeGreaterThan(400);
    expect(m.deficit).toBeGreaterThan(2000);
  });

  it('0 píxeles de compuesto FUERA de la silueta y exceso interior acotado (el dual del déficit: piel que sobra, no que falta)', () => {
    const m = medir(fuentes.lamina, ideales);
    // El recorte a silueta garantiza cero absoluto fuera del contorno.
    expect(m.fuera).toBe(0);
    // Dentro de la silueta queda el doblado de alfa sobre píxeles
    // semitransparentes bajo solapes deliberados (rodilla, bases de oreja):
    // 769 px medidos al introducir el recorte, filamentos de 1px pegados a
    // contornos que el arte ya dibuja oscuros. Tope = medido + 15%.
    expect(m.exceso20).toBeLessThan(769 * 1.15);
  });

  it('control NEGATIVO del recorte: con el cuerpo-inpaint SIN recortar reaparece la piel sintética bajo el vientre (4.721 px fuera de silueta)', () => {
    const conCuerpoCrudo = { ...ideales, cuerpo: { alfa: fuentes.cuerpo, fuente: 'cuerpo' } };
    const m = medir(fuentes.lamina, conCuerpoCrudo);
    expect(m.fuera).toBeGreaterThan(4000);
  });

  it('anti-deriva: la masa del respaldo queda acotada (si una máscara regresa y abre costuras nuevas, el respaldo crecería en silencio — esto lo delata)', () => {
    let masa = 0;
    const { alfa } = ideales.respaldo;
    for (let p = 0; p < alfa.length; p++) masa += alfa[p];
    // masa medida al introducir el respaldo: ~asegurada con +15% de colchón.
    expect(masa).toBeGreaterThan(0);
    expect(masa).toBeLessThan(MASA_RESPALDO_MAX);
  });
});
