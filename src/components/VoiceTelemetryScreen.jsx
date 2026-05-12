import React, { useState, useEffect, useCallback } from 'react';
import { Mic, Activity, List, Download, Trash2, CheckCircle2, Clock, FileText, TrendingUp } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import {
  getSessionEvents,
  aggregateVoiceMetrics,
  exportVoiceTelemetry,
  clearVoiceTelemetry,
} from '../services/voiceTelemetry';

const KIND_LABELS = {
  'voice:recording_started': 'Inicio grabación',
  'voice:recording_stopped': 'Fin grabación',
  'voice:transcription_started': 'Transcripción iniciada',
  'voice:transcription_done': 'Transcripción exitosa',
  'voice:transcription_failed': 'Transcripción fallida',
  'voice:extraction_done': 'Extracción exitosa',
  'voice:extraction_failed': 'Extracción fallida',
  'voice:save_done': 'Guardado exitoso',
  'voice:save_failed': 'Guardado fallido',
  'voice:reprocess_started': 'Reintento',
  'voice:discarded': 'Descartado',
};

const LEVEL_COLORS = {
  info: { dot: 'bg-blue-500', text: 'text-blue-400' },
  warn: { dot: 'bg-amber-500', text: 'text-amber-400' },
  error: { dot: 'bg-red-500', text: 'text-red-400' },
};

const formatTs = (ts) => {
  const d = new Date(ts);
  return d.toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
};

const formatDuration = (ms) => {
  if (!ms) return '-';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
};

const getEventPayloadSummary = (e) => {
  if (e.kind === 'voice:recording_stopped' && e.payload?.durationMs != null) {
    return `${formatDuration(e.payload.durationMs)}`;
  }
  if (e.kind === 'voice:transcription_done' && e.payload?.textLength != null) {
    return `${e.payload.textLength} caracteres`;
  }
  if (e.kind === 'voice:extraction_done' && e.payload?.entityCount != null) {
    return `${e.payload.entityCount} entidades`;
  }
  if (e.kind === 'voice:save_done') {
    const parts = [];
    if (e.payload?.savedCount != null) parts.push(`${e.payload.savedCount} guardados`);
    if (e.payload?.syncedOffline) parts.push('offline');
    return parts.join(' ') || 'OK';
  }
  return '';
};

export default function VoiceTelemetryScreen({ onBack }) {
  const [metrics, setMetrics] = useState(null);
  const [events, setEvents] = useState([]);
  const [clearConfirm, setClearConfirm] = useState(false);

  const refresh = useCallback(() => {
    setEvents(getSessionEvents());
    setMetrics(aggregateVoiceMetrics());
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const handleExport = (format) => {
    const data = exportVoiceTelemetry(format);
    const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-telemetry.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    clearVoiceTelemetry();
    setClearConfirm(false);
    refresh();
  };

  const hasData = events.length > 0;
  const m = metrics || {};

  return (
    <ScreenShell
      title="Telemetría de Voz"
      icon={Mic}
      onBack={onBack}
      actions={
        hasData ? (
          <button
            type="button"
            onClick={() => setClearConfirm(true)}
            className="p-2 rounded-xl bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Limpiar telemetría"
          >
            <Trash2 size={18} />
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 p-4 pb-8">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Mic size={48} className="text-slate-600" />
            <p className="text-slate-500 text-sm font-bold">Sin eventos de telemetría</p>
            <p className="text-xs text-slate-600 text-center max-w-xs">
              Usa el comando de voz para registrar actividades. Los eventos aparecerán aquí.
            </p>
          </div>
        ) : (
          <>
            {/* Executive Summary */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity size={14} /> Resumen de la sesión
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard
                  label="Grabaciones"
                  value={m.recordings ?? 0}
                  icon={Mic}
                  color="text-blue-400"
                />
                <SummaryCard
                  label="Transcripciones"
                  value={`${m.transcriptions?.done ?? 0}/${m.transcriptions?.failed ?? 0}`}
                  sub="exitosas/fallidas"
                  icon={FileText}
                  color={m.transcriptions?.failed > 0 ? 'text-amber-400' : 'text-emerald-400'}
                />
                <SummaryCard
                  label="Extracciones"
                  value={`${m.extraction?.done ?? 0}/${m.extraction?.failed ?? 0}`}
                  sub="exitosas/fallidas"
                  icon={TrendingUp}
                  color={m.extraction?.failed > 0 ? 'text-amber-400' : 'text-emerald-400'}
                />
                <SummaryCard
                  label="Tasa de éxito"
                  value={m.successRate ?? '0%'}
                  icon={CheckCircle2}
                  color="text-emerald-400"
                />
              </div>
            </section>

            {/* Aggregate Metrics */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity size={14} /> Métricas agregadas
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetricCard
                  label="Duración total"
                  value={formatDuration(m.recordingDurationMs?.total)}
                  sub={m.recordingDurationMs?.avg ? `promedio ${formatDuration(m.recordingDurationMs.avg)}` : ''}
                  icon={Clock}
                />
                <MetricCard
                  label="Texto transcrito"
                  value={m.transcriptionLength?.total != null ? `${m.transcriptionLength.total} caracteres` : '-'}
                  sub={m.transcriptionLength?.avg ? `promedio ${m.transcriptionLength.avg} car` : ''}
                  icon={FileText}
                />
                <MetricCard
                  label="Entidades extraídas"
                  value={m.entityCount?.total ?? '-'}
                  sub={m.entityCount?.avg ? `promedio ${m.entityCount.avg}` : ''}
                  icon={TrendingUp}
                />
              </div>
            </section>

            {/* Event Table */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <List size={14} /> Eventos ({events.length})
              </h2>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80">
                        <th className="text-left p-3 font-bold text-slate-400 whitespace-nowrap">Fecha</th>
                        <th className="text-left p-3 font-bold text-slate-400 whitespace-nowrap">Evento</th>
                        <th className="text-left p-3 font-bold text-slate-400 whitespace-nowrap">Detalle</th>
                        <th className="text-center p-3 font-bold text-slate-400 whitespace-nowrap">Nivel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...events].reverse().map((e, i) => {
                        const lc = LEVEL_COLORS[e.level] || LEVEL_COLORS.info;
                        return (
                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                            <td className="p-3 text-slate-300 whitespace-nowrap font-mono">
                              {formatTs(e.ts)}
                            </td>
                            <td className="p-3 text-white whitespace-nowrap">
                              {KIND_LABELS[e.kind] || e.kind}
                            </td>
                            <td className="p-3 text-slate-400 max-w-[160px] truncate">
                              {getEventPayloadSummary(e)}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex items-center gap-1.5 ${lc.text}`}>
                                <span className={`w-2 h-2 rounded-full ${lc.dot}`} />
                                {e.level}
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

            {/* Export Buttons */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Download size={14} /> Exportar datos
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-sm text-slate-200 flex items-center justify-center gap-2 min-h-[48px] transition-colors"
                >
                  <Download size={16} /> Exportar CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-sm text-slate-200 flex items-center justify-center gap-2 min-h-[48px] transition-colors"
                >
                  <Download size={16} /> Exportar JSON
                </button>
              </div>
            </section>

            {/* Clear Data */}
            {!clearConfirm ? (
              <button
                type="button"
                onClick={() => setClearConfirm(true)}
                className="p-3 rounded-xl bg-red-900/20 border border-red-800/40 text-red-400 font-bold text-sm flex items-center justify-center gap-2 min-h-[48px] transition-colors hover:bg-red-900/30"
              >
                <Trash2 size={16} /> Limpiar telemetría local
              </button>
            ) : (
              <div className="bg-red-900/20 border border-red-800/40 rounded-2xl p-4 space-y-3">
                <p className="text-sm text-red-300 font-bold text-center">
                  Se eliminarán todos los eventos de telemetría de esta sesión.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setClearConfirm(false)}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm min-h-[48px] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm min-h-[48px] transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ScreenShell>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1">
      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{label}</span>
      <span className={`text-2xl font-black ${color}`}>{value}</span>
      {sub && <span className="text-[10px] text-slate-500">{sub}</span>}
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-slate-500 shrink-0" />}
        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{label}</span>
      </div>
      <span className="text-lg font-black text-white">{value}</span>
      {sub && <span className="text-[10px] text-slate-500">{sub}</span>}
    </div>
  );
}
