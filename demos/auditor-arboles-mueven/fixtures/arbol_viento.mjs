import * as THREE from 'three';

const arboles = [];

export function crearArboles(scene) {
  for (let i = 0; i < 40; i++) {
    const tronco = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.4, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2b })
    );
    const copa = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
    );
    copa.position.y = 2.5;
    const arbol = new THREE.Group();
    arbol.add(tronco, copa);
    arbol.position.x = (i - 20) * 2.5;
    arboles.push(arbol);
    scene.add(arbol);
  }
}

export function animarArboles(clock) {
  const elapsedTime = clock.getElapsedTime();
  for (const arbol of arboles) {
    const viento = Math.sin(elapsedTime * 1.3 + arbol.position.x);
    arbol.rotation.z = viento * 0.08;
  }
}
