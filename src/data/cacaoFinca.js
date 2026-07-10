/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * cacaoFinca — contenido del mundo "El cacao" (Theobroma cacao L.).
 *
 * CULTIVO BANDERA del cacaotero colombiano, ligado a la paz y a la sustitución
 * de cultivos de uso ilícito. Este archivo es la FUENTE ÚNICA de contenido de
 * la pantalla CacaoScreen: nada se inventa aquí. Cada cifra y cada práctica está
 * groundeada en el catálogo/grafo de Chagra y en las autoridades del gremio:
 *
 *   - public/cycle-content/theobroma_cacao.json  (POWO Kew, GBIF, FAO Ecocrop,
 *     AGROSAVIA Tibaitatá, ICA Resolución 3168/2015).
 *   - src/data/perennialCycles.js → theobroma_cacao (Fedecacao, Agrosavia).
 *   - src/data/asociaciones-arquetipos.json → saf_cacao  +  asociaciones-
 *     comparativa.json → cacao-saf  (sistema agroforestal, DR con DOI).
 *   - catalog/chagra-kg-graph-snapshot.json → nodos de plaga
 *     moniliophthora_roreri (monilia) y moniliophthora_perniciosa (escoba de
 *     bruja): síntoma, umbral de acción y manejo agroecológico de Agrosavia /
 *     Fedecacao / SciELO Colombia.
 *
 * NO hay dosis químicas inventadas: el manejo de las enfermedades es cultural y
 * sanitario. Donde el grafo registra un producto químico, se nombra SOLO como
 * "de registro ICA" y sin dosis, y siempre después del manejo cultural.
 *
 * Las fotos son reales, de licencia abierta (CC / dominio público), con autor y
 * licencia SIEMPRE visibles (ver public/cacao/creditos.json).
 */

/* ── Fotos (patrón photo-forward, igual que Agua/Almacenamiento) ──────────────
 * Base de la carpeta pública + espejo de public/cacao/creditos.json. El requisito
 * de las licencias CC-BY es autor + licencia + enlace a la fuente, siempre a la
 * vista. El slug es el nombre del archivo .jpg dentro de /public/cacao/. */
export const FOTO_BASE_CACAO = '/cacao';

export const CREDITOS_FOTOS_CACAO = [
  { slug: 'mazorca', autor: 'Pkraemer', lic: 'CC BY-SA 4.0', fuente: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Cocoa_pod.jpg' },
  { slug: 'flor', autor: 'Vitaium', lic: 'CC BY-SA 4.0', fuente: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Cacao_flowers_at_Cau_chocolate_village_Bali.jpg' },
  { slug: 'agroforestal', autor: 'Mvfarrell', lic: 'CC BY-SA 4.0', fuente: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Shade_Cacao_Plantation,_Ixcacao_Mayan_Chocolate,_Belize.JPG' },
  { slug: 'injerto', autor: 'Irene Scott / AusAID', lic: 'CC BY 2.0', fuente: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Cocoa_farmer_Jenny_Kebu_grafting_a_Cocoa_seedling_at_Kebu_farm,_east_of_Honiara._(10687161116).jpg' },
  { slug: 'monilia', autor: 'Jake Rehage (unclecactus)', lic: 'CC0', fuente: 'iNaturalist', url: 'https://www.inaturalist.org/observations/58102409' },
  { slug: 'escoba-bruja', autor: 'Denis Zabin (deniszabin)', lic: 'CC BY 4.0', fuente: 'iNaturalist', url: 'https://www.inaturalist.org/observations/333723904' },
  { slug: 'mazorca-negra', autor: 'Scot Nelson', lic: 'CC0', fuente: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Cacao_black_pod_rot_29064726523.jpg' },
  { slug: 'cosecha', autor: 'Lolay', lic: 'CC BY 2.0', fuente: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Cocoa_Pods_and_Seeds.jpg' },
  { slug: 'fermentacion', autor: 'Scot Nelson', lic: 'CC0', fuente: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Fermentation_of_cacao_seeds.jpg' },
  { slug: 'secado', autor: 'Francesco Veronesi', lic: 'CC BY-SA 2.0', fuente: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Cocoa_beans_drying_Mpenkro_2014_B002a.jpg' },
];

/* ── Estaciones (pestañas) del mundo cacao ──────────────────────────────────── */
export const ESTACIONES_CACAO = [
  { id: 'arbol', titulo: 'El árbol', descripcion: 'Qué es y qué clon sembrar' },
  { id: 'sombra', titulo: 'La sombra', descripcion: 'Cacao bajo monte (SAF)' },
  { id: 'manejo', titulo: 'Siembra y poda', descripcion: 'Injerto, poda y sombra' },
  { id: 'sanidad', titulo: 'Monilia y escoba', descripcion: 'Reconocer y manejar' },
  { id: 'beneficio', titulo: 'Cosecha y beneficio', descripcion: 'Fermentar y secar' },
];

/* ── El árbol: ficha groundeada (theobroma_cacao.json + perennialCycles) ────── */
export const FICHA_CACAO = {
  nombreCientifico: 'Theobroma cacao L.',
  familia: 'Malvaceae',
  origen: 'Nativo de la cuenca amazónica.',
  porte: 'Árbol perenne, 4–8 m, cauliflor: sus flores y frutos brotan del propio tronco y las ramas gruesas.',
  // Requisitos del cycle-content (óptimo 200–900, tolera hasta 1.200; T 22–28).
  altitud: 'Zona cálida húmeda: de 0 a 1.200 msnm (le va mejor entre 200 y 900).',
  temperatura: 'Entre 22 y 28 °C. Por debajo de 10 °C se hiela y muere.',
  luz: 'De sombra: crece bajo el monte, no le gusta el sol pleno todo el día.',
  agua: 'Necesita humedad alta y suelos con buen drenaje (no encharcados).',
  primeraCosecha: 'Da la primera cosecha entre los 2 y 5 años (más pronto por injerto).',
  fuente: 'FEDECACAO, AGROSAVIA, FAO Ecocrop, POWO Kew, ICA Resolución 3168/2015.',
};

/** Colombia cacaotera — dónde se da y por qué importa (valor_pedagogico + país). */
export const CACAO_PAIS = {
  regiones:
    'Se siembra en Santander (San Vicente de Chucurí, Rionegro, Landázuri — primer productor del país), el Magdalena Medio antioqueño, Huila, Tolima, Arauca, Meta y el Pacífico (Tumaco, Buenaventura).',
  finoDeAroma:
    'Colombia es país de origen de cacaos finos de aroma reconocidos por la ICCO: bien fermentado y bien secado, su cacao vale más.',
  paz:
    'El cacao es cultivo bandera de la paz y la sustitución: es lícito, perenne, se cosecha todo el año y sostiene familias campesinas donde antes hubo coca.',
  fuente: 'FEDECACAO, AGROSAVIA, ICCO.',
};

/**
 * Variedades y clones — familias genéticas + clones de registro.
 * Se describen de forma CUALITATIVA (para qué sirve cada familia); NO se inventan
 * rendimientos por clon. Los clones nombrados son de registro ICA/FEDECACAO.
 */
export const GRUPOS_GENETICOS = [
  {
    id: 'criollo',
    nombre: 'Criollo',
    etiqueta: 'Fino de aroma',
    detalle: 'El cacao ancestral americano: grano de gran sabor y aroma (fino de aroma), pero delicado y poco productivo. Muy susceptible a las enfermedades.',
    tono: 'ambar',
  },
  {
    id: 'forastero',
    nombre: 'Forastero',
    etiqueta: 'Rústico',
    detalle: 'El más rústico y productivo, de sabor más fuerte y menos fino. Es la base de la mayor parte del cacao del mundo.',
    tono: 'tierra',
  },
  {
    id: 'trinitario',
    nombre: 'Trinitario',
    etiqueta: 'Híbrido',
    detalle: 'Cruce natural de criollo con forastero: junta algo del aroma del criollo con el vigor del forastero. La mayoría de los clones comerciales son trinitarios.',
    tono: 'chocolate',
  },
];

export const CLONES_CACAO = [
  { id: 'ccn51', nombre: 'CCN-51', tipo: 'Alto rendimiento', detalle: 'Clon muy productivo y tolerante, de grano ordinario. La “columna vertebral” productiva de muchas fincas; se mezcla con clones finos para no perder calidad.' },
  { id: 'ics', nombre: 'ICS (ICS-1, ICS-95…)', tipo: 'Trinitario fino', detalle: 'Selecciones del Imperial College (Trinidad): trinitarios de buen aroma, muy usados como clon de calidad.' },
  { id: 'regionales', nombre: 'Clones regionales', tipo: 'Colombianos', detalle: 'Materiales seleccionados en el país (por ejemplo FEAR-5, FSA, FLE, EET-8 y las series TCS de AGROSAVIA) por su tolerancia a monilia y su adaptación a cada zona.' },
];

export const CLONES_NOTA =
  'Siembre siempre clon de registro ICA/FEDECACAO y combine varios: mezclar clones tolerantes con clones finos de aroma da producción, calidad y menos riesgo de que una enfermedad se lleve todo el lote.';

/* ── La sombra: sistema agroforestal (saf_cacao + comparativa cacao-saf) ─────── */
/**
 * Estratos del cacao bajo sombra. Groundeado en asociaciones-arquetipos.json
 * (saf_cacao) y en el valor_pedagogico del cycle-content. El cacao va al medio;
 * el plátano es sombra provisional de los primeros años; las leguminosas dan
 * sombra + nitrógeno; el maderable es el estrato alto de largo plazo.
 */
export const ESTRATOS_SAF = [
  { id: 'maderable', estrato: 'Estrato alto (emergente)', planta: 'Maderables', ejemplos: 'Nogal cafetero (Cordia alliodora), cedro (Cedrela odorata)', rol: 'Sombra alta y madera a largo plazo; ingreso extra sin quitarle el lote al cacao.' },
  { id: 'leguminosa', estrato: 'Estrato alto (servicio)', planta: 'Leguminosas de sombra', ejemplos: 'Guamo (Inga edulis), cámbulo/písamo (Erythrina poeppigiana), matarratón (Gliricidia sepium)', rol: 'Sombra permanente + fijan nitrógeno; su poda es mantillo y abono para el cacao.' },
  { id: 'platano', estrato: 'Estrato temporal', planta: 'Plátano', ejemplos: 'Plátano (Musa AAB)', rol: 'Sombra provisional los primeros ~3 años y comida/venta mientras el cacao entra a producir.' },
  { id: 'cacao', estrato: 'Estrato medio', planta: 'Cacao', ejemplos: 'Theobroma cacao', rol: 'El cultivo principal, protegido bajo la sombra de los demás.' },
];

/** Qué gana la finca con el cacao bajo sombra (comparativa cacao-saf, confianza alta). */
export const SAF_BENEFICIOS = [
  { id: 'sistema', titulo: 'Más produce el sistema entero', detalle: 'Cada árbol de cacao a la sombra puede dar un poco menos que a pleno sol, pero el lote completo (cacao + plátano + frutos + madera) produce mucho más por hectárea.' },
  { id: 'carbono', titulo: 'Guarda más carbono y humedad', detalle: 'El monte sobre el cacao guarda varias veces más carbono que el monocultivo y sostiene la humedad que el cacao necesita.' },
  { id: 'nitrogeno', titulo: 'Menos fertilizante comprado', detalle: 'Las leguminosas de sombra fijan nitrógeno del aire: parte del abono nitrogenado lo pone el sistema, no el bolsillo.' },
  { id: 'sanidad', titulo: 'Sombra bien manejada = menos enfermedad', detalle: 'La clave es regular la sombra: demasiada encierra humedad y dispara la monilia; muy poca estresa el cacao. Ni sol pelado ni monte cerrado.' },
];

export const SAF_FUENTE =
  'AGROSAVIA / FEDECACAO; comparativa de asociaciones Chagra (cacao en sistema agroforestal, confianza alta).';

/* ── Siembra, injerto y poda (propagation + valor_pedagogico) ────────────────── */
export const PROPAGACION_CACAO = [
  {
    id: 'semilla',
    titulo: 'Por semilla',
    detalle: 'La semilla del cacao es recalcitrante: pierde el poder de germinar en 1 o 2 semanas si se seca. Se siembra recién sacada del fruto. Sirve para sacar el patrón (el “pie”), pero la mata que nace no repite fielmente al árbol madre.',
  },
  {
    id: 'injerto',
    titulo: 'Por injerto (lo recomendado)',
    detalle: 'Se injerta una yema o púa de un clon élite (de registro ICA/FEDECACAO) sobre un patrón franco criado de semilla. Es el estándar comercial: asegura productividad, tolerancia a la monilia y que todo el lote sea parejo. Además entra a producir más pronto.',
  },
];

/** Podas del cacao (valor_pedagogico + manejo de las plagas: aireación/luz). */
export const PODAS_CACAO = [
  { id: 'formacion', titulo: 'Poda de formación', cuando: 'En la mata joven', detalle: 'Deja una copa baja y bien repartida (3–4 ramas madre) para trabajar y cosechar parado, sin escalera.' },
  { id: 'mantenimiento', titulo: 'Poda de mantenimiento', cuando: 'Dos veces al año', detalle: 'Quita chupones, ramas cruzadas y lo seco. Abre luz y aire dentro del árbol: eso solo ya baja la humedad donde se pega la monilia.' },
  { id: 'sanitaria', titulo: 'Poda sanitaria', cuando: 'Cuando aparezca la enfermedad', detalle: 'Corta y saca escobas de bruja, ramas enfermas y cojines dañados. Es parte del control, no un lujo.' },
  { id: 'sombra', titulo: 'Regular la sombra', cuando: 'Todo el año', detalle: 'Podar los árboles de sombra para que entre luz moteada. El objetivo es sombra pareja, ni monte cerrado ni sol pelado.' },
];

/* ── Enfermedades clave: monilia y escoba de bruja (nodos del grafo) ─────────── */
/**
 * Todo groundeado en catalog/chagra-kg-graph-snapshot.json (Pest). El manejo es
 * CULTURAL/SANITARIO. La mención al cobre es solo "de registro ICA", sin dosis y
 * después del manejo cultural (el grafo lo lista como químico de menor toxicidad
 * para escoba de bruja; Chagra no inventa recetas ni cantidades).
 */
export const ENFERMEDADES_CACAO = [
  {
    id: 'monilia',
    foto: 'monilia',
    nombre: 'Monilia (moniliasis)',
    cientifico: 'Moniliophthora roreri',
    tambien: 'También le dicen “moho del cacao”.',
    ataca: 'Ataca solo la mazorca (el fruto), en cualquier edad.',
    // sintoma_clave del nodo, en orden campesino.
    comoSeVe: [
      'Mazorcas jóvenes que maduran a destiempo o salen con bombas/joroba (abultamientos).',
      'Luego una mancha color café (chocolate) que va creciendo sobre la mazorca.',
      'Sobre esa mancha aparece un polvo blanco que se vuelve cremoso: son millones de esporas.',
      'Por dentro la mazorca está podrida y aguada, y pesa más de lo normal.',
    ],
    umbral: 'Si más del 2% de las mazorcas del lote salen enfermas, ya toca meterle rondas parejas.',
    impacto: 'Sin manejo se puede llevar cerca del 40% de la cosecha en Colombia, y hasta el 100% en un lote descuidado.',
    manejo: [
      'Ronda sanitaria cada 7 a 15 días: recoja TODA mazorca con síntomas, esté en el árbol o en el suelo.',
      'Sáquelas del cultivo o entiérrelas/cúbralas: una mazorca con polvo blanco tirada en el suelo sigue contagiando cerca de 30 días.',
      'Pode para que entre luz y aire y baje la humedad; maneje la sombra y los drenajes.',
      'Siembre clones tolerantes.',
      'El Trichoderma (hongo bueno) ayuda como complemento — nunca reemplaza la recolección.',
    ],
    fuente: 'AGROSAVIA (La moniliasis del cacao), FEDECACAO, SciELO Colombia.',
  },
  {
    id: 'escoba-bruja',
    foto: 'escoba-bruja',
    nombre: 'Escoba de bruja',
    cientifico: 'Moniliophthora perniciosa',
    tambien: 'Prima de la monilia: es del mismo grupo de hongos.',
    ataca: 'Ataca los brotes tiernos, los cojines florales y también las mazorcas.',
    comoSeVe: [
      'Los brotes se hinchan y disparan un montón de ramitas juntas, deformes: una “escoba”.',
      'Esa escoba primero está verde e hinchada; después se seca y queda café, tiesa, colgando.',
      'En los cojines florales daña las flores y los frutos que venían.',
      'Con la humedad, sobre las escobas secas salen honguitos rosados (los cuerpos del hongo).',
    ],
    umbral: 'Cero tolerancia con los brotes. Si aparece el 5% de frutos afectados, remoción intensiva ya.',
    impacto: 'Deforma el árbol y le tumba la producción; si no se corta, se riega por todo el lote.',
    manejo: [
      'Poda fitosanitaria: corte y saque TODAS las escobas y brotes enfermos, mejor en tiempo seco.',
      'Ronda semanal quitando brotes y frutos con escoba; sáquelos del cultivo.',
      'Maneje la sombra y ventile el árbol con la poda.',
      'Fertilización balanceada y clones tolerantes para un árbol fuerte.',
      'El control es cultural. Donde se use cobre, que sea producto con registro ICA y con asesoría técnica — Chagra no da dosis.',
    ],
    fuente: 'AGROSAVIA, FEDECACAO.',
  },
];

/**
 * Otras plagas de la mazorca — grounding curado del DR
 * grounding-cacao-plagas-colombia (gemini, 2026-06-19), verificado contra
 * AGROSAVIA/Crossref. NO son hongos como la monilia: son INSECTOS que perforan
 * o raspan el fruto. El manejo sigue siendo cultural y sanitario (recolección,
 * embolsado/solarización, control biológico) — Chagra no da dosis de veneno.
 *
 * El barrenador (Carmenta foraseminis) tiene DOI real verificado; el trips
 * (Selenothrips rubrocinctus) es de menor peso y su cifra fina queda como
 * "dato en camino".
 */
export const OTRAS_PLAGAS_CACAO = [
  {
    id: 'barrenador',
    nombre: 'Barrenador del fruto y la semilla',
    cientifico: 'Carmenta foraseminis',
    tambien: 'Perforador de la mazorca (Lepidoptera: Sesiidae).',
    ataca: 'La larva barrena por dentro la mazorca y daña el grano.',
    comoSeVe: [
      'Perforaciones en la cáscara de la mazorca con excretas granuladas afuera (los campesinos le dicen la “peca”).',
      'Por dentro, granos comidos y dañados: se cae el peso y la calidad del grano comercial.',
    ],
    umbral: 'En Antioquia llega a llevarse cerca del 30% del grano comercial, y en lotes descuidados hasta el 50%.',
    manejo: [
      'Recoja seguido las mazorcas picadas y sáquelas del cultivo; no deje cacota (residuo de cosecha) regada.',
      'Embolse o solarice las mazorcas infestadas, o entiérrelas bien: se corta el ciclo de la plaga.',
      'Trampas McPhail con proteína hidrolizada para monitorear.',
      'Control biológico con la avispita Trichogramma (parasita los huevos).',
    ],
    fuente:
      'AGROSAVIA — Carabalí Muñoz, Senejoa Lizcano y Montes Prado (2018), “Reconocimiento, daño y opciones de manejo de Carmenta foraseminis…”, DOI 10.21930/agrosavia.manual.7402599 (verificado Crossref).',
  },
  {
    id: 'trips',
    nombre: 'Trips del cacao',
    cientifico: 'Selenothrips rubrocinctus',
    tambien: 'Trips de banda roja.',
    ataca: 'Raspa y chupa la mazorca y el follaje.',
    comoSeVe: [
      'Bronceado o plateado en la cáscara de la mazorca y en las hojas, con puntico oscuro (sus excretas).',
      'En ataques fuertes la mazorca se mancha y el brote se reseca.',
    ],
    umbral: {
      estado: 'dato en camino',
      fuentePrevista: 'AGROSAVIA / ICA — umbral de acción del trips en cacao (grounded pendiente)',
    },
    manejo: [
      'Elimine residuos de cosecha infestados; embolse o solarice las mazorcas afectadas.',
      'Favorezca los enemigos naturales (parasitoides de huevos) manejando bien la sombra y sin venenos que los maten.',
    ],
    fuente: 'AGROSAVIA / ICA (manejo fitosanitario del cacao). Confianza media.',
  },
];

export const OTRAS_PLAGAS_CACAO_FUENTE =
  'AGROSAVIA, ICA — DR grounding-cacao-plagas-colombia (2026-06-19), DOIs verificados. El barrenador se maneja recogiendo y sacando lo picado; nada de recetas de veneno.';

/**
 * No confundir — el guard visual del "anti_confusion" del nodo monilia:
 * monilia, escoba de bruja y mazorca negra se manejan distinto, así que primero
 * hay que distinguirlas bien.
 */
export const CACAO_NO_CONFUNDIR = [
  { id: 'monilia', que: 'Monilia', senal: 'Solo en la MAZORCA: mancha café + polvo blanco cremoso encima y bombas/joroba. Por dentro, aguada.', foto: 'monilia' },
  { id: 'escoba', que: 'Escoba de bruja', senal: 'En los BROTES y cojines: ramitas apeñuscadas y deformes que luego se secan como una escoba.', foto: 'escoba-bruja' },
  { id: 'mazorca-negra', que: 'Mazorca negra (pudrición parda)', senal: 'En la mazorca: manchas oscuras y húmedas que la ennegrecen, SIN el polvo blanco de la monilia. Es otro hongo (Phytophthora).', foto: 'mazorca-negra' },
];

export const CACAO_NO_CONFUNDIR_FUENTE =
  'AGROSAVIA / FEDECACAO. Distinguirlas importa: cada una se maneja distinto.';

/* ── Cosecha y beneficio (perennialCycles + valor_pedagogico) ────────────────── */
export const COSECHA_CACAO = {
  cuando: 'El cacao produce todo el año, con dos picos: abril–junio y noviembre–diciembre.',
  punto: 'Coseche la mazorca madura (cambia de color según el clon) — ni verde ni sobremadura. Corte con tijera o media luna sin herir el cojín del tronco: de ahí saldrán las próximas mazorcas.',
  fuente: 'FEDECACAO, AGROSAVIA.',
};

/**
 * El beneficio (poscosecha) — lo que hace la CALIDAD y el PRECIO. Fermentación en
 * cajón + secado, groundeado en el valor_pedagogico (5–7 días, cajones de madera,
 * no plástico; define el perfil de sabor exportable).
 */
export const BENEFICIO_CACAO = [
  {
    id: 'fermentacion',
    foto: 'fermentacion',
    titulo: '1. Fermentación (5–7 días)',
    clave: 'Aquí nace el sabor',
    detalle: 'Se parten las mazorcas, se saca el grano con su baba (mucílago) y se pone a fermentar en CAJONES de madera (no en plástico), tapado con hojas de plátano. Se remueve/voltea cada tanto para que caliente parejo. Sin buena fermentación no hay sabor a chocolate, por muy buen clon que sea.',
  },
  {
    id: 'secado',
    foto: 'secado',
    titulo: '2. Secado',
    clave: 'Aquí se guarda la calidad',
    detalle: 'El grano fermentado se seca despacio (al sol en tendal o marquesina), moviéndolo, hasta que suene quebradizo. Secar de afán o mal fermentado da grano ácido o mohoso — y ahí se cae el precio.',
  },
];

export const BENEFICIO_CIERRE =
  'La fermentación y el secado son los que definen que su cacao sea fino de aroma y valga más. El clon pone el potencial; el beneficio lo cumple o lo pierde.';
export const BENEFICIO_FUENTE = 'FEDECACAO, AGROSAVIA, ICCO.';

/**
 * La cáscara y la baba como abono — enlaza al mundo "Del corral al abono".
 * Groundeado: "fertilización con compost + pulpa fermentada del propio cacao +
 * ceniza". OJO sanitario: la cáscara de mazorcas ENFERMAS puede cargar inóculo,
 * por eso se composta bien y lejos del cultivo (mismo criterio de la ronda de
 * monilia). El grafo confirma compatible_with cacao ↔ plátano y ↔ leguminosa.
 */
export const CASCARA_ABONO = {
  gancho: 'Nada se bota: la cáscara de la mazorca y la baba del grano vuelven al suelo como abono.',
  puntos: [
    'La cáscara (cascarilla) es la mayor parte del peso de la cosecha: compostada, es abono rico para el mismo cacaotal.',
    'La baba o mucílago que suelta la fermentación también se aprovecha (composta o riego diluido), no se tira a la quebrada.',
    'Súmele ceniza y compost del corral y cierra el ciclo: el cacao alimenta el suelo que lo alimenta.',
  ],
  ojoSanitario:
    'Ojo: la cáscara de mazorcas enfermas de monilia o escoba puede seguir contagiando. Esa se composta bien y LEJOS del cultivo, nunca amontonada al pie de las matas.',
  fuente: 'AGROSAVIA / FEDECACAO (manejo de residuos del beneficio).',
};
