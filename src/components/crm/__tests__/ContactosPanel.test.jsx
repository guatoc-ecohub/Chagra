/**
 * ContactosPanel.test.jsx — Tests del componente ContactosPanel
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactosPanel } from '../ContactosPanel.jsx';

describe('ContactosPanel', () => {
  const mockContacts = [
    {
      id: '1',
      attributes: {
        name: 'Juan Pérez',
        contact_type: 'campesino',
        status: 'activo',
        vereda: 'La Esperanza',
        municipio: 'Filandia',
        phone: '1234567890',
      },
    },
    {
      id: '2',
      attributes: {
        name: 'María González',
        contact_type: 'tecnico',
        status: 'activo',
        vereda: 'El Bosque',
        municipio: 'Salento',
      },
    },
  ];

  it('debería renderizar la lista de contactos', () => {
    render(<ContactosPanel contacts={mockContacts} />);
    
    expect(screen.getByText('Juan Pérez')).toBeDefined();
    expect(screen.getByText('María González')).toBeDefined();
  });

  it('debería mostrar el tipo de contacto', () => {
    render(<ContactosPanel contacts={mockContacts} />);
    
    expect(screen.getByText('Campesino')).toBeDefined();
    expect(screen.getByText('Técnico')).toBeDefined();
  });

  it('debería filtrar por término de búsqueda', () => {
    const { container } = render(<ContactosPanel contacts={mockContacts} />);
    
    const input = container.querySelector('input[type="text"]');
    input.value = 'Juan';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Después de filtrar, solo debería mostrar Juan
    expect(screen.getByText('Juan Pérez')).toBeDefined();
    expect(screen.queryByText('María González')).toBeNull();
  });

  it('debería mostrar el contador de contactos', () => {
    const { container } = render(<ContactosPanel contacts={mockContacts} />);
    
    expect(container.textContent).toContain('Mostrando 2 de 2 contactos');
  });

  it('debería llamar a onContactSelect al hacer click en un contacto', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ContactosPanel contacts={mockContacts} onContactSelect={onSelect} />
    );
    
    const contactCard = container.querySelector('[onClick]');
    contactCard.click();
    
    expect(onSelect).toHaveBeenCalledWith(mockContacts[0]);
  });
});
