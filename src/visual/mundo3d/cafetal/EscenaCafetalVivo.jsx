/*
 * EscenaCafetalVivo — el MUNDO donde vive el café (piso templado, 1.000–2.000 m).
 *
 * Una LADERA de la montaña cafetera EN LA HORA VIVA DEL VALLE: la atmósfera ya
 * no es un cielo clavado sino la del kit compartido (`AtmosferaMundo`, familia
 * `corral`) — el cafetal amanece, dora y anochece CON el valle. Y en clave de
 * la TOMA B (estilizada Switch/BOTW, decisión por piso térmico): domo de
 * gradiente con el glow del sol (`DomoCielo`), terreno y montes por BANDAS
 * (`useGradienteBandas` + toon), luz dorada dramática de la franja y silueta
 * fuerte. El cultivo se cuenta como es — los surcos de cafetos a curva de nivel
 * ABAJO, el SOMBRÍO de guamos y nogales ARRIBA tendiéndoles techo, el plátano
 * intercalado y la casa-beneficiadero medio velada al fondo. La cámara LLEGA
 * (CamaraDirector, dolly de establishing) y se puede girar con el dedo.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`: 'alto' con
 * sombras + bruma + luz colada; 'medio' frugal; 'bajo' mínimo. Con
 * `reducedMotion` el mundo monta QUIETO (frameloop a demanda). La fauna son los
 * SVG rubber-hose de la casa como billboards (`Fauna` de FaunaEscena): mariposa
 * y colibrí — la vida que el café de sombra sí recibe y el de sol espanta.
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
import FloraCafetal from './FloraCafetal.jsx';
import CasaBeneficio from './CasaBeneficio.jsx';
import { alturaLadera, construirLadera, SITIO_CASA } from './floraCafetal.geom.js';
import {
  AtmosferaMundo,
  DomoCielo,
  useAtmosferaMundo,
  useGradienteBandas,
  CamaraDirector,
} from '../kit/index.js';
import { mezclar, VERDES, LUCES } from '../paleta/index.js';

/* La identidad del piso templado dentro de la familia del valle: `corral`
   ("corral y cafetal: tarde de finca"). El 60% restante lo pone la HORA. */
const FAMILIA_CAFETAL = 'corral';

/* Escala de la escena para el kit (cámara↔centro ~14.5): la niebla del kit cae
   a radio*1.4→radio*4.6 ≈ el 16→46 que este mundo ya calibró. */
const RADIO_CAFETAL = 11;

/* El frustum de sombra a medida de la ladera (la luz colada del sombrío). */
const SOMBRA_CAFETAL = { left: -16, right: 16, top: 16, bottom: -6, far: 40 };

/* La malla de la ladera y la casa-beneficiadero viven ahora en piezas
   compartidas del cafetal (floraCafetal.geom / CasaBeneficio.jsx): las monta
   también el arquetipo `cafe` del framework — una sola geografía, dos tomas. */

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
      <ringGeometry args={[1.25, 1.65, 32]} />
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

/* La fauna del café de sombra: los SVG rubber-hose de la casa como billboards
   (contrato del operador: el bicho pone el cuerpo, la escena la coreografía).
   Pocas y por criterio: la sombra ES el hábitat que las trae. */
const FAUNA_CAFETAL = [
  { tipo: 'mariposa', base: [-3.2, 1.7, 2.2], patron: 'revoloteo', size: 26, fase: 0.7, df: 9 },
  { tipo: 'colibri', base: [4.2, 2.6, -2.6], patron: 'revoloteo', size: 30, fase: 1.9, df: 10 },
  { tipo: 'mariposa', base: [7.2, 1.9, 0.6], patron: 'revoloteo', size: 22, fase: 2.9, df: 9 },
];

/* La FAUNA EMBLEMÁTICA DEL PISO CÁLIDO que sube al cinturón cafetero bajo/
   sub-andino (~1.000–1.400 m, donde el café templado y la tierra caliente se
   tocan). Especies REALES colombianas con su nombre científico, del DR
   fauna-piso-cálido (gemini, GBIF): la guacamaya que cruza en lo alto, el tucán
   posado en el sombrío, el mico entre las ramas y el morfo azul del sotobosque.
   Billboards SVG con coreografía por nicho (FaunaCalido). Orden = prominencia:
   el recorte por tier deja siempre lo insignia. */
const FAUNA_CALIDO_CAFETAL = [
  { tipo: 'guacamaya', base: [0, 5.6, -6], patron: 'vuela', size: 62, fase: 0.4, df: 12, title: 'Guacamaya bandera (Ara macao)' },
  { tipo: 'tucan', base: [-5.2, 3.5, -1.2], patron: 'posa', size: 60, fase: 1.1, df: 9, title: 'Tucán pechiblanco (Ramphastos tucanus)' },
  { tipo: 'mico', base: [5.4, 3.2, -1.6], patron: 'trepa', size: 54, fase: 2.0, df: 9, title: 'Mico maicero (Saimiri sciureus)' },
  { tipo: 'morfo', base: [-2.6, 2.3, 2.6], patron: 'morfo', size: 40, fase: 0.7, df: 9, title: 'Morfo azul (Morpho peleides)' },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);

  /* La atmósfera VIVA (misma resolución que monta AtmosferaMundo: barata,
     cambia por franja) — alimenta el domo y la perspectiva aérea del fondo. */
  const atm = useAtmosferaMundo({ familia: FAMILIA_CAFETAL, reducedMotion });

  /* EL gradiente de bandas de la escena (toma B): terreno y montes comparten
     los mismos escalones de luz — ilustración en movimiento. */
  const bandas = useGradienteBandas();

  const geoLadera = useMemo(
    () => construirLadera(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  /* Las montañas del fondo, comidas por la niebla DE LA HORA (perspectiva
     aérea viva: al atardecer se doran, de noche se apagan con el valle). */
  const montes = useMemo(
    () => ({
      cerca: mezclar(VERDES.monte, atm.niebla, 0.2),
      media: mezclar(VERDES.monte, atm.niebla, 0.28),
      lejos: mezclar(VERDES.monte, atm.niebla, 0.38),
    }),
    [atm.niebla],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_CAFETAL : FAUNA_CAFETAL.slice(0, 2)),
    [tier],
  );

  /* La fauna del cálido que asoma al café bajo: recortada por tier (alto todo,
     medio deja lo insignia — guacamaya + tucán). */
  const faunaCalido = useMemo(
    () => (tier === 'alto' ? FAUNA_CALIDO_CAFETAL : FAUNA_CALIDO_CAFETAL.slice(0, 2)),
    [tier],
  );

  const controls = useRef(null);
  const casaY = alturaLadera(SITIO_CASA[0], SITIO_CASA[1]);

  /* Cuánta luz le FALTA a la hora para que el cultivo se lea (la noche y el
     atardecer bajan `atm.intensidad`; a mediodía esto es ~0). */
  const refuerzo = Math.max(0, 1 - atm.intensidad);

  return (
    <>
      {/* LA ATMÓSFERA DEL KIT: fondo, niebla, luces y estrellas de LA HORA DEL
          VALLE (familia corral), con el shadow-map del sombrío en gama alta. */}
      <AtmosferaMundo
        familia={FAMILIA_CAFETAL}
        tier={tier}
        reducedMotion={reducedMotion}
        radio={RADIO_CAFETAL}
        conSuelo={false}
        sombra={SOMBRA_CAFETAL}
      />

      {/* EL PISO DE LECTURA del cafetal: el sombrío es penumbra, NO ceguera.
          Dos luces locales de la escena (no tocan el kit): un relleno hemisférico
          cálido que COMPENSA lo que la hora apaga (de noche sube, a mediodía casi
          no suma) y una clave dorada fija SIN sombras — aclara lo que el guamo
          tapa pero deja intacto el dibujo de la sombra proyectada. El domo y la
          niebla siguen contando la hora: el ambiente de sombra se conserva. */}
      <hemisphereLight
        color="#f2e6c8"
        groundColor="#41502e"
        intensity={0.38 + 1.15 * refuerzo}
      />
      <directionalLight
        position={[7, 10, 5]}
        color="#ffe9c0"
        intensity={0.5 + 0.95 * refuerzo}
      />

      {/* El DOMO de la toma B: gradiente cenit→horizonte + glow del sol de la
          franja — el atardecer del piso templado es el cartel. */}
      <DomoCielo atm={atm} radio={64} />

      {/* LA LADERA por bandas (recibe la sombra del sombrío en gama alta).
          El look facetado no necesita flag: con perfil.flatShading el terreno
          ya viene DESINDEXADO con normales planas horneadas (construirTerreno). */}
      <mesh geometry={geoLadera} receiveShadow={perfil.sombras}>
        <meshToonMaterial vertexColors gradientMap={bandas} />
      </mesh>

      {/* las montañas cafeteras del fondo, comidas por la niebla de la hora */}
      <mesh position={[-13, 2.2, -21]} scale={[9, 4.2, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.media} gradientMap={bandas} />
      </mesh>
      <mesh position={[9, 2.6, -24]} scale={[11, 5.4, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.lejos} gradientMap={bandas} />
      </mesh>
      <mesh position={[22, 1.6, -20]} scale={[8, 3.4, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.cerca} gradientMap={bandas} />
      </mesh>

      {/* EL CAFETAL: surcos, cerezas, sombrío, plátano, luz colada */}
      <FloraCafetal tier={tier} reducedMotion={reducedMotion} />

      {/* la casa con su beneficiadero, arriba al fondo */}
      <CasaBeneficio pos={[SITIO_CASA[0], casaY, SITIO_CASA[1]]} />

      {/* LA VIDA que la sombra trae: mariposas y el colibrí */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      {/* LA FAUNA DEL CÁLIDO que sube al café bajo: guacamaya en vuelo, tucán
          posado, mico en las ramas y el morfo azul del sotobosque. */}
      {perfil.criaturas > 0 && <FaunaCalido items={faunaCalido} reducedMotion={reducedMotion} />}

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 2.6, -3]}
        enablePan={false}
        enableZoom
        minDistance={8}
        maxDistance={24}
        minPolarAngle={0.5}
        maxPolarAngle={1.45}
        minAzimuthAngle={-1.1}
        maxAzimuthAngle={1.1}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.12}
      />
      {/* La LLEGADA del kit: dolly de establishing con tilt-down suave — entrar
          al cafetal se siente como llegar subiendo, una vez por sesión. */}
      <CamaraDirector
        controls={controls}
        reposo={[1.5, 4.6, 14.5]}
        mirada={[0, 3.6, -3]}
        respiro={0.04}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoCafetal"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo del cafetal bajo sombra. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaCafetalVivo({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`cafetal-canvas${listo ? ' cafetal-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [1.5, 4.6, 14.5], fov: 46 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} foco={foco} />
    </Canvas>
  );
}
