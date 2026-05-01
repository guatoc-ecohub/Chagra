/**
 * ParticleField — fondo viviente de partículas + líneas conectivas estilo
 * red micelial / red neuronal.
 *
 * Inspirado en la imagen Gemini de biodiversidad colombiana con la red
 * cyan que une los elementos. Performance budget: 60fps en GPU integrada.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COLOR_CYAN = '#0E92A6';
const COLOR_GLOW = '#4ED4E5';

interface Props {
  count?: number;
  spread?: number;
  speed?: number;
}

export function ParticleField({ count = 120, spread = 18, speed = 0.0008 }: Props) {
  const meshRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  // Posiciones iniciales aleatorias en una nube esférica
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.cbrt(Math.random()) * spread;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Velocidades suaves random
      velocities[i * 3] = (Math.random() - 0.5) * speed * 1000;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * speed * 1000;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed * 1000;
    }
    return { positions, velocities };
  }, [count, spread, speed]);

  // Color attribute por partícula (degradé sutil cyan→mint)
  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const cyan = new THREE.Color(COLOR_CYAN);
    const glow = new THREE.Color(COLOR_GLOW);
    for (let i = 0; i < count; i++) {
      const c = cyan.clone().lerp(glow, Math.random() * 0.5);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [count]);

  // Geometría de lines: conexiones entre partículas cercanas
  const linkPositions = useMemo(() => new Float32Array(count * count * 6), [count]);
  const linkColors = useMemo(() => new Float32Array(count * count * 6), [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const positionAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const positionArr = positionAttr.array as Float32Array;
    const elapsed = state.clock.elapsedTime;

    // Mover partículas con drift orgánico + bounding box wraparound
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positionArr[i3] += velocities[i3] * Math.sin(elapsed * 0.1 + i) * 0.5;
      positionArr[i3 + 1] += velocities[i3 + 1] * Math.cos(elapsed * 0.1 + i) * 0.5;
      positionArr[i3 + 2] += velocities[i3 + 2] * Math.sin(elapsed * 0.07 + i) * 0.5;

      // Wrap si sale del bounding box
      for (let axis = 0; axis < 3; axis++) {
        if (positionArr[i3 + axis] > spread) positionArr[i3 + axis] = -spread;
        if (positionArr[i3 + axis] < -spread) positionArr[i3 + axis] = spread;
      }
    }
    positionAttr.needsUpdate = true;

    // Recompute conexiones cada cierto tiempo (no cada frame para perf)
    if (Math.floor(elapsed * 10) % 3 === 0 && linesRef.current) {
      let lineIdx = 0;
      const maxDist = 4;
      const maxDistSq = maxDist * maxDist;
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = positionArr[i * 3] - positionArr[j * 3];
          const dy = positionArr[i * 3 + 1] - positionArr[j * 3 + 1];
          const dz = positionArr[i * 3 + 2] - positionArr[j * 3 + 2];
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < maxDistSq) {
            const alpha = 1 - Math.sqrt(distSq) / maxDist;
            // Posiciones del segmento
            linkPositions[lineIdx * 6] = positionArr[i * 3];
            linkPositions[lineIdx * 6 + 1] = positionArr[i * 3 + 1];
            linkPositions[lineIdx * 6 + 2] = positionArr[i * 3 + 2];
            linkPositions[lineIdx * 6 + 3] = positionArr[j * 3];
            linkPositions[lineIdx * 6 + 4] = positionArr[j * 3 + 1];
            linkPositions[lineIdx * 6 + 5] = positionArr[j * 3 + 2];
            // Color cyan con alpha por distancia
            const c = 14 / 255;
            const m = 146 / 255;
            const k = 166 / 255;
            const fade = alpha * 0.4;
            linkColors[lineIdx * 6] = c * fade;
            linkColors[lineIdx * 6 + 1] = m * fade;
            linkColors[lineIdx * 6 + 2] = k * fade;
            linkColors[lineIdx * 6 + 3] = c * fade;
            linkColors[lineIdx * 6 + 4] = m * fade;
            linkColors[lineIdx * 6 + 5] = k * fade;
            lineIdx++;
          }
        }
      }
      // Llenar el resto con zeros (oculta segmentos sobrantes)
      for (let i = lineIdx * 6; i < linkPositions.length; i++) {
        linkPositions[i] = 0;
        linkColors[i] = 0;
      }
      const linePosAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const lineColAttr = linesRef.current.geometry.attributes.color as THREE.BufferAttribute;
      linePosAttr.needsUpdate = true;
      lineColAttr.needsUpdate = true;
    }

    // Rotación suave del grupo entero
    if (meshRef.current.parent) {
      meshRef.current.parent.rotation.y = elapsed * 0.02;
      meshRef.current.parent.rotation.x = Math.sin(elapsed * 0.05) * 0.05;
    }
  });

  return (
    <group>
      <points ref={meshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={count}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count * count}
            array={linkPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={count * count}
            array={linkColors}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
