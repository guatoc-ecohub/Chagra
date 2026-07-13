import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, CheckCircle, Clock, RefreshCw, Wifi, WifiOff, CloudOff, Cloud,
  Sprout, Apple, TreePine, Building2, Wrench, Leaf, Droplets, Eye, Plus,
  BookOpen, ListFilter,
} from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { logCache } from '../db/logCache';
import StatusBadge from './StatusBadge';
import { fincaVivaHomePerfilActivo } from '../config/fincaVivaHomeFlag';
import './registro/registro-shell.css';

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

// Mapa de tipo de log (crudo o `log--x`) → categoría canónica de la bitácora.
// Cubre tanto los `type` de transacción pendiente (harvest/input/...) como los
// `type` JSON:API de los logs sincronizados (`log--harvest`, ...).
/** @param {string} rawType
 * @returns {string} */
function canonicalType(rawType) {
  if (!rawType) return 'activity';
  const t = String(rawType).replace('log--', '').replace('--', '_');
  if (t.startsWith('asset_plant') || t === 'planting') return 'planting';
  return t;
}

// FILTROS por familia de registro para la Bitácora "Todo".
const FILTERS = [
  { id: 'all', label: 'Todo', Icon: BookOpen, match: () => true },
  { id: 'harvest', label: 'Cosechas', Icon: Apple, match: (t) => t === 'harvest' },
  { id: 'input', label: 'Insumos', Icon: Droplets, match: (t) => t === 'input' },
  { id: 'planting', label: 'Siembras', Icon: Sprout, match: (t) => t === 'planting' || t === 'seeding' },
  { id: 'maintenance', label: 'Labores', Icon: Wrench, match: (t) => t === 'maintenance' || t === 'activity' },
  { id: 'observation', label: 'Observaciones', Icon: Eye, match: (t) => t === 'observation' },
];

// Accesos para AGREGAR un registro. Navegan a las pantallas de registro vía el
// evento global `chagraNavigate` (mismo canal que usa HarvestLog para "Ver en
// Bitácora"), así no dependemos de pasar onNavigate como prop.
const ADD_ACTIONS = [
  { view: 'cosechar', label: 'Cosecha', Icon: Apple },
  { view: 'insumos', label: 'Insumo / abono', Icon: Droplets },
  { view: 'mantenimiento', label: 'Labor', Icon: Wrench },
  { view: 'sembrar', label: 'Siembra', Icon: Sprout },
];

/** @param {string} view */
function goTo(view) {
  window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view } }));
}

/**
 * Normaliza un timestamp a MILISEGUNDOS.
 *
 * BUG histórico: los logs SINCRONIZADOS guardan `timestamp` en segundos UNIX
 * (logCache), mientras las transacciones PENDIENTES lo guardan en milisegundos
 * (`Date.now()`). Mezclarlos sin normalizar hacía que (1) los sincronizados se
 * vieran fechados en 1970 y (2) el orden cronológico quedara roto. Heurística:
 * si el valor es menor a ~1e12 lo tratamos como segundos.
 * @param {number|string} ts
 * @returns {number} */
function toMs(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 1e12 ? n * 1000 : n;
}

/** @param {{ onBack: () => void, onEntryClick?: (entry: object) => void }} props */
export default function WorkerHistory({ onBack, onEntryClick }) {
  const redesign = fincaVivaHomePerfilActivo();

  const [activeSection, setActiveSection] = useState('todo');
  const [filter, setFilter] = useState('all');
  const [pendingTx, setPendingTx] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const loadPendingTransactions = useCallback(async () => {
    try {
      await syncManager.initDB();
      const all = await syncManager.getPendingTransactions();
      setPendingTx(all.sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp)));
    } catch (err) {
      console.error('Error cargando transacciones pendientes:', err);
    }
  }, []);

  const loadCompletedTasks = useCallback(async () => {
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
        .sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp));
      setCompletedTasks(historyData);
    } catch (err) {
      console.error('Error cargando tareas completadas:', err);
    }
  }, []);

  // FIX utilidad: la Bitácora ahora lista TODO el historial sincronizado
  // (logCache.getAll), no solo las últimas 24h. Antes, un registro de ayer ya
  // sincronizado desaparecía de la pantalla → "no me deja ver nada".
  const loadAllLogs = useCallback(async () => {
    try {
      const logs = await logCache.getAll();
      setAllLogs(logs.filter((l) => !l._pending));
    } catch (err) {
      console.error('Error cargando logs sincronizados:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.allSettled([loadPendingTransactions(), loadCompletedTasks(), loadAllLogs()]);
    setIsLoading(false);
  }, [loadPendingTransactions, loadCompletedTasks, loadAllLogs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const onTaskAdded = () => loadPendingTransactions();
    const onSyncCompleted = () => loadAllLogs();
    window.addEventListener('taskAdded', onTaskAdded);
    window.addEventListener('syncCompleted', onSyncCompleted);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('taskAdded', onTaskAdded);
      window.removeEventListener('syncCompleted', onSyncCompleted);
    };
  }, [loadData, loadPendingTransactions, loadAllLogs]);

  /** @param {number} ts
   * @returns {string} */
  const formatTimestamp = (ts) => {
    const ms = toMs(ts);
    if (!ms) return '';
    const d = new Date(ms);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);

    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  /** @param {Object} tx
   * @returns {string} */
  const getTransactionName = (tx) => {
    const name = tx.payload?.data?.attributes?.name;
    if (!name) return TRANSACTION_TYPE_LABELS[tx.type] || tx.type || 'Registro';

    if (tx.type === 'harvest') {
      const qty = tx.payload?.data?.relationships?.quantity?.data?.[0]?.attributes;
      if (qty) return `Cosecha registrada: ${qty.value?.decimal || ''} ${qty.label || ''} de ${name}`;
      return `Cosecha registrada: ${name}`;
    }
    if (tx.type === 'seeding') return `Siembra registrada: ${name.replace('Siembra: ', '')}`;

    return name;
  };

  // Feed UNIFICADO: pendientes + todo lo sincronizado, normalizado a un shape
  // común, ordenado cronológicamente y filtrado por familia.
  const unifiedFeed = useMemo(() => {
    const pendingItems = pendingTx.map((tx) => ({
      key: tx.id,
      raw: tx,
      _source: 'pending',
      type: tx.type,
      canon: canonicalType(tx.type),
      name: getTransactionName(tx),
      ts: toMs(tx.timestamp),
    }));
    const syncedItems = allLogs.map((log) => ({
      key: log.id,
      raw: log,
      _source: 'synced',
      type: log.type,
      canon: canonicalType(log.type),
      name: log.name || (log.type || 'Registro').replace('log--', ''),
      ts: toMs(log.timestamp),
    }));
    const activeFilter = FILTERS.find((f) => f.id === filter) || FILTERS[0];
    return [...pendingItems, ...syncedItems]
      .filter((it) => activeFilter.match(it.canon))
      .sort((a, b) => b.ts - a.ts);
  }, [pendingTx, allLogs, filter]);

  // Conteos por filtro para los chips (visibilidad del historial).
  const counts = useMemo(() => {
    const items = [
      ...pendingTx.map((tx) => canonicalType(tx.type)),
      ...allLogs.map((l) => canonicalType(l.type)),
    ];
    const map = { all: items.length };
    FILTERS.forEach((f) => {
      if (f.id === 'all') return;
      map[f.id] = items.filter((c) => f.match(c)).length;
    });
    return map;
  }, [pendingTx, allLogs]);

  // ── Barra "Agregar registro": CTA visible para que la Bitácora no sea solo
  //    un visor. Beneficia prod → UNGATED.
  const addBar = (
    <div className="px-3 pt-3">
      <p className="text-xs font-bold text-slate-400 mb-2 px-1 flex items-center gap-1.5">
        <Plus size={13} /> Agregar a la bitácora
      </p>
      <div className="grid grid-cols-4 gap-2">
        {ADD_ACTIONS.map((action) => {
          const ActionIcon = action.Icon;
          return (
            <button
              key={action.view}
              type="button"
              onClick={() => goTo(action.view)}
              className={
                redesign
                  ? 'registro-chip flex-col justify-center py-2.5 text-xs'
                  : 'flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold active:bg-slate-700'
              }
            >
              <ActionIcon size={20} aria-hidden="true" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderFeedItem = (item) => {
    const isPending = item._source === 'pending';
    const typeColor = TRANSACTION_TYPE_COLORS[item.canon] || 'text-slate-400 bg-slate-700/30';
    const TxIcon = TRANSACTION_TYPE_ICONS[item.canon] || Clock;
    const Wrap = onEntryClick ? 'button' : 'div';
    const wrapProps = onEntryClick
      ? { type: /** @type {const} */ ('button'), onClick: () => onEntryClick(item.raw), 'aria-label': `Ver detalle: ${item.name}` }
      : {};
    return (
      <Wrap
        key={item.key}
        {...wrapProps}
        className={`w-full text-left p-4 rounded-xl border transition-all hover:border-slate-400 active:bg-slate-700 ${
          isPending ? 'bg-slate-800 border-dashed border-slate-600' : 'bg-slate-800/70 border-slate-700'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className={`p-2 rounded-lg ${typeColor} shrink-0 mt-0.5`}>
            <TxIcon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColor}`}>
                {TRANSACTION_TYPE_LABELS[item.canon] || item.canon}
              </span>
              {isPending ? (
                <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <CloudOff size={10} /> Pendiente
                </span>
              ) : (
                <span className="text-xs text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Cloud size={10} /> Sincronizado
                </span>
              )}
            </div>
            <h4 className="font-bold text-slate-200 text-base truncate">{item.name}</h4>
          </div>
          <span className="text-xs text-slate-500 shrink-0 mt-1">{formatTimestamp(item.ts)}</span>
        </div>
      </Wrap>
    );
  };

  const shellClass = `h-[100dvh] w-full ${redesign ? 'registro-shell' : 'bg-slate-950'} text-slate-100 flex flex-col overflow-hidden`;

  return (
    <div className={shellClass}>
      {/* Header */}
      <header className={`p-4 flex items-center gap-3 shrink-0 ${redesign ? 'registro-shell__header' : 'bg-slate-950 border-b border-slate-800 shadow-md'}`}>
        <button
          onClick={onBack}
          aria-label="Volver"
          className={redesign
            ? 'registro-shell__back shrink-0 min-h-[48px] min-w-[48px] rounded-2xl flex items-center justify-center'
            : 'p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[48px] min-w-[48px] flex justify-center items-center shrink-0'}
        >
          <ArrowLeft size={24} />
        </button>
        {redesign && (
          <div className="registro-shell__badge shrink-0 min-h-[48px] min-w-[48px] rounded-2xl flex items-center justify-center" aria-hidden="true">
            <BookOpen size={24} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className={`font-black truncate ${redesign ? 'registro-shell__title text-2xl' : 'text-2xl'}`}>Bitácora</h2>
          {redesign && <p className="registro-shell__subtitle text-sm truncate">Todo lo que has registrado en tu finca</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOnline ? <Wifi size={14} className="text-green-400" /> : <WifiOff size={14} className="text-red-400" />}
          <button onClick={loadData} disabled={isLoading} aria-label="Recargar datos" className="p-2 bg-slate-800 rounded-lg active:bg-slate-700 disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>
      {redesign && <div className="registro-shell__rule shrink-0" aria-hidden="true" />}

      {/* Acceso a AGREGAR registro — la Bitácora ya no es solo lectura. */}
      {addBar}

      {/* Section Tabs: Todo (historial) vs Completadas (tareas done). */}
      <div className="flex border-b border-slate-800 shrink-0 mt-3">
        <button
          onClick={() => setActiveSection('todo')}
          className={`flex-1 p-3 font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] ${
            activeSection === 'todo' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <BookOpen size={16} /> Registros
          {counts.all > 0 && <span className="text-xs bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded-full">{counts.all}</span>}
        </button>
        <button
          onClick={() => setActiveSection('completadas')}
          className={`flex-1 p-3 font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] ${
            activeSection === 'completadas' ? 'text-green-400 border-b-2 border-green-500' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <CheckCircle size={16} /> Tareas hechas
        </button>
      </div>

      {/* Filtros por familia (solo en la pestaña Registros). */}
      {activeSection === 'todo' && (
        <div className="flex gap-2 overflow-x-auto px-3 py-2.5 shrink-0 border-b border-slate-800/60">
          <ListFilter size={16} className="text-slate-500 shrink-0 mt-1.5" aria-hidden="true" />
          {FILTERS.map((f) => {
            const FilterIcon = f.Icon;
            const n = counts[f.id] || 0;
            if (f.id !== 'all' && n === 0) return null;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={
                  redesign
                    ? `registro-chip shrink-0 ${filter === f.id ? 'registro-chip--active' : ''}`
                    : `shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border ${
                        filter === f.id ? 'bg-amber-900/30 border-amber-600 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`
                }
              >
                <FilterIcon size={14} aria-hidden="true" /> {f.label}
                {n > 0 && <span className="opacity-70">{n}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-slate-500" />
            <span className="ml-3 text-slate-500">Cargando...</span>
          </div>
        )}

        {/* Registros (feed unificado, filtrado) */}
        {activeSection === 'todo' && !isLoading && (
          <>
            {unifiedFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <div className={`p-4 rounded-2xl mb-3 ${redesign ? 'registro-shell__badge' : 'bg-slate-800 text-emerald-400'}`}>
                  <BookOpen size={40} aria-hidden="true" />
                </div>
                <p className="text-lg font-bold text-slate-200">
                  {filter === 'all' ? 'Aún no has registrado nada' : 'Sin registros de este tipo'}
                </p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">
                  {filter === 'all'
                    ? 'Empieza por anotar una cosecha, un abono o una labor. Todo lo que registres queda guardado aquí.'
                    : 'Cambia el filtro o agrega un registro nuevo.'}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-5 w-full max-w-xs">
                  {ADD_ACTIONS.map((action) => {
                    const ActionIcon = action.Icon;
                    return (
                      <button
                        key={action.view}
                        type="button"
                        onClick={() => goTo(action.view)}
                        className={
                          redesign
                            ? 'registro-cta text-base min-h-[56px]'
                            : 'flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-700 active:bg-emerald-600 text-white font-bold text-sm'
                        }
                      >
                        <ActionIcon size={18} aria-hidden="true" /> {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {unifiedFeed.map(renderFeedItem)}
                <p className="text-[11px] text-slate-500 text-center pt-2 pb-1">
                  {unifiedFeed.length} registro{unifiedFeed.length !== 1 ? 's' : ''} en tu bitácora
                </p>
              </>
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
                  ? { type: /** @type {const} */ ('button'), onClick: () => onEntryClick(task), 'aria-label': `Ver detalle: ${task.title || task.attributes?.name}` }
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
                            <StatusBadge status={task.status || task.attributes?.status} type="task" onChange={() => {}} className="scale-75 origin-left" />
                            {task.type && (
                              <span className="text-xs text-slate-500">{task.type.replace('log--', '').replace('--', ' ')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 shrink-0 mt-1">{formatTimestamp(task.timestamp)}</span>
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
