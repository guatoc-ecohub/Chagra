/*
 * EscenaPolinizadores — EL MUNDO DE LA RED QUE DA LA COSECHA.
 *
 * Una finca andina de verdad, con sus decisiones tomadas: el rincón de monte al
 * fondo (donde anidan los silvestres), el meliponario a media sombra, la cerca
 * viva florida corriendo por el frente (el corredor), el maracuyá en su emparrado
 * al centro, la ahuyama rastrera, el cafetal bajo sombrío — y a la derecha, el
 * maizal, que no le debe nada a nadie.
 *
 * Sobre todo eso se teje la RED: los hilos de polen que los bichos van dejando
 * mientras trabajan. Esa maraña ámbar es el servicio que nadie ve nunca y que
 * nadie paga. Ahí está el mundo entero.
 *
 * ── LOS TRES INTERRUPTORES ──────────────────────────────────────────────────
 * Cada uno enseña una cosa que un párrafo no logra:
 *
 *   momento    'dia' | 'noche'
 *     De noche la finca no se apaga: CAMBIA DE TURNO. Se recogen las abejas, se
 *     cierran la amarilla y la morada, y se abren las blancas del guamo mientras
 *     entra el murciélago a trabajar. El turno de noche existe y casi nadie lo
 *     sabe.
 *
 *   comoAbeja  boolean
 *     El mundo con el ojo de ella: la flor roja del colibrí SE APAGA (no ve el
 *     rojo) y se encienden las guías de néctar ultravioleta que estuvieron ahí
 *     todo el tiempo. En un segundo se entiende el síndrome floral entero.
 *
 *   veneno     boolean
 *     Cruza la deriva del lote vecino. Los hilos se van en ceniza, el enjambre
 *     se calla y la fruta se cae. Y si lo prueba de noche, verá que el daño es
 *     otro — porque las abejas tienen horario y el veneno no.
 *
 * Todo procedural (cero CDN, cero imágenes). Tier-safe vía `perfilDeTier`: 'alto'
 * con sombras y niebla; 'medio' frugal; 'bajo' mínimo pero NUNCA mudo — la red,
 * el contraste del maíz y el meliponario sobreviven a todos los recortes, porque
 * son lo único que este mundo tiene para decir.
 *
 * Importa three/@react-three → montar SOLO perezosa (lazy) desde el host.
 */
import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { CIELOS_HORA, mezclaHex } from '../cielosHoraData.js';
import { VERDES, TIERRAS, CORTEZAS, NEUTROS, mezclar } from '../paleta/index.js';
import { PAL, rng, tierDe } from './polinizadoresIdentidad.js';
import { sembrarFlores, FINCA, ZONA_POR_ID } from './sembrado.js';
import { crearTelar } from './telar.js';
import FloresMundo from './FloresMundo.jsx';
import EnjambrePolinizadores from './EnjambrePolinizadores.jsx';
import RedPolinizacion from './RedPolinizacion.jsx';
import Meliponario from './Meliponario.jsx';
import ParcelaCultivos from './ParcelaCultivos.jsx';
import AmenazaVeneno from './AmenazaVeneno.jsx';

/* -------------------------------------------------------------------------- */
/*  Las horas de la casa (congruencia de elenco)                               */
/* -------------------------------------------------------------------------- */

/* Este mundo era el último de Chagra con un cielo inventado a mano (un celeste
   frío que se veía de otro juego). Ahora el día y la noche SON las franjas del
   kit de cielos del valle, y todo lo demás se DERIVA de ellas con la mezcla de
   la casa — como hace el páramo con su bruma fría. */
const M = CIELOS_HORA.mediodia; // "mediodía andino: alto, limpio" — literal
const N = CIELOS_HORA.noche; // LA noche estrellada del valle, no otra

/* El ojo de la abeja: su mundo se corre hacia el azul-violeta y el UV (física
   del síndrome floral, no filtro de moda). El corrimiento se aplica SOBRE el
   mediodía de la casa: la finca es la misma, el ojo es otro. */
const UV = '#7d8ce0';

/* La noche pinta el suelo de la finca con el rebote CÁLIDO de la noche madre
   (N.suelo es un negro tibio, nunca azul): los verdes del día, apagados. */
const NOCTURNO = {
  potrero: mezclaHex(PAL.potrero, N.suelo, 0.68),
  sueloRico: mezclaHex(PAL.sueloRico, N.suelo, 0.68),
  suelo: mezclaHex(PAL.suelo, N.suelo, 0.68),
};

/* -------------------------------------------------------------------------- */
/*  El paisaje de fondo                                                        */
/* -------------------------------------------------------------------------- */

/*
 * EL RINCÓN DE MONTE. La gente lo ve como tierra desperdiciada; es lo contrario.
 * Ahí anidan las abejas nativas y los abejorros, ahí hay flor silvestre cuando el
 * cultivo no florece, y de ahí salen todos los días los bichos que trabajan gratis
 * en la finca. Se dibuja HONDO y enmarañado, contra el verde pobre y peinado del
 * potrero: la diferencia entre los dos verdes es un argumento.
 */
/* Los verdes y cortezas del monte, DERIVADOS de la paleta madre (nunca un hex
   inventado): copas alrededor de VERDES.monte, tronco pariente del encenillo. */
const MONTE = {
  tronco: mezclar(CORTEZAS.encenillo, NEUTROS.tinta, 0.12),
  copaHonda: mezclar(VERDES.monte, NEUTROS.tinta, 0.18),
  copaParda: mezclar(VERDES.monte, TIERRAS.siembra, 0.18),
  copaFresca: mezclar(VERDES.monte, VERDES.brote, 0.25),
};

/* La cerca viva: madera curtida de la casa y rebrote del verde de trabajo. */
const CERCA = {
  poste: mezclar(TIERRAS.siembra, TIERRAS.camino, 0.25),
  rebrote: mezclar(VERDES.trabajo, VERDES.monte, 0.35),
};

function RinconDeMonte({ tier, sombras }) {
  const arboles = useMemo(() => {
    const r = rng(313);
    const n = tier === 'bajo' ? 5 : tier === 'medio' ? 9 : 15;
    const z = ZONA_POR_ID.monte;
    return Array.from({ length: n }, (_, i) => ({
      key: i,
      pos: [z.centro[0] + (r() - 0.5) * z.ancho, 0, z.centro[2] + (r() - 0.5) * z.hondo - r() * 0.8],
      alto: 1.6 + r() * 1.7,
      radio: 0.55 + r() * 0.55,
      tono: r(),
    }));
  }, [tier]);

  return (
    <group>
      {arboles.map((a) => (
        <group key={a.key} position={a.pos}>
          <mesh position={[0, a.alto * 0.45, 0]} castShadow={sombras}>
            <cylinderGeometry args={[0.06, 0.1, a.alto * 0.9, 5]} />
            <meshLambertMaterial color={MONTE.tronco} />
          </mesh>
          {/* La copa: dos o tres masas, nunca una bola sola — el monte es
              enmarañado, no un parque. */}
          <mesh position={[0, a.alto, 0]} castShadow={sombras}>
            <sphereGeometry args={[a.radio, 7, 5]} />
            <meshLambertMaterial color={a.tono > 0.5 ? PAL.monte : MONTE.copaParda} />
          </mesh>
          <mesh position={[a.radio * 0.5, a.alto - 0.25, a.radio * 0.3]} castShadow={sombras}>
            <sphereGeometry args={[a.radio * 0.72, 6, 5]} />
            <meshLambertMaterial color={a.tono > 0.5 ? MONTE.copaHonda : MONTE.copaFresca} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* La cerca viva: los postes vivos del corredor. Las flores las siembra el
   sembrado (zona 'borde'); acá van los palos que las sostienen. */
function CercaViva({ tier, sombras }) {
  const postes = useMemo(() => {
    const r = rng(515);
    const n = tier === 'bajo' ? 5 : 9;
    const z = ZONA_POR_ID.borde;
    return Array.from({ length: n }, (_, i) => ({
      key: i,
      x: z.centro[0] - z.ancho / 2 + (i / (n - 1)) * z.ancho,
      z: z.centro[2] + 0.25,
      alto: 0.75 + r() * 0.3,
    }));
  }, [tier]);

  return (
    <group>
      {postes.map((p) => (
        <group key={p.key} position={[p.x, 0, p.z]}>
          {/* Poste VIVO: rebrota. Por eso florece y por eso alimenta. */}
          <mesh position={[0, p.alto / 2, 0]} castShadow={sombras}>
            <cylinderGeometry args={[0.04, 0.055, p.alto, 5]} />
            <meshLambertMaterial color={CERCA.poste} />
          </mesh>
          <mesh position={[0, p.alto + 0.1, 0]} castShadow={sombras}>
            <sphereGeometry args={[0.19, 6, 5]} />
            <meshLambertMaterial color={CERCA.rebrote} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  El diorama                                                                 */
/* -------------------------------------------------------------------------- */

function Diorama({ tier, reducedMotion, momento, comoAbeja, veneno, meliponarioAbierto, onDano }) {
  const perfil = perfilDeTier(tier);
  const noche = momento === 'noche';

  const flores = useMemo(() => sembrarFlores(tier), [tier]);
  const telar = useMemo(() => crearTelar({ capacidad: tierDe(tier).hilos }), [tier]);
  useEffect(() => () => telar.limpiar(), [telar]);

  const [diezmado, setDiezmado] = useState(0);
  useEffect(() => {
    // Cada vez que se apaga la amenaza, la finca se vuelve a poblar: los bichos
    // vuelven del monte y de las fincas vecinas. La recuperación es real y es
    // lenta, y depende de que quede monte de dónde volver.
    if (!veneno) setDiezmado(0);
  }, [veneno]);

  /*
   * LA LUZ. De día, mediodía andino: alto, limpio, con el verde rebotando del
   * suelo. De noche, luna azul y baja — se ve lo justo, y lo blanco de la flor
   * del guamo es lo único que brilla, que es exactamente por lo que esa flor es
   * blanca.
   *
   * En visión de abeja la luz se va a un violeta frío: no es un filtro de moda,
   * es que su mundo se corre hacia el azul y el ultravioleta. Que la escena
   * entera cambie de temperatura vende la idea antes que cualquier explicación.
   */
  const luz = useMemo(() => {
    if (noche) {
      return {
        cielo: PAL.cieloNoche, // = N.fondo
        niebla: PAL.nieblaNoche, // = N.niebla
        hemi: mezclaHex(N.cielo, N.luz, 0.35), // la bóveda aclarada por la luna
        suelo: N.suelo, // rebote de tierra CÁLIDO (era el único frío del 3D)
        dir: N.luz, // la luna plata de la casa
        int: 0.34,
        amb: 0.24,
      };
    }
    if (comoAbeja) {
      return {
        cielo: mezclaHex(M.fondo, UV, 0.82),
        niebla: mezclaHex(M.niebla, UV, 0.72),
        hemi: mezclaHex(M.cielo, UV, 0.55),
        suelo: mezclaHex(M.suelo, VERDES.monte, 0.7), // el mismo suelo del día
        dir: mezclaHex(M.luz, UV, 0.4), // sol pálido corrido al violeta
        int: 1.05,
        amb: 0.42,
      };
    }
    return {
      cielo: PAL.cieloDia, // = M.fondo: el marfil del mediodía andino
      niebla: PAL.nieblaDia, // = M.niebla
      hemi: M.cielo,
      suelo: mezclaHex(M.suelo, VERDES.monte, 0.7), // el verde rebotando del suelo
      dir: M.luz, // el sol casi blanco del día pleno
      int: 1.25,
      amb: 0.4,
    };
  }, [noche, comoAbeja]);

  return (
    <>
      <color attach="background" args={[luz.cielo]} />
      {perfil.fog && <fog attach="fog" args={[luz.niebla, 11, 30]} />}

      <hemisphereLight intensity={noche ? 0.5 : 0.85} color={luz.hemi} groundColor={luz.suelo} />
      <ambientLight intensity={luz.amb} color={luz.hemi} />
      <directionalLight
        position={noche ? [-7, 9, -4] : [6, 10, 4]}
        intensity={luz.int}
        color={luz.dir}
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={28}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-6}
      />

      {/* El suelo de la finca. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[FINCA.radio * 2.4, 36]} />
        <meshLambertMaterial color={noche ? NOCTURNO.potrero : PAL.potrero} />
      </mesh>
      {/* La tierra buena: bajo el monte, oscura de materia orgánica. El suelo
          también cuenta quién ha cuidado qué. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.6, 0.01, -4.4]}>
        <circleGeometry args={[4.6, 24]} />
        <meshLambertMaterial color={noche ? NOCTURNO.sueloRico : PAL.sueloRico} />
      </mesh>
      {/* La huerta, trabajada. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.01, 1.9]}>
        <circleGeometry args={[1.9, 20]} />
        <meshLambertMaterial color={noche ? NOCTURNO.suelo : PAL.suelo} />
      </mesh>

      <RinconDeMonte tier={tier} sombras={perfil.sombras} />
      <CercaViva tier={tier} sombras={perfil.sombras} />

      {/* LAS MATAS y su cosecha ganada. */}
      <ParcelaCultivos telar={telar} tier={tier} reducedMotion={reducedMotion} momento={momento} />

      {/* LOS CARTELES: las flores, con su hora y su doble visión. */}
      <FloresMundo
        flores={flores}
        momento={momento}
        tier={tier}
        comoAbeja={comoAbeja}
        reducedMotion={reducedMotion}
      />

      {/* LA CASA de la angelita. */}
      <Meliponario
        tier={tier}
        reducedMotion={reducedMotion}
        momento={momento}
        abierta={meliponarioAbierto}
        diezmado={diezmado}
      />

      {/* QUIENES TRABAJAN. */}
      <EnjambrePolinizadores
        flores={flores}
        telar={telar}
        momento={momento}
        tier={tier}
        reducedMotion={reducedMotion}
        diezmado={diezmado}
      />

      {/* EL SERVICIO, VISIBLE. Lo último en dibujarse: va por encima de todo,
          porque es de lo que se trata. */}
      <RedPolinizacion
        telar={telar}
        tier={tier}
        reducedMotion={reducedMotion}
        comoAbeja={comoAbeja}
      />

      {/* LA AMENAZA. */}
      <AmenazaVeneno
        activa={veneno}
        telar={telar}
        momento={momento}
        tier={tier}
        reducedMotion={reducedMotion}
        onDano={(d) => { setDiezmado(d); onDano?.(d); }}
      />

      <OrbitControls
        makeDefault
        target={[0.4, 0.9, 0]}
        enablePan={false}
        enableZoom
        minDistance={4.5}
        maxDistance={17}
        minPolarAngle={0.35}
        maxPolarAngle={1.46} // nunca bajo el suelo
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.12} // muy lento: hay que poder QUEDARSE mirando
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo Polinizadores. Montar SOLO perezosa (importa three).
 *
 * @param {Object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]
 * @param {'dia'|'noche'} [props.momento='dia']  el turno (de noche entra el
 *   murciélago y se abren las flores pálidas).
 * @param {boolean} [props.comoAbeja=false]  ver el mundo con el ojo de la abeja.
 * @param {boolean} [props.veneno=false]  cruza la deriva del lote vecino.
 * @param {boolean} [props.meliponarioAbierto=false]  vista de corte de la caja:
 *   los potes de cerumen (adentro no hay panales).
 * @param {(diezmado:number)=>void} [props.onDano]
 */
export default function EscenaPolinizadores({
  tier = 'alto',
  reducedMotion = false,
  momento = 'dia',
  comoAbeja = false,
  veneno = false,
  meliponarioAbierto = false,
  onDano,
}) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`polz-canvas${listo ? ' polz-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [1.2, 2.6, 9.5], fov: 46 }}
      /* Nunca 'demand': aunque el usuario pida calma, la RED tiene que seguir
         tejiéndose — es lo único que este mundo tiene que mostrar. Con
         reducedMotion se apaga el temblor, el aleteo y el mecido, pero el
         trabajo sigue: quieto no es muerto. */
      frameloop="always"
      onCreated={() => setListo(true)}
    >
      <Diorama
        tier={tier}
        reducedMotion={reducedMotion}
        momento={momento}
        comoAbeja={comoAbeja}
        veneno={veneno}
        meliponarioAbierto={meliponarioAbierto}
        onDano={onDano}
      />
    </Canvas>
  );
}
