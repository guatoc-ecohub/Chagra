/**
 * TuberculosScreen.test — mundo "Tubérculos y raíces" (mundo Cultivos y semillas).
 *
 * Cubre:
 *   1. El hub muestra los tubérculos del pancoger de raíz + el explicador de las
 *      tres formas de siembra (tubérculo-semilla / esqueje / colino).
 *   2. Al tocar un tubérculo se abre su ficha de cultivo con TODAS las secciones,
 *      incluida la de Aporque (propia de los tubérculos).
 *   3. HONESTIDAD DEL GROUNDING: uno con dato del grafo (batata: picudo/Cylas)
 *      muestra plaga y control; uno sin plaga (cubio) muestra "dato en camino".
 *   4. La conservación enlaza al mundo Almacenamiento (onNavigate).
 *   5. Volver desde la ficha regresa al hub, y desde el hub sale (onBack).
 *   6. Invariantes del módulo de datos: ficha completa, sin dosis químicas.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import TuberculosScreen from './TuberculosScreen';
import { TUBERCULOS, getTuberculo, tieneDato, FUENTES_INSTITUCIONALES } from '../services/tuberculosData';

afterEach(() => cleanup());

describe('TuberculosScreen — hub', () => {
  it('muestra las tarjetas de tubérculo y el explicador de siembra', () => {
    render(<TuberculosScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Tubérculos y raíces/i })).toBeInTheDocument();
    for (const t of TUBERCULOS) {
      expect(screen.getByTestId(`tuberculo-${t.id}`)).toBeInTheDocument();
    }
    expect(TUBERCULOS.length).toBe(9); // papa, criolla, yuca, arracacha, ñame, batata, oca, cubio, ulluco
    // El explicador "casi ninguno se siembra de semilla"
    expect(screen.getByText(/Casi ninguno se siembra de semilla/i)).toBeInTheDocument();
  });

  it('el hub trae la lámina SVG propia de las tres formas de siembra', () => {
    render(<TuberculosScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('lamina-siembra')).toBeInTheDocument();
  });
});

describe('TuberculosScreen — ficha de cultivo', () => {
  it('abre la ficha de la papa con sus secciones (incluida Aporque) y datos del grafo', () => {
    render(<TuberculosScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('tuberculo-papa'));

    expect(screen.getByRole('heading', { name: /^Siembra$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Luz, agua y piso térmico/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Aporque$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Con quién se lleva/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Plagas y manejo sin veneno/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Cosecha$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Conservación y curado/i })).toBeInTheDocument();

    // Usos en la cocina + fuentes institucionales con URL (MIP)
    expect(screen.getByRole('heading', { name: /^Usos$/i })).toBeInTheDocument();
    const agrosavia = screen.getByRole('link', { name: /AGROSAVIA/i });
    expect(agrosavia).toHaveAttribute('href', 'https://www.agrosavia.co');
    expect(screen.getByRole('link', { name: /^CIAT/i })).toHaveAttribute('href', 'https://alliancebioversityciat.org');

    // Plaga insignia de la papa grounded en el grafo + manejo biológico
    expect(screen.getByText(/tizón tardío/i)).toBeInTheDocument();
    expect(screen.getByText(/Polilla guatemalteca de la papa/i)).toBeInTheDocument();

    // La ficha trae la lámina SVG propia del aporque (en corte)
    expect(screen.getByTestId('lamina-aporque')).toBeInTheDocument();
  });

  it('la batata muestra el picudo (Cylas) groundeado con su control biológico', () => {
    render(<TuberculosScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('tuberculo-batata'));
    expect(screen.getByText(/Picudo de la batata/i)).toBeInTheDocument();
    expect(screen.getByText(/beauveria/i)).toBeInTheDocument();
  });

  it('un tubérculo sin plaga en el grafo (cubio) muestra "dato en camino"', () => {
    render(<TuberculosScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('tuberculo-cubio'));
    const plagas = screen.getByRole('heading', { name: /Plagas y manejo sin veneno/i }).closest('section');
    expect(within(plagas).getByText(/en camino/i)).toBeInTheDocument();
  });

  it('conservación enlaza al mundo Almacenamiento', () => {
    const onNavigate = vi.fn();
    render(<TuberculosScreen onBack={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('tuberculo-yuca'));
    fireEvent.click(screen.getByRole('button', { name: /Guardar y conservar/i }));
    expect(onNavigate).toHaveBeenCalledWith('almacenamiento');
  });
});

describe('TuberculosScreen — navegación', () => {
  it('volver desde la ficha regresa al hub; desde el hub llama onBack', () => {
    const onBack = vi.fn();
    render(<TuberculosScreen onBack={onBack} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('tuberculo-arracacha'));
    expect(screen.getByRole('heading', { name: /^Aporque$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(screen.getByTestId('tuberculo-papa')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('tuberculosData — invariantes de grounding', () => {
  it('cada tubérculo tiene ficha de cultivo completa y foto', () => {
    for (const t of TUBERCULOS) {
      expect(t.id && t.nombre && t.cientifico).toBeTruthy();
      expect(t.foto).toBeTruthy();
      expect(t.siembra.metodo && t.siembra.distancia && t.siembra.profundidad).toBeTruthy();
      expect(t.clima.luz && t.clima.agua && t.clima.piso).toBeTruthy();
      expect(t.aporque).toBeTruthy();
      expect(t.cosecha && t.conservacion).toBeTruthy();
      expect(t.usos).toBeTruthy();
      expect(t.fuentes.relaciones).toMatch(/Grafo Chagra/);
    }
  });

  it('las fuentes institucionales (MIP) traen sigla y URL http verificable', () => {
    expect(FUENTES_INSTITUCIONALES.length).toBeGreaterThan(0);
    for (const f of FUENTES_INSTITUCIONALES) {
      expect(f.sigla && f.nombre).toBeTruthy();
      expect(f.url).toMatch(/^https:\/\//);
    }
  });

  it('el manejo de plagas es biológico: sin dosis ni pesticidas de síntesis', () => {
    const prohibido = /\b\d+\s?(ml|cc|g|kg|litros?|l)\b|glifosato|clorpirifos|lambda|mancozeb|carbofuran/i;
    for (const t of TUBERCULOS) {
      for (const p of t.plagas) {
        for (const ctrl of p.controles) {
          expect(ctrl).not.toMatch(prohibido);
        }
      }
      for (const b of t.biopreparados) {
        expect(b).not.toMatch(prohibido);
      }
    }
  });

  it('tieneDato distingue vacío de con-dato; getTuberculo resuelve o null', () => {
    expect(tieneDato(getTuberculo('papa').vecinasBuenas)).toBe(true);
    expect(tieneDato(getTuberculo('cubio').plagas)).toBe(false);
    expect(tieneDato(getTuberculo('name').vecinasBuenas)).toBe(false); // ñame sin arista de compañía
    expect(getTuberculo('no-existe')).toBeNull();
  });
});
