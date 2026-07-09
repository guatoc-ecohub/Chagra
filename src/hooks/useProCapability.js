/**
 * useProCapability — ¿hay un módulo Pro registrado con esta capability?
 * =====================================================================
 * Gate de UI para entradas Pro (ADR-002/011): la entrada solo se muestra
 * cuando el módulo Pro correspondiente está CARGADO en el moduleRegistry
 * (build con VITE_PRO_MODULES_PATH + bundle Pro servido). En el build puro
 * OSS —o para cuentas sin el plan— el módulo nunca se registra y la UI
 * degrada a cero rastro (sin botones muertos).
 *
 * Reactivo: loadProModules corre DESPUÉS del primer render (async), así que
 * el hook se suscribe al registry (useSyncExternalStore) y la entrada
 * aparece sola cuando el módulo aterriza — un chequeo único al montar se lo
 * perdería (misma lección de features huérfanas: cablear ≠ chequear una vez).
 *
 * @param {string} capability  ej. 'avatar-espiritu'
 * @returns {boolean} true si al menos un módulo registrado la declara.
 */
import { useSyncExternalStore } from 'react';
import { registry } from '../core/moduleRegistry';

export function useProCapability(capability) {
  return useSyncExternalStore(
    (onStoreChange) => registry.subscribe(onStoreChange),
    () => registry.byCapability(capability).length > 0,
    () => false, // SSR/snapshot de servidor: sin módulos Pro.
  );
}

export default useProCapability;
