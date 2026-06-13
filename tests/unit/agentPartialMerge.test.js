/**
 * agentPartialMerge.test.js — lógica de merge del estado final ante
 * interrupción del stream del LLM (abort / timeout / cancel).
 *
 * Bug UX 2026-05-30: el texto parcial que el operador YA vio se borraba al
 * abortar/timeout/cancelar. Estos tests fijan el contrato: con parcial se
 * CONSERVA + marcador; sin parcial (primer token nunca llegó) se muestra el
 * error completo.
 */
import { describe, it, expect } from 'vitest';
import {
  mergePartialOnInterruption,
  normalizeInterruptReason,
  PARTIAL_MARKERS,
  FULL_ERROR_MESSAGES,
} from '../../src/services/agentPartialMerge.js';

describe('mergePartialOnInterruption', () => {
  describe('abort CON parcial', () => {
    it('conserva el texto parcial y apenda el marcador (no lo reemplaza)', () => {
      const partial = 'El café necesita sombra parcial y suelos';
      const res = mergePartialOnInterruption({ partialContent: partial, reason: 'abort' });

      expect(res.preservePartial).toBe(true);
      expect(res.incomplete).toBe(true);
      expect(res.error).toBeNull();
      // El parcial sobrevive íntegro al inicio del content.
      expect(res.content.startsWith(partial)).toBe(true);
      // Y se apendó el marcador no destructivo.
      expect(res.content).toContain(PARTIAL_MARKERS.abort);
      // NO es solo el string de error.
      expect(res.content).not.toBe(FULL_ERROR_MESSAGES.abort);
      expect(res.content.length).toBeGreaterThan(partial.length);
    });
  });

  describe('timeout CON parcial', () => {
    it('conserva el parcial + marcador de timeout, sin banner de error', () => {
      const partial = 'Para la broca del café puedes usar Beauveria';
      const res = mergePartialOnInterruption({ partialContent: partial, reason: 'timeout' });

      expect(res.preservePartial).toBe(true);
      expect(res.content.startsWith(partial)).toBe(true);
      // UX paciente: marcador tranquilizador de reintento automático, NUNCA
      // "toca de nuevo" / "Tiempo agotado".
      expect(res.content).toContain('reintentando');
      expect(res.content).not.toMatch(/toca de nuevo/i);
      expect(res.content).not.toMatch(/tiempo agotado/i);
      expect(res.error).toBeNull();
      expect(res.reason).toBe('timeout');
    });
  });

  describe('abort SIN parcial (primer token nunca llegó)', () => {
    it('no preserva nada y devuelve el mensaje de error completo en el banner', () => {
      const res = mergePartialOnInterruption({ partialContent: '', reason: 'abort' });

      expect(res.preservePartial).toBe(false);
      expect(res.incomplete).toBe(false);
      expect(res.content).toBeNull();
      expect(res.error).toBe(FULL_ERROR_MESSAGES.abort);
    });

    it('trata whitespace-only como sin parcial', () => {
      const res = mergePartialOnInterruption({ partialContent: '   \n  ', reason: 'timeout' });

      expect(res.preservePartial).toBe(false);
      expect(res.content).toBeNull();
      expect(res.error).toBe(FULL_ERROR_MESSAGES.timeout);
    });

    it('trata null/undefined como sin parcial', () => {
      expect(mergePartialOnInterruption({ partialContent: null, reason: 'abort' }).preservePartial).toBe(false);
      expect(mergePartialOnInterruption({ partialContent: undefined, reason: 'abort' }).preservePartial).toBe(false);
      expect(mergePartialOnInterruption({}).preservePartial).toBe(false);
    });
  });

  describe('cancel manual CON parcial', () => {
    it('conserva el parcial y usa el marcador "cancelado por ti" (no borra)', () => {
      const partial = 'Las pasifloras confundibles en el Cauca son';
      const res = mergePartialOnInterruption({ partialContent: partial, reason: 'cancel' });

      expect(res.preservePartial).toBe(true);
      expect(res.content.startsWith(partial)).toBe(true);
      expect(res.content).toContain(PARTIAL_MARKERS.cancel);
      expect(res.content).toContain('Cancelado por ti');
      expect(res.error).toBeNull();
      expect(res.reason).toBe('cancel');
    });
  });

  describe('cancel manual SIN parcial', () => {
    it('muestra el error de cancelación completo en el banner', () => {
      const res = mergePartialOnInterruption({ partialContent: '', reason: 'cancel' });

      expect(res.preservePartial).toBe(false);
      expect(res.content).toBeNull();
      expect(res.error).toBe(FULL_ERROR_MESSAGES.cancel);
    });
  });

  describe('razón desconocida', () => {
    it('cae a abort genérico', () => {
      const res = mergePartialOnInterruption({ partialContent: 'algo', reason: 'wtf' });
      expect(res.reason).toBe('abort');
      expect(res.content).toContain(PARTIAL_MARKERS.abort);
    });
  });
});

describe('normalizeInterruptReason', () => {
  it('pasa claves conocidas tal cual', () => {
    expect(normalizeInterruptReason('timeout')).toBe('timeout');
    expect(normalizeInterruptReason('cancel')).toBe('cancel');
    expect(normalizeInterruptReason('abort')).toBe('abort');
  });

  it('cae a abort para valores desconocidos / vacíos', () => {
    expect(normalizeInterruptReason('boom')).toBe('abort');
    expect(normalizeInterruptReason(undefined)).toBe('abort');
    expect(normalizeInterruptReason(null)).toBe('abort');
  });
});

/**
 * GUARDRAIL UX PACIENTE (2026-06-13): el operador pidió explícitamente eliminar
 * "Tiempo agotado. Toca de nuevo para reintentar." de la cara del campesino. La
 * cola durable reintenta sola; pedir "toca de nuevo" cuando el sistema YA está
 * reintentando es alarmante y falso. Este bloque blinda el copy contra regresión.
 */
describe('UX paciente — nunca el copy alarmante "Tiempo agotado / toca de nuevo"', () => {
  const forbidden = [/tiempo agotado/i, /toca de nuevo/i];

  it('ningún FULL_ERROR_MESSAGES contiene el copy prohibido', () => {
    for (const msg of Object.values(FULL_ERROR_MESSAGES)) {
      for (const re of forbidden) {
        expect(msg).not.toMatch(re);
      }
    }
  });

  it('ningún PARTIAL_MARKERS contiene el copy prohibido', () => {
    for (const msg of Object.values(PARTIAL_MARKERS)) {
      for (const re of forbidden) {
        expect(msg).not.toMatch(re);
      }
    }
  });

  it('timeout/abort comunican reintento automático (sin pedir acción)', () => {
    expect(FULL_ERROR_MESSAGES.timeout).toMatch(/reintentando|guardada/i);
    expect(FULL_ERROR_MESSAGES.abort).toMatch(/reintentando|guardada/i);
    expect(PARTIAL_MARKERS.timeout).toMatch(/reintentando/i);
    expect(PARTIAL_MARKERS.abort).toMatch(/reintentando/i);
  });

  it('cancel (acción voluntaria) sí ofrece Reintentar explícito', () => {
    expect(FULL_ERROR_MESSAGES.cancel).toMatch(/reintentar/i);
    expect(PARTIAL_MARKERS.cancel).toMatch(/reintentar/i);
  });
});
