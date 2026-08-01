import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PlanEditor from '../PlanEditor';

// Audit 070.7 smoke tests para el PlanEditor. Cubren los tres caminos
// observables del componente:
//   1. Plan presente con `steps` no-vacíos → renderiza encabezado + steps.
//   2. Plan null (IDB sin entrada) → render del CTA "Generar Plan".
//   3. Plan presente pero con steps=[] → render del CTA "Generar Plan"
//      (mismo fallback porque el componente trata ambos casos igual).

const mockGetPlanForAsset = vi.fn();
const mockGeneratePlanForPlant = vi.fn();
const mockUpdatePlanStep = vi.fn();
const mockMarkStepExecuted = vi.fn();

vi.mock('../../services/planGeneratorService', () => ({
  getPlanForAsset: (...args) => mockGetPlanForAsset(...args),
  generatePlanForPlant: (...args) => mockGeneratePlanForPlant(...args),
  updatePlanStep: (...args) => mockUpdatePlanStep(...args),
  markStepExecuted: (...args) => mockMarkStepExecuted(...args),
}));

vi.mock('../../services/operatorIdentityService', () => ({
  getCurrentOperatorHash: () => 'hash-test-0000000000000000000000000000000000000000000000000000000000',
}));

beforeEach(() => {
  mockGetPlanForAsset.mockReset();
  mockGeneratePlanForPlant.mockReset();
  mockUpdatePlanStep.mockReset();
  mockMarkStepExecuted.mockReset();
});

describe('PlanEditor smoke', () => {
  it('renderiza encabezado + steps cuando hay plan con pasos', async () => {
    mockGetPlanForAsset.mockResolvedValue({
      id: 'plan-1',
      asset_id: 'asset-1',
      species_slug: 'solanum_lycopersicum',
      generated_at: Date.now(),
      steps: [
        {
          id: 'step-1',
          scheduled_date: Date.now() + 3 * 86400000,
          action_type: 'biofertilizer_application',
          status: 'pending',
          biofertilizer_slug: 'biol_basico',
          dose_ml: 50,
          notes: 'Aplicar diluido 1:10.',
        },
      ],
    });
    render(<PlanEditor assetId="asset-1" speciesSlug="solanum_lycopersicum" plantingDate={Date.now()} />);
    await waitFor(() => {
      expect(screen.getByText(/Plan de Alimentación/i)).toBeTruthy();
    });
    expect(screen.getByText(/solanum_lycopersicum/i)).toBeTruthy();
    expect(screen.getByText(/Regenerar plan/i)).toBeTruthy();
  });

  it('muestra CTA "Generar Plan" cuando getPlanForAsset retorna null', async () => {
    mockGetPlanForAsset.mockResolvedValue(null);
    render(<PlanEditor assetId="asset-2" speciesSlug="zea_mays" plantingDate={Date.now()} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generar Plan/i })).toBeTruthy();
    });
    expect(screen.getByText(/Sin plan/i)).toBeTruthy();
  });

  it('muestra CTA "Generar Plan" cuando el plan tiene steps vacíos', async () => {
    mockGetPlanForAsset.mockResolvedValue({
      id: 'plan-empty',
      asset_id: 'asset-3',
      species_slug: 'phaseolus_vulgaris',
      generated_at: Date.now(),
      steps: [],
    });
    render(<PlanEditor assetId="asset-3" speciesSlug="phaseolus_vulgaris" plantingDate={Date.now()} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generar Plan/i })).toBeTruthy();
    });
  });
});
