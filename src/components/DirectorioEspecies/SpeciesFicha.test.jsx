import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SpeciesFicha from './SpeciesFicha.jsx';

const FICHA_COMPLETA = {
  id: 'phaseolus_vulgaris',
  comun: 'Frijol arbustivo',
  cientifico: 'Phaseolus vulgaris L.',
  familia: 'Fabaceae',
  estrato: 'medio',
  nombresRegionales: ['Cargamanto', 'Bola roja'],
  imagen: null,
  pisoTermico: {
    thermalZones: ['frio', 'templado'],
    altitud: { min_absoluto: 0, optimo_min: 1500, optimo_max: 2400, max_absoluto: 2800 },
    temperatura: { helada_letal: 0, optimo_min: 16, optimo_max: 24 },
    agua: 'medio',
  },
  asociaciones: {
    compatibles: [{ id: 'zea_mays', comun: 'Maíz', cientifico: 'Zea mays', enCatalogo: true }],
    antagonistas: [{ id: 'allium_cepa', comun: 'Cebolla', cientifico: 'Allium cepa', enCatalogo: false }],
  },
  biopreparados: [
    { id: 'caldo_bordeles', nombre: 'Caldo bordelés', tipo: 'caldo', dosis: '1%', uso: 'Foliar', ingredientes: ['cobre'], enCatalogo: true },
  ],
  amenazas: [
    { nombre: 'Bemisia tabaci', tipo: 'plaga', controladores: ['Encarsia formosa'] },
    { nombre: 'Roya', tipo: 'enfermedad', controladores: [] },
  ],
  fenologia: { valorPedagogico: 'El frijol fija nitrógeno.' },
  fuentes: [{ id: 'agrosavia', title: 'Agrosavia' }],
};

const FICHA_VACIA = {
  id: 'x', comun: 'Especie sin datos', cientifico: 'Ignota sp.', familia: '', estrato: '',
  nombresRegionales: [], imagen: null,
  pisoTermico: { thermalZones: [], altitud: null, temperatura: null, agua: null },
  asociaciones: { compatibles: [], antagonistas: [] },
  biopreparados: [], amenazas: [],
  fenologia: { valorPedagogico: '' }, fuentes: [],
};

describe('SpeciesFicha', () => {
  it('renderiza identidad y secciones con datos', () => {
    render(<SpeciesFicha ficha={FICHA_COMPLETA} />);
    expect(screen.getByText('Frijol arbustivo')).toBeInTheDocument();
    expect(screen.getByText('Phaseolus vulgaris L.')).toBeInTheDocument();
    expect(screen.getByTestId('ficha-biopreparados')).toBeInTheDocument();
    expect(screen.getByText('Caldo bordelés')).toBeInTheDocument();
    expect(screen.getByText(/1%/)).toBeInTheDocument();
    expect(screen.getByTestId('ficha-amenazas')).toBeInTheDocument();
    expect(screen.getByText(/Encarsia formosa/)).toBeInTheDocument();
  });

  it('muestra el fallback ilustrado cuando no hay foto', () => {
    render(<SpeciesFicha ficha={FICHA_COMPLETA} />);
    expect(screen.getByTestId('species-photo-fallback')).toBeInTheDocument();
  });

  it('renderiza la banda de piso térmico con altitud', () => {
    render(<SpeciesFicha ficha={FICHA_COMPLETA} />);
    expect(screen.getByTestId('piso-termico-band')).toBeInTheDocument();
    expect(screen.getAllByText(/óptimo/).length).toBeGreaterThan(0);
    // rango óptimo de altitud (separador de miles depende de ICU: 1.500 / 1,500 / 1500)
    expect(screen.getByText(/1[.,]?500/)).toBeInTheDocument();
  });

  it('asociación en catálogo es clickeable y navega', () => {
    const onSelect = vi.fn();
    render(<SpeciesFicha ficha={FICHA_COMPLETA} onSelectSpecies={onSelect} />);
    fireEvent.click(screen.getByText('Maíz'));
    expect(onSelect).toHaveBeenCalledWith('zea_mays');
  });

  it('deflección honesta en secciones sin datos', () => {
    render(<SpeciesFicha ficha={FICHA_VACIA} />);
    expect(screen.getByTestId('piso-sin-dato')).toBeInTheDocument();
    expect(screen.getByText(/Sin biopreparados asociados/)).toBeInTheDocument();
    expect(screen.getByText(/Sin plagas o enfermedades/)).toBeInTheDocument();
    expect(screen.getByText(/Sin asociaciones favorables/)).toBeInTheDocument();
  });

  it('controlador ausente muestra deflección, no inventa', () => {
    render(<SpeciesFicha ficha={FICHA_COMPLETA} />);
    expect(screen.getByText(/Sin controlador biológico registrado/)).toBeInTheDocument();
  });

  it('renderiza foto cuando existe imagen', () => {
    const ficha = { ...FICHA_COMPLETA, imagen: { url: 'https://x/a.jpg', license: 'CC-BY', rightsHolder: 'A', source: 'iNaturalist' } };
    render(<SpeciesFicha ficha={ficha} />);
    const img = screen.getByAltText(/Foto de Frijol/);
    expect(img).toBeInTheDocument();
  });

  it('no rompe con ficha null', () => {
    const { container } = render(<SpeciesFicha ficha={null} />);
    expect(container.firstChild).toBeNull();
  });
});
