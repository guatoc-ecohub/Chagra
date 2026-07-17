/*
 * EscenaLecheriaViva — el MUNDO de la CADENA LÁCTEA campesina: el potrero
 * silvopastoril, la quesera de la finca y el ciclo del estiércol al abono.
 *
 * Un POTRERO en la hora viva del valle (atmósfera del kit, familia `corral`) que
 * cuenta la lechería agroecológica COMPLETA, como es de verdad (grounded en el
 * DR de la cadena láctea):
 *
 *   · el SISTEMA SILVOPASTORIL — el hato lechero (Holstein, Normando, criolla y
 *     el cruce con cebú) pastando bajo el banco forrajero de nacedero,
 *     matarratón, leucaena y botón de oro, con su cerca VIVA de matarratón y el
 *     bebedero. No es potrero pelado: es sombra, forraje y flor (FloraLecheria +
 *     GanadoLechero);
 *   · la QUESERA de la finca — la enramada donde la leche se hace queso: las
 *     cantinas, la mesa con la cuajada y el cincho, y la olla de cobre del
 *     arequipe. La TRANSFORMACIÓN en finca, que es donde el campesino gana;
 *   · el CICLO — el estiércol no se bota: entra al biodigestor (biogás para la
 *     quesera + biol para abonar) y al montón de abono. Nada se pierde.
 *
 * En clave de la TOMA B (estilizada Switch/BOTW): domo de gradiente con el glow
 * del sol (`DomoCielo`), terreno y cerros por BANDAS toon y silueta fuerte. La
 * cámara LLEGA (CamaraDirector) y se gira con el dedo.
 *
 * Todo procedural (cero CDN/imágenes). Tier-safe vía `perfilDeTier`. Con
 * `reducedMotion` monta QUIETO. Importa three/@react-three → montar SOLO perezosa.
 *
 * `foco` (opcional): el punto [x,y,z] que el paso didáctico señala con un anillo.
 */
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { Fauna } from '../escenas/FaunaEscena.jsx';
import FloraLecheria from './FloraLecheria.jsx';
import GanadoLechero from './GanadoLechero.jsx';
import {
  ANCHO,
  FONDO,
  alturaPotrero,
  SITIO_QUESERA,
  SITIO_BIODIGESTOR,
  SITIO_ABONO,
  SITIO_BEBEDERO,
  LINEA_CERCA,
} from './floraLecheria.geom.js';
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
import { mezclar, VERDES, TIERRAS, PALETA, CORTEZAS, ACENTOS, LUCES, NIEBLAS, AGUAS, NEUTROS } from '../paleta/index.js';

/* La familia del valle para el potrero: `corral` (tarde de finca). */
const FAMILIA_LECHERIA = 'corral';
const RADIO_LECHERIA = 12;
const SOMBRA_LECHERIA = { left: -18, right: 18, top: 16, bottom: -8, far: 46 };

/* El potrero: heightfield del KIT con la pintura PROPIA del pasto — verde de
   trabajo al sol, oliva hacia lo seco, tierra pisada en los caminos del ganado
   y el pardo del pie de monte al fondo. */
function construirPotrero(seg, plano) {
  const cPasto = new THREE.Color(VERDES.trabajo);
  const cPastoSol = new THREE.Color(VERDES.brote);
  const cSeco = new THREE.Color(VERDES.calido);
  const cTierra = new THREE.Color(TIERRAS.camino);
  const cMonte = new THREE.Color(mezclar(VERDES.monte, TIERRAS.siembra, 0.25));
  return construirTerreno({
    ancho: ANCHO,
    fondo: FONDO,
    seg,
    plano,
    altura: alturaPotrero,
    pintar: (wx, wz, alt, c) => {
      c.lerpColors(cPasto, cPastoSol, 0.45 + 0.5 * ruidoTerreno(wx * 0.7, wz * 0.6));
      // manchas de pasto seco/oliva
      c.lerp(cSeco, smoothstep(0.1, 0.85, ruidoTerreno(wx * 1.2, wz * 1.0)) * 0.3);
      // los caminos pisados del ganado (serpentean por el potrero)
      const camino = smoothstep(1.0, 0, Math.abs(wx - Math.sin(wz * 0.35) * 4.5 + 2)) * smoothstep(-12, 4, wz);
      c.lerp(cTierra, camino * 0.6);
      // el pie de monte pardo hacia el fondo
      c.lerp(cMonte, smoothstep(-9, -18, wz) * 0.5);
    },
  });
}

/* ── LA QUESERA de la finca: la enramada de la transformación ─────────────── */
function Quesera({ pos }) {
  const madera = PALETA.madera;
  const maderaClara = PALETA.maderaClara;
  const zinc = PALETA.lamina;
  const cobre = CORTEZAS.sieteCueros; // la olla de cobre del arequipe
  const cobreBrillo = CORTEZAS.sieteCuerosClaro;
  const quesoColor = '#f4ecd6';
  const leche = NEUTROS.hueso;
  return (
    <group position={pos} rotation={[0, -0.55, 0]}>
      {/* piso de tabla (una plancha limpia, la quesera se lava) */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[3.4, 0.08, 2.8]} />
        <meshLambertMaterial color={mezclar(PALETA.concreto, NEUTROS.cal, 0.5)} flatShading />
      </mesh>
      {/* postes de la enramada */}
      {[[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]].map((q, i) => (
        <mesh key={i} position={[q[0], 1.05, q[1]]}>
          <cylinderGeometry args={[0.08, 0.1, 2.1, 6]} />
          <meshLambertMaterial color={madera} flatShading />
        </mesh>
      ))}
      {/* techo de zinc a un agua (la lámina entibiada bajo el sol andino) */}
      <mesh position={[0, 2.28, 0]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[3.8, 0.08, 3.2]} />
        <meshLambertMaterial color={zinc} flatShading />
      </mesh>
      {/* media pared al fondo (donde cuelga el estante) */}
      <mesh position={[0, 1.0, -1.25]}>
        <boxGeometry args={[3.1, 1.5, 0.08]} />
        <meshLambertMaterial color={mezclar(NEUTROS.cal, PALETA.concreto, 0.3)} flatShading />
      </mesh>

      {/* LAS CANTINAS de leche (metálicas, cuello angosto + tapa) */}
      {[[-1.0, 0.9], [-0.55, 1.0], [-1.35, 0.55]].map((q, i) => (
        <group key={`c${i}`} position={[q[0], 0.08, q[1]]}>
          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.19, 0.2, 0.62, 12]} />
            <meshStandardMaterial color={zinc} roughness={0.45} metalness={0.5} flatShading />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.1, 0.16, 0.16, 12]} />
            <meshStandardMaterial color={zinc} roughness={0.45} metalness={0.5} flatShading />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.05, 12]} />
            <meshStandardMaterial color={mezclar(zinc, NEUTROS.tinta, 0.2)} roughness={0.4} metalness={0.5} flatShading />
          </mesh>
        </group>
      ))}

      {/* LA MESA de la quesera con la cuajada, el cincho y el queso prensado */}
      <group position={[0.9, 0, 0.1]}>
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[1.5, 0.07, 0.9]} />
          <meshLambertMaterial color={maderaClara} flatShading />
        </mesh>
        {[[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]].map((q, i) => (
          <mesh key={i} position={[q[0], 0.36, q[1]]}>
            <boxGeometry args={[0.07, 0.72, 0.07]} />
            <meshLambertMaterial color={madera} flatShading />
          </mesh>
        ))}
        {/* el queso prensado (rueda) */}
        <mesh position={[-0.4, 0.82, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.14, 16]} />
          <meshLambertMaterial color={quesoColor} flatShading />
        </mesh>
        {/* el cincho (molde-aro) con la cuajada adentro */}
        <mesh position={[0.2, 0.82, 0.15]}>
          <cylinderGeometry args={[0.17, 0.17, 0.12, 14, 1, true]} />
          <meshLambertMaterial color={maderaClara} flatShading side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.2, 0.8, 0.15]}>
          <cylinderGeometry args={[0.15, 0.15, 0.08, 14]} />
          <meshLambertMaterial color={mezclar(quesoColor, leche, 0.5)} flatShading />
        </mesh>
        {/* bloques de cuajada escurriendo */}
        {[[0.5, -0.2], [0.35, -0.28]].map((q, i) => (
          <mesh key={i} position={[q[0], 0.8, q[1]]}>
            <boxGeometry args={[0.16, 0.1, 0.16]} />
            <meshLambertMaterial color={leche} flatShading />
          </mesh>
        ))}
      </group>

      {/* LA OLLA DE COBRE del arequipe, sobre el fogón (con su rescoldo) */}
      <group position={[1.15, 0.08, -0.85]}>
        <mesh position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.28, 0.24, 0.4, 12]} />
          <meshLambertMaterial color={mezclar(PALETA.piedra, NEUTROS.tinta, 0.25)} flatShading />
        </mesh>
        {/* el rescoldo del fogón */}
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 10]} />
          <meshBasicMaterial color={LUCES.candela} transparent opacity={0.7} depthWrite={false} />
        </mesh>
        {/* la olla de cobre */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.3, 0.22, 0.26, 16]} />
          <meshStandardMaterial color={cobre} roughness={0.35} metalness={0.7} flatShading />
        </mesh>
        <mesh position={[0, 0.63, 0]}>
          <torusGeometry args={[0.29, 0.03, 6, 16]} />
          <meshStandardMaterial color={cobreBrillo} roughness={0.3} metalness={0.7} flatShading />
        </mesh>
        {/* el arequipe adentro */}
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.04, 16]} />
          <meshLambertMaterial color={ACENTOS.ambar} flatShading />
        </mesh>
      </group>

      {/* el ESTANTE con los frascos de kumis y yogur (contra la media pared) */}
      <group position={[-1.1, 0, -1.1]}>
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[1.3, 0.05, 0.3]} />
          <meshLambertMaterial color={maderaClara} flatShading />
        </mesh>
        {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
          <group key={i} position={[x, 1.08, 0]}>
            <mesh position={[0, 0.11, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.22, 10]} />
              <meshLambertMaterial color={mezclar(leche, i % 2 ? ACENTOS.ambar : NIEBLAS.lechosa, 0.25)} flatShading transparent opacity={0.92} />
            </mesh>
            <mesh position={[0, 0.23, 0]}>
              <cylinderGeometry args={[0.06, 0.08, 0.04, 10]} />
              <meshLambertMaterial color={PALETA.madera} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ── EL CICLO: biodigestor tubular + bolsa de gas + montón de abono ────────── */
function CicloAbono({ pos, posAbono, reducedMotion }) {
  const bolsa = useRef(null);
  useFrame(({ clock }) => {
    const b = bolsa.current;
    if (reducedMotion || !b) return;
    // la bolsa de gas respira apenas (se llena y se vacía con el biogás)
    const s = 1 + Math.sin(clock.elapsedTime * 0.5) * 0.05;
    b.scale.set(1, s, 1);
  });
  return (
    <group>
      {/* EL BIODIGESTOR TUBULAR (polietileno de bajo costo, medio enterrado) */}
      <group position={pos} rotation={[0, 0.6, 0]}>
        {/* la zanja poco profunda */}
        <mesh position={[0, -0.02, 0]}>
          <boxGeometry args={[3.2, 0.2, 1.1]} />
          <meshLambertMaterial color={TIERRAS.siembra} flatShading />
        </mesh>
        {/* el tubo de polietileno (semicilindro tendido) */}
        <mesh position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.42, 0.42, 2.9, 14, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={mezclar(NEUTROS.cal, VERDES.calido, 0.15)} roughness={0.6} metalness={0.05} transparent opacity={0.85} side={THREE.DoubleSide} flatShading />
        </mesh>
        {/* la BOLSA de gas encima (se infla con el biogás) */}
        <group ref={bolsa} position={[0, 0.42, 0]}>
          <mesh scale={[1, 1, 1]}>
            <sphereGeometry args={[0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={NIEBLAS.lechosa} roughness={0.5} transparent opacity={0.55} side={THREE.DoubleSide} flatShading />
          </mesh>
        </group>
        {/* la caja de CARGA (donde entra el estiércol) */}
        <mesh position={[-1.75, 0.14, 0]}>
          <boxGeometry args={[0.55, 0.5, 0.7]} />
          <meshLambertMaterial color={mezclar(TIERRAS.turba, TIERRAS.siembra, 0.4)} flatShading />
        </mesh>
        {/* la salida del BIOL (fertilizante líquido) */}
        <mesh position={[1.75, 0.1, 0]}>
          <boxGeometry args={[0.5, 0.36, 0.6]} />
          <meshLambertMaterial color={mezclar(VERDES.monte, TIERRAS.turba, 0.4)} flatShading />
        </mesh>
        {/* el TUBO de biogás que sube y va hacia la quesera (la energía) */}
        <mesh position={[0.1, 1.0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
          <meshLambertMaterial color={PALETA.lamina} flatShading />
        </mesh>
        <mesh position={[1.0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 2.0, 6]} />
          <meshLambertMaterial color={PALETA.lamina} flatShading />
        </mesh>
      </group>

      {/* EL MONTÓN DE ABONO (compost / bioabono), con su horqueta clavada */}
      <group position={posAbono}>
        <mesh position={[0, 0.35, 0]} scale={[1.3, 1, 1.3]}>
          <sphereGeometry args={[0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color={mezclar(TIERRAS.turba, TIERRAS.cacao, 0.4)} flatShading />
        </mesh>
        <mesh position={[0.15, 0.5, 0.1]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color={mezclar(TIERRAS.siembra, VERDES.monte, 0.2)} flatShading />
        </mesh>
        {/* la horqueta (mango + dientes) */}
        <group position={[-0.5, 0, 0.3]} rotation={[0, 0, 0.35]}>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 1.4, 6]} />
            <meshLambertMaterial color={PALETA.madera} flatShading />
          </mesh>
          {[-0.06, 0, 0.06].map((z, i) => (
            <mesh key={i} position={[0, 0.05, z]}>
              <cylinderGeometry args={[0.014, 0.014, 0.3, 5]} />
              <meshStandardMaterial color={PALETA.lamina} roughness={0.5} metalness={0.5} flatShading />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/* ── EL BEBEDERO del ganado ───────────────────────────────────────────────── */
function Bebedero({ pos }) {
  return (
    <group position={pos} rotation={[0, 0.4, 0]}>
      {[[-1.05, 0], [1.05, 0], [0, -0.45], [0, 0.45]].map((q, i) => (
        <mesh key={i} position={[q[0], 0.18, q[1]]}>
          <boxGeometry args={[Math.abs(q[0]) > 0.5 ? 0.12 : 2.1, 0.36, Math.abs(q[1]) > 0.2 ? 0.12 : 0.9]} />
          <meshLambertMaterial color={PALETA.concreto} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[2.0, 0.3, 0.8]} />
        <meshLambertMaterial color={mezclar(PALETA.concreto, NEUTROS.tinta, 0.2)} flatShading />
      </mesh>
      {/* el agua */}
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.9, 0.72]} />
        <meshStandardMaterial color={AGUAS.viva} roughness={0.2} metalness={0.1} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/* ── LA CERCA VIVA de matarratón (postes vivos + alambre) ─────────────────── */
function CercaViva({ puntos }) {
  const postes = useMemo(
    () => puntos.map(([x, z]) => /** @type {[number, number, number]} */ ([x, alturaPotrero(x, z), z])),
    [puntos],
  );
  return (
    <group>
      {postes.map((p, i) => (
        <group key={i} position={p}>
          {/* el poste vivo (tronquito de matarratón que rebrota) */}
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 1.1, 6]} />
            <meshLambertMaterial color={CORTEZAS.aliso} flatShading />
          </mesh>
          {/* el rebrote verde en la cabeza del poste (por eso es "vivo") */}
          <mesh position={[0, 1.2, 0]}>
            <icosahedronGeometry args={[0.22, 0]} />
            <meshLambertMaterial color={VERDES.brote} flatShading />
          </mesh>
        </group>
      ))}
      {/* los alambres entre postes */}
      {postes.slice(0, -1).map((p, i) => {
        const q = postes[i + 1];
        const mid = [(p[0] + q[0]) / 2, 0, (p[2] + q[2]) / 2];
        const dx = q[0] - p[0];
        const dz = q[2] - p[2];
        const len = Math.hypot(dx, dz);
        const ang = Math.atan2(dz, dx);
        return [0.5, 0.8].map((h, k) => (
          <mesh
            key={`${i}-${k}`}
            position={[mid[0], (p[1] + q[1]) / 2 + h, mid[2]]}
            rotation={[0, -ang, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.008, 0.008, len, 4]} />
            <meshLambertMaterial color={PALETA.lamina} flatShading />
          </mesh>
        ));
      })}
    </group>
  );
}

/* El anillo del paso didáctico (lo mismo que en cafetal). */
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

/* La vida que traen las flores del banco forrajero (matarratón y botón de oro):
   mariposas y el colibrí — los SVG rubber-hose de la casa como billboards. */
const FAUNA_LECHERIA = [
  { tipo: 'mariposa', base: [-15.5, 1.5, 4.0], patron: 'revoloteo', size: 24, fase: 0.6, df: 9 },
  { tipo: 'colibri', base: [12.0, 2.2, -3.2], patron: 'revoloteo', size: 30, fase: 1.8, df: 10 },
  { tipo: 'mariposa', base: [6.0, 1.6, -9.0], patron: 'revoloteo', size: 22, fase: 2.7, df: 9 },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);
  const atm = useAtmosferaMundo({ familia: FAMILIA_LECHERIA, reducedMotion });
  const bandas = useGradienteBandas();

  const geoPotrero = useMemo(
    () => construirPotrero(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  const montes = useMemo(
    () => ({
      cerca: mezclar(VERDES.monte, atm.niebla, 0.2),
      media: mezclar(VERDES.frio, atm.niebla, 0.3),
      lejos: mezclar(VERDES.frio, atm.niebla, 0.42),
    }),
    [atm.niebla],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_LECHERIA : FAUNA_LECHERIA.slice(0, 2)),
    [tier],
  );

  const controls = useRef(null);
  const gY = (p) => /** @type {[number, number, number]} */ ([p[0], alturaPotrero(p[0], p[1]), p[1]]);

  return (
    <>
      <AtmosferaMundo
        familia={FAMILIA_LECHERIA}
        tier={tier}
        reducedMotion={reducedMotion}
        radio={RADIO_LECHERIA}
        conSuelo={false}
        sombra={SOMBRA_LECHERIA}
      />
      <DomoCielo atm={atm} radio={70} />

      {/* EL POTRERO por bandas toon (recibe la sombra del banco forrajero). */}
      <mesh geometry={geoPotrero} receiveShadow={perfil.sombras}>
        <meshToonMaterial vertexColors gradientMap={bandas} />
      </mesh>

      {/* los cerros del fondo, comidos por la niebla de la hora */}
      <mesh position={[-15, 2.4, -22]} scale={[10, 4.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.media} gradientMap={bandas} />
      </mesh>
      <mesh position={[8, 3.0, -25]} scale={[12, 5.8, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.lejos} gradientMap={bandas} />
      </mesh>
      <mesh position={[23, 1.8, -20]} scale={[9, 3.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.cerca} gradientMap={bandas} />
      </mesh>

      {/* EL BANCO FORRAJERO + el hato lechero pastando */}
      <FloraLecheria tier={tier} reducedMotion={reducedMotion} />
      <GanadoLechero tier={tier} reducedMotion={reducedMotion} />

      {/* la cerca viva, el bebedero */}
      <CercaViva puntos={LINEA_CERCA} />
      <Bebedero pos={gY(SITIO_BEBEDERO)} />

      {/* LA QUESERA de la finca (la transformación) */}
      <Quesera pos={gY(SITIO_QUESERA)} />

      {/* EL CICLO del estiércol al abono (biodigestor + montón de abono) */}
      <CicloAbono pos={gY(SITIO_BIODIGESTOR)} posAbono={gY(SITIO_ABONO)} reducedMotion={reducedMotion} />

      {/* la vida que traen las flores del banco forrajero */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 2.2, -3]}
        enablePan={false}
        enableZoom
        minDistance={9}
        maxDistance={28}
        minPolarAngle={0.5}
        maxPolarAngle={1.46}
        minAzimuthAngle={-1.15}
        maxAzimuthAngle={1.15}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.1}
      />
      <CamaraDirector
        controls={controls}
        reposo={[1.5, 5.0, 16.0]}
        mirada={[0, 3.0, -3]}
        respiro={0.04}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoLecheria"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo de la cadena láctea campesina. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaLecheriaViva({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`lecheria-canvas${listo ? ' lecheria-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [1.5, 5.0, 16.0], fov: 46 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} foco={foco} />
    </Canvas>
  );
}
