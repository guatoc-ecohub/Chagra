import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Sprout, MapPin, Eye, Package, Clock, NotebookPen, CheckCircle, WifiOff, Leaf, Mic, AlertCircle, Palette, FileText } from 'lucide-react';
import localforage from 'localforage';
import { useTheme } from './hooks/useTheme';
import { useScrollRestoration } from './hooks/useScrollRestoration';

import { isAuthenticated, logoutUser } from './services/authService';
import useAssetStore from './store/useAssetStore';
import { fetchFromFarmOS } from './services/apiService';
import { PRIMARY_WORKER_NAME } from './config/workerConfig';
import { initCatalog } from './db/catalogDB';
import NetworkStatusBar from './components/NetworkStatusBar';
import PendingTasksWidget from './components/PendingTasksWidget';
import FieldFeedback from './components/FieldFeedback';
import MicFab from './components/MicFab';
import { ScreenShell } from './components/common/ScreenShell';
import ChagraGrowLoader from './components/ChagraGrowLoader';
import IosInstallBanner from './components/IosInstallBanner';

// Lazy-loaded route components
const TelemetryAlerts = lazy(() => import('./components/TelemetryAlerts'));
const LoginScreen = lazy(() => import('./components/LoginScreen'));
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
const VoiceCapture = lazy(() => import('./components/VoiceCapture'));
const ProfileScreen = lazy(() => import('./components/ProfileScreen'));
const HelpManual = lazy(() => import('./components/HelpManual'));
const OnboardingHero = lazy(() => import('./components/OnboardingHero'));
const TopBar = lazy(() => import('./components/TopBar'));

localforage.config({
  name: 'Chagra',
  storeName: 'syncQueue'
});

const LoadingFallback = () => (
  <div className="h-[100dvh] bg-slate-950 flex items-center justify-center text-muzo-glow">
    <ChagraGrowLoader size={80} showLabel labelText="Chagra..." />
  </div>
);

// NAV tiles — vocabulario user-facing post DR-030 QW2 (decisión D3+D4 del DR).
// Tile "Voz" eliminada: ya está accesible global vía MicFab abajo-izquierda
// (QW4). Iconos canónicos: Sprout para plantas, NotebookPen para bitácora.
// Card-sort n>=5 con usuarios 0-contexto colombianos pendiente para
// validar empíricamente — esta release ships con hipótesis cultural
// (lenguaje agronómico colombiano) y se itera post-feedback.
const NAV_TILES = [
  { id: 'activos', label: 'Plantas', icon: Sprout, accent: 'teal', desc: 'Cultivos, zonas e infraestructura' },
  { id: 'mapa', label: 'Mapa', icon: MapPin, accent: 'blue', desc: 'Vista espacial de la finca' },
  { id: 'javier', label: 'Hoy en finca', icon: Eye, accent: 'green', desc: `Tareas por proximidad (${PRIMARY_WORKER_NAME})` },
  { id: 'bodega', label: 'Insumos', icon: Package, accent: 'sky', desc: 'Stock de biopreparados' },
  { id: 'task_log', label: 'Tareas', icon: Clock, accent: 'rose', desc: 'Cola de pendientes' },
  { id: 'historial', label: 'Bitácora', icon: NotebookPen, accent: 'indigo', desc: 'Trazabilidad de operaciones' },
  { id: 'biodiversidad', label: 'Flora y fauna', icon: Leaf, accent: 'emerald', desc: 'Ecosistema, estratos y gremios' },
  { id: 'reportar_invasora', label: 'Plagas', icon: AlertCircle, accent: 'amber', desc: 'Reporte de plagas y malezas' },
  { id: 'informes', label: 'Informes', icon: FileText, accent: 'lime', desc: 'Reportes CSV de trazabilidad y descargas' },
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

// T2: Dashboard como componente propio con suscripción reactiva al store.
// useAssetStore() (hook) dispara re-render cuando hydrate()/syncFromServer() actualizan
// el estado, a diferencia de useAssetStore.getState() que es una lectura snapshot.
const DashboardView = React.memo(function DashboardView({ onNavigate, onLogout, lastLogMessage }) {
  // Lili #103: preservar scroll al volver de Voz/FieldFeedback/sub-screens.
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

  // T2: Hidratación al montar — llena contadores desde IndexedDB inmediatamente
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
    <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* DR-030 QW2: TopBar persistente con identidad operador + acciones
          globales. Reemplaza el header inline previo. La info ambiental
          (msnm/luna/sol) pasó al EnvironmentalCard colapsable bajo el TopBar. */}
      <TopBar onNavigate={onNavigate} onLogout={onLogout} />

      {/* Lili #116: estadísticas al header (siempre visibles).
          Antes: el bloque assetCounts vivía dentro del <main scrollable>,
          se perdía al scrollear hacia abajo. Lili pidió "deberían ir al
          inicio en el header" — ahora es hermano del TopBar (queda fuera
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

      <main className="flex-1 px-4 pt-3 pb-4 flex flex-col overflow-y-auto gap-3 bg-biopunk-pattern">
        {/* DR-030 QW5: cold-start empty-state.
            plantsCount === 0 → OnboardingHero con 3 CTA hero (📸/🎤/✍).
            Sin plantas registradas, la telemetría densa es ruido informacional;
            la suprimimos a favor del onboarding directo. Cuando hay ≥1 planta
            registrada, vuelve el dashboard normal con TelemetryAlerts. */}
        {plantsCount === 0 ? (
          <OnboardingHero onNavigate={onNavigate} />
        ) : (
          <TelemetryAlerts onNavigate={onNavigate} lastFarmOsLog={lastLogMessage} />
        )}

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
  const [currentView, setCurrentView] = useState('loading');
  const [currentViewData, setCurrentViewData] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastLogMessage, setLastLogMessage] = useState('');

  // navigate(view, data) — único entry point para cambiar vista. Limpia
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

  useEffect(() => {
    const handler = (e) => setLastLogMessage(e.detail);
    window.addEventListener('farmosLog', handler);
    return () => window.removeEventListener('farmosLog', handler);
  }, []);

  useEffect(() => {
    isAuthenticated().then((isAuth) => {
      navigate(isAuth ? 'dashboard' : 'login');
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
      case 'dashboard':
        return <DashboardView onNavigate={navigate} onLogout={handleLogout} lastLogMessage={lastLogMessage} />;
      case 'sembrar':
        return <SeedingLog onBack={() => navigate('dashboard')} onSave={showToast} initialData={currentViewData} />;
      case 'cosechar':
        return <HarvestLog onBack={() => navigate('dashboard')} onSave={showToast} />;
      case 'insumos':
        return <InputLog onBack={() => navigate('dashboard')} onSave={showToast} />;
      case 'plant_asset':
        // Lili #113 — desaparece el form plano. Redirige al rich form de
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
          <ScreenShell title={`Campo — ${PRIMARY_WORKER_NAME}`} icon={Eye} onBack={() => navigate('dashboard')}>
            <WorkerDashboard />
          </ScreenShell>
        );
      case 'mapa':
        return (
          <ScreenShell title="Mapa de la Finca" icon={MapPin} onBack={() => navigate('dashboard')}>
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
          <ScreenShell title="Bodega" icon={Package} onBack={() => navigate('dashboard')}>
            <InventoryDashboard />
          </ScreenShell>
        );
      case 'informes':
        return <InformesScreen onBack={() => navigate('dashboard')} />;
      case 'historial':
        return <WorkerHistory onBack={() => navigate('dashboard')} onEntryClick={(entry) => navigate('bitacora_detail', { entry })} />;
      case 'bitacora_detail':
        return <BitacoraEntryDetail entry={currentViewData?.entry || currentViewData} onBack={() => navigate('historial')} onEdit={(entry) => navigate('edit_task', { task: entry })} />;
      case 'biodiversidad':
        return <BiodiversidadView onBack={() => navigate('dashboard')} />;
      case 'voz':
        return (
          <ScreenShell title="Registro por voz" icon={Mic} onBack={() => navigate('dashboard')}>
            <VoiceCapture onSave={showToast} />
          </ScreenShell>
        );
      case 'perfil':
        return <ProfileScreen onBack={() => navigate('dashboard')} />;
      case 'help':
        return <HelpManual onBack={() => navigate('dashboard')} />;
      default:
        return <div className="h-[100dvh] bg-slate-950 text-white flex items-center justify-center">Vista no disponible</div>;
    }
  };

  return (
    <>
      <NetworkStatusBar />
      <IosInstallBanner />
      <Suspense fallback={<LoadingFallback />}>
        {renderView()}
      </Suspense>
      {/* FAB feedback inline para field testing — siempre visible salvo loading */}
      {currentView !== 'loading' && currentView !== 'login' && <FieldFeedback />}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'voz' && <MicFab onNavigate={navigate} />}
      {currentView === 'dashboard' && <PendingTasksWidget onEdit={(task) => navigate('edit_task', { task })} />}
      {toast && (
        <div
          role={toast.isError ? 'alert' : 'status'}
          aria-live={toast.isError ? 'assertive' : 'polite'}
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 p-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 w-11/12 max-w-sm border-2 pb-[max(2rem,env(safe-area-inset-bottom))] ${toast.isError ? 'bg-amber-700 border-amber-500' : 'bg-green-700 border-green-500'}`}
        >
          {toast.isError ? <WifiOff size={32} className="shrink-0" aria-hidden="true" /> : <CheckCircle size={32} className="shrink-0" aria-hidden="true" />}
          <p className="text-lg font-bold text-white leading-tight">{toast.message}</p>
        </div>
      )}
    </>
  );
}
