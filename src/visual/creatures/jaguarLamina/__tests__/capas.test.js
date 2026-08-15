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
import {
  ANCHO, ALTO, CABEZA, OJO, OJO_2, PATAS_DEL_ENVOLVENTE, CORTE_PATAS_DEL, SOLAPE_PATA_DEL_CERCA,
  PATA_DEL_CERCA, PATA_DEL_LEJANA, PATA_TRASERA, COLA, CUERPO_PIVOTE,
} from '../anatomia.js';

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

  it('OJO y OJO_2 (pulido: los DOS ojos, no solo uno) caen dentro del canvas', () => {
    for (const ojo of [OJO, OJO_2]) {
      expect(ojo.cx).toBeGreaterThan(0);
      expect(ojo.cx).toBeLessThan(ANCHO);
      expect(ojo.cy).toBeGreaterThan(0);
      expect(ojo.cy).toBeLessThan(ALTO);
      expect(ojo.r).toBeGreaterThan(0);
    }
    // los dos ojos son puntos DISTINTOS — si coincidieran, OJO_2 no estaría
    // realmente midiendo el segundo ojo (regresión silenciosa a un solo ojo).
    expect(OJO.cx).not.toBeCloseTo(OJO_2.cx, 0);
  });

  it('las cajas de patas y el corte de cola quedan dentro del canvas', () => {
    for (const pieza of [PATAS_DEL_ENVOLVENTE.box, PATA_TRASERA.box]) {
      expect(pieza.x0).toBeGreaterThanOrEqual(0);
      expect(pieza.x1).toBeLessThanOrEqual(ANCHO);
      expect(pieza.x1).toBeGreaterThan(pieza.x0);
    }
    expect(COLA.pivote[0]).toBeGreaterThan(0);
    expect(COLA.pivote[0]).toBeLessThan(ANCHO);
  });

  it('CORTE_PATAS_DEL (pulido: separa las dos patas delanteras) trae recta + banda válida', () => {
    expect(CORTE_PATAS_DEL).toMatchObject({
      px: expect.any(Number), py: expect.any(Number), nx: expect.any(Number), ny: expect.any(Number),
    });
    expect(CORTE_PATAS_DEL.u1).toBeGreaterThan(CORTE_PATAS_DEL.u0);
  });

  it('SOLAPE_PATA_DEL_CERCA (respaldo anti-hueco entre las dos patas) es un margen positivo', () => {
    expect(SOLAPE_PATA_DEL_CERCA).toBeGreaterThan(0);
  });

  it('los pivotes de patas/cola/cabeza/cuerpo son puntos [x,y] dentro del lienzo, y las dos patas delanteras pivotan distinto', () => {
    for (const piv of [CABEZA.pivote, PATA_DEL_CERCA.pivote, PATA_DEL_LEJANA.pivote, PATA_TRASERA.pivote, COLA.pivote, CUERPO_PIVOTE]) {
      const [x, y] = piv;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(ANCHO);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(ALTO);
    }
    // si los pivotes de las dos patas delanteras coincidieran, volverían a
    // rotar como un solo bloque aunque las máscaras ya estén separadas.
    expect(PATA_DEL_CERCA.pivote[0]).not.toBeCloseTo(PATA_DEL_LEJANA.pivote[0], 0);
  });
});
