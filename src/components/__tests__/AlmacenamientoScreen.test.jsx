/**
 * AlmacenamientoScreen — mini-app "Almacenamiento y Conservación de Alimentos".
 *
 * Contrato cubierto:
 *   - Hub: gancho (silo baja la pérdida) + los cuatro pilares navegables.
 *   - Pilar Almacenar: la calculadora de pérdida evitada produce el grano salvado
 *     (proporción exacta) y la de capacidad calcula kilos.
 *   - Pilar Conservar: el GUARD DE BOTULISMO clasifica por pH; poco ácido = olla
 *     a presión, con autoridad institucional (no una persona).
 *   - Pilar Plagas: aparecen las especies (Prostephanus) y el control sin veneno.
 *   - Pilar Micotoxinas: aflatoxina + señales de descarte.
 *   - Puentes: enlaza a la poscosecha existente (extiende/absorbe) y a la bodega.
 *   - onBack desde el hub; volver desde un pilar regresa al hub.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import AlmacenamientoScreen from '../AlmacenamientoScreen';

afterEach(() => cleanup());

// El nombre accesible de un pilar es "Titulo" + descripción pegados; anclamos al
// inicio para no chocar con otros botones que mencionen la misma palabra
// (p. ej. "Pregúntele al agente… conservar su cosecha").
const irA = (nombre) => fireEvent.click(screen.getByRole('button', { name: nombre }));

describe('AlmacenamientoScreen — hub', () => {
  it('muestra el gancho y los cuatro pilares', () => {
    render(<AlmacenamientoScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByText(/puntos menos de pérdida/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Almacenar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Conservar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Plagas de almacén/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Micotoxinas/i })).toBeTruthy();
  });

  it('botón volver llama onBack desde el hub', () => {
    const onBack = vi.fn();
    render(<AlmacenamientoScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('enlaza a la poscosecha existente (extiende/absorbe, no reimplementa)', () => {
    const onNavigate = vi.fn();
    render(<AlmacenamientoScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Poscosecha y despensa/i }));
    expect(onNavigate).toHaveBeenCalledWith('poscosecha');
  });

  it('enlaza a la bodega existente', () => {
    const onNavigate = vi.fn();
    render(<AlmacenamientoScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Bodega de insumos/i }));
    expect(onNavigate).toHaveBeenCalledWith('bodega');
  });
});

describe('AlmacenamientoScreen — pilar Almacenar (calculadoras deterministas)', () => {
  it('la calculadora de pérdida produce el grano salvado', () => {
    render(<AlmacenamientoScreen onBack={() => {}} />);
    irA(/^Almacenar/i);
    fireEvent.change(screen.getByLabelText(/Cantidad de grano seco a guardar/i), { target: { value: '500' } });
    expect(screen.getByText(/Guardando hermético usted salva/i)).toBeTruthy();
    // 500 × 16,58 % − 500 × 3,94 % = 63,2
    expect(screen.getByText('63.2')).toBeTruthy();
  });

  it('la calculadora de capacidad calcula kilos del silo', () => {
    render(<AlmacenamientoScreen onBack={() => {}} />);
    irA(/^Almacenar/i);
    fireEvent.change(screen.getByLabelText(/^Diámetro \(m\)$/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/^Altura \(m\)$/i), { target: { value: '1' } });
    expect(screen.getByText(/Le caben aproximadamente/i)).toBeTruthy();
  });
});

describe('AlmacenamientoScreen — pilar Conservar (guard de botulismo)', () => {
  it('un pH poco ácido dispara la advertencia crítica de olla a presión', () => {
    render(<AlmacenamientoScreen onBack={() => {}} />);
    irA(/^Conservar/i);
    fireEvent.change(screen.getByLabelText(/pH de la conserva/i), { target: { value: '5.5' } });
    expect(screen.getAllByText(/peligro de MUERTE/i).length).toBeGreaterThan(0);
    // Las dos rutas siempre visibles
    expect(screen.getAllByText(/olla a presión/i).length).toBeGreaterThan(0);
  });

  it('un pH ácido es seguro al baño maría', () => {
    render(<AlmacenamientoScreen onBack={() => {}} />);
    irA(/^Conservar/i);
    fireEvent.change(screen.getByLabelText(/pH de la conserva/i), { target: { value: '4.2' } });
    expect(screen.getByText(/es ácido/i)).toBeTruthy();
  });

  it('el salado se muestra como parámetro grounded-pendiente', () => {
    render(<AlmacenamientoScreen onBack={() => {}} />);
    irA(/^Conservar/i);
    expect(screen.getByText(/Salado y salazón/i)).toBeTruthy();
    expect(screen.getAllByText(/Dato en camino/i).length).toBeGreaterThan(0);
  });
});

describe('AlmacenamientoScreen — pilar Plagas', () => {
  it('lista las especies y el control sin veneno', () => {
    render(<AlmacenamientoScreen onBack={() => {}} />);
    irA(/^Plagas de almacén/i);
    expect(screen.getByText(/Prostephanus truncatus/i)).toBeTruthy();
    expect(screen.getByText(/Hermeticidad/i)).toBeTruthy();
  });
});

describe('AlmacenamientoScreen — pilar Micotoxinas', () => {
  it('muestra aflatoxinas y las señales de descarte', () => {
    render(<AlmacenamientoScreen onBack={() => {}} />);
    irA(/^Micotoxinas/i);
    expect(screen.getAllByText(/Aflatoxinas/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no lo coma ni lo venda/i)).toBeTruthy();
  });

  it('el límite colombiano se marca como dato en camino (grounded-pendiente)', () => {
    render(<AlmacenamientoScreen onBack={() => {}} />);
    irA(/^Micotoxinas/i);
    expect(screen.getAllByText(/Resolución 4506/i).length).toBeGreaterThan(0);
  });
});

describe('AlmacenamientoScreen — navegación', () => {
  it('vuelve al hub con el botón volver desde un pilar', () => {
    const onBack = vi.fn();
    render(<AlmacenamientoScreen onBack={onBack} />);
    irA(/^Plagas de almacén/i);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(within(document.body).getByText(/puntos menos de pérdida/i)).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
  });
});
