import { useCallback, useMemo, useState } from 'react';
import { Sprout, FlaskConical, AlertTriangle } from 'lucide-react';
import FarmProcessSummary from './FarmProcessSummary';
import PhenologyTimeline from './PhenologyTimeline';
import CicloObservacion from './CicloObservacion';
import CicloFotos from './CicloFotos';
import { getTasksForCycle, getUrgentTasks } from '../services/cycleTaskService';
import { getPestRisksByStage, getBiopreparadosForStage, getEnsemblePreventiveTasks } from '../services/climateCycleService';
import { confirmStage } from '../services/stageConfirmationService';
import { completeTaskByVoice } from '../services/voiceTaskService';
import { getEnsoServicePhase, getEnsoLabel } from '../services/ensoService';

/**
 * CicloDetalle — detalle de un ciclo (FarmProcess) con el enriquecimiento del
 * subsistema antes "oscuro": además del resumen + fenología + labores, cablea:
 *   - confirmar/corregir la ETAPA del ciclo (stageConfirmationService)
 *   - BIOPREPARADOS recomendados por etapa (climateCycleService)
 *   - marcar una LABOR como hecha por voz/tap (voiceTaskService)
 * (La sugerencia de etapa desde la observación vive en CicloObservacion.)
 */
const STAGE_LABELS = {
  sowing: 'Siembra', emergence: 'Brotó', vegetative: 'Creciendo',
  flowering: 'Floración', fruiting: 'Frutos', harvest_window: 'Cosecha', closed: 'Terminado',
};
const STAGE_ORDER = ['sowing', 'emergence', 'vegetative', 'flowering', 'fruiting', 'harvest_window', 'closed'];
const baseStage = (code) => String(code || '').replace(/_confirmed$/, '');
const stageLabel = (code) => STAGE_LABELS[baseStage(code)] || code || '—';

export default function CicloDetalle({ cycle, altitudeM, onReload }) {
  const a = cycle.attributes || {};
  const processId = cycle.process_id || cycle.id;
  const [pickStage, setPickStage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneTasks, setDoneTasks] = useState({});

  const pestRisks = useMemo(() => { try { return getPestRisksByStage(a.current_stage, a.subject_slug) || []; } catch { return []; } }, [a.current_stage, a.subject_slug]);
  const bios = useMemo(() => { try { return getBiopreparadosForStage(baseStage(a.current_stage)) || []; } catch { return []; } }, [a.current_stage]);
  const ensoLabel = getEnsoLabel();
  const ensoTasks = useMemo(() => { try { return getEnsemblePreventiveTasks(getEnsoServicePhase(), baseStage(a.current_stage)) || []; } catch { return []; } }, [a.current_stage]);
  const tasks = useMemo(() => { try { return getTasksForCycle(cycle) || []; } catch { return []; } }, [cycle]);
  const urgent = useMemo(() => { try { return getUrgentTasks(tasks) || []; } catch { return []; } }, [tasks]);

  const handleStage = useCallback(async (newStage) => {
    if (busy) return;
    setBusy(true);
    try {
      await confirmStage({ processId, newStage, actor: 'operator', reason: 'observado en campo' });
      setPickStage(false);
      onReload?.();
    } catch (e) { console.warn('[CicloDetalle] confirmStage:', e.message); }
    finally { setBusy(false); }
  }, [busy, processId, onReload]);

  const handleDone = useCallback(async (taskName) => {
    if (doneTasks[taskName]) return;
    try {
      await completeTaskByVoice({ processId, taskName, actor: 'operator' });
      setDoneTasks((d) => ({ ...d, [taskName]: true }));
    } catch (e) { console.warn('[CicloDetalle] completeTask:', e.message); }
  }, [processId, doneTasks]);

  return (
    <div className="px-4 pb-10 flex flex-col gap-4">
      <FarmProcessSummary process={cycle} pestRisks={pestRisks} />

      {/* Etapa actual + confirmar cambio (stageConfirmationService) */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-300">Etapa: <strong className="text-lime-300">{stageLabel(a.current_stage)}</strong></span>
          <button
            type="button"
            onClick={() => setPickStage((o) => !o)}
            className="text-xs font-bold text-lime-400 px-2.5 py-1.5 rounded-lg border border-lime-800/60 shrink-0"
          >
            ¿Cambió de etapa?
          </button>
        </div>
        {pickStage && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {STAGE_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => handleStage(s)}
                aria-label={`Confirmar etapa ${STAGE_LABELS[s]}`}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50"
              >
                {STAGE_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </section>

      <CicloObservacion processId={processId} currentStage={a.current_stage} onSaved={onReload} />

      <section>
        <h2 className="text-2xs uppercase font-bold text-slate-500 mb-2">Línea de tiempo</h2>
        <PhenologyTimeline speciesSlug={a.subject_slug} sowingDate={a.created_at} altitudeM={altitudeM} />
      </section>

      <CicloFotos processId={processId} />

      {bios.length > 0 && (
        <section>
          <h2 className="text-2xs uppercase font-bold text-slate-500 mb-2">Biopreparados para esta etapa</h2>
          <ul className="flex flex-col gap-1.5">
            {bios.map((b, i) => (
              <li key={b.nombre || i} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex items-start gap-2">
                <FlaskConical size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-200"><strong>{b.nombre}</strong> — <span className="text-slate-400">{b.uso}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ensoTasks.length > 0 && (
        <section>
          <h2 className="text-2xs uppercase font-bold text-slate-500 mb-2">Por la temporada · {ensoLabel}</h2>
          <ul className="flex flex-col gap-1.5">
            {ensoTasks.map((t, i) => (
              <li key={t.task || i} className="bg-amber-900/10 border border-amber-800/40 rounded-xl px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-200"><strong>{t.task}</strong>{t.description ? <span className="text-slate-400"> — {t.description}</span> : null}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tasks.length > 0 && (
        <section>
          <h2 className="text-2xs uppercase font-bold text-slate-500 mb-2">
            Labores de esta etapa {urgent.length > 0 && <span className="text-amber-400">· {urgent.length} urgente(s)</span>}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {tasks.map((t, i) => {
              const label = t.label || t.name || t.title || String(t);
              const done = !!doneTasks[label];
              return (
                <li key={t.id || t.code || i} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 flex items-center gap-2">
                  <Sprout size={14} className="text-lime-400 shrink-0" />
                  <span className="flex-1 min-w-0">{label}</span>
                  <button
                    type="button"
                    onClick={() => handleDone(label)}
                    disabled={done}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${done ? 'text-green-400' : 'text-slate-200 bg-slate-800 hover:bg-slate-700'}`}
                  >
                    {done ? '✓ Hecho' : 'Marcar hecha'}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
