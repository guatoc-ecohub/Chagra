/**
 * ArbolDeMundos — el menú-árbol orgánico del home biopunk NO es navegación
 * huérfana: cada rama enruta EXACTO igual que su tarjeta del menú vivo
 * (fuente única mundosFinca.js), respeta el gate de Animales, es operable
 * por teclado y solo se monta con la piel biopunk.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';

// El reloj del frailejón (hijo) consulta IDB — acá se mockea el servicio para
// aislar el árbol; el reloj tiene su propio spec (RelojFrailejon.test.jsx).
vi.mock('../../../services/fincaClockService', () => ({
  getAniosFinca: vi.fn().mockResolvedValue({
    primerAnio: 2026,
    anioActual: 2026,
    anios: [2026],
    fincaNueva: true,
    fuente: 'finca-nueva',
  }),
}));

import { MUNDOS_FINCA } from '../mundosFinca';
import ArbolDeMundos from '../ArbolDeMundos';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

beforeEach(() => {
  // Tema default (biopunk2): el árbol se monta.
  localStorage.clear();
});

const rama = (id) => screen.getByTestId(`arbol-rama-${id}`);

describe('ArbolDeMundos — una rama viva por mundo real', () => {
  test('dibuja una rama-botón por CADA mundo del manifiesto (finca con animales)', () => {
    render(<ArbolDeMundos onNavigate={vi.fn()} mostrarAnimales plantsCount={0} />);
    for (const m of MUNDOS_FINCA) {
      const nodo = rama(m.id);
      expect(nodo).toBeInTheDocument();
      expect(nodo).toHaveAttribute('role', 'button');
      expect(nodo).toHaveAttribute('tabindex', '0');
      expect(nodo.getAttribute('aria-label')).toContain(`Entrar al mundo ${m.titulo}`);
    }
  });

  test('GROUNDED: sin animales en el perfil, esa rama NO brota (mismo gate de la grilla)', () => {
    render(<ArbolDeMundos onNavigate={vi.fn()} mostrarAnimales={false} plantsCount={0} />);
    expect(screen.queryByTestId('arbol-rama-animales')).not.toBeInTheDocument();
    expect(screen.getByTestId('arbol-rama-cultivos')).toBeInTheDocument();
  });

  test('GROUNDED: la rama de cultivos muestra el conteo REAL de matas', () => {
    render(<ArbolDeMundos onNavigate={vi.fn()} mostrarAnimales plantsCount={3} />);
    expect(screen.getByText('3 MATAS SEMBRADAS')).toBeInTheDocument();
  });

  test('la invitación del mockup está presente: "toque una rama para entrar a su mundo"', () => {
    render(<ArbolDeMundos onNavigate={vi.fn()} mostrarAnimales plantsCount={0} />);
    expect(screen.getAllByText(/toque una rama para entrar a su mundo/i).length).toBeGreaterThan(0);
  });
});

describe('ArbolDeMundos — enruta a los MISMOS destinos que el menú vivo (no huérfano)', () => {
  test('mundo con portada (cultivos) → onNavigate(portada)', () => {
    const onNavigate = vi.fn();
    render(<ArbolDeMundos onNavigate={onNavigate} mostrarAnimales plantsCount={0} />);
    fireEvent.click(rama('cultivos'));
    expect(onNavigate).toHaveBeenCalledWith('mundo_cultivos');
  });

  test('mundo directo (café) → onNavigate(view, data)', () => {
    const onNavigate = vi.fn();
    render(<ArbolDeMundos onNavigate={onNavigate} mostrarAnimales plantsCount={0} />);
    fireEvent.click(rama('cafe'));
    expect(onNavigate).toHaveBeenCalledWith('cafe', undefined);
  });

  test('mundo hub (sanidad) → onNavigate("mundo", { mundo: id })', () => {
    const onNavigate = vi.fn();
    render(<ArbolDeMundos onNavigate={onNavigate} mostrarAnimales plantsCount={0} />);
    fireEvent.click(rama('sanidad'));
    expect(onNavigate).toHaveBeenCalledWith('mundo', { mundo: 'sanidad' });
  });

  test('TODAS las ramas navegan al destino exacto de su tarjeta', () => {
    for (const m of MUNDOS_FINCA) {
      const onNavigate = vi.fn();
      render(<ArbolDeMundos onNavigate={onNavigate} mostrarAnimales plantsCount={0} />);
      fireEvent.click(screen.getByTestId(`arbol-rama-${m.id}`));
      if (m.portada) expect(onNavigate).toHaveBeenCalledWith(m.portada);
      else if (m.directo) expect(onNavigate).toHaveBeenCalledWith(m.directo.view, m.directo.data);
      else expect(onNavigate).toHaveBeenCalledWith('mundo', { mundo: m.id });
      cleanup();
    }
  });

  test('accesible por teclado: Enter y Espacio entran al mundo', () => {
    const onNavigate = vi.fn();
    render(<ArbolDeMundos onNavigate={onNavigate} mostrarAnimales plantsCount={0} />);
    fireEvent.keyDown(rama('agua'), { key: 'Enter' });
    expect(onNavigate).toHaveBeenCalledWith('agua', undefined);
    fireEvent.keyDown(rama('clima'), { key: ' ' });
    expect(onNavigate).toHaveBeenCalledWith('mundo', { mundo: 'clima' });
  });
});

describe('ArbolDeMundos — solo la piel biopunk (los demás temas quedan como están)', () => {
  test('con tema nature NO se monta (la grilla sigue siendo el menú)', () => {
    localStorage.setItem('chagra:theme', 'nature');
    render(<ArbolDeMundos onNavigate={vi.fn()} mostrarAnimales plantsCount={0} />);
    expect(screen.queryByTestId('arbol-mundos')).not.toBeInTheDocument();
  });

  test('con biopunk (respaldo) y biopunk2 (default) SÍ se monta', () => {
    localStorage.setItem('chagra:theme', 'biopunk');
    render(<ArbolDeMundos onNavigate={vi.fn()} mostrarAnimales plantsCount={0} />);
    expect(screen.getByTestId('arbol-mundos')).toBeInTheDocument();
    cleanup();
    localStorage.setItem('chagra:theme', 'biopunk2');
    render(<ArbolDeMundos onNavigate={vi.fn()} mostrarAnimales plantsCount={0} />);
    expect(screen.getByTestId('arbol-mundos')).toBeInTheDocument();
  });
});
