import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, Clock, Loader2, Navigation, RefreshCw, Eye, Wrench, Apple } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { syncManager } from '../services/syncManager';
import { wktToGeoJson } from '../utils/geo';
import { haversineDistance, getCoords } from '../utils/spatialAnalysis';
import FarmMap from './FarmMap';
import EvidenceCapture from './EvidenceCapture';
import ChagraGrowLoader from './ChagraGrowLoader';

/**
 * WorkerDashboard — Vista de campo para operario (Fase 20).
 *
 * Ordena tareas pendientes por proximidad al GPS del dispositivo, permitiendo
 * al trabajador priorizar por cercanía. Cada tarea tiene un botón "Marcar
 * como Hecho" que genera un PATCH status=done encolado en pending_transactions.
 */

const TYPE_ICONS = {
  'log--observation': Eye,
  'log--maintenance': Wrench,
  'log--harvest': Apple,
};

const TYPE_COLORS = {
  'log--observation': 'text-blue-400 bg-blue-900/30',
  'log--maintenance': 'text-orange-400 bg-orange-900/30',
  'log--harvest': 'text-green-400 bg-green-900/30',
};

const formatDistance = (m) => {
  if (m < 10) return '< 10m';
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
};

export const WorkerDashboard = () => {
  const plants = useAssetStore((s) => s.plants);
  const lands = useAssetStore((s) => s.lands);
  const [tasks, setTasks] = useState([]);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [evidenceCounts, setEvidenceCounts] = useState({}); // { logId: count }

  // Cargar tareas pendientes geolocalizadas
  const loadTasks = async () => {
    setLoading(true);
    try {
      // Fase 5 ADR-019: Usar el selector unificado que ya filtra completados
      const pending = await syncManager.getPendingTasks();

      // Filtrar por las que tienen geometría (prioridad WorkerDashboard)
      const geoTasks = pending.filter(l => {
        const geo = l.attributes?.intrinsic_geometry;
        return !!(typeof geo === 'object' ? geo?.value : geo);
      });

      setTasks(geoTasks);
    } catch (err) {
      console.error('[WorkerDashboard] Error cargando tareas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Obtener GPS
  const refreshGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsCoords([pos.coords.longitude, pos.coords.latitude]),
      (err) => console.warn('[WorkerDashboard] GPS:', err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    loadTasks();
    refreshGps();
    const interval = setInterval(refreshGps, 30000); // re-poll GPS cada 30s
    return () => clearInterval(interval);
  }, []);

  // Ordenar por distancia
  const sortedTasks = tasks
    .map((task) => {
      const rawGeo = task.attributes?.intrinsic_geometry;
      const wkt = typeof rawGeo === 'object' ? rawGeo?.value : rawGeo;
      const geo = wkt ? wktToGeoJson(wkt) : null;
      const coords = getCoords(geo);
      const distance = gpsCoords && coords ? haversineDistance(gpsCoords, coords) : Infinity;
      return { ...task, distance, coords };
    })
    .sort((a, b) => a.distance - b.distance);

  // Marcar como completada (Fase 5: Append-only [TASK_COMPLETION] log)
  const handleComplete = async (taskId) => {
    setCompleting(taskId);
    try {
      // 1. Crear log de completado (inmutable)
      await useAssetStore.getState().completeTaskLog(taskId, 'completed');

      // 2. Refrescar lista local (quitando la tarea)
      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      window.dispatchEvent(new CustomEvent('syncComplete', { detail: { message: 'Tarea finalizada.' } }));

      // Forzar sync
      navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
    } catch (err) {
      console.error('[WorkerDashboard] Error completando tarea:', err);
      window.dispatchEvent(new CustomEvent('syncError', { detail: { message: 'No se pudo registrar el completado.' } }));
    } finally {
      setCompleting(null);
    }
  };

  const noGeoCount = [...plants, ...lands].filter((a) => {
    const geo = a.attributes?.intrinsic_geometry;
    return !geo || !(typeof geo === 'object' ? geo.value : geo);
  }).length;

  return (
    <div className="p-4 pb-20 space-y-4">
      {/* Header con GPS status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Navigation size={20} className="text-blue-400" />
            Tareas por proximidad
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {gpsCoords
              ? `GPS: ${gpsCoords[1].toFixed(5)}°N, ${gpsCoords[0].toFixed(5)}°W`
              : 'Obteniendo ubicación…'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <MapPin size={16} />
          </button>
          <button
            onClick={() => { loadTasks(); refreshGps(); }}
            disabled={loading}
            className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Badge activos sin geo */}
      {noGeoCount > 0 && (
        <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-800/50 flex items-center gap-2">
          <MapPin size={14} className="text-amber-400 shrink-0" />
          <span className="text-xs text-amber-400 font-bold">
            {noGeoCount} activo{noGeoCount > 1 ? 's' : ''} sin ubicación — registra coordenadas al pasar cerca
          </span>
        </div>
      )}

      {/* Vista mapa */}
      {viewMode === 'map' && (
        <div className="h-[50vh] rounded-xl overflow-hidden border border-slate-700">
          <FarmMap showTasks onTaskComplete={handleComplete} />
        </div>
      )}

      {/* Lista de tareas */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {loading && tasks.length === 0 && (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <ChagraGrowLoader size={32} className="mr-3" />
              Cargando tareas…
            </div>
          )}

          {!loading && sortedTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <CheckCircle size={48} className="mb-3 opacity-30" />
              <p className="text-lg font-medium">Sin tareas pendientes</p>
              <p className="text-sm mt-1">Todas las operaciones están al día.</p>
            </div>
          )}

          {sortedTasks.map((task) => {
            const Icon = TYPE_ICONS[task.type] || Clock;
            const colorClass = TYPE_COLORS[task.type] || 'text-slate-400 bg-slate-800';
            const taskName = task.name || task.attributes?.name || 'Tarea sin título';
            const isCompleting = completing === task.id;
            const hasEvidence = (evidenceCounts[task.id] || 0) > 0;

            return (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-lg shrink-0 ${colorClass}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-200 text-sm truncate">{taskName}</h4>
                      <p className="text-[10px] text-slate-500 uppercase">
                        {task.type?.split('--')[1] || 'tarea'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black tabular-nums ${task.distance < 50 ? 'text-green-400' : task.distance < 200 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {task.distance === Infinity ? '—' : formatDistance(task.distance)}
                    </p>
                    <p className="text-[10px] text-slate-500">distancia</p>
                  </div>
                </div>

                {/* Evidencia fotográfica obligatoria con diagnóstico IA */}
                <EvidenceCapture
                  logId={task.id}
                  assetId={task.asset_id || task.attributes?.asset_id}
                  assetGeometry={task.attributes?.intrinsic_geometry}
                  disabled={isCompleting}
                  onCountChange={(count) => {
                    setEvidenceCounts((prev) => ({ ...prev, [task.id]: count }));
                  }}
                  onDiagnosis={(diag) => {
                    if (diag && diag.score < 60) {
                      window.dispatchEvent(new CustomEvent('syncError', {
                        detail: { message: `Alerta fitosanitaria (${diag.score}/100): ${diag.treatment_suggestion || 'Revisar recomendación IA.'}` },
                      }));
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => handleComplete(task.id)}
                  disabled={isCompleting || !hasEvidence}
                  className="w-full py-2.5 bg-green-700 hover:bg-green-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px]"
                >
                  {isCompleting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {isCompleting ? 'Guardando…' : hasEvidence ? 'Finalizar' : 'Requiere evidencia'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
