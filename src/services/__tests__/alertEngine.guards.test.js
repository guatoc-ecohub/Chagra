/**
 * alertEngine.guards.test.js — Test de degradacion cuando el MCP/sidecar esta caido.
 *
 * Verifica que:
 *  - fetchClimaData retorna null sin lanzar cuando el sidecar falla
 *  - checkThresholds no rompe el motor aunque el sidecar este caido
 *  - dispatch/showSystemNotification no fallan con errores inesperados
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { alertEngine } from '../alertEngine.js';

// Accedemos al singleton. Reseteamos estado entre tests.
beforeEach(async () => {
  alertEngine.stop?.();
  // Limpiar alertas activas entre tests
  const alerts = alertEngine.getActiveAlerts?.() || [];
  for (const a of alerts) {
    await alertEngine.clearAlert?.(a.type)?.catch(() => {});
  }
  alertEngine.lastClimaSnapshot = null;
  alertEngine.lastCheckTime = null;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('alertEngine — fetchClimaData falla gracefully', () => {
  it('retorna null cuando fetchClimaSnapshot rechaza (sidecar caido)', async () => {
    // Mock fetchClimaSnapshot para que rechace
    vi.mock('../climaService.js', () => ({
      fetchClimaSnapshot: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    }));
    // Simulamos coordenadas validas
    const origResolve = alertEngine.resolveCoords;
    alertEngine.resolveCoords = () => ({ lat: 4.5, lng: -73.9 });

    // La funcion no debe lanzar
    const result = await alertEngine.fetchClimaData();
    expect(result).toBeNull();

    alertEngine.resolveCoords = origResolve;
    vi.resetModules();
  });

  it('retorna null sin coordenadas (sin network call)', async () => {
    const origResolve = alertEngine.resolveCoords;
    alertEngine.resolveCoords = () => null;

    const result = await alertEngine.fetchClimaData();
    expect(result).toBeNull();

    alertEngine.resolveCoords = origResolve;
  });
});

describe('alertEngine — checkThresholds no rompe con sidecar caido', () => {
  it('completa sin lanzar aunque fetchClimaData devuelva null', async () => {
    const origFetch = alertEngine.fetchClimaData;
    alertEngine.fetchClimaData = vi.fn().mockResolvedValue(null);

    // No debe lanzar
    await expect(alertEngine.checkThresholds()).resolves.toBeUndefined();

    alertEngine.fetchClimaData = origFetch;
  });

  it('completa sin lanzar aunque fetchClimaData rechace', async () => {
    const origFetch = alertEngine.fetchClimaData;
    alertEngine.fetchClimaData = vi.fn().mockRejectedValue(new Error('timeout'));

    // checkThresholds ya tiene try/catch — debe tragar el error
    await expect(alertEngine.checkThresholds()).resolves.toBeUndefined();

    alertEngine.fetchClimaData = origFetch;
  });
});

describe('alertEngine — dispatch no lanza', () => {
  it('dispatch survive window nulo (SSR/test)', () => {
    // No debe lanzar aunque window sea undefined
    expect(() => {
      alertEngine.dispatch('test_event', { ok: true });
    }).not.toThrow();
  });

  it('dispatch survive si dispatchEvent no existe', () => {
    const origWindow = globalThis.window;
    globalThis.window = /** @type {any} */ ({});
    expect(() => {
      alertEngine.dispatch('test_event', { ok: true });
    }).not.toThrow();
    globalThis.window = origWindow;
  });
});

describe('alertEngine — showSystemNotification no lanza', () => {
  it('survive cuando Notification no esta definido', async () => {
    const origNotification = globalThis.Notification;
    globalThis.Notification = undefined;
    await expect(
      alertEngine.showSystemNotification({ title: 'Test', message: 'msg', type: 'TEST' })
    ).resolves.toBeUndefined();
    globalThis.Notification = origNotification;
  });

  it('survive con Notification.permission denegado', async () => {
    const origNotification = globalThis.Notification;
    globalThis.Notification = /** @type {any} */ ({ permission: 'denied' });
    await expect(
      alertEngine.showSystemNotification({ title: 'Test', message: 'msg', type: 'TEST' })
    ).resolves.toBeUndefined();
    globalThis.Notification = origNotification;
  });
});

describe('alertEngine — estado consistente despues de fallo', () => {
  it('getStatus retorna estructura valida tras fetch fallido', async () => {
    const origFetch = alertEngine.fetchClimaData;
    alertEngine.fetchClimaData = vi.fn().mockRejectedValue(new Error('fail'));

    await alertEngine.checkThresholds();

    const status = alertEngine.getStatus();
    expect(status.hasClima).toBe(false);
    expect(typeof status.activeAlertsCount).toBe('number');
    expect(status.isPolling).toBeDefined();

    alertEngine.fetchClimaData = origFetch;
  });
});
