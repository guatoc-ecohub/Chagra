/*
 * EscenaCalma3D — el DIORAMA del valle EN CALMA (estado vacío sereno).
 *
 * No es una escena-mundo del registro (no enseña un sistema de la finca): es el
 * ESTADO VACÍO del valle cuando el motor de alertas no tiene nada urgente. Por
 * eso NO compone `EscenaBase3D` (aquel trae hotspots + Angelita VOLANDO); aquí
 * no hay nada que tocar y Angelita DESCANSA posada en una flor, con las alas
 * quietas. La escena respira lento: la luz sube y baja apenas (~8 s de ciclo),
 * las motas de polen derivan, las nubes cruzan sin prisa. Paz activa, no
 * pantalla vacía.
 *
 * Perf (mismas reglas duras del framework, DR §6): SOLO MeshLambert/MeshBasic,
 * SIN sombras, SIN post-proceso, geometría 100% procedural (cero GLTF/HDR),
 * dpr ≤ 1.5 (≤ 1.25 en tier medio), `AdaptiveDpr`, `frameloop='demand'` con
 * reduced-motion (un fotograma sereno y quieto).
 *
 * Vive en escenas/ (chunk perezoso `vendor-three`): importa three/@react-three,
 * así que SOLO se monta vía `lazy()` desde `ValleEnCalma.jsx` — nunca desde el
 * barrel base del framework.
 */
import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { AbejaAngelita } from '../../creatures/AbejaAngelita.jsx';

/* Cielo del amanecer calmo: más rosado y suave que el default del framework. */
const CIELO_CALMA = { fondo: '#f0e4cf', cielo: '#f8ecd6', suelo: '#b9a078' };

/* PRNG determinista (misma calma siempre; cero azar por frame). */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Una loma: esfera achatada, verde apagado y maduro. */
function Loma({ pos, radio, color }) {
  return (
    <mesh position={pos} scale={[1, 0.42, 1]}>
      <sphereGeometry args={[radio, 12, 8]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

/* Un árbol low-poly: tronco + copa cónica. */
function Arbol({ pos, alto = 1 }) {
  return (
    <group position={pos}>
      <mesh position={[0, alto * 0.22, 0]}>
        <cylinderGeometry args={[0.05, 0.08, alto * 0.44, 6]} />
        <meshLambertMaterial color="#7a5a38" />
      </mesh>
      <mesh position={[0, alto * 0.62, 0]}>
        <coneGeometry args={[alto * 0.3, alto * 0.8, 7]} />
        <meshLambertMaterial color="#4d7a4a" />
      </mesh>
    </group>
  );
}

/* Una flor: tallo + corola de esfera pequeña. La grande es la cama de Angelita. */
function Flor({ pos, color = '#d98da3', escala = 1 }) {
  return (
    <group position={pos} scale={escala}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.018, 0.024, 0.32, 5]} />
        <meshLambertMaterial color="#5f8a4e" />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.34, 0]} scale={[1.5, 0.4, 1.5]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshLambertMaterial color="#f2e3c8" />
      </mesh>
    </group>
  );
}

/* Motas de polen que derivan sin prisa (círculo lentísimo + vaivén vertical). */
function Motas({ cuantas, reducedMotion }) {
  const grupo = useRef(null);
  const motas = useMemo(() => {
    const r = rng(41);
    return Array.from({ length: cuantas }, (_, i) => ({
      key: `m${i}`,
      pos: /** @type {[number, number, number]} */ ([(r() - 0.5) * 4.6, 0.7 + r() * 1.6, (r() - 0.5) * 3.4]),
      fase: r() * Math.PI * 2,
      radio: 0.014 + r() * 0.014,
    }));
  }, [cuantas]);

  useFrame((state) => {
    if (reducedMotion || !grupo.current) return;
    const t = state.clock.elapsedTime;
    grupo.current.rotation.y = t * 0.03; // deriva, no gira: 1 vuelta cada ~3.5 min
    grupo.current.children.forEach((m, i) => {
      m.position.y = motas[i].pos[1] + Math.sin(t * 0.35 + motas[i].fase) * 0.12;
    });
  });

  return (
    <group ref={grupo}>
      {motas.map((m) => (
        <mesh key={m.key} position={m.pos}>
          <sphereGeometry args={[m.radio, 5, 4]} />
          <meshBasicMaterial color="#fdf3d8" transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/* Nubes bajas: esferas blancas aplastadas que cruzan el valle sin apuro. */
function Nubes({ cuantas, reducedMotion }) {
  const grupo = useRef(null);
  const nubes = useMemo(() => {
    const r = rng(73);
    return Array.from({ length: cuantas }, (_, i) => ({
      key: `n${i}`,
      pos: [(r() - 0.5) * 5, 2.3 + r() * 0.8, -1.6 - r() * 1.4],
      esc: 0.5 + r() * 0.5,
      fase: r() * Math.PI * 2,
    }));
  }, [cuantas]);

  useFrame((state) => {
    if (reducedMotion || !grupo.current) return;
    const t = state.clock.elapsedTime;
    grupo.current.children.forEach((n, i) => {
      n.position.x = nubes[i].pos[0] + Math.sin(t * 0.05 + nubes[i].fase) * 1.1;
    });
  });

  return (
    <group ref={grupo}>
      {nubes.map((n) => (
        <group key={n.key} position={/** @type {[number, number, number]} */ (n.pos)} scale={[n.esc * 1.7, n.esc * 0.55, n.esc]}>
          <mesh>
            <sphereGeometry args={[0.55, 9, 7]} />
            <meshBasicMaterial color="#fbf6ea" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* La luz que RESPIRA: sube y baja apenas (±8%) en un ciclo de ~8 s. */
function LuzQueRespira({ reducedMotion }) {
  const hemi = useRef(null);
  const amb = useRef(null);
  useFrame((state) => {
    if (reducedMotion) return;
    const suspiro = 1 + Math.sin(state.clock.elapsedTime * (Math.PI / 4)) * 0.08;
    if (hemi.current) hemi.current.intensity = 0.95 * suspiro;
    if (amb.current) amb.current.intensity = 0.5 * suspiro;
  });
  return (
    <>
      <hemisphereLight ref={hemi} intensity={0.95} color={CIELO_CALMA.cielo} groundColor={CIELO_CALMA.suelo} />
      <ambientLight ref={amb} intensity={0.5} color="#fff3dd" />
    </>
  );
}

/* Angelita DESCANSANDO: posada junto a la flor grande, alas quietas
   (`animated={false}` SIEMPRE — descansar es no batir), ánimo `descansa`.
   Su respiración lenta es CSS (`.vcalma-abeja`, apagada con reduced-motion). */
function AngelitaDescansa({ reducedMotion }) {
  return (
    <group position={[0.62, 0.62, 0.7]}>
      <Html center distanceFactor={6.5} zIndexRange={[40, 10]}>
        <div
          className={`vcalma-abeja${reducedMotion ? ' vcalma-abeja--quieta' : ''}`}
          aria-hidden="true"
        >
          <AbejaAngelita size={44} animo="descansa" energia={0.4} animated={false} />
        </div>
      </Html>
    </group>
  );
}

function Diorama({ frugal, reducedMotion }) {
  const flores = useMemo(() => {
    const r = rng(19);
    return Array.from({ length: frugal ? 4 : 7 }, (_, i) => ({
      key: `f${i}`,
      pos: [(r() - 0.5) * 3.6, 0.34, (r() - 0.2) * 2.2],
      color: ['#d98da3', '#e7b04c', '#c9d9ec'][i % 3],
      escala: 0.7 + r() * 0.5,
    }));
  }, [frugal]);

  return (
    <>
      <color attach="background" args={[CIELO_CALMA.fondo]} />
      <LuzQueRespira reducedMotion={reducedMotion} />

      {/* el suelo del valle: disco verde calmo */}
      <mesh position={[0, 0.28, 0]} scale={[1, 0.18, 1]}>
        <sphereGeometry args={[3.4, 18, 12]} />
        <meshLambertMaterial color="#6c9a5b" />
      </mesh>

      {/* lomas al fondo, tonos que se alejan */}
      <Loma pos={[-2.4, 0.5, -2.1]} radio={1.7} color="#5f8a52" />
      <Loma pos={[2.5, 0.45, -2.4]} radio={1.9} color="#557e4c" />
      <Loma pos={[0.3, 0.42, -3.1]} radio={2.2} color="#4c7147" />

      {/* árboles y flores dispersos */}
      <Arbol pos={[-1.5, 0.5, -0.6]} alto={1.15} />
      <Arbol pos={[1.9, 0.48, -1.1]} alto={0.9} />
      {!frugal && <Arbol pos={[-0.4, 0.46, -1.7]} alto={1.3} />}
      {flores.map((f) => (
        <Flor key={f.key} pos={f.pos} color={f.color} escala={f.escala} />
      ))}

      {/* la flor-cama de Angelita, un poco más grande y adelante */}
      <Flor pos={[0.62, 0.36, 0.7]} color="#e7b04c" escala={1.25} />
      <AngelitaDescansa reducedMotion={reducedMotion} />

      <Motas cuantas={frugal ? 6 : 12} reducedMotion={reducedMotion} />
      <Nubes cuantas={frugal ? 2 : 3} reducedMotion={reducedMotion} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={4}
        maxDistance={10}
        minPolarAngle={0.4}
        maxPolarAngle={1.3}
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
 * La escena 3D de la calma. Montarla SOLO perezosa (ver `ValleEnCalma.jsx`).
 *
 * @param {object} props
 * @param {'alto'|'medio'} [props.tier='alto']  medio → frugal (menos motas/flores, DPR ≤ 1.25).
 * @param {boolean} [props.reducedMotion=false] estático sereno: frameloop a demanda, cero vaivén.
 */
export default function EscenaCalma3D({ tier = 'alto', reducedMotion = false }) {
  const [listo, setListo] = useState(false);
  const frugal = tier !== 'alto';
  return (
    <Canvas
      className={`vcalma-canvas${listo ? ' vcalma-canvas--lista' : ''}`}
      dpr={frugal ? [1, 1.25] : [1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [2.6, 2.2, 5.2], fov: 42 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama frugal={frugal} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
