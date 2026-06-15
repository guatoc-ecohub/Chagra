import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/dbCore', () => ({ openDB: () => Promise.resolve({}) }));

import {
  checkCapabilityHealth,
  hasCriticalFailure,
  getDegradedCapabilities,
  getCapabilityHealth,
  SIDECAR_TOOL_NAMES,
  checkSidecarHealth,
  checkOllamaHealth,
  checkAllServicesHealth,
  clearHealthCache,
  __TEST__,
} from '../capabilityHealth';
import { CAPABILITY_MANIFEST } from '../agentCapabilities';

const makeDeps = (overrides = {}) => ({
  manifest: overrides.manifest ?? CAPABILITY_MANIFEST,
  isSidecarEnabled: overrides.isSidecarEnabled ?? true,
  sidecarHealthy: overrides.sidecarHealthy,
  sidecarToolNames: overrides.sidecarToolNames ?? SIDECAR_TOOL_NAMES,
});

describe('checkCapabilityHealth', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true }));
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('retorna array de capacidades', async () => {
    const results = await checkCapabilityHealth();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.name).toBeDefined();
      expect(['ok', 'degraded', 'down']).toContain(r.status);
    });
  });
});

describe('hasCriticalFailure', () => {
  it('detecta fallo crítico', () => {
    expect(hasCriticalFailure([{ status: 'ok' }, { status: 'down' }])).toBe(true);
    expect(hasCriticalFailure([{ status: 'ok' }])).toBe(false);
  });
});

describe('getDegradedCapabilities', () => {
  it('filtra solo no-ok', () => {
    const r = getDegradedCapabilities([{ status: 'ok' }, { status: 'down' }, { status: 'degraded' }]);
    expect(r).toHaveLength(2);
  });
});

describe('getCapabilityHealth — estado real por capacidad', () => {
  it('SIDECAR_TOOL_NAMES contiene las tools que dependen del sidecar', () => {
    expect(SIDECAR_TOOL_NAMES.has('get_multihop_companions')).toBe(true);
    expect(SIDECAR_TOOL_NAMES.has('get_subgrafo_relacional')).toBe(true);
    expect(SIDECAR_TOOL_NAMES.has('get_saberes')).toBe(true);
    expect(SIDECAR_TOOL_NAMES.has('get_toxicidad')).toBe(true);
    expect(SIDECAR_TOOL_NAMES.has('get_suelo')).toBe(true);
    // Locales/offline NO están
    expect(SIDECAR_TOOL_NAMES.has('assets')).toBe(false);
    expect(SIDECAR_TOOL_NAMES.has('voice_capture')).toBe(false);
    expect(SIDECAR_TOOL_NAMES.has('farm_process')).toBe(false);
  });

  it('capacidades offline-first retornan live siempre', () => {
    const deps = makeDeps({ isSidecarEnabled: false });
    expect(getCapabilityHealth('plantas', deps)).toBe('live');
    expect(getCapabilityHealth('tareas', deps)).toBe('live');
    expect(getCapabilityHealth('observaciones', deps)).toBe('live');
    expect(getCapabilityHealth('mapa', deps)).toBe('live');
    expect(getCapabilityHealth('historial', deps)).toBe('live');
    expect(getCapabilityHealth('biodiversidad', deps)).toBe('live');
    expect(getCapabilityHealth('ciclo', deps)).toBe('live');
    expect(getCapabilityHealth('procesos', deps)).toBe('live');
    expect(getCapabilityHealth('voz', deps)).toBe('live');
  });

  it('foto retorna soon (manifest: identificacion por foto necesita GPU >=8GB)', () => {
    // foto es status:'soon' en el manifiesto (hardware insuficiente en Maxwell);
    // el manifest manda, sin importar el estado del sidecar.
    const deps = makeDeps({ isSidecarEnabled: false });
    expect(getCapabilityHealth('foto', deps)).toBe('soon');
    expect(getCapabilityHealth('foto', makeDeps({ isSidecarEnabled: true }))).toBe('soon');
  });

  it('capacidades sidecar-dependent retornan live con sidecar habilitado', () => {
    const deps = makeDeps({ isSidecarEnabled: true });
    expect(getCapabilityHealth('siembro', deps)).toBe('live');
    expect(getCapabilityHealth('plaga', deps)).toBe('live');
    expect(getCapabilityHealth('biopreparado', deps)).toBe('live');
    expect(getCapabilityHealth('clima', deps)).toBe('live');
    expect(getCapabilityHealth('calendario', deps)).toBe('live');
  });

  it('capacidades sidecar-dependent retornan down con sidecar deshabilitado', () => {
    const deps = makeDeps({ isSidecarEnabled: false });
    expect(getCapabilityHealth('siembro', deps)).toBe('down');
    expect(getCapabilityHealth('plaga', deps)).toBe('down');
    expect(getCapabilityHealth('biopreparado', deps)).toBe('down');
    expect(getCapabilityHealth('clima', deps)).toBe('down');
    expect(getCapabilityHealth('calendario', deps)).toBe('down');
  });

  it('precio retorna soon (explicito en manifest)', () => {
    const deps = makeDeps({ isSidecarEnabled: true });
    expect(getCapabilityHealth('precio', deps)).toBe('soon');
    // sidecar no afecta: aunque este habilitado, el manifest dice soon
    const depsOff = makeDeps({ isSidecarEnabled: false });
    expect(getCapabilityHealth('precio', depsOff)).toBe('soon');
  });

  it('deep retorna soon (explicito en manifest, B14: backend no disponible aun)', () => {
    // Investigacion profunda es kind:'stub' status:'soon' en el manifiesto: no
    // depende del sidecar — el manifest manda. Aunque el sidecar este on/off,
    // el estado es 'soon' (la feature no esta servible en prod).
    expect(getCapabilityHealth('deep', makeDeps({ isSidecarEnabled: false }))).toBe('soon');
    expect(getCapabilityHealth('deep', makeDeps({ isSidecarEnabled: true }))).toBe('soon');
  });

  it('alertas-cultivo retorna live (sin dependencia de sidecar)', () => {
    expect(getCapabilityHealth('alertas-cultivo', makeDeps({ isSidecarEnabled: false }))).toBe('live');
  });

  it('capacidad desconocida retorna live (degradacion segura)', () => {
    expect(getCapabilityHealth('capacidad-que-no-existe', makeDeps({}))).toBe('live');
  });

  it('sin manifest (null/undefined) retorna live', () => {
    expect(getCapabilityHealth('siembro', makeDeps({ manifest: [] }))).toBe('live');
    expect(getCapabilityHealth('plaga', makeDeps({ manifest: null }))).toBe('live');
  });

  it('sidecarToolNames vacio trata todas como offline (live)', () => {
    const deps = makeDeps({ isSidecarEnabled: false, sidecarToolNames: new Set() });
    expect(getCapabilityHealth('siembro', deps)).toBe('live');
  });

  it('acepta sidecarToolNames como Set o array-like', () => {
    const setDeps = makeDeps({ isSidecarEnabled: false, sidecarToolNames: new Set(['get_species']) });
    expect(getCapabilityHealth('siembro', setDeps)).toBe('down');

    const arrDeps = makeDeps({ isSidecarEnabled: false, sidecarToolNames: ['get_species'] });
    expect(getCapabilityHealth('siembro', arrDeps)).toBe('down');
  });

  // Task 6331: tests para health dinámico
  describe('Task 6331: health dinámico del sidecar', () => {
    beforeEach(() => {
      clearHealthCache();
    });

    it('usa sidecarHealthy si está disponible (dinámico), sino degrada a flag estática', () => {
      // sidecarHealthy = true → live
      const depsTrue = makeDeps({
        isSidecarEnabled: false,
        sidecarHealthy: true,
      });
      expect(getCapabilityHealth('siembro', depsTrue)).toBe('live');

      // sidecarHealthy = false → down
      const depsFalse = makeDeps({
        isSidecarEnabled: true, // flag dice sí, pero health real dice no
        sidecarHealthy: false,
      });
      expect(getCapabilityHealth('siembro', depsFalse)).toBe('down');

      // sidecarHealthy = null → usa flag estática (comportamiento anterior)
      const depsNull = makeDeps({
        isSidecarEnabled: false,
        sidecarHealthy: null,
      });
      expect(getCapabilityHealth('siembro', depsNull)).toBe('down');
    });

    it('sidecarHealthy no afecta capacidades offline-first', () => {
      const deps = makeDeps({
        isSidecarEnabled: false,
        sidecarHealthy: false,
      });
      expect(getCapabilityHealth('plantas', deps)).toBe('live');
      expect(getCapabilityHealth('tareas', deps)).toBe('live');
    });

    it('status soon del manifest siempre manda, sin importar sidecarHealthy', () => {
      const deps = makeDeps({
        isSidecarEnabled: true,
        sidecarHealthy: true,
      });
      expect(getCapabilityHealth('foto', deps)).toBe('soon');
      expect(getCapabilityHealth('precio', deps)).toBe('soon');
      expect(getCapabilityHealth('deep', deps)).toBe('soon');
    });
  });
});

describe('Task 6331: health checks dinámicos', () => {
  beforeEach(() => {
    clearHealthCache();
    vi.clearAllMocks();
  });

  describe('checkSidecarHealth', () => {
    it('retorna false si sidecar no está habilitado por flag', async () => {
      const deps = {
        isSidecarEnabled: () => false,
        fetch: vi.fn(),
      };
      const result = await checkSidecarHealth(deps);
      expect(result).toBe(false);
      expect(deps.fetch).not.toHaveBeenCalled();
    });

    it('retorna true si sidecar responde OK', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
        })
      );
      const deps = {
        isSidecarEnabled: () => true,
        sidecarUrl: '/api/mcp/agro',
        fetch: mockFetch,
      };
      const result = await checkSidecarHealth(deps);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/mcp/agro/nlu',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('user_message'),
        })
      );
    });

    it('retorna false si sidecar responde error', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 503,
        })
      );
      const deps = {
        isSidecarEnabled: () => true,
        fetch: mockFetch,
      };
      const result = await checkSidecarHealth(deps);
      expect(result).toBe(false);
    });

    it('retorna false si sidecar timeout', async () => {
      const mockFetch = vi.fn(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      );
      const deps = {
        isSidecarEnabled: () => true,
        fetch: mockFetch,
      };
      const result = await checkSidecarHealth(deps);
      expect(result).toBe(false);
    });

    it('cachea resultado con TTL', async () => {
      let callCount = 0;
      const mockFetch = vi.fn(() => {
        callCount++;
        return Promise.resolve({ ok: true, status: 200 });
      });
      const deps = {
        isSidecarEnabled: () => true,
        fetch: mockFetch,
        cache: { result: null, timestamp: 0, ttl: 30000 },
      };

      // Primera llamada → fetch
      await checkSidecarHealth(deps);
      expect(callCount).toBe(1);

      // Segunda llamada inmediata → cache (no fetch)
      await checkSidecarHealth(deps);
      expect(callCount).toBe(1);
    });
  });

  describe('checkOllamaHealth', () => {
    it('retorna true si ollama responde OK', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
        })
      );
      const deps = { fetch: mockFetch };
      const result = await checkOllamaHealth(deps);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/ollama/api/tags', expect.any(Object));
    });

    it('retorna false si ollama responde error', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 503,
        })
      );
      const deps = { fetch: mockFetch };
      const result = await checkOllamaHealth(deps);
      expect(result).toBe(false);
    });

    it('retorna false si ollama timeout', async () => {
      const mockFetch = vi.fn(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      );
      const deps = { fetch: mockFetch };
      const result = await checkOllamaHealth(deps);
      expect(result).toBe(false);
    });

    it('cachea resultado con TTL', async () => {
      let callCount = 0;
      const mockFetch = vi.fn(() => {
        callCount++;
        return Promise.resolve({ ok: true, status: 200 });
      });
      const deps = {
        fetch: mockFetch,
        cache: { result: null, timestamp: 0, ttl: 60000 },
      };

      // Primera llamada → fetch
      await checkOllamaHealth(deps);
      expect(callCount).toBe(1);

      // Segunda llamada inmediata → cache (no fetch)
      await checkOllamaHealth(deps);
      expect(callCount).toBe(1);
    });
  });

  describe('checkAllServicesHealth', () => {
    it('verifica ambos servicios en paralelo', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
        })
      );
      const deps = {
        isSidecarEnabled: () => true,
        fetch: mockFetch,
      };

      const result = await checkAllServicesHealth(deps);

      expect(result).toHaveProperty('sidecar');
      expect(result).toHaveProperty('ollama');
      expect(typeof result.sidecar).toBe('boolean');
      expect(typeof result.ollama).toBe('boolean');
    });

    it('degrada a false si alguno falla', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 503,
        })
      );
      const deps = {
        isSidecarEnabled: () => true,
        fetch: mockFetch,
      };

      const result = await checkAllServicesHealth(deps);

      expect(result.sidecar).toBe(false);
      expect(result.ollama).toBe(false);
    });
  });

  describe('clearHealthCache', () => {
    beforeEach(() => {
      // Poblar el cache antes de cada test
      __TEST__.healthCache.sidecar.result = true;
      __TEST__.healthCache.sidecar.timestamp = Date.now();
      __TEST__.healthCache.ollama.result = true;
      __TEST__.healthCache.ollama.timestamp = Date.now();
    });

    it('limpia cache de sidecar', () => {
      clearHealthCache('sidecar');
      expect(__TEST__.healthCache.sidecar.result).toBeNull();
      expect(__TEST__.healthCache.sidecar.timestamp).toBe(0);
      // ollama debe quedar intacto
      expect(__TEST__.healthCache.ollama.result).toBe(true);
    });

    it('limpia cache de ollama', () => {
      clearHealthCache('ollama');
      expect(__TEST__.healthCache.ollama.result).toBeNull();
      expect(__TEST__.healthCache.ollama.timestamp).toBe(0);
      // sidecar debe quedar intacto
      expect(__TEST__.healthCache.sidecar.result).toBe(true);
    });

    it('limpia ambos caches si no se especifica servicio', () => {
      clearHealthCache();
      // verificar que ambos caches están limpios
      expect(__TEST__.healthCache.sidecar.result).toBeNull();
      expect(__TEST__.healthCache.ollama.result).toBeNull();
    });
  });
});
