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
import anatomiaDefault, {
  ANCHO, ALTO, CABEZA, OJO, OJO_2, PATAS_DEL,
  PATA_TRASERA, COLA, CUERPO_PIVOTE,
  OREJA_IZQ, OREJA_DER, MANDIBULA, BOCA,
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
    for (const pieza of [PATAS_DEL.box, PATA_TRASERA.box]) {
      expect(pieza.x0).toBeGreaterThanOrEqual(0);
      expect(pieza.x1).toBeLessThanOrEqual(ANCHO);
      expect(pieza.x1).toBeGreaterThan(pieza.x0);
    }
    expect(COLA.pivote[0]).toBeGreaterThan(0);
    expect(COLA.pivote[0]).toBeLessThan(ANCHO);
  });

  it('PATAS_DEL es UN SOLO bloque (caja + articulación + pivote único) — sin corte por color que fantasmee 3-4 patas', () => {
    // caja en X válida + banda de articulación en Y.
    expect(PATAS_DEL.box.x1).toBeGreaterThan(PATAS_DEL.box.x0);
    expect(PATAS_DEL.box.xFade).toBeGreaterThan(0);
    expect(PATAS_DEL.joint.y1).toBeGreaterThan(PATAS_DEL.joint.y0);
    // un ÚNICO pivote (el hombro), dentro de su propia caja: rota como bloque,
    // no dos piezas que puedan divergir de fase.
    expect(PATAS_DEL.pivote).toHaveLength(2);
    expect(PATAS_DEL.pivote[0]).toBeGreaterThanOrEqual(PATAS_DEL.box.x0);
    expect(PATAS_DEL.pivote[0]).toBeLessThanOrEqual(PATAS_DEL.box.x1);
  });

  it('la separación de patas delanteras (pulido anterior) quedó REVERTIDA — sus constantes ya no existen (lock de regresión)', () => {
    // Si alguna vuelve, el bloque limpio se re-partiría y el 3-4-patas volvería.
    for (const nombre of ['PATA_DEL_CERCA', 'PATA_DEL_LEJANA', 'CORTE_PATAS_DEL', 'SOLAPE_PATA_DEL_CERCA', 'PATAS_DEL_ENVOLVENTE']) {
      expect(anatomiaDefault[nombre]).toBeUndefined();
    }
  });

  it('los pivotes de patas/cola/cabeza/cuerpo son puntos [x,y] dentro del lienzo', () => {
    for (const piv of [CABEZA.pivote, PATAS_DEL.pivote, PATA_TRASERA.pivote, COLA.pivote, CUERPO_PIVOTE]) {
      const [x, y] = piv;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(ANCHO);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(ALTO);
    }
  });
});

/* Piezas de LA VIDA (rama `feat/jaguar-miss-minutes`): las dos orejas (para
   parar la oreja al escuchar) y la mandíbula (para el lip-sync). Verificado
   offline con `sharp` que se restan de la cabeza sin perder píxeles (0%). */
describe('anatomia.js — piezas nuevas para la vida (orejas + mandíbula)', () => {
  it('las DOS orejas son cajas separadas (una a cada lado de la cabeza), con base y pivote válidos', () => {
    for (const oreja of [OREJA_IZQ, OREJA_DER]) {
      expect(oreja.box.x1).toBeGreaterThan(oreja.box.x0);
      expect(oreja.box.x0).toBeGreaterThanOrEqual(0);
      expect(oreja.box.x1).toBeLessThanOrEqual(ANCHO);
      expect(oreja.box.xFade).toBeGreaterThan(0);
      // se desvanece hacia la base (donde nace del cráneo): y1 > y0.
      expect(oreja.base.y1).toBeGreaterThan(oreja.base.y0);
      expect(oreja.pivote).toHaveLength(2);
    }
    // orejas a lados distintos: si se solaparan, no serían dos orejas.
    expect(OREJA_DER.box.x0).toBeGreaterThan(OREJA_IZQ.box.x1);
    // el pivote (la base que articula) cae dentro de su propia caja.
    expect(OREJA_IZQ.pivote[0]).toBeGreaterThanOrEqual(OREJA_IZQ.box.x0);
    expect(OREJA_IZQ.pivote[0]).toBeLessThanOrEqual(OREJA_IZQ.box.x1);
    expect(OREJA_DER.pivote[0]).toBeGreaterThanOrEqual(OREJA_DER.box.x0);
    expect(OREJA_DER.pivote[0]).toBeLessThanOrEqual(OREJA_DER.box.x1);
  });

  it('la mandíbula abre ENTRE el labio (arriba) y el fin del mentón (abajo) — no invade el cuello', () => {
    expect(MANDIBULA.box.x1).toBeGreaterThan(MANDIBULA.box.x0);
    expect(MANDIBULA.labio.y1).toBeGreaterThan(MANDIBULA.labio.y0);
    expect(MANDIBULA.menton.y1).toBeGreaterThan(MANDIBULA.menton.y0);
    // el mentón (fin de la pieza) queda DEBAJO del labio (inicio): pieza acotada.
    expect(MANDIBULA.menton.y0).toBeGreaterThan(MANDIBULA.labio.y1);
    // el pivote (charnela) está en la línea del labio, dentro del canvas.
    expect(MANDIBULA.pivote[0]).toBeGreaterThan(0);
    expect(MANDIBULA.pivote[0]).toBeLessThan(ANCHO);
  });

  it('BOCA (interior sintético) es un punto con ancho, dentro del canvas', () => {
    expect(BOCA.cx).toBeGreaterThan(0);
    expect(BOCA.cx).toBeLessThan(ANCHO);
    expect(BOCA.cy).toBeGreaterThan(0);
    expect(BOCA.cy).toBeLessThan(ALTO);
    expect(BOCA.ancho).toBeGreaterThan(0);
  });
});
