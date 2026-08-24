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
