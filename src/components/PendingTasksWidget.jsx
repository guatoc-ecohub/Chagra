import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { syncManager } from '../services/syncManager';

export default function PendingTasksWidget() {
  const [tasks, setTasks] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cacheAgeMinutes, setCacheAgeMinutes] = useState(null);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fase 5: Obtener tareas reales del store unificado (log--task)
      const pendingTasks = await syncManager.fetchPendingTasksFromFarmOS();
      setTasks(pendingTasks);

      // Calcular edad del caché a partir del registro más fresco
      const freshest = pendingTasks.reduce((acc, t) => Math.max(acc, t.cached_at || 0), 0);
      if (freshest > 0) setCacheAgeMinutes(Math.floor((Date.now() - freshest) / 60000));
    } catch (err) {
      console.error('Error obteniendo tareas pendientes:', err);
      setError('Error al cargar tareas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch inicial de tareas
    fetchTasks();

    // Configurar listeners de estado de red
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Configurar listener para eventos de tareas añadidas
    const handleTaskAdded = () => {
      console.log('🔄 Evento taskAdded recibido, refrescando lista...');
      fetchTasks();
    };

    window.addEventListener('taskAdded', handleTaskAdded);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('taskAdded', handleTaskAdded);
    };
  }, []);

  const handleRefresh = () => {
    fetchTasks();
  };

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          color: 'bg-red-600',
          text: 'text-red-400',
          badge: 'CRÍTICA',
          icon: AlertTriangle
        };
      case 'high':
        return {
          color: 'bg-red-700',
          text: 'text-red-400',
          badge: 'ALTA',
          icon: AlertTriangle
        };
      case 'medium':
        return {
          color: 'bg-orange-600',
          text: 'text-orange-400',
          badge: 'MEDIA',
          icon: Clock
        };
      case 'low':
        return {
          color: 'bg-green-600',
          text: 'text-green-400',
          badge: 'BAJA',
          icon: Clock
        };
      default:
        return {
          color: 'bg-slate-600',
          text: 'text-slate-400',
          badge: 'N/D',
          icon: Clock
        };
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h3 className="text-2xl font-black flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${tasks.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
            Cola de Tareas Pendientes
          </h3>
          {!isOnline && cacheAgeMinutes !== null && (
            <span className="text-xs text-amber-400 mt-1">
              Caché de hace {cacheAgeMinutes} {cacheAgeMinutes === 1 ? 'minuto' : 'minutos'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <RefreshCw size={16} className="animate-spin text-blue-400" />}
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${tasks.length > 0 ? 'bg-amber-600/20 text-amber-400' : 'bg-green-600/20 text-green-400'}`}>
            {tasks.length} {tasks.length === 1 ? 'pendiente' : 'pendientes'}
          </span>
          {isOnline ? (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Wifi size={12} />
              Online
            </span>
          ) : (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <WifiOff size={12} />
              Offline (Caché)
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="Actualizar tareas"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-xl">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {tasks.map(task => {
          const config = getSeverityConfig(task.severity);
          const Icon = config.icon;

          return (
            <div
              key={task.id}
              className="p-4 rounded-xl bg-slate-800 border-2 border-slate-700 hover:border-slate-600 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`${config.text} text-xs font-bold bg-slate-700 px-2 py-1 rounded-full`}>
                      {config.badge}
                    </span>
                  </div>
                  <p className="text-base font-semibold text-slate-200 mb-2">
                    {task.title}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-sm font-medium whitespace-nowrap">
                  <Icon size={14} />
                  <span>{task.deadline}</span>
                </div>
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium">Todas las tareas completadas</p>
            <p className="text-sm mt-1">¡Excelente trabajo agronómico!</p>
          </div>
        )}

        {isLoading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <RefreshCw size={24} className="animate-spin text-blue-400 mb-3" />
            <p className="text-sm">Cargando tareas...</p>
          </div>
        )}
      </div>
    </div>
  );
}
