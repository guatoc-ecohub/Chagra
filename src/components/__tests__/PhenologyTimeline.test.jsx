import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PhenologyTimeline from '../PhenologyTimeline';

const SOWING = 1700000000000;

describe('PhenologyTimeline', () => {
  it('muestra mensaje si faltan datos', () => {
    render(<PhenologyTimeline speciesSlug="" sowingDate={0} />);
    expect(screen.getByText(/Datos insuficientes/)).toBeDefined();
  });

  it('muestra mensaje si la plantilla no existe', () => {
    render(<PhenologyTimeline speciesSlug="nonexistent" sowingDate={SOWING} />);
    expect(screen.getByText(/No hay plantilla/)).toBeDefined();
  });

  it('renderiza etapas del tomate', () => {
    render(<PhenologyTimeline speciesSlug="solanum_lycopersicum" sowingDate={SOWING} altitudeM={1000} />);
    expect(screen.getByText('Siembra / Trasplante')).toBeDefined();
    expect(screen.getByText(/Cosecha/)).toBeDefined();
    expect(screen.getByText(/Ciclo cerrado/)).toBeDefined();
  });

  it('incluye disclaimer de que son ventanas estimadas', () => {
    render(<PhenologyTimeline speciesSlug="solanum_lycopersicum" sowingDate={SOWING} />);
    expect(screen.getByText(/No representan observación real/)).toBeDefined();
  });

  it('muestra altitud si se proporciona', () => {
    render(<PhenologyTimeline speciesSlug="coffea_arabica" sowingDate={SOWING} altitudeM={1800} />);
    expect(screen.getByText(/1800 msnm/)).toBeDefined();
  });

  it('resalta etapa observada', () => {
    render(
      <PhenologyTimeline
        speciesSlug="solanum_lycopersicum"
        sowingDate={SOWING}
        altitudeM={1000}
        observedStages={[{ code: 'flowering', observed_at: SOWING + 30 * 86400000, confidence: 1 }]}
      />
    );
    // La etapa observada debe mostrar el ícono Eye
    expect(screen.getByText(/Floración/)).toBeDefined();
  });

  it('modo compacto oculta fuentes y disclaimer', () => {
    render(
      <PhenologyTimeline
        speciesSlug="solanum_lycopersicum"
        sowingDate={SOWING}
        compact={true}
      />
    );
    expect(screen.queryByText(/No representan observación real/)).toBeNull();
    expect(screen.queryByText(/Fuente:/)).toBeNull();
  });
});
