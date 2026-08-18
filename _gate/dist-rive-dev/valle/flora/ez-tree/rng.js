/**
 * ez-tree — RNG (multiply-with-carry determinista, semilla entera).
 *
 * Fuente: dgreenheck/ez-tree, MIT License. Copyright (c) 2024 Daniel Greenheck.
 * Puerto sin cambios: no toca THREE, no tenía dependencias r18x que migrar.
 * Nota: lib3d ya tiene su propio `core/RNG.js` (mulberry32) para el resto del
 * valle; este RNG se mantiene APARTE y dedicado a ez-tree porque los presets
 * de especie (especies-eztree.js) fijan una `seed` entera pensada para ESTE
 * generador (mismo algoritmo que usa el proyecto original) — mezclar RNGs
 * cambiaría la forma resultante del árbol para la misma semilla.
 */
export default class RNG {
  m_w = 123456789;
  m_z = 987654321;
  mask = 0xffffffff;

  constructor(seed) {
    this.m_w = (123456789 + seed) & this.mask;
    this.m_z = (987654321 - seed) & this.mask;
  }

  /**
   * Returns a random number between min and max
   */
  random(max = 1, min = 0) {
    this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & this.mask;
    this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & this.mask;
    let result = ((this.m_z << 16) + (this.m_w & 65535)) >>> 0;
    result /= 4294967296;

    return (max - min) * result + min;
  }
}
