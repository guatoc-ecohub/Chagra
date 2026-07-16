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
import { ANCHO, FONDO, alturaLadera, SITIO_CASA } from './floraCafetal.geom.js';
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
  ACENTOS,
  LUCES,
  NIEBLAS,
  PALETA,
} from '../paleta/index.js';

/* La identidad del piso templado dentro de la familia del valle: `corral`
   ("corral y cafetal: tarde de finca"). El 60% restante lo pone la HORA. */
const FAMILIA_CAFETAL = 'corral';

/* Escala de la escena para el kit (cámara↔centro ~14.5): la niebla del kit cae
   a radio*1.4→radio*4.6 ≈ el 16→46 que este mundo ya calibró. */
const RADIO_CAFETAL = 11;

/* El frustum de sombra a medida de la ladera (la luz colada del sombrío). */
const SOMBRA_CAFETAL = { left: -16, right: 16, top: 16, bottom: -6, far: 40 };

/* La malla de la ladera — el heightfield del KIT (mismo andamiaje que todos los
   mundos) con la pintura PROPIA del piso templado: arvenses verdes (cobertura
   viva), tierra roja andina asomando y el mantillo pardo hacia la sombra. */
function construirLadera(seg, plano) {
  const cPasto = new THREE.Color(VERDES.brote); // pasto al sol del piso templado
  const cPasto2 = new THREE.Color(VERDES.calido); // el oliva que asoma hacia lo seco
  const cTierra = new THREE.Color(TIERRAS.arcilla); // la tierra roja cafetera
  const cMantillo = new THREE.Color(TIERRAS.mantillo); // hojarasca bajo el sombrío
  const cCamino = new THREE.Color(mezclar(TIERRAS.camino, TIERRAS.vega, 0.4));
  return construirTerreno({
    ancho: ANCHO,
    fondo: FONDO,
    seg,
    plano,
    altura: alturaLadera,
    pintar: (wx, wz, alt, c) => {
      const enLoma = smoothstep(5, -8, wz);
      c.lerpColors(cPasto, cPasto2, 0.5 + 0.5 * ruidoTerreno(wx * 0.9, wz * 0.7));
      // la tierra roja asoma a manchas entre los surcos
      c.lerp(cTierra, smoothstep(-0.1, 0.85, ruidoTerreno(wx * 1.3, wz * 1.1)) * 0.45 * enLoma);
      // el mantillo pardo gana hacia lo alto (más sombrío, más hojarasca)
      c.lerp(cMantillo, enLoma * 0.22);
      // el caminito seco del frente, por donde se llega
      c.lerp(cCamino, smoothstep(1.2, 0, Math.abs(wx - Math.sin(wz * 0.4) * 2.2)) * smoothstep(2, 12, wz));
    },
  });
}

/* La casa campesina con su BENEFICIADERO, arriba al fondo: paredes encaladas,
   techo de teja, y al lado la marquesina — la cama elevada bajo plástico donde
   el café pergamino se seca al sol. Insinuada, medio velada por la bruma. */
function CasaBeneficio({ pos }) {
  return (
    <group position={pos} rotation={[0, -0.35, 0]}>
      {/* la casa: LA casa campesina de la paleta madre (la misma del valle) */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.6, 1.44, 1.9]} />
        <meshLambertMaterial color={CASA.encalado} flatShading />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[2.64, 0.36, 1.94]} />
        <meshLambertMaterial color={CASA.zocalo} flatShading />
      </mesh>
      {/* la puerta y una ventana (la carpintería pintada de la casa) */}
      <mesh position={[0.5, 0.62, 0.96]}>
        <boxGeometry args={[0.44, 0.95, 0.06]} />
        <meshLambertMaterial color={CASA.carpinteria} flatShading />
      </mesh>
      <mesh position={[-0.6, 0.86, 0.96]}>
        <boxGeometry args={[0.5, 0.44, 0.06]} />
        <meshLambertMaterial color={CASA.carpinteria} flatShading />
      </mesh>
      {/* techo a dos aguas de teja */}
      <mesh position={[0, 1.62, -0.62]} rotation={[-0.62, 0, 0]}>
        <boxGeometry args={[3.0, 0.08, 1.5]} />
        <meshLambertMaterial color={CASA.tejaSombra} flatShading />
      </mesh>
      <mesh position={[0, 1.62, 0.62]} rotation={[0.62, 0, 0]}>
        <boxGeometry args={[3.0, 0.08, 1.5]} />
        <meshLambertMaterial color={CASA.teja} flatShading />
      </mesh>

      {/* la MARQUESINA de secado, al lado: patas + cama de pergamino + techo
          translúcido a dos aguas (la señal del beneficio) */}
      <group position={[2.6, 0, 0.4]}>
        {[[-1.0, -0.55], [1.0, -0.55], [-1.0, 0.55], [1.0, 0.55]].map((q, i) => (
          <mesh key={i} position={[q[0], 0.35, q[1]]}>
            <boxGeometry args={[0.09, 0.7, 0.09]} />
            <meshLambertMaterial color={mezclar(PALETA.madera, PALETA.maderaOscura, 0.5)} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[2.2, 0.07, 1.3]} />
          <meshLambertMaterial color={PALETA.maderaClara} flatShading />
        </mesh>
        {/* el café pergamino extendido secándose al sol */}
        <mesh position={[0, 0.77, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.0, 1.1]} />
          <meshLambertMaterial color={mezclar(TIERRAS.arenaOrilla, TIERRAS.camino, 0.2)} flatShading />
        </mesh>
        {[[-1.05, -0.62], [1.05, -0.62], [-1.05, 0.62], [1.05, 0.62]].map((q, i) => (
          <mesh key={`p${i}`} position={[q[0], 1.15, q[1]]}>
            <boxGeometry args={[0.06, 0.85, 0.06]} />
            <meshLambertMaterial color={mezclar(PALETA.madera, PALETA.maderaOscura, 0.5)} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 1.62, -0.36]} rotation={[-0.5, 0, 0]}>
          <planeGeometry args={[2.4, 0.95]} />
          <meshBasicMaterial color={NIEBLAS.lechosa} transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 1.62, 0.36]} rotation={[0.5, 0, 0]}>
          <planeGeometry args={[2.4, 0.95]} />
          <meshBasicMaterial color={NIEBLAS.lechosa} transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* dos canastos de cosecha esperando en el patio */}
      {[[-1.8, 0.6], [-1.35, 0.9]].map((q, i) => (
        <group key={`c${i}`} position={[q[0], 0, q[1]]}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.24, 0.17, 0.36, 9, 1, true]} />
            <meshLambertMaterial color={CASA.bejuco} flatShading side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.36, 0]} scale={[1, 0.4, 1]}>
            <sphereGeometry args={[0.2, 8, 5]} />
            <meshLambertMaterial color={ACENTOS.cafeCereza} flatShading />
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
