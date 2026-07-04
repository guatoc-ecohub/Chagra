import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import EstiercolScreen from '../EstiercolScreen';

// ScreenShell trae NotificationsBell (fetch clima, IDB, useTheme…) —
// passthrough simple para probar el CONTENIDO del módulo.
vi.mock('../common/ScreenShell', () => ({
  ScreenShell: ({ title, children }) => (
    <div><h1>{title}</h1>{children}</div>
  ),
}));

describe('EstiercolScreen — "Del corral al abono"', () => {
  it('abre en el inicio con el título y los tres accesos', () => {
    render(<EstiercolScreen onBack={() => {}} onHome={() => {}} />);
    expect(screen.getByRole('heading', { name: /Del corral al abono/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Quitar el olor/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sacar biogás/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Hacer abono/i })).toBeTruthy();
  });

  it('Olores muestra el caso real de la gallinaza', () => {
    render(<EstiercolScreen onBack={() => {}} onHome={() => {}} />);
    fireEvent.click(within(screen.getByTestId('estiercol-pilares')).getByText('Olores'));
    expect(screen.getByText(/huele muy feo y los vecinos se quejan/i)).toBeTruthy();
    expect(screen.getByText(/Por qué huele/i)).toBeTruthy();
    expect(screen.getByText(/Cómo quitarle el olor/i)).toBeTruthy();
  });

  it('la calculadora del biodigestor arranca en el caso insignia (300 cerdos)', () => {
    render(<EstiercolScreen onBack={() => {}} onHome={() => {}} />);
    fireEvent.click(within(screen.getByTestId('estiercol-pilares')).getByText('Biodigestor'));
    const input = /** @type {HTMLInputElement} */ (screen.getByLabelText(/Cuántos cerdos/i));
    expect(input.value).toBe('300');
    // Resultados coherentes con la fórmula (72 m³/día de biogás para 300 cerdos).
    const res = screen.getByTestId('biodigestor-resultados');
    expect(within(res).getByText('72')).toBeTruthy();
  });

  it('la calculadora recalcula al cambiar el número de animales', () => {
    render(<EstiercolScreen onBack={() => {}} onHome={() => {}} />);
    fireEvent.click(within(screen.getByTestId('estiercol-pilares')).getByText('Biodigestor'));
    const input = screen.getByLabelText(/Cuántos cerdos/i);
    fireEvent.change(input, { target: { value: '100' } });
    // 100 cerdos → 24 m³/día de biogás.
    const res = screen.getByTestId('biodigestor-resultados');
    expect(within(res).getByText('24')).toBeTruthy();
  });

  it('Abonos lista los siete abonos y marca el slot grounded-pendiente al abrir', () => {
    render(<EstiercolScreen onBack={() => {}} onHome={() => {}} />);
    fireEvent.click(within(screen.getByTestId('estiercol-pilares')).getByText('Abonos'));
    for (const nombre of ['Gallinaza', 'Porquinaza', 'Bovinaza (boñiga)', 'Biol', 'Biosol', 'Compost', 'Lombricompost']) {
      expect(screen.getByText(nombre)).toBeTruthy();
    }
    // Sin abrir ninguna tarjeta, no hay slots visibles.
    expect(screen.queryAllByTestId('grounded-slot').length).toBe(0);
    fireEvent.click(screen.getByText('Gallinaza'));
    expect(screen.getAllByTestId('grounded-slot').length).toBeGreaterThan(0);
  });
});
