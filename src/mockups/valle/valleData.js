/*
 * DATOS DE MUESTRA del mockup "El valle de mi finca" (#/mockups/entrada-3d).
 *
 * NO cablea sesión, farmOS ni Open-Meteo: es una DECISIÓN VISUAL. Todo lo de
 * aquí es plausible para una finca andina (~2.400 m) pero inventado con cuidado
 * para la demo. Si algún día se productiza, estos datos vienen del backend.
 *
 * Los 4 "sí-o-sí" de la entrada de Chagra viven en el ESPACIO del valle:
 *   1. ALERTA / qué-hacer-hoy  → `COSA_DEL_DIA`, anclada sobre un lugar real.
 *   2. LOS MUNDOS              → `MUNDOS_VALLE`: cada mundo es un LUGAR con
 *                                coordenadas 3D por el que se viaja.
 *   3. AGENTE / VOZ            → `NARRACION`: lo que el compañero dice al pasar.
 *   4. ESTADO / CLIMA          → `CLIMAS`: tiñe el ambiente (grades de effects).
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup dev con datos de
   muestra (no UI de producto); si se productiza, el copy migra a messages.js
   (ADR-050). */

import { MUNDO_BY_ID } from '../../components/dashboard/mundosFinca';
/* La franja del día sale de UNA fuente (cielosHoraData): el mismo mapa de
   bandas que usan los mundos 3D — el valle y los dioramas giran juntos. */
import { horaDeReloj } from '../../visual/mundo3d/cielosHoraData.js';

/* ── 0. LOS PISOS TÉRMICOS: EL GRADIENTE DE ALTITUD DE LA FINCA ANDINA ───────
 * Una finca de ladera TREPA la montaña: del plátano en tierra caliente abajo
 * al frailejón del páramo arriba. Aquí ese gradiente es la ESTRUCTURA del
 * terreno — franjas por altura, cada una con su color (perspectiva de altura)
 * y su vegetación típica. El eje z ES la ladera: al fondo (z negativo) sube al
 * páramo; al frente (z positivo) baja a tierra caliente.
 *
 * Los rangos de altura (msnm) y temperatura salen de la tabla oficial
 * IDEAM/IGAC (src/data/piso-termico.json); aquí se ANCLAN al espacio del valle.
 * Todo lo visual (color del suelo, dónde brota cada mata, la pendiente) se LEE
 * de esta tabla — layout por datos, no a mano. Ordenados de abajo (frente,
 * cálido) hacia arriba (fondo, páramo).
 */
export const PISOS_TERMICOS = [
  {
    id: 'calido',
    nombre: 'Tierra caliente',
    msnm: '0–1000 m',
    tempC: '> 24 °C',
    z0: 3.4, // borde frontal de la franja (bajo, cerca de la cámara)
    z1: 8.5, // borde trasero
    color: '#84a83f', // verde cálido amarillento
    cresta: '#afc85a',
    vegetacion: 'platano',
    cultivos: 'Plátano y frutales',
  },
  {
    id: 'templado',
    nombre: 'Clima medio',
    msnm: '1000–2000 m',
    tempC: '18–24 °C',
    z0: -0.6,
    z1: 3.4,
    color: '#4e9143', // verde vivo
    cresta: '#77b256',
    vegetacion: 'cafe',
    cultivos: 'Café y maíz',
  },
  {
    id: 'frio',
    nombre: 'Clima frío',
    msnm: '2000–3000 m',
    tempC: '12–18 °C',
    z0: -5.2,
    z1: -0.6,
    color: '#3c7f64', // verde-azulado
    cresta: '#5fa07f',
    vegetacion: 'papa',
    cultivos: 'Papa y tubérculos',
  },
  {
    id: 'paramo',
    nombre: 'Páramo',
    msnm: '> 3000 m',
    tempC: '< 12 °C',
    z0: -11,
    z1: -5.2,
    color: '#63807a', // frío grisáceo del alto andino
    cresta: '#8ba597',
    vegetacion: 'frailejon',
    cultivos: 'Frailejones',
  },
];

/** Piso térmico al que pertenece una coordenada z del valle. */
export function pisoEnZ(z) {
  for (const p of PISOS_TERMICOS) {
    if (z >= p.z0 && z < p.z1) return p;
  }
  // Fuera de rango: el frente cae a cálido, el fondo a páramo.
  return z >= PISOS_TERMICOS[0].z1 ? PISOS_TERMICOS[0] : PISOS_TERMICOS[PISOS_TERMICOS.length - 1];
}

/* Matas de MUESTRA sembradas por su piso (pocas y a los lados: dejan aire en
 * el centro y hacen legible el cambio de vegetación por altura). Cada una trae
 * el `tipo` que su piso siembra — la geometría la resuelve la escena. */
export const VEGETACION_PISOS = [
  { piso: 'paramo', pos: [-5.6, -7.8] },
  { piso: 'paramo', pos: [1.2, -8.3] },
  { piso: 'paramo', pos: [4.8, -6.6] },
  // Los frailejones que ARROPAN al Ent de la vista del páramo (VISTA_PARAMO
  // en [2.2, -7.4]): el filo se lee páramo de verdad, no un solo mojón.
  { piso: 'paramo', pos: [3.3, -7.9] },
  { piso: 'paramo', pos: [2.9, -6.6] },
  { piso: 'paramo', pos: [-7.4, -6.9] },
  { piso: 'frio', pos: [-6.0, -3.6] },
  { piso: 'frio', pos: [3.0, -4.4] },
  { piso: 'frio', pos: [-7.6, -2.4] },
  { piso: 'templado', pos: [-2.4, 1.0] },
  { piso: 'templado', pos: [6.2, 2.6] },
  { piso: 'templado', pos: [-7.4, 1.2] },
  { piso: 'calido', pos: [-7.9, 8.3] }, // corrida: su puesto viejo quedó dentro del potrero
  { piso: 'calido', pos: [7.4, 7.2] },
  { piso: 'calido', pos: [0.9, 8.0] },
].map((v) => {
  const piso = PISOS_TERMICOS.find((p) => p.id === v.piso);
  return { ...v, tipo: piso ? piso.vegetacion : 'platano' };
});

/* ── 2. LOS MUNDOS COMO LUGARES ─────────────────────────────────────────────
 * Un subconjunto curado de los mundos reales (mundosFinca.js) colocados en el
 * valle. `pos` = [x, y, z] en el terreno; `escala` y `tipo` deciden qué forma
 * procedural los representa (sin GLTF: todo es geometría de three, offline y
 * liviana). El título/emoji/tinte se LEEN del manifiesto real — no se duplican.
 *
 * Se reparten con AIRE por toda la ladera y por sus pisos: la milpa y el café
 * en el clima medio, el bosque trepando al frío, la veleta arriba en el filo
 * del páramo (desde donde se lee el cielo), y el corral, la huerta y el
 * semillero abajo en la tierra caliente. Pocos y separados > muchos amontonados.
 */
const LUGARES = [
  // (Las posiciones finales las manda COMPOSICION_LUGARES — la capa del
  //  director en visual/mundo3d/direccion; estas son el respaldo crudo.)
  { id: 'agua', pos: [1.4, 0, -0.2], escala: 1, tipo: 'quebrada' },
  // El cafetal CON SOMBRÍO: café bajo guamo y plátano — policultivo, no hilera.
  { id: 'cafe', pos: [4.4, 0, 1.0], escala: 1.05, tipo: 'cafetal' },
  // La milpa-PARCELA (portal MIS MATAS): maíz + fríjol + calabaza juntos,
  // leída como granja viva de Age of Empires — jamás monocultivo.
  { id: 'cultivos', pos: [-4.4, 0, 2.4], escala: 1.15, tipo: 'milpa' },
  { id: 'suelo', pos: [-1.4, 0, 4.8], escala: 1, tipo: 'era' },
  { id: 'sanidad', pos: [3.8, 0, 4.9], escala: 0.95, tipo: 'huerta' },
  // El POTRERO (portal MIS ANIMALES): apartos divididos por cercas vivas de
  // matarratón, nacedero y botón de oro; los animales regados, no amontonados.
  // (Escala contenida: el valle cercano de la v2 no aguanta el llano de 48×48.)
  { id: 'animales', pos: [-5.0, 0, 5.4], escala: 0.82, tipo: 'animales' },
  { id: 'disenio', pos: [5.2, 0, -3.4], escala: 1.1, tipo: 'bosque' },
  { id: 'clima', pos: [-3.2, 0, -6.0], escala: 1, tipo: 'veleta' },
  // El mercado (portal VENDER), abajo en la tierra caliente, cerca de la salida
  // a la plaza: el puesto con su toldo donde la cosecha sale a venderse.
  { id: 'mercado', pos: [1.2, 0, 6.6], escala: 1, tipo: 'mercado' },
  // El INVERNADERO (micro-mundo del semillero): arcos, plástico lechoso y sus
  // mesas de germinación — donde nace y se cría la matica antes del lote.
  { id: 'semillero', pos: [-2.6, 0, 6.2], escala: 0.9, tipo: 'invernadero' },
  // El suelo vivo / red micorrízica, en el corazón cultivado (entre el suelo y
  // los cultivos): unos hongos que asoman = el fruto de la red bajo tierra. Toque
  // ahí para BAJAR al mundo subterráneo. (anti-conflicto: lugar nuevo al final.)
  { id: 'micorrizas', pos: [-2.7, 0, 3.3], escala: 1, tipo: 'hongos' },
  // La BIOFÁBRICA (mundo real 'abono'): la pila de compost cerca del potrero
  // pero diferenciada — el ciclo estiércol→abono legible en el mapa.
  { id: 'abono', pos: [-3.3, 0, 8.1], escala: 0.85, tipo: 'compost' },
  // El KIOSCO DEL SABER (portal APRENDER): el tablero bajo techito de paja a
  // la vera del camino de la plaza. Aún sin mundo propio en el manifiesto:
  // trae su identidad de respaldo (fallbackMundo) mientras el hub de juegos
  // abre su puerta (otro frente lo construye).
  {
    id: 'aprender',
    pos: [6.4, 0, 4.6],
    escala: 0.9,
    tipo: 'saber',
    fallbackMundo: {
      titulo: 'Aprender',
      emoji: '📖',
      lema: 'Los juegos y saberes de la finca, reunidos en un solo patio.',
      tinte: ['#b3771d', '#f2dfae'],
    },
  },
];

/**
 * Mundos del valle, ya resueltos contra el manifiesto real. Cada uno trae su
 * `titulo`, `emoji` y `tinte` verdaderos + la geometría de su lugar. Un lugar
 * sin mundo en el manifiesto (el kiosco de aprender) usa su `fallbackMundo`.
 */
export const MUNDOS_VALLE = LUGARES.map((l) => {
  /** @type {{ titulo?: string, emoji?: string, lema?: string, tinte?: string[] }} */
  const real = MUNDO_BY_ID[l.id] || l.fallbackMundo || {};
  return {
    ...l,
    titulo: real.titulo || l.id,
    emoji: real.emoji || '📍',
    lema: real.lema || '',
    tinte: real.tinte || ['#3f8f4e', '#dcedc9'],
  };
});

export const MUNDO_VALLE_BY_ID = Object.fromEntries(
  MUNDOS_VALLE.map((m) => [m.id, m]),
);

/* ── 1. LA COSA DEL DÍA (una sola, anclada a un lugar) ───────────────────────
 * Un único destello: la alerta del día aparece DONDE toca. Aquí, una helada
 * nocturna sobre el semillero (el mundo 'suelo'/eras). Tocarla = el agente lo
 * dice en voz alta y ofrece LA acción (no un tablero).
 */
export const COSA_DEL_DIA = {
  anclaMundo: 'suelo',
  tono: 'helada',
  titulo: 'Helada esta noche',
  detalle:
    'En la parte alta puede helar de madrugada. Cubra el semillero antes de que caiga el sol.',
  vozTexto:
    'Ojo con la finca hoy: esta madrugada puede helar en la parte alta. Cúbrale el semillero antes de que caiga el sol, que el frío le quema la matica tierna.',
  accion: { etiqueta: 'Ver cómo proteger del frío', view: 'hoy_finca' },
};

/* ── EL COMPAÑERO: ANGELITA, LA ABEJA DE LA FINCA ────────────────────────────
 * El avatar-jugador del valle. No es un widget: es un ser al que se cuida (ref
 * Finch). Su ÁNIMO y su ENERGÍA salen del ESTADO REAL de la finca — cuántas
 * matas están vivas, cómo está el agua, y qué clima hace. Datos de MUESTRA: si
 * se productiza, `SALUD_FINCA` viene del backend (logs de matas + Open-Meteo).
 */
export const SALUD_FINCA = {
  matasVivas: 34,
  matasTotal: 41,
  agua: 0.72, // 0..1 — humedad/reserva de la quebrada y el tanque
};

/**
 * Ánimo de la abeja según cómo está la finca hoy. Devuelve el ánimo (piel de la
 * creature), la energía (0..1, vivacidad del vuelo/aura) y una frase corta en
 * usted — puntual, sin muros de texto. Prioridad: alerta > sed > clima > salud.
 */
export function animoDeFinca(clima, { hayAlerta = false, salud = SALUD_FINCA } = {}) {
  const vivas = salud.matasTotal > 0 ? salud.matasVivas / salud.matasTotal : 1;
  // Energía base: mezcla de matas vivas y agua, atenuada por el clima duro.
  // En los filos del día (amanecer/atardecer) la abeja ya baja el ritmo.
  const climaFactor =
    clima === 'noche' ? 0.55
      : clima === 'lluvia' ? 0.8
        : clima === 'amanecer' || clima === 'atardecer' ? 0.85
          : 1;
  const energia = Math.max(0.35, Math.min(1, (vivas * 0.65 + salud.agua * 0.35) * climaFactor));

  if (hayAlerta) {
    return {
      animo: 'atento',
      energia,
      frase: 'Angelita anda pendiente: hay algo que atender hoy.',
    };
  }
  if (salud.agua < 0.35) {
    return {
      animo: 'sediento',
      energia,
      frase: 'La abeja la ve con sed: a la finca le hace falta agua.',
    };
  }
  if (clima === 'noche') {
    return {
      animo: 'descansa',
      energia,
      frase: 'Angelita descansa; la finca duerme tranquila esta noche.',
    };
  }
  if (vivas >= 0.85 && salud.agua >= 0.55) {
    return {
      animo: 'pleno',
      energia,
      frase: 'Angelita anda contenta: sus matas están vivas y con agua.',
    };
  }
  return {
    animo: 'sereno',
    energia,
    frase: 'La abeja anda serena, echándole ojo a la finca.',
  };
}

/* ── 4. EL CLIMA QUE TIÑE EL AMBIENTE ────────────────────────────────────────
 * Reusa las grades de luz de la librería de efectos (src/visual/effects):
 * `grade` = clase modificadora .vfx-grade--* aplicada a un velo DOM sobre el
 * canvas; `cielo`/`luz`/`niebla` alimentan la iluminación de la escena 3D.
 * Una sola geometría, varias "pieles" según el estado real de la vereda.
 *
 * CICLO DIURNO VIVO: además de las pieles de CONDICIÓN (soleado/niebla/lluvia,
 * que vienen del clima real), están las pieles de FRANJA del día (amanecer →
 * mañana → mediodía → tarde → atardecer → noche) que `climaPorHora` recorre
 * con el reloj del dispositivo. Campos del ciclo:
 *   sol         [x,y,z] — posición del sol (o la luna): el ARCO del día, las
 *               sombras giran y se acortan al mediodía;
 *   estrellas   0..1 — fracción del presupuesto de estrellas del tier (true
 *               histórico = 1);
 *   luciernagas 0..1 — densidad de luciérnagas (asoman al atardecer, plenas
 *               de noche).
 */
export const CLIMAS = {
  amanecer: {
    etiqueta: 'Amanecer',
    grade: 'vfx-grade--templado',
    cielo: ['#a9b4d8', '#f6c9a0'],
    luz: '#ffc994',
    ambiente: '#6e5a44',
    niebla: '#ecc7a2',
    nieblaLejos: 26,
    intensidad: 0.95,
    estrellas: 0.15,
    sol: [9, 2.5, 5],
    luciernagas: 0.15,
  },
  manana: {
    etiqueta: 'Mañana dorada',
    grade: 'vfx-grade--calido',
    cielo: ['#a5d3e0', '#f4e3b2'],
    luz: '#ffe9b8',
    ambiente: '#8a7a52',
    niebla: '#eeddb4',
    nieblaLejos: 36,
    intensidad: 1.2,
    estrellas: 0,
    sol: [8, 6, 4.5],
    luciernagas: 0,
  },
  mediodia: {
    etiqueta: 'Mediodía',
    grade: 'vfx-grade--calido',
    cielo: ['#8fd0e8', '#e9f3ea'],
    luz: '#fff2d2',
    ambiente: '#9fb6a0',
    niebla: '#ddeee6',
    nieblaLejos: 44,
    intensidad: 1.35,
    estrellas: 0,
    sol: [2, 12, 3],
    luciernagas: 0,
  },
  tarde: {
    etiqueta: 'Tarde',
    grade: 'vfx-grade--templado',
    cielo: ['#9fc4dc', '#f2d9a2'],
    luz: '#ffdf9f',
    ambiente: '#8f7247',
    niebla: '#eccf9d',
    nieblaLejos: 36,
    intensidad: 1.1,
    estrellas: 0,
    sol: [-5, 7, 4],
    luciernagas: 0,
  },
  atardecer: {
    etiqueta: 'Atardecer',
    grade: 'vfx-grade--templado',
    cielo: ['#c98ba0', '#f0955e'],
    luz: '#ffb37a',
    ambiente: '#6e4a3a',
    niebla: '#e8a97f',
    nieblaLejos: 24,
    intensidad: 0.9,
    estrellas: 0.12,
    sol: [-8, 2.5, 4.5],
    luciernagas: 0.35,
  },
  dorada: {
    etiqueta: 'Hora dorada',
    grade: 'vfx-grade--templado',
    cielo: ['#f7c66b', '#e88a4a'],
    luz: '#ffd79a',
    ambiente: '#8a6b4a',
    niebla: '#f0c98d',
    nieblaLejos: 30,
    intensidad: 1.15,
    estrellas: false,
    sol: [6, 9, 4],
    luciernagas: 0,
  },
  soleado: {
    etiqueta: 'Soleado',
    grade: 'vfx-grade--calido',
    cielo: ['#8fd0e8', '#d7eef6'],
    luz: '#fff4d6',
    ambiente: '#9fb6a0',
    niebla: '#d7eef6',
    nieblaLejos: 38,
    intensidad: 1.35,
    estrellas: false,
    sol: [4, 11, 3],
    luciernagas: 0,
  },
  niebla: {
    etiqueta: 'Niebla',
    grade: 'vfx-grade--paramo',
    cielo: ['#b9c7cc', '#d7dee0'],
    luz: '#cdd8da',
    ambiente: '#8f9ea1',
    niebla: '#c3cfd2',
    nieblaLejos: 15,
    intensidad: 0.85,
    estrellas: false,
    sol: [6, 9, 4],
    luciernagas: 0,
  },
  lluvia: {
    etiqueta: 'Lluvia',
    grade: 'vfx-grade--frio',
    cielo: ['#5b6b74', '#8a99a0'],
    luz: '#aab6bc',
    ambiente: '#6c7a80',
    niebla: '#7d8a90',
    nieblaLejos: 20,
    intensidad: 0.7,
    lluviaViva: true,
    estrellas: false,
    sol: [6, 9, 4],
    luciernagas: 0,
  },
  noche: {
    /* DÍA POR NOCHE (dirección de fotografía): nadie filma la noche a oscuras.
       Azul índigo levantado (se VE), luz de luna plateada con intensidad de
       contraluz, y la niebla abierta para que la ladera entera se lea. Las
       prácticas (ventana de la casa, luciérnagas, el faro) hacen el resto. */
    etiqueta: 'Noche',
    grade: 'vfx-grade--glacial',
    cielo: ['#152a52', '#1e3d6e'],
    luz: '#b3cdf0',
    ambiente: '#35486b',
    niebla: '#1d3153',
    nieblaLejos: 30,
    intensidad: 0.72,
    estrellas: true,
    sol: [-6, 7, -4],
    luciernagas: 1,
  },
};

export const ORDEN_CLIMA = ['dorada', 'soleado', 'niebla', 'lluvia', 'noche'];

/**
 * Franja del día según la hora REAL del dispositivo (ancla de veracidad, como
 * Apple Weather): el valle recorre el ciclo completo — amanecer → mañana →
 * mediodía → tarde → atardecer → noche. Un dato verdadero, no decoración
 * inventada. Delegado en cielosHoraData.horaDeReloj: LA fuente de franjas,
 * compartida con los mundos 3D.
 * @returns {'amanecer'|'manana'|'mediodia'|'tarde'|'atardecer'|'noche'}
 */
export function climaPorHora(fecha = new Date()) {
  return horaDeReloj(fecha);
}

/* ── 3. LO QUE EL AGENTE DICE AL PASAR ───────────────────────────────────────
 * El compañero (abeja) narra el mundo cuando la cámara viaja hacia él. Texto
 * corto, cálido, en usted; se lee por voz (Web Speech API) si el equipo la trae.
 */
export const NARRACION = {
  bienvenida:
    'Bienvenido a su finca. Toque un lugar del valle para viajar hasta él, o toque la señal que brilla para saber qué toca hacer hoy.',
  cultivos:
    'Aquí está su milpa: maíz, fríjol y calabaza creciendo juntos como las tres hermanas.',
  milpa:
    'La milpa: maíz, fríjol y calabaza sembrados juntos — las tres hermanas que se cuidan entre ellas. El maíz presta el tutor, el fríjol abona y la calabaza tapa el suelo.',
  cafe: 'El cafetal bajo sombra. El café vive debajo del guamo, cargado de cereza roja. De ahí sale el grano: cereza, pergamino y oro. En la finca no se tuesta.',
  suelo: 'Las eras y el semillero. La tierra de aquí es la que pide cuidado esta noche.',
  agua: 'La quebrada que baja del monte. De aquí sale el agua para toda la finca.',
  animales:
    'El potrero, dividido en apartos por cercas vivas de matarratón, nacedero y botón de oro: la cerca que también es comida y sombra. Los animales andan regados, cada grupo en su aparto.',
  sanidad:
    'La huerta de la casa. Aquí es donde primero se ven las plagas, para atajarlas a tiempo.',
  disenio: 'El monte y los árboles que sembró. La finca también es el bosque que la abraza.',
  clima: 'Desde aquí se lee el cielo: lo que viene, y qué conviene hacer con la finca.',
  mercado:
    'La plaza campesina. Aquí llega su cosecha derecho a la mesa: venda directo, con su sello y a precio justo.',
  pisos:
    'Suba por la montaña: del cálido al páramo, cada piso con lo suyo. Arriba manda el frailejón, que le peina el agua a la niebla y la entrega despacio al suelo. Por eso el páramo se cuida, no se ara.',
  semillero:
    'El invernadero: el micro-mundo donde nace la matica. La semilla despierta en la bandeja bajo el plástico, se repica a la bolsa y se endurece al sol antes de irse al campo. Del grano fuerte sale la finca fuerte.',
  abono:
    'La biofábrica. Del potrero sale el estiércol, aquí se vuelve abono: la pila trabaja sola, con su calorcito y sus lombrices. El ciclo que no bota nada.',
  aprender:
    'El kiosco del saber: el tablero donde la finca enseña. Aquí van llegando los juegos y las lecciones del monte.',
  casa:
    'Esta es su casa: el corazón de la finca y la puerta de sus mundos. Toque una de las seis puertas para salir a donde necesite.',
  paramo:
    'Ahí arriba está el páramo, con su guardián de queñua entre los frailejones. Tóquelo y él le muestra el monte entero.',
};
