/**
 * milpaData — datos curados para el subjuego "La Milpa" y asociaciones.
 *
 * GANCHO PEDAGÓGICO: La agroecología colombiana tiene MÁS que las tres hermanas.
 * Este juego enseña múltiples sistemas reales:
 *   - MILPA: maíz + fríjol + ahuyama (fijación N, soporte, cobertura)
 *   - SAF CAFÉ: café + guamo + plátano (sombra, carbono, control broca)
 *   - SAF CACAO: cacao + matarratón + plátano (sombra, N, productividad)
 *   - FRUTAL + COBERTURA: frutal + maní forrajero (suelo, N, erosión)
 *   - HORTALIZAS: cebolla + zanahoria (repelencia mutua de moscas)
 *
 * Cifras grounded en src/data/asociaciones-comparativa.json:
 *   - LER: 1.32-2.89 según sistema
 *   - N fijado: 12-76% (leguminosas)
 *   - Sombra cafetera: 30-50%, buffer 2-4°C
 *   - Reducción arvenses: 24-55%
 *   - Control plagas: hasta 40%
 * Fuentes: DR-ASOCIACIONES-CULTIVO-COLOMBIA-2026-06-18; DOI 10.1093/aob/mcu191;
 * DOI 10.3389/fagro.2023.1115490; DOI 10.1016/j.fcr.2019.107661.
 *
 * Todo offline: cero red en runtime. Sin nombres propios de personas.
 */

import { CULTIVOS, ASOCIACIONES } from '../../services/milpaGameEngine';
export { OCUPACION_CULTIVO, SLOTS_POR_PARCELA } from '../../services/milpaGameEngine';

/**
 * Datos visuales y educativos de cada cultivo para la UI.
 * @typedef {Object} CultivoInfo
 * @property {string} id        Uno de CULTIVOS.
 * @property {string} nombre    Nombre campesino colombiano.
 * @property {string} emoji
 * @property {string} color     Clase Tailwind del acento (estética Chagra).
 * @property {string} rol       Su aporte (1 línea, para niños).
 * @property {string} ayuda     A quién ayuda y cómo (relación real).
 */

/** @type {CultivoInfo[]} */
export const CULTIVOS_INFO = [
  // Milpa - las tres hermanas
  {
    id: CULTIVOS.MAIZ,
    nombre: 'Maíz',
    emoji: '🌽',
    color: 'amber',
    rol: 'Crece alto y firme como una torre.',
    ayuda: 'Le presta su caña al fríjol para que trepe.',
  },
  {
    id: CULTIVOS.FRIJOL,
    nombre: 'Fríjol',
    emoji: '🫘',
    color: 'emerald',
    rol: 'Trepa por el maíz y atrapa el aire.',
    ayuda: 'Fija nitrógeno en el suelo y alimenta al maíz.',
  },
  {
    id: CULTIVOS.AHUYAMA,
    nombre: 'Ahuyama',
    emoji: '🎃',
    color: 'orange',
    rol: 'Sus hojas grandes tapan todo el suelo.',
    ayuda: 'Da sombra, guarda humedad y frena la maleza.',
  },
  // SAF café
  {
    id: CULTIVOS.CAFE,
    nombre: 'Café',
    emoji: '☕',
    color: 'brown',
    rol: 'El cultivo principal que necesita sombra.',
    ayuda: 'La sombra del guamo lo protege del calor y la broca.',
  },
  {
    id: CULTIVOS.GUAMO,
    nombre: 'Guamo',
    emoji: '🌳',
    color: 'green',
    rol: 'Árbol que da sombra y fija nitrógeno.',
    ayuda: 'Fija 168 kg/ha de N, da sombra y aporta mantillo.',
  },
  {
    id: CULTIVOS.PLATANO,
    nombre: 'Plátano',
    emoji: '🍌',
    color: 'yellow',
    rol: 'Da sombra temporal e ingreso rápido.',
    ayuda: 'Protege al café/cacao joven mientras crece.',
  },
  // SAF cacao
  {
    id: CULTIVOS.CACAO,
    nombre: 'Cacao',
    emoji: '🍫',
    color: 'rose',
    rol: 'Necesita sombra para crecer sano.',
    ayuda: 'El matarratón le da sombra y nitrógeno.',
  },
  {
    id: CULTIVOS.MATARRATON,
    nombre: 'Matarratón',
    emoji: '🌿',
    color: 'lime',
    rol: 'Fija N y da sombra regulable.',
    ayuda: 'Puede sustituir hasta 200 kg/ha de fertilizante N.',
  },
  // Frutal + cobertura
  {
    id: CULTIVOS.FRUTAL,
    nombre: 'Frutal',
    emoji: '🍊',
    color: 'orange',
    rol: 'Árbol frutal que da sombra parcial.',
    ayuda: 'Da sombra y frutos al mismo tiempo.',
  },
  {
    id: CULTIVOS.MANI_FORRAJERO,
    nombre: 'Maní forrajero',
    emoji: '🥜',
    color: 'yellow',
    rol: 'Tapiza el suelo como alfombra verde.',
    ayuda: 'Fija N, controla maleza y frena la erosión.',
  },
  // Hortalizas
  {
    id: CULTIVOS.CEBOLLA,
    nombre: 'Cebolla',
    emoji: '🧅',
    color: 'purple',
    rol: 'Su olor repele la mosca de la zanahoria.',
    ayuda: 'Protege a la zanahoria de su plaga principal.',
  },
  {
    id: CULTIVOS.ZANAHORIA,
    nombre: 'Zanahoria',
    emoji: '🥕',
    color: 'orange',
    rol: 'Su olor repele la mosca de la cebolla.',
    ayuda: 'Protege a la cebolla de su plaga principal.',
  },
];

/** Narrativa breve que aparece al sembrar cada cultivo. */
export const CULTIVO_NARRATIVAS = Object.freeze({
  [CULTIVOS.MAIZ]: 'El maíz crece alto y será la columna del fríjol 🌽',
  [CULTIVOS.FRIJOL]: 'El fríjol trepa por el maíz y fija nitrógeno 💧',
  [CULTIVOS.AHUYAMA]: 'La ahuyama cubre el suelo y frena la maleza 🎃',
  [CULTIVOS.CAFE]: 'El café agradece sombra suave para producir mejor ☕',
  [CULTIVOS.GUAMO]: 'El guamo da sombra, fija nitrógeno y deja mantillo 🌳',
  [CULTIVOS.PLATANO]: 'El plátano protege temprano y también da cosecha 🍌',
  [CULTIVOS.CACAO]: 'El cacao crece más sano con sombra viva alrededor 🍫',
  [CULTIVOS.MATARRATON]: 'El matarratón alimenta el suelo y regula la sombra 🌿',
  [CULTIVOS.FRUTAL]: 'El frutal produce arriba y deja espacio para cubrir abajo 🍊',
  [CULTIVOS.MANI_FORRAJERO]: 'El maní forrajero tapiza el suelo y fija nitrógeno 🥜',
  [CULTIVOS.CEBOLLA]: 'La cebolla protege con su aroma y confunde plagas 🧅',
  [CULTIVOS.ZANAHORIA]: 'La zanahoria acompaña a la cebolla y reduce presión de moscas 🥕',
});

/** Mapa rápido id → cultivoInfo (para pintar parcelas). */
export const CULTIVO_POR_ID = Object.freeze(
  CULTIVOS_INFO.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {}),
);

/**
 * Relaciones que el juego enseña, con la cifra real que las respalda.
 * Se muestran como "lecciones" cuando el jugador completa una asociación.
 */
export const RELACIONES = Object.freeze([
  // Milpa
  {
    id: 'fija-nitrogeno',
    titulo: 'El fríjol alimenta al maíz',
    detalle: 'El fríjol fija nitrógeno del aire en el suelo: hasta 60 % del que necesita el maíz.',
    emoji: '💧',
    sistema: 'milpa',
  },
  {
    id: 'soporte',
    titulo: 'El maíz sostiene al fríjol',
    detalle: 'El fríjol trepa por la caña del maíz y no necesita estacas.',
    emoji: '🌽',
    sistema: 'milpa',
  },
  {
    id: 'cobertura',
    titulo: 'La ahuyama cuida el suelo',
    detalle: 'Sus hojas tapan el suelo y bajan la maleza entre 24 % y 55 %.',
    emoji: '🎃',
    sistema: 'milpa',
  },
  // SAF café
  {
    id: 'sombra-cafe',
    titulo: 'El guamo da sombra al café',
    detalle: 'La sombra (30-50%) modera el calor y amortigua la broca del café.',
    emoji: '☕',
    sistema: 'saf_cafe',
  },
  {
    id: 'carbono-guamo',
    titulo: 'El guamo captura carbono',
    detalle: 'El SAF café captura 118 Mg C/ha vs 31 Mg C/ha a sol pleno: ¡3.8x más!',
    emoji: '🌳',
    sistema: 'saf_cafe',
  },
  // SAF cacao
  {
    id: 'sombra-cacao',
    titulo: 'El matarratón sombrea el cacao',
    detalle: 'El matarratón fija hasta 200 kg/ha de N y da sombra regulable al cacao.',
    emoji: '🍫',
    sistema: 'saf_cacao',
  },
  // Frutal + cobertura
  {
    id: 'cobertura-mani',
    titulo: 'El maní forrajero tapiza el suelo',
    detalle: 'Este maní trepador fija N, tapiza el suelo y controla la erosión bajo el frutal.',
    emoji: '🥜',
    sistema: 'frutal_cobertura',
  },
  // Hortalizas
  {
    id: 'repelencia-mutua',
    titulo: 'Cebolla y zanahoria se protegen',
    detalle: 'El olor de la cebolla repele la mosca de la zanahoria y viceversa: ¡35 % menos plagas!',
    emoji: '🥕',
    sistema: 'hortalizas',
  },
]);

/**
 * Cifras de cierre, tomadas de asociaciones-comparativa.json.
 * Nunca inventadas: si cambian las fuentes, se actualiza este objeto.
 */
export const CIFRAS_SISTEMAS = Object.freeze({
  milpa: {
    ler: { aprox: 2, min: 1.08, max: 2.89 },
    nFijadoPct: { min: 12, max: 60 },
    arvensesReduccionPct: { min: 24, max: 55 },
    plagaReduccionPct: 23,
  },
  saf_cafe: {
    sombraPct: { min: 30, max: 50 },
    carbonoBiomasaMgC_ha: 118,
    carbonoSolPlenoMgC_ha: 31,
    bufferTemperaturaC: { min: 2, max: 4 },
    nFijadoKg_ha: 168,
  },
  saf_cacao: {
    nSustituibleKg_ha: { min: 0, max: 200 },
    productividadFactor: 10,
    carbonoFactor: 2.5,
  },
  frutal_cobertura: {
    nFijado: true,
    coberturaSuelo: true,
    controlErosion: true,
  },
  hortalizas: {
    controlPlagaMutuo: true,
    reduccionInfestacionPct: { min: 30, max: 40 },
  },
  fuente: 'DR-ASOCIACIONES-CULTIVO-COLOMBIA-2026-06-18; DOI 10.1093/aob/mcu191; DOI 10.3389/fagro.2023.1115490; DOI 10.1016/j.fcr.2019.107661',
});

/** Cuántas parcelas tiene el tablero (mobile-first: cabe en una pantalla). */
export const NUM_PARCELAS = 6;

/** Número de temporadas por juego. */
export const NUM_TEMPORADAS = 3;

/** Logros desbloqueables. */
export const LOGROS = Object.freeze([
  {
    id: 'primera_milpa',
    nombre: 'Primera Milpa',
    descripcion: 'Completa tu primera milpa',
    emoji: '🌽',
    icono: '🌽',
  },
  {
    id: 'super_milpa',
    nombre: 'Super Milpa',
    descripcion: 'Logra +100% de ventaja sobre monocultivo',
    emoji: '🏆',
    icono: '🏆',
  },
  {
    id: 'maestro_ler',
    nombre: 'Maestro LER',
    descripcion: 'Alcanza LER promedio de 1.8 o más',
    emoji: '📏',
    icono: '📏',
  },
  {
    id: 'fijador_n',
    nombre: 'Fijador de Nitrógeno',
    descripcion: 'Fija 50% o más de N promedio',
    emoji: '💧',
    icono: '💧',
  },
  {
    id: 'biodiverso',
    nombre: 'Biodiverso',
    descripcion: 'Siembra 3 tipos de asociaciones diferentes',
    emoji: '🌿',
    icono: '🌿',
  },
  {
    id: 'resiliente',
    nombre: 'Resiliente',
    descripcion: 'Completa más del 50% de parcelas',
    emoji: '🛡️',
    icono: '🛡️',
  },
  {
    id: 'cafetero',
    nombre: 'Cafetero',
    descripcion: 'Completa un SAF café',
    emoji: '☕',
    icono: '☕',
  },
  {
    id: 'cacaotero',
    nombre: 'Cacaotero',
    descripcion: 'Completa un SAF cacao',
    emoji: '🍫',
    icono: '🍫',
  },
]);

/** Alias para retrocompatibilidad. */
export const TRES_HERMANAS = CULTIVOS_INFO.filter(c =>
  [CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA].includes(/** @type {'maiz'|'frijol'|'ahuyama'} */ (c.id))
);
export const HERMANA_POR_ID = CULTIVO_POR_ID;
export const CIFRAS_MILPA = CIFRAS_SISTEMAS.milpa;
