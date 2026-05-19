import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PlanEditor from '../PlanEditor';

// Mock del service planGeneratorService — el comportamiento por test se
// configura sobreescribiendo mockResolvedValueOnce de getPlanForAsset en
// cada `it()`. Audit finding 070.7: validar render con plan + fallback sin
// plan después de montar PlanEditor en AssetDetailView.
vi.mock('../../services/planGeneratorService', () => ({
  getPlanForAsset: vi.fn(),
  generatePlanForPlant: vi.fn(),
  updatePlanStep: vi.fn(),
  markStepExecuted: vi.fn(),
}));

vi.mock('../../services/operatorIdentityService', () => ({
  getCurrentOperatorHash: () => 'test-hash',
}));

import {
  getPlanForAsset,
  generatePlanForPlant,
} from '../../services/planGeneratorService';

const samplePlan = {
  id: 'plan-1',
  asset_id: 'asset-1',
  species_slug: 'tomate',
  generated_at: Date.now(),
  scale_notes: 'Sugerencia para huerto casero',
  companions: ['albahaca'],
  antagonists: ['hinojo'],
  steps: [
    {
      id: 'step-1',
      scheduled_date: Date.now() + 7 * 86400000,
      action_type: 'apply_biofertilizer',
      biofertilizer_slug: 'biol_tomate',
      dose_ml: 100,
      status: 'pending',
      stock_unavailable: false,
      notes: 'Aplicar al pie de la planta',
    },
  ],
};

describe('PlanEditor smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el plan cuando getPlanForAsset devuelve un plan con steps', async () => {
    getPlanForAsset.mockResolvedValueOnce(samplePlan);

    render(<PlanEditor assetId="asset-1" speciesSlug="tomate" />);

    await waitFor(() => {
      expect(screen.getByText(/Plan de Alimentación/i)).toBeTruthy();
    });

    // El plan trae scale_notes — debe mostrarlas como sugerencia agronómica.
    expect(screen.getByText(/Sugerencia para huerto casero/i)).toBeTruthy();
    // Y al menos un step con su biofertilizer_slug visible (input editable
    // del asesor o span sólo-lectura del operador básico).
    expect(screen.getAllByDisplayValue('biol_tomate').length).toBeGreaterThan(0);
    // Botón regenerar plan visible.
    expect(screen.getByText(/Regenerar plan/i)).toBeTruthy();
  });

  it('muestra fallback "Generar Plan" cuando getPlanForAsset devuelve null', async () => {
    getPlanForAsset.mockResolvedValueOnce(null);

    render(<PlanEditor assetId="asset-2" speciesSlug="aji_dulce" />);

    await waitFor(() => {
      expect(screen.getByText(/Sin plan/i)).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: /Generar Plan/i })).toBeTruthy();
    // generatePlanForPlant aún no fue invocado (solo al click).
    expect(generatePlanForPlant).not.toHaveBeenCalled();
  });

  it('muestra fallback cuando el plan existe pero tiene steps vacíos', async () => {
    getPlanForAsset.mockResolvedValueOnce({
      ...samplePlan,
      steps: [],
    });

    render(<PlanEditor assetId="asset-3" speciesSlug="quinoa" />);

    await waitFor(() => {
      expect(screen.getByText(/Sin plan/i)).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /Generar Plan/i })).toBeTruthy();
  });
});
