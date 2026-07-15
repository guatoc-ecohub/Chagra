/*
 * Animales de finca del valle — el mundo 'animales' (antes una casita muda).
 *
 * Cría campesina de verdad: una vaca, ovejas, gallinas y un cerdo, low-poly de
 * PRIMITIVAS redondeadas (cápsulas, esferas, conos) — nada de cajas. Cada uno
 * tiene un micro-movimiento suave (la vaca pasta, la gallina picotea, la oveja
 * y el cerdo respiran); con `reducedMotion` la escena queda quieta en un
 * fotograma digno. Todo procedural: cero GLTF, offline y liviano.
 *
 * Las criaturas de src/visual/creatures/ son FAUNA menuda (abeja, colibrí,
 * mariposa, escarabajo, lombriz) — no hay animales de corral aptos allí, así
 * que estos se arman con geometría de three. Son decorativos (aria-hidden): el
 * botón accesible del mundo lo pone MundoLugar.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* El material COMPARTIDO de las mallas fusionadas con color horneado por
   vértice (arboleda por especie hoy; el hato realista de finca-realismo-d1
   cuando mergee — mismo export, cero conflicto). UNO para todas: cada malla
   fusionada es 1 draw call. */
export const MATERIAL_FINCA = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
});

/* Patas: cuatro cilindros finos y cortos, iguales para todos los cuadrúpedos. */
function Patas({ x = 0.28, z = 0.16, alto = 0.26, r = 0.05, color }) {
  const spots = [
    [x, z],
    [-x, z],
    [x, -z],
    [-x, -z],
  ];
  return (
    <group>
      {spots.map(([px, pz], i) => (
        <mesh key={i} position={[px, alto / 2, pz]} castShadow>
          <cylinderGeometry args={[r * 0.8, r, alto, 6]} />
          <meshStandardMaterial color={color} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* Vaca — cuerpo de cápsula con manchas, cabeza que baja a pastar y cuernitos. */
function Vaca({ pos = [0, 0, 0], giro = 0, reducedMotion }) {
  const cabeza = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !cabeza.current) return;
    // Pasta: baja y sube la cabeza con calma.
    const t = state.clock.elapsedTime * 0.6;
    cabeza.current.rotation.x = -0.15 + (Math.sin(t) * 0.5 + 0.5) * 0.6;
  });
  return (
    <group position={[pos[0], pos[1], pos[2]]} rotation={[0, giro, 0]} scale={0.9}>
      <Patas x={0.34} z={0.2} alto={0.34} r={0.06} color="#6b5744" />
      {/* lomo */}
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.28, 0.7, 4, 10]} />
        <meshStandardMaterial color="#f2ebde" flatShading roughness={1} />
      </mesh>
      {/* manchas */}
      <mesh position={[0.18, 0.78, 0.16]} castShadow>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#5a4632" flatShading roughness={1} />
      </mesh>
      <mesh position={[-0.24, 0.6, -0.16]} castShadow>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshStandardMaterial color="#5a4632" flatShading roughness={1} />
      </mesh>
      {/* cabeza (pivota para pastar) */}
      <group ref={cabeza} position={[0.55, 0.62, 0]}>
        <mesh position={[0.12, -0.04, 0]} castShadow>
          <sphereGeometry args={[0.19, 10, 10]} />
          <meshStandardMaterial color="#ece1cf" flatShading roughness={1} />
        </mesh>
        <mesh position={[0.28, -0.08, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.08, 3, 8]} />
          <meshStandardMaterial color="#d7a79a" flatShading roughness={1} />
        </mesh>
        {/* cuernitos */}
        <mesh position={[0.06, 0.12, 0.1]} rotation={[0.4, 0, 0.3]}>
          <coneGeometry args={[0.035, 0.14, 6]} />
          <meshStandardMaterial color="#d8cbb0" flatShading />
        </mesh>
        <mesh position={[0.06, 0.12, -0.1]} rotation={[-0.4, 0, 0.3]}>
          <coneGeometry args={[0.035, 0.14, 6]} />
          <meshStandardMaterial color="#d8cbb0" flatShading />
        </mesh>
      </group>
      {/* cola */}
      <mesh position={[-0.5, 0.5, 0]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.02, 0.03, 0.4, 5]} />
        <meshStandardMaterial color="#e0d6c6" flatShading />
      </mesh>
    </group>
  );
}

/* Oveja — vellón de esferas apiladas, cabeza oscura, respiración leve. */
function Oveja({ pos = [0, 0, 0], giro = 0, fase = 0, reducedMotion }) {
  const cuerpo = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !cuerpo.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 1.4 + fase) * 0.02;
    cuerpo.current.scale.set(s, s, s);
  });
  return (
    <group position={[pos[0], pos[1], pos[2]]} rotation={[0, giro, 0]} scale={0.5}>
      <Patas x={0.22} z={0.14} alto={0.24} r={0.045} color="#3c3a3a" />
      {/* vellón: varias esferas para una silueta esponjosa */}
      <group ref={cuerpo} position={[0, 0.42, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.32, 10, 10]} />
          <meshStandardMaterial color="#efeee9" flatShading roughness={1} />
        </mesh>
        <mesh position={[0.2, 0.06, 0.12]} castShadow>
          <sphereGeometry args={[0.2, 9, 9]} />
          <meshStandardMaterial color="#f4f3ee" flatShading roughness={1} />
        </mesh>
        <mesh position={[-0.18, 0.04, -0.12]} castShadow>
          <sphereGeometry args={[0.2, 9, 9]} />
          <meshStandardMaterial color="#e7e6e0" flatShading roughness={1} />
        </mesh>
      </group>
      {/* cabeza */}
      <mesh position={[0.36, 0.44, 0]} castShadow>
        <sphereGeometry args={[0.15, 9, 9]} />
        <meshStandardMaterial color="#3c3a3a" flatShading roughness={1} />
      </mesh>
      {/* orejitas */}
      <mesh position={[0.34, 0.5, 0.14]} rotation={[0.3, 0, -0.4]}>
        <coneGeometry args={[0.05, 0.12, 5]} />
        <meshStandardMaterial color="#332f2f" flatShading />
      </mesh>
      <mesh position={[0.34, 0.5, -0.14]} rotation={[-0.3, 0, -0.4]}>
        <coneGeometry args={[0.05, 0.12, 5]} />
        <meshStandardMaterial color="#332f2f" flatShading />
      </mesh>
    </group>
  );
}

/* Gallina — cuerpo ovoide, cresta y pico, cola en cuña; picotea el suelo. */
function Gallina({ pos = [0, 0, 0], giro = 0, fase = 0, color = '#e8e2d6', reducedMotion }) {
  const cuello = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !cuello.current) return;
    // Picoteo: baja de golpe y vuelve, con pausas.
    const c = (Math.sin(state.clock.elapsedTime * 2.4 + fase) + 1) / 2;
    cuello.current.rotation.z = -Math.pow(c, 4) * 0.9;
  });
  return (
    <group position={[pos[0], pos[1], pos[2]]} rotation={[0, giro, 0]} scale={0.34}>
      {/* patitas */}
      {[0.1, -0.1].map((pz, i) => (
        <mesh key={i} position={[0.02, 0.14, pz]}>
          <cylinderGeometry args={[0.02, 0.02, 0.28, 5]} />
          <meshStandardMaterial color="#e6a53c" flatShading />
        </mesh>
      ))}
      {/* cuerpo */}
      <mesh position={[0, 0.44, 0]} rotation={[0, 0, 0.2]} castShadow>
        <sphereGeometry args={[0.3, 10, 10]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
      {/* cola en cuña */}
      <mesh position={[-0.28, 0.6, 0]} rotation={[0, 0, 0.8]}>
        <coneGeometry args={[0.16, 0.34, 5]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
      {/* cuello + cabeza (pivota al picotear) */}
      <group ref={cuello} position={[0.24, 0.56, 0]}>
        <mesh position={[0.06, 0.14, 0]} castShadow>
          <sphereGeometry args={[0.15, 9, 9]} />
          <meshStandardMaterial color={color} flatShading roughness={1} />
        </mesh>
        {/* cresta */}
        <mesh position={[0.06, 0.3, 0]}>
          <coneGeometry args={[0.06, 0.14, 5]} />
          <meshStandardMaterial color="#d64b3a" flatShading />
        </mesh>
        {/* pico */}
        <mesh position={[0.2, 0.12, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.05, 0.12, 5]} />
          <meshStandardMaterial color="#e6a53c" flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* Cerdo — cápsula rosada, hocico chato, orejas caídas; respira despacio. */
function Cerdo({ pos = [0, 0, 0], giro = 0, reducedMotion }) {
  const cuerpo = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !cuerpo.current) return;
    cuerpo.current.position.y = 0.4 + Math.sin(state.clock.elapsedTime * 1.1) * 0.015;
  });
  return (
    <group position={[pos[0], pos[1], pos[2]]} rotation={[0, giro, 0]} scale={0.52}>
      <Patas x={0.24} z={0.16} alto={0.2} r={0.05} color="#c98a86" />
      <group ref={cuerpo} position={[0, 0.4, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.26, 0.42, 4, 10]} />
          <meshStandardMaterial color="#e6a6a2" flatShading roughness={1} />
        </mesh>
        {/* cabeza */}
        <mesh position={[0.42, -0.02, 0]} castShadow>
          <sphereGeometry args={[0.2, 10, 10]} />
          <meshStandardMaterial color="#e6a6a2" flatShading roughness={1} />
        </mesh>
        {/* hocico */}
        <mesh position={[0.58, -0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.08, 10]} />
          <meshStandardMaterial color="#d98d88" flatShading />
        </mesh>
        {/* orejas */}
        <mesh position={[0.34, 0.14, 0.12]} rotation={[0.4, 0, 0.6]}>
          <coneGeometry args={[0.07, 0.14, 5]} />
          <meshStandardMaterial color="#d98d88" flatShading />
        </mesh>
        <mesh position={[0.34, 0.14, -0.12]} rotation={[-0.4, 0, 0.6]}>
          <coneGeometry args={[0.07, 0.14, 5]} />
          <meshStandardMaterial color="#d98d88" flatShading />
        </mesh>
        {/* colita */}
        <mesh position={[-0.42, 0.06, 0]}>
          <torusGeometry args={[0.06, 0.02, 6, 10]} />
          <meshStandardMaterial color="#d98d88" flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* Comedero: un medio-cilindro (canoa), redondeado, en vez de un cajón. */
function Comedero({ pos = [0, 0, 0] }) {
  return (
    <mesh position={[pos[0], pos[1], pos[2]]} rotation={[0, 0, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.16, 0.16, 0.7, 10, 1, false, 0, Math.PI]} />
      <meshStandardMaterial color="#8a6a44" flatShading roughness={1} side={2} />
    </mesh>
  );
}

/*
 * La zona de animales: varios animales pastando/picoteando, con aire entre
 * ellos (no amontonados). Reemplaza por completo a la casita anterior.
 */
export default function AnimalesDeFinca({ reducedMotion = false }) {
  return (
    <group>
      <Vaca pos={[0.15, 0, -0.35]} giro={-0.5} reducedMotion={reducedMotion} />
      <Oveja pos={[-1.0, 0, 0.45]} giro={0.6} fase={0} reducedMotion={reducedMotion} />
      <Oveja pos={[-0.35, 0, 1.0]} giro={1.4} fase={1.7} reducedMotion={reducedMotion} />
      <Cerdo pos={[-1.45, 0, -0.5]} giro={0.2} reducedMotion={reducedMotion} />
      <Gallina pos={[1.15, 0, 0.6]} giro={2.4} fase={0.4} color="#e8e2d6" reducedMotion={reducedMotion} />
      <Gallina pos={[1.5, 0, 0.05]} giro={-1.2} fase={2.1} color="#c98a4a" reducedMotion={reducedMotion} />
      <Gallina pos={[0.7, 0, 1.15]} giro={0.9} fase={3.6} color="#dcd2c2" reducedMotion={reducedMotion} />
      <Comedero pos={[1.25, 0.16, -0.7]} />
    </group>
  );
}
