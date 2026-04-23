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
 * Ver ADR-011 (guatoc-ecohub/Chagra-strategy).
 */

class ModuleRegistry {
  constructor() {
    this._modules = new Map();
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
  }

  unregister(id) {
    this._modules.delete(id);
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
  window.__chagraRegistry = registry;
}
