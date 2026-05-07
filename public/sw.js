const CACHE_NAME = 'chagra-v94';
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
});

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
});
