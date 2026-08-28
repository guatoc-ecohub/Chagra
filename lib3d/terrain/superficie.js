import { erosionarHeightfield } from './erosion.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function sampleGrid(grid, width, rows, bounds, x, z) {
  const tx = clamp((x - bounds.x0) / (bounds.x1 - bounds.x0), 0, 1) * (width - 1);
  const tz = clamp((z - bounds.z0) / (bounds.z1 - bounds.z0), 0, 1) * (rows - 1);
  const ix = Math.min(width - 2, Math.floor(tx));
  const iz = Math.min(rows - 2, Math.floor(tz));
  const fx = tx - ix;
  const fz = tz - iz;
  const i = iz * width + ix;
  return (grid[i] * (1 - fx) + grid[i + 1] * fx) * (1 - fz)
    + (grid[i + width] * (1 - fx) + grid[i + width + 1] * fx) * fz;
}

/**
 * Build one deterministic surface used by both terrain geometry and callers.
 * The returned function is stable for the lifetime of the scene.
 * @param {{
 *   resolution?: number,
 *   bounds?: { x0: number, x1: number, z0: number, z1: number },
 *   sampleBase?: (x: number, z: number) => number,
 *   seed?: number,
 *   droplets?: number,
 *   strength?: number,
 * }} options
 */
export function crearSuperficieErosionada({
  resolution = 32,
  bounds = { x0: -17, x1: 17, z0: -17, z1: 17 },
  sampleBase,
  seed = 20260824,
  droplets = 900,
  strength = 0.22,
} = {}) {
  if (typeof sampleBase !== 'function') throw new TypeError('sampleBase is required');
  const width = Math.max(4, resolution | 0) + 1;
  const rows = width;
  const original = new Float32Array(width * rows);
  const grid = new Float32Array(width * rows);
  for (let z = 0; z < rows; z++) {
    const wz = bounds.z0 + (z / (rows - 1)) * (bounds.z1 - bounds.z0);
    for (let x = 0; x < width; x++) {
      const wx = bounds.x0 + (x / (width - 1)) * (bounds.x1 - bounds.x0);
      const value = Number(sampleBase(wx, wz)) || 0;
      original[z * width + x] = value;
      grid[z * width + x] = value;
    }
  }
  erosionarHeightfield(grid, width, rows, { seed, droplets, maxSteps: 28, radius: 2 });
  for (let i = 0; i < grid.length; i++) grid[i] = original[i] + (grid[i] - original[i]) * strength;

  const heightAt = (x, z) => sampleGrid(grid, width, rows, bounds, x, z);
  return {
    grid,
    width,
    rows,
    bounds,
    heightAt,
    normalAt(x, z, step = 0.08) {
      const dx = heightAt(x + step, z) - heightAt(x - step, z);
      const dz = heightAt(x, z + step) - heightAt(x, z - step);
      const length = Math.hypot(dx, 2 * step, dz) || 1;
      return { x: -dx / length, y: (2 * step) / length, z: -dz / length };
    },
  };
}
