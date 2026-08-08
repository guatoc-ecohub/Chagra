import * as THREE from 'three';

export function crearArbolesEstaticos(scene) {
  for (let i = 0; i < 30; i++) {
    const tronco = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 5),
      new THREE.MeshStandardMaterial({ color: 0x5d4037 })
    );
    const follaje = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x388e3c })
    );
    follaje.position.y = 3;
    const arbol = new THREE.Group();
    arbol.add(tronco, follaje);
    arbol.position.set((i - 15) * 3, 0, 0);
    scene.add(arbol);
  }
}
