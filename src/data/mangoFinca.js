/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (variedades, piso térmico, floración, plagas y cosecha del mango), pendiente
 * de migrar a src/config/messages.js — mismo criterio que cafeFinca.js /
 * frutalesFinca.js.
 */
/**
 * mangoFinca.js — CONTENIDO del mundo "El mango" (5 estaciones del ciclo).
 *
 * El mango (Mangifera indica) es el cultivo bandera de la TIERRA CÁLIDA
 * colombiana: un solo árbol grande da una cosecha marcada al año. Este mundo es
 * la PROFUNDIZACIÓN dedicada del mango (como el café o la caña tienen la suya),
 * más allá de la ficha corta que vive en "Frutales de la finca".
 *
 * REGLA ANTI-ALUCINACIÓN (igual que cafeFinca.js): todo lo CUALITATIVO
 * (variedades, prácticas, señales de plaga, pasos de cosecha) vive aquí como
 * copy groundeado en fuentes colombianas (AGROSAVIA, ICA, Asohofrucol). Las
 * CIFRAS DURAS que dependen del sitio (dosis, kg de abono, densidad exacta) NO
 * se inventan: son SLOTS `grounded_pendiente` o se remiten al análisis de suelo
 * y al agente. NO se inventan especies ni dosis de veneno.
 *
 * GROUNDING del grafo (public/grafo-relations.json → species.mangifera_indica):
 *   - pest_controllers: antracnosis de frutales, mosca de la fruta (Anastrepha
 *     spp.), mosca del Mediterráneo (Ceratitis), ácaro de las yemas del mango,
 *     oídio o mildeo polvoso, mancha bacteriana del mango, comején de frutales,
 *     pudrición peduncular — se reflejan aquí SIN inventar nuevos.
 *   - compatible_with: caimito, mamey, mamoncillo, hobo (Spondias dulcis) y la
 *     forrajera Stylosanthes — otros árboles/plantas de tierra cálida.
 *   - biopreparados: lechada de cal en troncos.
 * Y del ciclo perenne (perennialCycles.mangifera_indica, AGROSAVIA, confianza
 * media): primera cosecha 3–5 años, régimen estacional (una cosecha marcada al
 * año), floración hacia agosto–octubre y recolección noviembre–diciembre en el
 * Tolima (cambia por región), disparada por temperatura, radiación y estado
 * hídrico del árbol (la temporada seca).
 *
 * PISO TÉRMICO — honestidad térmica (requisito del mundo): el mango es de
 * tierra CÁLIDA (óptimo por debajo de ~1200 msnm). Por encima de ~1800 msnm NO
 * produce: el árbol puede vivir, pero el frío no lo deja florecer ni cuajar. Se
 * dice explícito, no se maquilla.
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/** Ruta base de las fotos del mundo mango (Wikimedia Commons, licencia abierta). */
export const FOTO_BASE_MANGO = '/mango';

/** Fotos reutilizadas del mundo "Frutales" (ya en el bundle; 0 bytes nuevos). */
export const FOTO_FRUTALES_MANGO = '/frutales/mango.jpg'; // árbol de mango en ladera cálida
export const FOTO_FRUTALES_INJERTO = '/frutales/injerto.jpg'; // injerto de yema

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIONES (pestañas del mundo) — el ciclo del mango, en orden
 * ──────────────────────────────────────────────────────────────────────── */
export const ESTACIONES_MANGO = [
  { id: 'siembra', titulo: 'Variedad y siembra', descripcion: 'Escoja e injerte la mata' },
  { id: 'clima', titulo: 'Piso térmico y agua', descripcion: 'Tierra cálida y sol' },
  { id: 'flor', titulo: 'Floración y cuaje', descripcion: 'La seca la hace florecer' },
  { id: 'males', titulo: 'Plagas y males', descripcion: 'Antracnosis y mosca' },
  { id: 'cosecha', titulo: 'Cosecha y despensa', descripcion: 'El punto y qué hacer' },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 1 · VARIEDAD Y SIEMBRA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Variedades de mango sembradas en Colombia, con su TIPO (fino injertado vs.
 * criollo de pepa) — el dato que más pesa al escoger. GROUNDED: AGROSAVIA / ICA
 * / Asohofrucol. Las variedades finas (Tommy, Keitt, Kent) se injertan para que
 * salgan iguales a la madre; el criollo de pepa (hilacha, común) sirve de patrón
 * y de árbol de sombra. NO se inventan rendimientos (t/ha): dependen del sitio.
 */
export const VARIEDADES_MANGO = [
  {
    id: 'tommy',
    nombre: 'Tommy Atkins',
    tipo: 'injerto',
    uso: 'Exportación y plaza',
    nota: 'La más sembrada para el mercado: cáscara gruesa y colorida (roja) que aguanta el transporte, poca fibra y buena vida en anaquel. La taza no es la más dulce, pero es la que llega lejos sin dañarse.',
    fuente: 'AGROSAVIA / Asohofrucol',
  },
  {
    id: 'keitt',
    nombre: 'Keitt',
    tipo: 'injerto',
    uso: 'Tardía, fresco',
    nota: 'Variedad tardía (madura al final de la temporada, cuando escasea y el precio sube), fruto grande, poca fibra y semilla pequeña. Se cosecha bien firme para el mercado en fresco.',
    fuente: 'AGROSAVIA / Asohofrucol',
  },
  {
    id: 'kent',
    nombre: 'Kent',
    tipo: 'injerto',
    uso: 'Dulce, fresco y pulpa',
    nota: 'De las más dulces y jugosas, casi sin fibra. Muy apetecida en fresco y para pulpa; se magulla más fácil que la Tommy, así que se maneja con cuidado.',
    fuente: 'AGROSAVIA / Asohofrucol',
  },
  {
    id: 'azucar',
    nombre: 'Mango de azúcar',
    tipo: 'injerto',
    uso: 'Criollo fino de la Costa',
    nota: 'Mango pequeño y muy dulce, criollo colombiano insignia de la Costa y el Magdalena. Se propaga injertado para conservar la calidad; muy querido en fresco y jugo.',
    fuente: 'AGROSAVIA / Asohofrucol',
  },
  {
    id: 'hilacha',
    nombre: 'Mango de hilacha (común)',
    tipo: 'pepa',
    uso: 'Jugo, patrón y sombra',
    nota: 'El criollo de pepa de toda la vida: fibroso ("hilacha"), rendidor para jugo y sorbete. Nace de semilla, así que sale disparejo, pero sirve de PATRÓN para injertar las finas y de árbol de sombra en el solar.',
    fuente: 'AGROSAVIA / Asohofrucol',
  },
];

/**
 * Del patrón al árbol: los pasos de propagación y siembra, en orden.
 * GROUNDED (AGROSAVIA, propagación de frutales): el mango fino se INJERTA sobre
 * patrón criollo. Tiempos y distancias son orientadores (varían con variedad,
 * suelo y clima), NO recetas fijas.
 */
export const PASOS_SIEMBRA_MANGO = [
  {
    id: 'patron',
    titulo: 'El patrón de pepa',
    detalle: 'Todo arranca por un patrón: una matica de mango criollo de pepa (poliembriónico, sale parecido a la madre). Se cría en bolsa a pleno sol hasta que el tallito tenga el grueso de un lápiz — ahí está listo para injertar.',
  },
  {
    id: 'injerto',
    titulo: 'Injertar la variedad fina',
    detalle: 'Sobre ese patrón se injerta la variedad que escogió (Tommy, Keitt, Kent, azúcar) con una yema o púa de un árbol sano y conocido. El injerto hace que el arbolito salga IGUAL a la madre y produzca en pocos años, no en muchos como el de pepa.',
  },
  {
    id: 'hoyo',
    titulo: 'El hoyo y la distancia',
    detalle: 'Es de los árboles más grandes de la finca: déjele espacio. Hoyo grande con materia orgánica bien descompuesta, a pleno sol y en suelo profundo que drene bien (no le gusta el encharcado). Siémbrelo con el aguacero encima para que pegue.',
  },
  {
    id: 'formacion',
    titulo: 'Poda de formación',
    detalle: 'Desde chiquito se forma una copa BAJA y abierta: así se cosecha desde el suelo, entra luz y aire (menos antracnosis) y el árbol no se sube a lo imposible. La copa baja es media pelea ganada contra la enfermedad y por la comodidad.',
  },
];

/**
 * Distancia de siembra (árboles/ha) por vigor. GROUNDED-PENDIENTE: cambia con la
 * variedad, el patrón y si es huerto denso o árbol de solar; se aterriza con el
 * catálogo/AGE y el agente. Se muestra el RANGO orientador, no un número exacto.
 */
export const DISTANCIA_SIEMBRA_MANGO = {
  orientador: '8 a 10 m entre árboles (hasta 10×10 m en criollo vigoroso)',
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'AGROSAVIA — densidades por variedad, patrón y sistema (huerto vs. solar), vía catálogo/AGE',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 2 · PISO TÉRMICO Y AGUA (honestidad térmica)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Bandas de piso térmico del mango — el corazón HONESTO del mundo. GROUNDED
 * (AGROSAVIA, ecofisiología del mango): es cultivo de tierra cálida; el óptimo
 * está por debajo de ~1200 msnm. Entre ~1200 y ~1600 es arriesgado (florece y
 * cuaja mal, más enfermedad); por encima de ~1800 NO produce (el frío no deja
 * florecer). Se dice claro: a la finca alta y fría, el mango NO le va.
 * @type {{id:string,rango:string,estado:'optimo'|'marginal'|'no_va',titulo:string,detalle:string}[]}
 */
export const PISO_TERMICO_MANGO = [
  {
    id: 'calido',
    rango: '0 – 1200 msnm',
    estado: 'optimo',
    titulo: 'Tierra caliente — aquí sí',
    detalle: 'Es su piso. Calor parejo, sol fuerte y una temporada seca marcada: el mango florece bien, cuaja y carga. Valles del Magdalena, Tolima, Huila, la Costa, los Llanos.',
  },
  {
    id: 'medio',
    rango: '~1200 – 1600 msnm',
    estado: 'marginal',
    titulo: 'Tierra templada — arriesgado',
    detalle: 'En el borde: puede dar, pero florece y cuaja disparejo, la cosecha es menor y la antracnosis pega más duro por la humedad. Escoja variedad y sitio soleado con mucho cuidado; no espere una cosecha de tierra caliente.',
  },
  {
    id: 'frio',
    rango: 'por encima de ~1800 msnm',
    estado: 'no_va',
    titulo: 'Tierra fría — no va',
    detalle: 'A esta altura el mango NO produce: el árbol hasta puede vivir de adorno, pero el frío no lo deja florecer ni cuajar fruta. No gaste plata ni tiempo sembrándolo aquí — para el clima frío hay otros frutales (feijoa, curuba, mora, tomate de árbol).',
  },
];

/** Nota de piso térmico (honestidad de fuente). */
export const PISO_TERMICO_NOTA =
  'El mango es de TIERRA CÁLIDA (óptimo por debajo de ~1200 msnm). Estas franjas son orientadoras y cambian por región y microclima (una ladera abrigada y soleada rinde más que un cañón húmedo a la misma altura). La regla no cambia: entre más frío, menos mango.';

export const PISO_TERMICO_FUENTE = 'AGROSAVIA (perennialCycles: mangifera_indica, confianza media)';

/** Luz y agua del mango (cualitativo). GROUNDED: AGROSAVIA. */
export const AGUA_LUZ_MANGO = {
  titulo: 'Pleno sol y una seca que lo despierte',
  puntos: [
    'Pleno sol: el mango es un árbol de plena luz, no de sombra. A la sombra crece pero casi no carga.',
    'Necesita una temporada SECA marcada para florecer bien: el estrés seco es lo que dispara la flor. Sin seca, echa hoja pero poca flor.',
    'La lluvia en plena floración es su peor enemiga: bota la flor y dispara la antracnosis. Por eso florece mejor donde la seca es clara.',
    'Riego de apoyo en el llenado del fruto (si hay con qué), pero suelo que DRENE: el encharcado le pudre la raíz.',
  ],
  fuente: 'AGROSAVIA',
};

/**
 * Buenas vecinas del mango (otros árboles de tierra cálida). GROUNDED: es el
 * `compatible_with` de mangifera_indica en el grafo. NO se agregan especies que
 * el grafo no respalde.
 */
export const VECINAS_MANGO = [
  { id: 'caimito', nombre: 'Caimito', cientifico: 'Chrysophyllum cainito', nota: 'Árbol frutal de tierra cálida, buena compañía de solar.' },
  { id: 'mamey', nombre: 'Mamey', cientifico: 'Mammea americana', nota: 'Frutal grande de clima caliente que comparte el mismo piso térmico.' },
  { id: 'mamoncillo', nombre: 'Mamoncillo', cientifico: 'Melicoccus bijugatus', nota: 'Frutal costeño de tierra cálida, otro árbol de sombra y fruta.' },
  { id: 'hobo', nombre: 'Hobo (jobo)', cientifico: 'Spondias dulcis', nota: 'Pariente del mango (misma familia): fruta ácida-dulce de tierra caliente.' },
  { id: 'stylosanthes', nombre: 'Stylosanthes', cientifico: 'Stylosanthes guianensis', nota: 'Leguminosa forrajera de cobertura: tapa el suelo, fija nitrógeno y controla maleza al pie del árbol.' },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 3 · FLORACIÓN Y CUAJE
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * El ciclo flor→fruto del mango. GROUNDED del grafo (perennialCycles.
 * mangifera_indica): régimen ESTACIONAL, una cosecha marcada al año; floración
 * hacia ago–oct y recolección nov–dic en el Tolima (cambia por región);
 * disparada por temperatura, radiación y estado hídrico (la seca); primera
 * cosecha a los 3–5 años (injertado).
 */
export const CICLO_FLOR_MANGO = {
  primeraCosechaAnios: [3, 5],
  regimen: 'estacional (una cosecha marcada al año)',
  floracion: 'agosto–octubre',
  cosecha: 'noviembre–diciembre',
  altitud: 'Tierra cálida, óptimo bajo ~1200 msnm',
  disparador: 'La floración la disparan el calor, el sol y el estrés hídrico de la temporada seca; no un mes fijo del calendario.',
  regionNota: 'Fechas de referencia del Tolima: cambian según la región (en la Costa, los Llanos o el Magdalena medio la temporada cae en otros meses).',
  fuente: 'AGROSAVIA (perennialCycles: mangifera_indica, confianza media)',
  pasos: [
    {
      id: 'floracion',
      titulo: 'La florecida',
      detalle: 'Tras la seca, el árbol se llena de "panojas" (ramilletes) de florecitas. De ahí sale toda la cosecha del año, así que una buena floración vale oro. Si llueve fuerte en este momento, se pierde flor.',
    },
    {
      id: 'cuaje',
      titulo: 'El cuaje (de mucha flor, poca fruta)',
      detalle: 'De miles de flores por panoja cuajan poquitas: es normal. El árbol "bota" el sobrante de fruta chiquita (raleo natural). La antracnosis y la lluvia en floración bajan aún más el cuaje.',
    },
    {
      id: 'llenado',
      titulo: 'El llenado del fruto',
      detalle: 'Los mangos que cuajaron crecen y llenan durante varios meses. Aquí ayuda un riego de apoyo si hay con qué, y cuidar la mosca de la fruta, que ataca cuando el fruto entra en sazón.',
    },
    {
      id: 'sazon',
      titulo: 'Se pone en sazón',
      detalle: 'El hombro del fruto se llena, la cáscara vira de color y el mango pasa de verde-tierno a "sazón" (hecho pero firme). Ese es el punto de cosecha: de ahí termina de madurar en la casa.',
    },
  ],
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 4 · PLAGAS Y MALES (reconocer + manejo agroecológico/MIP)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Los males CLAVE del mango, con foto: la antracnosis (enfermedad #1) y la
 * mosca de la fruta (la plaga que cierra mercados). GROUNDED: son plagas del
 * grafo (pest_controllers de mangifera_indica); los controladores biológicos
 * son los del grafo — NO se inventan enemigos naturales ni dosis químicas.
 */
export const MALES_MANGO = [
  {
    id: 'antracnosis',
    nombre: 'Antracnosis',
    cientifico: 'Colletotrichum gloeosporioides',
    tipo: 'enfermedad (hongo)',
    foto: 'antracnosis',
    plagaGrafo: 'Antracnosis de frutales',
    reconocer: [
      'Manchas negras en la flor, la hoja y el fruto. En floración QUEMA la panoja (por eso cuaja menos): el enemigo #1 del mango en clima húmedo.',
      'En el fruto salen manchas negras hundidas que, al madurar, se pudren y dañan el mango en la mata o ya en la casa.',
      'Pega más fuerte cuando llueve en floración y cuando la copa está cerrada, húmeda y sin ventilar.',
    ],
    manejo: [
      { titulo: 'Florecer en seco y airear la copa', detalle: 'La mejor defensa es cultural: poda para que la copa ventile y le entre luz, y aprovechar la floración de la temporada seca. Menos humedad en la flor = menos antracnosis.' },
      { titulo: 'Hongos y bacterias antagonistas', detalle: 'Trichoderma y bacterias antagonistas (biofungicidas) ayudan a controlar el hongo. Funcionan mejor como parte del manejo, acompañando la poda y el florecer en seco.' },
      { titulo: 'Caldo bordelés protector', detalle: 'El caldo bordelés (cobre + cal) sirve de protección preventiva en floración y cuaje. Es apoyo, no reemplaza la poda ni el buen sitio soleado.' },
    ],
    fuente: 'AGROSAVIA (manejo de antracnosis) · controladores del grafo Chagra',
  },
  {
    id: 'mosca',
    nombre: 'Mosca de la fruta',
    cientifico: 'Anastrepha spp. (y Ceratitis capitata)',
    tipo: 'plaga (mosca)',
    foto: 'mosca',
    plagaGrafo: 'Mosca de la fruta (Anastrepha spp.)',
    reconocer: [
      'Una mosquita pica el fruto en sazón y pone huevos adentro; de ahí salen gusanos y el mango se pudre por dentro y se cae.',
      'Por fuera se ve un pinchacito y a veces una gotita de savia; al abrir el fruto están las larvas.',
      'Es la plaga que CIERRA mercados: sin manejo de mosca no hay exportación ni venta a plazas exigentes.',
    ],
    manejo: [
      { titulo: 'Recoja y entierre la fruta picada', detalle: 'La regla de oro: no deje fruta picada ni caída bajo el árbol — es el criadero. Recójala y entiérrela honda o métala en un pozo tapado. Corta el ciclo de la mosca más que cualquier veneno.' },
      { titulo: 'Trampas con cebo', detalle: 'Trampas caseras con cebo (proteína hidrolizada, melaza) atrapan y avisan cuándo hay mosca, para actuar a tiempo. Sirven para vigilar y para bajar la población.' },
      { titulo: 'Control biológico', detalle: 'Avispitas parasitoides que atacan las larvas y el hongo Beauveria ayudan en el manejo integrado. Acompañan la recolección de fruta, no la reemplazan.' },
      { titulo: 'Embolsar el fruto', detalle: 'En huerto casero o pocas matas, embolsar los frutos en sazón con bolsa de papel/tela los protege de la picada. Trabajoso pero muy efectivo sin veneno.' },
    ],
    fuente: 'ICA / AGROSAVIA (manejo de mosca de la fruta) · controladores del grafo Chagra',
  },
];

/**
 * Otros males del mango (grounded al grafo), en tarjetas compactas sin foto.
 * Son plagas/enfermedades reales del pest_controllers de mangifera_indica.
 */
export const OTROS_MALES_MANGO = [
  {
    id: 'oidio',
    nombre: 'Mildeo polvoso (oídio)',
    tipo: 'enfermedad',
    plagaGrafo: 'Oidio o mildeo polvoso',
    senal: 'Polvillo blanco sobre las flores y los frutos chiquitos; la flor se seca y no cuaja. Ataca en floración con noches frescas.',
    manejo: ['Microorganismos de control biológico', 'Caldo de cola de caballo (refuerzo silíceo)', 'Airear la copa con poda'],
  },
  {
    id: 'acaro-yemas',
    nombre: 'Ácaro de las yemas',
    tipo: 'plaga',
    plagaGrafo: 'Ácaro de las yemas del mango',
    senal: 'Deforma las yemas y los brotes nuevos, que salen achaparrados o en "escoba" y debilitan la floración.',
    manejo: ['Hongo Beauveria', 'Ácaros depredadores (Amblyseius)', 'Poda de brotes muy afectados'],
  },
  {
    id: 'mancha-bacteriana',
    nombre: 'Mancha bacteriana',
    tipo: 'enfermedad',
    plagaGrafo: 'Mancha bacteriana del mango',
    senal: 'Manchas angulosas oscuras con borde grasoso en hoja y fruto, a veces con grietas. Empeora con lluvia y viento fuerte.',
    manejo: ['Bacterias antagonistas (biofungicida)', 'Poda sanitaria de ramas afectadas', 'Cortavientos y buen drenaje'],
  },
  {
    id: 'comejen',
    nombre: 'Comején de frutales',
    tipo: 'plaga',
    plagaGrafo: 'Comején de los árboles frutales',
    senal: 'Caminos de tierra pegados al tronco y ramas huecas; debilita el árbol viejo o estresado.',
    manejo: ['Hongos entomopatógenos (Beauveria, Metarhizium)', 'Lechada de cal en el tronco', 'Sacar ramas muertas donde anida'],
  },
];

/**
 * Nota anti-receta: el módulo NO da dosis de fungicida/insecticida de síntesis.
 * El manejo es agroecológico e MIP (cultural + biológico + biopreparados
 * groundeados). Para el caso puntual de una finca, el agente o el técnico.
 */
export const NOTA_SIN_QUIMICOS_MANGO =
  'Aquí no encontrará dosis de veneno: el manejo del mango es agroecológico e integrado (poda para airear, florecer en seco, recoger la fruta picada, control biológico y biopreparados). Para su caso concreto, hable con el ICA/su técnico o con el agente.';

/** Biopreparados de apoyo del mango. GROUNDED: lechada de cal (grafo) + caldo bordelés / cola de caballo (frutalesFinca). */
export const BIOPREPARADOS_MANGO = ['Lechada de cal en el tronco', 'Caldo bordelés', 'Caldo de cola de caballo'];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 5 · COSECHA Y DESPENSA (poscosecha)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Cosecha y poscosecha del mango. GROUNDED (AGROSAVIA): se cosecha "en sazón"
 * (hecho pero firme) y termina de madurar en la casa; el látex mancha la cáscara
 * (cortar con cabito y escurrir). Al ser UNA cosecha grande al año, la clave es
 * transformar el sobrante — de ahí el enlace a Poscosecha/Almacenamiento.
 */
export const COSECHA_MANGO = {
  punto: {
    titulo: 'El punto: en sazón, no verde-tierno',
    detalle: 'Se coge "en sazón" —hecho pero todavía firme—: el hombro del fruto se llena y el color vira. Cogido verde-tierno queda fibroso y sin dulce; dejado madurar en la mata se broca de mosca y se cae. En sazón, termina de madurar bueno en la casa.',
  },
  latex: {
    titulo: 'Ojo con el látex',
    detalle: 'Corte dejando un cabito y deje escurrir el fruto boca abajo un rato: el látex que suelta el pedúnculo mancha y quema la cáscara (le salen manchas negras). Manéjelo con cuidado para que el mango llegue bonito.',
  },
  maduracion: {
    titulo: 'Madura a temperatura ambiente',
    detalle: 'De sazón a maduro pasan unos días a temperatura ambiente. El golpe y el sol fuerte lo dañan rápido; guárdelo a la sombra, aireado y sin amontonar para que no se magulle.',
  },
  transformar: {
    titulo: 'Una cosecha grande de una vez: transfórmela',
    resumen: 'El mango da casi todo de una vez, así que se junta más de lo que se vende o se come fresco. Ahí está el negocio: transformarlo para que no se pierda ni se malbarate.',
    puntos: [
      'Pulpa congelada y jugos: la forma más fácil de guardar la cosecha y venderla todo el año.',
      'Mermelada, bocadillo y mango deshidratado (secado): valor agregado que aguanta en la despensa.',
      'Encurtido y "mango biche" (verde con sal y limón): aprovecha hasta el fruto verde que se ralea.',
    ],
    fuente: 'AGROSAVIA / Asohofrucol (poscosecha de mango)',
  },
  fuente: 'AGROSAVIA',
};

/* ────────────────────────────────────────────────────────────────────────
 * FOTOS — créditos de licencia abierta (espejo de /public/mango/creditos.json)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Créditos de las fotos del mundo mango — FUENTE ÚNICA en el componente, espejo
 * de /public/mango/creditos.json (mismo patrón que Café/Frutales). Requisito de
 * las licencias CC-BY/CC-BY-SA: atribución visible. Si una foto no está o no
 * carga, la tarjeta cae con gracia a un ícono.
 * @type {{slug:string,autor:string,licencia:string,licenciaUrl:string,fuenteUrl:string}[]}
 */
export const CREDITOS_FOTOS_MANGO = [
  { slug: 'arbol', autor: 'Prathamesh Desai', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Mango_Tree.jpg' },
  { slug: 'flor', autor: 'Gihan Jayaweera', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Mangifera_indica_inflorescence.jpg' },
  { slug: 'fruto', autor: 'Ivar Leidus', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Mango_fruit_Nam_Dok_Mai.jpg' },
  { slug: 'antracnosis', autor: 'Knowledge Center', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Mango-anthracnose.jpg' },
  { slug: 'mosca', autor: 'Jeffrey W. Lotz (FDACS)', licencia: 'CC BY 3.0 us', licenciaUrl: 'https://creativecommons.org/licenses/by/3.0/us/deed.en', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Anastrepha_ludens_5179020.jpg' },
  // Fotos REUTILIZADAS del mundo "Frutales" (ya en el bundle): igual llevan
  // atribución visible aquí, por ser CC BY-SA.
  { slug: 'arbol-ladera', autor: 'CEphoto, Uwe Aranas', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Paitan_Sabah_Common-mango-Mangifera-indica-01.jpg' },
  { slug: 'injerto', autor: 'Sorruno', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Injerto_de_yema.JPG' },
];

/** Autores de las fotos reutilizadas (para la atribución visible en el badge). */
export const CREDITO_ARBOL_LADERA = 'CEphoto, Uwe Aranas';
export const CREDITO_INJERTO = 'Sorruno';
