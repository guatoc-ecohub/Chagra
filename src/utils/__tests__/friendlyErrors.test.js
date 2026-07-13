import { describe, it, expect } from 'vitest';
import {
  friendlyMessage,
  FRIENDLY_MESSAGES,
  FRIENDLY_FALLBACK,
} from '../friendlyErrors';

/**
 * Tests para friendlyMessage (UX-12 / #286).
 *
 * Cubre los 6 cases mencionados en la spec más fallback genérico.
 */

describe('friendlyMessage', () => {
  describe('network errors', () => {
    it('mapea "fetch failed" a NETWORK', () => {
      expect(friendlyMessage(new Error('TypeError: fetch failed'))).toBe(FRIENDLY_MESSAGES.NETWORK);
    });
    it('mapea "Failed to fetch" (Chrome / Firefox) a NETWORK', () => {
      expect(friendlyMessage(new Error('Failed to fetch'))).toBe(FRIENDLY_MESSAGES.NETWORK);
    });
    it('mapea "NetworkError" (Firefox) a NETWORK', () => {
      expect(friendlyMessage(new Error('NetworkError when attempting to fetch'))).toBe(FRIENDLY_MESSAGES.NETWORK);
    });
    it('mapea timeout a NETWORK', () => {
      expect(friendlyMessage(new Error('Request timed out'))).toBe(FRIENDLY_MESSAGES.NETWORK);
    });
    it('mapea AbortError a NETWORK', () => {
      expect(friendlyMessage(new Error('The operation was aborted'))).toBe(FRIENDLY_MESSAGES.NETWORK);
    });
  });

  describe('HTTP 401 / token expired', () => {
    it('mapea status 401 a AUTH_EXPIRED', () => {
      expect(friendlyMessage(401)).toBe(FRIENDLY_MESSAGES.AUTH_EXPIRED);
    });
    it('mapea status 403 a AUTH_EXPIRED', () => {
      expect(friendlyMessage(403)).toBe(FRIENDLY_MESSAGES.AUTH_EXPIRED);
    });
    it('mapea Error con .status=401 a AUTH_EXPIRED', () => {
      const err = /** @type {any} */ (new Error('Unauthorized'));
      err.status = 401;
      expect(friendlyMessage(err)).toBe(FRIENDLY_MESSAGES.AUTH_EXPIRED);
    });
    it('mapea "token expired" en el mensaje a AUTH_EXPIRED', () => {
      expect(friendlyMessage(new Error('OAuth token expired'))).toBe(FRIENDLY_MESSAGES.AUTH_EXPIRED);
    });
  });

  describe('HTTP 422 validation', () => {
    it('mapea status 422 a VALIDATION', () => {
      expect(friendlyMessage(422)).toBe(FRIENDLY_MESSAGES.VALIDATION);
    });
    it('mapea Error con .status=422 a VALIDATION', () => {
      const err = /** @type {any} */ (new Error('Unprocessable Entity'));
      err.status = 422;
      expect(friendlyMessage(err)).toBe(FRIENDLY_MESSAGES.VALIDATION);
    });
    it('mapea "validation" en el mensaje a VALIDATION', () => {
      expect(friendlyMessage(new Error('Validation failed for field name'))).toBe(FRIENDLY_MESSAGES.VALIDATION);
    });
  });

  describe('HTTP 5xx server', () => {
    it('mapea status 500 a SERVER', () => {
      expect(friendlyMessage(500)).toBe(FRIENDLY_MESSAGES.SERVER);
    });
    it('mapea status 502 a SERVER', () => {
      expect(friendlyMessage(502)).toBe(FRIENDLY_MESSAGES.SERVER);
    });
    it('mapea status 503 a SERVER', () => {
      expect(friendlyMessage(503)).toBe(FRIENDLY_MESSAGES.SERVER);
    });
    it('mapea Error con .status=500 a SERVER', () => {
      const err = /** @type {any} */ (new Error('Internal Server Error'));
      err.status = 500;
      expect(friendlyMessage(err)).toBe(FRIENDLY_MESSAGES.SERVER);
    });
  });

  describe('Ollama down', () => {
    it('mapea "ollama" en el mensaje a OLLAMA_DOWN', () => {
      expect(friendlyMessage(new Error('ollama: connect ECONNREFUSED 127.0.0.1:11434'))).toBe(FRIENDLY_MESSAGES.OLLAMA_DOWN);
    });
    it('mapea "ECONNREFUSED" a OLLAMA_DOWN', () => {
      expect(friendlyMessage(new Error('ECONNREFUSED'))).toBe(FRIENDLY_MESSAGES.OLLAMA_DOWN);
    });
    it('mapea "llama runner" crash a OLLAMA_DOWN', () => {
      expect(friendlyMessage(new Error('llama runner exited unexpectedly'))).toBe(FRIENDLY_MESSAGES.OLLAMA_DOWN);
    });
  });

  describe('Vision OOM', () => {
    it('mapea "out of memory" a VISION_OOM', () => {
      expect(friendlyMessage(new Error('CUDA out of memory'))).toBe(FRIENDLY_MESSAGES.VISION_OOM);
    });
    it('mapea status 413 (Payload Too Large) a VISION_OOM', () => {
      expect(friendlyMessage(413)).toBe(FRIENDLY_MESSAGES.VISION_OOM);
    });
    it('mapea "imagen muy grande" a VISION_OOM', () => {
      expect(friendlyMessage(new Error('imagen muy grande para el modelo'))).toBe(FRIENDLY_MESSAGES.VISION_OOM);
    });
  });

  describe('fallback genérico', () => {
    it('retorna FALLBACK para null', () => {
      expect(friendlyMessage(null)).toBe(FRIENDLY_FALLBACK);
    });
    it('retorna FALLBACK para undefined', () => {
      expect(friendlyMessage(undefined)).toBe(FRIENDLY_FALLBACK);
    });
    it('retorna FALLBACK para un error desconocido', () => {
      expect(friendlyMessage(new Error('something weird happened'))).toBe(FRIENDLY_FALLBACK);
    });
    it('retorna FALLBACK para string vacío', () => {
      expect(friendlyMessage('')).toBe(FRIENDLY_FALLBACK);
    });
  });

  describe('orden y precedencia', () => {
    it('un 401 con mensaje "fetch failed" matchea AUTH antes que NETWORK', () => {
      const err = /** @type {any} */ (new Error('fetch failed: Unauthorized'));
      err.status = 401;
      expect(friendlyMessage(err)).toBe(FRIENDLY_MESSAGES.AUTH_EXPIRED);
    });
    it('un mensaje con "ollama" + "fetch failed" matchea OLLAMA antes que NETWORK', () => {
      expect(friendlyMessage(new Error('fetch failed: ollama refused connection'))).toBe(FRIENDLY_MESSAGES.OLLAMA_DOWN);
    });
    it('reconoce "HTTP 422" parseado desde el mensaje', () => {
      expect(friendlyMessage(new Error('FarmOS API Error HTTP 422: Unprocessable'))).toBe(FRIENDLY_MESSAGES.VALIDATION);
    });
  });

  describe('Colombia / no voseo', () => {
    it('los mensajes usan "vuelve" / "intenta" — NO "volvé"/"intentá"', () => {
      const allMessages = Object.values(FRIENDLY_MESSAGES).concat([FRIENDLY_FALLBACK]);
      for (const msg of allMessages) {
        expect(msg).not.toMatch(/intentá|volvé|tenés|querés|elegí|avisame|fijate|cerrá|tomá/i);
      }
    });
    it('los mensajes usan "tú/usted" implícito — no "vos"', () => {
      const allMessages = Object.values(FRIENDLY_MESSAGES).concat([FRIENDLY_FALLBACK]);
      for (const msg of allMessages) {
        // \bvos\b atrapa la palabra exacta; "volverá" o "vuelve" no matchean.
        expect(msg).not.toMatch(/\bvos\b/i);
      }
    });
  });
});
