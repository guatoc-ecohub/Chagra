import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../services/ollamaStream', () => ({ streamOllama: vi.fn() }));
vi.mock('../../services/gpuTelemetryService', () => ({ getGpuSnapshot: vi.fn() }));
vi.mock('../../config/env', () => ({
  ENV: { VISION_MODEL: 'qwen3.5:4b', VISION_REVIEW_MODEL: 'qwen3-vl:4b' },
}));

import { useCompaiSegundaOpinionFoto, __TEST__ } from '../useCompaiSegundaOpinionFoto';
import { streamOllama } from '../../services/ollamaStream';
import { getGpuSnapshot } from '../../services/gpuTelemetryService';
import { habilitarSegundaOpinion } from '../../services/segundaOpinionFoto';

const { textoDePrimeraLectura, extraerHallazgo } = __TEST__;

/** Blob con un FileReader real funciona en jsdom — no hace falta mockear File API. */
const fakeBlob = () => new Blob(['x'], { type: 'image/jpeg' });

describe('useCompaiSegundaOpinionFoto — helpers puros', () => {
  it('sin diagnóstico previo → SANA por defecto (nada que objetar)', () => {
    expect(textoDePrimeraLectura(null)).toBe('');
  });

  it('finding sin issues → texto SANA con el score', () => {
    expect(textoDePrimeraLectura({ score: 90, issues: [] })).toMatch(/^SANA\..*90/);
  });

  it('finding con issues → texto ENFERMA con los hallazgos', () => {
    const t = textoDePrimeraLectura({ score: 40, issues: ['mancha foliar', 'clorosis'] });
    expect(t).toMatch(/^ENFERMA\./);
    expect(t).toContain('mancha foliar');
    expect(t).toContain('clorosis');
  });

  it('extrae hallazgo + qué mirar de la segunda línea del modelo', () => {
    const { hallazgo, queMirar } = extraerHallazgo('ENFERMA\nEl fruto está perforado, para confirmar ábralo con cuidado');
    expect(hallazgo).toMatch(/perforado/);
    expect(queMirar).toMatch(/ábralo/);
  });

  it('sin separador claro, todo el texto es el hallazgo (no inventa qué mirar)', () => {
    const { hallazgo, queMirar } = extraerHallazgo('ENFERMA\nSe ve mal la hoja');
    expect(hallazgo).toBe('Se ve mal la hoja');
    expect(queMirar).toBeNull();
  });

  it('respuesta vacía no revienta', () => {
    expect(extraerHallazgo('')).toEqual({ hallazgo: '', queMirar: null });
  });
});

describe('useCompaiSegundaOpinionFoto — pedirRevision (cableado real)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    habilitarSegundaOpinion(true);
    vi.mocked(getGpuSnapshot).mockResolvedValue({
      available: true,
      models: [{ name: 'qwen3.5:4b' }, { name: 'qwen3-vl:4b' }],
    });
  });

  it('sin finding (nunca se corrió analyzeFoliage) no llama a Ollama', async () => {
    const { result } = renderHook(() => useCompaiSegundaOpinionFoto());
    const avisar = vi.fn();
    await act(async () => {
      await result.current.pedirRevision({ imageBlob: fakeBlob(), finding: null, avisar });
    });
    expect(streamOllama).not.toHaveBeenCalled();
    expect(avisar).not.toHaveBeenCalled();
  });

  it('sin blob no llama a Ollama', async () => {
    const { result } = renderHook(() => useCompaiSegundaOpinionFoto());
    const avisar = vi.fn();
    await act(async () => {
      await result.current.pedirRevision({ imageBlob: null, finding: { score: 90, issues: [] }, avisar });
    });
    expect(streamOllama).not.toHaveBeenCalled();
  });

  it('si la segunda mirada coincide (misma foto, mismo veredicto), NO avisa', async () => {
    vi.mocked(streamOllama).mockResolvedValue('SANA\nSe ve una hoja saludable');
    const { result } = renderHook(() => useCompaiSegundaOpinionFoto());
    const avisar = vi.fn();
    await act(async () => {
      await result.current.pedirRevision({
        imageBlob: fakeBlob(),
        finding: { score: 95, issues: [] },
        avisar,
      });
    });
    expect(streamOllama).toHaveBeenCalledTimes(1);
    // Llama al modelo de revisión configurado, no al de la primera lectura.
    expect(vi.mocked(streamOllama).mock.calls[0][1].model).toBe('qwen3-vl:4b');
    expect(avisar).not.toHaveBeenCalled();
  });

  it('si discrepa, avisa por el canal pedido con el texto redactado', async () => {
    vi.mocked(streamOllama).mockResolvedValue('ENFERMA\nEl fruto está perforado, para confirmar ábralo');
    const { result } = renderHook(() => useCompaiSegundaOpinionFoto());
    const avisar = vi.fn();
    await act(async () => {
      await result.current.pedirRevision({
        imageBlob: fakeBlob(),
        finding: { score: 95, issues: [] }, // primera lectura dijo SANA
        canal: 'voz',
        avisar,
      });
    });
    expect(avisar).toHaveBeenCalledTimes(1);
    const [texto, meta] = avisar.mock.calls[0];
    expect(texto).toMatch(/Me quedé mirando otra vez su foto/);
    expect(meta).toEqual({ canal: 'voz' });
  });

  it('si la GPU está apretada (chat no residente), no dispara Ollama', async () => {
    vi.mocked(getGpuSnapshot).mockResolvedValue({ available: true, models: [{ name: 'qwen3-vl:4b' }] });
    const { result } = renderHook(() => useCompaiSegundaOpinionFoto());
    const avisar = vi.fn();
    await act(async () => {
      await result.current.pedirRevision({
        imageBlob: fakeBlob(),
        finding: { score: 95, issues: [] },
        avisar,
      });
    });
    expect(streamOllama).not.toHaveBeenCalled();
    expect(avisar).not.toHaveBeenCalled();
  });
});
