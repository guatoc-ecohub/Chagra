/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (clima, siembra, tutorado, plagas, cosecha y poscosecha de la uchuva),
 * pendiente de migrar a src/config/messages.js — mismo criterio que
 * cafeFinca.js / aguaFinca.js / sanidadData.js.
 */
/**
 * uchuvaFinca.js — CONTENIDO del mundo "La uchuva" (Physalis peruviana L.),
 * la fruta andina de exportación, de CLIMA FRÍO de altura. 6 estaciones del
 * ciclo del cultivo, en el patrón photo-forward de CafeScreen/FrutalesScreen
 * (NO se inventa motor nuevo).
 *
 * REGLA ANTI-ALUCINACIÓN (igual que cafeFinca.js): todo lo CUALITATIVO
 * (piso térmico, prácticas, señales de plaga, punto de cosecha) vive aquí como
 * copy groundeado en fuentes colombianas (AGROSAVIA, ICA, ICONTEC/NTC 4580) y
 * en el grafo. Las CIFRAS DURAS que dependen del sitio (distancia de siembra,
 * dosis, grado exacto de color por destino) NO se inventan: son SLOTS
 * `grounded_pendiente` o se remiten al agente / al análisis de suelo.
 *
 * GROUNDING (public/grafo-relations.json → species.physalis_peruviana y
 * public/cycle-content/physalis_peruviana.json, Tier A AGROSAVIA Manual Uchuva
 * / ICA Res. 3168/2015 / POWO Kew / GBIF):
 *   - nombre_cientifico "Physalis peruviana L.", nombre_comun "Uchuva"
 *     (guchuva, uvilla). establishment_means "introducido" (naturalizada como
 *     cultivo; el género es andino).
 *   - piso térmico: thermal_zones templado+frío; altitud óptima 1800–2800 msnm
 *     (mín. 1200, máx. 3200); temperatura óptima 13–18 °C, helada letal −1 °C.
 *     Sol pleno, drenaje EXCELENTE. → clima FRÍO de altura (contraste con
 *     mango/cítricos, que son de tierra caliente/templada).
 *   - perenne de corta vida (2–3 años productivos); propagación por SEMILLA;
 *     REQUIERE TUTORADO. Variedad más adoptada: AGROSAVIA Andina. Ciclo
 *     productivo 8–10 meses; rendimiento 18–25 t/ha.
 *   - cáliz papiráceo (el "capacho") que envuelve la baya naranja.
 *   - plagas del grafo (pest edges → AFFECTS) y del manual AGROSAVIA:
 *     · "pulgón del algodón" (Aphis gossypii) — con controladores biológicos del
 *       grafo (Beauveria, Verticillium, crisopas, mariquitas, avispas).
 *     · Marchitez vascular por Fusarium (grafo colapsa la etiqueta como "Mal de
 *       Panamá"; la real de la uchuva es Fusarium oxysporum f. sp. physali):
 *       controladores Trichoderma / antagonistas del suelo + drenaje.
 *     · Polilla (Tuta absoluta) y minador de la hoja (Liriomyza huidobrensis):
 *       MIP de AGROSAVIA (monitoreo, trampas, Bt, biológico).
 *   - antagonista (no asociar): arándano Biloxi.
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/** Ruta base de las fotos del mundo uchuva (Wikimedia Commons, licencia abierta). */
export const FOTO_BASE_UCHUVA = '/uchuva';

/** Identidad de la especie (grafo: species.physalis_peruviana). */
export const UCHUVA_ESPECIE = {
  comun: 'Uchuva',
  cientifico: 'Physalis peruviana L.',
  otrosNombres: ['guchuva', 'uvilla', 'aguaymanto'],
  familia: 'Solanáceas (la familia del tomate y la papa)',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIONES (pestañas del mundo)
 * ──────────────────────────────────────────────────────────────────────── */
export const ESTACIONES_UCHUVA = [
  { id: 'clima', titulo: 'Clima y altura', descripcion: 'Por qué es de tierra fría' },
  { id: 'siembra', titulo: 'Semilla y siembra', descripcion: 'Del semillero al lote' },
  { id: 'tutorado', titulo: 'Tutorado y poda', descripcion: 'Párela y despéjela' },
  { id: 'males', titulo: 'Plagas y males', descripcion: 'Reconózcalas sin veneno' },
  { id: 'cosecha', titulo: 'Cosecha y capacho', descripcion: 'El punto por el color' },
  { id: 'poscosecha', titulo: 'Poscosecha', descripcion: 'La fruta de exportación' },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 1 · CLIMA Y ALTURA (el piso térmico frío + la mata)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Piso térmico y requerimientos de clima. GROUNDED (cycle-content Tier A:
 * AGROSAVIA / POWO / GBIF). La uchuva es de FRÍO de altura — al revés del
 * mango y los cítricos.
 */
export const CLIMA_UCHUVA = {
  altitud: '1.800–2.800 msnm (óptimo)',
  altitudRango: 'Aguanta desde ~1.200 y hasta ~3.200 msnm, pero se da mejor entre 1.800 y 2.800.',
  temperatura: '13–18 °C (óptimo)',
  helada: 'La helada la mata: por debajo de −1 °C se quema.',
  sol: 'Sol pleno',
  drenaje: 'Drenaje excelente (no encharcada)',
  fuente: 'AGROSAVIA (Manual de la uchuva) · POWO Kew · GBIF (grafo Chagra, confianza alta)',
};

/**
 * El contraste didáctico: uchuva (frío alto) vs. mango/cítricos (caliente/
 * templado). GROUNDED cualitativo (AGROSAVIA): la uchuva PIDE altura, mientras
 * que la mayoría de frutales tropicales piden calor. Sirve para fincas de
 * altura (p. ej. Choachí) donde el mango no cuaja pero la uchuva sí.
 */
export const CONTRASTE_PISO = {
  titulo: 'Lo que el mango no puede, la uchuva sí',
  puntos: [
    'El mango, los cítricos y el maracuyá son de tierra caliente o templada: quieren calor y les va mal en el frío alto.',
    'La uchuva es al revés: es una planta ANDINA de tierra fría. Entre más alto (dentro de su rango), mejor color, mejor sabor y menos plagas de calor.',
    'Por eso, en fincas de altura como las de Choachí, donde el mango no cuaja, la uchuva encuentra su clima. Cada piso térmico tiene su fruta.',
  ],
  fuente: 'AGROSAVIA (pisos térmicos y aptitud de cultivos)',
};

/** La mata: perenne de corta vida, arbusto con el capacho como firma. */
export const MATA_UCHUVA = [
  {
    id: 'perenne',
    titulo: 'Un arbusto perenne, pero de vida corta',
    detalle: 'La uchuva no es una mata de un solo corte: es un arbusto perenne. Pero rinde bien solo 2 o 3 años; después conviene renovar el lote. Crece rápido y ramifica mucho, por eso pide tutorado y poda.',
  },
  {
    id: 'capacho',
    titulo: 'El capacho: su marca de nacimiento',
    detalle: 'Cada fruta viene envuelta en un cáliz de papel —el "capacho" o "cáliz papiráceo"—, esa farolita que la protege del sol, la lluvia y los insectos. El capacho es lo que hace única a la uchuva y lo que define su punto de cosecha.',
  },
  {
    id: 'familia',
    titulo: 'Pariente del tomate y la papa',
    detalle: 'Es una solanácea: prima del tomate, la papa y el lulo. Por eso comparte con ellos algunas plagas y enfermedades (pulgones, Fusarium), y por eso NO se debe sembrar seguido en el mismo suelo donde hubo papa o tomate enfermos.',
  },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 2 · SEMILLA Y SIEMBRA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Del semillero al lote. GROUNDED (AGROSAVIA Manual Uchuva): propagación por
 * SEMILLA; variedad más adoptada AGROSAVIA Andina; suelo con drenaje
 * excelente, sol pleno. La distancia/densidad exacta depende del sistema de
 * tutorado → grounded_pendiente (no se inventa un número).
 */
export const PASOS_SIEMBRA = [
  {
    id: 'semilla',
    titulo: 'Semilla y variedad',
    detalle: 'La uchuva se propaga por semilla. Use semilla sana de fruta bien madura y sana, o material certificado. La variedad más sembrada en Colombia es la AGROSAVIA Andina, seleccionada para el cultivo comercial.',
  },
  {
    id: 'semillero',
    titulo: 'Semillero primero',
    detalle: 'Se siembra en semillero o bandeja con sustrato limpio y a media sombra. En unas semanas salen las plántulas; se trasplantan al sitio cuando están vigorosas y con varias hojas verdaderas.',
  },
  {
    id: 'suelo',
    titulo: 'Suelo suelto y bien drenado',
    detalle: 'Pide suelo suelto, rico en materia orgánica y —clave— con DRENAJE EXCELENTE: la uchuva no soporta el encharcamiento (es la puerta de entrada del Fusarium). Sol pleno. En ladera, siémbrela a favor del drenaje.',
  },
  {
    id: 'trasplante',
    titulo: 'Al lote, y arriba el tutor',
    detalle: 'Se trasplanta al hoyo con abono orgánico bien descompuesto, sin enterrar el cuello. Desde temprano se le arma el tutorado: una uchuva sin tutor se echa al suelo, se enferma y se pierde la fruta.',
  },
];

/**
 * Distancia/densidad de siembra. GROUNDED-PENDIENTE a propósito: cambia con el
 * sistema de tutorado (en V, colgado, espaldera) y la fertilidad del lote. Se
 * aterriza con el catálogo/AGE y el agente. NO se muestra un número inventado.
 */
export const DENSIDAD_SIEMBRA = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'AGROSAVIA — distancias por sistema de tutorado (en V, colgado, espaldera), vía catálogo/AGE y el agente',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 3 · TUTORADO Y PODA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Por qué y cómo tutorar. GROUNDED (cycle-content: "requiere tutorado para
 * facilitar la cosecha y evitar hongos por humedad"; AGROSAVIA: tutorado
 * vertical + poda de formación). Los sistemas concretos (en V, colgado,
 * espaldera) se describen cualitativamente; no se inventan medidas.
 */
export const TUTORADO_POR_QUE = {
  titulo: 'Sin tutor no hay uchuva',
  puntos: [
    'La mata ramifica mucho y se carga de fruta: sin apoyo, se acuesta en el suelo. Ahí la fruta se ensucia, se pudre y llegan los hongos por la humedad.',
    'Tutorada y aireada, la planta recibe sol y viento parejo: madura mejor, se enferma menos y usted cosecha de pie, sin agacharse a buscar entre el barro.',
    'El tutorado se arma temprano, cuando la mata todavía está chica, para irla guiando a medida que crece.',
  ],
  fuente: 'AGROSAVIA (Manual de la uchuva) · cycle-content (grafo Chagra)',
};

/** Sistemas de tutorado usados en Colombia (cualitativo, sin medidas inventadas). */
export const SISTEMAS_TUTORADO = [
  {
    id: 'en-v',
    nombre: 'En "V" (el más usado)',
    detalle: 'Postes y alambres que abren la mata en forma de V. Deja entrar luz y aire al centro, reparte las ramas y facilita cosechar por los dos lados. Es el sistema más difundido en la sabana.',
  },
  {
    id: 'espaldera',
    nombre: 'Espaldera (en línea)',
    detalle: 'La mata se guía sobre alambres en una sola pared vertical, como el fríjol o la vid. Ordena el lote y ayuda a la ventilación en surcos.',
  },
  {
    id: 'colgado',
    nombre: 'Colgado / individual',
    detalle: 'Cada mata amarrada a un tutor o cuerda que la sostiene desde arriba. Sirve en lotes pequeños o de ladera.',
  },
];

/** Poda de formación y sanitaria (cualitativo). */
export const PODA_UCHUVA = [
  {
    id: 'formacion',
    titulo: 'Poda de formación',
    detalle: 'Se dejan pocos tallos principales (los más fuertes) y se quitan los chupones bajos. Así la planta no se enreda, entra luz y la fuerza va a la fruta y no a puro follaje.',
  },
  {
    id: 'sanitaria',
    titulo: 'Poda y limpieza sanitaria',
    detalle: 'Corte y saque del lote las ramas y hojas enfermas o pegadas al suelo. Menos humedad y menos hojarasca enferma = menos Fusarium y menos plaga. Herramienta limpia entre planta y planta.',
  },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 4 · PLAGAS Y MALES (reconocer + manejo agroecológico/MIP)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Las plagas y enfermedades de la uchuva. Reconocerlas + manejo agroecológico
 * e MIP. Los controladores biológicos del pulgón y del Fusarium son los del
 * grafo (pest_controllers de physalis_peruviana); la polilla y el minador son
 * del manual AGROSAVIA. NO se inventan enemigos naturales ni dosis químicas.
 */
export const MALES_UCHUVA = [
  {
    id: 'pulgon',
    nombre: 'El pulgón',
    cientifico: 'Aphis gossypii y otros áfidos',
    tipo: 'plaga (chupador)',
    plagaGrafo: 'pulgón del algodón',
    reconocer: [
      'Coloniítas de bichos blandos, verdosos o negros, apiñados en los cogollos, el envés de las hojas y los brotes tiernos.',
      'Dejan una melaza pegajosa donde luego crece la fumagina (un tizne negro); la mata se enrosca y se debilita.',
      'Además de chupar, el pulgón puede transmitir virus de una mata a otra.',
    ],
    manejo: [
      { titulo: 'Cuide y siembre a los aliados', detalle: 'Sus enemigos naturales hacen gran parte del trabajo: mariquitas (catarinas), crisopas ("león de áfidos") y avispas parasitoides. Flores y setos vivos alrededor del lote los llaman y los mantienen.' },
      { titulo: 'Control biológico (hongos)', detalle: 'Hay hongos entomopatógenos (Beauveria, Verticillium) que enferman al pulgón. Se usan como refuerzo del control natural, no en vez de él.' },
      { titulo: 'Monitoreo y jabón', detalle: 'Revise los cogollos seguido; los focos tempranos se bajan con lavados de jabón potásico o con la poda del brote atacado. Evite excesos de nitrógeno, que disparan el pulgón.' },
    ],
    fuente: 'Controladores del grafo Chagra (physalis_peruviana) · AGROSAVIA (MIP)',
  },
  {
    id: 'polilla',
    nombre: 'La polilla',
    cientifico: 'Tuta absoluta',
    tipo: 'plaga (larva minadora/perforadora)',
    reconocer: [
      'Una palomilla pequeña cuyas larvas hacen minas (galerías) en las hojas y perforan brotes y frutos.',
      'Es la misma plaga que ataca al tomate (son primos): si tuvo tomate cerca, vigile más.',
      'Frutos perforados = fruta perdida para exportación.',
    ],
    manejo: [
      { titulo: 'Monitoreo con trampas', detalle: 'Trampas de feromona o de luz para saber cuándo y cuánta polilla hay: se maneja lo que se mide, no de oído.' },
      { titulo: 'Bacillus thuringiensis (Bt)', detalle: 'El Bt es un biológico que ataca a las larvas de la polilla sin envenenar la fruta ni a los aliados. Es una de las herramientas del manejo integrado de AGROSAVIA.' },
      { titulo: 'Limpieza y control cultural', detalle: 'Saque del lote hojas y frutos atacados, no deje residuos y rote el cultivo. Cortarle el ciclo baja la plaga sin veneno.' },
    ],
    fuente: 'AGROSAVIA (Manual de la uchuva, MIP)',
  },
  {
    id: 'minador',
    nombre: 'El minador de la hoja',
    cientifico: 'Liriomyza huidobrensis',
    tipo: 'plaga (mosca minadora)',
    reconocer: [
      'Caminos blancos serpenteados ("minas") dibujados dentro de la hoja: son las larvas de una mosquita comiendo entre las dos caras.',
      'Con mucho ataque las hojas se secan y la planta pierde fuerza para llenar la fruta.',
    ],
    manejo: [
      { titulo: 'Avispas parasitoides', detalle: 'Las minas las controlan avispitas parasitoides que atacan a las larvas del minador. El uso de venenos de amplio espectro las mata y empeora la plaga: cuídelas.' },
      { titulo: 'Monitoreo y hojas atacadas', detalle: 'Revise el envés y las hojas bajeras; quite y saque las hojas muy minadas. Trampas amarillas pegajosas ayudan a vigilar el vuelo de los adultos.' },
    ],
    fuente: 'AGROSAVIA (Manual de la uchuva, MIP)',
  },
  {
    id: 'fusarium',
    nombre: 'La marchitez vascular (Fusarium)',
    cientifico: 'Fusarium oxysporum f. sp. physali',
    tipo: 'enfermedad (hongo del suelo)',
    plagaGrafo: 'Mal de Panamá (Fusarium del banano)',
    reconocer: [
      'La mata amarillea, se marchita y se muere de una rama o de todo, aunque el suelo tenga humedad. Al partir el tallo, los conductos por dentro se ven cafés.',
      'Es la enfermedad que MÁS limita la uchuva en Colombia. El hongo vive en el suelo y entra por la raíz, sobre todo si hay encharcamiento o heridas.',
      'Avanza más donde ya hubo uchuva, papa o tomate enfermos (comparten el mal).',
    ],
    manejo: [
      { titulo: 'Drenaje y suelo sano, la base', detalle: 'Es sobre todo un problema de manejo del suelo: drenaje excelente, camas altas, sin encharcar, y rotación (no repetir uchuva/solanáceas en suelo enfermo). Suelo vivo y con materia orgánica resiste más.' },
      { titulo: 'Antagonistas del suelo', detalle: 'Microorganismos antagonistas como Trichoderma y otras bacterias/hongos benéficos ayudan a proteger la raíz. Van con el suelo bien manejado, no lo salvan solos.' },
      { titulo: 'Saque y no disemine', detalle: 'La mata enferma se arranca y se saca del lote; no la deje ni la composte cruda. Limpie herramientas y botas para no llevar el hongo a lotes sanos.' },
    ],
    fuente: 'Arista del grafo Chagra (physalis_peruviana) · AGROSAVIA (marchitez vascular de la uchuva)',
  },
];

/** Nota honesta sobre la etiqueta del grafo para el Fusarium (trazabilidad). */
export const NOTA_FUSARIUM_GRAFO =
  'El grafo etiqueta esta arista como "Mal de Panamá (Fusarium del banano)" por un agrupamiento de sinónimos de Fusarium; en la uchuva el mal real es la marchitez vascular por Fusarium oxysporum f. sp. physali (AGROSAVIA). Es la misma familia de hongo del suelo, no la del banano.';

/**
 * Nota anti-receta: el módulo NO da dosis de fungicida/insecticida de síntesis.
 * El manejo mostrado es agroecológico e MIP (cultural + biológico + biopreparados).
 */
export const NOTA_SIN_RECETAS_QUIMICAS =
  'Aquí no encontrará dosis de veneno: el manejo es agroecológico e integrado (drenaje, tutorado, control biológico, Bt y limpieza). Para su caso concreto, hable con su técnico de AGROSAVIA/ICA o con el agente.';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 5 · COSECHA Y CAPACHO (el punto por el color)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * El ciclo hasta la cosecha y el PUNTO por el color del capacho/fruto.
 * GROUNDED: ciclo 8–10 meses y rendimiento 18–25 t/ha (cycle-content Tier A
 * AGROSAVIA). El "grado de color" es la escala de la NTC 4580 (ICONTEC); el
 * grado exacto según el destino (nacional vs. exportación) = dato en camino.
 */
export const CICLO_COSECHA = {
  aPrimeraCosecha: 'Empieza a producir a los 8–10 meses de sembrada.',
  duracion: 'Un lote rinde bien unos 2–3 años.',
  rendimiento: '18–25 t/ha',
  frecuencia: 'Una vez en producción, se cosecha cada 1–2 semanas: la fruta no madura toda de una.',
  fuente: 'AGROSAVIA (Manual de la uchuva) — grafo Chagra (confianza alta)',
};

/**
 * El punto de cosecha por el COLOR del capacho y del fruto. GROUNDED en la
 * NTC 4580 (norma colombiana de la uchuva): tabla de color por grados. Aquí se
 * describe cualitativamente; el grado exacto por destino = grounded_pendiente.
 */
export const PUNTO_COSECHA = {
  titulo: 'El capacho le dice cuándo',
  puntos: [
    'El punto se lee por el color: el capacho pasa de verde a amarillo pajizo y por dentro la fruta pasa de verde a naranja. Capacho verde = fruta verde; espere.',
    'Para el mercado nacional se cosecha bien madura (capacho amarillo, fruta naranja intensa, dulce). Para exportar se coge un poco antes (más verde-amarillo) para que aguante el viaje.',
    'La norma colombiana NTC 4580 define una tabla de color por grados (del más verde al más naranja) para poner de acuerdo a productor y comprador.',
    'Se corta con capacho, con tijera o a mano con cuidado, sin arrancar la rama. Fruta que se cae al suelo o se maltrata no sirve para exportación.',
  ],
  fuente: 'ICONTEC NTC 4580 (uchuva) · AGROSAVIA',
};

/**
 * Grado de color exacto según destino. GROUNDED-PENDIENTE: depende del mercado
 * (nacional/exportación) y del comprador; se aterriza con la NTC 4580 y el
 * agente. NO se inventa un número de grado.
 */
export const GRADO_COLOR = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'NTC 4580 (tabla de color por grados) + requisito del comprador/destino, vía el agente',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 6 · POSCOSECHA Y EXPORTACIÓN
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * La uchuva como fruta de exportación. GROUNDED (cycle-content Tier A): Colombia
 * es el principal exportador mundial; zonas de Cundinamarca, Boyacá, Antioquia
 * y Nariño entre 1.800 y 2.800 msnm. El "cómo" fino del acopio/frío se remite
 * al mundo de poscosecha y almacenamiento.
 */
export const POSCOSECHA_UCHUVA = {
  intro: 'La uchuva es la fruta estrella de la exportación colombiana: Colombia es el principal exportador del mundo, sobre todo desde Cundinamarca, Boyacá, Antioquia y Nariño, en la tierra fría entre 1.800 y 2.800 msnm. Por eso la poscosecha define la plata: una fruta mal manejada se cae del negocio.',
  pasos: [
    {
      id: 'seleccion',
      titulo: 'Selección y clasificación',
      icono: 'seleccion',
      detalle: 'Apenas cosechada, se separa la fruta por color (grado), tamaño y sanidad. Se descarta la rajada, picada o manchada. La de exportación es la más pareja y sana.',
    },
    {
      id: 'capacho',
      titulo: 'Con capacho o sin capacho',
      icono: 'capacho',
      detalle: 'Buena parte se exporta CON capacho, que protege la fruta y es su sello. Ese capacho debe quedar seco, limpio y entero; también hay mercado de fruta pelada (sin capacho) para proceso. El capacho se seca sin exponer la fruta al sol fuerte.',
    },
    {
      id: 'frio',
      titulo: 'Fresco y frío',
      icono: 'frio',
      detalle: 'Es fruta fresca: pide sombra, manejo suave y cadena de frío para llegar lejos. El calor y los golpes la maduran de más y la dañan. Empaque limpio y ventilado.',
      cuidado: 'Nada de amontonar al sol ni en costal caliente: la fruta se sobremadura y se pierde el lote.',
    },
  ],
  fuente: 'AGROSAVIA / ICA (poscosecha y exportación de uchuva) · cycle-content (grafo Chagra)',
  enlaceMundo: 'poscosecha',
  enlaceLabel: 'Cosechar en punto y guardar sin que se dañe',
};

/* ────────────────────────────────────────────────────────────────────────
 * FOTOS — créditos de licencia abierta (espejo de /public/uchuva/creditos.json)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Créditos de las fotos del mundo uchuva — FUENTE ÚNICA en el componente,
 * espejo de /public/uchuva/creditos.json (mismo patrón que Café/Agua: el JSON
 * público es para auditoría de licencias, este arreglo pinta la UI). Requisito
 * de las licencias CC-BY/CC-BY-SA: atribución visible. Si una foto no carga, la
 * tarjeta cae con gracia a un ícono.
 * @type {{slug:string,autor:string,licencia:string,licenciaUrl:string,fuenteUrl:string}[]}
 */
export const CREDITOS_FOTOS_UCHUVA = [
  { slug: 'cultivo', autor: 'Schlaghecken Josef', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Andenbeere_(Physalis)_Anbau_in_Pfalz-1,_Josef_Schlaghecken.jpg' },
  { slug: 'planta', autor: 'Frank Vincentz', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Kluse_-_Physalis_peruviana_-_Kapstachelbeere_05_ies.jpg' },
  { slug: 'siembra', autor: 'Frank Vincentz', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Kluse_-_Physalis_peruviana_-_Kapstachelbeere_07_ies.jpg' },
  { slug: 'capacho', autor: 'Frank Vincentz', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Kluse_-_Physalis_peruviana_-_Kapstachelbeere_01_ies.jpg' },
  { slug: 'flor', autor: 'AnRo0002', licencia: 'CC0', licenciaUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:20241102Physalis_peruviana3.jpg' },
  { slug: 'cosecha', autor: 'Frank Vincentz', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Kluse_-_Physalis_peruviana_-_Kapstachelbeere_03_ies.jpg' },
  { slug: 'poscosecha', autor: 'Fumikas Sagisavas', licencia: 'CC0', licenciaUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Cape_gooseberry_pods.jpg' },
];
