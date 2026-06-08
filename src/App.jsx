import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Sprout, MapPin, Eye, Package, Clock, NotebookPen, CheckCircle, WifiOff, Leaf, Mic, AlertCircle, Palette, FileText } from 'lucide-react';
import localforage from 'localforage';
import { useTheme } from './hooks/useTheme';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import useIdleDetection from './hooks/useIdleDetection';
import useGlobalKeyboardShortcuts from './hooks/useGlobalKeyboardShortcuts';
import BiopunkBackground from './components/dashboard/BiopunkBackground';

import { isAuthenticated, logoutUser } from './services/authService';
import useAssetStore from './store/useAssetStore';
import { fetchFromFarmOS } from './services/apiService';
import { PRIMARY_WORKER_NAME } from './config/workerConfig';
import { initCatalog } from './db/catalogDB';
import NetworkStatusBar from './components/NetworkStatusBar';
import PendingTasksWidget from './components/PendingTasksWidget';
import SyncProgressIndicator from './components/common/SyncProgressIndicator';
import useOllamaWarmStore from './store/useOllamaWarmStore';
import { prewarmCorpus } from './services/ragRetriever';
import useThemeBackgroundStore, { getBackgroundSrc, DEFAULT_BACKGROUND_ID } from './store/useThemeBackgroundStore';
import useAlertStore from './store/useAlertStore';
import { alertEngine } from './services/alertEngine';
// FieldFeedback ya no se monta globalmente en App; vive embebido en
// HelpUsoScreen como sección de Ayuda (decisión 2026-05-21, ver
// comentario abajo donde se removió el render).
// import FieldFeedback from './components/FieldFeedback';
import AgentFab from './components/AgentFab';
import { ScreenShell } from './components/common/ScreenShell';
import ChagraGrowLoader from './components/ChagraGrowLoader';
import Confetti from './components/common/Confetti';
import IosInstallBanner from './components/IosInstallBanner';
import UpdateAvailableBanner from './components/UpdateAvailableBanner';
import GpsFincaBanner from './components/GpsFincaBanner';
import DataLossBanner from './components/DataLossBanner';
import CriticalAlertBanner from './components/CriticalAlertBanner';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-loaded route components
const TelemetryAlerts = lazy(() => import('./components/TelemetryAlerts'));
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const OAuthCallback = lazy(() => import('./components/OAuthCallback'));
const HarvestLog = lazy(() => import('./components/HarvestLog'));
const SeedingLog = lazy(() => import('./components/SeedingLog'));
const InputLog = lazy(() => import('./components/InputLog'));
const ObservationScreen = lazy(() => import('./components/ObservationScreen'));
const InvasiveObservationLog = lazy(() => import('./components/InvasiveObservationLog'));
const MaintenanceScreen = lazy(() => import('./components/MaintenanceScreen'));
const TaskLogScreen = lazy(() => import('./components/TaskLogScreen'));
const TaskScreen = lazy(() => import('./components/TaskScreen'));
const AssetsDashboard = lazy(() => import('./components/AssetsDashboard'));
const WorkerHistory = lazy(() => import('./components/WorkerHistory'));
const BitacoraEntryDetail = lazy(() => import('./components/BitacoraEntryDetail'));
const InformesScreen = lazy(() => import('./components/InformesScreen'));
const InventoryDashboard = lazy(() => import('./components/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const FarmMap = lazy(() => import('./components/FarmMap'));
const WorkerDashboard = lazy(() => import('./components/WorkerDashboard').then(m => ({ default: m.WorkerDashboard })));
const BiodiversidadView = lazy(() => import('./components/BiodiversidadView'));
const AgentScreen = lazy(() => import('./components/AgentScreen/AgentScreen'));
const OnboardingPiloto = lazy(() => import('./components/OnboardingPiloto'));
const OnboardingProfile = lazy(() => import('./components/OnboardingProfile'));
const LocationDetectedScreen = lazy(() => import('./components/LocationDetectedScreen'));
const VoiceCapture = lazy(() => import('./components/VoiceCapture'));
const ProfileScreen = lazy(() => import('./components/ProfileScreen'));
const CaseStudyScreen = lazy(() => import('./components/CaseStudyScreen'));
const CaseStudyDetail = lazy(() => import('./components/CaseStudyDetail'));
const CaseStudyTopWidget = lazy(() => import('./components/CaseStudyTopWidget'));
const HelpManual = lazy(() => import('./components/HelpManual'));
const OnboardingHero = lazy(() => import('./components/OnboardingHero'));
const WelcomeStatsHero = lazy(() => import('./components/WelcomeStatsHero'));
const TopBar = lazy(() => import('./components/TopBar'));
const DashboardLive = lazy(() => import('./components/dashboard/DashboardLive'));
import HomeRegionalGreeting from './components/HomeRegionalGreeting';

localforage.config({
  name: 'Chagra',
  storeName: 'syncQueue'
});

const LoadingFallback = () => (
  <div className="h-[100dvh] bg-slate-950 flex items-center justify-center text-muzo-glow">
    <ChagraGrowLoader size={80} showLabel labelText="Chagra..." />
  </div>
);

// NAV tiles, vocabulario user-facing post DR-030 QW2 (decisión D3+D4 del DR).
// Tile "Voz" eliminada: la captura por voz vive dentro del agente / compositor
// (el FAB global MicFab se removió 2026-05-30 por decisión del operador).
// Iconos canónicos: Sprout para plantas, NotebookPen para bitácora.
// Card-sort n>=5 con usuarios 0-contexto colombianos pendiente para
// validar empíricamente, esta release ships con hipótesis cultural
// (lenguaje agronómico colombiano) y se itera post-feedback.
const NAV_TILES = [
  { id: 'activos', label: 'Plantas', icon: Sprout, accent: 'teal', desc: 'Cultivos, zonas e infraestructura' },
  { id: 'mapa', label: 'Mapa', icon: MapPin, accent: 'blue', desc: 'Vista espacial de la finca' },
  { id: 'javier', label: 'Hoy en finca', icon: Eye, accent: 'green', desc: `Tareas por proximidad (${PRIMARY_WORKER_NAME})` },
  { id: 'bodega', label: 'Insumos', icon: Package, accent: 'sky', desc: 'Stock de biopreparados' },
  { id: 'task_log', label: 'Tareas', icon: Clock, accent: 'rose', desc: 'Cola de pendientes' },
  { id: 'historial', label: 'Bitácora', icon: NotebookPen, accent: 'indigo', desc: 'Historial de actividades' },
  { id: 'biodiversidad', label: 'Flora y fauna', icon: Leaf, accent: 'emerald', desc: 'Ecosistema, estratos y gremios' },
  { id: 'reportar_invasora', label: 'Plagas', icon: AlertCircle, accent: 'amber', desc: 'Reporte de plagas y malezas' },
  { id: 'casos', label: 'Casos', icon: FileText, accent: 'amber', desc: 'Seguimiento de problemas y tratamientos' },
  { id: 'informes', label: 'Informes', icon: FileText, accent: 'lime', desc: 'Descargas de reportes en CSV' },
  { id: 'perfil', label: 'Perfil', icon: Palette, accent: 'indigo', desc: 'Temas y configuración' },
];

// Mapa de accents → clases Tailwind (para que el JIT genere los estilos).
// Keeping static literals so Tailwind purgue funcione.
const ACCENT_CLASSES = {
  teal: { border: 'border-l-teal-500', text: 'text-teal-400' },
  blue: { border: 'border-l-blue-500', text: 'text-blue-400' },
  green: { border: 'border-l-green-500', text: 'text-green-400' },
  sky: { border: 'border-l-sky-500', text: 'text-sky-400' },
  rose: { border: 'border-l-rose-500', text: 'text-rose-400' },
  indigo: { border: 'border-l-indigo-500', text: 'text-indigo-400' },
  emerald: { border: 'border-l-emerald-500', text: 'text-emerald-400' },
  lime: { border: 'border-l-lime-500', text: 'text-lime-400' },
  amber: { border: 'border-l-amber-500', text: 'text-amber-400' },
};

const HASH_VIEW_ROUTES = {
  agente: 'agente',
  inventario: 'activos',
  activos: 'activos',
  biodiversidad: 'biodiversidad',
  ayuda: 'ayuda',
  perfil: 'perfil',
  informes: 'informes',
  'case-studies': 'casos',
  casos: 'casos',
  tareas: 'task_log',
  task_log: 'task_log',
};

// T2: Dashboard como componente propio con suscripción reactiva al store.
// useAssetStore() (hook) dispara re-render cuando hydrate()/syncFromServer() actualizan
// el estado, a diferencia de useAssetStore.getState() que es una lectura snapshot.
// DashboardLiveView — el dashboard rediseñado 2026-05-28 cervezas-test:
// agente Chagra protagonista + clima IDEAM + secciones drag-reorder.
// Mantiene shell (TopBar + HomeRegionalGreeting) y delega contenido a
// DashboardLive (src/components/dashboard/DashboardLive.jsx).
const DashboardLiveView = React.memo(function DashboardLiveView({ onNavigate, onLogout }) {
  // Scroll restoration vive DENTRO de DashboardLive (apunta a su propio
  // scroller — no hay <main> en DashboardLiveView).
  const hydrate = useAssetStore((s) => s.hydrate);
  const syncFromServer = useAssetStore((s) => s.syncFromServer);
  const idle = useIdleDetection(12000);
  useEffect(() => {
    hydrate().then(() => {
      if (navigator.onLine) syncFromServer(fetchFromFarmOS);
    });
  }, [hydrate, syncFromServer]);

  return (
    // .app-scrim (scrim por token, spec 2026-06-05): antes bg-slate-950/55
    // hardcodeado tapaba al 100% el fondo-foto elegido en el selector
    // (--app-bg-image en el body, clase .app-bg-biodiversidad). El operador veía
    // la foto en pantallas con ScreenShell pero NO en la principal. El scrim
    // ahora sale de --scrim-bg/--scrim-opacity → navy en bio-punk, crema sutil en
    // temas claros (no lava la imagen). BiopunkBackground (capa animada) +
    // contenido z-10 mantienen legibilidad.
    <div className="relative h-[100dvh] w-full app-scrim text-white flex flex-col overflow-hidden">
      {/* Capa biopunk viva — sutil siempre, salvaje en idle */}
      <BiopunkBackground intense={idle} />
      {/* Contenido del dashboard, fade-out cuando idle para resaltar fondo.
          PORTADA INMERSIVA 2026-06-06: el AgentHero ocupa la PRIMERA pantalla
          completa (≈100dvh). Para no romper esa inmersión, el TopBar pasa de
          ser un hermano-flex que come alto vertical a un overlay FLOTANTE
          discreto encima de la escena (sticky→absolute), y el scroller
          (DashboardLive) ocupa toda la altura. El saludo regional dismissible
          ya NO va sobre el hero (duplicaba su saludo): baja al flujo bajo el
          fold, junto a las secciones de finca/clima/análisis. */}
      <div
        className="relative z-10 flex flex-col h-full transition-opacity duration-[1500ms] ease-out"
        style={{ opacity: idle ? 0.18 : 1 }}
      >
        {/* TopBar flotante: capa propia por encima del scroller inmersivo. */}
        <div className="absolute top-0 inset-x-0 z-30 agent-immersive-topbar">
          <TopBar onNavigate={onNavigate} onLogout={onLogout} />
        </div>
        <DashboardLive onNavigate={onNavigate} regionalGreeting={<HomeRegionalGreeting />} />
      </div>
      {/* Hint subliminal cuando idle — "toca para volver" */}
      {idle && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-emerald-300/70 text-xs uppercase tracking-[0.3em] font-mono"
          style={{ animation: 'biopunk-hint 2.5s ease-in-out infinite' }}
        >
          ⊹ toca para volver ⊹
          <style>{`
            @keyframes biopunk-hint {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.95; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
});

const DashboardView = React.memo(function DashboardView({ onNavigate, onLogout, lastLogMessage }) {
  // Feedback piloto #103: preservar scroll al volver de Voz/FieldFeedback/sub-screens.
  // Sin esto, navegar dashboard → vista_X → dashboard volvía siempre al top.
  useScrollRestoration('dashboard');

  // Selectores shallow: solo re-renderiza cuando las longitudes cambian
  const plantsCount = useAssetStore((s) => s.plants.length);
  const landsCount = useAssetStore((s) => s.lands.length);
  const structuresCount = useAssetStore((s) => s.structures.length);
  const materialsCount = useAssetStore((s) => s.materials.length);
  const plants = useAssetStore((s) => s.plants);
  const structures = useAssetStore((s) => s.structures);
  const lands = useAssetStore((s) => s.lands);
  const hydrate = useAssetStore((s) => s.hydrate);
  const syncFromServer = useAssetStore((s) => s.syncFromServer);

  // T2: Hidratación al montar, llena contadores desde IndexedDB inmediatamente
  useEffect(() => {
    hydrate().then(() => {
      if (navigator.onLine) syncFromServer(fetchFromFarmOS);
    });
  }, [hydrate, syncFromServer]);

  const noGeoCount = useMemo(() => {
    const allAssets = [...plants, ...structures, ...lands];
    return allAssets.filter((a) => {
      const geo = a.attributes?.intrinsic_geometry;
      return !geo || !(typeof geo === 'object' ? geo.value : geo);
    }).length;
  }, [plants, structures, lands]);

  const assetCounts = useMemo(() => [
    { label: 'Cultivos', count: plantsCount, color: 'text-lime-400' },
    { label: 'Zonas', count: landsCount, color: 'text-amber-400' },
    { label: 'Infraestructura', count: structuresCount, color: 'text-emerald-400' },
    { label: 'Insumos', count: materialsCount, color: 'text-sky-400' },
  ], [plantsCount, landsCount, structuresCount, materialsCount]);

  return (
    <div className="h-[100dvh] w-full app-scrim-strong text-white flex flex-col overflow-hidden">
      {/* DR-030 QW2: TopBar persistente con identidad operador + acciones
          globales. Reemplaza el header inline previo. La info ambiental
          (msnm/luna/sol) pasó al EnvironmentalCard colapsable bajo el TopBar.
          2026-05-18: wrapper translúcido (.app-scrim-strong, scrim por token)
          para que se vea la imagen de fondo agroecológica aplicada al body en
          App.jsx — navy en bio-punk, velo crema sutil en temas claros. */}
      <TopBar onNavigate={onNavigate} onLogout={onLogout} />
      <HomeRegionalGreeting />

      {/* Feedback piloto #116: estadísticas al header (siempre visibles).
          Antes: el bloque assetCounts vivía dentro del <main scrollable>,
          se perdía al scrollear hacia abajo. usuaria piloto pidió "deberían ir al
          inicio en el header", ahora es hermano del TopBar (queda fuera
          del overflow del main, sticky de facto al top siempre). */}
      {plantsCount > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('activos')}
          aria-label="Ver inventario de activos"
          className="w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 hover:bg-slate-800/50 transition-colors shrink-0"
        >
          <div className="grid grid-cols-4 divide-x divide-slate-800 py-2">
            {assetCounts.map((ac) => (
              <div key={ac.label} className="text-center px-2">
                <p className={`text-xl font-black tabular-nums ${ac.color}`}>{ac.count}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{ac.label}</p>
              </div>
            ))}
          </div>
        </button>
      )}

      {/* Feedback piloto #5 (Lili 2026-05-18): pb-4 no era suficiente —
          los FABs flotantes (Agent) tapaban el final del scroll. Cambio a
          calc seguro con safe-area iOS notch + 120px para que el último
          widget quede accesible al tap. */}
      <main className="flex-1 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+120px)] flex flex-col overflow-y-auto gap-3">
        {/* Bug 2026-05-18 (operator): TelemetryAlerts mostraba errores IoT +
            sync no resueltos como PRIMERA cosa visible post-login. Mal first
            impression — Chagra debe arrancar con stats positivos (especies,
            plantas cuidadas, fichas pedagógicas, biopreparados).
            Ahora: WelcomeStatsHero como hero card SIEMPRE primera.
            OnboardingHero (CTAs 📸/🎤/✍) sigue mostrándose si plantsCount=0
            (junto al WelcomeStatsHero, para guiar al primer registro).
            TelemetryAlerts se mueve más abajo (problemas técnicos visibles
            pero no como hero). */}
        <ErrorBoundary>
          <WelcomeStatsHero mode="post-login" onNavigate={onNavigate} />
        </ErrorBoundary>

        {plantsCount === 0 && (
          <OnboardingHero onNavigate={onNavigate} />
        )}

        {plantsCount > 0 && (
          <ErrorBoundary>
            <TelemetryAlerts onNavigate={onNavigate} lastFarmOsLog={lastLogMessage} />
          </ErrorBoundary>
        )}

        {/* Top problemas activos casos de estudio (DR-044 sub-iv). */}
        {/* Se auto-oculta cuando no hay casos activos (KISS, zero footprint). */}
        <ErrorBoundary>
          <CaseStudyTopWidget onNavigate={onNavigate} maxItems={3} />
        </ErrorBoundary>

        {noGeoCount > 0 && (
          <button
            onClick={() => onNavigate('activos')}
            className="w-full p-3 rounded-xl bg-amber-900/20 border border-amber-800/50 flex items-center justify-between hover:bg-amber-900/30 transition-colors"
          >
            <span className="text-xs text-amber-400 font-bold flex items-center gap-2">
              <MapPin size={14} aria-hidden="true" />
              {noGeoCount} activo{noGeoCount > 1 ? 's' : ''} sin ubicación registrada
            </span>
            <span className="text-2xs text-amber-400/60">Tocar para corregir</span>
          </button>
        )}

        <div className="h-4 shrink-0" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {NAV_TILES.map((tile) => {
            const a = ACCENT_CLASSES[tile.accent] || ACCENT_CLASSES.teal;
            return (
              <button
                key={tile.id}
                onClick={() => onNavigate(tile.id)}
                aria-label={`${tile.label}: ${tile.desc}`}
                className={`bg-slate-900/60 border border-slate-800 border-l-4 ${a.border} rounded-xl p-4 text-left min-h-[80px] active:bg-slate-800/70 transition-colors`}
              >
                <tile.icon size={28} strokeWidth={2} className={`mb-2 ${a.text}`} aria-hidden="true" />
                <span className={`text-lg font-black block ${a.text}`}>{tile.label}</span>
                <span className="text-2xs text-slate-500 block mt-0.5">{tile.desc}</span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
});

export default function App() {
  useTheme();
  // Atajos teclado globales (?, g+h). Quick-win UX 2026-05-28 demo Diana.
  // Solo activos post-login (no en loading ni login para no atrapar shift+?
  // accidental al escribir password).
  const [currentView, setCurrentView] = useState('loading');
  useGlobalKeyboardShortcuts({ enabled: currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' });
  const [currentViewData, setCurrentViewData] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastLogMessage, setLastLogMessage] = useState('');

  // navigate(view, data), único entry point para cambiar vista. Limpia
  // currentViewData salvo cuando se pasa explícitamente. Sin esto, navegar
  // dashboard → vista_con_initialData → dashboard → misma_vista_otra_vez
  // reusaba el initialData stale (bug latente de UX).
  const navigate = useCallback((view, initialData = null) => {
    setCurrentView(view);
    setCurrentViewData(initialData);
  }, []);

  useEffect(() => {
    const handleNavigate = (e) => navigate(e.detail.view, e.detail.initialData || null);
    window.addEventListener('chagraNavigate', handleNavigate);
    return () => window.removeEventListener('chagraNavigate', handleNavigate);
  }, [navigate]);

  // 2026-05-28: ScreenShell despacha 'chagra:nav' (formato simplificado) cuando
  // user clickea Home/Alertas/Ayuda en pantallas secundarias. Sin esto, los
  // botones globales del ScreenShell no navegan a ningún lado. Acepta string
  // simple o objeto {view, data}.
  useEffect(() => {
    const handleNavSimple = (e) => {
      const payload = e.detail;
      if (typeof payload === 'string') {
        navigate(payload, null);
      } else if (payload && typeof payload === 'object' && payload.view) {
        navigate(payload.view, payload.data || null);
      }
    };
    window.addEventListener('chagra:nav', handleNavSimple);
    return () => window.removeEventListener('chagra:nav', handleNavSimple);
  }, [navigate]);

  useEffect(() => {
    const handler = (e) => setLastLogMessage(e.detail);
    window.addEventListener('farmosLog', handler);
    return () => window.removeEventListener('farmosLog', handler);
  }, []);

  // Bug Lili #4: el InputLogForm dispatcha 'syncSuccess' tras registrar una
  // aplicación de bio-insumo, pero nadie escuchaba el evento → el operador
  // no veía feedback de dónde quedó guardada la info. Listener acá que
  // alimenta el toast con CTA "Ver Bitácora" cuando el evento trae action.
  // detail: { message: string, actionLabel?: string, actionView?: string }
  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      setToast({
        message: detail.message || 'Registrado',
        isError: false,
        actionLabel: detail.actionLabel,
        actionView: detail.actionView,
      });
      // Toast con CTA persiste 6s (más tiempo para que el operador alcance
      // a tocar el botón). Sin CTA, auto-dismiss a 4s (igual que showToast).
      const ttl = detail.actionLabel ? 6000 : 4000;
      setTimeout(() => setToast(null), ttl);
    };
    window.addEventListener('syncSuccess', handler);
    return () => window.removeEventListener('syncSuccess', handler);
  }, []);

  useEffect(() => {
    // Rutas públicas (sin auth check): onboarding-piloto. Soporta pathname
    // (chagra.guatoc.co/onboarding-piloto) gracias al SPA fallback de Nginx
    // que sirve index.html, hash (#onboarding-piloto), o query
    // (?onboarding=piloto). Esto permite que pilotos invitados lleguen al
    // form sin tener cuenta previa en FarmOS.
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    const search = new URLSearchParams(window.location.search);

    // Callback OAuth (Authorization Code + PKCE): farmOS redirige a
    // /callback?code=...&state=... tras /oauth/authorize. Detectamos la ruta
    // (pathname `callback`/`oauth/callback`, hash `callback`, o presencia de
    // `code`+`state` en query) y montamos la vista OAuthCallback que hace el
    // intercambio code→token. Va ANTES de los demás checks: si hay un code en
    // vuelo no queremos que isAuthenticated() (todavía false) mande a login y
    // se pierda el code. El redirect_uri DEBE estar registrado en el cliente
    // OAuth de farmOS para que este flujo complete (paso backend del operador).
    const isOAuthCallback =
      pathname === 'callback' ||
      pathname === 'oauth/callback' ||
      hash === 'callback' ||
      (search.get('code') && search.get('state'));
    if (isOAuthCallback) {
      Promise.resolve().then(() => navigate('oauth-callback'));
      return;
    }

    const isOnboardingPiloto =
      pathname === 'onboarding-piloto' ||
      hash === 'onboarding-piloto' ||
      search.get('onboarding') === 'piloto';
    if (isOnboardingPiloto) {
      // Microtask para evitar setState sincrónico en effect body
      // (ESLint react-hooks/set-state-in-effect). Mismo patrón async-like
      // que el isAuthenticated().then() de abajo, para que pase el lint.
      Promise.resolve().then(() => navigate('onboarding-piloto'));
      return;
    }
    isAuthenticated().then((isAuth) => {
      if (!isAuth) {
        navigate('login');
        return;
      }
      navigate(HASH_VIEW_ROUTES[hash] || 'dashboard');
    });
  }, [navigate]);

  // Preload del catálogo SQLite WASM en background (v0.8.2). Inicializa la
  // DB cuando la app arranca para que la primera apertura de los flows que
  // consultan el catálogo (InvasiveObservationLog, NativeSubstituteSuggestion,
  // etc.) no espere el download del .sqlite (~135KB) ni la inicialización
  // del WASM. Si falla, el catalogDB log lo registra y los componentes
  // muestran su propio empty/error state.
  useEffect(() => {
    initCatalog().catch((err) => {
      console.warn('[App] Catálogo no se pudo preload (los componentes lo reintentarán al usarlos):', err);
    });
  }, []);

  // alertas-reales (2026-05-30): arranca el motor de alertas con CLIMA REAL.
  // Inicializa los listeners del store (escucha alertTriggered/alertCleared) y
  // arranca el alertEngine, que consulta el pronóstico Open-Meteo de la finca
  // (coords del perfil) y deriva alertas reales (helada/calor/lluvia/sequía/
  // viento) hacia el botón de alertas. Si no hay coords, degrada limpio sin
  // inventar nada. Los sensores IoT quedan en demo OFF (no hay hardware).
  // Se arranca una sola vez (singleton + guard de isPolling interno).
  useEffect(() => {
    try {
      useAlertStore.getState().initializeListeners();
      alertEngine.start().catch((err) => {
        console.warn('[App] alertEngine no pudo arrancar:', err?.message);
      });
    } catch (err) {
      console.warn('[App] Error inicializando motor de alertas:', err?.message);
    }
    return () => {
      // No detenemos en cleanup de StrictMode doble-mount; el singleton ya
      // ignora start() duplicado. Solo paramos en unmount real de la app, que
      // en una SPA no ocurre — dejamos el polling vivo intencionalmente.
    };
  }, []);

  // NN4 fix 2026-05-23: pre-warm del modelo Ollama configurado se dispara al LOGIN
  // SUCCESS (LoginScreen → useOllamaWarmStore.startWarmup()), NO al
  // dashboard. Esto da ~15-30s de margen humano antes que el operador
  // llegue al agente, eliminando el cold-start 116s observado en
  // Playwright Q1 curuba 2026-05-23.
  //
  // Este useEffect es FALLBACK para el caso de re-mount sin login (ej.
  // tab refresh con sesión persistida en localStorage que arranca directo
  // al dashboard). Solo dispara si status==='unknown'. Si LoginScreen ya
  // disparó el warm-up (caso normal), el store devuelve early y no se
  // hace request duplicado. Si Ollama falla o tarda, el banner del agente
  // muestra "Preparando agente IA" hasta que warm-up complete.
  useEffect(() => {
    if (currentView !== 'dashboard') return;
    const { status, startWarmup } = useOllamaWarmStore.getState();
    if (status === 'unknown') {
      startWarmup();
    }
    // Hotfix prod-down 2026-06-02: pre-cargar el corpus RAG al llegar al
    // dashboard (fallback al pre-warm de LoginScreen/OAuthCallback, cubre el
    // refresh-con-sesión-persistida que arranca directo al dashboard sin
    // re-login). prewarmCorpus es idempotente: si el corpus ya está cacheado o
    // cargándose, no dispara trabajo extra. Fire-and-forget, no bloqueante.
    prewarmCorpus();
  }, [currentView]);

  // 2026-05-18 (operator request): la imagen de fondo agroecológica de
  // /biodiversidad-bg.jpg que está en la pestaña Biodiversidad se aplica
  // a TODA la app excepto login + loading. Body className toggled según
  // currentView. Estilos en src/index.css clase .app-bg-biodiversidad.
  useEffect(() => {
    const showBg = currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback';
    if (showBg) {
      document.body.classList.add('app-bg-biodiversidad');
    } else {
      document.body.classList.remove('app-bg-biodiversidad');
    }
    return () => document.body.classList.remove('app-bg-biodiversidad');
  }, [currentView]);

  // Selector de fondos 2026-05-28: el operador elige el fondo curado desde
  // Perfil. Suscribimos SOLO el id (string) — nunca un objeto inline — para
  // no disparar React #185. Escribimos la variable CSS --app-bg-image en el
  // body (la consume .app-bg-biodiversidad) y precargamos únicamente el
  // full seleccionado. Desde 2026-06-02 ya no existe el fondo "Clásico":
  // CUALQUIER id resuelve vía getBackgroundSrc a una foto biopunk real
  // (default universal "Cosecha mística"), así que siempre escribimos la
  // variable y NINGUNA pantalla cae al fondo viejo.
  const selectedBackground = useThemeBackgroundStore((s) => s.selected);
  useEffect(() => {
    const src = getBackgroundSrc(selectedBackground);
    // Precargar solo el full elegido para que el cambio sea inmediato.
    const img = new Image();
    img.src = src;
    document.body.style.setProperty('--app-bg-image', `url('${src}')`);
    // Bio-punk "cosecha mística" (2026-06-03): cuando el operador NO eligió una
    // foto propia (sigue en el default), bajamos a un lienzo digital CSS fiel al
    // demo (themes.css §16) en lugar de la foto. Si elige otra foto curada,
    // marcamos data-custom-bg y la foto vuelve a ganar. El gate solo importa en
    // bio-punk (sin data-theme); en nature/minimalista el fondo es crema (§2).
    //
    // FIX 2026-06-06: El lienzo biopunk (gradiente + glow) debe verse SIEMPRE
    // que estemos en biopunk sin foto custom explícita. data-custom-bg solo debe
    // escribirse cuando el usuario seleccionó una foto FOTO CURADA diferente al
    // default biopunk-4, no para cualquier cambio de default.
    const isBiopunkDefault = selectedBackground === DEFAULT_BACKGROUND_ID;
    const isBiopunkOne = selectedBackground === 'biopunk-1';
    const isDefaultOrBiopunkOne = isBiopunkDefault || isBiopunkOne;

    if (!isDefaultOrBiopunkOne) {
      document.body.setAttribute('data-custom-bg', '1');
    } else {
      document.body.removeAttribute('data-custom-bg');
    }
  }, [selectedBackground]);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    navigate('login');
  }, [navigate]);

  const renderView = () => {
    switch (currentView) {
      case 'loading':
        return <LoadingFallback />;
      case 'login':
        return <LoginScreen onLoginSuccess={() => navigate('dashboard')} onSave={showToast} />;
      case 'oauth-callback':
        // Puente del flujo Authorization Code + PKCE. Intercambia el code por
        // token y navega al dashboard; si falla, vuelve al login con toast.
        return (
          <OAuthCallback
            onSuccess={() => navigate('dashboard')}
            onError={(msg) => {
              showToast(msg || 'No se pudo iniciar sesión con PKCE.', true);
              navigate('login');
            }}
          />
        );
      case 'onboarding-piloto':
        return <OnboardingPiloto />;
      case 'onboarding-perfil':
        // #200: onboarding extendido de 18 preguntas condicionales → perfil.
        // Al terminar/saltar va al detector de ubicación; tras confirmar,
        // al dashboard. currentViewData.next permite override del destino.
        return (
          <OnboardingProfile
            onComplete={() => navigate('ubicacion-detectada', { next: 'dashboard' })}
            onClose={() => navigate(currentViewData?.back || 'dashboard')}
          />
        );
      case 'ubicacion-detectada':
        // #201: pantalla "ubicación detectada" con mini mapa + piso térmico.
        // Acepta coords/altitud/municipio iniciales vía currentViewData.
        return (
          <LocationDetectedScreen
            coords={currentViewData?.coords || null}
            altitud={currentViewData?.altitud ?? null}
            initialMunicipio={currentViewData?.municipio || ''}
            onConfirm={() => navigate(currentViewData?.next || 'dashboard')}
            onBack={() => navigate(currentViewData?.back || 'dashboard')}
          />
        );
      case 'dashboard':
        return <DashboardLiveView onNavigate={navigate} onLogout={handleLogout} lastLogMessage={lastLogMessage} />;
      case 'sembrar':
        return <SeedingLog onBack={() => navigate('dashboard')} onSave={showToast} initialData={currentViewData} />;
      case 'cosechar':
        return <HarvestLog onBack={() => navigate('dashboard')} onSave={showToast} />;
      case 'insumos':
        return <InputLog onBack={() => navigate('dashboard')} onSave={showToast} />;
      case 'plant_asset':
        // Feedback piloto #113, desaparece el form plano. Redirige al rich form de
        // AssetsDashboard tab=plant que ya tiene SpeciesSelect, GuildSuggestions
        // y autofill estrato/gremio/producción (mismo modelo que el flujo voz).
        return <AssetsDashboard onBack={() => navigate('dashboard')} initialTab="plant" initialShowForm />;
      case 'observacion':
        return <ObservationScreen onBack={() => navigate('dashboard')} onSave={showToast} />;
      case 'reportar_invasora':
        return (
          <InvasiveObservationLog
            onBack={() => navigate('dashboard')}
            onSave={showToast}
            initialLocationId={currentViewData?.locationId}
            initialWkt={currentViewData?.wkt}
          />
        );
      case 'mantenimiento':
        return <MaintenanceScreen onBack={() => navigate('dashboard')} onSave={showToast} />;
      case 'task_log':
        return <TaskLogScreen onBack={() => navigate('dashboard')} onNewTask={() => navigate('new_task')} />;
      case 'new_task':
        return <TaskScreen onBack={() => navigate('task_log')} onSave={showToast} />;
      case 'edit_task':
        return <TaskScreen onBack={() => navigate('task_log')} onSave={showToast} initialData={currentViewData?.task || currentViewData} />;
      case 'javier':
        return (
          <ScreenShell title={`Campo, ${PRIMARY_WORKER_NAME}`} icon={Eye} onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')}>
            <WorkerDashboard />
          </ScreenShell>
        );
      case 'mapa':
        return (
          <ScreenShell title="Mapa de la Finca" icon={MapPin} onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')}>
            <FarmMap onAssetClick={(id) => {
              useAssetStore.getState().setSelectedAsset(id);
              navigate('activos');
            }} />
          </ScreenShell>
        );
      case 'activos':
        return <AssetsDashboard onBack={() => navigate('dashboard')} />;
      case 'bodega':
        return (
          <ScreenShell title="Bodega" icon={Package} onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')}>
            <InventoryDashboard />
          </ScreenShell>
        );
      case 'informes':
        return <InformesScreen onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')} />;
      case 'historial':
        return <WorkerHistory onBack={() => navigate('dashboard')} onEntryClick={(entry) => navigate('bitacora_detail', { entry })} />;
      case 'bitacora_detail':
        return <BitacoraEntryDetail entry={currentViewData?.entry || currentViewData} onBack={() => navigate('historial')} onEdit={(entry) => navigate('edit_task', { task: entry })} />;
      case 'biodiversidad':
        return <BiodiversidadView onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')} />;
      case 'voz':
        return (
          <ScreenShell title="Registro por voz" icon={Mic} onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')}>
            <VoiceCapture onSave={showToast} />
          </ScreenShell>
        );
      case 'perfil':
        return <ProfileScreen onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')} />;
      case 'casos':
        return (
          <CaseStudyScreen
            onBack={() => navigate('dashboard')}
            onHome={() => navigate('dashboard')}
            onSelectCase={(id) => navigate('caso_detail', { caseId: id })}
          />
        );
      case 'caso_detail':
        return (
          <CaseStudyDetail
            caseId={currentViewData?.caseId}
            onBack={() => navigate('casos')}
            onHome={() => navigate('dashboard')}
          />
        );
      case 'help':
        return <HelpManual onBack={() => navigate('dashboard')} onNavigate={navigate} />;
      case 'agente':
        // 2026-05-28: pasamos currentViewData como initialContext para que
        // notificaciones críticas (helada, alerta clima) lleguen al agente
        // con prompt pre-cargado + cita de la fuente (IDEAM/NOAA/CIIFEN/
        // Open-Meteo) — operador no tiene que re-tipear "tengo alerta de
        // helada, ¿qué hago?". Si el usuario entra al agente normal (FAB,
        // tile, etc.), currentViewData es null y el comportamiento previo
        // se preserva sin cambios.
        return (
          <ErrorBoundary>
            <AgentScreen
              onBack={() => navigate('dashboard')}
              initialContext={currentViewData}
            />
          </ErrorBoundary>
        );
      default:
        return <div className="h-[100dvh] bg-slate-950 text-white flex items-center justify-center">Vista no disponible</div>;
    }
  };

  return (
    <>
      <NetworkStatusBar />
      <IosInstallBanner />
      <UpdateAvailableBanner />
      <Confetti />
      <GpsFincaBanner />
      {/* Detector de vaciado IDB (post clear-cache).
          2026-05-19: el operador perdió plantas con foto + 100 species por
          un "Clear cache" en Chrome Android. El banner se muestra solo si
          detectamos huella `chagra:had-data-once` en localStorage + IDB
          vacío. NO se muestra en loading/login para no asustar antes de
          que la app pueda confirmar estado. */}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && <DataLossBanner />}
      {/* #315 — banner crítico global: surfacea alertas graves (helada, sensor
          crítico) sin abrir la campana. Imposible de ignorar. */}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && <CriticalAlertBanner onNavigate={navigate} />}
      <Suspense fallback={<LoadingFallback />}>
        {renderView()}
      </Suspense>
      {/* FAB feedback flotante REMOVIDO 2026-05-21: el reporte de errores
          ahora vive embebido dentro de HelpUsoScreen (sección "Reportar
          problema con Chagra") en lugar de un FAB global. Decisión user
          tras Lili UX feedback: FAB tapaba contenido + no era discoverable.
          El form sigue siendo el mismo componente, instanciado con prop
          `embedded` desde HelpUsoScreen. */}
      {/* MicFab (FAB de voz flotante abajo-izquierda) REMOVIDO 2026-05-30 por
          decisión del operador: lo quería fuera. La entrada por voz sigue
          disponible dentro del agente / compositor; este era solo el FAB
          global. */}
      {/* AgentFab (colibrí flotante "respuesta lista") en TODAS las pantallas
          MENOS el home/dashboard (operador 2026-06-06): en el home el colibrí
          ya es el botón de ENVIAR del compositor, así que el FAB flotante ahí
          duplicaría el ave. Sigue en el resto para anunciar "respuesta lista". */}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && currentView !== 'voz' && currentView !== 'agente' && currentView !== 'dashboard' && <AgentFab onNavigate={navigate} />}
      {currentView === 'dashboard' && <PendingTasksWidget onEdit={(task) => navigate('edit_task', { task })} />}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && <SyncProgressIndicator />}
      {toast && (
        <div
          role={toast.isError ? 'alert' : 'status'}
          aria-live={toast.isError ? 'assertive' : 'polite'}
          className={`fixed left-1/2 -translate-x-1/2 p-4 rounded-xl shadow-2xl flex items-center gap-3 z-[100] w-11/12 max-w-md border-2 pointer-events-none ${toast.isError ? 'bg-amber-700 border-amber-500' : 'bg-green-700 border-green-500'}`}
          style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
        >
          {toast.isError ? <WifiOff size={28} className="shrink-0" aria-hidden="true" /> : <CheckCircle size={28} className="shrink-0" aria-hidden="true" />}
          <p className="text-base font-bold text-white leading-tight flex-1">{toast.message}</p>
          {toast.actionLabel && toast.actionView && (
            <button
              type="button"
              onClick={() => {
                navigate(toast.actionView);
                setToast(null);
              }}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-xs font-bold uppercase tracking-wide border border-white/30 pointer-events-auto"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </>
  );
}
