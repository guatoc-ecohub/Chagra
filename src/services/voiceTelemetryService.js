/**
 * voiceTelemetryService.js — Telemetría de voz via IndexedDB.
 *
 * ADR-030 Regla 8: NO localStorage para telemetría voz (bloqueante sincrónico,
 * sin SW access, cuotas mínimas). Usa IndexedDB con Background Sync API.
 *
 * Privacy (ADR-030 Regla 9):
 * - Eventos anónimos (sin user_id, sin coords precisas)
 * - NO audio en eventos
 * - NO transcripciones literales
 */

import { openDB, STORES } from '../db/dbCore.js';

const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `vt_${timestamp}${random}`;
};

export const recordEvent = async ({ event_type, flujo, duration_ms, accepted, edits, connectivity }) => {
  const db = await openDB();
  const tx = db.transaction(STORES.VOICE_TELEMETRY, 'readwrite');
  const store = tx.objectStore(STORES.VOICE_TELEMETRY);

  const event = {
    id: generateId(),
    event_type,
    flujo,
    duration_ms: duration_ms ?? null,
    accepted: accepted ?? null,
    edits: edits ?? null,
    connectivity: connectivity ?? null,
    created_at: new Date().toISOString(),
    synced: false,
  };

  store.add(event);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(event);
    tx.onerror = () => reject(tx.error);
  });
};

export const getPendingEvents = async (limit = 50) => {
  const db = await openDB();
  const tx = db.transaction(STORES.VOICE_TELEMETRY, 'readonly');
  const store = tx.objectStore(STORES.VOICE_TELEMETRY);

  const index = store.index('synced');
  const request = index.getAll(IDBKeyRange.only(false), limit);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const markSynced = async (eventIds) => {
  if (!eventIds || eventIds.length === 0) return;

  const db = await openDB();
  const tx = db.transaction(STORES.VOICE_TELEMETRY, 'readwrite');
  const store = tx.objectStore(STORES.VOICE_TELEMETRY);

  for (const id of eventIds) {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const event = getRequest.result;
      if (event) {
        event.synced = true;
        event.synced_at = new Date().toISOString();
        store.put(event);
      }
    };
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllEvents = async (limit = 1000) => {
  const db = await openDB();
  const tx = db.transaction(STORES.VOICE_TELEMETRY, 'readonly');
  const store = tx.objectStore(STORES.VOICE_TELEMETRY);

  const index = store.index('created_at');
  const request = index.openCursor(null, 'prev', limit);

  const events = [];
  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        events.push(cursor.value);
        cursor.continue();
      } else {
        resolve(events);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const getMetrics = async () => {
  const events = await getAllEvents();

  const voiceCaptureStart = events.filter(e => e.event_type === 'voice_capture_start').length;
  const voiceCaptureComplete = events.filter(e => e.event_type === 'voice_capture_complete').length;
  const voiceCaptureAbort = events.filter(e => e.event_type === 'voice_capture_abort').length;

  const extractionSuccess = events.filter(e => e.event_type === 'voice_extraction_success').length;
  const extractionFail = events.filter(e => e.event_type === 'voice_extraction_fail').length;

  const manualFormSubmit = events.filter(e => e.event_type === 'manual_form_submit').length;

  const connectivityOnline = events.filter(e => e.connectivity === 'online').length;
  const connectivityOffline = events.filter(e => e.connectivity === 'offline').length;

  const totalPending = events.filter(e => !e.synced).length;

  const flujos = {};
  for (const e of events) {
    if (e.flujo) {
      flujos[e.flujo] = (flujos[e.flujo] || 0) + 1;
    }
  }

  return {
    total_events: events.length,
    pending_sync: totalPending,
    voice_capture: {
      start: voiceCaptureStart,
      complete: voiceCaptureComplete,
      abort: voiceCaptureAbort,
    },
    extraction: {
      success: extractionSuccess,
      fail: extractionFail,
    },
    manual_form_submit: manualFormSubmit,
    connectivity: {
      online: connectivityOnline,
      offline: connectivityOffline,
    },
    flujos,
  };
};

export const clearSyncedEvents = async (olderThanDays = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const cutoffISO = cutoff.toISOString();

  const db = await openDB();
  const tx = db.transaction(STORES.VOICE_TELEMETRY, 'readwrite');
  const store = tx.objectStore(STORES.VOICE_TELEMETRY);

  const index = store.index('synced');
  const request = index.openCursor(IDBKeyRange.only(true));

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const e = cursor.value;
        if (e.synced_at && e.synced_at < cutoffISO) {
          store.delete(e.id);
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};