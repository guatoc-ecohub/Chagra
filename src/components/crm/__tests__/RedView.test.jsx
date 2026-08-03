/**
 * RedView.test.jsx — Tests del componente RedView
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RedView } from '../RedView.jsx';

describe('RedView', () => {
  const mockStats = {
    totalContactos: 15,
    totalInteracciones: 42,
    contactosPorTipo: {
      campesino: 8,
      tecnico: 4,
      comprador: 3,
    },
    interaccionesPorTipo: {
      visita: 18,
      asesoria: 12,
      intercambio_semilla: 8,
      venta: 4,
    },
    contactosMasActivos: [
      { id: '1', name: 'Juan Pérez', type: 'campesino', count: 12 },
      { id: '2', name: 'María González', type: 'tecnico', count: 8 },
    ],
  };

  it('debería renderizar las estadísticas de la red', () => {
    render(<RedView networkStats={mockStats} />);
    
    expect(screen.getByText('15')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
  });

  it('debería mostrar contactos por tipo', () => {
    const { container } = render(<RedView networkStats={mockStats} />);
    
    expect(container.textContent).toContain('Campesino');
    expect(container.textContent).toContain('8');
  });

  it('debería mostrar interacciones por tipo', () => {
    const { container } = render(<RedView networkStats={mockStats} />);
    
    expect(container.textContent).toContain('Visita');
    expect(container.textContent).toContain('18');
  });

  it('debería mostrar contactos más activos', () => {
    const { container } = render(<RedView networkStats={mockStats} />);
    
    expect(container.textContent).toContain('Juan Pérez');
    expect(container.textContent).toContain('12 interacciones');
  });

  it('debería mostrar estado de carga', () => {
    render(<RedView loading />);
    
    expect(screen.getByText(/Cargando/)).toBeDefined();
  });

  it('debería cambiar de tab', () => {
    const { container } = render(<RedView networkStats={mockStats} />);
    
    // Click en tab "Contactos"
    const contactsTab = container.querySelectorAll('button')[1];
    contactsTab.click();
    
    expect(container.textContent).toContain('Contactos por Tipo');
  });
});
