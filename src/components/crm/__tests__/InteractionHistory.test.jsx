/**
 * InteractionHistory.test.jsx — Tests del componente InteractionHistory
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InteractionHistory } from '../InteractionHistory.jsx';

describe('InteractionHistory', () => {
  const mockInteractions = [
    {
      id: '1',
      type: 'log--interaction',
      timestamp: 1625097600,
      attributes: {
        interaction_type: 'visita',
        status: 'done',
        notes: 'Visita de seguimiento al cultivo',
      },
    },
    {
      id: '2',
      type: 'log--interaction',
      timestamp: 1625184000,
      attributes: {
        interaction_type: 'intercambio_semilla',
        status: 'done',
        details: {
          intercambio: {
            especie: 'café',
            cantidad: 5,
            unidad: 'kg',
          },
        },
      },
    },
  ];

  it('debería renderizar el historial de interacciones', () => {
    render(<InteractionHistory interactions={mockInteractions} />);
    
    expect(screen.getByText('Visita')).toBeDefined();
    expect(screen.getByText('Intercambio de Semilla')).toBeDefined();
  });

  it('debería mostrar los detalles del intercambio', () => {
    const { container } = render(
      <InteractionHistory interactions={mockInteractions} />
    );
    
    expect(container.textContent).toContain('Intercambio: 5 kg de café');
  });

  it('debería mostrar el estado de la interacción', () => {
    const { container } = render(
      <InteractionHistory interactions={mockInteractions} />
    );
    
    expect(container.textContent).toContain('Completado');
  });

  it('debería mostrar mensaje cuando no hay interacciones', () => {
    render(<InteractionHistory interactions={[]} />);
    
    expect(
      screen.getByText('No hay interacciones registradas')
    ).toBeDefined();
  });

  it('debería mostrar el contador de interacciones', () => {
    const { container } = render(
      <InteractionHistory interactions={mockInteractions} />
    );
    
    expect(container.textContent).toContain('2 interacciones');
  });
});
