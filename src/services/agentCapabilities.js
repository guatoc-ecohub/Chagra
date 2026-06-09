/**
 * Fuente única de capacidades visibles de Chagra.
 *
 * Una capacidad de tipo `mode` prepara el siguiente mensaje del usuario y
 * fuerza un tool determinístico. `photo` y `nav` ejecutan una acción directa.
 * Las superficies (home, hoja del chat y toolbar) deben derivarse de este
 * manifiesto para evitar etiquetas o contratos divergentes.
 */
export const AGENT_CAPABILITIES = Object.freeze([
  {
    id: 'siembro',
    intent: 'siembro',
    kind: 'mode',
    emoji: '🌱',
    label: 'Consultar un cultivo',
    description: 'Cuidados y datos de una planta o cultivo.',
    prompt: 'Escribe el nombre del cultivo, por ejemplo: papa, café o tomate.',
    placeholder: 'Escribe el nombre de la planta o cultivo',
    tool: 'get_species',
    requiredArgs: ['id_or_name'],
    source: 'Catálogo Chagra',
  },
  {
    id: 'plaga',
    intent: 'plaga',
    kind: 'mode',
    emoji: '🐛',
    label: 'Tengo una plaga',
    description: 'Buscar controladores agroecológicos para una plaga concreta.',
    prompt: 'Escribe la plaga o enfermedad, por ejemplo: broca, roya o pulgón.',
    placeholder: 'Escribe la plaga o enfermedad',
    tool: 'get_pest_controllers',
    requiredArgs: ['pest_id_or_name'],
    source: 'Catálogo y grafo Chagra',
  },
  {
    id: 'biopreparado',
    intent: 'biopreparado',
    kind: 'mode',
    emoji: '🧪',
    label: 'Preparar un biopreparado',
    description: 'Buscar una receta para una planta, plaga o enfermedad.',
    prompt: 'Escribe para qué planta, plaga o enfermedad necesitas la receta.',
    placeholder: 'Escribe la planta, plaga o enfermedad',
    tool: 'get_biopreparados',
    requiredArgs: ['species_id_or_pest'],
    source: 'Catálogo Chagra',
  },
  {
    id: 'clima',
    intent: 'clima',
    kind: 'mode',
    emoji: '🌦️',
    label: 'Consultar el clima',
    description: 'Consultar lluvia y clima histórico de tu municipio.',
    prompt: 'Pregunta por la lluvia o el clima. Usaré el municipio de tu finca.',
    placeholder: 'Pregunta por la lluvia o el clima de tu zona',
    tool: 'get_clima_ideam',
    requiredArgs: ['action'],
    source: 'IDEAM',
  },
  {
    id: 'precio',
    intent: 'precio',
    kind: 'mode',
    emoji: '💰',
    label: 'Consultar un precio',
    description: 'Buscar el último dato mayorista disponible.',
    prompt: 'Escribe solo el producto, por ejemplo: papa, café o aguacate.',
    placeholder: 'Escribe el producto agrícola',
    tool: 'get_precio_sipsa',
    requiredArgs: ['action', 'producto'],
    source: 'DANE SIPSA',
  },
  {
    id: 'calendario',
    intent: 'calendario',
    kind: 'mode',
    emoji: '📅',
    label: 'Qué sembrar este mes',
    description: 'Consultar opciones según el mes y piso térmico de tu finca.',
    prompt: 'Pregunta qué sembrar. Usaré la altitud registrada de tu finca.',
    placeholder: 'Pregunta qué puedes sembrar este mes',
    tool: 'get_calendario_siembra',
    requiredArgs: ['piso_termico'],
    source: 'Calendario curado Chagra',
  },
  {
    id: 'deep',
    intent: 'deep',
    kind: 'deep',
    emoji: '🔬',
    label: 'Investigación profunda',
    description: 'Investigar un tema usando varias fuentes.',
    prompt: 'Escribe el tema que quieres investigar a fondo.',
    placeholder: 'Escribe el tema que quieres investigar a fondo',
    tool: null,
    requiredArgs: [],
    source: 'Fuentes citadas en el informe',
    featureFlag: 'deepResearch',
    proOnly: true,
    surfaces: ['chat'],
  },
  {
    id: 'foto',
    kind: 'photo',
    emoji: '📷',
    label: 'Revisar una planta por foto',
    description: 'Toma o elige una foto para que Chagra la analice.',
    prompt: 'Toma o elige una foto.',
    tool: 'vision_identify',
    source: 'Análisis visual; pide confirmación cuando no sea concluyente',
    surfaces: ['home'],
  },
  {
    id: 'voz',
    kind: 'nav',
    emoji: '🎤',
    label: 'Hablar con Chagra',
    description: 'Abre la ayuda por voz.',
    prompt: 'Habla con Chagra.',
    tool: 'voice_capture',
    view: 'voz',
    source: 'Según la consulta',
    surfaces: ['home'],
  },
  {
    id: 'plantas',
    kind: 'nav',
    emoji: '🌿',
    label: 'Ver mis plantas',
    description: 'Abre las plantas registradas en tu finca.',
    prompt: 'Ver plantas registradas.',
    tool: 'assets',
    view: 'activos',
    source: 'Registros de tu finca',
    surfaces: ['home'],
  },
]);

export const MODE_CAPABILITIES = Object.freeze(
  AGENT_CAPABILITIES.filter((cap) => cap.kind === 'mode' || cap.kind === 'deep'),
);

export const HOME_CAPABILITIES = Object.freeze(
  AGENT_CAPABILITIES.filter((cap) => !cap.surfaces || cap.surfaces.includes('home')),
);

export function getCapability(intent) {
  return AGENT_CAPABILITIES.find((cap) => cap.intent === intent || cap.id === intent) || null;
}

export function getVisibleModeCapabilities({ deepEnabled = false, isPro = false } = {}) {
  return MODE_CAPABILITIES.filter((cap) => {
    if (cap.featureFlag === 'deepResearch' && !deepEnabled) return false;
    if (cap.proOnly && !isPro) return false;
    return true;
  });
}

export function capabilityFailureMessage(intent, { online = true, sidecarEnabled = true } = {}) {
  const cap = getCapability(intent);
  const label = cap?.label || 'esa ayuda';
  if (!online) {
    return `No pude usar “${label}” porque no hay conexión. Tu pregunta no se respondió con datos verificados. Intenta de nuevo cuando tengas señal.`;
  }
  if (!sidecarEnabled) {
    return `No pude usar “${label}” porque la consulta de datos está desactivada. No voy a inventar una respuesta sin verificar.`;
  }
  return `No pude completar “${label}” con datos verificados. No voy a inventar una respuesta. Revisa el dato que escribiste o intenta de nuevo.`;
}
