/**
 * especies-eztree-ampliado.js — AMPLIACIÓN de la paleta de árboles vivos.
 *
 * Archivo ADITIVO (no toca `especies-eztree.js`, que otro proceso está
 * editando). Exporta `ESPECIES_EZTREE_AMPLIADO`, un mapa con el MISMO shape que
 * `ESPECIES_EZTREE` — cada entrada es una ESPECIE REAL del catálogo Chagra
 * (`chagra/catalog/chagra-catalog-oss-subset-v3.2.json`, 581 especies) con un
 * `TreeOptions` de ez-tree (dgreenheck/ez-tree, MIT) calibrado a mano para dar
 * una silueta VIVA y diferenciada por especie — la misma vara de calidad del
 * arquetipo guayacán ya aprobado.
 *
 * TODAS las entradas de este archivo son `arquetipo:'arbol'` (pasan por
 * ez-tree). No hay hierbas/rosetas/pajonales aquí — esos ya viven en
 * `especies-eztree.js` con sus builders propios (`plantas-bajas.js`). El foco
 * de esta ampliación es la petición del operador: MÁS árboles y arbustos VIVOS
 * (frutales, arbustos productivos y nativos por piso térmico), ninguno feo
 * (nada de domo/parasol low-poly).
 *
 * Diferenciación por especie — se trabajó FORMA × COLOR:
 *   FORMA:  copa redonda densa de sombra (mango-like), sombrilla plana de
 *           floración (guayacán-like), citrus pequeño y compacto, gigante
 *           emergente, arbolito frutal, arbusto pionero, y copa de hoja grande
 *           palmeada — vía niveles de rama, ángulo (bajo=columnar,
 *           alto=sombrilla), largo/radio de fuste y `roundedNormals`.
 *   COLOR:  tinte de hoja/flor real por especie — verdes oscuros glossy
 *           (gaque, mangostino, naranja), verdes medios de dosel, y sobre todo
 *           FLORACIONES que enriquecen la paleta: magenta del siete cueros,
 *           azul-violeta del gualanday/jacarandá, rosados del raque y el
 *           durazno, rojo-naranja del chiló, malva del matarratón.
 *
 * Escala/determinismo/piso térmico: idénticos criterios que `especies-eztree.js`
 * (leer su cabecera). Semillas 30001–30024 (sin colisión con 10001–10006 ni
 * 20001–20046 del archivo base).
 *
 * REGLA DURA anti-antagonista: NINGUNA especie exótico-invasora de plantación
 * (eucalipto/pino pátula/retamo espinoso/acacia negra). Todas las de abajo son
 * frutales de chagra, arbustos productivos, o nativas del bosque
 * andino/subandino/cálido. Guard `assertNoAntagonistas()` al final valida en
 * runtime que ningún `nombreCientifico` caiga en la lista negra.
 *
 * @typedef {import('./ez-tree/options.js').default} TreeOptions
 */
import { Billboard, TreeType } from './ez-tree/enums.js';
import { crearEnredadera } from './enredadera.js';

/**
 * Lista negra local (defensa en profundidad, independiente de que
 * `especies-eztree.js` exporte `ESPECIES_EXCLUIDAS` — este archivo no depende
 * de ese módulo mientras esté siendo editado por otro proceso). Géneros/especies
 * de plantación exótico-invasora, VETADOS de por vida.
 * @type {string[]} prefijos de nombre científico prohibidos
 */
export const PREFIJOS_ANTAGONISTAS = [
  'Eucalyptus', 'Pinus', 'Ulex europaeus', 'Acacia melanoxylon',
  'Acacia decurrens', 'Acacia mearnsii', 'Retamo', 'Cupressus lusitanica',
];

/**
 * @type {Record<string, { pisoTermico: string, nombreComun: string, nombreCientifico: string, arquetipo: 'arbol', options: object }>}
 */
export const ESPECIES_EZTREE_AMPLIADO = {
  // ═══════════════════════════════════════════════════════════════════
  //  CÁLIDO — frutales y nativos de tierra caliente
  // ═══════════════════════════════════════════════════════════════════

  guayaba: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Guayaba',
    nombreCientifico: 'Psidium guajava',
    // arbolito 4-7 m, copa densa redondeada, corteza lisa jaspeada cobriza,
    // hoja mate verde media. Frutal de patio por excelencia.
    arquetipo: 'arbol',
    options: {
      seed: 30001,
      type: TreeType.Deciduous,
      bark: { type: 'Bark002', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0xa8785a, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 60, 2: 55, 3: 50 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.013 },
        gnarliness: { 0: 0.12, 1: 0.18, 2: 0.14, 3: 0.05 },
        length: { 0: 2.8, 1: 2.4, 2: 1.2, 3: 0.6 },
        radius: { 0: 0.24, 1: 0.15, 2: 0.1, 3: 0.06 },
        sections: { 0: 8, 1: 7, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.32, 2: 0.24, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'guayaba', map: null, billboard: Billboard.Double, angle: 32, count: 18, start: 0.16, size: 0.55, sizeVariance: 0.45, tint: 0x4c8a3a, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  naranja: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Naranja',
    nombreCientifico: 'Citrus × sinensis',
    // cítrico de copa MUY densa, redonda y compacta, verde oscuro brillante
    // (3.5-5 m). Follaje tupido — la copa casi toca el suelo.
    arquetipo: 'arbol',
    options: {
      seed: 30002,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x5f4a34, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 62, 2: 58, 3: 54 },
        children: { 0: 7, 1: 6, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.011 },
        gnarliness: { 0: 0.1, 1: 0.15, 2: 0.12, 3: 0.05 },
        length: { 0: 2.0, 1: 1.9, 2: 1.1, 3: 0.6 },
        radius: { 0: 0.19, 1: 0.12, 2: 0.08, 3: 0.05 },
        sections: { 0: 7, 1: 6, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.26, 2: 0.2, 3: 0.18 },
        taper: { 0: 0.5, 1: 0.5, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'naranja', map: null, billboard: Billboard.Double, angle: 32, count: 24, start: 0.1, size: 0.42, sizeVariance: 0.5, tint: 0x2e6b30, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  mandarina: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Mandarina',
    nombreCientifico: 'Citrus reticulata',
    // cítrico más pequeño y de copa ligeramente péndula, verde más claro que la
    // naranja (2.5-4 m) — ramas finas que caen un poco.
    arquetipo: 'arbol',
    options: {
      seed: 30003,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x6a5238, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 66, 2: 62, 3: 58 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 0.85, z: 0 }, strength: 0.01 },
        gnarliness: { 0: 0.12, 1: 0.16, 2: 0.13, 3: 0.05 },
        length: { 0: 1.6, 1: 1.6, 2: 1.0, 3: 0.5 },
        radius: { 0: 0.15, 1: 0.1, 2: 0.07, 3: 0.05 },
        sections: { 0: 7, 1: 6, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.28, 2: 0.22, 3: 0.18 },
        taper: { 0: 0.5, 1: 0.5, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'mandarina', map: null, billboard: Billboard.Double, angle: 36, count: 20, start: 0.12, size: 0.38, sizeVariance: 0.5, tint: 0x4a8a44, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  guanabana: {
    pisoTermico: 'calido',
    nombreComun: 'Guanábana',
    nombreCientifico: 'Annona muricata',
    // arbolito 5-8 m de copa abierta e irregular, hoja grande glossy verde muy
    // oscuro. Silueta rala, ramas ascendentes.
    arquetipo: 'arbol',
    options: {
      seed: 30004,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x6b5238, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 54, 2: 50, 3: 46 },
        children: { 0: 5, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.014 },
        gnarliness: { 0: 0.11, 1: 0.15, 2: 0.12, 3: 0.05 },
        length: { 0: 3.6, 1: 2.6, 2: 1.4, 3: 0.7 },
        radius: { 0: 0.26, 1: 0.16, 2: 0.1, 3: 0.06 },
        sections: { 0: 8, 1: 7, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.34, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'guanabana', map: null, billboard: Billboard.Double, angle: 30, count: 15, start: 0.2, size: 0.85, sizeVariance: 0.45, tint: 0x315f2c, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  anon: {
    pisoTermico: 'calido',
    nombreComun: 'Anón',
    nombreCientifico: 'Annona squamosa',
    // arbolito bajo 4-6 m, copa abierta un poco desordenada, hoja media —
    // pariente más pequeño y ramificado de la guanábana.
    arquetipo: 'arbol',
    options: {
      seed: 30005,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x74593c, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 64, 2: 58, 3: 52 },
        children: { 0: 6, 1: 5, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.014 },
        gnarliness: { 0: 0.16, 1: 0.2, 2: 0.14, 3: 0.06 },
        length: { 0: 2.6, 1: 2.0, 2: 1.1, 3: 0.6 },
        radius: { 0: 0.2, 1: 0.13, 2: 0.09, 3: 0.06 },
        sections: { 0: 7, 1: 6, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.3, 2: 0.24, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'anon', map: null, billboard: Billboard.Double, angle: 34, count: 16, start: 0.18, size: 0.6, sizeVariance: 0.45, tint: 0x4a7a38, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  caracoli: {
    pisoTermico: 'calido',
    nombreComun: 'Caracolí',
    nombreCientifico: 'Anacardium excelsum',
    // GIGANTE emergente del bosque seco/húmedo (20-30 m), fuste recto grueso,
    // copa alta amplísima y REDONDEADA — sombra monumental de vega de río.
    arquetipo: 'arbol',
    options: {
      seed: 30006,
      type: TreeType.Deciduous,
      bark: { type: 'Bark002', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x8a8272, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 3,
        angle: { 1: 60, 2: 56, 3: 50 },
        children: { 0: 8, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.009 },
        gnarliness: { 0: 0.07, 1: 0.11, 2: 0.11, 3: 0.05 },
        length: { 0: 11.5, 1: 5.2, 2: 2.4, 3: 1.0 },
        radius: { 0: 0.9, 1: 0.48, 2: 0.27, 3: 0.15 },
        sections: { 0: 14, 1: 10, 2: 7, 3: 4 },
        segments: { 0: 9, 1: 6, 2: 5, 3: 3 },
        start: { 1: 0.42, 2: 0.28, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'caracoli', map: null, billboard: Billboard.Double, angle: 34, count: 18, start: 0.34, size: 0.95, sizeVariance: 0.45, tint: 0x437a34, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  matarraton: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Matarratón',
    nombreCientifico: 'Gliricidia sepium',
    // fijador de N y cerca viva (6-10 m), copa abierta y extendida, floración
    // MALVA-ROSA en racimos cuando pierde hoja — enriquece la paleta cálida.
    arquetipo: 'arbol',
    options: {
      seed: 30007,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x8a7258, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 70, 2: 64, 3: 56 },
        children: { 0: 7, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.009 },
        gnarliness: { 0: 0.1, 1: 0.14, 2: 0.12, 3: 0.05 },
        length: { 0: 4.4, 1: 3.4, 2: 1.7, 3: 0.8 },
        radius: { 0: 0.34, 1: 0.2, 2: 0.13, 3: 0.08 },
        sections: { 0: 9, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.42, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'matarraton', map: null, billboard: Billboard.Double, angle: 42, count: 16, start: 0.28, size: 0.6, sizeVariance: 0.5, tint: 0xcf9ab8, alphaTest: 0.5, roundedNormals: false },
      trellis: { enabled: false },
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  CÁLIDO-TEMPLADO — florecientes ornamentales-agroforestales
  // ═══════════════════════════════════════════════════════════════════

  gualanday: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Gualanday / Jacarandá',
    nombreCientifico: 'Jacaranda mimosifolia',
    // copa en sombrilla amplia de follaje PLUMOSO fino, floración AZUL-VIOLETA
    // espectacular (8-15 m). Silueta parasol como el guayacán pero color azul.
    arquetipo: 'arbol',
    options: {
      seed: 30008,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x8a7860, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 74, 2: 70, 3: 64 },
        children: { 0: 8, 1: 6, 2: 5 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.007 },
        gnarliness: { 0: 0.08, 1: 0.1, 2: 0.1, 3: 0.05 },
        length: { 0: 6.0, 1: 3.4, 2: 1.6, 3: 0.8 },
        radius: { 0: 0.4, 1: 0.23, 2: 0.14, 3: 0.09 },
        sections: { 0: 10, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 4, 3: 3 },
        start: { 1: 0.48, 2: 0.24, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.5, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'gualanday', map: null, billboard: Billboard.Double, angle: 50, count: 20, start: 0.3, size: 0.5, sizeVariance: 0.55, tint: 0x7d78c8, alphaTest: 0.5, roundedNormals: false },
      trellis: { enabled: false },
    },
  },

  higo: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Higuera',
    nombreCientifico: 'Ficus carica',
    // arbolito bajo y RETORCIDO (3-6 m), copa extendida irregular, HOJA grande
    // lobulada. Silueta nudosa característica de la breva.
    arquetipo: 'arbol',
    options: {
      seed: 30009,
      type: TreeType.Deciduous,
      bark: { type: 'Bark002', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x9a917a, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 68, 2: 62, 3: 56 },
        children: { 0: 5, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.24, 1: 0.28, 2: 0.2, 3: 0.08 },
        length: { 0: 2.6, 1: 2.2, 2: 1.2, 3: 0.6 },
        radius: { 0: 0.24, 1: 0.16, 2: 0.11, 3: 0.07 },
        sections: { 0: 8, 1: 7, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.3, 2: 0.24, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'higo', map: null, billboard: Billboard.Double, angle: 34, count: 13, start: 0.18, size: 0.9, sizeVariance: 0.5, tint: 0x4a7a34, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  TEMPLADO-FRÍO — frutales de clima medio y de tierra fría
  // ═══════════════════════════════════════════════════════════════════

  nispero: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Níspero',
    nombreCientifico: 'Eriobotrya japonica',
    // frutal perenne 5-8 m, copa densa y redonda, HOJA grande coriácea verde muy
    // oscuro por el haz — dosel compacto y pesado.
    arquetipo: 'arbol',
    options: {
      seed: 30010,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x6e5540, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 58, 2: 52, 3: 48 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.1, 1: 0.14, 2: 0.12, 3: 0.05 },
        length: { 0: 3.4, 1: 2.6, 2: 1.4, 3: 0.7 },
        radius: { 0: 0.26, 1: 0.16, 2: 0.11, 3: 0.07 },
        sections: { 0: 8, 1: 7, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.32, 2: 0.24, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'nispero', map: null, billboard: Billboard.Double, angle: 30, count: 18, start: 0.2, size: 0.8, sizeVariance: 0.4, tint: 0x315f2e, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  durazno: {
    pisoTermico: 'frio-templado',
    nombreComun: 'Durazno',
    nombreCientifico: 'Prunus persica',
    // frutal bajo y extendido (3-5 m), copa abierta en vaso, floración ROSA de
    // primavera — la nube rosada del huerto de tierra fría.
    arquetipo: 'arbol',
    options: {
      seed: 30011,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x6b4a3a, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 66, 2: 60, 3: 54 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.011 },
        gnarliness: { 0: 0.14, 1: 0.18, 2: 0.14, 3: 0.06 },
        length: { 0: 2.0, 1: 1.9, 2: 1.1, 3: 0.6 },
        radius: { 0: 0.18, 1: 0.12, 2: 0.08, 3: 0.05 },
        sections: { 0: 7, 1: 6, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.3, 2: 0.24, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'durazno', map: null, billboard: Billboard.Double, angle: 38, count: 18, start: 0.14, size: 0.44, sizeVariance: 0.6, tint: 0xf0a6c0, alphaTest: 0.5, roundedNormals: false },
      trellis: { enabled: false },
    },
  },

  capuli: {
    pisoTermico: 'frio',
    nombreComun: 'Capulí',
    nombreCientifico: 'Prunus serotina var. capuli',
    // cerezo andino 8-12 m, copa alta redondeada un poco péndula, verde medio
    // brillante — árbol de linde y de sombra en tierra fría.
    arquetipo: 'arbol',
    options: {
      seed: 30012,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x6a4d38, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 3,
        angle: { 1: 58, 2: 54, 3: 50 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 0.9, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.09, 1: 0.13, 2: 0.11, 3: 0.05 },
        length: { 0: 5.0, 1: 3.0, 2: 1.6, 3: 0.8 },
        radius: { 0: 0.36, 1: 0.22, 2: 0.13, 3: 0.08 },
        sections: { 0: 10, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.36, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'capuli', map: null, billboard: Billboard.Double, angle: 32, count: 17, start: 0.24, size: 0.5, sizeVariance: 0.45, tint: 0x4a7a3a, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  FRÍO — nativos del bosque andino (florecientes y de dosel)
  // ═══════════════════════════════════════════════════════════════════

  sietecueros: {
    pisoTermico: 'frio',
    nombreComun: 'Siete cueros',
    nombreCientifico: 'Tibouchina lepidota',
    // nativo emblemático del bosque altoandino (6-12 m), copa redondeada densa,
    // floración MAGENTA-MORADA intensa — la joya de color del páramo bajo.
    arquetipo: 'arbol',
    options: {
      seed: 30013,
      type: TreeType.Deciduous,
      bark: { type: 'Bark002', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x7a5a48, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 62, 2: 56, 3: 50 },
        children: { 0: 7, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.011 },
        gnarliness: { 0: 0.1, 1: 0.14, 2: 0.12, 3: 0.05 },
        length: { 0: 4.4, 1: 3.0, 2: 1.5, 3: 0.8 },
        radius: { 0: 0.3, 1: 0.18, 2: 0.12, 3: 0.07 },
        sections: { 0: 9, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.36, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'sietecueros', map: null, billboard: Billboard.Double, angle: 34, count: 18, start: 0.22, size: 0.6, sizeVariance: 0.5, tint: 0x9a4fb0, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  chilo: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Chiló',
    nombreCientifico: 'Erythrina rubrinervia',
    // Erythrina nativa (6-10 m), copa abierta extendida, floración ROJO-NARANJA
    // encendida en espigas — pariente del chachafruto, fijador de N.
    arquetipo: 'arbol',
    options: {
      seed: 30014,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x8a6b50, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 68, 2: 62, 3: 54 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.01 },
        gnarliness: { 0: 0.12, 1: 0.16, 2: 0.13, 3: 0.05 },
        length: { 0: 4.6, 1: 3.2, 2: 1.6, 3: 0.8 },
        radius: { 0: 0.34, 1: 0.2, 2: 0.13, 3: 0.08 },
        sections: { 0: 9, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.4, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'chilo', map: null, billboard: Billboard.Double, angle: 40, count: 15, start: 0.26, size: 0.62, sizeVariance: 0.5, tint: 0xe0552e, alphaTest: 0.5, roundedNormals: false },
      trellis: { enabled: false },
    },
  },

  raque: {
    pisoTermico: 'frio',
    nombreComun: 'Raque',
    nombreCientifico: 'Vallea stipularis',
    // arbolito nativo de tierra fría (4-8 m), copa redondeada, floración ROSA
    // suave acampanada — muy usado en restauración altoandina.
    arquetipo: 'arbol',
    options: {
      seed: 30015,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x7a5a44, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 60, 2: 54, 3: 48 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.11, 1: 0.15, 2: 0.12, 3: 0.05 },
        length: { 0: 3.0, 1: 2.4, 2: 1.3, 3: 0.6 },
        radius: { 0: 0.24, 1: 0.15, 2: 0.1, 3: 0.06 },
        sections: { 0: 8, 1: 7, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.34, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'raque', map: null, billboard: Billboard.Double, angle: 34, count: 17, start: 0.2, size: 0.5, sizeVariance: 0.5, tint: 0xe89ab4, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  arrayan: {
    pisoTermico: 'frio',
    nombreComun: 'Arrayán de Bogotá',
    nombreCientifico: 'Myrcianthes leucoxyla',
    // nativo perenne 5-8 m, copa MUY densa y redonda de hoja pequeña glossy,
    // corteza lisa cobriza que se descama — dosel compacto oscuro.
    arquetipo: 'arbol',
    options: {
      seed: 30016,
      type: TreeType.Deciduous,
      bark: { type: 'Bark002', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0xa06848, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 54, 2: 50, 3: 46 },
        children: { 0: 7, 1: 6, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.013 },
        gnarliness: { 0: 0.1, 1: 0.14, 2: 0.12, 3: 0.05 },
        length: { 0: 3.2, 1: 2.4, 2: 1.3, 3: 0.6 },
        radius: { 0: 0.24, 1: 0.15, 2: 0.1, 3: 0.06 },
        sections: { 0: 8, 1: 7, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.32, 2: 0.24, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'arrayan', map: null, billboard: Billboard.Double, angle: 30, count: 24, start: 0.14, size: 0.34, sizeVariance: 0.5, tint: 0x3a6b34, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  gaque: {
    pisoTermico: 'frio',
    nombreComun: 'Gaque',
    nombreCientifico: 'Clusia multiflora',
    // nativo de niebla 6-10 m, copa densa redonda, HOJA gruesa coriácea verde
    // muy oscuro — árbol clave del bosque altoandino de agua.
    arquetipo: 'arbol',
    options: {
      seed: 30017,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x6a5a44, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 56, 2: 52, 3: 48 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
        gnarliness: { 0: 0.09, 1: 0.13, 2: 0.11, 3: 0.05 },
        length: { 0: 4.0, 1: 2.8, 2: 1.5, 3: 0.7 },
        radius: { 0: 0.32, 1: 0.2, 2: 0.13, 3: 0.08 },
        sections: { 0: 9, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.34, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'gaque', map: null, billboard: Billboard.Double, angle: 28, count: 18, start: 0.2, size: 0.66, sizeVariance: 0.4, tint: 0x2c5528, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  sauco: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Sauco',
    nombreCientifico: 'Sambucus nigra',
    // arbusto-arbolito medicinal (3-6 m), copa abierta, follaje verde claro,
    // corimbos de flor blanco-crema — cerca viva y remedio de patio.
    arquetipo: 'arbol',
    options: {
      seed: 30018,
      type: TreeType.Deciduous,
      bark: { type: 'Bark002', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x8a7a5a, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 60, 2: 54, 3: 48 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.014 },
        gnarliness: { 0: 0.12, 1: 0.16, 2: 0.13, 3: 0.05 },
        length: { 0: 2.4, 1: 2.0, 2: 1.1, 3: 0.6 },
        radius: { 0: 0.18, 1: 0.12, 2: 0.08, 3: 0.05 },
        sections: { 0: 7, 1: 6, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.3, 2: 0.24, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'sauco', map: null, billboard: Billboard.Double, angle: 34, count: 18, start: 0.16, size: 0.5, sizeVariance: 0.5, tint: 0x5a9a48, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  mano_de_oso: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Mano de oso',
    nombreCientifico: 'Oreopanax floribundum',
    // nativo de niebla 6-10 m, copa abierta de POCAS hojas MUY grandes palmeadas
    // (como manos abiertas) — silueta inconfundible del bosque de niebla.
    arquetipo: 'arbol',
    options: {
      seed: 30019,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x6f5a42, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 58, 2: 52, 3: 46 },
        children: { 0: 5, 1: 3, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.013 },
        gnarliness: { 0: 0.1, 1: 0.13, 2: 0.11, 3: 0.05 },
        length: { 0: 4.2, 1: 2.6, 2: 1.3, 3: 0.6 },
        radius: { 0: 0.3, 1: 0.18, 2: 0.12, 3: 0.07 },
        sections: { 0: 9, 1: 7, 2: 5, 3: 3 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.36, 2: 0.28, 3: 0.24 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'mano_de_oso', map: null, billboard: Billboard.Double, angle: 44, count: 10, start: 0.28, size: 1.15, sizeVariance: 0.35, tint: 0x3a6b30, alphaTest: 0.5, roundedNormals: false },
      trellis: { enabled: false },
    },
  },

  cucharo: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Cucharo',
    nombreCientifico: 'Myrsine coriacea',
    // nativo pionero de tierra fría (5-9 m), copa cónica-redondeada densa de
    // hoja pequeña coriácea, verde medio — colonizador de bordes de bosque.
    arquetipo: 'arbol',
    options: {
      seed: 30020,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x6a5238, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 52, 2: 48, 3: 44 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.014 },
        gnarliness: { 0: 0.09, 1: 0.13, 2: 0.11, 3: 0.05 },
        length: { 0: 4.0, 1: 2.6, 2: 1.3, 3: 0.6 },
        radius: { 0: 0.26, 1: 0.16, 2: 0.1, 3: 0.06 },
        sections: { 0: 9, 1: 7, 2: 5, 3: 3 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.34, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'cucharo', map: null, billboard: Billboard.Double, angle: 30, count: 20, start: 0.2, size: 0.42, sizeVariance: 0.45, tint: 0x3f7038, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  ARBUSTOS pioneros nativos (porte bajo leñoso, sí pasan por ez-tree)
  // ═══════════════════════════════════════════════════════════════════

  hayuelo: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Hayuelo',
    nombreCientifico: 'Dodonaea viscosa',
    // arbusto pionero resinoso (2-4 m), muy ramificado desde la base, hoja
    // estrecha lustrosa, cápsulas rojizas — restaurador de suelos pobres.
    arquetipo: 'arbol',
    options: {
      seed: 30021,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x7a6248, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 50, 2: 46, 3: 42 },
        children: { 0: 7, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.016 },
        gnarliness: { 0: 0.14, 1: 0.16, 2: 0.12, 3: 0.05 },
        length: { 0: 1.6, 1: 1.4, 2: 0.8, 3: 0.4 },
        radius: { 0: 0.12, 1: 0.08, 2: 0.05, 3: 0.04 },
        sections: { 0: 6, 1: 5, 2: 4, 3: 3 },
        segments: { 0: 5, 1: 4, 2: 3, 3: 3 },
        start: { 1: 0.2, 2: 0.18, 3: 0.16 },
        taper: { 0: 0.5, 1: 0.5, 2: 0.55, 3: 0.55 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'hayuelo', map: null, billboard: Billboard.Double, angle: 26, count: 22, start: 0.1, size: 0.34, sizeVariance: 0.5, tint: 0x5a8a3a, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  chilco: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Chilco',
    nombreCientifico: 'Baccharis latifolia',
    // arbusto asterácea pionero (2-3.5 m), copa densa erguida, hoja media
    // aserrada verde claro — colonizador clave de taludes y quebradas.
    arquetipo: 'arbol',
    options: {
      seed: 30022,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x6a5a3a, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 1,
        angle: { 1: 52, 2: 0, 3: 0 },
        children: { 0: 8, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.018 },
        gnarliness: { 0: 0.12, 1: 0.12, 2: 0, 3: 0 },
        length: { 0: 1.8, 1: 1.0, 2: 1, 3: 1 },
        radius: { 0: 0.1, 1: 0.06, 2: 0.05, 3: 0.05 },
        sections: { 0: 6, 1: 5, 2: 4, 3: 3 },
        segments: { 0: 5, 1: 4, 2: 3, 3: 3 },
        start: { 1: 0.22, 2: 0.2, 3: 0.2 },
        taper: { 0: 0.5, 1: 0.5, 2: 0.5, 3: 0.5 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'chilco', map: null, billboard: Billboard.Double, angle: 34, count: 20, start: 0.12, size: 0.4, sizeVariance: 0.5, tint: 0x5a8a44, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  extra frutal de dosel oscuro
  // ═══════════════════════════════════════════════════════════════════

  mangostino: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Mangostino',
    nombreCientifico: 'Garcinia mangostana',
    // frutal perenne de copa PIRAMIDAL densa y estrecha (6-12 m), hoja gruesa
    // glossy verde muy oscuro — silueta cónica compacta, contraste con las copas
    // redondas del grupo cálido.
    arquetipo: 'arbol',
    options: {
      seed: 30023,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x4a3a2c, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 3,
        angle: { 1: 46, 2: 42, 3: 38 },
        children: { 0: 6, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.013 },
        gnarliness: { 0: 0.07, 1: 0.1, 2: 0.09, 3: 0.04 },
        length: { 0: 5.0, 1: 2.8, 2: 1.4, 3: 0.7 },
        radius: { 0: 0.32, 1: 0.19, 2: 0.12, 3: 0.08 },
        sections: { 0: 10, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.34, 2: 0.26, 3: 0.22 },
        taper: { 0: 0.58, 1: 0.58, 2: 0.6, 3: 0.6 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'mangostino', map: null, billboard: Billboard.Double, angle: 28, count: 16, start: 0.2, size: 0.62, sizeVariance: 0.4, tint: 0x2a5228, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  guama_macheto: {
    pisoTermico: 'templado',
    nombreComun: 'Guamo macheto',
    nombreCientifico: 'Inga densiflora',
    // Inga de sombra de cafetal (10-15 m), fuste recto, copa alta amplia y
    // redondeada de hoja compuesta fina — la sombra alta clásica del café,
    // distinta del guamo (Inga edulis) por porte más alto y erguido.
    arquetipo: 'arbol',
    options: {
      seed: 30024,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x74604a, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 3,
        angle: { 1: 58, 2: 54, 3: 48 },
        children: { 0: 6, 1: 5, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.011 },
        gnarliness: { 0: 0.08, 1: 0.12, 2: 0.11, 3: 0.05 },
        length: { 0: 6.5, 1: 3.4, 2: 1.7, 3: 0.8 },
        radius: { 0: 0.42, 1: 0.25, 2: 0.15, 3: 0.09 },
        sections: { 0: 11, 1: 9, 2: 6, 3: 4 },
        segments: { 0: 8, 1: 6, 2: 4, 3: 3 },
        start: { 1: 0.4, 2: 0.27, 3: 0.22 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'guama_macheto', map: null, billboard: Billboard.Double, angle: 34, count: 18, start: 0.24, size: 0.62, sizeVariance: 0.45, tint: 0x3d7a37, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  PRIORIDAD OPERADOR (2026-08-03) — especies pedidas por nombre, con
  //  FORMA y COLOR fieles a su morfología real (gate visual Humboldt).
  //  `catalogo` documenta dónde se verificó el nombre científico:
  //    'oss-v3.2'    → chagra-catalog-oss-subset-v3.2.json (581 sp)
  //    'kg-graph'    → chagra-kg-graph-snapshot.json (grafo completo -742)
  //    'externo-real'→ especie REAL de Colombia NO presente en el catálogo
  //                    Chagra (se marca honesto, NO se inventa verificación).
  // ═══════════════════════════════════════════════════════════════════

  chicala: {
    pisoTermico: 'calido-templado',
    nombreComun: 'Chicalá',
    nombreCientifico: 'Tecoma stans',
    catalogo: 'kg-graph',
    // arbolito/arbusto 4-8 m de copa redondeada abierta, floración AMARILLA-ORO
    // intensa en racimos terminales (trompetas) — el amarillo tiene que LEERSE.
    arquetipo: 'arbol',
    options: {
      seed: 30025,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x8a6f50, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 64, 2: 58, 3: 52 },
        children: { 0: 7, 1: 6, 2: 4 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.011 },
        gnarliness: { 0: 0.11, 1: 0.15, 2: 0.12, 3: 0.05 },
        length: { 0: 3.0, 1: 2.4, 2: 1.3, 3: 0.6 },
        radius: { 0: 0.22, 1: 0.14, 2: 0.09, 3: 0.06 },
        sections: { 0: 8, 1: 7, 2: 5, 3: 3 },
        segments: { 0: 6, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.32, 2: 0.24, 3: 0.2 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'chicala', map: null, billboard: Billboard.Double, angle: 40, count: 18, start: 0.2, size: 0.66, sizeVariance: 0.5, tint: 0xf0c422, alphaTest: 0.5, roundedNormals: false },
      trellis: { enabled: false },
    },
  },

  arboloco: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Arboloco',
    nombreCientifico: 'Montanoa quadrangularis',
    catalogo: 'externo-real', // NO está en el catálogo Chagra (seed/oss/kg) — especie real de Colombia, marcada honesto
    // pionero de crecimiento rápido (6-12 m), fuste recto de tallo cuadrangular,
    // copa alta abierta de HOJA grande áspera opuesta, masas de flor blanca.
    arquetipo: 'arbol',
    options: {
      seed: 30026,
      type: TreeType.Deciduous,
      bark: { type: 'Bark002', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x8a8168, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        angle: { 1: 56, 2: 50, 3: 46 },
        children: { 0: 5, 1: 4, 2: 3 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.013 },
        gnarliness: { 0: 0.08, 1: 0.12, 2: 0.11, 3: 0.05 },
        length: { 0: 5.5, 1: 3.0, 2: 1.5, 3: 0.7 },
        radius: { 0: 0.32, 1: 0.19, 2: 0.12, 3: 0.08 },
        sections: { 0: 10, 1: 8, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.4, 2: 0.28, 3: 0.24 },
        taper: { 0: 0.55, 1: 0.55, 2: 0.58, 3: 0.58 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'arboloco', map: null, billboard: Billboard.Double, angle: 38, count: 14, start: 0.26, size: 0.95, sizeVariance: 0.45, tint: 0x5a8a3e, alphaTest: 0.5, roundedNormals: false },
      trellis: { enabled: false },
    },
  },

  sauce: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Sauce andino',
    nombreCientifico: 'Salix humboldtiana',
    catalogo: 'kg-graph',
    // sauce de ribera (8-14 m), copa estrecha PÉNDULA (ramas y hojas que
    // cuelgan), hoja fina lanceolada verde claro — silueta llorona de quebrada.
    arquetipo: 'arbol',
    options: {
      seed: 30027,
      type: TreeType.Deciduous,
      bark: { type: 'Bark002', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x9a8f78, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 2,
        // fuste erguido (fuerza suave hacia arriba) + hoja MUY colgante (leaves.angle
        // alto) = copa llorona péndula, sin volcar el árbol. Ramas largas y finas.
        angle: { 1: 62, 2: 60, 3: 58 },
        children: { 0: 7, 1: 6, 2: 5 },
        force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.01 },
        gnarliness: { 0: 0.05, 1: 0.07, 2: 0.07, 3: 0.03 },
        length: { 0: 5.5, 1: 4.6, 2: 2.4, 3: 1.0 },
        radius: { 0: 0.3, 1: 0.15, 2: 0.08, 3: 0.05 },
        sections: { 0: 11, 1: 9, 2: 6, 3: 4 },
        segments: { 0: 7, 1: 5, 2: 4, 3: 3 },
        start: { 1: 0.34, 2: 0.28, 3: 0.22 },
        taper: { 0: 0.5, 1: 0.6, 2: 0.6, 3: 0.6 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'sauce', map: null, billboard: Billboard.Double, angle: 84, count: 30, start: 0.22, size: 0.42, sizeVariance: 0.5, tint: 0x8ab04a, alphaTest: 0.5, roundedNormals: false },
      trellis: { enabled: false },
    },
  },

  frambuesa: {
    pisoTermico: 'frio',
    nombreComun: 'Frambuesa',
    nombreCientifico: 'Rubus idaeus',
    catalogo: 'oss-v3.2',
    // arbusto de cañas ARQUEADAS delgadas (1.5-2.5 m), follaje denso verde
    // medio, hoja compuesta — pariente de la mora, cañas más finas y erguidas.
    arquetipo: 'arbol',
    options: {
      seed: 30028,
      type: TreeType.Deciduous,
      bark: { type: 'Bark001', maps: { color: null, ao: null, normal: null, roughness: null }, tint: 0x6a5a3a, flatShading: false, textured: false, textureScale: { x: 1, y: 1 } },
      branch: {
        levels: 1,
        angle: { 1: 46, 2: 0, 3: 0 },
        children: { 0: 7, 1: 0, 2: 0 },
        force: { direction: { x: 0, y: 0.75, z: 0.2 }, strength: 0.028 },
        gnarliness: { 0: 0.16, 1: 0.12, 2: 0, 3: 0 },
        length: { 0: 1.6, 1: 1.0, 2: 1, 3: 1 },
        radius: { 0: 0.05, 1: 0.03, 2: 0.03, 3: 0.03 },
        sections: { 0: 6, 1: 5, 2: 4, 3: 3 },
        segments: { 0: 5, 1: 4, 2: 3, 3: 3 },
        start: { 1: 0.28, 2: 0.3, 3: 0.3 },
        taper: { 0: 0.5, 1: 0.5, 2: 0.5, 3: 0.5 },
        twist: { 0: 0, 1: 0, 2: 0, 3: 0 },
      },
      leaves: { type: 'frambuesa', map: null, billboard: Billboard.Double, angle: 36, count: 18, start: 0.12, size: 0.34, sizeVariance: 0.5, tint: 0x5a8a40, alphaTest: 0.5, roundedNormals: true },
      trellis: { enabled: false },
    },
  },

  gulupa: {
    pisoTermico: 'templado-frio',
    nombreComun: 'Gulupa',
    nombreCientifico: 'Passiflora edulis',
    catalogo: 'oss-v3.2',
    // TREPADORA / liana de pasionaria — NO pasa por ez-tree: escala un soporte
    // en espiral, con hoja lobulada, zarcillos y la FLOR morada de Passiflora.
    // Builder propio `crearEnredadera` (flora/enredadera.js).
    arquetipo: 'trepadora',
    paramsTrepadora: {
      seed: 30029,
      alturaSoporte: 3.4,
      radioHelix: 0.36,
      vueltas: 3.2,
      countHoja: 28,
      sizeHoja: 0.5,
      tint: 0x3f8a3a,
      countFlor: 6,
      colorFlor: 0x8a4fae,      // morado gulupa
      colorCentroFlor: 0xf2e6b0,
      tamanoFlor: 0.15,
      tintSoporte: 0x9a7a52,
    },
  },
};

/**
 * Orden por piso térmico (cálido → frío), útil para recorrer el showcase.
 * @type {string[]}
 */
export const ORDEN_AMPLIADO = [
  // cálido
  'guanabana', 'anon', 'caracoli', 'matarraton', 'mangostino',
  // cálido-templado
  'guayaba', 'naranja', 'mandarina', 'gualanday', 'chicala',
  // templado
  'guama_macheto', 'arboloco', 'sauce', 'gulupa',
  // templado-frío frutal / arbusto
  'nispero', 'higo', 'sauco', 'mano_de_oso', 'cucharo', 'hayuelo', 'chilco', 'chilo',
  // frío nativo / frutal
  'sietecueros', 'raque', 'arrayan', 'gaque', 'durazno', 'capuli', 'frambuesa',
];

/**
 * Sólo las 16 especies de la lista de PRIORIDAD del operador (2026-08-03),
 * en el orden en que las pidió. Mezcla claves de ESTE archivo con claves que
 * ya viven en `especies-eztree.js` (base) — el showcase resuelve cada una
 * contra su mapa correspondiente. Las que NO están aquí viven en el base:
 *   aliso_andino, roble_negro, nogal_andino, cacao, cafe, mora, uchuva,
 *   tomate_arbol, fresa.
 * @type {string[]}
 */
export const PRIORIDAD_OPERADOR_16 = [
  // árboles (ez-tree)
  'sietecueros', 'chicala', 'arboloco', 'aliso_andino', 'arrayan',
  'roble_negro', 'nogal_andino', 'sauce', 'cacao',
  // arbustos
  'cafe', 'mora', 'frambuesa', 'uchuva', 'tomate_arbol',
  // rastrera
  'fresa',
  // trepadora
  'gulupa',
];

/**
 * Verifica en runtime que ninguna especie de este mapa sea antagonista
 * (exótico-invasora de plantación). Lanza si detecta una — defensa en
 * profundidad para cualquier edición futura.
 * @returns {number} cantidad de especies validadas
 */
export function assertNoAntagonistas() {
  const claves = Object.keys(ESPECIES_EZTREE_AMPLIADO);
  for (const clave of claves) {
    const sci = ESPECIES_EZTREE_AMPLIADO[clave].nombreCientifico;
    for (const prefijo of PREFIJOS_ANTAGONISTAS) {
      if (sci.startsWith(prefijo)) {
        throw new Error(`especies-eztree-ampliado: "${clave}" (${sci}) es ANTAGONISTA (${prefijo}) — VETADA`);
      }
    }
  }
  return claves.length;
}

// Auto-validación al importar (falla ruidoso si alguien mete una invasora).
assertNoAntagonistas();

/**
 * Instancia un árbol ez-tree para una clave de `ESPECIES_EZTREE_AMPLIADO`.
 * Todas las entradas de este archivo son `arquetipo:'arbol'`, así que siempre
 * pasa por ez-tree (a diferencia de `crearPlanta()` del archivo base, que
 * también enruta hierbas/rosetas/pajonales).
 * @param {string} clave
 * @param {{ Tree: typeof import('./ez-tree/tree.js').Tree, TreeOptions: typeof import('./ez-tree/options.js').default }} eztree
 * @returns {THREE.Group}
 */
export function crearArbolAmpliado(clave, { Tree, TreeOptions }) {
  const def = ESPECIES_EZTREE_AMPLIADO[clave];
  if (!def) throw new Error(`crearArbolAmpliado: especie desconocida "${clave}"`);
  const options = new TreeOptions();
  options.copy(def.options);
  const tree = new Tree(options);
  tree.generate();
  return tree;
}

/**
 * Enruta por `arquetipo`: 'arbol' → ez-tree, 'trepadora' → crearEnredadera.
 * Punto de entrada recomendado para el showcase / integración.
 * @param {string} clave
 * @param {{ Tree: typeof import('./ez-tree/tree.js').Tree, TreeOptions: typeof import('./ez-tree/options.js').default }} eztree
 * @returns {THREE.Group}
 */
export function crearPlantaAmpliada(clave, { Tree, TreeOptions }) {
  const def = ESPECIES_EZTREE_AMPLIADO[clave];
  if (!def) throw new Error(`crearPlantaAmpliada: especie desconocida "${clave}"`);
  if (def.arquetipo === 'trepadora') return crearEnredadera(def.paramsTrepadora);
  return crearArbolAmpliado(clave, { Tree, TreeOptions });
}
