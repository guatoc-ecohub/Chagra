/*
 * EscenaPapaVivo — el MUNDO donde vive la papa (piso frío, 2.000–3.200 m).
 *
 * Una LADERA de tierra fría EN LA HORA VIVA DEL VALLE: la atmósfera ya no es
 * un cielo clavado sino la del kit compartido (`AtmosferaMundo`, familia
 * `ladera`) — el papal amanece, aclara y anochece CON el valle. Y en clave de
 * la TOMA A (naturalista, decisión por piso térmico): la NIEBLA es la
 * protagonista — bruma lechosa verde-plata que se acerca y se come los cerros
 * (la misma BRUMA que ganó en el bosque #2513) — y una luz fría de altura que
 * platea sin dorar. El cultivo se cuenta como es — los SURCOS: caballones de
 * tierra negra amontonada a curva de nivel, con la mata de papa aporcada
 * encima de cada lomo, horneados EN EL RELIEVE del terreno. Alrededor el
 * pajonal amarillo del frío, la loma alta con frailejones en silueta, la
 * casita campesina con sus costales y el claro de la COSECHA con las papas
 * criollas destapadas. La cámara LLEGA (CamaraDirector) y se gira con el dedo.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`: 'alto' con
 * sombras + vaho; 'medio' frugal; 'bajo' mínimo. Con `reducedMotion` el mundo
 * monta QUIETO (frameloop a demanda). La fauna son los SVG rubber-hose de la
 * casa como billboards (`Fauna` de FaunaEscena): la mariposa y el colibrí
 * chillón que la flor de papa sí convoca.
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
import FloraPapa from './FloraPapa.jsx';
import {
  ANCHO,
  FONDO,
  alturaLadera,
  reliefSurco,
  SITIO_CASA,
  SITIO_COSECHA,
} from './floraPapa.geom.js';
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
} from '../paleta/index.js';

/* La identidad del piso frío dentro de la familia del valle: `ladera`
   ("bruma sí, pero verde-plata, no celeste frío"). La HORA pone el resto. */
const FAMILIA_PAPAL = 'ladera';

/* Escala de la escena para el kit (cámara↔centro ~15.5). La niebla NO la pone
   el kit aquí (conNiebla={false}): en la toma A la bruma es la protagonista y
   este mundo la monta más CERCA y más lechosa (abajo, BRUMA_FRIA). */
const RADIO_PAPAL = 12;

/* La bruma verde-plata de la toma A (#2513, la que ganó en el bosque): el fog
   de la hora se sesga hacia esta leche fría — de noche la bruma CEDE y el
   índigo del cine manda (sin esto la noche queda gris-lavada). */
const BRUMA_FRIA = '#c6d1ce';

/* El frustum de sombra a medida del papal (el sol duro de la altura). */
const SOMBRA_PAPAL = { left: -17, right: 17, top: 17, bottom: -7, far: 44 };

/* La malla de la ladera — el heightfield del KIT (mismo andamiaje que todos
   los mundos) con la pintura PROPIA del piso frío: el LOMO del caballón en
   tierra negra recién aporcada, el surco hondo entre lomos más húmedo y
   oscuro, y afuera del lote el pajonal amarillo-verde del frío. Los caballones
   van en la ALTURA (alturaLadera ya los trae horneados): relieve de verdad. */
function construirLadera(seg, plano) {
  const cPajonal = new THREE.Color(mezclar(TIERRAS.pajonal, VERDES.paramoLiquen, 0.5));
  const cPajonal2 = new THREE.Color(VERDES.paramoLiquen);
  const cLomo = new THREE.Color(mezclar(TIERRAS.turba, NEUTROS.tinta, 0.3)); // tierra negra del caballón
  const cLomoSeco = new THREE.Color(mezclar(TIERRAS.turba, TIERRAS.camino, 0.25)); // la cresta que el sol secó
  const cSurco = new THREE.Color(mezclar(TIERRAS.turba, NEUTROS.tinta, 0.65)); // el fondo húmedo entre lomos
  const cCamino = new THREE.Color(mezclar(TIERRAS.camino, TIERRAS.vega, 0.25));
  const cLoma = new THREE.Color(mezclar(VERDES.paramoLiquen, VERDES.paramoMusgo, 0.4)); // la loma alta, parda de frío
  return construirTerreno({
    ancho: ANCHO,
    fondo: FONDO,
    seg,
    plano,
    altura: alturaLadera,
    pintar: (wx, wz, alt, c) => {
      const s = reliefSurco(wx, wz);
      const enLoma = smoothstep(-8, -17, wz);
      // base: pajonal con manchas, y hacia la loma alta se apaga de frío
      c.lerpColors(cPajonal, cPajonal2, 0.5 + 0.5 * ruidoTerreno(wx * 0.9, wz * 0.7));
      c.lerp(cLoma, enLoma * 0.55);
      // dentro del lote: el surco húmedo de fondo…
      c.lerp(cSurco, s.lote * 0.85);
      // …y el LOMO del caballón encima, tierra negra con la cresta seca
      const lomo = smoothstep(0.2, 0.8, s.lomo);
      c.lerp(cLomo, lomo);
      c.lerp(cLomoSeco, smoothstep(0.62, 1, s.lomo) * 0.85);
      // el claro de la COSECHA: tierra abierta, ya sin surco
      const dCx = wx - SITIO_COSECHA[0];
      const dCz = wz - SITIO_COSECHA[1];
      c.lerp(cLomo, smoothstep(9, 2.5, dCx * dCx + dCz * dCz) * 0.8);
      // el caminito por donde se entra al lote, al frente
      c.lerp(
        cCamino,
        smoothstep(1.3, 0, Math.abs(wx - 4 - Math.sin(wz * 0.35) * 2.4)) * smoothstep(4, 14, wz),
      );
    },
  });
}

/* La casita campesina de tierra fría, arriba al fondo: paredes de adobe
   encalado, techo de teja, la ruana colgada — y en el patio los COSTALES de
   papa cosidos, listos pal mercado. Insinuada, que el mundo es el surco. */
function CasaFria({ pos }) {
  return (
    <group position={pos} rotation={[0, 0.4, 0]}>
      {/* la casa: LA casa campesina de la paleta madre (la misma del valle) */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[2.4, 1.4, 1.8]} />
        <meshLambertMaterial color={CASA.encalado} flatShading />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[2.44, 0.34, 1.84]} />
        <meshLambertMaterial color={CASA.zocalo} flatShading />
      </mesh>
      {/* la puerta y la ventanita (la carpintería pintada de la casa) */}
      <mesh position={[0.42, 0.6, 0.91]}>
        <boxGeometry args={[0.42, 0.92, 0.06]} />
        <meshLambertMaterial color={CASA.carpinteria} flatShading />
      </mesh>
      <mesh position={[-0.55, 0.84, 0.91]}>
        <boxGeometry args={[0.46, 0.4, 0.06]} />
        <meshLambertMaterial color={CASA.carpinteria} flatShading />
      </mesh>
      {/* techo a dos aguas de teja */}
      <mesh position={[0, 1.56, -0.58]} rotation={[-0.6, 0, 0]}>
        <boxGeometry args={[2.8, 0.08, 1.42]} />
        <meshLambertMaterial color={CASA.tejaSombra} flatShading />
      </mesh>
      <mesh position={[0, 1.56, 0.58]} rotation={[0.6, 0, 0]}>
        <boxGeometry args={[2.8, 0.08, 1.42]} />
        <meshLambertMaterial color={CASA.teja} flatShading />
      </mesh>
      {/* la chimenea de fogón de leña (en el frío se cocina con candela) */}
      <mesh position={[-0.85, 1.85, -0.3]}>
        <boxGeometry args={[0.24, 0.6, 0.24]} />
        <meshLambertMaterial color={mezclar(NEUTROS.lamina, TIERRAS.rocaParamo, 0.5)} flatShading />
      </mesh>

      {/* los COSTALES de papa cosidos en el patio, la cosecha que ya subió */}
      {[
        [1.7, 0.55, 0], [2.15, 0.75, 0.18], [1.9, 0.15, -0.55],
      ].map((q, i) => (
        <group key={`s${i}`} position={[q[0], 0, q[1] ?? 0]} rotation={[0, q[2] ?? 0, 0]}>
          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.24, 0.28, 0.68, 8, 1]} />
            <meshLambertMaterial color={TIERRAS.vega} flatShading />
          </mesh>
          <mesh position={[0, 0.7, 0]} scale={[1, 0.5, 1]}>
            <sphereGeometry args={[0.2, 7, 5]} />
            <meshLambertMaterial color={mezclar(TIERRAS.vega, TIERRAS.camino, 0.35)} flatShading />
          </mesh>
        </group>
      ))}

      {/* el azadón recostado a la pared (la herramienta del surco) */}
      <group position={[-1.28, 0, 0.72]} rotation={[0, 0, 0.35]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.2, 5, 1]} />
          <meshLambertMaterial color={TIERRAS.camino} flatShading />
        </mesh>
        <mesh position={[0.1, 0.06, 0]} rotation={[0, 0, -1.2]}>
          <boxGeometry args={[0.3, 0.14, 0.05]} />
          <meshLambertMaterial color={mezclar(NEUTROS.lamina, NEUTROS.tinta, 0.3)} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* El rincón de COSECHA: el canasto con papas y la manta con la saca tendida —
   los tubérculos instanciados de FloraPapa ya ponen la diversidad al piso. */
function RinconCosecha({ pos }) {
  return (
    <group position={pos}>
      {/* el canasto de bejuco con su papa adentro */}
      <group position={[0.6, 0, -1.2]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.3, 0.22, 0.4, 9, 1, true]} />
          <meshLambertMaterial color={CASA.bejuco} flatShading side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.4, 0]} scale={[1, 0.45, 1]}>
          <sphereGeometry args={[0.26, 8, 5]} />
          <meshLambertMaterial color={mezclar(ACENTOS.guayacan, ACENTOS.ambar, 0.5)} flatShading />
        </mesh>
      </group>
      {/* la manta tendida donde se aparta la saca por tamaños */}
      <mesh position={[-0.9, 0.03, 0.9]} rotation={[-Math.PI / 2, 0, 0.4]}>
        <planeGeometry args={[1.7, 1.2]} />
        <meshLambertMaterial color={mezclar(TIERRAS.vega, NEUTROS.cal, 0.35)} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* el azadón clavado en el montículo, en plena faena */}
      <group position={[1.3, 0, 0.6]} rotation={[0.5, 0.6, -0.35]}>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.24, 5, 1]} />
          <meshLambertMaterial color={TIERRAS.camino} flatShading />
        </mesh>
        <mesh position={[0.1, 0.04, 0]} rotation={[0, 0, -1.2]}>
          <boxGeometry args={[0.3, 0.15, 0.05]} />
          <meshLambertMaterial color={mezclar(NEUTROS.lamina, NEUTROS.tinta, 0.3)} flatShading />
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

/* La fauna del papal en flor: los SVG rubber-hose de la casa como billboards
   (contrato del operador: el bicho pone el cuerpo, la escena la coreografía).
   Pocas y por criterio: la flor de papa sí convoca su visita. */
const FAUNA_PAPAL = [
  { tipo: 'mariposa', base: [-3.5, 1.5, 2.4], patron: 'revoloteo', size: 26, fase: 0.6, df: 9 },
  { tipo: 'colibri', base: [3.8, 2.2, -1.8], patron: 'revoloteo', size: 30, fase: 1.8, df: 10 },
  { tipo: 'mariposa', base: [7.5, 1.7, 3.2], patron: 'revoloteo', size: 22, fase: 2.7, df: 9 },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);

  /* La atmósfera VIVA (misma resolución que monta AtmosferaMundo: barata,
     cambia por franja) — alimenta la bruma propia y los cerros del fondo. */
  const atm = useAtmosferaMundo({ familia: FAMILIA_PAPAL, reducedMotion });

  /* La NIEBLA PROTAGONISTA de la toma A: el fog de la hora sesgado a la leche
     verde-plata, y MÁS CERCA que en los pisos calientes (aquí la bruma manda).
     De noche la bruma cede al índigo del cine (kFria baja). */
  const nieblaFria = useMemo(
    () => mezclar(atm.niebla, BRUMA_FRIA, atm.franja === 'noche' ? 0.25 : 0.5),
    [atm.niebla, atm.franja],
  );

  const geoLadera = useMemo(
    () => construirLadera(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  /* Los cerros del fondo, comidos por la bruma DE LA HORA (perspectiva aérea
     viva: platean de día, azulean de noche, con el valle). */
  const cerros = useMemo(
    () => ({
      cerca: mezclar(VERDES.paramoHoja, nieblaFria, 0.22),
      media: mezclar(VERDES.paramoHoja, nieblaFria, 0.3),
      lejos: mezclar(VERDES.paramoHoja, nieblaFria, 0.4),
      filo: mezclar(TIERRAS.rocaParamo, nieblaFria, 0.45),
    }),
    [nieblaFria],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_PAPAL : FAUNA_PAPAL.slice(0, 2)),
    [tier],
  );

  const controls = useRef(null);
  const casaY = alturaLadera(SITIO_CASA[0], SITIO_CASA[1]);
  const cosechaY = alturaLadera(SITIO_COSECHA[0], SITIO_COSECHA[1]);

  /* Cuánta luz le FALTA a la hora para que el cultivo se lea (la noche y el
     atardecer bajan `atm.intensidad`; a mediodía esto es ~0). */
  const refuerzo = Math.max(0, 1 - atm.intensidad);

  return (
    <>
      {/* LA ATMÓSFERA DEL KIT: fondo, luces y estrellas de LA HORA DEL VALLE
          (familia ladera), con el shadow-map del sol duro en gama alta. La
          niebla va aparte (protagonista, abajo). */}
      <AtmosferaMundo
        familia={FAMILIA_PAPAL}
        tier={tier}
        reducedMotion={reducedMotion}
        radio={RADIO_PAPAL}
        conSuelo={false}
        conNiebla={false}
        sombra={SOMBRA_PAPAL}
      />
      {/* EL PISO DE LECTURA del papal (mismo remedio del cafetal #2707, el
          aguacatal #2709 y la lechería #2712): de noche los caballones de
          tierra negra y las matas aporcadas caían a bulto negro y el lote no
          se leía. Dos luces locales de la escena (no tocan el kit): un relleno
          hemisférico cálido que COMPENSA lo que la hora apaga (de noche sube,
          a mediodía casi no suma) y una clave dorada fija SIN sombras — deja
          ver el surco, la flor lila y la cosecha destapada sin tocar el dibujo
          de la sombra proyectada. El domo, las estrellas y la bruma siguen
          contando la hora: la noche se conserva noche, pero el papal se LEE. */}
      <hemisphereLight
        color="#f2e6c8"
        groundColor="#453d2a"
        intensity={0.38 + 1.15 * refuerzo}
      />
      <directionalLight
        position={[7, 10, 5]}
        color="#ffe9c0"
        intensity={0.5 + 0.95 * refuerzo}
      />

      {/* La bruma lechosa de la toma A: cerca y espesa — se come los cerros. */}
      {perfil.fog && <fog attach="fog" args={[nieblaFria, 14, 46]} />}
      {/* La luz FRÍA de la altura: un relleno plata desde arriba que platea
          los lomos sin dorarlos (el toque naturalista del piso frío). */}
      <directionalLight position={[-4, 10, -2]} intensity={0.18} color="#cfe0e4" />

      {/* LA LADERA con sus caballones horneados en el relieve */}
      <mesh geometry={geoLadera} receiveShadow={perfil.sombras}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* los cerros fríos del fondo, comidos por la bruma de la hora */}
      <mesh position={[-14, 4.2, -24]} scale={[10, 5.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={cerros.media} />
      </mesh>
      <mesh position={[6, 5.2, -27]} scale={[12, 7, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={cerros.lejos} />
      </mesh>
      <mesh position={[21, 3.4, -23]} scale={[8, 4.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={cerros.cerca} />
      </mesh>
      {/* y detrasito, el filo pelado con su neblina pegada */}
      <mesh position={[-3, 7.8, -31]} scale={[16, 5, 5]}>
        <sphereGeometry args={[1, 10, 7]} />
        <meshLambertMaterial color={cerros.filo} />
      </mesh>

      {/* EL PAPAL: matas en surcos, flores, cosecha, pajonal, frailejones */}
      <FloraPapa tier={tier} reducedMotion={reducedMotion} />

      {/* la casita de tierra fría con sus costales, arriba al fondo */}
      <CasaFria pos={[SITIO_CASA[0], casaY, SITIO_CASA[1]]} />

      {/* el rincón de la cosecha: canasto, manta y azadón en faena */}
      <RinconCosecha pos={[SITIO_COSECHA[0], cosechaY, SITIO_COSECHA[1]]} />

      {/* LA VIDA que la flor convoca: mariposas y el colibrí */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 2.8, -3]}
        enablePan={false}
        enableZoom
        minDistance={8}
        maxDistance={26}
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
          al papal se siente como subir a la tierra fría, una vez por sesión. */}
      <CamaraDirector
        controls={controls}
        reposo={[2, 5.4, 15.5]}
        mirada={[0, 3.8, -3]}
        respiro={0.04}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoPapal"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo del papal de tierra fría. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaPapaVivo({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`papal-canvas${listo ? ' papal-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [2, 5.4, 15.5], fov: 46 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} foco={foco} />
    </Canvas>
  );
}
