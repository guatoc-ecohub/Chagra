import React, { useMemo } from 'react';
import { Clock, Eye, HelpCircle, AlertTriangle, CheckCircle, Sprout, Timer } from 'lucide-react';
import { calculateWindows, formatWindow, getCurrentStage } from '../services/phenologyCalculator';

// Colores theme-aware: la rampa slate/emerald/amber y los acentos custom
// (orchid/morpho) se remapean por tema (themes.css / tailwind.config.js), así el
// timeline se ve claro en nature/minimalista y oscuro en biopunk. Antes usaba
// lime/green/pink/yellow/sky fijos → se veían oscuros sobre fondo claro.
const confidenceColor = (c) => {
  if (c >= 0.9) return 'text-emerald-400';
  if (c >= 0.6) return 'text-emerald-300';
  if (c >= 0.4) return 'text-amber-400';
  return 'text-slate-500';
};

const stageColor = (code) => {
  const map = {
    sowing: 'bg-emerald-800 border-emerald-600',
    emergence: 'bg-emerald-700 border-emerald-500',
    vegetative: 'bg-emerald-600 border-emerald-400',
    flowering: 'bg-orchid border-orchid',
    fruiting: 'bg-amber-700 border-amber-500',
    harvest_window: 'bg-amber-600 border-amber-400',
    closed: 'bg-slate-700 border-slate-500',
  };
  return map[code] || 'bg-slate-700 border-slate-500';
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
  category,
  observedStages = [],
  compact = false,
}) {
  const windows = useMemo(() => {
    if (!speciesSlug || !sowingDate) return [];
    return calculateWindows({ speciesSlug, sowingDate, altitudeM, template: phenologyTemplate, category });
  }, [speciesSlug, sowingDate, altitudeM, phenologyTemplate, category]);

  const estimatedCurrent = useMemo(() => {
    if (!speciesSlug || !sowingDate) return null;
    return getCurrentStage({ speciesSlug, sowingDate, altitudeM, template: phenologyTemplate, category });
  }, [speciesSlug, sowingDate, altitudeM, phenologyTemplate, category]);

  // Una ventana genérica (no específica de la especie) marca todo el timeline
  // como aproximado por tipo de cultivo.
  const isGenericEstimate = useMemo(
    () => windows.some((w) => w.isGeneric),
    [windows],
  );

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
        <Sprout size={13} className="text-emerald-400" />
        Timeline fenológica
        {altitudeM && <span className="text-slate-600 font-normal normal-case"> · {altitudeM} msnm</span>}
      </h3>

      {isGenericEstimate && !compact && (
        <div className="flex items-start gap-1.5 bg-amber-900/20 border border-amber-800/40 rounded-lg px-2.5 py-2 mb-3">
          <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-2xs text-amber-200">
            Aproximación por tipo de cultivo. No hay fenología específica para esta especie:
            las fechas son una referencia amplia, no un dato firme de la especie.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {windows.map((win, i) => {
          const obs = observedMap[win.code];
          const isObservedCurrent = obs && obs.code === win.code;
          const isEstimatedCurrent = estimatedCurrent && estimatedCurrent.stage.code === win.code && !isObservedCurrent;
          const isPast = obs && windows.findIndex((w) => w.code === obs.code) > i;

          const isCurrent = isObservedCurrent || isEstimatedCurrent;

          return (
            <div
              key={win.code}
              className={`flex gap-2 ${compact ? 'items-center' : ''} ${
                // Etapa actual resaltada como fila: legible de un vistazo (sol,
                // pantalla pequeña), no solo un anillo en el punto. Solo
                // presentación; el cálculo de etapa no cambia.
                !compact && isCurrent
                  ? 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 -mx-2'
                  : ''
              }`}
            >
              {/* Indicador de etapa */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <div className={`rounded-full border ${isCurrent ? 'w-3.5 h-3.5' : 'w-3 h-3'} ${stageColor(win.code)} ${isObservedCurrent ? 'ring-2 ring-emerald-400/50' : ''} ${isEstimatedCurrent ? 'ring-2 ring-morpho/40 border-dashed' : ''} ${isPast ? 'opacity-50' : ''}`} />
                {i < windows.length - 1 && <div className="w-px h-4 bg-slate-700" />}
              </div>

              {/* Contenido */}
              <div className={`flex-1 min-w-0 ${compact ? 'flex items-center gap-2' : ''}`}>
                <div className={`flex items-center gap-1.5 ${isPast ? 'opacity-50' : ''}`}>
                  <span className={`text-sm ${isCurrent ? 'font-bold' : 'font-medium'} ${isObservedCurrent ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {win.label}
                  </span>
                  {isCurrent && !compact && (
                    <span className="text-2xs font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                      ahora
                    </span>
                  )}
                  {obs && (
                    <span className="inline-flex items-center gap-0.5 text-2xs text-emerald-400" title="Observado">
                      <Eye size={10} />
                    </span>
                  )}
                  {isEstimatedCurrent && (
                    <span className="inline-flex items-center gap-0.5 text-2xs text-morpho" title={`Estimado: ${estimatedCurrent.daysElapsed} días desde siembra`}>
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
