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
  { piso: 'paramo', pos: [1.4, -8.4] },
  { piso: 'paramo', pos: [4.8, -6.6] },
  { piso: 'frio', pos: [-6.0, -3.6] },
  { piso: 'frio', pos: [3.0, -4.4] },
  { piso: 'templado', pos: [-2.4, 1.0] },
  { piso: 'templado', pos: [6.2, 2.6] },
  { piso: 'calido', pos: [-6.4, 6.4] },
  { piso: 'calido', pos: [5.8, 6.0] },
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
  { id: 'agua', pos: [1.4, 0, -0.2], escala: 1, tipo: 'quebrada' },
  { id: 'cafe', pos: [4.4, 0, 1.0], escala: 1, tipo: 'cafetal' },
  { id: 'cultivos', pos: [-4.4, 0, 2.4], escala: 1.15, tipo: 'milpa' },
  { id: 'suelo', pos: [-1.4, 0, 4.8], escala: 1, tipo: 'era' },
  { id: 'sanidad', pos: [3.8, 0, 4.9], escala: 0.95, tipo: 'huerta' },
  { id: 'animales', pos: [-5.0, 0, 5.4], escala: 1, tipo: 'animales' },
  { id: 'disenio', pos: [5.2, 0, -3.4], escala: 1.1, tipo: 'bosque' },
  { id: 'clima', pos: [-3.2, 0, -6.0], escala: 1, tipo: 'veleta' },
  // El mercado, abajo en la tierra caliente, cerca de la salida a la plaza: el
  // puesto con su toldo donde la cosecha de la finca sale a venderse.
  { id: 'mercado', pos: [1.2, 0, 6.6], escala: 1, tipo: 'mercado' },
  // El semillero, abajo cerca de la casa: el túnel de media-sombra donde nace y
  // se cría la matica antes de salir al lote. (anti-conflicto: lugar nuevo al final.)
  { id: 'semillero', pos: [-2.6, 0, 6.2], escala: 1, tipo: 'semillero' },
];

/**
 * Mundos del valle, ya resueltos contra el manifiesto real. Cada uno trae su
 * `titulo`, `emoji` y `tinte` verdaderos + la geometría de su lugar.
 */
export const MUNDOS_VALLE = LUGARES.map((l) => {
  /** @type {{ titulo?: string, emoji?: string, lema?: string, tinte?: string[] }} */
  const real = MUNDO_BY_ID[l.id] || {};
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
  const climaFactor = clima === 'noche' ? 0.55 : clima === 'lluvia' ? 0.8 : 1;
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
 */
export const CLIMAS = {
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
  },
  noche: {
    etiqueta: 'Noche',
    grade: 'vfx-grade--glacial',
    cielo: ['#0b1830', '#132a4e'],
    luz: '#9fc2e8',
    ambiente: '#26364f',
    niebla: '#13203a',
    nieblaLejos: 22,
    intensidad: 0.5,
    estrellas: true,
  },
};

export const ORDEN_CLIMA = ['dorada', 'soleado', 'niebla', 'lluvia', 'noche'];

/**
 * Estado por defecto según la hora REAL del dispositivo (ancla de veracidad,
 * como Apple Weather): madrugada/noche → noche; media mañana → soleado; tarde
 * → hora dorada. Un dato verdadero, no decoración inventada.
 */
export function climaPorHora(fecha = new Date()) {
  const h = fecha.getHours();
  if (h >= 19 || h < 5) return 'noche';
  if (h >= 16) return 'dorada';
  if (h >= 11) return 'soleado';
  return 'dorada';
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
  animales: 'El corral. Las gallinas y el ganado que cierran el ciclo del abono.',
  sanidad:
    'La huerta de la casa. Aquí es donde primero se ven las plagas, para atajarlas a tiempo.',
  disenio: 'El monte y los árboles que sembró. La finca también es el bosque que la abraza.',
  clima: 'Desde aquí se lee el cielo: lo que viene, y qué conviene hacer con la finca.',
  mercado:
    'La plaza campesina. Aquí llega su cosecha derecho a la mesa: venda directo, con su sello y a precio justo.',
  pisos:
    'Suba por la montaña: del cálido al páramo, cada piso con lo suyo. Arriba manda el frailejón, que le peina el agua a la niebla y la entrega despacio al suelo. Por eso el páramo se cuida, no se ara.',
  semillero:
    'El semillero, bajo su túnel de media-sombra. Aquí nace la matica: la semilla despierta en la bandeja, se repica a la bolsa y se endurece al sol antes de irse al campo. Del grano fuerte sale la finca fuerte.',
  frutales:
    'El huerto de frutales. El aguacate mayor, el mango de copa ancha y los cítricos cargados de color, cada uno con su edad y su plateo. La fruta se baja con la mano y con escalera — la fruta golpeada se pierde.',
};
