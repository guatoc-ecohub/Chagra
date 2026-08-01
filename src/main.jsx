import './config/env'; // Validación de env vars al startup
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/themes.css'
import './styles/motion.css'
import './styles/temas-fase2.css'
import './styles/juego-pulido.css'
import './styles/clima-atmosfera.css'
import './styles/sello-confianza.css'
import './styles/panel-procedencia.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ModoCampoProvider } from './hooks/ModoCampoContext'
import { syncManager } from './services/syncManager'
import { useLogStore } from './store/useLogStore'
import { fetchFromFarmOS } from './services/apiService'
import { PRIMARY_WORKER_NAME } from './config/workerConfig'
import { renameWorker } from './services/assetService'
import { getAccessToken } from './services/authService'
import { registerServiceWorker } from './services/swRegistration'
import { runSelfHealCheck, installBundleRecoveryGuards, RUNNING_BUILD_SHA } from './services/versionCheck'
import { runCanonicalHostRedirectGuard } from './services/canonicalHostRedirect'

// Exponer el SHA del bundle CORRIENDO para diagnóstico + el smoke post-deploy
// (tests/e2e-real/sw-self-heal.smoke.mjs compara window.__CHAGRA_BUILD_SHA__
// contra /version.json para cazar el desfase SW/bundle viejo). Solo lectura.
if (typeof window !== 'undefined') {
  // @ts-ignore custom property for build SHA
  window.__CHAGRA_BUILD_SHA__ = RUNNING_BUILD_SHA;
}

import { loadDemoSeedData } from '../scripts/seed-demo';
import { bootstrapOssModules } from './core/bootstrap-oss';
import { loadProModules } from './core/loadProModules';

const canonicalRedirect = runCanonicalHostRedirectGuard();

if (!canonicalRedirect.redirected) {
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
    installBundleRecoveryGuards();

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

  // Service Worker: registro + AUTO-UPDATE seguro (ver swRegistration.js).
  // Al detectar un SW nuevo en `waiting`, aplica skipWaiting automáticamente y
  // recarga UNA sola vez (respetando el guard anti-loop). El UpdateAvailableBanner
  // queda como fallback visible. La lógica vive en su propio módulo para poder
  // testearla en vitest sin montar el árbol React.
  if ('serviceWorker' in navigator) {
    // Escuchar solicitudes de sync del SW (syncManager ya importado aquí).
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_REQUESTED') {
        syncManager.syncAll();
      }
    });

    registerServiceWorker();
  }

  // Auto-recuperación por versión (self-heal) — NO depende del ciclo de vida del
  // SW. Compara el SHA del bundle corriendo (__BUILD_SHA__) contra /version.json
  // del servidor; si difieren, manda SKIP_WAITING y recarga UNA sola vez (guard
  // anti-loop por sessionStorage). Rescata al cliente que se quedó en un bundle
  // viejo porque nunca tomó el SW en waiting (raíz del prod-down "failed to
  // fetch" → onboarding engañoso, 2026-06-18). Offline-first: no-op sin red.
  // Diferido para no competir con el boot crítico; se repite al recuperar señal.
  const scheduleSelfHeal = () => {
    // Solo con red. runSelfHealCheck es de todos modos no-op offline, pero
    // evitamos el fetch innecesario.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    setTimeout(() => {
      runSelfHealCheck().catch(() => { /* nunca rompe el boot */ });
    }, 3000);
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('load', scheduleSelfHeal);
    // Al recuperar conexión tras un rato offline: re-chequear (el cliente pudo
    // haber estado horas en un bundle viejo sin poder verificar versión).
    window.addEventListener('online', scheduleSelfHeal);
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <ModoCampoProvider>
          <App />
        </ModoCampoProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}
