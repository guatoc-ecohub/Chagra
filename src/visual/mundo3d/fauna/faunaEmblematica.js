/*
 * faunaEmblematica — LAS FICHAS de los guardianes del monte.
 *
 * Cada ficha dice tres cosas, y las tres importan igual:
 *   1. LA ANATOMÍA REAL, en metros. No en unidades de juego: en metros. Una
 *      danta mide 0.85 m a la cruz y un arlequín mide 4 cm, y si eso no es
 *      verdad en el mundo, todo lo demás es decoración.
 *   2. LA MARCHA. Cómo apoya, en qué orden, con qué postura de pie. Ver
 *      `marcha.js`: ahí está el motor; aquí, qué marcha le toca a quién.
 *   3. EL ALMA. Qué pasa entre este animal y el campesino. Sin esto, esto es
 *      un catálogo de bichos.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  DE DÓNDE SALE CADA COSA (importa, y se verificó)
 * ─────────────────────────────────────────────────────────────────────────────
 * · CONFLICTO Y CONVIVENCIA → `Chagra-strategy/ops/corpus-maestros/
 *   teacher-conservacion.jsonl` (140 pares). Es la fuente REAL, y las citas de
 *   `conflicto` son suyas, casi textuales. Lo que dice el corpus, manda.
 * · FRANJAS Y ELENCO DEL PÁRAMO → `ops/GROUNDING-PARAMO-2026-07-09.md`
 *   (fuente IAvH, *El gran libro de los páramos*, 2011).
 * · ANATOMÍA, COLORACIÓN Y BIOMECÁNICA → NO están en el corpus. Se verificó
 *   par por par: el corpus es de conflicto y convivencia, no trae ni una
 *   medida, ni un tono, ni una cadencia. La única seña morfológica de todo el
 *   corpus es la huella de tres dedos de la danta (línea 91). Todo lo demás de
 *   anatomía aquí es conocimiento zoológico general, marcado `[zoología]` — no
 *   grounding del proyecto. Si mañana aparece un DR de fauna con medidas, ESTE
 *   es el archivo que se corrige.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  TRES CORRECCIONES AL ENCARGO (con fuente; ver README §correcciones)
 * ─────────────────────────────────────────────────────────────────────────────
 * · El jaguar NO se lleva el ternero: ese conflicto es del PUMA (corpus:107) y
 *   el jaguar tiene CERO menciones en el corpus. Por eso el puma está aquí.
 * · El "águila real de montaña" no existe en Colombia (Aquila chrysaetos es
 *   paleártica). La del páramo es Geranoaetus melanoleucus (IAvH).
 * · La rana va de Atelopus (arlequín de páramo), no de Phyllobates (rana
 *   dorada del Chocó): son familias y pisos térmicos opuestos. Y el arlequín
 *   real ES dorado y negro, así que "rana dorada / arlequines" se reconcilia
 *   solo — con el regalo de que Atelopus CAMINA en vez de saltar.
 *
 * REGISTRO: fauna realista. Los 9 bichos rubber-hose son otro registro y no se
 * mezclan (paleta/GUIA.md y la dirección de arte de creatures/).
 */
import { DANTA, JAGUAR, PUMA, OSO, TIGRILLO, BORUGO, COLIBRI, RANA, AGUILA } from './pelajes.js';

/* -------------------------------------------------------------------------- */
/*  DANTA DE MONTAÑA — Tapirus pinchaque                                      */
/* -------------------------------------------------------------------------- */
export const FICHA_DANTA = {
  id: 'danta',
  nombre: 'Danta de montaña',
  binomio: 'Tapirus pinchaque',
  tambien: 'danta de páramo, tapir lanudo',
  plan: 'cuadrupedo',
  pelaje: DANTA,

  /* [zoología] 1.8 m de largo total, 0.75–1.0 m a la cruz, 136–250 kg. El
     ÚNICO tapir lanudo del mundo: el pelaje largo es su adaptación al frío del
     páramo, y es lo primero que hay que ver en ella. */
  alzada: 0.85,
  masa: 190,
  torso: { largo: 1.06, radio: 0.29, pecho: 0.9, grupa: 1.04 },
  /* el lomo ARQUEADO y la grupa redonda: la silueta de tapir. El cuello es
     corto y macizo, con una crin corta y tiesa. */
  lomoArco: 0.055,
  cuello: { largo: 0.22, radio: 0.15, angulo: -0.34 },
  crin: { alto: 0.05, largo: 0.3 },
  cabeza: { largo: 0.34, alto: 0.19, ancho: 0.16 },
  /* LA PROBÓSCIDE: corta y prensil — con ella agarra la hoja y la lleva a la
     boca. Es la seña de la familia. */
  proboscide: { largo: 0.11, radio: 0.045 },
  /* LOS LABIOS BLANCOS y el RIBETE BLANCO de la oreja: las dos señas de
     T. pinchaque frente a los otros tapires. [zoología] */
  labioBlanco: true,
  orejas: { largo: 0.09, ancho: 0.055, ribete: 0.02, sep: 0.075, y: 0.06, z: -0.06 },
  patas: {
    postura: 'ungulado',
    /* [zoología] mesaxónica: 4 dedos adelante, 3 atrás. El corpus (91) solo
       registra la huella trasera: "tres dedos frontales bien marcados", y
       corrige a quien le dice cuatro. Es el rastro que la delata en el barro. */
    dedosDelante: 4,
    dedosAtras: 3,
    trasera: { a: 0.26, b: 0.23, pie: 0.13, radio: 0.055 },
    delantera: { a: 0.25, b: 0.22, pie: 0.12, radio: 0.058 },
    sep: 0.15,
    ejeZ: 0.36, // hombro/cadera a cada lado del centro
  },
  cola: { nodos: 1, largo: 0.08, radio: 0.03 }, // un muñón
  marcha: 'pasoLateral',
  /* [zoología] la danta ramonea andando: va lenta, cabeza baja, sin apuro.
     Nada de trote — un tapir apurado es un tapir asustado. */
  velocidad: 0.55,
  zancada: 0.9,
  cabezaBaja: 0.3, // ramoneando: la cabeza vive abajo

  alma:
    'La jardinera del bosque. Come hoja, fruto y rama, y siembra el monte con ' +
    'cada semilla que suelta. No hay que temerle: es tímida y huye apenas ' +
    'siente gente.',
  /* corpus:77 — el framing está INVERTIDO respecto a los demás: el conflicto
     de la danta no es lo que hace, es lo que le pasa. */
  conflicto:
    'Ninguno: es herbívora pura, no toca el ganado ni ataca a nadie. El ' +
    'problema es al revés — está entre los animales más amenazados de los ' +
    'Andes colombianos. Ver huella de danta en la finca es una buena noticia: ' +
    'quiere decir que la zona todavía conserva buen hábitat.',
  piso: 'bosque altoandino y páramo (2.800–3.800 m)',
};

/* -------------------------------------------------------------------------- */
/*  JAGUAR — Panthera onca                                                    */
/* -------------------------------------------------------------------------- */
export const FICHA_JAGUAR = {
  id: 'jaguar',
  nombre: 'Jaguar',
  binomio: 'Panthera onca',
  tambien: 'tigre mariposo',
  plan: 'cuadrupedo',
  pelaje: JAGUAR,

  /* [zoología] 1.2–1.8 m de cuerpo + 45–75 cm de cola, 63–76 cm a la cruz,
     60–100 kg. Compacto y macizo: patas cortas, pecho hondo, cabezota. Es el
     felino más robusto de América, y se le nota en la proporción. */
  alzada: 0.72,
  masa: 85,
  torso: { largo: 1.15, radio: 0.21, pecho: 1.12, grupa: 0.98 },
  lomoArco: 0.02,
  cuello: { largo: 0.16, radio: 0.13, angulo: -0.1 },
  /* la cabeza del jaguar es desproporcionada a propósito: la mordida más fuerte
     de los felinos americanos vive en esos maseteros. */
  cabeza: { largo: 0.26, alto: 0.19, ancho: 0.19 },
  hocico: { largo: 0.07, radio: 0.055 },
  orejas: { largo: 0.055, ancho: 0.05, redondas: true, sep: 0.08, y: 0.07, z: -0.05 },
  /* LAS ROSETAS: anillo con MOTA ADENTRO. El leopardo tiene puntos llenos; el
     jaguar, rosetas con centro. Es EL dato diagnóstico y no es negociable. */
  rosetas: { filas: 4, porFila: 6, radio: 0.05, conCentro: true },
  patas: {
    postura: 'digitigrado',
    /* [zoología] uñas retráctiles: al caminar NO deja marca de uña. El corpus
       lo describe para el puma (78) y vale para todo felino. */
    unasRetractiles: true,
    trasera: { a: 0.24, b: 0.23, pie: 0.15, radio: 0.052 },
    delantera: { a: 0.23, b: 0.21, pie: 0.14, radio: 0.06 },
    sep: 0.11,
    ejeZ: 0.38,
  },
  cola: { nodos: 4, largo: 0.16, radio: 0.032 },
  marcha: 'acecho',
  /* el acecho es LENTO: 0.4 m/s. Cada paso tiene que poder abortarse. */
  velocidad: 0.4,
  zancada: 0.78,
  cabezaBaja: 0.42, // la cabeza al ras de la línea del lomo: acechando

  /* LO MÍSTICO, sin volverlo monstruo: el jaguar-espíritu del chamán no es un
     villano. Su presencia se hace con TIEMPO (se detiene, sostiene la mirada,
     sigue) y con la LUMBRE del ojo — el tapetum lucidum es real. Nada de
     colmillos ni gruñidos: eso sería Disney al revés. */
  mistico: true,
  pausas: { cada: 6.5, dura: 2.2 }, // se detiene y mira: ahí está el respeto

  alma:
    'Presencia. No es un monstruo ni una mascota: es el dueño del monte que ' +
    'te concede pasar. Se le tiene respeto, que no es lo mismo que miedo.',
  /* HONESTIDAD: el corpus NO menciona al jaguar ni una vez. No se le inventa
     un conflicto para darle dramatismo. */
  conflicto:
    'Sin respaldo en el corpus de conservación: el jaguar no aparece en los ' +
    '140 pares (es de tierra caliente). El conflicto del ternero que se le ' +
    'suele atribuir es del PUMA. Ver FICHA_PUMA.',
  piso: 'tierra caliente y piedemonte (no es fauna de páramo)',
};

/* -------------------------------------------------------------------------- */
/*  PUMA — Puma concolor                                                      */
/*  El felino que el corpus SÍ documenta. Está aquí porque sin él, el conflicto */
/*  del ternero queda colgado de la especie equivocada.                       */
/* -------------------------------------------------------------------------- */
export const FICHA_PUMA = {
  id: 'puma',
  nombre: 'Puma',
  binomio: 'Puma concolor',
  tambien: 'león de montaña',
  plan: 'cuadrupedo',
  pelaje: PUMA,

  /* [zoología] más liviano y más largo de patas que el jaguar: un felino de
     recorrer montaña, no de emboscar en selva. Cola larguísima (contrapeso). */
  alzada: 0.7,
  masa: 55,
  torso: { largo: 1.08, radio: 0.175, pecho: 1, grupa: 1.02 },
  lomoArco: 0.025,
  cuello: { largo: 0.18, radio: 0.11, angulo: -0.12 },
  /* cabeza CHICA y redonda: la seña que lo separa del jaguar a distancia */
  cabeza: { largo: 0.2, alto: 0.15, ancho: 0.15 },
  hocico: { largo: 0.06, radio: 0.045 },
  orejas: { largo: 0.06, ancho: 0.05, redondas: true, sep: 0.07, y: 0.06, z: -0.04 },
  /* SIN rosetas: el puma adulto es liso (solo el cachorro es manchado) */
  rosetas: null,
  patas: {
    postura: 'digitigrado',
    unasRetractiles: true,
    trasera: { a: 0.26, b: 0.25, pie: 0.14, radio: 0.045 },
    delantera: { a: 0.24, b: 0.22, pie: 0.13, radio: 0.048 },
    sep: 0.1,
    ejeZ: 0.36,
  },
  cola: { nodos: 5, largo: 0.15, radio: 0.028 },
  marcha: 'acecho',
  velocidad: 0.45,
  zancada: 0.8,
  cabezaBaja: 0.34,
  /*
   * REGISTRO DIRECTO — el dato de locomoción más preciso de todo el corpus, y
   * es de aquí (78): "suele dejar huellas en línea casi recta, una detrás de
   * otra, porque camina pisando con la pata trasera casi en el mismo punto
   * donde pisó la delantera". La marcha `acecho` lo implementa.
   */
  registroDirecto: true,

  alma: 'El que pasa sin que lo veas. Casi todo el que jura haber visto un puma, vio el rastro.',
  /* corpus:107 — textual en lo esencial */
  conflicto:
    'Se lleva terneros solos y desprotegidos de noche cerca del monte. Caza ' +
    'de noche. La rabia de perder un animal de valor es real y no se ' +
    'minimiza — pero lo que funciona a largo plazo es encerrar las crías en ' +
    'corral cerrado de noche, no dejarlas en potrero abierto pegado al bosque.',
  piso: 'de tierra caliente al páramo (el mamífero más plástico de América)',
};

/* -------------------------------------------------------------------------- */
/*  OSO ANDINO / DE ANTEOJOS — Tremarctos ornatus                             */
/*  El conflicto estrella del corpus: EL MAIZAL.                              */
/* -------------------------------------------------------------------------- */
export const FICHA_OSO = {
  id: 'oso',
  nombre: 'Oso andino',
  binomio: 'Tremarctos ornatus',
  tambien: 'oso de anteojos, oso frontino',
  plan: 'cuadrupedo',
  pelaje: OSO,

  /* [zoología] 1.3–2 m, 60–175 kg, 70–90 cm a la cruz. El único oso de
     Suramérica. Cuartos delanteros más altos que los traseros: la joroba de
     músculo del hombro es de trepador — este oso vive subido a los árboles. */
  alzada: 0.8,
  masa: 110,
  torso: { largo: 1.02, radio: 0.29, pecho: 1.08, grupa: 0.92 },
  lomoArco: -0.03, // el lomo CAE hacia la grupa: la seña del oso
  cuello: { largo: 0.14, radio: 0.17, angulo: -0.2 },
  cabeza: { largo: 0.24, alto: 0.21, ancho: 0.2 },
  /* hocico CORTO para un oso (es casi vegetariano: no necesita el morro largo
     del carnívoro) */
  hocico: { largo: 0.09, radio: 0.07 },
  orejas: { largo: 0.06, ancho: 0.06, redondas: true, sep: 0.095, y: 0.08, z: -0.07 },
  /*
   * LOS ANTEOJOS — y el error clásico: creer que el anteojo y el morro claro
   * son la misma mancha. Son DOS zonas distintas, de tonos distintos. Y
   * [zoología] el dibujo es ÚNICO en cada individuo, como una huella digital:
   * con eso los identifican las cámaras trampa. Por eso `semilla` — cada oso
   * que se monta lleva SU cara, no la cara del modelo.
   */
  anteojos: { radio: 0.055, sep: 0.075, y: 0.055, cierra: 0.35 },
  babero: { ancho: 0.13, largo: 0.26 },
  patas: {
    /* PLANTÍGRADO: pisa con toda la planta, del talón a los dedos, como
       nosotros. Es lo que le da el andar de oso — y lo que le permite pararse. */
    postura: 'plantigrado',
    garras: 0.035, // garras largas y no retráctiles: son de trepar
    trasera: { a: 0.26, b: 0.24, pie: 0.2, radio: 0.075 },
    delantera: { a: 0.25, b: 0.23, pie: 0.17, radio: 0.085 },
    sep: 0.15,
    ejeZ: 0.34,
  },
  cola: { nodos: 1, largo: 0.07, radio: 0.03 },
  /* AMBLADURA: las dos patas del mismo lado casi juntas → el bamboleo. Un oso
     que camina en paso lateral limpio deja de leerse como oso. */
  marcha: 'ambladura',
  velocidad: 0.68,
  zancada: 0.82,
  cabezaBaja: 0.25,

  alma:
    'Serio y pesado. Casi vegetariano, buen padre del bosque: come fruta, ' +
    'bromelia y palma, y va sembrando. El mismo que le tumba el maizal le ' +
    'está comiendo plaga el resto del año.',
  /* corpus:96, 75, 76, 117 — el par mejor documentado de todo el corpus */
  conflicto:
    'EL MAIZAL. Le tumba el maíz, y no una vez: vuelve. Es plata real y ' +
    'esfuerzo real que se perdió, y eso no se minimiza. Lo que funciona es ' +
    'cerca eléctrica solar de bajo voltaje (no lo mata ni lo lastima: le ' +
    'enseña) y cosechar a tiempo, sin dejar maíz maduro en el lote. ' +
    'Espantarlo una vez no sirve: es inteligente y vuelve mientras haya ' +
    'comida fácil. Matarlo es delito, y tampoco resuelve — otro ocupa el ' +
    'territorio.',
  piso: 'del bosque altoandino al páramo; baja buscando fruta a la franja de las fincas',
};

/* -------------------------------------------------------------------------- */
/*  TIGRILLO — Leopardus sp.                                                  */
/* -------------------------------------------------------------------------- */
export const FICHA_TIGRILLO = {
  id: 'tigrillo',
  nombre: 'Tigrillo',
  binomio: 'Leopardus sp.',
  /* el corpus (79) reconoce explícitamente que "tigrillo" cubre varias
     especies ("según la especie") y nunca fija el binomio. No se lo inventamos. */
  tambien: 'tigrillo lanudo, gato de monte',
  plan: 'cuadrupedo',
  pelaje: TIGRILLO,

  /* corpus:79 — "un felino pequeño, del tamaño de un gato grande a mediano
     según la especie". Esa ES la medida que hay, y de ahí sale la escala. */
  alzada: 0.29,
  masa: 2.6,
  torso: { largo: 0.46, radio: 0.078, pecho: 0.95, grupa: 1 },
  lomoArco: 0.015,
  cuello: { largo: 0.07, radio: 0.05, angulo: -0.1 },
  cabeza: { largo: 0.095, alto: 0.075, ancho: 0.075 },
  hocico: { largo: 0.025, radio: 0.022 },
  /* orejas grandes para la cabeza: es nocturno, y oye antes de ver */
  orejas: { largo: 0.04, ancho: 0.032, redondas: true, sep: 0.035, y: 0.032, z: -0.02 },
  rosetas: { filas: 4, porFila: 7, radio: 0.019, conCentro: true },
  patas: {
    postura: 'digitigrado',
    unasRetractiles: true,
    trasera: { a: 0.105, b: 0.1, pie: 0.055, radio: 0.019 },
    delantera: { a: 0.1, b: 0.092, pie: 0.05, radio: 0.02 },
    sep: 0.045,
    ejeZ: 0.15,
  },
  cola: { nodos: 4, largo: 0.085, radio: 0.014 },
  marcha: 'trotecito',
  velocidad: 0.5,
  zancada: 0.34,
  cabezaBaja: 0.1,
  /* corpus:105 — LA seña de comportamiento, y la que salva las gallinas:
     "revise especialmente la parte de arriba del gallinero, no solo las
     paredes, porque es de los que sube". Trepador. */
  trepador: true,

  alma: 'Tímido y nocturno. Del tamaño de un gato grande, y con el monte entero adentro.',
  /* corpus:79, 105, 95 */
  conflicto:
    'Las gallinas — nunca la gente: para las personas no representa peligro ' +
    'real. Y trepa: se cuela por arriba del gallinero, no solo por las ' +
    'paredes. Malla también en el techo, y enterrada 30 cm.',
  piso: 'bosque altoandino y borde de finca',
};

/* -------------------------------------------------------------------------- */
/*  BORUGO — Cuniculus taczanowskii                                           */
/*  EL ANIMAL DE CIERRE. En la vereda lo cazan con perros para vender la       */
/*  carne; en Chagra va al revés: vivo, a salvo, querido y digno. Nada de      */
/*  cacería ni sangre — dignidad y esperanza. (Dirección de arte del proyecto, */
/*  heredada de creatures/borugoIdentidad.js: se respeta tal cual.)            */
/* -------------------------------------------------------------------------- */
export const FICHA_BORUGO = {
  id: 'borugo',
  nombre: 'Borugo',
  binomio: 'Cuniculus taczanowskii',
  /* corpus:83 — la geografía del nombre: en tierra fría de páramo es BORUGO;
     en tierra caliente, GUAGUA o LAPA. Es el mismo grupo. */
  tambien: 'guagua o lapa en tierra caliente',
  plan: 'cuadrupedo',
  pelaje: BORUGO,

  /* [zoología] la paca de montaña: roedor grande y macizo, 6–10 kg, patas
     cortas, sin cola visible. Más peludo y oscuro que la paca de tierra baja. */
  alzada: 0.27,
  masa: 8,
  torso: { largo: 0.54, radio: 0.115, pecho: 0.86, grupa: 1.12 }, // grupa ancha
  lomoArco: 0.05, // el lomo arqueado del roedor
  cuello: { largo: 0.045, radio: 0.075, angulo: -0.15 },
  cabeza: { largo: 0.115, alto: 0.08, ancho: 0.075 },
  /* hocico ROMO y la nariz que tiembla al olfatear */
  hocico: { largo: 0.03, radio: 0.028 },
  orejas: { largo: 0.022, ancho: 0.02, redondas: true, sep: 0.04, y: 0.03, z: -0.035 },
  /* LAS MOTAS EN HILERA — la firma de la paca: filas ordenadas por el flanco,
     no salpicaduras al azar. [zoología] */
  motas: { filas: 4, porFila: 7, radio: 0.009 },
  bigotes: { largo: 0.07, cuantos: 4 },
  patas: {
    postura: 'digitigrado',
    trasera: { a: 0.1, b: 0.095, pie: 0.055, radio: 0.024 },
    delantera: { a: 0.085, b: 0.078, pie: 0.042, radio: 0.022 },
    sep: 0.05,
    ejeZ: 0.17,
  },
  cola: { nodos: 1, largo: 0.02, radio: 0.008 }, // apenas un botón
  marcha: 'trotecito',
  velocidad: 0.45,
  zancada: 0.3,
  cabezaBaja: 0.2,
  nocturno: true,

  alma:
    'El alma dulce del monte. Tímido, nocturno, el que despierta las ganas de ' +
    'cuidar. Aquí va vivo y a salvo: eso es lo que se está diciendo.',
  /* corpus:83, 108 — y la joya: la CUOTA ACEPTADA */
  conflicto:
    'Le entra al cultivo: come raíz, tubérculo, fruta caída y a veces maíz. ' +
    'Malla fina y ENTERRADA, porque cava. Pero hay campesinos que lo manejan ' +
    'distinto: siembran un poco de más contando de entrada con que una parte ' +
    'se la lleva la fauna. Una cuota aceptada de antemano, en vez de pelear ' +
    'por el cien por ciento de la cosecha.',
  piso: 'bosque altoandino y páramo',
};

/* -------------------------------------------------------------------------- */
/*  COLIBRÍ DE PÁRAMO — Oxypogon guerinii                                     */
/*  Plan aparte: no camina, se SOSTIENE. Ver ColibriGuardian.jsx.             */
/* -------------------------------------------------------------------------- */
export const FICHA_COLIBRI = {
  id: 'colibri',
  nombre: 'Barbudito de páramo',
  binomio: 'Oxypogon guerinii',
  tambien: 'chivito de páramo, colibrí barbudo',
  plan: 'colibri',
  pelaje: COLIBRI,

  /*
   * [zoología] 11–13 cm de largo total, 4–5 g. Endémico de Colombia (páramos
   * de Cundinamarca y Boyacá).
   *
   * OJO — no es el colibrí del imaginario: el Oxypogon es PARDO, de PICO CORTO
   * Y RECTO (rarísimo en un colibrí: es su adaptación al páramo, donde come
   * tanto insecto como néctar de frailejón). El macho lleva CRESTA blanca
   * eréctil y una BARBA larga iridiscente. Nada de turquesa de pico largo.
   */
  largoTotal: 0.12,
  masa: 0.0045,
  cuerpo: { largo: 0.05, radio: 0.017 },
  cabeza: { radio: 0.014 },
  pico: { largo: 0.016, radio: 0.0016 }, // CORTO y recto
  cresta: { largo: 0.022, ancho: 0.008 },
  barba: { largo: 0.028, ancho: 0.007 }, // la barba iridiscente del macho
  ala: { largo: 0.058, ancho: 0.016 },
  cola: { largo: 0.045, ancho: 0.018 },
  /* la LENGUA: bífida y acanalada, sale MÁS ALLÁ del pico y lame 15–20 veces
     por segundo. Que se le vea la lengua es medio punto de verdad. [zoología] */
  lengua: { largo: 0.011, lamidasPorSegundo: 17 },

  /*
   * EL ALETEO, y por qué NO se anima un aleteo.
   *
   * [zoología] ~28 batidas por segundo para una especie grande de altura (el
   * aire ralo del páramo pide amplitud, no frecuencia). A 60 fps eso es MEDIA
   * batida por cuadro: es físicamente imposible mostrarlas, y si se intenta,
   * el aliasing devuelve un aleteo lento y falso — el error clásico.
   *
   * Lo honesto es lo que ve el ojo, que tiene el mismo problema: un BORRÓN.
   * Por eso el ala se dibuja como el arco que barre, no como un ala. La verdad
   * aquí es la mancha, no el ala.
   */
  aleteoHz: 28,
  /* el ocho: el ala del colibrí gira en la muñeca y da sustentación en LOS DOS
     sentidos del barrido. Por eso puede quedarse quieto en el aire — y ningún
     otro pájaro puede. */
  vueloEnOcho: true,
  cuerpoInclinado: 0.7, // ~40°: la postura del vuelo estacionario
  /* el cernido no es quietud: es corrección constante. Nunca está quieto. */
  deriva: { amplitud: 0.012, hz: 1.7 },
  saltoDeFlor: { cada: 4.5, dura: 0.55 },

  alma:
    'El que se queda quieto en el aire. En el páramo hace de abeja: con el ' +
    'frío los insectos no vuelan, y él poliniza hasta el frailejón.',
  conflicto:
    'Ninguno. El colibrí nunca aparece en el corpus como conflicto: solo ' +
    'como servicio. Va cargando polen en el pico y la cabeza, de flor en flor.',
  piso: 'páramo y superpáramo (3.200–4.200 m)',
};

/* -------------------------------------------------------------------------- */
/*  RANA ARLEQUÍN — Atelopus (muisca / lozanoi)                               */
/*  Plan aparte: camina esparrancada y hace SEMÁFORO. Ver RanaArlequin.jsx.   */
/* -------------------------------------------------------------------------- */
export const FICHA_RANA = {
  id: 'rana',
  nombre: 'Rana arlequín',
  binomio: 'Atelopus muisca',
  tambien: 'arlequín de páramo',
  plan: 'rana',
  pelaje: RANA,

  /*
   * [zoología] 3–5 cm. LO DIMINUTO ES EL PUNTO: aquí va a escala real, 4 cm, y
   * la escena la trae cerca de la cámara en vez de agrandarla. Un arlequín del
   * tamaño de un gato sería una mentira sobre lo que se está perdiendo.
   */
  largoTotal: 0.042,
  masa: 0.003,
  cuerpo: { largo: 0.026, radio: 0.0075 },
  cabeza: { largo: 0.012, radio: 0.006 }, // hocico PUNTUDO (no romo)
  ojo: { radio: 0.0028 },
  /* sin tímpano visible: la seña del género (por eso "se comunica por señas") */
  timpano: false,
  patas: {
    /* ESPARRANCADO: codos y rodillas hacia AFUERA, no bajo el cuerpo */
    postura: 'esparrancado',
    trasera: { a: 0.013, b: 0.013, pie: 0.009, radio: 0.0018 },
    delantera: { a: 0.009, b: 0.009, pie: 0.006, radio: 0.0016 },
    sep: 0.007,
    ejeZ: 0.011,
    /* los discos de los dedos, para agarrarse de la piedra mojada */
    discos: 0.0012,
  },
  /*
   * CAMINA. No salta.
   *
   * Es la rareza célebre del género y es el regalo del encargo: Atelopus
   * camina, despacio y deliberado, como un bicho de cuatro patas cualquiera.
   * Una rana que camina descoloca a cualquiera que espere el salto — y esa
   * incomodidad es exactamente la verdad del animal.
   */
  marcha: 'esparrancado',
  velocidad: 0.028,
  zancada: 0.022,

  /*
   * EL SEMÁFORO (foot-flagging / hand-waving).
   *
   * [zoología] vive junto a quebradas, donde el agua hace tanto ruido que
   * cantar no sirve. Entonces SALUDA: levanta una mano y la gira, despacio,
   * como quien hace señas desde la otra orilla. Es de los poquísimos anfibios
   * del mundo que se comunican por seña visual. Si el arlequín hace UNA sola
   * cosa en esta escena, que sea esta.
   */
  semaforo: { cada: 5.5, dura: 1.6, mano: 'alterna' },

  alma:
    'Diminuta y venenosa, y lo grita: el oro y el negro son la advertencia. ' +
    'Donde ella está, el agua está sana. Casi todas sus primas ya no están.',
  conflicto:
    'Ninguno con el campesino — se verificó par por par en el corpus. Su ' +
    'enemigo no es la finca: es el hongo (quitridio) y el clima. Es ' +
    'bioindicadora de agua limpia: si está, el agua sirve.',
  piso: 'páramo, a la orilla de las quebradas (3.000–3.700 m)',
};

/* -------------------------------------------------------------------------- */
/*  ÁGUILA DE PÁRAMO — Geranoaetus melanoleucus                               */
/*  Plan aparte: no camina, PLANEA EN CÍRCULO. Ver AguilaParamo.jsx.          */
/* -------------------------------------------------------------------------- */
export const FICHA_AGUILA = {
  id: 'aguila',
  nombre: 'Águila de páramo',
  binomio: 'Geranoaetus melanoleucus',
  tambien: 'águila mora, águila pechinegra',
  plan: 'aguila',
  pelaje: AGUILA,

  /* [zoología] 1.5–2 m de envergadura, 60–80 cm de largo. El adulto: capucha y
     pecho PIZARRA casi negro, ala gris vermiculada, vientre BLANCO y cola
     corta en cuña. La silueta en el cielo es inconfundible por eso: ancha
     adelante y cortísima atrás. */
  envergadura: 1.75,
  largoTotal: 0.68,
  masa: 2.4,
  cuerpo: { largo: 0.34, radio: 0.075 },
  cabeza: { radio: 0.05 },
  pico: { largo: 0.045, radio: 0.014 },
  ala: { largo: 0.82, ancho: 0.24, plumas: 6 },
  cola: { largo: 0.17, ancho: 0.16 }, // corta y en CUÑA
  /*
   * EL PLANEO EN CÍRCULO — corpus:81, y es la única locomoción documentada de
   * la especie: "volando en círculos sobre potrero abierto… buscando roedores,
   * culebras pequeñas o insectos grandes en el pasto corto".
   *
   * [zoología] las alas van en DIEDRO leve (una V muy abierta): así se
   * autoestabiliza y no gasta ni un aleteo. Un águila que aletea al planear no
   * está planeando. La térmica la sube; ella solo se inclina.
   *
   * El círculo va GRANDE y ALTO (26 m de radio, 20 s → ~8 m/s, que es la
   * velocidad real de planeo de esta ave). No es capricho de encuadre: a un
   * radio de escenario le saldrían 2 m/s y el bicho se caería del cielo. Y así
   * es como se la ve de verdad — lejos, arriba, dando vueltas. De ese círculo
   * `AguilaParamo` deriva el alabeo por física; no hay ningún ángulo elegido a
   * ojo en toda la maniobra.
   */
  circulo: { radio: 26, periodo: 20, alturaBase: 16, subida: 3.2 },
  diedro: 0.13,
  /* aletea CASI nunca: solo para recuperar la térmica */
  aleteo: { cada: 14, dura: 1.6, amplitud: 0.5 },

  alma: 'La que hace los círculos. Control de plagas gratis, todo el año, sin que nadie se lo pida.',
  /* corpus:81, 109 */
  conflicto:
    'Menor, y solo con los pollitos recién nacidos: corral techado o con ' +
    'malla también por arriba las primeras semanas. Cuando crecen y se mueven ' +
    'más rápido, el riesgo baja. No hay por qué ahuyentarla ni molestarla: el ' +
    'resto del año le está haciendo control de roedor gratis en el potrero. ' +
    'El manejo está en proteger al pollito, no en pelear con el ave.',
  piso: 'páramo y potrero abierto de altura',
};

/* -------------------------------------------------------------------------- */

export const FAUNA_EMBLEMATICA = {
  danta: FICHA_DANTA,
  jaguar: FICHA_JAGUAR,
  puma: FICHA_PUMA,
  oso: FICHA_OSO,
  tigrillo: FICHA_TIGRILLO,
  borugo: FICHA_BORUGO,
  colibri: FICHA_COLIBRI,
  rana: FICHA_RANA,
  aguila: FICHA_AGUILA,
};

/** Los guardianes que el encargo pide de cabecera. */
export const GUARDIANES = ['danta', 'rana', 'jaguar', 'colibri'];

/** Los que de verdad pisan el páramo colombiano (fuente IAvH). El jaguar NO. */
export const FAUNA_DE_PARAMO = ['danta', 'oso', 'puma', 'borugo', 'rana', 'colibri', 'aguila'];

export const fichaDe = (id) => FAUNA_EMBLEMATICA[id] || null;
