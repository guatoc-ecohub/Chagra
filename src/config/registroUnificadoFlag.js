/**
 * registroUnificadoFlag.js — feature flag del REGISTRO UNIFICADO (#23).
 *
 * Consolida las ~5 entradas sueltas de registro en finca (Semilleros, Cosechar,
 * Abonos e insumos, Labores/Mantenimiento, Bitácora + las voces dispersas) en
 * UNA sola puerta visible: el botón "Registrar" → flujo voz-primero con respaldo
 * manual adaptativo. Las pantallas viejas siguen vivas y accesibles
 * internamente (rutas cosechar/insumos/mantenimiento/germinacion intactas), pero
 * la ENTRADA visible del bloque "Registrar en la finca" pasa a ser una.
 *
 * Con la flag APAGADA (default/prod) el dashboard conserva su bloque actual con
 * los tiles separados: la feature se shippa "dark" a producción y se prueba en
 * dev encendiéndola. Misma doctrina y mismo parseo que
 * `fincaVivaHomePerfilActivo()` (fincaVivaHomeFlag.js) e `isSidecarEnabled()`.
 *
 * CÓMO ACTIVARLA (dev): poner en el `.env` (o `.env.local`) del frontend:
 *
 *     VITE_REGISTRO_UNIFICADO=true
 *
 * Acepta 'true' / '1' (case-insensitive, con espacios).
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @module registroUnificadoFlag
 */

const FLAG_KEY = 'VITE_REGISTRO_UNIFICADO';

/**
 * ¿Está activo el registro unificado (una sola puerta "Registrar")?
 *
 * @returns {boolean} true si la flag está encendida; false (default) en
 *   cualquier otro caso, incluido error de acceso a import.meta.env.
 */
export function registroUnificadoActivo() {
  try {
    const raw = import.meta.env?.[FLAG_KEY];
    if (raw === true) return true;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      return v === 'true' || v === '1';
    }
    return false;
  } catch (_) {
    return false;
  }
}

export default registroUnificadoActivo;
