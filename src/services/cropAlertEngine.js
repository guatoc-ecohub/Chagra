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
import { getPrecioSipsa } from './sidecarClient';

const SEVERITY_BY_RISK = { 'crítico': 'danger', critico: 'danger', alto: 'warning' };

/** "4600" → "4.600" (es-CO). null si no es número finito. */
function formatCop(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(n).toLocaleString('es-CO');
}

/**
 * Consulta el PRECIO mayorista REAL (SIPSA/DANE) para el cultivo de un ciclo en
 * etapa de cosecha. Devuelve un fragmento de mensaje listo para anexar a la
 * alerta, o '' si no hay dato (NUNCA inventa — graceful degrade). El precio sale
 * del tool get_precio_sipsa, que lee la tabla `chagra.sipsa_precios` poblada por
 * el feed diario DANE.
 *
 * @param {string} producto — nombre/slug del producto (subject_label o slug).
 * @returns {Promise<string>} fragmento " Hoy en mercado está a $X/kg (…)." o ''.
 */
async function buildHarvestPriceLine(producto) {
  if (!producto || typeof producto !== 'string') return '';
  let res = null;
  try {
    res = await getPrecioSipsa('latest_price', { producto });
  } catch {
    return '';
  }
  if (!res || res.available !== true || !res.price) return '';
  const prom = formatCop(res.price.precio_promedio_cop_kg);
  if (!prom) return '';
  const plaza = typeof res.price.plaza === 'string' ? res.price.plaza.trim() : '';
  const desactualizado = !!(res.frescura && res.frescura.desactualizado === true);
  const sello = desactualizado ? ' (último dato disponible)' : '';
  return ` Hoy el precio mayorista está a $${prom}/kg${plaza ? ` en ${plaza}` : ''} (SIPSA/DANE${sello}).`;
}

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

    // Alerta de COSECHA con PRECIO REAL: si el ciclo está en ventana de cosecha,
    // avisamos que está listo y ANEXAMOS el precio mayorista real de SIPSA/DANE
    // (no un mock). Graceful: sin dato de precio, la alerta sale igual sin la
    // línea de precio (NUNCA inventa). Tipo propio para de-dup/limpieza.
    const harvestType = `crop_harvest_${id}`;
    if (a.current_stage === 'harvest_window') {
      const cultivo = a.subject_label || a.subject_slug || 'tu cultivo';
      const priceLine = await buildHarvestPriceLine(a.subject_label || a.subject_slug);
      emit('alertTriggered', {
        type: harvestType,
        severity: 'info',
        title: `${cultivo} en ventana de cosecha`,
        message: `Tu ${cultivo} está en etapa de cosecha.${priceLine}`,
        source: 'crop',
        processId: id,
      });
      emitted++;
    } else {
      emit('alertCleared', { type: harvestType });
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
