/*
 * EscenaCasaAdentro — LA CASA POR DENTRO: el interior navegable de la
 * casa-ancla del valle. No una postal: SE ESTÁ adentro.
 *
 * Un solo cuarto de casa campesina andina, cálido y en penumbra: el fogón de
 * leña prendido (candela que titila, humo que sube a la teja), la mesa con sus
 * taburetes, la luz del día entrando en haz por la ventana del sur, la repisa,
 * el costal, el sombrero en su clavo. Es "el punto de silencio" del valle: la
 * casa NO pide nada — abriga.
 *
 * Dos accesos LEGIBLES desde adentro (contrato con el host):
 *   · LA VENTANA DE LOS MUNDOS (muro del fondo): el vano con postigos abiertos
 *     resplandece con el cielo-portal y cinco luces de colores titilando (los
 *     mundos llamando). Tocarla → `onPortales`.
 *   · EL RINCÓN DE LOS FERMENTOS (estante del oriente): los frascos de vidrio
 *     con la chicha, el vinagre y el mortiño, con su anillo que respira en el
 *     piso. Tocarlo → `onFermentos`.
 *
 * La casa VIVE con el valle: la atmósfera del kit (familia `corral`) pone la
 * hora — el color del cielo que se ve por la puerta y la ventana, y el tono
 * del haz de luz, amanecen y anochecen con el resto del juego. El fogón es la
 * luz que NO cambia: la casa siempre espera caliente.
 *
 * Todo procedural (cero CDN/GLTF/imágenes). El cuarto entero es UNA geometría
 * fusionada (casaAdentro.geom, vertexColors). Tier-safe vía `perfilDeTier`:
 * 'alto' sombras + humo pleno + candela que titila; 'medio' frugal; 'bajo'
 * mínimo. Con `reducedMotion` monta QUIETO (frameloop demand): humo estático,
 * candela fija, cero vaivén. Importa three/@react-three → montar SOLO perezosa.
 */
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { useAtmosferaMundo, CamaraDirector } from '../kit/index.js';
import { mezclar, VERDES, NIEBLAS, LUCES, ACENTOS, AGUAS, CASA, NEUTROS } from '../paleta/index.js';
import {
  SALA,
  PUERTA,
  VENTANA_SUR,
  VENTANA_MUNDOS,
  FRASCOS,
  CANASTO,
  construirCasaAdentro,
} from './casaAdentro.geom.js';

/* La casa pertenece a la familia del patio de la finca: `corral`. */
const FAMILIA_CASA = 'corral';

/* Cursor de "esto se toca" (mismo gesto que la puerta del valle). */
const alApuntar = (e) => {
  e.stopPropagation();
  document.body.style.cursor = 'pointer';
};
const alSoltar = () => {
  document.body.style.cursor = '';
};

/* ── EL FUEGO DEL FOGÓN: dos llamas que titilan + la luz de la candela ────── */
function FuegoFogon({ tier, reducedMotion }) {
  const llama1 = useRef(null);
  const llama2 = useRef(null);
  const luz = useRef(null);
  const anima = !reducedMotion && tier !== 'bajo';
  useFrame(({ clock }) => {
    if (!anima) return;
    const t = clock.elapsedTime;
    const p = 0.82 + 0.18 * Math.sin(t * 9.1) * Math.sin(t * 3.7 + 1.2);
    if (llama1.current) llama1.current.scale.set(1, p, 1);
    if (llama2.current) llama2.current.scale.set(1, 1.5 - p * 0.5, 1);
    if (luz.current) luz.current.intensity = 0.85 + 0.22 * (p - 0.82);
  });
  return (
    <group position={[-2.34, 0.16, 0.2]}>
      {/* las brasas y las dos lenguas de candela */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.34, 0.06, 0.4]} />
        <meshBasicMaterial color="#e05a2b" />
      </mesh>
      <mesh ref={llama1} position={[0.02, 0.16, -0.06]}>
        <coneGeometry args={[0.085, 0.26, 6]} />
        <meshBasicMaterial color="#ff9a3d" transparent opacity={0.92} />
      </mesh>
      <mesh ref={llama2} position={[-0.04, 0.13, 0.09]}>
        <coneGeometry args={[0.06, 0.18, 6]} />
        <meshBasicMaterial color={LUCES.candela} transparent opacity={0.85} />
      </mesh>
      {/* la luz de la candela: la casa siempre espera caliente */}
      <pointLight ref={luz} color="#ffb066" intensity={0.92} distance={6.5} decay={1.8} position={[0.1, 0.55, 0]} />
    </group>
  );
}

/* ── EL HUMO: volutas que suben del fogón a la teja y se deshacen ─────────── */
function HumoFogon({ n, reducedMotion }) {
  const grupo = useRef(null);
  const volutas = useMemo(() => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        fase: (i / n) * 1.0,
        vel: 0.09 + (i % 3) * 0.02,
        deriva: 0.18 + (i % 2) * 0.12,
        r: 0.16 + (i % 3) * 0.05,
      });
    }
    return out;
  }, [n]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g || reducedMotion) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i];
      const d = volutas[i];
      const frac = (t * d.vel + d.fase) % 1;
      m.position.set(
        -2.62 + frac * d.deriva + 0.1 * Math.sin(t * 0.7 + i * 2.1),
        0.98 + frac * 2.3,
        0.2 + 0.14 * Math.cos(t * 0.5 + i * 1.7),
      );
      const s = 0.5 + frac * 1.6;
      m.scale.setScalar(s);
      m.material.opacity = 0.13 * Math.sin(Math.PI * Math.min(1, frac * 1.15));
    }
  });

  if (!n) return null;
  return (
    <group ref={grupo}>
      {volutas.map((d, i) => (
        <mesh
          key={i}
          position={reducedMotion ? [-2.6, 1.2 + (i / n) * 2.0, 0.2] : [-2.62, 1.0, 0.2]}
          scale={reducedMotion ? 0.8 + (i / n) * 1.2 : 0.5}
        >
          <sphereGeometry args={[d.r, 7, 5]} />
          <meshBasicMaterial
            color={NIEBLAS.lechosa}
            transparent
            opacity={reducedMotion ? 0.07 : 0.1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── LA VENTANA DE LOS MUNDOS: el vano-portal del muro del fondo ──────────── */
const LUCES_MUNDOS = [
  { color: ACENTOS.guayacan, pos: [-0.42, 1.75] },
  { color: AGUAS.viva, pos: [0.34, 1.9] },
  { color: ACENTOS.florDeMonte, pos: [0.5, 1.35] },
  { color: VERDES.templadoVivo, pos: [-0.25, 1.2] },
  { color: LUCES.luna, pos: [0.05, 1.58] },
];

function VentanaMundos({ atm, reducedMotion, onPortales }) {
  const velo = useRef(null);
  const luces = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (velo.current) velo.current.opacity = 0.2 + 0.1 * Math.sin(t * 1.1);
    const g = luces.current;
    if (g) {
      for (let i = 0; i < g.children.length; i++) {
        g.children[i].material.opacity = 0.55 + 0.4 * Math.sin(t * 1.6 + i * 1.9);
      }
    }
  });
  const cx = (VENTANA_MUNDOS.x0 + VENTANA_MUNDOS.x1) / 2;
  const cy = (VENTANA_MUNDOS.base + VENTANA_MUNDOS.alto) / 2;
  const w = VENTANA_MUNDOS.x1 - VENTANA_MUNDOS.x0 - 0.04;
  const h = VENTANA_MUNDOS.alto - VENTANA_MUNDOS.base - 0.04;
  const z = -SALA.fondo / 2 + 0.02;
  return (
    <group
      onClick={
        onPortales
          ? (e) => {
              e.stopPropagation();
              onPortales();
            }
          : undefined
      }
      onPointerOver={onPortales ? alApuntar : undefined}
      onPointerOut={onPortales ? alSoltar : undefined}
    >
      {/* el cielo-portal: la hora del valle mezclada con la plata de la luna */}
      <mesh position={[cx, cy, z]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={mezclar(atm.cielo, LUCES.luna, 0.45)} />
      </mesh>
      {/* el velo dorado que respira sobre el vano (la invitación) */}
      <mesh position={[cx, cy, z + 0.015]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          ref={velo}
          color={NIEBLAS.dorada}
          transparent
          opacity={0.24}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* los mundos titilando: cinco luces de colores llamando desde el vano */}
      <group ref={luces}>
        {LUCES_MUNDOS.map((l, i) => (
          <mesh key={i} position={[l.pos[0], l.pos[1], z + 0.03]}>
            <circleGeometry args={[0.05, 10]} />
            <meshBasicMaterial
              color={l.color}
              transparent
              opacity={0.8}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
      {/* el charco de luz que el vano tira al piso (afordancia de "se toca") */}
      <mesh position={[cx, 0.02, -1.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 18]} />
        <meshBasicMaterial color={LUCES.luna} transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ── EL RINCÓN DE LOS FERMENTOS: frascos de vidrio + anillo que respira ───── */
function RinconFermentos({ reducedMotion, onFermentos }) {
  const anillo = useRef(null);
  useFrame(({ clock }) => {
    const m = anillo.current;
    if (!m) return;
    if (reducedMotion) {
      m.material.opacity = 0.22;
      return;
    }
    const t = clock.elapsedTime;
    m.material.opacity = 0.14 + 0.12 * Math.sin(t * 1.4);
    m.scale.setScalar(1 + 0.05 * Math.sin(t * 1.4));
  });
  return (
    <group
      onClick={
        onFermentos
          ? (e) => {
              e.stopPropagation();
              onFermentos();
            }
          : undefined
      }
      onPointerOver={onFermentos ? alApuntar : undefined}
      onPointerOut={onFermentos ? alSoltar : undefined}
    >
      {/* la caja de toque del estante entero (invisible, generosa al dedo) */}
      <mesh position={[3.3, 1.0, -0.75]} visible={false}>
        <boxGeometry args={[0.7, 1.7, 1.8]} />
        <meshBasicMaterial />
      </mesh>
      {/* los frascos: el líquido de cada fermento + su vidrio */}
      {FRASCOS.map((f, i) => (
        <group key={i} position={f.pos}>
          <mesh>
            <cylinderGeometry args={[f.r - 0.018, f.r - 0.018, f.h * 0.68, 10]} />
            <meshLambertMaterial color={f.liquido} emissive={f.liquido} emissiveIntensity={0.28} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[f.r, f.r * 0.94, f.h, 10, 1, true]} />
            <meshLambertMaterial
              color={NEUTROS.hueso}
              transparent
              opacity={0.22}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
      {/* el anillo que respira al pie del estante */}
      <mesh ref={anillo} position={[2.85, 0.02, -0.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.56, 24]} />
        <meshBasicMaterial
          color={ACENTOS.ambar}
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* una candela tibia sobre los frascos (que el rincón se vea rincón) */}
      <pointLight color={ACENTOS.ambar} intensity={0.35} distance={2.6} decay={1.8} position={[3.0, 1.5, -0.75]} />
    </group>
  );
}

/* ── El anillo del paso didáctico (mismo contrato que cafetal/invernadero) ── */
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
    <mesh ref={anillo} position={[foco[0], foco[1], foco[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.68, 28]} />
      <meshBasicMaterial
        color={LUCES.candela}
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ── El diorama: el cuarto + la vida + los accesos ────────────────────────── */
function Diorama({ tier, reducedMotion, foco, onPortales, onFermentos }) {
  const perfil = perfilDeTier(tier);

  /* La HORA del valle (familia corral): tiñe lo que se ve por los vanos y el
     haz de la ventana. El fogón no la obedece — la casa siempre está tibia. */
  const atm = useAtmosferaMundo({ familia: FAMILIA_CASA, reducedMotion });

  const geoCasa = useMemo(() => construirCasaAdentro(tier === 'alto'), [tier]);

  const nHumo = tier === 'alto' ? 7 : tier === 'medio' ? 4 : 0;

  const controls = useRef(null);
  const hz = SALA.fondo / 2;

  return (
    <>
      {/* el fondo: el cielo de la hora (lo que asoma por la puerta) */}
      <color attach="background" args={[atm.fondo]} />

      {/* la penumbra tibia del interior */}
      <ambientLight color={LUCES.ambienteTibio} intensity={0.34} />
      <hemisphereLight skyColor={atm.cielo} groundColor={NEUTROS.tinta} intensity={0.22} />
      {/* el día entrando por la ventana del sur (sombra solo en gama alta) */}
      <directionalLight
        color={atm.luz}
        intensity={0.85}
        position={[-1.7, 3.4, 5.5]}
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-2}
        shadow-camera-far={16}
      />

      {/* EL CUARTO ENTERO: una geometría, una draw-call */}
      <mesh geometry={geoCasa} castShadow={perfil.sombras} receiveShadow={perfil.sombras}>
        <meshLambertMaterial vertexColors />
      </mesh>

      {/* el canasto de cosecha (cilindro abierto → DoubleSide, va aparte) */}
      <mesh position={CANASTO.pos}>
        <cylinderGeometry args={[CANASTO.rTop, CANASTO.rBase, CANASTO.h, 10, 1, true]} />
        <meshLambertMaterial color={CASA.bejuco} side={THREE.DoubleSide} />
      </mesh>

      {/* lo que se ve AFUERA por la puerta: el pasto del valle a la hora viva */}
      <mesh position={[1.1, 0, 4.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 5]} />
        <meshBasicMaterial color={mezclar(VERDES.brote, atm.niebla, 0.3)} />
      </mesh>
      {/* el resplandor del día en el vano de la puerta */}
      <mesh position={[(PUERTA.x0 + PUERTA.x1) / 2, PUERTA.alto / 2, hz + 0.03]}>
        <planeGeometry args={[PUERTA.x1 - PUERTA.x0 - 0.04, PUERTA.alto - 0.04]} />
        <meshBasicMaterial color={mezclar(atm.cielo, NIEBLAS.dorada, 0.35)} side={THREE.DoubleSide} />
      </mesh>
      {/* y en la ventana del sur */}
      <mesh
        position={[
          (VENTANA_SUR.x0 + VENTANA_SUR.x1) / 2,
          (VENTANA_SUR.base + VENTANA_SUR.alto) / 2,
          hz + 0.03,
        ]}
      >
        <planeGeometry args={[VENTANA_SUR.x1 - VENTANA_SUR.x0 - 0.04, VENTANA_SUR.alto - VENTANA_SUR.base - 0.04]} />
        <meshBasicMaterial color={mezclar(atm.cielo, NIEBLAS.dorada, 0.35)} side={THREE.DoubleSide} />
      </mesh>

      {/* EL HAZ DE LUZ de la ventana + su charco en el piso de tierra */}
      <mesh position={[-1.75, 0.78, 1.62]} rotation={[-1.05, 0, 0]}>
        <planeGeometry args={[0.92, 2.5]} />
        <meshBasicMaterial
          color={atm.luz}
          transparent
          opacity={0.09}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-1.75, 0.02, 0.85]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]}>
        <circleGeometry args={[0.85, 18]} />
        <meshBasicMaterial color={atm.luz} transparent opacity={0.14} depthWrite={false} />
      </mesh>

      {/* EL FOGÓN VIVO: candela + humo subiendo a la teja */}
      <FuegoFogon tier={tier} reducedMotion={reducedMotion} />
      <HumoFogon n={nHumo} reducedMotion={reducedMotion} />

      {/* LOS DOS ACCESOS legibles desde adentro */}
      <VentanaMundos atm={atm} reducedMotion={reducedMotion} onPortales={onPortales} />
      <RinconFermentos reducedMotion={reducedMotion} onFermentos={onFermentos} />

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 1.3, -0.1]}
        enablePan={false}
        enableZoom
        minDistance={1.3}
        maxDistance={2.8}
        minPolarAngle={0.6}
        maxPolarAngle={1.52}
        minAzimuthAngle={-1.15}
        maxAzimuthAngle={1.15}
        enableDamping
        dampingFactor={0.08}
      />
      {/* La LLEGADA: el dolly corto de cruzar el umbral — de la puerta hacia
          el centro del cuarto, una vez por sesión. */}
      <CamaraDirector
        controls={controls}
        reposo={[1.15, 1.6, 2.45]}
        mirada={[-0.5, 1.15, -0.5]}
        respiro={0.03}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoCasaAdentro"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * La casa por dentro. Montar SOLO perezosa (lazy).
 * @param {{
 *   tier?: 'alto'|'medio'|'bajo',
 *   reducedMotion?: boolean,
 *   foco?: number[]|null,
 *   onPortales?: (() => void)|null,
 *   onFermentos?: (() => void)|null,
 * }} props
 */
export default function EscenaCasaAdentro({
  tier = 'alto',
  reducedMotion = false,
  foco = null,
  onPortales = null,
  onFermentos = null,
}) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`casadentro-canvas${listo ? ' casadentro-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [1.15, 1.6, 2.45], fov: 58 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama
        tier={tier}
        reducedMotion={reducedMotion}
        foco={foco}
        onPortales={onPortales}
        onFermentos={onFermentos}
      />
    </Canvas>
  );
}
