const CACHE_NAME = 'chagra-v128';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons.svg',
  '/favicon.svg',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activación: borra caches viejos + toma control inmediato + notifica clients
// para que recarguen (evita white screen post-deploy con chunks hash viejos).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        // Notifica a clients que hay un SW nuevo activo. El cliente decide
        // si recarga (típicamente sí, para asegurar bundle/chunks frescos).
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      })
  );
});

// Estrategia de caché:
//   - /assets/* (chunks Vite con hash en filename): PASSTHROUGH puro. Vite
//     genera nombres immutables (index-XXXXX.js); el browser HTTP cache los
//     maneja eficientemente. NUNCA interceptar en SW: si el deploy cambió
//     los hashes y el SW tiene refs viejos, intentar cargar un chunk que
//     ya no existe causa fallback a index.html (MIME text/html) → white
//     screen. Es el bug que provocó el incidente 2026-05-06.
//   - Static shell (HTML/manifest/icons): Stale-While-Revalidate
//   - Otros GET: Network-First con fallback cache
//   - POST/PUT/DELETE: pasthrough sin caché
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // PASSTHROUGH para chunks hasheados de Vite. NO interceptar.
  if (url.pathname.startsWith('/assets/')) {
    return; // browser maneja directamente
  }

  // Static shell: Stale-While-Revalidate (sirve cache rápido, refresca async)
  if (ASSETS_TO_CACHE.some(path => url.pathname === path)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const networkFetch = fetch(event.request).then(response => {
          if (event.request.method === 'GET' && response.ok) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
          }
          return response;
        }).catch(() => cachedResponse);
        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // GET (API u otros): Network-First con fallback cache
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // POST/PUT/DELETE: passthrough sin caché
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Background Sync: delegar al cliente (syncManager) vía postMessage
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-transactions') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_REQUESTED' });
        });
      })
    );
  }

  // ADR-030 Regla 8: Background Sync para voice telemetry
  // Lee IDB pending → POST a FarmOS como log--observation con category: voice_metrics
  if (event.tag === 'voice-telemetry-flush') {
    event.waitUntil(handleVoiceTelemetrySync());
  }
});

async function handleVoiceTelemetrySync() {
  const MAX_RETRIES = 5;
  const BASE_DELAY_MS = 1000;
  const MAX_DELAY_MS = 30000;

  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients.length === 0) return;

  const client = clients[0];

  try {
    client.postMessage({ type: 'VOICE_TELEMETRY_SYNC_START' });

    const events = await getPendingTelemetryEvents();
    if (!events || events.length === 0) {
      client.postMessage({ type: 'VOICE_TELEMETRY_SYNC_DONE', synced: 0 });
      return;
    }

    const payload = {
      data: {
        type: 'log--observation',
        attributes: {
          name: `Voice Telemetry Batch ${new Date().toISOString()}`,
          timestamp: new Date().toISOString().split('.')[0] + '+00:00',
          status: 'done',
          notes: `Voice telemetry batch: ${events.length} events`,
        },
        relationships: {
          category: { data: { type: 'taxonomy_term', id: 'voice_metrics' } },
        },
        metadata: {
          voice_telemetry: {
            events: events.map(e => ({
              event_type: e.event_type,
              flujo: e.flujo,
              duration_ms: e.duration_ms,
              accepted: e.accepted,
              edits: e.edits,
              connectivity: e.connectivity,
              created_at: e.created_at,
            })),
          },
        },
      },
    };

    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.api+json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const eventIds = events.map(e => e.id);
      client.postMessage({ type: 'VOICE_TELEMETRY_SYNC_DONE', synced: eventIds.length, eventIds });
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    client.postMessage({ type: 'VOICE_TELEMETRY_SYNC_ERROR', error: error.message });
    throw error;
  }
}

async function getPendingTelemetryEvents() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChagraDB', 10);

    request.onsuccess = async (event) => {
      const db = event.target.result;
      const tx = db.transaction('voice_telemetry', 'readonly');
      const store = tx.objectStore('voice_telemetry');
      const index = store.index('synced');
      const getAllRequest = index.getAll(IDBKeyRange.only(false), 50);

      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };

    request.onerror = () => reject(request.error);
  });
}

// Escuchar mensajes del cliente (solo same-origin).
self.addEventListener('message', (event) => {
  // Defensa en profundidad: aunque los SW solo reciben mensajes de clientes
  // bajo su scope, verificamos origin explicitamente para cumplir el
  // contrato de CodeQL js/missing-origin-check y bloquear cualquier
  // mensaje cross-origin que llegue via postMessage en el futuro.
  if (event.origin && event.origin !== self.location.origin) return;
  if (event.data && event.data.type === 'REGISTER_SYNC') {
    if (self.registration.sync) {
      self.registration.sync.register('sync-pending-transactions');
    }
  }

  // ADR-030 Regla 8: registrar Background Sync para voice-telemetry-flush
  if (event.data && event.data.type === 'REGISTER_VOICE_TELEMETRY_SYNC') {
    if (self.registration.sync) {
      self.registration.sync.register('voice-telemetry-flush');
    }
  }
});
