/**
 * capas.test.js — el motor de recorte por alfa (`hornearJaguar`). jsdom no
 * trae Canvas2D real (no está instalado el paquete `canvas`), así que estas
 * pruebas cubren lo que SÍ es observable sin GPU/browser: la detección de
 * soporte, la degradación defensiva (nunca truena, nunca revienta con un
 * canvas vacío) y que las constantes de anatomía tengan la forma que
 * `capas.js` espera. La verificación PIXEL a pixel (¿el corte cae donde
 * dice `anatomia.js`?) vive en la recomposición de control del set de arte
 * (`rigs2d/jaguar/_build/build-cuerpo.mjs`: 0.035% de huecos contra la
 * lámina original) y en el gate GPU del operador.
 */
import { describe, it, expect } from 'vitest';
import { hornearJaguar, haySoporteCanvas } from '../capas.js';
import anatomiaDefault, {
  ANCHO, ALTO, CABEZA, OJO, OJO_2, PATAS_DEL,
  PATA_TRASERA, COLA, CUERPO_PIVOTE,
  OREJA_IZQ, OREJA_DER, MANDIBULA, BOCA,
  CORTE_PATAS_DEL, RIG_MARCHA, MARCHA, CAPAS_RIG,
} from '../anatomia.js';

/** Imagen falsa con las dimensiones de la lámina (jsdom no carga PNG). */
const imgFalsa = () => /** @type {any} */ ({ naturalWidth: ANCHO, naturalHeight: ALTO });
const setFalso = () => ({
  lamina: imgFalsa(),
  cuerpo: imgFalsa(),
  delLejana: imgFalsa(),
  trasCercana: imgFalsa(),
  trasLejana: imgFalsa(),
});

describe('haySoporteCanvas', () => {
  it('devuelve un booleano y no truena aunque jsdom no traiga canvas real', () => {
    expect(typeof haySoporteCanvas()).toBe('boolean');
  });
});

describe('hornearJaguar — degradación defensiva', () => {
  it('sin canvas.getContext(\'2d\') real, devuelve null (nunca truena)', () => {
    const resultado = hornearJaguar(setFalso(), { ancho: ANCHO, altoPx: ALTO });
    // jsdom sin el paquete `canvas`: getContext('2d') es null/indefinido →
    // haySoporteCanvas() debe dar false y hornearJaguar debe devolver null.
    expect(resultado === null || typeof resultado === 'object').toBe(true);
    if (!haySoporteCanvas()) expect(resultado).toBeNull();
  });

  it('sin dimensiones (lámina no cargada) devuelve null, no revienta', () => {
    const set = setFalso();
    set.lamina = /** @type {any} */ ({ naturalWidth: 0, naturalHeight: 0 });
    expect(hornearJaguar(set, {})).toBeNull();
  });

  it('si falta cualquiera de las capas del rig (PNG que no cargó) devuelve null — el llamador se queda en la lámina plana', () => {
    for (const clave of ['lamina', 'cuerpo', 'delLejana', 'trasCercana', 'trasLejana']) {
      const set = setFalso();
      set[clave] = null;
      expect(hornearJaguar(set, { ancho: ANCHO, altoPx: ALTO })).toBeNull();
    }
    expect(hornearJaguar(null, { ancho: ANCHO, altoPx: ALTO })).toBeNull();
  });
});

describe('anatomia.js — forma de las constantes que capas.js consume', () => {
  it('ANCHO/ALTO coinciden con jaguar-natural.png (705x394, ver piloto-lamina.js)', () => {
    expect(ANCHO).toBe(705);
    expect(ALTO).toBe(394);
  });

  it('CABEZA trae la recta de corte + el desvanecido de mandíbula (corte face-safe, nunca un rectángulo)', () => {
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

/* El rig 2.5D: la base SIN patas + 4 patas propias. El lock de regresión del
   "3-4 patas" cambió de forma: ya no prohíbe el corte de delanteras (la
   naranja SÍ se corta con `CORTE_PATAS_DEL` — su respaldo ahora es la pata
   blanca PRE-CORTADA, no la otra mitad del mismo plano), prohíbe que vuelva
   el REPARTO del envolvente en dos mitades (`PATA_DEL_CERCA`/`_LEJANA` +
   solape), que era lo que fantasmeaba el contorno doble. */
describe('anatomia.js — rig de marcha (capas propias + esqueleto)', () => {
  it('la base del ensamble es el cuerpo INPAINT (sin patas) + 3 patas PNG propias', () => {
    expect(CAPAS_RIG.cuerpo).toMatch(/inpaint/);
    for (const clave of ['delLejana', 'trasCercana', 'trasLejana']) {
      expect(CAPAS_RIG[clave]).toMatch(/^pata-/);
    }
  });

  it('el reparto viejo del envolvente en dos mitades NO volvió (lock de regresión del 3-4 patas)', () => {
    for (const nombre of ['PATA_DEL_CERCA', 'PATA_DEL_LEJANA', 'SOLAPE_PATA_DEL_CERCA', 'PATAS_DEL_ENVOLVENTE']) {
      expect(anatomiaDefault[nombre]).toBeUndefined();
    }
    // el corte medido sí existe — extrae SOLO la pieza naranja de la lámina.
    expect(CORTE_PATAS_DEL).toMatchObject({ px: expect.any(Number), nx: expect.any(Number) });
  });

  it('RIG_MARCHA: EXACTAMENTE 4 patas, cadena articulación→rodilla→pie dentro del lienzo y en orden vertical', () => {
    const claves = Object.keys(RIG_MARCHA);
    expect(claves).toHaveLength(4);
    expect(claves.sort()).toEqual(['delCercana', 'delLejana', 'trasCercana', 'trasLejana']);
    for (const rig of Object.values(RIG_MARCHA)) {
      for (const punto of [rig.articulacion, rig.rodilla, rig.pie, rig.anclaje]) {
        expect(punto[0]).toBeGreaterThanOrEqual(0);
        expect(punto[0]).toBeLessThanOrEqual(ANCHO);
        expect(punto[1]).toBeGreaterThanOrEqual(0);
        expect(punto[1]).toBeLessThanOrEqual(ALTO);
      }
      // la cadena baja: articulación arriba, rodilla en medio, pie al suelo.
      expect(rig.rodilla[1]).toBeGreaterThan(rig.articulacion[1]);
      expect(rig.pie[1]).toBeGreaterThan(rig.rodilla[1]);
      // el corte del arte cae en la rodilla medida.
      expect(rig.rodillaCorte).toBe(rig.rodilla[1]);
      // el vértice de flexión tiene lado definido (±1).
      expect(Math.abs(rig.lado)).toBe(1);
    }
    // las delanteras doblan por el carpo (vértice adelante), las traseras por
    // el corvejón (vértice atrás) — si un signo se voltea, la pata se
    // dobla al revés (rodilla de flamenco).
    expect(RIG_MARCHA.delLejana.lado).toBe(-1);
    expect(RIG_MARCHA.delCercana.lado).toBe(-1);
    expect(RIG_MARCHA.trasCercana.lado).toBe(1);
    expect(RIG_MARCHA.trasLejana.lado).toBe(1);
  });

  it('las fases de contacto son los 4 cuartos del ciclo en secuencia lateral (tras cercana → del cercana → tras lejana → del lejana)', () => {
    expect(RIG_MARCHA.trasCercana.fase).toBe(0);
    expect(RIG_MARCHA.delCercana.fase).toBe(0.25);
    expect(RIG_MARCHA.trasLejana.fase).toBe(0.5);
    expect(RIG_MARCHA.delLejana.fase).toBe(0.75);
  });

  it('MARCHA: duty de marcha (mayoría del ciclo apoyado) y velocidad acoplada al roam', () => {
    expect(MARCHA.duty).toBeGreaterThan(0.5);
    expect(MARCHA.duty).toBeLessThan(1);
    expect(MARCHA.amplitud).toBeGreaterThan(0);
    // DEBE coincidir con PX_POR_SEG de useCompaiRoam.js — es lo que clava la
    // pisada al desplazamiento real (cero moonwalk).
    expect(MARCHA.velocidadPxS).toBe(34);
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
