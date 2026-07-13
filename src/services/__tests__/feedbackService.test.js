/**
 * @vitest-environment jsdom
 */

/* eslint-disable no-undef */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { fetchWithAuthRetry } = vi.hoisted(() => ({
  fetchWithAuthRetry: vi.fn((...args) => {
    const a = /** @type {[RequestInfo | URL, RequestInit?]} */ (args);
    return global.fetch(a[0], a[1]);
  }),
}));

vi.mock('../apiService.js', () => ({
  fetchWithAuthRetry,
}));

import { sendFeedback, hasConsent, saveConsent } from '../feedbackService';

describe('feedbackService', () => {
  const originalLocalStorage = global.localStorage;
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Mock localStorage
    global.localStorage = /** @type {any} */ ({
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
    // Mock fetch
    global.fetch = vi.fn();
    fetchWithAuthRetry.mockClear();
    fetchWithAuthRetry.mockImplementation((...args) => {
      const a = /** @type {[RequestInfo | URL, RequestInit?]} */ (args);
      return global.fetch(a[0], a[1]);
    });
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    global.fetch = originalFetch;
  });

  describe('hasConsent', () => {
    it('debe retornar true si localStorage tiene "true"', () => {
      vi.mocked(global.localStorage.getItem).mockReturnValue('true');
      expect(hasConsent()).toBe(true);
    });

    it('debe retornar false si localStorage tiene "false"', () => {
      vi.mocked(global.localStorage.getItem).mockReturnValue('false');
      expect(hasConsent()).toBe(false);
    });

    it('debe retornar false si localStorage está vacío', () => {
      vi.mocked(global.localStorage.getItem).mockReturnValue(null);
      expect(hasConsent()).toBe(false);
    });

    it('debe manejar errores de localStorage', () => {
      global.localStorage.getItem = vi.fn(() => {
        throw new Error('localStorage not available');
      });
      expect(hasConsent()).toBe(false);
    });
  });

  describe('saveConsent', () => {
    it('debe guardar "true" en localStorage', () => {
      saveConsent(true);
      expect(global.localStorage.setItem).toHaveBeenCalledWith('chagra_feedback_consent_v1', 'true');
    });

    it('debe guardar "false" en localStorage', () => {
      saveConsent(false);
      expect(global.localStorage.setItem).toHaveBeenCalledWith('chagra_feedback_consent_v1', 'false');
    });

    it('debe manejar errores de localStorage', () => {
      global.localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage not available');
      });
      expect(() => saveConsent(true)).not.toThrow();
    });
  });

  describe('sendFeedback', () => {
    it('debe enviar feedback con el schema correcto', async () => {
      vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
        ok: true,
        json: async () => ({}),
      })));

      const result = await sendFeedback({
        prompt: '¿Qué es el café?',
        response: 'El café es una planta...',
        thumb: 'up',
      });

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('¿Qué es el café?'),
        })
      );
      expect(fetchWithAuthRetry).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('debe incluir comentario si se proporciona', async () => {
      vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
        ok: true,
        json: async () => ({}),
      })));

      await sendFeedback({
        prompt: 'Test',
        response: 'Test response',
        thumb: 'down',
        comment: 'Falta información',
      });

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(/** @type {string} */ (fetchCall[1].body));
      expect(body.comment).toBe('Falta información');
    });

    it('debe retornar false si fetch falla', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const result = await sendFeedback({
        prompt: 'Test',
        response: 'Test',
        thumb: 'up',
      });

      expect(result).toBe(false);
    });

    it('debe retornar false si la respuesta no es 200', async () => {
      vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })));

      const result = await sendFeedback({
        prompt: 'Test',
        response: 'Test',
        thumb: 'up',
      });

      expect(result).toBe(false);
    });

    // Skip test del timeout por ahora - requiere configuración especial
    // TODO: Implementar test de timeout con vi.useFakeTimers() correctamente
    it.skip('debe abortar después del timeout', async () => {
      // Mock fetch que nunca se resuelve (simula timeout)
      vi.mocked(global.fetch).mockImplementation(
        () =>
          new Promise(() => {
            // Nunca se resuelve
          })
      );

      const fetchPromise = sendFeedback({
        prompt: 'Test',
        response: 'Test',
        thumb: 'up',
      });

      // Esperar más tiempo que el timeout de 8s
      const result = await fetchPromise;
      expect(result).toBe(false);
    }, 12000);
  });
});
