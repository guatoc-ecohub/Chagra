/**
 * ez-tree — TreeOptions (parámetros por defecto de un árbol).
 *
 * Fuente: dgreenheck/ez-tree, MIT License. Copyright (c) 2024 Daniel Greenheck.
 * Puerto r167→r160: sin cambios de API (no toca THREE). Único recorte respecto
 * al original: `bark.maps` / `leaves.map` se documentan como "siempre null" en
 * este vendor — Chagra usa look ilustrado plano (Humboldt), NO texturas foto,
 * así que bark.textured queda en `false` por defecto aquí (el original lo deja
 * en `true` esperando un set de texturas que nosotros nunca cargamos).
 */
import { Billboard, TreeType } from './enums.js';

export default class TreeOptions {
  constructor() {
    this.seed = 0;
    this.type = TreeType.Deciduous;

    // Bark parameters
    this.bark = {
      // Identificador informativo (no lo consume la librería).
      type: 'Bark001',

      // Mapas de textura — Chagra NO los usa (look ilustrado plano). Si algún
      // día se cargan, mismo shape que el original: { color, ao, normal, roughness }.
      maps: {
        color: null,
        ao: null,
        normal: null,
        roughness: null,
      },

      // Tinte del tronco — color liso, es lo que realmente se ve
      tint: 0xffffff,

      // Usar normales de cara (facetado) en vez de normales de vértice
      flatShading: false,

      // Aplicar textura a la corteza — false: Chagra siempre pinta liso
      textured: false,

      // Escala de textura (irrelevante con textured:false, se conserva por compat)
      textureScale: { x: 1, y: 1 },
    };

    // Branch parameters
    this.branch = {
      // Niveles de recursión de ramas. 0 = solo tronco
      levels: 3,

      // Ángulo de las ramas hijas respecto a la rama padre (grados)
      angle: {
        1: 70,
        2: 60,
        3: 60,
      },

      // Número de hijas por nivel de rama
      children: {
        0: 7,
        1: 7,
        2: 5,
      },

      // Fuerza externa que orienta el crecimiento (ej. hacia arriba)
      force: {
        direction: { x: 0, y: 1, z: 0 },
        strength: 0.01,
      },

      // Curvatura/retorcimiento en cada nivel
      gnarliness: {
        0: 0.15,
        1: 0.2,
        2: 0.3,
        3: 0.02,
      },

      // Longitud de cada nivel de rama
      length: {
        0: 20,
        1: 20,
        2: 10,
        3: 1,
      },

      // Radio de cada nivel de rama
      radius: {
        0: 1.5,
        1: 0.7,
        2: 0.7,
        3: 0.7,
      },

      // Secciones por nivel de rama
      sections: {
        0: 12,
        1: 10,
        2: 8,
        3: 6,
      },

      // Segmentos radiales por nivel de rama
      segments: {
        0: 8,
        1: 6,
        2: 4,
        3: 3,
      },

      // Dónde empiezan a crecer las ramas hijas sobre la rama padre
      start: {
        1: 0.4,
        2: 0.3,
        3: 0.3,
      },

      // Ahusamiento (taper) en cada nivel
      taper: {
        0: 0.7,
        1: 0.7,
        2: 0.7,
        3: 0.7,
      },

      // Torsión en cada nivel
      twist: {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
      },
    };

    // Leaf parameters
    this.leaves = {
      // Identificador informativo (no lo consume la librería)
      type: 'oak',

      // Mapa de color — Chagra lo deja SIEMPRE null (hoja = quad tintado plano)
      map: null,

      // Billboard simple o doble/perpendicular
      billboard: Billboard.Double,

      // Ángulo de las hojas respecto a la rama padre (grados)
      angle: 10,

      // Número de hojas
      count: 1,

      // Dónde empiezan a crecer las hojas sobre el largo de la rama (0 a 1)
      start: 0,

      // Tamaño de las hojas
      size: 2.5,

      // Varianza de tamaño entre hojas
      sizeVariance: 0.7,

      // Color de tinte de las hojas
      tint: 0xffffff,

      // Umbral de transparencia (sin textura no aplica, se conserva por compat)
      alphaTest: 0.5,

      // Normales "redondeadas" para simular copa esférica
      roundedNormals: true,
    };

    // Trellis (espaldera) — desactivado por defecto; útil a futuro para
    // cultivos guiados (ej. maracuyá/uva) pero ninguna de las 6 especies
    // iniciales lo necesita.
    this.trellis = {
      enabled: false,
      position: { x: 0, y: 0, z: -2 },
      width: 10,
      height: 20,
      spacing: 2,
      force: {
        strength: 0.02,
        maxDistance: 3,
        falloff: 1,
      },
      cylinderRadius: 0.05,
      visible: true,
      color: 0x8b4513,
    };
  }

  /**
   * Copia los valores de source hacia este objeto (merge recursivo shallow
   * en objetos planos; Texture u otros no-planos se asignan por referencia).
   * @param {TreeOptions} source
   */
  copy(source, target = this) {
    for (let key in source) {
      if (source.hasOwnProperty(key) && target.hasOwnProperty(key)) {
        const value = source[key];
        if (value !== null && typeof value === 'object' && value.constructor === Object) {
          this.copy(value, target[key]);
        } else {
          target[key] = value;
        }
      }
    }
  }
}
