import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactosPanel } from '../ContactosPanel.jsx';

const contacts = [
  { id: 'campesino-1', attributes: { name: 'Juan Pérez', crm_contact_type: 'campesino', status: 'active', vereda: 'La Esperanza' } },
  { id: 'tecnico-1', attributes: { name: 'María González', crm_contact_type: 'tecnico', status: 'active', vereda: 'El Bosque' } },
  { id: 'proveedor-1', attributes: { name: 'Semillas Andinas', crm_contact_type: 'proveedor', status: 'archived', municipio: 'Salento' } },
];

describe('ContactosPanel', () => {
  it('renders contacts with their CRM type and derived count', () => {
    render(<ContactosPanel contacts={contacts} />);

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getAllByText('Técnico')).toHaveLength(2);
    expect(screen.getAllByText('Proveedor')).toHaveLength(2);
    expect(screen.getByText('Mostrando 3 de 3 contactos')).toBeInTheDocument();
  });

  it('filters by search, contact type, and status', async () => {
    const user = userEvent.setup();
    render(<ContactosPanel contacts={contacts} />);

    await user.type(screen.getByRole('textbox', { name: 'Buscar contactos' }), 'Bosque');
    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();

    await user.clear(screen.getByRole('textbox', { name: 'Buscar contactos' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar contactos por tipo' }), 'proveedor');
    expect(screen.getByText('Semillas Andinas')).toBeInTheDocument();
    expect(screen.queryByText('María González')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar contactos por tipo' }), 'all');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar contactos por estado' }), 'archived');
    expect(screen.getByText('Semillas Andinas')).toBeInTheDocument();
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
  });

  it('exposes accessible callbacks for selection and creation', async () => {
    const user = userEvent.setup();
    const onContactSelect = vi.fn();
    const onNewContact = vi.fn();
    render(<ContactosPanel contacts={contacts} onContactSelect={onContactSelect} onNewContact={onNewContact} />);

    await user.click(screen.getByRole('button', { name: 'Ver historial de Juan Pérez' }));
    await user.click(screen.getByRole('button', { name: /Nuevo Contacto/i }));

    expect(onContactSelect).toHaveBeenCalledWith(contacts[0]);
    expect(onNewContact).toHaveBeenCalledOnce();
  });

  it('renders the empty state and can hide filters', () => {
    render(<ContactosPanel contacts={[]} showFilters={false} />);

    expect(screen.getByText('No hay contactos que coincidan con los filtros')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
