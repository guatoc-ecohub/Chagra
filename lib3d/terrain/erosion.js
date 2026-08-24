/**
 * Hydraulic erosion for deterministic heightfields.
 *
 * Distilled from gillworks/red-sands (MIT), using the same CPU-at-load
 * approach documented in STEAL-red-sands. It has no THREE dependency and is
 * intentionally bounded by caller-provided droplet counts.
 */

const DEFAULTS = Object.freeze({
  droplets: 1200,
  maxSteps: 32,
  inertia: 0.055,
  capacity: 3.4,
  minSlope: 0.014,
  erode: 0.36,
  deposit: 0.30,
  evaporate: 0.0165,
  gravity: 11,
  radius: 2,
  initialWater: 1,
  initialSpeed: 1,
});

function rngFrom(seed = 0x9e3779b9) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function bilerp(grid, width, index, fx, fy) {
  const a = grid[index];
  const b = grid[index + 1];
  const c = grid[index + width];
  const d = grid[index + width + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

function makeBrush(width, radius) {
  const offsets = [];
  const weights = [];
  let total = 0;
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const d = Math.hypot(x, y);
      if (d > radius) continue;
      const weight = 1 - d / radius;
      offsets.push(y * width + x);
      weights.push(weight);
      total += weight;
    }
  }
  return {
    offsets: new Int32Array(offsets),
    weights: new Float32Array(weights.map((weight) => weight / total)),
  };
}

/** Erode `height` in place and return the same array. */
export function erosionarHeightfield(height, width, heightRows, options = {}) {
  if (!height || height.length < width * heightRows) {
    throw new RangeError('height must contain width * heightRows samples');
  }
  const cfg = { ...DEFAULTS, ...options };
  if (cfg.droplets <= 0 || cfg.maxSteps <= 0) return height;

  const random = options.rand || rngFrom(options.seed);
  const radius = Math.max(1, cfg.radius | 0);
  const edge = radius + 2;
  const brush = makeBrush(width, radius);
  const hardness = options.hardness && options.hardness.length >= height.length
    ? options.hardness
    : null;

  for (let droplet = 0; droplet < cfg.droplets; droplet++) {
    let x = edge + random() * Math.max(1, width - edge * 2 - 1);
    let y = edge + random() * Math.max(1, heightRows - edge * 2 - 1);
    let dirX = 0;
    let dirY = 0;
    let speed = cfg.initialSpeed;
    let water = cfg.initialWater;
    let sediment = 0;

    for (let step = 0; step < cfg.maxSteps; step++) {
      const ix = x | 0;
      const iy = y | 0;
      const index = iy * width + ix;
      const fx = x - ix;
      const fy = y - iy;
      const oldHeight = bilerp(height, width, index, fx, fy);
      const gradX = (height[index + 1] - height[index]) * (1 - fy)
        + (height[index + width + 1] - height[index + width]) * fy;
      const gradY = (height[index + width] - height[index]) * (1 - fx)
        + (height[index + width + 1] - height[index + 1]) * fx;

      dirX = dirX * cfg.inertia - gradX * (1 - cfg.inertia);
      dirY = dirY * cfg.inertia - gradY * (1 - cfg.inertia);
      const directionLength = Math.hypot(dirX, dirY);
      if (directionLength < 1e-6) break;
      dirX /= directionLength;
      dirY /= directionLength;
      x += dirX;
      y += dirY;
      if (x < edge || x >= width - edge - 1 || y < edge || y >= heightRows - edge - 1) break;

      const nx = x | 0;
      const ny = y | 0;
      const nextIndex = ny * width + nx;
      const nextHeight = bilerp(height, width, nextIndex, x - nx, y - ny);
      const delta = nextHeight - oldHeight;
      const capacity = Math.max(-delta, cfg.minSlope) * speed * water * cfg.capacity;

      if (delta > 0 || sediment > capacity) {
        const amount = delta > 0 ? Math.min(delta, sediment) : (sediment - capacity) * cfg.deposit;
        sediment -= amount;
        height[index] += amount * (1 - fx) * (1 - fy);
        height[index + 1] += amount * fx * (1 - fy);
        height[index + width] += amount * (1 - fx) * fy;
        height[index + width + 1] += amount * fx * fy;
      } else {
        const amount = Math.min((capacity - sediment) * cfg.erode, -delta);
        for (let i = 0; i < brush.offsets.length; i++) {
          const cell = index + brush.offsets[i];
          const resistance = hardness ? hardness[cell] : 0.4;
          height[cell] -= amount * brush.weights[i] * (1.05 - resistance);
          sediment += amount * brush.weights[i] * (1.05 - resistance);
        }
      }

      const speedSquared = speed * speed - delta * cfg.gravity;
      speed = Math.sqrt(Math.max(0.0025, speedSquared));
      water *= 1 - cfg.evaporate;
      if (water < 0.012) break;
    }
  }
  return height;
}

export { DEFAULTS as EROSION_DEFAULTS };
