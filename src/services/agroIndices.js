/**
 * agroIndices.js — los MOTORES DE ÍNDICE deterministas de la Página del Tiempo
 * (Fase 1 del DOSSIER, en cliente puro — patrón gradosDiaCalculator).
 * ============================================================================
 * Convierte el DATO CRUDO de agroMeteoService (ETo, HR, lluvia, temperatura,
 * horas de mojado) en DECISIÓN DE MANEJO por cultivo: ETc, balance hídrico
 * ("cuánta agua le falta"), VPD, presión de enfermedad (semáforo roya/gota/…),
 * anomalía. TODO son funciones puras (sin red, sin estado) → offline-first,
 * testeable y auditable.
 *
 * ANTI-ALUCINACIÓN (regla dura del DOSSIER, decisión operador #3):
 *   - La ETo es DATO real de Open-Meteo (FAO-56 nativo). La ETc = ETo × Kc; los
 *     Kc son de referencia FAO-56 (Doc. 56, Tabla 12), etiquetados con su
 *     confianza. Donde no hay Kc groundeado, se marca `kcConfianza:'baja'` y la
 *     UI lo dice — no se finge precisión.
 *   - Los umbrales de enfermedad citan su fuente (Cenicafé para roya; criterios
 *     tipo Smith/Hutton para gota). Los que aún no están dr-crosseados a CO se
 *     marcan `confianza:'media'` y lo declaran.
 *   - Ningún número se muestra sin fuente; lo que no se puede calcular hoy
 *     (falta el dato) es SlotPendiente en la UI, nunca un inventado.
 */

/* ─────────────────────────── VPD ─────────────────────────────────────────
 * Déficit de presión de vapor (kPa): "cuánta sed tiene el aire".
 * es(T) = 0.6108·exp(17.27·T/(T+237.3))  [Tetens, FAO-56 eq. 11]
 * VPD = es(T)·(1 − HR/100)
 */
export function presionVaporSaturado(tempC) {
    if (!Number.isFinite(tempC)) return null;
    return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

export function vpdKpa(tempC, rhPct) {
    const es = presionVaporSaturado(tempC);
    if (es == null || !Number.isFinite(rhPct)) return null;
    const rh = Math.min(100, Math.max(0, rhPct));
    return Math.round(es * (1 - rh / 100) * 100) / 100;
}

/** Lectura campesina del VPD (referencia agtech: <0.4 muy húmedo/hongo, 0.8–1.5 confort, >2 estrés). */
export function leerVpd(vpd) {
    if (vpd == null) return null;
    if (vpd < 0.4) return { nivel: 'humedo', texto: 'Aire muy húmedo — favorece hongos', color: 'sky' };
    if (vpd <= 1.6) return { nivel: 'confort', texto: 'Aire en confort para la planta', color: 'emerald' };
    if (vpd <= 2.2) return { nivel: 'seco', texto: 'Aire seco — la planta transpira fuerte', color: 'amber' };
    return { nivel: 'estres', texto: 'Aire muy seco — estrés hídrico', color: 'red' };
}

/* ─────────────────────── ETc y balance hídrico ───────────────────────────
 * ETc = ETo × Kc(etapa). Balance = lluvia − ETc. "Cuánta agua le falta" hoy.
 */
export function etcMm(etoMm, kc) {
    if (!Number.isFinite(etoMm) || !Number.isFinite(kc)) return null;
    return Math.round(etoMm * kc * 10) / 10;
}

/**
 * Balance hídrico simple del día: aporte (lluvia) − demanda (ETc).
 * @returns {{faltaMm:number, netoMm:number, estado:'cubierto'|'justo'|'riego'|'exceso', mensaje:string}|null}
 */
export function balanceHidricoDia(precipMm, etcMm_) {
    if (!Number.isFinite(etcMm_)) return null;
    const p = Number.isFinite(precipMm) ? precipMm : 0;
    const neto = Math.round((p - etcMm_) * 10) / 10;
    const falta = Math.max(0, Math.round((etcMm_ - p) * 10) / 10);
    let estado;
    let mensaje;
    if (p >= etcMm_ * 3 && etcMm_ > 0) {
        estado = 'exceso';
        mensaje = 'Llueve mucho más de lo que consume — cuide el drenaje.';
    } else if (neto >= 0) {
        estado = 'cubierto';
        mensaje = 'La lluvia cubre lo que el cultivo consume hoy.';
    } else if (falta <= 2) {
        estado = 'justo';
        mensaje = `Va justo: le falta ${falta} mm para cubrir el día.`;
    } else {
        estado = 'riego';
        mensaje = `Le faltan ${falta} mm hoy — considere regar.`;
    }
    return { faltaMm: falta, netoMm: neto, estado, mensaje };
}

/** Déficit hídrico acumulado de una ventana de N días (suma de faltas diarias). */
export function deficitAcumulado(dias) {
    if (!Array.isArray(dias)) return null;
    let acc = 0;
    let n = 0;
    for (const d of dias) {
        if (Number.isFinite(d?.faltaMm)) {
            acc += d.faltaMm;
            n += 1;
        }
    }
    return n ? { faltaMm: Math.round(acc * 10) / 10, dias: n } : null;
}

/* ───────────────────────── HORAS-FRÍO ────────────────────────────────────
 * Conteo simple de porciones horarias por debajo de 7 °C. La serie puede ser
 * el array `temperature_2m` de Open-Meteo, un array de muestras numéricas o
 * muestras con `temperature_2m`/`temperature`.
 */
export function horasFrio(serieHoraria, umbralC = 7) {
    if (!Number.isFinite(umbralC)) return null;
    const muestras = Array.isArray(serieHoraria)
        ? serieHoraria
        : serieHoraria?.temperature_2m;
    if (!Array.isArray(muestras)) return null;

    return muestras.reduce((total, muestra) => {
        const temp = typeof muestra === 'number'
            ? muestra
            : muestra?.temperature_2m ?? muestra?.temperature;
        return total + (Number.isFinite(temp) && temp < umbralC ? 1 : 0);
    }, 0);
}

/* ───────────────────────────── SPI ───────────────────────────────────────
 * SPI aquí significa la anomalía estandarizada solicitada por el producto:
 * (precipitación observada − media histórica) / desviación histórica.
 * La distribución histórica la entrega el archivo de Open-Meteo; sin media o
 * desviación válidas se devuelve null para que la UI use SlotPendiente.
 */
export function spi(precipMm, historico, desviacion = undefined) {
    if (!Number.isFinite(precipMm)) return null;

    const media = typeof historico === 'number'
        ? historico
        : historico?.precip_dia_normal ?? historico?.media ?? historico?.mean;
    const desv = typeof historico === 'number'
        ? desviacion
        : historico?.precip_dia_desv ?? historico?.desviacion ?? historico?.standardDeviation ?? historico?.stddev;

    if (!Number.isFinite(media) || !Number.isFinite(desv) || desv <= 0) return null;
    return Math.round(((precipMm - media) / desv) * 100) / 100;
}

/* ───────────────────────────── SPEI ─────────────────────────────────────
 * SPEI es el SPI aplicado al balance hídrico (precipitación − PET/ETc), no a
 * la precipitación cruda. La serie se acumula en la ventana antes de
 * estandarizarla, de modo que un déficit sostenido conserva signo negativo.
 * Acepta números netos, resultados de balanceHidricoDia() o días con
 * `precipMm`/`etcMm` (también sus nombres normalizados con guion bajo).
 * La normal debe describir el balance de la misma ventana y traer media y
 * desviación, igual que spi().
 */
function balanceNetoDeDia(dia) {
    if (Number.isFinite(dia)) return dia;
    if (Number.isFinite(dia?.netoMm)) return dia.netoMm;

    const precip = dia?.precipMm ?? dia?.precip_mm ?? dia?.precip ?? dia?.precipitation;
    const etc = dia?.etcMm ?? dia?.etc_mm ?? dia?.etc;
    if (!Number.isFinite(precip) || !Number.isFinite(etc)) return null;
    return balanceHidricoDia(precip, etc)?.netoMm ?? null;
}

function balanceAcumulado(serie) {
    if (Number.isFinite(serie)) return serie;
    if (serie && typeof serie === 'object' && !Array.isArray(serie)) return balanceNetoDeDia(serie);
    if (!Array.isArray(serie)) return null;
    let acumulado = 0;
    let dias = 0;
    for (const dia of serie) {
        const neto = balanceNetoDeDia(dia);
        if (Number.isFinite(neto)) {
            acumulado += neto;
            dias += 1;
        }
    }
    return dias ? acumulado : null;
}

export function spei(serieBalance, historico, desviacion = undefined) {
    const acumulado = balanceAcumulado(serieBalance);
    if (!Number.isFinite(acumulado)) return null;

    const media = typeof historico === 'number'
        ? historico
        : historico?.balance_acumulado_normal
            ?? historico?.balance_hidrico_acumulado_normal
            ?? historico?.balance_normal
            ?? historico?.balance_hidrico_normal
            ?? historico?.balance_dia_normal
            ?? historico?.balanceNormal
            ?? historico?.balanceMmNormal
            ?? historico?.media
            ?? historico?.mean;
    const desv = typeof historico === 'number'
        ? desviacion
        : historico?.balance_acumulado_desv
            ?? historico?.balance_hidrico_acumulado_desv
            ?? historico?.balance_desv
            ?? historico?.balance_hidrico_desv
            ?? historico?.balance_dia_desv
            ?? historico?.balanceDesv
            ?? historico?.balanceMmDesv
            ?? historico?.desviacion
            ?? historico?.standardDeviation
            ?? historico?.stddev;

    if (!Number.isFinite(media) || !Number.isFinite(desv) || desv <= 0) return null;
    return Math.round(((acumulado - media) / desv) * 100) / 100;
}

/* ─────────────────────────── ANOMALÍA ────────────────────────────────────
 * Hoy vs. la normal (media histórica). Hace TANGIBLE el ENSO.
 */
export function anomalia(tempMediaHoy, precipHoy, normales) {
    if (!normales || !Number.isFinite(tempMediaHoy)) return null;
    const dT = Math.round((tempMediaHoy - normales.temp_media_normal) * 10) / 10;
    let dPrecipPct = null;
    if (Number.isFinite(precipHoy) && Number.isFinite(normales.precip_dia_normal) && normales.precip_dia_normal > 0.2) {
        dPrecipPct = Math.round(((precipHoy - normales.precip_dia_normal) / normales.precip_dia_normal) * 100);
    }
    const frases = [];
    if (Math.abs(dT) >= 0.5) {
        frases.push(`${Math.abs(dT)} °C ${dT > 0 ? 'sobre' : 'bajo'} lo normal`);
    } else {
        frases.push('temperatura como de costumbre');
    }
    if (dPrecipPct != null && Math.abs(dPrecipPct) >= 15) {
        frases.push(`${Math.abs(dPrecipPct)} % ${dPrecipPct > 0 ? 'más húmedo' : 'más seco'}`);
    }
    return { tempDelta: dT, precipPctDelta: dPrecipPct, frases, fuente: normales.source };
}

/* ───────────────── MODELOS DE PRESIÓN DE ENFERMEDAD ───────────────────────
 * Semáforo climático: el clima predice el brote ANTES de que aparezca. Cada
 * modelo cita su fuente y su confianza. La lógica es un scorer común: la
 * enfermedad necesita (a) temperatura en su rango favorable y (b) mojado foliar
 * (horas con HR ≥ 90 % — rocío/lluvia). Verde = clima desfavorable al hongo;
 * rojo = clima que dispara la infección.
 */
export const MODELOS_ENFERMEDAD = Object.freeze({
    roya_cafe: {
        nombre: 'Roya del café',
        patogeno: 'Hemileia vastatrix',
        tempFav: [18, 26], // óptimo de germinación/infección
        tempTol: [15, 28],
        mojado: { amarillo: 4, rojo: 6 }, // horas HR≥90 (mojado foliar)
        favorece: 'Temperatura templada + mojado foliar (rocío/lluvia) + nubosidad persistente.',
        alivio: 'El Niño (menos nubosidad y mojado) BAJA la roya — una de sus pocas buenas noticias.',
        fuente: 'Cenicafé · RustOnt (DOI 10.3390/s22249598)',
        confianza: 'alta',
    },
    gota_papa: {
        nombre: 'Gota (tizón tardío) de la papa',
        patogeno: 'Phytophthora infestans',
        tempFav: [10, 22],
        tempTol: [8, 24],
        mojado: { amarillo: 6, rojo: 10 }, // criterio tipo Smith: ≥10-11 h HR≥90
        favorece: 'Fresco (10–22 °C) + HR > 90 % sostenida (mojado foliar). Sube con La Niña.',
        alivio: 'El tiempo seco y cálido de El Niño reduce la gota, salvo rocío de madrugada despejada.',
        fuente: 'Criterio tipo Smith/Hutton · Agrosavia (umbral exacto CO: dr-cross pendiente)',
        confianza: 'media',
    },
    tizon_tomate: {
        nombre: 'Tizón tardío del tomate',
        patogeno: 'Phytophthora infestans',
        tempFav: [12, 24],
        tempTol: [10, 26],
        mojado: { amarillo: 6, rojo: 10 },
        favorece: 'Fresco-húmedo + mojado foliar largo. Mismo hongo que la gota de la papa.',
        fuente: 'Criterio tipo Smith · analogía P. infestans (dr-cross pendiente)',
        confianza: 'media',
    },
    monilia_cacao: {
        nombre: 'Monilia del cacao',
        patogeno: 'Moniliophthora roreri',
        tempFav: [22, 27],
        tempTol: [18, 30],
        mojado: { amarillo: 5, rojo: 8 },
        favorece: 'Cálido-húmedo (22–27 °C) + lluvia/mojado en mazorca joven.',
        fuente: 'Literatura cacao CO (confianza media — dr-cross pendiente)',
        confianza: 'media',
    },
    sigatoka_platano: {
        nombre: 'Sigatoka del plátano',
        patogeno: 'Pseudocercospora/Mycosphaerella',
        tempFav: [25, 28],
        tempTol: [20, 32],
        mojado: { amarillo: 5, rojo: 8 },
        favorece: 'Cálido + hoja mojada persistente + lluvia frecuente.',
        fuente: 'Literatura Musa CO (confianza media — dr-cross pendiente)',
        confianza: 'media',
    },
    antracnosis: {
        nombre: 'Antracnosis',
        patogeno: 'Colletotrichum spp.',
        tempFav: [20, 27],
        tempTol: [15, 30],
        mojado: { amarillo: 5, rojo: 8 },
        favorece: 'Cálido-húmedo + mojado en fruto (mora, lulo, tomate de árbol, cítricos).',
        fuente: 'Literatura Colletotrichum (confianza media — dr-cross pendiente)',
        confianza: 'media',
    },
});

/**
 * Evalúa el semáforo de presión de una enfermedad dado el clima del día.
 * @param {string} enfKey clave de MODELOS_ENFERMEDAD
 * @param {{tempMedia:number, horasMojado:number, precipMm?:number}} clima
 * @returns {{nivel:'verde'|'amarillo'|'rojo', modelo:object, razon:string}|null}
 */
export function presionEnfermedad(enfKey, clima) {
    const m = MODELOS_ENFERMEDAD[enfKey];
    if (!m || !clima) return null;
    const t = clima.tempMedia;
    const mojado = Number.isFinite(clima.horasMojado) ? clima.horasMojado : 0;
    if (!Number.isFinite(t)) return null;

    const enOptimo = t >= m.tempFav[0] && t <= m.tempFav[1];
    const enTolerancia = t >= m.tempTol[0] && t <= m.tempTol[1];

    let nivel = 'verde';
    let razon;
    if (!enTolerancia) {
        nivel = 'verde';
        razon = `Temperatura (${Math.round(t)} °C) fuera del rango del hongo — presión baja.`;
    } else if (mojado < m.mojado.amarillo) {
        nivel = 'verde';
        razon = `Poco mojado foliar (${mojado} h con HR≥90) — el hongo no infecta seco.`;
    } else if (enOptimo && mojado >= m.mojado.rojo) {
        nivel = 'rojo';
        razon = `Temperatura ideal (${Math.round(t)} °C) + ${mojado} h de hoja mojada — condiciones de brote.`;
    } else {
        nivel = 'amarillo';
        razon = `Clima parcialmente favorable (${Math.round(t)} °C, ${mojado} h mojado) — vigile de cerca.`;
    }
    return { nivel, modelo: m, razon };
}

/* ─────────────────────── REGISTRO DE CULTIVOS ─────────────────────────────
 * Mapea el cultivo del campesino (texto libre del perfil) a su ficha agronómica:
 * Kc de referencia FAO-56 (con confianza), enfermedades clima-dependientes,
 * y el enlace al reloj térmico (gradosDiaCalculator) donde hay Tb groundeada.
 *
 * Kc: FAO-56, Irrigation & Drainage Paper 56, Tabla 12 (valores de referencia,
 * ajustables por el técnico). `kcConfianza:'alta'` = en la tabla FAO-56;
 * 'media' = adaptado; 'baja' = estimado fuera de FAO-56 (se declara en UI).
 */
export const CULTIVOS_AGRO = Object.freeze({
    cafe: {
        nombre: 'Café', emoji: '☕', kc: { ini: 0.9, mid: 0.95, end: 0.95 }, kcConfianza: 'media',
        kcFuente: 'FAO-56 (café con arvenses ~0.9–1.05)', enfermedades: ['roya_cafe'], gddId: null,
        piso: 'templado', aguaNota: 'El café pide sombrío y mulch; el estrés hídrico dispara broca.',
    },
    papa: {
        nombre: 'Papa', emoji: '🥔', kc: { ini: 0.5, mid: 1.15, end: 0.75 }, kcConfianza: 'alta',
        kcFuente: 'FAO-56 Tabla 12 (papa)', enfermedades: ['gota_papa'], gddId: 'papa',
        piso: 'frio', aguaNota: 'En altiplano despejado, ojo con la helada de madrugada.',
    },
    maiz: {
        nombre: 'Maíz', emoji: '🌽', kc: { ini: 0.3, mid: 1.2, end: 0.6 }, kcConfianza: 'alta',
        kcFuente: 'FAO-56 Tabla 12 (maíz de grano)', enfermedades: [], gddId: 'maiz',
        piso: 'templado', aguaNota: 'Sensible a la sequía en floración (aborto de espiga).',
    },
    tomate: {
        nombre: 'Tomate', emoji: '🍅', kc: { ini: 0.6, mid: 1.15, end: 0.8 }, kcConfianza: 'alta',
        kcFuente: 'FAO-56 Tabla 12 (tomate)', enfermedades: ['tizon_tomate', 'antracnosis'], gddId: null,
        piso: 'templado', aguaNota: 'UV alto quema el fruto; riego constante evita rajado.',
    },
    frijol: {
        nombre: 'Fríjol', emoji: '🫘', kc: { ini: 0.4, mid: 1.15, end: 0.35 }, kcConfianza: 'alta',
        kcFuente: 'FAO-56 Tabla 12 (fríjol seco)', enfermedades: ['antracnosis'], gddId: null,
        piso: 'templado', aguaNota: 'Sufre con el agua parada; camas altas en La Niña.',
    },
    platano: {
        nombre: 'Plátano', emoji: '🍌', kc: { ini: 0.5, mid: 1.1, end: 1.0 }, kcConfianza: 'alta',
        kcFuente: 'FAO-56 Tabla 12 (banano, año 1)', enfermedades: ['sigatoka_platano'], gddId: null,
        piso: 'calido', aguaNota: 'La racha fuerte tumba la mata; tutore y drene.',
    },
    cacao: {
        nombre: 'Cacao', emoji: '🍫', kc: { ini: 1.0, mid: 1.05, end: 1.05 }, kcConfianza: 'media',
        kcFuente: 'FAO-56 (cacao ~1.0–1.05)', enfermedades: ['monilia_cacao'], gddId: null,
        piso: 'calido', aguaNota: 'Necesita sombrío; la monilia sube con lluvia en mazorca joven.',
    },
    cebolla: {
        nombre: 'Cebolla', emoji: '🧅', kc: { ini: 0.7, mid: 1.05, end: 0.75 }, kcConfianza: 'alta',
        kcFuente: 'FAO-56 Tabla 12 (cebolla seca)', enfermedades: [], gddId: null,
        piso: 'frio', aguaNota: 'Riego parejo; corte el riego cerca de la cosecha para curar el bulbo.',
    },
    arroz: {
        nombre: 'Arroz', emoji: '🌾', kc: { ini: 1.05, mid: 1.2, end: 0.9 }, kcConfianza: 'alta',
        kcFuente: 'FAO-56 Tabla 12 (arroz de inundación)', enfermedades: [], gddId: null,
        piso: 'calido', aguaNota: 'Alta demanda de agua; crítico en El Niño.',
    },
    cana: {
        nombre: 'Caña', emoji: '🎋', kc: { ini: 0.4, mid: 1.25, end: 0.75 }, kcConfianza: 'alta',
        kcFuente: 'FAO-56 Tabla 12 (caña de azúcar)', enfermedades: [], gddId: null,
        piso: 'calido', aguaNota: 'Cultivo de altísima demanda hídrica.',
    },
    yuca: {
        nombre: 'Yuca', emoji: '🥔', kc: { ini: 0.3, mid: 0.8, end: 0.5 }, kcConfianza: 'media',
        kcFuente: 'FAO-56 (yuca, año 1 ~0.8)', enfermedades: [], gddId: null,
        piso: 'calido', aguaNota: 'Aguanta seco mejor que casi todo; ideal para El Niño.',
    },
    mora: {
        nombre: 'Mora', emoji: '🫐', kc: { ini: 0.3, mid: 1.05, end: 0.5 }, kcConfianza: 'media',
        kcFuente: 'FAO-56 (berries ~1.05)', enfermedades: ['antracnosis'], gddId: null,
        piso: 'frio', aguaNota: 'Poda y buen drenaje; la antracnosis mancha el fruto.',
    },
    aguacate: {
        nombre: 'Aguacate', emoji: '🥑', kc: { ini: 0.6, mid: 0.85, end: 0.75 }, kcConfianza: 'baja',
        kcFuente: 'Estimado (fuera de FAO-56 Tabla 12)', enfermedades: [], gddId: null,
        piso: 'templado', aguaNota: 'Sensible al encharcamiento (pudrición de raíz).',
    },
    lulo: {
        nombre: 'Lulo', emoji: '🟠', kc: { ini: 0.5, mid: 1.0, end: 0.8 }, kcConfianza: 'baja',
        kcFuente: 'Estimado (fuera de FAO-56 Tabla 12)', enfermedades: ['antracnosis'], gddId: null,
        piso: 'templado', aguaNota: 'Sombra parcial; la antracnosis lo golpea fuerte.',
    },
    pasto: {
        nombre: 'Pasto / potrero', emoji: '🌿', kc: { ini: 0.9, mid: 0.95, end: 0.95 }, kcConfianza: 'media',
        kcFuente: 'FAO-56 (pastura); es la referencia de la ETo', enfermedades: [], gddId: null,
        piso: 'templado', aguaNota: 'Ajuste la carga animal según el crecimiento del pasto.',
    },
});

/** Sinónimos campesinos → clave de CULTIVOS_AGRO. */
const SINONIMOS = Object.freeze({
    cafe: 'cafe', café: 'cafe', cafeto: 'cafe',
    papa: 'papa', papas: 'papa',
    maiz: 'maiz', maíz: 'maiz', choclo: 'maiz', mazorca: 'maiz',
    tomate: 'tomate', jitomate: 'tomate',
    frijol: 'frijol', fríjol: 'frijol', frijoles: 'frijol', habichuela: 'frijol', poroto: 'frijol',
    platano: 'platano', plátano: 'platano', banano: 'platano', guineo: 'platano',
    cacao: 'cacao',
    cebolla: 'cebolla', cebollin: 'cebolla', cebollín: 'cebolla',
    arroz: 'arroz',
    cana: 'cana', caña: 'cana', 'caña de azucar': 'cana',
    yuca: 'yuca', mandioca: 'yuca',
    mora: 'mora', mortiño: 'mora', arandano: 'mora', arándano: 'mora', fresa: 'mora', frutilla: 'mora',
    aguacate: 'aguacate', palta: 'aguacate',
    lulo: 'lulo', naranjilla: 'lulo',
    pasto: 'pasto', potrero: 'pasto', pastura: 'pasto', forraje: 'pasto', ganado: 'pasto',
});

/**
 * Parsea el texto libre de `cultivos_actuales` del perfil ("Café, mora, tomate")
 * a fichas de cultivo. Devuelve `{cultivos:[{key,...ficha, rawNombre}], sinFicha:[...]}`.
 * Los cultivos sin ficha se conservan como nombre crudo (la UI los muestra con
 * SlotPendiente en vez de inventar sus números).
 * @param {string} texto
 */
export function parseCultivos(texto) {
    const cultivos = [];
    const sinFicha = [];
    if (!texto || typeof texto !== 'string') return { cultivos, sinFicha };
    const partes = texto
        .split(/[,;/·|\n]+| y | e /i)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    const vistos = new Set();
    for (const parte of partes) {
        // Match por palabra: busca cualquier sinónimo contenido en el trozo.
        let key = SINONIMOS[parte];
        if (!key) {
            for (const [syn, k] of Object.entries(SINONIMOS)) {
                if (parte.includes(syn)) { key = k; break; }
            }
        }
        if (key && CULTIVOS_AGRO[key] && !vistos.has(key)) {
            vistos.add(key);
            cultivos.push({ key, rawNombre: parte, ...CULTIVOS_AGRO[key] });
        } else if (!key && parte.length > 1) {
            sinFicha.push(parte);
        }
    }
    return { cultivos, sinFicha };
}

/** Kc de la etapa (por ahora demanda plena = Kc medio; refinable con fecha de siembra). */
export function kcDeCultivo(ficha, etapaId = 'mid') {
    if (!ficha?.kc) return null;
    return ficha.kc[etapaId] ?? ficha.kc.mid ?? null;
}

/** Amplitud térmica diurna (señal de helada radiativa / quemado). */
export function amplitudTermica(tmax, tmin) {
    if (!Number.isFinite(tmax) || !Number.isFinite(tmin)) return null;
    return Math.round((tmax - tmin) * 10) / 10;
}

/** Lectura campesina del índice UV (escala OMS). */
export function leerUv(uv) {
    if (!Number.isFinite(uv)) return null;
    if (uv < 3) return { nivel: 'bajo', texto: 'Bajo', color: 'emerald' };
    if (uv < 6) return { nivel: 'moderado', texto: 'Moderado', color: 'amber' };
    if (uv < 8) return { nivel: 'alto', texto: 'Alto — sombrero y agua', color: 'orange' };
    if (uv < 11) return { nivel: 'muyalto', texto: 'Muy alto — protéjase', color: 'red' };
    return { nivel: 'extremo', texto: 'Extremo — evite el sol del mediodía', color: 'red' };
}
