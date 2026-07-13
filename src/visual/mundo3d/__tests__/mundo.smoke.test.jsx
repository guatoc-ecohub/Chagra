import React from 'react';
import { act, render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  describe, test, expect, afterEach, vi,
} from 'vitest';

import Mundo, { CARGA_3D_TIMEOUT_MS } from '../Mundo.jsx';
import { resolverMundo } from '../resolverMundo.js';
import { MUNDO } from '../mundoData.js';
import { ARQUETIPOS, ARQUETIPOS_3D, ARQUETIPOS_2D } from '../arquetipos.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('framework de mundos — resolución data-driven (2D + 3D)', () => {
  test('arquetipos: 5 dioramas 3D + arquetipos 2D de primera clase', () => {
    expect(ARQUETIPOS_3D.sort()).toEqual(['boveda', 'cafe', 'cutaway', 'estratos', 'flujo', 'mercado', 'micorrizas', 'recinto', 'sanidad', 'semillero', 'valle']);
    ['lamina', 'infografia', 'ficha', 'mirror', 'valle2d'].forEach((k) => {
      expect(ARQUETIPOS_2D).toContain(k);
      expect(ARQUETIPOS[k].dim).toBe('2d');
    });
  });

  test('tier decide 3D vs 2D para un mundo SÍ-3D (suelo → cutaway)', () => {
    const alto = resolverMundo('suelo', 'alto');
    expect(alto.modo).toBe('3d');
    expect(alto.escena).toBe('cutaway');
    // equipo humilde → cae al espejo 2D del arquetipo, con su motivo
    const bajo = resolverMundo('suelo', 'bajo');
    expect(bajo.modo).toBe('2d');
    expect(bajo.escena).toBe('mirror');
    expect(bajo.motivo).toBe('cutaway');
  });

  test('un mundo 2D-dato declara su arquetipo DIRECTO (frutales → ficha)', () => {
    const r = resolverMundo('frutales', 'alto'); // aun en tier alto sigue 2D
    expect(r.modo).toBe('2d');
    expect(r.escena).toBe('ficha');
  });

  test('el mercado sube al arquetipo 3D nuevo `mercado` (y degrada a su ficha 2D)', () => {
    const alto = resolverMundo('mercado', 'alto');
    expect(alto.modo).toBe('3d');
    expect(alto.escena).toBe('mercado');
    // equipo humilde → cae a su fallback2d declarado (la infografía del mercado)
    const bajo = resolverMundo('mercado', 'bajo');
    expect(bajo.modo).toBe('2d');
    expect(bajo.escena).toBe('infografia');
  });

  test('el café sube al arquetipo 3D nuevo `cafe` (y degrada a su ficha 2D)', () => {
    const alto = resolverMundo('cafe', 'alto');
    expect(alto.modo).toBe('3d');
    expect(alto.escena).toBe('cafe');
    // equipo humilde → cae a su fallback2d declarado (la infografía del café)
    const bajo = resolverMundo('cafe', 'bajo');
    expect(bajo.modo).toBe('2d');
    expect(bajo.escena).toBe('infografia');
  });

  test('el clima sube al arquetipo 3D nuevo `boveda` (y degrada a su espejo 2D)', () => {
    const alto = resolverMundo('clima', 'alto');
    expect(alto.modo).toBe('3d');
    expect(alto.escena).toBe('boveda');
    // equipo humilde → cae al espejo 2D (mirror con motivo `boveda`)
    const bajo = resolverMundo('clima', 'bajo');
    expect(bajo.modo).toBe('2d');
    expect(bajo.escena).toBe('mirror');
    expect(bajo.motivo).toBe('boveda');
  });

  test('todo hotspot.view existe (reachability básica del registro)', () => {
    Object.values(MUNDO).forEach((d) => {
      (d.hotspots || []).forEach((h) => {
        expect(typeof h.view).toBe('string');
        expect(h.view.length).toBeGreaterThan(0);
      });
    });
  });

  test('<Mundo> monta un mundo 2D sin lanzar (sin three, three-free)', () => {
    // frutales es 2D nativo (ficha); no monta Canvas → seguro en jsdom.
    const { container } = render(
      <Mundo mundoId="frutales" tier="alto" onHotspot={() => {}} onSalir={() => {}} />,
    );
    expect(container.querySelector('.mundo-root[data-dim="2d"]')).toBeInTheDocument();
    // el espejo 2D de un 3D degradado también es three-free:
    cleanup();
    const { container: c2 } = render(
      <Mundo mundoId="suelo" tier="bajo" onHotspot={() => {}} onSalir={() => {}} />,
    );
    expect(c2.querySelector('.mundo-root[data-dim="2d"]')).toBeInTheDocument();
  });

  test('espera 15 segundos y reserva una fila propia para el aviso de caída 3D', () => {
    vi.useFakeTimers();
    const { container } = render(<Mundo mundoId="cafe" tier="alto" />);

    act(() => vi.advanceTimersByTime(CARGA_3D_TIMEOUT_MS - 1));
    expect(container.querySelector('[data-caida3d="1"]')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    const raiz = container.querySelector('[data-caida3d="1"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz.querySelector('.mundo-caida__contenido')).toContainElement(
      raiz.querySelector('.mundo2d'),
    );
    expect(raiz.querySelector('.mundo-caida')).toBeInTheDocument();
  });
});
