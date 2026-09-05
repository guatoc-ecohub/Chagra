/*
 * HudRendimiento — el HUD de FPS del valle no mide por su cuenta: lee el
 * instrumento de usePerformanceMonitor. Aquí se prueba (a) la calificación
 * pura, (b) el lector del flag de activación, (c) que el componente queda en
 * null salvo que el flag esté activo, y (d) que al activarlo pinta el snapshot.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import HudRendimiento, {
  ratingDeFps,
  hudRendimientoHabilitado,
} from '../HudRendimiento.jsx';
import { reiniciarCalidad, __internos } from '../usePerformanceMonitor.jsx';

const CLAVE_FLAG = 'chagra:prefs:hudFps';

function sembrarFps(fps) {
  reiniciarCalidad('alto');
  __internos.emitir(__internos.derivar('alto', 'alto', 1, false, fps));
}

describe('ratingDeFps', () => {
  it('0 o negativo o no-finito → pausa (monitor sin muestrear)', () => {
    expect(ratingDeFps(0)).toBe('pausa');
    expect(ratingDeFps(-3)).toBe('pausa');
    expect(ratingDeFps(NaN)).toBe('pausa');
  });

  it('bandas bueno/atento/lento', () => {
    expect(ratingDeFps(60)).toBe('bueno');
    expect(ratingDeFps(55)).toBe('bueno');
    expect(ratingDeFps(54)).toBe('atento');
    expect(ratingDeFps(45)).toBe('atento');
    expect(ratingDeFps(44)).toBe('lento');
    expect(ratingDeFps(12)).toBe('lento');
  });
});

describe('hudRendimientoHabilitado', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('apagado por defecto', () => {
    expect(hudRendimientoHabilitado()).toBe(false);
  });

  it('se prende con localStorage = "1"', () => {
    window.localStorage.setItem(CLAVE_FLAG, '1');
    expect(hudRendimientoHabilitado()).toBe(true);
  });

  it('se prende con ?hud en la URL', () => {
    window.history.replaceState({}, '', '/?hud');
    expect(hudRendimientoHabilitado()).toBe(true);
  });
});

describe('componente HudRendimiento', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    reiniciarCalidad('alto');
  });
  afterEach(() => cleanup());

  it('renderiza null cuando el flag está apagado', () => {
    const { container } = render(<HudRendimiento />);
    expect(container.firstChild).toBeNull();
  });

  it('con el flag activo pinta el FPS y la calificación del snapshot', () => {
    window.localStorage.setItem(CLAVE_FLAG, '1');
    sembrarFps(60);
    const { container } = render(<HudRendimiento />);
    const chip = container.querySelector('.hud-rendimiento');
    expect(chip).not.toBeNull();
    expect(chip.getAttribute('data-rating')).toBe('bueno');
    expect(chip.textContent).toContain('60 FPS');
  });

  it('muestra "--" y calificación pausa cuando el monitor no muestrea (fps 0)', () => {
    window.localStorage.setItem(CLAVE_FLAG, '1');
    sembrarFps(0);
    const { container } = render(<HudRendimiento />);
    const chip = container.querySelector('.hud-rendimiento');
    expect(chip.getAttribute('data-rating')).toBe('pausa');
    expect(chip.textContent).toContain('-- FPS');
  });
});
