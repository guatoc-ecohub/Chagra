/*
 * ArtesaniaKitDemo — vitrina mínima del kit de artesanía andina 3D (artesania/).
 *
 * `artesania/` (ArtesaniaKit.jsx) es una LIBRERÍA de piezas reutilizables
 * (cerca, poste, panel, vasija, canasto, cuerda) pensadas para vestir OTROS
 * mundos — no trae su propia demo. Esta vitrina monta el ejemplo tal cual
 * viene documentado en `artesania/GUIA.md` §"Uso 3D": un rincón de finca con
 * la cerca tejida, un poste con amarra, el panel de telar con una etiqueta
 * adentro, la vasija de chamba y el canasto de fique, cosidos con una cuerda.
 *
 * No confundir con `src/mockups/ArtesaniaAndinaDemo.jsx`: esa es una demo
 * MÁS VIEJA de un módulo hermano 2D/SVG (`artesaniaAndina.js`, torneado por
 * lathe) que ya tenía su propia ruta. Este es el kit NUEVO (D3, cestería/
 * fique/guadua/loza como piezas r3f componibles).
 */
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import { LuzMadre, CIELOS, mezclarCielo } from '../visual/mundo3d/paleta';
import {
  CercaTejida, PosteGuadua, CuerdaFique, PanelArtesanal, VasijaChamba, CanastoAndino,
} from '../visual/mundo3d/artesania';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';

function Escena({ perfil }) {
  const cielo = useMemo(() => mezclarCielo(CIELOS.ladera), []);
  return (
    <>
      <color attach="background" args={[cielo.fondo]} />
      {perfil.fog && <fog attach="fog" args={[cielo.niebla, 10, 30]} />}
      <LuzMadre cielo={CIELOS.ladera} perfil={perfil} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow={perfil.sombras}>
        <planeGeometry args={[9, 6]} />
        <meshLambertMaterial color={cielo.suelo} />
      </mesh>

      {/* La cerca campesina, corriendo por el frente. */}
      <CercaTejida largo={5} postes={5} perfil={perfil} position={[-1.5, 0, 1.6]} />

      {/* Un poste suelto con su amarra en la cabeza. */}
      <PosteGuadua alto={1.1} conAmarra perfil={perfil} position={[2.6, 0, 1.2]} />

      {/* El panel de telar, con una etiqueta adentro (letrero del mundo). */}
      <PanelArtesanal ancho={1.6} alto={1} perfil={perfil} position={[-2, 0.9, -0.6]}>
        <Html center zIndexRange={[10, 0]}>
          <span
            style={{
              font: '700 0.72rem/1.2 system-ui, sans-serif', color: '#2c2418',
              textAlign: 'center', whiteSpace: 'nowrap',
            }}
          >
            Piso templado
          </span>
        </Html>
      </PanelArtesanal>

      {/* La loza y el canasto, sobre el mismo suelo. */}
      <VasijaChamba nombre="cantaro" alto={0.5} perfil={perfil} position={[0.4, 0, -1.1]} />
      <CanastoAndino alto={0.4} radio={0.34} perfil={perfil} position={[1.3, 0, -0.6]} />

      {/* La cuerda cosiendo panel y poste, como haría en cualquier mundo. */}
      <CuerdaFique de={[-1.2, 1.1, -0.6]} a={[2.6, 1.55, 1.2]} perfil={perfil} />
    </>
  );
}

/**
 * Vitrina de `artesania/`: cerca, poste, panel, loza, canasto y cuerda —
 * el ejemplo de GUIA.md, montado y girable.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} [props]
 */
export default function ArtesaniaKitDemo({ tier: tierProp, reducedMotion: rmProp } = {}) {
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? auto.tier;
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        shadows={perfil.sombras}
        dpr={[1, perfil.materialRico ? 2 : 1.5]}
        camera={{ position: [0.3, 1.6, 5.6], fov: 44 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <AdaptiveDpr pixelated={false} />
        <Escena perfil={perfil} />
        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={9}
          target={[0, 0.6, 0]}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.5}
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
        El lenguaje de la mano campesina: cesteria, fique, guadua y loza.
      </div>
    </div>
  );
}
