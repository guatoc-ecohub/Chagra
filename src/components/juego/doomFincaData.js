/**
 * doomFincaData - datos para el nivel Doom agroecologico primera persona.
 *
 * GANCHO PEDAGOGICO: el jugador recorre una finca andina real en primera
 * persona, identifica plagas reales y las controla lanzando el organismo
 * benefico o biopreparado CORRECTO. Los pares plaga->benefico son
 * agronomicamente reales (ICA, CIAT, Cenicafe, FAO). El escenario muestra
 * el "kit completo" de la finca: setos vivos de arboles, corral de animales,
 * compostera (abono), camas de cultivo, colmena, girasoles para polinizadores.
 *
 * Motor raycaster propio en Canvas 2D (sin librerias 3D). Solo este repo.
 *
 * i18n: juego servido solo en es-CO. Regla chagra-i18n es soft (warn),
 * aqui se desactiva por archivo completo.
 */

/**
 * Mapa de la finca (grid 16x14).
 * Codigos de celda (0 = transitable, resto = solido con material):
 *   0 = camino / tierra (transitable)
 *   1 = seto vivo de arboles (cerca viva del perimetro)
 *   2 = cerca de madera (corral de animales)
 *   3 = muro de adobe / bahareque (bodega de la finca)
 *   4 = compostera (pila de abono encajonada)
 *   5 = cama de cultivo elevada (con plantas)
 *
 * Diseno: perimetro de seto vivo (arboles), camas de cultivo formando
 * pasillos, un corral de madera, una compostera y una bodega de adobe,
 * para que el recorrido se sienta una finca de verdad y no un pasillo vacio.
 */
export const MAPA = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 5, 5, 5, 0, 0, 5, 5, 5, 0, 0, 0, 1],
  [1, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 1],
  [1, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 1],
  [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 1],
  [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 1],
  [1, 0, 0, 0, 4, 4, 4, 0, 0, 5, 5, 5, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const MAPA_FILAS = MAPA.length;
export const MAPA_COLS = MAPA[0].length;

/**
 * Materiales de pared, indexados por el codigo de celda del mapa.
 * Cada material define colores base y un patron de textura que el render
 * dibuja por pixel (madera con tablones, adobe con bloques, seto con hojas,
 * compostera con grumos, cama de cultivo con plantas arriba).
 */
export const MATERIALES = {
  1: {
    nombre: 'Seto vivo',
    patron: 'seto',
    base: '#3c6b2e',        // follaje verde
    sombra: '#264a1c',      // hueco entre hojas
    luz: '#5e9446',         // hoja iluminada
  },
  2: {
    nombre: 'Cerca de madera',
    patron: 'madera',
    base: '#9a6634',        // tablon
    sombra: '#6b4420',      // veta / junta
    luz: '#b9844c',         // tablon iluminado
  },
  3: {
    nombre: 'Muro de adobe',
    patron: 'adobe',
    base: '#bb9264',        // bloque adobe
    sombra: '#8a6843',      // junta de barro
    luz: '#d6b489',         // bloque iluminado
  },
  4: {
    nombre: 'Compostera',
    patron: 'compost',
    base: '#5c4327',        // cajon de madera
    sombra: '#2f2010',      // materia en descomposicion
    luz: '#7a5a35',         // borde iluminado
  },
  5: {
    nombre: 'Cama de cultivo',
    patron: 'cultivo',
    base: '#6b4a2a',        // tablon de la cama
    sombra: '#4a3119',      // tierra
    luz: '#4a8c3f',         // follaje del cultivo (parte superior)
  },
};

/**
 * Decoraciones del escenario: billboards NO hostiles, solo ambiente y
 * pedagogia. El jugador puede mirarlas para leer su rol en la finca
 * (abono -> biopreparado, abejas -> polinizacion, arbol -> sombra/silvopastoreo).
 * Coordenadas en celdas del mundo (transitables).
 */
export const DECORACIONES = [
  { tipo: 'arbol', x: 2.5, y: 11.5, leccion: 'Los arboles dan sombra, frenan el viento y sus hojas alimentan la compostera.' },
  { tipo: 'arbol', x: 13.5, y: 2.5, leccion: 'Cerca viva: barrera natural que aloja aves y enemigos de las plagas.' },
  { tipo: 'colmena', x: 13.5, y: 5.5, leccion: 'La colmena: las abejas polinizan los cultivos y suben la cosecha.' },
  { tipo: 'girasol', x: 7.5, y: 9.5, leccion: 'Flores como el girasol atraen abejas y avispas beneficas.' },
  { tipo: 'girasol', x: 8.5, y: 9.5, leccion: 'Mas flores = mas polinizadores y mas control natural de plagas.' },
  { tipo: 'gallina', x: 2.5, y: 5.5, leccion: 'Las gallinas comen larvas y plagas; su gallinaza nutre el bocashi.' },
  { tipo: 'vaca', x: 13.5, y: 11.5, leccion: 'La vaca aporta bonita: base del biol y del supermagro para las plantas.' },
  { tipo: 'abono', x: 5.5, y: 10.5, leccion: 'Compostera: estiercol + hojas se vuelven abono que alimenta el cultivo.' },
];

/**
 * Plagas que aparecen en el nivel Doom.
 * Cada una tiene su par benefico que la controla (agronomicamente real).
 * `forma` define el sprite procedural que dibuja el render.
 */
export const PLAGAS_DOOM = [
  {
    id: 'cogollero',
    nombre: 'Gusano cogollero',
    cientifico: 'Spodoptera frugiperda',
    emoji: '🐛',
    forma: 'oruga',
    color: '#7c9e38',
    dano: 'Devora el cogollo del maiz.',
    /** Id del benefico que la controla */
    controladoPor: 'trichogramma',
    velocidad: 0.012,
    vitalidad: 1,
  },
  {
    id: 'moscablanca',
    nombre: 'Mosca blanca',
    cientifico: 'Bemisia tabaci',
    emoji: '🪰',
    forma: 'mosca',
    color: '#e8e8e8',
    dano: 'Chupa savia y transmite virus.',
    controladoPor: 'beauveria',
    velocidad: 0.018,
    vitalidad: 1,
  },
  {
    id: 'afido',
    nombre: 'Afido del frijol',
    cientifico: 'Aphis fabae',
    emoji: '🦟',
    forma: 'afido',
    color: '#3b5e2b',
    dano: 'Forma colonias y debilita la planta.',
    controladoPor: 'catarina',
    velocidad: 0.010,
    vitalidad: 1,
  },
  {
    id: 'broca',
    nombre: 'Broca del cafe',
    cientifico: 'Hypothenemus hampei',
    emoji: '🪲',
    forma: 'escarabajo',
    color: '#4a2c17',
    dano: 'Perfora el grano de cafe.',
    controladoPor: 'beauveria',
    velocidad: 0.008,
    vitalidad: 2,
  },
];

/**
 * Beneficos / biopreparados que el jugador puede equipar y lanzar.
 */
export const BENEFICOS_DOOM = [
  {
    id: 'trichogramma',
    nombre: 'Avispita Trichogramma',
    emoji: '🐝',
    color: '#f5c842',
    desc: 'Parasita huevos del cogollero.',
  },
  {
    id: 'catarina',
    nombre: 'Mariquita',
    emoji: '🐞',
    color: '#e74c3c',
    desc: 'Devora afidos y pulgones.',
  },
  {
    id: 'beauveria',
    nombre: 'Beauveria bassiana',
    emoji: '🍄',
    color: '#f0f0e8',
    desc: 'Hongo que controla mosca blanca y broca.',
  },
];

/**
 * Posiciones iniciales de las plagas en coordenadas del mundo
 * (cada celda del mapa = 1.0 unidad, centradas en la celda transitable).
 */
export const SPAWNS_PLAGAS = [
  { tipo: 'cogollero', x: 5.5, y: 5.5 },
  { tipo: 'moscablanca', x: 10.5, y: 4.5 },
  { tipo: 'afido', x: 5.5, y: 9.5 },
  { tipo: 'broca', x: 10.5, y: 9.5 },
  { tipo: 'cogollero', x: 8.5, y: 7.5 },
  { tipo: 'moscablanca', x: 2.5, y: 8.5 },
  { tipo: 'afido', x: 13.5, y: 8.5 },
  { tipo: 'broca', x: 8.5, y: 2.5 },
];

/**
 * Paleta del cielo, terreno y ambiente de la finca andina diurna.
 * Los materiales de pared viven en MATERIALES (arriba).
 */
export const PALETA = {
  cieloAlto: [70, 130, 200],     // azul profundo (cenit)
  cieloBajo: [196, 226, 224],    // pale verde-azul (horizonte)
  sol: [255, 248, 214],          // disco solar
  solBrillo: [255, 226, 140],    // halo del sol
  montana: [104, 122, 146],      // cordillera lejana
  montanaSombra: [78, 94, 116],  // ladera en sombra
  nube: [248, 250, 252],         // nubes
  tierra: [107, 74, 42],         // piso de tierra
  tierraSurco: [74, 50, 27],     // surco / sombra del piso
  pasto: [78, 122, 50],          // mancha de pasto
  mulch: [90, 61, 34],           // cobertura / mulch
  // Angulo (rad) donde esta el sol en el mundo, para parallax al girar.
  solAzimut: 0.7,
};

/**
 * Tamano de celda del mapa (en unidades del mundo).
 * El raycaster usa este tamano para las paredes.
 */
export const CELDA = 1.0;

/**
 * Posicion inicial del jugador (x, y en coordenadas del mundo).
 */
export const JUGADOR_INICIAL = {
  x: 2.5,
  y: 2.5,
  angulo: 0, // radianes, mirando al este (derecha)
};

/**
 * Configuracion del nivel.
 */
export const CONFIG_DOOM = {
  vitalidadInicial: 100,
  vitalidadMax: 100,
  danoPorPlaga: 15,          // vitalidad que quita una plaga al alcanzar
  cooldownLanzamiento: 30,   // frames entre lanzamientos
  alcanceLanzamiento: 4.0,   // distancia maxima del benefico
  metaPlagas: 8,             // total de plagas a eliminar
  fov: Math.PI / 3,         // 60 grados campo de vision
  resX: 240,                 // columnas del raycaster (strips)
  resY: 180,                 // filas del canvas logico
  nieblaInicio: 6.0,        // distancia donde empieza la neblina de campo
  nieblaFin: 14.0,          // distancia donde la neblina es total
  velMovimiento: 0.04,       // velocidad de movimiento
  velRotacion: 0.04,         // velocidad de rotacion (rad/frame)
  velRotacionTouch: 0.005,   // sensibilidad rotacion touch
};
