/**
 * ensoCanal — CANAL PROPIO PARA ENSO/NIÑO, con rotación de hechos.
 *
 * Canal prioritario específico para mensajes del Fenómeno del Niño / Oscilación
 * del Sur (ENSO), independiente del canal genérico de clima. Implementa:
 *   - Canal propio priorizado (no fallback a genéricos de cultivo/piso térmico)
 *   - Rotación de hechos para no repetir el mismo mensaje ENSO
 *   - Mensajes regionales específicos por fase (El Niño, La Niña, Vigilancia)
 *
 * REGLA DURA: cero invención de datos climáticos. Este módulo NO predice el
 * clima ni fabrica probabilidades — solo traduce la fase ENSO (que viene del
 * servicio ensoService / sidecar) a mensajes contextualizados por región.
 *
 * Uso típico (ejemplo en proactiveGreeting o angelitaInteligencia):
 *   ```js
 *   import { mensajeEnsoPrioritario, rotarHechoEnso } from './ensoCanal';
 *
 *   const fase = ensoService.getEnsoPhase(); // 'el_nino' | 'la_nina' | 'neutral'
 *   const region = regionFromProfile(profile); // 'andina' | 'caribe' | ...
 *   const indice = ultimaEnsoIdx || 0; // índice de rotación (persistido)
 *   const mensaje = mensajeEnsoPrioritario({ fase, region, indice });
 *
 *   if (mensaje) {
 *     // Canal ENSO activado — tiene prioridad sobre genéricos
 *     return { lead: mensaje, channel: 'enso', nextIdx: rotarHechoEnso(fase, region, indice) };
 *   }
 *   // fallback a otros canales (cultivos, piso térmico, etc.)
 *   ```
 *
 * @module compai/nucleo/ensoCanal
 */

/**
 * Familia de fase ENSO normalizada.
 * @typedef {'nino'|'nina'|'neutral'} EnsoFamily
 */

/**
 * Regiones naturales de Colombia (mismo mapping que ensoContext).
 * @typedef {'andina'|'caribe'|'pacifico'|'orinoquia'|'amazonia'|null} Region
 */

/**
 * @typedef {Object} MensajeEnso
 * @property {string} mensaje — texto en usted, colombiano, sin voseo.
 * @property {string} fuente — 'NOAA CPC · IDEAM' o variante.
 * @property {('nino'|'nina'|'neutral')} family — fase normalizada.
 * @property {number} nextIdx — siguiente índice de rotación (para persistir).
 */

/* ─────────────────────────────────────────────────────────────────────────────
 * 1. HECHOS ENSO POR REGIÓN — múltiples hechos rotacionales por fase.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Hechos documentados por fase ENSO y región. Cada región tiene un array de
 * hechos rotacionales (2-3 hechos distintos) para evitar repetición.
 *
 * Los hechos están respaldados por:
 *   - DR-MISSION-2 (Fenómeno del Niño Colombia 2026-27, NOAA/IDEAM)
 *   - DR-MISSION-3 (ENSO ciclo completo Colombia)
 *   - DR-MISSION-4 (Impactos regionales del cambio climático)
 */
const HECHOS_ENSO = Object.freeze({
  andina: {
    nino: [
      'El Niño en los Andes trae menos lluvia y más días calurosos. Ojo: en el altiplano frío la pérdida de calor nocturna dispara MÁS heladas, no menos — el Niño 2015-16 costó cerca de 25.000 toneladas de papa.',
      'Con El Niño seco que viene, prioriza riego eficiente y mulch para tus cultivos. En el altiplano, reserva agua para riego nocturno anti-helada — los cielos despejados del Niño congelan más.',
      'Temporada de El Niño: en la zona cafetera prepara sombrío y cobertura para amortiguar el calor que se espera. En papa de altura, vigila las noches despejadas — aumenta el riesgo de helada radiativa.',
    ],
    nina: [
      'La Niña en los Andes trae más lluvia, suelos sobresaturados y mayor riesgo de deslizamientos en ladera. Revisa tus drenajes y evita siembras en zonas anegables.',
      'Con La Niña lluviosa, vigila enfermedades fúngicas en papa y café (mildiu, gota, roya). Refuerza la circulación de aire entre plantas y evita densidad excesiva.',
      'Temporada de La Niña: refuerza drenajes agroecológicos y camas altas para encharcamiento. En ladera, cuidado con deslizamientos — la lluvia intensa es el riesgo dominante.',
    ],
    vigilancia: [
      'Vigilancia de Niño: en piso frío reserva agua para riego nocturno anti-helada; en café/cacao templado prepara sombrío y mulch para amortiguar el calor que se espera si entra el Niño.',
      'Vigilancia de El Niño: buena época para ordenar tu finca. Captación y almacenamiento de agua lluvia mientras todavía hay; agroforestería seca para conservar humedad.',
      'Vigilancia ENSO: fase neutral con probabilidad creciente de El Niño hacia el trimestre dic-feb. Conviene prepararse ahora — riego eficiente, mulch y sombrío.',
    ],
  },
  caribe: {
    nino: [
      'El Niño agrava la sequía estructural del Caribe: déficit hídrico crónico en La Guajira, Cesar y Magdalena. Estrés severo para banano, arroz de riego y ganadería — prioriza ahorro de agua.',
      'Con El Niño seco que viene, prioriza captación y almacenamiento de agua lluvia AHORA, mientras todavía hay. Mulch y agroforestería seca para conservar humedad en el suelo.',
      'Temporada de El Niño en el Caribe: cuidado con el estrés hídrico en tus cultivos y ganado. Optimiza riego y busca cultivos tolerantes a sequía para reducir vulnerabilidad.',
    ],
    nina: [
      'La Niña en el Caribe trae lluvias intensas e inundación en planicie. Revisa drenajes y evita siembras en zonas anegables — el exceso de agua es el riesgo dominante.',
      'Con La Niña lluviosa, vigila encharcamiento en arroz de riego y banano. Refuerza canales de drenaje y planifica siembras en zonas altas dentro de tu finca.',
      'Temporada de La Niña: refuerza drenajes y camas altas para manejar exceso de agua. En zonas inundables, considera cultivos tolerantes a saturación.',
    ],
    vigilancia: [
      'Vigilancia de Niño: prioriza captación y almacenamiento de agua lluvia ahora, mientras todavía llueve. Mulch y agroforestería seca para conservar humedad.',
      'Vigilancia de El Niño: buena época para mejorar tu infraestructura hídrica. Captación de agua lluvia y sistemas de riego eficiente.',
      'Vigilancia ENSO: fase neutral con probabilidad creciente de El Niño hacia el trimestre dic-feb. En el Caribe, conviene prepararse para sequía con anticipación.',
    ],
  },
  pacifico: {
    nino: [
      'El Niño reduce algo la lluvia extrema habitual del Pacífico, pero el bosque húmedo sigue siendo muy lluvioso. El riesgo dominante sigue siendo exceso de agua y erosión.',
      'Con El Niño, el Pacífico sigue siendo lluvioso pero con menos extremos. Aprovecha para reforzar prácticas anti-erosión: camas en contorno, barreras vivas y cobertura permanente.',
      'Temporada de El Niño en el Pacífico: manejo de exceso de agua sigue siendo la prioridad. Drenajes agroecológicos y camas altas para laderas.',
    ],
    nina: [
      'La Niña intensifica lluvias ya extremas en el Pacífico: erosión, deslizamiento y pérdida de cosecha en ladera. Refuerza drenajes agroecológicos URGENTE.',
      'Con La Niña lluviosa que viene, vigila laderas y cauces. Refuerza barreras vivas, zanjas de infiltración y todo lo que frene escorrentía violenta.',
      'Temporada de La Niña en el Pacífico: riesgo máximo de erosión y deslizamiento. Planifica siembras en contorno y refuerza estructuras de retención de agua.',
    ],
    vigilancia: [
      'Vigilancia de Niño: el manejo de exceso de agua (drenajes, camas altas) sigue siendo la prioridad en el Pacífico aunque entre el Niño.',
      'Vigilancia: buen momento para reforzar infraestructura anti-erosión. Barreras vivas, zanjas de infiltración y cobertura permanente.',
      'Vigilancia ENSO: fase neutral con probabilidad creciente de El Niño. En el Pacífico, prepara infraestructura para manejo de exceso de agua.',
    ],
  },
  orinoquia: {
    nino: [
      'El Niño exacerba la estación seca de la sabana: mayor recorrente de incendios y estrés en pasturas. Cuidado con el fuego descontrolado — planifica fuego prescrito y rondas cortafuego.',
      'Con El Niño seco que viene, prioriza sistemas silvopastoriles para sombra del ganado y conservación de humedad en pasturas. Planifica fuego prescrito antes de la temporada seca.',
      'Temporada de El Niño en Orinoquía: riesgo alto de incendios. Organiza rondas cortafuego, prepara puntos de agua y evita quemas no controladas.',
    ],
    nina: [
      'La Niña alarga la temporada de lluvias y el encharcamiento en sabana inundable. Evita siembras en zonas bajas y refuerza drenajes naturales.',
      'Con La Niña lluviosa, vigila pasturas saturadas y riesgo de inundación. Planifica zonas altas para refugio del ganado y cultivos tolerantes a encharcamiento.',
      'Temporada de La Niña en Orinoquía: exceso de agua en sabana. Camas altas, drenajes y cultivos adaptados a saturación temporal.',
    ],
    vigilancia: [
      'Vigilancia de Niño: planifica fuego prescrito y rondas cortafuego antes de la temporada seca; sistemas silvopastoriles para sombra.',
      'Vigilancia: buena época para organizar defensa contra incendios. Cortafuegos, puntos de agua y plan de evacuación del ganado.',
      'Vigilancia ENSO: fase neutral con probabilidad creciente de El Niño. En sabana, conviene prepararse para temporada seca intensa.',
    ],
  },
  amazonia: {
    nino: [
      'El Niño trae sequías inusuales a la Amazonía colombiana, estresa la chagra tradicional y aumenta el riesgo de incendio — protege la chagra de quema accidental y diversifica para resiliencia.',
      'Con El Niño seco que viene, prioriza conservación de bosque y diversificación de cultivos. La chagra tradicional se resiste mejor si diversifica y evita monocultivos.',
      'Temporada de El Niño en Amazonía: riesgo de sequía e incendio. Evita quemas, prepara sistemas de captación de agua y refuerza la chagra diversificada.',
    ],
    nina: [
      'La Niña mantiene o aumenta la humedad amazónica; el riesgo es exceso de agua en vega de río. Evita siembras en zonas inundables y refuerza camas altas.',
      'Con La Niña lluviosa, vigila saturación en vegas de río. Planifica cultivos en zonas altas y refuerza drenajes naturales.',
      'Temporada de La Niña en Amazonía: exceso de agua en zonas bajas. Camas altas, drenajes y cultivos adaptados a humedad permanente.',
    ],
    vigilancia: [
      'Vigilancia de Niño: protege la chagra de quema accidental y diversifica para resiliencia ante sequía corta.',
      'Vigilancia: buena época para organizar la chagra diversificada. Sistemas agroforestales más resistentes a variabilidad climática.',
      'Vigilancia ENSO: fase neutral con probabilidad creciente de El Niño. En Amazonía, conviene fortalecer resiliencia ante sequías cortas.',
    ],
  },
});

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. MENSAJES GENÉRICOS (fallback sin región específica).
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Hechos genéricos por fase ENSO cuando no hay región identificada.
 */
const HECHOS_GENERICOS = Object.freeze({
  nino: [
    'El Niño activo: espera más calor y menos lluvia. Prioriza riego eficiente, mulch y sombrío para proteger tus cultivos.',
    'Con El Niño seco que viene, optimiza el uso de agua. Riego por goteo, cobertura permanente y sistemas agroforestales te ayudan a resistir.',
    'Temporada de El Niño: reduce vulnerabilidad a sequía. Captación de agua lluvia, mulch y cultivos tolerantes a sequía son tus mejores aliados.',
  ],
  nina: [
    'La Niña activa: espera más lluvia. Revisa drenajes y vigila enfermedades fúngicas en tus cultivos — el exceso de agua es el riesgo principal.',
    'Con La Niña lluviosa que viene, refuerza drenajes agroecológicos. Camas altas y canales de desagüe te ayudan a manejar el exceso de agua.',
    'Temporada de La Niña: prepara tu finca para lluvias intensas. Drenajes, barreras vivas y cultivos tolerantes a saturación reducen pérdidas.',
  ],
  vigilancia: [
    'Vigilancia de El Niño: probabilidad creciente de transición hacia dic-feb. Conviene preparar manejo de sequía y calor con anticipación.',
    'Vigilancia ENSO: buena época para mejorar infraestructura hídrica y prepararse. Riego eficiente, mulch y sombrío son buenas inversiones ahora.',
    'Vigilancia ENSO: fase neutral con probabilidad de El Niño. Ajusta tu calendario agrícola y prepara estrategias para variabilidad climática.',
  ],
});

/* ─────────────────────────────────────────────────────────────────────────────
 * 3. FUNCIONES PÚBLICAS — canal prioritario y rotación.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Normaliza una fase ENSO a familia corta.
 * @param {string} phase — fase del servicio (ej. 'el_nino', 'la_nina', 'neutral')
 * @returns {EnsoFamily}
 */
export function ensoFamily(phase) {
  if (typeof phase !== 'string') return 'neutral';
  const normalized = phase.toLowerCase().replace(/[^a-z_]/g, '');
  if (normalized.includes('nino')) return 'nino';
  if (normalized.includes('nina')) return 'nina';
  return 'neutral';
}

/**
 * Devuelve el array de hechos para una familia y región.
 * @param {EnsoFamily} family
 * @param {Region} region
 * @returns {Array<string>} array de hechos (vacío si no hay datos)
 */
function hechosParaFamilyRegion(family, region) {
  // Para fase neutral, usamos 'vigilancia' como clave en los datos
  const dataKey = family === 'neutral' ? 'vigilancia' : family;

  if (!HECHOS_ENSO[region]) return HECHOS_GENERICOS[dataKey] || [];
  const hechosRegion = HECHOS_ENSO[region][dataKey];
  return Array.isArray(hechosRegion) && hechosRegion.length > 0
    ? hechosRegion
    : HECHOS_GENERICOS[dataKey] || [];
}

/**
 * Devuelve un mensaje ENSO prioritario si hay fase activa (no neutral genérico).
 * El mensaje está contextualizado por región y rotado según el índice.
 *
 * @param {Object} opts
 * @param {string} [opts.fase='neutral'] — fase del servicio ensoService.getEnsoPhase()
 * @param {Region} [opts.region=null] — región desde ensoContext.regionFromProfile()
 * @param {number} [opts.indice=0] — índice de rotación (0, 1, 2...)
 * @returns {MensajeEnso|null} null si fase neutral sin vigilancia significativa.
 */
export function mensajeEnsoPrioritario({ fase = 'neutral', region = null, indice = 0 } = {}) {
  const family = ensoFamily(fase);
  
  // En fase neutral, solo mostramos si hay algo que decir (vigilancia con
  // probabilidad significativa). Esta función asume que el caller ya filtró
  // si debe mostrar ENSO — aquí solo construimos el mensaje rotacional.
  if (family === 'neutral') {
    const hechos = hechosParaFamilyRegion('vigilancia', region);
    if (hechos.length === 0) return null;
    
    const idx = Math.max(0, Math.min(indice, hechos.length - 1));
    return {
      mensaje: hechos[idx],
      fuente: 'NOAA CPC · IDEAM',
      family: 'neutral',
      nextIdx: rotarHechoEnso(fase, region, indice),
    };
  }

  // Fase activa (El Niño o La Niña)
  const hechos = hechosParaFamilyRegion(family, region);
  if (hechos.length === 0) return null;

  const idx = Math.max(0, Math.min(indice, hechos.length - 1));
  return {
    mensaje: hechos[idx],
    fuente: 'NOAA CPC · IDEAM',
    family,
    nextIdx: rotarHechoEnso(fase, region, indice),
  };
}

/**
 * Calcula el siguiente índice de rotación para evitar repetición.
 * Avanza cíclicamente dentro del array de hechos disponibles.
 *
 * @param {string} fase
 * @param {Region} region
 * @param {number} indiceActual
 * @returns {number} siguiente índice (0, 1, 2...)
 */
export function rotarHechoEnso(fase, region, indiceActual = 0) {
  const family = ensoFamily(fase);
  const hechos = hechosParaFamilyRegion(family, region);
  const maxIdx = Math.max(0, hechos.length - 1);

  if (maxIdx <= 0) return 0; // Solo un hecho disponible o ninguno

  const siguiente = indiceActual + 1;
  return siguiente > maxIdx ? 0 : siguiente;
}

/**
 * Devuelve un mensaje de vigilancia ENSO (fase neutral con probabilidad).
 * Úsalo cuando el feed reporta neutral pero hay un Watch significativo.
 *
 * @param {Object} opts
 * @param {Region} [opts.region=null]
 * @param {number} [opts.indice=0]
 * @param {number} [opts.probabilidadNino=null] — % de transición a El Niño
 * @returns {MensajeEnso|null}
 */
export function mensajeEnsoVigilancia({ region = null, indice = 0, probabilidadNino = null } = {}) {
  const hechos = hechosParaFamilyRegion('vigilancia', region);
  if (hechos.length === 0) return null;

  const idx = Math.max(0, Math.min(indice, hechos.length - 1));
  let mensaje = hechos[idx];

  // Si hay probabilidad específica, la tejemos
  if (typeof probabilidadNino === 'number' && probabilidadNino >= 50) {
    mensaje = `Probabilidad aprox. ${probabilidadNino}% de El Niño hacia dic-feb. ${mensaje}`;
  }

  return {
    mensaje,
    fuente: 'NOAA CPC · IRI / IDEAM',
    family: 'neutral',
    nextIdx: rotarHechoEnso('neutral', region, indice),
  };
}

/**
 * Predicado: ¿hay mensaje ENSO prioritario para mostrar?
 * Útil para filtrar antes de llamar a mensajeEnsoPrioritario.
 *
 * @param {Object} opts
 * @param {string} [opts.fase='neutral']
 * @param {Region} [opts.region=null]
 * @returns {boolean}
 */
export function hayMensajeEnso({ fase = 'neutral', region = null } = {}) {
  const family = ensoFamily(fase);
  if (family === 'neutral') {
    // Solo si hay hechos de vigilancia disponibles
    const hechos = hechosParaFamilyRegion('vigilancia', region);
    return hechos.length > 0;
  }
  // Fase activa: verificar si hay hechos específicos o genéricos
  const hechos = hechosParaFamilyRegion(family, region);
  return hechos.length > 0;
}

export default {
  mensajeEnsoPrioritario,
  mensajeEnsoVigilancia,
  rotarHechoEnso,
  hayMensajeEnso,
  ensoFamily,
};
