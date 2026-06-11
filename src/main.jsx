import './config/env'; // Validación de env vars al startup
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/themes.css'
import './styles/clima-atmosfera.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { syncManager } from './services/syncManager'
import { useLogStore } from './store/useLogStore'
import { fetchFromFarmOS } from './services/apiService'
import { PRIMARY_WORKER_NAME } from './config/workerConfig'
import { renameWorker } from './services/assetService'
import { getAccessToken } from './services/authService'
import {
  shouldShowUpdateBanner,
  readAckedVersion,
  seedFirstInstallAck,
} from './services/swUpdateAck'

import { loadDemoSeedData } from '../scripts/seed-demo';
import { bootstrapOssModules } from './core/bootstrap-oss';
import { loadProModules } from './core/loadProModules';

// Registro de módulos antes del primer render (ver ADR-002/ADR-011).
bootstrapOssModules();
loadProModules().then((r) => {
  if (r.loaded.length && import.meta.env.DEV) {
    console.info('[registry] módulos Pro cargados:', r.loaded);
  }
});

// Inicializar Sync Manager para arquitectura Offline-First
syncManager.initDB().then(async () => {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    await loadDemoSeedData();
  }

  syncManager.startNetworkMonitoring();

  // Migración de identidad: ejecución única, solo si hay sesión activa.
  if (navigator.onLine && !localStorage.getItem('chagra:v1:rename_done')) {
    getAccessToken().then((token) => {
      if (!token) return; // Sin sesión, no intentar PATCH sin auth
      renameWorker('Jimmy', PRIMARY_WORKER_NAME).then((result) => {
        if (result.success || result.error === 'not_found') {
          localStorage.setItem('chagra:v1:rename_done', '1');
          console.info('[Migration] Renombrado completado o innecesario.');
        }
      }).catch((e) => console.warn('[Migration] Error renombrando:', e));
    }).catch(() => { }); // Token expirado, skip silencioso
  }

  // Pull preventivo inicial de logs si hay red (ventana 30 días).
  if (navigator.onLine) {
    useLogStore.getState().pullRecentLogs(fetchFromFarmOS).catch((e) =>
      console.warn('[LogStore] Pull inicial fallido:', e)
    );
  }
}).catch(error => {
  console.error('Error inicializando Sync Manager:', error);
});

// Registrar Service Worker con espera a .ready para background sync robusto.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registrado:', registration.scope);
      })
      .catch((error) => {
        console.error('Error registrando Service Worker:', error);
      });

    // Esperar a que el SW esté activo antes de registrar background sync.
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.sync) {
        registration.sync.register('sync-pending-transactions').catch((e) => {
          console.warn('Background Sync no disponible:', e.message);
        });
      }
      console.info('[SW] Service Worker activo y listo.');
    });
  });

  // Escuchar solicitudes de sync del SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC_REQUESTED') {
      syncManager.syncAll();
    }
  });

  // Banner "nueva version disponible" SOLO cuando hay un SW nuevo en waiting
  // (registration.waiting / updatefound). NUNCA por controllerchange: ese
  // evento significa que la actualizacion YA se aplico — dispararlo ahi
  // re-mostraba el banner despues de actualizar (bug operador 2026-06-10
  // "debo dar Actualizar N veces"). El operador decide cuando actualizar
  // via UpdateAvailableBanner.
  //
  // Fix Antigravity QA #18: persistimos el ack en localStorage
  // (`sw:last-acked-version`) para no repetir el toast cada reload. Antes
  // de disparar `chagra:update-available` preguntamos al SW su CACHE_NAME
  // via MessageChannel y comparamos con el acked. Si coincide → suprimir.
  // First install (no ack previo) → suprimir tambien y sembrar el ack para
  // que la primera notif real (al actualizar) si dispare.
  const maybeDispatchUpdateAvailable = async (sw) => {
    if (!sw) return;
    try {
      const version = await getSwVersion(sw);
      if (!version) return;
      const lastAcked = readAckedVersion();
      // Seed first-install: nunca hubo ack previo → guardamos current y
      // suprimimos el toast. Asi en la proxima version real (CACHE_NAME
      // distinto) el banner si dispara.
      if (lastAcked === null) {
        seedFirstInstallAck(version);
        return;
      }
      if (shouldShowUpdateBanner(version, lastAcked)) {
        window.dispatchEvent(
          new CustomEvent('chagra:update-available', { detail: { version } })
        );
      }
    } catch (_) {
      // SW no responde / MessageChannel timeout → no spammear toast.
    }
  };

  // Patron Workbox estandar: click "Actualizar" → SKIP_WAITING → el SW nuevo
  // toma control → controllerchange → recargar la pagina UNA sola vez.
  // Guard `reloading` evita bucles de recarga; `hadController` evita recargar
  // en el primer install (clients.claim() tambien dispara controllerchange
  // cuando antes no habia controlador — ahi NO hay que recargar).
  //
  // `userUpdateRequested` (bug operador 2026-06-11, Android — boton pegado):
  // si la pagina arranco SIN controller (hard reload / carga no controlada)
  // pero hay un SW en waiting, el click "Actualizar" disparaba SKIP_WAITING
  // → claim → controllerchange, y el guard de first-install se TRAGABA el
  // evento: ni recarga ni banner fuera. Cuando la actualizacion la pidio el
  // usuario (evento chagra:sw-update-requested del banner), controllerchange
  // SIEMPRE recarga.
  let reloading = false;
  let hadController = Boolean(navigator.serviceWorker.controller);
  let userUpdateRequested = false;
  window.addEventListener('chagra:sw-update-requested', () => {
    userUpdateRequested = true;
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController && !userUpdateRequested) {
      hadController = true; // primer claim en first install — sin recarga
      return;
    }
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  // Deteccion de SW nuevo en waiting: unica fuente del banner.
  navigator.serviceWorker.ready.then((registration) => {
    // First install: sembrar el ack con la version del SW activo SIN disparar
    // banner (la actualizacion ya esta aplicada; anunciar aqui era el bug).
    const activeSw = navigator.serviceWorker.controller || registration.active;
    if (activeSw && readAckedVersion() === null) {
      getSwVersion(activeSw)
        .then((version) => { if (version) seedFirstInstallAck(version); })
        .catch(() => { });
    }
    if (registration.waiting) {
      maybeDispatchUpdateAvailable(registration.waiting);
    }
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (installing) {
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && registration.waiting) {
            maybeDispatchUpdateAvailable(registration.waiting);
          }
        });
      } else if (registration.waiting) {
        maybeDispatchUpdateAvailable(registration.waiting);
      }
    });
  });
}

// Pregunta CACHE_NAME al SW via MessageChannel con timeout corto. Devuelve
// null si no responde (no bloquear UI ni spammear toast).
function getSwVersion(sw, timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (!sw || typeof MessageChannel === 'undefined') {
      resolve(null);
      return;
    }
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      resolve(null);
    }, timeoutMs);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data?.version ?? null);
    };
    try {
      sw.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
    } catch (_) {
      clearTimeout(timer);
      channel.port1.close();
      resolve(null);
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
