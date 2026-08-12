const CACHE = 'needle-f0-v1';
const ASSETS = [
  './',
  './index.html',
  './worker.js',
  './sw.js',
  './vendor/needle_wasm.js',
  './vendor/needle_wasm_bg.wasm',
  './weights/needle.safetensors',
  './weights/vocab.txt',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
