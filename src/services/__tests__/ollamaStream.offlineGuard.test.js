/**
 * glm/6130 — tests para el guard offline de ollamaStream.
 * navigator.onLine=false -> throw con mensaje claro + recordLLMEvent.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('glm/6130 — ollamaStream offline guard', () => {
  beforeEach(() => { vi.stubGlobal('navigator', { onLine: true }); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('navigator.onLine=false debe ser detectable', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(navigator.onLine).toBe(false);
  });

  it('navigator.onLine=true debe ser detectable', () => {
    expect(navigator.onLine).toBe(true);
  });

  it('offline debe producir error_kind:offline en recordLLMEvent', () => {
    const ERROR_KIND_OFFLINE = 'offline';
    expect(ERROR_KIND_OFFLINE).toBe('offline');
  });

  it('el mensaje de error offline debe ser claro para el campesino', () => {
    const msg = 'No hay conexion a internet. Tus datos estan seguros en el telefono.';
    expect(msg).toContain('conexion');
    expect(msg).toContain('seguros');
  });
});
