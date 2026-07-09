/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (fichas de cultivo de los frutales de la finca), pendiente de migrar a
 * src/config/messages.js — mismo criterio que cafeFinca.js / aguaFinca.js.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * frutalesFinca.js — CONTENIDO del mundo "Frutales de la finca con vida".
 *
 * REGLA ANTI-ALUCINACIÓN (igual que cafeFinca.js): todo lo CUALITATIVO
 * (propagación, prácticas, señales de plaga, manejo agroecológico) vive aquí
 * como copy groundeado en fuentes colombianas (AGROSAVIA, ICA, Universidad
 * Nacional). Las CIFRAS DURAS que dependen del sitio (dosis de fertilizante, kg
 * por árbol) NO se inventan: son SLOTS `grounded_pendiente` o se remiten al
 * análisis de suelo / al agente. Las DISTANCIAS de siembra y los rangos de
 * ciclo son valores ORIENTADORES documentados (AGROSAVIA), presentados como
 * rango que varía con el patrón, el vigor y la zona.
 *
 * GROUNDING DEL GRAFO (public/grafo-relations.json):
 *   - Plagas y enfermedades por especie salen de `pest_controllers`
 *     (arista AFFECTS pest→cultivo) y sus controladores biológicos de la
 *     arista CONTROLS (biocontrol→pest). Las especies usadas están verificadas
 *     en el grafo: citrus_sinensis, citrus_latifolia, citrus_reticulata,
 *     persea_americana, mangifera_indica, psidium_guajava, rubus_glaucus,
 *     solanum_quitoense, solanum_betaceum, carica_papaya.
 *   - El ciclo (años a primera cosecha, piso térmico, temporada) sale de
 *     src/data/perennialCycles.js (AGROSAVIA), citado con su confianza.
 *
 * REGLA ANTI-VENENO: el manejo que se muestra es agroecológico e MIP (cultural
 * + control biológico del grafo + biopreparados). NO se dan dosis de
 * plaguicidas de síntesis. Para el caso puntual de una finca, el agente.
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/** Ruta base de las fotos del mundo Frutales (Wikimedia Commons, licencia abierta). */
export const FOTO_BASE_FRUTALES = '/frutales';

/** Nota anti-receta compartida (misma política que el café). */
export const NOTA_SIN_QUIMICOS =
  'Aquí no encontrará dosis de veneno: el manejo es agroecológico e integrado (labores culturales, control biológico y biopreparados). La dosis de abono depende del análisis de su suelo. Para su caso concreto, hable con su UMATA/Agrosavia o con el agente.';

/**
 * Chip de estado para cifras que dependen del sitio y no se inventan.
 * (Lo pinta el componente con el mismo criterio "dato en camino" del café.)
 */
export const SLOT_FERTILIZACION = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  texto: 'La dosis de abono se calcula con el análisis de suelo del lote y la edad del árbol; no hay una receta única.',
};

/* ────────────────────────────────────────────────────────────────────────
 * LAS FICHAS DE CULTIVO
 * Cada frutal: propagación · siembra y distancias · luz/agua/piso térmico ·
 * plagas y enfermedades (grafo) · poda · cosecha y poscosecha.
 * Los biocontroles de cada plaga son los `controladores` del grafo, en
 * lenguaje campesino; el campo `plagaGrafo` deja la trazabilidad al nodo AGE.
 * ──────────────────────────────────────────────────────────────────────── */
export const FRUTALES = [
  /* ── CÍTRICOS (naranja, mandarina, limón) ─────────────────────────────── */
  {
    id: 'citricos',
    nombre: 'Cítricos',
    subtitulo: 'naranja, mandarina, limón',
    cientifico: 'Citrus spp.',
    foto: 'citricos',
    color: 'orange',
    resumen:
      'La naranja, la mandarina y el limón son el corazón del solar. Se propagan injertados sobre un patrón que les da vigor y aguante a las enfermedades del suelo, y una vez prendidos dan fruta muchos años.',
    propagacion: {
      metodo: 'Injerto sobre patrón',
      detalle:
        'No se siembran de pepa: se INJERTAN. Sobre un patrón resistente (mandarino Cleopatra, Sunki, o los tolerantes a la tristeza) se pega la yema de la variedad que se quiere. El patrón manda en la sanidad de la raíz y en el porte; por eso se compra el arbolito a un vivero registrado ante el ICA, no de cualquier palo.',
    },
    siembra: {
      distancia: '5 a 7 m entre árboles (orientador)',
      detalle:
        'La distancia final depende del patrón y del vigor de la variedad; en cítrico vigoroso se abre más (6×6 o 7×7 m), en porte bajo se cierra. Hoyo grande, con materia orgánica, sin enterrar el punto del injerto (queda por encima de la tierra).',
    },
    aguaLuz:
      'Pleno sol y suelo bien drenado: el cítrico odia el encharcamiento (le pudre la raíz). Riego parejo en la floración y el llenado del fruto; en veranos largos, riego de apoyo para que no bote la cosecha.',
    piso: {
      altitud: 'Del nivel del mar hasta ~2100 msnm (limón Tahití)',
      nota: 'La naranja y la mandarina se dan de clima cálido a medio; el limón Tahití aguanta hasta ~2100 msnm. La fecha de cosecha varía mucho por región.',
      fuente: 'AGROSAVIA (perennialCycles: citrus_latifolia confianza alta; citrus_sinensis confianza baja)',
    },
    poda: 'Poda de formación los primeros años (un tronco limpio y 3–4 ramas madre), y luego poda sanitaria: sacar ramas secas, enfermas o que se cruzan, y "destetar" los chupones que salen por debajo del injerto. Deje entrar luz y aire al centro del árbol.',
    cosecha: {
      inicio: '3–5 años (naranja); 3–4 años (limón Tahití)',
      punto: 'El cítrico NO madura después de cogido: se coge en el punto, con color y jugo. La naranja y la mandarina se prueban; el limón se coge verde-lustroso o pintón según el mercado.',
      poscosecha:
        'Corte con tijera dejando un cabito corto (arrancarlo abre la puerta a hongos). Manéjelo con cuidado —el golpe se pudre— y guárdelo fresco y ventilado. El limón dura más si se coge sin sol del mediodía.',
      fuente: 'AGROSAVIA / ICA',
    },
    plagas: [
      {
        id: 'minador',
        nombre: 'Minador de la hoja de los cítricos',
        tipo: 'plaga',
        plagaGrafo: 'Minador de la hoja de cítricos',
        senal: 'Caminos plateados y retorcidos dentro de las hojas nuevas; la hoja se enrolla. Pega duro en los arbolitos y en los brotes tiernos.',
        biocontrol: ['Avispitas parasitoides (control biológico del grafo)', 'Caldo de ceniza-jabón sobre el brote tierno'],
      },
      {
        id: 'mosca-fruta',
        nombre: 'Mosca de la fruta',
        tipo: 'plaga',
        plagaGrafo: 'Mosca de la fruta (Anastrepha spp.)',
        senal: 'La mosca pica el fruto y pone el huevo; adentro salen gusanos y la fruta se pudre y se cae. Es la plaga que más castiga la fruta en el mercado.',
        biocontrol: ['Avispitas parasitoides', 'Hongo Beauveria', 'Recoja y entierre la fruta picada (corta el ciclo)', 'Trampas caseras con cebo'],
      },
      {
        id: 'escamas-cochinilla',
        nombre: 'Escamas y cochinillas',
        tipo: 'plaga',
        plagaGrafo: 'Cochinilla harinosa de los cítricos',
        senal: 'Motas blancas algodonosas o costritas pegadas al tallo y al envés de la hoja; luego sale la fumagina (un tizne negro pegajoso) que ensucia la hoja.',
        biocontrol: ['Mariquitas depredadoras de cochinilla', 'Avispitas parasitoides', 'Aceite + jabón sobre la colonia'],
      },
      {
        id: 'antracnosis',
        nombre: 'Antracnosis',
        tipo: 'enfermedad',
        plagaGrafo: 'Antracnosis de frutales',
        senal: 'Manchas hundidas y oscuras en fruto, hoja y ramitas; con humedad se pudre el fruto. Empuja fuerte en tiempo lluvioso y con árbol mal aireado.',
        biocontrol: ['Trichoderma', 'Bacterias antagonistas (biofungicida)', 'Poda para airear y sacar lo enfermo', 'Caldo bordelés como protector'],
      },
    ],
    cuarentena: {
      titulo: 'HLB / dragón amarillo — enfermedad de reporte al ICA',
      detalle:
        'El Huanglongbing (HLB o dragón amarillo) es la enfermedad más grave del cítrico: NO tiene cura y mata el árbol. La reparte un insecto chupador (el psílido asiático). El manejo es PREVENIR: compre árboles certificados, controle el psílido (hay hongos y mariquitas que lo atacan, en el grafo) y REPORTE al ICA si ve ramas amarillas y fruta deforme. Es de reporte obligatorio.',
      plagaGrafo: 'Huanglongbing (HLB) / dragón amarillo de los cítricos',
    },
    biopreparados: ['Aceite/emulsión de nim (neem)', 'Aceite + jabón (anti-cochinilla y escamas)', 'Caldo de ceniza-jabón (anti-minador)', 'Lechada de cal en el tronco', 'Trampa de melaza'],
  },

  /* ── AGUACATE ─────────────────────────────────────────────────────────── */
  {
    id: 'aguacate',
    nombre: 'Aguacate',
    subtitulo: 'cura, palta',
    cientifico: 'Persea americana',
    foto: 'aguacate',
    color: 'lime',
    resumen:
      'El aguacate es el árbol que más cuida sus raíces: se propaga injertado y se siembra alto y drenado, porque su enemigo número uno vive en el suelo encharcado. Bien plantado, es una renta larga.',
    propagacion: {
      metodo: 'Injerto sobre patrón',
      detalle:
        'Se injerta la variedad (Hass, Lorena, Choquette, criollos) sobre un patrón de semilla. El patrón le da resistencia a la pudrición de la raíz; por eso vale la pena el árbol injertado y certificado, y no el que nace solo debajo del palo.',
    },
    siembra: {
      distancia: '7 a 9 m entre árboles (orientador)',
      detalle:
        'Es un árbol grande: déjele aire. Siémbrelo en ALTO —en camellón o montículo— para que el agua escurra y nunca se empoce en la raíz. Nada de siembra en bajo o en tierra pesada sin drenar.',
    },
    aguaLuz:
      'Pleno sol y, sobre todo, DRENAJE. El aguacate se muere con la raíz encharcada más que con la seca. Riego de apoyo en floración y llenado, pero jamás dejarlo con los pies en el agua.',
    piso: {
      altitud: '1340–2420 msnm (óptimo 1800–2000 para Hass)',
      nota: 'El calendario depende fuerte de la localidad y la altitud; hay fincas que producen casi todo el año. Consulte el patrón de su zona.',
      fuente: 'AGROSAVIA, Universidad Nacional (perennialCycles: persea_americana, confianza media)',
    },
    poda: 'Poda de formación para bajar la altura (que se pueda cosechar sin peligro), abrir el centro y quitar ramas bajas, secas o enfermas. En Hass se maneja la altura para trabajar el árbol desde el suelo.',
    cosecha: {
      inicio: '2–4 años (injertado)',
      punto: 'El aguacate se coge "hecho" pero DURO y madura en la casa. El punto se conoce por el tamaño, el brillo que se apaga y, en Hass, el cambio de color; cogido tierno, nunca ablanda bien.',
      poscosecha:
        'Corte con tijera dejando un cabito; no lo arranque ni lo deje caer. Se madura a temperatura ambiente en pocos días; el frío de la nevera lo frena una vez está a punto. El golpe se mancha por dentro.',
      fuente: 'AGROSAVIA',
    },
    plagas: [
      {
        id: 'pudricion-raiz',
        nombre: 'Pudrición de la raíz (Phytophthora)',
        tipo: 'enfermedad',
        plagaGrafo: 'Pudrición radicular del aguacate',
        senal: 'El árbol se ve triste, con hojas pequeñas y amarillas, ramas que se secan de arriba hacia abajo; por debajo, raíces negras y podridas. Es la muerte del aguacate en suelo encharcado.',
        biocontrol: ['Trichoderma al suelo', 'Bacterias antagonistas (biofungicida)', 'Drenaje y siembra en alto (lo primero)', 'Materia orgánica que active el suelo'],
      },
      {
        id: 'antracnosis-ag',
        nombre: 'Antracnosis',
        tipo: 'enfermedad',
        plagaGrafo: 'Antracnosis de frutales',
        senal: 'Manchas negras hundidas en el fruto que pudren la pulpa, sobre todo al madurar; también quema puntas de hoja. Peor en lluvia.',
        biocontrol: ['Trichoderma', 'Bacterias antagonistas', 'Recoja fruta y hojas enfermas', 'Caldo bordelés protector'],
      },
      {
        id: 'barrenador-ag',
        nombre: 'Barrenador y mosca del fruto',
        tipo: 'plaga',
        plagaGrafo: 'Barrenador del fruto del aguacate',
        senal: 'Perforaciones y aserrín en el fruto o en la semilla; la larva barrena por dentro y el fruto se cae. La mosca del aguacate también pica y daña.',
        biocontrol: ['Avispita parasitoide de huevos', 'Bt (Bacillus thuringiensis)', 'Hongo Beauveria', 'Recoja y entierre la fruta caída'],
      },
      {
        id: 'acaros-trips',
        nombre: 'Ácaros y trips',
        tipo: 'plaga',
        plagaGrafo: 'Ácaro del aguacate',
        senal: 'Bronceado o telita fina en el envés de la hoja (ácaros) y raspaduras plateadas en fruto y hoja tierna (trips); castigan brote y cuaje.',
        biocontrol: ['Ácaros depredadores', 'Chinche pirata (Orius)', 'Hongo Beauveria', 'Nim'],
      },
    ],
    biopreparados: ['Caldo bordelés', 'Bocashi', 'Biol', 'Supermagro', 'Trichoderma al suelo', 'Micorrizas', 'Lechada de cal en el tronco'],
  },

  /* ── MANGO ────────────────────────────────────────────────────────────── */
  {
    id: 'mango',
    nombre: 'Mango',
    subtitulo: 'manga, mancera',
    cientifico: 'Mangifera indica',
    foto: 'mango',
    color: 'amber',
    resumen:
      'El mango es árbol de tierra caliente, de una gran cosecha al año. Las variedades finas se injertan; el criollo de pepa da sombra y fruta de traspatio. Su pelea es con la antracnosis y la mosca de la fruta.',
    propagacion: {
      metodo: 'Injerto (variedades finas) o semilla (criollo)',
      detalle:
        'Las variedades comerciales (Tommy, Keitt, Kent, azúcar, Hilacha) se INJERTAN para que salgan iguales a la madre y produzcan pronto. El mango criollo de pepa sirve de patrón y de árbol de sombra, pero tarda más y sale disparejo.',
    },
    siembra: {
      distancia: '8 a 10 m entre árboles (orientador)',
      detalle:
        'Es de los árboles más grandes de la finca: déjele mucho espacio (10×10 m en criollo vigoroso). Pleno sol y suelo profundo. En huerto casero, uno o dos árboles bastan para toda la familia.',
    },
    aguaLuz:
      'Pleno sol y clima cálido. Necesita una temporada SECA para florecer bien: la lluvia en plena floración bota la flor y dispara la antracnosis. Riego en el llenado del fruto y descanso seco antes de florecer.',
    piso: {
      altitud: 'Tierra cálida (típico por debajo de ~1200 msnm)',
      nota: 'Una temporada marcada al año: floración hacia agosto–octubre y cosecha hacia noviembre–diciembre en el Tolima; cambia de fecha según la región.',
      fuente: 'AGROSAVIA (perennialCycles: mangifera_indica, confianza media)',
    },
    poda: 'Poda de formación para dar una copa baja y abierta, y poda sanitaria después de cosecha: sacar ramas secas, enfermas y las "escobas". Airear la copa baja la antracnosis y facilita la recolección.',
    cosecha: {
      inicio: '3–5 años (injertado)',
      punto: 'Se coge "en sazón" —hecho pero firme— y termina de madurar en la casa. El punto se ve en el hombro del fruto que se llena y el color que vira; cogido verde-tierno queda fibroso y sin dulce.',
      poscosecha:
        'Corte dejando un cabito y deje escurrir el látex boca abajo un rato (el látex mancha la cáscara). Madura a temperatura ambiente; el golpe y el sol fuerte lo dañan rápido.',
      fuente: 'AGROSAVIA',
    },
    plagas: [
      {
        id: 'antracnosis-mango',
        nombre: 'Antracnosis',
        tipo: 'enfermedad',
        plagaGrafo: 'Antracnosis de frutales',
        senal: 'Manchas negras en flor, hoja y fruto; quema la flor (menos cuaje) y pinta el fruto de manchas que se pudren al madurar. La enfermedad #1 del mango en clima húmedo.',
        biocontrol: ['Trichoderma', 'Bacterias antagonistas (biofungicida)', 'Poda para airear y florecer en seco', 'Caldo bordelés protector'],
      },
      {
        id: 'mosca-mango',
        nombre: 'Mosca de la fruta',
        tipo: 'plaga',
        plagaGrafo: 'Mosca de la fruta (Anastrepha spp.)',
        senal: 'Pica el fruto en sazón y pone huevos; adentro salen gusanos y el mango se pudre y se cae. Es la plaga que cierra mercados de exportación.',
        biocontrol: ['Avispitas parasitoides', 'Hongo Beauveria', 'Recoja y entierre la fruta picada', 'Trampas con cebo'],
      },
      {
        id: 'oidio-mango',
        nombre: 'Mildeo polvoso (oídio)',
        tipo: 'enfermedad',
        plagaGrafo: 'Oidio o mildeo polvoso',
        senal: 'Polvillo blanco sobre las flores y los frutos chiquitos; la flor se seca y no cuaja. Ataca en floración con noches frescas.',
        biocontrol: ['Microorganismos de control biológico', 'Caldo de cola de caballo (refuerzo silíceo)', 'Airear la copa con poda'],
      },
      {
        id: 'acaro-yemas',
        nombre: 'Ácaro de las yemas',
        tipo: 'plaga',
        plagaGrafo: 'Ácaro de las yemas del mango',
        senal: 'Deforma las yemas y los brotes nuevos, que salen achaparrados o en "escoba"; debilita la floración.',
        biocontrol: ['Hongo Beauveria', 'Ácaros depredadores (Amblyseius)', 'Poda de brotes muy afectados'],
      },
    ],
    biopreparados: ['Lechada de cal en el tronco', 'Caldo bordelés', 'Caldo de cola de caballo'],
  },

  /* ── GUAYABA ──────────────────────────────────────────────────────────── */
  {
    id: 'guayaba',
    nombre: 'Guayaba',
    subtitulo: 'guayabo',
    cientifico: 'Psidium guajava',
    foto: 'guayaba',
    color: 'rose',
    resumen:
      'La guayaba es el frutal noble del campesino: crece de semilla, aguanta de todo y carga harto. La floración se maneja con poda y abono, y su enemigo puntual es el picudo que barrena el fruto.',
    propagacion: {
      metodo: 'Semilla, injerto o acodo',
      detalle:
        'Nace fácil de semilla, pero sale disparejo; para asegurar la calidad de una variedad (pera, manzana, roja) se INJERTA o se hace ACODO (enraizar una rama en el mismo árbol). El acodo da un árbol igualito a la madre y más rápido.',
    },
    siembra: {
      distancia: '5 a 6 m entre árboles (orientador)',
      detalle:
        'Árbol mediano y agradecido: se adapta a muchos suelos, hasta a los pobres. Pleno sol. En huerto casero uno o dos árboles cargan más de lo que se come la familia.',
    },
    aguaLuz:
      'Pleno sol y rústica con el agua: aguanta épocas secas, pero para buena cosecha necesita riego en el llenado. Un estrés seco seguido de riego y abono es lo que dispara la floración.',
    piso: {
      altitud: 'Del nivel del mar hasta ~1800 msnm',
      nota: 'El árbol cuaja y madura el fruto en unos 4 meses; la floración se concentra hacia comienzos de año en zonas como Santander.',
      fuente: 'AGROSAVIA (perennialCycles: psidium_guajava, confianza media)',
    },
    poda: 'Responde muy bien a la poda: se poda para renovar ramas y CONCENTRAR la floración (la guayaba florece en madera nueva). Poda de formación baja + poda de producción para no dejarla enmontar y para que la fruta quede a la mano.',
    cosecha: {
      inicio: '2–4 años',
      punto: 'Se coge pintona-madura: la cáscara pasa de verde oscuro a verde claro/amarillento y suelta olor. Madura rápido después de cogida, así que se recoge seguido.',
      poscosecha:
        'Fruta delicada y perecedera: se magulla y se pasa en pocos días. Cójala con cuidado, en punto, y consúmala o transfórmela pronto (bocadillo, jalea, pulpa). Es reina de la despensa.',
      fuente: 'AGROSAVIA',
    },
    plagas: [
      {
        id: 'picudo-guayaba',
        nombre: 'Picudo de la guayaba',
        tipo: 'plaga',
        plagaGrafo: 'Picudo de la guayaba',
        senal: 'Un cucarrón que pone el huevo en el fruto tierno; la larva barrena por dentro y la guayaba se daña y se cae. La plaga clave del guayabo.',
        biocontrol: ['Nematodos entomopatógenos (Steinernema, Heterorhabditis)', 'Recoja y entierre TODA la fruta caída y picada', 'Embolsar el fruto', 'Trampas'],
      },
      {
        id: 'mosca-guayaba',
        nombre: 'Mosca de la fruta',
        tipo: 'plaga',
        plagaGrafo: 'Mosca de la fruta (Anastrepha spp.)',
        senal: 'Pica el fruto en sazón; adentro gusanos y pudrición. Comparte manejo con el picudo: la limpieza del suelo es clave.',
        biocontrol: ['Avispitas parasitoides', 'Hongo Beauveria', 'Recoja la fruta del suelo', 'Trampas con cebo'],
      },
      {
        id: 'cochinilla-guayaba',
        nombre: 'Cochinilla rosada',
        tipo: 'plaga',
        plagaGrafo: 'Cochinilla rosada del hibisco',
        senal: 'Colonias rosadas-blancuzcas en brotes y frutos, que deforman y debilitan; atrás viene la fumagina negra.',
        biocontrol: ['Mariquitas depredadoras de cochinilla', 'Avispitas parasitoides', 'Hongo Beauveria', 'Aceite + jabón'],
      },
    ],
    biopreparados: ['Aceite + jabón (anti-cochinilla)', 'Nim', 'Caldo de ceniza-jabón'],
  },

  /* ── MORA ─────────────────────────────────────────────────────────────── */
  {
    id: 'mora',
    nombre: 'Mora',
    subtitulo: 'mora de Castilla, mora andina',
    cientifico: 'Rubus glaucus',
    foto: 'mora',
    color: 'fuchsia',
    resumen:
      'La mora de Castilla es la fruta de tierra fría: un arbusto espinoso y trepador que, bien tutorado y podado, produce casi todo el año. Su pelea es con la humedad, que le trae botrytis y antracnosis.',
    propagacion: {
      metodo: 'Estaca, acodo o hijuelos',
      detalle:
        'Se multiplica por partes de la misma planta: estacas de tallo, acodo de punta (enterrar la puntica de una rama para que enraíce) o hijuelos. Así se conserva la variedad y se evita traer enfermedades de semilla. Prefiera material sano y limpio de virus.',
    },
    siembra: {
      distancia: '2 a 3 m entre plantas, en espaldera (orientador)',
      detalle:
        'Se siembra CON TUTORADO: espaldera de alambre o emparrado, para levantar los tallos del suelo. Eso airea la planta, baja las enfermedades, y facilita cosechar sin espinarse tanto. Suelo con mucha materia orgánica y bien drenado.',
    },
    aguaLuz:
      'Sol pleno o media sombra ligera, en clima fresco. Riego parejo —no aguanta ni sequía fuerte ni encharcamiento—. La buena ventilación entre plantas es media pelea ganada contra los hongos.',
    piso: {
      altitud: '1200–3200 msnm (tierra fría andina)',
      nota: 'Recolección casi semanal una vez en plena producción (cerca de los 15 meses de sembrada).',
      fuente: 'AGROSAVIA (perennialCycles: rubus_glaucus, confianza media)',
    },
    poda: 'Poda continua y clave: sacar las cañas viejas que ya produjeron (se secan) y dejar renovar las nuevas; despuntar para que ramifique y cargue. La poda sanitaria —quitar lo enfermo y airear— es la mejor defensa contra la botrytis.',
    cosecha: {
      inicio: '~1 año (plena producción ~15 meses)',
      punto: 'Se coge bien madura, morada-negra y que suelte fácil: la mora NO madura después de cogida. Se cosecha grano a grano, seguido (casi semanal), en las horas frescas.',
      poscosecha:
        'Fruta muy delicada: se magulla y fermenta rápido. Cójala seca (sin rocío), en recipiente poco hondo para que no se aplaste, y enfríela pronto. Para guardar, congelada o en pulpa.',
      fuente: 'AGROSAVIA',
    },
    plagas: [
      {
        id: 'botrytis-mora',
        nombre: 'Podredumbre gris (botrytis)',
        tipo: 'enfermedad',
        plagaGrafo: 'Podredumbre gris (Botrytis)',
        senal: 'Moho gris peludo sobre flores y frutos que se pudren; peor en tiempo húmedo y plantas apretadas. La enfermedad que más daña la mora cogida.',
        biocontrol: ['Trichoderma', 'Bacterias antagonistas (biofungicida)', 'Poda para airear y cosechar seco', 'No dejar fruta pasada en la planta'],
      },
      {
        id: 'arana-roja-mora',
        nombre: 'Araña roja (ácaro)',
        tipo: 'plaga',
        plagaGrafo: 'Arana roja / acaro de dos manchas (polifago: tomate, frijol, etc.)',
        senal: 'Punteado amarillo y telita fina en el envés de la hoja, que se seca; empuja en tiempo seco y caliente.',
        biocontrol: ['Ácaros depredadores (Neoseiulus, Amblyseius)', 'Crisopa', 'Chinche pirata (Orius)', 'Hongo Beauveria'],
      },
      {
        id: 'antracnosis-mora',
        nombre: 'Antracnosis',
        tipo: 'enfermedad',
        plagaGrafo: 'Antracnosis de frutales',
        senal: 'Manchas y llagas hundidas en cañas y frutos; debilita el tallo y pudre la fruta. Peor en humedad y con exceso de nitrógeno.',
        biocontrol: ['Trichoderma', 'Bacterias antagonistas', 'Poda sanitaria de cañas enfermas', 'Caldo bordelés'],
      },
    ],
    biopreparados: ['Caldo bordelés', 'Bocashi', 'Biol', 'Humus líquido (lixiviado de lombriz)', 'Lixiviado de frutas'],
  },

  /* ── LULO ─────────────────────────────────────────────────────────────── */
  {
    id: 'lulo',
    nombre: 'Lulo',
    subtitulo: 'naranjilla',
    cientifico: 'Solanum quitoense',
    foto: 'lulo',
    color: 'yellow',
    resumen:
      'El lulo es la fruta ácida de las lomas frescas: una mata de hojas grandes y aterciopeladas que carga bolitas anaranjadas. Es solanácea, así que comparte enemigos con la papa y el tomate; el suelo sano es todo.',
    propagacion: {
      metodo: 'Semilla (semillero) o estaca',
      detalle:
        'Se hace semillero con semilla sana y se trasplanta la matica cuando está de buen tamaño. También prende de estaca. Empiece siempre de material limpio: por ser solanácea, arrastra fácil hongos del suelo (Fusarium) si se descuida.',
    },
    siembra: {
      distancia: '2 x 2 m aprox. (orientador)',
      detalle:
        'Mata mediana y frágil de tallo: conviene TUTORARLA para que el viento y el peso de la carga no la tumben. Suelo suelto, con mucha materia orgánica y muy bien drenado —el encharcamiento le trae la marchitez—.',
    },
    aguaLuz:
      'Media sombra ligera y clima fresco: el sol bravo del mediodía la quema. Riego parejo sin encharcar. La rotación (no sembrar lulo tras papa o tomate en el mismo lote) corta el ciclo de sus enfermedades.',
    piso: {
      altitud: '1800–2600 msnm (clima fresco)',
      nota: 'La recolección inicia cerca del primer año y se sostiene varios meses; el calendario cambia con la altitud.',
      fuente: 'Universidad Nacional, AGROSAVIA (perennialCycles: solanum_quitoense, confianza media)',
    },
    poda: 'Poda de sostenimiento: quitar hojas viejas de abajo, chupones y lo enfermo, para airear la mata y facilitar la cosecha entre las espinas. Deje pocos tallos bien cargados en vez de un montón débil.',
    cosecha: {
      inicio: '1–2 años',
      punto: 'Se coge cuando el fruto vira de verde a anaranjado parejo y suelta fácil; la pelusa de la cáscara se cae al sobar. Cogido verde no termina de coger dulzura.',
      poscosecha:
        'Cójalo con guante o trapo (la pelusa pica) y con cabito. Aguanta unos días fresco y ventilado; para guardar, se despulpa y se congela. Cuidado con el golpe.',
      fuente: 'AGROSAVIA',
    },
    plagas: [
      {
        id: 'antracnosis-lulo',
        nombre: 'Antracnosis del fruto',
        tipo: 'enfermedad',
        plagaGrafo: 'Antracnosis del tomate de árbol',
        senal: 'Manchas hundidas y oscuras en el fruto que lo pudren; también en hoja y tallo. Peor en humedad.',
        biocontrol: ['Trichoderma', 'Bacterias antagonistas (biofungicida)', 'Recoja fruta enferma', 'Airear con poda'],
      },
      {
        id: 'fusarium-lulo',
        nombre: 'Marchitez por Fusarium',
        tipo: 'enfermedad',
        plagaGrafo: 'Marchitez del lulo y solanáceas por Fusarium',
        senal: 'La mata se marchita de un lado o entera aunque haya humedad; por dentro el tallo se ve pardo. Vive en el suelo y no perdona el encharcamiento ni la siembra repetida.',
        biocontrol: ['Microorganismos de control biológico', 'Trichoderma al suelo', 'Drenaje y rotación de cultivo', 'Material de siembra sano'],
      },
      {
        id: 'pasador-lulo',
        nombre: 'Pasador del fruto',
        tipo: 'plaga',
        plagaGrafo: 'Pasador del fruto de tomate y berenjena',
        senal: 'Un gusano barrena el fruto y lo daña por dentro; se ve el huequito con aserrín.',
        biocontrol: ['Bt (Bacillus thuringiensis)', 'Avispita parasitoide de huevos', 'Recoja frutos dañados'],
      },
      {
        id: 'nematodo-lulo',
        nombre: 'Nematodo agallador',
        tipo: 'plaga',
        plagaGrafo: 'Nematodo agallador',
        senal: 'Agallas (bolitas) en la raíz; la mata crece poca, amarilla y se marchita al sol. Debilita y abre la puerta al Fusarium.',
        biocontrol: ['Hongos nematófagos (Paecilomyces, Pochonia)', 'Trichoderma', 'Materia orgánica y rotación', 'Abonos verdes'],
      },
    ],
    biopreparados: ['Bocashi', 'Trichoderma al suelo', 'Caldo bordelés'],
  },

  /* ── TOMATE DE ÁRBOL ──────────────────────────────────────────────────── */
  {
    id: 'tomate_arbol',
    nombre: 'Tomate de árbol',
    subtitulo: 'tamarillo, tomate de palo',
    cientifico: 'Solanum betaceum',
    foto: 'tomate_arbol',
    color: 'red',
    resumen:
      'El tomate de árbol es el frutal de la casa fría: un arbolito frágil que en dos años ya carga y produce por varios. Como solanácea, cuida el suelo y la sanidad de la hoja; el viento le tumba las ramas cargadas.',
    propagacion: {
      metodo: 'Semilla (semillero)',
      detalle:
        'Se hace semillero con semilla de fruto sano y se trasplanta la matica. Empiece de material limpio: comparte con lulo, papa y tomate los hongos del suelo (Fusarium, antracnosis), así que la sanidad de la semilla y del semillero es todo.',
    },
    siembra: {
      distancia: '2 a 3 m entre árboles (orientador)',
      detalle:
        'Arbolito de raíz superficial y tallo quebradizo: siémbrelo protegido del viento y, si carga mucho, tutórelo o apuntálelo para que no se raje. Suelo suelto, rico en materia orgánica y bien drenado.',
    },
    aguaLuz:
      'Sol con clima frío moderado (16–20 °C) y protección del viento. Riego parejo sin encharcar. La raíz es superficial: cuídela con mulch (cobertura) y no la deje secar ni ahogar.',
    piso: {
      altitud: 'Clima frío moderado andino (16–20 °C)',
      nota: 'Produce a lo largo del año con recolecciones frecuentes (cada ~20 días); los primeros 5 años son los más productivos.',
      fuente: 'AGROSAVIA (perennialCycles: solanum_betaceum, confianza alta)',
    },
    poda: 'Poda de formación para dar 3–4 ramas madre y una copa aireada, y poda sanitaria para sacar lo enfermo y renovar. Airear la copa baja la antracnosis, y una copa equilibrada aguanta mejor la carga y el viento.',
    cosecha: {
      inicio: '1–2 años',
      punto: 'Se coge maduro, con color parejo (rojo, anaranjado o amarillo según la variedad) y que ceda un poco al tacto. Termina de ablandar en la casa si se coge pintón.',
      poscosecha:
        'Corte con tijera dejando cabito. Es más resistente que la mora o la guayaba: aguanta varios días fresco y ventilado, y viaja bien. Cuidado con el golpe y el sol.',
      fuente: 'AGROSAVIA',
    },
    plagas: [
      {
        id: 'antracnosis-ta',
        nombre: 'Antracnosis del tomate de árbol',
        tipo: 'enfermedad',
        plagaGrafo: 'Antracnosis del tomate de árbol',
        senal: 'Manchas negras hundidas en el fruto que lo pudren (la "peca"), y quema en hoja y ramas. La enfermedad clave del cultivo en clima húmedo.',
        biocontrol: ['Trichoderma', 'Bacterias antagonistas (biofungicida)', 'Poda para airear', 'Recoja fruta enferma', 'Caldo bordelés'],
      },
      {
        id: 'gota-ta',
        nombre: 'Gota / tizón tardío',
        tipo: 'enfermedad',
        plagaGrafo: 'Tizon tardio / gota (papa y tomate)',
        senal: 'Manchas de agua que se vuelven pardas en hoja y tallo, con moho blancuzco por el envés en tiempo frío y húmedo; puede quemar la mata rápido.',
        biocontrol: ['Bacterias antagonistas', 'Trichoderma', 'Airear con poda y no mojar el follaje', 'Caldo bordelés preventivo'],
      },
      {
        id: 'pasador-ta',
        nombre: 'Pasador del fruto',
        tipo: 'plaga',
        plagaGrafo: 'Pasador del fruto de tomate y berenjena',
        senal: 'Gusano que barrena el fruto y lo daña por dentro; huequito con aserrín.',
        biocontrol: ['Bt (Bacillus thuringiensis)', 'Avispita parasitoide de huevos', 'Recoja frutos dañados'],
      },
      {
        id: 'fusarium-ta',
        nombre: 'Marchitez por Fusarium',
        tipo: 'enfermedad',
        plagaGrafo: 'Marchitez del lulo y solanáceas por Fusarium',
        senal: 'La mata se marchita aunque haya humedad; el tallo se ve pardo por dentro. Vive en el suelo; empuja con encharcamiento y siembra repetida.',
        biocontrol: ['Microorganismos de control biológico', 'Trichoderma al suelo', 'Drenaje y rotación', 'Material sano'],
      },
    ],
    biopreparados: ['Caldo bordelés', 'Bocashi', 'Trichoderma al suelo'],
  },

  /* ── PAPAYA ───────────────────────────────────────────────────────────── */
  {
    id: 'papaya',
    nombre: 'Papaya',
    subtitulo: 'papayo, mamón',
    cientifico: 'Carica papaya',
    foto: 'papaya',
    color: 'orange',
    resumen:
      'La papaya es la fruta rápida de tierra caliente: de semilla al plato en menos de un año. No es un árbol sino una hierba gigante de tallo blando; por eso es cortoplacista y muy sensible al encharcamiento y a los virus.',
    propagacion: {
      metodo: 'Semilla (semillero)',
      detalle:
        'Se siembra de semilla en bolsa y se trasplanta. Como hay plantas macho, hembra y hermafroditas, se siembran varias por sitio y se ralea dejando las que cargan. Use semilla de fruto sano; la papaya arrastra virus con facilidad.',
    },
    siembra: {
      distancia: '2 a 2,5 m entre plantas (orientador)',
      detalle:
        'Se siembra densa porque dura poco (2–3 años productivos). Siémbrela en ALTO y drenado —el tallo blando se pudre con el agua empozada—. Pleno sol y protección del viento fuerte, que la vuelca.',
    },
    aguaLuz:
      'Pleno sol, calor y humedad, pero con DRENAJE perfecto: el encharcamiento le pudre el cuello y la mata. Riego frecuente y suave (produce y crece rápido), nunca charco al pie del tallo.',
    piso: {
      altitud: 'Tierra cálida (clima cálido, baja altitud)',
      nota: 'Cultivo de ciclo corto: empieza a producir en menos de un año y se renueva a los 2–3 años. La cosecha es escalonada, casi continua.',
      fuente: 'AGROSAVIA / ICA',
    },
    poda: 'La papaya casi no se poda (es de un solo tallo). El manejo es sacar hojas viejas de abajo y, sobre todo, ARRANCAR y sacar de la finca las plantas con virus para que no contagien a las sanas.',
    cosecha: {
      inicio: 'Menos de 1 año',
      punto: 'Se coge pintona —con las primeras rayas o pintas amarillas— y termina de madurar en la casa. Cogida muy verde no coge dulce; muy madura no aguanta el manejo.',
      poscosecha:
        'Corte con cabito y trate la fruta con mucho cuidado: la cáscara es tierna y se magulla. Madura a temperatura ambiente en pocos días. El látex de la fruta muy verde mancha e irrita.',
      fuente: 'AGROSAVIA / ICA',
    },
    plagas: [
      {
        id: 'nematodo-papaya',
        nombre: 'Nematodo agallador',
        tipo: 'plaga',
        plagaGrafo: 'Nematodo agallador',
        senal: 'Agallas en la raíz; la planta crece poca, amarilla y se marchita al sol. Debilita el tallo blando y abre paso a pudriciones.',
        biocontrol: ['Hongos nematófagos (Paecilomyces, Pochonia)', 'Trichoderma', 'Materia orgánica y suelo vivo', 'No repetir sitio con solanáceas/cucurbitáceas'],
      },
      {
        id: 'mosca-papaya',
        nombre: 'Mosca de la fruta de la papaya',
        tipo: 'plaga',
        plagaGrafo: 'Mosca de la fruta de la papaya',
        senal: 'Pica el fruto en desarrollo y pone huevos; adentro salen gusanos y la papaya se pudre. Se maneja con limpieza y recolección de fruta caída.',
        biocontrol: ['Avispitas parasitoides', 'Recoja y entierre la fruta picada', 'Embolsar el fruto', 'Trampas con cebo'],
      },
      {
        id: 'antracnosis-papaya',
        nombre: 'Antracnosis',
        tipo: 'enfermedad',
        plagaGrafo: 'Antracnosis de frutales',
        senal: 'Manchas circulares hundidas en el fruto que aparecen al madurar y lo pudren; problema típico de poscosecha en clima húmedo.',
        biocontrol: ['Trichoderma', 'Bacterias antagonistas (biofungicida)', 'Cosechar en punto y manejar con cuidado', 'Caldo bordelés preventivo'],
      },
    ],
    virus: {
      titulo: 'El virus del anillo (PRSV) — prevención, no cura',
      detalle:
        'La mancha anular de la papaya no tiene cura: la reparten los pulgones. El manejo es prevenir —semilla sana, arrancar temprano la planta enferma, controlar pulgones y no sembrar junto a papayales viejos enfermos—.',
    },
    biopreparados: ['Nim (contra pulgones)', 'Bocashi', 'Trichoderma al suelo'],
  },
];

/* ────────────────────────────────────────────────────────────────────────
 * FOTOS — créditos de licencia abierta (espejo de /public/frutales/creditos.json)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Créditos de las fotos del mundo Frutales — FUENTE ÚNICA en el componente,
 * espejo de /public/frutales/creditos.json (mismo patrón que Café/Agua: el JSON
 * público es para auditoría de licencias, este arreglo es el que pinta la UI).
 * Requisito de las licencias CC-BY/CC-BY-SA: atribución visible. Si una foto no
 * carga, la tarjeta cae con gracia a un ícono.
 * @type {{slug:string,autor:string,licencia:string,licenciaUrl:string,fuenteUrl:string}[]}
 */
export const CREDITOS_FOTOS_FRUTALES = [
  { slug: 'citricos', autor: 'Zeynel Cebeci', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Local_Orange_Variety_of_Kozan_-_Kozan_Yerli_Portakal_04.jpg' },
  { slug: 'limon', autor: 'Jeevan Jose, Kerala, India', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Citrus_aurantiifolia_at_Kadavoor.jpg' },
  { slug: 'mandarina', autor: '4028mdk09', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Citrus_reticulata_April_2013_Nordbaden.JPG' },
  { slug: 'aguacate', autor: 'B.navez', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Persea_americana_fruit_2.JPG' },
  { slug: 'mango', autor: 'CEphoto, Uwe Aranas', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Paitan_Sabah_Common-mango-Mangifera-indica-01.jpg' },
  { slug: 'guayaba', autor: 'Asit K. Ghosh Thaumaturgist', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:GuavaVietnameseGiant_Kampong2_Asit.jpg' },
  { slug: 'mora', autor: 'Forest & Kim Starr', licencia: 'CC BY 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Starr_051123-5474_Rubus_glaucus.jpg' },
  { slug: 'lulo', autor: 'David J. Stang', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Solanum_quitoense_14zz.jpg' },
  { slug: 'tomate_arbol', autor: 'sarahemcc', licencia: 'CC BY 2.0', licenciaUrl: 'https://creativecommons.org/licenses/by/2.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Solanum_betaceum_Cav.jpg' },
  { slug: 'papaya', autor: 'Cliff (Arlington, Virginia, USA)', licencia: 'CC BY 2.0', licenciaUrl: 'https://creativecommons.org/licenses/by/2.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Papaya_(2857461479).jpg' },
  { slug: 'injerto', autor: 'Sorruno', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Injerto_de_yema.JPG' },
];
