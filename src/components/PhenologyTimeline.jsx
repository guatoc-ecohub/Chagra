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

// Ancho de la ventana estimada de una etapa, en días. Es solo FORMATO de las
// ventanas ya calculadas (windowEnd − windowStart), no un cálculo nuevo:
// la fuente de verdad sigue siendo phenologyCalculator.
const stageWindowDays = (w) => {
  if (!w || !w.windowStart || !w.windowEnd) return null;
  const days = Math.round((w.windowEnd - w.windowStart) / 86400000);
  return days > 0 ? days : null;
};

// Tokens de superficie compartidos (tokens.css): radio + sombra de card en
// reposo, mismos que las cards ya unificadas (directorio, calendario).
const CARD_SURFACE = 'bg-slate-900 border border-slate-800 rounded-[var(--r-md,16px)] shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))]';

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

  // Índice de la etapa ACTUAL para el arco y el resaltado: lo observado por el
  // campesino manda sobre lo estimado por calendario (misma prioridad que ya
  // tenía la lista). Solo agrega la vista de "dónde va el ciclo", sin tocar
  // el cálculo de ventanas.
  const currentIdx = useMemo(() => {
    let idx = -1;
    windows.forEach((w, i) => { if (observedMap[w.code]) idx = Math.max(idx, i); });
    if (idx >= 0) return idx;
    if (estimatedCurrent) return estimatedCurrent.stageIndex;
    return -1;
  }, [windows, observedMap, estimatedCurrent]);

  if (!speciesSlug || !sowingDate) {
    return (
      <div className={`${CARD_SURFACE} p-4 text-center`}>
        <HelpCircle size={24} className="text-slate-500 mx-auto mb-2" />
        <p className="text-xs text-slate-500">Datos insuficientes para estimar ventanas fenológicas.</p>
      </div>
    );
  }

  if (windows.length === 1 && windows[0].status !== 'computed') {
    return (
      <div className={`${CARD_SURFACE} p-4 text-center`}>
        <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2" />
        <p className="text-xs text-slate-400">{formatWindow(windows[0])}</p>
      </div>
    );
  }

  return (
    <div className={`${CARD_SURFACE} p-4`}>
      <h3 className="text-2xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-3">
        <Sprout size={13} className="text-emerald-400" />
        Timeline fenológica
        {altitudeM && <span className="text-slate-600 font-normal normal-case"> · {altitudeM} msnm</span>}
      </h3>

      {/* Arco del ciclo (siembra → cosecha) de un vistazo: cada nodo es el
          glifo de su etapa (set EtapaCicloIcon); lo recorrido va en verde, la
          etapa actual crece con anillo, lo que falta queda apagado. Es un
          resumen decorativo de la lista de abajo (aria-hidden: la info
          accesible completa vive en la lista). */}
      {windows.length > 1 && (
        <div className="flex items-center mb-1 px-0.5" aria-hidden="true">
          {windows.map((win, i) => {
            const isCurrent = i === currentIdx;
            const isPastStage = currentIdx >= 0 && i < currentIdx;
            const isFuture = currentIdx >= 0 && i > currentIdx;
            return (
              <React.Fragment key={win.code}>
                {i > 0 && (
                  <div className={`flex-1 h-0.5 min-w-1 rounded-full ${i <= currentIdx ? 'bg-emerald-500/70' : 'bg-slate-700'}`} />
                )}
                <div
                  title={win.label}
                  className={`grid place-items-center rounded-full border shrink-0 transition-[transform,box-shadow] duration-[var(--dur-estado,0.18s)] ${
                    isCurrent
                      ? `w-8 h-8 ${stageColor(win.code)} ring-2 ring-emerald-400/60 shadow-[var(--sombra-2,0_6px_18px_rgb(8_30_22/0.22))]`
                      : isFuture
                        ? 'w-6 h-6 bg-slate-800/80 border-slate-700 text-slate-500'
                        : `w-6 h-6 ${stageColor(win.code)} ${isPastStage ? 'opacity-70' : ''}`
                  }`}
                >
                  <EtapaCicloIcon code={win.code} nombre={win.label} size={isCurrent ? 15 : 12} strokeWidth={2.25} />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Contador de días del ciclo: dato que ya calcula getCurrentStage,
          antes escondido en un tooltip. */}
      {estimatedCurrent && estimatedCurrent.daysElapsed >= 0 && (
        <p className="text-2xs text-slate-500 mb-3 flex items-center gap-1">
          <Timer size={10} className="text-morpho shrink-0" />
          Día {estimatedCurrent.daysElapsed} desde la siembra
        </p>
      )}

      {isGenericEstimate && !compact && (
        <div className="flex items-start gap-1.5 bg-amber-900/20 border border-amber-800/40 rounded-lg px-2.5 py-2 mb-3">
          <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-2xs text-amber-200">
            Aproximación por tipo de cultivo. No hay fenología específica para esta especie:
            las fechas son una referencia amplia, no un dato firme de la especie.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {windows.map((win, i) => {
          const obs = observedMap[win.code];
          const isObservedCurrent = obs && obs.code === win.code;
          const isEstimatedCurrent = estimatedCurrent && estimatedCurrent.stage.code === win.code && !isObservedCurrent;
          const isPast = obs && windows.findIndex((w) => w.code === obs.code) > i;
          const isNow = i === currentIdx;
          const windowDays = stageWindowDays(win);

          return (
            <div
              key={win.code}
              className={`flex gap-2 px-1.5 py-1 rounded-[var(--r-sm,12px)] transition-colors duration-[var(--dur-estado,0.18s)] ${compact ? 'items-center' : ''} ${isNow ? 'bg-emerald-500/[0.08] border border-emerald-700/40' : 'border border-transparent'}`}
            >
              {/* Indicador de etapa: badge con GLIFO de la etapa (set
                  compartido EtapaCicloIcon). Conserva los estados visuales:
                  observado (ring emerald), estimado (ring morpho + borde
                  punteado) y pasado (atenuado). */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <div className={`w-5 h-5 rounded-full border grid place-items-center ${stageColor(win.code)} ${isObservedCurrent ? 'ring-2 ring-emerald-400/50' : ''} ${isEstimatedCurrent ? 'ring-2 ring-morpho/40 border-dashed' : ''} ${isPast ? 'opacity-50' : ''}`}>
                  <EtapaCicloIcon code={win.code} nombre={win.label} size={11} strokeWidth={2.25} />
                </div>
                {i < windows.length - 1 && (
                  <div className={`w-px h-3 ${currentIdx >= 0 && i < currentIdx ? 'bg-emerald-600/60' : 'bg-slate-700'}`} />
                )}
              </div>

              {/* Contenido */}
              <div className={`flex-1 min-w-0 ${compact ? 'flex items-center gap-2' : ''}`}>
                <div className={`flex items-center gap-1.5 ${isPast ? 'opacity-50' : ''}`}>
                  <span className={`text-sm font-medium ${isObservedCurrent ? 'text-emerald-300' : isNow ? 'text-emerald-200' : 'text-slate-200'}`}>
                    {win.label}
                  </span>
                  {isNow && (
                    <span className="text-3xs font-bold uppercase tracking-wide text-emerald-300 bg-emerald-900/50 border border-emerald-700/50 rounded-[var(--r-pill,999px)] px-1.5 py-px">
                      Ahora
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

                    {/* Ancho de la ventana en días: formato de windowStart/
                        windowEnd ya calculados, para dimensionar cada etapa
                        sin hacer cuentas con el calendario. */}
                    {windowDays !== null && (
                      <span className="text-3xs text-slate-500 bg-slate-800/80 border border-slate-700/60 rounded-[var(--r-pill,999px)] px-1.5 py-px shrink-0">
                        ~{windowDays} días
                      </span>
                    )}

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
