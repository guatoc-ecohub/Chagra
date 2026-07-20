/*
 * EscenaYucaViva — el MUNDO donde vive la yuca (clima medio, 0–2.000 m).
 *
 * Una loma templada EN LA HORA VIVA DEL VALLE: la atmósfera la pone el kit
 * compartido (`AtmosferaMundo`, familia `corral` — la tarde de finca del piso
 * cálido), y el yucal amanece y anochece CON el valle. Aquí NO manda la bruma
 * (eso es del papal frío): manda la LUZ HORIZONTAL de clima medio, que entra
 * rasante y le saca el relieve a lo que este mundo vino a contar.
 *
 * Y lo que vino a contar es EL ARRANQUE. La yuca no se explica con la mata: se
 * explica con el momento en que la tierra suelta el racimo. Por eso la escena
 * está compuesta al revés de lo habitual — el claro de la cosecha va ADELANTE,
 * pegado a la cámara, y el cultivo queda DETRÁS haciéndole de telón. Un yucal
 * bien sembrado es un bosquecito de tallos pelados y anillados con el follaje
 * arriba no más; eso es el fondo, no el sujeto.
 *
 * El resto del lote cuenta la vuelta completa del cultivo: el SEMILLERO de
 * estacas inclinadas a un lado (la yuca se siembra por tallo, no por semilla),
 * el plátano de los bordes y el maíz intercalado (parcela asociada, que de eso
 * come la casa), y arriba al fondo la casita con su canasto.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`: 'alto' con
 * sombras; 'medio' frugal; 'bajo' mínimo. Con `reducedMotion` el mundo monta
 * QUIETO (frameloop a demanda). La fauna son los SVG rubber-hose de la casa como
 * billboards (`Fauna`): las mariposas del clima medio.
 *
 * `foco` (opcional): un punto [x,y,z] que el paso didáctico del host señala con
 * un anillo que respira. Importa three/@react-three → montar SOLO perezosa.
 */
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { Fauna } from '../escenas/FaunaEscena.jsx';
import FloraYuca from './FloraYuca.jsx';
import {
  ANCHO,
  FONDO,
  alturaYucal,
  reliefMonticulo,
  SITIO_CASA,
  SITIO_ARRANQUE,
  SITIO_ESTACAS,
  CAMARA,
} from './floraYuca.geom.js';
import {
  AtmosferaMundo,
  useAtmosferaMundo,
  construirTerreno,
  ruidoTerreno,
  smoothstep,
  CamaraDirector,
} from '../kit/index.js';
import {
  mezclar,
  VERDES,
  TIERRAS,
  CASA,
  ACENTOS,
  LUCES,
  NEUTROS,
  PALETA,
} from '../paleta/index.js';

/* La identidad del clima medio dentro de la familia del valle: `corral`
   (la tarde de finca, cálida). La HORA pone el resto. */
const FAMILIA_YUCAL = 'corral';

/* Escala de la escena para el kit (cámara↔centro ~16). */
const RADIO_YUCAL = 13;

/* El frustum de sombra a medida del yucal (el sol de media tarde). */
const SOMBRA_YUCAL = { left: -18, right: 18, top: 16, bottom: -8, far: 46 };

/* La malla de la loma — el heightfield del KIT con la pintura PROPIA del clima
   medio: la tierra roja andina del montículo, el claro del arranque abierto a
   pala, el caminito de entrada y el pasto de los bordes. Los montículos van en
   la ALTURA (alturaYucal ya los trae horneados): relieve de verdad. */
function construirLoma(seg, plano) {
  const cPasto = new THREE.Color(mezclar(VERDES.calidoVivo, VERDES.trabajo, 0.35));
  const cPasto2 = new THREE.Color(VERDES.brote);
  const cMonton = new THREE.Color(mezclar(TIERRAS.arcilla, TIERRAS.siembra, 0.4)); // el montículo
  const cMontonSeco = new THREE.Color(mezclar(TIERRAS.arcilla, TIERRAS.camino, 0.45)); // la cresta al sol
  const cEntreSurco = new THREE.Color(mezclar(TIERRAS.siembra, NEUTROS.tinta, 0.35));
  const cCamino = new THREE.Color(mezclar(TIERRAS.camino, TIERRAS.vega, 0.3));
  const cAbierta = new THREE.Color(TIERRAS.siembra); // el claro recién removido
  const cLoma = new THREE.Color(mezclar(VERDES.templado, VERDES.monte, 0.45)); // el monte del fondo
  return construirTerreno({
    ancho: ANCHO,
    fondo: FONDO,
    seg,
    plano,
    altura: alturaYucal,
    pintar: (wx, wz, alt, c) => {
      const s = reliefMonticulo(wx, wz);
      const enLoma = smoothstep(-7, -16, wz);
      // base: el pasto del clima medio, con manchas, apagándose hacia el monte
      c.lerpColors(cPasto, cPasto2, 0.5 + 0.5 * ruidoTerreno(wx * 0.85, wz * 0.65));
      c.lerp(cLoma, enLoma * 0.6);
      // dentro del lote: la tierra removida entre montículo y montículo…
      c.lerp(cEntreSurco, s.lote * 0.8);
      // …y el MONTÓN encima, tierra roja con la cresta secada por el sol
      const lomo = smoothstep(0.18, 0.75, s.lomo);
      c.lerp(cMonton, lomo);
      c.lerp(cMontonSeco, smoothstep(0.6, 1, s.lomo) * 0.8);
      // EL CLARO DEL ARRANQUE: tierra abierta a pala, ya sin montículo
      const dAx = wx - SITIO_ARRANQUE[0];
      const dAz = wz - SITIO_ARRANQUE[1];
      c.lerp(cAbierta, smoothstep(11, 2, dAx * dAx + dAz * dAz) * 0.9);
      // el semillero de estacas: tierra mullida, más clara
      const dEx = wx - SITIO_ESTACAS[0];
      const dEz = wz - SITIO_ESTACAS[1];
      c.lerp(cCamino, smoothstep(9, 2, dEx * dEx + dEz * dEz) * 0.6);
      // el caminito por donde se entra al lote, al frente
      c.lerp(
        cCamino,
        smoothstep(1.2, 0, Math.abs(wx + 9 - Math.sin(wz * 0.3) * 2)) * smoothstep(2, 12, wz),
      );
    },
  });
}

/* La casita de clima medio, arriba al fondo: paredes encaladas, teja, y en el
   patio el canasto de la yuca que ya subió. Insinuada, que el mundo es el
   arranque. */
function CasaTemplada({ pos }) {
  return (
    <group position={pos} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.5, 1.44, 1.9]} />
        <meshLambertMaterial color={CASA.encalado} flatShading />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[2.54, 0.34, 1.94]} />
        <meshLambertMaterial color={CASA.zocalo} flatShading />
      </mesh>
      <mesh position={[0.45, 0.62, 0.96]}>
        <boxGeometry args={[0.44, 0.94, 0.06]} />
        <meshLambertMaterial color={CASA.carpinteria} flatShading />
      </mesh>
      <mesh position={[-0.58, 0.86, 0.96]}>
        <boxGeometry args={[0.48, 0.42, 0.06]} />
        <meshLambertMaterial color={CASA.carpinteria} flatShading />
      </mesh>
      {/* techo a dos aguas, con el alero largo del clima con aguacero */}
      <mesh position={[0, 1.58, -0.62]} rotation={[-0.55, 0, 0]}>
        <boxGeometry args={[3.0, 0.08, 1.55]} />
        <meshLambertMaterial color={CASA.tejaSombra} flatShading />
      </mesh>
      <mesh position={[0, 1.58, 0.62]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[3.0, 0.08, 1.55]} />
        <meshLambertMaterial color={CASA.teja} flatShading />
      </mesh>

      {/* el canasto de la yuca en el patio, y un par de raíces asomando */}
      <group position={[1.85, 0, 0.5]}>
        <mesh position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.34, 0.26, 0.48, 9, 1, true]} />
          <meshLambertMaterial color={CASA.bejuco} flatShading side={THREE.DoubleSide} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh
            key={`y${i}`}
            position={[(i - 1) * 0.12, 0.48, i === 1 ? 0.06 : -0.05]}
            rotation={[0.35 + i * 0.25, i * 1.2, 0.4 - i * 0.3]}
          >
            <cylinderGeometry args={[0.045, 0.075, 0.42, 6, 1]} />
            <meshLambertMaterial color={mezclar('#9a6b45', TIERRAS.camino, 0.15)} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* El RINCÓN DEL ARRANQUE: lo que deja el campesino en el claro cuando está en
   plena faena. El GANCHO —la palanca de madera con la que se alza la mata, que
   es la herramienta propia de esta cosecha—, el machete con que cortó los
   tallos, y el atado de tallos ya cortados que se van a guardar para semilla.
   Ese atado es media lección: la yuca de la próxima cosecha sale de ahí. */
function RinconArranque({ pos }) {
  return (
    <group position={pos}>
      {/* EL GANCHO de palanquear, clavado en la tierra abierta */}
      <group position={[1.5, 0, 0.9]} rotation={[0.62, 0.5, -0.28]}>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.035, 0.045, 1.4, 6, 1]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
        <mesh position={[0.1, 0.06, 0]} rotation={[0, 0, -0.9]}>
          <boxGeometry args={[0.26, 0.07, 0.07]} />
          <meshLambertMaterial color={mezclar(NEUTROS.lamina, NEUTROS.tinta, 0.35)} flatShading />
        </mesh>
      </group>

      {/* EL ATADO de tallos cortados: la semilla de la próxima siembra. Van
          amarrados y recostados, con sus cicatrices a la vista. */}
      <group position={[-2.0, 0, 1.1]} rotation={[0, 0.6, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={`t${i}`}
            position={[(i - 2) * 0.075, 0.28 + Math.abs(i - 2) * 0.015, (i % 2) * 0.05]}
            rotation={[0.06 * (i - 2), 0, 1.42 + 0.05 * (i - 2)]}
          >
            <cylinderGeometry args={[0.032, 0.038, 1.15, 6, 1]} />
            <meshLambertMaterial color={mezclar('#8d6c4a', TIERRAS.camino, 0.12)} flatShading />
          </mesh>
        ))}
        {/* el bejuco que los amarra */}
        <mesh position={[0.18, 0.3, 0.02]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.2, 0.018, 5, 10]} />
          <meshLambertMaterial color={CASA.bejuco} flatShading />
        </mesh>
      </group>

      {/* el machete recostado en el atado (con el que cortó los tallos) */}
      <group position={[-1.35, 0.06, 1.45]} rotation={[0, 0.9, 1.15]}>
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[0.055, 0.56, 0.012]} />
          <meshLambertMaterial color={mezclar(NEUTROS.lamina, NEUTROS.cal, 0.3)} flatShading />
        </mesh>
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[0.045, 0.16, 0.035]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      </group>

      {/* el costal de fique abierto, donde se va echando la raíz limpia */}
      <group position={[0.35, 0, 1.75]}>
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.3, 0.24, 0.52, 8, 1]} />
          <meshLambertMaterial color={mezclar(TIERRAS.vega, NEUTROS.cal, 0.2)} flatShading />
        </mesh>
        <mesh position={[0.04, 0.54, 0]} rotation={[0.2, 0.4, 0.15]} scale={[1, 0.45, 1]}>
          <sphereGeometry args={[0.26, 8, 5]} />
          <meshLambertMaterial color={mezclar('#9a6b45', TIERRAS.siembra, 0.25)} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* El anillo del paso didáctico: respira sobre el punto que la lección señala.
   Con reducedMotion queda quieto (presencia sin parpadeo). */
function FocoPaso({ foco, reducedMotion }) {
  const anillo = useRef(null);
  useFrame(({ clock }) => {
    const m = anillo.current;
    if (!m) return;
    if (reducedMotion) {
      m.material.opacity = 0.42;
      return;
    }
    const t = clock.elapsedTime;
    m.material.opacity = 0.3 + 0.2 * Math.sin(t * 1.8);
    m.scale.setScalar(1 + 0.06 * Math.sin(t * 1.8));
  });
  if (!foco) return null;
  return (
    <mesh ref={anillo} position={[foco[0], foco[1] + 0.12, foco[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.15, 1.5, 32]} />
      <meshBasicMaterial
        color={LUCES.candela}
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* La fauna del yucal: los SVG rubber-hose de la casa como billboards. Pocas y
   por criterio — el clima medio tiene mariposa todo el año, y donde hay tierra
   recién abierta siempre baja un pájaro a ver qué salió. */
const FAUNA_YUCAL = [
  { tipo: 'mariposa', base: [-2.6, 1.4, 4.6], patron: 'revoloteo', size: 26, fase: 0.4, df: 9 },
  { tipo: 'mariposa', base: [6.4, 1.8, 2.2], patron: 'revoloteo', size: 22, fase: 2.1, df: 9 },
  { tipo: 'colibri', base: [-7.5, 2.3, 1.0], patron: 'revoloteo', size: 28, fase: 1.3, df: 10 },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);

  /* La atmósfera VIVA (misma resolución que monta AtmosferaMundo: barata,
     cambia por franja) — alimenta la niebla propia y los cerros del fondo. */
  const atm = useAtmosferaMundo({ familia: FAMILIA_YUCAL, reducedMotion });

  /* La calina del clima medio: LEJOS y tenue, al revés que la bruma del papal.
     Aquí el aire es caliente y transparente — la distancia se dora, no se
     borra. Si esto se acerca, el yucal del fondo se pierde y con él la silueta
     de tallos anillados que es media identidad del cultivo. */
  const calina = useMemo(
    () => mezclar(atm.niebla, ACENTOS.ambar, atm.franja === 'noche' ? 0.06 : 0.18),
    [atm.niebla, atm.franja],
  );

  const geoLoma = useMemo(
    () => construirLoma(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  /* Los cerros del fondo, dorados por la distancia (perspectiva aérea viva). */
  const cerros = useMemo(
    () => ({
      cerca: mezclar(VERDES.templado, calina, 0.26),
      media: mezclar(VERDES.templado, calina, 0.36),
      lejos: mezclar(VERDES.frio, calina, 0.48),
    }),
    [calina],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_YUCAL : FAUNA_YUCAL.slice(0, 2)),
    [tier],
  );

  const controls = useRef(null);
  const casaY = alturaYucal(SITIO_CASA[0], SITIO_CASA[1]);
  const arranqueY = alturaYucal(SITIO_ARRANQUE[0], SITIO_ARRANQUE[1]);

  return (
    <>
      {/* LA ATMÓSFERA DEL KIT: fondo, luces y estrellas de LA HORA DEL VALLE
          (familia corral), con el shadow-map del sol en gama alta. */}
      <AtmosferaMundo
        familia={FAMILIA_YUCAL}
        tier={tier}
        reducedMotion={reducedMotion}
        radio={RADIO_YUCAL}
        conSuelo={false}
        conNiebla={false}
        sombra={SOMBRA_YUCAL}
      />
      {/* La calina: LEJOS y tenue — que el yucal del fondo se siga leyendo. */}
      {perfil.fog && <fog attach="fog" args={[calina, 26, 62]} />}
      {/* El rebote CÁLIDO del suelo: en clima medio la tierra roja devuelve luz
          y le quita el gris a la cara de abajo de las hojas. */}
      <directionalLight position={[2, -6, 4]} intensity={0.14} color={TIERRAS.arcilla} />

      {/* LA LOMA con sus montículos horneados en el relieve */}
      <mesh geometry={geoLoma} receiveShadow={perfil.sombras}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* los cerros del fondo, dorados por la distancia */}
      <mesh position={[-15, 4.0, -25]} scale={[11, 5.0, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={cerros.media} />
      </mesh>
      <mesh position={[7, 4.6, -28]} scale={[13, 6.2, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={cerros.lejos} />
      </mesh>
      <mesh position={[22, 3.2, -24]} scale={[9, 4.2, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={cerros.cerca} />
      </mesh>

      {/* EL YUCAL: matas anilladas, follaje arriba, raíz destapada, estacas */}
      <FloraYuca tier={tier} />

      {/* la casita de clima medio con su canasto, arriba al fondo */}
      <CasaTemplada pos={[SITIO_CASA[0], casaY, SITIO_CASA[1]]} />

      {/* el rincón del arranque: el gancho, el atado de semilla y el costal */}
      <RinconArranque pos={[SITIO_ARRANQUE[0], arranqueY, SITIO_ARRANQUE[1]]} />

      {/* LA VIDA del clima medio */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        ref={controls}
        makeDefault
        target={CAMARA.objetivo}
        enablePan={false}
        enableZoom
        minDistance={7}
        maxDistance={26}
        minPolarAngle={0.55}
        maxPolarAngle={1.42}
        minAzimuthAngle={-1.0}
        maxAzimuthAngle={1.0}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.1}
      />
      {/* La LLEGADA del kit: el dolly de establishing baja al claro del
          arranque — entrar al yucal es agacharse a ver lo que salió. */}
      <CamaraDirector
        controls={controls}
        reposo={CAMARA.reposo}
        mirada={CAMARA.mirada}
        respiro={0.04}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoYucal"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo del yucal de clima medio. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaYucaViva({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`yucal-canvas${listo ? ' yucal-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: CAMARA.reposo, fov: CAMARA.fov }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} foco={foco} />
    </Canvas>
  );
}
