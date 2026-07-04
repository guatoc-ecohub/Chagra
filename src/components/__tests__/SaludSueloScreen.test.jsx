/**
 * SaludSueloScreen — mini-app "Cuaderno del Suelo" (módulo Salud del Suelo).
 *
 * Contrato cubierto:
 *   - Hub: caso insignia + los tres pilares navegables.
 *   - Pilar 1: interpreta valores del análisis (pH ácido → aviso).
 *   - Pilar 2: la calculadora de encalado produce una dosis con la fórmula.
 *   - Pilar 3: enlaza a micorrizas (Mundo Subsuelo) sin reimplementarlas.
 *   - Puentes: enlaza a la cromatografía y al diagnóstico folk existentes.
 *   - onBack desde el hub.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import SaludSueloScreen from '../SaludSueloScreen';

afterEach(() => cleanup());

const irA = (nombre) => fireEvent.click(screen.getByRole('button', { name: nombre }));

describe('SaludSueloScreen — hub', () => {
  it('muestra el caso insignia y los tres pilares', () => {
    render(<SaludSueloScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByText(/está cansada y ácida/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /¿Cómo está mi suelo\?/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Corregir la acidez/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mejorar el suelo/i })).toBeTruthy();
  });

  it('botón volver llama onBack desde el hub', () => {
    const onBack = vi.fn();
    render(<SaludSueloScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('enlaza a la cromatografía existente (no la reimplementa)', () => {
    const onNavigate = vi.fn();
    render(<SaludSueloScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Cromatografía de suelo/i }));
    expect(onNavigate).toHaveBeenCalledWith('cromatografia');
  });

  it('enlaza al diagnóstico sin laboratorio existente', () => {
    const onNavigate = vi.fn();
    render(<SaludSueloScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Diagnóstico sin laboratorio/i }));
    expect(onNavigate).toHaveBeenCalledWith('suelo');
  });
});

describe('SaludSueloScreen — pilar 1: ¿cómo está mi suelo?', () => {
  it('interpreta un pH ácido y ofrece pasar a la calculadora', () => {
    render(<SaludSueloScreen onBack={() => {}} onNavigate={() => {}} />);
    irA(/¿Cómo está mi suelo\?/i);
    const phInput = screen.getByLabelText(/pH \(acidez\)/i);
    fireEvent.change(phInput, { target: { value: '5.1' } });
    expect(screen.getAllByText(/Ácida/i).length).toBeGreaterThan(0);
    // aparece el puente a la calculadora de acidez
    expect(screen.getByText(/salió ácida/i)).toBeTruthy();
  });

  it('acepta coma decimal en las entradas', () => {
    render(<SaludSueloScreen onBack={() => {}} />);
    irA(/¿Cómo está mi suelo\?/i);
    const moInput = /** @type {HTMLInputElement} */ (screen.getByLabelText(/Materia orgánica/i));
    fireEvent.change(moInput, { target: { value: '1,2' } });
    expect(moInput.value).toBe('1.2');
    expect(screen.getByText(/Baja/i)).toBeTruthy();
  });
});

describe('SaludSueloScreen — pilar 2: calculadora de encalado', () => {
  it('calcula la saturación de aluminio y una dosis de cal', () => {
    render(<SaludSueloScreen onBack={() => {}} />);
    irA(/Corregir la acidez/i);
    fireEvent.change(screen.getByLabelText(/Aluminio \(Al\)/i), { target: { value: '1.8' } });
    fireEvent.change(screen.getByLabelText(/Calcio \(Ca\)/i), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText(/Magnesio \(Mg\)/i), { target: { value: '0.8' } });
    fireEvent.change(screen.getByLabelText(/Potasio \(K\)/i), { target: { value: '0.3' } });
    // saturación ~33%
    expect(screen.getByText(/33%/)).toBeTruthy();
    // muestra una dosis en t/ha
    expect(screen.getAllByText(/t\/ha/i).length).toBeGreaterThan(0);
    // referencia honesta a la fórmula
    expect(screen.getAllByText(/Cochrane/i).length).toBeGreaterThan(0);
  });

  it('con aluminio bajo no recomienda encalar', () => {
    render(<SaludSueloScreen onBack={() => {}} />);
    irA(/Corregir la acidez/i);
    fireEvent.change(screen.getByLabelText(/Aluminio \(Al\)/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/Calcio \(Ca\)/i), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/Magnesio \(Mg\)/i), { target: { value: '1.5' } });
    expect(screen.getByText(/No necesita encalar/i)).toBeTruthy();
  });
});

describe('SaludSueloScreen — pilar 3: mejorar el suelo / micorrizas', () => {
  it('enlaza a Mundo Subsuelo para las micorrizas (grafo)', () => {
    const onNavigate = vi.fn();
    render(<SaludSueloScreen onBack={() => {}} onNavigate={onNavigate} />);
    irA(/Mejorar el suelo/i);
    expect(screen.getByText(/el internet del suelo/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Mundo Subsuelo/i }));
    expect(onNavigate).toHaveBeenCalledWith('subsuelo');
  });

  it('vuelve al hub con el botón volver desde un pilar', () => {
    const onBack = vi.fn();
    render(<SaludSueloScreen onBack={onBack} />);
    irA(/Mejorar el suelo/i);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    // de vuelta en el hub: se ve el caso insignia; onBack NO se llamó aún
    expect(within(document.body).getByText(/está cansada y ácida/i)).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
  });
});
