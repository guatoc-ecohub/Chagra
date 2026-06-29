import { useEffect, useState, useCallback } from 'react';

/**
 * useTheme — sistema de temas visuales de la app (skin global).
 * ================================================================
 * Tres temas curados (operador 2026-06-03, demo Bogotá). El tema se aplica
 * desde el LOGIN y en toda la app vía el atributo `data-theme` en <html>;
 * las variables y overrides viven en `src/styles/themes.css`:
 *
 *   - bio-punk (DEFAULT)  → oscuro #0a0e14, neón teal #19c79a "cosecha mística".
 *                           Es el estilo BASE de la app → NO escribe data-theme.
 *   - nature              → cálido botánico (terracota/salvia/ocre).
 *   - minimalista         → limpio, crema, monoline verde #2f6e5a.
 *   - verde-vivo          → la PIEL propia de la finca viva: verde frondoso +
 *                           sol cálido + tierra/ocre (identidad Chagra). SOLO
 *                           visible en el selector con la flag de finca viva ON
 *                           (VITE_FINCA_VIVA_HOME_PERFIL); con la flag OFF el
 *                           selector muestra EXACTO los 3 temas de hoy.
 *
 * Más un modo `auto` que alterna entre minimalista (día) y bio-punk (noche).
 *
 * Persistencia híbrida: default bio-punk + override del usuario en
 * localStorage (`chagra:theme`). Un id legado/desconocido cae al default.
 * ================================================================
 */

export const STORAGE_KEY = 'chagra:theme';
export const DEFAULT_THEME = 'biopunk';

/**
 * Catálogo visible en el switcher (ThemeSelector). El orden define el orden
 * en la UI: el default auto va primero. `auto` cierra la lista.
 */
export const THEMES = Object.freeze([
  Object.freeze({
    id: 'auto',
    label: 'Automático',
    desc: 'Nature de día, Bio-Punk de noche.',
  }),
  Object.freeze({
    id: 'biopunk',
    label: 'Bio-Punk',
    desc: 'Oscuro, neón teal — cosecha mística.',
  }),
  Object.freeze({
    id: 'nature',
    label: 'Nature',
    desc: 'Cálido botánico: terracota, salvia y ocre.',
  }),
  Object.freeze({
    id: 'minimalista',
    label: 'Minimalista',
    desc: 'El tema perfecto para la gente aburrida.',
  }),
]);

/**
 * VERDE VIVO — 4º tema, la PIEL propia de la finca viva. NO va en `THEMES`
 * (el catálogo base de los 3 temas + auto que ve todo el mundo): es un tema
 * gateado tras la flag de finca viva. El selector lo añade SOLO cuando la flag
 * está ON (ver getSelectableThemes); con la flag OFF, el selector es EXACTO el
 * de hoy (3 temas + auto). Su id sí es válido siempre en THEME_IDS para que una
 * selección persistida sobreviva y applyTheme la pueda escribir.
 */
export const VERDE_VIVO_THEME = Object.freeze({
  id: 'verde-vivo',
  label: 'Verde Vivo',
  desc: 'Verde frondoso, sol cálido y tierra — la piel de tu finca viva.',
});

/**
 * Ids válidos seleccionables (los 3 temas curados + auto + verde-vivo). El 4º
 * tema es id VÁLIDO siempre (normalizeTheme/setTheme lo aceptan) aunque su
 * VISIBILIDAD en el selector dependa de la flag de finca viva.
 */
export const THEME_IDS = Object.freeze([
  ...THEMES.map((t) => t.id),
  VERDE_VIVO_THEME.id,
]);

/**
 * Catálogo de temas VISIBLES en el selector según la flag de finca viva.
 * Con la flag ON (dev) aparece el 4º tema "Verde Vivo" al final; con la flag
 * OFF (prod) devuelve EXACTO los 3 temas + auto de hoy — sin cambios para el
 * usuario de producción.
 *
 * @param {boolean} fincaVivaOn  resultado de fincaVivaHomePerfilActivo().
 * @returns {ReadonlyArray<{id:string,label:string,desc:string}>}
 */
export function getSelectableThemes(fincaVivaOn) {
  return fincaVivaOn ? [...THEMES, VERDE_VIVO_THEME] : THEMES;
}

/**
 * Normaliza un id persistido: cualquier valor desconocido o legado
 * (`dark-sober`, `light`, etc., reemplazados por los 3 temas curados) cae al
 * default bio-punk. Defensivo contra localStorage de versiones anteriores.
 */
export function normalizeTheme(id) {
  return THEME_IDS.includes(id) ? id : DEFAULT_THEME;
}

/**
 * Aplica un tema al <html>. bio-punk es el estilo BASE → se quita data-theme;
 * el resto escribe `data-theme="<id>"` que activa las variables/overrides de
 * themes.css. Para `auto` resuelve según la hora local (día→minimalista,
 * noche→biopunk). Devuelve el tema EFECTIVO ya resuelto (útil en tests).
 */
export function applyTheme(theme) {
  let resolved = theme;
  if (theme === 'auto') {
    const hour = new Date().getHours();
    resolved = hour >= 18 || hour < 6 ? 'biopunk' : 'nature';
  }

  if (resolved === 'biopunk') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', resolved);
  }
  return resolved;
}

export function useTheme() {
  const [theme, setThemeState] = useState(() =>
    normalizeTheme(localStorage.getItem(STORAGE_KEY))
  );

  useEffect(() => {
    applyTheme(theme);
    if (theme === 'auto') {
      // Re-evaluar cada 10 min para el auto-switching día/noche.
      const id = setInterval(() => applyTheme('auto'), 10 * 60 * 1000);
      return () => clearInterval(id);
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (!THEME_IDS.includes(next)) return;
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}
