/*
 * mundo3dLandmarks — el REGISTRO de formas procedurales de cada landmark.
 *
 * Antes, el `switch (tipo)` de `LandmarkGeom` vivía HARDCODEADO dentro de
 * `Valle3D`. El framework de mundos-3D (DR §4.4, §7-1) lo saca a un MAPA de
 * datos: `LANDMARKS[tipo]` → un componente de geometría low-poly. Así:
 *   · el valle (capa lejana) resuelve su forma por `tipo` sin un switch inline;
 *   · sumar un mundo nuevo NO toca este archivo salvo que traiga una forma nueva.
 *
 * Todo es GEOMETRÍA PROCEDURAL (cajas/conos/cilindros/icosaedros — cero GLTF/HDR
 * remotos) → offline-first y liviano, igual que el resto del valle.
 */
/* Nota: las props de three (position, args, rotation, etc.) son válidas en el
   reconciliador de R3F, no en el DOM — el config de ESLint del repo no activa
   react/no-unknown-property, así que no requieren disable. */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

/* La veleta gira con el viento; su propia coreografía (no depende del valle). */
export function Veleta({ color, reducedMotion }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y = state.clock.elapsedTime * 0.4;
  });
  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.1, 6]} />
        <meshStandardMaterial color="#7c6a4c" flatShading />
      </mesh>
      <group ref={ref} position={[0, 1.15, 0]}>
        <mesh>
          <boxGeometry args={[0.7, 0.06, 0.06]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        <mesh position={[0.42, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.14, 0.3, 4]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      </group>
    </group>
  );
}

function Milpa({ tinte }) {
  const [fuerte] = tinte;
  return (
    <group>
      {[-0.5, 0, 0.5, -0.25, 0.25].map((dx, i) => (
        <group key={i} position={[dx, 0, (i % 2) * 0.4 - 0.2]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 1.4, 5]} />
            <meshStandardMaterial color={fuerte} flatShading />
          </mesh>
          <mesh position={[0, 1.45, 0]}>
            <coneGeometry args={[0.12, 0.4, 5]} />
            <meshStandardMaterial color="#e7c96b" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Cafetal({ tinte }) {
  const [fuerte] = tinte;
  return (
    <group>
      {[-0.6, -0.2, 0.2, 0.6].map((dx, i) => (
        <mesh key={i} position={[dx, 0.32, (i % 2) * 0.4]} castShadow>
          <icosahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial color={fuerte} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Era({ tinte }) {
  const [, suave] = tinte;
  return (
    <group>
      {[-0.35, 0, 0.35].map((dz, i) => (
        <mesh key={i} position={[0, 0.08, dz]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.16, 0.22]} />
          <meshStandardMaterial color="#5a3d28" flatShading roughness={1} />
        </mesh>
      ))}
      {[-0.35, 0, 0.35].map((dz, i) => (
        <mesh key={`b${i}`} position={[0, 0.24, dz]}>
          <boxGeometry args={[1.2, 0.06, 0.14]} />
          <meshStandardMaterial color={suave} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Quebrada() {
  return (
    <group>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.55, 0.6, 0.12, 16]} />
        <meshStandardMaterial color="#3a7fa0" transparent opacity={0.85} metalness={0.4} roughness={0.2} />
      </mesh>
      {[-0.3, 0.1, 0.4].map((dx, i) => (
        <mesh key={i} position={[dx, 0.4, 0.2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 4]} />
          <meshStandardMaterial color="#4e7d3f" flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Corral({ tinte }) {
  const [fuerte, suave] = tinte;
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.9, 0.7, 0.8]} />
        <meshStandardMaterial color={suave} flatShading />
      </mesh>
      <mesh position={[0, 0.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.72, 0.5, 4]} />
        <meshStandardMaterial color={fuerte} flatShading />
      </mesh>
      {[-0.9, -0.5, 0.9, 1.3].map((dx, i) => (
        <mesh key={i} position={[dx, 0.2, 0.9]}>
          <boxGeometry args={[0.06, 0.4, 0.06]} />
          <meshStandardMaterial color="#8a6a44" flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Huerta({ tinte }) {
  const [fuerte] = tinte;
  return (
    <group>
      {[-0.4, 0.4].map((dx, i) => (
        <group key={i} position={[dx, 0, 0]}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.6, 0.24, 1]} />
            <meshStandardMaterial color="#6b4a30" flatShading />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[0.5, 0.18, 0.9]} />
            <meshStandardMaterial color={fuerte} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Bosque({ tinte }) {
  const [fuerte] = tinte;
  return (
    <group>
      {[
        [-0.5, 0, 0.9],
        [0.4, 0.2, 1.15],
        [0, -0.4, 0.8],
      ].map(([dx, dz, h], i) => (
        <group key={i} position={[dx, 0, dz]}>
          <mesh position={[0, h * 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.12, h * 0.7, 6]} />
            <meshStandardMaterial color="#6b4a2e" flatShading />
          </mesh>
          <mesh position={[0, h * 0.8, 0]} castShadow>
            <coneGeometry args={[0.5, h * 0.9, 7]} />
            <meshStandardMaterial color={fuerte} flatShading roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function LandmarkDefault({ tinte }) {
  const [fuerte] = tinte;
  return (
    <mesh position={[0, 0.3, 0]}>
      <icosahedronGeometry args={[0.4, 0]} />
      <meshStandardMaterial color={fuerte} flatShading />
    </mesh>
  );
}

/* El REGISTRO: `tipo` → componente de geometría. Sumar una forma nueva = añadir
   una entrada aquí (la única vez que se escribe geometría de un landmark).
   Interno: el resto del framework lo consume vía `LandmarkPorTipo`. */
const LANDMARKS = {
  milpa: Milpa,
  cafetal: Cafetal,
  era: Era,
  quebrada: Quebrada,
  corral: Corral,
  huerta: Huerta,
  bosque: Bosque,
  veleta: Veleta,
};

/**
 * Resuelve la geometría de un landmark por `tipo`, con la `veleta` como caso que
 * necesita `reducedMotion` para su giro. Cae a un icosaedro digno si el tipo es
 * desconocido — nunca un error.
 */
export function LandmarkPorTipo({ tipo, tinte, reducedMotion }) {
  if (tipo === 'veleta') return <Veleta color={tinte[0]} reducedMotion={reducedMotion} />;
  const Forma = LANDMARKS[tipo] || LandmarkDefault;
  return <Forma tinte={tinte} />;
}
