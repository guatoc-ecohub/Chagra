/**
 * capas.test.js — el motor de recorte por alfa del oso (`hornearOso`). jsdom
 * no trae Canvas2D real (no está instalado el paquete `canvas`), así que
 * estas pruebas cubren lo que SÍ es observable sin GPU/browser: la detección
 * de soporte, la degradación defensiva (nunca truena) y que las constantes
 * de anatomía tengan la forma que `capas.js` espera. La verificación PIXEL a
 * píxel (recomposición de capas contra el original: 0% de píxeles perdidos)
 * se hizo offline con `sharp` en `_gate/oso-lamina-viva/verificar.mjs` (no
 * versionado — ver el reporte de la rama), igual que el jaguar.
 */
import { describe, it, expect } from 'vitest';
import { hornearOso, haySoporteCanvas, interpolarY } from '../capas.js';
import {
  ANCHO, ALTO, CABEZA, OJO, OREJA_IZQ, OREJA_DER,
  MANDIBULA, CORONA, CUERPO_PIVOTE, BOCA,
} from '../anatomia.js';

describe('haySoporteCanvas', () => {
  it('devuelve un booleano y no truena aunque jsdom no traiga canvas real', () => {
    expect(typeof haySoporteCanvas()).toBe('boolean');
  });
});

describe('hornearOso — degradación defensiva', () => {
  it('sin canvas.getContext(\'2d\') real, devuelve null (nunca truena)', () => {
    /** @type {HTMLImageElement} */
    const imgFalsa = /** @type {any} */ ({ naturalWidth: ANCHO, naturalHeight: ALTO });
    const resultado = hornearOso(imgFalsa, { ancho: ANCHO, altoPx: ALTO });
    expect(resultado === null || typeof resultado === 'object').toBe(true);
    if (!haySoporteCanvas()) expect(resultado).toBeNull();
  });

  it('sin dimensiones (imagen no cargada) devuelve null, no revienta', () => {
    const imgSinCargar = /** @type {any} */ ({ naturalWidth: 0, naturalHeight: 0 });
    expect(hornearOso(imgSinCargar, {})).toBeNull();
  });
});

describe('interpolarY — la polilínea del cuello/labio (pose erguida ¾)', () => {
  it('interpola por tramos y clampea en los extremos', () => {
    const puntos = [[0, 10], [10, 20], [20, 10]];
    expect(interpolarY(puntos, -5)).toBe(10);   // clamp izquierdo
    expect(interpolarY(puntos, 0)).toBe(10);
    expect(interpolarY(puntos, 5)).toBe(15);    // mitad del primer tramo
    expect(interpolarY(puntos, 10)).toBe(20);
    expect(interpolarY(puntos, 15)).toBe(15);   // mitad del segundo tramo
    expect(interpolarY(puntos, 99)).toBe(10);   // clamp derecho
  });

  it('la polilínea del cuello real es monótona en x y cae dentro del lienzo', () => {
    const xs = CABEZA.cuello.puntos.map((p) => p[0]);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    for (const [x, y] of CABEZA.cuello.puntos) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(ANCHO);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(ALTO);
    }
  });
});

describe('anatomia.js — forma de las constantes que capas.js consume', () => {
  it('ANCHO/ALTO coinciden con oso.png (615x630, sharp().metadata())', () => {
    expect(ANCHO).toBe(615);
    expect(ALTO).toBe(630);
  });

  it('CABEZA trae caja, polilínea de cuello con fade, respaldo cuelloSub y pivote', () => {
    expect(CABEZA.box.x1).toBeGreaterThan(CABEZA.box.x0);
    expect(CABEZA.box.xFade).toBeGreaterThan(0);
    expect(CABEZA.cuello.puntos.length).toBeGreaterThanOrEqual(2);
    expect(CABEZA.cuello.fade).toBeGreaterThan(0);
    // el respaldo anti-hueco: la línea del cuerpo se corre HACIA la cabeza.
    expect(CABEZA.cuelloSub).toBeGreaterThan(0);
    expect(CABEZA.pivote).toHaveLength(2);
  });

  it('OJO (el ÚNICO visible — pose ¾, no hay OJO_2) cae dentro del lienzo', () => {
    expect(OJO.cx).toBeGreaterThan(0);
    expect(OJO.cx).toBeLessThan(ANCHO);
    expect(OJO.cy).toBeGreaterThan(0);
    expect(OJO.cy).toBeLessThan(ALTO);
    expect(OJO.r).toBeGreaterThan(0);
  });

  it('las DOS orejas son cajas separadas con base, baseSub (anti-hueco) y pivote', () => {
    for (const oreja of [OREJA_IZQ, OREJA_DER]) {
      expect(oreja.box.x1).toBeGreaterThan(oreja.box.x0);
      expect(oreja.box.xFade).toBeGreaterThan(0);
      expect(oreja.base.y1).toBeGreaterThan(oreja.base.y0);
      expect(oreja.baseSub.y1).toBeGreaterThan(oreja.baseSub.y0);
      // baseSub corta más ARRIBA que base: la base queda de respaldo en la
      // cabeza (si se invirtieran, el giro de la oreja abriría fondo).
      expect(oreja.baseSub.y1).toBeLessThanOrEqual(oreja.base.y0 + 1);
      expect(oreja.pivote).toHaveLength(2);
      expect(oreja.pivote[0]).toBeGreaterThanOrEqual(oreja.box.x0);
      expect(oreja.pivote[0]).toBeLessThanOrEqual(oreja.box.x1);
    }
    expect(OREJA_DER.box.x0).toBeGreaterThan(OREJA_IZQ.box.x1);
  });

  it('la mandíbula abre ENTRE el labio (polilínea) y el fin del mentón — no invade el pecho', () => {
    expect(MANDIBULA.box.x1).toBeGreaterThan(MANDIBULA.box.x0);
    expect(MANDIBULA.labio.puntos.length).toBeGreaterThanOrEqual(2);
    expect(MANDIBULA.labio.fade).toBeGreaterThan(0);
    expect(MANDIBULA.menton.y1).toBeGreaterThan(MANDIBULA.menton.y0);
    // el mentón queda DEBAJO de todo el labio: pieza acotada.
    for (const [, y] of MANDIBULA.labio.puntos) {
      expect(MANDIBULA.menton.y0).toBeGreaterThan(y);
    }
    expect(MANDIBULA.pivote[0]).toBeGreaterThan(0);
    expect(MANDIBULA.pivote[0]).toBeLessThan(ANCHO);
  });

  it('la CORONA del bastón (el contrapeso vivo del oso) trae caja, base, baseSub y pivote en su base', () => {
    expect(CORONA.box.x1).toBeGreaterThan(CORONA.box.x0);
    expect(CORONA.base.y1).toBeGreaterThan(CORONA.base.y0);
    expect(CORONA.baseSub.y1).toBeGreaterThan(CORONA.baseSub.y0);
    // baseSub corta más ARRIBA que base (respaldo del palo en el cuerpo).
    expect(CORONA.baseSub.y1).toBeLessThanOrEqual(CORONA.base.y0 + 1);
    // la corona NO invade la cabeza (viven en cajas disjuntas en X).
    expect(CORONA.box.x0).toBeGreaterThan(CABEZA.box.x1);
    // pivote dentro de su caja, a la altura de la base (cabecea desde donde nace).
    expect(CORONA.pivote[0]).toBeGreaterThanOrEqual(CORONA.box.x0);
    expect(CORONA.pivote[0]).toBeLessThanOrEqual(CORONA.box.x1);
  });

  it('el BASTÓN entero NO se separa (la zarpa lo empuña — la lección de las patas del jaguar): no hay constante BASTON', async () => {
    const anatomia = await import('../anatomia.js');
    expect(anatomia.BASTON).toBeUndefined();
    expect(anatomia.default.BASTON).toBeUndefined();
  });

  it('los pivotes de cabeza/cuerpo/corona son puntos [x,y] dentro del lienzo', () => {
    for (const piv of [CABEZA.pivote, CUERPO_PIVOTE, CORONA.pivote, OREJA_IZQ.pivote, OREJA_DER.pivote, MANDIBULA.pivote]) {
      const [x, y] = piv;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(ANCHO);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(ALTO);
    }
  });

  it('BOCA (interior sintético — el único píxel no-lámina) es un punto con ancho y giro, dentro del lienzo', () => {
    expect(BOCA.cx).toBeGreaterThan(0);
    expect(BOCA.cx).toBeLessThan(ANCHO);
    expect(BOCA.cy).toBeGreaterThan(0);
    expect(BOCA.cy).toBeLessThan(ALTO);
    expect(BOCA.ancho).toBeGreaterThan(0);
    expect(typeof BOCA.giro).toBe('number');
  });
});
