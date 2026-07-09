/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (variedades, ciclo, plagas y beneficio del café), pendiente de migrar a
 * src/config/messages.js — mismo criterio que aguaFinca.js / sanidadData.js.
 */
/**
 * cafeFinca.js — CONTENIDO del mundo "El café" (5 estaciones del ciclo cafetero).
 *
 * REGLA ANTI-ALUCINACIÓN (igual que aguaFinca.js): todo lo CUALITATIVO
 * (variedades, prácticas, señales de plaga, pasos del beneficio) vive aquí como
 * copy groundeado en fuentes colombianas (Cenicafé, FNC, AGROSAVIA, ICA). Las
 * CIFRAS DURAS que dependen del sitio (densidad de siembra exacta por sistema,
 * dosis, kg de fertilizante) NO se inventan: son SLOTS `grounded_pendiente` o se
 * remiten al análisis de suelo / al agente. Los rangos de tiempo del beneficio
 * (fermentación, secado) y los umbrales de humedad son valores de referencia de
 * Cenicafé, presentados como RANGO orientador que varía con clima y altitud.
 *
 * GROUNDING del grafo (public/grafo-relations.json → species.coffea_arabica):
 *   - ciclo bimodal, dos picos de cosecha (abr–jun / sep–dic), 1200–2200 msnm.
 *   - plagas y controladores biológicos: pest_controllers (broca, roya, ojo de
 *     gallo, cercospora, cochinilla) — se reflejan aquí SIN inventar nuevos.
 *   - sombra/asociación: compatible_with (guamo, plátano, nogal, aliso, balú).
 *   - biopreparados: la lista de coffea_arabica (caldo bordelés, cola de caballo
 *     + ceniza anti-roya, Beauveria, bocashi, etc.).
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/** Ruta base de las fotos del mundo café (Wikimedia Commons, licencia abierta). */
export const FOTO_BASE_CAFE = '/cafe';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIONES (pestañas del mundo)
 * ──────────────────────────────────────────────────────────────────────── */
export const ESTACIONES_CAFE = [
  { id: 'siembra', titulo: 'Variedad y siembra', descripcion: 'Escoja y levante la mata' },
  { id: 'sombra', titulo: 'Sombra y suelo', descripcion: 'Con quién vive y qué come' },
  { id: 'males', titulo: 'Broca y roya', descripcion: 'Reconózcalas y manéjelas' },
  { id: 'cosecha', titulo: 'Flor y cosecha', descripcion: 'Florece y se recoge' },
  { id: 'beneficio', titulo: 'El beneficio', descripcion: 'Del grano a la pasilla' },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 1 · VARIEDAD Y SIEMBRA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Variedades de café arábico sembradas en Colombia, con su comportamiento
 * frente a la ROYA (Hemileia vastatrix) — el dato que más pesa al escoger.
 *
 * GROUNDED: Cenicafé / Federación Nacional de Cafeteros. La resistencia a roya
 * de Colombia, Castillo® y Cenicafé 1 viene de introducir genes del Híbrido de
 * Timor; Típica y Caturra son susceptibles. NO se inventan cifras de
 * rendimiento (quintales/ha): esas dependen del sitio y del manejo.
 */
export const VARIEDADES_CAFE = [
  {
    id: 'tipica',
    nombre: 'Típica (pajarito, arábigo)',
    roya: 'susceptible',
    porte: 'alto',
    nota: 'La variedad histórica del café colombiano. Grano grande y buena taza, pero porte alto (menos matas por hectárea) y sin defensa contra la roya. Casi no se siembra nueva.',
    fuente: 'Cenicafé / FNC',
  },
  {
    id: 'caturra',
    nombre: 'Caturra',
    roya: 'susceptible',
    porte: 'bajo',
    nota: 'Mutación de porte bajo del Borbón: cabe más mata en menos tierra y responde bien al abono. Muy productiva, pero también SUSCEPTIBLE a la roya — si la siembra, va a tener que manejarla.',
    fuente: 'Cenicafé / FNC',
  },
  {
    id: 'colombia',
    nombre: 'Variedad Colombia',
    roya: 'resistente',
    porte: 'bajo',
    nota: 'La primera resistente a roya que sacó Cenicafé. Es una variedad COMPUESTA (una mezcla de líneas hermanas): esa diversidad es la que le da la resistencia. Porte bajo, buena taza.',
    fuente: 'Cenicafé / FNC',
  },
  {
    id: 'castillo',
    nombre: 'Castillo®',
    roya: 'resistente',
    porte: 'bajo',
    nota: 'La resistente a roya más sembrada hoy, con versiones regionales (Castillo El Rosario, Naranjal, Paraguaicito…) ajustadas a cada zona. Grano grande, porte bajo. Escoja la de su región.',
    fuente: 'Cenicafé / FNC',
  },
  {
    id: 'cenicafe1',
    nombre: 'Cenicafé 1',
    roya: 'resistente',
    porte: 'bajo',
    nota: 'La más nueva de Cenicafé: resistente a roya, grano grande y muy uniforme, porte bajo para siembra densa. Buena opción para renovar con material nuevo.',
    fuente: 'Cenicafé / FNC',
  },
];

/**
 * Del germinador a la mata en el lote: los pasos del almácigo, en orden.
 * GROUNDED (Cenicafé, manejo de almácigos): los tiempos son de referencia
 * (varían con clima y altitud), NO recetas fijas.
 */
export const PASOS_ALMACIGO = [
  {
    id: 'semilla',
    titulo: 'Semilla sana y certificada',
    detalle: 'Empiece de semilla de una fuente confiable (Cenicafé/comité de cafeteros) de la variedad que escogió. De semilla revuelta sale un cafetal desparejo y sin la resistencia que buscaba.',
  },
  {
    id: 'germinador',
    titulo: 'Germinador (la chapola)',
    detalle: 'La semilla se pone en arena lavada, tapada y a la sombra. Al mes y medio o dos meses sale la "chapola" (las dos hojitas de cotiledón, como mariposa). Ahí se trasplanta a la bolsa.',
  },
  {
    id: 'almacigo',
    titulo: 'Almácigo en bolsa',
    detalle: 'La chapola pasa a bolsa con tierra buena (revuelta con materia orgánica bien descompuesta). Se cría a media sombra, con riego parejo, hasta que tenga entre 6 y 8 pares de hojas (unos 6 meses).',
  },
  {
    id: 'siembra',
    titulo: 'Al lote',
    detalle: 'La mata se lleva al campo cuando está "de cruz" (6–8 pares de hojas, tallo firme). Hoyo bien hecho, sin enterrar el cuello, y con el aguacero encima para que pegue. La distancia depende de la variedad y del sistema (a libre exposición o bajo sombra).',
  },
];

/**
 * Densidad de siembra (matas/ha) por sistema. GROUNDED-PENDIENTE: cambia con la
 * variedad, el porte y si es libre exposición o bajo sombra; se aterriza con el
 * catálogo/AGE y el agente. No se muestra un número inventado.
 */
export const DENSIDAD_SIEMBRA = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'Cenicafé — densidades por variedad y sistema (libre exposición vs. sombra), vía catálogo/AGE',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 2 · SOMBRA Y SUELO
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Árboles de sombra y asociación del café. GROUNDED: son el `compatible_with`
 * de coffea_arabica en el grafo (guamo, plátano, nogal cafetero, aliso, balú).
 * NO se agregan especies que el grafo no respalde.
 */
export const SOMBRA_ASOCIACION = [
  {
    id: 'guamo',
    nombre: 'Guamo',
    cientifico: 'Inga edulis',
    papel: 'Sombra que abona',
    detalle: 'La sombra clásica del cafetal. Es leguminosa: fija nitrógeno del aire y lo deja en el suelo, y su hojarasca es un abono constante. Da sombra pareja y regula el calor.',
  },
  {
    id: 'platano',
    nombre: 'Plátano',
    cientifico: 'Musa × paradisiaca',
    papel: 'Sombra temporal + comida',
    detalle: 'La compañía de los primeros años: da sombra rápida mientras el café es pequeño y, de paso, comida y plata mientras el cafetal entra en producción. Su tallo picado vuelve al suelo como abono.',
  },
  {
    id: 'nogal',
    nombre: 'Nogal cafetero',
    cientifico: 'Cordia alliodora',
    papel: 'Sombra alta y madera',
    detalle: 'Árbol de sombra alta que deja pasar luz y, con los años, da madera fina. Su copa rala combina bien con el café sin ahogarlo.',
  },
  {
    id: 'aliso',
    nombre: 'Aliso andino',
    cientifico: 'Alnus acuminata',
    papel: 'Sombra que abona (zona fría)',
    detalle: 'Para cafetales de tierra fría y alta: fija nitrógeno y mejora el suelo, crece rápido y protege del viento y las heladas.',
  },
  {
    id: 'balu',
    nombre: 'Chachafruto (balú)',
    cientifico: 'Erythrina edulis',
    papel: 'Sombra que abona + alimento',
    detalle: 'Leguminosa de altura que fija nitrógeno y además da vaina comestible muy nutritiva. Doble propósito: abona el cafetal y alimenta la casa.',
  },
];

/** Qué pide el café del suelo (cualitativo — el detalle fino sale del análisis). */
export const SUELO_CAFE = [
  {
    id: 'acidez',
    titulo: 'Le gusta el suelo un poco ácido',
    detalle: 'El café prospera en suelos ligeramente ácidos (pH cercano a 5–5,5). Antes de encalar o abonar, hágase un análisis de suelo: encalar a ciegas puede pasarse y hacer daño.',
  },
  {
    id: 'materia-organica',
    titulo: 'Materia orgánica, siempre',
    detalle: 'La pulpa compostada, la gallinaza, el bocashi y la hojarasca de la sombra mantienen el suelo vivo y esponjoso. Un cafetal bien nutrido resiste mejor la roya.',
  },
  {
    id: 'analisis',
    titulo: 'Abone con cuenta, no de oído',
    detalle: 'La cantidad de abono y de cal depende de lo que diga el análisis de su lote y de la edad del cafetal. No hay una dosis única que sirva para toda finca.',
  },
];

/**
 * Dosis de fertilización (N-P-K, cal). GROUNDED-PENDIENTE a propósito: depende
 * del análisis de suelo del lote, la variedad y la edad del cafetal. Se remite
 * al cuaderno del suelo (salud_suelo) y al agente. NUNCA una dosis inventada.
 */
export const FERTILIZACION_CAFE = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'Análisis de suelo del lote + recomendación Cenicafé por edad/variedad (cuaderno del suelo)',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 3 · BROCA Y ROYA (reconocer + manejo agroecológico/MIP)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Las dos amenazas clave del café colombiano. Reconocerlas + manejo
 * agroecológico e MIP. Los controladores biológicos son los del grafo
 * (pest_controllers de coffea_arabica): NO se inventan enemigos naturales ni
 * dosis químicas. Los biopreparados citados están en la lista del grafo.
 */
export const MALES_CAFE = [
  {
    id: 'broca',
    nombre: 'La broca',
    cientifico: 'Hypothenemus hampei',
    tipo: 'plaga (escarabajo)',
    foto: 'broca',
    plagaGrafo: 'Broca del café',
    reconocer: [
      'Un cucarroncito negro diminuto (2 mm) que perfora el fruto por la "corona" (la puntica de abajo).',
      'Al abrir el grano encontrará galerías y aserrín; el grano queda picado ("brocado") y pierde peso y calidad.',
      'Ataca sobre todo los frutos que ya están llenando y madurando; los que se caen y quedan en el suelo son su criadero.',
    ],
    manejo: [
      { titulo: 'RE-RE: recolección oportuna y repase', detalle: 'La regla de oro. Coja a tiempo y complete la recolección: no deje frutos maduros, sobremaduros ni secos en la mata ni en el suelo. El repase (recoger los que quedaron) le corta la comida y la casa a la broca.' },
      { titulo: 'Trampas con alcohol', detalle: 'Trampas caseras cebadas con alcohol ayudan a atrapar y a vigilar la broca voladora, sobre todo entre cosechas.' },
      { titulo: 'Control biológico (Beauveria)', detalle: 'El hongo Beauveria bassiana enferma a la broca; también hay avispas parásitas que la atacan. Funcionan mejor acompañando al RE-RE, no en vez de él.' },
    ],
    fuente: 'Cenicafé (manejo integrado de la broca) · controladores del grafo Chagra',
  },
  {
    id: 'roya',
    nombre: 'La roya',
    cientifico: 'Hemileia vastatrix',
    tipo: 'enfermedad (hongo)',
    foto: 'roya',
    plagaGrafo: 'Roya del café',
    reconocer: [
      'Manchas amarillas en la cara de arriba de la hoja que, al voltearla, muestran un polvo anaranjado por el envés: ese polvo son las esporas.',
      'Las hojas atacadas se caen; una mata muy defoliada rinde poco y se debilita.',
      'Empuja fuerte cuando el cafetal está muy cargado, mal nutrido o con exceso de humedad y poca ventilación.',
    ],
    manejo: [
      { titulo: 'La defensa #1: variedad resistente', detalle: 'La forma más segura de manejar la roya es sembrar variedad resistente (Castillo®, Colombia, Cenicafé 1). Si va a renovar, renueve con resistente.' },
      { titulo: 'Sombra y nutrición al punto', detalle: 'Regule la sombra para que ventile y entre luz, y mantenga la mata bien nutrida. Un cafetal sano y aireado le pone las cosas difíciles al hongo.' },
      { titulo: 'Biopreparados de refuerzo', detalle: 'El caldo bordelés y el caldo de cola de caballo con ceniza (refuerzo silíceo) ayudan como protección; también hay biofungicidas de hongos/bacterias antagonistas. Son apoyo, no reemplazan la variedad resistente.' },
    ],
    fuente: 'Cenicafé (manejo de la roya) · biopreparados y controladores del grafo Chagra',
  },
];

/**
 * Nota anti-receta: el módulo NO da dosis de fungicida/insecticida de síntesis.
 * El manejo que se muestra es agroecológico e MIP (cultural + biológico +
 * biopreparados groundeados). Para el caso puntual de una finca, el agente.
 */
export const NOTA_SIN_RECETAS_QUIMICAS =
  'Aquí no encontrará dosis de veneno: el manejo es agroecológico e integrado (recolección, control biológico y biopreparados). Para su caso concreto, hable con su técnico del comité de cafeteros o con el agente.';

/**
 * UMBRAL Y VENTANA DE MANEJO DE LA BROCA — grounding de FUENTE OFICIAL Cenicafé
 * (FNC), extraído por lectura directa (visión) de las cartillas técnicas; ver
 * Chagra-strategy/ops/GROUNDING-PDFS-2026-07-09.md. Complementa MALES_CAFE (que
 * trae el reconocimiento y el RE-RE) con las CIFRAS DURAS de DECISIÓN de manejo,
 * cada una con su página exacta [FUENTE ... pág. X]. Son cifras de MONITOREO y de
 * decisión agroecológica/MIP (cuándo y con qué intervenir por vía biológica y
 * cultural); NO son dosis de veneno de síntesis — esas se omiten a propósito,
 * igual que en NOTA_SIN_RECETAS_QUIMICAS.
 *
 * Fuentes:
 *  - Cenicafé, Avances Técnicos 445 (julio 2014), "Recomendaciones para la
 *    reducción del riesgo en la caficultura de Colombia ante un evento climático
 *    de El Niño", pág. 9 (recomendaciones para el manejo integrado de la broca).
 *  - Benavides M., P.; Arévalo M. "Manejo integrado: una estrategia para el
 *    control de la broca del café en Colombia." Cenicafé 53(1):39-48. 2002.
 */
export const UMBRAL_MANEJO_BROCA = {
  titulo: 'Cuándo y cómo intervenir la broca',
  periodoCritico:
    'El ataque de la broca se concentra en una ventana: empiece a evaluar la infestación a partir de los 120 días después de la floración principal en zonas de dos cosechas al año, y a los 90 días en zonas de una sola floración. [FUENTE Cenicafé, Avances Técnicos 445, pág. 9]',
  umbral:
    'Se llega al momento de intervenir cuando la infestación supera el 2 % de los frutos Y más del 50 % de las brocas están en posición de penetración A y B (la broca apenas entrando al fruto, todavía alcanzable). Ese doble criterio —cuántos frutos y en qué posición está la broca— es el que marca el punto. [FUENTE Cenicafé, Avances Técnicos 445, pág. 9]',
  calidadExportable:
    'La meta de calidad: para vender café pergamino seco Tipo Federación (calidad exportable) la infestación de broca debe quedar por debajo del 5 %. En la finca de referencia bajó de un 30 % de infestación a que el 83 % de la cosecha se vendiera como Tipo Federación tras adoptar el manejo integrado. [FUENTE Cenicafé 53(1):39-48, 2002, pág. 39]',
  practicas: [
    'Haga el repase apenas termine la cosecha principal y la mitaca: no deje frutos maduros, sobremaduros ni secos en la mata ni en el suelo. [FUENTE Cenicafé, Av. Téc. 445, pág. 9]',
    'Deje dos surcos de "árboles trampa" con fruto y coséchelos cada quince días durante dos meses; luego zoquéelos eliminando todos los frutos. Capturan la broca que emerge de los frutos del suelo. [FUENTE Cenicafé 53(1), 2002, pág. 41]',
    'En cosecha, evite que la broca voladora escape a la siguiente florada: costales cerrados, y solarice pasillas y flotes bajo plástico por 48 horas antes de secarlas. [FUENTE Cenicafé, Av. Téc. 445, pág. 9]',
  ],
  controlBiologico:
    'El hongo Beauveria bassiana se asperja sobre las brocas que emergen de los frutos caídos al suelo, en dosis del orden de 5 × 10⁸ esporas por hectárea (cepa con patogenicidad a la broca mayor al 90 %); es refuerzo del RE-RE, no lo reemplaza. [FUENTE Cenicafé 53(1):39-48, 2002, pág. 41]',
  fuente:
    'Cenicafé (FNC): Avances Técnicos 445 (2014) y Cenicafé 53(1):39-48 (2002), "Manejo integrado: una estrategia para el control de la broca del café en Colombia" (Benavides & Arévalo). Detalle y páginas en GROUNDING-PDFS-2026-07-09.md.',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 4 · FLOR Y COSECHA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * El ciclo flor→cosecha. GROUNDED del grafo (perennialCycles.coffea_arabica):
 * régimen bimodal, dos picos (abr–jun y sep–dic), floración tras el déficit
 * hídrico de la temporada seca, primera cosecha a los 2–5 años. 1200–2200 msnm.
 */
export const CICLO_FLOR_COSECHA = {
  primeraCosechaAnios: [2, 5],
  regimen: 'bimodal',
  picosCosecha: 'abril–junio y septiembre–diciembre',
  altitud: '1200–2200 msnm',
  disparador: 'Las lluvias después de la temporada seca disparan la floración; de la flor al grano maduro pasan unos 7–8 meses.',
  fuente: 'Cenicafé, Universidad Nacional de Colombia (grafo Chagra, confianza alta)',
  pasos: [
    {
      id: 'floracion',
      titulo: 'La florecida',
      detalle: 'Después de un tiempo seco, con las primeras lluvias el cafetal se llena de flor blanca y olorosa de un día para otro. De esa flor sale la cereza.',
    },
    {
      id: 'llenado',
      titulo: 'El llenado del grano',
      detalle: 'La cereza crece verde y va llenando durante meses. De la flor al grano maduro pasan unos 7–8 meses; por eso en la misma mata hay flor, verde y maduro a la vez.',
    },
    {
      id: 'maduracion',
      titulo: 'Se pinta la cereza',
      detalle: 'El fruto pasa de verde a pintón y luego a rojo o amarillo bien maduro. Ese es el punto: ni verde (mala taza) ni pasado (se broca y se cae).',
    },
  ],
};

/** Por qué la recolección SELECTIVA (grano a grano, solo maduros) es la clave. */
export const RECOLECCION_SELECTIVA = {
  titulo: 'Coja solo el maduro, grano por grano',
  puntos: [
    'Recolección selectiva = coger únicamente las cerezas bien maduras (rojas o amarillas), dejando las verdes para el siguiente pase. Es más trabajo, pero es lo que da café de calidad.',
    'El verde arruina la taza y el pintón rinde menos; cogerlo todo revuelto castiga el precio.',
    'Dejar sobremaduros y secos en la mata es criar broca: la recolección a tiempo y completa es, a la vez, cosecha y control de plaga.',
  ],
  fuente: 'Cenicafé / FNC (calidad y manejo de cosecha)',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 5 · EL BENEFICIO (despulpado → fermentación → lavado → secado)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * El beneficio húmedo (lavado), paso a paso. GROUNDED (Cenicafé, beneficio del
 * café): los tiempos de fermentación y el punto de secado son RANGOS de
 * referencia que varían con clima y altitud — se presentan como tal, no como
 * receta exacta.
 */
export const PASOS_BENEFICIO = [
  {
    id: 'despulpado',
    titulo: 'Despulpado el mismo día',
    icono: 'despulpado',
    detalle: 'Se le quita la pulpa a la cereza el mismo día de la cogida (idealmente sin agua o con muy poca, como en el beneficio ecológico). Cereza amontonada de un día para otro fermenta mal y sabe a vinagre.',
    cuidado: 'No amontone la cereza en costal caliente: se "amostaza" y daña la taza.',
  },
  {
    id: 'fermentacion',
    titulo: 'Fermentación (soltar la baba)',
    icono: 'fermentacion',
    detalle: 'El grano despulpado queda con una baba pegajosa (mucílago). En el tanque, la fermentación la va soltando. El tiempo es un RANGO —del orden de 12 a 18 horas— y depende del clima y la altura: en tierra fría tarda más, en cálida menos.',
    cuidado: 'El punto se prueba, no se cronometra: cuando el grano deja de estar baboso y "suena" áspero, está listo. Pasarse de fermentación daña la taza.',
  },
  {
    id: 'lavado',
    titulo: 'Lavado con agua limpia',
    icono: 'lavado',
    detalle: 'Se enjuaga el grano hasta que quede limpio, sin baba. El agua debe ser limpia; el agua miel y el lavado se manejan aparte para no contaminar la quebrada.',
    cuidado: 'Las aguas del beneficio (aguamiel) contaminan si van directo al agua: manéjelas (fosas, riego controlado). Enlaza con el mundo del Agua.',
  },
  {
    id: 'secado',
    titulo: 'Secado hasta el punto',
    icono: 'secado',
    detalle: 'El café lavado (pergamino) se seca al sol en marquesina, paseras o secador, revolviéndolo para que quede parejo. El punto de guardar es cuando llega a un 10–12 % de humedad: ni húmedo (se enmohece) ni sobreseco.',
    cuidado: 'Grano guardado húmedo cría moho y hongos (ojo con las micotoxinas). El punto exacto se mide con medidor de humedad si lo tiene.',
  },
];

/** Nota de grounding para los rangos del beneficio (honestidad de fuente). */
export const BENEFICIO_FUENTE =
  'Rangos de referencia de Cenicafé (beneficio húmedo del café): la fermentación (12–18 h aprox.) y el punto de secado (10–12 % de humedad) varían con el clima y la altitud. Ajústelos a su finca; el punto se confirma a la prueba, no solo al reloj.';

/**
 * La pulpa como abono — el cierre del ciclo y el ENLACE al mundo del compost /
 * estiércol ("Del corral al abono"). GROUNDED: la pulpa es cerca del 40 % del
 * fruto fresco; compostada o lombricompostada vuelve al cafetal como abono
 * (Cenicafé). Se remite al mundo estiércol para el "cómo" del compostaje.
 */
export const PULPA_ABONO = {
  titulo: 'La pulpa no es basura: es abono',
  resumen: 'Casi la mitad del peso de la cereza es pulpa. Botada, apesta y contamina la quebrada; compostada o pasada por lombriz, vuelve al cafetal convertida en el mejor abono —el que le devuelve al suelo lo que el grano se llevó.',
  puntos: [
    'Amontone la pulpa en fosa o cajón, tápela y déjela descomponer (o métala a la lombricultura): en unos meses es abono maduro.',
    'Ese abono cierra el ciclo: la pulpa del café de este año alimenta el cafetal del próximo, y usted compra menos fertilizante.',
    'Pulpa fresca regada al pie de la mata atrae plagas y se pudre mal: primero se composta.',
  ],
  enlaceMundo: 'estiercol',
  enlaceLabel: 'Cómo compostar la pulpa',
  fuente: 'Cenicafé (aprovechamiento de la pulpa de café)',
};

/* ────────────────────────────────────────────────────────────────────────
 * FOTOS — créditos de licencia abierta (se completa desde public/cafe/creditos.json)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Créditos de las fotos del mundo café — FUENTE ÚNICA en el componente, espejo
 * de /public/cafe/creditos.json (mismo patrón que Almacenamiento/Agua: el JSON
 * público es para auditoría de licencias, este arreglo es el que pinta la UI).
 * Requisito de las licencias CC-BY/CC-BY-SA: atribución visible. Si una foto no
 * está o no carga, la tarjeta cae con gracia a un ícono.
 * @type {{slug:string,autor:string,licencia:string,licenciaUrl:string,fuenteUrl:string}[]}
 */
export const CREDITOS_FOTOS_CAFE = [
  { slug: 'cafetal', autor: 'Timothy A. Gonsalves', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Coffee_Shade_Trees_Paddy_Fields_Coorg_Feb24_R16_07670.jpg' },
  { slug: 'cereza', autor: 'Adwaith08', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:The_Red_coffee_beans.jpg' },
  { slug: 'almacigo', autor: 'CIAT', licencia: 'CC BY-SA 2.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/2.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:New_coffee_varieties_in_a_nursery_at_a_coffee_farm_in_Cauca,_southwestern_Colombia.jpg' },
  { slug: 'flor', autor: 'Ajtjohnsingh', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Coffea_arabica,_AJT_Johnsingh._.DSCN7017.jpg' },
  { slug: 'roya', autor: 'Howard F. Schwartz', licencia: 'CC BY 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by/3.0/us/deed.en', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Hemileia_vastatrix.jpg' },
  { slug: 'broca', autor: 'L. Shyamal', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Hypothenemus.jpg' },
  { slug: 'secado', autor: 'JPDAFT', licencia: 'CC0', licenciaUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:%22Helda%22_for_drying_coffee_in_Colombia.jpg' },
  { slug: 'beneficio', autor: 'Kızıldeniz', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Despulpadora_de_cafe.jpg' },
  { slug: 'pulpa', autor: 'Daniel Case', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Dried_coffee_cherry_husk_pile_at_Fairview_Estate,_Kiambu,_KE.jpg' },
];
