import './config/env'; // Validación de env vars al startup
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/themes.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { syncManager } from './services/syncManager'
import { useLogStore } from './store/useLogStore'
import { fetchFromFarmOS } from './services/apiService'
import { PRIMARY_WORKER_NAME } from './config/workerConfig'
import { renameWorker } from './services/assetService'
import { getAccessToken } from './services/authService'

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

  // Auto-reload cuando el SW nuevo toma control (controllerchange).
  // Pattern Workbox estándar para evitar white screen post-deploy:
  //   - Si NO había controller previo, es first install (no reload)
  //   - Si HABÍA controller y cambió a otro = update real, recargar UNA VEZ
  // Sin este reload el browser puede quedarse con HTML cached que referencia
  // chunks Vite con hashes viejos que ya no existen post-deploy → todos los
  // chunks fallan → white screen (incidente 2026-05-06, ver public/sw.js).
  let initialControllerRegistered = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (initialControllerRegistered) {
      // Era un update real (no first install). Recargar para HTML fresh +
      // chunk refs nuevos.
      window.location.reload();
    } else {
      // First install. Marcamos para que próximos controllerchange sí recarguen.
      initialControllerRegistered = true;
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
