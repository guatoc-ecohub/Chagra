/**
 * AromaticasScreen.test.jsx — mundo "Aromáticas y condimentarias".
 *
 * Cubre:
 *   1. Render base: la portada + una ficha por cada aromática del catálogo.
 *   2. La primera ficha (cilantro) arranca abierta con su cocina y su cultivo.
 *   3. Acordeón: abrir otra hierba cierra la anterior.
 *   4. Grounding honesto: las hierbas con datos completos muestran su
 *      propagación; las que el catálogo aún no completa (albahaca, poleo)
 *      muestran la nota honesta, sin inventar sol/agua.
 *   5. Veto de seguridad del poleo presente (no es claim de cura; es advertencia).
 *   6. Créditos de fotos (licencia abierta) + puente al agente (onNavigate).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AromaticasScreen from './AromaticasScreen.jsx';
import { AROMATICAS, CREDITOS_FOTOS_AROMATICAS } from '../../data/aromaticasHuerta.js';

describe('AromaticasScreen — render base', () => {
  it('monta la pantalla con una ficha por cada aromática', () => {
    render(<AromaticasScreen onBack={() => {}} />);
    expect(screen.getByTestId('aromaticas-screen')).toBeInTheDocument();
    for (const item of AROMATICAS) {
      expect(screen.getByTestId(`ficha-${item.slug}`)).toBeInTheDocument();
    }
  });

  it('cubre las 8 aromáticas de cocina campesina pedidas', () => {
    const slugs = AROMATICAS.map((a) => a.slug);
    for (const esperado of ['cilantro', 'cebollin', 'oregano', 'albahaca', 'hierbabuena', 'poleo', 'laurel', 'tomillo']) {
      expect(slugs).toContain(esperado);
    }
  });
});

describe('AromaticasScreen — acordeón de fichas', () => {
  it('la primera ficha (cilantro) arranca abierta con cocina y cultivo', () => {
    render(<AromaticasScreen onBack={() => {}} />);
    const cilantro = screen.getByTestId('ficha-cilantro');
    expect(within(cilantro).getByText('En la cocina')).toBeInTheDocument();
    expect(within(cilantro).getByText('Cómo sembrarla')).toBeInTheDocument();
    expect(within(cilantro).getByText('Buenas vecinas')).toBeInTheDocument();
  });

  it('abrir otra hierba cierra la anterior (una sola abierta a la vez)', () => {
    render(<AromaticasScreen onBack={() => {}} />);
    // Cilantro abierto de entrada
    expect(within(screen.getByTestId('ficha-cilantro')).queryByText('En la cocina')).toBeInTheDocument();
    // Abro tomillo
    fireEvent.click(screen.getByTestId('ficha-toggle-tomillo'));
    expect(within(screen.getByTestId('ficha-tomillo')).getByText('En la cocina')).toBeInTheDocument();
    // Cilantro se cerró
    expect(within(screen.getByTestId('ficha-cilantro')).queryByText('En la cocina')).toBeNull();
  });
});

describe('AromaticasScreen — grounding honesto', () => {
  it('el tomillo muestra su propagación groundeada del catálogo', () => {
    render(<AromaticasScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('ficha-toggle-tomillo'));
    const tomillo = screen.getByTestId('ficha-tomillo');
    expect(within(tomillo).getByText(/Por semilla/)).toBeInTheDocument();
  });

  it('la albahaca (sin sol/agua en catálogo) muestra la nota honesta, no inventa', () => {
    render(<AromaticasScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('ficha-toggle-albahaca'));
    const albahaca = screen.getByTestId('ficha-albahaca');
    expect(within(albahaca).getByText(/no los inventamos aquí/)).toBeInTheDocument();
  });
});

describe('AromaticasScreen — seguridad y cierres', () => {
  it('el poleo trae su veto de seguridad (advertencia honesta, no cura)', () => {
    render(<AromaticasScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('ficha-toggle-poleo'));
    const poleo = screen.getByTestId('ficha-poleo');
    expect(within(poleo).getByText(/tóxico/)).toBeInTheDocument();
  });

  it('muestra los créditos de fotos (licencia abierta, 8 fuentes)', () => {
    render(<AromaticasScreen onBack={() => {}} />);
    expect(screen.getByTestId('aromaticas-creditos-fotos')).toBeInTheDocument();
    expect(CREDITOS_FOTOS_AROMATICAS).toHaveLength(AROMATICAS.length);
  });

  it('el puente al agente navega con prompt precargado', () => {
    const onNavigate = vi.fn();
    render(<AromaticasScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('aromaticas-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({ prefilledPrompt: expect.any(String) }));
  });
});
