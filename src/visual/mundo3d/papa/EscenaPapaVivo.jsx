/*
 * EscenaPapaVivo — el MUNDO donde vive la papa (piso frío, 2.000–3.200 m).
 *
 * Una LADERA de tierra fría a media mañana: cielo despejado y azul de montaña
 * alta, luz blanca y dura (a esa altura el sol no perdona), y el cultivo
 * contado como es — los SURCOS: caballones de tierra negra amontonada a curva
 * de nivel, con la mata de papa aporcada encima de cada lomo. El caballón va
 * horneado EN EL RELIEVE del terreno (se lee la tierra alzada, no una raya
 * pintada). Alrededor el pajonal amarillo del frío, al fondo la loma alta con
 * frailejones en silueta (el páramo queda ahí no más), la casita campesina con
 * sus costales, y en un claro la COSECHA: la tierra abierta y las papas
 * criollas destapadas — amarillas, rojas y moradas.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`: 'alto' con
 * sombras + vaho; 'medio' frugal; 'bajo' mínimo. Con `reducedMotion` el mundo
 * monta QUIETO (frameloop a demanda). La fauna son los SVG rubber-hose de la
 * casa como billboards (`Fauna` de FaunaEscena): la mariposa y el colibrí
 * chillón que la flor de papa sí convoca.
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
import FloraPapa from './FloraPapa.jsx';
import {
  ANCHO,
  FONDO,
  alturaLadera,
  reliefSurco,
  SITIO_CASA,
  SITIO_COSECHA,
} from './floraPapa.geom.js';

/* La atmósfera del piso frío: cielo azul limpio y luz dura de montaña alta. */
const FRIO = {
  fondo: '#b7d2e4',
  bruma: '#c9dce8',
  sol: '#fff8e6',
  cielo: '#ddeaf4',
  suelo: '#3b3226',
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

/* La malla de la ladera con colores por vértice: el LOMO del caballón en tierra
   negra recién aporcada, el surco hondo entre lomos más húmedo y oscuro, y
   afuera del lote el pajonal amarillo-verde del frío. Los caballones van en la
   ALTURA (alturaLadera ya los trae horneados): el relieve se lee de verdad. */
function construirLadera(seg, plano) {
  const nx = seg + 1;
  const nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPajonal = new THREE.Color('#9aa056');
  const cPajonal2 = new THREE.Color('#aab061');
  const cLomo = new THREE.Color('#4a3a2b'); // la tierra negra del caballón
  const cLomoSeco = new THREE.Color('#5c4936'); // la cresta que el sol ya secó
  const cSurco = new THREE.Color('#332920'); // el fondo húmedo entre lomos
  const cCamino = new THREE.Color('#8d7a58');
  const cLoma = new THREE.Color('#7f8a52'); // la loma alta, más parda de frío
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      pos[p] = wx;
      pos[p + 1] = alturaLadera(wx, wz);
      pos[p + 2] = wz;

      const s = reliefSurco(wx, wz);
      const enLoma = smoothstep(-8, -17, wz);
      // base: pajonal con manchas, y hacia la loma alta se apaga de frío
      c.lerpColors(cPajonal, cPajonal2, 0.5 + 0.5 * ruido(wx * 0.9, wz * 0.7));
      c.lerp(cLoma, enLoma * 0.55);
      // dentro del lote: el surco húmedo de fondo…
      c.lerp(cSurco, s.lote * 0.85);
      // …y el LOMO del caballón encima, tierra negra con la cresta seca
      const lomo = smoothstep(0.2, 0.8, s.lomo);
      c.lerp(cLomo, lomo);
      c.lerp(cLomoSeco, smoothstep(0.62, 1, s.lomo) * 0.85);
      // el claro de la COSECHA: tierra abierta, ya sin surco
      const dCx = wx - SITIO_COSECHA[0];
      const dCz = wz - SITIO_COSECHA[1];
      c.lerp(cLomo, smoothstep(9, 2.5, dCx * dCx + dCz * dCz) * 0.8);
      // el caminito por donde se entra al lote, al frente
      c.lerp(
        cCamino,
        smoothstep(1.3, 0, Math.abs(wx - 4 - Math.sin(wz * 0.35) * 2.4)) * smoothstep(4, 14, wz),
      );
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

/* La casita campesina de tierra fría, arriba al fondo: paredes de adobe
   encalado, techo de teja, la ruana colgada — y en el patio los COSTALES de
   papa cosidos, listos pal mercado. Insinuada, que el mundo es el surco. */
function CasaFria({ pos }) {
  return (
    <group position={pos} rotation={[0, 0.4, 0]}>
      {/* la casa: adobe encalado con zócalo de tierra */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[2.4, 1.4, 1.8]} />
        <meshLambertMaterial color="#ece4d2" flatShading />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[2.44, 0.34, 1.84]} />
        <meshLambertMaterial color="#7a5a3c" flatShading />
      </mesh>
      {/* la puerta y la ventanita (maderas verdes de tierra fría) */}
      <mesh position={[0.42, 0.6, 0.91]}>
        <boxGeometry args={[0.42, 0.92, 0.06]} />
        <meshLambertMaterial color="#3e5c40" flatShading />
      </mesh>
      <mesh position={[-0.55, 0.84, 0.91]}>
        <boxGeometry args={[0.46, 0.4, 0.06]} />
        <meshLambertMaterial color="#3e5c40" flatShading />
      </mesh>
      {/* techo a dos aguas de teja */}
      <mesh position={[0, 1.56, -0.58]} rotation={[-0.6, 0, 0]}>
        <boxGeometry args={[2.8, 0.08, 1.42]} />
        <meshLambertMaterial color="#96482f" flatShading />
      </mesh>
      <mesh position={[0, 1.56, 0.58]} rotation={[0.6, 0, 0]}>
        <boxGeometry args={[2.8, 0.08, 1.42]} />
        <meshLambertMaterial color="#a25136" flatShading />
      </mesh>
      {/* la chimenea de fogón de leña (en el frío se cocina con candela) */}
      <mesh position={[-0.85, 1.85, -0.3]}>
        <boxGeometry args={[0.24, 0.6, 0.24]} />
        <meshLambertMaterial color="#8a8074" flatShading />
      </mesh>

      {/* los COSTALES de papa cosidos en el patio, la cosecha que ya subió */}
      {[
        [1.7, 0.55, 0], [2.15, 0.75, 0.18], [1.9, 0.15, -0.55],
      ].map((q, i) => (
        <group key={`s${i}`} position={[q[0], 0, q[1] ?? 0]} rotation={[0, q[2] ?? 0, 0]}>
          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.24, 0.28, 0.68, 8, 1]} />
            <meshLambertMaterial color="#c8b184" flatShading />
          </mesh>
          <mesh position={[0, 0.7, 0]} scale={[1, 0.5, 1]}>
            <sphereGeometry args={[0.2, 7, 5]} />
            <meshLambertMaterial color="#b49c6e" flatShading />
          </mesh>
        </group>
      ))}

      {/* el azadón recostado a la pared (la herramienta del surco) */}
      <group position={[-1.28, 0, 0.72]} rotation={[0, 0, 0.35]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.2, 5, 1]} />
          <meshLambertMaterial color="#8a6c48" flatShading />
        </mesh>
        <mesh position={[0.1, 0.06, 0]} rotation={[0, 0, -1.2]}>
          <boxGeometry args={[0.3, 0.14, 0.05]} />
          <meshLambertMaterial color="#6e6a62" flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* El rincón de COSECHA: el canasto con papas y la manta con la saca tendida —
   los tubérculos instanciados de FloraPapa ya ponen la diversidad al piso. */
function RinconCosecha({ pos }) {
  return (
    <group position={pos}>
      {/* el canasto de bejuco con su papa adentro */}
      <group position={[0.6, 0, -1.2]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.3, 0.22, 0.4, 9, 1, true]} />
          <meshLambertMaterial color="#a9713c" flatShading side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.4, 0]} scale={[1, 0.45, 1]}>
          <sphereGeometry args={[0.26, 8, 5]} />
          <meshLambertMaterial color="#dfb43a" flatShading />
        </mesh>
      </group>
      {/* la manta tendida donde se aparta la saca por tamaños */}
      <mesh position={[-0.9, 0.03, 0.9]} rotation={[-Math.PI / 2, 0, 0.4]}>
        <planeGeometry args={[1.7, 1.2]} />
        <meshLambertMaterial color="#cbbfa4" flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* el azadón clavado en el montículo, en plena faena */}
      <group position={[1.3, 0, 0.6]} rotation={[0.5, 0.6, -0.35]}>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.24, 5, 1]} />
          <meshLambertMaterial color="#8a6c48" flatShading />
        </mesh>
        <mesh position={[0.1, 0.04, 0]} rotation={[0, 0, -1.2]}>
          <boxGeometry args={[0.3, 0.15, 0.05]} />
          <meshLambertMaterial color="#6e6a62" flatShading />
        </mesh>
      </group>
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
        color="#ffe9ae"
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* La fauna del papal en flor: los SVG rubber-hose de la casa como billboards
   (contrato del operador: el bicho pone el cuerpo, la escena la coreografía).
   Pocas y por criterio: la flor de papa sí convoca su visita. */
const FAUNA_PAPAL = [
  { tipo: 'mariposa', base: [-3.5, 1.5, 2.4], patron: 'revoloteo', size: 26, fase: 0.6, df: 9 },
  { tipo: 'colibri', base: [3.8, 2.2, -1.8], patron: 'revoloteo', size: 30, fase: 1.8, df: 10 },
  { tipo: 'mariposa', base: [7.5, 1.7, 3.2], patron: 'revoloteo', size: 22, fase: 2.7, df: 9 },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);

  const geoLadera = useMemo(
    () => construirLadera(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_PAPAL : FAUNA_PAPAL.slice(0, 2)),
    [tier],
  );

  const casaY = alturaLadera(SITIO_CASA[0], SITIO_CASA[1]);
  const cosechaY = alturaLadera(SITIO_COSECHA[0], SITIO_COSECHA[1]);

  return (
    <>
      <color attach="background" args={[FRIO.fondo]} />
      {perfil.fog && <fog attach="fog" args={[FRIO.bruma, 22, 58]} />}

      {/* la luz de montaña alta: cielo azul limpio, sol blanco y duro */}
      <hemisphereLight intensity={0.95} color={FRIO.cielo} groundColor={FRIO.suelo} />
      <ambientLight intensity={0.3} color="#e8eef4" />
      <directionalLight
        position={[9, 14, 6]}
        intensity={1.35}
        color={FRIO.sol}
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={44}
        shadow-camera-left={-17}
        shadow-camera-right={17}
        shadow-camera-top={17}
        shadow-camera-bottom={-7}
      />
      {/* contraluz azulado que enfría las sombras (el frío se ve) */}
      <directionalLight position={[-7, 6, -8]} intensity={0.38} color="#b8cede" />

      {/* LA LADERA con sus caballones horneados en el relieve */}
      <mesh geometry={geoLadera} receiveShadow={perfil.sombras}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* los cerros fríos del fondo, ya con cara de páramo */}
      <mesh position={[-14, 4.2, -24]} scale={[10, 5.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#6d7c54" />
      </mesh>
      <mesh position={[6, 5.2, -27]} scale={[12, 7, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#66755a" />
      </mesh>
      <mesh position={[21, 3.4, -23]} scale={[8, 4.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#75825a" />
      </mesh>
      {/* y detrasito, el filo pelado con su neblina pegada */}
      <mesh position={[-3, 7.8, -31]} scale={[16, 5, 5]}>
        <sphereGeometry args={[1, 10, 7]} />
        <meshLambertMaterial color="#8b95a0" />
      </mesh>

      {/* EL PAPAL: matas en surcos, flores, cosecha, pajonal, frailejones */}
      <FloraPapa tier={tier} reducedMotion={reducedMotion} />

      {/* la casita de tierra fría con sus costales, arriba al fondo */}
      <CasaFria pos={[SITIO_CASA[0], casaY, SITIO_CASA[1]]} />

      {/* el rincón de la cosecha: canasto, manta y azadón en faena */}
      <RinconCosecha pos={[SITIO_COSECHA[0], cosechaY, SITIO_COSECHA[1]]} />

      {/* LA VIDA que la flor convoca: mariposas y el colibrí */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        makeDefault
        target={[0, 2.8, -3]}
        enablePan={false}
        enableZoom
        minDistance={8}
        maxDistance={26}
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
 * El mundo del papal de tierra fría. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaPapaVivo({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`papal-canvas${listo ? ' papal-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [2, 5.4, 15.5], fov: 46 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} foco={foco} />
    </Canvas>
  );
}
