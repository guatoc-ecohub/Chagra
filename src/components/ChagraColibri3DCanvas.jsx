import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ChagraColibri3DCanvas — el lienzo Three.js del colibrí 3D ligero. Vive en su
 * propio módulo para que `ChagraColibri3DLite` lo cargue de forma perezosa
 * (lazy) y Three.js NO entre al bundle principal cuando la flag está OFF.
 *
 * Geometría/materiales destilados de `ChagraAgentAvatarColibri3D` (mismo plumaje
 * esmeralda iridiscente → cyan, gorget carmesí, pico largo, ojo con catchlight),
 * pero recortados para correr en gama baja: menos segmentos, sin halo ni
 * partículas, una sola luz clave + ambiente cálido.
 *
 * Render bajo control (`frameloop="demand"`):
 *   - `<Driver>` llama `invalidate()` a ~máx 45 fps SOLO si `active` (visible +
 *     tab al frente) y NO `reducedMotion`. Cuando `active` se apaga, el loop
 *     deja de invalidar → la GPU no hace nada.
 *   - Con `reducedMotion` se pinta UN frame estático (sin loop, sin batería).
 */

const PRESETS = {
  // Home: revolotea con un arco de vuelo suave cerca de las flores.
  home: {
    camera: { position: [0, 0.05, 3.4], fov: 32 },
    dpr: [1, 1.5],
    antialias: true,
    bobAmp: 0.06,
    driftAmp: 0.22, // arco horizontal suave
    swayAmp: 0.1, // vaivén vertical del arco
    yawAmp: 0.5, // gira para encarar el sentido del vuelo
    flapHz: { idle: 24, thinking: 38, speaking: 28 },
    scale: 1,
  },
  // FAB: vuelo estacionario, sin desplazamiento (sprite chico sobre el botón).
  fab: {
    camera: { position: [0, 0.0, 3.0], fov: 34 },
    dpr: [1, 1.5],
    antialias: false, // sprite pequeño: el AA casi no se nota y cuesta GPU
    bobAmp: 0.05,
    driftAmp: 0,
    swayAmp: 0,
    yawAmp: 0.18,
    flapHz: { idle: 22, thinking: 34, speaking: 30 },
    scale: 1.18,
  },
};

const PLUMAGE_BASE = '#10b981';
const PLUMAGE_HILITE = '#22d3ee';
const WING_COLOR = '#34d399';
const GORGET_COLOR = '#dc2626';

/** Ala curva con aleteo rápido + torsión para que no se vea como cartulina. */
function Wing({ side, flapHzRef }) {
  const ref = useRef();
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.15, 0.45, 0.65, 0.55, 0.95, 0.18);
    shape.bezierCurveTo(1.05, -0.05, 0.7, -0.2, 0.35, -0.12);
    shape.bezierCurveTo(0.15, -0.08, 0.05, -0.04, 0, 0);
    const geom = new THREE.ShapeGeometry(shape, 16);
    geom.computeVertexNormals();
    return geom;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const hz = flapHzRef.current;
    const t = state.clock.elapsedTime;
    // Aleteo: amplio y rápido (entre ~-55° y +25°), figura de "ocho" sutil.
    const flap = Math.sin(t * hz * Math.PI * 2) * 0.7 - 0.3;
    ref.current.rotation.z = side === 'right' ? flap : -flap;
    ref.current.rotation.y =
      side === 'right' ? 0.15 + flap * 0.22 : -0.15 - flap * 0.22;
  });

  const xPos = side === 'right' ? 0.05 : -0.05;
  const rotY = side === 'right' ? -0.3 : Math.PI + 0.3;

  return (
    <mesh ref={ref} position={[xPos, 0.15, 0]} rotation={[0, rotY, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshPhysicalMaterial
        color={WING_COLOR}
        metalness={0.3}
        roughness={0.45}
        transmission={0.18}
        thickness={0.3}
        iridescence={0.85}
        iridescenceIOR={1.6}
        clearcoat={0.5}
        clearcoatRoughness={0.25}
        side={THREE.DoubleSide}
        transparent
        opacity={0.82}
      />
    </mesh>
  );
}

/** Cuerpo torpedo + vientre claro + cola en abanico (3 plumas, low-poly). */
function Body() {
  return (
    <group>
      <mesh rotation={[0, 0, -0.18]}>
        <sphereGeometry args={[0.42, 20, 16]} />
        <meshPhysicalMaterial
          color={PLUMAGE_BASE}
          metalness={0.55}
          roughness={0.35}
          iridescence={1.0}
          iridescenceIOR={1.8}
          iridescenceThicknessRange={[100, 800]}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          emissive={PLUMAGE_BASE}
          emissiveIntensity={0.12}
        />
      </mesh>
      <mesh position={[0.05, -0.18, 0.18]} rotation={[0, 0, -0.18]}>
        <sphereGeometry args={[0.28, 14, 12]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.6} transparent opacity={0.5} />
      </mesh>
      {[-0.16, 0, 0.16].map((spread, i) => (
        <mesh
          key={i}
          position={[-0.55, -0.05 + spread * 0.2, spread * 0.45]}
          rotation={[0, spread * 0.6, -0.15]}
        >
          <boxGeometry args={[0.32, 0.05, 0.08]} />
          <meshPhysicalMaterial
            color={PLUMAGE_HILITE}
            metalness={0.4}
            roughness={0.4}
            iridescence={0.7}
            clearcoat={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Cabeza + gorget carmesí + pico largo + ojo con catchlight (el detalle vivo). */
function Head() {
  return (
    <group position={[0.36, 0.18, 0]}>
      <mesh>
        <sphereGeometry args={[0.22, 18, 14]} />
        <meshPhysicalMaterial
          color={PLUMAGE_BASE}
          metalness={0.6}
          roughness={0.3}
          iridescence={1.0}
          iridescenceIOR={1.9}
          iridescenceThicknessRange={[200, 600]}
          clearcoat={0.85}
          clearcoatRoughness={0.18}
          emissive={PLUMAGE_BASE}
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh position={[0.06, -0.08, 0.12]}>
        <sphereGeometry args={[0.13, 14, 12]} />
        <meshStandardMaterial
          color={GORGET_COLOR}
          metalness={0.7}
          roughness={0.25}
          emissive={GORGET_COLOR}
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[0.32, -0.02, 0]} rotation={[0, 0, -Math.PI / 2 + 0.1]}>
        <coneGeometry args={[0.025, 0.45, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
      </mesh>
      <group position={[0.08, 0.04, 0.18]}>
        <mesh>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color="#020617" emissive="#0c0a09" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.02, 0.018, 0.035]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    </group>
  );
}

const STATE_BOB_MULT = { idle: 1, thinking: 1.3, speaking: 1.7 };

/** El colibrí completo: bob de respiración + arco de vuelo + yaw para encarar. */
function Hummingbird({ variant, state, flapHzRef, reducedMotion }) {
  const ref = useRef();
  const cfg = PRESETS[variant] || PRESETS.home;
  const bobMult = STATE_BOB_MULT[state] || 1;

  useFrame((s) => {
    const g = ref.current;
    if (!g) return;
    if (reducedMotion) {
      // Pose en reposo, alas semiabiertas, sin movimiento.
      g.position.set(0, 0, 0);
      g.rotation.set(0, 0, 0);
      return;
    }
    const t = s.clock.elapsedTime;
    // Bob de respiración (vertical, suave).
    const bob = Math.sin(t * 1.6) * cfg.bobAmp * bobMult;
    // Arco de vuelo: deriva horizontal lenta + leve sube/baja → "revolotea".
    const drift = Math.sin(t * 0.6) * cfg.driftAmp;
    const sway = Math.cos(t * 0.45) * cfg.swayAmp;
    g.position.set(drift, bob + sway, 0);
    // Yaw: encara levemente el sentido del vuelo (derivada del drift).
    g.rotation.y = Math.cos(t * 0.6) * cfg.yawAmp;
    // Cabeceo mínimo para que el vuelo se sienta orgánico.
    g.rotation.z = Math.sin(t * 1.2) * 0.04;
  });

  return (
    <group ref={ref} scale={cfg.scale}>
      <Body />
      <Head />
      <Wing side="left" flapHzRef={flapHzRef} />
      <Wing side="right" flapHzRef={flapHzRef} />
    </group>
  );
}

/**
 * Driver del render bajo demanda. Con `frameloop="demand"` el canvas solo pinta
 * cuando algo llama `invalidate()`. Este componente invalida a un ritmo fijo
 * mientras `active`, y para por completo cuando no (offscreen / tab oculto /
 * reduced-motion) → la GPU descansa.
 */
function Driver({ active, reducedMotion }) {
  const invalidate = useThree((s) => s.invalidate);
  const lastRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) {
      // Un único frame estático y nada más.
      invalidate();
      return undefined;
    }
    if (!active) return undefined;
    let raf;
    const FRAME_MS = 1000 / 45; // capear a ~45 fps (suave y barato en gama baja)
    const tick = (now) => {
      if (now - lastRef.current >= FRAME_MS) {
        lastRef.current = now;
        invalidate();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reducedMotion, invalidate]);

  return null;
}

export default function ChagraColibri3DCanvas({
  variant = 'home',
  state = 'idle',
  reducedMotion = false,
  active = true,
}) {
  const cfg = PRESETS[variant] || PRESETS.home;
  // Hz de aleteo por estado, pasado por ref para no recrear materiales/efectos.
  const flapHzRef = useRef(cfg.flapHz[state] || cfg.flapHz.idle);
  useEffect(() => {
    flapHzRef.current = cfg.flapHz[state] || cfg.flapHz.idle;
  }, [state, cfg]);

  return (
    <Canvas
      frameloop="demand"
      camera={cfg.camera}
      dpr={cfg.dpr}
      gl={{
        antialias: cfg.antialias,
        alpha: true,
        powerPreference: 'low-power',
        // No crear depth/stencil de más para un sprite chico.
        stencil: false,
      }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
    >
      {/* Luz clave + ambiente cálido (verde-menta) + un toque cyan de relleno. */}
      <ambientLight intensity={0.6} color="#a7f3d0" />
      <directionalLight position={[2.5, 3.5, 2]} intensity={0.95} color="#ffffff" />
      <directionalLight position={[-2, 0.5, -1.5]} intensity={0.35} color="#67e8f9" />
      <Hummingbird
        variant={variant}
        state={state}
        flapHzRef={flapHzRef}
        reducedMotion={reducedMotion}
      />
      <Driver active={active} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
