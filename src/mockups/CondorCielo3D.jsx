/*
 * CondorCielo3D — EL CIELO DEL PÁRAMO CON SU CÓNDOR (demo del billboard).
 *
 * La demo viva de <CondorBillboard> (src/visual/mundo3d/CondorBillboard.jsx):
 * el cóndor SVG rubber-hose de la casa (Condor.jsx) planeando un cielo 3D de
 * altura — farallones al fondo, niebla que come los lejos y DOS cóndores:
 *   · el PROTAGONISTA en su térmica (modo 'orbita'): círculos pacientes con
 *     banqueo y deriva de altura, siempre presente;
 *   · el COMPAÑERO lejano (modo 'cruce'): atraviesa el cielo y se pierde —
 *     verlo pasar es suerte.
 *
 * La escena es un DECORADO MÍNIMO a propósito (conos lambert + fog): el
 * protagonista es el billboard reutilizable, que cualquier escena real (el
 * bosque, el valle, la sierra) monta con una línea. NO toca EscenaBosqueVivo
 * ni las escenas en vuelo: el cableado a los mundos lo hace Opus después.
 *
 * RENDIMIENTO: cero texturas, cero shadow-map, geometría de decorado O(10)
 * meshes. reducedMotion = cóndor fijo y digno + frameloop a demanda.
 * Archivo nuevo autónomo (su propio <Canvas>). Ruta la cablea Opus (sin auth).
 */
import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import CondorBillboard from '../visual/mundo3d/CondorBillboard.jsx';

/* La luz del páramo a media mañana: cielo alto frío, picos azulosos. */
const CIELO = '#a8cfe4';
const NIEBLA = '#c3dbe8';

/* La cordillera de siluetas: picos que se ALEJAN por tono (la atmósfera hace
   la profundidad, no los polígonos). [x, z, radio, alto, color] */
const PICOS = [
  [-16, -30, 10, 15, '#7fa3b8'],
  [-4, -36, 13, 19, '#8fb2c4'],
  [10, -32, 11, 16, '#7fa3b8'],
  [22, -38, 14, 18, '#97b9ca'],
  [-26, -34, 12, 14, '#97b9ca'],
  [2, -24, 8, 11, '#6d94ab'],
];

function DecoradoParamo() {
  return (
    <group>
      {/* el pajonal: un plano quieto color paja de altura */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshLambertMaterial color="#8a9a6b" />
      </mesh>
      {/* la cordillera al fondo (el fog la funde con el cielo) */}
      {PICOS.map(([x, z, r, h, color], i) => (
        <mesh key={i} position={[x, h / 2 - 0.5, z]}>
          <coneGeometry args={[r, h, 5]} />
          <meshLambertMaterial color={color} />
        </mesh>
      ))}
      {/* el sol pálido de altura */}
      <mesh position={[-14, 22, -34]}>
        <sphereGeometry args={[2.4, 12, 10]} />
        <meshBasicMaterial color="#fff6dd" />
      </mesh>
    </group>
  );
}

/**
 * El mockup standalone: #/mockups/condor-cielo-3d (ruta la cablea Opus).
 * Tier y reduced-motion se detectan aquí, igual que sus pares.
 */
export default function CondorCielo3D() {
  const [listo, setListo] = useState(false);
  const { tier, reducedMotion } = useMemo(() => decidirTier(), []);
  const perfil = perfilDeTier(tier);
  const vivo = !reducedMotion && tier !== 'bajo';

  return (
    <section
      style={{ position: 'fixed', inset: 0, background: CIELO }}
      data-tier={tier}
      aria-label="El cóndor de los Andes planeando el cielo del páramo"
    >
      <style>{CSS_CONDOR_CIELO}</style>
      <Canvas
        className={`cnd-canvas${listo ? ' cnd-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [0, 4.5, 20], fov: 50 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={({ gl }) => {
          gl.setClearColor(CIELO);
          setListo(true);
        }}
      >
        <fog attach="fog" args={[NIEBLA, 26, 68]} />
        <hemisphereLight args={['#eaf6ff', '#6b7a55', 1.05]} />
        <directionalLight position={[-8, 14, 6]} intensity={0.7} color="#fff2d8" />

        <DecoradoParamo />

        {/* EL PROTAGONISTA: la térmica sobre el claro, cerca y legible */}
        <CondorBillboard
          centro={[0, 9.5, -4]}
          radio={9}
          px={96}
          factor={17}
          modo="orbita"
          animated={vivo}
          tier={tier}
        />
        {/* EL COMPAÑERO: cruza altísimo cada tanto y se pierde en la niebla */}
        {vivo && (
          <CondorBillboard
            centro={[0, 16, -18]}
            radio={26}
            px={44}
            factor={26}
            modo="cruce"
            animated
            tier={tier}
          />
        )}

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={10}
          maxDistance={30}
          target={[0, 8, -4]}
          minPolarAngle={0.6}
          maxPolarAngle={1.65}
          minAzimuthAngle={-1.2}
          maxAzimuthAngle={1.2}
          enableDamping
          dampingFactor={0.08}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="cnd-chrome">
        <h2 className="cnd-titulo">
          El cóndor de los Andes
          <small>
            Vultur gryphus — el señor del viento. Casi no aletea: planea las térmicas, y verlo
            cruzar el cielo es saber que el páramo está sano.
          </small>
        </h2>
      </div>
    </section>
  );
}

const CSS_CONDOR_CIELO = `
.cnd-canvas { opacity: 0; transition: opacity 0.6s ease; }
.cnd-canvas--lista { opacity: 1; }
.cnd-chrome {
  position: absolute; left: 0; right: 0; top: 0;
  padding: max(14px, env(safe-area-inset-top)) 18px 0;
  pointer-events: none;
}
.cnd-titulo {
  margin: 0; font-size: 1.15rem; font-weight: 800; color: #1e3442;
  text-shadow: 0 1px 0 rgba(255,255,255,0.35);
}
.cnd-titulo small {
  display: block; margin-top: 4px; max-width: 34rem;
  font-size: 0.8rem; font-weight: 500; line-height: 1.45; color: #2c4a5c;
}
`;
