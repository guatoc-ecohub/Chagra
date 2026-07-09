/*
 * milpaFinca.js — datos del módulo "La milpa: maíz, fríjol y calabaza".
 *
 * La milpa (las "tres hermanas") es una asociación de cultivos ancestral de
 * Mesoamérica y los Andes: maíz + fríjol + calabaza sembrados JUNTOS, donde
 * cada uno le sirve a los otros. Este archivo reúne el contenido pedagógico y
 * lo GROUNDEA en las fuentes que Chagra ya tiene, sin inventar cifras:
 *
 *   · Grafo de conocimiento (public/grafo-relations.json): la relación
 *     COMPATIBLE_WITH confirma el triángulo maíz↔fríjol↔calabaza; los
 *     controladores biológicos salen de pest_controllers; el abono de fríjol,
 *     del biopreparado "Inoculante de Rhizobium (fijación de nitrógeno)".
 *   · Fichas de ciclo de cultivo (public/cycle-content/*.json): variedades
 *     campesinas colombianas con su piso térmico y sus notas de siembra.
 *   · ICBF — Tabla de Composición de Alimentos Colombianos (TCAC, 2015): el
 *     aporte nutricional por 100 g (public/nutricion-humana.json).
 *
 * Regla de honestidad (patrón del módulo Agua): toda cifra dura que no tenga
 * fuente se pinta como "dato en camino" (SlotPendiente), nunca como número
 * inventado. Las prácticas de siembra que son método universal se marcan como
 * ORIENTADORAS ("ajústelo a su tierra"), no como norma nacional.
 *
 * NO contiene dosis de agroquímicos: el manejo de plagas se resuelve con los
 * controladores biológicos y biopreparados del grafo.
 */

/* ── Fotos reales (Wikimedia Commons, licencia abierta) ─────────────────── */
export const FOTO_BASE_MILPA = '/milpa';

export const CREDITOS_FOTOS_MILPA = [
  { slug: 'asociacion', autor: 'Isabelle Fragniere', lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Association_culturale_ma%C3%AFs-Haricot-Courge_dans_la_r%C3%A9gion_du_Mixtepec_au_Mexique.JPG' },
  { slug: 'siembra', autor: 'Anna Juchnowicz', lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Three_Sisters_companion_planting_technique.jpg' },
  { slug: 'maiz', autor: 'Shixart1985', lic: 'CC BY 2.0', url: 'https://commons.wikimedia.org/wiki/File:Corn_cobs_drying_on_a_wall_in_a_rustic_setting.jpg' },
  { slug: 'frijol', autor: 'Hungda', lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Hoa_v%C3%A0_qu%E1%BA%A3_%C4%91%E1%BA%ADu_c%C3%B4_ve-_Phaseolus_vulgaris.JPG' },
  { slug: 'calabaza', autor: 'Alejandro Bayer Tamayo', lic: 'CC BY-SA 2.0', url: 'https://commons.wikimedia.org/wiki/File:Ahuyama_(curcubita_moschata)_-_Flickr_-_Alejandro_Bayer.jpg' },
  { slug: 'milpaviva', autor: 'Feria de Productores', lic: 'CC BY 2.0', url: 'https://commons.wikimedia.org/wiki/File:Milpa_llena_de_vida.jpg' },
];

/* ── Las tres hermanas: identidad de cada cultivo ───────────────────────── */
export const HERMANAS = [
  {
    id: 'maiz',
    slug: 'zea_mays',
    foto: 'maiz',
    nombre: 'Maíz',
    apodo: 'La hermana mayor',
    cientifico: 'Zea mays L.',
    color: 'amber',
    papel: 'Da el soporte',
    resumen: 'Crece alto y recto. Su caña es el tutor vivo por donde el fríjol trepa a buscar el sol.',
    grupo: 'energético',
  },
  {
    id: 'frijol',
    slug: 'phaseolus_vulgaris',
    foto: 'frijol',
    nombre: 'Fríjol',
    apodo: 'La hermana del medio',
    cientifico: 'Phaseolus vulgaris L.',
    color: 'rose',
    papel: 'Abona la tierra',
    resumen: 'Trepa por el maíz y, en sus raíces, fija el nitrógeno del aire: deja abono para las tres.',
    grupo: 'proteico',
  },
  {
    id: 'calabaza',
    slug: 'cucurbita_moschata',
    foto: 'calabaza',
    nombre: 'Calabaza',
    apodo: 'La hermana menor',
    cientifico: 'Cucurbita moschata · C. maxima',
    color: 'orange',
    papel: 'Cuida el suelo',
    resumen: 'Sus hojas anchas tapan la tierra: guardan la humedad, dan sombra y ahogan la maleza.',
    grupo: 'protector',
  },
];

/* ── Por qué funcionan JUNTAS (el corazón de la asociación) ──────────────
 * Cada rol está groundeado: la compatibilidad, en la relación COMPATIBLE_WITH
 * del grafo (maíz↔fríjol↔calabaza son mutuamente compatibles); la fijación de
 * nitrógeno, en el biopreparado de Rhizobium del grafo y en la ficha de ciclo
 * del fríjol Bola Roja ("Fija nitrógeno atmosférico, Rhizobium leguminosarum"). */
export const POR_QUE_JUNTAS = [
  {
    id: 'soporte',
    hermana: 'Maíz',
    icono: 'soporte',
    titulo: 'El maíz le pone el hombro al fríjol',
    detalle: 'El maíz se siembra primero. Cuando ya está firme, el fríjol nace a su pie y trepa por la caña buscando luz — así no hay que ponerle varas ni alambre. Un tutor que se come.',
    fuente: 'Grafo Chagra: Maíz COMPATIBLE_WITH Fríjol',
  },
  {
    id: 'nitrogeno',
    hermana: 'Fríjol',
    icono: 'nitrogeno',
    titulo: 'El fríjol fija el nitrógeno del aire',
    detalle: 'En las raíces del fríjol vive la bacteria Rhizobium, que toma el nitrógeno del aire y lo deja en la tierra en forma de abono. El maíz es muy comelón de nitrógeno: el fríjol se lo devuelve.',
    fuente: 'Grafo Chagra: biopreparado "Inoculante de Rhizobium para fríjol (fijación de nitrógeno)" · Ficha de ciclo del fríjol Bola Roja',
  },
  {
    id: 'cobertura',
    hermana: 'Calabaza',
    icono: 'cobertura',
    titulo: 'La calabaza le hace la cama al suelo',
    detalle: 'Las hojas anchas de la calabaza se riegan por el piso y lo tapan: guardan la humedad, le hacen sombra a la maleza para que no salga, y los pelitos de sus guías estorban a los animales que rondan la mata.',
    fuente: 'Grafo Chagra: Calabaza COMPATIBLE_WITH Maíz y Fríjol',
  },
];

/* Cierre nutricional de la asociación (aporte ICBF, ver NUTRICION_MILPA). */
export const CIERRE_ASOCIACION = {
  titulo: 'Y en el plato se completan',
  detalle: 'El maíz da energía pero le falta un aminoácido (la lisina); el fríjol lo tiene de sobra. Juntos, maíz y fríjol arman una proteína completa — la razón de que el campo colombiano viva de arepa con fríjol. La calabaza suma la vitamina A.',
  fuente: 'Principio de complementación proteica · valores ICBF (TCAC 2015)',
};

/* ── Variedades campesinas colombianas ──────────────────────────────────
 * Todas existen como ficha de ciclo en el catálogo (public/cycle-content/).
 * Los datos de porte, piso térmico y uso salen de esas fichas. */
export const VARIEDADES = {
  maiz: {
    nombre: 'Maíz',
    color: 'amber',
    items: [
      { slug: 'zea_mays', nombre: 'Maíz criollo', cientifico: 'Zea mays L.', piso: 'frío · templado · caliente', nota: 'La semilla de la casa, guardada de cosecha en cosecha. Se siembra directo en el sitio.' },
      { slug: 'zea_mays_capio', nombre: 'Maíz Capio', cientifico: "cv. 'Capio'", piso: 'frío (altoandino)', nota: 'Grano grande y harinoso, amarillo-naranja. Ciclo de 6 a 8 meses. Para harinas, mazamorra y arepa.' },
      { slug: 'zea_mays_negro_paramo', nombre: 'Maíz Negro de Páramo', cientifico: "cv. 'Negro de Páramo'", piso: 'frío · páramo', nota: 'Tradicional cundiboyacense, grano morado-negro rico en antocianinas. Ciclo largo (7 a 9 meses).' },
    ],
  },
  frijol: {
    nombre: 'Fríjol',
    color: 'rose',
    items: [
      { slug: 'phaseolus_vulgaris', nombre: 'Fríjol arbustivo / voluble', cientifico: 'Phaseolus vulgaris L.', piso: 'frío · templado · caliente', nota: 'Dos portes: el arbustivo (matica baja, se sostiene solo) y el voluble (trepador, necesita tutor — o el maíz).' },
      { slug: 'phaseolus_vulgaris_bola_roja', nombre: 'Fríjol Bola Roja', cientifico: "cv. 'Bola Roja'", piso: 'frío · templado', nota: 'Nativo cundiboyacense, voluble, grano grande y rojo. Se siembra asociado con maíz Capio, que le sirve de soporte.' },
      { slug: 'phaseolus_vulgaris_nuna', nombre: 'Fríjol nuña', cientifico: 'cv. nuña', piso: 'frío · templado', nota: 'Voluble, de milpa andina. El grano seco se tuesta y revienta como crispeta.' },
      { slug: 'phaseolus_lunatus_andino', nombre: 'Fríjol Lima andino', cientifico: 'Phaseolus lunatus L. cv. andino', piso: 'templado · frío', nota: 'Voluble, grano grande y aplanado en forma de luna. Otra hermana que también trepa por el maíz.' },
    ],
  },
  calabaza: {
    nombre: 'Calabaza / ahuyama / zapallo',
    color: 'orange',
    items: [
      { slug: 'cucurbita_moschata', nombre: 'Ahuyama amarilla', cientifico: 'Cucurbita moschata Duchesne', piso: 'caliente · templado', nota: 'La ahuyama de tierra caliente y media, de cuello largo. Siembra directa, 2 a 3 semillas por hoyo.' },
      { slug: 'cucurbita_maxima', nombre: 'Zapallo / calabaza', cientifico: 'Cucurbita maxima Duchesne', piso: 'caliente · templado · frío', nota: 'Guías rastreras que piden espacio. Las flores machas se cortan temprano para comer.' },
    ],
  },
};

/* ── Cómo se siembra la milpa (arreglo espacial + época) ─────────────────
 * El MÉTODO (orden y arreglo) es el de la asociación clásica de tres hermanas
 * y está groundeado en las fichas ("Siembra asociada con maíz que sirve de
 * soporte", "milpa andina"). Las distancias son ORIENTADORAS: la separación
 * exacta cambia con la variedad, el piso térmico y el suelo. */
export const SIEMBRA_PASOS = [
  {
    id: 'epoca',
    titulo: 'Espere las lluvias',
    detalle: 'La milpa se siembra al empezar el invierno (la temporada de lluvias de su región). En zona bimodal andina hay dos ventanas al año; en zona unimodal, una. El maíz nace con la primera humedad buena.',
    icono: 'lluvia',
  },
  {
    id: 'maiz-primero',
    titulo: 'Primero el maíz, y solo',
    detalle: 'Siembre el maíz en golpes (hoyos) separados. Déjelo crecer unas 2 a 4 semanas, hasta que la matica esté firme y a la altura de la rodilla: si mete el fríjol de una vez, lo tapa antes de tener por dónde treparse.',
    icono: 'maiz',
  },
  {
    id: 'frijol-despues',
    titulo: 'Después el fríjol, al pie',
    detalle: 'Cuando el maíz ya aguanta, siembre 2 o 3 granos de fríjol voluble alrededor de cada golpe de maíz. En pocos días busca la caña y trepa. Si es fríjol arbustivo (que no trepa), va en la calle entre surcos.',
    icono: 'frijol',
  },
  {
    id: 'calabaza-entre',
    titulo: 'La calabaza, en los espacios',
    detalle: 'Meta la calabaza en los claros entre los golpes de maíz, más separada porque se riega mucho. Sus guías van a tapar el suelo de todo el lote.',
    icono: 'calabaza',
  },
];

/* Distancias orientadoras (rango de método, NO norma). El dato fino por
 * variedad/zona es un slot pendiente de grounding. */
export const SIEMBRA_DISTANCIAS = [
  { que: 'Entre golpes de maíz', rango: '80 cm – 1 m', nota: 'Deja pasar la luz al fríjol y aire a la mata.' },
  { que: 'Granos de fríjol por golpe', rango: '2 – 3', nota: 'Alrededor de la caña, ya firme.' },
  { que: 'Entre matas de calabaza', rango: '1.5 – 2 m', nota: 'Se riega mucho: pide su espacio.' },
];

/* ── Manejo del cultivo ─────────────────────────────────────────────────── */
export const MANEJO = [
  { id: 'aporque', titulo: 'Aporque el maíz', detalle: 'Arrímele tierra al pie cuando esté crecido: lo afirma contra el viento y le nacen más raíces.' },
  { id: 'deshierbe', titulo: 'Deshierbe temprano, poco después', detalle: 'Al principio limpie la maleza; cuando la calabaza tape el suelo, ella misma la ahoga y casi no hay que desyerbar.' },
  { id: 'semilla', titulo: 'Guarde su semilla', detalle: 'Escoja las mejores mazorcas y las vainas más llenas para semilla. Así la variedad criolla sigue siendo suya y se adapta a su finca.' },
  { id: 'rotacion', titulo: 'Descanse el lote', detalle: 'El fríjol deja nitrógeno, pero rotar con otras familias corta el ciclo de las plagas del suelo.' },
];

/* ── Plagas comunes y su control agroecológico ──────────────────────────
 * Las plagas y sus controladores salen TAL CUAL del grafo (pest_controllers).
 * Son controladores BIOLÓGICOS y prácticas — NO hay dosis químicas. El agente
 * y el módulo de biopreparados dan el detalle de aplicación. */
export const PLAGAS = [
  {
    hermana: 'Maíz',
    color: 'amber',
    items: [
      {
        id: 'cogollero',
        plaga: 'Gusano cogollero',
        cientifico: 'Spodoptera frugiperda',
        senal: 'Se come el cogollo (el centro tierno) y lo deja raspado y con aserrín.',
        control: ['Bacillus thuringiensis (Bt)', 'Avispita Trichogramma (parasita los huevos)', 'Avispita Telenomus remus', 'Crisopa y chinche depredador (podisus)', 'Hongo Beauveria bassiana', 'Trampa de feromona para el adulto'],
      },
      {
        id: 'mazorca',
        plaga: 'Pudrición de la mazorca',
        cientifico: 'Fusarium',
        senal: 'Granos con moho y pudrición dentro de la mazorca.',
        control: ['Hongo Trichoderma spp.', 'Cosecha a tiempo y buen secado'],
      },
    ],
  },
  {
    hermana: 'Fríjol',
    color: 'rose',
    items: [
      {
        id: 'mosca-blanca',
        plaga: 'Mosca blanca',
        cientifico: 'Bemisia tabaci',
        senal: 'Nube de bichitos blancos bajo la hoja; hojas amarillas y pegajosas.',
        control: ['Hongo Beauveria / Verticillium', 'Avispita Encarsia y Eretmocerus', 'Crisopa (león de áfidos)', 'Trampa amarilla pegante'],
      },
      {
        id: 'antracnosis',
        plaga: 'Antracnosis y mancha angular',
        cientifico: 'hongos foliares',
        senal: 'Manchas oscuras hundidas en vainas y hojas.',
        control: ['Hongo Trichoderma spp.', 'Bacteria antagonista (biofungicida)', 'Semilla sana y tratada'],
      },
    ],
  },
  {
    hermana: 'Calabaza',
    color: 'orange',
    items: [
      {
        id: 'mildeo',
        plaga: 'Mildeo polvoso',
        cientifico: 'oídio de las cucurbitáceas',
        senal: 'Polvillo blanco sobre las hojas, como talco.',
        control: ['Bacteria antagonista (biofungicida)', 'Microorganismo de control biológico', 'Airear la mata, no mojar el follaje'],
      },
      {
        id: 'perforador',
        plaga: 'Gusano perforador del fruto',
        cientifico: 'barrenador de cucurbitáceas',
        senal: 'Huecos en la guía o en la calabaza tierna.',
        control: ['Bacillus thuringiensis (Bt)', 'Avispita Trichogramma'],
      },
    ],
  },
];

/* ── Umbral y ventana de manejo del gusano cogollero ─────────────────────
 * GROUNDING de FUENTE OFICIAL, extraído por lectura directa (visión) de la
 * cartilla técnica; ver Chagra-strategy/ops/GROUNDING-PDFS-2026-07-09.md.
 * Complementa PLAGAS (que trae la señal y los controladores) con las CIFRAS
 * DURAS de MONITOREO y DECISIÓN de manejo integrado del cogollero, cada una con
 * su página [FUENTE ... pág. X]. Son cifras de decisión agroecológica/MIP
 * (cuándo intervenir y con qué agente BIOLÓGICO o microbiológico); NO son dosis
 * de agroquímico de síntesis, coherente con la regla de honestidad del módulo.
 *
 * Fuente: AGROSAVIA (Corpoica), "Manejo integrado del gusano cogollero del
 * maíz, Spodoptera frugiperda", en: I Curso-Taller Internacional de Control
 * Biológico (Corpoica-MIP), págs. 157-160. */
export const UMBRAL_MANEJO_COGOLLERO = {
  titulo: 'Cuándo intervenir el cogollero',
  cientifico: 'Spodoptera frugiperda (J.E. Smith)',
  monitoreo:
    'Revise el lote una o dos veces por semana. Para el conteo se examinan sitios de 50 a 100 plantas continuas y en cada sitio se cuentan las plantas con "daño fresco" de cogollero (el cogollo raspado y con aserrín recientes). El número de sitios a revisar se ajusta al tamaño del lote, inspeccionando entre el 1 % y el 2 % de la población de plantas. [FUENTE AGROSAVIA/Corpoica, pág. 157]',
  umbral:
    'El umbral de acción es del 40 %: cuando el porcentaje de plantas con "daño fresco" supera el 40 %, se acude al manejo microbiológico de las larvas (hongo Nomuraea rileyi o Bacillus thuringiensis). Por debajo de ese nivel, el control biológico natural suele bastar. [FUENTE AGROSAVIA/Corpoica, págs. 157 y 159]',
  ventanaTemprana:
    'Aproveche el clima como aliado: las lluvias continuas en las primeras tres semanas después de la siembra ahogan muchas larvas pequeñas dentro del cogollo (control físico natural), y regar por aspersión en horas de la noche estorba la oviposición del adulto. Por eso conviene sembrar al empezar el tiempo de lluvias. [FUENTE AGROSAVIA/Corpoica, pág. 158]',
  controlBiologicoNatural:
    'De forma natural, parasitoides, depredadores y entomopatógenos reducen más del 50 % de la población de larvas y pupas. Un depredador clave es la avispa Polistes erythrocephalus: se recomienda trasladar sus nidos a chozas cerca del maíz para concentrar su acción sobre el cogollero. [FUENTE AGROSAVIA/Corpoica, pág. 157]',
  liberacionParasitoides:
    'Refuerzo con liberaciones de parasitoides de huevos desde la emergencia de las plantas y por dos o tres semanas: Telenomus remus, Trichogramma atopovirilia y Trichogramma exiguum, fraccionando la dosis en cuatro o cinco liberaciones sincronizadas con la oviposición de la plaga. [FUENTE AGROSAVIA/Corpoica, pág. 158]',
  aplicacionMicrobiologica:
    'Si toca el manejo microbiológico, asperje cuando la planta esté por debajo del estado de "maíz rodillero", dirigiendo la solución al cogollo con alto volumen de agua (200-400 L/ha) para que escurra hasta donde está la larva; Bt o Nomuraea rileyi a razón de 1,0 kg/ha. Las larvas muertas se ponen oscuras y flácidas; la evaluación final se hace cinco o seis días después. [FUENTE AGROSAVIA/Corpoica, pág. 159]',
  fuente:
    'AGROSAVIA (Corpoica) — "Manejo integrado del gusano cogollero del maíz, Spodoptera frugiperda" (Corpoica-MIP), págs. 157-160. Detalle y páginas en GROUNDING-PDFS-2026-07-09.md.',
};

/* Biopreparados destacados de la milpa (todos existen en el grafo). El módulo
 * de biopreparados de Chagra trae la receta y la seguridad de cada uno. */
export const BIOPREPARADOS_MILPA = [
  { id: 'inoculante_rhizobium_frijol', nombre: 'Inoculante de Rhizobium (fríjol)', para: 'Arranca la fijación de nitrógeno en la semilla de fríjol.' },
  { id: 'bacillus_thuringiensis_aizawai_cogollero', nombre: 'Bacillus thuringiensis (Bt)', para: 'Contra el gusano cogollero del maíz y el perforador.' },
  { id: 'trichoderma_tratamiento_semilla', nombre: 'Trichoderma (semilla)', para: 'Protege maíz y fríjol de hongos del suelo desde la siembra.' },
  { id: 'beauveria_bassiana', nombre: 'Beauveria bassiana', para: 'Hongo que enferma a la mosca blanca y otros insectos.' },
  { id: 'micorrizas_arbusculares', nombre: 'Micorrizas', para: 'Amplían la raíz del maíz para capturar más agua y fósforo.' },
];

/* ── Cosecha ─────────────────────────────────────────────────────────────── */
export const COSECHA = [
  { id: 'maiz-choclo', titulo: 'Maíz tierno (choclo)', detalle: 'Cuando el pelo de la mazorca está seco y café, y el grano larga leche al apretarlo, está para choclo, arepa de chócolo o mazamorra.' },
  { id: 'maiz-seco', titulo: 'Maíz de guardar', detalle: 'Déjelo secar en la mata o colgado en la cocina hasta que el grano suene duro. Así se guarda para semilla y para todo el año.' },
  { id: 'frijol-verde', titulo: 'Fríjol verde o seco', detalle: 'Verde, para comer de una en la olla. Seco, cuando la vaina está tostada: se trilla y se guarda.' },
  { id: 'calabaza', titulo: 'Calabaza madura', detalle: 'La ahuyama se recoge con el cuello duro y el cascarón que no se raya con la uña. Bien guardada aguanta meses sin dañarse.' },
];

/* ── Nutrición combinada (ICBF — TCAC 2015, por 100 g comestible) ────────
 * Valores tal cual del grafo (nodos AporteNutricional) exportados a
 * public/nutricion-humana.json. `null` = dato faltante en la fuente. */
export const NUTRICION_MILPA = {
  fuente: 'ICBF — Tabla de Composición de Alimentos Colombianos (TCAC), 2015',
  unidad: 'por 100 g de porción comestible',
  items: [
    { crop: 'maiz', alimento: 'Maíz común, desgranado', grupo: 'energetico', energia: 363, proteina: 8.7, hierro: null, vitA: null },
    { crop: 'frijol', alimento: 'Fríjol rojo (grano seco)', grupo: 'proteico', energia: 336, proteina: 20.4, hierro: 7.1, vitA: null },
    { crop: 'calabaza', alimento: 'Ahuyama, sin cáscara, cruda', grupo: 'protector', energia: 40, proteina: 0.9, hierro: null, vitA: 340 },
  ],
};

/* ── Índice de secciones (pestañas de la pantalla) ──────────────────────── */
export const SECCIONES_MILPA = [
  { id: 'juntas', titulo: 'Las tres juntas', descripcion: 'Por qué se ayudan' },
  { id: 'sembrar', titulo: 'Sembrarla', descripcion: 'Variedades y arreglo' },
  { id: 'cuidar', titulo: 'Cuidarla', descripcion: 'Plagas y cosecha' },
];
