/**
 * offlineContracts.test.js — contrato OFFLINE de los servicios de Chagra.
 *
 * Garantía offline-first a nivel de servicio: con navigator.onLine=false, los
 * servicios que dependen de red deben DEGRADAR a null / mensaje claro SIN
 * lanzar excepciones no controladas y SIN colgarse esperando la red. Esto evita
 * el síntoma "el agente/clima se queda pensando" y el "spinner infinito" que el
 * usuario reportó offline (Lili/MinAmbiente 2026-06-11).
 *
 * Estos contratos corren en CI (vitest jsdom) y son baratos: stubean
 * navigator.onLine y verifican el comportamiento de degradación, sin red real.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setOnline } from '../../test-utils/index.js';

describe('offline contracts — servicios degradan a null/mensaje sin throw', () => {
  beforeEach(() => {
    vi.resetModules();
    setOnline(false);
  });
  afterEach(() => {
    setOnline(true);
    vi.restoreAllMocks();
    vi.unstubAllEnvs?.();
  });

  describe('ollamaStream (asistente IA)', () => {
    it('offline → throw con mensaje CLARO de internet (no se cuelga esperando fetch)', async () => {
      vi.mock('../llmTelemetryService', () => ({ recordLLMEvent: vi.fn() }));
      const { streamOllama } = await import('../ollamaStream');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      await expect(
        streamOllama('/api/ollama/api/generate', { model: 'granite3.3:8b', prompt: 'hola' }, () => {})
      ).rejects.toThrow(/sin conexión|internet/i);

      // El guard debe disparar ANTES de tocar la red: fetch no se llama.
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('online → NO corta por el guard (intenta la red)', async () => {
      vi.mock('../llmTelemetryService', () => ({ recordLLMEvent: vi.fn() }));
      setOnline(true);
      vi.resetModules();
      const { streamOllama } = await import('../ollamaStream');
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
      // online: el guard NO debe abortar; el fetch sí se intenta (y falla por mock).
      await expect(
        streamOllama('/api/ollama/api/generate', { model: 'granite3.3:8b', prompt: 'hola' }, () => {})
      ).rejects.toBeTruthy();
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  describe('deepResearchClient (investigación profunda)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_DEEP_RESEARCH_ENABLED', 'true');
    });

    it('submitDeepResearch offline → null inmediato sin throw ni red', async () => {
      const mod = await import('../deepResearchClient');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await mod.submitDeepResearch('¿qué siembro en junio?');
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fetchDeepResearchStatus offline → null sin throw ni red', async () => {
      const mod = await import('../deepResearchClient');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await mod.fetchDeepResearchStatus('job-123');
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
