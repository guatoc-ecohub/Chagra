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
  // El MAÍZ se retiró del selector el 2026-08-14 (unificación compAI a los 7
  // canónicos: angelita/jaguar/oso/zariguya/luciernaga/chivito-punk/guacamaya
  // — decisión del operador). Ya NO es una entrada del elenco: quien lo tenga
  // guardado migra solo a Angelita vía SLUGS_JUBILADOS, abajo. El cuerpo 3D
  // (MaizCompai/MaizCompaiEscena) sigue existiendo en el código — solo se
  // retira como opción elegible.
  //
  // La zarigüeya entró al elenco de la PWA el 2026-07-25 (PR #2783, crías al
  // lomo) — DESPUÉS de que este núcleo se escribió el 2026-07-26 y se le
  // olvidó incluirla aquí. Sin esta entrada, normalizarCompanero('zariguya')
  // devolvía null y leerCompanero/escribirCompanero la rechazaban en
  // silencio: la tercera opción de useAgentAvatarType.js nunca sobrevivía
  // el cruce por el núcleo (bug encontrado cableando #96).
  zariguya: { nombre: 'Zarigüeya', gentilicio: 'la zarigüeya', enPWA: true },
  // 'oso' (Oso andino genérico) NUNCA tuvo cuerpo propio en la PWA — sigue
  // sin uno a propósito (decisión del operador 2026-08-14: "NO crees un oso
  // nuevo"). El oso SELECCIONABLE es 'oso-baston' (abajo): mismo animal
  // (Tremarctos ornatus), la identidad ya aprobada, etiqueta visible "Oso de
  // anteojos" en el selector (AgentAvatarSelector.jsx).
  oso: { nombre: 'Oso andino', gentilicio: 'el oso andino', enPWA: false },
  // El oso del bastón cruzó a la PWA el 2026-08-11 (OsoBaston.jsx: la dirección
  // CAMINANTE de la referencia aprobada — erguido, Cuphead de día, bastón
  // florecido de frailejón y orquídea — en el registro CREATURES).
  'oso-baston': { nombre: 'Oso del bastón', gentilicio: 'el oso del bastón', enPWA: true },
  // El jaguar cruzó a la PWA el 2026-08-11 (2.5D vivo: idle + paisaje del miedo):
  // Jaguar.jsx ya vive en src/visual/creatures y está en el registro CREATURES.
  jaguar: { nombre: 'Jaguar', gentilicio: 'el jaguar', enPWA: true },
  // La guacamaya cruzó a la PWA el 2026-08-14 (GuacamayaCompai.jsx: reusa el rig F24
  // del valle — `visual/creatures/arte-valle/guacamaya.*` — en vez de
  // redibujarse a mano).
  guacamaya: { nombre: 'Guacamaya', gentilicio: 'la guacamaya', enPWA: true },
  // 🔧 CORRECCIÓN (2026-08-14, unificación compAI a 7): `chivito` y
  // `chivito-punk` eran DOS entradas para el mismo personaje — el pájaro del
  // páramo, normal quieto y con cresta sólo cuando habla, no dos esqueletos
  // distintos (mismo criterio que la corrección espejo en
  // `~/demos/3d/compai/elenco.js` del 2026-08-13). Colapsadas a UNA:
  // `chivito-punk` (el slug que ya usan onboarding/portales/marco/idleMachine
  // del lado del valle). Quien tuviera guardado el `chivito` viejo migra solo
  // — ver SLUGS_JUBILADOS abajo. Cruzó a la PWA el mismo día (ChivitoPunk.jsx,
  // rig F24 reusado, igual que la guacamaya).
  'chivito-punk': { nombre: 'Chivito', gentilicio: 'el chivito', enPWA: true },
  // La luciérnaga cruzó a la PWA el 2026-08-11 (Luciernaga.jsx: escarabajo
  // bioluminiscente con la linterna-bioindicador, en el registro CREATURES).
  luciernaga: { nombre: 'Luciérnaga', gentilicio: 'la luciérnaga', enPWA: true },
};

/** Slugs jubilados que migran solos, sin que el usuario haga nada. */
export const SLUGS_JUBILADOS = {
  colibri: 'angelita', colibri_svg: 'angelita',
  // El maíz se retiró del selector el 2026-08-14 — ver la nota en ELENCO.
  maiz: 'angelita',
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
