/**
 * externalAiPromptBuilder.js — R5
 * Construye prompts portables para IA externa (Gemini, ChatGPT, Claude).
 * Puro: sin efectos secundarios, sin llamadas de red.
 * AGPL-3.0 © Chagra
 */

/**
 * Deriva piso térmico colombiano a partir de altitud en msnm.
 * Clasificación IDEAM / Caldas modificado:
 *   - cálido: 0-1000 msnm
 *   - templado: 1000-2000 msnm
 *   - frío: 2000-3000 msnm
 *   - páramo: 3000-3600 msnm
 *   - glacial: >3600 msnm
 *
 * Permite que los prompts incluyan piso térmico aunque
 * VITE_FARM_THERMAL_ZONES no esté configurado — la altitud sola
 * basta para inferirlo (Miguel 2026-05-04: "veo en chagra 2550 pero
 * el prompt dice piso térmico no especificado").
 *
 * @param {number} altitudMsnm
 * @returns {string|null} slug del piso térmico o null si no se puede inferir
 */
export function deriveThermalZoneFromAltitud(altitudMsnm) {
    if (typeof altitudMsnm !== 'number' || !Number.isFinite(altitudMsnm) || altitudMsnm < 0) {
        return null;
    }
    if (altitudMsnm < 1000) return 'cálido';
    if (altitudMsnm < 2000) return 'templado';
    if (altitudMsnm < 3000) return 'frío';
    if (altitudMsnm < 3600) return 'páramo';
    return 'glacial';
}

/**
 * Resuelve thermal zones efectivos: usa thermalZones explícitos si existen,
 * sino deriva desde altitud. Devuelve array para mantener compatibilidad con
 * builders que asumen array.
 */
function resolveThermalZones(thermalZones, altitudMsnm) {
    if (Array.isArray(thermalZones) && thermalZones.length > 0) {
        return thermalZones;
    }
    const derived = deriveThermalZoneFromAltitud(altitudMsnm);
    return derived ? [derived] : [];
}

/**
 * Construye un prompt de gremio agroecológico.
 * @param {Object} ctx - Contexto de la especie y el gremio
 * @param {string} ctx.speciesName - Nombre común de la especie
 * @param {string} [ctx.scientificName] - Nombre científico
 * @param {string} [ctx.estrato] - Estrato (bajo, medio, alto)
 * @param {string[]} [ctx.companions] - IDs o nombres de compañeros ya considerados
 * @param {string[]} [ctx.antagonists] - IDs o nombres de antagonistas conocidos
 * @param {string[]} [ctx.thermalZones] - Pisos térmicos (frio, templado, etc.)
 * @param {number} [ctx.altitudMsnm] - Altitud en metros sobre el nivel del mar
 * @param {string} [ctx.municipio] - Municipio/departamento
 */
export function buildGuildExternalPrompt(ctx) {
    const {
        speciesName = 'especie desconocida',
        scientificName,
        estrato,
        companions = [],
        antagonists = [],
        thermalZones = [],
        altitudMsnm,
        municipio,
    } = ctx;

    const resolvedZones = resolveThermalZones(thermalZones, altitudMsnm);
    const zonaTermica = resolvedZones.length > 0 ? resolvedZones.join(', ') : 'no especificado';
    const altitudStr = altitudMsnm ? `${altitudMsnm} msnm` : 'altitud no especificada';
    const ubicacion = [altitudStr, municipio].filter(Boolean).join(', ');
    const companionsStr = companions.length > 0 ? companions.join(', ') : 'ninguno aún';
    const antagonistsStr = antagonists.length > 0 ? antagonists.join(', ') : 'ninguno conocido';
    const especieFull = scientificName ? `${scientificName} (${speciesName})` : speciesName;
    const estratoStr = estrato ? `Estrato: ${estrato}` : '';

    return `Actúa como agrónomo colombiano especializado en agroecología y diseño de gremios.

CONTEXTO:
- Ubicación: ${ubicacion} (piso térmico ${zonaTermica})
- Especie principal: ${especieFull}
${estratoStr ? `- ${estratoStr}` : ''}- Companions ya considerados: ${companionsStr}
- Antagonists conocidos: ${antagonistsStr}

PREGUNTA:
Sugiere 5 compañeros adicionales para esta especie en un gremio agroecológico colombiano, priorizando fijación de N, repelencia de plagas, cobertura de suelo, y atractor de polinizadores. Para cada compañero: (a) nombre científico, (b) rol ecológico específico, (c) distancia óptima de siembra, (d) compatibilidad con mi piso térmico.

Responde SOLO en JSON válido: array de objetos con keys name, scientific_name, role, distance_m, notes.`.trim();
}

/**
 * Construye un prompt de diagnóstico fitosanitario.
 * @param {Object} ctx - Contexto ambiental y del cultivo
 * @param {string} ctx.speciesName - Nombre común de la especie
 * @param {string} [ctx.scientificName] - Nombre científico
 * @param {string[]} [ctx.thermalZones] - Pisos térmicos
 * @param {number} [ctx.altitudMsnm] - Altitud en msnm
 * @param {string} [ctx.municipio] - Municipio/departamento
 * @param {number} [ctx.humedad] - Humedad relativa %
 * @param {number} [ctx.temperatura] - Temperatura °C
 * @param {number} [ctx.lluvia] - Precipitación mm últimos días
 * @param {string} [ctx.sintomas] - Síntomas observados por el usuario
 * @param {string} [ctx.fase] - Fase fenológica
 * @param {number} [ctx.diasDesdeSiembra] - Días desde la siembra
 */
export function buildDiagnosticExternalPrompt(ctx) {
    const {
        speciesName = 'cultivo',
        scientificName,
        thermalZones = [],
        altitudMsnm,
        municipio,
        humedad,
        temperatura,
        lluvia,
        sintomas = '[usuario describe síntomas aquí]',
        fase,
        diasDesdeSiembra,
    } = ctx;

    const resolvedZones = resolveThermalZones(thermalZones, altitudMsnm);
    const zonaTermica = resolvedZones.length > 0 ? resolvedZones.join(', ') : 'no especificado';
    const altitudStr = altitudMsnm ? `${altitudMsnm} msnm` : 'altitud no especificada';
    const ubicacion = [altitudStr, municipio].filter(Boolean).join(', ');
    const especieFull = scientificName ? `${scientificName} (${speciesName})` : speciesName;

    const condLines = [];
    if (humedad != null) condLines.push(`HR ${humedad}%`);
    if (temperatura != null) condLines.push(`temperatura media ${temperatura}°C`);
    if (lluvia != null) condLines.push(`precipitación acumulada ${lluvia}mm`);
    const condStr = condLines.length > 0 ? condLines.join(', ') : 'datos no disponibles';

    const faseStr = (fase || diasDesdeSiembra != null)
        ? `${fase ? `fase fenológica ${fase}` : ''}${diasDesdeSiembra != null ? `, ${diasDesdeSiembra} días desde siembra` : ''}`
        : 'fase no especificada';

    return `Actúa como fitopatólogo colombiano especializado en agroecología andina.

CULTIVO: ${especieFull}, ${faseStr}
UBICACIÓN: ${ubicacion}, piso térmico ${zonaTermica}
CONDICIONES ÚLTIMOS 7 DÍAS: ${condStr}
SÍNTOMAS OBSERVADOS: ${sintomas}

TAREA:
Realiza un diagnóstico diferencial priorizando causas más probables a esta altitud y condiciones. Para cada hipótesis, propón:
(a) prueba casera de confirmación
(b) biopreparado agroecológico de tratamiento (NO agroquímicos sintéticos; respetar normativa IFOAM)
(c) medida preventiva para ciclos futuros`.trim();
}

/**
 * Construye un prompt genérico para consulta abierta.
 * @param {Object} ctx
 */
export function buildOpenExternalPrompt(ctx) {
    const {
        speciesName = 'especie',
        scientificName,
        thermalZones = [],
        altitudMsnm,
        municipio,
        pregunta = '[Escribe tu pregunta aquí]',
    } = ctx;

    const resolvedZones = resolveThermalZones(thermalZones, altitudMsnm);
    const zonaTermica = resolvedZones.length > 0 ? resolvedZones.join(', ') : 'no especificado';
    const altitudStr = altitudMsnm ? `${altitudMsnm} msnm` : 'altitud no especificada';
    const ubicacion = [altitudStr, municipio].filter(Boolean).join(', ');
    const especieFull = scientificName ? `${scientificName} (${speciesName})` : speciesName;

    return `Actúa como agrónomo colombiano especializado en agroecología en piso térmico ${zonaTermica}.

CONTEXTO:
- Ubicación: ${ubicacion}
- Especie: ${especieFull}

PREGUNTA:
${pregunta}`.trim();
}
