import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getGpuSnapshot, listAvailableModels, clearGpuCache } from '../gpuTelemetryService.js';

/**
 * Tests del snapshot de GPU/Ollama. Las funciones exportadas hacen fetch:
 * se mockea fetch global para controlar la respuesta de /api/ollama/api/ps.
 * La lógica bajo prueba (normalizeModel, clasificación gpu/partial/cpu,
 * cache 5s, manejo de errores) es determinista.
 */

const GB = 1024 * 1024 * 1024;

import { okResponse, errResponse } from '../../test-utils/index.js';

beforeEach(() => {
  clearGpuCache();
  vi.unstubAllGlobals();
});

describe('getGpuSnapshot — normalización de modelos', () => {
  it('clasifica un modelo 100% en GPU (size_vram == size)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse({
      models: [{ name: 'modelo-a', size: 4 * GB, size_vram: 4 * GB, details: { family: 'fam', parameter_size: '4B', quantization_level: 'Q4' } }],
    })));
    const snap = await getGpuSnapshot();
    expect(snap.available).toBe(true);
    const m = snap.models[0];
    expect(m.processor).toBe('gpu');
    expect(m.gpuShare).toBe(1);
    expect(m.sizeMB).toBe(4096);
    expect(m.vramMB).toBe(4096);
    expect(m.details).toEqual({ family: 'fam', parameterSize: '4B', quantization: 'Q4' });
    expect(snap.hasGpu).toBe(true);
  });

  it('clasifica un modelo parcial (0 < size_vram < size)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse({
      models: [{ name: 'modelo-b', size: 4 * GB, size_vram: 2 * GB }],
    })));
    const snap = await getGpuSnapshot();
    expect(snap.models[0].processor).toBe('partial');
    expect(snap.models[0].gpuShare).toBe(0.5);
    expect(snap.hasGpu).toBe(true);
  });

  it('clasifica un modelo solo-CPU (size_vram == 0)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse({
      models: [{ name: 'modelo-c', size: 4 * GB, size_vram: 0 }],
    })));
    const snap = await getGpuSnapshot();
    expect(snap.models[0].processor).toBe('cpu');
    expect(snap.models[0].gpuShare).toBe(0);
    expect(snap.hasGpu).toBe(false);
  });

  it('suma totalVramMB de todos los modelos', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse({
      models: [
        { name: 'a', size: 2 * GB, size_vram: 2 * GB },
        { name: 'b', size: 1 * GB, size_vram: 1 * GB },
      ],
    })));
    const snap = await getGpuSnapshot();
    expect(snap.totalVramMB).toBe(3072);
  });

  it('usa "unknown" cuando el modelo no trae name ni model', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse({ models: [{ size: 0, size_vram: 0 }] })));
    const snap = await getGpuSnapshot();
    expect(snap.models[0].name).toBe('unknown');
  });

  it('retorna models vacío si la respuesta no trae array', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse({})));
    const snap = await getGpuSnapshot();
    expect(snap.models).toEqual([]);
    expect(snap.totalVramMB).toBe(0);
  });
});

describe('getGpuSnapshot — errores (nunca lanza)', () => {
  it('marca available:false con error HTTP cuando la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => errResponse(500, 'Internal Server Error')));
    const snap = await getGpuSnapshot();
    expect(snap.available).toBe(false);
    expect(snap.error).toContain('500');
    expect(snap.models).toEqual([]);
  });

  it('marca available:false con error de red cuando fetch lanza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connection refused'); }));
    const snap = await getGpuSnapshot();
    expect(snap.available).toBe(false);
    expect(snap.error).toBe('connection refused');
  });

  it('reporta "timeout" cuando el fetch aborta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); }));
    const snap = await getGpuSnapshot();
    expect(snap.error).toBe('timeout');
  });
});

describe('getGpuSnapshot — cache de 5s', () => {
  it('reutiliza el cache en llamadas sucesivas (un solo fetch)', async () => {
    const fetchMock = vi.fn(async () => okResponse({ models: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await getGpuSnapshot();
    await getGpuSnapshot();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('force:true ignora el cache y refetcha', async () => {
    const fetchMock = vi.fn(async () => okResponse({ models: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await getGpuSnapshot();
    await getGpuSnapshot({ force: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clearGpuCache fuerza un nuevo fetch', async () => {
    const fetchMock = vi.fn(async () => okResponse({ models: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await getGpuSnapshot();
    clearGpuCache();
    await getGpuSnapshot();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('listAvailableModels', () => {
  it('mapea los modelos disponibles de /api/tags', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse({
      models: [{ name: 'modelo-x', size: 2 * GB, details: { family: 'fam', parameter_size: '2B', quantization_level: 'Q8' } }],
    })));
    const r = await listAvailableModels();
    expect(r.available).toBe(true);
    expect(r.models[0]).toEqual({ name: 'modelo-x', sizeMB: 2048, family: 'fam', parameterSize: '2B', quantization: 'Q8' });
  });

  it('retorna available:false sin lanzar cuando la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => errResponse(404, 'Not Found')));
    const r = await listAvailableModels();
    expect(r).toEqual({ available: false, models: [] });
  });

  it('retorna available:false cuando fetch lanza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const r = await listAvailableModels();
    expect(r).toEqual({ available: false, models: [] });
  });
});
