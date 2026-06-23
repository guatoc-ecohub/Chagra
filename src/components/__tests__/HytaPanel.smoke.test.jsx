/**
 * HytaPanel.smoke.test.jsx — smoke tests del panel GPU/Ollama.
 *
 * Verifica los tres estados observables del panel:
 *   1. loading — spinner + texto "Detectando…"
 *   2. error   — aviso "GPU info no disponible" cuando available=false
 *   3. datos   — VRAM + modelos cuando available=true
 *
 * El fetch real a Ollama se mockea via gpuTelemetryService.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('../../services/gpuTelemetryService', () => ({
  getGpuSnapshot: vi.fn(),
}));

import { getGpuSnapshot } from '../../services/gpuTelemetryService';
import HytaPanel from '../HytaPanel';

const snapAvailable = {
  ts: '2026-06-23T10:00:00.000Z',
  available: true,
  models: [
    {
      name: 'granite3.3:8b',
      sizeMB: 4800,
      vramMB: 4800,
      processor: 'gpu',
      gpuShare: 1,
      expiresAt: null,
      details: { family: 'granite', parameterSize: '8B', quantization: 'Q4_K_M' },
    },
  ],
  totalVramMB: 4800,
  hasGpu: true,
};

const snapUnavailable = {
  ts: '2026-06-23T10:00:00.000Z',
  available: false,
  error: 'connection refused',
  models: [],
  totalVramMB: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HytaPanel — estados observables', () => {
  it('muestra el estado de carga inicial (spinner)', async () => {
    // getGpuSnapshot nunca resuelve durante este test
    getGpuSnapshot.mockReturnValue(new Promise(() => {}));
    render(<HytaPanel />);
    // Hay dos textos "Detectando": el del panel interno y el del botón.
    const detectandoEls = screen.getAllByText(/detectando/i);
    expect(detectandoEls.length).toBeGreaterThanOrEqual(1);
    // El botón debe estar deshabilitado mientras carga.
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('muestra aviso cuando GPU no está disponible (available=false)', async () => {
    getGpuSnapshot.mockResolvedValue(snapUnavailable);
    render(<HytaPanel />);
    await waitFor(() =>
      expect(screen.getByText(/GPU info no disponible/i)).toBeInTheDocument()
    );
  });

  it('muestra VRAM y nombre del modelo cuando available=true', async () => {
    getGpuSnapshot.mockResolvedValue(snapAvailable);
    render(<HytaPanel />);
    await waitFor(() =>
      expect(screen.getByText(/VRAM total ocupada/i)).toBeInTheDocument()
    );
    expect(screen.getByText('granite3.3:8b')).toBeInTheDocument();
    // 4.7 GB aparece dos veces: total VRAM y VRAM del modelo individual.
    const gbEls = screen.getAllByText(/4\.7 GB/);
    expect(gbEls.length).toBeGreaterThanOrEqual(1);
  });

  it('muestra "—" cuando parameterSize/quantization son null', async () => {
    const snapNoDetails = {
      ...snapAvailable,
      models: [
        {
          name: 'model-sin-detalles',
          sizeMB: 2048,
          vramMB: 2048,
          processor: 'cpu',
          gpuShare: 0,
          expiresAt: null,
          details: { family: null, parameterSize: null, quantization: null },
        },
      ],
      hasGpu: false,
    };
    getGpuSnapshot.mockResolvedValue(snapNoDetails);
    render(<HytaPanel />);
    await waitFor(() =>
      expect(screen.getByText('model-sin-detalles')).toBeInTheDocument()
    );
    // Los detalles sin info muestran "—" honestamente (anti-alucinación UI).
    const detailsEl = screen.getByText(/—\s*·\s*—/);
    expect(detailsEl).toBeInTheDocument();
  });

  it('el botón "Ver GPU detectada" dispara un nuevo snapshot', async () => {
    getGpuSnapshot.mockResolvedValue(snapUnavailable);
    render(<HytaPanel />);
    await waitFor(() =>
      expect(screen.getByText(/GPU info no disponible/i)).toBeInTheDocument()
    );

    getGpuSnapshot.mockResolvedValue(snapAvailable);
    const btn = screen.getByRole('button', { name: /ver gpu detectada/i });
    await act(async () => { btn.click(); });

    await waitFor(() =>
      expect(screen.getByText(/VRAM total ocupada/i)).toBeInTheDocument()
    );
    expect(getGpuSnapshot).toHaveBeenCalledTimes(2);
  });
});
