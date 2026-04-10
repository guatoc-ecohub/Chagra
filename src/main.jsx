import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { syncManager } from './services/syncManager'
import { useLogStore } from './store/useLogStore'
import { fetchFromFarmOS } from './services/apiService'
import { PRIMARY_WORKER_NAME } from './config/workerConfig'
import { renameWorker } from './services/assetService'
import { getAccessToken } from './services/authService'

// Inicializar Sync Manager para arquitectura Offline-First
syncManager.initDB().then(async () => {
  syncManager.startNetworkMonitoring();

  // Migración de identidad: ejecución única, solo si hay sesión activa.
  if (navigator.onLine && !localStorage.getItem('chagra_rename_done')) {
    getAccessToken().then((token) => {
      if (!token) return; // Sin sesión — no intentar PATCH sin auth
      renameWorker('Jimmy', PRIMARY_WORKER_NAME).then((result) => {
        if (result.success || result.error === 'not_found') {
          localStorage.setItem('chagra_rename_done', '1');
          console.info('[Migration] Renombrado completado o innecesario.');
        }
      }).catch((e) => console.warn('[Migration] Error renombrando:', e));
    }).catch(() => {}); // Token expirado — skip silencioso
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
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
