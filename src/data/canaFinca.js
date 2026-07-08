/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (variedades, siembra, plagas, corte y el proceso de la panela), pendiente de
 * migrar a src/config/messages.js — mismo criterio que cafeFinca.js / aguaFinca.js.
 */
/**
 * canaFinca.js — CONTENIDO del mundo "La caña y la panela" (5 estaciones, del
 * cañaveral al bloque de panela). Cultura panelera colombiana.
 *
 * REGLA ANTI-ALUCINACIÓN (igual que cafeFinca.js): todo lo CUALITATIVO
 * (variedades, prácticas de siembra en ladera, señales de plaga, pasos del
 * beneficio panelero) vive aquí como copy groundeado en fuentes colombianas
 * (Cenicaña, AGROSAVIA/Corpoica, FEDEPANELA, ICA, INVIMA). Las CIFRAS DURAS que
 * dependen del sitio (distancia de siembra exacta por variedad y sistema, dosis
 * de abono, toneladas por hectárea, °Brix de corte) NO se inventan: son SLOTS
 * `grounded_pendiente` o se remiten al análisis de suelo / al agente. Los rangos
 * del proceso (temperatura de punteo, tiempos) son valores de referencia,
 * presentados como RANGO orientador que varía con clima, altitud y hornilla.
 *
 * GROUNDING del grafo (relaciones AFFECTS / CONTROLS):
 *   - Diatraea spp. (barrenador del tallo) AFFECTS Saccharum officinarum;
 *     Cotesia flavipes y Trichogramma spp. CONTROLS Diatraea — el control
 *     biológico bandera de Cenicaña. Se refleja aquí SIN inventar enemigos
 *     naturales ni dosis químicas.
 *   - No se agregan variedades, plagas ni controladores que las fuentes no
 *     respalden. La panela sin clarol/hidrosulfito es requisito INVIMA, no
 *     opinión: se presenta como norma de inocuidad.
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/** Ruta base de las fotos del mundo caña (Wikimedia Commons, licencia abierta). */
export const FOTO_BASE_CANA = '/cana';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIONES (pestañas del mundo)
 * ──────────────────────────────────────────────────────────────────────── */
export const ESTACIONES_CANA = [
  { id: 'cana', titulo: 'La caña', descripcion: 'Qué es y qué variedad' },
  { id: 'siembra', titulo: 'Siembra y manejo', descripcion: 'Estaca, ladera y cuidado' },
  { id: 'males', titulo: 'Plagas y males', descripcion: 'Barrenador, carbón y roya' },
  { id: 'corte', titulo: 'Corte', descripcion: 'El punto y la cogida' },
  { id: 'panela', titulo: 'La panela', descripcion: 'Trapiche, hornilla y moldeo' },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 1 · LA CAÑA (variedades paneleras)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Variedades de caña para panela sembradas en Colombia. GROUNDED: Cenicaña y
 * AGROSAVIA/Corpoica identifican las variedades por CÓDIGO de la estación que
 * las obtuvo (CC = Cenicaña Colombia, RD = República Dominicana, POJ = Proefstation
 * Oost-Java, PR = Puerto Rico, MZC = México). La variedad buena para panela no
 * es la misma que para azúcar: pesa la buena clarificación y el jugo, no solo el
 * tonelaje. La recomendación EXACTA por finca depende de la altura y la zona
 * (Hoya del Río Suárez, Cundinamarca, Antioquia, Nariño…) → eso se aterriza con
 * el técnico/AGROSAVIA. NO se inventan °Brix ni toneladas por hectárea.
 */
export const VARIEDADES_CANA = [
  {
    id: 'rd75-11',
    nombre: 'RD 75-11',
    apto: 'panelera',
    nota: 'Una de las más difundidas para panela en Colombia. Buen jugo y buena clarificación; se adapta a varias zonas paneleras. Cenicaña la recomienda en varios rangos de altura — confirme la suya con el técnico.',
    fuente: 'Cenicaña / AGROSAVIA',
  },
  {
    id: 'cc85-92',
    nombre: 'CC 85-92',
    apto: 'panelera',
    nota: 'Variedad Cenicaña Colombia muy sembrada. Vigorosa y de buen rendimiento; en panela conviene manejar bien el punto porque su jugo es rico. Escoja según su piso térmico.',
    fuente: 'Cenicaña',
  },
  {
    id: 'poj28-78',
    nombre: 'POJ 28-78 (y las viejas POJ)',
    apto: 'tradicional',
    nota: 'De las variedades históricas del país (familia POJ). Todavía se ven en fincas tradicionales; buena panela, pero suelen ser más susceptibles a males como el carbón. Si va a renovar, mire material más nuevo y sano.',
    fuente: 'Cenicaña / memoria panelera',
  },
  {
    id: 'criolla',
    nombre: 'Caña criolla / de la región',
    apto: 'regional',
    nota: 'La que ha corrido de finca en finca en su vereda. Puede dar buena panela y estar bien adaptada, pero muchas veces viene con raquitismo o carbón escondidos: renueve con semilla sana (termoterapia) para no arrastrar males.',
    fuente: 'AGROSAVIA (semilla sana)',
  },
];

/**
 * Recomendación de variedad por zona/altura. GROUNDED-PENDIENTE a propósito:
 * depende del piso térmico y de la zona panelera; se aterriza con Cenicaña/
 * AGROSAVIA y el agente. No se muestra una recomendación inventada.
 */
export const VARIEDAD_POR_ZONA = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'Cenicaña / AGROSAVIA — variedad recomendada por zona y altura (vía catálogo/AGE)',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 2 · SIEMBRA Y MANEJO (esqueje/estaca, ladera, cuidado)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * La caña NO se siembra de semilla botánica: se siembra de TROZO de tallo con
 * yemas (esqueje/estaca/"semilla asexual"). GROUNDED (AGROSAVIA/Cenicaña, manejo
 * del cultivo). Los tiempos y las distancias son de referencia y cambian con la
 * variedad, el sistema y la ladera — NO recetas fijas.
 */
export const PASOS_SIEMBRA = [
  {
    id: 'semilla',
    titulo: 'La "semilla" es un trozo de tallo',
    detalle: 'La caña se reproduce por estaca: se cortan trozos de tallo (con dos o tres yemas cada uno) de un cañaveral sano y vigoroso. De cada yema brota una planta nueva. Escoja semilla de un lote sin carbón ni raquitismo — de caña enferma sale cañaveral enfermo.',
  },
  {
    id: 'semilla-sana',
    titulo: 'Semilla sana (termoterapia)',
    detalle: 'Para no pasar males por la semilla, AGROSAVIA recomienda tratar la estaca con calor (termoterapia: agua caliente a temperatura y tiempo controlados) antes de sembrar. Así se limpia de raquitismo de la soca y otros males que van escondidos en el tallo.',
  },
  {
    id: 'surcos',
    titulo: 'En surcos, siguiendo la loma',
    detalle: 'Se siembra en surcos, acostando la estaca en el fondo (a chorrillo o traslapada). En LADERA —como en casi toda la zona panelera colombiana— los surcos van en CURVAS DE NIVEL (atravesados a la pendiente), no loma abajo: así el agua no se lleva la tierra. La distancia entre surcos depende de la variedad y del sistema.',
  },
  {
    id: 'brotacion',
    titulo: 'Brotación y macollamiento',
    detalle: 'De las yemas brotan los primeros tallos y luego la mata "macolla" (echa muchos tallos de una misma cepa). De ese macollamiento sale el cañaveral. La primera cosecha (caña planta) tarda más; después, cada rebrote (soca) va más rápido.',
  },
];

/** Manejo del cañaveral en el año (cualitativo — lo fino según el lote). */
export const MANEJO_CANA = [
  {
    id: 'malezas',
    titulo: 'Limpias temprano',
    detalle: 'Los primeros meses la caña es chiquita y la maleza la ahoga: mantenga limpio hasta que el cañaveral "cierre calle" y tape el suelo con su propia sombra. Después casi se defiende sola.',
  },
  {
    id: 'aporque',
    titulo: 'Aporque y deshoje',
    detalle: 'Arrimar tierra al pie (aporque) ancla la cepa y en ladera ayuda contra la erosión. El deshoje (quitar hoja seca, "desapronte") ventila el cañaveral y le pone difícil al barrenador y a los males.',
  },
  {
    id: 'suelo',
    titulo: 'Abone con análisis, no de oído',
    detalle: 'La caña saca mucho del suelo. Devuélvale con materia orgánica (cachaza compostada, bagazo, gallinaza) y corrija con base en el análisis del lote. La dosis exacta no es una sola para toda finca.',
  },
];

/**
 * Distancia y densidad de siembra (surcos, chorros por metro). GROUNDED-PENDIENTE
 * a propósito: cambia con la variedad, el vigor y si es plano o ladera; se
 * aterriza con Cenicaña/AGROSAVIA y el agente. NUNCA un número inventado.
 */
export const DISTANCIA_SIEMBRA = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'Cenicaña / AGROSAVIA — distancia entre surcos y cantidad de semilla por variedad y sistema (plano vs. ladera)',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 3 · PLAGAS Y MALES (reconocer + control agroecológico/MIP)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Los males clave del cañaveral colombiano. Reconocerlos + manejo agroecológico
 * e MIP. Los controladores biológicos del barrenador (Cotesia flavipes,
 * Trichogramma spp.) son las relaciones CONTROLS del grafo y el programa bandera
 * de Cenicaña: NO se inventan enemigos naturales ni dosis químicas. Carbón y
 * roya se manejan con variedad resistente y semilla sana, no con receta de veneno.
 */
export const MALES_CANA = [
  {
    id: 'barrenador',
    nombre: 'El barrenador del tallo',
    cientifico: 'Diatraea spp.',
    tipo: 'plaga (gusano/polilla)',
    foto: 'barrenador',
    plagaGrafo: 'Barrenador del tallo (Diatraea)',
    reconocer: [
      'Una polilla color paja pone huevos en la hoja; de ahí sale un gusano que se mete y BARRENA el tallo por dentro, haciendo galerías.',
      'Por fuera se ve el hueco y aserrín; al partir el tallo aparece el túnel. La herida abre la puerta a hongos que pudren el jugo (pudrición roja).',
      'No solo baja el peso: el tallo barrenado daña la calidad del jugo para la panela.',
    ],
    manejo: [
      { titulo: 'Control biológico: Cotesia flavipes', detalle: 'La avispita Cotesia flavipes pone sus huevos DENTRO del gusano barrenador y lo mata desde adentro. Es el control biológico bandera de Cenicaña contra Diatraea: se liberan avispas criadas en laboratorio en el cañaveral.' },
      { titulo: 'Control biológico: Trichogramma', detalle: 'Trichogramma spp. es una avispa aún más chiquita que parasita los HUEVOS del barrenador antes de que nazca el gusano. Cotesia (a la larva) + Trichogramma (al huevo) se complementan: pegan al barrenador en dos momentos.' },
      { titulo: 'Cañaveral sano y limpio', detalle: 'Semilla sana, deshoje y no dejar tallos volcados ni socas viejas abandonadas (son criadero). Un cañaveral aireado y bien manejado le sube el trabajo al barrenador.' },
    ],
    fuente: 'Cenicaña (control biológico de Diatraea) · relaciones AFFECTS/CONTROLS del grafo Chagra',
  },
  {
    id: 'carbon',
    nombre: 'El carbón de la caña',
    cientifico: 'Sporisorium scitamineum',
    tipo: 'enfermedad (hongo)',
    foto: null,
    plagaGrafo: 'Carbón de la caña',
    reconocer: [
      'Del cogollo sale un "látigo" negro, largo y curvo, lleno de un polvo negro: son las esporas del hongo.',
      'La mata enferma se afea, macolla raro y rinde muy poco; el polvo negro riega el mal a todo el cañaveral y a la semilla.',
      'Entra fácil por variedades viejas susceptibles y por semilla contaminada.',
    ],
    manejo: [
      { titulo: 'Variedad resistente', detalle: 'La defensa más segura: sembrar variedades que Cenicaña reporta resistentes al carbón, sobre todo si en su zona ya se ve el látigo negro.' },
      { titulo: 'Semilla sana y erradicar', detalle: 'Semilla de lotes libres de carbón (con termoterapia) y, apenas aparezca un látigo, arráncalo con cuidado (sin regar el polvo), sáquelo y quémelo. No dejar matas enfermas en el lote.' },
    ],
    fuente: 'Cenicaña / AGROSAVIA (manejo del carbón) · grafo Chagra',
  },
  {
    id: 'roya',
    nombre: 'La roya de la caña',
    cientifico: 'Puccinia melanocephala',
    tipo: 'enfermedad (hongo)',
    foto: null,
    plagaGrafo: 'Roya de la caña',
    reconocer: [
      'Pústulas alargadas de color pardo-anaranjado en el envés de la hoja; al pasar la mano sueltan un polvillo.',
      'Si ataca fuerte, seca hoja y baja el vigor de la mata, sobre todo en variedades susceptibles y con mucha humedad.',
    ],
    manejo: [
      { titulo: 'Variedad resistente', detalle: 'Igual que con el carbón: la vía más barata y segura es sembrar variedad resistente a roya. Cenicaña sigue el comportamiento de cada variedad frente a la roya.' },
      { titulo: 'Ventilación y nutrición', detalle: 'Cañaveral aireado (deshoje, no sobre-denso) y bien nutrido resiste mejor. La humedad estancada y la mata débil son las que castiga la roya.' },
    ],
    fuente: 'Cenicaña (roya de la caña) · grafo Chagra',
  },
];

/**
 * Nota anti-receta: el módulo NO da dosis de fungicida/insecticida de síntesis.
 * El manejo que se muestra es agroecológico e MIP (control biológico + cultural
 * + variedad resistente + semilla sana). Para el caso puntual de una finca, el
 * agente o el técnico de AGROSAVIA/Cenicaña.
 */
export const NOTA_SIN_RECETAS_QUIMICAS =
  'Aquí no encontrará dosis de veneno: contra el barrenador manda el control biológico (Cotesia y Trichogramma), y contra el carbón y la roya manda la variedad resistente y la semilla sana. Para su caso concreto, hable con el técnico de AGROSAVIA/Cenicaña o con el agente.';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 4 · CORTE (madurez y cogida)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * El corte de la caña para panela. GROUNDED (AGROSAVIA/Cenicaña): la caña se
 * corta "hecha" (madura), y el jugo se daña rápido después del corte, así que se
 * muele pronto. La edad de corte varía MUCHO con la altura (a más frío, más
 * meses) → se da como rango de referencia, no como fecha fija.
 */
export const CICLO_CORTE = {
  edadCorte: 'según la altura: en tierra caliente la caña se hace más rápido; en tierra fría tarda más (puede pasar de un año largo)',
  punto: 'Se corta cuando la caña está "hecha": el tallo suena macizo, la corteza brilla y las hojas de abajo se secan. Los paneleros lo confirman por el sabor y por el °Brix del jugo si tienen con qué medirlo.',
  moliendaPronta: 'Cortada, la caña NO espera: el jugo empieza a dañarse (se invierte el azúcar) en pocas horas o días. Corte lo que va a moler y muela pronto.',
  fuente: 'AGROSAVIA / Cenicaña (madurez y cosecha de la caña panelera)',
  pasos: [
    {
      id: 'madurez',
      titulo: 'Esperar el punto',
      detalle: 'Ni verde ni pasada. Caña verde da poco jugo y mala panela; caña muy pasada o volcada se daña y atrae barrenador. El punto se conoce con la práctica y, si se puede, con el °Brix.',
    },
    {
      id: 'corte',
      titulo: 'Corte a ras y limpio',
      detalle: 'Se corta con machete lo más al ras del suelo posible (ahí está el jugo más dulce) y se despunta el cogollo. En panela buena NO se quema la caña antes de cortar: la quema ensucia el jugo y baja la calidad.',
    },
    {
      id: 'alza',
      titulo: 'Alza y al trapiche',
      detalle: 'Se amarra, se alza y se lleva al trapiche pronto. Entre menos tiempo pase entre el corte y la molienda, mejor sale la panela.',
    },
  ],
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 5 · LA PANELA (trapiche → clarificación → punteo → moldeo)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * El proceso de la panela, paso a paso. GROUNDED (AGROSAVIA/Corpoica "Manual de
 * elaboración de panela", FEDEPANELA): la clarificación con aglutinantes
 * naturales (balso, cadillo, guácimo, juan blanco) y el punteo son el corazón del
 * oficio. Las temperaturas/tiempos son RANGOS de referencia que varían con la
 * altitud y la hornilla — se presentan como tal, no como receta exacta.
 */
export const PASOS_PANELA = [
  {
    id: 'molienda',
    titulo: 'Molienda en el trapiche',
    icono: 'molienda',
    detalle: 'La caña pasa por el trapiche (el molino de mazas): lo exprime y saca el GUARAPO (el jugo). Lo que queda es el BAGAZO — la caña molida, que seca sirve de leña para la misma hornilla. Muela caña fresca; guarapo viejo fermenta.',
    cuidado: 'Bagazo mojado no prende bien: séquelo (bagacera) para que la hornilla no ahume ni se apague.',
  },
  {
    id: 'clarificacion',
    titulo: 'Prelimpieza y clarificación (con balso/cadillo)',
    icono: 'clarificacion',
    detalle: 'El guarapo se cuela (prelimpiadores) y se calienta en las pailas. Al subir la temperatura se le agrega el mucílago de plantas aglutinantes —BALSO, CADILLO, guácimo o juan blanco, machacadas en agua— que "cuaja" las impurezas y las sube como CACHAZA (espuma), que se retira con la remellón. Así se limpia el jugo SIN químicos.',
    cuidado: 'La cachaza no se bota: compostada o para los animales. Nunca se "blanquea" el jugo con químicos (ver buenas prácticas).',
  },
  {
    id: 'evaporacion',
    titulo: 'Evaporación en la hornilla',
    icono: 'evaporacion',
    detalle: 'El jugo limpio pasa de paila en paila sobre la hornilla (el horno que quema bagazo), perdiendo agua y espesándose. De guarapo aguado va volviéndose miel (melote) cada vez más concentrada.',
    cuidado: 'Fuego parejo: pailas quemadas dan panela con sabor a tizne y color feo.',
  },
  {
    id: 'punteo',
    titulo: 'El punteo (dar el punto)',
    icono: 'punteo',
    detalle: 'La parte más de oficio: la miel se concentra hasta el PUNTO de panela (del orden de 118–125 °C, según la altura). El punto se prueba echando una gotica en agua fría: si cuaja quebradiza, ya está. Pasarse quema la panela; faltar deja panela blanda que no cuaja.',
    cuidado: 'El punto se PRUEBA, no solo se cronometra: cambia con la altitud y la hornilla.',
  },
  {
    id: 'moldeo',
    titulo: 'Batido y moldeo',
    icono: 'moldeo',
    detalle: 'En el punto, la miel se saca a la canoa/batea y se BATE para que enfríe y granee; luego se vierte en las GAVERAS (moldes) —redonda, en bloque o pastillas. Al enfriar cuaja y ya es panela. Se desmolda, se deja orear y se empaca.',
    cuidado: 'Empaque y bodega secos: la panela es higroscópica (chupa humedad) y se ablanda o enmohece si la guarda húmeda.',
  },
];

/** Nota de grounding para los rangos del proceso (honestidad de fuente). */
export const PANELA_FUENTE =
  'Rangos de referencia de AGROSAVIA/Corpoica (elaboración de panela) y FEDEPANELA: la temperatura de punteo (≈118–125 °C) y los tiempos varían con la altitud y la hornilla. Ajústelos a su trapiche; el punto se confirma a la prueba de la gota, no solo al reloj.';

/**
 * Buenas prácticas / inocuidad — el mensaje NO negociable: panela SIN clarol,
 * SIN hidrosulfito, SIN colorantes. GROUNDED: la Resolución 779/2006 de INVIMA y
 * la Ley 40/1990 (panela) PROHÍBEN blanqueadores y adulterantes en la panela.
 * Esto es norma de inocuidad, no opinión.
 */
export const BPM_PANELA = {
  titulo: 'Panela limpia: sin clarol ni químicos',
  resumen: 'La buena panela se aclara SOLO con las plantas aglutinantes (balso, cadillo) y con la cachaza bien retirada. Blanquearla o "mejorarle" el color con químicos es adulterarla y es ilegal.',
  vetos: [
    { titulo: 'Nada de clarol ni hidrosulfito', detalle: 'El "clarol" y el hidrosulfito de sodio se usan para blanquear la panela a la fuerza. Están PROHIBIDOS (INVIMA): son un riesgo para la salud y adulteran el producto. Panela buena no es la más clarita, es la mejor hecha.' },
    { titulo: 'Nada de colorantes ni anilinas', detalle: 'El color de la panela lo da la caña y el punto, no un colorante. Anilinas y colorantes no permitidos son adulteración.' },
    { titulo: 'Trapiche y hornilla limpios', detalle: 'Buenas prácticas de manufactura: mazas y pailas limpias, agua limpia, manos limpias, y no dejar mieles viejas fermentando. La panela es alimento.' },
  ],
  fuente: 'INVIMA (Resolución 779 de 2006) · Ley 40 de 1990 · FEDEPANELA (buenas prácticas)',
};

/**
 * El bagazo y la cachaza cierran el ciclo → enlace al mundo del compost/estiércol.
 * GROUNDED: el bagazo seco es leña de la hornilla; la cachaza y el bagazo viejo,
 * compostados, vuelven al cañaveral como abono (AGROSAVIA).
 */
export const BAGAZO_ABONO = {
  titulo: 'Del trapiche vuelve al suelo',
  resumen: 'El trapiche no bota nada: el bagazo seco es la leña de la hornilla, y el bagazo viejo y la cachaza, compostados, vuelven al cañaveral como abono. Así el cañaveral de este año alimenta el del próximo.',
  puntos: [
    'Bagazo seco → leña de la hornilla (la panela casi se cocina sola con la propia caña).',
    'Bagazo viejo + cachaza → compost, y de vuelta al suelo como materia orgánica.',
    'La cachaza también sirve de alimento para los cerdos en muchas fincas paneleras.',
  ],
  enlaceMundo: 'compost',
  enlaceLabel: 'Cómo compostar bagazo y cachaza',
  fuente: 'AGROSAVIA (aprovechamiento de subproductos de la caña)',
};

/* ────────────────────────────────────────────────────────────────────────
 * FOTOS — créditos de licencia abierta (espejo de public/cana/creditos.json)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Créditos de las fotos del mundo caña — FUENTE ÚNICA en el componente, espejo de
 * /public/cana/creditos.json (mismo patrón que Café/Almacenamiento: el JSON
 * público es para auditoría de licencias, este arreglo es el que pinta la UI).
 * Requisito de las licencias CC-BY/CC-BY-SA: atribución visible. Si una foto no
 * está o no carga, la tarjeta cae con gracia a un ícono.
 * @type {{slug:string,autor:string,licencia:string,licenciaUrl:string,fuenteUrl:string}[]}
 */
export const CREDITOS_FOTOS_CANA = [
  { slug: 'canaveral', autor: 'Akire gatuna', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Panelera_Corozal_El_Triangulo_10.jpg' },
  { slug: 'cana-planta', autor: 'Akire gatuna', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Panelera_Corozal_El_Triangulo_22.jpg' },
  { slug: 'barrenador', autor: 'Rebecca Graham, Dept. of Agriculture WA', licencia: 'CC BY 3.0 AU', licenciaUrl: 'https://creativecommons.org/licenses/by/3.0/au/deed.en', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Diatraea_saccharalis_female_dorsal.jpg' },
  { slug: 'cotesia', autor: 'Kaiser et al. (2017), ZooKeys 682', licencia: 'CC BY 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Cotesia_flavipes_(10.3897-zookeys.682.13016)_Figure_7.jpg' },
  { slug: 'corte', autor: 'Cícero R. C. Omena', licencia: 'CC BY 2.0', licenciaUrl: 'https://creativecommons.org/licenses/by/2.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Corte_de_cana_(13899302714).jpg' },
  { slug: 'trapiche', autor: 'Akire gatuna', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Panelera_Corozal_El_Triangulo_30.jpg' },
  { slug: 'clarificacion', autor: 'Akire gatuna', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Panelera_Corozal_El_Triangulo_24.jpg' },
  { slug: 'hornilla', autor: 'Akire gatuna', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Panelera_Corozal_El_Triangulo_33.jpg' },
  { slug: 'moldeo', autor: 'Akire gatuna', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Panelera_Corozal_El_Triangulo_45.jpg' },
];
