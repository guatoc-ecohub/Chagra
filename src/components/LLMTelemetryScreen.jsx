import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Zap, Activity, RefreshCw, Download, Trash2, AlertTriangle, CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import {
  getLLMEvents,
  aggregateLLMMetrics,
  clearLLMTelemetry,
  exportLLMTelemetry,
  isLLMTelemetryEnabled,
  setLLMTelemetryEnabled,
} from '../services/llmTelemetryService';
import { getGpuSnapshot, listAvailableModels } from '../services/gpuTelemetryService';

const FLUJO_LABELS = {
  chat: 'Chat',
  extract: 'Extracción NLU',
  vision: 'Visión foliar',
  summarize: 'Resumen',
  recommend: 'Recomendación',
  help: 'Ayuda Q&A',
  other: 'Otro',
};

const STATUS_STYLES = {
  success: { dot: 'bg-emerald-500', label: 'OK', icon: CheckCircle2, color: 'text-emerald-400' },
  error: { dot: 'bg-red-500', label: 'Error', icon: XCircle, color: 'text-red-400' },
  abort: { dot: 'bg-amber-500', label: 'Abort', icon: AlertTriangle, color: 'text-amber-400' },
};

const PROCESSOR_STYLES = {
  gpu: { label: 'GPU', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' },
  partial: { label: 'Parcial', color: 'bg-amber-900/40 text-amber-300 border-amber-700/50' },
  cpu: { label: 'CPU', color: 'bg-slate-700/40 text-slate-300 border-slate-600/50' },
  unknown: { label: '?', color: 'bg-slate-800/40 text-slate-500 border-slate-700/50' },
};

const formatTs = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const formatMs = (ms) => {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatVram = (mb) => {
  if (!mb) return '-';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
};

const formatRate = (rate) => (rate == null ? '-' : `${rate.toFixed(1)} t/s`);

const formatPct = (frac) => `${Math.round((frac || 0) * 100)}%`;

const StatCard = ({ icon: Icon, label, value, sublabel, color = 'text-slate-300' }) => (
  <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-3 flex flex-col gap-1">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
      {Icon && <Icon size={12} />}
      {label}
    </div>
    <div className={`text-xl font-bold ${color}`}>{value}</div>
    {sublabel && <div className="text-[10px] text-slate-500">{sublabel}</div>}
  </div>
);

export default function LLMTelemetryScreen({ onBack }) {
  const [events, setEvents] = useState([]);
  const [aggregates, setAggregates] = useState({ totals: {}, byModel: {}, byFlujo: {} });
  const [gpuSnapshot, setGpuSnapshot] = useState(null);
  const [availableModels, setAvailableModels] = useState({ available: false, models: [] });
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabledState] = useState(isLLMTelemetryEnabled());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, snap, tags] = await Promise.all([
        getLLMEvents(200),
        getGpuSnapshot({ force: true }),
        listAvailableModels(),
      ]);
      setEvents(list);
      setAggregates(aggregateLLMMetrics(list));
      setGpuSnapshot(snap);
      setAvailableModels(tags);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onToggleEnabled = () => {
    const next = !enabled;
    setLLMTelemetryEnabled(next);
    setEnabledState(next);
  };

  const onClear = async () => {
    if (!window.confirm('¿Borrar todos los eventos de telemetría LLM? (no afecta el catálogo ni la chagra)')) return;
    await clearLLMTelemetry();
    refresh();
  };

  const onExport = async (format) => {
    const data = await exportLLMTelemetry(format);
    const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chagra-llm-telemetry-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = aggregates.totals || {};
  const byModel = aggregates.byModel || {};
  const byFlujo = aggregates.byFlujo || {};

  return (
    <ScreenShell>
      <div className="max-w-5xl mx-auto p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ChevronLeft size={18} /> Volver
          </button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu size={20} className="text-emerald-400" /> Oracle LLM / GPU
          </h1>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
            aria-label="Refrescar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* GPU Snapshot */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Zap size={14} className="text-amber-400" /> GPU — Modelos cargados
          </h2>
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-4">
            {!gpuSnapshot && (
              <div className="text-sm text-slate-500">Cargando snapshot…</div>
            )}
            {gpuSnapshot && !gpuSnapshot.available && (
              <div className="text-sm text-amber-300 flex items-center gap-2">
                <AlertTriangle size={14} /> Ollama no responde — {gpuSnapshot.error}
              </div>
            )}
            {gpuSnapshot?.available && gpuSnapshot.models.length === 0 && (
              <div className="text-sm text-slate-500">Ningún modelo cargado en RAM/VRAM ahora mismo. Se cargan al primer call.</div>
            )}
            {gpuSnapshot?.available && gpuSnapshot.models.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-500">
                  VRAM total ocupada: <span className="text-emerald-400 font-mono">{formatVram(gpuSnapshot.totalVramMB)}</span>
                  {' · '}snapshot: {formatTs(gpuSnapshot.ts)}
                </div>
                {gpuSnapshot.models.map((m) => {
                  const procStyle = PROCESSOR_STYLES[m.processor] || PROCESSOR_STYLES.unknown;
                  return (
                    <div key={m.name} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{m.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {m.details.parameterSize || '?'} · {m.details.quantization || '?'} · {m.details.family || '?'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono text-emerald-400">{formatVram(m.vramMB)}</div>
                        <div className="text-[9px] text-slate-500">VRAM / {formatVram(m.sizeMB)}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full border font-mono ${procStyle.color}`}>
                        {procStyle.label} {m.gpuShare ? `${Math.round(m.gpuShare * 100)}%` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {availableModels.available && availableModels.models.length > 0 && (
            <details className="rounded-xl bg-slate-900/30 border border-slate-800 p-3">
              <summary className="text-xs text-slate-400 cursor-pointer">
                Catálogo de modelos disponibles ({availableModels.models.length})
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-mono">
                {availableModels.models.map((m) => (
                  <div key={m.name} className="flex justify-between gap-2 text-slate-400">
                    <span className="truncate">{m.name}</span>
                    <span className="text-slate-600 shrink-0">{m.parameterSize || ''}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        {/* Totals */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Activity size={14} className="text-emerald-400" /> Telemetría LLM — agregados
          </h2>
          {totals.total === 0 ? (
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 text-center">
              <p className="text-sm text-slate-400">
                {enabled
                  ? 'Aún no hay eventos. Hacé una pregunta a la IA y volvé acá.'
                  : 'Telemetría LLM deshabilitada. Activá el switch para empezar a registrar.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <StatCard label="Calls total" value={totals.total} sublabel={`${totals.success || 0} OK · ${totals.error || 0} err`} />
              <StatCard label="GPU / CPU" value={`${totals.gpuCalls || 0} / ${totals.cpuCalls || 0}`} sublabel={`${formatPct((totals.gpuCalls || 0) / (totals.total || 1))} GPU`} color="text-emerald-400" />
              <StatCard label="Latencia media" value={formatMs(totals.avgTotalMs)} sublabel={`p95: ${formatMs(totals.p95TotalMs)}`} />
              <StatCard label="Eval rate medio" value={formatRate(totals.avgEvalRate)} sublabel={`${formatPct(totals.successRate)} success`} color="text-amber-400" />
            </div>
          )}
        </section>

        {/* Por modelo */}
        {Object.keys(byModel).length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Por modelo</h2>
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-800/60 text-slate-400">
                  <tr>
                    <th className="text-left px-3 py-2">Modelo</th>
                    <th className="text-right px-3 py-2">Calls</th>
                    <th className="text-right px-3 py-2">Lat. media</th>
                    <th className="text-right px-3 py-2">p95</th>
                    <th className="text-right px-3 py-2">t/s</th>
                    <th className="text-right px-3 py-2">GPU%</th>
                    <th className="text-right px-3 py-2">Err%</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byModel).map(([model, s]) => (
                    <tr key={model} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="px-3 py-2 font-mono text-white truncate max-w-[180px]">{model}</td>
                      <td className="px-3 py-2 text-right text-slate-300">{s.count}</td>
                      <td className="px-3 py-2 text-right text-slate-300">{formatMs(s.avgTotalMs)}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{formatMs(s.p95TotalMs)}</td>
                      <td className="px-3 py-2 text-right text-amber-400">{formatRate(s.avgEvalRate)}</td>
                      <td className={`px-3 py-2 text-right ${s.gpuShare > 0.5 ? 'text-emerald-400' : 'text-slate-500'}`}>{formatPct(s.gpuShare)}</td>
                      <td className={`px-3 py-2 text-right ${s.errorRate > 0.1 ? 'text-red-400' : 'text-slate-500'}`}>{formatPct(s.errorRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Por flujo */}
        {Object.keys(byFlujo).length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Por flujo</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(byFlujo).map(([flujo, s]) => (
                <div key={flujo} className="rounded-xl bg-slate-900/40 border border-slate-800 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{FLUJO_LABELS[flujo] || flujo}</div>
                  <div className="text-lg font-bold text-white">{s.count}</div>
                  <div className="text-[10px] text-slate-500">
                    {formatMs(s.avgTotalMs)} medio · {formatPct(s.errorRate)} err
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Eventos recientes */}
        {events.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Eventos recientes ({events.length})
            </h2>
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-800/60 text-slate-400 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Fecha</th>
                      <th className="text-left px-3 py-2">Modelo</th>
                      <th className="text-left px-3 py-2">Flujo</th>
                      <th className="text-right px-3 py-2">Total</th>
                      <th className="text-right px-3 py-2">Tokens</th>
                      <th className="text-right px-3 py-2">t/s</th>
                      <th className="text-center px-3 py-2">GPU</th>
                      <th className="text-center px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => {
                      const status = STATUS_STYLES[e.status] || STATUS_STYLES.success;
                      const proc = PROCESSOR_STYLES[e.processor] || PROCESSOR_STYLES.unknown;
                      return (
                        <tr key={e.id} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                          <td className="px-3 py-1.5 text-slate-400 font-mono whitespace-nowrap">{formatTs(e.created_at)}</td>
                          <td className="px-3 py-1.5 text-slate-300 font-mono truncate max-w-[140px]">{e.model}</td>
                          <td className="px-3 py-1.5 text-slate-500">{FLUJO_LABELS[e.flujo] || e.flujo}</td>
                          <td className="px-3 py-1.5 text-right text-slate-300">{formatMs(e.total_ms)}</td>
                          <td className="px-3 py-1.5 text-right text-slate-500">{e.eval_count ?? '-'}</td>
                          <td className="px-3 py-1.5 text-right text-amber-400">{formatRate(e.eval_rate)}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-mono ${proc.color}`}>{proc.label}</span>
                          </td>
                          <td className={`px-3 py-1.5 text-center ${status.color}`}>
                            <span className="inline-flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                              {e.error_kind || status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Controles */}
        <section className="space-y-3 rounded-2xl bg-slate-900/40 border border-slate-800 p-4">
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 cursor-pointer min-h-[48px]">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-slate-200">Habilitar telemetría LLM</span>
              <span className="text-[10px] text-slate-500">Registra metadata privacy-safe — NUNCA prompt ni respuesta</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={onToggleEnabled}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${enabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => onExport('json')} className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-200 flex items-center justify-center gap-2 min-h-[44px]">
              <Download size={14} /> JSON
            </button>
            <button onClick={() => onExport('csv')} className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-200 flex items-center justify-center gap-2 min-h-[44px]">
              <Download size={14} /> CSV
            </button>
            <button onClick={onClear} className="p-3 rounded-xl bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 text-sm text-red-300 flex items-center justify-center gap-2 min-h-[44px]">
              <Trash2 size={14} /> Borrar
            </button>
          </div>
        </section>
      </div>
    </ScreenShell>
  );
}
