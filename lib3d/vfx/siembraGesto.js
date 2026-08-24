/*
 * Gesto de siembra: pointer NDC -> terreno -> spline -> puntos uniformes.
 *
 * Patrón destilado de AvatarCastingAbilitiesThreeJS (MIT, Achref Elouafi).
 * El módulo no dibuja ni crea assets: deja que el consumidor decida qué
 * instancia en cada punto del surco.
 */
import { CatmullRomCurve3, MathUtils, Plane, Raycaster, Vector2, Vector3 } from 'three';

const DEFAULTS = Object.freeze({
  smoothing: 0.55,
  minPointDistance: 0.12,
  maxPoints: 96,
  minPathLength: 0.5,
  curveTension: 0.5,
  samplesPerUnit: 6,
  height: 0.02,
});

export class GestoSurco {
  constructor(camera, opts = {}) {
    this.camera = camera;
    this.cfg = { ...DEFAULTS, ...opts };
    this.terrain = opts.terrain || null;
    this.onStart = opts.onStart || null;
    this.onUpdate = opts.onUpdate || null;
    this.onCast = opts.onCast || null;
    this.onCancel = opts.onCancel || null;
    this.raycaster = new Raycaster();
    this.raycaster.far = 500;
    this.plane = new Plane(new Vector3(0, 1, 0), 0);
    this.samples = [];
    this.resampled = Array.from({ length: 320 }, () => new Vector3());
    this.resampledCount = 0;
    this.active = false;
    this.hit = new Vector3();
    this.smoothed = new Vector3();
    this.ndc = new Vector2();
  }

  project(ndc, out = this.hit) {
    this.ndc.set(ndc.x, ndc.y);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (this.terrain) {
      const hits = this.raycaster.intersectObject(this.terrain, true);
      if (hits.length) return out.copy(hits[0].point), true;
    }
    return this.raycaster.ray.intersectPlane(this.plane, out) !== null;
  }

  begin(ndc) {
    if (!this.project(ndc)) return false;
    this.samples.length = 0;
    this.smoothed.copy(this.hit);
    this.samples.push(this.hit.clone());
    this.active = true;
    this.onStart?.(this.hit);
    return true;
  }

  move(ndc) {
    if (!this.active || !this.project(ndc)) return;
    const { cfg } = this;
    this.smoothed.lerp(this.hit, MathUtils.clamp(1 - cfg.smoothing, 0.05, 1));
    const last = this.samples[this.samples.length - 1];
    if (last && this.smoothed.distanceTo(last) < cfg.minPointDistance) return;
    if (this.samples.length >= cfg.maxPoints) return;
    this.samples.push(this.smoothed.clone());
    this.rebuild();
  }

  end() {
    if (!this.active) return null;
    this.active = false;
    const length = this.pathLength();
    if (this.samples.length < 3 || length < this.cfg.minPathLength) {
      this.samples.length = 0;
      this.onCancel?.();
      return null;
    }
    const curve = this.buildCurve();
    this.onCast?.(curve, this.resampled, this.resampledCount, length);
    this.samples.length = 0;
    return curve;
  }

  pathLength() {
    let length = 0;
    for (let i = 1; i < this.samples.length; i++) length += this.samples[i].distanceTo(this.samples[i - 1]);
    return length;
  }

  buildCurve() {
    const curve = new CatmullRomCurve3(this.samples.map((point) => point.clone()), false, 'catmullrom', this.cfg.curveTension);
    curve.arcLengthDivisions = Math.max(64, this.samples.length * 8);
    return curve;
  }

  rebuild() {
    if (this.samples.length < 2) return;
    const curve = this.buildCurve();
    const wanted = MathUtils.clamp(Math.round(curve.getLength() * this.cfg.samplesPerUnit), 2, this.resampled.length);
    for (let i = 0; i < wanted; i++) {
      curve.getPointAt(i / (wanted - 1), this.resampled[i]);
      this.resampled[i].y += this.cfg.height;
    }
    this.resampledCount = wanted;
    this.onUpdate?.(this.resampled, wanted);
  }
}

export function sembrarAloLargo(curve, opts = {}) {
  const espaciado = opts.espaciado ?? 0.6;
  const maxPuntos = opts.maxPuntos ?? 200;
  const jitter = opts.jitter ?? 0;
  if (!opts.onPunto) return 0;
  const length = curve.getLength();
  const count = Math.min(maxPuntos, Math.max(1, Math.floor(length / espaciado)));
  let seed = opts.seed ?? 1;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const pos = new Vector3();
  const tangent = new Vector3();
  const side = new Vector3();
  const up = new Vector3(0, 1, 0);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    curve.getPointAt(t, pos);
    curve.getTangentAt(t, tangent);
    if (jitter > 0) {
      side.crossVectors(tangent, up);
      if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
      side.normalize();
      pos.addScaledVector(side, (random() * 2 - 1) * jitter);
    }
    opts.onPunto(pos, tangent, t, i);
  }
  return count;
}

export function demoSurco(opts = {}) {
  const origin = opts.origin || new Vector3();
  const largo = opts.largo ?? 8;
  const ancho = opts.ancho ?? 3;
  const height = opts.height ?? 0.02;
  const sampleHeight = opts.sampleHeight || (() => origin.y);
  const points = [];
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const z = origin.z + (t - 0.5) * largo;
    const x = origin.x + Math.sin(t * Math.PI * 1.6) * (ancho * 0.5);
    points.push(new Vector3(x, sampleHeight(x, z) + height, z));
  }
  const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  curve.arcLengthDivisions = 128;
  return curve;
}

export const SIEMBRA_DEFAULTS = DEFAULTS;
