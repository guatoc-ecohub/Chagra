/**
 * doomFincaData - datos para el nivel Doom agroecologico primera persona.
 *
 * GANCHO PEDAGOGICO: el jugador recorre un invernadero/cultivo en primera
 * persona, identifica plagas reales y las controla lanzando el organismo
 * benefico o biopreparado CORRECTO. Los pares plaga->benefico son
 * agronomicamente reales (ICA, CIAT, Cenicafe, FAO).
 *
 * Motor raycaster propio en Canvas 2D (sin librerias 3D). Solo este repo.
 *
 * i18n: juego servido solo en es-CO. Regla chagra-i18n es soft (warn),
 * aqui se desactiva por archivo completo.
 */

/**
 * Mapa del invernadero / cultivo (grid 16x16).
 * 0 = vacio (piso de tierra)
 * 1 = pared (plastico/cana del invernadero o cama elevada)
 *
 * Diseno: 4 camas de cultivo internas que forman pasillos, simulando
 * un recorrido por un invernadero real de la finca Chagra.
 */
export const MAPA = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const MAPA_FILAS = MAPA.length;
export const MAPA_COLS = MAPA[0].length;

/**
 * Plagas que aparecen en el nivel Doom.
 * Cada una tiene su par benefico que la controla (agronomicamente real).
 */
export const PLAGAS_DOOM = [
  {
    id: 'cogollero',
    nombre: 'Gusano cogollero',
    cientifico: 'Spodoptera frugiperda',
    emoji: '🐛',
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
 * (cada celda del mapa = 1.0 unidad, centradas en la celda).
 */
export const SPAWNS_PLAGAS = [
  { tipo: 'cogollero', x: 4.5, y: 4.5 },
  { tipo: 'moscablanca', x: 11.5, y: 4.5 },
  { tipo: 'afido', x: 4.5, y: 10.5 },
  { tipo: 'broca', x: 11.5, y: 10.5 },
  { tipo: 'cogollero', x: 7.5, y: 7.5 },
  { tipo: 'moscablanca', x: 1.5, y: 7.5 },
  { tipo: 'afido', x: 13.5, y: 7.5 },
  { tipo: 'broca', x: 7.5, y: 1.5 },
];

/**
 * Paleta de colores del invernadero (calida, cultivo andino).
 */
export const PALETA = {
  cielo: ['#87CEEB', '#e0f0c8'],           // gradiente cielo diurno
  piso: '#6b4c2a',                          // tierra marron
  pisoOscuro: '#3d2b14',                    // tierra en la distancia
  paredNorte: '#b8c9a8',                    // plastico iluminado (N)
  paredSur: '#8a9e78',                      // plastico sombra (S)
  paredEste: '#a0b890',                     // plastico medio (E)
  paredOeste: '#9ab888',                    // plastico medio (O)
  techo: '#d4e8c8',                         // plastico superior
  cana: '#8b6914',                          // estructura cana/guadua
  plantula: '#4a8c3f',                      // verde plantula
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
  nieblaInicio: 5.0,        // distancia donde empieza la niebla
  nieblaFin: 12.0,          // distancia donde la niebla es total
  velMovimiento: 0.04,       // velocidad de movimiento
  velRotacion: 0.04,         // velocidad de rotacion (rad/frame)
  velRotacionTouch: 0.005,   // sensibilidad rotacion touch
};
