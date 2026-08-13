/**
 * 2D to 3D bridge primitives. The browser layer owns Three.js raycasting and
 * DOM buttons; these pure functions own authoring and projection math.
 */

const snappedHotspotCache = new Map();

function distanceSquared(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

export function snapHotspotsToSurface({ modelUrl = 'procedural', vertices = [], hotspots = [] } = {}) {
  if (snappedHotspotCache.has(modelUrl)) return snappedHotspotCache.get(modelUrl).map((item) => ({ ...item, position: [...item.position] }));

  const anchors = hotspots.map((hotspot) => {
    const authored = hotspot.position || [0, 0, 0];
    let nearest = authored;
    let nearestDistance = Infinity;
    for (const vertex of vertices) {
      const candidate = Array.isArray(vertex) ? vertex : [vertex.x, vertex.y, vertex.z];
      const distance = distanceSquared(authored, candidate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = candidate;
      }
    }
    return {
      ...hotspot,
      position: [...nearest],
      authoredPosition: [...authored],
      snapped: vertices.length > 0,
    };
  });

  snappedHotspotCache.set(modelUrl, anchors);
  return anchors.map((item) => ({ ...item, position: [...item.position] }));
}

export function clearHotspotCache() {
  snappedHotspotCache.clear();
}

export function getHotspotCacheSize() {
  return snappedHotspotCache.size;
}

export function ndcToPixels(ndc, width, height) {
  return {
    x: (ndc.x * 0.5 + 0.5) * width,
    y: (-ndc.y * 0.5 + 0.5) * height,
  };
}

/**
 * @param {[number, number, number]} point
 * @param {{ camera?: import('three').Camera, width?: number, height?: number, THREE?: typeof import('three') }} [options]
 */
export function projectHotspot(point, { camera, width, height, THREE } = {}) {
  if (!camera || !THREE || !point) return { visible: false, x: 0, y: 0 };
  const projected = new THREE.Vector3(point[0], point[1], point[2]).project(camera);
  const pixels = ndcToPixels(projected, width, height);
  return {
    ...pixels,
    ndc: projected,
    visible: projected.z >= -1 && projected.z <= 1,
  };
}
