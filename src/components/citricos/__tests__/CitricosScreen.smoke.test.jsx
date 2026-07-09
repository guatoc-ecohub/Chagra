import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import CitricosScreen from '../CitricosScreen';

/**
 * Smoke test de CitricosScreen — mundo dedicado "Los cítricos" (photo-forward).
 *
 * Verifica:
 *   - Monta sin crashear y arranca en la estación "Variedades e injerto".
 *   - Las 5 estaciones son navegables (tabs), incluida "El piso térmico".
 *   - El piso térmico es HONESTO: existe la banda de clima frío marcada "NO va"
 *     (el fallo del agente que este mundo refuerza) y la de tierra caliente "Ideal".
 *   - El HLB se muestra como cuarentena de reporte al ICA.
 *   - El puente al agente siembra un prompt con la altura/clima del usuario.
 */
describe('CitricosScreen smoke', () => {
  test('monta en la estación de variedades y muestra las cítricas del grafo', () => {
    render(<CitricosScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('citricos-screen')).toBeInTheDocument();
    expect(screen.getByTestId('estacion-variedades')).toBeInTheDocument();
    expect(screen.getByTestId('variedad-naranja')).toBeInTheDocument();
    expect(screen.getByTestId('variedad-mandarina')).toBeInTheDocument();
    expect(screen.getByTestId('variedad-lima')).toBeInTheDocument();
  });

  test('el piso térmico es honesto: tierra caliente Ideal y frío alto NO', () => {
    render(<CitricosScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('estacion-tab-piso'));
    const term = screen.getByTestId('citricos-termometro');
    // Banda de clima frío alto, declarada NO apta.
    const frio = within(term).getByTestId('piso-banda-frio');
    expect(frio).toHaveTextContent(/2100/);
    expect(frio).toHaveTextContent(/NO/);
    // Banda de tierra caliente, la ideal.
    expect(within(term).getByTestId('piso-banda-calido')).toBeInTheDocument();
  });

  test('las 5 estaciones son navegables e incluyen HLB y cosecha', () => {
    render(<CitricosScreen onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('estacion-tab-plagas'));
    expect(screen.getByTestId('estacion-plagas')).toBeInTheDocument();
    expect(screen.getByTestId('citricos-hlb')).toHaveTextContent(/ICA/);
    // La gomosis se declara faltante (honestidad), no se le inventa manejo.
    expect(screen.getByTestId('citricos-gomosis-pendiente')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('estacion-tab-cosecha'));
    expect(screen.getByTestId('citricos-cosecha')).toBeInTheDocument();
  });

  test('el puente al agente siembra un prompt sobre la altura/clima', () => {
    const onNavigate = vi.fn();
    render(<CitricosScreen onBack={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('citricos-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith(
      'agente',
      expect.objectContaining({ prefilledPrompt: expect.stringMatching(/altura|clima/i) }),
    );
  });

  test('el back del shell invoca onBack', () => {
    const onBack = vi.fn();
    render(<CitricosScreen onBack={onBack} onNavigate={vi.fn()} />);
    // El ScreenShell expone un botón de volver (aria-label exacto "Volver";
    // el de inicio es "Volver al inicio", que no debe confundirse).
    const volver = screen.getByRole('button', { name: 'Volver' });
    fireEvent.click(volver);
    expect(onBack).toHaveBeenCalled();
  });
});
