/*
 * Arnés diag del hato: monta AnimalesDeFinca solo, con luz tipo valle y cámara
 * cercana por query (?vista=...&q=0.42). Para capturas antes/después.
 */
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import AnimalesDeFinca from '/src/mockups/valle/animales.jsx';

const params = new URLSearchParams(location.search);
const vista = params.get('vista') || 'general';
const q = params.has('q') ? Number(params.get('q')) : 1;

/* Encuadres: [posición cámara], [mira a]. El corral vive en ~[-1.8..1.6]². */
const VISTAS = {
  general: { pos: [2.6, 2.2, 3.2], mira: [-0.1, 0.35, 0] },
  vaca: { pos: [1.55, 0.85, 1.15], mira: [0.35, 0.55, -0.3] },
  cerdos: { pos: [-2.6, 0.75, 0.85], mira: [-1.25, 0.3, -0.25] },
  ovejas: { pos: [0.9, 0.7, 2.5], mira: [-0.15, 0.3, 1.2] },
  gallinas: { pos: [2.2, 0.55, 1.6], mira: [1.15, 0.2, 0.55] },
  perro: { pos: [1.9, 0.7, -1.7], mira: [1.05, 0.3, -0.85] },
};
const V = VISTAS[vista] || VISTAS.general;

createRoot(document.getElementById('root')).render(
  <Canvas
    shadows
    dpr={2}
    camera={{ position: V.pos, fov: 42 }}
    onCreated={({ camera }) => camera.lookAt(V.mira[0], V.mira[1], V.mira[2])}
  >
    <ambientLight intensity={0.55} />
    <hemisphereLight args={['#cfe6ff', '#5a7a4a', 0.5]} />
    <directionalLight position={[4, 6, 3]} intensity={1.25} castShadow />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[6, 32]} />
      <meshLambertMaterial color="#7fa055" />
    </mesh>
    <AnimalesDeFinca reducedMotion q={q} />
  </Canvas>,
);
