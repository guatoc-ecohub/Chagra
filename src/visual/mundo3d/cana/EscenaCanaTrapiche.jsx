/*
 * EscenaCanaTrapiche — el MUNDO DE LA CAÑA Y EL TRAPICHE (tierra caliente).
 *
 * Un mundo de DOS MITADES que se necesitan. A la izquierda el CAÑAVERAL: un
 * lote alto, en surcos, que se mece cuando entra la brisa. A la derecha la
 * ENRAMADA DEL TRAPICHE, con su molienda, su hornilla prendida y sus gaveras.
 * En el medio, la era pisada por donde entra la caña cortada. La lección es el
 * camino entre las dos: cómo una mata de dos veces la altura de uno termina
 * siendo un bloque de panela que cabe en la mano.
 *
 * LA LUZ. Este es el único mundo de Chagra con candela de verdad, y por eso es
 * el único donde la fuente principal puede no ser el sol. La boca de la hornilla
 * quema bagazo todo el día: de mañana es un acento tibio bajo el techo, al
 * atardecer empieza a ganarle al cielo, y de noche es lo ÚNICO que alumbra la
 * enramada. Eso no se inventó para que se viera bonito — es lo que pasa en una
 * molienda de verdad, y por eso `fuerzaDeFranja` cuelga de la hora del valle y
 * no de un antojo.
 *
 * LA ESCALA. Una caña madura le pasa MUY por encima a una persona, y un plano
 * general no puede contar eso: de lejos todo se ve chiquito. Por eso la lección
 * MUEVE LA CÁMARA (`CamaraLeccion`): el primer paso la mete a 1,55 m del suelo
 * DENTRO de un pasillo entre surcos, mirando hacia arriba, con la caña cerrada a
 * lado y lado. Ahí es donde el cañaveral se siente alto. Después de cada
 * movimiento la cámara se la devuelve al dedo del que está mirando.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`: 'alto' con
 * sombras, viento, vapor y candela con luz; 'medio' frugal; 'bajo' mínimo pero
 * legible. Con `reducedMotion` el mundo monta QUIETO — la candela se planta en
 * un instante fijo y el lote deja de mecerse, pero los dos siguen ahí.
 *
 * Importa three/@react-three → montar SOLO perezosa (lazy).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { Fauna } from '../escenas/FaunaEscena.jsx';
import FaunaCalido from '../escenas/FaunaCalido.jsx';
import Canaveral from './Canaveral.jsx';
import Trapiche from './Trapiche.jsx';
import {
  ANCHO,
  FONDO,
  alturaVega,
  caminoX,
  enLaEra,
  SITIO_TRAPICHE,
  Y_ERA,
  geomMuroCanaveral,
  PAL as PAL_CANA,
} from './floraCana.geom.js';
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
import { mezclar, VERDES, TIERRAS, LUCES, PALETA } from '../paleta/index.js';

/* La identidad de la tierra caliente cañera dentro de la familia del valle:
   `plaza` — el dorado seco de media mañana en tierra baja. El otro 60 % lo pone
   LA HORA, igual que en todos los mundos. */
const FAMILIA_CANA = 'plaza';

/* Escala de la escena para la niebla y las luces del kit. */
const RADIO_CANA = 15;

/* El frustum de sombra a medida del lote y la enramada. */
const SOMBRA_CANA = { left: -24, right: 24, top: 20, bottom: -10, far: 60 };

/*
 * CUÁNTO MANDA EL FUEGO SEGÚN LA HORA. Esta tabla es la decisión de fotografía
 * del mundo: de día la hornilla es un detalle tibio; al caer la tarde empieza a
 * pintar el techo y las pailas; de noche la enramada existe SOLO porque hay
 * candela. Una molienda no se para porque anochezca — al contrario, muchas
 * arrancan de madrugada y terminan de noche.
 */
const FUERZA_FUEGO = {
  amanecer: 1.35,
  manana: 0.75,
  mediodia: 0.58,
  tarde: 0.82,
  atardecer: 1.5,
  noche: 1.95,
};
const fuerzaDeFranja = (franja) => FUERZA_FUEGO[franja] ?? 0.9;

/* -------------------------------------------------------------------------- */
/*  El terreno                                                                 */
/* -------------------------------------------------------------------------- */

/* La vega cañera: tierra de labor oscura entre los surcos, la era del trapiche
   PISADA y clara (años de pasarle caña y bagazo por encima), y el camino por
   donde entra la carga. */
function construirVega(seg, plano) {
  const cLabor = new THREE.Color(TIERRAS.siembra); // tierra removida del lote
  const cSeca = new THREE.Color(TIERRAS.camino); // lo que se abre al sol
  const cVerde = new THREE.Color(VERDES.trabajo); // la arvense de la calle
  const cEra = new THREE.Color(mezclar(PALETA.tierraClara, PALETA.concreto, 0.35));
  const cBagazo = new THREE.Color(PAL_CANA.hojarascaSeca);

  return construirTerreno({
    ancho: ANCHO,
    fondo: FONDO,
    seg,
    plano,
    altura: alturaVega,
    pintar: (wx, wz, alt, c) => {
      // el fondo del lote: tierra de labor con arvense a manchas
      c.lerpColors(cLabor, cVerde, 0.35 + 0.4 * ruidoTerreno(wx * 0.8, wz * 0.65));
      c.lerp(cSeca, smoothstep(-0.1, 0.9, ruidoTerreno(wx * 1.5, wz * 1.2)) * 0.4);

      // LA ERA del trapiche: pisada, clara y sin una brizna de pasto
      const era = enLaEra(wx, wz, 1.15) ? 1 : 0;
      const suave = smoothstep(
        1.35,
        0.8,
        Math.max(Math.abs(wx - SITIO_TRAPICHE[0]) / 8.4, Math.abs(wz - SITIO_TRAPICHE[1]) / 7.0),
      );
      c.lerp(cEra, Math.max(era * 0.55, suave * 0.72));
      // y regada de bagacillo, que es lo que uno pisa alrededor de un trapiche
      c.lerp(cBagazo, suave * 0.3 * smoothstep(0.3, 0.85, ruidoTerreno(wx * 2.2 + 7, wz * 2.2)));

      // EL CAMINO de llegada: por ahí sube la caña cortada
      c.lerp(cSeca, smoothstep(1.9, 0, Math.abs(wx - caminoX(wz))) * smoothstep(-3, 12, wz) * 0.8);
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  La cámara de la lección                                                    */
/* -------------------------------------------------------------------------- */

/*
 * Lleva la cámara al sitio del paso que se está leyendo y SE RETIRA. No es un
 * riel: en cuanto termina el viaje, el que mira vuelve a mandar con el dedo.
 * Sin esto, el paso del cañaveral no se podría contar — la altura de la caña
 * solo se siente parado adentro, y desde el plano general no se ve.
 */
function CamaraLeccion({ vista, token, controls, reducedMotion }) {
  const { camera } = useThree();
  const viaje = useRef(null);
  const anterior = useRef(token);

  useEffect(() => {
    // En el primer montaje no se toca nada: de la llegada se encarga
    // CamaraDirector. Solo se viaja cuando el que mira CAMBIA de paso.
    if (token === anterior.current || !vista) return;
    anterior.current = token;
    const ctr = controls.current;
    const desdeMira = ctr ? ctr.target.clone() : new THREE.Vector3();
    viaje.current = {
      t: 0,
      dur: reducedMotion ? 0.001 : 1.5,
      desdePos: camera.position.clone(),
      haciaPos: new THREE.Vector3(...vista.pos),
      desdeMira,
      haciaMira: new THREE.Vector3(...vista.mira),
    };
  }, [token, vista, camera, controls, reducedMotion]);

  useFrame((_, dt) => {
    const v = viaje.current;
    const ctr = controls.current;
    if (!v || !ctr) return;
    v.t = Math.min(1, v.t + dt / v.dur);
    // easeInOutCubic: sale suave, llega suave. Un corte duro marea.
    const e = v.t < 0.5 ? 4 * v.t ** 3 : 1 - (-2 * v.t + 2) ** 3 / 2;
    camera.position.lerpVectors(v.desdePos, v.haciaPos, e);
    ctr.target.lerpVectors(v.desdeMira, v.haciaMira, e);
    ctr.update();
    if (v.t >= 1) viaje.current = null;
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  El anillo del paso                                                         */
/* -------------------------------------------------------------------------- */

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
      <ringGeometry args={[1.05, 1.4, 32]} />
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

/* -------------------------------------------------------------------------- */
/*  La fauna                                                                   */
/* -------------------------------------------------------------------------- */

/* Los bichos que de verdad se paran en un trapiche. El guarapo dulce y
   destapado es un imán: a una molienda le llegan mariposas y abejas al olor
   desde lejos, y por eso la canoa y la batea siempre tienen visita. */
const FAUNA_TRAPICHE = [
  { tipo: 'mariposa', base: [9.6, 1.9, 0.9], patron: 'revoloteo', size: 26, fase: 0.6, df: 9 },
  { tipo: 'mariposa', base: [14.4, 1.7, 4.8], patron: 'revoloteo', size: 23, fase: 2.4, df: 9 },
  { tipo: 'escarabajo', base: [4.2, 0.4, 6.2], patron: 'reptar', size: 20, fase: 1.2, df: 8 },
];

/* La fauna emblemática del piso CÁLIDO, que es donde vive la caña de trapiche
   (tierra caliente y falda baja, muy por debajo del cafetal). Billboards SVG
   con su coreografía por nicho. Orden = prominencia: el recorte por tier deja
   siempre lo insignia. */
const FAUNA_CALIDO_CANA = [
  { tipo: 'guacamaya', base: [-4, 7.2, -8], patron: 'vuela', size: 60, fase: 0.3, df: 13, title: 'Guacamaya bandera (Ara macao)' },
  { tipo: 'tucan', base: [-13.5, 4.2, 2.5], patron: 'posa', size: 56, fase: 1.4, df: 10, title: 'Tucán pechiblanco (Ramphastos tucanus)' },
  { tipo: 'morfo', base: [-6.5, 2.4, 7.5], patron: 'morfo', size: 38, fase: 0.9, df: 9, title: 'Morfo azul (Morpho peleides)' },
  { tipo: 'mico', base: [17.5, 3.6, -7.5], patron: 'trepa', size: 50, fase: 2.2, df: 10, title: 'Mico maicero (Saimiri sciureus)' },
];

/* -------------------------------------------------------------------------- */
/*  El diorama                                                                 */
/* -------------------------------------------------------------------------- */

function Diorama({ tier, reducedMotion, foco, vista, vistaToken }) {
  const perfil = perfilDeTier(tier);
  const atm = useAtmosferaMundo({ familia: FAMILIA_CANA, reducedMotion });
  const bandas = useGradienteBandas();
  const controls = useRef(null);

  const geoVega = useMemo(
    () => construirVega(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  /* EL MURO DE CAÑAVERAL DEL FONDO. Sin esto el lote se acaba en seco y se ve
     el borde del mundo. Y sirve para lo otro: a media distancia un cañaveral
     tiene que seguir leyéndose como caña — una masa vertical de borde superior
     RASGADO, nunca una fila de conos (el error que se pagó en el cafetal). */
  const geoMuro = useMemo(
    () => geomMuroCanaveral({ largo: 62, alto: 4.1, semilla: 88, dientes: perfil.flatShading ? 34 : 48 }),
    [perfil.flatShading],
  );
  const geoMuroLado = useMemo(
    () => geomMuroCanaveral({ largo: 40, alto: 3.8, semilla: 91, dientes: perfil.flatShading ? 22 : 32 }),
    [perfil.flatShading],
  );

  const matMuro = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );

  const montes = useMemo(
    () => ({
      cerca: mezclar(VERDES.monte, atm.niebla, 0.24),
      media: mezclar(VERDES.monte, atm.niebla, 0.34),
      lejos: mezclar(VERDES.monte, atm.niebla, 0.46),
    }),
    [atm.niebla],
  );

  const fuerza = fuerzaDeFranja(atm.franja);

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_TRAPICHE : FAUNA_TRAPICHE.slice(0, 1)),
    [tier],
  );
  const faunaCalido = useMemo(
    () => (tier === 'alto' ? FAUNA_CALIDO_CANA : FAUNA_CALIDO_CANA.slice(0, 2)),
    [tier],
  );

  const yTrapiche = Y_ERA;

  return (
    <>
      {/* La atmósfera del kit: fondo, niebla, sol y estrellas de LA HORA DEL
          VALLE (familia plaza), con el shadow-map del lote en gama alta. */}
      <AtmosferaMundo
        familia={FAMILIA_CANA}
        tier={tier}
        reducedMotion={reducedMotion}
        radio={RADIO_CANA}
        conSuelo={false}
        sombra={SOMBRA_CANA}
      />
      <DomoCielo atm={atm} radio={78} />

      {/* LA VEGA por bandas (recibe la sombra del lote y de la enramada). */}
      <mesh geometry={geoVega} receiveShadow={perfil.sombras}>
        <meshToonMaterial vertexColors gradientMap={bandas} />
      </mesh>

      {/* Los montes de tierra caliente al fondo, comidos por la niebla de la
          hora (perspectiva aérea viva: al atardecer se doran). */}
      <mesh position={[-16, 3.2, -30]} scale={[13, 5.4, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.media} gradientMap={bandas} />
      </mesh>
      <mesh position={[12, 3.8, -34]} scale={[15, 7.0, 7]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.lejos} gradientMap={bandas} />
      </mesh>
      <mesh position={[30, 2.4, -26]} scale={[10, 4.2, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.cerca} gradientMap={bandas} />
      </mesh>

      {/* El cañaveral que sigue más allá de lo sembrado a mano. */}
      <mesh geometry={geoMuro} material={matMuro} position={[-4, alturaVega(-4, -21) - 0.3, -21.5]} />
      <mesh
        geometry={geoMuroLado}
        material={matMuro}
        position={[-23.5, alturaVega(-23, -2) - 0.3, -2]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* EL LOTE: surcos, chala, penachos y la onda del viento. */}
      <Canaveral tier={tier} reducedMotion={reducedMotion} />

      {/* LA ENRAMADA, plantada en su era aplanada. */}
      <group position={[SITIO_TRAPICHE[0], yTrapiche, SITIO_TRAPICHE[1]]}>
        <Trapiche tier={tier} reducedMotion={reducedMotion} fuerza={fuerza} />
      </group>

      {/* La vida que el guarapo dulce atrae, y la del piso cálido alrededor. */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}
      {perfil.criaturas > 0 && <FaunaCalido items={faunaCalido} reducedMotion={reducedMotion} />}

      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        ref={controls}
        makeDefault
        target={[3.5, 2.6, 0.5]}
        enablePan={false}
        enableZoom
        minDistance={5}
        maxDistance={34}
        minPolarAngle={0.28}
        maxPolarAngle={1.5}
        enableDamping
        dampingFactor={0.08}
        autoRotate={false}
      />

      {/* La LLEGADA: dolly de establishing, una vez por sesión. */}
      <CamaraDirector
        controls={controls}
        reposo={[7.5, 2.6, 21]}
        mirada={[3.5, 3.0, 0.5]}
        respiro={0.035}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoCanaTrapiche"
      />

      {/* Y el viaje a cada paso de la lección (ahí se siente la altura). */}
      <CamaraLeccion
        vista={vista}
        token={vistaToken}
        controls={controls}
        reducedMotion={reducedMotion}
      />

      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo de la caña y el trapiche. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean,
 *          foco?: number[]|null, vista?: {pos:number[], mira:number[]}|null,
 *          vistaToken?: number}} props
 */
export default function EscenaCanaTrapiche({
  tier = 'alto',
  reducedMotion = false,
  foco = null,
  vista = null,
  vistaToken = 0,
}) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`cana-canvas${listo ? ' cana-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [7.5, 2.6, 21], fov: 52 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama
        tier={tier}
        reducedMotion={reducedMotion}
        foco={foco}
        vista={vista}
        vistaToken={vistaToken}
      />
    </Canvas>
  );
}
