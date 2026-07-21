/* eslint-disable chagra-i18n/no-hardcoded-spanish -- UI ES-CO; migración a
 * src/config/messages.js (ADR-050 i18n) fuera del alcance de este fix. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sprout, FlaskConical, AlertTriangle } from 'lucide-react';
import FarmProcessSummary from './FarmProcessSummary';
import PhenologyTimeline from './PhenologyTimeline';
import PerennialCycleView from './PerennialCycleView';
import CicloObservacion from './CicloObservacion';
import CicloFotos from './CicloFotos';
import SpeciesImage from './SpeciesImage';
import { getTasksForCycle, getUrgentTasks } from '../services/cycleTaskService';
import { getPestRisksByStage, getBiopreparadosForStage, getEnsemblePreventiveTasks } from '../services/climateCycleService';
import { confirmStage } from '../services/stageConfirmationService';
import { deriveCurrentStage, normalizePhenologyTemplate } from '../services/phenologyCalculator';
import { completeTaskByVoice } from '../services/voiceTaskService';
import { getEnsoServicePhase, getEnsoLabel } from '../services/ensoService';
import { getAllSpecies } from '../db/catalogDB';
import { matchSpeciesInCatalog } from '../utils/speciesResolver';
import { getTemplate } from '../data/phenologyTemplates';
import { getGenericTemplate } from '../data/phenologyGeneric';
import { isPerennialSpecies } from '../data/perennialCycles';

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

export default function CicloDetalle({ cycle, altitudeM, onReload }) {
  const a = useMemo(() => cycle.attributes || {}, [cycle]);
  const processId = cycle.process_id || cycle.id;
  const [pickStage, setPickStage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneTasks, setDoneTasks] = useState({});
  // Especie del catálogo resuelta de forma TOLERANTE.
  //
  // Bug 2026-06-20 (operador, fresa): el ciclo guarda `subject_slug` con el
  // nombre común que escribió el campesino ("fresa"), que NO coincide con el id
  // canónico del catálogo ("fragaria_ananassa"). El match exacto fallaba y con él
  // se caían la categoría, la plantilla fenológica (timeline "Datos
  // insuficientes") y la foto. matchSpeciesInCatalog tolera la des-coincidencia
  // (id/slug exacto → nombre común → inclusión parcial), igual que la ficha de
  // especie (AssetDetailView).
  const [species, setSpecies] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getAllSpecies()
      .then((list) => {
        if (cancelled) return;
        setSpecies(matchSpeciesInCatalog(list || [], a.subject_slug, a.subject_label));
      })
      .catch((err) => {
        console.warn('[CicloDetalle] getAllSpecies falló:', err?.message || err);
      });
    return () => { cancelled = true; };
  }, [a.subject_slug, a.subject_label]);

  // Slug CANÓNICO de la especie (id del catálogo) cuando hay match; si no, el
  // slug guardado en el ciclo. Es el que se pasa a la fenología/foto.
  const canonicalSlug = useMemo(
    () => species?.id || species?.slug || a.subject_slug,
    [species, a.subject_slug],
  );

  // Categoría agronómica del catálogo: habilita el genérico por TIPO de cultivo
  // cuando la especie (o su especie madre, para cultivares) no tiene plantilla
  // específica. Nunca inventa días; solo da una referencia amplia marcada.
  const speciesCategory = useMemo(() => species?.category || null, [species]);

  // ¿Es un perenne? El modelo anual (siembra → cosecha) no aplica a un árbol o
  // arbusto que vive años. Se considera perenne si tiene ciclo perenne grounded
  // (perennialCycles) o si su categoría es de perennes/árboles de sombra.
  // PerennialCycleView se auto-degrada a null si no hay datos perennes para la
  // especie, así que solo aporta la vista híbrida cuando hay algo honesto que
  // mostrar; en ese caso ocultamos la línea de tiempo anual.
  const hasPerennialData = useMemo(
    () => isPerennialSpecies(canonicalSlug),
    [canonicalSlug],
  );
  const isPerennial = useMemo(
    () => hasPerennialData || speciesCategory === 'frutales_perennes' || speciesCategory === 'arboles_sombra',
    [hasPerennialData, speciesCategory],
  );

  // Plantilla fenológica resuelta SIN inventar datos, en orden de preferencia:
  //   1. fenología embebida en el catálogo (si la trae), normalizada;
  //   2. plantilla específica de la especie por slug canónico
  //      (phenologyTemplates.js, con herencia padre→cultivar via getTemplate);
  //   3. genérico por TIPO de cultivo (phenologyGeneric.js), marcado aproximado.
  // Nunca "Datos insuficientes" si hay slug canónico o categoría conocida.
  const resolvedPhenologyTemplate = useMemo(() => {
    const catalogTemplate = normalizePhenologyTemplate(
      species?.phenology_template || species?.phenology || species?.fenologia || species?.phenology_stages,
      canonicalSlug,
    );
    if (catalogTemplate) return catalogTemplate;
    const specific = getTemplate(canonicalSlug);
    if (specific) return specific;
    if (speciesCategory) {
      const generic = getGenericTemplate(speciesCategory);
      if (generic) return { ...generic, is_generic: true };
    }
    return null;
  }, [species, canonicalSlug, speciesCategory]);

  // Etapa MOSTRADA: si el campesino confirmó/corrigió la etapa a mano
  // (last_stage_change_reason presente) respetamos lo que él dijo. Si no,
  // derivamos la etapa desde la fecha de siembra + fenología de la especie, para
  // que NO se quede congelada en "sowing_confirmed". Degrada a la etapa guardada
  // si no hay template/fecha (deriveCurrentStage no lanza).
  const displayStage = useMemo(() => {
    if (a.last_stage_change_reason) return a.current_stage;
    return deriveCurrentStage({
      speciesSlug: canonicalSlug,
      sowingDate: a.created_at,
      altitudeM,
      template: resolvedPhenologyTemplate,
      category: speciesCategory,
      fallback: a.current_stage || 'sowing_confirmed',
    });
  }, [a.last_stage_change_reason, a.current_stage, canonicalSlug, a.created_at, altitudeM, resolvedPhenologyTemplate, speciesCategory]);

  // Cycle con la etapa mostrada inyectada, para que las labores (getTasksForCycle)
  // correspondan a la etapa derivada, no a la congelada.
  const effectiveCycle = useMemo(
    () => ({ ...cycle, attributes: { ...a, current_stage: displayStage } }),
    [cycle, a, displayStage],
  );

  // Etiqueta de etapa específica de la especie cuando la plantilla fenológica
  // tiene un label distinto al genérico (ej. "Brotó" en vez de "Emergencia").
  // Cablea datos existentes del template sin inventar nada nuevo. Si no hay
  // template o el label coincide con el genérico, cae al map fijo.
  const speciesStageLabel = useCallback((code) => {
    const base = baseStage(code);
    if (resolvedPhenologyTemplate?.stages) {
      const s = resolvedPhenologyTemplate.stages.find((st) => st.code === base);
      if (s?.label && s.label !== STAGE_LABELS[base]) return s.label;
    }
    return STAGE_LABELS[base] || code || '—';
  }, [resolvedPhenologyTemplate]);

  // Orden de etapas específico de la especie cuando la plantilla lo define.
  // Las plantillas pueden omitir etapas (ej. sin "emergence") o tener etapas
  // propias; el picker hereda ese orden sin inventar.
  const speciesStageOrder = useMemo(() => {
    if (resolvedPhenologyTemplate?.stages?.length > 0) {
      return resolvedPhenologyTemplate.stages.map((s) => s.code);
    }
    return STAGE_ORDER;
  }, [resolvedPhenologyTemplate]);

  const pestRisks = useMemo(() => { try { return getPestRisksByStage(displayStage, a.subject_slug) || []; } catch { return []; } }, [displayStage, a.subject_slug]);
  const bios = useMemo(() => { try { return getBiopreparadosForStage(baseStage(displayStage)) || []; } catch { return []; } }, [displayStage]);
  const ensoLabel = getEnsoLabel();
  const ensoTasks = useMemo(() => { try { return getEnsemblePreventiveTasks(getEnsoServicePhase(), baseStage(displayStage)) || []; } catch { return []; } }, [displayStage]);
  const tasks = useMemo(() => { try { return getTasksForCycle(effectiveCycle) || []; } catch { return []; } }, [effectiveCycle]);
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
      {/* Foto de referencia de la especie — misma resolución tolerante que la
          ficha de especie. Si el catálogo no tiene foto, SpeciesImage muestra su
          fallback (emoji + nombre), nunca un hueco. */}
      <SpeciesImage
        scientificName={species?.nombre_cientifico || null}
        commonName={species?.nombre_comun || a.subject_label || null}
        category={speciesCategory}
        catalogImage={species?.imagen || species?.image || species?.media?.image || species?.media || null}
      />

      <FarmProcessSummary process={effectiveCycle} pestRisks={pestRisks} altitudeM={altitudeM} lastObservation={null} />

      {/* Etapa actual + confirmar cambio (stageConfirmationService) */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-300">Etapa: <strong className="text-emerald-400">{speciesStageLabel(displayStage)}</strong></span>
          <button
            type="button"
            onClick={() => setPickStage((o) => !o)}
            className="text-xs font-bold text-emerald-400 px-2.5 py-1.5 rounded-lg border border-emerald-800/60 shrink-0"
          >
            ¿Cambió de etapa?
          </button>
        </div>
        {pickStage && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {speciesStageOrder.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => handleStage(s)}
                aria-label={`Confirmar etapa ${speciesStageLabel(s)}`}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50"
              >
                {speciesStageLabel(s)}
              </button>
            ))}
          </div>
        )}
      </section>

      <CicloObservacion processId={processId} processHint={cycle} currentStage={displayStage} onSaved={onReload} />

      {/* Vista híbrida del perenne (establecimiento + calendario anual). Se
          auto-degrada a null si no hay datos perennes grounded para la especie. */}
      {isPerennial && (
        <PerennialCycleView
          speciesId={canonicalSlug}
          plantingDate={a.created_at}
          commonName={species?.nombre_comun || a.subject_label || null}
        />
      )}

      {/* Línea de tiempo anual (siembra → cosecha): se conserva para NO perennes
          y como respaldo cuando un perenne aún no tiene calendario grounded. */}
      {!hasPerennialData && (
        <section>
          <h2 className="text-2xs uppercase font-bold text-slate-500 mb-2">Línea de tiempo</h2>
          <PhenologyTimeline
            speciesSlug={canonicalSlug}
            sowingDate={a.created_at}
            altitudeM={altitudeM}
            phenologyTemplate={resolvedPhenologyTemplate}
            category={speciesCategory}
          />
        </section>
      )}

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
            {tasks.map((tItem, i) => {
              const /** @type {any} */ t = tItem;
              const label = t.label || t.name || t.title || String(t);
              const done = !!doneTasks[label];
              return (
                <li key={t.id || t.code || i} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 flex items-center gap-2">
                  <Sprout size={14} className="text-emerald-400 shrink-0" />
                  <span className="flex-1 min-w-0">{label}</span>
                  <button
                    type="button"
                    onClick={() => handleDone(label)}
                    disabled={done}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${done ? 'text-emerald-400' : 'text-slate-200 bg-slate-800 hover:bg-slate-700'}`}
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
