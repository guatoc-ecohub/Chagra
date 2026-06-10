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
});
