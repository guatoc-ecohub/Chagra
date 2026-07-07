/**
 * modoCampoFlag.js — feature flag del MODO CAMPO / MANOS LIBRES (#2088).
 *
 * "Hola Chagra" wake-word: el campesino tiene guantes o las manos
 * embarradas, activa "modo campo" (opt-in) y el celular escucha "hola
 * chagra" para abrir el widget de escucha existente (escuchaService.js)
 * sin tocar la pantalla. Motor: TF.js speech-commands (Apache-2.0,
 * on-device, offline). Ver spikes/wake-word/modo-campo-design.js (diseño
 * de referencia) y src/services/wakeWordService.js (implementación real).
 *
 * Con la flag APAGADA (default/prod) el modo campo no aparece en ningún
 * lado: la feature se shippa "dark" hasta que el operador la valide en
 * campo con voz real. Mismo patrón/parseo que `registroUnificadoActivo()`
 * (registroUnificadoFlag.js) y `fincaVivaHomePerfilActivo()`
 * (fincaVivaHomeFlag.js).
 *
 * CÓMO ACTIVARLA (dev): en el `.env` (o `.env.local`) del frontend:
 *
 *     VITE_MODO_CAMPO=true
 *
 * Acepta 'true' / '1' (case-insensitive, con espacios).
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @module modoCampoFlag
 */

const FLAG_KEY = 'VITE_MODO_CAMPO';

/**
 * ¿Está disponible el modo campo (wake-word "hola chagra")?
 *
 * @returns {boolean} true si la flag está encendida; false (default) en
 *   cualquier otro caso, incluido error de acceso a import.meta.env.
 */
export function modoCampoDisponible() {
  try {
    // El proyecto no tiene vite-env.d.ts (ImportMeta.env no está tipado en
    // ningún lado — mismo hueco preexistente que registroUnificadoFlag.js/
    // fincaVivaHomeFlag.js, tolerado en su baseline de tsc:check). Cast local
    // (no global: un `ImportMetaEnv` global cambió inferencia en archivos
    // no relacionados — InputLog.jsx/authService.js — de-riskeado en vivo
    // contra scripts/tsc-check-gate.mjs) para no heredar deuda nueva en un
    // archivo recién creado sin arrastrar ese efecto colateral a otros.
    const raw = /** @type {any} */ (import.meta).env?.[FLAG_KEY];
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

export default modoCampoDisponible;
