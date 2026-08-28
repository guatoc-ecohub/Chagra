import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RedView } from '../RedView.jsx';

const stats = {
  totalContactos: 15,
  totalInteracciones: 42,
  contactosPorTipo: { campesino: 8, tecnico: 4, proveedor: 3 },
  interaccionesPorTipo: { visita: 18, asesoria: 12, intercambio: 8, venta: 4 },
  contactosMasActivos: [
    { id: 'contact-1', name: 'Juan Pérez', type: 'campesino', count: 12 },
    { id: 'contact-2', name: 'María González', type: 'tecnico', count: 8 },
  ],
};

describe('RedView', () => {
  it('renders loading and missing-data states', () => {
    const { rerender } = render(<RedView loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando red…');

    rerender(<RedView networkStats={null} />);
    expect(screen.getByText('No hay datos disponibles para mostrar')).toBeInTheDocument();
  });

  it('renders the overview and navigates each derived network tab', async () => {
    const user = userEvent.setup();
    render(<RedView networkStats={stats} />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Contactos' }));
    expect(screen.getByText('Contactos por Tipo')).toBeInTheDocument();
    expect(screen.getByText('Proveedor')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Interacciones' }));
    expect(screen.getByText('Interacciones por Tipo')).toBeInTheDocument();
    expect(screen.getByText('Intercambio')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Más Activos' }));
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('12 interacciones')).toBeInTheDocument();
  });

  it('renders each empty derived list without throwing', async () => {
    const user = userEvent.setup();
    render(<RedView networkStats={{ totalContactos: 0, totalInteracciones: 0, contactosPorTipo: {}, interaccionesPorTipo: {}, contactosMasActivos: [] }} />);

    await user.click(screen.getByRole('button', { name: 'Contactos' }));
    expect(screen.getByText('No hay contactos registrados')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Interacciones' }));
    expect(screen.getByText('No hay interacciones registradas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Más Activos' }));
    expect(screen.getByText('No hay suficientes datos para mostrar')).toBeInTheDocument();
  });
});
