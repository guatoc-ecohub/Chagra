/**
 * seguimientoProcesos — catálogo de los procesos de finca con SEGUIMIENTO
 * visible (tarjeta en el home + vista de seguimiento), 2026-06-15.
 *
 * El operador pidió "tarjetas en el home + vista de seguimiento, como Mis
 * plantas pero para estos procesos": Reforestación · Silvopastoreo · Páramo ·
 * Cerdos. Cada entrada mapea a un `process_type` de types/farmProcess y reusa
 * el motor FarmProcess (createFarmProcess / recordFarmEvent / confirmStage) y
 * la secuencia de etapas (stageSequenceForProcessType).
 *
 * Fuente única: la vista de seguimiento (SeguimientoProcesoScreen), las tarjetas
 * del dashboard (FincaCards) y el routing (App.jsx) leen de aquí. NO duplicar
 * labels ni rutas.
 */

/**
 * @typedef {Object} SeguimientoProcesoDef
 * @property {string} key — id de ruta corta, ej. 'reforestacion'
 * @property {string} processType — process_type válido en types/farmProcess
 * @property {string} title — título de la tarjeta / pantalla
 * @property {string} subtitle — copy de campesino bajo el título
 * @property {string} emoji — ícono emoji grande (mismo patrón que FincaCards)
 * @property {string} section — clave de estilo tonal (ver SECTION_STYLES)
 * @property {'individual'|'aggregate'} subjectKind — modo por defecto del sujeto
 * @property {string} defaultUnit — unidad por defecto al iniciar
 * @property {string} subjectLabelPlaceholder — placeholder del campo "qué"
 * @property {string} startVerb — etiqueta del botón "iniciar"
 * @property {string} emptyHint — invitación amable en la tarjeta cuando el
 *   contador está en cero (en vez de un "0" triste). Español Colombia.
 */

/** @type {SeguimientoProcesoDef[]} */
export const SEGUIMIENTO_PROCESOS = [
  {
    key: 'reforestacion',
    processType: 'restoration',
    title: 'Reforestación',
    subtitle: 'Restauración con árboles nativos',
    emoji: '🌳',
    section: 'reforestacion',
    subjectKind: 'aggregate',
    defaultUnit: 'árboles',
    subjectLabelPlaceholder: 'Ej: Roble, Aliso, Cativo…',
    startVerb: 'Iniciar reforestación',
    emptyHint: 'Siembra tus primeros árboles',
  },
  {
    key: 'silvopastoreo',
    processType: 'silvopasture',
    title: 'Silvopastoreo',
    subtitle: 'Árboles + pasto + ganado',
    emoji: '🐄',
    section: 'silvopastoreo',
    subjectKind: 'aggregate',
    defaultUnit: 'árboles',
    subjectLabelPlaceholder: 'Ej: Leucaena, Botón de oro, Nacedero…',
    startVerb: 'Iniciar silvopastoreo',
    emptyHint: 'Une árboles, pasto y ganado',
  },
  {
    key: 'paramo',
    processType: 'paramo',
    title: 'Páramo',
    subtitle: 'Conservación de páramo y agua',
    emoji: '🏔️',
    section: 'paramo',
    subjectKind: 'aggregate',
    defaultUnit: 'hectáreas',
    subjectLabelPlaceholder: 'Ej: Nacimiento de agua, frailejonal…',
    startVerb: 'Iniciar conservación',
    emptyHint: 'Cuida tu páramo y el agua',
  },
  {
    key: 'cerdos',
    processType: 'pigs',
    title: 'Cerdos',
    subtitle: 'Ciclo de manejo porcino',
    emoji: '🐖',
    section: 'cerdos',
    subjectKind: 'aggregate',
    defaultUnit: 'animales',
    subjectLabelPlaceholder: 'Ej: Lote de engorde, marranas de cría…',
    startVerb: 'Iniciar ciclo',
    emptyHint: 'Arranca tu primer lote',
  },
];

/** Mapa key → def, para resolver desde la ruta. */
export const SEGUIMIENTO_BY_KEY = Object.fromEntries(
  SEGUIMIENTO_PROCESOS.map((d) => [d.key, d]),
);

/** Resuelve la definición desde una key de ruta. */
export const getSeguimientoDef = (key) => SEGUIMIENTO_BY_KEY[key] || null;

/** Ruta de navegación para una key de seguimiento. */
export const seguimientoRoute = (key) => `seguimiento_${key}`;

/**
 * Parsea una vista 'seguimiento_<key>' a su key. Devuelve null si no aplica.
 * @param {string} view
 */
export const parseSeguimientoView = (view) => {
  if (typeof view !== 'string') return null;
  const m = view.match(/^seguimiento_(.+)$/);
  if (!m) return null;
  return SEGUIMIENTO_BY_KEY[m[1]] ? m[1] : null;
};
