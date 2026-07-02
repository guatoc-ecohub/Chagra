import React, { useMemo } from 'react';
import { Clock, Eye, HelpCircle, AlertTriangle, CheckCircle, Sprout, Timer } from 'lucide-react';
import EtapaCicloIcon from './icons/EtapaCicloIcon.jsx';
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

// Rampa por etapa: bg/border (se conserva la rampa theme-aware) + color del
// GLIFO de etapa. El icono va claro sobre el disco lleno para ser legible a
// 11px dentro del badge de 20px (antes era un punto de 12px sin glifo: sin
// leer el label no se sabía qué etapa era).
const stageColor = (code) => {
  const map = {
    sowing: 'bg-emerald-800 border-emerald-600 text-emerald-100',
    emergence: 'bg-emerald-700 border-emerald-500 text-emerald-100',
    vegetative: 'bg-emerald-600 border-emerald-400 text-emerald-50',
    flowering: 'bg-orchid border-orchid text-white',
    fruiting: 'bg-amber-700 border-amber-500 text-amber-100',
    harvest_window: 'bg-amber-600 border-amber-400 text-amber-50',
    closed: 'bg-slate-700 border-slate-500 text-slate-200',
  };
  return map[code] || 'bg-slate-700 border-slate-500 text-slate-200';
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

          return (
            <div key={win.code} className={`flex gap-2 ${compact ? 'items-center' : ''}`}>
              {/* Indicador de etapa: badge con GLIFO de la etapa (set
                  compartido EtapaCicloIcon). Conserva los estados visuales:
                  observado (ring emerald), estimado (ring morpho + borde
                  punteado) y pasado (atenuado). */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <div className={`w-5 h-5 rounded-full border grid place-items-center ${stageColor(win.code)} ${isObservedCurrent ? 'ring-2 ring-emerald-400/50' : ''} ${isEstimatedCurrent ? 'ring-2 ring-morpho/40 border-dashed' : ''} ${isPast ? 'opacity-50' : ''}`}>
                  <EtapaCicloIcon code={win.code} nombre={win.label} size={11} strokeWidth={2.25} />
                </div>
                {i < windows.length - 1 && <div className="w-px h-3 bg-slate-700" />}
              </div>

              {/* Contenido */}
              <div className={`flex-1 min-w-0 ${compact ? 'flex items-center gap-2' : ''}`}>
                <div className={`flex items-center gap-1.5 ${isPast ? 'opacity-50' : ''}`}>
                  <span className={`text-sm font-medium ${isObservedCurrent ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {win.label}
                  </span>
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
