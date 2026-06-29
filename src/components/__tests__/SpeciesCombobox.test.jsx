import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Catálogo controlado para el combobox. Shape igual a getAllSpecies().
// Inline dentro del factory (vi.mock se hoistea sobre el módulo).
vi.mock('../../db/catalogDB', () => ({
  getAllSpecies: vi.fn().mockResolvedValue([
    { id: 'fragaria_ananassa', nombre_comun: 'Fresa', nombre_cientifico: 'Fragaria × ananassa', categoria: 'frutal' },
    { id: 'coffea_arabica', nombre_comun: 'Café', nombre_cientifico: 'Coffea arabica', categoria: 'frutal' },
    { id: 'rubus_glaucus', nombre_comun: 'Mora de Castilla', nombre_cientifico: 'Rubus glaucus', categoria: 'frutal' },
  ]),
}));

import SpeciesCombobox from '../SpeciesCombobox';

const openAndType = async (text) => {
  // Abrir el combobox (clic en el display cerrado).
  fireEvent.click(screen.getByText('Seleccionar especie…'));
  const input = await screen.findByTestId('species-combobox-input');
  fireEvent.change(input, { target: { value: text } });
  return input;
};

describe('SpeciesCombobox — selector grounded del catálogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista las especies del catálogo al buscar', async () => {
    render(<SpeciesCombobox value="" speciesId={null} onChange={() => {}} label="Cultivo" />);
    await openAndType('fres');
    // La opción del catálogo aparece con nombre común + científico.
    expect(await screen.findByText(/Fresa \(Fragaria × ananassa\)/)).toBeInTheDocument();
    // Otra especie no coincidente no debe estar.
    expect(screen.queryByText(/Café \(Coffea/)).toBeNull();
  });

  it('elegir una especie setea el nombre común limpio + el id canónico', async () => {
    const onChange = vi.fn();
    render(<SpeciesCombobox value="" speciesId={null} onChange={onChange} label="Cultivo" />);
    await openAndType('fres');
    fireEvent.click(await screen.findByText(/Fresa \(Fragaria × ananassa\)/));
    // commonName limpio "Fresa" (no el display con científico) + slug del catálogo.
    expect(onChange).toHaveBeenCalledWith('Fresa', 'fragaria_ananassa');
  });

  it('sin coincidencia ofrece texto libre EXPLÍCITO y marcado (no es el default)', async () => {
    const onChange = vi.fn();
    render(<SpeciesCombobox value="" speciesId={null} onChange={onChange} label="Cultivo" />);
    await openAndType('zxqwy');
    const freeBtn = await screen.findByTestId('species-combobox-freetext');
    expect(freeBtn).toBeInTheDocument();
    expect(freeBtn.textContent).toMatch(/nombre libre/i);
    fireEvent.click(freeBtn);
    // Texto libre → id null: el consumidor sabe que NO resuelve calendario.
    expect(onChange).toHaveBeenCalledWith('zxqwy', null);
  });

  it('muestra estado grounded cuando hay especie del catálogo seleccionada', () => {
    render(<SpeciesCombobox value="Fresa" speciesId="fragaria_ananassa" onChange={() => {}} label="Cultivo" />);
    expect(screen.getByTestId('species-grounded-ok')).toBeInTheDocument();
    expect(screen.queryByTestId('species-freetext-warn')).toBeNull();
  });

  it('avisa cuando el valor es texto libre (sin id de catálogo)', () => {
    render(<SpeciesCombobox value="Fresa rara" speciesId={null} onChange={() => {}} label="Cultivo" />);
    expect(screen.getByTestId('species-freetext-warn')).toBeInTheDocument();
    expect(screen.queryByTestId('species-grounded-ok')).toBeNull();
  });
});
