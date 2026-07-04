/**
 * AguaScreen.test.jsx — módulo "Agua de la finca".
 *
 * Cubre:
 *   1. Render base: camino del agua + los 3 pilares navegables.
 *   2. Calculadora de lluvia: 100 m² × 100 mm → 8.000 L (determinista).
 *   3. Cambio de pilar: riego (calculadora ETc) y cuidar (caso nacimiento).
 *   4. Honestidad grounded: los slots pendientes se pintan como "dato en
 *      camino", nunca como cifra.
 *   5. Puente al agente (onNavigate).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AguaScreen from './AguaScreen.jsx';

describe('AguaScreen — render base', () => {
  it('monta la pantalla con el camino del agua y los 3 pilares', () => {
    render(<AguaScreen onBack={() => {}} />);
    expect(screen.getByTestId('agua-screen')).toBeInTheDocument();
    expect(screen.getByTestId('camino-del-agua')).toBeInTheDocument();
    expect(screen.getByTestId('pilar-tab-lluvia')).toBeInTheDocument();
    expect(screen.getByTestId('pilar-tab-riego')).toBeInTheDocument();
    expect(screen.getByTestId('pilar-tab-cuidar')).toBeInTheDocument();
    // Arranca en el pilar de lluvia
    expect(screen.getByTestId('pilar-lluvia')).toBeInTheDocument();
  });
});

describe('AguaScreen — calculadora de cosecha de lluvia', () => {
  it('calcula litros al mes: 100 m² × 100 mm × 0.8 = 8.000 L', () => {
    render(<AguaScreen onBack={() => {}} />);
    expect(screen.getByTestId('calc-lluvia-vacia')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('agua-area-techo'), { target: { value: '100' } });
    fireEvent.change(screen.getByTestId('agua-lluvia-mes'), { target: { value: '100' } });

    const resultado = screen.getByTestId('calc-lluvia-resultado');
    expect(resultado).toHaveTextContent('8.000');
    expect(resultado).toHaveTextContent('litros al mes');
    // Con el tanque default de 1.000 L queda lleno (100%)
    expect(resultado).toHaveTextContent('100%');
  });

  it('no muestra resultado con entradas incompletas', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.change(screen.getByTestId('agua-area-techo'), { target: { value: '100' } });
    expect(screen.queryByTestId('calc-lluvia-resultado')).toBeNull();
  });
});

describe('AguaScreen — pilar riego', () => {
  it('calcula ETc y litros/día con valores digitados', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-riego'));
    expect(screen.getByTestId('pilar-riego')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('agua-eto'), { target: { value: '4' } });
    fireEvent.change(screen.getByTestId('agua-kc'), { target: { value: '1.15' } });
    fireEvent.change(screen.getByTestId('agua-area-riego'), { target: { value: '100' } });

    const resultado = screen.getByTestId('calc-riego-resultado');
    expect(resultado).toHaveTextContent('460');
    expect(resultado).toHaveTextContent('litros al día');
    expect(resultado).toHaveTextContent('4.6 mm/día');
  });

  it('muestra los Kc de cultivos como slots grounded-pendiente (sin cifras inventadas)', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-riego'));
    // Todos los Kc del seed están en null → cada chip de cultivo lleva su slot
    const slots = screen.getAllByTestId('slot-grounded-pendiente');
    expect(slots.length).toBeGreaterThanOrEqual(6);
    expect(screen.getByText('Maíz')).toBeInTheDocument();
  });
});

describe('AguaScreen — pilar cuidar (caso nacimiento + ENSO)', () => {
  it('muestra el caso insignia y la conexión con el clima ENSO', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-cuidar'));
    expect(screen.getByTestId('pilar-cuidar')).toBeInTheDocument();

    const caso = screen.getByTestId('caso-nacimiento');
    expect(caso).toHaveTextContent('Se me seca el nacimiento en verano');
    // Conexión viva con ensoService (fase default en test: Neutral)
    expect(screen.getByTestId('enso-conexion')).toHaveTextContent(/Neutral|Niño|Niña/);
  });

  it('las dosis de potabilización y la ronda legal quedan como dato en camino', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-cuidar'));
    const slots = screen.getAllByTestId('slot-grounded-pendiente');
    // dosis de cloro + metros de ronda, al menos
    expect(slots.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/hervirla hasta que suelte borbotones/i)).toBeInTheDocument();
  });
});

describe('AguaScreen — puente al agente', () => {
  it('navega al agente con la pregunta prellenada', () => {
    const onNavigate = vi.fn();
    render(<AguaScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('agua-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/agua/i),
    }));
  });
});
