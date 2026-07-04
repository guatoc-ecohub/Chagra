import { useEffect, useState, useCallback } from 'react';

/**
 * useTheme — sistema de temas visuales de la app (skin global).
 * ================================================================
 * Temas curados (operador 2026-06-03, demo Bogotá; split biopunk/biopunk2
 * 2026-07-04, decisión GO-LIVE). El tema se aplica desde el LOGIN y en toda la
 * app vía el atributo `data-theme` en <html>; las variables y overrides viven
 * en `src/styles/themes.css`:
 *
 *   - biopunk2 (DEFAULT)  → oscuro #0a0e14, neón teal #19c79a, con la escena
 *                           de autor "Finca Organismo" como portada del home
 *                           finca viva. COMPARTE la piel base biopunk (misma
 *                           paleta/tokens) → NO escribe data-theme: todo el
 *                           CSS `html:not([data-theme])` (= piel biopunk base)
 *                           le aplica tal cual. La DIFERENCIA con biopunk es
 *                           SOLO la escena del home (se resuelve en JS,
 *                           ESCENA_VIVA_POR_TEMA de FincaVivaHero).
 *   - biopunk             → el bio-punk ORIGINAL (respaldo): misma piel base,
 *                           escena isométrica clásica con tokens biopunk (la
 *                           que había ANTES de la "Finca Organismo").
 *                           Tampoco escribe data-theme (es el estilo BASE).
 *   - nature              → cálido botánico (terracota/salvia/ocre).
 *   - minimalista         → limpio, crema, monoline verde #2f6e5a.
 *   - verde-vivo          → la PIEL propia de la finca viva: verde frondoso +
 *                           sol cálido + tierra/ocre (identidad Chagra). SOLO
 *                           visible en el selector con la flag de finca viva ON
 *                           (VITE_FINCA_VIVA_HOME_PERFIL); con la flag OFF el
 *                           selector muestra EXACTO los temas base.
 *
 * Más un modo `auto` que alterna entre nature (día) y biopunk2 (noche).
 *
 * Persistencia híbrida: default biopunk2 + override del usuario en
 * localStorage (`chagra:theme`). Un id legado/desconocido cae al default.
 * Un usuario con 'biopunk' ya persistido lo CONSERVA (id válido): el split
 * no le cambia el tema por debajo.
 * ================================================================
 */

export const STORAGE_KEY = 'chagra:theme';
export const DEFAULT_THEME = 'biopunk2';

/**
 * Temas que comparten la PIEL BASE de la app (sin data-theme en <html>).
 * biopunk y biopunk2 son la MISMA piel (paleta neón teal sobre #0a0e14);
 * solo difieren en la escena del home finca viva (decidida en JS).
 */
export const BASE_SKIN_THEMES = Object.freeze(['biopunk', 'biopunk2']);

/**
 * Catálogo visible en el switcher (ThemeSelector). El orden define el orden
 * en la UI: el default auto va primero. `auto` cierra la lista.
 */
export const THEMES = Object.freeze([
  Object.freeze({
    id: 'auto',
    label: 'Automático',
    desc: 'Nature de día, Bio-Punk 2 de noche.',
  }),
  // El DEFAULT: la piel biopunk con la escena de autor "Finca Organismo"
  // (decisión operador GO-LIVE 2026-07-04: biopunk2 default, biopunk respaldo).
  Object.freeze({
    id: 'biopunk2',
    label: 'Bio-Punk 2',
    // "Finca Organismo" es el NOMBRE PROPIO de la escena (dispara el patrón
    // \bFinca\b del linter); las demás descs de este catálogo tampoco viven en
    // messages.js aún (TAREA i18n ADR-050, transversal).
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- nombre propio de la escena
    desc: 'Oscuro, neón teal — Finca Organismo, corazón vivo.',
  }),
  Object.freeze({
    id: 'biopunk',
    label: 'Bio-Punk',
    desc: 'Oscuro, neón teal — cosecha mística (el clásico).',
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
 * Resuelve el modo `auto` a un tema concreto según la hora local: nature de
 * día, biopunk2 (el default) de noche. Cualquier otro id se devuelve tal cual.
 * Fuente ÚNICA de esa regla (la usan applyTheme y FincaVivaHero — antes cada
 * uno resolvía por su lado y el split biopunk/biopunk2 los habría desalineado).
 */
export function resolveAutoTheme(theme) {
  if (theme !== 'auto') return theme;
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? 'biopunk2' : 'nature';
}

/**
 * Aplica un tema al <html>. biopunk y biopunk2 comparten el estilo BASE → se
 * quita data-theme (todo el CSS `html:not([data-theme])` les aplica igual);
 * el resto escribe `data-theme="<id>"` que activa las variables/overrides de
 * themes.css. Para `auto` resuelve según la hora local (día→nature,
 * noche→biopunk2). Devuelve el tema EFECTIVO ya resuelto (útil en tests).
 */
export function applyTheme(theme) {
  const resolved = resolveAutoTheme(theme);

  if (BASE_SKIN_THEMES.includes(resolved)) {
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
