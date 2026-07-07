/**
 * ModoCampoContext.jsx — provee UN único motor de modo campo a TODA la app.
 *
 * Antes, useModoCampo() vivía dentro de ModoCampoPanel (pantalla Perfil): al
 * navegar fuera de Perfil el panel se desmontaba, el detector se paraba y el
 * wake-word "hola chagra" dejaba de escuchar en el resto de la app. Ahora el
 * hook corre UNA sola vez en el root (main.jsx) vía este provider, y
 * ModoCampoPanel solo consume el estado → el modo campo escucha en cualquier
 * pantalla (y con el toggle persistido en useModoCampo, sobrevive al reload).
 *
 * Español colombiano (tú/usted), NUNCA voseo.
 */
import { createContext, useContext } from 'react';
import useModoCampo from './useModoCampo';

/** @typedef {ReturnType<typeof useModoCampo>} ModoCampoValue */

/** @type {import('react').Context<ModoCampoValue | null>} */
const ModoCampoContext = createContext(/** @type {ModoCampoValue | null} */ (null));

/** @param {{ children: import('react').ReactNode }} props */
export function ModoCampoProvider({ children }) {
  const value = useModoCampo();
  return <ModoCampoContext.Provider value={value}>{children}</ModoCampoContext.Provider>;
}

/**
 * Consume el motor global de modo campo. Debe usarse dentro de <ModoCampoProvider>.
 * @returns {ModoCampoValue}
 */
export function useModoCampoContext() {
  const ctx = useContext(ModoCampoContext);
  if (!ctx) throw new Error('useModoCampoContext debe usarse dentro de <ModoCampoProvider>');
  return ctx;
}
