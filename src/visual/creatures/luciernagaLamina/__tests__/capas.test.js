/**
 * capas.test.js — el motor de recorte por alfa (`hornearLuciernaga`). jsdom
 * no trae Canvas2D real, así que estas pruebas cubren lo que SÍ es
 * observable sin GPU/browser: la detección de soporte, la degradación
 * defensiva (nunca truena) y que las constantes de anatomía tengan la forma
 * que `capas.js` espera — incluidos los CANDADOS del corte C4:
 *   · NO EXISTE pieza de cabeza (regla dura: no se corta cuello/cabeza —
 *     la testa viaja fusionada al cuerpo).
 *   · Las ALAS existen con techo/fondo/interior/pivote válidos.
 *   · Las fugas cerradas de rondas anteriores siguen cerradas (punta de
 *     antena, techo de la mano, linterna vs bota).
 * La verificación píxel a píxel (0 huecos / 0 déficit / 0 exceso + giro de
 * alas sin cracks) vive en recomposicion.test.js, que importa las MISMAS
 * fórmulas (`mascaras()`, `extenderRespaldo`).
 */
import { describe, it, expect } from 'vitest';
import { hornearLuciernaga, haySoporteCanvas, mascaras } from '../capas.js';
import anatomia, {
  ANCHO, ALTO, OJO, OJO_2, MANDIBULA, BOCA,
  ANTENA_IZQ, ANTENA_DER, ALA_IZQ, ALA_DER, CUADERNO_GUANTE,
  MANO_LAPIZ, LINTERNA, PIERNA_IZQ, PIERNA_DER, CUERPO_PIVOTE,
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

describe('corte C4 — el cuello/cabeza NO se corta (regla dura del operador)', () => {
  it('la anatomía no exporta pieza de cabeza ni banda de cuello', () => {
    expect(anatomia.CABEZA).toBeUndefined();
  });

  it('mascaras() trae el juego C4 (cuerpo completo + alas) y NINGUNA máscara de cabeza', () => {
    const m = mascaras();
    for (const clave of ['mCuerpo', 'mAlaIzq', 'mAlaDer', 'mMandibula', 'mAntenaIzq', 'mAntenaDer', 'mManoLapiz', 'mLinterna']) {
      expect(typeof m[clave], clave).toBe('function');
    }
    expect(m.mCabezaRender).toBeUndefined();
    expect(m.mCabezaFull).toBeUndefined();
  });

  it('la CARA vive en el cuerpo: en el centro de los dos ojos mCuerpo == 1 (sin corte que la cruce)', () => {
    const m = mascaras();
    for (const ojo of [OJO, OJO_2]) {
      expect(m.mCuerpo(ojo.cx, ojo.cy)).toBeGreaterThanOrEqual(0.999);
    }
    // y en la banda del cuello que el corte viejo cortaba (y≈200-218):
    expect(m.mCuerpo(186, 208)).toBeGreaterThanOrEqual(0.999);
  });
});

describe('anatomia.js — forma de las constantes que capas.js consume', () => {
  it('ANCHO/ALTO coinciden con luciernaga.png (367x507, header PNG verificado)', () => {
    expect(ANCHO).toBe(367);
    expect(ALTO).toBe(507);
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

  it('la mandíbula abre ENTRE el labio (bajo la sonrisa) y el fin del mentón — la sonrisa queda en el cuerpo', () => {
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

  it('las DOS alas: banda techo→fondo válida, contorno interior dentro del lienzo, pivote en la raíz', () => {
    for (const ala of [ALA_IZQ, ALA_DER]) {
      expect(ala.techo.y1).toBeGreaterThan(ala.techo.y0);
      expect(ala.fondo.y1).toBeGreaterThan(ala.fondo.y0);
      expect(ala.fondo.y0).toBeGreaterThan(ala.techo.y1);
      let yPrev = -1;
      for (const [y, x] of ala.interior) {
        expect(y).toBeGreaterThan(yPrev);          // polilínea ordenada en y
        yPrev = y;
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(ANCHO);
      }
      expect(ala.pivote).toHaveLength(2);
      // la raíz del ala vive arriba, en la banda del techo (giro de aleteo,
      // nunca traslación): pivote a ±10px de la banda.
      expect(ala.pivote[1]).toBeGreaterThanOrEqual(ala.techo.y0 - 10);
      expect(ala.pivote[1]).toBeLessThanOrEqual(ala.fondo.y0);
    }
    // flancos opuestos: todo el interior del ala izquierda queda a la
    // izquierda del interior del ala derecha.
    const maxIzq = Math.max(...ALA_IZQ.interior.map(([, x]) => x));
    const minDer = Math.min(...ALA_DER.interior.map(([, x]) => x));
    expect(maxIzq).toBeLessThan(minDer);
    // el borde de ataque del ala izquierda (frontera con guante/brazo)
    // existe y decrece en x al bajar (el frente se abre hacia afuera).
    let xPrev = Infinity;
    for (const [, x] of ALA_IZQ.borde) {
      expect(x).toBeLessThan(xPrev);
      xPrev = x;
    }
  });

  it('CUADERNO_GUANTE (oclusor que se queda en el cuerpo): quad de 4 esquinas dentro del lienzo', () => {
    expect(CUADERNO_GUANTE.quad).toHaveLength(4);
    for (const [x, y] of CUADERNO_GUANTE.quad) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(ANCHO);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(ALTO);
    }
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
    // CANDADO C4: el filo del élitro NO viaja con la mano — la máscara de la
    // mano es ~0 sobre el borde de ataque del ala (x=120, y=235: élitro).
    const m = mascaras();
    expect(m.mManoLapiz(120, 235)).toBeLessThan(0.05);
    // …y el tarso con el lápiz sigue entero en la pieza.
    expect(m.mManoLapiz(48, 226)).toBeGreaterThan(0.95);
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
    for (const piv of [MANDIBULA.pivote, ANTENA_IZQ.pivote, ANTENA_DER.pivote, ALA_IZQ.pivote, ALA_DER.pivote, MANO_LAPIZ.pivote, CUERPO_PIVOTE]) {
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
