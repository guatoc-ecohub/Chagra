/**
 * FarmProcess — agregado raíz de un ciclo productivo en la finca.
 *
 * Representa siembra, restauración, silvopastoreo, manejo de plagas,
 * cosecha o poscosecha. Su estado se deriva de eventos (append-only).
 * current_stage es cache materializado, no source of truth.
 *
 * @typedef {Object} FarmProcessAttributes
 * @property {string} process_type — 'sowing' | 'restoration' | 'silvopasture' | 'pest_management' | 'harvest' | 'post_harvest'
 * @property {'individual' | 'aggregate'} subject_kind — qué representa: planta individual o población
 * @property {string} [subject_slug] — species slug del catálogo, ej. "solanum_lycopersicum"
 * @property {string} [subject_label] — nombre común, ej. "Tomate chonto"
 * @property {number} quantity — cantidad total declarada
 * @property {string} unit — 'plantas' | 'semillas' | 'arboles' | 'matas' | 'kg' | 'g'
 * @property {string} [variety] — variedad si aplica, ej. "Chonto"
 * @property {string} location_land_asset_id — ID del asset--land donde ocurre
 * @property {string} [location_zone_id] — ID de la zona específica (asset--structure opcional)
 * @property {string} status — 'active' | 'completed' | 'cancelled'
 * @property {string} current_stage — última etapa confirmada, ej. "sowing_confirmed" | "germination" | "growth" | "flowering" | "fruiting" | "harvest" | "fallow"
 * @property {number} created_at — unix ms
 * @property {number} updated_at — unix ms (último evento)
 * @property {string} [notes]
 */

/**
 * @typedef {Object} FarmProcess
 * @property {string} process_id — ULID
 * @property {'farm_process'} type
 * @property {FarmProcessAttributes} attributes
 */

/**
 * FarmProcessEvent — un evento atómico e inmutable en el ciclo.
 *
 * @typedef {Object} FarmProcessEventAttributes
 * @property {string} process_id — ref al FarmProcess
 * @property {string} event_type — 'sowing_confirmed' | 'observation' | 'stage_transition' | 'task_completed' | 'photo_attached' | 'weather_snapshot' | 'note'
 * @property {number} occurred_at — unix ms
 * @property {string} [actor] — quién registró
 * @property {string} [evidence] — ref a media_cache o texto
 * @property {Object} [payload] — datos específicos del evento
 * @property {number} [confidence] — 0-1 para eventos inferidos
 * @property {string} [source] — 'operator' | 'llm' | 'sensor' | 'external'
 */

/**
 * @typedef {Object} FarmProcessEvent
 * @property {string} event_id — ULID
 * @property {'farm_process_event'} type
 * @property {FarmProcessEventAttributes} attributes
 */

/**
 * CultivationProfile — perfil de cultivo con datos fenológicos de referencia.
 *
 * NO almacena estado de un ciclo particular; es conocimiento de especie
 * que puede venir del catálogo o de defaults locales.
 *
 * @typedef {Object} CultivationProfile
 * @property {string} species_slug
 * @property {string} species_label
 * @property {string} default_unit
 * @property {'individual' | 'aggregate'} default_tracking_mode
 * @property {number} [gdd_base_temp] — grados-día base para fenología
 * @property {number} [gdd_max_temp] — temperatura máxima para GDD
 * @property {Array<{stage: string, label: string, gdd_range?: number[], calendar_range?: number[]}>} [phenology_stages]
 * @property {number} [min_altitude]
 * @property {number} [max_altitude]
 * @property {Array<{especie: string, razon: string}>} [companions]
 * @property {Array<{especie: string, razon: string}>} [antagonists]
 */

/**
 * Population — una población o lote de plantas del mismo tipo.
 *
 * Difiere de FarmProcess en que Population describe el conjunto físico
 * (cuántas plantas, dónde), mientras FarmProcess describe el ciclo
 * (qué está pasando, desde cuándo).
 *
 * @typedef {Object} Population
 * @property {string} population_id — ULID
 * @property {'population'} type
 * @property {string} species_slug
 * @property {string} label
 * @property {number} count
 * @property {string} unit
 * @property {string} location_land_asset_id
 * @property {'active' | 'depleted' | 'removed'} status
 * @property {number} created_at
 * @property {number} updated_at
 */

// ─── Type guards ───────────────────────────────────────────────

/** @param {any} p @returns {p is FarmProcess} */
export const isFarmProcess = (p) => p?.type === 'farm_process';

/** @param {any} e @returns {e is FarmProcessEvent} */
export const isFarmProcessEvent = (e) => e?.type === 'farm_process_event';

/** @param {any} p @returns {p is Population} */
export const isPopulation = (p) => p?.type === 'population';

// ─── Validators ────────────────────────────────────────────────

// 'paramo' y 'pigs' agregados 2026-06-15 (seguimiento de procesos de finca):
//   - paramo: conservación/restauración de páramo (NO es cultivo ni cosecha;
//     hitos de protección de fuentes hídricas y de frailejones).
//   - pigs: ciclo de manejo porcino (alimentación/reproducción/sanidad). Reusa
//     animal-diagnostics.json + guardas leucaena/mimosina.
const VALID_PROCESS_TYPES = ['sowing', 'restoration', 'silvopasture', 'pest_management', 'harvest', 'post_harvest', 'paramo', 'pigs'];
const VALID_SUBJECT_KINDS = ['individual', 'aggregate'];
const VALID_STATUSES = ['active', 'completed', 'cancelled'];
// Transitional vocabulary: OpenCode's phenology/tasks use the newer
// emergence/vegetative/harvest_window/closed names, while the earlier
// draft types used germination/growth/harvest/fallow. Accept both until
// the ADR closes and the repo converges on one canonical set.
const VALID_STAGES = [
  'sowing',
  'sowing_confirmed',
  'emergence',
  'germination',
  'vegetative',
  'growth',
  'flowering',
  'fruiting',
  'harvest_window',
  'harvest',
  'post_harvest',
  'pest_management',
  'closed',
  'fallow',
  // Restauración/silvopastoreo: NO siguen fenología de cultivo (germina→florece→
  // cosecha); usan hitos propios de establecimiento ecológico.
  'establecimiento',
  'prendimiento',
  'mantenimiento',
  'monitoreo_sucesion',
  'cierre',
  // Páramo (conservación): hitos de protección de fuentes hídricas + frailejones.
  'delimitacion',
  'aislamiento',
  'revegetacion_nativa',
  'monitoreo_hidrico',
  // Cerdos (ciclo de manejo porcino). Hitos de manejo, NO fenología.
  'instalacion',
  'alimentacion',
  'reproduccion',
  'sanidad',
  'engorde',
];
const VALID_EVENT_TYPES = [
  'sowing_confirmed',
  'harvest_confirmed',
  'post_harvest_confirmed',
  'pest_management_confirmed',
  'observation',
  'stage_transition',
  'stage_confirmed',
  'stage_corrected',
  'task_completed',
  'photo_attached',
  'weather_snapshot',
  'note',
];

/**
 * Secuencia de etapas + etiquetas por tipo de proceso. La restauración/silvopastoreo
 * NO sigue fenología de cultivo; usa hitos de establecimiento ecológico, de modo que
 * el ciclo de una reforestación no "florece y cosecha".
 */
export const RESTORATION_STAGE_SEQUENCE = [
  { stage: 'establecimiento', label: 'Establecimiento (siembra/plantación)' },
  { stage: 'prendimiento', label: 'Prendimiento (¿pegaron las plántulas?)' },
  { stage: 'mantenimiento', label: 'Mantenimiento (replante y control de competencia)' },
  { stage: 'monitoreo_sucesion', label: 'Monitoreo de sucesión (cómo avanza el bosque)' },
  { stage: 'cierre', label: 'Cierre (rodal autosostenible)' },
];

const SOWING_STAGE_SEQUENCE = [
  { stage: 'sowing_confirmed', label: 'Siembra confirmada' },
  { stage: 'germination', label: 'Germinación' },
  { stage: 'vegetative', label: 'Crecimiento vegetativo' },
  { stage: 'flowering', label: 'Floración' },
  { stage: 'fruiting', label: 'Fructificación' },
  { stage: 'harvest', label: 'Cosecha' },
];

/**
 * Páramo (conservación). NO sigue fenología de cultivo: son hitos de protección
 * del ecosistema de páramo (delimitación de la zona, aislamiento del ganado,
 * revegetación con nativas, monitoreo de fuentes hídricas). El detalle técnico
 * de cada hito está marcado [VALIDAR] en la UI hasta tener fuente cerrada.
 */
export const PARAMO_STAGE_SEQUENCE = [
  { stage: 'delimitacion', label: 'Delimitación de la zona a proteger' },
  { stage: 'aislamiento', label: 'Aislamiento (cercas, sacar ganado)' },
  { stage: 'revegetacion_nativa', label: 'Revegetación con nativas (frailejón, etc.)' },
  { stage: 'monitoreo_hidrico', label: 'Monitoreo de fuentes hídricas y sucesión' },
  { stage: 'cierre', label: 'Cierre (zona protegida y estable)' },
];

/**
 * Cerdos (ciclo de manejo porcino). Hitos de MANEJO, no fenología. Las cifras
 * técnicas (gestación 114 días para porcino) salen de animal-diagnostics.json
 * (DR-ANIMAL-1, fuentes ICA/AGROSAVIA). Cualquier recomendación de dieta/sanidad
 * concreta NO va aquí sin fuente: se marca [VALIDAR] en la UI.
 */
export const PIGS_STAGE_SEQUENCE = [
  { stage: 'instalacion', label: 'Instalación (corral / cama profunda)' },
  { stage: 'alimentacion', label: 'Alimentación y engorde' },
  { stage: 'reproduccion', label: 'Reproducción (monta y gestación)' },
  { stage: 'sanidad', label: 'Sanidad y bioseguridad' },
  { stage: 'cierre', label: 'Cierre del ciclo' },
];

/** Secuencia de etapas (con etiqueta) apropiada para el tipo de proceso. */
export const stageSequenceForProcessType = (processType) => {
  if (processType === 'restoration' || processType === 'silvopasture') return RESTORATION_STAGE_SEQUENCE;
  if (processType === 'paramo') return PARAMO_STAGE_SEQUENCE;
  if (processType === 'pigs') return PIGS_STAGE_SEQUENCE;
  return SOWING_STAGE_SEQUENCE;
};

/**
 * Valida un objeto FarmProcess.
 * @param {any} p
 * @throws {Error} si la validación falla
 */
export const validateFarmProcess = (p) => {
  if (!isFarmProcess(p)) throw new Error('Invalid type: expected farm_process');
  if (!p.process_id) throw new Error('Missing process_id');
  const a = p.attributes;
  if (!a) throw new Error('Missing attributes');
  if (!VALID_PROCESS_TYPES.includes(a.process_type)) throw new Error(`Invalid process_type: ${a.process_type}`);
  if (!VALID_SUBJECT_KINDS.includes(a.subject_kind)) throw new Error(`Invalid subject_kind: ${a.subject_kind}`);
  if (!a.subject_slug && !a.subject_label) throw new Error('Need subject_slug or subject_label');
  if (!Number.isInteger(a.quantity) || a.quantity < 1) throw new Error('quantity must be positive integer');
  if (!a.unit) throw new Error('Missing unit');
  // location_land_asset_id es OPCIONAL (fix dead-end sin lotes).
  // Si no hay lotes en la finca, el ciclo se crea sin ubicacion;
  // el campesino puede asignarla despues. La UI muestra "Sin asignar".
  if (!VALID_STATUSES.includes(a.status)) throw new Error(`Invalid status: ${a.status}`);
  if (!VALID_STAGES.includes(a.current_stage)) throw new Error(`Invalid current_stage: ${a.current_stage}`);
};

/**
 * Valida un objeto FarmProcessEvent.
 * @param {any} e
 * @throws {Error} si la validación falla
 */
export const validateFarmProcessEvent = (e) => {
  if (!isFarmProcessEvent(e)) throw new Error('Invalid type: expected farm_process_event');
  if (!e.event_id) throw new Error('Missing event_id');
  const a = e.attributes;
  if (!a) throw new Error('Missing attributes');
  if (!a.process_id) throw new Error('Missing process_id');
  if (!VALID_EVENT_TYPES.includes(a.event_type)) throw new Error(`Invalid event_type: ${a.event_type}`);
  if (!Number.isInteger(a.occurred_at) || a.occurred_at <= 0) throw new Error('occurred_at must be positive integer');
};

/**
 * Valida un objeto Population.
 * @param {any} p
 * @throws {Error} si la validación falla
 */
export const validatePopulation = (p) => {
  if (!isPopulation(p)) throw new Error('Invalid type: expected population');
  if (!p.population_id) throw new Error('Missing population_id');
  if (!p.species_slug) throw new Error('Missing species_slug');
  if (!Number.isInteger(p.count) || p.count < 1) throw new Error('count must be positive integer');
  // location_land_asset_id es OPCIONAL (mismo criterio que FarmProcess).
};
