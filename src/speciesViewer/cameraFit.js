/**
 * Camera fitting for the species viewer.
 *
 * The calculation works on the actual silhouette vertices instead of a
 * bounding box. It deliberately has no Three.js import so it can be tested
 * without a WebGL environment.
 */

const MIN_FILL = 0.55;
const MAX_FILL = 0.92;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function point3(value) {
  if (Array.isArray(value)) return { x: value[0] || 0, y: value[1] || 0, z: value[2] || 0 };
  return { x: value?.x || 0, y: value?.y || 0, z: value?.z || 0 };
}

/**
 * Returns the camera distance required for every silhouette vertex to fit.
 * Points are expressed in camera-aligned coordinates, with positive z away
 * from the target pivot. This makes the function useful for both a real mesh
 * and a procedural specimen.
 */
export function getPerspectiveFitDistanceForSilhouette(vertices, options = {}) {
  const verticalFov = options.verticalFov ?? Math.PI / 4;
  const aspect = Math.max(0.1, options.aspect ?? 1);
  const fillX = clamp(options.fillX ?? options.fill ?? 0.78, MIN_FILL, MAX_FILL);
  const fillY = clamp(options.fillY ?? options.fill ?? 0.78, MIN_FILL, MAX_FILL);
  const pivot = point3(options.pivot);
  const tanY = Math.tan(verticalFov / 2);
  const tanX = tanY * aspect;
  const minDistance = options.minDistance ?? 0.2;
  let required = minDistance;

  for (const vertex of vertices || []) {
    const point = point3(vertex);
    const x = point.x - pivot.x;
    const y = point.y - pivot.y;
    const z = point.z - pivot.z;
    required = Math.max(
      required,
      z + Math.abs(x) / (tanX * fillX),
      z + Math.abs(y) / (tanY * fillY),
    );
  }

  return required;
}

/**
 * Scenario objects and water washes can be large. They must not contaminate
 * the specimen's fit distance.
 */
export function isExcludedFromCameraFit(object) {
  let current = object;
  while (current) {
    if (current.userData?.excludeFromCameraFit === true) return true;
    current = current.parent;
  }
  return false;
}

/**
 * Collects real geometry vertices from a Three.js tree. Three is injected by
 * the browser entry to keep this module straightforward to test in Vitest.
 */
export function collectSilhouetteVertices(root, { THREE, camera, pivotWorld = null } = {}) {
  if (!root || !THREE || !camera) return [];
  root.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const pivot = pivotWorld ? pivotWorld.clone().applyMatrix4(camera.matrixWorldInverse) : new THREE.Vector3();
  const vertices = [];

  root.traverse((object) => {
    if (!object.isMesh || isExcludedFromCameraFit(object)) return;
    const attribute = object.geometry?.attributes?.position;
    if (!attribute) return;
    for (let index = 0; index < attribute.count; index += 1) {
      const world = new THREE.Vector3().fromBufferAttribute(attribute, index).applyMatrix4(object.matrixWorld);
      const cameraPoint = world.applyMatrix4(camera.matrixWorldInverse);
      vertices.push({
        x: cameraPoint.x - pivot.x,
        y: cameraPoint.y - pivot.y,
        z: cameraPoint.z - pivot.z,
      });
    }
  });

  return vertices;
}

export function cameraFitFromSilhouette({ root, camera, THREE, pivotWorld, fill = 0.78, minDistance = 1 }) {
  const vertices = collectSilhouetteVertices(root, { THREE, camera, pivotWorld });
  return getPerspectiveFitDistanceForSilhouette(vertices, {
    verticalFov: camera.fov * Math.PI / 180,
    aspect: camera.aspect,
    fill,
    minDistance,
  });
}
