import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Compass, Leaf, ArrowRight, MessageCircle, Info } from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import FincaEvolutionCard from './FincaEvolutionCard';
import { listFarmProcesses } from '../../db/farmProcessCache';
import { getProfile } from '../../services/userProfileService';
import {
  evaluarEvolucionFinca,
  getGliessmanLabel,
  normalizeScore,
} from '../../services/fincaEvolutionService';
import {
  getStage,
  contextoDesdeVocacion,
  siguientePaso,
  JOURNEY_STAGES,
} from '../../services/agroecologyJourney';
import { resolveJourneyState } from '../../services/journeyStateService';
import indicatorsData from '../../data/agroecology-indicators.json';

/**
 * MiFincaEvolucionScreen — la pantalla "Cómo evoluciona tu finca".
 *
 * Le da SUPERFICIE al motor agroecológico que ya existía huérfano: junta en una
 * sola vista el avance REAL del sistema productivo, sin gamificación. Tres capas,
 * todas calculadas desde datos reales de la finca (cero fabricación):
 *
 *   1. La tarjeta resumen (FincaEvolutionCard): nivel Gliessman + barras MESMIS.
 *   2. El radar/desglose de los 5 atributos MESMIS y las 10 dimensiones TAPE
 *      (FAO), con "sin datos aún" cuando un indicador no se puede calcular.
 *   3. La etapa actual del viaje agroecológico (journeyStateService) con el
 *      SIGUIENTE PASO real (agroecologyJourney.siguientePaso), enlazado a la
 *      guía del Home.
 *
 * Anti-paternalista: NADA de puntos/badges/XP/rachas. La "progresión" es el
 * avance verdadero de los indicadores y de la etapa del viaje — el resultado de
 * registrar cosechas, biopreparados, observaciones y de marcar las acciones del
 * camino. Si no hay datos, se dice honestamente.
 *
 * Offline-first: lee los procesos de la cache local (listFarmProcesses); si la
 * IDB falla, lista vacía honesta. El estado del viaje vive en localStorage por
 * finca (journeyStateService).
 *
 * @param {Object} props
 * @param {Function} [props.onBack]     volver a la pantalla anterior
 * @param {Function} [props.onHome]     volver al inicio
 * @param {Function} [props.onNavigate] navegación a otras vistas (ej. agente)
 */
export default function MiFincaEvolucionScreen({ onBack, onHome, onNavigate }) {
  const profile = useMemo(() => getProfile(), []);
  const fincaSlug = profile.fincaSlug || profile.slug || 'default';
  const ctx = contextoDesdeVocacion(profile.vocacion);

  // Etiquetas de indicadores desde el DR (agroecology-indicators.json).
  const mesmisMeta = useMemo(() => indicatorsData.mesmis_5_atributos, []);
  const tapeMeta = useMemo(() => indicatorsData.tape_10_elementos, []);

  // Procesos de finca: cache local primero (offline-first). El cálculo de
  // indicadores depende de esto; sin procesos, todo sale "sin datos aún".
  const [processes, setProcesses] = useState([]);
  useEffect(() => {
    let alive = true;
    listFarmProcesses({ status: 'active' })
      .then((list) => { if (alive) setProcesses(Array.isArray(list) ? list : []); })
      .catch(() => { /* IDB falló: lista vacía honesta, jamás datos inventados */ });
    return () => { alive = false; };
  }, []);

  // Observaciones: por ahora no hay loader dedicado en servicios; el cálculo de
  // cocreación de conocimiento (TAPE) las tolera vacías sin romper.
  const observations = useMemo(() => [], []);

  // Cálculo REAL de indicadores — fincaEvolutionService es puro y cero-fabricación.
  const evolution = useMemo(
    () => evaluarEvolucionFinca({ processes, observations }),
    [processes, observations],
  );
  const gliessmanLabel = useMemo(
    () => getGliessmanLabel(evolution.nivelGliessman),
    [evolution.nivelGliessman],
  );

  // Estado y siguiente paso del viaje agroecológico (mismo motor que la guía
  // del Home — JourneyGuideCard). Solo lectura acá: el avance se hace allá.
  const journey = useMemo(
    () => resolveJourneyState({ fincaSlug, processes }),
    [fincaSlug, processes],
  );
  const stage = getStage(journey.stageId);
  const paso = useMemo(
    () => siguientePaso({ stageId: journey.stageId, accionesHechas: journey.accionesHechas }, ctx),
    [journey, ctx],
  );

  const onPreguntar = () => {
    if (stage) {
      try {
        sessionStorage.setItem(
          'chagra:agent:prefilled',
          `Estoy en la etapa "${stage.nombre}" de mi finca (${stage.objetivo}). `
          + 'Quiero entender cómo evoluciona mi finca: ¿qué indicadores debería mejorar primero?',
        );
      } catch { /* modo privado: el agente abre vacío */ }
    }
    onNavigate?.('agente');
  };

  // Helper de barra para un indicador (MESMIS o TAPE). hasData ⇒ pinta el avance;
  // null ⇒ "sin datos aún", NUNCA un 0 que mienta sobre el estado de la finca.
  const renderBar = (id, nombre, score) => {
    const hasData = score !== null && score !== undefined;
    const pct = hasData ? normalizeScore(score) : 0;
    return (
      <div key={id} className="mb-2.5 last:mb-0">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="text-xs font-medium text-slate-300 leading-tight">{nombre}</span>
          <span className="text-xs font-bold text-emerald-300 shrink-0">
            {hasData ? `${score}/4` : 'sin datos aún'}
          </span>
        </div>
        <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
          {hasData ? (
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
              aria-label={`${nombre}: ${score} de 4`}
            />
          ) : (
            <div className="h-full bg-slate-700/30 rounded-full" aria-label={`${nombre}: sin datos`} />
          )}
        </div>
      </div>
    );
  };

  const next = paso.siguienteEtapaId ? getStage(paso.siguienteEtapaId) : null;

  return (
    <ScreenShell title="Cómo evoluciona tu finca" icon={TrendingUp} onBack={onBack} onHome={onHome}>
      <div
        data-testid="mi-finca-evolucion-screen"
        className="flex flex-col gap-3 px-4 pt-3 pb-8 max-w-2xl mx-auto"
      >
        {/* Intro honesta: qué es esto y de dónde sale */}
        <section className="bg-gradient-to-br from-emerald-950/60 to-teal-950/40 backdrop-blur-xl border border-emerald-800/40 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Leaf size={20} className="text-emerald-300" aria-hidden="true" />
            <h2 className="text-base font-bold text-white">La salud de tu sistema</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Acá no hay puntos ni medallas: tu finca evoluciona con el trabajo real.
            Cada cosecha, biopreparado, siembra y observación que registras mueve
            estos indicadores. Así medimos cómo va tu transición hacia la agroecología.
          </p>
          <div className="mt-3 pt-3 border-t border-emerald-800/40">
            <p className="text-xs text-slate-400 mb-0.5">Nivel de transición agroecológica</p>
            <p className="text-lg font-bold text-emerald-300">{gliessmanLabel}</p>
          </div>
        </section>

        {/* Tarjeta resumen — el componente que vivía huérfano, ahora con casa */}
        <FincaEvolutionCard
          processes={processes}
          observations={observations}
          onNavigate={onNavigate}
        />

        {/* Etapa actual del viaje agroecológico (lectura; se avanza en el Home) */}
        {stage && (
          <section
            data-testid="evolucion-etapa-viaje"
            className="bg-gradient-to-br from-emerald-950/70 to-teal-950/50 backdrop-blur-xl border border-emerald-800/40 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Compass size={20} className="text-emerald-300" aria-hidden="true" />
                <h3 className="text-base font-bold text-white">Tu etapa del camino</h3>
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
                <p className="text-xs font-bold text-emerald-200 uppercase tracking-wide mb-1.5">
                  Tu siguiente paso
                </p>
                <ul className="flex flex-col gap-1.5">
                  {paso.siguientesAcciones.map((accion) => (
                    <li
                      key={accion}
                      className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-900/25 border border-emerald-700/30 text-sm text-slate-200"
                    >
                      <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                      <span className="flex-1">{accion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-emerald-200 mt-3">
                Completaste los pasos de esta etapa. Avanzá desde la guía del inicio.
              </p>
            )}

            {next && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-200/80">
                <ArrowRight size={14} aria-hidden="true" />
                Lo que sigue: {next.emoji} {next.nombre}
              </p>
            )}
          </section>
        )}

        {/* Desglose MESMIS — 5 atributos de sustentabilidad */}
        <section
          data-testid="evolucion-mesmis"
          className="bg-gradient-to-br from-slate-900/80 to-slate-800/70 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-4"
        >
          <h3 className="text-base font-bold text-white mb-1">Sustentabilidad (MESMIS)</h3>
          <p className="text-xs text-slate-400 mb-3">
            Cinco atributos que dicen qué tan firme está tu sistema productivo.
          </p>
          {mesmisMeta.map((item) => renderBar(item.id, item.nombre, evolution.mesmis[item.id]))}
        </section>

        {/* Desglose TAPE — 10 dimensiones FAO */}
        <section
          data-testid="evolucion-tape"
          className="bg-gradient-to-br from-slate-900/80 to-slate-800/70 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-4"
        >
          <h3 className="text-base font-bold text-white mb-1">Los 10 elementos de la agroecología (FAO)</h3>
          <p className="text-xs text-slate-400 mb-3">
            La mirada amplia: diversidad, sinergias, cultura, gobernanza y más.
          </p>
          {tapeMeta.map((item) => renderBar(item.id, item.nombre, evolution.tape[item.id]))}
        </section>

        {/* CTA al agente para entender qué mejorar */}
        <button
          type="button"
          onClick={onPreguntar}
          className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/40 text-slate-300 text-sm flex items-center justify-center gap-2"
        >
          <MessageCircle size={15} aria-hidden="true" />
          Preguntarle a Chagra qué mejorar
        </button>

        {/* Nota honesta cuando todavía no hay nada que mostrar */}
        <div className="flex items-start gap-2 pt-1">
          <Info size={14} className="text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Los indicadores sin datos se irán llenando a medida que registras el
            trabajo de tu finca. No inventamos cifras: lo que no se puede medir aún,
            se dice tal cual.
          </p>
        </div>
      </div>
    </ScreenShell>
  );
}
