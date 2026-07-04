/**
 * PoscosechaScreen — mini-app "Poscosecha y Despensa" (mundo Mercado y despensa).
 *
 * Contrato cubierto:
 *   - Hub: gancho (pérdida país) + los tres pilares navegables.
 *   - Pilar 1: la materia seca del aguacate se evalúa contra el umbral.
 *   - Pilar 2: la calculadora de secado produce el agua a sacar (balance de masa)
 *     y las dos recetas OPUESTAS de curado aparecen.
 *   - Pilar 3: el queso está marcado como punto crítico (pasteurizar).
 *   - Puentes: enlaza a la bodega existente sin reimplementarla.
 *   - onBack desde el hub; volver desde un pilar regresa al hub.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import PoscosechaScreen from '../PoscosechaScreen';

afterEach(() => cleanup());

const irA = (nombre) => fireEvent.click(screen.getByRole('button', { name: nombre }));

describe('PoscosechaScreen — hub', () => {
  it('muestra el gancho y los tres pilares', () => {
    render(<PoscosechaScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByText(/1 de cada 3 productos/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cosechar en punto/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Guardar bien/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Transformar/i })).toBeTruthy();
  });

  it('botón volver llama onBack desde el hub', () => {
    const onBack = vi.fn();
    render(<PoscosechaScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('enlaza a la bodega existente (no la reimplementa)', () => {
    const onNavigate = vi.fn();
    render(<PoscosechaScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Bodega de insumos/i }));
    expect(onNavigate).toHaveBeenCalledWith('bodega');
  });
});

describe('PoscosechaScreen — pilar 1: cosechar en punto', () => {
  it('evalúa la materia seca del aguacate contra el umbral', () => {
    render(<PoscosechaScreen onBack={() => {}} />);
    irA(/Cosechar en punto/i);
    const input = screen.getByLabelText(/Materia seca del aguacate/i);
    fireEvent.change(input, { target: { value: '19' } });
    expect(screen.getByText(/Aún verde/i)).toBeTruthy();
    fireEvent.change(input, { target: { value: '24' } });
    expect(screen.getByText(/punto óptimo/i)).toBeTruthy();
  });
});

describe('PoscosechaScreen — pilar 2: guardar bien', () => {
  it('la calculadora de secado produce el agua a sacar', () => {
    render(<PoscosechaScreen onBack={() => {}} />);
    irA(/Guardar bien/i);
    fireEvent.change(screen.getByLabelText(/Peso mojado del grano/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Humedad actual del grano/i), { target: { value: '22' } });
    expect(screen.getByText(/de agua a sacar/i)).toBeTruthy();
    expect(screen.getByText(/de grano seco/i)).toBeTruthy();
  });

  it('avisa cuando el grano ya está en punto', () => {
    render(<PoscosechaScreen onBack={() => {}} />);
    irA(/Guardar bien/i);
    fireEvent.change(screen.getByLabelText(/Peso mojado del grano/i), { target: { value: '100' } });
    // 12 % ya está por debajo del objetivo del maíz (13 %)
    fireEvent.change(screen.getByLabelText(/Humedad actual del grano/i), { target: { value: '12' } });
    expect(screen.getByText(/Ya está en punto/i)).toBeTruthy();
  });

  it('muestra las dos recetas OPUESTAS de curado', () => {
    render(<PoscosechaScreen onBack={() => {}} />);
    irA(/Guardar bien/i);
    expect(screen.getByText(/Raíces y tubérculos/i)).toBeTruthy();
    expect(screen.getByText(/Cebolla y ajo/i)).toBeTruthy();
    // receta húmeda vs seca
    expect(screen.getAllByText(/húmedo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/seco/i).length).toBeGreaterThan(0);
  });
});

describe('PoscosechaScreen — pilar 3: transformar', () => {
  it('el queso lleva el punto crítico de pasteurizar', () => {
    render(<PoscosechaScreen onBack={() => {}} />);
    irA(/Transformar/i);
    expect(screen.getByText(/^Quesos$/i)).toBeTruthy();
    expect(screen.getByText(/PASTEURICE/i)).toBeTruthy();
  });

  it('vuelve al hub con el botón volver desde un pilar', () => {
    const onBack = vi.fn();
    render(<PoscosechaScreen onBack={onBack} />);
    irA(/Transformar/i);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(within(document.body).getByText(/1 de cada 3 productos/i)).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
  });
});
