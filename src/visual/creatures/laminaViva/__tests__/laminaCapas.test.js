import { describe, it, expect } from 'vitest';
import { hornearLamina, haySoporteCanvas } from '../laminaCapas.js';
import { LAMINA_ANATOMIA } from '../laminaAnatomia.js';

describe('laminaCapas — hornearLamina() nunca revienta sin soporte de canvas', () => {
  it('haySoporteCanvas() responde sin lanzar (jsdom típicamente NO implementa 2D context)', () => {
    expect(typeof haySoporteCanvas()).toBe('boolean');
  });

  it('sin soporte de canvas 2D, hornearLamina() degrada a null (nunca truena, nunca dibuja un rectángulo vacío)', () => {
    if (haySoporteCanvas()) return; // este entorno SÍ tiene canvas real: el otro test cubre ese camino
    /** @type {HTMLImageElement} */
    const imgFalso = /** @type {any} */ ({ naturalWidth: 400, naturalHeight: 300 });
    const capas = hornearLamina(imgFalso, LAMINA_ANATOMIA.angelita);
    expect(capas).toBeNull();
  });

  it('imagen sin dimensiones (0x0) degrada a null en vez de crear un canvas vacío', () => {
    /** @type {HTMLImageElement} */
    const imgVacio = /** @type {any} */ ({ naturalWidth: 0, naturalHeight: 0 });
    const anatomiaSinFallback = { ...LAMINA_ANATOMIA.angelita, ancho: 0, altoPx: 0 };
    expect(hornearLamina(imgVacio, anatomiaSinFallback)).toBeNull();
  });
});

describe('laminaCapas — la anatomía medida es internamente consistente', () => {
  for (const [tipo, cfg] of Object.entries(LAMINA_ANATOMIA)) {
    it(`${tipo}: ojos y pivCuello caen dentro del lienzo (${cfg.ancho}x${cfg.altoPx})`, () => {
      expect(cfg.ojos.length).toBeGreaterThan(0);
      for (const ojo of cfg.ojos) {
        expect(ojo.cx).toBeGreaterThanOrEqual(0);
        expect(ojo.cx).toBeLessThanOrEqual(cfg.ancho);
        expect(ojo.cy).toBeGreaterThanOrEqual(0);
        expect(ojo.cy).toBeLessThanOrEqual(cfg.altoPx);
        expect(ojo.r).toBeGreaterThan(0);
      }
      const [px, py] = cfg.pivCuello;
      expect(px).toBeGreaterThanOrEqual(0);
      expect(px).toBeLessThanOrEqual(cfg.ancho);
      expect(py).toBeGreaterThanOrEqual(0);
      expect(py).toBeLessThanOrEqual(cfg.altoPx);
    });

    it(`${tipo}: la normal del corte de cuello está unitaria (o cerca) — la proyección u no se escala sola`, () => {
      const { nx, ny } = cfg.cuello;
      const mag = Math.hypot(nx, ny);
      expect(mag).toBeGreaterThan(0.95);
      expect(mag).toBeLessThan(1.05);
    });
  }
});
