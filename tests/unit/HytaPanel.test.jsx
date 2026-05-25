/**
 * HytaPanel.test.jsx — tests del panel GPU (Task #117, 2026-05-25).
 *
 * Verifica:
 *   - Renderizado básico del componente
 *   - Muestra info GPU cuando está disponible
 *   - Muestra error cuando GPU no está disponible
 *   - Botón "Ver GPU detectada" funciona correctamente
 *   - Mock de getGpuSnapshot para control de escenarios
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HytaPanel from '../../src/components/HytaPanel';

// Mock del servicio gpuTelemetryService
vi.mock('../../src/services/gpuTelemetryService', () => ({
  getGpuSnapshot: vi.fn(),
}));

const { getGpuSnapshot } = await import('../../src/services/gpuTelemetryService');

describe('HytaPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el panel con título y descripción', async () => {
    getGpuSnapshot.mockResolvedValue({
      ts: new Date().toISOString(),
      available: true,
      models: [],
      totalVramMB: 0,
      hasGpu: false,
    });

    render(<HytaPanel />);

    await waitFor(() => {
      expect(screen.getByText('HYTA GPU')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Estado del acelerador GPU y modelos cargados en VRAM/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Ver GPU detectada/i)).toBeInTheDocument();
  });

  it('muestra "GPU info no disponible" cuando hay error', async () => {
    getGpuSnapshot.mockResolvedValue({
      ts: new Date().toISOString(),
      available: false,
      error: 'GPU info no disponible',
      models: [],
      totalVramMB: 0,
    });

    render(<HytaPanel />);

    await waitFor(() => {
      expect(screen.getByText(/GPU info no disponible/i)).toBeInTheDocument();
    });
  });

  it('muestra lista de modelos cuando GPU está disponible', async () => {
    const mockModels = [
      {
        name: 'gemma3:12b',
        sizeMB: 7200,
        vramMB: 7200,
        processor: 'gpu',
        gpuShare: 1.0,
        expiresAt: null,
        details: {
          family: 'gemma3',
          parameterSize: '12B',
          quantization: 'Q4_K_M',
        },
      },
    ];

    getGpuSnapshot.mockResolvedValue({
      ts: '2026-05-25T10:30:00.000Z',
      available: true,
      models: mockModels,
      totalVramMB: 7200,
      hasGpu: true,
    });

    render(<HytaPanel />);

    await waitFor(() => {
      expect(screen.getByText('gemma3:12b')).toBeInTheDocument();
    });

    expect(screen.getByText(/12B/)).toBeInTheDocument();
    expect(screen.getByText(/Q4_K_M/)).toBeInTheDocument();
    expect(screen.getAllByText(/7\.0 GB/).length).toBeGreaterThan(0);
  });

  it('muestra "Ningún modelo cargado" cuando models está vacío', async () => {
    getGpuSnapshot.mockResolvedValue({
      ts: new Date().toISOString(),
      available: true,
      models: [],
      totalVramMB: 0,
      hasGpu: false,
    });

    render(<HytaPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Ningún modelo cargado/i)).toBeInTheDocument();
    });
  });

  it('al hacer click en "Ver GPU detectada", refresca el snapshot', async () => {
    getGpuSnapshot.mockResolvedValue({
      ts: new Date().toISOString(),
      available: true,
      models: [],
      totalVramMB: 0,
      hasGpu: false,
    });

    render(<HytaPanel />);

    // Esperar primer render
    await waitFor(() => {
      expect(getGpuSnapshot).toHaveBeenCalledTimes(1);
    });

    // Limpiar mocks
    getGpuSnapshot.mockClear();

    // Click en botón
    const refreshButton = screen.getByText(/Ver GPU detectada/i);
    fireEvent.click(refreshButton);

    // Verificar que se llamó de nuevo
    await waitFor(() => {
      expect(getGpuSnapshot).toHaveBeenCalledWith({ force: true });
    });
  });

  it('muestra estado de loading mientras carga', async () => {
    // Mock con delay para verificar loading
    getGpuSnapshot.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ts: new Date().toISOString(),
              available: true,
              models: [],
              totalVramMB: 0,
              hasGpu: false,
            });
          }, 100);
        })
    );

    render(<HytaPanel />);

    // Verificar loading inmediato
    expect(screen.getByText(/Detectando GPU…/i)).toBeInTheDocument();

    // Esperar a que termine
    await waitFor(() => {
      expect(screen.queryByText(/Detectando GPU…/i)).not.toBeInTheDocument();
    });
  });

  it('muestra procesador correctamente (GPU, Parcial, CPU)', async () => {
    const mockModels = [
      {
        name: 'model-gpu',
        sizeMB: 4000,
        vramMB: 4000,
        processor: 'gpu',
        gpuShare: 1.0,
        details: {},
      },
      {
        name: 'model-partial',
        sizeMB: 4000,
        vramMB: 2000,
        processor: 'partial',
        gpuShare: 0.5,
        details: {},
      },
      {
        name: 'model-cpu',
        sizeMB: 4000,
        vramMB: 0,
        processor: 'cpu',
        gpuShare: 0,
        details: {},
      },
    ];

    getGpuSnapshot.mockResolvedValue({
      ts: new Date().toISOString(),
      available: true,
      models: mockModels,
      totalVramMB: 6000,
      hasGpu: true,
    });

    render(<HytaPanel />);

    await waitFor(() => {
      expect(screen.getByText('model-gpu')).toBeInTheDocument();
      expect(screen.getByText('model-partial')).toBeInTheDocument();
      expect(screen.getByText('model-cpu')).toBeInTheDocument();
    });

    // Verificar labels de procesador
    const gpuLabels = screen.getAllByText('GPU');
    const partialLabels = screen.getAllByText('Parcial');
    const cpuLabels = screen.getAllByText('CPU');

    expect(gpuLabels.length).toBeGreaterThan(0);
    expect(partialLabels.length).toBeGreaterThan(0);
    expect(cpuLabels.length).toBeGreaterThan(0);
  });

  it('muestra nota sobre privacidad y ADR', async () => {
    getGpuSnapshot.mockResolvedValue({
      ts: new Date().toISOString(),
      available: true,
      models: [],
      totalVramMB: 0,
      hasGpu: false,
    });

    render(<HytaPanel />);

    await waitFor(() => {
      expect(screen.getByText(/ADR-020/)).toBeInTheDocument();
      expect(screen.getByText(/ADR-029/)).toBeInTheDocument();
    });
  });
});
