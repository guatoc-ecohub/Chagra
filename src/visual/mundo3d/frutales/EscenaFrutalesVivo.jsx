/*
 * EscenaFrutalesVivo — el MUNDO DE LOS FRUTALES: mango y cítricos en UNA finca,
 * porque juntos enseñan lo que por separado no — EL PISO TÉRMICO.
 *
 * La escena ES la lección. La finca SUBE: al frente la VEGA CALIENTE (0–1.000 m)
 * con los palos de mango monumentales y la casa a su sombra; ladera arriba, ya
 * en clima medio, el huerto de cítricos — chiquitos, redondos, cargados. Entre
 * los dos, el CAMINO que el campesino sube. La altura decide qué se da, y aquí
 * se ve caminando.
 *
 * En la hora viva del valle (`AtmosferaMundo`, familia `plaza` — la tierra
 * caliente es luz abierta y polvo dorado, no sotobosque) y en clave de la TOMA B
 * estilizada: domo de gradiente con el glow del sol (`DomoCielo`), terreno y
 * montes por BANDAS (`useGradienteBandas` + toon), silueta fuerte. La paleta la
 * levanta LA FRUTA: el amarillo del mango de azúcar y el naranja del cítrico
 * son el color de este mundo — nada de pardo mustio.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`. Con
 * `reducedMotion` el mundo monta QUIETO (frameloop a demanda). La fauna son los
 * SVG rubber-hose de la casa como billboards: la guacamaya y el mico que bajan
 * al palo de mango cargado, y las mariposas de la vega caliente.
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
import FaunaCalido from '../escenas/FaunaCalido.jsx';
import FloraFrutales from './FloraFrutales.jsx';
import {
  ANCHO,
  FONDO,
  PAL,
  alturaFinca,
  caminoX,
  SITIO_CASA,
} from './floraFrutales.geom.js';
import {
  AtmosferaMundo,
  DomoCielo,
  useAtmosferaMundo,
  useGradienteBandas,
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
  LUCES,
  PALETA,
} from '../paleta/index.js';

/* La identidad de la tierra caliente dentro de la familia del valle: `plaza`
   (luz abierta, polvo dorado). El 60% restante lo pone la HORA. */
const FAMILIA_FRUTALES = 'plaza';

/* Escala de la escena para el kit (cámara↔centro ~16): la niebla del kit cae a
   radio*1.4→radio*4.6, calibrada a esta finca larga. */
const RADIO_FRUTALES = 12;

/* El frustum de sombra a medida: el domo del mango tira sombra ancha. */
const SOMBRA_FRUTALES = { left: -18, right: 18, top: 16, bottom: -8, far: 44 };

/* La malla de la finca — el heightfield del KIT con la pintura PROPIA de los
   dos pisos: abajo la vega caliente (pasto amarillento, tierra clara y seca),
   arriba el verde franco del clima medio. El COLOR DEL SUELO ya cuenta la
   lección: la tierra cambia con la altura, no solo los árboles. */
function construirFinca(seg, plano) {
  const cVegaSeca = new THREE.Color(VERDES.calido); // el oliva amarillento del cálido
  const cVegaViva = new THREE.Color(VERDES.calidoVivo);
  const cMedio = new THREE.Color(VERDES.templadoVivo); // el verde franco de arriba
  const cMedioAlto = new THREE.Color(VERDES.templado);
  const cTierra = new THREE.Color(TIERRAS.vega); // tierra clara de vega
  const cCamino = new THREE.Color(mezclar(TIERRAS.camino, TIERRAS.vega, 0.35));
  const cMantillo = new THREE.Color(TIERRAS.mantillo); // bajo el domo del mango
  return construirTerreno({
    ancho: ANCHO,
    fondo: FONDO,
    seg,
    plano,
    altura: alturaFinca,
    pintar: (wx, wz, alt, c) => {
      // 0 en la vega caliente, 1 arriba en el clima medio
      const arriba = smoothstep(6, -12, wz);
      const vega = new THREE.Color().lerpColors(
        cVegaSeca, cVegaViva, 0.5 + 0.5 * ruidoTerreno(wx * 0.9, wz * 0.7),
      );
      const medio = new THREE.Color().lerpColors(
        cMedio, cMedioAlto, 0.5 + 0.5 * ruidoTerreno(wx * 1.1, wz * 0.9),
      );
      c.lerpColors(vega, medio, arriba);
      // la tierra clara asoma a manchas en la vega seca
      c.lerp(cTierra, smoothstep(-0.1, 0.85, ruidoTerreno(wx * 1.3, wz * 1.1)) * 0.38 * (1 - arriba));
      // el mantillo bajo la sombra grande del mango del patio
      const dm = Math.hypot(wx + 4.2, wz - 8.6);
      c.lerp(cMantillo, smoothstep(4.2, 1.4, dm) * 0.3);
      // EL CAMINO que sube de la vega al huerto: la lección que se camina
      c.lerp(cCamino, smoothstep(1.5, 0.2, Math.abs(wx - caminoX(wz))) * 0.75);
    },
  });
}

/* La casa campesina de la vega, a la sombra del palo de mango del patio:
   paredes encaladas, techo de teja y — la señal de la tierra caliente — el
   CORREDOR con su hamaca colgada y los guacales de fruta esperando el viaje. */
function CasaVega({ pos }) {
  return (
    <group position={pos} rotation={[0, 0.42, 0]}>
      {/* la casa: LA casa campesina de la paleta madre (la misma del valle) */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.8, 1.44, 2.0]} />
        <meshLambertMaterial color={CASA.encalado} flatShading />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[2.84, 0.36, 2.04]} />
        <meshLambertMaterial color={CASA.zocalo} flatShading />
      </mesh>
      <mesh position={[0.55, 0.62, 1.01]}>
        <boxGeometry args={[0.46, 0.95, 0.06]} />
        <meshLambertMaterial color={CASA.carpinteria} flatShading />
      </mesh>
      <mesh position={[-0.65, 0.86, 1.01]}>
        <boxGeometry args={[0.52, 0.44, 0.06]} />
        <meshLambertMaterial color={CASA.carpinteria} flatShading />
      </mesh>
      {/* techo a dos aguas de teja, con alero largo (el sol pega duro aquí) */}
      <mesh position={[0, 1.6, -0.66]} rotation={[-0.6, 0, 0]}>
        <boxGeometry args={[3.3, 0.08, 1.6]} />
        <meshLambertMaterial color={CASA.tejaSombra} flatShading />
      </mesh>
      <mesh position={[0, 1.6, 0.66]} rotation={[0.6, 0, 0]}>
        <boxGeometry args={[3.3, 0.08, 1.6]} />
        <meshLambertMaterial color={CASA.teja} flatShading />
      </mesh>

      {/* EL CORREDOR: dos horcones y la hamaca tendida — el descanso del
          mediodía caliente, a la sombra del alero y del mango. */}
      {[[-1.15, 1.55], [1.15, 1.55]].map((q, i) => (
        <mesh key={i} position={[q[0], 0.6, q[1]]}>
          <cylinderGeometry args={[0.07, 0.085, 1.2, 6]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.72, 1.55]} rotation={[0, 0, 0]} scale={[1, 0.32, 0.5]}>
        <sphereGeometry args={[0.95, 10, 6]} />
        <meshLambertMaterial color={CASA.bejuco} flatShading />
      </mesh>

      {/* los GUACALES de fruta cogida, esperando el viaje al pueblo: uno de
          mango amarillo, otro de naranja. El color de la cosecha, en el patio. */}
      {[
        { p: [-1.9, 1.2], fruta: PAL.mangoMaduro },
        { p: [-2.45, 0.75], fruta: PAL.naranjaMadura },
      ].map((g, i) => (
        <group key={`g${i}`} position={[g.p[0], 0, g.p[1]]}>
          <mesh position={[0, 0.19, 0]}>
            <boxGeometry args={[0.52, 0.38, 0.42]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
          <mesh position={[0, 0.42, 0]} scale={[1, 0.42, 0.82]}>
            <sphereGeometry args={[0.24, 8, 5]} />
            <meshLambertMaterial color={g.fruta} flatShading />
          </mesh>
        </group>
      ))}
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
      <ringGeometry args={[1.3, 1.75, 32]} />
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

/* La vida menuda de la vega caliente: mariposas al sol y el colibrí que visita
   el azahar del cítrico (el azahar huele fuerte a propósito: llama). */
const FAUNA_FRUTALES = [
  { tipo: 'mariposa', base: [-1.5, 1.6, 6.5], patron: 'revoloteo', size: 26, fase: 0.7, df: 9 },
  { tipo: 'colibri', base: [-5.0, 3.4, -5.5], patron: 'revoloteo', size: 30, fase: 1.9, df: 10 },
  { tipo: 'mariposa', base: [6.0, 1.8, 9.0], patron: 'revoloteo', size: 22, fase: 2.9, df: 9 },
];

/* La FAUNA EMBLEMÁTICA DEL PISO CÁLIDO — y aquí no es decorado: el palo de
   mango cargado es comedero. La guacamaya y el mico bajan A COMER mango; el
   morfo azul cruza la sombra del domo. Especies REALES colombianas con su
   nombre científico. Orden = prominencia: el recorte por tier deja lo insignia. */
const FAUNA_CALIDO_FRUTALES = [
  { tipo: 'guacamaya', base: [-4.0, 5.4, 8.0], patron: 'vuela', size: 64, fase: 0.4, df: 12, title: 'Guacamaya bandera (Ara macao)' },
  { tipo: 'mico', base: [-3.0, 3.4, 7.4], patron: 'trepa', size: 56, fase: 2.0, df: 9, title: 'Mico maicero (Saimiri sciureus)' },
  { tipo: 'tucan', base: [8.0, 3.8, 11.0], patron: 'posa', size: 58, fase: 1.1, df: 9, title: 'Tucán pechiblanco (Ramphastos tucanus)' },
  { tipo: 'morfo', base: [-6.5, 2.2, 5.0], patron: 'morfo', size: 40, fase: 0.7, df: 9, title: 'Morfo azul (Morpho peleides)' },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);

  /* La atmósfera VIVA de la hora del valle — alimenta el domo y la perspectiva
     aérea del fondo. */
  const atm = useAtmosferaMundo({ familia: FAMILIA_FRUTALES, reducedMotion });

  /* EL gradiente de bandas de la escena (toma B): terreno y montes comparten
     los mismos escalones de luz — ilustración en movimiento. */
  const bandas = useGradienteBandas();

  const geoFinca = useMemo(
    () => construirFinca(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  /* Las montañas del fondo, comidas por la niebla DE LA HORA. Aquí cuentan algo:
     lo que se ve atrás es la montaña que SIGUE subiendo — arriba de los cítricos
     ya no se da ni el mango ni la naranja. */
  const montes = useMemo(
    () => ({
      cerca: mezclar(VERDES.monte, atm.niebla, 0.22),
      media: mezclar(VERDES.templado, atm.niebla, 0.3),
      lejos: mezclar(VERDES.frio, atm.niebla, 0.42),
    }),
    [atm.niebla],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_FRUTALES : FAUNA_FRUTALES.slice(0, 2)),
    [tier],
  );
  const faunaCalido = useMemo(
    () => (tier === 'alto' ? FAUNA_CALIDO_FRUTALES : FAUNA_CALIDO_FRUTALES.slice(0, 2)),
    [tier],
  );

  const controls = useRef(null);
  const casaY = alturaFinca(SITIO_CASA[0], SITIO_CASA[1]);

  return (
    <>
      {/* LA ATMÓSFERA DEL KIT: fondo, niebla, luces y estrellas de LA HORA DEL
          VALLE (familia plaza), con el shadow-map del domo en gama alta. */}
      <AtmosferaMundo
        familia={FAMILIA_FRUTALES}
        tier={tier}
        reducedMotion={reducedMotion}
        radio={RADIO_FRUTALES}
        conSuelo={false}
        sombra={SOMBRA_FRUTALES}
      />

      {/* El DOMO de la toma B: gradiente cenit→horizonte + glow del sol. */}
      <DomoCielo atm={atm} radio={68} />

      {/* LA FINCA por bandas (recibe la sombra de las copas en gama alta).
          Con perfil.flatShading el terreno ya viene DESINDEXADO con normales
          planas horneadas (construirTerreno). */}
      <mesh geometry={geoFinca} receiveShadow={perfil.sombras}>
        <meshToonMaterial vertexColors gradientMap={bandas} />
      </mesh>

      {/* la montaña que SIGUE subiendo detrás del huerto: el piso que ya no da
          fruta — la lección continúa fuera de cuadro. */}
      <mesh position={[-14, 3.4, -24]} scale={[10, 5.4, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.media} gradientMap={bandas} />
      </mesh>
      <mesh position={[8, 4.2, -27]} scale={[12, 7.0, 7]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.lejos} gradientMap={bandas} />
      </mesh>
      <mesh position={[23, 2.4, -22]} scale={[9, 4.0, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.cerca} gradientMap={bandas} />
      </mesh>

      {/* LOS FRUTALES: el mango de la vega, los cítricos del huerto. */}
      <FloraFrutales tier={tier} reducedMotion={reducedMotion} />

      {/* la casa de la vega, bajo la sombra del palo de mango del patio */}
      <CasaVega pos={[SITIO_CASA[0], casaY, SITIO_CASA[1]]} />

      {/* La vida menuda: mariposas al sol, el colibrí en el azahar. */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      {/* La fauna del cálido que baja al mango cargado: guacamaya, mico,
          tucán y el morfo azul cruzando la sombra del domo. */}
      {perfil.criaturas > 0 && <FaunaCalido items={faunaCalido} reducedMotion={reducedMotion} />}

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 2.4, 0]}
        enablePan={false}
        enableZoom
        minDistance={9}
        maxDistance={30}
        minPolarAngle={0.45}
        maxPolarAngle={1.45}
        minAzimuthAngle={-1.15}
        maxAzimuthAngle={1.15}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.12}
      />
      {/* La LLEGADA: el dolly entra BAJO, casi al pie del palo de mango, para
          que la copa se sienta enorme antes de que la cámara suba y muestre el
          huerto chiquito allá arriba. La escala se hace SENTIR, no se explica. */}
      <CamaraDirector
        controls={controls}
        reposo={[2.5, 5.2, 19]}
        mirada={[-1.5, 3.0, 2]}
        respiro={0.04}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoFrutales"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo de los frutales (mango + cítricos). Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaFrutalesVivo({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`frutales-canvas${listo ? ' frutales-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [2.5, 5.2, 19], fov: 46 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} foco={foco} />
    </Canvas>
  );
}
