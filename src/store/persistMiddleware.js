/**
 * T47 — Persistencia de preferencias de usuario en Zustand + localStorage.
 *
 * Middleware que guarda automáticamente el store en localStorage
 * y restaura al iniciar. Compatible con usePrefsStore existente.
 */

/**
 * Middleware de Zustand que persiste en localStorage.
 * @param {import('zustand').StateCreator<any, any, any>} config
 * @param {string} key — clave en localStorage
 * @returns {import('zustand').StateCreator<any, any, any>}
 */
export function persistirEnLocalStorage(config, key) {
  return (set, get, api) => {
    // Restaurar estado guardado
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        set({ ...get(), ...parsed });
      }
    } catch {}

    const wrappedSet = (partial, replace) => {
      set(partial, replace);
      try {
        const state = get();
        const toSave = {};
        // Solo persistir keys conocidas (evitar funciones, refs)
        for (const [k, v] of Object.entries(state)) {
          if (typeof v !== 'function' && k !== 'setState' && k !== 'destroy') {
            toSave[k] = v;
          }
        }
        localStorage.setItem(key, JSON.stringify(toSave));
      } catch {}
    };

    return config(wrappedSet, get, api);
  };
}
