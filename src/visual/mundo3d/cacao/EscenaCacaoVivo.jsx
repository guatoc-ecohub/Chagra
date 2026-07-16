/*
 * EscenaCacaoVivo — el MUNDO donde vive el cacao (piso cálido, 0–1.200 m).
 *
 * Una VEGA de tierra caliente a media mañana: luz dorada y pesada, el aire
 * húmedo que empaña el fondo, y el cultivo contado como es — las matas de
 * cacao sembradas a distancia pareja con sus MAZORCAS pegadas del tronco
 * (caulifloria), el SOMBRÍO de guamos tendiéndoles techo, el plátano
 * intercalado, y en la lomita del fondo la casa campesina con su cajón de
 * fermentar y la pasera donde el grano se seca al sol. La cámara mira la vega
 * desde el camino, como quien llega; se puede girar con el dedo.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`: 'alto' con
 * sombras + bruma + luz colada; 'medio' frugal; 'bajo' mínimo. Con
 * `reducedMotion` el mundo monta QUIETO (frameloop a demanda). La fauna son los
 * SVG rubber-hose de la casa como billboards (`Fauna` de FaunaEscena):
 * mariposas revoloteando y el escarabajo reptando en la hojarasca — la vida que
 * el cacao bajo sombra sí recibe.
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
import FloraCacao from './FloraCacao.jsx';
import { ANCHO, FONDO, alturaVega, SITIO_CASA } from './floraCacao.geom.js';

/* La atmósfera del piso cálido: cielo lechoso de calor y bruma húmeda dorada. */
const CALIDO = {
  fondo: '#dce4bd',
  bruma: '#e0e4ba',
  sol: '#ffeaa4',
  cielo: '#f4eecc',
  suelo: '#5a4630',
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

/* La malla de la vega con colores por vértice: el mantillo pardo de hojarasca
   que domina bajo el cacao, pasto en los claros, tierra oscura húmeda a
   manchas y el caminito por donde se llega. */
function construirVega(seg, plano) {
  const nx = seg + 1;
  const nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cMantillo = new THREE.Color('#7d6038');
  const cMantillo2 = new THREE.Color('#6b5230');
  const cPasto = new THREE.Color('#7fa04e');
  const cTierra = new THREE.Color('#54402e');
  const cCamino = new THREE.Color('#b08a58');
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      pos[p] = wx;
      pos[p + 1] = alturaVega(wx, wz);
      pos[p + 2] = wz;
      const adentro = smoothstep(8, 0, Math.abs(wx)) * smoothstep(6, -2, wz) * 0.5 + 0.5;
      // el mantillo de hojarasca manda bajo el cultivo
      c.lerpColors(cMantillo, cMantillo2, 0.5 + 0.5 * ruido(wx * 0.9, wz * 0.7));
      // el pasto asoma en los claros y hacia el frente
      c.lerp(cPasto, smoothstep(0.15, 0.9, ruido(wx * 1.1 + 3, wz * 0.9)) * 0.5 * (1.3 - adentro));
      // la tierra oscura y húmeda a manchas
      c.lerp(cTierra, smoothstep(0.1, 0.9, ruido(wx * 1.5 + 7, wz * 1.3 + 2)) * 0.3);
      // el caminito por donde se llega a la casa
      c.lerp(cCamino, smoothstep(1.3, 0, Math.abs(wx - 3 - Math.sin(wz * 0.32) * 2.4)) * smoothstep(8, -12, -wz) * 0.9);
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

/* La casa campesina de tierra caliente con su BENEFICIO de cacao: el CAJÓN de
   madera donde el grano fermenta en su baba, y la PASERA — la cama elevada
   donde el grano se seca al sol con su techito corredizo. */
function CasaSecadero({ pos }) {
  return (
    <group position={pos} rotation={[0, -0.4, 0]}>
      {/* la casa: paredes encaladas y zócalo ocre, techo de teja */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.6, 1.44, 1.9]} />
        <meshLambertMaterial color="#f0e9d6" flatShading />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[2.64, 0.36, 1.94]} />
        <meshLambertMaterial color="#a06a2e" flatShading />
      </mesh>
      {/* la puerta y una ventana (maderas verdes, como se pintan allá) */}
      <mesh position={[0.5, 0.62, 0.96]}>
        <boxGeometry args={[0.44, 0.95, 0.06]} />
        <meshLambertMaterial color="#4a6b3f" flatShading />
      </mesh>
      <mesh position={[-0.6, 0.86, 0.96]}>
        <boxGeometry args={[0.5, 0.44, 0.06]} />
        <meshLambertMaterial color="#4a6b3f" flatShading />
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

      {/* el CAJÓN DE FERMENTAR, al pie de la casa: madera gruesa, tapa de
          hoja de plátano y el grano en su baba asomando */}
      <group position={[-2.2, 0, 0.7]}>
        <mesh position={[0, 0.32, 0]}>
          <boxGeometry args={[0.95, 0.64, 0.7]} />
          <meshLambertMaterial color="#7a5a38" flatShading />
        </mesh>
        <mesh position={[0, 0.66, 0]}>
          <boxGeometry args={[0.82, 0.06, 0.58]} />
          <meshLambertMaterial color="#8f6a3c" flatShading />
        </mesh>
        {/* la hoja de plátano que tapa la fermentación */}
        <mesh position={[0.1, 0.71, 0.05]} rotation={[0, 0.4, 0.06]}>
          <boxGeometry args={[0.7, 0.03, 0.4]} />
          <meshLambertMaterial color="#579440" flatShading />
        </mesh>
      </group>

      {/* la PASERA de secado: patas + cama con el grano marrón extendido +
          techito translúcido corredizo (la señal del secado) */}
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
        {/* el grano de cacao extendido secándose al sol */}
        <mesh position={[0, 0.77, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.0, 1.1]} />
          <meshLambertMaterial color="#6f4626" flatShading />
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

      {/* el canasto de cosecha en el patio, con dos mazorcas recién bajadas */}
      <group position={[-1.5, 0, 1.3]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.24, 0.17, 0.36, 9, 1, true]} />
          <meshLambertMaterial color="#a9713c" flatShading side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.05, 0.4, 0.02]} scale={[0.72, 1.4, 0.72]}>
          <sphereGeometry args={[0.13, 7, 6]} />
          <meshLambertMaterial color="#dcae3a" flatShading />
        </mesh>
        <mesh position={[0.12, 0.38, -0.06]} rotation={[0, 0, 0.5]} scale={[0.72, 1.4, 0.72]}>
          <sphereGeometry args={[0.13, 7, 6]} />
          <meshLambertMaterial color="#9c4523" flatShading />
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
        color="#ffd98e"
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* La fauna del cacaotal: los SVG rubber-hose de la casa como billboards
   (contrato del operador: el bicho pone el cuerpo, la escena la coreografía).
   Mariposas en el aire caliente y el escarabajo reptando en la hojarasca —
   el descomponedor que la hoja del cacao alimenta. */
const FAUNA_CACAOTAL = [
  { tipo: 'mariposa', base: [-3.5, 3.4, 2.4], patron: 'revoloteo', size: 27, fase: 0.6, df: 9 },
  { tipo: 'mariposa', base: [6.2, 2.0, 3.6], patron: 'revoloteo', size: 23, fase: 2.4, df: 9 },
  { tipo: 'escarabajo', base: [-1.2, 0.5, 6.2], patron: 'reptar', size: 22, fase: 1.2, df: 8 },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);

  const geoVega = useMemo(
    () => construirVega(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_CACAOTAL : FAUNA_CACAOTAL.slice(0, 2)),
    [tier],
  );

  const casaY = alturaVega(SITIO_CASA[0], SITIO_CASA[1]);

  return (
    <>
      <color attach="background" args={[CALIDO.fondo]} />
      {perfil.fog && <fog attach="fog" args={[CALIDO.bruma, 14, 44]} />}

      {/* la luz de tierra caliente: cielo lechoso, sol dorado pesado, calina */}
      <hemisphereLight intensity={0.95} color={CALIDO.cielo} groundColor={CALIDO.suelo} />
      <ambientLight intensity={0.34} color="#f6ecc8" />
      <directionalLight
        position={[7, 13, 4]}
        intensity={1.3}
        color={CALIDO.sol}
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
      {/* contraluz verdoso que separa el sombrío de la calina */}
      <directionalLight position={[-6, 5, -7]} intensity={0.32} color="#d8e0b8" />

      {/* LA VEGA (recibe la sombra del sombrío en gama alta) */}
      <mesh geometry={geoVega} receiveShadow={perfil.sombras}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* las lomas calientes del fondo, comidas por la calina */}
      <mesh position={[-14, 1.4, -20]} scale={[10, 3.2, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#6d8a4c" />
      </mesh>
      <mesh position={[8, 1.8, -23]} scale={[12, 4.0, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#647f48" />
      </mesh>
      <mesh position={[21, 1.2, -19]} scale={[8, 2.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#75904f" />
      </mesh>

      {/* EL CACAOTAL: matas, mazorcas, sombrío, plátano, luz colada */}
      <FloraCacao tier={tier} reducedMotion={reducedMotion} />

      {/* la casa con su cajón de fermentar y la pasera, en la lomita */}
      <CasaSecadero pos={[SITIO_CASA[0], casaY, SITIO_CASA[1]]} />

      {/* LA VIDA que la sombra trae: mariposas y el escarabajo del mantillo */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        makeDefault
        target={[0, 1.2, -4]}
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
 * El mundo del cacaotal bajo sombra. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaCacaoVivo({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`cacao-canvas${listo ? ' cacao-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [2.5, 7.4, 16.5], fov: 46 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} foco={foco} />
    </Canvas>
  );
}
