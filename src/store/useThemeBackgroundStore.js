import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * useThemeBackgroundStore
 * ================================================================
 * Selector de fondo de biodiversidad para la app. El operador elige
 * entre los fondos curados por la diseñadora (Lili) desde su Perfil.
 *
 * Decisión operador 2026-06-02: se ELIMINÓ el fondo "Clásico"
 * (`/biodiversidad-bg.jpg`). El default universal de TODA la app —desde el
 * login hasta biodiversidad— es ahora "Cosecha mística" (`biopunk-4`).
 * El catálogo solo contiene los 4 fondos biopunk curados.
 *
 * El fondo se aplica escribiendo la variable CSS `--app-bg-image` en el
 * <body>; la regla `.app-bg-biodiversidad` la consume con `var(...)` y
 * fallback a "Cosecha mística" (`/fondo-biopunk-4.jpg`). Así cubrimos
 * ScreenShell main + DashboardLive + login con un solo punto de verdad,
 * y se preserva el overlay/blur biopunk para legibilidad (capas
 * independientes). NINGUNA pantalla cae ya al fondo clásico viejo.
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
 * Id del fondo por defecto universal — "Cosecha mística" (biopunk-4).
 * Decisión operador 2026-06-02. Cualquier id desconocido o localStorage
 * legado con el viejo 'default' (Clásico, ya eliminado) resuelve acá.
 */
export const DEFAULT_BACKGROUND_ID = 'biopunk-4';

/**
 * Fondo por defecto de TODA la app y el login — "Cosecha mística" (biopunk-4).
 * Decisión operador 2026-06-02: este es el default universal; cualquier usuario
 * que no haya elegido explícitamente otro fondo (incluido login/incógnito) lo ve.
 * (Antes existía '/biodiversidad-bg.jpg', el "fondo Clásico" que el operador eliminó.)
 */
export const DEFAULT_BACKGROUND_SRC = '/fondo-biopunk-4.jpg';

/** Entrada del catálogo del fondo por defecto (ref estable congelada). */
const DEFAULT_BACKGROUND_ENTRY = Object.freeze(
  BACKGROUND_CATALOG.find((b) => b.id === DEFAULT_BACKGROUND_ID) || BACKGROUND_CATALOG[0]
);

/** Set congelado de ids válidos para validar entradas externas. */
const VALID_IDS = Object.freeze(BACKGROUND_CATALOG.map((b) => b.id));

/**
 * Helper PURO fuera del store: resuelve la entrada del catálogo por id.
 * Retorna SIEMPRE una ref estable del catálogo congelado (o la del fondo
 * por defecto "Cosecha mística"), nunca un objeto nuevo → seguro en render.
 */
export function getBackgroundById(id) {
  return BACKGROUND_CATALOG.find((b) => b.id === id) || DEFAULT_BACKGROUND_ENTRY;
}

/**
 * Resuelve la URL de imagen efectiva para un id. Cualquier id desconocido
 * (incluido el legado 'default' ya eliminado) cae a "Cosecha mística".
 * Helper puro, sin tocar el store.
 */
export function getBackgroundSrc(id) {
  return getBackgroundById(id).src || DEFAULT_BACKGROUND_SRC;
}

const useThemeBackgroundStore = create(
  persist(
    (set) => ({
      // Default universal "Cosecha mística" (operador 2026-06-02). Usuarios
      // nuevos / incógnito arrancan en biopunk-4; el chip queda resaltado en Perfil.
      selected: DEFAULT_BACKGROUND_ID,

      /**
       * Cambia el fondo seleccionado. Valida contra el catálogo; un id
       * desconocido cae al default universal "Cosecha mística" (defensivo
       * contra localStorage corrupto o versiones futuras del catálogo).
       */
      setBackground: (id) =>
        set({ selected: VALID_IDS.includes(id) ? id : DEFAULT_BACKGROUND_ID }),
    }),
    {
      name: 'chagra:background:v1',
      storage: createJSONStorage(() => localStorage),
      // Sanea el valor hidratado por si el catálogo cambió entre versiones.
      // El legado 'default' (Clásico, eliminado 2026-06-02) ya no es válido →
      // los usuarios que lo tuvieran persistido migran a "Cosecha mística".
      onRehydrateStorage: () => (state) => {
        if (state && !VALID_IDS.includes(state.selected)) {
          state.selected = DEFAULT_BACKGROUND_ID;
        }
      },
    }
  )
);

export default useThemeBackgroundStore;
