/**
 * cropAlertEngine — productor de ALERTAS DEL CULTIVO (plaga/etapa + precio).
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
 *
 * # Alerta de PRECIO cerca de cosecha (chagra #26)
 *
 * Cuando un ciclo está en ventana de cosecha (`harvest_window`) o llenado de
 * fruto (`fruiting`), consulta el precio SIPSA vigente del producto vía el
 * sidecar (`get_precio_sipsa`, resolver producto→especie cableado en chagra-pro)
 * y emite un aviso accionable: "tu papa está para cosechar; hoy está a X COP/kg
 * en <central de abastos>". El producto SIPSA se resuelve desde el `subject_slug`
 * del ciclo (`resolveProductoFromSlug`, mapa PR #1858).
 *
 * Anti-alucinación (regla dura del marketplace, precioReferencia.js): SOLO se
 * emite si el sidecar devuelve un precio FRESCO (`available:true` + `frescura`
 * no desactualizada). Sin dato, dato viejo, especie sin producto SIPSA, sidecar
 * apagado u offline → NO se emite alerta (se limpia la previa). NUNCA un número
 * inventado.
 */
import { listFarmProcesses } from '../db/farmProcessCache';
import { getPestRisksByStage } from './climateCycleService';
import { getEnsoServicePhase, getEnsoLabel } from './ensoService';
import { getPrecioSipsa } from './sidecarClient';
import { resolveProductoFromSlug } from './sipsaPriceMap';
import { getActiveDiseaseForCycle } from './diseaseObservationService';

const SEVERITY_BY_RISK = { 'crítico': 'danger', critico: 'danger', alto: 'warning' };

/** Etapas en las que tiene sentido avisar el precio de mercado del producto. */
const PRECIO_STAGES = new Set(['harvest_window', 'fruiting']);

/** Formatea un precio COP/kg como entero con separador de miles colombiano. */
function formatCop(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  return `$${Math.round(valor).toLocaleString('es-CO')}`;
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
 * Evalúa la alerta de PRECIO cerca de cosecha para un ciclo (#26).
 *
 * Solo procede si la etapa es de cosecha/llenado y la especie tiene producto
 * SIPSA mapeado. Consulta el precio vigente vía sidecar y emite el aviso SOLO
 * si el dato es fresco. En cualquier otro caso (etapa que no aplica, sin
 * producto mapeado, sidecar off/offline, sin dato, dato desactualizado) limpia
 * la alerta previa y NO inventa precio.
 *
 * @param {string} id — process_id del ciclo (clave de de-dup de la alerta).
 * @param {object} a — atributos del ciclo (current_stage, subject_slug, ...).
 * @returns {Promise<{emitted:number, cleared:number}>}
 */
async function evalHarvestPriceAlert(id, a) {
  const type = `crop_price_${id}`;

  // Etapa que no es de cosecha/llenado → asegurar limpieza, sin tocar red.
  if (!PRECIO_STAGES.has(a.current_stage)) {
    emit('alertCleared', { type });
    return { emitted: 0, cleared: 1 };
  }

  // Especie sin producto SIPSA mapeado → honesto: no hay con qué cotizar.
  const producto = resolveProductoFromSlug(a.subject_slug);
  if (!producto) {
    emit('alertCleared', { type });
    return { emitted: 0, cleared: 1 };
  }

  // Consulta el precio vigente. getPrecioSipsa degrada a null (sidecar off /
  // offline / HTTP error) sin lanzar; envolvemos por si acaso.
  let res = null;
  try {
    res = await getPrecioSipsa('latest_price', { producto });
  } catch {
    res = null;
  }

  // Sin respuesta utilizable, no disponible (federated/no_matches/unavailable),
  // o dato desactualizado → no inventamos: limpiamos la alerta previa.
  const precio = res?.price?.precio_promedio_cop_kg;
  const fresco = res?.available === true
    && res?.frescura?.desactualizado === false
    && typeof precio === 'number'
    && Number.isFinite(precio);

  if (!fresco) {
    emit('alertCleared', { type });
    return { emitted: 0, cleared: 1 };
  }

  const precioFmt = formatCop(precio);
  const central = res.central_abastos || res.price?.plaza || 'la central de abastos';
  const cultivo = a.subject_label || 'tu cultivo';
  const cosechaVerbo = a.current_stage === 'harvest_window'
    ? 'está para cosechar'
    : 'va llenando fruto';

  emit('alertTriggered', {
    type,
    severity: 'info',
    title: `Precio de mercado: ${cultivo}`,
    message: `Tu ${cultivo.toLowerCase()} ${cosechaVerbo}; hoy está a ${precioFmt} COP/kg en ${central} (precio mayorista SIPSA).`,
    source: 'price',
    processId: id,
    producto,
    especie: res.especie || a.subject_slug || null,
    precioCopKg: Math.round(precio),
    central,
    fechaDato: res.price?.fecha || res.frescura?.fecha_dato || null,
  });
  return { emitted: 1, cleared: 0 };
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
    // `a` es la bolsa de atributos del ciclo (forma variable según el proceso
    // FarmProcess de turno) — @type any a propósito, mismo criterio que el
    // resto de accesos sueltos de este bloque (current_stage/subject_slug/
    // subject_label no están en el tipo estrecho de FarmProcess.attributes).
    /** @type {any} */
    const a = c?.attributes || {};
    const id = c?.process_id || /** @type {any} */ (c)?.id;
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

    // Alerta de PRECIO cerca de cosecha (#26) — solo en harvest_window/fruiting.
    const priceDelta = await evalHarvestPriceAlert(id, a);
    emitted += priceDelta.emitted;
    cleared += priceDelta.cleared;

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
