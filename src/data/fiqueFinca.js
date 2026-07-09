/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (la planta, el manejo, el desfibrado, los usos y el aprovechamiento del fique),
 * pendiente de migrar a src/config/messages.js — mismo criterio que cafeFinca.js
 * / aguaFinca.js.
 */
/**
 * fiqueFinca.js — CONTENIDO del mundo "El fique y las fibras" (5 estaciones).
 *
 * REGLA ANTI-ALUCINACIÓN (igual que cafeFinca.js): todo lo CUALITATIVO (la
 * planta, la propagación, el desfibrado, los usos y el aprovechamiento del
 * bagazo/jugo) vive aquí como copy groundeado en fuentes colombianas. Las CIFRAS
 * DURAS que dependen del sitio (rendimiento de fibra por hectárea, dosis del
 * jugo como repelente, densidades exactas) NO se inventan: son SLOTS
 * `grounded_pendiente` o se remiten al agente. Los rangos productivos (edad de
 * primera cosecha, hojas por planta, vida útil) son valores de referencia
 * presentados COMO RANGO, que varían con el clima, el suelo y el manejo.
 *
 * GROUNDING (public/cycle-content/furcraea_andina.json → catálogo Chagra,
 * fuentes Tier A: GBIF, POWO Kew, Bernal 2015, Pérez Arbeláez 1947, Agrosavia
 * Tibaitatá, SiB Colombia, IAvH):
 *   - Furcraea andina Trel. (Asparagaceae/Agavoideae): xerófita rosetada nativa
 *     andina; laderas 1500–2600 msnm; Santander, Boyacá, Cauca, Nariño, Antioquia.
 *   - Propagación vegetativa por bulbillos aéreos de la panícula o por hijuelos
 *     basales; vivero 6–12 meses; distancia 2.5–3 m (monocultivo) o 1–1.5 m en
 *     seto/cerca viva; cosecha de hojas desde 4–6 años (8–12 hojas/planta/año);
 *     ciclo productivo 15–25 años; rol de cerca viva y productor de biomasa.
 *   - Del corte longitudinal de la penca (desfibrado con macana o desfibradora)
 *     sale 4–5 % de fibra larga blanca (50–150 cm) que se seca al sol y se hila.
 *   - El residuo verde (bagazo/jugo) es rico en sapogeninas esteroidales, sirve
 *     de abono verde y forraje complementario; el JUGO es CONTAMINANTE si va al
 *     agua (alta carga orgánica) → se maneja, no se vierte a la quebrada.
 *
 * PLAGAS: el grafo (public/grafo-relations.json) NO tiene aún aristas
 * AFFECTS/CONTROLS para el fique. Por la regla anti-alucinación NO se inventan
 * plagas ni enemigos naturales: la ficha de sanidad va como "dato en camino".
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/** Ruta base de las fotos del mundo fique (Wikimedia Commons, licencia abierta). */
export const FOTO_BASE_FIQUE = '/fique';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIONES (pestañas del mundo)
 * ──────────────────────────────────────────────────────────────────────── */
export const ESTACIONES_FIQUE = [
  { id: 'planta', titulo: 'La planta y la ladera', descripcion: 'Qué es y por qué cuida el suelo' },
  { id: 'manejo', titulo: 'Cría y manejo', descripcion: 'Cómo se propaga y se sostiene' },
  { id: 'desfibrado', titulo: 'El desfibrado', descripcion: 'De la penca a la fibra' },
  { id: 'usos', titulo: 'Usos y cultura', descripcion: 'Cabuya, empaques y artesanía' },
  { id: 'aprovechar', titulo: 'Bagazo y jugo', descripcion: 'Aprovechar sin contaminar' },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 1 · LA PLANTA Y LA LADERA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Ficha viva del fique. GROUNDED: furcraea_andina.json (catálogo Chagra) +
 * Bernal 2015, Pérez Arbeláez 1947. La altitud sale de requirements.altitud_msnm
 * del catálogo (óptimo 1500–2600 msnm; tolera 800–3000).
 */
export const FICHA_FIQUE = {
  nombreComun: 'Fique (cabuya, penca)',
  cientifico: 'Furcraea andina Trel.',
  familia: 'Asparagaceae (subfamilia Agavoideae)',
  altitud: '1500–2600 msnm (óptimo); aguanta de 800 a 3000',
  zonas: 'Santander, Boyacá, Cauca, Nariño, Antioquia, Cundinamarca y Tolima',
  descripcion:
    'Una roseta gigante de hojas (pencas) gruesas, largas y con dientes en el borde, verdes grisáceas. Vive en las laderas secas y semihúmedas de los Andes. Es planta nativa: la cultivaron los pueblos Muisca, Guane y Lache mucho antes de la llegada española, y de ella sale la cabuya, la fibra vegetal de Colombia.',
  fuente: 'Catálogo Chagra (Furcraea andina) · Bernal 2015 · Pérez Arbeláez 1947',
};

/**
 * Por qué el fique en la ladera cuida el suelo (control de erosión). GROUNDED:
 * roles_in_guild = living_fence + biomass_producer (furcraea_andina.json). El
 * fique se siembra en curvas de nivel y como cerca viva; su raíz y su mata
 * amarran el suelo de la pendiente.
 */
export const LADERA_EROSION = [
  {
    id: 'raiz',
    titulo: 'Amarra la tierra de la pendiente',
    detalle: 'Sembrado en hileras siguiendo la curva de nivel, el fique frena el agua que baja y sujeta el suelo con su mata y sus raíces. En ladera empinada, esas hileras son una barrera viva contra la erosión.',
  },
  {
    id: 'cerca',
    titulo: 'Cerca viva de doble propósito',
    detalle: 'De linderos y cercas, el fique divide el potrero y, a la vez, le da a usted la fibra. No hay que talar monte ni comprar postes: la misma planta es cerca, cortina y cultivo.',
  },
  {
    id: 'rustica',
    titulo: 'Aguanta lo que otros cultivos no',
    detalle: 'Es una planta xerófita: resiste la sequía, el sol fuerte y los suelos pobres y erosionados donde poco más prospera. Por eso sirve para recuperar laderas cansadas mientras da cosecha.',
  },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 2 · CRÍA Y MANEJO
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Cómo se propaga y se levanta el fique. GROUNDED: furcraea_andina.json
 * (propagación por bulbillos aéreos o hijuelos basales; vivero 6–12 meses;
 * distancia 2.5–3 m mono o 1–1.5 m en seto; cosecha desde 4–6 años). Los
 * tiempos son de REFERENCIA (Agrosavia): varían con clima, suelo y manejo.
 */
export const PASOS_MANEJO = [
  {
    id: 'propagacion',
    titulo: 'Se siembra de hijo, no de semilla',
    detalle: 'El fique se multiplica solo, sin semilla: de los "bulbillos" (matitas que le salen en la vara de la flor, miles por planta) o de los hijuelos (rebrotes de la base). Escoja hijos de plantas sanas y buenas fibreras.',
  },
  {
    id: 'vivero',
    titulo: 'Al vivero primero',
    detalle: 'El bulbillo o el hijuelo se cría en bolsa o en era unos 6 a 12 meses, hasta que esté bien enraizado y del tamaño para aguantar el campo. De ahí sale la planta lista para la ladera.',
  },
  {
    id: 'distancia',
    titulo: 'La distancia según para qué',
    detalle: 'Para cultivo, se siembra a unos 2,5–3 m entre matas (la roseta es grande y necesita su espacio). Para cerca viva o barrera contra la erosión, más tupido: 1 a 1,5 m, en hilera siguiendo la curva de nivel.',
  },
  {
    id: 'cosecha',
    titulo: 'La primera cosecha llega despacio',
    detalle: 'El fique es de paciencia: las primeras pencas se cortan a partir de los 4 a 6 años. De ahí en adelante se cortan las hojas de abajo (las maduras) por tandas —del orden de 8 a 12 por planta al año— dejando el cogollo para que siga produciendo.',
  },
];

/**
 * Datos productivos del fique (rango de referencia — Agrosavia). Se muestran
 * como RANGO, no como número fijo: la vida útil real y las hojas por corte
 * dependen del clima, el suelo y el manejo.
 */
export const DATOS_FIQUE = {
  primeraCosechaAnios: [4, 6],
  hojasPorAnio: '8–12 por planta',
  vidaUtilAnios: [15, 25],
  fuente: 'Agrosavia (Tibaitatá) · catálogo Chagra (rangos de referencia)',
};

/**
 * SANIDAD del fique. GROUNDED-PENDIENTE a propósito: el grafo Chagra NO tiene
 * aún aristas AFFECTS/CONTROLS para el fique, así que NO se inventan plagas ni
 * controladores. Lo que sí es firme (planta rústica, poco exigente en sanidad)
 * va como texto; el detalle de plagas y su manejo queda como "dato en camino".
 */
export const SANIDAD_FIQUE = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  resumen: 'El fique es una planta rústica y de pocos problemas: por eso ha sido cultivo de laderas difíciles durante siglos. El detalle de sus plagas y cómo manejarlas —sin veneno— aún se está groundeando en el grafo Chagra; por ahora aparece como dato en camino, para no inventar.',
  puntos: [
    'Lo más común en fibreros es el daño por mal manejo del corte (heridas que pudren la penca) más que una plaga fuerte.',
    'Como en toda la finca: plantas sanas, hijos de matas buenas y suelo vivo son la mejor defensa.',
  ],
  fuentePrevista: 'Grafo Chagra (aristas Pest AFFECTS / bioinsumo CONTROLS del fique) — en camino',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 3 · EL DESFIBRADO (beneficio de la penca → fibra)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * El desfibrado, paso a paso. GROUNDED: furcraea_andina.json (corte longitudinal
 * → 4–5 % de fibra larga blanca de 50–150 cm; secado al sol; rastrillado; hilado).
 * El jugo verde del raspado es el residuo contaminante — se avisa en cada paso
 * que aplica y se desarrolla en la estación 5.
 */
export const PASOS_DESFIBRADO = [
  {
    id: 'corte',
    titulo: 'Cortar la penca madura',
    icono: 'corte',
    detalle: 'Se cortan las hojas de abajo, las maduras (las de arriba, el cogollo, se dejan para que la planta siga). Se cortan al ras y con buen filo para no herir la mata.',
    cuidado: 'Corte solo las maduras y deje el cogollo: una planta pelada de más se debilita.',
  },
  {
    id: 'desfibrado',
    titulo: 'Sacar la fibra (raspar la hoja)',
    icono: 'desfibrado',
    detalle: 'La hoja se "beneficia": se raspa para quitarle la carnaza verde y dejar solo la fibra. A mano se hace con la macana (tradicional, duro pero sin motor); hoy también con desfibradora mecánica, que rinde mucho más. De cada hoja sale apenas un 4–5 % de fibra: el resto es bagazo y jugo.',
    cuidado: 'Ese jugo verde que sale al raspar es el residuo contaminante: recójalo, no lo deje correr a la quebrada (vea "Bagazo y jugo").',
  },
  {
    id: 'lavado',
    titulo: 'Lavar la fibra',
    icono: 'lavado',
    detalle: 'La fibra recién sacada se lava para quitarle la baba y los restos verdes, hasta que quede limpia y clara. El agua del lavado también arrastra carga: manéjela aparte, no directo al cauce.',
    cuidado: 'Las aguas del beneficio llevan jugo: contaminan la quebrada si van directo. Enlaza con el mundo del Agua.',
  },
  {
    id: 'secado',
    titulo: 'Secar al sol y peinar',
    icono: 'secado',
    detalle: 'La fibra limpia se cuelga o se tiende al sol hasta que seca y toma su color blanco-crema. Ya seca, se rastrilla o se peina para dejar las hebras parejas y sueltas, listas para hilar la cabuya.',
    cuidado: 'Fibra guardada húmeda se mancha y se enmohece: se guarda bien seca y aireada.',
  },
  {
    id: 'hilado',
    titulo: 'Hilar la cabuya',
    icono: 'hilado',
    detalle: 'De las hebras peinadas se tuerce el hilo —la cabuya— a mano, con huso o con rueca. Con ese hilo se teje después el costal, el lazo, la mochila o el tapiz. Es el paso donde la fibra se vuelve oficio y cultura.',
    cuidado: null,
  },
];

/** Nota de grounding para los rangos del desfibrado (honestidad de fuente). */
export const DESFIBRADO_FUENTE =
  'Rendimiento de fibra (del orden del 4–5 % del peso de la hoja) y largo de la hebra (50–150 cm): valores de referencia del catálogo Chagra (Furcraea andina) y Agrosavia. Varían con la variedad, la edad de la hoja y el desfibrado (macana vs. máquina).';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 4 · USOS Y CULTURA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Para qué sirve la fibra del fique. GROUNDED: furcraea_andina.json (empaques de
 * café exportación, costales, lazos, alpargatas, mochilas —en mezcla—, tapices,
 * redes; jugo como bioinsumo por sus saponinas). NO se inventan usos nuevos.
 */
export const USOS_FIQUE = [
  {
    id: 'empaques',
    titulo: 'Empaques y costales del café',
    detalle: 'El uso grande: el saco de fibra natural en que Colombia exporta el café, y los costales de la finca. Es fibra fuerte y, a diferencia del plástico, se pudre sin dejar basura. Hoy se reivindica como alternativa nacional al polipropileno importado.',
  },
  {
    id: 'cabuya',
    titulo: 'Cabuya, lazos y alpargatas',
    detalle: 'La cabuya (el hilo de fique) se tuerce en lazos, mecates y cuerdas para amarrar en toda la finca, y es la suela y el tejido de la alpargata tradicional andina.',
  },
  {
    id: 'artesania',
    titulo: 'Mochilas, tapices y artesanía',
    detalle: 'Tejida, la fibra se vuelve mochilas (a veces en mezcla con algodón), tapices, individuales, bolsos y adorno. En pueblos como Curití (Santander) es el oficio y el sustento de muchas familias.',
  },
  {
    id: 'bioinsumo',
    titulo: 'El jugo como bioinsumo',
    detalle: 'El jugo del fique tiene saponinas (jabones naturales): en la tradición campesina se ha usado, diluido, como repelente y protector de otras matas. Es un uso conocido, pero la preparación y la dosis se aterrizan con el agente —aquí no se inventan recetas.',
  },
];

/**
 * El valor cultural del fique. GROUNDED: furcraea_andina.json (domesticado por
 * Muisca/Guane/Lache; identidad santandereano-boyacense; soberanía textil).
 */
export const CULTURA_FIQUE =
  'El fique es patrimonio vivo: fibra nativa domesticada por los pueblos Muisca, Guane y Lache milenios antes de la Colonia, y hoy seña de identidad de Santander y Boyacá. Sembrarlo y beneficiarlo es sostener un oficio y una soberanía textil propia, con una fibra que nace en la ladera y vuelve a la tierra sin contaminar.';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 5 · BAGAZO Y JUGO (aprovechar sin contaminar el agua)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * El aprovechamiento del residuo y el AVISO clave: el jugo del fique contamina
 * el agua si se vierte. GROUNDED: furcraea_andina.json (bagazo rico en
 * sapogeninas esteroidales, forraje complementario y abono verde; el jugo tiene
 * alta carga orgánica). El mensaje ambiental es firme; el "cómo" del compostaje
 * se remite al mundo del abono.
 */
export const BAGAZO_JUGO = {
  aviso: 'Cuidado: el jugo del fique NO va al río',
  avisoDetalle: 'Solo el 4–5 % de la hoja es fibra; el resto —el bagazo verde y el jugo del raspado— es residuo con mucha carga orgánica. Vertido a la quebrada, ese jugo le baja el oxígeno al agua y mata los peces. Es el punto ambiental número uno del fique: no se deja correr al cauce.',
  aprovechamientos: [
    {
      id: 'abono',
      titulo: 'Bagazo → abono verde y compost',
      detalle: 'El bagazo (la carnaza raspada) se composta o se incorpora al suelo como abono verde: devuelve materia orgánica a la ladera de donde salió. Amontonado en fosa y bien manejado, deja de oler y de contaminar y se vuelve tierra.',
    },
    {
      id: 'jugo',
      titulo: 'El jugo, a fosa — nunca al agua',
      detalle: 'El jugo del beneficio se recoge y se maneja en fosa o pozo de infiltración, o se mezcla con el bagazo en el compost. Nunca directo a la quebrada. Así se aprovecha su carga como abono en vez de volverla contaminación.',
    },
    {
      id: 'forraje',
      titulo: 'Forraje y otros aprovechamientos',
      detalle: 'El bagazo también sirve de forraje complementario para algunos animales, y la planta guarda sapogeninas (precursores de hormonas) que la industria ha aprovechado. En la finca, lo práctico es cerrar el ciclo: residuo → abono → suelo.',
    },
  ],
  enlaceMundo: 'agua',
  enlaceLabel: 'Cuidar el agua de la finca',
  enlaceCompostMundo: 'compost',
  enlaceCompostLabel: 'Cómo compostar el bagazo',
  fuente: 'Catálogo Chagra (Furcraea andina) · Agrosavia · Pérez Arbeláez 1947',
};

/**
 * Nota anti-receta / anti-dosis: el módulo NO da dosis químicas ni recetas de
 * jugo/bioinsumo con medidas inventadas. Lo específico, con el agente.
 */
export const NOTA_SIN_RECETAS =
  'Aquí no encontrará dosis inventadas: ni de agroquímicos ni del jugo como bioinsumo. Para su caso concreto —preparación, medidas, su ladera— hable con Agrosavia, su técnico o con el agente.';

/* ────────────────────────────────────────────────────────────────────────
 * FOTOS — créditos de licencia abierta (espejo de public/fique/creditos.json)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Créditos de las fotos del mundo fique — FUENTE ÚNICA en el componente, espejo
 * de /public/fique/creditos.json (mismo patrón que Café/Agua: el JSON público es
 * para auditoría de licencias, este arreglo pinta la UI). Requisito de las
 * licencias CC-BY/CC-BY-SA: atribución visible. Si una foto no carga, la tarjeta
 * cae con gracia a un ícono.
 * @type {{slug:string,autor:string,licencia:string,licenciaUrl:string,fuenteUrl:string}[]}
 */
export const CREDITOS_FOTOS_FIQUE = [
  { slug: 'planta', autor: 'Dick Culbert', licencia: 'CC BY 2.0', licenciaUrl: 'https://creativecommons.org/licenses/by/2.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Furcraea_andina_(9172593946).jpg' },
  { slug: 'cabuya', autor: 'Alejandro Bayer Tamayo', licencia: 'CC BY-SA 2.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/2.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Fique_-_Cabuya_(Furcraea_cabuya)_-_Flickr_-_Alejandro_Bayer.jpg' },
  { slug: 'fibra', autor: 'WRI Staff', licencia: 'CC BY 2.0', licenciaUrl: 'https://creativecommons.org/licenses/by/2.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:SisalFarmDrying.jpg', aproximada: true, nota: 'Fibra de agave (sisal) secandose al sol; ilustra la fibra en bruto. La cabuya de fique se beneficia y seca igual.' },
  { slug: 'artesania', autor: 'Bioversity International', licencia: 'CC BY 2.0', licenciaUrl: 'https://creativecommons.org/licenses/by/2.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Weaving_fique_fibre_for_bags.jpg' },
];
