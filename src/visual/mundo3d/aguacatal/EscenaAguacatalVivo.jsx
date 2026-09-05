/*
 * EscenaAguacatalVivo — el MUNDO donde vive el aguacate (piso templado alto,
 * 1.800–2.200 m: la franja andina del Hass).
 *
 * El problema de diseño de este mundo es LA ESCALA: el aguacate es un ÁRBOL
 * GRANDE — el Hass adulto le pasa por encima a la casa y el criollo viejo del
 * patio todavía más — y la escena está compuesta para HACERLA SENTIR: la casa
 * campesina vive pegada al criollo gigante (las dos siluetas se comparan
 * solas), la ESCALERA de cosecha recostada al tronco dice "a este árbol se le
 * sube", y la cámara llega BAJA, mirando apenas hacia arriba, para que las
 * copas oscuras hagan techo.
 *
 * En clave de la TOMA B (estilizada Switch/BOTW): atmósfera del kit compartido
 * (familia `ladera` — el mundo amanece, dora y anochece CON el valle), domo de
 * gradiente con el glow del sol, terreno y montes por BANDAS (toon) y silueta
 * fuerte. La finca se cuenta como es: matorros IRREGULARES de Hass en sus
 * camellones (nunca cuadrícula), el lote nuevo de jóvenes con tutor junto a la
 * ZANJILLA de drenaje, el maíz asociado, y bajo cada copa el suelo cambia —
 * hojarasca gruesa y poco pasto: el microclima que la sombra densa fabrica.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`; con
 * `reducedMotion` el mundo monta QUIETO. La fauna son los SVG rubber-hose de
 * la casa como billboards (mariposa y colibrí) más las abejas ámbar de la
 * floración (capa viva de FloraAguacatal).
 *
 * `foco` (opcional): un punto [x,y,z] que el paso didáctico del host señala
 * con un anillo que respira. Importa three/@react-three → montar SOLO perezosa.
 */
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { Fauna } from '../escenas/FaunaEscena.jsx';
import FloraAguacatal from './FloraAguacatal.jsx';
import {
  ANCHO,
  FONDO,
  alturaFinca,
  zanjaEnX,
  SITIO_CASA,
  SITIOS_CRIOLLO,
  RADIO_COPA,
  aguacatalDeTier,
  centrosCopa,
} from './floraAguacatal.geom.js';
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

/* La identidad del piso templado alto dentro de la familia del valle:
   `ladera` (verde fresco de montaña). El 60% restante lo pone la HORA. */
const FAMILIA_AGUACATAL = 'ladera';

/* Escala de la escena para el kit (cámara↔centro ~15). */
const RADIO_AGUACATAL = 12;

/* El frustum de sombra a medida de la finca (las copas grandes proyectan). */
const SOMBRA_AGUACATAL = { left: -18, right: 18, top: 18, bottom: -8, far: 44 };

/* El camino de la finca: sube culebreando del frente hasta la casa. */
const caminoEnX = (wz) => 2.2 + Math.sin(wz * 0.3) * 1.6 + smoothstep(0, -12, wz) * 6.4;

/* La malla de la finca — el heightfield del KIT con la pintura PROPIA del
   templado alto: pasto fresco al sol, y BAJO CADA COPA el suelo cambia a
   mantillo pardo (la hojarasca gruesa del microclima — la lección pintada en
   el terreno). La zanjilla va húmeda y oscura; el camino, seco. */
function construirFinca(seg, plano, centros) {
  const cPasto = new THREE.Color(VERDES.brote); // pasto al sol del templado
  const cPasto2 = new THREE.Color(VERDES.calidoVivo); // el verde cálido que asoma
  const cMantillo = new THREE.Color(TIERRAS.mantillo); // hojarasca bajo la copa
  const cMantillo2 = new THREE.Color(TIERRAS.mantilloSombra); // el corazón húmedo
  const cCamino = new THREE.Color(mezclar(TIERRAS.camino, TIERRAS.vega, 0.4));
  const cZanja = new THREE.Color(TIERRAS.mantilloSombra).multiplyScalar(0.72);
  const cArcilla = new THREE.Color(TIERRAS.arcilla);
  return construirTerreno({
    ancho: ANCHO,
    fondo: FONDO,
    seg,
    plano,
    altura: alturaFinca,
    pintar: (wx, wz, alt, c) => {
      c.lerpColors(cPasto, cPasto2, 0.5 + 0.5 * ruidoTerreno(wx * 0.9, wz * 0.7));
      // la arcilla asoma a manchas en lo abierto
      c.lerp(cArcilla, smoothstep(0.15, 0.9, ruidoTerreno(wx * 1.4, wz * 1.2)) * 0.18);
      // EL MICROCLIMA: bajo cada copa, el pasto se rinde a la hojarasca
      let sombra = 0;
      for (let i = 0; i < centros.length; i++) {
        const s = centros[i];
        const rad = RADIO_COPA * s.esc;
        const d = Math.hypot(wx - s.pos[0], wz - s.pos[2]);
        sombra = Math.max(sombra, smoothstep(rad * 1.15, rad * 0.35, d));
      }
      if (sombra > 0) {
        c.lerp(cMantillo, sombra * 0.8);
        c.lerp(cMantillo2, sombra * sombra * 0.5);
      }
      // la zanjilla de drenaje, húmeda y oscura, curveando por el frente
      const enZanja =
        smoothstep(1.2, 0.25, Math.abs(wx - zanjaEnX(wz))) *
        smoothstep(1.5, 4.5, wz) *
        smoothstep(16.5, 13.0, wz);
      c.lerp(cZanja, enZanja * 0.85);
      // el caminito seco que sube a la casa
      c.lerp(cCamino, smoothstep(1.15, 0, Math.abs(wx - caminoEnX(wz))) * smoothstep(-13, -2, wz) * 0.9);
    },
  });
}

/* La casa campesina con su patio de cosecha: paredes encaladas, techo de teja,
   canastos y costales de aguacate esperando. Vive PEGADA al criollo gigante —
   la comparación de siluetas ES la lección de escala. */
function CasaPatio({ pos }) {
  return (
    <group position={pos} rotation={[0, -2.35, 0]}>
      {/* la casa: LA casa campesina de la paleta madre (la misma del valle) */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.6, 1.44, 1.9]} />
        <meshLambertMaterial color={CASA.encalado} flatShading />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[2.64, 0.36, 1.94]} />
        <meshLambertMaterial color={CASA.zocalo} flatShading />
      </mesh>
      {/* la puerta y una ventana (la carpintería pintada) */}
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

      {/* el patio de cosecha: canastos con Hass morado-negro y el costal */}
      {[[-1.85, 0.7], [-1.4, 1.05]].map((q, i) => (
        <group key={`c${i}`} position={[q[0], 0, q[1]]}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.24, 0.17, 0.36, 9, 1, true]} />
            <meshLambertMaterial color={CASA.bejuco} flatShading side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.36, 0]} scale={[1, 0.45, 1]}>
            <sphereGeometry args={[0.2, 8, 5]} />
            <meshLambertMaterial color={i % 2 ? '#2c1c26' : '#3f2b3a'} flatShading />
          </mesh>
        </group>
      ))}
      <mesh position={[-1.15, 0.3, 0.35]} rotation={[0, 0.5, 0]} scale={[1, 1.25, 1]}>
        <cylinderGeometry args={[0.22, 0.26, 0.5, 7, 1]} />
        <meshLambertMaterial color={TIERRAS.vega} flatShading />
      </mesh>
    </group>
  );
}

/*
 * La ESCALERA de cosecha recostada al criollo del patio: dos largueros y sus
 * peldaños, apuntando a la copa. Es la seña campesina de la escala — a una
 * mata de café no se le arrima escalera; a ESTE árbol sí.
 */
function EscaleraCosecha() {
  const trunco = SITIOS_CRIOLLO[0];
  const yBase = alturaFinca(trunco[0] + 0.95, trunco[1] + 1.1);
  const base = [trunco[0] + 0.95, yBase, trunco[1] + 1.1];
  // apuntar el larguero hacia el tronco (rotY mira a la mata, rotX la recuesta)
  const rotY = Math.atan2(trunco[0] - base[0], trunco[1] - base[2]);
  const tilt = 0.42;
  return (
    <group position={base} rotation={[0, rotY, 0]}>
      <group rotation={[tilt, 0, 0]}>
        {[-0.24, 0.24].map((x) => (
          <mesh key={x} position={[x, 1.85, 0]}>
            <boxGeometry args={[0.07, 3.7, 0.07]} />
            <meshLambertMaterial color={mezclar(PALETA.madera, PALETA.maderaOscura, 0.4)} flatShading />
          </mesh>
        ))}
        {[0.45, 0.95, 1.45, 1.95, 2.45, 2.95, 3.4].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.52, 0.055, 0.055]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
        ))}
      </group>
      {/* el canasto del cosechero, al pie de la escalera */}
      <group position={[0.55, 0, 0.3]}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.22, 0.16, 0.32, 9, 1, true]} />
          <meshLambertMaterial color={CASA.bejuco} flatShading side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.32, 0]} scale={[1, 0.42, 1]}>
          <sphereGeometry args={[0.18, 8, 5]} />
          <meshLambertMaterial color="#79a13f" flatShading />
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

/* La fauna del templado que la floración y la sombra traen: los SVG
   rubber-hose de la casa como billboards. El colibrí ronda un árbol
   FLORECIDO (ahí está el néctar); las mariposas, lo abierto. */
const FAUNA_AGUACATAL = [
  { tipo: 'colibri', base: [-4.0, 3.8, -6.2], patron: 'revoloteo', size: 30, fase: 0.6, df: 10 },
  { tipo: 'mariposa', base: [-1.2, 2.1, 3.4], patron: 'revoloteo', size: 26, fase: 1.8, df: 9 },
  { tipo: 'mariposa', base: [7.0, 2.5, -1.8], patron: 'revoloteo', size: 22, fase: 2.9, df: 9 },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);
  const conteos = aguacatalDeTier(tier);

  /* La atmósfera VIVA del kit — alimenta el domo y la perspectiva aérea. */
  const atm = useAtmosferaMundo({ familia: FAMILIA_AGUACATAL, reducedMotion });

  /* EL gradiente de bandas de la escena (toma B): terreno y montes comparten
     los mismos escalones de luz — ilustración en movimiento. */
  const bandas = useGradienteBandas();

  /* Los centros de copa del tier: pintan el microclima en el terreno. */
  const centros = useMemo(() => centrosCopa(conteos), [conteos]);

  const geoFinca = useMemo(
    () => construirFinca(perfil.segmentosTerreno, perfil.flatShading, centros),
    [perfil.segmentosTerreno, perfil.flatShading, centros],
  );

  /* Las montañas del fondo, comidas por la niebla DE LA HORA. */
  const montes = useMemo(
    () => ({
      cerca: mezclar(VERDES.monte, atm.niebla, 0.2),
      media: mezclar(VERDES.monte, atm.niebla, 0.28),
      lejos: mezclar(VERDES.monte, atm.niebla, 0.38),
    }),
    [atm.niebla],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_AGUACATAL : FAUNA_AGUACATAL.slice(0, 2)),
    [tier],
  );

  const controls = useRef(null);
  const casaY = alturaFinca(SITIO_CASA[0], SITIO_CASA[1]);

  /* Cuánta luz le FALTA a la hora para que el cultivo se lea (la noche y el
     atardecer bajan `atm.intensidad`; a mediodía esto es ~0). */
  const refuerzo = Math.max(0, 1 - atm.intensidad);

  return (
    <>
      {/* LA ATMÓSFERA DEL KIT: fondo, niebla, luces y estrellas de LA HORA DEL
          VALLE (familia ladera), con el shadow-map de las copas en gama alta. */}
      <AtmosferaMundo
        familia={FAMILIA_AGUACATAL}
        tier={tier}
        reducedMotion={reducedMotion}
        radio={RADIO_AGUACATAL}
        conSuelo={false}
        sombra={SOMBRA_AGUACATAL}
      />

      {/* EL PISO DE LECTURA del aguacatal (mismo remedio del cafetal, #2707):
          las copas perennes son casi negras y de noche el mundo entero caía a
          silueta. Dos luces locales de la escena (no tocan el kit): un relleno
          hemisférico cálido que COMPENSA lo que la hora apaga (de noche sube,
          a mediodía casi no suma) y una clave dorada fija SIN sombras — aclara
          el techo de copa y deja ver el fruto colgando, sin tocar el dibujo de
          la sombra proyectada. El domo y la niebla siguen contando la hora:
          la noche se conserva noche, pero el cultivo se LEE. */}
      <hemisphereLight
        color="#f2e6c8"
        groundColor="#3d4a2a"
        intensity={0.38 + 1.15 * refuerzo}
      />
      <directionalLight
        position={[7, 10, 5]}
        color="#ffe9c0"
        intensity={0.5 + 0.95 * refuerzo}
      />

      {/* El DOMO de la toma B: gradiente cenit→horizonte + glow del sol. */}
      <DomoCielo atm={atm} radio={64} />

      {/* LA FINCA por bandas (recibe la sombra de las copas en gama alta). */}
      <mesh geometry={geoFinca} receiveShadow={perfil.sombras}>
        <meshToonMaterial vertexColors gradientMap={bandas} />
      </mesh>

      {/* las montañas templadas del fondo, comidas por la niebla de la hora */}
      <mesh position={[-14, 2.4, -22]} scale={[9.5, 4.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.media} gradientMap={bandas} />
      </mesh>
      <mesh position={[8, 2.8, -25]} scale={[11, 5.6, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.lejos} gradientMap={bandas} />
      </mesh>
      <mesh position={[21, 1.8, -20]} scale={[8, 3.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.cerca} gradientMap={bandas} />
      </mesh>

      {/* EL AGUACATAL: los árboles grandes, frutos, panículas, jóvenes, maíz,
          el plateo del envés, la luz colada y las abejas. */}
      <FloraAguacatal tier={tier} reducedMotion={reducedMotion} />

      {/* la casa con su patio, PEGADA al criollo gigante */}
      <CasaPatio pos={[SITIO_CASA[0], casaY, SITIO_CASA[1]]} />

      {/* la escalera de cosecha recostada al criollo: "a este árbol se le sube" */}
      <EscaleraCosecha />

      {/* LA VIDA del templado: colibrí en la floración, mariposas en lo abierto */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 3.0, -3]}
        enablePan={false}
        enableZoom
        minDistance={7}
        maxDistance={26}
        minPolarAngle={0.5}
        maxPolarAngle={1.48}
        minAzimuthAngle={-1.15}
        maxAzimuthAngle={1.15}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.12}
      />
      {/* La LLEGADA del kit: dolly de establishing BAJO, con la mirada apenas
          alzada — entrar a la finca es que las copas le hagan techo a uno. */}
      <CamaraDirector
        controls={controls}
        reposo={[2.2, 4.0, 15.2]}
        mirada={[0, 3.6, -3]}
        respiro={0.04}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoAguacatal"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo del aguacate. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaAguacatalVivo({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`aguacatal-canvas${listo ? ' aguacatal-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [2.2, 4.0, 15.2], fov: 47 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} foco={foco} />
    </Canvas>
  );
}
