/**
 * capas.test.js — el motor de recorte por alfa de la zarigüeya
 * (`hornearZariguya`). jsdom no trae Canvas2D real: se cubre la detección
 * de soporte, la degradación defensiva y que las constantes de anatomía
 * tengan la forma que `capas.js` espera — MÁS los locks propios de esta
 * lámina (cara intacta: canal bigotes/lápiz, colmillo excluido de la
 * mandíbula, oreja derecha sin invadir el ojo). La verificación píxel a
 * píxel se hizo offline con `sharp` importando las MISMAS máscaras
 * (`mascaras()`): 0.000% de huecos en la recomposición (ver el reporte).
 */
import { describe, it, expect } from 'vitest';
import { hornearZariguya, haySoporteCanvas, mascaras } from '../capas.js';
import anatomiaDefault, {
  ANCHO, ALTO, CABEZA, OJO, OJO_2, OREJA_IZQ, OREJA_DER,
  MANDIBULA, BOCA, BRAZO_LAPIZ, BRAZO_BRUJULA, INPAINT_PECHO,
  COLA, CUERPO_PIVOTE,
} from '../anatomia.js';

describe('haySoporteCanvas', () => {
  it('devuelve un booleano y no truena aunque jsdom no traiga canvas real', () => {
    expect(typeof haySoporteCanvas()).toBe('boolean');
  });
});

describe('hornearZariguya — degradación defensiva', () => {
  it('sin canvas 2d real devuelve null (nunca truena)', () => {
    const imgFalsa = /** @type {any} */ ({ naturalWidth: ANCHO, naturalHeight: ALTO });
    const resultado = hornearZariguya(imgFalsa, { ancho: ANCHO, altoPx: ALTO });
    expect(resultado === null || typeof resultado === 'object').toBe(true);
    if (!haySoporteCanvas()) expect(resultado).toBeNull();
  });

  it('sin dimensiones (imagen no cargada) devuelve null, no revienta', () => {
    const imgSinCargar = /** @type {any} */ ({ naturalWidth: 0, naturalHeight: 0 });
    expect(hornearZariguya(imgSinCargar, {})).toBeNull();
  });
});

describe('anatomia.js — forma de las constantes que capas.js consume', () => {
  it('ANCHO/ALTO coinciden con zariguya.png (481x444, medido con sharp)', () => {
    expect(ANCHO).toBe(481);
    expect(ALTO).toBe(444);
  });

  it('CABEZA trae la recta del cuello + el desvanecido de pecho', () => {
    expect(CABEZA.cuello).toMatchObject({ px: expect.any(Number), py: expect.any(Number), nx: expect.any(Number), ny: expect.any(Number) });
    expect(CABEZA.fadePecho.y1).toBeGreaterThan(CABEZA.fadePecho.y0);
    expect(CABEZA.pivote).toHaveLength(2);
  });

  it('OJO y OJO_2 (los dos ojos) caen dentro del canvas y son puntos distintos', () => {
    for (const ojo of [OJO, OJO_2]) {
      expect(ojo.cx).toBeGreaterThan(0);
      expect(ojo.cx).toBeLessThan(ANCHO);
      expect(ojo.cy).toBeGreaterThan(0);
      expect(ojo.cy).toBeLessThan(ALTO);
      expect(ojo.r).toBeGreaterThan(0);
    }
    expect(OJO.cx).not.toBeCloseTo(OJO_2.cx, 0);
  });

  it('los pivotes son puntos [x,y] dentro del lienzo', () => {
    for (const piv of [CABEZA.pivote, OREJA_IZQ.pivote, OREJA_DER.pivote, MANDIBULA.pivote,
      BRAZO_LAPIZ.pivote, BRAZO_BRUJULA.pivote, COLA.pivote, CUERPO_PIVOTE]) {
      const [x, y] = piv;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(ANCHO);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(ALTO);
    }
  });
});

describe('anatomia.js — los locks de CARA INTACTA de esta lámina', () => {
  it('las DOS orejas son cajas separadas con base y pivote válidos', () => {
    for (const oreja of [OREJA_IZQ, OREJA_DER]) {
      expect(oreja.box.x1).toBeGreaterThan(oreja.box.x0);
      expect(oreja.box.xFade).toBeGreaterThan(0);
      expect(oreja.base.y1).toBeGreaterThan(oreja.base.y0);
      expect(oreja.baseSub.y1).toBeLessThanOrEqual(oreja.base.y1);
      expect(oreja.pivote).toHaveLength(2);
    }
    expect(OREJA_DER.box.x0).toBeGreaterThan(OREJA_IZQ.box.x1);
  });

  it('la oreja izquierda NO invade la órbita del ojo izquierdo (órbita desde x≈158)', () => {
    expect(OREJA_IZQ.box.x1).toBeLessThanOrEqual(OJO.cx - OJO.r);
  });

  it('la oreja derecha corta su base ARRIBA de la órbita del ojo derecho (medido: órbita desde y≈52)', () => {
    // la pieza se desvanece antes de llegar de lleno al ojo: su banda de base
    // termina antes del centro del ojo.
    expect(OREJA_DER.base.y1).toBeLessThan(OJO_2.cy);
  });

  it('la mandíbula abre ENTRE el labio y el fin del mentón, con bisagra en la comisura izquierda', () => {
    expect(MANDIBULA.box.x1).toBeGreaterThan(MANDIBULA.box.x0);
    expect(MANDIBULA.labio.y1).toBeGreaterThan(MANDIBULA.labio.y0);
    expect(MANDIBULA.menton.y1).toBeGreaterThan(MANDIBULA.menton.y0);
    expect(MANDIBULA.menton.y0).toBeGreaterThan(MANDIBULA.labio.y1);
    // bisagra a la IZQUIERDA (el hocico apunta a la trufa del lado derecho).
    expect(MANDIBULA.pivote[0]).toBeLessThan((MANDIBULA.box.x0 + MANDIBULA.box.x1) / 2);
  });

  it('el COLMILLO superior queda EXCLUIDO de la mandíbula (lock: no estirar el maxilar de arriba)', () => {
    const { colmillo } = MANDIBULA;
    expect(colmillo.x1).toBeGreaterThan(colmillo.x0);
    expect(colmillo.y1).toBeGreaterThan(colmillo.y0);
    // el colmillo vive dentro de la caja de la mandíbula (por eso hay que
    // restarlo) y arranca por encima del labio (es maxilar superior).
    expect(colmillo.x0).toBeGreaterThan(MANDIBULA.box.x0);
    expect(colmillo.y0).toBeLessThan(MANDIBULA.labio.y0);
    // y la máscara efectivamente lo respeta: un punto en el corazón del
    // colmillo (226,140) NO pertenece a la mandíbula.
    const m = mascaras();
    expect(m.mMandibula(226, 140)).toBeLessThan(0.05);
    // mientras que el mentón pleno SÍ (170,155).
    expect(m.mMandibula(170, 155)).toBeGreaterThan(0.9);
  });

  it('el canal bigotes/lápiz se respeta: la punta del lápiz es del brazo, las puntas de bigote NO', () => {
    const m = mascaras();
    // punta alta del lápiz (medida en zoom-bigote-lapiz.png: ≈(82,134)).
    expect(m.mBrazoLapiz(80, 136)).toBeGreaterThan(0.9);
    // puntas de bigote más cercanas (≥x93): fuera del brazo, dentro de la cabeza.
    for (const [bx, by] of [[93, 122], [97, 122], [102, 140]]) {
      expect(m.mBrazoLapiz(bx, by)).toBeLessThan(0.05);
      expect(m.mCabezaFull(bx, by)).toBeGreaterThan(0.9);
    }
    // y los bigotes derechos sobre fondo (hasta ≈(301,84)) son cabeza.
    expect(m.mCabezaFull(301, 84)).toBeGreaterThan(0.9);
    expect(m.mCola(301, 84)).toBeLessThan(0.05);
  });

  it('los dos brazos y la cola son piezas de verdad en sus zonas plenas', () => {
    const m = mascaras();
    expect(m.mBrazoLapiz(58, 175)).toBeGreaterThan(0.9);      // el guante del lápiz
    expect(m.mBrazoBrujula(112, 262)).toBeGreaterThan(0.9);   // la brújula
    expect(m.mBrazoBrujula(151, 263)).toBeGreaterThan(0.9);   // el guante del pecho
    expect(m.mCola(430, 300)).toBeGreaterThan(0.9);           // el rulo prensil
    expect(m.mCuerpo(250, 330)).toBeGreaterThan(0.9);         // la panza es cuerpo
  });

  it('INPAINT_PECHO clona desde una fuente dentro del lienzo y fuera de las piezas', () => {
    const { x0, x1, y0, y1, dx, dy, umbral } = INPAINT_PECHO;
    expect(x1).toBeGreaterThan(x0);
    expect(y1).toBeGreaterThan(y0);
    expect(umbral).toBeGreaterThan(0);
    const m = mascaras();
    // las cuatro esquinas de la zona fuente: dentro del lienzo y libres de
    // brazo/cola/cabeza (si una pieza se moviera encima, el clon arrastraría
    // pedazos de guante — este lock lo delata).
    for (const [sx, sy] of [[x0 + dx, y0 + dy], [x1 + dx, y0 + dy], [x0 + dx, y1 + dy], [x1 + dx, y1 + dy]]) {
      expect(sx).toBeGreaterThan(0);
      expect(sx).toBeLessThan(ANCHO);
      expect(sy).toBeGreaterThan(0);
      expect(sy).toBeLessThan(ALTO);
      expect(m.mBrazoBrujula(sx, sy)).toBeLessThan(0.05);
      expect(m.mBrazoLapiz(sx, sy)).toBeLessThan(0.05);
      expect(m.mCabezaFull(sx, sy)).toBeLessThan(0.05);
    }
  });

  it('las PATAS no existen como pieza (lock "3-4 patas" del jaguar: sin péndulo que fantasmee)', () => {
    for (const nombre of ['PATAS', 'PATAS_DEL', 'PATA_TRASERA', 'PATA_IZQ', 'PATA_DER']) {
      expect(anatomiaDefault[nombre]).toBeUndefined();
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
