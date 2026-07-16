/*
 * EscenaCafetalVivo — el MUNDO donde vive el café (piso templado, 1.000–2.000 m).
 *
 * Una LADERA de la montaña cafetera al final de la mañana: luz tibia de media
 * montaña, bruma que se come el valle del fondo, y el cultivo contado como es —
 * los surcos de cafetos a curva de nivel ABAJO, el SOMBRÍO de guamos y nogales
 * ARRIBA tendiéndoles techo, el plátano intercalado, y al fondo, medio velada
 * por la bruma, la casa campesina con su beneficiadero y la marquesina de secar.
 * La cámara mira la ladera desde abajo, como quien llega subiendo; se puede
 * girar con el dedo.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`: 'alto' con
 * sombras + bruma + luz colada; 'medio' frugal; 'bajo' mínimo. Con
 * `reducedMotion` el mundo monta QUIETO (frameloop a demanda). La fauna son los
 * SVG rubber-hose de la casa como billboards (`Fauna` de FaunaEscena): mariposa
 * y colibrí — la vida que el café de sombra sí recibe y el de sol espanta.
 *
 * `foco` (opcional): un punto [x,y,z] que el paso didáctico del host señala con
 * un anillo que respira. Importa three/@react-three → montar SOLO perezosa.
 */
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { Fauna } from '../escenas/FaunaEscena.jsx';
import FloraCafetal from './FloraCafetal.jsx';
import { ANCHO, FONDO, alturaLadera, SITIO_CASA } from './floraCafetal.geom.js';

/* La atmósfera del piso templado: cielo claro con bruma tibia de media montaña. */
const TEMPLADO = {
  fondo: '#c3dcd2',
  bruma: '#cde2d6',
  sol: '#fff0c8',
  cielo: '#e6f2e2',
  suelo: '#4f4030',
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* La malla de la ladera con colores por vértice: arvenses verdes (cobertura
   viva), tierra roja andina asomando y el mantillo pardo hacia la sombra. */
function construirLadera(seg, plano) {
  const nx = seg + 1;
  const nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color('#79994b');
  const cPasto2 = new THREE.Color('#8aa855');
  const cTierra = new THREE.Color('#8a5636');
  const cMantillo = new THREE.Color('#7d6540');
  const cCamino = new THREE.Color('#a9825a');
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      pos[p] = wx;
      pos[p + 1] = alturaLadera(wx, wz);
      pos[p + 2] = wz;
      const enLoma = smoothstep(5, -8, wz);
      c.lerpColors(cPasto, cPasto2, 0.5 + 0.5 * ruido(wx * 0.9, wz * 0.7));
      // la tierra roja asoma a manchas entre los surcos
      c.lerp(cTierra, smoothstep(-0.1, 0.85, ruido(wx * 1.3, wz * 1.1)) * 0.45 * enLoma);
      // el mantillo pardo gana hacia lo alto (más sombrío, más hojarasca)
      c.lerp(cMantillo, enLoma * 0.22);
      // el caminito seco del frente, por donde se llega
      c.lerp(cCamino, smoothstep(1.2, 0, Math.abs(wx - Math.sin(wz * 0.4) * 2.2)) * smoothstep(2, 12, wz));
      col[p] = c.r;
      col[p + 1] = c.g;
      col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * nx + ix;
      const b = a + 1;
      const d = a + nx;
      const e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  if (plano) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

/* La casa campesina con su BENEFICIADERO, arriba al fondo: paredes encaladas,
   techo de teja, y al lado la marquesina — la cama elevada bajo plástico donde
   el café pergamino se seca al sol. Insinuada, medio velada por la bruma. */
function CasaBeneficio({ pos }) {
  return (
    <group position={pos} rotation={[0, -0.35, 0]}>
      {/* la casa: paredes encaladas y zócalo rojo de finca cafetera */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.6, 1.44, 1.9]} />
        <meshLambertMaterial color="#efe8d8" flatShading />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[2.64, 0.36, 1.94]} />
        <meshLambertMaterial color="#8e3f2c" flatShading />
      </mesh>
      {/* la puerta y una ventana (maderas de colores, como se pintan allá) */}
      <mesh position={[0.5, 0.62, 0.96]}>
        <boxGeometry args={[0.44, 0.95, 0.06]} />
        <meshLambertMaterial color="#3f6b6e" flatShading />
      </mesh>
      <mesh position={[-0.6, 0.86, 0.96]}>
        <boxGeometry args={[0.5, 0.44, 0.06]} />
        <meshLambertMaterial color="#3f6b6e" flatShading />
      </mesh>
      {/* techo a dos aguas de teja */}
      <mesh position={[0, 1.62, -0.62]} rotation={[-0.62, 0, 0]}>
        <boxGeometry args={[3.0, 0.08, 1.5]} />
        <meshLambertMaterial color="#9c4a30" flatShading />
      </mesh>
      <mesh position={[0, 1.62, 0.62]} rotation={[0.62, 0, 0]}>
        <boxGeometry args={[3.0, 0.08, 1.5]} />
        <meshLambertMaterial color="#a85236" flatShading />
      </mesh>

      {/* la MARQUESINA de secado, al lado: patas + cama de pergamino + techo
          translúcido a dos aguas (la señal del beneficio) */}
      <group position={[2.6, 0, 0.4]}>
        {[[-1.0, -0.55], [1.0, -0.55], [-1.0, 0.55], [1.0, 0.55]].map((q, i) => (
          <mesh key={i} position={[q[0], 0.35, q[1]]}>
            <boxGeometry args={[0.09, 0.7, 0.09]} />
            <meshLambertMaterial color="#6b533a" flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[2.2, 0.07, 1.3]} />
          <meshLambertMaterial color="#b99a68" flatShading />
        </mesh>
        {/* el café pergamino extendido secándose al sol */}
        <mesh position={[0, 0.77, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.0, 1.1]} />
          <meshLambertMaterial color="#dcc494" flatShading />
        </mesh>
        {[[-1.05, -0.62], [1.05, -0.62], [-1.05, 0.62], [1.05, 0.62]].map((q, i) => (
          <mesh key={`p${i}`} position={[q[0], 1.15, q[1]]}>
            <boxGeometry args={[0.06, 0.85, 0.06]} />
            <meshLambertMaterial color="#6b533a" flatShading />
          </mesh>
        ))}
        <mesh position={[0, 1.62, -0.36]} rotation={[-0.5, 0, 0]}>
          <planeGeometry args={[2.4, 0.95]} />
          <meshBasicMaterial color="#fbf3da" transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 1.62, 0.36]} rotation={[0.5, 0, 0]}>
          <planeGeometry args={[2.4, 0.95]} />
          <meshBasicMaterial color="#fbf3da" transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* dos canastos de cosecha esperando en el patio */}
      {[[-1.8, 0.6], [-1.35, 0.9]].map((q, i) => (
        <group key={`c${i}`} position={[q[0], 0, q[1]]}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.24, 0.17, 0.36, 9, 1, true]} />
            <meshLambertMaterial color="#a9713c" flatShading side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.36, 0]} scale={[1, 0.4, 1]}>
            <sphereGeometry args={[0.2, 8, 5]} />
            <meshLambertMaterial color="#c1301f" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* El anillo del paso didáctico: respira sobre el punto que la lección señala.
   Con reducedMotion queda quieto (presencia sin parpadeo). */
function FocoPaso({ foco, reducedMotion }) {
  const anillo = useRef(null);
  useFrame(({ clock }) => {
    const m = anillo.current;
    if (!m) return;
    if (reducedMotion) {
      m.material.opacity = 0.42;
      return;
    }
    const t = clock.elapsedTime;
    m.material.opacity = 0.3 + 0.2 * Math.sin(t * 1.8);
    m.scale.setScalar(1 + 0.06 * Math.sin(t * 1.8));
  });
  if (!foco) return null;
  return (
    <mesh ref={anillo} position={[foco[0], foco[1] + 0.12, foco[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.25, 1.65, 32]} />
      <meshBasicMaterial
        color="#ffdf9e"
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* La fauna del café de sombra: los SVG rubber-hose de la casa como billboards
   (contrato del operador: el bicho pone el cuerpo, la escena la coreografía).
   Pocas y por criterio: la sombra ES el hábitat que las trae. */
const FAUNA_CAFETAL = [
  { tipo: 'mariposa', base: [-3.2, 1.7, 2.2], patron: 'revoloteo', size: 26, fase: 0.7, df: 9 },
  { tipo: 'colibri', base: [4.2, 2.6, -2.6], patron: 'revoloteo', size: 30, fase: 1.9, df: 10 },
  { tipo: 'mariposa', base: [7.2, 1.9, 0.6], patron: 'revoloteo', size: 22, fase: 2.9, df: 9 },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);

  const geoLadera = useMemo(
    () => construirLadera(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_CAFETAL : FAUNA_CAFETAL.slice(0, 2)),
    [tier],
  );

  const casaY = alturaLadera(SITIO_CASA[0], SITIO_CASA[1]);

  return (
    <>
      <color attach="background" args={[TEMPLADO.fondo]} />
      {perfil.fog && <fog attach="fog" args={[TEMPLADO.bruma, 16, 46]} />}

      {/* la luz templada de media montaña: cielo claro, sol tibio, bruma */}
      <hemisphereLight intensity={0.9} color={TEMPLADO.cielo} groundColor={TEMPLADO.suelo} />
      <ambientLight intensity={0.32} color="#f2ecd6" />
      <directionalLight
        position={[8, 12, 5]}
        intensity={1.2}
        color={TEMPLADO.sol}
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-6}
      />
      {/* contraluz fresco que separa el sombrío de la bruma */}
      <directionalLight position={[-6, 6, -7]} intensity={0.35} color="#cfe0dc" />

      {/* LA LADERA (recibe la sombra del sombrío en gama alta) */}
      <mesh geometry={geoLadera} receiveShadow={perfil.sombras}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* las montañas cafeteras del fondo, comidas por la bruma */}
      <mesh position={[-13, 2.2, -21]} scale={[9, 4.2, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#5d7a4e" />
      </mesh>
      <mesh position={[9, 2.6, -24]} scale={[11, 5.4, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#54704b" />
      </mesh>
      <mesh position={[22, 1.6, -20]} scale={[8, 3.4, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#647f52" />
      </mesh>

      {/* EL CAFETAL: surcos, cerezas, sombrío, plátano, luz colada */}
      <FloraCafetal tier={tier} reducedMotion={reducedMotion} />

      {/* la casa con su beneficiadero, arriba al fondo */}
      <CasaBeneficio pos={[SITIO_CASA[0], casaY, SITIO_CASA[1]]} />

      {/* LA VIDA que la sombra trae: mariposas y el colibrí */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        makeDefault
        target={[0, 2.6, -3]}
        enablePan={false}
        enableZoom
        minDistance={8}
        maxDistance={24}
        minPolarAngle={0.5}
        maxPolarAngle={1.45}
        minAzimuthAngle={-1.1}
        maxAzimuthAngle={1.1}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.12}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo del cafetal bajo sombra. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaCafetalVivo({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`cafetal-canvas${listo ? ' cafetal-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [1.5, 4.6, 14.5], fov: 46 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} foco={foco} />
    </Canvas>
  );
}
