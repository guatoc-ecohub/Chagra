/**
 * chivitoFlag.js — feature flag del CHIVITO DE PÁRAMO vivo (Oxypogon guerinii,
 * "barbudito paramuno"), dibujado 100% en SVG/CSS (cero assets, cero red,
 * offline-first, gama baja).
 *
 * Reemplaza, bajo la flag, al colibrí del A/B anterior (VITE_COLIBRI) en las
 * TRES piezas donde vive el ave insignia:
 *   1. HOME  → el chivito tomando néctar de la flor amarilla del frailejón
 *      (escena SVG animada, `ChivitoEscena`).
 *   2. BOTÓN → el chivito ES el botón de enviar / hablar del input del agente
 *      (`ChivitoBoton`, en el compositor del home, en AgentScreen y en el FAB).
 *   3. TRANSICIÓN home→agente → el chivito cruza aleteando (`ChivitoCruza`).
 *
 * El A/B de mockups ya se decidió (el operador eligió el detallado, hoy EL
 * chivito), así que la flag quedó como simple ON/OFF.
 *
 * CÓMO ACTIVARLO: en el `.env` (o `.env.local`) del frontend:
 *
 *     VITE_CHIVITO=true    → chivito ON en las 3 piezas.
 *
 * También acepta '1' y, por compatibilidad con configs previas del A/B,
 * 'a' / 'b' / 'ab' (todas = ON). Con la flag APAGADA (default, prod) cada
 * sitio conserva su presentación actual (colibrí SVG / avatar / video). Si
 * ambas flags están prendidas, el chivito tiene precedencia sobre
 * VITE_COLIBRI.
 *
 * Mismo criterio de parseo que `colibriRealActivo()` (colibriFlag.js) para
 * mantener la convención del repo. Español colombiano (usted), NUNCA voseo.
 *
 * @module chivitoFlag
 */

const FLAG_KEY = 'VITE_CHIVITO';

/**
 * ¿Está activo el chivito de páramo?
 *
 * @returns {boolean} true si la flag está prendida; false (default) si está
 *   apagada, con valor no reconocido o si import.meta.env falla.
 */
export function chivitoActivo() {
  try {
    const raw = import.meta.env?.[FLAG_KEY];
    if (raw == null) return false;
    const v = String(raw).trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'a' || v === 'b' || v === 'ab';
  } catch (_) {
    return false;
  }
}
