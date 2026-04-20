import React, { useEffect, useMemo } from 'react';
import { Sprout, Droplets, Apple, Leaf, RefreshCw, Clock } from 'lucide-react';
import { useLogStore } from '../store/useLogStore';

/**
 * AssetTimeline — Línea de tiempo agroecológica de un activo (plant).
 *
 * Consume logs desde useLogStore (alimentado por logCache + pullRecentLogs).
 * Agrupa por mes/año para facilitar lectura secuencial. Los logs _pending
 * se muestran con opacidad reducida + badge "Sincronizando…".
 *
 * En agricultura orgánica, el orden cronológico de los eventos determina la
 * validez de periodos de carencia y la eficacia de los biopreparados (Jairo
 * Restrepo), por lo que se prioriza densidad informativa sobre decoración.
 */

const TYPE_CONFIG = {
  'log--seeding': {
    icon: Sprout,
    label: 'Siembra',
    color: 'text-lime-400',
    bg: 'bg-lime-900/30',
    border: 'border-lime-800',
  },
  'log--planting': {
    icon: Sprout,
    label: 'Trasplante',
    color: 'text-green-400',
    bg: 'bg-green-900/30',
    border: 'border-green-800',
  },
  'log--input': {
    icon: Droplets,
    label: 'Aplicación (biopreparado)',
    color: 'text-blue-400',
    bg: 'bg-blue-900/30',
    border: 'border-blue-800',
  },
  'log--harvest': {
    icon: Apple,
    label: 'Cosecha',
    color: 'text-amber-400',
    bg: 'bg-amber-900/30',
    border: 'border-amber-800',
  },
};

const DEFAULT_CONFIG = {
  icon: Leaf,
  label: 'Evento',
  color: 'text-slate-400',
  bg: 'bg-slate-800',
  border: 'border-slate-700',
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const formatMonthKey = (ts) => {
  if (!ts) return 'Sin fecha';
  const d = new Date(ts * 1000);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

const formatDayLabel = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

const extractNotes = (log) => {
  const raw = log.attributes?.notes;
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  return raw.value || '';
};

const extractQuantity = (log) => {
  const qty = log.relationships?.quantity?.data?.[0]?.attributes;
  if (!qty) return '';
  const value = qty.value?.decimal ?? qty.value ?? '';
  const label = qty.label || '';
  return value ? `${value} ${label}`.trim() : '';
};

// Referencia estable para el fallback: evita que `|| []` cree un array nuevo en
// cada llamada del selector, lo cual dispararía re-render infinito (React #185)
// cuando el asset aún no tiene logs cargados.
const EMPTY_LOGS = [];

export default function AssetTimeline({ assetId }) {
  const logs = useLogStore((state) => state.logsByAsset[assetId] || EMPTY_LOGS);
  const isSyncing = useLogStore((state) => state.isSyncing);
  const loadLogsForAsset = useLogStore((state) => state.loadLogsForAsset);

  useEffect(() => {
    if (assetId) loadLogsForAsset(assetId);
  }, [assetId, loadLogsForAsset]);

  // Agrupación por mes/año preservando el orden descendente del store
  const groups = useMemo(() => {
    const map = new Map();
    for (const log of logs) {
      const key = formatMonthKey(log.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(log);
    }
    return Array.from(map.entries());
  }, [logs]);

  if (!assetId) {
    return (
      <div className="p-4 text-slate-500 text-sm italic">
        Selecciona un activo para ver su línea de tiempo.
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
          <Clock size={18} className="text-slate-400" />
          Línea de tiempo
        </h3>
        {isSyncing && (
          <span className="text-xs text-blue-400 flex items-center gap-1">
            <RefreshCw size={12} className="animate-spin" />
            Actualizando…
          </span>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="py-10 text-center text-slate-500">
          <Leaf size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Sin eventos registrados en los últimos 30 días.</p>
          <p className="text-xs mt-1 opacity-70">
            Los registros de siembra, insumos y cosecha aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([monthKey, monthLogs]) => (
            <div key={monthKey}>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                {monthKey}
              </div>
              <ul className="space-y-2 relative border-l-2 border-slate-800 ml-2 pl-4">
                {monthLogs.map((log) => {
                  const config = TYPE_CONFIG[log.type] || DEFAULT_CONFIG;
                  const Icon = config.icon;
                  const notes = extractNotes(log);
                  const qty = extractQuantity(log);
                  const pending = log._pending;

                  return (
                    <li
                      key={log.id}
                      className={`relative p-3 rounded-xl border ${config.bg} ${config.border} ${
                        pending ? 'opacity-60' : ''
                      }`}
                    >
                      <span
                        className={`absolute -left-[26px] top-4 w-4 h-4 rounded-full ${config.bg} border-2 ${config.border} flex items-center justify-center`}
                      >
                        <Icon size={10} className={config.color} />
                      </span>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-bold ${config.color}`}>
                              {config.label}
                            </span>
                            {pending && (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-900/40 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                <RefreshCw size={8} className="animate-spin" />
                                Sincronizando…
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm text-slate-200 font-semibold truncate">
                            {log.attributes?.name || 'Evento sin nombre'}
                          </h4>
                          {qty && (
                            <div className="text-xs text-slate-400 mt-0.5">{qty}</div>
                          )}
                          {notes && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notes}</p>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 shrink-0 whitespace-nowrap">
                          {formatDayLabel(log.timestamp)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
