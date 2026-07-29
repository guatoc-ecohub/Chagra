const SW_BUILD_SHA = '__CHAGRA_SW_BUILD_SHA__';
const CACHE_NAME =
  SW_BUILD_SHA && !SW_BUILD_SHA.startsWith('__CHAGRA_')
    ? `chagra-${SW_BUILD_SHA}`
    : 'chagra-dev';

// Cache de GROUNDING del agente (corpus RAG + embeddings + tiles del mapa).
// SEPARADO de CACHE_NAME a propósito: su contenido NO está hasheado por
// filename (las fichas son `/cycle-content/<slug>.json`, los tiles
// `/{z}/{x}/{y}.png`) y cambia con baja frecuencia. Si viviera en CACHE_NAME,
// cada deploy (que bumpea CACHE_NAME por SHA) borraría el corpus entero y la
// PRIMERA recarga offline post-deploy se quedaría SIN grounding hasta volver a
// estar online. Al aislarlo, el grounding sobrevive a los deploys del bundle.
// La invalidación del corpus se maneja por separado (versión del manifest), no
// por SHA del bundle. Ver migración de versión en RAG_GROUNDING_PREFIX.
const RAG_GROUNDING_PREFIX = 'chagra-rag-grounding-';
const RAG_GROUNDING_CACHE = `${RAG_GROUNDING_PREFIX}v1`;

// Tiles de mapa (Leaflet/OpenStreetMap): cache-on-use en su propio bucket.
// No se precachean (son ilimitados); se cachean SOLO los que el usuario ya
// vio online, para que el mapa funcione offline en zonas ya visitadas.
const MAP_TILES_PREFIX = 'chagra-map-tiles-';
const MAP_TILES_CACHE = `${MAP_TILES_PREFIX}v1`;
// Tope defensivo de tiles cacheados (LRU aproximado por orden de inserción):
// evita que el cache de tiles crezca sin límite en un teléfono rural. ~400
// tiles ≈ varios MB, suficiente para varias zonas de finca a distintos zooms.
const MAP_TILES_MAX = 400;
// Dominios de tiles que cacheamos. OSM y su alias osm.org (ver FarmMap,
// MapPicker, LocationDetectedScreen, MultiFincaGlobe).
const MAP_TILE_HOSTS = ['tile.openstreetmap.org', 'tile.osm.org', 'tile.opentopomap.org'];

// Imágenes de referencia por especie, llenadas on-demand por
// speciesImageService desde GBIF/Wikimedia. Se conservan entre deploys para que
// la ficha siga mostrando la foto ya vista cuando la finca queda sin señal.
const SPECIES_IMAGE_CACHE = 'chagra-species-images-v1';

// Modo campo / wake-word "hola chagra" (#2088): TF.js self-hosted +
// modelo base speech-commands + ejemplos "hola chagra" (~6 MB en total).
// CACHE-ON-USE (NO precache en install): la feature se shippa "dark"
// (VITE_MODO_CAMPO=false en prod) y este archivo SW es el MISMO para todos
// los builds — un precache incondicional le cobraría ~6 MB de descarga en
// el install a CADA usuaria, incluso las que nunca activan modo campo. En
// vez de eso, la primera vez que el operador activa el modo campo (online)
// estos archivos se cachean cache-first (mismo patrón que MAP_TILES_CACHE/
// SPECIES_IMAGE_CACHE); de ahí en adelante — incluida offline — cargan del
// cache. Bump el sufijo de versión si el modelo/lib cambia de contenido.
const WAKE_WORD_CACHE = 'chagra-wake-word-v1';
const WAKE_WORD_PATH_PREFIXES = ['/vendor/tfjs/', '/vendor/speech-commands/', '/models/speech-commands/', '/models/hola-chagra/'];

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
  '/catalog.sqlite',
  // Video-manuales del curso "Aprende a usar Chagra" (#2079): HTML animado
  // autocontenido (~150 KB c/u, fuentes embebidas en base64). ANTES no
  // estaban en ningún precache: el iframe de VideoManual.jsx solo los
  // cacheaba en background la PRIMERA vez que alguien tocaba "reproducir"
  // (rama Network-First genérica del handler de fetch, más abajo). Si esa
  // primera vez ocurría SIN señal (el caso típico rural que este curso está
  // pensado para resolver), el fetch fallaba, el cache-miss no tenía nada
  // que servir, y el iframe quedaba en blanco — bug reportado 2026-07-05.
  // Precachearlos en install (igual que catalog.sqlite) garantiza que el
  // video se vea la primera vez que se abre el curso, con o sin red.
  '/manual/mv-siembra.html',
  '/manual/mv-voz-registro.html',
  '/manual/mv-milpa.html',
  '/manual/mv-sipsa.html'
];

// Grounding precache en install: solo assets livianos esenciales para que el
// agente funcione offline sin red (grafo de conocimiento, ~163 KB). Los assets
// PESADOS (rag-embeddings.json ~1.7MB, cycle-content/ ~3.4MB sumando fichas) se
// cargan la PRIMERA VEZ que se usan (cache-on-use, ver fetch handler abajo) y NO
// se precachean en install — su primer fetch ocurre cuando el usuario realmente
// hace búsqueda semántica o abre una ficha de cultivo, no en el arranque.
//   - rag-embeddings.json: antes precacheado ~1.7MB. Se usa <10% de sesiones
//     (el agente responde sin RAG la mayor parte del tiempo). Pasar a
//     cache-on-use reduce el install-time ~1.7MB y el budget del gate.
//   - cycle-content/manifest.json + /cycle-content/<slug>.json (~3.4MB total):
//     se llenan cache-first vía prewarmCorpus al login — el manifest es liviano
//     (~13 KB) pero sin él, loadCorpus cae al fallback legacy. Se mantiene
//     cache-on-use: loadCorpus lo fetchea al montar el dashboard.
const RAG_GROUNDING_PRECACHE = [
  // grafo-relations.json (~66 KB): relaciones del grafo de conocimiento
  // (plaga→controlador, compatibles, antagonistas, biopreparados, vernáculos)
  // por especie del catálogo. Cierra el "invisible offline": antes el cliente
  // sin red sólo veía el catálogo estático y NO estas aristas. Generado en
  // build/ops por chagra-pro/scripts/export-grafo-offline.mjs. Se cachea en
  // RAG_GROUNDING_CACHE (sobrevive deploys; cache-first; degrada a 504).
  '/grafo-relations.json',
];

// Instalación del Service Worker.
// El SW nuevo se salta `waiting` de forma intencional: una vez descargado debe
// activar, limpiar caches viejos y tomar control sin depender de que el usuario
// pulse el banner. El cliente conserva el guard de recarga única en
// `controllerchange`, así que first-install no se recarga y updates reales sí.
self.addEventListener('install', (event) => {
  self.skipWaiting();
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
      // 3) Grounding del agente: precache de embeddings + manifest en su bucket
      //    separado (RAG_GROUNDING_CACHE). NO bloquea el shell — corre después y
      //    los errores son tolerados (add por item con catch). Las 491 fichas NO
      //    se precachean aquí (peso + 491 sockets en install); se llenan
      //    cache-first cuando prewarmCorpus las pide al login. Ver fetch handler.
      .then(() =>
        caches.open(RAG_GROUNDING_CACHE).then((groundingCache) =>
          Promise.all(
            RAG_GROUNDING_PRECACHE.map((u) => groundingCache.add(u).catch(() => undefined))
          )
        )
      )
      .catch(() => undefined)
  );
});

// Activación: borra caches viejos + toma control inmediato + notifica clients
// para que recarguen (evita white screen post-deploy con chunks hash viejos).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.map(cacheName => {
          // Conservar SIEMPRE el bucket actual de grounding (corpus/embeddings)
          // y el de tiles del mapa: no están versionados por SHA del bundle, así
          // que un deploy NO debe purgarlos (si no, la primera recarga offline
          // post-deploy queda sin grounding ni mapa). Solo borramos versiones
          // VIEJAS de esos buckets (prefijo + versión distinta) y el CACHE_NAME
          // anterior.
          if (cacheName === CACHE_NAME) return undefined;
          if (cacheName === RAG_GROUNDING_CACHE) return undefined;
          if (cacheName === MAP_TILES_CACHE) return undefined;
          if (cacheName === SPECIES_IMAGE_CACHE) return undefined;
          if (cacheName === WAKE_WORD_CACHE) return undefined;
          // Versiones viejas de los buckets de grounding/tiles → borrar.
          // El resto (CACHE_NAME viejo, caches huérfanos) → borrar.
          return caches.delete(cacheName);
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

  // Grounding del agente (corpus RAG + embeddings): CACHE-FIRST con relleno en
  // background, en el bucket separado RAG_GROUNDING_CACHE.
  //   - /cycle-content/<slug>.json  (491 fichas + manifest.json)
  //   - /rag-embeddings.json        (vectores semánticos)
  // Cache-first porque el contenido cambia con baja frecuencia y la latencia
  // móvil rural penaliza una revalidación de red por cada ficha. La primera
  // visita ONLINE (prewarmCorpus al login fetchea las 491 fichas en lotes) las
  // deja todas en cache; a partir de ahí una recarga OFFLINE en frío tiene el
  // corpus completo y el agente conserva grounding sin señal. Esto cierra el
  // hueco: antes corpusCache vivía solo en memoria y el SW no cacheaba estas
  // rutas → recarga offline = agente sin grounding (degradaba a respuesta sin
  // contexto). Un slug nuevo tras un deploy del corpus se baja la primera vez
  // que se lo pide estando online (cache-miss → fetch → put).
  //   - /veredas/<codDANE>.json     (polígonos DANE de veredas por municipio,
  //     reescritura onboarding 2026-07: cache-on-use — se baja SOLO el archivo
  //     del municipio del usuario la primera vez online y de ahí en adelante el
  //     picker de veredas y el point-in-polygon funcionan offline. En el bucket
  //     grounding a propósito: sobrevive deploys igual que el corpus.)
  const isGrounding =
    url.pathname.startsWith('/cycle-content/') ||
    url.pathname.startsWith('/veredas/') ||
    url.pathname === '/rag-embeddings.json' ||
    url.pathname === '/grafo-relations.json';
  if (isGrounding && event.request.method === 'GET') {
    event.respondWith(
      caches.open(RAG_GROUNDING_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request)
            .then((response) => {
              if (response && response.ok && response.status === 200) {
                cache.put(event.request, response.clone());
              }
              return response;
            })
            // Offline y sin cache: 504 explícito. El caller (loadSlugDocs /
            // loadEmbeddings) ya degrada con gracia ante !ok (devuelve []/null).
            .catch(() => new Response('', { status: 504, statusText: 'Offline: grounding no cacheado' }));
        })
      )
    );
    return;
  }

  // Catálogo de especies (`/catalog.sqlite`, ~1.2 MB): CACHE-FIRST en CACHE_NAME.
  //
  // ANTES caía en la rama Stale-While-Revalidate del shell estático (más abajo,
  // `ASSETS_TO_CACHE.some(...)`): servía el blob cacheado PERO disparaba un
  // `fetch` en background en CADA carga → re-descarga de 1.2 MB por load
  // (el server lo sirve con `cache-control: no-store` → cf-cache-status DYNAMIC,
  // sin HTTP cache). Ese fetch de 1.2 MB en vuelo es además el que se ABORTA
  // (net::ERR_ABORTED → "Failed to fetch") cuando un SW nuevo hace clients.claim()
  // y el cliente recarga vía controllerchange durante el arranque.
  //
  // Cache-first lo arregla de raíz: se sirve desde caché sin tocar la red (el
  // header `no-store` del server es irrelevante para la estrategia del SW), así
  // que se re-baja UNA sola vez por deploy (cache-miss tras el bump de
  // CACHE_NAME) y luego es instantáneo y offline. El blob ya se precachea en
  // install (ASSETS_TO_CACHE); si ese precache falló (404 transitorio / offline),
  // el primer cache-miss lo rellena en background. Versionado por CACHE_NAME:
  // un deploy bumpea el SHA y `activate` borra el bucket viejo, forzando la
  // re-descarga del catálogo fresco una vez.
  if (url.pathname === '/catalog.sqlite' && event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request)
            .then((response) => {
              if (response && response.ok && response.status === 200) {
                cache.put(event.request, response.clone());
              }
              return response;
            })
            // Offline y sin cache: 504 explícito. corpusLoader.loadCatalogBuffer
            // degrada con gracia (el preload en App.jsx loguea warn y los
            // componentes reintentan al usar el catálogo).
            .catch(() => new Response('', { status: 504, statusText: 'Offline: catálogo no cacheado' }));
        })
      )
    );
    return;
  }

  // Tiles de mapa (OSM/OpenTopoMap): CACHE-FIRST cache-on-use en MAP_TILES_CACHE.
  // No se precachean (son ilimitados); se guardan SOLO los tiles que el usuario
  // ya cargó online, para que el mapa funcione offline en zonas ya visitadas.
  // Cross-origin → respuestas opaque (no inspeccionables): las cacheamos igual
  // (un tile opaque renderiza bien en <img>/Leaflet) pero aplicamos un tope LRU
  // aproximado para no llenar el storage del teléfono. Si no hay red ni cache,
  // dejamos que falle (Leaflet ya muestra su placeholder; NO rompemos el mapa).
  if (
    event.request.method === 'GET' &&
    MAP_TILE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))
  ) {
    event.respondWith(
      caches.open(MAP_TILES_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request)
            .then((response) => {
              // Cacheamos 200 (same-origin imposible aquí) y opaque (status 0,
              // type 'opaque') — ambos sirven para pintar el tile offline.
              if (response && (response.ok || response.type === 'opaque')) {
                cache.put(event.request, response.clone());
                trimTileCache(cache);
              }
              return response;
            })
            // Sin red ni cache: propagamos el fallo de red para que Leaflet
            // muestre su placeholder. NUNCA un 504 sintético (rompería el tile).
            .catch(() => cached || Response.error());
        })
      )
    );
    return;
  }

  // Imágenes GBIF/Wikimedia ya vistas: CACHE-FIRST desde el bucket que llena
  // speciesImageService. Si el usuario abrió una especie online, la misma foto
  // puede renderizar offline después. En cache-miss no guardamos aquí para no
  // cachear cualquier imagen externa de la app; solo servimos lo que el
  // pipeline curado ya decidió guardar con licencia abierta.
  if (event.request.method === 'GET' && event.request.destination === 'image') {
    event.respondWith(
      caches.open(SPECIES_IMAGE_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).catch(() => Response.error());
        })
      )
    );
    return;
  }

  // Modo campo / wake-word (#2088): CACHE-FIRST cache-on-use, ver comentario
  // de WAKE_WORD_CACHE arriba. La PRIMERA activación (online) llena el
  // cache; después — incluida offline — sirve de ahí. Sin precache en
  // install: los usuarios que nunca activan el modo campo no pagan este peso.
  if (event.request.method === 'GET' && WAKE_WORD_PATH_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      caches.open(WAKE_WORD_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request)
            .then((response) => {
              if (response && response.ok) cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => new Response('', { status: 504, statusText: 'Offline: modo campo no cacheado aún' }));
        })
      )
    );
    return;
  }

  // Manifest de versión (`/version.json`): NETWORK-ONLY, sin cachear NUNCA.
  // Lo consume el self-heal (versionCheck.js) para detectar que el cliente
  // corre un bundle viejo. Si lo cacheáramos, el chequeo compararía contra una
  // copia vieja y el cliente stale NUNCA se auto-recuperaría (justo el bug que
  // este archivo resuelve). El cliente ya pide `cache: 'no-store'`; acá lo
  // reforzamos a nivel SW. Si la red falla, devolvemos un 504 sintético: el
  // self-heal trata "sin respuesta" como no-op (offline-first), no rompe nada.
  if (url.pathname === '/version.json' && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(
        () => new Response('', { status: 504, statusText: 'Offline: version.json' })
      )
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
    // Fallback unificado al shell cacheado: el index.html exacto, y si no, el
    // genérico. La SPA monta y rutea client-side. Si tampoco hay shell (primer
    // arranque offline en frío, sin install previo), devolvemos un 503 con un
    // mensaje claro en vez de dejar que el browser tire "failed to fetch" /
    // pantalla en blanco — el documento navegable NUNCA debe quedar sin
    // respuesta (raíz del "failed to fetch" engañoso del prod-down 2026-06-18).
    // Shell de último recurso (solo si NI hay red NI shell cacheado). El SW es
    // un worker standalone: NO puede importar src/config/messages.js (ADR-050
    // i18n), así que este copy degradado va inline. La app real ya usa
    // messages.js; este HTML solo se ve en el primer arranque sin señal.
    /* eslint-disable chagra-i18n/no-hardcoded-spanish */
    const OFFLINE_SHELL_HTML =
      '<!doctype html><meta charset="utf-8"><title>Chagra</title>' +
      '<body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;' +
      'display:flex;min-height:100vh;align-items:center;justify-content:center;' +
      'text-align:center;padding:2rem"><div><h1>Sin conexión</h1>' +
      '<p>Chagra necesita una primera carga con internet. Vuelve a intentar ' +
      'cuando tengas señal.</p></div></body>';
    /* eslint-enable chagra-i18n/no-hardcoded-spanish */
    const navFallback = () =>
      caches.match(event.request)
        .then(c => c || caches.match('/index.html'))
        .then(c => c || new Response(
          OFFLINE_SHELL_HTML,
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        ));
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Solo cacheamos y servimos respuestas OK. Un 5xx del origen (502/503
          // de cloudflared/Drupal) NO debe pintarse como "pantalla rota": caemos
          // al shell cacheado, que arranca la SPA y deja reintentar.
          if (response && response.ok) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/index.html', respClone));
            return response;
          }
          return navFallback();
        })
        // Offline / red caída: cae al index.html cacheado (shell). Nunca lanza.
        .catch(navFallback)
    );
    return;
  }

  // Resto del static shell NO-HTML (manifest, iconos): Stale-While-Revalidate
  // (no referencian hashes de bundle, así que un cache viejo no rompe nada).
  // `/` e `/index.html` ya se sirvieron arriba (Network-First) y
  // `/catalog.sqlite` arriba (Cache-First), así que aquí solo caen los assets
  // ligeros del shell para los que revalidar en background es barato.
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
    // Tarea #8 fix: abrir SIN versión. El SW no puede importar dbCore (DB_VERSION
    // avanza con cada migración), y pasar una versión hardcodeada (antes: 10)
    // menor a la actual hace que indexedDB.open lance VersionError → esta función
    // SIEMPRE fallaba. Abrir sin versión devuelve la DB en su versión vigente,
    // sea cual sea, sin disparar un upgrade.
    const request = indexedDB.open('ChagraDB');

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

// Poda LRU aproximada del cache de tiles: si supera MAP_TILES_MAX, borra los
// más viejos (las keys de un Cache se devuelven en orden de inserción, así que
// `keys()[0..N]` son los primeros guardados ≈ los menos recientes). No es un
// LRU exacto (no reordena por acceso), pero acota el storage sin coste por hit.
// Fire-and-forget: nunca bloquea ni rompe la respuesta del tile.
async function trimTileCache(cache) {
  try {
    const keys = await cache.keys();
    const excess = keys.length - MAP_TILES_MAX;
    if (excess > 0) {
      await Promise.all(keys.slice(0, excess).map((k) => cache.delete(k)));
    }
  } catch {
    // storage/quota: ignorar — el tope es defensivo, no crítico.
  }
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
