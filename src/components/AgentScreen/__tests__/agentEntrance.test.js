/**
 * agentEntrance.test.js — contrato de la animación de ENTRADA al AgentScreen.
 *
 * B1 (2026-06-02): el operador reportó que la transición home→agente "es muy
 * rápida y casi no se nota". El compositor del home ya animaba el envío, pero el
 * cambio de pantalla era un corte seco. Acá probamos el módulo PURO que define
 * la animación de entrada: duración deliberada (400–600ms), respeto a
 * prefers-reduced-motion, y CSS con el @media de reducción de movimiento.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  AGENT_ENTRANCE_MS,
  AGENT_ENTRANCE_CLASS,
  AGENT_ENTRANCE_CSS,
  agentEntranceClass,
  prefersReducedMotion,
} from '../agentEntrance.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubReducedMotion(matches) {
  vi.stubGlobal('matchMedia', (q) => ({
    matches: q.includes('reduce') ? matches : false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('agentEntrance — duración deliberada', () => {
  it('la duración está en el rango pedido (400–600ms): perceptible, no lenta', () => {
    expect(AGENT_ENTRANCE_MS).toBeGreaterThanOrEqual(400);
    expect(AGENT_ENTRANCE_MS).toBeLessThanOrEqual(600);
  });

  it('el CSS usa esa misma duración (sin números mágicos desincronizados)', () => {
    expect(AGENT_ENTRANCE_CSS).toContain(`${AGENT_ENTRANCE_MS}ms`);
  });
});

describe('agentEntrance — respeta prefers-reduced-motion', () => {
  it('con reduced-motion → no emite la clase de animación', () => {
    stubReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(agentEntranceClass()).toBe('');
  });

  it('sin reduced-motion → emite la clase de entrada', () => {
    stubReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(agentEntranceClass()).toBe(AGENT_ENTRANCE_CLASS);
  });

  it('acepta override explícito (para tests deterministas)', () => {
    expect(agentEntranceClass(true)).toBe('');
    expect(agentEntranceClass(false)).toBe(AGENT_ENTRANCE_CLASS);
  });

  it('el CSS desactiva la animación bajo @media (prefers-reduced-motion: reduce)', () => {
    expect(AGENT_ENTRANCE_CSS).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    // Dentro del media query, la clase pone animation: none.
    const mediaBlock = AGENT_ENTRANCE_CSS.slice(
      AGENT_ENTRANCE_CSS.indexOf('@media'),
    );
    expect(mediaBlock).toContain(AGENT_ENTRANCE_CLASS);
    expect(mediaBlock).toMatch(/animation:\s*none/);
  });
});

describe('agentEntrance — tolerante a entornos sin matchMedia', () => {
  it('sin window.matchMedia → asume no-reduce (anima)', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
    expect(agentEntranceClass()).toBe(AGENT_ENTRANCE_CLASS);
  });
});
