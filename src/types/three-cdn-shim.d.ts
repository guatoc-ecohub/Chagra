/**
 * Ambient shim for the exact Three.js CDN specifier used by the standalone
 * species viewer entry (`src/speciesViewer/main.js`, PR feat/a1-visor-especie-3d
 * — see `_gate/INFORME-A1-VISOR-ESPECIE.md`: "Three.js se carga explícitamente
 * en r160 desde CDN"). The browser resolves this as a real cross-origin ESM
 * URL import — deliberately not bundled through the npm `three` package for
 * this entry — so `checkJs` has no module to resolve it against (TS2307).
 *
 * Re-exports the npm `three` package's types 1:1 for type-checking purposes
 * only; it does not change what actually loads at runtime (still the CDN
 * URL, still r160). The npm `three` devDependency is newer (see
 * package.json), but the public API surface used here (Vector3, Scene,
 * Mesh, cameras, lights, materials, geometries) is stable across those
 * versions, so this approximation is safe.
 */
declare module 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js' {
  export * from 'three';
}
