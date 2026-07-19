/*
 * EscenaCafe — ARQUETIPO `cafe`: la LADERA CAFETERA BAJO SOMBRA, entera.
 *
 * SEGUNDA TOMA del mundo del café. La primera era un diorama de mesa (un
 * círculo de 2 m con esferas verdes): pobre al lado del valle, con la entrada
 * amontonada y un café que podía ser cualquier arbusto. Esta toma monta EL
 * MUNDO que ya existía en `cafetal/` (la ladera de 38×36 m con su geografía
 * determinista) dentro del contrato del arquetipo — atmósfera de la franja,
 * hotspots-puerta, Angelita, cámara de director — y responde reclamo por
 * reclamo:
 *
 *   · RIQUEZA (la vara del valle): ladera real en heightfield pintado (arvenses,
 *     tierra roja andina, mantillo), los TRES ESTRATOS del café de sombra
 *     (cafetos abajo, plátano intercalado en medio, guamos y nogales haciendo
 *     techo), montañas del fondo comidas por la niebla de la hora, velos de
 *     bruma entre planos, la luz colada bajo las copas (gama alta) y la casa
 *     con su beneficiadero coronando la loma.
 *   · ENTRADA CON AIRE: un solo punto focal — el CAFETO PROTAGONISTA cargado de
 *     cereza junto al camino de llegada — y las demás puertas repartidas EN
 *     PROFUNDIDAD ladera arriba (sombrío → roya → trampa → beneficio): el ojo
 *     sube con el terreno en vez de tropezar con un montón.
 *   · EL CAFÉ SE LEE COMO CAFÉ: la mata protagonista trae la anatomía real del
 *     arábica (geomCafeto): porte columnar, PISOS de ramas plagiotrópicas, hoja
 *     elíptica oscura lustrosa y el racimo de CEREZA PEGADO A LA RAMA en
 *     cuentas apretadas — verde, pintón, rojo y vino conviviendo, porque la
 *     maduración despareja es la verdad del arábica (por eso se cosecha a mano
 *     en pases). La roya es una mata señalada con su polvillo naranja bajo la
 *     hoja; la broca, su trampa artesanal roja junto al surco. Señal, no drama.
 *
 * Comparte geografía y flora con EscenaCafetalVivo (floraCafetal.geom): una
 * sola verdad del cafetal, dos tomas. Todo primitivas Lambert sin sombras
 * (contrato de EscenaBase3D), una draw-call por especie (InstancedMesh).
 */
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';
import { CIELOS, PALETA, mezclarCielo, mezclar } from '../atmosferaMadre.js';
import useCicloDia from '../useCicloDia.js';
import { presetDeHora } from '../cielosHoraData.js';
import { perfilDeTier } from '../deviceTier.js';
import FloraCafetal from '../cafetal/FloraCafetal.jsx';
import CasaBeneficio from '../cafetal/CasaBeneficio.jsx';
import {
  alturaLadera,
  construirLadera,
  calidadCafetal,
  geomCafeto,
  SITIO_CASA,
  PAL,
} from '../cafetal/floraCafetal.geom.js';
import { VERDES, NIEBLAS } from '../paleta/index.js';

/* La identidad atmosférica del piso templado: la familia del corral y el
   cafetal ("tarde de finca"), mezclada 60% hacia la franja REAL del día. */
const CIELO_CAFE = CIELOS.corral;

/* El encuadre por defecto de la ladera (el registro puede pisarlo): la cámara
   llega desde abajo del camino y mira loma arriba — entrar es subir. */
const ENTRADA_LADERA = { zoom: 13, centro: /** @type {[number,number,number]} */ ([0, 2.4, -2]) };

/* La fauna que delata el café DE SOMBRA: colibríes y mariposas que el café a
   pleno sol espanta. Pocas y por criterio (la sombra ES el hábitat); alturas
   horneadas sobre el terreno real. Orden = prominencia (recorte por tier). */
const FAUNA_CAFE = [
  { tipo: 'colibri', base: [-2.2, 1.9, 5.0], patron: 'revoloteo', size: 30, fase: 0.5, df: 10 },
  { tipo: 'mariposa', base: [1.8, 1.5, 6.4], patron: 'revoloteo', size: 26, fase: 1.8, df: 9 },
  { tipo: 'colibri', base: [3.4, 3.5, 2.0], patron: 'revoloteo', size: 26, fase: 2.6, df: 10 },
  { tipo: 'mariposa', base: [-6.5, 3.3, -4.0], patron: 'revoloteo', size: 22, fase: 3.4, df: 9 },
];

/* Los VELOS de bruma entre planos (la lección de la sierra): tres láminas
   lechosas que separan primer plano, ladera media y la loma de la casa — la
   profundidad se lee aunque la niebla del fog aún no muerda. Estáticos,
   aditivo-suaves, baratísimos; fuera del perfil mínimo. */
const VELOS = [
  { pos: [0, 4.0, -10.5], tam: [34, 2.6], op: 0.14 },
  { pos: [-6, 5.2, -14.5], tam: [26, 3.0], op: 0.11 },
  { pos: [8, 6.6, -15.8], tam: [16, 2.4], op: 0.16 }, // el que vela la casa
];

/* EL GRANO EN SUS TRES ESTADOS — cereza → pergamino → oro, NUNCA tostado en la
   finca — como tres bandejas de muestra en el patio del beneficiadero (donde
   ese paso ocurre de verdad, no regado por la entrada). */
const ESTADOS_GRANO = [
  { color: PAL.cerezaRoja, label: 'cereza' },
  { color: '#d4c199', label: 'pergamino' },
  { color: '#9fae5a', label: 'oro' },
];

function MesaGrano({ pos }) {
  return (
    <group position={pos} rotation={[0, 0.4, 0]}>
      {ESTADOS_GRANO.map((g, i) => (
        <group key={g.label} position={[(i - 1) * 0.62, 0, i === 1 ? -0.18 : 0]}>
          {/* la bandeja/zaranda de madera clara */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
          {/* el montón de grano de este estado */}
          <mesh position={[0, 0.09, 0]}>
            <sphereGeometry args={[0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color={g.color} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* La MATA CON ROYA: un cafeto del surco señalado con el polvillo naranja de
   Hemileia vastatrix BAJO la hoja de los pisos bajos (donde de verdad arranca).
   Señal legible sin alarma; la puerta `roya` flota encima. */
const MOTAS_ROYA = [
  [0.3, 0.3, 0.12], [-0.22, 0.28, 0.25], [0.05, 0.5, -0.3], [-0.3, 0.44, -0.1], [0.18, 0.6, 0.2],
];

function MataConRoya({ pos, geo, mat }) {
  return (
    <group position={pos} scale={1.15}>
      <mesh geometry={geo} material={mat} />
      {MOTAS_ROYA.map((p, i) => (
        <mesh key={i} position={p} scale={[1, 0.5, 1]}>
          <icosahedronGeometry args={[0.05, 0]} />
          <meshLambertMaterial color={PALETA.ambar} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La TRAMPA DE BROCA artesanal: la botella roja con su gorro, colgada de una
   estaca junto al surco — el manejo sin veneno hecho objeto (etanol que llama
   al gorgojo, cosecha bien recogida y hongos de biocontrol hacen el resto). */
function TrampaBroca({ pos }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.9, 5]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.09, 0.075, 0.24, 8]} />
        <meshLambertMaterial color={PAL.cerezaRoja} flatShading />
      </mesh>
      <mesh position={[0, 0.94, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.05, 8]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
    </group>
  );
}

function Diorama({ tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  const q = calidadCafetal(tier);
  const frugal = tier === 'bajo';

  /* La atmósfera de la franja (la MISMA mezcla que hace EscenaBase3D con este
     cielo): solo para teñir los montes del fondo con la niebla de la hora —
     perspectiva aérea viva, al atardecer se doran y de noche se apagan. */
  const { franja } = useCicloDia({ reducedMotion });
  const c = useMemo(() => mezclarCielo(CIELO_CAFE, presetDeHora(franja)), [franja]);
  const montes = useMemo(
    () => ({
      cerca: mezclar(VERDES.monte, c.niebla, 0.22),
      media: mezclar(VERDES.monte, c.niebla, 0.3),
      lejos: mezclar(VERDES.monte, c.niebla, 0.4),
    }),
    [c.niebla],
  );

  /* La ladera (heightfield compartido con EscenaCafetalVivo) y la mata enferma
     (una vez por tier). */
  const geoLadera = useMemo(
    () => construirLadera(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  const geoEnferma = useMemo(() => geomCafeto({ q }, 31), [q]);
  const matEnferma = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );
  useLayoutEffect(
    () => () => {
      geoLadera.dispose();
      geoEnferma.dispose();
      matEnferma.dispose();
    },
    [geoLadera, geoEnferma, matEnferma],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_CAFE : FAUNA_CAFE.slice(0, 2)),
    [tier],
  );

  const hCasa = alturaLadera(SITIO_CASA[0], SITIO_CASA[1]);

  return (
    <group>
      {/* LA LADERA: el suelo verdadero del mundo (arvenses, tierra roja,
          mantillo y el caminito de llegada pintados por vértice). */}
      <mesh geometry={geoLadera}>
        <meshLambertMaterial vertexColors />
      </mesh>

      {/* las montañas cafeteras del fondo, comidas por la niebla de la hora */}
      <mesh position={[-14, 3.0, -23]} scale={[10, 4.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={montes.media} />
      </mesh>
      <mesh position={[8, 3.4, -26]} scale={[12, 5.6, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={montes.lejos} />
      </mesh>
      <mesh position={[21, 2.2, -22]} scale={[8, 3.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={montes.cerca} />
      </mesh>

      {/* EL CAFETAL ENTERO: surcos a curva de nivel con los tres protagonistas
          del primer plano, cerezas en racimo pegadas a la rama (verde→pintón→
          rojo→vino), la flor axilar blanca, el sombrío de guamos y nogales, el
          plátano intercalado y la luz colada bajo las copas (gama alta). */}
      <FloraCafetal tier={tier} reducedMotion={reducedMotion} />

      {/* la mata señalada con roya y la trampa de broca: sanidad con criterio */}
      <MataConRoya pos={[-5.6, 1.5, -1.5]} geo={geoEnferma} mat={matEnferma} />
      <TrampaBroca pos={[4.6, 1.38, -0.6]} />

      {/* la casa con su beneficiadero coronando la loma, medio velada */}
      <CasaBeneficio pos={[SITIO_CASA[0], hCasa, SITIO_CASA[1]]} />

      {/* el grano en sus tres estados, en el patio del beneficio */}
      <MesaGrano pos={[7.4, 4.89, -12.6]} />

      {/* los velos de bruma que separan los planos de la ladera */}
      {!frugal &&
        VELOS.map((v, i) => (
          <mesh key={i} position={v.pos}>
            <planeGeometry args={v.tam} />
            <meshBasicMaterial
              color={NIEBLAS.lechosa}
              transparent
              opacity={v.op}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}

      {/* LA VIDA que trae la sombra: colibríes y mariposas (café con hábitat) */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}
    </group>
  );
}

export default function EscenaCafe(props) {
  return (
    <EscenaBase3D
      {...props}
      cielo={CIELO_CAFE}
      entrada={{ ...ENTRADA_LADERA, ...(props.entrada || {}) }}
    >
      <Diorama tier={props.tier || 'alto'} reducedMotion={!!props.reducedMotion} />
    </EscenaBase3D>
  );
}
