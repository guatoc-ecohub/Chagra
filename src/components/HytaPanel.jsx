import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Zap, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getGpuSnapshot } from '../services/gpuTelemetryService';

/**
 * HytaPanel — Panel de información GPU (Task #117, 2026-05-25).
 *
 * Muestra información básica sobre el estado de GPU/Ollama:
 *   - Modelos cargados en VRAM
 *   - Uso total de VRAM
 *   - Tipo de procesamiento (GPU/CPU/parcial)
 *
 * Este componente reemplaza la funcionalidad de LLMTelemetryScreen removida
 * en commit 9070dbd, pero con alcance limitado a solo info de GPU (no telemetría
 * detallada de LLM para respetar ADR-020 anti-leak).
 *
 * Privacy: solo muestra modelo y bytes VRAM. NO prompts, NO respuestas,
 * NO métricas detalladas de uso.
 *
 * CTA: "Ver GPU detectada" que refresca el snapshot manualmente.
 * Si GPU no está disponible, muestra "GPU info no disponible".
 */

const PROCESSOR_STYLES = {
  gpu: { label: 'GPU', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' },
  partial: { label: 'Parcial', color: 'bg-amber-900/40 text-amber-300 border-amber-700/50' },
  cpu: { label: 'CPU', color: 'bg-slate-700/40 text-slate-300 border-slate-600/50' },
  unknown: { label: '?', color: 'bg-slate-800/40 text-slate-500 border-slate-700/50' },
};

const formatVram = (mb) => {
  if (!mb) return '-';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
};

const formatTs = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
};

export default function HytaPanel() {
  const [gpuSnapshot, setGpuSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getGpuSnapshot({ force: true });
      setGpuSnapshot(snap);
      if (!snap.available) {
        setError(snap.error || 'GPU info no disponible');
      }
    } catch (err) {
      console.error('[HytaPanel] Error al obtener snapshot GPU:', err);
      setError('GPU info no disponible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 px-1">
        <Cpu size={18} className="text-emerald-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          HYTA GPU
        </h3>
      </div>

      <p className="text-[11px] text-slate-500 px-1 leading-relaxed">
        Estado del acelerador GPU y modelos cargados en VRAM. Privacy-safe:
        solo muestra modelo y uso de memoria, nunca prompts ni respuestas.
      </p>

      {/* Estado de GPU */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
        {loading && (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin" />
            Detectando GPU…
          </div>
        )}

        {!loading && error && (
          <div className="text-sm text-amber-300 flex items-center gap-2">
            <AlertTriangle size={14} />
            GPU info no disponible
          </div>
        )}

        {!loading && !error && gpuSnapshot?.available && (
          <div className="space-y-3">
            {/* Resumen de VRAM */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-400" />
                <span className="text-xs text-slate-400">VRAM total ocupada</span>
              </div>
              <span className="text-sm font-mono text-emerald-400 font-bold">
                {formatVram(gpuSnapshot.totalVramMB)}
              </span>
            </div>

            {/* Lista de modelos */}
            {gpuSnapshot.models.length === 0 ? (
              <p className="text-xs text-slate-500 mt-2">
                Ningún modelo cargado. Se cargan al primer uso.
              </p>
            ) : (
              <div className="space-y-2 mt-3">
                <p className="text-[10px] text-slate-600 uppercase tracking-wide font-bold">
                  Modelos cargados ({gpuSnapshot.models.length})
                </p>
                {gpuSnapshot.models.map((m) => {
                  const procStyle = PROCESSOR_STYLES[m.processor] || PROCESSOR_STYLES.unknown;
                  return (
                    <div
                      key={m.name}
                      className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-800/40 border border-slate-800"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{m.name}</div>
                        <div className="text-[9px] text-slate-500">
                          {m.details.parameterSize || '?'} · {m.details.quantization || '?'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono text-emerald-400">{formatVram(m.vramMB)}</div>
                      </div>
                      <span className={`text-[9px] px-2 py-1 rounded-full border font-mono ${procStyle.color}`}>
                        {procStyle.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Timestamp */}
            <p className="text-[9px] text-slate-600 mt-2">
              Actualizado: {formatTs(gpuSnapshot.ts)}
            </p>
          </div>
        )}
      </div>

      {/* Botón de acción */}
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 font-bold text-sm text-slate-200 flex items-center justify-center gap-2 min-h-[48px] transition-colors"
      >
        {loading ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            Detectando…
          </>
        ) : (
          <>
            <Cpu size={16} />
            Ver GPU detectada
          </>
        )}
      </button>

      {/* Nota sobre privacidad */}
      <p className="text-[9px] text-slate-600 text-center leading-tight">
        La telemetría LLM detallada vive en el panel privado del operador (ADR-020 / ADR-029).
      </p>
    </div>
  );
}
