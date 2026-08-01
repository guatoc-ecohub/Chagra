/*
 * beneficosIdentidad — LA VERDAD DE LOS ALIADOS INVISIBLES, COMO DATOS.
 *
 * El campesino ve un bicho y lo mata. No sabe que la mitad de esos bichos están
 * de su lado. Y cuando fumiga de amplio espectro mata MÁS ALIADOS QUE PLAGAS —
 * por eso al año siguiente hay más plaga, no menos. Este mundo existe para hacer
 * visible ese ejército invisible, y para que el argumento se vea SIN TEXTO:
 *
 *              MATAR TODO = QUEDARSE SIN EJÉRCITO.
 *
 * ── DE DÓNDE SALE (grounded, no inventado) ──────────────────────────────────
 * Del corpus maestro de MIP/poscosecha (140 pares) y de plagas (135 pares), voz
 * de campo. Hechos que el corpus deja firmes y que el dibujo NO puede contradecir:
 *
 *   · LA LARVA DE MARIQUITA NO SE PARECE AL ADULTO. El adulto es redondo, rojo
 *     con puntos; la larva es "un cocodrilito negro con manchas naranjas",
 *     alargada. El campesino la mata creyendo que es plaga — y es la misma
 *     mariquita en otra etapa, comiendo pulgón todo el día. ESTE ES EL GESTO
 *     QUE MÁS VALE DE TODO EL MUNDO: por eso la larva es la PROTAGONISTA, y por
 *     eso el arco huevo→larva→pupa→adulto se dibuja COMPLETO y en una sola hoja.
 *   · La crisopa adulta es delicada, de alas verdes transparentes; LA QUE TRABAJA
 *     es su larva ("león de los áfidos"). Sus huevos van colgados de un PEDICELO,
 *     como alfileres clavados en la hoja.
 *   · La avispa parasitoide pone su huevo DENTRO de la plaga; la larva se la come
 *     por dentro y deja LA MOMIA: el pulgón hinchado, bronce, con una tapita
 *     recortada por donde salió la avispa. No pican a las personas.
 *   · El sírfido es una MOSCA disfrazada de abeja: el adulto POLINIZA y su larva
 *     COME PULGÓN. Doble oficio, un solo bicho.
 *   · Beauveria bassiana cubre a la plaga de BLANCO (la broca del café);
 *     Metarhizium anisopliae la deja VERDE (la chiza en el suelo). El hongo que
 *     se come al bicho.
 *   · Trichoderma no ataca insectos: pelea contra OTROS HONGOS en el suelo
 *     (Rhizoctonia, Pythium, Fusarium — la chupadera del semillero).
 *   · Bacillus thuringiensis (Bt) solo mata ORUGAS, y solo si se la COMEN. Es
 *     selectivo, pero no distingue una oruga plaga de una mariposa bonita.
 *   · Un poco de plaga NO es un problema: ES LA COMIDA que mantiene vivo al
 *     ejército. Un cultivo sin un solo insecto es un cultivo sin defensa.
 *
 * ── REGISTRO: REALISTA. NO RUBBER-HOSE. ────────────────────────────────────
 * `GUIA-RUBBERHOSE.md` es tajante y este mundo obedece: esto es FAUNA SECUNDARIA
 * del monte → proporciones naturales, SIN ojos de goma, SIN catchlight, SIN
 * contorno de tinta, SIN chapetas, SIN line-boil. Los personajes rubber-hose son
 * otros (los 9 bichos, Angelita) y viven en `creatures/`. Acá nadie tiene nombre
 * propio ni carácter: tienen OFICIO. Un dibujo con ojos-catchlight en esta escena
 * sería un bug de registro.
 *
 * REGLA DE ORO (la de `abejaIdentidad.js` / `polinizadoresIdentidad.js`): SOLO
 * DATOS. Cero three, cero react → three-free, testeable headless, seguro en el
 * bundle base. La GEOMETRÍA vive en `beneficos.geom.js`; la DINÁMICA (la curva
 * de plaga que decide el desenlace) en `dinamicaPlaga.js`; la CADENCIA en la
 * escena.
 */
/*
 * OJO CON ESTE IMPORT: se entra por `paletaMadre.js`, NO por `../paleta` (el
 * index). El index re-exporta `LuzMadre.jsx` y por ahí se cuela REACT — lo que
 * mataría la promesa de arriba (three-free, headless, seguro en el bundle base)
 * y metería un componente en un archivo de datos. `paletaMadre` es la puerta
 * de los DATOS; el index es la puerta de las ESCENAS. Es la misma disciplina de
 * `polinizadoresIdentidad.js`, que entra directo a `abejaIdentidad.js`.
 */
import { VERDES, TIERRAS, CORTEZAS, ACENTOS, NEUTROS, mezclar } from '../paleta/paletaMadre.js';

/* -------------------------------------------------------------------------- */
/*  Paleta del mundo — derivada de la madre, ni un hex suelto                  */
/* -------------------------------------------------------------------------- */

/*
 * Una mañana de huerta templada: el verde de trabajo, la tierra de siembra y —
 * el único color que grita— EL ROJO COCHINILLA DE LA MARIQUITA. Ese rojo ya
 * existía en la paleta madre y ya venía anotado "(mariquita)": no se inventa
 * nada, se cobra lo que ya estaba dicho.
 *
 * El criterio de color de este mundo es UNO y es semántico:
 *   · ALIADO   → cochinilla/ámbar (los cálidos de la casa). Trabajan.
 *   · PLAGA    → verde pálido enfermizo. Chupa, no aporta.
 *   · VENENO   → un violeta-ceniza que NO pertenece a la paleta andina, y esa
 *                es exactamente la idea: el veneno es lo ajeno al valle.
 *   · MUERTO   → ceniza. Lo que el amplio espectro deja.
 */
export const PAL = {
  /*
   * NO HAY CIELO NI NIEBLA ACÁ, Y ES A PROPÓSITO: "los cielos los pone la
   * atmósfera, no vos" (paleta/GUIA.md §1). La escena toma su día de `ATMOSFERA`
   * y su noche de `CIELOS_HORA.noche`, mezclados con la ley 60%-hacia-la-madre.
   * Declarar acá un `cieloNoche` propio era exactamente la deriva de calcos que
   * el módulo `paleta/` existe para matar — se hizo, y se borró.
   */

  /* Suelo y mata */
  suelo: TIERRAS.siembra,
  sueloVivo: mezclar(TIERRAS.siembra, TIERRAS.turba, 0.5), // con materia orgánica
  sueloPelado: mezclar(TIERRAS.camino, NEUTROS.concreto, 0.35), // el lote limpio
  hoja: VERDES.trabajo,
  hojaJoven: VERDES.brote,
  hojaSombra: VERDES.monte,
  tallo: mezclar(VERDES.monte, TIERRAS.camino, 0.3),

  /* LA PLAGA: el pulgón. Verde pálido, translúcido, blando. */
  pulgon: '#a9c47a',
  pulgonDenso: '#8fb45f', // la colonia apretada, cuando ya se ve el daño
  oruga: '#9fc06a', // el cogollero/medidor: verde clarito

  /* LOS ALIADOS (el ejército) */
  mariquita: ACENTOS.cochinilla, // ya venía anotado "(mariquita)" en la madre
  mariquitaPunto: NEUTROS.tinta,
  /* La larva: el cocodrilito. Oscura azulada con manchas naranjas — la razón
     por la que el campesino la mata sin saber. */
  larvaCuerpo: mezclar(NEUTROS.tinta, '#33305c', 0.45), // negro-azuloso
  larvaMancha: '#e08a2e', // el naranja que la delata como aliada
  crisopaAla: '#c6e39a', // alas verdes transparentes
  crisopaCuerpo: '#7fb04f',
  crisopaOjo: ACENTOS.ambar, // los ojos dorados de la crisopa adulta
  crisopaHuevo: NEUTROS.hueso, // el alfiler
  crisopaPedicelo: mezclar(NEUTROS.hueso, VERDES.brote, 0.35),
  avispa: mezclar(NEUTROS.tinta, ACENTOS.ambar, 0.28), // negra con dejo de miel
  avispaAla: '#e8ecdd',
  /* LA MOMIA: el pulgón parasitado. Hinchado, bronce, rígido. Lo más
     espectacular del control biológico — y lo que nadie mira. */
  momia: ACENTOS.ambar,
  momiaTapa: mezclar(ACENTOS.ambar, NEUTROS.tinta, 0.55), // el huequito de salida
  sirfidoLarva: mezclar(VERDES.brote, ACENTOS.maizTextil, 0.3), // gusanito translúcido
  arana: mezclar(TIERRAS.cacao, NEUTROS.tinta, 0.4),
  tela: NEUTROS.hueso,
  tijereta: mezclar(CORTEZAS.roble, NEUTROS.tinta, 0.5),
  carabido: '#2f2a33', // el escarabajo cazador: negro con brillo azulado
  carabidoBrillo: '#4a4a68',
  ave: mezclar(VERDES.paramoHoja, NEUTROS.tinta, 0.25),
  avePecho: ACENTOS.maizTextil,
  murcielago: mezclar(TIERRAS.cacao, NEUTROS.tinta, 0.55),

  /* LOS HONGOS Y LA BACTERIA (los que no se ven venir) */
  beauveria: NEUTROS.hueso, // la broca cubierta de blanco
  beauveriaEspora: '#fffdf7',
  metarhizium: '#6f8f3a', // el verde de Metarhizium
  metarhiziumEspora: '#93b352',
  trichoderma: mezclar(NEUTROS.hueso, VERDES.brote, 0.45), // el halo de la raíz
  hongoMalo: mezclar('#33305c', TIERRAS.cacao, 0.4), // Rhizoctonia/Fusarium
  bt: mezclar(NEUTROS.cal, ACENTOS.ambar, 0.2), // la bacteria, polvo fino

  /* LAS FLORES: la despensa. Flor chiquita y abundante (compuestas). */
  florCilantro: NEUTROS.hueso,
  florCalendula: ACENTOS.guayacan,
  florHinojo: ACENTOS.maizTextil,
  florCentro: ACENTOS.ambar,

  /* EL VENENO Y LA MUERTE (lo ajeno) */
  veneno: '#9d8fb5', // violeta-ceniza: NO es un color de este valle
  venenoDenso: '#7d6f97',
  ceniza: '#6b6357', // lo que queda cuando pasó la bomba
  /* El umbral: la única línea "de gráfico" que este mundo se permite. Ámbar =
     señal, alerta amable. Nunca rojo de UI (regla de la paleta madre). */
  umbral: ACENTOS.ambar,
  umbralRoto: ACENTOS.cafeCereza,
};

/* -------------------------------------------------------------------------- */
/*  EL ELENCO — cada aliado con su OFICIO, no de adorno                        */
/* -------------------------------------------------------------------------- */

/*
 * `turno`: 'dia' | 'noche' | 'siempre' — el mundo corre un ciclo día/noche y
 * el elenco CAMBIA con él. Los cazadores de la noche (araña, tijereta,
 * carábido, murciélago) no son relleno: son el turno que nadie ve trabajar.
 *
 * `prioridad`: 1 = imprescindible (sale hasta en tier bajo), 2 = medio,
 * 3 = solo tier alto. La lección mínima (larva de mariquita + su arco + pulgón)
 * tiene que llegar hasta el teléfono más humilde. Si algo se cae, se cae el
 * adorno, nunca el argumento.
 *
 * `lecciones`: lo que el dibujo TIENE que dejar dicho. Es el contrato del arte:
 * si el bicho está pero su lección no se lee, el bicho está de adorno y sobra.
 */
export const ALIADOS = [
  {
    slug: 'larva-mariquita',
    nombre: 'Larva de mariquita',
    oficio: 'Se come el pulgón todo el día — más que el adulto.',
    presa: ['pulgon'],
    turno: 'dia',
    prioridad: 1,
    /* "Un cocodrilito negro con manchas naranjas, muy distinta al adulto
       redondo" — literal del corpus. */
    forma: 'cocodrilito',
    largo: 0.62,
    color: 'larvaCuerpo',
    mancha: 'larvaMancha',
    lecciones: [
      'NO se parece al adulto: por eso la matan creyendo que es plaga.',
      'Es la misma mariquita en otra etapa.',
      'Come más pulgón que el adulto.',
    ],
  },
  {
    slug: 'mariquita',
    nombre: 'Mariquita',
    oficio: 'Come pulgón. La cara conocida del ejército.',
    presa: ['pulgon'],
    turno: 'dia',
    prioridad: 1,
    forma: 'domo',
    largo: 0.44,
    color: 'mariquita',
    lecciones: ['La única que el campesino ya reconoce — su larva, no.'],
  },
  {
    slug: 'crisopa-larva',
    nombre: 'Larva de crisopa',
    oficio: 'El león de los áfidos: hace el trabajo pesado.',
    presa: ['pulgon', 'acaro', 'huevo'],
    turno: 'dia',
    prioridad: 2,
    forma: 'cocodrilito',
    largo: 0.5,
    color: 'crisopaCuerpo',
    mancha: 'larvaMancha',
    lecciones: ['La delicada es la adulta; la que come es esta.'],
  },
  {
    slug: 'crisopa',
    nombre: 'Crisopa',
    oficio: 'De adulta come polen; sus huevos van colgados de un alfiler.',
    presa: [],
    turno: 'dia',
    prioridad: 2,
    forma: 'alada-fina',
    largo: 0.46,
    color: 'crisopaCuerpo',
    lecciones: [
      'Necesita FLOR para comer de adulta: sin flores no se queda.',
      'Sus huevos con pedicelo parecen alfileres clavados en la hoja.',
    ],
  },
  {
    slug: 'avispa-parasitoide',
    nombre: 'Avispa parasitoide',
    oficio: 'Pone su huevo DENTRO del gusano. No pica a las personas.',
    presa: ['pulgon', 'oruga', 'broca'],
    turno: 'dia',
    prioridad: 1,
    forma: 'avispa',
    largo: 0.3,
    color: 'avispa',
    lecciones: [
      'Lo más espectacular del control biológico — y lo más invisible.',
      'La MOMIA es la prueba de que trabajó.',
      'Es chiquita: por eso nadie la ve y el amplio espectro la borra.',
    ],
  },
  {
    slug: 'sirfido-larva',
    nombre: 'Larva de sírfido',
    oficio: 'Gusanito ciego que come pulgón en cantidad.',
    presa: ['pulgon'],
    turno: 'dia',
    prioridad: 2,
    forma: 'gusanito',
    largo: 0.44,
    color: 'sirfidoLarva',
    /* EL ADULTO NO SE DIBUJA ACÁ. Ver ADULTO_SIRFIDO abajo. */
    lecciones: [
      'DOBLE OFICIO: el adulto poliniza, la larva depreda. Un solo bicho.',
      'La mosca que parece abeja es aliada: no hay que espantarla.',
    ],
  },
  {
    slug: 'arana',
    nombre: 'Araña',
    oficio: 'Caza de todo, sin preguntar.',
    presa: ['pulgon', 'oruga', 'mosca'],
    turno: 'noche',
    prioridad: 2,
    forma: 'arana',
    largo: 0.5,
    color: 'arana',
    lecciones: ['Turno de noche: trabaja cuando nadie mira.'],
  },
  {
    slug: 'tijereta',
    nombre: 'Tijereta',
    oficio: 'Cazadora nocturna; se esconde de día.',
    presa: ['pulgon', 'huevo'],
    turno: 'noche',
    prioridad: 3,
    forma: 'tijereta',
    largo: 0.5,
    color: 'tijereta',
    lecciones: ['Necesita refugio para pasar el día — rastrojo, no lote pelado.'],
  },
  {
    slug: 'carabido',
    nombre: 'Carábido',
    oficio: 'El escarabajo que patrulla el suelo de noche.',
    presa: ['oruga', 'larva', 'babosa'],
    turno: 'noche',
    prioridad: 3,
    forma: 'escarabajo',
    largo: 0.56,
    color: 'carabido',
    lecciones: ['Vive en el SUELO: la labranza brutal y el veneno lo borran.'],
  },
  {
    slug: 'ave',
    nombre: 'Ave insectívora',
    oficio: 'Se lleva orugas del cultivo. Necesita percha.',
    presa: ['oruga', 'larva'],
    turno: 'dia',
    prioridad: 3,
    forma: 'ave',
    largo: 1.1,
    color: 'ave',
    lecciones: ['Sin cerca viva ni árbol, no tiene dónde pararse a trabajar.'],
  },
  {
    slug: 'murcielago',
    nombre: 'Murciélago',
    oficio: 'Se come las polillas que de día no se ven.',
    presa: ['polilla'],
    turno: 'noche',
    prioridad: 3,
    forma: 'murcielago',
    largo: 1.3,
    color: 'murcielago',
    lecciones: [
      'Las polillas que caza son las que ponen los huevos del cogollero.',
      'Aliado silencioso que casi nadie tiene en cuenta.',
    ],
  },
];

/*
 * EL SÍRFIDO ADULTO NO SE DIBUJA ACÁ — Y ES A PROPÓSITO.
 *
 * `mundo3d/polinizadores/` ya lo tiene resuelto como polinizador (es una de sus
 * piezas: la mosca disfrazada de abeja). Redibujarlo sería exactamente el bug que
 * la casa persigue: el mismo bicho con dos personalidades. Lo que ESTE mundo
 * aporta es la MITAD QUE ALLÁ NO ESTÁ: la larva depredadora. Juntas cuentan el
 * doble oficio; separadas, cada una cuenta la suya sin mentir.
 *
 * Cuando `polinizadores/` aterrice en `dev`, el cableado es un import — no un
 * dibujo nuevo:
 *
 *     import { EnjambrePolinizadores } from '../polinizadores';
 *
 * Este puntero existe para que ese día nadie caiga en la tentación de dibujarlo
 * de nuevo "para que combine".
 */
export const ADULTO_SIRFIDO = {
  vive_en: 'src/visual/mundo3d/polinizadores/',
  slug: 'sirfido',
  motivo:
    'El adulto ya está dibujado como polinizador. Acá solo va su larva ' +
    'depredadora: el otro turno del mismo bicho.',
};

/* -------------------------------------------------------------------------- */
/*  LOS INVISIBLES — hongos y bacteria: los que se comen al bicho por dentro   */
/* -------------------------------------------------------------------------- */

/*
 * Estos no son "bichos buenos" con patas: son el ejército que NI SIQUIERA tiene
 * cara. Se dibujan por su EFECTO, que es lo único que el campesino llega a ver:
 * la broca cubierta de pelusa blanca, la chiza verde momificada en el suelo, el
 * halo que protege la raíz. El efecto ES el personaje.
 */
export const INVISIBLES = [
  {
    slug: 'beauveria',
    nombre: 'Beauveria bassiana',
    tipo: 'hongo-entomopatogeno',
    /* "La broca cubierta de blanco" — el efecto ES la imagen. */
    efecto: 'cubre',
    color: 'beauveria',
    victima: ['broca', 'gusano-blanco', 'cogollero'],
    donde: 'fruto/tallo',
    prioridad: 2,
    lecciones: [
      'El hongo que se come al bicho — por dentro.',
      'No es peligroso para personas, animales ni plantas.',
      'AGROSAVIA: nim + Beauveria dio 96% de control del cogollero a 15 días.',
    ],
  },
  {
    slug: 'metarhizium',
    nombre: 'Metarhizium anisopliae',
    tipo: 'hongo-entomopatogeno',
    efecto: 'cubre',
    color: 'metarhizium',
    victima: ['chiza', 'gusano-blanco'],
    donde: 'suelo',
    prioridad: 3,
    lecciones: ['El verde: trabaja bajo tierra, contra la chiza y el gusano blanco.'],
  },
  {
    slug: 'trichoderma',
    nombre: 'Trichoderma',
    tipo: 'hongo-antagonista',
    /* No ataca insectos: PELEA CONTRA OTROS HONGOS. Es el matiz que casi
       siempre se pierde y que este dibujo tiene que salvar. */
    efecto: 'defiende',
    color: 'trichoderma',
    victima: ['rhizoctonia', 'pythium', 'fusarium'],
    donde: 'raiz/semillero',
    prioridad: 3,
    lecciones: [
      'NO come insectos: pelea contra los hongos malos del suelo.',
      'Protege la plántula de la chupadera. Prevención, no cura.',
    ],
  },
  {
    slug: 'bt',
    nombre: 'Bacillus thuringiensis',
    tipo: 'bacteria',
    efecto: 'ingesta',
    color: 'bt',
    victima: ['oruga'],
    donde: 'hoja',
    prioridad: 3,
    lecciones: [
      'Solo mata ORUGAS, y solo si se la comen.',
      'Selectivo: no toca escarabajos, avispas ni mariquitas.',
      'Honestidad: tampoco distingue una oruga plaga de una mariposa bonita.',
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  EL ARCO DE LA MARIQUITA — la lección central, como datos                   */
/* -------------------------------------------------------------------------- */

/*
 * Las cuatro etapas EN UNA SOLA HOJA, en orden y a la misma escala. No es una
 * lámina de biología: es la respuesta visual a "¿por qué mato a mi propia
 * aliada?". Cuando el ojo recorre huevo→larva→pupa→adulto y aterriza en el
 * bicho rojo que SÍ conoce, la larva deja de ser un gusano raro para siempre.
 *
 * Esa es toda la pedagogía del mundo, y no gasta una sola palabra.
 */
export const ARCO_MARIQUITA = [
  {
    etapa: 'huevo',
    dias: [0, 4],
    forma: 'huevos-racimo',
    color: 'larvaMancha',
    /* Amarillo-naranja, en racimo parado, CERCA de la colonia de pulgón: la
       madre pone la mesa servida. */
    nota: 'Puestos junto al pulgón: la comida ya está ahí cuando nacen.',
  },
  {
    etapa: 'larva',
    dias: [4, 22],
    forma: 'cocodrilito',
    color: 'larvaCuerpo',
    /* LA ETAPA LARGA: 18 de los ~30 días. La mayor parte de su vida la mariquita
       ES esta cosa oscura — y es cuando más come. Por eso la escena le da el
       primer plano a ella y no al adulto. */
    nota: 'La etapa MÁS LARGA y la que más come. La que matan por error.',
    protagonista: true,
  },
  {
    etapa: 'pupa',
    dias: [22, 28],
    forma: 'pupa',
    color: 'mariquita',
    nota: 'Quieta, pegada a la hoja. Parece muerta: no la barra.',
  },
  {
    etapa: 'adulto',
    dias: [28, 30],
    forma: 'domo',
    color: 'mariquita',
    nota: 'La única que todo el mundo reconoce — y la etapa más corta del cuento.',
  },
];

/* -------------------------------------------------------------------------- */
/*  LA TRIADA — qué necesitan para quedarse (o el ejército se va)              */
/* -------------------------------------------------------------------------- */

/*
 * Del corpus, textual: "Necesitan tres cosas: comida (que incluye algo de plaga
 * baja, no un cultivo completamente limpio), flores con floración escalonada
 * todo el año, y refugio". Las tres se DIBUJAN en la parcela viva y se dibujan
 * AUSENTES en la limpia. El contraste no se narra: se ve.
 *
 * La primera es la más difícil de tragar para el campesino, y por eso el mundo
 * insiste: el lote impecable, sin un solo bicho, es un lote SIN DEFENSA. La
 * plaga baja no es un fracaso — es la despensa.
 */
export const HABITAT = [
  {
    id: 'comida',
    que: 'Algo de plaga baja — siempre.',
    porque: 'Sin presa, el benéfico se va o se muere. El lote impecable es un lote indefenso.',
    seVe: 'En la parcela viva SIEMPRE quedan unos pulgones. Nunca llega a cero.',
  },
  {
    id: 'flores',
    que: 'Flor chiquita y abundante, escalonada todo el año.',
    /* Del corpus: cilantro a flor, hinojo, caléndula, compuestas. */
    especies: ['cilantro a flor', 'hinojo', 'caléndula', 'compuestas'],
    porque: 'Los adultos de avispa, crisopa y sírfido comen POLEN y NÉCTAR, no plaga.',
    seVe: 'Un borde florecido en la parcela viva; borde pelado en la limpia.',
  },
  {
    id: 'refugio',
    que: 'Cerca viva, rastrojo, franja sin cultivar.',
    porque: 'Es donde duermen de día los de turno de noche y donde se pasan la sequía.',
    seVe: 'Rastrojo y cerca viva al fondo de la viva; alambre pelado en la limpia.',
  },
];

/* -------------------------------------------------------------------------- */
/*  EL UMBRAL — la línea que decide si vale la pena gastar                     */
/* -------------------------------------------------------------------------- */

/*
 * "El umbral existe justamente para que usted no fumigue por miedo, sino por
 * evidencia". Es el concepto más caro de transmitir y el más rentable: fumigar
 * ANTES del umbral es perder plata DOS VECES — la del veneno y la del ejército
 * que uno mismo se acaba de matar.
 *
 * En la escena es una banda en el aire sobre las dos parcelas: la misma línea
 * para ambas. La viva se le acerca y nunca la cruza (los benéficos la aplanan
 * solos). La limpia la revienta después de fumigar. Nadie tiene que explicarlo.
 */
export const UMBRAL = {
  /* El nivel, en la escala normalizada de `dinamicaPlaga` (0..1). */
  nivel: 0.55,
  que: 'El punto donde la plaga ya le baja la cosecha de verdad.',
  antes: 'Gastar acá es perder plata Y matar al ejército. La plaga baja no duele.',
  despues: 'Acá sí conviene actuar — con lo más selectivo que haya, no con la bomba.',
  /* Un umbral REAL y citable, para que la banda no sea un número inventado:
     Cenicafé fija la acción en broca por encima del 2% de frutos infestados,
     con más de la mitad en posición A o B (recién entrando). */
  ejemploReal: {
    plaga: 'broca del café',
    fuente: 'Cenicafé',
    regla: '>2% de frutos infestados, con más de la mitad en posición A o B',
  },
  /* Y el contra-ejemplo que más se repite en el corpus: */
  contraejemplo: {
    caso: 'tres pulgones en una hoja',
    respuesta: 'No se fumiga: se anota y se sigue mirando. Se resuelve solo en 1–2 semanas.',
  },
};

/* -------------------------------------------------------------------------- */
/*  LAS DOS PARCELAS — el espejo                                              */
/* -------------------------------------------------------------------------- */

/*
 * EL MISMO CULTIVO, LA MISMA PLAGA, EL MISMO CLIMA. Solo cambia una decisión.
 * Todo lo demás es idéntico a propósito: si algo más cambiara, el campesino
 * podría echarle la culpa a otra cosa. Es un experimento controlado dibujado.
 */
export const PARCELAS = [
  {
    id: 'viva',
    lado: -1,
    nombre: 'Con ejército',
    borde: 'flores',
    fondo: 'rastrojo',
    suelo: 'sueloVivo',
    fumiga: false,
    /* Los benéficos VIVEN acá porque tienen las tres cosas. */
    habitat: ['comida', 'flores', 'refugio'],
  },
  {
    id: 'limpia',
    lado: 1,
    nombre: 'Sin ejército',
    borde: 'pelado',
    fondo: 'alambre',
    suelo: 'sueloPelado',
    /* Fumiga de amplio espectro apenas ve el primer bicho — por miedo, no por
       evidencia. Es la decisión que el mundo entero está discutiendo. */
    fumiga: true,
    fumigaSemana: 3,
    habitat: [],
  },
];

/* -------------------------------------------------------------------------- */
/*  EL RELATO — lo que la escena tiene que dejar dicho, sin una palabra        */
/* -------------------------------------------------------------------------- */

/*
 * Contrato del arte. Si al final una de estas frases no se lee EN EL DIBUJO,
 * el mundo falló, por bonito que haya quedado. Se dejan escritas acá para que
 * cualquiera que toque esta carpeta pueda medir contra qué.
 */
export const RELATO = [
  'Ese gusano oscuro con manchas naranjas es una mariquita bebé. No lo mate.',
  'Matar todo = quedarse sin ejército. Y el que se recupera primero es el pulgón.',
  'Los aliados trabajan gratis, todo el día y toda la noche.',
  'Un poco de plaga es la comida que los mantiene. El lote impecable es indefenso.',
  'Sin flores y sin refugio no se quedan, aunque no los fumigue.',
  'Fumigar antes del umbral es pagar por perder.',
];

/* El ciclo del mundo: 12 semanas de cultivo en ~26 segundos. Suficiente para
   que la curva se lea sin que nadie se aburra; el rebote de la parcela limpia
   cae ~2/3 del ciclo, con tiempo de sobra para que la explosión se vea venir. */
export const CICLO = {
  semanas: 12,
  duracionSeg: 26,
  /* El día/noche corre más rápido que las semanas: 4 vueltas por ciclo, para
     que el turno de noche alcance a mostrarse sin volver el mundo un estrobo. */
  diasPorCiclo: 4,
};

/* Cuánto elenco aguanta cada tier. La lección mínima (prioridad 1) llega hasta
   el teléfono más humilde: larva + adulto + avispa + pulgón. Lo demás es lujo,
   y el lujo es lo primero que se cae. */
export const CUPO_POR_TIER = {
  alto: { prioridadMax: 3, pulgonMax: 120, aliadosMax: 26, hongos: true, noche: true },
  medio: { prioridadMax: 2, pulgonMax: 70, aliadosMax: 14, hongos: true, noche: true },
  bajo: { prioridadMax: 1, pulgonMax: 34, aliadosMax: 7, hongos: false, noche: false },
};

/** Los aliados que caben en un tier, ya filtrados por prioridad. */
export function elencoDeTier(tier) {
  const cupo = CUPO_POR_TIER[tier] || CUPO_POR_TIER.medio;
  return ALIADOS.filter(
    (a) => a.prioridad <= cupo.prioridadMax && (cupo.noche || a.turno !== 'noche'),
  );
}

/** Los invisibles (hongos/bacteria) que caben en un tier. */
export function invisiblesDeTier(tier) {
  const cupo = CUPO_POR_TIER[tier] || CUPO_POR_TIER.medio;
  if (!cupo.hongos) return [];
  return INVISIBLES.filter((h) => h.prioridad <= cupo.prioridadMax);
}
