/**
 * Contenido propio del atlas de anatomía vegetal.
 *
 * El viewer consume esta capa declarativa y no conoce el catálogo, la sesión
 * ni los Assets/Logs. Las coordenadas son locales al espécimen procedural y se
 * mantienen junto con el texto que explican.
 */

export const ATLAS_STAGES = [
  { id: 'semilla', label: 'Semilla', short: 'Antes de brotar' },
  { id: 'brote', label: 'Brote', short: 'Cuando despierta' },
  { id: 'planta', label: 'Planta', short: 'Órganos visibles' },
];

const COMMON_STAGES = {
  semilla: {
    eyebrow: 'Estado 1',
    title: 'La reserva ya está organizada',
    text: 'La semilla protege un embrión pequeño y guarda reservas para los primeros días.',
    observe: 'Busque la cubierta, el embrión y la zona de reserva.',
  },
  brote: {
    eyebrow: 'Estado 2',
    title: 'La raíz abre el camino',
    text: 'El brote cambia de una reserva cerrada a una planta que intercambia agua, aire y luz.',
    observe: 'Siga la dirección de la raíz y el primer par de hojas.',
  },
  planta: {
    eyebrow: 'Estado 3',
    title: 'Cada órgano cumple un oficio',
    text: 'La planta adulta distribuye agua, captura luz y dirige recursos hacia sus órganos de cosecha.',
    observe: 'Gire el modelo y compare raíz, tallo, hoja y fruto.',
  },
};

const ATLAS = {
  solanum_lycopersicum: {
    kind: 'tomato',
    title: 'Tomate chonto',
    scientific: 'Solanum lycopersicum',
    stageData: {
      ...COMMON_STAGES,
      semilla: { ...COMMON_STAGES.semilla, text: 'La cubierta de la semilla conserva el embrión hasta que la humedad activa la germinación.' },
      brote: { ...COMMON_STAGES.brote, text: 'La radícula aparece primero y los cotiledones entregan energía mientras nace la primera hoja verdadera.' },
      planta: { ...COMMON_STAGES.planta, text: 'Las hojas producen azúcares y el fruto concentra semillas para el siguiente ciclo.' },
    },
    markers: {
      semilla: [
        { id: 'cubierta', label: 'Cubierta', note: 'Protege el embrión de golpes y pérdida de humedad.', position: [-0.02, 0.02, 0.3] },
        { id: 'embrion', label: 'Embrión', note: 'Contiene el plan de la raíz y el tallo que van a emerger.', position: [0.16, 0.04, 0.27] },
      ],
      brote: [
        { id: 'radicula', label: 'Radícula', note: 'Primera raíz, busca agua y ancla el brote.', position: [0, -0.42, 0.12] },
        { id: 'cotiledon', label: 'Cotiledón', note: 'Entrega reservas al brote antes de que la hoja trabaje sola.', position: [-0.3, 0.24, 0.15] },
      ],
      planta: [
        { id: 'fruto', label: 'Fruto', note: 'Protege las semillas y concentra la cosecha.', position: [0.3, 0.18, 0.2] },
        { id: 'hoja', label: 'Hoja', note: 'Captura luz y fabrica azúcares para el crecimiento.', position: [-0.36, 0.66, 0.12] },
        { id: 'tallo', label: 'Tallo', note: 'Sostiene hojas y conduce agua y azúcares.', position: [0, 0.4, 0.28] },
      ],
    },
    quiz: [
      { prompt: '¿Qué órgano fabrica azúcares a partir de la luz?', options: ['La hoja', 'El fruto', 'La cubierta'], answer: 0, explanation: 'La hoja capta luz y produce azúcares que luego se distribuyen por la planta.' },
    ],
  },
  zea_mays: {
    kind: 'maize',
    title: 'Maíz criollo',
    scientific: 'Zea mays',
    stageData: {
      ...COMMON_STAGES,
      semilla: { ...COMMON_STAGES.semilla, text: 'El grano reúne cubierta, endospermo y embrión. La mayor parte de la reserva es almidón.' },
      brote: { ...COMMON_STAGES.brote, text: 'La raíz seminal ancla la plántula y las hojas jóvenes se despliegan desde el cogollo.' },
      planta: { ...COMMON_STAGES.planta, text: 'Sus hojas forman una superficie amplia y la mazorca acumula granos para la cosecha.' },
    },
    markers: {
      semilla: [
        { id: 'endospermo', label: 'Endospermo', note: 'Reserva rica en almidón que alimenta la germinación.', position: [0.12, 0.02, 0.28] },
        { id: 'germen', label: 'Germen', note: 'Embrión lateral desde donde nace la nueva planta.', position: [-0.18, -0.04, 0.28] },
      ],
      brote: [
        { id: 'raiz-seminal', label: 'Raíz seminal', note: 'Ancla la plántula y busca la primera humedad.', position: [0, -0.38, 0.14] },
        { id: 'cogollo', label: 'Cogollo', note: 'Punto de crecimiento que despliega hojas nuevas.', position: [0, 0.48, 0.18] },
      ],
      planta: [
        { id: 'mazorca', label: 'Mazorca', note: 'Órgano que reúne los granos de la cosecha.', position: [0.2, 0.08, 0.18] },
        { id: 'lamina', label: 'Lámina foliar', note: 'Superficie que captura luz para formar biomasa.', position: [-0.43, 0.7, 0.08] },
        { id: 'tallo-maiz', label: 'Tallo', note: 'Sostiene la planta y conduce agua hacia las hojas.', position: [0, 0.45, 0.28] },
      ],
    },
    quiz: [
      { prompt: '¿Qué reserva domina dentro del grano de maíz?', options: ['Almidón', 'Néctar', 'Celulosa de la raíz'], answer: 0, explanation: 'El endospermo del grano contiene principalmente almidón, la reserva que sostiene los primeros días.' },
    ],
  },
  persea_americana: {
    kind: 'avocado',
    title: 'Aguacate',
    scientific: 'Persea americana',
    stageData: {
      ...COMMON_STAGES,
      semilla: { ...COMMON_STAGES.semilla, text: 'La semilla grande contiene reservas suficientes para sostener un brote vigoroso.' },
      brote: { ...COMMON_STAGES.brote, text: 'La raíz es sensible al encharcamiento y el tallo joven busca luz sin perder humedad.' },
      planta: { ...COMMON_STAGES.planta, text: 'La copa sostiene hojas persistentes y el fruto se desarrolla durante un ciclo largo.' },
    },
    markers: {
      semilla: [
        { id: 'cotiledones', label: 'Cotiledones', note: 'Almacenan la reserva que alimenta al embrión.', position: [-0.04, 0.02, 0.3] },
        { id: 'plumula', label: 'Plúmula', note: 'Yema embrionaria que dará lugar al tallo y las primeras hojas.', position: [0.17, 0.18, 0.26] },
      ],
      brote: [
        { id: 'raiz-joven', label: 'Raíz joven', note: 'Ancla el brote y exige suelo aireado.', position: [0, -0.4, 0.13] },
        { id: 'yema', label: 'Yema', note: 'Punto de crecimiento que organiza el nuevo tallo.', position: [0, 0.42, 0.2] },
      ],
      planta: [
        { id: 'fruto-aguacate', label: 'Fruto', note: 'Acumula aceite y protege la semilla hasta madurar.', position: [0.3, 0.34, 0.18] },
        { id: 'copa', label: 'Copa', note: 'Conjunto de hojas que captura luz y regula el microclima.', position: [-0.35, 0.84, 0.1] },
        { id: 'raiz-aguacate', label: 'Raíz', note: 'Necesita oxígeno en el suelo y no tolera encharcamientos prolongados.', position: [0, -0.42, 0.16] },
      ],
    },
    quiz: [
      { prompt: '¿Qué condición necesita especialmente la raíz del aguacate?', options: ['Suelo aireado', 'Encharcamiento permanente', 'Oscuridad total'], answer: 0, explanation: 'La raíz del aguacate necesita oxígeno; un suelo encharcado durante mucho tiempo reduce su funcionamiento.' },
    ],
  },
  phaseolus_vulgaris: {
    kind: 'bean',
    title: 'Frijol',
    scientific: 'Phaseolus vulgaris',
    stageData: {
      ...COMMON_STAGES,
      semilla: { ...COMMON_STAGES.semilla, text: 'El frijol es una dicotiledónea: sus dos cotiledones guardan la reserva que sostiene al embrión.' },
      brote: { ...COMMON_STAGES.brote, text: 'La radícula sale primero y el hipocótilo eleva los dos cotiledones antes de desplegar las hojas verdaderas.' },
      planta: { ...COMMON_STAGES.planta, text: 'Las hojas trifoliadas producen azúcares y la vaina protege las semillas que se cosechan.' },
    },
    markers: {
      semilla: [
        { id: 'cubierta', label: 'Cubierta', note: 'Observe la testa que protege el embrión y regula la entrada de agua.', position: [-0.2, 0.02, 0.28] },
        { id: 'cotiledones', label: 'Cotiledones', note: 'Identifique los dos cotiledones que almacenan alimento para la germinación.', position: [0.08, 0.04, 0.3] },
        { id: 'embrion', label: 'Embrión', note: 'Ubique el embrión entre los cotiledones: de allí salen la raíz y el tallo.', position: [0.24, 0.16, 0.25] },
      ],
      brote: [
        { id: 'radicula', label: 'Radícula', note: 'Observe la primera raíz, que ancla la plántula y busca agua.', position: [0, -0.42, 0.12] },
        { id: 'cotiledones', label: 'Cotiledones', note: 'Reconozca las dos hojas embrionarias que entregan reservas al brote.', position: [-0.27, 0.2, 0.16] },
        { id: 'plumula', label: 'Plúmula', note: 'Siga la yema embrionaria que formará el tallo y las hojas verdaderas.', position: [0.08, 0.42, 0.18] },
      ],
      planta: [
        { id: 'vaina', label: 'Vaina', note: 'Identifique la vaina, fruto que contiene las semillas del frijol.', position: [0.32, 0.14, 0.18] },
        { id: 'hoja-trifoliada', label: 'Hoja trifoliada', note: 'Observe los tres foliolos que capturan luz y fabrican azúcares.', position: [-0.35, 0.42, 0.1] },
        { id: 'tallo', label: 'Tallo', note: 'Siga el tallo que sostiene las hojas y conduce agua y azúcares.', position: [0, 0.22, 0.28] },
        { id: 'raiz', label: 'Raíz', note: 'Ubique la raíz que ancla la planta y absorbe agua y minerales.', position: [0, -0.42, 0.14] },
      ],
    },
    quiz: [
      { prompt: '¿Qué estructura del frijol guarda la reserva de la semilla?', options: ['Los cotiledones', 'La vaina', 'La raíz'], answer: 0, explanation: 'Los dos cotiledones del frijol almacenan reservas y alimentan al embrión durante la germinación.' },
    ],
  },
  solanum_tuberosum: {
    kind: 'potato',
    title: 'Papa',
    scientific: 'Solanum tuberosum',
    stageData: {
      ...COMMON_STAGES,
      semilla: { ...COMMON_STAGES.semilla, text: 'La semilla botánica de papa contiene una cubierta, un embrión pequeño y tejido de reserva.' },
      brote: { ...COMMON_STAGES.brote, text: 'La radícula inicia la raíz y la plúmula forma el tallo joven antes de que aparezcan las hojas.' },
      planta: { ...COMMON_STAGES.planta, text: 'La planta forma hojas sobre el suelo y tubérculos, que son tallos subterráneos de reserva.' },
    },
    markers: {
      semilla: [
        { id: 'cubierta', label: 'Cubierta', note: 'Observe la cubierta que protege el embrión de la semilla botánica.', position: [-0.2, 0.02, 0.28] },
        { id: 'endospermo', label: 'Endospermo', note: 'Identifique el tejido de reserva que alimenta al embrión al germinar.', position: [0.08, 0.02, 0.3] },
        { id: 'embrion', label: 'Embrión', note: 'Ubique el embrión que dará origen a la raíz y al brote.', position: [0.2, 0.16, 0.25] },
      ],
      brote: [
        { id: 'radicula', label: 'Radícula', note: 'Observe la primera raíz, que fija la plántula y absorbe agua.', position: [0, -0.42, 0.12] },
        { id: 'cotiledones', label: 'Cotiledones', note: 'Reconozca las hojas embrionarias que acompañan la salida del brote.', position: [-0.25, 0.2, 0.16] },
        { id: 'plumula', label: 'Plúmula', note: 'Siga la yema embrionaria que formará el tallo y las primeras hojas.', position: [0.08, 0.42, 0.18] },
      ],
      planta: [
        { id: 'tuberculo', label: 'Tubérculo', note: 'Identifique el tubérculo como un tallo subterráneo que almacena almidón.', position: [0.28, -0.18, 0.18] },
        { id: 'hoja', label: 'Hoja', note: 'Observe la hoja compuesta que captura luz y produce azúcares.', position: [-0.35, 0.42, 0.1] },
        { id: 'tallo', label: 'Tallo', note: 'Siga el tallo que sostiene las hojas y conecta con los tubérculos.', position: [0, 0.22, 0.28] },
        { id: 'raiz', label: 'Raíz', note: 'Ubique las raíces que absorben agua y minerales del suelo.', position: [0, -0.42, 0.14] },
      ],
    },
    quiz: [
      { prompt: '¿Qué es botánicamente el tubérculo de papa?', options: ['Un tallo subterráneo', 'Una raíz reservante', 'Una hoja engrosada'], answer: 0, explanation: 'El tubérculo de papa es un tallo subterráneo de reserva; sus ojos son yemas.' },
    ],
  },
  manihot_esculenta: {
    kind: 'cassava',
    title: 'Yuca',
    scientific: 'Manihot esculenta',
    stageData: {
      ...COMMON_STAGES,
      semilla: { ...COMMON_STAGES.semilla, text: 'La semilla de yuca es dicotiledónea y contiene una cubierta, dos cotiledones y un embrión.' },
      brote: { ...COMMON_STAGES.brote, text: 'La radícula forma la raíz inicial y la plúmula levanta el tallo joven con sus primeras hojas.' },
      planta: { ...COMMON_STAGES.planta, text: 'La yuca produce hojas palmadas y engrosa algunas raíces verdaderas para guardar almidón.' },
    },
    markers: {
      semilla: [
        { id: 'cubierta', label: 'Cubierta', note: 'Observe la cubierta que protege el embrión y la reserva de la semilla.', position: [-0.2, 0.02, 0.28] },
        { id: 'cotiledones', label: 'Cotiledones', note: 'Identifique los dos cotiledones que nutren el embrión durante la germinación.', position: [0.08, 0.04, 0.3] },
        { id: 'embrion', label: 'Embrión', note: 'Ubique el embrión que formará la radícula y la plúmula.', position: [0.22, 0.16, 0.25] },
      ],
      brote: [
        { id: 'radicula', label: 'Radícula', note: 'Observe la raíz inicial que ancla la plántula y busca humedad.', position: [0, -0.42, 0.12] },
        { id: 'cotiledones', label: 'Cotiledones', note: 'Reconozca las hojas embrionarias que sostienen los primeros días del brote.', position: [-0.26, 0.2, 0.16] },
        { id: 'plumula', label: 'Plúmula', note: 'Siga la yema embrionaria que dará lugar al tallo y las hojas.', position: [0.08, 0.42, 0.18] },
      ],
      planta: [
        { id: 'raiz-reservante', label: 'Raíz reservante', note: 'Identifique la raíz verdadera que engrosa y almacena almidón para la cosecha.', position: [0.28, -0.22, 0.18] },
        { id: 'hoja-palmada', label: 'Hoja palmada', note: 'Observe los lóbulos de la hoja que capturan luz para formar biomasa.', position: [-0.35, 0.42, 0.1] },
        { id: 'tallo', label: 'Tallo', note: 'Siga el tallo ramificado que sostiene las hojas y conecta con las raíces.', position: [0, 0.22, 0.28] },
        { id: 'raiz-fibrosa', label: 'Raíz fibrosa', note: 'Ubique las raíces finas que absorben agua y minerales del suelo.', position: [0, -0.42, 0.14] },
      ],
    },
    quiz: [
      { prompt: '¿Qué órgano de la yuca almacena principalmente el almidón?', options: ['La raíz reservante', 'La hoja palmada', 'La semilla'], answer: 0, explanation: 'La yuca engrosa raíces verdaderas y allí acumula gran parte del almidón de la cosecha.' },
    ],
  },
  musa: {
    kind: 'plantain',
    title: 'Plátano',
    scientific: 'Musa',
    stageData: {
      ...COMMON_STAGES,
      semilla: { ...COMMON_STAGES.semilla, text: 'En las especies de Musa con semilla, la cubierta encierra un embrión pequeño y un endospermo de reserva.' },
      brote: { ...COMMON_STAGES.brote, text: 'La radícula emerge primero y la plúmula despliega las primeras hojas de esta monocotiledónea.' },
      planta: { ...COMMON_STAGES.planta, text: 'Las vainas foliares forman un pseudotallo y la planta desarrolla un racimo de frutos.' },
    },
    markers: {
      semilla: [
        { id: 'cubierta', label: 'Cubierta', note: 'Observe la cubierta dura que protege el embrión de la semilla de Musa.', position: [-0.2, 0.02, 0.28] },
        { id: 'endospermo', label: 'Endospermo', note: 'Identifique la reserva que alimenta al embrión durante la germinación.', position: [0.08, 0.02, 0.3] },
        { id: 'embrion', label: 'Embrión', note: 'Ubique el embrión monocotiledóneo que dará origen a raíz y brote.', position: [0.22, 0.16, 0.25] },
      ],
      brote: [
        { id: 'radicula', label: 'Radícula', note: 'Observe la primera raíz que fija la plántula y absorbe agua.', position: [0, -0.42, 0.12] },
        { id: 'plumula', label: 'Plúmula', note: 'Siga el punto de crecimiento que produce el tallo corto y las hojas.', position: [0, 0.42, 0.18] },
        { id: 'primera-hoja', label: 'Primera hoja', note: 'Identifique la hoja joven que comienza a captar luz para el brote.', position: [0.28, 0.46, 0.12] },
      ],
      planta: [
        { id: 'racimo', label: 'Racimo', note: 'Identifique el racimo que reúne los frutos cosechables del plátano.', position: [0.3, 0.14, 0.18] },
        { id: 'hoja', label: 'Hoja', note: 'Observe la gran lámina foliar que captura luz y mueve agua por la planta.', position: [-0.35, 0.42, 0.1] },
        { id: 'pseudotallo', label: 'Pseudotallo', note: 'Reconozca las vainas de hojas apretadas que forman el pseudotallo.', position: [0, 0.22, 0.28] },
        { id: 'raiz', label: 'Raíz', note: 'Ubique las raíces fasciculadas que anclan la planta en el suelo.', position: [0, -0.42, 0.14] },
      ],
    },
    quiz: [
      { prompt: '¿Qué estructura forma el pseudotallo del plátano?', options: ['Vainas foliares superpuestas', 'Tubérculos', 'Raíces reservantes'], answer: 0, explanation: 'El pseudotallo se forma con las vainas de las hojas enrolladas; no es un tronco leñoso.' },
    ],
  },
  coffea_arabica: {
    kind: 'coffee',
    title: 'Café',
    scientific: 'Coffea arabica',
    stageData: {
      ...COMMON_STAGES,
      semilla: { ...COMMON_STAGES.semilla, text: 'El grano de café es una semilla con cubierta, endospermo de reserva y un embrión pequeño.' },
      brote: { ...COMMON_STAGES.brote, text: 'La radícula abre camino y los cotiledones se liberan antes de que aparezcan las primeras hojas.' },
      planta: { ...COMMON_STAGES.planta, text: 'El cafeto sostiene hojas brillantes y frutos rojos que contienen los granos de la cosecha.' },
    },
    markers: {
      semilla: [
        { id: 'cubierta', label: 'Cubierta', note: 'Observe la cubierta que protege el grano y el embrión del café.', position: [-0.2, 0.02, 0.28] },
        { id: 'endospermo', label: 'Endospermo', note: 'Identifique el endospermo, reserva que sostiene la germinación del cafeto.', position: [0.08, 0.02, 0.3] },
        { id: 'embrion', label: 'Embrión', note: 'Ubique el embrión pequeño que formará la raíz y el tallo joven.', position: [0.22, 0.16, 0.25] },
      ],
      brote: [
        { id: 'radicula', label: 'Radícula', note: 'Observe la primera raíz, que ancla el brote y busca agua.', position: [0, -0.42, 0.12] },
        { id: 'cotiledones', label: 'Cotiledones', note: 'Reconozca los cotiledones que acompañan la salida de la plántula.', position: [-0.26, 0.2, 0.16] },
        { id: 'plumula', label: 'Plúmula', note: 'Siga la yema embrionaria que forma el tallo y las primeras hojas.', position: [0.08, 0.42, 0.18] },
      ],
      planta: [
        { id: 'grano-cafe', label: 'Grano', note: 'Identifique el grano como la semilla que se encuentra dentro del fruto del café.', position: [0.3, 0.14, 0.18] },
        { id: 'hoja', label: 'Hoja', note: 'Observe la hoja brillante que captura luz y produce azúcares.', position: [-0.35, 0.42, 0.1] },
        { id: 'tallo', label: 'Tallo', note: 'Siga el tallo que sostiene la copa y conduce agua y azúcares.', position: [0, 0.22, 0.28] },
        { id: 'raiz', label: 'Raíz', note: 'Ubique la raíz que ancla el cafeto y absorbe agua y minerales.', position: [0, -0.42, 0.14] },
      ],
    },
    quiz: [
      { prompt: '¿Dónde está el grano que se tuesta para preparar café?', options: ['Dentro del fruto', 'En la raíz', 'En la hoja'], answer: 0, explanation: 'El grano de café es la semilla que se encuentra dentro del fruto o cereza del cafeto.' },
    ],
  },
  theobroma_cacao: {
    kind: 'cacao',
    title: 'Cacao',
    scientific: 'Theobroma cacao',
    stageData: {
      ...COMMON_STAGES,
      semilla: { ...COMMON_STAGES.semilla, text: 'La semilla de cacao tiene cubierta, dos cotiledones carnosos y un embrión que inicia la germinación.' },
      brote: { ...COMMON_STAGES.brote, text: 'La radícula emerge primero y la plúmula levanta el tallo joven con sus primeras hojas.' },
      planta: { ...COMMON_STAGES.planta, text: 'El árbol forma flores y mazorcas sobre el tronco y las ramas, con granos rodeados de pulpa.' },
    },
    markers: {
      semilla: [
        { id: 'cubierta', label: 'Cubierta', note: 'Observe la cubierta que protege el embrión y los cotiledones del cacao.', position: [-0.2, 0.02, 0.28] },
        { id: 'cotiledones', label: 'Cotiledones', note: 'Identifique los dos cotiledones que guardan reservas para el brote.', position: [0.08, 0.04, 0.3] },
        { id: 'embrion', label: 'Embrión', note: 'Ubique el embrión entre los cotiledones, origen de la raíz y el tallo.', position: [0.22, 0.16, 0.25] },
      ],
      brote: [
        { id: 'radicula', label: 'Radícula', note: 'Observe la primera raíz, que ancla la plántula y absorbe agua.', position: [0, -0.42, 0.12] },
        { id: 'cotiledones', label: 'Cotiledones', note: 'Reconozca los cotiledones que alimentan al brote mientras despliega hojas.', position: [-0.26, 0.2, 0.16] },
        { id: 'plumula', label: 'Plúmula', note: 'Siga la yema embrionaria que formará el tallo y las hojas verdaderas.', position: [0.08, 0.42, 0.18] },
      ],
      planta: [
        { id: 'mazorca', label: 'Mazorca', note: 'Identifique la mazorca, fruto que contiene las semillas rodeadas de pulpa.', position: [0.3, 0.14, 0.18] },
        { id: 'grano-cacao', label: 'Grano', note: 'Observe el grano como la semilla que se fermenta y seca para la cosecha.', position: [0.18, 0.02, 0.28] },
        { id: 'hoja', label: 'Hoja', note: 'Observe la hoja que captura luz y fabrica azúcares para el árbol.', position: [-0.35, 0.42, 0.1] },
        { id: 'tronco', label: 'Tronco', note: 'Siga el tronco, donde el cacao puede formar flores y mazorcas.', position: [0, 0.22, 0.28] },
      ],
    },
    quiz: [
      { prompt: '¿Qué contiene la mazorca de cacao?', options: ['Granos rodeados de pulpa', 'Tubérculos', 'Raíces reservantes'], answer: 0, explanation: 'La mazorca es el fruto del cacao y contiene numerosas semillas, conocidas como granos, rodeadas de pulpa.' },
    ],
  },
};

export function getAtlasRecord(speciesId) {
  return ATLAS[speciesId] || null;
}

export function getStageData(record, stageId) {
  return record?.stageData?.[stageId] || null;
}

export function getMarkers(record, stageId) {
  return record?.markers?.[stageId] || [];
}
