import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle, Clock, RefreshCw, Wifi, WifiOff, CloudOff, Cloud, Sprout, Apple, TreePine, Building2, Wrench, Leaf, Droplets, Eye } from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { logCache } from '../db/logCache';
import StatusBadge from './StatusBadge';

const TRANSACTION_TYPE_LABELS = {
  asset_plant: 'Cultivo / Árbol',
  asset_structure: 'Infraestructura',
  asset_equipment: 'Herramienta',
  asset_material: 'Insumo orgánico',
  planting: 'Siembra',
  seeding: 'Siembra registrada',
  harvest: 'Cosecha registrada',
  input: 'Aplicación de biopreparado',
  maintenance: 'Mantenimiento',
  observation: 'Observación',
  activity: 'Tarea de campo',
};

const TRANSACTION_TYPE_COLORS = {
  asset_plant: 'text-lime-400 bg-lime-900/30',
  asset_structure: 'text-emerald-400 bg-emerald-900/30',
  asset_equipment: 'text-orange-400 bg-orange-900/30',
  asset_material: 'text-sky-400 bg-sky-900/30',
  planting: 'text-green-400 bg-green-900/30',
  seeding: 'text-green-400 bg-green-900/30',
  harvest: 'text-amber-400 bg-amber-900/30',
  input: 'text-blue-400 bg-blue-900/30',
  maintenance: 'text-slate-300 bg-slate-700/30',
  observation: 'text-purple-400 bg-purple-900/30',
  activity: 'text-cyan-400 bg-cyan-900/30',
};

const TRANSACTION_TYPE_ICONS = {
  asset_plant: TreePine,
  asset_structure: Building2,
  asset_equipment: Wrench,
  asset_material: Leaf,
  planting: Sprout,
  seeding: Sprout,
  harvest: Apple,
  input: Droplets,
  maintenance: Wrench,
  observation: Eye,
  activity: Clock,
};

export default function WorkerHistory({ onBack, onEntryClick }) {
  const [activeSection, setActiveSection] = useState('recientes');
  const [pendingTx, setPendingTx] = useState([]);
  const [recentSyncedLogs, setRecentSyncedLogs] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const loadPendingTransactions = useCallback(async () => {
    try {
      await syncManager.initDB();
      const all = await syncManager.getPendingTransactions();
      // Mostrar más recientes primero
      setPendingTx(all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    } catch (err) {
      console.error('Error cargando transacciones pendientes:', err);
    }
  }, []);

  const loadCompletedTasks = useCallback(async () => {
    // Fase 8.5: consulta unificada al caché local de IndexedDB.
    // El pull de red ya incluye tareas done (ver syncManager.fetchPendingTasksFromFarmOS).
    // Si hay conexión, refrescamos antes de leer el store; si no, leemos directo.
    try {
      if (navigator.onLine) {
        await syncManager.fetchPendingTasksFromFarmOS();
      }
      const allTasks = await syncManager.getPendingTasks();
      const historyData = allTasks
        .filter((t) =>
          t.status === 'done' ||
          t.attributes?.status === 'done' ||
          t.severity === 'completed'
        )
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setCompletedTasks(historyData);
    } catch (err) {
      console.error('Error cargando tareas completadas:', err);
    }
  }, []);

  const loadRecentSyncedLogs = useCallback(async () => {
    try {
      const recent = await logCache.getRecent24h();
      setRecentSyncedLogs(recent);
    } catch (err) {
      console.error('Error cargando logs sincronizados recientes:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.allSettled([loadPendingTransactions(), loadCompletedTasks(), loadRecentSyncedLogs()]);
    setIsLoading(false);
  }, [loadPendingTransactions, loadCompletedTasks, loadRecentSyncedLogs]);

  useEffect(() => {
    // Sync inicial: hidratar la vista al montar el componente.
    // setIsLoading + setPendingTx resultantes son la sincronización
    // legítima entre IndexedDB (sistema externo) y React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const onTaskAdded = () => loadPendingTransactions();
    const onSyncCompleted = () => loadRecentSyncedLogs();
    window.addEventListener('taskAdded', onTaskAdded);
    window.addEventListener('syncCompleted', onSyncCompleted);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('taskAdded', onTaskAdded);
      window.removeEventListener('syncCompleted', onSyncCompleted);
    };
  }, [loadData, loadPendingTransactions, loadRecentSyncedLogs]);

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  const getTransactionName = (tx) => {
    const name = tx.payload?.data?.attributes?.name;
    if (!name) return TRANSACTION_TYPE_LABELS[tx.type] || tx.type || 'Registro';

    // Texto descriptivo para cosecha y siembra
    if (tx.type === 'harvest') {
      const qty = tx.payload?.data?.relationships?.quantity?.data?.[0]?.attributes;
      if (qty) return `Cosecha registrada: ${qty.value?.decimal || ''} ${qty.label || ''} de ${name}`;
      return `Cosecha registrada: ${name}`;
    }
    if (tx.type === 'seeding') return `Siembra registrada: ${name.replace('Siembra: ', '')}`;

    return name;
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-4 shrink-0 shadow-md">
        <button onClick={onBack} aria-label="Volver" className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[48px] min-w-[48px] flex justify-center items-center shrink-0">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black flex-1">Historial</h2>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi size={14} className="text-green-400" />
          ) : (
            <WifiOff size={14} className="text-red-400" />
          )}
          <button onClick={loadData} disabled={isLoading} aria-label="Recargar datos" className="p-2 bg-slate-800 rounded-lg active:bg-slate-700 disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="flex border-b border-slate-800 shrink-0">
        <button
          onClick={() => setActiveSection('recientes')}
          className={`flex-1 p-3 font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] ${activeSection === 'recientes'
            ? 'text-amber-400 border-b-2 border-amber-500'
            : 'text-slate-500 hover:text-slate-300'
            }`}
        >
          <Clock size={16} />
          Registros Recientes
          {pendingTx.length > 0 && (
            <span className="text-xs bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded-full">{pendingTx.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveSection('completadas')}
          className={`flex-1 p-3 font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] ${activeSection === 'completadas'
            ? 'text-green-400 border-b-2 border-green-500'
            : 'text-slate-500 hover:text-slate-300'
            }`}
        >
          <CheckCircle size={16} />
          Completadas
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-slate-500" />
            <span className="ml-3 text-slate-500">Cargando...</span>
          </div>
        )}

        {/* Registros Recientes (pending_transactions) */}
        {activeSection === 'recientes' && !isLoading && (
          <>
            {/* Honesty note reemplazada: Parte C fulfilled */}
            <p className="text-[11px] text-slate-500 italic px-2 py-2 leading-relaxed">
              Últimas 24h. Para historial completo: Activos, planta, Bitácora.
            </p>
            {(() => {
              // Combinar pending + synced 24h, sort por timestamp desc
              const pendingItems = pendingTx.map(tx => ({ ...tx, _source: 'pending' }));
              const syncedItems = recentSyncedLogs.map(log => ({ ...log, _source: 'synced' }));
              const all = [...pendingItems, ...syncedItems].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

              if (all.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Cloud size={48} className="mb-3 opacity-30" />
                    <p className="text-lg">Aún no hay registros en las últimas 24h</p>
                    <p className="text-sm mt-1">Cuando grabes algo, aparece aquí</p>
                  </div>
                );
              }

              return all.map((item, idx) => {
                const isPending = item._source === 'pending';
                const txType = item.type;
                const typeColor = TRANSACTION_TYPE_COLORS[txType] || 'text-slate-400 bg-slate-700/30';
                const name = isPending ? getTransactionName(item) : (item.name || item.type || 'Registro');
                const TxIcon = TRANSACTION_TYPE_ICONS[txType] || Clock;

                const Wrap = onEntryClick ? 'button' : 'div';
                const wrapProps = onEntryClick
                  ? { type: 'button', onClick: () => onEntryClick(item), 'aria-label': `Ver detalle: ${name}` }
                  : {};
                return (
                  <Wrap
                    key={item.id || idx}
                    {...wrapProps}
                    className={`w-full text-left p-4 rounded-xl border transition-all hover:border-slate-400 active:bg-slate-700 ${
                      isPending
                        ? 'bg-slate-800 border-dashed border-slate-600'
                        : 'bg-slate-800/70 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`p-2 rounded-lg ${typeColor} shrink-0 mt-0.5`}>
                        <TxIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColor}`}>
                            {isPending ? (TRANSACTION_TYPE_LABELS[item.type] || item.type || 'Registro') : (item.type || 'Registro').replace('log--', '')}
                          </span>
                          {isPending ? (
                            <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <CloudOff size={10} />
                              Pendiente
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <Cloud size={10} />
                              Sincronizado
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-200 text-base truncate">{name}</h4>
                      </div>
                      <span className="text-xs text-slate-500 shrink-0 mt-1">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                  </Wrap>
                );
              });
            })()}

            {pendingTx.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-900/10 border border-amber-800/30 text-center">
                <p className="text-xs text-amber-400/80">
                  {isOnline
                    ? 'Estos registros se sincronizarán automáticamente con FarmOS'
                    : 'Se sincronizarán cuando se restablezca la conexión'}
                </p>
              </div>
            )}
            {recentSyncedLogs.length > 0 && pendingTx.length === 0 && (
              <div className="p-3 rounded-xl bg-emerald-900/10 border border-emerald-800/30 text-center">
                <p className="text-xs text-emerald-400/80">
                  {recentSyncedLogs.length} registro{recentSyncedLogs.length !== 1 ? 's' : ''} sincronizado{recentSyncedLogs.length !== 1 ? 's' : ''} en las últimas 24h
                </p>
              </div>
            )}
          </>
        )}

        {/* Tareas Completadas */}
        {activeSection === 'completadas' && !isLoading && (
          <>
            {completedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <CheckCircle size={48} className="mb-3 opacity-30" />
                <p className="text-lg">Sin tareas completadas recientes</p>
                <p className="text-sm mt-1">Las tareas marcadas como "done" en FarmOS aparecerán aquí</p>
              </div>
            ) : (
              completedTasks.map((task, idx) => {
                const TaskWrap = onEntryClick ? 'button' : 'div';
                const taskWrapProps = onEntryClick
                  ? { type: 'button', onClick: () => onEntryClick(task), 'aria-label': `Ver detalle: ${task.title || task.attributes?.name}` }
                  : {};
                return (
                <TaskWrap
                  key={task.id || idx}
                  {...taskWrapProps}
                  className="w-full text-left p-4 rounded-xl bg-slate-800 border border-slate-700 transition-all hover:border-slate-500 active:bg-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-green-900/30 shrink-0">
                        <CheckCircle size={18} className="text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-200 truncate text-base">{task.title || task.attributes?.name}</h4>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={task.status || task.attributes?.status} type="task" className="scale-75 origin-left" />
                          {task.type && (
                            <span className="text-xs text-slate-500">{task.type.replace('log--', '').replace('--', ' ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0 mt-1">
                      {formatTimestamp(task.timestamp)}
                    </span>
                  </div>
                </TaskWrap>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
