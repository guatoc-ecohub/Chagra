/**
 * Shims para `import.meta.glob` (Vite) — primer uso real del repo (#2072).
 *
 * Se declara a mano (en vez de `/// <reference types="vite/client" />`) por la
 * misma razón documentada en `vite-env.d.ts`: vite/client duplica los wildcard
 * modules de assets (`*.css`, `*.png`, …) que ya viven en
 * `static-assets-shim.d.ts`. `import.meta.glob` con `{ eager: true,
 * import: 'default', query: '?url' }` resuelve a un mapa ruta -> URL de string.
 */
interface ImportMeta {
  glob: (paths: string[] | string, options?: object) => Record<string, string>;
}
