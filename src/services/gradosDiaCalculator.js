/**
 * gradosDiaCalculator — el "reloj térmico" del cultivo (grados-día de desarrollo).
 * ============================================================================
 * Calculadora DETERMINISTA de grados-día acumulados (GDD): en vez de contar días
 * calendario, cuenta el CALOR que la mata acumula por encima de su temperatura
 * base (Tb). Explica por qué el mismo cultivo tarda más en tierra fría — "acumula
 * menos calor por día" — la intuición campesina detrás de los GDD.
 *
 * GROUNDING (deepresearch 2026-07-04-cultivos-clima-nacional-CO.md):
 *   · Maíz: Tb = 10 °C, To = 30 °C (método modificado: si Tmín<10 se usa 10; si
 *     Tmáx>30 se usa 30). Fuente R30 (SciELO/Rev. Chapingo) — confianza alta.
 *   · Papa: Tb típica 4–7 °C según el modelo. Fuente R31 (SciELO) — media-alta.
 *     El valor único usado por AGROSAVIA para papa colombiana está PENDIENTE de
 *     cierre (grounded-pendiente); usamos 5 °C como representativo del rango.
 *   · Fenología en días (para estimar etapa) — grounded:
 *       Papa (altiplano cundiboyacense, AGROSAVIA R10): emergencia 30–35 dds,
 *       floración ~40–50 dds, tuberización 80–90 dds, madurez ~165–170 dds.
 *       Maíz ICA V-305 (R18): ~100 días a choclo, ~170 a grano seco.
 *       Maíz ICA V-109 (R18): ~70–80 días a choclo, ~120 a grano seco.
 *
 * REGLA DE INTEGRIDAD: no se inventan umbrales. Los umbrales de etapa por GDD
 * (cuántos °D hasta floración/cosecha) NO están en el grounding → se marcan
 * grounded-pendiente y la ETAPA se estima por fenología en DÍAS (que sí está
 * groundeada), no por GDD. La calculadora entrega los GDD como el "porqué" del
 * ritmo, y los días como el "qué etapa".
 *
 * Todo son funciones puras (sin estado, sin red) → fáciles de testear y de
 * confiar. Los presets de piso térmico son REFERENCIA EDITABLE (confianza media):
 * el campesino ajusta Tmín/Tmáx a su finca; el cálculo usa lo que él confirme.
 */

/**
 * @typedef {Object} CultivoGDD
 * @property {string} id            clave estable
 * @property {string} nombre        nombre campesino
 * @property {string} emoji
 * @property {number} tb            temperatura base (°C)
 * @property {number|null} to       temperatura tope (°C) o null si no se aplica cap
 * @property {string} tbNota        procedencia/confianza de la Tb
 * @property {string} fuente        referencia del grounding
 * @property {Array<{id:string,label:string,desc:string,dds:number}>} [fenologia]
 *   hitos fenológicos en días-después-de-siembra (dds), en orden ascendente.
 * @property {string} [fenologiaFuente]
 */

/** Cultivos con Tb groundeada. `manual` deja al usuario fijar su propia Tb. */
export const CULTIVOS_GDD = /** @type {CultivoGDD[]} */ ([
    {
        id: 'maiz',
        nombre: 'Maíz',
        emoji: '🌽',
        tb: 10,
        to: 30,
        tbNota: 'Tb 10 °C, tope 30 °C (método modificado). Confianza alta.',
        fuente: 'Rev. Chapingo / SciELO',
        fenologia: [
            { id: 'siembra', label: 'Siembra', desc: 'Semilla en el surco', dds: 0 },
            { id: 'emergencia', label: 'Emergencia', desc: 'Asoma la matica', dds: 8 },
            { id: 'vegetativo', label: 'Crecimiento', desc: 'Hoja y tallo', dds: 35 },
            { id: 'floracion', label: 'Floración', desc: 'Espiga y jilote', dds: 60 },
            { id: 'choclo', label: 'Choclo', desc: 'Mazorca tierna (V-305)', dds: 100 },
            { id: 'grano_seco', label: 'Grano seco', desc: 'Madurez de cosecha (V-305)', dds: 170 },
        ],
        fenologiaFuente: 'ICA V-305 (V-109: choclo 70–80 d / grano 120 d)',
    },
    {
        id: 'papa',
        nombre: 'Papa',
        emoji: '🥔',
        tb: 5,
        to: null,
        tbNota: 'Tb 4–7 °C según modelo; usamos 5 °C. Valor AGROSAVIA exacto: pendiente.',
        fuente: 'SciELO (tiempo térmico papa)',
        fenologia: [
            { id: 'siembra', label: 'Siembra', desc: 'Tubérculo-semilla enterrado', dds: 0 },
            { id: 'emergencia', label: 'Emergencia', desc: 'Brota la planta', dds: 32 },
            { id: 'floracion', label: 'Floración', desc: 'Flor de la papa', dds: 45 },
            { id: 'tuberizacion', label: 'Tuberización', desc: 'Cuaja el tubérculo', dds: 85 },
            { id: 'madurez', label: 'Madurez', desc: 'Lista para arrancar', dds: 167 },
        ],
        fenologiaFuente: 'AGROSAVIA, altiplano cundiboyacense',
    },
    {
        id: 'manual',
        nombre: 'Otro cultivo (Tb a mano)',
        emoji: '🌱',
        tb: 10,
        to: null,
        tbNota: 'Fije la temperatura base de su cultivo. Confírmela con su técnico.',
        fuente: 'grounded-pendiente',
    },
]);

/** Mapa id → cultivo. */
export const CULTIVO_GDD_BY_ID = Object.fromEntries(CULTIVOS_GDD.map((c) => [c.id, c]));

/**
 * Presets de piso térmico: Tmín/Tmáx TÍPICOS de un día, coherentes con las
 * temperaturas medias del grounding (cálido ~24+, templado ~17–24, frío ~12–17,
 * páramo <10). Son REFERENCIA EDITABLE (confianza media): el amplitud diurna es
 * una aproximación; el usuario ajusta a su finca. No son norma dura.
 */
export const PISOS_TERMICOS = [
    { id: 'calido', nombre: 'Tierra caliente', rango: '0–1000 m', tmin: 20, tmax: 30, media: '~24 °C+' },
    { id: 'templado', nombre: 'Tierra templada (café)', rango: '1000–2000 m', tmin: 15, tmax: 26, media: '~17–24 °C' },
    { id: 'frio', nombre: 'Tierra fría (papa)', rango: '2000–3000 m', tmin: 7, tmax: 19, media: '~12–17 °C' },
    { id: 'paramo', nombre: 'Páramo', rango: '>3000 m', tmin: 3, tmax: 13, media: '<10 °C' },
];

/**
 * Régimen de lluvias → ventanas de siembra (grounding R16/R17). El calendario
 * campesino se ancla al INICIO de las lluvias, no a un mes fijo.
 */
export const REGIMENES_LLUVIA = [
    {
        id: 'bimodal',
        nombre: 'Región Andina (bimodal)',
        desc: 'Dos temporadas de lluvia → dos siembras al año.',
        ventanas: [
            { label: 'Semestre A', siembra: 'marzo–mayo', cosecha: 'julio–agosto' },
            { label: 'Semestre B', siembra: 'septiembre–noviembre', cosecha: 'diciembre–enero' },
        ],
        nota: 'Siembre apenas se estabilicen las primeras lluvias. "Mitaca" = la segunda cosecha del año.',
        fuente: 'IDEAM',
    },
    {
        id: 'unimodal',
        nombre: 'Llanos, Caribe, Amazonía, Pacífico (unimodal)',
        desc: 'Una sola temporada de lluvia → una siembra al año.',
        ventanas: [
            { label: 'Única', siembra: 'al arrancar las lluvias (mitad de año)', cosecha: 'según el ciclo del cultivo' },
        ],
        nota: 'La seca va aproximadamente de diciembre a marzo.',
        fuente: 'IDEAM',
    },
];

/**
 * Grados-día de UN día por el método modificado del promedio.
 * Regla del grounding: clampa Tmín y Tmáx al rango [Tb, To] antes de promediar
 * ("si Tmín<10 se usa 10; si Tmáx>30 se usa 30"). Nunca negativo.
 *
 * @param {number} tmin  temperatura mínima del día (°C)
 * @param {number} tmax  temperatura máxima del día (°C)
 * @param {number} tb    temperatura base del cultivo (°C)
 * @param {number|null} [to]  temperatura tope (°C) o null/undefined = sin cap
 * @returns {number} grados-día del día (≥ 0)
 */
export function gddDia(tmin, tmax, tb, to = null) {
    if (![tmin, tmax, tb].every((v) => Number.isFinite(v))) return 0;
    let lo = tmin;
    let hi = tmax;
    if (Number.isFinite(to)) {
        if (hi > to) hi = to;
        if (lo > to) lo = to;
    }
    if (lo < tb) lo = tb;
    if (hi < tb) hi = tb;
    const media = (lo + hi) / 2;
    const gdd = media - tb;
    return gdd > 0 ? gdd : 0;
}

/**
 * GDD acumulados sobre N días a un ritmo térmico constante (Tmín/Tmáx típicos).
 * Determinista: N × gddDia. Redondeado a 1 decimal para lectura.
 *
 * @param {number} tmin
 * @param {number} tmax
 * @param {number} tb
 * @param {number|null} to
 * @param {number} dias  número de días (se trunca a entero ≥ 0)
 * @returns {number} GDD acumulados
 */
export function gddAcumulado(tmin, tmax, tb, to, dias) {
    const n = Math.max(0, Math.trunc(dias || 0));
    const porDia = gddDia(tmin, tmax, tb, to);
    return Math.round(porDia * n * 10) / 10;
}

/**
 * Días transcurridos entre dos fechas (YYYY-MM-DD o Date), ≥ 0.
 * @param {string|Date} desde
 * @param {string|Date} [hasta] por defecto hoy
 * @returns {number} días enteros
 */
export function diasTranscurridos(desde, hasta = new Date()) {
    const a = desde instanceof Date ? desde : new Date(`${desde}T00:00:00`);
    const b = hasta instanceof Date ? hasta : new Date(`${hasta}T00:00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
    const ms = b.getTime() - a.getTime();
    return Math.max(0, Math.floor(ms / 86400000));
}

/**
 * Estima la ETAPA fenológica por días-después-de-siembra usando la fenología
 * GROUNDED en días (no por GDD, cuyos umbrales están pendientes). Devuelve el
 * hito actual y el próximo, con los días que faltan.
 *
 * @param {string} cultivoId
 * @param {number} dds  días desde la siembra
 * @returns {null | {actual: object, proxima: object|null, diasParaProxima: number|null}}
 */
export function estimarEtapa(cultivoId, dds) {
    const cultivo = CULTIVO_GDD_BY_ID[cultivoId];
    if (!cultivo || !Array.isArray(cultivo.fenologia) || cultivo.fenologia.length === 0) {
        return null;
    }
    const hitos = cultivo.fenologia;
    const d = Math.max(0, Math.trunc(dds || 0));
    let actual = hitos[0];
    let proxima = null;
    for (let i = 0; i < hitos.length; i += 1) {
        if (d >= hitos[i].dds) {
            actual = hitos[i];
            proxima = hitos[i + 1] || null;
        } else {
            proxima = proxima || hitos[i];
            break;
        }
    }
    // Si ya pasó el último hito, no hay próxima.
    if (d >= hitos[hitos.length - 1].dds) proxima = null;
    const diasParaProxima = proxima ? proxima.dds - d : null;
    return { actual, proxima, diasParaProxima };
}

/**
 * Compara el ritmo térmico (GDD/día) de dos pisos térmicos para el mismo
 * cultivo — la evidencia visible de "en tierra fría tarda más". Determinista.
 *
 * @param {string} cultivoId
 * @param {string} pisoCalidoId  piso más cálido (referencia)
 * @param {string} pisoFrioId    piso más frío (comparación)
 * @returns {null | {calido:number, frio:number, factor:number}}
 */
export function compararRitmo(cultivoId, pisoCalidoId, pisoFrioId) {
    const cultivo = CULTIVO_GDD_BY_ID[cultivoId];
    const pc = PISOS_TERMICOS.find((p) => p.id === pisoCalidoId);
    const pf = PISOS_TERMICOS.find((p) => p.id === pisoFrioId);
    if (!cultivo || !pc || !pf) return null;
    const calido = gddDia(pc.tmin, pc.tmax, cultivo.tb, cultivo.to);
    const frio = gddDia(pf.tmin, pf.tmax, cultivo.tb, cultivo.to);
    const factor = frio > 0 ? Math.round((calido / frio) * 10) / 10 : Infinity;
    return { calido: Math.round(calido * 10) / 10, frio: Math.round(frio * 10) / 10, factor };
}
