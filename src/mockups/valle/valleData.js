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

/* ── 2. LOS MUNDOS COMO LUGARES ─────────────────────────────────────────────
 * Un subconjunto curado de los mundos reales (mundosFinca.js) colocados en el
 * valle. `pos` = [x, y, z] en el terreno; `escala` y `tipo` deciden qué forma
 * procedural los representa (sin GLTF: todo es geometría de three, offline y
 * liviana). El título/emoji/tinte se LEEN del manifiesto real — no se duplican.
 */
const LUGARES = [
  { id: 'cultivos', pos: [-3.2, 0, 1.6], escala: 1.15, tipo: 'milpa' },
  { id: 'cafe', pos: [3.4, 0, 2.2], escala: 1, tipo: 'cafetal' },
  { id: 'suelo', pos: [-1.1, 0, 3.6], escala: 1, tipo: 'era' },
  { id: 'agua', pos: [0.6, 0, -1.4], escala: 1, tipo: 'quebrada' },
  { id: 'animales', pos: [-4.6, 0, -1.8], escala: 1, tipo: 'corral' },
  { id: 'sanidad', pos: [1.8, 0, 4.4], escala: 0.95, tipo: 'huerta' },
  { id: 'disenio', pos: [4.8, 0, -2.6], escala: 1.1, tipo: 'bosque' },
  { id: 'clima', pos: [-3.8, 0, -4.8], escala: 1, tipo: 'veleta' },
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
 * El compañero (colibrí) narra el mundo cuando la cámara viaja hacia él. Texto
 * corto, cálido, en usted; se lee por voz (Web Speech API) si el equipo la trae.
 */
export const NARRACION = {
  bienvenida:
    'Bienvenido a su finca. Toque un lugar del valle para viajar hasta él, o toque la señal que brilla para saber qué toca hacer hoy.',
  cultivos:
    'Aquí está su milpa: maíz, fríjol y calabaza creciendo juntos como las tres hermanas.',
  cafe: 'El cafetal en la ladera. Estas maticas ya están cargando para la próxima cosecha.',
  suelo: 'Las eras y el semillero. La tierra de aquí es la que pide cuidado esta noche.',
  agua: 'La quebrada que baja del monte. De aquí sale el agua para toda la finca.',
  animales: 'El corral. Las gallinas y el ganado que cierran el ciclo del abono.',
  sanidad:
    'La huerta de la casa. Aquí es donde primero se ven las plagas, para atajarlas a tiempo.',
  disenio: 'El monte y los árboles que sembró. La finca también es el bosque que la abraza.',
  clima: 'Desde aquí se lee el cielo: lo que viene, y qué conviene hacer con la finca.',
};
