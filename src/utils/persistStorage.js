/**
 * persistStorage.js — solicita almacenamiento PERSISTENTE al navegador.
 *
 * PROBLEMA QUE RESUELVE (U-1, crítico para guías de glaciar):
 *   iOS Safari (y otros navegadores con presión de almacenamiento) PURGAN
 *   IndexedDB de sitios "best-effort" tras ~7 días sin uso si el sitio NO está
 *   instalado en la pantalla de inicio. Para un guía que sube al glaciar y
 *   guarda reportes offline, eso significa PERDER todos sus datos sin aviso.
 *
 *   `navigator.storage.persist()` pide al navegador marcar el origen como
 *   "persistent": el almacenamiento (IndexedDB incluido) deja de ser elegible
 *   para purga automática por presión de espacio. Es la única defensa del lado
 *   del cliente contra esa purga silenciosa.
 *
 * COMPORTAMIENTO:
 *   - Idempotente y barato: si ya es persistente (`persisted()` → true), NO
 *     vuelve a pedirlo.
 *   - Tolerante: si la API no existe (navegadores viejos) o lanza, NO rompe
 *     nada — devuelve false y la app sigue offline-first igual (solo sin la
 *     garantía anti-purga).
 *   - NO requiere red. Funciona idéntico online u offline.
 *   - NUNCA muestra un prompt al usuario: en la mayoría de navegadores la
 *     decisión es heurística (uso/engagement/instalada); esta llamada solo
 *     declara la intención. En los que sí preguntan, el navegador maneja la UI.
 *
 * @module utils/persistStorage
 */

/**
 * ¿El almacenamiento de este origen ya está marcado como persistente?
 *
 * @returns {Promise<boolean>} true si ya es persistente; false si no, si la
 *   API no existe, o si la consulta falla.
 */
export async function isStoragePersisted() {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.storage ||
      typeof navigator.storage.persisted !== 'function'
    ) {
      return false;
    }
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/**
 * Solicita almacenamiento persistente para el origen (anti-purga de IndexedDB).
 *
 * Idempotente: si ya es persistente no vuelve a pedirlo. Tolerante a fallos:
 * cualquier error o API ausente devuelve false sin lanzar — la app sigue
 * funcionando offline-first, solo sin la garantía extra anti-purga.
 *
 * @returns {Promise<boolean>} true si el almacenamiento quedó (o ya estaba)
 *   persistente; false en cualquier otro caso (API ausente, denegado, error).
 */
export async function requestPersistentStorage() {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.storage ||
      typeof navigator.storage.persist !== 'function'
    ) {
      return false;
    }
    // Evita re-pedir si ya está concedido (barato y sin efectos secundarios).
    if (typeof navigator.storage.persisted === 'function') {
      try {
        if (await navigator.storage.persisted()) return true;
      } catch {
        // Si persisted() falla, igual intentamos persist() abajo.
      }
    }
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
