/**
 * capas.test.js — el motor de recorte por alfa (`hornearChivito`). jsdom
 * no trae Canvas2D real, así que estas pruebas cubren lo que SÍ es
 * observable sin GPU/browser: la detección de soporte, la degradación
 * defensiva (nunca truena) y que las constantes de anatomía tengan la forma
 * que `capas.js` espera — incluidos los CANDADOS de la regla dura (la cara
 * viaja ENTERA, la cresta NO se recorta de la cabeza) y de la fuga que se
 * encontró y cerró en la revisión offline (`_gate/chivito-punk-lamina/`, no
 * versionado): el tajado del lápiz cruzando la banda de muñeca horizontal.
 * La verificación píxel a píxel (recomposición aditiva 0.000% de huecos) se
 * hizo offline con `sharp` — ver el informe de la rama.
 */
import { describe, it, expect } from 'vitest';
import { hornearChivito, haySoporteCanvas } from '../capas.js';
import {
  ANCHO, ALTO, CABEZA, OJO, OJO_2, MANDIBULA, BOCA,
  MANO_LAPIZ, CUERPO_PIVOTE,
} from '../anatomia.js';

describe('haySoporteCanvas', () => {
  it('devuelve un booleano y no truena aunque jsdom no traiga canvas real', () => {
    expect(typeof haySoporteCanvas()).toBe('boolean');
  });
});

describe('hornearChivito — degradación defensiva', () => {
  it('sin canvas.getContext(\'2d\') real, devuelve null (nunca truena)', () => {
    /** @type {HTMLImageElement} */
    const imgFalsa = /** @type {any} */ ({ naturalWidth: ANCHO, naturalHeight: ALTO });
    const resultado = hornearChivito(imgFalsa, { ancho: ANCHO, altoPx: ALTO });
    expect(resultado === null || typeof resultado === 'object').toBe(true);
    if (!haySoporteCanvas()) expect(resultado).toBeNull();
  });

  it('sin dimensiones (imagen no cargada) devuelve null, no revienta', () => {
    const imgSinCargar = /** @type {any} */ ({ naturalWidth: 0, naturalHeight: 0 });
    expect(hornearChivito(imgSinCargar, {})).toBeNull();
  });
});

describe('anatomia.js — forma de las constantes que capas.js consume', () => {
  it('ANCHO/ALTO coinciden con chivito-punk.png (397x654, header PNG verificado)', () => {
    expect(ANCHO).toBe(397);
    expect(ALTO).toBe(654);
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

  it('CANDADO cresta: la caja de la cabeza abarca la cresta punk COMPLETA (x≈97..310, y desde 3) — la cresta no se recorta ni se aplana', () => {
    // La púa más a la izquierda arranca en x≈97 y el rizo más externo remata
    // en x≈310 (medidos en `zoom-cresta` sobre la grilla). Si la caja
    // encoge, una púa se queda en el cuerpo y el headbang la decapita.
    expect(CABEZA.box.x0 + CABEZA.box.xFade).toBeLessThanOrEqual(97);
    expect(CABEZA.box.x1 - CABEZA.box.xFade).toBeGreaterThanOrEqual(310);
    // La banda del cuello es el ÚNICO límite superior→inferior de la pieza:
    // no existe ninguna banda que corte la cresta de la testa.
    expect(CABEZA.cuello.y0).toBeGreaterThan(165); // la cresta remata en y≈165
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

  it('la mandíbula abre ENTRE el labio (bajo la línea de la boca) y el fin del mentón — la línea queda en la cabeza', () => {
    expect(MANDIBULA.labio.y1).toBeGreaterThan(MANDIBULA.labio.y0);
    expect(MANDIBULA.menton.y1).toBeGreaterThan(MANDIBULA.menton.y0);
    expect(MANDIBULA.menton.y0).toBeGreaterThan(MANDIBULA.labio.y1);
    // los OJOS quedan por encima del arranque del labio: el corte de habla
    // jamás toca la mitad alta de la cara.
    expect(MANDIBULA.labio.y0).toBeGreaterThan(OJO.cy + OJO.r);
    expect(MANDIBULA.labio.y0).toBeGreaterThan(OJO_2.cy + OJO_2.r);
    // el mentón barbado termina su fade ANTES de que arranque el del cuello
    // (la mandíbula es un corte DENTRO de la cabeza, nunca la desborda).
    expect(MANDIBULA.menton.y1).toBeLessThanOrEqual(CABEZA.cuello.y0);
    expect(MANDIBULA.pivote).toHaveLength(2);
    // el pivote es la COMISURA (el pico abre en tijera desde ahí): cae en el
    // borde derecho de la caja, a la altura de la línea de la boca.
    expect(MANDIBULA.pivote[0]).toBeGreaterThan(MANDIBULA.box.x1 - 2 * MANDIBULA.box.xFade);
    expect(MANDIBULA.pivote[0]).toBeLessThanOrEqual(MANDIBULA.box.x1);
  });

  it('MANO_LAPIZ: techo + muñeca inclinada acotan la pieza (candados de las fugas cerradas)', () => {
    expect(MANO_LAPIZ.techo.y1).toBeGreaterThan(MANO_LAPIZ.techo.y0);
    // CANDADO: la punta del lápiz llega a x≈6 — sin fade al borde izquierdo.
    expect(MANO_LAPIZ.box.x0 + MANO_LAPIZ.box.xFade).toBeLessThanOrEqual(0);
    // CANDADO (fuga cerrada): el TAJADO del lápiz (x≈5-15) baja hasta y≈358.
    // La banda de muñeca es INCLINADA: en el borde izquierdo (x=0) su
    // arranque y0+caidaIzq debe pasar POR DEBAJO del tajado, o el puntazo
    // queda medio en el cuerpo (fantasma doble al gesticular).
    expect(MANO_LAPIZ.muneca.y0 + MANO_LAPIZ.muneca.caidaIzq).toBeGreaterThanOrEqual(358);
    // …y en el lado del brazo (x=x1) arranca DEBAJO de la mano-garra
    // (los nudillos rematan en y≈345, medido en `zoom-mano-lapiz`).
    expect(MANO_LAPIZ.muneca.y0).toBeGreaterThanOrEqual(345);
    expect(MANO_LAPIZ.muneca.alto).toBeGreaterThan(0);
    expect(MANO_LAPIZ.muneca.caidaIzq).toBeGreaterThanOrEqual(0);
    // el pivote (la muñeca) cae dentro de la caja.
    expect(MANO_LAPIZ.pivote[0]).toBeGreaterThanOrEqual(MANO_LAPIZ.box.x0);
    expect(MANO_LAPIZ.pivote[0]).toBeLessThanOrEqual(MANO_LAPIZ.box.x1);
  });

  it('los pivotes son puntos [x,y] dentro del lienzo', () => {
    for (const piv of [CABEZA.pivote, MANDIBULA.pivote, MANO_LAPIZ.pivote, CUERPO_PIVOTE]) {
      const [x, y] = piv;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(ANCHO);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(ALTO);
    }
  });

  it('BOCA (interior sintético) es un punto con ancho y alto, dentro del canvas', () => {
    expect(BOCA.cx).toBeGreaterThan(0);
    expect(BOCA.cx).toBeLessThan(ANCHO);
    expect(BOCA.cy).toBeGreaterThan(0);
    expect(BOCA.cy).toBeLessThan(ALTO);
    expect(BOCA.ancho).toBeGreaterThan(0);
    // CANDADO (fuga cerrada POR el gate 2.5D): el interior no puede ser más
    // alto que lo que el pico bajado tapa — asoma por los fades y pinta
    // sobre la barba. El pico baja ~10-16px: alto acotado a ≤30px.
    expect(BOCA.alto).toBeGreaterThan(0);
    expect(BOCA.alto).toBeLessThanOrEqual(30);
  });
});
