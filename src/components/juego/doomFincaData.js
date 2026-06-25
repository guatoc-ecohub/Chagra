/**
 * doomFincaData - datos para el nivel Doom agroecologico primera persona.
 *
 * GANCHO PEDAGOGICO: el jugador recorre una finca andina real en primera
 * persona, IDENTIFICA plagas reales (nombre comun + cientifico visibles en
 * pantalla) y las controla soltando el organismo benefico o biopreparado
 * CORRECTO. Los pares plaga->controlador son agronomicamente reales y salen
 * del grafo de conocimiento de Chagra (Apache AGE, fuentes ICA / CIAT /
 * Cenicafe / FAO; ver public/grafo-relations.json, relacion pest_controllers).
 *
 * El escenario muestra el "kit completo" de la finca: setos vivos, corral de
 * animales, compostera, camas de cultivo, colmena, girasoles para
 * polinizadores; todo se puede mirar para leer su rol en el ciclo.
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
 * Diseno abierto: pocos obstaculos centrales para que el jugador vea las
 * plagas desde lejos (la queja #1 fue "no se distingue nada"). Las camas de
 * cultivo se arriman a los bordes; el centro queda despejado para combatir.
 */
export const MAPA = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 1],
  [1, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 1],
  [1, 0, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 1],
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
 * pedagogia. El jugador puede mirarlas para leer su rol en la finca.
 * Coordenadas en celdas del mundo (transitables).
 */
export const DECORACIONES = [
  { tipo: 'arbol', x: 2.5, y: 12.2, leccion: 'Arbol: da sombra, frena el viento y sus hojas alimentan la compostera.' },
  { tipo: 'arbol', x: 13.5, y: 1.6, leccion: 'Cerca viva: barrera natural que aloja aves y enemigos de las plagas.' },
  { tipo: 'colmena', x: 14.2, y: 5.5, leccion: 'Colmena: las abejas polinizan los cultivos y suben la cosecha.' },
  { tipo: 'girasol', x: 7.5, y: 11.4, leccion: 'Las flores (girasol) atraen abejas, avispas y crisopas beneficas.' },
  { tipo: 'girasol', x: 8.5, y: 11.4, leccion: 'Mas flores = mas polinizadores y mas control natural de plagas.' },
  { tipo: 'gallina', x: 2.6, y: 8.5, leccion: 'Las gallinas comen larvas y plagas; su gallinaza nutre el bocashi.' },
  { tipo: 'vaca', x: 13.5, y: 12.0, leccion: 'La vaca aporta bonita: base del biol y del supermagro para las plantas.' },
  { tipo: 'abono', x: 13.0, y: 10.5, leccion: 'Compostera: estiercol + hojas se vuelven abono que nutre el cultivo.' },
];

/**
 * BENEFICOS / biopreparados que el jugador puede equipar y soltar.
 * Cada uno tiene una "categoria" (tipo) para el render del frasco y una
 * explicacion del mecanismo (el POR QUE del control biologico).
 *
 * Nombres y mecanismos tomados del grafo (pest_controllers) + literatura
 * de control biologico aplicado en Colombia (ICA/CIAT/Cenicafe).
 */
export const BENEFICOS_DOOM = [
  {
    id: 'trichogramma',
    nombre: 'Avispita Trichogramma',
    cientifico: 'Trichogramma spp.',
    emoji: '🐝',
    color: '#f5c842',
    tipo: 'avispa',
    desc: 'Parasitoide de huevos.',
    mecanismo: 'La avispita pone su huevo DENTRO del huevo de la mariposa-polilla. La larva nunca nace: no hay gusano que coma el cultivo.',
  },
  {
    id: 'catarina',
    nombre: 'Mariquita',
    cientifico: 'Hippodamia convergens',
    emoji: '🐞',
    color: '#e74c3c',
    tipo: 'mariquita',
    desc: 'Depredador de pulgones.',
    mecanismo: 'Adultos y larvas de mariquita devoran colonias enteras de pulgones y cochinillas: hasta 50 al dia.',
  },
  {
    id: 'crisopa',
    nombre: 'Crisopa (leon de afidos)',
    cientifico: 'Chrysoperla externa',
    emoji: '🦗',
    color: '#7ed957',
    tipo: 'crisopa',
    desc: 'Depredador generalista.',
    mecanismo: 'La larva de crisopa, el "leon de afidos", chupa pulgones, huevos y acaros con sus mandibulas curvas.',
  },
  {
    id: 'beauveria',
    nombre: 'Beauveria bassiana',
    cientifico: 'Beauveria bassiana',
    emoji: '🍄',
    color: '#eef0e6',
    tipo: 'hongo',
    desc: 'Hongo entomopatogeno.',
    mecanismo: 'El hongo germina sobre el insecto, lo penetra y lo coloniza por dentro hasta secarlo. Estandar contra broca y mosca blanca.',
  },
  {
    id: 'bt',
    nombre: 'Bt (Bacillus thuringiensis)',
    cientifico: 'Bacillus thuringiensis',
    emoji: '🧫',
    color: '#9bd3ff',
    tipo: 'bacteria',
    desc: 'Bioinsecticida para orugas.',
    mecanismo: 'La oruga come la hoja con Bt; el cristal de la bacteria rompe su intestino y deja de comer en horas. No afecta abejas ni gente.',
  },
];

/**
 * PLAGAS del nivel. Cada una declara su par benefico CORRECTO (controladoPor)
 * y por que (`porQue`), tomado del grafo. `forma` define el sprite procedural.
 * `cultivo` ata la plaga a un cultivo real para el contexto.
 */
export const PLAGAS_DOOM = [
  {
    id: 'cogollero',
    nombre: 'Gusano cogollero',
    cientifico: 'Spodoptera frugiperda',
    emoji: '🐛',
    forma: 'oruga',
    color: '#8aa84a',
    cultivo: 'Maiz',
    dano: 'Devora el cogollo del maiz y deja la planta sin punto de crecimiento.',
    controladoPor: 'bt',
    porQue: 'Es una ORUGA que come hoja: el Bt la intoxica al primer bocado. Trichogramma tambien sirve atacando el HUEVO antes de que nazca.',
    velocidad: 0.014,
    vitalidad: 2,
  },
  {
    id: 'gusano_mazorca',
    nombre: 'Gusano de la mazorca',
    cientifico: 'Helicoverpa zea',
    emoji: '🐛',
    forma: 'oruga',
    color: '#c98a4a',
    cultivo: 'Maiz',
    dano: 'Se mete en la mazorca y se come los granos en formacion.',
    controladoPor: 'bt',
    porQue: 'Otra oruga masticadora: el Bt es el control biologico estandar. Tambien cae con chinche depredador (podisus) y crisopa.',
    velocidad: 0.013,
    vitalidad: 2,
  },
  {
    id: 'moscablanca',
    nombre: 'Mosca blanca',
    cientifico: 'Bemisia tabaci',
    emoji: '🪰',
    forma: 'mosca',
    color: '#f2f2f2',
    cultivo: 'Frijol / hortalizas',
    dano: 'Chupa savia y transmite virus que enrollan y amarillan la hoja.',
    controladoPor: 'beauveria',
    porQue: 'Insecto de cuerpo blando: el hongo Beauveria lo penetra y lo seca. Tambien la parasita la avispita Encarsia.',
    velocidad: 0.020,
    vitalidad: 1,
  },
  {
    id: 'broca',
    nombre: 'Broca del cafe',
    cientifico: 'Hypothenemus hampei',
    emoji: '🪲',
    forma: 'escarabajo',
    color: '#3a2410',
    cultivo: 'Cafe',
    dano: 'Perfora el grano de cafe y arruina la calidad de la cosecha.',
    controladoPor: 'beauveria',
    porQue: 'El escarabajo vive DENTRO del grano: solo un hongo entomopatogeno como Beauveria lo alcanza ahi. Estandar Cenicafe.',
    velocidad: 0.009,
    vitalidad: 3,
  },
  {
    id: 'afido',
    nombre: 'Pulgon / afido',
    cientifico: 'Aphis fabae',
    emoji: '🐜',
    forma: 'afido',
    color: '#4a7a2e',
    cultivo: 'Frijol',
    dano: 'Forma colonias pegajosas que chupan savia y debilitan los brotes.',
    controladoPor: 'catarina',
    porQue: 'La mariquita y su larva devoran colonias de pulgones a docenas. La crisopa tambien los caza.',
    velocidad: 0.011,
    vitalidad: 1,
  },
  {
    id: 'aranita',
    nombre: 'Arana roja',
    cientifico: 'Tetranychus urticae',
    emoji: '🕷️',
    forma: 'acaro',
    color: '#c0392b',
    cultivo: 'Mora / tomate',
    dano: 'Acaro que pica el enves de la hoja, la puntea y la seca.',
    controladoPor: 'crisopa',
    porQue: 'Acaro chupador diminuto: lo controlan depredadores como la crisopa y acaros benefcos (neoseiulus). El hongo Beauveria ayuda.',
    velocidad: 0.012,
    vitalidad: 1,
  },
];

/**
 * Definicion de los TRES escenarios (rondas) del juego. Cada uno tiene su
 * cultivo, las plagas que aparecen, una intro y los spawns. Suben en
 * dificultad. Cierran el ciclo: maiz -> cafe -> hortalizas.
 */
export const ESCENARIOS = [
  {
    id: 'maiz',
    nombre: 'La milpa (maiz)',
    cultivo: 'Maiz',
    icono: '🌽',
    intro: 'Tu maiz esta espigando. El gusano cogollero y el de la mazorca lo atacan. Sueltales el Bt (bioinsecticida para orugas).',
    plagas: ['cogollero', 'cogollero', 'gusano_mazorca'],
    spawns: [{ x: 8.5, y: 4.5 }, { x: 11.5, y: 7.5 }, { x: 6.5, y: 8.5 }],
    beneficosSugeridos: ['bt', 'trichogramma', 'crisopa'],
  },
  {
    id: 'cafe',
    nombre: 'El cafetal',
    cultivo: 'Cafe',
    icono: '☕',
    intro: 'Floracion del cafe. La broca perfora el grano y la mosca blanca chupa savia. Ambas caen con el hongo Beauveria bassiana.',
    plagas: ['broca', 'broca', 'moscablanca'],
    spawns: [{ x: 7.5, y: 4.5 }, { x: 10.5, y: 9.5 }, { x: 4.5, y: 9.5 }],
    beneficosSugeridos: ['beauveria', 'crisopa', 'trichogramma'],
  },
  {
    id: 'huerta',
    nombre: 'La huerta',
    cultivo: 'Frijol y mora',
    icono: '🫘',
    intro: 'Hortalizas y frutales. Pulgones, mosca blanca y arana roja debilitan las plantas. Usa mariquita, crisopa y Beauveria.',
    plagas: ['afido', 'aranita', 'moscablanca', 'afido'],
    spawns: [{ x: 6.5, y: 4.5 }, { x: 11.5, y: 5.5 }, { x: 9.5, y: 9.5 }, { x: 4.5, y: 7.5 }],
    beneficosSugeridos: ['catarina', 'crisopa', 'beauveria'],
  },
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
 * PIEL POR TEMA del raycaster (Fase 2 de temas, operador 2026-06-25).
 *
 * El cielo/cordillera/sol del Doom se PINTAN en canvas (no pueden leer CSS
 * vars). Para que el juego combine con el tema activo sin perder la jugabilidad
 * ni la LEGIBILIDAD (depth: cielo claro arriba → tierra oscura abajo, que es la
 * clave para leer profundidad en un raycaster), solo retiñimos el CIELO, la
 * cordillera y el sol — la tierra/surco/pasto/mulch (el piso jugable) NO se
 * tocan, para conservar el contraste suelo↔cielo que da sensación de espacio.
 *
 * biopunk (base) y verde-vivo comparten el cielo vivo original; nature lleva un
 * cielo crema-cálido y minimalista un cielo salvia-papel sobrio. Solo se aplica
 * con la flag VITE_FINCA_VIVA_HOME_PERFIL ON (lo decide el componente); con OFF
 * el juego usa PALETA tal cual (= EXACTO como hoy).
 */
export const PALETAS_TEMA = {
  biopunk: PALETA,
  'verde-vivo': {
    ...PALETA,
    cieloAlto: [86, 162, 150],   // turquesa-verde fresco (identidad finca viva)
    cieloBajo: [210, 232, 188],  // verde-crema frondoso
    montana: [96, 128, 110],     // cordillera verdosa
    montanaSombra: [70, 98, 82],
    sol: [255, 248, 214],
    solBrillo: [242, 180, 65],   // sol dorado de la identidad
  },
  nature: {
    ...PALETA,
    cieloAlto: [196, 158, 110],  // crema cálida (cenit)
    cieloBajo: [240, 226, 196],  // crema base del tema (horizonte)
    montana: [150, 128, 96],     // cordillera terrosa
    montanaSombra: [120, 100, 74],
    sol: [255, 244, 206],
    solBrillo: [217, 116, 42],   // ocre quemado del tema
  },
  minimalista: {
    ...PALETA,
    cieloAlto: [176, 192, 182],  // gris-salvia claro (cenit)
    cieloBajo: [232, 236, 228],  // papel del tema (horizonte)
    montana: [150, 162, 152],    // cordillera neutra
    montanaSombra: [120, 132, 122],
    sol: [244, 239, 216],
    solBrillo: [203, 185, 106],  // dorado apagado
  },
};

/**
 * Selecciona la paleta del Doom según el tema activo. Un id desconocido cae a
 * la PALETA base (biopunk) — comportamiento idéntico al de hoy.
 *
 * @param {string} tema biopunk | nature | minimalista | verde-vivo
 * @returns {object} la PALETA (posiblemente retiñida) para ese tema.
 */
export function paletaPorTema(tema) {
  return PALETAS_TEMA[tema] || PALETA;
}

/**
 * Tamano de celda del mapa (en unidades del mundo).
 */
export const CELDA = 1.0;

/**
 * Posicion inicial del jugador (x, y en coordenadas del mundo).
 *
 * FIX (operador, telefono real): antes era (2.5, 2.5), que cae DENTRO de una
 * cama de cultivo (celda solida [2][2]=5). El jugador nacia incrustado en una
 * pared y la colision lo dejaba clavado: no podia avanzar en ninguna direccion
 * (por eso "los controles no me permiten avanzar"). (4.5, 4.5) es una celda
 * transitable con espacio libre en las cuatro direcciones, mirando al campo.
 */
export const JUGADOR_INICIAL = {
  x: 4.5,
  y: 4.5,
  angulo: 0.5, // radianes, mirando hacia el centro del campo
};

/**
 * Configuracion del nivel.
 */
export const CONFIG_DOOM = {
  vitalidadInicial: 100,
  vitalidadMax: 100,
  danoPorPlaga: 9,           // vitalidad que quita una plaga al alcanzar (por tick)
  cooldownLanzamiento: 26,   // frames entre lanzamientos
  alcanceLanzamiento: 5.0,   // distancia maxima del benefico
  fov: Math.PI / 3,          // 60 grados campo de vision
  resX: 240,                 // columnas del raycaster (strips)
  resY: 180,                 // filas del canvas logico
  nieblaInicio: 8.0,         // distancia donde empieza la neblina de campo
  nieblaFin: 18.0,           // distancia donde la neblina es total
  velMovimiento: 0.045,      // velocidad de movimiento
  velRotacion: 0.045,        // velocidad de rotacion (rad/frame, teclado)
  velRotacionTouch: 0.006,   // sensibilidad rotacion touch
};
