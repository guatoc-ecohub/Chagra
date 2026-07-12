/*
 * VentanaValle3DEscena — la VIÑETA 3D que vive dentro de la ventana-puerta
 * del home (`VentanaValle3D.jsx`). NO es una escena-mundo del registro: es un
 * asomo del valle, un plano fijo con la cámara que RESPIRA (dolly sutil, ±16 cm)
 * para que la ventana se sienta VIVA sin pedir interacción. La puerta es el
 * marco de afuera; aquí adentro solo hay paisaje: piso verde-vivo, lomas que se
 * alejan, matas low-poly, niebla suave de media mañana, esporas bio-glow que
 * derivan y la Angelita 2D (la MISMA del home, via drei `Html`) flotando.
 *
 * Perf (más estricta que las escenas-mundo — esto es un WIDGET PERSISTENTE del
 * home, DR §6): SOLO MeshLambert/MeshBasic, SIN sombras, SIN post-proceso,
 * geometría 100% procedural, `powerPreference: 'low-power'` (¡no es la
 * experiencia plena, es una ventana!), dpr ≤ 1.5 (≤ 1.2 frugal), AdaptiveDpr,
 * y con reduced-motion `frameloop='demand'` → UN fotograma quieto y digno.
 *
 * Importa three/@react-three (chunk `vendor-three`): montarla SOLO perezosa
 * via `lazy()` desde `VentanaValle3D.jsx` — nunca desde el home directo.
 */
import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, AdaptiveDpr } from '@react-three/drei';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';

/* Luz de media mañana en el valle: cielo cálido, verdes VIVOS (biopunk suave). */
const CIELO = { fondo: '#eaf0d3', cielo: '#f6ecd2', suelo: '#8fae6a', niebla: '#e6eecb' };
/* El punto del valle que la ventana enmarca (la cámara siempre lo mira). */
const FOCO = [0, 0.72, 0];

/* PRNG determinista: la ventana muestra SIEMPRE el mismo valle (cero azar). */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* La cámara que respira: dolly-in/out lentísimo + un vaivén vertical apenas
   perceptible. Es TODO el movimiento de cámara de la ventana (sin controles:
   tocar la ventana es ENTRAR, no orbitar). reduced-motion → quieta. */
function CamaraRespira({ reducedMotion }) {
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    state.camera.position.z = 5.1 + Math.sin(t * 0.32) * 0.16;
    state.camera.position.y = 1.62 + Math.sin(t * 0.21 + 1.4) * 0.06;
    state.camera.lookAt(FOCO[0], FOCO[1], FOCO[2]);
  });
  return null;
}

/* Una loma: esfera achatada en verdes que se alejan. */
function Loma({ pos, radio, color }) {
  return (
    <mesh position={pos} scale={[1, 0.4, 1]}>
      <sphereGeometry args={[radio, 12, 8]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

/* Una mata low-poly: tallo + copa cónica de hoja viva (y una hojita lateral). */
function Mata({ pos, alto = 1, hoja = '#4d8a4a' }) {
  return (
    <group position={pos}>
      <mesh position={[0, alto * 0.2, 0]}>
        <cylinderGeometry args={[0.035, 0.055, alto * 0.4, 5]} />
        <meshLambertMaterial color="#6f8a3f" />
      </mesh>
      <mesh position={[0, alto * 0.58, 0]}>
        <coneGeometry args={[alto * 0.26, alto * 0.72, 6]} />
        <meshLambertMaterial color={hoja} />
      </mesh>
      <mesh position={[alto * 0.2, alto * 0.34, 0.04]} rotation={[0, 0, -0.9]}>
        <coneGeometry args={[alto * 0.09, alto * 0.3, 5]} />
        <meshLambertMaterial color={hoja} />
      </mesh>
    </group>
  );
}

/* Esporas bio-glow: puntitos verde-luz que derivan sin prisa (el toque biopunk
   ADENTRO de la ventana; el marco de afuera lleva sus gemelas en CSS). */
function Esporas({ cuantas, reducedMotion }) {
  const grupo = useRef(null);
  const esporas = useMemo(() => {
    const r = rng(53);
    return Array.from({ length: cuantas }, (_, i) => ({
      key: `e${i}`,
      pos: /** @type {[number, number, number]} */ ([(r() - 0.5) * 4.2, 0.6 + r() * 1.5, (r() - 0.4) * 2.8]),
      fase: r() * Math.PI * 2,
      radio: 0.016 + r() * 0.016,
    }));
  }, [cuantas]);

  useFrame((state) => {
    if (reducedMotion || !grupo.current) return;
    const t = state.clock.elapsedTime;
    grupo.current.rotation.y = t * 0.025; // deriva: una vuelta cada ~4 min
    grupo.current.children.forEach((m, i) => {
      m.position.y = esporas[i].pos[1] + Math.sin(t * 0.4 + esporas[i].fase) * 0.1;
    });
  });

  return (
    <group ref={grupo}>
      {esporas.map((m) => (
        <mesh key={m.key} position={m.pos}>
          <sphereGeometry args={[m.radio, 5, 4]} />
          <meshBasicMaterial color="#d9f7a6" transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* La Angelita 2D (la preferida — el MISMO SVG rubber-hose del home) flotando
   en el valle via `Html`: cruza despacio y sube-baja con las alas batiendo.
   Decorativa aquí (aria-hidden): la a11y la lleva el botón-ventana de afuera. */
function AngelitaVuela({ reducedMotion, tier }) {
  const g = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    const t = state.clock.elapsedTime;
    g.current.position.y = 1.02 + Math.sin(t * 0.85) * 0.1;
    g.current.position.x = 0.45 + Math.sin(t * 0.19) * 0.35;
  });
  return (
    <group ref={g} position={[0.45, 1.02, 0.9]}>
      <Html center distanceFactor={6} zIndexRange={[30, 10]} wrapperClass="vv-abeja-html">
        <div className="vv-abeja" aria-hidden="true">
          <AbejaAngelita size={46} animo="pleno" energia={0.9} animated={!reducedMotion} tier={tier} />
        </div>
      </Html>
    </group>
  );
}

function Vineta({ frugal, reducedMotion, tier }) {
  const matas = useMemo(() => {
    const r = rng(29);
    return Array.from({ length: frugal ? 4 : 7 }, (_, i) => ({
      key: `t${i}`,
      pos: /** @type {[number, number, number]} */ ([(r() - 0.5) * 3.8, 0.42, (r() - 0.25) * 2.3]),
      alto: 0.7 + r() * 0.7,
      hoja: ['#4d8a4a', '#5f9c50', '#3f7a45'][i % 3],
    }));
  }, [frugal]);

  return (
    <>
      <color attach="background" args={[CIELO.fondo]} />
      {/* niebla suave: el fondo del valle se disuelve en la luz (profundidad barata) */}
      <fog attach="fog" args={[CIELO.niebla, 5.5, 12.5]} />
      <hemisphereLight intensity={0.95} color={CIELO.cielo} groundColor={CIELO.suelo} />
      <ambientLight intensity={0.5} color="#fff3da" />
      <CamaraRespira reducedMotion={reducedMotion} />

      {/* el piso del valle: disco verde-vivo */}
      <mesh position={[0, 0.26, 0]} scale={[1, 0.16, 1]}>
        <sphereGeometry args={[3.6, 18, 12]} />
        <meshLambertMaterial color="#6c9a5b" />
      </mesh>

      {/* lomas al fondo, tonos que se alejan hacia la niebla */}
      <Loma pos={[-2.5, 0.5, -2.2]} radio={1.8} color="#5f8a52" />
      <Loma pos={[2.6, 0.44, -2.5]} radio={2.0} color="#557e4c" />
      <Loma pos={[0.2, 0.4, -3.3]} radio={2.4} color="#4c7147" />

      {/* las matas sembradas (deterministas) */}
      {matas.map((m) => (
        <Mata key={m.key} pos={m.pos} alto={m.alto} hoja={m.hoja} />
      ))}

      <AngelitaVuela reducedMotion={reducedMotion} tier={tier} />
      <Esporas cuantas={frugal ? 5 : 9} reducedMotion={reducedMotion} />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * La escena de la ventana. Montarla SOLO perezosa (ver `VentanaValle3D.jsx`).
 *
 * @param {object} props
 * @param {'alto'|'medio'} [props.tier='alto']  medio → frugal (menos matas/esporas, DPR ≤ 1.2, sin AA).
 * @param {boolean} [props.reducedMotion=false] un fotograma quieto: frameloop a demanda, cero vaivén.
 */
export default function VentanaValle3DEscena({ tier = 'alto', reducedMotion = false }) {
  const [listo, setListo] = useState(false);
  const frugal = tier !== 'alto';
  return (
    <Canvas
      className={`vv-canvas${listo ? ' vv-canvas--lista' : ''}`}
      dpr={frugal ? [1, 1.2] : [1, 1.5]}
      gl={{ antialias: !frugal, powerPreference: 'low-power' }}
      camera={{ position: [0, 1.62, 5.1], fov: 38 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={({ camera }) => {
        // El fotograma inicial (y el ÚNICO con reduced-motion) ya mira al foco.
        camera.lookAt(FOCO[0], FOCO[1], FOCO[2]);
        setListo(true);
      }}
    >
      <Vineta frugal={frugal} reducedMotion={reducedMotion} tier={tier} />
    </Canvas>
  );
}
