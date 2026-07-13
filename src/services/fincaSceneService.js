/**
 * fincaSceneService — traduce los datos REALES de la finca en una ESCENA 2D
 * glanceable para el home ("Mi Finca Viva").
 *
 * A diferencia de fincaGameService (que mapea la finca a un MUNDO por nivel
 * Gliessman 0-4), este módulo dibuja la finca PROCESO POR PROCESO: cada cultivo
 * se ve según su ETAPA FENOLÓGICA real (siembra → crecimiento → floración →
 * cosecha), los animales aparecen si los hay, y se calcula una "vitalidad"
 * honesta para un vistazo rápido en el home.
 *
 * Doble propósito:
 *   - Para una niña: lindo, vivo, con bichos y plantas que crecen.
 *   - Para el campesino: un vistazo claro del estado REAL de SU finca (cuántos
 *     cultivos, en qué etapa, cuántos en cosecha, salud del sistema).
 *
 * PRINCIPIO INNEGOCIABLE — CERO FABRICACIÓN: cada planta, etapa o animal que se
 * dibuja viene de un FarmProcess real de la finca. Sin datos → escena "por
 * sembrar" acogedora que invita a empezar (nunca un campo muerto ni progreso
 * inventado).
 *
 * Funciones PURAS: sin fetch, sin IDB, sin DOM. La tarjeta del home
 * (MiFincaVivaHomeCard) inyecta los procesos (de farmProcessCache) y, opcional,
 * el clima. Español de Colombia (tú/usted), sin voseo.
 *
 * @module services/fincaSceneService
 */

import { tipoDeSubject } from './subjectTipo.js';

// ─── Etapas fenológicas → cómo se ve la planta ──────────────────────────────

/**
 * Mapa de la etapa fenológica/hito de un proceso al SPRITE que la representa en
 * la escena. `growth` es 0..1 (qué tan crecida se dibuja la planta), `tone` es
 * el matiz (verde joven → verde maduro → dorado de cosecha) y `accent` marca si
 * lleva flor/fruto. Los nombres de etapa cubren el vocabulario transicional del
 * repo (germination/emergence, growth/vegetative, harvest_window/harvest, …) y
 * los hitos de restauración/páramo/cerdos (que NO son fenología de cultivo).
 *
 * @typedef {Object} StageSprite
 * @property {string} sprite   id del sprite a dibujar
 * @property {number} growth   0..1, altura/madurez visual de la planta
 * @property {'seed'|'sprout'|'leaf'|'flower'|'fruit'|'harvest'|'rest'} fase
 * @property {string} etiqueta etiqueta corta y clara (campesino + niña)
 */

const STAGE_SPRITES = Object.freeze({
  // Siembra
  sowing: { sprite: 'seed', growth: 0.1, fase: 'seed', etiqueta: 'Recién sembrada' },
  sowing_confirmed: { sprite: 'seed', growth: 0.12, fase: 'seed', etiqueta: 'Recién sembrada' },
  // Germinación / emergencia
  germination: { sprite: 'sprout', growth: 0.25, fase: 'sprout', etiqueta: 'Brotando' },
  emergence: { sprite: 'sprout', growth: 0.28, fase: 'sprout', etiqueta: 'Brotando' },
  // Crecimiento vegetativo
  growth: { sprite: 'leaf', growth: 0.55, fase: 'leaf', etiqueta: 'Creciendo' },
  vegetative: { sprite: 'leaf', growth: 0.55, fase: 'leaf', etiqueta: 'Creciendo' },
  // Floración
  flowering: { sprite: 'flower', growth: 0.78, fase: 'flower', etiqueta: 'Florecida' },
  // Fructificación
  fruiting: { sprite: 'fruit', growth: 0.9, fase: 'fruit', etiqueta: 'Con frutos' },
  // Cosecha
  harvest_window: { sprite: 'harvest', growth: 1, fase: 'harvest', etiqueta: 'Lista para cosechar' },
  harvest: { sprite: 'harvest', growth: 1, fase: 'harvest', etiqueta: 'En cosecha' },
  post_harvest: { sprite: 'rest', growth: 0.2, fase: 'rest', etiqueta: 'Descansando' },
  closed: { sprite: 'rest', growth: 0.2, fase: 'rest', etiqueta: 'Ciclo cerrado' },
  fallow: { sprite: 'rest', growth: 0.15, fase: 'rest', etiqueta: 'En descanso' },
  pest_management: { sprite: 'leaf', growth: 0.5, fase: 'leaf', etiqueta: 'En cuidado' },
  // Restauración / silvopastoreo (hitos ecológicos, NO fenología de cultivo)
  establecimiento: { sprite: 'sprout', growth: 0.3, fase: 'sprout', etiqueta: 'Plantada' },
  prendimiento: { sprite: 'leaf', growth: 0.5, fase: 'leaf', etiqueta: 'Pegando raíz' },
  mantenimiento: { sprite: 'tree', growth: 0.7, fase: 'leaf', etiqueta: 'En crecimiento' },
  monitoreo_sucesion: { sprite: 'tree', growth: 0.9, fase: 'fruit', etiqueta: 'Bosque joven' },
  cierre: { sprite: 'tree', growth: 1, fase: 'fruit', etiqueta: 'Bosque firme' },
  // Páramo (conservación)
  delimitacion: { sprite: 'sprout', growth: 0.25, fase: 'sprout', etiqueta: 'Zona delimitada' },
  aislamiento: { sprite: 'leaf', growth: 0.45, fase: 'leaf', etiqueta: 'Protegida' },
  revegetacion_nativa: { sprite: 'flower', growth: 0.75, fase: 'flower', etiqueta: 'Revegetando' },
  monitoreo_hidrico: { sprite: 'tree', growth: 0.95, fase: 'fruit', etiqueta: 'Agua sana' },
});

const DEFAULT_SPRITE = Object.freeze({
  sprite: 'sprout', growth: 0.3, fase: 'sprout', etiqueta: 'En la finca',
});

/**
 * Devuelve el sprite para una etapa fenológica/hito. Tolerante: una etapa
 * desconocida cae a un brote genérico (nunca rompe la escena).
 *
 * @param {string} stage  current_stage del proceso
 * @returns {StageSprite}
 */
export function spriteForStage(stage) {
  if (!stage) return DEFAULT_SPRITE;
  return STAGE_SPRITES[stage] || DEFAULT_SPRITE;
}

// ─── Procesos que son ANIMALES (no plantas) ─────────────────────────────────

/**
 * Mapa de tipo de proceso animal → emoji que lo representa en el corral. Hoy el
 * único ciclo animal modelado es 'pigs'; se deja extensible por si entran aves,
 * bovinos, etc. Silvopastoreo es PLANTA (árboles forrajeros), no animal.
 */
const ANIMAL_EMOJI = Object.freeze({
  pigs: '🐷',
});

/** @param {string} processType @returns {boolean} */
function esProcesoAnimal(processType) {
  return Object.prototype.hasOwnProperty.call(ANIMAL_EMOJI, processType);
}

// ─── Normalización del proceso (anidado .attributes → plano) ────────────────

/**
 * Aplana un FarmProcess al shape plano que esta escena consume. El
 * almacenamiento real guarda los datos bajo `process.attributes`; los tests y
 * llamadas directas pueden pasar el shape plano. No inventa campos.
 *
 * @param {Object} p  FarmProcess (anidado o plano)
 * @returns {Object} { process_id, process_type, subject_label, current_stage, status, location }
 */
function flatten(p) {
  if (!p || typeof p !== 'object') return null;
  const a = p.attributes && typeof p.attributes === 'object' ? p.attributes : p;
  return {
    process_id: p.process_id || a.process_id || null,
    process_type: a.process_type || p.process_type || 'sowing',
    subject_label: a.subject_label || p.subject_label || a.subject_slug || p.subject_slug || null,
    subject_slug: a.subject_slug || p.subject_slug || null,
    current_stage: a.current_stage || p.current_stage || null,
    status: a.status || p.status || 'active',
    location: a.location_zone_id || a.location_land_asset_id
      || p.location_zone_id || p.location_land_asset_id || null,
  };
}

// ─── Vitalidad de la finca (vistazo honesto) ────────────────────────────────

/**
 * Pesos de avance por fase, para una "vitalidad" honesta de la finca. Un
 * cultivo en cosecha o un bosque firme aportan más que una semilla recién
 * puesta — refleja el trabajo invertido, no infla nada. Procesos en descanso
 * (post-cosecha, barbecho) aportan poco: la tierra descansa.
 */
const FASE_PESO = Object.freeze({
  seed: 0.2,
  sprout: 0.4,
  leaf: 0.6,
  flower: 0.8,
  fruit: 0.95,
  harvest: 1,
  rest: 0.25,
});

/**
 * Calcula la vitalidad (0-100) de la finca a partir de sus cultivos activos.
 *
 * Combina DOS señales reales, sin fabricar:
 *   - Avance promedio de los cultivos activos (qué tan adelantados están).
 *   - Diversidad (cuántos cultivos distintos hay), con techo: más cultivos =
 *     finca más viva, pero el aporte de diversidad se satura a ~6 para no
 *     premiar infinitamente el conteo.
 *
 * Sin cultivos activos → 0 (finca por sembrar). Es un INDICADOR DE VISTAZO, no
 * sustituye los indicadores MESMIS/Gliessman de fincaEvolutionService.
 *
 * @param {Array} lotes  lista de lotes ya derivados (de buildFincaScene)
 * @returns {number} 0-100
 */
export function calcularVitalidad(lotes) {
  const activos = Array.isArray(lotes) ? lotes.filter((l) => l.activo) : [];
  if (activos.length === 0) return 0;

  // 1) Avance promedio (peso por fase).
  const sumaAvance = activos.reduce((acc, l) => acc + (FASE_PESO[l.fase] ?? 0.4), 0);
  const avancePromedio = sumaAvance / activos.length; // 0..1

  // 2) Diversidad (cultivos distintos), saturada a 6.
  const distintos = new Set(activos.map((l) => l.subjectSlug || l.id)).size;
  const diversidad = Math.min(distintos, 6) / 6; // 0..1

  // Mezcla: el avance manda (70%), la diversidad complementa (30%).
  const score = avancePromedio * 0.7 + diversidad * 0.3;
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

/** Etiqueta cariñosa y honesta de la vitalidad para mostrar en el home. */
export function etiquetaVitalidad(vitalidad) {
  if (vitalidad <= 0) return 'Tu finca está por sembrar';
  if (vitalidad < 25) return 'Tu finca está empezando';
  if (vitalidad < 50) return 'Tu finca está creciendo';
  if (vitalidad < 75) return 'Tu finca está viva y fuerte';
  return 'Tu finca está floreciendo';
}

// ─── Construcción de la escena ──────────────────────────────────────────────

/**
 * @typedef {Object} SceneLote
 * @property {string} id            id estable (process_id)
 * @property {string} nombre        nombre del cultivo/animal para mostrar
 * @property {string} subjectSlug   slug de especie (para diversidad)
 * @property {boolean} activo       true si el proceso sigue activo
 * @property {boolean} animal       true si es un proceso animal (corral)
 * @property {string} emoji         emoji del animal (solo si animal)
 * @property {string} sprite        id del sprite de planta a dibujar
 * @property {number} growth        0..1 altura/madurez visual
 * @property {string} fase          fase visual (seed/sprout/leaf/flower/fruit/harvest/rest)
 * @property {string} tipo          tipo botánico (frutal/hortaliza/aromatica/otro)
 *                                  para elegir la SILUETA: árbol vs cama de huerta
 *                                  vs mata aromática. Derivado del slug (offline).
 * @property {string} etiquetaEtapa etiqueta corta de la etapa real
 */

/**
 * @typedef {Object} FincaScene
 * @property {boolean} vacia          true si no hay procesos → invitar a sembrar
 * @property {SceneLote[]} lotes      cultivos (plantas) a dibujar en los lotes
 * @property {SceneLote[]} animales   animales a dibujar en el corral
 * @property {number} vitalidad       0-100, vistazo de salud de la finca
 * @property {string} vitalidadLabel  etiqueta cariñosa de la vitalidad
 * @property {number} totalCultivos   conteo de cultivos (max de procesos vs. plantas-asset)
 * @property {number} cultivosActivos conteo de cultivos activos (max procesos vs. plantas-asset)
 * @property {number} enCosecha       cuántos cultivos están listos/en cosecha
 * @property {number} plantAssetsCount conteo real de plantas-asset (fuente "Mis plantas: N")
 * @property {string[]} clima         elementos de clima a dibujar (sol, lluvia)
 * @property {string} resumen         frase de vistazo para el campesino
 */

/**
 * Construye la escena 2D de la finca desde los procesos reales.
 *
 * @param {Object} input
 * @param {Array} [input.processes=[]]   FarmProcess[] (anidados o planos)
 * @param {Object} [input.clima]         clima opcional { lluvia?:boolean, ensoPhase?:string }
 * @param {number} [input.maxLotes=12]   tope de lotes a dibujar (rendimiento gama baja)
 * @param {number} [input.plantAssetsCount=0]  conteo REAL de plantas-activo de la
 *   finca (los ASSETS, p.ej. useAssetStore.plants.length). Fuente de verdad del
 *   "Mis plantas: N" del dashboard. Una finca puede tener decenas de plantas
 *   REGISTRADAS como assets sin que aún exista un FarmProcess (ciclo) para ellas:
 *   en ese caso la escena DEBE poblarse igual (no decir "0 siembras / terreno
 *   listo"). La escena queda vacía SOLO si no hay NI procesos NI plantas-asset.
 *   No fabrica nada: si es 0, el comportamiento es idéntico al anterior.
 * @returns {FincaScene}
 */
export function buildFincaScene({
  processes = [],
  clima = null,
  maxLotes = 12,
  plantAssetsCount = 0,
} = {}) {
  const flat = (Array.isArray(processes) ? processes : [])
    .map(flatten)
    .filter(Boolean);

  // Separar plantas de animales. Cancelados no se dibujan (no son la finca viva).
  const plantas = [];
  const animales = [];
  for (const p of flat) {
    if (p.status === 'cancelled') continue;
    const activo = p.status === 'active';
    if (esProcesoAnimal(p.process_type)) {
      animales.push({
        id: p.process_id,
        nombre: p.subject_label || 'Animales',
        subjectSlug: p.subject_slug || p.process_type,
        activo,
        animal: true,
        emoji: ANIMAL_EMOJI[p.process_type],
        sprite: 'animal',
        growth: 1,
        fase: 'leaf',
        etiquetaEtapa: spriteForStage(p.current_stage).etiqueta,
      });
      continue;
    }
    const s = spriteForStage(p.current_stage);
    const nombre = p.subject_label || 'Cultivo';
    plantas.push({
      id: p.process_id,
      nombre,
      subjectSlug: p.subject_slug || p.process_id,
      activo,
      animal: false,
      emoji: '',
      sprite: s.sprite,
      growth: s.growth,
      fase: s.fase,
      // Tipo botánico para la silueta correcta (frutal=árbol, hortaliza=cama,
      // aromatica=mata). Offline, derivado del slug + nombre (subjectTipo).
      tipo: tipoDeSubject(p.subject_slug, { nombre }),
      etiquetaEtapa: s.etiqueta,
    });
  }

  // Conteo REAL de plantas-asset (saneado): la fuente de verdad del "Mis plantas:
  // N" del dashboard. Una finca con plantas REGISTRADAS pero sin FarmProcess aún
  // NO está vacía — tiene siembras reales que la escena debe poblar.
  const plantasAssetCount = Number.isFinite(plantAssetsCount) && plantAssetsCount > 0
    ? Math.floor(plantAssetsCount)
    : 0;

  // Vacía SOLO si no hay NI procesos (plantas/animales) NI plantas-asset. Con
  // plantas-asset reales la escena se puebla aunque no haya ningún proceso —
  // deflección honesta: nunca decimos "terreno listo / 0 siembras" si el
  // usuario sí tiene plantas registradas.
  const vacia = plantas.length === 0 && animales.length === 0 && plantasAssetCount === 0;

  // Ordenar para que los más maduros/cosecha queden adelante (más visibles).
  plantas.sort((a, b) => (b.growth - a.growth) || a.id.localeCompare(b.id));

  const lotesDibujados = plantas.slice(0, maxLotes);
  const vitalidad = calcularVitalidad(plantas);
  const cultivosActivosProc = plantas.filter((p) => p.activo).length;
  const enCosecha = plantas.filter((p) => p.activo && (p.fase === 'harvest' || p.fase === 'fruit')).length;

  // totalCultivos / cultivosActivos honran la fuente real más completa: si hay
  // más plantas-asset registradas que procesos, ese conteo manda (cada planta es
  // una siembra real). Sin plantas-asset, queda el conteo por proceso de siempre.
  const totalCultivos = Math.max(plantas.length, plantasAssetCount);
  const cultivosActivos = Math.max(cultivosActivosProc, plantasAssetCount);

  return /** @type {any} */ ({
    vacia,
    lotes: lotesDibujados,
    animales: animales.slice(0, 4),
    vitalidad,
    vitalidadLabel: etiquetaVitalidad(vitalidad),
    totalCultivos,
    cultivosActivos,
    enCosecha,
    plantAssetsCount: plantasAssetCount,
    clima: derivarClima(clima),
    resumen: construirResumen({ vacia, cultivosActivos, enCosecha, animales }),
  });
}

/**
 * Deriva qué elementos de clima dibujar. Sin datos de clima → solo sol (estado
 * por defecto cálido). Con lluvia → agregar nubes de lluvia. No fabrica clima:
 * si no se le pasa, no inventa una tormenta.
 *
 * @param {Object|null} clima  { lluvia?:boolean, ensoPhase?:string }
 * @returns {string[]}  ['sol'] | ['sol','lluvia'] | ...
 */
function derivarClima(clima) {
  const out = ['sol'];
  if (!clima || typeof clima !== 'object') return out;
  if (clima.lluvia === true) out.push('lluvia');
  // ENSO: 'la_nina' tiende a más lluvia; 'el_nino' a sequía/sol fuerte.
  if (clima.ensoPhase === 'la_nina' && !out.includes('lluvia')) out.push('lluvia');
  return out;
}

/**
 * Frase de vistazo para el campesino: clara y útil, no infantil. La niña ve la
 * escena; el adulto lee esta línea y sabe el estado de SU finca.
 */
function construirResumen({ vacia, cultivosActivos, enCosecha, animales }) {
  if (vacia) return 'Tu finca está esperando tu primera siembra.';
  const partes = [];
  if (cultivosActivos === 1) partes.push('1 cultivo activo');
  else if (cultivosActivos > 1) partes.push(`${cultivosActivos} cultivos activos`);
  if (enCosecha === 1) partes.push('1 listo para cosechar');
  else if (enCosecha > 1) partes.push(`${enCosecha} listos para cosechar`);
  if (animales.length === 1) partes.push('1 grupo de animales');
  else if (animales.length > 1) partes.push(`${animales.length} grupos de animales`);
  if (partes.length === 0) return 'Tu finca está en marcha.';
  return partes.join(' · ');
}
