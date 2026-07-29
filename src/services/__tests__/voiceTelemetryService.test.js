import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockStore, mockDbRef } = vi.hoisted(() => {
  const store = {
    _data: [],
    add(item) { this._data.push(item); },
    put(item) {
      const idx = this._data.findIndex((e) => e.id === item.id);
      if (idx >= 0) this._data[idx] = item;
      else this._data.push(item);
    },
    get(id) {
      const found = this._data.find((e) => e.id === id);
      const req = { result: found || null };
      queueMicrotask(() => { if (req.onsuccess) req.onsuccess(); });
      return req;
    },
    index(_name) { return this; },
    getAll(_range, _limit) {
      const req = { result: [...this._data] };
      queueMicrotask(() => { if (req.onsuccess) req.onsuccess(); });
      return req;
    },
    openCursor(_range, _dir) {
      let idx = 0;
      const data = [...this._data];
      const req = { onsuccess: null, onerror: null };
      const advance = () => {
        idx++;
        if (idx < data.length) {
          if (req.onsuccess) req.onsuccess({ target: { result: { value: data[idx], continue: advance } } });
        } else {
          if (req.onsuccess) req.onsuccess({ target: { result: null } });
        }
      };
      if (data.length > 0) {
        queueMicrotask(() => { if (req.onsuccess) req.onsuccess({ target: { result: { value: data[0], continue: advance } } }); });
      } else {
        queueMicrotask(() => { if (req.onsuccess) req.onsuccess({ target: { result: null } }); });
      }
      return req;
    },
  };
  return { mockStore: store, mockDbRef: { current: null } };
});

vi.mock('../../db/dbCore.js', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDbRef.current)),
  STORES: { VOICE_TELEMETRY: 'voice_telemetry' },
}));

import { openDB } from '../../db/dbCore.js';
import { recordEvent, getMetrics, getPendingEvents, clearSyncedEvents, getAllEvents } from '../voiceTelemetryService.js';

function buildTx(store) {
  return {
    objectStore: vi.fn(() => store),
    oncomplete: null,
    onerror: null,
  };
}

describe('voiceTelemetryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore._data = [];
    mockDbRef.current = {
      transaction: vi.fn(() => {
        const tx = buildTx(mockStore);
        queueMicrotask(() => { if (tx.oncomplete) tx.oncomplete(); });
        return tx;
      }),
    };
  });

  describe('recordEvent', () => {
    it('persiste un evento y retorna el objeto', async () => {
      const ev = await recordEvent(/** @type {any} */ ({
        event_type: 'voice_capture_start',
        flujo: 'siembra',
        duration_ms: 1500,
        accepted: true,
        connectivity: 'online',
      }));

      expect(ev).not.toBeNull();
      expect(ev.event_type).toBe('voice_capture_start');
      expect(ev.flujo).toBe('siembra');
      expect(ev.synced).toBe(false);
      expect(ev.id).toBeTruthy();
    });

    it('retorna null si openDB falla', async () => {
      vi.mocked(openDB).mockRejectedValueOnce(new Error('DB error'));
      const ev = await recordEvent(/** @type {any} */ ({ event_type: 'test' }));
      expect(ev).toBeNull();
    });
  });

  describe('getPendingEvents', () => {
    it('retorna array de eventos', async () => {
      mockStore._data = [
        { id: 'e1', synced: false, created_at: '2024-01-01' },
        { id: 'e2', synced: true, created_at: '2024-01-02' },
      ];

      const events = await getPendingEvents(10);
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('getAllEvents', () => {
    it('retorna array de eventos', async () => {
      mockStore._data = [
        { id: 'e1', created_at: '2024-01-01T00:00:00Z', synced: false },
      ];

      const events = await getAllEvents(10);
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('retorna objeto de metricas', async () => {
      mockStore._data = [
        { id: 'e1', event_type: 'voice_capture_start', flujo: 'siembra', connectivity: 'online', synced: false, created_at: '2024-01-01' },
      ];

      const metrics = await getMetrics();
      expect(typeof metrics).toBe('object');
      expect(typeof metrics.total_events).toBe('number');
    });
  });

  describe('clearSyncedEvents', () => {
    it('no lanza excepcion', async () => {
      mockStore._data = [];
      await expect(clearSyncedEvents(30)).resolves.toBeUndefined();
    });

    it('maneja fallo de openDB', async () => {
      vi.mocked(openDB).mockRejectedValueOnce(new Error('DB error'));
      await expect(clearSyncedEvents(30)).resolves.toBeUndefined();
    });
  });
});
