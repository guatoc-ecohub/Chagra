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
];

/** Mapa rápido benéfico → plaga que controla (para la lógica del juego). */
export const BENEFICO_CONTROLA = Object.freeze(
  PARES_CONTROL.reduce((acc, par) => {
    acc[par.benefico.id] = par.plaga.id;
    return acc;
  }, {}),
);

/** Configuración base del nivel 1 (un nivel jugable y completable). */
export const NIVEL_1 = Object.freeze({
  id: 'nivel-1',
  nombre: 'La huerta',
  energiaInicial: 3,
  energiaMax: 3,
  /** Cuántos cultivos hay que recoger para completar el nivel. */
  metaCultivos: 6,
  /** Pares de control que aparecen en este nivel (subconjunto curado). */
  paresIds: ['pulgon-catarina', 'moscablanca-crisopa', 'cogollero-trichogramma', 'afido-sirfido'],
});
