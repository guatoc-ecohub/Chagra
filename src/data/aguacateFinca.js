/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (variedades, piso térmico, suelo, plagas, floración y cosecha del aguacate),
 * pendiente de migrar a src/config/messages.js — mismo criterio que
 * cafeFinca.js / aguaFinca.js / frutalesFinca.js.
 */
/**
 * aguacateFinca.js — CONTENIDO del mundo "El aguacate" (5 estaciones del ciclo).
 *
 * El aguacate ya tiene su FICHA rápida dentro del mundo "Frutales de la finca"
 * (frutalesFinca.js → id 'aguacate'). Este módulo es la PROFUNDIZACIÓN dedicada
 * del cultivo bandera de alto valor (Hass y criollos de montaña), NO un
 * duplicado: cuenta el cultivo por su ciclo, photo-forward, con más detalle en
 * lo que lo hace especial (el injerto sobre patrón, el drenaje contra la
 * pudrición de raíz, y la floración tipo A/B que casi ningún otro frutal tiene).
 *
 * REGLA ANTI-ALUCINACIÓN (igual que cafeFinca.js): todo lo CUALITATIVO vive aquí
 * como copy groundeado en fuentes colombianas (AGROSAVIA, Universidad Nacional,
 * ICA). Las CIFRAS DURAS que dependen del sitio (dosis de abono, densidad
 * exacta, meses de floración/cosecha) NO se inventan: son SLOTS
 * `grounded_pendiente` ("dato en camino") o se remiten al análisis de suelo / al
 * agente. NO se afirma ninguna plaga ni patógeno que no esté en el grafo.
 *
 * GROUNDING del grafo (public/grafo-relations.json → species.persea_americana):
 *   - plagas y controladores biológicos: pest_controllers (pudrición radicular,
 *     antracnosis, mosca y barrenador del aguacate, escama blanca, ácaro,
 *     comején, pudrición peduncular) — se reflejan aquí SIN inventar nuevas.
 *   - compatibilidad: compatible_with (maní forrajero, mamoncillo, hobo) y
 *     antagonist_of (eucalipto).
 *   - biopreparados: la lista propia de persea_americana (caldo bordelés,
 *     Bacillus subtilis, Trichoderma, micorrizas, bocashi, biol, etc.).
 * GROUNDING del ciclo (src/data/perennialCycles.js → persea_americana):
 *   - 1340–2420 msnm (óptimo 1800–2000 para Hass), primera cosecha 2–4 años,
 *     vida productiva ~15 años, régimen `unknown` (por eso meses de floración y
 *     cosecha = "dato en camino"), fuente Agrosavia/UNAL, confianza media.
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIONES (pestañas del mundo)
 * ──────────────────────────────────────────────────────────────────────── */
export const ESTACIONES_AGUACATE = [
  { id: 'siembra', titulo: 'Variedad y siembra', descripcion: 'Piso térmico e injerto' },
  { id: 'suelo', titulo: 'Suelo y agua', descripcion: 'Drenaje ante todo' },
  { id: 'sanidad', titulo: 'Plagas y males', descripcion: 'Reconózcalos, manéjelos' },
  { id: 'flor', titulo: 'Flor y polinización', descripcion: 'Tipo A y tipo B' },
  { id: 'cosecha', titulo: 'Cosecha', descripcion: 'El punto y la poscosecha' },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 1 · VARIEDAD Y SIEMBRA (piso térmico + injerto sobre patrón)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Del ciclo (perennialCycles.persea_americana). El régimen es `unknown`: por eso
 * los meses de floración/cosecha NO se afirman (dato en camino), pero sí el
 * rango de altitud, los años a primera cosecha y la vida productiva.
 */
export const CICLO_AGUACATE = {
  primeraCosechaAnios: [2, 4],
  vidaProductivaAnios: 15,
  altitud: '1340–2420 msnm (óptimo 1800–2000 para Hass)',
  regionNota:
    'El calendario de floración y cosecha depende fuerte de la localidad, la altitud y el patrón; hay fincas de montaña que producen casi todo el año. No hay un mes fijo que sirva para todas.',
  fuente: 'AGROSAVIA, Universidad Nacional de Colombia (catálogo Chagra, confianza media)',
};

/**
 * Las tres RAZAS del aguacate por piso térmico. Es botánica estándar (mexicana,
 * guatemalteca, antillana) — orienta qué material va con cada altura. Los rangos
 * de altitud son de referencia colombiana (AGROSAVIA/UNAL); afínelos a su zona.
 */
export const PISOS_TERMICOS = [
  {
    id: 'alto',
    franja: 'Montaña fría-moderada',
    altitud: '1800–2500 msnm',
    raza: 'Raza mexicana e híbridos',
    detalle: 'La franja del Hass y de los híbridos de montaña: fresco, tolerante al frío, fruto de cáscara gruesa que aguanta el transporte. Es el piso del aguacate de alto valor y exportación.',
  },
  {
    id: 'medio',
    franja: 'Clima medio',
    altitud: '1000–1800 msnm',
    raza: 'Raza guatemalteca e híbridos',
    detalle: 'Aquí van los criollos mejorados de fruto grande (Lorena, Santana) y muchos híbridos. Buen clima para pancoger y venta regional.',
  },
  {
    id: 'calido',
    franja: 'Clima cálido / bajo',
    altitud: 'Por debajo de 1000 msnm',
    raza: 'Raza antillana',
    detalle: 'La franja de los criollos costeños y el papelillo, de piel fina y poco aceite. Rústicos y de traspatio, más para consumo fresco local que para guardar o mandar lejos.',
  },
];

/**
 * Variedades sembradas en Colombia. GROUNDED en material colombiano (AGROSAVIA).
 * El TIPO FLORAL (A/B) del Hass es un dato botánico firme; para los criollos
 * varía y se marca como "confirmar" (SlotPendiente) — no se inventa por árbol.
 */
export const VARIEDADES_AGUACATE = [
  {
    id: 'hass',
    nombre: 'Hass',
    tipoFloral: 'A',
    tipoFloralFirme: true,
    piso: 'Montaña (1800–2200)',
    detalle: 'El aguacate bandera de exportación: fruto mediano, cáscara rugosa que VIRA de verde a morado-negro al madurar (ese cambio de color ayuda a leer el punto), mucho aceite y buena vida en poscosecha. De floración tipo A. Es un cultivo de montaña fría-moderada.',
  },
  {
    id: 'lorena',
    nombre: 'Lorena (criollo mejorado)',
    tipoFloral: null,
    tipoFloralFirme: false,
    piso: 'Clima medio (1000–1800)',
    detalle: 'Criollo colombiano de fruto grande, piel verde lisa y pulpa suave; muy apreciado en el mercado nacional en fresco. No vira de color al madurar, así que el punto se lee por tamaño y por el brillo que se apaga.',
  },
  {
    id: 'santana',
    nombre: 'Santana',
    tipoFloral: null,
    tipoFloralFirme: false,
    piso: 'Clima medio',
    detalle: 'Otro criollo mejorado de fruto grande y verde para mercado nacional. Como los criollos de piel gruesa verde, el punto de cosecha se juzga por tamaño y llenado, no por color.',
  },
  {
    id: 'papelillo',
    nombre: 'Papelillo / criollo antillano',
    tipoFloral: null,
    tipoFloralFirme: false,
    piso: 'Clima cálido (<1000)',
    detalle: 'El criollo rústico de piel fina "de papel" y menos aceite. Árbol de traspatio, para consumo fresco y pronto; no aguanta guardarse ni viajar como el Hass.',
  },
];

/** El injerto sobre patrón: por qué el aguacate se siembra injertado. */
export const INJERTO_AGUACATE = {
  metodo: 'Injerto sobre patrón de semilla',
  detalle:
    'El aguacate NO se siembra de pepa para producir: se injerta la variedad que se quiere (Hass, Lorena…) sobre un PATRÓN nacido de semilla. El patrón es el que pone las raíces, y unos patrones toleran mejor la pudrición de raíz que otros — por eso vale la pena el árbol injertado y certificado de vivero, y no el que nace solo debajo del palo.',
  puntos: [
    'De semilla el árbol sale disparejo, tarda más y no repite la fruta de la madre: para producción, siempre injertado.',
    'El patrón decide la resistencia de la raíz. En zonas con historia de pudrición, pregunte por patrones tolerantes.',
    'Compre en vivero certificado (ICA): material sano es la primera defensa contra la muerte descendente.',
  ],
};

/**
 * Distancia de siembra. Es GROUNDED-PENDIENTE: cambia con la variedad, el vigor
 * del patrón y el sistema (a plena exposición o en asocio). Se da un RANGO
 * orientador, no un número inventado por hectárea.
 */
export const SIEMBRA_AGUACATE = {
  distancia: '7 a 9 m entre árboles (orientador)',
  detalle: 'Es un árbol grande: déjele aire para que ventile (menos enfermedad) y para poder cosecharlo. La distancia exacta y la densidad por hectárea dependen de la variedad, el patrón y el sistema.',
  densidad: {
    estado: ESTADO_GROUNDED_PENDIENTE,
    fuentePrevista: 'AGROSAVIA — densidades por variedad, patrón y sistema (plena exposición vs. asocio), vía catálogo/AGE',
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 2 · SUELO Y AGUA (drenaje contra la pudrición de raíz)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * El drenaje es LA clave del aguacate. La pudrición radicular (Phytophthora)
 * vive en el suelo encharcado; esta estación explica cómo negarle el agua
 * empozada. GROUNDED: AGROSAVIA/UNAL; la plaga está en el grafo (pest_controllers).
 */
export const SUELO_AGUA = [
  {
    id: 'drenaje',
    icono: 'drenaje',
    titulo: 'Drenaje ante todo: nunca los pies en el agua',
    detalle: 'El aguacate se muere con la raíz encharcada más que con la seca. Su enemigo número uno —la pudrición de raíz— vive en el suelo empozado. Siémbrelo en ALTO (montículo, camellón o caballón) para que el agua escurra, y nunca en un bajo o en tierra pesada sin drenar.',
  },
  {
    id: 'suelo',
    icono: 'suelo',
    titulo: 'Suelo suelto, profundo y con vida',
    detalle: 'Le gusta la tierra suelta y honda, con buena materia orgánica y aire en la raíz. En suelo compacto o arcilloso pesado sufre: airéelo, súbale la materia orgánica y móntelo en camellón.',
  },
  {
    id: 'agua',
    icono: 'agua',
    titulo: 'Riego de apoyo, con medida',
    detalle: 'Agua de apoyo en la floración y el llenado del fruto ayuda al cuaje y al tamaño, sobre todo en el tiempo seco. Pero riegue con medida: mejor poco y seguido que un ahogo. El exceso de agua le abre la puerta a la pudrición.',
  },
];

/**
 * Con quién se lleva bien y mal el aguacate. GROUNDED del grafo:
 * compatible_with (maní forrajero, mamoncillo, hobo) y antagonist_of (eucalipto).
 * NO se agregan especies que el grafo no respalde.
 */
export const ASOCIACION_AGUACATE = {
  compatibles: [
    {
      id: 'mani-forrajero',
      nombre: 'Maní forrajero',
      cientifico: 'Arachis pintoi',
      papel: 'Cobertura viva que abona',
      detalle: 'Leguminosa rastrera que tapiza el suelo entre los árboles: guarda humedad, frena la erosión, fija nitrógeno y no compite en altura con el aguacate. Cobertura ideal para el huerto.',
    },
    {
      id: 'mamoncillo',
      nombre: 'Mamoncillo',
      cientifico: 'Melicoccus bijugatus',
      papel: 'Frutal compatible',
      detalle: 'Frutal compatible en el arreglo de la finca según el catálogo Chagra: diversifica la cosecha sin estorbarle al aguacate.',
    },
    {
      id: 'hobo',
      nombre: 'Hobo / ciruela',
      cientifico: 'Spondias dulcis',
      papel: 'Frutal compatible',
      detalle: 'Otro frutal que el catálogo marca compatible con el aguacate: buena vecina para armar un huerto diverso.',
    },
  ],
  antagonista: {
    id: 'eucalipto',
    nombre: 'Eucalipto',
    cientifico: 'Eucalyptus globulus',
    detalle: 'El catálogo lo marca ANTAGONISTA del aguacate: seca y acapara el suelo, y su hojarasca no lo deja. No siembre aguacate a la sombra ni al pie de eucaliptos.',
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 3 · PLAGAS Y MALES (grounded del grafo: pest_controllers)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Plagas y enfermedades del aguacate. TODAS groundeadas: el `plagaGrafo` es el
 * nodo real del grafo (species.persea_americana → pest_controllers) y los
 * biocontroles son sus controladores. NO se inventan plagas ni enemigos
 * naturales ni dosis químicas. La pudrición de raíz va primero: es la que mata.
 */
export const MALES_AGUACATE = [
  {
    id: 'pudricion-raiz',
    nombre: 'Pudrición de la raíz (Phytophthora)',
    tipo: 'enfermedad',
    plagaGrafo: 'Pudrición radicular del aguacate',
    destacado: true,
    senal: 'El árbol se ve triste, con hojas pequeñas, amarillas y que se caen; las ramas se secan de la punta hacia abajo (muerte descendente). Por debajo, las raíces finas se ven negras y podridas. Es la muerte del aguacate en suelo encharcado.',
    biocontrol: ['Drenaje y siembra en alto (lo primero)', 'Trichoderma al suelo', 'Bacterias antagonistas (biofungicida)', 'Materia orgánica que active el suelo'],
  },
  {
    id: 'antracnosis',
    nombre: 'Antracnosis',
    tipo: 'enfermedad',
    plagaGrafo: 'Antracnosis de frutales',
    senal: 'Manchas negras hundidas en el fruto que pudren la pulpa, sobre todo cuando el fruto va madurando; también quema puntas de hojas y ramitas. Empeora en época de lluvia.',
    biocontrol: ['Trichoderma', 'Bacterias antagonistas', 'Recoja fruta y hojas enfermas', 'Caldo bordelés protector'],
  },
  {
    id: 'barrenador-fruto',
    nombre: 'Barrenador del fruto',
    tipo: 'plaga',
    plagaGrafo: 'Barrenador del fruto del aguacate',
    senal: 'Perforaciones y aserrín en el fruto o en la semilla; la larva barrena por dentro, el fruto se mancha y se cae. Castiga la cosecha y la calidad.',
    biocontrol: ['Avispita parasitoide de huevos', 'Bt (Bacillus thuringiensis)', 'Recoja y entierre la fruta caída'],
  },
  {
    id: 'mosca',
    nombre: 'Mosca del aguacate',
    tipo: 'plaga',
    plagaGrafo: 'Mosca del aguacate',
    senal: 'Pica el fruto para poner huevos; la larva daña la pulpa por dentro y la fruta se pudre y cae. La fruta caída es su criadero.',
    biocontrol: ['Hongo Beauveria', 'Recoja y entierre la fruta caída (corta el ciclo)', 'Trampas de monitoreo'],
  },
  {
    id: 'acaro',
    nombre: 'Ácaro del aguacate',
    tipo: 'plaga',
    plagaGrafo: 'Ácaro del aguacate',
    senal: 'Bronceado o telita fina en las hojas (sobre todo en tiempo seco y caluroso); la hoja se reseca y en ataques fuertes se cae. Debilita el árbol y castiga el brote.',
    biocontrol: ['Ácaros depredadores', 'Hongo Beauveria', 'Depredadores de control biológico'],
  },
  {
    id: 'escama-blanca',
    nombre: 'Escama blanca',
    tipo: 'plaga',
    plagaGrafo: 'Escama blanca del aguacate',
    senal: 'Costritas o escamas blancas pegadas a hojas, ramas y fruto; chupan la savia y manchan la fruta. Suele venir con hormigas que las cuidan.',
    biocontrol: ['Parasitoide de control biológico', 'Aceite + jabón (lavado)', 'Controle las hormigas que las protegen'],
  },
  {
    id: 'comejen',
    nombre: 'Comején (termitas)',
    tipo: 'plaga',
    plagaGrafo: 'Comején de los árboles frutales',
    senal: 'Túneles de tierra sobre el tronco y ramas; roen la madera y debilitan el árbol, sobre todo si ya viene golpeado por sequía o mal drenaje.',
    biocontrol: ['Hongo Beauveria', 'Hongo verde entomopatógeno (Metarhizium)', 'Árbol sano y bien regado resiste mejor'],
  },
];

/**
 * Fuente de la sección de plagas — el grafo Chagra da los nodos y el manejo, y
 * la autoridad publicada es la guía de AGROSAVIA (verificada contra Crossref en
 * el DR grounding-aguacate-hass-plagas-colombia, 2026-06-19). No añade plagas
 * fuera del grafo: solo cita la fuente que respalda las que ya están.
 */
export const MALES_FUENTE =
  'Catálogo Chagra + AGROSAVIA — Carabalí Muñoz, Caicedo Vallejo y Holguín (2021), “Guía para el reconocimiento y manejo de las principales plagas de aguacate cv. Hass en Colombia”, DOI 10.21930/agrosavia.nbook.7404913 (verificado Crossref).';

/**
 * Biopreparados de apoyo — GROUNDED: la lista propia de persea_americana en el
 * grafo. Son apoyo agroecológico, no reemplazan el manejo cultural (drenaje,
 * recolección, material sano). No se dan dosis de veneno de síntesis.
 */
export const BIOPREPARADOS_AGUACATE = [
  'Caldo bordelés',
  'Bacillus subtilis foliar',
  'Trichoderma al suelo',
  'Micorrizas arbusculares',
  'Bocashi',
  'Biol',
  'Supermagro',
  'Sal de Epsom foliar',
  'Lechada de cal (encalado del tronco)',
];

/** Guard anti-receta (mismo criterio que el café). */
export const NOTA_SIN_QUIMICOS =
  'Aquí no encontrará dosis de veneno: el manejo es agroecológico e integrado (drenaje y siembra en alto, material sano, recolección de la fruta caída, control biológico y biopreparados). Para su caso concreto, hable con su técnico de AGROSAVIA/ICA o con el agente.';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 4 · FLOR Y POLINIZACIÓN (dicogamia tipo A / tipo B)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * La floración del aguacate es rara y vale la pena entenderla: cada flor abre
 * DOS veces (primero hembra, luego macho) en momentos distintos del día. Los
 * árboles se agrupan en TIPO A y TIPO B según el horario; mezclarlos mejora el
 * cuaje. Es horticultura estándar (dicogamia protogínica); el tipo del Hass (A)
 * es firme, el de cada criollo se confirma en campo — no se inventa por árbol.
 */
export const FLORACION_POLINIZACION = {
  resumen: 'La flor del aguacate abre dos veces: primero como HEMBRA (lista para recibir polen) y horas después como MACHO (soltando polen). Como los dos momentos no coinciden en el mismo árbol, cruzar árboles ayuda a que cuaje más fruta.',
  tipos: [
    {
      id: 'A',
      nombre: 'Tipo A',
      horario: 'Hembra en la mañana · macho en la tarde del día siguiente',
      ejemplo: 'Hass es tipo A.',
    },
    {
      id: 'B',
      nombre: 'Tipo B',
      horario: 'Hembra en la tarde · macho en la mañana del día siguiente',
      ejemplo: 'Muchos criollos y variedades como Fuerte son tipo B (complemento clásico del Hass).',
    },
  ],
  claves: [
    'Sembrar juntos un tipo A y un tipo B hace que, a cualquier hora, haya flores hembra abiertas y flores macho soltando polen: se cruzan y cuaja más fruta.',
    'En montaña fría el traslape de horarios se acorta (el frío atrasa la apertura): ahí un polinizador del otro tipo cerca ayuda todavía más.',
    'Un lote de puro Hass produce, pero mezclar un polinizador tipo B suele mejorar el cuaje y la carga.',
  ],
  abejas: 'Quien lleva el polen de flor a flor son las ABEJAS. Un huerto con colmenas cerca, flores alrededor y sin venenos en plena floración cuaja mucho mejor. Cuidar los polinizadores es cuidar la cosecha.',
  tipoCriolloNota: 'El tipo floral exacto de un criollo local se confirma observando el árbol (a qué hora abre la flor hembra); no se puede afirmar de memoria por variedad.',
  fuente: 'AGROSAVIA, Universidad Nacional de Colombia (biología floral del aguacate); polinizadores: Carabalí et al. (2017), “Insectos polinizadores del aguacate cv. Hass en Colombia”, DOI 10.21930/978-958-740-235-3 (verificado Crossref)',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 5 · COSECHA Y POSCOSECHA (el punto de corte)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * El aguacate NO madura en el árbol: se coge "hecho" pero duro y ablanda en
 * casa. El punto se mide por el aceite (materia seca) — el umbral exacto varía
 * por variedad/mercado y va como "dato en camino"; en campo se lee por tamaño,
 * brillo y, en Hass, el cambio de color. GROUNDED: AGROSAVIA.
 */
export const COSECHA_AGUACATE = {
  punto:
    'El aguacate se coge HECHO pero duro, y madura en la casa; nunca ablanda en el árbol. El punto se conoce por el tamaño lleno, por el brillo de la cáscara que se apaga y se pone opaco y, en el Hass, por el cambio de color de verde a morado. Cogido tierno, nunca ablanda bien.',
  materiaSeca: {
    concepto: 'La forma técnica de saber el punto es el contenido de aceite (materia seca): a más aceite, mejor sabor y mejor maduración. Por debajo del punto, el fruto queda "aguado" y no ablanda parejo.',
    umbral: {
      estado: ESTADO_GROUNDED_PENDIENTE,
      fuentePrevista: 'AGROSAVIA / norma de calidad — % mínimo de materia seca por variedad y mercado (p. ej. exportación Hass)',
    },
  },
  corte: [
    'Corte con tijera dejando un cabito (un pedacito de pedúnculo): así no se abre la "boca" por donde entra la pudrición.',
    'No lo arranque de un jalón ni lo deje caer al suelo: el golpe se mancha por dentro y no se ve hasta que lo parten.',
    'Recíbalo en canasto con algo blando, no lo eche a granel sobre piedra.',
  ],
  maduracion:
    'Ya cogido, madura a temperatura ambiente en pocos días. Una vez está a punto, el frío de la nevera lo frena unos días. En Hass, el morado oscuro y que ceda un poco a la presión suave avisan que está listo.',
  fuente: 'AGROSAVIA',
};

/* ────────────────────────────────────────────────────────────────────────
 * FOTOS — créditos de licencia abierta (espejo de public/aguacate/creditos.json)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Créditos de las fotos del mundo aguacate — FUENTE ÚNICA en el componente,
 * espejo de /public/aguacate/creditos.json (mismo patrón que Café/Agua). El
 * campo `src` es la RUTA real: las nuevas viven en /aguacate y algunas se
 * REUSAN de /frutales (sin gastar bytes nuevos), pero todas se acreditan aquí
 * porque las licencias CC-BY/CC-BY-SA exigen atribución visible. Si una foto no
 * carga, la tarjeta cae con gracia a un ícono.
 * @type {{slug:string,src:string,autor:string,licencia:string,licenciaUrl:string,fuenteUrl:string}[]}
 */
export const CREDITOS_FOTOS_AGUACATE = [
  { slug: 'arbol', src: '/aguacate/arbol.jpg', autor: 'Ernani viana 28', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Abacateiro_com_frutos.jpg' },
  { slug: 'raices', src: '/aguacate/raices.jpg', autor: 'Karlalhdz', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Aguacate_con_raices_dentro.jpg' },
  { slug: 'flor', src: '/aguacate/flor.jpg', autor: 'B.navez', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Persea_americana_flowers.jpg' },
  { slug: 'cosecha', src: '/aguacate/cosecha.jpg', autor: 'Leoadec', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Avocadoes_on_the_branch.jpeg' },
  // Reusadas del mundo Frutales (no suman al presupuesto de fotos nuevas):
  { slug: 'fruto', src: '/frutales/aguacate.jpg', autor: 'B.navez', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Persea_americana_fruit_2.JPG' },
  { slug: 'injerto', src: '/frutales/injerto.jpg', autor: 'Sorruno', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Injerto_de_yema.JPG' },
];
