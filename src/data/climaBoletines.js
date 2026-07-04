/**
 * climaBoletines.js — CONTENIDO del módulo "El clima que viene" (traductor de
 * boletines IDEAM/ENSO).
 *
 * POSICIONAMIENTO (grounding 2026-07-04, Parte B): Chagra NO reemplaza al IDEAM
 * ni pronostica el clima. Es el TRADUCTOR CAMPESINO de los boletines oficiales:
 * lee la FASE ENSO en vivo (ensoService, alimentado por el sidecar NOAA/IDEAM),
 * la explica en palabras de finca y REMITE al boletín de la Mesa Técnica
 * Agroclimática (MTA) departamental y a Fenalce para la ventana de siembra.
 *
 * REGLA ANTI-ALUCINACIÓN: este archivo solo contiene conocimiento DURABLE y
 * citado (qué significa cada fase ENSO, la regla agronómica institucional, el
 * catálogo de boletines oficiales). NADA de pronósticos concretos: esos CADUCAN
 * y se leen del boletín vigente. Las cifras coyunturales (probabilidades, mm por
 * municipio) son SLOTS grounded-pendiente que se remiten a la fuente, no se
 * inventan aquí.
 *
 * Fuentes (ver deepresearch/2026-07-04-cultivos-clima-nacional-CO.md, Parte B):
 *   IDEAM [R32-R37], FAO/MADR Mesas Técnicas Agroclimáticas [R38-R40],
 *   Fenalce agroclimatología [R41-R42], impactos ENSO [R32-R35].
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/* ── Pilares del módulo (pestañas) ────────────────────────────────────── */
export const PILARES_CLIMA = [
  { id: 'que_viene', titulo: '¿Qué viene?', descripcion: 'El estado del clima ahora' },
  { id: 'que_hacer', titulo: 'Qué hacer', descripcion: 'Según la fase' },
  { id: 'donde_mirar', titulo: 'Dónde mirar', descripcion: 'Los boletines' },
];

/* ── PILAR 1 · ¿Qué viene? — lectura de cada fase ENSO ─────────────────── */
/**
 * Qué significa cada fase del ciclo ENSO para la finca. Conocimiento durable y
 * citado (IDEAM, Fenalce). Se cruza con la fase EN VIVO de ensoService — aquí
 * NO se decide qué fase es, solo qué implica.
 * Clave = familia ENSO de ensoContext.ensoFamily: 'nino' | 'nina' | 'neutral'.
 */
export const LECTURA_ENSO = Object.freeze({
  nino: {
    titulo: 'El Niño: más sol, menos lluvia',
    resumen:
      'En fase El Niño el país tiende a llover menos y calentar más. Sube el riesgo de sequía, de incendio y de que el agua no alcance para el riego.',
    senales: [
      'Aguaceros más tardíos o más flojos de lo normal.',
      'Días más calurosos y quebradas con menos caudal.',
      'En el altiplano frío, cielo despejado de noche = más riesgo de helada.',
    ],
    regla:
      'Siembre material PRECOZ y de MENOR necesidad de agua. Guarde agua desde ya y refuerce el riego.',
    fuente: 'IDEAM · Fenalce (boletín ENSO)',
  },
  nina: {
    titulo: 'La Niña: más lluvia',
    resumen:
      'En fase La Niña llueve más de lo normal. El problema pasa a ser el EXCESO de agua: encharcamiento, hongos y enfermedades en la mata.',
    senales: [
      'Lluvias más largas y fuertes; suelos que no alcanzan a secar.',
      'Más gota, mildiu y hongos en papa, café y hortalizas.',
      'Riesgo de deslizamiento en ladera y de anegar el lote.',
    ],
    regla:
      'Prepare el DRENAJE y las camas altas. Vigile hongos y cuide maíz, fríjol y soya, que sufren con el agua parada.',
    fuente: 'IDEAM · Fenalce (boletín ENSO)',
  },
  neutral: {
    titulo: 'Neutral: ni Niño ni Niña marcados',
    resumen:
      'El ciclo ENSO está en fase neutral: el clima sigue el patrón normal de su región (dos temporadas de lluvia en los Andes, una en llanos y Caribe). Es el momento de planear con calma.',
    senales: [
      'Lluvias dentro de lo esperado para la época.',
      'Buen momento para revisar el calendario de siembra por región.',
      'Conviene mirar si el IDEAM anuncia vigilancia de Niño o de Niña.',
    ],
    regla:
      'Siembre al ritmo normal de su región, apenas se estabilicen las primeras lluvias. Mantenga el ojo en el boletín por si cambia la fase.',
    fuente: 'IDEAM (boletín de seguimiento ENSO)',
  },
});

/* ── PILAR 2 · Qué hacer — acciones por fase ENSO ─────────────────────── */
/**
 * Medidas accionables por fase. Regla institucional del grounding [R34][R42]:
 *   El Niño → materiales precoces y de menor demanda hídrica; reforzar agua.
 *   La Niña → manejo de exceso de agua, drenaje y enfermedades.
 */
export const ACCIONES_ENSO = Object.freeze({
  nino: [
    { emoji: '🌱', titulo: 'Variedad precoz', detalle: 'Elija material que madure rápido y aguante seco: menos días en el lote, menos exposición a la sequía.' },
    { emoji: '💧', titulo: 'Guarde agua desde ya', detalle: 'Coseche lluvia mientras todavía cae y cuide el nacimiento. En verano cada caneca cuenta.' },
    { emoji: '🌾', titulo: 'Mulch y sombrío', detalle: 'Cubra el suelo con hojarasca o pasto seco para que no se le vaya la humedad. En café/cacao, sombrío.' },
    { emoji: '🔥', titulo: 'Ojo con el fuego', detalle: 'Con todo seco, una quema se sale de control fácil. Haga rondas cortafuego y evite quemar.' },
  ],
  nina: [
    { emoji: '🚰', titulo: 'Drenaje al día', detalle: 'Destape zanjas y canales antes del aguacero. Agua parada pudre la raíz.' },
    { emoji: '🛏️', titulo: 'Camas altas', detalle: 'Siembre en eras levantadas para que la mata no quede con los pies en el barro.' },
    { emoji: '🍄', titulo: 'Vigile hongos', detalle: 'Con humedad se disparan gota, mildiu y roya. Revise seguido y actúe temprano.' },
    { emoji: '⛰️', titulo: 'Cuide la ladera', detalle: 'En pendiente, barreras vivas y coberturas para que la lluvia no le lave el suelo.' },
  ],
  neutral: [
    { emoji: '🗓️', titulo: 'Siembre a tiempo', detalle: 'Arranque apenas se estabilicen las primeras lluvias de su región; no adelante ni atrase por costumbre.' },
    { emoji: '📻', titulo: 'Siga el boletín', detalle: 'Revise el boletín ENSO del IDEAM: si empieza vigilancia de Niño o de Niña, ajuste el plan.' },
    { emoji: '🌱', titulo: 'Diversifique', detalle: 'Mezclar variedades y ciclos reparte el riesgo si el clima cambia a mitad de temporada.' },
    { emoji: '💧', titulo: 'Deje lista el agua', detalle: 'Tenga el sistema de riego y de cosecha de lluvia a punto para cualquiera de los dos escenarios.' },
  ],
});

/**
 * La regla accionable insignia del grounding, resumida en una línea por fase.
 * La usa el encabezado del pilar "Qué hacer".
 */
export const REGLA_INSIGNIA = Object.freeze({
  nino: 'El Niño → material PRECOZ y de MENOR necesidad de agua.',
  nina: 'La Niña → manejo del EXCESO de agua: drenaje y enfermedades.',
  neutral: 'Neutral → siembre al ritmo normal de su región y siga el boletín.',
});

/* ── PILAR 3 · Dónde mirar — catálogo de boletines oficiales ──────────── */
/**
 * Los productos oficiales que Chagra ayuda a leer (no reemplaza). Cada uno con
 * su frecuencia, para qué sirve y dónde consultarlo. URLs de fuentes públicas
 * institucionales (IDEAM / MADR-FAO / Fenalce).
 */
export const BOLETINES_IDEAM = Object.freeze([
  {
    id: 'agrometeorologico',
    nombre: 'Boletín Agrometeorológico',
    frecuencia: 'semanal',
    para: 'El tiempo de los próximos 7 días por departamento: para decidir labores, riego y qué día no llueve.',
    emisor: 'IDEAM',
    url: 'https://www.pronosticosyalertas.gov.co',
  },
  {
    id: 'agroclimatico',
    nombre: 'Boletín Agroclimático Nacional',
    frecuencia: 'mensual',
    para: 'Predicción del trimestre que viene con recomendaciones por cultivo. Lo hace la Mesa Técnica Agroclimática (MADR + FAO + IDEAM).',
    emisor: 'IDEAM · MADR · FAO',
    url: 'https://www.pronosticosyalertas.gov.co',
  },
  {
    id: 'enso',
    nombre: 'Boletín de seguimiento del ciclo ENSO',
    frecuencia: 'mensual',
    para: 'La fase oficial El Niño / La Niña / Neutral vigente. Es la fuente de verdad de "qué viene".',
    emisor: 'IDEAM',
    url: 'https://www.ideam.gov.co',
  },
]);

/**
 * Mesas Técnicas Agroclimáticas (MTA): infraestructura institucional existente
 * (8 mesas, 36 cultivos, ~631.000 productores) [R38]. Chagra REMITE a la MTA
 * del departamento del usuario para la ventana de siembra local.
 */
export const MTA_INFO = Object.freeze({
  titulo: 'Mesa Técnica Agroclimática (MTA)',
  descripcion:
    'Reunión trimestral donde científicos, técnicos y campesinos leen juntos el pronóstico y sacan las medidas por cultivo para cada departamento. De ahí sale el Boletín Agroclimático de su región.',
  coordinacion: 'MADR + FAO + IDEAM, con ICA, AGROSAVIA, Cenicafé y los gremios.',
  fuente: 'FAO Colombia · MADR (Mesas Técnicas Agroclimáticas)',
});

/**
 * Nombre humano de la mesa/boletín por región natural (para remitir según el
 * perfil). La región se infiere con ensoContext.regionFromProfile.
 */
export const MTA_POR_REGION = Object.freeze({
  andina: 'Mesa Técnica Agroclimática de la región Andina',
  caribe: 'Mesa Técnica Agroclimática del Caribe',
  pacifico: 'Mesa Técnica Agroclimática del Pacífico',
  orinoquia: 'Mesa Técnica Agroclimática de la Orinoquía',
  amazonia: 'Mesa Técnica Agroclimática de la Amazonía',
});

/** Fenalce: pronóstico a 3 meses para cereales y leguminosas [R41][R42]. */
export const FENALCE_INFO = Object.freeze({
  titulo: 'Fenalce — agroclimatología',
  descripcion:
    'Si siembra maíz, fríjol, soya, sorgo o arveja, Fenalce anticipa el clima a 3 meses por región y recomienda semilla, fecha de siembra y manejo del agua.',
  url: 'https://www.fenalce.co/areas-estrategicas/agroclimatologia-y-agrometereologia/',
  fuente: 'Fenalce (área de agroclimatología y agrometeorología)',
});

/**
 * Lluvia mensual por municipio (mm) — SLOT grounded-pendiente. Igual que el
 * módulo de agua: llega por el pipeline de clima (IDEAM por estación/municipio).
 * Mientras tanto, el módulo REMITE al boletín, no inventa el número.
 */
export const LLUVIA_MENSUAL_ZONA = Object.freeze({
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'IDEAM — promedios mensuales de precipitación por municipio (pipeline clima Chagra)',
});

/**
 * Probabilidad de transición de fase (%) por trimestre — SLOT grounded-pendiente
 * en producción: CADUCA. El respaldo estático vive en ensoContext.ENSO_WATCH_2026;
 * el número vigente se lee del boletín ENSO, no se cachea aquí.
 */
export const PROBABILIDAD_TRANSICION = Object.freeze({
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'IDEAM / NOAA CPC — boletín ENSO vigente (las probabilidades caducan)',
});
