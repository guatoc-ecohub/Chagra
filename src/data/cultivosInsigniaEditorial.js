/* i18n (ADR-050): copy campesino en español Colombia; misma deuda que
 * vidaSuelo.js / SaludSueloScreen.jsx (regla soft desactivada). */

/**
 * cultivosInsigniaEditorial — capa EDITORIAL (no numérica) sobre los datos que
 * salen del grafo `chagra_kg` (public/cultivos-insignia.json).
 *
 * Aquí NO hay cifras: solo el nombre limpio para mostrar y una frase cultural
 * de enganche (el saber popular de qué ES el cultivo). Los DATOS DUROS —piso
 * térmico, N/P/K, asocios, plagas— vienen del grafo, no de aquí. Se separan a
 * propósito para que la pantalla sea honesta: lo verificable es del grafo; lo
 * cultural es framing.
 *
 * Clave = id de especie en el grafo (Species.id).
 */

export const EDITORIAL = {
  zea_mays: {
    display: 'Maíz',
    lema: 'El grano sagrado que sostiene la milpa',
    milpa: true,
  },
  phaseolus_vulgaris: {
    display: 'Fríjol',
    lema: 'La proteína de la casa; y le regala nitrógeno al suelo',
    milpa: true,
  },
  cucurbita_moschata: {
    display: 'Ahuyama',
    lema: 'La hermana que tapa la tierra y le guarda la humedad',
    milpa: true,
  },
  solanum_tuberosum: {
    display: 'Papa',
    lema: 'El pan de la tierra fría andina',
  },
  coffea_arabica: {
    display: 'Café',
    lema: 'El cultivo que puso a Colombia en el mapa del mundo',
  },
  persea_americana: {
    display: 'Aguacate',
    lema: 'El oro verde que trepa por las laderas',
  },
  solanum_lycopersicum: {
    display: 'Tomate',
    lema: 'El rey de la huerta, en fresco o en salsa',
  },
  musa_paradisiaca: {
    display: 'Plátano',
    lema: 'El sustento de cada día en el trópico',
  },
  theobroma_cacao: {
    display: 'Cacao',
    lema: 'El alimento de los dioses, bajo la sombra del monte',
  },
  saccharum_officinarum: {
    display: 'Caña panelera',
    lema: 'El dulce que sale del trapiche',
  },
  allium_cepa: {
    display: 'Cebolla',
    lema: 'El sabor que arranca todo buen guiso',
  },
  daucus_carota_subsp_sativus: {
    display: 'Zanahoria',
    lema: 'La raíz dulce, cargada de vitamina para la vista',
  },
};

/** Piso térmico → etiqueta campesina + rango, para las fichas «¿dónde va?». */
export const PISO_LABEL = {
  calido: { nombre: 'Tierra caliente', emoji: '🌴' },
  templado: { nombre: 'Clima medio', emoji: '⛰️' },
  frio: { nombre: 'Tierra fría', emoji: '🏔️' },
  paramo: { nombre: 'Páramo', emoji: '❄️' },
};
export const PISO_ORDEN = ['calido', 'templado', 'frio', 'paramo'];

/** Nivel de demanda de un nutriente → cuánto llena la barra + palabra folk. */
export const NIVEL_DEMANDA = {
  alta: { pct: 100, palabra: 'Mucha', orden: 3 },
  media: { pct: 62, palabra: 'Media', orden: 2 },
  moderada: { pct: 62, palabra: 'Media', orden: 2 },
  baja: { pct: 30, palabra: 'Poca', orden: 1 },
};

/** Identidad de cada nutriente (color = SOLO grafismo de la barra; el texto va
 *  en tinta theme-aware). N, P, K + secundarios frecuentes en el grafo. */
export const NUTRIENTE_INFO = {
  N: { nombre: 'Nitrógeno', simbolo: 'N', folk: 'para la hoja y el verde', bar: 'bg-emerald-400', dot: 'text-emerald-500' },
  P: { nombre: 'Fósforo', simbolo: 'P', folk: 'para la raíz y la flor', bar: 'bg-amber-400', dot: 'text-amber-500' },
  K: { nombre: 'Potasio', simbolo: 'K', folk: 'para el fruto y la fuerza', bar: 'bg-violet-400', dot: 'text-violet-500' },
  Ca: { nombre: 'Calcio', simbolo: 'Ca', folk: 'para paredes firmes', bar: 'bg-sky-400', dot: 'text-sky-500' },
  Mg: { nombre: 'Magnesio', simbolo: 'Mg', folk: 'corazón de la clorofila', bar: 'bg-teal-400', dot: 'text-teal-500' },
  S: { nombre: 'Azufre', simbolo: 'S', folk: 'para el aroma y la proteína', bar: 'bg-yellow-400', dot: 'text-yellow-500' },
};
export const NUTRIENTE_ORDEN = ['N', 'P', 'K', 'Ca', 'Mg', 'S'];

/** Tipo de plaga → etiqueta + emoji para el chip. */
export const TIPO_PLAGA = {
  insecto_lepidoptero: { label: 'Gusano / mariposa', emoji: '🐛' },
  insecto_coleoptero: { label: 'Cucarrón', emoji: '🪲' },
  insecto: { label: 'Insecto', emoji: '🐜' },
  acaro: { label: 'Ácaro', emoji: '🕷️' },
  hongo: { label: 'Hongo', emoji: '🍄' },
  bacteria: { label: 'Bacteria', emoji: '🦠' },
  virus: { label: 'Virus', emoji: '🧬' },
  nematodo: { label: 'Nematodo', emoji: '🪱' },
  malezaparasita: { label: 'Maleza parásita', emoji: '🌿' },
};

/** Ruta base de las fotos de cultivos (offline-first, licencia abierta). */
export const FOTO_BASE = '/crop-photos';
