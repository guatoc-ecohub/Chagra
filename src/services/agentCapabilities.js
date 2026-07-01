/*
 * i18n (ADR-050): agentCapabilities.js es el MANIFIESTO de capacidades — labels,
 * descripciones, placeholders y stubMessages user-facing en español Colombia,
 * pendientes de migrar a src/config/messages.js. La regla chagra-i18n es soft
 * (warn); se desactiva a nivel de archivo para no bloquear el pre-commit con
 * deuda preexistente — mismo criterio que App.jsx. Los errores reales de ESLint
 * siguen activos.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * agentCapabilities.js — Manifiesto ÚNICO de capacidades de Chagra.
 *
 * Fuente normativa para chips de modo y menú Ⓐ del AgentHero.
 * TODO lo demás (chips, tools, labels, placeholders, rutas) se deriva de aquí.
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
    // featured (2026-06-28): una de las 6 funciones clave que brotan primero en
    // el anillo principal de la mano para el primerizo (resto va bajo grupos).
    featured: true,
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
    featured: true, // 1 de las 6 destacadas (anillo principal).
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
    featured: true, // 1 de las 6 destacadas (anillo principal).
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
    // hero:false (descubribilidad 2026-06-24) — `precio` SIGUE siendo chip
    // honesto en el ChipsToolbar (stub con stubMessage que orienta a SIPSA/
    // Corabastos), pero se RETIRA de la mano radial: era la ÚNICA hoja del grupo
    // "vender" y, al ser status:'soon' (no-op → solo toast "por lanzar"), dejaba
    // una rama muerta. Sin backing real de precios, se quita la rama de la mano
    // (el grupo "vender" desaparece: GROUPS filtra grupos sin hojas hero). El día
    // que exista precio real, se vuelve a poner hero:true con heroRoute live.
    // Ref: CAPABILITIES_STATUS.md §7.4 (reparar ramas muertas).
    hero: false,
    heroRoute: { kind: 'unavailable' },
  },
  {
    // MARKETPLACE agroecológico (circuitos cortos): el productor publica lo que
    // cosecha y explora ofertas de fincas vecinas, con contacto DIRECTO
    // (WhatsApp), sin transacción dentro de la app. Offline-first. El precio de
    // referencia mayorista se cita solo si hay fuente (SIPSA/DANE) — si no,
    // deflección honesta (NO se inventan precios). Es la capacidad LIVE que
    // REVIVE la rama "Vender" de la mano: con `precio` ya en hero:false (rama
    // muerta retirada §7.4), `mercado` es ahora la única hoja hero del grupo
    // 'vender' → el grupo vuelve a aparecer en la mano. kind:'nav' → vista
    // 'mercado' (App.jsx). Reemplaza el placeholder "en preparación" previo.
    id: 'mercado',
    group: 'vender',
    status: 'live',
    icon: '🛒',
    label: 'Mercado de la finca',
    desc: 'Publica lo que vendes y mira ofertas de fincas vecinas, sin intermediarios.',
    tool: 'marketplace',
    hero: true,
    heroRoute: { kind: 'nav', view: 'mercado' },
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
    // fix chip calendario (2026-06-28): el manifiesto declaraba get_species, pero
    // la tool dedicada del calendario lunar/estacional es get_calendario_siembra
    // (viva en el sidecar; el chipIntentRouter ya routeaba ahí). Se alinea el
    // manifiesto con la tool real — capabilityHealth y auditoría quedan coherentes.
    tool: 'get_calendario_siembra',
    stubMessage: null,
    hero: true,
    heroRoute: { kind: 'ask', prompt: '¿Cuándo siembro y cuándo cosecho en mi zona?' },
  },
  {
    // Investigación profunda (B14): aún NO disponible. El backend de deep
    // research (POST /deep-research) está detrás de la feature flag
    // VITE_DEEP_RESEARCH_ENABLED (default false) y no se sirve en prod. Mientras
    // tanto la capacidad es un STUB honesto: status 'soon' + stubMessage claro.
    // El chip router la trata como stub (NO la routea a un path "live"), igual
    // que 'precio'. Coherente con el gate por flag de AgentScreen.
    id: 'deep',
    intent: 'deep',
    kind: 'stub',
    icon: '🔬',
    label: 'Investigación profunda',
    desc: 'Investigación multi-fuente con fundamento técnico.',
    placeholder: 'Escribe el tema que quieres investigar a fondo',
    tool: null,
    stubMessage:
      'La investigación profunda requiere conexión al servidor de conocimiento ' +
      'que aún no está disponible en esta versión. Por ahora puedes usar los chips ' +
      'de siembra, plaga, biopreparado o clima para obtener información curada.',
    group: 'aprender',
    status: 'soon',
    // hero:false (dedup mano 2026-06-28): `deep` es un STUB (status:'soon' → no-op
    // que solo muestra toast "por lanzar"). Igual que `precio`, se RETIRA de la
    // mano radial para no dejar una rama muerta — sigue siendo chip honesto en el
    // ChipsToolbar (stub con stubMessage que orienta). La rama "Aprender" de la
    // mano vive sana por `aprender_hub` (LIVE → vista 'aprende'). El día que el
    // backend de deep research se sirva en prod, se vuelve hero:true.
    hero: false,
    heroRoute: { kind: 'unavailable' },
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
    // jerga campesina (2026-06-28): "Restauración" es término técnico → label
    // claro para el campo. El id e intent NO cambian (chip/routing intactos).
    label: 'Sembrar monte nativo',
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
    // jerga campesina (2026-06-28): "Silvopastoreo" es término técnico. id/intent
    // intactos (chip/routing); solo cambia la etiqueta visible.
    label: 'Árboles para el ganado',
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
  {
    // Riesgo de incendio: ESTIMACIÓN estacional (temporada seca + fase ENSO),
    // NO alerta oficial. kind:'local' → se calcula en el cliente
    // (incendioRiskService) sin tool del sidecar; el chip router devuelve un
    // plan con localGrounding:'incendio' y el AgentScreen inyecta el bloque.
    id: 'incendio',
    group: 'restaurar',
    status: 'live',
    intent: 'incendio',
    kind: 'local',
    icon: '🔥',
    label: 'Riesgo de incendio',
    desc: 'Estimación de riesgo de incendio según la temporada seca y El Niño. No es alerta oficial.',
    placeholder: 'Pregunta si tu zona está en temporada de riesgo de incendio',
    tool: null,
    stubMessage: null,
    hero: true,
    heroRoute: {
      kind: 'ask',
      prompt: '¿Mi zona está en riesgo de incendio esta temporada?',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GROUNDING OSCURO (2026-07-01) — tools YA vivas en el grafo/catálogo (ver
  // ALLOWED_TOOLS en sidecarClient.js) pero, hasta ahora, SOLO alcanzables por
  // texto libre en el chat: el NLU las conoce, pero ningún chip las disparaba
  // (auditoría chagra-pro allowed-tools.ts: "datos del grafo que estaban
  // muertos"). Se exponen aquí como chips de modo, agrupados bajo el toggle
  // "Más" del ChipsToolbar (chipMore:true) para NO saturar la barra principal
  // con 6 chips nuevos de golpe — son consultas de conocimiento puntuales, no
  // el núcleo diario de siembra/plaga/clima.
  //
  // hero:false a propósito: NO se agregan ramas nuevas a la mano radial
  // (AgentRedMenu solo pinta hero===true) — ese es un cambio de UX aparte que
  // el operador debe decidir explícitamente. Aquí solo se resuelve la
  // descubribilidad vía chips (el pedido puntual de esta tarea).
  {
    id: 'toxicidad',
    group: 'cuidar',
    status: 'live',
    intent: 'toxicidad',
    kind: 'tool',
    icon: '☠️',
    label: 'Toxicidad',
    desc: 'Si una planta es tóxica o se puede comer, con qué cuidado.',
    placeholder: 'Escriba la planta de la que quiere saber si es tóxica o comestible',
    tool: 'get_toxicidad',
    stubMessage: null,
    hero: false,
    chipMore: true,
    heroRoute: { kind: 'unavailable' },
  },
  {
    id: 'saberes_tradicionales',
    group: 'aprender',
    status: 'live',
    intent: 'saberes_tradicionales',
    kind: 'tool',
    icon: '📜',
    label: 'Saberes tradicionales',
    desc: 'Glosario de saberes agroecológicos: qué significan y cómo se usan.',
    placeholder: 'Escriba el término que quiere consultar (ej. bocashi, milpa, pionera)',
    tool: 'get_saberes_tradicionales',
    stubMessage: null,
    hero: false,
    chipMore: true,
    heroRoute: { kind: 'unavailable' },
  },
  {
    id: 'alerta_paramo',
    group: 'restaurar',
    status: 'live',
    intent: 'alerta_paramo',
    kind: 'tool',
    icon: '⚖️',
    label: 'Alerta normativa páramo',
    desc: 'Qué dice la Ley 1930 de 2018 sobre sembrar o hacer quemas en el páramo.',
    placeholder: 'Cuéntele al agente su situación en el páramo',
    tool: 'get_alerta_normativa_paramo',
    stubMessage: null,
    hero: false,
    chipMore: true,
    heroRoute: { kind: 'unavailable' },
  },
  {
    id: 'variedades',
    group: 'cultivo',
    status: 'live',
    intent: 'variedades',
    kind: 'tool',
    icon: '🧬',
    label: 'Variedades',
    desc: 'Variedades registradas ICA/AGROSAVIA de un cultivo.',
    placeholder: 'Escriba el cultivo del que quiere ver las variedades',
    tool: 'get_variedades_cultivo',
    stubMessage: null,
    hero: false,
    chipMore: true,
    heroRoute: { kind: 'unavailable' },
  },
  {
    id: 'polinizacion',
    group: 'cultivo',
    status: 'live',
    intent: 'polinizacion',
    kind: 'tool',
    icon: '🐝',
    label: 'Polinización',
    desc: 'Qué la poliniza y cuántas colmenas por hectárea necesita.',
    placeholder: 'Escriba la planta de la que quiere saber cómo se poliniza',
    tool: 'get_polinizacion',
    stubMessage: null,
    hero: false,
    chipMore: true,
    heroRoute: { kind: 'unavailable' },
  },
  {
    id: 'fenologia',
    group: 'cultivo',
    status: 'live',
    intent: 'fenologia',
    kind: 'tool',
    icon: '📊',
    label: 'Fenología',
    desc: 'Etapas de desarrollo de la planta y en cuáles aparece cada plaga.',
    placeholder: 'Escriba la planta de la que quiere ver sus etapas de desarrollo',
    tool: 'get_fenologia',
    stubMessage: null,
    hero: false,
    chipMore: true,
    heroRoute: { kind: 'unavailable' },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AGENTHERO ACTIONS — aparecen solo en menú Ⓐ del AgentHero
  // ═══════════════════════════════════════════════════════════════════════
  {
    // CONTENIDO DE APRENDIZAJE (descubribilidad 2026-06-24): la rama "aprender"
    // de la mano era SOLO `deep` (status:'soon' → no-op, solo toast). Esta hoja
    // LIVE la conecta al contenido real de aprendizaje (módulo "Aprende con el
    // agente", ruta 'aprende': 5 lecciones agroecológicas con fuente/DOI). Así
    // la rama "Aprender" navega a algo real en vez de quedar muerta. Tras el
    // dedup 2026-06-28 es la ÚNICA hoja de la rama "Aprender": 'aprender-hub'
    // (duplicado) se eliminó y `deep` pasó a hero:false (stub honesto que vive
    // solo en el ChipsToolbar). No tiene `intent` → NO es chip, solo acción de la
    // mano. Ref: CAPABILITIES_STATUS.md §7.4.
    id: 'aprender_hub',
    group: 'aprender',
    status: 'live',
    icon: '📚',
    label: 'Aprender con el agente',
    desc: 'Lecciones de agroecología con fuente: suelo, asociaciones, biopreparados, MIP, fenología.',
    tool: null,
    hero: true,
    heroRoute: { kind: 'nav', view: 'aprende' },
  },
  {
    // FOTO EN LA MANO promovida a 'live' (fix grounding P0 2026-06-25). El gate
    // 'soon' tenía un motivo FALSO ("requiere GPU con ≥8GB VRAM"): la GPU es de
    // 12GB y la visión groundeada YA corre en el chat (recognizeSpeciesGrounded /
    // analyzeFoliage / validate_visual_match + visionContext). La hoja además ya
    // estaba CABLEADA: `heroRoute: { kind: 'photo' }` → mapCapabilityPick(onPhoto)
    // → cameraInputAgentRef/cameraInputRef.click() → handleAgentPhotoPick →
    // processPhotoItem (mismo pipeline de visión groundeada del compositor del
    // chat). Lo único que faltaba era quitar el gate 'soon' (mapCapabilityPick
    // hacía no-op antes de llamar onPhoto). Sin stubMessage: la capacidad ES real.
    id: 'foto',
    group: 'observar',
    status: 'live',
    icon: '📷',
    // jerga campesina + alcance real (2026-06-28): la foto NO solo agrega una
    // planta — identifica la especie Y diagnostica daño foliar/plaga/enfermedad
    // (visión groundeada: analyzeFoliage / validate_visual_match). El label lo
    // comunica en usted colombiano.
    label: 'Tómele foto a una mata',
    desc: 'Tómele una foto a su planta: le digo qué es y si tiene plaga o enfermedad.',
    tool: 'vision_identify',
    hero: true,
    featured: true, // 1 de las 6 destacadas (anillo principal).
    heroRoute: { kind: 'photo' },
  },
  {
    // MÓDULO UNIFICADO de voz (2026-06-15): único punto de entrada desde la mano
    // para agregar una planta por voz Y ver, sobre la misma planta, su ciclo
    // genealógico + bioinsumos + ciclos asociados + companions/antagonistas.
    // Reusa el pipeline de VoiceCapture (captura/transcripción/entidades/
    // sugerencias) y lo extiende con el dossier (PlantaPorVozScreen). La vista
    // 'voz' (captura simple) sigue existiendo para el micrófono genérico del
    // TopBar; la mano apunta al módulo unificado 'voz_planta'.
    id: 'voz',
    group: 'registrar',
    status: 'live',
    icon: '🎤',
    label: 'Agregar planta por voz',
    desc: 'Dime qué sembraste: lo registro y te muestro su ciclo, bioinsumos y compañeros.',
    tool: 'voice_capture',
    // hero:false (dedup mano 2026-06-28): `procesos` ("Registrar hablando",
    // vista 'registro_voz' → RegistroVozScreen) YA cubre agregar una planta por
    // voz — clasifica entre TODOS los tipos incluyendo INTENTS.PLANTA →
    // saveType 'plant_asset' (verificado en voiceFieldExtractor.INTENT_META). Dos
    // botones de voz en la mano confundían; se deja solo `procesos`. La vista
    // 'voz_planta' (PlantaPorVozScreen) sigue viva y enlazada desde otras
    // pantallas; solo se retira esta puerta duplicada de la mano radial.
    hero: false,
    heroRoute: { kind: 'nav', view: 'voz_planta' },
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
    featured: true, // 1 de las 6 destacadas (anillo principal).
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
    // jerga campesina (2026-06-28): "Biodiversidad" es término técnico.
    label: 'La vida de la finca',
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
    id: 'germinacion',
    group: 'cultivo',
    status: 'live',
    icon: '🌱',
    // jerga campesina (2026-06-28): "Germinación" es término técnico.
    label: '¿Sirve mi semilla?',
    desc: 'Prueba si tu semilla está viva antes de sembrar.',
    tool: 'germination_test',
    hero: true,
    heroRoute: { kind: 'nav', view: 'germinacion' },
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
    // BOTÓN ÚNICO DE VOZ (#23): entrada principal voz-first del grupo
    // "Guardar lo que hago". Reemplaza "procesos por voz" en la mano: este
    // botón consolida las 3 pantallas de voz en UN flujo que clasifica la
    // intención entre TODOS los tipos (planta/siembra/cosecha/insumo/
    // mantenimiento/observación/plaga) y extrae los campos del lenguaje
    // natural. La vista 'procesos' (ProcesosPorVozScreen, ciclo productivo)
    // sigue viva y enlazada desde otras pantallas; solo la MANO apunta ahora
    // al flujo unificado 'registro_voz'. tool/id se conservan (capabilityHealth).
    id: 'procesos',
    group: 'registrar',
    status: 'live',
    icon: '🎙️',
    label: 'Registrar hablando',
    desc: 'Cuéntame qué hiciste o qué viste: siembra, cosecha, insumo, mantenimiento, observación o plaga, y lo guardo.',
    tool: 'farm_process',
    hero: true,
    featured: true, // 1 de las 6 destacadas (anillo principal) — voz-first.
    heroRoute: { kind: 'nav', view: 'registro_voz' },
  },
  {
    id: 'alertas-cultivo',
    group: 'cuidar',
    status: 'live',
    icon: '🔔',
    label: 'Alertas del cultivo',
    desc: 'Avisos anticipados de riesgo por clima, plagas y etapa.',
    tool: 'crop_alerts',
    // hero:false (dedup mano 2026-06-28): `alertas-cultivo` y `ciclo` apuntaban a
    // la MISMA vista 'ciclo' → dos puertas al mismo sitio en la mano. Se deja
    // `ciclo` ("Ciclo del cultivo") como la única hoja de esa vista; las alertas
    // viven DENTRO de esa pantalla (sección de avisos), no como rama aparte.
    // status sigue 'live' (capabilityHealth/otros consumidores intactos).
    hero: false,
    heroRoute: { kind: 'nav', view: 'ciclo' },
  },
  // NOTA (dedup mano 2026-06-28): la entrada 'aprender-hub' (≡ 'aprender_hub',
  // mismo destino nav:'aprende') se ELIMINÓ — eran duplicados. Se conserva
  // 'aprender_hub' ("Aprender con el agente", arriba) como única hoja de la rama.
  {
    // RAMA "Vender" de la mano: antes el grupo solo tenía 'precio'
    // (status 'soon' → no clickeable), así que la rama no iba a ningún lado.
    // Esta entrada la conecta a una superficie HONESTA y alcanzable ('mercados',
    // MercadosScreen): explica el estado real de la consulta de precios y orienta
    // a las fuentes públicas (DANE/SIPSA, centrales de abasto). No es un
    // dead-end ni una promesa: es una pantalla real "en preparación".
    id: 'vender-mercados',
    group: 'vender',
    status: 'live',
    icon: '🤝',
    label: 'Vender mejor',
    desc: 'A dónde llevar la cosecha y dónde consultar precios mayoristas. En preparación.',
    tool: null,
    // hero:false (dedup mano 2026-06-28): `mercado` ("Mercado de la finca",
    // marketplace LIVE) y `vender-mercados` ("Vender mejor", en preparación)
    // navegan a la MISMA MercadosScreen (App.jsx: vistas 'mercado' y 'mercados'
    // renderizan el mismo componente). Se deja `mercado` (capacidad real) como la
    // única hoja de la rama "Vender"; `vender-mercados` se retira de la mano hasta
    // tener un backend de precios/destinos propio.
    hero: false,
    heroRoute: { kind: 'nav', view: 'mercados' },
  },
]);

// ── Vistas derivadas ──────────────────────────────────────────────────────

/**
 * CHIP_INTENTS — enum de intentos de chip. Clave === valor (string union).
 * Derivado del manifiesto: solo entradas con `intent` definido.
 * @type {Record<string, string>}
 */
export const CHIP_INTENTS = Object.freeze(
  CAPABILITY_MANIFEST
    .filter((e) => e.intent)
    .reduce((acc, e) => {
      acc[e.intent] = e.intent;
      return acc;
    }, /** @type {Record<string, string>} */ ({})),
);

/**
 * CHIP_DEFS — definiciones de chips de modo para ChipsToolbar.
 * Orden = orden del manifiesto (filtrado a entradas con intent).
 * Cada entrada: { intent, emoji, label, kind, placeholder, stubMessage, moreGroup }.
 *
 * `moreGroup` (derivado de `chipMore` del manifiesto): true → el chip es
 * grounding puntual (toxicidad/saberes/variedades/polinización/fenología/
 * alerta páramo) que ChipsToolbar agrupa bajo el toggle "Más" para no saturar
 * la barra principal con el núcleo diario (siembro/plaga/clima/...).
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
      ...(e.chipMore ? { moreGroup: true } : {}),
    })),
);
