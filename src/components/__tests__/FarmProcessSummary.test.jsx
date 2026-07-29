import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import FarmProcessSummary from '../FarmProcessSummary';

vi.mock('../PhenologyTimeline', () => ({
  default: ({ speciesSlug }) => <div>Timeline {speciesSlug}</div>,
}));

const process = {
  attributes: {
    subject_label: 'Tomate',
    subject_slug: 'solanum_lycopersicum',
    status: 'active',
    current_stage: 'vegetative',
    quantity: 12,
    unit: 'plantas',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-10T00:00:00.000Z',
  },
};

describe('FarmProcessSummary', () => {
  it('muestra estado vacío sin proceso', () => {
    render(<FarmProcessSummary process={null} lastObservation={null} pestRisks={[]} />);
    expect(screen.getByText(/No hay ciclo activo/)).toBeDefined();
  });

  it('renderiza resumen del proceso, timeline y riesgo alto', () => {
    render(
      <FarmProcessSummary
        process={process}
        lastObservation="Hojas sanas"
        pestRisks={[
          { pest: 'Roya', risk: 'alto' },
          { pest: 'Trips', risk: 'medio' },
        ]}
      />
    );

    expect(screen.getByText('Tomate')).toBeDefined();
    expect(screen.getByText('ACTIVO')).toBeDefined();
    expect(screen.getByText(/Etapa:/)).toBeDefined();
    expect(screen.getByText(/vegetative/)).toBeDefined();
    expect(screen.getByText(/12 plantas/)).toBeDefined();
    expect(screen.getByText(/Timeline solanum_lycopersicum/)).toBeDefined();
    expect(screen.getByText(/Hojas sanas/)).toBeDefined();
    expect(screen.getByText(/Riesgo: Roya/)).toBeDefined();
  });

  it('omite timeline en modo compacto', () => {
    render(<FarmProcessSummary process={process} compact={true} lastObservation={null} pestRisks={[]} />);
    expect(screen.queryByText(/Timeline solanum_lycopersicum/)).toBeNull();
  });
});
