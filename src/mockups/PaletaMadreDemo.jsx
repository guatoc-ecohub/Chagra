/*
 * PaletaMadreDemo — vitrina mínima del sistema visual madre (paleta/).
 *
 * `paleta/` es una LIBRERÍA (LuzMadre, materialesMadre, paletaMadre): no trae
 * su propia demo porque su trabajo es vestir OTROS mundos, no lucirse sola.
 * Para que la integración 3D no deje este módulo sin puerta de entrada, esta
 * vitrina monta exactamente lo que describe `paleta/GUIA.md` §3 (escena
 * standalone con `<LuzMadre>`) y pone en fila las 9 recetas de
 * `materialesMadre.RECETAS` para que se vean, con nombre, una al lado de otra.
 *
 * Cero geometría propia inventada: esferas simples, la luz y los materiales
 * SON el contenido — que es exactamente lo que este módulo aporta.
 */
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import { LuzMadre, CIELOS, mezclarCielo, RECETAS, crearMaterialMadre } from '../visual/mundo3d/paleta';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';

const NOMBRES = Object.keys(RECETAS);

function Muestra({ nombre, perfil, x }) {
  const mat = useMemo(() => crearMaterialMadre(nombre, perfil), [nombre, perfil]);
  return (
    <group position={[x, 0, 0]}>
      <mesh material={mat} castShadow={perfil.sombras} receiveShadow={perfil.sombras}>
        <sphereGeometry args={[0.42, perfil.materialRico ? 24 : 12, perfil.materialRico ? 16 : 8]} />
      </mesh>
      <Html position={[0, -0.7, 0]} center zIndexRange={[10, 0]}>
        <span
          style={{
            font: '600 0.7rem/1 system-ui, sans-serif',
            color: '#2c2418',
            background: 'rgba(255,250,240,0.82)',
            padding: '0.15rem 0.4rem',
            borderRadius: '0.4rem',
            whiteSpace: 'nowrap',
          }}
        >
          {nombre}
        </span>
      </Html>
    </group>
  );
}

function Escena({ perfil }) {
  const cielo = useMemo(() => mezclarCielo(CIELOS.ladera), []);
  const ancho = (NOMBRES.length - 1) * 1.05;
  return (
    <>
      <color attach="background" args={[cielo.fondo]} />
      {perfil.fog && <fog attach="fog" args={[cielo.niebla, 8, 26]} />}
      <LuzMadre cielo={CIELOS.ladera} perfil={perfil} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} receiveShadow={perfil.sombras}>
        <planeGeometry args={[ancho + 2, 4]} />
        <meshLambertMaterial color={cielo.suelo} />
      </mesh>
      {NOMBRES.map((nombre, i) => (
        <Muestra key={nombre} nombre={nombre} perfil={perfil} x={i * 1.05 - ancho / 2} />
      ))}
    </>
  );
}

/**
 * Vitrina de `paleta/`: las 9 recetas de material madre, iluminadas por
 * `<LuzMadre>`, giratorias con OrbitControls.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} [props]
 */
export default function PaletaMadreDemo({ tier: tierProp, reducedMotion: rmProp } = {}) {
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? auto.tier;
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        shadows={perfil.sombras}
        dpr={[1, perfil.materialRico ? 2 : 1.5]}
        camera={{ position: [0, 0.6, 4.4], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <AdaptiveDpr pixelated={false} />
        <Escena perfil={perfil} />
        <OrbitControls
          enablePan={false}
          minDistance={2.5}
          maxDistance={7}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.6}
        />
      </Canvas>
      <div
        style={{
          position: 'absolute', left: '0.9rem', bottom: '0.9rem',
          font: '600 0.75rem/1.3 system-ui, sans-serif', color: '#e9efdd',
          background: 'rgba(14,12,9,0.6)', padding: '0.5rem 0.7rem', borderRadius: '0.6rem',
          backdropFilter: 'blur(4px)', maxWidth: '18rem',
        }}
      >
        La paleta visual madre de Chagra: 9 recetas, una sola fuente de luz.
      </div>
    </div>
  );
}
