/*
 * HolaChagraEscena3D — la ESCENA 3D del momento «hola, Chagra»
 * (mockup #/mockups/hola-chagra-3d).
 *
 * NO redibuja el mundo: COMPONE el valle real de Valle3D (Terreno, Cordillera,
 * Quebrada, LandmarkGeom, Veleta, alturaTerreno — exports nombrados) con una
 * coreografía distinta. Aquí el valle no es un menú de lugares tocables: es el
 * mundo EN REPOSO que despierta cuando el campesino le habla. "Menos colapso":
 * cero POIs, cero paneles dentro del canvas — una sola cosa pasa a la vez.
 *
 *   · reposo    → la cámara deriva lentísimo (auto-órbita), la abeja angelita
 *                 (visual-lib/creatures) dormita posada sobre la huerta.
 *   · despierta → la abeja se aviva y VUELA al centro del valle; la cámara se
 *                 acerca (dolly suave) y una luz cálida se enciende donde la
 *                 voz va a tomar forma (el IrisVoz vive en el DOM, encima).
 *
 * Reglas de la casa: mismo presupuesto que Valle3D (chunk perezoso de
 * three/fiber/drei, geometría procedural, AdaptiveDpr) y reducedMotion
 * congela vaivén/vuelo a un fotograma digno (la abeja aparece en su destino).
 */
import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Stars, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { AbejaAngelita } from '../../visual/creatures/AbejaAngelita.jsx';
import {
  Terreno,
  Cordillera,
  Quebrada,
  LandmarkGeom,
  Veleta,
} from './Valle3D';
import { MUNDOS_VALLE, CLIMAS, alturaTerreno } from './valleData';

/* El centro del valle: donde la voz toma forma (el iris DOM queda encima). */
const CENTRO = new THREE.Vector3(0, 0.6, 0.5);

/* ── Los lugares del valle como PAISAJE (sin botones): la misma geometría de
      Valle3D, pero aquí nadie navega — el mundo solo ESTÁ, vivo. ── */
function Lugares({ reducedMotion }) {
  return (
    <group>
      {MUNDOS_VALLE.map((m) => {
        const y = alturaTerreno(m.pos[0], m.pos[2]);
        return (
          <group key={m.id} position={[m.pos[0], y, m.pos[2]]} scale={m.escala}>
            {m.tipo === 'veleta' ? (
              <Veleta color={m.tinte[0]} reducedMotion={reducedMotion} />
            ) : (
              <LandmarkGeom tipo={m.tipo} tinte={m.tinte} />
            )}
          </group>
        );
      })}
    </group>
  );
}

/* ── La abeja angelita EN el mundo: dormita posada junto a la huerta; al
      despertar vuela (lerp con bob de aleteo) hasta el centro del valle.
      El cuerpo es el SVG canónico de creatures (cero redibujo). ── */
function Abeja3D({ despierta, reducedMotion }) {
  const ref = useRef(/** @type {any} */ (null));
  const percha = useMemo(() => {
    const m = MUNDOS_VALLE.find((x) => x.id === 'sanidad') || MUNDOS_VALLE[0];
    const y = alturaTerreno(m.pos[0], m.pos[2]);
    return new THREE.Vector3(m.pos[0] + 0.35, y + 0.85, m.pos[2] + 0.3);
  }, []);
  const destinoCentro = useMemo(
    () => new THREE.Vector3(CENTRO.x, CENTRO.y + 1.9, CENTRO.z + 0.4),
    [],
  );
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const destino = despierta ? destinoCentro : percha;
    if (reducedMotion) {
      ref.current.position.copy(destino);
      return;
    }
    // Bob: dormida apenas respira; despierta zumba más vivo.
    const bob = Math.sin(t * (despierta ? 2.6 : 1.1)) * (despierta ? 0.12 : 0.04);
    ref.current.position.lerp(
      new THREE.Vector3(destino.x, destino.y + bob, destino.z),
      0.035,
    );
  });
  return (
    <group ref={ref} position={[percha.x, percha.y, percha.z]}>
      <Html center distanceFactor={9} zIndexRange={[40, 10]}>
        <div
          className={`hc3d-abeja${despierta ? ' hc3d-abeja--despierta' : ''}`}
          aria-hidden="true"
        >
          <AbejaAngelita
            size={62}
            animated={!reducedMotion}
            animo={despierta ? 'pleno' : 'descansa'}
            energia={despierta ? 1 : 0.5}
          />
        </div>
      </Html>
    </group>
  );
}

/* ── La luz de la escucha: cuando el mundo despierta, una luz cálida (miel,
      la misma familia del iris) se enciende sobre el centro — el valle
      "mira" hacia donde la voz está tomando forma. ── */
function LuzEscucha({ despierta, reducedMotion }) {
  const ref = useRef(/** @type {any} */ (null));
  useFrame((state) => {
    if (!ref.current) return;
    const objetivo = despierta ? 2.6 : 0;
    ref.current.intensity += (objetivo - ref.current.intensity) * 0.05;
    if (despierta && !reducedMotion) {
      ref.current.intensity += Math.sin(state.clock.elapsedTime * 2.1) * 0.04;
    }
  });
  return (
    <pointLight
      ref={ref}
      position={[CENTRO.x, CENTRO.y + 1.6, CENTRO.z]}
      color="#ffd9a0"
      intensity={0}
      distance={9}
    />
  );
}

/* ── Cámara guionada: en reposo deriva (auto-órbita calma); al despertar la
      deriva PARA y la cámara se acerca al centro (dolly suave) — entrar al
      momento, no solo mirarlo. Sin zoom/pan del usuario: es un rito corto. ── */
function CamaraGuionada({ despierta, reducedMotion }) {
  const controls = useRef(/** @type {any} */ (null));
  useFrame((state) => {
    const c = controls.current;
    if (!c) return;
    c.target.lerp(CENTRO, 0.05);
    const cam = state.camera;
    const dist = cam.position.distanceTo(c.target);
    const deseada = despierta ? 8.6 : 11.5;
    if (dist > 0.001) {
      const nueva = reducedMotion ? deseada : dist + (deseada - dist) * 0.035;
      cam.position.sub(c.target).multiplyScalar(nueva / dist).add(c.target);
    }
    c.update();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableZoom={false}
      minPolarAngle={0.5}
      maxPolarAngle={1.15}
      autoRotate={!reducedMotion && !despierta}
      autoRotateSpeed={0.3}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

/* ── Contenido de la escena (dentro del Canvas): el MISMO ambiente de Valle3D
      (clima → cielo/niebla/luces/estrellas) + la coreografía del despertar. ── */
function Escena({ clima, despierta, reducedMotion }) {
  const c = CLIMAS[clima];
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
      <Quebrada color={clima === 'noche' ? '#2a4a6a' : '#5fb2c9'} viva={!!c.lluviaViva} />
      <Lugares reducedMotion={reducedMotion} />

      <LuzEscucha despierta={despierta} reducedMotion={reducedMotion} />
      <Abeja3D despierta={despierta} reducedMotion={reducedMotion} />

      <CamaraGuionada despierta={despierta} reducedMotion={reducedMotion} />
      <AdaptiveDpr pixelated />
    </>
  );
}

export default function HolaChagraEscena3D({ clima, despierta, reducedMotion }) {
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
        <Escena clima={clima} despierta={despierta} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  );
}
