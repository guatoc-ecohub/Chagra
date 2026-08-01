/**
 * moduleRegistry.js — Registro dinámico de módulos
 * ================================================
 * Permite que módulos Pro (de chagra-pro privado) se carguen en runtime
 * cuando estén presentes, sin crear imports estáticos desde el repo
 * público. La asimetría de imports está enforced por ADR-002.
 *
 * Interfaz ChagraModule:
 *   {
 *     id: string                    // único, kebab-case
 *     version: string               // semver
 *     capabilities: string[]        // ej. 'enriched-guild-suggestions'
 *     requiredInfra?: string[]      // ej. 'ollama', 'internet'
 *     mount: () => Promise<{ default: React.ComponentType }>
 *   }
 *
 * Uso típico:
 *   import { registry } from '@/core/moduleRegistry'
 *   const mods = registry.byCapability('enriched-guild-suggestions')
 *   if (mods.length) {
 *     const { default: Comp } = await mods[0].mount()
 *     // renderizar <Comp ... />
 *   }
 *
 * Ver ADR-011 (privado).
 */

class ModuleRegistry {
  constructor() {
    this._modules = new Map();
    // Suscriptores a cambios del registro. Los módulos Pro se cargan ASYNC
    // (loadProModules corre después del primer render), así que la UI que
    // gatea por capability necesita enterarse cuando un módulo aterriza —
    // sin esto, un chequeo único al montar se pierde el registro tardío y
    // la entrada Pro queda invisible aunque el módulo esté servido.
    this._listeners = new Set();
  }

  /**
   * Suscribe un callback a cambios del registro (register/unregister).
   * Contrato compatible con useSyncExternalStore: devuelve el unsubscribe.
   * @param {() => void} fn
   * @returns {() => void}
   */
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    for (const fn of this._listeners) {
      try {
        fn();
      } catch (e) {
        console.warn('[registry] listener falló:', e);
      }
    }
  }

  register(module_) {
    if (!module_ || typeof module_.id !== 'string' || typeof module_.mount !== 'function') {
      console.warn('[registry] ignorando módulo inválido:', module_);
      return;
    }
    if (this._modules.has(module_.id)) {
      console.warn(`[registry] sobreescribiendo módulo existente "${module_.id}"`);
    }
    this._modules.set(module_.id, module_);
    this._notify();
  }

  unregister(id) {
    this._modules.delete(id);
    this._notify();
  }

  has(id) {
    return this._modules.has(id);
  }

  get(id) {
    return this._modules.get(id);
  }

  list() {
    return Array.from(this._modules.values());
  }

  byCapability(cap) {
    return this.list().filter((m) => Array.isArray(m.capabilities) && m.capabilities.includes(cap));
  }

  async mount(id) {
    const m = this._modules.get(id);
    return m ? m.mount() : null;
  }
}

export const registry = new ModuleRegistry();

// Expuesto en DEV para inspección desde DevTools.
if (typeof window !== 'undefined' && import.meta.env && import.meta.env.DEV) {
  // @ts-ignore custom debug registry
  window.__chagraRegistry = registry;
}
