/*
 * faunaAcuatica.data — registro de especies acuáticas/ribereñas por PISO
 * TÉRMICO (documental y citable). Separado del .jsx para el fast-refresh.
 *
 * Regla dura de biodiversidad: especies REALES colombianas con nombre
 * científico, por piso térmico. Este mundo es una quebrada-finca ANDINA del
 * gradiente FRÍO↔TEMPLADO (nacimiento en la loma → vega); el reservorio hace de
 * estanque de piscicultura de aguas frías. Nada de peces de tierra caliente.
 *
 * GROUNDING: DR fauna-acuatica-y-riberea-…-b158c9b7 (gemini grounded — AUNAP,
 * Instituto Humboldt, U.D.C.A., WWF Colombia, GBIF). El gemelo glm se descartó
 * (alucinaba filas repetidas). Cada nota visual proviene del DR.
 */

/** Peces del gradiente frío→templado. Colores derivados de la nota visual DR. */
export const FAUNA_AGUA_ESPECIES = {
  trucha: {
    comun: 'Trucha arcoíris',
    cientifico: 'Oncorhynchus mykiss',
    piso: 'frío (2000–3000 m) · piscicultura',
    grupo: 'pez',
    grounding: 'DR b158c9b7 (gemini) — piscicultura de aguas frías en Colombia',
    // Nota visual DR: plateado con franja rosada iridiscente y motas negras.
    cuerpo: '#c7ced4', vientre: '#eae6db', franja: '#e28aa2', aleta: '#aab3bb',
  },
  capitan: {
    comun: 'Capitán de la sabana',
    cientifico: 'Eremophilus mutisii',
    piso: 'frío (2000–3000 m) · endémico altiplano cundiboyacense',
    grupo: 'pez',
    grounding: 'DR b158c9b7 (gemini) — U.D.C.A., AUNAP, MinAmbiente',
    // Nota visual DR: cilíndrico, sin escamas, verde oliva con vermiculado
    // amarillo; bentónico (vive pegado al fondo), con barbillones.
    cuerpo: '#7d874c', vientre: '#9aa060', franja: null, aleta: '#69713f',
    bentonico: true,
  },
  sabaleta: {
    comun: 'Sabaleta',
    cientifico: 'Brycon henni',
    piso: 'templado (1000–2000 m)',
    grupo: 'pez',
    grounding: 'DR b158c9b7 (gemini) — dispersora de semillas en ríos andinos',
    // Nota visual DR: plateada, fusiforme, aletas amarillentas/rojizas.
    cuerpo: '#c0cad0', vientre: '#e8e3d6', franja: null, aleta: '#d8c079',
  },
};

/**
 * Aves de ribera, anfibios e insectos (documental — el .jsx los dibuja por
 * nombre). Todas del gradiente frío→templado, ver notas visuales del DR.
 */
export const FAUNA_AGUA_RIBERA = {
  garza: {
    comun: 'Garza real',
    cientifico: 'Ardea alba',
    piso: 'cálido→frío · humedales y reservorios andinos',
    grupo: 'ave',
    grounding: 'DR b158c9b7 (gemini) — depredador tope, bioindicador',
  },
  martin: {
    comun: 'Martín pescador amazónico',
    cientifico: 'Chloroceryle amazona',
    piso: 'templado',
    grupo: 'ave',
    grounding: 'DR b158c9b7 (gemini) — bioindicador de ribera sana',
  },
  mirla: {
    comun: 'Mirla de agua',
    cientifico: 'Cinclus leucocephalus',
    piso: 'frío · ríos y quebradas de montaña',
    grupo: 'ave',
    grounding: 'DR b158c9b7 (gemini) — bioindicador de buena calidad de agua',
  },
  rana: {
    comun: 'Rana de quebrada',
    cientifico: 'Pristimantis sp.',
    piso: 'templado→frío · endémicas de los Andes',
    grupo: 'anfibio',
    grounding: 'DR b158c9b7 (gemini) — Instituto Humboldt',
  },
  libelula: {
    comun: 'Libélula',
    cientifico: 'Orden Odonata',
    piso: 'transversal · adultos sobre la lámina',
    grupo: 'insecto',
    grounding: 'DR b158c9b7 (gemini) — bioindicador de agua limpia',
  },
};
