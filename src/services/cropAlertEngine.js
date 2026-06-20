/**
 * cropAlertEngine — productor de ALERTAS DEL CULTIVO (plaga/etapa).
 *
 * Cablea el track de alertas del subsistema FarmProcess (PR #1370, ADR-049) que
 * estaba "oscuro". Lee los ciclos activos de IndexedDB (farmProcessCache) y, por
 * la etapa fenológica actual + la especie, deriva el riesgo de plaga dominante
 * (climateCycleService.getPestRisksByStage) y lo empuja al MISMO canal que las
 * alertas de clima: el evento 'alertTriggered' → useAlertStore → chip de alerta
 * del home (AgentHero). Degrada limpio si no hay ciclos o no hay riesgo.
 *
 * Reusa la infraestructura existente de alertEngine (clima): cada alerta tiene
 * un `type` estable (`crop_pest_<processId>`) para de-dup/limpieza, y emite
 * 'alertCleared' cuando el riesgo desaparece.
 */
import { listFarmProcesses } from '../db/farmProcessCache';
import { getPestRisksByStage } from './climateCycleService';
import { getEnsoServicePhase, getEnsoLabel } from './ensoService';
import { getActiveDiseaseForCycle } from './diseaseObservationService';

const SEVERITY_BY_RISK = { 'crítico': 'danger', critico: 'danger', alto: 'warning' };

function emit(name, detail) {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  } catch {
    /* SSR/test sin window — noop */
  }
}

/**
 * Escanea los ciclos activos y emite/limpia alertas de plaga por etapa.
 * @returns {Promise<{emitted:number, cleared:number}>}
 */
export async function runCropAlerts() {
  let cycles = [];
  try {
    cycles = (await listFarmProcesses({ status: 'active' })) || [];
  } catch {
    return { emitted: 0, cleared: 0 };
  }

  let emitted = 0;
  let cleared = 0;
  for (const c of cycles) {
    const a = c?.attributes || {};
    const id = c?.process_id || c?.id;
    if (!id) continue;
    const type = `crop_pest_${id}`;

    let risks = [];
    try {
      risks = getPestRisksByStage(a.current_stage, a.subject_slug) || [];
    } catch {
      risks = [];
    }
    const top = risks.find((r) => r.risk === 'crítico' || r.risk === 'critico')
      || risks.find((r) => r.risk === 'alto');

    if (top) {
      emit('alertTriggered', {
        type,
        severity: SEVERITY_BY_RISK[top.risk] || 'warning',
        title: `Riesgo de plaga en ${a.subject_label || 'tu cultivo'}`,
        message: `${top.pest}. ${top.control}`,
        source: 'crop',
        processId: id,
      });
      emitted++;
    } else {
      emit('alertCleared', { type });
      cleared++;
    }

    // ── Enfermedad observada en la BITÁCORA del ciclo ──────────────────────
    // El usuario anotó un síntoma de enfermedad: el agente debe saberlo
    // PROACTIVAMENTE. Es un dato FACTUAL (el usuario lo escribió), no inferido.
    // Canal separado (`crop_disease_<id>`) del riesgo de plaga por etapa para
    // que coexistan y se de-dupliquen por su cuenta.
    const diseaseType = `crop_disease_${id}`;
    let disease = null;
    try {
      disease = await getActiveDiseaseForCycle(id, a.subject_slug);
    } catch {
      disease = null;
    }
    if (disease && disease.isDisease) {
      const named = disease.pathogen
        ? disease.pathogen
        : 'Síntoma de enfermedad a vigilar';
      const control = disease.control ? ` ${disease.control}` : '';
      emit('alertTriggered', {
        type: diseaseType,
        severity: disease.severity === 'alto' ? 'warning' : 'info',
        title: `Posible enfermedad en ${a.subject_label || 'tu cultivo'}`,
        message: `${named}.${control}`.trim(),
        source: 'crop',
        processId: id,
      });
      emitted++;
    } else {
      emit('alertCleared', { type: diseaseType });
      cleared++;
    }
  }

  // Alerta de TEMPORADA ENSO (El Niño/La Niña) — una sola, no por ciclo. Solo
  // tiene sentido si hay ciclos activos; se limpia si la fase vuelve a neutral.
  if (cycles.length > 0) {
    const ensoPhase = getEnsoServicePhase();
    if (ensoPhase) {
      emit('alertTriggered', {
        type: 'enso_season',
        severity: 'warning',
        title: `Temporada ${getEnsoLabel()}`,
        message: 'Revisa las labores preventivas de la temporada en cada ciclo (riego, drenajes, hongos).',
        source: 'enso',
      });
      emitted++;
    } else {
      emit('alertCleared', { type: 'enso_season' });
    }
  }

  return { emitted, cleared };
}

let started = false;

export const cropAlertEngine = {
  /**
   * Arranca el motor: corre una pasada y re-evalúa cuando cambian los ciclos
   * ('farmProcessChanged', emitido por farmEventService.createFarmProcess).
   * Idempotente (singleton).
   */
  async start() {
    if (started) {
      await runCropAlerts();
      return this;
    }
    started = true;
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('farmProcessChanged', runCropAlerts);
    }
    await runCropAlerts();
    return this;
  },
  stop() {
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('farmProcessChanged', runCropAlerts);
    }
    started = false;
  },
};
