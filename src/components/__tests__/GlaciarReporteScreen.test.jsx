/**
 * GlaciarReporteScreen — Reporte de Punto Glaciar (módulo demo, UI).
 *
 * Contrato cubierto:
 *   - La pantalla monta y muestra los pasos (ubicación, foto, dureza, peligros).
 *   - El estado de seguridad derivado reacciona al diagnóstico (🟢→🔴).
 *   - El botón Volver llama onBack.
 *   - Guardar está deshabilitado hasta tener ubicación + superficie + dureza.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

// Mock del hook de geolocalización: empieza sin posición, request() inyecta una.
let mockPosition = null;
const requestMock = vi.fn(() => {
  mockPosition = { lat: 4.81, lon: -75.33, altitude: 4850, accuracy: 8, timestamp: Date.now() };
});
vi.mock('../../hooks/useGeolocation', () => ({
  useGeolocation: () => ({ position: mockPosition, error: null, loading: false, request: requestMock }),
}));

// Mock de PhotoCaptureField (no probamos la cámara acá).
vi.mock('../PhotoCaptureField', () => ({
  default: () => null,
}));

// Mock del store IDB (no tocamos IndexedDB en el test de UI).
const saveMock = vi.fn(() => Promise.resolve({ id: 'glaciar-test' }));
vi.mock('../../db/glaciarReportes', () => ({
  glaciarReportes: {
    save: (...a) => saveMock(...a),
    getAll: vi.fn(() => Promise.resolve([])),
    remove: vi.fn(() => Promise.resolve()),
  },
  nuevoReporteId: () => 'glaciar-test',
}));

vi.mock('../../utils/imageProcessor', () => ({
  blobToDataUrl: vi.fn(() => Promise.resolve('data:image/jpeg;base64,AAA')),
}));

import GlaciarReporteScreen from '../GlaciarReporteScreen';

beforeEach(() => {
  mockPosition = null;
  vi.clearAllMocks();
});
afterEach(() => cleanup());

describe('GlaciarReporteScreen — montaje y pasos', () => {
  it('monta la pantalla con título y los pasos del reporte', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    expect(screen.getByText('Punto Glaciar')).toBeTruthy();
    expect(screen.getByText(/Ubicación del punto/i)).toBeTruthy();
    expect(screen.getByText(/Dureza del hielo/i)).toBeTruthy();
    expect(screen.getByText(/Peligros observados/i)).toBeTruthy();
  });

  it('botón Volver llama onBack', () => {
    const onBack = vi.fn();
    render(<GlaciarReporteScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('estado de seguridad inicial es Precaución (faltan datos)', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    expect(screen.getByText('Precaución')).toBeTruthy();
  });

  it('marcar grietas abiertas pasa el estado a Peligro 🔴', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    fireEvent.click(screen.getByText(/Grietas abiertas/i));
    expect(screen.getByText('Peligro')).toBeTruthy();
  });

  it('hielo compacto + dureza alta sin peligros → Estable 🟢', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    fireEvent.click(screen.getByText('Hielo de glaciar (azul/compacto)'));
    fireEvent.click(screen.getByText(/^Duro$/i)); // dureza 4
    expect(screen.getByText('Estable')).toBeTruthy();
  });
});

describe('GlaciarReporteScreen — guardado', () => {
  it('Guardar habilita tras capturar ubicación + superficie + dureza, y persiste', async () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);

    // Capturar GPS.
    fireEvent.click(screen.getByRole('button', { name: /Capturar ubicación/i }));
    expect(requestMock).toHaveBeenCalled();
    // Re-render con la posición inyectada: forzamos un cambio de estado tocando
    // un campo, que re-evalúa el efecto de la posición.
    fireEvent.click(screen.getByText('Hielo de glaciar (azul/compacto)'));
    fireEvent.click(screen.getByText(/^Medio$/i)); // dureza 3

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Guardar reporte/i });
      expect(btn).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar reporte/i }));
    await waitFor(() => expect(saveMock).toHaveBeenCalled());
    const arg = saveMock.mock.calls[0][0];
    expect(arg.tipoSuperficie).toBe('hielo_glaciar');
    expect(arg.dureza).toBe(3);
    expect(arg.estado).toBe('estable');
    expect(arg.lat).toBeCloseTo(4.81);
  });
});
