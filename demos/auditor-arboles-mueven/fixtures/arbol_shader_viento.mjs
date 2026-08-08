import * as THREE from 'three';

export function crearArbolConViento() {
  const follaje = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 8, 8),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        uniform float uTime;
        varying vec3 vPos;
        void main() {
          vPos = position;
          vec3 pos = position;
          float viento = sin(uTime * 2.0 + position.y * 0.5);
          pos.x += viento * displacement * 0.2;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        void main() {
          gl_FragColor = vec4(0.18, 0.49, 0.19, 1.0);
        }
      `,
    })
  );
  const arbol = new THREE.Group();
  arbol.add(follaje);
  return arbol;
}
