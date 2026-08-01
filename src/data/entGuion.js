/**
 * entGuion — DATA del guion pedagógico del Ent (Bosque Vivo), personaje-árbol
 * guardián tipo Ent/Bárbol (diseño original inspirado en el arquetipo del
 * guardián del bosque, no derivado de obra específica).
 *
 * GANCHO PEDAGÓGICO: el Ent es un árbol guardián que le habla al jugador en
 * ustedeo colombiano. Le enseña botánica, clima, conservación y coexistencia
 * con la fauna silvestre (oso andino, borugo). Cada línea del guion está
 * anclada a una especie del catálogo Chagra
 * (catalog/chagra-catalog-oss-subset-v3.2.json, 581 especies) y NO inventa:
 * todo se verifica en `valor_pedagogico`, `conservation_status`,
 * `familia_botanica` y `thermal_zones` de la ficha original.
 *
 * GROUNDING (anti-alucinación, anti-invento):
 *   - Cada `especie_id` se resuelve contra el catálogo v3.2 (verificado por
 *     tests: cada id existe en `species[].id`).
 *   - Cada `snippet_pedagogico` se redacta desde el `valor_pedagogico` de la
 *     especie, condensado en 1-3 líneas en voz del Ent. La regla es: si no
 *     está en la ficha, no está en el guion.
 *   - El `dato_conservacion` refleja el `conservation_status` textual del
 *     catálogo (no categorías IUCN inventadas) + 1 dato verificable del
 *     `valor_pedagogico` (Ley 1930/2018, Libro Rojo Plantas Colombia, CITES,
 *     etc.).
 *   - Las piezas de CAZA (oso andino, borugo) se anclan en especies cuyo
 *     `valor_pedagogico` menciona explícitamente a la fauna silvestre como
 *     dispersora, hospedera o indicadora. El mensaje es coexistencia: el Ent
 *     pide cuidar al animal, no atacarlo.
 *
 * PRIORIZACIÓN: piezas con `conservation_status` = en_peligro,
 * endemica_critica, endemica_colombia, nativo_protegido + valor_pedagogico
 * alto (especie clave en su ecosistema). Se incluyen también especies
 * comunes con lección botánica clara (guadua, sábila) para dar variedad
 * temática al guion.
 *
 * TEMAS: 'botanica' (taxonomía, familia, mecanismos vegetales),
 * 'clima' (páramo/agua, cambio climático, sequía), 'conservacion' (estado
 * de amenaza y protección legal de la especie), 'caza' (oso andino y
 * borugo — coexistencia, no violencia).
 *
 * i18n (ADR-050): solo es-CO (mismo criterio que metalSlugCampoData.js).
 * SIN voseo argentino. SIN nombres propios de stakeholders. SIN secretos.
 */

/* ────────────────────────────────────────────────────────────────────────
 * PIEZAS DEL GUION — cada una es una intervención del Ent al jugador.
 *
 * Estructura:
 *   id                 — slug estable, único (snake_case).
 *   tema               — uno de ['botanica','clima','conservacion','caza'].
 *   especie_id         — id que existe en catalog v3.2 (validado por tests).
 *   nombre_comun       — copia textual del catálogo (no se parafrasea).
 *   nombre_cientifico  — copia textual del catálogo (forma binomial + autor).
 *   familia_botanica   — copia textual del catálogo.
 *   thermal_zones       — copia del catálogo (no se inventan pisos).
 *   snippet_pedagogico  — 1-3 líneas en voz del Ent (ustedeo colombiano).
 *   dato_conservacion   — estado + dato verificable, sin inventar siglas.
 * ──────────────────────────────────────────────────────────────────────── */

/** @typedef {'botanica'|'clima'|'conservacion'|'caza'} TemaEnt */

/**
 * @typedef {Object} PiezaEnt
 * @property {string} id                  Identificador estable (snake_case).
 * @property {TemaEnt} tema               Categoría pedagógica del mensaje.
 * @property {string} especie_id          Id que existe en catalog v3.2.
 * @property {string} nombre_comun        Nombre común textual del catálogo.
 * @property {string} nombre_cientifico   Binomio + autor textual del catálogo.
 * @property {string} familia_botanica    Familia textual del catálogo.
 * @property {string[]} thermal_zones     Pisos térmicos textuales del catálogo.
 * @property {string} snippet_pedagogico  1-3 líneas en voz del Ent (es-CO).
 * @property {string} dato_conservacion   Estado + dato verificable, honesto.
 */

/** @type {readonly PiezaEnt[]} */
export const ENT_GUION = Object.freeze([
  /* ── BOTANICA — familia, taxonomía, mecanismos vegetales ──────────── */

  {
    id: 'guadua_un_solo_ser',
    tema: 'botanica',
    especie_id: 'guadua_angustifolia',
    nombre_comun: 'Guadua / Bambu nativo',
    nombre_cientifico: 'Guadua angustifolia Kunth',
    familia_botanica: 'Poaceae',
    thermal_zones: ['calido', 'templado'],
    snippet_pedagogico:
      'Mire bien este guadual: una sola planta madre conecta hasta cien cañas por rizomas subterráneos. Lo que usted ve como árboles separados es un solo ser vivo repetido bajo la tierra.',
    dato_conservacion:
      'Gramínea gigante leñosa nativa (Poaceae); nativo_silvestre. Crece 25-30 m, madurez de corte a 4-6 años; puerta de entrada al bosque ripario del Eje Cafetero.',
  },
  {
    id: 'pino_romeron_no_es_pino',
    tema: 'botanica',
    especie_id: 'prumnopitys_montana',
    nombre_comun: 'Pino romerón / Chaquiro',
    nombre_cientifico: 'Prumnopitys montana (Humb. & Bonpl. ex Willd.) de Laub.',
    familia_botanica: 'Podocarpaceae',
    thermal_zones: ['frio'],
    snippet_pedagogico:
      'Este pino romerón no es pino. Es una conífera nativa de los Andes cuyo linaje viene del supercontinente Gondwana, hace más de doscientos millones de años. Sobrevivió a la fractura de los continentes.',
    dato_conservacion:
      'Podocarpaceae gondwánica relictual; nativo_protegido. Bosque altoandino 1.800-3.000 msnm; único representante nativo de su familia en la cordillera Oriental.',
  },
  {
    id: 'helecho_arborescente_jurasico',
    tema: 'botanica',
    especie_id: 'dicksonia_sellowiana',
    nombre_comun: 'Helecho arborescente',
    nombre_cientifico: 'Dicksonia sellowiana Hook.',
    familia_botanica: 'Dicksoniaceae',
    thermal_zones: ['templado', 'frio'],
    snippet_pedagogico:
      'Este helecho arborescente ya era antiguo cuando los dinosaurios lo pastoreaban. Su linaje lleva doscientos millones de años en la Tierra; nosotros los árboles jóvenes aprendemos de su paciencia.',
    dato_conservacion:
      'Dicksoniaceae, fósil viviente del Jurásico (~200 Ma); en_peligro (Libro Rojo flora Colombia). Bosque nublado 1.500-3.200 msnm, humedad relativa >75%.',
  },
  {
    id: 'sabila_metabolismo_cam',
    tema: 'botanica',
    especie_id: 'aloe_vera',
    nombre_comun: 'Sábila',
    nombre_cientifico: 'Aloe vera (L.) Burm.f.',
    familia_botanica: 'Asphodelaceae',
    thermal_zones: ['calido', 'templado'],
    snippet_pedagogico:
      'La sábila abre sus estomas de noche y los cierra de día: así fija carbono sin perder agua bajo el sol. Le llaman metabolismo CAM, y es la lección que debe enseñar a quienes cultivan en tierra seca.',
    dato_conservacion:
      'Asphodelaceae suculenta (metabolismo CAM: fijación nocturna de CO2); cultivo_comun. Origen Península Arábiga, naturalizada en Colombia 0-1.500 msnm.',
  },
  {
    id: 'aliso_fija_nitrogeno',
    tema: 'botanica',
    especie_id: 'alnus_acuminata',
    nombre_comun: 'Aliso andino',
    nombre_cientifico: 'Alnus acuminata Kunth',
    familia_botanica: 'Betulaceae',
    thermal_zones: ['frio'],
    snippet_pedagogico:
      'El aliso andino hospeda en sus raíces un actinomiceto llamado Frankia. Ese microbio le regala nitrógeno a cambio de azúcares: doscientos kilos por hectárea al año. Así alimenta a todo el bosque.',
    dato_conservacion:
      'Betulaceae árbol nativo fijador de nitrógeno (~150-200 kg N/ha/año vía Frankia); nativo_silvestre. Zona fría 1.500-3.200 msnm; pilar de restauración de riberas.',
  },

  /* ── CLIMA — páramo/agua, cambio climático, sequía ─────────────────── */

  {
    id: 'frailejon_killipii_agua_bogota',
    tema: 'clima',
    especie_id: 'espeletia_killipii',
    nombre_comun: 'Frailejón Killip',
    nombre_cientifico: 'Espeletia killipii Cuatrec.',
    familia_botanica: 'Asteraceae',
    thermal_zones: ['paramo'],
    snippet_pedagogico:
      'Este frailejón del Páramo de Chingaza almacena agua en sus hojas vellosas. Ocho de cada diez vasos de agua que toma Bogotá nacen del trabajo silencioso de sus parientes. Cuide el páramo, cuide su vaso.',
    dato_conservacion:
      'Asteraceae, frailejón diagnóstico de Chingaza; endemica_critica. El complejo paramuno entrega >80% del agua potable de Bogotá; crecimiento ~1 cm/año.',
  },
  {
    id: 'coloradito_regula_agua_alta_montana',
    tema: 'clima',
    especie_id: 'polylepis_quadrijuga',
    nombre_comun: 'Coloradito, queñoa de páramo Cruz Verde',
    nombre_cientifico: 'Polylepis quadrijuga Bitter',
    familia_botanica: 'Rosaceae',
    thermal_zones: ['paramo'],
    snippet_pedagogico:
      'El coloradito crece donde casi ningún árbol se atreve: arriba de los cuatro mil metros. Sus raíces sujetan el suelo del páramo y guardan el agua que baja a los valles. Sin él, el páramo se deslava.',
    dato_conservacion:
      'Rosaceae emblemática del páramo Cruz Verde-Sumapaz; nativo_protegido. Regulación hídrica y fijación de carbono en suelos frágiles de alta montaña.',
  },
  {
    id: 'frailejon_mayor_adaptacion_uv',
    tema: 'clima',
    especie_id: 'espeletia_grandiflora',
    nombre_comun: 'Frailejón mayor',
    nombre_cientifico: 'Espeletia grandiflora Humb. & Bonpl.',
    familia_botanica: 'Asteraceae',
    thermal_zones: ['paramo'],
    snippet_pedagogico:
      'Mire sus hojas plateadas: esa pubescencia refleja la radiación UV y atrapa una capa de aire tibio junto a la planta. Así el frailejón sobrevive a la alta montaña tropical sin marchitarse.',
    dato_conservacion:
      'Asteraceae, símbolo del páramo colombiano; nativo_protegido. Adaptaciones extremas a UV-B y oscilación térmica diaria; indicador de cambio climático en alta montaña.',
  },
  {
    id: 'cratylia_raiz_pivotante_sequia',
    tema: 'clima',
    especie_id: 'cratylia_argentea',
    nombre_comun: 'Cratylia / Rabo de iguana',
    nombre_cientifico: 'Cratylia argentea (Desv.) Kuntze',
    familia_botanica: 'Fabaceae',
    thermal_zones: ['calido'],
    snippet_pedagogico:
      'Esta leguminosa, el rabo de iguana, sobrevive seis meses sin una gota de lluvia. Su raíz bajó tres metros hasta tocar el agua subterránea. Cuando llegue la sequía de El Niño, ella seguirá verde.',
    dato_conservacion:
      'Fabaceae forrajera tolerante a sequía (5-6 meses sin lluvia); naturalizada. Raíz pivotante profunda hasta 3 m; banco de proteína para época seca en sistemas silvopastoriles.',
  },
  {
    id: 'guadua_sumidero_carbono',
    tema: 'clima',
    especie_id: 'guadua_angustifolia',
    nombre_comun: 'Guadua / Bambu nativo',
    nombre_cientifico: 'Guadua angustifolia Kunth',
    familia_botanica: 'Poaceae',
    thermal_zones: ['calido', 'templado'],
    snippet_pedagogico:
      'Un guadual captura diecisiete toneladas de carbono por hectárea al año: cuatro veces más que un bosque de pino. Cada caña adulta guarda hasta doscientos litros de agua en sus entrenudos.',
    dato_conservacion:
      'Poaceae, sumidero de carbono (17 t CO2/ha/año); nativo_silvestre. Cada culmo retiene 100-200 L de agua; material estructural renovable de alta tracción.',
  },

  /* ── CONSERVACION — especie amenazada, protección legal, endemismo ── */

  {
    id: 'magnolia_yarumal_quedan_pocos',
    tema: 'conservacion',
    especie_id: 'magnolia_yarumalensis',
    nombre_comun: 'Magnolia Yarumal',
    nombre_cientifico: 'Magnolia yarumalensis (Lozano) Govaerts',
    familia_botanica: 'Magnoliaceae',
    thermal_zones: ['templado', 'frio'],
    snippet_pedagogico:
      'Quedan menos de cincuenta adultos de esta magnolia en todo el mundo, todos en Antioquia. Si usted ve uno en una finca, cuídelo como a un abuelo: es patrimonio genético al borde de irse para siempre.',
    dato_conservacion:
      'Magnoliaceae endémica de Antioquia; en_peligro (EN) tendiente a Críticamente Amenazada (Libro Rojo Magnoliaceae Colombia, Calderón-Sáenz 2007).',
  },
  {
    id: 'caoba_cites_ii',
    tema: 'conservacion',
    especie_id: 'swietenia_macrophylla',
    nombre_comun: 'Caoba andina',
    nombre_cientifico: 'Swietenia macrophylla King',
    familia_botanica: 'Meliaceae',
    thermal_zones: ['calido'],
    snippet_pedagogico:
      'La caoba andina tarda cuarenta años en dar madera fina. Su abuelo la taló en una semana. Hoy está en el Apéndice II de CITES: el mundo entero vigila cada tablón para que no se repita la exterminación.',
    dato_conservacion:
      'Meliaceae; en_peligro (EN), listada en CITES Apéndice II. Poblaciones silvestres reducidas >80% del rango original en Colombia (Libro Rojo flora Colombia).',
  },
  {
    id: 'nogal_andino_juglona',
    tema: 'conservacion',
    especie_id: 'juglans_neotropica',
    nombre_comun: 'Nogal andino',
    nombre_cientifico: 'Juglans neotropica Diels',
    familia_botanica: 'Juglandaceae',
    thermal_zones: ['templado', 'frio'],
    snippet_pedagogico:
      'El nogal andino da la madera más fina de los Andes. Sus raíces fabrican juglona, un compuesto que aleja al tomate y a la papa pero acoge al café de sombra. Plantar nogal hoy es dejar muebles para los nietos.',
    dato_conservacion:
      'Juglandaceae; en_peligro (EN) por sobreexplotación maderera 1900-1980 (IUCN Red List, Libro Rojo flora Colombia).',
  },
  {
    id: 'cattleya_flor_nacional',
    tema: 'conservacion',
    especie_id: 'cattleya_trianae',
    nombre_comun: 'Flor de Mayo',
    nombre_cientifico: 'Cattleya trianae Linden & Rchb.f.',
    familia_botanica: 'Orchidaceae',
    thermal_zones: ['templado'],
    snippet_pedagogico:
      'Esta es la flor nacional de Colombia, la Cattleya trianae. Vive apenas en los bosques húmedos de la cordillera. Si la quieren arrancar para vender, recuerden: lleva el apellido de un botánico colombiano y es de todos.',
    dato_conservacion:
      'Orchidaceae endémica de la cordillera Oriental; en_peligro (EN), flor nacional de Colombia. Epífita de bosque húmedo premontano 800-2.200 msnm.',
  },
  {
    id: 'cedro_real_olor_ajo',
    tema: 'conservacion',
    especie_id: 'cedrela_odorata',
    nombre_comun: 'Cedro real',
    nombre_cientifico: 'Cedrela odorata L.',
    familia_botanica: 'Meliaceae',
    thermal_zones: ['calido', 'templado'],
    snippet_pedagogico:
      'El cedro real huele a ajo cuando se le rompe una hoja. Ese olor es su defensa. Mide treinta metros y da madera para guitarras finas: cortarlo es silenciar instrumentos que aún no se han construido.',
    dato_conservacion:
      'Meliaceae maderable patrimonial; nativo_protegido. Distribuido 0-1.500 msnm en cinco regiones de Colombia; clave para restauración de bosque seco tropical.',
  },

  /* ── CAZA — oso andino y borugo: coexistencia, no violencia ────────── */

  {
    id: 'puya_oso_anteojos_dispersor',
    tema: 'caza',
    especie_id: 'puya_clava_herculis',
    nombre_comun: 'Puya gigante de páramo',
    nombre_cientifico: 'Puya clava-herculis Mez & Sodiro',
    familia_botanica: 'Bromeliaceae',
    thermal_zones: ['paramo'],
    snippet_pedagogico:
      'El oso de anteojos sube a esta puya y come la base carnosa de sus hojas. En el estiércol del oso viajan las semillas de la puya a otros páramos. Sin oso no hay puya nueva. Por favor, no le dispare.',
    dato_conservacion:
      'Bromeliaceae; nativo_protegido (Ley 1930/2018 de Páramos). El oso andino (Tremarctos ornatus, VU-IUCN) es dispersor primario de sus semillas; relación coevolutiva planta-oso única en los Andes.',
  },
  {
    id: 'agraz_páramo_alimento_oso',
    tema: 'caza',
    especie_id: 'vaccinium_floribundum',
    nombre_comun: 'Agraz de paramo',
    nombre_cientifico: 'Vaccinium floribundum Kunth',
    familia_botanica: 'Ericaceae',
    thermal_zones: ['frio', 'paramo'],
    snippet_pedagogico:
      'El agraz de páramo es dulce para la gente y para el oso de anteojos. Si el oso come de este arbusto, es señal de que el páramo sigue entero. Ver al oso no es amenaza, es buena noticia.',
    dato_conservacion:
      'Ericaceae; nativo_silvestre. Alimento clave de fauna paramuna (oso de anteojos, danta de montaña, colibríes Eriocnemis); especie protegida por Resolución 192/2014 MADS.',
  },
  {
    id: 'mano_de_oso_huellas',
    tema: 'caza',
    especie_id: 'oreopanax_floribundum',
    nombre_comun: 'Mano de oso',
    nombre_cientifico: 'Oreopanax floribundum Decne. & Planch.',
    familia_botanica: 'Araliaceae',
    thermal_zones: ['templado', 'frio'],
    snippet_pedagogico:
      'Mire la hoja del mano de oso: parece la huella que deja el oso andino en la corteza al trepar. Este árbol lo hospeda, lo alimenta de frutos y le enseña el camino del bosque. Cohabite con él, no lo elimine.',
    dato_conservacion:
      'Araliaceae; nativo_silvestre, indicador de bosque andino en estado medio-bueno. Sus frutos los dispersan aves frugívoras (tucanes Andigena, mirlas Turdus) y, históricamente, el oso andino.',
  },
  {
    id: 'roble_bellotas_despensa_fauna',
    tema: 'caza',
    especie_id: 'quercus_humboldtii',
    nombre_comun: 'Roble negro andino',
    nombre_cientifico: 'Quercus humboldtii Bonpl.',
    familia_botanica: 'Fagaceae',
    thermal_zones: ['frio'],
    snippet_pedagogico:
      'Las bellotas de este roble andino alimentan al oso de anteojos y a los mamíferos pequeños del bosque. Cada bellota que cae es una despensa para quienes habitan bajo mi sombra. Reduzca la cacería, siembre más.',
    dato_conservacion:
      'Fagaceae endémica de Colombia y Panamá; nativo_protegido. Sus bellotas son alimento clave para fauna nativa (oso de anteojos, mamíferos pequeños, avifauna); pilar de restauración de la cordillera Oriental.',
  },
  {
    id: 'almendro_amazonico_borugo_dispersor',
    tema: 'caza',
    especie_id: 'caryocar_glabrum',
    nombre_comun: 'Almendro silvestre amazónico',
    nombre_cientifico: 'Caryocar glabrum (Aubl.) Pers.',
    familia_botanica: 'Caryocaraceae',
    thermal_zones: ['calido'],
    snippet_pedagogico:
      'En la Amazonía, el almendro dispersa sus semillas grandes gracias al agutí, la danta y el borugo. Esos animales son los sembradores del bosque: si se los comen todos, el bosque deja de regenerarse.',
    dato_conservacion:
      'Caryocaraceae, árbol emergente amazónico; nativo_silvestre. Dispersión zoócora primaria por agutí (Dasyprocta fuliginosa), danta (Tapirus terrestris) y roedores silvestres como el borugo.',
  },
]);

/* ────────────────────────────────────────────────────────────────────────
 * HELPERS DE LOOKUP (data-driven, sin estado ni efectos).
 *
 * Consumidores (fable, motor de diálogo, pantalla del bosque) usan estos
 * accesos para no armar índices a mano. Puros: sin estado, sin DOM.
 * ──────────────────────────────────────────────────────────────────────── */

const PIEZAS_POR_ID = Object.freeze(
  ENT_GUION.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {}),
);

const PIEZAS_POR_TEMA = Object.freeze(
  ENT_GUION.reduce((acc, p) => {
    if (!acc[p.tema]) acc[p.tema] = [];
    acc[p.tema].push(p);
    return acc;
  }, {}),
);

const TEMAS_VALIDOS = Object.freeze(['botanica', 'clima', 'conservacion', 'caza']);

/**
 * Lista de temas pedagógicos válidos del guion.
 * @returns {string[]}
 */
export function getTemasValidos() {
  return TEMAS_VALIDOS.slice();
}

/**
 * Busca una pieza por id. Devuelve undefined si no existe.
 * @param {string} id
 * @returns {PiezaEnt|undefined}
 */
export function getPieza(id) {
  return PIEZAS_POR_ID[id];
}

/**
 * Devuelve todas las piezas de un tema (copia del arreglo interno).
 * Si el tema no existe, devuelve arreglo vacío.
 * @param {TemaEnt} tema
 * @returns {PiezaEnt[]}
 */
export function getPiezasPorTema(tema) {
  const arr = PIEZAS_POR_TEMA[tema];
  return arr ? arr.slice() : [];
}

/**
 * Devuelve la lista de especie_ids únicos referenciados por el guion.
 * Útil para que el consumidor valide contra el catálogo v3.2.
 * @returns {string[]}
 */
export function getEspeciesReferenciadas() {
  return Array.from(new Set(ENT_GUION.map((p) => p.especie_id)));
}
