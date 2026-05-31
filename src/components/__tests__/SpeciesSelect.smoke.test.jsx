import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Smoke tests para la migración de SpeciesSelect a recognizeSpeciesGrounded
// (PR #114) + V-05 (audit-vision-chagra-2026-05-26): shape estructurado.
// Cubre los 6 statuses observables de `_grounded.status`:
//   verified         → badge VERDE "Verificado en catálogo".
//   rejected         → badge AMBER "No encontrado en catálogo" + bloque
//                      "Coincidencias en catálogo" cuando hay alternativas
//                      válidas en `_all_validations`.
//   sidecar-disabled → badge SLATE "Validación deshabilitada" (info).
//   offline          → badge SLATE "Sin conexión" (info).
//   no-binomial      → badge AMBER "Nombre ambiguo".
//   sidecar-error    → badge AMBER "Error temporal".

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

// Mock imageCompress.compressImage → blob sintético sin tocar canvas. jsdom
// no implementa Canvas realmente, así que la compresión real fallaría —
// devolvemos el "blob" tal cual para que el flow llegue a captureAndCompress.
vi.mock('../../utils/imageCompress', () => ({
  compressImage: vi.fn().mockImplementation(async (blob) => ({
    ok: true,
    blob,
    width: 1600,
    height: 1200,
    quality: 0.85,
    size: typeof blob?.size === 'number' ? blob.size : 1024,
    originalSize: typeof blob?.size === 'number' ? blob.size : 1024,
  })),
  IMAGE_TOO_LARGE_MESSAGE: 'La foto es muy grande, intenta una más liviana',
}));

// Mock hook usePhotoUrl — sin foto, no relevante para el badge.
vi.mock('../../hooks/usePhotoUrl', () => ({
  usePhotoUrl: () => ({ url: null, source: null, loading: false }),
}));

// Mock aiService.recognizeSpeciesGrounded — se reescribe per-test con el
// status de `_grounded` que queremos validar.
const mockRecognizeSpeciesGrounded = vi.fn();
vi.mock('../../services/aiService', () => ({
  recognizeSpeciesGrounded: (...args) => mockRecognizeSpeciesGrounded(...args),
}));

import SpeciesSelect from '../SpeciesSelect';

const buildResult = (status, extra = {}) => ({
  common_name_es: 'Tomate',
  scientific_name: 'Solanum lycopersicum',
  confidence: 0.85,
  alternatives: [],
  _grounded: {
    status,
    reason: extra.reason ?? 'mock reason',
    validation: extra.validation ?? null,
  },
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

describe('SpeciesSelect — badges grounded (V-05 structured status)', () => {
  beforeEach(() => {
    mockRecognizeSpeciesGrounded.mockReset();
  });

  it('status:verified → badge VERDE "Verificado en catálogo"', async () => {
    mockRecognizeSpeciesGrounded.mockResolvedValue(
      buildResult('verified', {
        reason: 'Verificado en catálogo Chagra.',
        validation: { valid: true, species_id: 'solanum_lycopersicum', confidence_adjusted: 0.92 },
      })
    );
    render(<SpeciesSelect value="" onChange={() => {}} />);
    await triggerCapture();
    await waitFor(() => {
      const badge = screen.getByTestId('grounded-badge-verified');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toMatch(/Verificado en catálogo/i);
    });
    // Ningún otro badge debe estar.
    expect(screen.queryByTestId('grounded-badge-rejected')).toBeNull();
    expect(screen.queryByTestId('grounded-badge-sidecar-disabled')).toBeNull();
    expect(screen.queryByTestId('grounded-badge-offline')).toBeNull();
    expect(screen.queryByTestId('grounded-badge-no-binomial')).toBeNull();
    expect(screen.queryByTestId('grounded-badge-sidecar-error')).toBeNull();
  });

  it('status:rejected → badge AMBER "No encontrado en catálogo"', async () => {
    mockRecognizeSpeciesGrounded.mockResolvedValue(
      buildResult('rejected', {
        reason: 'Sugerencia no encontrada en catálogo.',
        validation: { valid: false, species_id: 'mangosteenia_colombiana', reason: 'not_in_catalog' },
        all_validations: [
          { valid: false, species_id: 'mangosteenia_colombiana', source_label: 'Mangosteenia colombiana' },
        ],
      })
    );
    render(<SpeciesSelect value="" onChange={() => {}} />);
    await triggerCapture();
    await waitFor(() => {
      const badge = screen.getByTestId('grounded-badge-rejected');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toMatch(/No encontrado/i);
    });
    expect(screen.queryByTestId('grounded-badge-verified')).toBeNull();
  });

  it('status:rejected con candidates válidos → muestra "Coincidencias en catálogo"', async () => {
    mockRecognizeSpeciesGrounded.mockResolvedValue(
      buildResult('rejected', {
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

  it('status:sidecar-disabled → badge SLATE "Validación deshabilitada"', async () => {
    mockRecognizeSpeciesGrounded.mockResolvedValue(
      buildResult('sidecar-disabled', { reason: 'Validación catálogo deshabilitada.' })
    );
    render(<SpeciesSelect value="" onChange={() => {}} />);
    await triggerCapture();
    await waitFor(() => {
      const badge = screen.getByTestId('grounded-badge-sidecar-disabled');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toMatch(/Validación deshabilitada/i);
    });
    expect(screen.queryByTestId('grounded-badge-verified')).toBeNull();
    expect(screen.queryByTestId('grounded-badge-rejected')).toBeNull();
  });

  it('status:offline → badge SLATE "Sin conexión"', async () => {
    mockRecognizeSpeciesGrounded.mockResolvedValue(
      buildResult('offline', { reason: 'Sin conexión, no se pudo verificar.' })
    );
    render(<SpeciesSelect value="" onChange={() => {}} />);
    await triggerCapture();
    await waitFor(() => {
      const badge = screen.getByTestId('grounded-badge-offline');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toMatch(/Sin conexión/i);
    });
  });

  it('status:no-binomial → badge AMBER "Nombre ambiguo"', async () => {
    mockRecognizeSpeciesGrounded.mockResolvedValue(
      buildResult('no-binomial', { reason: 'Nombre científico ambiguo.' })
    );
    render(<SpeciesSelect value="" onChange={() => {}} />);
    await triggerCapture();
    await waitFor(() => {
      const badge = screen.getByTestId('grounded-badge-no-binomial');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toMatch(/Nombre ambiguo/i);
    });
  });

  it('status:sidecar-error → badge AMBER "Error temporal"', async () => {
    mockRecognizeSpeciesGrounded.mockResolvedValue(
      buildResult('sidecar-error', { reason: 'Error temporal del catálogo.' })
    );
    render(<SpeciesSelect value="" onChange={() => {}} />);
    await triggerCapture();
    await waitFor(() => {
      const badge = screen.getByTestId('grounded-badge-sidecar-error');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toMatch(/Error temporal/i);
    });
  });
});
