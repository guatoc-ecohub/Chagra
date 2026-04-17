import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Clock, RefreshCw, Wifi, WifiOff, CloudOff, Cloud, Sprout, Apple, TreePine, Building2, Wrench, Leaf, Droplets, Eye } from 'lucide-react';
import { syncManager } from '../services/syncManager';

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
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

const TRANSACTION_TYPE_COLORS: Record<string, string> = {
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

const TRANSACTION_TYPE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
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

interface PendingTransaction {
  id?: number | string;
  type: string;
  timestamp?: number;
  synced?: boolean;
  payload?: {
    data?: {
      type?: string;
      id?: string;
      attributes?: { name?: string; [key: string]: unknown };
      relationships?: {
        quantity?: {
          data?: Array<{
            attributes?: {
              value?: { decimal?: string };
              label?: string;
            };
          }>;
        };
        [key: string]: unknown;
      };
    };
  };
  [key: string]: unknown;
}

interface CompletedTask {
  id?: string;
  type?: string;
  title?: string;
  status?: string;
  timestamp?: number;
  severity?: string;
  attributes?: { status?: string; [key: string]: unknown };
  [key: string]: unknown;
}

interface WorkerHistoryProps {
  onBack: () => void;
}

export default function WorkerHistory({ onBack }: WorkerHistoryProps) {
  const [activeSection, setActiveSection] = useState<'recientes' | 'completadas'>('recientes');
  const [pendingTx, setPendingTx] = useState<PendingTransaction[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    loadData();

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const onTaskAdded = () => loadPendingTransactions();
    window.addEventListener('taskAdded', onTaskAdded);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('taskAdded', onTaskAdded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadPendingTransactions(), loadCompletedTasks()]);
    setIsLoading(false);
  };

  const loadPendingTransactions = async () => {
    try {
      await syncManager.initDB();
      const all = await syncManager.getPendingTransactions() as PendingTransaction[];
      setPendingTx(all.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)));
    } catch (err) {
      console.error('Error cargando transacciones pendientes:', err);
    }
  };

  const loadCompletedTasks = async () => {
    try {
      if (navigator.onLine) {
        await syncManager.fetchPendingTasksFromFarmOS();
      }
      const allTasks = await syncManager.getPendingTasks() as CompletedTask[];
      const historyData = allTasks
        .filter((t) =>
          t.status === 'done' ||
          t.attributes?.status === 'done' ||
          t.severity === 'completed'
        )
        .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
      setCompletedTasks(historyData);
    } catch (err) {
      console.error('Error cargando tareas completadas:', err);
    }
  };

  const formatTimestamp = (ts: number | undefined): string => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  const getTransactionName = (tx: PendingTransaction): string => {
    const name = tx.payload?.data?.attributes?.name;
    if (!name) return TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type ?? 'Registro';

    if (tx.type === 'harvest') {
      const qty = tx.payload?.data?.relationships?.quantity?.data?.[0]?.attributes;
      if (qty) return `Cosecha registrada: ${qty.value?.decimal ?? ''} ${qty.label ?? ''} de ${name}`;
      return `Cosecha registrada: ${name}`;
    }
    if (tx.type === 'seeding') return `Siembra registrada: ${name.replace('Siembra: ', '')}`;

    return name;
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-4 shrink-0 shadow-md">
        <button onClick={onBack} className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[48px] min-w-[48px] flex justify-center items-center shrink-0">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black flex-1">Historial</h2>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi size={14} className="text-green-400" />
          ) : (
            <WifiOff size={14} className="text-red-400" />
          )}
          <button onClick={loadData} disabled={isLoading} className="p-2 bg-slate-800 rounded-lg active:bg-slate-700 disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="flex border-b border-slate-800 shrink-0">
        <button
          onClick={() => setActiveSection('recientes')}
          className={`flex-1 p-3 font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] ${
            activeSection === 'recientes'
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
          className={`flex-1 p-3 font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] ${
            activeSection === 'completadas'
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
            {pendingTx.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Cloud size={48} className="mb-3 opacity-30" />
                <p className="text-lg">Sin registros pendientes</p>
                <p className="text-sm mt-1">Los registros de esta sesión aparecerán aquí</p>
              </div>
            ) : (
              pendingTx.map((tx, idx) => {
                const typeColor = TRANSACTION_TYPE_COLORS[tx.type] ?? 'text-slate-400 bg-slate-700/30';
                const typeLabel = TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type ?? 'Registro';
                const name = getTransactionName(tx);
                const TxIcon = TRANSACTION_TYPE_ICONS[tx.type] ?? Clock;

                return (
                  <div key={String(tx.id ?? idx)} className="p-4 rounded-xl bg-slate-800 border border-dashed border-slate-600 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`p-2 rounded-lg ${typeColor} shrink-0 mt-0.5`}>
                        <TxIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColor}`}>
                            {typeLabel}
                          </span>
                          <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <CloudOff size={10} />
                            Pendiente
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-200 text-base truncate">{name}</h4>
                      </div>
                      <span className="text-xs text-slate-500 shrink-0 mt-1">
                        {formatTimestamp(tx.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {pendingTx.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-900/10 border border-amber-800/30 text-center">
                <p className="text-xs text-amber-400/80">
                  {isOnline
                    ? 'Estos registros se sincronizarán automáticamente con FarmOS'
                    : 'Se sincronizarán cuando se restablezca la conexión'}
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
              completedTasks.map((task, idx) => (
                <div key={task.id ?? idx} className="p-4 rounded-xl bg-slate-800 border border-slate-700 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-green-900/30 shrink-0">
                        <CheckCircle size={18} className="text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-200 truncate text-base">{task.title}</h4>
                        {task.type && (
                          <span className="text-xs text-slate-500">{task.type.replace('log--', '').replace('--', ' ')}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0 mt-1">
                      {formatTimestamp(task.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
