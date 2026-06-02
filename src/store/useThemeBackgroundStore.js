import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * useThemeBackgroundStore
 * ================================================================
 * Selector de fondo de biodiversidad para la app. El operador elige
 * entre los fondos curados por la diseñadora (Lili) desde su Perfil.
 *
 * Hoy el fondo de la app es fijo (`/biodiversidad-bg.jpg`) aplicado vía
 * la clase `body.app-bg-biodiversidad` en src/index.css. Este store
 * permite reemplazar la imagen sin breaking change: 'default' mantiene
 * EXACTAMENTE el comportamiento actual.
 *
 * El fondo se aplica escribiendo la variable CSS `--app-bg-image` en el
 * <body>; la regla `.app-bg-biodiversidad` la consume con `var(...)` y
 * fallback a la imagen clásica. Así seguimos cubriendo ScreenShell main +
 * DashboardLive + login con un solo punto de verdad, y se preserva el
 * overlay/blur biopunk para legibilidad (capas independientes).
 *
 * Persiste en localStorage bajo `chagra:background:v1`.
 * ================================================================
 */

/**
 * CRÍTICO anti React #185 (infinite update loop):
 *
 * El catálogo se define como un Object.freeze() FUERA del closure del
 * store para mantener identidad referencial estable en cada lectura. Si
 * lo construyéramos inline dentro de un selector
 * (`useThemeBackgroundStore((s) => ({...}))`), Zustand vería un objeto
 * nuevo cada render → strict-equal cache miss → re-render → loop infinito.
 * Mismo bug exacto que tuvimos en fincaActiveStore.getActiveFinca().
 *
 * Por eso: NUNCA retornar un objeto inline nuevo desde un selector de este
 * store. Consumir `selected` (string) y derivar el resto vía helpers puros
 * que retornan refs estables del catálogo congelado.
 */
export const BACKGROUND_CATALOG = Object.freeze([
  Object.freeze({
    id: 'default',
    label: 'Clásico',
    sub: 'Bosque alto-andino',
    // null = mantener el comportamiento actual (la imagen original la pone
    // el fallback de la regla CSS, no este store). Así 'default' nunca
    // depende de que el store haya escrito la variable.
    src: null,
  }),
  Object.freeze({
    id: 'biopunk-1',
    label: 'Páramo completo',
    sub: 'Oso, cóndor, colibrí, frailejones',
    src: '/fondo-biopunk-1.jpg',
  }),
  Object.freeze({
    id: 'biopunk-2',
    label: 'Colibrí tech',
    sub: 'Esfera polinizadora hexagonal',
    src: '/fondo-biopunk-2.jpg',
  }),
  Object.freeze({
    id: 'biopunk-3',
    label: 'Bosque ilustrado',
    sub: 'Osos, armadillo, quetzal, raíces',
    src: '/fondo-biopunk-3.jpg',
  }),
  Object.freeze({
    id: 'biopunk-4',
    label: 'Cosecha mística',
    sub: 'Maíz raíces, colibrí en orbe, jaguar',
    src: '/fondo-biopunk-4.jpg',
  }),
]);

/**
 * Fondo por defecto de TODA la app y el login — "Cosecha mística" (biopunk-4).
 * Decisión operador 2026-06-02: este es el default universal; cualquier usuario
 * que no haya elegido explícitamente otro fondo (incluido login/incógnito) lo ve.
 * (Antes era '/biodiversidad-bg.jpg', el "fondo viejo" que el operador descartó.)
 */
export const DEFAULT_BACKGROUND_SRC = '/fondo-biopunk-4.jpg';

/** Set congelado de ids válidos para validar entradas externas. */
const VALID_IDS = Object.freeze(BACKGROUND_CATALOG.map((b) => b.id));

/**
 * Helper PURO fuera del store: resuelve la entrada del catálogo por id.
 * Retorna SIEMPRE una ref estable del catálogo congelado (o la de
 * 'default'), nunca un objeto nuevo → seguro para usar en render.
 */
export function getBackgroundById(id) {
  return BACKGROUND_CATALOG.find((b) => b.id === id) || BACKGROUND_CATALOG[0];
}

/**
 * Resuelve la URL de imagen efectiva para un id. 'default' (o cualquier id
 * sin src) → imagen clásica. Helper puro, sin tocar el store.
 */
export function getBackgroundSrc(id) {
  return getBackgroundById(id).src || DEFAULT_BACKGROUND_SRC;
}

const useThemeBackgroundStore = create(
  persist(
    (set) => ({
      // Default universal "Cosecha mística" (operador 2026-06-02). Usuarios
      // nuevos / incógnito arrancan en biopunk-4; el chip queda resaltado en Perfil.
      selected: 'biopunk-4',

      /**
       * Cambia el fondo seleccionado. Valida contra el catálogo; un id
       * desconocido cae a 'default' (defensivo contra localStorage
       * corrupto o versiones futuras del catálogo).
       */
      setBackground: (id) =>
        set({ selected: VALID_IDS.includes(id) ? id : 'default' }),
    }),
    {
      name: 'chagra:background:v1',
      storage: createJSONStorage(() => localStorage),
      // Sanea el valor hidratado por si el catálogo cambió entre versiones.
      onRehydrateStorage: () => (state) => {
        if (state && !VALID_IDS.includes(state.selected)) {
          state.selected = 'default';
        }
      },
    }
  )
);

export default useThemeBackgroundStore;
