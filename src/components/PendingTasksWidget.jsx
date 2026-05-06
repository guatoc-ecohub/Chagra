import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw, Wifi, WifiOff, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
import { syncManager } from '../services/syncManager';

/**
 * PendingTasksWidget, Lili #102 + #106.
 *
 * Refactor 2026-05-02 (post field test Lili):
 * - **Footer collapsable** (sticky bottom) en lugar de bloque fijo en
 *   medio del Dashboard. Por default colapsado mostrando solo count;
 *   tap para expandir.
 * - **Sort por severity** (critical → high → medium → low) y luego
 *   por fecha. Lili: "ordenar por urgencia, urgent rojo arriba".
 * - **Edit button** (lápiz) en cada item para editar tareas pendientes.
 *   Closes #106, onEdit prop dispatcha navigate('edit_task', {task}).
 * - **Empty state** simple cuando 0 pendientes.
 *
 * El componente padre (DashboardView) le pasa onEdit callback que
 * llama al router con la tarea a editar.
 */
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export default function PendingTasksWidget({ onEdit }) {
  const [tasks, setTasks] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cacheAgeMinutes, setCacheAgeMinutes] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pendingTasks = await syncManager.fetchPendingTasksFromFarmOS();

      // Sort por severity rank, después por deadline (string compara bien
      // si son ISO o relativo similar, fallback robusto).
      const sorted = [...pendingTasks].sort((a, b) => {
        const sa = SEVERITY_RANK[a.severity] ?? 99;
        const sb = SEVERITY_RANK[b.severity] ?? 99;
        if (sa !== sb) return sa - sb;
        return (a.deadline || '').localeCompare(b.deadline || '');
      });

      setTasks(sorted);

      const freshest = sorted.reduce((acc, t) => Math.max(acc, t.cached_at || 0), 0);
      if (freshest > 0) setCacheAgeMinutes(Math.floor((Date.now() - freshest) / 60000));
    } catch (err) {
      console.error('Error obteniendo tareas pendientes:', err);
      setError('Error al cargar tareas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const handleTaskAdded = () => fetchTasks();
    window.addEventListener('taskAdded', handleTaskAdded);
    window.addEventListener('taskUpdated', handleTaskAdded);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('taskAdded', handleTaskAdded);
      window.removeEventListener('taskUpdated', handleTaskAdded);
    };
  }, []);

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'critical': return { color: 'bg-red-600', text: 'text-red-400', badge: 'CRÍTICA', icon: AlertTriangle };
      case 'high': return { color: 'bg-red-700', text: 'text-red-400', badge: 'ALTA', icon: AlertTriangle };
      case 'medium': return { color: 'bg-orange-600', text: 'text-orange-400', badge: 'MEDIA', icon: Clock };
      case 'low': return { color: 'bg-green-600', text: 'text-green-400', badge: 'BAJA', icon: Clock };
      default: return { color: 'bg-slate-600', text: 'text-slate-400', badge: 'N/D', icon: Clock };
    }
  };

  const handleEditClick = (e, task) => {
    e.stopPropagation();
    if (typeof onEdit === 'function') onEdit(task);
  };

  const pendingCount = tasks.length;
  const criticalCount = tasks.filter(t => t.severity === 'critical' || t.severity === 'high').length;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 shadow-xl mb-4 overflow-hidden">
      {/* Header colapsable, siempre visible */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-controls="pending-tasks-content"
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 active:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${pendingCount > 0 ? (criticalCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500') : 'bg-green-500'}`}></span>
          <h3 className="text-base font-bold text-slate-100">Cola de tareas</h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pendingCount > 0 ? 'bg-amber-600/20 text-amber-400' : 'bg-green-600/20 text-green-400'}`}>
            {pendingCount}
          </span>
          {criticalCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-600/30 text-red-300">
              {criticalCount} urgente{criticalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi size={14} className="text-green-400" />
          ) : (
            <WifiOff size={14} className="text-red-400" />
          )}
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {expanded && (
        <div id="pending-tasks-content" className="px-4 pb-4 border-t border-slate-800">
          {!isOnline && cacheAgeMinutes !== null && (
            <p className="text-xs text-amber-400 mt-2">
              Caché de hace {cacheAgeMinutes} {cacheAgeMinutes === 1 ? 'minuto' : 'minutos'}
            </p>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-500 rounded-xl">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <div className="space-y-2 mt-3">
            {tasks.map(task => {
              const config = getSeverityConfig(task.severity);
              const Icon = config.icon;

              return (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`${config.text} text-[10px] font-bold bg-slate-700 px-2 py-0.5 rounded-full`}>
                          {config.badge}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200 truncate">
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-slate-400 text-xs font-medium whitespace-nowrap">
                        <Icon size={12} />
                        {task.deadline}
                      </span>
                      {onEdit && (
                        <button
                          type="button"
                          onClick={(e) => handleEditClick(e, task)}
                          aria-label={`Editar tarea: ${task.title}`}
                          title="Editar tarea"
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {tasks.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-6 text-slate-500">
                <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium">Sin tareas pendientes ✓</p>
              </div>
            )}

            {isLoading && tasks.length === 0 && (
              <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
                <RefreshCw size={16} className="animate-spin text-blue-400" />
                <span className="text-sm">Cargando tareas...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
