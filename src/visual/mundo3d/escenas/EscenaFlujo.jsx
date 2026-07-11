/*
 * EscenaFlujo — ARQUETIPO `flujo`: el CAMINO del agua (gravedad y pendiente).
 *
 * El agua se entiende por dónde BAJA: nacimiento → quebrada → tanque → riego.
 * Una cinta-tubo que desciende por una curva (la pendiente ES la lección) y un
 * tanque que la recibe; la cinta respira su opacidad (agua viva). Reusa
 * `MeshLambert`/`MeshBasic`, sin sombras.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import EscenaBase3D from './EscenaBase3D.jsx';

function Cinta({ curva, color, reducedMotion }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    ref.current.material.opacity = 0.72 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
  });
  const geo = useMemo(() => {
    const pts = (curva || [
      [-1.8, 2.2, 0.4], [-0.9, 1.4, 0.1], [0, 0.7, -0.2], [0.7, 0.1, 0.1], [1.4, -0.2, 0.5],
    ]).map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const c = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(c, 48, 0.16, 6, false);
  }, [curva]);
  return (
    <mesh geometry={geo}>
      <meshLambertMaterial ref={ref} color={color} transparent opacity={0.78} />
    </mesh>
  );
}

function Diorama({ params, tinte, reducedMotion }) {
  const color = params?.agua || (tinte && tinte[0]) || '#3f8fb0';
  return (
    <group>
      {/* la ladera por la que baja el agua */}
      <mesh position={[-0.4, 0.6, -0.3]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[3.6, 0.5, 2.4]} />
        <meshLambertMaterial color="#7d9a5c" flatShading />
      </mesh>
      {/* el nacimiento arriba */}
      <mesh position={[-1.8, 2.25, 0.4]}>
        <cylinderGeometry args={[0.34, 0.4, 0.16, 14]} />
        <meshLambertMaterial color={color} transparent opacity={0.85} />
      </mesh>
      <Cinta curva={params?.curva} color={color} reducedMotion={reducedMotion} />
      {/* el tanque que recibe el agua */}
      <mesh position={[1.5, -0.1, 0.5]}>
        <cylinderGeometry args={[0.55, 0.6, 0.7, 18]} />
        <meshLambertMaterial color="#9a8b74" flatShading />
      </mesh>
      <mesh position={[1.5, 0.1, 0.5]}>
        <cylinderGeometry args={[0.5, 0.5, 0.12, 18]} />
        <meshLambertMaterial color={color} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export default function EscenaFlujo(props) {
  const cielo = { fondo: '#d9e8ec', cielo: '#eaf3f5', suelo: '#7f9270', intensidad: 1.1 };
  return (
    <EscenaBase3D {...props} cielo={cielo} entrada={{ ...props.entrada, centro: [0, 0.9, 0.3] }}>
      <Diorama params={props.params} tinte={props.tinte} reducedMotion={props.reducedMotion} />
    </EscenaBase3D>
  );
}
