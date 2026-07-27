/**
 * vistasPublicas.js — quién entra a `chagra.app` SIN sesión.
 *
 * Contexto (decisión de producto, `Chagra-strategy/ops/PLAN-NOCHE-3D-2026-07-25.md`):
 * son DOS productos con la dirección de entrada invertida.
 *
 *   | | `chagra.app` — la app | el valle navegable — público |
 *   |---|---|---|
 *   | Quién entra | el campesino, login desde la entrada | cualquiera, sin login |
 *   | Qué es primero | el 2D | el valle 3D |
 *   | Qué valle muestra | el PRIVADO, la finca real | el público, para mostrar |
 *
 * Este módulo es la puerta del PRIMERO. El valle público es OTRO bundle
 * (`index-prod.html` → `src/prodApp/ProdChagraApp.jsx` → `dist-prod/`, servido en
 * `prod.chagra.app` / `3d.guatoc.co`) y no pasa por acá.
 *
 * La regla: en `chagra.app` nada REAL —nada con datos de finca— se alcanza sin
 * sesión. Lo que sí queda abierto son las vitrinas de discovery (`MOCKUP_HASH_ROUTES`
 * en `App.jsx`), que no muestran datos de nadie y se comparten por enlace, más las
 * tres vistas de la propia entrada.
 */

/**
 * Las vistas de la entrada misma. Sin estas no hay forma de autenticarse:
 * - `loading`: el estado inicial, antes de saber si hay sesión.
 * - `login`: la puerta.
 * - `oauth-callback`: el puente del intercambio code→token (PKCE). Va abierto
 *   a propósito: cuando vuelve del proveedor todavía NO hay token, así que
 *   gatearlo por sesión mataría el login que está justo por completarse.
 */
export const VISTAS_DE_ENTRADA = Object.freeze(['loading', 'login', 'oauth-callback']);

/**
 * Une las vitrinas públicas (los valores de `MOCKUP_HASH_ROUTES`) con las de
 * entrada. Se construye DESDE la tabla de rutas que el router ya resuelve antes
 * del check de sesión, para que agregar una vitrina nueva no exija acordarse de
 * tocar dos listas — y para no cerrar de más por descuido.
 *
 * @param {Iterable<string>} [vistasVitrina] valores de MOCKUP_HASH_ROUTES
 * @returns {Set<string>}
 */
export function construirVistasPublicas(vistasVitrina = []) {
  return new Set([...VISTAS_DE_ENTRADA, ...vistasVitrina]);
}

/**
 * @typedef {Object} DecisionNavegacion
 * @property {string} vista     la vista que se debe montar
 * @property {boolean} gateada  true si se desvió a login por falta de sesión
 * @property {boolean} verificar true si hay que confirmar la sesión (async) antes de decidir
 */

/**
 * Decide, de forma PURA y síncrona, a dónde va una navegación.
 *
 * `sesion` es tri-estado a propósito:
 * - `true`  → hay token vigente: pasa a donde pidió.
 * - `false` → no hay: cualquier vista no-pública se desvía a `login`.
 * - `null`  → TODAVÍA NO SABEMOS (`isAuthenticated()` lee IndexedDB y es async).
 *   En ese caso NO se adivina: se pide verificar. Adivinar "sí" abre la fuga;
 *   adivinar "no" botaría al campesino al login en cada arranque en frío.
 *
 * @param {{ vista: string, vistasPublicas: Set<string>, sesion: boolean|null }} args
 * @returns {DecisionNavegacion}
 */
export function decidirNavegacion({ vista, vistasPublicas, sesion }) {
  if (!vista) return { vista: 'login', gateada: true, verificar: false };
  if (vistasPublicas.has(vista)) return { vista, gateada: false, verificar: false };
  if (sesion === true) return { vista, gateada: false, verificar: false };
  if (sesion === false) return { vista: 'login', gateada: true, verificar: false };
  return { vista, gateada: false, verificar: true };
}
