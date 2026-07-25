/*
 * EscenaQuinuaViva — el MUNDO donde vive la quinua (tierra fría, 2.500–3.200 m).
 *
 * Una ladera alta EN LA HORA VIVA DEL VALLE (`AtmosferaMundo`, familia
 * `ladera`), pero tratada al revés que el papal: allá la bruma era la
 * protagonista y aquí la bruma es el ENEMIGO. Este mundo se sostiene sobre el
 * COLOR de las panojas, y una niebla lechosa encima se lo lava todo. Así que la
 * niebla va lejos y floja, y la luz entra limpia y un poco rasante para que cada
 * panoja recorte su silueta contra la de atrás.
 *
 * La composición es la decisión fuerte: la ladera BAJA alejándose de la cámara.
 * En una loma que sube, la primera fila de quinua tapa a la segunda y del lote
 * solo se ve el borde; bajando, las veintitantas filas quedan todas a la vista y
 * el campo de color se lee hasta el fondo. La cámara se para en el filo, junto a
 * la ERA DE LA TRILLA —que queda de primer plano— y mira ladera abajo.
 *
 * En la era está la otra mitad de la lección, la que casi nadie cuenta: la
 * quinua no se come recién cosechada. Hay que trillarla, aventarla y LAVARLA
 * para sacarle la saponina amarga. Por eso ahí viven la hoz, el garrote de
 * trillar, la zaranda y la batea del lavado.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`. Con
 * `reducedMotion` el mundo monta QUIETO (frameloop a demanda).
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
import FloraQuinua from './FloraQuinua.jsx';
import {
  ANCHO,
  FONDO,
  alturaQuinual,
  reliefSurco,
  SITIO_CASA,
  SITIO_TRILLA,
  CAMARA,
} from './floraQuinua.geom.js';
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
  AGUAS,
  CASA,
  LUCES,
  NEUTROS,
  PALETA,
} from '../paleta/index.js';

/* La identidad del piso frío dentro de la familia del valle. */
const FAMILIA_QUINUAL = 'ladera';

/* Escala de la escena para el kit (cámara↔centro ~17). */
const RADIO_QUINUAL = 14;

/* El frustum de sombra a medida del quinual. */
const SOMBRA_QUINUAL = { left: -18, right: 18, top: 14, bottom: -12, far: 50 };

/* La malla de la ladera. La pintura tiene un trabajo concreto: NO competir con
   las panojas. Por eso el suelo va en pardos y verdes callados — si el terreno
   también gritara, el campo de color se volvería ruido. La tierra del surco
   asoma apenas entre fila y fila, y la ERA es un ruedo de piso duro y barrido,
   sin surco, que es donde se trilla. */
function construirLadera(seg, plano) {
  const cPasto = new THREE.Color(mezclar(VERDES.frio, VERDES.paramoMusgo, 0.4));
  const cPasto2 = new THREE.Color(mezclar(VERDES.paramoLiquen, VERDES.frio, 0.5));
  const cSurco = new THREE.Color(mezclar(TIERRAS.turba, TIERRAS.siembra, 0.4));
  const cEntre = new THREE.Color(mezclar(TIERRAS.turba, NEUTROS.tinta, 0.4));
  const cEra = new THREE.Color(mezclar(TIERRAS.camino, NEUTROS.concreto, 0.35)); // piso duro
  const cHondo = new THREE.Color(mezclar(VERDES.paramoNiebla, VERDES.frio, 0.4)); // el fondo del valle
  return construirTerreno({
    ancho: ANCHO,
    fondo: FONDO,
    seg,
    plano,
    altura: alturaQuinual,
    pintar: (wx, wz, alt, c) => {
      const s = reliefSurco(wx, wz);
      const hondo = smoothstep(-4, -15, wz); // hacia el fondo se hunde y oscurece
      c.lerpColors(cPasto, cPasto2, 0.5 + 0.5 * ruidoTerreno(wx * 0.8, wz * 0.6));
      c.lerp(cHondo, hondo * 0.55);
      // dentro del lote: la tierra entre fila y fila…
      c.lerp(cEntre, s.lote * 0.7);
      // …y el lomito del surco, apenas más claro (aquí no se aporca)
      c.lerp(cSurco, smoothstep(0.2, 0.8, s.lomo) * 0.85);
      // LA ERA: el ruedo de piso duro donde se trilla
      const dTx = wx - SITIO_TRILLA[0];
      const dTz = wz - SITIO_TRILLA[1];
      c.lerp(cEra, smoothstep(13, 3, dTx * dTx + dTz * dTz) * 0.9);
    },
  });
}

/* La casita de tierra fría, en el filo junto a la era. */
function CasaAlta({ pos }) {
  return (
    <group position={pos} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0.68, 0]}>
        <boxGeometry args={[2.3, 1.36, 1.8]} />
        <meshLambertMaterial color={CASA.encalado} flatShading />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[2.34, 0.32, 1.84]} />
        <meshLambertMaterial color={CASA.zocalo} flatShading />
      </mesh>
      <mesh position={[0.4, 0.58, 0.91]}>
        <boxGeometry args={[0.42, 0.88, 0.06]} />
        <meshLambertMaterial color={CASA.carpinteria} flatShading />
      </mesh>
      <mesh position={[0, 1.5, -0.56]} rotation={[-0.6, 0, 0]}>
        <boxGeometry args={[2.7, 0.08, 1.38]} />
        <meshLambertMaterial color={CASA.tejaSombra} flatShading />
      </mesh>
      <mesh position={[0, 1.5, 0.56]} rotation={[0.6, 0, 0]}>
        <boxGeometry args={[2.7, 0.08, 1.38]} />
        <meshLambertMaterial color={CASA.teja} flatShading />
      </mesh>
      {/* la chimenea del fogón (en el frío se cocina con candela) */}
      <mesh position={[-0.8, 1.78, -0.28]}>
        <boxGeometry args={[0.22, 0.58, 0.22]} />
        <meshLambertMaterial color={mezclar(NEUTROS.lamina, TIERRAS.rocaParamo, 0.5)} flatShading />
      </mesh>
    </group>
  );
}

/*
 * LA ERA DE LA TRILLA — la otra mitad de la lección.
 *
 * Aquí está lo que casi nunca se cuenta de la quinua: entre el corte y el plato
 * hay tres trabajos. Se TRILLA (se le da garrote a la gavilla sobre la manta
 * para que suelte el grano), se AVIENTA (se deja caer al viento para que se
 * lleve la paja) y se LAVA — porque el grano viene cubierto de saponina, que es
 * amarga y no se quita sino con agua y fricción. La batea con el agua turbia y
 * la espuma es la pieza clave: esa espuma ES la saponina saliendo.
 */
function EraDeTrilla({ pos }) {
  return (
    <group position={pos}>
      {/* la MANTA tendida donde se trilla */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <planeGeometry args={[3.2, 2.4]} />
        <meshLambertMaterial
          color={mezclar(TIERRAS.vega, NEUTROS.cal, 0.3)}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* el montón de grano ya trillado sobre la manta */}
      <mesh position={[-0.35, 0.11, 0.25]} scale={[1, 0.42, 1]}>
        <sphereGeometry args={[0.42, 9, 6]} />
        <meshLambertMaterial color={mezclar('#d8c79a', TIERRAS.camino, 0.2)} flatShading />
      </mesh>

      {/* EL GARROTE de trillar, recostado en el montón */}
      <group position={[0.5, 0.1, 0.5]} rotation={[0, 0.7, 1.15]}>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.036, 0.05, 0.86, 6, 1]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      </group>

      {/* LA HOZ con que se corta la panoja: hoja curva y cabo de madera */}
      <group position={[-1.3, 0.05, -0.5]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.19, 0.014, 4, 9, Math.PI * 1.05]} />
          <meshLambertMaterial color={mezclar(NEUTROS.lamina, NEUTROS.cal, 0.35)} flatShading />
        </mesh>
        <mesh position={[0.2, 0.04, 0.05]} rotation={[0, 0, 1.5]}>
          <cylinderGeometry args={[0.026, 0.03, 0.2, 5, 1]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      </group>

      {/* LA ZARANDA con que se limpia el grano después de aventarlo */}
      <group position={[1.5, 0, -0.7]} rotation={[0.35, 0.4, 0.15]}>
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.34, 0.035, 5, 12]} />
          <meshLambertMaterial color={CASA.bejuco} flatShading />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.33, 12]} />
          <meshLambertMaterial
            color={mezclar(CASA.bejuco, NEUTROS.cal, 0.35)}
            flatShading
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* LA BATEA DEL LAVADO: el agua turbia y la ESPUMA. Esa espuma es la
          saponina saliendo del grano — el detalle que explica por qué la quinua
          se lava antes de comerla. */}
      <group position={[-1.9, 0, 1.0]}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.46, 0.38, 0.32, 10, 1, true]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading side={THREE.DoubleSide} />
        </mesh>
        {/* el agua lechosa de tanto lavar */}
        <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.44, 12]} />
          <meshLambertMaterial color={mezclar(AGUAS.viva, NEUTROS.cal, 0.55)} flatShading />
        </mesh>
        {/* la espuma de saponina, en la orilla */}
        {[
          [0.2, 0.14],
          [-0.16, 0.24],
          [0.05, -0.22],
        ].map((p, i) => (
          <mesh key={`e${i}`} position={[p[0], 0.3, p[1]]} scale={[1, 0.4, 1]}>
            <sphereGeometry args={[0.1 + i * 0.02, 7, 5]} />
            <meshLambertMaterial color={NEUTROS.hueso} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* El anillo del paso didáctico. Con reducedMotion queda quieto. */
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

/* La fauna del quinual maduro: el pájaro que viene por el grano es parte de la
   verdad del cultivo (por algo se cuida la cosecha), y la mariposa del frío. */
const FAUNA_QUINUAL = [
  { tipo: 'mariposa', base: [-4.2, 6.0, 3.2], patron: 'revoloteo', size: 22, fase: 0.5, df: 9 },
  { tipo: 'colibri', base: [4.6, 6.4, 1.4], patron: 'revoloteo', size: 26, fase: 1.9, df: 10 },
  { tipo: 'mariposa', base: [-7.0, 5.2, -1.6], patron: 'revoloteo', size: 20, fase: 2.6, df: 9 },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);
  const atm = useAtmosferaMundo({ familia: FAMILIA_QUINUAL, reducedMotion });

  /* La niebla va LEJOS y floja — al revés que en el papal. Aquí el entregable
     es el color de las panojas, y una bruma cercana lo lava todo a gris. Se
     deja lo justo para que el fondo del valle se separe en planos. */
  const bruma = useMemo(
    () => mezclar(atm.niebla, '#cfd8d4', atm.franja === 'noche' ? 0.18 : 0.3),
    [atm.niebla, atm.franja],
  );

  const geoLadera = useMemo(
    () => construirLadera(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  const cerros = useMemo(
    () => ({
      cerca: mezclar(VERDES.paramoHoja, bruma, 0.3),
      media: mezclar(VERDES.paramoNiebla, bruma, 0.42),
      lejos: mezclar(VERDES.altoAndino, bruma, 0.56),
    }),
    [bruma],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_QUINUAL : FAUNA_QUINUAL.slice(0, 2)),
    [tier],
  );

  const controls = useRef(null);
  const casaY = alturaQuinual(SITIO_CASA[0], SITIO_CASA[1]);
  const trillaY = alturaQuinual(SITIO_TRILLA[0], SITIO_TRILLA[1]);

  return (
    <>
      <AtmosferaMundo
        familia={FAMILIA_QUINUAL}
        tier={tier}
        reducedMotion={reducedMotion}
        radio={RADIO_QUINUAL}
        conSuelo={false}
        conNiebla={false}
        sombra={SOMBRA_QUINUAL}
      />
      {/* la bruma, lejos: que separe planos sin lavar el color */}
      {perfil.fog && <fog attach="fog" args={[bruma, 30, 74]} />}
      {/* Una luz de relleno FRÍA y baja, entrando casi rasante desde el lado
          opuesto al sol: es la que le saca el borde a cada panoja contra la de
          atrás. Sin este contraluz el campo se aplana en una sola mancha. */}
      <directionalLight position={[-9, 3.5, -6]} intensity={0.3} color="#dfe8ea" />

      {/* LA LADERA que baja, con sus surcos a curva de nivel */}
      <mesh geometry={geoLadera} receiveShadow={perfil.sombras}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* la segunda cordillera, al otro lado del valle que se abre abajo */}
      <mesh position={[-13, 1.0, -27]} scale={[12, 5.2, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={cerros.media} />
      </mesh>
      <mesh position={[8, 1.6, -30]} scale={[14, 6.4, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={cerros.lejos} />
      </mesh>
      <mesh position={[23, 0.6, -26]} scale={[9, 4.2, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color={cerros.cerca} />
      </mesh>

      {/* EL QUINUAL: el campo de panojas de color */}
      <FloraQuinua tier={tier} />

      {/* la casita del filo */}
      <CasaAlta pos={[SITIO_CASA[0], casaY, SITIO_CASA[1]]} />

      {/* LA ERA: trilla, aventado y el lavado de la saponina */}
      <EraDeTrilla pos={[SITIO_TRILLA[0], trillaY, SITIO_TRILLA[1]]} />

      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        ref={controls}
        makeDefault
        target={CAMARA.objetivo}
        enablePan={false}
        enableZoom
        minDistance={8}
        maxDistance={28}
        minPolarAngle={0.5}
        maxPolarAngle={1.4}
        minAzimuthAngle={-1.0}
        maxAzimuthAngle={1.0}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.1}
      />
      {/* La LLEGADA: el dolly se asoma al filo y el campo se abre abajo. */}
      <CamaraDirector
        controls={controls}
        reposo={CAMARA.reposo}
        mirada={CAMARA.mirada}
        respiro={0.04}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoQuinual"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo del quinual de tierra fría. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaQuinuaViva({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`quinual-canvas${listo ? ' quinual-canvas--lista' : ''}`}
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
