/*
 * paletaDano — los colores del daño, sacados de las FOTOS, no del gusto.
 *
 * Por qué esta paleta no importa `../mundo3d/paleta`:
 *   1. `paletaMadre` cuelga de `atmosferaMadre`, que importa `three`. Meter
 *      eso en una lámina SVG arrastraría el motor 3D entero a un pliego de
 *      papel. Las láminas son de CERO dependencias (regla de `src/visual/
 *      laminas`), y así se quedan.
 *   2. La paleta madre no tiene —ni debe tener— el naranja de la roya ni el
 *      pardo de una pudrición. Esos colores no son decisión de arte: son el
 *      color que TIENE la cosa en la foto. Inventarlos sería el error.
 *
 * Lo que sí se hereda es el criterio: papel crema + tinta sepia (idéntico a
 * `laminas/LaminaCafeto`, para que el cuaderno se lea como uno solo), verdes
 * andinos con tierra adentro, y CERO rojo-catástrofe de UI (regla 4 de la
 * paleta madre: el rojo es cochinilla o cereza, no una alarma).
 *
 * Cada color de daño anota la foto de `public/plaga-images/` de donde salió.
 */

/* ------------------------------------------------------------------ */
/* EL PLIEGO — mismo papel y misma tinta que las láminas de la casa.    */
/* ------------------------------------------------------------------ */
export const PLIEGO = {
  papel: '#f4ead2',
  papelHondo: '#efe3c6', // fondo de recuadro (detalle)
  borde: '#d8c39a',
  bordeSuave: '#e0d0a8',
  dobles: '#e6d6ae', // la esquina doblada
};

export const TINTA = {
  fuerte: '#3f2d17', // titulares
  media: '#4f3a20', // rótulo
  suave: '#8a7350', // nota al pie, cursiva
  guia: '#9a8355', // líneas guía y reglas
  punto: '#7a6540', // el puntico del rótulo
};

/* ------------------------------------------------------------------ */
/* LA HOJA SANA — Coffea arabica, hoja brillante de sombrío.           */
/* Verdes andinos "con tierra adentro" (criterio de la paleta madre:    */
/* VERDES.trabajo #5f8a3f / VERDES.monte #3f6f3a son los parientes).    */
/* Tomados de `hemileia_vastatrix.jpg` y `cercospora_coffeicola.jpg`.   */
/* ------------------------------------------------------------------ */
export const HOJA_SANA = {
  haz: '#4d7a38', // la cara de arriba, verde franco
  hazHondo: '#3a6029', // la lámina en sombra, entre venas
  envesFondo: '#7d9a56', // el envés es MÁS PÁLIDO y mate que el haz
  borde: '#2f4d20',
  vena: '#6f9a4a', // las venas van más CLARAS que la lámina (foto)
  venaSurco: '#33551f', // el surco hundido de la vena (lámina abullonada)
  brillo: '#8fb463', // el lustre del haz (hoja glossy)
  peciolo: '#6b7f33',
  tallo: '#5f7a35',
};

/* ------------------------------------------------------------------ */
/* PLAGA — el color de un animal y de su rastro.                       */
/* De `spodoptera_frugiperda.jpg` + `mocis_latipes.jpg` (el gusano) y   */
/* de `hypothenemus_hampei.jpg` (el aserrín de la broca).              */
/* ------------------------------------------------------------------ */
export const PLAGA = {
  /* el gusano: pardo terroso con bandas, NUNCA un verde de caricatura */
  cuerpo: '#a98a63',
  cuerpoClaro: '#c3a781',
  banda: '#6d5137', // la banda lateral oscura que recorre el cuerpo
  bandaFina: '#8a6c48',
  cabeza: '#6b4a2c', // cápsula cefálica, más oscura y dura
  cabezaMarca: '#c9b48c', // la "Y" invertida pálida de la frente
  pata: '#5b4128',
  /* el rastro. Ojo: en la mata de verdad la caquita es verde-parda y casi no
     se ve contra la hoja — por eso mismo la gente no la busca. En la lámina
     va un punto más oscura, porque acá el trabajo es ENSEÑAR a verla; si se
     mimetiza como en el campo, la lámina no enseña nada. */
  frass: '#312811',
  frassClaro: '#584a24',
  mordidaFilo: '#5a3a1c', // EL FILO PARDO de la herida cicatrizada
  mordidaHalo: '#b7a63f', // el amarilleo alrededor del corte
  hueco: '#e8dcc0', // por el hueco se ve el papel (la hoja no está)
};

/* ------------------------------------------------------------------ */
/* ENFERMEDAD — hongo. Cada uno con su color y su forma.               */
/* ------------------------------------------------------------------ */
export const ENFERMEDAD = {
  /* ROYA · Hemileia vastatrix — `hemileia_vastatrix.jpg`.
     El polvo naranja del envés. La rampa va del naranja quemado del centro
     al amarillo pálido de la orilla: así se ve el montoncito de esporas. */
  royaCentro: '#b4621a',
  royaMedio: '#d98b2b',
  royaBorde: '#e9a83c',
  royaPalido: '#f0c862',
  royaHalo: '#c9c057', // el amarilleo clorótico que rodea el polvo
  royaHazMancha: '#c4bd52', // por el HAZ solo se ve una mancha amarilla

  /* MANCHA DE HIERRO / ojo de gallo · Cercospora coffeicola —
     `cercospora_coffeicola.jpg`. LA lección de "patrón": halo amarillo
     brillante + borde definido + centro gris ceniza. */
  cercoHalo: '#d3d84a',
  cercoBorde: '#4a3b22',
  cercoCentro: '#8d8676',
  cercoCentroPalido: '#b5ad99',

  /* ANILLOS CONCÉNTRICOS · Alternaria — `alternaria_solani.jpg`.
     El "tiro al blanco": anillos dentro de la lesión parda. Y ojo al dato
     fino: la lesión SE FRENA en la vena y se pone angular. */
  anilloFondo: '#7d6944',
  anilloLinea: '#3c2e1c',
  anilloHalo: '#c6ce4d',
};

/* ------------------------------------------------------------------ */
/* DEFICIENCIA — no hay bicho ni mancha: hay hambre.                   */
/* Los amarillos de la clorosis: pálidos y LIMPIOS, sin borde pardo.   */
/* ------------------------------------------------------------------ */
export const DEFICIENCIA = {
  /* HIERRO: la lámina amarillea y la NERVADURA SE QUEDA VERDE → queda una
     redecilla verde sobre amarillo. Ataca las hojas NUEVAS. */
  hierroLamina: '#e4de79',
  hierroLaminaPalida: '#eee9a4',
  hierroVena: '#4d7a38', // el verde que NO se fue (= HOJA_SANA.haz)
  hierroVenaHalo: '#7ea24d', // el corredor verde a lado y lado de la vena

  /* NITRÓGENO: amarillea PAREJO y entero, de la punta hacia adentro, y
     empieza por las hojas VIEJAS (la mata se roba el nitrógeno de abajo
     para darle a los cogollos). Sin borde, sin halo, sin nada. */
  nitroViejo: '#cdc35c',
  nitroMedio: '#b9c256',
  nitroVerdeQueQueda: '#6d8f3f',
};

/* ------------------------------------------------------------------ */
/* CÓDIGO DE COLOR DE LAS TRES COLUMNAS                                */
/*                                                                     */
/* No es color de UI ni semáforo: cada categoría se rotula con EL COLOR */
/* DE SU PROPIA EVIDENCIA — el pardo del bicho, el naranja del polvo,   */
/* el amarillo del hambre. El color ya enseña antes de leer la palabra. */
/* ------------------------------------------------------------------ */
export const CATEGORIA = {
  plaga: { tinta: '#6b4a2a', chip: '#a98a63', nombre: 'PLAGA' },
  enfermedad: { tinta: '#a35a18', chip: '#d98b2b', nombre: 'ENFERMEDAD' },
  deficiencia: { tinta: '#8a7a20', chip: '#cdc35c', nombre: 'DEFICIENCIA' },
  duda: { tinta: '#5d6a72', chip: '#9fb0b8', nombre: 'NO SE SABE' },
};
