/**
 * InsightProactivoCard.test.jsx — el insight proactivo del agente guiado DENTRO
 * del chat: oferta (opt-in) → entrega del dato verificado.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import InsightProactivoCard from './InsightProactivoCard.jsx';

const INSIGHT = {
  id: 'cafe-recoleccion-sanitaria',
  entity_slug: 'cafe',
  titulo: 'Recolección sanitaria baja la broca',
  dato: 'Retirar los granos dañados o caídos del suelo elimina la mayor parte de la población de broca.',
  cifra: '66–74 % de la población de broca retirada',
  binomio: 'Hypothenemus hampei',
  fuente: 'Cenicafé',
  doi: 'https://biblioteca.cenicafe.org',
  non_co: false,
  region_analoga: null,
  leccion_base: 'mip',
};

describe('InsightProactivoCard', () => {
  it('no renderiza nada si no hay insight', () => {
    const { container } = render(<InsightProactivoCard insight={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra la OFERTA con identidad de Chagra (no expande el dato aún)', () => {
    render(<InsightProactivoCard insight={INSIGHT} onDismiss={vi.fn()} />);
    expect(screen.getByTestId('insight-proactivo-oferta')).toBeInTheDocument();
    // El marco de marca (mano + colibrí + rama radial) está presente.
    expect(screen.getByTestId('insight-proactivo-frame')).toBeInTheDocument();
    // El dato completo NO está visible todavía (opt-in pendiente).
    expect(screen.queryByText(INSIGHT.dato)).toBeNull();
  });

  it('aceptar la oferta expande la InsightCard con el dato y la fuente', () => {
    render(<InsightProactivoCard insight={INSIGHT} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTestId('insight-proactivo-aceptar'));

    expect(screen.getByTestId('insight-proactivo-aceptado')).toBeInTheDocument();
    expect(screen.getByText(INSIGHT.dato)).toBeInTheDocument();
    // La fuente es obligatoria en la InsightCard.
    expect(screen.getByText(/Cenicafé/)).toBeInTheDocument();
  });

  it('rechazar llama onDismiss', () => {
    const onDismiss = vi.fn();
    render(<InsightProactivoCard insight={INSIGHT} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('insight-proactivo-rechazar'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
