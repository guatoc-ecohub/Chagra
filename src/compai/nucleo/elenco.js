/**
 * elenco — QUIÉN ACOMPAÑA AL USUARIO. Núcleo portable.
 *
 * El problema que cierra: hasta hoy había DOS llaves de compañero y DOS
 * elencos. El usuario eligea el oso en `3d.guatoc.co` (`guatoc.guia`), abría
 * la PWA (`chagra:agent-avatar-type`) y lo recibía la abeja. Se rompía la
 * continuidad que ambos lados se habían esforzado en construir.
 *
 * Aquí vive la **llave canónica única** y la migración desde las dos viejas.
 * No se borra ninguna: se siguen escribiendo las dos por compatibilidad hacia
 * atrás (`escribirCompanero`), y se LEE con precedencia canónica → viejas.
 * Así ninguna instalación existente pierde su elección.
 *
 * Todos los avatares miden lo mismo — 14.2, el oso de referencia (SPEC). El
 * encaje real lo hace `getBBox` en cada stack; esta constante es el contrato.
 *
 * @module compai/nucleo/elenco
 */

/** La llave canónica del compañero. Una sola, para los dos stacks. */
export const LLAVE_COMPANERO = 'compai:companero';

/** Las llaves históricas, en orden de precedencia al migrar. */
export const LLAVES_HEREDADAS = ['chagra:agent-avatar-type', 'guatoc.guia'];

/** Tamaño canónico de todo avatar compAI — el oso es la referencia (SPEC). */
export const TAMANO_CANONICO = 14.2;

/**
 * El elenco completo. `enPWA` marca quién tiene hoy cuerpo dibujado en la
 * PWA; los demás existen en `3d.guatoc.co` y entran a la PWA cuando su arte
 * cruce (ítem #8 del listado). Un slug fuera de esta tabla no se acepta.
 */
export const ELENCO = {
  angelita: { nombre: 'Angelita', gentilicio: 'la abeja de la casa', enPWA: true },
  maiz: { nombre: 'Maíz', gentilicio: 'la planta de maíz', enPWA: true },
  // La zarigüeya entró al elenco de la PWA el 2026-07-25 (PR #2783, crías al
  // lomo) — DESPUÉS de que este núcleo se escribió el 2026-07-26 y se le
  // olvidó incluirla aquí. Sin esta entrada, normalizarCompanero('zariguya')
  // devolvía null y leerCompanero/escribirCompanero la rechazaban en
  // silencio: la tercera opción de useAgentAvatarType.js nunca sobrevivía
  // el cruce por el núcleo (bug encontrado cableando #96).
  zariguya: { nombre: 'Zarigüeya', gentilicio: 'la zarigüeya', enPWA: true },
  oso: { nombre: 'Oso andino', gentilicio: 'el oso andino', enPWA: false },
  jaguar: { nombre: 'Jaguar', gentilicio: 'el jaguar', enPWA: false },
  guacamaya: { nombre: 'Guacamaya', gentilicio: 'la guacamaya', enPWA: false },
  chivito: { nombre: 'Chivito', gentilicio: 'Chivito', enPWA: false },
  luciernaga: { nombre: 'Luciérnaga', gentilicio: 'la luciérnaga', enPWA: false },
};

/** Slugs jubilados que migran solos, sin que el usuario haga nada. */
export const SLUGS_JUBILADOS = { colibri: 'angelita', colibri_svg: 'angelita' };

/** El compañero por defecto cuando no hay ninguna elección guardada. */
export const COMPANERO_DEFECTO = 'angelita';

/**
 * Normaliza un slug: migra los jubilados, rechaza lo desconocido.
 * @param {string|null|undefined} slug
 * @returns {string|null}
 */
export function normalizarCompanero(slug) {
  if (!slug) return null;
  const s = String(slug).trim();
  if (ELENCO[s]) return s;
  if (SLUGS_JUBILADOS[s]) return SLUGS_JUBILADOS[s];
  return null;
}

/**
 * Lee el compañero elegido, mirando la llave canónica y, si está vacía, las
 * dos heredadas. Nunca lanza (modo privado, cuota llena).
 * @param {Storage} [storage] — inyectable para tests.
 * @returns {string} un slug válido del ELENCO (nunca null).
 */
export function leerCompanero(storage) {
  const st = storage || (typeof globalThis !== 'undefined' ? globalThis.localStorage : null);
  if (!st) return COMPANERO_DEFECTO;
  for (const llave of [LLAVE_COMPANERO, ...LLAVES_HEREDADAS]) {
    let crudo = null;
    try {
      crudo = st.getItem(llave);
    } catch {
      return COMPANERO_DEFECTO;
    }
    const ok = normalizarCompanero(crudo);
    if (ok) return ok;
  }
  return COMPANERO_DEFECTO;
}

/**
 * Guarda el compañero en la llave canónica **y** en las dos heredadas, para
 * que la elección cruce el salto 2D↔3D en los dos sentidos mientras las dos
 * bases desplegadas convivan.
 * @param {string} slug
 * @param {Storage} [storage]
 * @returns {string|null} el slug guardado, o null si no era válido.
 */
export function escribirCompanero(slug, storage) {
  const ok = normalizarCompanero(slug);
  if (!ok) return null;
  const st = storage || (typeof globalThis !== 'undefined' ? globalThis.localStorage : null);
  if (!st) return ok;
  for (const llave of [LLAVE_COMPANERO, ...LLAVES_HEREDADAS]) {
    try {
      st.setItem(llave, ok);
    } catch {
      /* modo privado: la sesión sigue con el valor en memoria */
    }
  }
  return ok;
}

export default { LLAVE_COMPANERO, ELENCO, leerCompanero, escribirCompanero, normalizarCompanero };
