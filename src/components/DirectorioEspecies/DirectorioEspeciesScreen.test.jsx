import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DirectorioEspeciesScreen from './DirectorioEspeciesScreen.jsx';

// El servicio de ESPECIES se mockea: estos tests verifican SUPERFICIE/CONTRASTE
// de la pantalla (fondo oscuro opaco en ambas vistas), no la orquestación de
// datos de especies. El servicio de PLAGAS (directorioPlagas) NO se mockea: se
// alimenta del catálogo de sanidad real (sanidadData) — así probamos que la
// pestaña de plagas queda cableada de verdad, no huérfana.
vi.mock('../../services/directorioEspecies.js', () => ({
  searchSpecies: vi.fn(),
  buildSpeciesFicha: vi.fn(),
}));

import { searchSpecies, buildSpeciesFicha } from '../../services/directorioEspecies.js';

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(searchSpecies).mockResolvedValue([]);
  vi.mocked(buildSpeciesFicha).mockResolvedValue(FICHA);
});

describe('DirectorioEspeciesScreen — superficie / contraste', () => {
  it('la vista de búsqueda tiene fondo oscuro opaco (contraste AA en cualquier tema)', () => {
    const { container } = render(<DirectorioEspeciesScreen />);
    const root = container.firstElementChild;
    // Fondo sólido oscuro: garantiza que el texto blanco/emerald-100 sea legible
    // aunque el tema activo de la app sea claro (crema/durazno).
    expect(root).toHaveClass('bg-slate-950');
    expect(root).toHaveClass('text-white');
  });

  it('la vista de ficha también tiene fondo oscuro opaco', async () => {
    // Forzamos selección: con un único resultado, Enter abre la ficha.
    vi.mocked(searchSpecies).mockResolvedValue(/** @type {any} */ ([{ id: FICHA.id, comun: FICHA.comun, cientifico: FICHA.cientifico }]));
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

  it('el header de la búsqueda y el título se montan (no es página en blanco)', () => {
    render(<DirectorioEspeciesScreen />);
    expect(screen.getByText('Directorio de especies')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar especie por nombre')).toBeInTheDocument();
  });
});

describe('DirectorioEspeciesScreen — pestaña de plagas (cableado real)', () => {
  it('la pestaña Plagas muestra la cuadrícula del catálogo de sanidad', () => {
    render(<DirectorioEspeciesScreen initialMode="plagas" />);
    expect(screen.getByText('Directorio de plagas')).toBeInTheDocument();
    // La cuadrícula se puebla con datos REALES de sanidadData (no mockeados).
    expect(screen.getByTestId('directorio-plagas-results')).toBeInTheDocument();
    expect(screen.getByTestId('directorio-plaga-hypothenemus_hampei')).toBeInTheDocument();
  });

  it('se puede alternar de Especies a Plagas con la pestaña', () => {
    render(<DirectorioEspeciesScreen />);
    // Arranca en especies.
    expect(screen.getByLabelText('Buscar especie por nombre')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('directorio-tab-plagas'));
    expect(screen.getByLabelText('Buscar plaga o enfermedad por nombre')).toBeInTheDocument();
  });

  it('al tocar una plaga abre su ficha grounded (no queda huérfana)', async () => {
    render(<DirectorioEspeciesScreen initialMode="plagas" />);
    fireEvent.click(screen.getByTestId('directorio-plaga-hypothenemus_hampei'));
    // La ficha se construye desde el catálogo de sanidad (offline degrada solo).
    await waitFor(() => expect(screen.getByTestId('plaga-ficha')).toBeInTheDocument());
    // El binomio aparece en el header y en el cuerpo de la ficha.
    expect(screen.getAllByText('Hypothenemus hampei').length).toBeGreaterThanOrEqual(1);
  });

  it('la búsqueda de plagas filtra por término folk', () => {
    render(<DirectorioEspeciesScreen initialMode="plagas" />);
    fireEvent.change(screen.getByLabelText('Buscar plaga o enfermedad por nombre'), { target: { value: 'roya' } });
    expect(screen.getByTestId('directorio-plaga-hemileia_vastatrix')).toBeInTheDocument();
    // Las que no casan desaparecen de la cuadrícula.
    expect(screen.queryByTestId('directorio-plaga-mosca_blanca')).not.toBeInTheDocument();
  });
});
