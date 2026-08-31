import { useCallback, useMemo, useState } from 'react';
import { Compass, ArrowRight, MessageCircle } from 'lucide-react';
import {
  getStage,
  contextoDesdeVocacion,
  siguientePaso,
  JOURNEY_STAGES,
} from '../../services/agroecologyJourney';
import {
  resolveJourneyState,
  marcarAccionHecha,
  avanzarEtapa,
} from '../../services/journeyStateService';
import { getProfile } from '../../services/userProfileService';

/**
 * JourneyGuideCard — la guía proactiva del viaje agroecológico en "Hoy en finca".
 *
 * Chagra como agroecólogo desde el inicio: muestra en qué etapa va el usuario y
 * el SIGUIENTE PASO según su contexto (vocación). Las acciones se marcan; al
 * completarlas, ofrece avanzar a la siguiente etapa. Estado por finca
 * (journeyStateService, localStorage offline-first). Cero fabricación: el
 * contenido sale del modelo del DR (agroecologyJourney).
 */
export default function JourneyGuideCard({ processes = [], onNavigate }) {
  const profile = useMemo(() => getProfile(), []);
  const fincaSlug = profile.fincaSlug || profile.slug || 'default';
  const ctx = contextoDesdeVocacion(profile.vocacion);

  const [state, setState] = useState(() => resolveJourneyState({ fincaSlug, processes }));

  const stage = getStage(state.stageId);
  const paso = useMemo(
    () => siguientePaso({ stageId: state.stageId, accionesHechas: state.accionesHechas }, ctx),
    [state, ctx],
  );

  const onMarcar = useCallback((accion) => {
    setState(marcarAccionHecha(fincaSlug, accion));
  }, [fincaSlug]);

  const onAvanzar = useCallback(() => {
    setState(avanzarEtapa(fincaSlug));
  }, [fincaSlug]);

  const onPreguntar = useCallback(() => {
    if (!stage) return;
    try {
      sessionStorage.setItem(
        'chagra:agent:prefilled',
        `Estoy en la etapa "${stage.nombre}" de mi finca (${stage.objetivo}). ¿Cómo me acompañas en este paso?`,
      );
    } catch { /* modo privado: el agente abre vacío */ }
    onNavigate?.('agente');
  }, [stage, onNavigate]);

  if (!stage) return null;

  const next = paso.siguienteEtapaId ? getStage(paso.siguienteEtapaId) : null;

  return (
    <section
      data-testid="journey-guide-card"
      className="bg-gradient-to-br from-emerald-950/70 to-teal-950/50 backdrop-blur-xl border border-emerald-800/40 rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Compass size={20} className="text-emerald-300" aria-hidden="true" />
          <h3 className="text-base font-bold text-white">Tu camino agroecológico</h3>
        </div>
        <span className="text-[10px] text-emerald-300/70 font-bold uppercase tracking-wider shrink-0">
          Etapa {stage.orden} de {JOURNEY_STAGES.length}
        </span>
      </div>

      <p className="text-lg font-black text-white leading-tight">{stage.emoji} {stage.nombre}</p>
      <p className="text-sm text-slate-300 mt-0.5">{stage.objetivo}</p>
      {paso.variacion && (
        <p className="text-xs text-emerald-200/80 mt-1.5 italic">{paso.variacion}</p>
      )}

      {paso.siguientesAcciones.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-bold text-emerald-200 uppercase tracking-wide mb-1.5">Tu siguiente paso</p>
          <ul className="flex flex-col gap-1.5">
            {paso.siguientesAcciones.map((accion) => (
              <li key={accion}>
                <button
                  type="button"
                  onClick={() => onMarcar(accion)}
                  aria-label={`Marcar como hecho: ${accion}`}
                  className="w-full text-left flex items-start gap-2 px-3 py-2.5 min-h-[44px] rounded-xl bg-emerald-900/30 hover:bg-emerald-800/40 border border-emerald-700/30 text-sm text-slate-200 active:scale-[0.99] transition-transform"
                >
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded border border-emerald-400/60" aria-hidden="true" />
                  <span className="flex-1">{accion}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-emerald-200 mt-3">¡Completaste los pasos de esta etapa! 🎉</p>
      )}

      {paso.listoParaAvanzar && next && (
        <button
          type="button"
          onClick={onAvanzar}
          className="mt-3 w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-700/40 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-100 text-sm font-bold flex items-center justify-center gap-2"
        >
          Avanzar a {next.emoji} {next.nombre}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        onClick={onPreguntar}
        className="mt-2 w-full px-4 py-2 min-h-[44px] rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/40 text-slate-300 text-sm flex items-center justify-center gap-2"
      >
        <MessageCircle size={15} aria-hidden="true" />
        Hablar con Chagra sobre esta etapa
      </button>
    </section>
  );
}
