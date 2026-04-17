import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Warehouse, MapPin, Eye, Package, Clock, ClipboardList, CheckCircle, WifiOff, Leaf, Mic } from 'lucide-react';
import localforage from 'localforage';

import { isAuthenticated, logoutUser } from './services/authService';
import useAssetStore from './store/useAssetStore';
import { fetchFromFarmOS } from './services/apiService';
import { PRIMARY_WORKER_NAME } from './config/workerConfig';
import { version as APP_VERSION } from '../package.json';
import NetworkStatusBar from './components/NetworkStatusBar';
import PendingTasksWidget from './components/PendingTasksWidget';
import { ScreenShell } from './components/common/ScreenShell';

// Lazy-loaded route components
const TelemetryAlerts = lazy(() => import('./components/TelemetryAlerts'));
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const HarvestLog = lazy(() => import('./components/HarvestLog'));
const SeedingLog = lazy(() => import('./components/SeedingLog'));
const InputLog = lazy(() => import('./components/InputLog'));
const PlantAssetLog = lazy(() => import('./components/PlantAssetLog'));
const ObservationScreen = lazy(() => import('./components/ObservationScreen'));
const MaintenanceScreen = lazy(() => import('./components/MaintenanceScreen'));
const TaskLogScreen = lazy(() => import('./components/TaskLogScreen'));
const AssetsDashboard = lazy(() => import('./components/AssetsDashboard'));
const WorkerHistory = lazy(() => import('./components/WorkerHistory'));
const InventoryDashboard = lazy(() => import('./components/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const FarmMap = lazy(() => import('./components/FarmMap'));
const WorkerDashboard = lazy(() => import('./components/WorkerDashboard').then(m => ({ default: m.WorkerDashboard })));
const BiodiversidadView = lazy(() => import('./components/BiodiversidadView'));
const VoiceCapture = lazy(() => import('./components/VoiceCapture'));

localforage.config({
  name: 'Chagra',
  storeName: 'syncQueue'
});

const LoadingFallback = () => (
  <div className="h-[100dvh] bg-slate-950 flex items-center justify-center">
    <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
  </div>
);

const NAV_TILES = [
  { id: 'activos', label: 'Activos', icon: Warehouse, color: 'bg-teal-700', desc: 'Cultivos, zonas e infraestructura' },
  { id: 'mapa', label: 'Mapa', icon: MapPin, color: 'bg-blue-700', desc: 'Vista espacial de la finca' },
  { id: 'javier', label: 'Campo', icon: Eye, color: 'bg-green-700', desc: `Tareas por proximidad (${PRIMARY_WORKER_NAME})` },
  { id: 'bodega', label: 'Bodega', icon: Package, color: 'bg-sky-800', desc: 'Stock de biopreparados' },
  { id: 'task_log', label: 'Tareas', icon: Clock, color: 'bg-red-700', desc: 'Cola de pendientes' },
  { id: 'historial', label: 'Historial', icon: ClipboardList, color: 'bg-indigo-700', desc: 'Trazabilidad de operaciones' },
  { id: 'biodiversidad', label: 'Biodiversidad', icon: Leaf, color: 'bg-emerald-700', desc: 'Ecosistema, estratos y gremios' },
  { id: 'voz', label: 'Voz', icon: Mic, color: 'bg-lime-700', desc: 'Registro por dictado (v0.5.0)' },
];

// T2: Dashboard como componente propio con suscripción reactiva al store.
// useAssetStore() (hook) dispara re-render cuando hydrate()/syncFromServer() actualizan
// el estado, a diferencia de useAssetStore.getState() que es una lectura snapshot.
const DashboardView = React.memo(function DashboardView({ onNavigate, onLogout, lastLogMessage }) {
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
      <header className="p-4 border-b border-slate-800 shrink-0 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl flex items-center gap-2">
            <span className="w-2 h-2 bg-muzo rounded-full shadow-neon-muzo"></span>
            Chagra
          </h1>
          <span className="text-xs text-slate-500 font-mono">v{APP_VERSION}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onLogout} aria-label="Cerrar sesión" className="text-slate-400 hover:text-white px-4 py-3 min-h-[44px] bg-slate-800 rounded">Salir</button>
        </div>
      </header>
      <main className="flex-1 p-4 flex flex-col overflow-y-auto gap-4 bg-biopunk-pattern">
        <TelemetryAlerts lastFarmOsLog={lastLogMessage} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {assetCounts.map((ac) => (
            <button
              key={ac.label}
              onClick={() => onNavigate('activos')}
              aria-label={`Ver ${ac.label}: ${ac.count}`}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center hover:bg-slate-800 transition-colors"
            >
              <p className={`text-2xl font-black tabular-nums ${ac.color}`}>{ac.count}</p>
              <p className="text-2xs text-slate-500 uppercase font-bold">{ac.label}</p>
            </button>
          ))}
        </div>

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

        <PendingTasksWidget />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {NAV_TILES.map((tile) => (
            <button
              key={tile.id}
              onClick={() => onNavigate(tile.id)}
              aria-label={`${tile.label}: ${tile.desc}`}
              className={`${tile.color} active:brightness-75 transition-all rounded-xl p-4 shadow-lg text-left min-h-[80px]`}
            >
              <tile.icon size={28} strokeWidth={2} className="mb-2" aria-hidden="true" />
              <span className="text-lg font-black block">{tile.label}</span>
              <span className="text-2xs text-white/60">{tile.desc}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
});

export default function App() {
  const [currentView, setCurrentView] = useState('loading');
  const [toast, setToast] = useState(null);
  const [lastLogMessage, setLastLogMessage] = useState('');

  useEffect(() => {
    const handler = (e) => setLastLogMessage(e.detail);
    window.addEventListener('farmosLog', handler);
    return () => window.removeEventListener('farmosLog', handler);
  }, []);

  useEffect(() => {
    isAuthenticated().then((isAuth) => {
      setCurrentView(isAuth ? 'dashboard' : 'login');
    });
  }, []);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    setCurrentView('login');
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'loading':
        return <LoadingFallback />;
      case 'login':
        return <LoginScreen onLoginSuccess={() => setCurrentView('dashboard')} onSave={showToast} />;
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentView} onLogout={handleLogout} lastLogMessage={lastLogMessage} />;
      case 'sembrar':
        return <SeedingLog onBack={() => setCurrentView('dashboard')} onSave={showToast} />;
      case 'cosechar':
        return <HarvestLog onBack={() => setCurrentView('dashboard')} onSave={showToast} />;
      case 'insumos':
        return <InputLog onBack={() => setCurrentView('dashboard')} onSave={showToast} />;
      case 'plant_asset':
        return <PlantAssetLog onBack={() => setCurrentView('dashboard')} onSave={showToast} />;
      case 'observacion':
        return <ObservationScreen onBack={() => setCurrentView('dashboard')} onSave={showToast} />;
      case 'mantenimiento':
        return <MaintenanceScreen onBack={() => setCurrentView('dashboard')} onSave={showToast} />;
      case 'task_log':
        return <TaskLogScreen onBack={() => setCurrentView('dashboard')} />;
      case 'javier':
        return (
          <ScreenShell title={`Campo — ${PRIMARY_WORKER_NAME}`} icon={Eye} onBack={() => setCurrentView('dashboard')}>
            <WorkerDashboard />
          </ScreenShell>
        );
      case 'mapa':
        return (
          <ScreenShell title="Mapa de la Finca" icon={MapPin} onBack={() => setCurrentView('dashboard')}>
            <FarmMap onAssetClick={(id) => {
              useAssetStore.getState().setSelectedAsset(id);
              setCurrentView('activos');
            }} />
          </ScreenShell>
        );
      case 'activos':
        return <AssetsDashboard onBack={() => setCurrentView('dashboard')} />;
      case 'bodega':
        return (
          <ScreenShell title="Bodega" icon={Package} onBack={() => setCurrentView('dashboard')}>
            <InventoryDashboard />
          </ScreenShell>
        );
      case 'historial':
        return <WorkerHistory onBack={() => setCurrentView('dashboard')} />;
      case 'biodiversidad':
        return <BiodiversidadView onBack={() => setCurrentView('dashboard')} />;
      case 'voz':
        return (
          <ScreenShell title="Registro por voz" icon={Mic} onBack={() => setCurrentView('dashboard')}>
            <VoiceCapture onSave={showToast} />
          </ScreenShell>
        );
      default:
        return <div className="h-[100dvh] bg-slate-950 text-white flex items-center justify-center">Vista no disponible</div>;
    }
  };

  return (
    <>
      <NetworkStatusBar />
      <Suspense fallback={<LoadingFallback />}>
        {renderView()}
      </Suspense>
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
