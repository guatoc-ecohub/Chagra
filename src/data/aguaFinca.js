/**
 * aguaFinca.js — CONTENIDO del módulo "Agua de la finca" (3 pilares).
 *
 * REGLA ANTI-ALUCINACIÓN del módulo: todo lo CUALITATIVO (prácticas, pasos,
 * señales) vive aquí como copy; toda CIFRA DURA (mm de lluvia por zona, Kc por
 * cultivo, ETo por piso térmico, dosis de potabilización, metros legales de
 * ronda) es un SLOT con `valor: null` + `estado: 'grounded_pendiente'` que el
 * pipeline de grounding (DR con fuente → catálogo/AGE) llenará. La UI pinta
 * "dato en camino" cuando el valor es null — NUNCA muestra un número
 * inventado.
 *
 * Convención del slot:
 *   { estado: 'grounded_pendiente', valor: null, fuentePrevista: '<de dónde saldrá>' }
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/* ────────────────────────────────────────────────────────────────────────
 * PILAR 1 · COSECHAR LA LLUVIA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Lluvia mensual típica por zona/municipio (mm/mes).
 * TODO GROUNDED-PENDIENTE: llega aparte por el pipeline de clima (dato
 * IDEAM/estación por municipio, DR en curso). Mientras tanto la calculadora
 * usa el mm que la persona digita (por ejemplo, del pluviómetro casero o de
 * lo que informa el módulo de clima de Chagra).
 */
export const LLUVIA_MENSUAL_ZONA = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'IDEAM — promedios mensuales de precipitación por municipio (pipeline clima Chagra)',
};

/** Pasos del sistema techo→tanque, en orden real de construcción. Cualitativo. */
export const PASOS_COSECHA = [
  {
    id: 'techo',
    titulo: 'El techo que ya tiene',
    detalle: 'Cualquier techo con caída sirve: casa, cocina, marranera, gallinero. Mida el piso que cubre el techo (largo × ancho): esa es el área que cosecha.',
  },
  {
    id: 'canal',
    titulo: 'Canal y bajante',
    detalle: 'Una canaleta con buena pendiente hacia el tanque, sin hojas acumuladas. Revísela antes de las temporadas de lluvia: canal tapada es cosecha perdida.',
  },
  {
    id: 'primeras-aguas',
    titulo: 'Deje ir la primera lavada',
    detalle: 'La primera lluvia después de días secos baja lavando el techo (polvo, hollín, excremento de aves). Desvíela o deséchela: al tanque solo debe entrar agua de techo ya lavado.',
  },
  {
    id: 'tanque',
    titulo: 'Tanque tapado y oscuro',
    detalle: 'Tanque con tapa y sin luz por dentro: la luz cría algas y el tanque destapado cría zancudos. Con malla en la entrada del agua no entran hojas ni animales.',
  },
];

/* ────────────────────────────────────────────────────────────────────────
 * PILAR 2 · REGAR CON MEDIDA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * ETo de referencia por piso térmico (mm/día).
 * TODO GROUNDED-PENDIENTE: valores por piso térmico colombiano con fuente
 * (FAO-56 + estaciones IDEAM; DR de riego). La calculadora acepta el valor
 * digitado mientras llega el dato por zona.
 */
export const ETO_POR_PISO_TERMICO = [
  { piso: 'cálido', etoMmDia: null, estado: ESTADO_GROUNDED_PENDIENTE },
  { piso: 'templado', etoMmDia: null, estado: ESTADO_GROUNDED_PENDIENTE },
  { piso: 'frío', etoMmDia: null, estado: ESTADO_GROUNDED_PENDIENTE },
  { piso: 'páramo', etoMmDia: null, estado: ESTADO_GROUNDED_PENDIENTE },
];

/**
 * Kc (coeficiente de cultivo) por especie y etapa.
 * TODO GROUNDED-PENDIENTE: Kc reales FAO-56 / literatura citada, por cultivo
 * y etapa fenológica, vía DR + catálogo (se conectará con el slug de especie
 * del directorio). `kc: null` = la UI muestra "dato en camino".
 */
export const KC_CULTIVOS = [
  { slug: 'maiz', nombre: 'Maíz', kc: null, estado: ESTADO_GROUNDED_PENDIENTE },
  { slug: 'frijol', nombre: 'Fríjol', kc: null, estado: ESTADO_GROUNDED_PENDIENTE },
  { slug: 'cafe', nombre: 'Café', kc: null, estado: ESTADO_GROUNDED_PENDIENTE },
  { slug: 'platano', nombre: 'Plátano', kc: null, estado: ESTADO_GROUNDED_PENDIENTE },
  { slug: 'tomate', nombre: 'Tomate', kc: null, estado: ESTADO_GROUNDED_PENDIENTE },
  { slug: 'papa', nombre: 'Papa', kc: null, estado: ESTADO_GROUNDED_PENDIENTE },
];

/**
 * Eficiencia por sistema de riego (fracción del agua que sí llega a la raíz).
 * TODO GROUNDED-PENDIENTE: coeficientes con fuente (FAO). Mientras tanto la
 * comparación es solo CUALITATIVA (orden goteo > aspersión > gravedad), sin
 * números inventados.
 */
export const SISTEMAS_RIEGO = [
  {
    id: 'goteo',
    nombre: 'Goteo (o botella gota a gota)',
    pierde: 'Pierde poquito',
    coef: null,
    estado: ESTADO_GROUNDED_PENDIENTE,
    detalle: 'El agua cae despacio al pie de la mata. Se puede armar casero con manguera perforada o botellas. El que más rinde cuando el agua está contada.',
  },
  {
    id: 'aspersion',
    nombre: 'Aspersión (rociador)',
    pierde: 'Pierde algo al viento y al sol',
    coef: null,
    estado: ESTADO_GROUNDED_PENDIENTE,
    detalle: 'Moja también donde no hay raíz, y con sol fuerte parte se evapora antes de caer. Riegue de madrugada o al caer la tarde.',
  },
  {
    id: 'gravedad',
    nombre: 'Por surco o manguera suelta',
    pierde: 'Pierde harto por el camino',
    coef: null,
    estado: ESTADO_GROUNDED_PENDIENTE,
    detalle: 'Mucha agua se infiltra o se escurre antes de llegar a la mata. Si es lo que hay, riegue por tandas cortas y con el surco bien trazado.',
  },
];

/** Prácticas que bajan la sed del cultivo. Cualitativas, agroecología clásica. */
export const PRACTICAS_AHORRO = [
  { id: 'cobertura', titulo: 'Tape el suelo', detalle: 'Hojarasca, pasto de corte o tamo sobre el suelo: la tierra tapada guarda la humedad y no se agrieta al sol.' },
  { id: 'materia-organica', titulo: 'Suelo con materia orgánica', detalle: 'Un suelo con compost y bocashi funciona como esponja: recibe el aguacero y lo suelta despacio.' },
  { id: 'hora', titulo: 'Riegue cuando no hay sol bravo', detalle: 'De madrugada o al atardecer el agua entra a la tierra en vez de evaporarse.' },
  { id: 'observar', titulo: 'Riegue por la planta, no por costumbre', detalle: 'Meta el dedo a la tierra: si a un jeme de hondo está húmeda, todavía no toca. La mata avisa primero con las hojas.' },
];

/* ────────────────────────────────────────────────────────────────────────
 * PILAR 3 · CUIDAR EL AGUA (calidad + nacimiento)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Dosis de potabilización casera (cloro por litro, minutos de hervor, horas
 * de SODIS al sol).
 * TODO GROUNDED-PENDIENTE: dosis exactas con fuente sanitaria (OMS/MinSalud)
 * vía DR. El copy queda cualitativo y seguro mientras tanto.
 */
export const DOSIS_POTABILIZACION = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  cloroGotasPorLitro: null,
  hervorMinutos: null,
  sodisHorasSol: null,
  fuentePrevista: 'OMS / MinSalud — guías de tratamiento casero de agua para consumo',
};

/** Escalera de calidad: para qué sirve cada agua de la finca. Cualitativo. */
export const USOS_DEL_AGUA = [
  { id: 'lluvia-directa', agua: 'Lluvia recién cosechada (tanque tapado)', sirve: 'Riego, animales, lavar, aseo de la casa', ojo: 'Para tomar o cocinar, trátela primero (hierva o desinfecte).' },
  { id: 'quebrada', agua: 'Quebrada o acequia', sirve: 'Riego', ojo: 'Aguas abajo de potreros o viviendas puede traer microbios: no la tome sin tratar.' },
  { id: 'nacimiento', agua: 'Nacimiento protegido', sirve: 'La reserva más valiosa de la finca', ojo: 'Aun así, para consumo humano lo seguro es hervir o desinfectar.' },
];

/** Señales de alarma en el agua — cuándo NO usarla ni para riego de hortaliza. */
export const SENALES_ALERTA_AGUA = [
  'Cambia de color o huele a podrido después de un aguacero.',
  'Espuma que no se deshace (jabones o agroquímicos aguas arriba).',
  'Peces o renacuajos muertos en el cauce.',
  'Nata aceitosa en la superficie.',
];

/**
 * Franja legal de protección alrededor de nacimientos y cauces (metros).
 * TODO GROUNDED-PENDIENTE: metros exactos con la norma citada y vigente
 * (normativa forestal protectora de nacederos y rondas hídricas, DR legal).
 * No se muestra número hasta que esté verificado.
 */
export const RONDA_PROTECCION = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  metrosNacimiento: null,
  metrosCauce: null,
  fuentePrevista: 'Normativa colombiana de rondas hídricas y áreas forestales protectoras (verificación legal en curso)',
};

/**
 * CASO INSIGNIA · "Se me seca el nacimiento en verano".
 * Plan cualitativo por tiempos: qué hacer YA en verano, qué sembrar/cercar en
 * invierno, y cómo leer el clima que viene (conecta con el módulo de clima y
 * el ciclo ENSO que Chagra ya sigue — no se re-implementa aquí).
 */
export const CASO_NACIMIENTO = {
  id: 'nacimiento-seco-verano',
  titulo: 'Se me seca el nacimiento en verano',
  resumen: 'Un nacimiento no se seca de un día para otro: se va quedando solo. Casi siempre es la suma de potrero hasta el borde, árboles tumbados arriba y todo el mundo sacando agua a la vez en la época seca.',
  enVerano: [
    { id: 'no-secar-del-todo', titulo: 'No lo ordeñe hasta el fondo', detalle: 'Si entre todos sacan hasta la última gota, el ojo de agua pierde su hilo y tarda más en volver. Racionen por horas y dejen siempre un remanente corriendo.' },
    { id: 'lluvia-alivia', titulo: 'Use la lluvia guardada primero', detalle: 'Cada caneca de lluvia cosechada en invierno es agua que en verano NO se le saca al nacimiento. Por eso este módulo empieza por el techo.' },
    { id: 'sombra-de-emergencia', titulo: 'No despeje más monte alrededor', detalle: 'En plena sequía ni socole ni queme cerca del ojo de agua: esa sombra es lo que le queda de humedad.' },
  ],
  enInvierno: [
    { id: 'cercar', titulo: 'Cierre el paso del ganado', detalle: 'Una cerca sencilla alrededor del nacimiento evita el pisoteo que compacta el suelo y ensucia el agua. Deje un bebedero afuera para los animales.' },
    { id: 'sembrar-nativas', titulo: 'Siembre monte nativo alrededor', detalle: 'Árboles y matorral nativo de su piso térmico alrededor del ojo de agua y aguas arriba: sus raíces son las que guardan el agua del invierno para soltarla en verano.' },
    { id: 'zanjas', titulo: 'Ayude a que el aguacero entre a la tierra', detalle: 'Zanjas de infiltración a nivel, terrazas y suelo tapado ladera arriba: el agua que corre se pierde; la que se infiltra es la que el nacimiento le devuelve en verano.' },
  ],
  comunidad: [
    { id: 'vecinos', titulo: 'El agua es de la vereda', detalle: 'Si el nacimiento abastece a varios, siéntense a acordar turnos y a cuidar juntos la parte alta. Un solo vecino cuidando no alcanza.' },
    { id: 'clima', titulo: 'Léale el paso al clima', detalle: 'Chagra ya sigue el ciclo del Niño y la Niña en su módulo de clima: cuando viene un Niño (más seco), guarde más lluvia desde antes y raciónese temprano.' },
  ],
};

/** Los 3 pilares del módulo — estructura de navegación. */
export const PILARES_AGUA = [
  { id: 'lluvia', titulo: 'Cosechar la lluvia', corto: 'Lluvia', descripcion: 'Del techo al tanque: cuánta agua le cae gratis y cómo guardarla.' },
  { id: 'riego', titulo: 'Regar con medida', corto: 'Riego', descripcion: 'Cuánta agua necesita de verdad su cultivo y cómo no botarla.' },
  { id: 'cuidar', titulo: 'Cuidar el agua', corto: 'Cuidar', descripcion: 'Agua sana para la casa y un nacimiento que no se seque.' },
];
