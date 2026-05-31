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
import {
  isInCaucaRegion as _isInCaucaRegion,
  normalizeUserInput as _normalizeCauca,
  localizeAgentOutput as _localizeCauca,
} from './glosarioCaucaService.js';
import { filterVoseo as _filterVoseo } from './voseoFilter.js';
import { buildUserProfileBlock } from './userProfileService.js';
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
 * DR-LANG-1 (2026-05-28): aplica el filtro post-process anti-voseo
 * argentino sobre la salida del LLM. Se usa como última etapa antes de
 * exponer el texto al ChatScreen y al TTS, garantizando que ningún
 * marcador voseo llegue al usuario campesino colombiano independientemente
 * de lo que el modelo decida emitir.
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
 *   const safe = applyVoseoFilter(response);
 *   // → render(safe), speak(safe), persist(safe)
 *
 * @param {string} text  texto crudo del LLM
 * @param {object} [opts]
 * @param {'tu' | 'usted'} [opts.formality='usted']
 * @returns {string}
 */
export function applyVoseoFilter(text, opts = {}) {
  const { formality = 'usted' } = opts;
  return _filterVoseo(text, {
    formality,
    telemetry: true,
    ...opts,
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
    recomendaciones: 'Implementar sistema de防守 contra incendios. Usar cultivos adaptados a periodos de estrés hídrico. Planificar siembras según régimen de lluvias.',
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
    'santandereano': 'Usa español santandereano: "¿qui whopping?", "mano". Tono canchón.',
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
  return `REGLA CRÍTICA DE CITACIÓN DE FUENTES:
Toda información técnica (altitud, siembra, cosecha, manejo, plagas, clima, etc.) DEBE citar su origen. Formatos válitos:

- "según Restrepo & Rivera (1994)" → para conocimiento agronómico clásico
- "ICA Resolución [número]" → para normativa fitosanitaria
- "Agrosavia [año]" → para investigación científica
- "IDEAM [año]" → para datos climáticos
- "SENA [curso/título]" → para formación técnica
- "Papel técnico [título]" → para estudios específicos
- "El catálogo Chagra indica..." → para datos del sistema

Si NO tienes una fuente verificable para un dato, di explícitamente:
"No tengo una fuente confiable para este dato específico. Te recomiendo consultar con [técnico local/agrónomo/IDEAM]."

NUNCA inventes datos ni fuentes. Es preferible decir "no tengo el dato" que fabricar una cita.

REGLA CRÍTICA DE NOMBRES CIENTÍFICOS (BINOMIO): solo puedes citar un nombre científico (binomio Linneano, p. ej. "Solanum betaceum") si proviene del grounding/catálogo provisto en este mensaje — bloques "=== ENTIDADES RESUELTAS ===" o "=== EVIDENCIA AUTORITATIVA ===". Si la planta/plaga NO aparece en esos bloques, NO inventes el binomio: usa SOLO el nombre común tal cual lo dijo el usuario, sin paréntesis con nombre científico. Inventar un binomio por similitud fonética o "porque suena parecido" es alucinación grave (incidente prod 2026-05-30: "tomate de árbol" respondido como "Solanum lycopersicum var. cerasiforme" —cherry— cuando lo correcto es Solanum betaceum). Ante la duda: nombre común, sin binomio.`;
}

/**
 * Genera reglas de uso de datos de finca del usuario.
 *
 * @returns {string} Reglas de privacidad de datos para inyectar en prompt
 */
export function generateUserDataRules() {
  return `REGLA DE PRIVACIDAD DE DATOS DE FINCA:
Los datos de plantas, cultivos y finca del usuario SOLO deben mencionarse cuando:
1. El usuario pregunte explícitamente: "¿qué tengo?", "mis plantas", "mi finca", "mi cultivo", "cuántas plantas tengo", "qué plantas hay"
2. La consulta SEA sobre inventario: "¿qué especies cultivo?", "¿cuántos [cultivo] tengo?"

NO preambules respuestas con "Tienes X plantas..." si la pregunta es sobre otra cosa.
NO listes inventario en preguntas generales de manejo, plagas, clima, etc.

Ejemplo CORRECTO:
Usuario: "cómo podo el café"
✓ "Para la poda del café (Coffea arabica), según Restrepo & Rivera (1994)..." (NO menciona inventario)

Usuario: "qué tengo plantado"
✓ "Tienes 15 fresas, 4 caléndulas, 1 tomate cherry..." (SÍ menciona inventario)`;
}

/**
 * Construye el contexto de perfil completo para inyectar en el system prompt.
 *
 * @param {Object} finca - Objeto finca activa
 * @returns {string} Contexto de perfil para system prompt
 */
export function buildProfileContext(finca) {
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

  if (!finca) {
    return generateSourceCitationRules() + '\n\n' + generateUserDataRules() + profileSuffix;
  }

  const bioculturalZone = finca.biocultural_zone;
  const region = detectRegionFromBioculturalZone(bioculturalZone);
  const toneContext = generateRegionalToneContext(region);
  const climateContext = generateClimateAlertsContext(bioculturalZone);
  const citationRules = generateSourceCitationRules();
  const userDataRules = generateUserDataRules();

  return `${toneContext}

${climateContext}

${citationRules}

${userDataRules}${profileSuffix}`;
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
 * @param {string|null} [opts.region] — región natural de la finca (ensoContext).
 *   Si se pasa, se inyecta la LECTURA REGIONAL ENSO (DR-MISSION-2/4): qué
 *   implica la fase actual para esa región (p. ej. heladas paradójicas en el
 *   altiplano bajo El Niño seco). Si no, solo se inyecta el bloque base.
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
 * @param {number} [month] — mes 1-12; por defecto el mes actual local.
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
 * @param {number} [max=8] — cuántas especies listar antes de "y N más".
 * @returns {string} ej. "maíz ×2, café, frijol y 3 más" o '' si vacío.
 */
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
 * @param {object|null} [args.profile] — userProfileService.getProfile()
 * @param {object|null} [args.finca] — finca activa (fincaActiveStore)
 * @param {object|null} [args.climaSnapshot] — getCachedClimaSnapshot()
 * @param {Array<{name:string,count:number}>} [args.groupedCultivos] — inventario agrupado
 * @param {Array<object>|null} [args.resolvedEntities] — entidades AGE del turno
 * @param {Array<object>} [args.activeAlerts] — useAlertStore activeAlerts
 * @param {number} [args.month] — override de mes para tests (1-12)
 * @returns {string} bloque compacto (siempre incluye al menos la temporada).
 */
export function buildFincaContext({
  profile = null,
  finca = null,
  climaSnapshot = null,
  groupedCultivos = [],
  resolvedEntities = null,
  activeAlerts = [],
  month,
} = {}) {
  const p = profile && typeof profile === 'object' ? profile : {};
  const lines = [];

  // ── Ubicación ───────────────────────────────────────────────────────────
  const municipio = p.municipio || null;
  const departamento = p.departamento || null;
  const altitud = p.finca_altitud || (finca && finca.altitud) || null;
  const piso =
    (p.piso_termico && String(p.piso_termico).trim()) ||
    pisoTermicoFromAltitud(altitud) ||
    null;
  const lat = Number(p.ubicacion_lat);
  const lng = Number(p.ubicacion_lng);
  const ubic = [];
  const lugar = [municipio, departamento].filter(Boolean).join(', ');
  if (lugar) ubic.push(lugar);
  if (altitud) ubic.push(`~${altitud} msnm`);
  if (piso) ubic.push(`piso ${piso}`);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    ubic.push(`(${lat.toFixed(3)}, ${lng.toFixed(3)})`);
  }
  if (finca && finca.nombre) {
    lines.push(`Finca activa: "${finca.nombre}"${ubic.length ? ` — ${ubic.join(', ')}` : ''}.`);
  } else if (ubic.length) {
    lines.push(`Ubicación: ${ubic.join(', ')}.`);
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

  // ── Finca / inventario (resumen compacto, NO el detalle) ────────────────
  const cultivos = summarizeCultivos(groupedCultivos);
  if (cultivos) {
    lines.push(`Cultivos registrados en la finca: ${cultivos}.`);
  }

  // ── Cruce grounding × inventario (sin queries nuevas) ───────────────────
  const tieneRegistrado = crossResolvedWithInventory(resolvedEntities, groupedCultivos);
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
