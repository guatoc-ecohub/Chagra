/*
 * EscenaOlorVisible — la misma cochera, dos veces.
 *
 * Una cochera. Un bulto de cascarilla arrimado al poste. Nada más.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ES LA MISMA COCHERA Y NO DOS
 *
 * El antes/después de las cartillas se dibuja en dos viñetas: a la izquierda la
 * cochera del descuidado, a la derecha la del que hace las cosas bien. Y no
 * enseña nada, porque el que mira ve dos fincas: la suya y la de un señor con
 * plata. "A ese le alcanza".
 *
 * Acá hay UNA. La misma cámara, el mismo cerdo, el mismo bebedero rebosado, el
 * mismo dueño parado en la puerta. Lo único que se mueve es cuánto material seco
 * hay en la cama. Y eso convierte el después en una promesa concreta: no es otra
 * finca — es ESTA finca el mes entrante. El contraste enseña porque el sujeto
 * no cambia.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TODO CUELGA DE UN NÚMERO
 *
 * `aire(carbono)` decide el velo, el oro, las moscas, el charco, la nube del
 * vecino, el pozo, el fog y hasta el espesor del colchón. No hay dos escenas
 * iluminadas a mano ni un estado "sucio" y otro "limpio": hay una cantidad de
 * aserrín y sus consecuencias, calculadas. Igual que en la ladera de
 * restauración todo colgaba de `dosel(anio)`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LA CÁMARA — y por qué se puede agachar
 *
 * Arranca a metro y medio del piso: la altura de los ojos del que llega a mirar
 * su cochera. Desde ahí el velo se ve de lejos, un poco sucio, "no es para
 * tanto".
 *
 * Pero `maxPolarAngle` llega casi a la horizontal, y eso es deliberado: uno
 * puede arrastrar el dedo hacia abajo y AGACHARSE hasta quedar a la altura de la
 * gallina. Cuando lo hace, la lámina de aire sucio le queda a la altura de los
 * ojos y la escena entera se ensucia. No hay texto que diga "así vive ella":
 * hay que ponerse ahí. Es la frase del maestro convertida en un gesto de la
 * mano —
 *
 *   "Si a usted le arden los ojos al entrar al gallinero, la gallina lleva
 *    horas así."
 *
 * — y creo que es lo mejor que tiene esta pieza.
 *
 * La cámara no gira sola: acá el que se mueve es el manejo, no el punto de
 * vista. Y el encuadre inicial trae los tres actos en una sola toma: la fosa en
 * primer plano (el que calla), la cochera en el medio (el que roba) y la casa
 * del vecino al fondo (el que reclama).
 *
 * Importa three/@react-three → montar SOLO perezosa (lazy) desde el host.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import { LuzMadre, CIELOS, mezclarCielo, crearMaterialVertexColors } from '../paleta/index.js';
import { aire, olorDeTier } from './aireCargado.js';
import {
  COLORES,
  geomPiso,
  geomCamaSucia,
  geomCamaBuena,
  geomEstructura,
  geomBebedero,
  geomCharco,
  geomFosa,
  geomFosaLiquido,
  geomCerca,
  geomCasaVecino,
  geomBulto,
  geomPala,
  geomCuerpos,
  geomPatio,
} from './olor.geom.js';
import VeloQuePesa from './VeloQuePesa.jsx';
import NitrogenoQueSeVa from './NitrogenoQueSeVa.jsx';
import MoscasDelCharco from './MoscasDelCharco.jsx';
import PozoQueCalla from './PozoQueCalla.jsx';
import NubeQueCruzaLaCerca from './NubeQueCruzaLaCerca.jsx';

/* El espesor del colchón cuando está bien hecho (coincide con geomCamaBuena). */
const CAMA_ALTA = 0.28;

/* -------------------------------------------------------------------------- */
/*  El reloj: la única variable de la pieza                                    */
/* -------------------------------------------------------------------------- */

/*
 * Lleva el carbono hacia donde pide el control, pero SUAVE — y despacio a
 * propósito (3.0, no 8). Sin esto, soltar el deslizador en "cama profunda"
 * apagaría el olor de un golpe: un truco de magia, un producto milagroso. Con
 * esto, el oro se va SENTANDO mota por mota y el velo se va HUNDIENDO, que es
 * como pasa de verdad:
 *
 *   "Esos cambios reducen el olor de forma progresiva a medida que la cama nueva
 *    reemplaza la vieja y el compostaje va tomando ritmo, no de un día para otro
 *    con un producto mágico."
 *
 * El `aireRef` es un ref y no estado de React: cambia 60 veces por segundo y no
 * puede estar re-renderizando el árbol. La escena lo lee sola.
 */
function Reloj({ carbonoRef, aireRef, camaRef, objetivo, reducedMotion }) {
  const { invalidate } = useThree();

  useEffect(() => {
    if (!reducedMotion) return;
    carbonoRef.current = objetivo;
    aireRef.current = aire(objetivo);
    camaRef.current = 0.02 + objetivo * CAMA_ALTA;
    invalidate();
  }, [objetivo, reducedMotion, carbonoRef, aireRef, camaRef, invalidate]);

  useFrame((_, dt) => {
    if (reducedMotion) return;
    const d = objetivo - carbonoRef.current;
    if (Math.abs(d) > 0.0005) {
      carbonoRef.current += d * Math.min(1, dt * 3.0);
    } else {
      carbonoRef.current = objetivo;
    }
    aireRef.current = aire(carbonoRef.current);
    camaRef.current = 0.02 + carbonoRef.current * CAMA_ALTA;
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  La atmósfera: el aire cargado se come el color                             */
/* -------------------------------------------------------------------------- */

/*
 * Acá está la mitad de la incomodidad de la pieza, y no la pone el gas: la pone
 * el FOG.
 *
 * Cuando la cochera huele, la niebla de la escena se acerca y se ensucia hacia
 * el turbio del velo. No es "hay una nube fea en un rincón": es que TODA la
 * escena —la cerca, el patio, la casa del vecino, el cerdo— se ve enferma,
 * lavada, sin color. El aire malo no es un objeto en el cuarto: es el cuarto.
 *
 * Y al echar el material seco, la niebla se destapa y se va lejos, y de golpe
 * vuelven los verdes y el dorado de la tarde de finca (`CIELOS.corral`). Ese
 * regreso del color es la recompensa de la pieza y no cuesta un solo objeto
 * nuevo: es la misma escena, respirando.
 */
function Atmosfera({ aireRef, perfil }) {
  const { scene } = useThree();

  const c = useMemo(() => {
    const limpio = mezclarCielo(CIELOS.corral);
    return {
      fondoLimpio: new THREE.Color(limpio.fondo),
      fondoSucio: new THREE.Color(COLORES.velo),
      nieblaLimpia: new THREE.Color(limpio.niebla),
      nieblaSucia: new THREE.Color(COLORES.veloHondo),
      fondo: new THREE.Color(limpio.fondo),
      limpio,
    };
  }, []);

  useLayoutEffect(() => {
    scene.background = c.fondo;
    if (perfil.fog) scene.fog = new THREE.Fog(c.nieblaLimpia.getHex(), 14, 60);
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene, c, perfil.fog]);

  useFrame(() => {
    const a = aireRef.current;
    if (!a) return;
    /* El fondo se ensucia solo un poco (0.42): el cielo no es el problema, pero
       tampoco puede quedar impecable mientras abajo no se respira. */
    c.fondo.copy(c.fondoLimpio).lerp(c.fondoSucio, a.amoniaco * 0.42);
    if (scene.fog && 'near' in scene.fog) {
      const f = /** @type {THREE.Fog} */ (scene.fog);
      f.color.copy(c.nieblaLimpia).lerp(c.nieblaSucia, a.amoniaco * 0.72);
      /* Con olor, el aire se cierra: se ve hasta la cerca y no más. Sin olor,
         se ve hasta el otro lado del valle. La finca se agranda al respirar. */
      f.near = 14 - a.amoniaco * 11;
      f.far = 60 - a.amoniaco * 34;
    }
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  La materia                                                                 */
/* -------------------------------------------------------------------------- */

/*
 * Todas las mallas de la cochera son geometrías fusionadas con el color horneado
 * en los vértices → UN material para casi todo, una draw-call por pieza. El
 * patrón de floraParamo/fincaRealista, calcado. La gama baja también tiene
 * cochera.
 */
function Cochera({ perfil, aireRef, camaRef }) {
  const mat = useMemo(() => crearMaterialVertexColors(perfil), [perfil]);

  /* Las siluetas son MeshBasic: tinta plana, sin luz. Son sombras con altura,
     no cuerpos con volumen — si les pegara la luz serían personajes. */
  const matSilueta = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82,
        fog: true,
      }),
    [],
  );

  /* El charco aparece y desaparece con la humedad → material propio. */
  const matCharco = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: true,
      }),
    [],
  );

  const g = useMemo(
    () => ({
      patio: geomPatio(),
      piso: geomPiso(),
      camaSucia: geomCamaSucia(),
      camaBuena: geomCamaBuena(),
      estructura: geomEstructura(),
      bebedero: geomBebedero(),
      charco: geomCharco(),
      fosa: geomFosa(),
      fosaLiquido: geomFosaLiquido(),
      cerca: geomCerca(),
      casa: geomCasaVecino(),
      bulto: geomBulto(),
      pala: geomPala(),
      cuerpos: geomCuerpos(),
    }),
    [],
  );

  const camaBuena = useRef(null);
  const charco = useRef(null);

  useLayoutEffect(
    () => () => {
      mat.dispose();
      matSilueta.dispose();
      matCharco.dispose();
      Object.values(g).forEach((x) => x && x.dispose());
    },
    [mat, matSilueta, matCharco, g],
  );

  useFrame(() => {
    const a = aireRef.current;
    if (!a) return;
    /*
     * EL COLCHÓN CRECE. No hay crossfade entre "cama sucia" y "cama buena": la
     * cama buena se LEVANTA desde el piso, tapando la vieja, porque así es como
     * pasa — el material seco se echa ENCIMA, no reemplaza nada. La cama vieja
     * sigue ahí abajo, volviéndose abono.
     */
    if (camaBuena.current) {
      const s = Math.max(0.008, a.carbono);
      camaBuena.current.scale.y = s;
      camaBuena.current.visible = a.carbono > 0.01;
    }
    /* El charco: hijo del agua de más, igual que las moscas. */
    if (charco.current) {
      charco.current.material.opacity = Math.max(0, (a.saturacion - 0.18) / 0.82) * 0.9;
      charco.current.visible = charco.current.material.opacity > 0.01;
    }
  });

  return (
    <group>
      <mesh geometry={g.patio} material={mat} receiveShadow={perfil.sombras} />
      <mesh geometry={g.piso} material={mat} receiveShadow={perfil.sombras} />

      {/* La cama vencida: siempre ahí, debajo de todo. */}
      <mesh geometry={g.camaSucia} material={mat} receiveShadow={perfil.sombras} />
      {/* El colchón nuevo, que se levanta con el carbono. */}
      <mesh ref={camaBuena} geometry={g.camaBuena} material={mat} receiveShadow={perfil.sombras} />

      <mesh geometry={g.estructura} material={mat} castShadow={perfil.sombras} receiveShadow={perfil.sombras} />
      <mesh geometry={g.bebedero} material={mat} castShadow={perfil.sombras} />
      <mesh ref={charco} geometry={g.charco} material={matCharco} renderOrder={1} />

      {/* La fosa y su líquido quieto. */}
      <mesh geometry={g.fosa} material={mat} receiveShadow={perfil.sombras} />
      <mesh geometry={g.fosaLiquido} material={mat} />

      {/* El lindero y lo que hay del otro lado. */}
      <mesh geometry={g.cerca} material={mat} castShadow={perfil.sombras} />
      <mesh geometry={g.casa} material={mat} castShadow={perfil.sombras} />

      {/* El remedio, arrimado al poste desde el principio. */}
      <mesh geometry={g.bulto} material={mat} castShadow={perfil.sombras} />
      <mesh geometry={g.pala} material={mat} />

      {/* Los cuerpos, cada uno a su altura de verdad. */}
      <mesh geometry={g.cuerpos} material={matSilueta} renderOrder={6} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  El diorama                                                                 */
/* -------------------------------------------------------------------------- */

function Diorama({ carbono, tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  const conteos = olorDeTier(tier);

  const carbonoRef = useRef(carbono);
  const aireRef = useRef(aire(carbono));
  const camaRef = useRef(0.02 + carbono * CAMA_ALTA);

  return (
    <>
      {/* Primero el reloj: pone el aire antes de que nadie lo lea. */}
      <Reloj
        carbonoRef={carbonoRef}
        aireRef={aireRef}
        camaRef={camaRef}
        objetivo={carbono}
        reducedMotion={reducedMotion}
      />
      <Atmosfera aireRef={aireRef} perfil={perfil} />
      {/* La luz de la casa, sin calcar números: tarde de finca. */}
      <LuzMadre cielo={CIELOS.corral} perfil={perfil} />

      <Cochera perfil={perfil} aireRef={aireRef} camaRef={camaRef} />

      {/* El amoníaco: se acuesta sobre la cama y tiene un borde. */}
      <VeloQuePesa aireRef={aireRef} n={conteos.estratos} reducedMotion={reducedMotion} />

      {/* El oro: o sube y se pierde, o se sienta en la cama. Nunca desaparece. */}
      <NitrogenoQueSeVa
        aireRef={aireRef}
        camaRef={camaRef}
        n={conteos.motas}
        reducedMotion={reducedMotion}
      />

      {/* Las moscas: hijas de la humedad, no del olor. */}
      <MoscasDelCharco aireRef={aireRef} n={conteos.moscas} reducedMotion={reducedMotion} />

      {/* El que calla, en el hueco. */}
      <PozoQueCalla aireRef={aireRef} />

      {/* Lo que cruza el lindero, y tarda en dejar de cruzarlo. */}
      <NubeQueCruzaLaCerca aireRef={aireRef} reducedMotion={reducedMotion} />

      {/*
        Sin autoRotate: el que se mueve acá es el manejo, no el punto de vista.
        `maxPolarAngle` casi horizontal (1.53) es LA decisión de esta escena:
        deja que uno se agache hasta la altura de la gallina y respire lo que
        ella respira. `target` a 0.55 m — no al centro geométrico de la cochera,
        sino a la altura de la cama, que es de lo que trata todo esto.
      */}
      <OrbitControls
        makeDefault
        target={[-0.6, 0.55, 1.2]}
        enablePan={false}
        enableZoom
        minDistance={4}
        maxDistance={20}
        minPolarAngle={0.35}
        maxPolarAngle={1.53}
        enableDamping
        dampingFactor={0.08}
        autoRotate={false}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * La cochera y su aire. Montar SOLO perezosa (lazy).
 *
 * @param {{
 *   carbono?: number,
 *   tier?: 'alto'|'medio'|'bajo',
 *   reducedMotion?: boolean,
 * }} props  `carbono`: 0 = piso pelado lavado con manguera · 1 = cama profunda.
 */
export default function EscenaOlorVisible({ carbono = 0, tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);

  /*
   * La cámara arranca donde se para el que llega a mirar su cochera: a metro y
   * medio, un poco de lado. Desde acá entran los tres actos en una toma — la
   * fosa cerca (el que calla), la cochera en el medio (el que roba) y la casa
   * del vecino al fondo (el que reclama).
   */
  const camara = useMemo(
    () => ({ position: /** @type {[number, number, number]} */ ([-7.4, 1.55, 6.8]), fov: 48 }),
    [],
  );

  return (
    <Canvas
      className={`olor-canvas${listo ? ' olor-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={camara}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama carbono={carbono} tier={tier} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
