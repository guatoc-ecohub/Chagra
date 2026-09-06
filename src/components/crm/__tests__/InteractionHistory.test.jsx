import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InteractionHistory } from '../InteractionHistory.jsx';

const interactions = [
  { id: 'visit-1', timestamp: 1625097600, attributes: { crm_interaction_type: 'visita', status: 'done', notes: 'Visita de seguimiento al cultivo' } },
  { id: 'sale-1', timestamp: 1625184000, attributes: { crm_interaction_type: 'venta', status: 'done', result: 'Entrega acordada', details: { venta: { producto: 'Café', cantidad: 5, unidad: 'kg', valor: 30000 } } } },
];

describe('InteractionHistory', () => {
  it('renders interaction type, notes, details, result, status, and count', () => {
    render(<InteractionHistory interactions={interactions} contactName="Juan Pérez" />);

    expect(screen.getByRole('heading', { name: 'Historial de Juan Pérez' })).toBeInTheDocument();
    expect(screen.getByText('Visita')).toBeInTheDocument();
    expect(screen.getByText('Venta')).toBeInTheDocument();
    expect(screen.getByText('Visita de seguimiento al cultivo')).toBeInTheDocument();
    expect(screen.getByText('Venta: 5 kg de Café por $30000')).toBeInTheDocument();
    expect(screen.getByText('✅ Entrega acordada')).toBeInTheDocument();
    expect(screen.getAllByText('Completada')).toHaveLength(2);
    expect(screen.getByText('2 interacciones')).toBeInTheDocument();
  });

  it('uses the timestamp nested in attributes when needed', () => {
    render(<InteractionHistory interactions={[{ id: 'message-1', attributes: { timestamp: 1625097600, crm_interaction_type: 'mensaje', status: 'done' } }]} />);

    expect(screen.queryByText('Fecha desconocida')).not.toBeInTheDocument();
  });

  it('calls the new-interaction callback and renders the empty state', async () => {
    const user = userEvent.setup();
    const onNewInteraction = vi.fn();
    const { rerender } = render(<InteractionHistory interactions={interactions} onNewInteraction={onNewInteraction} />);

    await user.click(screen.getByRole('button', { name: /Nueva Interacción/i }));
    expect(onNewInteraction).toHaveBeenCalledOnce();

    rerender(<InteractionHistory interactions={[]} />);
    expect(screen.getByText('No hay interacciones registradas')).toBeInTheDocument();
  });
});
