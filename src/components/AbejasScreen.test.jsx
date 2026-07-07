/**
 * AbejasScreen.test.jsx — mundo/pantalla "Abejas y polinización".
 *
 * Cubre:
 *   1. Render base photo-forward: hero + secciones (por qué, comparación,
 *      finca amiga, meliponicultura, amenazas) montan.
 *   2. Fotos CC reales con su atribución (autor · Wikimedia Commons · licencia).
 *   3. Nativas sin aguijón (angelita / Tetragonisca angustula) vs abeja de miel
 *      (Apis mellifera), con la guarda de saqueo Apis→angelita.
 *   4. Grounding: el conteo de relaciones POLINIZA sale del grafo, no inventado.
 *   5. Puente al agente (onNavigate con prefilledPrompt).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AbejasScreen from './AbejasScreen.jsx';
import graphStats from '../data/graph-stats-snapshot.json';

afterEach(() => cleanup());

describe('AbejasScreen — render base', () => {
  it('monta la pantalla y sus secciones clave', () => {
    render(<AbejasScreen onBack={() => {}} />);
    expect(screen.getByTestId('abejas-screen')).toBeInTheDocument();
    expect(screen.getByTestId('abejas-hero')).toBeInTheDocument();
    expect(screen.getByTestId('abejas-por-que')).toBeInTheDocument();
    expect(screen.getByTestId('abejas-comparacion')).toBeInTheDocument();
    expect(screen.getByTestId('abejas-finca-amiga')).toBeInTheDocument();
    expect(screen.getByTestId('abejas-meliponicultura')).toBeInTheDocument();
    expect(screen.getByTestId('abejas-amenazas')).toBeInTheDocument();
  });

  it('titula la pantalla como "Abejas y polinización"', () => {
    render(<AbejasScreen onBack={() => {}} />);
    expect(screen.getByRole('heading', { name: /Abejas y polinización/i })).toBeInTheDocument();
  });
});

describe('AbejasScreen — fotos CC con atribución', () => {
  it('renderiza las 5 fotos, todas con texto alternativo', () => {
    render(<AbejasScreen onBack={() => {}} />);
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBe(5);
    imgs.forEach((img) => {
      expect(img).toHaveAttribute('alt');
      expect(img.getAttribute('alt')?.length).toBeGreaterThan(0);
      // Las fotos se sirven desde public/abejas/
      expect(img.getAttribute('src')).toMatch(/^\/abejas\/.+\.jpg$/);
    });
  });

  it('muestra la atribución: autor, Wikimedia Commons y licencia Creative Commons', () => {
    render(<AbejasScreen onBack={() => {}} />);
    // Al menos una fuente y una licencia CC enlazadas
    expect(screen.getAllByRole('link', { name: /Wikimedia Commons/i }).length).toBeGreaterThan(0);
    const licencias = screen.getAllByRole('link', { name: /CC BY/i });
    expect(licencias.length).toBeGreaterThan(0);
    licencias.forEach((a) => {
      expect(a.getAttribute('href')).toMatch(/^https?:\/\/([a-z0-9-]+\.)*creativecommons\.org\//);
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    });
    // Autor concreto de una de las fotos (angelita)
    expect(screen.getByText(/Carlos Eduardo Joos/)).toBeInTheDocument();
  });
});

describe('AbejasScreen — nativas sin aguijón vs abeja de miel', () => {
  it('nombra angelita (Tetragonisca angustula) y abeja de miel (Apis mellifera)', () => {
    render(<AbejasScreen onBack={() => {}} />);
    expect(screen.getByText(/Tetragonisca angustula/)).toBeInTheDocument();
    expect(screen.getByText(/Apis mellifera/)).toBeInTheDocument();
    expect(screen.getAllByText(/sin aguijón/i).length).toBeGreaterThan(0);
  });

  it('advierte que Apis saquea las colmenas de angelitas', () => {
    render(<AbejasScreen onBack={() => {}} />);
    expect(screen.getByText(/saquea las\s+colmenas de angelitas/i)).toBeInTheDocument();
  });

  it('explica la meliponicultura como cría de abeja nativa', () => {
    render(<AbejasScreen onBack={() => {}} />);
    expect(screen.getByRole('heading', { name: /Meliponicultura/i })).toBeInTheDocument();
    expect(screen.getByText(/miel medicinal/i)).toBeInTheDocument();
  });
});

describe('AbejasScreen — grounding', () => {
  it('muestra el conteo real de relaciones POLINIZA del grafo (no inventado)', () => {
    render(<AbejasScreen onBack={() => {}} />);
    const esperado = String(graphStats.aristas_por_tipo.POLINIZA);
    expect(screen.getByText(esperado)).toBeInTheDocument();
    // Cita explícita de las fuentes de las cifras (aparece en varias secciones)
    expect(screen.getAllByText(/FAO \/ IPBES/i).length).toBeGreaterThan(0);
  });
});

describe('AbejasScreen — puente al agente', () => {
  it('llama onNavigate("agente", { prefilledPrompt }) al tocar el botón', () => {
    const onNavigate = vi.fn();
    render(<AbejasScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('abejas-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.any(String),
    }));
  });

  it('sin onNavigate no muestra el botón de agente (no rompe)', () => {
    render(<AbejasScreen onBack={() => {}} />);
    expect(screen.queryByTestId('abejas-preguntar-agente')).not.toBeInTheDocument();
  });
});
