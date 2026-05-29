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

NUNCA inventes datos ni fuentes. Es preferible decir "no tengo el dato" que fabricar una cita.`;
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
 * @returns {string}
 */
export function buildClimaContext(snapshot) {
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
  lines.push('');
  lines.push('REGLA: si tu recomendación depende del clima de los próximos días o del fenómeno ENSO, menciónalo CITANDO las fuentes de arriba. Si El Niño / La Niña activo cambia la recomendación de manejo, dilo plano. Si el dato no aplica al cultivo de la pregunta, no lo fuerces.');
  lines.push('=== FIN CLIMA TIEMPO REAL ===');

  return lines.join('\n');
}
