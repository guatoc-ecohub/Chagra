/*
 * EscenaBosqueVivo — la ENTRADA al mundo del Ent: el LANDMARK del páramo.
 *
 * Un claro del páramo alto donde el Ent de la queñua se ve DESDE LEJOS, entre la
 * niebla, como un hito que invita a acercarse (el árbol que distingue a este
 * mundo, a lo Zelda/Odyssey). La cámara LLEGA: arranca lejos y baja despacio
 * hasta el claro; al terminar, el visitante queda al mando (girar con el dedo).
 *
 * El paisaje lo sitúa sin robarle el foco: luz fría y difusa, niebla que come el
 * fondo, suelo de musgo, frailejones y un queñual de siluetas menores que hace
 * ver al guardián como EL árbol mayor. Entre sus raíces respira un resplandor
 * verde-agua: la primera seña de la red micorrízica que se puede ir a ver al
 * microsuelo (la elección vive en el host del mundo, no aquí).
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`/`paramsDeTier`:
 * 'alto' con sombras + niebla + facetado; 'medio' frugal; 'bajo' mínimo. Con
 * `reducedMotion` el mundo monta QUIETO y ya llegado (sin viaje de cámara).
 *
 * Importa three/@react-three → montar SOLO perezosa (lazy) desde el host.
 */
import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import { paramsDeTier } from './entQuenua.geom.js';
import EntQuenua from './EntQuenua.jsx';

/* Cielo del páramo: gris-azul frío, alto y húmedo. */
const PARAMO = { fondo: '#c3cfce', niebla: '#c9d3d1', suelo: '#4b5340', musgo: '#5c6844' };

/* El verde-agua de la red micorrízica (mismo acento que el mundo del microsuelo). */
const RED = '#37d6b0';

/* LA LLEGADA: de la loma lejana (el Ent chiquito en la niebla) al claro. */
const CAM_LEJOS = new THREE.Vector3(4.6, 1.1, 26);
const CAM_CERCA = new THREE.Vector3(1.5, 2.3, 12.5);
const MIRADA = new THREE.Vector3(0, 3.2, 0);
const DUR_LLEGADA = 5.2; // segundos de caminata de cámara

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Un frailejón lejano (Espeletia): tronco peludo pálido + roseta plateada. Es
   PAISAJE de páramo, no el guardián — por eso va simple y al fondo. */
function Frailejon({ pos, alto = 1.1 }) {
  return (
    <group position={pos}>
      <mesh position={[0, alto * 0.5, 0]}>
        <cylinderGeometry args={[0.11, 0.16, alto, 7]} />
        <meshLambertMaterial color="#8f8b6f" />
      </mesh>
      <mesh position={[0, alto, 0]}>
        <sphereGeometry args={[0.34, 8, 6]} />
        <meshLambertMaterial color="#9db183" />
      </mesh>
      <mesh position={[0, alto + 0.12, 0]}>
        <coneGeometry args={[0.3, 0.4, 8]} />
        <meshLambertMaterial color="#aebd97" />
      </mesh>
    </group>
  );
}

/* Mata de paja del páramo: unos conos finos dorado-verdosos. */
function Paja({ pos }) {
  return (
    <group position={pos}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[(i - 1.5) * 0.05, 0.2, 0]} rotation={[0, 0, (i - 1.5) * 0.12]}>
          <coneGeometry args={[0.03, 0.42, 4]} />
          <meshLambertMaterial color={i % 2 ? '#8a7d47' : '#6f7c48'} />
        </mesh>
      ))}
    </group>
  );
}

/* Una queñua MENOR del queñual: silueta simple (tronco torcido + copitas) que la
   niebla apaga. Su oficio es de escala: junto a ellas, el Ent se lee como el
   ÁRBOL MAYOR del bosque — el landmark. Nada de rostro ni detalle: son coro. */
function QuenuaLejana({ pos, escala, giro, tono }) {
  const tronco = tono ? '#87675a' : '#7a5c50';
  const copa = tono ? '#75846a' : '#6b7a5f';
  return (
    <group position={pos} scale={escala} rotation={[0, giro, 0]}>
      <mesh position={[0, 1.0, 0]} rotation={[0, 0, 0.16]}>
        <cylinderGeometry args={[0.09, 0.2, 2.1, 6]} />
        <meshLambertMaterial color={tronco} />
      </mesh>
      <mesh position={[0.3, 2.05, 0]} scale={[1.15, 0.8, 1]}>
        <sphereGeometry args={[0.62, 7, 6]} />
        <meshLambertMaterial color={copa} flatShading />
      </mesh>
      <mesh position={[-0.28, 1.7, 0.1]} scale={[0.9, 0.65, 0.9]}>
        <sphereGeometry args={[0.5, 7, 6]} />
        <meshLambertMaterial color={tono ? '#7d8c72' : copa} flatShading />
      </mesh>
    </group>
  );
}

/* El RESPLANDOR de las raíces: un aliento verde-agua que respira entre el musgo,
   la primera seña de la red micorrízica de abajo (invita a bajar al microsuelo). */
function ResplandorRaices({ reducedMotion }) {
  const matHalo = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: RED, transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    [],
  );
  const matChispa = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: RED, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    [],
  );
  useFrame((st) => {
    if (reducedMotion) return;
    const t = st.clock.elapsedTime;
    matHalo.opacity = 0.11 + (Math.sin(t * 0.6) * 0.5 + 0.5) * 0.09; // respira lento
    matChispa.opacity = 0.55 + (Math.sin(t * 0.9 + 1.3) * 0.5 + 0.5) * 0.35;
  });
  const chispas = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2 + r() * 0.9;
      const rad = 1.15 + r() * 0.75;
      return { key: i, pos: [Math.cos(a) * rad, 0.05 + r() * 0.08, Math.sin(a) * rad], esc: 0.03 + r() * 0.025 };
    });
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} material={matHalo}>
        <circleGeometry args={[2.0, 26]} />
      </mesh>
      {chispas.map((c) => (
        <mesh key={c.key} position={c.pos} scale={c.esc} material={matChispa}>
          <octahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  );
}

/* La cámara que LLEGA: desde lejos (el hito en la niebla) hasta el claro, con
   freno suave. Al terminar le entrega el mando a los OrbitControls. */
function LlegadaCamara({ activa, alTerminar }) {
  const inicio = useRef(null);
  useFrame((st) => {
    if (!activa) return;
    if (inicio.current == null) inicio.current = st.clock.elapsedTime;
    const t = Math.min(1, (st.clock.elapsedTime - inicio.current) / DUR_LLEGADA);
    const e = 1 - (1 - t) ** 3; // ease-out cúbico: entra caminando, llega frenando
    st.camera.position.lerpVectors(CAM_LEJOS, CAM_CERCA, e);
    st.camera.lookAt(MIRADA);
    if (t >= 1) alTerminar();
  });
  return null;
}

function Diorama({ tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  const P = paramsDeTier(tier);
  // La llegada solo corre si hay movimiento; con reducedMotion ya se montó cerca.
  const [llegando, setLlegando] = useState(!reducedMotion);

  const frailejones = useMemo(() => {
    const r = rng(101);
    return Array.from({ length: P.frailejones }, (_, i) => {
      const a = (i / Math.max(1, P.frailejones)) * Math.PI * 2 + r() * 0.6;
      const rad = 5.5 + r() * 3;
      return { key: `fr-${i}`, pos: [Math.cos(a) * rad, 0, Math.sin(a) * rad - 1], alto: 0.8 + r() * 0.8 };
    });
  }, [P.frailejones]);

  const pajas = useMemo(() => {
    if (tier === 'bajo') return [];
    const r = rng(202);
    const n = tier === 'alto' ? 26 : 14;
    return Array.from({ length: n }, (_, i) => {
      const a = r() * Math.PI * 2;
      const rad = 1.6 + r() * 4;
      return { key: `pj-${i}`, pos: [Math.cos(a) * rad, 0, Math.sin(a) * rad] };
    });
  }, [tier]);

  // El queñual menor: siluetas al fondo y a los lados (nunca delante del Ent).
  const quenual = useMemo(() => {
    const n = tier === 'alto' ? 8 : tier === 'medio' ? 5 : 3;
    const r = rng(303);
    return Array.from({ length: n }, (_, i) => {
      // arco trasero: de -200° a +20° aprox, dejando libre el frente (+Z)
      const a = Math.PI * 0.62 + (i / Math.max(1, n - 1)) * Math.PI * 1.24 + (r() - 0.5) * 0.24;
      const rad = 9.5 + r() * 6;
      return {
        key: `qn-${i}`,
        pos: [Math.cos(a) * rad, 0, Math.sin(a) * rad],
        escala: 1.5 + r() * 1.1,
        giro: r() * Math.PI * 2,
        tono: i % 2 === 0,
      };
    });
  }, [tier]);

  return (
    <>
      <color attach="background" args={[PARAMO.fondo]} />
      {perfil.fog && <fog attach="fog" args={[PARAMO.niebla, 9, 34]} />}

      {/* luz de páramo: cielo frío, sol tenue y velado */}
      <hemisphereLight intensity={0.95} color="#d7e2e4" groundColor="#3a3a2c" />
      <ambientLight intensity={0.35} color="#cdd7da" />
      <directionalLight
        position={[6, 11, 5]}
        intensity={1.15}
        color="#eef3f0"
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={10}
        shadow-camera-bottom={-4}
      />
      {/* contraluz frío que separa la copa de la niebla */}
      <directionalLight position={[-5, 6, -6]} intensity={0.4} color="#b9cdd6" />

      {/* suelo de musgo del páramo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[32, 40]} />
        <meshLambertMaterial color={PARAMO.suelo} />
      </mesh>
      {/* parche de musgo húmedo bajo el árbol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[3.4, 28]} />
        <meshLambertMaterial color={PARAMO.musgo} />
      </mesh>
      {/* sombra de contacto suave (barata, en todos los tiers) */}
      {perfil.sombrasContacto && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[1.6, 24]} />
          <meshBasicMaterial color="#2c3324" transparent opacity={0.4} />
        </mesh>
      )}

      {/* colinas lejanas que se pierden en la niebla */}
      <mesh position={[-9, 0.5, -12]} scale={[6, 2.4, 4]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#59654b" />
      </mesh>
      <mesh position={[10, 0.4, -14]} scale={[7, 2.1, 4]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#515e46" />
      </mesh>

      {/* el queñual menor: el coro que hace ver al Ent como el árbol mayor */}
      {quenual.map((q) => (
        <QuenuaLejana key={q.key} pos={q.pos} escala={q.escala} giro={q.giro} tono={q.tono} />
      ))}

      {frailejones.map((f) => (
        <Frailejon key={f.key} pos={f.pos} alto={f.alto} />
      ))}
      {pajas.map((p) => (
        <Paja key={p.key} pos={p.pos} />
      ))}

      {/* EL GUARDIÁN — el landmark de este mundo */}
      <EntQuenua tier={tier} reducedMotion={reducedMotion} />

      {/* el aliento de la red bajo sus raíces (la seña hacia el microsuelo) */}
      <ResplandorRaices reducedMotion={reducedMotion} />

      {/* la llegada al claro; después, el visitante manda */}
      <LlegadaCamara activa={llegando} alTerminar={() => setLlegando(false)} />
      <OrbitControls
        makeDefault
        enabled={!llegando}
        target={[0, 3.2, 0]}
        enablePan={false}
        enableZoom
        minDistance={7}
        maxDistance={20}
        minPolarAngle={0.55}
        maxPolarAngle={1.5}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion && !llegando}
        autoRotateSpeed={0.16}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * La entrada al mundo del Ent (Bosque Vivo): el landmark del páramo. Montar
 * SOLO perezosa.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function EscenaBosqueVivo({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  // Con reducedMotion se monta YA LLEGADO; si no, lejos (la cámara camina sola).
  const camInicial = reducedMotion
    ? [CAM_CERCA.x, CAM_CERCA.y, CAM_CERCA.z]
    : [CAM_LEJOS.x, CAM_LEJOS.y, CAM_LEJOS.z];
  return (
    <Canvas
      className={`bviva-canvas${listo ? ' bviva-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: camInicial, fov: 44 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
