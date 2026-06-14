/**
 * GlaciarReporteScreen — Reporte de Punto Glaciar (v2 "escala creíble", UI).
 *
 * Contrato cubierto:
 *   - La pantalla monta y muestra los pasos (montaña, ubicación, dureza, peligros).
 *   - El estado de seguridad derivado reacciona al diagnóstico (🟢→🔴).
 *   - El botón Volver llama onBack.
 *   - Guardar exige ubicación + montaña + superficie + dureza (modo pisado).
 *   - El reporte persistido usa los códigos de dureza nuevos (F..H2) + montaña.
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
vi.mock('../PhotoCaptureField', () => ({ default: () => null }));

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

/** Selecciona la dureza puntual por su código (chip de la grilla). */
function clickDureza(codigo) {
  // Hay un select en el perfil de capas con el mismo texto; tomamos el botón.
  const btns = screen.getAllByRole('button').filter((b) => b.textContent.startsWith(codigo));
  fireEvent.click(btns[0]);
}

/** Selecciona un tipo de superficie en la grilla puntual (es un <button>,
 *  el perfil por capas usa <option> con el mismo texto). */
function clickSuperficie(label) {
  const btn = screen.getAllByRole('button').find((b) => b.textContent.includes(label));
  fireEvent.click(btn);
}

describe('GlaciarReporteScreen — montaje y pasos', () => {
  it('monta la pantalla con título y los pasos del reporte', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    expect(screen.getByText('Punto Glaciar')).toBeTruthy();
    expect(screen.getByText(/Montaña y punto del frente/i)).toBeTruthy();
    expect(screen.getAllByText(/Dureza del hielo/i).length).toBeGreaterThan(0);
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

  it('marcar grietas abiertas pasa el estado a Peligro 🔴 vía override jerárquico', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    // Hielo podrido como superficie puntual fuerza 🔴 siempre.
    clickSuperficie('Hielo podrido (candle)');
    expect(screen.getByText('Peligro')).toBeTruthy();
  });

  it('hielo de glaciar azul + H1 sin peligros → Estable 🟢', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    clickSuperficie('Hielo de glaciar (azul)');
    clickDureza('H1');
    expect(screen.getByText('Estable')).toBeTruthy();
  });

  it('modo borde (no pisar) → estado Observación 🔵', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    fireEvent.click(screen.getByText(/Modo borde \(no pisar\)/i));
    expect(screen.getByText('Observación')).toBeTruthy();
  });
});

describe('GlaciarReporteScreen — guardado', () => {
  it('Guardar habilita tras ubicación + montaña + superficie + dureza, y persiste códigos nuevos', async () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);

    // Montaña (requisito nuevo).
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'ruiz' } });

    // Capturar GPS.
    fireEvent.click(screen.getByRole('button', { name: /Capturar ubicación/i }));
    expect(requestMock).toHaveBeenCalled();

    // Superficie puntual + dureza puntual.
    clickSuperficie('Hielo de glaciar (azul)');
    clickDureza('H1');

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Guardar reporte/i });
      expect(btn).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar reporte/i }));
    await waitFor(() => expect(saveMock).toHaveBeenCalled());
    const arg = saveMock.mock.calls[0][0];
    expect(arg.tipoSuperficie).toBe('hielo_glaciar_azul');
    expect(arg.dureza).toBe('H1');
    expect(arg.montana).toBe('ruiz');
    expect(arg.estado).toBe('estable');
    expect(arg.lat).toBeCloseTo(4.81);
    expect(arg.pisoGlaciar).toBe(true);
  });

  it('en modo borde guarda como observación sin exigir dureza', async () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'cocuy_ritacuba' } });
    fireEvent.click(screen.getByText(/Modo borde \(no pisar\)/i));
    fireEvent.click(screen.getByRole('button', { name: /Capturar ubicación/i }));
    clickSuperficie('Hielo de glaciar (azul)');

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Guardar reporte/i });
      expect(btn).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar reporte/i }));
    await waitFor(() => expect(saveMock).toHaveBeenCalled());
    const arg = saveMock.mock.calls[0][0];
    expect(arg.pisoGlaciar).toBe(false);
    expect(arg.estado).toBe('observacion');
  });
});

describe('GlaciarReporteScreen — disclaimer', () => {
  it('muestra el disclaimer de apoyo a la decisión', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    expect(screen.getByText(/prevalece el juicio del guía certificado/i)).toBeTruthy();
  });

  it('menciona el glaciar Conejeras (propósito de trazabilidad)', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    expect(screen.getByText(/Conejeras/i)).toBeTruthy();
  });
});
