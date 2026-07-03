import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ChivitoAve, ChivitoEscena, ChivitoBoton, ChivitoCruza } from '../Chivito';
import { chivitoActivo } from '../../../config/chivitoFlag';

/** @type {Record<string, string | boolean | undefined>} */
const chivitoEnv = import.meta.env;

/** @type {MediaQueryList} */
const reducedMotionMql = {
  matches: true,
  media: '(prefers-reduced-motion: reduce)',
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
};

describe('chivitoFlag', () => {
  const orig = chivitoEnv.VITE_CHIVITO;
  beforeEach(() => { chivitoEnv.VITE_CHIVITO = orig; });

  it('false cuando la flag está apagada o con valor no reconocido', () => {
    chivitoEnv.VITE_CHIVITO = undefined;
    expect(chivitoActivo()).toBe(false);
    chivitoEnv.VITE_CHIVITO = 'nope';
    expect(chivitoActivo()).toBe(false);
    chivitoEnv.VITE_CHIVITO = 'false';
    expect(chivitoActivo()).toBe(false);
  });

  it('true con true/1 y con los valores legados del A/B (a/b/ab)', () => {
    chivitoEnv.VITE_CHIVITO = 'true';
    expect(chivitoActivo()).toBe(true);
    chivitoEnv.VITE_CHIVITO = ' 1 ';
    expect(chivitoActivo()).toBe(true);
    chivitoEnv.VITE_CHIVITO = 'a';
    expect(chivitoActivo()).toBe(true);
    chivitoEnv.VITE_CHIVITO = 'B';
    expect(chivitoActivo()).toBe(true);
    chivitoEnv.VITE_CHIVITO = ' AB ';
    expect(chivitoActivo()).toBe(true);
  });
});

describe('Chivito piezas SVG', () => {
  it('ChivitoAve dibuja SVG (cero assets/red)', () => {
    const { container } = render(<ChivitoAve size={100} />);
    expect(container.querySelector('svg')).toBeTruthy();
    // sin <img> ni <video> — es puro vectorial, offline-first.
    expect(container.querySelector('img,video')).toBeNull();
  });

  it('ChivitoAve tiene la barba iridiscente (verde→violeta) y el brillo animado', () => {
    const { container } = render(<ChivitoAve size={120} />);
    expect(container.querySelector('.chivito')).toBeTruthy();
    expect(container.querySelector('.chiv-barba-brillo')).toBeTruthy();
    // gradiente de la barba declarado en <defs>
    const grads = [...container.querySelectorAll('linearGradient')].map((g) => g.id);
    expect(grads.some((id) => id.includes('barba'))).toBe(true);
  });

  it('ChivitoEscena expone el ave y la flor del frailejón con aria-label', () => {
    const { container } = render(<ChivitoEscena size={180} />);
    expect(container.querySelector('.chiv-escena')).toBeTruthy();
    expect(container.querySelector('.chiv-frailejon-svg')).toBeTruthy();
    expect(container.querySelector('.chiv-ave-wrap')).toBeTruthy();
    expect(container.querySelector('[aria-label*="frailejón"]')).toBeTruthy();
  });

  it('ChivitoEscena integra el ave al 55% del ancho de la escena', () => {
    const { container } = render(<ChivitoEscena size={200} />);
    const ave = /** @type {HTMLElement | null} */ (container.querySelector('.chiv-ave-wrap .chivito'));
    expect(ave).toBeTruthy();
    expect(ave?.style.width).toBe('110px'); // 200 * 0.55
  });

  it('ChivitoBoton marca is-active en thinking/speaking y expone aria-label', () => {
    const { container, rerender } = render(<ChivitoBoton state="idle" ariaLabel="Enviar al agente" />);
    expect(container.querySelector('.chiv-boton.is-active')).toBeNull();
    expect(container.querySelector('[aria-label="Enviar al agente"]')).toBeTruthy();
    rerender(<ChivitoBoton state="thinking" ariaLabel="Enviar al agente" />);
    expect(container.querySelector('.chiv-boton.is-active')).toBeTruthy();
  });

  it('ChivitoCruza sin animación cuando prefers-reduced-motion', () => {
    const spy = vi.spyOn(window, 'matchMedia').mockReturnValue(reducedMotionMql);
    const { container } = render(<ChivitoCruza />);
    // el ave no lleva la clase de aleteo cuando se reduce el movimiento
    expect(container.querySelector('.chivito.is-flap')).toBeNull();
    spy.mockRestore();
  });
});
