/**
 * pageReload.js — indirección mínima sobre window.location.reload().
 *
 * jsdom define `location.reload` como non-configurable: imposible de espiar
 * o redefinir en vitest. Esta indirección permite a los tests mockear la
 * recarga (vi.mock) sin tocar el comportamiento en producción.
 */
/**
 * Recarga la pagina actual. Existe como indireccion para que los tests
 * puedan mockearla sin tocar el comportamiento en produccion.
 * @returns {void}
 */
export function reloadPage() {
  window.location.reload();
}
