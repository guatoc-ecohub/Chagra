/**
 * CicloVivoWidget.test.jsx — la tarjeta portal del home.
 * Verifica que el resumen de estados sale de la fuente de verdad
 * (`/chagra-stats.json` mockeado) y que abre la vista full-screen.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CicloVivoWidget from './CicloVivoWidget';
import { PHASES } from './cicloVivoData';

/** Construye un mapa de capacidades: todo 'activo', con overrides puntuales. */
function buildCaps(overrides = {}) {
  const caps = {};
  for (const fase of PHASES) {
    for (const fn of fase.functions) {
      caps[fn.cap] = { estado: 'activo', view: 'x', nota: '' };
    }
  }
  for (const [id, estado] of Object.entries(overrides)) {
    caps[id] = { estado, view: estado === 'proximamente' ? null : 'x', nota: '' };
  }
  return caps;
}

function stubStatsFetch(caps) {
  vi.stubGlobal('fetch', vi.fn((url) => {
    if (String(url).includes('/chagra-stats.json')) {
      return Promise.resolve({ ok: true, json: async () => ({ capacidades: caps }) });
    }
    return Promise.reject(new Error('unexpected fetch: ' + url));
  }));
}

describe('CicloVivoWidget', () => {
  beforeEach(() => { try { globalThis.localStorage.clear(); } catch { /* ignore */ } });
  afterEach(() => vi.unstubAllGlobals());

  it('refleja el conteo de "en camino" desde la fuente de verdad', async () => {
    stubStatsFetch(buildCaps({ viabilidad_semilla: 'proximamente', guardar_semilla: 'proximamente' }));
    render(<CicloVivoWidget onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('2 en camino')).toBeInTheDocument();
    });
  });

  it('abre la vista full-screen al tocar la tarjeta', async () => {
    stubStatsFetch(buildCaps());
    const onNavigate = vi.fn();
    render(<CicloVivoWidget onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /El Ciclo Vivo/i }));
    expect(onNavigate).toHaveBeenCalledWith('ciclo_vivo');
  });

  it('renderiza sin romperse aunque el fetch falle (usa respaldo offline)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('404'))));
    render(<CicloVivoWidget onNavigate={() => {}} />);
    // El respaldo trae 2 funciones 'proximamente' (viabilidad + guardar semilla).
    await waitFor(() => {
      expect(screen.getByText(/en camino/)).toBeInTheDocument();
    });
  });
});
