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
    nombre: 'Boletín Semanal para el Sector Agrícola (BSA)',
    frecuencia: 'semanal',
    para: 'El pronóstico de lluvia de la semana por departamento: para decidir labores, riego y qué día no llueve. Sale los lunes.',
    emisor: 'IDEAM',
    url: 'http://www.ideam.gov.co/web/sala-de-prensa/boletin-semanal-para-el-sector-agricola-bsa',
  },
  {
    id: 'agroclimatico',
    nombre: 'Boletín Agroclimático Nacional',
    frecuencia: 'mensual',
    para: 'Predicción del trimestre que viene con recomendaciones por cultivo. Lo hace la Mesa Técnica Agroclimática (MADR + FAO + IDEAM).',
    emisor: 'IDEAM · MADR · FAO',
    url: 'http://www.ideam.gov.co/web/tiempo-y-clima/boletin-agroclimatico-nacional',
  },
  {
    id: 'enso',
    nombre: 'Predicción climática · seguimiento ENSO',
    frecuencia: 'mensual',
    para: 'La fase oficial El Niño / La Niña / Neutral vigente y el pronóstico del mes. Es la fuente de verdad de "qué viene".',
    emisor: 'IDEAM',
    url: 'http://www.ideam.gov.co/web/tiempo-y-clima/prediccion-climatica',
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

/* ── FUENTES EN VIVO (mirror de fuentes-vivas.json / dr-clima-refresh.sh) ──
 *
 * URLs oficiales de SECCIÓN: cada una LISTA el boletín vigente de su tipo, así
 * que enlazar aquí = enlazar a lo ÚLTIMO EN VIVO, no a un snapshot. Es el espejo
 * en la app de `Chagra-strategy/ops/deepresearch/clima-latest/fuentes-vivas.json`,
 * que el timer `dr-clima-refresh.sh` (systemd-user, semanal) mantiene fresco.
 * NO son deep-links a un PDF fechado a propósito: un PDF caduca, la sección no.
 *
 * Verificadas contra el cross-check DR 2026-08-23 (2026-08-23-MTA-andina-
 * ventana-siembra.md, reconciliación §1: "las URLs de IDEAM y UPRA son correctas
 * y relevantes"). NOAA ONI ya venía verificada HTTP 200 en institutionalSources.
 */
export const FUENTES_VIVAS = Object.freeze({
  actualizado: '2026-08-23',
  ideam_prediccion_climatica: 'http://www.ideam.gov.co/web/tiempo-y-clima/prediccion-climatica',
  ideam_agroclimatico_nacional: 'http://www.ideam.gov.co/web/tiempo-y-clima/boletin-agroclimatico-nacional',
  ideam_enandes_andina: 'http://www.ideam.gov.co/web/tiempo-y-clima/boletines-agroclimaticos-enandes',
  ideam_bsa_semanal: 'http://www.ideam.gov.co/web/sala-de-prensa/boletin-semanal-para-el-sector-agricola-bsa',
  mta_region_andina: 'https://www.minagricultura.gov.co/Paginas/Mesas-Tecnicas-Agroclimaticas.aspx',
  agronet_agroclima: 'https://www.agronet.gov.co/agroclima/Paginas',
  upra_boletines: 'https://upra.gov.co/web/guest/boletines-agroclimaticos',
  // NOAA CPC ENSO Diagnostic Discussion (mensual) y tabla ONI. Servidor estático
  // (no JS-SPA): verificadas HTTP 200 el 2026-08-23. La discusión mensual es el
  // "mes a mes" ENSO oficial; ONI_v5.php ya venía verificada en institutionalSources.
  noaa_enso_disc: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml',
  noaa_oni: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php',
  ciifen: 'https://www.ciifen.org',
});

/* ── PESTAÑA EL NIÑO · TIMELINE MES A MES 2026–2027 ─────────────────────────
 *
 * ¿Qué es DURABLE y qué CADUCA aquí? La FORMA del calendario (fortalecimiento →
 * pico → persistencia → alivio → transición a Neutral) es conocimiento que
 * cambia a escala de meses y está CITADO del cross-check DR (NOAA CPC + IDEAM +
 * CIIFEN, 2026-08-23-enso-mes-a-mes-2026-2027.md). Las PROBABILIDADES exactas
 * (%) son coyunturales: son la FOTO de ese cross-check (campo `probFoto` con su
 * `boletinFecha`), NO un feed en vivo — el número vigente cambia cada mes y se
 * lee del boletín ENSO oficial (banner + deep-link a NOAA/IDEAM). Mismo contrato
 * que precioReferencia.js con SIPSA: cifra fechada y citada, nunca "vigente ahora".
 *
 * La `accionCultivo` NO sale del pronóstico coyuntural sino del conocimiento
 * agronómico durable del piso frío andino (ensoContext.REGION_IMPACTS.andina +
 * ACCIONES_ENSO): qué hacer en papa/arveja-haba/pastos según la intensidad de la
 * fase. Es lo accionable y no caduca con el número.
 *
 * Cruce de carriles del DR (reconciliado): El Niño ACTIVO y fortaleciéndose en
 * ago-2026 (Niño 3.4 ~+1.2 a +1.4 °C); PICO entre oct-2026 y feb-2027, centrado
 * en nov–dic; ~97% de persistir en el trimestre ene–mar 2027; debilitamiento
 * desde feb–mar; transición a NEUTRAL hacia abr–jun 2027 (sin La Niña inmediata
 * confirmada en las fuentes). El carril objetor (GLM) advierte que IDEAM/CIIFEN
 * no publican un mes-a-mes propio distinto del consenso NOAA — por eso la fuente
 * de cada fila es el consenso NOAA CPC, no una cifra atribuida a IDEAM que no
 * existe.
 */
export const ENSO_CALENDARIO_2026_27 = Object.freeze([
  {
    id: 'fortalecimiento',
    periodo: 'Ago – Sep 2026',
    titulo: 'Fortaleciéndose',
    fase: 'nino',
    narrativa:
      'El Niño ya está activo y ganando fuerza: el Pacífico ecuatorial sigue caliente (índice Niño 3.4 por encima de +1,2 °C). Aún no aprieta lo más fuerte, pero conviene prepararse desde ya.',
    probFoto: { texto: '100% de persistir en sep–nov, con alta chance de "muy fuerte"', boletinFecha: '2026-08-23', fuente: 'NOAA CPC' },
    accionCultivo:
      'Papa y hortaliza del altiplano: empiece a reservar agua y deje listo el riego nocturno anti-helada. Elija variedades precoces para la siembra de segunda.',
  },
  {
    id: 'pico',
    periodo: 'Oct – Dic 2026',
    titulo: 'El pico',
    fase: 'nino',
    narrativa:
      'Aquí El Niño llega o roza su punto más fuerte: menos lluvia, más calor de día y —la paradoja del altiplano frío— cielo despejado de noche que dispara las HELADAS de madrugada.',
    probFoto: { texto: '~95% de un Niño "muy fuerte" en oct–dic; ~69% de que sea de nivel histórico', boletinFecha: '2026-08-23', fuente: 'NOAA CPC' },
    accionCultivo:
      'Papa: máximo riesgo de helada y de sequía. Riegue de madrugada para romper la helada, ponga mulch y no arriesgue siembras tardías sensibles. Pastos: guarde forraje y baje la carga animal.',
  },
  {
    id: 'persistencia',
    periodo: 'Ene – Mar 2027',
    titulo: 'Se sostiene fuerte',
    fase: 'nino',
    narrativa:
      'El pico se mantiene alto y solo hacia feb–mar empieza a ceder despacio. El Niño sigue mandando: siga seco y con heladas en piso frío.',
    probFoto: { texto: '~97% de que El Niño continúe en ene–mar (ya iniciando el declive)', boletinFecha: '2026-08-23', fuente: 'NOAA CPC · IRI' },
    accionCultivo:
      'Planee la siembra de la PRIMERA temporada (arranca ~marzo) con material precoz; no adelante por costumbre: espere a que se estabilicen las primeras lluvias.',
  },
  {
    id: 'transicion',
    periodo: 'Abr – Jun 2027',
    titulo: 'Se alivia',
    fase: 'neutral',
    narrativa:
      'Pasado el invierno del norte, El Niño se debilita y el clima tiende a NORMALIZARSE (fase Neutral). Las fuentes no confirman un salto inmediato a La Niña: quedaría en Neutral por ahora.',
    probFoto: null, // sin cifra dura de transición en el DR → grounded_pendiente
    accionCultivo:
      'Vuelva al ritmo bimodal normal del altiplano, pero con el ojo en el boletín: si tras el alivio el IDEAM abre vigilancia de La Niña, prepare drenaje para exceso de agua.',
  },
]);

/**
 * Resumen "cuándo se alivia" para el encabezado de la pestaña El Niño. Todo
 * durable y citado del cross-check DR; las cifras son la foto 2026-08-23, la
 * vigente se lee del boletín en vivo.
 */
export const ENSO_TRANSICION = Object.freeze({
  pico: 'nov – dic 2026',
  aliviaDesde: 'feb – mar 2027',
  transicionNeutral: 'abr – jun 2027',
  laNinaConfirmada: false,
  fuente: 'NOAA CPC · IDEAM · CIIFEN (cross-check DR 2026-08-23)',
  boletinFecha: '2026-08-23',
});

/* ── PESTAÑA EL NIÑO · VENTANA DE SIEMBRA (Boletín MTA región Andina) ────────
 *
 * REGLA DURA (deflección honesta, patrón SIPSA/precioReferencia): el cross-check
 * DR (2026-08-23-MTA-andina-ventana-siembra.md) es EXPLÍCITO en que NO existe una
 * recomendación de siembra específica y vigente publicada para agosto de 2026 en
 * el altiplano cundiboyacense — el boletín territorial de Cundinamarca más
 * reciente hallado es de OCT-2025, y el mes-a-mes se deriva del Boletín
 * Agroclimático Nacional / BSA. Por eso la ventana VIGENTE es grounded_pendiente:
 * se lee del boletín MTA región Andina EN VIVO (deep-link), NO se inventa aquí.
 *
 * Lo DURABLE y citado que sí mostramos: quién emite el boletín, cada cuánto sale,
 * qué productos existen (con sus fechas), el régimen bimodal del altiplano y el
 * matiz ENSO (bajo El Niño la segunda temporada de lluvias puede llegar más tarde
 * o más floja — ensoContext.andina). El número/fecha exacta de siembra vive en la
 * fuente, no aquí.
 */
export const MTA_VENTANA_SIEMBRA = Object.freeze({
  zona: 'Altiplano cundiboyacense (clima frío, bimodal andino)',
  emisor: 'MADR · UPRA · IDEAM · FAO · Gobernación de Cundinamarca',
  cadencia: 'Boletín agroclimático mensual + Boletín Semanal para el Sector Agrícola (BSA) del IDEAM, los lunes.',
  // Marco DURABLE del régimen bimodal (aprox.): sirve para orientar, no reemplaza
  // la fecha del boletín. El altiplano tiene dos temporadas de lluvia y se siembra
  // al arrancar cada una.
  regimenBimodal:
    'El altiplano tiene dos temporadas de lluvia: la primera hacia marzo–mayo y la segunda hacia septiembre–noviembre. La siembra suele arrancar al comienzo de cada una.',
  matizEnso:
    'Con El Niño fortaleciéndose, la segunda temporada (sep–nov) puede llegar más tarde o más floja: conviene sembrar precoz y reservar agua.',
  // La ventana VIGENTE NO se hardcodea: se lee del boletín en vivo.
  ventanaVigente: Object.freeze({
    estado: ESTADO_GROUNDED_PENDIENTE,
    valor: null,
    fuentePrevista: 'Boletín MTA región Andina / Agronet · IDEAM ENANDES (se lee del boletín vigente)',
  }),
  // Productos oficiales existentes con su última fecha conocida (cross-check DR).
  productos: Object.freeze([
    { nombre: 'Boletín Agroclimático Nacional (No. 136)', ultima: 'may–jul 2026', url: 'http://www.ideam.gov.co/web/tiempo-y-clima/boletin-agroclimatico-nacional' },
    { nombre: 'Boletín de Predicción Climática', ultima: 'publicado 10-ago-2026', url: 'http://www.ideam.gov.co/web/tiempo-y-clima/prediccion-climatica' },
    { nombre: 'Boletín Semanal para el Sector Agrícola (BSA)', ultima: 'semanal (lunes)', url: 'http://www.ideam.gov.co/web/sala-de-prensa/boletin-semanal-para-el-sector-agricola-bsa' },
    { nombre: 'Boletín Agroclimático ENANDES · región Andina', ultima: 'últ. hallado sep-2025', url: 'http://www.ideam.gov.co/web/tiempo-y-clima/boletines-agroclimaticos-enandes' },
    { nombre: 'Boletín Territorial Agroclimático de Cundinamarca', ultima: 'últ. hallado oct-2025', url: 'https://www.agronet.gov.co/agroclima/Paginas' },
  ]),
  urlVivo: 'https://www.minagricultura.gov.co/Paginas/Mesas-Tecnicas-Agroclimaticas.aspx',
  fuente: 'MADR-FAO-IDEAM · UPRA (cross-check DR 2026-08-23)',
});

/**
 * Elige el período del calendario ENSO vigente según la fecha (para resaltar el
 * "ahora" en el timeline). Devuelve el `id` del período o null si la fecha cae
 * fuera del rango cubierto (ago-2026 → jun-2027). Puro y determinístico.
 *
 * @param {Date} [date=new Date()]
 * @returns {string|null}
 */
export function faseCalendarioActual(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const ym = d.getFullYear() * 12 + d.getMonth(); // meses absolutos
  const M = (y, m) => y * 12 + (m - 1); // m: 1-12
  if (ym >= M(2026, 8) && ym <= M(2026, 9)) return 'fortalecimiento';
  if (ym >= M(2026, 10) && ym <= M(2026, 12)) return 'pico';
  if (ym >= M(2027, 1) && ym <= M(2027, 3)) return 'persistencia';
  if (ym >= M(2027, 4) && ym <= M(2027, 6)) return 'transicion';
  return null;
}
