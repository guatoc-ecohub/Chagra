/**
 * CompaiEntradaSalida — contrato del metrónomo de entrada/salida por especie.
 *
 *   - Angelita: los hijos salen TAL CUAL (ni un nodo de más): su entrada no cambia.
 *   - jaguar: sombra(ojosMs) → cuerpo(cuerpoMs) → quieto(quietoMs) → lista, con
 *     los ms exactos del perfil; onLista se avisa UNA vez.
 *   - reduced-motion / animated=false: sin teatro, listo de inmediato.
 *   - cambio de especie: la que se ve corre su SALIDA sosteniendo su cuerpo, y
 *     solo al terminar cede al elegido, que corre su ENTRADA.
 *   - especie sin salida (guacamaya) → cede de inmediato.
 */
import { useEffect } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompaiEntradaSalida, ESPERA_CUERPO_MAX_MS } from '../CompaiEntradaSalida.jsx';
import { PERFILES_CONDUCTA } from '../../../compai/nucleo/perfilesConducta.js';

/* Cuerpo de prueba que avisa "ya monté" como hace CompaiAgente (efecto tras el commit). */
function Cuerpo({ especie, avisar }) {
  useEffect(() => { avisar?.(especie); }, [especie, avisar]);
  return <i data-cuerpo={especie} />;
}
const cuerpo = (especie, avisar) => <Cuerpo especie={especie} avisar={avisar} />;
/* Cuerpo mudo: nunca avisa (simula un chunk que no llega). */
const cuerpoMudo = (especie) => <i data-cuerpo={especie} />;
const J = PERFILES_CONDUCTA.jaguar;

function matchMediaQuietud(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => { vi.useFakeTimers(); matchMediaQuietud(false); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const avanzar = (ms) => act(() => { vi.advanceTimersByTime(ms); });

describe('CompaiEntradaSalida — Angelita es la vara', () => {
  it('sin perfil de conducta devuelve los hijos tal cual, sin envoltorio', () => {
    const { container } = render(<CompaiEntradaSalida especie="angelita">{cuerpo}</CompaiEntradaSalida>);
    expect(container.querySelector('.compai-es')).toBeNull();
    expect(container.firstElementChild).toBe(container.querySelector('i[data-cuerpo="angelita"]'));
    expect(container.innerHTML).toBe('<i data-cuerpo="angelita"></i>');
  });

  it('hijos como nodo (no función) también pasan tal cual', () => {
    const { container } = render(<CompaiEntradaSalida especie="angelita"><b>x</b></CompaiEntradaSalida>);
    expect(container.innerHTML).toBe('<b>x</b>');
  });
});

describe('CompaiEntradaSalida — jaguar, místico desde la sombra', () => {
  it('recorre sombra → cuerpo → quieto → lista con los ms del perfil y avisa una vez', () => {
    const onLista = vi.fn();
    const { container } = render(
      <CompaiEntradaSalida especie="jaguar" onLista={onLista}>{cuerpo}</CompaiEntradaSalida>,
    );
    const env = /** @type {HTMLElement} */ (container.querySelector('.compai-es'));
    expect(env).not.toBeNull();
    expect(env.getAttribute('data-ce-tipo')).toBe('mistico-sombra');
    expect(env.getAttribute('data-ce-modo')).toBe('entrada');
    // el cuerpo avisó en su efecto → el número arranca en el siguiente tick
    expect(env.getAttribute('data-ce-fase')).toBe('espera');
    avanzar(1);
    expect(env.getAttribute('data-ce-fase')).toBe('sombra');
    expect(env.style.getPropertyValue('--ce-ms')).toBe(`${J.entrada.ojosMs}ms`);
    expect(env.style.getPropertyValue('--ce-aura')).toBe(J.aura);
    expect(container.querySelector('.compai-es__cuerpo i[data-cuerpo="jaguar"]')).not.toBeNull();

    avanzar(J.entrada.ojosMs);
    expect(env.getAttribute('data-ce-fase')).toBe('cuerpo');
    expect(env.style.getPropertyValue('--ce-ms')).toBe(`${J.entrada.cuerpoMs}ms`);

    avanzar(J.entrada.cuerpoMs);
    expect(env.getAttribute('data-ce-fase')).toBe('quieto');

    avanzar(J.entrada.quietoMs);
    expect(env.getAttribute('data-ce-fase')).toBe('lista');
    expect(env.getAttribute('data-ce-modo')).toBe('lista');
    expect(onLista).toHaveBeenCalledTimes(1);
    expect(onLista).toHaveBeenCalledWith('jaguar');

    avanzar(5000);
    expect(onLista).toHaveBeenCalledTimes(1);
    // el envoltorio se queda (no remonta el rig al terminar)
    expect(container.querySelector('.compai-es i[data-cuerpo="jaguar"]')).not.toBeNull();
  });

  it('reduced-motion: sin teatro, listo de inmediato', () => {
    matchMediaQuietud(true);
    const { container } = render(<CompaiEntradaSalida especie="jaguar">{cuerpo}</CompaiEntradaSalida>);
    expect(container.querySelector('.compai-es').getAttribute('data-ce-fase')).toBe('lista');
  });

  it('animated=false: sin teatro, listo de inmediato', () => {
    const { container } = render(<CompaiEntradaSalida especie="jaguar" animated={false}>{cuerpo}</CompaiEntradaSalida>);
    expect(container.querySelector('.compai-es').getAttribute('data-ce-fase')).toBe('lista');
  });

  it('las variables booleanas de fase se vuelven clase (luciérnaga tri-parpadeo)', () => {
    const L = PERFILES_CONDUCTA.luciernaga;
    const { container } = render(<CompaiEntradaSalida especie="luciernaga">{cuerpo}</CompaiEntradaSalida>);
    const env = /** @type {HTMLElement} */ (container.querySelector('.compai-es'));
    avanzar(1);
    expect(env.getAttribute('data-ce-fase')).toBe('luz');
    avanzar(L.entrada.luzMs);
    expect(env.getAttribute('data-ce-fase')).toBe('cuerpo');
    expect(env.classList.contains('compai-es--tri')).toBe(true);
  });

  it('las variables numéricas de fase se vuelven --ce-<nombre> (chivito squash al posarse)', () => {
    const C = PERFILES_CONDUCTA['chivito-punk'];
    const { container } = render(<CompaiEntradaSalida especie="chivito-punk">{cuerpo}</CompaiEntradaSalida>);
    const env = /** @type {HTMLElement} */ (container.querySelector('.compai-es'));
    avanzar(1);
    avanzar(C.entrada.dardoMs + C.entrada.hoverMs);
    expect(env.getAttribute('data-ce-fase')).toBe('posa');
    expect(env.style.getPropertyValue('--ce-squash')).toBe(String(C.entrada.squash));
  });
});

describe('CompaiEntradaSalida — cambio de especie', () => {
  it('jaguar → chivito: el jaguar corre su salida sosteniendo su cuerpo, luego entra el chivito', () => {
    const onSalio = vi.fn();
    const { container, rerender } = render(
      <CompaiEntradaSalida especie="jaguar" onSalio={onSalio}>{cuerpo}</CompaiEntradaSalida>,
    );
    avanzar(J.entrada.totalMs + 10);
    const env = /** @type {HTMLElement} */ (container.querySelector('.compai-es'));
    expect(env.getAttribute('data-ce-fase')).toBe('lista');

    rerender(<CompaiEntradaSalida especie="chivito-punk" onSalio={onSalio}>{cuerpo}</CompaiEntradaSalida>);
    expect(env.getAttribute('data-ce-modo')).toBe('salida');
    expect(env.getAttribute('data-ce-especie')).toBe('jaguar');
    expect(env.getAttribute('data-ce-fase')).toBe('cuerpo');
    expect(env.style.getPropertyValue('--ce-ms')).toBe(`${J.salida.cuerpoMs}ms`);
    expect(container.querySelector('i[data-cuerpo="jaguar"]')).not.toBeNull();
    expect(container.querySelector('i[data-cuerpo="chivito-punk"]')).toBeNull();

    avanzar(J.salida.cuerpoMs);
    expect(env.getAttribute('data-ce-fase')).toBe('ojos');
    expect(container.querySelector('i[data-cuerpo="jaguar"]')).not.toBeNull();

    avanzar(J.salida.ojosMs);
    expect(onSalio).toHaveBeenCalledTimes(1);
    expect(onSalio).toHaveBeenCalledWith('jaguar');
    const env2 = /** @type {HTMLElement} */ (container.querySelector('.compai-es'));
    expect(env2.getAttribute('data-ce-especie')).toBe('chivito-punk');
    expect(env2.getAttribute('data-ce-tipo')).toBe('dardo');
    expect(env2.getAttribute('data-ce-modo')).toBe('entrada');
    expect(env2.getAttribute('data-ce-fase')).toBe('espera');
    avanzar(1);
    expect(env2.getAttribute('data-ce-fase')).toBe('dardo');
    expect(container.querySelector('i[data-cuerpo="chivito-punk"]')).not.toBeNull();
    expect(container.querySelector('i[data-cuerpo="jaguar"]')).toBeNull();
  });

  it('guacamaya → angelita: sin salida declarada con tiempos, cede de inmediato y Angelita queda sin envoltorio', () => {
    const { container, rerender } = render(<CompaiEntradaSalida especie="guacamaya">{cuerpo}</CompaiEntradaSalida>);
    expect(container.querySelector('.compai-es[data-ce-tipo="teatral"]')).not.toBeNull();
    rerender(<CompaiEntradaSalida especie="angelita">{cuerpo}</CompaiEntradaSalida>);
    expect(container.querySelector('.compai-es')).toBeNull();
    expect(container.innerHTML).toBe('<i data-cuerpo="angelita"></i>');
  });

  it('angelita → jaguar: entra el jaguar con su número, Angelita no tenía nada que correr', () => {
    const { container, rerender } = render(<CompaiEntradaSalida especie="angelita">{cuerpo}</CompaiEntradaSalida>);
    rerender(<CompaiEntradaSalida especie="jaguar">{cuerpo}</CompaiEntradaSalida>);
    const env = /** @type {HTMLElement} */ (container.querySelector('.compai-es'));
    expect(env.getAttribute('data-ce-modo')).toBe('entrada');
    avanzar(1);
    expect(env.getAttribute('data-ce-fase')).toBe('sombra');
  });

  it('con reduced-motion el cambio de especie es un corte digno', () => {
    matchMediaQuietud(true);
    const { container, rerender } = render(<CompaiEntradaSalida especie="jaguar">{cuerpo}</CompaiEntradaSalida>);
    rerender(<CompaiEntradaSalida especie="chivito-punk">{cuerpo}</CompaiEntradaSalida>);
    const env = /** @type {HTMLElement} */ (container.querySelector('.compai-es'));
    expect(env.getAttribute('data-ce-especie')).toBe('chivito-punk');
    expect(env.getAttribute('data-ce-fase')).toBe('lista');
  });

  it('sin aviso del cuerpo (chunk que no llega) espera y arranca igual al tope', () => {
    const { container } = render(<CompaiEntradaSalida especie="jaguar">{cuerpoMudo}</CompaiEntradaSalida>);
    const env = /** @type {HTMLElement} */ (container.querySelector('.compai-es'));
    expect(env.getAttribute('data-ce-fase')).toBe('espera');
    avanzar(ESPERA_CUERPO_MAX_MS - 1);
    expect(env.getAttribute('data-ce-fase')).toBe('espera');
    avanzar(2);
    expect(env.getAttribute('data-ce-fase')).toBe('sombra');
  });

  it('el aviso tardío del cuerpo arranca la entrada en ese momento, no antes', () => {
    let avisarCapturado = null;
    const tardio = (especie, avisar) => { avisarCapturado = avisar; return <i data-cuerpo={especie} />; };
    const { container } = render(<CompaiEntradaSalida especie="jaguar">{tardio}</CompaiEntradaSalida>);
    const env = /** @type {HTMLElement} */ (container.querySelector('.compai-es'));
    avanzar(1500);
    expect(env.getAttribute('data-ce-fase')).toBe('espera');
    act(() => { avisarCapturado('jaguar'); });
    avanzar(1);
    expect(env.getAttribute('data-ce-fase')).toBe('sombra');
    avanzar(J.entrada.ojosMs);
    expect(env.getAttribute('data-ce-fase')).toBe('cuerpo');
  });

  it('al desmontar no quedan temporizadores vivos', () => {
    const { unmount } = render(<CompaiEntradaSalida especie="jaguar">{cuerpo}</CompaiEntradaSalida>);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
