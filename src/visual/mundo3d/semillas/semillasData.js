/*
 * semillasData — el BANCO DE SEMILLAS CRIOLLAS en datos (three-free).
 *
 * La soberanía alimentaria es razón de ser de Chagra, y la semilla es su
 * corazón: quien guarda su semilla no depende de nadie. Este módulo es la
 * MEMORIA del banco: las variedades del mosaico (papas de colores, fríjoles
 * de mil pintas, maíces de la cordillera), los textos en usted y los
 * hotspots que la escena 3D (`EscenaBancoSemillas.jsx`) vuelve materia.
 *
 * REGLAS DE LA CASA que este archivo honra:
 *   - Ni un hex inventado: todo color viene de la paleta madre o se deriva
 *     con `mezclar` de un pariente aprobado (GUIA.md §1), con su porqué.
 *   - SIN MORALINA: la criolla se muestra por su valor (se adapta a SU tierra,
 *     se puede volver a sembrar), no regañando a quien compra certificada.
 *   - Solo datos y derivaciones (nada por frame). OJO: importa `../paleta`,
 *     que trae three por `mezclar` — cargar perezoso junto a la escena, como
 *     todo lo de mundo3d.
 *
 * Fuente de contenido: corpus teacher-soberania (selección de mata madre,
 *  secado, ceniza contra el gorgojo, custodios, casas de semillas, híbridos).
 */
import { ACENTOS, TIERRAS, VERDES, NEUTROS, mezclar } from '../paleta';
import { PALETA_ANDINA } from '../artesaniaAndina.js';

/* ------------------------------------------------------------------ */
/* FORMAS de semilla: una sola esfera low-poly instanciada, escalada    */
/* no-uniforme por forma. La silueta hace la especie, no la textura.    */
/* ------------------------------------------------------------------ */
export const FORMAS_SEMILLA = {
  grano: [1, 0.72, 0.55], // el diente de maíz: ancho, achatado
  rinon: [1.2, 0.68, 0.72], // el fríjol y el haba: alargado, panzudo
  redonda: [1, 0.94, 1], // papa de semilla, arveja
  menuda: [0.48, 0.4, 0.48], // quinua, amaranto: puntico de luz
  pepa: [1.15, 0.32, 0.8], // ahuyama, ají: plana y ancha
};

/* ------------------------------------------------------------------ */
/* EL MOSAICO — las variedades del banco. La variedad ES la riqueza:    */
/* no una semilla, muchas. Cada frasco es una herencia con nombre.      */
/* `color` es el grano; `pinta` (si hay) es el moteado del textil vivo. */
/* Notas en usted, cortas, para tooltips — saber campesino, no cátedra. */
/* ------------------------------------------------------------------ */
export const VARIEDADES = [
  {
    id: 'maizAmarillo',
    nombre: 'Maíz amarillo de la cordillera',
    color: ACENTOS.maizGrano,
    pinta: null,
    forma: 'grano',
    nota: 'El de las arepas de la casa. Guarde las mazorcas del centro de la mata madre.',
  },
  {
    id: 'maizBlanco',
    nombre: 'Maíz blanco harinoso',
    /* grano lechoso: el hueso de la casa apenas entibiado hacia el maíz */
    color: mezclar(NEUTROS.hueso, ACENTOS.maizGrano, 0.22),
    pinta: null,
    forma: 'grano',
    nota: 'Harinoso, de mute y envuelto. Sesenta años de adaptación caben en un puño.',
  },
  {
    id: 'maizMorado',
    nombre: 'Maíz morado',
    /* el índigo del mortiño con un dejo de cochinilla: grano de chicha */
    color: mezclar(ACENTOS.indigo, ACENTOS.cochinilla, 0.28),
    pinta: null,
    forma: 'grano',
    nota: 'El de la chicha. Si se pierde, no hay casa comercial que lo venda de vuelta.',
  },
  {
    id: 'maizCapio',
    nombre: 'Maíz rojo capio',
    /* cochinilla aterrada: el rojo del grano curado, no el rojo de UI */
    color: mezclar(ACENTOS.cochinilla, TIERRAS.cacao, 0.4),
    pinta: null,
    forma: 'grano',
    nota: 'Rojo de tierra fría. En la misma mazorca a veces vienen tres colores.',
  },
  {
    id: 'frijolCargamanto',
    nombre: 'Fríjol cargamanto',
    /* crema moteada: la cal de la pared apenas sonrojada… y sus mil pintas */
    color: mezclar(NEUTROS.cal, ACENTOS.cochinilla, 0.22),
    pinta: mezclar(ACENTOS.cochinilla, TIERRAS.cacao, 0.3),
    forma: 'rinon',
    nota: 'El de las mil pintas: no hay dos granos iguales, y todos son de la casa.',
  },
  {
    id: 'frijolNegro',
    nombre: 'Fríjol negro de vara',
    color: NEUTROS.tinta,
    pinta: null,
    forma: 'rinon',
    nota: 'Trepa por la caña del maíz: las dos semillas se guardan juntas.',
  },
  {
    id: 'frijolRojo',
    nombre: 'Fríjol rojo cerinza',
    /* cochinilla honda, hacia la tinta: el rojo vino del grano seco */
    color: mezclar(ACENTOS.cochinilla, NEUTROS.tinta, 0.3),
    pinta: null,
    forma: 'rinon',
    nota: 'De ladera fría. Escoja la mata que cargó parejo, no el grano más grande del bulto.',
  },
  {
    id: 'papaCriolla',
    nombre: 'Papa criolla amarilla',
    /* el maíz textil aterrado: la piel dorada de la criolla */
    color: mezclar(ACENTOS.maizTextil, TIERRAS.camino, 0.34),
    pinta: null,
    forma: 'redonda',
    nota: 'La semilla es el tubérculo sano de la mejor mata. Se guarda con luz difusa, que verdee.',
  },
  {
    id: 'papaMorada',
    nombre: 'Papa morada de páramo',
    /* índigo con tierra de siembra: la piel morada, opaca, de altura */
    color: mezclar(ACENTOS.indigo, TIERRAS.siembra, 0.36),
    pinta: null,
    forma: 'redonda',
    nota: 'De las papas de colores que ya casi nadie siembra. Quien la guarda es biblioteca viva.',
  },
  {
    id: 'quinua',
    nombre: 'Quinua dorada',
    /* la vega clara dorada hacia el grano: puntitos de sol */
    color: mezclar(TIERRAS.vega, ACENTOS.maizGrano, 0.42),
    pinta: null,
    forma: 'menuda',
    nota: 'Menuda y brava para el frío. Bien seca suena como arena fina: esa es la señal.',
  },
  {
    id: 'arveja',
    nombre: 'Arveja de enredo',
    /* el brote secado hacia la vega: verde de grano curado, no de mata */
    color: mezclar(VERDES.brote, TIERRAS.vega, 0.38),
    pinta: null,
    forma: 'redonda',
    nota: 'Se deja secar en la mata, en la vaina, y se desgrana en la sombra.',
  },
  {
    id: 'haba',
    nombre: 'Haba de tierra fría',
    color: TIERRAS.camino,
    pinta: null,
    forma: 'rinon',
    nota: 'Grandota y noble. La vaina se cosecha ya parda, cuando cruje.',
  },
  {
    id: 'ahuyama',
    nombre: 'Ahuyama abuela',
    /* la pepa plana, clara: cal dorada hacia el maíz */
    color: mezclar(NEUTROS.cal, ACENTOS.maizGrano, 0.4),
    pinta: null,
    forma: 'pepa',
    nota: 'Las pepas se lavan de la baba, se secan a la sombra y quedan para el otro año.',
  },
];

/* La variedad por id (para hotspots y láminas). */
export const variedadPorId = (id) => VARIEDADES.find((v) => v.id === id) || null;

/* ------------------------------------------------------------------ */
/* COLORES DE LA ESCENA derivados (con su porqué, jamás hex suelto).    */
/* ------------------------------------------------------------------ */
export const TINTES_BANCO = {
  /* vasija de chamba: barro negro brillado — la tinta de la casa respirando
     apenas hacia la terracota del horno (así se ve la chamba real) */
  chamba: mezclar(NEUTROS.tinta, PALETA_ANDINA.terracota, 0.22),
  /* ceniza contra el gorgojo: la cal apagada hacia el gris cálido de lámina */
  ceniza: mezclar(NEUTROS.cal, NEUTROS.lamina, 0.45),
  /* vidrio del frasco: el hueso de la casa, casi aire */
  vidrio: NEUTROS.hueso,
  /* corcho / tapa de totumo: madera clara hacia la vega */
  corcho: mezclar(TIERRAS.vega, TIERRAS.camino, 0.5),
  /* calabazo curado: la vega dorada hacia el maíz (totumo seco al humo) */
  calabazo: mezclar(TIERRAS.vega, ACENTOS.maizGrano, 0.25),
  /* fique sin teñir: el crudo del textil andino (artesaniaAndina) */
  fique: PALETA_ANDINA.crudo,
  /* el gorgojo: tinta cálida apenas aterrada (bicho de costal, no de terror) */
  gorgojo: mezclar(NEUTROS.tinta, TIERRAS.turba, 0.35),
  /* la cinta de la mata madre: LA cochinilla del textil — se ve de lejos */
  cinta: ACENTOS.cochinilla,
  /* bolsa de semilla certificada: lámina impresa, digna (sin burla) */
  bolsa: NEUTROS.lamina,
};

/* ------------------------------------------------------------------ */
/* TEXTOS — en usted, colombiano, sin moralina. La escena los sirve     */
/* en hotspots; una lámina 2D puede servirlos igual.                    */
/* ------------------------------------------------------------------ */
export const TEXTOS_BANCO = {
  titulo: 'El banco de semillas',
  lema: 'La autonomía que cabe en un frasco.',
  mosaico:
    'Cada frasco es una herencia: papas de colores, fríjoles de mil pintas, maíces de la cordillera. La variedad ES la riqueza.',
  mataMadre:
    'La semilla no se escoge del bulto: se escoge LA MATA, viva, en el lote — la más sana, la que cargó parejo. Se marca con una cinta antes de cosechar.',
  guardado:
    'Seca, fresca y oscura: así se guarda. Frascos bien tapados, calabazos, costales de fique. Una capa de ceniza y el gorgojo se queda por fuera.',
  trueque:
    'La semilla circula, no se acumula: se cambia entre vecinos, se presta y se devuelve con creces. Así ha viajado la comida por la cordillera.',
  criolla:
    'La criolla se puede volver a sembrar: cada año se adapta más a SU tierra. De la híbrida no se guarda semilla — hay que comprarla otra vez. Las dos existen; saber la diferencia es la autonomía.',
  custodios:
    'Hay gente que guarda variedades que ya nadie siembra. Son bibliotecas vivas: sesenta años de ladera en un puñado de granos.',
};

/* ------------------------------------------------------------------ */
/* HOTSPOTS por defecto — mismo contrato del framework de mundos        */
/* ({ id, pos, label, view, data }); el host decide qué hace `view`.    */
/* Posiciones en coordenadas de la escena (ver layout del .geom).       */
/* ------------------------------------------------------------------ */
export const HOTSPOTS_BANCO = [
  {
    id: 'mosaico',
    pos: [-0.8, 2.62, -2.1],
    label: 'Cada frasco es una herencia',
    view: 'semillas-mosaico',
    data: { texto: TEXTOS_BANCO.mosaico },
  },
  {
    id: 'mata-madre',
    pos: [3.45, 1.75, -0.5],
    label: 'La mata madre se marca viva',
    view: 'semillas-mata-madre',
    data: { texto: TEXTOS_BANCO.mataMadre },
  },
  {
    id: 'gorgojo',
    pos: [-0.42, 0.95, -0.55],
    label: 'La ceniza guarda, el gorgojo ronda',
    view: 'semillas-guardado',
    data: { texto: TEXTOS_BANCO.guardado },
  },
  {
    id: 'trueque',
    pos: [1.5, 1.05, 0.9],
    label: 'La semilla circula',
    view: 'semillas-trueque',
    data: { texto: TEXTOS_BANCO.trueque },
  },
  {
    id: 'criolla',
    pos: [-3.0, 1.3, 0.55],
    label: 'La criolla vuelve cada año',
    view: 'semillas-criolla',
    data: { texto: TEXTOS_BANCO.criolla },
  },
];
