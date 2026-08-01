/**
 * agentService — Contexto de perfil y system prompt extensions para el agente Chagra.
 *
 * Task #202: Integrar profile.json del onboarding en system prompt con:
 * 1. Tono de lenguaje regional según profile.region
 * 2. Recomendaciones según región específica (no solo piso térmico)
 * 3. Info técnica SIEMPRE cita fuente
 * 4. Datos de finca SOLO si user pregunta
 * 5. Alertas clima inteligentes (IDEAM + ENSO)
 * 6. Origen obligatorio cada dato técnico
 *
 * @module agentService
 */

import { getRegionFromDepartment } from './regionalismsService.js';
import { classifyQueryIntent } from './outputGuards.js';
import {
  isInCaucaRegion as _isInCaucaRegion,
  normalizeUserInput as _normalizeCauca,
  localizeAgentOutput as _localizeCauca,
} from './glosarioCaucaService.js';
import { filterVoseo as _filterVoseo } from './voseoFilter.js';
import { buildUserProfileBlock, getProfile } from './userProfileService.js';
import { findMunicipio } from '../utils/colombiaLocations.js';
import { buildEnsoAgentLines } from './ensoContext.js';

/**
 * Free 7→10 fix-pack #5: re-exporta los helpers de glosario regional Cauca
 * para que los callers (AgentScreen, VoiceCapture, etc.) puedan invocarlos
 * sin conocer el archivo internal del glosario.
 *
 * Wire sugerido para callers (Free 7→10 fix-pack):
 *   1. Antes de mandar el input al LLM:
 *        const finca = useFincaActiveStore.getState().getActiveFinca();
 *        const normalized = normalizeUserInputForRegion(userText, finca);
 *        // → mandar `normalized` al LLM
 *   2. Después de recibir la respuesta del LLM (opcional):
 *        const localized = localizeAgentOutputForRegion(llmResponse, finca);
 *        // → mostrar/hablar `localized`
 *
 * Si la finca no está en región Cauca, ambas funciones son no-op
 * (passthrough), así que es seguro llamarlas siempre — el gate por región
 * vive en glosarioCaucaService.
 */
export function normalizeUserInputForRegion(text, finca) {
  return _normalizeCauca(text, { finca });
}

export function localizeAgentOutputForRegion(text, finca) {
  return _localizeCauca(text, { finca });
}

export function isFincaInCaucaRegion(finca) {
  return _isInCaucaRegion(finca);
}

/**
 * C2 (2026-06-02): convierte el NOMBRE de un departamento (el que trae el
 * dataset DANE, p. ej. "Antioquia", "Bogotá, D.C.", "Valle del Cauca") a la
 * clave-slug que `getRegionFromDepartment` / `regionalisms-co.json` esperan
 * (p. ej. "antioquia", "bogota_dc", "valle_del_cauca").
 *
 * La mayoría de departamentos slugifican directo (tildes fuera + espacios a
 * guion bajo). Un puñado de nombres oficiales DANE no coinciden 1:1 con el
 * slug del dataset de regionalismos y se mapean a mano.
 *
 * @param {string|null|undefined} name
 * @returns {string|null} slug del departamento, o null si no hay nombre.
 */
export function slugifyDepartamento(name) {
  if (!name || typeof name !== 'string') return null;
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes (diacriticos combinantes)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // todo lo no-alfanumérico → "_"
    .replace(/^_+|_+$/g, ''); // recorta "_" de los bordes
  if (!base) return null;

  // Casos especiales: nombre oficial DANE ≠ slug de regionalisms-co.json.
  const SPECIAL = {
    bogota_d_c: 'bogota_dc',
    la_guajira: 'guajira',
    archipielago_de_san_andres_providencia_y_santa_catalina: 'san_andres',
  };
  return SPECIAL[base] || base;
}

/**
 * C2 (2026-06-02): resuelve la CLAVE de región lingüística del usuario a
 * partir del perfil del onboarding (#200/#325/#338). Es la señal que el
 * filtro de voseo region-aware necesita para decidir si PRESERVA el voseo
 * (regiones voseantes: paisa/pacífico/pastuso) o lo aplana (tú en caribe,
 * usted en el resto).
 *
 * Prioridad de señales (de la más precisa a la más laxa):
 *   1. `profile.departamento` — campo LIMPIO que LocationDetectedScreen guarda
 *      al confirmar la ubicación (#338). Nombre DANE → slug → región.
 *   2. `profile.municipio` — municipio limpio; se resuelve su departamento con
 *      el dataset DANE embebido (offline).
 *   3. `profile.region` — texto libre legacy ("Municipio, Departamento"); se
 *      intenta resolver el municipio contra el dataset DANE.
 *
 * Degrada SIEMPRE con gracia: si nada resuelve a una región conocida devuelve
 * `null`, lo que deja al engine en su comportamiento histórico (aplanar a la
 * formalidad por defecto). Es PURA respecto a red (solo lee localStorage +
 * dataset embebido) y nunca lanza.
 *
 * @returns {string|null} clave de región (paisa/caribe/cundiboyacense/…) o null.
 */
export function resolveUserRegion() {
  let profile;
  try {
    profile = getProfile();
  } catch (_) {
    return null;
  }
  if (!profile || typeof profile !== 'object') return null;

  // 1) Departamento limpio (la señal más fiable).
  if (profile.departamento) {
    const region = getRegionFromDepartment(slugifyDepartamento(profile.departamento));
    if (region) return region;
  }

  // 2) Municipio limpio → su departamento vía dataset DANE → región.
  // 3) Region texto libre legacy → mismo camino.
  for (const candidate of [profile.municipio, profile.region]) {
    if (!candidate) continue;
    try {
      const hit = findMunicipio(candidate);
      if (hit && hit.departamento) {
        const region = getRegionFromDepartment(slugifyDepartamento(hit.departamento));
        if (region) return region;
      }
    } catch (_) {
      // findMunicipio nunca debería lanzar, pero degradamos por las dudas.
    }
  }

  return null;
}

/**
 * DR-LANG-1 (2026-05-28): aplica el filtro post-process anti-voseo
 * argentino sobre la salida del LLM. Se usa como última etapa antes de
 * exponer el texto al ChatScreen y al TTS, garantizando que ningún
 * marcador voseo argentino llegue al usuario campesino colombiano
 * independientemente de lo que el modelo decida emitir.
 *
 * C1/C2 (2026-06-02): ahora es REGION-AWARE. Si el caller no pasa `region`
 * en `opts`, se resuelve desde el perfil del usuario con `resolveUserRegion`.
 * En regiones voseantes (paisa/pacífico/pastuso) el voseo es el registro
 * AUTÉNTICO del campesino → el engine lo PRESERVA y solo limpia el léxico
 * rioplatense (che, laburar, etc.). En el resto se aplana (tú en caribe,
 * usted por defecto). Sin región conocida → comportamiento histórico (aplanar
 * a `formality`, default usted), seguro y back-compatible.
 *
 * Para forzar el comportamiento default ignorando el perfil, el caller puede
 * pasar `region: null` explícito en `opts`.
 *
 * Default formality='usted' (target campesino piloto Free). El caller
 * puede pasar 'tu' si la región del usuario lo prefiere.
 *
 * Telemetría on por defecto: incrementa contador local
 * `chagra:voseo_filter_triggers` por marker_id. Útil para detectar
 * regresiones del modelo aguas arriba.
 *
 * Wire en AgentScreen:
 *   const response = await callLLM(...);
 *   const safe = applyVoseoFilter(response, { region: resolveUserRegion() });
 *   // → render(safe), speak(safe), persist(safe)
 *
 * @param {string} text  texto crudo del LLM
 * @param {object} [opts]
 * @param {'tu' | 'usted'} [opts.formality='usted']
 * @param {string|null} [opts.region]  clave de región; si se omite se resuelve
 *   del perfil. `null` explícito fuerza el default (no resuelve del perfil).
 * @returns {string}
 */
export function applyVoseoFilter(text, opts = {}) {
  const { formality = 'usted' } = opts;
  // Si el caller no especificó `region` (ni siquiera null explícito), la
  // resolvemos del perfil. `'region' in opts` distingue "no pasado" de
  // "pasado como null" — este último fuerza el default seguro.
  const region = 'region' in opts ? opts.region : resolveUserRegion();
  return _filterVoseo(text, {
    formality,
    telemetry: true,
    ...opts,
    region,
  });
}

/**
 * BUG A (fuga de roles, incidente prod 2026-05-30) — defensa #2 (post-proceso).
 *
 * `conversationMemory.getContextString` inyecta el historial al prompt con
 * etiquetas "Usuario:" / "Asistente:". Si el modelo no se detiene a tiempo
 * (la defensa #1 son las stop sequences de `llmRouter`, pero el path de
 * streaming del sidecar NO reenvía `stop`), sigue generando PASADO su turno
 * e inventa un turno falso del usuario, p.ej.:
 *
 *   "El tomate de árbol se siembra a 1800 msnm.
 *    Usuario: Hola Dante, gracias por tu consulta..."
 *
 * Esta función TRUNCA la respuesta en el primer marcador de turno falso —
 * etiqueta de rol al INICIO de línea (ES/EN) o marcador de chat-template de
 * Ollama/llama.cpp. Es determinística, idempotente y O(n).
 *
 * Diseño conservador para no mutilar respuestas legítimas:
 *   - Solo corta etiquetas de rol al inicio de línea (`^` o tras `\n`), NO
 *     a mitad de oración ("Soy tu Asistente: ..." se respeta).
 *   - Los marcadores de chat-template (`<|im_start|>`, etc.) sí cortan en
 *     cualquier posición — nunca aparecen en prosa legítima.
 *
 * @param {string} text  texto crudo del LLM (idealmente ya pos-voseo)
 * @returns {string} texto truncado y trim. '' si entrada vacía/no-string.
 */
export function stripRoleLeak(text) {
  if (typeof text !== 'string' || text.length === 0) return '';

  let cut = text.length;

  // 1) Marcadores de chat-template: cortan en cualquier posición.
  const templateMarkers = ['<|im_start|>', '<|im_end|>', '<|user|>', '<|assistant|>'];
  for (const marker of templateMarkers) {
    const idx = text.indexOf(marker);
    if (idx !== -1 && idx < cut) cut = idx;
  }

  // 2) Etiquetas de rol SOLO al inicio de línea (inicio del texto o tras
  //    newline). Tolera espacios antes de los dos puntos ("Usuario :").
  //    `m` flag → ^ matchea inicio de cada línea.
  const roleAtLineStart =
    /(^|\n)[ \t]*(?:Usuario|Asistente|User|Assistant)[ \t]*:/m;
  const m = roleAtLineStart.exec(text);
  if (m) {
    // Si el match es al inicio absoluto (m[1] === ''), cut = 0.
    // Si arranca tras un newline, cortamos en la posición del newline.
    const idx = m.index + (m[1] ? m[1].length : 0);
    if (idx < cut) cut = idx;
  }

  return text.slice(0, cut).trim();
}

/**
 * Mapeo de zonas bioculturales a regiones lingüísticas.
 * Basado en correlación geográfica y cultural de Colombia.
 */
const ZONE_TO_REGION_MAP = {
  'andino_alto_páramo': 'cundiboyacense',
  'andino_alto': 'cundiboyacense',
  'andino_medio': 'cundiboyacense', // podría ser paisa dependiendo del departamento
  'andino_medio_invernadero': 'cundiboyacense',
  'valle_caucano': 'paisa', // Valle del Cauca es eje cafetero
  'cafetero': 'paisa',
  'caribe': 'caribe',
  'llanos': 'llanero',
  'amazonia': 'amazonica',
  'pacifico': 'pacifico',
  'nariño': 'pastuso',
  'santander': 'santandereano',
  'tolima_huila': 'opita',
};

/**
 * Mapeo de zonas bioculturales a departamentos para detectar región.
 * Usado cuando biocultural_zone no está mapeada directamente.
 */
const ZONE_TO_DEPARTMENTS = {
  'andino_alto_páramo': ['boyaca', 'cundinamarca', 'bogota_dc'],
  'andino_alto': ['cundinamarca', 'boyaca'],
  'andino_medio': ['cundinamarca', 'boyaca', 'antioquia', 'caldas', 'risaralda', 'quindio'],
  'andino_medio_invernadero': ['cundinamarca', 'antioquia', 'caldas'],
  'valle_caucano': ['valle_del_cauca', 'cauca'],
  'cafetero': ['antioquia', 'caldas', 'risaralda', 'quindio'],
  'caribe': ['atlantico', 'bolivar', 'cesar', 'cordoba', 'guajira', 'magdalena', 'sucre'],
  'llanos': ['meta', 'casanare', 'vichada', 'arauca'],
  'amazonia': ['putumayo', 'caqueta', 'amazonas', 'vaupes'],
  'pacifico': ['choco', 'valle_del_cauca', 'cauca', 'narino'],
  'nariño': ['narino'],
  'santander': ['santander', 'norte_de_santander'],
  'tolima_huila': ['tolima', 'huila'],
};

/**
 * Alertas específicas por región basadas en riesgos climáticos.
 */
export const REGIONAL_CLIMATE_ALERTS = {
  'andino_alto_páramo': {
    riesgos: ['heladas', 'granizadas', 'vientos fuertes', 'radiación UV extrema'],
    recomendaciones: 'Proteger cultivos con cubierta plástica o mantas térmicas durante noches despejadas. Evitar riego en horas de la tarde para reducir riesgo de heladas.',
    fuentes: ['IDEAM 2024 - Pronóstico de heladas en zonas altoandinas', 'Corporación Autónoma Regional'],
  },
  'andino_alto': {
    riesgos: ['heladas ocasionales', 'granizadas', 'lluvias torrenciales'],
    recomendaciones: 'Monitorear pronóstico IDEAM para alertas de helada. Usar cobertores temporales en cultivos sensibles durante temporales de frío.',
    fuentes: ['IDEAM - Estudio de heladas en Sabana de Bogotá 2020-2023'],
  },
  'andino_medio': {
    riesgos: ['exceso de lluvias', 'enfermedades fúngicas', 'erosión'],
    recomendaciones: 'Implementar drenajes adecuados. Rotar fungicidas preventivamente. Usar cobertura vegetal para controlar erosión.',
    fuentes: ['ICA - Manual de manejo fitosanitario zona andina', 'IDEAM - Análisis de precipitación 2023'],
  },
  'valle_caucano': {
    riesgos: ['sequías estacionales', 'temperaturas extremas', 'fenómenos de El Niño/La Niña'],
    recomendaciones: 'Implementar riego por goteo eficiente. Usar mulch para conservar humedad. Sembrar variedades tolerantes a estrés hídrico.',
    fuentes: ['IDEAM - Boletín ENSO 2024', 'CENICAÑA - Recomendaciones cultivo de caña', 'Corporación Autónoma Regional del Valle del Cauca'],
  },
  'caribe': {
    riesgos: ['salinidad en suelos', 'sequías prolongadas', 'huracanes'],
    recomendaciones: 'Usar cultivos tolerantes a salinidad. Implementar sistemas de riego con agua de calidad controlada. Monitorear ciclones tropicales.',
    fuentes: ['IDEAM - Monitor de sequía Caribe', 'ICA - Recomendaciones zonas costeras'],
  },
  'llanos': {
    riesgos: ['sequías marcadas', 'incendios forestales', 'periodos de inundación'],
    recomendaciones: 'Implementar sistema de prevención contra incendios. Usar cultivos adaptados a periodos de estrés hídrico. Planificar siembras según régimen de lluvias.',
    fuentes: ['IDEAM - Alerta de incendios 2024', 'Corporinoquia - Plan de manejo del fuego'],
  },
  'pacifico': {
    riesgos: ['exceso de lluvias', 'humedad extrema', 'enfermedades tropicales'],
    recomendaciones: 'Espaciamiento amplio entre plantas para ventilación. Control preventivo de hongos. Usar especies nativas adaptadas a condiciones de humedad.',
    fuentes: ['IDEAM - Análisis precipitación Pacífico', 'Codechocó - Guía agroforestal'],
  },
  'amazonica': {
    riesgos: ['deforestación', 'pérdida de biodiversidad', 'cambio climático global'],
    recomendaciones: 'Priorizar sistemas agroforestales con especies nativas. Conservar corredores biológicos. Evitar monocultivos extensivos.',
    fuentes: ['SINCHI - Guía agroecológica amazónica', 'IDEAM - Monitor de deforestación'],
  },
  'nariño': {
    riesgos: ['heladas andinas', 'sequías en valles interandinos', 'erupciones volcánicas'],
    recomendaciones: 'Usar variedades locales adaptadas (frejol, maíz nativo). Implementar terrazas para reducir erosión. Monitorear ceniza volcánica.',
    fuentes: ['IDEAM Pasto', 'Corporación Autónoma Regional de Nariño'],
  },
  'santandereano': {
    riesgos: ['erosión severa', 'sequías en cañones', 'lluvias torrenciales'],
    recomendaciones: 'Practicar labranza mínima. Construir zanjas de infiltración. Usar coberturas vegetales permanentes.',
    fuentes: ['CAS - Guía de conservación de suelos', 'IDEAM Bucaramanga'],
  },
  'tolima_huila': {
    riesgos: ['deslizamientos', 'heladas en zonas altas', 'sequías estacionales'],
    recomendaciones: 'Evitar cultivos en laderas pronunciadas sin obras de conservación. Monitorear alertas de remoción en masa.',
    fuentes: ['Cortolima - Plan de gestión del riesgo', 'IDEAM Neiva'],
  },
};

/**
 * Detecta la región lingüística basada en la zona biocultural de la finca.
 *
 * @param {string} bioculturalZone - Zona biocultural (ej: "andino_alto_páramo")
 * @returns {string|null} Región lingüística (ej: "cundiboyacense") o null
 */
export function detectRegionFromBioculturalZone(bioculturalZone) {
  if (!bioculturalZone) return null;
  
  // Mapeo directo
  if (ZONE_TO_REGION_MAP[bioculturalZone]) {
    return ZONE_TO_REGION_MAP[bioculturalZone];
  }
  
  // Mapeo por departamento
  const departments = ZONE_TO_DEPARTMENTS[bioculturalZone];
  if (departments && departments.length > 0) {
    // Retornar región del primer departamento
    return getRegionFromDepartment(departments[0]);
  }
  
  return null;
}

/**
 * Genera contexto de tono regional para el system prompt.
 *
 * @param {string} region - Región lingüística (ej: "cundiboyacense")
 * @returns {string} Contexto de tono regional para inyectar en prompt
 */
export function generateRegionalToneContext(region) {
  if (!region) {
    return 'Usa español neutro colombiano (tú/usted, sin regionalismos marcados).';
  }
  
  const toneMap = {
    'cundiboyacense': 'Usa español cundiboyacense: "sumercé", "quibo", "pues". Tono respetuoso pero cercano, típico del altiplano.',
    'paisa': 'Usa español paisa: "¿qui más?", "pues", "vea", "parce". Tono amable y conversacional del eje cafetero.',
    'caribe': 'Usa español costeño: "ajá parce", "vé pue", "hermano". Tono cálido y directo del Caribe.',
    'llanero': 'Usa español llanero: "quibo ome", "mire mocho", "compadre". Tono de sabana.',
    'opita': 'Usa español opita/tolimense: "paisano", "jue", "ah pues". Tono tolima-huila.',
    'pastuso': 'Usa español pastuso: "taita", "guagua", "pues si". Tono nariñense.',
    'pacifico': 'Usa español del Pacífico: "compadre", "hermano de la mar". Tono afrocolombiano.',
    'santandereano': 'Usa español santandereano: "¡quiubo, mano!", "mano". Tono canchón.',
    'amazonica': 'Usa español suave amazónico. Reconoce diversidad cultural. Evita imitar acentos específicos.',
  };
  
  return toneMap[region] || 'Usa español neutro colombiano.';
}

/**
 * Genera alertas climáticas contextuales según zona biocultural.
 *
 * @param {string} bioculturalZone - Zona biocultural de la finca
 * @returns {string} Alertas climáticas para inyectar en prompt
 */
export function generateClimateAlertsContext(bioculturalZone) {
  // Bug piloto 2026-05-27: el LLM respondía "no tengo acceso a datos
  // meteorológicos, consulta IDEAM/AccuWeather" cuando el sidecar SÍ tiene
  // tool get_clima_ideam funcional. El leak venía de las instrucciones
  // "recomienda consultar pronóstico IDEAM más reciente" que invitaban al
  // redirect. Reemplazadas por instrucción CLIMA-DIRECTO honesta: si Chagra
  // no logró consultar, DECIRLO sin redirigir al user a apps externas.
  const baseClimateRule = 'REGLA CLIMA: cuando el usuario pregunte por clima, lluvia, temperatura, pronóstico o "reporte del tiempo" para su zona, el sistema DEBE consultar IDEAM vía el tool get_clima_ideam (Chagra lo hace por el usuario). Si en este mensaje no se inyectó evidencia clima del tool, NO inventes datos NI redirijas al usuario a IDEAM/AccuWeather/Weather Channel — dile honestamente: "No logré consultar el reporte del IDEAM para tu zona en este momento, inténtalo en unos minutos". NUNCA digas "no tengo acceso a datos meteorológicos" porque sí lo tenemos; di "no logré consultarlo ahora".';

  if (!bioculturalZone) {
    return baseClimateRule;
  }

  const alerts = REGIONAL_CLIMATE_ALERTS[bioculturalZone];
  if (!alerts) {
    return `${baseClimateRule}\n\nZona biocultural del operador: ${bioculturalZone}.`;
  }

  return `ALERTAS CLIMÁTICAS PARA TU ZONA (${bioculturalZone}):
Riesgos principales: ${alerts.riesgos.join(', ')}.
Recomendación general: ${alerts.recomendaciones}
Fuentes: ${alerts.fuentes.join(', ')}.

${baseClimateRule}`;
}

/**
 * Genera reglas de citas de fuentes para el system prompt.
 *
 * @returns {string} Reglas de citación para inyectar en prompt
 */
export function generateSourceCitationRules() {
  return `REGLA CRÍTICA DE CITACIÓN DE FUENTES: toda información técnica (altitud, siembra, manejo, plagas, clima) DEBE citar su origen — "según Restrepo & Rivera (1994)", "ICA Resolución [número]", "Agrosavia [año]", "IDEAM [año]", "SENA [curso]", "Papel técnico [título]" o "El catálogo Chagra indica…". Si NO tienes fuente verificable, dilo: "No tengo una fuente confiable para este dato; consúltalo con [técnico local/agrónomo/IDEAM]." NUNCA inventes datos ni fuentes.
REGLA CRÍTICA DE NOMBRES CIENTÍFICOS (BINOMIO): solo cita un binomio Linneano si proviene del grounding/catálogo provisto en este mensaje (bloques "=== ENTIDADES RESUELTAS ===" o "=== EVIDENCIA AUTORITATIVA ==="). Si la planta/plaga NO aparece ahí, NO inventes el binomio: usa SOLO el nombre común tal cual lo dijo el usuario, sin paréntesis con científico — inventarlo por similitud fonética es alucinación grave (ej. "tomate de árbol" es Solanum betaceum, NUNCA "Solanum lycopersicum"). Ante la duda: nombre común, sin binomio.
REGLA CRÍTICA DE ESPECIE DESCONOCIDA (OBLIGATORIA, prioridad máxima): si el usuario nombra una planta, cultivo o animal que NO aparece textualmente en "=== ENTIDADES RESUELTAS ===" ni en el grounding de este mensaje, está TERMINANTEMENTE PROHIBIDO darle siembra, manejo, poda, riego, fechas, dosis, descripción o usos de esa planta. NO improvises NI un dato, NI consejos genéricos de cultivo. Tu ÚNICA respuesta válida sobre ella es UNA frase: "No tengo [nombre tal cual lo dijo el usuario] en mi catálogo todavía; confírmame el nombre o el nombre científico, o consúltalo con un técnico local." Y DETENTE AHÍ — no añadas nada más. Ejemplo PROHIBIDO: usuario "¿cómo siembro el tomatillo de monte?" → MAL: explicar cómo sembrarlo o dar tips genéricos; BIEN: solo la frase anterior. Inventar el manejo, la descripción o el binomio de una planta que no reconoces —aunque suene parecida a otra— es alucinación grave.`;
}

/**
 * Genera reglas de uso de datos de finca del usuario.
 *
 * @returns {string} Reglas de privacidad de datos para inyectar en prompt
 */
export function generateUserDataRules() {
  return `REGLA DE PRIVACIDAD DE DATOS DE FINCA: los datos de plantas/cultivos/finca del usuario SOLO se mencionan cuando él pregunta explícitamente por su inventario ("¿qué tengo?", "mis plantas", "mi finca", "mi cultivo", "cuántas plantas tengo", "qué plantas hay", "¿cuántos [cultivo] tengo?"). NO preambules respuestas con "Tienes X plantas..." si la pregunta es sobre otra cosa (manejo, plagas, clima). Ejemplo: a "cómo podo el café" → "Para la poda del café (Coffea arabica), según Restrepo & Rivera (1994)…" (NO menciona inventario); a "qué tengo plantado" → "Tienes 15 fresas, 4 caléndulas, 1 tomate cherry…" (SÍ menciona inventario).`;
}

/**
 * Construye el contexto de perfil completo para inyectar en el system prompt.
 *
 * @param {Object} finca - Objeto finca activa
 * @param {object} [opts]
 * @param {boolean} [opts.climaQuery=true] - si false, omite el bloque de
 *   alertas climáticas regionales (solo aporta en consultas de clima).
 * @param {string} [opts.nivelRespuestas=''] - 'simple' o 'detallado' (del perfil).
 *   Si es 'simple', responde con pasos concretos y frases cortas.
 *   Si es 'detallado', responde con más contexto técnico.
 * @returns {string} Contexto de perfil para system prompt
 */
export function buildProfileContext(finca, opts = {}) {
  // #200: bloque de perfil enriquecido del onboarding (localStorage
  // chagra:profile:*). Vacío si el usuario no completó el onboarding —
  // sin breaking change, el agente sigue como antes.
  let userProfileBlock = '';
  try {
    userProfileBlock = buildUserProfileBlock();
  } catch (e) {
    console.warn('[agentService] buildUserProfileBlock falló:', e);
  }
  const profileSuffix = userProfileBlock ? `\n\n${userProfileBlock}` : '';
  const veredaContext = (() => {
    try {
      const p = getProfile();
      if (!p || typeof p !== 'object' || !p.vereda) return '';
      const location = [p.vereda, p.municipio, p.departamento].filter(Boolean).join(', ');
      const source = p.vereda_source ? ` Fuente: ${p.vereda_source}.` : '';
      return `\n\nCONTEXTO DE VEREDA OSM:
- Ubicación veredal confirmada: ${location}.${source}
- Usa la vereda para adaptar clima local, pendiente, acceso y recomendaciones de campo cuando sea relevante.
- Si la consulta requiere precisión predial, pide confirmación de coordenadas o altitud antes de afirmar.`;
    } catch (_) {
      return '';
    }
  })();

  // Re-arquitectura GR-10: el bloque de ALERTAS CLIMÁTICAS regionales (riesgos
  // por zona + regla CLIMA-DIRECTO) solo aporta cuando la consulta toca clima;
  // en una pregunta de plaga/manejo es peso muerto que empuja a la truncación
  // del grounding. `climaQuery` por defecto true → callers existentes y tests
  // ven el bloque completo; buildBasePrompt lo pasa false para queries no-clima.
  // `nivelRespuestas` controla el nivel de detalle: 'simple' (pasos concretos)
  // o 'detallado' (más contexto técnico).
  const { climaQuery = true, nivelRespuestas = '' } = opts || {};

  // Añade bloque de nivel de respuestas si está especificado (ej: 'simple' o
  // 'detallado'). Esto permite adaptar el nivel de detalle al perfil del usuario.
  const nivelRespuestasBlock = (() => {
    if (!nivelRespuestas || typeof nivelRespuestas !== 'string') return '';
    const nivel = nivelRespuestas.toLowerCase().trim();
    if (nivel === 'simple') {
      return `NIVEL DE RESPUESTA: SIMPLE (pasos concretos).
- Responde con pasos claros y cortos, como hablar con un vecino.
- Evita tecnicismos innecesarios.
- Prioriza lo práctico: qué hacer, cuándo, cómo.
- Usa unidades del campo: cuadra, arroba, luna, bike de agua, plaza.
- Si necesitas explicar algo técnico, usa ejemplos de la finca.`;
    }
    if (nivel === 'detallado') {
      return `NIVEL DE RESPUESTA: DETALLADO (más contexto técnico).
- Puedes explicar el porqué de las recomendaciones.
- Incluye referencias a fuentes técnicas cuando sea relevante.
- Puedes mencionar conceptos técnicos si aclaras su significado.
- Mantén el lenguaje accesible pero con más profundidad.`;
    }
    return '';
  })();

  if (!finca) {
    const blocks = [
      generateSourceCitationRules(),
      generateUserDataRules(),
      nivelRespuestasBlock,
      profileSuffix,
      veredaContext,
    ].filter((s) => s && s.trim());
    return blocks.join('\n\n');
  }

  const bioculturalZone = finca.biocultural_zone;
  const region = detectRegionFromBioculturalZone(bioculturalZone);
  const toneContext = generateRegionalToneContext(region);
  const climateContext = climaQuery ? generateClimateAlertsContext(bioculturalZone) : '';
  const citationRules = generateSourceCitationRules();
  const userDataRules = generateUserDataRules();

  return [
    toneContext,
    climateContext,
    citationRules,
    nivelRespuestasBlock,
    `${userDataRules}${profileSuffix}${veredaContext}`,
  ]
    .filter((s) => s && s.trim())
    .join('\n\n');
}

/**
 * Formatea una alerta climática inteligente para el usuario.
 * Debe usarse cuando se detecte riesgo climático en la consulta.
 *
 * @param {string} bioculturalZone - Zona biocultural
 * @param {Object} climateData - Datos de clima (si disponibles)
 * @returns {string} Alerta formateada para el usuario
 */
export function formatClimateAlert(bioculturalZone, climateData = null) {
  const alerts = REGIONAL_CLIMATE_ALERTS[bioculturalZone];
  if (!alerts) {
    return '';
  }

  let alertText = `⚠️ ALERTA CLIMÁTICA - ${bioculturalZone.replace(/_/g, ' ')}:\n`;
  alertText += `Riesgos: ${alerts.riesgos.join(', ')}.\n`;
  alertText += `Recomendación: ${alerts.recomendaciones}\n`;
  alertText += `Fuentes: ${alerts.fuentes.join(', ')}`;

  if (climateData) {
    alertText += `\n\nPronóstico actual: ${JSON.stringify(climateData)}`;
  }

  return alertText;
}

/**
 * Construye el bloque CLIMA TIEMPO REAL que se inyecta en el system prompt
 * del LLM cuando hay un snapshot vivo (PoC alertas meteorológicas #316).
 *
 * Convierte el snapshot del sidecar en un bloque corto y autoritativo. El
 * agente debe:
 *   - Mencionar la fase ENSO cuando sea relevante para el cultivo del user
 *   - Citar IDEAM/NOAA/CIIFEN por nombre (no inventar atribuciones)
 *   - Adelantar alertas locales críticas en respuestas agronómicas
 *
 * Si el snapshot no está disponible, devuelve string vacío — el agente
 * sigue funcionando como antes.
 *
 * @param {object | null} snapshot — payload de climaService.getCachedClimaSnapshot
 * @param {object} [opts]
 * @param {string|null} [opts.region] - región natural de la finca (ensoContext).
 *   Si se pasa, se inyecta la LECTURA REGIONAL ENSO (DR-MISSION-2/4): qué
 *   implica la fase actual para esa región (p. ej. heladas paradójicas en el
 *   altiplano bajo El Niño seco). Si no, solo se inyecta el bloque base.
 * @param {object|null} [opts.sky] - resumen de cielo del día (skyConditionService).
 *   Si tiene `label` y opcionalmente `cloudCoverPct` y `degraded`, se inyecta
 *   una línea con el cielo real del día en la finca.
 * @returns {string}
 */
export function buildClimaContext(snapshot, opts = {}) {
  if (!snapshot || typeof snapshot !== 'object') return '';
  const enso = snapshot.enso_status;
  if (!enso || typeof enso !== 'object') return '';

  const lines = [];
  lines.push('=== CLIMA TIEMPO REAL (autoritativo — cítalo cuando sea relevante) ===');
  lines.push(`Fase ENSO actual: ${enso.label || enso.phase || 'desconocida'} (severidad: ${enso.severity || 'neutral'}).`);
  if (typeof enso.oni_value === 'number') {
    lines.push(`ONI NOAA observado: ${enso.oni_value.toFixed(2)}°C — tendencia ${enso.trend || 'estable'}.`);
  }
  if (enso.ideam_probabilidades || enso.ideam_probabilities) {
    const p = enso.ideam_probabilidades || enso.ideam_probabilities;
    lines.push(`Probabilidad IDEAM próximos meses: ${p.nino_pct}% El Niño / ${p.neutral_pct}% Neutro / ${p.nina_pct}% La Niña.`);
  }
  if (Array.isArray(enso.sources) && enso.sources.length > 0) {
    lines.push(`Fuentes ENSO: ${enso.sources.join(', ')}.`);
  }
  const alertas = Array.isArray(snapshot.alertas_locales) ? snapshot.alertas_locales : [];
  if (alertas.length > 0) {
    lines.push('');
    lines.push('Alertas locales activas (Open-Meteo + umbrales agroecológicos):');
    for (const a of alertas.slice(0, 6)) {
      const sev = a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟠' : '🔵';
      lines.push(`  ${sev} ${a.tipo}: ${a.mensaje}`);
    }
  }

  // Cielo de HOY (nubosidad real — fix Choachí 2026-06). El snapshot del
  // sidecar no trae cloud_cover; el resumen viene de skyConditionService
  // (Open-Meteo directo + corrección orográfica andina + ENSO). Solo se
  // inyecta si el caller lo pasó — sin dato, el prompt no inventa cielo.
  if (opts.sky && typeof opts.sky === 'object' && opts.sky.label) {
    const pct = typeof opts.sky.cloudCoverPct === 'number'
      ? ` (cobertura nubosa ~${Math.round(opts.sky.cloudCoverPct)}%)`
      : '';
    const honesty = opts.sky.degraded
      ? ' Ajustado por nubosidad orográfica altoandina (el modelo global la subestima): NO prometas sol.'
      : '';
    lines.push('');
    lines.push(`Cielo de hoy en la finca: ${opts.sky.label}${pct} — Open-Meteo.${honesty}`);
  }

  // Lectura regional ENSO (DR-MISSION-2/4) si conocemos la región de la finca.
  // Complementa la fase cruda con la implicación accionable por región.
  const ensoRegional = buildEnsoAgentLines({
    phase: enso.phase || 'neutral',
    region: opts.region || null,
    probabilities: enso.ideam_probabilities || enso.ideam_probabilidades || null,
  });
  if (ensoRegional) {
    lines.push('');
    lines.push(ensoRegional);
  }

  lines.push('');
  lines.push('REGLA: si tu recomendación depende del clima de los próximos días o del fenómeno ENSO, menciónalo CITANDO las fuentes de arriba. Si El Niño / La Niña activo cambia la recomendación de manejo, dilo plano. Si el dato no aplica al cultivo de la pregunta, no lo fuerces.');
  lines.push('=== FIN CLIMA TIEMPO REAL ===');

  return lines.join('\n');
}

/**
 * generateViabilityRules — regla ESTÁTICA del system prompt para que el agente:
 *
 *   1. VIABILIDAD HONESTA: si el usuario quiere sembrar una especie cuya altitud
 *      de finca cae FUERA del rango [altitud_min, altitud_max] de esa especie,
 *      lo dice con honestidad directa pero amable (probabilidad muy baja + el
 *      porqué) y SUGIERE alternativas viables SOLO del catálogo/grounding —
 *      NUNCA inventadas. Si no tiene el rango de la especie, NO afirma nada
 *      sobre viabilidad (degrada con gracia).
 *      (FIX P0 audit 2026-06-23: get_cultivos_viables eliminada del prompt —
 *      no está en el allowlist del sidecar; prometida → falla en silencio.)
 *   2. DEFAULT FINCA-CONTEXT: las preguntas son POR DEFECTO sobre la finca del
 *      usuario sin que él lo tenga que decir (lo habilita buildFincaContext;
 *      aquí solo se declara como comportamiento por defecto).
 *   3. PRESENTACIÓN LOCAL "linda" (costo CERO de inteligencia — solo fraseo): al
 *      citar datos de la finca, que se note que son SUYOS y LOCALES.
 *
 * Es una constante de prompt — sin red, sin estado, sin latencia. Se concatena
 * una sola vez en el system prompt.
 *
 * @returns {string}
 */
export function generateViabilityRules() {
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
  return `REGLA DE VIABILIDAD HONESTA: las preguntas son POR DEFECTO sobre SU finca (altitud, piso, clima) aunque no lo diga — ya está en "=== CONTEXTO AMBIENTAL DE LA FINCA ===". Si el grounding trae el rango de la especie (altitud_min/altitud_max):
- Finca FUERA de [altitud_min, altitud_max]: dilo con honestidad amable — probabilidad de éxito muy baja y POR QUÉ (ej: coco 0–1000 m cálido, tu finca 2580 m frío) y sugiere 2–3 alternativas viables para SU altitud.
- PREMISA FALSA EMBEBIDA: si da por hecho un cultivo ya sembrado/prosperando en un piso incompatible con su rango ("el café que sembré a nivel del mar", "mi mango del páramo"), NO des cosecha/cuidados como si fuera cierto: corrige con amabilidad ("ojo: el café no prospera a nivel del mar") y orienta con alternativas o pide aclaración.
- Alternativas SOLO del catálogo/grounding. NUNCA inventes especies, viabilidad ni incompatibilidad.
- Sin rango (null): NO afirmes NADA; sé neutral y pide el dato.
PRESENTACIÓN LOCAL: que los datos de finca se noten SUYOS ("En tu finca…", "Para tu altura (2580 m)…"); usuario campesino o niño. Conciso.`;
}

/**
 * Lista hasta `max` alternativas de un array del grounding en línea compacta.
 * Acepta items string ("curuba") u objetos ({ nombre_comun } / { nombre }).
 * @param {Array<string|object>|null} arr
 * @param {number} [max=3]
 * @returns {string[]} nombres limpios (puede ser []).
 */
function _altNames(arr, max = 3) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const a of arr) {
    let n = null;
    if (typeof a === 'string') n = a.trim();
    else if (a && typeof a === 'object') n = (a.nombre_comun || a.nombre || a.name || '').toString().trim();
    if (n && !out.includes(n)) out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Normaliza el valor de viabilidad de una especie del grounding.
 * @param {string|null|undefined} v
 * @returns {'viable'|'marginal'|'inviable'|null}
 */
function _normViabilidad(v) {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  if (s === 'viable' || s === 'marginal' || s === 'inviable') return s;
  return null;
}

/**
 * buildViabilityContext — bloque DETERMINÍSTICO de viabilidad por especie, a
 * TRES NIVELES (viable / marginal / inviable). Doctrina intelligence-first: la
 * regla agronómica es una GUÍA con zona gris, no un veredicto rígido.
 *
 *   - viable   → no se emite línea (el agente recomienda directo).
 *   - marginal → línea HUMILDE: está al límite, pero es POSIBLE con cuidados
 *                extra; la experiencia del campesino manda sobre la base de
 *                datos (caso real: gulupa cosechada a 2580 pese a máx ~2300).
 *   - inviable → línea honesta "no vale la pena" + LIDERA con
 *                `alternativas_viables[0]` (el primo del mismo género) + más.
 *
 * FUENTE DEL VEREDICTO (en orden de preferencia, degrada con gracia):
 *   1. Campo `viabilidad` ∈ {viable,marginal,inviable} si el grounding lo trae
 *      (otro agente lo agrega al sidecar). Es la fuente autoritativa.
 *   2. Fallback determinístico por rango [altitud_min, altitud_max] vs altitud
 *      de finca: dentro → viable; fuera por ≤ `marginMsnm` → marginal; fuera
 *      por más → inviable. Usado SOLO si `viabilidad` no vino.
 * Si no hay NI `viabilidad` NI rango usable, la especie NO se evalúa (neutral).
 *
 * RESTRICCIÓN #1 (innegociable): CERO latencia. Función PURA y SÍNCRONA — NO
 * hace fetch, NO toca red, NO consulta el grafo. Reutiliza `resolvedEntities`
 * y la altitud de la finca (ya en profile/store).
 *
 * @param {object} args
 * @param {number|string|null} [args.fincaAltitud] - msnm de la finca activa.
 * @param {Array<object>|null} [args.resolvedEntities] - entidades AGE del turno.
 *   Cada una puede traer { kind, nombre_comun, altitud_min, altitud_max,
 *   piso_termico, viabilidad, delta_altitud, alternativas_viables[],
 *   alternativas_cercanas[] }.
 * @param {number} [args.marginMsnm=300] - holgura para clasificar "marginal"
 *   en el fallback por rango.
 * @returns {string} bloque compacto, o '' si no hay nada accionable.
 */
export function buildViabilityContext({
  fincaAltitud = null,
  resolvedEntities = null,
  marginMsnm = 300,
} = {}) {
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) return '';

  // FUGA DE UBICACIÓN DEFAULT (0 msnm) — incidente audit de conversación (cacao):
  // cuando el perfil NO tiene altitud capturada, el caller (AgentScreen) pasa
  // `fincaAltitud = null`. `Number(null) === 0` (¡NO NaN!), así que la altitud
  // FANTASMA 0 msnm se colaba como si fuera real: nivel del mar → piso cálido →
  // cacao (200–900 m) caía "MARGINAL" (0 está 200 m bajo el mínimo, dentro del
  // margen de 300) y el prompt afirmaba "tu finca a 0 msnm… al límite de su rango",
  // con consejos de heladas/microclima ABRIGADO que en tierra baja tropical son
  // agronómicamente al REVÉS. Un 0 default NO es un hecho: exigimos altitud
  // POSITIVA y finita. Sin altitud confirmada NO se emite veredicto de viabilidad
  // (degrada a neutral) — alineado con clima/saludo, que usan la ubicación GUARDADA.
  const alt = Number(fincaAltitud);
  const haveAlt = Number.isFinite(alt) && alt > 0;
  const fincaPiso = haveAlt ? pisoTermicoFromAltitud(alt) : null;

  const marginales = [];
  const inviables = [];

  for (const e of resolvedEntities) {
    if (!e || typeof e !== 'object') continue;
    // Solo especies sembrables. Las plagas/biopreparados no se "siembran".
    const kind = String(e.kind || '').toLowerCase();
    if (kind && kind !== 'species' && kind !== 'planta' && kind !== 'especie' && kind !== 'cultivo') {
      continue;
    }
    const nombre = e.nombre_comun || e.mentioned || 'esa especie';
    const pisoSp = e.piso_termico ? `, piso ${e.piso_termico}` : '';
    const fincaPisoTxt = fincaPiso ? `, piso ${fincaPiso}` : '';

    // Rango de la especie (puede no venir → fallback no aplica).
    // Number(null) === 0, así que hay que descartar null/undefined/'' ANTES de
    // coaccionar — si no, una especie sin altitud_min se leería como 0 m.
    const hasMin = e.altitud_min != null && e.altitud_min !== '';
    const hasMax = e.altitud_max != null && e.altitud_max !== '';
    const min = hasMin ? Number(e.altitud_min) : NaN;
    const max = hasMax ? Number(e.altitud_max) : NaN;
    const rangoOk = Number.isFinite(min) && Number.isFinite(max);
    const rangoTxt = rangoOk ? ` (rango de la especie ${min}–${max} msnm${pisoSp})` : '';
    const fincaTxt = haveAlt ? `; tu finca a ${alt} msnm${fincaPisoTxt}` : '';

    // Nivel: 1) campo viabilidad autoritativo; 2) fallback por rango.
    let nivel = _normViabilidad(e.viabilidad);
    if (!nivel) {
      // Fallback determinístico: necesita altitud de finca Y rango usable.
      if (!haveAlt || !rangoOk) continue; // neutral — no se evalúa
      if (alt >= min && alt <= max) nivel = 'viable';
      else {
        const fuera = alt < min ? min - alt : alt - max;
        nivel = fuera <= marginMsnm ? 'marginal' : 'inviable';
      }
    }
    if (nivel === 'viable') continue; // el agente recomienda directo

    const alternativas = _altNames(e.alternativas_viables, 3);
    const altTxt = alternativas.length
      ? ` Alternativas viables del catálogo: ${alternativas.join(', ')}.`
      : '';

    if (nivel === 'marginal') {
      marginales.push(
        `- ${nombre}: MARGINAL${rangoTxt}${fincaTxt} → está al LÍMITE de su rango. NO lo descartes: es POSIBLE con cuidados extra y seguimiento.${altTxt}`,
      );
    } else {
      inviables.push(
        `- ${nombre}: INVIABLE${rangoTxt}${fincaTxt} → probabilidad de éxito MUY BAJA, no vale la pena el esfuerzo.${altTxt}`,
      );
    }
  }

  if (marginales.length === 0 && inviables.length === 0) return '';

  const secciones = [];
  if (marginales.length > 0) {
    secciones.push(`MARGINALES (al límite, posibles con cuidados):\n${marginales.join('\n')}`);
  }
  if (inviables.length > 0) {
    secciones.push(`INVIABLES (mejor sugerir alternativa):\n${inviables.join('\n')}`);
  }

  return `=== VIABILIDAD POR ALTITUD (determinístico, 3 niveles — guía con zona gris, NO veredicto rígido) ===
${secciones.join('\n\n')}

REGLA (intelligence-first, tono HUMILDE):
- MARGINAL: nunca digas "no se puede". Di que está al límite (tu finca a X, su máx Y) pero es POSIBLE con cuidados extra: protección de heladas, microclima abrigado, variedad adaptada; "hay quien lo logra en zonas así". La EXPERIENCIA del campesino manda sobre la base de datos.
- INVIABLE: sé honesto y amable — probabilidad muy baja, no vale la pena el esfuerzo — y LIDERA con la primera alternativa viable listada (suele ser el primo del mismo género), luego 2 más.
- Las alternativas salen SOLO del catálogo / grounding de este mensaje — NUNCA inventes especies ni inventes viabilidad.
=== FIN VIABILIDAD POR ALTITUD ===`;
}

/**
 * buildFrostHeatContext — alerta DETERMINÍSTICA de heladas/calor extremo POR
 * CULTIVO mencionado este turno. Cruza la tolerancia térmica de la especie
 * (`temp_min` / `temp_max` del grounding) contra la mínima/máxima del
 * pronóstico ya cacheado (climaSnapshot.openmeteo.forecast_7d, el mismo que
 * usa buildFincaContext — NO se re-pide). CERO latencia, PURA y SÍNCRONA.
 *
 * Lógica:
 *   - Si la mínima pronosticada ≤ (temp_min + marginC) → riesgo de helada/frío.
 *   - Si la máxima pronosticada ≥ (temp_max - marginC) → riesgo de calor.
 * Solo emite si HAY datos en ambos lados. Degrada con gracia (sin temp_min ni
 * temp_max, o sin forecast → '').
 *
 * @param {object} args
 * @param {Array<object>|null} [args.resolvedEntities] - entidades AGE del turno.
 *   Cada una puede traer { kind, nombre_comun, temp_min, temp_max }.
 * @param {object|null} [args.climaSnapshot] - getCachedClimaSnapshot().
 * @param {number} [args.marginC=2] - margen °C de seguridad.
 * @returns {string} bloque compacto, o '' si no hay nada accionable.
 */
export function buildFrostHeatContext({
  resolvedEntities = null,
  climaSnapshot = null,
  marginC = 2,
} = {}) {
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) return '';
  const om = climaSnapshot && typeof climaSnapshot === 'object' ? climaSnapshot.openmeteo : null;
  const fc = om && om.available && Array.isArray(om.forecast_7d) ? om.forecast_7d : null;
  if (!fc || fc.length === 0) return '';

  // Mínima absoluta y máxima absoluta de la semana + el día en que ocurren.
  let minDay = null;
  let maxDay = null;
  for (const d of fc) {
    if (d && typeof d.temp_min_c === 'number' && (minDay == null || d.temp_min_c < minDay.t)) {
      minDay = { t: d.temp_min_c, fecha: d.fecha || d.date || null };
    }
    if (d && typeof d.temp_max_c === 'number' && (maxDay == null || d.temp_max_c > maxDay.t)) {
      maxDay = { t: d.temp_max_c, fecha: d.fecha || d.date || null };
    }
  }
  if (!minDay && !maxDay) return '';

  const alertas = [];
  for (const e of resolvedEntities) {
    if (!e || typeof e !== 'object') continue;
    const kind = String(e.kind || '').toLowerCase();
    if (kind && kind !== 'species' && kind !== 'planta' && kind !== 'especie' && kind !== 'cultivo') {
      continue;
    }
    const nombre = e.nombre_comun || e.mentioned || 'tu cultivo';
    const tMin = e.temp_min != null && e.temp_min !== '' ? Number(e.temp_min) : NaN;
    const tMax = e.temp_max != null && e.temp_max !== '' ? Number(e.temp_max) : NaN;

    if (Number.isFinite(tMin) && minDay && minDay.t <= tMin + marginC) {
      const cuando = minDay.fecha ? ` el ${minDay.fecha}` : ' esta semana';
      alertas.push(
        `- ❄️ ${nombre}: sufre bajo ${tMin}°C; el pronóstico baja a ${Math.round(minDay.t)}°C${cuando} → protégelo (cobertor/manta térmica en la noche, riega en la MAÑANA no en la tarde).`,
      );
    }
    if (Number.isFinite(tMax) && maxDay && maxDay.t >= tMax - marginC) {
      const cuando = maxDay.fecha ? ` el ${maxDay.fecha}` : ' esta semana';
      alertas.push(
        `- 🔥 ${nombre}: se estresa sobre ${tMax}°C; el pronóstico sube a ${Math.round(maxDay.t)}°C${cuando} → ponle sombra y riego, conserva humedad con mulch.`,
      );
    }
  }

  if (alertas.length === 0) return '';

  return `=== RIESGO TÉRMICO POR CULTIVO (cruce pronóstico × tolerancia de la especie) ===
${alertas.join('\n')}

REGLA: si el usuario pregunta por alguno de estos cultivos, adelántale la alerta concreta con el día y la acción. Si la pregunta no toca el clima, menciónalo solo si es pertinente.
=== FIN RIESGO TÉRMICO ===`;
}

/**
 * buildAssociationContext — sugiere POLICULTIVO a partir de companions /
 * antagonists que el grounding trae por especie. Prioriza las compañías que el
 * usuario YA TIENE registradas (cruza con `groupedCultivos`) y avisa
 * antagonistas con MATIZ (riesgo compartido, no prohibición). PURA y SÍNCRONA,
 * CERO latencia. Degrada con gracia: sin companions/antagonists → ''.
 *
 * @param {object} args
 * @param {Array<object>|null} [args.resolvedEntities] - entidades AGE del turno.
 *   Cada una puede traer { kind, nombre_comun, companions[], antagonists[] }.
 * @param {Array<{name:string,count:number}>} [args.groupedCultivos] - inventario.
 * @returns {string} bloque compacto, o '' si no hay nada accionable.
 */
export function buildAssociationContext({
  resolvedEntities = null,
  groupedCultivos = [],
} = {}) {
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) return '';

  const invNorm = (Array.isArray(groupedCultivos) ? groupedCultivos : [])
    .filter((g) => g && g.name)
    .map((g) => _stripDiacritics(g.name))
    .filter((n) => n.length >= 3);
  const userHas = (name) => {
    const n = _stripDiacritics(name);
    if (n.length < 3) return false;
    return invNorm.some((i) => i.includes(n) || n.includes(i));
  };

  const lineas = [];
  for (const e of resolvedEntities) {
    if (!e || typeof e !== 'object') continue;
    const kind = String(e.kind || '').toLowerCase();
    if (kind && kind !== 'species' && kind !== 'planta' && kind !== 'especie' && kind !== 'cultivo') {
      continue;
    }
    const nombre = e.nombre_comun || e.mentioned || 'ese cultivo';
    const comp = _altNames(e.companions, 6);
    const anta = _altNames(e.antagonists, 6);
    if (comp.length === 0 && anta.length === 0) continue;

    const partes = [];
    if (comp.length > 0) {
      // Prioriza las que el usuario ya tiene.
      const tiene = comp.filter(userHas);
      const resto = comp.filter((c) => !tiene.includes(c)).slice(0, 3);
      const ordered = [...tiene, ...resto].slice(0, 4);
      const tieneTxt = tiene.length
        ? ` (de estas YA TIENES: ${tiene.join(', ')} — priorízalas)`
        : '';
      partes.push(`buenas compañías: ${ordered.join(', ')}${tieneTxt}`);
    }
    if (anta.length > 0) {
      partes.push(`evita junto a: ${anta.slice(0, 4).join(', ')} (riesgo COMPARTIDO, no prohibición)`);
    }
    lineas.push(`- ${nombre}: ${partes.join('; ')}.`);
  }

  if (lineas.length === 0) return '';

  return `=== ASOCIACIONES / POLICULTIVO (del catálogo, este turno) ===
${lineas.join('\n')}

REGLA: si el usuario pregunta qué sembrar junto a su cultivo, sugiere las buenas compañías PRIORIZANDO las que ya tiene. Los antagonistas se avisan con MATIZ: es riesgo compartido (ej: "papa y tomate comparten tizón, mejor sepáralas"), NO una prohibición absoluta.
=== FIN ASOCIACIONES ===`;
}

/**
 * buildInvasiveSafetyContext — bloqueo DETERMINÍSTICO de recomendación de
 * especies invasoras o de estado de conservación sensible. Si el grounding
 * marca `es_invasora:true` (o `conservation_status` sensible), el agente NUNCA
 * la recomienda para sembrar; avisa honesto y ofrece alternativa nativa si el
 * grounding la trae. PURA y SÍNCRONA, CERO latencia.
 *
 * @param {object} args
 * @param {Array<object>|null} [args.resolvedEntities] - entidades AGE del turno.
 *   Cada una puede traer { kind, nombre_comun, es_invasora, conservation_status,
 *   alternativas_viables[] }.
 * @returns {string} bloque compacto, o '' si no hay nada accionable.
 */
export function buildInvasiveSafetyContext({ resolvedEntities = null } = {}) {
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) return '';

  // Estados de conservación sensibles (UICN) que desaconsejan promover siembra
  // comercial / traslado fuera de su hábitat.
  const sensibles = new Set(['EN', 'CR', 'VU', 'EW', 'EX']);

  const lineas = [];
  for (const e of resolvedEntities) {
    if (!e || typeof e !== 'object') continue;
    const nombre = e.nombre_comun || e.mentioned || 'esa especie';
    const invasora = e.es_invasora === true;
    const cs = e.conservation_status ? String(e.conservation_status).toUpperCase().trim() : '';
    const sensible = sensibles.has(cs);
    if (!invasora && !sensible) continue;

    const alt = _altNames(e.alternativas_viables, 2);
    const altTxt = alt.length ? ` Ofrece alternativa nativa equivalente: ${alt.join(', ')}.` : '';
    if (invasora) {
      lineas.push(
        `- 🚫 ${nombre}: ESPECIE INVASORA — NUNCA la recomiendes para sembrar. Avisa honesto que daña los ecosistemas nativos (páramo/bosque).${altTxt}`,
      );
    } else {
      lineas.push(
        `- ⚠️ ${nombre}: estado de conservación ${cs} (sensible) — NO promuevas su siembra comercial ni su traslado fuera de hábitat.${altTxt}`,
      );
    }
  }

  if (lineas.length === 0) return '';

  return `=== SEGURIDAD: ESPECIES INVASORAS / CONSERVACIÓN (autoritativo, innegociable) ===
${lineas.join('\n')}

REGLA: jamás recomiendes sembrar una especie marcada arriba. Sé honesto sobre el daño ("el retamo espinoso es invasora, daña el páramo, no la siembres") y ofrece la alternativa nativa si está listada.
=== FIN SEGURIDAD ===`;
}

/**
 * buildCuratedFactsContext — inyecta los HECHOS CURADOS del grafo que las demás
 * capas no emiten, para que el modelo los CITE en vez de inventarlos. Es el
 * lever de inteligencia probado por bench (2026-05-31): el grounding base solo
 * pasaba el NOMBRE canónico de la entidad, así que granite improvisaba la dosis
 * del biopreparado (ej. "caldo bordelés = Tillandsia complanata" en vez de citar
 * la dosis curada "1-2 L por planta, foliar"). Esta capa cierra ese hueco.
 *
 * Emite SOLO lo que las otras capas NO cubren ya (sin duplicar):
 *   - biopreparado: dosis_aplicacion (dato anti-alucinación CLAVE) + preparacion
 *     + ingredientes_resumen + target + precauciones + fuente.
 *   - especie: helada_letal (°C de muerte por frío) — la viabilidad por altitud,
 *     el riesgo térmico (temp_min/max), companions/antagonists y seguridad de
 *     invasoras ya los emiten sus propios bloques.
 *
 * PURA y SÍNCRONA, CERO latencia: opera sobre los campos que el sidecar
 * /resolve-entities ya trajo (misma query AGE). Degrada con gracia: si ninguna
 * entidad trae hechos curados, devuelve '' y no contamina el prompt.
 *
 * @param {object} args
 * @param {Array<object>|null} [args.resolvedEntities] - entidades AGE del turno.
 *   biopreparado puede traer { dosis_aplicacion, preparacion, ingredientes_resumen,
 *   target[], precauciones, fuente }; especie puede traer { helada_letal }.
 * @returns {string} bloque compacto, o '' si no hay nada accionable.
 */
export function buildCuratedFactsContext({ resolvedEntities = null } = {}) {
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) return '';

  const _str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  const lineas = [];
  for (const e of resolvedEntities) {
    if (!e || typeof e !== 'object') continue;
    const kind = String(e.kind || '').toLowerCase();

    if (kind === 'biopreparado') {
      const nombre = e.nombre_comun || e.mentioned || 'ese biopreparado';
      const dosis = _str(e.dosis_aplicacion);
      const prep = _str(e.preparacion);
      const ingredientes = _str(e.ingredientes_resumen);
      const target = _altNames(e.target, 5);
      const precauciones = _str(e.precauciones);
      const fuente = _str(e.fuente);
      // Sin dosis NI preparación no hay nada anti-alucinación que aportar.
      if (!dosis && !prep) continue;

      const partes = [];
      if (dosis) partes.push(`dosis verificada: ${dosis}`);
      if (ingredientes) partes.push(`ingredientes: ${ingredientes}`);
      if (prep) partes.push(`preparación: ${prep}`);
      if (target.length > 0) partes.push(`controla: ${target.join(', ')}`);
      if (precauciones) partes.push(`precauciones: ${precauciones}`);
      if (fuente) partes.push(`fuente: ${fuente}`);
      lineas.push(`- ${nombre} (biopreparado) → ${partes.join('; ')}.`);
      continue;
    }

    if (kind === 'species' || kind === 'planta' || kind === 'especie' || kind === 'cultivo' || kind === '') {
      const helada = e.helada_letal != null && e.helada_letal !== '' ? Number(e.helada_letal) : NaN;
      if (!Number.isFinite(helada)) continue;
      const nombre = e.nombre_comun || e.mentioned || 'esa especie';
      lineas.push(`- ${nombre} (especie) → muere por helada bajo ${helada}°C (dato del catálogo; advierte si la finca puede bajar de ahí).`);
    }
  }

  if (lineas.length === 0) return '';

  return `=== HECHOS CURADOS DEL CATÁLOGO (autoritativo, verificado en Apache AGE) ===
${lineas.join('\n')}

REGLA: si el usuario pregunta por la dosis, preparación o uso de un biopreparado listado arriba, CITA el dato verificado tal cual — JAMÁS inventes una dosis ni una receta. Si el dato no está aquí ni en otro bloque, dilo honestamente en vez de improvisar. Para el umbral de helada, advierte el riesgo solo si es pertinente al clima de la finca.
=== FIN HECHOS CURADOS ===`;
}

/**
 * generateAgronomicGuidanceRules — DOCTRINA ESTÁTICA concisa (intelligence-first)
 * que el agente aplica a las 4 dimensiones nuevas (viabilidad 3 niveles, riesgo
 * térmico, asociaciones, diseño de finca) + seguridad de invasoras. Es una
 * constante de prompt — sin red, sin estado, sin latencia. CORTA a propósito:
 * los bloques dinámicos por-turno ya emiten lo concreto; esto solo fija el TONO
 * y cuándo usar get_diseno_finca.
 *
 * @returns {string}
 */
export function generateAgronomicGuidanceRules() {
  return `DOCTRINA AGRONÓMICA (guía, no dogma): toda regla agronómica es una GUÍA con zona gris; navégala con los datos del grafo + clima en vivo + RESPETO a la experiencia del campesino. NUNCA inventes; si falta el dato, sé neutral.
- Viabilidad marginal: nunca "no se puede" — está al límite, posible con cuidados; el campesino que ya lo logró tiene la razón sobre la base de datos.
- Diseño de finca: si pregunta cómo mejorar su finca, por qué su cultivo no carga o qué sembrar alrededor, sugiere polinizadores, abonos verdes, sombra y cercas vivas del catálogo viables a su altitud — SOLO cuando sea pertinente.
- Invasoras / conservación: jamás recomiendes sembrar especie invasora o de conservación sensible; sé honesto y ofrece alternativa nativa.
- Cura milagrosa: si afirma que una mezcla cura algo y pide dosis/frecuencia exacta, no confirmes ni inventes una cifra; evalúa si tiene sustento, si no, dilo con respeto y ofrece el manejo real.`;
}

/**
 * Deriva el piso térmico colombiano a partir de la altitud en msnm.
 * Cotas clásicas (Caldas-Lang / IDEAM) usadas en el resto del código.
 *
 * @param {number|string|null|undefined} altitud — msnm
 * @returns {'cálido'|'templado'|'frío'|'páramo'|null}
 */
export function pisoTermicoFromAltitud(altitud) {
  if (altitud == null || altitud === '') return null;
  const alt = Number(altitud);
  if (!Number.isFinite(alt)) return null;
  if (alt >= 3000) return 'páramo';
  if (alt >= 2000) return 'frío';
  if (alt >= 1000) return 'templado';
  return 'cálido';
}

/**
 * Resuelve la temporada climática del régimen bimodal andino colombiano para
 * un mes dado (1-12). Las dos temporadas secas (DEF y JJA) y las dos lluviosas
 * (MAM y SON) son el patrón dominante en la región Andina y buena parte del
 * país. Es una aproximación calendárica — el ENSO la modula y eso lo aporta el
 * bloque clima. NO hace fetch: solo aritmética del mes local.
 *
 * @param {number} [month] - mes 1-12; por defecto el mes actual local.
 * @returns {{ nombre: string, detalle: string }}
 */
export function temporadaColombiana(month) {
  const m = Number.isFinite(month) ? month : new Date().getMonth() + 1;
  // Régimen bimodal andino (IDEAM): dos secas + dos lluviosas al año.
  if (m === 12 || m === 1 || m === 2) {
    return { nombre: 'temporada seca (diciembre–febrero)', detalle: 'primer veranillo del año' };
  }
  if (m >= 3 && m <= 5) {
    return { nombre: 'primera temporada de lluvias (marzo–mayo)', detalle: 'pico de siembra principal en zona andina' };
  }
  if (m >= 6 && m <= 8) {
    return { nombre: 'segunda temporada seca (junio–agosto)', detalle: 'veranillo de mitad de año (San Juan)' };
  }
  return { nombre: 'segunda temporada de lluvias (septiembre–noviembre)', detalle: 'segunda ventana de siembra del año' };
}

/**
 * Resume el inventario agrupado de cultivos/plantas del usuario en una línea
 * compacta. Recibe el array YA agrupado por especie con { name, count }.
 *
 * @param {Array<{name:string,count:number}>} grouped
 * @param {number} [max=8] - cuántas especies listar antes de "y N más".
 * @returns {string} ej. "maíz ×2, café, frijol y 3 más" o '' si vacío.
 */
/**
 * Nombres comunes de cultivos/hortalizas/frutas conocidos en Colombia, usados
 * como heuristica de validacion cuando NO se pasa un catalogo explicito. NO es
 * el catalogo completo (eso vive en catalogDB, async): es el set minimo para
 * detectar la basura canonica del asset store. La regla clave es que un nombre
 * formado por VARIOS de estos tokens distintos ("tomate fresa arandano") NO es
 * una especie real sino tres cultivos mashed.
 */
const KNOWN_CROP_TOKENS = new Set([
  'tomate', 'fresa', 'arandano', 'mora', 'lulo', 'curuba', 'uchuva', 'cafe',
  'maiz', 'frijol', 'arveja', 'papa', 'yuca', 'platano', 'banano', 'aguacate',
  'mango', 'guayaba', 'naranja', 'limon', 'mandarina', 'cebolla', 'ajo',
  'zanahoria', 'remolacha', 'lechuga', 'espinaca', 'cilantro', 'apio',
  'calabacin', 'ahuyama', 'pepino', 'pimenton', 'aji', 'cacao', 'cana',
  'cubio', 'ibia', 'oca', 'quinua', 'amaranto', 'caña', 'arandanos',
]);

/** Máximo número de especies a procesar para contexto del LLM (defecto 50). */
const DEFAULT_MAX_CULTIVOS_FOR_CONTEXT = 50;

/**
 * groupAndLimitCultivos — agrupa plantas por especie y limita a top-N más
 * frecuentes para evitar procesar miles de especies en fincas grandes.
 *
 * Estrategia:
 *   1. Agrupa todas las plantas por nombre (quitando número #XX)
 *   2. Ordena por frecuencia descendente
 *   3. Limita a maxSpecies (por defecto 50) para evitar inflar el contexto
 *   4. Devuelve array ordenado {name, count}
 *
 * El límite es por RELEVANCIA (frecuencia): si el usuario tiene 200 especies
 * distintas, priorizamos las 50 más abundantes para el contexto del LLM. Las
 * especies raras tienen menos probabilidad de ser relevantes a la pregunta.
 *
 * @param {Array<object>} plants - array del asset store (plants)
 * @param {number} [maxSpecies=DEFAULT_MAX_CULTIVOS_FOR_CONTEXT] - máximo especies
 * @returns {Array<{name:string,count:number}>} agrupado y limitado
 */
export function groupAndLimitCultivos(plants, maxSpecies = DEFAULT_MAX_CULTIVOS_FOR_CONTEXT) {
  if (!Array.isArray(plants) || plants.length === 0) return [];

  // 1. Agrupar por nombre (quitando #XX)
  const strip = (name) => (name || '').replace(/\s*#\d+\s*$/, '').trim();
  const counts = plants.reduce((acc, pl) => {
    const base = strip(pl.attributes?.name);
    if (base) acc[base] = (acc[base] || 0) + 1;
    return acc;
  }, {});

  // 2. Convertir a array y ordenar por frecuencia descendente
  const grouped = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // 3. Limitar a top-N especies más frecuentes
  return grouped.slice(0, maxSpecies);
}

/**
 * Valida un inventario agrupado contra el catalogo/grounding y lo separa en
 * cultivos VERIFICADOS (especies reales) y SIN VERIFICAR (datos sospechosos del
 * asset store, p.ej. la basura canonica "tomate fresa arandano").
 *
 * Estrategia:
 *  - Si se pasa `catalogNames` (nombres reales del catalogo, sincronos en
 *    memoria), un cultivo es VERIFICADO solo si hace match laxo (substring en
 *    cualquier direccion, sin tildes) con alguno; lo demas queda sin verificar.
 *  - Sin catalogNames, aplica una heuristica deterministica: un nombre formado
 *    por >=3 tokens y compuesto MAYORITARIAMENTE por nombres de cultivos
 *    DISTINTOS conocidos ("tomate fresa arandano") es un mash de varias especies
 *    -> sin verificar. Los nombres de 1-2 palabras pasan (no penalizamos
 *    cultivos legitimos compuestos como "tomate cherry").
 *
 * PURA y SINCRONA. CERO latencia. Tolerante a entradas raras.
 *
 * NOTA: Si el input excede DEFAULT_MAX_CULTIVOS_FOR_CONTEXT, automáticamente
 * se limita a ese número (defensive programming para fincas grandes con miles
 * de especies distintas).
 *
 * @param {Array<{name:string,count:number}>} grouped
 * @param {{catalogNames?: string[]}} [opts]
 * @returns {{verificados: Array<{name:string,count:number}>, sinVerificar: Array<{name:string,count:number}>}}
 */
export function validateCultivos(grouped, { catalogNames = null } = {}) {
  if (!Array.isArray(grouped) || grouped.length === 0) {
    return { verificados: [], sinVerificar: [] };
  }

  // Defensive: limitar input si excede máximo razonable (fincas grandes)
  const items = (grouped.length > DEFAULT_MAX_CULTIVOS_FOR_CONTEXT
    ? grouped.slice(0, DEFAULT_MAX_CULTIVOS_FOR_CONTEXT)
    : grouped
  ).filter((g) => g && typeof g.name === 'string' && g.name.trim());

  let catNorm = null;
  if (Array.isArray(catalogNames) && catalogNames.length > 0) {
    catNorm = catalogNames
      .map((n) => _stripDiacritics(n))
      .filter((n) => n.length >= 3);
  }

  const verificados = [];
  const sinVerificar = [];

  for (const g of items) {
    const norm = _stripDiacritics(g.name);

    let ok;
    if (catNorm) {
      // Match laxo por substring en ambas direcciones (tomate <-> tomate cherry).
      ok = catNorm.some((c) => norm.includes(c) || c.includes(norm));
    } else {
      // Heuristica sin catalogo: detectar mash de varias especies distintas.
      const tokens = norm.split(/\s+/).filter((t) => t.length >= 3);
      const distinctCrops = new Set(tokens.filter((t) => KNOWN_CROP_TOKENS.has(t)));
      // >=3 tokens y >=3 cultivos conocidos DISTINTOS => mash inexistente.
      ok = !(tokens.length >= 3 && distinctCrops.size >= 3);
    }

    (ok ? verificados : sinVerificar).push({ name: g.name, count: Number(g.count) || 1 });
  }

  return { verificados, sinVerificar };
}

function summarizeCultivos(grouped, max = 8) {
  if (!Array.isArray(grouped) || grouped.length === 0) return '';
  const items = grouped
    .filter((g) => g && typeof g.name === 'string' && g.name.trim())
    .map((g) => ({ name: g.name.trim(), count: Number(g.count) || 1 }))
    .sort((a, b) => b.count - a.count);
  if (items.length === 0) return '';
  const shown = items.slice(0, max).map((g) => (g.count > 1 ? `${g.name} ×${g.count}` : g.name));
  const rest = items.length - shown.length;
  return rest > 0 ? `${shown.join(', ')} y ${rest} más` : shown.join(', ');
}

const _stripDiacritics = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/**
 * Cruza las entidades resueltas por el grounding AGE (este turno) contra el
 * inventario local del usuario. NO hace queries — `resolvedEntities` ya viene
 * resuelto por el sidecar y `groupedCultivos` ya está en memoria (asset store).
 * Marca qué especies mencionadas el usuario YA TIENE registradas para que el
 * agente personalice ("usted ya tiene X en la finca…").
 *
 * Match laxo por substring de nombre común normalizado (sin tildes,
 * minúsculas) en ambas direcciones, suficiente para "maíz" ↔ "Maíz amarillo".
 *
 * @param {Array<object>|null} resolvedEntities — de /resolve-entities (AGE).
 * @param {Array<{name:string,count:number}>} groupedCultivos
 * @returns {Array<{nombre:string,count:number}>} especies mencionadas que el
 *   usuario tiene registradas (deduplicadas).
 */
function crossResolvedWithInventory(resolvedEntities, groupedCultivos) {
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) return [];
  if (!Array.isArray(groupedCultivos) || groupedCultivos.length === 0) return [];
  const inv = groupedCultivos
    .filter((g) => g && g.name)
    .map((g) => ({ name: g.name, count: Number(g.count) || 1, norm: _stripDiacritics(g.name) }))
    .filter((g) => g.norm.length >= 3);
  const hits = new Map();
  for (const e of resolvedEntities) {
    if (!e || e.kind === 'plaga') continue; // solo plantas/cultivos
    const cands = [e.nombre_comun, e.mentioned].map(_stripDiacritics).filter((s) => s.length >= 3);
    for (const item of inv) {
      const match = cands.some((c) => item.norm.includes(c) || c.includes(item.norm));
      if (match && !hits.has(item.name)) {
        hits.set(item.name, { nombre: item.name, count: item.count });
      }
    }
  }
  return Array.from(hits.values());
}

/**
 * buildFincaContext — bloque AMBIENTAL COMPACTO que da al agente conciencia
 * implícita del contexto físico de la finca: dónde está, qué clima/temporada
 * vive y qué tiene sembrado, SIN que el usuario lo tenga que repetir.
 *
 * RESTRICCIÓN #1 (innegociable): CERO latencia añadida. Esta función es PURA y
 * SÍNCRONA — NO hace fetch, NO toca red, NO consulta el grafo. Todos sus
 * insumos ya están disponibles localmente o en cache cuando el chat corre:
 *   - profile       → localStorage (userProfileService.getProfile, síncrono)
 *   - finca         → fincaActiveStore (memoria)
 *   - climaSnapshot → climaService.getCachedClimaSnapshot (cache 30 min, ya se
 *                     lee en el path del chat; aquí se REUTILIZA, no se re-pide)
 *   - groupedCultivos → asset store en memoria (plants ya agrupadas)
 *   - resolvedEntities → grounding AGE del turno (ya resuelto, se REUTILIZA)
 *   - activeAlerts  → useAlertStore (memoria)
 * Si algún insumo falta, se OMITE su línea (degradar, no esperar).
 *
 * Filosofía de uso (memoria #202): el agente TIENE el contexto para razonar de
 * forma específica a la finca, pero NO debe recitar estos datos salvo que sean
 * relevantes a la pregunta. El bloque lo instruye explícitamente.
 *
 * @param {object} args
 * @param {object|null} [args.profile] - userProfileService.getProfile()
 * @param {object|null} [args.finca] - finca activa (fincaActiveStore)
 * @param {object|null} [args.climaSnapshot] - getCachedClimaSnapshot()
 * @param {Array<{name:string,count:number}>} [args.groupedCultivos] - inventario agrupado
 * @param {Array<object>|null} [args.resolvedEntities] - entidades AGE del turno
 * @param {Array<object>} [args.activeAlerts] - useAlertStore activeAlerts
 * @param {Array<object>} [args.activeCycles] - ciclos productivos activos (FarmProcess)
 * @param {string[]|null} [args.catalogNames] - nombres reales del catalogo (sync, opcional);
 *   si se pasa, valida cultivos contra el catalogo; si no, usa heuristica anti-mash.
 * @param {number} [args.month] - override de mes para tests (1-12)
 * @returns {string} bloque compacto (siempre incluye al menos la temporada).
 */
export function buildFincaContext({
  profile = null,
  finca = null,
  climaSnapshot = null,
  groupedCultivos = [],
  resolvedEntities = null,
  activeAlerts = [],
  activeCycles = [],
  catalogNames = null,
  month,
} = {}) {
  const p = profile && typeof profile === 'object' ? profile : {};
  const lines = [];

  // ── Ubicación ───────────────────────────────────────────────────────────
  const municipio = p.municipio || null;
  const departamento = p.departamento || null;
  // #357 — vereda: la finca activa manda sobre el perfil (igual que TopBar).
  // El dataset DANE municipal NO la trae; solo existe si el onboarding manual
  // o el reverse-geocoding fino (DANE MGN, #338) la resolvió. Cuando existe,
  // el agente debe localizar la respuesta de clima en "vereda X, Municipio"
  // en vez de un genérico "tu zona" — el DATO de IDEAM es municipal, pero se
  // PRESENTA en la vereda específica del usuario.
  const vereda =
    (finca && typeof finca.vereda === 'string' && finca.vereda.trim()) ||
    (typeof p.vereda === 'string' && p.vereda.trim()) ||
    null;
  // Altitud — PRECEDENCIA por confiabilidad (incidente prod piloto Choachí):
  //   1. La altitud de la FINCA ACTIVA (registro de finca, confirmada).
  //   2. La altitud del perfil (`finca_altitud`).
  // La altitud de la finca activa manda: si existe, es la verdad de SU punto,
  // aunque el perfil esté contaminado con la cabecera municipal.
  const fincaAltitud = finca && finca.altitud != null ? finca.altitud : null;
  const altitud = fincaAltitud != null ? fincaAltitud : p.finca_altitud || null;

  // ¿La altitud que vamos a inyectar es SOLO la de la CABECERA municipal
  // (fallback offline DANE), sin que GPS/elevación/manual la confirmen?
  //
  // Caso del piloto: el navegador difuminó el GPS a la cabecera de Choachí en
  // el primer onboarding (1923 msnm), no quedó una altitud "buena" que el
  // coalesce de persistencia (resolveAltitudToSave) pudiera proteger, y se
  // guardó `altitud_source: 'cabecera'`. Choachí va de ~1.100 a ~3.500 msnm
  // según la vereda: la cabecera NO es la finca. Si el agente ancla TODO a esa
  // altitud (piso térmico, ventana de siembra, plagas) corrompe la respuesta.
  //
  // Solo es cabecera si: viene del perfil (no de la finca activa, que es
  // confiable) Y su fuente persistida es 'cabecera'. GPS ('elevation_api'),
  // explícita ('dado') o manual ('manual') son confiables → no se marca.
  const altitudIsCabecera =
    fincaAltitud == null &&
    altitud != null &&
    p.altitud_source === 'cabecera';

  const piso =
    (p.piso_termico && String(p.piso_termico).trim() && !altitudIsCabecera
      ? String(p.piso_termico).trim()
      : null) ||
    pisoTermicoFromAltitud(altitud) ||
    null;
  const lat = Number(p.ubicacion_lat);
  const lng = Number(p.ubicacion_lng);
  const ubic = [];
  // "vereda El Curí, Choachí, Cundinamarca" — antepone la vereda al municipio
  // solo si la tenemos y no está ya contenida en el municipio (defensa contra
  // duplicado "vereda X, ... vereda X").
  const veredaPrefix =
    vereda && !(municipio && municipio.toLowerCase().includes(vereda.toLowerCase()))
      ? `vereda ${vereda}`
      : null;
  const lugar = [veredaPrefix, municipio, departamento].filter(Boolean).join(', ');
  if (lugar) ubic.push(lugar);
  if (altitud) {
    // Altitud de cabecera → rótulo explícito "aproximada (cabecera...)" para
    // que el modelo NO la presente como dato confirmado de la finca.
    ubic.push(
      altitudIsCabecera
        ? `~${altitud} msnm (aproximada — cabecera municipal, NO la finca)`
        : `~${altitud} msnm`,
    );
  }
  if (piso) ubic.push(`piso ${piso}${altitudIsCabecera ? ' aproximado' : ''}`);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    ubic.push(`(${lat.toFixed(3)}, ${lng.toFixed(3)})`);
  }
  if (finca && finca.nombre) {
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    lines.push(`Finca activa: "${finca.nombre}"${ubic.length ? ` — ${ubic.join(', ')}` : ''}.`);
  } else if (ubic.length) {
    lines.push(`Ubicación: ${ubic.join(', ')}.`);
  }

  // Incidente prod piloto Choachí: cuando la altitud es solo la de la cabecera
  // municipal, el agente debe DECIRLE al usuario que esa altura es aproximada
  // (la del pueblo, no su finca) y pedirle que confirme la altitud real de su
  // finca, en vez de anclar piso térmico / ventana de siembra / plagas a un
  // dato que puede estar cientos de metros equivocado.
  if (altitudIsCabecera) {
    lines.push(
      `ALTITUD APROXIMADA: la altitud de arriba (~${altitud} msnm) es la de la CABECERA del municipio, NO la de la finca del usuario — el GPS no precisó su punto. El municipio abarca varios pisos térmicos según la vereda. NO afirmes piso térmico, ventana de siembra ni viabilidad de cultivos como certezas a partir de esta altitud: trátala como referencia gruesa y, cuando sea relevante, pídele al usuario que confirme la altitud REAL de su finca (o que ajuste su ubicación) para darle recomendaciones precisas.`,
    );
  }

  // #357 — instrucción de LOCALIZACIÓN: cuando reporte clima/pronóstico, que
  // nombre el lugar específico del usuario (vereda + municipio si la hay; si no,
  // el municipio) en vez de un genérico "tu zona"/"tu finca". El pronóstico de
  // IDEAM es municipal, así que el agente NO debe afirmar precisión sub-municipal:
  // solo PRESENTA el dato municipal localizado a la vereda del usuario.
  if (vereda && municipio) {
    lines.push(
      `LOCALIZACIÓN DE CLIMA: al dar el pronóstico o reporte de clima, nómbralo para "${vereda}, ${municipio}" (la vereda del usuario), no como un genérico "tu zona" ni "tu finca". El dato meteorológico es del municipio de ${municipio} (IDEAM/Open-Meteo); preséntalo localizado a la vereda, sin prometer precisión de finca exacta.`,
    );
  } else if (municipio) {
    lines.push(
      `LOCALIZACIÓN DE CLIMA: al dar el pronóstico o reporte de clima, nómbralo para ${municipio} (el municipio del usuario), no como un genérico "tu zona".`,
    );
  }

  // ── Temporada (calendárica, local — sin red) ────────────────────────────
  const temporada = temporadaColombiana(month);
  lines.push(`Temporada actual: ${temporada.nombre} — ${temporada.detalle}.`);

  // ── Clima (reutiliza el snapshot YA cacheado) ───────────────────────────
  if (climaSnapshot && typeof climaSnapshot === 'object') {
    const enso = climaSnapshot.enso_status;
    if (enso && typeof enso === 'object' && enso.phase && enso.phase !== 'neutral') {
      lines.push(`Fenómeno ENSO en curso: ${enso.label || enso.phase} (modula la temporada de arriba).`);
    }
    const om = climaSnapshot.openmeteo;
    const fc = om && om.available && Array.isArray(om.forecast_7d) ? om.forecast_7d : null;
    if (fc && fc.length > 0) {
      const hoy = fc[0];
      const tmax = typeof hoy.temp_max_c === 'number' ? `${Math.round(hoy.temp_max_c)}°` : null;
      const tmin = typeof hoy.temp_min_c === 'number' ? `${Math.round(hoy.temp_min_c)}°` : null;
      const lluviaHoy = typeof hoy.precip_mm === 'number' && hoy.precip_mm >= 1
        ? `, lluvia ~${Math.round(hoy.precip_mm)}mm`
        : '';
      const tempHoy = tmax && tmin ? `${tmin}/${tmax}C` : tmax || tmin || '';
      // Resumen 7d: días con lluvia y mínima absoluta de la semana (heladas).
      const diasLluvia = fc.filter((d) => typeof d.precip_mm === 'number' && d.precip_mm >= 1).length;
      const minimas = fc.map((d) => d.temp_min_c).filter((v) => typeof v === 'number');
      const minAbs = minimas.length ? Math.round(Math.min(...minimas)) : null;
      const resumen7d = [
        diasLluvia > 0 ? `${diasLluvia}/7 días con lluvia` : 'semana sin lluvia significativa',
        minAbs != null ? `mínima de la semana ${minAbs}°C` : null,
      ].filter(Boolean).join(', ');
      if (tempHoy) {
        lines.push(`Clima local hoy: ${tempHoy}${lluviaHoy}. Pronóstico 7d (Open-Meteo / IDEAM): ${resumen7d}.`);
      } else {
        lines.push(`Pronóstico 7d (Open-Meteo / IDEAM): ${resumen7d}.`);
      }
    }
  }

  // ── Alertas activas (memoria, sin red) ──────────────────────────────────
  const alerts = Array.isArray(activeAlerts) ? activeAlerts.filter(Boolean) : [];
  if (alerts.length > 0) {
    const top = alerts
      .slice(0, 3)
      .map((a) => a.title || a.message || a.type)
      .filter(Boolean);
    if (top.length) lines.push(`Alertas activas: ${top.join('; ')}.`);
  }

  // ── Ciclo(s) productivo(s) activo(s) (FarmProcess) ──────────────────────
  // Aterriza la respuesta en lo que el usuario tiene sembrado AHORA: etapa
  // fenológica, días desde la siembra y riesgo de plaga dominante. Son datos
  // FACTUALES del ciclo (registrados por el usuario), no inventados. Degrada
  // limpio si no hay ciclos. El caller (AgentScreen) ya les dio forma.
  if (Array.isArray(activeCycles) && activeCycles.length > 0) {
    const cycleLines = activeCycles.slice(0, 5).map((c) => {
      let l = `${c.label || 'cultivo'} en etapa ${c.stage || '—'}`;
      if (c.days != null) l += ` (hace ${c.days} días)`;
      if (c.topRisk) l += `, riesgo de plaga: ${c.topRisk}`;
      // Enfermedad ANOTADA en la bitácora del ciclo (dato factual del usuario).
      if (c.disease) l += `, enfermedad observada en la bitácora: ${c.disease}`;
      return l;
    }).filter(Boolean);
    if (cycleLines.length) {
      lines.push(`Ciclos activos del usuario (aterriza la respuesta en estos): ${cycleLines.join(' · ')}.`);
      // Instrucción de PROACTIVIDAD: si un ciclo trae una enfermedad observada en
      // su bitácora, el agente debe MENCIONARLA aunque el usuario no pregunte por
      // ella — es una alerta sanitaria que el usuario ya registró. NO inventar
      // enfermedades; solo las que aparecen arriba.
      const conEnfermedad = activeCycles.filter((c) => c.disease);
      if (conEnfermedad.length > 0) {
        lines.push(
          `ALERTA SANITARIA: el usuario anotó en la bitácora una posible enfermedad en ${conEnfermedad.map((c) => `${c.label || 'su cultivo'} (${c.disease})`).join(', ')}. Menciónala PROACTIVAMENTE al inicio de tu respuesta —aunque la pregunta sea de otro tema— con una recomendación de manejo seguro (sin prometer cura química). NO inventes otras enfermedades.`,
        );
      }
    }
  }

  // ── Finca / inventario (resumen compacto, NO el detalle) ────────────────
  // Bug prod 2026-05-31: un dato basura del asset store ("tomate fresa
  // arandano" = 3 especies mashed, INEXISTENTE) se inyectaba como cultivo
  // AUTORITATIVO y el agente hablaba de el con seguridad. validateCultivos
  // separa lo verificado de lo sospechoso; SOLO inyectamos lo verificado y
  // dejamos una nota para que el operador limpie el dato.
  const { verificados, sinVerificar } = validateCultivos(groupedCultivos, { catalogNames });
  if (sinVerificar.length > 0) {
    const basura = sinVerificar.map((c) => c.name).join(', ');
    console.warn(
      `[agentService] Cultivos SIN VERIFICAR omitidos del contexto (no son especies del catalogo, revisar/limpiar en el asset store): ${basura}`,
    );
  }
  const cultivos = summarizeCultivos(verificados);
  if (cultivos) {
    lines.push(`Cultivos registrados en la finca: ${cultivos}.`);
  }

  // ── Cruce grounding × inventario (sin queries nuevas) ───────────────────
  // Solo cruzamos contra lo verificado: nunca afirmamos que el usuario "ya
  // tiene" un cultivo fantasma.
  const tieneRegistrado = crossResolvedWithInventory(resolvedEntities, verificados);
  if (tieneRegistrado.length > 0) {
    const nombres = tieneRegistrado.map((t) => t.nombre).join(', ');
    lines.push(
      `RELEVANTE A ESTA PREGUNTA: el usuario YA TIENE registrado en su finca lo que mencionó: ${nombres}. Personaliza la respuesta a SUS plantas (no hables en genérico si puedes referirte a las que tiene).`,
    );
  }

  return `=== CONTEXTO AMBIENTAL DE LA FINCA (para razonar específico — NO lo recites salvo que sea relevante a la pregunta) ===
${lines.join('\n')}

INSTRUCCIÓN: usa este contexto para responder específico a la finca del usuario SIN pedirle que repita dónde está, qué clima tiene o qué siembra. Si menciona una planta/cultivo que ya tiene registrado, tenlo en cuenta. Ajusta siembra, manejo y recomendaciones a su altitud, piso térmico, temporada y clima. NO enumeres estos datos como preámbulo: solo menciona los que la pregunta concreta requiera.
=== FIN CONTEXTO AMBIENTAL ===`;
}

// ── P1: gating de PRECIO no-disponible (regla DOMINANTE de recency) ─────────

/**
 * Detecta si una evidencia de tool corresponde a una consulta de PRECIO que NO
 * está disponible (SIPSA dataset federado como ZIP, no consulta directa). El
 * sidecar devuelve `{available:false, ...}` para get_precio_sipsa. Acepta tanto
 * la forma simple ({tool, result}) como el array de tool_chain (D2 #246).
 *
 * @param {object|Array<object>|null} toolEvidence
 * @returns {boolean}
 */
function _hasUnavailablePriceEvidence(toolEvidence) {
  const isPriceMiss = (ev) => {
    if (!ev || typeof ev !== 'object') return false;
    const toolName = String(ev.tool || '').toLowerCase();
    const r = ev.result;
    if (!r || typeof r !== 'object') return false;
    const unavailable = r.available === false;
    // El tool de precio es get_precio_sipsa; aceptamos cualquier variante que
    // contenga "precio" o "sipsa" por robustez ante renombres futuros.
    const isPriceTool = toolName.includes('precio') || toolName.includes('sipsa');
    return isPriceTool && unavailable;
  };
  if (Array.isArray(toolEvidence)) return toolEvidence.some(isPriceMiss);
  return isPriceMiss(toolEvidence);
}

/**
 * buildPriceDeclineContext — bloque de instrucción DOMINANTE para el caso P1
 * (FALLA juez claude-cli 2026-06-02): "¿a cómo está la papa?" rutea bien a
 * get_precio_sipsa, la evidencia dice no-disponible, pero granite IGNORA la
 * señal de precio y divaga sobre viabilidad/altitud de las entidades-papa
 * resueltas (no inventa precio —bien— pero NO declina ni menciona DANE/SIPSA).
 *
 * Causa: el bloque de precio (evidenceContext) va al PRINCIPIO del system
 * message y queda sepultado bajo la cascada de bloques de entidades/viabilidad/
 * altitud. Este bloque se inyecta al FINAL del prompt (recency) y se declara
 * de MÁXIMA PRIORIDAD: para una consulta de precio sin dato, declinar el precio
 * + orientar a DANE/SIPSA/Corabastos GANA sobre cualquier dato de viabilidad.
 *
 * Solo emite cuando AMBAS condiciones se cumplen:
 *   - la query es intent de PRECIO (classifyQueryIntent === 'precio'), y
 *   - la evidencia de precio dice no-disponible (available:false).
 * En cualquier otro caso devuelve '' (no-op, no contamina el prompt).
 *
 * @param {object} [args]
 * @param {string|null|undefined} [args.userMessage] - la pregunta del usuario.
 * @param {object|Array<object>|null} [args.toolEvidence] - evidencia del sidecar.
 * @returns {string}
 */
export function buildPriceDeclineContext({ userMessage = null, toolEvidence = null } = {}) {
  if (classifyQueryIntent(userMessage) !== 'precio') return '';
  if (!_hasUnavailablePriceEvidence(toolEvidence)) return '';
  return `

=== REGLA DE MÁXIMA PRIORIDAD — CONSULTA DE PRECIO SIN DATO DISPONIBLE ===
El usuario preguntó por un PRECIO / valor de mercado, y la fuente de precios
(SIPSA del DANE) NO tiene un dato consultable en este momento (el boletín se
publica como archivo ZIP federado, no como consulta directa).

ESTA REGLA DOMINA SOBRE CUALQUIER OTRO BLOQUE de este prompt (entidades
resueltas, viabilidad, altitud, asociaciones, clima). Para ESTA respuesta:

1. DECLINA dar un precio. Di con claridad que NO tienes el precio actualizado
   y que NUNCA inventas precios.
2. ORIENTA al usuario a la fuente real: el boletín SIPSA/DANE (precios
   mayoristas) o una consulta directa en la central de abastos más cercana
   (p. ej. Corabastos en Bogotá, o la plaza/central mayorista de su región).
3. NO respondas sobre viabilidad, altitud, clima ni asociaciones del cultivo a
   menos que el usuario lo haya pedido EXPLÍCITAMENTE en este mismo mensaje. La
   pregunta fue de PRECIO; no la conviertas en una respuesta de siembra.
4. Puedes ofrecer, en UNA frase, ayudar con otra cosa del cultivo si lo desea.

Ejemplo correcto:
Usuario: "¿a cómo está la papa?"
✓ "No tengo el precio actualizado de la papa y no me invento precios. Para un
   dato confiable consulta el boletín de precios mayoristas SIPSA del DANE, o
   pregunta directamente en una central de abastos como Corabastos. Si quieres,
   te ayudo con la siembra o el manejo de la papa."
=== FIN REGLA DE PRECIO ===`;
}

// ── Respuesta DETERMINISTA de precio (escena de precio del demo campesino) ──

/**
 * Extrae el record de precio de una evidencia get_precio_sipsa con
 * `available:true`. Tolera la forma simple ({tool,result}) y el array de
 * tool_chain (D2 #246) — devuelve el PRIMER hit de precio disponible. Devuelve
 * `null` si no hay precio disponible (el caller cae al LLM / al decline block).
 *
 * @param {object|Array<object>|null} toolEvidence
 * @returns {{ price: object, frescura: object|null, especie: (string|null) }|null}
 */
function _extractAvailablePrice(toolEvidence) {
  const pick = (ev) => {
    if (!ev || typeof ev !== 'object') return null;
    const toolName = String(ev.tool || '').toLowerCase();
    const isPriceTool = toolName.includes('precio') || toolName.includes('sipsa');
    if (!isPriceTool) return null;
    const r = ev.result;
    if (!r || typeof r !== 'object') return null;
    if (r.available !== true) return null;
    const price = r.price;
    if (!price || typeof price !== 'object') return null;
    if (typeof price.precio_promedio_cop_kg !== 'number') return null;
    return { price, frescura: r.frescura || null, especie: r.especie ?? null };
  };
  if (Array.isArray(toolEvidence)) {
    for (const ev of toolEvidence) {
      const hit = pick(ev);
      if (hit) return hit;
    }
    return null;
  }
  return pick(toolEvidence);
}

/** Formatea un entero COP con separador de miles (es-CO): 4600 → "4.600". */
function _formatCop(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(n).toLocaleString('es-CO');
}

/** "2026-06-25" → "25 de junio". Devuelve la ISO cruda si no parsea. */
function _formatFechaCorta(iso) {
  if (typeof iso !== 'string') return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const mes = meses[Number(m[2]) - 1] || m[2];
  return `${Number(m[3])} de ${mes}`;
}

/**
 * buildPriceAnswer — RESPUESTA DETERMINISTA para una consulta de precio cuando
 * get_precio_sipsa devolvió un dato REAL (available:true). Es la escena de
 * precio del demo campesino: el agente debe CANTAR el número, no enterrarlo en
 * agronomía genérica ni depender de que granite lo razone bien.
 *
 * Anti-alucinación: SOLO emite cuando hay un precio numérico real en la
 * evidencia del tool (que lee la tabla `chagra.sipsa_precios` poblada por el
 * feed diario DANE). Sin dato disponible → devuelve `null` y el caller cae al
 * decline block honesto (buildPriceDeclineContext) o al LLM. NUNCA inventa.
 *
 * Salida ejemplo:
 *   "💰 La papa (Papa criolla limpia) está a $4.600/kg en Bucaramanga,
 *    Centroabastos. Rango del día: $4.400–$4.800/kg. (Fuente: SIPSA/DANE,
 *    25 de junio.)"
 *
 * @param {object} [args]
 * @param {string|null|undefined} [args.userMessage] - pregunta cruda del usuario.
 * @param {object|Array<object>|null} [args.toolEvidence] - evidencia del sidecar.
 * @returns {string|null} respuesta lista para mostrar, o null si no aplica.
 */
export function buildPriceAnswer({ userMessage = null, toolEvidence = null } = {}) {
  // Solo para intent de PRECIO inequívoco (no convertimos otras consultas).
  if (classifyQueryIntent(userMessage) !== 'precio') return null;
  const hit = _extractAvailablePrice(toolEvidence);
  if (!hit) return null;

  const { price, frescura } = hit;
  const prom = _formatCop(price.precio_promedio_cop_kg);
  if (!prom) return null;

  // Lo que el usuario preguntó vs el nombre exacto del dato (variedad SIPSA).
  const productoDato = typeof price.producto === 'string' ? price.producto.trim() : '';
  const plaza = typeof price.plaza === 'string' ? price.plaza.trim() : '';

  let frase = `💰 ${productoDato || 'El producto'} está a **$${prom}/kg**`;
  if (plaza) frase += ` en ${plaza}`;
  frase += '.';

  // Rango min–max del día si ambos existen y difieren del promedio.
  const min = _formatCop(price.precio_min_cop_kg);
  const max = _formatCop(price.precio_max_cop_kg);
  if (min && max && min !== max) {
    frase += ` Rango del día: $${min}–$${max}/kg.`;
  }

  // Fuente + fecha. Sello de frescura honesto si el dato está desactualizado.
  const fechaTxt = _formatFechaCorta(price.fecha);
  const desactualizado = !!(frescura && frescura.desactualizado === true);
  const dias = frescura && typeof frescura.dias_desde_dato === 'number'
    ? frescura.dias_desde_dato
    : null;
  if (desactualizado) {
    const cuanto = dias != null ? ` (de hace ${dias} día${dias === 1 ? '' : 's'})` : '';
    frase += ` Ojo: es el último dato disponible${cuanto}, no el de hoy.`;
    frase += ` (Fuente: SIPSA/DANE${fechaTxt ? `, ${fechaTxt}` : ''}.)`;
  } else {
    frase += ` (Fuente: SIPSA/DANE${fechaTxt ? `, ${fechaTxt}` : ''}.)`;
  }

  // Precio mayorista: aclaración útil para el campesino.
  frase += ' Es precio mayorista en central de abastos; en plaza local puede variar.';

  return frase;
}

// ── P4b: entidades de BAJA confianza como SUGERENCIA (gatilla CASO B) ───────

/**
 * Umbral de confianza alineado con el sidecar (LOW_CONFIDENCE_THRESHOLD) y con
 * el filtro histórico del PWA. Entidades con confidence < este valor NO se
 * presentan como canónicas: se presentan como SUGERENCIA y el prompt obliga a
 * preguntar (CASO B) en vez de afirmar.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.7;

/**
 * isLowConfidenceEntity — ¿debe tratarse esta entidad como SUGERENCIA (no como
 * hecho)? True si el sidecar la marcó `low_confidence`/`suggested`/`fuzzy`/
 * `ambiguous`, o si su confidence cae por debajo del umbral. Defensivo ante
 * sidecars viejos que aún no emiten el flag `low_confidence`.
 *
 * @param {object} e
 * @returns {boolean}
 */
export function isLowConfidenceEntity(e) {
  if (!e || typeof e !== 'object') return false;
  if (e.low_confidence === true || e.suggested === true || e.fuzzy === true || e.ambiguous === true) {
    return true;
  }
  const c = typeof e.confidence === 'number' ? e.confidence : 0;
  return c < LOW_CONFIDENCE_THRESHOLD;
}

/**
 * buildSuggestedEntitiesContext — bloque para el caso P4 (FALLA juez claude-cli
 * 2026-06-02): "dame la altitud de Culupa" → el sidecar resuelve "culupa"→
 * Gulupa a confidence ~0.5 (fuzzy). Antes el PWA descartaba ese match (<0.7) y
 * el modelo afirmaba la altitud de Gulupa como hecho SIN "¿quisiste decir
 * Gulupa?".
 *
 * En vez de descartarlas, las entidades de baja confianza se presentan como
 * POSIBLES COINCIDENCIAS (no canónicas) y el prompt obliga a CASO B (pedir
 * confirmación) ANTES de afirmar cualquier dato de ellas. NUNCA se afirma su
 * altitud / nombre científico / viabilidad como hecho.
 *
 * @param {object} [args]
 * @param {Array<object>|null} [args.suggestedEntities] - entidades < umbral.
 * @returns {string}
 */
export function buildSuggestedEntitiesContext({ suggestedEntities = null } = {}) {
  if (!Array.isArray(suggestedEntities) || suggestedEntities.length === 0) return '';
  const lineas = [];
  const seen = new Set();
  for (const e of suggestedEntities) {
    if (!e || typeof e !== 'object') continue;
    const mentioned = (e.mentioned || '').toString().trim();
    const nombre = (e.nombre_comun || '').toString().trim();
    if (!nombre) continue;
    const key = `${mentioned}|${nombre}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const conf = typeof e.confidence === 'number' ? e.confidence.toFixed(2) : '?';
    lineas.push(
      `- El usuario escribió "${mentioned || nombre}" — posible coincidencia: ${nombre}${e.nombre_cientifico ? ` (${e.nombre_cientifico})` : ''} [confianza baja: ${conf}, SIN CONFIRMAR]`,
    );
  }
  if (lineas.length === 0) return '';
  return `

=== POSIBLES COINCIDENCIAS (BAJA CONFIANZA — NO confirmadas, NO son hechos) ===
El usuario mencionó términos que el catálogo NO resolvió con certeza. Lo de
abajo son CONJETURAS por similitud (typo o nombre regional), NO equivalencias
verificadas:

${lineas.join('\n')}

REGLA DE MÁXIMA PRIORIDAD (CASO B obligatorio):
1. NO afirmes ningún dato (altitud, temperatura, nombre científico, viabilidad,
   manejo) de estas posibles coincidencias como si fueran un hecho.
2. PRIMERO pregunta para confirmar, con el formato CASO B: "No estoy seguro de
   '[lo que escribió]'. ¿Quisiste decir [posible coincidencia]? Si es otra cosa,
   cuéntame qué planta es y te ayudo." — y DETENTE ahí para esa entidad.
3. Solo si el usuario confirma podrás responder con los datos de esa especie.
4. ES PREFERIBLE PREGUNTAR QUE AFIRMAR LA EQUIVOCADA.
=== FIN POSIBLES COINCIDENCIAS ===`;
}

/**
 * buildFallbackResponse — salida estructurada cuando el LLM falla (#349, Item 9).
 *
 * Cuando callLLM retorna vacío (timeout/OOM/modelo caído), la experiencia NO debe
 * ser un banner rojo ni un silencio. Esta función construye una respuesta útil
 * con lo que SÍ se sabe (toolEvidence) y deja claro qué falta.
 *
 * Flujo de decisión:
 *   1. Si rawResponse NO es vacío → passthrough (el LLM respondió bien).
 *   2. Si hay toolEvidence → construye un resumen estructurado: "Esto sabemos,
 *      esto no se pudo consultar, el siguiente paso es X".
 *   3. Si no hay nada → mensaje honesto: "No pude conectarme al asistente.
 *      ¿Quieres preguntar otra cosa o intentar de nuevo?"
 *
 * @param {string} rawResponse - Texto crudo del LLM (puede ser '').
 * @param {object|Array|null} toolEvidence - Lo que callTool retornó (routing/grounding).
 * @param {Array|null} resolvedEntities - Entidades resueltas por el sidecar.
 * @returns {string} - rawResponse si es válida, o fallback estructurado.
 */
/**
 * _countFromResult — cuenta genérica de resultados de un tool, cubriendo las
 * shapes comunes (`*_count` o un array `matches`/`resultados`/`canales`/...).
 * Así CUALQUIER tool aporta "encontré N" en el fallback, no solo los que tienen
 * caso explícito abajo. Devuelve null si no hay conteo reconocible.
 * @param {object} result
 * @returns {number|null}
 */
function _countFromResult(result) {
  if (!result || typeof result !== 'object') return null;
  for (const k of ['matches_count', 'resultados_count', 'canales_count', 'controls_count', 'count']) {
    if (Number.isFinite(result[k])) return result[k];
  }
  for (const k of ['matches', 'resultados', 'canales', 'controls', 'controladores', 'companions', 'recipes', 'items']) {
    if (Array.isArray(result[k])) return result[k].length;
  }
  return null;
}

export function buildFallbackResponse(rawResponse, toolEvidence = null, resolvedEntities = null) {
  if (rawResponse && typeof rawResponse === 'string' && rawResponse.trim().length > 0) {
    return rawResponse;
  }

  const entities = Array.isArray(resolvedEntities) ? resolvedEntities : [];

  // Extraer lo que sabemos de toolEvidence
  const knownFacts = [];
  const unknownQuestions = [];

  if (toolEvidence) {
    const evidences = Array.isArray(toolEvidence) ? toolEvidence : [toolEvidence];
    for (const ev of evidences) {
      if (!ev || !ev.tool) continue;
      const toolName = ev.tool;
      const result = ev.result;
      if (!result || result.available === false) {
        unknownQuestions.push(`No pude obtener datos de "${toolName}".`);
        continue;
      }

      // Extraer info relevante del resultado. Shapes VERIFICADAS contra el
      // sidecar 2026-07-18 (las viejas —species_name/controls/recipes— estaban
      // stale y nunca hacían match → el fallback caía siempre en el genérico).
      const sp = result.species;
      if (toolName === 'get_species' && sp && typeof sp === 'object') {
        const nombre = sp.nombre_comun || sp.nombre_cientifico || sp.id;
        if (nombre) knownFacts.push(`La especie que mencionaste es ${nombre}.`);
        const via = sp.viabilidad || result.viabilidad;
        if (via) {
          knownFacts.push(`En tu zona es ${via === 'viable' ? 'viable' : via === 'marginal' ? 'marginal' : 'no viable'} para sembrar.`);
        }
      } else if (toolName === 'get_pest_controllers' && Number.isFinite(result.matches_count)) {
        if (result.matches_count > 0) knownFacts.push(`Encontré ${result.matches_count} control(es) para esa plaga.`);
      } else if (toolName === 'get_biopreparados' && Number.isFinite(result.matches_count)) {
        if (result.matches_count > 0) knownFacts.push(`Encontré ${result.matches_count} receta(s) de biopreparados.`);
      } else if (toolName === 'get_folk_sintoma' && Array.isArray(result.resultados) && result.resultados.length) {
        const r0 = result.resultados[0];
        if (r0 && r0.mapea_a) knownFacts.push(`"${result.query || r0.sintoma_folk}" corresponde a ${r0.mapea_a}.`);
      } else if (toolName === 'get_aporte_nutricional' && result.nutrientes && typeof result.nutrientes === 'object') {
        const n = result.nutrientes;
        const bits = [];
        if (Number.isFinite(n.energia_kcal)) bits.push(`${n.energia_kcal} kcal`);
        if (Number.isFinite(n.proteina_g)) bits.push(`${n.proteina_g} g proteína`);
        if (Number.isFinite(n.hierro_mg)) bits.push(`${n.hierro_mg} mg hierro`);
        if (bits.length) knownFacts.push(`${result.nombre_comun || 'La especie'}: ${bits.join(', ')} por ${result.unidad || '100 g'}.`);
      } else if (toolName === 'get_suelo' && result.ph_optimo) {
        knownFacts.push(`${result.nombre_comun || 'La especie'}: pH óptimo ${result.ph_optimo}${result.correccion_suelo ? `; corrección de suelo: ${result.correccion_suelo}` : ''}.`);
      } else if (toolName === 'get_canales_comercializacion' && Number.isFinite(result.canales_count)) {
        if (result.canales_count > 0) knownFacts.push(`Encontré ${result.canales_count} canal(es) de comercialización.`);
      } else {
        // Genérico: cualquier tool con un conteo/array reconocible aporta algo
        // útil, no el vago "obtuve información útil".
        const n = _countFromResult(result);
        if (Number.isFinite(n) && n > 0) {
          knownFacts.push(`Consulté "${toolName}" y encontré ${n} resultado(s).`);
        } else {
          knownFacts.push(`Consulté "${toolName}" y obtuve información.`);
        }
      }
    }
  }

  // Si hay entidades pero no toolEvidence, al menos sabemos qué mencionó
  if (entities.length > 0 && knownFacts.length === 0) {
    const names = entities.map(e => e.nombre_comun || e.mentioned).filter(Boolean);
    if (names.length > 0) {
      knownFacts.push(`Mencionaste: ${names.join(', ')}.`);
    }
  }

  // Construir respuesta estructurada
  const parts = [];

  if (knownFacts.length > 0) {
    parts.push('Esto es lo que sé hasta ahora:');
    parts.push(knownFacts.map(f => `  • ${f}`).join('\n'));
  }

  parts.push('No pude completar la consulta con el asistente principal.');
  parts.push('Puedes intentar de nuevo o preguntar de otra forma.');
  parts.push('');

  if (unknownQuestions.length > 0) {
    parts.push('Fallo:');
    parts.push(unknownQuestions.map(u => `  • ${u}`).join('\n'));
    parts.push('');
  }

  parts.push('¿Quieres preguntar otra cosa?');

  const result = parts.join('\n');
  console.warn('[agentService] FallbackResponse activado (LLM vacío) - facts:', knownFacts.length, 'missing:', unknownQuestions.length);
  return result;
}
