/**
 * defensoresFincaData — datos curados para el minijuego "Defensores de la Finca".
 *
 * GANCHO PEDAGÓGICO: cada plaga se empareja con el organismo benéfico que
 * REALMENTE la controla en campo (relación CONTROLS del grafo agroecológico de
 * Chagra). El jugador invoca un benéfico y este elimina EXACTAMENTE la plaga que
 * de verdad controla — enseña control biológico real, no fabricado.
 *
 * Fuentes de las relaciones (control biológico clásico, ampliamente documentado
 * por ICA Colombia, CIAT, FAO, Cenicafé y la literatura de manejo integrado de
 * plagas): coccinélidos depredan áfidos; crisopas depredan mosca blanca y
 * áfidos; Trichogramma parasita huevos de lepidópteros (gusano cogollero);
 * sírfidos depredan áfidos; ácaros fitoseidos (Phytoseiulus, Amblyseius)
 * depredan ácaros plaga y trips; mantis depreda saltamontes.
 *
 * Todo offline: cero red en runtime. Sin nombres propios de personas (anti-leak).
 */

/**
 * CULTIVOS de la finca Chagra que el jugador recoge como puntos.
 * @typedef {{ id: string, nombre: string, emoji: string }} Cultivo
 * @type {Cultivo[]}
 */
export const CULTIVOS = [
  { id: 'maiz', nombre: 'Maíz', emoji: '🌽' },
  { id: 'frijol', nombre: 'Frijol', emoji: '🫘' },
  { id: 'tomate', nombre: 'Tomate', emoji: '🍅' },
  { id: 'ahuyama', nombre: 'Ahuyama', emoji: '🎃' },
  { id: 'platano', nombre: 'Plátano', emoji: '🍌' },
  { id: 'cafe', nombre: 'Café', emoji: '☕' },
];

/**
 * Pares plaga ↔ benéfico-controlador AGRONÓMICAMENTE CORRECTOS.
 * Cada benéfico (`controla`) elimina exactamente la plaga del mismo objeto.
 *
 * @typedef {Object} ParControl
 * @property {string} id              Identificador estable del par.
 * @property {Object} plaga          El "bicho malo".
 * @property {string} plaga.id
 * @property {string} plaga.nombre   Nombre común campesino.
 * @property {string} plaga.cientifico
 * @property {string} plaga.emoji
 * @property {string} plaga.dano     Qué le hace al cultivo (1 línea).
 * @property {Object} benefico       El "bicho bueno" que la controla.
 * @property {string} benefico.id
 * @property {string} benefico.nombre
 * @property {string} benefico.cientifico
 * @property {string} benefico.emoji
 * @property {string} benefico.como  Cómo controla la plaga (1 línea).
 * @property {string} leccion        Mensaje pedagógico al limpiar la plaga.
 */

/** @type {ParControl[]} */
export const PARES_CONTROL = [
  {
    id: 'pulgon-catarina',
    plaga: {
      id: 'pulgon',
      nombre: 'Pulgón',
      cientifico: 'Aphididae',
      emoji: '🦟',
      dano: 'Chupa la savia y enrolla las hojas tiernas.',
    },
    benefico: {
      id: 'catarina',
      nombre: 'Mariquita',
      cientifico: 'Coccinellidae',
      emoji: '🐞',
      como: 'La mariquita y sus larvas se comen cientos de pulgones.',
    },
    leccion: 'La mariquita controla el pulgón: es control biológico de verdad.',
  },
  {
    id: 'moscablanca-crisopa',
    plaga: {
      id: 'moscablanca',
      nombre: 'Mosca blanca',
      cientifico: 'Bemisia tabaci',
      emoji: '🪰',
      dano: 'Chupa savia y transmite virus al tomate.',
    },
    benefico: {
      id: 'crisopa',
      nombre: 'Crisopa',
      cientifico: 'Chrysoperla',
      emoji: '🦗',
      como: 'La larva de crisopa devora mosca blanca y áfidos.',
    },
    leccion: 'La crisopa (león de los áfidos) limpia la mosca blanca.',
  },
  {
    id: 'cogollero-trichogramma',
    plaga: {
      id: 'cogollero',
      nombre: 'Gusano cogollero',
      cientifico: 'Spodoptera frugiperda',
      emoji: '🐛',
      dano: 'Se come el cogollo del maíz y deja huecos.',
    },
    benefico: {
      id: 'trichogramma',
      nombre: 'Avispita Trichogramma',
      cientifico: 'Trichogramma',
      emoji: '🐝',
      como: 'Pone sus huevos dentro de los huevos del gusano y los anula.',
    },
    leccion: 'Trichogramma parasita los huevos del cogollero antes de que nazca.',
  },
  {
    id: 'trips-amblyseius',
    plaga: {
      id: 'trips',
      nombre: 'Trips',
      cientifico: 'Thysanoptera',
      emoji: '🦠',
      dano: 'Raspa las hojas y deja manchas plateadas.',
    },
    benefico: {
      id: 'amblyseius',
      nombre: 'Ácaro Amblyseius',
      cientifico: 'Amblyseius',
      emoji: '🕷️',
      como: 'Este ácaro benéfico depreda los trips jóvenes.',
    },
    leccion: 'El ácaro Amblyseius controla los trips sin venenos.',
  },
  {
    id: 'acaro-phytoseiulus',
    plaga: {
      id: 'acaro',
      nombre: 'Ácaro rojo',
      cientifico: 'Tetranychus urticae',
      emoji: '🔴',
      dano: 'Teje telarañas finas y amarillea las hojas.',
    },
    benefico: {
      id: 'phytoseiulus',
      nombre: 'Ácaro depredador',
      cientifico: 'Phytoseiulus persimilis',
      emoji: '🕷️',
      como: 'Caza y devora al ácaro rojo plaga.',
    },
    leccion: 'Phytoseiulus es un ácaro bueno que se come al ácaro rojo.',
  },
  {
    id: 'afido-sirfido',
    plaga: {
      id: 'afido',
      nombre: 'Áfido del frijol',
      cientifico: 'Aphis fabae',
      emoji: '🦟',
      dano: 'Forma colonias y debilita la planta de frijol.',
    },
    benefico: {
      id: 'sirfido',
      nombre: 'Mosca de las flores',
      cientifico: 'Syrphidae',
      emoji: '🪰',
      como: 'Su larva se come los áfidos; el adulto poliniza.',
    },
    leccion: 'La larva del sírfido devora áfidos y el adulto poliniza.',
  },
  {
    id: 'saltamontes-mantis',
    plaga: {
      id: 'saltamontes',
      nombre: 'Saltamontes',
      cientifico: 'Caelifera',
      emoji: '🦗',
      dano: 'Mastica hojas y brotes tiernos.',
    },
    benefico: {
      id: 'mantis',
      nombre: 'Mantis religiosa',
      cientifico: 'Mantodea',
      emoji: '🦂',
      como: 'La mantis caza y se come al saltamontes.',
    },
    leccion: 'La mantis religiosa es una cazadora que controla saltamontes.',
  },
  // ── Plagas y aliados del CAFETAL (nivel 3) ─────────────────────────────
  // Control biológico documentado por Cenicafé Colombia para el café.
  {
    id: 'broca-cephalonomia',
    plaga: {
      id: 'broca',
      nombre: 'Broca del café',
      cientifico: 'Hypothenemus hampei',
      emoji: '🪲',
      dano: 'Perfora el grano de café y arruina la cosecha.',
    },
    benefico: {
      id: 'cephalonomia',
      nombre: 'Avispa Cephalonomia',
      cientifico: 'Cephalonomia stephanoderis',
      emoji: '🐝',
      como: 'Esta avispita entra al grano y parasita a la broca.',
    },
    leccion: 'La avispa Cephalonomia controla la broca dentro del grano de café.',
  },
  {
    id: 'minador-closterocerus',
    plaga: {
      id: 'minador',
      nombre: 'Minador de la hoja',
      cientifico: 'Leucoptera coffeella',
      emoji: '🐛',
      dano: 'Hace galerías cafés en la hoja del café y la seca.',
    },
    benefico: {
      id: 'closterocerus',
      nombre: 'Avispa Closterocerus',
      cientifico: 'Closterocerus coffeellae',
      emoji: '🐝',
      como: 'Esta avispita parasita a la larva del minador en la hoja.',
    },
    leccion: 'La avispa Closterocerus controla el minador de la hoja del café.',
  },
  {
    id: 'cochinilla-cryptolaemus',
    plaga: {
      id: 'cochinilla',
      nombre: 'Cochinilla harinosa',
      cientifico: 'Planococcus citri',
      emoji: '🐌',
      dano: 'Forma motas blancas y chupa la savia de las ramas.',
    },
    benefico: {
      id: 'cryptolaemus',
      nombre: 'Escarabajo come-cochinillas',
      cientifico: 'Cryptolaemus montrouzieri',
      emoji: '🐞',
      como: 'Este escarabajo y sus larvas devoran las cochinillas.',
    },
    leccion: 'El escarabajo Cryptolaemus se come la cochinilla harinosa.',
  },
];

/** Mapa rápido benéfico → plaga que controla (para la lógica del juego). */
export const BENEFICO_CONTROLA = Object.freeze(
  PARES_CONTROL.reduce((acc, par) => {
    acc[par.benefico.id] = par.plaga.id;
    return acc;
  }, {}),
);

/**
 * Configuración de un nivel jugable.
 *
 * @typedef {Object} Nivel
 * @property {string} id
 * @property {number} numero            Orden del nivel (1, 2, ...).
 * @property {string} nombre
 * @property {string} subtitulo         Una línea de contexto para el jugador.
 * @property {number} energiaInicial
 * @property {number} energiaMax
 * @property {number} metaCultivos      Cuántos cultivos hay que recoger.
 * @property {number} mundoAncho        Ancho del mundo en px lógicos (cámara).
 * @property {string[]} paresIds        Pares de control que aparecen (curados).
 * @property {Object} escena            Paleta/escena de fondo (control del dibujo).
 * @property {string} escena.id
 * @property {string} escena.cieloTop
 * @property {string} escena.cieloBottom
 * @property {string} escena.montana
 * @property {string} escena.sueloTop
 * @property {string} escena.sueloBottom
 * @property {string} escena.pasto
 * @property {string} escena.astro      Color del sol/luna.
 * @property {boolean} [escena.estrellas]
 * @property {Array<{x:number,y:number,w:number}>} plataformas Plataformas extra.
 * @property {Array<{x:number,w:number}>} [huecos]            Vacíos del suelo (caer = daño).
 * @property {?Object} jefe             Mini-jefe del nivel (o null).
 * @property {string} jefe.plagaId      Plaga del jefe (debe existir en PARES_CONTROL).
 * @property {string} jefe.emoji
 * @property {number} jefe.vida         Golpes de benéfico correcto para vencerlo.
 */

/** Nivel 1 — la huerta a mediodía. Corto, plano, 4 pares. */
export const NIVEL_1 = Object.freeze({
  id: 'nivel-1',
  numero: 1,
  nombre: 'La huerta',
  subtitulo: 'Mediodía en la huerta. Recoge y cuida con bichos buenos.',
  energiaInicial: 3,
  energiaMax: 3,
  metaCultivos: 6,
  mundoAncho: 720,
  paresIds: ['pulgon-catarina', 'moscablanca-crisopa', 'cogollero-trichogramma', 'afido-sirfido'],
  escena: Object.freeze({
    id: 'mediodia',
    cieloTop: '#9fd6f2',
    cieloBottom: '#e8f7c8',
    montana: '#86b96a',
    sueloTop: '#8a5a32',
    sueloBottom: '#3f2d20',
    pasto: '#6f8f32',
    astro: '#fde68a',
  }),
  plataformas: [],
  huecos: [],
  jefe: null,
});

/**
 * Nivel 2 — atardecer en la finca de ladera (otro piso térmico).
 * Más largo (mundo con cámara que sigue al jugador), más pares (7), más
 * plataformas a distinto nivel, huecos que hacen daño al caer, más cultivos y
 * un mini-jefe final (langosta) que solo cae con su controlador real (la
 * mantis). Dificultad progresiva: más plagas y terreno con altura.
 */
export const NIVEL_2 = Object.freeze({
  id: 'nivel-2',
  numero: 2,
  nombre: 'La ladera al atardecer',
  subtitulo: 'Cae la tarde en la ladera. El terreno sube y hay más bichos.',
  energiaInicial: 4,
  energiaMax: 4,
  metaCultivos: 10,
  mundoAncho: 1680,
  paresIds: [
    'pulgon-catarina',
    'moscablanca-crisopa',
    'cogollero-trichogramma',
    'afido-sirfido',
    'trips-amblyseius',
    'acaro-phytoseiulus',
    'saltamontes-mantis',
  ],
  escena: Object.freeze({
    id: 'atardecer',
    cieloTop: '#f5a05b',
    cieloBottom: '#fcd9a0',
    montana: '#6b4a7a',
    sueloTop: '#6e4326',
    sueloBottom: '#2a1a12',
    pasto: '#557a2c',
    astro: '#fff1c2',
    estrellas: true,
  }),
  // Plataformas a distinta altura (x en coords del mundo; y = offset SOBRE el
  // suelo, en px; el motor las ancla a groundY). Forman un camino que sube.
  plataformas: Object.freeze([
    Object.freeze({ x: 360, y: 86, w: 120 }),
    Object.freeze({ x: 560, y: 150, w: 120 }),
    Object.freeze({ x: 820, y: 96, w: 140 }),
    Object.freeze({ x: 1080, y: 150, w: 120 }),
    Object.freeze({ x: 1300, y: 92, w: 140 }),
  ]),
  // Huecos en el suelo: si el jugador cae dentro, recibe daño (obstáculo).
  huecos: Object.freeze([
    Object.freeze({ x: 700, w: 70 }),
    Object.freeze({ x: 1220, w: 70 }),
  ]),
  // Mini-jefe: una langosta grande al final. Solo la mantis (su controlador
  // real) la derriba; necesita varios golpes (vida).
  jefe: Object.freeze({
    plagaId: 'saltamontes',
    emoji: '🦗',
    vida: 3,
  }),
});

/**
 * Nivel 3 — el cafetal al amanecer (clima medio, montaña cafetera).
 *
 * El nivel más largo y exigente: un cafetal entre la niebla de la mañana. El
 * mundo es más ancho que el del nivel 2 (cámara que recorre más finca), hay más
 * cultivos que recoger (incluido el café), aparecen TODAS las plagas — las de la
 * huerta y la ladera más tres plagas propias del café (broca, minador de la hoja
 * y cochinilla harinosa) con sus aliados reales documentados por Cenicafé — y
 * más plataformas y huecos. El cierre es un mini-jefe grande: la BROCA del café,
 * que solo cae con su controlador real (la avispa Cephalonomia) y aguanta más
 * golpes que la langosta del nivel 2. Dificultad creciente y cierre satisfactorio.
 */
export const NIVEL_3 = Object.freeze({
  id: 'nivel-3',
  numero: 3,
  nombre: 'El cafetal en la niebla',
  subtitulo: 'Amanece en el cafetal. Es largo y hay plagas del café por todas partes.',
  energiaInicial: 5,
  energiaMax: 5,
  metaCultivos: 14,
  mundoAncho: 2520,
  paresIds: [
    'pulgon-catarina',
    'moscablanca-crisopa',
    'cogollero-trichogramma',
    'afido-sirfido',
    'trips-amblyseius',
    'acaro-phytoseiulus',
    'saltamontes-mantis',
    'broca-cephalonomia',
    'minador-closterocerus',
    'cochinilla-cryptolaemus',
  ],
  escena: Object.freeze({
    id: 'cafetal-amanecer',
    cieloTop: '#cdeaf0',
    cieloBottom: '#f3efe0',
    montana: '#4f7a52',
    sueloTop: '#5a3a22',
    sueloBottom: '#241510',
    pasto: '#3f6b2a',
    astro: '#fff6d6',
  }),
  // Camino que sube y baja por la ladera del cafetal (más plataformas que el 2).
  plataformas: Object.freeze([
    Object.freeze({ x: 340, y: 90, w: 130 }),
    Object.freeze({ x: 560, y: 150, w: 120 }),
    Object.freeze({ x: 820, y: 100, w: 140 }),
    Object.freeze({ x: 1080, y: 160, w: 120 }),
    Object.freeze({ x: 1320, y: 100, w: 140 }),
    Object.freeze({ x: 1580, y: 150, w: 120 }),
    Object.freeze({ x: 1840, y: 96, w: 140 }),
    Object.freeze({ x: 2100, y: 150, w: 120 }),
  ]),
  // Más huecos (zanjas del cafetal) repartidos a lo largo del mundo.
  huecos: Object.freeze([
    Object.freeze({ x: 700, w: 70 }),
    Object.freeze({ x: 1240, w: 75 }),
    Object.freeze({ x: 1760, w: 75 }),
    Object.freeze({ x: 2260, w: 70 }),
  ]),
  // Mini-jefe: una broca gigante al final del cafetal. Solo la avispa
  // Cephalonomia (su controlador real) la derriba; aguanta más golpes (vida 4).
  jefe: Object.freeze({
    plagaId: 'broca',
    emoji: '🪲',
    vida: 4,
  }),
});

/** Todos los niveles en orden de juego. */
export const NIVELES = Object.freeze([NIVEL_1, NIVEL_2, NIVEL_3]);

/** Busca un nivel por su número (1-indexado). Devuelve NIVEL_1 si no existe. */
export function getNivel(numero) {
  return NIVELES.find((n) => n.numero === numero) || NIVEL_1;
}

/** Clave de localStorage donde se guarda el progreso (niveles superados). */
export const PROGRESO_KEY = 'chagra:defensores-finca:progreso';

/**
 * ¿Está desbloqueado el nivel `numero`? El 1 siempre; los demás solo si el
 * nivel anterior está en la lista de superados (lógica pura, sin localStorage).
 *
 * @param {number} numero          número del nivel a consultar.
 * @param {number[]} superados     números de nivel ya completados.
 * @returns {boolean}
 */
export function nivelDesbloqueado(numero, superados = []) {
  if (numero <= 1) return true;
  return superados.includes(numero - 1);
}
