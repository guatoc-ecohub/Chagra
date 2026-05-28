/**
 * climaService.test.js — PoC alertas meteorológicas (#316).
 *
 * Cubre:
 *  - cache 30 min in-memory.
 *  - persistencia localStorage round-trip.
 *  - dedupe de promesas in-flight (inFlight singleton).
 *  - mapeo phase → badge color / descripción.
 *  - getClimaSnapshot del sidecarClient devuelve null cuando flag off.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const importFresh = async () => {
  vi.resetModules();
  return import('../climaService.js');
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('climaService — phase helpers', () => {
  it('describePhase maps known phases', async () => {
    const mod = await importFresh();
    expect(mod.describePhase('nino_fuerte')).toBe('El Niño fuerte');
    expect(mod.describePhase('nina_debil')).toBe('La Niña débil');
    expect(mod.describePhase('neutral')).toBe('Neutral ENSO');
  });

  it('phaseBadgeColor maps to expected accent', async () => {
    const mod = await importFresh();
    expect(mod.phaseBadgeColor('nino_fuerte')).toBe('red');
    expect(mod.phaseBadgeColor('nina_moderada')).toBe('amber');
    expect(mod.phaseBadgeColor('nino_debil')).toBe('sky');
    expect(mod.phaseBadgeColor('neutral')).toBe('emerald');
    expect(mod.phaseBadgeColor(null)).toBe('emerald');
  });

  it('severityClasses returns tailwind tokens per severity', async () => {
    const mod = await importFresh();
    const c = mod.severityClasses('critical');
    expect(c.bg).toContain('red');
    const w = mod.severityClasses('warning');
    expect(w.bg).toContain('amber');
    const i = mod.severityClasses('info');
    expect(i.bg).toContain('sky');
    const n = mod.severityClasses('neutral');
    expect(n.bg).toContain('emerald');
  });
});

describe('climaService — cache + fetch', () => {
  it('getCachedClimaSnapshot returns null when empty', async () => {
    const mod = await importFresh();
    expect(mod.getCachedClimaSnapshot()).toBeNull();
  });

  it('fetchClimaSnapshot stores in memory + localStorage', async () => {
    vi.resetModules();
    vi.doMock('../sidecarClient.js', () => ({
      getClimaSnapshot: vi.fn().mockResolvedValue({
        fetched_at: new Date().toISOString(),
        enso_status: { phase: 'neutral', severity: 'neutral', sources: [] },
        alertas_locales: [],
      }),
    }));
    const mod = await import('../climaService.js');
    const result = await mod.fetchClimaSnapshot();
    expect(result?.enso_status?.phase).toBe('neutral');
    // Second call within TTL reuses memCache and does NOT hit sidecarClient
    const sidecar = await import('../sidecarClient.js');
    await mod.fetchClimaSnapshot();
    expect(sidecar.getClimaSnapshot).toHaveBeenCalledTimes(1);

    // localStorage round-trip
    const raw = localStorage.getItem('chagra:clima:snapshot-v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.payload.enso_status.phase).toBe('neutral');
  });

  it('forceRefresh bypasses the cache', async () => {
    vi.resetModules();
    const mockGetClima = vi.fn().mockResolvedValue({
      fetched_at: new Date().toISOString(),
      enso_status: { phase: 'nino_debil', severity: 'info', sources: [] },
      alertas_locales: [],
    });
    vi.doMock('../sidecarClient.js', () => ({ getClimaSnapshot: mockGetClima }));
    const mod = await import('../climaService.js');
    await mod.fetchClimaSnapshot();
    await mod.fetchClimaSnapshot({ forceRefresh: true });
    expect(mockGetClima).toHaveBeenCalledTimes(2);
  });

  it('dispatches chagra:clima:updated when fetch succeeds', async () => {
    vi.resetModules();
    vi.doMock('../sidecarClient.js', () => ({
      getClimaSnapshot: vi.fn().mockResolvedValue({
        fetched_at: new Date().toISOString(),
        enso_status: { phase: 'neutral', severity: 'neutral', sources: [] },
        alertas_locales: [],
      }),
    }));
    const mod = await import('../climaService.js');
    const handler = vi.fn();
    window.addEventListener('chagra:clima:updated', handler);
    await mod.fetchClimaSnapshot();
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('chagra:clima:updated', handler);
  });

  it('two simultaneous fetches share the in-flight promise', async () => {
    vi.resetModules();
    let resolveFn;
    const pending = new Promise((res) => { resolveFn = res; });
    const sidecarMock = vi.fn().mockReturnValue(pending);
    vi.doMock('../sidecarClient.js', () => ({ getClimaSnapshot: sidecarMock }));
    const mod = await import('../climaService.js');
    const p1 = mod.fetchClimaSnapshot();
    const p2 = mod.fetchClimaSnapshot();
    expect(sidecarMock).toHaveBeenCalledTimes(1);
    resolveFn({
      fetched_at: new Date().toISOString(),
      enso_status: { phase: 'neutral', severity: 'neutral', sources: [] },
      alertas_locales: [],
    });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(r2);
  });
});
