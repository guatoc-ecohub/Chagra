/**
 * defensoresFincaData — datos curados para el minijuego "Defensores de la Finca".
 *
 * GANCHO PEDAGÓGICO: cada plaga se empareja con el organismo benéfico que
 * REALMENTE la controla en campo (relación CONTROLS del grafo agroecológico de
 * Chagra). El jugador invoca un benéfico y este elimina EXACTAMENTE la plaga que
 * de verdad controla — enseña control biológico real, no fabricado.
 *
 * DIDÁCTICA (para que un niño y un campesino lo entiendan):
 *   - Cada PLAGA dice su nombre común + científico, QUÉ CULTIVOS ataca y QUÉ
 *     DAÑO les hace, en una línea clara (tú/usted colombiano).
 *   - Cada CURA (benéfico) explica CÓMO controla a esa plaga: el "porqué" del
 *     control biológico, no solo que la mata.
 *   - El campo `fuente` es honesto sobre de dónde sale la relación:
 *       'grafo'    → relación CONTROLS verificada en el grafo AGE de Chagra
 *                    (public/grafo-relations.json, pest_controllers).
 *       'cenicafe' → control biológico del café documentado por Cenicafé
 *                    Colombia (par no incluido en el subset OSS del grafo).
 *       'ica-ciat' → control biológico del maíz documentado por ICA / CIAT /
 *                    EMBRAPA (par clásico no incluido en el subset del grafo).
 *       'ecologia' → depredación natural real pero GENÉRICA (no es una receta
 *                    MIP dirigida); se rotula como "depredador general" para no
 *                    enseñar una recomendación que no existe como tal.
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
 * @property {string[]} plaga.cultivos Cultivos que ataca (nombre claro).
 * @property {string} plaga.dano     Qué le hace al cultivo (1 línea clara).
 * @property {Object} benefico       El "bicho bueno" que la controla.
 * @property {string} benefico.id
 * @property {string} benefico.nombre
 * @property {string} benefico.cientifico
 * @property {string} benefico.emoji
 * @property {string} benefico.como  Cómo controla la plaga (1 línea: el porqué).
 * @property {string} leccion        Mensaje pedagógico al limpiar la plaga.
 * @property {'grafo'|'cenicafe'|'ica-ciat'|'ecologia'} fuente Origen de la
 *           relación plaga↔cura (ver cabecera del archivo).
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
      cultivos: ['Frijol', 'Tomate', 'Hortalizas'],
      dano: 'Chupa la savia de los brotes; la hoja tierna se enrolla y se pone pegajosa.',
    },
    benefico: {
      id: 'catarina',
      nombre: 'Mariquita',
      cientifico: 'Coccinellidae',
      emoji: '🐞',
      como: 'La mariquita y sus larvas se comen colonias enteras de pulgón, hasta decenas al día.',
    },
    leccion: 'Para el pulgón, suelta mariquitas: se los comen vivos. Eso es control biológico, no veneno.',
    fuente: 'grafo',
  },
  {
    id: 'moscablanca-crisopa',
    plaga: {
      id: 'moscablanca',
      nombre: 'Mosca blanca',
      cientifico: 'Bemisia tabaci',
      emoji: '🪰',
      cultivos: ['Tomate', 'Frijol', 'Ahuyama'],
      dano: 'Chupa savia por debajo de la hoja y transmite virus que la enrollan y amarillan.',
    },
    benefico: {
      id: 'crisopa',
      nombre: 'Crisopa',
      cientifico: 'Chrysoperla',
      emoji: '🦗',
      como: 'La larva de crisopa ("león de los áfidos") atrapa mosca blanca y pulgones con sus mandíbulas curvas.',
    },
    leccion: 'Para la mosca blanca, suelta crisopas: su larva caza los bichos que chupan la hoja.',
    fuente: 'grafo',
  },
  {
    id: 'cogollero-trichogramma',
    plaga: {
      id: 'cogollero',
      nombre: 'Gusano cogollero',
      cientifico: 'Spodoptera frugiperda',
      emoji: '🐛',
      cultivos: ['Maíz'],
      dano: 'Se mete en el cogollo del maíz, se come el centro tierno y deja la hoja con huecos.',
    },
    benefico: {
      id: 'trichogramma',
      nombre: 'Avispita Trichogramma',
      cientifico: 'Trichogramma',
      emoji: '🐝',
      como: 'Pone su huevo DENTRO del huevo del gusano: la larva nunca nace, así no hay quién coma el cogollo.',
    },
    leccion: 'Suelta la avispita Trichogramma cuando veas las posturas: ataca el huevo del cogollero antes de que nazca.',
    fuente: 'grafo',
  },
  {
    id: 'trips-amblyseius',
    plaga: {
      id: 'trips',
      nombre: 'Trips',
      cientifico: 'Thysanoptera',
      emoji: '🦠',
      cultivos: ['Cebolla', 'Tomate', 'Hortalizas'],
      dano: 'Raspa la hoja y la flor para chupar; deja manchas plateadas y puntos negros.',
    },
    benefico: {
      id: 'amblyseius',
      nombre: 'Ácaro Amblyseius',
      cientifico: 'Amblyseius',
      emoji: '🕷️',
      como: 'Es un ácaro bueno que se come a los trips chiquitos antes de que se vuelvan plaga.',
    },
    leccion: 'Para los trips, suelta el ácaro bueno Amblyseius: caza los trips jóvenes sin un solo veneno.',
    fuente: 'grafo',
  },
  {
    id: 'acaro-phytoseiulus',
    plaga: {
      id: 'acaro',
      nombre: 'Ácaro rojo (araña roja)',
      cientifico: 'Tetranychus urticae',
      emoji: '🔴',
      cultivos: ['Tomate', 'Frijol', 'Mora', 'Fresa'],
      dano: 'Pica el envés de la hoja, la puntea y la seca; teje telarañas finas en los bordes.',
    },
    benefico: {
      id: 'phytoseiulus',
      nombre: 'Ácaro depredador',
      cientifico: 'Phytoseiulus persimilis',
      emoji: '🕷️',
      como: 'Es un ácaro cazador que persigue y se come a la araña roja plaga, huevo por huevo.',
    },
    leccion: 'Para la araña roja, suelta el ácaro depredador: un ácaro bueno se come al ácaro malo.',
    fuente: 'grafo',
  },
  {
    id: 'afido-sirfido',
    plaga: {
      id: 'afido',
      nombre: 'Áfido del frijol',
      cientifico: 'Aphis fabae',
      emoji: '🦟',
      cultivos: ['Frijol'],
      dano: 'Forma colonias pegajosas en los brotes, chupa savia y debilita la mata de frijol.',
    },
    benefico: {
      id: 'sirfido',
      nombre: 'Mosca de las flores (sírfido)',
      cientifico: 'Syrphidae',
      emoji: '🪰',
      como: 'Su larva se come los áfidos uno a uno; el adulto, además, poliniza las flores.',
    },
    leccion: 'El sírfido es doble ayuda: la cría se come los áfidos y el adulto poliniza tu cultivo.',
    fuente: 'grafo',
  },
  {
    id: 'saltamontes-mantis',
    plaga: {
      id: 'saltamontes',
      nombre: 'Saltamontes',
      cientifico: 'Caelifera',
      emoji: '🦗',
      cultivos: ['Maíz', 'Hortalizas'],
      dano: 'Mastica las hojas y los brotes tiernos; en grupo deja la planta pelada.',
    },
    benefico: {
      id: 'mantis',
      nombre: 'Mantis religiosa',
      cientifico: 'Mantodea',
      emoji: '🦂',
      como: 'Es una cazadora general: atrapa al saltamontes con sus patas y se lo come.',
    },
    leccion: 'La mantis es una cazadora general que atrapa saltamontes; cuídala, no la mates: ayuda a tu finca.',
    fuente: 'ecologia',
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
      cultivos: ['Café'],
      dano: 'Es un escarabajito que perfora el grano de café por dentro y daña la calidad de la cosecha.',
    },
    benefico: {
      id: 'cephalonomia',
      nombre: 'Avispa Cephalonomia',
      cientifico: 'Cephalonomia stephanoderis',
      emoji: '🐝',
      como: 'Esta avispita entra al grano picado, parasita a la broca y corta su reproducción.',
    },
    leccion: 'Para la broca, la avispa Cephalonomia entra al grano y la ataca donde el veneno no llega.',
    fuente: 'cenicafe',
  },
  {
    id: 'minador-closterocerus',
    plaga: {
      id: 'minador',
      nombre: 'Minador de la hoja',
      cientifico: 'Leucoptera coffeella',
      emoji: '🐛',
      cultivos: ['Café'],
      dano: 'Su larva cava galerías cafés por dentro de la hoja del café; la hoja se seca y se cae.',
    },
    benefico: {
      id: 'closterocerus',
      nombre: 'Avispa Closterocerus',
      cientifico: 'Closterocerus coffeellae',
      emoji: '🐝',
      como: 'Es una avispita que busca la larva del minador dentro de la galería y la parasita.',
    },
    leccion: 'Para el minador del café, la avispa Closterocerus encuentra la larva en la hoja y la controla.',
    fuente: 'cenicafe',
  },
  {
    id: 'cochinilla-cryptolaemus',
    plaga: {
      id: 'cochinilla',
      nombre: 'Cochinilla harinosa',
      cientifico: 'Planococcus citri',
      emoji: '🐌',
      cultivos: ['Café', 'Frutales'],
      dano: 'Forma motas blancas pegajosas en ramas y raíces, chupa la savia y atrae hormigas.',
    },
    benefico: {
      id: 'cryptolaemus',
      nombre: 'Escarabajo come-cochinillas',
      cientifico: 'Cryptolaemus montrouzieri',
      emoji: '🐞',
      como: 'Este escarabajo y sus larvas (parecidas a la cochinilla) devoran las motas blancas.',
    },
    leccion: 'Para la cochinilla, el escarabajo Cryptolaemus se la come; le dicen "destructor de cochinillas".',
    fuente: 'grafo',
  },
  // ── Plagas y aliados del MAIZAL (nivel 4) ────────────────────────────────
  // Control biológico documentado por CIAT, EMBRAPA e ICA Colombia para el maíz.
  {
    id: 'chicharrita-doru',
    plaga: {
      id: 'chicharrita',
      nombre: 'Chicharrita del maíz',
      cientifico: 'Dalbulus maidis',
      emoji: '🦗',
      cultivos: ['Maíz'],
      dano: 'Chupa la savia y le pega al maíz el achaparramiento, una enfermedad que enana la planta.',
    },
    benefico: {
      id: 'doru',
      nombre: 'Tijereta',
      cientifico: 'Doru luteipes',
      emoji: '🪲',
      como: 'La tijereta patrulla el cogollo de noche y devora chicharritas y huevos de otras plagas.',
    },
    leccion: 'La tijereta Doru es la guardiana nocturna del maizal: come chicharritas mientras usted duerme.',
    fuente: 'ica-ciat',
  },
  {
    id: 'elotero-telenomus',
    plaga: {
      id: 'elotero',
      nombre: 'Gusano elotero (de la mazorca)',
      cientifico: 'Helicoverpa zea',
      emoji: '🐛',
      cultivos: ['Maíz'],
      dano: 'Entra por la punta de la mazorca y se come los granos tiernos en formación.',
    },
    benefico: {
      id: 'telenomus',
      nombre: 'Avispita Telenomus',
      cientifico: 'Telenomus remus',
      emoji: '🐝',
      como: 'Pone su huevo dentro del huevo del elotero: el gusano no alcanza a nacer ni a entrar a la mazorca.',
    },
    leccion: 'Para el elotero, la avispita Telenomus ataca el huevo: sin huevo no hay gusano en la mazorca.',
    fuente: 'ica-ciat',
  },
  {
    id: 'barrenador-cotesia',
    plaga: {
      id: 'barrenador',
      nombre: 'Barrenador del tallo',
      cientifico: 'Diatraea saccharalis',
      emoji: '🐛',
      cultivos: ['Maíz'],
      dano: 'Hace túneles por dentro del tallo del maíz; la planta se debilita y se quiebra con el viento.',
    },
    benefico: {
      id: 'cotesia',
      nombre: 'Avispita Cotesia',
      cientifico: 'Cotesia flavipes',
      emoji: '🐝',
      como: 'Rastrea la larva del barrenador dentro del tallo y la parasita en su propio túnel.',
    },
    leccion: 'Para el barrenador, la avispa Cotesia lo persigue dentro del tallo, donde nada más lo alcanza.',
    fuente: 'ica-ciat',
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
/**
 * Nivel 4 — el maizal al atardecer (clima cálido, tierra plana y extensa).
 *
 * El nivel más grande de todos: una milpa (maizal con frijol y ahuyama) al
 * atardecer, cuando las plagas del maíz salen con más hambre. El mundo es más
 * ancho que todos los anteriores (cámara que recorre una finca maicera enorme),
 * hay más cultivos que recoger y aparecen TODAS las plagas de los niveles
 * anteriores más tres plagas propias del cultivo del maíz (chicharrita, gusano
 * elotero y barrenador del tallo) con sus aliados reales documentados por CIAT,
 * EMBRAPA e ICA Colombia. Más plataformas, más huecos y un mini-jefe imponente:
 * el GUSANO COGOLLERO GIGANTE, que solo cae con su controlador real (la avispita
 * Trichogramma) y aguanta todavía más golpes que la broca del cafetal.
 * Dificultad máxima y cierre épico del viaje por la finca.
 */
export const NIVEL_4 = Object.freeze({
  id: 'nivel-4',
  numero: 4,
  nombre: 'El maizal al atardecer',
  subtitulo: 'Cae la tarde en la milpa. Las plagas del maíz salen con todo, pero sus enemigos naturales también.',
  energiaInicial: 6,
  energiaMax: 6,
  metaCultivos: 18,
  mundoAncho: 3360,
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
    'chicharrita-doru',
    'elotero-telenomus',
    'barrenador-cotesia',
  ],
  escena: Object.freeze({
    id: 'maizal-atardecer',
    cieloTop: '#f7a460',
    cieloBottom: '#fce8c4',
    montana: '#4a7a3a',
    sueloTop: '#6e4a28',
    sueloBottom: '#2d1a0e',
    pasto: '#4a7a2f',
    astro: '#fff8e0',
    estrellas: true,
  }),
  // Camino ondulante entre los surcos del maizal (más plataformas que el 3).
  plataformas: Object.freeze([
    Object.freeze({ x: 300, y: 90, w: 130 }),
    Object.freeze({ x: 550, y: 160, w: 120 }),
    Object.freeze({ x: 800, y: 100, w: 140 }),
    Object.freeze({ x: 1050, y: 150, w: 120 }),
    Object.freeze({ x: 1300, y: 90, w: 140 }),
    Object.freeze({ x: 1550, y: 160, w: 120 }),
    Object.freeze({ x: 1800, y: 100, w: 140 }),
    Object.freeze({ x: 2050, y: 150, w: 120 }),
    Object.freeze({ x: 2300, y: 90, w: 140 }),
    Object.freeze({ x: 2550, y: 160, w: 120 }),
    Object.freeze({ x: 2850, y: 100, w: 140 }),
  ]),
  // Zanjas y canales de riego del maizal (más huecos que el nivel 3).
  huecos: Object.freeze([
    Object.freeze({ x: 480, w: 70 }),
    Object.freeze({ x: 980, w: 75 }),
    Object.freeze({ x: 1480, w: 80 }),
    Object.freeze({ x: 1980, w: 75 }),
    Object.freeze({ x: 2480, w: 70 }),
    Object.freeze({ x: 3030, w: 75 }),
  ]),
  // Mini-jefe: un gusano cogollero gigante al final del maizal. Solo la
  // avispita Trichogramma (su controlador real) lo derriba; aguanta 5 golpes.
  jefe: Object.freeze({
    plagaId: 'cogollero',
    emoji: '🐛',
    vida: 5,
  }),
});

export const NIVELES = Object.freeze([NIVEL_1, NIVEL_2, NIVEL_3, NIVEL_4]);

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
