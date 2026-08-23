import * as THREE from 'three';

export function bakeArbolGeometry() {
  // Bake: precompute geometry for a tree and serializarla para reutilizarla.
  const tronco = new THREE.CylinderGeometry(0.25, 0.4, 4.5, 8);
  const copa = new THREE.SphereGeometry(1.5, 10, 10);
  const troncoMesh = new THREE.Mesh(
    tronco,
    new THREE.MeshStandardMaterial({ color: 0x6b4a2b })
  );
  const copaMesh = new THREE.Mesh(
    copa,
    new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
  );
  const arbol = new THREE.Group();
  arbol.add(troncoMesh, copaMesh);
  return {
    baked: true,
    geometry: {
      tronco,
      copa,
      serializable: true,
    },
    arbol,
  };
}
