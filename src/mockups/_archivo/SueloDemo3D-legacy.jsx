/*
 * SueloDemo3D — la escena de prueba del SUELO calibre Switch.
 *
 * Un pedazo de páramo a la hora dorada donde el terreno ES el protagonista:
 * lomos y hondonadas de fbm, color por zona (musgo húmedo abajo, paja dorada
 * en los lomos, roca asomando en la pendiente), un trillo que serpentea con
 * lajas, y el detalle al ras (piedras, matas de paja, raíces, florecitas) con
 * su sombra de contacto. Unos frailejones señalan la escala.
 *
 * Ruta #/mockups/suelo-demo-3d, sin auth. Vistas deterministas para capturas
 * (el parámetro va en el SEARCH, no en el hash — el router de mockups compara
 * el hash exacto): /?vista=aerea#/mockups/suelo-demo-3d
 *   vista = paseo (default: la cámara recorre) | aerea | sendero | cerca | ladera
 *
 * Tier-safe vía decidirTier/perfilDeTier; con reducedMotion monta quieta.
 */
import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { decidirTier, permite3D, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { crearSueloRico, geomPiedraSuelo, distribuirDetalle } from '../visual/mundo3d/terreno/sueloRico.geom.js';
import SueloRico, { Instancias } from '../visual/mundo3d/terreno/SueloRico.jsx';
import { geomCieloDomo } from '../visual/mundo3d/vitrina/miradorAndino.geom.js';
import { geomFrailejon, calidadDeTier } from '../visual/mundo3d/bosque/floraParamo.geom.js';

/* Luz de páramo a la hora dorada (cielo del domo del mirador). */
const LUZ = { niebla: '#ddc9a2', sol: '#ffe8bd', cielo: '#dfe6df', suelo: '#4a4634' };

/* Las vistas fijas (para capturas deterministas de cerca y de lejos). */
const VISTAS = {
  aerea: { pos: [11, 13, 15], mira: [0, 0, 0] },
  sendero: { pos: [0.9, 1.9, 13.2], mira: [-0.6, 0.2, 4] },
  cerca: { pos: [3.1, 1.0, 6.2], mira: [0.9, 0.3, 3.4] },
  ladera: { pos: [-10, 3.2, 8], mira: [2, 0.6, -4] },
};

function vistaDeHash() {
  if (typeof window === 'undefined') return 'paseo';
  const m = /[?&]vista=([a-z]+)/.exec(window.location.search || '');
  return m && (VISTAS[m[1]] || m[1] === 'paseo') ? m[1] : 'paseo';
}

/* El paseo: la cámara sube a ver los lomos y baja al ras del trillo. */
function CamaraPaseo({ activa }) {
  const mira = useRef(new THREE.Vector3());
  useFrame((state) => {
    if (!activa) return;
    const t = state.clock.elapsedTime * 0.09;
    const r = 10.5 + Math.sin(t * 0.63) * 4.6;
    const y = 1.4 + (Math.sin(t * 1.21) + 1) * 1.9;
    state.camera.position.set(Math.cos(t) * r, y, Math.sin(t) * r);
    mira.current.set(Math.cos(t + 1.4) * 1.6, 0.35, Math.sin(t + 1.4) * 1.6);
    state.camera.lookAt(mira.current);
  });
  return null;
}

function Diorama({ tier, reducedMotion, vista }) {
  const perfil = perfilDeTier(tier);

  // EL SUELO: trillo en S que baja del lomo, cruza el claro y sigue de largo.
  const suelo = useMemo(
    () =>
      crearSueloRico({
        tam: 68,
        seed: 20,
        amplitud: 1.8,
        micro: 0.16,
        claro: { radio: 2.6, transicion: 7 },
        falda: { inicio: 18, fin: 30, altura: 3.2 },
        sendero: {
          puntos: [
            [1.8, 15],
            [0.2, 11],
            [-1.5, 7.5],
            [-0.4, 4],
            [0.6, 1.2],
            [0, -1.8],
            [-1.9, -5],
            [-3.4, -9],
            [-6, -13],
          ],
          ancho: 1.15,
        },
      }),
    [],
  );

  const cielo = useMemo(() => geomCieloDomo(58), []);

  // Frailejones de escala junto al claro, POSADOS en el relieve.
  const frailejones = useMemo(() => {
    const geo = geomFrailejon({ flor: true, q: calidadDeTier(tier) }, 12);
    const lugares = [
      [2.1, -0.9, 1.15],
      [-1.7, 1.4, 0.95],
      [2.9, 2.2, 1.3],
      [-2.6, -2.1, 1.05],
      [0.9, -3.1, 0.85],
      [-4.4, 3.6, 1.2],
    ];
    const items = lugares.map(([x, z, escala], i) => ({
      pos: [x, suelo.alturaDe(x, z), z],
      rotY: i * 1.7,
      escala,
      tint: [1, 1, 1],
    }));
    return { geo, items };
  }, [tier, suelo]);

  const matFrailejon = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.9, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  const anclas = useMemo(
    () => frailejones.items.map((it) => ({ x: it.pos[0], z: it.pos[2], radio: 0.85 * it.escala })),
    [frailejones],
  );

  // Peñas: rocas GRANDES de hito (la silueta que se recorta contra la niebla),
  // sembradas con la misma API de detalle — prueba de reuso del sistema.
  const penas = useMemo(() => {
    const geo = geomPiedraSuelo(suelo.opts.seed + 777, suelo.opts.paleta);
    const items = distribuirDetalle(suelo, 5, {
      seed: 99, rMin: 9, rMax: 20, eMin: 2.4, eMax: 4.2, evitaSendero: 1.6, hundir: 0.1,
    });
    return { geo, items };
  }, [suelo]);

  const fija = VISTAS[vista];

  return (
    <>
      <color attach="background" args={[LUZ.niebla]} />
      {perfil.fog && <fog attach="fog" args={[LUZ.niebla, 16, 52]} />}

      <hemisphereLight intensity={0.85} color={LUZ.cielo} groundColor={LUZ.suelo} />
      <ambientLight intensity={0.28} color="#e8dcc4" />
      <directionalLight
        position={[14, 9, 6]}
        intensity={1.35}
        color={LUZ.sol}
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />
      <directionalLight position={[-8, 5, -7]} intensity={0.3} color="#b9cdd6" />

      <mesh geometry={cielo}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} />
      </mesh>

      <SueloRico suelo={suelo} tier={tier} anclas={anclas} segmentos={tier === 'alto' ? 96 : undefined} />
      <Instancias geo={frailejones.geo} mat={matFrailejon} items={frailejones.items} castShadow={perfil.sombras} />
      <Instancias geo={penas.geo} mat={matFrailejon} items={penas.items} castShadow={perfil.sombras} />

      {vista === 'paseo' && !reducedMotion ? (
        <CamaraPaseo activa />
      ) : (
        <OrbitControls
          makeDefault
          target={fija ? fija.mira : [0, 0.4, 0]}
          enablePan={false}
          minDistance={2.5}
          maxDistance={30}
          maxPolarAngle={1.52}
          enableDamping
          dampingFactor={0.08}
        />
      )}
      <AdaptiveDpr pixelated />
    </>
  );
}

export default function SueloDemo3D() {
  const [{ tier, reducedMotion }] = useState(() => decidirTier());
  const vista = useMemo(() => vistaDeHash(), []);
  const perfil = perfilDeTier(tier);

  if (!permite3D(tier)) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#4a4634' }}>
        <p>Este equipo no alcanza para la demo 3D del suelo.</p>
      </div>
    );
  }

  const fija = VISTAS[vista];
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        shadows={perfil.sombras ? 'soft' : false}
        camera={{ position: fija ? fija.pos : [11, 6, 13], fov: 46 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <Diorama tier={tier} reducedMotion={reducedMotion} vista={vista} />
      </Canvas>
    </div>
  );
}
