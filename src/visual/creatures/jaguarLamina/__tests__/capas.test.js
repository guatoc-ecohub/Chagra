/**
 * capas.test.js — el motor de recorte por alfa (`hornearJaguar`). jsdom no
 * trae Canvas2D real (no está instalado el paquete `canvas`), así que estas
 * pruebas cubren lo que SÍ es observable sin GPU/browser: la detección de
 * soporte, la degradación defensiva (nunca truena, nunca revienta con un
 * canvas vacío) y que las constantes de anatomía tengan la forma que
 * `capas.js` espera. La verificación PIXEL a pixel (¿el corte cae donde
 * dice `anatomia.js`?) se hizo offline con `sharp` en `_gate/anatomia-
 * jaguar/` (no versionado — ver el reporte de la tarea) porque jsdom no da
 * para reproducirla en CI sin el paquete `canvas`.
 */
import { describe, it, expect } from 'vitest';
import { hornearJaguar, haySoporteCanvas } from '../capas.js';
import { ANCHO, ALTO, CABEZA, OJO, PATAS_DELANTERAS, PATA_TRASERA, COLA, CUERPO_PIVOTE } from '../anatomia.js';

describe('haySoporteCanvas', () => {
  it('devuelve un booleano y no truena aunque jsdom no traiga canvas real', () => {
    expect(typeof haySoporteCanvas()).toBe('boolean');
  });
});

describe('hornearJaguar — degradación defensiva', () => {
  it('sin canvas.getContext(\'2d\') real, devuelve null (nunca truena)', () => {
    /** @type {HTMLImageElement} */
    const imgFalsa = /** @type {any} */ ({ naturalWidth: ANCHO, naturalHeight: ALTO });
    const resultado = hornearJaguar(imgFalsa, { ancho: ANCHO, altoPx: ALTO });
    // jsdom sin el paquete `canvas`: getContext('2d') es null/indefinido →
    // haySoporteCanvas() debe dar false y hornearJaguar debe devolver null.
    expect(resultado === null || typeof resultado === 'object').toBe(true);
    if (!haySoporteCanvas()) expect(resultado).toBeNull();
  });

  it('sin dimensiones (imagen no cargada) devuelve null, no revienta', () => {
    const imgSinCargar = /** @type {any} */ ({ naturalWidth: 0, naturalHeight: 0 });
    expect(hornearJaguar(imgSinCargar, {})).toBeNull();
  });
});

describe('anatomia.js — forma de las constantes que capas.js consume', () => {
  it('ANCHO/ALTO coinciden con jaguar-natural.png (705x394, ver piloto-lamina.js)', () => {
    expect(ANCHO).toBe(705);
    expect(ALTO).toBe(394);
  });

  it('CABEZA trae la recta de corte + el desvanecido de mandíbula', () => {
    expect(CABEZA.cuello).toMatchObject({ px: expect.any(Number), py: expect.any(Number), nx: expect.any(Number), ny: expect.any(Number) });
    expect(CABEZA.fadeMandibula.y1).toBeGreaterThan(CABEZA.fadeMandibula.y0);
    expect(CABEZA.pivote).toHaveLength(2);
  });

  it('OJO cae dentro del canvas', () => {
    expect(OJO.cx).toBeGreaterThan(0);
    expect(OJO.cx).toBeLessThan(ANCHO);
    expect(OJO.cy).toBeGreaterThan(0);
    expect(OJO.cy).toBeLessThan(ALTO);
    expect(OJO.r).toBeGreaterThan(0);
  });

  it('las cajas de patas y el corte de cola quedan dentro del canvas', () => {
    for (const pieza of [PATAS_DELANTERAS.box, PATA_TRASERA.box]) {
      expect(pieza.x0).toBeGreaterThanOrEqual(0);
      expect(pieza.x1).toBeLessThanOrEqual(ANCHO);
      expect(pieza.x1).toBeGreaterThan(pieza.x0);
    }
    expect(COLA.pivote[0]).toBeGreaterThan(0);
    expect(COLA.pivote[0]).toBeLessThan(ANCHO);
  });

  it('los pivotes de patas/cola/cabeza/cuerpo son puntos [x,y] dentro del lienzo', () => {
    for (const piv of [CABEZA.pivote, PATAS_DELANTERAS.pivote, PATA_TRASERA.pivote, COLA.pivote, CUERPO_PIVOTE]) {
      const [x, y] = piv;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(ANCHO);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(ALTO);
    }
  });
});
