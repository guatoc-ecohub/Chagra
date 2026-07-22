/**
 * main-prod.jsx — Entry point de prod.chagra.app (3D-first).
 *
 * Mismo offline-first core que main.jsx (syncManager, SW, auth, módulos),
 * pero monta ProdChagraApp en vez de App con el router data-driven.
 */
import './config/env';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ProdChagraApp from './prodApp/ProdChagraApp.jsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ModoCampoProvider } from './hooks/ModoCampoContext';
import { syncManager } from './services/syncManager';
import { useLogStore } from './store/useLogStore';
import { fetchFromFarmOS } from './services/apiService';
import { PRIMARY_WORKER_NAME, LEGACY_WORKER_NAME } from './config/workerConfig';
import { renameWorker } from './services/assetService';
import { getAccessToken } from './services/authService';
import { registerServiceWorker } from './services/swRegistration';
import { runSelfHealCheck, installBundleRecoveryGuards, RUNNING_BUILD_SHA } from './services/versionCheck';
import { runCanonicalHostRedirectGuard } from './services/canonicalHostRedirect';
import { loadDemoSeedData } from '../scripts/seed-demo';
import { bootstrapOssModules } from './core/bootstrap-oss';
import { loadProModules } from './core/loadProModules';

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).__CHAGRA_BUILD_SHA__ = RUNNING_BUILD_SHA;
}

const canonicalRedirect = runCanonicalHostRedirectGuard();

if (!canonicalRedirect.redirected) {
  bootstrapOssModules();
  loadProModules().then((r) => {
    if (r.loaded.length && import.meta.env.DEV) {
      console.info('[registry] módulos Pro cargados:', r.loaded);
    }
  });

  syncManager.initDB().then(async () => {
    if (import.meta.env.VITE_DEMO_MODE === 'true') {
      await loadDemoSeedData();
    }
    syncManager.startNetworkMonitoring();
    installBundleRecoveryGuards();

    if (navigator.onLine && !localStorage.getItem('chagra:v1:rename_done')) {
      getAccessToken().then((token) => {
        if (!token) return;
        renameWorker(LEGACY_WORKER_NAME, PRIMARY_WORKER_NAME).then((result) => {
          if (result.success || result.error === 'not_found') {
            localStorage.setItem('chagra:v1:rename_done', '1');
          }
        }).catch((e) => console.warn('[Migration] Error:', e));
      }).catch(() => {});
    }

    if (navigator.onLine) {
      useLogStore.getState().pullRecentLogs(fetchFromFarmOS).catch(() => {});
    }
  }).catch((error) => {
    console.error('Error inicializando Sync Manager:', error);
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_REQUESTED') syncManager.syncAll();
    });
    registerServiceWorker();
  }

  const scheduleSelfHeal = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    setTimeout(() => runSelfHealCheck().catch(() => {}), 3000);
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('load', scheduleSelfHeal);
    window.addEventListener('online', scheduleSelfHeal);
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <ModoCampoProvider>
          <ProdChagraApp />
        </ModoCampoProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
