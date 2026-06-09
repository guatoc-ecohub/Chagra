import { recordFarmEvent } from './farmEventService';
import { calculateWindows } from './phenologyCalculator';

/**
 * Task 31: Asocia un snapshot climático a un ciclo.
 */
export async function attachClimateToCycle({ processId, climateSnapshot, locationId }) {
  if (!processId) throw new Error('attachClimateToCycle: process_id required');

  return recordFarmEvent({
    process_id: processId,
    event_type: 'weather_snapshot',
    occurred_at: Date.now(),
    actor: 'system',
    source: 'clima_service',
    payload: {
      snapshot: climateSnapshot || null,
      location_id: locationId || null,
      attached_at: Date.now(),
    },
    confidence: 0.9,
  });
}

/**
 * Task 32: Recalcula ventanas fenológicas usando datos climáticos.
 * Si hay temperatura media, ajusta los rangos base.
 */
export function recalculateWithClimate({ speciesSlug, sowingDate, altitudeM, avgTempC, rainfallMm }) {
  let correctedAlt = altitudeM;

  // Corrección térmica: temperaturas altas (>25°C media) aceleran ~10%
  // Temperaturas bajas (<15°C) retardan ~15%. Simula efecto de mayor/menor altitud.
  if (avgTempC !== undefined && avgTempC > 0) {
    if (avgTempC > 25) {
      correctedAlt = Math.max(0, (altitudeM || 1000) - 200);
    } else if (avgTempC < 15) {
      correctedAlt = (altitudeM || 1000) + 300;
    }
  }

  // Estrés hídrico: lluvia muy baja (<20mm mes) retrasa
  if (rainfallMm !== undefined && rainfallMm < 20 && rainfallMm >= 0) {
    correctedAlt = (correctedAlt || 1000) + 150;
  }

  return calculateWindows({ speciesSlug, sowingDate, altitudeM: correctedAlt });
}

/**
 * Task 33: Genera tareas preventivas según fase ENSO y etapa del ciclo.
 */
export function getEnsemblePreventiveTasks(ensoPhase, stageCode) {
  if (!ensoPhase || !stageCode) return [];

  const tasks = [];

  if (ensoPhase === 'El Niño' || ensoPhase === 'el_nino') {
    if (['sowing', 'emergence', 'vegetative'].includes(stageCode)) {
      tasks.push({ task: 'Aumentar frecuencia de riego', description: 'Por déficit hídrico esperado (El Niño)', priority: 'alta' });
      tasks.push({ task: 'Aplicar mulch o cobertura', description: 'Proteger el suelo de la desecación', priority: 'alta' });
    }
    if (['flowering', 'fruiting'].includes(stageCode)) {
      tasks.push({ task: 'Monitorear estrés térmico en floración', description: 'Altas temperaturas pueden abortar flores', priority: 'alta' });
      tasks.push({ task: 'Riego por goteo', description: 'Optimizar agua en etapa crítica', priority: 'alta' });
    }
    tasks.push({ task: 'Prepararse para racionamiento de agua', description: 'Almacenar agua si es posible', priority: 'media' });
  }

  if (ensoPhase === 'La Niña' || ensoPhase === 'la_nina') {
    tasks.push({ task: 'Limpiar drenajes', description: 'Prevenir encharcamiento por lluvias intensas', priority: 'alta' });
    tasks.push({ task: 'Aplicar caldo bordelés preventivo', description: 'Alta humedad favorece hongos', priority: 'alta' });
    tasks.push({ task: 'Monitorear pudrición de raíz', description: 'Revisar plantas en zonas bajas del lote', priority: 'alta' });
    if (['harvest_window'].includes(stageCode)) {
      tasks.push({ task: 'Adelantar cosecha si es posible', description: 'Evitar pérdidas por exceso de lluvia', priority: 'media' });
    }
  }

  return tasks;
}

/**
 * Task 34: Retorna riesgos de plagas comunes por etapa y especie.
 */
export function getPestRisksByStage(stageCode, speciesSlug) {
  if (!stageCode) return [];

  const pestDB = {
    vegetative: [
      { pest: 'Áfidos / pulgones', risk: 'medio', control: 'Jabón potásico o control biológico con Chrysoperla' },
      { pest: 'Gusanos comedores de hoja', risk: 'alto', control: 'Bacillus thuringiensis (Bt)' },
    ],
    flowering: [
      { pest: 'Trips', risk: 'alto', control: 'Trampas cromáticas azules + aceite de neem' },
      { pest: 'Antracnosis', risk: 'medio', control: 'Caldo bordelés cada 15 días' },
    ],
    fruiting: [
      { pest: 'Mosca de la fruta', risk: 'alto', control: 'Trampas McPhail con proteína hidrolizada' },
      { pest: 'Passalora / mancha de hierro (café)', risk: 'medio', control: 'Manejo de sombrío y fungicidas cúpricos' },
    ],
    harvest_window: [
      { pest: 'Hongo de postcosecha', risk: 'medio', control: 'Manejo de humedad en almacenamiento' },
    ],
  };

  // Específicas por cultivo
  if (speciesSlug === 'coffea_arabica') {
    if (stageCode === 'vegetative' || stageCode === 'flowering') {
      pestDB[stageCode] = (pestDB[stageCode] || []).concat([
        { pest: 'Broca del café (Hypothenemus hampei)', risk: 'crítico', control: 'Revisión de frutos + trampas Brocap + hongos entomopatógenos (Beauveria bassiana)' },
        { pest: 'Roya del cafeto (Hemileia vastatrix)', risk: 'crítico', control: 'Variedades resistentes + caldo bordelés preventivo' },
      ]);
    }
  }
  if (speciesSlug === 'solanum_tuberosum') {
    if (stageCode === 'vegetative') {
      pestDB[stageCode] = (pestDB[stageCode] || []).concat([
        { pest: 'Gota / tizón tardío (Phytophthora infestans)', risk: 'crítico', control: 'Fungicidas preventivos + drenaje + variedades tolerantes' },
        { pest: 'Gusano blanco / chiza', risk: 'alto', control: 'Control biológico con Metarhizium anisopliae + rotación' },
      ]);
    }
  }

  return pestDB[stageCode] || [];
}

/**
 * Task 35: Obtiene biopreparados recomendados para una etapa y plaga.
 */
export function getBiopreparadosForStage(stageCode, pestName) {
  if (!stageCode) return [];

  const bioDB = {
    vegetative: [
      { nombre: 'Caldo bordelés', uso: 'Preventivo fungoso cada 15 días', etapa: 'vegetative' },
      { nombre: 'Jabón potásico', uso: 'Control de áfidos y trips', etapa: 'vegetative' },
    ],
    flowering: [
      { nombre: 'Aceite de neem', uso: 'Control de trips y áfidos en floración', etapa: 'flowering' },
      { nombre: 'Caldo sulfocálcico', uso: 'Fungoso preventivo en floración', etapa: 'flowering' },
    ],
    fruiting: [
      { nombre: 'Bocashi', uso: 'Fertilización de llenado de fruto', etapa: 'fruiting' },
      { nombre: 'Microorganismos eficientes (EM)', uso: 'Acelerar descomposición y mejorar suelo', etapa: 'fruiting' },
    ],
    harvest_window: [
      { nombre: 'Caldo bordelés', uso: 'Protección postcosecha', etapa: 'harvest_window' },
    ],
  };

  const bios = bioDB[stageCode] || [];

  // Filtrar por plaga si se especifica
  if (pestName && bios.length > 0) {
    // Heurística simple: retornar todos, el caller filtra
  }

  return bios;
}
