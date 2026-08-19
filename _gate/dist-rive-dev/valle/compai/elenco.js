/**
 * elenco — QUIÉN ACOMPAÑA AL USUARIO. Núcleo portable.
 *
 * El problema que cierra: hasta hoy había DOS llaves de compañero y DOS
 * elencos. El usuario elegía el oso en `3d.guatoc.co` (`guatoc.guia`), abría
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
  // El oso del bastón cruzó a la PWA el 2026-08-11 (OsoBaston.jsx: la dirección
  // CAMINANTE de la referencia aprobada — erguido, Cuphead de día, bastón
  // florecido de frailejón y orquídea — en el registro CREATURES).
  'oso-baston': { nombre: 'Oso del bastón', gentilicio: 'el oso del bastón', enPWA: true },
  // El jaguar cruzó a la PWA el 2026-08-11 (2.5D vivo: idle + paisaje del miedo):
  // Jaguar.jsx ya vive en src/visual/creatures y está en el registro CREATURES.
  jaguar: { nombre: 'Jaguar', gentilicio: 'el jaguar', enPWA: true },
  guacamaya: { nombre: 'Guacamaya', gentilicio: 'la guacamaya', enPWA: false },
  // 🔴 CORRECCIÓN DEL OPERADOR (2026-08-13, al aterrizar F24+F25): `chivito` y
  // `chivito-punk` eran DOS entradas para el mismo personaje — el pájaro del
  // páramo, normal quieto y con cresta sólo cuando habla, no dos esqueletos
  // distintos (F24 ya cablea `RIG_DE:{'chivito-punk':'chivito'}` — un solo
  // rig). Colapsadas a UNA: `chivito-punk` (el slug que ya usan
  // `onboarding.js`/`portales.js`/`marco.js`/`idleMachine.js`; no se
  // renombra la plomería). Quien tuviera guardado el `chivito` viejo migra
  // solo — ver `SLUGS_JUBILADOS` abajo.
  'chivito-punk': { nombre: 'Chivito', gentilicio: 'el chivito', enPWA: false },
  // Dante y Oliver NO SON GUÍAS COMPAI — son NPCs vivos del valle
  // (`perros-realistas.js`) y pilotos del Kart (`juegos/chagra-kart/js/
  // pilotos.js`), cada uno por su propio camino. El roster-8 de 2026-08-12
  // los había colado aquí por paridad con el Kart; se retiran de la lista de
  // guía-seleccionable — no se les monta rig de guía. Sin entrada aquí,
  // `normalizarCompanero('dante'|'oliver')` cae a `COMPANERO_DEFECTO`, igual
  // que cualquier slug desconocido — honesto: no eran guías, no hay a qué
  // migrarlos.
  // La luciérnaga cruzó a la PWA el 2026-08-11 (Luciernaga.jsx: escarabajo
  // bioluminiscente con la linterna-bioindicador, en el registro CREATURES).
  luciernaga: { nombre: 'Luciérnaga', gentilicio: 'la luciérnaga', enPWA: true },
};

/** Slugs jubilados que migran solos, sin que el usuario haga nada. */
export const SLUGS_JUBILADOS = {
  colibri: 'angelita', colibri_svg: 'angelita',
  // `chivito` (sin punk) era el mismo pájaro antes de la colapsada de arriba.
  chivito: 'chivito-punk',
};

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
