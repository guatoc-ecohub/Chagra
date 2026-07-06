/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (usos de cocina, pasos de siembra, conservación de la huerta de aromáticas),
 * pendiente de migrar a src/config/messages.js — mismo criterio que
 * aguaFinca.js / sanidadData.js.
 */
/**
 * aromaticasHuerta.js — CONTENIDO del mundo "Aromáticas y condimentarias"
 * (la huerta de la cocina campesina).
 *
 * REGLA ANTI-ALUCINACIÓN del módulo:
 *   1. Todo el CULTIVO (altitud, piso térmico, sol/sombra, agua, propagación)
 *      está GROUNDEADO en el catálogo Chagra (public/catalog.sqlite, tabla
 *      species + species_thermal_zones + species_roles). Ver el bloque
 *      `grounded` de cada ficha: esos números salen del catálogo, no inventados.
 *   2. Lo CULINARIO es conocimiento común de la cocina campesina colombiana
 *      (para qué se usa cada hierba en el fogón). NO hacemos claims medicinales
 *      de cura — nos quedamos en cocina + cómo cultivarla. La única nota de
 *      salud que damos es un VETO de seguridad honesto (poleo), no un remedio.
 *   3. Las ASOCIACIONES (repele plagas / atrae polinizadores / mala vecina)
 *      salen de los roles del catálogo (pest_repellent, pollinator_attractor,
 *      ground_cover, antagonists), no de la imaginación.
 *
 * Las 8 aromáticas cubren la huerta de cocina campesina común: cilantro,
 * cebolla larga/cebollín, orégano, albahaca, hierbabuena, poleo, laurel y
 * tomillo. Cada `slug` corresponde a un id real del catálogo (campo `id`).
 */

/** Ruta base de las fotos (Wikimedia Commons, licencia abierta). */
export const FOTO_BASE_AROMATICAS = '/aromaticas';

/**
 * Diccionario campesino para traducir los códigos del catálogo a lenguaje del
 * fogón. Fuente única para que la ficha y las auditorías hablen igual.
 */
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
};

/** Traduce el método de propagación del catálogo a la palabra del campo. */
export const PROPAGACION_LABEL = {
  semilla: 'Por semilla',
  esqueje: 'Por esqueje (gajo)',
  division_mata: 'Dividiendo la mata',
  estolon: 'Por estolón (guía rastrera)',
};

/**
 * Las 8 fichas. `grounded` = lo que sale del catálogo Chagra (verificable).
 * `cocina`, `siembra`, `vecinas`, `cosecha` = contenido campesino.
 */
export const AROMATICAS = [
  {
    slug: 'cilantro',
    nombre: 'Cilantro',
    cientifico: 'Coriandrum sativum',
    familia: 'Apiaceae',
    emoji: '🌿',
    hook: 'El alma del sofrito, el sancocho y el ají',
    grounded: {
      altitud: { optMin: 1000, optMax: 2400, absMin: 0, absMax: 2800 },
      pisos: ['frio', 'templado'],
      sol: 'sol_pleno',
      agua: 'medio',
      drenaje: 'excelente',
      propagacion: { metodo: 'semilla', nota: 'Siembra directa en el sitio, escalonada cada 15 días, para tener hoja fresca todo el tiempo.' },
      roles: ['crop', 'pollinator_attractor'],
    },
    cocina:
      'La hierba insignia de la cocina colombiana. Hoja fresca picada por encima al final: sancocho, ajiaco, sudados, ceviche, arroz, frijoles y todo ají casero. También la semilla seca (coriandro) sirve de especia molida.',
    siembra: [
      'Riegue la semilla al voleo o en surquitos poco profundos, tápela con una capa fina de tierra.',
      'Nace en 1 a 2 semanas; ralee para dejar las maticas con aire.',
      'Cosecha en 30 a 45 días. Siembre un puñado nuevo cada 15 días y nunca le falta cilantro.',
    ],
    vecinas: {
      buenas: 'En flor atrae abejas y avispitas benéficas que controlan plagas de la huerta.',
      ojo: 'Cuando le pega el calor y la seca, se “espiga” (se va a flor) y la hoja amarga: siémbrelo en lo más fresco.',
    },
    cosecha: 'Corte las hojas de afuera y deje el cogollo; rebrota. Si lo deja espigar, guarde la semilla para volver a sembrar y para especia.',
    conservacion: 'Dura pocos días en fresco. Para guardar: pique y congele en cubeta con un poquito de agua o aceite. Secarlo pierde casi todo el aroma.',
  },
  {
    slug: 'cebollin',
    nombre: 'Cebolla larga / Cebollín',
    cientifico: 'Allium fistulosum',
    familia: 'Amaryllidaceae',
    emoji: '🧅',
    hook: 'La base del hogao y de todo buen guiso',
    grounded: {
      altitud: { optMin: 1800, optMax: 2800, absMin: 800, absMax: 3500 },
      pisos: ['frio', 'templado'],
      sol: 'sol_pleno',
      agua: 'medio',
      drenaje: 'bueno_a_moderado',
      propagacion: { metodo: 'division_mata', nota: 'Se divide la mata en hijuelos (macollos) y cada uno vuelve a macollar: mata perenne que da y da.' },
      roles: ['crop', 'pest_repellent'],
      antagonists: 'fríjol y demás leguminosas',
    },
    cocina:
      'El arranque del hogao y del sofrito: se sofríe el tallo blanco y verde picado con tomate. Va en caldos, sopas, rellenos, arroces y salsas. La parte verde, cruda y picada, remata sopas y ajíes.',
    siembra: [
      'Consiga una mata: sepárela en hijuelos con su raicita cada uno.',
      'Siembre cada hijuelo enterrando la parte blanca, a un jeme de distancia (unos 20 cm).',
      'Macolla sola; a los 2 o 3 meses ya corta tallos y la mata sigue produciendo por años.',
    ],
    vecinas: {
      buenas: 'Su olor fuerte confunde y ahuyenta plagas: buena vecina de zanahoria, tomate y coles.',
      ojo: 'NO la siembre pegada al fríjol ni a otras leguminosas: el catálogo la marca antagonista, se estorban.',
    },
    cosecha: 'Corte los tallos que necesite a ras y deje la mata; rebrota. No la arranque entera si quiere que siga dando.',
    conservacion: 'Se mantiene fresca varios días parada en un pocillo con agua. Picada, se congela bien para el hogao.',
  },
  {
    slug: 'oregano',
    nombre: 'Orégano',
    cientifico: 'Origanum vulgare',
    familia: 'Lamiaceae',
    emoji: '🌱',
    hook: 'El aroma de las carnes, la salsa y el adobo',
    grounded: {
      altitud: { optMin: 1200, optMax: 2200, absMin: 500, absMax: 2600 },
      pisos: ['frio', 'templado'],
      sol: 'sol_pleno',
      agua: 'bajo',
      drenaje: 'excelente',
      propagacion: { metodo: 'esqueje', nota: 'Fácil por gajo de tallo o dividiendo la mata en época de lluvias.' },
      roles: ['crop', 'pollinator_attractor', 'ground_cover'],
    },
    cocina:
      'Adobo de carnes y pollo, salsas de tomate, sopas y guisos. Se usa sobre todo seco, que concentra el aroma. Un poquito rinde: es fuerte.',
    siembra: [
      'Corte un gajo de una mata sana y entiérrelo; enraíza fácil. También se divide la mata.',
      'Póngalo a pleno sol, en tierra suelta que drene bien. Aguanta la seca; no lo riegue de más.',
      'Es mata perenne y rastrera: le sirve además de cobertura viva del suelo.',
    ],
    vecinas: {
      buenas: 'En flor atrae abejas y benéficos; tapa el suelo y le hace sombra a la maleza.',
      ojo: 'No le gusta el pie mojado: en suelo encharcado se pudre la raíz.',
    },
    cosecha: 'Corte ramas justo antes de la floración, que es cuando tiene más aroma.',
    conservacion: 'Cuélguelo en ramitos a la sombra, en sitio aireado, hasta que cruja. Desgránelo y guárdelo en frasco tapado, lejos de la luz.',
  },
  {
    slug: 'albahaca',
    nombre: 'Albahaca',
    cientifico: 'Ocimum basilicum',
    familia: 'Lamiaceae',
    emoji: '🌿',
    hook: 'La compañera del tomate y las pastas',
    grounded: {
      altitud: { optMin: 400, optMax: 1800, absMin: 0, absMax: 2400 },
      pisos: ['calido', 'templado'],
      // El catálogo tiene albahaca en clima cálido/templado, pero NO trae aún
      // sus cifras de sol/agua/propagación: no las inventamos (ver honesto).
      sol: null,
      agua: null,
      drenaje: null,
      propagacion: null,
      roles: ['crop', 'pest_repellent', 'pollinator_attractor'],
    },
    cocina:
      'Hoja fresca en pastas, ensaladas, con tomate y quesos, y en salsas tipo pesto criollo. Se agrega al final para que no pierda el aroma. Muy perfumada.',
    siembra: [
      'Es de tierra caliente y templada: quiere calorcito y no aguanta helada.',
      'Se levanta de semilla en semillero y se trasplanta, o de gajo puesto a enraizar en agua.',
      'Píntele los cogollos (despunte) para que ramifique y no se vaya rápido a flor.',
    ],
    vecinas: {
      buenas: 'Clásica buena vecina del tomate: su olor confunde a la mosca blanca y a los pulgones, y en flor llama polinizadores.',
      ojo: 'La helada la mata: en tierra fría, siémbrela protegida o en matera que pueda entrar.',
    },
    cosecha: 'Vaya cortando cogollos y hojas de arriba; así ramifica y dura más antes de florecer.',
    conservacion: 'No le gusta la nevera (se pone negra). Mejor: hágala pasta con aceite y congele, o séquela a la sombra aunque pierde aroma.',
  },
  {
    slug: 'hierbabuena',
    nombre: 'Hierbabuena',
    cientifico: 'Mentha spicata',
    familia: 'Lamiaceae',
    emoji: '🍃',
    hook: 'La del agua de panela y las aromáticas de la casa',
    grounded: {
      altitud: { optMin: 500, optMax: 2600, absMin: 0, absMax: 3000 },
      pisos: ['calido', 'templado', 'frio'],
      sol: 'sombra_parcial',
      agua: 'alto',
      drenaje: 'medio',
      propagacion: { metodo: 'estolon', nota: 'Solo se propaga por sus guías rastreras (estolones). La hierbabuena de las huertas caseras colombianas, la del agua de panela y las aromáticas.' },
      roles: ['crop', 'pest_repellent', 'ground_cover'],
    },
    cocina:
      'La hierbabuena criolla de toda casa: aguapanela caliente con hierbabuena, aromáticas, jugos y postres. En algunas regiones remata el sancocho. Uso de cocina y bebida, siempre hoja fresca.',
    siembra: [
      'Consiga una guía con raíz de otra mata y siémbrela: pega fácil.',
      'Quiere media sombra y humedad; no la deje secar.',
      'Se riega por el suelo con sus estolones: es agradecida y rústica.',
    ],
    vecinas: {
      buenas: 'Su olor mentolado espanta hormigas y pulgones; tapa el suelo como cobertura.',
      ojo: 'Es INVASORA: se apodera de la era. Siémbrela en matera, tarro o cajón enterrado para tenerla a raya.',
    },
    cosecha: 'Corte las puntas seguido; entre más la corte, más ramifica y más tierna sale.',
    conservacion: 'Fresca dura poco. Séquela en ramitos a la sombra para las aromáticas, o congele las hojas.',
  },
  {
    slug: 'poleo',
    nombre: 'Poleo',
    cientifico: 'Mentha pulegium',
    familia: 'Lamiaceae',
    emoji: '🌱',
    hook: 'Aroma menta fuerte de tierra fría — con respeto',
    grounded: {
      altitud: { optMin: 1900, optMax: 2700, absMin: 1500, absMax: 3000 },
      pisos: ['frio', 'templado'],
      // El catálogo lo ubica en tierra fría/templada pero no trae aún
      // sol/agua/propagación con cifra: no se inventan.
      sol: null,
      agua: null,
      drenaje: null,
      propagacion: null,
      roles: ['pest_repellent', 'ground_cover', 'pollinator_attractor'],
    },
    cocina:
      'Aromática de tierra fría, de aroma mentolado intenso: se usa en pequeña cantidad para un agua de poleo o para dar toque a algún guiso. Poco y de vez en cuando.',
    // Veto de seguridad HONESTO (no es claim de cura ni lo contrario): el aceite
    // del poleo (pulegona) es tóxico en cantidad. Lo advertimos como los vetos
    // de los fermentos, sin recetar nada.
    veto: 'Ojo con la salud: el poleo en cantidad es tóxico (su aceite, la pulegona) y no lo deben tomar mujeres embarazadas. Úselo poquito y como condimento, nunca a chorros ni como “remedio”.',
    siembra: [
      'Es menta de clima frío: quiere fresco y humedad.',
      'Se propaga como las otras mentas, por guías con raíz.',
      'Rastrea y tapa el suelo: sirve de cobertura en el borde de la huerta.',
    ],
    vecinas: {
      buenas: 'Fuerte repelente: de hecho el nombre viene de “pulga”. Espanta hormigas y pulgas cerca de la casa y el corral.',
      ojo: 'Igual que la hierbabuena, se riega por estolones: conténgala para que no invada.',
    },
    cosecha: 'Corte puntas cuando las necesite; es fuerte, rinde poco.',
    conservacion: 'Séquela a la sombra en ramitos y guárdela en frasco, en poca cantidad.',
  },
  {
    slug: 'laurel',
    nombre: 'Laurel',
    cientifico: 'Laurus nobilis',
    familia: 'Lauraceae',
    emoji: '🌳',
    hook: 'La hoja del guiso, los frijoles y el sancocho',
    grounded: {
      altitud: { optMin: 1600, optMax: 2400, absMin: 1200, absMax: 2800 },
      pisos: ['frio', 'templado'],
      sol: 'sol_pleno',
      agua: 'medio',
      drenaje: 'bueno',
      propagacion: { metodo: 'esqueje', nota: 'Por gajo semileñoso (enraíza lento, meses) o semilla. Arbolito de crecimiento lento, muy longevo; aguanta poda dura y sirve de seto.' },
      roles: ['crop'],
      estrato: 'árbol',
    },
    cocina:
      'La hoja seca que da fondo a frijoles, lentejas, sancochos, caldos, adobos y encurtidos. Se echa una o dos hojas al principio de la cocción y se retiran antes de servir.',
    siembra: [
      'Es un arbolito, no una mata de era: dele un puesto fijo con sol.',
      'Se saca de gajo (tarda meses en enraizar) o de semilla; tenga paciencia, crece lento.',
      'Aguanta poda: se puede tener como seto aromático y longevo junto a la casa.',
    ],
    vecinas: {
      buenas: 'Arbusto perenne y seto vivo. La hoja seca metida en el granero ahuyenta gorgojos del maíz y del fríjol.',
      ojo: 'Crece lento: no espere cosecha rápida, pero una vez prende dura toda la vida.',
    },
    cosecha: 'Corte hojas maduras cuando quiera; la mata siempre tiene. Mejor secas que frescas para la cocina.',
    conservacion: 'Seque las hojas a la sombra y guárdelas enteras en frasco: conservan el aroma por meses.',
  },
  {
    slug: 'tomillo',
    nombre: 'Tomillo',
    cientifico: 'Thymus vulgaris',
    familia: 'Lamiaceae',
    emoji: '🌿',
    hook: 'El compañero del laurel en caldos y carnes',
    grounded: {
      altitud: { optMin: 800, optMax: 2600, absMin: 0, absMax: 3000 },
      pisos: ['frio', 'templado'],
      sol: 'sol_pleno',
      agua: 'bajo',
      drenaje: 'excelente',
      propagacion: { metodo: 'semilla', nota: 'De semilla nace lento (14 a 21 días); también por gajo o dividiendo la mata. Aguanta suelos pobres y secos.' },
      roles: ['crop', 'pest_repellent', 'pollinator_attractor'],
    },
    cocina:
      'Adobo de carnes y pollo, caldos, guisos y salsas; hace pareja con el laurel. Se usa fresco o seco. Aguanta cocción larga sin perderse.',
    siembra: [
      'Siémbrelo a pleno sol en tierra suelta y bien drenada; aguanta suelo pobre y seco.',
      'De semilla nace despacio: tenga paciencia, o sáquelo de gajo que va más rápido.',
      'Es mata baja y perenne: riéguelo poco, que le va mejor con sed que ahogado.',
    ],
    vecinas: {
      buenas: 'Repele el gusano de la col: buena vecina del repollo, la coliflor y el brócoli. En flor llama abejas.',
      ojo: 'Odia el encharcamiento: en suelo pesado y mojado se muere. Ponga tierra que drene.',
    },
    cosecha: 'Corte ramitas antes de la floración; rebrota rápido si no lo corta a ras del tronco.',
    conservacion: 'Cuelgue ramitos a la sombra hasta que sequen; guárdelos en frasco tapado. Seco conserva bien el aroma.',
  },
];

/**
 * Créditos de las fotos — cumplimiento de licencia abierta (patrón Agua/Suelo).
 * Datos REALES de Wikimedia Commons, verificados uno a uno (licencia + planta
 * correcta) contra la API de Commons. Auditoría completa en
 * public/aromaticas/_meta.json. NO se inventaron autores ni licencias.
 */
export const CREDITOS_FOTOS_AROMATICAS = [
  { slug: 'cilantro', autor: 'Schlaghecken Josef', lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Koriander_(Coriandrum_sativum)_Bl%C3%A4tter--_Josef_Schlaghecken.jpg' },
  { slug: 'cebollin', autor: 'Genmewcaugsa', lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:HK_SYP_Best_of_Best_Vegetable_Peking_Welsh_onion_Allium_Aug-2012.JPG' },
  { slug: 'oregano', autor: 'Magnus Manske', lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:P1000277_Origanum_vulgare_(Wild_Marjoram)_(Labiatae)_Plant.JPG' },
  { slug: 'albahaca', autor: 'Forest and Kim Starr', lic: 'CC BY 3.0 US', url: 'https://commons.wikimedia.org/wiki/File:Starr-090707-2398-Ocimum_basilicum-leaves-Olinda-Maui_(24969058135).jpg' },
  { slug: 'hierbabuena', autor: 'Forest and Kim Starr', lic: 'CC BY 3.0 US', url: 'https://commons.wikimedia.org/wiki/File:Starr-080608-7435-Mentha_spicata-leaves-Water_plant_Sand_Island-Midway_Atoll_(41264499822).jpg' },
  { slug: 'poleo', autor: 'EmirDzaferovic', lic: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Mentha_Pulegium_11.jpg' },
  { slug: 'laurel', autor: 'Forest and Kim Starr', lic: 'CC BY 3.0 US', url: 'https://commons.wikimedia.org/wiki/File:Starr-120305-3522-Laurus_nobilis-leaves-Park_Building_11_HNP-Maui_(24506716444).jpg' },
  { slug: 'tomillo', autor: 'Syrio', lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Thymus_vulgaris_Paludi_01.jpg' },
];
