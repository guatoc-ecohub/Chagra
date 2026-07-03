import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DirectorioEspeciesScreen from './DirectorioEspeciesScreen.jsx';

// El servicio de datos se mockea: estos tests verifican SUPERFICIE/CONTRASTE y
// la capa visual de la pantalla (grilla, chips, estados), no la orquestación
// de datos.
vi.mock('../../services/directorioEspecies.js', () => ({
  searchSpecies: vi.fn(),
  buildSpeciesFicha: vi.fn(),
  listSpeciesForBrowse: vi.fn(),
}));

import {
  searchSpecies,
  buildSpeciesFicha,
  listSpeciesForBrowse,
} from '../../services/directorioEspecies.js';

const FICHA = {
  id: 'solanum_lycopersicum_cerasiforme',
  comun: 'Tomate cherry silvestre',
  cientifico: 'Solanum lycopersicum var. cerasiforme',
  familia: 'Solanaceae',
  estrato: 'bajo',
  nombresRegionales: [],
  imagen: null,
  pisoTermico: { thermalZones: [], altitud: null, temperatura: null, agua: null },
  asociaciones: { compatibles: [], antagonistas: [] },
  biopreparados: [],
  amenazas: [],
  fenologia: { valorPedagogico: '' },
  fuentes: [],
};

const CATALOGO = [
  {
    id: 'solanum_tuberosum',
    comun: 'Papa',
    cientifico: 'Solanum tuberosum',
    familia: 'Solanaceae',
    categoria: 'tuberculos_raices',
  },
  {
    id: 'coffea_arabica',
    comun: 'Café',
    cientifico: 'Coffea arabica',
    familia: 'Rubiaceae',
    categoria: 'frutales_perennes',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  searchSpecies.mockResolvedValue([]);
  buildSpeciesFicha.mockResolvedValue(FICHA);
  listSpeciesForBrowse.mockResolvedValue(CATALOGO);
});

describe('DirectorioEspeciesScreen — superficie / contraste', () => {
  it('la vista de búsqueda tiene fondo oscuro opaco (contraste AA en cualquier tema)', async () => {
    const { container } = render(<DirectorioEspeciesScreen />);
    const root = container.firstElementChild;
    // Fondo sólido oscuro: garantiza que el texto blanco/emerald-100 sea legible
    // aunque el tema activo de la app sea claro (crema/durazno).
    expect(root).toHaveClass('bg-slate-950');
    expect(root).toHaveClass('text-white');
    await waitFor(() => expect(listSpeciesForBrowse).toHaveBeenCalled());
  });

  it('la vista de ficha también tiene fondo oscuro opaco', async () => {
    // Forzamos selección: con un único resultado, Enter abre la ficha.
    searchSpecies.mockResolvedValue([{ id: FICHA.id, comun: FICHA.comun, cientifico: FICHA.cientifico }]);
    const { container } = render(<DirectorioEspeciesScreen initialQuery="tomate cherry silvestre" />);
    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(buildSpeciesFicha).toHaveBeenCalled());
    await waitFor(() => {
      const root = container.firstElementChild;
      expect(root).toHaveClass('bg-slate-950');
      expect(root).toHaveClass('text-white');
    });
  });

  it('el header de la búsqueda y el título se montan (no es página en blanco)', async () => {
    render(<DirectorioEspeciesScreen />);
    expect(screen.getByText('Directorio de especies')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar especie por nombre')).toBeInTheDocument();
    await waitFor(() => expect(listSpeciesForBrowse).toHaveBeenCalled());
  });
});

describe('DirectorioEspeciesScreen — exploración del catálogo (capa visual)', () => {
  it('sin consulta muestra la grilla del catálogo con una tarjeta por especie', async () => {
    render(<DirectorioEspeciesScreen />);
    const grid = await screen.findByTestId('directorio-grid');
    expect(grid).toBeInTheDocument();
    const cards = screen.getAllByTestId('directorio-species-card');
    expect(cards).toHaveLength(CATALOGO.length);
    expect(screen.getByText('Papa')).toBeInTheDocument();
    expect(screen.getByText('Café')).toBeInTheDocument();
  });

  it('los chips de categoría filtran la grilla y marcan aria-pressed', async () => {
    render(<DirectorioEspeciesScreen />);
    await screen.findByTestId('directorio-grid');
    const chips = screen.getAllByTestId('directorio-chip-categoria');
    // "Todas" + 2 categorías del catálogo mockeado.
    expect(chips).toHaveLength(3);
    expect(chips[0]).toHaveAttribute('aria-pressed', 'true');

    const chipTuberculos = chips.find((c) => c.textContent.includes('Tubérculos'));
    expect(chipTuberculos).toBeTruthy();
    fireEvent.click(chipTuberculos);

    await waitFor(() => {
      expect(chipTuberculos).toHaveAttribute('aria-pressed', 'true');
      const cards = screen.getAllByTestId('directorio-species-card');
      expect(cards).toHaveLength(1);
    });
    expect(screen.getByText('Papa')).toBeInTheDocument();
    expect(screen.queryByText('Café')).not.toBeInTheDocument();
  });

  it('cada tarjeta lleva el badge de emoji por especie (no un glifo genérico)', async () => {
    render(<DirectorioEspeciesScreen />);
    await screen.findByTestId('directorio-grid');
    const badges = screen.getAllByTestId('species-badge');
    expect(badges.length).toBeGreaterThanOrEqual(CATALOGO.length);
    // Papa → 🥔 (set visual por especie ya existente).
    expect(badges.some((b) => b.textContent === '🥔')).toBe(true);
  });

  it('catálogo no disponible → EmptyState de error con reintento (no pantalla en blanco)', async () => {
    listSpeciesForBrowse.mockResolvedValue([]);
    render(<DirectorioEspeciesScreen />);
    const empty = await screen.findByTestId('directorio-catalogo-error');
    expect(empty).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /reintentar/i });
    fireEvent.click(retry);
    await waitFor(() => expect(listSpeciesForBrowse).toHaveBeenCalledTimes(2));
  });
});
