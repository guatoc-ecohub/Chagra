/**
 * ensoContext.js — Contexto ENSO (El Niño / La Niña) estructurado para Chagra.
 *
 * ¿Qué es esto y por qué existe?
 * --------------------------------
 * El sidecar (`/clima/snapshot`) ya entrega el ESTADO ENSO en VIVO: fase actual,
 * ONI observado de NOAA, probabilidades IDEAM (NOAA CPC + IRI + CIIFEN). Eso es
 * el "qué está pasando ahora" y es la fuente de verdad para la fase.
 *
 * Lo que el feed en vivo NO trae es el CONOCIMIENTO REGIONAL: qué implica una
 * fase ENSO para la finca concreta del campesino según su región y piso térmico
 * (p. ej. la paradoja de que en El Niño seco la papa del altiplano sufre MÁS
 * heladas, no menos). Ese conocimiento está documentado y citado en la
 * investigación de Chagra:
 *
 *   - DR-MISSION-2 — Fenómeno del Niño Colombia 2026-27 (ENSO global, ONI,
 *     probabilidades IRI/CPC, impactos por Niños históricos 1982-2024).
 *   - DR-MISSION-3 — ENSO ciclo completo Colombia.
 *   - DR-MISSION-4 — Impactos regionales del cambio climático (5 regiones ×
 *     cultivos × piso térmico, cifras IDEAM/UPRA/Agrosavia/Cenicafé).
 *
 * Este módulo es ESTÁTICO y AUDITABLE: cada afirmación trazable a esos DR y a
 * sus fuentes primarias (NOAA CPC, IDEAM, Cenicafé, Fedepapa, UPRA). No inventa
 * cifras ni predice el clima — solo traduce la fase ENSO (que viene del feed en
 * vivo) a implicaciones agronómicas accionables por región.
 *
 * IMPORTANTE — estado al 2026-05: la fase ENSO observada es **Neutral con
 * vigilancia de Niño (El Niño Watch)**, ONI ~0.0 a +0.1 °C (NOAA CPC, boletín
 * 8-may-2026). NO hay El Niño activo todavía; hay una probabilidad creciente de
 * transición (aprox. 58% SON 2026, aprox. 70% DJF 2026-27 según el plume
 * IRI/CPC del 16-may-2026). Este módulo refleja eso y NO debe afirmar "El Niño
 * activo" mientras el feed en vivo reporte fase neutral.
 *
 * Uso:
 *   - annotateAlertWithEnso(alert, { phase, region }) -> agrega contexto ENSO a
 *     una alerta del alertEngine cuando es relevante.
 *   - buildEnsoAgentLines({ phase, region, probabilities }) -> 1-3 líneas para
 *     inyectar al system prompt del agente (complementa buildClimaContext).
 *   - getEnsoOutlook({ phase, probabilities }) -> texto corto para el panel
 *     AnalisisProactivoIA.
 *   - regionFromProfile(profile) -> infiere la región natural desde el perfil.
 */

/**
 * Vigilancia ENSO oficial al momento de redacción (fuente: DR-MISSION-2 sec.
 * 1.1-1.2, NOAA CPC 8-may-2026 + plume IRI/CPC 16-may-2026). Se usa SOLO como
 * respaldo cuando el feed en vivo no trae probabilidades; el feed en vivo manda.
 */
export const ENSO_WATCH_2026 = Object.freeze({
    estado: 'Neutral con vigilancia de Niño (El Niño Watch)',
    oni_observado_aprox: 0.0, // FMA 2026, ~-0.1 a +0.1 °C
    // Probabilidad de transición a El Niño por trimestre (plume IRI/CPC 16-may-2026).
    transicion_nino: Object.freeze({
        SON_2026: 58,
        OND_2026: 65,
        NDJ_2026_27: 68,
        DJF_2026_27: 70,
    }),
    fuente: 'NOAA CPC + IRI (DR-MISSION-2)',
});

/**
 * Conocimiento regional por fase ENSO. Cada entrada cita su origen en el DR.
 * `nino` = qué esperar bajo El Niño; `nina` = bajo La Niña; `vigilancia` = qué
 * conviene hacer ahora mismo en fase neutral con Watch de Niño.
 */
const REGION_IMPACTS = Object.freeze({
    andina: {
        label: 'Región Andina',
        nino: 'El Niño en los Andes trae menos lluvia y más días calurosos. Paradoja documentada (IDEAM/Cenicafé, DR-MISSION-4): en el altiplano frío (papa de Boyacá/Cundinamarca) el cielo despejado aumenta la pérdida de calor en la noche y dispara MÁS heladas, no menos — el Niño 2015-16 costó cerca de 25.000 t de papa por esto.',
        nina: 'La Niña en los Andes trae más lluvia, suelos sobresaturados y mayor riesgo de deslizamientos en ladera (UPRA/UNGRD) y de hongos (mildiu/gota) en papa y café.',
        vigilancia: 'Con vigilancia de Niño: en piso frío reserva agua para riego nocturno anti-helada; en café/cacao templado prepara sombrío y mulch para amortiguar el calor que se espera si entra el Niño.',
    },
    caribe: {
        label: 'Región Caribe',
        nino: 'El Niño agrava la sequía estructural del Caribe (La Guajira, Cesar, Magdalena): déficit hídrico crónico, estrés en banano, arroz de riego y ganadería (DR-MISSION-4). Es la región donde el Niño golpea más fuerte en agua.',
        nina: 'La Niña en el Caribe trae lluvias intensas e inundación en planicie; revisa drenajes y evita siembra en zonas anegables.',
        vigilancia: 'Con vigilancia de Niño: prioriza captación y almacenamiento de agua lluvia ahora, mientras todavía llueve. Mulch y agroforestería seca para conservar humedad.',
    },
    pacifico: {
        label: 'Región Pacífico',
        nino: 'El Niño reduce algo la lluvia extrema habitual del Pacífico, pero el bosque húmedo sigue siendo muy lluvioso; el riesgo dominante sigue siendo exceso de agua y erosión (DR-MISSION-4).',
        nina: 'La Niña intensifica lluvias ya extremas: erosión, deslizamiento y pérdida de cosecha en ladera. Refuerza drenajes agroecológicos.',
        vigilancia: 'Con vigilancia de Niño: el manejo de exceso de agua (drenajes, camas altas) sigue siendo la prioridad en el Pacífico aunque entre el Niño.',
    },
    orinoquia: {
        label: 'Región Orinoquía',
        nino: 'El Niño exacerba la estación seca de la sabana: mayor recurrencia de incendios y estrés en pasturas (DR-MISSION-4). Cuidado con el fuego descontrolado.',
        nina: 'La Niña alarga la temporada de lluvias y el encharcamiento en sabana inundable.',
        vigilancia: 'Con vigilancia de Niño: planifica fuego prescrito y rondas cortafuego antes de la temporada seca; sistemas silvopastoriles para sombra.',
    },
    amazonia: {
        label: 'Región Amazonía',
        nino: 'El Niño trae sequías inusuales a la Amazonía colombiana, estresa la chagra tradicional y aumenta el riesgo de incendio (DR-MISSION-4). Es un disparador del riesgo de "tipping point" sabanizador.',
        nina: 'La Niña mantiene o aumenta la humedad amazónica; el riesgo es exceso de agua en vega de río.',
        vigilancia: 'Con vigilancia de Niño: protege la chagra de quema accidental y diversifica para resiliencia ante sequía corta.',
    },
});

/**
 * Mapa piso térmico (slug del perfil) -> región probable por defecto. Es una
 * heurística de respaldo cuando no se puede inferir la región del departamento.
 * El piso frío/páramo casi siempre es Andino; el cálido puede ser varias
 * regiones, así que cae a 'andina' como base más poblada (51% de UPAs).
 */
const PISO_TO_REGION = Object.freeze({
    paramo: 'andina',
    frio: 'andina',
    frio_andino: 'andina',
    templado: 'andina',
    templado_andino: 'andina',
    calido: 'andina',
    // Auditoría clima 2026-06-11: LocationDetectedScreen guarda piso_termico
    // CON tilde ('frío', 'páramo', 'cálido' — deriveThermalZoneFromAltitud);
    // sin estas variantes regionFromProfile fallaba silencioso por el piso.
    'páramo': 'andina',
    'frío': 'andina',
    'cálido': 'andina',
    glacial: 'andina',
});

/**
 * Departamentos -> región natural (subconjunto suficiente para anotar alertas).
 * No exhaustivo; lo que no matchee cae a null y se usa el piso térmico.
 */
const DEPTO_TO_REGION = Object.freeze({
    'la guajira': 'caribe', 'cesar': 'caribe', 'magdalena': 'caribe',
    'atlántico': 'caribe', 'atlantico': 'caribe', 'bolívar': 'caribe',
    'bolivar': 'caribe', 'sucre': 'caribe', 'córdoba': 'caribe', 'cordoba': 'caribe',
    'chocó': 'pacifico', 'choco': 'pacifico', 'valle del cauca': 'pacifico',
    'cauca': 'pacifico', 'nariño': 'pacifico', 'narino': 'pacifico',
    'meta': 'orinoquia', 'casanare': 'orinoquia', 'arauca': 'orinoquia',
    'vichada': 'orinoquia',
    'amazonas': 'amazonia', 'caquetá': 'amazonia', 'caqueta': 'amazonia',
    'putumayo': 'amazonia', 'guaviare': 'amazonia', 'guainía': 'amazonia',
    'guainia': 'amazonia', 'vaupés': 'amazonia', 'vaupes': 'amazonia',
    'boyacá': 'andina', 'boyaca': 'andina', 'cundinamarca': 'andina',
    'quindío': 'andina', 'quindio': 'andina', 'caldas': 'andina',
    'risaralda': 'andina', 'antioquia': 'andina', 'santander': 'andina',
    'tolima': 'andina', 'huila': 'andina',
});

/**
 * Normaliza una fase ENSO a una de tres familias: 'nino' | 'nina' | 'neutral'.
 * Acepta los slugs del sidecar (nino_fuerte, nina_debil, neutral, etc.).
 */
export function ensoFamily(phase) {
    if (typeof phase !== 'string') return 'neutral';
    if (phase.startsWith('nino')) return 'nino';
    if (phase.startsWith('nina')) return 'nina';
    return 'neutral';
}

/**
 * Infiere la región natural desde el perfil del usuario.
 * Prioridad: departamento explícito -> municipio/region (texto) -> piso térmico.
 *
 * @param {object|null} profile - perfil de userProfileService.getProfile()
 * @returns {'andina'|'caribe'|'pacifico'|'orinoquia'|'amazonia'|null}
 */
export function regionFromProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    const depto = (profile.departamento || '').toLowerCase().trim();
    if (depto && DEPTO_TO_REGION[depto]) return DEPTO_TO_REGION[depto];

    // El campo `municipio`/`region` a veces trae "Municipio, Departamento".
    const blob = `${profile.municipio || ''} ${profile.region || ''}`.toLowerCase();
    for (const [name, region] of Object.entries(DEPTO_TO_REGION)) {
        if (blob.includes(name)) return region;
    }

    const piso = (profile.piso_termico || '').toLowerCase().trim();
    if (piso && PISO_TO_REGION[piso]) return PISO_TO_REGION[piso];

    return null;
}

/**
 * Devuelve la línea de contexto regional para una fase ENSO. Si no hay región
 * conocida, devuelve '' (no fuerza ruido). En fase neutral devuelve el mensaje
 * de vigilancia/preparación de esa región.
 *
 * @param {string} phase - slug de fase ENSO del feed en vivo
 * @param {string|null} region - clave de REGION_IMPACTS
 * @returns {string}
 */
export function ensoRegionalLine(phase, region) {
    const fam = ensoFamily(phase);
    const r = region && REGION_IMPACTS[region] ? REGION_IMPACTS[region] : null;
    if (!r) return '';
    if (fam === 'nino') return r.nino;
    if (fam === 'nina') return r.nina;
    return r.vigilancia; // neutral -> mensaje de vigilancia/preparación
}

/**
 * Anota una alerta del alertEngine con contexto ENSO regional cuando es
 * pertinente. Mutación NO destructiva: devuelve una copia con `enso_context`.
 *
 * Regla de pertinencia: anota si la fase no es neutral, O si la alerta es de
 * sequía/helada (que es justo donde la fase de vigilancia importa).
 *
 * @param {object} alert - alerta con al menos { type }
 * @param {{ phase?: string, region?: string|null }} ctx
 * @returns {object} alerta (posiblemente) anotada
 */
export function annotateAlertWithEnso(alert, ctx = {}) {
    if (!alert || typeof alert !== 'object') return alert;
    const { phase = 'neutral', region = null } = ctx;
    const fam = ensoFamily(phase);
    const type = String(alert.type || '').toUpperCase();
    const drySensitive = type.includes('HELADA') || type.includes('SEQUIA') || type.includes('SEQUÍA');

    if (fam === 'neutral' && !drySensitive) return alert;

    const line = ensoRegionalLine(phase, region);
    if (!line) return alert;

    return {
        ...alert,
        enso_context: {
            phase,
            family: fam,
            region: region || null,
            note: line,
            source: 'NOAA CPC / IDEAM (DR-MISSION-2/4)',
        },
    };
}

/**
 * Construye 1-3 líneas de contexto ENSO para inyectar al system prompt del
 * agente, complementando buildClimaContext (que ya inyecta la fase + ONI +
 * alertas locales). Aquí agregamos la lectura REGIONAL accionable.
 *
 * @param {{ phase?: string, region?: string|null, probabilities?: object|null }} opts
 * @returns {string}
 */
export function buildEnsoAgentLines({ phase = 'neutral', region = null, probabilities = null } = {}) {
    const lines = [];
    const fam = ensoFamily(phase);
    const regionLine = ensoRegionalLine(phase, region);

    if (fam === 'neutral') {
        const djf = probabilities?.nino_pct ?? ENSO_WATCH_2026.transicion_nino.DJF_2026_27;
        lines.push(`Vigilancia ENSO: fase neutral con probabilidad creciente de El Niño (aprox. ${djf}% hacia el trimestre dic-feb, fuente NOAA CPC/IDEAM). NO afirmes que El Niño ya está activo; es vigilancia.`);
    }
    if (regionLine) {
        lines.push(`Lectura regional para la finca${region ? ` (${REGION_IMPACTS[region]?.label || region})` : ''}: ${regionLine}`);
    }
    return lines.join('\n');
}

/**
 * Resumen corto para el panel AnalisisProactivoIA (sin LLM). Devuelve un objeto
 * { titulo, detalle, fuente } o null si no hay nada relevante que decir.
 *
 * @param {{ phase?: string, region?: string|null, probabilities?: object|null }} opts
 */
export function getEnsoOutlook({ phase = 'neutral', region = null, probabilities = null } = {}) {
    const fam = ensoFamily(phase);
    const regionLine = ensoRegionalLine(phase, region);

    if (fam === 'nino') {
        return {
            titulo: 'El Niño activo',
            detalle: regionLine || 'Espera más calor y menos lluvia. Prioriza riego eficiente, mulch y sombrío.',
            fuente: 'NOAA CPC · IDEAM',
        };
    }
    if (fam === 'nina') {
        return {
            titulo: 'La Niña activa',
            detalle: regionLine || 'Espera más lluvia. Revisa drenajes y vigila enfermedades fúngicas.',
            fuente: 'NOAA CPC · IDEAM',
        };
    }
    // Neutral: solo mostrar si hay Watch significativo o región sensible.
    const djf = probabilities?.nino_pct ?? ENSO_WATCH_2026.transicion_nino.DJF_2026_27;
    if (djf >= 50) {
        return {
            titulo: 'Vigilancia de El Niño',
            detalle: regionLine
                ? `Probabilidad aprox. ${djf}% de El Niño hacia dic-feb. ${regionLine}`
                : `Probabilidad aprox. ${djf}% de transición a El Niño hacia dic-feb. Conviene preparar manejo de sequía y calor.`,
            fuente: 'NOAA CPC · IRI / IDEAM',
        };
    }
    return null;
}

export const __testing__ = { REGION_IMPACTS, DEPTO_TO_REGION, PISO_TO_REGION };
