/**
 * AngelitaNoSe.test.jsx — cuando Angelita NO SABE (pedido textual del
 * operador, 2026-07-21): "no sabe debe ser no con la cabeza y con el 'no sé'
 * claro en texto". Dos partes, verificadas por separado:
 *
 *   1. EL GESTO — niega con la cabeza: el estado 'no-se' agrupa cabeza+cara+
 *      antenas+gafas en `.crt-cabeza` (AbejaAngelita.jsx) para poder rotarla
 *      de lado a lado (angelita-agente.css, `agt-niega`) sin mover el resto
 *      del cuerpo.
 *   2. EL TEXTO — TEXTO_NO_SE es la frase canónica, explícita, sin rodeos
 *      ("No sé."), y BurbujaAngelita la muestra tal cual, sin recortarla.
 *
 * También cubre el prop nuevo `idleCerebro` de <Angelita> (la pausa "quieta"
 * de AngelitaEntrada lo usa para apagar el idle-cerebro grande sin tocar el
 * aleteo/boil base).
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { Angelita } from '../Angelita.jsx';
import { TEXTO_NO_SE, ARIA_DE_ESTADO } from '../angelitaEstados.js';
import BurbujaAngelita from '../BurbujaAngelita.jsx';

afterEach(cleanup);

describe('1. El gesto — niega con la cabeza', () => {
  it('estado="no-se" trae el grupo .crt-cabeza (blanco de la rotación)', () => {
    const { container } = render(<Angelita estado="no-se" animated />);
    expect(container.querySelector('svg').getAttribute('data-agt-estado')).toBe('no-se');
    expect(container.querySelector('.crt-cabeza')).toBeTruthy();
  });

  it('el grupo .crt-cabeza existe en TODOS los estados (mismo dibujo, no se re-autora)', () => {
    for (const estado of ['acompana', 'contenta', 'preocupada', 'senala']) {
      const { container, unmount } = render(<Angelita estado={estado} animated />);
      expect(container.querySelector('.crt-cabeza')).toBeTruthy();
      unmount();
    }
  });

  it('la narración aria de no-se menciona la negación con la cabeza', () => {
    expect(ARIA_DE_ESTADO['no-se']).toMatch(/niega con la cabeza/i);
    const { container } = render(<Angelita estado="no-se" animated />);
    expect(container.querySelector('svg').getAttribute('aria-label')).toMatch(/niega con la cabeza/i);
  });
});

describe('2. El texto — "No sé" claro, sin rodeos', () => {
  it('TEXTO_NO_SE es explícito y corto (no una evasiva)', () => {
    expect(TEXTO_NO_SE).toMatch(/^No sé\.?$/i);
  });

  it('BurbujaAngelita muestra "No sé" tal cual (no lo recorta ni lo diluye)', () => {
    const { container } = render(<BurbujaAngelita mensaje={TEXTO_NO_SE} animado={false} />);
    const texto = container.querySelector('.angelita-burbuja__texto');
    expect(texto.textContent).toContain('No sé');
  });
});

describe('3. idleCerebro — apaga SOLO el idle-cerebro grande (usado por la pausa quieta)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('idleCerebro=false: nunca aparece data-agt-idle, ni avanzando el reloj', () => {
    const { container } = render(<Angelita estado="acompana" animated idleCerebro={false} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(container.querySelector('svg').getAttribute('data-agt-idle')).toBeNull();
  });

  it('idleCerebro=true (default): el reloj de micro-gestos SÍ arranca', () => {
    const { container } = render(<Angelita estado="acompana" animated />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(container.querySelector('svg').getAttribute('data-agt-idle')).toBe('flota');
  });
});
