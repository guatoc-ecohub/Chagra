import React, { useState, useEffect, useRef } from 'react';
import { Sprout, Tractor, Package, Eye, Wrench, Camera, MapPin, ArrowLeft, CheckCircle, WifiOff, RefreshCw, Wifi, Clock, Warehouse, ClipboardList } from 'lucide-react';
import localforage from 'localforage';

import { getAccessToken, authenticateUser, logoutUser, isAuthenticated } from './services/authService';
import { sendToFarmOS } from './services/apiService';
import TelemetryAlerts from './components/TelemetryAlerts';
import SyncIndicator from './components/SyncIndicator';
import ObservationScreen from './components/ObservationScreen';
import MaintenanceScreen from './components/MaintenanceScreen';
import TaskLogScreen from './components/TaskLogScreen';
import PendingTasksWidget from './components/PendingTasksWidget';
import AssetsDashboard from './components/AssetsDashboard';
import WorkerHistory from './components/WorkerHistory';
import { InventoryDashboard } from './components/InventoryDashboard';
import { ScreenShell } from './components/common/ScreenShell';
import useAssetStore from './store/useAssetStore';
import { useLogStore } from './store/useLogStore';
import FarmMap from './components/FarmMap';
import { WorkerDashboard } from './components/WorkerDashboard';
import { PRIMARY_WORKER_NAME } from './config/workerConfig';
import { version as APP_VERSION } from '../package.json';
import NetworkStatusBar from './components/NetworkStatusBar';
import { syncManager } from './services/syncManager';
import { FARM_CONFIG } from './config/defaults';

localforage.config({
  name: 'Chagra',
  storeName: 'syncQueue'
});

const savePayload = async (type, payload) => {
  console.log(`Payload Chagra (${type}):`, JSON.stringify(payload, null, 2));
  if (navigator.onLine) {
    try {
      // Fase 1.5: Resolver entidades anidadas y limpiar mock IDs
      const isUUID = (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

      if (payload.data.relationships) {
        for (const [relName, relData] of Object.entries(payload.data.relationships)) {
          if (!relData.data) continue;

          const processItem = async (item) => {
            if (!item.id && item.attributes) {
              const parts = item.type.split('--');
              const inlineEndpoint = `/api/${parts[0]}/${parts[1]}`;

              // Limpieza recursiva para la entidad anidada
              const safeRels = {};
              if (item.relationships) {
                Object.entries(item.relationships).forEach(([rk, rv]) => {
                  if (!rv.data) return;
                  const subItems = Array.isArray(rv.data) ? rv.data : [rv.data];
                  const filtered = subItems.filter(d => d.id && isUUID(d.id));
                  if (filtered.length > 0) {
                    safeRels[rk] = { data: Array.isArray(rv.data) ? filtered : filtered[0] };
                  }
                });
              }

              const inlinePayload = {
                data: {
                  type: item.type,
                  attributes: item.attributes,
                  ...(Object.keys(safeRels).length > 0 ? { relationships: safeRels } : {})
                }
              };

              const result = await sendToFarmOS(inlineEndpoint, inlinePayload);
              return { type: item.type, id: result.data.id };
            }
            return item;
          };

          let items = Array.isArray(relData.data) ? relData.data : [relData.data];
          items = await Promise.all(items.map(processItem));
          items = items.filter(d => d.attributes || (d.id && isUUID(d.id)));

          if (items.length === 0) {
            delete payload.data.relationships[relName];
          } else {
            payload.data.relationships[relName].data = Array.isArray(relData.data) ? items : items[0];
          }
        }
      }

      const endpoint = type === 'plant_asset' ? '/api/asset/plant' :
        type === 'input' ? '/api/log/input' :
          type === 'harvest' ? '/api/log/harvest' :
            '/api/log/seeding';

      if (payload._multipartFile) delete payload._multipartFile;
      if (payload.data.attributes) {
        Object.keys(payload.data.attributes).forEach(key => {
          if (key.startsWith('_')) delete payload.data.attributes[key];
        });
      }

      const result = await sendToFarmOS(endpoint, payload);
      // Actualizar el estado global con el nombre de la última acción para la IA
      if (typeof window !== 'undefined' && window.setLastLog) {
        window.setLastLog(payload.data.attributes.name);
      }
      return { success: true, message: 'Guardado y sincronizado con servidor', data: result };
    } catch (error) {
      console.warn("API Error, falling back to offline", error);
      await syncManager.saveTransaction({ type: type.replace("plant_asset", "planting"), payload: { ...payload, endpoint } });
      return { success: false, message: `Guardado local. Pendiente de sincronización (${error.message})` };
    }
  } else {
    await syncManager.saveTransaction({ type: type.replace("plant_asset", "planting"), payload: { ...payload, endpoint } });
    return { success: false, message: 'Sin conexión. Guardado localmente. Pendiente sincronización' };
  }
};

const enqueueOffline = async (payload) => {
  const queue = await localforage.getItem('syncQueue') || [];
  queue.push({ id: crypto.randomUUID(), payload, timestamp: new Date().toISOString() });
  await localforage.setItem('syncQueue', queue);
};

// Tiles de navegación principal — reducidos para Command Center.
// Las acciones de Sembrar/Cosechar/Insumo viven dentro de Activos (drill-down).
const NAV_TILES = [
  { id: 'activos', label: 'Activos', icon: Warehouse, color: 'bg-teal-700', desc: 'Cultivos, zonas e infraestructura' },
  { id: 'mapa', label: 'Mapa', icon: MapPin, color: 'bg-blue-700', desc: 'Vista espacial de la finca' },
  { id: 'javier', label: 'Campo', icon: Eye, color: 'bg-green-700', desc: `Tareas por proximidad (${PRIMARY_WORKER_NAME})` },
  { id: 'bodega', label: 'Bodega', icon: Package, color: 'bg-sky-800', desc: 'Stock de biopreparados' },
  { id: 'task_log', label: 'Tareas', icon: Clock, color: 'bg-red-700', desc: 'Cola de pendientes' },
  { id: 'historial', label: 'Historial', icon: ClipboardList, color: 'bg-indigo-700', desc: 'Trazabilidad de operaciones' },
];

export default function App() {
  const [currentView, setCurrentView] = useState('loading');
  const [toast, setToast] = useState(null);
  const [lastLogMessage, setLastLogMessage] = useState('');

  // Exponer setLastLog globalmente para ser llamado desde savePayload
  useEffect(() => {
    window.setLastLog = setLastLogMessage;
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const isAuth = await isAuthenticated();
    setCurrentView(isAuth ? 'dashboard' : 'login');
  };

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentView('login');
  };

  const renderDashboard = () => {
    const { plants, structures, materials, lands } = useAssetStore.getState();
    const allAssets = [...plants, ...structures, ...lands];
    const noGeoCount = allAssets.filter((a) => {
      const geo = a.attributes?.intrinsic_geometry;
      return !geo || !(typeof geo === 'object' ? geo.value : geo);
    }).length;
    const assetCounts = [
      { label: 'Cultivos', count: plants.length, color: 'text-lime-400' },
      { label: 'Zonas', count: lands.length, color: 'text-amber-400' },
      { label: 'Infraestructura', count: structures.length, color: 'text-emerald-400' },
      { label: 'Insumos', count: materials.length, color: 'text-sky-400' },
    ];

    return (
      <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col overflow-hidden">
        <header className="p-4 border-b border-slate-800 shrink-0 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex flex-col gap-1">
            <h1 className="font-bold text-2xl flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Chagra
            </h1>
            <span className="text-xs text-slate-500 font-mono">v{APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded">Salir</button>
          </div>
        </header>
        <main className="flex-1 p-4 flex flex-col overflow-y-auto gap-4">
          {/* Telemetría + IA */}
          <TelemetryAlerts lastFarmOsLog={lastLogMessage} />

          {/* Resumen de activos (cards con contadores) */}
          <div className="grid grid-cols-4 gap-2">
            {assetCounts.map((ac) => (
              <button
                key={ac.label}
                onClick={() => setCurrentView('activos')}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center hover:bg-slate-800 transition-colors"
              >
                <p className={`text-2xl font-black tabular-nums ${ac.color}`}>{ac.count}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold">{ac.label}</p>
              </button>
            ))}
          </div>

          {/* Indicador de activos sin geo (Fase 19) */}
          {noGeoCount > 0 && (
            <button
              onClick={() => setCurrentView('activos')}
              className="w-full p-3 rounded-xl bg-amber-900/20 border border-amber-800/50 flex items-center justify-between hover:bg-amber-900/30 transition-colors"
            >
              <span className="text-xs text-amber-400 font-bold flex items-center gap-2">
                <MapPin size={14} />
                {noGeoCount} activo{noGeoCount > 1 ? 's' : ''} sin ubicación registrada
              </span>
              <span className="text-[10px] text-amber-400/60">Tocar para corregir →</span>
            </button>
          )}

          {/* Tareas pendientes (compacto) */}
          <PendingTasksWidget />

          {/* Navegación principal */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NAV_TILES.map((tile) => (
              <button
                key={tile.id}
                onClick={() => setCurrentView(tile.id)}
                className={`${tile.color} active:brightness-75 transition-all rounded-xl p-4 shadow-lg text-left min-h-[80px]`}
              >
                <tile.icon size={28} strokeWidth={2} className="mb-2" />
                <span className="text-lg font-black block">{tile.label}</span>
                <span className="text-[10px] text-white/60">{tile.desc}</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  };

  const handleNavigation = (targetView, params = {}) => {
    setCurrentView(targetView);
    // Almacenar parámetros para pre-diligenciar formularios
    window.navigationParams = params;
  };

  const renderView = () => {
    switch (currentView) {
      case 'loading':
        return <div className="h-[100dvh] bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div></div>;
      case 'login':
        return <LoginScreen onLoginSuccess={() => setCurrentView('dashboard')} onSave={showToast} />;
      case 'dashboard':
        return renderDashboard();
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
          <ScreenShell
            title="Bodega"
            icon={Package}
            onBack={() => setCurrentView('dashboard')}
          >
            <InventoryDashboard />
          </ScreenShell>
        );
      case 'historial':
        return <WorkerHistory onBack={() => setCurrentView('dashboard')} />;
      default:
        return <div className="h-[100dvh] bg-slate-950 text-white flex items-center justify-center">Vista no disponible</div>;
    }
  };

  return (
    <>
      <NetworkStatusBar />
      {renderView()}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 p-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 w-11/12 max-w-sm border-2 ${toast.isError ? 'bg-amber-700 border-amber-500' : 'bg-green-700 border-green-500'}`}>
          {toast.isError ? <WifiOff size={32} className="shrink-0" /> : <CheckCircle size={32} className="shrink-0" />}
          <p className="text-lg font-bold text-white leading-tight">{toast.message}</p>
        </div>
      )}
    </>
  );
}

// -----------------------------------------------------
// LOGIN SCREEN
// -----------------------------------------------------
function LoginScreen({ onLoginSuccess, onSave }) {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!creds.username || !creds.password) {
      onSave('Ingresa usuario y contraseña', true);
      return;
    }

    setLoading(true);
    const result = await authenticateUser(creds.username, creds.password);
    setLoading(false);

    if (result.success) {
      onLoginSuccess();
    } else {
      onSave(result.error || 'Error autenticando', true);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="w-32 h-32 bg-green-900 rounded-full flex items-center justify-center shadow-lg shadow-green-900/50">
          <Sprout size={72} className="text-green-400" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-green-400 animate-bounce">Chagra</h1>
          <span className="text-sm text-slate-500 font-mono mt-2">v{APP_VERSION}</span>
        </div>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Usuario</span>
            <input
              type="text"
              value={creds.username}
              onChange={e => setCreds(prev => ({ ...prev, username: e.target.value }))}
              className="p-5 rounded-xl bg-slate-900 border border-slate-700 text-2xl min-h-[64px]"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Contraseña</span>
            <input
              type="password"
              value={creds.password}
              onChange={e => setCreds(prev => ({ ...prev, password: e.target.value }))}
              className="p-5 rounded-xl bg-slate-900 border border-slate-700 text-2xl min-h-[64px]"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 p-6 rounded-xl bg-green-600 active:bg-green-500 text-2xl font-black shadow-xl min-h-[80px] border-b-4 border-green-800 disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div> : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// HARVEST LOG COMPONENT
// -----------------------------------------------------
const MOCK_AREAS = [
  { id: 'area-1', name: 'Invernadero Principal' },
  { id: 'area-2', name: 'Lote Fresa Zona 1' },
  { id: 'area-3', name: 'Lote Mora Norte' },
];

const MOCK_SUB_AREAS = {
  'area-1': [
    { id: 'sub-1-1', name: 'Cama 1 - Tomate', suggest: 'Tomate Chonto' },
    { id: 'sub-1-2', name: 'Cama 2 - Pimiento', suggest: 'Pimiento Rojo' }
  ],
  'area-2': [
    { id: 'sub-2-1', name: 'Sector Norte', suggest: 'Fresa Monterrey' },
    { id: 'sub-2-2', name: 'Sector Sur', suggest: 'Fresa Albión' }
  ],
  'area-3': [
    { id: 'sub-3-1', name: 'Borde', suggest: 'Mora Castilla' },
    { id: 'sub-3-2', name: 'Interior', suggest: 'Mora Sin Espinas' }
  ]
};

function HarvestLog({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mainArea: '',
    subArea: '',
    product: '',
    quantity: '',
    unit: 'Kilogramos',
    notes: ''
  });

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'mainArea') {
        next.subArea = '';
        next.product = '';
      }
      if (name === 'subArea') {
        const subs = MOCK_SUB_AREAS[next.mainArea] || [];
        const selected = subs.find(s => s.id === value);
        if (selected) next.product = selected.suggest;
      }
      return next;
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.subArea || !formData.quantity || !formData.product) {
        onSave('Completa Sub-área, Producto y Cantidad', true);
        return;
      }

      const payload = {
        data: {
          type: "log--harvest",
          attributes: {
            name: `Cosecha de ${formData.product}`,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: "done",
            notes: formData.notes || ""
          },
          relationships: {
            asset: {
              data: [{ type: "asset--plant", id: formData.subArea }]
            },
            quantity: {
              data: [{
                type: "quantity--standard",
                attributes: {
                  measure: "weight",
                  value: { decimal: String(formData.quantity) },
                  label: formData.unit
                }
              }]
            }
          }
        }
      };

      const result = await savePayload('harvest', payload);
      onSave(result.message || 'Registro guardado localmente (Pendiente de sincronización)', !result.success);

      // Reset partial state and navigate back
      setFormData(prev => ({ ...prev, quantity: '', notes: '' }));
      setTimeout(() => onBack(), 500); // Pequeño delay para feedback visual
    } catch (error) {
      console.error('Error en HarvestLog handleSave:', error);
      onSave('Error al guardar registro', true);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} />
        </button>
        <h2 className="text-3xl font-bold truncate">Cosechar</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Fecha</span>
          <input type="date" name="date" value={formData.date} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Área Principal</span>
          <select name="mainArea" value={formData.mainArea} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            <option value="">-- Seleccionar --</option>
            {MOCK_AREAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        {formData.mainArea && (
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Segmento / Sub-área</span>
            <select name="subArea" value={formData.subArea} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
              <option value="">-- Seleccionar --</option>
              {MOCK_SUB_AREAS[formData.mainArea]?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Producto</span>
          <input type="text" name="product" value={formData.product} onChange={handleInput} placeholder="Ej: Fresa Monterrey" className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] placeholder-slate-500" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Cantidad</span>
            <input type="number" step="0.01" name="quantity" value={formData.quantity} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" placeholder="0.00" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Unidad</span>
            <select name="unit" value={formData.unit} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[64px] appearance-none">
              <option value="Kilogramos">Kilogramos</option>
              <option value="Gramos">Gramos</option>
              <option value="Unidades">Unidades</option>
              <option value="Manojos">Manojos</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Observaciones (Opcional)</span>
          <textarea name="notes" rows="3" value={formData.notes} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px] placeholder-slate-500" placeholder="Ej: Fruta de tamaño pequeño o picada..." />
        </label>

        <button onClick={handleSave} className="mt-4 p-6 rounded-xl bg-orange-600 active:bg-orange-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-orange-800">
          Guardar Cosecha
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// SEEDING LOG COMPONENT
// -----------------------------------------------------
function SeedingLog({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    crop: '',
    variety: '',
    quantity: ''
  });
  const [photo, setPhoto] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [coordinates, setCoordinates] = useState([]);
  const watchIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleInput = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsRecording(false);
    } else {
      setCoordinates([]);
      setIsRecording(true);
      if ("geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => setCoordinates(prev => [...prev, [pos.coords.longitude, pos.coords.latitude]]),
          (err) => console.error(err),
          { enableHighAccuracy: true }
        );
      }
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.crop || !formData.quantity) {
        onSave('Completa Cultivo y Cantidad', true);
        return;
      }

      const payload = {
        data: {
          type: "log--seeding",
          attributes: {
            name: `Siembra de ${formData.crop} - ${formData.variety || 'N/A'}`,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: "done",
            _localPhotoName: photo ? photo.name : null,
            ...(coordinates.length >= 3 ? {
              geometry: {
                type: "Polygon",
                coordinates: [[...coordinates, coordinates[0]]]
              }
            } : {})
          },
          relationships: {
            quantity: {
              data: [{
                type: "quantity--standard",
                attributes: {
                  measure: "count",
                  value: { decimal: String(formData.quantity) },
                  label: "Plántulas"
                }
              }]
            }
          }
        }
      };

      const result = await savePayload('seeding', payload);
      onSave(result.message || 'Registro guardado localmente (Pendiente de sincronización)', !result.success);

      // Reset complete state and navigate back
      setFormData({ date: new Date().toISOString().split('T')[0], crop: '', variety: '', quantity: '' });
      setPhoto(null);
      setCoordinates([]);
      setTimeout(() => onBack(), 500); // Pequeño delay para feedback visual
    } catch (error) {
      console.error('Error en SeedingLog handleSave:', error);
      onSave('Error al guardar registro', true);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} />
        </button>
        <h2 className="text-3xl font-bold truncate">Sembrar</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Fecha</span>
          <input type="date" name="date" value={formData.date} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Cultivo</span>
          <input type="text" name="crop" placeholder="Ej: Fresa" value={formData.crop} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white placeholder-slate-500 min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Variedad</span>
          <input type="text" name="variety" value={formData.variety} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Cantidad de Plántulas</span>
          <input type="number" name="quantity" min="1" value={formData.quantity} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Evidencia Fotográfica</span>
          <label className="flex items-center justify-center gap-3 p-6 rounded-xl bg-slate-900 border-2 border-dashed border-slate-600 active:bg-slate-800 text-2xl cursor-pointer min-h-[80px]">
            <Camera size={36} />
            <span className="truncate">{photo ? photo.name : 'Tomar Foto'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={e => setPhoto(e.target.files[0])} className="hidden" />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Mapeo Geoespacial</span>
          <button onClick={toggleRecording} className={`p-5 rounded-xl text-2xl font-bold flex justify-center items-center gap-3 shadow-md min-h-[80px] ${isRecording ? 'bg-red-600 text-white border-b-4 border-red-800' : 'bg-slate-800 border-2 border-slate-600'}`}>
            <MapPin size={32} />
            {isRecording ? 'Detener Trazado' : 'Definir Área'}
          </button>
          {isRecording && <div className="text-yellow-400 font-bold text-xl text-center animate-pulse mt-2">Grabando ruta... {coordinates.length} puntos registrados</div>}
        </div>

        <button onClick={handleSave} className="mt-4 p-6 rounded-xl bg-green-600 active:bg-green-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-green-800">
          Guardar Registro
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// INPUT LOG COMPONENT (ABONOS / BIOPREPARADOS)
// -----------------------------------------------------
const INPUT_MATERIALS = [
  { id: 'mat-bio', name: 'Bioactivador Lácteo' },
  { id: 'mat-lombri', name: 'Lombricompost' },
  { id: 'mat-agua', name: 'Agua de Riego' },
  { id: 'mat-galli', name: 'Gallinaza' }
];

const defaultLocation = {
  id: FARM_CONFIG.LOCATION_ID,
  name: FARM_CONFIG.FARM_NAME
};

const REAL_LAND_ASSETS = [defaultLocation];

const APPLICATION_METHODS = [
  "Foliar", "Drench/Al suelo", "Inoculación de semillas", "Incorporación"
];

function InputLog({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationId: FARM_CONFIG.LOCATION_ID,
    materialId: '',
    method: 'Foliar',
    quantity: '',
    unit: 'Litros',
    notes: ''
  });

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'mainArea') next.subArea = '';
      return next;
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.locationId || !formData.materialId || !formData.quantity) {
        onSave('Completa Ubicación, Tipo de Insumo y Cantidad', true);
        return;
      }

      const materialName = INPUT_MATERIALS.find(m => m.id === formData.materialId)?.name;
      const inventoryValue = -Math.abs(parseFloat(formData.quantity));

      const payload = {
        data: {
          type: "log--input",
          attributes: {
            name: `Aplicación de ${materialName}`,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: "done",
            notes: `${formData.notes}\nMétodo: ${formData.method}`.trim()
          },
          relationships: {
            location: {
              data: [{ type: "asset--land", id: formData.locationId }]
            },
            category: {
              data: [{
                type: "taxonomy_term--material",
                attributes: { name: materialName }
              }]
            },
            quantity: {
              data: [{
                type: "quantity--standard",
                attributes: {
                  measure: formData.unit === "Litros" || formData.unit === "Mililitros" ? "volume" : "weight",
                  value: { decimal: String(inventoryValue) },
                  label: `Extracción (${formData.unit})`
                }
              }]
            }
          }
        }
      };

      const result = await savePayload('input', payload);
      onSave(result.message || 'Registro guardado localmente (Pendiente de sincronización)', !result.success);

      // Reset partial state and navigate back
      setFormData(prev => ({ ...prev, quantity: '', notes: '' }));
      setTimeout(() => onBack(), 500); // Pequeño delay para feedback visual
    } catch (error) {
      console.error('Error en InputLog handleSave:', error);
      onSave('Error al guardar registro', true);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} />
        </button>
        <h2 className="text-3xl font-bold truncate">Insumos</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Fecha de Aplicación</span>
          <input type="date" name="date" value={formData.date} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Ubicación / Polígono</span>
          <select name="locationId" value={formData.locationId} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            {REAL_LAND_ASSETS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Tipo de Insumo</span>
          <select name="materialId" value={formData.materialId} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[64px] appearance-none">
            <option value="">-- Seleccionar --</option>
            {INPUT_MATERIALS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Método de Aplicación</span>
          <select name="method" value={formData.method} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[64px] appearance-none">
            {APPLICATION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Cantidad</span>
            <input type="number" step="0.01" name="quantity" value={formData.quantity} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" placeholder="0.00" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Unidad</span>
            <select name="unit" value={formData.unit} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[64px] appearance-none">
              <option value="Litros">Litros</option>
              <option value="Kilogramos">Kilogramos</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Notas Adicionales</span>
          <textarea name="notes" rows="3" value={formData.notes} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px]" placeholder="Ej: Observaciones sobre el estado del suelo..." />
        </label>

        <button onClick={handleSave} className="mt-4 p-6 rounded-xl bg-blue-600 active:bg-blue-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-blue-800">
          Registrar Aplicación
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// PLANT ASSET LOG (MAPEAR PLANTAS / OBSERVACIÓN)
// -----------------------------------------------------
const ASSET_TYPES = [
  { id: 'type-1', name: 'Árbol Frutal' },
  { id: 'type-2', name: 'Arbusto' },
  { id: 'type-3', name: 'Sensor IoT' },
  { id: 'type-4', name: 'Estructura' }
];

const HEALTH_STATUSES = [
  "Sano", "En recuperación", "Plaga detectada"
];

function PlantAssetLog({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    assetType: 'type-1',
    species: '',
    variety: '',
    healthStatus: 'Sano'
  });
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const handleInput = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(URL.createObjectURL(file));
    }
  };

  const captureLocation = () => {
    setIsLocating(true);
    setLocation(null);

    if (!("geolocation" in navigator)) {
      onSave("Geolocalización no soportada", true);
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy,
          wkt: `POINT (${pos.coords.longitude} ${pos.coords.latitude})`
        });
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        onSave("Error obteniendo ubicación", true);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async () => {
    if (!formData.species || !location) {
      onSave('Completa Especie/Nombre y captura la coordenada', true);
      return;
    }

    const payload = {
      // 1. Fase del Archivo (Multipart pre-embalo o pseudo-referencia de estado)
      _multipartFile: photo ? {
        name: photo.name,
        type: photo.type,
        size: photo.size,
        file: photo // En una app real, localforage guardaría un blob si hay fallback
      } : null,

      // 2. Fase del JSON:API Asset
      data: {
        type: "asset--plant",
        attributes: {
          name: `${formData.species} - ${formData.variety || 'N/A'}`,
          status: "active",
          intrinsic_geometry: location.wkt,
          notes: `Estado Sanitario: ${formData.healthStatus}`
        },
        relationships: {
          plant_type: {
            data: [{ type: "taxonomy_term--plant_type", id: formData.assetType }]
          },
          // Si hubiese UUID real de la imagen tras fase 1, se inyectaría aquí:
          // file: { data: [{ type: "file--file", id: "UUID_DE_IMAGEN_SUBIDA" }] }
        }
      }
    };

    const result = await savePayload('plant_asset', payload);
    onSave(result.message, !result.success);

    // Reset state
    setFormData({ assetType: 'type-1', species: '', variety: '', healthStatus: 'Sano' });
    setPhoto(null);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    setLocation(null);
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} />
        </button>
        <h2 className="text-3xl font-bold truncate">Mapear Planta</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Tipo de Activo</span>
          <select name="assetType" value={formData.assetType} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            {ASSET_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Especie / Nombre</span>
          <input type="text" name="species" value={formData.species} onChange={handleInput} placeholder="Ej: Limón Tahití" className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white placeholder-slate-500 min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Variedad (Opcional)</span>
          <input type="text" name="variety" value={formData.variety} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Estado Sanitario Inicial</span>
          <select name="healthStatus" value={formData.healthStatus} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Coordenadas Exactas (WKT)</span>
          <button onClick={captureLocation} disabled={isLocating} className="p-5 rounded-xl text-2xl font-bold flex justify-center items-center gap-3 shadow-md min-h-[80px] bg-slate-800 border-2 border-slate-600 active:bg-slate-700 disabled:opacity-50">
            <MapPin size={32} />
            {isLocating ? 'Obteniendo GPS...' : 'Capturar Coordenada'}
          </button>
          {location && (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl mt-2 text-sm overflow-x-auto text-yellow-300">
              <p>✔ Precisión: ±{location.acc.toFixed(1)} metros</p>
              <p className="font-mono mt-1 whitespace-nowrap">{location.wkt}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Fotografía del Activo</span>
          <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-slate-900 border-2 border-dashed border-slate-600 active:bg-slate-800 cursor-pointer min-h-[120px] overflow-hidden relative">
            {photoUrl ? (
              <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            ) : null}
            <div className="z-10 flex flex-col items-center gap-2 drop-shadow-md">
              <Camera size={48} />
              <span className="text-xl font-bold">{photo ? 'Cambiar Foto' : 'Tomar Foto'}</span>
            </div>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
          </label>
        </div>

        <button onClick={handleSave} className="mt-4 p-6 rounded-xl bg-purple-600 active:bg-purple-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-purple-800">
          Guardar Activo
        </button>
      </div>
    </div>
  );
}
