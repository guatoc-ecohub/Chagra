/*
 * EscenaBosqueVivo — el MUNDO donde vive el Ent de la queñua.
 *
 * Un claro del páramo alto: luz fría y difusa, niebla que come el fondo, suelo
 * de musgo y frailejones lejanos que sitúan el ecosistema (contexto, NO el
 * personaje: el guardián es la queñua). La cámara mira al árbol un poco DESDE
 * ABAJO para que se lea imponente. Se puede girar con el dedo.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`/`paramsDeTier`:
 * 'alto' con sombras + niebla + facetado; 'medio' frugal; 'bajo' mínimo. Con
 * `reducedMotion` el mundo monta QUIETO (frameloop a demanda).
 *
 * Importa three/@react-three → montar SOLO perezosa (lazy) desde el host.
 */
import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { paramsDeTier } from './entQuenua.geom.js';
import EntQuenua from './EntQuenua.jsx';

/* Cielo del páramo: gris-azul frío, alto y húmedo. */
const PARAMO = { fondo: '#c3cfce', niebla: '#c9d3d1', suelo: '#4b5340', musgo: '#5c6844' };

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

function Diorama({ tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  const P = paramsDeTier(tier);

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

      {frailejones.map((f) => (
        <Frailejon key={f.key} pos={f.pos} alto={f.alto} />
      ))}
      {pajas.map((p) => (
        <Paja key={p.key} pos={p.pos} />
      ))}

      {/* EL GUARDIÁN */}
      <EntQuenua tier={tier} reducedMotion={reducedMotion} />

      <OrbitControls
        makeDefault
        target={[0, 3.2, 0]}
        enablePan={false}
        enableZoom
        minDistance={7}
        maxDistance={20}
        minPolarAngle={0.55}
        maxPolarAngle={1.5}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.16}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo Bosque Vivo con el Ent de la queñua. Montar SOLO perezosa.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function EscenaBosqueVivo({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`bviva-canvas${listo ? ' bviva-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [1.5, 2.3, 12.5], fov: 44 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
