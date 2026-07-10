/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (usos tradicionales, cultivo y cosecha de la botica medicinal), pendiente de
 * migrar a src/config/messages.js — mismo criterio que aromaticasHuerta.js /
 * cafeFinca.js / aguaFinca.js.
 */
/**
 * boticaCampesina.js — CONTENIDO del mundo "La botica campesina" (la huerta
 * medicinal de la finca andina).
 *
 * ⚖️ REGLA DE ORO — GROUNDING RESPONSABLE + LEGAL (dominio de salud):
 *   1. NUNCA se hacen claims de CURA ni se dan dosis terapéuticas. Todo se
 *      enmarca como USO TRADICIONAL (saber popular citado), no como "medicina".
 *      El lenguaje es "se usa tradicionalmente para acompañar…", nunca "cura".
 *   2. El CULTIVO (piso térmico, altitud, sol/sombra, agua, propagación) está
 *      GROUNDEADO en el catálogo Chagra (public/catalog.sqlite → species +
 *      species_thermal_zones): esos datos salen del catálogo, no inventados.
 *      Cada ficha lleva su `catalogId` real y su bloque `grounded`.
 *   3. Solo se incluyen especies que EXISTEN en el catálogo/grafo. Si un dato de
 *      cultivo no está groundeado, se marca como "dato en camino"
 *      (SlotPendiente), NO se inventa.
 *   4. Se COMPLEMENTA (no duplica) el mundo "Aromáticas y condimentarias" (la
 *      huerta de la cocina): allí van las hierbas del fogón (cilantro, orégano,
 *      poleo…) por su USO DE COCINA. AQUÍ va la BOTICA medicinal. El POLEO se
 *      queda solo en la cocina (allá lleva su propio veto). La YERBABUENA es la
 *      única mata que aparece en ambos mundos, pero SIN duplicar el contenido:
 *      en la cocina va su uso culinario (agua de panela, jugos); aquí va SOLO su
 *      lado de botica (digestiva/calmante) con un `cruce` que remite a la cocina,
 *      más el aviso de NO confundirla con el poleo (abortivo). Ver la ficha
 *      `yerbabuena` (campo `cruce`).
 *   5. Disclaimer visible: saber tradicional, no reemplaza al profesional de la
 *      salud; vetos honestos (ruda abortiva/fototóxica; embarazo, niños,
 *      medicamentos → consultar antes).
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/** Ruta base de las fotos del mundo botica (Wikimedia Commons, licencia abierta). */
export const FOTO_BASE_BOTICA = '/botica';

/**
 * El disclaimer central del mundo — se muestra en la portada y se repite en la
 * estación "Con cuidado". Marca TODO el mundo como saber tradicional, no medicina.
 */
export const DISCLAIMER_BOTICA =
  'Esto es SABER TRADICIONAL de la finca campesina, no medicina ni receta médica. ' +
  'Estas plantas se han usado por generaciones como aguas aromáticas y remedios de la casa ' +
  'para acompañar molestias leves, pero NO curan enfermedades ni reemplazan al médico. ' +
  'Ante una dolencia seria, en el embarazo, con niños pequeños o si toma medicamentos, ' +
  'consulte a un profesional de la salud ANTES de usarlas.';

/* ────────────────────────────────────────────────────────────────────────
 * Diccionarios para traducir los códigos del catálogo a lenguaje del campo.
 * (mismos códigos que aromaticasHuerta.js — el catálogo es la fuente única)
 * ──────────────────────────────────────────────────────────────────────── */
export const SOL_LABEL = {
  sol_pleno: { txt: 'Sol pleno', detalle: 'Quiere el sol el día entero.' },
  sombra_parcial: { txt: 'Media sombra', detalle: 'Aguanta un rato de sombra; no la queme el sol del mediodía.' },
  sombra: { txt: 'Sombra', detalle: 'Prefiere el fresco bajo otras matas.' },
};

export const AGUA_LABEL = {
  bajo: { txt: 'Poca agua', detalle: 'Aguanta la seca; más bien no la ahogue.' },
  medio: { txt: 'Riego con medida', detalle: 'Riego parejo, sin encharcar.' },
  alto: { txt: 'Le gusta la humedad', detalle: 'Suelo siempre fresco; se marchita si se seca.' },
};

export const PISO_LABEL = {
  calido: 'Tierra caliente',
  templado: 'Clima templado',
  frio: 'Tierra fría',
  paramo: 'Páramo',
};

export const PROPAGACION_LABEL = {
  semilla: 'Por semilla',
  esqueje: 'Por esqueje (gajo)',
  division_mata: 'Dividiendo la mata',
  division_rizoma: 'Dividiendo el rizoma (los hijos)',
  estolon: 'Por estolón (guía rastrera)',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIONES (pestañas del mundo) — la botica ordenada por "para qué se usa"
 * (saber tradicional), más cómo cultivarla y una estación de seguridad.
 * ──────────────────────────────────────────────────────────────────────── */
export const ESTACIONES_BOTICA = [
  { id: 'barriga', titulo: 'Barriga y nervios', descripcion: 'Aromáticas para el estómago y la calma' },
  { id: 'piel', titulo: 'Piel y heridas', descripcion: 'Para lavar y en cataplasma' },
  { id: 'gripa', titulo: 'Gripa y tónico', descripcion: 'Para el pecho y la sangre' },
  { id: 'cultivo', titulo: 'Cultivar la botica', descripcion: 'Piso térmico, cosecha y secado' },
  { id: 'cuidado', titulo: 'Con cuidado', descripcion: 'Respeto, vetos y el médico' },
];

/* ────────────────────────────────────────────────────────────────────────
 * LAS PLANTAS DE LA BOTICA
 *
 * `grounded` = lo que sale del catálogo Chagra (verificable, catalogId real).
 * `usoTradicional`, `comoSePrepara`, `cosecha`, `veto` = saber popular
 * campesino, SIEMPRE enmarcado como uso tradicional (no prescripción).
 * ──────────────────────────────────────────────────────────────────────── */
export const PLANTAS_BOTICA = [
  /* ── Barriga y nervios (digestivas y calmantes) ─────────────────────── */
  {
    slug: 'manzanilla',
    grupo: 'barriga',
    nombre: 'Manzanilla',
    cientifico: 'Matricaria chamomilla L.',
    familia: 'Asteraceae',
    catalogId: 'matricaria_chamomilla',
    regionales: ['camomila', 'manzanilla dulce', 'manzanilla común'],
    emoji: '🌼',
    parteUsada: 'La flor',
    usoTradicional:
      'La aromática más conocida de la casa. Tradicionalmente se toma en agua de tiempo después de comer para asentar el estómago pesado y los cólicos, y en la noche para ayudar a coger el sueño y calmar los nervios. Tibia, también se usa para lavar los ojos irritados.',
    comoSePrepara:
      'Agua aromática: un puñado de flores en agua caliente, tapada y dejada reposar un rato. Se cuela y se toma. Nada de hervirla mucho: se le va el aroma.',
    grounded: {
      pisos: ['frio', 'templado'],
      altitudOpt: [800, 2600],
      sol: 'sol_pleno',
      agua: 'bajo',
      propagacion: 'semilla',
      propagacionNota: 'Se resiembra sola con facilidad; la semilla germina con la luz sobre la superficie, así que no la tape de tierra.',
    },
    cosecha: 'Se recoge la flor bien abierta, en día seco y de sol. Se seca a la sombra, extendida y aireada, y se guarda en frasco tapado.',
    veto: null,
  },
  {
    slug: 'cidron',
    grupo: 'barriga',
    nombre: 'Cidrón',
    cientifico: 'Aloysia citrodora Paláu',
    familia: 'Verbenaceae',
    catalogId: 'aloysia_citrodora',
    regionales: ['cedrón', 'hierba luisa', 'verbena olorosa'],
    emoji: '🍋',
    parteUsada: 'La hoja',
    usoTradicional:
      'La hoja huele a limón fresco. Tradicionalmente se toma en agua aromática después de comer para la digestión y los gases, y por la noche como agua de tiempo para relajarse antes de dormir. Es el "aromático de la casa" por excelencia.',
    comoSePrepara:
      'Unas hojas frescas o secas en agua caliente, tapada, dejada reposar. Se toma como aromática, sola o con un toque de miel.',
    grounded: {
      pisos: ['frio', 'templado'],
      altitudOpt: [1500, 2600],
      sol: 'sol_pleno',
      agua: 'medio',
      propagacion: 'esqueje',
      propagacionNota: 'En la finca se saca por gajo (esqueje): una rama tierna prende bien en tierra fresca y a media sombra hasta que enraíza.',
    },
    cosecha: 'Se cortan las ramas con hoja tierna sin desnudar la mata; la hoja se seca a la sombra para que no pierda el aroma y se guarda en frasco cerrado.',
    veto: null,
  },
  {
    slug: 'toronjil',
    grupo: 'barriga',
    nombre: 'Toronjil',
    cientifico: 'Melissa officinalis L.',
    familia: 'Lamiaceae',
    catalogId: 'melissa_officinalis',
    regionales: ['melisa', 'toronjil de olor'],
    emoji: '🌿',
    parteUsada: 'La hoja',
    usoTradicional:
      'Hoja de olor suave a limón y menta. Tradicionalmente se toma en agua aromática para calmar los nervios y el susto, ayudar a dormir y asentar el estómago cuando la molestia viene "de los nervios". Es la compañera de la manzanilla para la noche.',
    comoSePrepara:
      'Un puñado de hojas frescas en agua caliente, tapada, en reposo. Mejor recién cortada, que es cuando más huele.',
    grounded: {
      pisos: ['frio', 'templado'],
      altitudOpt: [1800, 2700],
      sol: 'sombra_parcial',
      agua: 'medio',
      propagacion: 'division_mata',
      propagacionNota: 'Se multiplica fácil dividiendo la mata (separando los macollos con raíz) en cada estación.',
    },
    cosecha: 'Se cortan las hojas jóvenes antes de que florezca, que es cuando tienen más aroma; se secan a la sombra, rápido, para que no se pongan negras.',
    veto: null,
  },
  {
    slug: 'yerbabuena',
    grupo: 'barriga',
    nombre: 'Yerbabuena',
    cientifico: 'Mentha spicata L.',
    familia: 'Lamiaceae',
    catalogId: 'mentha_spicata',
    regionales: ['hierbabuena', 'menta verde', 'yerbabuena criolla'],
    emoji: '🍃',
    parteUsada: 'La hoja',
    // Cruce honesto: es la MISMA mata de la huerta de la cocina, aquí vista por
    // su lado de botica (digestiva y calmante). NO repetimos el uso de cocina
    // (agua de panela, jugos, sancocho): para eso está el mundo de aromáticas.
    cruce: {
      mundo: 'la huerta de la cocina',
      nota: 'Es la misma yerbabuena del agua de panela: allá está su uso de cocina; aquí la vemos por su lado de botica.',
    },
    usoTradicional:
      'La menta criolla de toda casa, mirada por su lado de remedio. Tradicionalmente su agua se toma después de comer para el estómago pesado, los gases y el cólico, y tibia en la noche para calmar los nervios. En la huerta, además, ayuda a repeler plagas y cubre el suelo.',
    comoSePrepara:
      'Agua aromática: unas hojas frescas en agua caliente, tapada y en reposo un rato. Se toma sola o con un toque de miel. Con medida: es suave, pero no es para tomar en exceso.',
    grounded: {
      pisos: ['calido', 'templado', 'frio'],
      altitudOpt: [500, 2600],
      sol: 'sombra_parcial',
      agua: 'alto',
      propagacion: 'estolon',
      propagacionNota: 'Se propaga sola por sus guías rastreras (estolones); es invasora, así que conténgala en una era o matera para que no se tome la huerta.',
    },
    cosecha: 'Se corta la hoja tierna antes de que florezca, que es cuando más huele; se usa fresca o se seca a la sombra, rápido, para que no se ponga negra.',
    veto: 'No la confunda con el POLEO (Mentha pulegium), su parienta de olor parecido: el poleo es ABORTIVO y tóxico para el hígado, la yerbabuena no. Son matas distintas; use solo la que conoce bien. Y aun siendo suave, en mucha cantidad, con reflujo o hernia hiatal, la menta puede caer mal (relaja la boca del estómago): tómela con medida.',
  },

  /* ── Piel y heridas (uso externo) ───────────────────────────────────── */
  {
    slug: 'calendula',
    grupo: 'piel',
    nombre: 'Caléndula',
    cientifico: 'Calendula officinalis L.',
    familia: 'Asteraceae',
    catalogId: 'calendula_officinalis',
    regionales: ['mercadela', 'maravilla', 'margarita dorada', 'caléndula común'],
    emoji: '🌻',
    parteUsada: 'La flor',
    usoTradicional:
      'La flor anaranjada de la casa. Tradicionalmente se usa POR FUERA: el agua de sus flores para lavar raspones, escaldaduras y la piel irritada, y sus flores para preparar ungüentos y cremas caseras para la piel. En la huerta, además, atrae polinizadores y ayuda con nematodos del suelo.',
    comoSePrepara:
      'Uso externo: se hace un agua con las flores, se deja entibiar y se lava la zona por fuera. No es para tomar como remedio.',
    grounded: {
      pisos: ['frio', 'templado'],
      altitudOpt: [1200, 2500],
      sol: 'sol_pleno',
      agua: 'medio',
      propagacion: 'semilla',
      propagacionNota: 'Se resiembra sola con facilidad; sus raíces sueltan sustancias que ayudan a controlar nematodos en el suelo.',
    },
    cosecha: 'Se cosecha la flor bien abierta en día soleado y se seca a la sombra, entera, sobre papel o zaranda; se guarda en frasco tapado lejos de la luz.',
    veto: null,
  },
  {
    slug: 'llanten',
    grupo: 'piel',
    nombre: 'Llantén',
    cientifico: 'Plantago major L.',
    familia: 'Plantaginaceae',
    catalogId: 'plantago_major',
    regionales: ['llantén común', 'llantén mayor'],
    emoji: '🌱',
    parteUsada: 'La hoja',
    usoTradicional:
      'La mata de roseta que nace hasta en el patio pisado. Tradicionalmente su hoja se usa POR FUERA, machacada en cataplasma sobre raspones y picaduras, y en agua para hacer gárgaras y buches cuando raspa la garganta. Es de las plantas de "primeros auxilios" del campo.',
    comoSePrepara:
      'Uso externo: hoja limpia, machacada, puesta sobre la piel; o agua de hojas, entibiada, para gárgaras. No sustituye la atención médica de una herida.',
    grounded: {
      pisos: ['calido', 'frio', 'templado'],
      altitudOpt: [1200, 2400],
      sol: 'sol_pleno',
      agua: 'medio',
      propagacion: 'semilla',
      propagacionNota: 'Hierba de roseta que se riega sola por semilla; es pionera de suelos compactados, por eso aparece en caminos y patios.',
    },
    cosecha: 'Se cortan las hojas sanas de la roseta; se usan frescas para cataplasma o se secan a la sombra para guardar.',
    veto: null,
  },

  /* ── Gripa y tónico (pecho y sangre) ─────────────────────────────────── */
  {
    slug: 'sauco',
    grupo: 'gripa',
    nombre: 'Saúco',
    cientifico: 'Sambucus nigra subsp. peruviana (Kunth) R. Bolli',
    familia: 'Adoxaceae',
    catalogId: 'sambucus_nigra_peruviana',
    regionales: ['saúco andino', 'tilo (nombre local, no es el tilo europeo)'],
    emoji: '🌳',
    parteUsada: 'La flor',
    usoTradicional:
      'Arbusto de flor blanca de los climas fríos y templados. Tradicionalmente su flor se toma en agua de tiempo, bien caliente y sudada, cuando llega la gripa y el resfriado, para el pecho y la tos. Se siembra mucho como cerca viva de la finca.',
    comoSePrepara:
      'Agua de las flores (solo la flor, no el fruto crudo ni el resto de la mata), en infusión caliente. Se toma abrigado.',
    grounded: {
      pisos: ['frio', 'templado'],
      altitudOpt: [2200, 2800],
      sol: 'sol_pleno',
      agua: 'medio',
      propagacion: 'esqueje',
      propagacionNota: 'Su estaca prende con facilidad, por eso sirve para armar cercas vivas funcionales en poco tiempo.',
    },
    cosecha: 'Se cortan los ramilletes de flor recién abiertos, en día seco; se secan a la sombra colgados o sobre papel.',
    veto: 'Use SOLO la flor. Las hojas, la corteza, la raíz y el fruto verde o crudo del saúco pueden caer mal (dan náuseas y malestar): no se toman. Ante una gripa fuerte o fiebre alta, sobre todo en niños, consulte al médico.',
  },
  {
    slug: 'ortiga',
    grupo: 'gripa',
    nombre: 'Ortiga',
    cientifico: 'Urtica dioica L.',
    familia: 'Urticaceae',
    catalogId: 'urtica_dioica',
    regionales: ['ortiga mayor', 'pringamosa', 'chichicaste'],
    emoji: '🌿',
    parteUsada: 'La hoja tierna',
    usoTradicional:
      'La mata que "pringa" (quema) al tocarla, pero que al cocinarla o secarla pierde el ardor. Tradicionalmente se toma en agua aromática como tónico "para la sangre" y se aprovecha la hoja tierna cocida como alimento. En la finca es doble: sirve de remedio de la casa y de abono verde (té de ortiga para las matas).',
    comoSePrepara:
      'Con guantes para cortarla. La hoja se cuece o se seca antes de usar: así pierde el pelo que pringa. Agua de hoja seca como aromática.',
    grounded: {
      pisos: ['frio', 'templado'],
      altitudOpt: [2000, 3000],
      sol: 'sombra_parcial',
      agua: 'alto',
      propagacion: 'division_rizoma',
      propagacionNota: 'Se riega agresiva por rizoma; en huerta pequeña conténgala con una barrera enterrada de unos 30 cm para que no invada.',
    },
    cosecha: 'Se corta la punta con hoja tierna (con guante), antes de la floración; se cuece de una o se seca colgada para que deje de pringar.',
    veto: 'Córtela siempre con guantes: fresca pringa y arde. La hoja se cuece o se seca antes de usar. Es también biopreparado (té de ortiga) para abonar las matas — vea el mundo de biopreparados.',
  },

  /* ── Con cuidado (planta de respeto — vive en la estación de seguridad) ─ */
  {
    slug: 'ruda',
    grupo: 'cuidado',
    nombre: 'Ruda',
    cientifico: 'Ruta graveolens L.',
    familia: 'Rutaceae',
    catalogId: 'ruta_graveolens',
    regionales: ['ruda macho', 'ruda hembra', 'arruda'],
    emoji: '⚠️',
    parteUsada: '—',
    usoTradicional:
      'Planta muy nombrada en el saber popular, pero de RESPETO. En la finca se usa sobre todo como repelente de plagas y de adorno, y en creencias de la casa. Su uso interno como remedio es PELIGROSO y aquí no se recomienda.',
    comoSePrepara:
      'En la finca: como mata repelente y ornamental. No se da preparación para tomar: su uso interno es riesgoso.',
    grounded: {
      pisos: ['frio', 'templado'],
      altitudOpt: [1800, 2800],
      sol: 'sol_pleno',
      agua: 'bajo',
      propagacion: 'esqueje',
      propagacionNota: 'Se saca por esqueje semileñoso en tierra arenosa; por semilla germina lenta y despareja.',
    },
    cosecha: 'En la finca se maneja como planta repelente y de adorno; no se cosecha para consumo.',
    veto: 'PLANTA DE RESPETO. La ruda es ABORTIVA: NUNCA debe usarla una mujer embarazada ni quien busque estarlo. En cantidad es tóxica (puede dañar el hígado y el riñón) y su savia al sol QUEMA la piel (es fototóxica). Su uso interno es peligroso: si alguien insiste en usarla, que sea únicamente con un profesional de la salud.',
  },
];

/**
 * Las plantas de un grupo (estación), en el orden del arreglo.
 * @param {string} grupo
 * @returns {typeof PLANTAS_BOTICA}
 */
export function plantasDeGrupo(grupo) {
  return PLANTAS_BOTICA.filter((p) => p.grupo === grupo);
}

/**
 * Reglas de seguridad de la botica (estación "Con cuidado"). Honestas y
 * generales, sin sustituir al profesional de la salud.
 */
export const REGLAS_SEGURIDAD_BOTICA = [
  {
    id: 'no-cura',
    titulo: 'Acompañar no es curar',
    detalle: 'Una aromática puede aliviar una molestia leve, pero NO cura enfermedades. Si algo no mejora en pocos días, empeora o da fiebre alta, vaya al médico o al puesto de salud.',
  },
  {
    id: 'embarazo-ninos',
    titulo: 'Embarazo, niños y remedios',
    detalle: 'En el embarazo, la lactancia y con niños pequeños, muchas plantas NO son inofensivas (la ruda, por ejemplo, es abortiva). Consulte a un profesional de la salud ANTES de dar cualquier remedio de la casa.',
  },
  {
    id: 'identidad',
    titulo: 'Conozca bien la mata',
    detalle: 'Hay plantas parecidas que se confunden (la ortiga con otras Urticaceae, el saúco con matas de fruto tóxico). Use solo la que conoce con seguridad y la parte correcta (a veces solo la flor o solo la hoja).',
  },
  {
    id: 'medicamentos',
    titulo: 'Cuidado si toma medicamentos',
    detalle: 'Algunas plantas se cruzan con medicamentos recetados. Si está en tratamiento, cuéntele al médico qué aguas o remedios de la casa está tomando.',
  },
  {
    id: 'medida',
    titulo: 'La medida importa',
    detalle: 'Más no es mejor. Las aguas aromáticas se toman en poca cantidad y de vez en cuando; tomar mucho de cualquier planta, por natural que sea, puede hacer daño.',
  },
];

/**
 * Créditos de las fotos del mundo botica — FUENTE ÚNICA en el componente,
 * espejo de /public/botica/creditos.json (mismo patrón que Café/Agua: el JSON
 * público es para auditoría de licencias, este arreglo pinta la UI). Requisito
 * de las licencias CC-BY/CC-BY-SA: atribución visible. Las de dominio público /
 * CC0 se atribuyen igual por cortesía. Si una foto no carga, cae a un ícono.
 * @type {{slug:string,autor:string,licencia:string,licenciaUrl:string,fuenteUrl:string}[]}
 */
export const CREDITOS_FOTOS_BOTICA = [
  { slug: 'calendula', autor: 'Ermell', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Ringelblume_(Calendula_officinalis)_Bl%C3%BCte_focus_stack-20220619-RM-165610.jpg' },
  { slug: 'manzanilla', autor: 'Javier martin', licencia: 'Public domain', licenciaUrl: 'https://en.wikipedia.org/wiki/Public_domain', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Matricaria_recutita_FlowerCloseup_2010-4-11_DehesaBoyalPuertollano.jpg' },
  { slug: 'toronjil', autor: 'Gideon Pisanty (Gidip)', licencia: 'CC BY 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Melissa_officinalis_1.jpg' },
  { slug: 'yerbabuena', autor: 'Krzysztof Ziarnek, Kenraiz', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Mentha_spicata_var._viridis_kz01.jpg' },
  { slug: 'cidron', autor: 'Juan Carlos Fonseca Mata', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Aloysia_citrodora_(Verbenaceae),_hojas.jpg' },
  { slug: 'sauco', autor: 'Krzysztof Ziarnek, Kenraiz', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Sambucus_nigra_kz18.jpg' },
  { slug: 'ruda', autor: 'Krzysztof Ziarnek, Kenraiz', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Ruta_graveolens_kz03.jpg' },
  { slug: 'ortiga', autor: 'Dominicus Johannes Bergsma', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Brandnetel,_Urtica_dioica,_Locatie,_Famberhorst.jpg' },
  { slug: 'llanten', autor: 'Cbaile19', licencia: 'CC0', licenciaUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Plantago_major,_2022-09-01,_Beechview,_01.jpg' },
];
