/* i18n (ADR-050): igual que almacenamientoCalculator.js y PoscosechaScreen, este
 * módulo contiene copy campesino en español Colombia pendiente de migrar a
 * src/config/messages.js. Se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * hortalizasData — datos de la mini-app "Hortalizas de la huerta" (mundo Cultivos
 * y semillas). La comida diaria de la casa campesina: tomate, cebolla, zanahoria,
 * repollo, lechuga, cilantro, remolacha y acelga.
 *
 * GROUNDING (cero invención de relaciones ni dosis):
 *  - Las VECINAS (buenas/malas) y las PLAGAS con su MANEJO agroecológico salen
 *    del grafo de conocimiento chagra_kg exportado a public/grafo-relations.json
 *    (aristas COMPATIBLE_WITH, ANTAGONIST_OF, AFFECTS pest→cultivo y CONTROLS
 *    biocontrol→plaga). Aquí quedan CONGELADAS con su procedencia; el manejo son
 *    controladores biológicos y biopreparados por NOMBRE — NUNCA dosis químicas.
 *    Las recetas paso a paso viven en el mundo "Biopreparados".
 *  - Los DÍAS A COSECHA salen de las plantillas de fenología de la app
 *    (src/data/phenology-templates/*.v1.json), con fuente Agrosavia / ICA / FAO.
 *  - La ficha de CULTIVO (método de siembra, distancias, luz/agua, piso térmico,
 *    conservación) es conocimiento estándar de huerta casera colombiana
 *    (SENA / Agrosavia / ICA); son rangos establecidos, no cifras inventadas.
 *  - Donde el grafo aún no tiene la arista, el campo queda VACÍO y la pantalla
 *    muestra "dato en camino" con honestidad, sin rellenar de fantasía.
 *
 * La foto de cada hortaliza es real y con licencia CC (autor + licencia + fuente
 * visibles); la fuente única de créditos es /public/hortalizas/creditos.json,
 * espejada en el componente.
 */

/** Fuentes de procedencia, referenciadas por las fichas. */
export const FUENTES = {
  grafo: 'Grafo Chagra (chagra_kg): aristas COMPATIBLE_WITH · AFFECTS · CONTROLS.',
  fenologia: 'Plantillas de fenología Chagra — Agrosavia / ICA / FAO.',
  huerta: 'Huerta casera colombiana — SENA / Agrosavia / ICA.',
};

/** Texto único para cualquier campo que el grafo todavía no respalda. */
export const DATO_EN_CAMINO = 'Dato en camino: el grafo aún no tiene este dato para esta hortaliza.';

/* Cada hortaliza declara además:
 *  - familia: familia botánica en su nombre hortelano común (taxonomía estándar,
 *    verificable por el nombre científico). Es la base de la ROTACIÓN de eras:
 *    no repetir familia en la misma era el ciclo siguiente (práctica estándar
 *    de huerta casera — SENA / Agrosavia / ICA).
 *  - siembraTipo: etiqueta corta del método de siembra, restatement literal de
 *    siembra.metodo ('Semillero' | 'Siembra directa' | 'Colino' | mixto). */

/**
 * Las hortalizas de la huerta. Cada una es una ficha didáctica de CULTIVO.
 */
export const HORTALIZAS = [
  {
    id: 'tomate',
    familia: 'Solanáceas',
    siembraTipo: 'Semillero',
    nombre: 'Tomate',
    variedades: 'Chonto, aliño, milano, cherry',
    cientifico: 'Solanum lycopersicum',
    emoji: '🍅',
    foto: 'tomate',
    accent: 'rose',
    resumen: 'La base del guiso y la ensalada. Pide sol, tutor y agua pareja.',
    siembra: {
      metodo: 'Semillero y trasplante a los 30-35 días, cuando la plántula tiene 4-5 hojas.',
      distancia: '40-50 cm entre matas y ~1 m entre surcos. Siempre tutorada con vara o cuerda.',
      profundidad: 'Semilla a 0,5-1 cm en el semillero.',
    },
    clima: {
      luz: 'Sol pleno, 6 horas o más.',
      agua: 'Riego parejo por el pie; el golpe de agua sobre fruto lleno lo raja.',
      piso: 'Clima medio y cálido, 1.000-2.400 msnm. En clima frío, bajo cubierta.',
    },
    cosecha: 'A los 75-120 días. Recoja pintón o maduro; corta seguido durante 4-8 semanas.',
    conservacion: 'Pintón aguanta a temperatura ambiente y termina de madurar; maduro dura pocos días. No lo guarde verde en la nevera.',
    // Grafo: solanum_lycopersicum_* COMPATIBLE_WITH / ANTAGONIST_OF (resuelto a nombre común).
    vecinasBuenas: ['Lechuga', 'Perejil', 'Caléndula', 'Capuchina', 'Toronjil', 'Limonaria', 'Ortiga'],
    vecinasMalas: ['Repollo', 'Kale', 'Pepino cohombro', 'Hinojo', 'Papa'],
    // Grafo: AFFECTS pest→tomate + CONTROLS biocontrol→plaga.
    plagas: [
      { nombre: 'Gusano del fruto (Heliothis)', controles: ['Bt — bacteria bioinsecticida', 'Avispita parasitoide de huevos'] },
    ],
    // Grafo: biopreparados vinculados al cultivo (recetas en el mundo Biopreparados).
    biopreparados: ['Caldo bordelés', 'Bacillus subtilis foliar', 'Bocashi', 'Humus líquido', 'Biol', 'Supermagro', 'Lixiviado de frutas'],
    fuentes: { cosecha: FUENTES.fenologia, relaciones: FUENTES.grafo, cultivo: FUENTES.huerta },
  },
  {
    id: 'cebolla-larga',
    familia: 'Aliáceas',
    siembraTipo: 'Colino',
    nombre: 'Cebolla larga',
    variedades: 'Cebolla de rama, cebollín (Allium fistulosum)',
    cientifico: 'Allium fistulosum',
    emoji: '🧅',
    foto: 'cebolla-larga',
    accent: 'lime',
    resumen: 'El hogao empieza aquí. Se cosecha y rebrota de la misma mata.',
    siembra: {
      metodo: 'Por división de macolla (colinos) o por semilla. Se resiembra el mismo colino.',
      distancia: 'Macollas cada 10-15 cm, surcos de 20-30 cm.',
      profundidad: 'Enterrar el colino hasta el cuello, sin tapar el brote.',
    },
    clima: {
      luz: 'Sol pleno; tolera media sombra ligera.',
      agua: 'Humedad constante; le gusta el suelo fresco y con materia orgánica.',
      piso: 'Clima frío y medio, 1.800-3.000 msnm (fuerte en el altiplano).',
    },
    cosecha: 'A los 60-90 días del colino. Corte la macolla dejando parte para que rebrote.',
    conservacion: 'En manojo, parada en un poco de agua o refrigerada, dura pocos días. También se pica y se congela.',
    vecinasBuenas: [], // grafo sin arista para allium_fistulosum
    // Grafo: allium_fistulosum ANTAGONIST_OF phaseolus_vulgaris.
    vecinasMalas: ['Frijol'],
    // Grafo: AFFECTS pest→cebolla + CONTROLS.
    plagas: [
      { nombre: 'Trips de la cebolla', controles: ['Beauveria — hongo entomopatógeno', 'Chinche pirata (Orius)', 'Ácaro depredador (Amblyseius)'] },
      { nombre: 'Mildiu velloso', controles: ['Bacteria antagonista (biofungicida)'] },
    ],
    biopreparados: [], // grafo sin biopreparado vinculado
    fuentes: { cosecha: FUENTES.huerta, relaciones: FUENTES.grafo, cultivo: FUENTES.huerta },
  },
  {
    id: 'cebolla-bulbo',
    familia: 'Aliáceas',
    siembraTipo: 'Semillero o directa',
    nombre: 'Cebolla de bulbo',
    variedades: 'Cebolla cabezona, ocañera, roja',
    cientifico: 'Allium cepa',
    emoji: '🧅',
    foto: 'cebolla-bulbo',
    accent: 'amber',
    resumen: 'La cabeza que se guarda meses. Menos agua al final para que cure bien.',
    siembra: {
      metodo: 'Semillero y trasplante a los 45-60 días, o siembra directa aclareada.',
      distancia: '8-10 cm entre plantas y 25-30 cm entre surcos.',
      profundidad: 'Semilla a 1 cm; al trasplantar, no enterrar el cuello.',
    },
    clima: {
      luz: 'Sol pleno.',
      agua: 'Riego regular en el crecimiento; se corta el riego cuando empieza a doblarse el follaje para que el bulbo cure.',
      piso: 'Clima medio a frío moderado, 800-2.600 msnm.',
    },
    cosecha: 'A los 100-130 días, cuando más de la mitad del follaje se dobla y amarillea. Curar al sol.',
    conservacion: 'Curada y bien seca, en lugar fresco, seco y ventilado, dura varios meses. Ver el mundo Almacenamiento.',
    // Grafo: allium_cepa COMPATIBLE_WITH solanum_tuberosum_sabanera.
    vecinasBuenas: ['Papa'],
    // Grafo: allium_cepa ANTAGONIST_OF phaseolus_vulgaris.
    vecinasMalas: ['Frijol'],
    // Grafo: AFFECTS pest→cebolla + CONTROLS.
    plagas: [
      { nombre: 'Trips de la cebolla', controles: ['Beauveria — hongo entomopatógeno', 'Chinche pirata (Orius)', 'Ácaro depredador (Amblyseius)'] },
      { nombre: 'Mancha púrpura', controles: ['Bacteria antagonista (biofungicida)', 'Hongo antagonista del suelo'] },
      { nombre: 'Mildiu velloso', controles: ['Bacteria antagonista (biofungicida)'] },
      { nombre: 'Fusariosis (pudrición basal)', controles: ['Hongo antagonista del suelo'] },
      { nombre: 'Pudrición blanca (Sclerotium)', controles: ['Hongo antagonista del suelo'] },
      { nombre: 'Minador de la hoja', controles: ['Parasitoide de control biológico'] },
    ],
    biopreparados: ['Caldo bordelés', 'Caldo de ajo concentrado', 'Ceniza vegetal espolvoreada', 'Trampa azul pegante (trips)', 'Purín de ortiga', 'Bocashi', 'Humus líquido', 'Biol'],
    fuentes: { cosecha: FUENTES.fenologia, relaciones: FUENTES.grafo, cultivo: FUENTES.huerta },
  },
  {
    id: 'zanahoria',
    familia: 'Apiáceas',
    siembraTipo: 'Siembra directa',
    nombre: 'Zanahoria',
    variedades: 'Chantenay, Nantes',
    cientifico: 'Daucus carota subsp. sativus',
    emoji: '🥕',
    foto: 'zanahoria',
    accent: 'amber',
    resumen: 'Raíz dulce del clima frío. Se siembra donde va a crecer; no le gusta el trasplante.',
    siembra: {
      metodo: 'Siembra DIRECTA en el surco. No trasplanta: la raíz pivotante se tuerce.',
      distancia: 'Ralear a 5-8 cm entre plantas; surcos de 20-25 cm.',
      profundidad: 'Semilla a 0,5-1 cm en suelo suelto y sin piedras; tarda 10-20 días en nacer.',
    },
    clima: {
      luz: 'Sol pleno.',
      agua: 'Humedad pareja; la sequía y el exceso rajan la raíz.',
      piso: 'Clima frío, 1.800-2.800 msnm.',
    },
    cosecha: 'A los 75-105 días, cuando la raíz pasa de 2 cm de diámetro en la corona.',
    conservacion: 'Sin el follaje, en arena húmeda o refrigerada, dura semanas.',
    // Grafo: daucus_carota_subsp_sativus COMPATIBLE_WITH allium_cepa, raphanus_sativus_niger.
    vecinasBuenas: ['Cebolla', 'Rábano'],
    vecinasMalas: [], // grafo sin arista de antagonismo
    plagas: [], // grafo sin plaga registrada para zanahoria
    biopreparados: [],
    fuentes: { cosecha: FUENTES.fenologia, relaciones: FUENTES.grafo, cultivo: FUENTES.huerta },
  },
  {
    id: 'repollo',
    familia: 'Crucíferas',
    siembraTipo: 'Semillero',
    nombre: 'Repollo',
    variedades: 'Blanco, morado, corazón de buey',
    cientifico: 'Brassica oleracea var. capitata',
    emoji: '🥬',
    foto: 'repollo',
    accent: 'emerald',
    resumen: 'Cabeza firme del clima frío. Rinde mucho en poca tierra.',
    siembra: {
      metodo: 'Semillero y trasplante a los 30-40 días, con 4-5 hojas verdaderas.',
      distancia: '40-50 cm entre plantas y 50-60 cm entre surcos.',
      profundidad: 'Semilla a 0,5-1 cm en el semillero.',
    },
    clima: {
      luz: 'Sol pleno.',
      agua: 'Riego constante y abundante; con sed la cabeza no cierra.',
      piso: 'Clima frío, 1.800-2.800 msnm.',
    },
    cosecha: 'A los 70-100 días, cuando la cabeza está compacta y firme al apretar.',
    conservacion: 'La cabeza entera, en lugar fresco, dura semanas. También se hace fermentada (chucrut) — ver Almacenamiento.',
    vecinasBuenas: [], // grafo sin arista de compatibilidad para repollo
    // Grafo: brassica_oleracea_capitata_alba ANTAGONIST_OF solanum_lycopersicum, vaccinium_corymbosum.
    vecinasMalas: ['Tomate', 'Arándano'],
    plagas: [], // grafo sin plaga registrada para repollo
    biopreparados: [],
    fuentes: { cosecha: FUENTES.huerta, relaciones: FUENTES.grafo, cultivo: FUENTES.huerta },
  },
  {
    id: 'lechuga',
    familia: 'Asteráceas',
    siembraTipo: 'Semillero',
    nombre: 'Lechuga',
    variedades: 'Crespa, batavia, romana, cogollo',
    cientifico: 'Lactuca sativa',
    emoji: '🥬',
    foto: 'lechuga',
    accent: 'lime',
    resumen: 'La ensalada rápida. Del semillero al plato en dos meses.',
    siembra: {
      metodo: 'Semillero y trasplante a los 20-25 días.',
      distancia: '25-30 cm entre plantas y entre surcos.',
      profundidad: 'Semilla apenas cubierta (0,3-0,5 cm); necesita luz para germinar.',
    },
    clima: {
      luz: 'Sol pleno en clima frío; media sombra en clima cálido para que no se espigue.',
      agua: 'Humedad constante; es planta de mucha agua.',
      piso: 'Clima frío a medio, 1.500-2.800 msnm.',
    },
    cosecha: 'A los 45-65 días, con la cabeza compacta. Corte a ras del suelo.',
    conservacion: 'Es de consumo fresco: refrigerada aguanta pocos días. No se guarda a largo plazo.',
    // Grafo: lactuca_sativa_* COMPATIBLE_WITH phaseolus_vulgaris, raphanus_sativus_niger, solanum_lycopersicum.
    vecinasBuenas: ['Frijol', 'Rábano', 'Tomate'],
    vecinasMalas: [], // grafo sin arista de antagonismo
    plagas: [], // grafo sin plaga registrada para lechuga
    biopreparados: ['Bacillus subtilis foliar', 'Ceniza vegetal espolvoreada', 'Purín de ortiga', 'Bocashi', 'Humus líquido', 'Biol'],
    fuentes: { cosecha: FUENTES.fenologia, relaciones: FUENTES.grafo, cultivo: FUENTES.huerta },
  },
  {
    id: 'cilantro',
    familia: 'Apiáceas',
    siembraTipo: 'Siembra directa',
    nombre: 'Cilantro',
    variedades: 'Cilantro común (la semilla seca es el coriandro)',
    cientifico: 'Coriandrum sativum',
    emoji: '🌿',
    foto: 'cilantro',
    accent: 'emerald',
    resumen: 'El olor de la cocina campesina. Rápido y de siembra directa.',
    siembra: {
      metodo: 'Siembra DIRECTA al voleo o en chorrillo. Se puede partir la semilla para que nazca más parejo.',
      distancia: 'Ralo, en líneas de 15-20 cm; no necesita mucho espacio.',
      profundidad: 'Semilla a 1-1,5 cm.',
    },
    clima: {
      luz: 'Sol pleno o media sombra; en calor fuerte se espiga rápido.',
      agua: 'Humedad pareja; con sed florece antes de tiempo.',
      piso: 'Clima medio y cálido; en clima frío crece más despacio.',
    },
    cosecha: 'Hoja fresca a los 20-45 días. Corte antes de que espigue. Para coriandro, deje florecer y secar la semilla.',
    conservacion: 'Fresco, en manojo parado en agua o refrigerado, pocos días. Se seca la hoja o se guarda la semilla (coriandro).',
    vecinasBuenas: [], // cilantro fuera del subconjunto del grafo
    vecinasMalas: [],
    plagas: [],
    biopreparados: [],
    fuentes: { cosecha: FUENTES.fenologia, relaciones: FUENTES.grafo, cultivo: FUENTES.huerta },
  },
  {
    id: 'remolacha',
    familia: 'Amarantáceas',
    siembraTipo: 'Siembra directa',
    nombre: 'Remolacha',
    variedades: 'Remolacha de mesa, roja',
    cientifico: 'Beta vulgaris',
    emoji: '🫒',
    foto: 'remolacha',
    accent: 'rose',
    resumen: 'Raíz dulce y roja para la sangre. También se comen sus hojas.',
    siembra: {
      metodo: 'Siembra DIRECTA. Cada "semilla" trae varias plantas, así que hay que ralear.',
      distancia: 'Ralear a 8-10 cm entre plantas; surcos de 25-30 cm.',
      profundidad: 'Semilla a 1-2 cm.',
    },
    clima: {
      luz: 'Sol pleno.',
      agua: 'Humedad pareja; el suelo suelto le da mejor raíz.',
      piso: 'Clima frío, 1.600-2.800 msnm.',
    },
    cosecha: 'A los 60-90 días, cuando la raíz tiene 4-6 cm. Las hojas tiernas se comen como acelga.',
    conservacion: 'La raíz sin hojas, en fresco o refrigerada, dura semanas.',
    vecinasBuenas: [], // remolacha fuera del subconjunto del grafo
    vecinasMalas: [],
    plagas: [],
    biopreparados: [],
    fuentes: { cosecha: FUENTES.huerta, relaciones: FUENTES.grafo, cultivo: FUENTES.huerta },
  },
  {
    id: 'acelga',
    familia: 'Amarantáceas',
    siembraTipo: 'Directa o semillero',
    nombre: 'Acelga',
    variedades: 'Acelga verde, de penca blanca y de colores',
    cientifico: 'Beta vulgaris var. cicla',
    emoji: '🥬',
    foto: 'acelga',
    accent: 'emerald',
    resumen: 'La más rústica y agradecida: se cosecha hoja por hoja durante meses.',
    siembra: {
      metodo: 'Siembra directa o semillero con trasplante. Pariente de la remolacha.',
      distancia: '25-30 cm entre plantas y 30-40 cm entre surcos.',
      profundidad: 'Semilla a 1-2 cm.',
    },
    clima: {
      luz: 'Sol pleno; tolera media sombra.',
      agua: 'Humedad constante; es planta muy noble y resistente.',
      piso: 'Clima frío a medio, 1.500-2.800 msnm.',
    },
    cosecha: 'Primera hoja a los 50-60 días; luego se corta hoja por hoja cada semana durante meses.',
    conservacion: 'De consumo fresco; refrigerada aguanta pocos días.',
    vecinasBuenas: [], // acelga fuera del subconjunto del grafo
    vecinasMalas: [],
    plagas: [],
    biopreparados: [],
    fuentes: { cosecha: FUENTES.huerta, relaciones: FUENTES.grafo, cultivo: FUENTES.huerta },
  },
];

/** Mapa id → hortaliza, para resolver la ficha desde la grilla. */
export const HORTALIZA_BY_ID = Object.fromEntries(HORTALIZAS.map((h) => [h.id, h]));

/** Resuelve una hortaliza por su id (null si no existe). */
export const getHortaliza = (id) => HORTALIZA_BY_ID[id] || null;

/**
 * ¿Este campo del grafo tiene dato? Un arreglo vacío = "dato en camino".
 * @param {unknown[]} lista
 * @returns {boolean}
 */
export const tieneDato = (lista) => Array.isArray(lista) && lista.length > 0;
