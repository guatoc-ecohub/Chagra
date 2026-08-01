/**
 * grafoPaleta.js — la BIBLIA VISUAL del navegador del grafo.
 *
 * Aquí vive el significado del color y de la forma. Ningún otro archivo del
 * navegador decide "de qué color va esto": lo pregunta aquí. Si mañana el
 * páramo cambia de verde, cambia en un solo lugar.
 *
 * LAS DOS REGLAS QUE SOSTIENEN TODO EL DIBUJO
 * ───────────────────────────────────────────
 *  1. LA FORMA DICE QUÉ ES.   (redondo = mata · pico = plaga · vasija =
 *     biopreparado · anillo = controlador)
 *  2. EL COLOR DICE DÓNDE VIVE. (para las matas: el color ES la altura — verde
 *     selva abajo, verde claro en el frío, plata en el páramo, hueso en la nieve)
 *
 * Esa separación es lo que hace legible el grafo de un vistazo sin leer una
 * sola etiqueta: usted ve una montaña que va de verde a nieve, y ve picos rojos
 * donde hay plagas. Los nodos que NO son matas no tienen altura propia (una
 * plaga no vive a 2.400 m: vive donde vive su hospedero), así que esos sí llevan
 * color fijo de tipo — la regla 2 no aplica y no se finge que aplique.
 *
 * Nunca decimos algo SOLO con color (daltonismo + sol del mediodía en pantalla
 * barata): el tipo va en la forma, la dirección de una relación va en el
 * degradado, y el antagonismo va además punteado. El color siempre es el
 * segundo canal, jamás el único.
 *
 * Toda la paleta sale de los módulos ya aprobados (`artesaniaAndina.js` =
 * tintes de fibra, `atmosferaMadre.js` = la ley de materiales y la hora
 * dorada). No se inventa un solo hex nuevo: se MEZCLAN los que ya existen.
 * Por eso esto se ve Chagra y no un dashboard de tech genérico.
 */

import { PALETA_ANDINA } from '../artesaniaAndina.js';
import { ATMOSFERA, PALETA, mezclar } from '../atmosferaMadre.js';

/* Los tres tonos de los ACTORES. Van fuera de la rampa verde de la montaña a
   propósito: así ninguno compite con ella ni se confunde entre sí (el par más
   parecido de todo el mapa queda a 0,13 de distancia RGB — medido).

   · plaga  — cochinilla, el rojo ANIMAL del tinte andino, subido hacia el maíz
              hasta despegar del fondo (3,50:1). No es el rojo de catástrofe de
              un dashboard: es el color con el que aquí se tiñe desde siempre.
   · aliado — maíz. Luminoso, amable. El que se come la plaga.
   · remedio— `PALETA.agua`, que es el ÚNICO azul con permiso en el mundo 3D
              (ley de `atmosferaMadre`), aclarado para levantarlo del fondo. Cae
              redondo: el biopreparado es un caldo, o sea agua. */
const TINTE_PLAGA = mezclar(PALETA_ANDINA.cochinilla, PALETA_ANDINA.maiz, 0.32);
const TINTE_ALIADO = PALETA_ANDINA.maiz;
const TINTE_REMEDIO = mezclar(PALETA.agua, PALETA_ANDINA.hueso, 0.12);

/* ── LA MONTAÑA: color por piso térmico ────────────────────────────────────
   Esta rampa se rehízo entera después de MEDIRLA, y el porqué vale la pena:

   El primer intento fue el obvio —«arriba hace frío, abajo hace calor», o sea
   barro naranja abajo y nieve arriba— y estaba mal por dos razones. Una: es la
   convención de un mapa térmico de meteorólogo, no lo que uno VE; una montaña
   colombiana desde lejos va de verde selva abajo a plata y nieve arriba. Dos, y
   peor: esa rampa se comía los tonos cálidos, y entonces la plaga (roja) quedaba
   del mismo color que las matas de tierra caliente. El color estaba haciendo dos
   trabajos a la vez y no hacía bien ninguno.

   La rampa de ahora es SECUENCIAL POR LUZ: sube parejo de verde oscuro a hueso
   (L = .21 → .28 → .45 → .55 → .63 → .87, medido). Eso significa que se lee la
   altura aunque usted no distinga colores, aunque la pantalla esté al sol, y
   aunque la foto salga en blanco y negro — la luz sola ya cuenta la historia. Y
   como la montaña se quedó con los verdes y los blancos, los tonos cálidos y el
   azul quedaron LIBRES para los actores (plaga, aliado, remedio), que así no
   compiten con ella. Nada aquí baja de 3:1 contra el fondo (lo peor: 3,50).

   El verde sale de `PALETA.follaje*` (la ley de materiales 3D) y el plateado y
   la nieve de los tintes de fibra: la misma montaña que ya pinta el proyecto. */
export const TINTE_PISO = {
  // 0–1000 m · bosque húmedo tropical: el verde más oscuro y cargado
  calido: PALETA.follaje,
  // 1000–2000 m · premontano: el verde abre
  templado: PALETA.follajeClaro,
  // 2000–3000 m · EL CORAZÓN de la chagra (papa, ulluco, oca, mashua)
  frio: mezclar(PALETA.follajeClaro, PALETA_ANDINA.hueso, 0.3),
  // 3000–4000 m · el verde se platea: frailejón lanudo, pajonal, escarcha
  paramo: mezclar(PALETA_ANDINA.paramo, PALETA_ANDINA.hueso, 0.55),
  // 4000–4700 m · líquenes y cojines: casi piedra, vida al límite
  superparamo: mezclar(PALETA_ANDINA.anil, PALETA_ANDINA.hueso, 0.7),
  // 4700+ m · hueso: glaciar en retroceso. Aquí no se siembra.
  nival: PALETA_ANDINA.hueso,
  /* Sin altura declarada: gris CÁLIDO (nunca neutro — ley de `atmosferaMadre`),
     fuera de la rampa verde a propósito. No es un piso; es un hueco del dato. */
  sin_piso: mezclar(PALETA_ANDINA.crudo, PALETA_ANDINA.tinta, 0.58),
};

/** El aro del piso: el mismo tinte, enterrado. Lo justo para que se vea la
 *  orilla sin que el aro le pelee protagonismo a las matas que sostiene. */
export const BANDA_PISO = Object.fromEntries(
  Object.entries(TINTE_PISO).map(([id, c]) => [id, mezclar(c, PALETA_ANDINA.tinta, 0.3)]),
);

/* Orden canónico de abajo hacia arriba. `sin_piso` va aparte (ver abajo): no es
   una altura, es la ausencia de una — se dibuja como niebla al pie, no como un
   séptimo piso, porque mentir un orden altitudinal sobre datos que no lo
   declaran sería fabricar conocimiento. */
export const PISOS_ORDEN = ['calido', 'templado', 'frio', 'paramo', 'superparamo', 'nival'];

/* ── LOS CUATRO HABITANTES: forma por tipo de nodo ─────────────────────────
   Cuatro siluetas que se distinguen en 40 px y con el pulgar encima. La forma
   no es un icono pegado: es geometría revolucionada o poliedro, coherente con
   el low-poly facetado del resto del mundo 3D.

   `geo`     — cómo se talla (lo resuelve NodosGrafo.jsx; aquí solo el nombre)
   `radio`   — tamaño base en unidades de mundo
   `color`   — color FIJO del tipo, o null si el color lo manda el piso (matas)
   `etiqueta`/`plural` — cómo se llama en voz de usted, para la carta y la leyenda */
export const TIPOS_NODO = {
  especie: {
    geo: 'mata',
    // Icosaedro facetado: redondo = vivo, amable, se puede tocar. Es lo único
    // que crece, así que es lo único redondo del mapa.
    radio: 0.19,
    color: null, // ← el color lo pone el piso: la mata ES su altura
    etiqueta: 'mata',
    plural: 'matas',
    nota: 'Lo que se siembra. El color le dice a qué altura vive.',
  },
  plaga: {
    geo: 'plaga',
    // Octaedro puntudo: el pico ES la advertencia. Ángulo = amenaza, aun sin
    // color. Rojo cochinilla (rojo ANIMAL, tinte de la tierra, no rojo de
    // catástrofe de dashboard).
    radio: 0.16,
    color: TINTE_PLAGA,
    etiqueta: 'plaga',
    plural: 'plagas',
    nota: 'Lo que ataca. Apunta a las matas que enferma.',
  },
  biopreparado: {
    geo: 'vasija',
    // La vasija de `artesaniaAndina.js`, la MISMA silueta que ya se aprobó:
    // base ancha, hombro en el tercio áureo, cuello que cierra. El remedio es
    // literalmente la olla donde se prepara. Color de agua: es un caldo.
    radio: 0.17,
    color: TINTE_REMEDIO,
    etiqueta: 'biopreparado',
    plural: 'biopreparados',
    nota: 'El remedio que usted mismo prepara. Va hacia la mata que cuida.',
  },
  controlador: {
    geo: 'anillo',
    // Un anillo: el aliado que RODEA y contiene. Amarillo maíz = luminoso,
    // aliado, nunca alarma. Es lo único que apunta contra una plaga.
    radio: 0.14,
    color: TINTE_ALIADO,
    etiqueta: 'controlador',
    plural: 'controladores',
    nota: 'El aliado vivo que se come la plaga. Apunta contra ella.',
  },
};

export const TIPOS_ORDEN = ['especie', 'plaga', 'biopreparado', 'controlador'];

/* ── LAS RELACIONES CUENTAN UNA HISTORIA ───────────────────────────────────
   Cada arista tiene un CARÁCTER de trazo, y el carácter es el significado:

   · compatible   — la milpa (maíz-frijol-calabaza). CUERDA DE FIQUE: gruesa,
                    trenzada, de color plano de punta a punta, y combada hacia el
                    cerro: se abrazan. Sin dirección porque no la tiene — se
                    sostienen mutuamente.
   · antagonista  — se estorban. Rojo, PUNTEADA (el trazo se rompe: no se
                    tocan) y la curva se ARQUEA HACIA AFUERA, repeliéndose.
   · plaga_de     — el ataque. Va de la plaga a la mata, en DEGRADADO (nace rojo
                    y muere en el color de la mata): el degradado ES la flecha.
                    Cuelga hacia abajo — el ataque pesa.
   · controlador_de — la ayuda. Del aliado a la plaga, degradado amarillo→rojo,
                    y la curva SUBE: la ayuda levanta. Es la contra-flecha
                    exacta de plaga_de, y por eso se lee la cadena completa:
                    aliado → plaga → mata.
   · biopreparado_de — el cuidado. De la vasija a la mata, añil, fina y punteada
                    suave: es una intervención humana, no una fuerza de la
                    naturaleza, y por eso su trazo es más discreto.

   `dir: true` → se dibuja con degradado (tiene emisor y receptor).
   `arco`      → cuánto y hacia dónde se comba la curva (+ sube, − cuelga).
   `hacia`     → 'centro' abraza, 'afuera' repele, 'cero' recta.
   `grosor`    → en píxeles de pantalla (LineMaterial), no en unidades de mundo:
                 el trazo rubber-hose conserva su peso al alejarse la cámara. */
export const TIPOS_ARISTA = {
  compatible: {
    /* CUERDA DE FIQUE CRUDO, y esto se decidió midiendo. Primero fue verde —lo
       obvio para «la vida que se ayuda»— y todos los verdes que probamos se
       confundían con la montaña (distancia 0,10-0,12: la rampa de pisos ya se
       quedó con el verde entero). Buscando una salida apareció algo mejor que
       lo obvio: la soga de fique sin teñir. Despega del fondo como ninguna
       (10,6:1 — es la línea más clara del mapa, y debe serlo: es la
       protagonista), no se parece a nada, y sobre todo DICE lo que es. La
       compatibilidad no es un color: es una cuerda que amarra dos matas. Por
       eso además va trenzada. */
    color: mezclar(PALETA_ANDINA.crudo, PALETA_ANDINA.maiz, 0.2),
    grosor: 3.0, // TRAZO_ANDINO.grosor: la línea protagonista
    dir: false,
    punteada: false,
    arco: 0.34,
    hacia: 'centro',
    trenza: true, // dos hebras: el tejido que amarra (la única arista trenzada)
    etiqueta: 'se ayudan',
    nota: 'Sembradas juntas se sostienen. Así es la milpa: maíz, frijol y calabaza.',
  },
  antagonista: {
    color: TINTE_PLAGA,
    grosor: 2.2,
    dir: false,
    punteada: true,
    arco: 0.5,
    hacia: 'afuera',
    trenza: false,
    etiqueta: 'se estorban',
    nota: 'Juntas se hacen daño. Déjeles distancia.',
  },
  plaga_de: {
    color: TINTE_PLAGA,
    grosor: 1.5,
    dir: true,
    punteada: false,
    arco: -0.3, // cuelga: el ataque pesa
    hacia: 'cero',
    trenza: false,
    etiqueta: 'ataca a',
    nota: 'La plaga enferma esta mata.',
  },
  controlador_de: {
    color: TINTE_ALIADO,
    grosor: 1.7,
    dir: true,
    punteada: false,
    arco: 0.42, // sube: la ayuda levanta
    hacia: 'cero',
    trenza: false,
    etiqueta: 'controla a',
    nota: 'Este aliado se come esa plaga. Ese es el control biológico.',
  },
  biopreparado_de: {
    color: TINTE_REMEDIO,
    grosor: 1.3,
    dir: true,
    punteada: true,
    arco: 0.2,
    hacia: 'cero',
    trenza: false,
    etiqueta: 'cuida a',
    nota: 'Este preparado protege esta mata.',
  },
};

export const ARISTAS_ORDEN = ['compatible', 'antagonista', 'plaga_de', 'controlador_de', 'biopreparado_de'];

/* ── EL AIRE ────────────────────────────────────────────────────────────────
   La constelación NO flota en negro espacial: eso sería el dashboard genérico
   que estamos evitando. Flota en la hora dorada de `atmosferaMadre` bajada de
   luz — un atardecer de montaña, no el vacío. La niebla come la distancia y
   entierra los nodos lejanos: eso es lo que evita el plato de espagueti, mucho
   más que cualquier algoritmo. */
export const AIRE = {
  /* Tierra honda y CÁLIDA (nunca gris neutro: ley de `atmosferaMadre`). Es el
     anochecer del páramo, no el vacío negro del espacio — sobre este fondo la
     rampa de la montaña despega (lo peor 3,50:1) y la nieve de arriba brilla.
     Medido: L = 0,020. */
  fondo: mezclar(PALETA_ANDINA.tinta, ATMOSFERA.sombra, 0.35),
  /* La niebla va PEGADA al fondo, apenas más tibia. Si fuera mucho más clara,
     lo lejano se volvería una mancha visible en vez de desaparecer — y lo que
     desenreda este mapa es justamente que la distancia se trague lo que no está
     mirando. La niebla no es decoración: es el algoritmo. */
  niebla: mezclar(PALETA_ANDINA.tinta, ATMOSFERA.niebla, 0.22),
  /* Cerca/lejos NO son fijos: los calcula la escena a partir del tamaño real
     del cerro (ver `NavegadorGrafo`), porque un grafo recortado en gama baja es
     más pequeño y con estos números se ahogaría en niebla. Estos son el
     respaldo por si alguien monta las capas sueltas. */
  nieblaCerca: 12,
  nieblaLejos: 40,
  luz: ATMOSFERA.luz,
  relleno: ATMOSFERA.relleno,
};

/** A dónde se apaga un nodo/arista cuando NO es vecino del enfocado. No a
 *  transparente (costoso e inconsistente en instancing): al color del aire.
 *  Un fantasma es algo que ya casi es niebla. */
export const FANTASMA = {
  color: AIRE.fondo,
  /* Cuánto se hunde en la niebla. No llega a 1: el mapa completo NUNCA
     desaparece, para que usted no pierda el norte al enfocar algo. */
  mezcla: 0.72,
  escala: 0.55,
  mezclaArista: 0.84, // las aristas se borran más: son las que hacen el espagueti
};

/** El realce del nodo enfocado y de sus vecinos. */
export const REALCE = {
  escalaEnfocado: 1.85,
  escalaVecino: 1.3,
  /* Al enfocado se le sube el color hacia la luz de la hora dorada: brilla sin
     necesitar bloom (y por eso en gama baja, sin bloom, SIGUE leyéndose). */
  brillo: 0.3,
};

/**
 * El color final del cuerpo de un nodo: el piso manda para las matas, el tipo
 * manda para todo lo demás. Fuente única de verdad — NodosGrafo.jsx no decide.
 * @param {{ tipo: string, piso?: string }} nodo
 * @returns {string} hex
 */
export function colorDeNodo(nodo) {
  const tipo = TIPOS_NODO[nodo?.tipo] || TIPOS_NODO.especie;
  if (tipo.color) return tipo.color;
  return TINTE_PISO[nodo?.piso] || TINTE_PISO.sin_piso;
}

/**
 * Un tinte más claro del mismo color, para el remate/labio de las formas y los
 * puntos de luz. Mantiene la familia cromática (nunca blanco puro: la luz aquí
 * es dorada, no de neón).
 * @param {string} hex
 * @param {number} [t]
 * @returns {string} hex
 */
export function realzar(hex, t = 0.32) {
  return mezclar(hex, ATMOSFERA.luz, t);
}
