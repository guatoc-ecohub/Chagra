/**
 * agentCapabilities.js — Manifiesto ÚNICO de capacidades de Chagra.
 *
 * Fuente normativa para chips de modo y menú Ⓐ del AgentHero.
 * TODO lo demás (chips, tools, labels, placeholders, rutas) se deriva de acá.
 *
 * Regla inviolable: un cambio en la UI (nuevo chip, nuevo tool, label distinto)
 * se hace editando ESTE archivo. NO en CHIP_DEFS ni en CAPABILITIES de AgentHero.
 */

/** Manifiesto único de capacidades. Orden: chips primero, luego actions. */
export const CAPABILITY_MANIFEST = Object.freeze([
  // ═══════════════════════════════════════════════════════════════════════
  // CHIP INTENTS — aparecen en ChipsToolbar y (algunos) en AgentHero
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'siembro',
    group: 'cultivo',
    status: 'live',
    intent: 'siembro',
    kind: 'tool',
    icon: '🌱',
    label: '¿Qué siembro?',
    desc: 'Qué sembrar según tu clima y tu altura.',
    placeholder: 'Escribe la planta o di qué quieres sembrar',
    tool: 'get_species',
    stubMessage: null,
    hero: true,
    heroRoute: { kind: 'ask', prompt: '¿Qué puedo sembrar este mes en mi zona?' },
  },
  {
    id: 'plaga',
    group: 'cuidar',
    status: 'live',
    intent: 'plaga',
    kind: 'tool',
    icon: '🐛',
    label: 'Plaga',
    desc: 'Controlar una plaga sin veneno.',
    placeholder: 'Escribe la plaga o describe el daño que ves',
    tool: 'get_pest_controllers',
    stubMessage: null,
    hero: true,
    heroRoute: { kind: 'ask', prompt: '¿Cómo controlo plagas sin químicos?' },
  },
  {
    id: 'biopreparado',
    group: 'cuidar',
    status: 'live',
    intent: 'biopreparado',
    kind: 'tool',
    icon: '🧪',
    label: 'Biopreparado',
    desc: 'Receta casera para fortalecer tu cultivo.',
    placeholder: 'Escribe para qué plaga o planta quieres el biopreparado',
    tool: 'get_biopreparados',
    stubMessage: null,
    hero: true,
    heroRoute: { kind: 'ask', prompt: '¿Cómo hago un biopreparado para fortalecer mis matas?' },
  },
  {
    id: 'clima',
    group: 'planear',
    status: 'live',
    intent: 'clima',
    kind: 'tool',
    icon: '🌦️',
    label: 'Clima',
    desc: 'El clima de tu finca esta semana.',
    placeholder: 'Pregunta por la lluvia o el clima de tu zona',
    tool: 'get_clima_ideam',
    stubMessage: null,
    hero: true,
    heroRoute: { kind: 'ask', prompt: 'Dame el reporte del clima de mi zona esta semana.' },
  },
  {
    id: 'precio',
    intent: 'precio',
    kind: 'stub',
    icon: '💰',
    label: 'Precio',
    desc: 'Consultar precios mayoristas del día.',
    placeholder: 'Escribe el producto del que quieres saber el precio',
    tool: null,
    stubMessage:
      'La consulta de precios todavía no está disponible en Chagra. ' +
      'Por ahora el precio mayorista lo publica el DANE (SIPSA) como archivo descargable, ' +
      'sin consulta directa. Si quieres, te oriento a la fuente o a Corabastos.',
    group: 'vender',
    status: 'soon',
    hero: true,
    heroRoute: { kind: 'unavailable' },
  },
  {
    id: 'calendario',
    group: 'planear',
    status: 'live',
    intent: 'calendario',
    kind: 'tool',
    icon: '📅',
    label: 'Calendario',
    desc: 'Cuándo sembrar y cuándo cosechar.',
    placeholder: 'Escribe la planta para ver su época de siembra',
    tool: 'get_species',
    stubMessage: null,
    hero: true,
    heroRoute: { kind: 'ask', prompt: '¿Cuándo siembro y cuándo cosecho en mi zona?' },
  },
  {
    id: 'deep',
    intent: 'deep',
    kind: 'deep',
    icon: '🔬',
    label: 'Investigación profunda',
    desc: 'Investigación multi-fuente con fundamento técnico.',
    placeholder: 'Escribe el tema que quieres investigar a fondo',
    tool: null,
    stubMessage: null,
    group: 'aprender',
    status: 'live',
    hero: true,
    heroRoute: { kind: 'ask', prompt: 'Quiero hacer una investigación profunda sobre mi finca.' },
  },
  {
    // Capacidad ya viva en el backend (get_diseno_restauracion: sucesión
    // ecológica con nativas del grafo AGE) pero SIN chip — la auditoría IA la
    // marcó "dark". El chip la fuerza saltando el NLU y le pasa la altura del
    // perfil. El `objetivo` (bosque/ribera/cortafuegos/post_incendio) lo infiere
    // el router del texto del usuario; por defecto 'bosque'.
    id: 'restauracion',
    group: 'restaurar',
    status: 'live',
    intent: 'restauracion',
    kind: 'tool',
    icon: '🌳',
    label: 'Restauración',
    desc: 'Recuperar un terreno con nativas, de pioneras a bosque maduro.',
    placeholder: 'Cuéntame qué quieres recuperar: bosque, orilla de quebrada o sitio quemado',
    tool: 'get_diseno_restauracion',
    stubMessage: null,
    hero: true,
    heroRoute: {
      kind: 'ask',
      prompt: 'Quiero restaurar un terreno con árboles nativos. ¿Qué especies siembro y en qué orden?',
    },
  },
  {
    // get_diseno_silvopastoril estaba viva en el sidecar pero NI en el
    // allow-list del cliente NI con chip. El chip la fuerza con la altura del
    // perfil (requerida por la tool) y, opcional, el animal inferido del texto.
    id: 'silvopastoreo',
    group: 'restaurar',
    status: 'live',
    intent: 'silvopastoreo',
    kind: 'tool',
    icon: '🐄',
    label: 'Silvopastoreo',
    desc: 'Forraje y árboles para tu ganado según tu altura.',
    placeholder: 'Escribe tu animal o el forraje que buscas: banco de proteína, cerca viva, sombra',
    tool: 'get_diseno_silvopastoril',
    stubMessage: null,
    hero: true,
    heroRoute: {
      kind: 'ask',
      prompt: 'Quiero un arreglo silvopastoril con forraje y árboles para mi ganado.',
    },
  },
  {
    // Páramo: reutiliza get_diseno_restauracion con objetivo='paramo' (la tool
    // filtra a especies que alcanzan ≥3000 msnm). NO inventamos tool nuevo.
    id: 'paramo',
    group: 'restaurar',
    status: 'live',
    intent: 'paramo',
    kind: 'tool',
    icon: '⛰️',
    label: 'Páramo',
    desc: 'Especies nativas para restaurar el páramo, por encima de 3000 metros.',
    placeholder: 'Pregunta por especies nativas para restaurar el páramo',
    tool: 'get_diseno_restauracion',
    stubMessage: null,
    hero: true,
    heroRoute: {
      kind: 'ask',
      prompt: 'Quiero restaurar el páramo. ¿Qué especies nativas siembro?',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AGENTHERO ACTIONS — aparecen solo en menú Ⓐ del AgentHero
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'foto',
    group: 'observar',
    status: 'soon',
    icon: '📷',
    label: 'Agregar planta por foto',
    desc: 'Tómale una foto y la identifico y registro.',
    tool: 'vision_identify',
    hero: true,
    heroRoute: { kind: 'photo' },
    stubMessage:
      'La identificación por foto necesita mejor hardware (GPU con ≥8GB VRAM). ' +
      'Por ahora usá la voz o el formulario manual para registrar tus plantas. ' +
      'Próximamente estará disponible por la nube.',
  },
  {
    id: 'voz',
    group: 'registrar',
    status: 'live',
    icon: '🎤',
    label: 'Agregar planta por voz',
    desc: 'Dime qué sembraste y lo registro en tu finca.',
    tool: 'voice_capture',
    hero: true,
    heroRoute: { kind: 'nav', view: 'voz' },
  },
  {
    id: 'plantas',
    group: 'cultivo',
    status: 'live',
    icon: '🌿',
    label: 'Mis plantas',
    desc: 'Ver y manejar lo que tienes en la finca.',
    tool: 'assets',
    hero: true,
    heroRoute: { kind: 'nav', view: 'activos' },
  },
  {
    id: 'tareas',
    group: 'planear',
    status: 'live',
    icon: '✅',
    label: 'Tareas de hoy',
    desc: 'Ver, crear y completar los trabajos de la finca.',
    tool: 'tasks',
    hero: true,
    heroRoute: { kind: 'nav', view: 'task_log' },
  },
  {
    id: 'observaciones',
    group: 'registrar',
    status: 'live',
    icon: '📝',
    label: 'Anotar lo que veo',
    desc: 'Guardar una observación de campo.',
    tool: 'observations',
    hero: true,
    heroRoute: { kind: 'nav', view: 'observacion' },
  },
  {
    id: 'mapa',
    group: 'observar',
    status: 'live',
    icon: '🗺️',
    label: 'Mapa de la finca',
    desc: 'Ubicar cultivos, tareas y hallazgos.',
    tool: 'farm_map',
    hero: true,
    heroRoute: { kind: 'nav', view: 'mapa' },
  },
  {
    id: 'historial',
    group: 'registrar',
    status: 'live',
    icon: '📖',
    label: 'Cuaderno de campo',
    desc: 'Consultar lo registrado y lo realizado.',
    tool: 'farm_log',
    hero: true,
    heroRoute: { kind: 'nav', view: 'historial' },
  },
  {
    id: 'biodiversidad',
    group: 'observar',
    status: 'live',
    icon: '🦋',
    label: 'Biodiversidad',
    desc: 'Reconocer y cuidar la vida de la finca.',
    tool: 'biodiversity',
    hero: true,
    heroRoute: { kind: 'nav', view: 'biodiversidad' },
  },
  {
    id: 'ciclo',
    group: 'cultivo',
    status: 'live',
    icon: '🌾',
    label: 'Ciclo del cultivo',
    desc: 'Etapas, labores y alertas según el desarrollo.',
    tool: 'phenology_cycle',
    hero: true,
    heroRoute: { kind: 'nav', view: 'ciclo' },
  },
  {
    id: 'suelo',
    group: 'observar',
    status: 'live',
    icon: '🪱',
    label: 'Mi suelo',
    desc: 'Diagnostica tu tierra con pruebas caseras honestas.',
    tool: 'soil_diagnostic',
    hero: true,
    heroRoute: { kind: 'nav', view: 'suelo' },
  },
  {
    id: 'procesos',
    group: 'registrar',
    status: 'live',
    icon: '🔄',
    label: 'Procesos por voz',
    desc: 'Registra el ciclo de un cultivo hablando con Chagra.',
    tool: 'farm_process',
    hero: true,
    heroRoute: { kind: 'nav', view: 'procesos' },
  },
  {
    id: 'alertas-cultivo',
    group: 'cuidar',
    status: 'live',
    icon: '🔔',
    label: 'Alertas del cultivo',
    desc: 'Avisos anticipados de riesgo por clima, plagas y etapa.',
    tool: 'crop_alerts',
    hero: true,
    heroRoute: { kind: 'nav', view: 'ciclo' },
  },
]);

// ── Vistas derivadas ──────────────────────────────────────────────────────

/**
 * CHIP_INTENTS — enum de intentos de chip. Clave === valor (string union).
 * Derivado del manifiesto: solo entradas con `intent` definido.
 */
export const CHIP_INTENTS = Object.freeze(
  CAPABILITY_MANIFEST
    .filter((e) => e.intent)
    .reduce((acc, e) => {
      acc[e.intent] = e.intent;
      return acc;
    }, {}),
);

/**
 * CHIP_DEFS — definiciones de chips de modo para ChipsToolbar.
 * Orden = orden del manifiesto (filtrado a entradas con intent).
 * Cada entrada: { intent, emoji, label, kind, placeholder, stubMessage }.
 */
export const CHIP_DEFS = Object.freeze(
  CAPABILITY_MANIFEST
    .filter((e) => e.intent)
    .map((e) => ({
      intent: e.intent,
      emoji: e.icon,
      label: e.label,
      kind: e.kind,
      placeholder: e.placeholder,
      ...(e.stubMessage ? { stubMessage: e.stubMessage } : {}),
    })),
);
