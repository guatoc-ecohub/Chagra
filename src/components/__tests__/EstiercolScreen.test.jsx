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
    // Groundeado (CIPAV/LRRD): 300 cerdos → 17 m³/día de biogás en clima
    // cálido/templado (default). 810 kg estiércol × 0.021 m³/kg.
    const res = screen.getByTestId('biodigestor-resultados');
    expect(within(res).getByText('17')).toBeTruthy();
  });

  it('la calculadora recalcula al cambiar el número de animales', () => {
    render(<EstiercolScreen onBack={() => {}} onHome={() => {}} />);
    fireEvent.click(within(screen.getByTestId('estiercol-pilares')).getByText('Biodigestor'));
    const input = screen.getByLabelText(/Cuántos cerdos/i);
    fireEvent.change(input, { target: { value: '100' } });
    // 100 cerdos → 270 kg × 0.021 = 5,7 m³/día de biogás (locale es-CO).
    const res = screen.getByTestId('biodigestor-resultados');
    expect(within(res).getByText('5,7')).toBeTruthy();
  });

  it('el TRH depende del piso térmico: el páramo agranda el digestor', () => {
    render(<EstiercolScreen onBack={() => {}} onHome={() => {}} />);
    fireEvent.click(within(screen.getByTestId('estiercol-pilares')).getByText('Biodigestor'));
    const res = screen.getByTestId('biodigestor-resultados');
    // Volumen en clima cálido (default) para 300 cerdos ≈ 55,9 m³.
    expect(within(res).getByText('55,9')).toBeTruthy();
    // Al cambiar a páramo (TRH 104 días) el digestor crece muy por encima.
    fireEvent.click(screen.getByTestId('biodigestor-piso-paramo'));
    expect(within(res).queryByText('55,9')).toBeNull();
    // 1.62 m³/día × 104 × 1.15 ≈ 193,8 m³.
    expect(within(res).getByText('193,8')).toBeTruthy();
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
