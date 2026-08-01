/**
 * Tipos ambient para `import.meta.env` (Vite).
 *
 * `checkJs` no conoce la extensión que Vite hace de ImportMeta, así que cada
 * acceso a `import.meta.env` reportaba TS2339 ("Property 'env' does not exist
 * on type 'ImportMeta'") — ~93 errores en el baseline.
 *
 * Se declara a mano (en vez de `/// <reference types="vite/client" />`)
 * porque vite/client también declara los wildcard modules de assets
 * (`*.css`, `*.png`, …) que ya viven en `static-assets-shim.d.ts`, y
 * duplicarlos genera conflictos de declaración.
 *
 * El index signature usa `any` a propósito: es el MISMO tipo que usa Vite
 * upstream en `vite/client.d.ts` (las VITE_* llegan como string en runtime,
 * pero `define` puede inyectar booleanos y los accesos con `?.` esperan
 * `undefined` fuera de Vite — ver src/config/env.js).
 */
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  // Sin `readonly` (a diferencia de vite/client): los tests mutan
  // `import.meta.env.VITE_X` para simular configuraciones.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- paridad con vite/client upstream
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
