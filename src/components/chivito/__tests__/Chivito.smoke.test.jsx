import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ChivitoAve, ChivitoEscena, ChivitoBoton, ChivitoCruza } from '../Chivito';
import { chivitoMockup } from '../../../config/chivitoFlag';

describe('chivitoFlag', () => {
  const orig = import.meta.env.VITE_CHIVITO;
  beforeEach(() => { import.meta.env.VITE_CHIVITO = orig; });

  it('null cuando la flag está apagada o con valor no reconocido', () => {
    import.meta.env.VITE_CHIVITO = undefined;
    expect(chivitoMockup()).toBeNull();
    import.meta.env.VITE_CHIVITO = 'nope';
    expect(chivitoMockup()).toBeNull();
  });

  it('mapea a/b/ab y true/1 → ab', () => {
    import.meta.env.VITE_CHIVITO = 'a';
    expect(chivitoMockup()).toBe('a');
    import.meta.env.VITE_CHIVITO = 'B';
    expect(chivitoMockup()).toBe('b');
    import.meta.env.VITE_CHIVITO = ' AB ';
    expect(chivitoMockup()).toBe('ab');
    import.meta.env.VITE_CHIVITO = '1';
    expect(chivitoMockup()).toBe('ab');
    import.meta.env.VITE_CHIVITO = 'true';
    expect(chivitoMockup()).toBe('ab');
  });
});

describe('Chivito piezas SVG', () => {
  it('ChivitoAve dibuja SVG en ambos mockups (cero assets/red)', () => {
    const { container: a } = render(<ChivitoAve mockup="a" size={100} />);
    const { container: b } = render(<ChivitoAve mockup="b" size={100} />);
    expect(a.querySelector('svg')).toBeTruthy();
    expect(b.querySelector('svg')).toBeTruthy();
    // sin <img> ni <video> — es puro vectorial, offline-first.
    expect(a.querySelector('img,video')).toBeNull();
    expect(b.querySelector('img,video')).toBeNull();
  });

  it('ChivitoAve B tiene la barba iridiscente (verde→violeta) y el brillo animado', () => {
    const { container } = render(<ChivitoAve mockup="b" size={120} />);
    expect(container.querySelector('.chiv-b')).toBeTruthy();
    expect(container.querySelector('.chiv-barba-brillo')).toBeTruthy();
    // gradiente de la barba declarado en <defs>
    const grads = [...container.querySelectorAll('linearGradient')].map((g) => g.id);
    expect(grads.some((id) => id.includes('barba'))).toBe(true);
  });

  it('ChivitoEscena expone el ave y la flor del frailejón con aria-label', () => {
    const { container } = render(<ChivitoEscena mockup="b" size={180} />);
    expect(container.querySelector('.chiv-escena')).toBeTruthy();
    expect(container.querySelector('.chiv-frailejon-svg')).toBeTruthy();
    expect(container.querySelector('.chiv-ave-wrap')).toBeTruthy();
    expect(container.querySelector('[aria-label*="frailejón"]')).toBeTruthy();
  });

  it('ChivitoBoton marca is-active en thinking/speaking y expone aria-label', () => {
    const { container, rerender } = render(<ChivitoBoton mockup="a" state="idle" ariaLabel="Enviar al agente" />);
    expect(container.querySelector('.chiv-boton.is-active')).toBeNull();
    expect(container.querySelector('[aria-label="Enviar al agente"]')).toBeTruthy();
    rerender(<ChivitoBoton mockup="a" state="thinking" ariaLabel="Enviar al agente" />);
    expect(container.querySelector('.chiv-boton.is-active')).toBeTruthy();
  });

  it('ChivitoCruza sin animación cuando prefers-reduced-motion', () => {
    const spy = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
    const { container } = render(<ChivitoCruza mockup="b" />);
    // el ave no lleva la clase de aleteo cuando se reduce el movimiento
    expect(container.querySelector('.chivito.is-flap')).toBeNull();
    spy.mockRestore();
  });
});
