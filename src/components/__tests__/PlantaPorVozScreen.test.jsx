/**
 * PlantaPorVozScreen.test.jsx — módulo UNIFICADO de voz (2026-06-15).
 *
 * Verifica el contrato de integración SIN re-testear los servicios (mockeados):
 *   1. Monta en fase de captura mostrando el flujo de voz (VoiceCapture).
 *   2. Cuando VoiceCapture reporta plantas guardadas (onPlantsSaved), arma y
 *      muestra el DOSSIER: ciclo genealógico + bioinsumos + companions +
 *      antagonistas + ciclos asociados.
 *   3. "Agregar otra planta" vuelve a la captura.
 *
 * VoiceCapture se mockea con un botón que dispara onPlantsSaved con una entidad
 * resuelta — así probamos el wiring del módulo, no el pipeline de Whisper.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// Mock del pipeline de voz: expone la prop onPlantsSaved como botón.
vi.mock('../VoiceCapture', () => ({
  default: ({ onPlantsSaved }) => (
    <div data-testid="voice-capture-mock">
      <button
        type="button"
        onClick={() => onPlantsSaved?.([{ cropSlug: 'fragaria_ananassa', canonical: 'Fresa (Fragaria ananassa)', quantity: 5 }])}
      >
        simular guardado
      </button>
    </div>
  ),
}));

// Hijos pesados de fenología/ciclo → stubs livianos.
vi.mock('../PhenologyTimeline', () => ({
  default: ({ speciesSlug }) => <div data-testid="phenology">{`fenología:${speciesSlug}`}</div>,
}));
vi.mock('../CicloDetalle', () => ({
  default: ({ cycle }) => <div data-testid="ciclo-detalle">{`ciclo:${cycle.process_id}`}</div>,
}));
vi.mock('../ChagraGrowLoader', () => ({ default: () => <div /> }));
vi.mock('../../services/userProfileService', () => ({ getProfile: () => ({ finca_altitud: 2600 }) }));

// El agregador: devuelve un dossier determinista.
vi.mock('../../services/plantDossierService', () => ({
  buildPlantDossier: vi.fn(async (plant) => ({
    slug: plant.cropSlug,
    label: plant.canonical,
    cycle: { template_id: 't', species_label: 'Fresa', stages: [], sources: [] },
    bioinsumos: { items: [{ nombre: 'Bocashi', uso: 'Al trasplante', source: 'catalogo' }], fromGraph: false },
    relations: {
      companions: [{ slug: 'allium_sativum', name: 'Ajo', reason: 'r' }],
      antagonists: [{ slug: 'solanum_lycopersicum', name: 'Tomate', reason: 'r' }],
      strata: [], fromGraph: true,
    },
    cycles: [{ process_id: 'p1', attributes: { subject_slug: 'fragaria_ananassa' } }],
  })),
}));

import PlantaPorVozScreen from '../PlantaPorVozScreen';
import { buildPlantDossier } from '../../services/plantDossierService';

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('PlantaPorVozScreen — módulo unificado', () => {
  it('arranca en captura mostrando el flujo de voz', () => {
    render(<PlantaPorVozScreen onBack={() => {}} onSave={() => {}} />);
    expect(screen.getByTestId('voice-capture-mock')).toBeTruthy();
    expect(screen.getByText('Agregar planta por voz')).toBeTruthy();
  });

  it('tras guardar muestra el dossier completo de la planta', async () => {
    render(<PlantaPorVozScreen onBack={() => {}} onSave={() => {}} />);
    fireEvent.click(screen.getByText('simular guardado'));

    await waitFor(() => expect(buildPlantDossier).toHaveBeenCalled());

    // Encabezado de la planta + las 4 secciones unificadas.
    expect(await screen.findByText('Fresa (Fragaria ananassa)')).toBeTruthy();
    expect(screen.getByText('Ciclo de vida de la planta')).toBeTruthy();
    expect(screen.getByTestId('phenology')).toBeTruthy();
    expect(screen.getByText('Bioinsumos que le puedes poner')).toBeTruthy();
    expect(screen.getByText('Bocashi')).toBeTruthy();
    expect(screen.getByText('Va bien sembrada junto a')).toBeTruthy();
    expect(screen.getByText('Ajo')).toBeTruthy();
    expect(screen.getByText('Evita sembrarla junto a')).toBeTruthy();
    expect(screen.getByText('Tomate')).toBeTruthy();
    expect(screen.getByText('Ciclos de esta planta en tu finca')).toBeTruthy();
    expect(screen.getByTestId('ciclo-detalle')).toBeTruthy();
  });

  it('"Agregar otra planta" regresa a la captura', async () => {
    render(<PlantaPorVozScreen onBack={() => {}} onSave={() => {}} />);
    fireEvent.click(screen.getByText('simular guardado'));
    await screen.findByText('Fresa (Fragaria ananassa)');

    fireEvent.click(screen.getByText('Agregar otra planta'));
    await waitFor(() => expect(screen.getByTestId('voice-capture-mock')).toBeTruthy());
  });

  it('si la planta no tiene slug resoluble, vuelve a captura (sin dossier)', async () => {
    vi.mocked(buildPlantDossier).mockResolvedValueOnce(null);
    render(<PlantaPorVozScreen onBack={() => {}} onSave={() => {}} />);
    fireEvent.click(screen.getByText('simular guardado'));
    await waitFor(() => expect(screen.getByTestId('voice-capture-mock')).toBeTruthy());
  });
});
