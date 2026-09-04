/**
 * capas.test.js — el motor de recorte por alfa (`hornearLuciernaga`). jsdom
 * no trae Canvas2D real, así que estas pruebas cubren lo que SÍ es
 * observable sin GPU/browser: la detección de soporte, la degradación
 * defensiva (nunca truena) y que las constantes de anatomía tengan la forma
 * que `capas.js` espera — incluidos los CANDADOS de las fugas que se
 * encontraron y cerraron en la revisión offline (`_gate/luciernaga-lamina/`,
 * no versionado): la punta de la antena derecha fuera de caja, la mano sin
 * techo que reclamaba la antena, y la linterna mordiendo la bota. La
 * verificación píxel a píxel (recomposición aditiva 0.000% de huecos) se
 * hizo offline con `sharp` — ver el informe de la rama.
 */
import { describe, it, expect } from 'vitest';
import { hornearLuciernaga, haySoporteCanvas } from '../capas.js';
import {
  ANCHO, ALTO, CABEZA, OJO, OJO_2, MANDIBULA, BOCA,
  ANTENA_IZQ, ANTENA_DER, MANO_LAPIZ,
  LINTERNA, PIERNA_IZQ, PIERNA_DER, CUERPO_PIVOTE,
} from '../anatomia.js';

describe('haySoporteCanvas', () => {
  it('devuelve un booleano y no truena aunque jsdom no traiga canvas real', () => {
    expect(typeof haySoporteCanvas()).toBe('boolean');
  });
});

describe('hornearLuciernaga — degradación defensiva', () => {
  it('sin canvas.getContext(\'2d\') real, devuelve null (nunca truena)', () => {
    /** @type {HTMLImageElement} */
    const imgFalsa = /** @type {any} */ ({ naturalWidth: ANCHO, naturalHeight: ALTO });
    const resultado = hornearLuciernaga(imgFalsa, { ancho: ANCHO, altoPx: ALTO });
    expect(resultado === null || typeof resultado === 'object').toBe(true);
    if (!haySoporteCanvas()) expect(resultado).toBeNull();
  });

  it('sin dimensiones (imagen no cargada) devuelve null, no revienta', () => {
    const imgSinCargar = /** @type {any} */ ({ naturalWidth: 0, naturalHeight: 0 });
    expect(hornearLuciernaga(imgSinCargar, {})).toBeNull();
  });
});

describe('anatomia.js — forma de las constantes que capas.js consume', () => {
  it('ANCHO/ALTO coinciden con luciernaga.png (367x507, header PNG verificado)', () => {
    expect(ANCHO).toBe(367);
    expect(ALTO).toBe(507);
  });

  it('CABEZA: banda de cuello válida + caja de testa + pivote — la cara viaja ENTERA en la pieza', () => {
    expect(CABEZA.cuello.y1).toBeGreaterThan(CABEZA.cuello.y0);
    expect(CABEZA.box.x1).toBeGreaterThan(CABEZA.box.x0);
    expect(CABEZA.pivote).toHaveLength(2);
    // los dos ojos y la boca caen DENTRO de la caja de la cabeza y ARRIBA del
    // cuello: si esto se rompe, algún corte cruzó la cara (regla dura).
    for (const ojo of [OJO, OJO_2]) {
      expect(ojo.cx).toBeGreaterThan(CABEZA.box.x0);
      expect(ojo.cx).toBeLessThan(CABEZA.box.x1);
      expect(ojo.cy).toBeLessThan(CABEZA.cuello.y0);
    }
    expect(BOCA.cy).toBeLessThan(CABEZA.cuello.y0);
  });

  it('OJO y OJO_2 son puntos distintos dentro del canvas (parpadeo real de DOS ojos, no guiño)', () => {
    for (const ojo of [OJO, OJO_2]) {
      expect(ojo.cx).toBeGreaterThan(0);
      expect(ojo.cx).toBeLessThan(ANCHO);
      expect(ojo.cy).toBeGreaterThan(0);
      expect(ojo.cy).toBeLessThan(ALTO);
      expect(ojo.r).toBeGreaterThan(0);
    }
    expect(OJO.cx).not.toBeCloseTo(OJO_2.cx, 0);
  });

  it('la mandíbula abre ENTRE el labio (bajo la sonrisa) y el fin del mentón — la sonrisa queda en la cabeza', () => {
    expect(MANDIBULA.labio.y1).toBeGreaterThan(MANDIBULA.labio.y0);
    expect(MANDIBULA.menton.y1).toBeGreaterThan(MANDIBULA.menton.y0);
    expect(MANDIBULA.menton.y0).toBeGreaterThan(MANDIBULA.labio.y1);
    // los OJOS quedan por encima del arranque del labio: el corte de habla
    // jamás toca la mitad alta de la cara.
    expect(MANDIBULA.labio.y0).toBeGreaterThan(OJO.cy + OJO.r);
    expect(MANDIBULA.pivote).toHaveLength(2);
  });

  it('las DOS antenas: cajas disjuntas, base y baseSub (anti-hueco) válidas, pivote en la base', () => {
    for (const antena of [ANTENA_IZQ, ANTENA_DER]) {
      expect(antena.box.x1).toBeGreaterThan(antena.box.x0);
      expect(antena.box.xFade).toBeGreaterThan(0);
      expect(antena.base.y1).toBeGreaterThan(antena.base.y0);
      // el respaldo anti-hueco corta MÁS ARRIBA que la base de la pieza.
      expect(antena.baseSub.y1).toBeLessThanOrEqual(antena.base.y0);
      expect(antena.pivote).toHaveLength(2);
      expect(antena.pivote[0]).toBeGreaterThanOrEqual(antena.box.x0);
      expect(antena.pivote[0]).toBeLessThanOrEqual(antena.box.x1);
    }
    expect(ANTENA_DER.box.x0).toBeGreaterThan(ANTENA_IZQ.box.x1);
    // CANDADO (fuga cerrada): la punta de la antena derecha llega a x≈356 —
    // la caja debe abrir hasta el borde o la punta se queda en el cuerpo.
    expect(ANTENA_DER.box.x1).toBeGreaterThanOrEqual(360);
  });

  it('MANO_LAPIZ: techo + muñeca acotan la pieza (candados de las fugas cerradas)', () => {
    // CANDADO: sin `techo`, la caja reclamaba el arco de la antena izquierda
    // que pasa por arriba (píxel duplicado que rotaría con la mano).
    expect(MANO_LAPIZ.techo.y1).toBeGreaterThan(MANO_LAPIZ.techo.y0);
    expect(MANO_LAPIZ.techo.y1).toBeGreaterThan(ANTENA_IZQ.base.y1);
    expect(MANO_LAPIZ.muneca.y1).toBeGreaterThan(MANO_LAPIZ.muneca.y0);
    expect(MANO_LAPIZ.muneca.y0).toBeGreaterThan(MANO_LAPIZ.techo.y1);
    // CANDADO: la punta del lápiz llega a x≈2 — sin fade al borde izquierdo.
    expect(MANO_LAPIZ.box.x0 + MANO_LAPIZ.box.xFade).toBeLessThanOrEqual(0);
    // el pivote (la muñeca) cae dentro de la caja, en la banda de la muñeca.
    expect(MANO_LAPIZ.pivote[0]).toBeGreaterThanOrEqual(MANO_LAPIZ.box.x0);
    expect(MANO_LAPIZ.pivote[0]).toBeLessThanOrEqual(MANO_LAPIZ.box.x1);
  });

  it('LINTERNA: elipse dentro del canvas; las bandas de pierna llegan hasta el puño de la bota', () => {
    expect(LINTERNA.cx - LINTERNA.rx).toBeGreaterThan(0);
    expect(LINTERNA.cx + LINTERNA.rx).toBeLessThan(ANCHO);
    expect(LINTERNA.cy + LINTERNA.ry).toBeLessThan(ALTO);
    for (const pierna of [PIERNA_IZQ, PIERNA_DER]) {
      expect(pierna.y1).toBeGreaterThan(pierna.y0);
      expect(pierna.medio).toBeGreaterThan(0);
      // CANDADO (fuga cerrada): con el segmento corto la elipse medio-
      // reclamaba el puño de la bota y el latido lo hacía pulsar.
      expect(pierna.y1).toBeGreaterThanOrEqual(450);
    }
  });

  it('los pivotes son puntos [x,y] dentro del lienzo', () => {
    for (const piv of [CABEZA.pivote, MANDIBULA.pivote, ANTENA_IZQ.pivote, ANTENA_DER.pivote, MANO_LAPIZ.pivote, CUERPO_PIVOTE]) {
      const [x, y] = piv;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(ANCHO);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(ALTO);
    }
  });

  it('BOCA (interior sintético) es un punto con ancho, dentro del canvas', () => {
    expect(BOCA.cx).toBeGreaterThan(0);
    expect(BOCA.cx).toBeLessThan(ANCHO);
    expect(BOCA.cy).toBeGreaterThan(0);
    expect(BOCA.cy).toBeLessThan(ALTO);
    expect(BOCA.ancho).toBeGreaterThan(0);
  });
});
