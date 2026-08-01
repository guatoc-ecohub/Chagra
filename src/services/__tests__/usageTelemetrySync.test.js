/* eslint-disable no-undef */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setOnline } from '../../test-utils/index.js';

/**
 * Tests de sincronización de telemetría ANÓNIMA de USO (Tarea dashboard de uso).
 *
 * Cubren:
 * - syncUsageTelemetry no-op sin consentimiento
 * - syncUsageTelemetry no-op offline
 * - construye payload desde eventos no sincronizados de pilot_telemetry
 * - marca synced: true tras 2xx
 * - fetchUsageSummary devuelve JSON parseado
 * - falla silente (no lanza)
 */

let pilotData; // Map<id, event> que respalda el store pilot_telemetry.

// Fake DB Map-backed específico para pilot_telemetry (getAll + put).
function makeFakePilotDB() {
  const makeReq = (resultFn) => {
    const req = {};
    queueMicrotask(() => {
      try {
        req.result = resultFn();
        req.onsuccess?.({ target: req });
      } catch (e) {
        req.error = e;
        req.onerror?.({ target: req });
      }
    });
    return req;
  };
  return {
    transaction() {
      return {
        objectStore() {
          return {
            getAll() {
              return makeReq(() => Array.from(pilotData.values()));
            },
            put(record) {
              return makeReq(() => {
                pilotData.set(record.id, { ...record });
                return record.id;
              });
            },
          };
        },
      };
    },
  };
}

const { fetchWithAuthRetry } = vi.hoisted(() => ({
  fetchWithAuthRetry: vi.fn((...args) => {
    const a = /** @type {[RequestInfo | URL, RequestInit?]} */ (args);
    return global.fetch(a[0], a[1]);
  }),
}));

vi.mock('../../db/dbCore.js', () => ({
  openDB: vi.fn(async () => makeFakePilotDB()),
  STORES: { PILOT_TELEMETRY: 'pilot_telemetry' },
}));

vi.mock('../userProfileService.js', () => ({
  getTelemetryConsent: vi.fn(() => false),
  setTelemetryConsent: vi.fn(() => true),
}));

vi.mock('../apiService.js', () => ({
  fetchWithAuthRetry,
}));

global.fetch = vi.fn();

beforeEach(() => {
  pilotData = new Map();
  setOnline(true);
  vi.clearAllMocks();
  vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, ingested: 0, dropped: 0 }),
  })));
  fetchWithAuthRetry.mockImplementation((...args) => {
    const a = /** @type {[RequestInfo | URL, RequestInit?]} */ (args);
    return global.fetch(a[0], a[1]);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setOnline(true);
});

import { getTelemetryConsent } from '../userProfileService.js';

const seedEvent = (over = {}) => {
  const ev = {
    id: 'pt_abc',
    event_type: 'screen_view',
    metadata: { screen: 'activos' },
    session_id: 'as_111',
    created_at: '2026-06-21T10:00:00.000Z',
    synced: false,
    ...over,
  };
  pilotData.set(ev.id, ev);
  return ev;
};

describe('usageTelemetrySync — syncUsageTelemetry', () => {
  it('no-op sin consentimiento (default OFF)', async () => {
    vi.unstubAllEnvs();
    const { syncUsageTelemetry } = await import('../usageTelemetrySync.js');
    vi.mocked(getTelemetryConsent).mockReturnValue(false);
    seedEvent();

    const result = await syncUsageTelemetry();

    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('no-op offline', async () => {
    vi.unstubAllEnvs();
    const { syncUsageTelemetry } = await import('../usageTelemetrySync.js');
    vi.mocked(getTelemetryConsent).mockReturnValue(true);
    setOnline(false);
    seedEvent();

    const result = await syncUsageTelemetry();

    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('no-op si no hay eventos pendientes', async () => {
    vi.unstubAllEnvs();
    const { syncUsageTelemetry } = await import('../usageTelemetrySync.js');
    vi.mocked(getTelemetryConsent).mockReturnValue(true);
    setOnline(true);

    const result = await syncUsageTelemetry();

    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('construye el payload del sidecar desde eventos no sincronizados', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_SIDECAR_URL', 'https://chagra.example.co/api');
    vi.stubEnv('VITE_CHAGRA_MCP_TOKEN', 'tok-xyz');
    const { syncUsageTelemetry } = await import('../usageTelemetrySync.js');
    vi.mocked(getTelemetryConsent).mockReturnValue(true);
    setOnline(true);

    seedEvent({
      id: 'pt_1',
      event_type: 'game_start',
      metadata: { game_id: 'milpa' },
      session_id: 'as_aaa',
      created_at: '2026-06-21T10:00:00.000Z',
      synced: false,
    });
    // Evento ya sincronizado: NO debe enviarse.
    seedEvent({ id: 'pt_2', synced: true });

    await syncUsageTelemetry();

    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchWithAuthRetry.mock.calls[0];
    expect(url).toBe('https://chagra.example.co/api/ingest-usage');
    expect(opts.method).toBe('POST');
    expect(opts.headers['X-Chagra-Token']).toBe('tok-xyz');

    const payload = JSON.parse(opts.body);
    expect(payload).toHaveLength(1);
    expect(payload[0]).toEqual({
      id: 'pt_1',
      event_type: 'game_start',
      metadata: { game_id: 'milpa' },
      session_id: 'as_aaa',
      client_ts: Date.parse('2026-06-21T10:00:00.000Z'),
    });
  });

  it('marca synced: true tras 2xx', async () => {
    vi.unstubAllEnvs();
    const { syncUsageTelemetry } = await import('../usageTelemetrySync.js');
    vi.mocked(getTelemetryConsent).mockReturnValue(true);
    setOnline(true);
    seedEvent({ id: 'pt_sync', synced: false });

    const result = await syncUsageTelemetry();

    expect(result.synced).toBe(1);
    expect(result.errors).toBe(0);
    expect(pilotData.get('pt_sync').synced).toBe(true);
  });

  it('falla silente si el endpoint responde error (no marca synced)', async () => {
    vi.unstubAllEnvs();
    const { syncUsageTelemetry } = await import('../usageTelemetrySync.js');
    vi.mocked(getTelemetryConsent).mockReturnValue(true);
    setOnline(true);
    seedEvent({ id: 'pt_err', synced: false });

    vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({ ok: false, status: 500 })));

    const result = await syncUsageTelemetry();

    expect(result).toEqual({ synced: 0, errors: 1 });
    expect(pilotData.get('pt_err').synced).toBe(false);
  });

  it('falla silente si hay excepción (no lanza)', async () => {
    vi.unstubAllEnvs();
    const { syncUsageTelemetry } = await import('../usageTelemetrySync.js');
    vi.mocked(getTelemetryConsent).mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const result = await syncUsageTelemetry();

    expect(result).toBeNull();
  });
});

describe('usageTelemetrySync — fetchUsageSummary', () => {
  it('devuelve el JSON parseado del agregado', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_SIDECAR_URL', 'https://chagra.example.co/api');
    vi.stubEnv('VITE_CHAGRA_MCP_TOKEN', 'tok-xyz');
    const { fetchUsageSummary } = await import('../usageTelemetrySync.js');

    const summary = {
      total_events: 42,
      window: { from: '2026-06-01', to: '2026-06-21' },
      top_screens: [{ key: 'activos', count: 10 }],
      games: [],
      active_sessions: 3,
      named_users_enabled: false,
    };
    vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
      ok: true,
      status: 200,
      json: async () => summary,
    })));

    const result = await fetchUsageSummary();

    expect(result).toEqual(summary);
    const [url, opts] = fetchWithAuthRetry.mock.calls[0];
    expect(url).toBe('https://chagra.example.co/api/telemetry/usage');
    expect(opts.method).toBe('GET');
    expect(opts.headers['X-Chagra-Token']).toBe('tok-xyz');
  });

  it('devuelve null si el endpoint responde error', async () => {
    vi.unstubAllEnvs();
    const { fetchUsageSummary } = await import('../usageTelemetrySync.js');
    vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({ ok: false, status: 503 })));

    const result = await fetchUsageSummary();

    expect(result).toBeNull();
  });
});
