/**
 * capas.test.js — el motor de recorte de la zarigüeya GEMINI
 * (`hornearZariguyaGemini`) + los locks del set aprobado (2026-08-23).
 * jsdom no trae Canvas2D real: se cubre la detección de soporte, la
 * degradación defensiva, la forma de las constantes que `capas.js` y el
 * componente consumen, y los locks NUEVOS de este carril: la colocación de
 * la pieza de rig de la cola, el manifiesto de poses plenas y el ciclo de
 * escucha (solo cuerpo entero — el close-up 01 NO entra al ciclo).
 * La verificación píxel a píxel de la lámina hermana (mismo encuadre,
 * mismas máscaras) dio 0.000% de huecos; el juicio de costura lo da el
 * gate GPU del operador (ver INFORME-ZARIGUYA-GEMINI.md).
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { hornearZariguyaGemini, haySoporteCanvas, mascaras } from '../capas.js';
import {
  ANCHO, ALTO, CABEZA, OJO, OJO_2, OREJA_IZQ, OREJA_DER,
  MANDIBULA, BRAZO_LAPIZ, BRAZO_BRUJULA, COLA, CUERPO_PIVOTE,
  PARTE_COLA, POSES, ESCUCHA_CICLO, UMBRAL_CLOSEUP,
} from '../anatomia.js';
import ZariguyaGeminiLaminaViva from '../../ZariguyaGeminiLaminaViva.jsx';

describe('haySoporteCanvas', () => {
  it('devuelve un booleano y no truena aunque jsdom no traiga canvas real', () => {
    expect(typeof haySoporteCanvas()).toBe('boolean');
  });
});

describe('hornearZariguyaGemini — degradación defensiva', () => {
  it('sin canvas 2d real devuelve null (nunca truena)', () => {
    const imgFalsa = /** @type {any} */ ({ naturalWidth: ANCHO, naturalHeight: ALTO });
    const resultado = hornearZariguyaGemini(imgFalsa, { ancho: ANCHO, altoPx: ALTO });
    expect(resultado === null || typeof resultado === 'object').toBe(true);
    if (!haySoporteCanvas()) expect(resultado).toBeNull();
  });

  it('sin dimensiones (imagen no cargada) devuelve null, no revienta', () => {
    const imgSinCargar = /** @type {any} */ ({ naturalWidth: 0, naturalHeight: 0 });
    expect(hornearZariguyaGemini(imgSinCargar, {})).toBeNull();
  });
});

describe('anatomia.js — forma de las constantes heredadas (mismo encuadre que la hermana)', () => {
  it('ANCHO/ALTO coinciden con zariguya-gemini-hero.png (481x444, medido con sharp)', () => {
    expect(ANCHO).toBe(481);
    expect(ALTO).toBe(444);
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

  it('cara intacta: el colmillo superior sigue excluido de la mandíbula', () => {
    const m = mascaras();
    expect(m.mMandibula(226, 140)).toBeLessThan(0.05);   // corazón del colmillo
    expect(m.mMandibula(170, 155)).toBeGreaterThan(0.9); // mentón pleno
  });

  it('cara intacta: las orejas no invaden las órbitas de los ojos', () => {
    expect(OREJA_IZQ.box.x1).toBeLessThanOrEqual(OJO.cx - OJO.r);
    expect(OREJA_DER.base.y1).toBeLessThan(OJO_2.cy);
  });
});

describe('anatomia.js — los locks NUEVOS del set Gemini', () => {
  it('PARTE_COLA: la pieza de rig queda anclada a la grupa, escala coherente con su fuente', () => {
    expect(PARTE_COLA.w).toBeCloseTo(PARTE_COLA.W * PARTE_COLA.escala, 0);
    expect(PARTE_COLA.h).toBeCloseTo(PARTE_COLA.H * PARTE_COLA.escala, 0);
    // el pivote (emergencia de la cola) cae DENTRO de la caja colocada…
    const [px, py] = PARTE_COLA.pivote;
    expect(px).toBeGreaterThan(PARTE_COLA.x);
    expect(px).toBeLessThan(PARTE_COLA.x + PARTE_COLA.w);
    expect(py).toBeGreaterThan(PARTE_COLA.y);
    expect(py).toBeLessThan(PARTE_COLA.y + PARTE_COLA.h);
    // …y junto a la banda del corte de cola de la hero (la pieza reemplaza
    // exactamente lo que el corte separaba).
    expect(Math.abs(px - COLA.cut.px)).toBeLessThan(30);
  });

  it('POSES: el manifiesto trae las 8 láminas del set con dimensiones reales', () => {
    const claves = ['cute', 'verlupa', 'muerta', 'crias', 'escucha-01', 'escucha-02', 'escucha-03', 'escucha-04'];
    expect(Object.keys(POSES).sort()).toEqual(claves.sort());
    for (const k of claves) {
      expect(POSES[k].archivo).toMatch(/^zariguya-gemini-/);
      expect(POSES[k].W).toBeGreaterThan(0);
      expect(POSES[k].H).toBeGreaterThan(0);
    }
  });

  it('el ciclo de escucha usa SOLO cuerpo entero (el close-up 01 sería un corte de cámara)', () => {
    expect(ESCUCHA_CICLO).not.toContain('escucha-01');
    for (const k of ESCUCHA_CICLO) expect(POSES[k]).toBeDefined();
    expect(UMBRAL_CLOSEUP).toBeGreaterThan(0);
  });
});

describe('ZariguyaGeminiLaminaViva — contrato observable (jsdom = degradación)', () => {
  it('renderiza role=img con data-creature/data-lamina y el estado crudo', () => {
    const { container } = render(<ZariguyaGeminiLaminaViva estado="listening" size={220} />);
    const raiz = container.querySelector('div[data-creature="zariguya"]');
    expect(raiz).toBeTruthy();
    expect(raiz.getAttribute('role')).toBe('img');
    expect(raiz.getAttribute('data-lamina')).toBe('gemini');
    expect(raiz.getAttribute('data-agt-estado')).toBe('listening');
  });

  it('en jsdom (sin loads de imagen) degrada a la lámina plana en modo lamina — nunca un hueco', () => {
    const { container } = render(<ZariguyaGeminiLaminaViva estado="thinking" size={220} />);
    const raiz = container.querySelector('div[data-creature="zariguya"]');
    // sin PNG cargado la pose no entra (honestidad: nunca media pose)…
    expect(raiz.getAttribute('data-modo')).toBe('lamina');
    // …y la hero plana está montada de respaldo.
    const plana = container.querySelector(`img[src="/compai/laminas/zariguya-gemini-hero.png"]`);
    expect(plana).toBeTruthy();
  });

  it("vidaForzada='crias' viaja como data-vida en idle SIN romper la honestidad de pose", () => {
    // La firma de identidad como momento especial (operador 2026-08-24): en
    // jsdom el PNG jamás carga, así que la pose NO entra (modo lamina) pero
    // el momento sí queda declarado — el host y el CSS lo leen de data-vida.
    const { container } = render(
      <ZariguyaGeminiLaminaViva estado="idle" vidaForzada="crias" size={220} />,
    );
    const raiz = container.querySelector('div[data-creature="zariguya"]');
    expect(raiz.getAttribute('data-vida')).toBe('crias');
    expect(raiz.getAttribute('data-modo')).toBe('lamina'); // nunca media pose
    // …y el PNG de la pose está montado en el plano de poses, precargando.
    expect(container.querySelector('img[data-pose-key="crias"]')).toBeTruthy();
  });

  it('con handlers expone botón real (teclado + lector de pantalla)', () => {
    const { container } = render(
      <ZariguyaGeminiLaminaViva estado="idle" onClick={() => {}} title="Zarigüeya" />,
    );
    expect(container.querySelector('button[type="button"]')).toBeTruthy();
  });
});
