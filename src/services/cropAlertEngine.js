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
