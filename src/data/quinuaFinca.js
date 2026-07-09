/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (granos andinos: quinua, amaranto, chía, cañihua y tarwi), pendiente de migrar
 * a src/config/messages.js — mismo criterio que cafeFinca.js / aguaFinca.js.
 */
/**
 * quinuaFinca.js — CONTENIDO del mundo "Quinua y granos andinos" (5 estaciones).
 *
 * REGLA ANTI-ALUCINACIÓN (igual que cafeFinca.js): todo lo CUALITATIVO
 * (especies, piso térmico, prácticas de siembra, el desaponificado, las señales
 * de mildiú, cosecha/trilla) vive aquí como copy groundeado. Las CIFRAS DURAS
 * que dependen del sitio o que el catálogo/ICBF aún no respalda NO se inventan:
 * son SLOTS `grounded_pendiente` ("dato en camino") o se remiten al agente.
 *
 * GROUNDING (fuente única catálogo/grafo chagra_kg, exportado a estático):
 *   - Fichas de ciclo: public/cycle-content/{chenopodium_quinoa, amaranthus_
 *     caudatus, salvia_hispanica, chenopodium_pallidicaule, lupinus_mutabilis}
 *     .json → piso térmico (altitud óptima/absoluta), helada letal, propagación,
 *     variedades AGROSAVIA, ciclo, mildiú (Peronospora variabilis) y su manejo.
 *   - Aporte nutricional: public/nutricion-humana.json (ICBF/TCAC 2015) →
 *     quinua 356 kcal, 14,6 g proteína, 8,4 mg hierro / 100 g (el hierro más alto
 *     de los 27 cultivos del set). Los % de proteína de amaranto/cañihua/tarwi
 *     salen de las fichas (FAO/NRC/AGROSAVIA), no del ICBF: la composición ICBF
 *     completa de esos tres es "dato en camino".
 *   - Asociaciones: compatible_with del grafo (quinua ↔ maíz, veza; tarwi ↔
 *     maíz, aliso). NO se agregan especies que el grafo no respalde.
 *
 * Fuentes Tier A citadas en las fichas: FAO Quinoa Sourcebook 2013, NRC 1989
 * "Lost Crops of the Incas", AGROSAVIA (granos y leguminosas andinas), ICA
 * Resolución 3168/2015, ICBF/TCAC 2015, POWO Kew, GBIF Backbone.
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/** Ruta base de las fotos del mundo (Wikimedia Commons, licencia abierta). */
export const FOTO_BASE_QUINUA = '/quinua';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIONES (pestañas del mundo)
 * ──────────────────────────────────────────────────────────────────────── */
export const ESTACIONES_QUINUA = [
  { id: 'granos', titulo: 'Los granos', descripcion: 'Cuáles son y qué alimentan' },
  { id: 'siembra', titulo: 'Siembra y piso', descripcion: 'Época, altura y distancias' },
  { id: 'desaponificado', titulo: 'Quitar el amargo', descripcion: 'Desaponificar y desamargar' },
  { id: 'plagas', titulo: 'Mildiú y manejo', descripcion: 'Reconocer y manejar sin veneno' },
  { id: 'cosecha', titulo: 'Cosecha y valor', descripcion: 'Trilla y qué alimenta' },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 1 · LOS GRANOS ANDINOS (quiénes son + valor)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Las especies del mundo. GROUNDED a las fichas de ciclo (cycle-content):
 * nombre científico, familia, piso térmico (altitud óptima) y helada letal;
 * el % de proteína viene del `valor_pedagogico` de cada ficha (FAO/NRC/AGROSAVIA).
 * `pseudocereal` distingue los granos de chenopodiáceas/amarantáceas (quinua,
 * amaranto, cañihua) del cereal verdadero — chía es semilla oleaginosa y tarwi
 * es leguminosa: se aclara en la nota de cada tarjeta, sin forzar la etiqueta.
 */
export const GRANOS_ANDINOS = [
  {
    id: 'quinua',
    nombre: 'Quinua',
    cientifico: 'Chenopodium quinoa Willd.',
    familia: 'Amaranthaceae',
    tipo: 'Pseudocereal andino',
    foto: 'quinua',
    pisoTermico: 'Frío a templado · 1800–2800 msnm (óptimo)',
    proteina: '14–18 %',
    saponina: true,
    resumen: 'El grano andino bandera. Panojas que van del amarillo al rojo y al morado. Proteína completa y sin gluten, pero su cascarilla trae saponinas amargas: hay que lavarla antes de cocinar (ver «Quitar el amargo»).',
    nutriNota: 'ICBF: 356 kcal, 14,6 g de proteína y 8,4 mg de hierro por 100 g — el hierro más alto de los cultivos del catálogo.',
    fuente: 'AGROSAVIA · FAO Quinoa Sourcebook 2013 · ICBF/TCAC 2015 (grafo chagra_kg)',
  },
  {
    id: 'amaranto',
    nombre: 'Amaranto (bledo, kiwicha)',
    cientifico: 'Amaranthus caudatus L.',
    familia: 'Amaranthaceae',
    tipo: 'Pseudocereal andino',
    foto: 'amaranto',
    pisoTermico: 'Frío · 2000–3000 msnm (óptimo)',
    proteina: '15–18 %',
    saponina: false,
    resumen: 'Sus espigas colgantes rojas o moradas guardan miles de semillas menudas. Grano de proteína completa, rica en lisina —el aminoácido que le falta al maíz y al trigo—. No amarga: se cocina o se revienta como palomita sin lavarlo.',
    nutriNota: 'Proteína 15–18 % rica en lisina; rinde 1,5–3 t/ha de grano (FAO/NRC). Composición ICBF completa: dato en camino.',
    fuente: 'FAO 2013 · NRC 1989 «Lost Crops of the Incas» · AGROSAVIA (grafo chagra_kg)',
  },
  {
    id: 'chia',
    nombre: 'Chía',
    cientifico: 'Salvia hispanica L.',
    familia: 'Lamiaceae',
    tipo: 'Semilla oleaginosa (no es pseudocereal)',
    foto: 'chia',
    pisoTermico: 'Templado a cálido · 1400–2200 msnm (óptimo)',
    proteina: 'Rica en aceites y fibra',
    saponina: false,
    resumen: 'La única del grupo que pide clima más cálido y NO es andina: es mesoamericana (aztecas y mayas). Su flor azul llama a los polinizadores; la semilla, en agua, suelta un mucílago (baba) que espesa. No amarga, no se desaponifica.',
    nutriNota: 'Semilla rica en aceites (omega-3), fibra y mucílago (FAO). Composición ICBF: dato en camino.',
    fuente: 'FAO · POWO Kew (grafo chagra_kg) — origen mesoamericano, no andino',
  },
  {
    id: 'canihua',
    nombre: 'Cañihua (kañiwa)',
    cientifico: 'Chenopodium pallidicaule Aellen',
    familia: 'Amaranthaceae',
    tipo: 'Pseudocereal de altura extrema',
    foto: 'canihua',
    pisoTermico: 'Frío a páramo · 3500–4200 msnm (óptimo)',
    proteina: '14–19 %',
    saponina: false,
    resumen: 'La prima chiquita y más brava de la quinua: mata de 30–70 cm que aguanta heladas hasta −8 °C, donde ningún otro grano prospera. Ventajón: no tiene saponinas, así que NO hay que lavarla. Reintroducida en Nariño y Boyacá.',
    nutriNota: 'Proteína 14–19 % completa (con lisina), alta en hierro, calcio, magnesio y zinc, y libre de gluten (NRC/FAO). Composición ICBF: dato en camino.',
    fuente: 'NRC 1989 · FAO 2013 · AGROSAVIA — rescate andino (grafo chagra_kg)',
  },
  {
    id: 'tarwi',
    nombre: 'Tarwi (chocho)',
    cientifico: 'Lupinus mutabilis Sweet',
    familia: 'Fabaceae',
    tipo: 'Leguminosa andina (grano)',
    foto: 'tarwi',
    pisoTermico: 'Frío · 2400–3000 msnm (óptimo)',
    proteina: '35–50 %',
    saponina: false,
    amargo: 'alcaloides',
    resumen: 'No es grano de cereal sino leguminosa, y de las más proteicas del mundo (35–50 % en el grano). Además fija nitrógeno del aire (100–160 kg N/ha) y abona el suelo. Su grano trae alcaloides amargos: se desamarga con remojo y enjuagues (ver «Quitar el amargo»).',
    nutriNota: 'Proteína 35–50 % en grano; fija ~100–160 kg N/ha (AGROSAVIA/NRC). Composición ICBF: dato en camino.',
    fuente: 'AGROSAVIA (leguminosas andinas) · NRC 1989 (grafo chagra_kg)',
  },
];

/** La idea grande del mundo (se muestra arriba de las tarjetas). */
export const INTRO_GRANOS = {
  lead: 'Los granos andinos son la despensa que dejaron los abuelos: proteína completa, sin gluten y hechos para el frío de la montaña.',
  clave: 'Recuperar quinua, amaranto y cañihua es recuperar comida sana y semilla propia — cultivos que aguantan sequía y helada donde otros no.',
  cuerpo: 'La quinua, el amaranto y la cañihua son «pseudocereales»: no son parientes del trigo, pero se usan como grano. Su gracia es doble — nutren como pocas cosas de la finca (proteína con todos los aminoácidos esenciales, incluida la lisina que le falta al maíz) y crecen en tierra fría y pobre donde el maíz ya no da. La chía (mesoamericana, de clima más cálido) y el tarwi (una leguminosa) completan el grupo de granos ancestrales que vale la pena volver a sembrar.',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 2 · SIEMBRA Y PISO TÉRMICO
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Ficha de siembra por especie. GROUNDED a `propagation` y `requirements` de
 * cada ficha de ciclo. Distancias exactas donde el catálogo las da (quinua,
 * chía); donde el sitio manda o el catálogo no las fija, se remite como rango
 * orientador y NO se inventa un número cerrado.
 */
export const SIEMBRA_GRANOS = [
  {
    id: 'quinua',
    nombre: 'Quinua',
    epoca: 'Al empezar las lluvias (según la región andina). Ciclo de 5–6 meses del semillero a la trilla.',
    distancia: 'En surcos separados 60–80 cm; se ralea para dejar las plantas parejas. La densidad exacta cambia con la variedad y el suelo.',
    piso: 'Tierra fría a templada; óptimo 1800–2800 msnm (en Colombia se da entre 2500 y 3500 msnm). Aguanta heladas leves (hasta −5 °C en estado vegetativo) y sequía.',
    manejo: 'Sol pleno y muy buen drenaje. Rota con leguminosas (habas, tarwi) y abona con bocashi o biol. Variedades AGROSAVIA adaptadas al altiplano cundiboyacense: Aurora, Tunkahuán y Blanca de Jericó.',
    fuente: 'Ficha de ciclo (AGROSAVIA · FAO 2013 · ICA Res. 3168/2015)',
  },
  {
    id: 'amaranto',
    nombre: 'Amaranto',
    epoca: 'Con las lluvias; ciclo de 5–6 meses. Semilla muy menuda: se siembra en semillero y se trasplanta a los 30–45 días.',
    distancia: 'Se trasplanta a doble fila o se siembra al voleo ralo; luego se entresaca. La semilla es tan fina que no se entierra hondo.',
    piso: 'Tierra fría; óptimo 2000–3000 msnm (tolera de 1500 a 3600). Aguanta heladas moderadas (−3 °C), sequía y suelos pobres.',
    manejo: 'Sol pleno y buen drenaje. Va bien asociado con maíz y fríjol, como en la milpa/chacra andina.',
    fuente: 'Ficha de ciclo (FAO 2013 · NRC 1989 · AGROSAVIA)',
  },
  {
    id: 'chia',
    nombre: 'Chía',
    epoca: 'Es de día corto: florece cuando los días acortan. Siémbrela hacia abril–mayo para que florezca en octubre–noviembre. Ciclo de 4–6 meses. Germina en 4–8 días.',
    distancia: 'Siembra directa, al voleo o en líneas: 30–40 cm entre plantas en la línea y 50–60 cm entre líneas.',
    piso: 'La más cálida del grupo: templado a cálido, óptimo 1400–2200 msnm. Ojo: es sensible al frío (una helada de 2 °C la mata). No es cultivo de páramo.',
    manejo: 'Sol pleno y buen drenaje. Su flor azul atrae abejas y polinizadores — buena vecina para la huerta.',
    fuente: 'Ficha de ciclo (FAO · POWO Kew)',
  },
  {
    id: 'canihua',
    nombre: 'Cañihua',
    epoca: 'Al iniciar las lluvias del altiplano (octubre–noviembre en su cuna puneña). Ciclo corto: 4–6 meses.',
    distancia: 'Al voleo, tapando muy poquito (0,5–1 cm) por lo menuda de la semilla (≈1 mm).',
    piso: 'El grano de altura extrema: frío a páramo, óptimo 3500–4200 msnm. Aguanta heladas hasta −8 °C, granizo, sequía y suelos salinos o ácidos.',
    manejo: 'Sol pleno. Es el «seguro de vida» del altiplano: donde la quinua y la papa ya sufren, la cañihua todavía da. Reintroducida en Nariño (Cumbal, Túquerres) y Boyacá (Rabanal, Pisba).',
    fuente: 'Ficha de ciclo (NRC 1989 · FAO 2013 · AGROSAVIA)',
  },
  {
    id: 'tarwi',
    nombre: 'Tarwi (chocho)',
    epoca: 'En pre-cultivo con las lluvias. Ciclo largo: 6–8 meses.',
    distancia: 'Al voleo, del orden de 8–12 kg de semilla por hectárea.',
    piso: 'Tierra fría; óptimo 2400–3000 msnm (de 2000 a 3600). Aguanta heladas hasta −4 °C y sequía.',
    manejo: 'Leguminosa fijadora de nitrógeno: sirve como grano o como abono verde si se incorpora antes de florecer. Rota con tubérculos andinos (papa, cubios). Va bien con maíz y aliso.',
    fuente: 'Ficha de ciclo (AGROSAVIA · NRC 1989)',
  },
];

/**
 * Cantidades de abono / semilla certificada por hectárea afinadas al sitio:
 * GROUNDED-PENDIENTE a propósito. Dependen del análisis de suelo y la variedad.
 */
export const DOSIS_SIEMBRA = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'Análisis de suelo + recomendación AGROSAVIA por especie/variedad (vía catálogo/AGE y agente)',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 3 · QUITAR EL AMARGO (desaponificado de la quinua + desamargado tarwi)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * EL PASO CLAVE del mundo. La cascarilla de la quinua trae SAPONINAS: un jabón
 * natural amargo que la defiende de pájaros e insectos, pero que hay que quitar
 * antes de comer. GROUNDED (FAO Quinoa Sourcebook 2013): lavado por frote hasta
 * que el agua deje de hacer espuma; las variedades «dulces» (bajo saponina)
 * necesitan menos. El tarwi amarga por ALCALOIDES (otro compuesto) y se desamarga
 * distinto: remojo + cocción + enjuagues por varios días. La cañihua NO tiene
 * saponinas — por eso no se lava. Amaranto y chía tampoco se desaponifican.
 */
export const DESAPONIFICADO_QUINUA = {
  titulo: 'La quinua se lava antes de cocinar',
  porQue: 'La capa de afuera del grano de quinua tiene saponinas: un jabón natural de sabor amargo que la protege en el campo. Si se cocina sin lavar, sabe amarga y puede caer mal. Quitarla es fácil y es el paso que más importa.',
  pasos: [
    { id: 'remojo', titulo: 'Remoje un momento', detalle: 'Ponga la quinua en agua limpia y déjela unos minutos. Así se ablanda la cascarilla y arranca a soltar la saponina.' },
    { id: 'frote', titulo: 'Frote el grano', detalle: 'Refriéguela entre las manos bajo el agua, como lavando fríjol. Va a ver que se hace espuma: esa espuma es la saponina saliendo.' },
    { id: 'enjuague', titulo: 'Enjuague hasta que no haga espuma', detalle: 'Cambie el agua y repita hasta que el agua salga limpia y ya no espume. Ahí está lista: sin amargo, para cocinar como un arroz.' },
  ],
  dulces: 'Las variedades «dulces» o de bajo contenido de saponina (como las mejoradas de AGROSAVIA) piden mucho menos lavado; las amargas criollas, más. Pruebe el grano: si ya no amarga, está.',
  fuente: 'FAO Quinoa Sourcebook 2013 · AGROSAVIA',
};

/** El tarwi amarga por otra cosa (alcaloides) y se desamarga distinto. */
export const DESAMARGADO_TARWI = {
  titulo: 'El tarwi se desamarga aparte',
  detalle: 'El tarwi (chocho) no amarga por saponinas sino por alcaloides. Se desamarga tradicionalmente con remojo, luego cocción, y después varios días de enjuagues en agua corriente (en costal dentro de una acequia o cambiando el agua) hasta que se le va el amargo. Sin ese proceso el grano no se debe comer.',
  fuente: 'AGROSAVIA (leguminosas andinas) · NRC 1989',
};

/** Los que NO se lavan — para no confundir al que aprende. */
export const SIN_DESAPONIFICAR = {
  titulo: 'Estos NO se lavan',
  puntos: [
    'Cañihua: no tiene saponinas. Es su gran ventaja frente a la quinua — se cuece o se tuesta (pito de cañihua) sin lavar.',
    'Amaranto: no amarga. Se cocina como grano o se revienta como palomita.',
    'Chía: no se desaponifica. Se usa la semilla entera; en agua suelta su baba (mucílago) que espesa.',
  ],
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 4 · MILDIÚ Y MANEJO AGROECOLÓGICO
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * El mal principal de la quinua y la cañihua es el MILDIÚ velloso
 * (Peronospora variabilis), citado en las fichas de ciclo. Su manejo es
 * agroecológico: densidad/ventilación, caldo de ceniza, variedades tolerantes y
 * rotación. NO se dan dosis de fungicida de síntesis. El grafo no registra (aún)
 * más plagas con aristas AFFECTS/CONTROLS para estas especies: lo que falte es
 * "dato en camino", no se inventan enemigos ni venenos.
 */
export const MALES_GRANOS = [
  {
    id: 'mildiu',
    nombre: 'Mildiú velloso',
    cientifico: 'Peronospora variabilis',
    tipo: 'enfermedad (hongo/oomiceto)',
    afecta: 'Quinua y cañihua',
    reconocer: [
      'Manchas amarillas o pálidas en la cara de arriba de la hoja que, por debajo, muestran un polvillo grisáceo o violáceo (el "moho velloso").',
      'Avanza fuerte en tiempo húmedo y frío, y cuando la siembra está muy tupida y sin ventilación.',
      'Si defolia la planta antes de tiempo, el grano llena mal y la cosecha baja.',
    ],
    manejo: [
      { titulo: 'Densidad de siembra que ventile', detalle: 'Sembrar a la distancia adecuada (surcos aireados, sin amontonar) es el primer control: una siembra que ventila y le entra sol le corta el paso al mildiú. En quinua, surcos de 60–80 cm.' },
      { titulo: 'Caldo de ceniza', detalle: 'El caldo de ceniza es el biopreparado tradicional de refuerzo contra el mildiú de estos granos. Apoya el manejo; no reemplaza la densidad ni la variedad.' },
      { titulo: 'Variedades tolerantes y rotación', detalle: 'Usar variedades mejoradas más tolerantes (AGROSAVIA) y rotar el lote con leguminosas baja la presión de la enfermedad año con año.' },
    ],
    fuente: 'Fichas de ciclo (AGROSAVIA · FAO 2013)',
  },
  {
    id: 'pajaros',
    nombre: 'Pájaros y grano en el suelo',
    cientifico: '',
    tipo: 'daño de fauna / cosecha',
    afecta: 'Amaranto, quinua y cañihua',
    reconocer: [
      'Los pájaros comen la semilla menuda en la maduración; en cañihua y amaranto el grano se desgrana solo si se pasa de punto.',
      'La saponina amarga de la quinua es, de hecho, parte de su defensa natural contra los pájaros.',
    ],
    manejo: [
      { titulo: 'Cosecha a tiempo', detalle: 'Cosechar en el punto justo (ni verde ni pasado) es el mejor control: evita pérdida por pájaros y por desgrane.' },
      { titulo: 'Espantar sin veneno', detalle: 'Espantapájaros, cintas y ronda en la maduración. Nada de cebos tóxicos.' },
    ],
    fuente: 'Fichas de ciclo (NRC 1989 · AGROSAVIA)',
  },
];

/**
 * Nota anti-receta: el módulo NO da dosis de fungicida/insecticida de síntesis.
 * El manejo mostrado es agroecológico (cultural + biopreparados groundeados).
 */
export const NOTA_SIN_RECETAS_QUIMICAS =
  'Aquí no encontrará dosis de veneno: el manejo de estos granos es agroecológico (densidad de siembra, caldo de ceniza, variedades tolerantes y rotación). Para su caso concreto, hable con su técnico de AGROSAVIA/UMATA o con el agente.';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 5 · COSECHA, TRILLA Y VALOR NUTRICIONAL
 * ──────────────────────────────────────────────────────────────────────── */

/** Cómo se cosecha y se trilla cada grano (manual, a la usanza andina). */
export const COSECHA_TRILLA = {
  titulo: 'Del corte a la trilla',
  pasos: [
    { id: 'punto', titulo: 'El punto de cosecha', detalle: 'La quinua se corta cuando el tallo cambia de color y el grano está duro (no se raya con la uña). El amaranto, cuando las espigas se inclinan y sueltan grano al sacudirlas. La cañihua, cuando la planta está seca — se arranca entera.' },
    { id: 'secado', titulo: 'Secado al sol', detalle: 'Las panojas o plantas se secan al sol unos días (el amaranto, del orden de una semana; la cañihua, en parva). Grano bien seco es grano que se guarda sin enmohecerse.' },
    { id: 'trilla', titulo: 'Trilla y venteo', detalle: 'Se trilla a mano: golpeando con vara o pisando la planta sobre una lona; luego se aventa al viento para separar el grano de la paja. La cañihua se trilla por golpeo o pisoteo sobre lona.' },
    { id: 'guardar', titulo: 'Guardar la semilla', detalle: 'El grano seco y limpio se guarda en seco (tradicionalmente en cántaros de arcilla con ceniza). Separe la mejor semilla para volver a sembrar: así conserva su grano criollo.' },
  ],
  fuente: 'Fichas de ciclo (FAO 2013 · NRC 1989 · AGROSAVIA)',
};

/**
 * EL VALOR NUTRICIONAL — el corazón cultural del mundo. GROUNDED:
 *   - Cifra dura de quinua = ICBF/TCAC 2015 (public/nutricion-humana.json).
 *   - "Proteína completa" (todos los aminoácidos esenciales, incluida la lisina)
 *     y "sin gluten" = FAO / NRC para quinua, amaranto y cañihua.
 * Las cifras ICBF de amaranto/chía/cañihua/tarwi son "dato en camino".
 */
export const VALOR_NUTRICIONAL = {
  titulo: 'Por qué alimentan tanto',
  intro: 'Estos granos dan lo que un plato campesino necesita y una arepa sola no alcanza: proteína de calidad, hierro y —clave para muchas familias— sin gluten.',
  puntos: [
    {
      id: 'proteina-completa',
      titulo: 'Proteína completa',
      detalle: 'La quinua, el amaranto y la cañihua tienen TODOS los aminoácidos esenciales, incluida la lisina —justo la que le falta al maíz y al trigo—. Por eso su proteína se acerca a la de la carne o el huevo, y complementa muy bien la dieta de maíz y fríjol.',
    },
    {
      id: 'sin-gluten',
      titulo: 'Sin gluten',
      detalle: 'Ninguno de estos pseudocereales tiene gluten: sirven para personas celíacas o que no toleran el trigo. Se hacen harinas, coladas, sopas y panes.',
    },
    {
      id: 'hierro',
      titulo: 'Hierro y minerales',
      detalle: 'La quinua aporta 8,4 mg de hierro por 100 g (ICBF) — el más alto de los cultivos del catálogo. La cañihua suma hierro, calcio, magnesio y zinc. Buen refuerzo contra la anemia.',
    },
    {
      id: 'tarwi',
      titulo: 'El tarwi, campeón de proteína',
      detalle: 'El tarwi (chocho), ya desamargado, trae 35–50 % de proteína en el grano: de lo más proteico que se cultiva. Además deja el suelo abonado con el nitrógeno que fija.',
    },
  ],
  cifraQuinua: {
    energia: '356 kcal',
    proteina: '14,6 g',
    hierro: '8,4 mg',
    porcion: 'por 100 g de grano',
    fuente: 'ICBF — Tabla de Composición de Alimentos Colombianos (TCAC), 2015',
  },
  fuente: 'ICBF/TCAC 2015 · FAO 2013 · NRC 1989 (grafo chagra_kg)',
};

/* ────────────────────────────────────────────────────────────────────────
 * FOTOS — créditos de licencia abierta (espejo de public/quinua/creditos.json)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Créditos de las fotos del mundo — FUENTE ÚNICA en el componente, espejo de
 * /public/quinua/creditos.json (mismo patrón que Café/Agua: el JSON público es
 * para auditoría de licencias, este arreglo es el que pinta la UI). Requisito de
 * las licencias CC-BY/CC-BY-SA: atribución visible. Si una foto no carga, la
 * tarjeta cae con gracia a un ícono.
 * @type {{slug:string,autor:string,licencia:string,licenciaUrl:string,fuenteUrl:string}[]}
 */
export const CREDITOS_FOTOS_QUINUA = [
  { slug: 'quinua', autor: 'Michael Hermann', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Productive_quinoa_real_plant.JPG' },
  { slug: 'amaranto', autor: 'C T Johansson', licencia: 'CC BY 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Amaranthus_caudatus-IMG_9190.jpg' },
  { slug: 'chia', autor: 'Pancrat', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Salvia_hispanica_0a.jpg' },
  { slug: 'tarwi', autor: 'Michael Hermann', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Tarwi_(Lupinus_mutabilis),_cultivated_near_Puno,_Peru_(February_2015).JPG' },
  { slug: 'canihua', autor: 'Michael Hermann', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Canihua_at_Atuncolla_near_Sillustani_Juliaca.jpg' },
  { slug: 'grano', autor: 'Ben pcc', licencia: 'Dominio público', licenciaUrl: 'https://commons.wikimedia.org/wiki/Help:Public_domain', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:QuinoaGrains.jpg' },
];
