/**
 * AgentRedMenu — smoke: el menú-red (la mano nueva) renderiza sin crashear en
 * jsdom (ResizeObserver stubbeado) y monta su raíz. La interacción fina
 * (despliegue de ramas, onPick) se valida en vivo con chromium.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// jsdom no trae ResizeObserver (lo usa el motor de geometría viva).
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

import AgentRedMenu from '../AgentRedMenu';

afterEach(() => cleanup());

describe('AgentRedMenu — smoke', () => {
  it('renderiza sin crashear y monta la raíz', () => {
    const { container } = render(<AgentRedMenu onPick={vi.fn()} />);
    expect(container.querySelector('.arm-root')).toBeTruthy();
  });

  it('NO duplica la Ⓐ: el menú no trae nodo raíz propio (la raíz es el botón Ⓐ del hero)', () => {
    const { container } = render(<AgentRedMenu onPick={vi.fn()} />);
    // Operador 2026-06-10: una SOLA Ⓐ — la del botón del agente (AgentHero).
    // El menú no renderiza su propio nodo Ⓐ; la red nace del ancla del padre.
    expect(container.querySelector('.arm-rootn')).toBeNull();
    // ningún nodo interactivo del menú pinta el glifo Ⓐ (el <style> no cuenta)
    expect(container.querySelector('.arm-nodes').textContent).not.toContain('Ⓐ');
  });

  it('acepta el ancla del botón Ⓐ del hero (anchorRef) sin crashear', () => {
    const anchorRef = { current: null };
    const { container } = render(<AgentRedMenu onPick={vi.fn()} anchorRef={anchorRef} />);
    expect(container.querySelector('.arm-root')).toBeTruthy();
  });
});
