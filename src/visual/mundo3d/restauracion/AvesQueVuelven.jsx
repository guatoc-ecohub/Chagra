/*
 * AvesQueVuelven — la fauna que regresa.
 *
 * El último eslabón, y el que no se puede sembrar: las aves llegan cuando el
 * bosque ya las puede sostener — cuando hay dosel, hay agua y hay qué comer. No se
 * las trae nadie; se vienen solas. Por eso aparecen recién pasado el año 38, y por
 * eso son lo único de la escena que se mueve por su cuenta.
 *
 * Deliberadamente mínimas: a la distancia a la que vuelan, un ave ES una V que se
 * mueve. Todas en UN InstancedMesh (una draw-call), girando despacio sobre el
 * monte. En gama baja no van: son lo primero que sobra.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geomAve, alturaLadera } from './sucesion.geom.js';
import { fauna } from './tiempoSucesion.js';

/**
 * @param {{ anioRef: { current: number }, n?: number, reducedMotion?: boolean }} props
 */
export default function AvesQueVuelven({ anioRef, n = 4, reducedMotion = false }) {
  const ref = useRef(null);
  const geo = useMemo(() => geomAve(31), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);

  // Cada ave lleva su propia órbita: radio, altura, velocidad y arranque.
  const vuelos = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        radio: 5 + (i % 3) * 2.6,
        centro: [-1 + (i % 2) * 3, -4 - (i % 3) * 2],
        alto: 3.4 + (i % 3) * 1.1,
        vel: 0.1 + (i % 4) * 0.022,
        fase: i * 1.9,
      })),
    [n],
  );

  useLayoutEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const f = fauna(anioRef.current);
    mesh.visible = f > 0.02;
    if (!mesh.visible) return;

    const t = reducedMotion ? 4 : state.clock.elapsedTime;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();

    for (let i = 0; i < vuelos.length; i++) {
      const v = vuelos[i];
      const ang = t * v.vel + v.fase;
      const x = v.centro[0] + Math.cos(ang) * v.radio;
      const z = v.centro[1] + Math.sin(ang) * v.radio;
      // Vuelan SOBRE la ladera, no a una altura plana: siguen el monte.
      const y = alturaLadera(x, z) + v.alto + Math.sin(t * 0.5 + v.fase) * 0.28;
      p.set(x, y, z);
      // Encaradas hacia donde van, y ladeadas hacia adentro de la curva.
      e.set(0, -ang + Math.PI / 2, Math.sin(t * 1.6 + v.fase) * 0.18 - 0.14);
      q.setFromEuler(e);
      s.setScalar(f);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!n) return null;
  return <instancedMesh ref={ref} args={[geo, mat, n]} frustumCulled={false} />;
}
