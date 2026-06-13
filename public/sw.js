const CACHE_NAME = 'chagra-v308';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons.svg',
  '/favicon.svg',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
  // Catálogo de especies (sqlite-wasm). Precacheado para que el catálogo sea
  // consultable OFFLINE aunque el usuario nunca haya abierto una vista que lo
  // cargue estando online. ~1.2 MB; aceptable para garantizar offline-first.
  '/catalog.sqlite'
];

// Instalación del Service Worker.
// SIN self.skipWaiting() automático: el SW nuevo queda en `waiting` para que
// el cliente muestre el banner "nueva versión disponible" y el operador
// decida cuándo actualizar. El skipWaiting solo ocurre vía mensaje
// SKIP_WAITING (click "Actualizar" en UpdateAvailableBanner). Con el
// auto-skip el SW activaba solo, controllerchange disparaba el banner
// DESPUÉS de aplicada la actualización y el operador debía dar "Actualizar"
// N veces (bug 2026-06-10).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        // 1) Shell estático (HTML/manifest/icons/catálogo). add por item (no
        //    addAll atómico) para que un 404 transitorio de un asset opcional
        //    (ej. /catalog.sqlite) no aborte el precache completo del shell.
        await Promise.all(
          ASSETS_TO_CACHE.map((u) => cache.add(u).catch(() => undefined))
        );
        // 2) Bundle de arranque: parseamos index.html para descubrir los chunks
        //    de entrada hasheados (`/assets/index-*.js`, rolldown-runtime,
        //    vendor-react/state, css) y los precacheamos. Sin esto, una recarga
        //    OFFLINE en frío no podía bootear React (los <script> de /assets/*
        //    daban ERR_INTERNET_DISCONNECTED). El resto de chunks lazy se cachea
        //    on-demand vía la estrategia cache-first del handler de fetch.
        try {
          const res = await fetch('/index.html', { cache: 'no-store' });
          if (res && res.ok) {
            const html = await res.text();
            const assetRe = /\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g;
            const found = Array.from(new Set(html.match(assetRe) || []));
            // addAll es atómico (falla todo si uno falla); usamos add por chunk
            // para que un 404 transitorio de un chunk no aborte el precache del
            // resto del bundle de arranque.
            await Promise.all(
              found.map((u) => cache.add(u).catch(() => undefined))
            );
          }
        } catch {
          // Sin red en el install (raro): el shell quedó cacheado igual; los
          // chunks se llenarán cache-first en la primera carga online.
        }
      })
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
      // La limpieza de caches viejos NUNCA debe bloquear el claim: si falla
      // (cuota/storage en Android), sin claim() no hay controllerchange y el
      // boton "Actualizar" del banner queda pegado (bug operador 2026-06-11).
      .catch(() => undefined)
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        // Notifica a clients que hay un SW nuevo activo. El cliente decide
        // si recarga (típicamente sí, para asegurar bundle/chunks frescos).
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      })
      .catch(() => undefined)
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

  // Chunks hasheados de Vite (`/assets/index-XXXX.js`, vendors, lazy chunks,
  // CSS): CACHE-FIRST con relleno en background.
  //
  // ANTES esto era PASSTHROUGH puro (return; sin cachear). Consecuencia: en una
  // recarga OFFLINE el shell `/index.html` cargaba del cache, pero TODOS los
  // <script>/<link> que referencia apuntan a `/assets/*` → el browser intenta
  // bajarlos de la red → `net::ERR_INTERNET_DISCONNECTED` → React NUNCA monta →
  // pantalla en blanco / splash colgado. La PWA NO arrancaba offline en frío.
  // (Evidencia E2E offline-first 2026-06-13: 0/113 chunks cacheados; reload
  // offline = blank. El guard offline del agente quedaba además inalcanzable
  // porque su chunk lazy tampoco se cacheaba.)
  //
  // El motivo histórico del passthrough (servir chunks viejos tras deploy →
  // 404 → white screen, incidente 2026-05-06) NO aplica con cache-first sobre
  // filenames inmutables: cada deploy genera hashes nuevos, el HTML fresco
  // (Network-First más abajo) referencia los nuevos, y el `activate` borra el
  // cache viejo entero al bumpear CACHE_NAME (chagra-<sha> por deploy). Un chunk
  // cacheado solo se sirve si su URL exacta (con hash) sigue referenciada.
  if (url.pathname.startsWith('/assets/') && event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            // Solo cacheamos respuestas completas y válidas (no opaque/parcial).
            if (response && response.ok && response.status === 200) {
              const respClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
            }
            return response;
          })
          // Offline y sin cache: devolvemos un 504 explícito en vez de dejar
          // que el browser tire ERR_INTERNET_DISCONNECTED silencioso. El chunk
          // ya cacheado (caso normal tras una visita online) sí se sirve arriba.
          .catch(() => new Response('', { status: 504, statusText: 'Offline: chunk no cacheado' }));
      })
    );
    return;
  }

  // HTML shell (documento navegable: `/`, `/index.html`, o cualquier navegación
  // SPA): NETWORK-FIRST. Un deploy nuevo SIEMPRE entrega el index.html fresco
  // (que referencia el bundle vivo); sólo cae al cache si el dispositivo está
  // OFFLINE. Antes el HTML usaba Stale-While-Revalidate → servía un index.html
  // cacheado de ANTES del deploy, apuntando a un bundle con hash que ya no
  // existe → <script> 404 → pantalla en blanco (incidente 2026-06-05). El
  // Network-First mata toda esa clase de "no carga tras deploy".
  const isHtmlDoc =
    event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html';
  if (isHtmlDoc && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/index.html', respClone));
          }
          return response;
        })
        // Offline: cae al index.html cacheado (shell) para que la SPA arranque.
        .catch(() => caches.match(event.request).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  // Resto del static shell NO-HTML (manifest, iconos): Stale-While-Revalidate
  // (no referencian hashes de bundle, así que un cache viejo no rompe nada).
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

  // SKIP_WAITING: el cliente (UpdateAvailableBanner) lo manda cuando el
  // usuario click "Actualizar". Activa el SW en waiting → dispara
  // controllerchange → el cliente recarga (window.location.reload()).
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // GET_VERSION: el cliente pregunta la version del SW activo para
  // comparar con `sw:last-acked-version` en localStorage y decidir si
  // mostrar el banner "nueva version disponible". Respondemos por
  // MessageChannel (event.ports[0]) para evitar broadcast a otros clients.
  // Fix Antigravity QA #18.
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'VERSION', version: CACHE_NAME });
    }
  }
});

// FEAT-B #293: push notifications proactivas. Cuando el sidecar dispatcha
// payload via web-push, este handler muestra la notification en el OS.
// click → openWindow al AgentScreen con prefill si el payload trae uno.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Chagra', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Chagra';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'chagra-notif',
    requireInteraction: payload.severity === 'critical',
    data: {
      url: payload.url || '/',
      prefill: payload.prefill || null,
      ts: Date.now(),
    },
    vibrate: payload.severity === 'critical' ? [200, 100, 200, 100, 200] : [100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  event.waitUntil((async () => {
    if (data.prefill) {
      try {
        const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of cs) {
          client.postMessage({ type: 'NOTIF_PREFILL', prefill: data.prefill });
        }
      } catch { /* ignore */ }
    }
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
