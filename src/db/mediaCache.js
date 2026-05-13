/**
 * mediaCache.js — CRUD para binarios de evidencia fotográfica (Fase 20.2).
 *
 * Implementa LRU eviction para evitar que IndexedDB crezca indefinidamente.
 * Store: media_cache (ChagraDB v5+)
 * Schema: { id (auto), logId, assetId, blob, mimeType, ai_diagnosis, createdAt, lastAccessed }
 */

import { openDB, STORES } from './dbCore';

// --- Configuration ---
const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100 MB
const EVICT_PERCENT = 0.2;
const MAX_EVICT_BATCH = 50;
const LRU_FLUSH_INTERVAL = 30_000; // 30s between DB persistence of lastAccessed

// --- Module state ---
let _initialized = false;
let _currentSize = 0;
let _lruMap = new Map();
let _dirtyIds = new Set();
let _flushTimer = null;
let _flushRunning = false;
let _pendingInit = null;

const _metrics = {
  hits: 0,
  misses: 0,
  evictions: 0,
  size: 0,
};

// --- Internal helpers ---

async function _init() {
  if (_initialized) return;
  if (_pendingInit) return _pendingInit;

  _pendingInit = (async () => {
    const db = await openDB();
    const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
    const store = tx.objectStore(STORES.MEDIA_CACHE);

    const records = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });

    _currentSize = 0;
    _lruMap = new Map();

    for (const r of records) {
      _currentSize += (r.blob && r.blob.size) || 0;
      _lruMap.set(r.id, r.lastAccessed || r.createdAt || 0);
    }

    _metrics.size = _currentSize;
    _initialized = true;
    _pendingInit = null;

    _evictIfNeeded().catch((e) =>
      console.warn('[MediaCache] Startup eviction error:', e)
    );
  })();

  return _pendingInit;
}

function _startFlushTimer() {
  if (_flushTimer) return;
  _flushTimer = setInterval(_flushDirty, LRU_FLUSH_INTERVAL);
  if (_flushTimer.unref) _flushTimer.unref();
}

function _stopFlushTimer() {
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
}

async function _flushDirty() {
  if (_flushRunning || _dirtyIds.size === 0) return;

  _flushRunning = true;
  const ids = [..._dirtyIds];
  _dirtyIds = new Set();

  try {
    const db = await openDB();
    const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
    const store = tx.objectStore(STORES.MEDIA_CACHE);

    for (const id of ids) {
      const record = await new Promise((res, rej) => {
        const req = store.get(id);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      if (record) {
        record.lastAccessed = _lruMap.get(id) || Date.now();
        store.put(record);
      }
    }
  } catch (e) {
    console.warn('[MediaCache] Error flushing LRU timestamps:', e);
  } finally {
    _flushRunning = false;
  }
}

async function _touch(ids) {
  const now = Date.now();
  ids = Array.isArray(ids) ? ids : [ids];
  for (const id of ids) {
    _lruMap.set(id, now);
  }
  for (const id of ids) {
    _dirtyIds.add(id);
  }
  _startFlushTimer();
}

async function _removeFromLRU(id) {
  _lruMap.delete(id);
  _dirtyIds.delete(id);
}

async function _evictIfNeeded(sizeLimit = DEFAULT_MAX_SIZE) {
  if (_currentSize <= sizeLimit) return 0;

  await _flushDirty();

  const sorted = [..._lruMap.entries()]
    .sort((a, b) => a[1] - b[1]);

  const toEvict = Math.max(1, Math.min(
    Math.ceil(sorted.length * EVICT_PERCENT),
    MAX_EVICT_BATCH
  ));

  const evictIds = new Set(sorted.slice(0, toEvict).map(([id]) => id));

  const db = await openDB();
  const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
  const store = tx.objectStore(STORES.MEDIA_CACHE);

  let evicted = 0;
  await new Promise((resolve, reject) => {
    const req = store.openCursor();
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) { resolve(); return; }
      if (evictIds.has(cursor.value.id)) {
        _currentSize -= (cursor.value.blob && cursor.value.blob.size) || 0;
        _removeFromLRU(cursor.value.id);
        cursor.delete();
        evicted++;
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });

  if (evicted > 0) {
    _metrics.evictions += evicted;
    _metrics.size = _currentSize;
    console.info(
      `[MediaCache] Evicted ${evicted} items (cache ${(_currentSize / 1024 / 1024).toFixed(1)}MB / ${(sizeLimit / 1024 / 1024).toFixed(0)}MB max)`
    );
  }

  return evicted;
}

// --- Public API ---

export const mediaCache = {
  async save(logId, blob, options = {}) {
    const { mimeType = 'image/webp', assetId = null, ai_diagnosis = null } = typeof options === 'string' ? { mimeType: options } : options;
    await _init();

    const db = await openDB();
    const now = Date.now();

    const record = {
      logId,
      assetId,
      blob,
      mimeType,
      ai_diagnosis,
      createdAt: now,
      lastAccessed: now,
    };

    const id = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const store = tx.objectStore(STORES.MEDIA_CACHE);
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    });

    _currentSize += blob.size || 0;
    _metrics.size = _currentSize;
    _lruMap.set(id, now);

    _evictIfNeeded().catch((e) =>
      console.warn('[MediaCache] Eviction error:', e)
    );

    return id;
  },

  async updateDiagnosis(id, diagnosis) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const store = tx.objectStore(STORES.MEDIA_CACHE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.ai_diagnosis = diagnosis;
          store.put(record);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getByAssetId(assetId) {
    await _init();
    const db = await openDB();
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
      const index = tx.objectStore(STORES.MEDIA_CACHE).index('assetId');
      const request = index.getAll(IDBKeyRange.only(assetId));
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a, b) => b.createdAt - a.createdAt);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });

    _metrics.hits += records.length;
    if (records.length > 0) {
      _touch(records.map((r) => r.id));
    }

    return records;
  },

  async getByLogId(logId) {
    await _init();
    const db = await openDB();
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
      const index = tx.objectStore(STORES.MEDIA_CACHE).index('logId');
      const request = index.getAll(IDBKeyRange.only(logId));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    _metrics.hits += records.length;
    if (records.length > 0) {
      _touch(records.map((r) => r.id));
    }

    return records;
  },

  async countByLogId(logId) {
    await _init();
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
      const index = tx.objectStore(STORES.MEDIA_CACHE).index('logId');
      const request = index.count(IDBKeyRange.only(logId));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async remove(id) {
    await _init();
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const store = tx.objectStore(STORES.MEDIA_CACHE);

      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          _currentSize -= (getReq.result.blob && getReq.result.blob.size) || 0;
          _metrics.size = _currentSize;
          _removeFromLRU(id);
        }
        store.delete(id);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async removeByLogId(logId) {
    await _init();
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const store = tx.objectStore(STORES.MEDIA_CACHE);
      const index = store.index('logId');
      const cursorReq = index.openCursor(IDBKeyRange.only(logId));
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          _currentSize -= (cursor.value.blob && cursor.value.blob.size) || 0;
          _removeFromLRU(cursor.value.id);
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => {
        _metrics.size = _currentSize;
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  async purgeStale(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    await _init();
    const db = await openDB();
    const cutoff = Date.now() - maxAgeMs;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const store = tx.objectStore(STORES.MEDIA_CACHE);
      const index = store.index('createdAt');
      const range = IDBKeyRange.upperBound(cutoff);
      const cursorReq = index.openCursor(range);
      let purged = 0;
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          _currentSize -= (cursor.value.blob && cursor.value.blob.size) || 0;
          _removeFromLRU(cursor.value.id);
          cursor.delete();
          purged++;
          cursor.continue();
        }
      };
      tx.oncomplete = () => {
        _metrics.size = _currentSize;
        if (purged > 0) console.info(`[MediaCache] Purgados ${purged} binarios > 7 días.`);
        resolve(purged);
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * getMetrics — expone métricas de la cache para telemetry.
   * @returns {{ cacheSize: number, hits: number, misses: number, evictions: number }}
   */
  getMetrics() {
    return {
      cacheSize: _currentSize,
      hits: _metrics.hits,
      misses: _metrics.misses,
      evictions: _metrics.evictions,
    };
  },

  /**
   * checkQuota — verifica y evicta si se excede el límite. Llamar en startup.
   * @param {number} sizeLimit - tamaño máximo en bytes (default 100MB)
   * @returns {Promise<number>} cantidad de items evictados
   */
  async checkQuota(sizeLimit = DEFAULT_MAX_SIZE) {
    await _init();
    return _evictIfNeeded(sizeLimit);
  },
};

// Clean up timer on hot-reload
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    _stopFlushTimer();
  });
}
