import React, { useMemo } from 'react';
import { Clock, Eye, HelpCircle, AlertTriangle, CheckCircle, Sprout, Timer } from 'lucide-react';
import { calculateWindows, formatWindow, getCurrentStage } from '../services/phenologyCalculator';

const confidenceColor = (c) => {
  if (c >= 0.9) return 'text-emerald-400';
  if (c >= 0.6) return 'text-lime-400';
  if (c >= 0.4) return 'text-amber-400';
  return 'text-slate-500';
};

const stageColor = (code) => {
  const map = {
    sowing: 'bg-emerald-800 border-emerald-600',
    emergence: 'bg-lime-800 border-lime-600',
    vegetative: 'bg-green-800 border-green-600',
    flowering: 'bg-pink-800 border-pink-600',
    fruiting: 'bg-amber-800 border-amber-600',
    harvest_window: 'bg-yellow-800 border-yellow-600',
    closed: 'bg-slate-800 border-slate-600',
  };
  return map[code] || 'bg-slate-800 border-slate-600';
};

/**
 * PhenologyTimeline — timeline fenológica básica (Task 20).
 *
 * Props:
 *   - speciesSlug: string
 *   - sowingDate: number (timestamp ms)
 *   - altitudeM: number (opcional)
 *   - observedStages: Array<{code, observed_at, confidence}> (opcional)
 *   - compact: boolean (default false), modo resumen para tarjeta pequeña
 */
export default function PhenologyTimeline({
  speciesSlug,
  sowingDate,
  altitudeM,
  phenologyTemplate,
  observedStages = [],
  compact = false,
}) {
  const windows = useMemo(() => {
    if (!speciesSlug || !sowingDate) return [];
    return calculateWindows({ speciesSlug, sowingDate, altitudeM, template: phenologyTemplate });
  }, [speciesSlug, sowingDate, altitudeM, phenologyTemplate]);

  const estimatedCurrent = useMemo(() => {
    if (!speciesSlug || !sowingDate) return null;
    return getCurrentStage({ speciesSlug, sowingDate, altitudeM, template: phenologyTemplate });
  }, [speciesSlug, sowingDate, altitudeM, phenologyTemplate]);

  const observedMap = useMemo(() => {
    const m = {};
    observedStages.forEach((os) => { m[os.code] = os; });
    return m;
  }, [observedStages]);

  if (!speciesSlug || !sowingDate) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
        <HelpCircle size={24} className="text-slate-500 mx-auto mb-2" />
        <p className="text-xs text-slate-500">Datos insuficientes para estimar ventanas fenológicas.</p>
      </div>
    );
  }

  if (windows.length === 1 && windows[0].status !== 'computed') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
        <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2" />
        <p className="text-xs text-slate-400">{formatWindow(windows[0])}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h3 className="text-2xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-4">
        <Sprout size={13} className="text-lime-400" />
        Timeline fenológica
        {altitudeM && <span className="text-slate-600 font-normal normal-case"> · {altitudeM} msnm</span>}
      </h3>

      <div className="flex flex-col gap-2">
        {windows.map((win, i) => {
          const obs = observedMap[win.code];
          const isObservedCurrent = obs && obs.code === win.code;
          const isEstimatedCurrent = estimatedCurrent && estimatedCurrent.stage.code === win.code && !isObservedCurrent;
          const isPast = obs && windows.findIndex((w) => w.code === obs.code) > i;

          return (
            <div key={win.code} className={`flex gap-2 ${compact ? 'items-center' : ''}`}>
              {/* Indicador de etapa */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <div className={`w-3 h-3 rounded-full border ${stageColor(win.code)} ${isObservedCurrent ? 'ring-2 ring-lime-400/50' : ''} ${isEstimatedCurrent ? 'ring-2 ring-sky-400/40 border-dashed' : ''} ${isPast ? 'opacity-50' : ''}`} />
                {i < windows.length - 1 && <div className="w-px h-4 bg-slate-700" />}
              </div>

              {/* Contenido */}
              <div className={`flex-1 min-w-0 ${compact ? 'flex items-center gap-2' : ''}`}>
                <div className={`flex items-center gap-1.5 ${isPast ? 'opacity-50' : ''}`}>
                  <span className={`text-sm font-medium ${isObservedCurrent ? 'text-lime-300' : 'text-slate-200'}`}>
                    {win.label}
                  </span>
                  {obs && (
                    <span className="inline-flex items-center gap-0.5 text-2xs text-emerald-400" title="Observado">
                      <Eye size={10} />
                    </span>
                  )}
                  {isEstimatedCurrent && (
                    <span className="inline-flex items-center gap-0.5 text-2xs text-sky-400" title={`Estimado: ${estimatedCurrent.daysElapsed} días desde siembra`}>
                      <Timer size={10} />
                    </span>
                  )}
                </div>

                {!compact && (
                  <div className="flex items-center gap-2 mt-0.5">
                    {/* Barra estimada */}
                    <span className="text-2xs text-slate-400 flex items-center gap-0.5">
                      <Clock size={9} />
                      est: {formatWindow(win)}
                    </span>

                    {obs && (
                      <span className="text-2xs text-emerald-400/80 flex items-center gap-0.5">
                        <CheckCircle size={9} />
                        obs: {new Date(obs.observed_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                )}

                {!compact && win.sources.length > 0 && (
                  <p className="text-3xs text-slate-600 mt-0.5">Fuente: {win.sources.join(', ')}</p>
                )}

                {!compact && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-2xs ${confidenceColor(win.confidence)}`}>
                      confianza {Math.round(win.confidence * 100)}%
                    </span>
                    {win.confidence < 0.6 && (
                      <span title="Baja confianza: datos incompletos">
                        <AlertTriangle size={9} className="text-amber-500" />
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Fecha compacta */}
              {compact && (
                <span className="text-2xs text-slate-500 shrink-0">{formatWindow(win)}</span>
              )}
            </div>
          );
        })}
      </div>

      {!compact && (
        <p className="text-3xs text-slate-600 mt-4 flex items-center gap-1">
          <AlertTriangle size={9} className="text-amber-500" />
          Las fechas estimadas son ventanas de referencia. No representan observación real.
        </p>
      )}
    </div>
  );
}
