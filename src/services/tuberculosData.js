/* i18n (ADR-050): igual que hortalizasData.js y PoscosechaScreen, este módulo
 * lleva copy campesino en español Colombia pendiente de migrar a
 * src/config/messages.js. Se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * tuberculosData — datos de la mini-app "Tubérculos y raíces" (mundo Cultivos y
 * semillas). El pancoger andino y de tierra caliente que se come de la mata:
 * papa y papa criolla, yuca, arracacha, ñame, batata (camote), y los tubérculos
 * de altura oca/hibia, cubio/mashua y ulluco/chugua.
 *
 * GROUNDING (cero invención de relaciones ni dosis):
 *  - Las VECINAS (buenas/malas) y las PLAGAS con su MANEJO agroecológico salen
 *    del grafo de conocimiento chagra_kg exportado a public/grafo-relations.json
 *    (aristas compatible_with, antagonist_of, y pest_controllers = AFFECTS
 *    plaga→cultivo + CONTROLS biocontrol→plaga). Aquí quedan CONGELADAS con su
 *    procedencia; los slugs de especie del grafo se resuelven a nombre campesino
 *    con RESOLVER (abajo). El manejo son controladores biológicos y
 *    biopreparados por NOMBRE — NUNCA dosis químicas. Las recetas paso a paso
 *    viven en el mundo "Biopreparados".
 *  - La ficha de CULTIVO (forma de siembra —tubérculo-semilla / esqueje / colino—,
 *    distancias, luz/agua, piso térmico, aporque, cosecha y curado) es
 *    conocimiento estándar de pancoger andino colombiano (SENA / Agrosavia / ICA
 *    / FAO); son rangos establecidos, no cifras inventadas.
 *  - Donde el grafo aún no tiene la arista, el campo queda VACÍO y la pantalla
 *    muestra "dato en camino" con honestidad, sin rellenar de fantasía.
 *
 * La foto de cada tubérculo es real y con licencia CC (autor + licencia + fuente
 * visibles); la fuente única de créditos es /public/tuberculos/creditos.json,
 * espejada en el componente.
 */

/** Fuentes de procedencia, referenciadas por las fichas. */
export const FUENTES = {
  grafo: 'Grafo Chagra (chagra_kg): aristas compatible_with · antagonist_of · AFFECTS · CONTROLS.',
  pancoger: 'Pancoger andino colombiano — SENA / Agrosavia / ICA / FAO.',
};

/** Texto único para cualquier campo que el grafo todavía no respalda. */
export const DATO_EN_CAMINO = 'Dato en camino: el grafo aún no tiene este dato para este tubérculo.';

/**
 * RESOLVER — slug de especie del grafo → nombre campesino, para mostrar las
 * vecinas del grafo en cristiano. NO inventa relaciones: solo traduce los ids
 * que ya trae compatible_with / antagonist_of del grafo.
 */
export const RESOLVER = {
  lupinus_mutabilis: 'Chocho (altramuz)',
  pisum_sativum_andina: 'Arveja',
  tropaeolum_tuberosum: 'Cubio (mashua)',
  tropaeolum_tuberosum_mashua: 'Cubio (mashua)',
  alnus_acuminata: 'Aliso',
  mirabilis_expansa: 'Mauka (chago)',
  urtica_dioica: 'Ortiga',
  zea_mays: 'Maíz',
  allium_cepa: 'Cebolla',
  arracacia_xanthorrhiza: 'Arracacha',
  cucurbita_maxima: 'Zapallo',
  cucurbita_moschata: 'Ahuyama',
  oxalis_tuberosa: 'Oca (hibia)',
  phaseolus_vulgaris: 'Frijol',
  solanum_lycopersicum_san_marzano: 'Tomate',
  solanum_melongena: 'Berenjena',
  cucumis_sativus: 'Pepino cohombro',
  passiflora_tarminiana: 'Curuba',
  spinacia_oleracea: 'Espinaca',
  solanum_tuberosum_sabanera: 'Papa (sabanera)',
  borojoa_sorbilis: 'Borojó',
  cajanus_cajan: 'Guandul (frijol de palo)',
  musa_paradisiaca: 'Plátano',
  plukenetia_volubilis: 'Sacha inchi',
};

/**
 * Los tubérculos y raíces. Cada uno es una ficha didáctica de CULTIVO. Los
 * campos `vecinasBuenas`, `vecinasMalas`, `plagas` y `biopreparados` vienen del
 * grafo (public/grafo-relations.json); un arreglo vacío = "dato en camino".
 */
export const TUBERCULOS = [
  {
    id: 'papa',
    nombre: 'Papa',
    variedades: 'Parda pastusa, sabanera, pastusa suprema, ICA-Única',
    cientifico: 'Solanum tuberosum',
    grafoId: 'solanum_tuberosum',
    emoji: '🥔',
    foto: 'papa',
    accent: 'amber',
    resumen: 'La reina del clima frío. Se siembra del mismo tubérculo, no de semilla.',
    siembra: {
      metodo: 'Por tubérculo-semilla: una papa "de asiento" ya brotada, con 2 o 3 brotes buenos. La mata sale del tubérculo, no de semilla de flor.',
      distancia: '30-40 cm entre matas y ~1 m entre surcos.',
      profundidad: 'Tape el tubérculo-semilla a 8-12 cm en el fondo del surco.',
    },
    clima: {
      luz: 'Sol pleno del clima frío.',
      agua: 'Lluvia bien repartida; el encharcamiento le pudre el tubérculo.',
      piso: 'Clima frío, 2.000-3.500 msnm (altiplano y páramo bajo).',
    },
    aporque: 'Cuando la mata tiene 25-30 cm, arrímele tierra al pie tapando el cuello. El aporque da más tubérculos, los tapa del sol (que los pone verdes y amargos) y le cierra el paso a la polilla. Repítalo en la floración.',
    cosecha: 'A los 4-6 meses, cuando la mata amarillea y se seca. Afloje con azadón sin herir el tubérculo y deje orear a la sombra.',
    conservacion: 'Cúrela unos días en sitio oscuro y ventilado para que cicatrice la cáscara; guárdela en oscuridad total (la luz la enverdece y le forma solanina, que es tóxica). En fresco y oscuro aguanta semanas. La que va para semilla, en cambio, déjela en luz difusa para que "verdee" y brote sana.',
    // Grafo: solanum_tuberosum compatible_with (resuelto con RESOLVER).
    vecinasBuenas: ['Chocho (altramuz)', 'Arveja', 'Cubio (mashua)'],
    vecinasMalas: [], // grafo sin arista de antagonismo para la parda pastusa
    // Grafo: pest_controllers (AFFECTS plaga→papa + CONTROLS biocontrol→plaga).
    plagas: [
      { nombre: 'Gota / tizón tardío (Phytophthora)', controles: ['Bacteria antagonista (biofungicida)', 'Trichoderma spp.', 'Hongo antagonista del suelo'] },
      { nombre: 'Polilla guatemalteca de la papa', controles: ['Bt (bacteria bioinsecticida)', 'Parasitoide de control biológico', 'Microorganismo de control biológico (DR-MIP-1)'] },
      { nombre: 'Gusano blanco de la papa', controles: ['Hongo entomopatógeno (beauveria)', 'Hongo verde entomopatógeno (metarhizium)', 'Nematodos entomopatógenos (Steinernema)'] },
      { nombre: 'Nematodo quiste de la papa', controles: ['Hongo nematófago (paecilomyces)', 'Pochonia chlamydosporia'] },
      { nombre: 'Pulguilla negra de la papa', controles: ['Hongo entomopatógeno (beauveria)', 'Hongo verde entomopatógeno (metarhizium)'] },
      { nombre: 'Marchitez bacteriana (dormidera)', controles: ['Microorganismo de control biológico (DR-MIP-1)'] },
    ],
    // Grafo: biopreparados de especificidad alta/muy alta vinculados a la papa.
    biopreparados: ['Caldo bordelés', 'Caldo bordelés enriquecido con Trichoderma (anti-gota)', 'Trichoderma harzianum al suelo', 'Beauveria bassiana', 'Trampa de feromona sexual para la polilla', 'Metarhizium anisopliae'],
    fuentes: { cultivo: FUENTES.pancoger, relaciones: FUENTES.grafo },
  },
  {
    id: 'papa-criolla',
    nombre: 'Papa criolla',
    variedades: 'Yema de huevo, Colombia, criolla Guaneña',
    cientifico: 'Solanum phureja',
    grafoId: 'solanum_phureja',
    emoji: '🥔',
    foto: 'papa-criolla',
    accent: 'amber',
    resumen: 'La amarillita del sancocho. Rápida, pero no dorme: se brota y hay que comerla pronto.',
    siembra: {
      metodo: 'Por tubérculo-semilla pequeño entero, ya brotado. Se resiembra la misma criolla de la cosecha.',
      distancia: '30 cm entre matas y 80-90 cm entre surcos.',
      profundidad: '8-10 cm en el surco.',
    },
    clima: {
      luz: 'Sol pleno del clima frío.',
      agua: 'Humedad pareja, sin encharcar.',
      piso: 'Clima frío, 2.300-3.000 msnm.',
    },
    aporque: 'Aporque bien: la criolla forma tubérculos muy superficiales y sin tierra encima se enverdecen. Arrímele tierra al pie a los 25-30 cm.',
    cosecha: 'Más rápida que la común: a los 4-5 meses. Cuando la mata amarillea, arranque con cuidado que la cáscara es delgada.',
    conservacion: 'Poca guarda: la criolla no tiene reposo (dormancia), se brota y se arruga rápido. Consúmala pronto o procésela (pelada y congelada, o precocida). En oscuro y fresco, pocos días.',
    // Grafo: solanum_phureja compatible_with.
    vecinasBuenas: ['Aliso', 'Mauka (chago)', 'Ortiga', 'Maíz'],
    // Grafo: solanum_phureja antagonist_of.
    vecinasMalas: ['Tomate', 'Berenjena'],
    // Grafo: pest_controllers (comparte las de la papa común).
    plagas: [
      { nombre: 'Gota / tizón tardío (Phytophthora)', controles: ['Bacteria antagonista (biofungicida)', 'Trichoderma spp.', 'Hongo antagonista del suelo'] },
      { nombre: 'Polilla guatemalteca de la papa', controles: ['Bt (bacteria bioinsecticida)', 'Parasitoide de control biológico', 'Microorganismo de control biológico (DR-MIP-1)'] },
      { nombre: 'Gusano blanco de la papa', controles: ['Hongo entomopatógeno (beauveria)', 'Hongo verde entomopatógeno (metarhizium)', 'Nematodos entomopatógenos (Steinernema)'] },
    ],
    biopreparados: [], // grafo sin biopreparado de alta especificidad vinculado
    fuentes: { cultivo: FUENTES.pancoger, relaciones: FUENTES.grafo },
  },
  {
    id: 'yuca',
    nombre: 'Yuca',
    variedades: 'Dulce (de mesa) y brava (industrial/casabe)',
    cientifico: 'Manihot esculenta',
    grafoId: 'manihot_esculenta',
    emoji: '🍠',
    foto: 'yuca',
    accent: 'lime',
    resumen: 'El pancoger de tierra caliente. Se siembra de un pedazo de tallo (estaca), no de semilla.',
    siembra: {
      metodo: 'Por estaca (cangre): un trozo de tallo maduro de 20-25 cm con varias yemas. NO se siembra de semilla.',
      distancia: '1 m x 1 m (o 1,2 x 0,8 m).',
      profundidad: 'Entierre las dos terceras partes de la estaca, dejando yemas afuera; parada o un poco inclinada.',
    },
    clima: {
      luz: 'Sol pleno.',
      agua: 'Rústica y aguanta la sequía; le hace daño el encharcamiento.',
      piso: 'Clima cálido y medio, 0-1.800 msnm.',
    },
    aporque: 'A los 2-3 meses arrímele tierra al pie: tapa las raíces que engordan y sostiene la mata del viento.',
    cosecha: 'Larga: 8-12 meses (más en tierra fría). Afloje la tierra y arranque la mata halando del tallo; saque toda la raíz de una vez, que en tierra se pasa.',
    conservacion: 'La yuca se "raya" (se pudre) a los 2-3 días de arrancada. Consúmala pronto o consérvela: encerada, enterrada en tierra húmeda, o pelada y congelada. La yuca brava (amarga) hay que rallarla, exprimirla y tostarla para sacarle el ácido antes de comer (casabe, fariña, mañoco); la dulce se cocina directo.',
    // Grafo: manihot_esculenta compatible_with.
    vecinasBuenas: ['Borojó', 'Guandul (frijol de palo)', 'Zapallo', 'Ahuyama', 'Plátano', 'Frijol', 'Sacha inchi', 'Maíz'],
    vecinasMalas: [], // grafo sin arista de antagonismo
    // Grafo: pest_controllers.
    plagas: [
      { nombre: 'Mosca blanca de la yuca', controles: ['Hongo entomopatógeno (beauveria)', 'Avispita parasitoide de mosca blanca', 'Encarsia spp.', 'Parasitoide de mosca blanca (eretmocerus)'] },
      { nombre: 'Ácaro verde de la yuca', controles: ['Ácaro depredador (neoseiulus)', 'Typhlodromalus aripo'] },
      { nombre: 'Piojo harinoso de la yuca', controles: ['Hongo entomopatógeno (beauveria)', 'Parasitoide de control biológico'] },
      { nombre: 'Gusano cachón de la yuca', controles: ['Bt (bacteria bioinsecticida)', 'Avispita parasitoide de huevos', 'Hongo verde entomopatógeno (metarhizium)'] },
      { nombre: 'Bacteriosis de la yuca (añublo bacteriano)', controles: ['Microorganismo de control biológico (DR-MIP-1)'] },
      { nombre: 'Pudrición basal por Fusarium', controles: ['Hongo antagonista del suelo', 'Microorganismo de control biológico (DR-MIP-1)'] },
    ],
    biopreparados: [], // grafo sin biopreparado de alta especificidad vinculado
    fuentes: { cultivo: FUENTES.pancoger, relaciones: FUENTES.grafo },
  },
  {
    id: 'arracacha',
    nombre: 'Arracacha',
    variedades: 'Amarilla, blanca y morada (zanahoria blanca, apio criollo)',
    cientifico: 'Arracacia xanthorrhiza',
    grafoId: 'arracacia_xanthorrhiza',
    emoji: '🥕',
    foto: 'arracacha',
    accent: 'amber',
    resumen: 'La raíz suave del sancocho de clima frío. Se siembra del hijuelo del cuello, no de semilla.',
    siembra: {
      metodo: 'Por colinos (hijuelos del cuello de la planta madre). Cure el colino al sol 2-3 días antes de sembrar.',
      distancia: '60-80 cm entre matas y 80-90 cm entre surcos.',
      profundidad: 'Siembre el colino inclinado, con la yema hacia arriba, apenas cubierto.',
    },
    clima: {
      luz: 'Sol pleno o media sombra.',
      agua: 'Humedad pareja; pide suelo suelto y profundo.',
      piso: 'Clima frío y medio, 1.800-2.800 msnm.',
    },
    aporque: 'Aporque a los 3-4 meses tapando el cuello: la raíz reservante engorda mejor con tierra encima.',
    cosecha: 'Larga: 10-14 meses. Cuando el follaje amarillea, arranque y separe las raíces engrosadas del cuello (la cepa).',
    conservacion: 'Se pasa rápido como la yuca; consuma pronto o refrigere unos pocos días. Guarde el cuello (la cepa) para volver a sembrar los colinos.',
    // Grafo: arracacia_xanthorrhiza compatible_with.
    vecinasBuenas: ['Oca (hibia)', 'Papa (sabanera)', 'Cubio (mashua)', 'Maíz'],
    vecinasMalas: [], // grafo sin arista de antagonismo
    // Grafo: pest_controllers.
    plagas: [
      { nombre: 'Nematodo agallador', controles: ['Hongo antagonista del suelo', 'Hongo nematófago (paecilomyces)', 'Trichoderma spp.', 'Pochonia chlamydosporia', 'Microorganismo de control biológico (DR-MIP-1)'] },
    ],
    biopreparados: [],
    fuentes: { cultivo: FUENTES.pancoger, relaciones: FUENTES.grafo },
  },
  {
    id: 'name',
    nombre: 'Ñame',
    variedades: 'Ñame blanco (D. rotundata), ñame criollo/espino (D. alata)',
    cientifico: 'Dioscorea rotundata / D. alata',
    grafoId: 'dioscorea_rotundata',
    emoji: '🍠',
    foto: 'name',
    accent: 'emerald',
    resumen: 'El pancoger del Caribe. Bejuco trepador que da un tubérculo grande; se siembra de un pedazo con yema.',
    siembra: {
      metodo: 'Por trozos de tubérculo-semilla (la "cabeza" o secciones con yema), curados a la sombra antes de sembrar.',
      distancia: '1 m x 1 m, con tutor (vara o espaldera): la mata es un bejuco trepador.',
      profundidad: 'Siembre el trozo a 8-10 cm en camellón o montículo de tierra suelta.',
    },
    clima: {
      luz: 'Sol pleno; necesita tutor para trepar.',
      agua: 'Buena lluvia en el crecimiento; suelo suelto y profundo.',
      piso: 'Clima cálido, 0-1.000 msnm (Caribe y costa).',
    },
    aporque: 'Se siembra en camellón o caballón alto para que el tubérculo engorde en tierra suelta; arrímele tierra al montículo a medida que crece.',
    cosecha: 'Larga: 8-11 meses, cuando el bejuco se seca. Escarbe con cuidado que el tubérculo es grande y se parte fácil.',
    conservacion: 'Buena guarda si se cura: en sitio fresco, seco y ventilado, sobre zarzo o troja, aguanta varios meses. No lo golpee, que por la herida se pudre.',
    vecinasBuenas: [], // grafo sin arista de compatibilidad para el ñame
    vecinasMalas: [],
    // Grafo: pest_controllers (antracnosis del follaje, familia Colletotrichum).
    plagas: [
      { nombre: 'Antracnosis del ñame (Colletotrichum)', controles: ['Hongo antagonista del suelo', 'Trichoderma spp.', 'Bacteria antagonista (biofungicida)', 'Microorganismo de control biológico (DR-MIP-1)'] },
    ],
    biopreparados: [],
    fuentes: { cultivo: FUENTES.pancoger, relaciones: FUENTES.grafo },
  },
  {
    id: 'batata',
    nombre: 'Batata (camote)',
    variedades: 'De pulpa blanca, amarilla, anaranjada y morada',
    cientifico: 'Ipomoea batatas',
    grafoId: 'ipomoea_batatas',
    emoji: '🍠',
    foto: 'batata',
    accent: 'rose',
    resumen: 'La raíz dulce y rústica. Se siembra de un bejuco (guía), no de semilla; el curado la hace guardar meses.',
    siembra: {
      metodo: 'Por esqueje/guía: un bejuco de 25-30 cm con varios nudos, acostado y enterrado. También de los brotes de la batata-semilla.',
      distancia: '30-40 cm entre matas y 90-100 cm entre surcos, en camellón.',
      profundidad: 'Entierre 2 o 3 nudos del esqueje acostado; de cada nudo enraíza.',
    },
    clima: {
      luz: 'Sol pleno.',
      agua: 'Rústica, aguanta la sequía; poco encharcamiento.',
      piso: 'Clima cálido y medio, 0-2.000 msnm.',
    },
    aporque: 'Se siembra en camellón o caballón alto para que la raíz engorde. Levante las guías de vez en cuando: si enraízan por todo lado, dan puro bejuco y poca batata.',
    cosecha: 'A los 4-6 meses, cuando la hoja empieza a amarillear. Escarbe con cuidado, que la batata se magulla fácil.',
    conservacion: 'El CURADO es la clave: deje la batata unos días en sitio cálido y húmedo para que cicatrice la cáscara, y luego guárdela en fresco y seco — así aguanta meses. Ojo con el picudo (gorgojo, Cylas): coseche a tiempo y no deje batatas ni residuos expuestos, porque ahí se cría.',
    // Grafo: ipomoea_batatas compatible_with.
    vecinasBuenas: ['Frijol', 'Maíz'],
    vecinasMalas: [], // grafo sin arista de antagonismo
    // Grafo: pest_controllers (picudo groundeado).
    plagas: [
      { nombre: 'Picudo de la batata (gorgojo del camote, Cylas)', controles: ['Hongo entomopatógeno (beauveria)'] },
    ],
    biopreparados: [],
    fuentes: { cultivo: FUENTES.pancoger, relaciones: FUENTES.grafo },
  },
  {
    id: 'oca',
    nombre: 'Oca (hibia)',
    variedades: 'Rosada, amarilla, blanca y morada',
    cientifico: 'Oxalis tuberosa',
    grafoId: 'oxalis_tuberosa',
    emoji: '🌱',
    foto: 'oca',
    accent: 'rose',
    resumen: 'Tubérculo de colores del páramo. Se endulza al sol después de cosechada.',
    siembra: {
      metodo: 'Por tubérculo-semilla entero, brotado.',
      distancia: '30-40 cm entre matas y 70-90 cm entre surcos.',
      profundidad: '8-10 cm en el surco.',
    },
    clima: {
      luz: 'Sol pleno del clima frío.',
      agua: 'Humedad pareja.',
      piso: 'Clima frío y páramo bajo, 2.800-3.800 msnm.',
    },
    aporque: 'Aporque bien: la oca forma tubérculos superficiales, como la papa criolla, y sin tierra encima se enverdecen.',
    cosecha: 'Larga: 6-8 meses, después de las primeras heladas, cuando la mata se seca.',
    conservacion: 'Asoléela unos días después de cosechada: el sol le baja el ácido (oxálico) y la vuelve dulce — el "endulzado" al sol. Guardada en fresco y oscuro aguanta semanas.',
    // Grafo: oxalis_tuberosa compatible_with.
    vecinasBuenas: ['Arracacha', 'Papa (sabanera)', 'Cubio (mashua)', 'Maíz'],
    vecinasMalas: [], // grafo sin arista de antagonismo
    // Grafo: pest_controllers.
    plagas: [
      { nombre: 'Nematodo agallador', controles: ['Hongo antagonista del suelo', 'Hongo nematófago (paecilomyces)', 'Microorganismo de control biológico (DR-MIP-1)'] },
    ],
    biopreparados: [],
    fuentes: { cultivo: FUENTES.pancoger, relaciones: FUENTES.grafo },
  },
  {
    id: 'cubio',
    nombre: 'Cubio (mashua)',
    variedades: 'Amarillo, morado y jaspeado',
    cientifico: 'Tropaeolum tuberosum',
    grafoId: 'tropaeolum_tuberosum',
    emoji: '🌱',
    foto: 'cubio',
    accent: 'amber',
    resumen: 'El más rústico del páramo: trepa, casi no le da plaga y rinde harto.',
    siembra: {
      metodo: 'Por tubérculo-semilla entero, brotado.',
      distancia: '40-50 cm entre matas; agradece un tutor o sembrarlo en el borde, que trepa.',
      profundidad: '8-10 cm en el surco.',
    },
    clima: {
      luz: 'Sol pleno.',
      agua: 'Humedad pareja; es de las más rústicas y aguantadoras.',
      piso: 'Clima frío y páramo, 2.800-3.800 msnm.',
    },
    aporque: 'Aporque al pie tapando el cuello para que engorden más tubérculos.',
    cosecha: 'Larga: 6-8 meses. Rinde mucho y resiste bien las plagas del suelo.',
    conservacion: 'Se guarda bien en fresco. Asoléelo unos días para bajarle el picante y el amargo antes de comerlo. Aguanta semanas.',
    // Grafo: tropaeolum_tuberosum compatible_with.
    vecinasBuenas: ['Arracacha', 'Oca (hibia)', 'Papa (sabanera)', 'Maíz'],
    vecinasMalas: [], // grafo sin arista de antagonismo
    plagas: [], // grafo sin plaga registrada (el cubio es famoso por lo sano)
    biopreparados: [],
    fuentes: { cultivo: FUENTES.pancoger, relaciones: FUENTES.grafo },
  },
  {
    id: 'ulluco',
    nombre: 'Ulluco (chugua)',
    variedades: 'Amarillo, rosado y rojo (papa lisa, melloco)',
    cientifico: 'Ullucus tuberosus',
    grafoId: 'ullucus_tuberosus',
    emoji: '🌱',
    foto: 'ulluco',
    accent: 'rose',
    resumen: 'El tubérculo liso y de colores del páramo; la hoja también se come.',
    siembra: {
      metodo: 'Por tubérculo-semilla entero, brotado.',
      distancia: '30-40 cm entre matas y 70-90 cm entre surcos.',
      profundidad: '8-10 cm en el surco.',
    },
    clima: {
      luz: 'Sol pleno o media sombra.',
      agua: 'Humedad pareja; pide suelo con buena materia orgánica.',
      piso: 'Clima frío y páramo, 2.800-3.800 msnm.',
    },
    aporque: 'Aporque bien: forma sus tubercitos de colores muy superficiales.',
    cosecha: 'Larga: 6-8 meses, cuando la mata se seca tras las heladas.',
    conservacion: 'Se guarda razonable en fresco y oscuro. La cáscara es delgada y se magulla, así que manéjelo con cuidado.',
    vecinasBuenas: [], // grafo sin arista de compatibilidad para el ulluco
    vecinasMalas: [],
    // Grafo: pest_controllers.
    plagas: [
      { nombre: 'Nematodo agallador', controles: ['Hongo antagonista del suelo', 'Hongo nematófago (paecilomyces)', 'Microorganismo de control biológico (DR-MIP-1)'] },
    ],
    biopreparados: [],
    fuentes: { cultivo: FUENTES.pancoger, relaciones: FUENTES.grafo },
  },
];

/** Mapa id → tubérculo, para resolver la ficha desde la grilla. */
export const TUBERCULO_BY_ID = Object.fromEntries(TUBERCULOS.map((t) => [t.id, t]));

/** Resuelve un tubérculo por su id (null si no existe). */
export const getTuberculo = (id) => TUBERCULO_BY_ID[id] || null;

/**
 * ¿Este campo del grafo tiene dato? Un arreglo vacío = "dato en camino".
 * @param {unknown[]} lista
 * @returns {boolean}
 */
export const tieneDato = (lista) => Array.isArray(lista) && lista.length > 0;
