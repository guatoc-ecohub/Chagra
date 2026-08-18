/**
 * ez-tree — barrel export del núcleo vendorizado.
 *
 * Fuente: dgreenheck/ez-tree (github.com/dgreenheck/ez-tree), MIT License.
 * Copyright (c) 2024 Daniel Greenheck. Puerto three r167 → r160.
 *
 * Se vendoriza SOLO el núcleo de generación (Tree/TreeOptions/Branch/RNG/
 * Trellis/enums) — se dejan fuera `app/` (demo standalone del proyecto
 * original: escena, UI dat.gui, cielo/nubes/pasto de su propio demo) y
 * `presets/*.json` (14 presets de especies norteamericanas/genéricas que no
 * aplican al catálogo Chagra; ver `../especies-eztree.js` para el mapeo
 * especie→TreeOptions equivalente, con piso térmico y siluetas propias).
 */
export { Tree } from './tree.js';
export { Trellis } from './trellis.js';
export { Billboard, TreeType } from './enums.js';
export { default as TreeOptions } from './options.js';
export { Branch } from './branch.js';
export { default as RNG } from './rng.js';
