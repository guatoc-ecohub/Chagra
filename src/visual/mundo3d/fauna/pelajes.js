/*
 * pelajes — el PELAJE, LA PLUMA Y LA PIEL de la fauna emblemática, derivados
 * de la paleta madre.
 *
 * La paleta madre (paleta/GUIA.md §1) es tajante: "nunca un hex nuevo sin
 * preguntarle a la paleta" y "¿falta un color? primero busque el pariente más
 * cercano y derívelo con mezclar(a, b, t)". La paleta nació de la FLORA, la
 * TIERRA y el AGUA — no tiene pelaje de oso ni gorguera de colibrí. Y como
 * `paleta/` es de otra rama y no se toca, la salida legítima es esta: aquí NO
 * se inventa ni un hex, se DERIVA cada pelaje de sus parientes de la paleta y
 * se deja escrita la receta de la mezcla al lado.
 *
 * Que la mezcla sea trazable no es burocracia: es la razón por la que el jaguar
 * y la corteza del quenual pertenecen al mismo cuadro. Un pardo sacado del ojo
 * se despega del mundo aunque nadie sepa decir por qué.
 *
 * REGISTRO: esto es la fauna REALISTA del monte, no los 9 bichos rubber-hose.
 * Los tokens de `creatures/_faunaRubberTokens.js` son de ESE otro registro
 * (caricatura con alma, aprobada) y no se importan aquí a propósito: mezclar
 * los dos registros es exactamente lo que hay que evitar.
 *
 * VERACIDAD DEL COLOR: los patrones (roseta con centro, anteojos crema, motas
 * en hilera, gorguera iridiscente) salen de la biología real de cada especie
 * — ver la nota de fuente en `faunaEmblematica.js`. La paleta decide el TONO;
 * la especie decide DÓNDE va cada mancha.
 */
import { mezclar, VERDES, TIERRAS, CORTEZAS, AGUAS, ACENTOS, NEUTROS } from '../paleta';

/* -------------------------------------------------------------------------- */
/*  DANTA DE MONTAÑA — Tapirus pinchaque                                      */
/*  El único tapir LANUDO del mundo: el pelaje es su adaptación al páramo.    */
/* -------------------------------------------------------------------------- */
export const DANTA = {
  /* pardo casi negro, lanudo: la tierra más honda oscurecida con tinta cálida
     (jamás negro puro — regla 3 de la paleta) */
  lana: mezclar(TIERRAS.cacao, NEUTROS.tinta, 0.45),
  /* el flanco levanta un punto hacia la turba: el pelo largo se aclara al sol */
  flanco: mezclar(mezclar(TIERRAS.cacao, NEUTROS.tinta, 0.45), TIERRAS.turba, 0.32),
  /* LOS LABIOS BLANCOS — la seña de la especie (con el ribete de la oreja) */
  labio: mezclar(NEUTROS.hueso, TIERRAS.vega, 0.25),
  ribeteOreja: mezclar(NEUTROS.hueso, TIERRAS.vega, 0.12),
  /* la pezuña: tinta entibiada con piedra de páramo */
  pezuna: mezclar(NEUTROS.tinta, TIERRAS.rocaParamo, 0.28),
  ojo: mezclar(NEUTROS.tinta, TIERRAS.cacao, 0.2),
};

/* -------------------------------------------------------------------------- */
/*  JAGUAR — Panthera onca                                                    */
/*  La roseta CON CENTRO es el dato diagnóstico: el leopardo tiene puntos      */
/*  llenos, el jaguar anillos con una mota adentro.                           */
/* -------------------------------------------------------------------------- */
const _leonado = mezclar(TIERRAS.camino, ACENTOS.ambar, 0.55);
export const JAGUAR = {
  leonado: _leonado,
  /* el omóplato un tono más hondo: el músculo del acecho (seña heredada de la
     ficha rubber-hose aprobada, que en esto acertó) */
  hombro: mezclar(_leonado, CORTEZAS.sieteCueros, 0.3),
  vientre: mezclar(NEUTROS.hueso, TIERRAS.vega, 0.4),
  roseta: NEUTROS.tinta, // el anillo
  rosetaCentro: mezclar(_leonado, TIERRAS.cacao, 0.45), // la mota de adentro
  morro: mezclar(NEUTROS.hueso, TIERRAS.vega, 0.45),
  trufa: mezclar(NEUTROS.tinta, CORTEZAS.encenillo, 0.2),
  /* el ojo ámbar y su LUMBRE: el tapetum lucidum es real, no fantasía. Ahí
     vive lo místico del jaguar sin volverlo monstruo (ver README §jaguar). */
  iris: mezclar(ACENTOS.ambar, ACENTOS.maizTextil, 0.4),
  lumbre: mezclar(ACENTOS.maizTextil, NEUTROS.hueso, 0.45),
  /* el índigo del mortiño es el ÚNICO frío con permiso: el velo de presencia */
  presencia: ACENTOS.indigo,
};

/* -------------------------------------------------------------------------- */
/*  PUMA — Puma concolor                                                      */
/*  El adulto es LISO: sin rosetas (solo el cachorro las tiene). Es el felino  */
/*  que el corpus documenta de verdad — el del ternero. Ver README §correcciones. */
/* -------------------------------------------------------------------------- */
const _pumaLeonado = mezclar(TIERRAS.camino, TIERRAS.vega, 0.35);
export const PUMA = {
  leonado: _pumaLeonado,
  hombro: mezclar(_pumaLeonado, TIERRAS.siembra, 0.22),
  vientre: mezclar(NEUTROS.hueso, TIERRAS.vega, 0.5),
  /* la máscara: hocico y dorso de oreja oscuros — la seña del puma */
  mascara: mezclar(TIERRAS.cacao, NEUTROS.tinta, 0.3),
  morro: mezclar(NEUTROS.hueso, TIERRAS.vega, 0.35),
  trufa: mezclar(NEUTROS.tinta, CORTEZAS.encenillo, 0.25),
  iris: mezclar(ACENTOS.ambar, VERDES.paramoLiquen, 0.35),
  lumbre: mezclar(ACENTOS.maizTextil, NEUTROS.hueso, 0.5),
};

/* -------------------------------------------------------------------------- */
/*  OSO ANDINO / DE ANTEOJOS — Tremarctos ornatus                             */
/*  Dos zonas claras DISTINTAS: el anteojo y el morro. Confundirlas en una     */
/*  sola mancha es el error clásico que lo vuelve un oso genérico.            */
/* -------------------------------------------------------------------------- */
export const OSO = {
  pelaje: mezclar(NEUTROS.tinta, TIERRAS.cacao, 0.35),
  panza: mezclar(mezclar(NEUTROS.tinta, TIERRAS.cacao, 0.35), TIERRAS.turba, 0.25),
  /* LOS ANTEOJOS: crema alrededor del ojo, con borde tenue que los define */
  anteojo: mezclar(NEUTROS.hueso, TIERRAS.vega, 0.3),
  anteojoBorde: mezclar(TIERRAS.camino, TIERRAS.cacao, 0.35),
  /* el MORRO es más claro y MÁS PARDO que el anteojo: no son el mismo crema */
  morro: mezclar(TIERRAS.vega, TIERRAS.camino, 0.4),
  /* el babero del pecho: el crema que baja de la garganta */
  pecho: mezclar(NEUTROS.hueso, ACENTOS.maizTextil, 0.12),
  trufa: mezclar(NEUTROS.tinta, CORTEZAS.encenillo, 0.15),
  garra: mezclar(TIERRAS.vega, NEUTROS.tinta, 0.35),
  ojo: NEUTROS.tinta,
};

/* -------------------------------------------------------------------------- */
/*  TIGRILLO — Leopardus sp.                                                  */
/*  El corpus reconoce que "tigrillo" cubre VARIAS especies y nunca fija el    */
/*  binomio ("del tamaño de un gato grande a mediano según la especie").      */
/* -------------------------------------------------------------------------- */
const _tigrilloLeonado = mezclar(TIERRAS.camino, ACENTOS.maizTextil, 0.35);
export const TIGRILLO = {
  leonado: _tigrilloLeonado,
  vientre: mezclar(NEUTROS.hueso, TIERRAS.vega, 0.35),
  roseta: NEUTROS.tinta,
  rosetaCentro: mezclar(_tigrilloLeonado, CORTEZAS.encenillo, 0.45),
  morro: mezclar(NEUTROS.hueso, TIERRAS.vega, 0.4),
  trufa: mezclar(NEUTROS.tinta, ACENTOS.cochinilla, 0.18),
  /* el ojo nocturno: pupila enorme, iris que apenas se ve */
  iris: mezclar(VERDES.paramoLiquen, ACENTOS.ambar, 0.3),
  lumbre: mezclar(NEUTROS.hueso, ACENTOS.maizTextil, 0.3),
};

/* -------------------------------------------------------------------------- */
/*  BORUGO — Cuniculus taczanowskii                                           */
/*  Las MOTAS EN HILERA por el flanco son la firma (no salpicadas al azar).    */
/*  EL ANIMAL DE CIERRE: en la vereda lo cazan; aquí va vivo y digno.          */
/* -------------------------------------------------------------------------- */
export const BORUGO = {
  pardo: mezclar(CORTEZAS.encenillo, TIERRAS.cacao, 0.35),
  lomo: mezclar(mezclar(CORTEZAS.encenillo, TIERRAS.cacao, 0.35), NEUTROS.tinta, 0.3),
  mota: mezclar(NEUTROS.hueso, TIERRAS.vega, 0.2),
  panza: mezclar(TIERRAS.vega, NEUTROS.hueso, 0.4),
  trufa: mezclar(NEUTROS.tinta, CORTEZAS.encenillo, 0.2),
  bigote: mezclar(NEUTROS.hueso, TIERRAS.vega, 0.15),
  /* el ojo grande y nocturno, con la luna adentro */
  ojo: mezclar(NEUTROS.tinta, TIERRAS.cacao, 0.25),
  lunaEnElOjo: mezclar(NEUTROS.hueso, NEUTROS.nieve, 0.4),
};

/* -------------------------------------------------------------------------- */
/*  COLIBRÍ DE PÁRAMO — Oxypogon guerinii (barbudito / chivito)               */
/*  Endémico de Colombia. OJO: NO es el turquesa de pico largo del imaginario  */
/*  — es PARDO, de PICO CORTO Y RECTO, con cresta blanca y barba iridiscente.  */
/*  Ver README §correcciones.                                                  */
/* -------------------------------------------------------------------------- */
export const COLIBRI = {
  dorso: mezclar(CORTEZAS.roble, VERDES.paramoHoja, 0.35),
  vientre: mezclar(TIERRAS.vega, NEUTROS.hueso, 0.35),
  /* LA CRESTA eréctil: blanca con la raya negra */
  cresta: NEUTROS.hueso,
  crestaRaya: NEUTROS.tinta,
  pico: mezclar(NEUTROS.tinta, CORTEZAS.raicilla, 0.25),
  /* la lengua bífida, que sale MÁS ALLÁ del pico y lame 15-20 veces/segundo */
  lengua: mezclar(ACENTOS.florDeMonte, NEUTROS.hueso, 0.45),
  pata: mezclar(NEUTROS.tinta, TIERRAS.turba, 0.3),
  ojo: NEUTROS.tinta,
  /*
   * LA BARBA IRIDISCENTE — estructura, no pintura.
   *
   * El tornasol del colibrí NO es pigmento: es interferencia de película
   * delgada en las bárbulas de la pluma. Por eso el color depende del ÁNGULO
   * con que lo mirás, no de qué tan iluminado esté. Y la física tiene
   * dirección: a mayor ángulo de incidencia, el reflejo se corre hacia el
   * AZUL (blue-shift). Esta rampa es esa física, con colores de la paleta:
   *
   *   de frente  → verde frío (el verde-azul de la barba del Oxypogon)
   *   oblicuo    → el azul del agua (el único azul con permiso)
   *   rasante    → el índigo del mortiño (el corrimiento al violeta)
   *
   * `ColibriGuardian` recorre esta rampa POR FRAME según el ángulo real a la
   * cámara. Ver `iridiscencia.js`.
   */
  barbaRampa: [VERDES.frio, AGUAS.viva, ACENTOS.indigo],
  /* el destello del filo, cuando la barba pega justo contra la luz */
  barbaLumbre: mezclar(AGUAS.espuma, AGUAS.viva, 0.35),
};

/* -------------------------------------------------------------------------- */
/*  RANA ARLEQUÍN — Atelopus (muisca / lozanoi), del páramo                   */
/*  APOSEMATISMO: el oro y el negro NO son adorno, son una ADVERTENCIA. El     */
/*  animal es tóxico y lo anuncia. Por eso son los únicos colores del cuadro   */
/*  que tienen permiso de gritar — y son de `ACENTOS`, "a cucharadas".        */
/* -------------------------------------------------------------------------- */
export const RANA = {
  oro: mezclar(ACENTOS.maizTextil, ACENTOS.guayacan, 0.4),
  mancha: NEUTROS.tinta, // el negro del arlequín
  vientre: mezclar(ACENTOS.maizTextil, NEUTROS.hueso, 0.45),
  /* los discos de los dedos, con los que se agarra de la piedra mojada */
  disco: mezclar(ACENTOS.maizTextil, NEUTROS.hueso, 0.6),
  ojo: NEUTROS.tinta,
  /* la piel HÚMEDA: el brillo especular es la firma del anfibio. Es el único
     de la fauna que se ve mojado — y por eso la sequía es su tragedia. */
  humedad: AGUAS.espuma,
};

/* -------------------------------------------------------------------------- */
/*  ÁGUILA DE PÁRAMO — Geranoaetus melanoleucus                               */
/*  La rapaz que el páramo colombiano SÍ tiene (fuente IAvH). El "águila real" */
/*  (Aquila chrysaetos) es paleártica: no existe aquí. Ver README §correcciones.*/
/* -------------------------------------------------------------------------- */
export const AGUILA = {
  /* pizarra: el gris CÁLIDO de la lámina oscurecido — pecho y capucha */
  pizarra: mezclar(NEUTROS.lamina, NEUTROS.tinta, 0.62),
  /* el ala vermiculada, más clara que el pecho */
  ala: mezclar(NEUTROS.lamina, TIERRAS.rocaParamo, 0.4),
  plumaLarga: mezclar(NEUTROS.lamina, NEUTROS.tinta, 0.45),
  /* el vientre BLANCO: lo que se le ve desde abajo cuando planea en círculo */
  vientre: mezclar(NEUTROS.hueso, NEUTROS.cal, 0.4),
  /* la cera y las patas amarillas de la rapaz */
  cera: ACENTOS.maizTextil,
  pico: mezclar(NEUTROS.tinta, NEUTROS.lamina, 0.2),
  iris: mezclar(TIERRAS.camino, ACENTOS.ambar, 0.3),
};

/* El índice, para consumidores que resuelven por id (la escena, un preview). */
export const PELAJES = {
  danta: DANTA,
  jaguar: JAGUAR,
  puma: PUMA,
  oso: OSO,
  tigrillo: TIGRILLO,
  borugo: BORUGO,
  colibri: COLIBRI,
  rana: RANA,
  aguila: AGUILA,
};
