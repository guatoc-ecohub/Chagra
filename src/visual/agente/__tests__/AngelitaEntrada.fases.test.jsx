/**
 * AngelitaEntrada.fases.test.jsx — el ORDEN NUEVO de la entrada teatral
 * (pedido textual del operador, 2026-07-21): "cambia el orden para que esté
 * estática uno o dos segundos en el fondo, hace su entrada magistral, y si es
 * el caso se pone las gafas que se vea y resalte, con un brillito temporal
 * cuando ya queda lista."
 *
 * Secuencia verificada: espera → asoma → QUIETA (nueva, estática, idle-cerebro
 * apagado) → crece (overshoot) → gafas (YA a tamaño completo, si hay sol) →
 * BRILLO (nuevo, remate que se apaga solo) → lista. Las duraciones (ms) deben
 * seguir coincidiendo con los keyframes de angelita-missminutes.css.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { AngelitaEntrada } from '../AngelitaEntrada.jsx';

afterEach(cleanup);

const fase = (container) => {
  const el = container.querySelector('.ang-entrada');
  const clase = Array.from(el.classList).find((c) => c.startsWith('ang-entrada--'));
  return clase.replace('ang-entrada--', '');
};

const gafasAttr = (container) => container.querySelector('[data-gafas]')?.getAttribute('data-gafas') ?? null;
const lineboilAttr = (container) => container.querySelector('[data-lineboil]')?.getAttribute('data-lineboil') ?? null;

describe('AngelitaEntrada — secuencia nueva (soleado)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('recorre espera→asoma→quieta→crece→gafas→brillo→lista, en orden', () => {
    // Fronteras acumuladas (ms desde el montaje), a partir de las constantes
    // del JS: asoma [0,1250) → quieta [1250,2750) → crece [2750,4050) →
    // gafas [4050,5700) → brillo [5700,6350) → lista desde 6350.
    const { container } = render(<AngelitaEntrada activa clima="soleado" />);

    // Arranca en 'espera' (retrasoMs=0 aún no corrió el primer timer).
    expect(fase(container)).toBe('espera');

    act(() => { vi.advanceTimersByTime(0); });
    expect(fase(container)).toBe('asoma');

    // Todavía en 'asoma' justo antes de que cierre (frontera en 1250ms).
    act(() => { vi.advanceTimersByTime(1200); }); // t=1200
    expect(fase(container)).toBe('asoma');
    act(() => { vi.advanceTimersByTime(100); }); // t=1300 (cruza 1250)
    expect(fase(container)).toBe('quieta');

    // 'quieta' se sostiene ~1.5s completos (nada que distraiga: sin idle-cerebro).
    act(() => { vi.advanceTimersByTime(1400); }); // t=2700
    expect(fase(container)).toBe('quieta');
    act(() => { vi.advanceTimersByTime(100); }); // t=2800 (cruza 2750)
    expect(fase(container)).toBe('crece');

    // 'crece' dura 1300ms — la entrada magistral (overshoot).
    act(() => { vi.advanceTimersByTime(1200); }); // t=4000
    expect(fase(container)).toBe('crece');
    act(() => { vi.advanceTimersByTime(100); }); // t=4100 (cruza 4050)
    expect(fase(container)).toBe('gafas');

    // Las gafas caen YA a tamaño completo (soleado): fase 'gafas' dura 1650ms.
    act(() => { vi.advanceTimersByTime(1550); }); // t=5650
    expect(fase(container)).toBe('gafas');
    act(() => { vi.advanceTimersByTime(100); }); // t=5750 (cruza 5700)
    expect(fase(container)).toBe('brillo');

    // El brillito remata rápido (650ms) y se apaga solo pasando a 'lista'.
    act(() => { vi.advanceTimersByTime(700); }); // t=6450 (cruza 6350)
    expect(fase(container)).toBe('lista');
  });

  it('las gafas están OFF durante asoma/quieta/crece y YA a tamaño completo cuando caen', () => {
    const { container } = render(<AngelitaEntrada activa clima="soleado" />);
    act(() => { vi.advanceTimersByTime(0); }); // asoma
    expect(gafasAttr(container)).toBeNull();
    act(() => { vi.advanceTimersByTime(1260); }); // quieta
    expect(fase(container)).toBe('quieta');
    expect(gafasAttr(container)).toBeNull();
    act(() => { vi.advanceTimersByTime(1600); }); // crece
    expect(fase(container)).toBe('crece');
    expect(gafasAttr(container)).toBeNull();
    act(() => { vi.advanceTimersByTime(1350); }); // gafas
    expect(fase(container)).toBe('gafas');
    expect(gafasAttr(container)).toBe('poniendose');
    // Y en esta fase el wrapper de escala YA quedó a tamaño completo (sin
    // scale chiquito) — se ven y resaltan, no se pierden.
    const escala = container.querySelector('.ang-entrada__escala');
    expect(escala.className).toContain('ang-entrada__escala');
  });

  it('el line-boil (momento heroico) se apaga en la pausa quieta', () => {
    const { container } = render(<AngelitaEntrada activa clima="soleado" />);
    act(() => { vi.advanceTimersByTime(0); }); // asoma
    expect(fase(container)).toBe('asoma');
    expect(lineboilAttr(container)).toBe('1');
    act(() => { vi.advanceTimersByTime(1260); }); // quieta
    expect(fase(container)).toBe('quieta');
    expect(lineboilAttr(container)).toBeNull();
  });

  it('onLista se dispara UNA sola vez, solo al llegar a "lista"', () => {
    const onLista = vi.fn();
    render(<AngelitaEntrada activa clima="soleado" onLista={onLista} />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(onLista).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1250 + 1500 + 1300 + 1650 + 650 + 50); });
    expect(onLista).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onLista).toHaveBeenCalledTimes(1);
  });
});

describe('AngelitaEntrada — nublado (sin gafas)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('salta de crece directo a brillo (sin fase gafas)', () => {
    const { container } = render(<AngelitaEntrada activa clima={null} />);
    act(() => { vi.advanceTimersByTime(0); }); // asoma
    act(() => { vi.advanceTimersByTime(1260); }); // quieta
    act(() => { vi.advanceTimersByTime(1600); }); // crece
    expect(fase(container)).toBe('crece');
    act(() => { vi.advanceTimersByTime(1350); }); // brillo (nunca 'gafas')
    expect(fase(container)).toBe('brillo');
    expect(gafasAttr(container)).toBeNull();
  });
});

describe('AngelitaEntrada — reduced motion / animated=false: sin teatro', () => {
  it('cae YA en "lista" (sin recorrer fases) y con gafas puestas si hay sol', () => {
    const { container } = render(<AngelitaEntrada activa clima="soleado" animated={false} />);
    expect(fase(container)).toBe('lista');
    expect(gafasAttr(container)).toBe('1');
  });

  it('respeta prefers-reduced-motion aunque animated=true', () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const { container } = render(<AngelitaEntrada activa clima="soleado" />);
    expect(fase(container)).toBe('lista');
    window.matchMedia = original;
  });
});
