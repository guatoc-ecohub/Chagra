/**
 * cooldowns — MEMORIA DE COOLDOWS COMPARTIDA ENTRE 2D Y 3D. Núcleo portable.
 *
 * El problema que cierra: hasta hoy los cooldowns de los mensajes del compañero
 * vivían bajo 'chagra:angelita:antimolestia', una llave específica de Angelita.
 * Esto significaba que si el usuario tenía el jaguar en 3D y luego abría la PWA
 * con la abeja, los cooldowns NO cruzaban — el compañero repetía el mismo tip.
 *
 * Aquí vive la **llave canónica única** para cooldowns de todos los compañeros,
 * con migración desde la llave histórica de Angelita. No se borra ninguna: se
 * sigue escribiendo la vieja por compatibilidad hacia atrás, y se LEE con
 * precedencia canónica → vieja.
 *
 * @module compai/nucleo/cooldowns
 */

/** La llave canónica de cooldowns. Una sola, para todos los compañeros. */
export const LLAVE_COOLDOWNS = 'compai:cooldowns';

/** La llave histórica de Angelita, en orden de precedencia al migrar. */
export const LLAVE_HEREDADA_ANGELITA = 'chagra:angelita:antimolestia';

/**
 * Lee los cooldowns del compañero, mirando la llave canónica y, si está vacía,
 * la heredada. Nunca lanza (modo privado, cuota llena).
 * @param {Storage} [storage] — inyectable para tests.
 * @returns {Record<string, number>} cooldowns { [llave]: timestampMs }.
 */
export function leerCooldowns(storage) {
  const st = storage || (typeof globalThis !== 'undefined' ? globalThis.localStorage : null);
  if (!st) return {};

  // Intentar leer la llave canónica primero
  let crudo = null;
  try {
    crudo = st.getItem(LLAVE_COOLDOWNS);
  } catch {
    // Modo privado: fallar silenciosamente
  }

  if (crudo) {
    try {
      const parseado = JSON.parse(crudo);
      if (parseado && typeof parseado === 'object') {
        return parseado;
      }
    } catch {
      // Si falla el parse, intentar la llave heredada
    }
  }

  // Si la llave canónica no existe o falla, intentar la heredada
  try {
    const heredado = st.getItem(LLAVE_HEREDADA_ANGELITA);
    if (heredado) {
      const parseado = JSON.parse(heredado);
      if (parseado && parseado.state && typeof parseado.state === 'object') {
        // La llave heredada tiene estructura { state: { ultimaHablaPorLlave: {...} } }
        return parseado.state.ultimaHablaPorLlave || {};
      }
    }
  } catch {
    // Modo privado: fallar silenciosamente
  }

  return {};
}

/**
 * Guarda los cooldowns en la llave canónica **y** en la heredada, para que
 * la elección cruce el salto 2D↔3D en los dos sentidos mientras las dos
 * bases desplegadas convivan.
 * @param {Record<string, number>} cooldowns
 * @param {Storage} [storage]
 * @returns {Record<string, number>} los cooldowns guardados.
 */
export function escribirCooldowns(cooldowns, storage) {
  if (!cooldowns || typeof cooldowns !== 'object') {
    return cooldowns || {};
  }

  const st = storage || (typeof globalThis !== 'undefined' ? globalThis.localStorage : null);
  if (!st) return cooldowns;

  // Escribir en la llave canónica
  try {
    st.setItem(LLAVE_COOLDOWNS, JSON.stringify(cooldowns));
  } catch {
    /* modo privado: la sesión sigue con el valor en memoria */
  }

  // Escribir en la llave heredada por compatibilidad
  try {
    const estadoHeredado = {
      state: {
        ultimaHablaPorLlave: cooldowns,
        ultimoLogroId: null,
        ultimoLutoId: null,
        silenciado: false,
        molestia: 0,
        hoyNoFecha: null,
      },
    };
    st.setItem(LLAVE_HEREDADA_ANGELITA, JSON.stringify(estadoHeredado));
  } catch {
    /* modo privado: la sesión sigue con el valor en memoria */
  }

  return cooldowns;
}

export default { LLAVE_COOLDOWNS, LLAVE_HEREDADA_ANGELITA, leerCooldowns, escribirCooldowns };
