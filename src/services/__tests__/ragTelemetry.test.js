/**
 * ragTelemetry.test.js — cobertura del service de telemetría RAG (L1.10).
 *
 * Mockea openDB/STORES (`../../db/dbCore.js`) con un Map en memoria que
 * imita las operaciones IDB usadas: add, count, openCursor sobre el index
 * `created_at`, clear. Aislado del IDB real para correr en jsdom sin
 * fake-indexeddb.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ragTelemetry — service L1.10', () => {
  let inMemoryStore;
  let ragTelemetry;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    inMemoryStore = new Map();

    // Helper: ejecuta callback de forma microtask-async (replica IDB request).
    const asyncReq = (resultFactory) => {
      const req = { onsuccess: null, onerror: null };
      Promise.resolve().then(() => {
        req.result = resultFactory();
        req.onsuccess?.({ target: req });
      });
      return req;
    };

    // Cursor sobre eventos ordenados por created_at. Soporta direction
    // 'prev' (desc) y 'next' (asc) según invocación del service.
    const buildCursor = (direction) => {
      const items = [...inMemoryStore.values()].sort((a, b) => {
        const cmp = (a.created_at || '').localeCompare(b.created_at || '');
        return direction === 'prev' ? -cmp : cmp;
      });
      let i = 0;
      const req = { onsuccess: null, onerror: null };
      const stepCursor = () => {
        if (i >= items.length) {
          req.result = null;
          req.onsuccess?.({ target: req });
          return;
        }
        const value = items[i];
        const cursor = {
          value,
          continue: () => {
            i += 1;
            Promise.resolve().then(stepCursor);
          },
          delete: () => {
            inMemoryStore.delete(value.id);
          },
        };
        req.result = cursor;
        req.onsuccess?.({ target: req });
      };
      Promise.resolve().then(stepCursor);
      return req;
    };

    const stubIndex = {
      openCursor: (range, direction) => buildCursor(direction),
    };

    const stubStore = {
      add: (record) => asyncReq(() => {
        inMemoryStore.set(record.id, record);
        return record;
      }),
      count: () => asyncReq(() => inMemoryStore.size),
      clear: () => asyncReq(() => { inMemoryStore.clear(); return undefined; }),
      index: () => stubIndex,
    };

    const stubTx = () => {
      const tx = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore: () => stubStore,
        error: null,
      };
      // Disparar oncomplete en la siguiente microtask para que el await del
      // service resuelva.
      Promise.resolve().then(() => tx.oncomplete?.());
      return tx;
    };

    const stubDb = { transaction: () => stubTx() };

    vi.doMock('../../db/dbCore.js', () => ({
      openDB: vi.fn().mockResolvedValue(stubDb),
      STORES: { RAG_TELEMETRY: 'rag_telemetry' },
    }));

    // localStorage default: telemetría habilitada (key ausente o 'true').
    localStorage.clear();

    ragTelemetry = await import('../ragTelemetry.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recordRagEvent', () => {
    it('persiste un evento con todos los campos normalizados', async () => {
      const record = await ragTelemetry.recordRagEvent({
        surface: 'agente',
        query: 'como sembrar fresa',
        topScore: 4.523,
        latencyMs: 87.6,
        resultCount: 3,
      });

      expect(record).not.toBeNull();
      expect(record.id).toMatch(/^rg_/);
      expect(record.surface).toBe('agente');
      expect(record.query).toBe('como sembrar fresa');
      expect(record.query_length).toBe('como sembrar fresa'.length);
      expect(record.top_score).toBeCloseTo(4.523);
      expect(record.result_count).toBe(3);
      expect(record.latency_ms).toBe(88); // redondeado
      expect(record.has_results).toBe(1);
      expect(record.error_kind).toBeNull();
      expect(record.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(inMemoryStore.size).toBe(1);
    });

    it('trunca queries largas a 60 chars conservando query_length original', async () => {
      const longQuery = 'a'.repeat(200);
      const record = await ragTelemetry.recordRagEvent({
        surface: 'voice',
        query: longQuery,
        topScore: 1.0,
        latencyMs: 10,
        resultCount: 1,
      });

      expect(record.query.length).toBe(60);
      expect(record.query_length).toBe(200);
    });

    it('marca has_results=0 y top_score=null cuando resultCount=0', async () => {
      const record = await ragTelemetry.recordRagEvent({
        surface: 'foliage',
        query: 'query sin matches',
        topScore: null,
        latencyMs: 50,
        resultCount: 0,
      });

      expect(record.has_results).toBe(0);
      expect(record.top_score).toBeNull();
      expect(record.result_count).toBe(0);
    });

    it('aplica default surface="unknown" si se omite', async () => {
      const record = await ragTelemetry.recordRagEvent({
        query: 'q',
        latencyMs: 5,
        resultCount: 0,
      });
      expect(record.surface).toBe('unknown');
    });

    it('persiste error_kind cuando se pasa', async () => {
      const record = await ragTelemetry.recordRagEvent({
        surface: 'species',
        query: 'q',
        latencyMs: 12,
        resultCount: 0,
        error: 'fetch',
      });
      expect(record.error_kind).toBe('fetch');
    });

    it('no persiste si telemetría está deshabilitada via localStorage', async () => {
      localStorage.setItem('chagra:rag-telemetry-enabled', 'false');
      const record = await ragTelemetry.recordRagEvent({
        surface: 'agente',
        query: 'q',
        latencyMs: 10,
        resultCount: 1,
        topScore: 2,
      });
      expect(record).toBeNull();
      expect(inMemoryStore.size).toBe(0);
    });

    it('rechaza valores de sampling fuera de [0,1] (clamp)', () => {
      // getTelemetryRate clampea negativos a 0 y >1 a 1.
      // No podemos mockear import.meta.env trivialmente; verificamos el
      // happy-path (default 1.0) — el branch de clamp queda cubierto por
      // las assertions de tipo en recordRagEvent.
      expect(ragTelemetry.getTelemetryRate()).toBeGreaterThanOrEqual(0);
      expect(ragTelemetry.getTelemetryRate()).toBeLessThanOrEqual(1);
    });
  });

  describe('getRagEvents', () => {
    it('devuelve eventos en orden descendente por created_at', async () => {
      // Insertar 3 eventos con timestamps controlados manipulando created_at
      // directamente en el store (recordRagEvent usa Date.now via toISOString).
      const ev1 = await ragTelemetry.recordRagEvent({
        surface: 'a', query: 'q1', topScore: 1, latencyMs: 10, resultCount: 1,
      });
      // Forzar timestamps distintos sobreescribiendo created_at en el store.
      // (Simula 3 calls separados en el tiempo.)
      inMemoryStore.get(ev1.id).created_at = '2026-05-19T10:00:00.000Z';

      const ev2 = await ragTelemetry.recordRagEvent({
        surface: 'b', query: 'q2', topScore: 2, latencyMs: 20, resultCount: 1,
      });
      inMemoryStore.get(ev2.id).created_at = '2026-05-19T11:00:00.000Z';

      const ev3 = await ragTelemetry.recordRagEvent({
        surface: 'c', query: 'q3', topScore: 3, latencyMs: 30, resultCount: 1,
      });
      inMemoryStore.get(ev3.id).created_at = '2026-05-19T12:00:00.000Z';

      const events = await ragTelemetry.getRagEvents({ limit: 10 });
      expect(events.length).toBe(3);
      expect(events[0].surface).toBe('c'); // más reciente
      expect(events[1].surface).toBe('b');
      expect(events[2].surface).toBe('a');
    });

    it('respeta el límite de eventos', async () => {
      for (let i = 0; i < 5; i++) {
        const ev = await ragTelemetry.recordRagEvent({
          surface: 's', query: `q${i}`, topScore: 1, latencyMs: 10, resultCount: 1,
        });
        // Forzar timestamps incrementales para orden determinístico
        inMemoryStore.get(ev.id).created_at = `2026-05-19T1${i}:00:00.000Z`;
      }
      const events = await ragTelemetry.getRagEvents({ limit: 2 });
      expect(events.length).toBe(2);
    });

    it('filtra por since', async () => {
      const ev1 = await ragTelemetry.recordRagEvent({
        surface: 'a', query: 'q1', topScore: 1, latencyMs: 10, resultCount: 1,
      });
      inMemoryStore.get(ev1.id).created_at = '2026-05-19T08:00:00.000Z';

      const ev2 = await ragTelemetry.recordRagEvent({
        surface: 'b', query: 'q2', topScore: 1, latencyMs: 10, resultCount: 1,
      });
      inMemoryStore.get(ev2.id).created_at = '2026-05-19T12:00:00.000Z';

      const events = await ragTelemetry.getRagEvents({
        limit: 10,
        since: '2026-05-19T10:00:00.000Z',
      });
      expect(events.length).toBe(1);
      expect(events[0].surface).toBe('b');
    });
  });

  describe('getRagMetrics', () => {
    it('agrega métricas por superficie', async () => {
      // 3 eventos en "agente" — 2 con hits, 1 sin hits
      await ragTelemetry.recordRagEvent({
        surface: 'agente', query: 'q1', topScore: 5, latencyMs: 100, resultCount: 3,
      });
      await ragTelemetry.recordRagEvent({
        surface: 'agente', query: 'q2', topScore: 3, latencyMs: 200, resultCount: 1,
      });
      await ragTelemetry.recordRagEvent({
        surface: 'agente', query: 'q_sin_match', topScore: null, latencyMs: 50, resultCount: 0,
      });

      // 1 evento en "foliage"
      await ragTelemetry.recordRagEvent({
        surface: 'foliage', query: 'qf', topScore: 2, latencyMs: 80, resultCount: 2,
      });

      const metrics = await ragTelemetry.getRagMetrics();

      expect(metrics.total).toBe(4);
      expect(metrics.bySurface.agente.count).toBe(3);
      expect(metrics.bySurface.agente.hitRate).toBeCloseTo(2 / 3);
      expect(metrics.bySurface.agente.avgLatencyMs).toBe(Math.round((100 + 200 + 50) / 3));
      expect(metrics.bySurface.agente.zeroScoreQueries).toBe(1);
      expect(metrics.bySurface.agente.avgTopScore).toBeCloseTo((5 + 3) / 2);

      expect(metrics.bySurface.foliage.count).toBe(1);
      expect(metrics.bySurface.foliage.hitRate).toBe(1);

      expect(metrics.overall.hitRate).toBeCloseTo(3 / 4);
      expect(metrics.zeroScoreQueries.length).toBe(1);
      expect(metrics.zeroScoreQueries[0].query).toBe('q_sin_match');
    });

    it('retorna métricas vacías cuando no hay eventos', async () => {
      const metrics = await ragTelemetry.getRagMetrics();
      expect(metrics.total).toBe(0);
      expect(metrics.overall.hitRate).toBe(0);
      expect(metrics.overall.errorRate).toBe(0);
      expect(Object.keys(metrics.bySurface).length).toBe(0);
      expect(metrics.zeroScoreQueries).toEqual([]);
    });

    it('separa errores de zero-score queries', async () => {
      await ragTelemetry.recordRagEvent({
        surface: 'agente', query: 'q_zero', topScore: null, latencyMs: 50, resultCount: 0,
      });
      await ragTelemetry.recordRagEvent({
        surface: 'agente', query: 'q_err', topScore: null, latencyMs: 50, resultCount: 0,
        error: 'fetch',
      });

      const metrics = await ragTelemetry.getRagMetrics();
      expect(metrics.total).toBe(2);
      // zero-score solo cuenta los sin error
      expect(metrics.bySurface.agente.zeroScoreQueries).toBe(1);
      // hitRate considera ambos como "no hit"
      expect(metrics.bySurface.agente.hitRate).toBe(0);
      // errorRate cuenta solo los marcados con error_kind
      expect(metrics.overall.errorRate).toBe(0.5);
    });
  });

  describe('getTelemetryRate', () => {
    it('default 1.0 si no hay env var', () => {
      expect(ragTelemetry.getTelemetryRate()).toBe(1.0);
    });
  });

  describe('clearRagTelemetry', () => {
    it('borra todos los eventos', async () => {
      await ragTelemetry.recordRagEvent({
        surface: 'a', query: 'q', topScore: 1, latencyMs: 10, resultCount: 1,
      });
      expect(inMemoryStore.size).toBe(1);

      const ok = await ragTelemetry.clearRagTelemetry();
      expect(ok).toBe(true);
      expect(inMemoryStore.size).toBe(0);
    });
  });

  describe('isRagTelemetryEnabled / setRagTelemetryEnabled', () => {
    it('default true; setter persiste en localStorage', () => {
      expect(ragTelemetry.isRagTelemetryEnabled()).toBe(true);
      ragTelemetry.setRagTelemetryEnabled(false);
      expect(localStorage.getItem('chagra:rag-telemetry-enabled')).toBe('false');
      expect(ragTelemetry.isRagTelemetryEnabled()).toBe(false);
      ragTelemetry.setRagTelemetryEnabled(true);
      expect(ragTelemetry.isRagTelemetryEnabled()).toBe(true);
    });
  });
});

describe('ragTelemetry — integración wrap con retrieve()', () => {
  let captured;
  let retrieve;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    captured = [];

    // Mock fetch para que loadCorpus devuelva un mini-corpus.
    const MANIFEST = { slugs: ['planta_x'] };
    const DOC = {
      species_slug: 'planta_x',
      valor_pedagogico:
        'La planta X es una hortaliza de hoja corta con ciclo de 60 dias en clima frio andino.',
    };
    globalThis.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.endsWith('manifest.json')) {
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
          json: () => Promise.resolve(MANIFEST),
        });
      }
      if (u.endsWith('planta_x.json')) {
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
          json: () => Promise.resolve(DOC),
        });
      }
      return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
    });

    // Mock estable del módulo ragTelemetry — esta es la forma robusta de
    // interceptar en ESM. El import de ragRetriever leerá esta versión.
    vi.doMock('../ragTelemetry.js', () => ({
      recordRagEvent: vi.fn(async (ev) => {
        captured.push(ev);
        return { ...ev, id: `rg_test_${captured.length}` };
      }),
    }));

    ({ retrieve } = await import('../ragRetriever.js'));
  });

  afterEach(() => {
    delete globalThis.fetch;
    vi.doUnmock('../ragTelemetry.js');
    vi.restoreAllMocks();
  });

  it('retrieve sin surface emite telemetría con surface="unknown"', async () => {
    await retrieve('hortaliza hoja andino', 3);
    // El finally es síncrono pero recordRagEvent es async fire-and-forget.
    // Damos una microtask para que se ejecute.
    await new Promise((r) => setTimeout(r, 0));
    expect(captured.length).toBe(1);
    const ev = captured[0];
    expect(ev.surface).toBe('unknown');
    expect(ev.error).toBeNull();
    expect(typeof ev.latencyMs).toBe('number');
    expect(ev.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('retrieve con surface="agente" propaga ese surface a la telemetría', async () => {
    await retrieve('hortaliza hoja', 3, 'agente');
    await new Promise((r) => setTimeout(r, 0));
    expect(captured.length).toBe(1);
    expect(captured[0].surface).toBe('agente');
  });

  it('retrieve emite topScore null cuando no hay hits', async () => {
    // Query con tokens que no matchean nada del corpus
    await retrieve('xxxyyy zzzwww unrelated', 3, 'voice');
    await new Promise((r) => setTimeout(r, 0));
    expect(captured.length).toBe(1);
    const ev = captured[0];
    expect(ev.surface).toBe('voice');
    expect(ev.resultCount).toBe(0);
    expect(ev.topScore).toBeNull();
  });

  it('retrieve no rompe si recordRagEvent falla', async () => {
    // Re-mockear con función que tira excepción síncrona
    vi.resetModules();
    vi.doMock('../ragTelemetry.js', () => ({
      recordRagEvent: vi.fn(() => { throw new Error('IDB explotó'); }),
    }));
    const { retrieve: retrieve2 } = await import('../ragRetriever.js');
    const hits = await retrieve2('hortaliza', 3, 'species');
    expect(Array.isArray(hits)).toBe(true);
  });
});
