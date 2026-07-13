/**
 * fincaEvolutionService — cálculo de indicadores de evolución agroecológica.
 *
 * Funciones PURAS que calculan, desde datos que la app YA tiene, puntajes de
 * evolución de finca para el radar (usa src/data/agroecology-indicators.json:
 * TAPE 10 + MESMIS 5).
 *
 * HEURÍSTICAS CONSERVADORAS: CERO FABRICACIÓN. Si no hay datos para un
 * indicador -> null (NO inventa).
 *
 * @module services/fincaEvolutionService
 */

// ─── Tipos internos ─────────────────────────────────────────────────────

/**
 * @typedef {Object} FarmProcessInput
 * @property {string} process_id
 * @property {string} process_type
 * @property {string|null} [subject_slug]
 * @property {string} [subject_label]
 * @property {string} [current_stage]
 * @property {string} status
 * @property {Array} [events] - eventos del proceso (si disponibles)
 * @property {Object} [attributes] - atributos JSON:API del asset (si disponibles)
 * @property {Array} [companions] - especies asociadas (si disponibles)
 * @property {Object} [payload] - metadata adicional (si disponible)
 */

/**
 * @typedef {Object} ObservationInput
 * @property {string} observation_id
 * @property {string} text
 * @property {number} [created_at]
 * @property {string} [event_type]
 * @property {object} [payload]
 */

/**
 * @typedef {Object} EvaluarEvolucionFincaInput
 * @property {FarmProcessInput[]} [processes=[]]
 * @property {ObservationInput[]} [observations=[]]
 */

/**
 * @typedef {Object} MESMISScore
 * @property {number|null} productividad - 0-4 o null si no hay datos
 * @property {number|null} estabilidad_resiliencia - 0-4 o null si no hay datos
 * @property {number|null} adaptabilidad - 0-4 o null si no hay datos
 * @property {number|null} equidad - 0-4 o null si no hay datos
 * @property {number|null} autodependencia - 0-4 o null si no hay datos
 */

/**
 * @typedef {Object} TAPEScore
 * @property {number|null} diversidad - 0-4 o null si no hay datos
 * @property {number|null} sinergias - 0-4 o null si no hay datos
 * @property {number|null} eficiencia - 0-4 o null si no hay datos
 * @property {number|null} resiliencia - 0-4 o null si no hay datos
 * @property {number|null} reciclaje - 0-4 o null si no hay datos
 * @property {number|null} cocreacion_conocimiento - 0-4 o null si no hay datos
 * @property {number|null} valores_humanos_sociales - 0-4 o null si no hay datos
 * @property {number|null} cultura_tradiciones - 0-4 o null si no hay datos
 * @property {number|null} economia_circular_solidaria - 0-4 o null si no hay datos
 * @property {number|null} gobernanza - 0-4 o null si no hay datos
 */

/**
 * @typedef {Object} EvaluarEvolucionFincaResult
 * @property {MESMISScore} mesmis
 * @property {TAPEScore} tape
 * @property {number} nivelGliessman - 0-5 estimado
 * @property {{ processes_count: number, active_processes_count: number, observations_count: number, mesmis_non_null_count: number, tape_non_null_count: number, calculated_at: number }} metadata - información sobre qué datos se usaron
 */

// ─── Helpers para cálculo de scores ───────────────────────────────────────

/**
 * Escala un conteo a un score 0-4.
 *
 * Para ser más generoso con cantidades pequeñas:
 * - 1 elemento → 1 punto
 * - 2 elementos → 2 puntos
 * - 3 elementos → 3 puntos
 * - 4+ elementos → 4 puntos (máximo)
 *
 * @param {number} count - valor a escalar
 * @param {number} max - valor máximo esperado (para 4 puntos)
 * @returns {number} score 0-4
 */
function scaleToScore(count, max) {
  if (count <= 0) return 0;
  if (count >= max) return 4;
  // Generoso con cantidades pequeñas: 1→1, 2→2, 3→3, 4+→4
  return Math.min(4, count);
}

/**
 * Extrae eventos de cosecha de los procesos.
 * @param {FarmProcessInput[]} processes
 * @returns {Array} eventos de cosecha
 */
function extractHarvestEvents(processes) {
  const harvestEvents = [];
  for (const process of processes) {
    if (process.events && Array.isArray(process.events)) {
      for (const event of process.events) {
        if (event.event_type === 'harvest_confirmed' && event.payload?.quantity) {
          harvestEvents.push({ ...event, process_type: process.process_type });
        }
      }
    }
  }
  return harvestEvents;
}

/**
 * Extrae eventos de manejo de plagas de los procesos.
 * @param {FarmProcessInput[]} processes
 * @returns {Array} eventos de manejo de plagas
 */
function extractPestManagementEvents(processes) {
  const pestEvents = [];
  for (const process of processes) {
    if (process.events && Array.isArray(process.events)) {
      for (const event of process.events) {
        if (event.event_type === 'pest_management_confirmed') {
          pestEvents.push({ ...event, process_type: process.process_type });
        }
      }
    }
  }
  return pestEvents;
}

/**
 * Extrae eventos de transición de etapa.
 * @param {FarmProcessInput[]} processes
 * @returns {Array} eventos de transición
 */
function extractStageTransitionEvents(processes) {
  const transitionEvents = [];
  for (const process of processes) {
    if (process.events && Array.isArray(process.events)) {
      for (const event of process.events) {
        if (event.event_type === 'stage_transition' || event.event_type === 'stage_corrected') {
          transitionEvents.push({ ...event, process_type: process.process_type });
        }
      }
    }
  }
  return transitionEvents;
}

// ─── Cálculo MESMIS ───────────────────────────────────────────────────────

/**
 * Calcula el atributo de Productividad MESMIS.
 *
 * HEURÍSTICA: se basa en número de cosechas registradas con cantidad.
 * LIMITACIÓN: no mide rendimiento real (kg/ha), solo frecuencia de registro.
 *
 * @param {FarmProcessInput[]} processes
 * @returns {number|null} 0-4 o null si no hay datos
 */
function calcularProductividadMESMIS(processes) {
  const harvestEvents = extractHarvestEvents(processes);
  if (harvestEvents.length === 0) return null;
  
  // Score basado en número de cosechas distintas (máximo 5 para score 4)
  return scaleToScore(harvestEvents.length, 5);
}

/**
 * Calcula el atributo de Estabilidad y Resiliencia MESMIS.
 *
 * HEURÍSTICA: se basa en diversidad de etapas activas simultáneamente.
 * Un sistema resiliente tiene múltiples cultivos en diferentes etapas.
 * LIMITACIÓN: no mide estabilidad temporal (años de datos), solo snapshot.
 *
 * @param {FarmProcessInput[]} processes
 * @returns {number|null} 0-4 o null si no hay datos
 */
function calcularEstabilidadResilienciaMESMIS(processes) {
  const activeProcesses = processes.filter(p => (p.status ?? p.attributes?.status) === 'active');
  if (activeProcesses.length === 0) return null;
  
  // Contar etapas distintas
  const stages = new Set();
  for (const process of activeProcesses) {
    if (process.current_stage) {
      stages.add(process.current_stage);
    }
  }
  
  if (stages.size === 0) return null;
  
  // Score basado en número de etapas distintas (máximo 5 para score 4)
  return scaleToScore(stages.size, 5);
}

/**
 * Calcula el atributo de Adaptabilidad MESMIS.
 *
 * HEURÍSTICA: se basa en número de transiciones de etapa registradas.
 * Un sistema adaptable ajusta prácticas cuando cambian condiciones.
 * LIMITACIÓN: no distingue entre ajustes positivos y negativos.
 *
 * @param {FarmProcessInput[]} processes
 * @returns {number|null} 0-4 o null si no hay datos
 */
function calcularAdaptabilidadMESMIS(processes) {
  const transitions = extractStageTransitionEvents(processes);
  if (transitions.length === 0) return null;
  
  // Score basado en número de ajustes (máximo 10 para score 4)
  return scaleToScore(transitions.length, 10);
}

/**
 * Calcula el atributo de Equidad MESMIS.
 *
 * HEURÍSTICA: no tenemos datos para calcular equidad (distribución justa de
 * beneficios, trabajo y oportunidades). Requeriría datos de ingresos,
 * composición familiar, división del trabajo.
 * LIMITACIÓN: siempre null con los datos actuales.
 *
 * @returns {null} siempre null
 */
function calcularEquidadMESMIS() {
  return null;
}

/**
 * Calcula el atributo de Autodependencia MESMIS.
 *
 * HEURÍSTICA: se basa en proporción de manejo ecológico vs químico.
 * Si hay pest_management_confirmed events, verificar si usan biopreparados.
 * LIMITACIÓN: solo considera manejo de plagas, no semillas ni insumos.
 *
 * @param {FarmProcessInput[]} processes
 * @returns {number|null} 0-4 o null si no hay datos
 */
function calcularAutodependenciaMESMIS(processes) {
  const pestEvents = extractPestManagementEvents(processes);
  if (pestEvents.length === 0) return null;
  
  // Contar cuántos usan biopreparados (payload.method contiene 'bio' o 'organico')
  const bioCount = pestEvents.filter(e => {
    const method = e.payload?.method?.toLowerCase() || '';
    const treatment = e.payload?.treatment?.toLowerCase() || '';
    return method.includes('bio') || method.includes('orgán') || 
           treatment.includes('bio') || treatment.includes('orgán');
  }).length;
  
  // Score basado en proporción de manejo ecológico (100% bio = 4)
  return scaleToScore(bioCount, pestEvents.length);
}

// ─── Cálculo TAPE ─────────────────────────────────────────────────────────

/**
 * Calcula el elemento de Diversidad TAPE.
 *
 * HEURÍSTICA: se basa en número de especies distintas en procesos.
 * LIMITACIÓN: solo considera cultivos, no animales o microorganismos.
 *
 * @param {FarmProcessInput[]} processes
 * @returns {number|null} 0-4 o null si no hay datos
 */
function calcularDiversidadTAPE(processes) {
  // Contar especies distintas por subject_slug
  const species = new Set();
  for (const process of processes) {
    if (process.subject_slug) {
      species.add(process.subject_slug);
    } else if (process.subject_label) {
      // Fallback: usar label si no hay slug
      species.add(process.subject_label.toLowerCase());
    }
  }

  if (species.size === 0) return null;

  // Score basado en número de especies (máximo 8 para score 4, más sensible)
  // 1 especie → 0, 2 → 1, 4 → 2, 6 → 3, 8+ → 4
  return scaleToScore(species.size, 8);
}

/**
 * Calcula el elemento de Sinergias TAPE.
 *
 * HEURÍSTICA: se basa en procesos con companions (especies asociadas).
 * LIMITACIÓN: requeriría que los procesos incluyan metadata de companions.
 *
 * @param {FarmProcessInput[]} processes
 * @returns {number|null} 0-4 o null si hay datos
 */
function calcularSinergiasTAPE(processes) {
  // Verificar si hay procesos con companions
  const processesWithCompanions = processes.filter(p => {
    const companions = p.companions || p.payload?.companions;
    return companions && Array.isArray(companions) && companions.length > 0;
  });
  
  if (processesWithCompanions.length === 0) return null;
  
  // Score basado en número de procesos con companions (máximo 5 para score 4)
  return scaleToScore(processesWithCompanions.length, 5);
}

/**
 * Calcula el elemento de Eficiencia TAPE.
 *
 * HEURÍSTICA: requeriría datos de uso de recursos (agua, energía, insumos).
 * LIMITACIÓN: no tenemos tracking de recursos. Siempre null.
 *
 * @returns {null} siempre null
 */
function calcularEficienciaTAPE() {
  return null;
}

/**
 * Calcula el elemento de Resiliencia TAPE.
 *
 * HEURÍSTICA: se basa en diversidad de tipos de proceso (sowing, restoration,
 * silvopasture, etc.). Un sistema resiliente tiene múltiples tipos de producción.
 * LIMITACIÓN: no midera resiliencia climática o ecológica real.
 *
 * @param {FarmProcessInput[]} processes
 * @returns {number|null} 0-4 o null si no hay datos
 */
function calcularResilienciaTAPE(processes) {
  const activeProcesses = processes.filter(p => (p.status ?? p.attributes?.status) === 'active');
  if (activeProcesses.length === 0) return null;
  
  // Contar tipos de proceso distintos
  const types = new Set();
  for (const process of activeProcesses) {
    types.add(process.process_type);
  }
  
  if (types.size === 0) return null;
  
  // Score basado en número de tipos (máximo 4 para score 4)
  return scaleToScore(types.size, 4);
}

/**
 * Calcula el elemento de Reciclaje TAPE.
 *
 * HEURÍSTICA: requeriría eventos específicos de compostaje, bocashi, mulch.
 * LIMITACIÓN: no tenemos estos eventos todavía. Siempre null.
 *
 * @returns {null} siempre null
 */
function calcularReciclajeTAPE() {
  return null;
}

/**
 * Calcula el elemento de Cocreación de Conocimiento TAPE.
 *
 * HEURÍSTICA: se basa en número de observaciones con texto sustancial (>50 chars).
 * LIMITACIÓN: no mide intercambio real entre personas, solo registro individual.
 *
 * @param {ObservationInput[]} observations
 * @returns {number|null} 0-4 o null si no hay datos
 */
function calcularCocreacionConocimientoTAPE(observations) {
  if (!observations || observations.length === 0) return null;

  // Contar observaciones con texto sustancial
  const substantialObs = observations.filter(obs => {
    const text = obs.text || obs.payload?.text || '';
    return text.length > 50;
  });

  if (substantialObs.length === 0) return null;

  // Score basado en número de observaciones (máximo 5 para score 4, más sensible)
  // 1 obs → 0, 2 → 1, 3 → 2, 4 → 3, 5+ → 4
  return scaleToScore(substantialObs.length, 5);
}

/**
 * Calcula el elemento de Valores Humanos y Sociales TAPE.
 *
 * HEURÍSTICA: requeriría datos de prácticas comunitarias, trabajo colaborativo.
 * LIMITACIÓN: no tenemos estos datos. Siempre null.
 *
 * @returns {null} siempre null
 */
function calcularValoresHumanosSocialesTAPE() {
  return null;
}

/**
 * Calcula el elemento de Cultura y Tradiciones Locales TAPE.
 *
 * HEURÍSTICA: requeriría datos de semillas criollas, prácticas ancestrales.
 * LIMITACIÓN: no tenemos estos datos todavía. Siempre null.
 *
 * @returns {null} siempre null
 */
function calcularCulturaTradicionesTAPE() {
  return null;
}

/**
 * Calcula el elemento de Economía Circular y Solidaria TAPE.
 *
 * HEURÍSTICA: requeriría datos de mercados locales, intercambios.
 * LIMITACIÓN: no tenemos estos datos. Siempre null.
 *
 * @returns {null} siempre null
 */
function calcularEconomiaCircularSolidariaTAPE() {
  return null;
}

/**
 * Calcula el elemento de Gobernanza Participativa TAPE.
 *
 * HEURÍSTICA: requeriría datos de organizaciones, decisiones colectivas.
 * LIMITACIÓN: no tenemos estos datos. Siempre null.
 *
 * @returns {null} siempre null
 */
function calcularGobernanzaTAPE() {
  return null;
}

// ─── Cálculo Nivel Gliessman ─────────────────────────────────────────────

/**
 * Estima el nivel de Gliessman (0-5) basado en indicadores MESMIS/TAPE.
 *
 * HEURÍSTICA: suma ponderada de indicadores clave:
 * - diversidad (TAPE) 40%
 * - autodependencia (MESMIS) 30%
 * - resiliencia (MESMIS) 15%
 * - productividad (MESMIS) 15%
 *
 * LIMITACIÓN: es una estimación burda basada en datos parciales. No reemplaza
 * una evaluación profesional del sistema.
 *
 * Niveles de Gliessman:
 * 0: Convencional (monocultivo, alto insumo químico)
 * 1: Reducción de insumos
 * 2: Sustitución con insumos orgánicos
 * 3: Rediseño del sistema
 * 4: Conexión con redes sociales/económicas
 *
 * @param {MESMISScore} mesmis
 * @param {TAPEScore} tape
 * @returns {number} 0-4
 */
function calcularNivelGliessman(mesmis, tape) {
  // Solo considerar indicadores no-null
  const validIndicators = [];
  
  if (tape.diversidad !== null) validIndicators.push(tape.diversidad * 0.4);
  if (mesmis.autodependencia !== null) validIndicators.push(mesmis.autodependencia * 0.3);
  if (mesmis.estabilidad_resiliencia !== null) validIndicators.push(mesmis.estabilidad_resiliencia * 0.15);
  if (mesmis.productividad !== null) validIndicators.push(mesmis.productividad * 0.15);
  
  if (validIndicators.length === 0) return 0;
  
  // Sumar ponderación y escalar a 0-4
  const sum = validIndicators.reduce((a, b) => a + b, 0);
  return Math.min(4, Math.round(sum));
}

// ─── Función principal ───────────────────────────────────────────────────

/**
 * Evalúa la evolución de la finca usando indicadores MESMIS y TAPE.
 *
 * @param {EvaluarEvolucionFincaInput} input
 * @returns {EvaluarEvolucionFincaResult}
 */
export function evaluarEvolucionFinca({ processes = [], observations = [] } = {}) {
  // Validar entrada
  if (!Array.isArray(processes)) {
    throw new Error('processes debe ser un array');
  }
  if (!Array.isArray(observations)) {
    throw new Error('observations debe ser un array');
  }
  
  // Calcular MESMIS
  const mesmis = {
    productividad: calcularProductividadMESMIS(processes),
    estabilidad_resiliencia: calcularEstabilidadResilienciaMESMIS(processes),
    adaptabilidad: calcularAdaptabilidadMESMIS(processes),
    equidad: calcularEquidadMESMIS(),
    autodependencia: calcularAutodependenciaMESMIS(processes),
  };
  
  // Calcular TAPE
  const tape = {
    diversidad: calcularDiversidadTAPE(processes),
    sinergias: calcularSinergiasTAPE(processes),
    eficiencia: calcularEficienciaTAPE(),
    resiliencia: calcularResilienciaTAPE(processes),
    reciclaje: calcularReciclajeTAPE(),
    cocreacion_conocimiento: calcularCocreacionConocimientoTAPE(observations),
    valores_humanos_sociales: calcularValoresHumanosSocialesTAPE(),
    cultura_tradiciones: calcularCulturaTradicionesTAPE(),
    economia_circular_solidaria: calcularEconomiaCircularSolidariaTAPE(),
    gobernanza: calcularGobernanzaTAPE(),
  };
  
  // Calcular nivel Gliessman
  const nivelGliessman = calcularNivelGliessman(mesmis, tape);
  
  // Metadata para debug/validación
  const metadata = {
    processes_count: processes.length,
    active_processes_count: processes.filter(p => (p.status ?? p.attributes?.status) === 'active').length,
    observations_count: observations.length,
    mesmis_non_null_count: Object.values(mesmis).filter(v => v !== null).length,
    tape_non_null_count: Object.values(tape).filter(v => v !== null).length,
    calculated_at: Date.now(),
  };
  
  return {
    mesmis,
    tape,
    nivelGliessman,
    metadata,
  };
}

/**
 * Normaliza un score a 0-100 para visualización.
 * @param {number|null} score - 0-4 o null
 * @returns {number|null} 0-100 o null
 */
export function normalizeScore(score) {
  if (score === null) return null;
  return (score / 4) * 100;
}

/**
 * Devuelve la etiqueta humana para un nivel de Gliessman.
 * @param {number} nivel - 0-4
 * @returns {string} etiqueta
 */
export function getGliessmanLabel(nivel) {
  const labels = {
    0: '0. Convencional (monocultivo)',
    1: '1. Reducción de insumos',
    2: '2. Sustitución orgánica',
    3: '3. Rediseño del sistema',
    4: '4. Conexión social y económica',
  };
  return labels[nivel] || 'Desconocido';
}
