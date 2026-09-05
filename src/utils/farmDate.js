/**
 * farmDate.js — "hoy" en el calendario de la FINCA (zona horaria del campo).
 *
 * BUG TODAY-UTC-HELADA-20260905 (extiende BUG-DIA-UTC-20260904 de
 * agroMeteoService): el día que la app elige como "hoy" en un pronóstico
 * diario debe resolverse en la zona horaria de la FINCA, no en la del
 * navegador ni en la de UTC del runtime.
 *
 * Colombia (única geografía que Chagra sirve hoy) es UTC-5 fijo, sin horario
 * de verano: entre las 19:00 y medianoche hora local el reloj en UTC ya marca
 * el día siguiente, y un resolvedor que use `now.getFullYear()/getDate()` en
 * un runtime que no es la finca lee el pronóstico de MAÑANA como si fuera
 * esta noche — justo la ventana en la que se avisa una helada (que ocurre de
 * madrugada y el aviso debe darse la noche anterior).
 *
 * REGLA (espejo de #3142): el offset de la finca se recibe por parámetro
 * cuando el dato viene en la respuesta del proveedor (`utc_offset_seconds` de
 * Open-Meteo, como hace agroMeteoService). Para los snapshots del sidecar que
 * NO traen offset, el default es Colombia (UTC-5), la única geografía del
 * producto; si un día se sirve otra región, este módulo debe pasar a leer el
 * offset del snapshot en lugar del default.
 */

/** Offset de la finca (Colombia, UTC-5 fijo sin DST) en segundos. */
export const FINCA_UTC_OFFSET_SECONDS = -5 * 60 * 60;

/**
 * Fecha ISO YYYY-MM-DD de un instante EN EL CALENDARIO DE LA FINCA.
 * Independiente de la zona horaria del runtime: suma el offset de la finca al
 * epoch y lee la fecha resultante en UTC (técnica idéntica a
 * agroMeteoService.localIsoDate). Sin offset válido no inventa ninguno: si el
 * caller tiene el offset del proveedor lo pasa; el default es Colombia.
 *
 * @param {Date|number} [date] instante (Date o epoch ms); default: ahora.
 * @param {number} [utcOffsetSeconds] offset de la finca; default Colombia.
 * @returns {string} 'YYYY-MM-DD' en el calendario de la finca.
 */
export function fincaDateISO(date = new Date(), utcOffsetSeconds = FINCA_UTC_OFFSET_SECONDS) {
    const ms = date instanceof Date ? date.getTime() : Number(date);
    if (!Number.isFinite(ms)) return '';
    if (!Number.isFinite(utcOffsetSeconds)) return '';
    return new Date(ms + utcOffsetSeconds * 1000).toISOString().slice(0, 10);
}
