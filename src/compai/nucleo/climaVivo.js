/**
 * climaVivo — EL compAI REACCIONA AL CLIMA REAL. Núcleo portable (#111).
 *
 * "Vive el clima real": el compañero no comenta el clima como un dato frío
 * de boletín — REACCIONA a él, con el mismo lenguaje corporal que ya tiene
 * (aviso/preocupada = alerta digna, sin sirena). Pre-lluvia avisa/se
 * emociona; helada se abriga; sequía pide agua.
 *
 * REGLA DURA — anti-fabricación (misma de datosFinca.js / comentarista.js):
 * este módulo NO llama a ningún servicio de clima ni inventa un pronóstico.
 * Recibe el `forecast_7d` que YA trae el snapshot que el husmeo consume
 * (climaService.getCachedClimaSnapshot → openmeteo.forecast_7d), y sólo
 * reacciona si el dato es real. Sin snapshot → null (Angelita calla, no
 * inventa un aviso de "va a llover").
 *
 * UMBRALES — meteorología general, NO agronomía por especie (eso ya lo hace
 * outputGuards.js por cultivo con su temperatura mínima real). Aquí es
 * "¿el compañero se abriga o pide sombrilla", una reacción de compañía, no
 * un diagnóstico de cultivo:
 *   - helada:     temp_min_c de MAÑANA <= 2°C (umbral estándar de riesgo de
 *                 helada radiativa nocturna en Andes tropicales — no es la
 *                 temperatura letal de ninguna especie, es sentido común).
 *   - pre-lluvia: precip_mm de MAÑANA >= 5mm (lluvia que se nota, no llovizna).
 *   - sequía:     3 días seguidos (hoy + próximos 2) con precip_mm < 1mm Y
 *                 sin lluvia ya caída — proxy simple con lo que hay a mano
 *                 (el snapshot no trae acumulado histórico). Documentado como
 *                 heurística, no como balance hídrico real.
 *
 * @module compai/nucleo/climaVivo
 */

/** Umbral de riesgo de helada (°C), mañana. Ver nota de umbrales arriba. */
export const UMBRAL_HELADA_C = 2;
/** Umbral de "lluvia que se nota" (mm), mañana. */
export const UMBRAL_LLUVIA_MM = 5;
/** Umbral de "casi no llueve" (mm) para la racha de sequía. */
export const UMBRAL_SEQUIA_MM = 1;
/** Días seguidos secos para que cuente como sequía (hoy incluido). */
export const DIAS_SEQUIA = 3;

/**
 * @typedef {Object} ReaccionClima
 * @property {'helada'|'lluvia'|'sequia'} tipo
 * @property {string} mensaje — en usted, colombiano, sin voseo.
 * @property {'aviso'|'husmea'} estado — comportamiento sugerido al motor.
 * @property {'alta'|'media'|'baja'} severidad
 * @property {string} gesto — gesto/animación sugerida al cuerpo ('abriga'|
 *   'emociona'|'pideAgua'), que el host traduce a su repertorio visual.
 */

/**
 * Lee un día del forecast_7d con tolerancia a las dos formas de nombrar
 * campos que ya conviven en el código (ver hoyEnFincaService.buildClimaHoy).
 * @param {Array<Object>} forecast
 * @param {number} i
 */
function dia(forecast, i) {
  return Array.isArray(forecast) ? forecast[i] || null : null;
}

/**
 * Decide si el compañero debe reaccionar al clima de mañana, y cómo.
 * Pura, sin red: el caller le pasa el `forecast_7d` que ya tiene cacheado
 * (climaService.getCachedClimaSnapshot().openmeteo.forecast_7d).
 *
 * Prioridad cuando compiten varias señales: helada (riesgo real a la
 * planta) > lluvia fuerte > sequía — igual que el resto del motor, la
 * urgencia real manda.
 *
 * @param {Object} [input]
 * @param {Array<{temp_min_c?:number, precip_mm?:number}>} [input.forecast7d]
 *   — openmeteo.forecast_7d del snapshot (día 0 = hoy).
 * @returns {ReaccionClima|null} null si no hay dato real o no hay nada que reaccionar.
 */
export function reaccionAlClima({ forecast7d = [] } = {}) {
  if (!Array.isArray(forecast7d) || forecast7d.length === 0) return null;

  const manana = dia(forecast7d, 1) || dia(forecast7d, 0); // sin día 1, usa hoy (mejor que nada)
  if (!manana) return null;

  const tMin = Number(manana.temp_min_c);
  const precipManana = Number(manana.precip_mm);

  // ── Helada: la señal más urgente (riesgo real a lo sembrado) ──
  if (Number.isFinite(tMin) && tMin <= UMBRAL_HELADA_C) {
    return {
      tipo: 'helada',
      mensaje: 'Uy, mañana baja harto la temperatura — riesgo de helada. Yo ya me estoy abrigando. ¿Tapamos lo más sensible esta noche?',
      estado: 'aviso',
      severidad: 'alta',
      gesto: 'abriga',
    };
  }

  // ── Pre-lluvia: aviso amable, con algo de emoción (agua es buena noticia) ──
  if (Number.isFinite(precipManana) && precipManana >= UMBRAL_LLUVIA_MM) {
    return {
      tipo: 'lluvia',
      mensaje: 'Se viene agua mañana. Buena noticia para la finca — ¿revisamos que los drenajes estén libres, por si acaso?',
      estado: 'aviso',
      severidad: 'media',
      gesto: 'emociona',
    };
  }

  // ── Sequía: racha de días secos ──
  const dias = forecast7d.slice(0, DIAS_SEQUIA);
  const hayDatoSuficiente = dias.length === DIAS_SEQUIA
    && dias.every((d) => Number.isFinite(Number(d?.precip_mm)));
  const rachaSeca = hayDatoSuficiente
    && dias.every((d) => Number(d.precip_mm) < UMBRAL_SEQUIA_MM);
  if (rachaSeca) {
    return {
      tipo: 'sequia',
      mensaje: 'Llevamos varios días sin lluvia a la vista. Tengo sed por sus matas — ¿les damos un riego esta semana?',
      estado: 'aviso',
      severidad: 'baja',
      gesto: 'pideAgua',
    };
  }

  return null;
}

export default { reaccionAlClima, UMBRAL_HELADA_C, UMBRAL_LLUVIA_MM, UMBRAL_SEQUIA_MM, DIAS_SEQUIA };
