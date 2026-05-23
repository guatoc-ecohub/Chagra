import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Smoke tests para la migración de SpeciesSelect a recognizeSpeciesGrounded
// (PR #114). Cubre los tres valores observables de `_grounded`:
//   - true  → badge VERDE "Verificado catálogo".
//   - false → badge AMBER "No verificado — revisar manualmente" + bloque
//             "Coincidencias en catálogo" cuando hay alternativas válidas
//             en `_all_validations`.
//   - null  → sidecar offline o no aplica → ningún badge se renderiza
//             (degradación graceful).

// Mock del store: lista vacía para evitar el chip "Recientes" (no toca el badge).
vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [] }),
}));

// Mock catálogo SQLite — vacío para forzar fallback LEGACY_SPECIES (offline-safe).
vi.mock('../../db/catalogDB', () => ({
  getAllSpecies: vi.fn().mockResolvedValue([]),
}));

// Mock photoService.captureAndCompress → blob sintético sin tocar canvas/FileReader.
vi.mock('../../services/photoService', () => ({
  captureAndCompress: vi.fn().mockResolvedValue({
    blob: new Blob(['stub'], { type: 'image/jpeg' }),
  }),
}));

// Mock hook usePhotoUrl — sin foto, no relevante para el badge.
vi.mock('../../hooks/usePhotoUrl', () => ({
  usePhotoUrl: () => ({ url: null, source: null, loading: false }),
}));

// Mock aiService.recognizeSpeciesGrounded — se reescribe per-test con el valor
// de `_grounded` que queremos validar.
const mockRecognizeSpeciesGrounded = vi.fn();
vi.mock('../../services/aiService', () => ({
  recognizeSpeciesGrounded: (...args) => mockRecognizeSpeciesGrounded(...args),
}));

import SpeciesSelect from '../SpeciesSelect';

const buildResult = (grounded, extra = {}) => ({
  common_name_es: 'Tomate',
  scientific_name: 'Solanum lycopersicum',
  confidence: 0.85,
  alternatives: [],
  _grounded: grounded,
  _validation: extra.validation ?? null,
  _all_validations: extra.all_validations ?? [],
});

const triggerCapture = async () => {
  // El input file vive dentro de la sección "Identificar con foto", oculto
  // detrás del label "Tomar foto". testing-library no expone hidden inputs
  // via getByRole — usamos querySelector específico del ref camera.
  const fileInput = document.querySelector('input[type="file"][capture="environment"]');
  expect(fileInput).toBeTruthy();
  const file = new File(['stub'], 'planta.jpg', { type: 'image/jpeg' });
  await fireEvent.change(fileInput, { target: { files: [file] } });
};

describe('SpeciesSelect — badges grounded (PR #114)', () => {
  beforeEach(() => {
    mockRecognizeSpeciesGrounded.mockReset();
  });

  it('renderiza badge VERDE "Verificado catálogo" cuando _grounded === true', async () => {
    mockRecognizeSpeciesGrounded.mockResolvedValue(
      buildResult(true, {
        validation: { valid: true, species_id: 'solanum_lycopersicum', confidence_adjusted: 0.92 },
      })
    );
    render(<SpeciesSelect value="" onChange={() => {}} />);
    await triggerCapture();
    await waitFor(() => {
      const badge = screen.getByTestId('grounded-badge-verified');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toMatch(/Verificado catálogo/i);
    });
    // El badge unverified NO debe estar.
    expect(screen.queryByTestId('grounded-badge-unverified')).toBeNull();
  });

  it('renderiza badge AMBER "No verificado" cuando _grounded === false', async () => {
    mockRecognizeSpeciesGrounded.mockResolvedValue(
      buildResult(false, {
        validation: { valid: false, species_id: 'mangosteenia_colombiana', reason: 'not_in_catalog' },
        all_validations: [
          { valid: false, species_id: 'mangosteenia_colombiana', source_label: 'Mangosteenia colombiana' },
        ],
      })
    );
    render(<SpeciesSelect value="" onChange={() => {}} />);
    await triggerCapture();
    await waitFor(() => {
      const badge = screen.getByTestId('grounded-badge-unverified');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toMatch(/No verificado/i);
      expect(badge.textContent).toMatch(/revisar manualmente/i);
    });
    expect(screen.queryByTestId('grounded-badge-verified')).toBeNull();
  });

  it('muestra "Coincidencias en catálogo" si _grounded === false y _all_validations trae candidates válidos', async () => {
    mockRecognizeSpeciesGrounded.mockResolvedValue(
      buildResult(false, {
        validation: { valid: false, species_id: 'mangosteenia_colombiana' },
        all_validations: [
          { valid: false, species_id: 'mangosteenia_colombiana', source_label: 'Mangosteenia colombiana' },
          { valid: true, species_id: 'garcinia_mangostana', source_label: 'Garcinia mangostana' },
        ],
      })
    );
    render(<SpeciesSelect value="" onChange={() => {}} />);
    await triggerCapture();
    await waitFor(() => {
      const candidatesBlock = screen.getByTestId('grounded-valid-candidates');
      expect(candidatesBlock).toBeTruthy();
      expect(candidatesBlock.textContent).toMatch(/Coincidencias en catálogo/i);
      expect(candidatesBlock.textContent).toMatch(/Garcinia mangostana/i);
    });
  });

  it('NO renderiza badge cuando _grounded === null (degradación graceful)', async () => {
    mockRecognizeSpeciesGrounded.mockResolvedValue(buildResult(null));
    render(<SpeciesSelect value="" onChange={() => {}} />);
    await triggerCapture();
    // Esperamos a que el resultado AI aparezca (Especie sugerida) para
    // confirmar que llegamos al render del bloque 'done'.
    await waitFor(() => {
      expect(screen.getByText(/Especie sugerida/i)).toBeTruthy();
    });
    expect(screen.queryByTestId('grounded-badge-verified')).toBeNull();
    expect(screen.queryByTestId('grounded-badge-unverified')).toBeNull();
    expect(screen.queryByTestId('grounded-valid-candidates')).toBeNull();
  });
});
