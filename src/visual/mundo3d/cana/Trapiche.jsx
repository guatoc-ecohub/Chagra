/*
 * Trapiche — la ENRAMADA completa, armada y prendida.
 *
 * Monta las piezas fusionadas de `trapiche.geom.js` (esqueleto, techo, molienda,
 * hornilla, pailas, moldeo, bagazo, útiles) y les pone encima lo único que NO
 * puede ir horneado en una geometría opaca: los LÍQUIDOS y el FUEGO. El jugo
 * que corre por la canoa, lo que hierve en cada paila, la cachaza que hay que
 * retirar, la panela cuajándose en la gavera, la candela de la boca del horno,
 * el vapor de las pailas y el humo de la chimenea.
 *
 * El orden de las pailas ES la lección, y por eso lo que hay adentro de cada
 * una es distinto: en la primera (la más lejos del fuego) todavía hay jugo
 * verdoso y turbio con su espuma; en la última, al lado de la candela, ya hay
 * miel oscura a punto de panela. Un solo vistazo cuenta el proceso.
 *
 * `fuerza` es cuánto manda el fuego en la escena y lo decide LA HORA: de día la
 * candela es un acento tibio; de noche es lo único que alumbra la enramada, y
 * entonces este mundo se ve como se ve una molienda de verdad a las ocho de la
 * noche. Eso no es un efecto: es la luz motivada del sitio.
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaCanaTrapiche.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import { Candela, VaporPaila, HumoChimenea } from './FuegoHornilla.jsx';
import {
  ENRAMADA,
  SITIOS,
  PAILAS,
  PAILA_Y,
  PAILA_Z,
  CELDAS_GAVERA,
  PAL,
  geomEsqueletoEnramada,
  geomTechoEnramada,
  geomMolienda,
  geomCanoaGuarapo,
  geomHornilla,
  geomPailas,
  geomArrumeCana,
  geomMoldeo,
  geomUtiles,
  geomBagazo,
} from './trapiche.geom.js';

/*
 * QUÉ HAY EN CADA PAILA. Se camina de la chimenea (frío) hacia la candela
 * (caliente) y el jugo se va oscureciendo y espesando en el camino:
 *
 *   1. CLARIFICACIÓN — entra el guarapo crudo, verdoso y turbio. Al calentarse
 *      sube a la superficie la CACHAZA: una espuma verdosa que se lleva la
 *      tierra y el bagacillo. Se retira con el cucharón y no se bota — sirve de
 *      alimento para los animales o se devuelve al cultivo como abono.
 *   2 y 3. EVAPORACIÓN — hierve duro y suelta agua. Aquí es donde sale casi todo
 *      el vapor de la enramada.
 *   4. PUNTEO — ya es miel espesa y oscura. El punto se conoce a ojo y a mano,
 *      con la prueba de la gota en agua: es el saber más difícil del oficio.
 */
const CONTENIDO = [
  { color: PAL.guarapo, hondo: 0.10, brillo: 0.20, cachaza: true },
  { color: '#a08a2c', hondo: 0.13, brillo: 0.28, cachaza: false },
  { color: '#9a6b1e', hondo: 0.15, brillo: 0.34, cachaza: false },
  { color: PAL.miel, hondo: 0.17, brillo: 0.46, cachaza: false },
];

/* La superficie de una paila: hierve (sube y baja apenas) y devuelve algo de
   luz de la candela. Con reducedMotion queda plana y quieta. */
function Caldo({ paila, cfg, hervor, reducedMotion }) {
  const malla = useRef(null);
  useFrame(({ clock }) => {
    const m = malla.current;
    if (!m || reducedMotion) return;
    const t = clock.elapsedTime;
    // el hervor: la lámina de miel respira y se agita más donde pega el fuego
    m.position.y = PAILA_Y - cfg.hondo + Math.sin(t * (2.2 + hervor * 3)) * 0.012 * hervor;
    m.scale.setScalar(1 + Math.sin(t * (1.6 + hervor * 2.4)) * 0.012 * hervor);
  });
  return (
    <mesh
      ref={malla}
      position={[paila.x, PAILA_Y - cfg.hondo, PAILA_Z]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <circleGeometry args={[paila.r * 0.93, 20]} />
      <meshStandardMaterial
        color={cfg.color}
        roughness={1 - cfg.brillo}
        metalness={0}
        emissive={cfg.color}
        emissiveIntensity={0.12 + cfg.brillo * 0.18}
      />
    </mesh>
  );
}

/* LA CACHAZA: los cuajarones de espuma verdosa que se juntan en la primera
   paila y que el hornillero retira antes de que el jugo rompa a hervir. */
function Cachaza({ paila, reducedMotion }) {
  const grupo = useRef(null);
  const manchas = useMemo(() => {
    const lista = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.6;
      const d = paila.r * (0.18 + (i % 3) * 0.2);
      lista.push({
        p: /** @type {[number,number,number]} */ ([
          paila.x + Math.cos(a) * d,
          PAILA_Y - 0.085,
          PAILA_Z + Math.sin(a) * d,
        ]),
        r: paila.r * (0.16 + (i % 4) * 0.055),
        fase: i * 1.27,
      });
    }
    return lista;
  }, [paila]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g || reducedMotion) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i];
      const d = manchas[i];
      // la espuma da vueltas despacio sobre el jugo caliente
      m.position.x = d.p[0] + Math.sin(t * 0.35 + d.fase) * 0.045;
      m.position.z = d.p[2] + Math.cos(t * 0.31 + d.fase) * 0.045;
    }
  });

  return (
    <group ref={grupo}>
      {manchas.map((d, i) => (
        <mesh key={i} position={d.p} rotation={[-Math.PI / 2, 0, i * 0.7]}>
          <circleGeometry args={[d.r, 8]} />
          <meshStandardMaterial color={PAL.cachaza} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* EL BOMBILLO de la enramada, colgado de un tirante. Se prende cuando cae la
   tarde — una molienda no se para porque anochezca. */
function Bombillo({ pos, fuerza }) {
  const luz = useRef(null);
  const bulbo = useRef(null);
  // Solo tiene sentido cuando ya no hay sol: la misma señal que el fuego.
  const prendido = Math.max(0, Math.min(1, (fuerza - 0.95) / 0.85));
  useLayoutEffect(() => {
    if (luz.current) luz.current.intensity = 1.5 * prendido;
    if (bulbo.current) bulbo.current.material.opacity = 0.35 + 0.65 * prendido;
  }, [prendido]);
  return (
    <group position={pos}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.6, 4]} />
        <meshBasicMaterial color="#2e2620" />
      </mesh>
      <mesh ref={bulbo}>
        <sphereGeometry args={[0.075, 10, 7]} />
        <meshBasicMaterial color="#ffd98a" transparent opacity={0.95} />
      </mesh>
      <pointLight ref={luz} color="#ffd08a" intensity={1.5} distance={9} decay={2} />
    </group>
  );
}

/**
 * La enramada del trapiche, completa.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean,
 *          fuerza?: number}} props  `fuerza` = cuánto manda el fuego (la hora).
 */
export default function Trapiche({ tier = 'alto', reducedMotion = false, fuerza = 1 }) {
  const perfil = perfilDeTier(tier);
  const q = tier === 'alto' ? 1 : tier === 'medio' ? 0.62 : 0.42;
  const rico = perfil.materialRico;

  /* Las piezas fusionadas: once draw-calls para toda la enramada. */
  const geos = useMemo(
    () => ({
      esqueleto: geomEsqueletoEnramada({ q }),
      techo: geomTechoEnramada({ q }),
      molienda: geomMolienda({ q }),
      canoa: geomCanoaGuarapo(),
      hornilla: geomHornilla({ q }),
      pailas: geomPailas({ q }),
      arrume: geomArrumeCana({ q }),
      moldeo: geomMoldeo({ q }),
      utiles: q > 0.5 ? geomUtiles({ q }) : null,
      // Los TRES estados del bagazo, que es la lección escondida del mundo:
      // sale mojado del molino, se apila a secar, y seco vuelve como leña.
      bagazoHumedo: geomBagazo({ radio: 0.95, alto: 0.55, estado: 'humedo', q, semilla: 301 }),
      bagazoSecando: geomBagazo({ radio: 1.7, alto: 1.25, estado: 'secando', q, semilla: 302 }),
      bagazoSeco: geomBagazo({ radio: 0.7, alto: 0.5, estado: 'seco', q, semilla: 303 }),
    }),
    [q],
  );

  /* Dos materiales para todo: uno mate (madera, ladrillo, bagazo, teja) y otro
     metálico para las pailas. El color va horneado en vertexColors. */
  const matMate = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return rico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.92, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [rico, perfil.flatShading]);

  const matMetal = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return rico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.34, metalness: 0.72 })
      : new THREE.MeshLambertMaterial(base);
  }, [rico, perfil.flatShading]);

  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g && g.dispose());
      matMate.dispose();
      matMetal.dispose();
    },
    [geos, matMate, matMetal],
  );

  const sombra = perfil.sombras;
  const vaporN = tier === 'alto' ? 6 : 3;

  return (
    <group>
      {/* LA ESTRUCTURA: horcones, soleras, pares y el techo de teja con su
          caballete alzado (por ahí se va el humo). */}
      <mesh geometry={geos.esqueleto} material={matMate} castShadow={sombra} receiveShadow={sombra} />
      <mesh geometry={geos.techo} material={matMate} castShadow={sombra} />

      {/* LA CAÑA que llegó del lote, despuntada y arrumada. */}
      <group position={SITIOS.arrume}>
        <mesh geometry={geos.arrume} material={matMate} castShadow={sombra} />
      </group>

      {/* LA MOLIENDA sobre su bancada, con el motor y la correa. */}
      <group position={SITIOS.molienda}>
        <mesh geometry={geos.molienda} material={matMate} castShadow={sombra} />
      </group>

      {/* EL BAGAZO en sus tres estados: recién salido del molino (mojado), la
          bagacera secando al sol afuera, y el montoncito seco listo al pie de
          la boca del horno. La caña calienta su propia miel. */}
      <group position={[-2.7, 0, -3.3]}>
        <mesh geometry={geos.bagazoHumedo} material={matMate} castShadow={sombra} />
      </group>
      <group position={SITIOS.bagacera}>
        <mesh geometry={geos.bagazoSecando} material={matMate} castShadow={sombra} />
      </group>
      <group position={[6.1, 0, -0.5]}>
        <mesh geometry={geos.bagazoSeco} material={matMate} castShadow={sombra} />
      </group>

      {/* LA CANOA del guarapo, con el jugo corriendo hacia la primera paila. */}
      <group position={SITIOS.canoa}>
        <mesh geometry={geos.canoa} material={matMate} />
        {/* el guarapo: verdoso y turbio, NO ámbar — el ámbar viene después */}
        <mesh position={[0, 0.02, 0]} rotation={[0, 0, -0.056]}>
          <boxGeometry args={[3.7, 0.035, 0.26]} />
          <meshStandardMaterial
            color={PAL.guarapo}
            roughness={0.25}
            metalness={0}
            transparent
            opacity={0.88}
          />
        </mesh>
      </group>

      {/* LA HORNILLA: una sola cámara larga, la boca en un extremo y la
          chimenea en el otro. Encima, el tren de pailas. */}
      <group position={SITIOS.hornilla}>
        <mesh geometry={geos.hornilla} material={matMate} castShadow={sombra} receiveShadow={sombra} />
      </group>
      <mesh geometry={geos.pailas} material={matMetal} castShadow={sombra} />

      {/* Lo que hierve en cada paila: de jugo crudo a miel de punteo. */}
      {PAILAS.map((p, i) => (
        <Caldo
          key={p.oficio + i}
          paila={p}
          cfg={CONTENIDO[i]}
          hervor={p.hervor}
          reducedMotion={reducedMotion}
        />
      ))}
      {CONTENIDO[0].cachaza && <Cachaza paila={PAILAS[0]} reducedMotion={reducedMotion} />}

      {/* EL MOLDEO: la batea de batido y las gaveras. */}
      <group position={SITIOS.moldeo}>
        <mesh geometry={geos.moldeo} material={matMate} castShadow={sombra} />
        {/* la miel batida en la batea, ya clarita de tanto aire */}
        <mesh position={[-1.05, 1.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.0, 0.6]} />
          <meshStandardMaterial
            color={PAL.panelaLuz}
            roughness={0.42}
            emissive={PAL.miel}
            emissiveIntensity={0.16}
          />
        </mesh>
        {/* LA PANELA cuajando en las celdas de la gavera: la de la punta apenas
            se vació y todavía está clara y caliente; las de atrás ya cuajaron
            y se pusieron oscuras. */}
        {CELDAS_GAVERA.map((c, i) => {
          const fresca = i / (CELDAS_GAVERA.length - 1);
          return (
            <mesh key={i} position={[c[0], c[1] + 0.035, c[2]]}>
              <boxGeometry args={[0.17, 0.07, 0.34]} />
              <meshStandardMaterial
                color={new THREE.Color(PAL.panela).lerp(new THREE.Color(PAL.panelaLuz), fresca)}
                roughness={0.55 - fresca * 0.2}
                emissive={PAL.miel}
                emissiveIntensity={fresca * 0.22}
              />
            </mesh>
          );
        })}
      </group>

      {/* Lo que dejó la gente: el sombrero, la ruana, el cucharón, la pala. */}
      {geos.utiles && <mesh geometry={geos.utiles} material={matMate} castShadow={sombra} />}

      {/* ───── LA CANDELA. La fuente de luz de este mundo. ───── */}
      <Candela
        pos={SITIOS.boca}
        fuerza={fuerza}
        escala={1.15}
        luz={tier !== 'bajo'}
        reducedMotion={reducedMotion}
      />

      {/* EL VAPOR de las pailas que hierven (las del medio botan más). */}
      {tier !== 'bajo' &&
        PAILAS.map((p, i) => (
          <VaporPaila
            key={`v${i}`}
            pos={[p.x, PAILA_Y + 0.06, PAILA_Z]}
            n={Math.max(2, Math.round(vaporN * p.hervor))}
            fuerza={0.55 + p.hervor * 0.6}
            color={fuerza > 1.3 ? '#ffe3b4' : '#fdf6e6'}
            reducedMotion={reducedMotion}
          />
        ))}

      {/* EL HUMO de la chimenea: el penacho que anuncia al valle que hoy hay
          molienda. Sale por encima del techo, no adentro. */}
      <HumoChimenea
        pos={[SITIOS.chimenea[0], 6.85, SITIOS.chimenea[2]]}
        n={tier === 'alto' ? 10 : 5}
        color={fuerza > 1.3 ? '#6e675f' : '#9a938a'}
        reducedMotion={reducedMotion}
      />

      {/* El bombillo del tirante, para cuando la molienda pasa de la tarde. */}
      {tier !== 'bajo' && <Bombillo pos={[-0.2, ENRAMADA.alero - 0.35, 1.5]} fuerza={fuerza} />}
    </group>
  );
}
