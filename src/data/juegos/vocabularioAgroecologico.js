/**
 * vocabularioAgroecologico.js — Términos agroecológicos para juegos (crucigrama + sopa de letras).
 *
 * Extraídos del catálogo chagra-catalog-seed-v3.1.json, biopreparados-seed.json y
 * control-biologico-seed.json. Cada término incluye:
 * - palabra: el término para el juego (puede ser nombre común, científico o técnica)
 * - pista: 1 frase educativa fundamentada en el catálogo
 * - categoria: agrupación temática
 *
 * NADA INVENTADO — todo está respaldado en fuentes reales del catálogo Chagra.
 * ESLint limpio, español CO sin voseo.
 *
 * Fuente: catalog/chagra-catalog-seed-v3.1.json (50 especies OSS),
 *          catalog/biopreparados-seed.json (15 biopreparados),
 *          catalog/control-biologico-seed.json (14 enemigos naturales)
 */
const TERMINOS = [
  // ESPECIES - HORTALIZAS
  {
    palabra: 'CEBOLLIN',
    pista: 'Aliácea hortícola perenne, se divide por bulbillos (hijuelos) cada 4 meses para cosecha permanente.',
    categoria: 'hortalizas'
  },
  {
    palabra: 'LECHUGA',
    pista: 'Hortaliza de hoja que en el altiplano cundinamarqués produce cogollo morado entre 1800 y 2800 msnm.',
    categoria: 'hortalizas'
  },
  {
    palabra: 'CILANTRO',
    pista: 'Hortaliza aromática que se asocia bien con cebolla larga y mejora la biodiversidad del huerto.',
    categoria: 'hortalizas'
  },
  {
    palabra: 'TOMATE',
    pista: 'Hortaliza de fruto con variedad San Marzano, requiere manejo de plagas con biopreparados andinos.',
    categoria: 'hortalizas'
  },
  {
    palabra: 'ZANAHORIA',
    pista: 'Hortaliza de raíz que se siembra en sueltos francos y requiere riego constante durante las primeras 3 semanas.',
    categoria: 'hortalizas'
  },

  // ESPECIES - FRUTALES PERENNES
  {
    palabra: 'CAFE',
    pista: 'Cultivo permanente de los Andes, variedades Caturra, Castillo y Cenicafé 1 requieren sombra de árboles nativos.',
    categoria: 'frutales'
  },
  {
    palabra: 'CACAO',
    pista: 'Frutal amazónico andino que requiere sombra permanente y humedad constante, sensible a sequías prolongadas.',
    categoria: 'frutales'
  },
  {
    palabra: 'FRESA',
    pista: 'Frutal semi-perenne que se asocia bien con cebollín y lechuga, requiere suelo bien drenado y pH moderado.',
    categoria: 'frutales'
  },
  {
    palabra: 'UCHUVA',
    pista: 'Frutal andino nativo, produce frutos amarillos en cáscara que se protegen con el cáliz de la flor.',
    categoria: 'frutales'
  },
  {
    palabra: 'MORA',
    pista: 'Frutal andino de clima frío, variedad Castilla produce en altiplano entre 1800 y 2600 msnm.',
    categoria: 'frutales'
  },
  {
    palabra: 'LULO',
    pista: 'Frutal andino nativo, también conocido como naranjilla o chuva, requiere suelo ácido y bien drenado.',
    categoria: 'frutales'
  },
  {
    palabra: 'TOMATE_ARBOL',
    pista: 'Frutal andino también llamado tamarillo, produce frutos rojos o amarillos para jugos y ensaladas.',
    categoria: 'frutales'
  },
  {
    palabra: 'GUAMO',
    pista: 'Árbol nativo leguminoso que fija nitrógeno, da sombra al café y produce vainas comestibles para ganado.',
    categoria: 'frutales'
  },
  {
    palabra: 'CHACHAFRUTO',
    pista: 'Árbol leguminoso andino, también llamado balú, produce semillas grandes comestibles y fija nitrógeno.',
    categoria: 'frutales'
  },

  // ESPECIES - CEREALES Y GRANOS
  {
    palabra: 'MAIZ',
    pista: 'Cereal criollo que en milpa se asocia con frijol y calabaza para diversificar la producción y el suelo.',
    categoria: 'cereales_granos'
  },
  {
    palabra: 'QUINUA',
    pista: 'Cereal andino de grano pequeño, resistente a heladas ligeras, tolera suelos pobres y produce proteína completa.',
    categoria: 'cereales_granos'
  },
  {
    palabra: 'AMARANTO',
    pista: 'Cereal andino de grano pequeñito, hojas comestibles y alta proteína, resistente a sequía moderada.',
    categoria: 'cereales_granos'
  },
  {
    palabra: 'FRIJOL',
    pista: 'Leguminosa granosa que fija nitrógeno, existen variedades arbustivas y volubles para diferentes pisos térmicos.',
    categoria: 'cereales_granos'
  },
  {
    palabra: 'CHOCHO',
    pista: 'Leguminosa andina también llamada tarwi, grano rico en proteína que requiere remojo prolongado para consumirse.',
    categoria: 'cereales_granos'
  },
  {
    palabra: 'TRIBOLO',
    pista: 'Leguminosa rastrera usada como cobertura que protege el suelo, fija nitrógeno y mejora materia orgánica.',
    categoria: 'cereales_granos'
  },

  // ESPECIES - TUBÉRCULOS Y RAÍCES
  {
    palabra: 'BATATA',
    pista: 'Tubérculo also conocido como camote, raíz dulce rica en carbohidratos, tolerante a suelos pobres.',
    categoria: 'tuberculos_raices'
  },
  {
    palabra: 'ARRACACHA',
    pista: 'Raíz andina also llamada zanahoria blanca, requiere altiplano frío y suelo profundo para desarrollarse.',
    categoria: 'tuberculos_raices'
  },

  // ESPECIES - AROMÁTICAS Y MEDICINALES
  {
    palabra: 'YERBABUENA',
    pista: 'Planta aromática rastrera, hojas mentoladas para té y digestión, se propaga por estolones.',
    categoria: 'aromaticas_medicinales'
  },
  {
    palabra: 'TORONJIL',
    pista: 'Planta aromática de hojas con aroma limón, usada para té calmante y atraer polinizadores al huerto.',
    categoria: 'aromaticas_medicinales'
  },
  {
    palabra: 'OREGANO',
    pista: 'Planta aromática perenne, hojas aromáticas para sazón y medicinas, tolerante a sequía y suelos pobres.',
    categoria: 'aromaticas_medicinales'
  },
  {
    palabra: 'MANZANILLA',
    pista: 'Planta medicinal con flores blancas, usada en té para digestión y atraer insectos benéficos al huerto.',
    categoria: 'aromaticas_medicinales'
  },
  {
    palabra: 'ORTIGA',
    pista: 'Planta medicinal con pelos urticantes, se usa en purín como fertilizante foliar y repelente de insectos.',
    categoria: 'aromaticas_medicinales'
  },
  {
    palabra: 'CALENDULA',
    pista: 'Flor medicinal de color naranja, atrae polinizadores y se usa en pomadas para la piel.',
    categoria: 'aromaticas_medicinales'
  },

  // ESPECIES - ABONOS VERDES Y COBERTURAS
  {
    palabra: 'ALISO',
    pista: 'Árbol pionero andino que fija nitrógeno en las raíces, recupera suelos degradados y da sombra al café.',
    categoria: 'abonos_verdes'
  },
  {
    palabra: 'FRIJO_TERCIPELO',
    pista: 'Leguminosa trepadora vigorosa, usada como cobertura y abono verde, mejora la estructura del suelo.',
    categoria: 'abonos_verdes'
  },

  // ESPECIES - INVASORAS (CONTROL)
  {
    palabra: 'KIKUYO',
    pista: 'Pasto invasor africano que compite agresivamente con cultivos andinos, requiere control mecánico constante.',
    categoria: 'especies_invasoras'
  },
  {
    palabra: 'EUCALIPTO',
    pista: 'Árbol exótico invasor que agota el agua del suelo, alelopático que dificulta la regeneración nativa.',
    categoria: 'especies_invasoras'
  },
  {
    palabra: 'HELECHO_MARRANERO',
    pista: 'Helecho invasor de difícil erradicación, toxico para ganado, indica suelos ácidos y degradados.',
    categoria: 'especies_invasoras'
  },
  {
    palabra: 'RETIMO',
    pista: 'Arbusto invasor espinoso europeo, forma matorrales densos que desplazan vegetación nativa andina.',
    categoria: 'especies_invasoras'
  },

  // BIOPREPARADOS - FERMENTADOS
  {
    palabra: 'BOCASHI',
    pista: 'Abono sólido fermentado 15-21 días con gallinaza, cascarilla, carbón y melaza, se aplica al suelo.',
    categoria: 'biopreparados'
  },
  {
    palabra: 'BIOL',
    pista: 'Fertilizante líquido fermentado anaeróbico 30-45 días con estiércol, leche y melaza, se aplica foliar diluido.',
    categoria: 'biopreparados'
  },
  {
    palabra: 'PURIN_ORTIGA',
    pista: 'Fermentado de ortiga 10-15 días, fertilizante foliar rico en nitrógeno y repelente de insectos.',
    categoria: 'biopreparados'
  },
  {
    palabra: 'LIXIVIADO_FRUTAS',
    pista: 'Fermentado líquido de residuos de fruta, rico en potasio, se aplica foliar en etapa de fructificación.',
    categoria: 'biopreparados'
  },
  {
    palabra: 'SUPERMAGRO',
    pista: 'Fermentado de estiércol, melaza y caldo mineral, fortalece plantas contra enfermedades y deficiencias.',
    categoria: 'biopreparados'
  },

  // BIOPREPARADOS - CALDOS
  {
    palabra: 'CALDO_SULFO',
    pista: 'Caldo mineral azufrado contra ácaros y hongos, uso preventivo y curativo con intervalo de seguridad.',
    categoria: 'biopreparados'
  },
  {
    palabra: 'CALDO_BORDELES',
    pista: 'Caldo mineral de cobre contra hongos (mildiu, gota), preventivo, no aplicar en plena floración.',
    categoria: 'biopreparados'
  },
  {
    palabra: 'TE_COMPOST',
    pista: 'Extracto de compost maduro, inocula microorganismos benéficos al suelo y foliar, efecto preventivo.',
    categoria: 'biopreparados'
  },
  {
    palabra: 'HUMUS_LIQUIDO',
    pista: 'Lixiviado de lombricultura, rico en microorganismos y nutrientes, se aplica diluido al suelo y foliar.',
    categoria: 'biopreparados'
  },

  // BIOPREPARADOS - MICROBIANOS
  {
    palabra: 'TRICHODERMA',
    pista: 'Hongo benéfico aplicado al suelo, protege raíces de patógenos y promueve crecimiento vegetal.',
    categoria: 'biopreparados'
  },
  {
    palabra: 'BACILLUS_SUBTILIS',
    pista: 'Bacteria benéfica aplicada foliar, previene enfermedades fúngicas y estimula defensas de la planta.',
    categoria: 'biopreparados'
  },

  // BIOPREPARADOS - MINERALES
  {
    palabra: 'CAL_DOLOMITA',
    pista: 'Enmienda mineral rica en calcio y magnesio, corrige pH ácido del suelo y mejora estructura.',
    categoria: 'biopreparados'
  },
  {
    palabra: 'ROCA_FOSFORICA',
    pista: 'Enmienda mineral de fósforo de lenta liberación, mejora floración y raíces a largo plazo.',
    categoria: 'biopreparados'
  },
  {
    palabra: 'CENIZA_MADERA',
    pista: 'Residuo mineral de quema de madera, rica en potasio y calcio, use moderadamente por elevado pH.',
    categoria: 'biopreparados'
  },

  // CONTROL BIOLÓGICO - DEPREDADORES
  {
    palabra: 'MARIQUITA',
    pista: 'Escarabajo depredador de áfidos (pulgones), adultos y larvas comen hasta 100 áfids por día.',
    categoria: 'control_biologico'
  },
  {
    palabra: 'CRISOPA',
    pista: 'Insecto verde con alas venosas, larvas depredan pulgones, trips y huevos de plagas vorazmente.',
    categoria: 'control_biologico'
  },
  {
    palabra: 'ACARO_SWIRSKII',
    pista: 'Ácaro depredador que controla trips y mosca blanca en invernaderos, se reproduce rápido en presas.',
    categoria: 'control_biologico'
  },

  // CONTROL BIOLÓGICO - PARASITOIDES
  {
    palabra: 'TRICHOGRAMMA',
    pista: 'Avispa diminuta que parasita huevos de plagas, cada hembra puede parasitar 50 huevos por día.',
    categoria: 'control_biologico'
  },
  {
    palabra: 'COTESIA',
    pista: 'Avispa parasitoide que ataca orugas de plagas, introduce huevos dentro del cuerpo de la oruga.',
    categoria: 'control_biologico'
  },
  {
    palabra: 'ENCARSIA',
    pista: 'Avispa parasitoide de mosca blanca en invernaderos, ataca ninfas y previene brotes severos.',
    categoria: 'control_biologico'
  },
  {
    palabra: 'TAMARIXIA',
    pista: 'Avispa parasitoide especialista del psílido asiático de los cítricos, controla brotes de esta plaga.',
    categoria: 'control_biologico'
  },
  {
    palabra: 'ANAGRUS',
    pista: 'Avispa parasitoide de cochinillas harinosas, hembra pone huevos dentro del cuerpo de la cochinilla.',
    categoria: 'control_biologico'
  },

  // CONTROL BIOLÓGICO - ENTOMOPATÓGENOS
  {
    palabra: 'BEAUVRIA',
    pista: 'Hongo entomopatógeno blanco que infecta insectos, penetra por cutícula y crece dentro del cuerpo.',
    categoria: 'control_biologico'
  },
  {
    palabra: 'METARHIZIUM',
    pista: 'Hongo entomopatógeno verde que infecta insectos del suelo (cortadores, picudos), esporulación verde.',
    categoria: 'control_biologico'
  },
  {
    palabra: 'BACILLUS_THURINGIENSIS',
    pista: 'Bacteria bioinsecticida (Bt) que produce cristales proteicos que matan orugas al ser ingeridos.',
    categoria: 'control_biologico'
  },
  {
    palabra: 'LECANICILLIUM',
    pista: 'Hongo entomopatógeno que controla insectos chupadores (mosca blanca, cochinillas) por contacto.',
    categoria: 'control_biologico'
  },
  {
    palabra: 'HETERORHABDITIS',
    pista: 'Nematodo entomopatógeno que busca insectos del suelo, penetra y libera bacteria simbionte letal.',
    categoria: 'control_biologico'
  },

  // PRÁCTICAS AGROECOLÓGICAS
  {
    palabra: 'SUCESION',
    pista: 'Orden natural en que las plantas colonizan un terreno: pioneras, intermedias y climax del bosque maduro.',
    categoria: 'practicas'
  },
  {
    palabra: 'RNA_REGENERACION',
    pista: 'Regeneración Natural Asistida: quitar ganado y fuego, controlar invasoras, dejar que el monte se regenere solo.',
    categoria: 'practicas'
  },
  {
    palabra: 'PSA_PAGO',
    pista: 'Pago por Servicios Ambientales: gobierno paga al campesino por conservar bosque o páramo en su predio.',
    categoria: 'practicas'
  },
  {
    palabra: 'MILPA',
    pista: 'Sistema mesoamericano de asociar maíz, frijol y calabaza en el mismo terreno para diversificar producción.',
    categoria: 'practicas'
  },
  {
    palabra: 'COBERTURA',
    pista: 'Vegetación que protege el suelo de erosión, mantiene humedad y agrega materia orgánica al descomponerse.',
    categoria: 'practicas'
  },
  {
    palabra: 'ALELOPATIA',
    pista: 'Sustancia que una planta libera al suelo para frenar o matar a otras plantas cercanas (ej: cebolla).',
    categoria: 'practicas'
  },
  {
    palabra: 'PRIMER_FLUSH',
    pista: 'Primeros litros de lluvia que lavan el techo, esa agua no se guarda en el tanque por contaminación.',
    categoria: 'practicas'
  },
  {
    palabra: 'PRUEBA_PUNADO',
    pista: 'Prueba casera para saber si regar: apretar tierra, si no forma bola está seca, si forma cinta tiene humedad.',
    categoria: 'practicas'
  }
];

export default TERMINOS;
