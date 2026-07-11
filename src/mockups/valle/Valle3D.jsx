/*
 * Valle3D — la ESCENA 3D del mockup "El valle de mi finca".
 *
 * React-Three-Fiber sobre WebGL 2 (la línea base del DR §2). Se carga PEREZOSO
 * (React.lazy en EntradaValle3D) para no inflar el bundle base: el chunk de
 * three/fiber/drei solo baja cuando el equipo SÍ tiene WebGL y entra a la ruta.
 *
 * Todo es GEOMETRÍA PROCEDURAL (cero GLTF/HDR remotos) → offline-first y
 * liviano. Estética "acuarela cálida" (Alba/Sorolla del DR), no neón frío.
 * Solo se anima transform/opacity-equivalentes (rotación/posición/escala) por
 * useFrame; `reducedMotion` congela el vaivén a un fotograma digno.
 *
 * Los 4 sí-o-sí viven en el espacio:
 *   · MUNDOS  → landmarks navegables (MundoLugar) con etiqueta accesible.
 *   · ALERTA  → Beacon pulsante anclado sobre el mundo 'suelo' (la cosa del día).
 *   · AGENTE  → el Colibrí (visual-lib) flota sobre el foco activo.
 *   · CLIMA   → luz/niebla/estrellas de la escena salen del estado `clima`.
 */
/* Nota: las props de three (position, args, intensity, castShadow, etc.) son
   válidas en el reconciliador de R3F, no en el DOM — el config de ESLint del
   repo no activa react/no-unknown-property, así que no requieren disable. */
import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Float, Stars, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { Colibri } from '../../visual/creatures/Colibri.jsx';
import { LandmarkPorTipo } from './mundo3dLandmarks.jsx';
import { MUNDOS_VALLE, MUNDO_VALLE_BY_ID, COSA_DEL_DIA, CLIMAS } from './valleData';

/* Altura del terreno por (x,z): un valle suave con ladera al fondo (+z) donde
   suben las terrazas del café. Determinista → los landmarks se posan encima. */
function alturaTerreno(x, z) {
  const ladera = Math.max(0, (z + 2) * 0.16);
  const ondul = Math.sin(x * 0.5) * 0.08 + Math.cos(z * 0.4) * 0.06;
  const cauce = -0.28 * Math.exp(-((x - 0.6) ** 2) / 5) * Math.exp(-((z + 1) ** 2) / 40);
  return ladera + ondul + cauce;
}

/* ── El suelo del valle: malla ondulada de bajo poligonaje, color tierra-verde
      que se aclara al fondo (perspectiva aérea). ── */
function Terreno({ colorBase }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(30, 30, 48, 48);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, alturaTerreno(x, z));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color={colorBase} flatShading roughness={1} metalness={0} />
    </mesh>
  );
}

/* ── La cordillera de páramo al fondo: conos pálidos (perspectiva aérea). ── */
function Cordillera({ color }) {
  const picos = useMemo(
    () => [
      { x: -8, z: -12, h: 7, r: 5 },
      { x: -2, z: -14, h: 9, r: 6 },
      { x: 5, z: -12.5, h: 7.5, r: 5.2 },
      { x: 11, z: -13, h: 6, r: 4.5 },
    ],
    [],
  );
  return (
    <group>
      {picos.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2 - 0.5, p.z]}>
          <coneGeometry args={[p.r, p.h, 5]} />
          <meshStandardMaterial color={color} flatShading roughness={1} opacity={0.9} transparent />
        </mesh>
      ))}
    </group>
  );
}

/* ── La quebrada: una cinta de agua que serpentea por el cauce. ── */
function Quebrada({ color, viva }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (viva && ref.current) {
      ref.current.material.opacity = 0.72 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
    }
  });
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6, 0, -6),
      new THREE.Vector3(-2, 0, -3),
      new THREE.Vector3(0.6, 0, -1.4),
      new THREE.Vector3(1.4, 0, 2),
      new THREE.Vector3(3, 0, 6),
    ]);
    const g = new THREE.TubeGeometry(curve, 60, 0.42, 6, false);
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[0, 0.02, 0]}>
      <meshStandardMaterial
        ref={ref}
        color={color}
        transparent
        opacity={0.78}
        roughness={0.25}
        metalness={0.35}
      />
    </mesh>
  );
}


/* ── Un mundo como LUGAR navegable: su geometría + una etiqueta accesible que,
      al tocarse, viaja hasta él (la cámara) y lo selecciona. ── */
function MundoLugar({ mundo, activo, onEntrar, reducedMotion }) {
  const y = alturaTerreno(mundo.pos[0], mundo.pos[2]);
  return (
    <group position={[mundo.pos[0], y, mundo.pos[2]]} scale={mundo.escala}>
      {/* La forma del landmark ya no es un switch inline: la resuelve el
          registro LANDMARKS[tipo] del framework (mundo3dLandmarks). */}
      <LandmarkPorTipo tipo={mundo.tipo} tinte={mundo.tinte} reducedMotion={reducedMotion} />
      <Html center distanceFactor={11} position={[0, 1.7, 0]} zIndexRange={[20, 0]}>
        <button
          type="button"
          className={`valle-poi${activo ? ' valle-poi--activo' : ''}`}
          style={{ '--poi-tinte': mundo.tinte[0] }}
          onClick={(e) => {
            e.stopPropagation();
            onEntrar(mundo.id);
          }}
          aria-label={`Viajar al mundo ${mundo.titulo}. ${mundo.lema}`}
        >
          <span className="valle-poi__emoji" aria-hidden="true">{mundo.emoji}</span>
          <span className="valle-poi__txt">{mundo.titulo}</span>
        </button>
      </Html>
    </group>
  );
}

/* ── La cosa del día: un faro pulsante anclado sobre su mundo. Un SOLO destello.
      Toca la señal → onAlerta() (el agente lo dice y ofrece LA acción). ── */
function Beacon({ onAlerta, reducedMotion }) {
  const ancla = MUNDO_VALLE_BY_ID[COSA_DEL_DIA.anclaMundo];
  const luz = useRef(null);
  const halo = useRef(null);
  useFrame((state) => {
    if (reducedMotion) return;
    const p = (Math.sin(state.clock.elapsedTime * 1.6) + 1) / 2;
    if (luz.current) luz.current.intensity = 1.4 + p * 2.6;
    if (halo.current) {
      const s = 1 + p * 0.5;
      halo.current.scale.set(s, s, s);
      halo.current.material.opacity = 0.5 - p * 0.35;
    }
  });
  if (!ancla) return null;
  const y = alturaTerreno(ancla.pos[0], ancla.pos[2]);
  return (
    <group position={[ancla.pos[0], y, ancla.pos[2]]}>
      <pointLight ref={luz} position={[0, 1.6, 0]} color="#ffd28a" intensity={2.2} distance={7} />
      <Float speed={reducedMotion ? 0 : 2} floatIntensity={reducedMotion ? 0 : 0.6} rotationIntensity={0}>
        <mesh position={[0, 1.7, 0]}>
          <octahedronGeometry args={[0.26, 0]} />
          <meshStandardMaterial color="#ffd88f" emissive="#ffb24d" emissiveIntensity={1.4} flatShading />
        </mesh>
        <mesh ref={halo} position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#ffcf87" transparent opacity={0.4} />
        </mesh>
      </Float>
      <Html center distanceFactor={10} position={[0, 2.7, 0]} zIndexRange={[30, 0]}>
        <button
          type="button"
          className="valle-alerta"
          onClick={(e) => {
            e.stopPropagation();
            onAlerta();
          }}
          aria-label={`Alerta del día: ${COSA_DEL_DIA.titulo}. ${COSA_DEL_DIA.detalle}`}
        >
          <span className="valle-alerta__icono" aria-hidden="true">⚠️</span>
          <span className="valle-alerta__txt">{COSA_DEL_DIA.titulo}</span>
        </button>
      </Html>
    </group>
  );
}

/* ── El compañero: el colibrí (visual-lib) flota sobre el foco activo y es la
      cara del agente. Reusa el SVG canónico de creatures. ── */
function CompaneroColibri({ foco, reducedMotion }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const bob = reducedMotion ? 0 : Math.sin(t * 2) * 0.15;
    ref.current.position.lerp(
      new THREE.Vector3(foco.x + 0.9, foco.y + 2.2 + bob, foco.z + 0.6),
      0.05,
    );
  });
  return (
    <group ref={ref} position={[foco.x + 0.9, foco.y + 2.2, foco.z + 0.6]}>
      <Html center distanceFactor={9} zIndexRange={[40, 10]}>
        <div className="valle-colibri" aria-hidden="true">
          <Colibri size={54} animated={!reducedMotion} className="" />
        </div>
      </Html>
    </group>
  );
}

/* ── Cámara: viaja suavemente hacia el foco (target) cuando cambia de mundo;
      en reposo, deriva muy lento (auto-rotación calma). ── */
function CamaraViajera({ foco, controls, autoOrbit }) {
  useFrame(() => {
    if (!controls.current) return;
    controls.current.target.lerp(new THREE.Vector3(foco.x, foco.y + 0.6, foco.z), 0.06);
    controls.current.update();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableZoom
      minDistance={6}
      maxDistance={22}
      minPolarAngle={0.5}
      maxPolarAngle={1.15}
      autoRotate={autoOrbit}
      autoRotateSpeed={0.35}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

/* ── Contenido de la escena (dentro del Canvas). ── */
function Escena({ clima, focoId, onEntrar, onAlerta, reducedMotion }) {
  const controls = useRef(null);
  const c = CLIMAS[clima];
  const foco = useMemo(() => {
    const m = focoId ? MUNDO_VALLE_BY_ID[focoId] : null;
    if (!m) return new THREE.Vector3(0, 0.3, 0.5);
    const y = alturaTerreno(m.pos[0], m.pos[2]);
    return new THREE.Vector3(m.pos[0], y, m.pos[2]);
  }, [focoId]);
  const autoOrbit = !reducedMotion && !focoId;

  return (
    <>
      <color attach="background" args={[c.cielo[1]]} />
      <fog attach="fog" args={[c.niebla, 9, c.nieblaLejos]} />
      <hemisphereLight intensity={c.intensidad * 0.55} color={c.cielo[0]} groundColor={c.ambiente} />
      <ambientLight intensity={c.intensidad * 0.35} color={c.luz} />
      <directionalLight
        position={[6, 9, 4]}
        intensity={c.intensidad}
        color={c.luz}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      {c.estrellas && (
        <Stars radius={40} depth={20} count={900} factor={3} fade speed={reducedMotion ? 0 : 1} />
      )}

      <Terreno colorBase={clima === 'noche' ? '#22432f' : '#5a8a4a'} />
      <Cordillera color={clima === 'noche' ? '#3a4a63' : c.niebla} />
      <Quebrada color={clima === 'noche' ? '#2a4a6a' : '#5fb2c9'} viva={c.lluviaViva} />

      {MUNDOS_VALLE.map((m) => (
        <MundoLugar
          key={m.id}
          mundo={m}
          activo={focoId === m.id}
          onEntrar={onEntrar}
          reducedMotion={reducedMotion}
        />
      ))}

      <Beacon onAlerta={onAlerta} reducedMotion={reducedMotion} />
      <CompaneroColibri foco={foco} reducedMotion={reducedMotion} />

      <CamaraViajera foco={foco} controls={controls} autoOrbit={autoOrbit} />
      <AdaptiveDpr pixelated />
    </>
  );
}

export default function Valle3D({ clima, focoId, onEntrar, onAlerta, reducedMotion }) {
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`valle-canvas${listo ? ' valle-canvas--listo' : ''}`}
      shadows
      dpr={[1, 1.8]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [9, 8, 11], fov: 42 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Suspense fallback={null}>
        <Escena
          clima={clima}
          focoId={focoId}
          onEntrar={onEntrar}
          onAlerta={onAlerta}
          reducedMotion={reducedMotion}
        />
      </Suspense>
    </Canvas>
  );
}
