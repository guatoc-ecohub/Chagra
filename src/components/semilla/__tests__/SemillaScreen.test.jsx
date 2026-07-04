/**
 * SemillaScreen — mini-app "Semilla" (soberanía de semilla).
 *
 * Contrato cubierto:
 *   - Hub: marco de soberanía + los tres pilares navegables + volver.
 *   - Pilar Seleccionar: la calculadora de plantas madre responde.
 *   - Pilar Guardar: la rama decisiva advierte que un recalcitrante NO se seca.
 *   - Pilar Germinar: la prueba casera calcula el % e interpreta el resultado.
 *   - Puente honesto al módulo Semilleros existente (no lo reimplementa).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SemillaScreen from '../SemillaScreen';

afterEach(() => cleanup());

const irA = (nombre) => fireEvent.click(screen.getByRole('button', { name: nombre }));

describe('SemillaScreen — hub', () => {
  it('muestra el marco de soberanía y los tres pilares', () => {
    render(<SemillaScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByText(/guarda su autonomía/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Seleccionar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Guardar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Probar germinación/i })).toBeTruthy();
  });

  it('botón volver llama onBack desde el hub', () => {
    const onBack = vi.fn();
    render(<SemillaScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('SemillaScreen — pilar Seleccionar', () => {
  it('la calculadora avisa cuando no alcanzan las plantas madre de maíz', () => {
    render(<SemillaScreen onBack={() => {}} />);
    irA(/Seleccionar/i);
    const input = screen.getByLabelText(/Plantas buenas disponibles/i);
    fireEvent.change(input, { target: { value: '90' } });
    // 90 → tras roguing 76 < 100 mínimo del maíz.
    expect(screen.getByText(/No alcanza/i)).toBeTruthy();
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
  });

  it('cambiar a fríjol usa su mínimo bajo (autógama)', () => {
    render(<SemillaScreen onBack={() => {}} />);
    irA(/Seleccionar/i);
    fireEvent.click(screen.getByRole('button', { name: /^Fríjol$/i }));
    const input = screen.getByLabelText(/Plantas buenas disponibles/i);
    fireEvent.change(input, { target: { value: '30' } });
    expect(screen.getByText(/Alcanza/i)).toBeTruthy();
  });
});

describe('SemillaScreen — pilar Guardar (rama decisiva)', () => {
  it('advierte que el cacao es recalcitrante y NO se seca', () => {
    render(<SemillaScreen onBack={() => {}} />);
    irA(/Guardar/i);
    const input = screen.getByLabelText(/Nombre de la semilla a clasificar/i);
    fireEvent.change(input, { target: { value: 'cacao' } });
    expect(screen.getByText(/Recalcitrante/i)).toBeTruthy();
    expect(screen.getByText(/siémbrela\s+fresca/i)).toBeTruthy();
  });

  it('el fríjol sale ortodoxo (se seca y se guarda)', () => {
    render(<SemillaScreen onBack={() => {}} />);
    irA(/Guardar/i);
    const input = screen.getByLabelText(/Nombre de la semilla a clasificar/i);
    fireEvent.change(input, { target: { value: 'fríjol' } });
    expect(screen.getByText(/Ortodoxa/i)).toBeTruthy();
  });

  it('la calculadora de Harrington muestra el factor de vida por defecto', () => {
    render(<SemillaScreen onBack={() => {}} />);
    irA(/Guardar/i);
    // Valores por defecto: 12→8 % y 25→10 °C = ×128.
    expect(screen.getByText(/× 128/)).toBeTruthy();
  });
});

describe('SemillaScreen — pilar Germinar', () => {
  it('calcula el % y ofrece el ajuste de densidad cuando es baja', () => {
    render(<SemillaScreen onBack={() => {}} />);
    irA(/Probar germinación/i);
    const nacieron = screen.getByLabelText(/Semillas que nacieron/i);
    fireEvent.change(nacieron, { target: { value: '40' } });
    // 40/100 = 40 % → descartar, ajuste ×2.5.
    expect(screen.getByText(/Muy baja/i)).toBeTruthy();
    expect(screen.getByText(/× 2\.5/)).toBeTruthy();
  });

  it('enlaza al módulo Semilleros existente (no lo reimplementa)', () => {
    const onNavigate = vi.fn();
    render(<SemillaScreen onBack={() => {}} onNavigate={onNavigate} />);
    irA(/Probar germinación/i);
    fireEvent.click(screen.getByRole('button', { name: /Registrar la prueba en Semilleros/i }));
    expect(onNavigate).toHaveBeenCalledWith('germinacion');
  });
});
