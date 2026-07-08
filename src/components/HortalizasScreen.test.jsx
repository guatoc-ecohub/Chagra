/**
 * HortalizasScreen.test — mundo "Hortalizas de la huerta" (mundo Cultivos y semillas).
 *
 * Cubre:
 *   1. El hub muestra las 8 hortalizas de la olla campesina (9 tarjetas: cebolla
 *      larga y de bulbo van aparte).
 *   2. Al tocar una hortaliza se abre su ficha de cultivo con las secciones
 *      (siembra, luz/agua/piso térmico, vecinas, plagas, cosecha, conservación).
 *   3. HONESTIDAD DEL GROUNDING: una hortaliza con dato del grafo (tomate) muestra
 *      vecinas y plaga; una sin dato (cilantro) muestra "dato en camino".
 *   4. La conservación enlaza al mundo Almacenamiento (onNavigate).
 *   5. Volver desde la ficha regresa al hub, y desde el hub sale (onBack).
 *   6. Invariantes del módulo de datos: 8 cultivos base, sin dosis químicas.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import HortalizasScreen from './HortalizasScreen';
import { HORTALIZAS, getHortaliza, tieneDato } from '../services/hortalizasData';

afterEach(() => cleanup());

describe('HortalizasScreen — hub', () => {
  it('muestra las 9 tarjetas de hortaliza', () => {
    render(<HortalizasScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Hortalizas de la huerta/i })).toBeInTheDocument();
    for (const h of HORTALIZAS) {
      expect(screen.getByTestId(`hortaliza-${h.id}`)).toBeInTheDocument();
    }
    expect(HORTALIZAS.length).toBe(9); // tomate, cebolla larga, cebolla bulbo, zanahoria, repollo, lechuga, cilantro, remolacha, acelga
  });
});

describe('HortalizasScreen — ficha de cultivo', () => {
  it('abre la ficha del tomate con sus secciones y datos del grafo', () => {
    render(<HortalizasScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('hortaliza-tomate'));

    // Secciones de la ficha de cultivo
    expect(screen.getByRole('heading', { name: /Siembra/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Luz, agua y piso térmico/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Con quién se lleva/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Plagas y manejo sin veneno/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Cosecha/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Conservación/i })).toBeInTheDocument();

    // Vecinas y plaga grounded (tomate SÍ tiene dato en el grafo)
    expect(screen.getByText(/Buenas vecinas/i)).toBeInTheDocument();
    expect(screen.getByText(/Heliothis/i)).toBeInTheDocument();
    // El manejo es biológico, no químico
    expect(screen.getByText(/Bt — bacteria bioinsecticida/i)).toBeInTheDocument();
  });

  it('una hortaliza sin dato del grafo (cilantro) muestra "dato en camino"', () => {
    render(<HortalizasScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('hortaliza-cilantro'));
    // Plagas sin dato → mensaje honesto
    const plagas = screen.getByRole('heading', { name: /Plagas y manejo sin veneno/i }).closest('section');
    expect(within(plagas).getByText(/en camino/i)).toBeInTheDocument();
  });

  it('conservación enlaza al mundo Almacenamiento', () => {
    const onNavigate = vi.fn();
    render(<HortalizasScreen onBack={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('hortaliza-remolacha'));
    fireEvent.click(screen.getByRole('button', { name: /Guardar y conservar/i }));
    expect(onNavigate).toHaveBeenCalledWith('almacenamiento');
  });
});

describe('HortalizasScreen — navegación', () => {
  it('volver desde la ficha regresa al hub; desde el hub llama onBack', () => {
    const onBack = vi.fn();
    render(<HortalizasScreen onBack={onBack} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('hortaliza-zanahoria'));
    expect(screen.getByRole('heading', { name: /Siembra/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    // De vuelta en el hub: las tarjetas están de nuevo
    expect(screen.getByTestId('hortaliza-tomate')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('hortalizasData — invariantes de grounding', () => {
  it('cada hortaliza tiene ficha de cultivo completa y foto', () => {
    for (const h of HORTALIZAS) {
      expect(h.id && h.nombre && h.cientifico).toBeTruthy();
      expect(h.foto).toBeTruthy();
      expect(h.siembra.metodo && h.siembra.distancia).toBeTruthy();
      expect(h.clima.luz && h.clima.agua && h.clima.piso).toBeTruthy();
      expect(h.cosecha && h.conservacion).toBeTruthy();
      expect(h.fuentes.relaciones).toMatch(/Grafo Chagra/);
    }
  });

  it('el manejo de plagas es biológico: sin dosis ni pesticidas de síntesis', () => {
    const prohibido = /\b\d+\s?(ml|cc|g|kg|litros?|l)\b|glifosato|clorpirifos|lambda|mancozeb|carbofuran/i;
    for (const h of HORTALIZAS) {
      for (const p of h.plagas) {
        for (const ctrl of p.controles) {
          expect(ctrl).not.toMatch(prohibido);
        }
      }
    }
  });

  it('cada hortaliza declara familia botánica y tipo de siembra (rotación de eras)', () => {
    const familias = new Set();
    for (const h of HORTALIZAS) {
      expect(h.familia).toBeTruthy();
      expect(h.siembraTipo).toBeTruthy();
      familias.add(h.familia);
    }
    // La rotación necesita al menos dos familias distintas para relevar la era.
    expect(familias.size).toBeGreaterThanOrEqual(2);
  });

  it('la ficha muestra la rotación por familia (2ª pasada)', () => {
    render(<HortalizasScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('hortaliza-tomate'));
    expect(screen.getByText(/Rotación/i)).toBeInTheDocument();
    // El consejo de rotación nombra la familia y pide relevar la era.
    expect(screen.getByText(/familia de las solanáceas/i)).toBeInTheDocument();
    expect(screen.getByText(/otra familia/i)).toBeInTheDocument();
  });

  it('tieneDato distingue vacío de con-dato', () => {
    expect(tieneDato(getHortaliza('tomate').vecinasBuenas)).toBe(true);
    expect(tieneDato(getHortaliza('cilantro').plagas)).toBe(false);
    expect(getHortaliza('no-existe')).toBeNull();
  });
});
