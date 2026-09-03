/**
 * Snakey locomotion helpers for Chagra.
 *
 * Pattern distilled from muratkamci/snakey-locomotion (MIT): the trail owns
 * position, surface normal and grounded state. Consumers may use it for a
 * procedural creature or for any object that must stay attached to a slope.
 * This module deliberately has no scene-specific knowledge.
 */

import { Matrix4, Quaternion, Vector3 } from 'three';

const UP = new Vector3(0, 1, 0);

function surfaceHeight(surface, x, z) {
  if (typeof surface === 'function') return Number(surface(x, z)) || 0;
  if (surface && typeof surface.heightAt === 'function') return Number(surface.heightAt(x, z)) || 0;
  return 0;
}

/** Return a unit surface normal from a height sampler. */
export function normalDeSuperficie(surface, x, z, step = 0.08, out = new Vector3()) {
  const dx = surfaceHeight(surface, x + step, z) - surfaceHeight(surface, x - step, z);
  const dz = surfaceHeight(surface, x, z + step) - surfaceHeight(surface, x, z - step);
  return out.set(-dx / (2 * step), 1, -dz / (2 * step)).normalize();
}

function orientToNormal(object, normal, forward) {
  if (!object?.quaternion || !forward) return;
  const tangent = forward.clone().addScaledVector(normal, -forward.dot(normal));
  if (tangent.lengthSq() < 1e-8) return;
  tangent.normalize();
  const right = new Vector3().crossVectors(tangent, normal).normalize();
  const basis = new Vector3().crossVectors(normal, right).normalize();
  // Object +Y follows the ground normal and object +Z follows its travel
  // direction. Matrix-free basis construction keeps this helper cheap.
  const basisMatrix = new Matrix4().makeBasis(right, normal, basis);
  const q = new Quaternion().setFromRotationMatrix(basisMatrix);
  object.quaternion.copy(q);
}

/**
 * Keep an object grounded and optionally align its local up axis to terrain.
 *
 * @param {{position: Vector3, quaternion?: Quaternion}} object
 * @param {((x:number,z:number)=>number)|{heightAt:function}} surface
 * @param {{offset?:number, step?:number, forward?:Vector3, alignToNormal?:boolean}} options
 * @returns {{grounded:boolean, height:number, normal:Vector3, position:Vector3}}
 */
export function pegarAlTerreno(object, surface, options = {}) {
  if (!object?.position) {
    return { grounded: false, height: 0, normal: UP.clone(), position: new Vector3() };
  }

  const offset = Number(options.offset) || 0;
  const height = surfaceHeight(surface, object.position.x, object.position.z);
  const normal = normalDeSuperficie(surface, object.position.x, object.position.z, options.step ?? 0.08);
  object.position.y = height + offset;

  if (options.alignToNormal !== false && options.forward) {
    orientToNormal(object, normal, options.forward);
  }

  return { grounded: true, height, normal, position: object.position };
}

/** Small deterministic trail buffer. Points are stored by arc length. */
export function crearRastro({ maxPoints = 128, spacing = 0.24 } = {}) {
  const points = [];
  let distance = 0;

  return {
    get points() { return points; },
    get distance() { return distance; },
    push(position, normal = UP) {
      const p = position.clone ? position.clone() : new Vector3(...position);
      const n = normal.clone ? normal.clone().normalize() : UP.clone();
      const previous = points[points.length - 1];
      if (previous) {
        const segment = p.distanceTo(previous.position);
        if (segment < spacing) return false;
        distance += segment;
      }
      points.push({ position: p, normal: n, grounded: true, distance });
      if (points.length > maxPoints) points.shift();
      return true;
    },
    clear() {
      points.length = 0;
      distance = 0;
    },
  };
}

/** Sample a trail point at a distance measured from its oldest point. */
export function puntoEnRastro(trail, targetDistance, out = new Vector3()) {
  const points = trail?.points || [];
  if (!points.length) return null;
  if (points.length === 1 || targetDistance <= points[0].distance) return out.copy(points[0].position);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (targetDistance <= b.distance) {
      const t = (targetDistance - a.distance) / Math.max(1e-6, b.distance - a.distance);
      return out.copy(a.position).lerp(b.position, t);
    }
  }
  return out.copy(points[points.length - 1].position);
}
