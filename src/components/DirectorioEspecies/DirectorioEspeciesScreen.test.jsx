import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DirectorioEspeciesScreen from './DirectorioEspeciesScreen.jsx';

// El servicio de datos se mockea: estos tests verifican SUPERFICIE/CONTRASTE de
// la pantalla (fondo oscuro opaco en ambas vistas), no la orquestación de datos.
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
  searchSpecies.mockResolvedValue([]);
  buildSpeciesFicha.mockResolvedValue(FICHA);
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

  it('el header de la búsqueda y el título se montan (no es página en blanco)', () => {
    render(<DirectorioEspeciesScreen />);
    expect(screen.getByText('Directorio de especies')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar especie por nombre')).toBeInTheDocument();
  });
});
